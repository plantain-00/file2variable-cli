import * as fs from 'fs'
import minimist from 'minimist'
import camelcase from 'camelcase'
import glob from 'glob'
import * as path from 'path'
import { minify } from 'html-minifier'
import * as protobuf from 'protobufjs'
import * as chokidar from 'chokidar'
import * as compiler from 'vue-template-compiler'
import transpile from 'vue-template-es2015-compiler'

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

async function executeCommandLine() {
  const argv = minimist(process.argv.slice(2), { '--': true }) as Args

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
        if (argv.vue) {
          return { type: 'vue', name: argv['vue-type-name'], path: argv['vue-type-path'] }
        }
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

function getExpression(variable: Variable, isTs: boolean) {
  if (variable.type === 'string') {
    return `export const ${variable.name} = \`${escapeLiteralString(variable.value)}\`\n`
  }
  if (variable.type === 'object') {
    return `export const ${variable.name} = ${variable.value}\n`
  }
  const compiled = compiler.compile(variable.value)
  let result = transpile(`function ${variable.name}() {${compiled.render}}`)
  const staticRenderFns = compiled.staticRenderFns.map(fn => `function() {${fn}}`)
  const staticResult = transpile(`const ${variable.name}Static = [ ${staticRenderFns.join(',')} ]`)
  if (isTs) {
    if (variable.handler.type === 'vue' && variable.handler.name && variable.handler.path) {
      result = result.replace(`function ${variable.name}() {`, `function ${variable.name}(this: ${variable.handler.name}) {`)
    }
    return `// @ts-ignore
export ${result}
// @ts-ignore
export ${staticResult}
`
  } else {
    return `export ${result}
export ${staticResult}
`
  }
}

function writeVariables(variables: Variable[], out: string) {
  variables.sort((v1, v2) => v1.name.localeCompare(v2.name))
  let target: string
  if (out.endsWith('.ts')) {
    target = variables.map(v => getExpression(v, true)).join('')
    const vueTypesImport = getVueTypesImport(variables)
    target = `// tslint:disable
/* eslint-disable */
${vueTypesImport}
${target}/* eslint-enable */
// tslint:enable
`
  } else {
    target = variables.map(v => getExpression(v, false)).join('')
    target = `/* eslint-disable */
${target}/* eslint-enable */
`
  }
  target = `/**
 * This file is generated by 'file2variable-cli'
 * It is not mean to be edited by hand
 */
${target}`
  writeFileAsync(out, target).then(() => {
    console.log(`Success: to "${out}".`)
  })
}

function getVueTypesImport(variables: Variable[]) {
  const handlerNameSet = new Set<string>()
  const handlerNameMap: { [path: string]: string[] } = {}
  for (const variable of variables) {
    if (variable.handler.type === 'vue' && variable.handler.name && variable.handler.path) {
      // Foo<any> -> Foo
      const handlerName = variable.handler.name.indexOf('<') !== -1
        ? variable.handler.name.substring(0, variable.handler.name.indexOf('<'))
        : variable.handler.name
      if (!handlerNameSet.has(handlerName)) {
        handlerNameSet.add(handlerName)
        if (!handlerNameMap[variable.handler.path]) {
          handlerNameMap[variable.handler.path] = []
        }
        handlerNameMap[variable.handler.path].push(handlerName)
      }
    }
  }
  const handlerPaths = Object.keys(handlerNameMap).sort((h1, h2) => h1.localeCompare(h2))
  return handlerPaths.map(handlerPath => {
    const handlerNames = handlerNameMap[handlerPath].sort((n1, n2) => n1.localeCompare(n2)).join(', ')
    return `import { ${handlerNames} } from "${handlerPath}"\n`
  }).join('')
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
  vue?: string
  'vue-type-name'?: string
  'vue-type-path'?: string
  json?: boolean
  protobuf?: boolean
  o: string
}

function getVariable(
  handler: Handler,
  variableName: string,
  file: string,
  data: Buffer,
  out: string): Variable {
  let fileString = data.toString()
  if (handler.type === 'vue') {
    return {
      name: variableName,
      file,
      value: fileString,
      handler,
      type: 'function'
    }
  } else if (handler.type === htmlMinifyName) {
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
      type: 'string'
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
  type: 'string' | 'object' | 'function';
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
