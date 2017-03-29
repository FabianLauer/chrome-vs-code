"use strict";
const mimetype = require('mimetype');
// override the default mime type:
mimetype.default_type = 'tetx/plain';
/**
 * Get the mime type associated with a file, if no mime type is found application/octet-stream is returned.
 * Performs a case-insensitive lookup using the extension in path (the substring after the last '/' or '.').
 */
function lookup(path) {
    return mimetype.lookup(path);
}
exports.lookup = lookup;
//# sourceMappingURL=mime.js.map