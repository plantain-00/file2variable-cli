const { execAsync } = require('clean-scripts')

const tsFiles = `"src/**/*.ts" "spec/**/*.ts"`
const jsFiles = `"*.config.js"`

const tscSrcCommand = `tsc -p src`
const demoCommand = 'node dist/index.js demo/*.html demo/*.json demo/*.proto -o demo/variables.js --html-minify --json --protobuf --base demo'

module.exports = {
  build: [
    `rimraf dist/`,
    tscSrcCommand,
    demoCommand
  ],
  lint: {
    ts: `tslint ${tsFiles}`,
    js: `standard ${jsFiles}`,
    export: `no-unused-export ${tsFiles}`
  },
  test: [
    'tsc -p spec',
    'jasmine',
    async () => {
      const { stdout } = await execAsync('git status -s')
      if (stdout) {
        console.log(stdout)
        throw new Error(`generated files doesn't match.`)
      }
    }
  ],
  fix: {
    ts: `tslint --fix ${tsFiles}`,
    js: `standard --fix ${jsFiles}`
  },
  release: `clean-release`,
  watch: {
    ts: tscSrcCommand,
    demo: demoCommand
  }
}
