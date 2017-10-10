const childProcess = require('child_process')
const util = require('util')

const execAsync = util.promisify(childProcess.exec)

module.exports = {
  build: [
    `rimraf dist/`,
    `tsc -p src`,
    'node dist/index.js demo/*.html demo/*.json demo/*.proto -o demo/variables.js --html-minify --json --protobuf --base demo',
    'node dist/index.js demo/*.html demo/*.json demo/*.proto -o demo/variables.ts --html-minify --json --protobuf --base demo'
  ],
  lint: {
    ts: `tslint "src/**/*.ts" "spec/*.ts"`,
    js: `standard "**/*.config.js"`,
    export: `no-unused-export "src/**/*.ts" "spec/*.ts"`
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
    ts: `tslint --fix "src/**/*.ts" "spec/*.ts"`,
    js: `standard --fix "**/*.config.js"`
  },
  release: `clean-release`,
  watch: 'node dist/index.js demo/*.html demo/*.json demo/*.proto -o demo/variables.js --html-minify --json --protobuf --base demo --watch'
}
