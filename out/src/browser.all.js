(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
(function (global){
/*! https://mths.be/punycode v1.4.1 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw new RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.4.1',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) {
			// in Node.js, io.js, or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else {
			// in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else {
		// in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],3:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],4:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":2,"./encode":3}],5:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var punycode = require('punycode');
var util = require('./util');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // Special case for a simple path URL
    simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && util.isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!util.isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  // Copy chrome, IE, opera backslash-handling behavior.
  // Back slashes before the query string get converted to forward slashes
  // See: https://code.google.com/p/chromium/issues/detail?id=25916
  var queryIndex = url.indexOf('?'),
      splitter =
          (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
      uSplit = url.split(splitter),
      slashRegex = /\\/g;
  uSplit[0] = uSplit[0].replace(slashRegex, '/');
  url = uSplit.join(splitter);

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  if (!slashesDenoteHost && url.split('#').length === 1) {
    // Try fast path regexp
    var simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.path = rest;
      this.href = rest;
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
        if (parseQueryString) {
          this.query = querystring.parse(this.search.substr(1));
        } else {
          this.query = this.search.substr(1);
        }
      } else if (parseQueryString) {
        this.search = '';
        this.query = {};
      }
      return this;
    }
  }

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a punycoded representation of "domain".
      // It only converts parts of the domain name that
      // have non-ASCII characters, i.e. it doesn't matter if
      // you call it with a domain that already is ASCII-only.
      this.hostname = punycode.toASCII(this.hostname);
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      if (rest.indexOf(ae) === -1)
        continue;
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (util.isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      util.isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (util.isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  var tkeys = Object.keys(this);
  for (var tk = 0; tk < tkeys.length; tk++) {
    var tkey = tkeys[tk];
    result[tkey] = this[tkey];
  }

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    var rkeys = Object.keys(relative);
    for (var rk = 0; rk < rkeys.length; rk++) {
      var rkey = rkeys[rk];
      if (rkey !== 'protocol')
        result[rkey] = relative[rkey];
    }

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      var keys = Object.keys(relative);
      for (var v = 0; v < keys.length; v++) {
        var k = keys[v];
        result[k] = relative[k];
      }
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!util.isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especially happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host || srcPath.length > 1) &&
      (last === '.' || last === '..') || last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last === '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especially happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

},{"./util":6,"punycode":1,"querystring":4}],6:[function(require,module,exports){
'use strict';

module.exports = {
  isString: function(arg) {
    return typeof(arg) === 'string';
  },
  isObject: function(arg) {
    return typeof(arg) === 'object' && arg !== null;
  },
  isNull: function(arg) {
    return arg === null;
  },
  isNullOrUndefined: function(arg) {
    return arg == null;
  }
};

},{}],7:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const BrowserWindow_1 = require('./client/BrowserWindow');
// Import the theme file. We don't need to import any symbols, the file takes care of that itself.
require('./client/theme');
(() => __awaiter(this, void 0, void 0, function* () {
    const browser = new BrowserWindow_1.default();
    yield browser.render();
    yield browser.loadInitialPage();
}))();

},{"./client/BrowserWindow":10,"./client/theme":29}],8:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const IconButton_1 = require('./IconButton');
const MainMenuDialog_1 = require('./MainMenuDialog');
const event_1 = require('../utils/event');
const utils_1 = require('../utils');
/**
 * Controller for the browser top bar.
 */
class BrowserBar {
    constructor(urlBar, renderDialog, openURL) {
        this.urlBar = urlBar;
        this.renderDialog = renderDialog;
        this.openURL = openURL;
        /**
         * Triggered when the browser bar's 'go back' navigation button was pressed.
         */
        this.onBackButtonPressed = new event_1.Event();
        /**
         * Triggered when the browser bar's 'go forward' navigation button was pressed.
         */
        this.onForwardButtonPressed = new event_1.Event();
        /**
         * Triggered when the browser bar's 'go home' navigation button was pressed.
         */
        this.onHomeButtonPressed = new event_1.Event();
        /**
         * Triggered when the browser bar's 'refresh' navigation button was pressed.
         */
        this.onRefreshButtonPressed = new event_1.Event();
        /**
         * Triggered when the browser bar's 'refresh without cache' navigation button was pressed.
         */
        this.onNoCacheRefreshButtonPressed = new event_1.Event();
        this.outerElement = document.createElement('div');
        this.innerWrapper = document.createElement('div');
        this.backButton = new IconButton_1.default();
        this.forwardButton = new IconButton_1.default();
        this.homeButton = new IconButton_1.default();
        this.refreshButton = new IconButton_1.default();
        this.menuButton = new IconButton_1.default();
    }
    getDOM() {
        return this.outerElement;
    }
    render() {
        return __awaiter(this, void 0, void 0, function* () {
            this.outerElement.classList.add('browser-bar');
            this.innerWrapper.classList.add('browser-bar-wrapper');
            this.outerElement.appendChild(this.innerWrapper);
            // 'go back' button
            yield this.backButton.render();
            this.backButton.setIconAsText('←');
            this.innerWrapper.appendChild(this.backButton.getDOM());
            this.backButton.onClick.bind(() => this.onBackButtonPressed.trigger());
            // 'go forward' button
            yield this.forwardButton.render();
            this.forwardButton.setIconAsText('→');
            this.innerWrapper.appendChild(this.forwardButton.getDOM());
            this.forwardButton.onClick.bind(() => this.onForwardButtonPressed.trigger());
            // 'refresh' button
            yield this.refreshButton.render();
            this.refreshButton.setIconAsText('⟳');
            this.innerWrapper.appendChild(this.refreshButton.getDOM());
            this.refreshButton.onClick.bind(e => {
                if (e.shiftKey) {
                    this.onNoCacheRefreshButtonPressed.trigger();
                }
                else {
                    this.onRefreshButtonPressed.trigger();
                }
            });
            // URL bar
            yield this.urlBar.render();
            this.innerWrapper.appendChild(this.urlBar.getDOM());
            // 'go home' button
            yield this.homeButton.render();
            this.homeButton.setIconAsText('⌂');
            this.innerWrapper.appendChild(this.homeButton.getDOM());
            this.homeButton.onClick.bind(() => this.onHomeButtonPressed.trigger());
            // menu button
            yield this.menuButton.render();
            this.menuButton.setIconAsText('+');
            this.innerWrapper.appendChild(this.menuButton.getDOM());
            this.menuButton.onClick.bind(() => __awaiter(this, void 0, void 0, function* () {
                const dialog = yield MainMenuDialog_1.default.createMainMenuDialog(this.openURL);
                yield this.renderDialog(dialog);
                yield dialog.open();
            }));
        });
    }
    /**
     * Checks whether the browser bar is currently collapsed or expanded.
     */
    isCollapsed() {
        return this.outerElement.classList.contains('collapsed');
    }
    /**
     * Collapses the browser bar and returns when the animation is complete.
     */
    collapse() {
        return __awaiter(this, void 0, void 0, function* () {
            this.outerElement.classList.add('collapsed');
            return utils_1.sleep(200);
        });
    }
    /**
     * Expands the browser bar and returns when the animation is complete.
     */
    expand() {
        return __awaiter(this, void 0, void 0, function* () {
            this.outerElement.classList.remove('collapsed');
            return utils_1.sleep(200);
        });
    }
    showLoadingIndicator() {
        this.urlBar.showLoadingIndicator();
    }
    showLoadingProgress(percentComplete) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.urlBar.showLoadingProgress(percentComplete);
        });
    }
    hideLoadingIndicator() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.urlBar.hideLoadingIndicator();
        });
    }
    enableHistoryForwardButton() {
        this.forwardButton.enable();
    }
    disableHistoryForwardButton() {
        this.forwardButton.disable();
    }
    enableHistoryBackButton() {
        this.backButton.enable();
    }
    disableHistoryBackButton() {
        this.backButton.disable();
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BrowserBar;

},{"../utils":35,"../utils/event":34,"./IconButton":15,"./MainMenuDialog":16}],9:[function(require,module,exports){
"use strict";
const TypedSymbol_1 = require('../utils/TypedSymbol');
class BrowserConfigSectionSymbol extends TypedSymbol_1.default {
    /**
     * Creates a new typed symbol for a browser configuration section.
     */
    static create(name) {
        return new BrowserConfigSectionSymbol(name);
    }
}
exports.BrowserConfigSectionSymbol = BrowserConfigSectionSymbol;
/**
 * The URL of the browser's home page.
 */
exports.home = BrowserConfigSectionSymbol.create('home');
/**
 * Whether to automatically hide and show the address bar.
 */
exports.autoToggleAddressBar = BrowserConfigSectionSymbol.create('autoToggleAddressBar');
/**
 * Whether to show the welcome page instead of the home page when starting the browser.
 */
exports.showWelcomePage = BrowserConfigSectionSymbol.create('showWelcomePage');
/**
 * Whether the user has read the the disclaimer and terms of use and accepts them.
 */
exports.disclaimerReadAndAccepted = BrowserConfigSectionSymbol.create('disclaimerReadAndAccepted');
/**
 * A URL to search the web with.
 */
exports.webSearchURL = BrowserConfigSectionSymbol.create('webSearchURL');

},{"../utils/TypedSymbol":33}],10:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const internalRouteMapReader_1 = require('./internalRouteMapReader');
const InternalRoute_1 = require('../server/InternalRoute');
const URLBar_1 = require('./URLBar');
const BrowserBar_1 = require('./BrowserBar');
const Viewport_1 = require('./Viewport');
const StatusIndicator_1 = require('./StatusIndicator');
const ResponseRendererFactory_1 = require('./ResponseRendererFactory');
const History_1 = require('./History');
const HistoryEntry_1 = require('./HistoryEntry');
const WritableBrowserConfig_1 = require('./WritableBrowserConfig');
const configSection = require('./BrowserConfigSection');
const prompts_1 = require('./webapi/prompts');
/**
 * The complete browser window, including browser bar and viewport.
 */
