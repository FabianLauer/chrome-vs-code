/**
 * Utilities for reading /etc/hosts.
 */

import * as fs from 'fs';
import IHostsMap from './IHostsMap';


/**
 * Returns the path to the hosts file.
 */
function getPath(): string {
	switch (process.platform) {
		default:
			return '/etc/hosts';
		case 'win32':
			return 'C:/Windows/System32/drivers/etc/hosts';
	}
}


/**
 * Reads the hosts file and returns its content as a string.
 */
function readHostsFile(): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		fs.readFile(getPath(), (err, content) => {
			if (err) {
				reject(err);
				return;
			}
			resolve(content.toString());
		});
	});
}


/**
 * Returns a map of all hosts and the IPs they represent.
 */
export async function getHostsMap(): Promise<IHostsMap> {
	const content = await readHostsFile();
	const map: IHostsMap = {};
	content.split(/\r?\n/).map<{ host: string; ip: string; }>(line => {
		// skip lines that are either ...
		if (
			// ... empty OR ...
			typeof line !== 'string' ||
			line.length === 0 ||
			// ... do not start with a colon or hex/int number
			(line[0] !== ':' && !/^[\da-f]/.test(line[0]))
		) {
			return;
		}
		// IPv4
		let parts = /(\d+\.\d+\.\d+\.\d+)\s+(.+)/.exec(line);
		if (Array.isArray(parts) && parts.length === 3) {
			return { host: parts[2], ip: parts[1] };
		}
		// IPv6
		parts = /((?:[a-f\d]*:{0,2})+)\s+(.+)/.exec(line);
		if (Array.isArray(parts) && parts.length === 3) {
			return { host: parts[2], ip: parts[1] };
		}
	}).filter(mapped => {
		return typeof mapped === 'object' && mapped !== null;
	}).forEach(({ host, ip }) => {
		host = host.trim();
		map[host] = map[host] || [];
		map[host].push(ip);
	});
	return map;
}
