import * as fs from "fs";
import * as minimist from "minimist";
import * as camelcase from "camelcase";
import * as glob from "glob";
import * as path from "path";
import { minify } from "html-minifier";
import * as protobuf from "protobufjs";
import * as chokidar from "chokidar";
import * as compiler from "vue-template-compiler";
import transpile = require("vue-template-es2015-compiler");

function globAsync(pattern: string, ignore?: string | string[]) {
    return new Promise<string[]>((resolve, reject) => {
        glob(pattern, { ignore }, (error, matches) => {
            if (error) {
                reject(error);
            } else {
                resolve(matches);
            }
        });
    });
}

function getVariableName(filePath: string) {
    return camelcase(path.normalize(filePath).replace(/\\|\//g, "-"));
}

function writeFileAsync(filename: string, data: string) {
    return new Promise<void>((resolve, reject) => {
        fs.writeFile(filename, data, error => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

async function executeCommandLine() {
    const argv = minimist(process.argv.slice(2), { "--": true });

    let configData: ConfigData;
    if (argv.config) {
        configData = require(path.resolve(process.cwd(), argv.config));
    } else {
        configData = {
            base: argv.base,
            files: argv._,
            handler: file => {
                if (file.endsWith(".html")) {
                    if (argv.vue) {
                        return { type: "vue", name: argv["vue-type-name"], path: argv["vue-type-path"] };
                    }
                    if (argv["html-minify"]) {
                        return { type: "html-minify" };
                    }
                    return { type: "text" };
                }
                if (file.endsWith(".json") && argv.json) {
                    return { type: "json" };
                }
                if (file.endsWith(".proto") && argv.protobuf) {
                    return { type: "protobuf" };
                }
                return { type: "text" };
            },
            out: argv.o,
        };
    }

    if (!configData.files || configData.files.length === 0) {
        throw new Error("Error: no input files.");
    }

    if (!configData.out) {
        throw new Error("Error: no output files.");
    }

    globAsync(configData.files.length === 1 ? configData.files[0] : `{${configData.files.join(",")}}`).then(uniqFiles => {
        if (uniqFiles.length === 0) {
            throw new Error("Error: no input files.");
        }

        const watchMode: boolean = argv.w || argv.watch;

        if (watchMode) {
            const variables: Variable[] = [];
            let count = 0;
            chokidar.watch(configData.files).on("all", (type: string, file: string) => {
                console.log(`Detecting ${type}: ${file}`);
                const handler = configData.handler(file);
                if (type === "add" || type === "change") {
                    const index = variables.findIndex(v => v.file === file);
                    fileToVariable(file, configData.out, configData.base, handler).then(variable => {
                        if (index === -1) {
                            variables.push(variable);
                        } else {
                            variables[index] = variable;
                        }
                        count++;
                        if (count >= uniqFiles.length) {
                            writeVariables(variables, configData.out);
                        }
                    });
                } else if (type === "unlink") {
                    const index = variables.findIndex(v => v.file === file);
                    if (index !== -1) {
                        variables.splice(index, 1);
                        writeVariables(variables, configData.out);
                    }
                }
            });
        } else if (uniqFiles.length > 0) {
            Promise.all(uniqFiles.map(file => fileToVariable(file, configData.out, configData.base, configData.handler(file)))).then(variables => {
                writeVariables(variables, configData.out);
            });
        }
    });
}

function getExpression(variable: Variable, isTs: boolean) {
    if (variable.type === "string") {
        return `export const ${variable.name} = \`${variable.value}\`;\n`;
    }
    if (variable.type === "object") {
        return `export const ${variable.name} = ${variable.value};\n`;
    }
    const compiled = compiler.compile(variable.value);
    let result = transpile(`function ${variable.name}() {${compiled.render}}`);
    const staticResult = transpile(`const ${variable.name}Static = [ ${compiled.staticRenderFns.map(fn => `function() {${fn}}`).join(",")} ]`);
    if (isTs) {
        if (variable.handler.type === "vue" && variable.handler.name && variable.handler.path) {
            result = result.replace(`function ${variable.name}() {`, `function ${variable.name}(this: ${variable.handler.name}) {`);
        }
        return `// @ts-ignore
export ${result}
// @ts-ignore
export ${staticResult}
`;
    } else {
        return `export ${result}
export ${staticResult}
`;
    }
}

function writeVariables(variables: Variable[], out: string) {
    variables.sort((v1, v2) => v1.name.localeCompare(v2.name));
    let target: string;
    if (out.endsWith(".ts")) {
        target = variables.map(v => getExpression(v, true)).join("");
        const handlerNames = new Set<string>();
        const vueTypesImport = variables.map(v => {
            if (v.handler.type === "vue" && v.handler.name && v.handler.path) {
                // Foo<any> -> Foo
                const handlerName = v.handler.name.indexOf("<") !== -1
                    ? v.handler.name.substring(0, v.handler.name.indexOf("<"))
                    : v.handler.name;
                if (handlerNames.has(handlerName)) {
                    return undefined;
                }
                handlerNames.add(handlerName);
                return `import { ${handlerName} } from "${v.handler.path}";\n`;
            }
            return undefined;
        }).filter(s => s).join("");
        target = `// tslint:disable
${vueTypesImport}
${target}// tslint:enable
`;
    } else {
        target = variables.map(v => getExpression(v, false)).join("");
        target = `/* eslint-disable */
${target}/* eslint-enable */
`;
    }
    target = `/**
 * This file is generated by 'file2variable-cli'
 * It is not mean to be edited by hand
 */
${target}`;
    writeFileAsync(out, target).then(() => {
        console.log(`Success: to "${out}".`);
    });
}

function fileToVariable(file: string, out: string, base: string | undefined, handler: Handler) {
    return new Promise<Variable>((resolve, reject) => {
        const variableName = getVariableName(base ? path.relative(base, file) : file);
        fs.readFile(file, (error, data) => {
            if (error) {
                reject(error);
            } else {
                let fileString = data.toString();
                if (handler.type === "vue") {
                    resolve({
                        name: variableName,
                        file,
                        value: fileString,
                        handler,
                        type: "function",
                    });
                } else if (handler.type === "html-minify") {
                    fileString = minify(fileString, {
                        collapseWhitespace: true,
                        caseSensitive: true,
                        collapseInlineTagWhitespace: true,
                    });
                    resolve({
                        name: variableName,
                        file,
                        value: fileString,
                        handler,
                        type: "string",
                    });
                } else if (handler.type === "json") {
                    resolve({
                        name: variableName,
                        file,
                        value: JSON.stringify(JSON.parse(fileString), null, out.endsWith(".ts") ? 4 : 2),
                        handler,
                        type: "object",
                    });
                } else if (handler.type === "protobuf") {
                    resolve({
                        name: variableName,
                        file,
                        value: JSON.stringify((protobuf.parse(fileString).root as protobuf.Root).toJSON(), null, out.endsWith(".ts") ? 4 : 2),
                        handler,
                        type: "object",
                    });
                } else {
                    resolve({
                        name: variableName,
                        file,
                        value: fileString,
                        handler,
                        type: "string",
                    });
                }
            }
        });
    });
}

type Variable = {
    name: string;
    file: string;
    value: string;
    type: "string" | "object" | "function";
    handler: Handler;
};

type Handler =
    {
        type: "text";
    }
    |
    {
        type: "html-minify";
    }
    |
    {
        type: "json";
    }
    |
    {
        type: "protobuf";
    }
    |
    {
        type: "vue";
        name?: string;
        path?: string;
    };

type ConfigData = {
    base?: string;
    files: string[];
    handler: (file: string) => Handler;
    out: string;
};

executeCommandLine().then(() => {
    console.log("file to variable success.");
}, error => {
    if (error instanceof Error) {
        console.log(error.message);
    } else {
        console.log(error);
    }
    process.exit(1);
});