class BrowserWindow {
    constructor(config = new WritableBrowserConfig_1.default(), browserBar, viewport) {
        this.config = config;
        this.browserBar = browserBar;
        this.viewport = viewport;
        this.statusIndicator = new StatusIndicator_1.default();
        this.history = new History_1.default();
        this.autoToggleAddressBar = true;
        this.lastViewportScroll = {
            recordedTime: Date.now(),
            scrollY: 0
        };
        /**
         * This is `true` if the disclaimer prompt is currently visible.
         */
        this.disclaimerPromptVisible = false;
        this.browserBar = this.browserBar || new BrowserBar_1.default(new URLBar_1.default(this.config), dialog => this.renderDialog(dialog), url => this.load(url));
        this.history.push(new HistoryEntry_1.default('about://start', Date.now()));
        this.viewport = this.viewport || new Viewport_1.default(() => this.createFrameBindings());
        this.viewport.onBeginNavigation.bind(this.handleViewportBeginningNavigation.bind(this));
        this.viewport.onAfterNavigation.bind(this.handleViewportNavigating.bind(this));
    }
    render() {
        return __awaiter(this, void 0, void 0, function* () {
            // status indicator
            yield this.statusIndicator.render();
            document.body.appendChild(this.statusIndicator.getDOM());
            const statusIndicatorTicket = this.statusIndicator.show('initializing');
            // browser bar
            this.browserBar.urlBar.onChange.bind(() => __awaiter(this, void 0, void 0, function* () {
                this.load(yield this.browserBar.urlBar.getURL());
            }));
            this.browserBar.onHomeButtonPressed.bind(() => {
                this.load('about://home');
            });
            this.browserBar.onRefreshButtonPressed.bind(() => {
                this.load(this.history.getCurrent().uri);
            });
            this.browserBar.onNoCacheRefreshButtonPressed.bind(() => {
                this.load(this.history.getCurrent().uri);
            });
            this.browserBar.onBackButtonPressed.bind(() => __awaiter(this, void 0, void 0, function* () {
                yield this.history.goBack();
                this.load(this.history.getCurrent().uri);
            }));
            this.browserBar.onForwardButtonPressed.bind(() => __awaiter(this, void 0, void 0, function* () {
                yield this.history.goForward();
                this.load(this.history.getCurrent().uri);
            }));
            yield this.browserBar.render();
            this.updateHistoryButtons();
            document.body.appendChild(this.browserBar.getDOM());
            // browser viewport
            yield this.viewport.render();
            document.body.appendChild(this.viewport.getDOM());
            this.updateViewportHeight(false);
            this.viewport.onScroll.bind(this.handleViewportScroll.bind(this));
            // hide the status indicator
            this.statusIndicator.hide(statusIndicatorTicket);
            // resize the viewport when the window size changes
            window.addEventListener('resize', () => this.expandBrowserBar(false));
        });
    }
    getHistory() {
        return this.history;
    }
    loadInitialPage() {
        return __awaiter(this, void 0, void 0, function* () {
            // load the initial page
            let initialUrl = 'about://home';
            if (yield this.config.get(configSection.showWelcomePage)) {
                initialUrl = 'about://welcome';
            }
            yield this.load(initialUrl);
            yield this.updateBrowserConfigField('showWelcomePage', false);
        });
    }
    /**
     * Loads a URI and renders it in the browser.
     * @param uri The URI to load.
     */
    load(uri, deferHistoryUdpate = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (uri.trim() !== 'about://welcome' && !(yield this.ensureDisclaimerAccepted())) {
                return;
            }
            if (deferHistoryUdpate) {
                this.browserBar.showLoadingIndicator();
                this.statusIndicator.show(`loading...`);
            }
            else {
                this.history.push(new HistoryEntry_1.default(uri, Date.now()));
                this.updateHistoryButtons();
                yield this.browserBar.urlBar.setURL(uri);
                this.statusIndicator.show(`loading ${uri}`);
                yield this.browserBar.showLoadingProgress(10);
            }
            // refresh the `autoToggleAddressBar` config
            this.autoToggleAddressBar = yield this.config.get(configSection.autoToggleAddressBar);
            const collapseBrowserBar = this.isBrowserBarCollapsed() && this.autoToggleAddressBar;
            if (collapseBrowserBar) {
                this.expandBrowserBar(true);
            }
            const response = yield this.request(uri);
            const renderer = ResponseRendererFactory_1.default.getRenderer(this.viewport, response);
            const responseURI = response.getResponseHeader('actual-uri') || uri;
            let statusIndicatorTicket = this.statusIndicator.show(`rendering ${responseURI}`);
            // update the browser bar to the actual URL of the page we're now on
            if (deferHistoryUdpate) {
                this.browserBar.urlBar.setURL(responseURI, false);
                this.history.push(new HistoryEntry_1.default(responseURI, Date.now()));
                this.updateHistoryButtons();
            }
            else if (responseURI !== uri) {
                this.browserBar.urlBar.setURL(responseURI, false);
            }
            // render the actual response
            yield renderer.renderResponse(responseURI, response);
            // render the favicon
            const icon = yield renderer.generateFavicon(responseURI, response);
            if (typeof icon === 'string') {
                this.browserBar.urlBar.setFavicon(icon);
            }
            else {
                this.browserBar.urlBar.setFavicon(undefined);
            }
            yield this.browserBar.showLoadingProgress(100);
            yield this.browserBar.hideLoadingIndicator();
            this.statusIndicator.hide(statusIndicatorTicket);
            // collapse the browser bar if it was collapsed before loading started
            if (collapseBrowserBar) {
                yield this.collapseBrowserBar();
            }
        });
    }
    /**
     * Checks whether the browser bar is currently collapsed or expanded.
     */
    isBrowserBarCollapsed() {
        return this.browserBar.isCollapsed();
    }
    /**
     * Collapses the browser bar and returns when the animation is complete.
     */
    collapseBrowserBar() {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                this.browserBar.collapse(),
                this.viewport.updateHeight(document.body.getBoundingClientRect().height, true)
            ]);
        });
    }
    /**
     * Expands the browser bar and returns when the animation is complete.
     * @param overlayMode When `true`, the browser bar will open as an overlay.
     */
    expandBrowserBar(overlayMode = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const updateViewportHeight = overlayMode ?
                // in overlay mode, the viewport is at 100% height:
                // in overlay mode, the viewport is at 100% height:
                    () => this.viewport.updateHeight(document.body.getBoundingClientRect().height, true) :
                // if not in overlay mode, fit the viewport into available horizontal space:
                // if not in overlay mode, fit the viewport into available horizontal space:
                    () => this.updateViewportHeight(true);
            yield Promise.all([
                this.browserBar.expand(),
                updateViewportHeight()
            ]);
        });
    }
    renderDialog(dialog) {
        return __awaiter(this, void 0, void 0, function* () {
            yield dialog.render();
            document.body.appendChild(dialog.getDOM());
        });
    }
    request(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const request = new XMLHttpRequest();
                request.onerror = reject;
                request.onreadystatechange = () => __awaiter(this, void 0, void 0, function* () {
                    if (request.readyState === XMLHttpRequest.DONE) {
                        yield this.browserBar.showLoadingProgress(90);
                        resolve(request);
                    }
                });
                request.onprogress = e => {
                    if (e.lengthComputable) {
                        this.browserBar.showLoadingProgress(((e.loaded / e.total) * 100) - 20);
                    }
                    else {
                        this.browserBar.showLoadingIndicator();
                    }
                };
                request.open('GET', `${internalRouteMapReader_1.default(InternalRoute_1.default.LoadBase)}?${escape(uri)}`, true);
                request.send();
            });
        });
    }
    /**
     * Presents the disclaimer to the user and asks to accept it.
     * Returns `true` when the user accepts it, `false` if not.
     */
    askToAcceptDisclaimer() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.disclaimerPromptVisible) {
                return;
            }
            this.disclaimerPromptVisible = true;
            const response = yield this.request('about://disclaimer');
            const accepted = yield prompts_1.internalConfirm(this, `Accept 'Chrome VS Code' Terms of Use to continue browsing`, response.responseText, true, 'Accept Terms of Use', 'Don\'t accept');
            this.disclaimerPromptVisible = false;
            return accepted;
        });
    }
    /**
     * Returns `true` when the user has accepted the disclaimer, `false` if not.
     */
    ensureDisclaimerAccepted() {
        return __awaiter(this, void 0, void 0, function* () {
            const notAccepted = () => {
                this.viewport.renderHTML('');
                this.browserBar.urlBar.setURL('about://welcome');
            };
            // disclaimer was already accepted
            if (yield this.config.get(configSection.disclaimerReadAndAccepted)) {
                return true;
            }
            // disclaimer was not accepted yet
            const accepted = yield this.askToAcceptDisclaimer();
            // update the browser config
            yield this.updateBrowserConfigField('disclaimerReadAndAccepted', accepted);
            if (!accepted) {
                notAccepted();
                return;
            }
            // Don't return the `accepted` value from above, but rather refresh the browser config
            // and return the config value from 'disclaimerReadAndAccepted'. This way, we can make
            // sure the config file is in sync.
            if (!(yield this.config.get(configSection.disclaimerReadAndAccepted))) {
                notAccepted();
                return false;
            }
            return true;
        });
    }
    updateHistoryButtons() {
        // forward button
        if (this.history.canGoForward()) {
            this.browserBar.enableHistoryForwardButton();
        }
        else {
            this.browserBar.disableHistoryForwardButton();
        }
        // back button
        if (this.history.canGoBackward()) {
            this.browserBar.enableHistoryBackButton();
        }
        else {
            this.browserBar.disableHistoryBackButton();
        }
    }
    updateViewportHeight(animated) {
        const bodyHeight = document.body.getBoundingClientRect().height;
        const browserBarHeight = this.browserBar.getDOM().getBoundingClientRect().height;
        this.viewport.updateHeight(bodyHeight - browserBarHeight, animated);
    }
    handleViewportScroll() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.autoToggleAddressBar) {
                return;
            }
            const now = Date.now();
            if (now - this.lastViewportScroll.recordedTime <= 300) {
                return;
            }
            const currentScrollY = this.viewport.getScroll().y;
            const threshold = this.viewport.getDOM().getBoundingClientRect().height / 10;
            if (Math.abs(currentScrollY - this.lastViewportScroll.scrollY) < threshold) {
                return;
            }
            // scrolling down:
            if (currentScrollY > this.lastViewportScroll.scrollY) {
                this.collapseBrowserBar();
            }
            else {
                // scrolling up:
                this.expandBrowserBar();
            }
            this.lastViewportScroll.recordedTime = now;
            this.lastViewportScroll.scrollY = currentScrollY;
        });
    }
    isInternalURL(url) {
        const getInternalRouteRegex = (routeIdentifier) => {
            const asString = internalRouteMapReader_1.default(routeIdentifier)
                .replace(/^\//, '')
                .replace(/\//, '\\/');
            return new RegExp(`${window.location.host}\/+${asString}`);
        };
        return (getInternalRouteRegex(InternalRoute_1.default.Load).test(url) ||
            getInternalRouteRegex(InternalRoute_1.default.LoadBase).test(url));
    }
    handleViewportBeginningNavigation() {
        return __awaiter(this, void 0, void 0, function* () {
            this.expandBrowserBar();
            this.browserBar.showLoadingIndicator();
        });
    }
    handleViewportNavigating(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            uri = unescape(uri || '');
            if (this.isInternalURL(uri)) {
                uri = uri.replace(/^.*?\?/, '');
            }
            yield this.load(uri, true);
        });
    }
    /**
     * Loads and returns the current browser configuration from the back end.
     */
    loadBrowserConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const request = new XMLHttpRequest();
                request.onerror = reject;
                request.onreadystatechange = () => {
                    if (request.readyState === XMLHttpRequest.DONE) {
                        resolve(JSON.parse(request.responseText));
                    }
                };
                request.open('GET', internalRouteMapReader_1.default(InternalRoute_1.default.ConfigRead), true);
                request.send();
            });
        });
    }
    updateConfig(config) {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise((resolve, reject) => {
                const request = new XMLHttpRequest();
                request.onerror = reject;
                request.onreadystatechange = () => {
                    if (request.readyState === XMLHttpRequest.DONE) {
                        resolve();
                    }
                };
                request.open('GET', `${internalRouteMapReader_1.default(InternalRoute_1.default.ConfigWrite)}?${escape(JSON.stringify(config))}`, true);
                request.send();
            });
        });
    }
    updateConfigField(section, key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            const object = {};
            object[section] = {};
            object[section][key] = value;
            return this.updateConfig(object);
        });
    }
    updateBrowserConfigField(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.updateConfigField('chromevscode', key, value);
        });
    }
    createFrameBindings() {
        const browserWindow = this;
        class FrameBindings {
            /**
             * Initializes the frame's web API bindings.
             */
            initializeWebAPIs(frameWindow) {
                return __awaiter(this, void 0, void 0, function* () {
                    yield prompts_1.initialize(browserWindow, frameWindow);
                });
            }
            /**
             * Updates the browser location to another URI.
             * @param uri The URI to open.
             */
            load(uri) {
                return __awaiter(this, void 0, void 0, function* () {
                    return browserWindow.load(uri);
                });
            }
            /**
             * Attempts to show the address bar. Returns `true` when successful, `false` if not.
             */
            showAddressBar() {
                return __awaiter(this, void 0, void 0, function* () {
                    yield browserWindow.expandBrowserBar();
                    return true;
                });
            }
            /**
             * Attempts to hide the address bar. Returns `true` when successful, `false` if not.
             */
            hideAddressBar() {
                return __awaiter(this, void 0, void 0, function* () {
                    yield browserWindow.collapseBrowserBar();
                    return true;
                });
            }
        }
        class PrivilegedFrameBindings extends FrameBindings {
            /**
             * Returns the browser configuration as an object.
             */
            getConfiguration() {
                return __awaiter(this, void 0, void 0, function* () {
                    return browserWindow.loadBrowserConfig();
                });
            }
        }
        if (/^about:\/\//.test(this.history.getCurrent().uri)) {
            return new PrivilegedFrameBindings();
        }
        else {
            return new FrameBindings();
        }
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BrowserWindow;

},{"../server/InternalRoute":32,"./BrowserBar":8,"./BrowserConfigSection":9,"./History":13,"./HistoryEntry":14,"./ResponseRendererFactory":19,"./StatusIndicator":20,"./URLBar":21,"./Viewport":23,"./WritableBrowserConfig":24,"./internalRouteMapReader":25,"./webapi/prompts":30}],11:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const event_1 = require('../utils/event');
class Button {
    constructor() {
        /**
         * Triggered when the button is clicked.
         */
        this.onClick = new event_1.SmartEvent();
        this.wasRendered = false;
        this.outerElement = document.createElement('div');
        this.iconElement = document.createElement('div');
        this.textElement = document.createElement('div');
    }
    getDOM() {
        return this.outerElement;
    }
    render() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.wasRendered) {
                return;
            }
            this.wasRendered = true;
            this.textElement.classList.add('text');
            this.iconElement.classList.add('icon');
            this.outerElement.classList.add('button');
            this.outerElement.appendChild(this.iconElement);
            this.outerElement.appendChild(this.textElement);
            this.onClick.onBeforeFirstBind.bind(() => {
                this.clickListener = (e) => this.onClick.trigger(e);
                this.outerElement.addEventListener('click', this.clickListener);
            });
            this.onClick.onAfterLastUnbind.bind(() => {
                this.outerElement.removeEventListener('click', this.clickListener);
                this.clickListener = undefined;
            });
        });
    }
    /**
     * Updates the button's text content.
     * @param text The new text content. When this is `undefined`, the current text content will be removed.
     */
    setText(text) {
        if (typeof text !== 'string' || text.length === 0) {
            this.textElement.textContent = '';
            this.outerElement.classList.remove('has-text');
        }
        else {
            this.textElement.textContent = text;
            this.outerElement.classList.add('has-text');
        }
    }
    /**
     * Updates the button's icon using a character as the icon.
     * @param text The new icon. When this is `undefined`, the button's icon will be removed.
     */
    setIconAsText(icon) {
        this.setIcon(undefined);
        if (typeof icon !== 'string' || icon.length === 0) {
            this.iconElement.innerText = '';
            this.outerElement.classList.remove('has-text-icon');
        }
        else {
            this.iconElement.innerText = icon;
            this.outerElement.classList.add('has-text-icon');
        }
    }
    /**
     * Updates the button's icon using an icon name provided by the available icon font.
     * @param text The new icon. When this is `undefined`, the button's icon will be removed.
     */
    setIcon(iconName) {
        this.iconElement.innerText = '';
        this.iconName = iconName;
        if (typeof iconName !== 'string' || iconName.length === 0) {
            this.iconElement.classList.remove(`icon-${iconName}`);
            this.outerElement.classList.remove('has-icon');
        }
        else {
            this.iconName = iconName;
            this.iconElement.classList.add(`icon-${iconName}`);
            this.outerElement.classList.add('has-icon');
        }
    }
    /**
     * Returns `true` when the button is enabled, `false` if not.
     */
    isEnabled() {
        return !this.outerElement.classList.contains('disabled');
    }
    /**
     * Enables the button. When enabled, the button's `onClick` event can be triggered.
     */
    enable() {
        this.outerElement.classList.remove('disabled');
        this.onClick.unsuspend();
    }
    /**
     * Disables the button. When disabled, the button's `onClick` event is suspended.
     */
    disable() {
        this.outerElement.classList.add('disabled');
        this.onClick.suspend();
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Button;

},{"../utils/event":34}],12:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const utils_1 = require('../utils');
class Dialog {
    constructor() {
        this.outerElement = document.createElement('div');
        this.bodyElement = document.createElement('div');
        this.rendered = false;
        this.innerWrapper = document.createElement('div');
        this.titleElement = document.createElement('div');
        this.bottomBarElement = document.createElement('div');
    }
    /**
     * Creates a new dialog.
     */
    static create() {
        return __awaiter(this, void 0, void 0, function* () {
            const dialog = new Dialog();
            yield dialog.render();
            return dialog;
        });
    }
    getDOM() {
        return this.outerElement;
    }
    render() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.wasRendered()) {
                return;
            }
            this.rendered = true;
            this.outerElement.classList.add('dialog');
            this.titleElement.classList.add('title');
            this.innerWrapper.appendChild(this.titleElement);
            this.bodyElement.classList.add('body');
            this.innerWrapper.appendChild(this.bodyElement);
            this.bottomBarElement.classList.add('bottom-bar');
            this.innerWrapper.appendChild(this.bottomBarElement);
            this.innerWrapper.classList.add('inner-wrapper');
            this.outerElement.appendChild(this.innerWrapper);
        });
    }
    getTitle() {
        return this.titleElement.textContent.trim();
    }
    setTitle(title) {
        this.titleElement.textContent = title;
    }
    getContent() {
        return this.bodyElement.innerHTML.trim();
    }
    setContentAsText(text) {
        this.bodyElement.innerHTML = '';
        this.bodyElement.textContent = text;
    }
    setContentAsHTML(...html) {
        this.bodyElement.innerHTML = '';
        html.forEach(part => {
            if (typeof part === 'string') {
                this.bodyElement.innerHTML += part;
            }
            else {
                this.bodyElement.appendChild(part);
            }
        });
    }
    prependButton(button) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.bottomBarElement.childElementCount === 0) {
                return this.appendButton(button);
            }
            yield button.render();
            this.bottomBarElement.insertBefore(button.getDOM(), this.bottomBarElement.firstChild);
        });
    }
    appendButton(button) {
        return __awaiter(this, void 0, void 0, function* () {
            yield button.render();
            this.bottomBarElement.appendChild(button.getDOM());
        });
    }
    /**
     * Checks whether the dialog is currently open or not.
     */
    isOpen() {
        return this.outerElement.classList.contains('open');
    }
    /**
     * Opens the dialog.
     */
    open() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isOpen()) {
                return;
            }
            this.outerElement.style.display = 'block';
            yield utils_1.sleep(10);
            this.outerElement.classList.add('open');
            yield utils_1.sleep(200);
        });
    }
    /**
     * Closes the dialog.
     */
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isOpen()) {
                return;
            }
            this.outerElement.classList.remove('open');
            yield utils_1.sleep(200);
            this.outerElement.style.display = '';
            this.outerElement.remove();
        });
    }
    wasRendered() {
        return this.rendered;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Dialog;

},{"../utils":35}],13:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const HistoryEntry_1 = require('./HistoryEntry');
class History {
    constructor() {
        this.entries = [];
        this.currentIndex = 0;
    }
    /**
     * Returns the current history entry.
     */
    getCurrent() {
        return this.entries[this.currentIndex];
    }
    /**
     * Pushes an entry to the history and makes it the current entry.
     * @param entry The entry to push to the history.
     */
    push(entry) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.getCurrent() instanceof HistoryEntry_1.default && this.getCurrent().uri === entry.uri) {
                this.entries[this.currentIndex] = entry;
            }
            else {
                this.entries.splice(0, this.currentIndex);
                this.entries.unshift(entry);
                this.currentIndex = 0;
            }
        });
    }
    canGoForward() {
        return this.currentIndex !== 0;
    }
    canGoBackward() {
        return this.currentIndex < this.entries.length - 1;
    }
    /**
     * Moves back by a certain number of entries and returns the new current entry.
     */
    goBack(entries = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            this.currentIndex = Math.min(this.currentIndex + entries, this.entries.length - 1);
        });
    }
    /**
     * Moves forward by a certain number of entries and returns the new current entry.
     */
    goForward(entries = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            this.currentIndex = Math.max(this.currentIndex - entries, 0);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = History;

},{"./HistoryEntry":14}],14:[function(require,module,exports){
"use strict";
class HistoryEntry {
    constructor(uri, timestamp) {
        this.uri = uri;
        this.timestamp = timestamp;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HistoryEntry;

},{}],15:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const event_1 = require('../utils/event');
class IconButton {
    constructor() {
        /**
         * Triggered when the icon button is clicked.
         */
        this.onClick = new event_1.SmartEvent();
        this.outerElement = document.createElement('div');
    }
    getDOM() {
        return this.outerElement;
    }
    render() {
        return __awaiter(this, void 0, void 0, function* () {
            this.outerElement.classList.add('icon-button');
            this.onClick.onBeforeFirstBind.bind(() => {
                this.clickListener = (e) => this.onClick.trigger(e);
                this.outerElement.addEventListener('click', this.clickListener);
            });
            this.onClick.onAfterLastUnbind.bind(() => {
                this.outerElement.removeEventListener('click', this.clickListener);
                this.clickListener = undefined;
            });
        });
    }
    setIconAsText(icon) {
        this.outerElement.innerText = icon;
    }
    setIcon(iconName) {
        this.outerElement.innerText = '';
        this.outerElement.classList.add(`icon-${iconName}`);
    }
    isEnabled() {
        return !this.outerElement.classList.contains('disabled');
    }
    enable() {
        this.outerElement.classList.remove('disabled');
        this.onClick.unsuspend();
    }
    disable() {
        this.outerElement.classList.add('disabled');
        this.onClick.suspend();
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = IconButton;

},{"../utils/event":34}],16:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const Dialog_1 = require('./Dialog');
const IconButton_1 = require('./IconButton');
const config_1 = require('../config');
class MainMenuCard extends IconButton_1.default {
    constructor(icon, text, clickHandler) {
        super();
        this.icon = icon;
        this.text = text;
        this.clickHandler = clickHandler;
    }
    render() {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            yield _super("render").call(this);
            this.onClick.bind(this.clickHandler);
            this.setIcon(this.icon);
            const textElement = document.createElement('span');
            textElement.innerText = this.text;
            this.getDOM().appendChild(textElement);
        });
    }
}
class MainMenuDialog extends Dialog_1.default {
    constructor(urlOpener) {
        super();
        this.urlOpener = urlOpener;
    }
    /**
     * Creates a new main menu dialog.
     */
    static createMainMenuDialog(openURL) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(this.singletonInstance instanceof MainMenuDialog)) {
                this.singletonInstance = new MainMenuDialog(openURL);
                yield this.singletonInstance.render();
            }
            return this.singletonInstance;
        });
    }
    render() {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            if (this.wasRendered()) {
                return;
            }
            yield _super("render").call(this);
            this.outerElement.classList.add('main-menu-dialog');
            const cards = [
                new MainMenuCard('bug', 'Report an Issue', () => this.openURL(config_1.BUG_REPORT_URL)),
                new MainMenuCard('info', 'License', () => this.openURL('about://license')),
                new MainMenuCard('checkbox-checked', 'Disclaimer', () => this.openURL('about://disclaimer'))
            ];
            for (const card of cards) {
                yield card.render();
                this.bodyElement.appendChild(card.getDOM());
            }
        });
    }
    openURL(url) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                this.close(),
                this.urlOpener(url)
            ]);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MainMenuDialog;

},{"../config":31,"./Dialog":12,"./IconButton":15}],17:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const internalRouteMapReader_1 = require('./internalRouteMapReader');
const InternalRoute_1 = require('../server/InternalRoute');
class ReadonlyBrowserConfig {
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = yield this.loadBrowserConfig();
            return config[key.name];
        });
    }
    /**
     * Loads and returns the complete browser configuration from the back end.
     */
    loadBrowserConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const request = new XMLHttpRequest();
                request.onerror = reject;
                request.onreadystatechange = () => {
                    if (request.readyState === XMLHttpRequest.DONE) {
                        resolve(JSON.parse(request.responseText));
                    }
                };
                request.open('GET', internalRouteMapReader_1.default(InternalRoute_1.default.ConfigRead), true);
                request.send();
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReadonlyBrowserConfig;

},{"../server/InternalRoute":32,"./internalRouteMapReader":25}],18:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
class ResponseRenderer {
    /**
     * Creates a renderer.
     * @param viewport The viewport to render in.
     */
    constructor(viewport) {
        this.viewport = viewport;
    }
    /**
     * Renders a certain response in the renderer's current viewport.
     * @param responseURI The URI from which the response was loaded.
     * @param response The response to render.
     */
    renderResponse(responseURI, response) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.renderResponseConcrete(responseURI, response);
        });
    }
    /**
     * Attempts to generate a favicon for the rendered response.
     * @param responseURI The URI from which the response was loaded.
     * @param response The response to render.
     */
    generateFavicon(responseURI, response) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof this.generateFaviconConcrete === 'function') {
                return this.generateFaviconConcrete(responseURI, response);
            }
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ResponseRenderer;

},{}],19:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const ResponseRenderer_1 = require('./ResponseRenderer');
const config_1 = require('../config');
/**
 * @singleton
 */
