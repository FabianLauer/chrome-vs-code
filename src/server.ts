import Server from './server/Server';
import FileReader from './server/FileReader';
import * as fs from 'fs';
import { execSync } from 'child_process';


async function readFile(filePath: string): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		fs.readFile(filePath, (err, content) => {
			if (err) {
				reject(err);
				return;
			}
			resolve(content + '');
		});
	});
}


class BrowserHTMLReader extends FileReader<string> {
	protected async getContentConcrete() {
		return readFile('./src/static/browser.html');
	}
}


class PreprocessorReader extends FileReader<string> {
	public constructor(
		private command: string
	) {
		super();
	}


	protected async getContentConcrete() {
		return new Promise<string>((resolve, reject) => {
			var code: string;
			try {
				code = execSync(this.command).toString();
			} catch (err) {
				reject(err);
				return;
			}
			resolve(code);
		});
	}
}


async function getFilePathsInDirectory(dirName: string): Promise<string[]> {
	return new Promise<string[]>((resolve, reject) => {
		fs.readdir(dirName, (err, files) => {
			if (err) {
				reject(err);
				return;
			}
			resolve(files.map(fileName => `${dirName}/${fileName}`));
		});
	});
}


async function isFile(filePath: string): Promise<boolean> {
	return new Promise<boolean>((resolve, reject) => {
		fs.stat(filePath, (err, stats) => {
			if (err) {
				reject(err);
			} else {
				resolve(stats.isFile());
			}
		});
	});
}


function extractAboutPageName(str: string): string {
	return str.match(/<!-- *@about:\/\/([a-z\-]+) *-->/)[1];
}


class AboutFileReader extends FileReader<string> {
	public constructor(
		private filePath: string
	) {
		super();
	}

	protected async getContentConcrete() {
		const fileContent = await readFile(this.filePath);
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>about://${extractAboutPageName(fileContent)}</title>
					<meta charset='utf-8'>
					<style>
						${await readFile('./src/static/about.css')}
					</style>
				</head>
				<body>
					${fileContent}
				</body>
			</html>
		`;
		return html;
	}
}


async function generateAboutPageReaders() {
	const results: Array<{ name: string; reader: FileReader<string>; }> = [];
	const filePaths = await getFilePathsInDirectory('./src/static/about/');
	for (const filePath of filePaths) {
		if (!(await isFile(filePath)) || !/\.html$/.test(filePath)) {
			continue;
		}
		results.push({
			name: extractAboutPageName(await readFile(filePath)),
			reader: new AboutFileReader(filePath)
		});
	}
	return results;
}


process.on('uncaughtException', err => {
	console.warn(err);
	process.exit();
});


process.on('unhandledRejection', err => {
	console.warn(err);
	process.exit();
});


(async () => {
	const server = new Server(
		new BrowserHTMLReader(),
		new PreprocessorReader('browserify ./out/src/browser.js'),
		new PreprocessorReader('lessc ./src/browser.less'),
		await generateAboutPageReaders()
	);
	server.start('localhost', 8080);
})();

