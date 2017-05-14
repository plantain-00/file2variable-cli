export const demoBarHtml = `<body><a></a></body>`;
export const demoFooHtml = `<div></div><span></span>`;
export const demoBazJson = {
    "foo": 1,
    "bar": "baz"
};
export const demoFooProto = {
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
