# file2variable-cli

[![Dependency Status](https://david-dm.org/plantain-00/file2variable-cli.svg)](https://david-dm.org/plantain-00/file2variable-cli)
[![devDependency Status](https://david-dm.org/plantain-00/file2variable-cli/dev-status.svg)](https://david-dm.org/plantain-00/file2variable-cli#info=devDependencies)
[![Build Status: Windows](https://ci.appveyor.com/api/projects/status/github/plantain-00/file2variable-cli?branch=master&svg=true)](https://ci.appveyor.com/project/plantain-00/file2variable-cli/branch/master)
![Github CI](https://github.com/plantain-00/file2variable-cli/workflows/Github%20CI/badge.svg)
[![npm version](https://badge.fury.io/js/file2variable-cli.svg)](https://badge.fury.io/js/file2variable-cli)
[![Downloads](https://img.shields.io/npm/dm/file2variable-cli.svg)](https://www.npmjs.com/package/file2variable-cli)
[![type-coverage](https://img.shields.io/badge/dynamic/json.svg?label=type-coverage&prefix=%E2%89%A5&suffix=%&query=$.typeCoverage.atLeast&uri=https%3A%2F%2Fraw.githubusercontent.com%2Fplantain-00%2Ffile2variable-cli%2Fmaster%2Fpackage.json)](https://github.com/plantain-00/file2variable-cli)

A CLI tool to read file content and assign it to a variable

## features

+ file content as string variable (`*`)
+ json file content as object variable (`*.json` `--json`)
+ protobuf file content as object variable (`*.proto` `--protobuf`)
+ html file minified (`*.html` `--html-minify`)
+ vue3 template precompile (`*` `--vue3`)
+ position for html file and vue template(`<div data-_position="demo/baz.html:2:5"></div>`)

## install

`npm i file2variable-cli`

## usage

`file2variable-cli demo/*.html demo/*.json demo/*.proto -o demo/variables.js --html-minify --json --protobuf --base demo`

`file2variable-cli demo/*.html demo/*.json demo/*.proto -o demo/variables.js --html-minify --json --protobuf --base demo --watch`

## options

key | description
--- | ---
--config | config file
-w,--watch | watch mode
-h,--help | Print this message.
-v,--version | Print the version

## config file

`file2variable-cli --config demo/file2variable.config.js` or `file2variable-cli --config demo/file2variable.config.ts`

```js
import { Configuration } from 'file2variable-cli'

module.exports = {
  base: 'demo',
  files: [
    'demo/*.txt',
    'demo/*.html',
    'demo/*.json',
    'demo/*.proto'
  ],
  handler: file => {
    if (file.endsWith('foo.html')) {
      return {
        type: 'vue3',
      }
    }
    if (file.endsWith('baz.html')) {
      return { type: 'html-minify' }
    }
    if (file.endsWith('.json')) {
      return { type: 'json' }
    }
    if (file.endsWith('.proto')) {
      return { type: 'protobuf' }
    }
    return { type: 'text' }
  },
  out: 'demo/variables.ts'
} as Configuration
```
