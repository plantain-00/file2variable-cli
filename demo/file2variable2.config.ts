import { Configuration } from '../dist/core'

export default {
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
        type: 'vue',
        name: 'App',
        path: './index'
      }
    }
    if (file.endsWith('foo2.html') || file.endsWith('foo3.html')) {
      return {
        type: 'vue',
        name: 'App2',
        path: './index',
        position: true
      }
    }
    if (file.endsWith('bar.html')) {
      return {
        type: 'vue'
      }
    }
    if (file.endsWith('baz.html')) {
      return { type: 'html-minify', position: true }
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
