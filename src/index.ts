import * as fs from "fs";
import * as minimist from "minimist";
import * as camelcase from "camelcase";
import * as glob from "glob";
const flatten: <T>(array: T[][]) => T[] = require("lodash.flatten");
const uniq: <T>(array: T[]) => T[] = require("lodash.uniq");
import * as path from "path";
import { minify } from "html-minifier";
import * as protobuf from "protobufjs";

function globAsync(pattern: string) {
    return new Promise<string[]>((resolve, reject) => {
        glob(pattern, (error, matches) => {
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

export function executeCommandLine() {
    const argv = minimist(process.argv.slice(2), {
        "--": true,
    });

    const inputFiles = argv["_"];
    if (!inputFiles || inputFiles.length === 0) {
        console.log("Error: no input files.");
        return;
    }

    const outputFile: string = argv["o"];
    if (!outputFile) {
        console.log("Error: no output files.");
        return;
    }

    Promise.all(inputFiles.map(file => globAsync(file))).then(files => {
        const uniqFiles = uniq(flatten(files));

        if (uniqFiles.length === 0) {
            console.log("Error: no input files.");
            return;
        }

        const variables: { name: string; value: string; type: "string" | "object" }[] = [];

        for (const file of uniqFiles) {
            if (!fs.existsSync(file)) {
                console.log(`Error: file: "${file}" not exists.`);
                return;
            }

            const variableName = getVariableName(file);
            let fileString = fs.readFileSync(file).toString();
            if (argv["html-minify"] && file.endsWith(".html")) {
                fileString = minify(fileString, {
                    collapseWhitespace: true,
                    caseSensitive: true,
                    collapseInlineTagWhitespace: true,
                });
                variables.push({ name: variableName, value: fileString, type: "string" });
            } else if (argv.json && file.endsWith(".json")) {
                variables.push({ name: variableName, value: fileString, type: "object" });
            } else if (argv.protobuf && file.endsWith(".proto")) {
                variables.push({ name: variableName, value: JSON.stringify((protobuf.parse(fileString).root as protobuf.Root).toJSON(), null, "    "), type: "object" });
            } else {
                variables.push({ name: variableName, value: fileString, type: "string" });
            }
        }

        let target = variables.map(v => {
            return v.type === "string"
                ? `export const ${v.name} = \`${v.value}\`;\n`
                : `export const ${v.name} = ${v.value};\n`;
        }).join("");
        if (outputFile.endsWith(".ts") && variables.some(v => v.type === "object")) {
            target = `/* tslint:disable:object-literal-key-quotes trailing-comma */\n${target}/* tslint:enable:object-literal-key-quotes trailing-comma */\n`;
        }
        writeFileAsync(outputFile, target).then(() => {
            console.log(`Success: to "${outputFile}".`);
        });
    });
}

executeCommandLine();
