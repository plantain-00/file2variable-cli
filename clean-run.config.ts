export default {
  include: [
    'bin/*',
    'dist/*.js',
    'package.json',
    'yarn.lock'
  ],
  exclude: [
  ],
  postScript: [
    'cd "[dir]" && yarn --production && yarn add ts-node -DE',
    'node [dir]/dist/index.js --config demo/file2variable1.config.ts',
    'node [dir]/dist/index.js --config demo/file2variable2.config.ts'
  ]
}
