const { checkGitStatus } = require('clean-scripts')

const tsFiles = `"src/**/*.ts" "spec/**/*.ts"`
const jsFiles = `"*.config.js"`

const tscSrcCommand = `tsc -p src`
const demoCommand = 'node dist/index.js --config demo/file2variable1.config.js'
const demo2Command = 'node dist/index.js --config demo/file2variable2.config.js'

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
    commit: `commitlint --from=HEAD~1`,
    markdown: `markdownlint README.md`,
    typeCoverage: 'type-coverage -p src --strict'
  },
  test: [
    'tsc -p spec',
    'jasmine',
    'clean-release --config clean-run.config.js',
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
