const { checkGitStatus } = require('clean-scripts')

const tsFiles = `"src/**/*.ts" "spec/**/*.ts"`
const jsFiles = `"*.config.js"`

const tscSrcCommand = `tsc -p src`
const demoCommand = 'node dist/index.js demo/*.html demo/*.json demo/*.proto -o demo/variables.js --html-minify --json --protobuf --base demo'
const demo2Command = 'node dist/index.js demo/*.html demo/*.json demo/*.proto -o demo/variables.ts --html-minify --json --protobuf --vue --base demo'

module.exports = {
  build: [
    `rimraf dist/`,
    tscSrcCommand,
    demoCommand,
    demo2Command
  ],
  lint: {
    ts: `tslint ${tsFiles}`,
    js: `standard ${jsFiles}`,
    export: `no-unused-export ${tsFiles}`,
    commit: `commitlint --from=HEAD~1`
  },
  test: [
    'tsc -p spec',
    'jasmine',
    () => checkGitStatus()
  ],
  fix: {
    ts: `tslint --fix ${tsFiles}`,
    js: `standard --fix ${jsFiles}`
  },
  watch: {
    ts: `${tscSrcCommand} --watch`,
    demo: `${demoCommand} --watch`,
    demo2: `${demo2Command} --watch`
  }
}
