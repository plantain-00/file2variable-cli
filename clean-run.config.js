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
    '[dir]/bin/file2variable-cli --config demo/file2variable1.config.js',
    '[dir]/bin/file2variable-cli --config demo/file2variable2.config.js'
  ]
}
