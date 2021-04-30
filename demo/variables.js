/**
 * This file is generated by 'file2variable-cli'
 * It is not mean to be edited by hand
 */
import { createBlock as _createBlock, createCommentVNode as _createCommentVNode, createVNode as _createVNode, Fragment as _Fragment, openBlock as _openBlock, renderList as _renderList, toDisplayString as _toDisplayString, vModelSelect as _vModelSelect, vModelText as _vModelText, withDirectives as _withDirectives } from 'vue'
/* eslint-disable */
export function barHtml(_ctx, _cache) {
  return (_openBlock(), _createBlock("body", null, [
    _createVNode("a")
  ]))
}
export const bazHtml = `<div><a></a></div>`
export const bazJson = {
  "foo": 1,
  "bar": "baz"
}
export function foo2Html(_ctx, _cache) {
  return (_openBlock(), _createBlock("div", null, [
    _createVNode("span")
  ]))
}
export function foo3Html(_ctx, _cache) {
  return (_openBlock(), _createBlock("div", null, [
    _createVNode("div")
  ]))
}
export function fooHtml(_ctx, _cache) {
  return (_openBlock(), _createBlock(_Fragment, null, [
    _createVNode("div"),
    _createVNode("span")
  ], 64 /* STABLE_FRAGMENT */))
}
export const fooProto = {
  "nested": {
    "protocolPackage": {
      "nested": {
        "Protocol": {
          "oneofs": {
            "_tick": {
              "oneof": [
                "tick"
              ]
            }
          },
          "fields": {
            "kind": {
              "rule": "required",
              "type": "uint32",
              "id": 1
            },
            "tick": {
              "type": "Tick",
              "id": 2,
              "options": {
                "proto3_optional": true
              }
            }
          }
        }
      }
    }
  }
}
export const fooTxt = `const foo = 1;
`
export const regexJs = `export const reg = /[\\\\/]node_modules[\\\\/]/
export const s = \`[\\\\/]node_modules[\\\\/]\`
export const c = \`a\${s}b\`
`
export function vue3Html(_ctx, _cache) {
  return (_openBlock(), _createBlock("div", { class: "app" }, [
    _withDirectives(_createVNode("textarea", {
      class: "source",
      "onUpdate:modelValue": _cache[1] || (_cache[1] = $event => (_ctx.source = $event))
    }, null, 512 /* NEED_PATCH */), [
      [_vModelText, _ctx.source]
    ]),
    _createVNode("div", { class: "result" }, [
      _createVNode("button", {
        onClick: _cache[2] || (_cache[2] = $event => (_ctx.generate()))
      }, "generate"),
      _createVNode("div", { class: "options" }, [
        _withDirectives(_createVNode("select", {
          "onUpdate:modelValue": _cache[3] || (_cache[3] = $event => (_ctx.selectedOption = $event))
        }, [
          (_openBlock(true), _createBlock(_Fragment, null, _renderList(_ctx.options, (option) => {
            return (_openBlock(), _createBlock("option", {
              value: option,
              key: option
            }, _toDisplayString(option), 9 /* TEXT, PROPS */, ["value"]))
          }), 128 /* KEYED_FRAGMENT */))
        ], 512 /* NEED_PATCH */), [
          [_vModelSelect, _ctx.selectedOption]
        ])
      ]),
      (_ctx.selectedOption === 'protobuf')
        ? (_openBlock(), _createBlock("pre", {
            key: 0,
            class: "protobuf"
          }, _toDisplayString(_ctx.protobuf), 1 /* TEXT */))
        : _createCommentVNode("v-if", true),
      (_ctx.jsonSchema)
        ? (_openBlock(), _createBlock("pre", {
            key: 1,
            class: "json-schema"
          }, _toDisplayString(_ctx.jsonSchema), 1 /* TEXT */))
        : _createCommentVNode("v-if", true),
      (_ctx.selectedOption === 'graphql schema')
        ? (_openBlock(), _createBlock("pre", {
            key: 2,
            class: "graphql-schema"
          }, _toDisplayString(_ctx.graphqlSchema), 1 /* TEXT */))
        : _createCommentVNode("v-if", true),
      (_ctx.selectedOption === 'reason types')
        ? (_openBlock(), _createBlock("pre", {
            key: 3,
            class: "reason-types"
          }, _toDisplayString(_ctx.reasonTypes), 1 /* TEXT */))
        : _createCommentVNode("v-if", true),
      (_ctx.selectedOption === 'ocaml types')
        ? (_openBlock(), _createBlock("pre", {
            key: 4,
            class: "ocaml-types"
          }, _toDisplayString(_ctx.ocamlTypes), 1 /* TEXT */))
        : _createCommentVNode("v-if", true),
      (_ctx.selectedOption === 'rust types')
        ? (_openBlock(), _createBlock("pre", {
            key: 5,
            class: "rust-types"
          }, _toDisplayString(_ctx.rustTypes), 1 /* TEXT */))
        : _createCommentVNode("v-if", true),
      (_ctx.selectedOption === 'mongoose schema')
        ? (_openBlock(), _createBlock("pre", {
            key: 6,
            class: "mongoose-schema"
          }, _toDisplayString(_ctx.mongooseSchema), 1 /* TEXT */))
        : _createCommentVNode("v-if", true),
      (_ctx.selectedOption === 'graphql root type')
        ? (_openBlock(), _createBlock("pre", {
            key: 7,
            class: "graphql-root-type"
          }, _toDisplayString(_ctx.graphqlRootType), 1 /* TEXT */))
        : _createCommentVNode("v-if", true),
      (_ctx.selectedOption === 'swagger doc')
        ? (_openBlock(), _createBlock("pre", {
            key: 8,
            class: "swagger-doc"
          }, _toDisplayString(_ctx.swaggerDoc), 1 /* TEXT */))
        : _createCommentVNode("v-if", true),
      (_ctx.selectedOption === 'custom')
        ? (_openBlock(), _createBlock("pre", {
            key: 9,
            class: "custom"
          }, _toDisplayString(_ctx.custom), 1 /* TEXT */))
        : _createCommentVNode("v-if", true),
      (_ctx.selectedOption === 'typescript')
        ? (_openBlock(), _createBlock("pre", {
            key: 10,
            class: "typescript"
          }, _toDisplayString(_ctx.typescript), 1 /* TEXT */))
        : _createCommentVNode("v-if", true),
      (_ctx.selectedOption === 'markdown')
        ? (_openBlock(), _createBlock("pre", {
            key: 11,
            class: "markdown"
          }, _toDisplayString(_ctx.markdown), 1 /* TEXT */))
        : _createCommentVNode("v-if", true)
    ])
  ]))
}
/* eslint-enable */
