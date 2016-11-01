/**
 * Parses a URL into its parts. **Requires the DOM to work.**
 * @param url The URL to parse.
 */
export default function parseURL(url: string): { protocol: string; hostname: string; pathname: string } {
	var link = document.createElement('a');
	link.href = url;
	return link;
};
