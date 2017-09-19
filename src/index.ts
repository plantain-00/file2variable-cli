import * as fs from "fs";
import * as minimist from "minimist";
import * as camelcase from "camelcase";
import * as glob from "glob";
import * as path from "path";
import { minify } from "html-minifier";
import * as protobuf from "protobufjs";
import * as chokidar from "chokidar";

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

function printInConsole(message: any) {
    // tslint:disable-next-line:no-console
    console.log(message);
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

        const watchMode: boolean = argv.w || argv.watch;

        if (watchMode) {
            const variables: Variable[] = [];
            let count = 0;
            chokidar.watch(inputFiles).on("all", (type: string, file: string) => {
                printInConsole(`Detecting ${type}: ${file}`);
                if (type === "add" || type === "change") {
                    const index = variables.findIndex(v => v.file === file);
                    fileToVariable(base, file, argv).then(variable => {
                        if (index === -1) {
                            variables.push(variable);
                        } else {
                            variables[index] = variable;
                        }
                        count++;
                        if (count >= uniqFiles.length) {
                            writeVariables(variables, outputFile);
                        }
                    });
                } else if (type === "unlink") {
                    const index = variables.findIndex(v => v.file === file);
                    if (index !== -1) {
                        variables.splice(index, 1);
                        writeVariables(variables, outputFile);
                    }
                }
            });
        } else if (uniqFiles.length > 0) {
            Promise.all(uniqFiles.map(file => fileToVariable(base, file, argv))).then(variables => {
                writeVariables(variables, outputFile);
            });
        }
    });
}

function writeVariables(variables: Variable[], outputFile: string) {
    variables.sort((v1, v2) => v1.name.localeCompare(v2.name));
    let target = variables.map(v => {
        return v.type === "string"
            ? `export const ${v.name} = \`${v.value}\`;\n`
            : `export const ${v.name} = ${v.value};\n`;
    }).join("");
    if (outputFile.endsWith(".ts") && variables.some(v => v.type === "object")) {
        target = `// tslint:disable:object-literal-key-quotes trailing-comma
${target}// tslint:enable:object-literal-key-quotes trailing-comma
`;
    }
    writeFileAsync(outputFile, target).then(() => {
        printInConsole(`Success: to "${outputFile}".`);
    });
}

function fileToVariable(base: string, file: string, argv: minimist.ParsedArgs) {
    return new Promise<Variable>((resolve, reject) => {
        const variableName = getVariableName(base ? path.relative(base, file) : file);
        fs.readFile(file, (error, data) => {
            if (error) {
                reject(error);
            } else {
                let fileString = data.toString();
                if (argv["html-minify"] && file.endsWith(".html")) {
                    fileString = minify(fileString, {
                        collapseWhitespace: true,
                        caseSensitive: true,
                        collapseInlineTagWhitespace: true,
                    });
                    resolve({ name: variableName, file, value: fileString, type: "string" });
                } else if (argv.json && file.endsWith(".json")) {
                    resolve({ name: variableName, file, value: fileString, type: "object" });
                } else if (argv.protobuf && file.endsWith(".proto")) {
                    resolve({ name: variableName, file, value: JSON.stringify((protobuf.parse(fileString).root as protobuf.Root).toJSON(), null, "    "), type: "object" });
                } else {
                    resolve({ name: variableName, file, value: fileString, type: "string" });
                }
            }
        });
    });
}

type Variable = { name: string; file: string; value: string; type: "string" | "object" };

executeCommandLine().then(() => {
    printInConsole("file to variable success.");
}, error => {
    printInConsole(error);
    process.exit(1);
});