class ResponseRendererFactory {
    /**
     * Decorator for `ResponseRenderer` implementations.
     * @param score A function that checks whether the decorated renderer is capable of rendering
     *              a certain server response. If two or more registered renderer classes are
     *              applicable to render a response, the one with the highest score is used.
     */
    static register(score) {
        return (target) => {
            this.registry.set(score, target);
        };
    }
    /**
     * Returns a renderer for a certain viewport and response.
     */
    static getRenderer(viewport, response) {
        // find the best matching renderer
        var highest = {
            score: -Infinity,
            rendererClass: undefined
        };
        for (const registered of this.registry) {
            const score = registered[0](response);
            if (score > highest.score) {
                highest.score = score;
                highest.rendererClass = registered[1];
            }
        }
        // fall back to another renderer if no matching renderer for the response was found
        if (highest.score < 1) {
            highest.rendererClass = ResponseRendererFactory.FallbackRenderer;
        }
        // get or create a renderer instance for the given viewport 
        if (!Array.isArray(this.instancesByViewport.get(viewport))) {
            this.instancesByViewport.set(viewport, []);
        }
        let instance = this.instancesByViewport.get(viewport).find(renderer => renderer instanceof highest.rendererClass);
        if (!(instance instanceof ResponseRenderer_1.default)) {
            instance = new highest.rendererClass(viewport);
            this.instancesByViewport.get(viewport).push(instance);
        }
        return instance;
    }
}
ResponseRendererFactory.registry = new Map();
/// TODO: Instances aggregated in here are never cleaned up.
ResponseRendererFactory.instancesByViewport = new Map();
ResponseRendererFactory.FallbackRenderer = class FallbackRenderer extends ResponseRenderer_1.default {
    renderResponseConcrete(responseURI, response) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.viewport.renderHTML(`
				<!DOCTYPE html>
				<html>
				<head>
					<title>Rendering Error</title>
					<style>
						* {
							font-family: system, -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif!important;
						}
						body {
							box-sizing: border-box;
							padding: 10vh 10vw;
							font-size: 0.8em;
							background: #fafafa;
							color: #333;
						}
						p {
							line-height: 1.3em;
						}
						a {
							color: #666;
						}
					</style>
				</head>
				<body>
					<h1>This site can't be displayed.</h1>
					<p>
						The web page at <b>${responseURI}</b> can not be displayed because no matching renderer was found.
					</p>
					<a href='${config_1.BUG_REPORT_URL}' title='File a bug report'>Report this issue</a>
				</body>
				</html>
				`);
        });
    }
}
;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ResponseRendererFactory;
// import all response renderers:
require('./responseRenderers');

},{"../config":31,"./ResponseRenderer":18,"./responseRenderers":28}],20:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
class StatusIndicator {
    constructor() {
        this.outerElement = document.createElement('div');
        this.lastTicket = 0;
    }
    getDOM() {
        return this.outerElement;
    }
    render() {
        return __awaiter(this, void 0, void 0, function* () {
            this.outerElement.classList.add('status-indicator');
        });
    }
    /**
     * Shows the status indicator with a certain message.
     * @param message The message to display.
     */
    show(message) {
        this.outerElement.classList.add('visible');
        this.outerElement.innerText = message;
        return ++this.lastTicket;
    }
    /**
     * Hides the status indicator.
     */
    hide(ticket) {
        if (ticket !== this.lastTicket) {
            return;
        }
        this.outerElement.classList.remove('visible');
        this.outerElement.innerText = '';
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StatusIndicator;

},{}],21:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const URLInterpreter_1 = require('./URLInterpreter');
const event_1 = require('../utils/event');
const utils_1 = require('../utils');
/**
 * The browser's URL bar component.
 */
