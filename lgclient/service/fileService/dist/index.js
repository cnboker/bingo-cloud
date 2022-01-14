/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 5623:
/***/ ((module) => {

"use strict";

module.exports = balanced;
function balanced(a, b, str) {
  if (a instanceof RegExp) a = maybeMatch(a, str);
  if (b instanceof RegExp) b = maybeMatch(b, str);

  var r = range(a, b, str);

  return r && {
    start: r[0],
    end: r[1],
    pre: str.slice(0, r[0]),
    body: str.slice(r[0] + a.length, r[1]),
    post: str.slice(r[1] + b.length)
  };
}

function maybeMatch(reg, str) {
  var m = str.match(reg);
  return m ? m[0] : null;
}

balanced.range = range;
function range(a, b, str) {
  var begs, beg, left, right, result;
  var ai = str.indexOf(a);
  var bi = str.indexOf(b, ai + 1);
  var i = ai;

  if (ai >= 0 && bi > 0) {
    if(a===b) {
      return [ai, bi];
    }
    begs = [];
    left = str.length;

    while (i >= 0 && !result) {
      if (i == ai) {
        begs.push(i);
        ai = str.indexOf(a, i + 1);
      } else if (begs.length == 1) {
        result = [ begs.pop(), bi ];
      } else {
        beg = begs.pop();
        if (beg < left) {
          left = beg;
          right = bi;
        }

        bi = str.indexOf(b, i + 1);
      }

      i = ai < bi && ai >= 0 ? ai : bi;
    }

    if (begs.length) {
      result = [ left, right ];
    }
  }

  return result;
}


/***/ }),

/***/ 7740:
/***/ ((module, exports, __webpack_require__) => {

var Chainsaw = __webpack_require__(4077);
var EventEmitter = __webpack_require__(2361).EventEmitter;
var Buffers = __webpack_require__(5289);
var Vars = __webpack_require__(7962);
var Stream = __webpack_require__(2781).Stream;

exports = module.exports = function (bufOrEm, eventName) {
    if (Buffer.isBuffer(bufOrEm)) {
        return exports.parse(bufOrEm);
    }
    
    var s = exports.stream();
    if (bufOrEm && bufOrEm.pipe) {
        bufOrEm.pipe(s);
    }
    else if (bufOrEm) {
        bufOrEm.on(eventName || 'data', function (buf) {
            s.write(buf);
        });
        
        bufOrEm.on('end', function () {
            s.end();
        });
    }
    return s;
};

exports.stream = function (input) {
    if (input) return exports.apply(null, arguments);
    
    var pending = null;
    function getBytes (bytes, cb, skip) {
        pending = {
            bytes : bytes,
            skip : skip,
            cb : function (buf) {
                pending = null;
                cb(buf);
            },
        };
        dispatch();
    }
    
    var offset = null;
    function dispatch () {
        if (!pending) {
            if (caughtEnd) done = true;
            return;
        }
        if (typeof pending === 'function') {
            pending();
        }
        else {
            var bytes = offset + pending.bytes;
            
            if (buffers.length >= bytes) {
                var buf;
                if (offset == null) {
                    buf = buffers.splice(0, bytes);
                    if (!pending.skip) {
                        buf = buf.slice();
                    }
                }
                else {
                    if (!pending.skip) {
                        buf = buffers.slice(offset, bytes);
                    }
                    offset = bytes;
                }
                
                if (pending.skip) {
                    pending.cb();
                }
                else {
                    pending.cb(buf);
                }
            }
        }
    }
    
    function builder (saw) {
        function next () { if (!done) saw.next() }
        
        var self = words(function (bytes, cb) {
            return function (name) {
                getBytes(bytes, function (buf) {
                    vars.set(name, cb(buf));
                    next();
                });
            };
        });
        
        self.tap = function (cb) {
            saw.nest(cb, vars.store);
        };
        
        self.into = function (key, cb) {
            if (!vars.get(key)) vars.set(key, {});
            var parent = vars;
            vars = Vars(parent.get(key));
            
            saw.nest(function () {
                cb.apply(this, arguments);
                this.tap(function () {
                    vars = parent;
                });
            }, vars.store);
        };
        
        self.flush = function () {
            vars.store = {};
            next();
        };
        
        self.loop = function (cb) {
            var end = false;
            
            saw.nest(false, function loop () {
                this.vars = vars.store;
                cb.call(this, function () {
                    end = true;
                    next();
                }, vars.store);
                this.tap(function () {
                    if (end) saw.next()
                    else loop.call(this)
                }.bind(this));
            }, vars.store);
        };
        
        self.buffer = function (name, bytes) {
            if (typeof bytes === 'string') {
                bytes = vars.get(bytes);
            }
            
            getBytes(bytes, function (buf) {
                vars.set(name, buf);
                next();
            });
        };
        
        self.skip = function (bytes) {
            if (typeof bytes === 'string') {
                bytes = vars.get(bytes);
            }
            
            getBytes(bytes, function () {
                next();
            });
        };
        
        self.scan = function find (name, search) {
            if (typeof search === 'string') {
                search = new Buffer(search);
            }
            else if (!Buffer.isBuffer(search)) {
                throw new Error('search must be a Buffer or a string');
            }
            
            var taken = 0;
            pending = function () {
                var pos = buffers.indexOf(search, offset + taken);
                var i = pos-offset-taken;
                if (pos !== -1) {
                    pending = null;
                    if (offset != null) {
                        vars.set(
                            name,
                            buffers.slice(offset, offset + taken + i)
                        );
                        offset += taken + i + search.length;
                    }
                    else {
                        vars.set(
                            name,
                            buffers.slice(0, taken + i)
                        );
                        buffers.splice(0, taken + i + search.length);
                    }
                    next();
                    dispatch();
                } else {
                    i = Math.max(buffers.length - search.length - offset - taken, 0);
				}
                taken += i;
            };
            dispatch();
        };
        
        self.peek = function (cb) {
            offset = 0;
            saw.nest(function () {
                cb.call(this, vars.store);
                this.tap(function () {
                    offset = null;
                });
            });
        };
        
        return self;
    };
    
    var stream = Chainsaw.light(builder);
    stream.writable = true;
    
    var buffers = Buffers();
    
    stream.write = function (buf) {
        buffers.push(buf);
        dispatch();
    };
    
    var vars = Vars();
    
    var done = false, caughtEnd = false;
    stream.end = function () {
        caughtEnd = true;
    };
    
    stream.pipe = Stream.prototype.pipe;
    Object.getOwnPropertyNames(EventEmitter.prototype).forEach(function (name) {
        stream[name] = EventEmitter.prototype[name];
    });
    
    return stream;
};

exports.parse = function parse (buffer) {
    var self = words(function (bytes, cb) {
        return function (name) {
            if (offset + bytes <= buffer.length) {
                var buf = buffer.slice(offset, offset + bytes);
                offset += bytes;
                vars.set(name, cb(buf));
            }
            else {
                vars.set(name, null);
            }
            return self;
        };
    });
    
    var offset = 0;
    var vars = Vars();
    self.vars = vars.store;
    
    self.tap = function (cb) {
        cb.call(self, vars.store);
        return self;
    };
    
    self.into = function (key, cb) {
        if (!vars.get(key)) {
            vars.set(key, {});
        }
        var parent = vars;
        vars = Vars(parent.get(key));
        cb.call(self, vars.store);
        vars = parent;
        return self;
    };
    
    self.loop = function (cb) {
        var end = false;
        var ender = function () { end = true };
        while (end === false) {
            cb.call(self, ender, vars.store);
        }
        return self;
    };
    
    self.buffer = function (name, size) {
        if (typeof size === 'string') {
            size = vars.get(size);
        }
        var buf = buffer.slice(offset, Math.min(buffer.length, offset + size));
        offset += size;
        vars.set(name, buf);
        
        return self;
    };
    
    self.skip = function (bytes) {
        if (typeof bytes === 'string') {
            bytes = vars.get(bytes);
        }
        offset += bytes;
        
        return self;
    };
    
    self.scan = function (name, search) {
        if (typeof search === 'string') {
            search = new Buffer(search);
        }
        else if (!Buffer.isBuffer(search)) {
            throw new Error('search must be a Buffer or a string');
        }
        vars.set(name, null);
        
        // simple but slow string search
        for (var i = 0; i + offset <= buffer.length - search.length + 1; i++) {
            for (
                var j = 0;
                j < search.length && buffer[offset+i+j] === search[j];
                j++
            );
            if (j === search.length) break;
        }
        
        vars.set(name, buffer.slice(offset, offset + i));
        offset += i + search.length;
        return self;
    };
    
    self.peek = function (cb) {
        var was = offset;
        cb.call(self, vars.store);
        offset = was;
        return self;
    };
    
    self.flush = function () {
        vars.store = {};
        return self;
    };
    
    self.eof = function () {
        return offset >= buffer.length;
    };
    
    return self;
};

// convert byte strings to unsigned little endian numbers
function decodeLEu (bytes) {
    var acc = 0;
    for (var i = 0; i < bytes.length; i++) {
        acc += Math.pow(256,i) * bytes[i];
    }
    return acc;
}

// convert byte strings to unsigned big endian numbers
function decodeBEu (bytes) {
    var acc = 0;
    for (var i = 0; i < bytes.length; i++) {
        acc += Math.pow(256, bytes.length - i - 1) * bytes[i];
    }
    return acc;
}

// convert byte strings to signed big endian numbers
function decodeBEs (bytes) {
    var val = decodeBEu(bytes);
    if ((bytes[0] & 0x80) == 0x80) {
        val -= Math.pow(256, bytes.length);
    }
    return val;
}

// convert byte strings to signed little endian numbers
function decodeLEs (bytes) {
    var val = decodeLEu(bytes);
    if ((bytes[bytes.length - 1] & 0x80) == 0x80) {
        val -= Math.pow(256, bytes.length);
    }
    return val;
}

function words (decode) {
    var self = {};
    
    [ 1, 2, 4, 8 ].forEach(function (bytes) {
        var bits = bytes * 8;
        
        self['word' + bits + 'le']
        = self['word' + bits + 'lu']
        = decode(bytes, decodeLEu);
        
        self['word' + bits + 'ls']
        = decode(bytes, decodeLEs);
        
        self['word' + bits + 'be']
        = self['word' + bits + 'bu']
        = decode(bytes, decodeBEu);
        
        self['word' + bits + 'bs']
        = decode(bytes, decodeBEs);
    });
    
    // word8be(n) == word8le(n) for all n
    self.word8 = self.word8u = self.word8be;
    self.word8s = self.word8bs;
    
    return self;
}


/***/ }),

/***/ 7962:
/***/ ((module) => {

module.exports = function (store) {
    function getset (name, value) {
        var node = vars.store;
        var keys = name.split('.');
        keys.slice(0,-1).forEach(function (k) {
            if (node[k] === undefined) node[k] = {};
            node = node[k]
        });
        var key = keys[keys.length - 1];
        if (arguments.length == 1) {
            return node[key];
        }
        else {
            return node[key] = value;
        }
    }
    
    var vars = {
        get : function (name) {
            return getset(name);
        },
        set : function (name, value) {
            return getset(name, value);
        },
        store : store || {},
    };
    return vars;
};


/***/ }),

/***/ 3644:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var concatMap = __webpack_require__(1048);
var balanced = __webpack_require__(5623);

module.exports = expandTop;

var escSlash = '\0SLASH'+Math.random()+'\0';
var escOpen = '\0OPEN'+Math.random()+'\0';
var escClose = '\0CLOSE'+Math.random()+'\0';
var escComma = '\0COMMA'+Math.random()+'\0';
var escPeriod = '\0PERIOD'+Math.random()+'\0';

function numeric(str) {
  return parseInt(str, 10) == str
    ? parseInt(str, 10)
    : str.charCodeAt(0);
}

function escapeBraces(str) {
  return str.split('\\\\').join(escSlash)
            .split('\\{').join(escOpen)
            .split('\\}').join(escClose)
            .split('\\,').join(escComma)
            .split('\\.').join(escPeriod);
}

function unescapeBraces(str) {
  return str.split(escSlash).join('\\')
            .split(escOpen).join('{')
            .split(escClose).join('}')
            .split(escComma).join(',')
            .split(escPeriod).join('.');
}


// Basically just str.split(","), but handling cases
// where we have nested braced sections, which should be
// treated as individual members, like {a,{b,c},d}
function parseCommaParts(str) {
  if (!str)
    return [''];

  var parts = [];
  var m = balanced('{', '}', str);

  if (!m)
    return str.split(',');

  var pre = m.pre;
  var body = m.body;
  var post = m.post;
  var p = pre.split(',');

  p[p.length-1] += '{' + body + '}';
  var postParts = parseCommaParts(post);
  if (post.length) {
    p[p.length-1] += postParts.shift();
    p.push.apply(p, postParts);
  }

  parts.push.apply(parts, p);

  return parts;
}

function expandTop(str) {
  if (!str)
    return [];

  // I don't know why Bash 4.3 does this, but it does.
  // Anything starting with {} will have the first two bytes preserved
  // but *only* at the top level, so {},a}b will not expand to anything,
  // but a{},b}c will be expanded to [a}c,abc].
  // One could argue that this is a bug in Bash, but since the goal of
  // this module is to match Bash's rules, we escape a leading {}
  if (str.substr(0, 2) === '{}') {
    str = '\\{\\}' + str.substr(2);
  }

  return expand(escapeBraces(str), true).map(unescapeBraces);
}

function identity(e) {
  return e;
}

function embrace(str) {
  return '{' + str + '}';
}
function isPadded(el) {
  return /^-?0\d/.test(el);
}

function lte(i, y) {
  return i <= y;
}
function gte(i, y) {
  return i >= y;
}

function expand(str, isTop) {
  var expansions = [];

  var m = balanced('{', '}', str);
  if (!m || /\$$/.test(m.pre)) return [str];

  var isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
  var isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
  var isSequence = isNumericSequence || isAlphaSequence;
  var isOptions = m.body.indexOf(',') >= 0;
  if (!isSequence && !isOptions) {
    // {a},b}
    if (m.post.match(/,.*\}/)) {
      str = m.pre + '{' + m.body + escClose + m.post;
      return expand(str);
    }
    return [str];
  }

  var n;
  if (isSequence) {
    n = m.body.split(/\.\./);
  } else {
    n = parseCommaParts(m.body);
    if (n.length === 1) {
      // x{{a,b}}y ==> x{a}y x{b}y
      n = expand(n[0], false).map(embrace);
      if (n.length === 1) {
        var post = m.post.length
          ? expand(m.post, false)
          : [''];
        return post.map(function(p) {
          return m.pre + n[0] + p;
        });
      }
    }
  }

  // at this point, n is the parts, and we know it's not a comma set
  // with a single entry.

  // no need to expand pre, since it is guaranteed to be free of brace-sets
  var pre = m.pre;
  var post = m.post.length
    ? expand(m.post, false)
    : [''];

  var N;

  if (isSequence) {
    var x = numeric(n[0]);
    var y = numeric(n[1]);
    var width = Math.max(n[0].length, n[1].length)
    var incr = n.length == 3
      ? Math.abs(numeric(n[2]))
      : 1;
    var test = lte;
    var reverse = y < x;
    if (reverse) {
      incr *= -1;
      test = gte;
    }
    var pad = n.some(isPadded);

    N = [];

    for (var i = x; test(i, y); i += incr) {
      var c;
      if (isAlphaSequence) {
        c = String.fromCharCode(i);
        if (c === '\\')
          c = '';
      } else {
        c = String(i);
        if (pad) {
          var need = width - c.length;
          if (need > 0) {
            var z = new Array(need + 1).join('0');
            if (i < 0)
              c = '-' + z + c.slice(1);
            else
              c = z + c;
          }
        }
      }
      N.push(c);
    }
  } else {
    N = concatMap(n, function(el) { return expand(el, false) });
  }

  for (var j = 0; j < N.length; j++) {
    for (var k = 0; k < post.length; k++) {
      var expansion = pre + N[j] + post[k];
      if (!isTop || isSequence || expansion)
        expansions.push(expansion);
    }
  }

  return expansions;
}



/***/ }),

/***/ 5289:
/***/ ((module) => {

module.exports = Buffers;

function Buffers (bufs) {
    if (!(this instanceof Buffers)) return new Buffers(bufs);
    this.buffers = bufs || [];
    this.length = this.buffers.reduce(function (size, buf) {
        return size + buf.length
    }, 0);
}

Buffers.prototype.push = function () {
    for (var i = 0; i < arguments.length; i++) {
        if (!Buffer.isBuffer(arguments[i])) {
            throw new TypeError('Tried to push a non-buffer');
        }
    }
    
    for (var i = 0; i < arguments.length; i++) {
        var buf = arguments[i];
        this.buffers.push(buf);
        this.length += buf.length;
    }
    return this.length;
};

Buffers.prototype.unshift = function () {
    for (var i = 0; i < arguments.length; i++) {
        if (!Buffer.isBuffer(arguments[i])) {
            throw new TypeError('Tried to unshift a non-buffer');
        }
    }
    
    for (var i = 0; i < arguments.length; i++) {
        var buf = arguments[i];
        this.buffers.unshift(buf);
        this.length += buf.length;
    }
    return this.length;
};

Buffers.prototype.copy = function (dst, dStart, start, end) {
    return this.slice(start, end).copy(dst, dStart, 0, end - start);
};

Buffers.prototype.splice = function (i, howMany) {
    var buffers = this.buffers;
    var index = i >= 0 ? i : this.length - i;
    var reps = [].slice.call(arguments, 2);
    
    if (howMany === undefined) {
        howMany = this.length - index;
    }
    else if (howMany > this.length - index) {
        howMany = this.length - index;
    }
    
    for (var i = 0; i < reps.length; i++) {
        this.length += reps[i].length;
    }
    
    var removed = new Buffers();
    var bytes = 0;
    
    var startBytes = 0;
    for (
        var ii = 0;
        ii < buffers.length && startBytes + buffers[ii].length < index;
        ii ++
    ) { startBytes += buffers[ii].length }
    
    if (index - startBytes > 0) {
        var start = index - startBytes;
        
        if (start + howMany < buffers[ii].length) {
            removed.push(buffers[ii].slice(start, start + howMany));
            
            var orig = buffers[ii];
            //var buf = new Buffer(orig.length - howMany);
            var buf0 = new Buffer(start);
            for (var i = 0; i < start; i++) {
                buf0[i] = orig[i];
            }
            
            var buf1 = new Buffer(orig.length - start - howMany);
            for (var i = start + howMany; i < orig.length; i++) {
                buf1[ i - howMany - start ] = orig[i]
            }
            
            if (reps.length > 0) {
                var reps_ = reps.slice();
                reps_.unshift(buf0);
                reps_.push(buf1);
                buffers.splice.apply(buffers, [ ii, 1 ].concat(reps_));
                ii += reps_.length;
                reps = [];
            }
            else {
                buffers.splice(ii, 1, buf0, buf1);
                //buffers[ii] = buf;
                ii += 2;
            }
        }
        else {
            removed.push(buffers[ii].slice(start));
            buffers[ii] = buffers[ii].slice(0, start);
            ii ++;
        }
    }
    
    if (reps.length > 0) {
        buffers.splice.apply(buffers, [ ii, 0 ].concat(reps));
        ii += reps.length;
    }
    
    while (removed.length < howMany) {
        var buf = buffers[ii];
        var len = buf.length;
        var take = Math.min(len, howMany - removed.length);
        
        if (take === len) {
            removed.push(buf);
            buffers.splice(ii, 1);
        }
        else {
            removed.push(buf.slice(0, take));
            buffers[ii] = buffers[ii].slice(take);
        }
    }
    
    this.length -= removed.length;
    
    return removed;
};
 
Buffers.prototype.slice = function (i, j) {
    var buffers = this.buffers;
    if (j === undefined) j = this.length;
    if (i === undefined) i = 0;
    
    if (j > this.length) j = this.length;
    
    var startBytes = 0;
    for (
        var si = 0;
        si < buffers.length && startBytes + buffers[si].length <= i;
        si ++
    ) { startBytes += buffers[si].length }
    
    var target = new Buffer(j - i);
    
    var ti = 0;
    for (var ii = si; ti < j - i && ii < buffers.length; ii++) {
        var len = buffers[ii].length;
        
        var start = ti === 0 ? i - startBytes : 0;
        var end = ti + len >= j - i
            ? Math.min(start + (j - i) - ti, len)
            : len
        ;
        
        buffers[ii].copy(target, ti, start, end);
        ti += end - start;
    }
    
    return target;
};

Buffers.prototype.pos = function (i) {
    if (i < 0 || i >= this.length) throw new Error('oob');
    var l = i, bi = 0, bu = null;
    for (;;) {
        bu = this.buffers[bi];
        if (l < bu.length) {
            return {buf: bi, offset: l};
        } else {
            l -= bu.length;
        }
        bi++;
    }
};

Buffers.prototype.get = function get (i) {
    var pos = this.pos(i);

    return this.buffers[pos.buf].get(pos.offset);
};

Buffers.prototype.set = function set (i, b) {
    var pos = this.pos(i);

    return this.buffers[pos.buf].set(pos.offset, b);
};

Buffers.prototype.indexOf = function (needle, offset) {
    if ("string" === typeof needle) {
        needle = new Buffer(needle);
    } else if (needle instanceof Buffer) {
        // already a buffer
    } else {
        throw new Error('Invalid type for a search string');
    }

    if (!needle.length) {
        return 0;
    }

    if (!this.length) {
        return -1;
    }

    var i = 0, j = 0, match = 0, mstart, pos = 0;

    // start search from a particular point in the virtual buffer
    if (offset) {
        var p = this.pos(offset);
        i = p.buf;
        j = p.offset;
        pos = offset;
    }

    // for each character in virtual buffer
    for (;;) {
        while (j >= this.buffers[i].length) {
            j = 0;
            i++;

            if (i >= this.buffers.length) {
                // search string not found
                return -1;
            }
        }

        var char = this.buffers[i][j];

        if (char == needle[match]) {
            // keep track where match started
            if (match == 0) {
                mstart = {
                    i: i,
                    j: j,
                    pos: pos
                };
            }
            match++;
            if (match == needle.length) {
                // full match
                return mstart.pos;
            }
        } else if (match != 0) {
            // a partial match ended, go back to match starting position
            // this will continue the search at the next character
            i = mstart.i;
            j = mstart.j;
            pos = mstart.pos;
            match = 0;
        }

        j++;
        pos++;
    }
};

Buffers.prototype.toBuffer = function() {
    return this.slice();
}

Buffers.prototype.toString = function(encoding, start, end) {
    return this.slice(start, end).toString(encoding);
}


/***/ }),

/***/ 4077:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var Traverse = __webpack_require__(3692);
var EventEmitter = __webpack_require__(2361).EventEmitter;

module.exports = Chainsaw;
function Chainsaw (builder) {
    var saw = Chainsaw.saw(builder, {});
    var r = builder.call(saw.handlers, saw);
    if (r !== undefined) saw.handlers = r;
    saw.record();
    return saw.chain();
};

Chainsaw.light = function ChainsawLight (builder) {
    var saw = Chainsaw.saw(builder, {});
    var r = builder.call(saw.handlers, saw);
    if (r !== undefined) saw.handlers = r;
    return saw.chain();
};

Chainsaw.saw = function (builder, handlers) {
    var saw = new EventEmitter;
    saw.handlers = handlers;
    saw.actions = [];

    saw.chain = function () {
        var ch = Traverse(saw.handlers).map(function (node) {
            if (this.isRoot) return node;
            var ps = this.path;

            if (typeof node === 'function') {
                this.update(function () {
                    saw.actions.push({
                        path : ps,
                        args : [].slice.call(arguments)
                    });
                    return ch;
                });
            }
        });

        process.nextTick(function () {
            saw.emit('begin');
            saw.next();
        });

        return ch;
    };

    saw.pop = function () {
        return saw.actions.shift();
    };

    saw.next = function () {
        var action = saw.pop();

        if (!action) {
            saw.emit('end');
        }
        else if (!action.trap) {
            var node = saw.handlers;
            action.path.forEach(function (key) { node = node[key] });
            node.apply(saw.handlers, action.args);
        }
    };

    saw.nest = function (cb) {
        var args = [].slice.call(arguments, 1);
        var autonext = true;

        if (typeof cb === 'boolean') {
            var autonext = cb;
            cb = args.shift();
        }

        var s = Chainsaw.saw(builder, {});
        var r = builder.call(s.handlers, s);

        if (r !== undefined) s.handlers = r;

        // If we are recording...
        if ("undefined" !== typeof saw.step) {
            // ... our children should, too
            s.record();
        }

        cb.apply(s.chain(), args);
        if (autonext !== false) s.on('end', saw.next);
    };

    saw.record = function () {
        upgradeChainsaw(saw);
    };

    ['trap', 'down', 'jump'].forEach(function (method) {
        saw[method] = function () {
            throw new Error("To use the trap, down and jump features, please "+
                            "call record() first to start recording actions.");
        };
    });

    return saw;
};

function upgradeChainsaw(saw) {
    saw.step = 0;

    // override pop
    saw.pop = function () {
        return saw.actions[saw.step++];
    };

    saw.trap = function (name, cb) {
        var ps = Array.isArray(name) ? name : [name];
        saw.actions.push({
            path : ps,
            step : saw.step,
            cb : cb,
            trap : true
        });
    };

    saw.down = function (name) {
        var ps = (Array.isArray(name) ? name : [name]).join('/');
        var i = saw.actions.slice(saw.step).map(function (x) {
            if (x.trap && x.step <= saw.step) return false;
            return x.path.join('/') == ps;
        }).indexOf(true);

        if (i >= 0) saw.step += i;
        else saw.step = saw.actions.length;

        var act = saw.actions[saw.step - 1];
        if (act && act.trap) {
            // It's a trap!
            saw.step = act.step;
            act.cb();
        }
        else saw.next();
    };

    saw.jump = function (step) {
        saw.step = step;
        saw.next();
    };
};


/***/ }),

/***/ 1048:
/***/ ((module) => {

module.exports = function (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        var x = fn(xs[i], i);
        if (isArray(x)) res.push.apply(res, x);
        else res.push(x);
    }
    return res;
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};


/***/ }),

/***/ 6497:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

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

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.

function isArray(arg) {
  if (Array.isArray) {
    return Array.isArray(arg);
  }
  return objectToString(arg) === '[object Array]';
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = __webpack_require__(4300).Buffer.isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


/***/ }),

/***/ 7334:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = realpath
realpath.realpath = realpath
realpath.sync = realpathSync
realpath.realpathSync = realpathSync
realpath.monkeypatch = monkeypatch
realpath.unmonkeypatch = unmonkeypatch

var fs = __webpack_require__(7147)
var origRealpath = fs.realpath
var origRealpathSync = fs.realpathSync

var version = process.version
var ok = /^v[0-5]\./.test(version)
var old = __webpack_require__(7059)

function newError (er) {
  return er && er.syscall === 'realpath' && (
    er.code === 'ELOOP' ||
    er.code === 'ENOMEM' ||
    er.code === 'ENAMETOOLONG'
  )
}

function realpath (p, cache, cb) {
  if (ok) {
    return origRealpath(p, cache, cb)
  }

  if (typeof cache === 'function') {
    cb = cache
    cache = null
  }
  origRealpath(p, cache, function (er, result) {
    if (newError(er)) {
      old.realpath(p, cache, cb)
    } else {
      cb(er, result)
    }
  })
}

function realpathSync (p, cache) {
  if (ok) {
    return origRealpathSync(p, cache)
  }

  try {
    return origRealpathSync(p, cache)
  } catch (er) {
    if (newError(er)) {
      return old.realpathSync(p, cache)
    } else {
      throw er
    }
  }
}

function monkeypatch () {
  fs.realpath = realpath
  fs.realpathSync = realpathSync
}

function unmonkeypatch () {
  fs.realpath = origRealpath
  fs.realpathSync = origRealpathSync
}


/***/ }),

/***/ 7059:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

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

var pathModule = __webpack_require__(1017);
var isWindows = process.platform === 'win32';
var fs = __webpack_require__(7147);

// JavaScript implementation of realpath, ported from node pre-v6

var DEBUG = process.env.NODE_DEBUG && /fs/.test(process.env.NODE_DEBUG);

function rethrow() {
  // Only enable in debug mode. A backtrace uses ~1000 bytes of heap space and
  // is fairly slow to generate.
  var callback;
  if (DEBUG) {
    var backtrace = new Error;
    callback = debugCallback;
  } else
    callback = missingCallback;

  return callback;

  function debugCallback(err) {
    if (err) {
      backtrace.message = err.message;
      err = backtrace;
      missingCallback(err);
    }
  }

  function missingCallback(err) {
    if (err) {
      if (process.throwDeprecation)
        throw err;  // Forgot a callback but don't know where? Use NODE_DEBUG=fs
      else if (!process.noDeprecation) {
        var msg = 'fs: missing callback ' + (err.stack || err.message);
        if (process.traceDeprecation)
          console.trace(msg);
        else
          console.error(msg);
      }
    }
  }
}

function maybeCallback(cb) {
  return typeof cb === 'function' ? cb : rethrow();
}

var normalize = pathModule.normalize;

// Regexp that finds the next partion of a (partial) path
// result is [base_with_slash, base], e.g. ['somedir/', 'somedir']
if (isWindows) {
  var nextPartRe = /(.*?)(?:[\/\\]+|$)/g;
} else {
  var nextPartRe = /(.*?)(?:[\/]+|$)/g;
}

// Regex to find the device root, including trailing slash. E.g. 'c:\\'.
if (isWindows) {
  var splitRootRe = /^(?:[a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/][^\\\/]+)?[\\\/]*/;
} else {
  var splitRootRe = /^[\/]*/;
}

exports.realpathSync = function realpathSync(p, cache) {
  // make p is absolute
  p = pathModule.resolve(p);

  if (cache && Object.prototype.hasOwnProperty.call(cache, p)) {
    return cache[p];
  }

  var original = p,
      seenLinks = {},
      knownHard = {};

  // current character position in p
  var pos;
  // the partial path so far, including a trailing slash if any
  var current;
  // the partial path without a trailing slash (except when pointing at a root)
  var base;
  // the partial path scanned in the previous round, with slash
  var previous;

  start();

  function start() {
    // Skip over roots
    var m = splitRootRe.exec(p);
    pos = m[0].length;
    current = m[0];
    base = m[0];
    previous = '';

    // On windows, check that the root exists. On unix there is no need.
    if (isWindows && !knownHard[base]) {
      fs.lstatSync(base);
      knownHard[base] = true;
    }
  }

  // walk down the path, swapping out linked pathparts for their real
  // values
  // NB: p.length changes.
  while (pos < p.length) {
    // find the next part
    nextPartRe.lastIndex = pos;
    var result = nextPartRe.exec(p);
    previous = current;
    current += result[0];
    base = previous + result[1];
    pos = nextPartRe.lastIndex;

    // continue if not a symlink
    if (knownHard[base] || (cache && cache[base] === base)) {
      continue;
    }

    var resolvedLink;
    if (cache && Object.prototype.hasOwnProperty.call(cache, base)) {
      // some known symbolic link.  no need to stat again.
      resolvedLink = cache[base];
    } else {
      var stat = fs.lstatSync(base);
      if (!stat.isSymbolicLink()) {
        knownHard[base] = true;
        if (cache) cache[base] = base;
        continue;
      }

      // read the link if it wasn't read before
      // dev/ino always return 0 on windows, so skip the check.
      var linkTarget = null;
      if (!isWindows) {
        var id = stat.dev.toString(32) + ':' + stat.ino.toString(32);
        if (seenLinks.hasOwnProperty(id)) {
          linkTarget = seenLinks[id];
        }
      }
      if (linkTarget === null) {
        fs.statSync(base);
        linkTarget = fs.readlinkSync(base);
      }
      resolvedLink = pathModule.resolve(previous, linkTarget);
      // track this, if given a cache.
      if (cache) cache[base] = resolvedLink;
      if (!isWindows) seenLinks[id] = linkTarget;
    }

    // resolve the link, then start over
    p = pathModule.resolve(resolvedLink, p.slice(pos));
    start();
  }

  if (cache) cache[original] = p;

  return p;
};


exports.realpath = function realpath(p, cache, cb) {
  if (typeof cb !== 'function') {
    cb = maybeCallback(cache);
    cache = null;
  }

  // make p is absolute
  p = pathModule.resolve(p);

  if (cache && Object.prototype.hasOwnProperty.call(cache, p)) {
    return process.nextTick(cb.bind(null, null, cache[p]));
  }

  var original = p,
      seenLinks = {},
      knownHard = {};

  // current character position in p
  var pos;
  // the partial path so far, including a trailing slash if any
  var current;
  // the partial path without a trailing slash (except when pointing at a root)
  var base;
  // the partial path scanned in the previous round, with slash
  var previous;

  start();

  function start() {
    // Skip over roots
    var m = splitRootRe.exec(p);
    pos = m[0].length;
    current = m[0];
    base = m[0];
    previous = '';

    // On windows, check that the root exists. On unix there is no need.
    if (isWindows && !knownHard[base]) {
      fs.lstat(base, function(err) {
        if (err) return cb(err);
        knownHard[base] = true;
        LOOP();
      });
    } else {
      process.nextTick(LOOP);
    }
  }

  // walk down the path, swapping out linked pathparts for their real
  // values
  function LOOP() {
    // stop if scanned past end of path
    if (pos >= p.length) {
      if (cache) cache[original] = p;
      return cb(null, p);
    }

    // find the next part
    nextPartRe.lastIndex = pos;
    var result = nextPartRe.exec(p);
    previous = current;
    current += result[0];
    base = previous + result[1];
    pos = nextPartRe.lastIndex;

    // continue if not a symlink
    if (knownHard[base] || (cache && cache[base] === base)) {
      return process.nextTick(LOOP);
    }

    if (cache && Object.prototype.hasOwnProperty.call(cache, base)) {
      // known symbolic link.  no need to stat again.
      return gotResolvedLink(cache[base]);
    }

    return fs.lstat(base, gotStat);
  }

  function gotStat(err, stat) {
    if (err) return cb(err);

    // if not a symlink, skip to the next path part
    if (!stat.isSymbolicLink()) {
      knownHard[base] = true;
      if (cache) cache[base] = base;
      return process.nextTick(LOOP);
    }

    // stat & read the link if not read before
    // call gotTarget as soon as the link target is known
    // dev/ino always return 0 on windows, so skip the check.
    if (!isWindows) {
      var id = stat.dev.toString(32) + ':' + stat.ino.toString(32);
      if (seenLinks.hasOwnProperty(id)) {
        return gotTarget(null, seenLinks[id], base);
      }
    }
    fs.stat(base, function(err) {
      if (err) return cb(err);

      fs.readlink(base, function(err, target) {
        if (!isWindows) seenLinks[id] = target;
        gotTarget(err, target);
      });
    });
  }

  function gotTarget(err, target, base) {
    if (err) return cb(err);

    var resolvedLink = pathModule.resolve(previous, target);
    if (cache) cache[base] = resolvedLink;
    gotResolvedLink(resolvedLink);
  }

  function gotResolvedLink(resolvedLink) {
    // resolve the link, then start over
    p = pathModule.resolve(resolvedLink, p.slice(pos));
    start();
  }
};


/***/ }),

/***/ 8052:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

exports.Abstract = __webpack_require__(5348)
exports.Reader = __webpack_require__(7937)
exports.Writer = __webpack_require__(608)

exports.File =
  { Reader: __webpack_require__(9305)
  , Writer: __webpack_require__(3589) }

exports.Dir = 
  { Reader : __webpack_require__(1831)
  , Writer : __webpack_require__(6969) }

exports.Link =
  { Reader : __webpack_require__(9716)
  , Writer : __webpack_require__(3423) }

exports.Proxy =
  { Reader : __webpack_require__(3732)
  , Writer : __webpack_require__(4955) }

exports.Reader.Dir = exports.DirReader = exports.Dir.Reader
exports.Reader.File = exports.FileReader = exports.File.Reader
exports.Reader.Link = exports.LinkReader = exports.Link.Reader
exports.Reader.Proxy = exports.ProxyReader = exports.Proxy.Reader

exports.Writer.Dir = exports.DirWriter = exports.Dir.Writer
exports.Writer.File = exports.FileWriter = exports.File.Writer
exports.Writer.Link = exports.LinkWriter = exports.Link.Writer
exports.Writer.Proxy = exports.ProxyWriter = exports.Proxy.Writer

exports.collect = __webpack_require__(8818)


/***/ }),

/***/ 5348:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// the parent class for all fstreams.

module.exports = Abstract

var Stream = __webpack_require__(2781).Stream
  , inherits = __webpack_require__(4378)

function Abstract () {
  Stream.call(this)
}

inherits(Abstract, Stream)

Abstract.prototype.on = function (ev, fn) {
  if (ev === "ready" && this.ready) {
    process.nextTick(fn.bind(this))
  } else {
    Stream.prototype.on.call(this, ev, fn)
  }
  return this
}

Abstract.prototype.abort = function () {
  this._aborted = true
  this.emit("abort")
}

Abstract.prototype.destroy = function () {}

Abstract.prototype.warn = function (msg, code) {
  var me = this
    , er = decorate(msg, code, me)
  if (!me.listeners("warn")) {
    console.error("%s %s\n" +
                  "path = %s\n" +
                  "syscall = %s\n" +
                  "fstream_type = %s\n" +
                  "fstream_path = %s\n" +
                  "fstream_unc_path = %s\n" +
                  "fstream_class = %s\n" +
                  "fstream_stack =\n%s\n",
                  code || "UNKNOWN",
                  er.stack,
                  er.path,
                  er.syscall,
                  er.fstream_type,
                  er.fstream_path,
                  er.fstream_unc_path,
                  er.fstream_class,
                  er.fstream_stack.join("\n"))
  } else {
    me.emit("warn", er)
  }
}

Abstract.prototype.info = function (msg, code) {
  this.emit("info", msg, code)
}

Abstract.prototype.error = function (msg, code, th) {
  var er = decorate(msg, code, this)
  if (th) throw er
  else this.emit("error", er)
}

function decorate (er, code, me) {
  if (!(er instanceof Error)) er = new Error(er)
  er.code = er.code || code
  er.path = er.path || me.path
  er.fstream_type = er.fstream_type || me.type
  er.fstream_path = er.fstream_path || me.path
  if (me._path !== me.path) {
    er.fstream_unc_path = er.fstream_unc_path || me._path
  }
  if (me.linkpath) {
    er.fstream_linkpath = er.fstream_linkpath || me.linkpath
  }
  er.fstream_class = er.fstream_class || me.constructor.name
  er.fstream_stack = er.fstream_stack ||
    new Error().stack.split(/\n/).slice(3).map(function (s) {
      return s.replace(/^    at /, "")
    })

  return er
}


/***/ }),

/***/ 8818:
/***/ ((module) => {

module.exports = collect

function collect (stream) {
  if (stream._collected) return

  stream._collected = true
  stream.pause()

  stream.on("data", save)
  stream.on("end", save)
  var buf = []
  function save (b) {
    if (typeof b === "string") b = new Buffer(b)
    if (Buffer.isBuffer(b) && !b.length) return
    buf.push(b)
  }

  stream.on("entry", saveEntry)
  var entryBuffer = []
  function saveEntry (e) {
    collect(e)
    entryBuffer.push(e)
  }

  stream.on("proxy", proxyPause)
  function proxyPause (p) {
    p.pause()
  }


  // replace the pipe method with a new version that will
  // unlock the buffered stuff.  if you just call .pipe()
  // without a destination, then it'll re-play the events.
  stream.pipe = (function (orig) { return function (dest) {
    // console.error(" === open the pipes", dest && dest.path)

    // let the entries flow through one at a time.
    // Once they're all done, then we can resume completely.
    var e = 0
    ;(function unblockEntry () {
      var entry = entryBuffer[e++]
      // console.error(" ==== unblock entry", entry && entry.path)
      if (!entry) return resume()
      entry.on("end", unblockEntry)
      if (dest) dest.add(entry)
      else stream.emit("entry", entry)
    })()

    function resume () {
      stream.removeListener("entry", saveEntry)
      stream.removeListener("data", save)
      stream.removeListener("end", save)

      stream.pipe = orig
      if (dest) stream.pipe(dest)

      buf.forEach(function (b) {
        if (b) stream.emit("data", b)
        else stream.emit("end")
      })

      stream.resume()
    }

    return dest
  }})(stream.pipe)
}


/***/ }),

/***/ 1831:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// A thing that emits "entry" events with Reader objects
// Pausing it causes it to stop emitting entry events, and also
// pauses the current entry if there is one.

module.exports = DirReader

var fs = __webpack_require__(5602)
  , fstream = __webpack_require__(8052)
  , Reader = fstream.Reader
  , inherits = __webpack_require__(4378)
  , mkdir = __webpack_require__(1890)
  , path = __webpack_require__(1017)
  , Reader = __webpack_require__(7937)
  , assert = __webpack_require__(9491).ok

inherits(DirReader, Reader)

function DirReader (props) {
  var me = this
  if (!(me instanceof DirReader)) throw new Error(
    "DirReader must be called as constructor.")

  // should already be established as a Directory type
  if (props.type !== "Directory" || !props.Directory) {
    throw new Error("Non-directory type "+ props.type)
  }

  me.entries = null
  me._index = -1
  me._paused = false
  me._length = -1

  if (props.sort) {
    this.sort = props.sort
  }

  Reader.call(this, props)
}

DirReader.prototype._getEntries = function () {
  var me = this

  // race condition.  might pause() before calling _getEntries,
  // and then resume, and try to get them a second time.
  if (me._gotEntries) return
  me._gotEntries = true

  fs.readdir(me._path, function (er, entries) {
    if (er) return me.error(er)

    me.entries = entries

    me.emit("entries", entries)
    if (me._paused) me.once("resume", processEntries)
    else processEntries()

    function processEntries () {
      me._length = me.entries.length
      if (typeof me.sort === "function") {
        me.entries = me.entries.sort(me.sort.bind(me))
      }
      me._read()
    }
  })
}

// start walking the dir, and emit an "entry" event for each one.
DirReader.prototype._read = function () {
  var me = this

  if (!me.entries) return me._getEntries()

  if (me._paused || me._currentEntry || me._aborted) {
    // console.error("DR paused=%j, current=%j, aborted=%j", me._paused, !!me._currentEntry, me._aborted)
    return
  }

  me._index ++
  if (me._index >= me.entries.length) {
    if (!me._ended) {
      me._ended = true
      me.emit("end")
      me.emit("close")
    }
    return
  }

  // ok, handle this one, then.

  // save creating a proxy, by stat'ing the thing now.
  var p = path.resolve(me._path, me.entries[me._index])
  assert(p !== me._path)
  assert(me.entries[me._index])

  // set this to prevent trying to _read() again in the stat time.
  me._currentEntry = p
  fs[ me.props.follow ? "stat" : "lstat" ](p, function (er, stat) {
    if (er) return me.error(er)

    var who = me._proxy || me

    stat.path = p
    stat.basename = path.basename(p)
    stat.dirname = path.dirname(p)
    var childProps = me.getChildProps.call(who, stat)
    childProps.path = p
    childProps.basename = path.basename(p)
    childProps.dirname = path.dirname(p)

    var entry = Reader(childProps, stat)

    // console.error("DR Entry", p, stat.size)

    me._currentEntry = entry

    // "entry" events are for direct entries in a specific dir.
    // "child" events are for any and all children at all levels.
    // This nomenclature is not completely final.

    entry.on("pause", function (who) {
      if (!me._paused && !entry._disowned) {
        me.pause(who)
      }
    })

    entry.on("resume", function (who) {
      if (me._paused && !entry._disowned) {
        me.resume(who)
      }
    })

    entry.on("stat", function (props) {
      me.emit("_entryStat", entry, props)
      if (entry._aborted) return
      if (entry._paused) entry.once("resume", function () {
        me.emit("entryStat", entry, props)
      })
      else me.emit("entryStat", entry, props)
    })

    entry.on("ready", function EMITCHILD () {
      // console.error("DR emit child", entry._path)
      if (me._paused) {
        // console.error("  DR emit child - try again later")
        // pause the child, and emit the "entry" event once we drain.
        // console.error("DR pausing child entry")
        entry.pause(me)
        return me.once("resume", EMITCHILD)
      }

      // skip over sockets.  they can't be piped around properly,
      // so there's really no sense even acknowledging them.
      // if someone really wants to see them, they can listen to
      // the "socket" events.
      if (entry.type === "Socket") {
        me.emit("socket", entry)
      } else {
        me.emitEntry(entry)
      }
    })

    var ended = false
    entry.on("close", onend)
    entry.on("disown", onend)
    function onend () {
      if (ended) return
      ended = true
      me.emit("childEnd", entry)
      me.emit("entryEnd", entry)
      me._currentEntry = null
      if (!me._paused) {
        me._read()
      }
    }

    // XXX Remove this.  Works in node as of 0.6.2 or so.
    // Long filenames should not break stuff.
    entry.on("error", function (er) {
      if (entry._swallowErrors) {
        me.warn(er)
        entry.emit("end")
        entry.emit("close")
      } else {
        me.emit("error", er)
      }
    })

    // proxy up some events.
    ; [ "child"
      , "childEnd"
      , "warn"
      ].forEach(function (ev) {
        entry.on(ev, me.emit.bind(me, ev))
      })
  })
}

DirReader.prototype.disown = function (entry) {
  entry.emit("beforeDisown")
  entry._disowned = true
  entry.parent = entry.root = null
  if (entry === this._currentEntry) {
    this._currentEntry = null
  }
  entry.emit("disown")
}

DirReader.prototype.getChildProps = function (stat) {
  return { depth: this.depth + 1
         , root: this.root || this
         , parent: this
         , follow: this.follow
         , filter: this.filter
         , sort: this.props.sort
         , hardlinks: this.props.hardlinks
         }
}

DirReader.prototype.pause = function (who) {
  var me = this
  if (me._paused) return
  who = who || me
  me._paused = true
  if (me._currentEntry && me._currentEntry.pause) {
    me._currentEntry.pause(who)
  }
  me.emit("pause", who)
}

DirReader.prototype.resume = function (who) {
  var me = this
  if (!me._paused) return
  who = who || me

  me._paused = false
  // console.error("DR Emit Resume", me._path)
  me.emit("resume", who)
  if (me._paused) {
    // console.error("DR Re-paused", me._path)
    return
  }

  if (me._currentEntry) {
    if (me._currentEntry.resume) me._currentEntry.resume(who)
  } else me._read()
}

DirReader.prototype.emitEntry = function (entry) {
  this.emit("entry", entry)
  this.emit("child", entry)
}


/***/ }),

/***/ 6969:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// It is expected that, when .add() returns false, the consumer
// of the DirWriter will pause until a "drain" event occurs. Note
// that this is *almost always going to be the case*, unless the
// thing being written is some sort of unsupported type, and thus
// skipped over.

module.exports = DirWriter

var fs = __webpack_require__(5602)
  , fstream = __webpack_require__(8052)
  , Writer = __webpack_require__(608)
  , inherits = __webpack_require__(4378)
  , mkdir = __webpack_require__(1890)
  , path = __webpack_require__(1017)
  , collect = __webpack_require__(8818)

inherits(DirWriter, Writer)

function DirWriter (props) {
  var me = this
  if (!(me instanceof DirWriter)) me.error(
    "DirWriter must be called as constructor.", null, true)

  // should already be established as a Directory type
  if (props.type !== "Directory" || !props.Directory) {
    me.error("Non-directory type "+ props.type + " " +
                    JSON.stringify(props), null, true)
  }

  Writer.call(this, props)
}

DirWriter.prototype._create = function () {
  var me = this
  mkdir(me._path, Writer.dirmode, function (er) {
    if (er) return me.error(er)
    // ready to start getting entries!
    me.ready = true
    me.emit("ready")
    me._process()
  })
}

// a DirWriter has an add(entry) method, but its .write() doesn't
// do anything.  Why a no-op rather than a throw?  Because this
// leaves open the door for writing directory metadata for
// gnu/solaris style dumpdirs.
DirWriter.prototype.write = function () {
  return true
}

DirWriter.prototype.end = function () {
  this._ended = true
  this._process()
}

DirWriter.prototype.add = function (entry) {
  var me = this

  // console.error("\tadd", entry._path, "->", me._path)
  collect(entry)
  if (!me.ready || me._currentEntry) {
    me._buffer.push(entry)
    return false
  }

  // create a new writer, and pipe the incoming entry into it.
  if (me._ended) {
    return me.error("add after end")
  }

  me._buffer.push(entry)
  me._process()

  return 0 === this._buffer.length
}

DirWriter.prototype._process = function () {
  var me = this

  // console.error("DW Process p=%j", me._processing, me.basename)

  if (me._processing) return

  var entry = me._buffer.shift()
  if (!entry) {
    // console.error("DW Drain")
    me.emit("drain")
    if (me._ended) me._finish()
    return
  }

  me._processing = true
  // console.error("DW Entry", entry._path)

  me.emit("entry", entry)

  // ok, add this entry
  //
  // don't allow recursive copying
  var p = entry
  do {
    var pp = p._path || p.path
    if (pp === me.root._path || pp === me._path ||
        (pp && pp.indexOf(me._path) === 0)) {
      // console.error("DW Exit (recursive)", entry.basename, me._path)
      me._processing = false
      if (entry._collected) entry.pipe()
      return me._process()
    }
  } while (p = p.parent)

  // console.error("DW not recursive")

  // chop off the entry's root dir, replace with ours
  var props = { parent: me
              , root: me.root || me
              , type: entry.type
              , depth: me.depth + 1 }

  var p = entry._path || entry.path || entry.props.path
  if (entry.parent) {
    p = p.substr(entry.parent._path.length + 1)
  }
  // get rid of any ../../ shenanigans
  props.path = path.join(me.path, path.join("/", p))

  // if i have a filter, the child should inherit it.
  props.filter = me.filter

  // all the rest of the stuff, copy over from the source.
  Object.keys(entry.props).forEach(function (k) {
    if (!props.hasOwnProperty(k)) {
      props[k] = entry.props[k]
    }
  })

  // not sure at this point what kind of writer this is.
  var child = me._currentChild = new Writer(props)
  child.on("ready", function () {
    // console.error("DW Child Ready", child.type, child._path)
    // console.error("  resuming", entry._path)
    entry.pipe(child)
    entry.resume()
  })

  // XXX Make this work in node.
  // Long filenames should not break stuff.
  child.on("error", function (er) {
    if (child._swallowErrors) {
      me.warn(er)
      child.emit("end")
      child.emit("close")
    } else {
      me.emit("error", er)
    }
  })

  // we fire _end internally *after* end, so that we don't move on
  // until any "end" listeners have had their chance to do stuff.
  child.on("close", onend)
  var ended = false
  function onend () {
    if (ended) return
    ended = true
    // console.error("* DW Child end", child.basename)
    me._currentChild = null
    me._processing = false
    me._process()
  }
}


/***/ }),

/***/ 9305:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// Basically just a wrapper around an fs.ReadStream

module.exports = FileReader

var fs = __webpack_require__(5602)
  , fstream = __webpack_require__(8052)
  , Reader = fstream.Reader
  , inherits = __webpack_require__(4378)
  , mkdir = __webpack_require__(1890)
  , Reader = __webpack_require__(7937)
  , EOF = {EOF: true}
  , CLOSE = {CLOSE: true}

inherits(FileReader, Reader)

function FileReader (props) {
  // console.error("    FR create", props.path, props.size, new Error().stack)
  var me = this
  if (!(me instanceof FileReader)) throw new Error(
    "FileReader must be called as constructor.")

  // should already be established as a File type
  // XXX Todo: preserve hardlinks by tracking dev+inode+nlink,
  // with a HardLinkReader class.
  if (!((props.type === "Link" && props.Link) ||
        (props.type === "File" && props.File))) {
    throw new Error("Non-file type "+ props.type)
  }

  me._buffer = []
  me._bytesEmitted = 0
  Reader.call(me, props)
}

FileReader.prototype._getStream = function () {
  var me = this
    , stream = me._stream = fs.createReadStream(me._path, me.props)

  if (me.props.blksize) {
    stream.bufferSize = me.props.blksize
  }

  stream.on("open", me.emit.bind(me, "open"))

  stream.on("data", function (c) {
    // console.error("\t\t%d %s", c.length, me.basename)
    me._bytesEmitted += c.length
    // no point saving empty chunks
    if (!c.length) return
    else if (me._paused || me._buffer.length) {
      me._buffer.push(c)
      me._read()
    } else me.emit("data", c)
  })

  stream.on("end", function () {
    if (me._paused || me._buffer.length) {
      // console.error("FR Buffering End", me._path)
      me._buffer.push(EOF)
      me._read()
    } else {
      me.emit("end")
    }

    if (me._bytesEmitted !== me.props.size) {
      me.error("Didn't get expected byte count\n"+
               "expect: "+me.props.size + "\n" +
               "actual: "+me._bytesEmitted)
    }
  })

  stream.on("close", function () {
    if (me._paused || me._buffer.length) {
      // console.error("FR Buffering Close", me._path)
      me._buffer.push(CLOSE)
      me._read()
    } else {
      // console.error("FR close 1", me._path)
      me.emit("close")
    }
  })

  me._read()
}

FileReader.prototype._read = function () {
  var me = this
  // console.error("FR _read", me._path)
  if (me._paused) {
    // console.error("FR _read paused", me._path)
    return
  }

  if (!me._stream) {
    // console.error("FR _getStream calling", me._path)
    return me._getStream()
  }

  // clear out the buffer, if there is one.
  if (me._buffer.length) {
    // console.error("FR _read has buffer", me._buffer.length, me._path)
    var buf = me._buffer
    for (var i = 0, l = buf.length; i < l; i ++) {
      var c = buf[i]
      if (c === EOF) {
        // console.error("FR Read emitting buffered end", me._path)
        me.emit("end")
      } else if (c === CLOSE) {
        // console.error("FR Read emitting buffered close", me._path)
        me.emit("close")
      } else {
        // console.error("FR Read emitting buffered data", me._path)
        me.emit("data", c)
      }

      if (me._paused) {
        // console.error("FR Read Re-pausing at "+i, me._path)
        me._buffer = buf.slice(i)
        return
      }
    }
    me._buffer.length = 0
  }
  // console.error("FR _read done")
  // that's about all there is to it.
}

FileReader.prototype.pause = function (who) {
  var me = this
  // console.error("FR Pause", me._path)
  if (me._paused) return
  who = who || me
  me._paused = true
  if (me._stream) me._stream.pause()
  me.emit("pause", who)
}

FileReader.prototype.resume = function (who) {
  var me = this
  // console.error("FR Resume", me._path)
  if (!me._paused) return
  who = who || me
  me.emit("resume", who)
  me._paused = false
  if (me._stream) me._stream.resume()
  me._read()
}


/***/ }),

/***/ 3589:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = FileWriter

var fs = __webpack_require__(5602)
  , mkdir = __webpack_require__(1890)
  , Writer = __webpack_require__(608)
  , inherits = __webpack_require__(4378)
  , EOF = {}

inherits(FileWriter, Writer)

function FileWriter (props) {
  var me = this
  if (!(me instanceof FileWriter)) throw new Error(
    "FileWriter must be called as constructor.")

  // should already be established as a File type
  if (props.type !== "File" || !props.File) {
    throw new Error("Non-file type "+ props.type)
  }

  me._buffer = []
  me._bytesWritten = 0

  Writer.call(this, props)
}

FileWriter.prototype._create = function () {
  var me = this
  if (me._stream) return

  var so = {}
  if (me.props.flags) so.flags = me.props.flags
  so.mode = Writer.filemode
  if (me._old && me._old.blksize) so.bufferSize = me._old.blksize

  me._stream = fs.createWriteStream(me._path, so)

  me._stream.on("open", function (fd) {
    // console.error("FW open", me._buffer, me._path)
    me.ready = true
    me._buffer.forEach(function (c) {
      if (c === EOF) me._stream.end()
      else me._stream.write(c)
    })
    me.emit("ready")
    // give this a kick just in case it needs it.
    me.emit("drain")
  })

  me._stream.on("drain", function () { me.emit("drain") })

  me._stream.on("close", function () {
    // console.error("\n\nFW Stream Close", me._path, me.size)
    me._finish()
  })
}

FileWriter.prototype.write = function (c) {
  var me = this

  me._bytesWritten += c.length

  if (!me.ready) {
    if (!Buffer.isBuffer(c) && typeof c !== 'string')
      throw new Error('invalid write data')
    me._buffer.push(c)
    return false
  }

  var ret = me._stream.write(c)
  // console.error("\t-- fw wrote, _stream says", ret, me._stream._queue.length)

  // allow 2 buffered writes, because otherwise there's just too
  // much stop and go bs.
  if (ret === false && me._stream._queue) {
    return me._stream._queue.length <= 2;
  } else {
    return ret;
  }
}

FileWriter.prototype.end = function (c) {
  var me = this

  if (c) me.write(c)

  if (!me.ready) {
    me._buffer.push(EOF)
    return false
  }

  return me._stream.end()
}

FileWriter.prototype._finish = function () {
  var me = this
  if (typeof me.size === "number" && me._bytesWritten != me.size) {
    me.error(
      "Did not get expected byte count.\n" +
      "expect: " + me.size + "\n" +
      "actual: " + me._bytesWritten)
  }
  Writer.prototype._finish.call(me)
}


/***/ }),

/***/ 2152:
/***/ ((module) => {

module.exports = getType

function getType (st) {
  var types =
      [ "Directory"
      , "File"
      , "SymbolicLink"
      , "Link" // special for hardlinks from tarballs
      , "BlockDevice"
      , "CharacterDevice"
      , "FIFO"
      , "Socket" ]
    , type

  if (st.type && -1 !== types.indexOf(st.type)) {
    st[st.type] = true
    return st.type
  }

  for (var i = 0, l = types.length; i < l; i ++) {
    type = types[i]
    var is = st[type] || st["is" + type]
    if (typeof is === "function") is = is.call(st)
    if (is) {
      st[type] = true
      st.type = type
      return type
    }
  }

  return null
}


/***/ }),

/***/ 9716:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// Basically just a wrapper around an fs.readlink
//
// XXX: Enhance this to support the Link type, by keeping
// a lookup table of {<dev+inode>:<path>}, so that hardlinks
// can be preserved in tarballs.

module.exports = LinkReader

var fs = __webpack_require__(5602)
  , fstream = __webpack_require__(8052)
  , inherits = __webpack_require__(4378)
  , mkdir = __webpack_require__(1890)
  , Reader = __webpack_require__(7937)

inherits(LinkReader, Reader)

function LinkReader (props) {
  var me = this
  if (!(me instanceof LinkReader)) throw new Error(
    "LinkReader must be called as constructor.")

  if (!((props.type === "Link" && props.Link) ||
        (props.type === "SymbolicLink" && props.SymbolicLink))) {
    throw new Error("Non-link type "+ props.type)
  }

  Reader.call(me, props)
}

// When piping a LinkReader into a LinkWriter, we have to
// already have the linkpath property set, so that has to
// happen *before* the "ready" event, which means we need to
// override the _stat method.
LinkReader.prototype._stat = function (currentStat) {
  var me = this
  fs.readlink(me._path, function (er, linkpath) {
    if (er) return me.error(er)
    me.linkpath = me.props.linkpath = linkpath
    me.emit("linkpath", linkpath)
    Reader.prototype._stat.call(me, currentStat)
  })
}

LinkReader.prototype._read = function () {
  var me = this
  if (me._paused) return
  // basically just a no-op, since we got all the info we need
  // from the _stat method
  if (!me._ended) {
    me.emit("end")
    me.emit("close")
    me._ended = true
  }
}


/***/ }),

/***/ 3423:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


module.exports = LinkWriter

var fs = __webpack_require__(5602)
  , Writer = __webpack_require__(608)
  , inherits = __webpack_require__(4378)
  , path = __webpack_require__(1017)
  , rimraf = __webpack_require__(984)

inherits(LinkWriter, Writer)

function LinkWriter (props) {
  var me = this
  if (!(me instanceof LinkWriter)) throw new Error(
    "LinkWriter must be called as constructor.")

  // should already be established as a Link type
  if (!((props.type === "Link" && props.Link) ||
        (props.type === "SymbolicLink" && props.SymbolicLink))) {
    throw new Error("Non-link type "+ props.type)
  }

  if (props.linkpath === "") props.linkpath = "."
  if (!props.linkpath) {
    me.error("Need linkpath property to create " + props.type)
  }

  Writer.call(this, props)
}

LinkWriter.prototype._create = function () {
  // console.error(" LW _create")
  var me = this
    , hard = me.type === "Link" || process.platform === "win32"
    , link = hard ? "link" : "symlink"
    , lp = hard ? path.resolve(me.dirname, me.linkpath) : me.linkpath

  // can only change the link path by clobbering
  // For hard links, let's just assume that's always the case, since
  // there's no good way to read them if we don't already know.
  if (hard) return clobber(me, lp, link)

  fs.readlink(me._path, function (er, p) {
    // only skip creation if it's exactly the same link
    if (p && p === lp) return finish(me)
    clobber(me, lp, link)
  })
}

function clobber (me, lp, link) {
  rimraf(me._path, function (er) {
    if (er) return me.error(er)
    create(me, lp, link)
  })
}

function create (me, lp, link) {
  fs[link](lp, me._path, function (er) {
    // if this is a hard link, and we're in the process of writing out a
    // directory, it's very possible that the thing we're linking to
    // doesn't exist yet (especially if it was intended as a symlink),
    // so swallow ENOENT errors here and just soldier in.
    // Additionally, an EPERM or EACCES can happen on win32 if it's trying
    // to make a link to a directory.  Again, just skip it.
    // A better solution would be to have fs.symlink be supported on
    // windows in some nice fashion.
    if (er) {
      if ((er.code === "ENOENT" ||
           er.code === "EACCES" ||
           er.code === "EPERM" ) && process.platform === "win32") {
        me.ready = true
        me.emit("ready")
        me.emit("end")
        me.emit("close")
        me.end = me._finish = function () {}
      } else return me.error(er)
    }
    finish(me)
  })
}

function finish (me) {
  me.ready = true
  me.emit("ready")
  if (me._ended && !me._finished) me._finish()
}

LinkWriter.prototype.end = function () {
  // console.error("LW finish in end")
  this._ended = true
  if (this.ready) {
    this._finished = true
    this._finish()
  }
}


/***/ }),

/***/ 3732:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// A reader for when we don't yet know what kind of thing
// the thing is.

module.exports = ProxyReader

var Reader = __webpack_require__(7937)
  , getType = __webpack_require__(2152)
  , inherits = __webpack_require__(4378)
  , fs = __webpack_require__(5602)

inherits(ProxyReader, Reader)

function ProxyReader (props) {
  var me = this
  if (!(me instanceof ProxyReader)) throw new Error(
    "ProxyReader must be called as constructor.")

  me.props = props
  me._buffer = []
  me.ready = false

  Reader.call(me, props)
}

ProxyReader.prototype._stat = function () {
  var me = this
    , props = me.props
    // stat the thing to see what the proxy should be.
    , stat = props.follow ? "stat" : "lstat"

  fs[stat](props.path, function (er, current) {
    var type
    if (er || !current) {
      type = "File"
    } else {
      type = getType(current)
    }

    props[type] = true
    props.type = me.type = type

    me._old = current
    me._addProxy(Reader(props, current))
  })
}

ProxyReader.prototype._addProxy = function (proxy) {
  var me = this
  if (me._proxyTarget) {
    return me.error("proxy already set")
  }

  me._proxyTarget = proxy
  proxy._proxy = me

  ; [ "error"
    , "data"
    , "end"
    , "close"
    , "linkpath"
    , "entry"
    , "entryEnd"
    , "child"
    , "childEnd"
    , "warn"
    , "stat"
    ].forEach(function (ev) {
      // console.error("~~ proxy event", ev, me.path)
      proxy.on(ev, me.emit.bind(me, ev))
    })

  me.emit("proxy", proxy)

  proxy.on("ready", function () {
    // console.error("~~ proxy is ready!", me.path)
    me.ready = true
    me.emit("ready")
  })

  var calls = me._buffer
  me._buffer.length = 0
  calls.forEach(function (c) {
    proxy[c[0]].apply(proxy, c[1])
  })
}

ProxyReader.prototype.pause = function () {
  return this._proxyTarget ? this._proxyTarget.pause() : false
}

ProxyReader.prototype.resume = function () {
  return this._proxyTarget ? this._proxyTarget.resume() : false
}


/***/ }),

/***/ 4955:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// A writer for when we don't know what kind of thing
// the thing is.  That is, it's not explicitly set,
// so we're going to make it whatever the thing already
// is, or "File"
//
// Until then, collect all events.

module.exports = ProxyWriter

var Writer = __webpack_require__(608)
  , getType = __webpack_require__(2152)
  , inherits = __webpack_require__(4378)
  , collect = __webpack_require__(8818)
  , fs = __webpack_require__(7147)

inherits(ProxyWriter, Writer)

function ProxyWriter (props) {
  var me = this
  if (!(me instanceof ProxyWriter)) throw new Error(
    "ProxyWriter must be called as constructor.")

  me.props = props
  me._needDrain = false

  Writer.call(me, props)
}

ProxyWriter.prototype._stat = function () {
  var me = this
    , props = me.props
    // stat the thing to see what the proxy should be.
    , stat = props.follow ? "stat" : "lstat"

  fs[stat](props.path, function (er, current) {
    var type
    if (er || !current) {
      type = "File"
    } else {
      type = getType(current)
    }

    props[type] = true
    props.type = me.type = type

    me._old = current
    me._addProxy(Writer(props, current))
  })
}

ProxyWriter.prototype._addProxy = function (proxy) {
  // console.error("~~ set proxy", this.path)
  var me = this
  if (me._proxy) {
    return me.error("proxy already set")
  }

  me._proxy = proxy
  ; [ "ready"
    , "error"
    , "close"
    , "pipe"
    , "drain"
    , "warn"
    ].forEach(function (ev) {
      proxy.on(ev, me.emit.bind(me, ev))
    })

  me.emit("proxy", proxy)

  var calls = me._buffer
  calls.forEach(function (c) {
    // console.error("~~ ~~ proxy buffered call", c[0], c[1])
    proxy[c[0]].apply(proxy, c[1])
  })
  me._buffer.length = 0
  if (me._needsDrain) me.emit("drain")
}

ProxyWriter.prototype.add = function (entry) {
  // console.error("~~ proxy add")
  collect(entry)

  if (!this._proxy) {
    this._buffer.push(["add", [entry]])
    this._needDrain = true
    return false
  }
  return this._proxy.add(entry)
}

ProxyWriter.prototype.write = function (c) {
  // console.error("~~ proxy write")
  if (!this._proxy) {
    this._buffer.push(["write", [c]])
    this._needDrain = true
    return false
  }
  return this._proxy.write(c)
}

ProxyWriter.prototype.end = function (c) {
  // console.error("~~ proxy end")
  if (!this._proxy) {
    this._buffer.push(["end", [c]])
    return false
  }
  return this._proxy.end(c)
}


/***/ }),

/***/ 7937:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


module.exports = Reader

var fs = __webpack_require__(5602)
  , Stream = __webpack_require__(2781).Stream
  , inherits = __webpack_require__(4378)
  , path = __webpack_require__(1017)
  , getType = __webpack_require__(2152)
  , hardLinks = Reader.hardLinks = {}
  , Abstract = __webpack_require__(5348)

// Must do this *before* loading the child classes
inherits(Reader, Abstract)

var DirReader = __webpack_require__(1831)
  , FileReader = __webpack_require__(9305)
  , LinkReader = __webpack_require__(9716)
  , SocketReader = __webpack_require__(12)
  , ProxyReader = __webpack_require__(3732)

function Reader (props, currentStat) {
  var me = this
  if (!(me instanceof Reader)) return new Reader(props, currentStat)

  if (typeof props === "string") {
    props = { path: props }
  }

  if (!props.path) {
    me.error("Must provide a path", null, true)
  }

  // polymorphism.
  // call fstream.Reader(dir) to get a DirReader object, etc.
  // Note that, unlike in the Writer case, ProxyReader is going
  // to be the *normal* state of affairs, since we rarely know
  // the type of a file prior to reading it.


  var type
    , ClassType

  if (props.type && typeof props.type === "function") {
    type = props.type
    ClassType = type
  } else {
    type = getType(props)
    ClassType = Reader
  }

  if (currentStat && !type) {
    type = getType(currentStat)
    props[type] = true
    props.type = type
  }

  switch (type) {
    case "Directory":
      ClassType = DirReader
      break

    case "Link":
      // XXX hard links are just files.
      // However, it would be good to keep track of files' dev+inode
      // and nlink values, and create a HardLinkReader that emits
      // a linkpath value of the original copy, so that the tar
      // writer can preserve them.
      // ClassType = HardLinkReader
      // break

    case "File":
      ClassType = FileReader
      break

    case "SymbolicLink":
      ClassType = LinkReader
      break

    case "Socket":
      ClassType = SocketReader
      break

    case null:
      ClassType = ProxyReader
      break
  }

  if (!(me instanceof ClassType)) {
    return new ClassType(props)
  }

  Abstract.call(me)

  me.readable = true
  me.writable = false

  me.type = type
  me.props = props
  me.depth = props.depth = props.depth || 0
  me.parent = props.parent || null
  me.root = props.root || (props.parent && props.parent.root) || me

  me._path = me.path = path.resolve(props.path)
  if (process.platform === "win32") {
    me.path = me._path = me.path.replace(/\?/g, "_")
    if (me._path.length >= 260) {
      // how DOES one create files on the moon?
      // if the path has spaces in it, then UNC will fail.
      me._swallowErrors = true
      //if (me._path.indexOf(" ") === -1) {
        me._path = "\\\\?\\" + me.path.replace(/\//g, "\\")
      //}
    }
  }
  me.basename = props.basename = path.basename(me.path)
  me.dirname = props.dirname = path.dirname(me.path)

  // these have served their purpose, and are now just noisy clutter
  props.parent = props.root = null

  // console.error("\n\n\n%s setting size to", props.path, props.size)
  me.size = props.size
  me.filter = typeof props.filter === "function" ? props.filter : null
  if (props.sort === "alpha") props.sort = alphasort

  // start the ball rolling.
  // this will stat the thing, and then call me._read()
  // to start reading whatever it is.
  // console.error("calling stat", props.path, currentStat)
  me._stat(currentStat)
}

function alphasort (a, b) {
  return a === b ? 0
       : a.toLowerCase() > b.toLowerCase() ? 1
       : a.toLowerCase() < b.toLowerCase() ? -1
       : a > b ? 1
       : -1
}

Reader.prototype._stat = function (currentStat) {
  var me = this
    , props = me.props
    , stat = props.follow ? "stat" : "lstat"
  // console.error("Reader._stat", me._path, currentStat)
  if (currentStat) process.nextTick(statCb.bind(null, null, currentStat))
  else fs[stat](me._path, statCb)


  function statCb (er, props_) {
    // console.error("Reader._stat, statCb", me._path, props_, props_.nlink)
    if (er) return me.error(er)

    Object.keys(props_).forEach(function (k) {
      props[k] = props_[k]
    })

    // if it's not the expected size, then abort here.
    if (undefined !== me.size && props.size !== me.size) {
      return me.error("incorrect size")
    }
    me.size = props.size

    var type = getType(props)
    var handleHardlinks = props.hardlinks !== false
    
    // special little thing for handling hardlinks.
    if (handleHardlinks && type !== "Directory" && props.nlink && props.nlink > 1) {
      var k = props.dev + ":" + props.ino
      // console.error("Reader has nlink", me._path, k)
      if (hardLinks[k] === me._path || !hardLinks[k]) hardLinks[k] = me._path
      else {
        // switch into hardlink mode.
        type = me.type = me.props.type = "Link"
        me.Link = me.props.Link = true
        me.linkpath = me.props.linkpath = hardLinks[k]
        // console.error("Hardlink detected, switching mode", me._path, me.linkpath)
        // Setting __proto__ would arguably be the "correct"
        // approach here, but that just seems too wrong.
        me._stat = me._read = LinkReader.prototype._read
      }
    }

    if (me.type && me.type !== type) {
      me.error("Unexpected type: " + type)
    }

    // if the filter doesn't pass, then just skip over this one.
    // still have to emit end so that dir-walking can move on.
    if (me.filter) {
      var who = me._proxy || me
      // special handling for ProxyReaders
      if (!me.filter.call(who, who, props)) {
        if (!me._disowned) {
          me.abort()
          me.emit("end")
          me.emit("close")
        }
        return
      }
    }

    // last chance to abort or disown before the flow starts!
    var events = ["_stat", "stat", "ready"]
    var e = 0
    ;(function go () {
      if (me._aborted) {
        me.emit("end")
        me.emit("close")
        return
      }

      if (me._paused && me.type !== "Directory") {
        me.once("resume", go)
        return
      }

      var ev = events[e ++]
      if (!ev) {
        return me._read()
      }
      me.emit(ev, props)
      go()
    })()
  }
}

Reader.prototype.pipe = function (dest, opts) {
  var me = this
  if (typeof dest.add === "function") {
    // piping to a multi-compatible, and we've got directory entries.
    me.on("entry", function (entry) {
      var ret = dest.add(entry)
      if (false === ret) {
        me.pause()
      }
    })
  }

  // console.error("R Pipe apply Stream Pipe")
  return Stream.prototype.pipe.apply(this, arguments)
}

Reader.prototype.pause = function (who) {
  this._paused = true
  who = who || this
  this.emit("pause", who)
  if (this._stream) this._stream.pause(who)
}

Reader.prototype.resume = function (who) {
  this._paused = false
  who = who || this
  this.emit("resume", who)
  if (this._stream) this._stream.resume(who)
  this._read()
}

Reader.prototype._read = function () {
  this.error("Cannot read unknown type: "+this.type)
}



/***/ }),

/***/ 12:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// Just get the stats, and then don't do anything.
// You can't really "read" from a socket.  You "connect" to it.
// Mostly, this is here so that reading a dir with a socket in it
// doesn't blow up.

module.exports = SocketReader

var fs = __webpack_require__(5602)
  , fstream = __webpack_require__(8052)
  , inherits = __webpack_require__(4378)
  , mkdir = __webpack_require__(1890)
  , Reader = __webpack_require__(7937)

inherits(SocketReader, Reader)

function SocketReader (props) {
  var me = this
  if (!(me instanceof SocketReader)) throw new Error(
    "SocketReader must be called as constructor.")

  if (!(props.type === "Socket" && props.Socket)) {
    throw new Error("Non-socket type "+ props.type)
  }

  Reader.call(me, props)
}

SocketReader.prototype._read = function () {
  var me = this
  if (me._paused) return
  // basically just a no-op, since we got all the info we have
  // from the _stat method
  if (!me._ended) {
    me.emit("end")
    me.emit("close")
    me._ended = true
  }
}


/***/ }),

/***/ 608:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


module.exports = Writer

var fs = __webpack_require__(5602)
  , inherits = __webpack_require__(4378)
  , rimraf = __webpack_require__(984)
  , mkdir = __webpack_require__(1890)
  , path = __webpack_require__(1017)
  , umask = process.platform === "win32" ? 0 : process.umask()
  , getType = __webpack_require__(2152)
  , Abstract = __webpack_require__(5348)

// Must do this *before* loading the child classes
inherits(Writer, Abstract)

Writer.dirmode = 0777 & (~umask)
Writer.filemode = 0666 & (~umask)

var DirWriter = __webpack_require__(6969)
  , LinkWriter = __webpack_require__(3423)
  , FileWriter = __webpack_require__(3589)
  , ProxyWriter = __webpack_require__(4955)

// props is the desired state.  current is optionally the current stat,
// provided here so that subclasses can avoid statting the target
// more than necessary.
function Writer (props, current) {
  var me = this

  if (typeof props === "string") {
    props = { path: props }
  }

  if (!props.path) me.error("Must provide a path", null, true)

  // polymorphism.
  // call fstream.Writer(dir) to get a DirWriter object, etc.
  var type = getType(props)
    , ClassType = Writer

  switch (type) {
    case "Directory":
      ClassType = DirWriter
      break
    case "File":
      ClassType = FileWriter
      break
    case "Link":
    case "SymbolicLink":
      ClassType = LinkWriter
      break
    case null:
      // Don't know yet what type to create, so we wrap in a proxy.
      ClassType = ProxyWriter
      break
  }

  if (!(me instanceof ClassType)) return new ClassType(props)

  // now get down to business.

  Abstract.call(me)

  // props is what we want to set.
  // set some convenience properties as well.
  me.type = props.type
  me.props = props
  me.depth = props.depth || 0
  me.clobber = false === props.clobber ? props.clobber : true
  me.parent = props.parent || null
  me.root = props.root || (props.parent && props.parent.root) || me

  me._path = me.path = path.resolve(props.path)
  if (process.platform === "win32") {
    me.path = me._path = me.path.replace(/\?/g, "_")
    if (me._path.length >= 260) {
      me._swallowErrors = true
      me._path = "\\\\?\\" + me.path.replace(/\//g, "\\")
    }
  }
  me.basename = path.basename(props.path)
  me.dirname = path.dirname(props.path)
  me.linkpath = props.linkpath || null

  props.parent = props.root = null

  // console.error("\n\n\n%s setting size to", props.path, props.size)
  me.size = props.size

  if (typeof props.mode === "string") {
    props.mode = parseInt(props.mode, 8)
  }

  me.readable = false
  me.writable = true

  // buffer until ready, or while handling another entry
  me._buffer = []
  me.ready = false

  me.filter = typeof props.filter === "function" ? props.filter: null

  // start the ball rolling.
  // this checks what's there already, and then calls
  // me._create() to call the impl-specific creation stuff.
  me._stat(current)
}

// Calling this means that it's something we can't create.
// Just assert that it's already there, otherwise raise a warning.
Writer.prototype._create = function () {
  var me = this
  fs[me.props.follow ? "stat" : "lstat"](me._path, function (er, current) {
    if (er) {
      return me.warn("Cannot create " + me._path + "\n" +
                     "Unsupported type: "+me.type, "ENOTSUP")
    }
    me._finish()
  })
}

Writer.prototype._stat = function (current) {
  var me = this
    , props = me.props
    , stat = props.follow ? "stat" : "lstat"
    , who = me._proxy || me

  if (current) statCb(null, current)
  else fs[stat](me._path, statCb)

  function statCb (er, current) {
    if (me.filter && !me.filter.call(who, who, current)) {
      me._aborted = true
      me.emit("end")
      me.emit("close")
      return
    }

    // if it's not there, great.  We'll just create it.
    // if it is there, then we'll need to change whatever differs
    if (er || !current) {
      return create(me)
    }

    me._old = current
    var currentType = getType(current)

    // if it's a type change, then we need to clobber or error.
    // if it's not a type change, then let the impl take care of it.
    if (currentType !== me.type) {
      return rimraf(me._path, function (er) {
        if (er) return me.error(er)
        me._old = null
        create(me)
      })
    }

    // otherwise, just handle in the app-specific way
    // this creates a fs.WriteStream, or mkdir's, or whatever
    create(me)
  }
}

function create (me) {
  // console.error("W create", me._path, Writer.dirmode)

  // XXX Need to clobber non-dirs that are in the way,
  // unless { clobber: false } in the props.
  mkdir(path.dirname(me._path), Writer.dirmode, function (er, made) {
    // console.error("W created", path.dirname(me._path), er)
    if (er) return me.error(er)

    // later on, we have to set the mode and owner for these
    me._madeDir = made
    return me._create()
  })
}

function endChmod (me, want, current, path, cb) {
    var wantMode = want.mode
      , chmod = want.follow || me.type !== "SymbolicLink"
              ? "chmod" : "lchmod"

  if (!fs[chmod]) return cb()
  if (typeof wantMode !== "number") return cb()

  var curMode = current.mode & 0777
  wantMode = wantMode & 0777
  if (wantMode === curMode) return cb()

  fs[chmod](path, wantMode, cb)
}


function endChown (me, want, current, path, cb) {
  // Don't even try it unless root.  Too easy to EPERM.
  if (process.platform === "win32") return cb()
  if (!process.getuid || !process.getuid() === 0) return cb()
  if (typeof want.uid !== "number" &&
      typeof want.gid !== "number" ) return cb()

  if (current.uid === want.uid &&
      current.gid === want.gid) return cb()

  var chown = (me.props.follow || me.type !== "SymbolicLink")
            ? "chown" : "lchown"
  if (!fs[chown]) return cb()

  if (typeof want.uid !== "number") want.uid = current.uid
  if (typeof want.gid !== "number") want.gid = current.gid

  fs[chown](path, want.uid, want.gid, cb)
}

function endUtimes (me, want, current, path, cb) {
  if (!fs.utimes || process.platform === "win32") return cb()

  var utimes = (want.follow || me.type !== "SymbolicLink")
             ? "utimes" : "lutimes"

  if (utimes === "lutimes" && !fs[utimes]) {
    utimes = "utimes"
  }

  if (!fs[utimes]) return cb()

  var curA = current.atime
    , curM = current.mtime
    , meA = want.atime
    , meM = want.mtime

  if (meA === undefined) meA = curA
  if (meM === undefined) meM = curM

  if (!isDate(meA)) meA = new Date(meA)
  if (!isDate(meM)) meA = new Date(meM)

  if (meA.getTime() === curA.getTime() &&
      meM.getTime() === curM.getTime()) return cb()

  fs[utimes](path, meA, meM, cb)
}


// XXX This function is beastly.  Break it up!
Writer.prototype._finish = function () {
  var me = this

  // console.error(" W Finish", me._path, me.size)

  // set up all the things.
  // At this point, we're already done writing whatever we've gotta write,
  // adding files to the dir, etc.
  var todo = 0
  var errState = null
  var done = false

  if (me._old) {
    // the times will almost *certainly* have changed.
    // adds the utimes syscall, but remove another stat.
    me._old.atime = new Date(0)
    me._old.mtime = new Date(0)
    // console.error(" W Finish Stale Stat", me._path, me.size)
    setProps(me._old)
  } else {
    var stat = me.props.follow ? "stat" : "lstat"
    // console.error(" W Finish Stating", me._path, me.size)
    fs[stat](me._path, function (er, current) {
      // console.error(" W Finish Stated", me._path, me.size, current)
      if (er) {
        // if we're in the process of writing out a
        // directory, it's very possible that the thing we're linking to
        // doesn't exist yet (especially if it was intended as a symlink),
        // so swallow ENOENT errors here and just soldier on.
        if (er.code === "ENOENT" &&
            (me.type === "Link" || me.type === "SymbolicLink") &&
            process.platform === "win32") {
          me.ready = true
          me.emit("ready")
          me.emit("end")
          me.emit("close")
          me.end = me._finish = function () {}
          return
        } else return me.error(er)
      }
      setProps(me._old = current)
    })
  }

  return

  function setProps (current) {
    todo += 3
    endChmod(me, me.props, current, me._path, next("chmod"))
    endChown(me, me.props, current, me._path, next("chown"))
    endUtimes(me, me.props, current, me._path, next("utimes"))
  }

  function next (what) {
    return function (er) {
      // console.error("   W Finish", what, todo)
      if (errState) return
      if (er) {
        er.fstream_finish_call = what
        return me.error(errState = er)
      }
      if (--todo > 0) return
      if (done) return
      done = true

      // we may still need to set the mode/etc. on some parent dirs
      // that were created previously.  delay end/close until then.
      if (!me._madeDir) return end()
      else endMadeDir(me, me._path, end)

      function end (er) {
        if (er) {
          er.fstream_finish_call = "setupMadeDir"
          return me.error(er)
        }
        // all the props have been set, so we're completely done.
        me.emit("end")
        me.emit("close")
      }
    }
  }
}

function endMadeDir (me, p, cb) {
  var made = me._madeDir
  // everything *between* made and path.dirname(me._path)
  // needs to be set up.  Note that this may just be one dir.
  var d = path.dirname(p)

  endMadeDir_(me, d, function (er) {
    if (er) return cb(er)
    if (d === made) {
      return cb()
    }
    endMadeDir(me, d, cb)
  })
}

function endMadeDir_ (me, p, cb) {
  var dirProps = {}
  Object.keys(me.props).forEach(function (k) {
    dirProps[k] = me.props[k]

    // only make non-readable dirs if explicitly requested.
    if (k === "mode" && me.type !== "Directory") {
      dirProps[k] = dirProps[k] | 0111
    }
  })

  var todo = 3
  , errState = null
  fs.stat(p, function (er, current) {
    if (er) return cb(errState = er)
    endChmod(me, dirProps, current, p, next)
    endChown(me, dirProps, current, p, next)
    endUtimes(me, dirProps, current, p, next)
  })

  function next (er) {
    if (errState) return
    if (er) return cb(errState = er)
    if (-- todo === 0) return cb()
  }
}

Writer.prototype.pipe = function () {
  this.error("Can't pipe from writable stream")
}

Writer.prototype.add = function () {
  this.error("Cannot add to non-Directory type")
}

Writer.prototype.write = function () {
  return true
}

function objectToString (d) {
  return Object.prototype.toString.call(d)
}

function isDate(d) {
  return typeof d === 'object' && objectToString(d) === '[object Date]';
}


/***/ }),

/***/ 556:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__(977).require('fs', ['stream'])


/***/ }),

/***/ 5602:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// Monkey-patching the fs module.
// It's ugly, but there is simply no other way to do this.
var fs = module.exports = __webpack_require__(556)

var assert = __webpack_require__(9491)

// fix up some busted stuff, mostly on windows and old nodes
__webpack_require__(1507)

var util = __webpack_require__(3837)

function noop () {}

var debug = noop
if (util.debuglog)
  debug = util.debuglog('gfs')
else if (/\bgfs\b/i.test(process.env.NODE_DEBUG || ''))
  debug = function() {
    var m = util.format.apply(util, arguments)
    m = 'GFS: ' + m.split(/\n/).join('\nGFS: ')
    console.error(m)
  }

if (/\bgfs\b/i.test(process.env.NODE_DEBUG || '')) {
  process.on('exit', function() {
    debug('fds', fds)
    debug(queue)
    assert.equal(queue.length, 0)
  })
}


var originalOpen = fs.open
fs.open = open

function open(path, flags, mode, cb) {
  if (typeof mode === "function") cb = mode, mode = null
  if (typeof cb !== "function") cb = noop
  new OpenReq(path, flags, mode, cb)
}

function OpenReq(path, flags, mode, cb) {
  this.path = path
  this.flags = flags
  this.mode = mode
  this.cb = cb
  Req.call(this)
}

util.inherits(OpenReq, Req)

OpenReq.prototype.process = function() {
  originalOpen.call(fs, this.path, this.flags, this.mode, this.done)
}

var fds = {}
OpenReq.prototype.done = function(er, fd) {
  debug('open done', er, fd)
  if (fd)
    fds['fd' + fd] = this.path
  Req.prototype.done.call(this, er, fd)
}


var originalReaddir = fs.readdir
fs.readdir = readdir

function readdir(path, cb) {
  if (typeof cb !== "function") cb = noop
  new ReaddirReq(path, cb)
}

function ReaddirReq(path, cb) {
  this.path = path
  this.cb = cb
  Req.call(this)
}

util.inherits(ReaddirReq, Req)

ReaddirReq.prototype.process = function() {
  originalReaddir.call(fs, this.path, this.done)
}

ReaddirReq.prototype.done = function(er, files) {
  if (files && files.sort)
    files = files.sort()
  Req.prototype.done.call(this, er, files)
  onclose()
}


var originalClose = fs.close
fs.close = close

function close (fd, cb) {
  debug('close', fd)
  if (typeof cb !== "function") cb = noop
  delete fds['fd' + fd]
  originalClose.call(fs, fd, function(er) {
    onclose()
    cb(er)
  })
}


var originalCloseSync = fs.closeSync
fs.closeSync = closeSync

function closeSync (fd) {
  try {
    return originalCloseSync(fd)
  } finally {
    onclose()
  }
}


// Req class
function Req () {
  // start processing
  this.done = this.done.bind(this)
  this.failures = 0
  this.process()
}

Req.prototype.done = function (er, result) {
  var tryAgain = false
  if (er) {
    var code = er.code
    var tryAgain = code === "EMFILE" || code === "ENFILE"
    if (process.platform === "win32")
      tryAgain = tryAgain || code === "OK"
  }

  if (tryAgain) {
    this.failures ++
    enqueue(this)
  } else {
    var cb = this.cb
    cb(er, result)
  }
}

var queue = []

function enqueue(req) {
  queue.push(req)
  debug('enqueue %d %s', queue.length, req.constructor.name, req)
}

function onclose() {
  var req = queue.shift()
  if (req) {
    debug('process', req.constructor.name, req)
    req.process()
  }
}


/***/ }),

/***/ 1507:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

var fs = __webpack_require__(556)
var constants = __webpack_require__(2057)

var origCwd = process.cwd
var cwd = null
process.cwd = function() {
  if (!cwd)
    cwd = origCwd.call(process)
  return cwd
}
var chdir = process.chdir
process.chdir = function(d) {
  cwd = null
  chdir.call(process, d)
}

// (re-)implement some things that are known busted or missing.

// lchmod, broken prior to 0.6.2
// back-port the fix here.
if (constants.hasOwnProperty('O_SYMLINK') &&
    process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
  fs.lchmod = function (path, mode, callback) {
    callback = callback || noop
    fs.open( path
           , constants.O_WRONLY | constants.O_SYMLINK
           , mode
           , function (err, fd) {
      if (err) {
        callback(err)
        return
      }
      // prefer to return the chmod error, if one occurs,
      // but still try to close, and report closing errors if they occur.
      fs.fchmod(fd, mode, function (err) {
        fs.close(fd, function(err2) {
          callback(err || err2)
        })
      })
    })
  }

  fs.lchmodSync = function (path, mode) {
    var fd = fs.openSync(path, constants.O_WRONLY | constants.O_SYMLINK, mode)

    // prefer to return the chmod error, if one occurs,
    // but still try to close, and report closing errors if they occur.
    var err, err2
    try {
      var ret = fs.fchmodSync(fd, mode)
    } catch (er) {
      err = er
    }
    try {
      fs.closeSync(fd)
    } catch (er) {
      err2 = er
    }
    if (err || err2) throw (err || err2)
    return ret
  }
}


// lutimes implementation, or no-op
if (!fs.lutimes) {
  if (constants.hasOwnProperty("O_SYMLINK")) {
    fs.lutimes = function (path, at, mt, cb) {
      fs.open(path, constants.O_SYMLINK, function (er, fd) {
        cb = cb || noop
        if (er) return cb(er)
        fs.futimes(fd, at, mt, function (er) {
          fs.close(fd, function (er2) {
            return cb(er || er2)
          })
        })
      })
    }

    fs.lutimesSync = function (path, at, mt) {
      var fd = fs.openSync(path, constants.O_SYMLINK)
        , err
        , err2
        , ret

      try {
        var ret = fs.futimesSync(fd, at, mt)
      } catch (er) {
        err = er
      }
      try {
        fs.closeSync(fd)
      } catch (er) {
        err2 = er
      }
      if (err || err2) throw (err || err2)
      return ret
    }

  } else if (fs.utimensat && constants.hasOwnProperty("AT_SYMLINK_NOFOLLOW")) {
    // maybe utimensat will be bound soonish?
    fs.lutimes = function (path, at, mt, cb) {
      fs.utimensat(path, at, mt, constants.AT_SYMLINK_NOFOLLOW, cb)
    }

    fs.lutimesSync = function (path, at, mt) {
      return fs.utimensatSync(path, at, mt, constants.AT_SYMLINK_NOFOLLOW)
    }

  } else {
    fs.lutimes = function (_a, _b, _c, cb) { process.nextTick(cb) }
    fs.lutimesSync = function () {}
  }
}


// https://github.com/isaacs/node-graceful-fs/issues/4
// Chown should not fail on einval or eperm if non-root.
// It should not fail on enosys ever, as this just indicates
// that a fs doesn't support the intended operation.

fs.chown = chownFix(fs.chown)
fs.fchown = chownFix(fs.fchown)
fs.lchown = chownFix(fs.lchown)

fs.chmod = chownFix(fs.chmod)
fs.fchmod = chownFix(fs.fchmod)
fs.lchmod = chownFix(fs.lchmod)

fs.chownSync = chownFixSync(fs.chownSync)
fs.fchownSync = chownFixSync(fs.fchownSync)
fs.lchownSync = chownFixSync(fs.lchownSync)

fs.chmodSync = chownFix(fs.chmodSync)
fs.fchmodSync = chownFix(fs.fchmodSync)
fs.lchmodSync = chownFix(fs.lchmodSync)

function chownFix (orig) {
  if (!orig) return orig
  return function (target, uid, gid, cb) {
    return orig.call(fs, target, uid, gid, function (er, res) {
      if (chownErOk(er)) er = null
      cb(er, res)
    })
  }
}

function chownFixSync (orig) {
  if (!orig) return orig
  return function (target, uid, gid) {
    try {
      return orig.call(fs, target, uid, gid)
    } catch (er) {
      if (!chownErOk(er)) throw er
    }
  }
}

// ENOSYS means that the fs doesn't support the op. Just ignore
// that, because it doesn't matter.
//
// if there's no getuid, or if getuid() is something other
// than 0, and the error is EINVAL or EPERM, then just ignore
// it.
//
// This specific case is a silent failure in cp, install, tar,
// and most other unix tools that manage permissions.
//
// When running as root, or if other types of errors are
// encountered, then it's strict.
function chownErOk (er) {
  if (!er)
    return true

  if (er.code === "ENOSYS")
    return true

  var nonroot = !process.getuid || process.getuid() !== 0
  if (nonroot) {
    if (er.code === "EINVAL" || er.code === "EPERM")
      return true
  }

  return false
}


// if lchmod/lchown do not exist, then make them no-ops
if (!fs.lchmod) {
  fs.lchmod = function (path, mode, cb) {
    process.nextTick(cb)
  }
  fs.lchmodSync = function () {}
}
if (!fs.lchown) {
  fs.lchown = function (path, uid, gid, cb) {
    process.nextTick(cb)
  }
  fs.lchownSync = function () {}
}



// on Windows, A/V software can lock the directory, causing this
// to fail with an EACCES or EPERM if the directory contains newly
// created files.  Try again on failure, for up to 1 second.
if (process.platform === "win32") {
  var rename_ = fs.rename
  fs.rename = function rename (from, to, cb) {
    var start = Date.now()
    rename_(from, to, function CB (er) {
      if (er
          && (er.code === "EACCES" || er.code === "EPERM")
          && Date.now() - start < 1000) {
        return rename_(from, to, CB)
      }
      if(cb) cb(er)
    })
  }
}


// if read() returns EAGAIN, then just try it again.
var read = fs.read
fs.read = function (fd, buffer, offset, length, position, callback_) {
  var callback
  if (callback_ && typeof callback_ === 'function') {
    var eagCounter = 0
    callback = function (er, _, __) {
      if (er && er.code === 'EAGAIN' && eagCounter < 10) {
        eagCounter ++
        return read.call(fs, fd, buffer, offset, length, position, callback)
      }
      callback_.apply(this, arguments)
    }
  }
  return read.call(fs, fd, buffer, offset, length, position, callback)
}

var readSync = fs.readSync
fs.readSync = function (fd, buffer, offset, length, position) {
  var eagCounter = 0
  while (true) {
    try {
      return readSync.call(fs, fd, buffer, offset, length, position)
    } catch (er) {
      if (er.code === 'EAGAIN' && eagCounter < 10) {
        eagCounter ++
        continue
      }
      throw er
    }
  }
}



/***/ }),

/***/ 6772:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

exports.setopts = setopts
exports.ownProp = ownProp
exports.makeAbs = makeAbs
exports.finish = finish
exports.mark = mark
exports.isIgnored = isIgnored
exports.childrenIgnored = childrenIgnored

function ownProp (obj, field) {
  return Object.prototype.hasOwnProperty.call(obj, field)
}

var fs = __webpack_require__(7147)
var path = __webpack_require__(1017)
var minimatch = __webpack_require__(1171)
var isAbsolute = __webpack_require__(4095)
var Minimatch = minimatch.Minimatch

function alphasort (a, b) {
  return a.localeCompare(b, 'en')
}

function setupIgnores (self, options) {
  self.ignore = options.ignore || []

  if (!Array.isArray(self.ignore))
    self.ignore = [self.ignore]

  if (self.ignore.length) {
    self.ignore = self.ignore.map(ignoreMap)
  }
}

// ignore patterns are always in dot:true mode.
function ignoreMap (pattern) {
  var gmatcher = null
  if (pattern.slice(-3) === '/**') {
    var gpattern = pattern.replace(/(\/\*\*)+$/, '')
    gmatcher = new Minimatch(gpattern, { dot: true })
  }

  return {
    matcher: new Minimatch(pattern, { dot: true }),
    gmatcher: gmatcher
  }
}

function setopts (self, pattern, options) {
  if (!options)
    options = {}

  // base-matching: just use globstar for that.
  if (options.matchBase && -1 === pattern.indexOf("/")) {
    if (options.noglobstar) {
      throw new Error("base matching requires globstar")
    }
    pattern = "**/" + pattern
  }

  self.silent = !!options.silent
  self.pattern = pattern
  self.strict = options.strict !== false
  self.realpath = !!options.realpath
  self.realpathCache = options.realpathCache || Object.create(null)
  self.follow = !!options.follow
  self.dot = !!options.dot
  self.mark = !!options.mark
  self.nodir = !!options.nodir
  if (self.nodir)
    self.mark = true
  self.sync = !!options.sync
  self.nounique = !!options.nounique
  self.nonull = !!options.nonull
  self.nosort = !!options.nosort
  self.nocase = !!options.nocase
  self.stat = !!options.stat
  self.noprocess = !!options.noprocess
  self.absolute = !!options.absolute
  self.fs = options.fs || fs

  self.maxLength = options.maxLength || Infinity
  self.cache = options.cache || Object.create(null)
  self.statCache = options.statCache || Object.create(null)
  self.symlinks = options.symlinks || Object.create(null)

  setupIgnores(self, options)

  self.changedCwd = false
  var cwd = process.cwd()
  if (!ownProp(options, "cwd"))
    self.cwd = cwd
  else {
    self.cwd = path.resolve(options.cwd)
    self.changedCwd = self.cwd !== cwd
  }

  self.root = options.root || path.resolve(self.cwd, "/")
  self.root = path.resolve(self.root)
  if (process.platform === "win32")
    self.root = self.root.replace(/\\/g, "/")

  // TODO: is an absolute `cwd` supposed to be resolved against `root`?
  // e.g. { cwd: '/test', root: __dirname } === path.join(__dirname, '/test')
  self.cwdAbs = isAbsolute(self.cwd) ? self.cwd : makeAbs(self, self.cwd)
  if (process.platform === "win32")
    self.cwdAbs = self.cwdAbs.replace(/\\/g, "/")
  self.nomount = !!options.nomount

  // disable comments and negation in Minimatch.
  // Note that they are not supported in Glob itself anyway.
  options.nonegate = true
  options.nocomment = true

  self.minimatch = new Minimatch(pattern, options)
  self.options = self.minimatch.options
}

function finish (self) {
  var nou = self.nounique
  var all = nou ? [] : Object.create(null)

  for (var i = 0, l = self.matches.length; i < l; i ++) {
    var matches = self.matches[i]
    if (!matches || Object.keys(matches).length === 0) {
      if (self.nonull) {
        // do like the shell, and spit out the literal glob
        var literal = self.minimatch.globSet[i]
        if (nou)
          all.push(literal)
        else
          all[literal] = true
      }
    } else {
      // had matches
      var m = Object.keys(matches)
      if (nou)
        all.push.apply(all, m)
      else
        m.forEach(function (m) {
          all[m] = true
        })
    }
  }

  if (!nou)
    all = Object.keys(all)

  if (!self.nosort)
    all = all.sort(alphasort)

  // at *some* point we statted all of these
  if (self.mark) {
    for (var i = 0; i < all.length; i++) {
      all[i] = self._mark(all[i])
    }
    if (self.nodir) {
      all = all.filter(function (e) {
        var notDir = !(/\/$/.test(e))
        var c = self.cache[e] || self.cache[makeAbs(self, e)]
        if (notDir && c)
          notDir = c !== 'DIR' && !Array.isArray(c)
        return notDir
      })
    }
  }

  if (self.ignore.length)
    all = all.filter(function(m) {
      return !isIgnored(self, m)
    })

  self.found = all
}

function mark (self, p) {
  var abs = makeAbs(self, p)
  var c = self.cache[abs]
  var m = p
  if (c) {
    var isDir = c === 'DIR' || Array.isArray(c)
    var slash = p.slice(-1) === '/'

    if (isDir && !slash)
      m += '/'
    else if (!isDir && slash)
      m = m.slice(0, -1)

    if (m !== p) {
      var mabs = makeAbs(self, m)
      self.statCache[mabs] = self.statCache[abs]
      self.cache[mabs] = self.cache[abs]
    }
  }

  return m
}

// lotta situps...
function makeAbs (self, f) {
  var abs = f
  if (f.charAt(0) === '/') {
    abs = path.join(self.root, f)
  } else if (isAbsolute(f) || f === '') {
    abs = f
  } else if (self.changedCwd) {
    abs = path.resolve(self.cwd, f)
  } else {
    abs = path.resolve(f)
  }

  if (process.platform === 'win32')
    abs = abs.replace(/\\/g, '/')

  return abs
}


// Return true, if pattern ends with globstar '**', for the accompanying parent directory.
// Ex:- If node_modules/** is the pattern, add 'node_modules' to ignore list along with it's contents
function isIgnored (self, path) {
  if (!self.ignore.length)
    return false

  return self.ignore.some(function(item) {
    return item.matcher.match(path) || !!(item.gmatcher && item.gmatcher.match(path))
  })
}

function childrenIgnored (self, path) {
  if (!self.ignore.length)
    return false

  return self.ignore.some(function(item) {
    return !!(item.gmatcher && item.gmatcher.match(path))
  })
}


/***/ }),

/***/ 2884:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// Approach:
//
// 1. Get the minimatch set
// 2. For each pattern in the set, PROCESS(pattern, false)
// 3. Store matches per-set, then uniq them
//
// PROCESS(pattern, inGlobStar)
// Get the first [n] items from pattern that are all strings
// Join these together.  This is PREFIX.
//   If there is no more remaining, then stat(PREFIX) and
//   add to matches if it succeeds.  END.
//
// If inGlobStar and PREFIX is symlink and points to dir
//   set ENTRIES = []
// else readdir(PREFIX) as ENTRIES
//   If fail, END
//
// with ENTRIES
//   If pattern[n] is GLOBSTAR
//     // handle the case where the globstar match is empty
//     // by pruning it out, and testing the resulting pattern
//     PROCESS(pattern[0..n] + pattern[n+1 .. $], false)
//     // handle other cases.
//     for ENTRY in ENTRIES (not dotfiles)
//       // attach globstar + tail onto the entry
//       // Mark that this entry is a globstar match
//       PROCESS(pattern[0..n] + ENTRY + pattern[n .. $], true)
//
//   else // not globstar
//     for ENTRY in ENTRIES (not dotfiles, unless pattern[n] is dot)
//       Test ENTRY against pattern[n]
//       If fails, continue
//       If passes, PROCESS(pattern[0..n] + item + pattern[n+1 .. $])
//
// Caveat:
//   Cache all stats and readdirs results to minimize syscall.  Since all
//   we ever care about is existence and directory-ness, we can just keep
//   `true` for files, and [children,...] for directories, or `false` for
//   things that don't exist.

module.exports = glob

var rp = __webpack_require__(7334)
var minimatch = __webpack_require__(1171)
var Minimatch = minimatch.Minimatch
var inherits = __webpack_require__(4378)
var EE = __webpack_require__(2361).EventEmitter
var path = __webpack_require__(1017)
var assert = __webpack_require__(9491)
var isAbsolute = __webpack_require__(4095)
var globSync = __webpack_require__(4751)
var common = __webpack_require__(6772)
var setopts = common.setopts
var ownProp = common.ownProp
var inflight = __webpack_require__(7844)
var util = __webpack_require__(3837)
var childrenIgnored = common.childrenIgnored
var isIgnored = common.isIgnored

var once = __webpack_require__(778)

function glob (pattern, options, cb) {
  if (typeof options === 'function') cb = options, options = {}
  if (!options) options = {}

  if (options.sync) {
    if (cb)
      throw new TypeError('callback provided to sync glob')
    return globSync(pattern, options)
  }

  return new Glob(pattern, options, cb)
}

glob.sync = globSync
var GlobSync = glob.GlobSync = globSync.GlobSync

// old api surface
glob.glob = glob

function extend (origin, add) {
  if (add === null || typeof add !== 'object') {
    return origin
  }

  var keys = Object.keys(add)
  var i = keys.length
  while (i--) {
    origin[keys[i]] = add[keys[i]]
  }
  return origin
}

glob.hasMagic = function (pattern, options_) {
  var options = extend({}, options_)
  options.noprocess = true

  var g = new Glob(pattern, options)
  var set = g.minimatch.set

  if (!pattern)
    return false

  if (set.length > 1)
    return true

  for (var j = 0; j < set[0].length; j++) {
    if (typeof set[0][j] !== 'string')
      return true
  }

  return false
}

glob.Glob = Glob
inherits(Glob, EE)
function Glob (pattern, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = null
  }

  if (options && options.sync) {
    if (cb)
      throw new TypeError('callback provided to sync glob')
    return new GlobSync(pattern, options)
  }

  if (!(this instanceof Glob))
    return new Glob(pattern, options, cb)

  setopts(this, pattern, options)
  this._didRealPath = false

  // process each pattern in the minimatch set
  var n = this.minimatch.set.length

  // The matches are stored as {<filename>: true,...} so that
  // duplicates are automagically pruned.
  // Later, we do an Object.keys() on these.
  // Keep them as a list so we can fill in when nonull is set.
  this.matches = new Array(n)

  if (typeof cb === 'function') {
    cb = once(cb)
    this.on('error', cb)
    this.on('end', function (matches) {
      cb(null, matches)
    })
  }

  var self = this
  this._processing = 0

  this._emitQueue = []
  this._processQueue = []
  this.paused = false

  if (this.noprocess)
    return this

  if (n === 0)
    return done()

  var sync = true
  for (var i = 0; i < n; i ++) {
    this._process(this.minimatch.set[i], i, false, done)
  }
  sync = false

  function done () {
    --self._processing
    if (self._processing <= 0) {
      if (sync) {
        process.nextTick(function () {
          self._finish()
        })
      } else {
        self._finish()
      }
    }
  }
}

Glob.prototype._finish = function () {
  assert(this instanceof Glob)
  if (this.aborted)
    return

  if (this.realpath && !this._didRealpath)
    return this._realpath()

  common.finish(this)
  this.emit('end', this.found)
}

Glob.prototype._realpath = function () {
  if (this._didRealpath)
    return

  this._didRealpath = true

  var n = this.matches.length
  if (n === 0)
    return this._finish()

  var self = this
  for (var i = 0; i < this.matches.length; i++)
    this._realpathSet(i, next)

  function next () {
    if (--n === 0)
      self._finish()
  }
}

Glob.prototype._realpathSet = function (index, cb) {
  var matchset = this.matches[index]
  if (!matchset)
    return cb()

  var found = Object.keys(matchset)
  var self = this
  var n = found.length

  if (n === 0)
    return cb()

  var set = this.matches[index] = Object.create(null)
  found.forEach(function (p, i) {
    // If there's a problem with the stat, then it means that
    // one or more of the links in the realpath couldn't be
    // resolved.  just return the abs value in that case.
    p = self._makeAbs(p)
    rp.realpath(p, self.realpathCache, function (er, real) {
      if (!er)
        set[real] = true
      else if (er.syscall === 'stat')
        set[p] = true
      else
        self.emit('error', er) // srsly wtf right here

      if (--n === 0) {
        self.matches[index] = set
        cb()
      }
    })
  })
}

Glob.prototype._mark = function (p) {
  return common.mark(this, p)
}

Glob.prototype._makeAbs = function (f) {
  return common.makeAbs(this, f)
}

Glob.prototype.abort = function () {
  this.aborted = true
  this.emit('abort')
}

Glob.prototype.pause = function () {
  if (!this.paused) {
    this.paused = true
    this.emit('pause')
  }
}

Glob.prototype.resume = function () {
  if (this.paused) {
    this.emit('resume')
    this.paused = false
    if (this._emitQueue.length) {
      var eq = this._emitQueue.slice(0)
      this._emitQueue.length = 0
      for (var i = 0; i < eq.length; i ++) {
        var e = eq[i]
        this._emitMatch(e[0], e[1])
      }
    }
    if (this._processQueue.length) {
      var pq = this._processQueue.slice(0)
      this._processQueue.length = 0
      for (var i = 0; i < pq.length; i ++) {
        var p = pq[i]
        this._processing--
        this._process(p[0], p[1], p[2], p[3])
      }
    }
  }
}

Glob.prototype._process = function (pattern, index, inGlobStar, cb) {
  assert(this instanceof Glob)
  assert(typeof cb === 'function')

  if (this.aborted)
    return

  this._processing++
  if (this.paused) {
    this._processQueue.push([pattern, index, inGlobStar, cb])
    return
  }

  //console.error('PROCESS %d', this._processing, pattern)

  // Get the first [n] parts of pattern that are all strings.
  var n = 0
  while (typeof pattern[n] === 'string') {
    n ++
  }
  // now n is the index of the first one that is *not* a string.

  // see if there's anything else
  var prefix
  switch (n) {
    // if not, then this is rather simple
    case pattern.length:
      this._processSimple(pattern.join('/'), index, cb)
      return

    case 0:
      // pattern *starts* with some non-trivial item.
      // going to readdir(cwd), but not include the prefix in matches.
      prefix = null
      break

    default:
      // pattern has some string bits in the front.
      // whatever it starts with, whether that's 'absolute' like /foo/bar,
      // or 'relative' like '../baz'
      prefix = pattern.slice(0, n).join('/')
      break
  }

  var remain = pattern.slice(n)

  // get the list of entries.
  var read
  if (prefix === null)
    read = '.'
  else if (isAbsolute(prefix) || isAbsolute(pattern.join('/'))) {
    if (!prefix || !isAbsolute(prefix))
      prefix = '/' + prefix
    read = prefix
  } else
    read = prefix

  var abs = this._makeAbs(read)

  //if ignored, skip _processing
  if (childrenIgnored(this, read))
    return cb()

  var isGlobStar = remain[0] === minimatch.GLOBSTAR
  if (isGlobStar)
    this._processGlobStar(prefix, read, abs, remain, index, inGlobStar, cb)
  else
    this._processReaddir(prefix, read, abs, remain, index, inGlobStar, cb)
}

Glob.prototype._processReaddir = function (prefix, read, abs, remain, index, inGlobStar, cb) {
  var self = this
  this._readdir(abs, inGlobStar, function (er, entries) {
    return self._processReaddir2(prefix, read, abs, remain, index, inGlobStar, entries, cb)
  })
}

Glob.prototype._processReaddir2 = function (prefix, read, abs, remain, index, inGlobStar, entries, cb) {

  // if the abs isn't a dir, then nothing can match!
  if (!entries)
    return cb()

  // It will only match dot entries if it starts with a dot, or if
  // dot is set.  Stuff like @(.foo|.bar) isn't allowed.
  var pn = remain[0]
  var negate = !!this.minimatch.negate
  var rawGlob = pn._glob
  var dotOk = this.dot || rawGlob.charAt(0) === '.'

  var matchedEntries = []
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    if (e.charAt(0) !== '.' || dotOk) {
      var m
      if (negate && !prefix) {
        m = !e.match(pn)
      } else {
        m = e.match(pn)
      }
      if (m)
        matchedEntries.push(e)
    }
  }

  //console.error('prd2', prefix, entries, remain[0]._glob, matchedEntries)

  var len = matchedEntries.length
  // If there are no matched entries, then nothing matches.
  if (len === 0)
    return cb()

  // if this is the last remaining pattern bit, then no need for
  // an additional stat *unless* the user has specified mark or
  // stat explicitly.  We know they exist, since readdir returned
  // them.

  if (remain.length === 1 && !this.mark && !this.stat) {
    if (!this.matches[index])
      this.matches[index] = Object.create(null)

    for (var i = 0; i < len; i ++) {
      var e = matchedEntries[i]
      if (prefix) {
        if (prefix !== '/')
          e = prefix + '/' + e
        else
          e = prefix + e
      }

      if (e.charAt(0) === '/' && !this.nomount) {
        e = path.join(this.root, e)
      }
      this._emitMatch(index, e)
    }
    // This was the last one, and no stats were needed
    return cb()
  }

  // now test all matched entries as stand-ins for that part
  // of the pattern.
  remain.shift()
  for (var i = 0; i < len; i ++) {
    var e = matchedEntries[i]
    var newPattern
    if (prefix) {
      if (prefix !== '/')
        e = prefix + '/' + e
      else
        e = prefix + e
    }
    this._process([e].concat(remain), index, inGlobStar, cb)
  }
  cb()
}

Glob.prototype._emitMatch = function (index, e) {
  if (this.aborted)
    return

  if (isIgnored(this, e))
    return

  if (this.paused) {
    this._emitQueue.push([index, e])
    return
  }

  var abs = isAbsolute(e) ? e : this._makeAbs(e)

  if (this.mark)
    e = this._mark(e)

  if (this.absolute)
    e = abs

  if (this.matches[index][e])
    return

  if (this.nodir) {
    var c = this.cache[abs]
    if (c === 'DIR' || Array.isArray(c))
      return
  }

  this.matches[index][e] = true

  var st = this.statCache[abs]
  if (st)
    this.emit('stat', e, st)

  this.emit('match', e)
}

Glob.prototype._readdirInGlobStar = function (abs, cb) {
  if (this.aborted)
    return

  // follow all symlinked directories forever
  // just proceed as if this is a non-globstar situation
  if (this.follow)
    return this._readdir(abs, false, cb)

  var lstatkey = 'lstat\0' + abs
  var self = this
  var lstatcb = inflight(lstatkey, lstatcb_)

  if (lstatcb)
    self.fs.lstat(abs, lstatcb)

  function lstatcb_ (er, lstat) {
    if (er && er.code === 'ENOENT')
      return cb()

    var isSym = lstat && lstat.isSymbolicLink()
    self.symlinks[abs] = isSym

    // If it's not a symlink or a dir, then it's definitely a regular file.
    // don't bother doing a readdir in that case.
    if (!isSym && lstat && !lstat.isDirectory()) {
      self.cache[abs] = 'FILE'
      cb()
    } else
      self._readdir(abs, false, cb)
  }
}

Glob.prototype._readdir = function (abs, inGlobStar, cb) {
  if (this.aborted)
    return

  cb = inflight('readdir\0'+abs+'\0'+inGlobStar, cb)
  if (!cb)
    return

  //console.error('RD %j %j', +inGlobStar, abs)
  if (inGlobStar && !ownProp(this.symlinks, abs))
    return this._readdirInGlobStar(abs, cb)

  if (ownProp(this.cache, abs)) {
    var c = this.cache[abs]
    if (!c || c === 'FILE')
      return cb()

    if (Array.isArray(c))
      return cb(null, c)
  }

  var self = this
  self.fs.readdir(abs, readdirCb(this, abs, cb))
}

function readdirCb (self, abs, cb) {
  return function (er, entries) {
    if (er)
      self._readdirError(abs, er, cb)
    else
      self._readdirEntries(abs, entries, cb)
  }
}

Glob.prototype._readdirEntries = function (abs, entries, cb) {
  if (this.aborted)
    return

  // if we haven't asked to stat everything, then just
  // assume that everything in there exists, so we can avoid
  // having to stat it a second time.
  if (!this.mark && !this.stat) {
    for (var i = 0; i < entries.length; i ++) {
      var e = entries[i]
      if (abs === '/')
        e = abs + e
      else
        e = abs + '/' + e
      this.cache[e] = true
    }
  }

  this.cache[abs] = entries
  return cb(null, entries)
}

Glob.prototype._readdirError = function (f, er, cb) {
  if (this.aborted)
    return

  // handle errors, and cache the information
  switch (er.code) {
    case 'ENOTSUP': // https://github.com/isaacs/node-glob/issues/205
    case 'ENOTDIR': // totally normal. means it *does* exist.
      var abs = this._makeAbs(f)
      this.cache[abs] = 'FILE'
      if (abs === this.cwdAbs) {
        var error = new Error(er.code + ' invalid cwd ' + this.cwd)
        error.path = this.cwd
        error.code = er.code
        this.emit('error', error)
        this.abort()
      }
      break

    case 'ENOENT': // not terribly unusual
    case 'ELOOP':
    case 'ENAMETOOLONG':
    case 'UNKNOWN':
      this.cache[this._makeAbs(f)] = false
      break

    default: // some unusual error.  Treat as failure.
      this.cache[this._makeAbs(f)] = false
      if (this.strict) {
        this.emit('error', er)
        // If the error is handled, then we abort
        // if not, we threw out of here
        this.abort()
      }
      if (!this.silent)
        console.error('glob error', er)
      break
  }

  return cb()
}

Glob.prototype._processGlobStar = function (prefix, read, abs, remain, index, inGlobStar, cb) {
  var self = this
  this._readdir(abs, inGlobStar, function (er, entries) {
    self._processGlobStar2(prefix, read, abs, remain, index, inGlobStar, entries, cb)
  })
}


Glob.prototype._processGlobStar2 = function (prefix, read, abs, remain, index, inGlobStar, entries, cb) {
  //console.error('pgs2', prefix, remain[0], entries)

  // no entries means not a dir, so it can never have matches
  // foo.txt/** doesn't match foo.txt
  if (!entries)
    return cb()

  // test without the globstar, and with every child both below
  // and replacing the globstar.
  var remainWithoutGlobStar = remain.slice(1)
  var gspref = prefix ? [ prefix ] : []
  var noGlobStar = gspref.concat(remainWithoutGlobStar)

  // the noGlobStar pattern exits the inGlobStar state
  this._process(noGlobStar, index, false, cb)

  var isSym = this.symlinks[abs]
  var len = entries.length

  // If it's a symlink, and we're in a globstar, then stop
  if (isSym && inGlobStar)
    return cb()

  for (var i = 0; i < len; i++) {
    var e = entries[i]
    if (e.charAt(0) === '.' && !this.dot)
      continue

    // these two cases enter the inGlobStar state
    var instead = gspref.concat(entries[i], remainWithoutGlobStar)
    this._process(instead, index, true, cb)

    var below = gspref.concat(entries[i], remain)
    this._process(below, index, true, cb)
  }

  cb()
}

Glob.prototype._processSimple = function (prefix, index, cb) {
  // XXX review this.  Shouldn't it be doing the mounting etc
  // before doing stat?  kinda weird?
  var self = this
  this._stat(prefix, function (er, exists) {
    self._processSimple2(prefix, index, er, exists, cb)
  })
}
Glob.prototype._processSimple2 = function (prefix, index, er, exists, cb) {

  //console.error('ps2', prefix, exists)

  if (!this.matches[index])
    this.matches[index] = Object.create(null)

  // If it doesn't exist, then just mark the lack of results
  if (!exists)
    return cb()

  if (prefix && isAbsolute(prefix) && !this.nomount) {
    var trail = /[\/\\]$/.test(prefix)
    if (prefix.charAt(0) === '/') {
      prefix = path.join(this.root, prefix)
    } else {
      prefix = path.resolve(this.root, prefix)
      if (trail)
        prefix += '/'
    }
  }

  if (process.platform === 'win32')
    prefix = prefix.replace(/\\/g, '/')

  // Mark this as a match
  this._emitMatch(index, prefix)
  cb()
}

// Returns either 'DIR', 'FILE', or false
Glob.prototype._stat = function (f, cb) {
  var abs = this._makeAbs(f)
  var needDir = f.slice(-1) === '/'

  if (f.length > this.maxLength)
    return cb()

  if (!this.stat && ownProp(this.cache, abs)) {
    var c = this.cache[abs]

    if (Array.isArray(c))
      c = 'DIR'

    // It exists, but maybe not how we need it
    if (!needDir || c === 'DIR')
      return cb(null, c)

    if (needDir && c === 'FILE')
      return cb()

    // otherwise we have to stat, because maybe c=true
    // if we know it exists, but not what it is.
  }

  var exists
  var stat = this.statCache[abs]
  if (stat !== undefined) {
    if (stat === false)
      return cb(null, stat)
    else {
      var type = stat.isDirectory() ? 'DIR' : 'FILE'
      if (needDir && type === 'FILE')
        return cb()
      else
        return cb(null, type, stat)
    }
  }

  var self = this
  var statcb = inflight('stat\0' + abs, lstatcb_)
  if (statcb)
    self.fs.lstat(abs, statcb)

  function lstatcb_ (er, lstat) {
    if (lstat && lstat.isSymbolicLink()) {
      // If it's a symlink, then treat it as the target, unless
      // the target does not exist, then treat it as a file.
      return self.fs.stat(abs, function (er, stat) {
        if (er)
          self._stat2(f, abs, null, lstat, cb)
        else
          self._stat2(f, abs, er, stat, cb)
      })
    } else {
      self._stat2(f, abs, er, lstat, cb)
    }
  }
}

Glob.prototype._stat2 = function (f, abs, er, stat, cb) {
  if (er && (er.code === 'ENOENT' || er.code === 'ENOTDIR')) {
    this.statCache[abs] = false
    return cb()
  }

  var needDir = f.slice(-1) === '/'
  this.statCache[abs] = stat

  if (abs.slice(-1) === '/' && stat && !stat.isDirectory())
    return cb(null, false, stat)

  var c = true
  if (stat)
    c = stat.isDirectory() ? 'DIR' : 'FILE'
  this.cache[abs] = this.cache[abs] || c

  if (needDir && c === 'FILE')
    return cb()

  return cb(null, c, stat)
}


/***/ }),

/***/ 4751:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = globSync
globSync.GlobSync = GlobSync

var rp = __webpack_require__(7334)
var minimatch = __webpack_require__(1171)
var Minimatch = minimatch.Minimatch
var Glob = __webpack_require__(2884).Glob
var util = __webpack_require__(3837)
var path = __webpack_require__(1017)
var assert = __webpack_require__(9491)
var isAbsolute = __webpack_require__(4095)
var common = __webpack_require__(6772)
var setopts = common.setopts
var ownProp = common.ownProp
var childrenIgnored = common.childrenIgnored
var isIgnored = common.isIgnored

function globSync (pattern, options) {
  if (typeof options === 'function' || arguments.length === 3)
    throw new TypeError('callback provided to sync glob\n'+
                        'See: https://github.com/isaacs/node-glob/issues/167')

  return new GlobSync(pattern, options).found
}

function GlobSync (pattern, options) {
  if (!pattern)
    throw new Error('must provide pattern')

  if (typeof options === 'function' || arguments.length === 3)
    throw new TypeError('callback provided to sync glob\n'+
                        'See: https://github.com/isaacs/node-glob/issues/167')

  if (!(this instanceof GlobSync))
    return new GlobSync(pattern, options)

  setopts(this, pattern, options)

  if (this.noprocess)
    return this

  var n = this.minimatch.set.length
  this.matches = new Array(n)
  for (var i = 0; i < n; i ++) {
    this._process(this.minimatch.set[i], i, false)
  }
  this._finish()
}

GlobSync.prototype._finish = function () {
  assert(this instanceof GlobSync)
  if (this.realpath) {
    var self = this
    this.matches.forEach(function (matchset, index) {
      var set = self.matches[index] = Object.create(null)
      for (var p in matchset) {
        try {
          p = self._makeAbs(p)
          var real = rp.realpathSync(p, self.realpathCache)
          set[real] = true
        } catch (er) {
          if (er.syscall === 'stat')
            set[self._makeAbs(p)] = true
          else
            throw er
        }
      }
    })
  }
  common.finish(this)
}


GlobSync.prototype._process = function (pattern, index, inGlobStar) {
  assert(this instanceof GlobSync)

  // Get the first [n] parts of pattern that are all strings.
  var n = 0
  while (typeof pattern[n] === 'string') {
    n ++
  }
  // now n is the index of the first one that is *not* a string.

  // See if there's anything else
  var prefix
  switch (n) {
    // if not, then this is rather simple
    case pattern.length:
      this._processSimple(pattern.join('/'), index)
      return

    case 0:
      // pattern *starts* with some non-trivial item.
      // going to readdir(cwd), but not include the prefix in matches.
      prefix = null
      break

    default:
      // pattern has some string bits in the front.
      // whatever it starts with, whether that's 'absolute' like /foo/bar,
      // or 'relative' like '../baz'
      prefix = pattern.slice(0, n).join('/')
      break
  }

  var remain = pattern.slice(n)

  // get the list of entries.
  var read
  if (prefix === null)
    read = '.'
  else if (isAbsolute(prefix) || isAbsolute(pattern.join('/'))) {
    if (!prefix || !isAbsolute(prefix))
      prefix = '/' + prefix
    read = prefix
  } else
    read = prefix

  var abs = this._makeAbs(read)

  //if ignored, skip processing
  if (childrenIgnored(this, read))
    return

  var isGlobStar = remain[0] === minimatch.GLOBSTAR
  if (isGlobStar)
    this._processGlobStar(prefix, read, abs, remain, index, inGlobStar)
  else
    this._processReaddir(prefix, read, abs, remain, index, inGlobStar)
}


GlobSync.prototype._processReaddir = function (prefix, read, abs, remain, index, inGlobStar) {
  var entries = this._readdir(abs, inGlobStar)

  // if the abs isn't a dir, then nothing can match!
  if (!entries)
    return

  // It will only match dot entries if it starts with a dot, or if
  // dot is set.  Stuff like @(.foo|.bar) isn't allowed.
  var pn = remain[0]
  var negate = !!this.minimatch.negate
  var rawGlob = pn._glob
  var dotOk = this.dot || rawGlob.charAt(0) === '.'

  var matchedEntries = []
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    if (e.charAt(0) !== '.' || dotOk) {
      var m
      if (negate && !prefix) {
        m = !e.match(pn)
      } else {
        m = e.match(pn)
      }
      if (m)
        matchedEntries.push(e)
    }
  }

  var len = matchedEntries.length
  // If there are no matched entries, then nothing matches.
  if (len === 0)
    return

  // if this is the last remaining pattern bit, then no need for
  // an additional stat *unless* the user has specified mark or
  // stat explicitly.  We know they exist, since readdir returned
  // them.

  if (remain.length === 1 && !this.mark && !this.stat) {
    if (!this.matches[index])
      this.matches[index] = Object.create(null)

    for (var i = 0; i < len; i ++) {
      var e = matchedEntries[i]
      if (prefix) {
        if (prefix.slice(-1) !== '/')
          e = prefix + '/' + e
        else
          e = prefix + e
      }

      if (e.charAt(0) === '/' && !this.nomount) {
        e = path.join(this.root, e)
      }
      this._emitMatch(index, e)
    }
    // This was the last one, and no stats were needed
    return
  }

  // now test all matched entries as stand-ins for that part
  // of the pattern.
  remain.shift()
  for (var i = 0; i < len; i ++) {
    var e = matchedEntries[i]
    var newPattern
    if (prefix)
      newPattern = [prefix, e]
    else
      newPattern = [e]
    this._process(newPattern.concat(remain), index, inGlobStar)
  }
}


GlobSync.prototype._emitMatch = function (index, e) {
  if (isIgnored(this, e))
    return

  var abs = this._makeAbs(e)

  if (this.mark)
    e = this._mark(e)

  if (this.absolute) {
    e = abs
  }

  if (this.matches[index][e])
    return

  if (this.nodir) {
    var c = this.cache[abs]
    if (c === 'DIR' || Array.isArray(c))
      return
  }

  this.matches[index][e] = true

  if (this.stat)
    this._stat(e)
}


GlobSync.prototype._readdirInGlobStar = function (abs) {
  // follow all symlinked directories forever
  // just proceed as if this is a non-globstar situation
  if (this.follow)
    return this._readdir(abs, false)

  var entries
  var lstat
  var stat
  try {
    lstat = this.fs.lstatSync(abs)
  } catch (er) {
    if (er.code === 'ENOENT') {
      // lstat failed, doesn't exist
      return null
    }
  }

  var isSym = lstat && lstat.isSymbolicLink()
  this.symlinks[abs] = isSym

  // If it's not a symlink or a dir, then it's definitely a regular file.
  // don't bother doing a readdir in that case.
  if (!isSym && lstat && !lstat.isDirectory())
    this.cache[abs] = 'FILE'
  else
    entries = this._readdir(abs, false)

  return entries
}

GlobSync.prototype._readdir = function (abs, inGlobStar) {
  var entries

  if (inGlobStar && !ownProp(this.symlinks, abs))
    return this._readdirInGlobStar(abs)

  if (ownProp(this.cache, abs)) {
    var c = this.cache[abs]
    if (!c || c === 'FILE')
      return null

    if (Array.isArray(c))
      return c
  }

  try {
    return this._readdirEntries(abs, this.fs.readdirSync(abs))
  } catch (er) {
    this._readdirError(abs, er)
    return null
  }
}

GlobSync.prototype._readdirEntries = function (abs, entries) {
  // if we haven't asked to stat everything, then just
  // assume that everything in there exists, so we can avoid
  // having to stat it a second time.
  if (!this.mark && !this.stat) {
    for (var i = 0; i < entries.length; i ++) {
      var e = entries[i]
      if (abs === '/')
        e = abs + e
      else
        e = abs + '/' + e
      this.cache[e] = true
    }
  }

  this.cache[abs] = entries

  // mark and cache dir-ness
  return entries
}

GlobSync.prototype._readdirError = function (f, er) {
  // handle errors, and cache the information
  switch (er.code) {
    case 'ENOTSUP': // https://github.com/isaacs/node-glob/issues/205
    case 'ENOTDIR': // totally normal. means it *does* exist.
      var abs = this._makeAbs(f)
      this.cache[abs] = 'FILE'
      if (abs === this.cwdAbs) {
        var error = new Error(er.code + ' invalid cwd ' + this.cwd)
        error.path = this.cwd
        error.code = er.code
        throw error
      }
      break

    case 'ENOENT': // not terribly unusual
    case 'ELOOP':
    case 'ENAMETOOLONG':
    case 'UNKNOWN':
      this.cache[this._makeAbs(f)] = false
      break

    default: // some unusual error.  Treat as failure.
      this.cache[this._makeAbs(f)] = false
      if (this.strict)
        throw er
      if (!this.silent)
        console.error('glob error', er)
      break
  }
}

GlobSync.prototype._processGlobStar = function (prefix, read, abs, remain, index, inGlobStar) {

  var entries = this._readdir(abs, inGlobStar)

  // no entries means not a dir, so it can never have matches
  // foo.txt/** doesn't match foo.txt
  if (!entries)
    return

  // test without the globstar, and with every child both below
  // and replacing the globstar.
  var remainWithoutGlobStar = remain.slice(1)
  var gspref = prefix ? [ prefix ] : []
  var noGlobStar = gspref.concat(remainWithoutGlobStar)

  // the noGlobStar pattern exits the inGlobStar state
  this._process(noGlobStar, index, false)

  var len = entries.length
  var isSym = this.symlinks[abs]

  // If it's a symlink, and we're in a globstar, then stop
  if (isSym && inGlobStar)
    return

  for (var i = 0; i < len; i++) {
    var e = entries[i]
    if (e.charAt(0) === '.' && !this.dot)
      continue

    // these two cases enter the inGlobStar state
    var instead = gspref.concat(entries[i], remainWithoutGlobStar)
    this._process(instead, index, true)

    var below = gspref.concat(entries[i], remain)
    this._process(below, index, true)
  }
}

GlobSync.prototype._processSimple = function (prefix, index) {
  // XXX review this.  Shouldn't it be doing the mounting etc
  // before doing stat?  kinda weird?
  var exists = this._stat(prefix)

  if (!this.matches[index])
    this.matches[index] = Object.create(null)

  // If it doesn't exist, then just mark the lack of results
  if (!exists)
    return

  if (prefix && isAbsolute(prefix) && !this.nomount) {
    var trail = /[\/\\]$/.test(prefix)
    if (prefix.charAt(0) === '/') {
      prefix = path.join(this.root, prefix)
    } else {
      prefix = path.resolve(this.root, prefix)
      if (trail)
        prefix += '/'
    }
  }

  if (process.platform === 'win32')
    prefix = prefix.replace(/\\/g, '/')

  // Mark this as a match
  this._emitMatch(index, prefix)
}

// Returns either 'DIR', 'FILE', or false
GlobSync.prototype._stat = function (f) {
  var abs = this._makeAbs(f)
  var needDir = f.slice(-1) === '/'

  if (f.length > this.maxLength)
    return false

  if (!this.stat && ownProp(this.cache, abs)) {
    var c = this.cache[abs]

    if (Array.isArray(c))
      c = 'DIR'

    // It exists, but maybe not how we need it
    if (!needDir || c === 'DIR')
      return c

    if (needDir && c === 'FILE')
      return false

    // otherwise we have to stat, because maybe c=true
    // if we know it exists, but not what it is.
  }

  var exists
  var stat = this.statCache[abs]
  if (!stat) {
    var lstat
    try {
      lstat = this.fs.lstatSync(abs)
    } catch (er) {
      if (er && (er.code === 'ENOENT' || er.code === 'ENOTDIR')) {
        this.statCache[abs] = false
        return false
      }
    }

    if (lstat && lstat.isSymbolicLink()) {
      try {
        stat = this.fs.statSync(abs)
      } catch (er) {
        stat = lstat
      }
    } else {
      stat = lstat
    }
  }

  this.statCache[abs] = stat

  var c = true
  if (stat)
    c = stat.isDirectory() ? 'DIR' : 'FILE'

  this.cache[abs] = this.cache[abs] || c

  if (needDir && c === 'FILE')
    return false

  return c
}

GlobSync.prototype._mark = function (p) {
  return common.mark(this, p)
}

GlobSync.prototype._makeAbs = function (f) {
  return common.makeAbs(this, f)
}


/***/ }),

/***/ 7844:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var wrappy = __webpack_require__(2479)
var reqs = Object.create(null)
var once = __webpack_require__(778)

module.exports = wrappy(inflight)

function inflight (key, cb) {
  if (reqs[key]) {
    reqs[key].push(cb)
    return null
  } else {
    reqs[key] = [cb]
    return makeres(key)
  }
}

function makeres (key) {
  return once(function RES () {
    var cbs = reqs[key]
    var len = cbs.length
    var args = slice(arguments)

    // XXX It's somewhat ambiguous whether a new callback added in this
    // pass should be queued for later execution if something in the
    // list of callbacks throws, or if it should just be discarded.
    // However, it's such an edge case that it hardly matters, and either
    // choice is likely as surprising as the other.
    // As it happens, we do go ahead and schedule it for later execution.
    try {
      for (var i = 0; i < len; i++) {
        cbs[i].apply(null, args)
      }
    } finally {
      if (cbs.length > len) {
        // added more in the interim.
        // de-zalgo, just in case, but don't call again.
        cbs.splice(0, len)
        process.nextTick(function () {
          RES.apply(null, args)
        })
      } else {
        delete reqs[key]
      }
    }
  })
}

function slice (args) {
  var length = args.length
  var array = []

  for (var i = 0; i < length; i++) array[i] = args[i]
  return array
}


/***/ }),

/***/ 4378:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

try {
  var util = __webpack_require__(3837);
  /* istanbul ignore next */
  if (typeof util.inherits !== 'function') throw '';
  module.exports = util.inherits;
} catch (e) {
  /* istanbul ignore next */
  module.exports = __webpack_require__(5717);
}


/***/ }),

/***/ 5717:
/***/ ((module) => {

if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}


/***/ }),

/***/ 5826:
/***/ ((module) => {

module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};


/***/ }),

/***/ 3479:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


module.exports = Match;

var Transform = __webpack_require__(2781).Transform;
var inherits = __webpack_require__(3837).inherits;
var Buffers = __webpack_require__(5289);

if (!Transform) {
  Transform = __webpack_require__(4219);
}

inherits(Match, Transform);

function Match(opts, matchFn) {
  if (!(this instanceof Match)) {
    return new Match(opts, matchFn);
  }

  //todo - better handle opts e.g. pattern.length can't be > highWaterMark
  this._opts = opts;
  if (typeof this._opts.pattern === "string") {
    this._opts.pattern = new Buffer(this._opts.pattern);
  }
  this._matchFn = matchFn;
  this._bufs = Buffers();

  Transform.call(this);
}

Match.prototype._transform = function (chunk, encoding, callback) {
  var pattern = this._opts.pattern;
  this._bufs.push(chunk);

  var index = this._bufs.indexOf(pattern);
  if (index >= 0) {
    processMatches.call(this, index, pattern, callback);
  } else {
    var buf = this._bufs.splice(0, this._bufs.length - chunk.length);
    if (buf && buf.length > 0) {
      this._matchFn(buf.toBuffer());
    }
    callback();
  }
};

function processMatches(index, pattern, callback) {
  var buf = this._bufs.splice(0, index).toBuffer();
  if (this._opts.consume) {
    this._bufs.splice(0, pattern.length);
  }
  this._matchFn(buf, pattern, this._bufs.toBuffer());

  index = this._bufs.indexOf(pattern);
  if (index > 0 || this._opts.consume && index === 0) {
    process.nextTick(processMatches.bind(this, index, pattern, callback));
  } else {
    callback();
  }
}


/***/ }),

/***/ 1171:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = minimatch
minimatch.Minimatch = Minimatch

var path = { sep: '/' }
try {
  path = __webpack_require__(1017)
} catch (er) {}

var GLOBSTAR = minimatch.GLOBSTAR = Minimatch.GLOBSTAR = {}
var expand = __webpack_require__(3644)

var plTypes = {
  '!': { open: '(?:(?!(?:', close: '))[^/]*?)'},
  '?': { open: '(?:', close: ')?' },
  '+': { open: '(?:', close: ')+' },
  '*': { open: '(?:', close: ')*' },
  '@': { open: '(?:', close: ')' }
}

// any single thing other than /
// don't need to escape / when using new RegExp()
var qmark = '[^/]'

// * => any number of characters
var star = qmark + '*?'

// ** when dots are allowed.  Anything goes, except .. and .
// not (^ or / followed by one or two dots followed by $ or /),
// followed by anything, any number of times.
var twoStarDot = '(?:(?!(?:\\\/|^)(?:\\.{1,2})($|\\\/)).)*?'

// not a ^ or / followed by a dot,
// followed by anything, any number of times.
var twoStarNoDot = '(?:(?!(?:\\\/|^)\\.).)*?'

// characters that need to be escaped in RegExp.
var reSpecials = charSet('().*{}+?[]^$\\!')

// "abc" -> { a:true, b:true, c:true }
function charSet (s) {
  return s.split('').reduce(function (set, c) {
    set[c] = true
    return set
  }, {})
}

// normalizes slashes.
var slashSplit = /\/+/

minimatch.filter = filter
function filter (pattern, options) {
  options = options || {}
  return function (p, i, list) {
    return minimatch(p, pattern, options)
  }
}

function ext (a, b) {
  a = a || {}
  b = b || {}
  var t = {}
  Object.keys(b).forEach(function (k) {
    t[k] = b[k]
  })
  Object.keys(a).forEach(function (k) {
    t[k] = a[k]
  })
  return t
}

minimatch.defaults = function (def) {
  if (!def || !Object.keys(def).length) return minimatch

  var orig = minimatch

  var m = function minimatch (p, pattern, options) {
    return orig.minimatch(p, pattern, ext(def, options))
  }

  m.Minimatch = function Minimatch (pattern, options) {
    return new orig.Minimatch(pattern, ext(def, options))
  }

  return m
}

Minimatch.defaults = function (def) {
  if (!def || !Object.keys(def).length) return Minimatch
  return minimatch.defaults(def).Minimatch
}

function minimatch (p, pattern, options) {
  if (typeof pattern !== 'string') {
    throw new TypeError('glob pattern string required')
  }

  if (!options) options = {}

  // shortcut: comments match nothing.
  if (!options.nocomment && pattern.charAt(0) === '#') {
    return false
  }

  // "" only matches ""
  if (pattern.trim() === '') return p === ''

  return new Minimatch(pattern, options).match(p)
}

function Minimatch (pattern, options) {
  if (!(this instanceof Minimatch)) {
    return new Minimatch(pattern, options)
  }

  if (typeof pattern !== 'string') {
    throw new TypeError('glob pattern string required')
  }

  if (!options) options = {}
  pattern = pattern.trim()

  // windows support: need to use /, not \
  if (path.sep !== '/') {
    pattern = pattern.split(path.sep).join('/')
  }

  this.options = options
  this.set = []
  this.pattern = pattern
  this.regexp = null
  this.negate = false
  this.comment = false
  this.empty = false

  // make the set of regexps etc.
  this.make()
}

Minimatch.prototype.debug = function () {}

Minimatch.prototype.make = make
function make () {
  // don't do it more than once.
  if (this._made) return

  var pattern = this.pattern
  var options = this.options

  // empty patterns and comments match nothing.
  if (!options.nocomment && pattern.charAt(0) === '#') {
    this.comment = true
    return
  }
  if (!pattern) {
    this.empty = true
    return
  }

  // step 1: figure out negation, etc.
  this.parseNegate()

  // step 2: expand braces
  var set = this.globSet = this.braceExpand()

  if (options.debug) this.debug = console.error

  this.debug(this.pattern, set)

  // step 3: now we have a set, so turn each one into a series of path-portion
  // matching patterns.
  // These will be regexps, except in the case of "**", which is
  // set to the GLOBSTAR object for globstar behavior,
  // and will not contain any / characters
  set = this.globParts = set.map(function (s) {
    return s.split(slashSplit)
  })

  this.debug(this.pattern, set)

  // glob --> regexps
  set = set.map(function (s, si, set) {
    return s.map(this.parse, this)
  }, this)

  this.debug(this.pattern, set)

  // filter out everything that didn't compile properly.
  set = set.filter(function (s) {
    return s.indexOf(false) === -1
  })

  this.debug(this.pattern, set)

  this.set = set
}

Minimatch.prototype.parseNegate = parseNegate
function parseNegate () {
  var pattern = this.pattern
  var negate = false
  var options = this.options
  var negateOffset = 0

  if (options.nonegate) return

  for (var i = 0, l = pattern.length
    ; i < l && pattern.charAt(i) === '!'
    ; i++) {
    negate = !negate
    negateOffset++
  }

  if (negateOffset) this.pattern = pattern.substr(negateOffset)
  this.negate = negate
}

// Brace expansion:
// a{b,c}d -> abd acd
// a{b,}c -> abc ac
// a{0..3}d -> a0d a1d a2d a3d
// a{b,c{d,e}f}g -> abg acdfg acefg
// a{b,c}d{e,f}g -> abdeg acdeg abdeg abdfg
//
// Invalid sets are not expanded.
// a{2..}b -> a{2..}b
// a{b}c -> a{b}c
minimatch.braceExpand = function (pattern, options) {
  return braceExpand(pattern, options)
}

Minimatch.prototype.braceExpand = braceExpand

function braceExpand (pattern, options) {
  if (!options) {
    if (this instanceof Minimatch) {
      options = this.options
    } else {
      options = {}
    }
  }

  pattern = typeof pattern === 'undefined'
    ? this.pattern : pattern

  if (typeof pattern === 'undefined') {
    throw new TypeError('undefined pattern')
  }

  if (options.nobrace ||
    !pattern.match(/\{.*\}/)) {
    // shortcut. no need to expand.
    return [pattern]
  }

  return expand(pattern)
}

// parse a component of the expanded set.
// At this point, no pattern may contain "/" in it
// so we're going to return a 2d array, where each entry is the full
// pattern, split on '/', and then turned into a regular expression.
// A regexp is made at the end which joins each array with an
// escaped /, and another full one which joins each regexp with |.
//
// Following the lead of Bash 4.1, note that "**" only has special meaning
// when it is the *only* thing in a path portion.  Otherwise, any series
// of * is equivalent to a single *.  Globstar behavior is enabled by
// default, and can be disabled by setting options.noglobstar.
Minimatch.prototype.parse = parse
var SUBPARSE = {}
function parse (pattern, isSub) {
  if (pattern.length > 1024 * 64) {
    throw new TypeError('pattern is too long')
  }

  var options = this.options

  // shortcuts
  if (!options.noglobstar && pattern === '**') return GLOBSTAR
  if (pattern === '') return ''

  var re = ''
  var hasMagic = !!options.nocase
  var escaping = false
  // ? => one single character
  var patternListStack = []
  var negativeLists = []
  var stateChar
  var inClass = false
  var reClassStart = -1
  var classStart = -1
  // . and .. never match anything that doesn't start with .,
  // even when options.dot is set.
  var patternStart = pattern.charAt(0) === '.' ? '' // anything
  // not (start or / followed by . or .. followed by / or end)
  : options.dot ? '(?!(?:^|\\\/)\\.{1,2}(?:$|\\\/))'
  : '(?!\\.)'
  var self = this

  function clearStateChar () {
    if (stateChar) {
      // we had some state-tracking character
      // that wasn't consumed by this pass.
      switch (stateChar) {
        case '*':
          re += star
          hasMagic = true
        break
        case '?':
          re += qmark
          hasMagic = true
        break
        default:
          re += '\\' + stateChar
        break
      }
      self.debug('clearStateChar %j %j', stateChar, re)
      stateChar = false
    }
  }

  for (var i = 0, len = pattern.length, c
    ; (i < len) && (c = pattern.charAt(i))
    ; i++) {
    this.debug('%s\t%s %s %j', pattern, i, re, c)

    // skip over any that are escaped.
    if (escaping && reSpecials[c]) {
      re += '\\' + c
      escaping = false
      continue
    }

    switch (c) {
      case '/':
        // completely not allowed, even escaped.
        // Should already be path-split by now.
        return false

      case '\\':
        clearStateChar()
        escaping = true
      continue

      // the various stateChar values
      // for the "extglob" stuff.
      case '?':
      case '*':
      case '+':
      case '@':
      case '!':
        this.debug('%s\t%s %s %j <-- stateChar', pattern, i, re, c)

        // all of those are literals inside a class, except that
        // the glob [!a] means [^a] in regexp
        if (inClass) {
          this.debug('  in class')
          if (c === '!' && i === classStart + 1) c = '^'
          re += c
          continue
        }

        // if we already have a stateChar, then it means
        // that there was something like ** or +? in there.
        // Handle the stateChar, then proceed with this one.
        self.debug('call clearStateChar %j', stateChar)
        clearStateChar()
        stateChar = c
        // if extglob is disabled, then +(asdf|foo) isn't a thing.
        // just clear the statechar *now*, rather than even diving into
        // the patternList stuff.
        if (options.noext) clearStateChar()
      continue

      case '(':
        if (inClass) {
          re += '('
          continue
        }

        if (!stateChar) {
          re += '\\('
          continue
        }

        patternListStack.push({
          type: stateChar,
          start: i - 1,
          reStart: re.length,
          open: plTypes[stateChar].open,
          close: plTypes[stateChar].close
        })
        // negation is (?:(?!js)[^/]*)
        re += stateChar === '!' ? '(?:(?!(?:' : '(?:'
        this.debug('plType %j %j', stateChar, re)
        stateChar = false
      continue

      case ')':
        if (inClass || !patternListStack.length) {
          re += '\\)'
          continue
        }

        clearStateChar()
        hasMagic = true
        var pl = patternListStack.pop()
        // negation is (?:(?!js)[^/]*)
        // The others are (?:<pattern>)<type>
        re += pl.close
        if (pl.type === '!') {
          negativeLists.push(pl)
        }
        pl.reEnd = re.length
      continue

      case '|':
        if (inClass || !patternListStack.length || escaping) {
          re += '\\|'
          escaping = false
          continue
        }

        clearStateChar()
        re += '|'
      continue

      // these are mostly the same in regexp and glob
      case '[':
        // swallow any state-tracking char before the [
        clearStateChar()

        if (inClass) {
          re += '\\' + c
          continue
        }

        inClass = true
        classStart = i
        reClassStart = re.length
        re += c
      continue

      case ']':
        //  a right bracket shall lose its special
        //  meaning and represent itself in
        //  a bracket expression if it occurs
        //  first in the list.  -- POSIX.2 2.8.3.2
        if (i === classStart + 1 || !inClass) {
          re += '\\' + c
          escaping = false
          continue
        }

        // handle the case where we left a class open.
        // "[z-a]" is valid, equivalent to "\[z-a\]"
        if (inClass) {
          // split where the last [ was, make sure we don't have
          // an invalid re. if so, re-walk the contents of the
          // would-be class to re-translate any characters that
          // were passed through as-is
          // TODO: It would probably be faster to determine this
          // without a try/catch and a new RegExp, but it's tricky
          // to do safely.  For now, this is safe and works.
          var cs = pattern.substring(classStart + 1, i)
          try {
            RegExp('[' + cs + ']')
          } catch (er) {
            // not a valid class!
            var sp = this.parse(cs, SUBPARSE)
            re = re.substr(0, reClassStart) + '\\[' + sp[0] + '\\]'
            hasMagic = hasMagic || sp[1]
            inClass = false
            continue
          }
        }

        // finish up the class.
        hasMagic = true
        inClass = false
        re += c
      continue

      default:
        // swallow any state char that wasn't consumed
        clearStateChar()

        if (escaping) {
          // no need
          escaping = false
        } else if (reSpecials[c]
          && !(c === '^' && inClass)) {
          re += '\\'
        }

        re += c

    } // switch
  } // for

  // handle the case where we left a class open.
  // "[abc" is valid, equivalent to "\[abc"
  if (inClass) {
    // split where the last [ was, and escape it
    // this is a huge pita.  We now have to re-walk
    // the contents of the would-be class to re-translate
    // any characters that were passed through as-is
    cs = pattern.substr(classStart + 1)
    sp = this.parse(cs, SUBPARSE)
    re = re.substr(0, reClassStart) + '\\[' + sp[0]
    hasMagic = hasMagic || sp[1]
  }

  // handle the case where we had a +( thing at the *end*
  // of the pattern.
  // each pattern list stack adds 3 chars, and we need to go through
  // and escape any | chars that were passed through as-is for the regexp.
  // Go through and escape them, taking care not to double-escape any
  // | chars that were already escaped.
  for (pl = patternListStack.pop(); pl; pl = patternListStack.pop()) {
    var tail = re.slice(pl.reStart + pl.open.length)
    this.debug('setting tail', re, pl)
    // maybe some even number of \, then maybe 1 \, followed by a |
    tail = tail.replace(/((?:\\{2}){0,64})(\\?)\|/g, function (_, $1, $2) {
      if (!$2) {
        // the | isn't already escaped, so escape it.
        $2 = '\\'
      }

      // need to escape all those slashes *again*, without escaping the
      // one that we need for escaping the | character.  As it works out,
      // escaping an even number of slashes can be done by simply repeating
      // it exactly after itself.  That's why this trick works.
      //
      // I am sorry that you have to see this.
      return $1 + $1 + $2 + '|'
    })

    this.debug('tail=%j\n   %s', tail, tail, pl, re)
    var t = pl.type === '*' ? star
      : pl.type === '?' ? qmark
      : '\\' + pl.type

    hasMagic = true
    re = re.slice(0, pl.reStart) + t + '\\(' + tail
  }

  // handle trailing things that only matter at the very end.
  clearStateChar()
  if (escaping) {
    // trailing \\
    re += '\\\\'
  }

  // only need to apply the nodot start if the re starts with
  // something that could conceivably capture a dot
  var addPatternStart = false
  switch (re.charAt(0)) {
    case '.':
    case '[':
    case '(': addPatternStart = true
  }

  // Hack to work around lack of negative lookbehind in JS
  // A pattern like: *.!(x).!(y|z) needs to ensure that a name
  // like 'a.xyz.yz' doesn't match.  So, the first negative
  // lookahead, has to look ALL the way ahead, to the end of
  // the pattern.
  for (var n = negativeLists.length - 1; n > -1; n--) {
    var nl = negativeLists[n]

    var nlBefore = re.slice(0, nl.reStart)
    var nlFirst = re.slice(nl.reStart, nl.reEnd - 8)
    var nlLast = re.slice(nl.reEnd - 8, nl.reEnd)
    var nlAfter = re.slice(nl.reEnd)

    nlLast += nlAfter

    // Handle nested stuff like *(*.js|!(*.json)), where open parens
    // mean that we should *not* include the ) in the bit that is considered
    // "after" the negated section.
    var openParensBefore = nlBefore.split('(').length - 1
    var cleanAfter = nlAfter
    for (i = 0; i < openParensBefore; i++) {
      cleanAfter = cleanAfter.replace(/\)[+*?]?/, '')
    }
    nlAfter = cleanAfter

    var dollar = ''
    if (nlAfter === '' && isSub !== SUBPARSE) {
      dollar = '$'
    }
    var newRe = nlBefore + nlFirst + nlAfter + dollar + nlLast
    re = newRe
  }

  // if the re is not "" at this point, then we need to make sure
  // it doesn't match against an empty path part.
  // Otherwise a/* will match a/, which it should not.
  if (re !== '' && hasMagic) {
    re = '(?=.)' + re
  }

  if (addPatternStart) {
    re = patternStart + re
  }

  // parsing just a piece of a larger pattern.
  if (isSub === SUBPARSE) {
    return [re, hasMagic]
  }

  // skip the regexp for non-magical patterns
  // unescape anything in it, though, so that it'll be
  // an exact match against a file etc.
  if (!hasMagic) {
    return globUnescape(pattern)
  }

  var flags = options.nocase ? 'i' : ''
  try {
    var regExp = new RegExp('^' + re + '$', flags)
  } catch (er) {
    // If it was an invalid regular expression, then it can't match
    // anything.  This trick looks for a character after the end of
    // the string, which is of course impossible, except in multi-line
    // mode, but it's not a /m regex.
    return new RegExp('$.')
  }

  regExp._glob = pattern
  regExp._src = re

  return regExp
}

minimatch.makeRe = function (pattern, options) {
  return new Minimatch(pattern, options || {}).makeRe()
}

Minimatch.prototype.makeRe = makeRe
function makeRe () {
  if (this.regexp || this.regexp === false) return this.regexp

  // at this point, this.set is a 2d array of partial
  // pattern strings, or "**".
  //
  // It's better to use .match().  This function shouldn't
  // be used, really, but it's pretty convenient sometimes,
  // when you just want to work with a regex.
  var set = this.set

  if (!set.length) {
    this.regexp = false
    return this.regexp
  }
  var options = this.options

  var twoStar = options.noglobstar ? star
    : options.dot ? twoStarDot
    : twoStarNoDot
  var flags = options.nocase ? 'i' : ''

  var re = set.map(function (pattern) {
    return pattern.map(function (p) {
      return (p === GLOBSTAR) ? twoStar
      : (typeof p === 'string') ? regExpEscape(p)
      : p._src
    }).join('\\\/')
  }).join('|')

  // must match entire pattern
  // ending in a * or ** will make it less strict.
  re = '^(?:' + re + ')$'

  // can match anything, as long as it's not this.
  if (this.negate) re = '^(?!' + re + ').*$'

  try {
    this.regexp = new RegExp(re, flags)
  } catch (ex) {
    this.regexp = false
  }
  return this.regexp
}

minimatch.match = function (list, pattern, options) {
  options = options || {}
  var mm = new Minimatch(pattern, options)
  list = list.filter(function (f) {
    return mm.match(f)
  })
  if (mm.options.nonull && !list.length) {
    list.push(pattern)
  }
  return list
}

Minimatch.prototype.match = match
function match (f, partial) {
  this.debug('match', f, this.pattern)
  // short-circuit in the case of busted things.
  // comments, etc.
  if (this.comment) return false
  if (this.empty) return f === ''

  if (f === '/' && partial) return true

  var options = this.options

  // windows: need to use /, not \
  if (path.sep !== '/') {
    f = f.split(path.sep).join('/')
  }

  // treat the test path as a set of pathparts.
  f = f.split(slashSplit)
  this.debug(this.pattern, 'split', f)

  // just ONE of the pattern sets in this.set needs to match
  // in order for it to be valid.  If negating, then just one
  // match means that we have failed.
  // Either way, return on the first hit.

  var set = this.set
  this.debug(this.pattern, 'set', set)

  // Find the basename of the path by looking for the last non-empty segment
  var filename
  var i
  for (i = f.length - 1; i >= 0; i--) {
    filename = f[i]
    if (filename) break
  }

  for (i = 0; i < set.length; i++) {
    var pattern = set[i]
    var file = f
    if (options.matchBase && pattern.length === 1) {
      file = [filename]
    }
    var hit = this.matchOne(file, pattern, partial)
    if (hit) {
      if (options.flipNegate) return true
      return !this.negate
    }
  }

  // didn't get any hits.  this is success if it's a negative
  // pattern, failure otherwise.
  if (options.flipNegate) return false
  return this.negate
}

// set partial to true to test if, for example,
// "/a/b" matches the start of "/*/b/*/d"
// Partial means, if you run out of file before you run
// out of pattern, then that's fine, as long as all
// the parts match.
Minimatch.prototype.matchOne = function (file, pattern, partial) {
  var options = this.options

  this.debug('matchOne',
    { 'this': this, file: file, pattern: pattern })

  this.debug('matchOne', file.length, pattern.length)

  for (var fi = 0,
      pi = 0,
      fl = file.length,
      pl = pattern.length
      ; (fi < fl) && (pi < pl)
      ; fi++, pi++) {
    this.debug('matchOne loop')
    var p = pattern[pi]
    var f = file[fi]

    this.debug(pattern, p, f)

    // should be impossible.
    // some invalid regexp stuff in the set.
    if (p === false) return false

    if (p === GLOBSTAR) {
      this.debug('GLOBSTAR', [pattern, p, f])

      // "**"
      // a/**/b/**/c would match the following:
      // a/b/x/y/z/c
      // a/x/y/z/b/c
      // a/b/x/b/x/c
      // a/b/c
      // To do this, take the rest of the pattern after
      // the **, and see if it would match the file remainder.
      // If so, return success.
      // If not, the ** "swallows" a segment, and try again.
      // This is recursively awful.
      //
      // a/**/b/**/c matching a/b/x/y/z/c
      // - a matches a
      // - doublestar
      //   - matchOne(b/x/y/z/c, b/**/c)
      //     - b matches b
      //     - doublestar
      //       - matchOne(x/y/z/c, c) -> no
      //       - matchOne(y/z/c, c) -> no
      //       - matchOne(z/c, c) -> no
      //       - matchOne(c, c) yes, hit
      var fr = fi
      var pr = pi + 1
      if (pr === pl) {
        this.debug('** at the end')
        // a ** at the end will just swallow the rest.
        // We have found a match.
        // however, it will not swallow /.x, unless
        // options.dot is set.
        // . and .. are *never* matched by **, for explosively
        // exponential reasons.
        for (; fi < fl; fi++) {
          if (file[fi] === '.' || file[fi] === '..' ||
            (!options.dot && file[fi].charAt(0) === '.')) return false
        }
        return true
      }

      // ok, let's see if we can swallow whatever we can.
      while (fr < fl) {
        var swallowee = file[fr]

        this.debug('\nglobstar while', file, fr, pattern, pr, swallowee)

        // XXX remove this slice.  Just pass the start index.
        if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
          this.debug('globstar found match!', fr, fl, swallowee)
          // found a match.
          return true
        } else {
          // can't swallow "." or ".." ever.
          // can only swallow ".foo" when explicitly asked.
          if (swallowee === '.' || swallowee === '..' ||
            (!options.dot && swallowee.charAt(0) === '.')) {
            this.debug('dot detected!', file, fr, pattern, pr)
            break
          }

          // ** swallows a segment, and continue.
          this.debug('globstar swallow a segment, and continue')
          fr++
        }
      }

      // no match was found.
      // However, in partial mode, we can't say this is necessarily over.
      // If there's more *pattern* left, then
      if (partial) {
        // ran out of file
        this.debug('\n>>> no match, partial?', file, fr, pattern, pr)
        if (fr === fl) return true
      }
      return false
    }

    // something other than **
    // non-magic patterns just have to match exactly
    // patterns with magic have been turned into regexps.
    var hit
    if (typeof p === 'string') {
      if (options.nocase) {
        hit = f.toLowerCase() === p.toLowerCase()
      } else {
        hit = f === p
      }
      this.debug('string match', p, f, hit)
    } else {
      hit = f.match(p)
      this.debug('pattern match', p, f, hit)
    }

    if (!hit) return false
  }

  // Note: ending in / means that we'll get a final ""
  // at the end of the pattern.  This can only match a
  // corresponding "" at the end of the file.
  // If the file ends in /, then it can only match a
  // a pattern that ends in /, unless the pattern just
  // doesn't have any more for it. But, a/b/ should *not*
  // match "a/b/*", even though "" matches against the
  // [^/]*? pattern, except in partial mode, where it might
  // simply not be reached yet.
  // However, a/b/ should still satisfy a/*

  // now either we fell off the end of the pattern, or we're done.
  if (fi === fl && pi === pl) {
    // ran out of pattern and filename at the same time.
    // an exact hit!
    return true
  } else if (fi === fl) {
    // ran out of file, but still had pattern left.
    // this is ok if we're doing the match as part of
    // a glob fs traversal.
    return partial
  } else if (pi === pl) {
    // ran out of pattern, still have file left.
    // this is only acceptable if we're on the very last
    // empty segment of a file with a trailing slash.
    // a/* should match a/b/
    var emptyFileEnd = (fi === fl - 1) && (file[fi] === '')
    return emptyFileEnd
  }

  // should be unreachable.
  throw new Error('wtf?')
}

// replace stuff like \* with *
function globUnescape (s) {
  return s.replace(/\\(.)/g, '$1')
}

function regExpEscape (s) {
  return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
}


/***/ }),

/***/ 1890:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var path = __webpack_require__(1017);
var fs = __webpack_require__(7147);
var _0777 = parseInt('0777', 8);

module.exports = mkdirP.mkdirp = mkdirP.mkdirP = mkdirP;

function mkdirP (p, opts, f, made) {
    if (typeof opts === 'function') {
        f = opts;
        opts = {};
    }
    else if (!opts || typeof opts !== 'object') {
        opts = { mode: opts };
    }
    
    var mode = opts.mode;
    var xfs = opts.fs || fs;
    
    if (mode === undefined) {
        mode = _0777
    }
    if (!made) made = null;
    
    var cb = f || function () {};
    p = path.resolve(p);
    
    xfs.mkdir(p, mode, function (er) {
        if (!er) {
            made = made || p;
            return cb(null, made);
        }
        switch (er.code) {
            case 'ENOENT':
                if (path.dirname(p) === p) return cb(er);
                mkdirP(path.dirname(p), opts, function (er, made) {
                    if (er) cb(er, made);
                    else mkdirP(p, opts, cb, made);
                });
                break;

            // In the case of any other error, just see if there's a dir
            // there already.  If so, then hooray!  If not, then something
            // is borked.
            default:
                xfs.stat(p, function (er2, stat) {
                    // if the stat fails, then that's super weird.
                    // let the original error be the failure reason.
                    if (er2 || !stat.isDirectory()) cb(er, made)
                    else cb(null, made);
                });
                break;
        }
    });
}

mkdirP.sync = function sync (p, opts, made) {
    if (!opts || typeof opts !== 'object') {
        opts = { mode: opts };
    }
    
    var mode = opts.mode;
    var xfs = opts.fs || fs;
    
    if (mode === undefined) {
        mode = _0777
    }
    if (!made) made = null;

    p = path.resolve(p);

    try {
        xfs.mkdirSync(p, mode);
        made = made || p;
    }
    catch (err0) {
        switch (err0.code) {
            case 'ENOENT' :
                made = sync(path.dirname(p), opts, made);
                sync(p, opts, made);
                break;

            // In the case of any other error, just see if there's a dir
            // there already.  If so, then hooray!  If not, then something
            // is borked.
            default:
                var stat;
                try {
                    stat = xfs.statSync(p);
                }
                catch (err1) {
                    throw err0;
                }
                if (!stat.isDirectory()) throw err0;
                break;
        }
    }

    return made;
};


/***/ }),

/***/ 977:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

var natives = process.binding('natives')
var module = __webpack_require__(8188)
var normalRequire = undefined
exports.source = src
exports.require = req
var vm = __webpack_require__(6144)

// fallback for 0.x support
var runInThisContext, ContextifyScript, Script
/*istanbul ignore next*/
try {
  ContextifyScript = process.binding('contextify').ContextifyScript;
  /*istanbul ignore next*/
  if (process.version.split('.')[0].length > 2) {  // v10.0.0 and above
    runInThisContext = vm.runInThisContext;
  } else {
    runInThisContext = function runInThisContext(code, options) {
      var script = new ContextifyScript(code, options);
      return script.runInThisContext();
    }
  }
} catch (er) {
  Script = process.binding('evals').NodeScript;
  runInThisContext = Script.runInThisContext;
}

var wrap = [
  '(function (internalBinding) {' +
    ' return function (exports, require, module, __filename, __dirname) { ',
  '\n  };\n});'
];


// Basically the same functionality as node's (buried deep)
// NativeModule class, but without caching, or internal/ blocking,
// or a class, since that's not really necessary.  I assume that if
// you're loading something with this module, it's because you WANT
// a separate copy.  However, to preserve semantics, any require()
// calls made throughout the internal module load IS cached.
function req (id, whitelist) {
  var cache = Object.create(null)

  if (Array.isArray(whitelist)) {
    // a whitelist of things to pull from the "actual" native modules
    whitelist.forEach(function (id) {
      cache[id] = {
        loading: false,
        loaded: true,
        filename: id + '.js',
        exports: __webpack_require__(1393)(id)
      }
    })
  }

  return req_(id, cache)
}

function req_ (id, cache) {
  // Buffer is special, because it's a type rather than a "normal"
  // class, and many things depend on `Buffer.isBuffer` working.
  if (id === 'buffer') {
    return __webpack_require__(4300)
  }

  // native_module isn't actually a natives binding.
  // weird, right?
  if (id === 'native_module') {
    return {
      getSource: src,
      wrap: function (script) {
        return wrap[0] + script + wrap[1]
      },
      wrapper: wrap,
      _cache: cache,
      _source: natives,
      nonInternalExists: function (id) {
        return id.indexOf('internal/') !== 0;
      }
    }
  }

  var source = src(id)
  if (!source) {
    return undefined
  }
  source = wrap[0] + source + wrap[1]

  var internalBinding = function(name) {
    if (name === 'types') {
      return process.binding('util');
    } else {
      try {
        return process.binding(name);
      } catch (e) {}
      return {};
    }
  }

  var cachingRequire = function require (id) {
    if (cache[id]) {
      return cache[id].exports
    }
    if (id === 'internal/bootstrap/loaders' || id === 'internal/process') {
      // Provide just enough to keep `graceful-fs@3` working and tests passing.
      // For now.
      return {
        internalBinding: internalBinding,
        NativeModule: {
          _source: process.binding('natives'),
          nonInternalExists: function(id) {
            return !id.startsWith('internal/');
          }
        }
      };
    }
    return req_(id, cache)
  }

  var nm = {
    exports: {},
    loading: true,
    loaded: false,
    filename: id + '.js'
  }
  cache[id] = nm
  var fn
  var setV8Flags = false
  try {
    __webpack_require__(4655).setFlagsFromString('--allow_natives_syntax')
    setV8Flags = true
  } catch (e) {}
  try {
    /* istanbul ignore else */
    if (ContextifyScript) {
      fn = runInThisContext(source, {
        filename: nm.filename,
        lineOffset: 0,
        displayErrors: true
      });
    } else {
      fn = runInThisContext(source, nm.filename, true);
    }
    fn(internalBinding)(nm.exports, cachingRequire, nm, nm.filename, '<no dirname available>')
    nm.loaded = true
  } finally {
    nm.loading = false
    /*istanbul ignore next*/
    if (setV8Flags) {
      // Ref: https://github.com/nodejs/node/blob/591a24b819d53a555463b1cbf9290a6d8bcc1bcb/lib/internal/bootstrap_node.js#L429-L434
      var re = /^--allow[-_]natives[-_]syntax$/
      if (!process.execArgv.some(function (s) { return re.test(s) }))
        __webpack_require__(4655).setFlagsFromString('--noallow_natives_syntax')
    }
  }

  return nm.exports
}

function src (id) {
  return natives[id]
}


/***/ }),

/***/ 1393:
/***/ ((module) => {

function webpackEmptyContext(req) {
	var e = new Error("Cannot find module '" + req + "'");
	e.code = 'MODULE_NOT_FOUND';
	throw e;
}
webpackEmptyContext.keys = () => ([]);
webpackEmptyContext.resolve = webpackEmptyContext;
webpackEmptyContext.id = 1393;
module.exports = webpackEmptyContext;

/***/ }),

/***/ 778:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var wrappy = __webpack_require__(2479)
module.exports = wrappy(once)
module.exports.strict = wrappy(onceStrict)

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })

  Object.defineProperty(Function.prototype, 'onceStrict', {
    value: function () {
      return onceStrict(this)
    },
    configurable: true
  })
})

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  f.called = false
  return f
}

function onceStrict (fn) {
  var f = function () {
    if (f.called)
      throw new Error(f.onceError)
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  var name = fn.name || 'Function wrapped with `once`'
  f.onceError = name + " shouldn't be called more than once"
  f.called = false
  return f
}


/***/ }),

/***/ 8513:
/***/ ((module) => {

"use strict";


// overloadDefs
// self, overloadDefs
var overload = module.exports = function () {
  var self, selfSet = false, overloadDefs;
  if (arguments.length === 1) {
    overloadDefs = arguments[0];
  } else {
    selfSet = true;
    self = arguments[0];
    overloadDefs = arguments[1];
  }
  return function () {
    if (!selfSet) {
      self = this;
    }
    var args = Array.prototype.slice.call(arguments);
    var overloadMatchData = findOverload(overloadDefs, args);
    if (!overloadMatchData) {
      throw new Error(createErrorMessage('No match found.', overloadDefs));
    }
    var overloadFn = overloadMatchData.def[overloadMatchData.def.length - 1];
    return overloadFn.apply(self, overloadMatchData.args);
  };
};

var findOverload = overload.findOverload = function (overloadDefs, args) {
  for (var i = 0; i < overloadDefs.length; i++) {
    if (i === overloadDefs.length - 1 && typeof(overloadDefs[i]) === 'function') {
      return { args: args, def: [overloadDefs[i]] };
    }
    var newArgs;
    if (newArgs = isMatch(overloadDefs[i], args)) {
      return { args: newArgs, def: overloadDefs[i] };
    }
  }
  return null;
};

function isMatch(overloadDef, args) {
  var overloadDefIdx;
  var argIdx;
  var newArgs = [];
  for (overloadDefIdx = 0, argIdx = 0; overloadDefIdx < overloadDef.length - 1; overloadDefIdx++) {
    if (typeof(overloadDef[overloadDefIdx]) !== 'function') {
      throw new Error("Invalid overload definition. Array should only contain functions.");
    }
    //console.log('overloadDef/arg:', overloadDef[overloadDefIdx], args[argIdx]);
    var result = overloadDef[overloadDefIdx](args[argIdx]);
    //console.log('result:', result);
    if (result) {
      if (result.hasOwnProperty('defaultValue')) {
        newArgs.push(result.defaultValue);
      } else {
        if (overloadDef[overloadDefIdx].optional && args[argIdx] === null) {
          argIdx++;
          newArgs.push(overloadDef[overloadDefIdx].defaultValue);
          continue;
        }
        newArgs.push(args[argIdx]);
        argIdx++;
      }
    } else {
      if (overloadDef[overloadDefIdx].optional) {
        newArgs.push(overloadDef[overloadDefIdx].defaultValue);
        continue;
      }
      return false;
    }
  }
  //console.log('compares', overloadDefIdx, overloadDef.length - 1, argIdx, args.length, newArgs.length);
  if (overloadDefIdx === overloadDef.length - 1 && argIdx >= args.length) {
    return newArgs;
  }
  return false;
}

function createErrorMessage(message, overloadDefs) {
  message += '\n';
  message += '  Possible matches:\n';
  for (var i = 0; i < overloadDefs.length; i++) {
    var overloadDef = overloadDefs[i];
    if (typeof(overloadDef) === 'function') {
      message += '   [default]\n';
    } else {
      var matchers = overloadDef.slice(0, overloadDef.length - 1);
      matchers = matchers.map(function (m) {
        if (!m) {
          return '[invalid argument definition]';
        }
        return m.name || m;
      });
      if (matchers.length === 0) {
        message += '   ()\n';
      } else {
        message += '   (' + matchers.join(', ') + ')\n';
      }
    }
  }
  return message;
}

// --- func
overload.func = function func(arg) {
  return typeof(arg) === 'function';
};

overload.funcOptional = function funcOptional(arg) {
  if (!arg) {
    return true;
  }
  return overload.func(arg);
};
overload.funcOptional.optional = true;

overload.funcOptionalWithDefault = function (def) {
  var fn = function funcOptionalWithDefault(arg) {
    if (arg === undefined) {
      return false;
    }
    return overload.func(arg);
  };
  fn.optional = true;
  fn.defaultValue = def;
  return fn;
};

// --- callback
overload.callbackOptional = function callbackOptional(arg) {
  if (!arg) {
    return { defaultValue: function defaultCallback() {} };
  }
  return overload.func(arg);
};
overload.callbackOptional.optional = true;

// --- string
overload.string = function string(arg) {
  return typeof(arg) === 'string';
};

overload.stringOptional = function stringOptional(arg) {
  if (!arg) {
    return true;
  }
  return overload.string(arg);
};
overload.stringOptional.optional = true;

overload.stringOptionalWithDefault = function (def) {
  var fn = function stringOptionalWithDefault(arg) {
    if (arg === undefined) {
      return false;
    }
    return overload.string(arg);
  };
  fn.optional = true;
  fn.defaultValue = def;
  return fn;
};

// --- number
overload.number = function number(arg) {
  return typeof(arg) === 'number';
};

overload.numberOptional = function numberOptional(arg) {
  if (!arg) {
    return true;
  }
  return overload.number(arg);
};
overload.numberOptional.optional = true;

overload.numberOptionalWithDefault = function (def) {
  var fn = function numberOptionalWithDefault(arg) {
    if (arg === undefined) {
      return false;
    }
    return overload.number(arg);
  };
  fn.optional = true;
  fn.defaultValue = def;
  return fn;
};

// --- array
overload.array = function array(arg) {
  return arg instanceof Array;
};

overload.arrayOptional = function arrayOptional(arg) {
  if (!arg) {
    return true;
  }
  return overload.array(arg);
};
overload.arrayOptional.optional = true;

overload.arrayOptionalWithDefault = function (def) {
  var fn = function arrayOptionalWithDefault(arg) {
    if (arg === undefined) {
      return false;
    }
    return overload.array(arg);
  };
  fn.optional = true;
  fn.defaultValue = def;
  return fn;
};

// --- object
overload.object = function object(arg) {
  return typeof(arg) === 'object';
};

overload.objectOptional = function objectOptional(arg) {
  if (!arg) {
    return true;
  }
  return overload.object(arg);
};
overload.objectOptional.optional = true;

overload.objectOptionalWithDefault = function (def) {
  var fn = function objectOptionalWithDefault(arg) {
    if (arg === undefined) {
      return false;
    }
    return overload.object(arg);
  };
  fn.optional = true;
  fn.defaultValue = def;
  return fn;
};


/***/ }),

/***/ 4095:
/***/ ((module) => {

"use strict";


function posix(path) {
	return path.charAt(0) === '/';
}

function win32(path) {
	// https://github.com/nodejs/node/blob/b3fcc245fb25539909ef1d5eaa01dbf92e168633/lib/path.js#L56
	var splitDeviceRe = /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/;
	var result = splitDeviceRe.exec(path);
	var device = result[1] || '';
	var isUnc = Boolean(device && device.charAt(1) !== ':');

	// UNC paths are always absolute
	return Boolean(result[2] || isUnc);
}

module.exports = process.platform === 'win32' ? win32 : posix;
module.exports.posix = posix;
module.exports.win32 = win32;


/***/ }),

/***/ 9746:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


module.exports = PullStream;

__webpack_require__(4889);
var inherits = __webpack_require__(3837).inherits;
var PassThrough = __webpack_require__(5799);
var over = __webpack_require__(8513);
var SliceStream = __webpack_require__(664);

function PullStream(opts) {
  var self = this;
  this.opts = opts || {};
  PassThrough.call(this, opts);
  this.once('finish', function() {
    self._writesFinished = true;
    if (self._flushed) {
      self._finish();
    }
  });
  this.on('readable', function() {
    self._process();
  });
}
inherits(PullStream, PassThrough);

PullStream.prototype.pull = over([
  [over.numberOptionalWithDefault(null), over.func, function (len, callback) {
    if (len === 0) {
      return callback(null, new Buffer(0));
    }

    var self = this;
    pullServiceRequest();

    function pullServiceRequest() {
      self._serviceRequests = null;
      if (self._flushed) {
        return callback(new Error('End of Stream'));
      }

      var data = self.read(len || undefined);
      if (data) {
        setImmediate(callback.bind(null, null, data));
      } else {
        self._serviceRequests = pullServiceRequest;
      }
    }
  }]
]);

PullStream.prototype.pullUpTo = over([
  [over.numberOptionalWithDefault(null), function (len) {
    var data = this.read(len);
    if (len && !data) {
      data = this.read();
    }
    return data;
  }]
]);

PullStream.prototype.pipe = over([
  [over.numberOptionalWithDefault(null), over.object, function (len, destStream) {
    if (!len) {
      return PassThrough.prototype.pipe.call(this, destStream);
    }

    if (len === 0) {
      return destStream.end();
    }


    var pullstream = this;
    pullstream
      .pipe(new SliceStream({ length: len }, function (buf, sliceEnd, extra) {
        if (!sliceEnd) {
          return this.push(buf);
        }
        pullstream.unpipe();
        pullstream.unshift(extra);
        this.push(buf);
        return this.push(null);
      }))
      .pipe(destStream);

    return destStream;
  }]
]);

PullStream.prototype._process = function () {
  if (this._serviceRequests) {
    this._serviceRequests();
  }
};

PullStream.prototype.prepend = function (chunk) {
  this.unshift(chunk);
};

PullStream.prototype.drain = function (len, callback) {
  if (this._flushed) {
    return callback(new Error('End of Stream'));
  }

  var data = this.pullUpTo(len);
  var bytesDrained = data && data.length || 0;
  if (bytesDrained === len) {
     setImmediate(callback);
  } else if (bytesDrained > 0) {
    this.drain(len - bytesDrained, callback);
  } else {
    //internal buffer is empty, wait until data can be consumed
    this.once('readable', this.drain.bind(this, len - bytesDrained, callback));
  }
};

PullStream.prototype._flush = function (callback) {
  var self = this;
  if (this._readableState.length > 0) {
    return setImmediate(self._flush.bind(self, callback));
  }

  this._flushed = true;
  if (self._writesFinished) {
    self._finish(callback);
  } else {
    callback();
  }
};

PullStream.prototype._finish = function (callback) {
  callback = callback || function () {};
  if (this._serviceRequests) {
    this._serviceRequests();
  }
  setImmediate(callback);
};


/***/ }),

/***/ 6753:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

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

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

module.exports = Duplex;

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}
/*</replacement>*/


/*<replacement>*/
var util = __webpack_require__(6497);
util.inherits = __webpack_require__(4378);
/*</replacement>*/

var Readable = __webpack_require__(9481);
var Writable = __webpack_require__(4229);

util.inherits(Duplex, Readable);

forEach(objectKeys(Writable.prototype), function(method) {
  if (!Duplex.prototype[method])
    Duplex.prototype[method] = Writable.prototype[method];
});

function Duplex(options) {
  if (!(this instanceof Duplex))
    return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false)
    this.readable = false;

  if (options && options.writable === false)
    this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false)
    this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended)
    return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  process.nextTick(this.end.bind(this));
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}


/***/ }),

/***/ 2725:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

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

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

module.exports = PassThrough;

var Transform = __webpack_require__(4605);

/*<replacement>*/
var util = __webpack_require__(6497);
util.inherits = __webpack_require__(4378);
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough))
    return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function(chunk, encoding, cb) {
  cb(null, chunk);
};


/***/ }),

/***/ 9481:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

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

module.exports = Readable;

/*<replacement>*/
var isArray = __webpack_require__(5826);
/*</replacement>*/


/*<replacement>*/
var Buffer = __webpack_require__(4300).Buffer;
/*</replacement>*/

Readable.ReadableState = ReadableState;

var EE = __webpack_require__(2361).EventEmitter;

/*<replacement>*/
if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

var Stream = __webpack_require__(2781);

/*<replacement>*/
var util = __webpack_require__(6497);
util.inherits = __webpack_require__(4378);
/*</replacement>*/

var StringDecoder;

util.inherits(Readable, Stream);

function ReadableState(options, stream) {
  options = options || {};

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = false;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // In streams that never have any data, and do push(null) right away,
  // the consumer can miss the 'end' event if they do some I/O before
  // consuming the stream.  So, we don't emit('end') until some reading
  // happens.
  this.calledRead = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;


  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = __webpack_require__(6941)/* .StringDecoder */ .s;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  if (!(this instanceof Readable))
    return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function(chunk, encoding) {
  var state = this._readableState;

  if (typeof chunk === 'string' && !state.objectMode) {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function(chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (chunk === null || chunk === undefined) {
    state.reading = false;
    if (!state.ended)
      onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      if (state.decoder && !addToFront && !encoding)
        chunk = state.decoder.write(chunk);

      // update the buffer info.
      state.length += state.objectMode ? 1 : chunk.length;
      if (addToFront) {
        state.buffer.unshift(chunk);
      } else {
        state.reading = false;
        state.buffer.push(chunk);
      }

      if (state.needReadable)
        emitReadable(stream);

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}



// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended &&
         (state.needReadable ||
          state.length < state.highWaterMark ||
          state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function(enc) {
  if (!StringDecoder)
    StringDecoder = __webpack_require__(6941)/* .StringDecoder */ .s;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
};

// Don't raise the hwm > 128MB
var MAX_HWM = 0x800000;
function roundUpToNextPowerOf2(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended)
    return 0;

  if (state.objectMode)
    return n === 0 ? 0 : 1;

  if (n === null || isNaN(n)) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length)
      return state.buffer[0].length;
    else
      return state.length;
  }

  if (n <= 0)
    return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark)
    state.highWaterMark = roundUpToNextPowerOf2(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else
      return state.length;
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function(n) {
  var state = this._readableState;
  state.calledRead = true;
  var nOrig = n;
  var ret;

  if (typeof n !== 'number' || n > 0)
    state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
    emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    ret = null;

    // In cases where the decoder did not receive enough data
    // to produce a full chunk, then immediately received an
    // EOF, state.buffer will contain [<Buffer >, <Buffer 00 ...>].
    // howMuchToRead will see this and coerce the amount to
    // read to zero (because it's looking at the length of the
    // first <Buffer > in state.buffer), and we'll end up here.
    //
    // This can only happen via state.decoder -- no other venue
    // exists for pushing a zero-length chunk into state.buffer
    // and triggering this behavior. In this case, we return our
    // remaining data and end the stream, if appropriate.
    if (state.length > 0 && state.decoder) {
      ret = fromList(n, state);
      state.length -= ret.length;
    }

    if (state.length === 0)
      endReadable(this);

    return ret;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;

  // if we currently have less than the highWaterMark, then also read some
  if (state.length - n <= state.highWaterMark)
    doRead = true;

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading)
    doRead = false;

  if (doRead) {
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read called its callback synchronously, then `reading`
  // will be false, and we need to re-evaluate how much data we
  // can return to the user.
  if (doRead && !state.reading)
    n = howMuchToRead(nOrig, state);

  if (n > 0)
    ret = fromList(n, state);
  else
    ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended)
    state.needReadable = true;

  // If we happened to read() exactly the remaining amount in the
  // buffer, and the EOF has been seen at this point, then make sure
  // that we emit 'end' on the very next tick.
  if (state.ended && !state.endEmitted && state.length === 0)
    endReadable(this);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}


function onEofChunk(stream, state) {
  if (state.decoder && !state.ended) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // if we've ended and we have some data left, then emit
  // 'readable' now to make sure it gets picked up.
  if (state.length > 0)
    emitReadable(stream);
  else
    endReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (state.emittedReadable)
    return;

  state.emittedReadable = true;
  if (state.sync)
    process.nextTick(function() {
      emitReadable_(stream);
    });
  else
    emitReadable_(stream);
}

function emitReadable_(stream) {
  stream.emit('readable');
}


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(function() {
      maybeReadMore_(stream, state);
    });
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function(n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function(dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;

  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
              dest !== process.stdout &&
              dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted)
    process.nextTick(endFn);
  else
    src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    if (readable !== src) return;
    cleanup();
  }

  function onend() {
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  function cleanup() {
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (!dest._writableState || dest._writableState.needDrain)
      ondrain();
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    unpipe();
    dest.removeListener('error', onerror);
    if (EE.listenerCount(dest, 'error') === 0)
      dest.emit('error', er);
  }
  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS.
  if (!dest._events || !dest._events.error)
    dest.on('error', onerror);
  else if (isArray(dest._events.error))
    dest._events.error.unshift(onerror);
  else
    dest._events.error = [onerror, dest._events.error];



  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    // the handler that waits for readable events after all
    // the data gets sucked out in flow.
    // This would be easier to follow with a .once() handler
    // in flow(), but that is too slow.
    this.on('readable', pipeOnReadable);

    state.flowing = true;
    process.nextTick(function() {
      flow(src);
    });
  }

  return dest;
};

function pipeOnDrain(src) {
  return function() {
    var dest = this;
    var state = src._readableState;
    state.awaitDrain--;
    if (state.awaitDrain === 0)
      flow(src);
  };
}

function flow(src) {
  var state = src._readableState;
  var chunk;
  state.awaitDrain = 0;

  function write(dest, i, list) {
    var written = dest.write(chunk);
    if (false === written) {
      state.awaitDrain++;
    }
  }

  while (state.pipesCount && null !== (chunk = src.read())) {

    if (state.pipesCount === 1)
      write(state.pipes, 0, null);
    else
      forEach(state.pipes, write);

    src.emit('data', chunk);

    // if anyone needs a drain, then we have to wait for that.
    if (state.awaitDrain > 0)
      return;
  }

  // if every destination was unpiped, either before entering this
  // function, or in the while loop, then stop flowing.
  //
  // NB: This is a pretty rare edge case.
  if (state.pipesCount === 0) {
    state.flowing = false;

    // if there were data event listeners added, then switch to old mode.
    if (EE.listenerCount(src, 'data') > 0)
      emitDataEvents(src);
    return;
  }

  // at this point, no one needed a drain, so we just ran out of data
  // on the next readable event, start it over again.
  state.ranOut = true;
}

function pipeOnReadable() {
  if (this._readableState.ranOut) {
    this._readableState.ranOut = false;
    flow(this);
  }
}


Readable.prototype.unpipe = function(dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0)
    return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes)
      return this;

    if (!dest)
      dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;
    if (dest)
      dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;

    for (var i = 0; i < len; i++)
      dests[i].emit('unpipe', this);
    return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1)
    return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1)
    state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function(ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data' && !this._readableState.flowing)
    emitDataEvents(this);

  if (ev === 'readable' && this.readable) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        this.read(0);
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function() {
  emitDataEvents(this);
  this.read(0);
  this.emit('resume');
};

Readable.prototype.pause = function() {
  emitDataEvents(this, true);
  this.emit('pause');
};

function emitDataEvents(stream, startPaused) {
  var state = stream._readableState;

  if (state.flowing) {
    // https://github.com/isaacs/readable-stream/issues/16
    throw new Error('Cannot switch to old mode now.');
  }

  var paused = startPaused || false;
  var readable = false;

  // convert to an old-style stream.
  stream.readable = true;
  stream.pipe = Stream.prototype.pipe;
  stream.on = stream.addListener = Stream.prototype.on;

  stream.on('readable', function() {
    readable = true;

    var c;
    while (!paused && (null !== (c = stream.read())))
      stream.emit('data', c);

    if (c === null) {
      readable = false;
      stream._readableState.needReadable = true;
    }
  });

  stream.pause = function() {
    paused = true;
    this.emit('pause');
  };

  stream.resume = function() {
    paused = false;
    if (readable)
      process.nextTick(function() {
        stream.emit('readable');
      });
    else
      this.read(0);
    this.emit('resume');
  };

  // now make it start, just in case it hadn't already.
  stream.emit('readable');
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function() {
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    if (state.decoder)
      chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    //if (state.objectMode && util.isNullOrUndefined(chunk))
    if (state.objectMode && (chunk === null || chunk === undefined))
      return;
    else if (!state.objectMode && (!chunk || !chunk.length))
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (typeof stream[i] === 'function' &&
        typeof this[i] === 'undefined') {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }}(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function(ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};



// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0)
    return null;

  if (length === 0)
    ret = null;
  else if (objectMode)
    ret = list.shift();
  else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode)
      ret = list.join('');
    else
      ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode)
        ret = '';
      else
        ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode)
          ret += buf.slice(0, cpy);
        else
          buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length)
          list[0] = buf.slice(cpy);
        else
          list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0)
    throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted && state.calledRead) {
    state.ended = true;
    process.nextTick(function() {
      // Check that we didn't get one last unshift.
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit('end');
      }
    });
  }
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf (xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}


/***/ }),

/***/ 4605:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

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


// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

module.exports = Transform;

var Duplex = __webpack_require__(6753);

/*<replacement>*/
var util = __webpack_require__(6497);
util.inherits = __webpack_require__(4378);
/*</replacement>*/

util.inherits(Transform, Duplex);


function TransformState(options, stream) {
  this.afterTransform = function(er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb)
    return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined)
    stream.push(data);

  if (cb)
    cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}


function Transform(options) {
  if (!(this instanceof Transform))
    return new Transform(options);

  Duplex.call(this, options);

  var ts = this._transformState = new TransformState(options, this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  this.once('finish', function() {
    if ('function' === typeof this._flush)
      this._flush(function(er) {
        done(stream, er);
      });
    else
      done(stream);
  });
}

Transform.prototype.push = function(chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function(chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function(chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform ||
        rs.needReadable ||
        rs.length < rs.highWaterMark)
      this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function(n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};


function done(stream, er) {
  if (er)
    return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var rs = stream._readableState;
  var ts = stream._transformState;

  if (ws.length)
    throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming)
    throw new Error('calling transform done when still transforming');

  return stream.push(null);
}


/***/ }),

/***/ 4229:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

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

// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

module.exports = Writable;

/*<replacement>*/
var Buffer = __webpack_require__(4300).Buffer;
/*</replacement>*/

Writable.WritableState = WritableState;


/*<replacement>*/
var util = __webpack_require__(6497);
util.inherits = __webpack_require__(4378);
/*</replacement>*/

var Stream = __webpack_require__(2781);

util.inherits(Writable, Stream);

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
}

function WritableState(options, stream) {
  options = options || {};

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function(er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.buffer = [];

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;
}

function Writable(options) {
  var Duplex = __webpack_require__(6753);

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function() {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};


function writeAfterEnd(stream, state, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  process.nextTick(function() {
    cb(er);
  });
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    process.nextTick(function() {
      cb(er);
    });
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  else if (!encoding)
    encoding = state.defaultEncoding;

  if (typeof cb !== 'function')
    cb = function() {};

  if (state.ended)
    writeAfterEnd(this, state, cb);
  else if (validChunk(this, state, chunk, cb))
    ret = writeOrBuffer(this, state, chunk, encoding, cb);

  return ret;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode &&
      state.decodeStrings !== false &&
      typeof chunk === 'string') {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);
  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret)
    state.needDrain = true;

  if (state.writing)
    state.buffer.push(new WriteReq(chunk, encoding, cb));
  else
    doWrite(stream, state, len, chunk, encoding, cb);

  return ret;
}

function doWrite(stream, state, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  if (sync)
    process.nextTick(function() {
      cb(er);
    });
  else
    cb(er);

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er)
    onwriteError(stream, state, sync, er, cb);
  else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(stream, state);

    if (!finished && !state.bufferProcessing && state.buffer.length)
      clearBuffer(stream, state);

    if (sync) {
      process.nextTick(function() {
        afterWrite(stream, state, finished, cb);
      });
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished)
    onwriteDrain(stream, state);
  cb();
  if (finished)
    finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}


// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;

  for (var c = 0; c < state.buffer.length; c++) {
    var entry = state.buffer[c];
    var chunk = entry.chunk;
    var encoding = entry.encoding;
    var cb = entry.callback;
    var len = state.objectMode ? 1 : chunk.length;

    doWrite(stream, state, len, chunk, encoding, cb);

    // if we didn't call the onwrite immediately, then
    // it means that we need to wait until it does.
    // also, that means that the chunk and cb are currently
    // being processed, so move the buffer counter past them.
    if (state.writing) {
      c++;
      break;
    }
  }

  state.bufferProcessing = false;
  if (c < state.buffer.length)
    state.buffer = state.buffer.slice(c);
  else
    state.buffer.length = 0;
}

Writable.prototype._write = function(chunk, encoding, cb) {
  cb(new Error('not implemented'));
};

Writable.prototype.end = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (typeof chunk !== 'undefined' && chunk !== null)
    this.write(chunk, encoding);

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished)
    endWritable(this, state, cb);
};


function needFinish(stream, state) {
  return (state.ending &&
          state.length === 0 &&
          !state.finished &&
          !state.writing);
}

function finishMaybe(stream, state) {
  var need = needFinish(stream, state);
  if (need) {
    state.finished = true;
    stream.emit('finish');
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished)
      process.nextTick(cb);
    else
      stream.once('finish', cb);
  }
  state.ended = true;
}


/***/ }),

/***/ 5799:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__(2725)


/***/ }),

/***/ 4219:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__(4605)


/***/ }),

/***/ 9909:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__(4229)


/***/ }),

/***/ 984:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = rimraf
rimraf.sync = rimrafSync

var assert = __webpack_require__(9491)
var path = __webpack_require__(1017)
var fs = __webpack_require__(7147)
var glob = undefined
try {
  glob = __webpack_require__(2884)
} catch (_err) {
  // treat glob as optional.
}
var _0666 = parseInt('666', 8)

var defaultGlobOpts = {
  nosort: true,
  silent: true
}

// for EMFILE handling
var timeout = 0

var isWindows = (process.platform === "win32")

function defaults (options) {
  var methods = [
    'unlink',
    'chmod',
    'stat',
    'lstat',
    'rmdir',
    'readdir'
  ]
  methods.forEach(function(m) {
    options[m] = options[m] || fs[m]
    m = m + 'Sync'
    options[m] = options[m] || fs[m]
  })

  options.maxBusyTries = options.maxBusyTries || 3
  options.emfileWait = options.emfileWait || 1000
  if (options.glob === false) {
    options.disableGlob = true
  }
  if (options.disableGlob !== true && glob === undefined) {
    throw Error('glob dependency not found, set `options.disableGlob = true` if intentional')
  }
  options.disableGlob = options.disableGlob || false
  options.glob = options.glob || defaultGlobOpts
}

function rimraf (p, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }

  assert(p, 'rimraf: missing path')
  assert.equal(typeof p, 'string', 'rimraf: path should be a string')
  assert.equal(typeof cb, 'function', 'rimraf: callback function required')
  assert(options, 'rimraf: invalid options argument provided')
  assert.equal(typeof options, 'object', 'rimraf: options should be object')

  defaults(options)

  var busyTries = 0
  var errState = null
  var n = 0

  if (options.disableGlob || !glob.hasMagic(p))
    return afterGlob(null, [p])

  options.lstat(p, function (er, stat) {
    if (!er)
      return afterGlob(null, [p])

    glob(p, options.glob, afterGlob)
  })

  function next (er) {
    errState = errState || er
    if (--n === 0)
      cb(errState)
  }

  function afterGlob (er, results) {
    if (er)
      return cb(er)

    n = results.length
    if (n === 0)
      return cb()

    results.forEach(function (p) {
      rimraf_(p, options, function CB (er) {
        if (er) {
          if ((er.code === "EBUSY" || er.code === "ENOTEMPTY" || er.code === "EPERM") &&
              busyTries < options.maxBusyTries) {
            busyTries ++
            var time = busyTries * 100
            // try again, with the same exact callback as this one.
            return setTimeout(function () {
              rimraf_(p, options, CB)
            }, time)
          }

          // this one won't happen if graceful-fs is used.
          if (er.code === "EMFILE" && timeout < options.emfileWait) {
            return setTimeout(function () {
              rimraf_(p, options, CB)
            }, timeout ++)
          }

          // already gone
          if (er.code === "ENOENT") er = null
        }

        timeout = 0
        next(er)
      })
    })
  }
}

// Two possible strategies.
// 1. Assume it's a file.  unlink it, then do the dir stuff on EPERM or EISDIR
// 2. Assume it's a directory.  readdir, then do the file stuff on ENOTDIR
//
// Both result in an extra syscall when you guess wrong.  However, there
// are likely far more normal files in the world than directories.  This
// is based on the assumption that a the average number of files per
// directory is >= 1.
//
// If anyone ever complains about this, then I guess the strategy could
// be made configurable somehow.  But until then, YAGNI.
function rimraf_ (p, options, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')

  // sunos lets the root user unlink directories, which is... weird.
  // so we have to lstat here and make sure it's not a dir.
  options.lstat(p, function (er, st) {
    if (er && er.code === "ENOENT")
      return cb(null)

    // Windows can EPERM on stat.  Life is suffering.
    if (er && er.code === "EPERM" && isWindows)
      fixWinEPERM(p, options, er, cb)

    if (st && st.isDirectory())
      return rmdir(p, options, er, cb)

    options.unlink(p, function (er) {
      if (er) {
        if (er.code === "ENOENT")
          return cb(null)
        if (er.code === "EPERM")
          return (isWindows)
            ? fixWinEPERM(p, options, er, cb)
            : rmdir(p, options, er, cb)
        if (er.code === "EISDIR")
          return rmdir(p, options, er, cb)
      }
      return cb(er)
    })
  })
}

function fixWinEPERM (p, options, er, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')
  if (er)
    assert(er instanceof Error)

  options.chmod(p, _0666, function (er2) {
    if (er2)
      cb(er2.code === "ENOENT" ? null : er)
    else
      options.stat(p, function(er3, stats) {
        if (er3)
          cb(er3.code === "ENOENT" ? null : er)
        else if (stats.isDirectory())
          rmdir(p, options, er, cb)
        else
          options.unlink(p, cb)
      })
  })
}

function fixWinEPERMSync (p, options, er) {
  assert(p)
  assert(options)
  if (er)
    assert(er instanceof Error)

  try {
    options.chmodSync(p, _0666)
  } catch (er2) {
    if (er2.code === "ENOENT")
      return
    else
      throw er
  }

  try {
    var stats = options.statSync(p)
  } catch (er3) {
    if (er3.code === "ENOENT")
      return
    else
      throw er
  }

  if (stats.isDirectory())
    rmdirSync(p, options, er)
  else
    options.unlinkSync(p)
}

function rmdir (p, options, originalEr, cb) {
  assert(p)
  assert(options)
  if (originalEr)
    assert(originalEr instanceof Error)
  assert(typeof cb === 'function')

  // try to rmdir first, and only readdir on ENOTEMPTY or EEXIST (SunOS)
  // if we guessed wrong, and it's not a directory, then
  // raise the original error.
  options.rmdir(p, function (er) {
    if (er && (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM"))
      rmkids(p, options, cb)
    else if (er && er.code === "ENOTDIR")
      cb(originalEr)
    else
      cb(er)
  })
}

function rmkids(p, options, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')

  options.readdir(p, function (er, files) {
    if (er)
      return cb(er)
    var n = files.length
    if (n === 0)
      return options.rmdir(p, cb)
    var errState
    files.forEach(function (f) {
      rimraf(path.join(p, f), options, function (er) {
        if (errState)
          return
        if (er)
          return cb(errState = er)
        if (--n === 0)
          options.rmdir(p, cb)
      })
    })
  })
}

// this looks simpler, and is strictly *faster*, but will
// tie up the JavaScript thread and fail on excessively
// deep directory trees.
function rimrafSync (p, options) {
  options = options || {}
  defaults(options)

  assert(p, 'rimraf: missing path')
  assert.equal(typeof p, 'string', 'rimraf: path should be a string')
  assert(options, 'rimraf: missing options')
  assert.equal(typeof options, 'object', 'rimraf: options should be object')

  var results

  if (options.disableGlob || !glob.hasMagic(p)) {
    results = [p]
  } else {
    try {
      options.lstatSync(p)
      results = [p]
    } catch (er) {
      results = glob.sync(p, options.glob)
    }
  }

  if (!results.length)
    return

  for (var i = 0; i < results.length; i++) {
    var p = results[i]

    try {
      var st = options.lstatSync(p)
    } catch (er) {
      if (er.code === "ENOENT")
        return

      // Windows can EPERM on stat.  Life is suffering.
      if (er.code === "EPERM" && isWindows)
        fixWinEPERMSync(p, options, er)
    }

    try {
      // sunos lets the root user unlink directories, which is... weird.
      if (st && st.isDirectory())
        rmdirSync(p, options, null)
      else
        options.unlinkSync(p)
    } catch (er) {
      if (er.code === "ENOENT")
        return
      if (er.code === "EPERM")
        return isWindows ? fixWinEPERMSync(p, options, er) : rmdirSync(p, options, er)
      if (er.code !== "EISDIR")
        throw er

      rmdirSync(p, options, er)
    }
  }
}

function rmdirSync (p, options, originalEr) {
  assert(p)
  assert(options)
  if (originalEr)
    assert(originalEr instanceof Error)

  try {
    options.rmdirSync(p)
  } catch (er) {
    if (er.code === "ENOENT")
      return
    if (er.code === "ENOTDIR")
      throw originalEr
    if (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM")
      rmkidsSync(p, options)
  }
}

function rmkidsSync (p, options) {
  assert(p)
  assert(options)
  options.readdirSync(p).forEach(function (f) {
    rimrafSync(path.join(p, f), options)
  })

  // We only end up here once we got ENOTEMPTY at least once, and
  // at this point, we are guaranteed to have removed all the kids.
  // So, we know that it won't be ENOENT or ENOTDIR or anything else.
  // try really hard to delete stuff on windows, because it has a
  // PROFOUNDLY annoying habit of not closing handles promptly when
  // files are deleted, resulting in spurious ENOTEMPTY errors.
  var retries = isWindows ? 100 : 1
  var i = 0
  do {
    var threw = true
    try {
      var ret = options.rmdirSync(p, options)
      threw = false
      return ret
    } finally {
      if (++i < retries && threw)
        continue
    }
  } while (true)
}


/***/ }),

/***/ 4889:
/***/ (function() {

(function (global, undefined) {
    "use strict";

    if (global.setImmediate) {
        return;
    }

    var nextHandle = 1; // Spec says greater than zero
    var tasksByHandle = {};
    var currentlyRunningATask = false;
    var doc = global.document;
    var registerImmediate;

    function setImmediate(callback) {
      // Callback can either be a function or a string
      if (typeof callback !== "function") {
        callback = new Function("" + callback);
      }
      // Copy function arguments
      var args = new Array(arguments.length - 1);
      for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i + 1];
      }
      // Store and register the task
      var task = { callback: callback, args: args };
      tasksByHandle[nextHandle] = task;
      registerImmediate(nextHandle);
      return nextHandle++;
    }

    function clearImmediate(handle) {
        delete tasksByHandle[handle];
    }

    function run(task) {
        var callback = task.callback;
        var args = task.args;
        switch (args.length) {
        case 0:
            callback();
            break;
        case 1:
            callback(args[0]);
            break;
        case 2:
            callback(args[0], args[1]);
            break;
        case 3:
            callback(args[0], args[1], args[2]);
            break;
        default:
            callback.apply(undefined, args);
            break;
        }
    }

    function runIfPresent(handle) {
        // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
        // So if we're currently running a task, we'll need to delay this invocation.
        if (currentlyRunningATask) {
            // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
            // "too much recursion" error.
            setTimeout(runIfPresent, 0, handle);
        } else {
            var task = tasksByHandle[handle];
            if (task) {
                currentlyRunningATask = true;
                try {
                    run(task);
                } finally {
                    clearImmediate(handle);
                    currentlyRunningATask = false;
                }
            }
        }
    }

    function installNextTickImplementation() {
        registerImmediate = function(handle) {
            process.nextTick(function () { runIfPresent(handle); });
        };
    }

    function canUsePostMessage() {
        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
        // where `global.postMessage` means something completely different and can't be used for this purpose.
        if (global.postMessage && !global.importScripts) {
            var postMessageIsAsynchronous = true;
            var oldOnMessage = global.onmessage;
            global.onmessage = function() {
                postMessageIsAsynchronous = false;
            };
            global.postMessage("", "*");
            global.onmessage = oldOnMessage;
            return postMessageIsAsynchronous;
        }
    }

    function installPostMessageImplementation() {
        // Installs an event handler on `global` for the `message` event: see
        // * https://developer.mozilla.org/en/DOM/window.postMessage
        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

        var messagePrefix = "setImmediate$" + Math.random() + "$";
        var onGlobalMessage = function(event) {
            if (event.source === global &&
                typeof event.data === "string" &&
                event.data.indexOf(messagePrefix) === 0) {
                runIfPresent(+event.data.slice(messagePrefix.length));
            }
        };

        if (global.addEventListener) {
            global.addEventListener("message", onGlobalMessage, false);
        } else {
            global.attachEvent("onmessage", onGlobalMessage);
        }

        registerImmediate = function(handle) {
            global.postMessage(messagePrefix + handle, "*");
        };
    }

    function installMessageChannelImplementation() {
        var channel = new MessageChannel();
        channel.port1.onmessage = function(event) {
            var handle = event.data;
            runIfPresent(handle);
        };

        registerImmediate = function(handle) {
            channel.port2.postMessage(handle);
        };
    }

    function installReadyStateChangeImplementation() {
        var html = doc.documentElement;
        registerImmediate = function(handle) {
            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
            var script = doc.createElement("script");
            script.onreadystatechange = function () {
                runIfPresent(handle);
                script.onreadystatechange = null;
                html.removeChild(script);
                script = null;
            };
            html.appendChild(script);
        };
    }

    function installSetTimeoutImplementation() {
        registerImmediate = function(handle) {
            setTimeout(runIfPresent, 0, handle);
        };
    }

    // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

    // Don't get fooled by e.g. browserify environments.
    if ({}.toString.call(global.process) === "[object process]") {
        // For Node.js before 0.9
        installNextTickImplementation();

    } else if (canUsePostMessage()) {
        // For non-IE10 modern browsers
        installPostMessageImplementation();

    } else if (global.MessageChannel) {
        // For web workers, where supported
        installMessageChannelImplementation();

    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
        // For IE 6–8
        installReadyStateChangeImplementation();

    } else {
        // For older browsers
        installSetTimeoutImplementation();
    }

    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
}(typeof self === "undefined" ? typeof global === "undefined" ? this : global : self));


/***/ }),

/***/ 664:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


module.exports = SliceStream;

var Transform = __webpack_require__(4219);
var inherits = __webpack_require__(3837).inherits;

inherits(SliceStream, Transform);

function SliceStream(opts, sliceFn) {
  if (!(this instanceof SliceStream)) {
    return new SliceStream(opts, sliceFn);
  }

  this._opts = opts;
  this._accumulatedLength = 0;
  this.sliceFn = sliceFn;

  Transform.call(this);
}

SliceStream.prototype._transform = function (chunk, encoding, callback) {
  this._accumulatedLength += chunk.length;

  if (this._accumulatedLength >= this._opts.length) {
    //todo handle more than one slice in a stream
    var offset = chunk.length - (this._accumulatedLength - this._opts.length);
    this.sliceFn(chunk.slice(0, offset), true, chunk.slice(offset));
    callback();
  } else {
    this.sliceFn(chunk);
    callback();
  }
};


/***/ }),

/***/ 6941:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

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

var Buffer = __webpack_require__(4300).Buffer;

var isBufferEncoding = Buffer.isEncoding
  || function(encoding) {
       switch (encoding && encoding.toLowerCase()) {
         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
         default: return false;
       }
     }


function assertEncoding(encoding) {
  if (encoding && !isBufferEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters. CESU-8 is handled as part of the UTF-8 encoding.
//
// @TODO Handling all encodings inside a single object makes it very difficult
// to reason about this code, so it should be split up in the future.
// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
// points as used by CESU-8.
var StringDecoder = exports.s = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  // Enough space to store all bytes of a single character. UTF-8 needs 4
  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
  this.charBuffer = new Buffer(6);
  // Number of bytes received for the current incomplete multi-byte character.
  this.charReceived = 0;
  // Number of bytes expected for the current incomplete multi-byte character.
  this.charLength = 0;
};


// write decodes the given buffer and returns it as JS string that is
// guaranteed to not contain any partial multi-byte characters. Any partial
// character found at the end of the buffer is buffered up, and will be
// returned when calling write again with the remaining bytes.
//
// Note: Converting a Buffer containing an orphan surrogate to a String
// currently works, but converting a String to a Buffer (via `new Buffer`, or
// Buffer#write) will replace incomplete surrogates with the unicode
// replacement character. See https://codereview.chromium.org/121173009/ .
StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var available = (buffer.length >= this.charLength - this.charReceived) ?
        this.charLength - this.charReceived :
        buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, 0, available);
    this.charReceived += available;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // remove bytes belonging to the current character from the buffer
    buffer = buffer.slice(available, buffer.length);

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (buffer.length === 0) {
      return charStr;
    }
    break;
  }

  // determine and set charLength / charReceived
  this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
    end -= this.charReceived;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    buffer.copy(this.charBuffer, 0, 0, size);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

// detectIncompleteChar determines if there is an incomplete UTF-8 character at
// the end of the given buffer. If so, it sets this.charLength to the byte
// length that character, and sets this.charReceived to the number of bytes
// that are available for this character.
StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }
  this.charReceived = i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 2;
  this.charLength = this.charReceived ? 2 : 0;
}

function base64DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 3;
  this.charLength = this.charReceived ? 3 : 0;
}


/***/ }),

/***/ 3692:
/***/ ((module) => {

module.exports = Traverse;
function Traverse (obj) {
    if (!(this instanceof Traverse)) return new Traverse(obj);
    this.value = obj;
}

Traverse.prototype.get = function (ps) {
    var node = this.value;
    for (var i = 0; i < ps.length; i ++) {
        var key = ps[i];
        if (!Object.hasOwnProperty.call(node, key)) {
            node = undefined;
            break;
        }
        node = node[key];
    }
    return node;
};

Traverse.prototype.set = function (ps, value) {
    var node = this.value;
    for (var i = 0; i < ps.length - 1; i ++) {
        var key = ps[i];
        if (!Object.hasOwnProperty.call(node, key)) node[key] = {};
        node = node[key];
    }
    node[ps[i]] = value;
    return value;
};

Traverse.prototype.map = function (cb) {
    return walk(this.value, cb, true);
};

Traverse.prototype.forEach = function (cb) {
    this.value = walk(this.value, cb, false);
    return this.value;
};

Traverse.prototype.reduce = function (cb, init) {
    var skip = arguments.length === 1;
    var acc = skip ? this.value : init;
    this.forEach(function (x) {
        if (!this.isRoot || !skip) {
            acc = cb.call(this, acc, x);
        }
    });
    return acc;
};

Traverse.prototype.deepEqual = function (obj) {
    if (arguments.length !== 1) {
        throw new Error(
            'deepEqual requires exactly one object to compare against'
        );
    }
    
    var equal = true;
    var node = obj;
    
    this.forEach(function (y) {
        var notEqual = (function () {
            equal = false;
            //this.stop();
            return undefined;
        }).bind(this);
        
        //if (node === undefined || node === null) return notEqual();
        
        if (!this.isRoot) {
        /*
            if (!Object.hasOwnProperty.call(node, this.key)) {
                return notEqual();
            }
        */
            if (typeof node !== 'object') return notEqual();
            node = node[this.key];
        }
        
        var x = node;
        
        this.post(function () {
            node = x;
        });
        
        var toS = function (o) {
            return Object.prototype.toString.call(o);
        };
        
        if (this.circular) {
            if (Traverse(obj).get(this.circular.path) !== x) notEqual();
        }
        else if (typeof x !== typeof y) {
            notEqual();
        }
        else if (x === null || y === null || x === undefined || y === undefined) {
            if (x !== y) notEqual();
        }
        else if (x.__proto__ !== y.__proto__) {
            notEqual();
        }
        else if (x === y) {
            // nop
        }
        else if (typeof x === 'function') {
            if (x instanceof RegExp) {
                // both regexps on account of the __proto__ check
                if (x.toString() != y.toString()) notEqual();
            }
            else if (x !== y) notEqual();
        }
        else if (typeof x === 'object') {
            if (toS(y) === '[object Arguments]'
            || toS(x) === '[object Arguments]') {
                if (toS(x) !== toS(y)) {
                    notEqual();
                }
            }
            else if (x instanceof Date || y instanceof Date) {
                if (!(x instanceof Date) || !(y instanceof Date)
                || x.getTime() !== y.getTime()) {
                    notEqual();
                }
            }
            else {
                var kx = Object.keys(x);
                var ky = Object.keys(y);
                if (kx.length !== ky.length) return notEqual();
                for (var i = 0; i < kx.length; i++) {
                    var k = kx[i];
                    if (!Object.hasOwnProperty.call(y, k)) {
                        notEqual();
                    }
                }
            }
        }
    });
    
    return equal;
};

Traverse.prototype.paths = function () {
    var acc = [];
    this.forEach(function (x) {
        acc.push(this.path); 
    });
    return acc;
};

Traverse.prototype.nodes = function () {
    var acc = [];
    this.forEach(function (x) {
        acc.push(this.node);
    });
    return acc;
};

Traverse.prototype.clone = function () {
    var parents = [], nodes = [];
    
    return (function clone (src) {
        for (var i = 0; i < parents.length; i++) {
            if (parents[i] === src) {
                return nodes[i];
            }
        }
        
        if (typeof src === 'object' && src !== null) {
            var dst = copy(src);
            
            parents.push(src);
            nodes.push(dst);
            
            Object.keys(src).forEach(function (key) {
                dst[key] = clone(src[key]);
            });
            
            parents.pop();
            nodes.pop();
            return dst;
        }
        else {
            return src;
        }
    })(this.value);
};

function walk (root, cb, immutable) {
    var path = [];
    var parents = [];
    var alive = true;
    
    return (function walker (node_) {
        var node = immutable ? copy(node_) : node_;
        var modifiers = {};
        
        var state = {
            node : node,
            node_ : node_,
            path : [].concat(path),
            parent : parents.slice(-1)[0],
            key : path.slice(-1)[0],
            isRoot : path.length === 0,
            level : path.length,
            circular : null,
            update : function (x) {
                if (!state.isRoot) {
                    state.parent.node[state.key] = x;
                }
                state.node = x;
            },
            'delete' : function () {
                delete state.parent.node[state.key];
            },
            remove : function () {
                if (Array.isArray(state.parent.node)) {
                    state.parent.node.splice(state.key, 1);
                }
                else {
                    delete state.parent.node[state.key];
                }
            },
            before : function (f) { modifiers.before = f },
            after : function (f) { modifiers.after = f },
            pre : function (f) { modifiers.pre = f },
            post : function (f) { modifiers.post = f },
            stop : function () { alive = false }
        };
        
        if (!alive) return state;
        
        if (typeof node === 'object' && node !== null) {
            state.isLeaf = Object.keys(node).length == 0;
            
            for (var i = 0; i < parents.length; i++) {
                if (parents[i].node_ === node_) {
                    state.circular = parents[i];
                    break;
                }
            }
        }
        else {
            state.isLeaf = true;
        }
        
        state.notLeaf = !state.isLeaf;
        state.notRoot = !state.isRoot;
        
        // use return values to update if defined
        var ret = cb.call(state, state.node);
        if (ret !== undefined && state.update) state.update(ret);
        if (modifiers.before) modifiers.before.call(state, state.node);
        
        if (typeof state.node == 'object'
        && state.node !== null && !state.circular) {
            parents.push(state);
            
            var keys = Object.keys(state.node);
            keys.forEach(function (key, i) {
                path.push(key);
                
                if (modifiers.pre) modifiers.pre.call(state, state.node[key], key);
                
                var child = walker(state.node[key]);
                if (immutable && Object.hasOwnProperty.call(state.node, key)) {
                    state.node[key] = child.node;
                }
                
                child.isLast = i == keys.length - 1;
                child.isFirst = i == 0;
                
                if (modifiers.post) modifiers.post.call(state, child);
                
                path.pop();
            });
            parents.pop();
        }
        
        if (modifiers.after) modifiers.after.call(state, state.node);
        
        return state;
    })(root).node;
}

Object.keys(Traverse.prototype).forEach(function (key) {
    Traverse[key] = function (obj) {
        var args = [].slice.call(arguments, 1);
        var t = Traverse(obj);
        return t[key].apply(t, args);
    };
});

function copy (src) {
    if (typeof src === 'object' && src !== null) {
        var dst;
        
        if (Array.isArray(src)) {
            dst = [];
        }
        else if (src instanceof Date) {
            dst = new Date(src);
        }
        else if (src instanceof Boolean) {
            dst = new Boolean(src);
        }
        else if (src instanceof Number) {
            dst = new Number(src);
        }
        else if (src instanceof String) {
            dst = new String(src);
        }
        else {
            dst = Object.create(Object.getPrototypeOf(src));
        }
        
        Object.keys(src).forEach(function (key) {
            dst[key] = src[key];
        });
        return dst;
    }
    else return src;
}


/***/ }),

/***/ 4688:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


module.exports = Entry;

var PassThrough = __webpack_require__(5799);
var inherits = __webpack_require__(3837).inherits;

inherits(Entry, PassThrough);

function Entry () {
  PassThrough.call(this);
  this.props = {};
}

Entry.prototype.autodrain = function () {
  this.on('readable', this.read.bind(this));
};


/***/ }),

/***/ 7032:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


module.exports = Extract;

var Parse = __webpack_require__(3267).Parse;
var Writer = __webpack_require__(8052).Writer;
var Writable = __webpack_require__(9909);
var path = __webpack_require__(1017);
var inherits = __webpack_require__(3837).inherits;

inherits(Extract, Writable);

function Extract (opts) {
  var self = this;
  if (!(this instanceof Extract)) {
    return new Extract(opts);
  }

  Writable.apply(this);
  this._opts = opts || { verbose: false };

  this._parser = Parse(this._opts);
  this._parser.on('error', function(err) {
    self.emit('error', err);
  });
  this.on('finish', function() {
    self._parser.end();
  });

  var writer = Writer({
    type: 'Directory',
    path: opts.path
  });
  writer.on('error', function(err) {
    self.emit('error', err);
  });
  writer.on('close', function() {
    self.emit('close')
  });

  this.on('pipe', function(source) {
    if (opts.verbose && source.path) {
      console.log('Archive: ', source.path);
    }
  });

  this._parser.pipe(writer);
}

Extract.prototype._write = function (chunk, encoding, callback) {
  if (this._parser.write(chunk)) {
    return callback();
  }

  return this._parser.once('drain', callback);
};


/***/ }),

/***/ 2204:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


module.exports = Parse.create = Parse;

__webpack_require__(4889);
var Transform = __webpack_require__(4219);
var inherits = __webpack_require__(3837).inherits;
var zlib = __webpack_require__(9796);
var binary = __webpack_require__(7740);
var PullStream = __webpack_require__(9746);
var MatchStream = __webpack_require__(3479);
var Entry = __webpack_require__(4688);

inherits(Parse, Transform);

function Parse(opts) {
  var self = this;
  if (!(this instanceof Parse)) {
    return new Parse(opts);
  }

  Transform.call(this, { lowWaterMark: 0 });
  this._opts = opts || { verbose: false };
  this._hasEntryListener = false;

  this._pullStream = new PullStream();
  this._pullStream.on("error", function (e) {
    self.emit('error', e);
  });
  this._pullStream.once("end", function () {
    self._streamEnd = true;
  });
  this._pullStream.once("finish", function () {
    self._streamFinish = true;
  });

  this._readRecord();
}

Parse.prototype._readRecord = function () {
  var self = this;
  this._pullStream.pull(4, function (err, data) {
    if (err) {
      return self.emit('error', err);
    }

    if (data.length === 0) {
      return;
    }

    var signature = data.readUInt32LE(0);
    if (signature === 0x04034b50) {
      self._readFile();
    } else if (signature === 0x02014b50) {
      self._readCentralDirectoryFileHeader();
    } else if (signature === 0x06054b50) {
      self._readEndOfCentralDirectoryRecord();
    } else {
      err = new Error('invalid signature: 0x' + signature.toString(16));
      self.emit('error', err);
    }
  });
};

Parse.prototype._readFile = function () {
  var self = this;
  this._pullStream.pull(26, function (err, data) {
    if (err) {
      return self.emit('error', err);
    }

    var vars = binary.parse(data)
      .word16lu('versionsNeededToExtract')
      .word16lu('flags')
      .word16lu('compressionMethod')
      .word16lu('lastModifiedTime')
      .word16lu('lastModifiedDate')
      .word32lu('crc32')
      .word32lu('compressedSize')
      .word32lu('uncompressedSize')
      .word16lu('fileNameLength')
      .word16lu('extraFieldLength')
      .vars;

    return self._pullStream.pull(vars.fileNameLength, function (err, fileName) {
      if (err) {
        return self.emit('error', err);
      }
      fileName = fileName.toString('utf8');
      var entry = new Entry();
      entry.path = fileName;
      entry.props.path = fileName;
      entry.type = (vars.compressedSize === 0 && /[\/\\]$/.test(fileName)) ? 'Directory' : 'File';

      if (self._opts.verbose) {
        if (entry.type === 'Directory') {
          console.log('   creating:', fileName);
        } else if (entry.type === 'File') {
          if (vars.compressionMethod === 0) {
            console.log(' extracting:', fileName);
          } else {
            console.log('  inflating:', fileName);
          }
        }
      }

      var hasEntryListener = self._hasEntryListener;
      if (hasEntryListener) {
        self.emit('entry', entry);
      }

      self._pullStream.pull(vars.extraFieldLength, function (err, extraField) {
        if (err) {
          return self.emit('error', err);
        }
        if (vars.compressionMethod === 0) {
          self._pullStream.pull(vars.compressedSize, function (err, compressedData) {
            if (err) {
              return self.emit('error', err);
            }

            if (hasEntryListener) {
              entry.write(compressedData);
              entry.end();
            }

            return self._readRecord();
          });
        } else {
          var fileSizeKnown = !(vars.flags & 0x08);

          var inflater = zlib.createInflateRaw();
          inflater.on('error', function (err) {
            self.emit('error', err);
          });

          if (fileSizeKnown) {
            entry.size = vars.uncompressedSize;
            if (hasEntryListener) {
              entry.on('finish', self._readRecord.bind(self));
              self._pullStream.pipe(vars.compressedSize, inflater).pipe(entry);
            } else {
              self._pullStream.drain(vars.compressedSize, function (err) {
                if (err) {
                  return self.emit('error', err);
                }
                self._readRecord();
              });
            }
          } else {
            var descriptorSig = new Buffer(4);
            descriptorSig.writeUInt32LE(0x08074b50, 0);

            var matchStream = new MatchStream({ pattern: descriptorSig }, function (buf, matched, extra) {
              if (hasEntryListener) {
                if (!matched) {
                  return this.push(buf);
                }
                this.push(buf);
              }
              setImmediate(function() {
                self._pullStream.unpipe();
                self._pullStream.prepend(extra);
                self._processDataDescriptor(entry);
              });
              return this.push(null);
            });

            self._pullStream.pipe(matchStream);
            if (hasEntryListener) {
              matchStream.pipe(inflater).pipe(entry);
            }
          }
        }
      });
    });
  });
};

Parse.prototype._processDataDescriptor = function (entry) {
  var self = this;
  this._pullStream.pull(16, function (err, data) {
    if (err) {
      return self.emit('error', err);
    }

    var vars = binary.parse(data)
      .word32lu('dataDescriptorSignature')
      .word32lu('crc32')
      .word32lu('compressedSize')
      .word32lu('uncompressedSize')
      .vars;

    entry.size = vars.uncompressedSize;
    self._readRecord();
  });
};

Parse.prototype._readCentralDirectoryFileHeader = function () {
  var self = this;
  this._pullStream.pull(42, function (err, data) {
    if (err) {
      return self.emit('error', err);
    }

    var vars = binary.parse(data)
      .word16lu('versionMadeBy')
      .word16lu('versionsNeededToExtract')
      .word16lu('flags')
      .word16lu('compressionMethod')
      .word16lu('lastModifiedTime')
      .word16lu('lastModifiedDate')
      .word32lu('crc32')
      .word32lu('compressedSize')
      .word32lu('uncompressedSize')
      .word16lu('fileNameLength')
      .word16lu('extraFieldLength')
      .word16lu('fileCommentLength')
      .word16lu('diskNumber')
      .word16lu('internalFileAttributes')
      .word32lu('externalFileAttributes')
      .word32lu('offsetToLocalFileHeader')
      .vars;

    return self._pullStream.pull(vars.fileNameLength, function (err, fileName) {
      if (err) {
        return self.emit('error', err);
      }
      fileName = fileName.toString('utf8');

      self._pullStream.pull(vars.extraFieldLength, function (err, extraField) {
        if (err) {
          return self.emit('error', err);
        }
        self._pullStream.pull(vars.fileCommentLength, function (err, fileComment) {
          if (err) {
            return self.emit('error', err);
          }
          return self._readRecord();
        });
      });
    });
  });
};

Parse.prototype._readEndOfCentralDirectoryRecord = function () {
  var self = this;
  this._pullStream.pull(18, function (err, data) {
    if (err) {
      return self.emit('error', err);
    }

    var vars = binary.parse(data)
      .word16lu('diskNumber')
      .word16lu('diskStart')
      .word16lu('numberOfRecordsOnDisk')
      .word16lu('numberOfRecords')
      .word32lu('sizeOfCentralDirectory')
      .word32lu('offsetToStartOfCentralDirectory')
      .word16lu('commentLength')
      .vars;

    if (vars.commentLength) {
      setImmediate(function() {
        self._pullStream.pull(vars.commentLength, function (err, comment) {
          if (err) {
            return self.emit('error', err);
          }
          comment = comment.toString('utf8');
          return self._pullStream.end();
        });
      });

    } else {
      self._pullStream.end();
    }
  });
};

Parse.prototype._transform = function (chunk, encoding, callback) {
  if (this._pullStream.write(chunk)) {
    return callback();
  }

  this._pullStream.once('drain', callback);
};

Parse.prototype.pipe = function (dest, opts) {
  var self = this;
  if (typeof dest.add === "function") {
    self.on("entry", function (entry) {
      dest.add(entry);
    })
  }
  return Transform.prototype.pipe.apply(this, arguments);
};

Parse.prototype._flush = function (callback) {
  if (!this._streamEnd || !this._streamFinish) {
    return setImmediate(this._flush.bind(this, callback));
  }

  this.emit('close');
  return callback();
};

Parse.prototype.addListener = function(type, listener) {
  if ('entry' === type) {
    this._hasEntryListener = true;
  }
  return Transform.prototype.addListener.call(this, type, listener);
};

Parse.prototype.on = Parse.prototype.addListener;


/***/ }),

/***/ 3267:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


exports.Parse = __webpack_require__(2204);
exports.Extract = __webpack_require__(7032);

/***/ }),

/***/ 2479:
/***/ ((module) => {

// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
module.exports = wrappy
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k]
  })

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i]
    }
    var ret = fn.apply(this, args)
    var cb = args[args.length-1]
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k]
      })
    }
    return ret
  }
}


/***/ }),

/***/ 9491:
/***/ ((module) => {

"use strict";
module.exports = require("assert");

/***/ }),

/***/ 4300:
/***/ ((module) => {

"use strict";
module.exports = require("buffer");

/***/ }),

/***/ 2057:
/***/ ((module) => {

"use strict";
module.exports = require("constants");

/***/ }),

/***/ 2361:
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ 7147:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 8188:
/***/ ((module) => {

"use strict";
module.exports = require("module");

/***/ }),

/***/ 1017:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ 2781:
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ 3837:
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ }),

/***/ 4655:
/***/ ((module) => {

"use strict";
module.exports = require("v8");

/***/ }),

/***/ 6144:
/***/ ((module) => {

"use strict";
module.exports = require("vm");

/***/ }),

/***/ 9796:
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ }),

/***/ 7121:
/***/ ((module) => {

"use strict";
module.exports = require("webos-service");

/***/ }),

/***/ 4147:
/***/ ((module) => {

"use strict";
module.exports = JSON.parse('{"name":"com.ioliz.dc.app.fileservice","version":"1.0.1","description":"file service","main":"index.js","scripts":{"build":"webpack"},"author":"","license":"BSD","dependencies":{"unzip":"^0.1.11"},"devDependencies":{"clean-webpack-plugin":"^4.0.0","copy-webpack-plugin":"^9.0.1","webpack":"^5.58.2","webpack-cli":"^4.9.0"}}');

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
// note: The JS service must be packaged along with the app.
// File I/O Service
// A webOS service sample using Node.js fs, crypto and unzip library functions
/*
If the JS service uses methods of external services, 
you must add the group information of the external methods to the requiredPermissions field in appinfo.json
 of the app used for packaging the JS service. See Configuring the Web App for details.
*/
//package.json->externals->ignore compile like @ts-ignore
//require npm install parcel-plugin-externals
//如果出现app无法安装的情况， 主要原因就是js-service代码无法执行引起，可以通过
//journalctl -S "1 hour ago"
//命令查看导致代码无法执行的原因， 远程到/media/developer/apps/usr/plams目录定位类似一下错误，先远程修复，再重新安装
/*
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]: ReferenceError: webos is not defined
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]:     at Object.159 (/media/developer/apps/usr/palm/services/com.ioliz.dc.app.fileservice/index.js:24:18)
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]:     at __webpack_require__ (/media/developer/apps/usr/palm/services/com.ioliz.dc.app.fileservice/index.js:56:41)
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]:     at /media/developer/apps/usr/palm/services/com.ioliz.dc.app.fileservice/index.js:76:17
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]:     at /media/developer/apps/usr/palm/services/com.ioliz.dc.app.fileservice/index.js:266:3
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]:     at Object.<anonymous> (/media/developer/apps/usr/palm/services/com.ioliz.dc.app.fileservice/index.js:268:12)
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]:     at Module._compile (internal/modules/cjs/loader.js:999:30)
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]:     at Object.Module._extensions..js (internal/modules/cjs/loader.js:1027:10)
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]:     at Module.load (internal/modules/cjs/loader.js:863:32)
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]:     at Function.Module._load (internal/modules/cjs/loader.js:708:14)
Oct 17 18:06:10 raspberrypi4 ls-hubd[1534]:     at Module.require (internal/modules/cjs/loader.js:887:19)
*/
const Service = __webpack_require__(7121);
const pkgInfo = __webpack_require__(4147);
const service = new Service(pkgInfo.name);
service.activityManager.idleTimeout = 5

//const crypto = require("crypto");
const fs = __webpack_require__(7147);

// copyFile
service.register("copyFile", function(message) {
  var originalPath =  message.payload.originalPath;
  var copyPath =  message.payload.copyPath;

  // createReadStream & createWriteStream
  var inputFile = fs.createReadStream(originalPath);
  var outputFile = fs.createWriteStream(copyPath);

  // Error handling
  inputFile.on("error", function(err) {
    message.respond({
      returnValue: false,
      errorCode: "copyFile createReadStream ERROR",
      errorText: err
    });
  });

  outputFile.on("error", function(err) {
    message.respond({
      returnValue: false,
      errorCode: "copyFile createWriteStream ERROR",
      errorText: err
    });
  });

  // Do copy & End event
  inputFile.pipe(outputFile).on("close", function(err) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "copyFile createWriteStream ERROR",
        errorText: err
      });
    } else {
      message.respond({
        returnValue: true
      });
    }
  });
});

// exists
service.register("exists", function(message) {
  var path =  message.payload.path;

  fs.exists(path, function(exists) {
    message.respond({
      returnValue: exists,
    });
  });
});

// listFiles
service.register("listFiles", function(message) {
  var path =  message.payload.path;

  fs.readdir(path, function(err, files) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "listFiles ERROR",
        errorText: err
      });
    } else {
      message.respond({
        returnValue: true,
        files: files
      });
    }
  });
});

// mkdir
service.register("mkdir", function(message) {
  var path =  message.payload.path;
  console.log("path", path);
  fs.mkdir(path, function(err) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "mkdir ERROR",
        errorText: err
      });
    } else {
      message.respond({
        returnValue: true
      });
    }
  });
});

// rmdir
service.register("rmdir", function(message) {
  var path =  message.payload.path;

  fs.rmdir(path, function(err) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "rmdir ERROR",
        errorText: err
      });
    } else {
      message.respond({
        returnValue: true
      });
    }
  });
});

// moveFile
service.register("moveFile", function(message) {
  var originalPath =  message.payload.originalPath;
  var destinationPath =  message.payload.destinationPath;

  fs.rename(originalPath, destinationPath, function(err) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "rename ERROR",
        errorText: err
      });
    } else {
      message.respond({
        returnValue: true
      });
    }
  });
});

// readFile
service.register("readFile", function(message) {
  var path =  message.payload.path;
  var encoding = message.payload.encoding;

  fs.readFile(path, encoding, function(err, data) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "readFile ERROR",
        errorText: err
      });
    } else {
      message.respond({
        returnValue: true,
        data: data
      });
    }
  });
});

// removeFile
service.register("removeFile", function(message) {
  var path =  message.payload.path;

  fs.unlink(path, function(err) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "removeFile ERROR",
        errorText: err
      });
    } else {
      message.respond({
        returnValue: true
      });
    }
  });
});

// unzipFile
service.register("unzipFile", function(message) {
  const unzip = __webpack_require__(3267);

  var zipFilePath =  message.payload.zipFilePath;
  var extractToDirectoryPath =  message.payload.extractToDirectoryPath;

  // createReadStream
  var readStream = fs.createReadStream(zipFilePath);

  // Error handling
  readStream.on("error", function(err) {
    message.respond({
      returnValue: false,
      errorCode: "unzipFile createReadStream ERROR",
      errorText: err
    });
  });

  // Do unzip & End event
  readStream
    .pipe(
      unzip.Extract({
        path: extractToDirectoryPath
      })
    )
    .on("close", function(err) {
      if (err) {
        message.respond({
          returnValue: false,
          errorCode: "unzipFile Extract ERROR",
          errorText: err
        });
      } else {
        message.respond({
          returnValue: true
        });
      }
    });
});

// writeFile
service.register("writeFile", function(message) {
  var path =  message.payload.path;
  var data = message.payload.data;
  var encoding = message.payload.encoding;

  fs.writeFile(path, data, encoding, function(err) {
    if (err) {
      message.respond({
        returnValue: false,
        errorCode: "writeFile ERROR",
        errorText: err
      });
    } else {
      message.respond({
        returnValue: true
      });
    }
  });
})
})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7O0FDN0RBLGVBQWUsbUJBQU8sQ0FBQyxJQUFVO0FBQ2pDLG1CQUFtQixzQ0FBOEI7QUFDakQsY0FBYyxtQkFBTyxDQUFDLElBQVM7QUFDL0IsV0FBVyxtQkFBTyxDQUFDLElBQWU7QUFDbEMsYUFBYSxnQ0FBd0I7O0FBRXJDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBOztBQUVBLGNBQWM7QUFDZDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwyQkFBMkI7QUFDM0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGdEQUFnRDtBQUNoRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQixhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQixhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxrQkFBa0I7QUFDbEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakIsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTs7QUFFQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDRCQUE0QjtBQUM1QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGtDQUFrQztBQUNsQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx3QkFBd0IsaURBQWlEO0FBQ3pFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLG9CQUFvQixrQkFBa0I7QUFDdEM7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0Esb0JBQW9CLGtCQUFrQjtBQUN0QztBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7O0FDNVlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNB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QUMzRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQTtBQUNBLHNCQUFzQixtQ0FBbUM7QUFDekQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBLG9CQUFvQjtBQUNwQixVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBLE1BQU07QUFDTjtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7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OztBQUVBO0FBQ0EsY0FBYztBQUNkOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxLQUFLOztBQUVMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7Ozs7Ozs7QUNwUUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUEsU0FBUyxtQkFBTyxDQUFDLElBQWE7QUFDOUIsY0FBYyxtQkFBTyxDQUFDLElBQWU7QUFDckMsZUFBZSxtQkFBTyxDQUFDLElBQVU7QUFDakMsWUFBWSxtQkFBTyxDQUFDLElBQVE7QUFDNUIsYUFBYSxtQkFBTyxDQUFDLElBQWE7O0FBRWxDOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7OztBQ3BDQTs7QUFFQSxTQUFTLG1CQUFPLENBQUMsSUFBYTtBQUM5QixlQUFlLG1CQUFPLENBQUMsSUFBVTtBQUNqQyxhQUFhLG1CQUFPLENBQUMsR0FBUTtBQUM3QixZQUFZLG1CQUFPLENBQUMsSUFBUTtBQUM1QixXQUFXLG1CQUFPLENBQUMsSUFBTTtBQUN6QjtBQUNBLGNBQWMsbUJBQU8sQ0FBQyxJQUFlO0FBQ3JDLGVBQWUsbUJBQU8sQ0FBQyxJQUFlOztBQUV0QztBQUNBOztBQUVBO0FBQ0E7O0FBRUEsZ0JBQWdCLG1CQUFPLENBQUMsSUFBaUI7QUFDekMsaUJBQWlCLG1CQUFPLENBQUMsSUFBa0I7QUFDM0MsaUJBQWlCLG1CQUFPLENBQUMsSUFBa0I7QUFDM0Msa0JBQWtCLG1CQUFPLENBQUMsSUFBbUI7O0FBRTdDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxjQUFjO0FBQ2Q7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxjQUFjLGlCQUFpQjtBQUMvQjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYLFNBQVM7QUFDVCxPQUFPO0FBQ1A7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsSUFBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSxJQUFJO0FBQ0osNkNBQTZDO0FBQzdDO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QTtBQUNBO0FBQ0Esa0JBQWtCLFNBQVM7QUFDM0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxvQkFBb0Isb0JBQW9CO0FBQ3hDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUEsa0JBQWtCLFNBQVM7QUFDM0I7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUCxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOzs7Ozs7OztBQ2x4QkE7QUFDQTs7QUFFQSxTQUFTLG1CQUFPLENBQUMsSUFBYTtBQUM5QixnQkFBZ0IsbUJBQU8sQ0FBQyxJQUFXO0FBQ25DO0FBQ0EsV0FBVyw4QkFBeUI7QUFDcEMsV0FBVyxtQkFBTyxDQUFDLElBQU07QUFDekIsV0FBVyxtQkFBTyxDQUFDLElBQU07QUFDekIsYUFBYSxtQkFBTyxDQUFDLElBQVE7QUFDN0IsaUJBQWlCLG1CQUFPLENBQUMsSUFBa0I7QUFDM0MsYUFBYSxtQkFBTyxDQUFDLElBQWE7QUFDbEM7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0Esa0JBQWtCLE9BQU87QUFDekI7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0Esa0JBQWtCLG9CQUFvQjtBQUN0QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUEsb0JBQW9CLFNBQVM7QUFDN0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxrQkFBa0IsU0FBUztBQUMzQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0JBQW9CLG9CQUFvQjtBQUN4QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBLGtCQUFrQixTQUFTO0FBQzNCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFF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QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQSxNQUFNO0FBQ04sTUFBTTtBQUNOO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxLQUFLLElBQUk7QUFDVCxLQUFLLEdBQUc7QUFDUixLQUFLLEtBQUs7QUFDVixLQUFLLElBQUksSUFBSSxFQUFFO0FBQ2YsS0FBSyxJQUFJLEVBQUUsSUFBSTtBQUNmO0FBQ0E7QUFDQSxLQUFLLElBQUksT0FBTyxJQUFJO0FBQ3BCLEtBQUssRUFBRSxPQUFPLEVBQUU7QUFDaEI7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLHNCQUFzQixJQUFJO0FBQzFCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxvQ0FBb0MsSUFBSTtBQUN4QztBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLE1BQU07QUFDTixNQUFNO0FBQ047O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsWUFBWTtBQUNaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQSxNQUFNO0FBQ04sSUFBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0NBQW9DLElBQUk7QUFDeEM7QUFDQTtBQUNBO0FBQ0EsZ0NBQWdDLEVBQUUsRUFBRSxLQUFLO0FBQ3pDO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHlDQUF5QyxRQUFRO0FBQ2pEOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnQkFBZ0Isc0JBQXNCO0FBQ3RDO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLDZDQUE2QztBQUM3Qzs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMLEdBQUc7O0FBRUg7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EseUJBQXlCLFFBQVE7QUFDakM7QUFDQTtBQUNBOztBQUVBLGNBQWMsZ0JBQWdCO0FBQzlCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLE1BQU0sNENBQTRDOztBQUVsRDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUixRQUFRO0FBQ1I7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxlQUFlLFNBQVM7QUFDeEI7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Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGtCQUFrQix5QkFBeUI7QUFDM0M7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7QUMzT2E7O0FBRWI7QUFDQTtBQUNBOztBQUVB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OztBQUVBO0FBQ0E7QUFDQTtBQUNBLG9CQUFvQixnREFBd0M7QUFDNUQ7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBLG9CQUFvQixRQUFRO0FBQzVCO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLG9CQUFvQixTQUFTO0FBQzdCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNB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Q0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1AsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBOztBQUVBLGtCQUFrQix5QkFBeUI7QUFDM0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxTQUFTLE9BQU87QUFDaEI7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7OztBQzVOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxvQkFBb0IsZUFBZTtBQUNuQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLG9CQUFvQixtQkFBbUI7QUFDdkM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0wsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1AsTUFBTTtBQUNOO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxHQUFHO0FBQ0gsQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0wsR0FBRztBQUNILENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxHQUFHO0FBQ0gsQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1AsTUFBTTtBQUNOO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxHQUFHO0FBQ0gsQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1AsTUFBTTtBQUNOO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxHQUFHO0FBQ0gsQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUCxNQUFNO0FBQ047QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBLEdBQUc7QUFDSCxDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxHQUFHO0FBQ0gsQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1AsTUFBTTtBQUNOO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxHQUFHO0FBQ0gsQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBLGdCQUFnQixtQkFBTyxDQUFDLElBQU87QUFDL0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0wsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVCxRQUFRO0FBQ1I7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBLEtBQUs7QUFDTCxDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1AsTUFBTTtBQUNOO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxHQUFHO0FBQ0gsQ0FBQyxDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9iYWxhbmNlZC1tYXRjaC9pbmRleC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2JpbmFyeS9pbmRleC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2JpbmFyeS9saWIvdmFycy5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2JyYWNlLWV4cGFuc2lvbi9pbmRleC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2J1ZmZlcnMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9jaGFpbnNhdy9pbmRleC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2NvbmNhdC1tYXAvaW5kZXguanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9jb3JlLXV0aWwtaXMvbGliL3V0aWwuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9mcy5yZWFscGF0aC9pbmRleC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2ZzLnJlYWxwYXRoL29sZC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2ZzdHJlYW0vZnN0cmVhbS5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2ZzdHJlYW0vbGliL2Fic3RyYWN0LmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZnN0cmVhbS9saWIvY29sbGVjdC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2ZzdHJlYW0vbGliL2Rpci1yZWFkZXIuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9mc3RyZWFtL2xpYi9kaXItd3JpdGVyLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZnN0cmVhbS9saWIvZmlsZS1yZWFkZXIuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9mc3RyZWFtL2xpYi9maWxlLXdyaXRlci5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2ZzdHJlYW0vbGliL2dldC10eXBlLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZnN0cmVhbS9saWIvbGluay1yZWFkZXIuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9mc3RyZWFtL2xpYi9saW5rLXdyaXRlci5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2ZzdHJlYW0vbGliL3Byb3h5LXJlYWRlci5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2ZzdHJlYW0vbGliL3Byb3h5LXdyaXRlci5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2ZzdHJlYW0vbGliL3JlYWRlci5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2ZzdHJlYW0vbGliL3NvY2tldC1yZWFkZXIuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9mc3RyZWFtL2xpYi93cml0ZXIuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9mc3RyZWFtL25vZGVfbW9kdWxlcy9ncmFjZWZ1bC1mcy9mcy5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2ZzdHJlYW0vbm9kZV9tb2R1bGVzL2dyYWNlZnVsLWZzL2dyYWNlZnVsLWZzLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZnN0cmVhbS9ub2RlX21vZHVsZXMvZ3JhY2VmdWwtZnMvcG9seWZpbGxzLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZ2xvYi9jb21tb24uanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9nbG9iL2dsb2IuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9nbG9iL3N5bmMuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9pbmZsaWdodC9pbmZsaWdodC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2lzYXJyYXkvaW5kZXguanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9tYXRjaC1zdHJlYW0vbWF0Y2guanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9taW5pbWF0Y2gvbWluaW1hdGNoLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvbWtkaXJwL2luZGV4LmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvbmF0aXZlcy9pbmRleC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL25hdGl2ZXN8c3luYyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL29uY2Uvb25jZS5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL292ZXIvb3ZlcmxvYWQuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9wYXRoLWlzLWFic29sdXRlL2luZGV4LmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvcHVsbHN0cmVhbS9wdWxsc3RyZWFtLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvcmVhZGFibGUtc3RyZWFtL2xpYi9fc3RyZWFtX2R1cGxleC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9saWIvX3N0cmVhbV9wYXNzdGhyb3VnaC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9saWIvX3N0cmVhbV9yZWFkYWJsZS5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9saWIvX3N0cmVhbV90cmFuc2Zvcm0uanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vbGliL19zdHJlYW1fd3JpdGFibGUuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vcGFzc3Rocm91Z2guanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vdHJhbnNmb3JtLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvcmVhZGFibGUtc3RyZWFtL3dyaXRhYmxlLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvcmltcmFmL3JpbXJhZi5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL3NldGltbWVkaWF0ZS9zZXRJbW1lZGlhdGUuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9zbGljZS1zdHJlYW0vc2xpY2VzdHJlYW0uanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9zdHJpbmdfZGVjb2Rlci9pbmRleC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL3RyYXZlcnNlL2luZGV4LmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvdW56aXAvbGliL2VudHJ5LmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvdW56aXAvbGliL2V4dHJhY3QuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy91bnppcC9saWIvcGFyc2UuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy91bnppcC91bnppcC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL3dyYXBweS93cmFwcHkuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS9leHRlcm5hbCBub2RlLWNvbW1vbmpzIFwiYXNzZXJ0XCIiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS9leHRlcm5hbCBub2RlLWNvbW1vbmpzIFwiYnVmZmVyXCIiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS9leHRlcm5hbCBub2RlLWNvbW1vbmpzIFwiY29uc3RhbnRzXCIiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS9leHRlcm5hbCBub2RlLWNvbW1vbmpzIFwiZXZlbnRzXCIiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS9leHRlcm5hbCBub2RlLWNvbW1vbmpzIFwiZnNcIiIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJtb2R1bGVcIiIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJwYXRoXCIiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS9leHRlcm5hbCBub2RlLWNvbW1vbmpzIFwic3RyZWFtXCIiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS9leHRlcm5hbCBub2RlLWNvbW1vbmpzIFwidXRpbFwiIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvZXh0ZXJuYWwgbm9kZS1jb21tb25qcyBcInY4XCIiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS9leHRlcm5hbCBub2RlLWNvbW1vbmpzIFwidm1cIiIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJ6bGliXCIiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS9leHRlcm5hbCB2YXIgXCJyZXF1aXJlKFxcXCJ3ZWJvcy1zZXJ2aWNlXFxcIilcIiIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2Uvd2VicGFjay9ydW50aW1lL2hhc093blByb3BlcnR5IHNob3J0aGFuZCIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBiYWxhbmNlZDtcbmZ1bmN0aW9uIGJhbGFuY2VkKGEsIGIsIHN0cikge1xuICBpZiAoYSBpbnN0YW5jZW9mIFJlZ0V4cCkgYSA9IG1heWJlTWF0Y2goYSwgc3RyKTtcbiAgaWYgKGIgaW5zdGFuY2VvZiBSZWdFeHApIGIgPSBtYXliZU1hdGNoKGIsIHN0cik7XG5cbiAgdmFyIHIgPSByYW5nZShhLCBiLCBzdHIpO1xuXG4gIHJldHVybiByICYmIHtcbiAgICBzdGFydDogclswXSxcbiAgICBlbmQ6IHJbMV0sXG4gICAgcHJlOiBzdHIuc2xpY2UoMCwgclswXSksXG4gICAgYm9keTogc3RyLnNsaWNlKHJbMF0gKyBhLmxlbmd0aCwgclsxXSksXG4gICAgcG9zdDogc3RyLnNsaWNlKHJbMV0gKyBiLmxlbmd0aClcbiAgfTtcbn1cblxuZnVuY3Rpb24gbWF5YmVNYXRjaChyZWcsIHN0cikge1xuICB2YXIgbSA9IHN0ci5tYXRjaChyZWcpO1xuICByZXR1cm4gbSA/IG1bMF0gOiBudWxsO1xufVxuXG5iYWxhbmNlZC5yYW5nZSA9IHJhbmdlO1xuZnVuY3Rpb24gcmFuZ2UoYSwgYiwgc3RyKSB7XG4gIHZhciBiZWdzLCBiZWcsIGxlZnQsIHJpZ2h0LCByZXN1bHQ7XG4gIHZhciBhaSA9IHN0ci5pbmRleE9mKGEpO1xuICB2YXIgYmkgPSBzdHIuaW5kZXhPZihiLCBhaSArIDEpO1xuICB2YXIgaSA9IGFpO1xuXG4gIGlmIChhaSA+PSAwICYmIGJpID4gMCkge1xuICAgIGlmKGE9PT1iKSB7XG4gICAgICByZXR1cm4gW2FpLCBiaV07XG4gICAgfVxuICAgIGJlZ3MgPSBbXTtcbiAgICBsZWZ0ID0gc3RyLmxlbmd0aDtcblxuICAgIHdoaWxlIChpID49IDAgJiYgIXJlc3VsdCkge1xuICAgICAgaWYgKGkgPT0gYWkpIHtcbiAgICAgICAgYmVncy5wdXNoKGkpO1xuICAgICAgICBhaSA9IHN0ci5pbmRleE9mKGEsIGkgKyAxKTtcbiAgICAgIH0gZWxzZSBpZiAoYmVncy5sZW5ndGggPT0gMSkge1xuICAgICAgICByZXN1bHQgPSBbIGJlZ3MucG9wKCksIGJpIF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBiZWcgPSBiZWdzLnBvcCgpO1xuICAgICAgICBpZiAoYmVnIDwgbGVmdCkge1xuICAgICAgICAgIGxlZnQgPSBiZWc7XG4gICAgICAgICAgcmlnaHQgPSBiaTtcbiAgICAgICAgfVxuXG4gICAgICAgIGJpID0gc3RyLmluZGV4T2YoYiwgaSArIDEpO1xuICAgICAgfVxuXG4gICAgICBpID0gYWkgPCBiaSAmJiBhaSA+PSAwID8gYWkgOiBiaTtcbiAgICB9XG5cbiAgICBpZiAoYmVncy5sZW5ndGgpIHtcbiAgICAgIHJlc3VsdCA9IFsgbGVmdCwgcmlnaHQgXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuIiwidmFyIENoYWluc2F3ID0gcmVxdWlyZSgnY2hhaW5zYXcnKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG52YXIgQnVmZmVycyA9IHJlcXVpcmUoJ2J1ZmZlcnMnKTtcbnZhciBWYXJzID0gcmVxdWlyZSgnLi9saWIvdmFycy5qcycpO1xudmFyIFN0cmVhbSA9IHJlcXVpcmUoJ3N0cmVhbScpLlN0cmVhbTtcblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGJ1Zk9yRW0sIGV2ZW50TmFtZSkge1xuICAgIGlmIChCdWZmZXIuaXNCdWZmZXIoYnVmT3JFbSkpIHtcbiAgICAgICAgcmV0dXJuIGV4cG9ydHMucGFyc2UoYnVmT3JFbSk7XG4gICAgfVxuICAgIFxuICAgIHZhciBzID0gZXhwb3J0cy5zdHJlYW0oKTtcbiAgICBpZiAoYnVmT3JFbSAmJiBidWZPckVtLnBpcGUpIHtcbiAgICAgICAgYnVmT3JFbS5waXBlKHMpO1xuICAgIH1cbiAgICBlbHNlIGlmIChidWZPckVtKSB7XG4gICAgICAgIGJ1Zk9yRW0ub24oZXZlbnROYW1lIHx8ICdkYXRhJywgZnVuY3Rpb24gKGJ1Zikge1xuICAgICAgICAgICAgcy53cml0ZShidWYpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGJ1Zk9yRW0ub24oJ2VuZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHMuZW5kKCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcztcbn07XG5cbmV4cG9ydHMuc3RyZWFtID0gZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgaWYgKGlucHV0KSByZXR1cm4gZXhwb3J0cy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgIFxuICAgIHZhciBwZW5kaW5nID0gbnVsbDtcbiAgICBmdW5jdGlvbiBnZXRCeXRlcyAoYnl0ZXMsIGNiLCBza2lwKSB7XG4gICAgICAgIHBlbmRpbmcgPSB7XG4gICAgICAgICAgICBieXRlcyA6IGJ5dGVzLFxuICAgICAgICAgICAgc2tpcCA6IHNraXAsXG4gICAgICAgICAgICBjYiA6IGZ1bmN0aW9uIChidWYpIHtcbiAgICAgICAgICAgICAgICBwZW5kaW5nID0gbnVsbDtcbiAgICAgICAgICAgICAgICBjYihidWYpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICAgICAgZGlzcGF0Y2goKTtcbiAgICB9XG4gICAgXG4gICAgdmFyIG9mZnNldCA9IG51bGw7XG4gICAgZnVuY3Rpb24gZGlzcGF0Y2ggKCkge1xuICAgICAgICBpZiAoIXBlbmRpbmcpIHtcbiAgICAgICAgICAgIGlmIChjYXVnaHRFbmQpIGRvbmUgPSB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgcGVuZGluZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcGVuZGluZygpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGJ5dGVzID0gb2Zmc2V0ICsgcGVuZGluZy5ieXRlcztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGJ1ZmZlcnMubGVuZ3RoID49IGJ5dGVzKSB7XG4gICAgICAgICAgICAgICAgdmFyIGJ1ZjtcbiAgICAgICAgICAgICAgICBpZiAob2Zmc2V0ID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgYnVmID0gYnVmZmVycy5zcGxpY2UoMCwgYnl0ZXMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXBlbmRpbmcuc2tpcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmID0gYnVmLnNsaWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcGVuZGluZy5za2lwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWYgPSBidWZmZXJzLnNsaWNlKG9mZnNldCwgYnl0ZXMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG9mZnNldCA9IGJ5dGVzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAocGVuZGluZy5za2lwKSB7XG4gICAgICAgICAgICAgICAgICAgIHBlbmRpbmcuY2IoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBlbmRpbmcuY2IoYnVmKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgZnVuY3Rpb24gYnVpbGRlciAoc2F3KSB7XG4gICAgICAgIGZ1bmN0aW9uIG5leHQgKCkgeyBpZiAoIWRvbmUpIHNhdy5uZXh0KCkgfVxuICAgICAgICBcbiAgICAgICAgdmFyIHNlbGYgPSB3b3JkcyhmdW5jdGlvbiAoYnl0ZXMsIGNiKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgICAgICBnZXRCeXRlcyhieXRlcywgZnVuY3Rpb24gKGJ1Zikge1xuICAgICAgICAgICAgICAgICAgICB2YXJzLnNldChuYW1lLCBjYihidWYpKTtcbiAgICAgICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBzZWxmLnRhcCA9IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAgICAgc2F3Lm5lc3QoY2IsIHZhcnMuc3RvcmUpO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgc2VsZi5pbnRvID0gZnVuY3Rpb24gKGtleSwgY2IpIHtcbiAgICAgICAgICAgIGlmICghdmFycy5nZXQoa2V5KSkgdmFycy5zZXQoa2V5LCB7fSk7XG4gICAgICAgICAgICB2YXIgcGFyZW50ID0gdmFycztcbiAgICAgICAgICAgIHZhcnMgPSBWYXJzKHBhcmVudC5nZXQoa2V5KSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNhdy5uZXN0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjYi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIHRoaXMudGFwKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFycyA9IHBhcmVudDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIHZhcnMuc3RvcmUpO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgc2VsZi5mbHVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhcnMuc3RvcmUgPSB7fTtcbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHNlbGYubG9vcCA9IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAgICAgdmFyIGVuZCA9IGZhbHNlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBzYXcubmVzdChmYWxzZSwgZnVuY3Rpb24gbG9vcCAoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy52YXJzID0gdmFycy5zdG9yZTtcbiAgICAgICAgICAgICAgICBjYi5jYWxsKHRoaXMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgZW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICAgIH0sIHZhcnMuc3RvcmUpO1xuICAgICAgICAgICAgICAgIHRoaXMudGFwKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVuZCkgc2F3Lm5leHQoKVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGxvb3AuY2FsbCh0aGlzKVxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB9LCB2YXJzLnN0b3JlKTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHNlbGYuYnVmZmVyID0gZnVuY3Rpb24gKG5hbWUsIGJ5dGVzKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGJ5dGVzID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGJ5dGVzID0gdmFycy5nZXQoYnl0ZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBnZXRCeXRlcyhieXRlcywgZnVuY3Rpb24gKGJ1Zikge1xuICAgICAgICAgICAgICAgIHZhcnMuc2V0KG5hbWUsIGJ1Zik7XG4gICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBzZWxmLnNraXAgPSBmdW5jdGlvbiAoYnl0ZXMpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYnl0ZXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgYnl0ZXMgPSB2YXJzLmdldChieXRlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGdldEJ5dGVzKGJ5dGVzLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBzZWxmLnNjYW4gPSBmdW5jdGlvbiBmaW5kIChuYW1lLCBzZWFyY2gpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2VhcmNoID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHNlYXJjaCA9IG5ldyBCdWZmZXIoc2VhcmNoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKCFCdWZmZXIuaXNCdWZmZXIoc2VhcmNoKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignc2VhcmNoIG11c3QgYmUgYSBCdWZmZXIgb3IgYSBzdHJpbmcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIHRha2VuID0gMDtcbiAgICAgICAgICAgIHBlbmRpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBvcyA9IGJ1ZmZlcnMuaW5kZXhPZihzZWFyY2gsIG9mZnNldCArIHRha2VuKTtcbiAgICAgICAgICAgICAgICB2YXIgaSA9IHBvcy1vZmZzZXQtdGFrZW47XG4gICAgICAgICAgICAgICAgaWYgKHBvcyAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgcGVuZGluZyA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvZmZzZXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFycy5zZXQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWZmZXJzLnNsaWNlKG9mZnNldCwgb2Zmc2V0ICsgdGFrZW4gKyBpKVxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldCArPSB0YWtlbiArIGkgKyBzZWFyY2gubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFycy5zZXQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWZmZXJzLnNsaWNlKDAsIHRha2VuICsgaSlcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZmZXJzLnNwbGljZSgwLCB0YWtlbiArIGkgKyBzZWFyY2gubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgIGRpc3BhdGNoKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaSA9IE1hdGgubWF4KGJ1ZmZlcnMubGVuZ3RoIC0gc2VhcmNoLmxlbmd0aCAtIG9mZnNldCAtIHRha2VuLCAwKTtcblx0XHRcdFx0fVxuICAgICAgICAgICAgICAgIHRha2VuICs9IGk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZGlzcGF0Y2goKTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHNlbGYucGVlayA9IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAgICAgb2Zmc2V0ID0gMDtcbiAgICAgICAgICAgIHNhdy5uZXN0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjYi5jYWxsKHRoaXMsIHZhcnMuc3RvcmUpO1xuICAgICAgICAgICAgICAgIHRoaXMudGFwKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfTtcbiAgICBcbiAgICB2YXIgc3RyZWFtID0gQ2hhaW5zYXcubGlnaHQoYnVpbGRlcik7XG4gICAgc3RyZWFtLndyaXRhYmxlID0gdHJ1ZTtcbiAgICBcbiAgICB2YXIgYnVmZmVycyA9IEJ1ZmZlcnMoKTtcbiAgICBcbiAgICBzdHJlYW0ud3JpdGUgPSBmdW5jdGlvbiAoYnVmKSB7XG4gICAgICAgIGJ1ZmZlcnMucHVzaChidWYpO1xuICAgICAgICBkaXNwYXRjaCgpO1xuICAgIH07XG4gICAgXG4gICAgdmFyIHZhcnMgPSBWYXJzKCk7XG4gICAgXG4gICAgdmFyIGRvbmUgPSBmYWxzZSwgY2F1Z2h0RW5kID0gZmFsc2U7XG4gICAgc3RyZWFtLmVuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2F1Z2h0RW5kID0gdHJ1ZTtcbiAgICB9O1xuICAgIFxuICAgIHN0cmVhbS5waXBlID0gU3RyZWFtLnByb3RvdHlwZS5waXBlO1xuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKEV2ZW50RW1pdHRlci5wcm90b3R5cGUpLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgc3RyZWFtW25hbWVdID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZVtuYW1lXTtcbiAgICB9KTtcbiAgICBcbiAgICByZXR1cm4gc3RyZWFtO1xufTtcblxuZXhwb3J0cy5wYXJzZSA9IGZ1bmN0aW9uIHBhcnNlIChidWZmZXIpIHtcbiAgICB2YXIgc2VsZiA9IHdvcmRzKGZ1bmN0aW9uIChieXRlcywgY2IpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICBpZiAob2Zmc2V0ICsgYnl0ZXMgPD0gYnVmZmVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHZhciBidWYgPSBidWZmZXIuc2xpY2Uob2Zmc2V0LCBvZmZzZXQgKyBieXRlcyk7XG4gICAgICAgICAgICAgICAgb2Zmc2V0ICs9IGJ5dGVzO1xuICAgICAgICAgICAgICAgIHZhcnMuc2V0KG5hbWUsIGNiKGJ1ZikpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFycy5zZXQobmFtZSwgbnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfTtcbiAgICB9KTtcbiAgICBcbiAgICB2YXIgb2Zmc2V0ID0gMDtcbiAgICB2YXIgdmFycyA9IFZhcnMoKTtcbiAgICBzZWxmLnZhcnMgPSB2YXJzLnN0b3JlO1xuICAgIFxuICAgIHNlbGYudGFwID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgIGNiLmNhbGwoc2VsZiwgdmFycy5zdG9yZSk7XG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgIH07XG4gICAgXG4gICAgc2VsZi5pbnRvID0gZnVuY3Rpb24gKGtleSwgY2IpIHtcbiAgICAgICAgaWYgKCF2YXJzLmdldChrZXkpKSB7XG4gICAgICAgICAgICB2YXJzLnNldChrZXksIHt9KTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcGFyZW50ID0gdmFycztcbiAgICAgICAgdmFycyA9IFZhcnMocGFyZW50LmdldChrZXkpKTtcbiAgICAgICAgY2IuY2FsbChzZWxmLCB2YXJzLnN0b3JlKTtcbiAgICAgICAgdmFycyA9IHBhcmVudDtcbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfTtcbiAgICBcbiAgICBzZWxmLmxvb3AgPSBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgdmFyIGVuZCA9IGZhbHNlO1xuICAgICAgICB2YXIgZW5kZXIgPSBmdW5jdGlvbiAoKSB7IGVuZCA9IHRydWUgfTtcbiAgICAgICAgd2hpbGUgKGVuZCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGNiLmNhbGwoc2VsZiwgZW5kZXIsIHZhcnMuc3RvcmUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgIH07XG4gICAgXG4gICAgc2VsZi5idWZmZXIgPSBmdW5jdGlvbiAobmFtZSwgc2l6ZSkge1xuICAgICAgICBpZiAodHlwZW9mIHNpemUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBzaXplID0gdmFycy5nZXQoc2l6ZSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGJ1ZiA9IGJ1ZmZlci5zbGljZShvZmZzZXQsIE1hdGgubWluKGJ1ZmZlci5sZW5ndGgsIG9mZnNldCArIHNpemUpKTtcbiAgICAgICAgb2Zmc2V0ICs9IHNpemU7XG4gICAgICAgIHZhcnMuc2V0KG5hbWUsIGJ1Zik7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICB9O1xuICAgIFxuICAgIHNlbGYuc2tpcCA9IGZ1bmN0aW9uIChieXRlcykge1xuICAgICAgICBpZiAodHlwZW9mIGJ5dGVzID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgYnl0ZXMgPSB2YXJzLmdldChieXRlcyk7XG4gICAgICAgIH1cbiAgICAgICAgb2Zmc2V0ICs9IGJ5dGVzO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfTtcbiAgICBcbiAgICBzZWxmLnNjYW4gPSBmdW5jdGlvbiAobmFtZSwgc2VhcmNoKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2VhcmNoID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgc2VhcmNoID0gbmV3IEJ1ZmZlcihzZWFyY2gpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCFCdWZmZXIuaXNCdWZmZXIoc2VhcmNoKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdzZWFyY2ggbXVzdCBiZSBhIEJ1ZmZlciBvciBhIHN0cmluZycpO1xuICAgICAgICB9XG4gICAgICAgIHZhcnMuc2V0KG5hbWUsIG51bGwpO1xuICAgICAgICBcbiAgICAgICAgLy8gc2ltcGxlIGJ1dCBzbG93IHN0cmluZyBzZWFyY2hcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgKyBvZmZzZXQgPD0gYnVmZmVyLmxlbmd0aCAtIHNlYXJjaC5sZW5ndGggKyAxOyBpKyspIHtcbiAgICAgICAgICAgIGZvciAoXG4gICAgICAgICAgICAgICAgdmFyIGogPSAwO1xuICAgICAgICAgICAgICAgIGogPCBzZWFyY2gubGVuZ3RoICYmIGJ1ZmZlcltvZmZzZXQraStqXSA9PT0gc2VhcmNoW2pdO1xuICAgICAgICAgICAgICAgIGorK1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlmIChqID09PSBzZWFyY2gubGVuZ3RoKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFycy5zZXQobmFtZSwgYnVmZmVyLnNsaWNlKG9mZnNldCwgb2Zmc2V0ICsgaSkpO1xuICAgICAgICBvZmZzZXQgKz0gaSArIHNlYXJjaC5sZW5ndGg7XG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgIH07XG4gICAgXG4gICAgc2VsZi5wZWVrID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgIHZhciB3YXMgPSBvZmZzZXQ7XG4gICAgICAgIGNiLmNhbGwoc2VsZiwgdmFycy5zdG9yZSk7XG4gICAgICAgIG9mZnNldCA9IHdhcztcbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfTtcbiAgICBcbiAgICBzZWxmLmZsdXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXJzLnN0b3JlID0ge307XG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgIH07XG4gICAgXG4gICAgc2VsZi5lb2YgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBvZmZzZXQgPj0gYnVmZmVyLmxlbmd0aDtcbiAgICB9O1xuICAgIFxuICAgIHJldHVybiBzZWxmO1xufTtcblxuLy8gY29udmVydCBieXRlIHN0cmluZ3MgdG8gdW5zaWduZWQgbGl0dGxlIGVuZGlhbiBudW1iZXJzXG5mdW5jdGlvbiBkZWNvZGVMRXUgKGJ5dGVzKSB7XG4gICAgdmFyIGFjYyA9IDA7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBhY2MgKz0gTWF0aC5wb3coMjU2LGkpICogYnl0ZXNbaV07XG4gICAgfVxuICAgIHJldHVybiBhY2M7XG59XG5cbi8vIGNvbnZlcnQgYnl0ZSBzdHJpbmdzIHRvIHVuc2lnbmVkIGJpZyBlbmRpYW4gbnVtYmVyc1xuZnVuY3Rpb24gZGVjb2RlQkV1IChieXRlcykge1xuICAgIHZhciBhY2MgPSAwO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYWNjICs9IE1hdGgucG93KDI1NiwgYnl0ZXMubGVuZ3RoIC0gaSAtIDEpICogYnl0ZXNbaV07XG4gICAgfVxuICAgIHJldHVybiBhY2M7XG59XG5cbi8vIGNvbnZlcnQgYnl0ZSBzdHJpbmdzIHRvIHNpZ25lZCBiaWcgZW5kaWFuIG51bWJlcnNcbmZ1bmN0aW9uIGRlY29kZUJFcyAoYnl0ZXMpIHtcbiAgICB2YXIgdmFsID0gZGVjb2RlQkV1KGJ5dGVzKTtcbiAgICBpZiAoKGJ5dGVzWzBdICYgMHg4MCkgPT0gMHg4MCkge1xuICAgICAgICB2YWwgLT0gTWF0aC5wb3coMjU2LCBieXRlcy5sZW5ndGgpO1xuICAgIH1cbiAgICByZXR1cm4gdmFsO1xufVxuXG4vLyBjb252ZXJ0IGJ5dGUgc3RyaW5ncyB0byBzaWduZWQgbGl0dGxlIGVuZGlhbiBudW1iZXJzXG5mdW5jdGlvbiBkZWNvZGVMRXMgKGJ5dGVzKSB7XG4gICAgdmFyIHZhbCA9IGRlY29kZUxFdShieXRlcyk7XG4gICAgaWYgKChieXRlc1tieXRlcy5sZW5ndGggLSAxXSAmIDB4ODApID09IDB4ODApIHtcbiAgICAgICAgdmFsIC09IE1hdGgucG93KDI1NiwgYnl0ZXMubGVuZ3RoKTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbDtcbn1cblxuZnVuY3Rpb24gd29yZHMgKGRlY29kZSkge1xuICAgIHZhciBzZWxmID0ge307XG4gICAgXG4gICAgWyAxLCAyLCA0LCA4IF0uZm9yRWFjaChmdW5jdGlvbiAoYnl0ZXMpIHtcbiAgICAgICAgdmFyIGJpdHMgPSBieXRlcyAqIDg7XG4gICAgICAgIFxuICAgICAgICBzZWxmWyd3b3JkJyArIGJpdHMgKyAnbGUnXVxuICAgICAgICA9IHNlbGZbJ3dvcmQnICsgYml0cyArICdsdSddXG4gICAgICAgID0gZGVjb2RlKGJ5dGVzLCBkZWNvZGVMRXUpO1xuICAgICAgICBcbiAgICAgICAgc2VsZlsnd29yZCcgKyBiaXRzICsgJ2xzJ11cbiAgICAgICAgPSBkZWNvZGUoYnl0ZXMsIGRlY29kZUxFcyk7XG4gICAgICAgIFxuICAgICAgICBzZWxmWyd3b3JkJyArIGJpdHMgKyAnYmUnXVxuICAgICAgICA9IHNlbGZbJ3dvcmQnICsgYml0cyArICdidSddXG4gICAgICAgID0gZGVjb2RlKGJ5dGVzLCBkZWNvZGVCRXUpO1xuICAgICAgICBcbiAgICAgICAgc2VsZlsnd29yZCcgKyBiaXRzICsgJ2JzJ11cbiAgICAgICAgPSBkZWNvZGUoYnl0ZXMsIGRlY29kZUJFcyk7XG4gICAgfSk7XG4gICAgXG4gICAgLy8gd29yZDhiZShuKSA9PSB3b3JkOGxlKG4pIGZvciBhbGwgblxuICAgIHNlbGYud29yZDggPSBzZWxmLndvcmQ4dSA9IHNlbGYud29yZDhiZTtcbiAgICBzZWxmLndvcmQ4cyA9IHNlbGYud29yZDhicztcbiAgICBcbiAgICByZXR1cm4gc2VsZjtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0b3JlKSB7XG4gICAgZnVuY3Rpb24gZ2V0c2V0IChuYW1lLCB2YWx1ZSkge1xuICAgICAgICB2YXIgbm9kZSA9IHZhcnMuc3RvcmU7XG4gICAgICAgIHZhciBrZXlzID0gbmFtZS5zcGxpdCgnLicpO1xuICAgICAgICBrZXlzLnNsaWNlKDAsLTEpLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICAgICAgICAgIGlmIChub2RlW2tdID09PSB1bmRlZmluZWQpIG5vZGVba10gPSB7fTtcbiAgICAgICAgICAgIG5vZGUgPSBub2RlW2tdXG4gICAgICAgIH0pO1xuICAgICAgICB2YXIga2V5ID0ga2V5c1trZXlzLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9kZVtrZXldO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG5vZGVba2V5XSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHZhciB2YXJzID0ge1xuICAgICAgICBnZXQgOiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIGdldHNldChuYW1lKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0IDogZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0c2V0KG5hbWUsIHZhbHVlKTtcbiAgICAgICAgfSxcbiAgICAgICAgc3RvcmUgOiBzdG9yZSB8fCB7fSxcbiAgICB9O1xuICAgIHJldHVybiB2YXJzO1xufTtcbiIsInZhciBjb25jYXRNYXAgPSByZXF1aXJlKCdjb25jYXQtbWFwJyk7XG52YXIgYmFsYW5jZWQgPSByZXF1aXJlKCdiYWxhbmNlZC1tYXRjaCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cGFuZFRvcDtcblxudmFyIGVzY1NsYXNoID0gJ1xcMFNMQVNIJytNYXRoLnJhbmRvbSgpKydcXDAnO1xudmFyIGVzY09wZW4gPSAnXFwwT1BFTicrTWF0aC5yYW5kb20oKSsnXFwwJztcbnZhciBlc2NDbG9zZSA9ICdcXDBDTE9TRScrTWF0aC5yYW5kb20oKSsnXFwwJztcbnZhciBlc2NDb21tYSA9ICdcXDBDT01NQScrTWF0aC5yYW5kb20oKSsnXFwwJztcbnZhciBlc2NQZXJpb2QgPSAnXFwwUEVSSU9EJytNYXRoLnJhbmRvbSgpKydcXDAnO1xuXG5mdW5jdGlvbiBudW1lcmljKHN0cikge1xuICByZXR1cm4gcGFyc2VJbnQoc3RyLCAxMCkgPT0gc3RyXG4gICAgPyBwYXJzZUludChzdHIsIDEwKVxuICAgIDogc3RyLmNoYXJDb2RlQXQoMCk7XG59XG5cbmZ1bmN0aW9uIGVzY2FwZUJyYWNlcyhzdHIpIHtcbiAgcmV0dXJuIHN0ci5zcGxpdCgnXFxcXFxcXFwnKS5qb2luKGVzY1NsYXNoKVxuICAgICAgICAgICAgLnNwbGl0KCdcXFxceycpLmpvaW4oZXNjT3BlbilcbiAgICAgICAgICAgIC5zcGxpdCgnXFxcXH0nKS5qb2luKGVzY0Nsb3NlKVxuICAgICAgICAgICAgLnNwbGl0KCdcXFxcLCcpLmpvaW4oZXNjQ29tbWEpXG4gICAgICAgICAgICAuc3BsaXQoJ1xcXFwuJykuam9pbihlc2NQZXJpb2QpO1xufVxuXG5mdW5jdGlvbiB1bmVzY2FwZUJyYWNlcyhzdHIpIHtcbiAgcmV0dXJuIHN0ci5zcGxpdChlc2NTbGFzaCkuam9pbignXFxcXCcpXG4gICAgICAgICAgICAuc3BsaXQoZXNjT3Blbikuam9pbigneycpXG4gICAgICAgICAgICAuc3BsaXQoZXNjQ2xvc2UpLmpvaW4oJ30nKVxuICAgICAgICAgICAgLnNwbGl0KGVzY0NvbW1hKS5qb2luKCcsJylcbiAgICAgICAgICAgIC5zcGxpdChlc2NQZXJpb2QpLmpvaW4oJy4nKTtcbn1cblxuXG4vLyBCYXNpY2FsbHkganVzdCBzdHIuc3BsaXQoXCIsXCIpLCBidXQgaGFuZGxpbmcgY2FzZXNcbi8vIHdoZXJlIHdlIGhhdmUgbmVzdGVkIGJyYWNlZCBzZWN0aW9ucywgd2hpY2ggc2hvdWxkIGJlXG4vLyB0cmVhdGVkIGFzIGluZGl2aWR1YWwgbWVtYmVycywgbGlrZSB7YSx7YixjfSxkfVxuZnVuY3Rpb24gcGFyc2VDb21tYVBhcnRzKHN0cikge1xuICBpZiAoIXN0cilcbiAgICByZXR1cm4gWycnXTtcblxuICB2YXIgcGFydHMgPSBbXTtcbiAgdmFyIG0gPSBiYWxhbmNlZCgneycsICd9Jywgc3RyKTtcblxuICBpZiAoIW0pXG4gICAgcmV0dXJuIHN0ci5zcGxpdCgnLCcpO1xuXG4gIHZhciBwcmUgPSBtLnByZTtcbiAgdmFyIGJvZHkgPSBtLmJvZHk7XG4gIHZhciBwb3N0ID0gbS5wb3N0O1xuICB2YXIgcCA9IHByZS5zcGxpdCgnLCcpO1xuXG4gIHBbcC5sZW5ndGgtMV0gKz0gJ3snICsgYm9keSArICd9JztcbiAgdmFyIHBvc3RQYXJ0cyA9IHBhcnNlQ29tbWFQYXJ0cyhwb3N0KTtcbiAgaWYgKHBvc3QubGVuZ3RoKSB7XG4gICAgcFtwLmxlbmd0aC0xXSArPSBwb3N0UGFydHMuc2hpZnQoKTtcbiAgICBwLnB1c2guYXBwbHkocCwgcG9zdFBhcnRzKTtcbiAgfVxuXG4gIHBhcnRzLnB1c2guYXBwbHkocGFydHMsIHApO1xuXG4gIHJldHVybiBwYXJ0cztcbn1cblxuZnVuY3Rpb24gZXhwYW5kVG9wKHN0cikge1xuICBpZiAoIXN0cilcbiAgICByZXR1cm4gW107XG5cbiAgLy8gSSBkb24ndCBrbm93IHdoeSBCYXNoIDQuMyBkb2VzIHRoaXMsIGJ1dCBpdCBkb2VzLlxuICAvLyBBbnl0aGluZyBzdGFydGluZyB3aXRoIHt9IHdpbGwgaGF2ZSB0aGUgZmlyc3QgdHdvIGJ5dGVzIHByZXNlcnZlZFxuICAvLyBidXQgKm9ubHkqIGF0IHRoZSB0b3AgbGV2ZWwsIHNvIHt9LGF9YiB3aWxsIG5vdCBleHBhbmQgdG8gYW55dGhpbmcsXG4gIC8vIGJ1dCBhe30sYn1jIHdpbGwgYmUgZXhwYW5kZWQgdG8gW2F9YyxhYmNdLlxuICAvLyBPbmUgY291bGQgYXJndWUgdGhhdCB0aGlzIGlzIGEgYnVnIGluIEJhc2gsIGJ1dCBzaW5jZSB0aGUgZ29hbCBvZlxuICAvLyB0aGlzIG1vZHVsZSBpcyB0byBtYXRjaCBCYXNoJ3MgcnVsZXMsIHdlIGVzY2FwZSBhIGxlYWRpbmcge31cbiAgaWYgKHN0ci5zdWJzdHIoMCwgMikgPT09ICd7fScpIHtcbiAgICBzdHIgPSAnXFxcXHtcXFxcfScgKyBzdHIuc3Vic3RyKDIpO1xuICB9XG5cbiAgcmV0dXJuIGV4cGFuZChlc2NhcGVCcmFjZXMoc3RyKSwgdHJ1ZSkubWFwKHVuZXNjYXBlQnJhY2VzKTtcbn1cblxuZnVuY3Rpb24gaWRlbnRpdHkoZSkge1xuICByZXR1cm4gZTtcbn1cblxuZnVuY3Rpb24gZW1icmFjZShzdHIpIHtcbiAgcmV0dXJuICd7JyArIHN0ciArICd9Jztcbn1cbmZ1bmN0aW9uIGlzUGFkZGVkKGVsKSB7XG4gIHJldHVybiAvXi0/MFxcZC8udGVzdChlbCk7XG59XG5cbmZ1bmN0aW9uIGx0ZShpLCB5KSB7XG4gIHJldHVybiBpIDw9IHk7XG59XG5mdW5jdGlvbiBndGUoaSwgeSkge1xuICByZXR1cm4gaSA+PSB5O1xufVxuXG5mdW5jdGlvbiBleHBhbmQoc3RyLCBpc1RvcCkge1xuICB2YXIgZXhwYW5zaW9ucyA9IFtdO1xuXG4gIHZhciBtID0gYmFsYW5jZWQoJ3snLCAnfScsIHN0cik7XG4gIGlmICghbSB8fCAvXFwkJC8udGVzdChtLnByZSkpIHJldHVybiBbc3RyXTtcblxuICB2YXIgaXNOdW1lcmljU2VxdWVuY2UgPSAvXi0/XFxkK1xcLlxcLi0/XFxkKyg/OlxcLlxcLi0/XFxkKyk/JC8udGVzdChtLmJvZHkpO1xuICB2YXIgaXNBbHBoYVNlcXVlbmNlID0gL15bYS16QS1aXVxcLlxcLlthLXpBLVpdKD86XFwuXFwuLT9cXGQrKT8kLy50ZXN0KG0uYm9keSk7XG4gIHZhciBpc1NlcXVlbmNlID0gaXNOdW1lcmljU2VxdWVuY2UgfHwgaXNBbHBoYVNlcXVlbmNlO1xuICB2YXIgaXNPcHRpb25zID0gbS5ib2R5LmluZGV4T2YoJywnKSA+PSAwO1xuICBpZiAoIWlzU2VxdWVuY2UgJiYgIWlzT3B0aW9ucykge1xuICAgIC8vIHthfSxifVxuICAgIGlmIChtLnBvc3QubWF0Y2goLywuKlxcfS8pKSB7XG4gICAgICBzdHIgPSBtLnByZSArICd7JyArIG0uYm9keSArIGVzY0Nsb3NlICsgbS5wb3N0O1xuICAgICAgcmV0dXJuIGV4cGFuZChzdHIpO1xuICAgIH1cbiAgICByZXR1cm4gW3N0cl07XG4gIH1cblxuICB2YXIgbjtcbiAgaWYgKGlzU2VxdWVuY2UpIHtcbiAgICBuID0gbS5ib2R5LnNwbGl0KC9cXC5cXC4vKTtcbiAgfSBlbHNlIHtcbiAgICBuID0gcGFyc2VDb21tYVBhcnRzKG0uYm9keSk7XG4gICAgaWYgKG4ubGVuZ3RoID09PSAxKSB7XG4gICAgICAvLyB4e3thLGJ9fXkgPT0+IHh7YX15IHh7Yn15XG4gICAgICBuID0gZXhwYW5kKG5bMF0sIGZhbHNlKS5tYXAoZW1icmFjZSk7XG4gICAgICBpZiAobi5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgdmFyIHBvc3QgPSBtLnBvc3QubGVuZ3RoXG4gICAgICAgICAgPyBleHBhbmQobS5wb3N0LCBmYWxzZSlcbiAgICAgICAgICA6IFsnJ107XG4gICAgICAgIHJldHVybiBwb3N0Lm1hcChmdW5jdGlvbihwKSB7XG4gICAgICAgICAgcmV0dXJuIG0ucHJlICsgblswXSArIHA7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIGF0IHRoaXMgcG9pbnQsIG4gaXMgdGhlIHBhcnRzLCBhbmQgd2Uga25vdyBpdCdzIG5vdCBhIGNvbW1hIHNldFxuICAvLyB3aXRoIGEgc2luZ2xlIGVudHJ5LlxuXG4gIC8vIG5vIG5lZWQgdG8gZXhwYW5kIHByZSwgc2luY2UgaXQgaXMgZ3VhcmFudGVlZCB0byBiZSBmcmVlIG9mIGJyYWNlLXNldHNcbiAgdmFyIHByZSA9IG0ucHJlO1xuICB2YXIgcG9zdCA9IG0ucG9zdC5sZW5ndGhcbiAgICA/IGV4cGFuZChtLnBvc3QsIGZhbHNlKVxuICAgIDogWycnXTtcblxuICB2YXIgTjtcblxuICBpZiAoaXNTZXF1ZW5jZSkge1xuICAgIHZhciB4ID0gbnVtZXJpYyhuWzBdKTtcbiAgICB2YXIgeSA9IG51bWVyaWMoblsxXSk7XG4gICAgdmFyIHdpZHRoID0gTWF0aC5tYXgoblswXS5sZW5ndGgsIG5bMV0ubGVuZ3RoKVxuICAgIHZhciBpbmNyID0gbi5sZW5ndGggPT0gM1xuICAgICAgPyBNYXRoLmFicyhudW1lcmljKG5bMl0pKVxuICAgICAgOiAxO1xuICAgIHZhciB0ZXN0ID0gbHRlO1xuICAgIHZhciByZXZlcnNlID0geSA8IHg7XG4gICAgaWYgKHJldmVyc2UpIHtcbiAgICAgIGluY3IgKj0gLTE7XG4gICAgICB0ZXN0ID0gZ3RlO1xuICAgIH1cbiAgICB2YXIgcGFkID0gbi5zb21lKGlzUGFkZGVkKTtcblxuICAgIE4gPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSB4OyB0ZXN0KGksIHkpOyBpICs9IGluY3IpIHtcbiAgICAgIHZhciBjO1xuICAgICAgaWYgKGlzQWxwaGFTZXF1ZW5jZSkge1xuICAgICAgICBjID0gU3RyaW5nLmZyb21DaGFyQ29kZShpKTtcbiAgICAgICAgaWYgKGMgPT09ICdcXFxcJylcbiAgICAgICAgICBjID0gJyc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjID0gU3RyaW5nKGkpO1xuICAgICAgICBpZiAocGFkKSB7XG4gICAgICAgICAgdmFyIG5lZWQgPSB3aWR0aCAtIGMubGVuZ3RoO1xuICAgICAgICAgIGlmIChuZWVkID4gMCkge1xuICAgICAgICAgICAgdmFyIHogPSBuZXcgQXJyYXkobmVlZCArIDEpLmpvaW4oJzAnKTtcbiAgICAgICAgICAgIGlmIChpIDwgMClcbiAgICAgICAgICAgICAgYyA9ICctJyArIHogKyBjLnNsaWNlKDEpO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICBjID0geiArIGM7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBOLnB1c2goYyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIE4gPSBjb25jYXRNYXAobiwgZnVuY3Rpb24oZWwpIHsgcmV0dXJuIGV4cGFuZChlbCwgZmFsc2UpIH0pO1xuICB9XG5cbiAgZm9yICh2YXIgaiA9IDA7IGogPCBOLmxlbmd0aDsgaisrKSB7XG4gICAgZm9yICh2YXIgayA9IDA7IGsgPCBwb3N0Lmxlbmd0aDsgaysrKSB7XG4gICAgICB2YXIgZXhwYW5zaW9uID0gcHJlICsgTltqXSArIHBvc3Rba107XG4gICAgICBpZiAoIWlzVG9wIHx8IGlzU2VxdWVuY2UgfHwgZXhwYW5zaW9uKVxuICAgICAgICBleHBhbnNpb25zLnB1c2goZXhwYW5zaW9uKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZXhwYW5zaW9ucztcbn1cblxuIiwibW9kdWxlLmV4cG9ydHMgPSBCdWZmZXJzO1xuXG5mdW5jdGlvbiBCdWZmZXJzIChidWZzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEJ1ZmZlcnMpKSByZXR1cm4gbmV3IEJ1ZmZlcnMoYnVmcyk7XG4gICAgdGhpcy5idWZmZXJzID0gYnVmcyB8fCBbXTtcbiAgICB0aGlzLmxlbmd0aCA9IHRoaXMuYnVmZmVycy5yZWR1Y2UoZnVuY3Rpb24gKHNpemUsIGJ1Zikge1xuICAgICAgICByZXR1cm4gc2l6ZSArIGJ1Zi5sZW5ndGhcbiAgICB9LCAwKTtcbn1cblxuQnVmZmVycy5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihhcmd1bWVudHNbaV0pKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUcmllZCB0byBwdXNoIGEgbm9uLWJ1ZmZlcicpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBidWYgPSBhcmd1bWVudHNbaV07XG4gICAgICAgIHRoaXMuYnVmZmVycy5wdXNoKGJ1Zik7XG4gICAgICAgIHRoaXMubGVuZ3RoICs9IGJ1Zi5sZW5ndGg7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmxlbmd0aDtcbn07XG5cbkJ1ZmZlcnMucHJvdG90eXBlLnVuc2hpZnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYXJndW1lbnRzW2ldKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVHJpZWQgdG8gdW5zaGlmdCBhIG5vbi1idWZmZXInKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgYnVmID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB0aGlzLmJ1ZmZlcnMudW5zaGlmdChidWYpO1xuICAgICAgICB0aGlzLmxlbmd0aCArPSBidWYubGVuZ3RoO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5sZW5ndGg7XG59O1xuXG5CdWZmZXJzLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gKGRzdCwgZFN0YXJ0LCBzdGFydCwgZW5kKSB7XG4gICAgcmV0dXJuIHRoaXMuc2xpY2Uoc3RhcnQsIGVuZCkuY29weShkc3QsIGRTdGFydCwgMCwgZW5kIC0gc3RhcnQpO1xufTtcblxuQnVmZmVycy5wcm90b3R5cGUuc3BsaWNlID0gZnVuY3Rpb24gKGksIGhvd01hbnkpIHtcbiAgICB2YXIgYnVmZmVycyA9IHRoaXMuYnVmZmVycztcbiAgICB2YXIgaW5kZXggPSBpID49IDAgPyBpIDogdGhpcy5sZW5ndGggLSBpO1xuICAgIHZhciByZXBzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIFxuICAgIGlmIChob3dNYW55ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaG93TWFueSA9IHRoaXMubGVuZ3RoIC0gaW5kZXg7XG4gICAgfVxuICAgIGVsc2UgaWYgKGhvd01hbnkgPiB0aGlzLmxlbmd0aCAtIGluZGV4KSB7XG4gICAgICAgIGhvd01hbnkgPSB0aGlzLmxlbmd0aCAtIGluZGV4O1xuICAgIH1cbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlcHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5sZW5ndGggKz0gcmVwc1tpXS5sZW5ndGg7XG4gICAgfVxuICAgIFxuICAgIHZhciByZW1vdmVkID0gbmV3IEJ1ZmZlcnMoKTtcbiAgICB2YXIgYnl0ZXMgPSAwO1xuICAgIFxuICAgIHZhciBzdGFydEJ5dGVzID0gMDtcbiAgICBmb3IgKFxuICAgICAgICB2YXIgaWkgPSAwO1xuICAgICAgICBpaSA8IGJ1ZmZlcnMubGVuZ3RoICYmIHN0YXJ0Qnl0ZXMgKyBidWZmZXJzW2lpXS5sZW5ndGggPCBpbmRleDtcbiAgICAgICAgaWkgKytcbiAgICApIHsgc3RhcnRCeXRlcyArPSBidWZmZXJzW2lpXS5sZW5ndGggfVxuICAgIFxuICAgIGlmIChpbmRleCAtIHN0YXJ0Qnl0ZXMgPiAwKSB7XG4gICAgICAgIHZhciBzdGFydCA9IGluZGV4IC0gc3RhcnRCeXRlcztcbiAgICAgICAgXG4gICAgICAgIGlmIChzdGFydCArIGhvd01hbnkgPCBidWZmZXJzW2lpXS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJlbW92ZWQucHVzaChidWZmZXJzW2lpXS5zbGljZShzdGFydCwgc3RhcnQgKyBob3dNYW55KSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBvcmlnID0gYnVmZmVyc1tpaV07XG4gICAgICAgICAgICAvL3ZhciBidWYgPSBuZXcgQnVmZmVyKG9yaWcubGVuZ3RoIC0gaG93TWFueSk7XG4gICAgICAgICAgICB2YXIgYnVmMCA9IG5ldyBCdWZmZXIoc3RhcnQpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdGFydDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgYnVmMFtpXSA9IG9yaWdbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBidWYxID0gbmV3IEJ1ZmZlcihvcmlnLmxlbmd0aCAtIHN0YXJ0IC0gaG93TWFueSk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gc3RhcnQgKyBob3dNYW55OyBpIDwgb3JpZy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGJ1ZjFbIGkgLSBob3dNYW55IC0gc3RhcnQgXSA9IG9yaWdbaV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlcHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciByZXBzXyA9IHJlcHMuc2xpY2UoKTtcbiAgICAgICAgICAgICAgICByZXBzXy51bnNoaWZ0KGJ1ZjApO1xuICAgICAgICAgICAgICAgIHJlcHNfLnB1c2goYnVmMSk7XG4gICAgICAgICAgICAgICAgYnVmZmVycy5zcGxpY2UuYXBwbHkoYnVmZmVycywgWyBpaSwgMSBdLmNvbmNhdChyZXBzXykpO1xuICAgICAgICAgICAgICAgIGlpICs9IHJlcHNfLmxlbmd0aDtcbiAgICAgICAgICAgICAgICByZXBzID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBidWZmZXJzLnNwbGljZShpaSwgMSwgYnVmMCwgYnVmMSk7XG4gICAgICAgICAgICAgICAgLy9idWZmZXJzW2lpXSA9IGJ1ZjtcbiAgICAgICAgICAgICAgICBpaSArPSAyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVtb3ZlZC5wdXNoKGJ1ZmZlcnNbaWldLnNsaWNlKHN0YXJ0KSk7XG4gICAgICAgICAgICBidWZmZXJzW2lpXSA9IGJ1ZmZlcnNbaWldLnNsaWNlKDAsIHN0YXJ0KTtcbiAgICAgICAgICAgIGlpICsrO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIGlmIChyZXBzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgYnVmZmVycy5zcGxpY2UuYXBwbHkoYnVmZmVycywgWyBpaSwgMCBdLmNvbmNhdChyZXBzKSk7XG4gICAgICAgIGlpICs9IHJlcHMubGVuZ3RoO1xuICAgIH1cbiAgICBcbiAgICB3aGlsZSAocmVtb3ZlZC5sZW5ndGggPCBob3dNYW55KSB7XG4gICAgICAgIHZhciBidWYgPSBidWZmZXJzW2lpXTtcbiAgICAgICAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGg7XG4gICAgICAgIHZhciB0YWtlID0gTWF0aC5taW4obGVuLCBob3dNYW55IC0gcmVtb3ZlZC5sZW5ndGgpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRha2UgPT09IGxlbikge1xuICAgICAgICAgICAgcmVtb3ZlZC5wdXNoKGJ1Zik7XG4gICAgICAgICAgICBidWZmZXJzLnNwbGljZShpaSwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZW1vdmVkLnB1c2goYnVmLnNsaWNlKDAsIHRha2UpKTtcbiAgICAgICAgICAgIGJ1ZmZlcnNbaWldID0gYnVmZmVyc1tpaV0uc2xpY2UodGFrZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgdGhpcy5sZW5ndGggLT0gcmVtb3ZlZC5sZW5ndGg7XG4gICAgXG4gICAgcmV0dXJuIHJlbW92ZWQ7XG59O1xuIFxuQnVmZmVycy5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiAoaSwgaikge1xuICAgIHZhciBidWZmZXJzID0gdGhpcy5idWZmZXJzO1xuICAgIGlmIChqID09PSB1bmRlZmluZWQpIGogPSB0aGlzLmxlbmd0aDtcbiAgICBpZiAoaSA9PT0gdW5kZWZpbmVkKSBpID0gMDtcbiAgICBcbiAgICBpZiAoaiA+IHRoaXMubGVuZ3RoKSBqID0gdGhpcy5sZW5ndGg7XG4gICAgXG4gICAgdmFyIHN0YXJ0Qnl0ZXMgPSAwO1xuICAgIGZvciAoXG4gICAgICAgIHZhciBzaSA9IDA7XG4gICAgICAgIHNpIDwgYnVmZmVycy5sZW5ndGggJiYgc3RhcnRCeXRlcyArIGJ1ZmZlcnNbc2ldLmxlbmd0aCA8PSBpO1xuICAgICAgICBzaSArK1xuICAgICkgeyBzdGFydEJ5dGVzICs9IGJ1ZmZlcnNbc2ldLmxlbmd0aCB9XG4gICAgXG4gICAgdmFyIHRhcmdldCA9IG5ldyBCdWZmZXIoaiAtIGkpO1xuICAgIFxuICAgIHZhciB0aSA9IDA7XG4gICAgZm9yICh2YXIgaWkgPSBzaTsgdGkgPCBqIC0gaSAmJiBpaSA8IGJ1ZmZlcnMubGVuZ3RoOyBpaSsrKSB7XG4gICAgICAgIHZhciBsZW4gPSBidWZmZXJzW2lpXS5sZW5ndGg7XG4gICAgICAgIFxuICAgICAgICB2YXIgc3RhcnQgPSB0aSA9PT0gMCA/IGkgLSBzdGFydEJ5dGVzIDogMDtcbiAgICAgICAgdmFyIGVuZCA9IHRpICsgbGVuID49IGogLSBpXG4gICAgICAgICAgICA/IE1hdGgubWluKHN0YXJ0ICsgKGogLSBpKSAtIHRpLCBsZW4pXG4gICAgICAgICAgICA6IGxlblxuICAgICAgICA7XG4gICAgICAgIFxuICAgICAgICBidWZmZXJzW2lpXS5jb3B5KHRhcmdldCwgdGksIHN0YXJ0LCBlbmQpO1xuICAgICAgICB0aSArPSBlbmQgLSBzdGFydDtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHRhcmdldDtcbn07XG5cbkJ1ZmZlcnMucHJvdG90eXBlLnBvcyA9IGZ1bmN0aW9uIChpKSB7XG4gICAgaWYgKGkgPCAwIHx8IGkgPj0gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBFcnJvcignb29iJyk7XG4gICAgdmFyIGwgPSBpLCBiaSA9IDAsIGJ1ID0gbnVsbDtcbiAgICBmb3IgKDs7KSB7XG4gICAgICAgIGJ1ID0gdGhpcy5idWZmZXJzW2JpXTtcbiAgICAgICAgaWYgKGwgPCBidS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB7YnVmOiBiaSwgb2Zmc2V0OiBsfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGwgLT0gYnUubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICAgIGJpKys7XG4gICAgfVxufTtcblxuQnVmZmVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gZ2V0IChpKSB7XG4gICAgdmFyIHBvcyA9IHRoaXMucG9zKGkpO1xuXG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyc1twb3MuYnVmXS5nZXQocG9zLm9mZnNldCk7XG59O1xuXG5CdWZmZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiBzZXQgKGksIGIpIHtcbiAgICB2YXIgcG9zID0gdGhpcy5wb3MoaSk7XG5cbiAgICByZXR1cm4gdGhpcy5idWZmZXJzW3Bvcy5idWZdLnNldChwb3Mub2Zmc2V0LCBiKTtcbn07XG5cbkJ1ZmZlcnMucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiAobmVlZGxlLCBvZmZzZXQpIHtcbiAgICBpZiAoXCJzdHJpbmdcIiA9PT0gdHlwZW9mIG5lZWRsZSkge1xuICAgICAgICBuZWVkbGUgPSBuZXcgQnVmZmVyKG5lZWRsZSk7XG4gICAgfSBlbHNlIGlmIChuZWVkbGUgaW5zdGFuY2VvZiBCdWZmZXIpIHtcbiAgICAgICAgLy8gYWxyZWFkeSBhIGJ1ZmZlclxuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB0eXBlIGZvciBhIHNlYXJjaCBzdHJpbmcnKTtcbiAgICB9XG5cbiAgICBpZiAoIW5lZWRsZS5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgfVxuXG4gICAgdmFyIGkgPSAwLCBqID0gMCwgbWF0Y2ggPSAwLCBtc3RhcnQsIHBvcyA9IDA7XG5cbiAgICAvLyBzdGFydCBzZWFyY2ggZnJvbSBhIHBhcnRpY3VsYXIgcG9pbnQgaW4gdGhlIHZpcnR1YWwgYnVmZmVyXG4gICAgaWYgKG9mZnNldCkge1xuICAgICAgICB2YXIgcCA9IHRoaXMucG9zKG9mZnNldCk7XG4gICAgICAgIGkgPSBwLmJ1ZjtcbiAgICAgICAgaiA9IHAub2Zmc2V0O1xuICAgICAgICBwb3MgPSBvZmZzZXQ7XG4gICAgfVxuXG4gICAgLy8gZm9yIGVhY2ggY2hhcmFjdGVyIGluIHZpcnR1YWwgYnVmZmVyXG4gICAgZm9yICg7Oykge1xuICAgICAgICB3aGlsZSAoaiA+PSB0aGlzLmJ1ZmZlcnNbaV0ubGVuZ3RoKSB7XG4gICAgICAgICAgICBqID0gMDtcbiAgICAgICAgICAgIGkrKztcblxuICAgICAgICAgICAgaWYgKGkgPj0gdGhpcy5idWZmZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIC8vIHNlYXJjaCBzdHJpbmcgbm90IGZvdW5kXG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNoYXIgPSB0aGlzLmJ1ZmZlcnNbaV1bal07XG5cbiAgICAgICAgaWYgKGNoYXIgPT0gbmVlZGxlW21hdGNoXSkge1xuICAgICAgICAgICAgLy8ga2VlcCB0cmFjayB3aGVyZSBtYXRjaCBzdGFydGVkXG4gICAgICAgICAgICBpZiAobWF0Y2ggPT0gMCkge1xuICAgICAgICAgICAgICAgIG1zdGFydCA9IHtcbiAgICAgICAgICAgICAgICAgICAgaTogaSxcbiAgICAgICAgICAgICAgICAgICAgajogaixcbiAgICAgICAgICAgICAgICAgICAgcG9zOiBwb3NcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWF0Y2grKztcbiAgICAgICAgICAgIGlmIChtYXRjaCA9PSBuZWVkbGUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgLy8gZnVsbCBtYXRjaFxuICAgICAgICAgICAgICAgIHJldHVybiBtc3RhcnQucG9zO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKG1hdGNoICE9IDApIHtcbiAgICAgICAgICAgIC8vIGEgcGFydGlhbCBtYXRjaCBlbmRlZCwgZ28gYmFjayB0byBtYXRjaCBzdGFydGluZyBwb3NpdGlvblxuICAgICAgICAgICAgLy8gdGhpcyB3aWxsIGNvbnRpbnVlIHRoZSBzZWFyY2ggYXQgdGhlIG5leHQgY2hhcmFjdGVyXG4gICAgICAgICAgICBpID0gbXN0YXJ0Lmk7XG4gICAgICAgICAgICBqID0gbXN0YXJ0Lmo7XG4gICAgICAgICAgICBwb3MgPSBtc3RhcnQucG9zO1xuICAgICAgICAgICAgbWF0Y2ggPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgaisrO1xuICAgICAgICBwb3MrKztcbiAgICB9XG59O1xuXG5CdWZmZXJzLnByb3RvdHlwZS50b0J1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnNsaWNlKCk7XG59XG5cbkJ1ZmZlcnMucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgICByZXR1cm4gdGhpcy5zbGljZShzdGFydCwgZW5kKS50b1N0cmluZyhlbmNvZGluZyk7XG59XG4iLCJ2YXIgVHJhdmVyc2UgPSByZXF1aXJlKCd0cmF2ZXJzZScpO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcblxubW9kdWxlLmV4cG9ydHMgPSBDaGFpbnNhdztcbmZ1bmN0aW9uIENoYWluc2F3IChidWlsZGVyKSB7XG4gICAgdmFyIHNhdyA9IENoYWluc2F3LnNhdyhidWlsZGVyLCB7fSk7XG4gICAgdmFyIHIgPSBidWlsZGVyLmNhbGwoc2F3LmhhbmRsZXJzLCBzYXcpO1xuICAgIGlmIChyICE9PSB1bmRlZmluZWQpIHNhdy5oYW5kbGVycyA9IHI7XG4gICAgc2F3LnJlY29yZCgpO1xuICAgIHJldHVybiBzYXcuY2hhaW4oKTtcbn07XG5cbkNoYWluc2F3LmxpZ2h0ID0gZnVuY3Rpb24gQ2hhaW5zYXdMaWdodCAoYnVpbGRlcikge1xuICAgIHZhciBzYXcgPSBDaGFpbnNhdy5zYXcoYnVpbGRlciwge30pO1xuICAgIHZhciByID0gYnVpbGRlci5jYWxsKHNhdy5oYW5kbGVycywgc2F3KTtcbiAgICBpZiAociAhPT0gdW5kZWZpbmVkKSBzYXcuaGFuZGxlcnMgPSByO1xuICAgIHJldHVybiBzYXcuY2hhaW4oKTtcbn07XG5cbkNoYWluc2F3LnNhdyA9IGZ1bmN0aW9uIChidWlsZGVyLCBoYW5kbGVycykge1xuICAgIHZhciBzYXcgPSBuZXcgRXZlbnRFbWl0dGVyO1xuICAgIHNhdy5oYW5kbGVycyA9IGhhbmRsZXJzO1xuICAgIHNhdy5hY3Rpb25zID0gW107XG5cbiAgICBzYXcuY2hhaW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjaCA9IFRyYXZlcnNlKHNhdy5oYW5kbGVycykubWFwKGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc1Jvb3QpIHJldHVybiBub2RlO1xuICAgICAgICAgICAgdmFyIHBzID0gdGhpcy5wYXRoO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIG5vZGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHNhdy5hY3Rpb25zLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aCA6IHBzLFxuICAgICAgICAgICAgICAgICAgICAgICAgYXJncyA6IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNhdy5lbWl0KCdiZWdpbicpO1xuICAgICAgICAgICAgc2F3Lm5leHQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGNoO1xuICAgIH07XG5cbiAgICBzYXcucG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gc2F3LmFjdGlvbnMuc2hpZnQoKTtcbiAgICB9O1xuXG4gICAgc2F3Lm5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhY3Rpb24gPSBzYXcucG9wKCk7XG5cbiAgICAgICAgaWYgKCFhY3Rpb24pIHtcbiAgICAgICAgICAgIHNhdy5lbWl0KCdlbmQnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghYWN0aW9uLnRyYXApIHtcbiAgICAgICAgICAgIHZhciBub2RlID0gc2F3LmhhbmRsZXJzO1xuICAgICAgICAgICAgYWN0aW9uLnBhdGguZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7IG5vZGUgPSBub2RlW2tleV0gfSk7XG4gICAgICAgICAgICBub2RlLmFwcGx5KHNhdy5oYW5kbGVycywgYWN0aW9uLmFyZ3MpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHNhdy5uZXN0ID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICB2YXIgYXV0b25leHQgPSB0cnVlO1xuXG4gICAgICAgIGlmICh0eXBlb2YgY2IgPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgdmFyIGF1dG9uZXh0ID0gY2I7XG4gICAgICAgICAgICBjYiA9IGFyZ3Muc2hpZnQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzID0gQ2hhaW5zYXcuc2F3KGJ1aWxkZXIsIHt9KTtcbiAgICAgICAgdmFyIHIgPSBidWlsZGVyLmNhbGwocy5oYW5kbGVycywgcyk7XG5cbiAgICAgICAgaWYgKHIgIT09IHVuZGVmaW5lZCkgcy5oYW5kbGVycyA9IHI7XG5cbiAgICAgICAgLy8gSWYgd2UgYXJlIHJlY29yZGluZy4uLlxuICAgICAgICBpZiAoXCJ1bmRlZmluZWRcIiAhPT0gdHlwZW9mIHNhdy5zdGVwKSB7XG4gICAgICAgICAgICAvLyAuLi4gb3VyIGNoaWxkcmVuIHNob3VsZCwgdG9vXG4gICAgICAgICAgICBzLnJlY29yZCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgY2IuYXBwbHkocy5jaGFpbigpLCBhcmdzKTtcbiAgICAgICAgaWYgKGF1dG9uZXh0ICE9PSBmYWxzZSkgcy5vbignZW5kJywgc2F3Lm5leHQpO1xuICAgIH07XG5cbiAgICBzYXcucmVjb3JkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB1cGdyYWRlQ2hhaW5zYXcoc2F3KTtcbiAgICB9O1xuXG4gICAgWyd0cmFwJywgJ2Rvd24nLCAnanVtcCddLmZvckVhY2goZnVuY3Rpb24gKG1ldGhvZCkge1xuICAgICAgICBzYXdbbWV0aG9kXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRvIHVzZSB0aGUgdHJhcCwgZG93biBhbmQganVtcCBmZWF0dXJlcywgcGxlYXNlIFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiY2FsbCByZWNvcmQoKSBmaXJzdCB0byBzdGFydCByZWNvcmRpbmcgYWN0aW9ucy5cIik7XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICByZXR1cm4gc2F3O1xufTtcblxuZnVuY3Rpb24gdXBncmFkZUNoYWluc2F3KHNhdykge1xuICAgIHNhdy5zdGVwID0gMDtcblxuICAgIC8vIG92ZXJyaWRlIHBvcFxuICAgIHNhdy5wb3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBzYXcuYWN0aW9uc1tzYXcuc3RlcCsrXTtcbiAgICB9O1xuXG4gICAgc2F3LnRyYXAgPSBmdW5jdGlvbiAobmFtZSwgY2IpIHtcbiAgICAgICAgdmFyIHBzID0gQXJyYXkuaXNBcnJheShuYW1lKSA/IG5hbWUgOiBbbmFtZV07XG4gICAgICAgIHNhdy5hY3Rpb25zLnB1c2goe1xuICAgICAgICAgICAgcGF0aCA6IHBzLFxuICAgICAgICAgICAgc3RlcCA6IHNhdy5zdGVwLFxuICAgICAgICAgICAgY2IgOiBjYixcbiAgICAgICAgICAgIHRyYXAgOiB0cnVlXG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBzYXcuZG93biA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHZhciBwcyA9IChBcnJheS5pc0FycmF5KG5hbWUpID8gbmFtZSA6IFtuYW1lXSkuam9pbignLycpO1xuICAgICAgICB2YXIgaSA9IHNhdy5hY3Rpb25zLnNsaWNlKHNhdy5zdGVwKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIGlmICh4LnRyYXAgJiYgeC5zdGVwIDw9IHNhdy5zdGVwKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm4geC5wYXRoLmpvaW4oJy8nKSA9PSBwcztcbiAgICAgICAgfSkuaW5kZXhPZih0cnVlKTtcblxuICAgICAgICBpZiAoaSA+PSAwKSBzYXcuc3RlcCArPSBpO1xuICAgICAgICBlbHNlIHNhdy5zdGVwID0gc2F3LmFjdGlvbnMubGVuZ3RoO1xuXG4gICAgICAgIHZhciBhY3QgPSBzYXcuYWN0aW9uc1tzYXcuc3RlcCAtIDFdO1xuICAgICAgICBpZiAoYWN0ICYmIGFjdC50cmFwKSB7XG4gICAgICAgICAgICAvLyBJdCdzIGEgdHJhcCFcbiAgICAgICAgICAgIHNhdy5zdGVwID0gYWN0LnN0ZXA7XG4gICAgICAgICAgICBhY3QuY2IoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHNhdy5uZXh0KCk7XG4gICAgfTtcblxuICAgIHNhdy5qdW1wID0gZnVuY3Rpb24gKHN0ZXApIHtcbiAgICAgICAgc2F3LnN0ZXAgPSBzdGVwO1xuICAgICAgICBzYXcubmV4dCgpO1xuICAgIH07XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoeHMsIGZuKSB7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHggPSBmbih4c1tpXSwgaSk7XG4gICAgICAgIGlmIChpc0FycmF5KHgpKSByZXMucHVzaC5hcHBseShyZXMsIHgpO1xuICAgICAgICBlbHNlIHJlcy5wdXNoKHgpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufTtcblxudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uICh4cykge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeHMpID09PSAnW29iamVjdCBBcnJheV0nO1xufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuXG5mdW5jdGlvbiBpc0FycmF5KGFyZykge1xuICBpZiAoQXJyYXkuaXNBcnJheSkge1xuICAgIHJldHVybiBBcnJheS5pc0FycmF5KGFyZyk7XG4gIH1cbiAgcmV0dXJuIG9iamVjdFRvU3RyaW5nKGFyZykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiAob2JqZWN0VG9TdHJpbmcoZSkgPT09ICdbb2JqZWN0IEVycm9yXScgfHwgZSBpbnN0YW5jZW9mIEVycm9yKTtcbn1cbmV4cG9ydHMuaXNFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSByZXF1aXJlKCdidWZmZXInKS5CdWZmZXIuaXNCdWZmZXI7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gcmVhbHBhdGhcbnJlYWxwYXRoLnJlYWxwYXRoID0gcmVhbHBhdGhcbnJlYWxwYXRoLnN5bmMgPSByZWFscGF0aFN5bmNcbnJlYWxwYXRoLnJlYWxwYXRoU3luYyA9IHJlYWxwYXRoU3luY1xucmVhbHBhdGgubW9ua2V5cGF0Y2ggPSBtb25rZXlwYXRjaFxucmVhbHBhdGgudW5tb25rZXlwYXRjaCA9IHVubW9ua2V5cGF0Y2hcblxudmFyIGZzID0gcmVxdWlyZSgnZnMnKVxudmFyIG9yaWdSZWFscGF0aCA9IGZzLnJlYWxwYXRoXG52YXIgb3JpZ1JlYWxwYXRoU3luYyA9IGZzLnJlYWxwYXRoU3luY1xuXG52YXIgdmVyc2lvbiA9IHByb2Nlc3MudmVyc2lvblxudmFyIG9rID0gL152WzAtNV1cXC4vLnRlc3QodmVyc2lvbilcbnZhciBvbGQgPSByZXF1aXJlKCcuL29sZC5qcycpXG5cbmZ1bmN0aW9uIG5ld0Vycm9yIChlcikge1xuICByZXR1cm4gZXIgJiYgZXIuc3lzY2FsbCA9PT0gJ3JlYWxwYXRoJyAmJiAoXG4gICAgZXIuY29kZSA9PT0gJ0VMT09QJyB8fFxuICAgIGVyLmNvZGUgPT09ICdFTk9NRU0nIHx8XG4gICAgZXIuY29kZSA9PT0gJ0VOQU1FVE9PTE9ORydcbiAgKVxufVxuXG5mdW5jdGlvbiByZWFscGF0aCAocCwgY2FjaGUsIGNiKSB7XG4gIGlmIChvaykge1xuICAgIHJldHVybiBvcmlnUmVhbHBhdGgocCwgY2FjaGUsIGNiKVxuICB9XG5cbiAgaWYgKHR5cGVvZiBjYWNoZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGNiID0gY2FjaGVcbiAgICBjYWNoZSA9IG51bGxcbiAgfVxuICBvcmlnUmVhbHBhdGgocCwgY2FjaGUsIGZ1bmN0aW9uIChlciwgcmVzdWx0KSB7XG4gICAgaWYgKG5ld0Vycm9yKGVyKSkge1xuICAgICAgb2xkLnJlYWxwYXRoKHAsIGNhY2hlLCBjYilcbiAgICB9IGVsc2Uge1xuICAgICAgY2IoZXIsIHJlc3VsdClcbiAgICB9XG4gIH0pXG59XG5cbmZ1bmN0aW9uIHJlYWxwYXRoU3luYyAocCwgY2FjaGUpIHtcbiAgaWYgKG9rKSB7XG4gICAgcmV0dXJuIG9yaWdSZWFscGF0aFN5bmMocCwgY2FjaGUpXG4gIH1cblxuICB0cnkge1xuICAgIHJldHVybiBvcmlnUmVhbHBhdGhTeW5jKHAsIGNhY2hlKVxuICB9IGNhdGNoIChlcikge1xuICAgIGlmIChuZXdFcnJvcihlcikpIHtcbiAgICAgIHJldHVybiBvbGQucmVhbHBhdGhTeW5jKHAsIGNhY2hlKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlclxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBtb25rZXlwYXRjaCAoKSB7XG4gIGZzLnJlYWxwYXRoID0gcmVhbHBhdGhcbiAgZnMucmVhbHBhdGhTeW5jID0gcmVhbHBhdGhTeW5jXG59XG5cbmZ1bmN0aW9uIHVubW9ua2V5cGF0Y2ggKCkge1xuICBmcy5yZWFscGF0aCA9IG9yaWdSZWFscGF0aFxuICBmcy5yZWFscGF0aFN5bmMgPSBvcmlnUmVhbHBhdGhTeW5jXG59XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIHBhdGhNb2R1bGUgPSByZXF1aXJlKCdwYXRoJyk7XG52YXIgaXNXaW5kb3dzID0gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJztcbnZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5cbi8vIEphdmFTY3JpcHQgaW1wbGVtZW50YXRpb24gb2YgcmVhbHBhdGgsIHBvcnRlZCBmcm9tIG5vZGUgcHJlLXY2XG5cbnZhciBERUJVRyA9IHByb2Nlc3MuZW52Lk5PREVfREVCVUcgJiYgL2ZzLy50ZXN0KHByb2Nlc3MuZW52Lk5PREVfREVCVUcpO1xuXG5mdW5jdGlvbiByZXRocm93KCkge1xuICAvLyBPbmx5IGVuYWJsZSBpbiBkZWJ1ZyBtb2RlLiBBIGJhY2t0cmFjZSB1c2VzIH4xMDAwIGJ5dGVzIG9mIGhlYXAgc3BhY2UgYW5kXG4gIC8vIGlzIGZhaXJseSBzbG93IHRvIGdlbmVyYXRlLlxuICB2YXIgY2FsbGJhY2s7XG4gIGlmIChERUJVRykge1xuICAgIHZhciBiYWNrdHJhY2UgPSBuZXcgRXJyb3I7XG4gICAgY2FsbGJhY2sgPSBkZWJ1Z0NhbGxiYWNrO1xuICB9IGVsc2VcbiAgICBjYWxsYmFjayA9IG1pc3NpbmdDYWxsYmFjaztcblxuICByZXR1cm4gY2FsbGJhY2s7XG5cbiAgZnVuY3Rpb24gZGVidWdDYWxsYmFjayhlcnIpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICBiYWNrdHJhY2UubWVzc2FnZSA9IGVyci5tZXNzYWdlO1xuICAgICAgZXJyID0gYmFja3RyYWNlO1xuICAgICAgbWlzc2luZ0NhbGxiYWNrKGVycik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbWlzc2luZ0NhbGxiYWNrKGVycikge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIGlmIChwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pXG4gICAgICAgIHRocm93IGVycjsgIC8vIEZvcmdvdCBhIGNhbGxiYWNrIGJ1dCBkb24ndCBrbm93IHdoZXJlPyBVc2UgTk9ERV9ERUJVRz1mc1xuICAgICAgZWxzZSBpZiAoIXByb2Nlc3Mubm9EZXByZWNhdGlvbikge1xuICAgICAgICB2YXIgbXNnID0gJ2ZzOiBtaXNzaW5nIGNhbGxiYWNrICcgKyAoZXJyLnN0YWNrIHx8IGVyci5tZXNzYWdlKTtcbiAgICAgICAgaWYgKHByb2Nlc3MudHJhY2VEZXByZWNhdGlvbilcbiAgICAgICAgICBjb25zb2xlLnRyYWNlKG1zZyk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG1heWJlQ2FsbGJhY2soY2IpIHtcbiAgcmV0dXJuIHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJyA/IGNiIDogcmV0aHJvdygpO1xufVxuXG52YXIgbm9ybWFsaXplID0gcGF0aE1vZHVsZS5ub3JtYWxpemU7XG5cbi8vIFJlZ2V4cCB0aGF0IGZpbmRzIHRoZSBuZXh0IHBhcnRpb24gb2YgYSAocGFydGlhbCkgcGF0aFxuLy8gcmVzdWx0IGlzIFtiYXNlX3dpdGhfc2xhc2gsIGJhc2VdLCBlLmcuIFsnc29tZWRpci8nLCAnc29tZWRpciddXG5pZiAoaXNXaW5kb3dzKSB7XG4gIHZhciBuZXh0UGFydFJlID0gLyguKj8pKD86W1xcL1xcXFxdK3wkKS9nO1xufSBlbHNlIHtcbiAgdmFyIG5leHRQYXJ0UmUgPSAvKC4qPykoPzpbXFwvXSt8JCkvZztcbn1cblxuLy8gUmVnZXggdG8gZmluZCB0aGUgZGV2aWNlIHJvb3QsIGluY2x1ZGluZyB0cmFpbGluZyBzbGFzaC4gRS5nLiAnYzpcXFxcJy5cbmlmIChpc1dpbmRvd3MpIHtcbiAgdmFyIHNwbGl0Um9vdFJlID0gL14oPzpbYS16QS1aXTp8W1xcXFxcXC9dezJ9W15cXFxcXFwvXStbXFxcXFxcL11bXlxcXFxcXC9dKyk/W1xcXFxcXC9dKi87XG59IGVsc2Uge1xuICB2YXIgc3BsaXRSb290UmUgPSAvXltcXC9dKi87XG59XG5cbmV4cG9ydHMucmVhbHBhdGhTeW5jID0gZnVuY3Rpb24gcmVhbHBhdGhTeW5jKHAsIGNhY2hlKSB7XG4gIC8vIG1ha2UgcCBpcyBhYnNvbHV0ZVxuICBwID0gcGF0aE1vZHVsZS5yZXNvbHZlKHApO1xuXG4gIGlmIChjYWNoZSAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY2FjaGUsIHApKSB7XG4gICAgcmV0dXJuIGNhY2hlW3BdO1xuICB9XG5cbiAgdmFyIG9yaWdpbmFsID0gcCxcbiAgICAgIHNlZW5MaW5rcyA9IHt9LFxuICAgICAga25vd25IYXJkID0ge307XG5cbiAgLy8gY3VycmVudCBjaGFyYWN0ZXIgcG9zaXRpb24gaW4gcFxuICB2YXIgcG9zO1xuICAvLyB0aGUgcGFydGlhbCBwYXRoIHNvIGZhciwgaW5jbHVkaW5nIGEgdHJhaWxpbmcgc2xhc2ggaWYgYW55XG4gIHZhciBjdXJyZW50O1xuICAvLyB0aGUgcGFydGlhbCBwYXRoIHdpdGhvdXQgYSB0cmFpbGluZyBzbGFzaCAoZXhjZXB0IHdoZW4gcG9pbnRpbmcgYXQgYSByb290KVxuICB2YXIgYmFzZTtcbiAgLy8gdGhlIHBhcnRpYWwgcGF0aCBzY2FubmVkIGluIHRoZSBwcmV2aW91cyByb3VuZCwgd2l0aCBzbGFzaFxuICB2YXIgcHJldmlvdXM7XG5cbiAgc3RhcnQoKTtcblxuICBmdW5jdGlvbiBzdGFydCgpIHtcbiAgICAvLyBTa2lwIG92ZXIgcm9vdHNcbiAgICB2YXIgbSA9IHNwbGl0Um9vdFJlLmV4ZWMocCk7XG4gICAgcG9zID0gbVswXS5sZW5ndGg7XG4gICAgY3VycmVudCA9IG1bMF07XG4gICAgYmFzZSA9IG1bMF07XG4gICAgcHJldmlvdXMgPSAnJztcblxuICAgIC8vIE9uIHdpbmRvd3MsIGNoZWNrIHRoYXQgdGhlIHJvb3QgZXhpc3RzLiBPbiB1bml4IHRoZXJlIGlzIG5vIG5lZWQuXG4gICAgaWYgKGlzV2luZG93cyAmJiAha25vd25IYXJkW2Jhc2VdKSB7XG4gICAgICBmcy5sc3RhdFN5bmMoYmFzZSk7XG4gICAgICBrbm93bkhhcmRbYmFzZV0gPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIC8vIHdhbGsgZG93biB0aGUgcGF0aCwgc3dhcHBpbmcgb3V0IGxpbmtlZCBwYXRocGFydHMgZm9yIHRoZWlyIHJlYWxcbiAgLy8gdmFsdWVzXG4gIC8vIE5COiBwLmxlbmd0aCBjaGFuZ2VzLlxuICB3aGlsZSAocG9zIDwgcC5sZW5ndGgpIHtcbiAgICAvLyBmaW5kIHRoZSBuZXh0IHBhcnRcbiAgICBuZXh0UGFydFJlLmxhc3RJbmRleCA9IHBvcztcbiAgICB2YXIgcmVzdWx0ID0gbmV4dFBhcnRSZS5leGVjKHApO1xuICAgIHByZXZpb3VzID0gY3VycmVudDtcbiAgICBjdXJyZW50ICs9IHJlc3VsdFswXTtcbiAgICBiYXNlID0gcHJldmlvdXMgKyByZXN1bHRbMV07XG4gICAgcG9zID0gbmV4dFBhcnRSZS5sYXN0SW5kZXg7XG5cbiAgICAvLyBjb250aW51ZSBpZiBub3QgYSBzeW1saW5rXG4gICAgaWYgKGtub3duSGFyZFtiYXNlXSB8fCAoY2FjaGUgJiYgY2FjaGVbYmFzZV0gPT09IGJhc2UpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICB2YXIgcmVzb2x2ZWRMaW5rO1xuICAgIGlmIChjYWNoZSAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY2FjaGUsIGJhc2UpKSB7XG4gICAgICAvLyBzb21lIGtub3duIHN5bWJvbGljIGxpbmsuICBubyBuZWVkIHRvIHN0YXQgYWdhaW4uXG4gICAgICByZXNvbHZlZExpbmsgPSBjYWNoZVtiYXNlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHN0YXQgPSBmcy5sc3RhdFN5bmMoYmFzZSk7XG4gICAgICBpZiAoIXN0YXQuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICBrbm93bkhhcmRbYmFzZV0gPSB0cnVlO1xuICAgICAgICBpZiAoY2FjaGUpIGNhY2hlW2Jhc2VdID0gYmFzZTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIHJlYWQgdGhlIGxpbmsgaWYgaXQgd2Fzbid0IHJlYWQgYmVmb3JlXG4gICAgICAvLyBkZXYvaW5vIGFsd2F5cyByZXR1cm4gMCBvbiB3aW5kb3dzLCBzbyBza2lwIHRoZSBjaGVjay5cbiAgICAgIHZhciBsaW5rVGFyZ2V0ID0gbnVsbDtcbiAgICAgIGlmICghaXNXaW5kb3dzKSB7XG4gICAgICAgIHZhciBpZCA9IHN0YXQuZGV2LnRvU3RyaW5nKDMyKSArICc6JyArIHN0YXQuaW5vLnRvU3RyaW5nKDMyKTtcbiAgICAgICAgaWYgKHNlZW5MaW5rcy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICBsaW5rVGFyZ2V0ID0gc2VlbkxpbmtzW2lkXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGxpbmtUYXJnZXQgPT09IG51bGwpIHtcbiAgICAgICAgZnMuc3RhdFN5bmMoYmFzZSk7XG4gICAgICAgIGxpbmtUYXJnZXQgPSBmcy5yZWFkbGlua1N5bmMoYmFzZSk7XG4gICAgICB9XG4gICAgICByZXNvbHZlZExpbmsgPSBwYXRoTW9kdWxlLnJlc29sdmUocHJldmlvdXMsIGxpbmtUYXJnZXQpO1xuICAgICAgLy8gdHJhY2sgdGhpcywgaWYgZ2l2ZW4gYSBjYWNoZS5cbiAgICAgIGlmIChjYWNoZSkgY2FjaGVbYmFzZV0gPSByZXNvbHZlZExpbms7XG4gICAgICBpZiAoIWlzV2luZG93cykgc2VlbkxpbmtzW2lkXSA9IGxpbmtUYXJnZXQ7XG4gICAgfVxuXG4gICAgLy8gcmVzb2x2ZSB0aGUgbGluaywgdGhlbiBzdGFydCBvdmVyXG4gICAgcCA9IHBhdGhNb2R1bGUucmVzb2x2ZShyZXNvbHZlZExpbmssIHAuc2xpY2UocG9zKSk7XG4gICAgc3RhcnQoKTtcbiAgfVxuXG4gIGlmIChjYWNoZSkgY2FjaGVbb3JpZ2luYWxdID0gcDtcblxuICByZXR1cm4gcDtcbn07XG5cblxuZXhwb3J0cy5yZWFscGF0aCA9IGZ1bmN0aW9uIHJlYWxwYXRoKHAsIGNhY2hlLCBjYikge1xuICBpZiAodHlwZW9mIGNiICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgY2IgPSBtYXliZUNhbGxiYWNrKGNhY2hlKTtcbiAgICBjYWNoZSA9IG51bGw7XG4gIH1cblxuICAvLyBtYWtlIHAgaXMgYWJzb2x1dGVcbiAgcCA9IHBhdGhNb2R1bGUucmVzb2x2ZShwKTtcblxuICBpZiAoY2FjaGUgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNhY2hlLCBwKSkge1xuICAgIHJldHVybiBwcm9jZXNzLm5leHRUaWNrKGNiLmJpbmQobnVsbCwgbnVsbCwgY2FjaGVbcF0pKTtcbiAgfVxuXG4gIHZhciBvcmlnaW5hbCA9IHAsXG4gICAgICBzZWVuTGlua3MgPSB7fSxcbiAgICAgIGtub3duSGFyZCA9IHt9O1xuXG4gIC8vIGN1cnJlbnQgY2hhcmFjdGVyIHBvc2l0aW9uIGluIHBcbiAgdmFyIHBvcztcbiAgLy8gdGhlIHBhcnRpYWwgcGF0aCBzbyBmYXIsIGluY2x1ZGluZyBhIHRyYWlsaW5nIHNsYXNoIGlmIGFueVxuICB2YXIgY3VycmVudDtcbiAgLy8gdGhlIHBhcnRpYWwgcGF0aCB3aXRob3V0IGEgdHJhaWxpbmcgc2xhc2ggKGV4Y2VwdCB3aGVuIHBvaW50aW5nIGF0IGEgcm9vdClcbiAgdmFyIGJhc2U7XG4gIC8vIHRoZSBwYXJ0aWFsIHBhdGggc2Nhbm5lZCBpbiB0aGUgcHJldmlvdXMgcm91bmQsIHdpdGggc2xhc2hcbiAgdmFyIHByZXZpb3VzO1xuXG4gIHN0YXJ0KCk7XG5cbiAgZnVuY3Rpb24gc3RhcnQoKSB7XG4gICAgLy8gU2tpcCBvdmVyIHJvb3RzXG4gICAgdmFyIG0gPSBzcGxpdFJvb3RSZS5leGVjKHApO1xuICAgIHBvcyA9IG1bMF0ubGVuZ3RoO1xuICAgIGN1cnJlbnQgPSBtWzBdO1xuICAgIGJhc2UgPSBtWzBdO1xuICAgIHByZXZpb3VzID0gJyc7XG5cbiAgICAvLyBPbiB3aW5kb3dzLCBjaGVjayB0aGF0IHRoZSByb290IGV4aXN0cy4gT24gdW5peCB0aGVyZSBpcyBubyBuZWVkLlxuICAgIGlmIChpc1dpbmRvd3MgJiYgIWtub3duSGFyZFtiYXNlXSkge1xuICAgICAgZnMubHN0YXQoYmFzZSwgZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgIGlmIChlcnIpIHJldHVybiBjYihlcnIpO1xuICAgICAgICBrbm93bkhhcmRbYmFzZV0gPSB0cnVlO1xuICAgICAgICBMT09QKCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcHJvY2Vzcy5uZXh0VGljayhMT09QKTtcbiAgICB9XG4gIH1cblxuICAvLyB3YWxrIGRvd24gdGhlIHBhdGgsIHN3YXBwaW5nIG91dCBsaW5rZWQgcGF0aHBhcnRzIGZvciB0aGVpciByZWFsXG4gIC8vIHZhbHVlc1xuICBmdW5jdGlvbiBMT09QKCkge1xuICAgIC8vIHN0b3AgaWYgc2Nhbm5lZCBwYXN0IGVuZCBvZiBwYXRoXG4gICAgaWYgKHBvcyA+PSBwLmxlbmd0aCkge1xuICAgICAgaWYgKGNhY2hlKSBjYWNoZVtvcmlnaW5hbF0gPSBwO1xuICAgICAgcmV0dXJuIGNiKG51bGwsIHApO1xuICAgIH1cblxuICAgIC8vIGZpbmQgdGhlIG5leHQgcGFydFxuICAgIG5leHRQYXJ0UmUubGFzdEluZGV4ID0gcG9zO1xuICAgIHZhciByZXN1bHQgPSBuZXh0UGFydFJlLmV4ZWMocCk7XG4gICAgcHJldmlvdXMgPSBjdXJyZW50O1xuICAgIGN1cnJlbnQgKz0gcmVzdWx0WzBdO1xuICAgIGJhc2UgPSBwcmV2aW91cyArIHJlc3VsdFsxXTtcbiAgICBwb3MgPSBuZXh0UGFydFJlLmxhc3RJbmRleDtcblxuICAgIC8vIGNvbnRpbnVlIGlmIG5vdCBhIHN5bWxpbmtcbiAgICBpZiAoa25vd25IYXJkW2Jhc2VdIHx8IChjYWNoZSAmJiBjYWNoZVtiYXNlXSA9PT0gYmFzZSkpIHtcbiAgICAgIHJldHVybiBwcm9jZXNzLm5leHRUaWNrKExPT1ApO1xuICAgIH1cblxuICAgIGlmIChjYWNoZSAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY2FjaGUsIGJhc2UpKSB7XG4gICAgICAvLyBrbm93biBzeW1ib2xpYyBsaW5rLiAgbm8gbmVlZCB0byBzdGF0IGFnYWluLlxuICAgICAgcmV0dXJuIGdvdFJlc29sdmVkTGluayhjYWNoZVtiYXNlXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZzLmxzdGF0KGJhc2UsIGdvdFN0YXQpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ290U3RhdChlcnIsIHN0YXQpIHtcbiAgICBpZiAoZXJyKSByZXR1cm4gY2IoZXJyKTtcblxuICAgIC8vIGlmIG5vdCBhIHN5bWxpbmssIHNraXAgdG8gdGhlIG5leHQgcGF0aCBwYXJ0XG4gICAgaWYgKCFzdGF0LmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgIGtub3duSGFyZFtiYXNlXSA9IHRydWU7XG4gICAgICBpZiAoY2FjaGUpIGNhY2hlW2Jhc2VdID0gYmFzZTtcbiAgICAgIHJldHVybiBwcm9jZXNzLm5leHRUaWNrKExPT1ApO1xuICAgIH1cblxuICAgIC8vIHN0YXQgJiByZWFkIHRoZSBsaW5rIGlmIG5vdCByZWFkIGJlZm9yZVxuICAgIC8vIGNhbGwgZ290VGFyZ2V0IGFzIHNvb24gYXMgdGhlIGxpbmsgdGFyZ2V0IGlzIGtub3duXG4gICAgLy8gZGV2L2lubyBhbHdheXMgcmV0dXJuIDAgb24gd2luZG93cywgc28gc2tpcCB0aGUgY2hlY2suXG4gICAgaWYgKCFpc1dpbmRvd3MpIHtcbiAgICAgIHZhciBpZCA9IHN0YXQuZGV2LnRvU3RyaW5nKDMyKSArICc6JyArIHN0YXQuaW5vLnRvU3RyaW5nKDMyKTtcbiAgICAgIGlmIChzZWVuTGlua3MuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgIHJldHVybiBnb3RUYXJnZXQobnVsbCwgc2VlbkxpbmtzW2lkXSwgYmFzZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZzLnN0YXQoYmFzZSwgZnVuY3Rpb24oZXJyKSB7XG4gICAgICBpZiAoZXJyKSByZXR1cm4gY2IoZXJyKTtcblxuICAgICAgZnMucmVhZGxpbmsoYmFzZSwgZnVuY3Rpb24oZXJyLCB0YXJnZXQpIHtcbiAgICAgICAgaWYgKCFpc1dpbmRvd3MpIHNlZW5MaW5rc1tpZF0gPSB0YXJnZXQ7XG4gICAgICAgIGdvdFRhcmdldChlcnIsIHRhcmdldCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdvdFRhcmdldChlcnIsIHRhcmdldCwgYmFzZSkge1xuICAgIGlmIChlcnIpIHJldHVybiBjYihlcnIpO1xuXG4gICAgdmFyIHJlc29sdmVkTGluayA9IHBhdGhNb2R1bGUucmVzb2x2ZShwcmV2aW91cywgdGFyZ2V0KTtcbiAgICBpZiAoY2FjaGUpIGNhY2hlW2Jhc2VdID0gcmVzb2x2ZWRMaW5rO1xuICAgIGdvdFJlc29sdmVkTGluayhyZXNvbHZlZExpbmspO1xuICB9XG5cbiAgZnVuY3Rpb24gZ290UmVzb2x2ZWRMaW5rKHJlc29sdmVkTGluaykge1xuICAgIC8vIHJlc29sdmUgdGhlIGxpbmssIHRoZW4gc3RhcnQgb3ZlclxuICAgIHAgPSBwYXRoTW9kdWxlLnJlc29sdmUocmVzb2x2ZWRMaW5rLCBwLnNsaWNlKHBvcykpO1xuICAgIHN0YXJ0KCk7XG4gIH1cbn07XG4iLCJleHBvcnRzLkFic3RyYWN0ID0gcmVxdWlyZShcIi4vbGliL2Fic3RyYWN0LmpzXCIpXG5leHBvcnRzLlJlYWRlciA9IHJlcXVpcmUoXCIuL2xpYi9yZWFkZXIuanNcIilcbmV4cG9ydHMuV3JpdGVyID0gcmVxdWlyZShcIi4vbGliL3dyaXRlci5qc1wiKVxuXG5leHBvcnRzLkZpbGUgPVxuICB7IFJlYWRlcjogcmVxdWlyZShcIi4vbGliL2ZpbGUtcmVhZGVyLmpzXCIpXG4gICwgV3JpdGVyOiByZXF1aXJlKFwiLi9saWIvZmlsZS13cml0ZXIuanNcIikgfVxuXG5leHBvcnRzLkRpciA9IFxuICB7IFJlYWRlciA6IHJlcXVpcmUoXCIuL2xpYi9kaXItcmVhZGVyLmpzXCIpXG4gICwgV3JpdGVyIDogcmVxdWlyZShcIi4vbGliL2Rpci13cml0ZXIuanNcIikgfVxuXG5leHBvcnRzLkxpbmsgPVxuICB7IFJlYWRlciA6IHJlcXVpcmUoXCIuL2xpYi9saW5rLXJlYWRlci5qc1wiKVxuICAsIFdyaXRlciA6IHJlcXVpcmUoXCIuL2xpYi9saW5rLXdyaXRlci5qc1wiKSB9XG5cbmV4cG9ydHMuUHJveHkgPVxuICB7IFJlYWRlciA6IHJlcXVpcmUoXCIuL2xpYi9wcm94eS1yZWFkZXIuanNcIilcbiAgLCBXcml0ZXIgOiByZXF1aXJlKFwiLi9saWIvcHJveHktd3JpdGVyLmpzXCIpIH1cblxuZXhwb3J0cy5SZWFkZXIuRGlyID0gZXhwb3J0cy5EaXJSZWFkZXIgPSBleHBvcnRzLkRpci5SZWFkZXJcbmV4cG9ydHMuUmVhZGVyLkZpbGUgPSBleHBvcnRzLkZpbGVSZWFkZXIgPSBleHBvcnRzLkZpbGUuUmVhZGVyXG5leHBvcnRzLlJlYWRlci5MaW5rID0gZXhwb3J0cy5MaW5rUmVhZGVyID0gZXhwb3J0cy5MaW5rLlJlYWRlclxuZXhwb3J0cy5SZWFkZXIuUHJveHkgPSBleHBvcnRzLlByb3h5UmVhZGVyID0gZXhwb3J0cy5Qcm94eS5SZWFkZXJcblxuZXhwb3J0cy5Xcml0ZXIuRGlyID0gZXhwb3J0cy5EaXJXcml0ZXIgPSBleHBvcnRzLkRpci5Xcml0ZXJcbmV4cG9ydHMuV3JpdGVyLkZpbGUgPSBleHBvcnRzLkZpbGVXcml0ZXIgPSBleHBvcnRzLkZpbGUuV3JpdGVyXG5leHBvcnRzLldyaXRlci5MaW5rID0gZXhwb3J0cy5MaW5rV3JpdGVyID0gZXhwb3J0cy5MaW5rLldyaXRlclxuZXhwb3J0cy5Xcml0ZXIuUHJveHkgPSBleHBvcnRzLlByb3h5V3JpdGVyID0gZXhwb3J0cy5Qcm94eS5Xcml0ZXJcblxuZXhwb3J0cy5jb2xsZWN0ID0gcmVxdWlyZShcIi4vbGliL2NvbGxlY3QuanNcIilcbiIsIi8vIHRoZSBwYXJlbnQgY2xhc3MgZm9yIGFsbCBmc3RyZWFtcy5cblxubW9kdWxlLmV4cG9ydHMgPSBBYnN0cmFjdFxuXG52YXIgU3RyZWFtID0gcmVxdWlyZShcInN0cmVhbVwiKS5TdHJlYW1cbiAgLCBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKVxuXG5mdW5jdGlvbiBBYnN0cmFjdCAoKSB7XG4gIFN0cmVhbS5jYWxsKHRoaXMpXG59XG5cbmluaGVyaXRzKEFic3RyYWN0LCBTdHJlYW0pXG5cbkFic3RyYWN0LnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIChldiwgZm4pIHtcbiAgaWYgKGV2ID09PSBcInJlYWR5XCIgJiYgdGhpcy5yZWFkeSkge1xuICAgIHByb2Nlc3MubmV4dFRpY2soZm4uYmluZCh0aGlzKSlcbiAgfSBlbHNlIHtcbiAgICBTdHJlYW0ucHJvdG90eXBlLm9uLmNhbGwodGhpcywgZXYsIGZuKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkFic3RyYWN0LnByb3RvdHlwZS5hYm9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5fYWJvcnRlZCA9IHRydWVcbiAgdGhpcy5lbWl0KFwiYWJvcnRcIilcbn1cblxuQWJzdHJhY3QucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7fVxuXG5BYnN0cmFjdC5wcm90b3R5cGUud2FybiA9IGZ1bmN0aW9uIChtc2csIGNvZGUpIHtcbiAgdmFyIG1lID0gdGhpc1xuICAgICwgZXIgPSBkZWNvcmF0ZShtc2csIGNvZGUsIG1lKVxuICBpZiAoIW1lLmxpc3RlbmVycyhcIndhcm5cIikpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiJXMgJXNcXG5cIiArXG4gICAgICAgICAgICAgICAgICBcInBhdGggPSAlc1xcblwiICtcbiAgICAgICAgICAgICAgICAgIFwic3lzY2FsbCA9ICVzXFxuXCIgK1xuICAgICAgICAgICAgICAgICAgXCJmc3RyZWFtX3R5cGUgPSAlc1xcblwiICtcbiAgICAgICAgICAgICAgICAgIFwiZnN0cmVhbV9wYXRoID0gJXNcXG5cIiArXG4gICAgICAgICAgICAgICAgICBcImZzdHJlYW1fdW5jX3BhdGggPSAlc1xcblwiICtcbiAgICAgICAgICAgICAgICAgIFwiZnN0cmVhbV9jbGFzcyA9ICVzXFxuXCIgK1xuICAgICAgICAgICAgICAgICAgXCJmc3RyZWFtX3N0YWNrID1cXG4lc1xcblwiLFxuICAgICAgICAgICAgICAgICAgY29kZSB8fCBcIlVOS05PV05cIixcbiAgICAgICAgICAgICAgICAgIGVyLnN0YWNrLFxuICAgICAgICAgICAgICAgICAgZXIucGF0aCxcbiAgICAgICAgICAgICAgICAgIGVyLnN5c2NhbGwsXG4gICAgICAgICAgICAgICAgICBlci5mc3RyZWFtX3R5cGUsXG4gICAgICAgICAgICAgICAgICBlci5mc3RyZWFtX3BhdGgsXG4gICAgICAgICAgICAgICAgICBlci5mc3RyZWFtX3VuY19wYXRoLFxuICAgICAgICAgICAgICAgICAgZXIuZnN0cmVhbV9jbGFzcyxcbiAgICAgICAgICAgICAgICAgIGVyLmZzdHJlYW1fc3RhY2suam9pbihcIlxcblwiKSlcbiAgfSBlbHNlIHtcbiAgICBtZS5lbWl0KFwid2FyblwiLCBlcilcbiAgfVxufVxuXG5BYnN0cmFjdC5wcm90b3R5cGUuaW5mbyA9IGZ1bmN0aW9uIChtc2csIGNvZGUpIHtcbiAgdGhpcy5lbWl0KFwiaW5mb1wiLCBtc2csIGNvZGUpXG59XG5cbkFic3RyYWN0LnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIChtc2csIGNvZGUsIHRoKSB7XG4gIHZhciBlciA9IGRlY29yYXRlKG1zZywgY29kZSwgdGhpcylcbiAgaWYgKHRoKSB0aHJvdyBlclxuICBlbHNlIHRoaXMuZW1pdChcImVycm9yXCIsIGVyKVxufVxuXG5mdW5jdGlvbiBkZWNvcmF0ZSAoZXIsIGNvZGUsIG1lKSB7XG4gIGlmICghKGVyIGluc3RhbmNlb2YgRXJyb3IpKSBlciA9IG5ldyBFcnJvcihlcilcbiAgZXIuY29kZSA9IGVyLmNvZGUgfHwgY29kZVxuICBlci5wYXRoID0gZXIucGF0aCB8fCBtZS5wYXRoXG4gIGVyLmZzdHJlYW1fdHlwZSA9IGVyLmZzdHJlYW1fdHlwZSB8fCBtZS50eXBlXG4gIGVyLmZzdHJlYW1fcGF0aCA9IGVyLmZzdHJlYW1fcGF0aCB8fCBtZS5wYXRoXG4gIGlmIChtZS5fcGF0aCAhPT0gbWUucGF0aCkge1xuICAgIGVyLmZzdHJlYW1fdW5jX3BhdGggPSBlci5mc3RyZWFtX3VuY19wYXRoIHx8IG1lLl9wYXRoXG4gIH1cbiAgaWYgKG1lLmxpbmtwYXRoKSB7XG4gICAgZXIuZnN0cmVhbV9saW5rcGF0aCA9IGVyLmZzdHJlYW1fbGlua3BhdGggfHwgbWUubGlua3BhdGhcbiAgfVxuICBlci5mc3RyZWFtX2NsYXNzID0gZXIuZnN0cmVhbV9jbGFzcyB8fCBtZS5jb25zdHJ1Y3Rvci5uYW1lXG4gIGVyLmZzdHJlYW1fc3RhY2sgPSBlci5mc3RyZWFtX3N0YWNrIHx8XG4gICAgbmV3IEVycm9yKCkuc3RhY2suc3BsaXQoL1xcbi8pLnNsaWNlKDMpLm1hcChmdW5jdGlvbiAocykge1xuICAgICAgcmV0dXJuIHMucmVwbGFjZSgvXiAgICBhdCAvLCBcIlwiKVxuICAgIH0pXG5cbiAgcmV0dXJuIGVyXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGNvbGxlY3RcblxuZnVuY3Rpb24gY29sbGVjdCAoc3RyZWFtKSB7XG4gIGlmIChzdHJlYW0uX2NvbGxlY3RlZCkgcmV0dXJuXG5cbiAgc3RyZWFtLl9jb2xsZWN0ZWQgPSB0cnVlXG4gIHN0cmVhbS5wYXVzZSgpXG5cbiAgc3RyZWFtLm9uKFwiZGF0YVwiLCBzYXZlKVxuICBzdHJlYW0ub24oXCJlbmRcIiwgc2F2ZSlcbiAgdmFyIGJ1ZiA9IFtdXG4gIGZ1bmN0aW9uIHNhdmUgKGIpIHtcbiAgICBpZiAodHlwZW9mIGIgPT09IFwic3RyaW5nXCIpIGIgPSBuZXcgQnVmZmVyKGIpXG4gICAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihiKSAmJiAhYi5sZW5ndGgpIHJldHVyblxuICAgIGJ1Zi5wdXNoKGIpXG4gIH1cblxuICBzdHJlYW0ub24oXCJlbnRyeVwiLCBzYXZlRW50cnkpXG4gIHZhciBlbnRyeUJ1ZmZlciA9IFtdXG4gIGZ1bmN0aW9uIHNhdmVFbnRyeSAoZSkge1xuICAgIGNvbGxlY3QoZSlcbiAgICBlbnRyeUJ1ZmZlci5wdXNoKGUpXG4gIH1cblxuICBzdHJlYW0ub24oXCJwcm94eVwiLCBwcm94eVBhdXNlKVxuICBmdW5jdGlvbiBwcm94eVBhdXNlIChwKSB7XG4gICAgcC5wYXVzZSgpXG4gIH1cblxuXG4gIC8vIHJlcGxhY2UgdGhlIHBpcGUgbWV0aG9kIHdpdGggYSBuZXcgdmVyc2lvbiB0aGF0IHdpbGxcbiAgLy8gdW5sb2NrIHRoZSBidWZmZXJlZCBzdHVmZi4gIGlmIHlvdSBqdXN0IGNhbGwgLnBpcGUoKVxuICAvLyB3aXRob3V0IGEgZGVzdGluYXRpb24sIHRoZW4gaXQnbGwgcmUtcGxheSB0aGUgZXZlbnRzLlxuICBzdHJlYW0ucGlwZSA9IChmdW5jdGlvbiAob3JpZykgeyByZXR1cm4gZnVuY3Rpb24gKGRlc3QpIHtcbiAgICAvLyBjb25zb2xlLmVycm9yKFwiID09PSBvcGVuIHRoZSBwaXBlc1wiLCBkZXN0ICYmIGRlc3QucGF0aClcblxuICAgIC8vIGxldCB0aGUgZW50cmllcyBmbG93IHRocm91Z2ggb25lIGF0IGEgdGltZS5cbiAgICAvLyBPbmNlIHRoZXkncmUgYWxsIGRvbmUsIHRoZW4gd2UgY2FuIHJlc3VtZSBjb21wbGV0ZWx5LlxuICAgIHZhciBlID0gMFxuICAgIDsoZnVuY3Rpb24gdW5ibG9ja0VudHJ5ICgpIHtcbiAgICAgIHZhciBlbnRyeSA9IGVudHJ5QnVmZmVyW2UrK11cbiAgICAgIC8vIGNvbnNvbGUuZXJyb3IoXCIgPT09PSB1bmJsb2NrIGVudHJ5XCIsIGVudHJ5ICYmIGVudHJ5LnBhdGgpXG4gICAgICBpZiAoIWVudHJ5KSByZXR1cm4gcmVzdW1lKClcbiAgICAgIGVudHJ5Lm9uKFwiZW5kXCIsIHVuYmxvY2tFbnRyeSlcbiAgICAgIGlmIChkZXN0KSBkZXN0LmFkZChlbnRyeSlcbiAgICAgIGVsc2Ugc3RyZWFtLmVtaXQoXCJlbnRyeVwiLCBlbnRyeSlcbiAgICB9KSgpXG5cbiAgICBmdW5jdGlvbiByZXN1bWUgKCkge1xuICAgICAgc3RyZWFtLnJlbW92ZUxpc3RlbmVyKFwiZW50cnlcIiwgc2F2ZUVudHJ5KVxuICAgICAgc3RyZWFtLnJlbW92ZUxpc3RlbmVyKFwiZGF0YVwiLCBzYXZlKVxuICAgICAgc3RyZWFtLnJlbW92ZUxpc3RlbmVyKFwiZW5kXCIsIHNhdmUpXG5cbiAgICAgIHN0cmVhbS5waXBlID0gb3JpZ1xuICAgICAgaWYgKGRlc3QpIHN0cmVhbS5waXBlKGRlc3QpXG5cbiAgICAgIGJ1Zi5mb3JFYWNoKGZ1bmN0aW9uIChiKSB7XG4gICAgICAgIGlmIChiKSBzdHJlYW0uZW1pdChcImRhdGFcIiwgYilcbiAgICAgICAgZWxzZSBzdHJlYW0uZW1pdChcImVuZFwiKVxuICAgICAgfSlcblxuICAgICAgc3RyZWFtLnJlc3VtZSgpXG4gICAgfVxuXG4gICAgcmV0dXJuIGRlc3RcbiAgfX0pKHN0cmVhbS5waXBlKVxufVxuIiwiLy8gQSB0aGluZyB0aGF0IGVtaXRzIFwiZW50cnlcIiBldmVudHMgd2l0aCBSZWFkZXIgb2JqZWN0c1xuLy8gUGF1c2luZyBpdCBjYXVzZXMgaXQgdG8gc3RvcCBlbWl0dGluZyBlbnRyeSBldmVudHMsIGFuZCBhbHNvXG4vLyBwYXVzZXMgdGhlIGN1cnJlbnQgZW50cnkgaWYgdGhlcmUgaXMgb25lLlxuXG5tb2R1bGUuZXhwb3J0cyA9IERpclJlYWRlclxuXG52YXIgZnMgPSByZXF1aXJlKFwiZ3JhY2VmdWwtZnNcIilcbiAgLCBmc3RyZWFtID0gcmVxdWlyZShcIi4uL2ZzdHJlYW0uanNcIilcbiAgLCBSZWFkZXIgPSBmc3RyZWFtLlJlYWRlclxuICAsIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpXG4gICwgbWtkaXIgPSByZXF1aXJlKFwibWtkaXJwXCIpXG4gICwgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpXG4gICwgUmVhZGVyID0gcmVxdWlyZShcIi4vcmVhZGVyLmpzXCIpXG4gICwgYXNzZXJ0ID0gcmVxdWlyZShcImFzc2VydFwiKS5va1xuXG5pbmhlcml0cyhEaXJSZWFkZXIsIFJlYWRlcilcblxuZnVuY3Rpb24gRGlyUmVhZGVyIChwcm9wcykge1xuICB2YXIgbWUgPSB0aGlzXG4gIGlmICghKG1lIGluc3RhbmNlb2YgRGlyUmVhZGVyKSkgdGhyb3cgbmV3IEVycm9yKFxuICAgIFwiRGlyUmVhZGVyIG11c3QgYmUgY2FsbGVkIGFzIGNvbnN0cnVjdG9yLlwiKVxuXG4gIC8vIHNob3VsZCBhbHJlYWR5IGJlIGVzdGFibGlzaGVkIGFzIGEgRGlyZWN0b3J5IHR5cGVcbiAgaWYgKHByb3BzLnR5cGUgIT09IFwiRGlyZWN0b3J5XCIgfHwgIXByb3BzLkRpcmVjdG9yeSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk5vbi1kaXJlY3RvcnkgdHlwZSBcIisgcHJvcHMudHlwZSlcbiAgfVxuXG4gIG1lLmVudHJpZXMgPSBudWxsXG4gIG1lLl9pbmRleCA9IC0xXG4gIG1lLl9wYXVzZWQgPSBmYWxzZVxuICBtZS5fbGVuZ3RoID0gLTFcblxuICBpZiAocHJvcHMuc29ydCkge1xuICAgIHRoaXMuc29ydCA9IHByb3BzLnNvcnRcbiAgfVxuXG4gIFJlYWRlci5jYWxsKHRoaXMsIHByb3BzKVxufVxuXG5EaXJSZWFkZXIucHJvdG90eXBlLl9nZXRFbnRyaWVzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbWUgPSB0aGlzXG5cbiAgLy8gcmFjZSBjb25kaXRpb24uICBtaWdodCBwYXVzZSgpIGJlZm9yZSBjYWxsaW5nIF9nZXRFbnRyaWVzLFxuICAvLyBhbmQgdGhlbiByZXN1bWUsIGFuZCB0cnkgdG8gZ2V0IHRoZW0gYSBzZWNvbmQgdGltZS5cbiAgaWYgKG1lLl9nb3RFbnRyaWVzKSByZXR1cm5cbiAgbWUuX2dvdEVudHJpZXMgPSB0cnVlXG5cbiAgZnMucmVhZGRpcihtZS5fcGF0aCwgZnVuY3Rpb24gKGVyLCBlbnRyaWVzKSB7XG4gICAgaWYgKGVyKSByZXR1cm4gbWUuZXJyb3IoZXIpXG5cbiAgICBtZS5lbnRyaWVzID0gZW50cmllc1xuXG4gICAgbWUuZW1pdChcImVudHJpZXNcIiwgZW50cmllcylcbiAgICBpZiAobWUuX3BhdXNlZCkgbWUub25jZShcInJlc3VtZVwiLCBwcm9jZXNzRW50cmllcylcbiAgICBlbHNlIHByb2Nlc3NFbnRyaWVzKClcblxuICAgIGZ1bmN0aW9uIHByb2Nlc3NFbnRyaWVzICgpIHtcbiAgICAgIG1lLl9sZW5ndGggPSBtZS5lbnRyaWVzLmxlbmd0aFxuICAgICAgaWYgKHR5cGVvZiBtZS5zb3J0ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgbWUuZW50cmllcyA9IG1lLmVudHJpZXMuc29ydChtZS5zb3J0LmJpbmQobWUpKVxuICAgICAgfVxuICAgICAgbWUuX3JlYWQoKVxuICAgIH1cbiAgfSlcbn1cblxuLy8gc3RhcnQgd2Fsa2luZyB0aGUgZGlyLCBhbmQgZW1pdCBhbiBcImVudHJ5XCIgZXZlbnQgZm9yIGVhY2ggb25lLlxuRGlyUmVhZGVyLnByb3RvdHlwZS5fcmVhZCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG1lID0gdGhpc1xuXG4gIGlmICghbWUuZW50cmllcykgcmV0dXJuIG1lLl9nZXRFbnRyaWVzKClcblxuICBpZiAobWUuX3BhdXNlZCB8fCBtZS5fY3VycmVudEVudHJ5IHx8IG1lLl9hYm9ydGVkKSB7XG4gICAgLy8gY29uc29sZS5lcnJvcihcIkRSIHBhdXNlZD0laiwgY3VycmVudD0laiwgYWJvcnRlZD0lalwiLCBtZS5fcGF1c2VkLCAhIW1lLl9jdXJyZW50RW50cnksIG1lLl9hYm9ydGVkKVxuICAgIHJldHVyblxuICB9XG5cbiAgbWUuX2luZGV4ICsrXG4gIGlmIChtZS5faW5kZXggPj0gbWUuZW50cmllcy5sZW5ndGgpIHtcbiAgICBpZiAoIW1lLl9lbmRlZCkge1xuICAgICAgbWUuX2VuZGVkID0gdHJ1ZVxuICAgICAgbWUuZW1pdChcImVuZFwiKVxuICAgICAgbWUuZW1pdChcImNsb3NlXCIpXG4gICAgfVxuICAgIHJldHVyblxuICB9XG5cbiAgLy8gb2ssIGhhbmRsZSB0aGlzIG9uZSwgdGhlbi5cblxuICAvLyBzYXZlIGNyZWF0aW5nIGEgcHJveHksIGJ5IHN0YXQnaW5nIHRoZSB0aGluZyBub3cuXG4gIHZhciBwID0gcGF0aC5yZXNvbHZlKG1lLl9wYXRoLCBtZS5lbnRyaWVzW21lLl9pbmRleF0pXG4gIGFzc2VydChwICE9PSBtZS5fcGF0aClcbiAgYXNzZXJ0KG1lLmVudHJpZXNbbWUuX2luZGV4XSlcblxuICAvLyBzZXQgdGhpcyB0byBwcmV2ZW50IHRyeWluZyB0byBfcmVhZCgpIGFnYWluIGluIHRoZSBzdGF0IHRpbWUuXG4gIG1lLl9jdXJyZW50RW50cnkgPSBwXG4gIGZzWyBtZS5wcm9wcy5mb2xsb3cgPyBcInN0YXRcIiA6IFwibHN0YXRcIiBdKHAsIGZ1bmN0aW9uIChlciwgc3RhdCkge1xuICAgIGlmIChlcikgcmV0dXJuIG1lLmVycm9yKGVyKVxuXG4gICAgdmFyIHdobyA9IG1lLl9wcm94eSB8fCBtZVxuXG4gICAgc3RhdC5wYXRoID0gcFxuICAgIHN0YXQuYmFzZW5hbWUgPSBwYXRoLmJhc2VuYW1lKHApXG4gICAgc3RhdC5kaXJuYW1lID0gcGF0aC5kaXJuYW1lKHApXG4gICAgdmFyIGNoaWxkUHJvcHMgPSBtZS5nZXRDaGlsZFByb3BzLmNhbGwod2hvLCBzdGF0KVxuICAgIGNoaWxkUHJvcHMucGF0aCA9IHBcbiAgICBjaGlsZFByb3BzLmJhc2VuYW1lID0gcGF0aC5iYXNlbmFtZShwKVxuICAgIGNoaWxkUHJvcHMuZGlybmFtZSA9IHBhdGguZGlybmFtZShwKVxuXG4gICAgdmFyIGVudHJ5ID0gUmVhZGVyKGNoaWxkUHJvcHMsIHN0YXQpXG5cbiAgICAvLyBjb25zb2xlLmVycm9yKFwiRFIgRW50cnlcIiwgcCwgc3RhdC5zaXplKVxuXG4gICAgbWUuX2N1cnJlbnRFbnRyeSA9IGVudHJ5XG5cbiAgICAvLyBcImVudHJ5XCIgZXZlbnRzIGFyZSBmb3IgZGlyZWN0IGVudHJpZXMgaW4gYSBzcGVjaWZpYyBkaXIuXG4gICAgLy8gXCJjaGlsZFwiIGV2ZW50cyBhcmUgZm9yIGFueSBhbmQgYWxsIGNoaWxkcmVuIGF0IGFsbCBsZXZlbHMuXG4gICAgLy8gVGhpcyBub21lbmNsYXR1cmUgaXMgbm90IGNvbXBsZXRlbHkgZmluYWwuXG5cbiAgICBlbnRyeS5vbihcInBhdXNlXCIsIGZ1bmN0aW9uICh3aG8pIHtcbiAgICAgIGlmICghbWUuX3BhdXNlZCAmJiAhZW50cnkuX2Rpc293bmVkKSB7XG4gICAgICAgIG1lLnBhdXNlKHdobylcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgZW50cnkub24oXCJyZXN1bWVcIiwgZnVuY3Rpb24gKHdobykge1xuICAgICAgaWYgKG1lLl9wYXVzZWQgJiYgIWVudHJ5Ll9kaXNvd25lZCkge1xuICAgICAgICBtZS5yZXN1bWUod2hvKVxuICAgICAgfVxuICAgIH0pXG5cbiAgICBlbnRyeS5vbihcInN0YXRcIiwgZnVuY3Rpb24gKHByb3BzKSB7XG4gICAgICBtZS5lbWl0KFwiX2VudHJ5U3RhdFwiLCBlbnRyeSwgcHJvcHMpXG4gICAgICBpZiAoZW50cnkuX2Fib3J0ZWQpIHJldHVyblxuICAgICAgaWYgKGVudHJ5Ll9wYXVzZWQpIGVudHJ5Lm9uY2UoXCJyZXN1bWVcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICBtZS5lbWl0KFwiZW50cnlTdGF0XCIsIGVudHJ5LCBwcm9wcylcbiAgICAgIH0pXG4gICAgICBlbHNlIG1lLmVtaXQoXCJlbnRyeVN0YXRcIiwgZW50cnksIHByb3BzKVxuICAgIH0pXG5cbiAgICBlbnRyeS5vbihcInJlYWR5XCIsIGZ1bmN0aW9uIEVNSVRDSElMRCAoKSB7XG4gICAgICAvLyBjb25zb2xlLmVycm9yKFwiRFIgZW1pdCBjaGlsZFwiLCBlbnRyeS5fcGF0aClcbiAgICAgIGlmIChtZS5fcGF1c2VkKSB7XG4gICAgICAgIC8vIGNvbnNvbGUuZXJyb3IoXCIgIERSIGVtaXQgY2hpbGQgLSB0cnkgYWdhaW4gbGF0ZXJcIilcbiAgICAgICAgLy8gcGF1c2UgdGhlIGNoaWxkLCBhbmQgZW1pdCB0aGUgXCJlbnRyeVwiIGV2ZW50IG9uY2Ugd2UgZHJhaW4uXG4gICAgICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJEUiBwYXVzaW5nIGNoaWxkIGVudHJ5XCIpXG4gICAgICAgIGVudHJ5LnBhdXNlKG1lKVxuICAgICAgICByZXR1cm4gbWUub25jZShcInJlc3VtZVwiLCBFTUlUQ0hJTEQpXG4gICAgICB9XG5cbiAgICAgIC8vIHNraXAgb3ZlciBzb2NrZXRzLiAgdGhleSBjYW4ndCBiZSBwaXBlZCBhcm91bmQgcHJvcGVybHksXG4gICAgICAvLyBzbyB0aGVyZSdzIHJlYWxseSBubyBzZW5zZSBldmVuIGFja25vd2xlZGdpbmcgdGhlbS5cbiAgICAgIC8vIGlmIHNvbWVvbmUgcmVhbGx5IHdhbnRzIHRvIHNlZSB0aGVtLCB0aGV5IGNhbiBsaXN0ZW4gdG9cbiAgICAgIC8vIHRoZSBcInNvY2tldFwiIGV2ZW50cy5cbiAgICAgIGlmIChlbnRyeS50eXBlID09PSBcIlNvY2tldFwiKSB7XG4gICAgICAgIG1lLmVtaXQoXCJzb2NrZXRcIiwgZW50cnkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtZS5lbWl0RW50cnkoZW50cnkpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHZhciBlbmRlZCA9IGZhbHNlXG4gICAgZW50cnkub24oXCJjbG9zZVwiLCBvbmVuZClcbiAgICBlbnRyeS5vbihcImRpc293blwiLCBvbmVuZClcbiAgICBmdW5jdGlvbiBvbmVuZCAoKSB7XG4gICAgICBpZiAoZW5kZWQpIHJldHVyblxuICAgICAgZW5kZWQgPSB0cnVlXG4gICAgICBtZS5lbWl0KFwiY2hpbGRFbmRcIiwgZW50cnkpXG4gICAgICBtZS5lbWl0KFwiZW50cnlFbmRcIiwgZW50cnkpXG4gICAgICBtZS5fY3VycmVudEVudHJ5ID0gbnVsbFxuICAgICAgaWYgKCFtZS5fcGF1c2VkKSB7XG4gICAgICAgIG1lLl9yZWFkKClcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBYWFggUmVtb3ZlIHRoaXMuICBXb3JrcyBpbiBub2RlIGFzIG9mIDAuNi4yIG9yIHNvLlxuICAgIC8vIExvbmcgZmlsZW5hbWVzIHNob3VsZCBub3QgYnJlYWsgc3R1ZmYuXG4gICAgZW50cnkub24oXCJlcnJvclwiLCBmdW5jdGlvbiAoZXIpIHtcbiAgICAgIGlmIChlbnRyeS5fc3dhbGxvd0Vycm9ycykge1xuICAgICAgICBtZS53YXJuKGVyKVxuICAgICAgICBlbnRyeS5lbWl0KFwiZW5kXCIpXG4gICAgICAgIGVudHJ5LmVtaXQoXCJjbG9zZVwiKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWUuZW1pdChcImVycm9yXCIsIGVyKVxuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBwcm94eSB1cCBzb21lIGV2ZW50cy5cbiAgICA7IFsgXCJjaGlsZFwiXG4gICAgICAsIFwiY2hpbGRFbmRcIlxuICAgICAgLCBcIndhcm5cIlxuICAgICAgXS5mb3JFYWNoKGZ1bmN0aW9uIChldikge1xuICAgICAgICBlbnRyeS5vbihldiwgbWUuZW1pdC5iaW5kKG1lLCBldikpXG4gICAgICB9KVxuICB9KVxufVxuXG5EaXJSZWFkZXIucHJvdG90eXBlLmRpc293biA9IGZ1bmN0aW9uIChlbnRyeSkge1xuICBlbnRyeS5lbWl0KFwiYmVmb3JlRGlzb3duXCIpXG4gIGVudHJ5Ll9kaXNvd25lZCA9IHRydWVcbiAgZW50cnkucGFyZW50ID0gZW50cnkucm9vdCA9IG51bGxcbiAgaWYgKGVudHJ5ID09PSB0aGlzLl9jdXJyZW50RW50cnkpIHtcbiAgICB0aGlzLl9jdXJyZW50RW50cnkgPSBudWxsXG4gIH1cbiAgZW50cnkuZW1pdChcImRpc293blwiKVxufVxuXG5EaXJSZWFkZXIucHJvdG90eXBlLmdldENoaWxkUHJvcHMgPSBmdW5jdGlvbiAoc3RhdCkge1xuICByZXR1cm4geyBkZXB0aDogdGhpcy5kZXB0aCArIDFcbiAgICAgICAgICwgcm9vdDogdGhpcy5yb290IHx8IHRoaXNcbiAgICAgICAgICwgcGFyZW50OiB0aGlzXG4gICAgICAgICAsIGZvbGxvdzogdGhpcy5mb2xsb3dcbiAgICAgICAgICwgZmlsdGVyOiB0aGlzLmZpbHRlclxuICAgICAgICAgLCBzb3J0OiB0aGlzLnByb3BzLnNvcnRcbiAgICAgICAgICwgaGFyZGxpbmtzOiB0aGlzLnByb3BzLmhhcmRsaW5rc1xuICAgICAgICAgfVxufVxuXG5EaXJSZWFkZXIucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24gKHdobykge1xuICB2YXIgbWUgPSB0aGlzXG4gIGlmIChtZS5fcGF1c2VkKSByZXR1cm5cbiAgd2hvID0gd2hvIHx8IG1lXG4gIG1lLl9wYXVzZWQgPSB0cnVlXG4gIGlmIChtZS5fY3VycmVudEVudHJ5ICYmIG1lLl9jdXJyZW50RW50cnkucGF1c2UpIHtcbiAgICBtZS5fY3VycmVudEVudHJ5LnBhdXNlKHdobylcbiAgfVxuICBtZS5lbWl0KFwicGF1c2VcIiwgd2hvKVxufVxuXG5EaXJSZWFkZXIucHJvdG90eXBlLnJlc3VtZSA9IGZ1bmN0aW9uICh3aG8pIHtcbiAgdmFyIG1lID0gdGhpc1xuICBpZiAoIW1lLl9wYXVzZWQpIHJldHVyblxuICB3aG8gPSB3aG8gfHwgbWVcblxuICBtZS5fcGF1c2VkID0gZmFsc2VcbiAgLy8gY29uc29sZS5lcnJvcihcIkRSIEVtaXQgUmVzdW1lXCIsIG1lLl9wYXRoKVxuICBtZS5lbWl0KFwicmVzdW1lXCIsIHdobylcbiAgaWYgKG1lLl9wYXVzZWQpIHtcbiAgICAvLyBjb25zb2xlLmVycm9yKFwiRFIgUmUtcGF1c2VkXCIsIG1lLl9wYXRoKVxuICAgIHJldHVyblxuICB9XG5cbiAgaWYgKG1lLl9jdXJyZW50RW50cnkpIHtcbiAgICBpZiAobWUuX2N1cnJlbnRFbnRyeS5yZXN1bWUpIG1lLl9jdXJyZW50RW50cnkucmVzdW1lKHdobylcbiAgfSBlbHNlIG1lLl9yZWFkKClcbn1cblxuRGlyUmVhZGVyLnByb3RvdHlwZS5lbWl0RW50cnkgPSBmdW5jdGlvbiAoZW50cnkpIHtcbiAgdGhpcy5lbWl0KFwiZW50cnlcIiwgZW50cnkpXG4gIHRoaXMuZW1pdChcImNoaWxkXCIsIGVudHJ5KVxufVxuIiwiLy8gSXQgaXMgZXhwZWN0ZWQgdGhhdCwgd2hlbiAuYWRkKCkgcmV0dXJucyBmYWxzZSwgdGhlIGNvbnN1bWVyXG4vLyBvZiB0aGUgRGlyV3JpdGVyIHdpbGwgcGF1c2UgdW50aWwgYSBcImRyYWluXCIgZXZlbnQgb2NjdXJzLiBOb3RlXG4vLyB0aGF0IHRoaXMgaXMgKmFsbW9zdCBhbHdheXMgZ29pbmcgdG8gYmUgdGhlIGNhc2UqLCB1bmxlc3MgdGhlXG4vLyB0aGluZyBiZWluZyB3cml0dGVuIGlzIHNvbWUgc29ydCBvZiB1bnN1cHBvcnRlZCB0eXBlLCBhbmQgdGh1c1xuLy8gc2tpcHBlZCBvdmVyLlxuXG5tb2R1bGUuZXhwb3J0cyA9IERpcldyaXRlclxuXG52YXIgZnMgPSByZXF1aXJlKFwiZ3JhY2VmdWwtZnNcIilcbiAgLCBmc3RyZWFtID0gcmVxdWlyZShcIi4uL2ZzdHJlYW0uanNcIilcbiAgLCBXcml0ZXIgPSByZXF1aXJlKFwiLi93cml0ZXIuanNcIilcbiAgLCBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKVxuICAsIG1rZGlyID0gcmVxdWlyZShcIm1rZGlycFwiKVxuICAsIHBhdGggPSByZXF1aXJlKFwicGF0aFwiKVxuICAsIGNvbGxlY3QgPSByZXF1aXJlKFwiLi9jb2xsZWN0LmpzXCIpXG5cbmluaGVyaXRzKERpcldyaXRlciwgV3JpdGVyKVxuXG5mdW5jdGlvbiBEaXJXcml0ZXIgKHByb3BzKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgaWYgKCEobWUgaW5zdGFuY2VvZiBEaXJXcml0ZXIpKSBtZS5lcnJvcihcbiAgICBcIkRpcldyaXRlciBtdXN0IGJlIGNhbGxlZCBhcyBjb25zdHJ1Y3Rvci5cIiwgbnVsbCwgdHJ1ZSlcblxuICAvLyBzaG91bGQgYWxyZWFkeSBiZSBlc3RhYmxpc2hlZCBhcyBhIERpcmVjdG9yeSB0eXBlXG4gIGlmIChwcm9wcy50eXBlICE9PSBcIkRpcmVjdG9yeVwiIHx8ICFwcm9wcy5EaXJlY3RvcnkpIHtcbiAgICBtZS5lcnJvcihcIk5vbi1kaXJlY3RvcnkgdHlwZSBcIisgcHJvcHMudHlwZSArIFwiIFwiICtcbiAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkocHJvcHMpLCBudWxsLCB0cnVlKVxuICB9XG5cbiAgV3JpdGVyLmNhbGwodGhpcywgcHJvcHMpXG59XG5cbkRpcldyaXRlci5wcm90b3R5cGUuX2NyZWF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG1lID0gdGhpc1xuICBta2RpcihtZS5fcGF0aCwgV3JpdGVyLmRpcm1vZGUsIGZ1bmN0aW9uIChlcikge1xuICAgIGlmIChlcikgcmV0dXJuIG1lLmVycm9yKGVyKVxuICAgIC8vIHJlYWR5IHRvIHN0YXJ0IGdldHRpbmcgZW50cmllcyFcbiAgICBtZS5yZWFkeSA9IHRydWVcbiAgICBtZS5lbWl0KFwicmVhZHlcIilcbiAgICBtZS5fcHJvY2VzcygpXG4gIH0pXG59XG5cbi8vIGEgRGlyV3JpdGVyIGhhcyBhbiBhZGQoZW50cnkpIG1ldGhvZCwgYnV0IGl0cyAud3JpdGUoKSBkb2Vzbid0XG4vLyBkbyBhbnl0aGluZy4gIFdoeSBhIG5vLW9wIHJhdGhlciB0aGFuIGEgdGhyb3c/ICBCZWNhdXNlIHRoaXNcbi8vIGxlYXZlcyBvcGVuIHRoZSBkb29yIGZvciB3cml0aW5nIGRpcmVjdG9yeSBtZXRhZGF0YSBmb3Jcbi8vIGdudS9zb2xhcmlzIHN0eWxlIGR1bXBkaXJzLlxuRGlyV3JpdGVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRydWVcbn1cblxuRGlyV3JpdGVyLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuX2VuZGVkID0gdHJ1ZVxuICB0aGlzLl9wcm9jZXNzKClcbn1cblxuRGlyV3JpdGVyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAoZW50cnkpIHtcbiAgdmFyIG1lID0gdGhpc1xuXG4gIC8vIGNvbnNvbGUuZXJyb3IoXCJcXHRhZGRcIiwgZW50cnkuX3BhdGgsIFwiLT5cIiwgbWUuX3BhdGgpXG4gIGNvbGxlY3QoZW50cnkpXG4gIGlmICghbWUucmVhZHkgfHwgbWUuX2N1cnJlbnRFbnRyeSkge1xuICAgIG1lLl9idWZmZXIucHVzaChlbnRyeSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIC8vIGNyZWF0ZSBhIG5ldyB3cml0ZXIsIGFuZCBwaXBlIHRoZSBpbmNvbWluZyBlbnRyeSBpbnRvIGl0LlxuICBpZiAobWUuX2VuZGVkKSB7XG4gICAgcmV0dXJuIG1lLmVycm9yKFwiYWRkIGFmdGVyIGVuZFwiKVxuICB9XG5cbiAgbWUuX2J1ZmZlci5wdXNoKGVudHJ5KVxuICBtZS5fcHJvY2VzcygpXG5cbiAgcmV0dXJuIDAgPT09IHRoaXMuX2J1ZmZlci5sZW5ndGhcbn1cblxuRGlyV3JpdGVyLnByb3RvdHlwZS5fcHJvY2VzcyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG1lID0gdGhpc1xuXG4gIC8vIGNvbnNvbGUuZXJyb3IoXCJEVyBQcm9jZXNzIHA9JWpcIiwgbWUuX3Byb2Nlc3NpbmcsIG1lLmJhc2VuYW1lKVxuXG4gIGlmIChtZS5fcHJvY2Vzc2luZykgcmV0dXJuXG5cbiAgdmFyIGVudHJ5ID0gbWUuX2J1ZmZlci5zaGlmdCgpXG4gIGlmICghZW50cnkpIHtcbiAgICAvLyBjb25zb2xlLmVycm9yKFwiRFcgRHJhaW5cIilcbiAgICBtZS5lbWl0KFwiZHJhaW5cIilcbiAgICBpZiAobWUuX2VuZGVkKSBtZS5fZmluaXNoKClcbiAgICByZXR1cm5cbiAgfVxuXG4gIG1lLl9wcm9jZXNzaW5nID0gdHJ1ZVxuICAvLyBjb25zb2xlLmVycm9yKFwiRFcgRW50cnlcIiwgZW50cnkuX3BhdGgpXG5cbiAgbWUuZW1pdChcImVudHJ5XCIsIGVudHJ5KVxuXG4gIC8vIG9rLCBhZGQgdGhpcyBlbnRyeVxuICAvL1xuICAvLyBkb24ndCBhbGxvdyByZWN1cnNpdmUgY29weWluZ1xuICB2YXIgcCA9IGVudHJ5XG4gIGRvIHtcbiAgICB2YXIgcHAgPSBwLl9wYXRoIHx8IHAucGF0aFxuICAgIGlmIChwcCA9PT0gbWUucm9vdC5fcGF0aCB8fCBwcCA9PT0gbWUuX3BhdGggfHxcbiAgICAgICAgKHBwICYmIHBwLmluZGV4T2YobWUuX3BhdGgpID09PSAwKSkge1xuICAgICAgLy8gY29uc29sZS5lcnJvcihcIkRXIEV4aXQgKHJlY3Vyc2l2ZSlcIiwgZW50cnkuYmFzZW5hbWUsIG1lLl9wYXRoKVxuICAgICAgbWUuX3Byb2Nlc3NpbmcgPSBmYWxzZVxuICAgICAgaWYgKGVudHJ5Ll9jb2xsZWN0ZWQpIGVudHJ5LnBpcGUoKVxuICAgICAgcmV0dXJuIG1lLl9wcm9jZXNzKClcbiAgICB9XG4gIH0gd2hpbGUgKHAgPSBwLnBhcmVudClcblxuICAvLyBjb25zb2xlLmVycm9yKFwiRFcgbm90IHJlY3Vyc2l2ZVwiKVxuXG4gIC8vIGNob3Agb2ZmIHRoZSBlbnRyeSdzIHJvb3QgZGlyLCByZXBsYWNlIHdpdGggb3Vyc1xuICB2YXIgcHJvcHMgPSB7IHBhcmVudDogbWVcbiAgICAgICAgICAgICAgLCByb290OiBtZS5yb290IHx8IG1lXG4gICAgICAgICAgICAgICwgdHlwZTogZW50cnkudHlwZVxuICAgICAgICAgICAgICAsIGRlcHRoOiBtZS5kZXB0aCArIDEgfVxuXG4gIHZhciBwID0gZW50cnkuX3BhdGggfHwgZW50cnkucGF0aCB8fCBlbnRyeS5wcm9wcy5wYXRoXG4gIGlmIChlbnRyeS5wYXJlbnQpIHtcbiAgICBwID0gcC5zdWJzdHIoZW50cnkucGFyZW50Ll9wYXRoLmxlbmd0aCArIDEpXG4gIH1cbiAgLy8gZ2V0IHJpZCBvZiBhbnkgLi4vLi4vIHNoZW5hbmlnYW5zXG4gIHByb3BzLnBhdGggPSBwYXRoLmpvaW4obWUucGF0aCwgcGF0aC5qb2luKFwiL1wiLCBwKSlcblxuICAvLyBpZiBpIGhhdmUgYSBmaWx0ZXIsIHRoZSBjaGlsZCBzaG91bGQgaW5oZXJpdCBpdC5cbiAgcHJvcHMuZmlsdGVyID0gbWUuZmlsdGVyXG5cbiAgLy8gYWxsIHRoZSByZXN0IG9mIHRoZSBzdHVmZiwgY29weSBvdmVyIGZyb20gdGhlIHNvdXJjZS5cbiAgT2JqZWN0LmtleXMoZW50cnkucHJvcHMpLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICBpZiAoIXByb3BzLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICBwcm9wc1trXSA9IGVudHJ5LnByb3BzW2tdXG4gICAgfVxuICB9KVxuXG4gIC8vIG5vdCBzdXJlIGF0IHRoaXMgcG9pbnQgd2hhdCBraW5kIG9mIHdyaXRlciB0aGlzIGlzLlxuICB2YXIgY2hpbGQgPSBtZS5fY3VycmVudENoaWxkID0gbmV3IFdyaXRlcihwcm9wcylcbiAgY2hpbGQub24oXCJyZWFkeVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgLy8gY29uc29sZS5lcnJvcihcIkRXIENoaWxkIFJlYWR5XCIsIGNoaWxkLnR5cGUsIGNoaWxkLl9wYXRoKVxuICAgIC8vIGNvbnNvbGUuZXJyb3IoXCIgIHJlc3VtaW5nXCIsIGVudHJ5Ll9wYXRoKVxuICAgIGVudHJ5LnBpcGUoY2hpbGQpXG4gICAgZW50cnkucmVzdW1lKClcbiAgfSlcblxuICAvLyBYWFggTWFrZSB0aGlzIHdvcmsgaW4gbm9kZS5cbiAgLy8gTG9uZyBmaWxlbmFtZXMgc2hvdWxkIG5vdCBicmVhayBzdHVmZi5cbiAgY2hpbGQub24oXCJlcnJvclwiLCBmdW5jdGlvbiAoZXIpIHtcbiAgICBpZiAoY2hpbGQuX3N3YWxsb3dFcnJvcnMpIHtcbiAgICAgIG1lLndhcm4oZXIpXG4gICAgICBjaGlsZC5lbWl0KFwiZW5kXCIpXG4gICAgICBjaGlsZC5lbWl0KFwiY2xvc2VcIilcbiAgICB9IGVsc2Uge1xuICAgICAgbWUuZW1pdChcImVycm9yXCIsIGVyKVxuICAgIH1cbiAgfSlcblxuICAvLyB3ZSBmaXJlIF9lbmQgaW50ZXJuYWxseSAqYWZ0ZXIqIGVuZCwgc28gdGhhdCB3ZSBkb24ndCBtb3ZlIG9uXG4gIC8vIHVudGlsIGFueSBcImVuZFwiIGxpc3RlbmVycyBoYXZlIGhhZCB0aGVpciBjaGFuY2UgdG8gZG8gc3R1ZmYuXG4gIGNoaWxkLm9uKFwiY2xvc2VcIiwgb25lbmQpXG4gIHZhciBlbmRlZCA9IGZhbHNlXG4gIGZ1bmN0aW9uIG9uZW5kICgpIHtcbiAgICBpZiAoZW5kZWQpIHJldHVyblxuICAgIGVuZGVkID0gdHJ1ZVxuICAgIC8vIGNvbnNvbGUuZXJyb3IoXCIqIERXIENoaWxkIGVuZFwiLCBjaGlsZC5iYXNlbmFtZSlcbiAgICBtZS5fY3VycmVudENoaWxkID0gbnVsbFxuICAgIG1lLl9wcm9jZXNzaW5nID0gZmFsc2VcbiAgICBtZS5fcHJvY2VzcygpXG4gIH1cbn1cbiIsIi8vIEJhc2ljYWxseSBqdXN0IGEgd3JhcHBlciBhcm91bmQgYW4gZnMuUmVhZFN0cmVhbVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVSZWFkZXJcblxudmFyIGZzID0gcmVxdWlyZShcImdyYWNlZnVsLWZzXCIpXG4gICwgZnN0cmVhbSA9IHJlcXVpcmUoXCIuLi9mc3RyZWFtLmpzXCIpXG4gICwgUmVhZGVyID0gZnN0cmVhbS5SZWFkZXJcbiAgLCBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKVxuICAsIG1rZGlyID0gcmVxdWlyZShcIm1rZGlycFwiKVxuICAsIFJlYWRlciA9IHJlcXVpcmUoXCIuL3JlYWRlci5qc1wiKVxuICAsIEVPRiA9IHtFT0Y6IHRydWV9XG4gICwgQ0xPU0UgPSB7Q0xPU0U6IHRydWV9XG5cbmluaGVyaXRzKEZpbGVSZWFkZXIsIFJlYWRlcilcblxuZnVuY3Rpb24gRmlsZVJlYWRlciAocHJvcHMpIHtcbiAgLy8gY29uc29sZS5lcnJvcihcIiAgICBGUiBjcmVhdGVcIiwgcHJvcHMucGF0aCwgcHJvcHMuc2l6ZSwgbmV3IEVycm9yKCkuc3RhY2spXG4gIHZhciBtZSA9IHRoaXNcbiAgaWYgKCEobWUgaW5zdGFuY2VvZiBGaWxlUmVhZGVyKSkgdGhyb3cgbmV3IEVycm9yKFxuICAgIFwiRmlsZVJlYWRlciBtdXN0IGJlIGNhbGxlZCBhcyBjb25zdHJ1Y3Rvci5cIilcblxuICAvLyBzaG91bGQgYWxyZWFkeSBiZSBlc3RhYmxpc2hlZCBhcyBhIEZpbGUgdHlwZVxuICAvLyBYWFggVG9kbzogcHJlc2VydmUgaGFyZGxpbmtzIGJ5IHRyYWNraW5nIGRlditpbm9kZStubGluayxcbiAgLy8gd2l0aCBhIEhhcmRMaW5rUmVhZGVyIGNsYXNzLlxuICBpZiAoISgocHJvcHMudHlwZSA9PT0gXCJMaW5rXCIgJiYgcHJvcHMuTGluaykgfHxcbiAgICAgICAgKHByb3BzLnR5cGUgPT09IFwiRmlsZVwiICYmIHByb3BzLkZpbGUpKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk5vbi1maWxlIHR5cGUgXCIrIHByb3BzLnR5cGUpXG4gIH1cblxuICBtZS5fYnVmZmVyID0gW11cbiAgbWUuX2J5dGVzRW1pdHRlZCA9IDBcbiAgUmVhZGVyLmNhbGwobWUsIHByb3BzKVxufVxuXG5GaWxlUmVhZGVyLnByb3RvdHlwZS5fZ2V0U3RyZWFtID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbWUgPSB0aGlzXG4gICAgLCBzdHJlYW0gPSBtZS5fc3RyZWFtID0gZnMuY3JlYXRlUmVhZFN0cmVhbShtZS5fcGF0aCwgbWUucHJvcHMpXG5cbiAgaWYgKG1lLnByb3BzLmJsa3NpemUpIHtcbiAgICBzdHJlYW0uYnVmZmVyU2l6ZSA9IG1lLnByb3BzLmJsa3NpemVcbiAgfVxuXG4gIHN0cmVhbS5vbihcIm9wZW5cIiwgbWUuZW1pdC5iaW5kKG1lLCBcIm9wZW5cIikpXG5cbiAgc3RyZWFtLm9uKFwiZGF0YVwiLCBmdW5jdGlvbiAoYykge1xuICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJcXHRcXHQlZCAlc1wiLCBjLmxlbmd0aCwgbWUuYmFzZW5hbWUpXG4gICAgbWUuX2J5dGVzRW1pdHRlZCArPSBjLmxlbmd0aFxuICAgIC8vIG5vIHBvaW50IHNhdmluZyBlbXB0eSBjaHVua3NcbiAgICBpZiAoIWMubGVuZ3RoKSByZXR1cm5cbiAgICBlbHNlIGlmIChtZS5fcGF1c2VkIHx8IG1lLl9idWZmZXIubGVuZ3RoKSB7XG4gICAgICBtZS5fYnVmZmVyLnB1c2goYylcbiAgICAgIG1lLl9yZWFkKClcbiAgICB9IGVsc2UgbWUuZW1pdChcImRhdGFcIiwgYylcbiAgfSlcblxuICBzdHJlYW0ub24oXCJlbmRcIiwgZnVuY3Rpb24gKCkge1xuICAgIGlmIChtZS5fcGF1c2VkIHx8IG1lLl9idWZmZXIubGVuZ3RoKSB7XG4gICAgICAvLyBjb25zb2xlLmVycm9yKFwiRlIgQnVmZmVyaW5nIEVuZFwiLCBtZS5fcGF0aClcbiAgICAgIG1lLl9idWZmZXIucHVzaChFT0YpXG4gICAgICBtZS5fcmVhZCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIG1lLmVtaXQoXCJlbmRcIilcbiAgICB9XG5cbiAgICBpZiAobWUuX2J5dGVzRW1pdHRlZCAhPT0gbWUucHJvcHMuc2l6ZSkge1xuICAgICAgbWUuZXJyb3IoXCJEaWRuJ3QgZ2V0IGV4cGVjdGVkIGJ5dGUgY291bnRcXG5cIitcbiAgICAgICAgICAgICAgIFwiZXhwZWN0OiBcIittZS5wcm9wcy5zaXplICsgXCJcXG5cIiArXG4gICAgICAgICAgICAgICBcImFjdHVhbDogXCIrbWUuX2J5dGVzRW1pdHRlZClcbiAgICB9XG4gIH0pXG5cbiAgc3RyZWFtLm9uKFwiY2xvc2VcIiwgZnVuY3Rpb24gKCkge1xuICAgIGlmIChtZS5fcGF1c2VkIHx8IG1lLl9idWZmZXIubGVuZ3RoKSB7XG4gICAgICAvLyBjb25zb2xlLmVycm9yKFwiRlIgQnVmZmVyaW5nIENsb3NlXCIsIG1lLl9wYXRoKVxuICAgICAgbWUuX2J1ZmZlci5wdXNoKENMT1NFKVxuICAgICAgbWUuX3JlYWQoKVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjb25zb2xlLmVycm9yKFwiRlIgY2xvc2UgMVwiLCBtZS5fcGF0aClcbiAgICAgIG1lLmVtaXQoXCJjbG9zZVwiKVxuICAgIH1cbiAgfSlcblxuICBtZS5fcmVhZCgpXG59XG5cbkZpbGVSZWFkZXIucHJvdG90eXBlLl9yZWFkID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbWUgPSB0aGlzXG4gIC8vIGNvbnNvbGUuZXJyb3IoXCJGUiBfcmVhZFwiLCBtZS5fcGF0aClcbiAgaWYgKG1lLl9wYXVzZWQpIHtcbiAgICAvLyBjb25zb2xlLmVycm9yKFwiRlIgX3JlYWQgcGF1c2VkXCIsIG1lLl9wYXRoKVxuICAgIHJldHVyblxuICB9XG5cbiAgaWYgKCFtZS5fc3RyZWFtKSB7XG4gICAgLy8gY29uc29sZS5lcnJvcihcIkZSIF9nZXRTdHJlYW0gY2FsbGluZ1wiLCBtZS5fcGF0aClcbiAgICByZXR1cm4gbWUuX2dldFN0cmVhbSgpXG4gIH1cblxuICAvLyBjbGVhciBvdXQgdGhlIGJ1ZmZlciwgaWYgdGhlcmUgaXMgb25lLlxuICBpZiAobWUuX2J1ZmZlci5sZW5ndGgpIHtcbiAgICAvLyBjb25zb2xlLmVycm9yKFwiRlIgX3JlYWQgaGFzIGJ1ZmZlclwiLCBtZS5fYnVmZmVyLmxlbmd0aCwgbWUuX3BhdGgpXG4gICAgdmFyIGJ1ZiA9IG1lLl9idWZmZXJcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGJ1Zi5sZW5ndGg7IGkgPCBsOyBpICsrKSB7XG4gICAgICB2YXIgYyA9IGJ1ZltpXVxuICAgICAgaWYgKGMgPT09IEVPRikge1xuICAgICAgICAvLyBjb25zb2xlLmVycm9yKFwiRlIgUmVhZCBlbWl0dGluZyBidWZmZXJlZCBlbmRcIiwgbWUuX3BhdGgpXG4gICAgICAgIG1lLmVtaXQoXCJlbmRcIilcbiAgICAgIH0gZWxzZSBpZiAoYyA9PT0gQ0xPU0UpIHtcbiAgICAgICAgLy8gY29uc29sZS5lcnJvcihcIkZSIFJlYWQgZW1pdHRpbmcgYnVmZmVyZWQgY2xvc2VcIiwgbWUuX3BhdGgpXG4gICAgICAgIG1lLmVtaXQoXCJjbG9zZVwiKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gY29uc29sZS5lcnJvcihcIkZSIFJlYWQgZW1pdHRpbmcgYnVmZmVyZWQgZGF0YVwiLCBtZS5fcGF0aClcbiAgICAgICAgbWUuZW1pdChcImRhdGFcIiwgYylcbiAgICAgIH1cblxuICAgICAgaWYgKG1lLl9wYXVzZWQpIHtcbiAgICAgICAgLy8gY29uc29sZS5lcnJvcihcIkZSIFJlYWQgUmUtcGF1c2luZyBhdCBcIitpLCBtZS5fcGF0aClcbiAgICAgICAgbWUuX2J1ZmZlciA9IGJ1Zi5zbGljZShpKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICB9XG4gICAgbWUuX2J1ZmZlci5sZW5ndGggPSAwXG4gIH1cbiAgLy8gY29uc29sZS5lcnJvcihcIkZSIF9yZWFkIGRvbmVcIilcbiAgLy8gdGhhdCdzIGFib3V0IGFsbCB0aGVyZSBpcyB0byBpdC5cbn1cblxuRmlsZVJlYWRlci5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbiAod2hvKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgLy8gY29uc29sZS5lcnJvcihcIkZSIFBhdXNlXCIsIG1lLl9wYXRoKVxuICBpZiAobWUuX3BhdXNlZCkgcmV0dXJuXG4gIHdobyA9IHdobyB8fCBtZVxuICBtZS5fcGF1c2VkID0gdHJ1ZVxuICBpZiAobWUuX3N0cmVhbSkgbWUuX3N0cmVhbS5wYXVzZSgpXG4gIG1lLmVtaXQoXCJwYXVzZVwiLCB3aG8pXG59XG5cbkZpbGVSZWFkZXIucHJvdG90eXBlLnJlc3VtZSA9IGZ1bmN0aW9uICh3aG8pIHtcbiAgdmFyIG1lID0gdGhpc1xuICAvLyBjb25zb2xlLmVycm9yKFwiRlIgUmVzdW1lXCIsIG1lLl9wYXRoKVxuICBpZiAoIW1lLl9wYXVzZWQpIHJldHVyblxuICB3aG8gPSB3aG8gfHwgbWVcbiAgbWUuZW1pdChcInJlc3VtZVwiLCB3aG8pXG4gIG1lLl9wYXVzZWQgPSBmYWxzZVxuICBpZiAobWUuX3N0cmVhbSkgbWUuX3N0cmVhbS5yZXN1bWUoKVxuICBtZS5fcmVhZCgpXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IEZpbGVXcml0ZXJcblxudmFyIGZzID0gcmVxdWlyZShcImdyYWNlZnVsLWZzXCIpXG4gICwgbWtkaXIgPSByZXF1aXJlKFwibWtkaXJwXCIpXG4gICwgV3JpdGVyID0gcmVxdWlyZShcIi4vd3JpdGVyLmpzXCIpXG4gICwgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIilcbiAgLCBFT0YgPSB7fVxuXG5pbmhlcml0cyhGaWxlV3JpdGVyLCBXcml0ZXIpXG5cbmZ1bmN0aW9uIEZpbGVXcml0ZXIgKHByb3BzKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgaWYgKCEobWUgaW5zdGFuY2VvZiBGaWxlV3JpdGVyKSkgdGhyb3cgbmV3IEVycm9yKFxuICAgIFwiRmlsZVdyaXRlciBtdXN0IGJlIGNhbGxlZCBhcyBjb25zdHJ1Y3Rvci5cIilcblxuICAvLyBzaG91bGQgYWxyZWFkeSBiZSBlc3RhYmxpc2hlZCBhcyBhIEZpbGUgdHlwZVxuICBpZiAocHJvcHMudHlwZSAhPT0gXCJGaWxlXCIgfHwgIXByb3BzLkZpbGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb24tZmlsZSB0eXBlIFwiKyBwcm9wcy50eXBlKVxuICB9XG5cbiAgbWUuX2J1ZmZlciA9IFtdXG4gIG1lLl9ieXRlc1dyaXR0ZW4gPSAwXG5cbiAgV3JpdGVyLmNhbGwodGhpcywgcHJvcHMpXG59XG5cbkZpbGVXcml0ZXIucHJvdG90eXBlLl9jcmVhdGUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgaWYgKG1lLl9zdHJlYW0pIHJldHVyblxuXG4gIHZhciBzbyA9IHt9XG4gIGlmIChtZS5wcm9wcy5mbGFncykgc28uZmxhZ3MgPSBtZS5wcm9wcy5mbGFnc1xuICBzby5tb2RlID0gV3JpdGVyLmZpbGVtb2RlXG4gIGlmIChtZS5fb2xkICYmIG1lLl9vbGQuYmxrc2l6ZSkgc28uYnVmZmVyU2l6ZSA9IG1lLl9vbGQuYmxrc2l6ZVxuXG4gIG1lLl9zdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShtZS5fcGF0aCwgc28pXG5cbiAgbWUuX3N0cmVhbS5vbihcIm9wZW5cIiwgZnVuY3Rpb24gKGZkKSB7XG4gICAgLy8gY29uc29sZS5lcnJvcihcIkZXIG9wZW5cIiwgbWUuX2J1ZmZlciwgbWUuX3BhdGgpXG4gICAgbWUucmVhZHkgPSB0cnVlXG4gICAgbWUuX2J1ZmZlci5mb3JFYWNoKGZ1bmN0aW9uIChjKSB7XG4gICAgICBpZiAoYyA9PT0gRU9GKSBtZS5fc3RyZWFtLmVuZCgpXG4gICAgICBlbHNlIG1lLl9zdHJlYW0ud3JpdGUoYylcbiAgICB9KVxuICAgIG1lLmVtaXQoXCJyZWFkeVwiKVxuICAgIC8vIGdpdmUgdGhpcyBhIGtpY2sganVzdCBpbiBjYXNlIGl0IG5lZWRzIGl0LlxuICAgIG1lLmVtaXQoXCJkcmFpblwiKVxuICB9KVxuXG4gIG1lLl9zdHJlYW0ub24oXCJkcmFpblwiLCBmdW5jdGlvbiAoKSB7IG1lLmVtaXQoXCJkcmFpblwiKSB9KVxuXG4gIG1lLl9zdHJlYW0ub24oXCJjbG9zZVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgLy8gY29uc29sZS5lcnJvcihcIlxcblxcbkZXIFN0cmVhbSBDbG9zZVwiLCBtZS5fcGF0aCwgbWUuc2l6ZSlcbiAgICBtZS5fZmluaXNoKClcbiAgfSlcbn1cblxuRmlsZVdyaXRlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAoYykge1xuICB2YXIgbWUgPSB0aGlzXG5cbiAgbWUuX2J5dGVzV3JpdHRlbiArPSBjLmxlbmd0aFxuXG4gIGlmICghbWUucmVhZHkpIHtcbiAgICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihjKSAmJiB0eXBlb2YgYyAhPT0gJ3N0cmluZycpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgd3JpdGUgZGF0YScpXG4gICAgbWUuX2J1ZmZlci5wdXNoKGMpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICB2YXIgcmV0ID0gbWUuX3N0cmVhbS53cml0ZShjKVxuICAvLyBjb25zb2xlLmVycm9yKFwiXFx0LS0gZncgd3JvdGUsIF9zdHJlYW0gc2F5c1wiLCByZXQsIG1lLl9zdHJlYW0uX3F1ZXVlLmxlbmd0aClcblxuICAvLyBhbGxvdyAyIGJ1ZmZlcmVkIHdyaXRlcywgYmVjYXVzZSBvdGhlcndpc2UgdGhlcmUncyBqdXN0IHRvb1xuICAvLyBtdWNoIHN0b3AgYW5kIGdvIGJzLlxuICBpZiAocmV0ID09PSBmYWxzZSAmJiBtZS5fc3RyZWFtLl9xdWV1ZSkge1xuICAgIHJldHVybiBtZS5fc3RyZWFtLl9xdWV1ZS5sZW5ndGggPD0gMjtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcmV0O1xuICB9XG59XG5cbkZpbGVXcml0ZXIucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uIChjKSB7XG4gIHZhciBtZSA9IHRoaXNcblxuICBpZiAoYykgbWUud3JpdGUoYylcblxuICBpZiAoIW1lLnJlYWR5KSB7XG4gICAgbWUuX2J1ZmZlci5wdXNoKEVPRilcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIHJldHVybiBtZS5fc3RyZWFtLmVuZCgpXG59XG5cbkZpbGVXcml0ZXIucHJvdG90eXBlLl9maW5pc2ggPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgaWYgKHR5cGVvZiBtZS5zaXplID09PSBcIm51bWJlclwiICYmIG1lLl9ieXRlc1dyaXR0ZW4gIT0gbWUuc2l6ZSkge1xuICAgIG1lLmVycm9yKFxuICAgICAgXCJEaWQgbm90IGdldCBleHBlY3RlZCBieXRlIGNvdW50LlxcblwiICtcbiAgICAgIFwiZXhwZWN0OiBcIiArIG1lLnNpemUgKyBcIlxcblwiICtcbiAgICAgIFwiYWN0dWFsOiBcIiArIG1lLl9ieXRlc1dyaXR0ZW4pXG4gIH1cbiAgV3JpdGVyLnByb3RvdHlwZS5fZmluaXNoLmNhbGwobWUpXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGdldFR5cGVcblxuZnVuY3Rpb24gZ2V0VHlwZSAoc3QpIHtcbiAgdmFyIHR5cGVzID1cbiAgICAgIFsgXCJEaXJlY3RvcnlcIlxuICAgICAgLCBcIkZpbGVcIlxuICAgICAgLCBcIlN5bWJvbGljTGlua1wiXG4gICAgICAsIFwiTGlua1wiIC8vIHNwZWNpYWwgZm9yIGhhcmRsaW5rcyBmcm9tIHRhcmJhbGxzXG4gICAgICAsIFwiQmxvY2tEZXZpY2VcIlxuICAgICAgLCBcIkNoYXJhY3RlckRldmljZVwiXG4gICAgICAsIFwiRklGT1wiXG4gICAgICAsIFwiU29ja2V0XCIgXVxuICAgICwgdHlwZVxuXG4gIGlmIChzdC50eXBlICYmIC0xICE9PSB0eXBlcy5pbmRleE9mKHN0LnR5cGUpKSB7XG4gICAgc3Rbc3QudHlwZV0gPSB0cnVlXG4gICAgcmV0dXJuIHN0LnR5cGVcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gdHlwZXMubGVuZ3RoOyBpIDwgbDsgaSArKykge1xuICAgIHR5cGUgPSB0eXBlc1tpXVxuICAgIHZhciBpcyA9IHN0W3R5cGVdIHx8IHN0W1wiaXNcIiArIHR5cGVdXG4gICAgaWYgKHR5cGVvZiBpcyA9PT0gXCJmdW5jdGlvblwiKSBpcyA9IGlzLmNhbGwoc3QpXG4gICAgaWYgKGlzKSB7XG4gICAgICBzdFt0eXBlXSA9IHRydWVcbiAgICAgIHN0LnR5cGUgPSB0eXBlXG4gICAgICByZXR1cm4gdHlwZVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsXG59XG4iLCIvLyBCYXNpY2FsbHkganVzdCBhIHdyYXBwZXIgYXJvdW5kIGFuIGZzLnJlYWRsaW5rXG4vL1xuLy8gWFhYOiBFbmhhbmNlIHRoaXMgdG8gc3VwcG9ydCB0aGUgTGluayB0eXBlLCBieSBrZWVwaW5nXG4vLyBhIGxvb2t1cCB0YWJsZSBvZiB7PGRlditpbm9kZT46PHBhdGg+fSwgc28gdGhhdCBoYXJkbGlua3Ncbi8vIGNhbiBiZSBwcmVzZXJ2ZWQgaW4gdGFyYmFsbHMuXG5cbm1vZHVsZS5leHBvcnRzID0gTGlua1JlYWRlclxuXG52YXIgZnMgPSByZXF1aXJlKFwiZ3JhY2VmdWwtZnNcIilcbiAgLCBmc3RyZWFtID0gcmVxdWlyZShcIi4uL2ZzdHJlYW0uanNcIilcbiAgLCBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKVxuICAsIG1rZGlyID0gcmVxdWlyZShcIm1rZGlycFwiKVxuICAsIFJlYWRlciA9IHJlcXVpcmUoXCIuL3JlYWRlci5qc1wiKVxuXG5pbmhlcml0cyhMaW5rUmVhZGVyLCBSZWFkZXIpXG5cbmZ1bmN0aW9uIExpbmtSZWFkZXIgKHByb3BzKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgaWYgKCEobWUgaW5zdGFuY2VvZiBMaW5rUmVhZGVyKSkgdGhyb3cgbmV3IEVycm9yKFxuICAgIFwiTGlua1JlYWRlciBtdXN0IGJlIGNhbGxlZCBhcyBjb25zdHJ1Y3Rvci5cIilcblxuICBpZiAoISgocHJvcHMudHlwZSA9PT0gXCJMaW5rXCIgJiYgcHJvcHMuTGluaykgfHxcbiAgICAgICAgKHByb3BzLnR5cGUgPT09IFwiU3ltYm9saWNMaW5rXCIgJiYgcHJvcHMuU3ltYm9saWNMaW5rKSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb24tbGluayB0eXBlIFwiKyBwcm9wcy50eXBlKVxuICB9XG5cbiAgUmVhZGVyLmNhbGwobWUsIHByb3BzKVxufVxuXG4vLyBXaGVuIHBpcGluZyBhIExpbmtSZWFkZXIgaW50byBhIExpbmtXcml0ZXIsIHdlIGhhdmUgdG9cbi8vIGFscmVhZHkgaGF2ZSB0aGUgbGlua3BhdGggcHJvcGVydHkgc2V0LCBzbyB0aGF0IGhhcyB0b1xuLy8gaGFwcGVuICpiZWZvcmUqIHRoZSBcInJlYWR5XCIgZXZlbnQsIHdoaWNoIG1lYW5zIHdlIG5lZWQgdG9cbi8vIG92ZXJyaWRlIHRoZSBfc3RhdCBtZXRob2QuXG5MaW5rUmVhZGVyLnByb3RvdHlwZS5fc3RhdCA9IGZ1bmN0aW9uIChjdXJyZW50U3RhdCkge1xuICB2YXIgbWUgPSB0aGlzXG4gIGZzLnJlYWRsaW5rKG1lLl9wYXRoLCBmdW5jdGlvbiAoZXIsIGxpbmtwYXRoKSB7XG4gICAgaWYgKGVyKSByZXR1cm4gbWUuZXJyb3IoZXIpXG4gICAgbWUubGlua3BhdGggPSBtZS5wcm9wcy5saW5rcGF0aCA9IGxpbmtwYXRoXG4gICAgbWUuZW1pdChcImxpbmtwYXRoXCIsIGxpbmtwYXRoKVxuICAgIFJlYWRlci5wcm90b3R5cGUuX3N0YXQuY2FsbChtZSwgY3VycmVudFN0YXQpXG4gIH0pXG59XG5cbkxpbmtSZWFkZXIucHJvdG90eXBlLl9yZWFkID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbWUgPSB0aGlzXG4gIGlmIChtZS5fcGF1c2VkKSByZXR1cm5cbiAgLy8gYmFzaWNhbGx5IGp1c3QgYSBuby1vcCwgc2luY2Ugd2UgZ290IGFsbCB0aGUgaW5mbyB3ZSBuZWVkXG4gIC8vIGZyb20gdGhlIF9zdGF0IG1ldGhvZFxuICBpZiAoIW1lLl9lbmRlZCkge1xuICAgIG1lLmVtaXQoXCJlbmRcIilcbiAgICBtZS5lbWl0KFwiY2xvc2VcIilcbiAgICBtZS5fZW5kZWQgPSB0cnVlXG4gIH1cbn1cbiIsIlxubW9kdWxlLmV4cG9ydHMgPSBMaW5rV3JpdGVyXG5cbnZhciBmcyA9IHJlcXVpcmUoXCJncmFjZWZ1bC1mc1wiKVxuICAsIFdyaXRlciA9IHJlcXVpcmUoXCIuL3dyaXRlci5qc1wiKVxuICAsIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpXG4gICwgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpXG4gICwgcmltcmFmID0gcmVxdWlyZShcInJpbXJhZlwiKVxuXG5pbmhlcml0cyhMaW5rV3JpdGVyLCBXcml0ZXIpXG5cbmZ1bmN0aW9uIExpbmtXcml0ZXIgKHByb3BzKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgaWYgKCEobWUgaW5zdGFuY2VvZiBMaW5rV3JpdGVyKSkgdGhyb3cgbmV3IEVycm9yKFxuICAgIFwiTGlua1dyaXRlciBtdXN0IGJlIGNhbGxlZCBhcyBjb25zdHJ1Y3Rvci5cIilcblxuICAvLyBzaG91bGQgYWxyZWFkeSBiZSBlc3RhYmxpc2hlZCBhcyBhIExpbmsgdHlwZVxuICBpZiAoISgocHJvcHMudHlwZSA9PT0gXCJMaW5rXCIgJiYgcHJvcHMuTGluaykgfHxcbiAgICAgICAgKHByb3BzLnR5cGUgPT09IFwiU3ltYm9saWNMaW5rXCIgJiYgcHJvcHMuU3ltYm9saWNMaW5rKSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb24tbGluayB0eXBlIFwiKyBwcm9wcy50eXBlKVxuICB9XG5cbiAgaWYgKHByb3BzLmxpbmtwYXRoID09PSBcIlwiKSBwcm9wcy5saW5rcGF0aCA9IFwiLlwiXG4gIGlmICghcHJvcHMubGlua3BhdGgpIHtcbiAgICBtZS5lcnJvcihcIk5lZWQgbGlua3BhdGggcHJvcGVydHkgdG8gY3JlYXRlIFwiICsgcHJvcHMudHlwZSlcbiAgfVxuXG4gIFdyaXRlci5jYWxsKHRoaXMsIHByb3BzKVxufVxuXG5MaW5rV3JpdGVyLnByb3RvdHlwZS5fY3JlYXRlID0gZnVuY3Rpb24gKCkge1xuICAvLyBjb25zb2xlLmVycm9yKFwiIExXIF9jcmVhdGVcIilcbiAgdmFyIG1lID0gdGhpc1xuICAgICwgaGFyZCA9IG1lLnR5cGUgPT09IFwiTGlua1wiIHx8IHByb2Nlc3MucGxhdGZvcm0gPT09IFwid2luMzJcIlxuICAgICwgbGluayA9IGhhcmQgPyBcImxpbmtcIiA6IFwic3ltbGlua1wiXG4gICAgLCBscCA9IGhhcmQgPyBwYXRoLnJlc29sdmUobWUuZGlybmFtZSwgbWUubGlua3BhdGgpIDogbWUubGlua3BhdGhcblxuICAvLyBjYW4gb25seSBjaGFuZ2UgdGhlIGxpbmsgcGF0aCBieSBjbG9iYmVyaW5nXG4gIC8vIEZvciBoYXJkIGxpbmtzLCBsZXQncyBqdXN0IGFzc3VtZSB0aGF0J3MgYWx3YXlzIHRoZSBjYXNlLCBzaW5jZVxuICAvLyB0aGVyZSdzIG5vIGdvb2Qgd2F5IHRvIHJlYWQgdGhlbSBpZiB3ZSBkb24ndCBhbHJlYWR5IGtub3cuXG4gIGlmIChoYXJkKSByZXR1cm4gY2xvYmJlcihtZSwgbHAsIGxpbmspXG5cbiAgZnMucmVhZGxpbmsobWUuX3BhdGgsIGZ1bmN0aW9uIChlciwgcCkge1xuICAgIC8vIG9ubHkgc2tpcCBjcmVhdGlvbiBpZiBpdCdzIGV4YWN0bHkgdGhlIHNhbWUgbGlua1xuICAgIGlmIChwICYmIHAgPT09IGxwKSByZXR1cm4gZmluaXNoKG1lKVxuICAgIGNsb2JiZXIobWUsIGxwLCBsaW5rKVxuICB9KVxufVxuXG5mdW5jdGlvbiBjbG9iYmVyIChtZSwgbHAsIGxpbmspIHtcbiAgcmltcmFmKG1lLl9wYXRoLCBmdW5jdGlvbiAoZXIpIHtcbiAgICBpZiAoZXIpIHJldHVybiBtZS5lcnJvcihlcilcbiAgICBjcmVhdGUobWUsIGxwLCBsaW5rKVxuICB9KVxufVxuXG5mdW5jdGlvbiBjcmVhdGUgKG1lLCBscCwgbGluaykge1xuICBmc1tsaW5rXShscCwgbWUuX3BhdGgsIGZ1bmN0aW9uIChlcikge1xuICAgIC8vIGlmIHRoaXMgaXMgYSBoYXJkIGxpbmssIGFuZCB3ZSdyZSBpbiB0aGUgcHJvY2VzcyBvZiB3cml0aW5nIG91dCBhXG4gICAgLy8gZGlyZWN0b3J5LCBpdCdzIHZlcnkgcG9zc2libGUgdGhhdCB0aGUgdGhpbmcgd2UncmUgbGlua2luZyB0b1xuICAgIC8vIGRvZXNuJ3QgZXhpc3QgeWV0IChlc3BlY2lhbGx5IGlmIGl0IHdhcyBpbnRlbmRlZCBhcyBhIHN5bWxpbmspLFxuICAgIC8vIHNvIHN3YWxsb3cgRU5PRU5UIGVycm9ycyBoZXJlIGFuZCBqdXN0IHNvbGRpZXIgaW4uXG4gICAgLy8gQWRkaXRpb25hbGx5LCBhbiBFUEVSTSBvciBFQUNDRVMgY2FuIGhhcHBlbiBvbiB3aW4zMiBpZiBpdCdzIHRyeWluZ1xuICAgIC8vIHRvIG1ha2UgYSBsaW5rIHRvIGEgZGlyZWN0b3J5LiAgQWdhaW4sIGp1c3Qgc2tpcCBpdC5cbiAgICAvLyBBIGJldHRlciBzb2x1dGlvbiB3b3VsZCBiZSB0byBoYXZlIGZzLnN5bWxpbmsgYmUgc3VwcG9ydGVkIG9uXG4gICAgLy8gd2luZG93cyBpbiBzb21lIG5pY2UgZmFzaGlvbi5cbiAgICBpZiAoZXIpIHtcbiAgICAgIGlmICgoZXIuY29kZSA9PT0gXCJFTk9FTlRcIiB8fFxuICAgICAgICAgICBlci5jb2RlID09PSBcIkVBQ0NFU1wiIHx8XG4gICAgICAgICAgIGVyLmNvZGUgPT09IFwiRVBFUk1cIiApICYmIHByb2Nlc3MucGxhdGZvcm0gPT09IFwid2luMzJcIikge1xuICAgICAgICBtZS5yZWFkeSA9IHRydWVcbiAgICAgICAgbWUuZW1pdChcInJlYWR5XCIpXG4gICAgICAgIG1lLmVtaXQoXCJlbmRcIilcbiAgICAgICAgbWUuZW1pdChcImNsb3NlXCIpXG4gICAgICAgIG1lLmVuZCA9IG1lLl9maW5pc2ggPSBmdW5jdGlvbiAoKSB7fVxuICAgICAgfSBlbHNlIHJldHVybiBtZS5lcnJvcihlcilcbiAgICB9XG4gICAgZmluaXNoKG1lKVxuICB9KVxufVxuXG5mdW5jdGlvbiBmaW5pc2ggKG1lKSB7XG4gIG1lLnJlYWR5ID0gdHJ1ZVxuICBtZS5lbWl0KFwicmVhZHlcIilcbiAgaWYgKG1lLl9lbmRlZCAmJiAhbWUuX2ZpbmlzaGVkKSBtZS5fZmluaXNoKClcbn1cblxuTGlua1dyaXRlci5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24gKCkge1xuICAvLyBjb25zb2xlLmVycm9yKFwiTFcgZmluaXNoIGluIGVuZFwiKVxuICB0aGlzLl9lbmRlZCA9IHRydWVcbiAgaWYgKHRoaXMucmVhZHkpIHtcbiAgICB0aGlzLl9maW5pc2hlZCA9IHRydWVcbiAgICB0aGlzLl9maW5pc2goKVxuICB9XG59XG4iLCIvLyBBIHJlYWRlciBmb3Igd2hlbiB3ZSBkb24ndCB5ZXQga25vdyB3aGF0IGtpbmQgb2YgdGhpbmdcbi8vIHRoZSB0aGluZyBpcy5cblxubW9kdWxlLmV4cG9ydHMgPSBQcm94eVJlYWRlclxuXG52YXIgUmVhZGVyID0gcmVxdWlyZShcIi4vcmVhZGVyLmpzXCIpXG4gICwgZ2V0VHlwZSA9IHJlcXVpcmUoXCIuL2dldC10eXBlLmpzXCIpXG4gICwgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIilcbiAgLCBmcyA9IHJlcXVpcmUoXCJncmFjZWZ1bC1mc1wiKVxuXG5pbmhlcml0cyhQcm94eVJlYWRlciwgUmVhZGVyKVxuXG5mdW5jdGlvbiBQcm94eVJlYWRlciAocHJvcHMpIHtcbiAgdmFyIG1lID0gdGhpc1xuICBpZiAoIShtZSBpbnN0YW5jZW9mIFByb3h5UmVhZGVyKSkgdGhyb3cgbmV3IEVycm9yKFxuICAgIFwiUHJveHlSZWFkZXIgbXVzdCBiZSBjYWxsZWQgYXMgY29uc3RydWN0b3IuXCIpXG5cbiAgbWUucHJvcHMgPSBwcm9wc1xuICBtZS5fYnVmZmVyID0gW11cbiAgbWUucmVhZHkgPSBmYWxzZVxuXG4gIFJlYWRlci5jYWxsKG1lLCBwcm9wcylcbn1cblxuUHJveHlSZWFkZXIucHJvdG90eXBlLl9zdGF0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbWUgPSB0aGlzXG4gICAgLCBwcm9wcyA9IG1lLnByb3BzXG4gICAgLy8gc3RhdCB0aGUgdGhpbmcgdG8gc2VlIHdoYXQgdGhlIHByb3h5IHNob3VsZCBiZS5cbiAgICAsIHN0YXQgPSBwcm9wcy5mb2xsb3cgPyBcInN0YXRcIiA6IFwibHN0YXRcIlxuXG4gIGZzW3N0YXRdKHByb3BzLnBhdGgsIGZ1bmN0aW9uIChlciwgY3VycmVudCkge1xuICAgIHZhciB0eXBlXG4gICAgaWYgKGVyIHx8ICFjdXJyZW50KSB7XG4gICAgICB0eXBlID0gXCJGaWxlXCJcbiAgICB9IGVsc2Uge1xuICAgICAgdHlwZSA9IGdldFR5cGUoY3VycmVudClcbiAgICB9XG5cbiAgICBwcm9wc1t0eXBlXSA9IHRydWVcbiAgICBwcm9wcy50eXBlID0gbWUudHlwZSA9IHR5cGVcblxuICAgIG1lLl9vbGQgPSBjdXJyZW50XG4gICAgbWUuX2FkZFByb3h5KFJlYWRlcihwcm9wcywgY3VycmVudCkpXG4gIH0pXG59XG5cblByb3h5UmVhZGVyLnByb3RvdHlwZS5fYWRkUHJveHkgPSBmdW5jdGlvbiAocHJveHkpIHtcbiAgdmFyIG1lID0gdGhpc1xuICBpZiAobWUuX3Byb3h5VGFyZ2V0KSB7XG4gICAgcmV0dXJuIG1lLmVycm9yKFwicHJveHkgYWxyZWFkeSBzZXRcIilcbiAgfVxuXG4gIG1lLl9wcm94eVRhcmdldCA9IHByb3h5XG4gIHByb3h5Ll9wcm94eSA9IG1lXG5cbiAgOyBbIFwiZXJyb3JcIlxuICAgICwgXCJkYXRhXCJcbiAgICAsIFwiZW5kXCJcbiAgICAsIFwiY2xvc2VcIlxuICAgICwgXCJsaW5rcGF0aFwiXG4gICAgLCBcImVudHJ5XCJcbiAgICAsIFwiZW50cnlFbmRcIlxuICAgICwgXCJjaGlsZFwiXG4gICAgLCBcImNoaWxkRW5kXCJcbiAgICAsIFwid2FyblwiXG4gICAgLCBcInN0YXRcIlxuICAgIF0uZm9yRWFjaChmdW5jdGlvbiAoZXYpIHtcbiAgICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJ+fiBwcm94eSBldmVudFwiLCBldiwgbWUucGF0aClcbiAgICAgIHByb3h5Lm9uKGV2LCBtZS5lbWl0LmJpbmQobWUsIGV2KSlcbiAgICB9KVxuXG4gIG1lLmVtaXQoXCJwcm94eVwiLCBwcm94eSlcblxuICBwcm94eS5vbihcInJlYWR5XCIsIGZ1bmN0aW9uICgpIHtcbiAgICAvLyBjb25zb2xlLmVycm9yKFwifn4gcHJveHkgaXMgcmVhZHkhXCIsIG1lLnBhdGgpXG4gICAgbWUucmVhZHkgPSB0cnVlXG4gICAgbWUuZW1pdChcInJlYWR5XCIpXG4gIH0pXG5cbiAgdmFyIGNhbGxzID0gbWUuX2J1ZmZlclxuICBtZS5fYnVmZmVyLmxlbmd0aCA9IDBcbiAgY2FsbHMuZm9yRWFjaChmdW5jdGlvbiAoYykge1xuICAgIHByb3h5W2NbMF1dLmFwcGx5KHByb3h5LCBjWzFdKVxuICB9KVxufVxuXG5Qcm94eVJlYWRlci5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLl9wcm94eVRhcmdldCA/IHRoaXMuX3Byb3h5VGFyZ2V0LnBhdXNlKCkgOiBmYWxzZVxufVxuXG5Qcm94eVJlYWRlci5wcm90b3R5cGUucmVzdW1lID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5fcHJveHlUYXJnZXQgPyB0aGlzLl9wcm94eVRhcmdldC5yZXN1bWUoKSA6IGZhbHNlXG59XG4iLCIvLyBBIHdyaXRlciBmb3Igd2hlbiB3ZSBkb24ndCBrbm93IHdoYXQga2luZCBvZiB0aGluZ1xuLy8gdGhlIHRoaW5nIGlzLiAgVGhhdCBpcywgaXQncyBub3QgZXhwbGljaXRseSBzZXQsXG4vLyBzbyB3ZSdyZSBnb2luZyB0byBtYWtlIGl0IHdoYXRldmVyIHRoZSB0aGluZyBhbHJlYWR5XG4vLyBpcywgb3IgXCJGaWxlXCJcbi8vXG4vLyBVbnRpbCB0aGVuLCBjb2xsZWN0IGFsbCBldmVudHMuXG5cbm1vZHVsZS5leHBvcnRzID0gUHJveHlXcml0ZXJcblxudmFyIFdyaXRlciA9IHJlcXVpcmUoXCIuL3dyaXRlci5qc1wiKVxuICAsIGdldFR5cGUgPSByZXF1aXJlKFwiLi9nZXQtdHlwZS5qc1wiKVxuICAsIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpXG4gICwgY29sbGVjdCA9IHJlcXVpcmUoXCIuL2NvbGxlY3QuanNcIilcbiAgLCBmcyA9IHJlcXVpcmUoXCJmc1wiKVxuXG5pbmhlcml0cyhQcm94eVdyaXRlciwgV3JpdGVyKVxuXG5mdW5jdGlvbiBQcm94eVdyaXRlciAocHJvcHMpIHtcbiAgdmFyIG1lID0gdGhpc1xuICBpZiAoIShtZSBpbnN0YW5jZW9mIFByb3h5V3JpdGVyKSkgdGhyb3cgbmV3IEVycm9yKFxuICAgIFwiUHJveHlXcml0ZXIgbXVzdCBiZSBjYWxsZWQgYXMgY29uc3RydWN0b3IuXCIpXG5cbiAgbWUucHJvcHMgPSBwcm9wc1xuICBtZS5fbmVlZERyYWluID0gZmFsc2VcblxuICBXcml0ZXIuY2FsbChtZSwgcHJvcHMpXG59XG5cblByb3h5V3JpdGVyLnByb3RvdHlwZS5fc3RhdCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG1lID0gdGhpc1xuICAgICwgcHJvcHMgPSBtZS5wcm9wc1xuICAgIC8vIHN0YXQgdGhlIHRoaW5nIHRvIHNlZSB3aGF0IHRoZSBwcm94eSBzaG91bGQgYmUuXG4gICAgLCBzdGF0ID0gcHJvcHMuZm9sbG93ID8gXCJzdGF0XCIgOiBcImxzdGF0XCJcblxuICBmc1tzdGF0XShwcm9wcy5wYXRoLCBmdW5jdGlvbiAoZXIsIGN1cnJlbnQpIHtcbiAgICB2YXIgdHlwZVxuICAgIGlmIChlciB8fCAhY3VycmVudCkge1xuICAgICAgdHlwZSA9IFwiRmlsZVwiXG4gICAgfSBlbHNlIHtcbiAgICAgIHR5cGUgPSBnZXRUeXBlKGN1cnJlbnQpXG4gICAgfVxuXG4gICAgcHJvcHNbdHlwZV0gPSB0cnVlXG4gICAgcHJvcHMudHlwZSA9IG1lLnR5cGUgPSB0eXBlXG5cbiAgICBtZS5fb2xkID0gY3VycmVudFxuICAgIG1lLl9hZGRQcm94eShXcml0ZXIocHJvcHMsIGN1cnJlbnQpKVxuICB9KVxufVxuXG5Qcm94eVdyaXRlci5wcm90b3R5cGUuX2FkZFByb3h5ID0gZnVuY3Rpb24gKHByb3h5KSB7XG4gIC8vIGNvbnNvbGUuZXJyb3IoXCJ+fiBzZXQgcHJveHlcIiwgdGhpcy5wYXRoKVxuICB2YXIgbWUgPSB0aGlzXG4gIGlmIChtZS5fcHJveHkpIHtcbiAgICByZXR1cm4gbWUuZXJyb3IoXCJwcm94eSBhbHJlYWR5IHNldFwiKVxuICB9XG5cbiAgbWUuX3Byb3h5ID0gcHJveHlcbiAgOyBbIFwicmVhZHlcIlxuICAgICwgXCJlcnJvclwiXG4gICAgLCBcImNsb3NlXCJcbiAgICAsIFwicGlwZVwiXG4gICAgLCBcImRyYWluXCJcbiAgICAsIFwid2FyblwiXG4gICAgXS5mb3JFYWNoKGZ1bmN0aW9uIChldikge1xuICAgICAgcHJveHkub24oZXYsIG1lLmVtaXQuYmluZChtZSwgZXYpKVxuICAgIH0pXG5cbiAgbWUuZW1pdChcInByb3h5XCIsIHByb3h5KVxuXG4gIHZhciBjYWxscyA9IG1lLl9idWZmZXJcbiAgY2FsbHMuZm9yRWFjaChmdW5jdGlvbiAoYykge1xuICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJ+fiB+fiBwcm94eSBidWZmZXJlZCBjYWxsXCIsIGNbMF0sIGNbMV0pXG4gICAgcHJveHlbY1swXV0uYXBwbHkocHJveHksIGNbMV0pXG4gIH0pXG4gIG1lLl9idWZmZXIubGVuZ3RoID0gMFxuICBpZiAobWUuX25lZWRzRHJhaW4pIG1lLmVtaXQoXCJkcmFpblwiKVxufVxuXG5Qcm94eVdyaXRlci5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKGVudHJ5KSB7XG4gIC8vIGNvbnNvbGUuZXJyb3IoXCJ+fiBwcm94eSBhZGRcIilcbiAgY29sbGVjdChlbnRyeSlcblxuICBpZiAoIXRoaXMuX3Byb3h5KSB7XG4gICAgdGhpcy5fYnVmZmVyLnB1c2goW1wiYWRkXCIsIFtlbnRyeV1dKVxuICAgIHRoaXMuX25lZWREcmFpbiA9IHRydWVcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuICByZXR1cm4gdGhpcy5fcHJveHkuYWRkKGVudHJ5KVxufVxuXG5Qcm94eVdyaXRlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAoYykge1xuICAvLyBjb25zb2xlLmVycm9yKFwifn4gcHJveHkgd3JpdGVcIilcbiAgaWYgKCF0aGlzLl9wcm94eSkge1xuICAgIHRoaXMuX2J1ZmZlci5wdXNoKFtcIndyaXRlXCIsIFtjXV0pXG4gICAgdGhpcy5fbmVlZERyYWluID0gdHJ1ZVxuICAgIHJldHVybiBmYWxzZVxuICB9XG4gIHJldHVybiB0aGlzLl9wcm94eS53cml0ZShjKVxufVxuXG5Qcm94eVdyaXRlci5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24gKGMpIHtcbiAgLy8gY29uc29sZS5lcnJvcihcIn5+IHByb3h5IGVuZFwiKVxuICBpZiAoIXRoaXMuX3Byb3h5KSB7XG4gICAgdGhpcy5fYnVmZmVyLnB1c2goW1wiZW5kXCIsIFtjXV0pXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgcmV0dXJuIHRoaXMuX3Byb3h5LmVuZChjKVxufVxuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWRlclxuXG52YXIgZnMgPSByZXF1aXJlKFwiZ3JhY2VmdWwtZnNcIilcbiAgLCBTdHJlYW0gPSByZXF1aXJlKFwic3RyZWFtXCIpLlN0cmVhbVxuICAsIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpXG4gICwgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpXG4gICwgZ2V0VHlwZSA9IHJlcXVpcmUoXCIuL2dldC10eXBlLmpzXCIpXG4gICwgaGFyZExpbmtzID0gUmVhZGVyLmhhcmRMaW5rcyA9IHt9XG4gICwgQWJzdHJhY3QgPSByZXF1aXJlKFwiLi9hYnN0cmFjdC5qc1wiKVxuXG4vLyBNdXN0IGRvIHRoaXMgKmJlZm9yZSogbG9hZGluZyB0aGUgY2hpbGQgY2xhc3Nlc1xuaW5oZXJpdHMoUmVhZGVyLCBBYnN0cmFjdClcblxudmFyIERpclJlYWRlciA9IHJlcXVpcmUoXCIuL2Rpci1yZWFkZXIuanNcIilcbiAgLCBGaWxlUmVhZGVyID0gcmVxdWlyZShcIi4vZmlsZS1yZWFkZXIuanNcIilcbiAgLCBMaW5rUmVhZGVyID0gcmVxdWlyZShcIi4vbGluay1yZWFkZXIuanNcIilcbiAgLCBTb2NrZXRSZWFkZXIgPSByZXF1aXJlKFwiLi9zb2NrZXQtcmVhZGVyLmpzXCIpXG4gICwgUHJveHlSZWFkZXIgPSByZXF1aXJlKFwiLi9wcm94eS1yZWFkZXIuanNcIilcblxuZnVuY3Rpb24gUmVhZGVyIChwcm9wcywgY3VycmVudFN0YXQpIHtcbiAgdmFyIG1lID0gdGhpc1xuICBpZiAoIShtZSBpbnN0YW5jZW9mIFJlYWRlcikpIHJldHVybiBuZXcgUmVhZGVyKHByb3BzLCBjdXJyZW50U3RhdClcblxuICBpZiAodHlwZW9mIHByb3BzID09PSBcInN0cmluZ1wiKSB7XG4gICAgcHJvcHMgPSB7IHBhdGg6IHByb3BzIH1cbiAgfVxuXG4gIGlmICghcHJvcHMucGF0aCkge1xuICAgIG1lLmVycm9yKFwiTXVzdCBwcm92aWRlIGEgcGF0aFwiLCBudWxsLCB0cnVlKVxuICB9XG5cbiAgLy8gcG9seW1vcnBoaXNtLlxuICAvLyBjYWxsIGZzdHJlYW0uUmVhZGVyKGRpcikgdG8gZ2V0IGEgRGlyUmVhZGVyIG9iamVjdCwgZXRjLlxuICAvLyBOb3RlIHRoYXQsIHVubGlrZSBpbiB0aGUgV3JpdGVyIGNhc2UsIFByb3h5UmVhZGVyIGlzIGdvaW5nXG4gIC8vIHRvIGJlIHRoZSAqbm9ybWFsKiBzdGF0ZSBvZiBhZmZhaXJzLCBzaW5jZSB3ZSByYXJlbHkga25vd1xuICAvLyB0aGUgdHlwZSBvZiBhIGZpbGUgcHJpb3IgdG8gcmVhZGluZyBpdC5cblxuXG4gIHZhciB0eXBlXG4gICAgLCBDbGFzc1R5cGVcblxuICBpZiAocHJvcHMudHlwZSAmJiB0eXBlb2YgcHJvcHMudHlwZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgdHlwZSA9IHByb3BzLnR5cGVcbiAgICBDbGFzc1R5cGUgPSB0eXBlXG4gIH0gZWxzZSB7XG4gICAgdHlwZSA9IGdldFR5cGUocHJvcHMpXG4gICAgQ2xhc3NUeXBlID0gUmVhZGVyXG4gIH1cblxuICBpZiAoY3VycmVudFN0YXQgJiYgIXR5cGUpIHtcbiAgICB0eXBlID0gZ2V0VHlwZShjdXJyZW50U3RhdClcbiAgICBwcm9wc1t0eXBlXSA9IHRydWVcbiAgICBwcm9wcy50eXBlID0gdHlwZVxuICB9XG5cbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSBcIkRpcmVjdG9yeVwiOlxuICAgICAgQ2xhc3NUeXBlID0gRGlyUmVhZGVyXG4gICAgICBicmVha1xuXG4gICAgY2FzZSBcIkxpbmtcIjpcbiAgICAgIC8vIFhYWCBoYXJkIGxpbmtzIGFyZSBqdXN0IGZpbGVzLlxuICAgICAgLy8gSG93ZXZlciwgaXQgd291bGQgYmUgZ29vZCB0byBrZWVwIHRyYWNrIG9mIGZpbGVzJyBkZXYraW5vZGVcbiAgICAgIC8vIGFuZCBubGluayB2YWx1ZXMsIGFuZCBjcmVhdGUgYSBIYXJkTGlua1JlYWRlciB0aGF0IGVtaXRzXG4gICAgICAvLyBhIGxpbmtwYXRoIHZhbHVlIG9mIHRoZSBvcmlnaW5hbCBjb3B5LCBzbyB0aGF0IHRoZSB0YXJcbiAgICAgIC8vIHdyaXRlciBjYW4gcHJlc2VydmUgdGhlbS5cbiAgICAgIC8vIENsYXNzVHlwZSA9IEhhcmRMaW5rUmVhZGVyXG4gICAgICAvLyBicmVha1xuXG4gICAgY2FzZSBcIkZpbGVcIjpcbiAgICAgIENsYXNzVHlwZSA9IEZpbGVSZWFkZXJcbiAgICAgIGJyZWFrXG5cbiAgICBjYXNlIFwiU3ltYm9saWNMaW5rXCI6XG4gICAgICBDbGFzc1R5cGUgPSBMaW5rUmVhZGVyXG4gICAgICBicmVha1xuXG4gICAgY2FzZSBcIlNvY2tldFwiOlxuICAgICAgQ2xhc3NUeXBlID0gU29ja2V0UmVhZGVyXG4gICAgICBicmVha1xuXG4gICAgY2FzZSBudWxsOlxuICAgICAgQ2xhc3NUeXBlID0gUHJveHlSZWFkZXJcbiAgICAgIGJyZWFrXG4gIH1cblxuICBpZiAoIShtZSBpbnN0YW5jZW9mIENsYXNzVHlwZSkpIHtcbiAgICByZXR1cm4gbmV3IENsYXNzVHlwZShwcm9wcylcbiAgfVxuXG4gIEFic3RyYWN0LmNhbGwobWUpXG5cbiAgbWUucmVhZGFibGUgPSB0cnVlXG4gIG1lLndyaXRhYmxlID0gZmFsc2VcblxuICBtZS50eXBlID0gdHlwZVxuICBtZS5wcm9wcyA9IHByb3BzXG4gIG1lLmRlcHRoID0gcHJvcHMuZGVwdGggPSBwcm9wcy5kZXB0aCB8fCAwXG4gIG1lLnBhcmVudCA9IHByb3BzLnBhcmVudCB8fCBudWxsXG4gIG1lLnJvb3QgPSBwcm9wcy5yb290IHx8IChwcm9wcy5wYXJlbnQgJiYgcHJvcHMucGFyZW50LnJvb3QpIHx8IG1lXG5cbiAgbWUuX3BhdGggPSBtZS5wYXRoID0gcGF0aC5yZXNvbHZlKHByb3BzLnBhdGgpXG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSBcIndpbjMyXCIpIHtcbiAgICBtZS5wYXRoID0gbWUuX3BhdGggPSBtZS5wYXRoLnJlcGxhY2UoL1xcPy9nLCBcIl9cIilcbiAgICBpZiAobWUuX3BhdGgubGVuZ3RoID49IDI2MCkge1xuICAgICAgLy8gaG93IERPRVMgb25lIGNyZWF0ZSBmaWxlcyBvbiB0aGUgbW9vbj9cbiAgICAgIC8vIGlmIHRoZSBwYXRoIGhhcyBzcGFjZXMgaW4gaXQsIHRoZW4gVU5DIHdpbGwgZmFpbC5cbiAgICAgIG1lLl9zd2FsbG93RXJyb3JzID0gdHJ1ZVxuICAgICAgLy9pZiAobWUuX3BhdGguaW5kZXhPZihcIiBcIikgPT09IC0xKSB7XG4gICAgICAgIG1lLl9wYXRoID0gXCJcXFxcXFxcXD9cXFxcXCIgKyBtZS5wYXRoLnJlcGxhY2UoL1xcLy9nLCBcIlxcXFxcIilcbiAgICAgIC8vfVxuICAgIH1cbiAgfVxuICBtZS5iYXNlbmFtZSA9IHByb3BzLmJhc2VuYW1lID0gcGF0aC5iYXNlbmFtZShtZS5wYXRoKVxuICBtZS5kaXJuYW1lID0gcHJvcHMuZGlybmFtZSA9IHBhdGguZGlybmFtZShtZS5wYXRoKVxuXG4gIC8vIHRoZXNlIGhhdmUgc2VydmVkIHRoZWlyIHB1cnBvc2UsIGFuZCBhcmUgbm93IGp1c3Qgbm9pc3kgY2x1dHRlclxuICBwcm9wcy5wYXJlbnQgPSBwcm9wcy5yb290ID0gbnVsbFxuXG4gIC8vIGNvbnNvbGUuZXJyb3IoXCJcXG5cXG5cXG4lcyBzZXR0aW5nIHNpemUgdG9cIiwgcHJvcHMucGF0aCwgcHJvcHMuc2l6ZSlcbiAgbWUuc2l6ZSA9IHByb3BzLnNpemVcbiAgbWUuZmlsdGVyID0gdHlwZW9mIHByb3BzLmZpbHRlciA9PT0gXCJmdW5jdGlvblwiID8gcHJvcHMuZmlsdGVyIDogbnVsbFxuICBpZiAocHJvcHMuc29ydCA9PT0gXCJhbHBoYVwiKSBwcm9wcy5zb3J0ID0gYWxwaGFzb3J0XG5cbiAgLy8gc3RhcnQgdGhlIGJhbGwgcm9sbGluZy5cbiAgLy8gdGhpcyB3aWxsIHN0YXQgdGhlIHRoaW5nLCBhbmQgdGhlbiBjYWxsIG1lLl9yZWFkKClcbiAgLy8gdG8gc3RhcnQgcmVhZGluZyB3aGF0ZXZlciBpdCBpcy5cbiAgLy8gY29uc29sZS5lcnJvcihcImNhbGxpbmcgc3RhdFwiLCBwcm9wcy5wYXRoLCBjdXJyZW50U3RhdClcbiAgbWUuX3N0YXQoY3VycmVudFN0YXQpXG59XG5cbmZ1bmN0aW9uIGFscGhhc29ydCAoYSwgYikge1xuICByZXR1cm4gYSA9PT0gYiA/IDBcbiAgICAgICA6IGEudG9Mb3dlckNhc2UoKSA+IGIudG9Mb3dlckNhc2UoKSA/IDFcbiAgICAgICA6IGEudG9Mb3dlckNhc2UoKSA8IGIudG9Mb3dlckNhc2UoKSA/IC0xXG4gICAgICAgOiBhID4gYiA/IDFcbiAgICAgICA6IC0xXG59XG5cblJlYWRlci5wcm90b3R5cGUuX3N0YXQgPSBmdW5jdGlvbiAoY3VycmVudFN0YXQpIHtcbiAgdmFyIG1lID0gdGhpc1xuICAgICwgcHJvcHMgPSBtZS5wcm9wc1xuICAgICwgc3RhdCA9IHByb3BzLmZvbGxvdyA/IFwic3RhdFwiIDogXCJsc3RhdFwiXG4gIC8vIGNvbnNvbGUuZXJyb3IoXCJSZWFkZXIuX3N0YXRcIiwgbWUuX3BhdGgsIGN1cnJlbnRTdGF0KVxuICBpZiAoY3VycmVudFN0YXQpIHByb2Nlc3MubmV4dFRpY2soc3RhdENiLmJpbmQobnVsbCwgbnVsbCwgY3VycmVudFN0YXQpKVxuICBlbHNlIGZzW3N0YXRdKG1lLl9wYXRoLCBzdGF0Q2IpXG5cblxuICBmdW5jdGlvbiBzdGF0Q2IgKGVyLCBwcm9wc18pIHtcbiAgICAvLyBjb25zb2xlLmVycm9yKFwiUmVhZGVyLl9zdGF0LCBzdGF0Q2JcIiwgbWUuX3BhdGgsIHByb3BzXywgcHJvcHNfLm5saW5rKVxuICAgIGlmIChlcikgcmV0dXJuIG1lLmVycm9yKGVyKVxuXG4gICAgT2JqZWN0LmtleXMocHJvcHNfKS5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgICBwcm9wc1trXSA9IHByb3BzX1trXVxuICAgIH0pXG5cbiAgICAvLyBpZiBpdCdzIG5vdCB0aGUgZXhwZWN0ZWQgc2l6ZSwgdGhlbiBhYm9ydCBoZXJlLlxuICAgIGlmICh1bmRlZmluZWQgIT09IG1lLnNpemUgJiYgcHJvcHMuc2l6ZSAhPT0gbWUuc2l6ZSkge1xuICAgICAgcmV0dXJuIG1lLmVycm9yKFwiaW5jb3JyZWN0IHNpemVcIilcbiAgICB9XG4gICAgbWUuc2l6ZSA9IHByb3BzLnNpemVcblxuICAgIHZhciB0eXBlID0gZ2V0VHlwZShwcm9wcylcbiAgICB2YXIgaGFuZGxlSGFyZGxpbmtzID0gcHJvcHMuaGFyZGxpbmtzICE9PSBmYWxzZVxuICAgIFxuICAgIC8vIHNwZWNpYWwgbGl0dGxlIHRoaW5nIGZvciBoYW5kbGluZyBoYXJkbGlua3MuXG4gICAgaWYgKGhhbmRsZUhhcmRsaW5rcyAmJiB0eXBlICE9PSBcIkRpcmVjdG9yeVwiICYmIHByb3BzLm5saW5rICYmIHByb3BzLm5saW5rID4gMSkge1xuICAgICAgdmFyIGsgPSBwcm9wcy5kZXYgKyBcIjpcIiArIHByb3BzLmlub1xuICAgICAgLy8gY29uc29sZS5lcnJvcihcIlJlYWRlciBoYXMgbmxpbmtcIiwgbWUuX3BhdGgsIGspXG4gICAgICBpZiAoaGFyZExpbmtzW2tdID09PSBtZS5fcGF0aCB8fCAhaGFyZExpbmtzW2tdKSBoYXJkTGlua3Nba10gPSBtZS5fcGF0aFxuICAgICAgZWxzZSB7XG4gICAgICAgIC8vIHN3aXRjaCBpbnRvIGhhcmRsaW5rIG1vZGUuXG4gICAgICAgIHR5cGUgPSBtZS50eXBlID0gbWUucHJvcHMudHlwZSA9IFwiTGlua1wiXG4gICAgICAgIG1lLkxpbmsgPSBtZS5wcm9wcy5MaW5rID0gdHJ1ZVxuICAgICAgICBtZS5saW5rcGF0aCA9IG1lLnByb3BzLmxpbmtwYXRoID0gaGFyZExpbmtzW2tdXG4gICAgICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJIYXJkbGluayBkZXRlY3RlZCwgc3dpdGNoaW5nIG1vZGVcIiwgbWUuX3BhdGgsIG1lLmxpbmtwYXRoKVxuICAgICAgICAvLyBTZXR0aW5nIF9fcHJvdG9fXyB3b3VsZCBhcmd1YWJseSBiZSB0aGUgXCJjb3JyZWN0XCJcbiAgICAgICAgLy8gYXBwcm9hY2ggaGVyZSwgYnV0IHRoYXQganVzdCBzZWVtcyB0b28gd3JvbmcuXG4gICAgICAgIG1lLl9zdGF0ID0gbWUuX3JlYWQgPSBMaW5rUmVhZGVyLnByb3RvdHlwZS5fcmVhZFxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtZS50eXBlICYmIG1lLnR5cGUgIT09IHR5cGUpIHtcbiAgICAgIG1lLmVycm9yKFwiVW5leHBlY3RlZCB0eXBlOiBcIiArIHR5cGUpXG4gICAgfVxuXG4gICAgLy8gaWYgdGhlIGZpbHRlciBkb2Vzbid0IHBhc3MsIHRoZW4ganVzdCBza2lwIG92ZXIgdGhpcyBvbmUuXG4gICAgLy8gc3RpbGwgaGF2ZSB0byBlbWl0IGVuZCBzbyB0aGF0IGRpci13YWxraW5nIGNhbiBtb3ZlIG9uLlxuICAgIGlmIChtZS5maWx0ZXIpIHtcbiAgICAgIHZhciB3aG8gPSBtZS5fcHJveHkgfHwgbWVcbiAgICAgIC8vIHNwZWNpYWwgaGFuZGxpbmcgZm9yIFByb3h5UmVhZGVyc1xuICAgICAgaWYgKCFtZS5maWx0ZXIuY2FsbCh3aG8sIHdobywgcHJvcHMpKSB7XG4gICAgICAgIGlmICghbWUuX2Rpc293bmVkKSB7XG4gICAgICAgICAgbWUuYWJvcnQoKVxuICAgICAgICAgIG1lLmVtaXQoXCJlbmRcIilcbiAgICAgICAgICBtZS5lbWl0KFwiY2xvc2VcIilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBsYXN0IGNoYW5jZSB0byBhYm9ydCBvciBkaXNvd24gYmVmb3JlIHRoZSBmbG93IHN0YXJ0cyFcbiAgICB2YXIgZXZlbnRzID0gW1wiX3N0YXRcIiwgXCJzdGF0XCIsIFwicmVhZHlcIl1cbiAgICB2YXIgZSA9IDBcbiAgICA7KGZ1bmN0aW9uIGdvICgpIHtcbiAgICAgIGlmIChtZS5fYWJvcnRlZCkge1xuICAgICAgICBtZS5lbWl0KFwiZW5kXCIpXG4gICAgICAgIG1lLmVtaXQoXCJjbG9zZVwiKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgaWYgKG1lLl9wYXVzZWQgJiYgbWUudHlwZSAhPT0gXCJEaXJlY3RvcnlcIikge1xuICAgICAgICBtZS5vbmNlKFwicmVzdW1lXCIsIGdvKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgdmFyIGV2ID0gZXZlbnRzW2UgKytdXG4gICAgICBpZiAoIWV2KSB7XG4gICAgICAgIHJldHVybiBtZS5fcmVhZCgpXG4gICAgICB9XG4gICAgICBtZS5lbWl0KGV2LCBwcm9wcylcbiAgICAgIGdvKClcbiAgICB9KSgpXG4gIH1cbn1cblxuUmVhZGVyLnByb3RvdHlwZS5waXBlID0gZnVuY3Rpb24gKGRlc3QsIG9wdHMpIHtcbiAgdmFyIG1lID0gdGhpc1xuICBpZiAodHlwZW9mIGRlc3QuYWRkID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAvLyBwaXBpbmcgdG8gYSBtdWx0aS1jb21wYXRpYmxlLCBhbmQgd2UndmUgZ290IGRpcmVjdG9yeSBlbnRyaWVzLlxuICAgIG1lLm9uKFwiZW50cnlcIiwgZnVuY3Rpb24gKGVudHJ5KSB7XG4gICAgICB2YXIgcmV0ID0gZGVzdC5hZGQoZW50cnkpXG4gICAgICBpZiAoZmFsc2UgPT09IHJldCkge1xuICAgICAgICBtZS5wYXVzZSgpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIC8vIGNvbnNvbGUuZXJyb3IoXCJSIFBpcGUgYXBwbHkgU3RyZWFtIFBpcGVcIilcbiAgcmV0dXJuIFN0cmVhbS5wcm90b3R5cGUucGlwZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG59XG5cblJlYWRlci5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbiAod2hvKSB7XG4gIHRoaXMuX3BhdXNlZCA9IHRydWVcbiAgd2hvID0gd2hvIHx8IHRoaXNcbiAgdGhpcy5lbWl0KFwicGF1c2VcIiwgd2hvKVxuICBpZiAodGhpcy5fc3RyZWFtKSB0aGlzLl9zdHJlYW0ucGF1c2Uod2hvKVxufVxuXG5SZWFkZXIucHJvdG90eXBlLnJlc3VtZSA9IGZ1bmN0aW9uICh3aG8pIHtcbiAgdGhpcy5fcGF1c2VkID0gZmFsc2VcbiAgd2hvID0gd2hvIHx8IHRoaXNcbiAgdGhpcy5lbWl0KFwicmVzdW1lXCIsIHdobylcbiAgaWYgKHRoaXMuX3N0cmVhbSkgdGhpcy5fc3RyZWFtLnJlc3VtZSh3aG8pXG4gIHRoaXMuX3JlYWQoKVxufVxuXG5SZWFkZXIucHJvdG90eXBlLl9yZWFkID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmVycm9yKFwiQ2Fubm90IHJlYWQgdW5rbm93biB0eXBlOiBcIit0aGlzLnR5cGUpXG59XG5cbiIsIi8vIEp1c3QgZ2V0IHRoZSBzdGF0cywgYW5kIHRoZW4gZG9uJ3QgZG8gYW55dGhpbmcuXG4vLyBZb3UgY2FuJ3QgcmVhbGx5IFwicmVhZFwiIGZyb20gYSBzb2NrZXQuICBZb3UgXCJjb25uZWN0XCIgdG8gaXQuXG4vLyBNb3N0bHksIHRoaXMgaXMgaGVyZSBzbyB0aGF0IHJlYWRpbmcgYSBkaXIgd2l0aCBhIHNvY2tldCBpbiBpdFxuLy8gZG9lc24ndCBibG93IHVwLlxuXG5tb2R1bGUuZXhwb3J0cyA9IFNvY2tldFJlYWRlclxuXG52YXIgZnMgPSByZXF1aXJlKFwiZ3JhY2VmdWwtZnNcIilcbiAgLCBmc3RyZWFtID0gcmVxdWlyZShcIi4uL2ZzdHJlYW0uanNcIilcbiAgLCBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKVxuICAsIG1rZGlyID0gcmVxdWlyZShcIm1rZGlycFwiKVxuICAsIFJlYWRlciA9IHJlcXVpcmUoXCIuL3JlYWRlci5qc1wiKVxuXG5pbmhlcml0cyhTb2NrZXRSZWFkZXIsIFJlYWRlcilcblxuZnVuY3Rpb24gU29ja2V0UmVhZGVyIChwcm9wcykge1xuICB2YXIgbWUgPSB0aGlzXG4gIGlmICghKG1lIGluc3RhbmNlb2YgU29ja2V0UmVhZGVyKSkgdGhyb3cgbmV3IEVycm9yKFxuICAgIFwiU29ja2V0UmVhZGVyIG11c3QgYmUgY2FsbGVkIGFzIGNvbnN0cnVjdG9yLlwiKVxuXG4gIGlmICghKHByb3BzLnR5cGUgPT09IFwiU29ja2V0XCIgJiYgcHJvcHMuU29ja2V0KSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk5vbi1zb2NrZXQgdHlwZSBcIisgcHJvcHMudHlwZSlcbiAgfVxuXG4gIFJlYWRlci5jYWxsKG1lLCBwcm9wcylcbn1cblxuU29ja2V0UmVhZGVyLnByb3RvdHlwZS5fcmVhZCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG1lID0gdGhpc1xuICBpZiAobWUuX3BhdXNlZCkgcmV0dXJuXG4gIC8vIGJhc2ljYWxseSBqdXN0IGEgbm8tb3AsIHNpbmNlIHdlIGdvdCBhbGwgdGhlIGluZm8gd2UgaGF2ZVxuICAvLyBmcm9tIHRoZSBfc3RhdCBtZXRob2RcbiAgaWYgKCFtZS5fZW5kZWQpIHtcbiAgICBtZS5lbWl0KFwiZW5kXCIpXG4gICAgbWUuZW1pdChcImNsb3NlXCIpXG4gICAgbWUuX2VuZGVkID0gdHJ1ZVxuICB9XG59XG4iLCJcbm1vZHVsZS5leHBvcnRzID0gV3JpdGVyXG5cbnZhciBmcyA9IHJlcXVpcmUoXCJncmFjZWZ1bC1mc1wiKVxuICAsIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpXG4gICwgcmltcmFmID0gcmVxdWlyZShcInJpbXJhZlwiKVxuICAsIG1rZGlyID0gcmVxdWlyZShcIm1rZGlycFwiKVxuICAsIHBhdGggPSByZXF1aXJlKFwicGF0aFwiKVxuICAsIHVtYXNrID0gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJ3aW4zMlwiID8gMCA6IHByb2Nlc3MudW1hc2soKVxuICAsIGdldFR5cGUgPSByZXF1aXJlKFwiLi9nZXQtdHlwZS5qc1wiKVxuICAsIEFic3RyYWN0ID0gcmVxdWlyZShcIi4vYWJzdHJhY3QuanNcIilcblxuLy8gTXVzdCBkbyB0aGlzICpiZWZvcmUqIGxvYWRpbmcgdGhlIGNoaWxkIGNsYXNzZXNcbmluaGVyaXRzKFdyaXRlciwgQWJzdHJhY3QpXG5cbldyaXRlci5kaXJtb2RlID0gMDc3NyAmICh+dW1hc2spXG5Xcml0ZXIuZmlsZW1vZGUgPSAwNjY2ICYgKH51bWFzaylcblxudmFyIERpcldyaXRlciA9IHJlcXVpcmUoXCIuL2Rpci13cml0ZXIuanNcIilcbiAgLCBMaW5rV3JpdGVyID0gcmVxdWlyZShcIi4vbGluay13cml0ZXIuanNcIilcbiAgLCBGaWxlV3JpdGVyID0gcmVxdWlyZShcIi4vZmlsZS13cml0ZXIuanNcIilcbiAgLCBQcm94eVdyaXRlciA9IHJlcXVpcmUoXCIuL3Byb3h5LXdyaXRlci5qc1wiKVxuXG4vLyBwcm9wcyBpcyB0aGUgZGVzaXJlZCBzdGF0ZS4gIGN1cnJlbnQgaXMgb3B0aW9uYWxseSB0aGUgY3VycmVudCBzdGF0LFxuLy8gcHJvdmlkZWQgaGVyZSBzbyB0aGF0IHN1YmNsYXNzZXMgY2FuIGF2b2lkIHN0YXR0aW5nIHRoZSB0YXJnZXRcbi8vIG1vcmUgdGhhbiBuZWNlc3NhcnkuXG5mdW5jdGlvbiBXcml0ZXIgKHByb3BzLCBjdXJyZW50KSB7XG4gIHZhciBtZSA9IHRoaXNcblxuICBpZiAodHlwZW9mIHByb3BzID09PSBcInN0cmluZ1wiKSB7XG4gICAgcHJvcHMgPSB7IHBhdGg6IHByb3BzIH1cbiAgfVxuXG4gIGlmICghcHJvcHMucGF0aCkgbWUuZXJyb3IoXCJNdXN0IHByb3ZpZGUgYSBwYXRoXCIsIG51bGwsIHRydWUpXG5cbiAgLy8gcG9seW1vcnBoaXNtLlxuICAvLyBjYWxsIGZzdHJlYW0uV3JpdGVyKGRpcikgdG8gZ2V0IGEgRGlyV3JpdGVyIG9iamVjdCwgZXRjLlxuICB2YXIgdHlwZSA9IGdldFR5cGUocHJvcHMpXG4gICAgLCBDbGFzc1R5cGUgPSBXcml0ZXJcblxuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlIFwiRGlyZWN0b3J5XCI6XG4gICAgICBDbGFzc1R5cGUgPSBEaXJXcml0ZXJcbiAgICAgIGJyZWFrXG4gICAgY2FzZSBcIkZpbGVcIjpcbiAgICAgIENsYXNzVHlwZSA9IEZpbGVXcml0ZXJcbiAgICAgIGJyZWFrXG4gICAgY2FzZSBcIkxpbmtcIjpcbiAgICBjYXNlIFwiU3ltYm9saWNMaW5rXCI6XG4gICAgICBDbGFzc1R5cGUgPSBMaW5rV3JpdGVyXG4gICAgICBicmVha1xuICAgIGNhc2UgbnVsbDpcbiAgICAgIC8vIERvbid0IGtub3cgeWV0IHdoYXQgdHlwZSB0byBjcmVhdGUsIHNvIHdlIHdyYXAgaW4gYSBwcm94eS5cbiAgICAgIENsYXNzVHlwZSA9IFByb3h5V3JpdGVyXG4gICAgICBicmVha1xuICB9XG5cbiAgaWYgKCEobWUgaW5zdGFuY2VvZiBDbGFzc1R5cGUpKSByZXR1cm4gbmV3IENsYXNzVHlwZShwcm9wcylcblxuICAvLyBub3cgZ2V0IGRvd24gdG8gYnVzaW5lc3MuXG5cbiAgQWJzdHJhY3QuY2FsbChtZSlcblxuICAvLyBwcm9wcyBpcyB3aGF0IHdlIHdhbnQgdG8gc2V0LlxuICAvLyBzZXQgc29tZSBjb252ZW5pZW5jZSBwcm9wZXJ0aWVzIGFzIHdlbGwuXG4gIG1lLnR5cGUgPSBwcm9wcy50eXBlXG4gIG1lLnByb3BzID0gcHJvcHNcbiAgbWUuZGVwdGggPSBwcm9wcy5kZXB0aCB8fCAwXG4gIG1lLmNsb2JiZXIgPSBmYWxzZSA9PT0gcHJvcHMuY2xvYmJlciA/IHByb3BzLmNsb2JiZXIgOiB0cnVlXG4gIG1lLnBhcmVudCA9IHByb3BzLnBhcmVudCB8fCBudWxsXG4gIG1lLnJvb3QgPSBwcm9wcy5yb290IHx8IChwcm9wcy5wYXJlbnQgJiYgcHJvcHMucGFyZW50LnJvb3QpIHx8IG1lXG5cbiAgbWUuX3BhdGggPSBtZS5wYXRoID0gcGF0aC5yZXNvbHZlKHByb3BzLnBhdGgpXG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSBcIndpbjMyXCIpIHtcbiAgICBtZS5wYXRoID0gbWUuX3BhdGggPSBtZS5wYXRoLnJlcGxhY2UoL1xcPy9nLCBcIl9cIilcbiAgICBpZiAobWUuX3BhdGgubGVuZ3RoID49IDI2MCkge1xuICAgICAgbWUuX3N3YWxsb3dFcnJvcnMgPSB0cnVlXG4gICAgICBtZS5fcGF0aCA9IFwiXFxcXFxcXFw/XFxcXFwiICsgbWUucGF0aC5yZXBsYWNlKC9cXC8vZywgXCJcXFxcXCIpXG4gICAgfVxuICB9XG4gIG1lLmJhc2VuYW1lID0gcGF0aC5iYXNlbmFtZShwcm9wcy5wYXRoKVxuICBtZS5kaXJuYW1lID0gcGF0aC5kaXJuYW1lKHByb3BzLnBhdGgpXG4gIG1lLmxpbmtwYXRoID0gcHJvcHMubGlua3BhdGggfHwgbnVsbFxuXG4gIHByb3BzLnBhcmVudCA9IHByb3BzLnJvb3QgPSBudWxsXG5cbiAgLy8gY29uc29sZS5lcnJvcihcIlxcblxcblxcbiVzIHNldHRpbmcgc2l6ZSB0b1wiLCBwcm9wcy5wYXRoLCBwcm9wcy5zaXplKVxuICBtZS5zaXplID0gcHJvcHMuc2l6ZVxuXG4gIGlmICh0eXBlb2YgcHJvcHMubW9kZSA9PT0gXCJzdHJpbmdcIikge1xuICAgIHByb3BzLm1vZGUgPSBwYXJzZUludChwcm9wcy5tb2RlLCA4KVxuICB9XG5cbiAgbWUucmVhZGFibGUgPSBmYWxzZVxuICBtZS53cml0YWJsZSA9IHRydWVcblxuICAvLyBidWZmZXIgdW50aWwgcmVhZHksIG9yIHdoaWxlIGhhbmRsaW5nIGFub3RoZXIgZW50cnlcbiAgbWUuX2J1ZmZlciA9IFtdXG4gIG1lLnJlYWR5ID0gZmFsc2VcblxuICBtZS5maWx0ZXIgPSB0eXBlb2YgcHJvcHMuZmlsdGVyID09PSBcImZ1bmN0aW9uXCIgPyBwcm9wcy5maWx0ZXI6IG51bGxcblxuICAvLyBzdGFydCB0aGUgYmFsbCByb2xsaW5nLlxuICAvLyB0aGlzIGNoZWNrcyB3aGF0J3MgdGhlcmUgYWxyZWFkeSwgYW5kIHRoZW4gY2FsbHNcbiAgLy8gbWUuX2NyZWF0ZSgpIHRvIGNhbGwgdGhlIGltcGwtc3BlY2lmaWMgY3JlYXRpb24gc3R1ZmYuXG4gIG1lLl9zdGF0KGN1cnJlbnQpXG59XG5cbi8vIENhbGxpbmcgdGhpcyBtZWFucyB0aGF0IGl0J3Mgc29tZXRoaW5nIHdlIGNhbid0IGNyZWF0ZS5cbi8vIEp1c3QgYXNzZXJ0IHRoYXQgaXQncyBhbHJlYWR5IHRoZXJlLCBvdGhlcndpc2UgcmFpc2UgYSB3YXJuaW5nLlxuV3JpdGVyLnByb3RvdHlwZS5fY3JlYXRlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbWUgPSB0aGlzXG4gIGZzW21lLnByb3BzLmZvbGxvdyA/IFwic3RhdFwiIDogXCJsc3RhdFwiXShtZS5fcGF0aCwgZnVuY3Rpb24gKGVyLCBjdXJyZW50KSB7XG4gICAgaWYgKGVyKSB7XG4gICAgICByZXR1cm4gbWUud2FybihcIkNhbm5vdCBjcmVhdGUgXCIgKyBtZS5fcGF0aCArIFwiXFxuXCIgK1xuICAgICAgICAgICAgICAgICAgICAgXCJVbnN1cHBvcnRlZCB0eXBlOiBcIittZS50eXBlLCBcIkVOT1RTVVBcIilcbiAgICB9XG4gICAgbWUuX2ZpbmlzaCgpXG4gIH0pXG59XG5cbldyaXRlci5wcm90b3R5cGUuX3N0YXQgPSBmdW5jdGlvbiAoY3VycmVudCkge1xuICB2YXIgbWUgPSB0aGlzXG4gICAgLCBwcm9wcyA9IG1lLnByb3BzXG4gICAgLCBzdGF0ID0gcHJvcHMuZm9sbG93ID8gXCJzdGF0XCIgOiBcImxzdGF0XCJcbiAgICAsIHdobyA9IG1lLl9wcm94eSB8fCBtZVxuXG4gIGlmIChjdXJyZW50KSBzdGF0Q2IobnVsbCwgY3VycmVudClcbiAgZWxzZSBmc1tzdGF0XShtZS5fcGF0aCwgc3RhdENiKVxuXG4gIGZ1bmN0aW9uIHN0YXRDYiAoZXIsIGN1cnJlbnQpIHtcbiAgICBpZiAobWUuZmlsdGVyICYmICFtZS5maWx0ZXIuY2FsbCh3aG8sIHdobywgY3VycmVudCkpIHtcbiAgICAgIG1lLl9hYm9ydGVkID0gdHJ1ZVxuICAgICAgbWUuZW1pdChcImVuZFwiKVxuICAgICAgbWUuZW1pdChcImNsb3NlXCIpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBpZiBpdCdzIG5vdCB0aGVyZSwgZ3JlYXQuICBXZSdsbCBqdXN0IGNyZWF0ZSBpdC5cbiAgICAvLyBpZiBpdCBpcyB0aGVyZSwgdGhlbiB3ZSdsbCBuZWVkIHRvIGNoYW5nZSB3aGF0ZXZlciBkaWZmZXJzXG4gICAgaWYgKGVyIHx8ICFjdXJyZW50KSB7XG4gICAgICByZXR1cm4gY3JlYXRlKG1lKVxuICAgIH1cblxuICAgIG1lLl9vbGQgPSBjdXJyZW50XG4gICAgdmFyIGN1cnJlbnRUeXBlID0gZ2V0VHlwZShjdXJyZW50KVxuXG4gICAgLy8gaWYgaXQncyBhIHR5cGUgY2hhbmdlLCB0aGVuIHdlIG5lZWQgdG8gY2xvYmJlciBvciBlcnJvci5cbiAgICAvLyBpZiBpdCdzIG5vdCBhIHR5cGUgY2hhbmdlLCB0aGVuIGxldCB0aGUgaW1wbCB0YWtlIGNhcmUgb2YgaXQuXG4gICAgaWYgKGN1cnJlbnRUeXBlICE9PSBtZS50eXBlKSB7XG4gICAgICByZXR1cm4gcmltcmFmKG1lLl9wYXRoLCBmdW5jdGlvbiAoZXIpIHtcbiAgICAgICAgaWYgKGVyKSByZXR1cm4gbWUuZXJyb3IoZXIpXG4gICAgICAgIG1lLl9vbGQgPSBudWxsXG4gICAgICAgIGNyZWF0ZShtZSlcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgLy8gb3RoZXJ3aXNlLCBqdXN0IGhhbmRsZSBpbiB0aGUgYXBwLXNwZWNpZmljIHdheVxuICAgIC8vIHRoaXMgY3JlYXRlcyBhIGZzLldyaXRlU3RyZWFtLCBvciBta2RpcidzLCBvciB3aGF0ZXZlclxuICAgIGNyZWF0ZShtZSlcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGUgKG1lKSB7XG4gIC8vIGNvbnNvbGUuZXJyb3IoXCJXIGNyZWF0ZVwiLCBtZS5fcGF0aCwgV3JpdGVyLmRpcm1vZGUpXG5cbiAgLy8gWFhYIE5lZWQgdG8gY2xvYmJlciBub24tZGlycyB0aGF0IGFyZSBpbiB0aGUgd2F5LFxuICAvLyB1bmxlc3MgeyBjbG9iYmVyOiBmYWxzZSB9IGluIHRoZSBwcm9wcy5cbiAgbWtkaXIocGF0aC5kaXJuYW1lKG1lLl9wYXRoKSwgV3JpdGVyLmRpcm1vZGUsIGZ1bmN0aW9uIChlciwgbWFkZSkge1xuICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJXIGNyZWF0ZWRcIiwgcGF0aC5kaXJuYW1lKG1lLl9wYXRoKSwgZXIpXG4gICAgaWYgKGVyKSByZXR1cm4gbWUuZXJyb3IoZXIpXG5cbiAgICAvLyBsYXRlciBvbiwgd2UgaGF2ZSB0byBzZXQgdGhlIG1vZGUgYW5kIG93bmVyIGZvciB0aGVzZVxuICAgIG1lLl9tYWRlRGlyID0gbWFkZVxuICAgIHJldHVybiBtZS5fY3JlYXRlKClcbiAgfSlcbn1cblxuZnVuY3Rpb24gZW5kQ2htb2QgKG1lLCB3YW50LCBjdXJyZW50LCBwYXRoLCBjYikge1xuICAgIHZhciB3YW50TW9kZSA9IHdhbnQubW9kZVxuICAgICAgLCBjaG1vZCA9IHdhbnQuZm9sbG93IHx8IG1lLnR5cGUgIT09IFwiU3ltYm9saWNMaW5rXCJcbiAgICAgICAgICAgICAgPyBcImNobW9kXCIgOiBcImxjaG1vZFwiXG5cbiAgaWYgKCFmc1tjaG1vZF0pIHJldHVybiBjYigpXG4gIGlmICh0eXBlb2Ygd2FudE1vZGUgIT09IFwibnVtYmVyXCIpIHJldHVybiBjYigpXG5cbiAgdmFyIGN1ck1vZGUgPSBjdXJyZW50Lm1vZGUgJiAwNzc3XG4gIHdhbnRNb2RlID0gd2FudE1vZGUgJiAwNzc3XG4gIGlmICh3YW50TW9kZSA9PT0gY3VyTW9kZSkgcmV0dXJuIGNiKClcblxuICBmc1tjaG1vZF0ocGF0aCwgd2FudE1vZGUsIGNiKVxufVxuXG5cbmZ1bmN0aW9uIGVuZENob3duIChtZSwgd2FudCwgY3VycmVudCwgcGF0aCwgY2IpIHtcbiAgLy8gRG9uJ3QgZXZlbiB0cnkgaXQgdW5sZXNzIHJvb3QuICBUb28gZWFzeSB0byBFUEVSTS5cbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09IFwid2luMzJcIikgcmV0dXJuIGNiKClcbiAgaWYgKCFwcm9jZXNzLmdldHVpZCB8fCAhcHJvY2Vzcy5nZXR1aWQoKSA9PT0gMCkgcmV0dXJuIGNiKClcbiAgaWYgKHR5cGVvZiB3YW50LnVpZCAhPT0gXCJudW1iZXJcIiAmJlxuICAgICAgdHlwZW9mIHdhbnQuZ2lkICE9PSBcIm51bWJlclwiICkgcmV0dXJuIGNiKClcblxuICBpZiAoY3VycmVudC51aWQgPT09IHdhbnQudWlkICYmXG4gICAgICBjdXJyZW50LmdpZCA9PT0gd2FudC5naWQpIHJldHVybiBjYigpXG5cbiAgdmFyIGNob3duID0gKG1lLnByb3BzLmZvbGxvdyB8fCBtZS50eXBlICE9PSBcIlN5bWJvbGljTGlua1wiKVxuICAgICAgICAgICAgPyBcImNob3duXCIgOiBcImxjaG93blwiXG4gIGlmICghZnNbY2hvd25dKSByZXR1cm4gY2IoKVxuXG4gIGlmICh0eXBlb2Ygd2FudC51aWQgIT09IFwibnVtYmVyXCIpIHdhbnQudWlkID0gY3VycmVudC51aWRcbiAgaWYgKHR5cGVvZiB3YW50LmdpZCAhPT0gXCJudW1iZXJcIikgd2FudC5naWQgPSBjdXJyZW50LmdpZFxuXG4gIGZzW2Nob3duXShwYXRoLCB3YW50LnVpZCwgd2FudC5naWQsIGNiKVxufVxuXG5mdW5jdGlvbiBlbmRVdGltZXMgKG1lLCB3YW50LCBjdXJyZW50LCBwYXRoLCBjYikge1xuICBpZiAoIWZzLnV0aW1lcyB8fCBwcm9jZXNzLnBsYXRmb3JtID09PSBcIndpbjMyXCIpIHJldHVybiBjYigpXG5cbiAgdmFyIHV0aW1lcyA9ICh3YW50LmZvbGxvdyB8fCBtZS50eXBlICE9PSBcIlN5bWJvbGljTGlua1wiKVxuICAgICAgICAgICAgID8gXCJ1dGltZXNcIiA6IFwibHV0aW1lc1wiXG5cbiAgaWYgKHV0aW1lcyA9PT0gXCJsdXRpbWVzXCIgJiYgIWZzW3V0aW1lc10pIHtcbiAgICB1dGltZXMgPSBcInV0aW1lc1wiXG4gIH1cblxuICBpZiAoIWZzW3V0aW1lc10pIHJldHVybiBjYigpXG5cbiAgdmFyIGN1ckEgPSBjdXJyZW50LmF0aW1lXG4gICAgLCBjdXJNID0gY3VycmVudC5tdGltZVxuICAgICwgbWVBID0gd2FudC5hdGltZVxuICAgICwgbWVNID0gd2FudC5tdGltZVxuXG4gIGlmIChtZUEgPT09IHVuZGVmaW5lZCkgbWVBID0gY3VyQVxuICBpZiAobWVNID09PSB1bmRlZmluZWQpIG1lTSA9IGN1ck1cblxuICBpZiAoIWlzRGF0ZShtZUEpKSBtZUEgPSBuZXcgRGF0ZShtZUEpXG4gIGlmICghaXNEYXRlKG1lTSkpIG1lQSA9IG5ldyBEYXRlKG1lTSlcblxuICBpZiAobWVBLmdldFRpbWUoKSA9PT0gY3VyQS5nZXRUaW1lKCkgJiZcbiAgICAgIG1lTS5nZXRUaW1lKCkgPT09IGN1ck0uZ2V0VGltZSgpKSByZXR1cm4gY2IoKVxuXG4gIGZzW3V0aW1lc10ocGF0aCwgbWVBLCBtZU0sIGNiKVxufVxuXG5cbi8vIFhYWCBUaGlzIGZ1bmN0aW9uIGlzIGJlYXN0bHkuICBCcmVhayBpdCB1cCFcbldyaXRlci5wcm90b3R5cGUuX2ZpbmlzaCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG1lID0gdGhpc1xuXG4gIC8vIGNvbnNvbGUuZXJyb3IoXCIgVyBGaW5pc2hcIiwgbWUuX3BhdGgsIG1lLnNpemUpXG5cbiAgLy8gc2V0IHVwIGFsbCB0aGUgdGhpbmdzLlxuICAvLyBBdCB0aGlzIHBvaW50LCB3ZSdyZSBhbHJlYWR5IGRvbmUgd3JpdGluZyB3aGF0ZXZlciB3ZSd2ZSBnb3R0YSB3cml0ZSxcbiAgLy8gYWRkaW5nIGZpbGVzIHRvIHRoZSBkaXIsIGV0Yy5cbiAgdmFyIHRvZG8gPSAwXG4gIHZhciBlcnJTdGF0ZSA9IG51bGxcbiAgdmFyIGRvbmUgPSBmYWxzZVxuXG4gIGlmIChtZS5fb2xkKSB7XG4gICAgLy8gdGhlIHRpbWVzIHdpbGwgYWxtb3N0ICpjZXJ0YWlubHkqIGhhdmUgY2hhbmdlZC5cbiAgICAvLyBhZGRzIHRoZSB1dGltZXMgc3lzY2FsbCwgYnV0IHJlbW92ZSBhbm90aGVyIHN0YXQuXG4gICAgbWUuX29sZC5hdGltZSA9IG5ldyBEYXRlKDApXG4gICAgbWUuX29sZC5tdGltZSA9IG5ldyBEYXRlKDApXG4gICAgLy8gY29uc29sZS5lcnJvcihcIiBXIEZpbmlzaCBTdGFsZSBTdGF0XCIsIG1lLl9wYXRoLCBtZS5zaXplKVxuICAgIHNldFByb3BzKG1lLl9vbGQpXG4gIH0gZWxzZSB7XG4gICAgdmFyIHN0YXQgPSBtZS5wcm9wcy5mb2xsb3cgPyBcInN0YXRcIiA6IFwibHN0YXRcIlxuICAgIC8vIGNvbnNvbGUuZXJyb3IoXCIgVyBGaW5pc2ggU3RhdGluZ1wiLCBtZS5fcGF0aCwgbWUuc2l6ZSlcbiAgICBmc1tzdGF0XShtZS5fcGF0aCwgZnVuY3Rpb24gKGVyLCBjdXJyZW50KSB7XG4gICAgICAvLyBjb25zb2xlLmVycm9yKFwiIFcgRmluaXNoIFN0YXRlZFwiLCBtZS5fcGF0aCwgbWUuc2l6ZSwgY3VycmVudClcbiAgICAgIGlmIChlcikge1xuICAgICAgICAvLyBpZiB3ZSdyZSBpbiB0aGUgcHJvY2VzcyBvZiB3cml0aW5nIG91dCBhXG4gICAgICAgIC8vIGRpcmVjdG9yeSwgaXQncyB2ZXJ5IHBvc3NpYmxlIHRoYXQgdGhlIHRoaW5nIHdlJ3JlIGxpbmtpbmcgdG9cbiAgICAgICAgLy8gZG9lc24ndCBleGlzdCB5ZXQgKGVzcGVjaWFsbHkgaWYgaXQgd2FzIGludGVuZGVkIGFzIGEgc3ltbGluayksXG4gICAgICAgIC8vIHNvIHN3YWxsb3cgRU5PRU5UIGVycm9ycyBoZXJlIGFuZCBqdXN0IHNvbGRpZXIgb24uXG4gICAgICAgIGlmIChlci5jb2RlID09PSBcIkVOT0VOVFwiICYmXG4gICAgICAgICAgICAobWUudHlwZSA9PT0gXCJMaW5rXCIgfHwgbWUudHlwZSA9PT0gXCJTeW1ib2xpY0xpbmtcIikgJiZcbiAgICAgICAgICAgIHByb2Nlc3MucGxhdGZvcm0gPT09IFwid2luMzJcIikge1xuICAgICAgICAgIG1lLnJlYWR5ID0gdHJ1ZVxuICAgICAgICAgIG1lLmVtaXQoXCJyZWFkeVwiKVxuICAgICAgICAgIG1lLmVtaXQoXCJlbmRcIilcbiAgICAgICAgICBtZS5lbWl0KFwiY2xvc2VcIilcbiAgICAgICAgICBtZS5lbmQgPSBtZS5fZmluaXNoID0gZnVuY3Rpb24gKCkge31cbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfSBlbHNlIHJldHVybiBtZS5lcnJvcihlcilcbiAgICAgIH1cbiAgICAgIHNldFByb3BzKG1lLl9vbGQgPSBjdXJyZW50KVxuICAgIH0pXG4gIH1cblxuICByZXR1cm5cblxuICBmdW5jdGlvbiBzZXRQcm9wcyAoY3VycmVudCkge1xuICAgIHRvZG8gKz0gM1xuICAgIGVuZENobW9kKG1lLCBtZS5wcm9wcywgY3VycmVudCwgbWUuX3BhdGgsIG5leHQoXCJjaG1vZFwiKSlcbiAgICBlbmRDaG93bihtZSwgbWUucHJvcHMsIGN1cnJlbnQsIG1lLl9wYXRoLCBuZXh0KFwiY2hvd25cIikpXG4gICAgZW5kVXRpbWVzKG1lLCBtZS5wcm9wcywgY3VycmVudCwgbWUuX3BhdGgsIG5leHQoXCJ1dGltZXNcIikpXG4gIH1cblxuICBmdW5jdGlvbiBuZXh0ICh3aGF0KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChlcikge1xuICAgICAgLy8gY29uc29sZS5lcnJvcihcIiAgIFcgRmluaXNoXCIsIHdoYXQsIHRvZG8pXG4gICAgICBpZiAoZXJyU3RhdGUpIHJldHVyblxuICAgICAgaWYgKGVyKSB7XG4gICAgICAgIGVyLmZzdHJlYW1fZmluaXNoX2NhbGwgPSB3aGF0XG4gICAgICAgIHJldHVybiBtZS5lcnJvcihlcnJTdGF0ZSA9IGVyKVxuICAgICAgfVxuICAgICAgaWYgKC0tdG9kbyA+IDApIHJldHVyblxuICAgICAgaWYgKGRvbmUpIHJldHVyblxuICAgICAgZG9uZSA9IHRydWVcblxuICAgICAgLy8gd2UgbWF5IHN0aWxsIG5lZWQgdG8gc2V0IHRoZSBtb2RlL2V0Yy4gb24gc29tZSBwYXJlbnQgZGlyc1xuICAgICAgLy8gdGhhdCB3ZXJlIGNyZWF0ZWQgcHJldmlvdXNseS4gIGRlbGF5IGVuZC9jbG9zZSB1bnRpbCB0aGVuLlxuICAgICAgaWYgKCFtZS5fbWFkZURpcikgcmV0dXJuIGVuZCgpXG4gICAgICBlbHNlIGVuZE1hZGVEaXIobWUsIG1lLl9wYXRoLCBlbmQpXG5cbiAgICAgIGZ1bmN0aW9uIGVuZCAoZXIpIHtcbiAgICAgICAgaWYgKGVyKSB7XG4gICAgICAgICAgZXIuZnN0cmVhbV9maW5pc2hfY2FsbCA9IFwic2V0dXBNYWRlRGlyXCJcbiAgICAgICAgICByZXR1cm4gbWUuZXJyb3IoZXIpXG4gICAgICAgIH1cbiAgICAgICAgLy8gYWxsIHRoZSBwcm9wcyBoYXZlIGJlZW4gc2V0LCBzbyB3ZSdyZSBjb21wbGV0ZWx5IGRvbmUuXG4gICAgICAgIG1lLmVtaXQoXCJlbmRcIilcbiAgICAgICAgbWUuZW1pdChcImNsb3NlXCIpXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGVuZE1hZGVEaXIgKG1lLCBwLCBjYikge1xuICB2YXIgbWFkZSA9IG1lLl9tYWRlRGlyXG4gIC8vIGV2ZXJ5dGhpbmcgKmJldHdlZW4qIG1hZGUgYW5kIHBhdGguZGlybmFtZShtZS5fcGF0aClcbiAgLy8gbmVlZHMgdG8gYmUgc2V0IHVwLiAgTm90ZSB0aGF0IHRoaXMgbWF5IGp1c3QgYmUgb25lIGRpci5cbiAgdmFyIGQgPSBwYXRoLmRpcm5hbWUocClcblxuICBlbmRNYWRlRGlyXyhtZSwgZCwgZnVuY3Rpb24gKGVyKSB7XG4gICAgaWYgKGVyKSByZXR1cm4gY2IoZXIpXG4gICAgaWYgKGQgPT09IG1hZGUpIHtcbiAgICAgIHJldHVybiBjYigpXG4gICAgfVxuICAgIGVuZE1hZGVEaXIobWUsIGQsIGNiKVxuICB9KVxufVxuXG5mdW5jdGlvbiBlbmRNYWRlRGlyXyAobWUsIHAsIGNiKSB7XG4gIHZhciBkaXJQcm9wcyA9IHt9XG4gIE9iamVjdC5rZXlzKG1lLnByb3BzKS5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgZGlyUHJvcHNba10gPSBtZS5wcm9wc1trXVxuXG4gICAgLy8gb25seSBtYWtlIG5vbi1yZWFkYWJsZSBkaXJzIGlmIGV4cGxpY2l0bHkgcmVxdWVzdGVkLlxuICAgIGlmIChrID09PSBcIm1vZGVcIiAmJiBtZS50eXBlICE9PSBcIkRpcmVjdG9yeVwiKSB7XG4gICAgICBkaXJQcm9wc1trXSA9IGRpclByb3BzW2tdIHwgMDExMVxuICAgIH1cbiAgfSlcblxuICB2YXIgdG9kbyA9IDNcbiAgLCBlcnJTdGF0ZSA9IG51bGxcbiAgZnMuc3RhdChwLCBmdW5jdGlvbiAoZXIsIGN1cnJlbnQpIHtcbiAgICBpZiAoZXIpIHJldHVybiBjYihlcnJTdGF0ZSA9IGVyKVxuICAgIGVuZENobW9kKG1lLCBkaXJQcm9wcywgY3VycmVudCwgcCwgbmV4dClcbiAgICBlbmRDaG93bihtZSwgZGlyUHJvcHMsIGN1cnJlbnQsIHAsIG5leHQpXG4gICAgZW5kVXRpbWVzKG1lLCBkaXJQcm9wcywgY3VycmVudCwgcCwgbmV4dClcbiAgfSlcblxuICBmdW5jdGlvbiBuZXh0IChlcikge1xuICAgIGlmIChlcnJTdGF0ZSkgcmV0dXJuXG4gICAgaWYgKGVyKSByZXR1cm4gY2IoZXJyU3RhdGUgPSBlcilcbiAgICBpZiAoLS0gdG9kbyA9PT0gMCkgcmV0dXJuIGNiKClcbiAgfVxufVxuXG5Xcml0ZXIucHJvdG90eXBlLnBpcGUgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZXJyb3IoXCJDYW4ndCBwaXBlIGZyb20gd3JpdGFibGUgc3RyZWFtXCIpXG59XG5cbldyaXRlci5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmVycm9yKFwiQ2Fubm90IGFkZCB0byBub24tRGlyZWN0b3J5IHR5cGVcIilcbn1cblxuV3JpdGVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRydWVcbn1cblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcgKGQpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChkKVxufVxuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gdHlwZW9mIGQgPT09ICdvYmplY3QnICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJ25hdGl2ZXMnKS5yZXF1aXJlKCdmcycsIFsnc3RyZWFtJ10pXG4iLCIvLyBNb25rZXktcGF0Y2hpbmcgdGhlIGZzIG1vZHVsZS5cbi8vIEl0J3MgdWdseSwgYnV0IHRoZXJlIGlzIHNpbXBseSBubyBvdGhlciB3YXkgdG8gZG8gdGhpcy5cbnZhciBmcyA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9mcy5qcycpXG5cbnZhciBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKVxuXG4vLyBmaXggdXAgc29tZSBidXN0ZWQgc3R1ZmYsIG1vc3RseSBvbiB3aW5kb3dzIGFuZCBvbGQgbm9kZXNcbnJlcXVpcmUoJy4vcG9seWZpbGxzLmpzJylcblxudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJylcblxuZnVuY3Rpb24gbm9vcCAoKSB7fVxuXG52YXIgZGVidWcgPSBub29wXG5pZiAodXRpbC5kZWJ1Z2xvZylcbiAgZGVidWcgPSB1dGlsLmRlYnVnbG9nKCdnZnMnKVxuZWxzZSBpZiAoL1xcYmdmc1xcYi9pLnRlc3QocHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJykpXG4gIGRlYnVnID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG0gPSB1dGlsLmZvcm1hdC5hcHBseSh1dGlsLCBhcmd1bWVudHMpXG4gICAgbSA9ICdHRlM6ICcgKyBtLnNwbGl0KC9cXG4vKS5qb2luKCdcXG5HRlM6ICcpXG4gICAgY29uc29sZS5lcnJvcihtKVxuICB9XG5cbmlmICgvXFxiZ2ZzXFxiL2kudGVzdChwcm9jZXNzLmVudi5OT0RFX0RFQlVHIHx8ICcnKSkge1xuICBwcm9jZXNzLm9uKCdleGl0JywgZnVuY3Rpb24oKSB7XG4gICAgZGVidWcoJ2ZkcycsIGZkcylcbiAgICBkZWJ1ZyhxdWV1ZSlcbiAgICBhc3NlcnQuZXF1YWwocXVldWUubGVuZ3RoLCAwKVxuICB9KVxufVxuXG5cbnZhciBvcmlnaW5hbE9wZW4gPSBmcy5vcGVuXG5mcy5vcGVuID0gb3BlblxuXG5mdW5jdGlvbiBvcGVuKHBhdGgsIGZsYWdzLCBtb2RlLCBjYikge1xuICBpZiAodHlwZW9mIG1vZGUgPT09IFwiZnVuY3Rpb25cIikgY2IgPSBtb2RlLCBtb2RlID0gbnVsbFxuICBpZiAodHlwZW9mIGNiICE9PSBcImZ1bmN0aW9uXCIpIGNiID0gbm9vcFxuICBuZXcgT3BlblJlcShwYXRoLCBmbGFncywgbW9kZSwgY2IpXG59XG5cbmZ1bmN0aW9uIE9wZW5SZXEocGF0aCwgZmxhZ3MsIG1vZGUsIGNiKSB7XG4gIHRoaXMucGF0aCA9IHBhdGhcbiAgdGhpcy5mbGFncyA9IGZsYWdzXG4gIHRoaXMubW9kZSA9IG1vZGVcbiAgdGhpcy5jYiA9IGNiXG4gIFJlcS5jYWxsKHRoaXMpXG59XG5cbnV0aWwuaW5oZXJpdHMoT3BlblJlcSwgUmVxKVxuXG5PcGVuUmVxLnByb3RvdHlwZS5wcm9jZXNzID0gZnVuY3Rpb24oKSB7XG4gIG9yaWdpbmFsT3Blbi5jYWxsKGZzLCB0aGlzLnBhdGgsIHRoaXMuZmxhZ3MsIHRoaXMubW9kZSwgdGhpcy5kb25lKVxufVxuXG52YXIgZmRzID0ge31cbk9wZW5SZXEucHJvdG90eXBlLmRvbmUgPSBmdW5jdGlvbihlciwgZmQpIHtcbiAgZGVidWcoJ29wZW4gZG9uZScsIGVyLCBmZClcbiAgaWYgKGZkKVxuICAgIGZkc1snZmQnICsgZmRdID0gdGhpcy5wYXRoXG4gIFJlcS5wcm90b3R5cGUuZG9uZS5jYWxsKHRoaXMsIGVyLCBmZClcbn1cblxuXG52YXIgb3JpZ2luYWxSZWFkZGlyID0gZnMucmVhZGRpclxuZnMucmVhZGRpciA9IHJlYWRkaXJcblxuZnVuY3Rpb24gcmVhZGRpcihwYXRoLCBjYikge1xuICBpZiAodHlwZW9mIGNiICE9PSBcImZ1bmN0aW9uXCIpIGNiID0gbm9vcFxuICBuZXcgUmVhZGRpclJlcShwYXRoLCBjYilcbn1cblxuZnVuY3Rpb24gUmVhZGRpclJlcShwYXRoLCBjYikge1xuICB0aGlzLnBhdGggPSBwYXRoXG4gIHRoaXMuY2IgPSBjYlxuICBSZXEuY2FsbCh0aGlzKVxufVxuXG51dGlsLmluaGVyaXRzKFJlYWRkaXJSZXEsIFJlcSlcblxuUmVhZGRpclJlcS5wcm90b3R5cGUucHJvY2VzcyA9IGZ1bmN0aW9uKCkge1xuICBvcmlnaW5hbFJlYWRkaXIuY2FsbChmcywgdGhpcy5wYXRoLCB0aGlzLmRvbmUpXG59XG5cblJlYWRkaXJSZXEucHJvdG90eXBlLmRvbmUgPSBmdW5jdGlvbihlciwgZmlsZXMpIHtcbiAgaWYgKGZpbGVzICYmIGZpbGVzLnNvcnQpXG4gICAgZmlsZXMgPSBmaWxlcy5zb3J0KClcbiAgUmVxLnByb3RvdHlwZS5kb25lLmNhbGwodGhpcywgZXIsIGZpbGVzKVxuICBvbmNsb3NlKClcbn1cblxuXG52YXIgb3JpZ2luYWxDbG9zZSA9IGZzLmNsb3NlXG5mcy5jbG9zZSA9IGNsb3NlXG5cbmZ1bmN0aW9uIGNsb3NlIChmZCwgY2IpIHtcbiAgZGVidWcoJ2Nsb3NlJywgZmQpXG4gIGlmICh0eXBlb2YgY2IgIT09IFwiZnVuY3Rpb25cIikgY2IgPSBub29wXG4gIGRlbGV0ZSBmZHNbJ2ZkJyArIGZkXVxuICBvcmlnaW5hbENsb3NlLmNhbGwoZnMsIGZkLCBmdW5jdGlvbihlcikge1xuICAgIG9uY2xvc2UoKVxuICAgIGNiKGVyKVxuICB9KVxufVxuXG5cbnZhciBvcmlnaW5hbENsb3NlU3luYyA9IGZzLmNsb3NlU3luY1xuZnMuY2xvc2VTeW5jID0gY2xvc2VTeW5jXG5cbmZ1bmN0aW9uIGNsb3NlU3luYyAoZmQpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gb3JpZ2luYWxDbG9zZVN5bmMoZmQpXG4gIH0gZmluYWxseSB7XG4gICAgb25jbG9zZSgpXG4gIH1cbn1cblxuXG4vLyBSZXEgY2xhc3NcbmZ1bmN0aW9uIFJlcSAoKSB7XG4gIC8vIHN0YXJ0IHByb2Nlc3NpbmdcbiAgdGhpcy5kb25lID0gdGhpcy5kb25lLmJpbmQodGhpcylcbiAgdGhpcy5mYWlsdXJlcyA9IDBcbiAgdGhpcy5wcm9jZXNzKClcbn1cblxuUmVxLnByb3RvdHlwZS5kb25lID0gZnVuY3Rpb24gKGVyLCByZXN1bHQpIHtcbiAgdmFyIHRyeUFnYWluID0gZmFsc2VcbiAgaWYgKGVyKSB7XG4gICAgdmFyIGNvZGUgPSBlci5jb2RlXG4gICAgdmFyIHRyeUFnYWluID0gY29kZSA9PT0gXCJFTUZJTEVcIiB8fCBjb2RlID09PSBcIkVORklMRVwiXG4gICAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09IFwid2luMzJcIilcbiAgICAgIHRyeUFnYWluID0gdHJ5QWdhaW4gfHwgY29kZSA9PT0gXCJPS1wiXG4gIH1cblxuICBpZiAodHJ5QWdhaW4pIHtcbiAgICB0aGlzLmZhaWx1cmVzICsrXG4gICAgZW5xdWV1ZSh0aGlzKVxuICB9IGVsc2Uge1xuICAgIHZhciBjYiA9IHRoaXMuY2JcbiAgICBjYihlciwgcmVzdWx0KVxuICB9XG59XG5cbnZhciBxdWV1ZSA9IFtdXG5cbmZ1bmN0aW9uIGVucXVldWUocmVxKSB7XG4gIHF1ZXVlLnB1c2gocmVxKVxuICBkZWJ1ZygnZW5xdWV1ZSAlZCAlcycsIHF1ZXVlLmxlbmd0aCwgcmVxLmNvbnN0cnVjdG9yLm5hbWUsIHJlcSlcbn1cblxuZnVuY3Rpb24gb25jbG9zZSgpIHtcbiAgdmFyIHJlcSA9IHF1ZXVlLnNoaWZ0KClcbiAgaWYgKHJlcSkge1xuICAgIGRlYnVnKCdwcm9jZXNzJywgcmVxLmNvbnN0cnVjdG9yLm5hbWUsIHJlcSlcbiAgICByZXEucHJvY2VzcygpXG4gIH1cbn1cbiIsInZhciBmcyA9IHJlcXVpcmUoJy4vZnMuanMnKVxudmFyIGNvbnN0YW50cyA9IHJlcXVpcmUoJ2NvbnN0YW50cycpXG5cbnZhciBvcmlnQ3dkID0gcHJvY2Vzcy5jd2RcbnZhciBjd2QgPSBudWxsXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIWN3ZClcbiAgICBjd2QgPSBvcmlnQ3dkLmNhbGwocHJvY2VzcylcbiAgcmV0dXJuIGN3ZFxufVxudmFyIGNoZGlyID0gcHJvY2Vzcy5jaGRpclxucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uKGQpIHtcbiAgY3dkID0gbnVsbFxuICBjaGRpci5jYWxsKHByb2Nlc3MsIGQpXG59XG5cbi8vIChyZS0paW1wbGVtZW50IHNvbWUgdGhpbmdzIHRoYXQgYXJlIGtub3duIGJ1c3RlZCBvciBtaXNzaW5nLlxuXG4vLyBsY2htb2QsIGJyb2tlbiBwcmlvciB0byAwLjYuMlxuLy8gYmFjay1wb3J0IHRoZSBmaXggaGVyZS5cbmlmIChjb25zdGFudHMuaGFzT3duUHJvcGVydHkoJ09fU1lNTElOSycpICYmXG4gICAgcHJvY2Vzcy52ZXJzaW9uLm1hdGNoKC9edjBcXC42XFwuWzAtMl18XnYwXFwuNVxcLi8pKSB7XG4gIGZzLmxjaG1vZCA9IGZ1bmN0aW9uIChwYXRoLCBtb2RlLCBjYWxsYmFjaykge1xuICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgbm9vcFxuICAgIGZzLm9wZW4oIHBhdGhcbiAgICAgICAgICAgLCBjb25zdGFudHMuT19XUk9OTFkgfCBjb25zdGFudHMuT19TWU1MSU5LXG4gICAgICAgICAgICwgbW9kZVxuICAgICAgICAgICAsIGZ1bmN0aW9uIChlcnIsIGZkKSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIGNhbGxiYWNrKGVycilcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICAvLyBwcmVmZXIgdG8gcmV0dXJuIHRoZSBjaG1vZCBlcnJvciwgaWYgb25lIG9jY3VycyxcbiAgICAgIC8vIGJ1dCBzdGlsbCB0cnkgdG8gY2xvc2UsIGFuZCByZXBvcnQgY2xvc2luZyBlcnJvcnMgaWYgdGhleSBvY2N1ci5cbiAgICAgIGZzLmZjaG1vZChmZCwgbW9kZSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICBmcy5jbG9zZShmZCwgZnVuY3Rpb24oZXJyMikge1xuICAgICAgICAgIGNhbGxiYWNrKGVyciB8fCBlcnIyKVxuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgZnMubGNobW9kU3luYyA9IGZ1bmN0aW9uIChwYXRoLCBtb2RlKSB7XG4gICAgdmFyIGZkID0gZnMub3BlblN5bmMocGF0aCwgY29uc3RhbnRzLk9fV1JPTkxZIHwgY29uc3RhbnRzLk9fU1lNTElOSywgbW9kZSlcblxuICAgIC8vIHByZWZlciB0byByZXR1cm4gdGhlIGNobW9kIGVycm9yLCBpZiBvbmUgb2NjdXJzLFxuICAgIC8vIGJ1dCBzdGlsbCB0cnkgdG8gY2xvc2UsIGFuZCByZXBvcnQgY2xvc2luZyBlcnJvcnMgaWYgdGhleSBvY2N1ci5cbiAgICB2YXIgZXJyLCBlcnIyXG4gICAgdHJ5IHtcbiAgICAgIHZhciByZXQgPSBmcy5mY2htb2RTeW5jKGZkLCBtb2RlKVxuICAgIH0gY2F0Y2ggKGVyKSB7XG4gICAgICBlcnIgPSBlclxuICAgIH1cbiAgICB0cnkge1xuICAgICAgZnMuY2xvc2VTeW5jKGZkKVxuICAgIH0gY2F0Y2ggKGVyKSB7XG4gICAgICBlcnIyID0gZXJcbiAgICB9XG4gICAgaWYgKGVyciB8fCBlcnIyKSB0aHJvdyAoZXJyIHx8IGVycjIpXG4gICAgcmV0dXJuIHJldFxuICB9XG59XG5cblxuLy8gbHV0aW1lcyBpbXBsZW1lbnRhdGlvbiwgb3Igbm8tb3BcbmlmICghZnMubHV0aW1lcykge1xuICBpZiAoY29uc3RhbnRzLmhhc093blByb3BlcnR5KFwiT19TWU1MSU5LXCIpKSB7XG4gICAgZnMubHV0aW1lcyA9IGZ1bmN0aW9uIChwYXRoLCBhdCwgbXQsIGNiKSB7XG4gICAgICBmcy5vcGVuKHBhdGgsIGNvbnN0YW50cy5PX1NZTUxJTkssIGZ1bmN0aW9uIChlciwgZmQpIHtcbiAgICAgICAgY2IgPSBjYiB8fCBub29wXG4gICAgICAgIGlmIChlcikgcmV0dXJuIGNiKGVyKVxuICAgICAgICBmcy5mdXRpbWVzKGZkLCBhdCwgbXQsIGZ1bmN0aW9uIChlcikge1xuICAgICAgICAgIGZzLmNsb3NlKGZkLCBmdW5jdGlvbiAoZXIyKSB7XG4gICAgICAgICAgICByZXR1cm4gY2IoZXIgfHwgZXIyKVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH1cblxuICAgIGZzLmx1dGltZXNTeW5jID0gZnVuY3Rpb24gKHBhdGgsIGF0LCBtdCkge1xuICAgICAgdmFyIGZkID0gZnMub3BlblN5bmMocGF0aCwgY29uc3RhbnRzLk9fU1lNTElOSylcbiAgICAgICAgLCBlcnJcbiAgICAgICAgLCBlcnIyXG4gICAgICAgICwgcmV0XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciByZXQgPSBmcy5mdXRpbWVzU3luYyhmZCwgYXQsIG10KVxuICAgICAgfSBjYXRjaCAoZXIpIHtcbiAgICAgICAgZXJyID0gZXJcbiAgICAgIH1cbiAgICAgIHRyeSB7XG4gICAgICAgIGZzLmNsb3NlU3luYyhmZClcbiAgICAgIH0gY2F0Y2ggKGVyKSB7XG4gICAgICAgIGVycjIgPSBlclxuICAgICAgfVxuICAgICAgaWYgKGVyciB8fCBlcnIyKSB0aHJvdyAoZXJyIHx8IGVycjIpXG4gICAgICByZXR1cm4gcmV0XG4gICAgfVxuXG4gIH0gZWxzZSBpZiAoZnMudXRpbWVuc2F0ICYmIGNvbnN0YW50cy5oYXNPd25Qcm9wZXJ0eShcIkFUX1NZTUxJTktfTk9GT0xMT1dcIikpIHtcbiAgICAvLyBtYXliZSB1dGltZW5zYXQgd2lsbCBiZSBib3VuZCBzb29uaXNoP1xuICAgIGZzLmx1dGltZXMgPSBmdW5jdGlvbiAocGF0aCwgYXQsIG10LCBjYikge1xuICAgICAgZnMudXRpbWVuc2F0KHBhdGgsIGF0LCBtdCwgY29uc3RhbnRzLkFUX1NZTUxJTktfTk9GT0xMT1csIGNiKVxuICAgIH1cblxuICAgIGZzLmx1dGltZXNTeW5jID0gZnVuY3Rpb24gKHBhdGgsIGF0LCBtdCkge1xuICAgICAgcmV0dXJuIGZzLnV0aW1lbnNhdFN5bmMocGF0aCwgYXQsIG10LCBjb25zdGFudHMuQVRfU1lNTElOS19OT0ZPTExPVylcbiAgICB9XG5cbiAgfSBlbHNlIHtcbiAgICBmcy5sdXRpbWVzID0gZnVuY3Rpb24gKF9hLCBfYiwgX2MsIGNiKSB7IHByb2Nlc3MubmV4dFRpY2soY2IpIH1cbiAgICBmcy5sdXRpbWVzU3luYyA9IGZ1bmN0aW9uICgpIHt9XG4gIH1cbn1cblxuXG4vLyBodHRwczovL2dpdGh1Yi5jb20vaXNhYWNzL25vZGUtZ3JhY2VmdWwtZnMvaXNzdWVzLzRcbi8vIENob3duIHNob3VsZCBub3QgZmFpbCBvbiBlaW52YWwgb3IgZXBlcm0gaWYgbm9uLXJvb3QuXG4vLyBJdCBzaG91bGQgbm90IGZhaWwgb24gZW5vc3lzIGV2ZXIsIGFzIHRoaXMganVzdCBpbmRpY2F0ZXNcbi8vIHRoYXQgYSBmcyBkb2Vzbid0IHN1cHBvcnQgdGhlIGludGVuZGVkIG9wZXJhdGlvbi5cblxuZnMuY2hvd24gPSBjaG93bkZpeChmcy5jaG93bilcbmZzLmZjaG93biA9IGNob3duRml4KGZzLmZjaG93bilcbmZzLmxjaG93biA9IGNob3duRml4KGZzLmxjaG93bilcblxuZnMuY2htb2QgPSBjaG93bkZpeChmcy5jaG1vZClcbmZzLmZjaG1vZCA9IGNob3duRml4KGZzLmZjaG1vZClcbmZzLmxjaG1vZCA9IGNob3duRml4KGZzLmxjaG1vZClcblxuZnMuY2hvd25TeW5jID0gY2hvd25GaXhTeW5jKGZzLmNob3duU3luYylcbmZzLmZjaG93blN5bmMgPSBjaG93bkZpeFN5bmMoZnMuZmNob3duU3luYylcbmZzLmxjaG93blN5bmMgPSBjaG93bkZpeFN5bmMoZnMubGNob3duU3luYylcblxuZnMuY2htb2RTeW5jID0gY2hvd25GaXgoZnMuY2htb2RTeW5jKVxuZnMuZmNobW9kU3luYyA9IGNob3duRml4KGZzLmZjaG1vZFN5bmMpXG5mcy5sY2htb2RTeW5jID0gY2hvd25GaXgoZnMubGNobW9kU3luYylcblxuZnVuY3Rpb24gY2hvd25GaXggKG9yaWcpIHtcbiAgaWYgKCFvcmlnKSByZXR1cm4gb3JpZ1xuICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwgdWlkLCBnaWQsIGNiKSB7XG4gICAgcmV0dXJuIG9yaWcuY2FsbChmcywgdGFyZ2V0LCB1aWQsIGdpZCwgZnVuY3Rpb24gKGVyLCByZXMpIHtcbiAgICAgIGlmIChjaG93bkVyT2soZXIpKSBlciA9IG51bGxcbiAgICAgIGNiKGVyLCByZXMpXG4gICAgfSlcbiAgfVxufVxuXG5mdW5jdGlvbiBjaG93bkZpeFN5bmMgKG9yaWcpIHtcbiAgaWYgKCFvcmlnKSByZXR1cm4gb3JpZ1xuICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwgdWlkLCBnaWQpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIG9yaWcuY2FsbChmcywgdGFyZ2V0LCB1aWQsIGdpZClcbiAgICB9IGNhdGNoIChlcikge1xuICAgICAgaWYgKCFjaG93bkVyT2soZXIpKSB0aHJvdyBlclxuICAgIH1cbiAgfVxufVxuXG4vLyBFTk9TWVMgbWVhbnMgdGhhdCB0aGUgZnMgZG9lc24ndCBzdXBwb3J0IHRoZSBvcC4gSnVzdCBpZ25vcmVcbi8vIHRoYXQsIGJlY2F1c2UgaXQgZG9lc24ndCBtYXR0ZXIuXG4vL1xuLy8gaWYgdGhlcmUncyBubyBnZXR1aWQsIG9yIGlmIGdldHVpZCgpIGlzIHNvbWV0aGluZyBvdGhlclxuLy8gdGhhbiAwLCBhbmQgdGhlIGVycm9yIGlzIEVJTlZBTCBvciBFUEVSTSwgdGhlbiBqdXN0IGlnbm9yZVxuLy8gaXQuXG4vL1xuLy8gVGhpcyBzcGVjaWZpYyBjYXNlIGlzIGEgc2lsZW50IGZhaWx1cmUgaW4gY3AsIGluc3RhbGwsIHRhcixcbi8vIGFuZCBtb3N0IG90aGVyIHVuaXggdG9vbHMgdGhhdCBtYW5hZ2UgcGVybWlzc2lvbnMuXG4vL1xuLy8gV2hlbiBydW5uaW5nIGFzIHJvb3QsIG9yIGlmIG90aGVyIHR5cGVzIG9mIGVycm9ycyBhcmVcbi8vIGVuY291bnRlcmVkLCB0aGVuIGl0J3Mgc3RyaWN0LlxuZnVuY3Rpb24gY2hvd25Fck9rIChlcikge1xuICBpZiAoIWVyKVxuICAgIHJldHVybiB0cnVlXG5cbiAgaWYgKGVyLmNvZGUgPT09IFwiRU5PU1lTXCIpXG4gICAgcmV0dXJuIHRydWVcblxuICB2YXIgbm9ucm9vdCA9ICFwcm9jZXNzLmdldHVpZCB8fCBwcm9jZXNzLmdldHVpZCgpICE9PSAwXG4gIGlmIChub25yb290KSB7XG4gICAgaWYgKGVyLmNvZGUgPT09IFwiRUlOVkFMXCIgfHwgZXIuY29kZSA9PT0gXCJFUEVSTVwiKVxuICAgICAgcmV0dXJuIHRydWVcbiAgfVxuXG4gIHJldHVybiBmYWxzZVxufVxuXG5cbi8vIGlmIGxjaG1vZC9sY2hvd24gZG8gbm90IGV4aXN0LCB0aGVuIG1ha2UgdGhlbSBuby1vcHNcbmlmICghZnMubGNobW9kKSB7XG4gIGZzLmxjaG1vZCA9IGZ1bmN0aW9uIChwYXRoLCBtb2RlLCBjYikge1xuICAgIHByb2Nlc3MubmV4dFRpY2soY2IpXG4gIH1cbiAgZnMubGNobW9kU3luYyA9IGZ1bmN0aW9uICgpIHt9XG59XG5pZiAoIWZzLmxjaG93bikge1xuICBmcy5sY2hvd24gPSBmdW5jdGlvbiAocGF0aCwgdWlkLCBnaWQsIGNiKSB7XG4gICAgcHJvY2Vzcy5uZXh0VGljayhjYilcbiAgfVxuICBmcy5sY2hvd25TeW5jID0gZnVuY3Rpb24gKCkge31cbn1cblxuXG5cbi8vIG9uIFdpbmRvd3MsIEEvViBzb2Z0d2FyZSBjYW4gbG9jayB0aGUgZGlyZWN0b3J5LCBjYXVzaW5nIHRoaXNcbi8vIHRvIGZhaWwgd2l0aCBhbiBFQUNDRVMgb3IgRVBFUk0gaWYgdGhlIGRpcmVjdG9yeSBjb250YWlucyBuZXdseVxuLy8gY3JlYXRlZCBmaWxlcy4gIFRyeSBhZ2FpbiBvbiBmYWlsdXJlLCBmb3IgdXAgdG8gMSBzZWNvbmQuXG5pZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJ3aW4zMlwiKSB7XG4gIHZhciByZW5hbWVfID0gZnMucmVuYW1lXG4gIGZzLnJlbmFtZSA9IGZ1bmN0aW9uIHJlbmFtZSAoZnJvbSwgdG8sIGNiKSB7XG4gICAgdmFyIHN0YXJ0ID0gRGF0ZS5ub3coKVxuICAgIHJlbmFtZV8oZnJvbSwgdG8sIGZ1bmN0aW9uIENCIChlcikge1xuICAgICAgaWYgKGVyXG4gICAgICAgICAgJiYgKGVyLmNvZGUgPT09IFwiRUFDQ0VTXCIgfHwgZXIuY29kZSA9PT0gXCJFUEVSTVwiKVxuICAgICAgICAgICYmIERhdGUubm93KCkgLSBzdGFydCA8IDEwMDApIHtcbiAgICAgICAgcmV0dXJuIHJlbmFtZV8oZnJvbSwgdG8sIENCKVxuICAgICAgfVxuICAgICAgaWYoY2IpIGNiKGVyKVxuICAgIH0pXG4gIH1cbn1cblxuXG4vLyBpZiByZWFkKCkgcmV0dXJucyBFQUdBSU4sIHRoZW4ganVzdCB0cnkgaXQgYWdhaW4uXG52YXIgcmVhZCA9IGZzLnJlYWRcbmZzLnJlYWQgPSBmdW5jdGlvbiAoZmQsIGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIHBvc2l0aW9uLCBjYWxsYmFja18pIHtcbiAgdmFyIGNhbGxiYWNrXG4gIGlmIChjYWxsYmFja18gJiYgdHlwZW9mIGNhbGxiYWNrXyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHZhciBlYWdDb3VudGVyID0gMFxuICAgIGNhbGxiYWNrID0gZnVuY3Rpb24gKGVyLCBfLCBfXykge1xuICAgICAgaWYgKGVyICYmIGVyLmNvZGUgPT09ICdFQUdBSU4nICYmIGVhZ0NvdW50ZXIgPCAxMCkge1xuICAgICAgICBlYWdDb3VudGVyICsrXG4gICAgICAgIHJldHVybiByZWFkLmNhbGwoZnMsIGZkLCBidWZmZXIsIG9mZnNldCwgbGVuZ3RoLCBwb3NpdGlvbiwgY2FsbGJhY2spXG4gICAgICB9XG4gICAgICBjYWxsYmFja18uYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgIH1cbiAgfVxuICByZXR1cm4gcmVhZC5jYWxsKGZzLCBmZCwgYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgcG9zaXRpb24sIGNhbGxiYWNrKVxufVxuXG52YXIgcmVhZFN5bmMgPSBmcy5yZWFkU3luY1xuZnMucmVhZFN5bmMgPSBmdW5jdGlvbiAoZmQsIGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIHBvc2l0aW9uKSB7XG4gIHZhciBlYWdDb3VudGVyID0gMFxuICB3aGlsZSAodHJ1ZSkge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gcmVhZFN5bmMuY2FsbChmcywgZmQsIGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIHBvc2l0aW9uKVxuICAgIH0gY2F0Y2ggKGVyKSB7XG4gICAgICBpZiAoZXIuY29kZSA9PT0gJ0VBR0FJTicgJiYgZWFnQ291bnRlciA8IDEwKSB7XG4gICAgICAgIGVhZ0NvdW50ZXIgKytcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cbiAgICAgIHRocm93IGVyXG4gICAgfVxuICB9XG59XG5cbiIsImV4cG9ydHMuc2V0b3B0cyA9IHNldG9wdHNcbmV4cG9ydHMub3duUHJvcCA9IG93blByb3BcbmV4cG9ydHMubWFrZUFicyA9IG1ha2VBYnNcbmV4cG9ydHMuZmluaXNoID0gZmluaXNoXG5leHBvcnRzLm1hcmsgPSBtYXJrXG5leHBvcnRzLmlzSWdub3JlZCA9IGlzSWdub3JlZFxuZXhwb3J0cy5jaGlsZHJlbklnbm9yZWQgPSBjaGlsZHJlbklnbm9yZWRcblxuZnVuY3Rpb24gb3duUHJvcCAob2JqLCBmaWVsZCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgZmllbGQpXG59XG5cbnZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKVxudmFyIHBhdGggPSByZXF1aXJlKFwicGF0aFwiKVxudmFyIG1pbmltYXRjaCA9IHJlcXVpcmUoXCJtaW5pbWF0Y2hcIilcbnZhciBpc0Fic29sdXRlID0gcmVxdWlyZShcInBhdGgtaXMtYWJzb2x1dGVcIilcbnZhciBNaW5pbWF0Y2ggPSBtaW5pbWF0Y2guTWluaW1hdGNoXG5cbmZ1bmN0aW9uIGFscGhhc29ydCAoYSwgYikge1xuICByZXR1cm4gYS5sb2NhbGVDb21wYXJlKGIsICdlbicpXG59XG5cbmZ1bmN0aW9uIHNldHVwSWdub3JlcyAoc2VsZiwgb3B0aW9ucykge1xuICBzZWxmLmlnbm9yZSA9IG9wdGlvbnMuaWdub3JlIHx8IFtdXG5cbiAgaWYgKCFBcnJheS5pc0FycmF5KHNlbGYuaWdub3JlKSlcbiAgICBzZWxmLmlnbm9yZSA9IFtzZWxmLmlnbm9yZV1cblxuICBpZiAoc2VsZi5pZ25vcmUubGVuZ3RoKSB7XG4gICAgc2VsZi5pZ25vcmUgPSBzZWxmLmlnbm9yZS5tYXAoaWdub3JlTWFwKVxuICB9XG59XG5cbi8vIGlnbm9yZSBwYXR0ZXJucyBhcmUgYWx3YXlzIGluIGRvdDp0cnVlIG1vZGUuXG5mdW5jdGlvbiBpZ25vcmVNYXAgKHBhdHRlcm4pIHtcbiAgdmFyIGdtYXRjaGVyID0gbnVsbFxuICBpZiAocGF0dGVybi5zbGljZSgtMykgPT09ICcvKionKSB7XG4gICAgdmFyIGdwYXR0ZXJuID0gcGF0dGVybi5yZXBsYWNlKC8oXFwvXFwqXFwqKSskLywgJycpXG4gICAgZ21hdGNoZXIgPSBuZXcgTWluaW1hdGNoKGdwYXR0ZXJuLCB7IGRvdDogdHJ1ZSB9KVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBtYXRjaGVyOiBuZXcgTWluaW1hdGNoKHBhdHRlcm4sIHsgZG90OiB0cnVlIH0pLFxuICAgIGdtYXRjaGVyOiBnbWF0Y2hlclxuICB9XG59XG5cbmZ1bmN0aW9uIHNldG9wdHMgKHNlbGYsIHBhdHRlcm4sIG9wdGlvbnMpIHtcbiAgaWYgKCFvcHRpb25zKVxuICAgIG9wdGlvbnMgPSB7fVxuXG4gIC8vIGJhc2UtbWF0Y2hpbmc6IGp1c3QgdXNlIGdsb2JzdGFyIGZvciB0aGF0LlxuICBpZiAob3B0aW9ucy5tYXRjaEJhc2UgJiYgLTEgPT09IHBhdHRlcm4uaW5kZXhPZihcIi9cIikpIHtcbiAgICBpZiAob3B0aW9ucy5ub2dsb2JzdGFyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJiYXNlIG1hdGNoaW5nIHJlcXVpcmVzIGdsb2JzdGFyXCIpXG4gICAgfVxuICAgIHBhdHRlcm4gPSBcIioqL1wiICsgcGF0dGVyblxuICB9XG5cbiAgc2VsZi5zaWxlbnQgPSAhIW9wdGlvbnMuc2lsZW50XG4gIHNlbGYucGF0dGVybiA9IHBhdHRlcm5cbiAgc2VsZi5zdHJpY3QgPSBvcHRpb25zLnN0cmljdCAhPT0gZmFsc2VcbiAgc2VsZi5yZWFscGF0aCA9ICEhb3B0aW9ucy5yZWFscGF0aFxuICBzZWxmLnJlYWxwYXRoQ2FjaGUgPSBvcHRpb25zLnJlYWxwYXRoQ2FjaGUgfHwgT2JqZWN0LmNyZWF0ZShudWxsKVxuICBzZWxmLmZvbGxvdyA9ICEhb3B0aW9ucy5mb2xsb3dcbiAgc2VsZi5kb3QgPSAhIW9wdGlvbnMuZG90XG4gIHNlbGYubWFyayA9ICEhb3B0aW9ucy5tYXJrXG4gIHNlbGYubm9kaXIgPSAhIW9wdGlvbnMubm9kaXJcbiAgaWYgKHNlbGYubm9kaXIpXG4gICAgc2VsZi5tYXJrID0gdHJ1ZVxuICBzZWxmLnN5bmMgPSAhIW9wdGlvbnMuc3luY1xuICBzZWxmLm5vdW5pcXVlID0gISFvcHRpb25zLm5vdW5pcXVlXG4gIHNlbGYubm9udWxsID0gISFvcHRpb25zLm5vbnVsbFxuICBzZWxmLm5vc29ydCA9ICEhb3B0aW9ucy5ub3NvcnRcbiAgc2VsZi5ub2Nhc2UgPSAhIW9wdGlvbnMubm9jYXNlXG4gIHNlbGYuc3RhdCA9ICEhb3B0aW9ucy5zdGF0XG4gIHNlbGYubm9wcm9jZXNzID0gISFvcHRpb25zLm5vcHJvY2Vzc1xuICBzZWxmLmFic29sdXRlID0gISFvcHRpb25zLmFic29sdXRlXG4gIHNlbGYuZnMgPSBvcHRpb25zLmZzIHx8IGZzXG5cbiAgc2VsZi5tYXhMZW5ndGggPSBvcHRpb25zLm1heExlbmd0aCB8fCBJbmZpbml0eVxuICBzZWxmLmNhY2hlID0gb3B0aW9ucy5jYWNoZSB8fCBPYmplY3QuY3JlYXRlKG51bGwpXG4gIHNlbGYuc3RhdENhY2hlID0gb3B0aW9ucy5zdGF0Q2FjaGUgfHwgT2JqZWN0LmNyZWF0ZShudWxsKVxuICBzZWxmLnN5bWxpbmtzID0gb3B0aW9ucy5zeW1saW5rcyB8fCBPYmplY3QuY3JlYXRlKG51bGwpXG5cbiAgc2V0dXBJZ25vcmVzKHNlbGYsIG9wdGlvbnMpXG5cbiAgc2VsZi5jaGFuZ2VkQ3dkID0gZmFsc2VcbiAgdmFyIGN3ZCA9IHByb2Nlc3MuY3dkKClcbiAgaWYgKCFvd25Qcm9wKG9wdGlvbnMsIFwiY3dkXCIpKVxuICAgIHNlbGYuY3dkID0gY3dkXG4gIGVsc2Uge1xuICAgIHNlbGYuY3dkID0gcGF0aC5yZXNvbHZlKG9wdGlvbnMuY3dkKVxuICAgIHNlbGYuY2hhbmdlZEN3ZCA9IHNlbGYuY3dkICE9PSBjd2RcbiAgfVxuXG4gIHNlbGYucm9vdCA9IG9wdGlvbnMucm9vdCB8fCBwYXRoLnJlc29sdmUoc2VsZi5jd2QsIFwiL1wiKVxuICBzZWxmLnJvb3QgPSBwYXRoLnJlc29sdmUoc2VsZi5yb290KVxuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJ3aW4zMlwiKVxuICAgIHNlbGYucm9vdCA9IHNlbGYucm9vdC5yZXBsYWNlKC9cXFxcL2csIFwiL1wiKVxuXG4gIC8vIFRPRE86IGlzIGFuIGFic29sdXRlIGBjd2RgIHN1cHBvc2VkIHRvIGJlIHJlc29sdmVkIGFnYWluc3QgYHJvb3RgP1xuICAvLyBlLmcuIHsgY3dkOiAnL3Rlc3QnLCByb290OiBfX2Rpcm5hbWUgfSA9PT0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy90ZXN0JylcbiAgc2VsZi5jd2RBYnMgPSBpc0Fic29sdXRlKHNlbGYuY3dkKSA/IHNlbGYuY3dkIDogbWFrZUFicyhzZWxmLCBzZWxmLmN3ZClcbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09IFwid2luMzJcIilcbiAgICBzZWxmLmN3ZEFicyA9IHNlbGYuY3dkQWJzLnJlcGxhY2UoL1xcXFwvZywgXCIvXCIpXG4gIHNlbGYubm9tb3VudCA9ICEhb3B0aW9ucy5ub21vdW50XG5cbiAgLy8gZGlzYWJsZSBjb21tZW50cyBhbmQgbmVnYXRpb24gaW4gTWluaW1hdGNoLlxuICAvLyBOb3RlIHRoYXQgdGhleSBhcmUgbm90IHN1cHBvcnRlZCBpbiBHbG9iIGl0c2VsZiBhbnl3YXkuXG4gIG9wdGlvbnMubm9uZWdhdGUgPSB0cnVlXG4gIG9wdGlvbnMubm9jb21tZW50ID0gdHJ1ZVxuXG4gIHNlbGYubWluaW1hdGNoID0gbmV3IE1pbmltYXRjaChwYXR0ZXJuLCBvcHRpb25zKVxuICBzZWxmLm9wdGlvbnMgPSBzZWxmLm1pbmltYXRjaC5vcHRpb25zXG59XG5cbmZ1bmN0aW9uIGZpbmlzaCAoc2VsZikge1xuICB2YXIgbm91ID0gc2VsZi5ub3VuaXF1ZVxuICB2YXIgYWxsID0gbm91ID8gW10gOiBPYmplY3QuY3JlYXRlKG51bGwpXG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBzZWxmLm1hdGNoZXMubGVuZ3RoOyBpIDwgbDsgaSArKykge1xuICAgIHZhciBtYXRjaGVzID0gc2VsZi5tYXRjaGVzW2ldXG4gICAgaWYgKCFtYXRjaGVzIHx8IE9iamVjdC5rZXlzKG1hdGNoZXMpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgaWYgKHNlbGYubm9udWxsKSB7XG4gICAgICAgIC8vIGRvIGxpa2UgdGhlIHNoZWxsLCBhbmQgc3BpdCBvdXQgdGhlIGxpdGVyYWwgZ2xvYlxuICAgICAgICB2YXIgbGl0ZXJhbCA9IHNlbGYubWluaW1hdGNoLmdsb2JTZXRbaV1cbiAgICAgICAgaWYgKG5vdSlcbiAgICAgICAgICBhbGwucHVzaChsaXRlcmFsKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgYWxsW2xpdGVyYWxdID0gdHJ1ZVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBoYWQgbWF0Y2hlc1xuICAgICAgdmFyIG0gPSBPYmplY3Qua2V5cyhtYXRjaGVzKVxuICAgICAgaWYgKG5vdSlcbiAgICAgICAgYWxsLnB1c2guYXBwbHkoYWxsLCBtKVxuICAgICAgZWxzZVxuICAgICAgICBtLmZvckVhY2goZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgICBhbGxbbV0gPSB0cnVlXG4gICAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgaWYgKCFub3UpXG4gICAgYWxsID0gT2JqZWN0LmtleXMoYWxsKVxuXG4gIGlmICghc2VsZi5ub3NvcnQpXG4gICAgYWxsID0gYWxsLnNvcnQoYWxwaGFzb3J0KVxuXG4gIC8vIGF0ICpzb21lKiBwb2ludCB3ZSBzdGF0dGVkIGFsbCBvZiB0aGVzZVxuICBpZiAoc2VsZi5tYXJrKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhbGwubGVuZ3RoOyBpKyspIHtcbiAgICAgIGFsbFtpXSA9IHNlbGYuX21hcmsoYWxsW2ldKVxuICAgIH1cbiAgICBpZiAoc2VsZi5ub2Rpcikge1xuICAgICAgYWxsID0gYWxsLmZpbHRlcihmdW5jdGlvbiAoZSkge1xuICAgICAgICB2YXIgbm90RGlyID0gISgvXFwvJC8udGVzdChlKSlcbiAgICAgICAgdmFyIGMgPSBzZWxmLmNhY2hlW2VdIHx8IHNlbGYuY2FjaGVbbWFrZUFicyhzZWxmLCBlKV1cbiAgICAgICAgaWYgKG5vdERpciAmJiBjKVxuICAgICAgICAgIG5vdERpciA9IGMgIT09ICdESVInICYmICFBcnJheS5pc0FycmF5KGMpXG4gICAgICAgIHJldHVybiBub3REaXJcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgaWYgKHNlbGYuaWdub3JlLmxlbmd0aClcbiAgICBhbGwgPSBhbGwuZmlsdGVyKGZ1bmN0aW9uKG0pIHtcbiAgICAgIHJldHVybiAhaXNJZ25vcmVkKHNlbGYsIG0pXG4gICAgfSlcblxuICBzZWxmLmZvdW5kID0gYWxsXG59XG5cbmZ1bmN0aW9uIG1hcmsgKHNlbGYsIHApIHtcbiAgdmFyIGFicyA9IG1ha2VBYnMoc2VsZiwgcClcbiAgdmFyIGMgPSBzZWxmLmNhY2hlW2Fic11cbiAgdmFyIG0gPSBwXG4gIGlmIChjKSB7XG4gICAgdmFyIGlzRGlyID0gYyA9PT0gJ0RJUicgfHwgQXJyYXkuaXNBcnJheShjKVxuICAgIHZhciBzbGFzaCA9IHAuc2xpY2UoLTEpID09PSAnLydcblxuICAgIGlmIChpc0RpciAmJiAhc2xhc2gpXG4gICAgICBtICs9ICcvJ1xuICAgIGVsc2UgaWYgKCFpc0RpciAmJiBzbGFzaClcbiAgICAgIG0gPSBtLnNsaWNlKDAsIC0xKVxuXG4gICAgaWYgKG0gIT09IHApIHtcbiAgICAgIHZhciBtYWJzID0gbWFrZUFicyhzZWxmLCBtKVxuICAgICAgc2VsZi5zdGF0Q2FjaGVbbWFic10gPSBzZWxmLnN0YXRDYWNoZVthYnNdXG4gICAgICBzZWxmLmNhY2hlW21hYnNdID0gc2VsZi5jYWNoZVthYnNdXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG1cbn1cblxuLy8gbG90dGEgc2l0dXBzLi4uXG5mdW5jdGlvbiBtYWtlQWJzIChzZWxmLCBmKSB7XG4gIHZhciBhYnMgPSBmXG4gIGlmIChmLmNoYXJBdCgwKSA9PT0gJy8nKSB7XG4gICAgYWJzID0gcGF0aC5qb2luKHNlbGYucm9vdCwgZilcbiAgfSBlbHNlIGlmIChpc0Fic29sdXRlKGYpIHx8IGYgPT09ICcnKSB7XG4gICAgYWJzID0gZlxuICB9IGVsc2UgaWYgKHNlbGYuY2hhbmdlZEN3ZCkge1xuICAgIGFicyA9IHBhdGgucmVzb2x2ZShzZWxmLmN3ZCwgZilcbiAgfSBlbHNlIHtcbiAgICBhYnMgPSBwYXRoLnJlc29sdmUoZilcbiAgfVxuXG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInKVxuICAgIGFicyA9IGFicy5yZXBsYWNlKC9cXFxcL2csICcvJylcblxuICByZXR1cm4gYWJzXG59XG5cblxuLy8gUmV0dXJuIHRydWUsIGlmIHBhdHRlcm4gZW5kcyB3aXRoIGdsb2JzdGFyICcqKicsIGZvciB0aGUgYWNjb21wYW55aW5nIHBhcmVudCBkaXJlY3RvcnkuXG4vLyBFeDotIElmIG5vZGVfbW9kdWxlcy8qKiBpcyB0aGUgcGF0dGVybiwgYWRkICdub2RlX21vZHVsZXMnIHRvIGlnbm9yZSBsaXN0IGFsb25nIHdpdGggaXQncyBjb250ZW50c1xuZnVuY3Rpb24gaXNJZ25vcmVkIChzZWxmLCBwYXRoKSB7XG4gIGlmICghc2VsZi5pZ25vcmUubGVuZ3RoKVxuICAgIHJldHVybiBmYWxzZVxuXG4gIHJldHVybiBzZWxmLmlnbm9yZS5zb21lKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICByZXR1cm4gaXRlbS5tYXRjaGVyLm1hdGNoKHBhdGgpIHx8ICEhKGl0ZW0uZ21hdGNoZXIgJiYgaXRlbS5nbWF0Y2hlci5tYXRjaChwYXRoKSlcbiAgfSlcbn1cblxuZnVuY3Rpb24gY2hpbGRyZW5JZ25vcmVkIChzZWxmLCBwYXRoKSB7XG4gIGlmICghc2VsZi5pZ25vcmUubGVuZ3RoKVxuICAgIHJldHVybiBmYWxzZVxuXG4gIHJldHVybiBzZWxmLmlnbm9yZS5zb21lKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICByZXR1cm4gISEoaXRlbS5nbWF0Y2hlciAmJiBpdGVtLmdtYXRjaGVyLm1hdGNoKHBhdGgpKVxuICB9KVxufVxuIiwiLy8gQXBwcm9hY2g6XG4vL1xuLy8gMS4gR2V0IHRoZSBtaW5pbWF0Y2ggc2V0XG4vLyAyLiBGb3IgZWFjaCBwYXR0ZXJuIGluIHRoZSBzZXQsIFBST0NFU1MocGF0dGVybiwgZmFsc2UpXG4vLyAzLiBTdG9yZSBtYXRjaGVzIHBlci1zZXQsIHRoZW4gdW5pcSB0aGVtXG4vL1xuLy8gUFJPQ0VTUyhwYXR0ZXJuLCBpbkdsb2JTdGFyKVxuLy8gR2V0IHRoZSBmaXJzdCBbbl0gaXRlbXMgZnJvbSBwYXR0ZXJuIHRoYXQgYXJlIGFsbCBzdHJpbmdzXG4vLyBKb2luIHRoZXNlIHRvZ2V0aGVyLiAgVGhpcyBpcyBQUkVGSVguXG4vLyAgIElmIHRoZXJlIGlzIG5vIG1vcmUgcmVtYWluaW5nLCB0aGVuIHN0YXQoUFJFRklYKSBhbmRcbi8vICAgYWRkIHRvIG1hdGNoZXMgaWYgaXQgc3VjY2VlZHMuICBFTkQuXG4vL1xuLy8gSWYgaW5HbG9iU3RhciBhbmQgUFJFRklYIGlzIHN5bWxpbmsgYW5kIHBvaW50cyB0byBkaXJcbi8vICAgc2V0IEVOVFJJRVMgPSBbXVxuLy8gZWxzZSByZWFkZGlyKFBSRUZJWCkgYXMgRU5UUklFU1xuLy8gICBJZiBmYWlsLCBFTkRcbi8vXG4vLyB3aXRoIEVOVFJJRVNcbi8vICAgSWYgcGF0dGVybltuXSBpcyBHTE9CU1RBUlxuLy8gICAgIC8vIGhhbmRsZSB0aGUgY2FzZSB3aGVyZSB0aGUgZ2xvYnN0YXIgbWF0Y2ggaXMgZW1wdHlcbi8vICAgICAvLyBieSBwcnVuaW5nIGl0IG91dCwgYW5kIHRlc3RpbmcgdGhlIHJlc3VsdGluZyBwYXR0ZXJuXG4vLyAgICAgUFJPQ0VTUyhwYXR0ZXJuWzAuLm5dICsgcGF0dGVybltuKzEgLi4gJF0sIGZhbHNlKVxuLy8gICAgIC8vIGhhbmRsZSBvdGhlciBjYXNlcy5cbi8vICAgICBmb3IgRU5UUlkgaW4gRU5UUklFUyAobm90IGRvdGZpbGVzKVxuLy8gICAgICAgLy8gYXR0YWNoIGdsb2JzdGFyICsgdGFpbCBvbnRvIHRoZSBlbnRyeVxuLy8gICAgICAgLy8gTWFyayB0aGF0IHRoaXMgZW50cnkgaXMgYSBnbG9ic3RhciBtYXRjaFxuLy8gICAgICAgUFJPQ0VTUyhwYXR0ZXJuWzAuLm5dICsgRU5UUlkgKyBwYXR0ZXJuW24gLi4gJF0sIHRydWUpXG4vL1xuLy8gICBlbHNlIC8vIG5vdCBnbG9ic3RhclxuLy8gICAgIGZvciBFTlRSWSBpbiBFTlRSSUVTIChub3QgZG90ZmlsZXMsIHVubGVzcyBwYXR0ZXJuW25dIGlzIGRvdClcbi8vICAgICAgIFRlc3QgRU5UUlkgYWdhaW5zdCBwYXR0ZXJuW25dXG4vLyAgICAgICBJZiBmYWlscywgY29udGludWVcbi8vICAgICAgIElmIHBhc3NlcywgUFJPQ0VTUyhwYXR0ZXJuWzAuLm5dICsgaXRlbSArIHBhdHRlcm5bbisxIC4uICRdKVxuLy9cbi8vIENhdmVhdDpcbi8vICAgQ2FjaGUgYWxsIHN0YXRzIGFuZCByZWFkZGlycyByZXN1bHRzIHRvIG1pbmltaXplIHN5c2NhbGwuICBTaW5jZSBhbGxcbi8vICAgd2UgZXZlciBjYXJlIGFib3V0IGlzIGV4aXN0ZW5jZSBhbmQgZGlyZWN0b3J5LW5lc3MsIHdlIGNhbiBqdXN0IGtlZXBcbi8vICAgYHRydWVgIGZvciBmaWxlcywgYW5kIFtjaGlsZHJlbiwuLi5dIGZvciBkaXJlY3Rvcmllcywgb3IgYGZhbHNlYCBmb3Jcbi8vICAgdGhpbmdzIHRoYXQgZG9uJ3QgZXhpc3QuXG5cbm1vZHVsZS5leHBvcnRzID0gZ2xvYlxuXG52YXIgcnAgPSByZXF1aXJlKCdmcy5yZWFscGF0aCcpXG52YXIgbWluaW1hdGNoID0gcmVxdWlyZSgnbWluaW1hdGNoJylcbnZhciBNaW5pbWF0Y2ggPSBtaW5pbWF0Y2guTWluaW1hdGNoXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpXG52YXIgRUUgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXJcbnZhciBwYXRoID0gcmVxdWlyZSgncGF0aCcpXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JylcbnZhciBpc0Fic29sdXRlID0gcmVxdWlyZSgncGF0aC1pcy1hYnNvbHV0ZScpXG52YXIgZ2xvYlN5bmMgPSByZXF1aXJlKCcuL3N5bmMuanMnKVxudmFyIGNvbW1vbiA9IHJlcXVpcmUoJy4vY29tbW9uLmpzJylcbnZhciBzZXRvcHRzID0gY29tbW9uLnNldG9wdHNcbnZhciBvd25Qcm9wID0gY29tbW9uLm93blByb3BcbnZhciBpbmZsaWdodCA9IHJlcXVpcmUoJ2luZmxpZ2h0JylcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpXG52YXIgY2hpbGRyZW5JZ25vcmVkID0gY29tbW9uLmNoaWxkcmVuSWdub3JlZFxudmFyIGlzSWdub3JlZCA9IGNvbW1vbi5pc0lnbm9yZWRcblxudmFyIG9uY2UgPSByZXF1aXJlKCdvbmNlJylcblxuZnVuY3Rpb24gZ2xvYiAocGF0dGVybiwgb3B0aW9ucywgY2IpIHtcbiAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSBjYiA9IG9wdGlvbnMsIG9wdGlvbnMgPSB7fVxuICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fVxuXG4gIGlmIChvcHRpb25zLnN5bmMpIHtcbiAgICBpZiAoY2IpXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdjYWxsYmFjayBwcm92aWRlZCB0byBzeW5jIGdsb2InKVxuICAgIHJldHVybiBnbG9iU3luYyhwYXR0ZXJuLCBvcHRpb25zKVxuICB9XG5cbiAgcmV0dXJuIG5ldyBHbG9iKHBhdHRlcm4sIG9wdGlvbnMsIGNiKVxufVxuXG5nbG9iLnN5bmMgPSBnbG9iU3luY1xudmFyIEdsb2JTeW5jID0gZ2xvYi5HbG9iU3luYyA9IGdsb2JTeW5jLkdsb2JTeW5jXG5cbi8vIG9sZCBhcGkgc3VyZmFjZVxuZ2xvYi5nbG9iID0gZ2xvYlxuXG5mdW5jdGlvbiBleHRlbmQgKG9yaWdpbiwgYWRkKSB7XG4gIGlmIChhZGQgPT09IG51bGwgfHwgdHlwZW9mIGFkZCAhPT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gb3JpZ2luXG4gIH1cblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZClcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aFxuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dXG4gIH1cbiAgcmV0dXJuIG9yaWdpblxufVxuXG5nbG9iLmhhc01hZ2ljID0gZnVuY3Rpb24gKHBhdHRlcm4sIG9wdGlvbnNfKSB7XG4gIHZhciBvcHRpb25zID0gZXh0ZW5kKHt9LCBvcHRpb25zXylcbiAgb3B0aW9ucy5ub3Byb2Nlc3MgPSB0cnVlXG5cbiAgdmFyIGcgPSBuZXcgR2xvYihwYXR0ZXJuLCBvcHRpb25zKVxuICB2YXIgc2V0ID0gZy5taW5pbWF0Y2guc2V0XG5cbiAgaWYgKCFwYXR0ZXJuKVxuICAgIHJldHVybiBmYWxzZVxuXG4gIGlmIChzZXQubGVuZ3RoID4gMSlcbiAgICByZXR1cm4gdHJ1ZVxuXG4gIGZvciAodmFyIGogPSAwOyBqIDwgc2V0WzBdLmxlbmd0aDsgaisrKSB7XG4gICAgaWYgKHR5cGVvZiBzZXRbMF1bal0gIT09ICdzdHJpbmcnKVxuICAgICAgcmV0dXJuIHRydWVcbiAgfVxuXG4gIHJldHVybiBmYWxzZVxufVxuXG5nbG9iLkdsb2IgPSBHbG9iXG5pbmhlcml0cyhHbG9iLCBFRSlcbmZ1bmN0aW9uIEdsb2IgKHBhdHRlcm4sIG9wdGlvbnMsIGNiKSB7XG4gIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGNiID0gb3B0aW9uc1xuICAgIG9wdGlvbnMgPSBudWxsXG4gIH1cblxuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLnN5bmMpIHtcbiAgICBpZiAoY2IpXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdjYWxsYmFjayBwcm92aWRlZCB0byBzeW5jIGdsb2InKVxuICAgIHJldHVybiBuZXcgR2xvYlN5bmMocGF0dGVybiwgb3B0aW9ucylcbiAgfVxuXG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBHbG9iKSlcbiAgICByZXR1cm4gbmV3IEdsb2IocGF0dGVybiwgb3B0aW9ucywgY2IpXG5cbiAgc2V0b3B0cyh0aGlzLCBwYXR0ZXJuLCBvcHRpb25zKVxuICB0aGlzLl9kaWRSZWFsUGF0aCA9IGZhbHNlXG5cbiAgLy8gcHJvY2VzcyBlYWNoIHBhdHRlcm4gaW4gdGhlIG1pbmltYXRjaCBzZXRcbiAgdmFyIG4gPSB0aGlzLm1pbmltYXRjaC5zZXQubGVuZ3RoXG5cbiAgLy8gVGhlIG1hdGNoZXMgYXJlIHN0b3JlZCBhcyB7PGZpbGVuYW1lPjogdHJ1ZSwuLi59IHNvIHRoYXRcbiAgLy8gZHVwbGljYXRlcyBhcmUgYXV0b21hZ2ljYWxseSBwcnVuZWQuXG4gIC8vIExhdGVyLCB3ZSBkbyBhbiBPYmplY3Qua2V5cygpIG9uIHRoZXNlLlxuICAvLyBLZWVwIHRoZW0gYXMgYSBsaXN0IHNvIHdlIGNhbiBmaWxsIGluIHdoZW4gbm9udWxsIGlzIHNldC5cbiAgdGhpcy5tYXRjaGVzID0gbmV3IEFycmF5KG4pXG5cbiAgaWYgKHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGNiID0gb25jZShjYilcbiAgICB0aGlzLm9uKCdlcnJvcicsIGNiKVxuICAgIHRoaXMub24oJ2VuZCcsIGZ1bmN0aW9uIChtYXRjaGVzKSB7XG4gICAgICBjYihudWxsLCBtYXRjaGVzKVxuICAgIH0pXG4gIH1cblxuICB2YXIgc2VsZiA9IHRoaXNcbiAgdGhpcy5fcHJvY2Vzc2luZyA9IDBcblxuICB0aGlzLl9lbWl0UXVldWUgPSBbXVxuICB0aGlzLl9wcm9jZXNzUXVldWUgPSBbXVxuICB0aGlzLnBhdXNlZCA9IGZhbHNlXG5cbiAgaWYgKHRoaXMubm9wcm9jZXNzKVxuICAgIHJldHVybiB0aGlzXG5cbiAgaWYgKG4gPT09IDApXG4gICAgcmV0dXJuIGRvbmUoKVxuXG4gIHZhciBzeW5jID0gdHJ1ZVxuICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkgKyspIHtcbiAgICB0aGlzLl9wcm9jZXNzKHRoaXMubWluaW1hdGNoLnNldFtpXSwgaSwgZmFsc2UsIGRvbmUpXG4gIH1cbiAgc3luYyA9IGZhbHNlXG5cbiAgZnVuY3Rpb24gZG9uZSAoKSB7XG4gICAgLS1zZWxmLl9wcm9jZXNzaW5nXG4gICAgaWYgKHNlbGYuX3Byb2Nlc3NpbmcgPD0gMCkge1xuICAgICAgaWYgKHN5bmMpIHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgc2VsZi5fZmluaXNoKClcbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYuX2ZpbmlzaCgpXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbkdsb2IucHJvdG90eXBlLl9maW5pc2ggPSBmdW5jdGlvbiAoKSB7XG4gIGFzc2VydCh0aGlzIGluc3RhbmNlb2YgR2xvYilcbiAgaWYgKHRoaXMuYWJvcnRlZClcbiAgICByZXR1cm5cblxuICBpZiAodGhpcy5yZWFscGF0aCAmJiAhdGhpcy5fZGlkUmVhbHBhdGgpXG4gICAgcmV0dXJuIHRoaXMuX3JlYWxwYXRoKClcblxuICBjb21tb24uZmluaXNoKHRoaXMpXG4gIHRoaXMuZW1pdCgnZW5kJywgdGhpcy5mb3VuZClcbn1cblxuR2xvYi5wcm90b3R5cGUuX3JlYWxwYXRoID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5fZGlkUmVhbHBhdGgpXG4gICAgcmV0dXJuXG5cbiAgdGhpcy5fZGlkUmVhbHBhdGggPSB0cnVlXG5cbiAgdmFyIG4gPSB0aGlzLm1hdGNoZXMubGVuZ3RoXG4gIGlmIChuID09PSAwKVxuICAgIHJldHVybiB0aGlzLl9maW5pc2goKVxuXG4gIHZhciBzZWxmID0gdGhpc1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubWF0Y2hlcy5sZW5ndGg7IGkrKylcbiAgICB0aGlzLl9yZWFscGF0aFNldChpLCBuZXh0KVxuXG4gIGZ1bmN0aW9uIG5leHQgKCkge1xuICAgIGlmICgtLW4gPT09IDApXG4gICAgICBzZWxmLl9maW5pc2goKVxuICB9XG59XG5cbkdsb2IucHJvdG90eXBlLl9yZWFscGF0aFNldCA9IGZ1bmN0aW9uIChpbmRleCwgY2IpIHtcbiAgdmFyIG1hdGNoc2V0ID0gdGhpcy5tYXRjaGVzW2luZGV4XVxuICBpZiAoIW1hdGNoc2V0KVxuICAgIHJldHVybiBjYigpXG5cbiAgdmFyIGZvdW5kID0gT2JqZWN0LmtleXMobWF0Y2hzZXQpXG4gIHZhciBzZWxmID0gdGhpc1xuICB2YXIgbiA9IGZvdW5kLmxlbmd0aFxuXG4gIGlmIChuID09PSAwKVxuICAgIHJldHVybiBjYigpXG5cbiAgdmFyIHNldCA9IHRoaXMubWF0Y2hlc1tpbmRleF0gPSBPYmplY3QuY3JlYXRlKG51bGwpXG4gIGZvdW5kLmZvckVhY2goZnVuY3Rpb24gKHAsIGkpIHtcbiAgICAvLyBJZiB0aGVyZSdzIGEgcHJvYmxlbSB3aXRoIHRoZSBzdGF0LCB0aGVuIGl0IG1lYW5zIHRoYXRcbiAgICAvLyBvbmUgb3IgbW9yZSBvZiB0aGUgbGlua3MgaW4gdGhlIHJlYWxwYXRoIGNvdWxkbid0IGJlXG4gICAgLy8gcmVzb2x2ZWQuICBqdXN0IHJldHVybiB0aGUgYWJzIHZhbHVlIGluIHRoYXQgY2FzZS5cbiAgICBwID0gc2VsZi5fbWFrZUFicyhwKVxuICAgIHJwLnJlYWxwYXRoKHAsIHNlbGYucmVhbHBhdGhDYWNoZSwgZnVuY3Rpb24gKGVyLCByZWFsKSB7XG4gICAgICBpZiAoIWVyKVxuICAgICAgICBzZXRbcmVhbF0gPSB0cnVlXG4gICAgICBlbHNlIGlmIChlci5zeXNjYWxsID09PSAnc3RhdCcpXG4gICAgICAgIHNldFtwXSA9IHRydWVcbiAgICAgIGVsc2VcbiAgICAgICAgc2VsZi5lbWl0KCdlcnJvcicsIGVyKSAvLyBzcnNseSB3dGYgcmlnaHQgaGVyZVxuXG4gICAgICBpZiAoLS1uID09PSAwKSB7XG4gICAgICAgIHNlbGYubWF0Y2hlc1tpbmRleF0gPSBzZXRcbiAgICAgICAgY2IoKVxuICAgICAgfVxuICAgIH0pXG4gIH0pXG59XG5cbkdsb2IucHJvdG90eXBlLl9tYXJrID0gZnVuY3Rpb24gKHApIHtcbiAgcmV0dXJuIGNvbW1vbi5tYXJrKHRoaXMsIHApXG59XG5cbkdsb2IucHJvdG90eXBlLl9tYWtlQWJzID0gZnVuY3Rpb24gKGYpIHtcbiAgcmV0dXJuIGNvbW1vbi5tYWtlQWJzKHRoaXMsIGYpXG59XG5cbkdsb2IucHJvdG90eXBlLmFib3J0ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmFib3J0ZWQgPSB0cnVlXG4gIHRoaXMuZW1pdCgnYWJvcnQnKVxufVxuXG5HbG9iLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKCF0aGlzLnBhdXNlZCkge1xuICAgIHRoaXMucGF1c2VkID0gdHJ1ZVxuICAgIHRoaXMuZW1pdCgncGF1c2UnKVxuICB9XG59XG5cbkdsb2IucHJvdG90eXBlLnJlc3VtZSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMucGF1c2VkKSB7XG4gICAgdGhpcy5lbWl0KCdyZXN1bWUnKVxuICAgIHRoaXMucGF1c2VkID0gZmFsc2VcbiAgICBpZiAodGhpcy5fZW1pdFF1ZXVlLmxlbmd0aCkge1xuICAgICAgdmFyIGVxID0gdGhpcy5fZW1pdFF1ZXVlLnNsaWNlKDApXG4gICAgICB0aGlzLl9lbWl0UXVldWUubGVuZ3RoID0gMFxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlcS5sZW5ndGg7IGkgKyspIHtcbiAgICAgICAgdmFyIGUgPSBlcVtpXVxuICAgICAgICB0aGlzLl9lbWl0TWF0Y2goZVswXSwgZVsxXSlcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMuX3Byb2Nlc3NRdWV1ZS5sZW5ndGgpIHtcbiAgICAgIHZhciBwcSA9IHRoaXMuX3Byb2Nlc3NRdWV1ZS5zbGljZSgwKVxuICAgICAgdGhpcy5fcHJvY2Vzc1F1ZXVlLmxlbmd0aCA9IDBcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHEubGVuZ3RoOyBpICsrKSB7XG4gICAgICAgIHZhciBwID0gcHFbaV1cbiAgICAgICAgdGhpcy5fcHJvY2Vzc2luZy0tXG4gICAgICAgIHRoaXMuX3Byb2Nlc3MocFswXSwgcFsxXSwgcFsyXSwgcFszXSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuR2xvYi5wcm90b3R5cGUuX3Byb2Nlc3MgPSBmdW5jdGlvbiAocGF0dGVybiwgaW5kZXgsIGluR2xvYlN0YXIsIGNiKSB7XG4gIGFzc2VydCh0aGlzIGluc3RhbmNlb2YgR2xvYilcbiAgYXNzZXJ0KHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJylcblxuICBpZiAodGhpcy5hYm9ydGVkKVxuICAgIHJldHVyblxuXG4gIHRoaXMuX3Byb2Nlc3NpbmcrK1xuICBpZiAodGhpcy5wYXVzZWQpIHtcbiAgICB0aGlzLl9wcm9jZXNzUXVldWUucHVzaChbcGF0dGVybiwgaW5kZXgsIGluR2xvYlN0YXIsIGNiXSlcbiAgICByZXR1cm5cbiAgfVxuXG4gIC8vY29uc29sZS5lcnJvcignUFJPQ0VTUyAlZCcsIHRoaXMuX3Byb2Nlc3NpbmcsIHBhdHRlcm4pXG5cbiAgLy8gR2V0IHRoZSBmaXJzdCBbbl0gcGFydHMgb2YgcGF0dGVybiB0aGF0IGFyZSBhbGwgc3RyaW5ncy5cbiAgdmFyIG4gPSAwXG4gIHdoaWxlICh0eXBlb2YgcGF0dGVybltuXSA9PT0gJ3N0cmluZycpIHtcbiAgICBuICsrXG4gIH1cbiAgLy8gbm93IG4gaXMgdGhlIGluZGV4IG9mIHRoZSBmaXJzdCBvbmUgdGhhdCBpcyAqbm90KiBhIHN0cmluZy5cblxuICAvLyBzZWUgaWYgdGhlcmUncyBhbnl0aGluZyBlbHNlXG4gIHZhciBwcmVmaXhcbiAgc3dpdGNoIChuKSB7XG4gICAgLy8gaWYgbm90LCB0aGVuIHRoaXMgaXMgcmF0aGVyIHNpbXBsZVxuICAgIGNhc2UgcGF0dGVybi5sZW5ndGg6XG4gICAgICB0aGlzLl9wcm9jZXNzU2ltcGxlKHBhdHRlcm4uam9pbignLycpLCBpbmRleCwgY2IpXG4gICAgICByZXR1cm5cblxuICAgIGNhc2UgMDpcbiAgICAgIC8vIHBhdHRlcm4gKnN0YXJ0cyogd2l0aCBzb21lIG5vbi10cml2aWFsIGl0ZW0uXG4gICAgICAvLyBnb2luZyB0byByZWFkZGlyKGN3ZCksIGJ1dCBub3QgaW5jbHVkZSB0aGUgcHJlZml4IGluIG1hdGNoZXMuXG4gICAgICBwcmVmaXggPSBudWxsXG4gICAgICBicmVha1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIC8vIHBhdHRlcm4gaGFzIHNvbWUgc3RyaW5nIGJpdHMgaW4gdGhlIGZyb250LlxuICAgICAgLy8gd2hhdGV2ZXIgaXQgc3RhcnRzIHdpdGgsIHdoZXRoZXIgdGhhdCdzICdhYnNvbHV0ZScgbGlrZSAvZm9vL2JhcixcbiAgICAgIC8vIG9yICdyZWxhdGl2ZScgbGlrZSAnLi4vYmF6J1xuICAgICAgcHJlZml4ID0gcGF0dGVybi5zbGljZSgwLCBuKS5qb2luKCcvJylcbiAgICAgIGJyZWFrXG4gIH1cblxuICB2YXIgcmVtYWluID0gcGF0dGVybi5zbGljZShuKVxuXG4gIC8vIGdldCB0aGUgbGlzdCBvZiBlbnRyaWVzLlxuICB2YXIgcmVhZFxuICBpZiAocHJlZml4ID09PSBudWxsKVxuICAgIHJlYWQgPSAnLidcbiAgZWxzZSBpZiAoaXNBYnNvbHV0ZShwcmVmaXgpIHx8IGlzQWJzb2x1dGUocGF0dGVybi5qb2luKCcvJykpKSB7XG4gICAgaWYgKCFwcmVmaXggfHwgIWlzQWJzb2x1dGUocHJlZml4KSlcbiAgICAgIHByZWZpeCA9ICcvJyArIHByZWZpeFxuICAgIHJlYWQgPSBwcmVmaXhcbiAgfSBlbHNlXG4gICAgcmVhZCA9IHByZWZpeFxuXG4gIHZhciBhYnMgPSB0aGlzLl9tYWtlQWJzKHJlYWQpXG5cbiAgLy9pZiBpZ25vcmVkLCBza2lwIF9wcm9jZXNzaW5nXG4gIGlmIChjaGlsZHJlbklnbm9yZWQodGhpcywgcmVhZCkpXG4gICAgcmV0dXJuIGNiKClcblxuICB2YXIgaXNHbG9iU3RhciA9IHJlbWFpblswXSA9PT0gbWluaW1hdGNoLkdMT0JTVEFSXG4gIGlmIChpc0dsb2JTdGFyKVxuICAgIHRoaXMuX3Byb2Nlc3NHbG9iU3RhcihwcmVmaXgsIHJlYWQsIGFicywgcmVtYWluLCBpbmRleCwgaW5HbG9iU3RhciwgY2IpXG4gIGVsc2VcbiAgICB0aGlzLl9wcm9jZXNzUmVhZGRpcihwcmVmaXgsIHJlYWQsIGFicywgcmVtYWluLCBpbmRleCwgaW5HbG9iU3RhciwgY2IpXG59XG5cbkdsb2IucHJvdG90eXBlLl9wcm9jZXNzUmVhZGRpciA9IGZ1bmN0aW9uIChwcmVmaXgsIHJlYWQsIGFicywgcmVtYWluLCBpbmRleCwgaW5HbG9iU3RhciwgY2IpIHtcbiAgdmFyIHNlbGYgPSB0aGlzXG4gIHRoaXMuX3JlYWRkaXIoYWJzLCBpbkdsb2JTdGFyLCBmdW5jdGlvbiAoZXIsIGVudHJpZXMpIHtcbiAgICByZXR1cm4gc2VsZi5fcHJvY2Vzc1JlYWRkaXIyKHByZWZpeCwgcmVhZCwgYWJzLCByZW1haW4sIGluZGV4LCBpbkdsb2JTdGFyLCBlbnRyaWVzLCBjYilcbiAgfSlcbn1cblxuR2xvYi5wcm90b3R5cGUuX3Byb2Nlc3NSZWFkZGlyMiA9IGZ1bmN0aW9uIChwcmVmaXgsIHJlYWQsIGFicywgcmVtYWluLCBpbmRleCwgaW5HbG9iU3RhciwgZW50cmllcywgY2IpIHtcblxuICAvLyBpZiB0aGUgYWJzIGlzbid0IGEgZGlyLCB0aGVuIG5vdGhpbmcgY2FuIG1hdGNoIVxuICBpZiAoIWVudHJpZXMpXG4gICAgcmV0dXJuIGNiKClcblxuICAvLyBJdCB3aWxsIG9ubHkgbWF0Y2ggZG90IGVudHJpZXMgaWYgaXQgc3RhcnRzIHdpdGggYSBkb3QsIG9yIGlmXG4gIC8vIGRvdCBpcyBzZXQuICBTdHVmZiBsaWtlIEAoLmZvb3wuYmFyKSBpc24ndCBhbGxvd2VkLlxuICB2YXIgcG4gPSByZW1haW5bMF1cbiAgdmFyIG5lZ2F0ZSA9ICEhdGhpcy5taW5pbWF0Y2gubmVnYXRlXG4gIHZhciByYXdHbG9iID0gcG4uX2dsb2JcbiAgdmFyIGRvdE9rID0gdGhpcy5kb3QgfHwgcmF3R2xvYi5jaGFyQXQoMCkgPT09ICcuJ1xuXG4gIHZhciBtYXRjaGVkRW50cmllcyA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZW50cmllcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBlID0gZW50cmllc1tpXVxuICAgIGlmIChlLmNoYXJBdCgwKSAhPT0gJy4nIHx8IGRvdE9rKSB7XG4gICAgICB2YXIgbVxuICAgICAgaWYgKG5lZ2F0ZSAmJiAhcHJlZml4KSB7XG4gICAgICAgIG0gPSAhZS5tYXRjaChwbilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG0gPSBlLm1hdGNoKHBuKVxuICAgICAgfVxuICAgICAgaWYgKG0pXG4gICAgICAgIG1hdGNoZWRFbnRyaWVzLnB1c2goZSlcbiAgICB9XG4gIH1cblxuICAvL2NvbnNvbGUuZXJyb3IoJ3ByZDInLCBwcmVmaXgsIGVudHJpZXMsIHJlbWFpblswXS5fZ2xvYiwgbWF0Y2hlZEVudHJpZXMpXG5cbiAgdmFyIGxlbiA9IG1hdGNoZWRFbnRyaWVzLmxlbmd0aFxuICAvLyBJZiB0aGVyZSBhcmUgbm8gbWF0Y2hlZCBlbnRyaWVzLCB0aGVuIG5vdGhpbmcgbWF0Y2hlcy5cbiAgaWYgKGxlbiA9PT0gMClcbiAgICByZXR1cm4gY2IoKVxuXG4gIC8vIGlmIHRoaXMgaXMgdGhlIGxhc3QgcmVtYWluaW5nIHBhdHRlcm4gYml0LCB0aGVuIG5vIG5lZWQgZm9yXG4gIC8vIGFuIGFkZGl0aW9uYWwgc3RhdCAqdW5sZXNzKiB0aGUgdXNlciBoYXMgc3BlY2lmaWVkIG1hcmsgb3JcbiAgLy8gc3RhdCBleHBsaWNpdGx5LiAgV2Uga25vdyB0aGV5IGV4aXN0LCBzaW5jZSByZWFkZGlyIHJldHVybmVkXG4gIC8vIHRoZW0uXG5cbiAgaWYgKHJlbWFpbi5sZW5ndGggPT09IDEgJiYgIXRoaXMubWFyayAmJiAhdGhpcy5zdGF0KSB7XG4gICAgaWYgKCF0aGlzLm1hdGNoZXNbaW5kZXhdKVxuICAgICAgdGhpcy5tYXRjaGVzW2luZGV4XSA9IE9iamVjdC5jcmVhdGUobnVsbClcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICsrKSB7XG4gICAgICB2YXIgZSA9IG1hdGNoZWRFbnRyaWVzW2ldXG4gICAgICBpZiAocHJlZml4KSB7XG4gICAgICAgIGlmIChwcmVmaXggIT09ICcvJylcbiAgICAgICAgICBlID0gcHJlZml4ICsgJy8nICsgZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgZSA9IHByZWZpeCArIGVcbiAgICAgIH1cblxuICAgICAgaWYgKGUuY2hhckF0KDApID09PSAnLycgJiYgIXRoaXMubm9tb3VudCkge1xuICAgICAgICBlID0gcGF0aC5qb2luKHRoaXMucm9vdCwgZSlcbiAgICAgIH1cbiAgICAgIHRoaXMuX2VtaXRNYXRjaChpbmRleCwgZSlcbiAgICB9XG4gICAgLy8gVGhpcyB3YXMgdGhlIGxhc3Qgb25lLCBhbmQgbm8gc3RhdHMgd2VyZSBuZWVkZWRcbiAgICByZXR1cm4gY2IoKVxuICB9XG5cbiAgLy8gbm93IHRlc3QgYWxsIG1hdGNoZWQgZW50cmllcyBhcyBzdGFuZC1pbnMgZm9yIHRoYXQgcGFydFxuICAvLyBvZiB0aGUgcGF0dGVybi5cbiAgcmVtYWluLnNoaWZ0KClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKyspIHtcbiAgICB2YXIgZSA9IG1hdGNoZWRFbnRyaWVzW2ldXG4gICAgdmFyIG5ld1BhdHRlcm5cbiAgICBpZiAocHJlZml4KSB7XG4gICAgICBpZiAocHJlZml4ICE9PSAnLycpXG4gICAgICAgIGUgPSBwcmVmaXggKyAnLycgKyBlXG4gICAgICBlbHNlXG4gICAgICAgIGUgPSBwcmVmaXggKyBlXG4gICAgfVxuICAgIHRoaXMuX3Byb2Nlc3MoW2VdLmNvbmNhdChyZW1haW4pLCBpbmRleCwgaW5HbG9iU3RhciwgY2IpXG4gIH1cbiAgY2IoKVxufVxuXG5HbG9iLnByb3RvdHlwZS5fZW1pdE1hdGNoID0gZnVuY3Rpb24gKGluZGV4LCBlKSB7XG4gIGlmICh0aGlzLmFib3J0ZWQpXG4gICAgcmV0dXJuXG5cbiAgaWYgKGlzSWdub3JlZCh0aGlzLCBlKSlcbiAgICByZXR1cm5cblxuICBpZiAodGhpcy5wYXVzZWQpIHtcbiAgICB0aGlzLl9lbWl0UXVldWUucHVzaChbaW5kZXgsIGVdKVxuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIGFicyA9IGlzQWJzb2x1dGUoZSkgPyBlIDogdGhpcy5fbWFrZUFicyhlKVxuXG4gIGlmICh0aGlzLm1hcmspXG4gICAgZSA9IHRoaXMuX21hcmsoZSlcblxuICBpZiAodGhpcy5hYnNvbHV0ZSlcbiAgICBlID0gYWJzXG5cbiAgaWYgKHRoaXMubWF0Y2hlc1tpbmRleF1bZV0pXG4gICAgcmV0dXJuXG5cbiAgaWYgKHRoaXMubm9kaXIpIHtcbiAgICB2YXIgYyA9IHRoaXMuY2FjaGVbYWJzXVxuICAgIGlmIChjID09PSAnRElSJyB8fCBBcnJheS5pc0FycmF5KGMpKVxuICAgICAgcmV0dXJuXG4gIH1cblxuICB0aGlzLm1hdGNoZXNbaW5kZXhdW2VdID0gdHJ1ZVxuXG4gIHZhciBzdCA9IHRoaXMuc3RhdENhY2hlW2Fic11cbiAgaWYgKHN0KVxuICAgIHRoaXMuZW1pdCgnc3RhdCcsIGUsIHN0KVxuXG4gIHRoaXMuZW1pdCgnbWF0Y2gnLCBlKVxufVxuXG5HbG9iLnByb3RvdHlwZS5fcmVhZGRpckluR2xvYlN0YXIgPSBmdW5jdGlvbiAoYWJzLCBjYikge1xuICBpZiAodGhpcy5hYm9ydGVkKVxuICAgIHJldHVyblxuXG4gIC8vIGZvbGxvdyBhbGwgc3ltbGlua2VkIGRpcmVjdG9yaWVzIGZvcmV2ZXJcbiAgLy8ganVzdCBwcm9jZWVkIGFzIGlmIHRoaXMgaXMgYSBub24tZ2xvYnN0YXIgc2l0dWF0aW9uXG4gIGlmICh0aGlzLmZvbGxvdylcbiAgICByZXR1cm4gdGhpcy5fcmVhZGRpcihhYnMsIGZhbHNlLCBjYilcblxuICB2YXIgbHN0YXRrZXkgPSAnbHN0YXRcXDAnICsgYWJzXG4gIHZhciBzZWxmID0gdGhpc1xuICB2YXIgbHN0YXRjYiA9IGluZmxpZ2h0KGxzdGF0a2V5LCBsc3RhdGNiXylcblxuICBpZiAobHN0YXRjYilcbiAgICBzZWxmLmZzLmxzdGF0KGFicywgbHN0YXRjYilcblxuICBmdW5jdGlvbiBsc3RhdGNiXyAoZXIsIGxzdGF0KSB7XG4gICAgaWYgKGVyICYmIGVyLmNvZGUgPT09ICdFTk9FTlQnKVxuICAgICAgcmV0dXJuIGNiKClcblxuICAgIHZhciBpc1N5bSA9IGxzdGF0ICYmIGxzdGF0LmlzU3ltYm9saWNMaW5rKClcbiAgICBzZWxmLnN5bWxpbmtzW2Fic10gPSBpc1N5bVxuXG4gICAgLy8gSWYgaXQncyBub3QgYSBzeW1saW5rIG9yIGEgZGlyLCB0aGVuIGl0J3MgZGVmaW5pdGVseSBhIHJlZ3VsYXIgZmlsZS5cbiAgICAvLyBkb24ndCBib3RoZXIgZG9pbmcgYSByZWFkZGlyIGluIHRoYXQgY2FzZS5cbiAgICBpZiAoIWlzU3ltICYmIGxzdGF0ICYmICFsc3RhdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICBzZWxmLmNhY2hlW2Fic10gPSAnRklMRSdcbiAgICAgIGNiKClcbiAgICB9IGVsc2VcbiAgICAgIHNlbGYuX3JlYWRkaXIoYWJzLCBmYWxzZSwgY2IpXG4gIH1cbn1cblxuR2xvYi5wcm90b3R5cGUuX3JlYWRkaXIgPSBmdW5jdGlvbiAoYWJzLCBpbkdsb2JTdGFyLCBjYikge1xuICBpZiAodGhpcy5hYm9ydGVkKVxuICAgIHJldHVyblxuXG4gIGNiID0gaW5mbGlnaHQoJ3JlYWRkaXJcXDAnK2FicysnXFwwJytpbkdsb2JTdGFyLCBjYilcbiAgaWYgKCFjYilcbiAgICByZXR1cm5cblxuICAvL2NvbnNvbGUuZXJyb3IoJ1JEICVqICVqJywgK2luR2xvYlN0YXIsIGFicylcbiAgaWYgKGluR2xvYlN0YXIgJiYgIW93blByb3AodGhpcy5zeW1saW5rcywgYWJzKSlcbiAgICByZXR1cm4gdGhpcy5fcmVhZGRpckluR2xvYlN0YXIoYWJzLCBjYilcblxuICBpZiAob3duUHJvcCh0aGlzLmNhY2hlLCBhYnMpKSB7XG4gICAgdmFyIGMgPSB0aGlzLmNhY2hlW2Fic11cbiAgICBpZiAoIWMgfHwgYyA9PT0gJ0ZJTEUnKVxuICAgICAgcmV0dXJuIGNiKClcblxuICAgIGlmIChBcnJheS5pc0FycmF5KGMpKVxuICAgICAgcmV0dXJuIGNiKG51bGwsIGMpXG4gIH1cblxuICB2YXIgc2VsZiA9IHRoaXNcbiAgc2VsZi5mcy5yZWFkZGlyKGFicywgcmVhZGRpckNiKHRoaXMsIGFicywgY2IpKVxufVxuXG5mdW5jdGlvbiByZWFkZGlyQ2IgKHNlbGYsIGFicywgY2IpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIChlciwgZW50cmllcykge1xuICAgIGlmIChlcilcbiAgICAgIHNlbGYuX3JlYWRkaXJFcnJvcihhYnMsIGVyLCBjYilcbiAgICBlbHNlXG4gICAgICBzZWxmLl9yZWFkZGlyRW50cmllcyhhYnMsIGVudHJpZXMsIGNiKVxuICB9XG59XG5cbkdsb2IucHJvdG90eXBlLl9yZWFkZGlyRW50cmllcyA9IGZ1bmN0aW9uIChhYnMsIGVudHJpZXMsIGNiKSB7XG4gIGlmICh0aGlzLmFib3J0ZWQpXG4gICAgcmV0dXJuXG5cbiAgLy8gaWYgd2UgaGF2ZW4ndCBhc2tlZCB0byBzdGF0IGV2ZXJ5dGhpbmcsIHRoZW4ganVzdFxuICAvLyBhc3N1bWUgdGhhdCBldmVyeXRoaW5nIGluIHRoZXJlIGV4aXN0cywgc28gd2UgY2FuIGF2b2lkXG4gIC8vIGhhdmluZyB0byBzdGF0IGl0IGEgc2Vjb25kIHRpbWUuXG4gIGlmICghdGhpcy5tYXJrICYmICF0aGlzLnN0YXQpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVudHJpZXMubGVuZ3RoOyBpICsrKSB7XG4gICAgICB2YXIgZSA9IGVudHJpZXNbaV1cbiAgICAgIGlmIChhYnMgPT09ICcvJylcbiAgICAgICAgZSA9IGFicyArIGVcbiAgICAgIGVsc2VcbiAgICAgICAgZSA9IGFicyArICcvJyArIGVcbiAgICAgIHRoaXMuY2FjaGVbZV0gPSB0cnVlXG4gICAgfVxuICB9XG5cbiAgdGhpcy5jYWNoZVthYnNdID0gZW50cmllc1xuICByZXR1cm4gY2IobnVsbCwgZW50cmllcylcbn1cblxuR2xvYi5wcm90b3R5cGUuX3JlYWRkaXJFcnJvciA9IGZ1bmN0aW9uIChmLCBlciwgY2IpIHtcbiAgaWYgKHRoaXMuYWJvcnRlZClcbiAgICByZXR1cm5cblxuICAvLyBoYW5kbGUgZXJyb3JzLCBhbmQgY2FjaGUgdGhlIGluZm9ybWF0aW9uXG4gIHN3aXRjaCAoZXIuY29kZSkge1xuICAgIGNhc2UgJ0VOT1RTVVAnOiAvLyBodHRwczovL2dpdGh1Yi5jb20vaXNhYWNzL25vZGUtZ2xvYi9pc3N1ZXMvMjA1XG4gICAgY2FzZSAnRU5PVERJUic6IC8vIHRvdGFsbHkgbm9ybWFsLiBtZWFucyBpdCAqZG9lcyogZXhpc3QuXG4gICAgICB2YXIgYWJzID0gdGhpcy5fbWFrZUFicyhmKVxuICAgICAgdGhpcy5jYWNoZVthYnNdID0gJ0ZJTEUnXG4gICAgICBpZiAoYWJzID09PSB0aGlzLmN3ZEFicykge1xuICAgICAgICB2YXIgZXJyb3IgPSBuZXcgRXJyb3IoZXIuY29kZSArICcgaW52YWxpZCBjd2QgJyArIHRoaXMuY3dkKVxuICAgICAgICBlcnJvci5wYXRoID0gdGhpcy5jd2RcbiAgICAgICAgZXJyb3IuY29kZSA9IGVyLmNvZGVcbiAgICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIGVycm9yKVxuICAgICAgICB0aGlzLmFib3J0KClcbiAgICAgIH1cbiAgICAgIGJyZWFrXG5cbiAgICBjYXNlICdFTk9FTlQnOiAvLyBub3QgdGVycmlibHkgdW51c3VhbFxuICAgIGNhc2UgJ0VMT09QJzpcbiAgICBjYXNlICdFTkFNRVRPT0xPTkcnOlxuICAgIGNhc2UgJ1VOS05PV04nOlxuICAgICAgdGhpcy5jYWNoZVt0aGlzLl9tYWtlQWJzKGYpXSA9IGZhbHNlXG4gICAgICBicmVha1xuXG4gICAgZGVmYXVsdDogLy8gc29tZSB1bnVzdWFsIGVycm9yLiAgVHJlYXQgYXMgZmFpbHVyZS5cbiAgICAgIHRoaXMuY2FjaGVbdGhpcy5fbWFrZUFicyhmKV0gPSBmYWxzZVxuICAgICAgaWYgKHRoaXMuc3RyaWN0KSB7XG4gICAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBlcilcbiAgICAgICAgLy8gSWYgdGhlIGVycm9yIGlzIGhhbmRsZWQsIHRoZW4gd2UgYWJvcnRcbiAgICAgICAgLy8gaWYgbm90LCB3ZSB0aHJldyBvdXQgb2YgaGVyZVxuICAgICAgICB0aGlzLmFib3J0KClcbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy5zaWxlbnQpXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ2dsb2IgZXJyb3InLCBlcilcbiAgICAgIGJyZWFrXG4gIH1cblxuICByZXR1cm4gY2IoKVxufVxuXG5HbG9iLnByb3RvdHlwZS5fcHJvY2Vzc0dsb2JTdGFyID0gZnVuY3Rpb24gKHByZWZpeCwgcmVhZCwgYWJzLCByZW1haW4sIGluZGV4LCBpbkdsb2JTdGFyLCBjYikge1xuICB2YXIgc2VsZiA9IHRoaXNcbiAgdGhpcy5fcmVhZGRpcihhYnMsIGluR2xvYlN0YXIsIGZ1bmN0aW9uIChlciwgZW50cmllcykge1xuICAgIHNlbGYuX3Byb2Nlc3NHbG9iU3RhcjIocHJlZml4LCByZWFkLCBhYnMsIHJlbWFpbiwgaW5kZXgsIGluR2xvYlN0YXIsIGVudHJpZXMsIGNiKVxuICB9KVxufVxuXG5cbkdsb2IucHJvdG90eXBlLl9wcm9jZXNzR2xvYlN0YXIyID0gZnVuY3Rpb24gKHByZWZpeCwgcmVhZCwgYWJzLCByZW1haW4sIGluZGV4LCBpbkdsb2JTdGFyLCBlbnRyaWVzLCBjYikge1xuICAvL2NvbnNvbGUuZXJyb3IoJ3BnczInLCBwcmVmaXgsIHJlbWFpblswXSwgZW50cmllcylcblxuICAvLyBubyBlbnRyaWVzIG1lYW5zIG5vdCBhIGRpciwgc28gaXQgY2FuIG5ldmVyIGhhdmUgbWF0Y2hlc1xuICAvLyBmb28udHh0LyoqIGRvZXNuJ3QgbWF0Y2ggZm9vLnR4dFxuICBpZiAoIWVudHJpZXMpXG4gICAgcmV0dXJuIGNiKClcblxuICAvLyB0ZXN0IHdpdGhvdXQgdGhlIGdsb2JzdGFyLCBhbmQgd2l0aCBldmVyeSBjaGlsZCBib3RoIGJlbG93XG4gIC8vIGFuZCByZXBsYWNpbmcgdGhlIGdsb2JzdGFyLlxuICB2YXIgcmVtYWluV2l0aG91dEdsb2JTdGFyID0gcmVtYWluLnNsaWNlKDEpXG4gIHZhciBnc3ByZWYgPSBwcmVmaXggPyBbIHByZWZpeCBdIDogW11cbiAgdmFyIG5vR2xvYlN0YXIgPSBnc3ByZWYuY29uY2F0KHJlbWFpbldpdGhvdXRHbG9iU3RhcilcblxuICAvLyB0aGUgbm9HbG9iU3RhciBwYXR0ZXJuIGV4aXRzIHRoZSBpbkdsb2JTdGFyIHN0YXRlXG4gIHRoaXMuX3Byb2Nlc3Mobm9HbG9iU3RhciwgaW5kZXgsIGZhbHNlLCBjYilcblxuICB2YXIgaXNTeW0gPSB0aGlzLnN5bWxpbmtzW2Fic11cbiAgdmFyIGxlbiA9IGVudHJpZXMubGVuZ3RoXG5cbiAgLy8gSWYgaXQncyBhIHN5bWxpbmssIGFuZCB3ZSdyZSBpbiBhIGdsb2JzdGFyLCB0aGVuIHN0b3BcbiAgaWYgKGlzU3ltICYmIGluR2xvYlN0YXIpXG4gICAgcmV0dXJuIGNiKClcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgdmFyIGUgPSBlbnRyaWVzW2ldXG4gICAgaWYgKGUuY2hhckF0KDApID09PSAnLicgJiYgIXRoaXMuZG90KVxuICAgICAgY29udGludWVcblxuICAgIC8vIHRoZXNlIHR3byBjYXNlcyBlbnRlciB0aGUgaW5HbG9iU3RhciBzdGF0ZVxuICAgIHZhciBpbnN0ZWFkID0gZ3NwcmVmLmNvbmNhdChlbnRyaWVzW2ldLCByZW1haW5XaXRob3V0R2xvYlN0YXIpXG4gICAgdGhpcy5fcHJvY2VzcyhpbnN0ZWFkLCBpbmRleCwgdHJ1ZSwgY2IpXG5cbiAgICB2YXIgYmVsb3cgPSBnc3ByZWYuY29uY2F0KGVudHJpZXNbaV0sIHJlbWFpbilcbiAgICB0aGlzLl9wcm9jZXNzKGJlbG93LCBpbmRleCwgdHJ1ZSwgY2IpXG4gIH1cblxuICBjYigpXG59XG5cbkdsb2IucHJvdG90eXBlLl9wcm9jZXNzU2ltcGxlID0gZnVuY3Rpb24gKHByZWZpeCwgaW5kZXgsIGNiKSB7XG4gIC8vIFhYWCByZXZpZXcgdGhpcy4gIFNob3VsZG4ndCBpdCBiZSBkb2luZyB0aGUgbW91bnRpbmcgZXRjXG4gIC8vIGJlZm9yZSBkb2luZyBzdGF0PyAga2luZGEgd2VpcmQ/XG4gIHZhciBzZWxmID0gdGhpc1xuICB0aGlzLl9zdGF0KHByZWZpeCwgZnVuY3Rpb24gKGVyLCBleGlzdHMpIHtcbiAgICBzZWxmLl9wcm9jZXNzU2ltcGxlMihwcmVmaXgsIGluZGV4LCBlciwgZXhpc3RzLCBjYilcbiAgfSlcbn1cbkdsb2IucHJvdG90eXBlLl9wcm9jZXNzU2ltcGxlMiA9IGZ1bmN0aW9uIChwcmVmaXgsIGluZGV4LCBlciwgZXhpc3RzLCBjYikge1xuXG4gIC8vY29uc29sZS5lcnJvcigncHMyJywgcHJlZml4LCBleGlzdHMpXG5cbiAgaWYgKCF0aGlzLm1hdGNoZXNbaW5kZXhdKVxuICAgIHRoaXMubWF0Y2hlc1tpbmRleF0gPSBPYmplY3QuY3JlYXRlKG51bGwpXG5cbiAgLy8gSWYgaXQgZG9lc24ndCBleGlzdCwgdGhlbiBqdXN0IG1hcmsgdGhlIGxhY2sgb2YgcmVzdWx0c1xuICBpZiAoIWV4aXN0cylcbiAgICByZXR1cm4gY2IoKVxuXG4gIGlmIChwcmVmaXggJiYgaXNBYnNvbHV0ZShwcmVmaXgpICYmICF0aGlzLm5vbW91bnQpIHtcbiAgICB2YXIgdHJhaWwgPSAvW1xcL1xcXFxdJC8udGVzdChwcmVmaXgpXG4gICAgaWYgKHByZWZpeC5jaGFyQXQoMCkgPT09ICcvJykge1xuICAgICAgcHJlZml4ID0gcGF0aC5qb2luKHRoaXMucm9vdCwgcHJlZml4KVxuICAgIH0gZWxzZSB7XG4gICAgICBwcmVmaXggPSBwYXRoLnJlc29sdmUodGhpcy5yb290LCBwcmVmaXgpXG4gICAgICBpZiAodHJhaWwpXG4gICAgICAgIHByZWZpeCArPSAnLydcbiAgICB9XG4gIH1cblxuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJylcbiAgICBwcmVmaXggPSBwcmVmaXgucmVwbGFjZSgvXFxcXC9nLCAnLycpXG5cbiAgLy8gTWFyayB0aGlzIGFzIGEgbWF0Y2hcbiAgdGhpcy5fZW1pdE1hdGNoKGluZGV4LCBwcmVmaXgpXG4gIGNiKClcbn1cblxuLy8gUmV0dXJucyBlaXRoZXIgJ0RJUicsICdGSUxFJywgb3IgZmFsc2Vcbkdsb2IucHJvdG90eXBlLl9zdGF0ID0gZnVuY3Rpb24gKGYsIGNiKSB7XG4gIHZhciBhYnMgPSB0aGlzLl9tYWtlQWJzKGYpXG4gIHZhciBuZWVkRGlyID0gZi5zbGljZSgtMSkgPT09ICcvJ1xuXG4gIGlmIChmLmxlbmd0aCA+IHRoaXMubWF4TGVuZ3RoKVxuICAgIHJldHVybiBjYigpXG5cbiAgaWYgKCF0aGlzLnN0YXQgJiYgb3duUHJvcCh0aGlzLmNhY2hlLCBhYnMpKSB7XG4gICAgdmFyIGMgPSB0aGlzLmNhY2hlW2Fic11cblxuICAgIGlmIChBcnJheS5pc0FycmF5KGMpKVxuICAgICAgYyA9ICdESVInXG5cbiAgICAvLyBJdCBleGlzdHMsIGJ1dCBtYXliZSBub3QgaG93IHdlIG5lZWQgaXRcbiAgICBpZiAoIW5lZWREaXIgfHwgYyA9PT0gJ0RJUicpXG4gICAgICByZXR1cm4gY2IobnVsbCwgYylcblxuICAgIGlmIChuZWVkRGlyICYmIGMgPT09ICdGSUxFJylcbiAgICAgIHJldHVybiBjYigpXG5cbiAgICAvLyBvdGhlcndpc2Ugd2UgaGF2ZSB0byBzdGF0LCBiZWNhdXNlIG1heWJlIGM9dHJ1ZVxuICAgIC8vIGlmIHdlIGtub3cgaXQgZXhpc3RzLCBidXQgbm90IHdoYXQgaXQgaXMuXG4gIH1cblxuICB2YXIgZXhpc3RzXG4gIHZhciBzdGF0ID0gdGhpcy5zdGF0Q2FjaGVbYWJzXVxuICBpZiAoc3RhdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHN0YXQgPT09IGZhbHNlKVxuICAgICAgcmV0dXJuIGNiKG51bGwsIHN0YXQpXG4gICAgZWxzZSB7XG4gICAgICB2YXIgdHlwZSA9IHN0YXQuaXNEaXJlY3RvcnkoKSA/ICdESVInIDogJ0ZJTEUnXG4gICAgICBpZiAobmVlZERpciAmJiB0eXBlID09PSAnRklMRScpXG4gICAgICAgIHJldHVybiBjYigpXG4gICAgICBlbHNlXG4gICAgICAgIHJldHVybiBjYihudWxsLCB0eXBlLCBzdGF0KVxuICAgIH1cbiAgfVxuXG4gIHZhciBzZWxmID0gdGhpc1xuICB2YXIgc3RhdGNiID0gaW5mbGlnaHQoJ3N0YXRcXDAnICsgYWJzLCBsc3RhdGNiXylcbiAgaWYgKHN0YXRjYilcbiAgICBzZWxmLmZzLmxzdGF0KGFicywgc3RhdGNiKVxuXG4gIGZ1bmN0aW9uIGxzdGF0Y2JfIChlciwgbHN0YXQpIHtcbiAgICBpZiAobHN0YXQgJiYgbHN0YXQuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgLy8gSWYgaXQncyBhIHN5bWxpbmssIHRoZW4gdHJlYXQgaXQgYXMgdGhlIHRhcmdldCwgdW5sZXNzXG4gICAgICAvLyB0aGUgdGFyZ2V0IGRvZXMgbm90IGV4aXN0LCB0aGVuIHRyZWF0IGl0IGFzIGEgZmlsZS5cbiAgICAgIHJldHVybiBzZWxmLmZzLnN0YXQoYWJzLCBmdW5jdGlvbiAoZXIsIHN0YXQpIHtcbiAgICAgICAgaWYgKGVyKVxuICAgICAgICAgIHNlbGYuX3N0YXQyKGYsIGFicywgbnVsbCwgbHN0YXQsIGNiKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgc2VsZi5fc3RhdDIoZiwgYWJzLCBlciwgc3RhdCwgY2IpXG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICBzZWxmLl9zdGF0MihmLCBhYnMsIGVyLCBsc3RhdCwgY2IpXG4gICAgfVxuICB9XG59XG5cbkdsb2IucHJvdG90eXBlLl9zdGF0MiA9IGZ1bmN0aW9uIChmLCBhYnMsIGVyLCBzdGF0LCBjYikge1xuICBpZiAoZXIgJiYgKGVyLmNvZGUgPT09ICdFTk9FTlQnIHx8IGVyLmNvZGUgPT09ICdFTk9URElSJykpIHtcbiAgICB0aGlzLnN0YXRDYWNoZVthYnNdID0gZmFsc2VcbiAgICByZXR1cm4gY2IoKVxuICB9XG5cbiAgdmFyIG5lZWREaXIgPSBmLnNsaWNlKC0xKSA9PT0gJy8nXG4gIHRoaXMuc3RhdENhY2hlW2Fic10gPSBzdGF0XG5cbiAgaWYgKGFicy5zbGljZSgtMSkgPT09ICcvJyAmJiBzdGF0ICYmICFzdGF0LmlzRGlyZWN0b3J5KCkpXG4gICAgcmV0dXJuIGNiKG51bGwsIGZhbHNlLCBzdGF0KVxuXG4gIHZhciBjID0gdHJ1ZVxuICBpZiAoc3RhdClcbiAgICBjID0gc3RhdC5pc0RpcmVjdG9yeSgpID8gJ0RJUicgOiAnRklMRSdcbiAgdGhpcy5jYWNoZVthYnNdID0gdGhpcy5jYWNoZVthYnNdIHx8IGNcblxuICBpZiAobmVlZERpciAmJiBjID09PSAnRklMRScpXG4gICAgcmV0dXJuIGNiKClcblxuICByZXR1cm4gY2IobnVsbCwgYywgc3RhdClcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZ2xvYlN5bmNcbmdsb2JTeW5jLkdsb2JTeW5jID0gR2xvYlN5bmNcblxudmFyIHJwID0gcmVxdWlyZSgnZnMucmVhbHBhdGgnKVxudmFyIG1pbmltYXRjaCA9IHJlcXVpcmUoJ21pbmltYXRjaCcpXG52YXIgTWluaW1hdGNoID0gbWluaW1hdGNoLk1pbmltYXRjaFxudmFyIEdsb2IgPSByZXF1aXJlKCcuL2dsb2IuanMnKS5HbG9iXG52YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKVxudmFyIHBhdGggPSByZXF1aXJlKCdwYXRoJylcbnZhciBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKVxudmFyIGlzQWJzb2x1dGUgPSByZXF1aXJlKCdwYXRoLWlzLWFic29sdXRlJylcbnZhciBjb21tb24gPSByZXF1aXJlKCcuL2NvbW1vbi5qcycpXG52YXIgc2V0b3B0cyA9IGNvbW1vbi5zZXRvcHRzXG52YXIgb3duUHJvcCA9IGNvbW1vbi5vd25Qcm9wXG52YXIgY2hpbGRyZW5JZ25vcmVkID0gY29tbW9uLmNoaWxkcmVuSWdub3JlZFxudmFyIGlzSWdub3JlZCA9IGNvbW1vbi5pc0lnbm9yZWRcblxuZnVuY3Rpb24gZ2xvYlN5bmMgKHBhdHRlcm4sIG9wdGlvbnMpIHtcbiAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nIHx8IGFyZ3VtZW50cy5sZW5ndGggPT09IDMpXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignY2FsbGJhY2sgcHJvdmlkZWQgdG8gc3luYyBnbG9iXFxuJytcbiAgICAgICAgICAgICAgICAgICAgICAgICdTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9pc2FhY3Mvbm9kZS1nbG9iL2lzc3Vlcy8xNjcnKVxuXG4gIHJldHVybiBuZXcgR2xvYlN5bmMocGF0dGVybiwgb3B0aW9ucykuZm91bmRcbn1cblxuZnVuY3Rpb24gR2xvYlN5bmMgKHBhdHRlcm4sIG9wdGlvbnMpIHtcbiAgaWYgKCFwYXR0ZXJuKVxuICAgIHRocm93IG5ldyBFcnJvcignbXVzdCBwcm92aWRlIHBhdHRlcm4nKVxuXG4gIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJyB8fCBhcmd1bWVudHMubGVuZ3RoID09PSAzKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2NhbGxiYWNrIHByb3ZpZGVkIHRvIHN5bmMgZ2xvYlxcbicrXG4gICAgICAgICAgICAgICAgICAgICAgICAnU2VlOiBodHRwczovL2dpdGh1Yi5jb20vaXNhYWNzL25vZGUtZ2xvYi9pc3N1ZXMvMTY3JylcblxuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgR2xvYlN5bmMpKVxuICAgIHJldHVybiBuZXcgR2xvYlN5bmMocGF0dGVybiwgb3B0aW9ucylcblxuICBzZXRvcHRzKHRoaXMsIHBhdHRlcm4sIG9wdGlvbnMpXG5cbiAgaWYgKHRoaXMubm9wcm9jZXNzKVxuICAgIHJldHVybiB0aGlzXG5cbiAgdmFyIG4gPSB0aGlzLm1pbmltYXRjaC5zZXQubGVuZ3RoXG4gIHRoaXMubWF0Y2hlcyA9IG5ldyBBcnJheShuKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkgKyspIHtcbiAgICB0aGlzLl9wcm9jZXNzKHRoaXMubWluaW1hdGNoLnNldFtpXSwgaSwgZmFsc2UpXG4gIH1cbiAgdGhpcy5fZmluaXNoKClcbn1cblxuR2xvYlN5bmMucHJvdG90eXBlLl9maW5pc2ggPSBmdW5jdGlvbiAoKSB7XG4gIGFzc2VydCh0aGlzIGluc3RhbmNlb2YgR2xvYlN5bmMpXG4gIGlmICh0aGlzLnJlYWxwYXRoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdGhpcy5tYXRjaGVzLmZvckVhY2goZnVuY3Rpb24gKG1hdGNoc2V0LCBpbmRleCkge1xuICAgICAgdmFyIHNldCA9IHNlbGYubWF0Y2hlc1tpbmRleF0gPSBPYmplY3QuY3JlYXRlKG51bGwpXG4gICAgICBmb3IgKHZhciBwIGluIG1hdGNoc2V0KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcCA9IHNlbGYuX21ha2VBYnMocClcbiAgICAgICAgICB2YXIgcmVhbCA9IHJwLnJlYWxwYXRoU3luYyhwLCBzZWxmLnJlYWxwYXRoQ2FjaGUpXG4gICAgICAgICAgc2V0W3JlYWxdID0gdHJ1ZVxuICAgICAgICB9IGNhdGNoIChlcikge1xuICAgICAgICAgIGlmIChlci5zeXNjYWxsID09PSAnc3RhdCcpXG4gICAgICAgICAgICBzZXRbc2VsZi5fbWFrZUFicyhwKV0gPSB0cnVlXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgdGhyb3cgZXJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH1cbiAgY29tbW9uLmZpbmlzaCh0aGlzKVxufVxuXG5cbkdsb2JTeW5jLnByb3RvdHlwZS5fcHJvY2VzcyA9IGZ1bmN0aW9uIChwYXR0ZXJuLCBpbmRleCwgaW5HbG9iU3Rhcikge1xuICBhc3NlcnQodGhpcyBpbnN0YW5jZW9mIEdsb2JTeW5jKVxuXG4gIC8vIEdldCB0aGUgZmlyc3QgW25dIHBhcnRzIG9mIHBhdHRlcm4gdGhhdCBhcmUgYWxsIHN0cmluZ3MuXG4gIHZhciBuID0gMFxuICB3aGlsZSAodHlwZW9mIHBhdHRlcm5bbl0gPT09ICdzdHJpbmcnKSB7XG4gICAgbiArK1xuICB9XG4gIC8vIG5vdyBuIGlzIHRoZSBpbmRleCBvZiB0aGUgZmlyc3Qgb25lIHRoYXQgaXMgKm5vdCogYSBzdHJpbmcuXG5cbiAgLy8gU2VlIGlmIHRoZXJlJ3MgYW55dGhpbmcgZWxzZVxuICB2YXIgcHJlZml4XG4gIHN3aXRjaCAobikge1xuICAgIC8vIGlmIG5vdCwgdGhlbiB0aGlzIGlzIHJhdGhlciBzaW1wbGVcbiAgICBjYXNlIHBhdHRlcm4ubGVuZ3RoOlxuICAgICAgdGhpcy5fcHJvY2Vzc1NpbXBsZShwYXR0ZXJuLmpvaW4oJy8nKSwgaW5kZXgpXG4gICAgICByZXR1cm5cblxuICAgIGNhc2UgMDpcbiAgICAgIC8vIHBhdHRlcm4gKnN0YXJ0cyogd2l0aCBzb21lIG5vbi10cml2aWFsIGl0ZW0uXG4gICAgICAvLyBnb2luZyB0byByZWFkZGlyKGN3ZCksIGJ1dCBub3QgaW5jbHVkZSB0aGUgcHJlZml4IGluIG1hdGNoZXMuXG4gICAgICBwcmVmaXggPSBudWxsXG4gICAgICBicmVha1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIC8vIHBhdHRlcm4gaGFzIHNvbWUgc3RyaW5nIGJpdHMgaW4gdGhlIGZyb250LlxuICAgICAgLy8gd2hhdGV2ZXIgaXQgc3RhcnRzIHdpdGgsIHdoZXRoZXIgdGhhdCdzICdhYnNvbHV0ZScgbGlrZSAvZm9vL2JhcixcbiAgICAgIC8vIG9yICdyZWxhdGl2ZScgbGlrZSAnLi4vYmF6J1xuICAgICAgcHJlZml4ID0gcGF0dGVybi5zbGljZSgwLCBuKS5qb2luKCcvJylcbiAgICAgIGJyZWFrXG4gIH1cblxuICB2YXIgcmVtYWluID0gcGF0dGVybi5zbGljZShuKVxuXG4gIC8vIGdldCB0aGUgbGlzdCBvZiBlbnRyaWVzLlxuICB2YXIgcmVhZFxuICBpZiAocHJlZml4ID09PSBudWxsKVxuICAgIHJlYWQgPSAnLidcbiAgZWxzZSBpZiAoaXNBYnNvbHV0ZShwcmVmaXgpIHx8IGlzQWJzb2x1dGUocGF0dGVybi5qb2luKCcvJykpKSB7XG4gICAgaWYgKCFwcmVmaXggfHwgIWlzQWJzb2x1dGUocHJlZml4KSlcbiAgICAgIHByZWZpeCA9ICcvJyArIHByZWZpeFxuICAgIHJlYWQgPSBwcmVmaXhcbiAgfSBlbHNlXG4gICAgcmVhZCA9IHByZWZpeFxuXG4gIHZhciBhYnMgPSB0aGlzLl9tYWtlQWJzKHJlYWQpXG5cbiAgLy9pZiBpZ25vcmVkLCBza2lwIHByb2Nlc3NpbmdcbiAgaWYgKGNoaWxkcmVuSWdub3JlZCh0aGlzLCByZWFkKSlcbiAgICByZXR1cm5cblxuICB2YXIgaXNHbG9iU3RhciA9IHJlbWFpblswXSA9PT0gbWluaW1hdGNoLkdMT0JTVEFSXG4gIGlmIChpc0dsb2JTdGFyKVxuICAgIHRoaXMuX3Byb2Nlc3NHbG9iU3RhcihwcmVmaXgsIHJlYWQsIGFicywgcmVtYWluLCBpbmRleCwgaW5HbG9iU3RhcilcbiAgZWxzZVxuICAgIHRoaXMuX3Byb2Nlc3NSZWFkZGlyKHByZWZpeCwgcmVhZCwgYWJzLCByZW1haW4sIGluZGV4LCBpbkdsb2JTdGFyKVxufVxuXG5cbkdsb2JTeW5jLnByb3RvdHlwZS5fcHJvY2Vzc1JlYWRkaXIgPSBmdW5jdGlvbiAocHJlZml4LCByZWFkLCBhYnMsIHJlbWFpbiwgaW5kZXgsIGluR2xvYlN0YXIpIHtcbiAgdmFyIGVudHJpZXMgPSB0aGlzLl9yZWFkZGlyKGFicywgaW5HbG9iU3RhcilcblxuICAvLyBpZiB0aGUgYWJzIGlzbid0IGEgZGlyLCB0aGVuIG5vdGhpbmcgY2FuIG1hdGNoIVxuICBpZiAoIWVudHJpZXMpXG4gICAgcmV0dXJuXG5cbiAgLy8gSXQgd2lsbCBvbmx5IG1hdGNoIGRvdCBlbnRyaWVzIGlmIGl0IHN0YXJ0cyB3aXRoIGEgZG90LCBvciBpZlxuICAvLyBkb3QgaXMgc2V0LiAgU3R1ZmYgbGlrZSBAKC5mb298LmJhcikgaXNuJ3QgYWxsb3dlZC5cbiAgdmFyIHBuID0gcmVtYWluWzBdXG4gIHZhciBuZWdhdGUgPSAhIXRoaXMubWluaW1hdGNoLm5lZ2F0ZVxuICB2YXIgcmF3R2xvYiA9IHBuLl9nbG9iXG4gIHZhciBkb3RPayA9IHRoaXMuZG90IHx8IHJhd0dsb2IuY2hhckF0KDApID09PSAnLidcblxuICB2YXIgbWF0Y2hlZEVudHJpZXMgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGVudHJpZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgZSA9IGVudHJpZXNbaV1cbiAgICBpZiAoZS5jaGFyQXQoMCkgIT09ICcuJyB8fCBkb3RPaykge1xuICAgICAgdmFyIG1cbiAgICAgIGlmIChuZWdhdGUgJiYgIXByZWZpeCkge1xuICAgICAgICBtID0gIWUubWF0Y2gocG4pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtID0gZS5tYXRjaChwbilcbiAgICAgIH1cbiAgICAgIGlmIChtKVxuICAgICAgICBtYXRjaGVkRW50cmllcy5wdXNoKGUpXG4gICAgfVxuICB9XG5cbiAgdmFyIGxlbiA9IG1hdGNoZWRFbnRyaWVzLmxlbmd0aFxuICAvLyBJZiB0aGVyZSBhcmUgbm8gbWF0Y2hlZCBlbnRyaWVzLCB0aGVuIG5vdGhpbmcgbWF0Y2hlcy5cbiAgaWYgKGxlbiA9PT0gMClcbiAgICByZXR1cm5cblxuICAvLyBpZiB0aGlzIGlzIHRoZSBsYXN0IHJlbWFpbmluZyBwYXR0ZXJuIGJpdCwgdGhlbiBubyBuZWVkIGZvclxuICAvLyBhbiBhZGRpdGlvbmFsIHN0YXQgKnVubGVzcyogdGhlIHVzZXIgaGFzIHNwZWNpZmllZCBtYXJrIG9yXG4gIC8vIHN0YXQgZXhwbGljaXRseS4gIFdlIGtub3cgdGhleSBleGlzdCwgc2luY2UgcmVhZGRpciByZXR1cm5lZFxuICAvLyB0aGVtLlxuXG4gIGlmIChyZW1haW4ubGVuZ3RoID09PSAxICYmICF0aGlzLm1hcmsgJiYgIXRoaXMuc3RhdCkge1xuICAgIGlmICghdGhpcy5tYXRjaGVzW2luZGV4XSlcbiAgICAgIHRoaXMubWF0Y2hlc1tpbmRleF0gPSBPYmplY3QuY3JlYXRlKG51bGwpXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArKykge1xuICAgICAgdmFyIGUgPSBtYXRjaGVkRW50cmllc1tpXVxuICAgICAgaWYgKHByZWZpeCkge1xuICAgICAgICBpZiAocHJlZml4LnNsaWNlKC0xKSAhPT0gJy8nKVxuICAgICAgICAgIGUgPSBwcmVmaXggKyAnLycgKyBlXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBlID0gcHJlZml4ICsgZVxuICAgICAgfVxuXG4gICAgICBpZiAoZS5jaGFyQXQoMCkgPT09ICcvJyAmJiAhdGhpcy5ub21vdW50KSB7XG4gICAgICAgIGUgPSBwYXRoLmpvaW4odGhpcy5yb290LCBlKVxuICAgICAgfVxuICAgICAgdGhpcy5fZW1pdE1hdGNoKGluZGV4LCBlKVxuICAgIH1cbiAgICAvLyBUaGlzIHdhcyB0aGUgbGFzdCBvbmUsIGFuZCBubyBzdGF0cyB3ZXJlIG5lZWRlZFxuICAgIHJldHVyblxuICB9XG5cbiAgLy8gbm93IHRlc3QgYWxsIG1hdGNoZWQgZW50cmllcyBhcyBzdGFuZC1pbnMgZm9yIHRoYXQgcGFydFxuICAvLyBvZiB0aGUgcGF0dGVybi5cbiAgcmVtYWluLnNoaWZ0KClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKyspIHtcbiAgICB2YXIgZSA9IG1hdGNoZWRFbnRyaWVzW2ldXG4gICAgdmFyIG5ld1BhdHRlcm5cbiAgICBpZiAocHJlZml4KVxuICAgICAgbmV3UGF0dGVybiA9IFtwcmVmaXgsIGVdXG4gICAgZWxzZVxuICAgICAgbmV3UGF0dGVybiA9IFtlXVxuICAgIHRoaXMuX3Byb2Nlc3MobmV3UGF0dGVybi5jb25jYXQocmVtYWluKSwgaW5kZXgsIGluR2xvYlN0YXIpXG4gIH1cbn1cblxuXG5HbG9iU3luYy5wcm90b3R5cGUuX2VtaXRNYXRjaCA9IGZ1bmN0aW9uIChpbmRleCwgZSkge1xuICBpZiAoaXNJZ25vcmVkKHRoaXMsIGUpKVxuICAgIHJldHVyblxuXG4gIHZhciBhYnMgPSB0aGlzLl9tYWtlQWJzKGUpXG5cbiAgaWYgKHRoaXMubWFyaylcbiAgICBlID0gdGhpcy5fbWFyayhlKVxuXG4gIGlmICh0aGlzLmFic29sdXRlKSB7XG4gICAgZSA9IGFic1xuICB9XG5cbiAgaWYgKHRoaXMubWF0Y2hlc1tpbmRleF1bZV0pXG4gICAgcmV0dXJuXG5cbiAgaWYgKHRoaXMubm9kaXIpIHtcbiAgICB2YXIgYyA9IHRoaXMuY2FjaGVbYWJzXVxuICAgIGlmIChjID09PSAnRElSJyB8fCBBcnJheS5pc0FycmF5KGMpKVxuICAgICAgcmV0dXJuXG4gIH1cblxuICB0aGlzLm1hdGNoZXNbaW5kZXhdW2VdID0gdHJ1ZVxuXG4gIGlmICh0aGlzLnN0YXQpXG4gICAgdGhpcy5fc3RhdChlKVxufVxuXG5cbkdsb2JTeW5jLnByb3RvdHlwZS5fcmVhZGRpckluR2xvYlN0YXIgPSBmdW5jdGlvbiAoYWJzKSB7XG4gIC8vIGZvbGxvdyBhbGwgc3ltbGlua2VkIGRpcmVjdG9yaWVzIGZvcmV2ZXJcbiAgLy8ganVzdCBwcm9jZWVkIGFzIGlmIHRoaXMgaXMgYSBub24tZ2xvYnN0YXIgc2l0dWF0aW9uXG4gIGlmICh0aGlzLmZvbGxvdylcbiAgICByZXR1cm4gdGhpcy5fcmVhZGRpcihhYnMsIGZhbHNlKVxuXG4gIHZhciBlbnRyaWVzXG4gIHZhciBsc3RhdFxuICB2YXIgc3RhdFxuICB0cnkge1xuICAgIGxzdGF0ID0gdGhpcy5mcy5sc3RhdFN5bmMoYWJzKVxuICB9IGNhdGNoIChlcikge1xuICAgIGlmIChlci5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgLy8gbHN0YXQgZmFpbGVkLCBkb2Vzbid0IGV4aXN0XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH1cbiAgfVxuXG4gIHZhciBpc1N5bSA9IGxzdGF0ICYmIGxzdGF0LmlzU3ltYm9saWNMaW5rKClcbiAgdGhpcy5zeW1saW5rc1thYnNdID0gaXNTeW1cblxuICAvLyBJZiBpdCdzIG5vdCBhIHN5bWxpbmsgb3IgYSBkaXIsIHRoZW4gaXQncyBkZWZpbml0ZWx5IGEgcmVndWxhciBmaWxlLlxuICAvLyBkb24ndCBib3RoZXIgZG9pbmcgYSByZWFkZGlyIGluIHRoYXQgY2FzZS5cbiAgaWYgKCFpc1N5bSAmJiBsc3RhdCAmJiAhbHN0YXQuaXNEaXJlY3RvcnkoKSlcbiAgICB0aGlzLmNhY2hlW2Fic10gPSAnRklMRSdcbiAgZWxzZVxuICAgIGVudHJpZXMgPSB0aGlzLl9yZWFkZGlyKGFicywgZmFsc2UpXG5cbiAgcmV0dXJuIGVudHJpZXNcbn1cblxuR2xvYlN5bmMucHJvdG90eXBlLl9yZWFkZGlyID0gZnVuY3Rpb24gKGFicywgaW5HbG9iU3Rhcikge1xuICB2YXIgZW50cmllc1xuXG4gIGlmIChpbkdsb2JTdGFyICYmICFvd25Qcm9wKHRoaXMuc3ltbGlua3MsIGFicykpXG4gICAgcmV0dXJuIHRoaXMuX3JlYWRkaXJJbkdsb2JTdGFyKGFicylcblxuICBpZiAob3duUHJvcCh0aGlzLmNhY2hlLCBhYnMpKSB7XG4gICAgdmFyIGMgPSB0aGlzLmNhY2hlW2Fic11cbiAgICBpZiAoIWMgfHwgYyA9PT0gJ0ZJTEUnKVxuICAgICAgcmV0dXJuIG51bGxcblxuICAgIGlmIChBcnJheS5pc0FycmF5KGMpKVxuICAgICAgcmV0dXJuIGNcbiAgfVxuXG4gIHRyeSB7XG4gICAgcmV0dXJuIHRoaXMuX3JlYWRkaXJFbnRyaWVzKGFicywgdGhpcy5mcy5yZWFkZGlyU3luYyhhYnMpKVxuICB9IGNhdGNoIChlcikge1xuICAgIHRoaXMuX3JlYWRkaXJFcnJvcihhYnMsIGVyKVxuICAgIHJldHVybiBudWxsXG4gIH1cbn1cblxuR2xvYlN5bmMucHJvdG90eXBlLl9yZWFkZGlyRW50cmllcyA9IGZ1bmN0aW9uIChhYnMsIGVudHJpZXMpIHtcbiAgLy8gaWYgd2UgaGF2ZW4ndCBhc2tlZCB0byBzdGF0IGV2ZXJ5dGhpbmcsIHRoZW4ganVzdFxuICAvLyBhc3N1bWUgdGhhdCBldmVyeXRoaW5nIGluIHRoZXJlIGV4aXN0cywgc28gd2UgY2FuIGF2b2lkXG4gIC8vIGhhdmluZyB0byBzdGF0IGl0IGEgc2Vjb25kIHRpbWUuXG4gIGlmICghdGhpcy5tYXJrICYmICF0aGlzLnN0YXQpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVudHJpZXMubGVuZ3RoOyBpICsrKSB7XG4gICAgICB2YXIgZSA9IGVudHJpZXNbaV1cbiAgICAgIGlmIChhYnMgPT09ICcvJylcbiAgICAgICAgZSA9IGFicyArIGVcbiAgICAgIGVsc2VcbiAgICAgICAgZSA9IGFicyArICcvJyArIGVcbiAgICAgIHRoaXMuY2FjaGVbZV0gPSB0cnVlXG4gICAgfVxuICB9XG5cbiAgdGhpcy5jYWNoZVthYnNdID0gZW50cmllc1xuXG4gIC8vIG1hcmsgYW5kIGNhY2hlIGRpci1uZXNzXG4gIHJldHVybiBlbnRyaWVzXG59XG5cbkdsb2JTeW5jLnByb3RvdHlwZS5fcmVhZGRpckVycm9yID0gZnVuY3Rpb24gKGYsIGVyKSB7XG4gIC8vIGhhbmRsZSBlcnJvcnMsIGFuZCBjYWNoZSB0aGUgaW5mb3JtYXRpb25cbiAgc3dpdGNoIChlci5jb2RlKSB7XG4gICAgY2FzZSAnRU5PVFNVUCc6IC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9pc2FhY3Mvbm9kZS1nbG9iL2lzc3Vlcy8yMDVcbiAgICBjYXNlICdFTk9URElSJzogLy8gdG90YWxseSBub3JtYWwuIG1lYW5zIGl0ICpkb2VzKiBleGlzdC5cbiAgICAgIHZhciBhYnMgPSB0aGlzLl9tYWtlQWJzKGYpXG4gICAgICB0aGlzLmNhY2hlW2Fic10gPSAnRklMRSdcbiAgICAgIGlmIChhYnMgPT09IHRoaXMuY3dkQWJzKSB7XG4gICAgICAgIHZhciBlcnJvciA9IG5ldyBFcnJvcihlci5jb2RlICsgJyBpbnZhbGlkIGN3ZCAnICsgdGhpcy5jd2QpXG4gICAgICAgIGVycm9yLnBhdGggPSB0aGlzLmN3ZFxuICAgICAgICBlcnJvci5jb2RlID0gZXIuY29kZVxuICAgICAgICB0aHJvdyBlcnJvclxuICAgICAgfVxuICAgICAgYnJlYWtcblxuICAgIGNhc2UgJ0VOT0VOVCc6IC8vIG5vdCB0ZXJyaWJseSB1bnVzdWFsXG4gICAgY2FzZSAnRUxPT1AnOlxuICAgIGNhc2UgJ0VOQU1FVE9PTE9ORyc6XG4gICAgY2FzZSAnVU5LTk9XTic6XG4gICAgICB0aGlzLmNhY2hlW3RoaXMuX21ha2VBYnMoZildID0gZmFsc2VcbiAgICAgIGJyZWFrXG5cbiAgICBkZWZhdWx0OiAvLyBzb21lIHVudXN1YWwgZXJyb3IuICBUcmVhdCBhcyBmYWlsdXJlLlxuICAgICAgdGhpcy5jYWNoZVt0aGlzLl9tYWtlQWJzKGYpXSA9IGZhbHNlXG4gICAgICBpZiAodGhpcy5zdHJpY3QpXG4gICAgICAgIHRocm93IGVyXG4gICAgICBpZiAoIXRoaXMuc2lsZW50KVxuICAgICAgICBjb25zb2xlLmVycm9yKCdnbG9iIGVycm9yJywgZXIpXG4gICAgICBicmVha1xuICB9XG59XG5cbkdsb2JTeW5jLnByb3RvdHlwZS5fcHJvY2Vzc0dsb2JTdGFyID0gZnVuY3Rpb24gKHByZWZpeCwgcmVhZCwgYWJzLCByZW1haW4sIGluZGV4LCBpbkdsb2JTdGFyKSB7XG5cbiAgdmFyIGVudHJpZXMgPSB0aGlzLl9yZWFkZGlyKGFicywgaW5HbG9iU3RhcilcblxuICAvLyBubyBlbnRyaWVzIG1lYW5zIG5vdCBhIGRpciwgc28gaXQgY2FuIG5ldmVyIGhhdmUgbWF0Y2hlc1xuICAvLyBmb28udHh0LyoqIGRvZXNuJ3QgbWF0Y2ggZm9vLnR4dFxuICBpZiAoIWVudHJpZXMpXG4gICAgcmV0dXJuXG5cbiAgLy8gdGVzdCB3aXRob3V0IHRoZSBnbG9ic3RhciwgYW5kIHdpdGggZXZlcnkgY2hpbGQgYm90aCBiZWxvd1xuICAvLyBhbmQgcmVwbGFjaW5nIHRoZSBnbG9ic3Rhci5cbiAgdmFyIHJlbWFpbldpdGhvdXRHbG9iU3RhciA9IHJlbWFpbi5zbGljZSgxKVxuICB2YXIgZ3NwcmVmID0gcHJlZml4ID8gWyBwcmVmaXggXSA6IFtdXG4gIHZhciBub0dsb2JTdGFyID0gZ3NwcmVmLmNvbmNhdChyZW1haW5XaXRob3V0R2xvYlN0YXIpXG5cbiAgLy8gdGhlIG5vR2xvYlN0YXIgcGF0dGVybiBleGl0cyB0aGUgaW5HbG9iU3RhciBzdGF0ZVxuICB0aGlzLl9wcm9jZXNzKG5vR2xvYlN0YXIsIGluZGV4LCBmYWxzZSlcblxuICB2YXIgbGVuID0gZW50cmllcy5sZW5ndGhcbiAgdmFyIGlzU3ltID0gdGhpcy5zeW1saW5rc1thYnNdXG5cbiAgLy8gSWYgaXQncyBhIHN5bWxpbmssIGFuZCB3ZSdyZSBpbiBhIGdsb2JzdGFyLCB0aGVuIHN0b3BcbiAgaWYgKGlzU3ltICYmIGluR2xvYlN0YXIpXG4gICAgcmV0dXJuXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIHZhciBlID0gZW50cmllc1tpXVxuICAgIGlmIChlLmNoYXJBdCgwKSA9PT0gJy4nICYmICF0aGlzLmRvdClcbiAgICAgIGNvbnRpbnVlXG5cbiAgICAvLyB0aGVzZSB0d28gY2FzZXMgZW50ZXIgdGhlIGluR2xvYlN0YXIgc3RhdGVcbiAgICB2YXIgaW5zdGVhZCA9IGdzcHJlZi5jb25jYXQoZW50cmllc1tpXSwgcmVtYWluV2l0aG91dEdsb2JTdGFyKVxuICAgIHRoaXMuX3Byb2Nlc3MoaW5zdGVhZCwgaW5kZXgsIHRydWUpXG5cbiAgICB2YXIgYmVsb3cgPSBnc3ByZWYuY29uY2F0KGVudHJpZXNbaV0sIHJlbWFpbilcbiAgICB0aGlzLl9wcm9jZXNzKGJlbG93LCBpbmRleCwgdHJ1ZSlcbiAgfVxufVxuXG5HbG9iU3luYy5wcm90b3R5cGUuX3Byb2Nlc3NTaW1wbGUgPSBmdW5jdGlvbiAocHJlZml4LCBpbmRleCkge1xuICAvLyBYWFggcmV2aWV3IHRoaXMuICBTaG91bGRuJ3QgaXQgYmUgZG9pbmcgdGhlIG1vdW50aW5nIGV0Y1xuICAvLyBiZWZvcmUgZG9pbmcgc3RhdD8gIGtpbmRhIHdlaXJkP1xuICB2YXIgZXhpc3RzID0gdGhpcy5fc3RhdChwcmVmaXgpXG5cbiAgaWYgKCF0aGlzLm1hdGNoZXNbaW5kZXhdKVxuICAgIHRoaXMubWF0Y2hlc1tpbmRleF0gPSBPYmplY3QuY3JlYXRlKG51bGwpXG5cbiAgLy8gSWYgaXQgZG9lc24ndCBleGlzdCwgdGhlbiBqdXN0IG1hcmsgdGhlIGxhY2sgb2YgcmVzdWx0c1xuICBpZiAoIWV4aXN0cylcbiAgICByZXR1cm5cblxuICBpZiAocHJlZml4ICYmIGlzQWJzb2x1dGUocHJlZml4KSAmJiAhdGhpcy5ub21vdW50KSB7XG4gICAgdmFyIHRyYWlsID0gL1tcXC9cXFxcXSQvLnRlc3QocHJlZml4KVxuICAgIGlmIChwcmVmaXguY2hhckF0KDApID09PSAnLycpIHtcbiAgICAgIHByZWZpeCA9IHBhdGguam9pbih0aGlzLnJvb3QsIHByZWZpeClcbiAgICB9IGVsc2Uge1xuICAgICAgcHJlZml4ID0gcGF0aC5yZXNvbHZlKHRoaXMucm9vdCwgcHJlZml4KVxuICAgICAgaWYgKHRyYWlsKVxuICAgICAgICBwcmVmaXggKz0gJy8nXG4gICAgfVxuICB9XG5cbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpXG4gICAgcHJlZml4ID0gcHJlZml4LnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuXG4gIC8vIE1hcmsgdGhpcyBhcyBhIG1hdGNoXG4gIHRoaXMuX2VtaXRNYXRjaChpbmRleCwgcHJlZml4KVxufVxuXG4vLyBSZXR1cm5zIGVpdGhlciAnRElSJywgJ0ZJTEUnLCBvciBmYWxzZVxuR2xvYlN5bmMucHJvdG90eXBlLl9zdGF0ID0gZnVuY3Rpb24gKGYpIHtcbiAgdmFyIGFicyA9IHRoaXMuX21ha2VBYnMoZilcbiAgdmFyIG5lZWREaXIgPSBmLnNsaWNlKC0xKSA9PT0gJy8nXG5cbiAgaWYgKGYubGVuZ3RoID4gdGhpcy5tYXhMZW5ndGgpXG4gICAgcmV0dXJuIGZhbHNlXG5cbiAgaWYgKCF0aGlzLnN0YXQgJiYgb3duUHJvcCh0aGlzLmNhY2hlLCBhYnMpKSB7XG4gICAgdmFyIGMgPSB0aGlzLmNhY2hlW2Fic11cblxuICAgIGlmIChBcnJheS5pc0FycmF5KGMpKVxuICAgICAgYyA9ICdESVInXG5cbiAgICAvLyBJdCBleGlzdHMsIGJ1dCBtYXliZSBub3QgaG93IHdlIG5lZWQgaXRcbiAgICBpZiAoIW5lZWREaXIgfHwgYyA9PT0gJ0RJUicpXG4gICAgICByZXR1cm4gY1xuXG4gICAgaWYgKG5lZWREaXIgJiYgYyA9PT0gJ0ZJTEUnKVxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAvLyBvdGhlcndpc2Ugd2UgaGF2ZSB0byBzdGF0LCBiZWNhdXNlIG1heWJlIGM9dHJ1ZVxuICAgIC8vIGlmIHdlIGtub3cgaXQgZXhpc3RzLCBidXQgbm90IHdoYXQgaXQgaXMuXG4gIH1cblxuICB2YXIgZXhpc3RzXG4gIHZhciBzdGF0ID0gdGhpcy5zdGF0Q2FjaGVbYWJzXVxuICBpZiAoIXN0YXQpIHtcbiAgICB2YXIgbHN0YXRcbiAgICB0cnkge1xuICAgICAgbHN0YXQgPSB0aGlzLmZzLmxzdGF0U3luYyhhYnMpXG4gICAgfSBjYXRjaCAoZXIpIHtcbiAgICAgIGlmIChlciAmJiAoZXIuY29kZSA9PT0gJ0VOT0VOVCcgfHwgZXIuY29kZSA9PT0gJ0VOT1RESVInKSkge1xuICAgICAgICB0aGlzLnN0YXRDYWNoZVthYnNdID0gZmFsc2VcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGxzdGF0ICYmIGxzdGF0LmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHN0YXQgPSB0aGlzLmZzLnN0YXRTeW5jKGFicylcbiAgICAgIH0gY2F0Y2ggKGVyKSB7XG4gICAgICAgIHN0YXQgPSBsc3RhdFxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdGF0ID0gbHN0YXRcbiAgICB9XG4gIH1cblxuICB0aGlzLnN0YXRDYWNoZVthYnNdID0gc3RhdFxuXG4gIHZhciBjID0gdHJ1ZVxuICBpZiAoc3RhdClcbiAgICBjID0gc3RhdC5pc0RpcmVjdG9yeSgpID8gJ0RJUicgOiAnRklMRSdcblxuICB0aGlzLmNhY2hlW2Fic10gPSB0aGlzLmNhY2hlW2Fic10gfHwgY1xuXG4gIGlmIChuZWVkRGlyICYmIGMgPT09ICdGSUxFJylcbiAgICByZXR1cm4gZmFsc2VcblxuICByZXR1cm4gY1xufVxuXG5HbG9iU3luYy5wcm90b3R5cGUuX21hcmsgPSBmdW5jdGlvbiAocCkge1xuICByZXR1cm4gY29tbW9uLm1hcmsodGhpcywgcClcbn1cblxuR2xvYlN5bmMucHJvdG90eXBlLl9tYWtlQWJzID0gZnVuY3Rpb24gKGYpIHtcbiAgcmV0dXJuIGNvbW1vbi5tYWtlQWJzKHRoaXMsIGYpXG59XG4iLCJ2YXIgd3JhcHB5ID0gcmVxdWlyZSgnd3JhcHB5JylcbnZhciByZXFzID0gT2JqZWN0LmNyZWF0ZShudWxsKVxudmFyIG9uY2UgPSByZXF1aXJlKCdvbmNlJylcblxubW9kdWxlLmV4cG9ydHMgPSB3cmFwcHkoaW5mbGlnaHQpXG5cbmZ1bmN0aW9uIGluZmxpZ2h0IChrZXksIGNiKSB7XG4gIGlmIChyZXFzW2tleV0pIHtcbiAgICByZXFzW2tleV0ucHVzaChjYilcbiAgICByZXR1cm4gbnVsbFxuICB9IGVsc2Uge1xuICAgIHJlcXNba2V5XSA9IFtjYl1cbiAgICByZXR1cm4gbWFrZXJlcyhrZXkpXG4gIH1cbn1cblxuZnVuY3Rpb24gbWFrZXJlcyAoa2V5KSB7XG4gIHJldHVybiBvbmNlKGZ1bmN0aW9uIFJFUyAoKSB7XG4gICAgdmFyIGNicyA9IHJlcXNba2V5XVxuICAgIHZhciBsZW4gPSBjYnMubGVuZ3RoXG4gICAgdmFyIGFyZ3MgPSBzbGljZShhcmd1bWVudHMpXG5cbiAgICAvLyBYWFggSXQncyBzb21ld2hhdCBhbWJpZ3VvdXMgd2hldGhlciBhIG5ldyBjYWxsYmFjayBhZGRlZCBpbiB0aGlzXG4gICAgLy8gcGFzcyBzaG91bGQgYmUgcXVldWVkIGZvciBsYXRlciBleGVjdXRpb24gaWYgc29tZXRoaW5nIGluIHRoZVxuICAgIC8vIGxpc3Qgb2YgY2FsbGJhY2tzIHRocm93cywgb3IgaWYgaXQgc2hvdWxkIGp1c3QgYmUgZGlzY2FyZGVkLlxuICAgIC8vIEhvd2V2ZXIsIGl0J3Mgc3VjaCBhbiBlZGdlIGNhc2UgdGhhdCBpdCBoYXJkbHkgbWF0dGVycywgYW5kIGVpdGhlclxuICAgIC8vIGNob2ljZSBpcyBsaWtlbHkgYXMgc3VycHJpc2luZyBhcyB0aGUgb3RoZXIuXG4gICAgLy8gQXMgaXQgaGFwcGVucywgd2UgZG8gZ28gYWhlYWQgYW5kIHNjaGVkdWxlIGl0IGZvciBsYXRlciBleGVjdXRpb24uXG4gICAgdHJ5IHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgY2JzW2ldLmFwcGx5KG51bGwsIGFyZ3MpXG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGlmIChjYnMubGVuZ3RoID4gbGVuKSB7XG4gICAgICAgIC8vIGFkZGVkIG1vcmUgaW4gdGhlIGludGVyaW0uXG4gICAgICAgIC8vIGRlLXphbGdvLCBqdXN0IGluIGNhc2UsIGJ1dCBkb24ndCBjYWxsIGFnYWluLlxuICAgICAgICBjYnMuc3BsaWNlKDAsIGxlbilcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgUkVTLmFwcGx5KG51bGwsIGFyZ3MpXG4gICAgICAgIH0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWxldGUgcmVxc1trZXldXG4gICAgICB9XG4gICAgfVxuICB9KVxufVxuXG5mdW5jdGlvbiBzbGljZSAoYXJncykge1xuICB2YXIgbGVuZ3RoID0gYXJncy5sZW5ndGhcbiAgdmFyIGFycmF5ID0gW11cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSBhcnJheVtpXSA9IGFyZ3NbaV1cbiAgcmV0dXJuIGFycmF5XG59XG4iLCJ0cnkge1xuICB2YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKTtcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgaWYgKHR5cGVvZiB1dGlsLmluaGVyaXRzICE9PSAnZnVuY3Rpb24nKSB0aHJvdyAnJztcbiAgbW9kdWxlLmV4cG9ydHMgPSB1dGlsLmluaGVyaXRzO1xufSBjYXRjaCAoZSkge1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vaW5oZXJpdHNfYnJvd3Nlci5qcycpO1xufVxuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgaWYgKHN1cGVyQ3Rvcikge1xuICAgICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBpZiAoc3VwZXJDdG9yKSB7XG4gICAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICAgIH1cbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChhcnIpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcnIpID09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hdGNoO1xuXG52YXIgVHJhbnNmb3JtID0gcmVxdWlyZSgnc3RyZWFtJykuVHJhbnNmb3JtO1xudmFyIGluaGVyaXRzID0gcmVxdWlyZShcInV0aWxcIikuaW5oZXJpdHM7XG52YXIgQnVmZmVycyA9IHJlcXVpcmUoJ2J1ZmZlcnMnKTtcblxuaWYgKCFUcmFuc2Zvcm0pIHtcbiAgVHJhbnNmb3JtID0gcmVxdWlyZSgncmVhZGFibGUtc3RyZWFtL3RyYW5zZm9ybScpO1xufVxuXG5pbmhlcml0cyhNYXRjaCwgVHJhbnNmb3JtKTtcblxuZnVuY3Rpb24gTWF0Y2gob3B0cywgbWF0Y2hGbikge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTWF0Y2gpKSB7XG4gICAgcmV0dXJuIG5ldyBNYXRjaChvcHRzLCBtYXRjaEZuKTtcbiAgfVxuXG4gIC8vdG9kbyAtIGJldHRlciBoYW5kbGUgb3B0cyBlLmcuIHBhdHRlcm4ubGVuZ3RoIGNhbid0IGJlID4gaGlnaFdhdGVyTWFya1xuICB0aGlzLl9vcHRzID0gb3B0cztcbiAgaWYgKHR5cGVvZiB0aGlzLl9vcHRzLnBhdHRlcm4gPT09IFwic3RyaW5nXCIpIHtcbiAgICB0aGlzLl9vcHRzLnBhdHRlcm4gPSBuZXcgQnVmZmVyKHRoaXMuX29wdHMucGF0dGVybik7XG4gIH1cbiAgdGhpcy5fbWF0Y2hGbiA9IG1hdGNoRm47XG4gIHRoaXMuX2J1ZnMgPSBCdWZmZXJzKCk7XG5cbiAgVHJhbnNmb3JtLmNhbGwodGhpcyk7XG59XG5cbk1hdGNoLnByb3RvdHlwZS5fdHJhbnNmb3JtID0gZnVuY3Rpb24gKGNodW5rLCBlbmNvZGluZywgY2FsbGJhY2spIHtcbiAgdmFyIHBhdHRlcm4gPSB0aGlzLl9vcHRzLnBhdHRlcm47XG4gIHRoaXMuX2J1ZnMucHVzaChjaHVuayk7XG5cbiAgdmFyIGluZGV4ID0gdGhpcy5fYnVmcy5pbmRleE9mKHBhdHRlcm4pO1xuICBpZiAoaW5kZXggPj0gMCkge1xuICAgIHByb2Nlc3NNYXRjaGVzLmNhbGwodGhpcywgaW5kZXgsIHBhdHRlcm4sIGNhbGxiYWNrKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgYnVmID0gdGhpcy5fYnVmcy5zcGxpY2UoMCwgdGhpcy5fYnVmcy5sZW5ndGggLSBjaHVuay5sZW5ndGgpO1xuICAgIGlmIChidWYgJiYgYnVmLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMuX21hdGNoRm4oYnVmLnRvQnVmZmVyKCkpO1xuICAgIH1cbiAgICBjYWxsYmFjaygpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBwcm9jZXNzTWF0Y2hlcyhpbmRleCwgcGF0dGVybiwgY2FsbGJhY2spIHtcbiAgdmFyIGJ1ZiA9IHRoaXMuX2J1ZnMuc3BsaWNlKDAsIGluZGV4KS50b0J1ZmZlcigpO1xuICBpZiAodGhpcy5fb3B0cy5jb25zdW1lKSB7XG4gICAgdGhpcy5fYnVmcy5zcGxpY2UoMCwgcGF0dGVybi5sZW5ndGgpO1xuICB9XG4gIHRoaXMuX21hdGNoRm4oYnVmLCBwYXR0ZXJuLCB0aGlzLl9idWZzLnRvQnVmZmVyKCkpO1xuXG4gIGluZGV4ID0gdGhpcy5fYnVmcy5pbmRleE9mKHBhdHRlcm4pO1xuICBpZiAoaW5kZXggPiAwIHx8IHRoaXMuX29wdHMuY29uc3VtZSAmJiBpbmRleCA9PT0gMCkge1xuICAgIHByb2Nlc3MubmV4dFRpY2socHJvY2Vzc01hdGNoZXMuYmluZCh0aGlzLCBpbmRleCwgcGF0dGVybiwgY2FsbGJhY2spKTtcbiAgfSBlbHNlIHtcbiAgICBjYWxsYmFjaygpO1xuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IG1pbmltYXRjaFxubWluaW1hdGNoLk1pbmltYXRjaCA9IE1pbmltYXRjaFxuXG52YXIgcGF0aCA9IHsgc2VwOiAnLycgfVxudHJ5IHtcbiAgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKVxufSBjYXRjaCAoZXIpIHt9XG5cbnZhciBHTE9CU1RBUiA9IG1pbmltYXRjaC5HTE9CU1RBUiA9IE1pbmltYXRjaC5HTE9CU1RBUiA9IHt9XG52YXIgZXhwYW5kID0gcmVxdWlyZSgnYnJhY2UtZXhwYW5zaW9uJylcblxudmFyIHBsVHlwZXMgPSB7XG4gICchJzogeyBvcGVuOiAnKD86KD8hKD86JywgY2xvc2U6ICcpKVteL10qPyknfSxcbiAgJz8nOiB7IG9wZW46ICcoPzonLCBjbG9zZTogJyk/JyB9LFxuICAnKyc6IHsgb3BlbjogJyg/OicsIGNsb3NlOiAnKSsnIH0sXG4gICcqJzogeyBvcGVuOiAnKD86JywgY2xvc2U6ICcpKicgfSxcbiAgJ0AnOiB7IG9wZW46ICcoPzonLCBjbG9zZTogJyknIH1cbn1cblxuLy8gYW55IHNpbmdsZSB0aGluZyBvdGhlciB0aGFuIC9cbi8vIGRvbid0IG5lZWQgdG8gZXNjYXBlIC8gd2hlbiB1c2luZyBuZXcgUmVnRXhwKClcbnZhciBxbWFyayA9ICdbXi9dJ1xuXG4vLyAqID0+IGFueSBudW1iZXIgb2YgY2hhcmFjdGVyc1xudmFyIHN0YXIgPSBxbWFyayArICcqPydcblxuLy8gKiogd2hlbiBkb3RzIGFyZSBhbGxvd2VkLiAgQW55dGhpbmcgZ29lcywgZXhjZXB0IC4uIGFuZCAuXG4vLyBub3QgKF4gb3IgLyBmb2xsb3dlZCBieSBvbmUgb3IgdHdvIGRvdHMgZm9sbG93ZWQgYnkgJCBvciAvKSxcbi8vIGZvbGxvd2VkIGJ5IGFueXRoaW5nLCBhbnkgbnVtYmVyIG9mIHRpbWVzLlxudmFyIHR3b1N0YXJEb3QgPSAnKD86KD8hKD86XFxcXFxcL3xeKSg/OlxcXFwuezEsMn0pKCR8XFxcXFxcLykpLikqPydcblxuLy8gbm90IGEgXiBvciAvIGZvbGxvd2VkIGJ5IGEgZG90LFxuLy8gZm9sbG93ZWQgYnkgYW55dGhpbmcsIGFueSBudW1iZXIgb2YgdGltZXMuXG52YXIgdHdvU3Rhck5vRG90ID0gJyg/Oig/ISg/OlxcXFxcXC98XilcXFxcLikuKSo/J1xuXG4vLyBjaGFyYWN0ZXJzIHRoYXQgbmVlZCB0byBiZSBlc2NhcGVkIGluIFJlZ0V4cC5cbnZhciByZVNwZWNpYWxzID0gY2hhclNldCgnKCkuKnt9Kz9bXV4kXFxcXCEnKVxuXG4vLyBcImFiY1wiIC0+IHsgYTp0cnVlLCBiOnRydWUsIGM6dHJ1ZSB9XG5mdW5jdGlvbiBjaGFyU2V0IChzKSB7XG4gIHJldHVybiBzLnNwbGl0KCcnKS5yZWR1Y2UoZnVuY3Rpb24gKHNldCwgYykge1xuICAgIHNldFtjXSA9IHRydWVcbiAgICByZXR1cm4gc2V0XG4gIH0sIHt9KVxufVxuXG4vLyBub3JtYWxpemVzIHNsYXNoZXMuXG52YXIgc2xhc2hTcGxpdCA9IC9cXC8rL1xuXG5taW5pbWF0Y2guZmlsdGVyID0gZmlsdGVyXG5mdW5jdGlvbiBmaWx0ZXIgKHBhdHRlcm4sIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgcmV0dXJuIGZ1bmN0aW9uIChwLCBpLCBsaXN0KSB7XG4gICAgcmV0dXJuIG1pbmltYXRjaChwLCBwYXR0ZXJuLCBvcHRpb25zKVxuICB9XG59XG5cbmZ1bmN0aW9uIGV4dCAoYSwgYikge1xuICBhID0gYSB8fCB7fVxuICBiID0gYiB8fCB7fVxuICB2YXIgdCA9IHt9XG4gIE9iamVjdC5rZXlzKGIpLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICB0W2tdID0gYltrXVxuICB9KVxuICBPYmplY3Qua2V5cyhhKS5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgdFtrXSA9IGFba11cbiAgfSlcbiAgcmV0dXJuIHRcbn1cblxubWluaW1hdGNoLmRlZmF1bHRzID0gZnVuY3Rpb24gKGRlZikge1xuICBpZiAoIWRlZiB8fCAhT2JqZWN0LmtleXMoZGVmKS5sZW5ndGgpIHJldHVybiBtaW5pbWF0Y2hcblxuICB2YXIgb3JpZyA9IG1pbmltYXRjaFxuXG4gIHZhciBtID0gZnVuY3Rpb24gbWluaW1hdGNoIChwLCBwYXR0ZXJuLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIG9yaWcubWluaW1hdGNoKHAsIHBhdHRlcm4sIGV4dChkZWYsIG9wdGlvbnMpKVxuICB9XG5cbiAgbS5NaW5pbWF0Y2ggPSBmdW5jdGlvbiBNaW5pbWF0Y2ggKHBhdHRlcm4sIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gbmV3IG9yaWcuTWluaW1hdGNoKHBhdHRlcm4sIGV4dChkZWYsIG9wdGlvbnMpKVxuICB9XG5cbiAgcmV0dXJuIG1cbn1cblxuTWluaW1hdGNoLmRlZmF1bHRzID0gZnVuY3Rpb24gKGRlZikge1xuICBpZiAoIWRlZiB8fCAhT2JqZWN0LmtleXMoZGVmKS5sZW5ndGgpIHJldHVybiBNaW5pbWF0Y2hcbiAgcmV0dXJuIG1pbmltYXRjaC5kZWZhdWx0cyhkZWYpLk1pbmltYXRjaFxufVxuXG5mdW5jdGlvbiBtaW5pbWF0Y2ggKHAsIHBhdHRlcm4sIG9wdGlvbnMpIHtcbiAgaWYgKHR5cGVvZiBwYXR0ZXJuICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2dsb2IgcGF0dGVybiBzdHJpbmcgcmVxdWlyZWQnKVxuICB9XG5cbiAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge31cblxuICAvLyBzaG9ydGN1dDogY29tbWVudHMgbWF0Y2ggbm90aGluZy5cbiAgaWYgKCFvcHRpb25zLm5vY29tbWVudCAmJiBwYXR0ZXJuLmNoYXJBdCgwKSA9PT0gJyMnKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBcIlwiIG9ubHkgbWF0Y2hlcyBcIlwiXG4gIGlmIChwYXR0ZXJuLnRyaW0oKSA9PT0gJycpIHJldHVybiBwID09PSAnJ1xuXG4gIHJldHVybiBuZXcgTWluaW1hdGNoKHBhdHRlcm4sIG9wdGlvbnMpLm1hdGNoKHApXG59XG5cbmZ1bmN0aW9uIE1pbmltYXRjaCAocGF0dGVybiwgb3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTWluaW1hdGNoKSkge1xuICAgIHJldHVybiBuZXcgTWluaW1hdGNoKHBhdHRlcm4sIG9wdGlvbnMpXG4gIH1cblxuICBpZiAodHlwZW9mIHBhdHRlcm4gIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZ2xvYiBwYXR0ZXJuIHN0cmluZyByZXF1aXJlZCcpXG4gIH1cblxuICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fVxuICBwYXR0ZXJuID0gcGF0dGVybi50cmltKClcblxuICAvLyB3aW5kb3dzIHN1cHBvcnQ6IG5lZWQgdG8gdXNlIC8sIG5vdCBcXFxuICBpZiAocGF0aC5zZXAgIT09ICcvJykge1xuICAgIHBhdHRlcm4gPSBwYXR0ZXJuLnNwbGl0KHBhdGguc2VwKS5qb2luKCcvJylcbiAgfVxuXG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnNcbiAgdGhpcy5zZXQgPSBbXVxuICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuXG4gIHRoaXMucmVnZXhwID0gbnVsbFxuICB0aGlzLm5lZ2F0ZSA9IGZhbHNlXG4gIHRoaXMuY29tbWVudCA9IGZhbHNlXG4gIHRoaXMuZW1wdHkgPSBmYWxzZVxuXG4gIC8vIG1ha2UgdGhlIHNldCBvZiByZWdleHBzIGV0Yy5cbiAgdGhpcy5tYWtlKClcbn1cblxuTWluaW1hdGNoLnByb3RvdHlwZS5kZWJ1ZyA9IGZ1bmN0aW9uICgpIHt9XG5cbk1pbmltYXRjaC5wcm90b3R5cGUubWFrZSA9IG1ha2VcbmZ1bmN0aW9uIG1ha2UgKCkge1xuICAvLyBkb24ndCBkbyBpdCBtb3JlIHRoYW4gb25jZS5cbiAgaWYgKHRoaXMuX21hZGUpIHJldHVyblxuXG4gIHZhciBwYXR0ZXJuID0gdGhpcy5wYXR0ZXJuXG4gIHZhciBvcHRpb25zID0gdGhpcy5vcHRpb25zXG5cbiAgLy8gZW1wdHkgcGF0dGVybnMgYW5kIGNvbW1lbnRzIG1hdGNoIG5vdGhpbmcuXG4gIGlmICghb3B0aW9ucy5ub2NvbW1lbnQgJiYgcGF0dGVybi5jaGFyQXQoMCkgPT09ICcjJykge1xuICAgIHRoaXMuY29tbWVudCA9IHRydWVcbiAgICByZXR1cm5cbiAgfVxuICBpZiAoIXBhdHRlcm4pIHtcbiAgICB0aGlzLmVtcHR5ID0gdHJ1ZVxuICAgIHJldHVyblxuICB9XG5cbiAgLy8gc3RlcCAxOiBmaWd1cmUgb3V0IG5lZ2F0aW9uLCBldGMuXG4gIHRoaXMucGFyc2VOZWdhdGUoKVxuXG4gIC8vIHN0ZXAgMjogZXhwYW5kIGJyYWNlc1xuICB2YXIgc2V0ID0gdGhpcy5nbG9iU2V0ID0gdGhpcy5icmFjZUV4cGFuZCgpXG5cbiAgaWYgKG9wdGlvbnMuZGVidWcpIHRoaXMuZGVidWcgPSBjb25zb2xlLmVycm9yXG5cbiAgdGhpcy5kZWJ1Zyh0aGlzLnBhdHRlcm4sIHNldClcblxuICAvLyBzdGVwIDM6IG5vdyB3ZSBoYXZlIGEgc2V0LCBzbyB0dXJuIGVhY2ggb25lIGludG8gYSBzZXJpZXMgb2YgcGF0aC1wb3J0aW9uXG4gIC8vIG1hdGNoaW5nIHBhdHRlcm5zLlxuICAvLyBUaGVzZSB3aWxsIGJlIHJlZ2V4cHMsIGV4Y2VwdCBpbiB0aGUgY2FzZSBvZiBcIioqXCIsIHdoaWNoIGlzXG4gIC8vIHNldCB0byB0aGUgR0xPQlNUQVIgb2JqZWN0IGZvciBnbG9ic3RhciBiZWhhdmlvcixcbiAgLy8gYW5kIHdpbGwgbm90IGNvbnRhaW4gYW55IC8gY2hhcmFjdGVyc1xuICBzZXQgPSB0aGlzLmdsb2JQYXJ0cyA9IHNldC5tYXAoZnVuY3Rpb24gKHMpIHtcbiAgICByZXR1cm4gcy5zcGxpdChzbGFzaFNwbGl0KVxuICB9KVxuXG4gIHRoaXMuZGVidWcodGhpcy5wYXR0ZXJuLCBzZXQpXG5cbiAgLy8gZ2xvYiAtLT4gcmVnZXhwc1xuICBzZXQgPSBzZXQubWFwKGZ1bmN0aW9uIChzLCBzaSwgc2V0KSB7XG4gICAgcmV0dXJuIHMubWFwKHRoaXMucGFyc2UsIHRoaXMpXG4gIH0sIHRoaXMpXG5cbiAgdGhpcy5kZWJ1Zyh0aGlzLnBhdHRlcm4sIHNldClcblxuICAvLyBmaWx0ZXIgb3V0IGV2ZXJ5dGhpbmcgdGhhdCBkaWRuJ3QgY29tcGlsZSBwcm9wZXJseS5cbiAgc2V0ID0gc2V0LmZpbHRlcihmdW5jdGlvbiAocykge1xuICAgIHJldHVybiBzLmluZGV4T2YoZmFsc2UpID09PSAtMVxuICB9KVxuXG4gIHRoaXMuZGVidWcodGhpcy5wYXR0ZXJuLCBzZXQpXG5cbiAgdGhpcy5zZXQgPSBzZXRcbn1cblxuTWluaW1hdGNoLnByb3RvdHlwZS5wYXJzZU5lZ2F0ZSA9IHBhcnNlTmVnYXRlXG5mdW5jdGlvbiBwYXJzZU5lZ2F0ZSAoKSB7XG4gIHZhciBwYXR0ZXJuID0gdGhpcy5wYXR0ZXJuXG4gIHZhciBuZWdhdGUgPSBmYWxzZVxuICB2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9uc1xuICB2YXIgbmVnYXRlT2Zmc2V0ID0gMFxuXG4gIGlmIChvcHRpb25zLm5vbmVnYXRlKSByZXR1cm5cblxuICBmb3IgKHZhciBpID0gMCwgbCA9IHBhdHRlcm4ubGVuZ3RoXG4gICAgOyBpIDwgbCAmJiBwYXR0ZXJuLmNoYXJBdChpKSA9PT0gJyEnXG4gICAgOyBpKyspIHtcbiAgICBuZWdhdGUgPSAhbmVnYXRlXG4gICAgbmVnYXRlT2Zmc2V0KytcbiAgfVxuXG4gIGlmIChuZWdhdGVPZmZzZXQpIHRoaXMucGF0dGVybiA9IHBhdHRlcm4uc3Vic3RyKG5lZ2F0ZU9mZnNldClcbiAgdGhpcy5uZWdhdGUgPSBuZWdhdGVcbn1cblxuLy8gQnJhY2UgZXhwYW5zaW9uOlxuLy8gYXtiLGN9ZCAtPiBhYmQgYWNkXG4vLyBhe2IsfWMgLT4gYWJjIGFjXG4vLyBhezAuLjN9ZCAtPiBhMGQgYTFkIGEyZCBhM2Rcbi8vIGF7Yixje2QsZX1mfWcgLT4gYWJnIGFjZGZnIGFjZWZnXG4vLyBhe2IsY31ke2UsZn1nIC0+IGFiZGVnIGFjZGVnIGFiZGVnIGFiZGZnXG4vL1xuLy8gSW52YWxpZCBzZXRzIGFyZSBub3QgZXhwYW5kZWQuXG4vLyBhezIuLn1iIC0+IGF7Mi4ufWJcbi8vIGF7Yn1jIC0+IGF7Yn1jXG5taW5pbWF0Y2guYnJhY2VFeHBhbmQgPSBmdW5jdGlvbiAocGF0dGVybiwgb3B0aW9ucykge1xuICByZXR1cm4gYnJhY2VFeHBhbmQocGF0dGVybiwgb3B0aW9ucylcbn1cblxuTWluaW1hdGNoLnByb3RvdHlwZS5icmFjZUV4cGFuZCA9IGJyYWNlRXhwYW5kXG5cbmZ1bmN0aW9uIGJyYWNlRXhwYW5kIChwYXR0ZXJuLCBvcHRpb25zKSB7XG4gIGlmICghb3B0aW9ucykge1xuICAgIGlmICh0aGlzIGluc3RhbmNlb2YgTWluaW1hdGNoKSB7XG4gICAgICBvcHRpb25zID0gdGhpcy5vcHRpb25zXG4gICAgfSBlbHNlIHtcbiAgICAgIG9wdGlvbnMgPSB7fVxuICAgIH1cbiAgfVxuXG4gIHBhdHRlcm4gPSB0eXBlb2YgcGF0dGVybiA9PT0gJ3VuZGVmaW5lZCdcbiAgICA/IHRoaXMucGF0dGVybiA6IHBhdHRlcm5cblxuICBpZiAodHlwZW9mIHBhdHRlcm4gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcigndW5kZWZpbmVkIHBhdHRlcm4nKVxuICB9XG5cbiAgaWYgKG9wdGlvbnMubm9icmFjZSB8fFxuICAgICFwYXR0ZXJuLm1hdGNoKC9cXHsuKlxcfS8pKSB7XG4gICAgLy8gc2hvcnRjdXQuIG5vIG5lZWQgdG8gZXhwYW5kLlxuICAgIHJldHVybiBbcGF0dGVybl1cbiAgfVxuXG4gIHJldHVybiBleHBhbmQocGF0dGVybilcbn1cblxuLy8gcGFyc2UgYSBjb21wb25lbnQgb2YgdGhlIGV4cGFuZGVkIHNldC5cbi8vIEF0IHRoaXMgcG9pbnQsIG5vIHBhdHRlcm4gbWF5IGNvbnRhaW4gXCIvXCIgaW4gaXRcbi8vIHNvIHdlJ3JlIGdvaW5nIHRvIHJldHVybiBhIDJkIGFycmF5LCB3aGVyZSBlYWNoIGVudHJ5IGlzIHRoZSBmdWxsXG4vLyBwYXR0ZXJuLCBzcGxpdCBvbiAnLycsIGFuZCB0aGVuIHR1cm5lZCBpbnRvIGEgcmVndWxhciBleHByZXNzaW9uLlxuLy8gQSByZWdleHAgaXMgbWFkZSBhdCB0aGUgZW5kIHdoaWNoIGpvaW5zIGVhY2ggYXJyYXkgd2l0aCBhblxuLy8gZXNjYXBlZCAvLCBhbmQgYW5vdGhlciBmdWxsIG9uZSB3aGljaCBqb2lucyBlYWNoIHJlZ2V4cCB3aXRoIHwuXG4vL1xuLy8gRm9sbG93aW5nIHRoZSBsZWFkIG9mIEJhc2ggNC4xLCBub3RlIHRoYXQgXCIqKlwiIG9ubHkgaGFzIHNwZWNpYWwgbWVhbmluZ1xuLy8gd2hlbiBpdCBpcyB0aGUgKm9ubHkqIHRoaW5nIGluIGEgcGF0aCBwb3J0aW9uLiAgT3RoZXJ3aXNlLCBhbnkgc2VyaWVzXG4vLyBvZiAqIGlzIGVxdWl2YWxlbnQgdG8gYSBzaW5nbGUgKi4gIEdsb2JzdGFyIGJlaGF2aW9yIGlzIGVuYWJsZWQgYnlcbi8vIGRlZmF1bHQsIGFuZCBjYW4gYmUgZGlzYWJsZWQgYnkgc2V0dGluZyBvcHRpb25zLm5vZ2xvYnN0YXIuXG5NaW5pbWF0Y2gucHJvdG90eXBlLnBhcnNlID0gcGFyc2VcbnZhciBTVUJQQVJTRSA9IHt9XG5mdW5jdGlvbiBwYXJzZSAocGF0dGVybiwgaXNTdWIpIHtcbiAgaWYgKHBhdHRlcm4ubGVuZ3RoID4gMTAyNCAqIDY0KSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcigncGF0dGVybiBpcyB0b28gbG9uZycpXG4gIH1cblxuICB2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9uc1xuXG4gIC8vIHNob3J0Y3V0c1xuICBpZiAoIW9wdGlvbnMubm9nbG9ic3RhciAmJiBwYXR0ZXJuID09PSAnKionKSByZXR1cm4gR0xPQlNUQVJcbiAgaWYgKHBhdHRlcm4gPT09ICcnKSByZXR1cm4gJydcblxuICB2YXIgcmUgPSAnJ1xuICB2YXIgaGFzTWFnaWMgPSAhIW9wdGlvbnMubm9jYXNlXG4gIHZhciBlc2NhcGluZyA9IGZhbHNlXG4gIC8vID8gPT4gb25lIHNpbmdsZSBjaGFyYWN0ZXJcbiAgdmFyIHBhdHRlcm5MaXN0U3RhY2sgPSBbXVxuICB2YXIgbmVnYXRpdmVMaXN0cyA9IFtdXG4gIHZhciBzdGF0ZUNoYXJcbiAgdmFyIGluQ2xhc3MgPSBmYWxzZVxuICB2YXIgcmVDbGFzc1N0YXJ0ID0gLTFcbiAgdmFyIGNsYXNzU3RhcnQgPSAtMVxuICAvLyAuIGFuZCAuLiBuZXZlciBtYXRjaCBhbnl0aGluZyB0aGF0IGRvZXNuJ3Qgc3RhcnQgd2l0aCAuLFxuICAvLyBldmVuIHdoZW4gb3B0aW9ucy5kb3QgaXMgc2V0LlxuICB2YXIgcGF0dGVyblN0YXJ0ID0gcGF0dGVybi5jaGFyQXQoMCkgPT09ICcuJyA/ICcnIC8vIGFueXRoaW5nXG4gIC8vIG5vdCAoc3RhcnQgb3IgLyBmb2xsb3dlZCBieSAuIG9yIC4uIGZvbGxvd2VkIGJ5IC8gb3IgZW5kKVxuICA6IG9wdGlvbnMuZG90ID8gJyg/ISg/Ol58XFxcXFxcLylcXFxcLnsxLDJ9KD86JHxcXFxcXFwvKSknXG4gIDogJyg/IVxcXFwuKSdcbiAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgZnVuY3Rpb24gY2xlYXJTdGF0ZUNoYXIgKCkge1xuICAgIGlmIChzdGF0ZUNoYXIpIHtcbiAgICAgIC8vIHdlIGhhZCBzb21lIHN0YXRlLXRyYWNraW5nIGNoYXJhY3RlclxuICAgICAgLy8gdGhhdCB3YXNuJ3QgY29uc3VtZWQgYnkgdGhpcyBwYXNzLlxuICAgICAgc3dpdGNoIChzdGF0ZUNoYXIpIHtcbiAgICAgICAgY2FzZSAnKic6XG4gICAgICAgICAgcmUgKz0gc3RhclxuICAgICAgICAgIGhhc01hZ2ljID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgICBjYXNlICc/JzpcbiAgICAgICAgICByZSArPSBxbWFya1xuICAgICAgICAgIGhhc01hZ2ljID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJlICs9ICdcXFxcJyArIHN0YXRlQ2hhclxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgc2VsZi5kZWJ1ZygnY2xlYXJTdGF0ZUNoYXIgJWogJWonLCBzdGF0ZUNoYXIsIHJlKVxuICAgICAgc3RhdGVDaGFyID0gZmFsc2VcbiAgICB9XG4gIH1cblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gcGF0dGVybi5sZW5ndGgsIGNcbiAgICA7IChpIDwgbGVuKSAmJiAoYyA9IHBhdHRlcm4uY2hhckF0KGkpKVxuICAgIDsgaSsrKSB7XG4gICAgdGhpcy5kZWJ1ZygnJXNcXHQlcyAlcyAlaicsIHBhdHRlcm4sIGksIHJlLCBjKVxuXG4gICAgLy8gc2tpcCBvdmVyIGFueSB0aGF0IGFyZSBlc2NhcGVkLlxuICAgIGlmIChlc2NhcGluZyAmJiByZVNwZWNpYWxzW2NdKSB7XG4gICAgICByZSArPSAnXFxcXCcgKyBjXG4gICAgICBlc2NhcGluZyA9IGZhbHNlXG4gICAgICBjb250aW51ZVxuICAgIH1cblxuICAgIHN3aXRjaCAoYykge1xuICAgICAgY2FzZSAnLyc6XG4gICAgICAgIC8vIGNvbXBsZXRlbHkgbm90IGFsbG93ZWQsIGV2ZW4gZXNjYXBlZC5cbiAgICAgICAgLy8gU2hvdWxkIGFscmVhZHkgYmUgcGF0aC1zcGxpdCBieSBub3cuXG4gICAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgICBjYXNlICdcXFxcJzpcbiAgICAgICAgY2xlYXJTdGF0ZUNoYXIoKVxuICAgICAgICBlc2NhcGluZyA9IHRydWVcbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIC8vIHRoZSB2YXJpb3VzIHN0YXRlQ2hhciB2YWx1ZXNcbiAgICAgIC8vIGZvciB0aGUgXCJleHRnbG9iXCIgc3R1ZmYuXG4gICAgICBjYXNlICc/JzpcbiAgICAgIGNhc2UgJyonOlxuICAgICAgY2FzZSAnKyc6XG4gICAgICBjYXNlICdAJzpcbiAgICAgIGNhc2UgJyEnOlxuICAgICAgICB0aGlzLmRlYnVnKCclc1xcdCVzICVzICVqIDwtLSBzdGF0ZUNoYXInLCBwYXR0ZXJuLCBpLCByZSwgYylcblxuICAgICAgICAvLyBhbGwgb2YgdGhvc2UgYXJlIGxpdGVyYWxzIGluc2lkZSBhIGNsYXNzLCBleGNlcHQgdGhhdFxuICAgICAgICAvLyB0aGUgZ2xvYiBbIWFdIG1lYW5zIFteYV0gaW4gcmVnZXhwXG4gICAgICAgIGlmIChpbkNsYXNzKSB7XG4gICAgICAgICAgdGhpcy5kZWJ1ZygnICBpbiBjbGFzcycpXG4gICAgICAgICAgaWYgKGMgPT09ICchJyAmJiBpID09PSBjbGFzc1N0YXJ0ICsgMSkgYyA9ICdeJ1xuICAgICAgICAgIHJlICs9IGNcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgd2UgYWxyZWFkeSBoYXZlIGEgc3RhdGVDaGFyLCB0aGVuIGl0IG1lYW5zXG4gICAgICAgIC8vIHRoYXQgdGhlcmUgd2FzIHNvbWV0aGluZyBsaWtlICoqIG9yICs/IGluIHRoZXJlLlxuICAgICAgICAvLyBIYW5kbGUgdGhlIHN0YXRlQ2hhciwgdGhlbiBwcm9jZWVkIHdpdGggdGhpcyBvbmUuXG4gICAgICAgIHNlbGYuZGVidWcoJ2NhbGwgY2xlYXJTdGF0ZUNoYXIgJWonLCBzdGF0ZUNoYXIpXG4gICAgICAgIGNsZWFyU3RhdGVDaGFyKClcbiAgICAgICAgc3RhdGVDaGFyID0gY1xuICAgICAgICAvLyBpZiBleHRnbG9iIGlzIGRpc2FibGVkLCB0aGVuICsoYXNkZnxmb28pIGlzbid0IGEgdGhpbmcuXG4gICAgICAgIC8vIGp1c3QgY2xlYXIgdGhlIHN0YXRlY2hhciAqbm93KiwgcmF0aGVyIHRoYW4gZXZlbiBkaXZpbmcgaW50b1xuICAgICAgICAvLyB0aGUgcGF0dGVybkxpc3Qgc3R1ZmYuXG4gICAgICAgIGlmIChvcHRpb25zLm5vZXh0KSBjbGVhclN0YXRlQ2hhcigpXG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlICcoJzpcbiAgICAgICAgaWYgKGluQ2xhc3MpIHtcbiAgICAgICAgICByZSArPSAnKCdcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFzdGF0ZUNoYXIpIHtcbiAgICAgICAgICByZSArPSAnXFxcXCgnXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIHBhdHRlcm5MaXN0U3RhY2sucHVzaCh7XG4gICAgICAgICAgdHlwZTogc3RhdGVDaGFyLFxuICAgICAgICAgIHN0YXJ0OiBpIC0gMSxcbiAgICAgICAgICByZVN0YXJ0OiByZS5sZW5ndGgsXG4gICAgICAgICAgb3BlbjogcGxUeXBlc1tzdGF0ZUNoYXJdLm9wZW4sXG4gICAgICAgICAgY2xvc2U6IHBsVHlwZXNbc3RhdGVDaGFyXS5jbG9zZVxuICAgICAgICB9KVxuICAgICAgICAvLyBuZWdhdGlvbiBpcyAoPzooPyFqcylbXi9dKilcbiAgICAgICAgcmUgKz0gc3RhdGVDaGFyID09PSAnIScgPyAnKD86KD8hKD86JyA6ICcoPzonXG4gICAgICAgIHRoaXMuZGVidWcoJ3BsVHlwZSAlaiAlaicsIHN0YXRlQ2hhciwgcmUpXG4gICAgICAgIHN0YXRlQ2hhciA9IGZhbHNlXG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlICcpJzpcbiAgICAgICAgaWYgKGluQ2xhc3MgfHwgIXBhdHRlcm5MaXN0U3RhY2subGVuZ3RoKSB7XG4gICAgICAgICAgcmUgKz0gJ1xcXFwpJ1xuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICBjbGVhclN0YXRlQ2hhcigpXG4gICAgICAgIGhhc01hZ2ljID0gdHJ1ZVxuICAgICAgICB2YXIgcGwgPSBwYXR0ZXJuTGlzdFN0YWNrLnBvcCgpXG4gICAgICAgIC8vIG5lZ2F0aW9uIGlzICg/Oig/IWpzKVteL10qKVxuICAgICAgICAvLyBUaGUgb3RoZXJzIGFyZSAoPzo8cGF0dGVybj4pPHR5cGU+XG4gICAgICAgIHJlICs9IHBsLmNsb3NlXG4gICAgICAgIGlmIChwbC50eXBlID09PSAnIScpIHtcbiAgICAgICAgICBuZWdhdGl2ZUxpc3RzLnB1c2gocGwpXG4gICAgICAgIH1cbiAgICAgICAgcGwucmVFbmQgPSByZS5sZW5ndGhcbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgJ3wnOlxuICAgICAgICBpZiAoaW5DbGFzcyB8fCAhcGF0dGVybkxpc3RTdGFjay5sZW5ndGggfHwgZXNjYXBpbmcpIHtcbiAgICAgICAgICByZSArPSAnXFxcXHwnXG4gICAgICAgICAgZXNjYXBpbmcgPSBmYWxzZVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICBjbGVhclN0YXRlQ2hhcigpXG4gICAgICAgIHJlICs9ICd8J1xuICAgICAgY29udGludWVcblxuICAgICAgLy8gdGhlc2UgYXJlIG1vc3RseSB0aGUgc2FtZSBpbiByZWdleHAgYW5kIGdsb2JcbiAgICAgIGNhc2UgJ1snOlxuICAgICAgICAvLyBzd2FsbG93IGFueSBzdGF0ZS10cmFja2luZyBjaGFyIGJlZm9yZSB0aGUgW1xuICAgICAgICBjbGVhclN0YXRlQ2hhcigpXG5cbiAgICAgICAgaWYgKGluQ2xhc3MpIHtcbiAgICAgICAgICByZSArPSAnXFxcXCcgKyBjXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIGluQ2xhc3MgPSB0cnVlXG4gICAgICAgIGNsYXNzU3RhcnQgPSBpXG4gICAgICAgIHJlQ2xhc3NTdGFydCA9IHJlLmxlbmd0aFxuICAgICAgICByZSArPSBjXG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlICddJzpcbiAgICAgICAgLy8gIGEgcmlnaHQgYnJhY2tldCBzaGFsbCBsb3NlIGl0cyBzcGVjaWFsXG4gICAgICAgIC8vICBtZWFuaW5nIGFuZCByZXByZXNlbnQgaXRzZWxmIGluXG4gICAgICAgIC8vICBhIGJyYWNrZXQgZXhwcmVzc2lvbiBpZiBpdCBvY2N1cnNcbiAgICAgICAgLy8gIGZpcnN0IGluIHRoZSBsaXN0LiAgLS0gUE9TSVguMiAyLjguMy4yXG4gICAgICAgIGlmIChpID09PSBjbGFzc1N0YXJ0ICsgMSB8fCAhaW5DbGFzcykge1xuICAgICAgICAgIHJlICs9ICdcXFxcJyArIGNcbiAgICAgICAgICBlc2NhcGluZyA9IGZhbHNlXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGhhbmRsZSB0aGUgY2FzZSB3aGVyZSB3ZSBsZWZ0IGEgY2xhc3Mgb3Blbi5cbiAgICAgICAgLy8gXCJbei1hXVwiIGlzIHZhbGlkLCBlcXVpdmFsZW50IHRvIFwiXFxbei1hXFxdXCJcbiAgICAgICAgaWYgKGluQ2xhc3MpIHtcbiAgICAgICAgICAvLyBzcGxpdCB3aGVyZSB0aGUgbGFzdCBbIHdhcywgbWFrZSBzdXJlIHdlIGRvbid0IGhhdmVcbiAgICAgICAgICAvLyBhbiBpbnZhbGlkIHJlLiBpZiBzbywgcmUtd2FsayB0aGUgY29udGVudHMgb2YgdGhlXG4gICAgICAgICAgLy8gd291bGQtYmUgY2xhc3MgdG8gcmUtdHJhbnNsYXRlIGFueSBjaGFyYWN0ZXJzIHRoYXRcbiAgICAgICAgICAvLyB3ZXJlIHBhc3NlZCB0aHJvdWdoIGFzLWlzXG4gICAgICAgICAgLy8gVE9ETzogSXQgd291bGQgcHJvYmFibHkgYmUgZmFzdGVyIHRvIGRldGVybWluZSB0aGlzXG4gICAgICAgICAgLy8gd2l0aG91dCBhIHRyeS9jYXRjaCBhbmQgYSBuZXcgUmVnRXhwLCBidXQgaXQncyB0cmlja3lcbiAgICAgICAgICAvLyB0byBkbyBzYWZlbHkuICBGb3Igbm93LCB0aGlzIGlzIHNhZmUgYW5kIHdvcmtzLlxuICAgICAgICAgIHZhciBjcyA9IHBhdHRlcm4uc3Vic3RyaW5nKGNsYXNzU3RhcnQgKyAxLCBpKVxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBSZWdFeHAoJ1snICsgY3MgKyAnXScpXG4gICAgICAgICAgfSBjYXRjaCAoZXIpIHtcbiAgICAgICAgICAgIC8vIG5vdCBhIHZhbGlkIGNsYXNzIVxuICAgICAgICAgICAgdmFyIHNwID0gdGhpcy5wYXJzZShjcywgU1VCUEFSU0UpXG4gICAgICAgICAgICByZSA9IHJlLnN1YnN0cigwLCByZUNsYXNzU3RhcnQpICsgJ1xcXFxbJyArIHNwWzBdICsgJ1xcXFxdJ1xuICAgICAgICAgICAgaGFzTWFnaWMgPSBoYXNNYWdpYyB8fCBzcFsxXVxuICAgICAgICAgICAgaW5DbGFzcyA9IGZhbHNlXG4gICAgICAgICAgICBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGZpbmlzaCB1cCB0aGUgY2xhc3MuXG4gICAgICAgIGhhc01hZ2ljID0gdHJ1ZVxuICAgICAgICBpbkNsYXNzID0gZmFsc2VcbiAgICAgICAgcmUgKz0gY1xuICAgICAgY29udGludWVcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgLy8gc3dhbGxvdyBhbnkgc3RhdGUgY2hhciB0aGF0IHdhc24ndCBjb25zdW1lZFxuICAgICAgICBjbGVhclN0YXRlQ2hhcigpXG5cbiAgICAgICAgaWYgKGVzY2FwaW5nKSB7XG4gICAgICAgICAgLy8gbm8gbmVlZFxuICAgICAgICAgIGVzY2FwaW5nID0gZmFsc2VcbiAgICAgICAgfSBlbHNlIGlmIChyZVNwZWNpYWxzW2NdXG4gICAgICAgICAgJiYgIShjID09PSAnXicgJiYgaW5DbGFzcykpIHtcbiAgICAgICAgICByZSArPSAnXFxcXCdcbiAgICAgICAgfVxuXG4gICAgICAgIHJlICs9IGNcblxuICAgIH0gLy8gc3dpdGNoXG4gIH0gLy8gZm9yXG5cbiAgLy8gaGFuZGxlIHRoZSBjYXNlIHdoZXJlIHdlIGxlZnQgYSBjbGFzcyBvcGVuLlxuICAvLyBcIlthYmNcIiBpcyB2YWxpZCwgZXF1aXZhbGVudCB0byBcIlxcW2FiY1wiXG4gIGlmIChpbkNsYXNzKSB7XG4gICAgLy8gc3BsaXQgd2hlcmUgdGhlIGxhc3QgWyB3YXMsIGFuZCBlc2NhcGUgaXRcbiAgICAvLyB0aGlzIGlzIGEgaHVnZSBwaXRhLiAgV2Ugbm93IGhhdmUgdG8gcmUtd2Fsa1xuICAgIC8vIHRoZSBjb250ZW50cyBvZiB0aGUgd291bGQtYmUgY2xhc3MgdG8gcmUtdHJhbnNsYXRlXG4gICAgLy8gYW55IGNoYXJhY3RlcnMgdGhhdCB3ZXJlIHBhc3NlZCB0aHJvdWdoIGFzLWlzXG4gICAgY3MgPSBwYXR0ZXJuLnN1YnN0cihjbGFzc1N0YXJ0ICsgMSlcbiAgICBzcCA9IHRoaXMucGFyc2UoY3MsIFNVQlBBUlNFKVxuICAgIHJlID0gcmUuc3Vic3RyKDAsIHJlQ2xhc3NTdGFydCkgKyAnXFxcXFsnICsgc3BbMF1cbiAgICBoYXNNYWdpYyA9IGhhc01hZ2ljIHx8IHNwWzFdXG4gIH1cblxuICAvLyBoYW5kbGUgdGhlIGNhc2Ugd2hlcmUgd2UgaGFkIGEgKyggdGhpbmcgYXQgdGhlICplbmQqXG4gIC8vIG9mIHRoZSBwYXR0ZXJuLlxuICAvLyBlYWNoIHBhdHRlcm4gbGlzdCBzdGFjayBhZGRzIDMgY2hhcnMsIGFuZCB3ZSBuZWVkIHRvIGdvIHRocm91Z2hcbiAgLy8gYW5kIGVzY2FwZSBhbnkgfCBjaGFycyB0aGF0IHdlcmUgcGFzc2VkIHRocm91Z2ggYXMtaXMgZm9yIHRoZSByZWdleHAuXG4gIC8vIEdvIHRocm91Z2ggYW5kIGVzY2FwZSB0aGVtLCB0YWtpbmcgY2FyZSBub3QgdG8gZG91YmxlLWVzY2FwZSBhbnlcbiAgLy8gfCBjaGFycyB0aGF0IHdlcmUgYWxyZWFkeSBlc2NhcGVkLlxuICBmb3IgKHBsID0gcGF0dGVybkxpc3RTdGFjay5wb3AoKTsgcGw7IHBsID0gcGF0dGVybkxpc3RTdGFjay5wb3AoKSkge1xuICAgIHZhciB0YWlsID0gcmUuc2xpY2UocGwucmVTdGFydCArIHBsLm9wZW4ubGVuZ3RoKVxuICAgIHRoaXMuZGVidWcoJ3NldHRpbmcgdGFpbCcsIHJlLCBwbClcbiAgICAvLyBtYXliZSBzb21lIGV2ZW4gbnVtYmVyIG9mIFxcLCB0aGVuIG1heWJlIDEgXFwsIGZvbGxvd2VkIGJ5IGEgfFxuICAgIHRhaWwgPSB0YWlsLnJlcGxhY2UoLygoPzpcXFxcezJ9KXswLDY0fSkoXFxcXD8pXFx8L2csIGZ1bmN0aW9uIChfLCAkMSwgJDIpIHtcbiAgICAgIGlmICghJDIpIHtcbiAgICAgICAgLy8gdGhlIHwgaXNuJ3QgYWxyZWFkeSBlc2NhcGVkLCBzbyBlc2NhcGUgaXQuXG4gICAgICAgICQyID0gJ1xcXFwnXG4gICAgICB9XG5cbiAgICAgIC8vIG5lZWQgdG8gZXNjYXBlIGFsbCB0aG9zZSBzbGFzaGVzICphZ2FpbiosIHdpdGhvdXQgZXNjYXBpbmcgdGhlXG4gICAgICAvLyBvbmUgdGhhdCB3ZSBuZWVkIGZvciBlc2NhcGluZyB0aGUgfCBjaGFyYWN0ZXIuICBBcyBpdCB3b3JrcyBvdXQsXG4gICAgICAvLyBlc2NhcGluZyBhbiBldmVuIG51bWJlciBvZiBzbGFzaGVzIGNhbiBiZSBkb25lIGJ5IHNpbXBseSByZXBlYXRpbmdcbiAgICAgIC8vIGl0IGV4YWN0bHkgYWZ0ZXIgaXRzZWxmLiAgVGhhdCdzIHdoeSB0aGlzIHRyaWNrIHdvcmtzLlxuICAgICAgLy9cbiAgICAgIC8vIEkgYW0gc29ycnkgdGhhdCB5b3UgaGF2ZSB0byBzZWUgdGhpcy5cbiAgICAgIHJldHVybiAkMSArICQxICsgJDIgKyAnfCdcbiAgICB9KVxuXG4gICAgdGhpcy5kZWJ1ZygndGFpbD0lalxcbiAgICVzJywgdGFpbCwgdGFpbCwgcGwsIHJlKVxuICAgIHZhciB0ID0gcGwudHlwZSA9PT0gJyonID8gc3RhclxuICAgICAgOiBwbC50eXBlID09PSAnPycgPyBxbWFya1xuICAgICAgOiAnXFxcXCcgKyBwbC50eXBlXG5cbiAgICBoYXNNYWdpYyA9IHRydWVcbiAgICByZSA9IHJlLnNsaWNlKDAsIHBsLnJlU3RhcnQpICsgdCArICdcXFxcKCcgKyB0YWlsXG4gIH1cblxuICAvLyBoYW5kbGUgdHJhaWxpbmcgdGhpbmdzIHRoYXQgb25seSBtYXR0ZXIgYXQgdGhlIHZlcnkgZW5kLlxuICBjbGVhclN0YXRlQ2hhcigpXG4gIGlmIChlc2NhcGluZykge1xuICAgIC8vIHRyYWlsaW5nIFxcXFxcbiAgICByZSArPSAnXFxcXFxcXFwnXG4gIH1cblxuICAvLyBvbmx5IG5lZWQgdG8gYXBwbHkgdGhlIG5vZG90IHN0YXJ0IGlmIHRoZSByZSBzdGFydHMgd2l0aFxuICAvLyBzb21ldGhpbmcgdGhhdCBjb3VsZCBjb25jZWl2YWJseSBjYXB0dXJlIGEgZG90XG4gIHZhciBhZGRQYXR0ZXJuU3RhcnQgPSBmYWxzZVxuICBzd2l0Y2ggKHJlLmNoYXJBdCgwKSkge1xuICAgIGNhc2UgJy4nOlxuICAgIGNhc2UgJ1snOlxuICAgIGNhc2UgJygnOiBhZGRQYXR0ZXJuU3RhcnQgPSB0cnVlXG4gIH1cblxuICAvLyBIYWNrIHRvIHdvcmsgYXJvdW5kIGxhY2sgb2YgbmVnYXRpdmUgbG9va2JlaGluZCBpbiBKU1xuICAvLyBBIHBhdHRlcm4gbGlrZTogKi4hKHgpLiEoeXx6KSBuZWVkcyB0byBlbnN1cmUgdGhhdCBhIG5hbWVcbiAgLy8gbGlrZSAnYS54eXoueXonIGRvZXNuJ3QgbWF0Y2guICBTbywgdGhlIGZpcnN0IG5lZ2F0aXZlXG4gIC8vIGxvb2thaGVhZCwgaGFzIHRvIGxvb2sgQUxMIHRoZSB3YXkgYWhlYWQsIHRvIHRoZSBlbmQgb2ZcbiAgLy8gdGhlIHBhdHRlcm4uXG4gIGZvciAodmFyIG4gPSBuZWdhdGl2ZUxpc3RzLmxlbmd0aCAtIDE7IG4gPiAtMTsgbi0tKSB7XG4gICAgdmFyIG5sID0gbmVnYXRpdmVMaXN0c1tuXVxuXG4gICAgdmFyIG5sQmVmb3JlID0gcmUuc2xpY2UoMCwgbmwucmVTdGFydClcbiAgICB2YXIgbmxGaXJzdCA9IHJlLnNsaWNlKG5sLnJlU3RhcnQsIG5sLnJlRW5kIC0gOClcbiAgICB2YXIgbmxMYXN0ID0gcmUuc2xpY2UobmwucmVFbmQgLSA4LCBubC5yZUVuZClcbiAgICB2YXIgbmxBZnRlciA9IHJlLnNsaWNlKG5sLnJlRW5kKVxuXG4gICAgbmxMYXN0ICs9IG5sQWZ0ZXJcblxuICAgIC8vIEhhbmRsZSBuZXN0ZWQgc3R1ZmYgbGlrZSAqKCouanN8ISgqLmpzb24pKSwgd2hlcmUgb3BlbiBwYXJlbnNcbiAgICAvLyBtZWFuIHRoYXQgd2Ugc2hvdWxkICpub3QqIGluY2x1ZGUgdGhlICkgaW4gdGhlIGJpdCB0aGF0IGlzIGNvbnNpZGVyZWRcbiAgICAvLyBcImFmdGVyXCIgdGhlIG5lZ2F0ZWQgc2VjdGlvbi5cbiAgICB2YXIgb3BlblBhcmVuc0JlZm9yZSA9IG5sQmVmb3JlLnNwbGl0KCcoJykubGVuZ3RoIC0gMVxuICAgIHZhciBjbGVhbkFmdGVyID0gbmxBZnRlclxuICAgIGZvciAoaSA9IDA7IGkgPCBvcGVuUGFyZW5zQmVmb3JlOyBpKyspIHtcbiAgICAgIGNsZWFuQWZ0ZXIgPSBjbGVhbkFmdGVyLnJlcGxhY2UoL1xcKVsrKj9dPy8sICcnKVxuICAgIH1cbiAgICBubEFmdGVyID0gY2xlYW5BZnRlclxuXG4gICAgdmFyIGRvbGxhciA9ICcnXG4gICAgaWYgKG5sQWZ0ZXIgPT09ICcnICYmIGlzU3ViICE9PSBTVUJQQVJTRSkge1xuICAgICAgZG9sbGFyID0gJyQnXG4gICAgfVxuICAgIHZhciBuZXdSZSA9IG5sQmVmb3JlICsgbmxGaXJzdCArIG5sQWZ0ZXIgKyBkb2xsYXIgKyBubExhc3RcbiAgICByZSA9IG5ld1JlXG4gIH1cblxuICAvLyBpZiB0aGUgcmUgaXMgbm90IFwiXCIgYXQgdGhpcyBwb2ludCwgdGhlbiB3ZSBuZWVkIHRvIG1ha2Ugc3VyZVxuICAvLyBpdCBkb2Vzbid0IG1hdGNoIGFnYWluc3QgYW4gZW1wdHkgcGF0aCBwYXJ0LlxuICAvLyBPdGhlcndpc2UgYS8qIHdpbGwgbWF0Y2ggYS8sIHdoaWNoIGl0IHNob3VsZCBub3QuXG4gIGlmIChyZSAhPT0gJycgJiYgaGFzTWFnaWMpIHtcbiAgICByZSA9ICcoPz0uKScgKyByZVxuICB9XG5cbiAgaWYgKGFkZFBhdHRlcm5TdGFydCkge1xuICAgIHJlID0gcGF0dGVyblN0YXJ0ICsgcmVcbiAgfVxuXG4gIC8vIHBhcnNpbmcganVzdCBhIHBpZWNlIG9mIGEgbGFyZ2VyIHBhdHRlcm4uXG4gIGlmIChpc1N1YiA9PT0gU1VCUEFSU0UpIHtcbiAgICByZXR1cm4gW3JlLCBoYXNNYWdpY11cbiAgfVxuXG4gIC8vIHNraXAgdGhlIHJlZ2V4cCBmb3Igbm9uLW1hZ2ljYWwgcGF0dGVybnNcbiAgLy8gdW5lc2NhcGUgYW55dGhpbmcgaW4gaXQsIHRob3VnaCwgc28gdGhhdCBpdCdsbCBiZVxuICAvLyBhbiBleGFjdCBtYXRjaCBhZ2FpbnN0IGEgZmlsZSBldGMuXG4gIGlmICghaGFzTWFnaWMpIHtcbiAgICByZXR1cm4gZ2xvYlVuZXNjYXBlKHBhdHRlcm4pXG4gIH1cblxuICB2YXIgZmxhZ3MgPSBvcHRpb25zLm5vY2FzZSA/ICdpJyA6ICcnXG4gIHRyeSB7XG4gICAgdmFyIHJlZ0V4cCA9IG5ldyBSZWdFeHAoJ14nICsgcmUgKyAnJCcsIGZsYWdzKVxuICB9IGNhdGNoIChlcikge1xuICAgIC8vIElmIGl0IHdhcyBhbiBpbnZhbGlkIHJlZ3VsYXIgZXhwcmVzc2lvbiwgdGhlbiBpdCBjYW4ndCBtYXRjaFxuICAgIC8vIGFueXRoaW5nLiAgVGhpcyB0cmljayBsb29rcyBmb3IgYSBjaGFyYWN0ZXIgYWZ0ZXIgdGhlIGVuZCBvZlxuICAgIC8vIHRoZSBzdHJpbmcsIHdoaWNoIGlzIG9mIGNvdXJzZSBpbXBvc3NpYmxlLCBleGNlcHQgaW4gbXVsdGktbGluZVxuICAgIC8vIG1vZGUsIGJ1dCBpdCdzIG5vdCBhIC9tIHJlZ2V4LlxuICAgIHJldHVybiBuZXcgUmVnRXhwKCckLicpXG4gIH1cblxuICByZWdFeHAuX2dsb2IgPSBwYXR0ZXJuXG4gIHJlZ0V4cC5fc3JjID0gcmVcblxuICByZXR1cm4gcmVnRXhwXG59XG5cbm1pbmltYXRjaC5tYWtlUmUgPSBmdW5jdGlvbiAocGF0dGVybiwgb3B0aW9ucykge1xuICByZXR1cm4gbmV3IE1pbmltYXRjaChwYXR0ZXJuLCBvcHRpb25zIHx8IHt9KS5tYWtlUmUoKVxufVxuXG5NaW5pbWF0Y2gucHJvdG90eXBlLm1ha2VSZSA9IG1ha2VSZVxuZnVuY3Rpb24gbWFrZVJlICgpIHtcbiAgaWYgKHRoaXMucmVnZXhwIHx8IHRoaXMucmVnZXhwID09PSBmYWxzZSkgcmV0dXJuIHRoaXMucmVnZXhwXG5cbiAgLy8gYXQgdGhpcyBwb2ludCwgdGhpcy5zZXQgaXMgYSAyZCBhcnJheSBvZiBwYXJ0aWFsXG4gIC8vIHBhdHRlcm4gc3RyaW5ncywgb3IgXCIqKlwiLlxuICAvL1xuICAvLyBJdCdzIGJldHRlciB0byB1c2UgLm1hdGNoKCkuICBUaGlzIGZ1bmN0aW9uIHNob3VsZG4ndFxuICAvLyBiZSB1c2VkLCByZWFsbHksIGJ1dCBpdCdzIHByZXR0eSBjb252ZW5pZW50IHNvbWV0aW1lcyxcbiAgLy8gd2hlbiB5b3UganVzdCB3YW50IHRvIHdvcmsgd2l0aCBhIHJlZ2V4LlxuICB2YXIgc2V0ID0gdGhpcy5zZXRcblxuICBpZiAoIXNldC5sZW5ndGgpIHtcbiAgICB0aGlzLnJlZ2V4cCA9IGZhbHNlXG4gICAgcmV0dXJuIHRoaXMucmVnZXhwXG4gIH1cbiAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnNcblxuICB2YXIgdHdvU3RhciA9IG9wdGlvbnMubm9nbG9ic3RhciA/IHN0YXJcbiAgICA6IG9wdGlvbnMuZG90ID8gdHdvU3RhckRvdFxuICAgIDogdHdvU3Rhck5vRG90XG4gIHZhciBmbGFncyA9IG9wdGlvbnMubm9jYXNlID8gJ2knIDogJydcblxuICB2YXIgcmUgPSBzZXQubWFwKGZ1bmN0aW9uIChwYXR0ZXJuKSB7XG4gICAgcmV0dXJuIHBhdHRlcm4ubWFwKGZ1bmN0aW9uIChwKSB7XG4gICAgICByZXR1cm4gKHAgPT09IEdMT0JTVEFSKSA/IHR3b1N0YXJcbiAgICAgIDogKHR5cGVvZiBwID09PSAnc3RyaW5nJykgPyByZWdFeHBFc2NhcGUocClcbiAgICAgIDogcC5fc3JjXG4gICAgfSkuam9pbignXFxcXFxcLycpXG4gIH0pLmpvaW4oJ3wnKVxuXG4gIC8vIG11c3QgbWF0Y2ggZW50aXJlIHBhdHRlcm5cbiAgLy8gZW5kaW5nIGluIGEgKiBvciAqKiB3aWxsIG1ha2UgaXQgbGVzcyBzdHJpY3QuXG4gIHJlID0gJ14oPzonICsgcmUgKyAnKSQnXG5cbiAgLy8gY2FuIG1hdGNoIGFueXRoaW5nLCBhcyBsb25nIGFzIGl0J3Mgbm90IHRoaXMuXG4gIGlmICh0aGlzLm5lZ2F0ZSkgcmUgPSAnXig/IScgKyByZSArICcpLiokJ1xuXG4gIHRyeSB7XG4gICAgdGhpcy5yZWdleHAgPSBuZXcgUmVnRXhwKHJlLCBmbGFncylcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICB0aGlzLnJlZ2V4cCA9IGZhbHNlXG4gIH1cbiAgcmV0dXJuIHRoaXMucmVnZXhwXG59XG5cbm1pbmltYXRjaC5tYXRjaCA9IGZ1bmN0aW9uIChsaXN0LCBwYXR0ZXJuLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gIHZhciBtbSA9IG5ldyBNaW5pbWF0Y2gocGF0dGVybiwgb3B0aW9ucylcbiAgbGlzdCA9IGxpc3QuZmlsdGVyKGZ1bmN0aW9uIChmKSB7XG4gICAgcmV0dXJuIG1tLm1hdGNoKGYpXG4gIH0pXG4gIGlmIChtbS5vcHRpb25zLm5vbnVsbCAmJiAhbGlzdC5sZW5ndGgpIHtcbiAgICBsaXN0LnB1c2gocGF0dGVybilcbiAgfVxuICByZXR1cm4gbGlzdFxufVxuXG5NaW5pbWF0Y2gucHJvdG90eXBlLm1hdGNoID0gbWF0Y2hcbmZ1bmN0aW9uIG1hdGNoIChmLCBwYXJ0aWFsKSB7XG4gIHRoaXMuZGVidWcoJ21hdGNoJywgZiwgdGhpcy5wYXR0ZXJuKVxuICAvLyBzaG9ydC1jaXJjdWl0IGluIHRoZSBjYXNlIG9mIGJ1c3RlZCB0aGluZ3MuXG4gIC8vIGNvbW1lbnRzLCBldGMuXG4gIGlmICh0aGlzLmNvbW1lbnQpIHJldHVybiBmYWxzZVxuICBpZiAodGhpcy5lbXB0eSkgcmV0dXJuIGYgPT09ICcnXG5cbiAgaWYgKGYgPT09ICcvJyAmJiBwYXJ0aWFsKSByZXR1cm4gdHJ1ZVxuXG4gIHZhciBvcHRpb25zID0gdGhpcy5vcHRpb25zXG5cbiAgLy8gd2luZG93czogbmVlZCB0byB1c2UgLywgbm90IFxcXG4gIGlmIChwYXRoLnNlcCAhPT0gJy8nKSB7XG4gICAgZiA9IGYuc3BsaXQocGF0aC5zZXApLmpvaW4oJy8nKVxuICB9XG5cbiAgLy8gdHJlYXQgdGhlIHRlc3QgcGF0aCBhcyBhIHNldCBvZiBwYXRocGFydHMuXG4gIGYgPSBmLnNwbGl0KHNsYXNoU3BsaXQpXG4gIHRoaXMuZGVidWcodGhpcy5wYXR0ZXJuLCAnc3BsaXQnLCBmKVxuXG4gIC8vIGp1c3QgT05FIG9mIHRoZSBwYXR0ZXJuIHNldHMgaW4gdGhpcy5zZXQgbmVlZHMgdG8gbWF0Y2hcbiAgLy8gaW4gb3JkZXIgZm9yIGl0IHRvIGJlIHZhbGlkLiAgSWYgbmVnYXRpbmcsIHRoZW4ganVzdCBvbmVcbiAgLy8gbWF0Y2ggbWVhbnMgdGhhdCB3ZSBoYXZlIGZhaWxlZC5cbiAgLy8gRWl0aGVyIHdheSwgcmV0dXJuIG9uIHRoZSBmaXJzdCBoaXQuXG5cbiAgdmFyIHNldCA9IHRoaXMuc2V0XG4gIHRoaXMuZGVidWcodGhpcy5wYXR0ZXJuLCAnc2V0Jywgc2V0KVxuXG4gIC8vIEZpbmQgdGhlIGJhc2VuYW1lIG9mIHRoZSBwYXRoIGJ5IGxvb2tpbmcgZm9yIHRoZSBsYXN0IG5vbi1lbXB0eSBzZWdtZW50XG4gIHZhciBmaWxlbmFtZVxuICB2YXIgaVxuICBmb3IgKGkgPSBmLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgZmlsZW5hbWUgPSBmW2ldXG4gICAgaWYgKGZpbGVuYW1lKSBicmVha1xuICB9XG5cbiAgZm9yIChpID0gMDsgaSA8IHNldC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBwYXR0ZXJuID0gc2V0W2ldXG4gICAgdmFyIGZpbGUgPSBmXG4gICAgaWYgKG9wdGlvbnMubWF0Y2hCYXNlICYmIHBhdHRlcm4ubGVuZ3RoID09PSAxKSB7XG4gICAgICBmaWxlID0gW2ZpbGVuYW1lXVxuICAgIH1cbiAgICB2YXIgaGl0ID0gdGhpcy5tYXRjaE9uZShmaWxlLCBwYXR0ZXJuLCBwYXJ0aWFsKVxuICAgIGlmIChoaXQpIHtcbiAgICAgIGlmIChvcHRpb25zLmZsaXBOZWdhdGUpIHJldHVybiB0cnVlXG4gICAgICByZXR1cm4gIXRoaXMubmVnYXRlXG4gICAgfVxuICB9XG5cbiAgLy8gZGlkbid0IGdldCBhbnkgaGl0cy4gIHRoaXMgaXMgc3VjY2VzcyBpZiBpdCdzIGEgbmVnYXRpdmVcbiAgLy8gcGF0dGVybiwgZmFpbHVyZSBvdGhlcndpc2UuXG4gIGlmIChvcHRpb25zLmZsaXBOZWdhdGUpIHJldHVybiBmYWxzZVxuICByZXR1cm4gdGhpcy5uZWdhdGVcbn1cblxuLy8gc2V0IHBhcnRpYWwgdG8gdHJ1ZSB0byB0ZXN0IGlmLCBmb3IgZXhhbXBsZSxcbi8vIFwiL2EvYlwiIG1hdGNoZXMgdGhlIHN0YXJ0IG9mIFwiLyovYi8qL2RcIlxuLy8gUGFydGlhbCBtZWFucywgaWYgeW91IHJ1biBvdXQgb2YgZmlsZSBiZWZvcmUgeW91IHJ1blxuLy8gb3V0IG9mIHBhdHRlcm4sIHRoZW4gdGhhdCdzIGZpbmUsIGFzIGxvbmcgYXMgYWxsXG4vLyB0aGUgcGFydHMgbWF0Y2guXG5NaW5pbWF0Y2gucHJvdG90eXBlLm1hdGNoT25lID0gZnVuY3Rpb24gKGZpbGUsIHBhdHRlcm4sIHBhcnRpYWwpIHtcbiAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnNcblxuICB0aGlzLmRlYnVnKCdtYXRjaE9uZScsXG4gICAgeyAndGhpcyc6IHRoaXMsIGZpbGU6IGZpbGUsIHBhdHRlcm46IHBhdHRlcm4gfSlcblxuICB0aGlzLmRlYnVnKCdtYXRjaE9uZScsIGZpbGUubGVuZ3RoLCBwYXR0ZXJuLmxlbmd0aClcblxuICBmb3IgKHZhciBmaSA9IDAsXG4gICAgICBwaSA9IDAsXG4gICAgICBmbCA9IGZpbGUubGVuZ3RoLFxuICAgICAgcGwgPSBwYXR0ZXJuLmxlbmd0aFxuICAgICAgOyAoZmkgPCBmbCkgJiYgKHBpIDwgcGwpXG4gICAgICA7IGZpKyssIHBpKyspIHtcbiAgICB0aGlzLmRlYnVnKCdtYXRjaE9uZSBsb29wJylcbiAgICB2YXIgcCA9IHBhdHRlcm5bcGldXG4gICAgdmFyIGYgPSBmaWxlW2ZpXVxuXG4gICAgdGhpcy5kZWJ1ZyhwYXR0ZXJuLCBwLCBmKVxuXG4gICAgLy8gc2hvdWxkIGJlIGltcG9zc2libGUuXG4gICAgLy8gc29tZSBpbnZhbGlkIHJlZ2V4cCBzdHVmZiBpbiB0aGUgc2V0LlxuICAgIGlmIChwID09PSBmYWxzZSkgcmV0dXJuIGZhbHNlXG5cbiAgICBpZiAocCA9PT0gR0xPQlNUQVIpIHtcbiAgICAgIHRoaXMuZGVidWcoJ0dMT0JTVEFSJywgW3BhdHRlcm4sIHAsIGZdKVxuXG4gICAgICAvLyBcIioqXCJcbiAgICAgIC8vIGEvKiovYi8qKi9jIHdvdWxkIG1hdGNoIHRoZSBmb2xsb3dpbmc6XG4gICAgICAvLyBhL2IveC95L3ovY1xuICAgICAgLy8gYS94L3kvei9iL2NcbiAgICAgIC8vIGEvYi94L2IveC9jXG4gICAgICAvLyBhL2IvY1xuICAgICAgLy8gVG8gZG8gdGhpcywgdGFrZSB0aGUgcmVzdCBvZiB0aGUgcGF0dGVybiBhZnRlclxuICAgICAgLy8gdGhlICoqLCBhbmQgc2VlIGlmIGl0IHdvdWxkIG1hdGNoIHRoZSBmaWxlIHJlbWFpbmRlci5cbiAgICAgIC8vIElmIHNvLCByZXR1cm4gc3VjY2Vzcy5cbiAgICAgIC8vIElmIG5vdCwgdGhlICoqIFwic3dhbGxvd3NcIiBhIHNlZ21lbnQsIGFuZCB0cnkgYWdhaW4uXG4gICAgICAvLyBUaGlzIGlzIHJlY3Vyc2l2ZWx5IGF3ZnVsLlxuICAgICAgLy9cbiAgICAgIC8vIGEvKiovYi8qKi9jIG1hdGNoaW5nIGEvYi94L3kvei9jXG4gICAgICAvLyAtIGEgbWF0Y2hlcyBhXG4gICAgICAvLyAtIGRvdWJsZXN0YXJcbiAgICAgIC8vICAgLSBtYXRjaE9uZShiL3gveS96L2MsIGIvKiovYylcbiAgICAgIC8vICAgICAtIGIgbWF0Y2hlcyBiXG4gICAgICAvLyAgICAgLSBkb3VibGVzdGFyXG4gICAgICAvLyAgICAgICAtIG1hdGNoT25lKHgveS96L2MsIGMpIC0+IG5vXG4gICAgICAvLyAgICAgICAtIG1hdGNoT25lKHkvei9jLCBjKSAtPiBub1xuICAgICAgLy8gICAgICAgLSBtYXRjaE9uZSh6L2MsIGMpIC0+IG5vXG4gICAgICAvLyAgICAgICAtIG1hdGNoT25lKGMsIGMpIHllcywgaGl0XG4gICAgICB2YXIgZnIgPSBmaVxuICAgICAgdmFyIHByID0gcGkgKyAxXG4gICAgICBpZiAocHIgPT09IHBsKSB7XG4gICAgICAgIHRoaXMuZGVidWcoJyoqIGF0IHRoZSBlbmQnKVxuICAgICAgICAvLyBhICoqIGF0IHRoZSBlbmQgd2lsbCBqdXN0IHN3YWxsb3cgdGhlIHJlc3QuXG4gICAgICAgIC8vIFdlIGhhdmUgZm91bmQgYSBtYXRjaC5cbiAgICAgICAgLy8gaG93ZXZlciwgaXQgd2lsbCBub3Qgc3dhbGxvdyAvLngsIHVubGVzc1xuICAgICAgICAvLyBvcHRpb25zLmRvdCBpcyBzZXQuXG4gICAgICAgIC8vIC4gYW5kIC4uIGFyZSAqbmV2ZXIqIG1hdGNoZWQgYnkgKiosIGZvciBleHBsb3NpdmVseVxuICAgICAgICAvLyBleHBvbmVudGlhbCByZWFzb25zLlxuICAgICAgICBmb3IgKDsgZmkgPCBmbDsgZmkrKykge1xuICAgICAgICAgIGlmIChmaWxlW2ZpXSA9PT0gJy4nIHx8IGZpbGVbZmldID09PSAnLi4nIHx8XG4gICAgICAgICAgICAoIW9wdGlvbnMuZG90ICYmIGZpbGVbZmldLmNoYXJBdCgwKSA9PT0gJy4nKSkgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH1cblxuICAgICAgLy8gb2ssIGxldCdzIHNlZSBpZiB3ZSBjYW4gc3dhbGxvdyB3aGF0ZXZlciB3ZSBjYW4uXG4gICAgICB3aGlsZSAoZnIgPCBmbCkge1xuICAgICAgICB2YXIgc3dhbGxvd2VlID0gZmlsZVtmcl1cblxuICAgICAgICB0aGlzLmRlYnVnKCdcXG5nbG9ic3RhciB3aGlsZScsIGZpbGUsIGZyLCBwYXR0ZXJuLCBwciwgc3dhbGxvd2VlKVxuXG4gICAgICAgIC8vIFhYWCByZW1vdmUgdGhpcyBzbGljZS4gIEp1c3QgcGFzcyB0aGUgc3RhcnQgaW5kZXguXG4gICAgICAgIGlmICh0aGlzLm1hdGNoT25lKGZpbGUuc2xpY2UoZnIpLCBwYXR0ZXJuLnNsaWNlKHByKSwgcGFydGlhbCkpIHtcbiAgICAgICAgICB0aGlzLmRlYnVnKCdnbG9ic3RhciBmb3VuZCBtYXRjaCEnLCBmciwgZmwsIHN3YWxsb3dlZSlcbiAgICAgICAgICAvLyBmb3VuZCBhIG1hdGNoLlxuICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gY2FuJ3Qgc3dhbGxvdyBcIi5cIiBvciBcIi4uXCIgZXZlci5cbiAgICAgICAgICAvLyBjYW4gb25seSBzd2FsbG93IFwiLmZvb1wiIHdoZW4gZXhwbGljaXRseSBhc2tlZC5cbiAgICAgICAgICBpZiAoc3dhbGxvd2VlID09PSAnLicgfHwgc3dhbGxvd2VlID09PSAnLi4nIHx8XG4gICAgICAgICAgICAoIW9wdGlvbnMuZG90ICYmIHN3YWxsb3dlZS5jaGFyQXQoMCkgPT09ICcuJykpIHtcbiAgICAgICAgICAgIHRoaXMuZGVidWcoJ2RvdCBkZXRlY3RlZCEnLCBmaWxlLCBmciwgcGF0dGVybiwgcHIpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vICoqIHN3YWxsb3dzIGEgc2VnbWVudCwgYW5kIGNvbnRpbnVlLlxuICAgICAgICAgIHRoaXMuZGVidWcoJ2dsb2JzdGFyIHN3YWxsb3cgYSBzZWdtZW50LCBhbmQgY29udGludWUnKVxuICAgICAgICAgIGZyKytcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBubyBtYXRjaCB3YXMgZm91bmQuXG4gICAgICAvLyBIb3dldmVyLCBpbiBwYXJ0aWFsIG1vZGUsIHdlIGNhbid0IHNheSB0aGlzIGlzIG5lY2Vzc2FyaWx5IG92ZXIuXG4gICAgICAvLyBJZiB0aGVyZSdzIG1vcmUgKnBhdHRlcm4qIGxlZnQsIHRoZW5cbiAgICAgIGlmIChwYXJ0aWFsKSB7XG4gICAgICAgIC8vIHJhbiBvdXQgb2YgZmlsZVxuICAgICAgICB0aGlzLmRlYnVnKCdcXG4+Pj4gbm8gbWF0Y2gsIHBhcnRpYWw/JywgZmlsZSwgZnIsIHBhdHRlcm4sIHByKVxuICAgICAgICBpZiAoZnIgPT09IGZsKSByZXR1cm4gdHJ1ZVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgLy8gc29tZXRoaW5nIG90aGVyIHRoYW4gKipcbiAgICAvLyBub24tbWFnaWMgcGF0dGVybnMganVzdCBoYXZlIHRvIG1hdGNoIGV4YWN0bHlcbiAgICAvLyBwYXR0ZXJucyB3aXRoIG1hZ2ljIGhhdmUgYmVlbiB0dXJuZWQgaW50byByZWdleHBzLlxuICAgIHZhciBoaXRcbiAgICBpZiAodHlwZW9mIHAgPT09ICdzdHJpbmcnKSB7XG4gICAgICBpZiAob3B0aW9ucy5ub2Nhc2UpIHtcbiAgICAgICAgaGl0ID0gZi50b0xvd2VyQ2FzZSgpID09PSBwLnRvTG93ZXJDYXNlKClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhpdCA9IGYgPT09IHBcbiAgICAgIH1cbiAgICAgIHRoaXMuZGVidWcoJ3N0cmluZyBtYXRjaCcsIHAsIGYsIGhpdClcbiAgICB9IGVsc2Uge1xuICAgICAgaGl0ID0gZi5tYXRjaChwKVxuICAgICAgdGhpcy5kZWJ1ZygncGF0dGVybiBtYXRjaCcsIHAsIGYsIGhpdClcbiAgICB9XG5cbiAgICBpZiAoIWhpdCkgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBOb3RlOiBlbmRpbmcgaW4gLyBtZWFucyB0aGF0IHdlJ2xsIGdldCBhIGZpbmFsIFwiXCJcbiAgLy8gYXQgdGhlIGVuZCBvZiB0aGUgcGF0dGVybi4gIFRoaXMgY2FuIG9ubHkgbWF0Y2ggYVxuICAvLyBjb3JyZXNwb25kaW5nIFwiXCIgYXQgdGhlIGVuZCBvZiB0aGUgZmlsZS5cbiAgLy8gSWYgdGhlIGZpbGUgZW5kcyBpbiAvLCB0aGVuIGl0IGNhbiBvbmx5IG1hdGNoIGFcbiAgLy8gYSBwYXR0ZXJuIHRoYXQgZW5kcyBpbiAvLCB1bmxlc3MgdGhlIHBhdHRlcm4ganVzdFxuICAvLyBkb2Vzbid0IGhhdmUgYW55IG1vcmUgZm9yIGl0LiBCdXQsIGEvYi8gc2hvdWxkICpub3QqXG4gIC8vIG1hdGNoIFwiYS9iLypcIiwgZXZlbiB0aG91Z2ggXCJcIiBtYXRjaGVzIGFnYWluc3QgdGhlXG4gIC8vIFteL10qPyBwYXR0ZXJuLCBleGNlcHQgaW4gcGFydGlhbCBtb2RlLCB3aGVyZSBpdCBtaWdodFxuICAvLyBzaW1wbHkgbm90IGJlIHJlYWNoZWQgeWV0LlxuICAvLyBIb3dldmVyLCBhL2IvIHNob3VsZCBzdGlsbCBzYXRpc2Z5IGEvKlxuXG4gIC8vIG5vdyBlaXRoZXIgd2UgZmVsbCBvZmYgdGhlIGVuZCBvZiB0aGUgcGF0dGVybiwgb3Igd2UncmUgZG9uZS5cbiAgaWYgKGZpID09PSBmbCAmJiBwaSA9PT0gcGwpIHtcbiAgICAvLyByYW4gb3V0IG9mIHBhdHRlcm4gYW5kIGZpbGVuYW1lIGF0IHRoZSBzYW1lIHRpbWUuXG4gICAgLy8gYW4gZXhhY3QgaGl0IVxuICAgIHJldHVybiB0cnVlXG4gIH0gZWxzZSBpZiAoZmkgPT09IGZsKSB7XG4gICAgLy8gcmFuIG91dCBvZiBmaWxlLCBidXQgc3RpbGwgaGFkIHBhdHRlcm4gbGVmdC5cbiAgICAvLyB0aGlzIGlzIG9rIGlmIHdlJ3JlIGRvaW5nIHRoZSBtYXRjaCBhcyBwYXJ0IG9mXG4gICAgLy8gYSBnbG9iIGZzIHRyYXZlcnNhbC5cbiAgICByZXR1cm4gcGFydGlhbFxuICB9IGVsc2UgaWYgKHBpID09PSBwbCkge1xuICAgIC8vIHJhbiBvdXQgb2YgcGF0dGVybiwgc3RpbGwgaGF2ZSBmaWxlIGxlZnQuXG4gICAgLy8gdGhpcyBpcyBvbmx5IGFjY2VwdGFibGUgaWYgd2UncmUgb24gdGhlIHZlcnkgbGFzdFxuICAgIC8vIGVtcHR5IHNlZ21lbnQgb2YgYSBmaWxlIHdpdGggYSB0cmFpbGluZyBzbGFzaC5cbiAgICAvLyBhLyogc2hvdWxkIG1hdGNoIGEvYi9cbiAgICB2YXIgZW1wdHlGaWxlRW5kID0gKGZpID09PSBmbCAtIDEpICYmIChmaWxlW2ZpXSA9PT0gJycpXG4gICAgcmV0dXJuIGVtcHR5RmlsZUVuZFxuICB9XG5cbiAgLy8gc2hvdWxkIGJlIHVucmVhY2hhYmxlLlxuICB0aHJvdyBuZXcgRXJyb3IoJ3d0Zj8nKVxufVxuXG4vLyByZXBsYWNlIHN0dWZmIGxpa2UgXFwqIHdpdGggKlxuZnVuY3Rpb24gZ2xvYlVuZXNjYXBlIChzKSB7XG4gIHJldHVybiBzLnJlcGxhY2UoL1xcXFwoLikvZywgJyQxJylcbn1cblxuZnVuY3Rpb24gcmVnRXhwRXNjYXBlIChzKSB7XG4gIHJldHVybiBzLnJlcGxhY2UoL1stW1xcXXt9KCkqKz8uLFxcXFxeJHwjXFxzXS9nLCAnXFxcXCQmJylcbn1cbiIsInZhciBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xudmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcbnZhciBfMDc3NyA9IHBhcnNlSW50KCcwNzc3JywgOCk7XG5cbm1vZHVsZS5leHBvcnRzID0gbWtkaXJQLm1rZGlycCA9IG1rZGlyUC5ta2RpclAgPSBta2RpclA7XG5cbmZ1bmN0aW9uIG1rZGlyUCAocCwgb3B0cywgZiwgbWFkZSkge1xuICAgIGlmICh0eXBlb2Ygb3B0cyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBmID0gb3B0cztcbiAgICAgICAgb3B0cyA9IHt9O1xuICAgIH1cbiAgICBlbHNlIGlmICghb3B0cyB8fCB0eXBlb2Ygb3B0cyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgb3B0cyA9IHsgbW9kZTogb3B0cyB9O1xuICAgIH1cbiAgICBcbiAgICB2YXIgbW9kZSA9IG9wdHMubW9kZTtcbiAgICB2YXIgeGZzID0gb3B0cy5mcyB8fCBmcztcbiAgICBcbiAgICBpZiAobW9kZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG1vZGUgPSBfMDc3N1xuICAgIH1cbiAgICBpZiAoIW1hZGUpIG1hZGUgPSBudWxsO1xuICAgIFxuICAgIHZhciBjYiA9IGYgfHwgZnVuY3Rpb24gKCkge307XG4gICAgcCA9IHBhdGgucmVzb2x2ZShwKTtcbiAgICBcbiAgICB4ZnMubWtkaXIocCwgbW9kZSwgZnVuY3Rpb24gKGVyKSB7XG4gICAgICAgIGlmICghZXIpIHtcbiAgICAgICAgICAgIG1hZGUgPSBtYWRlIHx8IHA7XG4gICAgICAgICAgICByZXR1cm4gY2IobnVsbCwgbWFkZSk7XG4gICAgICAgIH1cbiAgICAgICAgc3dpdGNoIChlci5jb2RlKSB7XG4gICAgICAgICAgICBjYXNlICdFTk9FTlQnOlxuICAgICAgICAgICAgICAgIGlmIChwYXRoLmRpcm5hbWUocCkgPT09IHApIHJldHVybiBjYihlcik7XG4gICAgICAgICAgICAgICAgbWtkaXJQKHBhdGguZGlybmFtZShwKSwgb3B0cywgZnVuY3Rpb24gKGVyLCBtYWRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcikgY2IoZXIsIG1hZGUpO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIG1rZGlyUChwLCBvcHRzLCBjYiwgbWFkZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIC8vIEluIHRoZSBjYXNlIG9mIGFueSBvdGhlciBlcnJvciwganVzdCBzZWUgaWYgdGhlcmUncyBhIGRpclxuICAgICAgICAgICAgLy8gdGhlcmUgYWxyZWFkeS4gIElmIHNvLCB0aGVuIGhvb3JheSEgIElmIG5vdCwgdGhlbiBzb21ldGhpbmdcbiAgICAgICAgICAgIC8vIGlzIGJvcmtlZC5cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgeGZzLnN0YXQocCwgZnVuY3Rpb24gKGVyMiwgc3RhdCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiB0aGUgc3RhdCBmYWlscywgdGhlbiB0aGF0J3Mgc3VwZXIgd2VpcmQuXG4gICAgICAgICAgICAgICAgICAgIC8vIGxldCB0aGUgb3JpZ2luYWwgZXJyb3IgYmUgdGhlIGZhaWx1cmUgcmVhc29uLlxuICAgICAgICAgICAgICAgICAgICBpZiAoZXIyIHx8ICFzdGF0LmlzRGlyZWN0b3J5KCkpIGNiKGVyLCBtYWRlKVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGNiKG51bGwsIG1hZGUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbm1rZGlyUC5zeW5jID0gZnVuY3Rpb24gc3luYyAocCwgb3B0cywgbWFkZSkge1xuICAgIGlmICghb3B0cyB8fCB0eXBlb2Ygb3B0cyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgb3B0cyA9IHsgbW9kZTogb3B0cyB9O1xuICAgIH1cbiAgICBcbiAgICB2YXIgbW9kZSA9IG9wdHMubW9kZTtcbiAgICB2YXIgeGZzID0gb3B0cy5mcyB8fCBmcztcbiAgICBcbiAgICBpZiAobW9kZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG1vZGUgPSBfMDc3N1xuICAgIH1cbiAgICBpZiAoIW1hZGUpIG1hZGUgPSBudWxsO1xuXG4gICAgcCA9IHBhdGgucmVzb2x2ZShwKTtcblxuICAgIHRyeSB7XG4gICAgICAgIHhmcy5ta2RpclN5bmMocCwgbW9kZSk7XG4gICAgICAgIG1hZGUgPSBtYWRlIHx8IHA7XG4gICAgfVxuICAgIGNhdGNoIChlcnIwKSB7XG4gICAgICAgIHN3aXRjaCAoZXJyMC5jb2RlKSB7XG4gICAgICAgICAgICBjYXNlICdFTk9FTlQnIDpcbiAgICAgICAgICAgICAgICBtYWRlID0gc3luYyhwYXRoLmRpcm5hbWUocCksIG9wdHMsIG1hZGUpO1xuICAgICAgICAgICAgICAgIHN5bmMocCwgb3B0cywgbWFkZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIC8vIEluIHRoZSBjYXNlIG9mIGFueSBvdGhlciBlcnJvciwganVzdCBzZWUgaWYgdGhlcmUncyBhIGRpclxuICAgICAgICAgICAgLy8gdGhlcmUgYWxyZWFkeS4gIElmIHNvLCB0aGVuIGhvb3JheSEgIElmIG5vdCwgdGhlbiBzb21ldGhpbmdcbiAgICAgICAgICAgIC8vIGlzIGJvcmtlZC5cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdmFyIHN0YXQ7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdCA9IHhmcy5zdGF0U3luYyhwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGVycjEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFzdGF0LmlzRGlyZWN0b3J5KCkpIHRocm93IGVycjA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbWFkZTtcbn07XG4iLCJ2YXIgbmF0aXZlcyA9IHByb2Nlc3MuYmluZGluZygnbmF0aXZlcycpXG52YXIgbW9kdWxlID0gcmVxdWlyZSgnbW9kdWxlJylcbnZhciBub3JtYWxSZXF1aXJlID0gcmVxdWlyZVxuZXhwb3J0cy5zb3VyY2UgPSBzcmNcbmV4cG9ydHMucmVxdWlyZSA9IHJlcVxudmFyIHZtID0gcmVxdWlyZSgndm0nKVxuXG4vLyBmYWxsYmFjayBmb3IgMC54IHN1cHBvcnRcbnZhciBydW5JblRoaXNDb250ZXh0LCBDb250ZXh0aWZ5U2NyaXB0LCBTY3JpcHRcbi8qaXN0YW5idWwgaWdub3JlIG5leHQqL1xudHJ5IHtcbiAgQ29udGV4dGlmeVNjcmlwdCA9IHByb2Nlc3MuYmluZGluZygnY29udGV4dGlmeScpLkNvbnRleHRpZnlTY3JpcHQ7XG4gIC8qaXN0YW5idWwgaWdub3JlIG5leHQqL1xuICBpZiAocHJvY2Vzcy52ZXJzaW9uLnNwbGl0KCcuJylbMF0ubGVuZ3RoID4gMikgeyAgLy8gdjEwLjAuMCBhbmQgYWJvdmVcbiAgICBydW5JblRoaXNDb250ZXh0ID0gdm0ucnVuSW5UaGlzQ29udGV4dDtcbiAgfSBlbHNlIHtcbiAgICBydW5JblRoaXNDb250ZXh0ID0gZnVuY3Rpb24gcnVuSW5UaGlzQ29udGV4dChjb2RlLCBvcHRpb25zKSB7XG4gICAgICB2YXIgc2NyaXB0ID0gbmV3IENvbnRleHRpZnlTY3JpcHQoY29kZSwgb3B0aW9ucyk7XG4gICAgICByZXR1cm4gc2NyaXB0LnJ1bkluVGhpc0NvbnRleHQoKTtcbiAgICB9XG4gIH1cbn0gY2F0Y2ggKGVyKSB7XG4gIFNjcmlwdCA9IHByb2Nlc3MuYmluZGluZygnZXZhbHMnKS5Ob2RlU2NyaXB0O1xuICBydW5JblRoaXNDb250ZXh0ID0gU2NyaXB0LnJ1bkluVGhpc0NvbnRleHQ7XG59XG5cbnZhciB3cmFwID0gW1xuICAnKGZ1bmN0aW9uIChpbnRlcm5hbEJpbmRpbmcpIHsnICtcbiAgICAnIHJldHVybiBmdW5jdGlvbiAoZXhwb3J0cywgcmVxdWlyZSwgbW9kdWxlLCBfX2ZpbGVuYW1lLCBfX2Rpcm5hbWUpIHsgJyxcbiAgJ1xcbiAgfTtcXG59KTsnXG5dO1xuXG5cbi8vIEJhc2ljYWxseSB0aGUgc2FtZSBmdW5jdGlvbmFsaXR5IGFzIG5vZGUncyAoYnVyaWVkIGRlZXApXG4vLyBOYXRpdmVNb2R1bGUgY2xhc3MsIGJ1dCB3aXRob3V0IGNhY2hpbmcsIG9yIGludGVybmFsLyBibG9ja2luZyxcbi8vIG9yIGEgY2xhc3MsIHNpbmNlIHRoYXQncyBub3QgcmVhbGx5IG5lY2Vzc2FyeS4gIEkgYXNzdW1lIHRoYXQgaWZcbi8vIHlvdSdyZSBsb2FkaW5nIHNvbWV0aGluZyB3aXRoIHRoaXMgbW9kdWxlLCBpdCdzIGJlY2F1c2UgeW91IFdBTlRcbi8vIGEgc2VwYXJhdGUgY29weS4gIEhvd2V2ZXIsIHRvIHByZXNlcnZlIHNlbWFudGljcywgYW55IHJlcXVpcmUoKVxuLy8gY2FsbHMgbWFkZSB0aHJvdWdob3V0IHRoZSBpbnRlcm5hbCBtb2R1bGUgbG9hZCBJUyBjYWNoZWQuXG5mdW5jdGlvbiByZXEgKGlkLCB3aGl0ZWxpc3QpIHtcbiAgdmFyIGNhY2hlID0gT2JqZWN0LmNyZWF0ZShudWxsKVxuXG4gIGlmIChBcnJheS5pc0FycmF5KHdoaXRlbGlzdCkpIHtcbiAgICAvLyBhIHdoaXRlbGlzdCBvZiB0aGluZ3MgdG8gcHVsbCBmcm9tIHRoZSBcImFjdHVhbFwiIG5hdGl2ZSBtb2R1bGVzXG4gICAgd2hpdGVsaXN0LmZvckVhY2goZnVuY3Rpb24gKGlkKSB7XG4gICAgICBjYWNoZVtpZF0gPSB7XG4gICAgICAgIGxvYWRpbmc6IGZhbHNlLFxuICAgICAgICBsb2FkZWQ6IHRydWUsXG4gICAgICAgIGZpbGVuYW1lOiBpZCArICcuanMnLFxuICAgICAgICBleHBvcnRzOiByZXF1aXJlKGlkKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICByZXR1cm4gcmVxXyhpZCwgY2FjaGUpXG59XG5cbmZ1bmN0aW9uIHJlcV8gKGlkLCBjYWNoZSkge1xuICAvLyBCdWZmZXIgaXMgc3BlY2lhbCwgYmVjYXVzZSBpdCdzIGEgdHlwZSByYXRoZXIgdGhhbiBhIFwibm9ybWFsXCJcbiAgLy8gY2xhc3MsIGFuZCBtYW55IHRoaW5ncyBkZXBlbmQgb24gYEJ1ZmZlci5pc0J1ZmZlcmAgd29ya2luZy5cbiAgaWYgKGlkID09PSAnYnVmZmVyJykge1xuICAgIHJldHVybiByZXF1aXJlKCdidWZmZXInKVxuICB9XG5cbiAgLy8gbmF0aXZlX21vZHVsZSBpc24ndCBhY3R1YWxseSBhIG5hdGl2ZXMgYmluZGluZy5cbiAgLy8gd2VpcmQsIHJpZ2h0P1xuICBpZiAoaWQgPT09ICduYXRpdmVfbW9kdWxlJykge1xuICAgIHJldHVybiB7XG4gICAgICBnZXRTb3VyY2U6IHNyYyxcbiAgICAgIHdyYXA6IGZ1bmN0aW9uIChzY3JpcHQpIHtcbiAgICAgICAgcmV0dXJuIHdyYXBbMF0gKyBzY3JpcHQgKyB3cmFwWzFdXG4gICAgICB9LFxuICAgICAgd3JhcHBlcjogd3JhcCxcbiAgICAgIF9jYWNoZTogY2FjaGUsXG4gICAgICBfc291cmNlOiBuYXRpdmVzLFxuICAgICAgbm9uSW50ZXJuYWxFeGlzdHM6IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICByZXR1cm4gaWQuaW5kZXhPZignaW50ZXJuYWwvJykgIT09IDA7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdmFyIHNvdXJjZSA9IHNyYyhpZClcbiAgaWYgKCFzb3VyY2UpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cbiAgc291cmNlID0gd3JhcFswXSArIHNvdXJjZSArIHdyYXBbMV1cblxuICB2YXIgaW50ZXJuYWxCaW5kaW5nID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGlmIChuYW1lID09PSAndHlwZXMnKSB7XG4gICAgICByZXR1cm4gcHJvY2Vzcy5iaW5kaW5nKCd1dGlsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBwcm9jZXNzLmJpbmRpbmcobmFtZSk7XG4gICAgICB9IGNhdGNoIChlKSB7fVxuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cbiAgfVxuXG4gIHZhciBjYWNoaW5nUmVxdWlyZSA9IGZ1bmN0aW9uIHJlcXVpcmUgKGlkKSB7XG4gICAgaWYgKGNhY2hlW2lkXSkge1xuICAgICAgcmV0dXJuIGNhY2hlW2lkXS5leHBvcnRzXG4gICAgfVxuICAgIGlmIChpZCA9PT0gJ2ludGVybmFsL2Jvb3RzdHJhcC9sb2FkZXJzJyB8fCBpZCA9PT0gJ2ludGVybmFsL3Byb2Nlc3MnKSB7XG4gICAgICAvLyBQcm92aWRlIGp1c3QgZW5vdWdoIHRvIGtlZXAgYGdyYWNlZnVsLWZzQDNgIHdvcmtpbmcgYW5kIHRlc3RzIHBhc3NpbmcuXG4gICAgICAvLyBGb3Igbm93LlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaW50ZXJuYWxCaW5kaW5nOiBpbnRlcm5hbEJpbmRpbmcsXG4gICAgICAgIE5hdGl2ZU1vZHVsZToge1xuICAgICAgICAgIF9zb3VyY2U6IHByb2Nlc3MuYmluZGluZygnbmF0aXZlcycpLFxuICAgICAgICAgIG5vbkludGVybmFsRXhpc3RzOiBmdW5jdGlvbihpZCkge1xuICAgICAgICAgICAgcmV0dXJuICFpZC5zdGFydHNXaXRoKCdpbnRlcm5hbC8nKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiByZXFfKGlkLCBjYWNoZSlcbiAgfVxuXG4gIHZhciBubSA9IHtcbiAgICBleHBvcnRzOiB7fSxcbiAgICBsb2FkaW5nOiB0cnVlLFxuICAgIGxvYWRlZDogZmFsc2UsXG4gICAgZmlsZW5hbWU6IGlkICsgJy5qcydcbiAgfVxuICBjYWNoZVtpZF0gPSBubVxuICB2YXIgZm5cbiAgdmFyIHNldFY4RmxhZ3MgPSBmYWxzZVxuICB0cnkge1xuICAgIHJlcXVpcmUoJ3Y4Jykuc2V0RmxhZ3NGcm9tU3RyaW5nKCctLWFsbG93X25hdGl2ZXNfc3ludGF4JylcbiAgICBzZXRWOEZsYWdzID0gdHJ1ZVxuICB9IGNhdGNoIChlKSB7fVxuICB0cnkge1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgaWYgKENvbnRleHRpZnlTY3JpcHQpIHtcbiAgICAgIGZuID0gcnVuSW5UaGlzQ29udGV4dChzb3VyY2UsIHtcbiAgICAgICAgZmlsZW5hbWU6IG5tLmZpbGVuYW1lLFxuICAgICAgICBsaW5lT2Zmc2V0OiAwLFxuICAgICAgICBkaXNwbGF5RXJyb3JzOiB0cnVlXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZm4gPSBydW5JblRoaXNDb250ZXh0KHNvdXJjZSwgbm0uZmlsZW5hbWUsIHRydWUpO1xuICAgIH1cbiAgICBmbihpbnRlcm5hbEJpbmRpbmcpKG5tLmV4cG9ydHMsIGNhY2hpbmdSZXF1aXJlLCBubSwgbm0uZmlsZW5hbWUsICc8bm8gZGlybmFtZSBhdmFpbGFibGU+JylcbiAgICBubS5sb2FkZWQgPSB0cnVlXG4gIH0gZmluYWxseSB7XG4gICAgbm0ubG9hZGluZyA9IGZhbHNlXG4gICAgLyppc3RhbmJ1bCBpZ25vcmUgbmV4dCovXG4gICAgaWYgKHNldFY4RmxhZ3MpIHtcbiAgICAgIC8vIFJlZjogaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL2Jsb2IvNTkxYTI0YjgxOWQ1M2E1NTU0NjNiMWNiZjkyOTBhNmQ4YmNjMWJjYi9saWIvaW50ZXJuYWwvYm9vdHN0cmFwX25vZGUuanMjTDQyOS1MNDM0XG4gICAgICB2YXIgcmUgPSAvXi0tYWxsb3dbLV9dbmF0aXZlc1stX11zeW50YXgkL1xuICAgICAgaWYgKCFwcm9jZXNzLmV4ZWNBcmd2LnNvbWUoZnVuY3Rpb24gKHMpIHsgcmV0dXJuIHJlLnRlc3QocykgfSkpXG4gICAgICAgIHJlcXVpcmUoJ3Y4Jykuc2V0RmxhZ3NGcm9tU3RyaW5nKCctLW5vYWxsb3dfbmF0aXZlc19zeW50YXgnKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBubS5leHBvcnRzXG59XG5cbmZ1bmN0aW9uIHNyYyAoaWQpIHtcbiAgcmV0dXJuIG5hdGl2ZXNbaWRdXG59XG4iLCJmdW5jdGlvbiB3ZWJwYWNrRW1wdHlDb250ZXh0KHJlcSkge1xuXHR2YXIgZSA9IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIgKyByZXEgKyBcIidcIik7XG5cdGUuY29kZSA9ICdNT0RVTEVfTk9UX0ZPVU5EJztcblx0dGhyb3cgZTtcbn1cbndlYnBhY2tFbXB0eUNvbnRleHQua2V5cyA9ICgpID0+IChbXSk7XG53ZWJwYWNrRW1wdHlDb250ZXh0LnJlc29sdmUgPSB3ZWJwYWNrRW1wdHlDb250ZXh0O1xud2VicGFja0VtcHR5Q29udGV4dC5pZCA9IDEzOTM7XG5tb2R1bGUuZXhwb3J0cyA9IHdlYnBhY2tFbXB0eUNvbnRleHQ7IiwidmFyIHdyYXBweSA9IHJlcXVpcmUoJ3dyYXBweScpXG5tb2R1bGUuZXhwb3J0cyA9IHdyYXBweShvbmNlKVxubW9kdWxlLmV4cG9ydHMuc3RyaWN0ID0gd3JhcHB5KG9uY2VTdHJpY3QpXG5cbm9uY2UucHJvdG8gPSBvbmNlKGZ1bmN0aW9uICgpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEZ1bmN0aW9uLnByb3RvdHlwZSwgJ29uY2UnLCB7XG4gICAgdmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBvbmNlKHRoaXMpXG4gICAgfSxcbiAgICBjb25maWd1cmFibGU6IHRydWVcbiAgfSlcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoRnVuY3Rpb24ucHJvdG90eXBlLCAnb25jZVN0cmljdCcsIHtcbiAgICB2YWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG9uY2VTdHJpY3QodGhpcylcbiAgICB9LFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICB9KVxufSlcblxuZnVuY3Rpb24gb25jZSAoZm4pIHtcbiAgdmFyIGYgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGYuY2FsbGVkKSByZXR1cm4gZi52YWx1ZVxuICAgIGYuY2FsbGVkID0gdHJ1ZVxuICAgIHJldHVybiBmLnZhbHVlID0gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICB9XG4gIGYuY2FsbGVkID0gZmFsc2VcbiAgcmV0dXJuIGZcbn1cblxuZnVuY3Rpb24gb25jZVN0cmljdCAoZm4pIHtcbiAgdmFyIGYgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGYuY2FsbGVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKGYub25jZUVycm9yKVxuICAgIGYuY2FsbGVkID0gdHJ1ZVxuICAgIHJldHVybiBmLnZhbHVlID0gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICB9XG4gIHZhciBuYW1lID0gZm4ubmFtZSB8fCAnRnVuY3Rpb24gd3JhcHBlZCB3aXRoIGBvbmNlYCdcbiAgZi5vbmNlRXJyb3IgPSBuYW1lICsgXCIgc2hvdWxkbid0IGJlIGNhbGxlZCBtb3JlIHRoYW4gb25jZVwiXG4gIGYuY2FsbGVkID0gZmFsc2VcbiAgcmV0dXJuIGZcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gb3ZlcmxvYWREZWZzXG4vLyBzZWxmLCBvdmVybG9hZERlZnNcbnZhciBvdmVybG9hZCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiwgc2VsZlNldCA9IGZhbHNlLCBvdmVybG9hZERlZnM7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgb3ZlcmxvYWREZWZzID0gYXJndW1lbnRzWzBdO1xuICB9IGVsc2Uge1xuICAgIHNlbGZTZXQgPSB0cnVlO1xuICAgIHNlbGYgPSBhcmd1bWVudHNbMF07XG4gICAgb3ZlcmxvYWREZWZzID0gYXJndW1lbnRzWzFdO1xuICB9XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCFzZWxmU2V0KSB7XG4gICAgICBzZWxmID0gdGhpcztcbiAgICB9XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIHZhciBvdmVybG9hZE1hdGNoRGF0YSA9IGZpbmRPdmVybG9hZChvdmVybG9hZERlZnMsIGFyZ3MpO1xuICAgIGlmICghb3ZlcmxvYWRNYXRjaERhdGEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihjcmVhdGVFcnJvck1lc3NhZ2UoJ05vIG1hdGNoIGZvdW5kLicsIG92ZXJsb2FkRGVmcykpO1xuICAgIH1cbiAgICB2YXIgb3ZlcmxvYWRGbiA9IG92ZXJsb2FkTWF0Y2hEYXRhLmRlZltvdmVybG9hZE1hdGNoRGF0YS5kZWYubGVuZ3RoIC0gMV07XG4gICAgcmV0dXJuIG92ZXJsb2FkRm4uYXBwbHkoc2VsZiwgb3ZlcmxvYWRNYXRjaERhdGEuYXJncyk7XG4gIH07XG59O1xuXG52YXIgZmluZE92ZXJsb2FkID0gb3ZlcmxvYWQuZmluZE92ZXJsb2FkID0gZnVuY3Rpb24gKG92ZXJsb2FkRGVmcywgYXJncykge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG92ZXJsb2FkRGVmcy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChpID09PSBvdmVybG9hZERlZnMubGVuZ3RoIC0gMSAmJiB0eXBlb2Yob3ZlcmxvYWREZWZzW2ldKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHsgYXJnczogYXJncywgZGVmOiBbb3ZlcmxvYWREZWZzW2ldXSB9O1xuICAgIH1cbiAgICB2YXIgbmV3QXJncztcbiAgICBpZiAobmV3QXJncyA9IGlzTWF0Y2gob3ZlcmxvYWREZWZzW2ldLCBhcmdzKSkge1xuICAgICAgcmV0dXJuIHsgYXJnczogbmV3QXJncywgZGVmOiBvdmVybG9hZERlZnNbaV0gfTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59O1xuXG5mdW5jdGlvbiBpc01hdGNoKG92ZXJsb2FkRGVmLCBhcmdzKSB7XG4gIHZhciBvdmVybG9hZERlZklkeDtcbiAgdmFyIGFyZ0lkeDtcbiAgdmFyIG5ld0FyZ3MgPSBbXTtcbiAgZm9yIChvdmVybG9hZERlZklkeCA9IDAsIGFyZ0lkeCA9IDA7IG92ZXJsb2FkRGVmSWR4IDwgb3ZlcmxvYWREZWYubGVuZ3RoIC0gMTsgb3ZlcmxvYWREZWZJZHgrKykge1xuICAgIGlmICh0eXBlb2Yob3ZlcmxvYWREZWZbb3ZlcmxvYWREZWZJZHhdKSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBvdmVybG9hZCBkZWZpbml0aW9uLiBBcnJheSBzaG91bGQgb25seSBjb250YWluIGZ1bmN0aW9ucy5cIik7XG4gICAgfVxuICAgIC8vY29uc29sZS5sb2coJ292ZXJsb2FkRGVmL2FyZzonLCBvdmVybG9hZERlZltvdmVybG9hZERlZklkeF0sIGFyZ3NbYXJnSWR4XSk7XG4gICAgdmFyIHJlc3VsdCA9IG92ZXJsb2FkRGVmW292ZXJsb2FkRGVmSWR4XShhcmdzW2FyZ0lkeF0pO1xuICAgIC8vY29uc29sZS5sb2coJ3Jlc3VsdDonLCByZXN1bHQpO1xuICAgIGlmIChyZXN1bHQpIHtcbiAgICAgIGlmIChyZXN1bHQuaGFzT3duUHJvcGVydHkoJ2RlZmF1bHRWYWx1ZScpKSB7XG4gICAgICAgIG5ld0FyZ3MucHVzaChyZXN1bHQuZGVmYXVsdFZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChvdmVybG9hZERlZltvdmVybG9hZERlZklkeF0ub3B0aW9uYWwgJiYgYXJnc1thcmdJZHhdID09PSBudWxsKSB7XG4gICAgICAgICAgYXJnSWR4Kys7XG4gICAgICAgICAgbmV3QXJncy5wdXNoKG92ZXJsb2FkRGVmW292ZXJsb2FkRGVmSWR4XS5kZWZhdWx0VmFsdWUpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIG5ld0FyZ3MucHVzaChhcmdzW2FyZ0lkeF0pO1xuICAgICAgICBhcmdJZHgrKztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG92ZXJsb2FkRGVmW292ZXJsb2FkRGVmSWR4XS5vcHRpb25hbCkge1xuICAgICAgICBuZXdBcmdzLnB1c2gob3ZlcmxvYWREZWZbb3ZlcmxvYWREZWZJZHhdLmRlZmF1bHRWYWx1ZSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICAvL2NvbnNvbGUubG9nKCdjb21wYXJlcycsIG92ZXJsb2FkRGVmSWR4LCBvdmVybG9hZERlZi5sZW5ndGggLSAxLCBhcmdJZHgsIGFyZ3MubGVuZ3RoLCBuZXdBcmdzLmxlbmd0aCk7XG4gIGlmIChvdmVybG9hZERlZklkeCA9PT0gb3ZlcmxvYWREZWYubGVuZ3RoIC0gMSAmJiBhcmdJZHggPj0gYXJncy5sZW5ndGgpIHtcbiAgICByZXR1cm4gbmV3QXJncztcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUVycm9yTWVzc2FnZShtZXNzYWdlLCBvdmVybG9hZERlZnMpIHtcbiAgbWVzc2FnZSArPSAnXFxuJztcbiAgbWVzc2FnZSArPSAnICBQb3NzaWJsZSBtYXRjaGVzOlxcbic7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgb3ZlcmxvYWREZWZzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIG92ZXJsb2FkRGVmID0gb3ZlcmxvYWREZWZzW2ldO1xuICAgIGlmICh0eXBlb2Yob3ZlcmxvYWREZWYpID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBtZXNzYWdlICs9ICcgICBbZGVmYXVsdF1cXG4nO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgbWF0Y2hlcnMgPSBvdmVybG9hZERlZi5zbGljZSgwLCBvdmVybG9hZERlZi5sZW5ndGggLSAxKTtcbiAgICAgIG1hdGNoZXJzID0gbWF0Y2hlcnMubWFwKGZ1bmN0aW9uIChtKSB7XG4gICAgICAgIGlmICghbSkge1xuICAgICAgICAgIHJldHVybiAnW2ludmFsaWQgYXJndW1lbnQgZGVmaW5pdGlvbl0nO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtLm5hbWUgfHwgbTtcbiAgICAgIH0pO1xuICAgICAgaWYgKG1hdGNoZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBtZXNzYWdlICs9ICcgICAoKVxcbic7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtZXNzYWdlICs9ICcgICAoJyArIG1hdGNoZXJzLmpvaW4oJywgJykgKyAnKVxcbic7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBtZXNzYWdlO1xufVxuXG4vLyAtLS0gZnVuY1xub3ZlcmxvYWQuZnVuYyA9IGZ1bmN0aW9uIGZ1bmMoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YoYXJnKSA9PT0gJ2Z1bmN0aW9uJztcbn07XG5cbm92ZXJsb2FkLmZ1bmNPcHRpb25hbCA9IGZ1bmN0aW9uIGZ1bmNPcHRpb25hbChhcmcpIHtcbiAgaWYgKCFhcmcpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gb3ZlcmxvYWQuZnVuYyhhcmcpO1xufTtcbm92ZXJsb2FkLmZ1bmNPcHRpb25hbC5vcHRpb25hbCA9IHRydWU7XG5cbm92ZXJsb2FkLmZ1bmNPcHRpb25hbFdpdGhEZWZhdWx0ID0gZnVuY3Rpb24gKGRlZikge1xuICB2YXIgZm4gPSBmdW5jdGlvbiBmdW5jT3B0aW9uYWxXaXRoRGVmYXVsdChhcmcpIHtcbiAgICBpZiAoYXJnID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIG92ZXJsb2FkLmZ1bmMoYXJnKTtcbiAgfTtcbiAgZm4ub3B0aW9uYWwgPSB0cnVlO1xuICBmbi5kZWZhdWx0VmFsdWUgPSBkZWY7XG4gIHJldHVybiBmbjtcbn07XG5cbi8vIC0tLSBjYWxsYmFja1xub3ZlcmxvYWQuY2FsbGJhY2tPcHRpb25hbCA9IGZ1bmN0aW9uIGNhbGxiYWNrT3B0aW9uYWwoYXJnKSB7XG4gIGlmICghYXJnKSB7XG4gICAgcmV0dXJuIHsgZGVmYXVsdFZhbHVlOiBmdW5jdGlvbiBkZWZhdWx0Q2FsbGJhY2soKSB7fSB9O1xuICB9XG4gIHJldHVybiBvdmVybG9hZC5mdW5jKGFyZyk7XG59O1xub3ZlcmxvYWQuY2FsbGJhY2tPcHRpb25hbC5vcHRpb25hbCA9IHRydWU7XG5cbi8vIC0tLSBzdHJpbmdcbm92ZXJsb2FkLnN0cmluZyA9IGZ1bmN0aW9uIHN0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZihhcmcpID09PSAnc3RyaW5nJztcbn07XG5cbm92ZXJsb2FkLnN0cmluZ09wdGlvbmFsID0gZnVuY3Rpb24gc3RyaW5nT3B0aW9uYWwoYXJnKSB7XG4gIGlmICghYXJnKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIG92ZXJsb2FkLnN0cmluZyhhcmcpO1xufTtcbm92ZXJsb2FkLnN0cmluZ09wdGlvbmFsLm9wdGlvbmFsID0gdHJ1ZTtcblxub3ZlcmxvYWQuc3RyaW5nT3B0aW9uYWxXaXRoRGVmYXVsdCA9IGZ1bmN0aW9uIChkZWYpIHtcbiAgdmFyIGZuID0gZnVuY3Rpb24gc3RyaW5nT3B0aW9uYWxXaXRoRGVmYXVsdChhcmcpIHtcbiAgICBpZiAoYXJnID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIG92ZXJsb2FkLnN0cmluZyhhcmcpO1xuICB9O1xuICBmbi5vcHRpb25hbCA9IHRydWU7XG4gIGZuLmRlZmF1bHRWYWx1ZSA9IGRlZjtcbiAgcmV0dXJuIGZuO1xufTtcblxuLy8gLS0tIG51bWJlclxub3ZlcmxvYWQubnVtYmVyID0gZnVuY3Rpb24gbnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mKGFyZykgPT09ICdudW1iZXInO1xufTtcblxub3ZlcmxvYWQubnVtYmVyT3B0aW9uYWwgPSBmdW5jdGlvbiBudW1iZXJPcHRpb25hbChhcmcpIHtcbiAgaWYgKCFhcmcpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gb3ZlcmxvYWQubnVtYmVyKGFyZyk7XG59O1xub3ZlcmxvYWQubnVtYmVyT3B0aW9uYWwub3B0aW9uYWwgPSB0cnVlO1xuXG5vdmVybG9hZC5udW1iZXJPcHRpb25hbFdpdGhEZWZhdWx0ID0gZnVuY3Rpb24gKGRlZikge1xuICB2YXIgZm4gPSBmdW5jdGlvbiBudW1iZXJPcHRpb25hbFdpdGhEZWZhdWx0KGFyZykge1xuICAgIGlmIChhcmcgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gb3ZlcmxvYWQubnVtYmVyKGFyZyk7XG4gIH07XG4gIGZuLm9wdGlvbmFsID0gdHJ1ZTtcbiAgZm4uZGVmYXVsdFZhbHVlID0gZGVmO1xuICByZXR1cm4gZm47XG59O1xuXG4vLyAtLS0gYXJyYXlcbm92ZXJsb2FkLmFycmF5ID0gZnVuY3Rpb24gYXJyYXkoYXJnKSB7XG4gIHJldHVybiBhcmcgaW5zdGFuY2VvZiBBcnJheTtcbn07XG5cbm92ZXJsb2FkLmFycmF5T3B0aW9uYWwgPSBmdW5jdGlvbiBhcnJheU9wdGlvbmFsKGFyZykge1xuICBpZiAoIWFyZykge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBvdmVybG9hZC5hcnJheShhcmcpO1xufTtcbm92ZXJsb2FkLmFycmF5T3B0aW9uYWwub3B0aW9uYWwgPSB0cnVlO1xuXG5vdmVybG9hZC5hcnJheU9wdGlvbmFsV2l0aERlZmF1bHQgPSBmdW5jdGlvbiAoZGVmKSB7XG4gIHZhciBmbiA9IGZ1bmN0aW9uIGFycmF5T3B0aW9uYWxXaXRoRGVmYXVsdChhcmcpIHtcbiAgICBpZiAoYXJnID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIG92ZXJsb2FkLmFycmF5KGFyZyk7XG4gIH07XG4gIGZuLm9wdGlvbmFsID0gdHJ1ZTtcbiAgZm4uZGVmYXVsdFZhbHVlID0gZGVmO1xuICByZXR1cm4gZm47XG59O1xuXG4vLyAtLS0gb2JqZWN0XG5vdmVybG9hZC5vYmplY3QgPSBmdW5jdGlvbiBvYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YoYXJnKSA9PT0gJ29iamVjdCc7XG59O1xuXG5vdmVybG9hZC5vYmplY3RPcHRpb25hbCA9IGZ1bmN0aW9uIG9iamVjdE9wdGlvbmFsKGFyZykge1xuICBpZiAoIWFyZykge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBvdmVybG9hZC5vYmplY3QoYXJnKTtcbn07XG5vdmVybG9hZC5vYmplY3RPcHRpb25hbC5vcHRpb25hbCA9IHRydWU7XG5cbm92ZXJsb2FkLm9iamVjdE9wdGlvbmFsV2l0aERlZmF1bHQgPSBmdW5jdGlvbiAoZGVmKSB7XG4gIHZhciBmbiA9IGZ1bmN0aW9uIG9iamVjdE9wdGlvbmFsV2l0aERlZmF1bHQoYXJnKSB7XG4gICAgaWYgKGFyZyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBvdmVybG9hZC5vYmplY3QoYXJnKTtcbiAgfTtcbiAgZm4ub3B0aW9uYWwgPSB0cnVlO1xuICBmbi5kZWZhdWx0VmFsdWUgPSBkZWY7XG4gIHJldHVybiBmbjtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIHBvc2l4KHBhdGgpIHtcblx0cmV0dXJuIHBhdGguY2hhckF0KDApID09PSAnLyc7XG59XG5cbmZ1bmN0aW9uIHdpbjMyKHBhdGgpIHtcblx0Ly8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL2Jsb2IvYjNmY2MyNDVmYjI1NTM5OTA5ZWYxZDVlYWEwMWRiZjkyZTE2ODYzMy9saWIvcGF0aC5qcyNMNTZcblx0dmFyIHNwbGl0RGV2aWNlUmUgPSAvXihbYS16QS1aXTp8W1xcXFxcXC9dezJ9W15cXFxcXFwvXStbXFxcXFxcL10rW15cXFxcXFwvXSspPyhbXFxcXFxcL10pPyhbXFxzXFxTXSo/KSQvO1xuXHR2YXIgcmVzdWx0ID0gc3BsaXREZXZpY2VSZS5leGVjKHBhdGgpO1xuXHR2YXIgZGV2aWNlID0gcmVzdWx0WzFdIHx8ICcnO1xuXHR2YXIgaXNVbmMgPSBCb29sZWFuKGRldmljZSAmJiBkZXZpY2UuY2hhckF0KDEpICE9PSAnOicpO1xuXG5cdC8vIFVOQyBwYXRocyBhcmUgYWx3YXlzIGFic29sdXRlXG5cdHJldHVybiBCb29sZWFuKHJlc3VsdFsyXSB8fCBpc1VuYyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJyA/IHdpbjMyIDogcG9zaXg7XG5tb2R1bGUuZXhwb3J0cy5wb3NpeCA9IHBvc2l4O1xubW9kdWxlLmV4cG9ydHMud2luMzIgPSB3aW4zMjtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBQdWxsU3RyZWFtO1xuXG5yZXF1aXJlKFwic2V0aW1tZWRpYXRlXCIpO1xudmFyIGluaGVyaXRzID0gcmVxdWlyZShcInV0aWxcIikuaW5oZXJpdHM7XG52YXIgUGFzc1Rocm91Z2ggPSByZXF1aXJlKCdyZWFkYWJsZS1zdHJlYW0vcGFzc3Rocm91Z2gnKTtcbnZhciBvdmVyID0gcmVxdWlyZSgnb3ZlcicpO1xudmFyIFNsaWNlU3RyZWFtID0gcmVxdWlyZSgnc2xpY2Utc3RyZWFtJyk7XG5cbmZ1bmN0aW9uIFB1bGxTdHJlYW0ob3B0cykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMub3B0cyA9IG9wdHMgfHwge307XG4gIFBhc3NUaHJvdWdoLmNhbGwodGhpcywgb3B0cyk7XG4gIHRoaXMub25jZSgnZmluaXNoJywgZnVuY3Rpb24oKSB7XG4gICAgc2VsZi5fd3JpdGVzRmluaXNoZWQgPSB0cnVlO1xuICAgIGlmIChzZWxmLl9mbHVzaGVkKSB7XG4gICAgICBzZWxmLl9maW5pc2goKTtcbiAgICB9XG4gIH0pO1xuICB0aGlzLm9uKCdyZWFkYWJsZScsIGZ1bmN0aW9uKCkge1xuICAgIHNlbGYuX3Byb2Nlc3MoKTtcbiAgfSk7XG59XG5pbmhlcml0cyhQdWxsU3RyZWFtLCBQYXNzVGhyb3VnaCk7XG5cblB1bGxTdHJlYW0ucHJvdG90eXBlLnB1bGwgPSBvdmVyKFtcbiAgW292ZXIubnVtYmVyT3B0aW9uYWxXaXRoRGVmYXVsdChudWxsKSwgb3Zlci5mdW5jLCBmdW5jdGlvbiAobGVuLCBjYWxsYmFjaykge1xuICAgIGlmIChsZW4gPT09IDApIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBuZXcgQnVmZmVyKDApKTtcbiAgICB9XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcHVsbFNlcnZpY2VSZXF1ZXN0KCk7XG5cbiAgICBmdW5jdGlvbiBwdWxsU2VydmljZVJlcXVlc3QoKSB7XG4gICAgICBzZWxmLl9zZXJ2aWNlUmVxdWVzdHMgPSBudWxsO1xuICAgICAgaWYgKHNlbGYuX2ZsdXNoZWQpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignRW5kIG9mIFN0cmVhbScpKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGRhdGEgPSBzZWxmLnJlYWQobGVuIHx8IHVuZGVmaW5lZCk7XG4gICAgICBpZiAoZGF0YSkge1xuICAgICAgICBzZXRJbW1lZGlhdGUoY2FsbGJhY2suYmluZChudWxsLCBudWxsLCBkYXRhKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWxmLl9zZXJ2aWNlUmVxdWVzdHMgPSBwdWxsU2VydmljZVJlcXVlc3Q7XG4gICAgICB9XG4gICAgfVxuICB9XVxuXSk7XG5cblB1bGxTdHJlYW0ucHJvdG90eXBlLnB1bGxVcFRvID0gb3ZlcihbXG4gIFtvdmVyLm51bWJlck9wdGlvbmFsV2l0aERlZmF1bHQobnVsbCksIGZ1bmN0aW9uIChsZW4pIHtcbiAgICB2YXIgZGF0YSA9IHRoaXMucmVhZChsZW4pO1xuICAgIGlmIChsZW4gJiYgIWRhdGEpIHtcbiAgICAgIGRhdGEgPSB0aGlzLnJlYWQoKTtcbiAgICB9XG4gICAgcmV0dXJuIGRhdGE7XG4gIH1dXG5dKTtcblxuUHVsbFN0cmVhbS5wcm90b3R5cGUucGlwZSA9IG92ZXIoW1xuICBbb3Zlci5udW1iZXJPcHRpb25hbFdpdGhEZWZhdWx0KG51bGwpLCBvdmVyLm9iamVjdCwgZnVuY3Rpb24gKGxlbiwgZGVzdFN0cmVhbSkge1xuICAgIGlmICghbGVuKSB7XG4gICAgICByZXR1cm4gUGFzc1Rocm91Z2gucHJvdG90eXBlLnBpcGUuY2FsbCh0aGlzLCBkZXN0U3RyZWFtKTtcbiAgICB9XG5cbiAgICBpZiAobGVuID09PSAwKSB7XG4gICAgICByZXR1cm4gZGVzdFN0cmVhbS5lbmQoKTtcbiAgICB9XG5cblxuICAgIHZhciBwdWxsc3RyZWFtID0gdGhpcztcbiAgICBwdWxsc3RyZWFtXG4gICAgICAucGlwZShuZXcgU2xpY2VTdHJlYW0oeyBsZW5ndGg6IGxlbiB9LCBmdW5jdGlvbiAoYnVmLCBzbGljZUVuZCwgZXh0cmEpIHtcbiAgICAgICAgaWYgKCFzbGljZUVuZCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnB1c2goYnVmKTtcbiAgICAgICAgfVxuICAgICAgICBwdWxsc3RyZWFtLnVucGlwZSgpO1xuICAgICAgICBwdWxsc3RyZWFtLnVuc2hpZnQoZXh0cmEpO1xuICAgICAgICB0aGlzLnB1c2goYnVmKTtcbiAgICAgICAgcmV0dXJuIHRoaXMucHVzaChudWxsKTtcbiAgICAgIH0pKVxuICAgICAgLnBpcGUoZGVzdFN0cmVhbSk7XG5cbiAgICByZXR1cm4gZGVzdFN0cmVhbTtcbiAgfV1cbl0pO1xuXG5QdWxsU3RyZWFtLnByb3RvdHlwZS5fcHJvY2VzcyA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuX3NlcnZpY2VSZXF1ZXN0cykge1xuICAgIHRoaXMuX3NlcnZpY2VSZXF1ZXN0cygpO1xuICB9XG59O1xuXG5QdWxsU3RyZWFtLnByb3RvdHlwZS5wcmVwZW5kID0gZnVuY3Rpb24gKGNodW5rKSB7XG4gIHRoaXMudW5zaGlmdChjaHVuayk7XG59O1xuXG5QdWxsU3RyZWFtLnByb3RvdHlwZS5kcmFpbiA9IGZ1bmN0aW9uIChsZW4sIGNhbGxiYWNrKSB7XG4gIGlmICh0aGlzLl9mbHVzaGVkKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignRW5kIG9mIFN0cmVhbScpKTtcbiAgfVxuXG4gIHZhciBkYXRhID0gdGhpcy5wdWxsVXBUbyhsZW4pO1xuICB2YXIgYnl0ZXNEcmFpbmVkID0gZGF0YSAmJiBkYXRhLmxlbmd0aCB8fCAwO1xuICBpZiAoYnl0ZXNEcmFpbmVkID09PSBsZW4pIHtcbiAgICAgc2V0SW1tZWRpYXRlKGNhbGxiYWNrKTtcbiAgfSBlbHNlIGlmIChieXRlc0RyYWluZWQgPiAwKSB7XG4gICAgdGhpcy5kcmFpbihsZW4gLSBieXRlc0RyYWluZWQsIGNhbGxiYWNrKTtcbiAgfSBlbHNlIHtcbiAgICAvL2ludGVybmFsIGJ1ZmZlciBpcyBlbXB0eSwgd2FpdCB1bnRpbCBkYXRhIGNhbiBiZSBjb25zdW1lZFxuICAgIHRoaXMub25jZSgncmVhZGFibGUnLCB0aGlzLmRyYWluLmJpbmQodGhpcywgbGVuIC0gYnl0ZXNEcmFpbmVkLCBjYWxsYmFjaykpO1xuICB9XG59O1xuXG5QdWxsU3RyZWFtLnByb3RvdHlwZS5fZmx1c2ggPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAodGhpcy5fcmVhZGFibGVTdGF0ZS5sZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIHNldEltbWVkaWF0ZShzZWxmLl9mbHVzaC5iaW5kKHNlbGYsIGNhbGxiYWNrKSk7XG4gIH1cblxuICB0aGlzLl9mbHVzaGVkID0gdHJ1ZTtcbiAgaWYgKHNlbGYuX3dyaXRlc0ZpbmlzaGVkKSB7XG4gICAgc2VsZi5fZmluaXNoKGNhbGxiYWNrKTtcbiAgfSBlbHNlIHtcbiAgICBjYWxsYmFjaygpO1xuICB9XG59O1xuXG5QdWxsU3RyZWFtLnByb3RvdHlwZS5fZmluaXNoID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gIGlmICh0aGlzLl9zZXJ2aWNlUmVxdWVzdHMpIHtcbiAgICB0aGlzLl9zZXJ2aWNlUmVxdWVzdHMoKTtcbiAgfVxuICBzZXRJbW1lZGlhdGUoY2FsbGJhY2spO1xufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyBhIGR1cGxleCBzdHJlYW0gaXMganVzdCBhIHN0cmVhbSB0aGF0IGlzIGJvdGggcmVhZGFibGUgYW5kIHdyaXRhYmxlLlxuLy8gU2luY2UgSlMgZG9lc24ndCBoYXZlIG11bHRpcGxlIHByb3RvdHlwYWwgaW5oZXJpdGFuY2UsIHRoaXMgY2xhc3Ncbi8vIHByb3RvdHlwYWxseSBpbmhlcml0cyBmcm9tIFJlYWRhYmxlLCBhbmQgdGhlbiBwYXJhc2l0aWNhbGx5IGZyb21cbi8vIFdyaXRhYmxlLlxuXG5tb2R1bGUuZXhwb3J0cyA9IER1cGxleDtcblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciBvYmplY3RLZXlzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24gKG9iaikge1xuICB2YXIga2V5cyA9IFtdO1xuICBmb3IgKHZhciBrZXkgaW4gb2JqKSBrZXlzLnB1c2goa2V5KTtcbiAgcmV0dXJuIGtleXM7XG59XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIHV0aWwgPSByZXF1aXJlKCdjb3JlLXV0aWwtaXMnKTtcbnV0aWwuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuLyo8L3JlcGxhY2VtZW50PiovXG5cbnZhciBSZWFkYWJsZSA9IHJlcXVpcmUoJy4vX3N0cmVhbV9yZWFkYWJsZScpO1xudmFyIFdyaXRhYmxlID0gcmVxdWlyZSgnLi9fc3RyZWFtX3dyaXRhYmxlJyk7XG5cbnV0aWwuaW5oZXJpdHMoRHVwbGV4LCBSZWFkYWJsZSk7XG5cbmZvckVhY2gob2JqZWN0S2V5cyhXcml0YWJsZS5wcm90b3R5cGUpLCBmdW5jdGlvbihtZXRob2QpIHtcbiAgaWYgKCFEdXBsZXgucHJvdG90eXBlW21ldGhvZF0pXG4gICAgRHVwbGV4LnByb3RvdHlwZVttZXRob2RdID0gV3JpdGFibGUucHJvdG90eXBlW21ldGhvZF07XG59KTtcblxuZnVuY3Rpb24gRHVwbGV4KG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIER1cGxleCkpXG4gICAgcmV0dXJuIG5ldyBEdXBsZXgob3B0aW9ucyk7XG5cbiAgUmVhZGFibGUuY2FsbCh0aGlzLCBvcHRpb25zKTtcbiAgV3JpdGFibGUuY2FsbCh0aGlzLCBvcHRpb25zKTtcblxuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLnJlYWRhYmxlID09PSBmYWxzZSlcbiAgICB0aGlzLnJlYWRhYmxlID0gZmFsc2U7XG5cbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy53cml0YWJsZSA9PT0gZmFsc2UpXG4gICAgdGhpcy53cml0YWJsZSA9IGZhbHNlO1xuXG4gIHRoaXMuYWxsb3dIYWxmT3BlbiA9IHRydWU7XG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMuYWxsb3dIYWxmT3BlbiA9PT0gZmFsc2UpXG4gICAgdGhpcy5hbGxvd0hhbGZPcGVuID0gZmFsc2U7XG5cbiAgdGhpcy5vbmNlKCdlbmQnLCBvbmVuZCk7XG59XG5cbi8vIHRoZSBuby1oYWxmLW9wZW4gZW5mb3JjZXJcbmZ1bmN0aW9uIG9uZW5kKCkge1xuICAvLyBpZiB3ZSBhbGxvdyBoYWxmLW9wZW4gc3RhdGUsIG9yIGlmIHRoZSB3cml0YWJsZSBzaWRlIGVuZGVkLFxuICAvLyB0aGVuIHdlJ3JlIG9rLlxuICBpZiAodGhpcy5hbGxvd0hhbGZPcGVuIHx8IHRoaXMuX3dyaXRhYmxlU3RhdGUuZW5kZWQpXG4gICAgcmV0dXJuO1xuXG4gIC8vIG5vIG1vcmUgZGF0YSBjYW4gYmUgd3JpdHRlbi5cbiAgLy8gQnV0IGFsbG93IG1vcmUgd3JpdGVzIHRvIGhhcHBlbiBpbiB0aGlzIHRpY2suXG4gIHByb2Nlc3MubmV4dFRpY2sodGhpcy5lbmQuYmluZCh0aGlzKSk7XG59XG5cbmZ1bmN0aW9uIGZvckVhY2ggKHhzLCBmKSB7XG4gIGZvciAodmFyIGkgPSAwLCBsID0geHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgZih4c1tpXSwgaSk7XG4gIH1cbn1cbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyBhIHBhc3N0aHJvdWdoIHN0cmVhbS5cbi8vIGJhc2ljYWxseSBqdXN0IHRoZSBtb3N0IG1pbmltYWwgc29ydCBvZiBUcmFuc2Zvcm0gc3RyZWFtLlxuLy8gRXZlcnkgd3JpdHRlbiBjaHVuayBnZXRzIG91dHB1dCBhcy1pcy5cblxubW9kdWxlLmV4cG9ydHMgPSBQYXNzVGhyb3VnaDtcblxudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vX3N0cmVhbV90cmFuc2Zvcm0nKTtcblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciB1dGlsID0gcmVxdWlyZSgnY29yZS11dGlsLWlzJyk7XG51dGlsLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG51dGlsLmluaGVyaXRzKFBhc3NUaHJvdWdoLCBUcmFuc2Zvcm0pO1xuXG5mdW5jdGlvbiBQYXNzVGhyb3VnaChvcHRpb25zKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBQYXNzVGhyb3VnaCkpXG4gICAgcmV0dXJuIG5ldyBQYXNzVGhyb3VnaChvcHRpb25zKTtcblxuICBUcmFuc2Zvcm0uY2FsbCh0aGlzLCBvcHRpb25zKTtcbn1cblxuUGFzc1Rocm91Z2gucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIGNiKG51bGwsIGNodW5rKTtcbn07XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxubW9kdWxlLmV4cG9ydHMgPSBSZWFkYWJsZTtcblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciBpc0FycmF5ID0gcmVxdWlyZSgnaXNhcnJheScpO1xuLyo8L3JlcGxhY2VtZW50PiovXG5cblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciBCdWZmZXIgPSByZXF1aXJlKCdidWZmZXInKS5CdWZmZXI7XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxuUmVhZGFibGUuUmVhZGFibGVTdGF0ZSA9IFJlYWRhYmxlU3RhdGU7XG5cbnZhciBFRSA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbmlmICghRUUubGlzdGVuZXJDb3VudCkgRUUubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgcmV0dXJuIGVtaXR0ZXIubGlzdGVuZXJzKHR5cGUpLmxlbmd0aDtcbn07XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxudmFyIFN0cmVhbSA9IHJlcXVpcmUoJ3N0cmVhbScpO1xuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIHV0aWwgPSByZXF1aXJlKCdjb3JlLXV0aWwtaXMnKTtcbnV0aWwuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuLyo8L3JlcGxhY2VtZW50PiovXG5cbnZhciBTdHJpbmdEZWNvZGVyO1xuXG51dGlsLmluaGVyaXRzKFJlYWRhYmxlLCBTdHJlYW0pO1xuXG5mdW5jdGlvbiBSZWFkYWJsZVN0YXRlKG9wdGlvbnMsIHN0cmVhbSkge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAvLyB0aGUgcG9pbnQgYXQgd2hpY2ggaXQgc3RvcHMgY2FsbGluZyBfcmVhZCgpIHRvIGZpbGwgdGhlIGJ1ZmZlclxuICAvLyBOb3RlOiAwIGlzIGEgdmFsaWQgdmFsdWUsIG1lYW5zIFwiZG9uJ3QgY2FsbCBfcmVhZCBwcmVlbXB0aXZlbHkgZXZlclwiXG4gIHZhciBod20gPSBvcHRpb25zLmhpZ2hXYXRlck1hcms7XG4gIHRoaXMuaGlnaFdhdGVyTWFyayA9IChod20gfHwgaHdtID09PSAwKSA/IGh3bSA6IDE2ICogMTAyNDtcblxuICAvLyBjYXN0IHRvIGludHMuXG4gIHRoaXMuaGlnaFdhdGVyTWFyayA9IH5+dGhpcy5oaWdoV2F0ZXJNYXJrO1xuXG4gIHRoaXMuYnVmZmVyID0gW107XG4gIHRoaXMubGVuZ3RoID0gMDtcbiAgdGhpcy5waXBlcyA9IG51bGw7XG4gIHRoaXMucGlwZXNDb3VudCA9IDA7XG4gIHRoaXMuZmxvd2luZyA9IGZhbHNlO1xuICB0aGlzLmVuZGVkID0gZmFsc2U7XG4gIHRoaXMuZW5kRW1pdHRlZCA9IGZhbHNlO1xuICB0aGlzLnJlYWRpbmcgPSBmYWxzZTtcblxuICAvLyBJbiBzdHJlYW1zIHRoYXQgbmV2ZXIgaGF2ZSBhbnkgZGF0YSwgYW5kIGRvIHB1c2gobnVsbCkgcmlnaHQgYXdheSxcbiAgLy8gdGhlIGNvbnN1bWVyIGNhbiBtaXNzIHRoZSAnZW5kJyBldmVudCBpZiB0aGV5IGRvIHNvbWUgSS9PIGJlZm9yZVxuICAvLyBjb25zdW1pbmcgdGhlIHN0cmVhbS4gIFNvLCB3ZSBkb24ndCBlbWl0KCdlbmQnKSB1bnRpbCBzb21lIHJlYWRpbmdcbiAgLy8gaGFwcGVucy5cbiAgdGhpcy5jYWxsZWRSZWFkID0gZmFsc2U7XG5cbiAgLy8gYSBmbGFnIHRvIGJlIGFibGUgdG8gdGVsbCBpZiB0aGUgb253cml0ZSBjYiBpcyBjYWxsZWQgaW1tZWRpYXRlbHksXG4gIC8vIG9yIG9uIGEgbGF0ZXIgdGljay4gIFdlIHNldCB0aGlzIHRvIHRydWUgYXQgZmlyc3QsIGJlY3Vhc2UgYW55XG4gIC8vIGFjdGlvbnMgdGhhdCBzaG91bGRuJ3QgaGFwcGVuIHVudGlsIFwibGF0ZXJcIiBzaG91bGQgZ2VuZXJhbGx5IGFsc29cbiAgLy8gbm90IGhhcHBlbiBiZWZvcmUgdGhlIGZpcnN0IHdyaXRlIGNhbGwuXG4gIHRoaXMuc3luYyA9IHRydWU7XG5cbiAgLy8gd2hlbmV2ZXIgd2UgcmV0dXJuIG51bGwsIHRoZW4gd2Ugc2V0IGEgZmxhZyB0byBzYXlcbiAgLy8gdGhhdCB3ZSdyZSBhd2FpdGluZyBhICdyZWFkYWJsZScgZXZlbnQgZW1pc3Npb24uXG4gIHRoaXMubmVlZFJlYWRhYmxlID0gZmFsc2U7XG4gIHRoaXMuZW1pdHRlZFJlYWRhYmxlID0gZmFsc2U7XG4gIHRoaXMucmVhZGFibGVMaXN0ZW5pbmcgPSBmYWxzZTtcblxuXG4gIC8vIG9iamVjdCBzdHJlYW0gZmxhZy4gVXNlZCB0byBtYWtlIHJlYWQobikgaWdub3JlIG4gYW5kIHRvXG4gIC8vIG1ha2UgYWxsIHRoZSBidWZmZXIgbWVyZ2luZyBhbmQgbGVuZ3RoIGNoZWNrcyBnbyBhd2F5XG4gIHRoaXMub2JqZWN0TW9kZSA9ICEhb3B0aW9ucy5vYmplY3RNb2RlO1xuXG4gIC8vIENyeXB0byBpcyBraW5kIG9mIG9sZCBhbmQgY3J1c3R5LiAgSGlzdG9yaWNhbGx5LCBpdHMgZGVmYXVsdCBzdHJpbmdcbiAgLy8gZW5jb2RpbmcgaXMgJ2JpbmFyeScgc28gd2UgaGF2ZSB0byBtYWtlIHRoaXMgY29uZmlndXJhYmxlLlxuICAvLyBFdmVyeXRoaW5nIGVsc2UgaW4gdGhlIHVuaXZlcnNlIHVzZXMgJ3V0ZjgnLCB0aG91Z2guXG4gIHRoaXMuZGVmYXVsdEVuY29kaW5nID0gb3B0aW9ucy5kZWZhdWx0RW5jb2RpbmcgfHwgJ3V0ZjgnO1xuXG4gIC8vIHdoZW4gcGlwaW5nLCB3ZSBvbmx5IGNhcmUgYWJvdXQgJ3JlYWRhYmxlJyBldmVudHMgdGhhdCBoYXBwZW5cbiAgLy8gYWZ0ZXIgcmVhZCgpaW5nIGFsbCB0aGUgYnl0ZXMgYW5kIG5vdCBnZXR0aW5nIGFueSBwdXNoYmFjay5cbiAgdGhpcy5yYW5PdXQgPSBmYWxzZTtcblxuICAvLyB0aGUgbnVtYmVyIG9mIHdyaXRlcnMgdGhhdCBhcmUgYXdhaXRpbmcgYSBkcmFpbiBldmVudCBpbiAucGlwZSgpc1xuICB0aGlzLmF3YWl0RHJhaW4gPSAwO1xuXG4gIC8vIGlmIHRydWUsIGEgbWF5YmVSZWFkTW9yZSBoYXMgYmVlbiBzY2hlZHVsZWRcbiAgdGhpcy5yZWFkaW5nTW9yZSA9IGZhbHNlO1xuXG4gIHRoaXMuZGVjb2RlciA9IG51bGw7XG4gIHRoaXMuZW5jb2RpbmcgPSBudWxsO1xuICBpZiAob3B0aW9ucy5lbmNvZGluZykge1xuICAgIGlmICghU3RyaW5nRGVjb2RlcilcbiAgICAgIFN0cmluZ0RlY29kZXIgPSByZXF1aXJlKCdzdHJpbmdfZGVjb2Rlci8nKS5TdHJpbmdEZWNvZGVyO1xuICAgIHRoaXMuZGVjb2RlciA9IG5ldyBTdHJpbmdEZWNvZGVyKG9wdGlvbnMuZW5jb2RpbmcpO1xuICAgIHRoaXMuZW5jb2RpbmcgPSBvcHRpb25zLmVuY29kaW5nO1xuICB9XG59XG5cbmZ1bmN0aW9uIFJlYWRhYmxlKG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFJlYWRhYmxlKSlcbiAgICByZXR1cm4gbmV3IFJlYWRhYmxlKG9wdGlvbnMpO1xuXG4gIHRoaXMuX3JlYWRhYmxlU3RhdGUgPSBuZXcgUmVhZGFibGVTdGF0ZShvcHRpb25zLCB0aGlzKTtcblxuICAvLyBsZWdhY3lcbiAgdGhpcy5yZWFkYWJsZSA9IHRydWU7XG5cbiAgU3RyZWFtLmNhbGwodGhpcyk7XG59XG5cbi8vIE1hbnVhbGx5IHNob3ZlIHNvbWV0aGluZyBpbnRvIHRoZSByZWFkKCkgYnVmZmVyLlxuLy8gVGhpcyByZXR1cm5zIHRydWUgaWYgdGhlIGhpZ2hXYXRlck1hcmsgaGFzIG5vdCBiZWVuIGhpdCB5ZXQsXG4vLyBzaW1pbGFyIHRvIGhvdyBXcml0YWJsZS53cml0ZSgpIHJldHVybnMgdHJ1ZSBpZiB5b3Ugc2hvdWxkXG4vLyB3cml0ZSgpIHNvbWUgbW9yZS5cblJlYWRhYmxlLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG5cbiAgaWYgKHR5cGVvZiBjaHVuayA9PT0gJ3N0cmluZycgJiYgIXN0YXRlLm9iamVjdE1vZGUpIHtcbiAgICBlbmNvZGluZyA9IGVuY29kaW5nIHx8IHN0YXRlLmRlZmF1bHRFbmNvZGluZztcbiAgICBpZiAoZW5jb2RpbmcgIT09IHN0YXRlLmVuY29kaW5nKSB7XG4gICAgICBjaHVuayA9IG5ldyBCdWZmZXIoY2h1bmssIGVuY29kaW5nKTtcbiAgICAgIGVuY29kaW5nID0gJyc7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlYWRhYmxlQWRkQ2h1bmsodGhpcywgc3RhdGUsIGNodW5rLCBlbmNvZGluZywgZmFsc2UpO1xufTtcblxuLy8gVW5zaGlmdCBzaG91bGQgKmFsd2F5cyogYmUgc29tZXRoaW5nIGRpcmVjdGx5IG91dCBvZiByZWFkKClcblJlYWRhYmxlLnByb3RvdHlwZS51bnNoaWZ0ID0gZnVuY3Rpb24oY2h1bmspIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcbiAgcmV0dXJuIHJlYWRhYmxlQWRkQ2h1bmsodGhpcywgc3RhdGUsIGNodW5rLCAnJywgdHJ1ZSk7XG59O1xuXG5mdW5jdGlvbiByZWFkYWJsZUFkZENodW5rKHN0cmVhbSwgc3RhdGUsIGNodW5rLCBlbmNvZGluZywgYWRkVG9Gcm9udCkge1xuICB2YXIgZXIgPSBjaHVua0ludmFsaWQoc3RhdGUsIGNodW5rKTtcbiAgaWYgKGVyKSB7XG4gICAgc3RyZWFtLmVtaXQoJ2Vycm9yJywgZXIpO1xuICB9IGVsc2UgaWYgKGNodW5rID09PSBudWxsIHx8IGNodW5rID09PSB1bmRlZmluZWQpIHtcbiAgICBzdGF0ZS5yZWFkaW5nID0gZmFsc2U7XG4gICAgaWYgKCFzdGF0ZS5lbmRlZClcbiAgICAgIG9uRW9mQ2h1bmsoc3RyZWFtLCBzdGF0ZSk7XG4gIH0gZWxzZSBpZiAoc3RhdGUub2JqZWN0TW9kZSB8fCBjaHVuayAmJiBjaHVuay5sZW5ndGggPiAwKSB7XG4gICAgaWYgKHN0YXRlLmVuZGVkICYmICFhZGRUb0Zyb250KSB7XG4gICAgICB2YXIgZSA9IG5ldyBFcnJvcignc3RyZWFtLnB1c2goKSBhZnRlciBFT0YnKTtcbiAgICAgIHN0cmVhbS5lbWl0KCdlcnJvcicsIGUpO1xuICAgIH0gZWxzZSBpZiAoc3RhdGUuZW5kRW1pdHRlZCAmJiBhZGRUb0Zyb250KSB7XG4gICAgICB2YXIgZSA9IG5ldyBFcnJvcignc3RyZWFtLnVuc2hpZnQoKSBhZnRlciBlbmQgZXZlbnQnKTtcbiAgICAgIHN0cmVhbS5lbWl0KCdlcnJvcicsIGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoc3RhdGUuZGVjb2RlciAmJiAhYWRkVG9Gcm9udCAmJiAhZW5jb2RpbmcpXG4gICAgICAgIGNodW5rID0gc3RhdGUuZGVjb2Rlci53cml0ZShjaHVuayk7XG5cbiAgICAgIC8vIHVwZGF0ZSB0aGUgYnVmZmVyIGluZm8uXG4gICAgICBzdGF0ZS5sZW5ndGggKz0gc3RhdGUub2JqZWN0TW9kZSA/IDEgOiBjaHVuay5sZW5ndGg7XG4gICAgICBpZiAoYWRkVG9Gcm9udCkge1xuICAgICAgICBzdGF0ZS5idWZmZXIudW5zaGlmdChjaHVuayk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0ZS5yZWFkaW5nID0gZmFsc2U7XG4gICAgICAgIHN0YXRlLmJ1ZmZlci5wdXNoKGNodW5rKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHN0YXRlLm5lZWRSZWFkYWJsZSlcbiAgICAgICAgZW1pdFJlYWRhYmxlKHN0cmVhbSk7XG5cbiAgICAgIG1heWJlUmVhZE1vcmUoc3RyZWFtLCBzdGF0ZSk7XG4gICAgfVxuICB9IGVsc2UgaWYgKCFhZGRUb0Zyb250KSB7XG4gICAgc3RhdGUucmVhZGluZyA9IGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIG5lZWRNb3JlRGF0YShzdGF0ZSk7XG59XG5cblxuXG4vLyBpZiBpdCdzIHBhc3QgdGhlIGhpZ2ggd2F0ZXIgbWFyaywgd2UgY2FuIHB1c2ggaW4gc29tZSBtb3JlLlxuLy8gQWxzbywgaWYgd2UgaGF2ZSBubyBkYXRhIHlldCwgd2UgY2FuIHN0YW5kIHNvbWVcbi8vIG1vcmUgYnl0ZXMuICBUaGlzIGlzIHRvIHdvcmsgYXJvdW5kIGNhc2VzIHdoZXJlIGh3bT0wLFxuLy8gc3VjaCBhcyB0aGUgcmVwbC4gIEFsc28sIGlmIHRoZSBwdXNoKCkgdHJpZ2dlcmVkIGFcbi8vIHJlYWRhYmxlIGV2ZW50LCBhbmQgdGhlIHVzZXIgY2FsbGVkIHJlYWQobGFyZ2VOdW1iZXIpIHN1Y2ggdGhhdFxuLy8gbmVlZFJlYWRhYmxlIHdhcyBzZXQsIHRoZW4gd2Ugb3VnaHQgdG8gcHVzaCBtb3JlLCBzbyB0aGF0IGFub3RoZXJcbi8vICdyZWFkYWJsZScgZXZlbnQgd2lsbCBiZSB0cmlnZ2VyZWQuXG5mdW5jdGlvbiBuZWVkTW9yZURhdGEoc3RhdGUpIHtcbiAgcmV0dXJuICFzdGF0ZS5lbmRlZCAmJlxuICAgICAgICAgKHN0YXRlLm5lZWRSZWFkYWJsZSB8fFxuICAgICAgICAgIHN0YXRlLmxlbmd0aCA8IHN0YXRlLmhpZ2hXYXRlck1hcmsgfHxcbiAgICAgICAgICBzdGF0ZS5sZW5ndGggPT09IDApO1xufVxuXG4vLyBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5cblJlYWRhYmxlLnByb3RvdHlwZS5zZXRFbmNvZGluZyA9IGZ1bmN0aW9uKGVuYykge1xuICBpZiAoIVN0cmluZ0RlY29kZXIpXG4gICAgU3RyaW5nRGVjb2RlciA9IHJlcXVpcmUoJ3N0cmluZ19kZWNvZGVyLycpLlN0cmluZ0RlY29kZXI7XG4gIHRoaXMuX3JlYWRhYmxlU3RhdGUuZGVjb2RlciA9IG5ldyBTdHJpbmdEZWNvZGVyKGVuYyk7XG4gIHRoaXMuX3JlYWRhYmxlU3RhdGUuZW5jb2RpbmcgPSBlbmM7XG59O1xuXG4vLyBEb24ndCByYWlzZSB0aGUgaHdtID4gMTI4TUJcbnZhciBNQVhfSFdNID0gMHg4MDAwMDA7XG5mdW5jdGlvbiByb3VuZFVwVG9OZXh0UG93ZXJPZjIobikge1xuICBpZiAobiA+PSBNQVhfSFdNKSB7XG4gICAgbiA9IE1BWF9IV007XG4gIH0gZWxzZSB7XG4gICAgLy8gR2V0IHRoZSBuZXh0IGhpZ2hlc3QgcG93ZXIgb2YgMlxuICAgIG4tLTtcbiAgICBmb3IgKHZhciBwID0gMTsgcCA8IDMyOyBwIDw8PSAxKSBuIHw9IG4gPj4gcDtcbiAgICBuKys7XG4gIH1cbiAgcmV0dXJuIG47XG59XG5cbmZ1bmN0aW9uIGhvd011Y2hUb1JlYWQobiwgc3RhdGUpIHtcbiAgaWYgKHN0YXRlLmxlbmd0aCA9PT0gMCAmJiBzdGF0ZS5lbmRlZClcbiAgICByZXR1cm4gMDtcblxuICBpZiAoc3RhdGUub2JqZWN0TW9kZSlcbiAgICByZXR1cm4gbiA9PT0gMCA/IDAgOiAxO1xuXG4gIGlmIChuID09PSBudWxsIHx8IGlzTmFOKG4pKSB7XG4gICAgLy8gb25seSBmbG93IG9uZSBidWZmZXIgYXQgYSB0aW1lXG4gICAgaWYgKHN0YXRlLmZsb3dpbmcgJiYgc3RhdGUuYnVmZmVyLmxlbmd0aClcbiAgICAgIHJldHVybiBzdGF0ZS5idWZmZXJbMF0ubGVuZ3RoO1xuICAgIGVsc2VcbiAgICAgIHJldHVybiBzdGF0ZS5sZW5ndGg7XG4gIH1cblxuICBpZiAobiA8PSAwKVxuICAgIHJldHVybiAwO1xuXG4gIC8vIElmIHdlJ3JlIGFza2luZyBmb3IgbW9yZSB0aGFuIHRoZSB0YXJnZXQgYnVmZmVyIGxldmVsLFxuICAvLyB0aGVuIHJhaXNlIHRoZSB3YXRlciBtYXJrLiAgQnVtcCB1cCB0byB0aGUgbmV4dCBoaWdoZXN0XG4gIC8vIHBvd2VyIG9mIDIsIHRvIHByZXZlbnQgaW5jcmVhc2luZyBpdCBleGNlc3NpdmVseSBpbiB0aW55XG4gIC8vIGFtb3VudHMuXG4gIGlmIChuID4gc3RhdGUuaGlnaFdhdGVyTWFyaylcbiAgICBzdGF0ZS5oaWdoV2F0ZXJNYXJrID0gcm91bmRVcFRvTmV4dFBvd2VyT2YyKG4pO1xuXG4gIC8vIGRvbid0IGhhdmUgdGhhdCBtdWNoLiAgcmV0dXJuIG51bGwsIHVubGVzcyB3ZSd2ZSBlbmRlZC5cbiAgaWYgKG4gPiBzdGF0ZS5sZW5ndGgpIHtcbiAgICBpZiAoIXN0YXRlLmVuZGVkKSB7XG4gICAgICBzdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuICAgICAgcmV0dXJuIDA7XG4gICAgfSBlbHNlXG4gICAgICByZXR1cm4gc3RhdGUubGVuZ3RoO1xuICB9XG5cbiAgcmV0dXJuIG47XG59XG5cbi8vIHlvdSBjYW4gb3ZlcnJpZGUgZWl0aGVyIHRoaXMgbWV0aG9kLCBvciB0aGUgYXN5bmMgX3JlYWQobikgYmVsb3cuXG5SZWFkYWJsZS5wcm90b3R5cGUucmVhZCA9IGZ1bmN0aW9uKG4pIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcbiAgc3RhdGUuY2FsbGVkUmVhZCA9IHRydWU7XG4gIHZhciBuT3JpZyA9IG47XG4gIHZhciByZXQ7XG5cbiAgaWYgKHR5cGVvZiBuICE9PSAnbnVtYmVyJyB8fCBuID4gMClcbiAgICBzdGF0ZS5lbWl0dGVkUmVhZGFibGUgPSBmYWxzZTtcblxuICAvLyBpZiB3ZSdyZSBkb2luZyByZWFkKDApIHRvIHRyaWdnZXIgYSByZWFkYWJsZSBldmVudCwgYnV0IHdlXG4gIC8vIGFscmVhZHkgaGF2ZSBhIGJ1bmNoIG9mIGRhdGEgaW4gdGhlIGJ1ZmZlciwgdGhlbiBqdXN0IHRyaWdnZXJcbiAgLy8gdGhlICdyZWFkYWJsZScgZXZlbnQgYW5kIG1vdmUgb24uXG4gIGlmIChuID09PSAwICYmXG4gICAgICBzdGF0ZS5uZWVkUmVhZGFibGUgJiZcbiAgICAgIChzdGF0ZS5sZW5ndGggPj0gc3RhdGUuaGlnaFdhdGVyTWFyayB8fCBzdGF0ZS5lbmRlZCkpIHtcbiAgICBlbWl0UmVhZGFibGUodGhpcyk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBuID0gaG93TXVjaFRvUmVhZChuLCBzdGF0ZSk7XG5cbiAgLy8gaWYgd2UndmUgZW5kZWQsIGFuZCB3ZSdyZSBub3cgY2xlYXIsIHRoZW4gZmluaXNoIGl0IHVwLlxuICBpZiAobiA9PT0gMCAmJiBzdGF0ZS5lbmRlZCkge1xuICAgIHJldCA9IG51bGw7XG5cbiAgICAvLyBJbiBjYXNlcyB3aGVyZSB0aGUgZGVjb2RlciBkaWQgbm90IHJlY2VpdmUgZW5vdWdoIGRhdGFcbiAgICAvLyB0byBwcm9kdWNlIGEgZnVsbCBjaHVuaywgdGhlbiBpbW1lZGlhdGVseSByZWNlaXZlZCBhblxuICAgIC8vIEVPRiwgc3RhdGUuYnVmZmVyIHdpbGwgY29udGFpbiBbPEJ1ZmZlciA+LCA8QnVmZmVyIDAwIC4uLj5dLlxuICAgIC8vIGhvd011Y2hUb1JlYWQgd2lsbCBzZWUgdGhpcyBhbmQgY29lcmNlIHRoZSBhbW91bnQgdG9cbiAgICAvLyByZWFkIHRvIHplcm8gKGJlY2F1c2UgaXQncyBsb29raW5nIGF0IHRoZSBsZW5ndGggb2YgdGhlXG4gICAgLy8gZmlyc3QgPEJ1ZmZlciA+IGluIHN0YXRlLmJ1ZmZlciksIGFuZCB3ZSdsbCBlbmQgdXAgaGVyZS5cbiAgICAvL1xuICAgIC8vIFRoaXMgY2FuIG9ubHkgaGFwcGVuIHZpYSBzdGF0ZS5kZWNvZGVyIC0tIG5vIG90aGVyIHZlbnVlXG4gICAgLy8gZXhpc3RzIGZvciBwdXNoaW5nIGEgemVyby1sZW5ndGggY2h1bmsgaW50byBzdGF0ZS5idWZmZXJcbiAgICAvLyBhbmQgdHJpZ2dlcmluZyB0aGlzIGJlaGF2aW9yLiBJbiB0aGlzIGNhc2UsIHdlIHJldHVybiBvdXJcbiAgICAvLyByZW1haW5pbmcgZGF0YSBhbmQgZW5kIHRoZSBzdHJlYW0sIGlmIGFwcHJvcHJpYXRlLlxuICAgIGlmIChzdGF0ZS5sZW5ndGggPiAwICYmIHN0YXRlLmRlY29kZXIpIHtcbiAgICAgIHJldCA9IGZyb21MaXN0KG4sIHN0YXRlKTtcbiAgICAgIHN0YXRlLmxlbmd0aCAtPSByZXQubGVuZ3RoO1xuICAgIH1cblxuICAgIGlmIChzdGF0ZS5sZW5ndGggPT09IDApXG4gICAgICBlbmRSZWFkYWJsZSh0aGlzKTtcblxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBBbGwgdGhlIGFjdHVhbCBjaHVuayBnZW5lcmF0aW9uIGxvZ2ljIG5lZWRzIHRvIGJlXG4gIC8vICpiZWxvdyogdGhlIGNhbGwgdG8gX3JlYWQuICBUaGUgcmVhc29uIGlzIHRoYXQgaW4gY2VydGFpblxuICAvLyBzeW50aGV0aWMgc3RyZWFtIGNhc2VzLCBzdWNoIGFzIHBhc3N0aHJvdWdoIHN0cmVhbXMsIF9yZWFkXG4gIC8vIG1heSBiZSBhIGNvbXBsZXRlbHkgc3luY2hyb25vdXMgb3BlcmF0aW9uIHdoaWNoIG1heSBjaGFuZ2VcbiAgLy8gdGhlIHN0YXRlIG9mIHRoZSByZWFkIGJ1ZmZlciwgcHJvdmlkaW5nIGVub3VnaCBkYXRhIHdoZW5cbiAgLy8gYmVmb3JlIHRoZXJlIHdhcyAqbm90KiBlbm91Z2guXG4gIC8vXG4gIC8vIFNvLCB0aGUgc3RlcHMgYXJlOlxuICAvLyAxLiBGaWd1cmUgb3V0IHdoYXQgdGhlIHN0YXRlIG9mIHRoaW5ncyB3aWxsIGJlIGFmdGVyIHdlIGRvXG4gIC8vIGEgcmVhZCBmcm9tIHRoZSBidWZmZXIuXG4gIC8vXG4gIC8vIDIuIElmIHRoYXQgcmVzdWx0aW5nIHN0YXRlIHdpbGwgdHJpZ2dlciBhIF9yZWFkLCB0aGVuIGNhbGwgX3JlYWQuXG4gIC8vIE5vdGUgdGhhdCB0aGlzIG1heSBiZSBhc3luY2hyb25vdXMsIG9yIHN5bmNocm9ub3VzLiAgWWVzLCBpdCBpc1xuICAvLyBkZWVwbHkgdWdseSB0byB3cml0ZSBBUElzIHRoaXMgd2F5LCBidXQgdGhhdCBzdGlsbCBkb2Vzbid0IG1lYW5cbiAgLy8gdGhhdCB0aGUgUmVhZGFibGUgY2xhc3Mgc2hvdWxkIGJlaGF2ZSBpbXByb3Blcmx5LCBhcyBzdHJlYW1zIGFyZVxuICAvLyBkZXNpZ25lZCB0byBiZSBzeW5jL2FzeW5jIGFnbm9zdGljLlxuICAvLyBUYWtlIG5vdGUgaWYgdGhlIF9yZWFkIGNhbGwgaXMgc3luYyBvciBhc3luYyAoaWUsIGlmIHRoZSByZWFkIGNhbGxcbiAgLy8gaGFzIHJldHVybmVkIHlldCksIHNvIHRoYXQgd2Uga25vdyB3aGV0aGVyIG9yIG5vdCBpdCdzIHNhZmUgdG8gZW1pdFxuICAvLyAncmVhZGFibGUnIGV0Yy5cbiAgLy9cbiAgLy8gMy4gQWN0dWFsbHkgcHVsbCB0aGUgcmVxdWVzdGVkIGNodW5rcyBvdXQgb2YgdGhlIGJ1ZmZlciBhbmQgcmV0dXJuLlxuXG4gIC8vIGlmIHdlIG5lZWQgYSByZWFkYWJsZSBldmVudCwgdGhlbiB3ZSBuZWVkIHRvIGRvIHNvbWUgcmVhZGluZy5cbiAgdmFyIGRvUmVhZCA9IHN0YXRlLm5lZWRSZWFkYWJsZTtcblxuICAvLyBpZiB3ZSBjdXJyZW50bHkgaGF2ZSBsZXNzIHRoYW4gdGhlIGhpZ2hXYXRlck1hcmssIHRoZW4gYWxzbyByZWFkIHNvbWVcbiAgaWYgKHN0YXRlLmxlbmd0aCAtIG4gPD0gc3RhdGUuaGlnaFdhdGVyTWFyaylcbiAgICBkb1JlYWQgPSB0cnVlO1xuXG4gIC8vIGhvd2V2ZXIsIGlmIHdlJ3ZlIGVuZGVkLCB0aGVuIHRoZXJlJ3Mgbm8gcG9pbnQsIGFuZCBpZiB3ZSdyZSBhbHJlYWR5XG4gIC8vIHJlYWRpbmcsIHRoZW4gaXQncyB1bm5lY2Vzc2FyeS5cbiAgaWYgKHN0YXRlLmVuZGVkIHx8IHN0YXRlLnJlYWRpbmcpXG4gICAgZG9SZWFkID0gZmFsc2U7XG5cbiAgaWYgKGRvUmVhZCkge1xuICAgIHN0YXRlLnJlYWRpbmcgPSB0cnVlO1xuICAgIHN0YXRlLnN5bmMgPSB0cnVlO1xuICAgIC8vIGlmIHRoZSBsZW5ndGggaXMgY3VycmVudGx5IHplcm8sIHRoZW4gd2UgKm5lZWQqIGEgcmVhZGFibGUgZXZlbnQuXG4gICAgaWYgKHN0YXRlLmxlbmd0aCA9PT0gMClcbiAgICAgIHN0YXRlLm5lZWRSZWFkYWJsZSA9IHRydWU7XG4gICAgLy8gY2FsbCBpbnRlcm5hbCByZWFkIG1ldGhvZFxuICAgIHRoaXMuX3JlYWQoc3RhdGUuaGlnaFdhdGVyTWFyayk7XG4gICAgc3RhdGUuc3luYyA9IGZhbHNlO1xuICB9XG5cbiAgLy8gSWYgX3JlYWQgY2FsbGVkIGl0cyBjYWxsYmFjayBzeW5jaHJvbm91c2x5LCB0aGVuIGByZWFkaW5nYFxuICAvLyB3aWxsIGJlIGZhbHNlLCBhbmQgd2UgbmVlZCB0byByZS1ldmFsdWF0ZSBob3cgbXVjaCBkYXRhIHdlXG4gIC8vIGNhbiByZXR1cm4gdG8gdGhlIHVzZXIuXG4gIGlmIChkb1JlYWQgJiYgIXN0YXRlLnJlYWRpbmcpXG4gICAgbiA9IGhvd011Y2hUb1JlYWQobk9yaWcsIHN0YXRlKTtcblxuICBpZiAobiA+IDApXG4gICAgcmV0ID0gZnJvbUxpc3Qobiwgc3RhdGUpO1xuICBlbHNlXG4gICAgcmV0ID0gbnVsbDtcblxuICBpZiAocmV0ID09PSBudWxsKSB7XG4gICAgc3RhdGUubmVlZFJlYWRhYmxlID0gdHJ1ZTtcbiAgICBuID0gMDtcbiAgfVxuXG4gIHN0YXRlLmxlbmd0aCAtPSBuO1xuXG4gIC8vIElmIHdlIGhhdmUgbm90aGluZyBpbiB0aGUgYnVmZmVyLCB0aGVuIHdlIHdhbnQgdG8ga25vd1xuICAvLyBhcyBzb29uIGFzIHdlICpkbyogZ2V0IHNvbWV0aGluZyBpbnRvIHRoZSBidWZmZXIuXG4gIGlmIChzdGF0ZS5sZW5ndGggPT09IDAgJiYgIXN0YXRlLmVuZGVkKVxuICAgIHN0YXRlLm5lZWRSZWFkYWJsZSA9IHRydWU7XG5cbiAgLy8gSWYgd2UgaGFwcGVuZWQgdG8gcmVhZCgpIGV4YWN0bHkgdGhlIHJlbWFpbmluZyBhbW91bnQgaW4gdGhlXG4gIC8vIGJ1ZmZlciwgYW5kIHRoZSBFT0YgaGFzIGJlZW4gc2VlbiBhdCB0aGlzIHBvaW50LCB0aGVuIG1ha2Ugc3VyZVxuICAvLyB0aGF0IHdlIGVtaXQgJ2VuZCcgb24gdGhlIHZlcnkgbmV4dCB0aWNrLlxuICBpZiAoc3RhdGUuZW5kZWQgJiYgIXN0YXRlLmVuZEVtaXR0ZWQgJiYgc3RhdGUubGVuZ3RoID09PSAwKVxuICAgIGVuZFJlYWRhYmxlKHRoaXMpO1xuXG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBjaHVua0ludmFsaWQoc3RhdGUsIGNodW5rKSB7XG4gIHZhciBlciA9IG51bGw7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGNodW5rKSAmJlxuICAgICAgJ3N0cmluZycgIT09IHR5cGVvZiBjaHVuayAmJlxuICAgICAgY2h1bmsgIT09IG51bGwgJiZcbiAgICAgIGNodW5rICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICFzdGF0ZS5vYmplY3RNb2RlKSB7XG4gICAgZXIgPSBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIG5vbi1zdHJpbmcvYnVmZmVyIGNodW5rJyk7XG4gIH1cbiAgcmV0dXJuIGVyO1xufVxuXG5cbmZ1bmN0aW9uIG9uRW9mQ2h1bmsoc3RyZWFtLCBzdGF0ZSkge1xuICBpZiAoc3RhdGUuZGVjb2RlciAmJiAhc3RhdGUuZW5kZWQpIHtcbiAgICB2YXIgY2h1bmsgPSBzdGF0ZS5kZWNvZGVyLmVuZCgpO1xuICAgIGlmIChjaHVuayAmJiBjaHVuay5sZW5ndGgpIHtcbiAgICAgIHN0YXRlLmJ1ZmZlci5wdXNoKGNodW5rKTtcbiAgICAgIHN0YXRlLmxlbmd0aCArPSBzdGF0ZS5vYmplY3RNb2RlID8gMSA6IGNodW5rLmxlbmd0aDtcbiAgICB9XG4gIH1cbiAgc3RhdGUuZW5kZWQgPSB0cnVlO1xuXG4gIC8vIGlmIHdlJ3ZlIGVuZGVkIGFuZCB3ZSBoYXZlIHNvbWUgZGF0YSBsZWZ0LCB0aGVuIGVtaXRcbiAgLy8gJ3JlYWRhYmxlJyBub3cgdG8gbWFrZSBzdXJlIGl0IGdldHMgcGlja2VkIHVwLlxuICBpZiAoc3RhdGUubGVuZ3RoID4gMClcbiAgICBlbWl0UmVhZGFibGUoc3RyZWFtKTtcbiAgZWxzZVxuICAgIGVuZFJlYWRhYmxlKHN0cmVhbSk7XG59XG5cbi8vIERvbid0IGVtaXQgcmVhZGFibGUgcmlnaHQgYXdheSBpbiBzeW5jIG1vZGUsIGJlY2F1c2UgdGhpcyBjYW4gdHJpZ2dlclxuLy8gYW5vdGhlciByZWFkKCkgY2FsbCA9PiBzdGFjayBvdmVyZmxvdy4gIFRoaXMgd2F5LCBpdCBtaWdodCB0cmlnZ2VyXG4vLyBhIG5leHRUaWNrIHJlY3Vyc2lvbiB3YXJuaW5nLCBidXQgdGhhdCdzIG5vdCBzbyBiYWQuXG5mdW5jdGlvbiBlbWl0UmVhZGFibGUoc3RyZWFtKSB7XG4gIHZhciBzdGF0ZSA9IHN0cmVhbS5fcmVhZGFibGVTdGF0ZTtcbiAgc3RhdGUubmVlZFJlYWRhYmxlID0gZmFsc2U7XG4gIGlmIChzdGF0ZS5lbWl0dGVkUmVhZGFibGUpXG4gICAgcmV0dXJuO1xuXG4gIHN0YXRlLmVtaXR0ZWRSZWFkYWJsZSA9IHRydWU7XG4gIGlmIChzdGF0ZS5zeW5jKVxuICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICBlbWl0UmVhZGFibGVfKHN0cmVhbSk7XG4gICAgfSk7XG4gIGVsc2VcbiAgICBlbWl0UmVhZGFibGVfKHN0cmVhbSk7XG59XG5cbmZ1bmN0aW9uIGVtaXRSZWFkYWJsZV8oc3RyZWFtKSB7XG4gIHN0cmVhbS5lbWl0KCdyZWFkYWJsZScpO1xufVxuXG5cbi8vIGF0IHRoaXMgcG9pbnQsIHRoZSB1c2VyIGhhcyBwcmVzdW1hYmx5IHNlZW4gdGhlICdyZWFkYWJsZScgZXZlbnQsXG4vLyBhbmQgY2FsbGVkIHJlYWQoKSB0byBjb25zdW1lIHNvbWUgZGF0YS4gIHRoYXQgbWF5IGhhdmUgdHJpZ2dlcmVkXG4vLyBpbiB0dXJuIGFub3RoZXIgX3JlYWQobikgY2FsbCwgaW4gd2hpY2ggY2FzZSByZWFkaW5nID0gdHJ1ZSBpZlxuLy8gaXQncyBpbiBwcm9ncmVzcy5cbi8vIEhvd2V2ZXIsIGlmIHdlJ3JlIG5vdCBlbmRlZCwgb3IgcmVhZGluZywgYW5kIHRoZSBsZW5ndGggPCBod20sXG4vLyB0aGVuIGdvIGFoZWFkIGFuZCB0cnkgdG8gcmVhZCBzb21lIG1vcmUgcHJlZW1wdGl2ZWx5LlxuZnVuY3Rpb24gbWF5YmVSZWFkTW9yZShzdHJlYW0sIHN0YXRlKSB7XG4gIGlmICghc3RhdGUucmVhZGluZ01vcmUpIHtcbiAgICBzdGF0ZS5yZWFkaW5nTW9yZSA9IHRydWU7XG4gICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIG1heWJlUmVhZE1vcmVfKHN0cmVhbSwgc3RhdGUpO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1heWJlUmVhZE1vcmVfKHN0cmVhbSwgc3RhdGUpIHtcbiAgdmFyIGxlbiA9IHN0YXRlLmxlbmd0aDtcbiAgd2hpbGUgKCFzdGF0ZS5yZWFkaW5nICYmICFzdGF0ZS5mbG93aW5nICYmICFzdGF0ZS5lbmRlZCAmJlxuICAgICAgICAgc3RhdGUubGVuZ3RoIDwgc3RhdGUuaGlnaFdhdGVyTWFyaykge1xuICAgIHN0cmVhbS5yZWFkKDApO1xuICAgIGlmIChsZW4gPT09IHN0YXRlLmxlbmd0aClcbiAgICAgIC8vIGRpZG4ndCBnZXQgYW55IGRhdGEsIHN0b3Agc3Bpbm5pbmcuXG4gICAgICBicmVhaztcbiAgICBlbHNlXG4gICAgICBsZW4gPSBzdGF0ZS5sZW5ndGg7XG4gIH1cbiAgc3RhdGUucmVhZGluZ01vcmUgPSBmYWxzZTtcbn1cblxuLy8gYWJzdHJhY3QgbWV0aG9kLiAgdG8gYmUgb3ZlcnJpZGRlbiBpbiBzcGVjaWZpYyBpbXBsZW1lbnRhdGlvbiBjbGFzc2VzLlxuLy8gY2FsbCBjYihlciwgZGF0YSkgd2hlcmUgZGF0YSBpcyA8PSBuIGluIGxlbmd0aC5cbi8vIGZvciB2aXJ0dWFsIChub24tc3RyaW5nLCBub24tYnVmZmVyKSBzdHJlYW1zLCBcImxlbmd0aFwiIGlzIHNvbWV3aGF0XG4vLyBhcmJpdHJhcnksIGFuZCBwZXJoYXBzIG5vdCB2ZXJ5IG1lYW5pbmdmdWwuXG5SZWFkYWJsZS5wcm90b3R5cGUuX3JlYWQgPSBmdW5jdGlvbihuKSB7XG4gIHRoaXMuZW1pdCgnZXJyb3InLCBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpKTtcbn07XG5cblJlYWRhYmxlLnByb3RvdHlwZS5waXBlID0gZnVuY3Rpb24oZGVzdCwgcGlwZU9wdHMpIHtcbiAgdmFyIHNyYyA9IHRoaXM7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG5cbiAgc3dpdGNoIChzdGF0ZS5waXBlc0NvdW50KSB7XG4gICAgY2FzZSAwOlxuICAgICAgc3RhdGUucGlwZXMgPSBkZXN0O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAxOlxuICAgICAgc3RhdGUucGlwZXMgPSBbc3RhdGUucGlwZXMsIGRlc3RdO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHN0YXRlLnBpcGVzLnB1c2goZGVzdCk7XG4gICAgICBicmVhaztcbiAgfVxuICBzdGF0ZS5waXBlc0NvdW50ICs9IDE7XG5cbiAgdmFyIGRvRW5kID0gKCFwaXBlT3B0cyB8fCBwaXBlT3B0cy5lbmQgIT09IGZhbHNlKSAmJlxuICAgICAgICAgICAgICBkZXN0ICE9PSBwcm9jZXNzLnN0ZG91dCAmJlxuICAgICAgICAgICAgICBkZXN0ICE9PSBwcm9jZXNzLnN0ZGVycjtcblxuICB2YXIgZW5kRm4gPSBkb0VuZCA/IG9uZW5kIDogY2xlYW51cDtcbiAgaWYgKHN0YXRlLmVuZEVtaXR0ZWQpXG4gICAgcHJvY2Vzcy5uZXh0VGljayhlbmRGbik7XG4gIGVsc2VcbiAgICBzcmMub25jZSgnZW5kJywgZW5kRm4pO1xuXG4gIGRlc3Qub24oJ3VucGlwZScsIG9udW5waXBlKTtcbiAgZnVuY3Rpb24gb251bnBpcGUocmVhZGFibGUpIHtcbiAgICBpZiAocmVhZGFibGUgIT09IHNyYykgcmV0dXJuO1xuICAgIGNsZWFudXAoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uZW5kKCkge1xuICAgIGRlc3QuZW5kKCk7XG4gIH1cblxuICAvLyB3aGVuIHRoZSBkZXN0IGRyYWlucywgaXQgcmVkdWNlcyB0aGUgYXdhaXREcmFpbiBjb3VudGVyXG4gIC8vIG9uIHRoZSBzb3VyY2UuICBUaGlzIHdvdWxkIGJlIG1vcmUgZWxlZ2FudCB3aXRoIGEgLm9uY2UoKVxuICAvLyBoYW5kbGVyIGluIGZsb3coKSwgYnV0IGFkZGluZyBhbmQgcmVtb3ZpbmcgcmVwZWF0ZWRseSBpc1xuICAvLyB0b28gc2xvdy5cbiAgdmFyIG9uZHJhaW4gPSBwaXBlT25EcmFpbihzcmMpO1xuICBkZXN0Lm9uKCdkcmFpbicsIG9uZHJhaW4pO1xuXG4gIGZ1bmN0aW9uIGNsZWFudXAoKSB7XG4gICAgLy8gY2xlYW51cCBldmVudCBoYW5kbGVycyBvbmNlIHRoZSBwaXBlIGlzIGJyb2tlblxuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2Nsb3NlJywgb25jbG9zZSk7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignZmluaXNoJywgb25maW5pc2gpO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2RyYWluJywgb25kcmFpbik7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignZXJyb3InLCBvbmVycm9yKTtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCd1bnBpcGUnLCBvbnVucGlwZSk7XG4gICAgc3JjLnJlbW92ZUxpc3RlbmVyKCdlbmQnLCBvbmVuZCk7XG4gICAgc3JjLnJlbW92ZUxpc3RlbmVyKCdlbmQnLCBjbGVhbnVwKTtcblxuICAgIC8vIGlmIHRoZSByZWFkZXIgaXMgd2FpdGluZyBmb3IgYSBkcmFpbiBldmVudCBmcm9tIHRoaXNcbiAgICAvLyBzcGVjaWZpYyB3cml0ZXIsIHRoZW4gaXQgd291bGQgY2F1c2UgaXQgdG8gbmV2ZXIgc3RhcnRcbiAgICAvLyBmbG93aW5nIGFnYWluLlxuICAgIC8vIFNvLCBpZiB0aGlzIGlzIGF3YWl0aW5nIGEgZHJhaW4sIHRoZW4gd2UganVzdCBjYWxsIGl0IG5vdy5cbiAgICAvLyBJZiB3ZSBkb24ndCBrbm93LCB0aGVuIGFzc3VtZSB0aGF0IHdlIGFyZSB3YWl0aW5nIGZvciBvbmUuXG4gICAgaWYgKCFkZXN0Ll93cml0YWJsZVN0YXRlIHx8IGRlc3QuX3dyaXRhYmxlU3RhdGUubmVlZERyYWluKVxuICAgICAgb25kcmFpbigpO1xuICB9XG5cbiAgLy8gaWYgdGhlIGRlc3QgaGFzIGFuIGVycm9yLCB0aGVuIHN0b3AgcGlwaW5nIGludG8gaXQuXG4gIC8vIGhvd2V2ZXIsIGRvbid0IHN1cHByZXNzIHRoZSB0aHJvd2luZyBiZWhhdmlvciBmb3IgdGhpcy5cbiAgZnVuY3Rpb24gb25lcnJvcihlcikge1xuICAgIHVucGlwZSgpO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2Vycm9yJywgb25lcnJvcik7XG4gICAgaWYgKEVFLmxpc3RlbmVyQ291bnQoZGVzdCwgJ2Vycm9yJykgPT09IDApXG4gICAgICBkZXN0LmVtaXQoJ2Vycm9yJywgZXIpO1xuICB9XG4gIC8vIFRoaXMgaXMgYSBicnV0YWxseSB1Z2x5IGhhY2sgdG8gbWFrZSBzdXJlIHRoYXQgb3VyIGVycm9yIGhhbmRsZXJcbiAgLy8gaXMgYXR0YWNoZWQgYmVmb3JlIGFueSB1c2VybGFuZCBvbmVzLiAgTkVWRVIgRE8gVEhJUy5cbiAgaWYgKCFkZXN0Ll9ldmVudHMgfHwgIWRlc3QuX2V2ZW50cy5lcnJvcilcbiAgICBkZXN0Lm9uKCdlcnJvcicsIG9uZXJyb3IpO1xuICBlbHNlIGlmIChpc0FycmF5KGRlc3QuX2V2ZW50cy5lcnJvcikpXG4gICAgZGVzdC5fZXZlbnRzLmVycm9yLnVuc2hpZnQob25lcnJvcik7XG4gIGVsc2VcbiAgICBkZXN0Ll9ldmVudHMuZXJyb3IgPSBbb25lcnJvciwgZGVzdC5fZXZlbnRzLmVycm9yXTtcblxuXG5cbiAgLy8gQm90aCBjbG9zZSBhbmQgZmluaXNoIHNob3VsZCB0cmlnZ2VyIHVucGlwZSwgYnV0IG9ubHkgb25jZS5cbiAgZnVuY3Rpb24gb25jbG9zZSgpIHtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdmaW5pc2gnLCBvbmZpbmlzaCk7XG4gICAgdW5waXBlKCk7XG4gIH1cbiAgZGVzdC5vbmNlKCdjbG9zZScsIG9uY2xvc2UpO1xuICBmdW5jdGlvbiBvbmZpbmlzaCgpIHtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdjbG9zZScsIG9uY2xvc2UpO1xuICAgIHVucGlwZSgpO1xuICB9XG4gIGRlc3Qub25jZSgnZmluaXNoJywgb25maW5pc2gpO1xuXG4gIGZ1bmN0aW9uIHVucGlwZSgpIHtcbiAgICBzcmMudW5waXBlKGRlc3QpO1xuICB9XG5cbiAgLy8gdGVsbCB0aGUgZGVzdCB0aGF0IGl0J3MgYmVpbmcgcGlwZWQgdG9cbiAgZGVzdC5lbWl0KCdwaXBlJywgc3JjKTtcblxuICAvLyBzdGFydCB0aGUgZmxvdyBpZiBpdCBoYXNuJ3QgYmVlbiBzdGFydGVkIGFscmVhZHkuXG4gIGlmICghc3RhdGUuZmxvd2luZykge1xuICAgIC8vIHRoZSBoYW5kbGVyIHRoYXQgd2FpdHMgZm9yIHJlYWRhYmxlIGV2ZW50cyBhZnRlciBhbGxcbiAgICAvLyB0aGUgZGF0YSBnZXRzIHN1Y2tlZCBvdXQgaW4gZmxvdy5cbiAgICAvLyBUaGlzIHdvdWxkIGJlIGVhc2llciB0byBmb2xsb3cgd2l0aCBhIC5vbmNlKCkgaGFuZGxlclxuICAgIC8vIGluIGZsb3coKSwgYnV0IHRoYXQgaXMgdG9vIHNsb3cuXG4gICAgdGhpcy5vbigncmVhZGFibGUnLCBwaXBlT25SZWFkYWJsZSk7XG5cbiAgICBzdGF0ZS5mbG93aW5nID0gdHJ1ZTtcbiAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgZmxvdyhzcmMpO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIGRlc3Q7XG59O1xuXG5mdW5jdGlvbiBwaXBlT25EcmFpbihzcmMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBkZXN0ID0gdGhpcztcbiAgICB2YXIgc3RhdGUgPSBzcmMuX3JlYWRhYmxlU3RhdGU7XG4gICAgc3RhdGUuYXdhaXREcmFpbi0tO1xuICAgIGlmIChzdGF0ZS5hd2FpdERyYWluID09PSAwKVxuICAgICAgZmxvdyhzcmMpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBmbG93KHNyYykge1xuICB2YXIgc3RhdGUgPSBzcmMuX3JlYWRhYmxlU3RhdGU7XG4gIHZhciBjaHVuaztcbiAgc3RhdGUuYXdhaXREcmFpbiA9IDA7XG5cbiAgZnVuY3Rpb24gd3JpdGUoZGVzdCwgaSwgbGlzdCkge1xuICAgIHZhciB3cml0dGVuID0gZGVzdC53cml0ZShjaHVuayk7XG4gICAgaWYgKGZhbHNlID09PSB3cml0dGVuKSB7XG4gICAgICBzdGF0ZS5hd2FpdERyYWluKys7XG4gICAgfVxuICB9XG5cbiAgd2hpbGUgKHN0YXRlLnBpcGVzQ291bnQgJiYgbnVsbCAhPT0gKGNodW5rID0gc3JjLnJlYWQoKSkpIHtcblxuICAgIGlmIChzdGF0ZS5waXBlc0NvdW50ID09PSAxKVxuICAgICAgd3JpdGUoc3RhdGUucGlwZXMsIDAsIG51bGwpO1xuICAgIGVsc2VcbiAgICAgIGZvckVhY2goc3RhdGUucGlwZXMsIHdyaXRlKTtcblxuICAgIHNyYy5lbWl0KCdkYXRhJywgY2h1bmspO1xuXG4gICAgLy8gaWYgYW55b25lIG5lZWRzIGEgZHJhaW4sIHRoZW4gd2UgaGF2ZSB0byB3YWl0IGZvciB0aGF0LlxuICAgIGlmIChzdGF0ZS5hd2FpdERyYWluID4gMClcbiAgICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGlmIGV2ZXJ5IGRlc3RpbmF0aW9uIHdhcyB1bnBpcGVkLCBlaXRoZXIgYmVmb3JlIGVudGVyaW5nIHRoaXNcbiAgLy8gZnVuY3Rpb24sIG9yIGluIHRoZSB3aGlsZSBsb29wLCB0aGVuIHN0b3AgZmxvd2luZy5cbiAgLy9cbiAgLy8gTkI6IFRoaXMgaXMgYSBwcmV0dHkgcmFyZSBlZGdlIGNhc2UuXG4gIGlmIChzdGF0ZS5waXBlc0NvdW50ID09PSAwKSB7XG4gICAgc3RhdGUuZmxvd2luZyA9IGZhbHNlO1xuXG4gICAgLy8gaWYgdGhlcmUgd2VyZSBkYXRhIGV2ZW50IGxpc3RlbmVycyBhZGRlZCwgdGhlbiBzd2l0Y2ggdG8gb2xkIG1vZGUuXG4gICAgaWYgKEVFLmxpc3RlbmVyQ291bnQoc3JjLCAnZGF0YScpID4gMClcbiAgICAgIGVtaXREYXRhRXZlbnRzKHNyYyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gYXQgdGhpcyBwb2ludCwgbm8gb25lIG5lZWRlZCBhIGRyYWluLCBzbyB3ZSBqdXN0IHJhbiBvdXQgb2YgZGF0YVxuICAvLyBvbiB0aGUgbmV4dCByZWFkYWJsZSBldmVudCwgc3RhcnQgaXQgb3ZlciBhZ2Fpbi5cbiAgc3RhdGUucmFuT3V0ID0gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gcGlwZU9uUmVhZGFibGUoKSB7XG4gIGlmICh0aGlzLl9yZWFkYWJsZVN0YXRlLnJhbk91dCkge1xuICAgIHRoaXMuX3JlYWRhYmxlU3RhdGUucmFuT3V0ID0gZmFsc2U7XG4gICAgZmxvdyh0aGlzKTtcbiAgfVxufVxuXG5cblJlYWRhYmxlLnByb3RvdHlwZS51bnBpcGUgPSBmdW5jdGlvbihkZXN0KSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG5cbiAgLy8gaWYgd2UncmUgbm90IHBpcGluZyBhbnl3aGVyZSwgdGhlbiBkbyBub3RoaW5nLlxuICBpZiAoc3RhdGUucGlwZXNDb3VudCA9PT0gMClcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBqdXN0IG9uZSBkZXN0aW5hdGlvbi4gIG1vc3QgY29tbW9uIGNhc2UuXG4gIGlmIChzdGF0ZS5waXBlc0NvdW50ID09PSAxKSB7XG4gICAgLy8gcGFzc2VkIGluIG9uZSwgYnV0IGl0J3Mgbm90IHRoZSByaWdodCBvbmUuXG4gICAgaWYgKGRlc3QgJiYgZGVzdCAhPT0gc3RhdGUucGlwZXMpXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmICghZGVzdClcbiAgICAgIGRlc3QgPSBzdGF0ZS5waXBlcztcblxuICAgIC8vIGdvdCBhIG1hdGNoLlxuICAgIHN0YXRlLnBpcGVzID0gbnVsbDtcbiAgICBzdGF0ZS5waXBlc0NvdW50ID0gMDtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKCdyZWFkYWJsZScsIHBpcGVPblJlYWRhYmxlKTtcbiAgICBzdGF0ZS5mbG93aW5nID0gZmFsc2U7XG4gICAgaWYgKGRlc3QpXG4gICAgICBkZXN0LmVtaXQoJ3VucGlwZScsIHRoaXMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gc2xvdyBjYXNlLiBtdWx0aXBsZSBwaXBlIGRlc3RpbmF0aW9ucy5cblxuICBpZiAoIWRlc3QpIHtcbiAgICAvLyByZW1vdmUgYWxsLlxuICAgIHZhciBkZXN0cyA9IHN0YXRlLnBpcGVzO1xuICAgIHZhciBsZW4gPSBzdGF0ZS5waXBlc0NvdW50O1xuICAgIHN0YXRlLnBpcGVzID0gbnVsbDtcbiAgICBzdGF0ZS5waXBlc0NvdW50ID0gMDtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKCdyZWFkYWJsZScsIHBpcGVPblJlYWRhYmxlKTtcbiAgICBzdGF0ZS5mbG93aW5nID0gZmFsc2U7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgZGVzdHNbaV0uZW1pdCgndW5waXBlJywgdGhpcyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyB0cnkgdG8gZmluZCB0aGUgcmlnaHQgb25lLlxuICB2YXIgaSA9IGluZGV4T2Yoc3RhdGUucGlwZXMsIGRlc3QpO1xuICBpZiAoaSA9PT0gLTEpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgc3RhdGUucGlwZXMuc3BsaWNlKGksIDEpO1xuICBzdGF0ZS5waXBlc0NvdW50IC09IDE7XG4gIGlmIChzdGF0ZS5waXBlc0NvdW50ID09PSAxKVxuICAgIHN0YXRlLnBpcGVzID0gc3RhdGUucGlwZXNbMF07XG5cbiAgZGVzdC5lbWl0KCd1bnBpcGUnLCB0aGlzKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIHNldCB1cCBkYXRhIGV2ZW50cyBpZiB0aGV5IGFyZSBhc2tlZCBmb3Jcbi8vIEVuc3VyZSByZWFkYWJsZSBsaXN0ZW5lcnMgZXZlbnR1YWxseSBnZXQgc29tZXRoaW5nXG5SZWFkYWJsZS5wcm90b3R5cGUub24gPSBmdW5jdGlvbihldiwgZm4pIHtcbiAgdmFyIHJlcyA9IFN0cmVhbS5wcm90b3R5cGUub24uY2FsbCh0aGlzLCBldiwgZm4pO1xuXG4gIGlmIChldiA9PT0gJ2RhdGEnICYmICF0aGlzLl9yZWFkYWJsZVN0YXRlLmZsb3dpbmcpXG4gICAgZW1pdERhdGFFdmVudHModGhpcyk7XG5cbiAgaWYgKGV2ID09PSAncmVhZGFibGUnICYmIHRoaXMucmVhZGFibGUpIHtcbiAgICB2YXIgc3RhdGUgPSB0aGlzLl9yZWFkYWJsZVN0YXRlO1xuICAgIGlmICghc3RhdGUucmVhZGFibGVMaXN0ZW5pbmcpIHtcbiAgICAgIHN0YXRlLnJlYWRhYmxlTGlzdGVuaW5nID0gdHJ1ZTtcbiAgICAgIHN0YXRlLmVtaXR0ZWRSZWFkYWJsZSA9IGZhbHNlO1xuICAgICAgc3RhdGUubmVlZFJlYWRhYmxlID0gdHJ1ZTtcbiAgICAgIGlmICghc3RhdGUucmVhZGluZykge1xuICAgICAgICB0aGlzLnJlYWQoMCk7XG4gICAgICB9IGVsc2UgaWYgKHN0YXRlLmxlbmd0aCkge1xuICAgICAgICBlbWl0UmVhZGFibGUodGhpcywgc3RhdGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXM7XG59O1xuUmVhZGFibGUucHJvdG90eXBlLmFkZExpc3RlbmVyID0gUmVhZGFibGUucHJvdG90eXBlLm9uO1xuXG4vLyBwYXVzZSgpIGFuZCByZXN1bWUoKSBhcmUgcmVtbmFudHMgb2YgdGhlIGxlZ2FjeSByZWFkYWJsZSBzdHJlYW0gQVBJXG4vLyBJZiB0aGUgdXNlciB1c2VzIHRoZW0sIHRoZW4gc3dpdGNoIGludG8gb2xkIG1vZGUuXG5SZWFkYWJsZS5wcm90b3R5cGUucmVzdW1lID0gZnVuY3Rpb24oKSB7XG4gIGVtaXREYXRhRXZlbnRzKHRoaXMpO1xuICB0aGlzLnJlYWQoMCk7XG4gIHRoaXMuZW1pdCgncmVzdW1lJyk7XG59O1xuXG5SZWFkYWJsZS5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgZW1pdERhdGFFdmVudHModGhpcywgdHJ1ZSk7XG4gIHRoaXMuZW1pdCgncGF1c2UnKTtcbn07XG5cbmZ1bmN0aW9uIGVtaXREYXRhRXZlbnRzKHN0cmVhbSwgc3RhcnRQYXVzZWQpIHtcbiAgdmFyIHN0YXRlID0gc3RyZWFtLl9yZWFkYWJsZVN0YXRlO1xuXG4gIGlmIChzdGF0ZS5mbG93aW5nKSB7XG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2lzYWFjcy9yZWFkYWJsZS1zdHJlYW0vaXNzdWVzLzE2XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3Qgc3dpdGNoIHRvIG9sZCBtb2RlIG5vdy4nKTtcbiAgfVxuXG4gIHZhciBwYXVzZWQgPSBzdGFydFBhdXNlZCB8fCBmYWxzZTtcbiAgdmFyIHJlYWRhYmxlID0gZmFsc2U7XG5cbiAgLy8gY29udmVydCB0byBhbiBvbGQtc3R5bGUgc3RyZWFtLlxuICBzdHJlYW0ucmVhZGFibGUgPSB0cnVlO1xuICBzdHJlYW0ucGlwZSA9IFN0cmVhbS5wcm90b3R5cGUucGlwZTtcbiAgc3RyZWFtLm9uID0gc3RyZWFtLmFkZExpc3RlbmVyID0gU3RyZWFtLnByb3RvdHlwZS5vbjtcblxuICBzdHJlYW0ub24oJ3JlYWRhYmxlJywgZnVuY3Rpb24oKSB7XG4gICAgcmVhZGFibGUgPSB0cnVlO1xuXG4gICAgdmFyIGM7XG4gICAgd2hpbGUgKCFwYXVzZWQgJiYgKG51bGwgIT09IChjID0gc3RyZWFtLnJlYWQoKSkpKVxuICAgICAgc3RyZWFtLmVtaXQoJ2RhdGEnLCBjKTtcblxuICAgIGlmIChjID09PSBudWxsKSB7XG4gICAgICByZWFkYWJsZSA9IGZhbHNlO1xuICAgICAgc3RyZWFtLl9yZWFkYWJsZVN0YXRlLm5lZWRSZWFkYWJsZSA9IHRydWU7XG4gICAgfVxuICB9KTtcblxuICBzdHJlYW0ucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICBwYXVzZWQgPSB0cnVlO1xuICAgIHRoaXMuZW1pdCgncGF1c2UnKTtcbiAgfTtcblxuICBzdHJlYW0ucmVzdW1lID0gZnVuY3Rpb24oKSB7XG4gICAgcGF1c2VkID0gZmFsc2U7XG4gICAgaWYgKHJlYWRhYmxlKVxuICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgICAgc3RyZWFtLmVtaXQoJ3JlYWRhYmxlJyk7XG4gICAgICB9KTtcbiAgICBlbHNlXG4gICAgICB0aGlzLnJlYWQoMCk7XG4gICAgdGhpcy5lbWl0KCdyZXN1bWUnKTtcbiAgfTtcblxuICAvLyBub3cgbWFrZSBpdCBzdGFydCwganVzdCBpbiBjYXNlIGl0IGhhZG4ndCBhbHJlYWR5LlxuICBzdHJlYW0uZW1pdCgncmVhZGFibGUnKTtcbn1cblxuLy8gd3JhcCBhbiBvbGQtc3R5bGUgc3RyZWFtIGFzIHRoZSBhc3luYyBkYXRhIHNvdXJjZS5cbi8vIFRoaXMgaXMgKm5vdCogcGFydCBvZiB0aGUgcmVhZGFibGUgc3RyZWFtIGludGVyZmFjZS5cbi8vIEl0IGlzIGFuIHVnbHkgdW5mb3J0dW5hdGUgbWVzcyBvZiBoaXN0b3J5LlxuUmVhZGFibGUucHJvdG90eXBlLndyYXAgPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcbiAgdmFyIHBhdXNlZCA9IGZhbHNlO1xuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgc3RyZWFtLm9uKCdlbmQnLCBmdW5jdGlvbigpIHtcbiAgICBpZiAoc3RhdGUuZGVjb2RlciAmJiAhc3RhdGUuZW5kZWQpIHtcbiAgICAgIHZhciBjaHVuayA9IHN0YXRlLmRlY29kZXIuZW5kKCk7XG4gICAgICBpZiAoY2h1bmsgJiYgY2h1bmsubGVuZ3RoKVxuICAgICAgICBzZWxmLnB1c2goY2h1bmspO1xuICAgIH1cblxuICAgIHNlbGYucHVzaChudWxsKTtcbiAgfSk7XG5cbiAgc3RyZWFtLm9uKCdkYXRhJywgZnVuY3Rpb24oY2h1bmspIHtcbiAgICBpZiAoc3RhdGUuZGVjb2RlcilcbiAgICAgIGNodW5rID0gc3RhdGUuZGVjb2Rlci53cml0ZShjaHVuayk7XG5cbiAgICAvLyBkb24ndCBza2lwIG92ZXIgZmFsc3kgdmFsdWVzIGluIG9iamVjdE1vZGVcbiAgICAvL2lmIChzdGF0ZS5vYmplY3RNb2RlICYmIHV0aWwuaXNOdWxsT3JVbmRlZmluZWQoY2h1bmspKVxuICAgIGlmIChzdGF0ZS5vYmplY3RNb2RlICYmIChjaHVuayA9PT0gbnVsbCB8fCBjaHVuayA9PT0gdW5kZWZpbmVkKSlcbiAgICAgIHJldHVybjtcbiAgICBlbHNlIGlmICghc3RhdGUub2JqZWN0TW9kZSAmJiAoIWNodW5rIHx8ICFjaHVuay5sZW5ndGgpKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdmFyIHJldCA9IHNlbGYucHVzaChjaHVuayk7XG4gICAgaWYgKCFyZXQpIHtcbiAgICAgIHBhdXNlZCA9IHRydWU7XG4gICAgICBzdHJlYW0ucGF1c2UoKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIHByb3h5IGFsbCB0aGUgb3RoZXIgbWV0aG9kcy5cbiAgLy8gaW1wb3J0YW50IHdoZW4gd3JhcHBpbmcgZmlsdGVycyBhbmQgZHVwbGV4ZXMuXG4gIGZvciAodmFyIGkgaW4gc3RyZWFtKSB7XG4gICAgaWYgKHR5cGVvZiBzdHJlYW1baV0gPT09ICdmdW5jdGlvbicgJiZcbiAgICAgICAgdHlwZW9mIHRoaXNbaV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzW2ldID0gZnVuY3Rpb24obWV0aG9kKSB7IHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHN0cmVhbVttZXRob2RdLmFwcGx5KHN0cmVhbSwgYXJndW1lbnRzKTtcbiAgICAgIH19KGkpO1xuICAgIH1cbiAgfVxuXG4gIC8vIHByb3h5IGNlcnRhaW4gaW1wb3J0YW50IGV2ZW50cy5cbiAgdmFyIGV2ZW50cyA9IFsnZXJyb3InLCAnY2xvc2UnLCAnZGVzdHJveScsICdwYXVzZScsICdyZXN1bWUnXTtcbiAgZm9yRWFjaChldmVudHMsIGZ1bmN0aW9uKGV2KSB7XG4gICAgc3RyZWFtLm9uKGV2LCBzZWxmLmVtaXQuYmluZChzZWxmLCBldikpO1xuICB9KTtcblxuICAvLyB3aGVuIHdlIHRyeSB0byBjb25zdW1lIHNvbWUgbW9yZSBieXRlcywgc2ltcGx5IHVucGF1c2UgdGhlXG4gIC8vIHVuZGVybHlpbmcgc3RyZWFtLlxuICBzZWxmLl9yZWFkID0gZnVuY3Rpb24obikge1xuICAgIGlmIChwYXVzZWQpIHtcbiAgICAgIHBhdXNlZCA9IGZhbHNlO1xuICAgICAgc3RyZWFtLnJlc3VtZSgpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gc2VsZjtcbn07XG5cblxuXG4vLyBleHBvc2VkIGZvciB0ZXN0aW5nIHB1cnBvc2VzIG9ubHkuXG5SZWFkYWJsZS5fZnJvbUxpc3QgPSBmcm9tTGlzdDtcblxuLy8gUGx1Y2sgb2ZmIG4gYnl0ZXMgZnJvbSBhbiBhcnJheSBvZiBidWZmZXJzLlxuLy8gTGVuZ3RoIGlzIHRoZSBjb21iaW5lZCBsZW5ndGhzIG9mIGFsbCB0aGUgYnVmZmVycyBpbiB0aGUgbGlzdC5cbmZ1bmN0aW9uIGZyb21MaXN0KG4sIHN0YXRlKSB7XG4gIHZhciBsaXN0ID0gc3RhdGUuYnVmZmVyO1xuICB2YXIgbGVuZ3RoID0gc3RhdGUubGVuZ3RoO1xuICB2YXIgc3RyaW5nTW9kZSA9ICEhc3RhdGUuZGVjb2RlcjtcbiAgdmFyIG9iamVjdE1vZGUgPSAhIXN0YXRlLm9iamVjdE1vZGU7XG4gIHZhciByZXQ7XG5cbiAgLy8gbm90aGluZyBpbiB0aGUgbGlzdCwgZGVmaW5pdGVseSBlbXB0eS5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKVxuICAgIHJldHVybiBudWxsO1xuXG4gIGlmIChsZW5ndGggPT09IDApXG4gICAgcmV0ID0gbnVsbDtcbiAgZWxzZSBpZiAob2JqZWN0TW9kZSlcbiAgICByZXQgPSBsaXN0LnNoaWZ0KCk7XG4gIGVsc2UgaWYgKCFuIHx8IG4gPj0gbGVuZ3RoKSB7XG4gICAgLy8gcmVhZCBpdCBhbGwsIHRydW5jYXRlIHRoZSBhcnJheS5cbiAgICBpZiAoc3RyaW5nTW9kZSlcbiAgICAgIHJldCA9IGxpc3Quam9pbignJyk7XG4gICAgZWxzZVxuICAgICAgcmV0ID0gQnVmZmVyLmNvbmNhdChsaXN0LCBsZW5ndGgpO1xuICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgfSBlbHNlIHtcbiAgICAvLyByZWFkIGp1c3Qgc29tZSBvZiBpdC5cbiAgICBpZiAobiA8IGxpc3RbMF0ubGVuZ3RoKSB7XG4gICAgICAvLyBqdXN0IHRha2UgYSBwYXJ0IG9mIHRoZSBmaXJzdCBsaXN0IGl0ZW0uXG4gICAgICAvLyBzbGljZSBpcyB0aGUgc2FtZSBmb3IgYnVmZmVycyBhbmQgc3RyaW5ncy5cbiAgICAgIHZhciBidWYgPSBsaXN0WzBdO1xuICAgICAgcmV0ID0gYnVmLnNsaWNlKDAsIG4pO1xuICAgICAgbGlzdFswXSA9IGJ1Zi5zbGljZShuKTtcbiAgICB9IGVsc2UgaWYgKG4gPT09IGxpc3RbMF0ubGVuZ3RoKSB7XG4gICAgICAvLyBmaXJzdCBsaXN0IGlzIGEgcGVyZmVjdCBtYXRjaFxuICAgICAgcmV0ID0gbGlzdC5zaGlmdCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjb21wbGV4IGNhc2UuXG4gICAgICAvLyB3ZSBoYXZlIGVub3VnaCB0byBjb3ZlciBpdCwgYnV0IGl0IHNwYW5zIHBhc3QgdGhlIGZpcnN0IGJ1ZmZlci5cbiAgICAgIGlmIChzdHJpbmdNb2RlKVxuICAgICAgICByZXQgPSAnJztcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0ID0gbmV3IEJ1ZmZlcihuKTtcblxuICAgICAgdmFyIGMgPSAwO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBsaXN0Lmxlbmd0aDsgaSA8IGwgJiYgYyA8IG47IGkrKykge1xuICAgICAgICB2YXIgYnVmID0gbGlzdFswXTtcbiAgICAgICAgdmFyIGNweSA9IE1hdGgubWluKG4gLSBjLCBidWYubGVuZ3RoKTtcblxuICAgICAgICBpZiAoc3RyaW5nTW9kZSlcbiAgICAgICAgICByZXQgKz0gYnVmLnNsaWNlKDAsIGNweSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBidWYuY29weShyZXQsIGMsIDAsIGNweSk7XG5cbiAgICAgICAgaWYgKGNweSA8IGJ1Zi5sZW5ndGgpXG4gICAgICAgICAgbGlzdFswXSA9IGJ1Zi5zbGljZShjcHkpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgbGlzdC5zaGlmdCgpO1xuXG4gICAgICAgIGMgKz0gY3B5O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIGVuZFJlYWRhYmxlKHN0cmVhbSkge1xuICB2YXIgc3RhdGUgPSBzdHJlYW0uX3JlYWRhYmxlU3RhdGU7XG5cbiAgLy8gSWYgd2UgZ2V0IGhlcmUgYmVmb3JlIGNvbnN1bWluZyBhbGwgdGhlIGJ5dGVzLCB0aGVuIHRoYXQgaXMgYVxuICAvLyBidWcgaW4gbm9kZS4gIFNob3VsZCBuZXZlciBoYXBwZW4uXG4gIGlmIChzdGF0ZS5sZW5ndGggPiAwKVxuICAgIHRocm93IG5ldyBFcnJvcignZW5kUmVhZGFibGUgY2FsbGVkIG9uIG5vbi1lbXB0eSBzdHJlYW0nKTtcblxuICBpZiAoIXN0YXRlLmVuZEVtaXR0ZWQgJiYgc3RhdGUuY2FsbGVkUmVhZCkge1xuICAgIHN0YXRlLmVuZGVkID0gdHJ1ZTtcbiAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgLy8gQ2hlY2sgdGhhdCB3ZSBkaWRuJ3QgZ2V0IG9uZSBsYXN0IHVuc2hpZnQuXG4gICAgICBpZiAoIXN0YXRlLmVuZEVtaXR0ZWQgJiYgc3RhdGUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHN0YXRlLmVuZEVtaXR0ZWQgPSB0cnVlO1xuICAgICAgICBzdHJlYW0ucmVhZGFibGUgPSBmYWxzZTtcbiAgICAgICAgc3RyZWFtLmVtaXQoJ2VuZCcpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZvckVhY2ggKHhzLCBmKSB7XG4gIGZvciAodmFyIGkgPSAwLCBsID0geHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgZih4c1tpXSwgaSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5kZXhPZiAoeHMsIHgpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB4cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAoeHNbaV0gPT09IHgpIHJldHVybiBpO1xuICB9XG4gIHJldHVybiAtMTtcbn1cbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5cbi8vIGEgdHJhbnNmb3JtIHN0cmVhbSBpcyBhIHJlYWRhYmxlL3dyaXRhYmxlIHN0cmVhbSB3aGVyZSB5b3UgZG9cbi8vIHNvbWV0aGluZyB3aXRoIHRoZSBkYXRhLiAgU29tZXRpbWVzIGl0J3MgY2FsbGVkIGEgXCJmaWx0ZXJcIixcbi8vIGJ1dCB0aGF0J3Mgbm90IGEgZ3JlYXQgbmFtZSBmb3IgaXQsIHNpbmNlIHRoYXQgaW1wbGllcyBhIHRoaW5nIHdoZXJlXG4vLyBzb21lIGJpdHMgcGFzcyB0aHJvdWdoLCBhbmQgb3RoZXJzIGFyZSBzaW1wbHkgaWdub3JlZC4gIChUaGF0IHdvdWxkXG4vLyBiZSBhIHZhbGlkIGV4YW1wbGUgb2YgYSB0cmFuc2Zvcm0sIG9mIGNvdXJzZS4pXG4vL1xuLy8gV2hpbGUgdGhlIG91dHB1dCBpcyBjYXVzYWxseSByZWxhdGVkIHRvIHRoZSBpbnB1dCwgaXQncyBub3QgYVxuLy8gbmVjZXNzYXJpbHkgc3ltbWV0cmljIG9yIHN5bmNocm9ub3VzIHRyYW5zZm9ybWF0aW9uLiAgRm9yIGV4YW1wbGUsXG4vLyBhIHpsaWIgc3RyZWFtIG1pZ2h0IHRha2UgbXVsdGlwbGUgcGxhaW4tdGV4dCB3cml0ZXMoKSwgYW5kIHRoZW5cbi8vIGVtaXQgYSBzaW5nbGUgY29tcHJlc3NlZCBjaHVuayBzb21lIHRpbWUgaW4gdGhlIGZ1dHVyZS5cbi8vXG4vLyBIZXJlJ3MgaG93IHRoaXMgd29ya3M6XG4vL1xuLy8gVGhlIFRyYW5zZm9ybSBzdHJlYW0gaGFzIGFsbCB0aGUgYXNwZWN0cyBvZiB0aGUgcmVhZGFibGUgYW5kIHdyaXRhYmxlXG4vLyBzdHJlYW0gY2xhc3Nlcy4gIFdoZW4geW91IHdyaXRlKGNodW5rKSwgdGhhdCBjYWxscyBfd3JpdGUoY2h1bmssY2IpXG4vLyBpbnRlcm5hbGx5LCBhbmQgcmV0dXJucyBmYWxzZSBpZiB0aGVyZSdzIGEgbG90IG9mIHBlbmRpbmcgd3JpdGVzXG4vLyBidWZmZXJlZCB1cC4gIFdoZW4geW91IGNhbGwgcmVhZCgpLCB0aGF0IGNhbGxzIF9yZWFkKG4pIHVudGlsXG4vLyB0aGVyZSdzIGVub3VnaCBwZW5kaW5nIHJlYWRhYmxlIGRhdGEgYnVmZmVyZWQgdXAuXG4vL1xuLy8gSW4gYSB0cmFuc2Zvcm0gc3RyZWFtLCB0aGUgd3JpdHRlbiBkYXRhIGlzIHBsYWNlZCBpbiBhIGJ1ZmZlci4gIFdoZW5cbi8vIF9yZWFkKG4pIGlzIGNhbGxlZCwgaXQgdHJhbnNmb3JtcyB0aGUgcXVldWVkIHVwIGRhdGEsIGNhbGxpbmcgdGhlXG4vLyBidWZmZXJlZCBfd3JpdGUgY2IncyBhcyBpdCBjb25zdW1lcyBjaHVua3MuICBJZiBjb25zdW1pbmcgYSBzaW5nbGVcbi8vIHdyaXR0ZW4gY2h1bmsgd291bGQgcmVzdWx0IGluIG11bHRpcGxlIG91dHB1dCBjaHVua3MsIHRoZW4gdGhlIGZpcnN0XG4vLyBvdXRwdXR0ZWQgYml0IGNhbGxzIHRoZSByZWFkY2IsIGFuZCBzdWJzZXF1ZW50IGNodW5rcyBqdXN0IGdvIGludG9cbi8vIHRoZSByZWFkIGJ1ZmZlciwgYW5kIHdpbGwgY2F1c2UgaXQgdG8gZW1pdCAncmVhZGFibGUnIGlmIG5lY2Vzc2FyeS5cbi8vXG4vLyBUaGlzIHdheSwgYmFjay1wcmVzc3VyZSBpcyBhY3R1YWxseSBkZXRlcm1pbmVkIGJ5IHRoZSByZWFkaW5nIHNpZGUsXG4vLyBzaW5jZSBfcmVhZCBoYXMgdG8gYmUgY2FsbGVkIHRvIHN0YXJ0IHByb2Nlc3NpbmcgYSBuZXcgY2h1bmsuICBIb3dldmVyLFxuLy8gYSBwYXRob2xvZ2ljYWwgaW5mbGF0ZSB0eXBlIG9mIHRyYW5zZm9ybSBjYW4gY2F1c2UgZXhjZXNzaXZlIGJ1ZmZlcmluZ1xuLy8gaGVyZS4gIEZvciBleGFtcGxlLCBpbWFnaW5lIGEgc3RyZWFtIHdoZXJlIGV2ZXJ5IGJ5dGUgb2YgaW5wdXQgaXNcbi8vIGludGVycHJldGVkIGFzIGFuIGludGVnZXIgZnJvbSAwLTI1NSwgYW5kIHRoZW4gcmVzdWx0cyBpbiB0aGF0IG1hbnlcbi8vIGJ5dGVzIG9mIG91dHB1dC4gIFdyaXRpbmcgdGhlIDQgYnl0ZXMge2ZmLGZmLGZmLGZmfSB3b3VsZCByZXN1bHQgaW5cbi8vIDFrYiBvZiBkYXRhIGJlaW5nIG91dHB1dC4gIEluIHRoaXMgY2FzZSwgeW91IGNvdWxkIHdyaXRlIGEgdmVyeSBzbWFsbFxuLy8gYW1vdW50IG9mIGlucHV0LCBhbmQgZW5kIHVwIHdpdGggYSB2ZXJ5IGxhcmdlIGFtb3VudCBvZiBvdXRwdXQuICBJblxuLy8gc3VjaCBhIHBhdGhvbG9naWNhbCBpbmZsYXRpbmcgbWVjaGFuaXNtLCB0aGVyZSdkIGJlIG5vIHdheSB0byB0ZWxsXG4vLyB0aGUgc3lzdGVtIHRvIHN0b3AgZG9pbmcgdGhlIHRyYW5zZm9ybS4gIEEgc2luZ2xlIDRNQiB3cml0ZSBjb3VsZFxuLy8gY2F1c2UgdGhlIHN5c3RlbSB0byBydW4gb3V0IG9mIG1lbW9yeS5cbi8vXG4vLyBIb3dldmVyLCBldmVuIGluIHN1Y2ggYSBwYXRob2xvZ2ljYWwgY2FzZSwgb25seSBhIHNpbmdsZSB3cml0dGVuIGNodW5rXG4vLyB3b3VsZCBiZSBjb25zdW1lZCwgYW5kIHRoZW4gdGhlIHJlc3Qgd291bGQgd2FpdCAodW4tdHJhbnNmb3JtZWQpIHVudGlsXG4vLyB0aGUgcmVzdWx0cyBvZiB0aGUgcHJldmlvdXMgdHJhbnNmb3JtZWQgY2h1bmsgd2VyZSBjb25zdW1lZC5cblxubW9kdWxlLmV4cG9ydHMgPSBUcmFuc2Zvcm07XG5cbnZhciBEdXBsZXggPSByZXF1aXJlKCcuL19zdHJlYW1fZHVwbGV4Jyk7XG5cbi8qPHJlcGxhY2VtZW50PiovXG52YXIgdXRpbCA9IHJlcXVpcmUoJ2NvcmUtdXRpbC1pcycpO1xudXRpbC5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxudXRpbC5pbmhlcml0cyhUcmFuc2Zvcm0sIER1cGxleCk7XG5cblxuZnVuY3Rpb24gVHJhbnNmb3JtU3RhdGUob3B0aW9ucywgc3RyZWFtKSB7XG4gIHRoaXMuYWZ0ZXJUcmFuc2Zvcm0gPSBmdW5jdGlvbihlciwgZGF0YSkge1xuICAgIHJldHVybiBhZnRlclRyYW5zZm9ybShzdHJlYW0sIGVyLCBkYXRhKTtcbiAgfTtcblxuICB0aGlzLm5lZWRUcmFuc2Zvcm0gPSBmYWxzZTtcbiAgdGhpcy50cmFuc2Zvcm1pbmcgPSBmYWxzZTtcbiAgdGhpcy53cml0ZWNiID0gbnVsbDtcbiAgdGhpcy53cml0ZWNodW5rID0gbnVsbDtcbn1cblxuZnVuY3Rpb24gYWZ0ZXJUcmFuc2Zvcm0oc3RyZWFtLCBlciwgZGF0YSkge1xuICB2YXIgdHMgPSBzdHJlYW0uX3RyYW5zZm9ybVN0YXRlO1xuICB0cy50cmFuc2Zvcm1pbmcgPSBmYWxzZTtcblxuICB2YXIgY2IgPSB0cy53cml0ZWNiO1xuXG4gIGlmICghY2IpXG4gICAgcmV0dXJuIHN0cmVhbS5lbWl0KCdlcnJvcicsIG5ldyBFcnJvcignbm8gd3JpdGVjYiBpbiBUcmFuc2Zvcm0gY2xhc3MnKSk7XG5cbiAgdHMud3JpdGVjaHVuayA9IG51bGw7XG4gIHRzLndyaXRlY2IgPSBudWxsO1xuXG4gIGlmIChkYXRhICE9PSBudWxsICYmIGRhdGEgIT09IHVuZGVmaW5lZClcbiAgICBzdHJlYW0ucHVzaChkYXRhKTtcblxuICBpZiAoY2IpXG4gICAgY2IoZXIpO1xuXG4gIHZhciBycyA9IHN0cmVhbS5fcmVhZGFibGVTdGF0ZTtcbiAgcnMucmVhZGluZyA9IGZhbHNlO1xuICBpZiAocnMubmVlZFJlYWRhYmxlIHx8IHJzLmxlbmd0aCA8IHJzLmhpZ2hXYXRlck1hcmspIHtcbiAgICBzdHJlYW0uX3JlYWQocnMuaGlnaFdhdGVyTWFyayk7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBUcmFuc2Zvcm0ob3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgVHJhbnNmb3JtKSlcbiAgICByZXR1cm4gbmV3IFRyYW5zZm9ybShvcHRpb25zKTtcblxuICBEdXBsZXguY2FsbCh0aGlzLCBvcHRpb25zKTtcblxuICB2YXIgdHMgPSB0aGlzLl90cmFuc2Zvcm1TdGF0ZSA9IG5ldyBUcmFuc2Zvcm1TdGF0ZShvcHRpb25zLCB0aGlzKTtcblxuICAvLyB3aGVuIHRoZSB3cml0YWJsZSBzaWRlIGZpbmlzaGVzLCB0aGVuIGZsdXNoIG91dCBhbnl0aGluZyByZW1haW5pbmcuXG4gIHZhciBzdHJlYW0gPSB0aGlzO1xuXG4gIC8vIHN0YXJ0IG91dCBhc2tpbmcgZm9yIGEgcmVhZGFibGUgZXZlbnQgb25jZSBkYXRhIGlzIHRyYW5zZm9ybWVkLlxuICB0aGlzLl9yZWFkYWJsZVN0YXRlLm5lZWRSZWFkYWJsZSA9IHRydWU7XG5cbiAgLy8gd2UgaGF2ZSBpbXBsZW1lbnRlZCB0aGUgX3JlYWQgbWV0aG9kLCBhbmQgZG9uZSB0aGUgb3RoZXIgdGhpbmdzXG4gIC8vIHRoYXQgUmVhZGFibGUgd2FudHMgYmVmb3JlIHRoZSBmaXJzdCBfcmVhZCBjYWxsLCBzbyB1bnNldCB0aGVcbiAgLy8gc3luYyBndWFyZCBmbGFnLlxuICB0aGlzLl9yZWFkYWJsZVN0YXRlLnN5bmMgPSBmYWxzZTtcblxuICB0aGlzLm9uY2UoJ2ZpbmlzaCcsIGZ1bmN0aW9uKCkge1xuICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgdGhpcy5fZmx1c2gpXG4gICAgICB0aGlzLl9mbHVzaChmdW5jdGlvbihlcikge1xuICAgICAgICBkb25lKHN0cmVhbSwgZXIpO1xuICAgICAgfSk7XG4gICAgZWxzZVxuICAgICAgZG9uZShzdHJlYW0pO1xuICB9KTtcbn1cblxuVHJhbnNmb3JtLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nKSB7XG4gIHRoaXMuX3RyYW5zZm9ybVN0YXRlLm5lZWRUcmFuc2Zvcm0gPSBmYWxzZTtcbiAgcmV0dXJuIER1cGxleC5wcm90b3R5cGUucHVzaC5jYWxsKHRoaXMsIGNodW5rLCBlbmNvZGluZyk7XG59O1xuXG4vLyBUaGlzIGlzIHRoZSBwYXJ0IHdoZXJlIHlvdSBkbyBzdHVmZiFcbi8vIG92ZXJyaWRlIHRoaXMgZnVuY3Rpb24gaW4gaW1wbGVtZW50YXRpb24gY2xhc3Nlcy5cbi8vICdjaHVuaycgaXMgYW4gaW5wdXQgY2h1bmsuXG4vL1xuLy8gQ2FsbCBgcHVzaChuZXdDaHVuaylgIHRvIHBhc3MgYWxvbmcgdHJhbnNmb3JtZWQgb3V0cHV0XG4vLyB0byB0aGUgcmVhZGFibGUgc2lkZS4gIFlvdSBtYXkgY2FsbCAncHVzaCcgemVybyBvciBtb3JlIHRpbWVzLlxuLy9cbi8vIENhbGwgYGNiKGVycilgIHdoZW4geW91IGFyZSBkb25lIHdpdGggdGhpcyBjaHVuay4gIElmIHlvdSBwYXNzXG4vLyBhbiBlcnJvciwgdGhlbiB0aGF0J2xsIHB1dCB0aGUgaHVydCBvbiB0aGUgd2hvbGUgb3BlcmF0aW9uLiAgSWYgeW91XG4vLyBuZXZlciBjYWxsIGNiKCksIHRoZW4geW91J2xsIG5ldmVyIGdldCBhbm90aGVyIGNodW5rLlxuVHJhbnNmb3JtLnByb3RvdHlwZS5fdHJhbnNmb3JtID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nLCBjYikge1xuICB0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xufTtcblxuVHJhbnNmb3JtLnByb3RvdHlwZS5fd3JpdGUgPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIHZhciB0cyA9IHRoaXMuX3RyYW5zZm9ybVN0YXRlO1xuICB0cy53cml0ZWNiID0gY2I7XG4gIHRzLndyaXRlY2h1bmsgPSBjaHVuaztcbiAgdHMud3JpdGVlbmNvZGluZyA9IGVuY29kaW5nO1xuICBpZiAoIXRzLnRyYW5zZm9ybWluZykge1xuICAgIHZhciBycyA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG4gICAgaWYgKHRzLm5lZWRUcmFuc2Zvcm0gfHxcbiAgICAgICAgcnMubmVlZFJlYWRhYmxlIHx8XG4gICAgICAgIHJzLmxlbmd0aCA8IHJzLmhpZ2hXYXRlck1hcmspXG4gICAgICB0aGlzLl9yZWFkKHJzLmhpZ2hXYXRlck1hcmspO1xuICB9XG59O1xuXG4vLyBEb2Vzbid0IG1hdHRlciB3aGF0IHRoZSBhcmdzIGFyZSBoZXJlLlxuLy8gX3RyYW5zZm9ybSBkb2VzIGFsbCB0aGUgd29yay5cbi8vIFRoYXQgd2UgZ290IGhlcmUgbWVhbnMgdGhhdCB0aGUgcmVhZGFibGUgc2lkZSB3YW50cyBtb3JlIGRhdGEuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLl9yZWFkID0gZnVuY3Rpb24obikge1xuICB2YXIgdHMgPSB0aGlzLl90cmFuc2Zvcm1TdGF0ZTtcblxuICBpZiAodHMud3JpdGVjaHVuayAhPT0gbnVsbCAmJiB0cy53cml0ZWNiICYmICF0cy50cmFuc2Zvcm1pbmcpIHtcbiAgICB0cy50cmFuc2Zvcm1pbmcgPSB0cnVlO1xuICAgIHRoaXMuX3RyYW5zZm9ybSh0cy53cml0ZWNodW5rLCB0cy53cml0ZWVuY29kaW5nLCB0cy5hZnRlclRyYW5zZm9ybSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gbWFyayB0aGF0IHdlIG5lZWQgYSB0cmFuc2Zvcm0sIHNvIHRoYXQgYW55IGRhdGEgdGhhdCBjb21lcyBpblxuICAgIC8vIHdpbGwgZ2V0IHByb2Nlc3NlZCwgbm93IHRoYXQgd2UndmUgYXNrZWQgZm9yIGl0LlxuICAgIHRzLm5lZWRUcmFuc2Zvcm0gPSB0cnVlO1xuICB9XG59O1xuXG5cbmZ1bmN0aW9uIGRvbmUoc3RyZWFtLCBlcikge1xuICBpZiAoZXIpXG4gICAgcmV0dXJuIHN0cmVhbS5lbWl0KCdlcnJvcicsIGVyKTtcblxuICAvLyBpZiB0aGVyZSdzIG5vdGhpbmcgaW4gdGhlIHdyaXRlIGJ1ZmZlciwgdGhlbiB0aGF0IG1lYW5zXG4gIC8vIHRoYXQgbm90aGluZyBtb3JlIHdpbGwgZXZlciBiZSBwcm92aWRlZFxuICB2YXIgd3MgPSBzdHJlYW0uX3dyaXRhYmxlU3RhdGU7XG4gIHZhciBycyA9IHN0cmVhbS5fcmVhZGFibGVTdGF0ZTtcbiAgdmFyIHRzID0gc3RyZWFtLl90cmFuc2Zvcm1TdGF0ZTtcblxuICBpZiAod3MubGVuZ3RoKVxuICAgIHRocm93IG5ldyBFcnJvcignY2FsbGluZyB0cmFuc2Zvcm0gZG9uZSB3aGVuIHdzLmxlbmd0aCAhPSAwJyk7XG5cbiAgaWYgKHRzLnRyYW5zZm9ybWluZylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NhbGxpbmcgdHJhbnNmb3JtIGRvbmUgd2hlbiBzdGlsbCB0cmFuc2Zvcm1pbmcnKTtcblxuICByZXR1cm4gc3RyZWFtLnB1c2gobnVsbCk7XG59XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gQSBiaXQgc2ltcGxlciB0aGFuIHJlYWRhYmxlIHN0cmVhbXMuXG4vLyBJbXBsZW1lbnQgYW4gYXN5bmMgLl93cml0ZShjaHVuaywgY2IpLCBhbmQgaXQnbGwgaGFuZGxlIGFsbFxuLy8gdGhlIGRyYWluIGV2ZW50IGVtaXNzaW9uIGFuZCBidWZmZXJpbmcuXG5cbm1vZHVsZS5leHBvcnRzID0gV3JpdGFibGU7XG5cbi8qPHJlcGxhY2VtZW50PiovXG52YXIgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyO1xuLyo8L3JlcGxhY2VtZW50PiovXG5cbldyaXRhYmxlLldyaXRhYmxlU3RhdGUgPSBXcml0YWJsZVN0YXRlO1xuXG5cbi8qPHJlcGxhY2VtZW50PiovXG52YXIgdXRpbCA9IHJlcXVpcmUoJ2NvcmUtdXRpbC1pcycpO1xudXRpbC5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxudmFyIFN0cmVhbSA9IHJlcXVpcmUoJ3N0cmVhbScpO1xuXG51dGlsLmluaGVyaXRzKFdyaXRhYmxlLCBTdHJlYW0pO1xuXG5mdW5jdGlvbiBXcml0ZVJlcShjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIHRoaXMuY2h1bmsgPSBjaHVuaztcbiAgdGhpcy5lbmNvZGluZyA9IGVuY29kaW5nO1xuICB0aGlzLmNhbGxiYWNrID0gY2I7XG59XG5cbmZ1bmN0aW9uIFdyaXRhYmxlU3RhdGUob3B0aW9ucywgc3RyZWFtKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vIHRoZSBwb2ludCBhdCB3aGljaCB3cml0ZSgpIHN0YXJ0cyByZXR1cm5pbmcgZmFsc2VcbiAgLy8gTm90ZTogMCBpcyBhIHZhbGlkIHZhbHVlLCBtZWFucyB0aGF0IHdlIGFsd2F5cyByZXR1cm4gZmFsc2UgaWZcbiAgLy8gdGhlIGVudGlyZSBidWZmZXIgaXMgbm90IGZsdXNoZWQgaW1tZWRpYXRlbHkgb24gd3JpdGUoKVxuICB2YXIgaHdtID0gb3B0aW9ucy5oaWdoV2F0ZXJNYXJrO1xuICB0aGlzLmhpZ2hXYXRlck1hcmsgPSAoaHdtIHx8IGh3bSA9PT0gMCkgPyBod20gOiAxNiAqIDEwMjQ7XG5cbiAgLy8gb2JqZWN0IHN0cmVhbSBmbGFnIHRvIGluZGljYXRlIHdoZXRoZXIgb3Igbm90IHRoaXMgc3RyZWFtXG4gIC8vIGNvbnRhaW5zIGJ1ZmZlcnMgb3Igb2JqZWN0cy5cbiAgdGhpcy5vYmplY3RNb2RlID0gISFvcHRpb25zLm9iamVjdE1vZGU7XG5cbiAgLy8gY2FzdCB0byBpbnRzLlxuICB0aGlzLmhpZ2hXYXRlck1hcmsgPSB+fnRoaXMuaGlnaFdhdGVyTWFyaztcblxuICB0aGlzLm5lZWREcmFpbiA9IGZhbHNlO1xuICAvLyBhdCB0aGUgc3RhcnQgb2YgY2FsbGluZyBlbmQoKVxuICB0aGlzLmVuZGluZyA9IGZhbHNlO1xuICAvLyB3aGVuIGVuZCgpIGhhcyBiZWVuIGNhbGxlZCwgYW5kIHJldHVybmVkXG4gIHRoaXMuZW5kZWQgPSBmYWxzZTtcbiAgLy8gd2hlbiAnZmluaXNoJyBpcyBlbWl0dGVkXG4gIHRoaXMuZmluaXNoZWQgPSBmYWxzZTtcblxuICAvLyBzaG91bGQgd2UgZGVjb2RlIHN0cmluZ3MgaW50byBidWZmZXJzIGJlZm9yZSBwYXNzaW5nIHRvIF93cml0ZT9cbiAgLy8gdGhpcyBpcyBoZXJlIHNvIHRoYXQgc29tZSBub2RlLWNvcmUgc3RyZWFtcyBjYW4gb3B0aW1pemUgc3RyaW5nXG4gIC8vIGhhbmRsaW5nIGF0IGEgbG93ZXIgbGV2ZWwuXG4gIHZhciBub0RlY29kZSA9IG9wdGlvbnMuZGVjb2RlU3RyaW5ncyA9PT0gZmFsc2U7XG4gIHRoaXMuZGVjb2RlU3RyaW5ncyA9ICFub0RlY29kZTtcblxuICAvLyBDcnlwdG8gaXMga2luZCBvZiBvbGQgYW5kIGNydXN0eS4gIEhpc3RvcmljYWxseSwgaXRzIGRlZmF1bHQgc3RyaW5nXG4gIC8vIGVuY29kaW5nIGlzICdiaW5hcnknIHNvIHdlIGhhdmUgdG8gbWFrZSB0aGlzIGNvbmZpZ3VyYWJsZS5cbiAgLy8gRXZlcnl0aGluZyBlbHNlIGluIHRoZSB1bml2ZXJzZSB1c2VzICd1dGY4JywgdGhvdWdoLlxuICB0aGlzLmRlZmF1bHRFbmNvZGluZyA9IG9wdGlvbnMuZGVmYXVsdEVuY29kaW5nIHx8ICd1dGY4JztcblxuICAvLyBub3QgYW4gYWN0dWFsIGJ1ZmZlciB3ZSBrZWVwIHRyYWNrIG9mLCBidXQgYSBtZWFzdXJlbWVudFxuICAvLyBvZiBob3cgbXVjaCB3ZSdyZSB3YWl0aW5nIHRvIGdldCBwdXNoZWQgdG8gc29tZSB1bmRlcmx5aW5nXG4gIC8vIHNvY2tldCBvciBmaWxlLlxuICB0aGlzLmxlbmd0aCA9IDA7XG5cbiAgLy8gYSBmbGFnIHRvIHNlZSB3aGVuIHdlJ3JlIGluIHRoZSBtaWRkbGUgb2YgYSB3cml0ZS5cbiAgdGhpcy53cml0aW5nID0gZmFsc2U7XG5cbiAgLy8gYSBmbGFnIHRvIGJlIGFibGUgdG8gdGVsbCBpZiB0aGUgb253cml0ZSBjYiBpcyBjYWxsZWQgaW1tZWRpYXRlbHksXG4gIC8vIG9yIG9uIGEgbGF0ZXIgdGljay4gIFdlIHNldCB0aGlzIHRvIHRydWUgYXQgZmlyc3QsIGJlY3Vhc2UgYW55XG4gIC8vIGFjdGlvbnMgdGhhdCBzaG91bGRuJ3QgaGFwcGVuIHVudGlsIFwibGF0ZXJcIiBzaG91bGQgZ2VuZXJhbGx5IGFsc29cbiAgLy8gbm90IGhhcHBlbiBiZWZvcmUgdGhlIGZpcnN0IHdyaXRlIGNhbGwuXG4gIHRoaXMuc3luYyA9IHRydWU7XG5cbiAgLy8gYSBmbGFnIHRvIGtub3cgaWYgd2UncmUgcHJvY2Vzc2luZyBwcmV2aW91c2x5IGJ1ZmZlcmVkIGl0ZW1zLCB3aGljaFxuICAvLyBtYXkgY2FsbCB0aGUgX3dyaXRlKCkgY2FsbGJhY2sgaW4gdGhlIHNhbWUgdGljaywgc28gdGhhdCB3ZSBkb24ndFxuICAvLyBlbmQgdXAgaW4gYW4gb3ZlcmxhcHBlZCBvbndyaXRlIHNpdHVhdGlvbi5cbiAgdGhpcy5idWZmZXJQcm9jZXNzaW5nID0gZmFsc2U7XG5cbiAgLy8gdGhlIGNhbGxiYWNrIHRoYXQncyBwYXNzZWQgdG8gX3dyaXRlKGNodW5rLGNiKVxuICB0aGlzLm9ud3JpdGUgPSBmdW5jdGlvbihlcikge1xuICAgIG9ud3JpdGUoc3RyZWFtLCBlcik7XG4gIH07XG5cbiAgLy8gdGhlIGNhbGxiYWNrIHRoYXQgdGhlIHVzZXIgc3VwcGxpZXMgdG8gd3JpdGUoY2h1bmssZW5jb2RpbmcsY2IpXG4gIHRoaXMud3JpdGVjYiA9IG51bGw7XG5cbiAgLy8gdGhlIGFtb3VudCB0aGF0IGlzIGJlaW5nIHdyaXR0ZW4gd2hlbiBfd3JpdGUgaXMgY2FsbGVkLlxuICB0aGlzLndyaXRlbGVuID0gMDtcblxuICB0aGlzLmJ1ZmZlciA9IFtdO1xuXG4gIC8vIFRydWUgaWYgdGhlIGVycm9yIHdhcyBhbHJlYWR5IGVtaXR0ZWQgYW5kIHNob3VsZCBub3QgYmUgdGhyb3duIGFnYWluXG4gIHRoaXMuZXJyb3JFbWl0dGVkID0gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIFdyaXRhYmxlKG9wdGlvbnMpIHtcbiAgdmFyIER1cGxleCA9IHJlcXVpcmUoJy4vX3N0cmVhbV9kdXBsZXgnKTtcblxuICAvLyBXcml0YWJsZSBjdG9yIGlzIGFwcGxpZWQgdG8gRHVwbGV4ZXMsIHRob3VnaCB0aGV5J3JlIG5vdFxuICAvLyBpbnN0YW5jZW9mIFdyaXRhYmxlLCB0aGV5J3JlIGluc3RhbmNlb2YgUmVhZGFibGUuXG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBXcml0YWJsZSkgJiYgISh0aGlzIGluc3RhbmNlb2YgRHVwbGV4KSlcbiAgICByZXR1cm4gbmV3IFdyaXRhYmxlKG9wdGlvbnMpO1xuXG4gIHRoaXMuX3dyaXRhYmxlU3RhdGUgPSBuZXcgV3JpdGFibGVTdGF0ZShvcHRpb25zLCB0aGlzKTtcblxuICAvLyBsZWdhY3kuXG4gIHRoaXMud3JpdGFibGUgPSB0cnVlO1xuXG4gIFN0cmVhbS5jYWxsKHRoaXMpO1xufVxuXG4vLyBPdGhlcndpc2UgcGVvcGxlIGNhbiBwaXBlIFdyaXRhYmxlIHN0cmVhbXMsIHdoaWNoIGlzIGp1c3Qgd3JvbmcuXG5Xcml0YWJsZS5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmVtaXQoJ2Vycm9yJywgbmV3IEVycm9yKCdDYW5ub3QgcGlwZS4gTm90IHJlYWRhYmxlLicpKTtcbn07XG5cblxuZnVuY3Rpb24gd3JpdGVBZnRlckVuZChzdHJlYW0sIHN0YXRlLCBjYikge1xuICB2YXIgZXIgPSBuZXcgRXJyb3IoJ3dyaXRlIGFmdGVyIGVuZCcpO1xuICAvLyBUT0RPOiBkZWZlciBlcnJvciBldmVudHMgY29uc2lzdGVudGx5IGV2ZXJ5d2hlcmUsIG5vdCBqdXN0IHRoZSBjYlxuICBzdHJlYW0uZW1pdCgnZXJyb3InLCBlcik7XG4gIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgY2IoZXIpO1xuICB9KTtcbn1cblxuLy8gSWYgd2UgZ2V0IHNvbWV0aGluZyB0aGF0IGlzIG5vdCBhIGJ1ZmZlciwgc3RyaW5nLCBudWxsLCBvciB1bmRlZmluZWQsXG4vLyBhbmQgd2UncmUgbm90IGluIG9iamVjdE1vZGUsIHRoZW4gdGhhdCdzIGFuIGVycm9yLlxuLy8gT3RoZXJ3aXNlIHN0cmVhbSBjaHVua3MgYXJlIGFsbCBjb25zaWRlcmVkIHRvIGJlIG9mIGxlbmd0aD0xLCBhbmQgdGhlXG4vLyB3YXRlcm1hcmtzIGRldGVybWluZSBob3cgbWFueSBvYmplY3RzIHRvIGtlZXAgaW4gdGhlIGJ1ZmZlciwgcmF0aGVyIHRoYW5cbi8vIGhvdyBtYW55IGJ5dGVzIG9yIGNoYXJhY3RlcnMuXG5mdW5jdGlvbiB2YWxpZENodW5rKHN0cmVhbSwgc3RhdGUsIGNodW5rLCBjYikge1xuICB2YXIgdmFsaWQgPSB0cnVlO1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihjaHVuaykgJiZcbiAgICAgICdzdHJpbmcnICE9PSB0eXBlb2YgY2h1bmsgJiZcbiAgICAgIGNodW5rICE9PSBudWxsICYmXG4gICAgICBjaHVuayAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAhc3RhdGUub2JqZWN0TW9kZSkge1xuICAgIHZhciBlciA9IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgbm9uLXN0cmluZy9idWZmZXIgY2h1bmsnKTtcbiAgICBzdHJlYW0uZW1pdCgnZXJyb3InLCBlcik7XG4gICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIGNiKGVyKTtcbiAgICB9KTtcbiAgICB2YWxpZCA9IGZhbHNlO1xuICB9XG4gIHJldHVybiB2YWxpZDtcbn1cblxuV3JpdGFibGUucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nLCBjYikge1xuICB2YXIgc3RhdGUgPSB0aGlzLl93cml0YWJsZVN0YXRlO1xuICB2YXIgcmV0ID0gZmFsc2U7XG5cbiAgaWYgKHR5cGVvZiBlbmNvZGluZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGNiID0gZW5jb2Rpbmc7XG4gICAgZW5jb2RpbmcgPSBudWxsO1xuICB9XG5cbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihjaHVuaykpXG4gICAgZW5jb2RpbmcgPSAnYnVmZmVyJztcbiAgZWxzZSBpZiAoIWVuY29kaW5nKVxuICAgIGVuY29kaW5nID0gc3RhdGUuZGVmYXVsdEVuY29kaW5nO1xuXG4gIGlmICh0eXBlb2YgY2IgIT09ICdmdW5jdGlvbicpXG4gICAgY2IgPSBmdW5jdGlvbigpIHt9O1xuXG4gIGlmIChzdGF0ZS5lbmRlZClcbiAgICB3cml0ZUFmdGVyRW5kKHRoaXMsIHN0YXRlLCBjYik7XG4gIGVsc2UgaWYgKHZhbGlkQ2h1bmsodGhpcywgc3RhdGUsIGNodW5rLCBjYikpXG4gICAgcmV0ID0gd3JpdGVPckJ1ZmZlcih0aGlzLCBzdGF0ZSwgY2h1bmssIGVuY29kaW5nLCBjYik7XG5cbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGRlY29kZUNodW5rKHN0YXRlLCBjaHVuaywgZW5jb2RpbmcpIHtcbiAgaWYgKCFzdGF0ZS5vYmplY3RNb2RlICYmXG4gICAgICBzdGF0ZS5kZWNvZGVTdHJpbmdzICE9PSBmYWxzZSAmJlxuICAgICAgdHlwZW9mIGNodW5rID09PSAnc3RyaW5nJykge1xuICAgIGNodW5rID0gbmV3IEJ1ZmZlcihjaHVuaywgZW5jb2RpbmcpO1xuICB9XG4gIHJldHVybiBjaHVuaztcbn1cblxuLy8gaWYgd2UncmUgYWxyZWFkeSB3cml0aW5nIHNvbWV0aGluZywgdGhlbiBqdXN0IHB1dCB0aGlzXG4vLyBpbiB0aGUgcXVldWUsIGFuZCB3YWl0IG91ciB0dXJuLiAgT3RoZXJ3aXNlLCBjYWxsIF93cml0ZVxuLy8gSWYgd2UgcmV0dXJuIGZhbHNlLCB0aGVuIHdlIG5lZWQgYSBkcmFpbiBldmVudCwgc28gc2V0IHRoYXQgZmxhZy5cbmZ1bmN0aW9uIHdyaXRlT3JCdWZmZXIoc3RyZWFtLCBzdGF0ZSwgY2h1bmssIGVuY29kaW5nLCBjYikge1xuICBjaHVuayA9IGRlY29kZUNodW5rKHN0YXRlLCBjaHVuaywgZW5jb2RpbmcpO1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKGNodW5rKSlcbiAgICBlbmNvZGluZyA9ICdidWZmZXInO1xuICB2YXIgbGVuID0gc3RhdGUub2JqZWN0TW9kZSA/IDEgOiBjaHVuay5sZW5ndGg7XG5cbiAgc3RhdGUubGVuZ3RoICs9IGxlbjtcblxuICB2YXIgcmV0ID0gc3RhdGUubGVuZ3RoIDwgc3RhdGUuaGlnaFdhdGVyTWFyaztcbiAgLy8gd2UgbXVzdCBlbnN1cmUgdGhhdCBwcmV2aW91cyBuZWVkRHJhaW4gd2lsbCBub3QgYmUgcmVzZXQgdG8gZmFsc2UuXG4gIGlmICghcmV0KVxuICAgIHN0YXRlLm5lZWREcmFpbiA9IHRydWU7XG5cbiAgaWYgKHN0YXRlLndyaXRpbmcpXG4gICAgc3RhdGUuYnVmZmVyLnB1c2gobmV3IFdyaXRlUmVxKGNodW5rLCBlbmNvZGluZywgY2IpKTtcbiAgZWxzZVxuICAgIGRvV3JpdGUoc3RyZWFtLCBzdGF0ZSwgbGVuLCBjaHVuaywgZW5jb2RpbmcsIGNiKTtcblxuICByZXR1cm4gcmV0O1xufVxuXG5mdW5jdGlvbiBkb1dyaXRlKHN0cmVhbSwgc3RhdGUsIGxlbiwgY2h1bmssIGVuY29kaW5nLCBjYikge1xuICBzdGF0ZS53cml0ZWxlbiA9IGxlbjtcbiAgc3RhdGUud3JpdGVjYiA9IGNiO1xuICBzdGF0ZS53cml0aW5nID0gdHJ1ZTtcbiAgc3RhdGUuc3luYyA9IHRydWU7XG4gIHN0cmVhbS5fd3JpdGUoY2h1bmssIGVuY29kaW5nLCBzdGF0ZS5vbndyaXRlKTtcbiAgc3RhdGUuc3luYyA9IGZhbHNlO1xufVxuXG5mdW5jdGlvbiBvbndyaXRlRXJyb3Ioc3RyZWFtLCBzdGF0ZSwgc3luYywgZXIsIGNiKSB7XG4gIGlmIChzeW5jKVxuICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICBjYihlcik7XG4gICAgfSk7XG4gIGVsc2VcbiAgICBjYihlcik7XG5cbiAgc3RyZWFtLl93cml0YWJsZVN0YXRlLmVycm9yRW1pdHRlZCA9IHRydWU7XG4gIHN0cmVhbS5lbWl0KCdlcnJvcicsIGVyKTtcbn1cblxuZnVuY3Rpb24gb253cml0ZVN0YXRlVXBkYXRlKHN0YXRlKSB7XG4gIHN0YXRlLndyaXRpbmcgPSBmYWxzZTtcbiAgc3RhdGUud3JpdGVjYiA9IG51bGw7XG4gIHN0YXRlLmxlbmd0aCAtPSBzdGF0ZS53cml0ZWxlbjtcbiAgc3RhdGUud3JpdGVsZW4gPSAwO1xufVxuXG5mdW5jdGlvbiBvbndyaXRlKHN0cmVhbSwgZXIpIHtcbiAgdmFyIHN0YXRlID0gc3RyZWFtLl93cml0YWJsZVN0YXRlO1xuICB2YXIgc3luYyA9IHN0YXRlLnN5bmM7XG4gIHZhciBjYiA9IHN0YXRlLndyaXRlY2I7XG5cbiAgb253cml0ZVN0YXRlVXBkYXRlKHN0YXRlKTtcblxuICBpZiAoZXIpXG4gICAgb253cml0ZUVycm9yKHN0cmVhbSwgc3RhdGUsIHN5bmMsIGVyLCBjYik7XG4gIGVsc2Uge1xuICAgIC8vIENoZWNrIGlmIHdlJ3JlIGFjdHVhbGx5IHJlYWR5IHRvIGZpbmlzaCwgYnV0IGRvbid0IGVtaXQgeWV0XG4gICAgdmFyIGZpbmlzaGVkID0gbmVlZEZpbmlzaChzdHJlYW0sIHN0YXRlKTtcblxuICAgIGlmICghZmluaXNoZWQgJiYgIXN0YXRlLmJ1ZmZlclByb2Nlc3NpbmcgJiYgc3RhdGUuYnVmZmVyLmxlbmd0aClcbiAgICAgIGNsZWFyQnVmZmVyKHN0cmVhbSwgc3RhdGUpO1xuXG4gICAgaWYgKHN5bmMpIHtcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICAgIGFmdGVyV3JpdGUoc3RyZWFtLCBzdGF0ZSwgZmluaXNoZWQsIGNiKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBhZnRlcldyaXRlKHN0cmVhbSwgc3RhdGUsIGZpbmlzaGVkLCBjYik7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGFmdGVyV3JpdGUoc3RyZWFtLCBzdGF0ZSwgZmluaXNoZWQsIGNiKSB7XG4gIGlmICghZmluaXNoZWQpXG4gICAgb253cml0ZURyYWluKHN0cmVhbSwgc3RhdGUpO1xuICBjYigpO1xuICBpZiAoZmluaXNoZWQpXG4gICAgZmluaXNoTWF5YmUoc3RyZWFtLCBzdGF0ZSk7XG59XG5cbi8vIE11c3QgZm9yY2UgY2FsbGJhY2sgdG8gYmUgY2FsbGVkIG9uIG5leHRUaWNrLCBzbyB0aGF0IHdlIGRvbid0XG4vLyBlbWl0ICdkcmFpbicgYmVmb3JlIHRoZSB3cml0ZSgpIGNvbnN1bWVyIGdldHMgdGhlICdmYWxzZScgcmV0dXJuXG4vLyB2YWx1ZSwgYW5kIGhhcyBhIGNoYW5jZSB0byBhdHRhY2ggYSAnZHJhaW4nIGxpc3RlbmVyLlxuZnVuY3Rpb24gb253cml0ZURyYWluKHN0cmVhbSwgc3RhdGUpIHtcbiAgaWYgKHN0YXRlLmxlbmd0aCA9PT0gMCAmJiBzdGF0ZS5uZWVkRHJhaW4pIHtcbiAgICBzdGF0ZS5uZWVkRHJhaW4gPSBmYWxzZTtcbiAgICBzdHJlYW0uZW1pdCgnZHJhaW4nKTtcbiAgfVxufVxuXG5cbi8vIGlmIHRoZXJlJ3Mgc29tZXRoaW5nIGluIHRoZSBidWZmZXIgd2FpdGluZywgdGhlbiBwcm9jZXNzIGl0XG5mdW5jdGlvbiBjbGVhckJ1ZmZlcihzdHJlYW0sIHN0YXRlKSB7XG4gIHN0YXRlLmJ1ZmZlclByb2Nlc3NpbmcgPSB0cnVlO1xuXG4gIGZvciAodmFyIGMgPSAwOyBjIDwgc3RhdGUuYnVmZmVyLmxlbmd0aDsgYysrKSB7XG4gICAgdmFyIGVudHJ5ID0gc3RhdGUuYnVmZmVyW2NdO1xuICAgIHZhciBjaHVuayA9IGVudHJ5LmNodW5rO1xuICAgIHZhciBlbmNvZGluZyA9IGVudHJ5LmVuY29kaW5nO1xuICAgIHZhciBjYiA9IGVudHJ5LmNhbGxiYWNrO1xuICAgIHZhciBsZW4gPSBzdGF0ZS5vYmplY3RNb2RlID8gMSA6IGNodW5rLmxlbmd0aDtcblxuICAgIGRvV3JpdGUoc3RyZWFtLCBzdGF0ZSwgbGVuLCBjaHVuaywgZW5jb2RpbmcsIGNiKTtcblxuICAgIC8vIGlmIHdlIGRpZG4ndCBjYWxsIHRoZSBvbndyaXRlIGltbWVkaWF0ZWx5LCB0aGVuXG4gICAgLy8gaXQgbWVhbnMgdGhhdCB3ZSBuZWVkIHRvIHdhaXQgdW50aWwgaXQgZG9lcy5cbiAgICAvLyBhbHNvLCB0aGF0IG1lYW5zIHRoYXQgdGhlIGNodW5rIGFuZCBjYiBhcmUgY3VycmVudGx5XG4gICAgLy8gYmVpbmcgcHJvY2Vzc2VkLCBzbyBtb3ZlIHRoZSBidWZmZXIgY291bnRlciBwYXN0IHRoZW0uXG4gICAgaWYgKHN0YXRlLndyaXRpbmcpIHtcbiAgICAgIGMrKztcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHN0YXRlLmJ1ZmZlclByb2Nlc3NpbmcgPSBmYWxzZTtcbiAgaWYgKGMgPCBzdGF0ZS5idWZmZXIubGVuZ3RoKVxuICAgIHN0YXRlLmJ1ZmZlciA9IHN0YXRlLmJ1ZmZlci5zbGljZShjKTtcbiAgZWxzZVxuICAgIHN0YXRlLmJ1ZmZlci5sZW5ndGggPSAwO1xufVxuXG5Xcml0YWJsZS5wcm90b3R5cGUuX3dyaXRlID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nLCBjYikge1xuICBjYihuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpKTtcbn07XG5cbldyaXRhYmxlLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3dyaXRhYmxlU3RhdGU7XG5cbiAgaWYgKHR5cGVvZiBjaHVuayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGNiID0gY2h1bms7XG4gICAgY2h1bmsgPSBudWxsO1xuICAgIGVuY29kaW5nID0gbnVsbDtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZW5jb2RpbmcgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYiA9IGVuY29kaW5nO1xuICAgIGVuY29kaW5nID0gbnVsbDtcbiAgfVxuXG4gIGlmICh0eXBlb2YgY2h1bmsgIT09ICd1bmRlZmluZWQnICYmIGNodW5rICE9PSBudWxsKVxuICAgIHRoaXMud3JpdGUoY2h1bmssIGVuY29kaW5nKTtcblxuICAvLyBpZ25vcmUgdW5uZWNlc3NhcnkgZW5kKCkgY2FsbHMuXG4gIGlmICghc3RhdGUuZW5kaW5nICYmICFzdGF0ZS5maW5pc2hlZClcbiAgICBlbmRXcml0YWJsZSh0aGlzLCBzdGF0ZSwgY2IpO1xufTtcblxuXG5mdW5jdGlvbiBuZWVkRmluaXNoKHN0cmVhbSwgc3RhdGUpIHtcbiAgcmV0dXJuIChzdGF0ZS5lbmRpbmcgJiZcbiAgICAgICAgICBzdGF0ZS5sZW5ndGggPT09IDAgJiZcbiAgICAgICAgICAhc3RhdGUuZmluaXNoZWQgJiZcbiAgICAgICAgICAhc3RhdGUud3JpdGluZyk7XG59XG5cbmZ1bmN0aW9uIGZpbmlzaE1heWJlKHN0cmVhbSwgc3RhdGUpIHtcbiAgdmFyIG5lZWQgPSBuZWVkRmluaXNoKHN0cmVhbSwgc3RhdGUpO1xuICBpZiAobmVlZCkge1xuICAgIHN0YXRlLmZpbmlzaGVkID0gdHJ1ZTtcbiAgICBzdHJlYW0uZW1pdCgnZmluaXNoJyk7XG4gIH1cbiAgcmV0dXJuIG5lZWQ7XG59XG5cbmZ1bmN0aW9uIGVuZFdyaXRhYmxlKHN0cmVhbSwgc3RhdGUsIGNiKSB7XG4gIHN0YXRlLmVuZGluZyA9IHRydWU7XG4gIGZpbmlzaE1heWJlKHN0cmVhbSwgc3RhdGUpO1xuICBpZiAoY2IpIHtcbiAgICBpZiAoc3RhdGUuZmluaXNoZWQpXG4gICAgICBwcm9jZXNzLm5leHRUaWNrKGNiKTtcbiAgICBlbHNlXG4gICAgICBzdHJlYW0ub25jZSgnZmluaXNoJywgY2IpO1xuICB9XG4gIHN0YXRlLmVuZGVkID0gdHJ1ZTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vbGliL19zdHJlYW1fcGFzc3Rocm91Z2guanNcIilcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vbGliL19zdHJlYW1fdHJhbnNmb3JtLmpzXCIpXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2xpYi9fc3RyZWFtX3dyaXRhYmxlLmpzXCIpXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJpbXJhZlxucmltcmFmLnN5bmMgPSByaW1yYWZTeW5jXG5cbnZhciBhc3NlcnQgPSByZXF1aXJlKFwiYXNzZXJ0XCIpXG52YXIgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpXG52YXIgZnMgPSByZXF1aXJlKFwiZnNcIilcbnZhciBnbG9iID0gdW5kZWZpbmVkXG50cnkge1xuICBnbG9iID0gcmVxdWlyZShcImdsb2JcIilcbn0gY2F0Y2ggKF9lcnIpIHtcbiAgLy8gdHJlYXQgZ2xvYiBhcyBvcHRpb25hbC5cbn1cbnZhciBfMDY2NiA9IHBhcnNlSW50KCc2NjYnLCA4KVxuXG52YXIgZGVmYXVsdEdsb2JPcHRzID0ge1xuICBub3NvcnQ6IHRydWUsXG4gIHNpbGVudDogdHJ1ZVxufVxuXG4vLyBmb3IgRU1GSUxFIGhhbmRsaW5nXG52YXIgdGltZW91dCA9IDBcblxudmFyIGlzV2luZG93cyA9IChwcm9jZXNzLnBsYXRmb3JtID09PSBcIndpbjMyXCIpXG5cbmZ1bmN0aW9uIGRlZmF1bHRzIChvcHRpb25zKSB7XG4gIHZhciBtZXRob2RzID0gW1xuICAgICd1bmxpbmsnLFxuICAgICdjaG1vZCcsXG4gICAgJ3N0YXQnLFxuICAgICdsc3RhdCcsXG4gICAgJ3JtZGlyJyxcbiAgICAncmVhZGRpcidcbiAgXVxuICBtZXRob2RzLmZvckVhY2goZnVuY3Rpb24obSkge1xuICAgIG9wdGlvbnNbbV0gPSBvcHRpb25zW21dIHx8IGZzW21dXG4gICAgbSA9IG0gKyAnU3luYydcbiAgICBvcHRpb25zW21dID0gb3B0aW9uc1ttXSB8fCBmc1ttXVxuICB9KVxuXG4gIG9wdGlvbnMubWF4QnVzeVRyaWVzID0gb3B0aW9ucy5tYXhCdXN5VHJpZXMgfHwgM1xuICBvcHRpb25zLmVtZmlsZVdhaXQgPSBvcHRpb25zLmVtZmlsZVdhaXQgfHwgMTAwMFxuICBpZiAob3B0aW9ucy5nbG9iID09PSBmYWxzZSkge1xuICAgIG9wdGlvbnMuZGlzYWJsZUdsb2IgPSB0cnVlXG4gIH1cbiAgaWYgKG9wdGlvbnMuZGlzYWJsZUdsb2IgIT09IHRydWUgJiYgZ2xvYiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgRXJyb3IoJ2dsb2IgZGVwZW5kZW5jeSBub3QgZm91bmQsIHNldCBgb3B0aW9ucy5kaXNhYmxlR2xvYiA9IHRydWVgIGlmIGludGVudGlvbmFsJylcbiAgfVxuICBvcHRpb25zLmRpc2FibGVHbG9iID0gb3B0aW9ucy5kaXNhYmxlR2xvYiB8fCBmYWxzZVxuICBvcHRpb25zLmdsb2IgPSBvcHRpb25zLmdsb2IgfHwgZGVmYXVsdEdsb2JPcHRzXG59XG5cbmZ1bmN0aW9uIHJpbXJhZiAocCwgb3B0aW9ucywgY2IpIHtcbiAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2IgPSBvcHRpb25zXG4gICAgb3B0aW9ucyA9IHt9XG4gIH1cblxuICBhc3NlcnQocCwgJ3JpbXJhZjogbWlzc2luZyBwYXRoJylcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBwLCAnc3RyaW5nJywgJ3JpbXJhZjogcGF0aCBzaG91bGQgYmUgYSBzdHJpbmcnKVxuICBhc3NlcnQuZXF1YWwodHlwZW9mIGNiLCAnZnVuY3Rpb24nLCAncmltcmFmOiBjYWxsYmFjayBmdW5jdGlvbiByZXF1aXJlZCcpXG4gIGFzc2VydChvcHRpb25zLCAncmltcmFmOiBpbnZhbGlkIG9wdGlvbnMgYXJndW1lbnQgcHJvdmlkZWQnKVxuICBhc3NlcnQuZXF1YWwodHlwZW9mIG9wdGlvbnMsICdvYmplY3QnLCAncmltcmFmOiBvcHRpb25zIHNob3VsZCBiZSBvYmplY3QnKVxuXG4gIGRlZmF1bHRzKG9wdGlvbnMpXG5cbiAgdmFyIGJ1c3lUcmllcyA9IDBcbiAgdmFyIGVyclN0YXRlID0gbnVsbFxuICB2YXIgbiA9IDBcblxuICBpZiAob3B0aW9ucy5kaXNhYmxlR2xvYiB8fCAhZ2xvYi5oYXNNYWdpYyhwKSlcbiAgICByZXR1cm4gYWZ0ZXJHbG9iKG51bGwsIFtwXSlcblxuICBvcHRpb25zLmxzdGF0KHAsIGZ1bmN0aW9uIChlciwgc3RhdCkge1xuICAgIGlmICghZXIpXG4gICAgICByZXR1cm4gYWZ0ZXJHbG9iKG51bGwsIFtwXSlcblxuICAgIGdsb2IocCwgb3B0aW9ucy5nbG9iLCBhZnRlckdsb2IpXG4gIH0pXG5cbiAgZnVuY3Rpb24gbmV4dCAoZXIpIHtcbiAgICBlcnJTdGF0ZSA9IGVyclN0YXRlIHx8IGVyXG4gICAgaWYgKC0tbiA9PT0gMClcbiAgICAgIGNiKGVyclN0YXRlKVxuICB9XG5cbiAgZnVuY3Rpb24gYWZ0ZXJHbG9iIChlciwgcmVzdWx0cykge1xuICAgIGlmIChlcilcbiAgICAgIHJldHVybiBjYihlcilcblxuICAgIG4gPSByZXN1bHRzLmxlbmd0aFxuICAgIGlmIChuID09PSAwKVxuICAgICAgcmV0dXJuIGNiKClcblxuICAgIHJlc3VsdHMuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgcmltcmFmXyhwLCBvcHRpb25zLCBmdW5jdGlvbiBDQiAoZXIpIHtcbiAgICAgICAgaWYgKGVyKSB7XG4gICAgICAgICAgaWYgKChlci5jb2RlID09PSBcIkVCVVNZXCIgfHwgZXIuY29kZSA9PT0gXCJFTk9URU1QVFlcIiB8fCBlci5jb2RlID09PSBcIkVQRVJNXCIpICYmXG4gICAgICAgICAgICAgIGJ1c3lUcmllcyA8IG9wdGlvbnMubWF4QnVzeVRyaWVzKSB7XG4gICAgICAgICAgICBidXN5VHJpZXMgKytcbiAgICAgICAgICAgIHZhciB0aW1lID0gYnVzeVRyaWVzICogMTAwXG4gICAgICAgICAgICAvLyB0cnkgYWdhaW4sIHdpdGggdGhlIHNhbWUgZXhhY3QgY2FsbGJhY2sgYXMgdGhpcyBvbmUuXG4gICAgICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHJpbXJhZl8ocCwgb3B0aW9ucywgQ0IpXG4gICAgICAgICAgICB9LCB0aW1lKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHRoaXMgb25lIHdvbid0IGhhcHBlbiBpZiBncmFjZWZ1bC1mcyBpcyB1c2VkLlxuICAgICAgICAgIGlmIChlci5jb2RlID09PSBcIkVNRklMRVwiICYmIHRpbWVvdXQgPCBvcHRpb25zLmVtZmlsZVdhaXQpIHtcbiAgICAgICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgcmltcmFmXyhwLCBvcHRpb25zLCBDQilcbiAgICAgICAgICAgIH0sIHRpbWVvdXQgKyspXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gYWxyZWFkeSBnb25lXG4gICAgICAgICAgaWYgKGVyLmNvZGUgPT09IFwiRU5PRU5UXCIpIGVyID0gbnVsbFxuICAgICAgICB9XG5cbiAgICAgICAgdGltZW91dCA9IDBcbiAgICAgICAgbmV4dChlcilcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxufVxuXG4vLyBUd28gcG9zc2libGUgc3RyYXRlZ2llcy5cbi8vIDEuIEFzc3VtZSBpdCdzIGEgZmlsZS4gIHVubGluayBpdCwgdGhlbiBkbyB0aGUgZGlyIHN0dWZmIG9uIEVQRVJNIG9yIEVJU0RJUlxuLy8gMi4gQXNzdW1lIGl0J3MgYSBkaXJlY3RvcnkuICByZWFkZGlyLCB0aGVuIGRvIHRoZSBmaWxlIHN0dWZmIG9uIEVOT1RESVJcbi8vXG4vLyBCb3RoIHJlc3VsdCBpbiBhbiBleHRyYSBzeXNjYWxsIHdoZW4geW91IGd1ZXNzIHdyb25nLiAgSG93ZXZlciwgdGhlcmVcbi8vIGFyZSBsaWtlbHkgZmFyIG1vcmUgbm9ybWFsIGZpbGVzIGluIHRoZSB3b3JsZCB0aGFuIGRpcmVjdG9yaWVzLiAgVGhpc1xuLy8gaXMgYmFzZWQgb24gdGhlIGFzc3VtcHRpb24gdGhhdCBhIHRoZSBhdmVyYWdlIG51bWJlciBvZiBmaWxlcyBwZXJcbi8vIGRpcmVjdG9yeSBpcyA+PSAxLlxuLy9cbi8vIElmIGFueW9uZSBldmVyIGNvbXBsYWlucyBhYm91dCB0aGlzLCB0aGVuIEkgZ3Vlc3MgdGhlIHN0cmF0ZWd5IGNvdWxkXG4vLyBiZSBtYWRlIGNvbmZpZ3VyYWJsZSBzb21laG93LiAgQnV0IHVudGlsIHRoZW4sIFlBR05JLlxuZnVuY3Rpb24gcmltcmFmXyAocCwgb3B0aW9ucywgY2IpIHtcbiAgYXNzZXJ0KHApXG4gIGFzc2VydChvcHRpb25zKVxuICBhc3NlcnQodHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKVxuXG4gIC8vIHN1bm9zIGxldHMgdGhlIHJvb3QgdXNlciB1bmxpbmsgZGlyZWN0b3JpZXMsIHdoaWNoIGlzLi4uIHdlaXJkLlxuICAvLyBzbyB3ZSBoYXZlIHRvIGxzdGF0IGhlcmUgYW5kIG1ha2Ugc3VyZSBpdCdzIG5vdCBhIGRpci5cbiAgb3B0aW9ucy5sc3RhdChwLCBmdW5jdGlvbiAoZXIsIHN0KSB7XG4gICAgaWYgKGVyICYmIGVyLmNvZGUgPT09IFwiRU5PRU5UXCIpXG4gICAgICByZXR1cm4gY2IobnVsbClcblxuICAgIC8vIFdpbmRvd3MgY2FuIEVQRVJNIG9uIHN0YXQuICBMaWZlIGlzIHN1ZmZlcmluZy5cbiAgICBpZiAoZXIgJiYgZXIuY29kZSA9PT0gXCJFUEVSTVwiICYmIGlzV2luZG93cylcbiAgICAgIGZpeFdpbkVQRVJNKHAsIG9wdGlvbnMsIGVyLCBjYilcblxuICAgIGlmIChzdCAmJiBzdC5pc0RpcmVjdG9yeSgpKVxuICAgICAgcmV0dXJuIHJtZGlyKHAsIG9wdGlvbnMsIGVyLCBjYilcblxuICAgIG9wdGlvbnMudW5saW5rKHAsIGZ1bmN0aW9uIChlcikge1xuICAgICAgaWYgKGVyKSB7XG4gICAgICAgIGlmIChlci5jb2RlID09PSBcIkVOT0VOVFwiKVxuICAgICAgICAgIHJldHVybiBjYihudWxsKVxuICAgICAgICBpZiAoZXIuY29kZSA9PT0gXCJFUEVSTVwiKVxuICAgICAgICAgIHJldHVybiAoaXNXaW5kb3dzKVxuICAgICAgICAgICAgPyBmaXhXaW5FUEVSTShwLCBvcHRpb25zLCBlciwgY2IpXG4gICAgICAgICAgICA6IHJtZGlyKHAsIG9wdGlvbnMsIGVyLCBjYilcbiAgICAgICAgaWYgKGVyLmNvZGUgPT09IFwiRUlTRElSXCIpXG4gICAgICAgICAgcmV0dXJuIHJtZGlyKHAsIG9wdGlvbnMsIGVyLCBjYilcbiAgICAgIH1cbiAgICAgIHJldHVybiBjYihlcilcbiAgICB9KVxuICB9KVxufVxuXG5mdW5jdGlvbiBmaXhXaW5FUEVSTSAocCwgb3B0aW9ucywgZXIsIGNiKSB7XG4gIGFzc2VydChwKVxuICBhc3NlcnQob3B0aW9ucylcbiAgYXNzZXJ0KHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJylcbiAgaWYgKGVyKVxuICAgIGFzc2VydChlciBpbnN0YW5jZW9mIEVycm9yKVxuXG4gIG9wdGlvbnMuY2htb2QocCwgXzA2NjYsIGZ1bmN0aW9uIChlcjIpIHtcbiAgICBpZiAoZXIyKVxuICAgICAgY2IoZXIyLmNvZGUgPT09IFwiRU5PRU5UXCIgPyBudWxsIDogZXIpXG4gICAgZWxzZVxuICAgICAgb3B0aW9ucy5zdGF0KHAsIGZ1bmN0aW9uKGVyMywgc3RhdHMpIHtcbiAgICAgICAgaWYgKGVyMylcbiAgICAgICAgICBjYihlcjMuY29kZSA9PT0gXCJFTk9FTlRcIiA/IG51bGwgOiBlcilcbiAgICAgICAgZWxzZSBpZiAoc3RhdHMuaXNEaXJlY3RvcnkoKSlcbiAgICAgICAgICBybWRpcihwLCBvcHRpb25zLCBlciwgY2IpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBvcHRpb25zLnVubGluayhwLCBjYilcbiAgICAgIH0pXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGZpeFdpbkVQRVJNU3luYyAocCwgb3B0aW9ucywgZXIpIHtcbiAgYXNzZXJ0KHApXG4gIGFzc2VydChvcHRpb25zKVxuICBpZiAoZXIpXG4gICAgYXNzZXJ0KGVyIGluc3RhbmNlb2YgRXJyb3IpXG5cbiAgdHJ5IHtcbiAgICBvcHRpb25zLmNobW9kU3luYyhwLCBfMDY2NilcbiAgfSBjYXRjaCAoZXIyKSB7XG4gICAgaWYgKGVyMi5jb2RlID09PSBcIkVOT0VOVFwiKVxuICAgICAgcmV0dXJuXG4gICAgZWxzZVxuICAgICAgdGhyb3cgZXJcbiAgfVxuXG4gIHRyeSB7XG4gICAgdmFyIHN0YXRzID0gb3B0aW9ucy5zdGF0U3luYyhwKVxuICB9IGNhdGNoIChlcjMpIHtcbiAgICBpZiAoZXIzLmNvZGUgPT09IFwiRU5PRU5UXCIpXG4gICAgICByZXR1cm5cbiAgICBlbHNlXG4gICAgICB0aHJvdyBlclxuICB9XG5cbiAgaWYgKHN0YXRzLmlzRGlyZWN0b3J5KCkpXG4gICAgcm1kaXJTeW5jKHAsIG9wdGlvbnMsIGVyKVxuICBlbHNlXG4gICAgb3B0aW9ucy51bmxpbmtTeW5jKHApXG59XG5cbmZ1bmN0aW9uIHJtZGlyIChwLCBvcHRpb25zLCBvcmlnaW5hbEVyLCBjYikge1xuICBhc3NlcnQocClcbiAgYXNzZXJ0KG9wdGlvbnMpXG4gIGlmIChvcmlnaW5hbEVyKVxuICAgIGFzc2VydChvcmlnaW5hbEVyIGluc3RhbmNlb2YgRXJyb3IpXG4gIGFzc2VydCh0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpXG5cbiAgLy8gdHJ5IHRvIHJtZGlyIGZpcnN0LCBhbmQgb25seSByZWFkZGlyIG9uIEVOT1RFTVBUWSBvciBFRVhJU1QgKFN1bk9TKVxuICAvLyBpZiB3ZSBndWVzc2VkIHdyb25nLCBhbmQgaXQncyBub3QgYSBkaXJlY3RvcnksIHRoZW5cbiAgLy8gcmFpc2UgdGhlIG9yaWdpbmFsIGVycm9yLlxuICBvcHRpb25zLnJtZGlyKHAsIGZ1bmN0aW9uIChlcikge1xuICAgIGlmIChlciAmJiAoZXIuY29kZSA9PT0gXCJFTk9URU1QVFlcIiB8fCBlci5jb2RlID09PSBcIkVFWElTVFwiIHx8IGVyLmNvZGUgPT09IFwiRVBFUk1cIikpXG4gICAgICBybWtpZHMocCwgb3B0aW9ucywgY2IpXG4gICAgZWxzZSBpZiAoZXIgJiYgZXIuY29kZSA9PT0gXCJFTk9URElSXCIpXG4gICAgICBjYihvcmlnaW5hbEVyKVxuICAgIGVsc2VcbiAgICAgIGNiKGVyKVxuICB9KVxufVxuXG5mdW5jdGlvbiBybWtpZHMocCwgb3B0aW9ucywgY2IpIHtcbiAgYXNzZXJ0KHApXG4gIGFzc2VydChvcHRpb25zKVxuICBhc3NlcnQodHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKVxuXG4gIG9wdGlvbnMucmVhZGRpcihwLCBmdW5jdGlvbiAoZXIsIGZpbGVzKSB7XG4gICAgaWYgKGVyKVxuICAgICAgcmV0dXJuIGNiKGVyKVxuICAgIHZhciBuID0gZmlsZXMubGVuZ3RoXG4gICAgaWYgKG4gPT09IDApXG4gICAgICByZXR1cm4gb3B0aW9ucy5ybWRpcihwLCBjYilcbiAgICB2YXIgZXJyU3RhdGVcbiAgICBmaWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChmKSB7XG4gICAgICByaW1yYWYocGF0aC5qb2luKHAsIGYpLCBvcHRpb25zLCBmdW5jdGlvbiAoZXIpIHtcbiAgICAgICAgaWYgKGVyclN0YXRlKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICBpZiAoZXIpXG4gICAgICAgICAgcmV0dXJuIGNiKGVyclN0YXRlID0gZXIpXG4gICAgICAgIGlmICgtLW4gPT09IDApXG4gICAgICAgICAgb3B0aW9ucy5ybWRpcihwLCBjYilcbiAgICAgIH0pXG4gICAgfSlcbiAgfSlcbn1cblxuLy8gdGhpcyBsb29rcyBzaW1wbGVyLCBhbmQgaXMgc3RyaWN0bHkgKmZhc3RlciosIGJ1dCB3aWxsXG4vLyB0aWUgdXAgdGhlIEphdmFTY3JpcHQgdGhyZWFkIGFuZCBmYWlsIG9uIGV4Y2Vzc2l2ZWx5XG4vLyBkZWVwIGRpcmVjdG9yeSB0cmVlcy5cbmZ1bmN0aW9uIHJpbXJhZlN5bmMgKHAsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgZGVmYXVsdHMob3B0aW9ucylcblxuICBhc3NlcnQocCwgJ3JpbXJhZjogbWlzc2luZyBwYXRoJylcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBwLCAnc3RyaW5nJywgJ3JpbXJhZjogcGF0aCBzaG91bGQgYmUgYSBzdHJpbmcnKVxuICBhc3NlcnQob3B0aW9ucywgJ3JpbXJhZjogbWlzc2luZyBvcHRpb25zJylcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBvcHRpb25zLCAnb2JqZWN0JywgJ3JpbXJhZjogb3B0aW9ucyBzaG91bGQgYmUgb2JqZWN0JylcblxuICB2YXIgcmVzdWx0c1xuXG4gIGlmIChvcHRpb25zLmRpc2FibGVHbG9iIHx8ICFnbG9iLmhhc01hZ2ljKHApKSB7XG4gICAgcmVzdWx0cyA9IFtwXVxuICB9IGVsc2Uge1xuICAgIHRyeSB7XG4gICAgICBvcHRpb25zLmxzdGF0U3luYyhwKVxuICAgICAgcmVzdWx0cyA9IFtwXVxuICAgIH0gY2F0Y2ggKGVyKSB7XG4gICAgICByZXN1bHRzID0gZ2xvYi5zeW5jKHAsIG9wdGlvbnMuZ2xvYilcbiAgICB9XG4gIH1cblxuICBpZiAoIXJlc3VsdHMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcmVzdWx0cy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBwID0gcmVzdWx0c1tpXVxuXG4gICAgdHJ5IHtcbiAgICAgIHZhciBzdCA9IG9wdGlvbnMubHN0YXRTeW5jKHApXG4gICAgfSBjYXRjaCAoZXIpIHtcbiAgICAgIGlmIChlci5jb2RlID09PSBcIkVOT0VOVFwiKVxuICAgICAgICByZXR1cm5cblxuICAgICAgLy8gV2luZG93cyBjYW4gRVBFUk0gb24gc3RhdC4gIExpZmUgaXMgc3VmZmVyaW5nLlxuICAgICAgaWYgKGVyLmNvZGUgPT09IFwiRVBFUk1cIiAmJiBpc1dpbmRvd3MpXG4gICAgICAgIGZpeFdpbkVQRVJNU3luYyhwLCBvcHRpb25zLCBlcilcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgLy8gc3Vub3MgbGV0cyB0aGUgcm9vdCB1c2VyIHVubGluayBkaXJlY3Rvcmllcywgd2hpY2ggaXMuLi4gd2VpcmQuXG4gICAgICBpZiAoc3QgJiYgc3QuaXNEaXJlY3RvcnkoKSlcbiAgICAgICAgcm1kaXJTeW5jKHAsIG9wdGlvbnMsIG51bGwpXG4gICAgICBlbHNlXG4gICAgICAgIG9wdGlvbnMudW5saW5rU3luYyhwKVxuICAgIH0gY2F0Y2ggKGVyKSB7XG4gICAgICBpZiAoZXIuY29kZSA9PT0gXCJFTk9FTlRcIilcbiAgICAgICAgcmV0dXJuXG4gICAgICBpZiAoZXIuY29kZSA9PT0gXCJFUEVSTVwiKVxuICAgICAgICByZXR1cm4gaXNXaW5kb3dzID8gZml4V2luRVBFUk1TeW5jKHAsIG9wdGlvbnMsIGVyKSA6IHJtZGlyU3luYyhwLCBvcHRpb25zLCBlcilcbiAgICAgIGlmIChlci5jb2RlICE9PSBcIkVJU0RJUlwiKVxuICAgICAgICB0aHJvdyBlclxuXG4gICAgICBybWRpclN5bmMocCwgb3B0aW9ucywgZXIpXG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHJtZGlyU3luYyAocCwgb3B0aW9ucywgb3JpZ2luYWxFcikge1xuICBhc3NlcnQocClcbiAgYXNzZXJ0KG9wdGlvbnMpXG4gIGlmIChvcmlnaW5hbEVyKVxuICAgIGFzc2VydChvcmlnaW5hbEVyIGluc3RhbmNlb2YgRXJyb3IpXG5cbiAgdHJ5IHtcbiAgICBvcHRpb25zLnJtZGlyU3luYyhwKVxuICB9IGNhdGNoIChlcikge1xuICAgIGlmIChlci5jb2RlID09PSBcIkVOT0VOVFwiKVxuICAgICAgcmV0dXJuXG4gICAgaWYgKGVyLmNvZGUgPT09IFwiRU5PVERJUlwiKVxuICAgICAgdGhyb3cgb3JpZ2luYWxFclxuICAgIGlmIChlci5jb2RlID09PSBcIkVOT1RFTVBUWVwiIHx8IGVyLmNvZGUgPT09IFwiRUVYSVNUXCIgfHwgZXIuY29kZSA9PT0gXCJFUEVSTVwiKVxuICAgICAgcm1raWRzU3luYyhwLCBvcHRpb25zKVxuICB9XG59XG5cbmZ1bmN0aW9uIHJta2lkc1N5bmMgKHAsIG9wdGlvbnMpIHtcbiAgYXNzZXJ0KHApXG4gIGFzc2VydChvcHRpb25zKVxuICBvcHRpb25zLnJlYWRkaXJTeW5jKHApLmZvckVhY2goZnVuY3Rpb24gKGYpIHtcbiAgICByaW1yYWZTeW5jKHBhdGguam9pbihwLCBmKSwgb3B0aW9ucylcbiAgfSlcblxuICAvLyBXZSBvbmx5IGVuZCB1cCBoZXJlIG9uY2Ugd2UgZ290IEVOT1RFTVBUWSBhdCBsZWFzdCBvbmNlLCBhbmRcbiAgLy8gYXQgdGhpcyBwb2ludCwgd2UgYXJlIGd1YXJhbnRlZWQgdG8gaGF2ZSByZW1vdmVkIGFsbCB0aGUga2lkcy5cbiAgLy8gU28sIHdlIGtub3cgdGhhdCBpdCB3b24ndCBiZSBFTk9FTlQgb3IgRU5PVERJUiBvciBhbnl0aGluZyBlbHNlLlxuICAvLyB0cnkgcmVhbGx5IGhhcmQgdG8gZGVsZXRlIHN0dWZmIG9uIHdpbmRvd3MsIGJlY2F1c2UgaXQgaGFzIGFcbiAgLy8gUFJPRk9VTkRMWSBhbm5veWluZyBoYWJpdCBvZiBub3QgY2xvc2luZyBoYW5kbGVzIHByb21wdGx5IHdoZW5cbiAgLy8gZmlsZXMgYXJlIGRlbGV0ZWQsIHJlc3VsdGluZyBpbiBzcHVyaW91cyBFTk9URU1QVFkgZXJyb3JzLlxuICB2YXIgcmV0cmllcyA9IGlzV2luZG93cyA/IDEwMCA6IDFcbiAgdmFyIGkgPSAwXG4gIGRvIHtcbiAgICB2YXIgdGhyZXcgPSB0cnVlXG4gICAgdHJ5IHtcbiAgICAgIHZhciByZXQgPSBvcHRpb25zLnJtZGlyU3luYyhwLCBvcHRpb25zKVxuICAgICAgdGhyZXcgPSBmYWxzZVxuICAgICAgcmV0dXJuIHJldFxuICAgIH0gZmluYWxseSB7XG4gICAgICBpZiAoKytpIDwgcmV0cmllcyAmJiB0aHJldylcbiAgICAgICAgY29udGludWVcbiAgICB9XG4gIH0gd2hpbGUgKHRydWUpXG59XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCwgdW5kZWZpbmVkKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICBpZiAoZ2xvYmFsLnNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIG5leHRIYW5kbGUgPSAxOyAvLyBTcGVjIHNheXMgZ3JlYXRlciB0aGFuIHplcm9cbiAgICB2YXIgdGFza3NCeUhhbmRsZSA9IHt9O1xuICAgIHZhciBjdXJyZW50bHlSdW5uaW5nQVRhc2sgPSBmYWxzZTtcbiAgICB2YXIgZG9jID0gZ2xvYmFsLmRvY3VtZW50O1xuICAgIHZhciByZWdpc3RlckltbWVkaWF0ZTtcblxuICAgIGZ1bmN0aW9uIHNldEltbWVkaWF0ZShjYWxsYmFjaykge1xuICAgICAgLy8gQ2FsbGJhY2sgY2FuIGVpdGhlciBiZSBhIGZ1bmN0aW9uIG9yIGEgc3RyaW5nXG4gICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBuZXcgRnVuY3Rpb24oXCJcIiArIGNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIC8vIENvcHkgZnVuY3Rpb24gYXJndW1lbnRzXG4gICAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBhcmdzW2ldID0gYXJndW1lbnRzW2kgKyAxXTtcbiAgICAgIH1cbiAgICAgIC8vIFN0b3JlIGFuZCByZWdpc3RlciB0aGUgdGFza1xuICAgICAgdmFyIHRhc2sgPSB7IGNhbGxiYWNrOiBjYWxsYmFjaywgYXJnczogYXJncyB9O1xuICAgICAgdGFza3NCeUhhbmRsZVtuZXh0SGFuZGxlXSA9IHRhc2s7XG4gICAgICByZWdpc3RlckltbWVkaWF0ZShuZXh0SGFuZGxlKTtcbiAgICAgIHJldHVybiBuZXh0SGFuZGxlKys7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYXJJbW1lZGlhdGUoaGFuZGxlKSB7XG4gICAgICAgIGRlbGV0ZSB0YXNrc0J5SGFuZGxlW2hhbmRsZV07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcnVuKHRhc2spIHtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gdGFzay5jYWxsYmFjaztcbiAgICAgICAgdmFyIGFyZ3MgPSB0YXNrLmFyZ3M7XG4gICAgICAgIHN3aXRjaCAoYXJncy5sZW5ndGgpIHtcbiAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICBjYWxsYmFjayhhcmdzWzBdKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICBjYWxsYmFjayhhcmdzWzBdLCBhcmdzWzFdKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICBjYWxsYmFjayhhcmdzWzBdLCBhcmdzWzFdLCBhcmdzWzJdKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkodW5kZWZpbmVkLCBhcmdzKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcnVuSWZQcmVzZW50KGhhbmRsZSkge1xuICAgICAgICAvLyBGcm9tIHRoZSBzcGVjOiBcIldhaXQgdW50aWwgYW55IGludm9jYXRpb25zIG9mIHRoaXMgYWxnb3JpdGhtIHN0YXJ0ZWQgYmVmb3JlIHRoaXMgb25lIGhhdmUgY29tcGxldGVkLlwiXG4gICAgICAgIC8vIFNvIGlmIHdlJ3JlIGN1cnJlbnRseSBydW5uaW5nIGEgdGFzaywgd2UnbGwgbmVlZCB0byBkZWxheSB0aGlzIGludm9jYXRpb24uXG4gICAgICAgIGlmIChjdXJyZW50bHlSdW5uaW5nQVRhc2spIHtcbiAgICAgICAgICAgIC8vIERlbGF5IGJ5IGRvaW5nIGEgc2V0VGltZW91dC4gc2V0SW1tZWRpYXRlIHdhcyB0cmllZCBpbnN0ZWFkLCBidXQgaW4gRmlyZWZveCA3IGl0IGdlbmVyYXRlZCBhXG4gICAgICAgICAgICAvLyBcInRvbyBtdWNoIHJlY3Vyc2lvblwiIGVycm9yLlxuICAgICAgICAgICAgc2V0VGltZW91dChydW5JZlByZXNlbnQsIDAsIGhhbmRsZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgdGFzayA9IHRhc2tzQnlIYW5kbGVbaGFuZGxlXTtcbiAgICAgICAgICAgIGlmICh0YXNrKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudGx5UnVubmluZ0FUYXNrID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBydW4odGFzayk7XG4gICAgICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJJbW1lZGlhdGUoaGFuZGxlKTtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudGx5UnVubmluZ0FUYXNrID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5zdGFsbE5leHRUaWNrSW1wbGVtZW50YXRpb24oKSB7XG4gICAgICAgIHJlZ2lzdGVySW1tZWRpYXRlID0gZnVuY3Rpb24oaGFuZGxlKSB7XG4gICAgICAgICAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uICgpIHsgcnVuSWZQcmVzZW50KGhhbmRsZSk7IH0pO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhblVzZVBvc3RNZXNzYWdlKCkge1xuICAgICAgICAvLyBUaGUgdGVzdCBhZ2FpbnN0IGBpbXBvcnRTY3JpcHRzYCBwcmV2ZW50cyB0aGlzIGltcGxlbWVudGF0aW9uIGZyb20gYmVpbmcgaW5zdGFsbGVkIGluc2lkZSBhIHdlYiB3b3JrZXIsXG4gICAgICAgIC8vIHdoZXJlIGBnbG9iYWwucG9zdE1lc3NhZ2VgIG1lYW5zIHNvbWV0aGluZyBjb21wbGV0ZWx5IGRpZmZlcmVudCBhbmQgY2FuJ3QgYmUgdXNlZCBmb3IgdGhpcyBwdXJwb3NlLlxuICAgICAgICBpZiAoZ2xvYmFsLnBvc3RNZXNzYWdlICYmICFnbG9iYWwuaW1wb3J0U2NyaXB0cykge1xuICAgICAgICAgICAgdmFyIHBvc3RNZXNzYWdlSXNBc3luY2hyb25vdXMgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIG9sZE9uTWVzc2FnZSA9IGdsb2JhbC5vbm1lc3NhZ2U7XG4gICAgICAgICAgICBnbG9iYWwub25tZXNzYWdlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcG9zdE1lc3NhZ2VJc0FzeW5jaHJvbm91cyA9IGZhbHNlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGdsb2JhbC5wb3N0TWVzc2FnZShcIlwiLCBcIipcIik7XG4gICAgICAgICAgICBnbG9iYWwub25tZXNzYWdlID0gb2xkT25NZXNzYWdlO1xuICAgICAgICAgICAgcmV0dXJuIHBvc3RNZXNzYWdlSXNBc3luY2hyb25vdXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnN0YWxsUG9zdE1lc3NhZ2VJbXBsZW1lbnRhdGlvbigpIHtcbiAgICAgICAgLy8gSW5zdGFsbHMgYW4gZXZlbnQgaGFuZGxlciBvbiBgZ2xvYmFsYCBmb3IgdGhlIGBtZXNzYWdlYCBldmVudDogc2VlXG4gICAgICAgIC8vICogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vRE9NL3dpbmRvdy5wb3N0TWVzc2FnZVxuICAgICAgICAvLyAqIGh0dHA6Ly93d3cud2hhdHdnLm9yZy9zcGVjcy93ZWItYXBwcy9jdXJyZW50LXdvcmsvbXVsdGlwYWdlL2NvbW1zLmh0bWwjY3Jvc3NEb2N1bWVudE1lc3NhZ2VzXG5cbiAgICAgICAgdmFyIG1lc3NhZ2VQcmVmaXggPSBcInNldEltbWVkaWF0ZSRcIiArIE1hdGgucmFuZG9tKCkgKyBcIiRcIjtcbiAgICAgICAgdmFyIG9uR2xvYmFsTWVzc2FnZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBpZiAoZXZlbnQuc291cmNlID09PSBnbG9iYWwgJiZcbiAgICAgICAgICAgICAgICB0eXBlb2YgZXZlbnQuZGF0YSA9PT0gXCJzdHJpbmdcIiAmJlxuICAgICAgICAgICAgICAgIGV2ZW50LmRhdGEuaW5kZXhPZihtZXNzYWdlUHJlZml4KSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJ1bklmUHJlc2VudCgrZXZlbnQuZGF0YS5zbGljZShtZXNzYWdlUHJlZml4Lmxlbmd0aCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChnbG9iYWwuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAgICAgZ2xvYmFsLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIG9uR2xvYmFsTWVzc2FnZSwgZmFsc2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZ2xvYmFsLmF0dGFjaEV2ZW50KFwib25tZXNzYWdlXCIsIG9uR2xvYmFsTWVzc2FnZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZWdpc3RlckltbWVkaWF0ZSA9IGZ1bmN0aW9uKGhhbmRsZSkge1xuICAgICAgICAgICAgZ2xvYmFsLnBvc3RNZXNzYWdlKG1lc3NhZ2VQcmVmaXggKyBoYW5kbGUsIFwiKlwiKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnN0YWxsTWVzc2FnZUNoYW5uZWxJbXBsZW1lbnRhdGlvbigpIHtcbiAgICAgICAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICAgICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgdmFyIGhhbmRsZSA9IGV2ZW50LmRhdGE7XG4gICAgICAgICAgICBydW5JZlByZXNlbnQoaGFuZGxlKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZWdpc3RlckltbWVkaWF0ZSA9IGZ1bmN0aW9uKGhhbmRsZSkge1xuICAgICAgICAgICAgY2hhbm5lbC5wb3J0Mi5wb3N0TWVzc2FnZShoYW5kbGUpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc3RhbGxSZWFkeVN0YXRlQ2hhbmdlSW1wbGVtZW50YXRpb24oKSB7XG4gICAgICAgIHZhciBodG1sID0gZG9jLmRvY3VtZW50RWxlbWVudDtcbiAgICAgICAgcmVnaXN0ZXJJbW1lZGlhdGUgPSBmdW5jdGlvbihoYW5kbGUpIHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBhIDxzY3JpcHQ+IGVsZW1lbnQ7IGl0cyByZWFkeXN0YXRlY2hhbmdlIGV2ZW50IHdpbGwgYmUgZmlyZWQgYXN5bmNocm9ub3VzbHkgb25jZSBpdCBpcyBpbnNlcnRlZFxuICAgICAgICAgICAgLy8gaW50byB0aGUgZG9jdW1lbnQuIERvIHNvLCB0aHVzIHF1ZXVpbmcgdXAgdGhlIHRhc2suIFJlbWVtYmVyIHRvIGNsZWFuIHVwIG9uY2UgaXQncyBiZWVuIGNhbGxlZC5cbiAgICAgICAgICAgIHZhciBzY3JpcHQgPSBkb2MuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKTtcbiAgICAgICAgICAgIHNjcmlwdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcnVuSWZQcmVzZW50KGhhbmRsZSk7XG4gICAgICAgICAgICAgICAgc2NyaXB0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgaHRtbC5yZW1vdmVDaGlsZChzY3JpcHQpO1xuICAgICAgICAgICAgICAgIHNjcmlwdCA9IG51bGw7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaHRtbC5hcHBlbmRDaGlsZChzY3JpcHQpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc3RhbGxTZXRUaW1lb3V0SW1wbGVtZW50YXRpb24oKSB7XG4gICAgICAgIHJlZ2lzdGVySW1tZWRpYXRlID0gZnVuY3Rpb24oaGFuZGxlKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KHJ1bklmUHJlc2VudCwgMCwgaGFuZGxlKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBJZiBzdXBwb3J0ZWQsIHdlIHNob3VsZCBhdHRhY2ggdG8gdGhlIHByb3RvdHlwZSBvZiBnbG9iYWwsIHNpbmNlIHRoYXQgaXMgd2hlcmUgc2V0VGltZW91dCBldCBhbC4gbGl2ZS5cbiAgICB2YXIgYXR0YWNoVG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YgJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKGdsb2JhbCk7XG4gICAgYXR0YWNoVG8gPSBhdHRhY2hUbyAmJiBhdHRhY2hUby5zZXRUaW1lb3V0ID8gYXR0YWNoVG8gOiBnbG9iYWw7XG5cbiAgICAvLyBEb24ndCBnZXQgZm9vbGVkIGJ5IGUuZy4gYnJvd3NlcmlmeSBlbnZpcm9ubWVudHMuXG4gICAgaWYgKHt9LnRvU3RyaW5nLmNhbGwoZ2xvYmFsLnByb2Nlc3MpID09PSBcIltvYmplY3QgcHJvY2Vzc11cIikge1xuICAgICAgICAvLyBGb3IgTm9kZS5qcyBiZWZvcmUgMC45XG4gICAgICAgIGluc3RhbGxOZXh0VGlja0ltcGxlbWVudGF0aW9uKCk7XG5cbiAgICB9IGVsc2UgaWYgKGNhblVzZVBvc3RNZXNzYWdlKCkpIHtcbiAgICAgICAgLy8gRm9yIG5vbi1JRTEwIG1vZGVybiBicm93c2Vyc1xuICAgICAgICBpbnN0YWxsUG9zdE1lc3NhZ2VJbXBsZW1lbnRhdGlvbigpO1xuXG4gICAgfSBlbHNlIGlmIChnbG9iYWwuTWVzc2FnZUNoYW5uZWwpIHtcbiAgICAgICAgLy8gRm9yIHdlYiB3b3JrZXJzLCB3aGVyZSBzdXBwb3J0ZWRcbiAgICAgICAgaW5zdGFsbE1lc3NhZ2VDaGFubmVsSW1wbGVtZW50YXRpb24oKTtcblxuICAgIH0gZWxzZSBpZiAoZG9jICYmIFwib25yZWFkeXN0YXRlY2hhbmdlXCIgaW4gZG9jLmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIikpIHtcbiAgICAgICAgLy8gRm9yIElFIDbigJM4XG4gICAgICAgIGluc3RhbGxSZWFkeVN0YXRlQ2hhbmdlSW1wbGVtZW50YXRpb24oKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEZvciBvbGRlciBicm93c2Vyc1xuICAgICAgICBpbnN0YWxsU2V0VGltZW91dEltcGxlbWVudGF0aW9uKCk7XG4gICAgfVxuXG4gICAgYXR0YWNoVG8uc2V0SW1tZWRpYXRlID0gc2V0SW1tZWRpYXRlO1xuICAgIGF0dGFjaFRvLmNsZWFySW1tZWRpYXRlID0gY2xlYXJJbW1lZGlhdGU7XG59KHR5cGVvZiBzZWxmID09PSBcInVuZGVmaW5lZFwiID8gdHlwZW9mIGdsb2JhbCA9PT0gXCJ1bmRlZmluZWRcIiA/IHRoaXMgOiBnbG9iYWwgOiBzZWxmKSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gU2xpY2VTdHJlYW07XG5cbnZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKCdyZWFkYWJsZS1zdHJlYW0vdHJhbnNmb3JtJyk7XG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwidXRpbFwiKS5pbmhlcml0cztcblxuaW5oZXJpdHMoU2xpY2VTdHJlYW0sIFRyYW5zZm9ybSk7XG5cbmZ1bmN0aW9uIFNsaWNlU3RyZWFtKG9wdHMsIHNsaWNlRm4pIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFNsaWNlU3RyZWFtKSkge1xuICAgIHJldHVybiBuZXcgU2xpY2VTdHJlYW0ob3B0cywgc2xpY2VGbik7XG4gIH1cblxuICB0aGlzLl9vcHRzID0gb3B0cztcbiAgdGhpcy5fYWNjdW11bGF0ZWRMZW5ndGggPSAwO1xuICB0aGlzLnNsaWNlRm4gPSBzbGljZUZuO1xuXG4gIFRyYW5zZm9ybS5jYWxsKHRoaXMpO1xufVxuXG5TbGljZVN0cmVhbS5wcm90b3R5cGUuX3RyYW5zZm9ybSA9IGZ1bmN0aW9uIChjaHVuaywgZW5jb2RpbmcsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX2FjY3VtdWxhdGVkTGVuZ3RoICs9IGNodW5rLmxlbmd0aDtcblxuICBpZiAodGhpcy5fYWNjdW11bGF0ZWRMZW5ndGggPj0gdGhpcy5fb3B0cy5sZW5ndGgpIHtcbiAgICAvL3RvZG8gaGFuZGxlIG1vcmUgdGhhbiBvbmUgc2xpY2UgaW4gYSBzdHJlYW1cbiAgICB2YXIgb2Zmc2V0ID0gY2h1bmsubGVuZ3RoIC0gKHRoaXMuX2FjY3VtdWxhdGVkTGVuZ3RoIC0gdGhpcy5fb3B0cy5sZW5ndGgpO1xuICAgIHRoaXMuc2xpY2VGbihjaHVuay5zbGljZSgwLCBvZmZzZXQpLCB0cnVlLCBjaHVuay5zbGljZShvZmZzZXQpKTtcbiAgICBjYWxsYmFjaygpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuc2xpY2VGbihjaHVuayk7XG4gICAgY2FsbGJhY2soKTtcbiAgfVxufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyO1xuXG52YXIgaXNCdWZmZXJFbmNvZGluZyA9IEJ1ZmZlci5pc0VuY29kaW5nXG4gIHx8IGZ1bmN0aW9uKGVuY29kaW5nKSB7XG4gICAgICAgc3dpdGNoIChlbmNvZGluZyAmJiBlbmNvZGluZy50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICAgICBjYXNlICdoZXgnOiBjYXNlICd1dGY4JzogY2FzZSAndXRmLTgnOiBjYXNlICdhc2NpaSc6IGNhc2UgJ2JpbmFyeSc6IGNhc2UgJ2Jhc2U2NCc6IGNhc2UgJ3VjczInOiBjYXNlICd1Y3MtMic6IGNhc2UgJ3V0ZjE2bGUnOiBjYXNlICd1dGYtMTZsZSc6IGNhc2UgJ3Jhdyc6IHJldHVybiB0cnVlO1xuICAgICAgICAgZGVmYXVsdDogcmV0dXJuIGZhbHNlO1xuICAgICAgIH1cbiAgICAgfVxuXG5cbmZ1bmN0aW9uIGFzc2VydEVuY29kaW5nKGVuY29kaW5nKSB7XG4gIGlmIChlbmNvZGluZyAmJiAhaXNCdWZmZXJFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZyk7XG4gIH1cbn1cblxuLy8gU3RyaW5nRGVjb2RlciBwcm92aWRlcyBhbiBpbnRlcmZhY2UgZm9yIGVmZmljaWVudGx5IHNwbGl0dGluZyBhIHNlcmllcyBvZlxuLy8gYnVmZmVycyBpbnRvIGEgc2VyaWVzIG9mIEpTIHN0cmluZ3Mgd2l0aG91dCBicmVha2luZyBhcGFydCBtdWx0aS1ieXRlXG4vLyBjaGFyYWN0ZXJzLiBDRVNVLTggaXMgaGFuZGxlZCBhcyBwYXJ0IG9mIHRoZSBVVEYtOCBlbmNvZGluZy5cbi8vXG4vLyBAVE9ETyBIYW5kbGluZyBhbGwgZW5jb2RpbmdzIGluc2lkZSBhIHNpbmdsZSBvYmplY3QgbWFrZXMgaXQgdmVyeSBkaWZmaWN1bHRcbi8vIHRvIHJlYXNvbiBhYm91dCB0aGlzIGNvZGUsIHNvIGl0IHNob3VsZCBiZSBzcGxpdCB1cCBpbiB0aGUgZnV0dXJlLlxuLy8gQFRPRE8gVGhlcmUgc2hvdWxkIGJlIGEgdXRmOC1zdHJpY3QgZW5jb2RpbmcgdGhhdCByZWplY3RzIGludmFsaWQgVVRGLTggY29kZVxuLy8gcG9pbnRzIGFzIHVzZWQgYnkgQ0VTVS04LlxudmFyIFN0cmluZ0RlY29kZXIgPSBleHBvcnRzLlN0cmluZ0RlY29kZXIgPSBmdW5jdGlvbihlbmNvZGluZykge1xuICB0aGlzLmVuY29kaW5nID0gKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bLV9dLywgJycpO1xuICBhc3NlcnRFbmNvZGluZyhlbmNvZGluZyk7XG4gIHN3aXRjaCAodGhpcy5lbmNvZGluZykge1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgLy8gQ0VTVS04IHJlcHJlc2VudHMgZWFjaCBvZiBTdXJyb2dhdGUgUGFpciBieSAzLWJ5dGVzXG4gICAgICB0aGlzLnN1cnJvZ2F0ZVNpemUgPSAzO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICAvLyBVVEYtMTYgcmVwcmVzZW50cyBlYWNoIG9mIFN1cnJvZ2F0ZSBQYWlyIGJ5IDItYnl0ZXNcbiAgICAgIHRoaXMuc3Vycm9nYXRlU2l6ZSA9IDI7XG4gICAgICB0aGlzLmRldGVjdEluY29tcGxldGVDaGFyID0gdXRmMTZEZXRlY3RJbmNvbXBsZXRlQ2hhcjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAvLyBCYXNlLTY0IHN0b3JlcyAzIGJ5dGVzIGluIDQgY2hhcnMsIGFuZCBwYWRzIHRoZSByZW1haW5kZXIuXG4gICAgICB0aGlzLnN1cnJvZ2F0ZVNpemUgPSAzO1xuICAgICAgdGhpcy5kZXRlY3RJbmNvbXBsZXRlQ2hhciA9IGJhc2U2NERldGVjdEluY29tcGxldGVDaGFyO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRoaXMud3JpdGUgPSBwYXNzVGhyb3VnaFdyaXRlO1xuICAgICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gRW5vdWdoIHNwYWNlIHRvIHN0b3JlIGFsbCBieXRlcyBvZiBhIHNpbmdsZSBjaGFyYWN0ZXIuIFVURi04IG5lZWRzIDRcbiAgLy8gYnl0ZXMsIGJ1dCBDRVNVLTggbWF5IHJlcXVpcmUgdXAgdG8gNiAoMyBieXRlcyBwZXIgc3Vycm9nYXRlKS5cbiAgdGhpcy5jaGFyQnVmZmVyID0gbmV3IEJ1ZmZlcig2KTtcbiAgLy8gTnVtYmVyIG9mIGJ5dGVzIHJlY2VpdmVkIGZvciB0aGUgY3VycmVudCBpbmNvbXBsZXRlIG11bHRpLWJ5dGUgY2hhcmFjdGVyLlxuICB0aGlzLmNoYXJSZWNlaXZlZCA9IDA7XG4gIC8vIE51bWJlciBvZiBieXRlcyBleHBlY3RlZCBmb3IgdGhlIGN1cnJlbnQgaW5jb21wbGV0ZSBtdWx0aS1ieXRlIGNoYXJhY3Rlci5cbiAgdGhpcy5jaGFyTGVuZ3RoID0gMDtcbn07XG5cblxuLy8gd3JpdGUgZGVjb2RlcyB0aGUgZ2l2ZW4gYnVmZmVyIGFuZCByZXR1cm5zIGl0IGFzIEpTIHN0cmluZyB0aGF0IGlzXG4vLyBndWFyYW50ZWVkIHRvIG5vdCBjb250YWluIGFueSBwYXJ0aWFsIG11bHRpLWJ5dGUgY2hhcmFjdGVycy4gQW55IHBhcnRpYWxcbi8vIGNoYXJhY3RlciBmb3VuZCBhdCB0aGUgZW5kIG9mIHRoZSBidWZmZXIgaXMgYnVmZmVyZWQgdXAsIGFuZCB3aWxsIGJlXG4vLyByZXR1cm5lZCB3aGVuIGNhbGxpbmcgd3JpdGUgYWdhaW4gd2l0aCB0aGUgcmVtYWluaW5nIGJ5dGVzLlxuLy9cbi8vIE5vdGU6IENvbnZlcnRpbmcgYSBCdWZmZXIgY29udGFpbmluZyBhbiBvcnBoYW4gc3Vycm9nYXRlIHRvIGEgU3RyaW5nXG4vLyBjdXJyZW50bHkgd29ya3MsIGJ1dCBjb252ZXJ0aW5nIGEgU3RyaW5nIHRvIGEgQnVmZmVyICh2aWEgYG5ldyBCdWZmZXJgLCBvclxuLy8gQnVmZmVyI3dyaXRlKSB3aWxsIHJlcGxhY2UgaW5jb21wbGV0ZSBzdXJyb2dhdGVzIHdpdGggdGhlIHVuaWNvZGVcbi8vIHJlcGxhY2VtZW50IGNoYXJhY3Rlci4gU2VlIGh0dHBzOi8vY29kZXJldmlldy5jaHJvbWl1bS5vcmcvMTIxMTczMDA5LyAuXG5TdHJpbmdEZWNvZGVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICB2YXIgY2hhclN0ciA9ICcnO1xuICAvLyBpZiBvdXIgbGFzdCB3cml0ZSBlbmRlZCB3aXRoIGFuIGluY29tcGxldGUgbXVsdGlieXRlIGNoYXJhY3RlclxuICB3aGlsZSAodGhpcy5jaGFyTGVuZ3RoKSB7XG4gICAgLy8gZGV0ZXJtaW5lIGhvdyBtYW55IHJlbWFpbmluZyBieXRlcyB0aGlzIGJ1ZmZlciBoYXMgdG8gb2ZmZXIgZm9yIHRoaXMgY2hhclxuICAgIHZhciBhdmFpbGFibGUgPSAoYnVmZmVyLmxlbmd0aCA+PSB0aGlzLmNoYXJMZW5ndGggLSB0aGlzLmNoYXJSZWNlaXZlZCkgP1xuICAgICAgICB0aGlzLmNoYXJMZW5ndGggLSB0aGlzLmNoYXJSZWNlaXZlZCA6XG4gICAgICAgIGJ1ZmZlci5sZW5ndGg7XG5cbiAgICAvLyBhZGQgdGhlIG5ldyBieXRlcyB0byB0aGUgY2hhciBidWZmZXJcbiAgICBidWZmZXIuY29weSh0aGlzLmNoYXJCdWZmZXIsIHRoaXMuY2hhclJlY2VpdmVkLCAwLCBhdmFpbGFibGUpO1xuICAgIHRoaXMuY2hhclJlY2VpdmVkICs9IGF2YWlsYWJsZTtcblxuICAgIGlmICh0aGlzLmNoYXJSZWNlaXZlZCA8IHRoaXMuY2hhckxlbmd0aCkge1xuICAgICAgLy8gc3RpbGwgbm90IGVub3VnaCBjaGFycyBpbiB0aGlzIGJ1ZmZlcj8gd2FpdCBmb3IgbW9yZSAuLi5cbiAgICAgIHJldHVybiAnJztcbiAgICB9XG5cbiAgICAvLyByZW1vdmUgYnl0ZXMgYmVsb25naW5nIHRvIHRoZSBjdXJyZW50IGNoYXJhY3RlciBmcm9tIHRoZSBidWZmZXJcbiAgICBidWZmZXIgPSBidWZmZXIuc2xpY2UoYXZhaWxhYmxlLCBidWZmZXIubGVuZ3RoKTtcblxuICAgIC8vIGdldCB0aGUgY2hhcmFjdGVyIHRoYXQgd2FzIHNwbGl0XG4gICAgY2hhclN0ciA9IHRoaXMuY2hhckJ1ZmZlci5zbGljZSgwLCB0aGlzLmNoYXJMZW5ndGgpLnRvU3RyaW5nKHRoaXMuZW5jb2RpbmcpO1xuXG4gICAgLy8gQ0VTVS04OiBsZWFkIHN1cnJvZ2F0ZSAoRDgwMC1EQkZGKSBpcyBhbHNvIHRoZSBpbmNvbXBsZXRlIGNoYXJhY3RlclxuICAgIHZhciBjaGFyQ29kZSA9IGNoYXJTdHIuY2hhckNvZGVBdChjaGFyU3RyLmxlbmd0aCAtIDEpO1xuICAgIGlmIChjaGFyQ29kZSA+PSAweEQ4MDAgJiYgY2hhckNvZGUgPD0gMHhEQkZGKSB7XG4gICAgICB0aGlzLmNoYXJMZW5ndGggKz0gdGhpcy5zdXJyb2dhdGVTaXplO1xuICAgICAgY2hhclN0ciA9ICcnO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIHRoaXMuY2hhclJlY2VpdmVkID0gdGhpcy5jaGFyTGVuZ3RoID0gMDtcblxuICAgIC8vIGlmIHRoZXJlIGFyZSBubyBtb3JlIGJ5dGVzIGluIHRoaXMgYnVmZmVyLCBqdXN0IGVtaXQgb3VyIGNoYXJcbiAgICBpZiAoYnVmZmVyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGNoYXJTdHI7XG4gICAgfVxuICAgIGJyZWFrO1xuICB9XG5cbiAgLy8gZGV0ZXJtaW5lIGFuZCBzZXQgY2hhckxlbmd0aCAvIGNoYXJSZWNlaXZlZFxuICB0aGlzLmRldGVjdEluY29tcGxldGVDaGFyKGJ1ZmZlcik7XG5cbiAgdmFyIGVuZCA9IGJ1ZmZlci5sZW5ndGg7XG4gIGlmICh0aGlzLmNoYXJMZW5ndGgpIHtcbiAgICAvLyBidWZmZXIgdGhlIGluY29tcGxldGUgY2hhcmFjdGVyIGJ5dGVzIHdlIGdvdFxuICAgIGJ1ZmZlci5jb3B5KHRoaXMuY2hhckJ1ZmZlciwgMCwgYnVmZmVyLmxlbmd0aCAtIHRoaXMuY2hhclJlY2VpdmVkLCBlbmQpO1xuICAgIGVuZCAtPSB0aGlzLmNoYXJSZWNlaXZlZDtcbiAgfVxuXG4gIGNoYXJTdHIgKz0gYnVmZmVyLnRvU3RyaW5nKHRoaXMuZW5jb2RpbmcsIDAsIGVuZCk7XG5cbiAgdmFyIGVuZCA9IGNoYXJTdHIubGVuZ3RoIC0gMTtcbiAgdmFyIGNoYXJDb2RlID0gY2hhclN0ci5jaGFyQ29kZUF0KGVuZCk7XG4gIC8vIENFU1UtODogbGVhZCBzdXJyb2dhdGUgKEQ4MDAtREJGRikgaXMgYWxzbyB0aGUgaW5jb21wbGV0ZSBjaGFyYWN0ZXJcbiAgaWYgKGNoYXJDb2RlID49IDB4RDgwMCAmJiBjaGFyQ29kZSA8PSAweERCRkYpIHtcbiAgICB2YXIgc2l6ZSA9IHRoaXMuc3Vycm9nYXRlU2l6ZTtcbiAgICB0aGlzLmNoYXJMZW5ndGggKz0gc2l6ZTtcbiAgICB0aGlzLmNoYXJSZWNlaXZlZCArPSBzaXplO1xuICAgIHRoaXMuY2hhckJ1ZmZlci5jb3B5KHRoaXMuY2hhckJ1ZmZlciwgc2l6ZSwgMCwgc2l6ZSk7XG4gICAgYnVmZmVyLmNvcHkodGhpcy5jaGFyQnVmZmVyLCAwLCAwLCBzaXplKTtcbiAgICByZXR1cm4gY2hhclN0ci5zdWJzdHJpbmcoMCwgZW5kKTtcbiAgfVxuXG4gIC8vIG9yIGp1c3QgZW1pdCB0aGUgY2hhclN0clxuICByZXR1cm4gY2hhclN0cjtcbn07XG5cbi8vIGRldGVjdEluY29tcGxldGVDaGFyIGRldGVybWluZXMgaWYgdGhlcmUgaXMgYW4gaW5jb21wbGV0ZSBVVEYtOCBjaGFyYWN0ZXIgYXRcbi8vIHRoZSBlbmQgb2YgdGhlIGdpdmVuIGJ1ZmZlci4gSWYgc28sIGl0IHNldHMgdGhpcy5jaGFyTGVuZ3RoIHRvIHRoZSBieXRlXG4vLyBsZW5ndGggdGhhdCBjaGFyYWN0ZXIsIGFuZCBzZXRzIHRoaXMuY2hhclJlY2VpdmVkIHRvIHRoZSBudW1iZXIgb2YgYnl0ZXNcbi8vIHRoYXQgYXJlIGF2YWlsYWJsZSBmb3IgdGhpcyBjaGFyYWN0ZXIuXG5TdHJpbmdEZWNvZGVyLnByb3RvdHlwZS5kZXRlY3RJbmNvbXBsZXRlQ2hhciA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAvLyBkZXRlcm1pbmUgaG93IG1hbnkgYnl0ZXMgd2UgaGF2ZSB0byBjaGVjayBhdCB0aGUgZW5kIG9mIHRoaXMgYnVmZmVyXG4gIHZhciBpID0gKGJ1ZmZlci5sZW5ndGggPj0gMykgPyAzIDogYnVmZmVyLmxlbmd0aDtcblxuICAvLyBGaWd1cmUgb3V0IGlmIG9uZSBvZiB0aGUgbGFzdCBpIGJ5dGVzIG9mIG91ciBidWZmZXIgYW5ub3VuY2VzIGFuXG4gIC8vIGluY29tcGxldGUgY2hhci5cbiAgZm9yICg7IGkgPiAwOyBpLS0pIHtcbiAgICB2YXIgYyA9IGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gaV07XG5cbiAgICAvLyBTZWUgaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9VVEYtOCNEZXNjcmlwdGlvblxuXG4gICAgLy8gMTEwWFhYWFhcbiAgICBpZiAoaSA9PSAxICYmIGMgPj4gNSA9PSAweDA2KSB7XG4gICAgICB0aGlzLmNoYXJMZW5ndGggPSAyO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gMTExMFhYWFhcbiAgICBpZiAoaSA8PSAyICYmIGMgPj4gNCA9PSAweDBFKSB7XG4gICAgICB0aGlzLmNoYXJMZW5ndGggPSAzO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gMTExMTBYWFhcbiAgICBpZiAoaSA8PSAzICYmIGMgPj4gMyA9PSAweDFFKSB7XG4gICAgICB0aGlzLmNoYXJMZW5ndGggPSA0O1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHRoaXMuY2hhclJlY2VpdmVkID0gaTtcbn07XG5cblN0cmluZ0RlY29kZXIucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICB2YXIgcmVzID0gJyc7XG4gIGlmIChidWZmZXIgJiYgYnVmZmVyLmxlbmd0aClcbiAgICByZXMgPSB0aGlzLndyaXRlKGJ1ZmZlcik7XG5cbiAgaWYgKHRoaXMuY2hhclJlY2VpdmVkKSB7XG4gICAgdmFyIGNyID0gdGhpcy5jaGFyUmVjZWl2ZWQ7XG4gICAgdmFyIGJ1ZiA9IHRoaXMuY2hhckJ1ZmZlcjtcbiAgICB2YXIgZW5jID0gdGhpcy5lbmNvZGluZztcbiAgICByZXMgKz0gYnVmLnNsaWNlKDAsIGNyKS50b1N0cmluZyhlbmMpO1xuICB9XG5cbiAgcmV0dXJuIHJlcztcbn07XG5cbmZ1bmN0aW9uIHBhc3NUaHJvdWdoV3JpdGUoYnVmZmVyKSB7XG4gIHJldHVybiBidWZmZXIudG9TdHJpbmcodGhpcy5lbmNvZGluZyk7XG59XG5cbmZ1bmN0aW9uIHV0ZjE2RGV0ZWN0SW5jb21wbGV0ZUNoYXIoYnVmZmVyKSB7XG4gIHRoaXMuY2hhclJlY2VpdmVkID0gYnVmZmVyLmxlbmd0aCAlIDI7XG4gIHRoaXMuY2hhckxlbmd0aCA9IHRoaXMuY2hhclJlY2VpdmVkID8gMiA6IDA7XG59XG5cbmZ1bmN0aW9uIGJhc2U2NERldGVjdEluY29tcGxldGVDaGFyKGJ1ZmZlcikge1xuICB0aGlzLmNoYXJSZWNlaXZlZCA9IGJ1ZmZlci5sZW5ndGggJSAzO1xuICB0aGlzLmNoYXJMZW5ndGggPSB0aGlzLmNoYXJSZWNlaXZlZCA/IDMgOiAwO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBUcmF2ZXJzZTtcbmZ1bmN0aW9uIFRyYXZlcnNlIChvYmopIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgVHJhdmVyc2UpKSByZXR1cm4gbmV3IFRyYXZlcnNlKG9iaik7XG4gICAgdGhpcy52YWx1ZSA9IG9iajtcbn1cblxuVHJhdmVyc2UucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChwcykge1xuICAgIHZhciBub2RlID0gdGhpcy52YWx1ZTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBzLmxlbmd0aDsgaSArKykge1xuICAgICAgICB2YXIga2V5ID0gcHNbaV07XG4gICAgICAgIGlmICghT2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwobm9kZSwga2V5KSkge1xuICAgICAgICAgICAgbm9kZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIG5vZGUgPSBub2RlW2tleV07XG4gICAgfVxuICAgIHJldHVybiBub2RlO1xufTtcblxuVHJhdmVyc2UucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChwcywgdmFsdWUpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMudmFsdWU7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcy5sZW5ndGggLSAxOyBpICsrKSB7XG4gICAgICAgIHZhciBrZXkgPSBwc1tpXTtcbiAgICAgICAgaWYgKCFPYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChub2RlLCBrZXkpKSBub2RlW2tleV0gPSB7fTtcbiAgICAgICAgbm9kZSA9IG5vZGVba2V5XTtcbiAgICB9XG4gICAgbm9kZVtwc1tpXV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gdmFsdWU7XG59O1xuXG5UcmF2ZXJzZS5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgcmV0dXJuIHdhbGsodGhpcy52YWx1ZSwgY2IsIHRydWUpO1xufTtcblxuVHJhdmVyc2UucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbiAoY2IpIHtcbiAgICB0aGlzLnZhbHVlID0gd2Fsayh0aGlzLnZhbHVlLCBjYiwgZmFsc2UpO1xuICAgIHJldHVybiB0aGlzLnZhbHVlO1xufTtcblxuVHJhdmVyc2UucHJvdG90eXBlLnJlZHVjZSA9IGZ1bmN0aW9uIChjYiwgaW5pdCkge1xuICAgIHZhciBza2lwID0gYXJndW1lbnRzLmxlbmd0aCA9PT0gMTtcbiAgICB2YXIgYWNjID0gc2tpcCA/IHRoaXMudmFsdWUgOiBpbml0O1xuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICBpZiAoIXRoaXMuaXNSb290IHx8ICFza2lwKSB7XG4gICAgICAgICAgICBhY2MgPSBjYi5jYWxsKHRoaXMsIGFjYywgeCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gYWNjO1xufTtcblxuVHJhdmVyc2UucHJvdG90eXBlLmRlZXBFcXVhbCA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAnZGVlcEVxdWFsIHJlcXVpcmVzIGV4YWN0bHkgb25lIG9iamVjdCB0byBjb21wYXJlIGFnYWluc3QnXG4gICAgICAgICk7XG4gICAgfVxuICAgIFxuICAgIHZhciBlcXVhbCA9IHRydWU7XG4gICAgdmFyIG5vZGUgPSBvYmo7XG4gICAgXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uICh5KSB7XG4gICAgICAgIHZhciBub3RFcXVhbCA9IChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBlcXVhbCA9IGZhbHNlO1xuICAgICAgICAgICAgLy90aGlzLnN0b3AoKTtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH0pLmJpbmQodGhpcyk7XG4gICAgICAgIFxuICAgICAgICAvL2lmIChub2RlID09PSB1bmRlZmluZWQgfHwgbm9kZSA9PT0gbnVsbCkgcmV0dXJuIG5vdEVxdWFsKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXRoaXMuaXNSb290KSB7XG4gICAgICAgIC8qXG4gICAgICAgICAgICBpZiAoIU9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKG5vZGUsIHRoaXMua2V5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBub3RFcXVhbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAqL1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBub2RlICE9PSAnb2JqZWN0JykgcmV0dXJuIG5vdEVxdWFsKCk7XG4gICAgICAgICAgICBub2RlID0gbm9kZVt0aGlzLmtleV07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciB4ID0gbm9kZTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMucG9zdChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBub2RlID0geDtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB2YXIgdG9TID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5jaXJjdWxhcikge1xuICAgICAgICAgICAgaWYgKFRyYXZlcnNlKG9iaikuZ2V0KHRoaXMuY2lyY3VsYXIucGF0aCkgIT09IHgpIG5vdEVxdWFsKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIHggIT09IHR5cGVvZiB5KSB7XG4gICAgICAgICAgICBub3RFcXVhbCgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHggPT09IG51bGwgfHwgeSA9PT0gbnVsbCB8fCB4ID09PSB1bmRlZmluZWQgfHwgeSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpZiAoeCAhPT0geSkgbm90RXF1YWwoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh4Ll9fcHJvdG9fXyAhPT0geS5fX3Byb3RvX18pIHtcbiAgICAgICAgICAgIG5vdEVxdWFsKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoeCA9PT0geSkge1xuICAgICAgICAgICAgLy8gbm9wXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIHggPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGlmICh4IGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAgICAgICAgICAgLy8gYm90aCByZWdleHBzIG9uIGFjY291bnQgb2YgdGhlIF9fcHJvdG9fXyBjaGVja1xuICAgICAgICAgICAgICAgIGlmICh4LnRvU3RyaW5nKCkgIT0geS50b1N0cmluZygpKSBub3RFcXVhbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoeCAhPT0geSkgbm90RXF1YWwoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0eXBlb2YgeCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGlmICh0b1MoeSkgPT09ICdbb2JqZWN0IEFyZ3VtZW50c10nXG4gICAgICAgICAgICB8fCB0b1MoeCkgPT09ICdbb2JqZWN0IEFyZ3VtZW50c10nKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRvUyh4KSAhPT0gdG9TKHkpKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vdEVxdWFsKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoeCBpbnN0YW5jZW9mIERhdGUgfHwgeSBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoISh4IGluc3RhbmNlb2YgRGF0ZSkgfHwgISh5IGluc3RhbmNlb2YgRGF0ZSlcbiAgICAgICAgICAgICAgICB8fCB4LmdldFRpbWUoKSAhPT0geS5nZXRUaW1lKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbm90RXF1YWwoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIga3ggPSBPYmplY3Qua2V5cyh4KTtcbiAgICAgICAgICAgICAgICB2YXIga3kgPSBPYmplY3Qua2V5cyh5KTtcbiAgICAgICAgICAgICAgICBpZiAoa3gubGVuZ3RoICE9PSBreS5sZW5ndGgpIHJldHVybiBub3RFcXVhbCgpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwga3gubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGsgPSBreFtpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFPYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbCh5LCBrKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm90RXF1YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIFxuICAgIHJldHVybiBlcXVhbDtcbn07XG5cblRyYXZlcnNlLnByb3RvdHlwZS5wYXRocyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYWNjID0gW107XG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIGFjYy5wdXNoKHRoaXMucGF0aCk7IFxuICAgIH0pO1xuICAgIHJldHVybiBhY2M7XG59O1xuXG5UcmF2ZXJzZS5wcm90b3R5cGUubm9kZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFjYyA9IFtdO1xuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICBhY2MucHVzaCh0aGlzLm5vZGUpO1xuICAgIH0pO1xuICAgIHJldHVybiBhY2M7XG59O1xuXG5UcmF2ZXJzZS5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBhcmVudHMgPSBbXSwgbm9kZXMgPSBbXTtcbiAgICBcbiAgICByZXR1cm4gKGZ1bmN0aW9uIGNsb25lIChzcmMpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAocGFyZW50c1tpXSA9PT0gc3JjKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGVzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAodHlwZW9mIHNyYyA9PT0gJ29iamVjdCcgJiYgc3JjICE9PSBudWxsKSB7XG4gICAgICAgICAgICB2YXIgZHN0ID0gY29weShzcmMpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBwYXJlbnRzLnB1c2goc3JjKTtcbiAgICAgICAgICAgIG5vZGVzLnB1c2goZHN0KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgT2JqZWN0LmtleXMoc3JjKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICBkc3Rba2V5XSA9IGNsb25lKHNyY1trZXldKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBwYXJlbnRzLnBvcCgpO1xuICAgICAgICAgICAgbm9kZXMucG9wKCk7XG4gICAgICAgICAgICByZXR1cm4gZHN0O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHNyYztcbiAgICAgICAgfVxuICAgIH0pKHRoaXMudmFsdWUpO1xufTtcblxuZnVuY3Rpb24gd2FsayAocm9vdCwgY2IsIGltbXV0YWJsZSkge1xuICAgIHZhciBwYXRoID0gW107XG4gICAgdmFyIHBhcmVudHMgPSBbXTtcbiAgICB2YXIgYWxpdmUgPSB0cnVlO1xuICAgIFxuICAgIHJldHVybiAoZnVuY3Rpb24gd2Fsa2VyIChub2RlXykge1xuICAgICAgICB2YXIgbm9kZSA9IGltbXV0YWJsZSA/IGNvcHkobm9kZV8pIDogbm9kZV87XG4gICAgICAgIHZhciBtb2RpZmllcnMgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIHZhciBzdGF0ZSA9IHtcbiAgICAgICAgICAgIG5vZGUgOiBub2RlLFxuICAgICAgICAgICAgbm9kZV8gOiBub2RlXyxcbiAgICAgICAgICAgIHBhdGggOiBbXS5jb25jYXQocGF0aCksXG4gICAgICAgICAgICBwYXJlbnQgOiBwYXJlbnRzLnNsaWNlKC0xKVswXSxcbiAgICAgICAgICAgIGtleSA6IHBhdGguc2xpY2UoLTEpWzBdLFxuICAgICAgICAgICAgaXNSb290IDogcGF0aC5sZW5ndGggPT09IDAsXG4gICAgICAgICAgICBsZXZlbCA6IHBhdGgubGVuZ3RoLFxuICAgICAgICAgICAgY2lyY3VsYXIgOiBudWxsLFxuICAgICAgICAgICAgdXBkYXRlIDogZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXN0YXRlLmlzUm9vdCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZS5wYXJlbnQubm9kZVtzdGF0ZS5rZXldID0geDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3RhdGUubm9kZSA9IHg7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ2RlbGV0ZScgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHN0YXRlLnBhcmVudC5ub2RlW3N0YXRlLmtleV07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVtb3ZlIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHN0YXRlLnBhcmVudC5ub2RlKSkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZS5wYXJlbnQubm9kZS5zcGxpY2Uoc3RhdGUua2V5LCAxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBzdGF0ZS5wYXJlbnQubm9kZVtzdGF0ZS5rZXldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBiZWZvcmUgOiBmdW5jdGlvbiAoZikgeyBtb2RpZmllcnMuYmVmb3JlID0gZiB9LFxuICAgICAgICAgICAgYWZ0ZXIgOiBmdW5jdGlvbiAoZikgeyBtb2RpZmllcnMuYWZ0ZXIgPSBmIH0sXG4gICAgICAgICAgICBwcmUgOiBmdW5jdGlvbiAoZikgeyBtb2RpZmllcnMucHJlID0gZiB9LFxuICAgICAgICAgICAgcG9zdCA6IGZ1bmN0aW9uIChmKSB7IG1vZGlmaWVycy5wb3N0ID0gZiB9LFxuICAgICAgICAgICAgc3RvcCA6IGZ1bmN0aW9uICgpIHsgYWxpdmUgPSBmYWxzZSB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBpZiAoIWFsaXZlKSByZXR1cm4gc3RhdGU7XG4gICAgICAgIFxuICAgICAgICBpZiAodHlwZW9mIG5vZGUgPT09ICdvYmplY3QnICYmIG5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHN0YXRlLmlzTGVhZiA9IE9iamVjdC5rZXlzKG5vZGUpLmxlbmd0aCA9PSAwO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAocGFyZW50c1tpXS5ub2RlXyA9PT0gbm9kZV8pIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUuY2lyY3VsYXIgPSBwYXJlbnRzW2ldO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzdGF0ZS5pc0xlYWYgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzdGF0ZS5ub3RMZWFmID0gIXN0YXRlLmlzTGVhZjtcbiAgICAgICAgc3RhdGUubm90Um9vdCA9ICFzdGF0ZS5pc1Jvb3Q7XG4gICAgICAgIFxuICAgICAgICAvLyB1c2UgcmV0dXJuIHZhbHVlcyB0byB1cGRhdGUgaWYgZGVmaW5lZFxuICAgICAgICB2YXIgcmV0ID0gY2IuY2FsbChzdGF0ZSwgc3RhdGUubm9kZSk7XG4gICAgICAgIGlmIChyZXQgIT09IHVuZGVmaW5lZCAmJiBzdGF0ZS51cGRhdGUpIHN0YXRlLnVwZGF0ZShyZXQpO1xuICAgICAgICBpZiAobW9kaWZpZXJzLmJlZm9yZSkgbW9kaWZpZXJzLmJlZm9yZS5jYWxsKHN0YXRlLCBzdGF0ZS5ub2RlKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlb2Ygc3RhdGUubm9kZSA9PSAnb2JqZWN0J1xuICAgICAgICAmJiBzdGF0ZS5ub2RlICE9PSBudWxsICYmICFzdGF0ZS5jaXJjdWxhcikge1xuICAgICAgICAgICAgcGFyZW50cy5wdXNoKHN0YXRlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhzdGF0ZS5ub2RlKTtcbiAgICAgICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5LCBpKSB7XG4gICAgICAgICAgICAgICAgcGF0aC5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKG1vZGlmaWVycy5wcmUpIG1vZGlmaWVycy5wcmUuY2FsbChzdGF0ZSwgc3RhdGUubm9kZVtrZXldLCBrZXkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHZhciBjaGlsZCA9IHdhbGtlcihzdGF0ZS5ub2RlW2tleV0pO1xuICAgICAgICAgICAgICAgIGlmIChpbW11dGFibGUgJiYgT2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwoc3RhdGUubm9kZSwga2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZS5ub2RlW2tleV0gPSBjaGlsZC5ub2RlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjaGlsZC5pc0xhc3QgPSBpID09IGtleXMubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgICAgICBjaGlsZC5pc0ZpcnN0ID0gaSA9PSAwO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChtb2RpZmllcnMucG9zdCkgbW9kaWZpZXJzLnBvc3QuY2FsbChzdGF0ZSwgY2hpbGQpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHBhdGgucG9wKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHBhcmVudHMucG9wKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChtb2RpZmllcnMuYWZ0ZXIpIG1vZGlmaWVycy5hZnRlci5jYWxsKHN0YXRlLCBzdGF0ZS5ub2RlKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICB9KShyb290KS5ub2RlO1xufVxuXG5PYmplY3Qua2V5cyhUcmF2ZXJzZS5wcm90b3R5cGUpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgIFRyYXZlcnNlW2tleV0gPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICB2YXIgdCA9IFRyYXZlcnNlKG9iaik7XG4gICAgICAgIHJldHVybiB0W2tleV0uYXBwbHkodCwgYXJncyk7XG4gICAgfTtcbn0pO1xuXG5mdW5jdGlvbiBjb3B5IChzcmMpIHtcbiAgICBpZiAodHlwZW9mIHNyYyA9PT0gJ29iamVjdCcgJiYgc3JjICE9PSBudWxsKSB7XG4gICAgICAgIHZhciBkc3Q7XG4gICAgICAgIFxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShzcmMpKSB7XG4gICAgICAgICAgICBkc3QgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzcmMgaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgICAgICAgICBkc3QgPSBuZXcgRGF0ZShzcmMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHNyYyBpbnN0YW5jZW9mIEJvb2xlYW4pIHtcbiAgICAgICAgICAgIGRzdCA9IG5ldyBCb29sZWFuKHNyYyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc3JjIGluc3RhbmNlb2YgTnVtYmVyKSB7XG4gICAgICAgICAgICBkc3QgPSBuZXcgTnVtYmVyKHNyYyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc3JjIGluc3RhbmNlb2YgU3RyaW5nKSB7XG4gICAgICAgICAgICBkc3QgPSBuZXcgU3RyaW5nKHNyYyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkc3QgPSBPYmplY3QuY3JlYXRlKE9iamVjdC5nZXRQcm90b3R5cGVPZihzcmMpKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgT2JqZWN0LmtleXMoc3JjKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIGRzdFtrZXldID0gc3JjW2tleV07XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZHN0O1xuICAgIH1cbiAgICBlbHNlIHJldHVybiBzcmM7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gRW50cnk7XG5cbnZhciBQYXNzVGhyb3VnaCA9IHJlcXVpcmUoJ3JlYWRhYmxlLXN0cmVhbS9wYXNzdGhyb3VnaCcpO1xudmFyIGluaGVyaXRzID0gcmVxdWlyZSgndXRpbCcpLmluaGVyaXRzO1xuXG5pbmhlcml0cyhFbnRyeSwgUGFzc1Rocm91Z2gpO1xuXG5mdW5jdGlvbiBFbnRyeSAoKSB7XG4gIFBhc3NUaHJvdWdoLmNhbGwodGhpcyk7XG4gIHRoaXMucHJvcHMgPSB7fTtcbn1cblxuRW50cnkucHJvdG90eXBlLmF1dG9kcmFpbiA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5vbigncmVhZGFibGUnLCB0aGlzLnJlYWQuYmluZCh0aGlzKSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV4dHJhY3Q7XG5cbnZhciBQYXJzZSA9IHJlcXVpcmUoXCIuLi91bnppcFwiKS5QYXJzZTtcbnZhciBXcml0ZXIgPSByZXF1aXJlKFwiZnN0cmVhbVwiKS5Xcml0ZXI7XG52YXIgV3JpdGFibGUgPSByZXF1aXJlKCdyZWFkYWJsZS1zdHJlYW0vd3JpdGFibGUnKTtcbnZhciBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xudmFyIGluaGVyaXRzID0gcmVxdWlyZSgndXRpbCcpLmluaGVyaXRzO1xuXG5pbmhlcml0cyhFeHRyYWN0LCBXcml0YWJsZSk7XG5cbmZ1bmN0aW9uIEV4dHJhY3QgKG9wdHMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRXh0cmFjdCkpIHtcbiAgICByZXR1cm4gbmV3IEV4dHJhY3Qob3B0cyk7XG4gIH1cblxuICBXcml0YWJsZS5hcHBseSh0aGlzKTtcbiAgdGhpcy5fb3B0cyA9IG9wdHMgfHwgeyB2ZXJib3NlOiBmYWxzZSB9O1xuXG4gIHRoaXMuX3BhcnNlciA9IFBhcnNlKHRoaXMuX29wdHMpO1xuICB0aGlzLl9wYXJzZXIub24oJ2Vycm9yJywgZnVuY3Rpb24oZXJyKSB7XG4gICAgc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG4gIH0pO1xuICB0aGlzLm9uKCdmaW5pc2gnLCBmdW5jdGlvbigpIHtcbiAgICBzZWxmLl9wYXJzZXIuZW5kKCk7XG4gIH0pO1xuXG4gIHZhciB3cml0ZXIgPSBXcml0ZXIoe1xuICAgIHR5cGU6ICdEaXJlY3RvcnknLFxuICAgIHBhdGg6IG9wdHMucGF0aFxuICB9KTtcbiAgd3JpdGVyLm9uKCdlcnJvcicsIGZ1bmN0aW9uKGVycikge1xuICAgIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuICB9KTtcbiAgd3JpdGVyLm9uKCdjbG9zZScsIGZ1bmN0aW9uKCkge1xuICAgIHNlbGYuZW1pdCgnY2xvc2UnKVxuICB9KTtcblxuICB0aGlzLm9uKCdwaXBlJywgZnVuY3Rpb24oc291cmNlKSB7XG4gICAgaWYgKG9wdHMudmVyYm9zZSAmJiBzb3VyY2UucGF0aCkge1xuICAgICAgY29uc29sZS5sb2coJ0FyY2hpdmU6ICcsIHNvdXJjZS5wYXRoKTtcbiAgICB9XG4gIH0pO1xuXG4gIHRoaXMuX3BhcnNlci5waXBlKHdyaXRlcik7XG59XG5cbkV4dHJhY3QucHJvdG90eXBlLl93cml0ZSA9IGZ1bmN0aW9uIChjaHVuaywgZW5jb2RpbmcsIGNhbGxiYWNrKSB7XG4gIGlmICh0aGlzLl9wYXJzZXIud3JpdGUoY2h1bmspKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gIH1cblxuICByZXR1cm4gdGhpcy5fcGFyc2VyLm9uY2UoJ2RyYWluJywgY2FsbGJhY2spO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBQYXJzZS5jcmVhdGUgPSBQYXJzZTtcblxucmVxdWlyZShcInNldGltbWVkaWF0ZVwiKTtcbnZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKCdyZWFkYWJsZS1zdHJlYW0vdHJhbnNmb3JtJyk7XG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKCd1dGlsJykuaW5oZXJpdHM7XG52YXIgemxpYiA9IHJlcXVpcmUoJ3psaWInKTtcbnZhciBiaW5hcnkgPSByZXF1aXJlKCdiaW5hcnknKTtcbnZhciBQdWxsU3RyZWFtID0gcmVxdWlyZSgncHVsbHN0cmVhbScpO1xudmFyIE1hdGNoU3RyZWFtID0gcmVxdWlyZSgnbWF0Y2gtc3RyZWFtJyk7XG52YXIgRW50cnkgPSByZXF1aXJlKCcuL2VudHJ5Jyk7XG5cbmluaGVyaXRzKFBhcnNlLCBUcmFuc2Zvcm0pO1xuXG5mdW5jdGlvbiBQYXJzZShvcHRzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFBhcnNlKSkge1xuICAgIHJldHVybiBuZXcgUGFyc2Uob3B0cyk7XG4gIH1cblxuICBUcmFuc2Zvcm0uY2FsbCh0aGlzLCB7IGxvd1dhdGVyTWFyazogMCB9KTtcbiAgdGhpcy5fb3B0cyA9IG9wdHMgfHwgeyB2ZXJib3NlOiBmYWxzZSB9O1xuICB0aGlzLl9oYXNFbnRyeUxpc3RlbmVyID0gZmFsc2U7XG5cbiAgdGhpcy5fcHVsbFN0cmVhbSA9IG5ldyBQdWxsU3RyZWFtKCk7XG4gIHRoaXMuX3B1bGxTdHJlYW0ub24oXCJlcnJvclwiLCBmdW5jdGlvbiAoZSkge1xuICAgIHNlbGYuZW1pdCgnZXJyb3InLCBlKTtcbiAgfSk7XG4gIHRoaXMuX3B1bGxTdHJlYW0ub25jZShcImVuZFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgc2VsZi5fc3RyZWFtRW5kID0gdHJ1ZTtcbiAgfSk7XG4gIHRoaXMuX3B1bGxTdHJlYW0ub25jZShcImZpbmlzaFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgc2VsZi5fc3RyZWFtRmluaXNoID0gdHJ1ZTtcbiAgfSk7XG5cbiAgdGhpcy5fcmVhZFJlY29yZCgpO1xufVxuXG5QYXJzZS5wcm90b3R5cGUuX3JlYWRSZWNvcmQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5fcHVsbFN0cmVhbS5wdWxsKDQsIGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICByZXR1cm4gc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgfVxuXG4gICAgaWYgKGRhdGEubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHNpZ25hdHVyZSA9IGRhdGEucmVhZFVJbnQzMkxFKDApO1xuICAgIGlmIChzaWduYXR1cmUgPT09IDB4MDQwMzRiNTApIHtcbiAgICAgIHNlbGYuX3JlYWRGaWxlKCk7XG4gICAgfSBlbHNlIGlmIChzaWduYXR1cmUgPT09IDB4MDIwMTRiNTApIHtcbiAgICAgIHNlbGYuX3JlYWRDZW50cmFsRGlyZWN0b3J5RmlsZUhlYWRlcigpO1xuICAgIH0gZWxzZSBpZiAoc2lnbmF0dXJlID09PSAweDA2MDU0YjUwKSB7XG4gICAgICBzZWxmLl9yZWFkRW5kT2ZDZW50cmFsRGlyZWN0b3J5UmVjb3JkKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVyciA9IG5ldyBFcnJvcignaW52YWxpZCBzaWduYXR1cmU6IDB4JyArIHNpZ25hdHVyZS50b1N0cmluZygxNikpO1xuICAgICAgc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgfVxuICB9KTtcbn07XG5cblBhcnNlLnByb3RvdHlwZS5fcmVhZEZpbGUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5fcHVsbFN0cmVhbS5wdWxsKDI2LCBmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG4gICAgaWYgKGVycikge1xuICAgICAgcmV0dXJuIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgIH1cblxuICAgIHZhciB2YXJzID0gYmluYXJ5LnBhcnNlKGRhdGEpXG4gICAgICAud29yZDE2bHUoJ3ZlcnNpb25zTmVlZGVkVG9FeHRyYWN0JylcbiAgICAgIC53b3JkMTZsdSgnZmxhZ3MnKVxuICAgICAgLndvcmQxNmx1KCdjb21wcmVzc2lvbk1ldGhvZCcpXG4gICAgICAud29yZDE2bHUoJ2xhc3RNb2RpZmllZFRpbWUnKVxuICAgICAgLndvcmQxNmx1KCdsYXN0TW9kaWZpZWREYXRlJylcbiAgICAgIC53b3JkMzJsdSgnY3JjMzInKVxuICAgICAgLndvcmQzMmx1KCdjb21wcmVzc2VkU2l6ZScpXG4gICAgICAud29yZDMybHUoJ3VuY29tcHJlc3NlZFNpemUnKVxuICAgICAgLndvcmQxNmx1KCdmaWxlTmFtZUxlbmd0aCcpXG4gICAgICAud29yZDE2bHUoJ2V4dHJhRmllbGRMZW5ndGgnKVxuICAgICAgLnZhcnM7XG5cbiAgICByZXR1cm4gc2VsZi5fcHVsbFN0cmVhbS5wdWxsKHZhcnMuZmlsZU5hbWVMZW5ndGgsIGZ1bmN0aW9uIChlcnIsIGZpbGVOYW1lKSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJldHVybiBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgIH1cbiAgICAgIGZpbGVOYW1lID0gZmlsZU5hbWUudG9TdHJpbmcoJ3V0ZjgnKTtcbiAgICAgIHZhciBlbnRyeSA9IG5ldyBFbnRyeSgpO1xuICAgICAgZW50cnkucGF0aCA9IGZpbGVOYW1lO1xuICAgICAgZW50cnkucHJvcHMucGF0aCA9IGZpbGVOYW1lO1xuICAgICAgZW50cnkudHlwZSA9ICh2YXJzLmNvbXByZXNzZWRTaXplID09PSAwICYmIC9bXFwvXFxcXF0kLy50ZXN0KGZpbGVOYW1lKSkgPyAnRGlyZWN0b3J5JyA6ICdGaWxlJztcblxuICAgICAgaWYgKHNlbGYuX29wdHMudmVyYm9zZSkge1xuICAgICAgICBpZiAoZW50cnkudHlwZSA9PT0gJ0RpcmVjdG9yeScpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnICAgY3JlYXRpbmc6JywgZmlsZU5hbWUpO1xuICAgICAgICB9IGVsc2UgaWYgKGVudHJ5LnR5cGUgPT09ICdGaWxlJykge1xuICAgICAgICAgIGlmICh2YXJzLmNvbXByZXNzaW9uTWV0aG9kID09PSAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnIGV4dHJhY3Rpbmc6JywgZmlsZU5hbWUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnICBpbmZsYXRpbmc6JywgZmlsZU5hbWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgaGFzRW50cnlMaXN0ZW5lciA9IHNlbGYuX2hhc0VudHJ5TGlzdGVuZXI7XG4gICAgICBpZiAoaGFzRW50cnlMaXN0ZW5lcikge1xuICAgICAgICBzZWxmLmVtaXQoJ2VudHJ5JywgZW50cnkpO1xuICAgICAgfVxuXG4gICAgICBzZWxmLl9wdWxsU3RyZWFtLnB1bGwodmFycy5leHRyYUZpZWxkTGVuZ3RoLCBmdW5jdGlvbiAoZXJyLCBleHRyYUZpZWxkKSB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZXR1cm4gc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhcnMuY29tcHJlc3Npb25NZXRob2QgPT09IDApIHtcbiAgICAgICAgICBzZWxmLl9wdWxsU3RyZWFtLnB1bGwodmFycy5jb21wcmVzc2VkU2l6ZSwgZnVuY3Rpb24gKGVyciwgY29tcHJlc3NlZERhdGEpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoaGFzRW50cnlMaXN0ZW5lcikge1xuICAgICAgICAgICAgICBlbnRyeS53cml0ZShjb21wcmVzc2VkRGF0YSk7XG4gICAgICAgICAgICAgIGVudHJ5LmVuZCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gc2VsZi5fcmVhZFJlY29yZCgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBmaWxlU2l6ZUtub3duID0gISh2YXJzLmZsYWdzICYgMHgwOCk7XG5cbiAgICAgICAgICB2YXIgaW5mbGF0ZXIgPSB6bGliLmNyZWF0ZUluZmxhdGVSYXcoKTtcbiAgICAgICAgICBpbmZsYXRlci5vbignZXJyb3InLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGlmIChmaWxlU2l6ZUtub3duKSB7XG4gICAgICAgICAgICBlbnRyeS5zaXplID0gdmFycy51bmNvbXByZXNzZWRTaXplO1xuICAgICAgICAgICAgaWYgKGhhc0VudHJ5TGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgZW50cnkub24oJ2ZpbmlzaCcsIHNlbGYuX3JlYWRSZWNvcmQuYmluZChzZWxmKSk7XG4gICAgICAgICAgICAgIHNlbGYuX3B1bGxTdHJlYW0ucGlwZSh2YXJzLmNvbXByZXNzZWRTaXplLCBpbmZsYXRlcikucGlwZShlbnRyeSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzZWxmLl9wdWxsU3RyZWFtLmRyYWluKHZhcnMuY29tcHJlc3NlZFNpemUsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNlbGYuX3JlYWRSZWNvcmQoKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBkZXNjcmlwdG9yU2lnID0gbmV3IEJ1ZmZlcig0KTtcbiAgICAgICAgICAgIGRlc2NyaXB0b3JTaWcud3JpdGVVSW50MzJMRSgweDA4MDc0YjUwLCAwKTtcblxuICAgICAgICAgICAgdmFyIG1hdGNoU3RyZWFtID0gbmV3IE1hdGNoU3RyZWFtKHsgcGF0dGVybjogZGVzY3JpcHRvclNpZyB9LCBmdW5jdGlvbiAoYnVmLCBtYXRjaGVkLCBleHRyYSkge1xuICAgICAgICAgICAgICBpZiAoaGFzRW50cnlMaXN0ZW5lcikge1xuICAgICAgICAgICAgICAgIGlmICghbWF0Y2hlZCkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHVzaChidWYpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnB1c2goYnVmKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBzZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fcHVsbFN0cmVhbS51bnBpcGUoKTtcbiAgICAgICAgICAgICAgICBzZWxmLl9wdWxsU3RyZWFtLnByZXBlbmQoZXh0cmEpO1xuICAgICAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NEYXRhRGVzY3JpcHRvcihlbnRyeSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wdXNoKG51bGwpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHNlbGYuX3B1bGxTdHJlYW0ucGlwZShtYXRjaFN0cmVhbSk7XG4gICAgICAgICAgICBpZiAoaGFzRW50cnlMaXN0ZW5lcikge1xuICAgICAgICAgICAgICBtYXRjaFN0cmVhbS5waXBlKGluZmxhdGVyKS5waXBlKGVudHJ5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcbn07XG5cblBhcnNlLnByb3RvdHlwZS5fcHJvY2Vzc0RhdGFEZXNjcmlwdG9yID0gZnVuY3Rpb24gKGVudHJ5KSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5fcHVsbFN0cmVhbS5wdWxsKDE2LCBmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG4gICAgaWYgKGVycikge1xuICAgICAgcmV0dXJuIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgIH1cblxuICAgIHZhciB2YXJzID0gYmluYXJ5LnBhcnNlKGRhdGEpXG4gICAgICAud29yZDMybHUoJ2RhdGFEZXNjcmlwdG9yU2lnbmF0dXJlJylcbiAgICAgIC53b3JkMzJsdSgnY3JjMzInKVxuICAgICAgLndvcmQzMmx1KCdjb21wcmVzc2VkU2l6ZScpXG4gICAgICAud29yZDMybHUoJ3VuY29tcHJlc3NlZFNpemUnKVxuICAgICAgLnZhcnM7XG5cbiAgICBlbnRyeS5zaXplID0gdmFycy51bmNvbXByZXNzZWRTaXplO1xuICAgIHNlbGYuX3JlYWRSZWNvcmQoKTtcbiAgfSk7XG59O1xuXG5QYXJzZS5wcm90b3R5cGUuX3JlYWRDZW50cmFsRGlyZWN0b3J5RmlsZUhlYWRlciA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl9wdWxsU3RyZWFtLnB1bGwoNDIsIGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICByZXR1cm4gc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgfVxuXG4gICAgdmFyIHZhcnMgPSBiaW5hcnkucGFyc2UoZGF0YSlcbiAgICAgIC53b3JkMTZsdSgndmVyc2lvbk1hZGVCeScpXG4gICAgICAud29yZDE2bHUoJ3ZlcnNpb25zTmVlZGVkVG9FeHRyYWN0JylcbiAgICAgIC53b3JkMTZsdSgnZmxhZ3MnKVxuICAgICAgLndvcmQxNmx1KCdjb21wcmVzc2lvbk1ldGhvZCcpXG4gICAgICAud29yZDE2bHUoJ2xhc3RNb2RpZmllZFRpbWUnKVxuICAgICAgLndvcmQxNmx1KCdsYXN0TW9kaWZpZWREYXRlJylcbiAgICAgIC53b3JkMzJsdSgnY3JjMzInKVxuICAgICAgLndvcmQzMmx1KCdjb21wcmVzc2VkU2l6ZScpXG4gICAgICAud29yZDMybHUoJ3VuY29tcHJlc3NlZFNpemUnKVxuICAgICAgLndvcmQxNmx1KCdmaWxlTmFtZUxlbmd0aCcpXG4gICAgICAud29yZDE2bHUoJ2V4dHJhRmllbGRMZW5ndGgnKVxuICAgICAgLndvcmQxNmx1KCdmaWxlQ29tbWVudExlbmd0aCcpXG4gICAgICAud29yZDE2bHUoJ2Rpc2tOdW1iZXInKVxuICAgICAgLndvcmQxNmx1KCdpbnRlcm5hbEZpbGVBdHRyaWJ1dGVzJylcbiAgICAgIC53b3JkMzJsdSgnZXh0ZXJuYWxGaWxlQXR0cmlidXRlcycpXG4gICAgICAud29yZDMybHUoJ29mZnNldFRvTG9jYWxGaWxlSGVhZGVyJylcbiAgICAgIC52YXJzO1xuXG4gICAgcmV0dXJuIHNlbGYuX3B1bGxTdHJlYW0ucHVsbCh2YXJzLmZpbGVOYW1lTGVuZ3RoLCBmdW5jdGlvbiAoZXJyLCBmaWxlTmFtZSkge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICB9XG4gICAgICBmaWxlTmFtZSA9IGZpbGVOYW1lLnRvU3RyaW5nKCd1dGY4Jyk7XG5cbiAgICAgIHNlbGYuX3B1bGxTdHJlYW0ucHVsbCh2YXJzLmV4dHJhRmllbGRMZW5ndGgsIGZ1bmN0aW9uIChlcnIsIGV4dHJhRmllbGQpIHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHJldHVybiBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgICAgfVxuICAgICAgICBzZWxmLl9wdWxsU3RyZWFtLnB1bGwodmFycy5maWxlQ29tbWVudExlbmd0aCwgZnVuY3Rpb24gKGVyciwgZmlsZUNvbW1lbnQpIHtcbiAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBzZWxmLl9yZWFkUmVjb3JkKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuUGFyc2UucHJvdG90eXBlLl9yZWFkRW5kT2ZDZW50cmFsRGlyZWN0b3J5UmVjb3JkID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuX3B1bGxTdHJlYW0ucHVsbCgxOCwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIHJldHVybiBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICB9XG5cbiAgICB2YXIgdmFycyA9IGJpbmFyeS5wYXJzZShkYXRhKVxuICAgICAgLndvcmQxNmx1KCdkaXNrTnVtYmVyJylcbiAgICAgIC53b3JkMTZsdSgnZGlza1N0YXJ0JylcbiAgICAgIC53b3JkMTZsdSgnbnVtYmVyT2ZSZWNvcmRzT25EaXNrJylcbiAgICAgIC53b3JkMTZsdSgnbnVtYmVyT2ZSZWNvcmRzJylcbiAgICAgIC53b3JkMzJsdSgnc2l6ZU9mQ2VudHJhbERpcmVjdG9yeScpXG4gICAgICAud29yZDMybHUoJ29mZnNldFRvU3RhcnRPZkNlbnRyYWxEaXJlY3RvcnknKVxuICAgICAgLndvcmQxNmx1KCdjb21tZW50TGVuZ3RoJylcbiAgICAgIC52YXJzO1xuXG4gICAgaWYgKHZhcnMuY29tbWVudExlbmd0aCkge1xuICAgICAgc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCkge1xuICAgICAgICBzZWxmLl9wdWxsU3RyZWFtLnB1bGwodmFycy5jb21tZW50TGVuZ3RoLCBmdW5jdGlvbiAoZXJyLCBjb21tZW50KSB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb21tZW50ID0gY29tbWVudC50b1N0cmluZygndXRmOCcpO1xuICAgICAgICAgIHJldHVybiBzZWxmLl9wdWxsU3RyZWFtLmVuZCgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHNlbGYuX3B1bGxTdHJlYW0uZW5kKCk7XG4gICAgfVxuICB9KTtcbn07XG5cblBhcnNlLnByb3RvdHlwZS5fdHJhbnNmb3JtID0gZnVuY3Rpb24gKGNodW5rLCBlbmNvZGluZywgY2FsbGJhY2spIHtcbiAgaWYgKHRoaXMuX3B1bGxTdHJlYW0ud3JpdGUoY2h1bmspKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gIH1cblxuICB0aGlzLl9wdWxsU3RyZWFtLm9uY2UoJ2RyYWluJywgY2FsbGJhY2spO1xufTtcblxuUGFyc2UucHJvdG90eXBlLnBpcGUgPSBmdW5jdGlvbiAoZGVzdCwgb3B0cykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICh0eXBlb2YgZGVzdC5hZGQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHNlbGYub24oXCJlbnRyeVwiLCBmdW5jdGlvbiAoZW50cnkpIHtcbiAgICAgIGRlc3QuYWRkKGVudHJ5KTtcbiAgICB9KVxuICB9XG4gIHJldHVybiBUcmFuc2Zvcm0ucHJvdG90eXBlLnBpcGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cblBhcnNlLnByb3RvdHlwZS5fZmx1c2ggPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgaWYgKCF0aGlzLl9zdHJlYW1FbmQgfHwgIXRoaXMuX3N0cmVhbUZpbmlzaCkge1xuICAgIHJldHVybiBzZXRJbW1lZGlhdGUodGhpcy5fZmx1c2guYmluZCh0aGlzLCBjYWxsYmFjaykpO1xuICB9XG5cbiAgdGhpcy5lbWl0KCdjbG9zZScpO1xuICByZXR1cm4gY2FsbGJhY2soKTtcbn07XG5cblBhcnNlLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICgnZW50cnknID09PSB0eXBlKSB7XG4gICAgdGhpcy5faGFzRW50cnlMaXN0ZW5lciA9IHRydWU7XG4gIH1cbiAgcmV0dXJuIFRyYW5zZm9ybS5wcm90b3R5cGUuYWRkTGlzdGVuZXIuY2FsbCh0aGlzLCB0eXBlLCBsaXN0ZW5lcik7XG59O1xuXG5QYXJzZS5wcm90b3R5cGUub24gPSBQYXJzZS5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuUGFyc2UgPSByZXF1aXJlKCcuL2xpYi9wYXJzZScpO1xuZXhwb3J0cy5FeHRyYWN0ID0gcmVxdWlyZSgnLi9saWIvZXh0cmFjdCcpOyIsIi8vIFJldHVybnMgYSB3cmFwcGVyIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIHdyYXBwZWQgY2FsbGJhY2tcbi8vIFRoZSB3cmFwcGVyIGZ1bmN0aW9uIHNob3VsZCBkbyBzb21lIHN0dWZmLCBhbmQgcmV0dXJuIGFcbi8vIHByZXN1bWFibHkgZGlmZmVyZW50IGNhbGxiYWNrIGZ1bmN0aW9uLlxuLy8gVGhpcyBtYWtlcyBzdXJlIHRoYXQgb3duIHByb3BlcnRpZXMgYXJlIHJldGFpbmVkLCBzbyB0aGF0XG4vLyBkZWNvcmF0aW9ucyBhbmQgc3VjaCBhcmUgbm90IGxvc3QgYWxvbmcgdGhlIHdheS5cbm1vZHVsZS5leHBvcnRzID0gd3JhcHB5XG5mdW5jdGlvbiB3cmFwcHkgKGZuLCBjYikge1xuICBpZiAoZm4gJiYgY2IpIHJldHVybiB3cmFwcHkoZm4pKGNiKVxuXG4gIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbmVlZCB3cmFwcGVyIGZ1bmN0aW9uJylcblxuICBPYmplY3Qua2V5cyhmbikuZm9yRWFjaChmdW5jdGlvbiAoaykge1xuICAgIHdyYXBwZXJba10gPSBmbltrXVxuICB9KVxuXG4gIHJldHVybiB3cmFwcGVyXG5cbiAgZnVuY3Rpb24gd3JhcHBlcigpIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXVxuICAgIH1cbiAgICB2YXIgcmV0ID0gZm4uYXBwbHkodGhpcywgYXJncylcbiAgICB2YXIgY2IgPSBhcmdzW2FyZ3MubGVuZ3RoLTFdXG4gICAgaWYgKHR5cGVvZiByZXQgPT09ICdmdW5jdGlvbicgJiYgcmV0ICE9PSBjYikge1xuICAgICAgT2JqZWN0LmtleXMoY2IpLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICAgICAgcmV0W2tdID0gY2Jba11cbiAgICAgIH0pXG4gICAgfVxuICAgIHJldHVybiByZXRcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiYXNzZXJ0XCIpOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImJ1ZmZlclwiKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJjb25zdGFudHNcIik7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZXZlbnRzXCIpOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImZzXCIpOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIm1vZHVsZVwiKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJwYXRoXCIpOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInN0cmVhbVwiKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJ1dGlsXCIpOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInY4XCIpOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInZtXCIpOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInpsaWJcIik7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwid2Vib3Mtc2VydmljZVwiKTsiLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIG5vdGU6IFRoZSBKUyBzZXJ2aWNlIG11c3QgYmUgcGFja2FnZWQgYWxvbmcgd2l0aCB0aGUgYXBwLlxyXG4vLyBGaWxlIEkvTyBTZXJ2aWNlXHJcbi8vIEEgd2ViT1Mgc2VydmljZSBzYW1wbGUgdXNpbmcgTm9kZS5qcyBmcywgY3J5cHRvIGFuZCB1bnppcCBsaWJyYXJ5IGZ1bmN0aW9uc1xyXG4vKlxyXG5JZiB0aGUgSlMgc2VydmljZSB1c2VzIG1ldGhvZHMgb2YgZXh0ZXJuYWwgc2VydmljZXMsIFxyXG55b3UgbXVzdCBhZGQgdGhlIGdyb3VwIGluZm9ybWF0aW9uIG9mIHRoZSBleHRlcm5hbCBtZXRob2RzIHRvIHRoZSByZXF1aXJlZFBlcm1pc3Npb25zIGZpZWxkIGluIGFwcGluZm8uanNvblxyXG4gb2YgdGhlIGFwcCB1c2VkIGZvciBwYWNrYWdpbmcgdGhlIEpTIHNlcnZpY2UuIFNlZSBDb25maWd1cmluZyB0aGUgV2ViIEFwcCBmb3IgZGV0YWlscy5cclxuKi9cclxuLy9wYWNrYWdlLmpzb24tPmV4dGVybmFscy0+aWdub3JlIGNvbXBpbGUgbGlrZSBAdHMtaWdub3JlXHJcbi8vcmVxdWlyZSBucG0gaW5zdGFsbCBwYXJjZWwtcGx1Z2luLWV4dGVybmFsc1xyXG4vL+WmguaenOWHuueOsGFwcOaXoOazleWuieijheeahOaDheWGte+8jCDkuLvopoHljp/lm6DlsLHmmK9qcy1zZXJ2aWNl5Luj56CB5peg5rOV5omn6KGM5byV6LW377yM5Y+v5Lul6YCa6L+HXHJcbi8vam91cm5hbGN0bCAtUyBcIjEgaG91ciBhZ29cIlxyXG4vL+WRveS7pOafpeeci+WvvOiHtOS7o+eggeaXoOazleaJp+ihjOeahOWOn+WboO+8jCDov5znqIvliLAvbWVkaWEvZGV2ZWxvcGVyL2FwcHMvdXNyL3BsYW1z55uu5b2V5a6a5L2N57G75Ly85LiA5LiL6ZSZ6K+v77yM5YWI6L+c56iL5L+u5aSN77yM5YaN6YeN5paw5a6J6KOFXHJcbi8qXHJcbk9jdCAxNyAxODowNjoxMCByYXNwYmVycnlwaTQgbHMtaHViZFsxNTM0XTogUmVmZXJlbmNlRXJyb3I6IHdlYm9zIGlzIG5vdCBkZWZpbmVkXHJcbk9jdCAxNyAxODowNjoxMCByYXNwYmVycnlwaTQgbHMtaHViZFsxNTM0XTogICAgIGF0IE9iamVjdC4xNTkgKC9tZWRpYS9kZXZlbG9wZXIvYXBwcy91c3IvcGFsbS9zZXJ2aWNlcy9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlL2luZGV4LmpzOjI0OjE4KVxyXG5PY3QgMTcgMTg6MDY6MTAgcmFzcGJlcnJ5cGk0IGxzLWh1YmRbMTUzNF06ICAgICBhdCBfX3dlYnBhY2tfcmVxdWlyZV9fICgvbWVkaWEvZGV2ZWxvcGVyL2FwcHMvdXNyL3BhbG0vc2VydmljZXMvY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS9pbmRleC5qczo1Njo0MSlcclxuT2N0IDE3IDE4OjA2OjEwIHJhc3BiZXJyeXBpNCBscy1odWJkWzE1MzRdOiAgICAgYXQgL21lZGlhL2RldmVsb3Blci9hcHBzL3Vzci9wYWxtL3NlcnZpY2VzL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvaW5kZXguanM6NzY6MTdcclxuT2N0IDE3IDE4OjA2OjEwIHJhc3BiZXJyeXBpNCBscy1odWJkWzE1MzRdOiAgICAgYXQgL21lZGlhL2RldmVsb3Blci9hcHBzL3Vzci9wYWxtL3NlcnZpY2VzL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvaW5kZXguanM6MjY2OjNcclxuT2N0IDE3IDE4OjA2OjEwIHJhc3BiZXJyeXBpNCBscy1odWJkWzE1MzRdOiAgICAgYXQgT2JqZWN0Ljxhbm9ueW1vdXM+ICgvbWVkaWEvZGV2ZWxvcGVyL2FwcHMvdXNyL3BhbG0vc2VydmljZXMvY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS9pbmRleC5qczoyNjg6MTIpXHJcbk9jdCAxNyAxODowNjoxMCByYXNwYmVycnlwaTQgbHMtaHViZFsxNTM0XTogICAgIGF0IE1vZHVsZS5fY29tcGlsZSAoaW50ZXJuYWwvbW9kdWxlcy9janMvbG9hZGVyLmpzOjk5OTozMClcclxuT2N0IDE3IDE4OjA2OjEwIHJhc3BiZXJyeXBpNCBscy1odWJkWzE1MzRdOiAgICAgYXQgT2JqZWN0Lk1vZHVsZS5fZXh0ZW5zaW9ucy4uanMgKGludGVybmFsL21vZHVsZXMvY2pzL2xvYWRlci5qczoxMDI3OjEwKVxyXG5PY3QgMTcgMTg6MDY6MTAgcmFzcGJlcnJ5cGk0IGxzLWh1YmRbMTUzNF06ICAgICBhdCBNb2R1bGUubG9hZCAoaW50ZXJuYWwvbW9kdWxlcy9janMvbG9hZGVyLmpzOjg2MzozMilcclxuT2N0IDE3IDE4OjA2OjEwIHJhc3BiZXJyeXBpNCBscy1odWJkWzE1MzRdOiAgICAgYXQgRnVuY3Rpb24uTW9kdWxlLl9sb2FkIChpbnRlcm5hbC9tb2R1bGVzL2Nqcy9sb2FkZXIuanM6NzA4OjE0KVxyXG5PY3QgMTcgMTg6MDY6MTAgcmFzcGJlcnJ5cGk0IGxzLWh1YmRbMTUzNF06ICAgICBhdCBNb2R1bGUucmVxdWlyZSAoaW50ZXJuYWwvbW9kdWxlcy9janMvbG9hZGVyLmpzOjg4NzoxOSlcclxuKi9cclxuY29uc3QgU2VydmljZSA9IHJlcXVpcmUoXCJ3ZWJvcy1zZXJ2aWNlXCIpO1xyXG5jb25zdCBwa2dJbmZvID0gcmVxdWlyZSgnLi9wYWNrYWdlLmpzb24nKTtcclxuY29uc3Qgc2VydmljZSA9IG5ldyBTZXJ2aWNlKHBrZ0luZm8ubmFtZSk7XHJcbnNlcnZpY2UuYWN0aXZpdHlNYW5hZ2VyLmlkbGVUaW1lb3V0ID0gNVxyXG5cclxuLy9jb25zdCBjcnlwdG8gPSByZXF1aXJlKFwiY3J5cHRvXCIpO1xyXG5jb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcclxuXHJcbi8vIGNvcHlGaWxlXHJcbnNlcnZpY2UucmVnaXN0ZXIoXCJjb3B5RmlsZVwiLCBmdW5jdGlvbihtZXNzYWdlKSB7XHJcbiAgdmFyIG9yaWdpbmFsUGF0aCA9ICBtZXNzYWdlLnBheWxvYWQub3JpZ2luYWxQYXRoO1xyXG4gIHZhciBjb3B5UGF0aCA9ICBtZXNzYWdlLnBheWxvYWQuY29weVBhdGg7XHJcblxyXG4gIC8vIGNyZWF0ZVJlYWRTdHJlYW0gJiBjcmVhdGVXcml0ZVN0cmVhbVxyXG4gIHZhciBpbnB1dEZpbGUgPSBmcy5jcmVhdGVSZWFkU3RyZWFtKG9yaWdpbmFsUGF0aCk7XHJcbiAgdmFyIG91dHB1dEZpbGUgPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShjb3B5UGF0aCk7XHJcblxyXG4gIC8vIEVycm9yIGhhbmRsaW5nXHJcbiAgaW5wdXRGaWxlLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24oZXJyKSB7XHJcbiAgICBtZXNzYWdlLnJlc3BvbmQoe1xyXG4gICAgICByZXR1cm5WYWx1ZTogZmFsc2UsXHJcbiAgICAgIGVycm9yQ29kZTogXCJjb3B5RmlsZSBjcmVhdGVSZWFkU3RyZWFtIEVSUk9SXCIsXHJcbiAgICAgIGVycm9yVGV4dDogZXJyXHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgb3V0cHV0RmlsZS5vbihcImVycm9yXCIsIGZ1bmN0aW9uKGVycikge1xyXG4gICAgbWVzc2FnZS5yZXNwb25kKHtcclxuICAgICAgcmV0dXJuVmFsdWU6IGZhbHNlLFxyXG4gICAgICBlcnJvckNvZGU6IFwiY29weUZpbGUgY3JlYXRlV3JpdGVTdHJlYW0gRVJST1JcIixcclxuICAgICAgZXJyb3JUZXh0OiBlcnJcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICAvLyBEbyBjb3B5ICYgRW5kIGV2ZW50XHJcbiAgaW5wdXRGaWxlLnBpcGUob3V0cHV0RmlsZSkub24oXCJjbG9zZVwiLCBmdW5jdGlvbihlcnIpIHtcclxuICAgIGlmIChlcnIpIHtcclxuICAgICAgbWVzc2FnZS5yZXNwb25kKHtcclxuICAgICAgICByZXR1cm5WYWx1ZTogZmFsc2UsXHJcbiAgICAgICAgZXJyb3JDb2RlOiBcImNvcHlGaWxlIGNyZWF0ZVdyaXRlU3RyZWFtIEVSUk9SXCIsXHJcbiAgICAgICAgZXJyb3JUZXh0OiBlcnJcclxuICAgICAgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBtZXNzYWdlLnJlc3BvbmQoe1xyXG4gICAgICAgIHJldHVyblZhbHVlOiB0cnVlXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH0pO1xyXG59KTtcclxuXHJcbi8vIGV4aXN0c1xyXG5zZXJ2aWNlLnJlZ2lzdGVyKFwiZXhpc3RzXCIsIGZ1bmN0aW9uKG1lc3NhZ2UpIHtcclxuICB2YXIgcGF0aCA9ICBtZXNzYWdlLnBheWxvYWQucGF0aDtcclxuXHJcbiAgZnMuZXhpc3RzKHBhdGgsIGZ1bmN0aW9uKGV4aXN0cykge1xyXG4gICAgbWVzc2FnZS5yZXNwb25kKHtcclxuICAgICAgcmV0dXJuVmFsdWU6IGV4aXN0cyxcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59KTtcclxuXHJcbi8vIGxpc3RGaWxlc1xyXG5zZXJ2aWNlLnJlZ2lzdGVyKFwibGlzdEZpbGVzXCIsIGZ1bmN0aW9uKG1lc3NhZ2UpIHtcclxuICB2YXIgcGF0aCA9ICBtZXNzYWdlLnBheWxvYWQucGF0aDtcclxuXHJcbiAgZnMucmVhZGRpcihwYXRoLCBmdW5jdGlvbihlcnIsIGZpbGVzKSB7XHJcbiAgICBpZiAoZXJyKSB7XHJcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XHJcbiAgICAgICAgcmV0dXJuVmFsdWU6IGZhbHNlLFxyXG4gICAgICAgIGVycm9yQ29kZTogXCJsaXN0RmlsZXMgRVJST1JcIixcclxuICAgICAgICBlcnJvclRleHQ6IGVyclxyXG4gICAgICB9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XHJcbiAgICAgICAgcmV0dXJuVmFsdWU6IHRydWUsXHJcbiAgICAgICAgZmlsZXM6IGZpbGVzXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH0pO1xyXG59KTtcclxuXHJcbi8vIG1rZGlyXHJcbnNlcnZpY2UucmVnaXN0ZXIoXCJta2RpclwiLCBmdW5jdGlvbihtZXNzYWdlKSB7XHJcbiAgdmFyIHBhdGggPSAgbWVzc2FnZS5wYXlsb2FkLnBhdGg7XHJcbiAgY29uc29sZS5sb2coXCJwYXRoXCIsIHBhdGgpO1xyXG4gIGZzLm1rZGlyKHBhdGgsIGZ1bmN0aW9uKGVycikge1xyXG4gICAgaWYgKGVycikge1xyXG4gICAgICBtZXNzYWdlLnJlc3BvbmQoe1xyXG4gICAgICAgIHJldHVyblZhbHVlOiBmYWxzZSxcclxuICAgICAgICBlcnJvckNvZGU6IFwibWtkaXIgRVJST1JcIixcclxuICAgICAgICBlcnJvclRleHQ6IGVyclxyXG4gICAgICB9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XHJcbiAgICAgICAgcmV0dXJuVmFsdWU6IHRydWVcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfSk7XHJcbn0pO1xyXG5cclxuLy8gcm1kaXJcclxuc2VydmljZS5yZWdpc3RlcihcInJtZGlyXCIsIGZ1bmN0aW9uKG1lc3NhZ2UpIHtcclxuICB2YXIgcGF0aCA9ICBtZXNzYWdlLnBheWxvYWQucGF0aDtcclxuXHJcbiAgZnMucm1kaXIocGF0aCwgZnVuY3Rpb24oZXJyKSB7XHJcbiAgICBpZiAoZXJyKSB7XHJcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XHJcbiAgICAgICAgcmV0dXJuVmFsdWU6IGZhbHNlLFxyXG4gICAgICAgIGVycm9yQ29kZTogXCJybWRpciBFUlJPUlwiLFxyXG4gICAgICAgIGVycm9yVGV4dDogZXJyXHJcbiAgICAgIH0pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgbWVzc2FnZS5yZXNwb25kKHtcclxuICAgICAgICByZXR1cm5WYWx1ZTogdHJ1ZVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9KTtcclxufSk7XHJcblxyXG4vLyBtb3ZlRmlsZVxyXG5zZXJ2aWNlLnJlZ2lzdGVyKFwibW92ZUZpbGVcIiwgZnVuY3Rpb24obWVzc2FnZSkge1xyXG4gIHZhciBvcmlnaW5hbFBhdGggPSAgbWVzc2FnZS5wYXlsb2FkLm9yaWdpbmFsUGF0aDtcclxuICB2YXIgZGVzdGluYXRpb25QYXRoID0gIG1lc3NhZ2UucGF5bG9hZC5kZXN0aW5hdGlvblBhdGg7XHJcblxyXG4gIGZzLnJlbmFtZShvcmlnaW5hbFBhdGgsIGRlc3RpbmF0aW9uUGF0aCwgZnVuY3Rpb24oZXJyKSB7XHJcbiAgICBpZiAoZXJyKSB7XHJcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XHJcbiAgICAgICAgcmV0dXJuVmFsdWU6IGZhbHNlLFxyXG4gICAgICAgIGVycm9yQ29kZTogXCJyZW5hbWUgRVJST1JcIixcclxuICAgICAgICBlcnJvclRleHQ6IGVyclxyXG4gICAgICB9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XHJcbiAgICAgICAgcmV0dXJuVmFsdWU6IHRydWVcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfSk7XHJcbn0pO1xyXG5cclxuLy8gcmVhZEZpbGVcclxuc2VydmljZS5yZWdpc3RlcihcInJlYWRGaWxlXCIsIGZ1bmN0aW9uKG1lc3NhZ2UpIHtcclxuICB2YXIgcGF0aCA9ICBtZXNzYWdlLnBheWxvYWQucGF0aDtcclxuICB2YXIgZW5jb2RpbmcgPSBtZXNzYWdlLnBheWxvYWQuZW5jb2Rpbmc7XHJcblxyXG4gIGZzLnJlYWRGaWxlKHBhdGgsIGVuY29kaW5nLCBmdW5jdGlvbihlcnIsIGRhdGEpIHtcclxuICAgIGlmIChlcnIpIHtcclxuICAgICAgbWVzc2FnZS5yZXNwb25kKHtcclxuICAgICAgICByZXR1cm5WYWx1ZTogZmFsc2UsXHJcbiAgICAgICAgZXJyb3JDb2RlOiBcInJlYWRGaWxlIEVSUk9SXCIsXHJcbiAgICAgICAgZXJyb3JUZXh0OiBlcnJcclxuICAgICAgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBtZXNzYWdlLnJlc3BvbmQoe1xyXG4gICAgICAgIHJldHVyblZhbHVlOiB0cnVlLFxyXG4gICAgICAgIGRhdGE6IGRhdGFcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfSk7XHJcbn0pO1xyXG5cclxuLy8gcmVtb3ZlRmlsZVxyXG5zZXJ2aWNlLnJlZ2lzdGVyKFwicmVtb3ZlRmlsZVwiLCBmdW5jdGlvbihtZXNzYWdlKSB7XHJcbiAgdmFyIHBhdGggPSAgbWVzc2FnZS5wYXlsb2FkLnBhdGg7XHJcblxyXG4gIGZzLnVubGluayhwYXRoLCBmdW5jdGlvbihlcnIpIHtcclxuICAgIGlmIChlcnIpIHtcclxuICAgICAgbWVzc2FnZS5yZXNwb25kKHtcclxuICAgICAgICByZXR1cm5WYWx1ZTogZmFsc2UsXHJcbiAgICAgICAgZXJyb3JDb2RlOiBcInJlbW92ZUZpbGUgRVJST1JcIixcclxuICAgICAgICBlcnJvclRleHQ6IGVyclxyXG4gICAgICB9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XHJcbiAgICAgICAgcmV0dXJuVmFsdWU6IHRydWVcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfSk7XHJcbn0pO1xyXG5cclxuLy8gdW56aXBGaWxlXHJcbnNlcnZpY2UucmVnaXN0ZXIoXCJ1bnppcEZpbGVcIiwgZnVuY3Rpb24obWVzc2FnZSkge1xyXG4gIGNvbnN0IHVuemlwID0gcmVxdWlyZShcInVuemlwXCIpO1xyXG5cclxuICB2YXIgemlwRmlsZVBhdGggPSAgbWVzc2FnZS5wYXlsb2FkLnppcEZpbGVQYXRoO1xyXG4gIHZhciBleHRyYWN0VG9EaXJlY3RvcnlQYXRoID0gIG1lc3NhZ2UucGF5bG9hZC5leHRyYWN0VG9EaXJlY3RvcnlQYXRoO1xyXG5cclxuICAvLyBjcmVhdGVSZWFkU3RyZWFtXHJcbiAgdmFyIHJlYWRTdHJlYW0gPSBmcy5jcmVhdGVSZWFkU3RyZWFtKHppcEZpbGVQYXRoKTtcclxuXHJcbiAgLy8gRXJyb3IgaGFuZGxpbmdcclxuICByZWFkU3RyZWFtLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24oZXJyKSB7XHJcbiAgICBtZXNzYWdlLnJlc3BvbmQoe1xyXG4gICAgICByZXR1cm5WYWx1ZTogZmFsc2UsXHJcbiAgICAgIGVycm9yQ29kZTogXCJ1bnppcEZpbGUgY3JlYXRlUmVhZFN0cmVhbSBFUlJPUlwiLFxyXG4gICAgICBlcnJvclRleHQ6IGVyclxyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIC8vIERvIHVuemlwICYgRW5kIGV2ZW50XHJcbiAgcmVhZFN0cmVhbVxyXG4gICAgLnBpcGUoXHJcbiAgICAgIHVuemlwLkV4dHJhY3Qoe1xyXG4gICAgICAgIHBhdGg6IGV4dHJhY3RUb0RpcmVjdG9yeVBhdGhcclxuICAgICAgfSlcclxuICAgIClcclxuICAgIC5vbihcImNsb3NlXCIsIGZ1bmN0aW9uKGVycikge1xyXG4gICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgbWVzc2FnZS5yZXNwb25kKHtcclxuICAgICAgICAgIHJldHVyblZhbHVlOiBmYWxzZSxcclxuICAgICAgICAgIGVycm9yQ29kZTogXCJ1bnppcEZpbGUgRXh0cmFjdCBFUlJPUlwiLFxyXG4gICAgICAgICAgZXJyb3JUZXh0OiBlcnJcclxuICAgICAgICB9KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBtZXNzYWdlLnJlc3BvbmQoe1xyXG4gICAgICAgICAgcmV0dXJuVmFsdWU6IHRydWVcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbn0pO1xyXG5cclxuLy8gd3JpdGVGaWxlXHJcbnNlcnZpY2UucmVnaXN0ZXIoXCJ3cml0ZUZpbGVcIiwgZnVuY3Rpb24obWVzc2FnZSkge1xyXG4gIHZhciBwYXRoID0gIG1lc3NhZ2UucGF5bG9hZC5wYXRoO1xyXG4gIHZhciBkYXRhID0gbWVzc2FnZS5wYXlsb2FkLmRhdGE7XHJcbiAgdmFyIGVuY29kaW5nID0gbWVzc2FnZS5wYXlsb2FkLmVuY29kaW5nO1xyXG5cclxuICBmcy53cml0ZUZpbGUocGF0aCwgZGF0YSwgZW5jb2RpbmcsIGZ1bmN0aW9uKGVycikge1xyXG4gICAgaWYgKGVycikge1xyXG4gICAgICBtZXNzYWdlLnJlc3BvbmQoe1xyXG4gICAgICAgIHJldHVyblZhbHVlOiBmYWxzZSxcclxuICAgICAgICBlcnJvckNvZGU6IFwid3JpdGVGaWxlIEVSUk9SXCIsXHJcbiAgICAgICAgZXJyb3JUZXh0OiBlcnJcclxuICAgICAgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBtZXNzYWdlLnJlc3BvbmQoe1xyXG4gICAgICAgIHJldHVyblZhbHVlOiB0cnVlXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH0pO1xyXG59KSJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==