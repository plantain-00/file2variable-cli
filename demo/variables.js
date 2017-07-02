export const barHtml = `<body><a></a></body>`;
export const fooHtml = `<div></div><span></span>`;
export const bazJson = {
    "foo": 1,
    "bar": "baz"
};
export const fooProto = {
    "nested": {
        "protocolPackage": {
            "nested": {
                "Protocol": {
                    "fields": {
                        "kind": {
                            "rule": "required",
                            "type": "uint32",
                            "id": 1
                        },
                        "tick": {
                            "type": "Tick",
                            "id": 2
                        }
                    }
                }
            }
        }
    }
};