class URLBar {
    /**
     * Creates a new `URLBar`.
     * @param config A browser configuration reader.
     */
    constructor(config, urlInterpreter = new URLInterpreter_1.default(config)) {
        this.config = config;
        this.urlInterpreter = urlInterpreter;
        /**
         * Triggered when the URL bar's value has changed.
         */
        this.onChange = new event_1.Event();
        this.outerElement = document.createElement('div');
        this.faviconElement = document.createElement('div');
        this.loadingBar = document.createElement('div');
        this.input = document.createElement('input');
        this.formattedView = document.createElement('div');
        this.formattedViewWrapper = document.createElement('div');
        this.protocol = document.createElement('div');
        this.host = document.createElement('div');
        this.path = document.createElement('div');
    }
    getDOM() {
        return this.outerElement;
    }
    render() {
        return __awaiter(this, void 0, void 0, function* () {
            // outer element
            this.outerElement.addEventListener('click', () => {
                this.outerElement.classList.add('focused');
                this.input.focus();
            });
            this.outerElement.classList.add('url-bar');
            // icon
            this.faviconElement.classList.add('favicon');
            this.outerElement.appendChild(this.faviconElement);
            // loading bar
            this.loadingBar.classList.add('loading-bar');
            this.hideLoadingIndicator();
            this.outerElement.appendChild(this.loadingBar);
            // input
            this.input.addEventListener('keyup', e => this.handleInputChange(e));
            this.input.addEventListener('blur', this.handleInputBlur.bind(this));
            this.input.placeholder = 'Enter an address or search the web';
            this.outerElement.appendChild(this.input);
            // formatted view
            this.protocol.classList.add('protocol');
            this.formattedViewWrapper.appendChild(this.protocol);
            this.host.classList.add('host');
            this.formattedViewWrapper.appendChild(this.host);
            this.path.classList.add('path');
            this.formattedViewWrapper.appendChild(this.path);
            this.formattedViewWrapper.classList.add('formatted-view-wrapper');
            this.formattedView.appendChild(this.formattedViewWrapper);
            this.formattedView.classList.add('formatted-view');
            this.outerElement.appendChild(this.formattedView);
        });
    }
    /**
     * Updates the favicon source.
     * @param uri The favicon's source URI. Set this to `undefined` to remove the icon.
     */
    setFavicon(uri) {
        if (typeof uri !== 'string' || uri.length === 0) {
            this.faviconElement.style.backgroundImage = '';
        }
        else {
            this.faviconElement.style.backgroundImage = `url(${uri})`;
        }
    }
    /**
     * Returns the current URL as a string.
     */
    getURL() {
        return this.input.value;
    }
    /**
     * Updates the URL bar's current value.
     * @param url The new URL to show in the URL bar.
     * @param triggerChangeEvent Whether to trigger the URL bar's change event or not.
     */
    setURL(url, triggerChangeEvent = false) {
        return __awaiter(this, void 0, void 0, function* () {
            // update the formatted view
            const parsedURL = utils_1.parseURL(url);
            this.protocol.innerText = parsedURL.protocol.replace(/\//g, '') + '//';
            this.path.innerText = parsedURL.pathname.replace(/^\/+/, '');
            if (typeof parsedURL.hash === 'string' && parsedURL.hash.length > 0) {
                this.path.innerText += parsedURL.hash;
            }
            if (typeof parsedURL.search === 'string' && parsedURL.search.length > 0) {
                this.path.innerText += parsedURL.search;
            }
            this.host.innerText = parsedURL.host;
            if (this.host.innerText.length > 0 &&
                this.path.innerText.length > 0 &&
                this.path.innerText.slice(0) !== '#') {
                this.host.innerText += '/';
            }
            // update the input's value
            this.input.value = this.getURLFromFormattedView();
        });
    }
    /**
     * Shows an infinite loading indicator in the URL bar.
     */
    showLoadingIndicator() {
        this.loadingBar.classList.add('visible', 'infinite');
    }
    /**
     * Shows a progress loading indicator in the URL bar.
     * @param percentComplete The progress percentage.
     */
    showLoadingProgress(percentComplete) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                this.loadingBar.classList.remove('infinite');
                this.loadingBar.classList.add('visible');
                if (this.loadingBar.style.width === `${percentComplete}%`) {
                    resolve();
                    return;
                }
                this.loadingBar.style.width = `${percentComplete}%`;
                setTimeout(resolve, 200);
            });
        });
    }
    /**
     * Hides the loading indicator (infinite or progress).
     */
    hideLoadingIndicator() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                this.loadingBar.classList.remove('visible', 'infinite');
                setTimeout(() => {
                    this.loadingBar.style.width = '0%';
                    resolve();
                }, 200);
            });
        });
    }
    getURLFromFormattedView() {
        return `${this.protocol.innerText}${this.host.innerText}${this.path.innerText}`;
    }
    handleInputBlur() {
        this.outerElement.classList.remove('focused');
        // reset the input's value to the current URL
        this.setURL(this.getURLFromFormattedView(), false);
    }
    handleInputChange(e) {
        return __awaiter(this, void 0, void 0, function* () {
            // only trigger change event on enter
            if (e.keyCode !== 13) {
                return;
            }
            this.input.value = yield this.urlInterpreter.interpret(this.input.value);
            this.onChange.trigger();
            this.input.blur();
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = URLBar;

},{"../utils":35,"../utils/event":34,"./URLInterpreter":22}],22:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const url_1 = require('url');
const internalRouteMapReader_1 = require('./internalRouteMapReader');
const InternalRoute_1 = require('../server/InternalRoute');
const configSection = require('./BrowserConfigSection');
/**
 * URL interpreters are objects that
 */
class URLInterpreter {
    /**
     * Creates a new `URLInterpreter`.
     * @param config A browser configuration reader.
     */
    constructor(config) {
        this.config = config;
    }
    /**
     * @param urlString The URL to interpret.
     */
    interpret(urlString) {
        return __awaiter(this, void 0, void 0, function* () {
            urlString = urlString.trim();
            const url = url_1.parse(urlString);
            if (typeof url.protocol === 'string') {
                return url_1.format(url);
            }
            // There's no protocol. Return a web search URL if:
            if (
            // the input isn't defined as a hostname in the system OR
            !(yield URLInterpreter.isKnownHostName(urlString)) ||
                // there's any whitespace in the URL
                /\s/g.test(decodeURIComponent(url.path))) {
                return this.getSearchURL(urlString);
            }
            // No protocol and no spaces. Remove all protocol-like content at the
            // beginning of the string, then prepend `http://` and return.
            urlString = urlString.replace(/^[a-z]*\:?\/+/, '');
            return `http://${urlString}`;
        });
    }
    /**
     * Returns a URL to a web search.
     * @param search The text to search for.
     */
    getSearchURL(search) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = yield this.config.get(configSection.webSearchURL);
            return url.replace(/\${searchTerm}/g, encodeURIComponent(search));
        });
    }
    static isKnownHostName(str) {
        return __awaiter(this, void 0, void 0, function* () {
            const map = yield URLInterpreter.loadHostsMap();
            return Array.isArray(map[str]) && map[str].length > 0;
        });
    }
    static loadHostsMap() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const request = new XMLHttpRequest();
                request.onerror = reject;
                request.onreadystatechange = () => {
                    if (request.readyState === XMLHttpRequest.DONE) {
                        resolve(JSON.parse(request.responseText));
                    }
                };
                request.open('GET', internalRouteMapReader_1.default(InternalRoute_1.default.Hosts), true);
                request.send();
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = URLInterpreter;

},{"../server/InternalRoute":32,"./BrowserConfigSection":9,"./internalRouteMapReader":25,"url":5}],23:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const event_1 = require('../utils/event');
const utils_1 = require('../utils');
class Viewport {
    /**
     * Creates a new viewport.
     * @param getFrameBindings A function that creates an `IFrameBindings` object for every
     *                         frame created by this viewport.
     */
    constructor(getFrameBindings, defaultScrollBehaviour = 'smooth') {
        this.getFrameBindings = getFrameBindings;
        this.defaultScrollBehaviour = defaultScrollBehaviour;
        /**
         * Triggered after the viewport has navigated to another page.
         */
        this.onAfterNavigation = new event_1.Event();
        /**
         * Triggered when the frame starts to navigate.
         */
        this.onBeginNavigation = new event_1.Event();
        /**
         * Triggered when the viewport is scrolling.
         */
        this.onScroll = new event_1.Event();
        this.outerElement = document.createElement('div');
    }
    getDOM() {
        return this.outerElement;
    }
    render() {
        return __awaiter(this, void 0, void 0, function* () {
            this.outerElement.classList.add('viewport');
            yield this.createNewFrame();
        });
    }
    /**
     * Updates the viewport's height.
     * @param height The new height in pixels.
     * @param animated Whether to animate the height change or not.
     */
    updateHeight(height, animated) {
        return __awaiter(this, void 0, void 0, function* () {
            if (animated) {
                this.outerElement.classList.add('animate-height');
                yield utils_1.sleep(10);
            }
            this.outerElement.style.height = `${height}px`;
            if (animated) {
                yield utils_1.sleep(200);
                this.outerElement.classList.remove('animate-height');
                yield utils_1.sleep(10);
            }
        });
    }
    renderHTML(html) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createNewFrame(html);
            this.overwriteBeforeUnloadInFrame();
            this.injectAnchorClickListener();
            // bind scroll listeners
            this.frame.contentWindow.addEventListener('scroll', () => this.onScroll.trigger());
            this.frame.contentWindow.document.addEventListener('scroll', () => this.onScroll.trigger());
            const body = this.frame.contentWindow.document.getElementsByTagName('body')[0];
            if (typeof body === 'object' && body !== null) {
                body.addEventListener('scroll', () => this.onScroll.trigger());
            }
        });
    }
    /**
     * Returns the viewports current scroll offsets.
     */
    getScroll() {
        if (!(this.frame instanceof HTMLElement)) {
            return {
                x: undefined,
                y: undefined
            };
        }
        return {
            x: this.frame.contentWindow.scrollX,
            y: this.frame.contentWindow.scrollY
        };
    }
    /**
     * Scrolls the viewport to a fragment.
     * @param hash The fragment to scroll to.
     * @param behavior The scroll behavior to use.
     */
    jumpToFragment(fragmentIdentifier, behavior = this.defaultScrollBehaviour) {
        fragmentIdentifier = fragmentIdentifier.replace(/^#/, '');
        let target = this.frame.contentDocument.getElementById(fragmentIdentifier) ||
            // If the fragment identifier didn't point to an element with an ID, try to find
            // an element with a name attribute that matches the fragment identifier.
            this.frame.contentDocument.querySelector(`[name="${fragmentIdentifier}"]`);
        // Cancel if the fragment couldn't be found.
        if (typeof target === 'undefined' || target === null) {
            return;
        }
        target.scrollIntoView({ behavior: behavior });
    }
    createNewFrame(src) {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                if (this.frame instanceof HTMLElement) {
                    this.frame.remove();
                }
                this.frame = document.createElement('iframe');
                this.frame.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups';
                if (typeof src === 'string') {
                    this.frame.srcdoc = src;
                }
                this.outerElement.appendChild(this.frame);
                if (typeof src === 'string') {
                    let iterations = 0;
                    let matches = 0;
                    while (iterations++ < 1000) {
                        if (typeof this.frame.contentWindow === 'object' && this.frame.contentWindow !== null) {
                            this.injectFrameBindings();
                        }
                        if (typeof this.frame.contentDocument === 'object' && this.frame.contentDocument !== null &&
                            typeof this.frame.contentDocument.body === 'object' && this.frame.contentDocument.body !== null) {
                            matches += 1;
                            if (matches === 2) {
                                break;
                            }
                        }
                        yield utils_1.sleep(100);
                    }
                }
                resolve();
            }));
        });
    }
    overwriteBeforeUnloadInFrame() {
        if (typeof this.frame.contentWindow !== 'object' || this.frame.contentWindow === null) {
            return;
        }
        this.frame.contentWindow.addEventListener('beforeunload', () => {
            this.frame.style.display = 'none';
            this.onBeginNavigation.trigger();
            const loadHandler = () => {
                this.frame.removeEventListener('load', loadHandler);
                this.onAfterNavigation.trigger(this.frame.contentWindow.location.href);
            };
            this.frame.addEventListener('load', loadHandler);
        });
    }
    injectFrameBindings() {
        if (
        // if there's no contentWindow
        typeof this.frame.contentWindow !== 'object' ||
            this.frame.contentWindow === null ||
            // or if the bindings were already created
            typeof this.frame.contentWindow.vscodeBrowser === 'object' &&
                this.frame.contentWindow.vscodeBrowser !== null) {
            return;
        }
        const members = [];
        const bindings = this.getFrameBindings();
        Viewport.bindings.splice(0, Viewport.bindings.length);
        window.getBinding = (bindingID) => Viewport.bindings[bindingID];
        let memberNames = [];
        let last = bindings;
        while (true) {
            last = Object.getPrototypeOf(last);
            if (last === Object.prototype) {
                break;
            }
            memberNames = memberNames.concat(Object.getOwnPropertyNames(last));
        }
        memberNames = memberNames.filter(name => {
            return (name !== 'constructor' &&
                typeof bindings[name] === 'function');
        });
        for (const key of memberNames) {
            let value = bindings[key];
            if (typeof bindings[key] === 'function') {
                const bindingID = Viewport.bindings.push(bindings[key]) - 1;
                value = new Function(`return window.parent.getBinding(${bindingID}).apply(undefined, arguments);`);
            }
            members.push({
                name: key,
                property: {
                    configurable: false,
                    enumerable: false,
                    value: value,
                    writable: false
                }
            });
        }
        const js = members.map(member => {
            var propertyCode = '{ ';
            for (const key in member.property) {
                propertyCode += `'${key}': ${member.property[key].toString()}, `;
            }
            propertyCode = propertyCode.slice(0, propertyCode.length - 2);
            propertyCode += ' }';
            return `Object.defineProperty(bindings, '${member.name}', ${propertyCode})`;
        }).join(';');
        this.frame.contentWindow.eval(`
			(function() {
				/* VS Code Browser Injected Bindings */
				'use strict';
				var bindings = {};
				Object.defineProperty(window, 'vscodeBrowser', {
					enumerable: false,
					configurable: false,
					get: () => bindings
				});
				${js};
				bindings.initializeWebAPIs(window).then(function() {
					window.dispatchEvent(new Event('vscodeBrowserBindingsReady'));
				});
			})();
		`);
    }
    injectAnchorClickListener() {
        this.frame.contentWindow.addEventListener('click', event => {
            const target = event.target;
            if (!(target instanceof this.frame.contentWindow.HTMLAnchorElement)) {
                return;
            }
            /// TODO: This does not find href's that have both hash and path/host.
            if (/^#/.test(target.getAttribute('href'))) {
                event.preventDefault();
                event.stopPropagation();
                this.jumpToFragment(target.getAttribute('href'));
            }
        });
    }
}
Viewport.bindings = [];
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Viewport;

},{"../utils":35,"../utils/event":34}],24:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const internalRouteMapReader_1 = require('./internalRouteMapReader');
const InternalRoute_1 = require('../server/InternalRoute');
const ReadonlyBrowserConfig_1 = require('./ReadonlyBrowserConfig');
class WritableBrowserConfig extends ReadonlyBrowserConfig_1.default {
    set(key, value) {
        return this.updateConfigField('chromevscode', key.name, value);
    }
    updateConfig(config) {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise((resolve, reject) => {
                const request = new XMLHttpRequest();
                request.onerror = reject;
                request.onreadystatechange = () => {
                    if (request.readyState === XMLHttpRequest.DONE) {
                        resolve();
                    }
                };
                request.open('GET', `${internalRouteMapReader_1.default(InternalRoute_1.default.ConfigWrite)}?${escape(JSON.stringify(config))}`, true);
                request.send();
            });
        });
    }
    updateConfigField(section, key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            const object = {};
            object[section] = {};
            object[section][key] = value;
            return this.updateConfig(object);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WritableBrowserConfig;

},{"../server/InternalRoute":32,"./ReadonlyBrowserConfig":17,"./internalRouteMapReader":25}],25:[function(require,module,exports){
"use strict";
/**
 * Returns the path to an internal route.
 * @param route The internal route to get the path to.
 */
function get(route) {
    return CHROME_VS_CODE_INTERNAL_ROUTE_MAP.get(route);
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = get;

},{}],26:[function(require,module,exports){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const ResponseRenderer_1 = require('../ResponseRenderer');
const ResponseRendererFactory_1 = require('../ResponseRendererFactory');
const internalRouteMapReader_1 = require('../internalRouteMapReader');
const InternalRoute_1 = require('../../server/InternalRoute');
const utils_1 = require('../../utils');
let HTMLRenderer_1 = class HTMLRenderer extends ResponseRenderer_1.default {
    /**
     * Renders a certain response in the renderer's current viewport.
     * @param responseURI The URI from which the response was loaded.
     * @param response The response to render.
     */
    renderResponseConcrete(responseURI, response) {
        return __awaiter(this, void 0, void 0, function* () {
            const parsedDocument = HTMLRenderer_1.parseResponseAsHTMLDocument(responseURI, response);
            yield this.viewport.renderHTML(parsedDocument.documentElement.outerHTML);
        });
    }
    /**
     * Attempts to generate a favicon for the rendered response.
     * @param responseURI The URI from which the response was loaded.
     * @param response The response to render.
     */
    generateFaviconConcrete(responseURI, response) {
        return __awaiter(this, void 0, void 0, function* () {
            if (/^about:/.test(responseURI)) {
                return HTMLRenderer_1.ownFavicon;
            }
            const parsedDocument = HTMLRenderer_1.parseResponseAsHTMLDocument(responseURI, response);
            const links = parsedDocument.getElementsByTagName('link');
            for (let i = 0; i < links.length; i++) {
                const link = links[i];
                if (link.hasAttribute('href') && /icon|shortcut/i.test(link.getAttribute('rel'))) {
                    return link.getAttribute('href');
                }
            }
            return undefined;
        });
    }
    static parseResponseAsHTMLDocument(responseURI, response) {
        // check if the last document we parsed can be used again
        if (typeof HTMLRenderer_1.lastRecentParsed === 'object' &&
            HTMLRenderer_1.lastRecentParsed !== null &&
            HTMLRenderer_1.lastRecentParsed.responseURI === responseURI &&
            HTMLRenderer_1.lastRecentParsed.response === response) {
            return HTMLRenderer_1.lastRecentParsed.parsedDocument;
        }
        // parse the document
        const parsedDocument = document.implementation.createHTMLDocument('response');
        parsedDocument.documentElement.innerHTML = response.responseText;
        HTMLRenderer_1.updateAllURIAttributes(parsedDocument, responseURI);
        // update the cache
        HTMLRenderer_1.lastRecentParsed = HTMLRenderer_1.lastRecentParsed || {};
        HTMLRenderer_1.lastRecentParsed.responseURI = responseURI;
        HTMLRenderer_1.lastRecentParsed.response = response;
        HTMLRenderer_1.lastRecentParsed.parsedDocument = parsedDocument;
        return parsedDocument;
    }
    static getBaseURLFromServerResponse(responseURL) {
        return utils_1.parseURL(responseURL.replace(/^.*?\?/, ''));
    }
    static updateAllURIAttributes(document, responseURI) {
        responseURI = responseURI.trim();
        const parsedResponseURL = utils_1.parseURL(responseURI);
        const parsedURL = HTMLRenderer_1.getBaseURLFromServerResponse(responseURI);
        const baseURL = `${parsedURL.protocol}//${parsedURL.host}`;
        const elements = document.getElementsByTagName('*');
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            for (let a = 0; a < element.attributes.length; a++) {
                const attribute = element.attributes[a];
                // remove 'target' attributes to prevent pages attempting to open another tab/window
                if (attribute.name === 'target') {
                    element.removeAttributeNode(attribute);
                }
                if (attribute.name !== 'src' && attribute.name !== 'href' && attribute.name !== 'xlink:href') {
                    continue;
                }
                // skip all...
                if (
                // data URIs
                /^data:/.test(attribute.value) ||
                    // hash only links (e.g. href="#foo")
                    /^#/.test(attribute.value)) {
                    continue;
                }
                // full protocol in URI
                if (/^[a-z]+?:\//.test(attribute.value)) {
                    attribute.value = `${internalRouteMapReader_1.default(InternalRoute_1.default.Load)}?${escape(attribute.value)}`;
                }
                else if (/^:?\/\/+/.test(attribute.value)) {
                    attribute.value = attribute.value.replace(/^:?\/+/, '');
                    attribute.value = `${internalRouteMapReader_1.default(InternalRoute_1.default.Load)}?${parsedURL.protocol}//${escape(attribute.value)}`;
                }
                else if (!/^\//.test(attribute.value)) {
                    // if the page URI ends with a slash, treat the URI in the attribute as relative to the page URI
                    if (/\/$/.test(parsedResponseURL.pathname)) {
                        attribute.value =
                            internalRouteMapReader_1.default(InternalRoute_1.default.Load) +
                                `?${parsedResponseURL.protocol}//${parsedResponseURL.host}/${parsedResponseURL.path}/${escape(attribute.value)}`;
                    }
                    else {
                        attribute.value = `${internalRouteMapReader_1.default(InternalRoute_1.default.Load)}?${parsedResponseURL.protocol}//${parsedResponseURL.host}/${escape(attribute.value)}`;
                    }
                }
                else {
                    attribute.value = `${internalRouteMapReader_1.default(InternalRoute_1.default.Load)}?${baseURL}/${escape(attribute.value)}`;
                }
            }
        }
    }
};
let HTMLRenderer = HTMLRenderer_1;
HTMLRenderer.ownFavicon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABKVBMVEUAAAD+1ABCuDnsJhwFlN7sJyL/2gDnDCXnxAQAmumTOENHqjY9rz0wxz5Muik5sU3ULS8AlOdSqDbXJx8Mj8wAmOUmzz1Mvh7iKSMAkt2jMTVIwzQ5wDr/4wD/9wABkN0Dj9aNGRUBWYYzmDoDj9bnJiFSqzcAhP+3IxsAh/MKkNL//QD/5gBnEg8Dj9bJeguJs2HAOhcznam0TycHhdgVmKTeFRYpj01nlzSTKxIwnLH+GREHjNp3IA791AABlN5CuDkCkNP/MSbsKSEAi/oAoPUAiPUCj9kHhdTtESj/7wD/4AAAme8Bkd0Wis0eir0/tkAxyTw6wTtGrTZGvDFNySzmFSflJSPdIiHmISDUxh7ZMR7lGx7/Dxz4xQX/GQPr1wDuyADwDAAssYJaAAAAPnRSTlMAm5zEv6eIfHH19PPy8PDh4N/c29bRzs7MysW2ta+uqaWRj42Mi4iDgH9/enl4c3JuZGJCQT08OzggHRcSAvY0/88AAACvSURBVBjTY8ALtIysUPh6jm4iBgwWakKqEL6Ko4tHlCyDTGBwJCuIr+Do5p/ozcjAFMQd48zMwMDi7q7J4W0HFHAQM46Nl2Cxt1dn0LEDC/AyWAv4uXKaMDCwQQT4GGwEXe25zOAC4qYu9qJSSc7sDNpggRAeD19JBgZm53B2Di+ggHRogI88yFpWp7DoBC9GBnNlfiWIwxSdPCPi5JCdruvkKayP4hkNQ0tbDB8DAOyhGpl7KuXzAAAAAElFTkSuQmCC';
HTMLRenderer = HTMLRenderer_1 = __decorate([
    ResponseRendererFactory_1.default.register(response => {
        var score = 0;
        if (response.status === 200) {
            score += 1;
        }
        if (response.getResponseHeader('Content-Type') === 'text/html') {
            score += 100;
        }
        return score;
    })
], HTMLRenderer);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HTMLRenderer;

},{"../../server/InternalRoute":32,"../../utils":35,"../ResponseRenderer":18,"../ResponseRendererFactory":19,"../internalRouteMapReader":25}],27:[function(require,module,exports){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const ResponseRenderer_1 = require('../ResponseRenderer');
const ResponseRendererFactory_1 = require('../ResponseRendererFactory');
let ImageRenderer_1 = class ImageRenderer extends ResponseRenderer_1.default {
    /**
     * Attempts to generate a favicon for the rendered response.
     * @param responseURI The URI from which the response was loaded.
     * @param response The response to render.
     */
    generateFaviconConcrete(responseURI, response) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield ImageRenderer_1.loadImageFromResponse(response)).src;
        });
    }
    /**
     * Renders a certain response in the renderer's current viewport.
     * @param responseURI The URI from which the response was loaded.
     * @param response The response to render.
     */
    renderResponseConcrete(responseURI, response) {
        return __awaiter(this, void 0, void 0, function* () {
            const image = yield ImageRenderer_1.loadImageFromResponse(response);
            yield this.viewport.renderHTML(`
			<!DOCTYPE html>
			<html>
				<head>
					<title>${response.getResponseHeader('Content-Disposition') || 'Image'}</title>
					<style>
						html {
							width: 100vw;
							height: 100vh;
							padding: 0;
							margin: 0;
							background: transparent;
						}
						body {
							background-position: 0 0, 8px 0, 8px -8px, 0px 8px;
							background-size: 16px 16px;
							background-image:
								-webkit-gradient(linear, 0 100%, 100% 0, color-stop(.25, rgba(128,128,128,0.3)), color-stop(.25, transparent)),
								-webkit-gradient(linear, 0 0, 100% 100%, color-stop(.25, rgba(128,128,128,0.3)), color-stop(.25, transparent)),
								-webkit-gradient(linear, 0 100%, 100% 0, color-stop(.75, transparent), color-stop(.75, rgba(128,128,128,0.3))),
								-webkit-gradient(linear, 0 0, 100% 100%, color-stop(.75, transparent), color-stop(.75, rgba(128,128,128,0.3)));
						}
						img {
							position: fixed;
							display: block;
							left: 50%;
							top: 50%;
							transform: translate(-50%, -50%);
							max-width: 90vh;
							max-height: 90vh;
						}
					</style>
				</head>
				<body>
					<img src='${image.src}' />
					<script src=''></script>
				</body>
			</html>
		`);
        });
    }
    static loadImageFromResponse(response) {
        return __awaiter(this, void 0, void 0, function* () {
            const contentType = response.getResponseHeader('Content-Type');
            return ImageRenderer_1.loadImage(`data:${contentType};base64,${response.responseText}`);
        });
    }
    static loadImage(src) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const image = new Image();
                image.onerror = reject;
                image.onload = () => resolve(image);
                image.src = src;
            });
        });
    }
};
let ImageRenderer = ImageRenderer_1;
ImageRenderer = ImageRenderer_1 = __decorate([
    ResponseRendererFactory_1.default.register(response => {
        var score = 0;
        if (response.status === 200) {
            score += 1;
        }
        if (/^image\/.+/i.test(response.getResponseHeader('Content-Type'))) {
            score += 1;
        }
        return score;
    })
], ImageRenderer);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ImageRenderer;

},{"../ResponseRenderer":18,"../ResponseRendererFactory":19}],28:[function(require,module,exports){
"use strict";
const HTMLRenderer_1 = require('./HTMLRenderer');
exports.HTMLRenderer = HTMLRenderer_1.default;
const ImageRenderer_1 = require('./ImageRenderer');
exports.ImageRenderer = ImageRenderer_1.default;

},{"./HTMLRenderer":26,"./ImageRenderer":27}],29:[function(require,module,exports){
"use strict";
/**
 * This function is called by the extension's HTML preview to sync the browser client's with VS Code's theme.
 * @param theme The theme to set.
 */
function setChromeVSCodeTheme(theme) {
    switch (theme) {
        default:
        case 'light':
            document.body.classList.add(`vscode-light`);
            document.body.classList.remove(`vscode-dark`);
            document.body.classList.remove(`vscode-high-contrast`);
            break;
        case 'dark':
            document.body.classList.add(`vscode-dark`);
            document.body.classList.remove(`vscode-light`);
            document.body.classList.remove(`vscode-high-contrast`);
            break;
        case 'high-contrast':
            document.body.classList.add(`vscode-high-contrast`);
            document.body.classList.remove(`vscode-light`);
            document.body.classList.remove(`vscode-dark`);
            break;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = setChromeVSCodeTheme;
window.setChromeVSCodeTheme = setChromeVSCodeTheme;

},{}],30:[function(require,module,exports){
///
/// User Prompts API Imeplemntation
/// Spec: http://w3c.github.io/html/webappapis.html#user-prompts
///
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const Dialog_1 = require('../Dialog');
const Button_1 = require('../Button');
/**
 * Adds a button to a dialog that closes the dialog when pressed.
 * @param dialog The dialog to add the button to.
 * @param text The text to display on the button. Optional.
 * @param append When `true`, the button will be appended to the dialog, otherwise it will
 *               be prepended. Optional.
 */
function addCloseButtonToDialog(dialog, text = 'Close', append = true) {
    return __awaiter(this, void 0, void 0, function* () {
        const button = new Button_1.default();
        if (append) {
            yield dialog.appendButton(button);
        }
        else {
            yield dialog.prependButton(button);
        }
        button.setText(text);
        button.onClick.once(() => dialog.close());
        return button;
    });
}
/**
 * Creates a dialog that implements `window.alert`.
 * @see http://w3c.github.io/html/webappapis.html#dom-window-alert
 */
function alert(browserWindow, message) {
    return __awaiter(this, void 0, void 0, function* () {
        // hello github 😇
        if (/for +security +reasons, +framing +is +not +allowed/i.test(message)) {
            return;
        }
        // build the dialog
        const dialog = yield Dialog_1.default.create();
        dialog.setTitle(`'${browserWindow.getHistory().getCurrent().uri}' says:`);
        dialog.setContentAsText(message || '');
        // dialog button
        yield addCloseButtonToDialog(dialog, 'OK');
        // render and open
        browserWindow.renderDialog(dialog);
        yield dialog.open();
    });
}
exports.alert = alert;
/**
 * Shows a customizable confirm dialog.
 * **This must not be exposed to web pages.**
 * @param title The dialog title.
 * @param message A message to show in the dialog.
 * @param allowHTML Whether to allow HTML in the dialog message or not.
 * @param yesButtonText An optional override for the confirmation button's text.
 * @param yesButtonText An optional override for the refuse button's text.
 */
function internalConfirm(browserWindow, title = `'${browserWindow.getHistory().getCurrent().uri}' says:`, message, allowHTML = false, yesButtonText = 'Yes', noButtonText = 'No') {
    return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
        // build the dialog
        const dialog = yield Dialog_1.default.create();
        dialog.setTitle(title);
        if (allowHTML) {
            dialog.setContentAsHTML(`
				<iframe
					style="border: none; width: 50vw; height: 60vh;"
					src="data:text/html;base64,${btoa(message || '')}"
					/>
			`);
        }
        else {
            dialog.setContentAsText(message || '');
        }
        // dialog buttons
        const noButton = yield addCloseButtonToDialog(dialog, noButtonText);
        noButton.onClick.once(() => resolve(false));
        const yesButton = yield addCloseButtonToDialog(dialog, yesButtonText);
        yesButton.onClick.once(() => resolve(true));
        // render and open
        browserWindow.renderDialog(dialog);
        yield dialog.open();
    }));
}
exports.internalConfirm = internalConfirm;
/**
 * Creates a dialog that implements `window.confirm`.
 * @see http://w3c.github.io/html/webappapis.html#dom-window-confirm
 */
function confirm(browserWindow, message) {
    return __awaiter(this, void 0, void 0, function* () {
        return internalConfirm(browserWindow, undefined, message, false);
    });
}
exports.confirm = confirm;
/**
 * Creates a dialog that implements `window.prompt`.
 * @see http://w3c.github.io/html/webappapis.html#dom-window-prompt
 */
function prompt(browserWindow, message, defaultValue = '') {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            // build the dialog's inner DOM
            const messageElement = document.createTextNode(message || '');
            const inputElement = document.createElement('input');
            inputElement.type = 'text';
            inputElement.value = defaultValue;
            // build the dialog
            const dialog = yield Dialog_1.default.create();
            dialog.setTitle(`'${browserWindow.getHistory().getCurrent().uri}' says:`);
            dialog.setContentAsHTML(messageElement, inputElement);
            // dialog buttons
            const cancelButton = yield addCloseButtonToDialog(dialog);
            cancelButton.onClick.once(() => resolve(null));
            const confirmButton = yield addCloseButtonToDialog(dialog, 'OK');
            confirmButton.onClick.once(() => resolve(inputElement.value));
            // render and open
            browserWindow.renderDialog(dialog);
            yield dialog.open();
        }));
    });
}
exports.prompt = prompt;
/**
 * Initializes the 'User Prompts' implementations on a certain window.
 * @param window The window to initialize the API on.
 */
