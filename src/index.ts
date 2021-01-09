import * as fs from 'fs'
import minimist from 'minimist'
import camelcase from 'camelcase'
import glob from 'glob'
import * as path from 'path'
import { minify } from 'html-minifier'
import * as protobuf from 'protobufjs'
import * as chokidar from 'chokidar'
import * as parse5 from 'parse5'
import { compile as compileTemplate } from '@vue/compiler-dom'

import * as packageJson from '../package.json'

import { ConfigData, Handler } from './core'

function globAsync(pattern: string, ignore?: string | string[]) {
  return new Promise<string[]>((resolve, reject) => {
    glob(pattern, { ignore, nodir: true, dot: true }, (error, matches) => {
      if (error) {
        reject(error)
      } else {
        resolve(matches)
      }
    })
  })
}

function getVariableName(filePath: string) {
  return camelcase(path.normalize(filePath).replace(/\\|\//g, '-'))
}

function writeFileAsync(filename: string, data: string) {
  return new Promise<void>((resolve, reject) => {
    fs.writeFile(filename, data, error => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

function showToolVersion() {
  console.log(`Version: ${packageJson.version}`)
}

function showHelp() {
  console.log(`Version ${packageJson.version}
Syntax:   file2variable-cli [options] [file...]
Examples: file2variable-cli --config demo/file2variable.config.js
          file2variable-cli --config demo/file2variable.config.ts
          file2variable-cli --config demo/file2variable.config.js --watch
Options:
 -h, --help                                         Print this message.
 -v, --version                                      Print the version
 -config                                            Config file
 -w, --watch                                        Watch mode
`)
}

async function executeCommandLine() {
  const argv = minimist(process.argv.slice(2), { '--': true }) as Args

  if (argv.v || argv.version) {
    showToolVersion()
    return
  }

  if (argv.h || argv.help) {
    showHelp()
    return
  }

  const configData = getConfigData(argv)

  const uniqFiles = await globAsync(configData.files.length === 1 ? configData.files[0] : `{${configData.files.join(',')}}`)
  if (uniqFiles.length === 0) {
    throw new Error('Error: no input files.')
  }

  const watchMode = argv.w || argv.watch

  if (watchMode) {
    watchFileChanges(configData, uniqFiles)
  } else if (uniqFiles.length > 0) {
    const variables = await Promise.all(uniqFiles.map(file => fileToVariable(file, configData.out, configData.base, configData.handler(file))))
    writeVariables(variables, configData.out)
  }
}

function watchFileChanges(configData: ConfigData, uniqFiles: string[]) {
  const variables: Variable[] = []
  let count = 0
  chokidar.watch(configData.files).on('all', (type: string, file: string) => {
    console.log(`Detecting ${type}: ${file}`)
    const handler = configData.handler(file)
    if (type === 'add' || type === 'change') {
      const index = variables.findIndex(v => v.file === file)
      fileToVariable(file, configData.out, configData.base, handler).then(variable => {
        if (index === -1) {
          variables.push(variable)
        } else {
          variables[index] = variable
        }
        count++
        if (count >= uniqFiles.length) {
          writeVariables(variables, configData.out)
        }
      })
    } else if (type === 'unlink') {
      const index = variables.findIndex(v => v.file === file)
      if (index !== -1) {
        variables.splice(index, 1)
        writeVariables(variables, configData.out)
      }
    }
  })
}

function getConfigData(argv: Args): ConfigData {
  let configData: ConfigData & { default?: ConfigData }
  if (argv.config) {
    if (argv.config.endsWith('.ts')) {
      require('ts-node/register/transpile-only')
    }
    configData = require(path.resolve(process.cwd(), argv.config))
    if (configData.default) {
      configData = configData.default
    }
  } else {
    configData = getDefaultConfigData(argv)
  }

  if (!configData.files || configData.files.length === 0) {
    throw new Error('Error: no input files.')
  }

  if (!configData.out) {
    throw new Error('Error: no output files.')
  }

  return configData
}

function getDefaultConfigData(argv: Args): ConfigData {
  return {
    base: argv.base,
    files: argv._,
    handler: file => {
      if (file.endsWith('.html')) {
        if (argv[htmlMinifyName]) {
          return { type: htmlMinifyName }
        }
        return { type: 'text' }
      }
      if (file.endsWith('.json') && argv.json) {
        return { type: 'json' }
      }
      if (file.endsWith('.proto') && argv.protobuf) {
        return { type: 'protobuf' }
      }
      return { type: 'text' }
    },
    out: argv.o
  }
}

function escapeLiteralString(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')
}

function addPositionForNode(node: parse5.ChildNode, file: string) {
  const sourceCodeLocation = node.sourceCodeLocation
  if (!sourceCodeLocation) {
    return
  }
  const attrs = (node as parse5.Element).attrs
  if (attrs) {
    attrs.push({
      name: 'data-_position',
      value: `${file}:${sourceCodeLocation.startLine}:${sourceCodeLocation.startCol}`,
    })
  }
  const childNodes = (node as parse5.Element).childNodes
  if (childNodes) {
    for (const childNode of childNodes) {
      addPositionForNode(childNode, file)
    }
  }
}

function getExpression(variable: Variable, getNewImports: (imports: string[]) => void) {
  if (variable.type === 'string') {
    return `export const ${variable.name} = \`${escapeLiteralString(variable.value)}\`\n`
  }
  if (variable.type === 'object') {
    return `export const ${variable.name} = ${variable.value}\n`
  }
  if (variable.type === 'vue3') {
    const compiled = compileTemplate(variable.value, { mode: 'module', cacheHandlers: true })
    const index = compiled.code.indexOf('\n')
    const imports = compiled.code.substring(0, index).trim()
    getNewImports(imports.substring('import { '.length, imports.length - ' } from "vue"'.length).split(', '))
    const renderFunction = compiled.code.substring(index).trim().substring('export function render'.length)
    return `export function ${variable.name}${renderFunction}
`
  }
  throw new Error(`unsupported type: ${variable.type}`)
}

function writeVariables(variables: Variable[], out: string) {
  variables.sort((v1, v2) => v1.name.localeCompare(v2.name))
  let target: string
  let head = ''
  let imports: string[] = []
  if (out.endsWith('.ts')) {
    if (variables.some(v => v.type === 'vue3')) {
      head = '// @ts-nocheck\n'
    }
    target = variables.map(v => getExpression(v, (s) => imports.push(...s))).join('')
    target = `// tslint:disable
/* eslint-disable */

${target}/* eslint-enable */
// tslint:enable
`
  } else {
    target = variables.map(v => getExpression(v, (s) => imports.push(...s))).join('')
    target = `/* eslint-disable */
${target}/* eslint-enable */
`
  }
  imports = Array.from(new Set(imports))
  if (imports.length > 0) {
    imports.sort((a, b) => a.localeCompare(b))
    target = `import { ${imports.join(', ')} } from 'vue'\n` + target
  }
  target = `${head}/**
 * This file is generated by 'file2variable-cli'
 * It is not mean to be edited by hand
 */
${target}`
  writeFileAsync(out, target).then(() => {
    console.log(`Success: to "${out}".`)
  })
}

function fileToVariable(file: string, out: string, base: string | undefined, handler: Handler) {
  return new Promise<Variable>((resolve, reject) => {
    const variableName = getVariableName(base ? path.relative(base, file) : file)
    fs.readFile(file, (error, data) => {
      if (error) {
        reject(error)
      } else {
        const variable = getVariable(handler, variableName, file, data, out)
        resolve(variable)
      }
    })
  })
}

const htmlMinifyName = 'html-minify'

interface Args {
  w?: boolean
  watch?: boolean
  config?: string
  base?: string
  _: string[]
  [htmlMinifyName]?: string
  vue3?: unknown
  json?: boolean
  protobuf?: boolean
  o: string
  v?: unknown
  version?: unknown
  h?: unknown
  help?: unknown
}

function addPositionsForHtml(value: string, file: string) {
  const fragment = parse5.parseFragment(value, { sourceCodeLocationInfo: true })
  for (const node of fragment.childNodes) {
    addPositionForNode(node, file)
  }
  return parse5.serialize(fragment)
}

function getVariable(
  handler: Handler,
  variableName: string,
  file: string,
  data: Buffer,
  out: string): Variable {
  let fileString = data.toString()
  if (handler.type === 'vue3') {
    if (handler.position) {
      fileString = addPositionsForHtml(fileString, file)
    }
    return {
      name: variableName,
      file,
      value: fileString,
      handler,
      type: handler.type
    }
  } else if (handler.type === htmlMinifyName) {
    if (handler.position) {
      fileString = addPositionsForHtml(fileString, file)
    }
    fileString = minify(fileString, {
      collapseWhitespace: true,
      caseSensitive: true,
      collapseInlineTagWhitespace: true
    })
    return {
      name: variableName,
      file,
      value: fileString,
      handler,
      type: 'string',
    }
  } else if (handler.type === 'json') {
    return {
      name: variableName,
      file,
      value: JSON.stringify(JSON.parse(fileString), null, out.endsWith('.ts') ? 4 : 2),
      handler,
      type: 'object'
    }
  } else if (handler.type === 'protobuf') {
    return {
      name: variableName,
      file,
      value: JSON.stringify(protobuf.parse(fileString).root.toJSON(), null, out.endsWith('.ts') ? 4 : 2),
      handler,
      type: 'object'
    }
  } else {
    return {
      name: variableName,
      file,
      value: fileString,
      handler,
      type: 'string'
    }
  }
}

interface Variable {
  name: string;
  file: string;
  value: string;
  type: 'string' | 'object' | 'vue3';
  handler: Handler;
}

executeCommandLine().then(() => {
  console.log('file to variable success.')
}, (error: Error) => {
  if (error instanceof Error) {
    console.log(error.message)
  } else {
    console.log(error)
  }
  process.exit(1)
})
