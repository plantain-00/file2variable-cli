"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var minimist = require("minimist");
var camelcase = require("camelcase");
var glob = require("glob");
var flatten = require("lodash.flatten");
var uniq = require("lodash.uniq");
var path = require("path");
function globAsync(pattern) {
    return new Promise(function (resolve, reject) {
        glob(pattern, function (error, matches) {
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
    return new Promise(function (resolve, reject) {
        fs.writeFile(filename, data, function (error) {
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
    var argv = minimist(process.argv.slice(2), {
        "--": true,
    });
    var inputFiles = argv["_"];
    if (!inputFiles || inputFiles.length === 0) {
        console.log("Error: no input files.");
        return;
    }
    var outputFile = argv["o"];
    if (!outputFile) {
        console.log("Error: no output files.");
        return;
    }
    Promise.all(inputFiles.map(function (file) { return globAsync(file); })).then(function (files) {
        var uniqFiles = uniq(flatten(files));
        if (uniqFiles.length === 0) {
            console.log("Error: no input files.");
            return;
        }
        var variables = [];
        for (var _i = 0, uniqFiles_1 = uniqFiles; _i < uniqFiles_1.length; _i++) {
            var file = uniqFiles_1[_i];
            if (!fs.existsSync(file)) {
                console.log("Error: file: \"" + file + "\" not exists.");
                return;
            }
            var variableName = getVariableName(file);
            var fileString = fs.readFileSync(file).toString();
            variables.push({ name: variableName, value: fileString });
        }
        var target = variables.map(function (v) { return "export const " + v.name + " = `" + v.value + "`;\n"; }).join("");
        writeFileAsync(outputFile, target).then(function () {
            console.log("Success: to \"" + outputFile + "\".");
        });
    });
}
exports.executeCommandLine = executeCommandLine;
executeCommandLine();