function initialize(browserWindow, window) {
    window.alert = (message) => alert(browserWindow, message);
    window.confirm = ((message) => confirm(browserWindow, message));
    window.prompt = ((message, defaultValue) => prompt(browserWindow, message, defaultValue));
}
exports.initialize = initialize;

},{"../Button":11,"../Dialog":12}],31:[function(require,module,exports){
(function (__dirname){
"use strict";
/**
 * A URL to report extension bugs at.
 */
exports.BUG_REPORT_URL = 'https://github.com';
/**
 * Path to the directory that contains static resources.
 */
exports.STATIC_DIR = `${__dirname}/static/`;

}).call(this,"/out/src")
},{}],32:[function(require,module,exports){
"use strict";
var InternalRoute;
(function (InternalRoute) {
    /**
     * The browser front end's main HTML file.
     */
    InternalRoute[InternalRoute["BrowserHTML"] = 1] = "BrowserHTML";
    /**
     * The browser front end's main CSS file.
     */
    InternalRoute[InternalRoute["BrowserCSS"] = 2] = "BrowserCSS";
    /**
     * The browser front end's main JS file.
     */
    InternalRoute[InternalRoute["BrowserJS"] = 3] = "BrowserJS";
    /**
     * The URL to the loader API.
     */
    InternalRoute[InternalRoute["Load"] = 4] = "Load";
    /**
     * The URL to the page loader API.
     */
    InternalRoute[InternalRoute["LoadBase"] = 5] = "LoadBase";
    /**
     * The URL to the config reader.
     */
    InternalRoute[InternalRoute["ConfigRead"] = 6] = "ConfigRead";
    /**
     * The URL to the config writer.
     */
    InternalRoute[InternalRoute["ConfigWrite"] = 7] = "ConfigWrite";
    /**
     * The URL to the hostnames API.
     */
    InternalRoute[InternalRoute["Hosts"] = 8] = "Hosts";
})(InternalRoute || (InternalRoute = {}));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = InternalRoute;

},{}],33:[function(require,module,exports){
"use strict";
/**
 * @final
 */
class TypedSymbol {
    constructor(
        /**
         * The symbols globally unique ID.
         */
        id = (++TypedSymbol.counter).toString(36), name = id) {
        this.id = id;
        this.name = name;
        // Do nothing. The constructor solely exists to prevent this
        // class from being instantiated with `new`.
    }
    /**
     * Creates a new typed symbol.
     */
    static create(name) {
        return new TypedSymbol(name);
    }
    toString() {
        return this.id;
    }
}
TypedSymbol.counter = 0;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TypedSymbol;

},{}],34:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
class Event {
    constructor() {
        this.suspended = false;
    }
    bind(handler) {
        if (this.handlers) {
            this.handlers.push(handler);
        }
        else {
            this.handlers = [handler];
        }
        return handler;
    }
    once(handler) {
        this.bind((() => {
            this.unbind(handler);
            handler.apply(null, arguments);
        }));
    }
    unbind(handler) {
        if (this.handlers && this.handlers.length > 0) {
            let index = this.handlers.indexOf(handler);
            while (index !== -1) {
                this.handlers.splice(index, 1);
                index = this.handlers.indexOf(handler);
            }
        }
        if (this.handlers.length === 0) {
            this.handlers = undefined;
        }
    }
    trigger(...args) {
        if (this.isSuspended()) {
            return;
        }
        if (this.handlers && this.handlers.length > 0) {
            this.handlers.forEach(handler => handler.apply(null, args));
        }
    }
    isSuspended() {
        return this.suspended;
    }
    suspend() {
        this.suspended = true;
    }
    unsuspend() {
        this.suspended = false;
    }
    getHandlerCount() {
        if (!Array.isArray(this.handlers)) {
            return 0;
        }
        return this.handlers.length;
    }
    getReadonlyHandlerList() {
        if (!Array.isArray(this.handlers)) {
            return [];
        }
        return [].concat(this.handlers);
    }
}
exports.Event = Event;
class AsyncEvent extends Event {
    once(handler) {
        this.bind((() => __awaiter(this, arguments, void 0, function* () {
            this.unbind(handler);
            yield handler.apply(null, arguments);
        })));
    }
    trigger(...args) {
        return __awaiter(this, void 0, void 0, function* () {
            const handlers = this.getReadonlyHandlerList();
            for (const handler of handlers) {
                yield handler.apply(null, args);
            }
        });
    }
}
exports.AsyncEvent = AsyncEvent;
class SmartEvent extends Event {
    constructor() {
        super(...arguments);
        this.onBeforeFirstBind = new Event();
        this.onAfterLastUnbind = new Event();
    }
    bind(handler) {
        if (this.getHandlerCount() < 1) {
            this.onBeforeFirstBind.trigger(this);
        }
        return super.bind(handler);
    }
    unbind(handler) {
        super.unbind(handler);
        if (this.getHandlerCount() < 1) {
            this.onAfterLastUnbind.trigger(this);
        }
    }
}
exports.SmartEvent = SmartEvent;

},{}],35:[function(require,module,exports){
"use strict";
const event = require('./event');
exports.event = event;
const sleep_1 = require('./sleep');
exports.sleep = sleep_1.default;
const parseURL_1 = require('./parseURL');
exports.parseURL = parseURL_1.default;

},{"./event":34,"./parseURL":36,"./sleep":37}],36:[function(require,module,exports){
"use strict";
/**
 * Parses a URL into its parts. **Requires the DOM to work.**
 * @param url The URL to parse.
 */
function parseURL(url) {
    var link = document.createElement('a');
    link.href = url;
    let path = link.pathname;
    if (/\.[a-z0-9_-]+$/i.test(path)) {
        path = path.split('/').slice(0, -1).join('/') + '/';
    }
    return {
        protocol: link.protocol,
        host: link.host,
        hostname: link.hostname,
        pathname: link.pathname,
        path,
        search: link.search,
        hash: link.hash
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = parseURL;
;

},{}],37:[function(require,module,exports){
"use strict";
/**
 * Resolves a promise after a given number of milliseconds.
 * @param milliseconds The number of milliseconds to wait before resolving the returned promise.
 */
function sleep(milliseconds) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = sleep;

},{}]},{},[7]);
