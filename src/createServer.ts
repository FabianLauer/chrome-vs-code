import Server from './server/Server';
import FileReader from './server/FileReader';
import * as fs from 'fs';


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


export class StaticFileReader extends FileReader<string> {
	/**
	 * Creates a new file reader.
	 * @param path The path to the file.
	 */
	public constructor(
		private path: string
	) {
		super();
	}

	protected async getContentConcrete() {
		return readFile(this.path);
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
	return str.match(/<!-- *@about:\/\/([a-z0-9\-]+) *-->/)[1];
}


class AboutFileReader extends FileReader<string> {
	public constructor(
		private filePath: string,
		private fileContent?: string
	) {
		super();
	}

	protected async getContentConcrete() {
		const fileContent = this.fileContent || await readFile(this.filePath);
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>about://${extractAboutPageName(fileContent)}</title>
					<meta charset='utf-8'>
					<style>
						${await readFile(`${__dirname}/../../src/static/about/about.css`)}
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


export async function generateAboutPageReaders() {
	const results: Array<{ name: string; reader: FileReader<string>; }> = [];
	const filePaths = await getFilePathsInDirectory(`${__dirname}/../../src/static/about/`);
	for (const filePath of filePaths) {
		if (!(await isFile(filePath)) || !/\.html$/.test(filePath)) {
			continue;
		}
		results.push({
			name: extractAboutPageName(await readFile(filePath)),
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
}
