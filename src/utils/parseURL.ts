/**
 * Parses a URL into its parts. **Requires the DOM to work.**
 * @param url The URL to parse.
 */
export default function parseURL(url: string): {
	readonly protocol: string;
	readonly host: string;
	readonly hostname: string;
	readonly pathname: string;
	readonly search: string;
	readonly hash: string;
} {
	var link = document.createElement('a');
	link.href = url;
	return {
		protocol: link.protocol,
		host: link.host,
		hostname: link.hostname,
		pathname: link.pathname,
		search: link.search,
		hash: link.hash
	};
};
