import { Configuration } from '../dist/core'

export default {
  base: 'demo',
  files: [
    'demo/*.txt',
    'demo/*.html',
    'demo/*.json',
    'demo/*.proto',
    'demo/regex.js'
  ],
  handler: file => {
    if (file.endsWith('foo.html')) {
      return {
        type: 'vue3',
      }
    }
    if (file.endsWith('vue3.html')) {
      return {
        type: 'vue3',
      }
    }
    if (file.endsWith('foo2.html') || file.endsWith('foo3.html')) {
      return {
        type: 'vue3',
      }
    }
    if (file.endsWith('bar.html')) {
      return {
        type: 'vue3'
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
  out: 'demo/variables.js'
} as Configuration
