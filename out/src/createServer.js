"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const FileReader_1 = require("./server/FileReader");
const fs = require("fs");
const config_1 = require("./config");
function readFile(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, (err, content) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(content + '');
            });
        });
    });
}
class StaticFileReader extends FileReader_1.default {
    /**
     * Creates a new file reader.
     * @param path The path to the file.
     */
    constructor(path) {
        super();
        this.path = path;
    }
    getContentConcrete() {
        return __awaiter(this, void 0, void 0, function* () {
            return readFile(this.path);
        });
    }
}
exports.StaticFileReader = StaticFileReader;
function getFilePathsInDirectory(dirName) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            fs.readdir(dirName, (err, files) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(files.map(fileName => `${dirName}/${fileName}`));
            });
        });
    });
}
function isFile(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(stats.isFile());
                }
            });
        });
    });
}
function extractAboutPageName(str) {
    return str.match(/<!-- *@about:\/\/([a-z0-9\-]+) *-->/)[1];
}
class AboutFileReader extends FileReader_1.default {
    constructor(filePath, fileContent) {
        super();
        this.filePath = filePath;
        this.fileContent = fileContent;
    }
    getContentConcrete() {
        return __awaiter(this, void 0, void 0, function* () {
            const fileContent = this.fileContent || (yield readFile(this.filePath));
            const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>about://${extractAboutPageName(fileContent)}</title>
					<meta charset='utf-8'>
					<style>
						${yield readFile(`${config_1.STATIC_DIR}/about/about.css`)}
					</style>
				</head>
				<body>
					${fileContent}
				</body>
			</html>
		`;
            return html;
        });
    }
}
function generateAboutPageReaders() {
    return __awaiter(this, void 0, void 0, function* () {
        const results = [];
        const filePaths = yield getFilePathsInDirectory(`${config_1.STATIC_DIR}/about/`);
        for (const filePath of filePaths) {
            if (!(yield isFile(filePath)) || !/\.html$/.test(filePath)) {
                continue;
            }
            results.push({
                name: extractAboutPageName(yield readFile(filePath)),
                reader: new AboutFileReader(filePath)
            });
        }
        let indexHTML = results.map(aboutPage => {
            return `
			<li>
				<a href='about://${aboutPage.name}' title='${aboutPage.name}'>${aboutPage.name}</a>
			</li>
		`;
        }).join('');
        indexHTML = `
		<!-- @about://index -->
		<h1>about:// Page Index</h1>
		<ul>
			${indexHTML}
		</ul>
	`;
        results.push({
            name: 'index',
            reader: new AboutFileReader('index', indexHTML)
        });
        return results;
    });
}
exports.generateAboutPageReaders = generateAboutPageReaders;
//# sourceMappingURL=createServer.js.map