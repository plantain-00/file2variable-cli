import { checkGitStatus } from 'clean-scripts'

const tsFiles = `"src/**/*.ts"`

const tscSrcCommand = `tsc -p src`
const demoCommand = 'node dist/index.js --config demo/file2variable1.config.ts'
const demo2Command = 'node dist/index.js --config demo/file2variable2.config.ts'

export default {
  build: [
    `rimraf dist/`,
    tscSrcCommand,
    demoCommand,
    demo2Command
  ],
  lint: {
    ts: `eslint --ext .js,.ts ${tsFiles}`,
    export: `no-unused-export ${tsFiles}`,
    markdown: `markdownlint README.md`,
    typeCoverage: 'type-coverage -p src --strict'
  },
  test: [
    'clean-release --config clean-run.config.ts',
    () => checkGitStatus()
  ],
  fix: `eslint --ext .js,.ts ${tsFiles} --fix`,
  watch: {
    ts: `${tscSrcCommand} --watch`,
    demo: `${demoCommand} --watch`,
    demo2: `${demo2Command} --watch`
  }
}
