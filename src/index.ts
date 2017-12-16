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

    const inputFiles = argv._;
    if (!inputFiles || inputFiles.length === 0) {
        throw new Error("Error: no input files.");
    }

    const outputFile: string = argv.o;
    if (!outputFile) {
        throw new Error("Error: no output files.");
    }

    const base: string = argv.base;

    globAsync(inputFiles.length === 1 ? inputFiles[0] : `{${inputFiles.join(",")}}`).then(uniqFiles => {
        if (uniqFiles.length === 0) {
            throw new Error("Error: no input files.");
        }

        const vueTypeName = argv["vue-type-name"];
        const vueTypePath = argv["vue-type-path"];

        const watchMode: boolean = argv.w || argv.watch;

        if (watchMode) {
            const variables: Variable[] = [];
            let count = 0;
            chokidar.watch(inputFiles).on("all", (type: string, file: string) => {
                console.log(`Detecting ${type}: ${file}`);
                if (type === "add" || type === "change") {
                    const index = variables.findIndex(v => v.file === file);
                    fileToVariable(base, file, argv, outputFile).then(variable => {
                        if (index === -1) {
                            variables.push(variable);
                        } else {
                            variables[index] = variable;
                        }
                        count++;
                        if (count >= uniqFiles.length) {
                            writeVariables(variables, outputFile, vueTypeName, vueTypePath);
                        }
                    });
                } else if (type === "unlink") {
                    const index = variables.findIndex(v => v.file === file);
                    if (index !== -1) {
                        variables.splice(index, 1);
                        writeVariables(variables, outputFile, vueTypeName, vueTypePath);
                    }
                }
            });
        } else if (uniqFiles.length > 0) {
            Promise.all(uniqFiles.map(file => fileToVariable(base, file, argv, outputFile))).then(variables => {
                writeVariables(variables, outputFile, vueTypeName, vueTypePath);
            });
        }
    });
}

function getExpression(variable: Variable, isTs: boolean, typeName?: string) {
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
        if (typeName) {
            result = result.replace(`function ${variable.name}() {`, `function ${variable.name}(this: ${typeName}) {`);
        }
        return `// @ts-ignore
export ${result}
// @ts-ignore
export ${staticResult}
`;
    } else {
        return result + "\n";
    }
}

function writeVariables(variables: Variable[], outputFile: string, vueTypeName: string, vueTypePath: string) {
    variables.sort((v1, v2) => v1.name.localeCompare(v2.name));
    let target: string;
    if (outputFile.endsWith(".ts")) {
        target = variables.map(v => getExpression(v, true, vueTypeName)).join("");
        let vueTypesImport = "";
        if (vueTypeName && vueTypePath) {
            if (vueTypeName.indexOf("<") !== -1) {
                // Foo<any> -> Foo
                vueTypeName = vueTypeName.substring(0, vueTypeName.indexOf("<"));
            }
            vueTypesImport = `import { ${vueTypeName} } from "${vueTypePath}";\n`;
        }
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
    writeFileAsync(outputFile, target).then(() => {
        console.log(`Success: to "${outputFile}".`);
    });
}

function fileToVariable(base: string, file: string, argv: minimist.ParsedArgs, outputFile: string) {
    return new Promise<Variable>((resolve, reject) => {
        const variableName = getVariableName(base ? path.relative(base, file) : file);
        fs.readFile(file, (error, data) => {
            if (error) {
                reject(error);
            } else {
                let fileString = data.toString();
                if (file.endsWith(".html")) {
                    if (argv["html-minify"]) {
                        fileString = minify(fileString, {
                            collapseWhitespace: true,
                            caseSensitive: true,
                            collapseInlineTagWhitespace: true,
                        });
                    }
                    if (argv.vue) {
                        resolve({ name: variableName, file, value: fileString, type: "function" });
                    } else {
                        resolve({ name: variableName, file, value: fileString, type: "string" });
                    }
                } else if (argv.json && file.endsWith(".json")) {
                    resolve({ name: variableName, file, value: JSON.stringify(JSON.parse(fileString), null, outputFile.endsWith(".ts") ? 4 : 2), type: "object" });
                } else if (argv.protobuf && file.endsWith(".proto")) {
                    resolve({ name: variableName, file, value: JSON.stringify((protobuf.parse(fileString).root as protobuf.Root).toJSON(), null, outputFile.endsWith(".ts") ? 4 : 2), type: "object" });
                } else {
                    resolve({ name: variableName, file, value: fileString, type: "string" });
                }
            }
        });
    });
}

type Variable = { name: string; file: string; value: string; type: "string" | "object" | "function" };

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
