module.exports = {
  include: [
    'bin/*',
    'dist/*.js',
    'package.json',
    'yarn.lock'
  ],
  exclude: [
  ],
  postScript: [
    'cd "[dir]" && yarn --production',
    'node [dir]/dist/index.js --config demo/file2variable1.config.js',
    'node [dir]/dist/index.js --config demo/file2variable2.config.js'
  ]
}
