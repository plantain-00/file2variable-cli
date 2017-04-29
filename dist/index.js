"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const minimist = require("minimist");
const camelcase = require("camelcase");
const glob = require("glob");
const flatten = require("lodash.flatten");
const uniq = require("lodash.uniq");
const path = require("path");
function globAsync(pattern) {
    return new Promise((resolve, reject) => {
        glob(pattern, (error, matches) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(matches);
            }
        });
    });
}
function getVariableName(filePath) {
    return camelcase(path.normalize(filePath).replace(/\\|\//g, "-"));
}
function writeFileAsync(filename, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(filename, data, error => {
            if (error) {
                reject(error);
            }
            else {
                resolve();
            }
        });
    });
}
function executeCommandLine() {
    const argv = minimist(process.argv.slice(2), {
        "--": true,
    });
    const inputFiles = argv["_"];
    if (!inputFiles || inputFiles.length === 0) {
        console.log("Error: no input files.");
        return;
    }
    const outputFile = argv["o"];
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
        const variables = [];
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
exports.executeCommandLine = executeCommandLine;
executeCommandLine();
