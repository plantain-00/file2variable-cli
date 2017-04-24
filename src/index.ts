import * as fs from "fs";
import * as minimist from "minimist";
import * as camelcase from "camelcase";
import * as glob from "glob";
const flatten: <T>(array: T[][]) => T[] = require("lodash.flatten");
const uniq: <T>(array: T[]) => T[] = require("lodash.uniq");
import * as path from "path";

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

        const variables: { name: string; value: string }[] = [];

        for (const file of uniqFiles) {
            if (!fs.existsSync(file)) {
                console.log(`Error: file: "${file}" not exists.`);
                return;
            }

            const variableName = getVariableName(file);
            const fileString = fs.readFileSync(file).toString();
            variables.push({ name: variableName, value: fileString });
        }

        const target = variables.map(v => `export const ${v.name} = \`${v.value}\`;\n`).join("");
        writeFileAsync(outputFile, target).then(() => {
            console.log(`Success: to "${outputFile}".`);
        });
    });
}

executeCommandLine();
