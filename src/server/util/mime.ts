const mimetype = require('mimetype');

// override the default mime type:
mimetype.default_type = 'tetx/plain';

/**
 * Get the mime type associated with a file, if no mime type is found application/octet-stream is returned.
 * Performs a case-insensitive lookup using the extension in path (the substring after the last '/' or '.').
 */
export function lookup(path: string): string {
	return mimetype.lookup(path);
}
