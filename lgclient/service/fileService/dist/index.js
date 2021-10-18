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
    if (!exists) {
      message.respond({
        returnValue: false,
        errorCode: "-1",
        errorText: "Not found"
      });
    } else {
      message.respond({
        returnValue: true,
        exists: exists
      });
    }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7O0FDN0RBLGVBQWUsbUJBQU8sQ0FBQyxJQUFVO0FBQ2pDLG1CQUFtQixzQ0FBOEI7QUFDakQsY0FBYyxtQkFBTyxDQUFDLElBQVM7QUFDL0IsV0FBVyxtQkFBTyxDQUFDLElBQWU7QUFDbEMsYUFBYSxnQ0FBd0I7O0FBRXJDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBOztBQUVBLGNBQWM7QUFDZDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwyQkFBMkI7QUFDM0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGdEQUFnRDtBQUNoRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQixhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQixhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxrQkFBa0I7QUFDbEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakIsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTs7QUFFQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDRCQUE0QjtBQUM1QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGtDQUFrQztBQUNsQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx3QkFBd0IsaURBQWlEO0FBQ3pFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLG9CQUFvQixrQkFBa0I7QUFDdEM7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0Esb0JBQW9CLGtCQUFrQjtBQUN0QztBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7O0FDNVlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNB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QUMzRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQTtBQUNBLHNCQUFzQixtQ0FBbUM7QUFDekQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBLG9CQUFvQjtBQUNwQixVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBLE1BQU07QUFDTjtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7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OztBQUVBO0FBQ0EsY0FBYztBQUNkOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxLQUFLOztBQUVMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7Ozs7Ozs7QUNwUUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUEsU0FBUyxtQkFBTyxDQUFDLElBQWE7QUFDOUIsY0FBYyxtQkFBTyxDQUFDLElBQWU7QUFDckMsZUFBZSxtQkFBTyxDQUFDLElBQVU7QUFDakMsWUFBWSxtQkFBTyxDQUFDLElBQVE7QUFDNUIsYUFBYSxtQkFBTyxDQUFDLElBQWE7O0FBRWxDOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7OztBQ3BDQTs7QUFFQSxTQUFTLG1CQUFPLENBQUMsSUFBYTtBQUM5QixlQUFlLG1CQUFPLENBQUMsSUFBVTtBQUNqQyxhQUFhLG1CQUFPLENBQUMsR0FBUTtBQUM3QixZQUFZLG1CQUFPLENBQUMsSUFBUTtBQUM1QixXQUFXLG1CQUFPLENBQUMsSUFBTTtBQUN6QjtBQUNBLGNBQWMsbUJBQU8sQ0FBQyxJQUFlO0FBQ3JDLGVBQWUsbUJBQU8sQ0FBQyxJQUFlOztBQUV0QztBQUNBOztBQUVBO0FBQ0E7O0FBRUEsZ0JBQWdCLG1CQUFPLENBQUMsSUFBaUI7QUFDekMsaUJBQWlCLG1CQUFPLENBQUMsSUFBa0I7QUFDM0MsaUJBQWlCLG1CQUFPLENBQUMsSUFBa0I7QUFDM0Msa0JBQWtCLG1CQUFPLENBQUMsSUFBbUI7O0FBRTdDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxjQUFjO0FBQ2Q7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxjQUFjLGlCQUFpQjtBQUMvQjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYLFNBQVM7QUFDVCxPQUFPO0FBQ1A7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsSUFBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSxJQUFJO0FBQ0osNkNBQTZDO0FBQzdDO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QTtBQUNBO0FBQ0Esa0JBQWtCLFNBQVM7QUFDM0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxvQkFBb0Isb0JBQW9CO0FBQ3hDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUEsa0JBQWtCLFNBQVM7QUFDM0I7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUCxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOzs7Ozs7OztBQ2x4QkE7QUFDQTs7QUFFQSxTQUFTLG1CQUFPLENBQUMsSUFBYTtBQUM5QixnQkFBZ0IsbUJBQU8sQ0FBQyxJQUFXO0FBQ25DO0FBQ0EsV0FBVyw4QkFBeUI7QUFDcEMsV0FBVyxtQkFBTyxDQUFDLElBQU07QUFDekIsV0FBVyxtQkFBTyxDQUFDLElBQU07QUFDekIsYUFBYSxtQkFBTyxDQUFDLElBQVE7QUFDN0IsaUJBQWlCLG1CQUFPLENBQUMsSUFBa0I7QUFDM0MsYUFBYSxtQkFBTyxDQUFDLElBQWE7QUFDbEM7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0Esa0JBQWtCLE9BQU87QUFDekI7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0Esa0JBQWtCLG9CQUFvQjtBQUN0QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUEsb0JBQW9CLFNBQVM7QUFDN0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxrQkFBa0IsU0FBUztBQUMzQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0JBQW9CLG9CQUFvQjtBQUN4QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBLGtCQUFrQixTQUFTO0FBQzNCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFF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QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQSxNQUFNO0FBQ04sTUFBTTtBQUNOO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxLQUFLLElBQUk7QUFDVCxLQUFLLEdBQUc7QUFDUixLQUFLLEtBQUs7QUFDVixLQUFLLElBQUksSUFBSSxFQUFFO0FBQ2YsS0FBSyxJQUFJLEVBQUUsSUFBSTtBQUNmO0FBQ0E7QUFDQSxLQUFLLElBQUksT0FBTyxJQUFJO0FBQ3BCLEtBQUssRUFBRSxPQUFPLEVBQUU7QUFDaEI7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLHNCQUFzQixJQUFJO0FBQzFCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxvQ0FBb0MsSUFBSTtBQUN4QztBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLE1BQU07QUFDTixNQUFNO0FBQ047O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsWUFBWTtBQUNaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQSxNQUFNO0FBQ04sSUFBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0NBQW9DLElBQUk7QUFDeEM7QUFDQTtBQUNBO0FBQ0EsZ0NBQWdDLEVBQUUsRUFBRSxLQUFLO0FBQ3pDO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHlDQUF5QyxRQUFRO0FBQ2pEOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnQkFBZ0Isc0JBQXNCO0FBQ3RDO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLDZDQUE2QztBQUM3Qzs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMLEdBQUc7O0FBRUg7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EseUJBQXlCLFFBQVE7QUFDakM7QUFDQTtBQUNBOztBQUVBLGNBQWMsZ0JBQWdCO0FBQzlCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLE1BQU0sNENBQTRDOztBQUVsRDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUixRQUFRO0FBQ1I7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxlQUFlLFNBQVM7QUFDeEI7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Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGtCQUFrQix5QkFBeUI7QUFDM0M7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7QUMzT2E7O0FBRWI7QUFDQTtBQUNBOztBQUVB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OztBQUVBO0FBQ0E7QUFDQTtBQUNBLG9CQUFvQixnREFBd0M7QUFDNUQ7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBLG9CQUFvQixRQUFRO0FBQzVCO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLG9CQUFvQixTQUFTO0FBQzdCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNB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Q0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1AsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBOztBQUVBLGtCQUFrQix5QkFBeUI7QUFDM0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxTQUFTLE9BQU87QUFDaEI7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7OztBQzVOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxvQkFBb0IsZUFBZTtBQUNuQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLG9CQUFvQixtQkFBbUI7QUFDdkM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0wsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1AsTUFBTTtBQUNOO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxHQUFHO0FBQ0gsQ0FBQzs7QUFFRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxHQUFHO0FBQ0gsQ0FBQzs7QUFFRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxHQUFHO0FBQ0gsQ0FBQzs7QUFFRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUCxNQUFNO0FBQ047QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBLEdBQUc7QUFDSCxDQUFDOztBQUVEO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1AsTUFBTTtBQUNOO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxHQUFHO0FBQ0gsQ0FBQzs7QUFFRDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1AsTUFBTTtBQUNOO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxHQUFHO0FBQ0gsQ0FBQzs7QUFFRDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1AsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBLEdBQUc7QUFDSCxDQUFDOztBQUVEO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1AsTUFBTTtBQUNOO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxHQUFHO0FBQ0gsQ0FBQzs7QUFFRDtBQUNBO0FBQ0EsZ0JBQWdCLG1CQUFPLENBQUMsSUFBTzs7QUFFL0I7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTCxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1QsUUFBUTtBQUNSO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQSxLQUFLO0FBQ0wsQ0FBQzs7QUFFRDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUCxNQUFNO0FBQ047QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBLEdBQUc7QUFDSCxDQUFDLEMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2JhbGFuY2VkLW1hdGNoL2luZGV4LmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvYmluYXJ5L2luZGV4LmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvYmluYXJ5L2xpYi92YXJzLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvYnJhY2UtZXhwYW5zaW9uL2luZGV4LmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvYnVmZmVycy9pbmRleC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2NoYWluc2F3L2luZGV4LmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvY29uY2F0LW1hcC9pbmRleC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2NvcmUtdXRpbC1pcy9saWIvdXRpbC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2ZzLnJlYWxwYXRoL2luZGV4LmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZnMucmVhbHBhdGgvb2xkLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZnN0cmVhbS9mc3RyZWFtLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZnN0cmVhbS9saWIvYWJzdHJhY3QuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9mc3RyZWFtL2xpYi9jb2xsZWN0LmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZnN0cmVhbS9saWIvZGlyLXJlYWRlci5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2ZzdHJlYW0vbGliL2Rpci13cml0ZXIuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9mc3RyZWFtL2xpYi9maWxlLXJlYWRlci5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2ZzdHJlYW0vbGliL2ZpbGUtd3JpdGVyLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZnN0cmVhbS9saWIvZ2V0LXR5cGUuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9mc3RyZWFtL2xpYi9saW5rLXJlYWRlci5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2ZzdHJlYW0vbGliL2xpbmstd3JpdGVyLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZnN0cmVhbS9saWIvcHJveHktcmVhZGVyLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZnN0cmVhbS9saWIvcHJveHktd3JpdGVyLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZnN0cmVhbS9saWIvcmVhZGVyLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZnN0cmVhbS9saWIvc29ja2V0LXJlYWRlci5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2ZzdHJlYW0vbGliL3dyaXRlci5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2ZzdHJlYW0vbm9kZV9tb2R1bGVzL2dyYWNlZnVsLWZzL2ZzLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZnN0cmVhbS9ub2RlX21vZHVsZXMvZ3JhY2VmdWwtZnMvZ3JhY2VmdWwtZnMuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9mc3RyZWFtL25vZGVfbW9kdWxlcy9ncmFjZWZ1bC1mcy9wb2x5ZmlsbHMuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9nbG9iL2NvbW1vbi5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2dsb2IvZ2xvYi5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2dsb2Ivc3luYy5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2luZmxpZ2h0L2luZmxpZ2h0LmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHMuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvaXNhcnJheS9pbmRleC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL21hdGNoLXN0cmVhbS9tYXRjaC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL21pbmltYXRjaC9taW5pbWF0Y2guanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9ta2RpcnAvaW5kZXguanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9uYXRpdmVzL2luZGV4LmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvbmF0aXZlc3xzeW5jIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvb25jZS9vbmNlLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvb3Zlci9vdmVybG9hZC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL3BhdGgtaXMtYWJzb2x1dGUvaW5kZXguanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9wdWxsc3RyZWFtL3B1bGxzdHJlYW0uanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vbGliL19zdHJlYW1fZHVwbGV4LmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvcmVhZGFibGUtc3RyZWFtL2xpYi9fc3RyZWFtX3Bhc3N0aHJvdWdoLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvcmVhZGFibGUtc3RyZWFtL2xpYi9fc3RyZWFtX3JlYWRhYmxlLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvcmVhZGFibGUtc3RyZWFtL2xpYi9fc3RyZWFtX3RyYW5zZm9ybS5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9saWIvX3N0cmVhbV93cml0YWJsZS5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9wYXNzdGhyb3VnaC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS90cmFuc2Zvcm0uanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vd3JpdGFibGUuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9yaW1yYWYvcmltcmFmLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvc2V0aW1tZWRpYXRlL3NldEltbWVkaWF0ZS5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL3NsaWNlLXN0cmVhbS9zbGljZXN0cmVhbS5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL3N0cmluZ19kZWNvZGVyL2luZGV4LmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvdHJhdmVyc2UvaW5kZXguanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy91bnppcC9saWIvZW50cnkuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy91bnppcC9saWIvZXh0cmFjdC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL3VuemlwL2xpYi9wYXJzZS5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL3VuemlwL3VuemlwLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvd3JhcHB5L3dyYXBweS5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJhc3NlcnRcIiIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJidWZmZXJcIiIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJjb25zdGFudHNcIiIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJldmVudHNcIiIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJmc1wiIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvZXh0ZXJuYWwgbm9kZS1jb21tb25qcyBcIm1vZHVsZVwiIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvZXh0ZXJuYWwgbm9kZS1jb21tb25qcyBcInBhdGhcIiIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJzdHJlYW1cIiIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJ1dGlsXCIiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS9leHRlcm5hbCBub2RlLWNvbW1vbmpzIFwidjhcIiIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJ2bVwiIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvZXh0ZXJuYWwgbm9kZS1jb21tb25qcyBcInpsaWJcIiIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlL2V4dGVybmFsIHZhciBcInJlcXVpcmUoXFxcIndlYm9zLXNlcnZpY2VcXFwiKVwiIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2Uvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGJhbGFuY2VkO1xuZnVuY3Rpb24gYmFsYW5jZWQoYSwgYiwgc3RyKSB7XG4gIGlmIChhIGluc3RhbmNlb2YgUmVnRXhwKSBhID0gbWF5YmVNYXRjaChhLCBzdHIpO1xuICBpZiAoYiBpbnN0YW5jZW9mIFJlZ0V4cCkgYiA9IG1heWJlTWF0Y2goYiwgc3RyKTtcblxuICB2YXIgciA9IHJhbmdlKGEsIGIsIHN0cik7XG5cbiAgcmV0dXJuIHIgJiYge1xuICAgIHN0YXJ0OiByWzBdLFxuICAgIGVuZDogclsxXSxcbiAgICBwcmU6IHN0ci5zbGljZSgwLCByWzBdKSxcbiAgICBib2R5OiBzdHIuc2xpY2UoclswXSArIGEubGVuZ3RoLCByWzFdKSxcbiAgICBwb3N0OiBzdHIuc2xpY2UoclsxXSArIGIubGVuZ3RoKVxuICB9O1xufVxuXG5mdW5jdGlvbiBtYXliZU1hdGNoKHJlZywgc3RyKSB7XG4gIHZhciBtID0gc3RyLm1hdGNoKHJlZyk7XG4gIHJldHVybiBtID8gbVswXSA6IG51bGw7XG59XG5cbmJhbGFuY2VkLnJhbmdlID0gcmFuZ2U7XG5mdW5jdGlvbiByYW5nZShhLCBiLCBzdHIpIHtcbiAgdmFyIGJlZ3MsIGJlZywgbGVmdCwgcmlnaHQsIHJlc3VsdDtcbiAgdmFyIGFpID0gc3RyLmluZGV4T2YoYSk7XG4gIHZhciBiaSA9IHN0ci5pbmRleE9mKGIsIGFpICsgMSk7XG4gIHZhciBpID0gYWk7XG5cbiAgaWYgKGFpID49IDAgJiYgYmkgPiAwKSB7XG4gICAgaWYoYT09PWIpIHtcbiAgICAgIHJldHVybiBbYWksIGJpXTtcbiAgICB9XG4gICAgYmVncyA9IFtdO1xuICAgIGxlZnQgPSBzdHIubGVuZ3RoO1xuXG4gICAgd2hpbGUgKGkgPj0gMCAmJiAhcmVzdWx0KSB7XG4gICAgICBpZiAoaSA9PSBhaSkge1xuICAgICAgICBiZWdzLnB1c2goaSk7XG4gICAgICAgIGFpID0gc3RyLmluZGV4T2YoYSwgaSArIDEpO1xuICAgICAgfSBlbHNlIGlmIChiZWdzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIHJlc3VsdCA9IFsgYmVncy5wb3AoKSwgYmkgXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJlZyA9IGJlZ3MucG9wKCk7XG4gICAgICAgIGlmIChiZWcgPCBsZWZ0KSB7XG4gICAgICAgICAgbGVmdCA9IGJlZztcbiAgICAgICAgICByaWdodCA9IGJpO1xuICAgICAgICB9XG5cbiAgICAgICAgYmkgPSBzdHIuaW5kZXhPZihiLCBpICsgMSk7XG4gICAgICB9XG5cbiAgICAgIGkgPSBhaSA8IGJpICYmIGFpID49IDAgPyBhaSA6IGJpO1xuICAgIH1cblxuICAgIGlmIChiZWdzLmxlbmd0aCkge1xuICAgICAgcmVzdWx0ID0gWyBsZWZ0LCByaWdodCBdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG4iLCJ2YXIgQ2hhaW5zYXcgPSByZXF1aXJlKCdjaGFpbnNhdycpO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcbnZhciBCdWZmZXJzID0gcmVxdWlyZSgnYnVmZmVycycpO1xudmFyIFZhcnMgPSByZXF1aXJlKCcuL2xpYi92YXJzLmpzJyk7XG52YXIgU3RyZWFtID0gcmVxdWlyZSgnc3RyZWFtJykuU3RyZWFtO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYnVmT3JFbSwgZXZlbnROYW1lKSB7XG4gICAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihidWZPckVtKSkge1xuICAgICAgICByZXR1cm4gZXhwb3J0cy5wYXJzZShidWZPckVtKTtcbiAgICB9XG4gICAgXG4gICAgdmFyIHMgPSBleHBvcnRzLnN0cmVhbSgpO1xuICAgIGlmIChidWZPckVtICYmIGJ1Zk9yRW0ucGlwZSkge1xuICAgICAgICBidWZPckVtLnBpcGUocyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGJ1Zk9yRW0pIHtcbiAgICAgICAgYnVmT3JFbS5vbihldmVudE5hbWUgfHwgJ2RhdGEnLCBmdW5jdGlvbiAoYnVmKSB7XG4gICAgICAgICAgICBzLndyaXRlKGJ1Zik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgYnVmT3JFbS5vbignZW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcy5lbmQoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBzO1xufTtcblxuZXhwb3J0cy5zdHJlYW0gPSBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICBpZiAoaW5wdXQpIHJldHVybiBleHBvcnRzLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgXG4gICAgdmFyIHBlbmRpbmcgPSBudWxsO1xuICAgIGZ1bmN0aW9uIGdldEJ5dGVzIChieXRlcywgY2IsIHNraXApIHtcbiAgICAgICAgcGVuZGluZyA9IHtcbiAgICAgICAgICAgIGJ5dGVzIDogYnl0ZXMsXG4gICAgICAgICAgICBza2lwIDogc2tpcCxcbiAgICAgICAgICAgIGNiIDogZnVuY3Rpb24gKGJ1Zikge1xuICAgICAgICAgICAgICAgIHBlbmRpbmcgPSBudWxsO1xuICAgICAgICAgICAgICAgIGNiKGJ1Zik7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgICAgICBkaXNwYXRjaCgpO1xuICAgIH1cbiAgICBcbiAgICB2YXIgb2Zmc2V0ID0gbnVsbDtcbiAgICBmdW5jdGlvbiBkaXNwYXRjaCAoKSB7XG4gICAgICAgIGlmICghcGVuZGluZykge1xuICAgICAgICAgICAgaWYgKGNhdWdodEVuZCkgZG9uZSA9IHRydWU7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBwZW5kaW5nID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBwZW5kaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgYnl0ZXMgPSBvZmZzZXQgKyBwZW5kaW5nLmJ5dGVzO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoYnVmZmVycy5sZW5ndGggPj0gYnl0ZXMpIHtcbiAgICAgICAgICAgICAgICB2YXIgYnVmO1xuICAgICAgICAgICAgICAgIGlmIChvZmZzZXQgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBidWYgPSBidWZmZXJzLnNwbGljZSgwLCBieXRlcyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcGVuZGluZy5za2lwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWYgPSBidWYuc2xpY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwZW5kaW5nLnNraXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZiA9IGJ1ZmZlcnMuc2xpY2Uob2Zmc2V0LCBieXRlcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ID0gYnl0ZXM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChwZW5kaW5nLnNraXApIHtcbiAgICAgICAgICAgICAgICAgICAgcGVuZGluZy5jYigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGVuZGluZy5jYihidWYpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBmdW5jdGlvbiBidWlsZGVyIChzYXcpIHtcbiAgICAgICAgZnVuY3Rpb24gbmV4dCAoKSB7IGlmICghZG9uZSkgc2F3Lm5leHQoKSB9XG4gICAgICAgIFxuICAgICAgICB2YXIgc2VsZiA9IHdvcmRzKGZ1bmN0aW9uIChieXRlcywgY2IpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgICAgIGdldEJ5dGVzKGJ5dGVzLCBmdW5jdGlvbiAoYnVmKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhcnMuc2V0KG5hbWUsIGNiKGJ1ZikpO1xuICAgICAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHNlbGYudGFwID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICBzYXcubmVzdChjYiwgdmFycy5zdG9yZSk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBzZWxmLmludG8gPSBmdW5jdGlvbiAoa2V5LCBjYikge1xuICAgICAgICAgICAgaWYgKCF2YXJzLmdldChrZXkpKSB2YXJzLnNldChrZXksIHt9KTtcbiAgICAgICAgICAgIHZhciBwYXJlbnQgPSB2YXJzO1xuICAgICAgICAgICAgdmFycyA9IFZhcnMocGFyZW50LmdldChrZXkpKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2F3Lm5lc3QoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNiLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgdGhpcy50YXAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXJzID0gcGFyZW50O1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgdmFycy5zdG9yZSk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBzZWxmLmZsdXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFycy5zdG9yZSA9IHt9O1xuICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgc2VsZi5sb29wID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICB2YXIgZW5kID0gZmFsc2U7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNhdy5uZXN0KGZhbHNlLCBmdW5jdGlvbiBsb29wICgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZhcnMgPSB2YXJzLnN0b3JlO1xuICAgICAgICAgICAgICAgIGNiLmNhbGwodGhpcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBlbmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICAgICAgfSwgdmFycy5zdG9yZSk7XG4gICAgICAgICAgICAgICAgdGhpcy50YXAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZW5kKSBzYXcubmV4dCgpXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgbG9vcC5jYWxsKHRoaXMpXG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIH0sIHZhcnMuc3RvcmUpO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgc2VsZi5idWZmZXIgPSBmdW5jdGlvbiAobmFtZSwgYnl0ZXMpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYnl0ZXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgYnl0ZXMgPSB2YXJzLmdldChieXRlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGdldEJ5dGVzKGJ5dGVzLCBmdW5jdGlvbiAoYnVmKSB7XG4gICAgICAgICAgICAgICAgdmFycy5zZXQobmFtZSwgYnVmKTtcbiAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHNlbGYuc2tpcCA9IGZ1bmN0aW9uIChieXRlcykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBieXRlcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICBieXRlcyA9IHZhcnMuZ2V0KGJ5dGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZ2V0Qnl0ZXMoYnl0ZXMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHNlbGYuc2NhbiA9IGZ1bmN0aW9uIGZpbmQgKG5hbWUsIHNlYXJjaCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzZWFyY2ggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgc2VhcmNoID0gbmV3IEJ1ZmZlcihzZWFyY2gpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihzZWFyY2gpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdzZWFyY2ggbXVzdCBiZSBhIEJ1ZmZlciBvciBhIHN0cmluZycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgdGFrZW4gPSAwO1xuICAgICAgICAgICAgcGVuZGluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgcG9zID0gYnVmZmVycy5pbmRleE9mKHNlYXJjaCwgb2Zmc2V0ICsgdGFrZW4pO1xuICAgICAgICAgICAgICAgIHZhciBpID0gcG9zLW9mZnNldC10YWtlbjtcbiAgICAgICAgICAgICAgICBpZiAocG9zICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBwZW5kaW5nID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9mZnNldCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJzLnNldChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZlcnMuc2xpY2Uob2Zmc2V0LCBvZmZzZXQgKyB0YWtlbiArIGkpXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ICs9IHRha2VuICsgaSArIHNlYXJjaC5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJzLnNldChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZlcnMuc2xpY2UoMCwgdGFrZW4gKyBpKVxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZlcnMuc3BsaWNlKDAsIHRha2VuICsgaSArIHNlYXJjaC5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgICAgICAgICAgZGlzcGF0Y2goKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpID0gTWF0aC5tYXgoYnVmZmVycy5sZW5ndGggLSBzZWFyY2gubGVuZ3RoIC0gb2Zmc2V0IC0gdGFrZW4sIDApO1xuXHRcdFx0XHR9XG4gICAgICAgICAgICAgICAgdGFrZW4gKz0gaTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBkaXNwYXRjaCgpO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgc2VsZi5wZWVrID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICBvZmZzZXQgPSAwO1xuICAgICAgICAgICAgc2F3Lm5lc3QoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNiLmNhbGwodGhpcywgdmFycy5zdG9yZSk7XG4gICAgICAgICAgICAgICAgdGhpcy50YXAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBvZmZzZXQgPSBudWxsO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICB9O1xuICAgIFxuICAgIHZhciBzdHJlYW0gPSBDaGFpbnNhdy5saWdodChidWlsZGVyKTtcbiAgICBzdHJlYW0ud3JpdGFibGUgPSB0cnVlO1xuICAgIFxuICAgIHZhciBidWZmZXJzID0gQnVmZmVycygpO1xuICAgIFxuICAgIHN0cmVhbS53cml0ZSA9IGZ1bmN0aW9uIChidWYpIHtcbiAgICAgICAgYnVmZmVycy5wdXNoKGJ1Zik7XG4gICAgICAgIGRpc3BhdGNoKCk7XG4gICAgfTtcbiAgICBcbiAgICB2YXIgdmFycyA9IFZhcnMoKTtcbiAgICBcbiAgICB2YXIgZG9uZSA9IGZhbHNlLCBjYXVnaHRFbmQgPSBmYWxzZTtcbiAgICBzdHJlYW0uZW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjYXVnaHRFbmQgPSB0cnVlO1xuICAgIH07XG4gICAgXG4gICAgc3RyZWFtLnBpcGUgPSBTdHJlYW0ucHJvdG90eXBlLnBpcGU7XG4gICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoRXZlbnRFbWl0dGVyLnByb3RvdHlwZSkuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICBzdHJlYW1bbmFtZV0gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlW25hbWVdO1xuICAgIH0pO1xuICAgIFxuICAgIHJldHVybiBzdHJlYW07XG59O1xuXG5leHBvcnRzLnBhcnNlID0gZnVuY3Rpb24gcGFyc2UgKGJ1ZmZlcikge1xuICAgIHZhciBzZWxmID0gd29yZHMoZnVuY3Rpb24gKGJ5dGVzLCBjYikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgIGlmIChvZmZzZXQgKyBieXRlcyA8PSBidWZmZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGJ1ZiA9IGJ1ZmZlci5zbGljZShvZmZzZXQsIG9mZnNldCArIGJ5dGVzKTtcbiAgICAgICAgICAgICAgICBvZmZzZXQgKz0gYnl0ZXM7XG4gICAgICAgICAgICAgICAgdmFycy5zZXQobmFtZSwgY2IoYnVmKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXJzLnNldChuYW1lLCBudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9O1xuICAgIH0pO1xuICAgIFxuICAgIHZhciBvZmZzZXQgPSAwO1xuICAgIHZhciB2YXJzID0gVmFycygpO1xuICAgIHNlbGYudmFycyA9IHZhcnMuc3RvcmU7XG4gICAgXG4gICAgc2VsZi50YXAgPSBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgY2IuY2FsbChzZWxmLCB2YXJzLnN0b3JlKTtcbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfTtcbiAgICBcbiAgICBzZWxmLmludG8gPSBmdW5jdGlvbiAoa2V5LCBjYikge1xuICAgICAgICBpZiAoIXZhcnMuZ2V0KGtleSkpIHtcbiAgICAgICAgICAgIHZhcnMuc2V0KGtleSwge30pO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwYXJlbnQgPSB2YXJzO1xuICAgICAgICB2YXJzID0gVmFycyhwYXJlbnQuZ2V0KGtleSkpO1xuICAgICAgICBjYi5jYWxsKHNlbGYsIHZhcnMuc3RvcmUpO1xuICAgICAgICB2YXJzID0gcGFyZW50O1xuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICB9O1xuICAgIFxuICAgIHNlbGYubG9vcCA9IGZ1bmN0aW9uIChjYikge1xuICAgICAgICB2YXIgZW5kID0gZmFsc2U7XG4gICAgICAgIHZhciBlbmRlciA9IGZ1bmN0aW9uICgpIHsgZW5kID0gdHJ1ZSB9O1xuICAgICAgICB3aGlsZSAoZW5kID09PSBmYWxzZSkge1xuICAgICAgICAgICAgY2IuY2FsbChzZWxmLCBlbmRlciwgdmFycy5zdG9yZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfTtcbiAgICBcbiAgICBzZWxmLmJ1ZmZlciA9IGZ1bmN0aW9uIChuYW1lLCBzaXplKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2l6ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHNpemUgPSB2YXJzLmdldChzaXplKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYnVmID0gYnVmZmVyLnNsaWNlKG9mZnNldCwgTWF0aC5taW4oYnVmZmVyLmxlbmd0aCwgb2Zmc2V0ICsgc2l6ZSkpO1xuICAgICAgICBvZmZzZXQgKz0gc2l6ZTtcbiAgICAgICAgdmFycy5zZXQobmFtZSwgYnVmKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgIH07XG4gICAgXG4gICAgc2VsZi5za2lwID0gZnVuY3Rpb24gKGJ5dGVzKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYnl0ZXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBieXRlcyA9IHZhcnMuZ2V0KGJ5dGVzKTtcbiAgICAgICAgfVxuICAgICAgICBvZmZzZXQgKz0gYnl0ZXM7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICB9O1xuICAgIFxuICAgIHNlbGYuc2NhbiA9IGZ1bmN0aW9uIChuYW1lLCBzZWFyY2gpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZWFyY2ggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBzZWFyY2ggPSBuZXcgQnVmZmVyKHNlYXJjaCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihzZWFyY2gpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3NlYXJjaCBtdXN0IGJlIGEgQnVmZmVyIG9yIGEgc3RyaW5nJyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFycy5zZXQobmFtZSwgbnVsbCk7XG4gICAgICAgIFxuICAgICAgICAvLyBzaW1wbGUgYnV0IHNsb3cgc3RyaW5nIHNlYXJjaFxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSArIG9mZnNldCA8PSBidWZmZXIubGVuZ3RoIC0gc2VhcmNoLmxlbmd0aCArIDE7IGkrKykge1xuICAgICAgICAgICAgZm9yIChcbiAgICAgICAgICAgICAgICB2YXIgaiA9IDA7XG4gICAgICAgICAgICAgICAgaiA8IHNlYXJjaC5sZW5ndGggJiYgYnVmZmVyW29mZnNldCtpK2pdID09PSBzZWFyY2hbal07XG4gICAgICAgICAgICAgICAgaisrXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaWYgKGogPT09IHNlYXJjaC5sZW5ndGgpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXJzLnNldChuYW1lLCBidWZmZXIuc2xpY2Uob2Zmc2V0LCBvZmZzZXQgKyBpKSk7XG4gICAgICAgIG9mZnNldCArPSBpICsgc2VhcmNoLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfTtcbiAgICBcbiAgICBzZWxmLnBlZWsgPSBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgdmFyIHdhcyA9IG9mZnNldDtcbiAgICAgICAgY2IuY2FsbChzZWxmLCB2YXJzLnN0b3JlKTtcbiAgICAgICAgb2Zmc2V0ID0gd2FzO1xuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICB9O1xuICAgIFxuICAgIHNlbGYuZmx1c2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhcnMuc3RvcmUgPSB7fTtcbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfTtcbiAgICBcbiAgICBzZWxmLmVvZiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG9mZnNldCA+PSBidWZmZXIubGVuZ3RoO1xuICAgIH07XG4gICAgXG4gICAgcmV0dXJuIHNlbGY7XG59O1xuXG4vLyBjb252ZXJ0IGJ5dGUgc3RyaW5ncyB0byB1bnNpZ25lZCBsaXR0bGUgZW5kaWFuIG51bWJlcnNcbmZ1bmN0aW9uIGRlY29kZUxFdSAoYnl0ZXMpIHtcbiAgICB2YXIgYWNjID0gMDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGFjYyArPSBNYXRoLnBvdygyNTYsaSkgKiBieXRlc1tpXTtcbiAgICB9XG4gICAgcmV0dXJuIGFjYztcbn1cblxuLy8gY29udmVydCBieXRlIHN0cmluZ3MgdG8gdW5zaWduZWQgYmlnIGVuZGlhbiBudW1iZXJzXG5mdW5jdGlvbiBkZWNvZGVCRXUgKGJ5dGVzKSB7XG4gICAgdmFyIGFjYyA9IDA7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBhY2MgKz0gTWF0aC5wb3coMjU2LCBieXRlcy5sZW5ndGggLSBpIC0gMSkgKiBieXRlc1tpXTtcbiAgICB9XG4gICAgcmV0dXJuIGFjYztcbn1cblxuLy8gY29udmVydCBieXRlIHN0cmluZ3MgdG8gc2lnbmVkIGJpZyBlbmRpYW4gbnVtYmVyc1xuZnVuY3Rpb24gZGVjb2RlQkVzIChieXRlcykge1xuICAgIHZhciB2YWwgPSBkZWNvZGVCRXUoYnl0ZXMpO1xuICAgIGlmICgoYnl0ZXNbMF0gJiAweDgwKSA9PSAweDgwKSB7XG4gICAgICAgIHZhbCAtPSBNYXRoLnBvdygyNTYsIGJ5dGVzLmxlbmd0aCk7XG4gICAgfVxuICAgIHJldHVybiB2YWw7XG59XG5cbi8vIGNvbnZlcnQgYnl0ZSBzdHJpbmdzIHRvIHNpZ25lZCBsaXR0bGUgZW5kaWFuIG51bWJlcnNcbmZ1bmN0aW9uIGRlY29kZUxFcyAoYnl0ZXMpIHtcbiAgICB2YXIgdmFsID0gZGVjb2RlTEV1KGJ5dGVzKTtcbiAgICBpZiAoKGJ5dGVzW2J5dGVzLmxlbmd0aCAtIDFdICYgMHg4MCkgPT0gMHg4MCkge1xuICAgICAgICB2YWwgLT0gTWF0aC5wb3coMjU2LCBieXRlcy5sZW5ndGgpO1xuICAgIH1cbiAgICByZXR1cm4gdmFsO1xufVxuXG5mdW5jdGlvbiB3b3JkcyAoZGVjb2RlKSB7XG4gICAgdmFyIHNlbGYgPSB7fTtcbiAgICBcbiAgICBbIDEsIDIsIDQsIDggXS5mb3JFYWNoKGZ1bmN0aW9uIChieXRlcykge1xuICAgICAgICB2YXIgYml0cyA9IGJ5dGVzICogODtcbiAgICAgICAgXG4gICAgICAgIHNlbGZbJ3dvcmQnICsgYml0cyArICdsZSddXG4gICAgICAgID0gc2VsZlsnd29yZCcgKyBiaXRzICsgJ2x1J11cbiAgICAgICAgPSBkZWNvZGUoYnl0ZXMsIGRlY29kZUxFdSk7XG4gICAgICAgIFxuICAgICAgICBzZWxmWyd3b3JkJyArIGJpdHMgKyAnbHMnXVxuICAgICAgICA9IGRlY29kZShieXRlcywgZGVjb2RlTEVzKTtcbiAgICAgICAgXG4gICAgICAgIHNlbGZbJ3dvcmQnICsgYml0cyArICdiZSddXG4gICAgICAgID0gc2VsZlsnd29yZCcgKyBiaXRzICsgJ2J1J11cbiAgICAgICAgPSBkZWNvZGUoYnl0ZXMsIGRlY29kZUJFdSk7XG4gICAgICAgIFxuICAgICAgICBzZWxmWyd3b3JkJyArIGJpdHMgKyAnYnMnXVxuICAgICAgICA9IGRlY29kZShieXRlcywgZGVjb2RlQkVzKTtcbiAgICB9KTtcbiAgICBcbiAgICAvLyB3b3JkOGJlKG4pID09IHdvcmQ4bGUobikgZm9yIGFsbCBuXG4gICAgc2VsZi53b3JkOCA9IHNlbGYud29yZDh1ID0gc2VsZi53b3JkOGJlO1xuICAgIHNlbGYud29yZDhzID0gc2VsZi53b3JkOGJzO1xuICAgIFxuICAgIHJldHVybiBzZWxmO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3RvcmUpIHtcbiAgICBmdW5jdGlvbiBnZXRzZXQgKG5hbWUsIHZhbHVlKSB7XG4gICAgICAgIHZhciBub2RlID0gdmFycy5zdG9yZTtcbiAgICAgICAgdmFyIGtleXMgPSBuYW1lLnNwbGl0KCcuJyk7XG4gICAgICAgIGtleXMuc2xpY2UoMCwtMSkuZm9yRWFjaChmdW5jdGlvbiAoaykge1xuICAgICAgICAgICAgaWYgKG5vZGVba10gPT09IHVuZGVmaW5lZCkgbm9kZVtrXSA9IHt9O1xuICAgICAgICAgICAgbm9kZSA9IG5vZGVba11cbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBrZXkgPSBrZXlzW2tleXMubGVuZ3RoIC0gMV07XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiBub2RlW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbm9kZVtrZXldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgdmFyIHZhcnMgPSB7XG4gICAgICAgIGdldCA6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0c2V0KG5hbWUpO1xuICAgICAgICB9LFxuICAgICAgICBzZXQgOiBmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRzZXQobmFtZSwgdmFsdWUpO1xuICAgICAgICB9LFxuICAgICAgICBzdG9yZSA6IHN0b3JlIHx8IHt9LFxuICAgIH07XG4gICAgcmV0dXJuIHZhcnM7XG59O1xuIiwidmFyIGNvbmNhdE1hcCA9IHJlcXVpcmUoJ2NvbmNhdC1tYXAnKTtcbnZhciBiYWxhbmNlZCA9IHJlcXVpcmUoJ2JhbGFuY2VkLW1hdGNoJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwYW5kVG9wO1xuXG52YXIgZXNjU2xhc2ggPSAnXFwwU0xBU0gnK01hdGgucmFuZG9tKCkrJ1xcMCc7XG52YXIgZXNjT3BlbiA9ICdcXDBPUEVOJytNYXRoLnJhbmRvbSgpKydcXDAnO1xudmFyIGVzY0Nsb3NlID0gJ1xcMENMT1NFJytNYXRoLnJhbmRvbSgpKydcXDAnO1xudmFyIGVzY0NvbW1hID0gJ1xcMENPTU1BJytNYXRoLnJhbmRvbSgpKydcXDAnO1xudmFyIGVzY1BlcmlvZCA9ICdcXDBQRVJJT0QnK01hdGgucmFuZG9tKCkrJ1xcMCc7XG5cbmZ1bmN0aW9uIG51bWVyaWMoc3RyKSB7XG4gIHJldHVybiBwYXJzZUludChzdHIsIDEwKSA9PSBzdHJcbiAgICA/IHBhcnNlSW50KHN0ciwgMTApXG4gICAgOiBzdHIuY2hhckNvZGVBdCgwKTtcbn1cblxuZnVuY3Rpb24gZXNjYXBlQnJhY2VzKHN0cikge1xuICByZXR1cm4gc3RyLnNwbGl0KCdcXFxcXFxcXCcpLmpvaW4oZXNjU2xhc2gpXG4gICAgICAgICAgICAuc3BsaXQoJ1xcXFx7Jykuam9pbihlc2NPcGVuKVxuICAgICAgICAgICAgLnNwbGl0KCdcXFxcfScpLmpvaW4oZXNjQ2xvc2UpXG4gICAgICAgICAgICAuc3BsaXQoJ1xcXFwsJykuam9pbihlc2NDb21tYSlcbiAgICAgICAgICAgIC5zcGxpdCgnXFxcXC4nKS5qb2luKGVzY1BlcmlvZCk7XG59XG5cbmZ1bmN0aW9uIHVuZXNjYXBlQnJhY2VzKHN0cikge1xuICByZXR1cm4gc3RyLnNwbGl0KGVzY1NsYXNoKS5qb2luKCdcXFxcJylcbiAgICAgICAgICAgIC5zcGxpdChlc2NPcGVuKS5qb2luKCd7JylcbiAgICAgICAgICAgIC5zcGxpdChlc2NDbG9zZSkuam9pbignfScpXG4gICAgICAgICAgICAuc3BsaXQoZXNjQ29tbWEpLmpvaW4oJywnKVxuICAgICAgICAgICAgLnNwbGl0KGVzY1BlcmlvZCkuam9pbignLicpO1xufVxuXG5cbi8vIEJhc2ljYWxseSBqdXN0IHN0ci5zcGxpdChcIixcIiksIGJ1dCBoYW5kbGluZyBjYXNlc1xuLy8gd2hlcmUgd2UgaGF2ZSBuZXN0ZWQgYnJhY2VkIHNlY3Rpb25zLCB3aGljaCBzaG91bGQgYmVcbi8vIHRyZWF0ZWQgYXMgaW5kaXZpZHVhbCBtZW1iZXJzLCBsaWtlIHthLHtiLGN9LGR9XG5mdW5jdGlvbiBwYXJzZUNvbW1hUGFydHMoc3RyKSB7XG4gIGlmICghc3RyKVxuICAgIHJldHVybiBbJyddO1xuXG4gIHZhciBwYXJ0cyA9IFtdO1xuICB2YXIgbSA9IGJhbGFuY2VkKCd7JywgJ30nLCBzdHIpO1xuXG4gIGlmICghbSlcbiAgICByZXR1cm4gc3RyLnNwbGl0KCcsJyk7XG5cbiAgdmFyIHByZSA9IG0ucHJlO1xuICB2YXIgYm9keSA9IG0uYm9keTtcbiAgdmFyIHBvc3QgPSBtLnBvc3Q7XG4gIHZhciBwID0gcHJlLnNwbGl0KCcsJyk7XG5cbiAgcFtwLmxlbmd0aC0xXSArPSAneycgKyBib2R5ICsgJ30nO1xuICB2YXIgcG9zdFBhcnRzID0gcGFyc2VDb21tYVBhcnRzKHBvc3QpO1xuICBpZiAocG9zdC5sZW5ndGgpIHtcbiAgICBwW3AubGVuZ3RoLTFdICs9IHBvc3RQYXJ0cy5zaGlmdCgpO1xuICAgIHAucHVzaC5hcHBseShwLCBwb3N0UGFydHMpO1xuICB9XG5cbiAgcGFydHMucHVzaC5hcHBseShwYXJ0cywgcCk7XG5cbiAgcmV0dXJuIHBhcnRzO1xufVxuXG5mdW5jdGlvbiBleHBhbmRUb3Aoc3RyKSB7XG4gIGlmICghc3RyKVxuICAgIHJldHVybiBbXTtcblxuICAvLyBJIGRvbid0IGtub3cgd2h5IEJhc2ggNC4zIGRvZXMgdGhpcywgYnV0IGl0IGRvZXMuXG4gIC8vIEFueXRoaW5nIHN0YXJ0aW5nIHdpdGgge30gd2lsbCBoYXZlIHRoZSBmaXJzdCB0d28gYnl0ZXMgcHJlc2VydmVkXG4gIC8vIGJ1dCAqb25seSogYXQgdGhlIHRvcCBsZXZlbCwgc28ge30sYX1iIHdpbGwgbm90IGV4cGFuZCB0byBhbnl0aGluZyxcbiAgLy8gYnV0IGF7fSxifWMgd2lsbCBiZSBleHBhbmRlZCB0byBbYX1jLGFiY10uXG4gIC8vIE9uZSBjb3VsZCBhcmd1ZSB0aGF0IHRoaXMgaXMgYSBidWcgaW4gQmFzaCwgYnV0IHNpbmNlIHRoZSBnb2FsIG9mXG4gIC8vIHRoaXMgbW9kdWxlIGlzIHRvIG1hdGNoIEJhc2gncyBydWxlcywgd2UgZXNjYXBlIGEgbGVhZGluZyB7fVxuICBpZiAoc3RyLnN1YnN0cigwLCAyKSA9PT0gJ3t9Jykge1xuICAgIHN0ciA9ICdcXFxce1xcXFx9JyArIHN0ci5zdWJzdHIoMik7XG4gIH1cblxuICByZXR1cm4gZXhwYW5kKGVzY2FwZUJyYWNlcyhzdHIpLCB0cnVlKS5tYXAodW5lc2NhcGVCcmFjZXMpO1xufVxuXG5mdW5jdGlvbiBpZGVudGl0eShlKSB7XG4gIHJldHVybiBlO1xufVxuXG5mdW5jdGlvbiBlbWJyYWNlKHN0cikge1xuICByZXR1cm4gJ3snICsgc3RyICsgJ30nO1xufVxuZnVuY3Rpb24gaXNQYWRkZWQoZWwpIHtcbiAgcmV0dXJuIC9eLT8wXFxkLy50ZXN0KGVsKTtcbn1cblxuZnVuY3Rpb24gbHRlKGksIHkpIHtcbiAgcmV0dXJuIGkgPD0geTtcbn1cbmZ1bmN0aW9uIGd0ZShpLCB5KSB7XG4gIHJldHVybiBpID49IHk7XG59XG5cbmZ1bmN0aW9uIGV4cGFuZChzdHIsIGlzVG9wKSB7XG4gIHZhciBleHBhbnNpb25zID0gW107XG5cbiAgdmFyIG0gPSBiYWxhbmNlZCgneycsICd9Jywgc3RyKTtcbiAgaWYgKCFtIHx8IC9cXCQkLy50ZXN0KG0ucHJlKSkgcmV0dXJuIFtzdHJdO1xuXG4gIHZhciBpc051bWVyaWNTZXF1ZW5jZSA9IC9eLT9cXGQrXFwuXFwuLT9cXGQrKD86XFwuXFwuLT9cXGQrKT8kLy50ZXN0KG0uYm9keSk7XG4gIHZhciBpc0FscGhhU2VxdWVuY2UgPSAvXlthLXpBLVpdXFwuXFwuW2EtekEtWl0oPzpcXC5cXC4tP1xcZCspPyQvLnRlc3QobS5ib2R5KTtcbiAgdmFyIGlzU2VxdWVuY2UgPSBpc051bWVyaWNTZXF1ZW5jZSB8fCBpc0FscGhhU2VxdWVuY2U7XG4gIHZhciBpc09wdGlvbnMgPSBtLmJvZHkuaW5kZXhPZignLCcpID49IDA7XG4gIGlmICghaXNTZXF1ZW5jZSAmJiAhaXNPcHRpb25zKSB7XG4gICAgLy8ge2F9LGJ9XG4gICAgaWYgKG0ucG9zdC5tYXRjaCgvLC4qXFx9LykpIHtcbiAgICAgIHN0ciA9IG0ucHJlICsgJ3snICsgbS5ib2R5ICsgZXNjQ2xvc2UgKyBtLnBvc3Q7XG4gICAgICByZXR1cm4gZXhwYW5kKHN0cik7XG4gICAgfVxuICAgIHJldHVybiBbc3RyXTtcbiAgfVxuXG4gIHZhciBuO1xuICBpZiAoaXNTZXF1ZW5jZSkge1xuICAgIG4gPSBtLmJvZHkuc3BsaXQoL1xcLlxcLi8pO1xuICB9IGVsc2Uge1xuICAgIG4gPSBwYXJzZUNvbW1hUGFydHMobS5ib2R5KTtcbiAgICBpZiAobi5sZW5ndGggPT09IDEpIHtcbiAgICAgIC8vIHh7e2EsYn19eSA9PT4geHthfXkgeHtifXlcbiAgICAgIG4gPSBleHBhbmQoblswXSwgZmFsc2UpLm1hcChlbWJyYWNlKTtcbiAgICAgIGlmIChuLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICB2YXIgcG9zdCA9IG0ucG9zdC5sZW5ndGhcbiAgICAgICAgICA/IGV4cGFuZChtLnBvc3QsIGZhbHNlKVxuICAgICAgICAgIDogWycnXTtcbiAgICAgICAgcmV0dXJuIHBvc3QubWFwKGZ1bmN0aW9uKHApIHtcbiAgICAgICAgICByZXR1cm4gbS5wcmUgKyBuWzBdICsgcDtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gYXQgdGhpcyBwb2ludCwgbiBpcyB0aGUgcGFydHMsIGFuZCB3ZSBrbm93IGl0J3Mgbm90IGEgY29tbWEgc2V0XG4gIC8vIHdpdGggYSBzaW5nbGUgZW50cnkuXG5cbiAgLy8gbm8gbmVlZCB0byBleHBhbmQgcHJlLCBzaW5jZSBpdCBpcyBndWFyYW50ZWVkIHRvIGJlIGZyZWUgb2YgYnJhY2Utc2V0c1xuICB2YXIgcHJlID0gbS5wcmU7XG4gIHZhciBwb3N0ID0gbS5wb3N0Lmxlbmd0aFxuICAgID8gZXhwYW5kKG0ucG9zdCwgZmFsc2UpXG4gICAgOiBbJyddO1xuXG4gIHZhciBOO1xuXG4gIGlmIChpc1NlcXVlbmNlKSB7XG4gICAgdmFyIHggPSBudW1lcmljKG5bMF0pO1xuICAgIHZhciB5ID0gbnVtZXJpYyhuWzFdKTtcbiAgICB2YXIgd2lkdGggPSBNYXRoLm1heChuWzBdLmxlbmd0aCwgblsxXS5sZW5ndGgpXG4gICAgdmFyIGluY3IgPSBuLmxlbmd0aCA9PSAzXG4gICAgICA/IE1hdGguYWJzKG51bWVyaWMoblsyXSkpXG4gICAgICA6IDE7XG4gICAgdmFyIHRlc3QgPSBsdGU7XG4gICAgdmFyIHJldmVyc2UgPSB5IDwgeDtcbiAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgaW5jciAqPSAtMTtcbiAgICAgIHRlc3QgPSBndGU7XG4gICAgfVxuICAgIHZhciBwYWQgPSBuLnNvbWUoaXNQYWRkZWQpO1xuXG4gICAgTiA9IFtdO1xuXG4gICAgZm9yICh2YXIgaSA9IHg7IHRlc3QoaSwgeSk7IGkgKz0gaW5jcikge1xuICAgICAgdmFyIGM7XG4gICAgICBpZiAoaXNBbHBoYVNlcXVlbmNlKSB7XG4gICAgICAgIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGkpO1xuICAgICAgICBpZiAoYyA9PT0gJ1xcXFwnKVxuICAgICAgICAgIGMgPSAnJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGMgPSBTdHJpbmcoaSk7XG4gICAgICAgIGlmIChwYWQpIHtcbiAgICAgICAgICB2YXIgbmVlZCA9IHdpZHRoIC0gYy5sZW5ndGg7XG4gICAgICAgICAgaWYgKG5lZWQgPiAwKSB7XG4gICAgICAgICAgICB2YXIgeiA9IG5ldyBBcnJheShuZWVkICsgMSkuam9pbignMCcpO1xuICAgICAgICAgICAgaWYgKGkgPCAwKVxuICAgICAgICAgICAgICBjID0gJy0nICsgeiArIGMuc2xpY2UoMSk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIGMgPSB6ICsgYztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIE4ucHVzaChjKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgTiA9IGNvbmNhdE1hcChuLCBmdW5jdGlvbihlbCkgeyByZXR1cm4gZXhwYW5kKGVsLCBmYWxzZSkgfSk7XG4gIH1cblxuICBmb3IgKHZhciBqID0gMDsgaiA8IE4ubGVuZ3RoOyBqKyspIHtcbiAgICBmb3IgKHZhciBrID0gMDsgayA8IHBvc3QubGVuZ3RoOyBrKyspIHtcbiAgICAgIHZhciBleHBhbnNpb24gPSBwcmUgKyBOW2pdICsgcG9zdFtrXTtcbiAgICAgIGlmICghaXNUb3AgfHwgaXNTZXF1ZW5jZSB8fCBleHBhbnNpb24pXG4gICAgICAgIGV4cGFuc2lvbnMucHVzaChleHBhbnNpb24pO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBleHBhbnNpb25zO1xufVxuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IEJ1ZmZlcnM7XG5cbmZ1bmN0aW9uIEJ1ZmZlcnMgKGJ1ZnMpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQnVmZmVycykpIHJldHVybiBuZXcgQnVmZmVycyhidWZzKTtcbiAgICB0aGlzLmJ1ZmZlcnMgPSBidWZzIHx8IFtdO1xuICAgIHRoaXMubGVuZ3RoID0gdGhpcy5idWZmZXJzLnJlZHVjZShmdW5jdGlvbiAoc2l6ZSwgYnVmKSB7XG4gICAgICAgIHJldHVybiBzaXplICsgYnVmLmxlbmd0aFxuICAgIH0sIDApO1xufVxuXG5CdWZmZXJzLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKGFyZ3VtZW50c1tpXSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RyaWVkIHRvIHB1c2ggYSBub24tYnVmZmVyJyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGJ1ZiA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgdGhpcy5idWZmZXJzLnB1c2goYnVmKTtcbiAgICAgICAgdGhpcy5sZW5ndGggKz0gYnVmLmxlbmd0aDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubGVuZ3RoO1xufTtcblxuQnVmZmVycy5wcm90b3R5cGUudW5zaGlmdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihhcmd1bWVudHNbaV0pKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUcmllZCB0byB1bnNoaWZ0IGEgbm9uLWJ1ZmZlcicpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBidWYgPSBhcmd1bWVudHNbaV07XG4gICAgICAgIHRoaXMuYnVmZmVycy51bnNoaWZ0KGJ1Zik7XG4gICAgICAgIHRoaXMubGVuZ3RoICs9IGJ1Zi5sZW5ndGg7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmxlbmd0aDtcbn07XG5cbkJ1ZmZlcnMucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiAoZHN0LCBkU3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgICByZXR1cm4gdGhpcy5zbGljZShzdGFydCwgZW5kKS5jb3B5KGRzdCwgZFN0YXJ0LCAwLCBlbmQgLSBzdGFydCk7XG59O1xuXG5CdWZmZXJzLnByb3RvdHlwZS5zcGxpY2UgPSBmdW5jdGlvbiAoaSwgaG93TWFueSkge1xuICAgIHZhciBidWZmZXJzID0gdGhpcy5idWZmZXJzO1xuICAgIHZhciBpbmRleCA9IGkgPj0gMCA/IGkgOiB0aGlzLmxlbmd0aCAtIGk7XG4gICAgdmFyIHJlcHMgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgXG4gICAgaWYgKGhvd01hbnkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBob3dNYW55ID0gdGhpcy5sZW5ndGggLSBpbmRleDtcbiAgICB9XG4gICAgZWxzZSBpZiAoaG93TWFueSA+IHRoaXMubGVuZ3RoIC0gaW5kZXgpIHtcbiAgICAgICAgaG93TWFueSA9IHRoaXMubGVuZ3RoIC0gaW5kZXg7XG4gICAgfVxuICAgIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVwcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLmxlbmd0aCArPSByZXBzW2ldLmxlbmd0aDtcbiAgICB9XG4gICAgXG4gICAgdmFyIHJlbW92ZWQgPSBuZXcgQnVmZmVycygpO1xuICAgIHZhciBieXRlcyA9IDA7XG4gICAgXG4gICAgdmFyIHN0YXJ0Qnl0ZXMgPSAwO1xuICAgIGZvciAoXG4gICAgICAgIHZhciBpaSA9IDA7XG4gICAgICAgIGlpIDwgYnVmZmVycy5sZW5ndGggJiYgc3RhcnRCeXRlcyArIGJ1ZmZlcnNbaWldLmxlbmd0aCA8IGluZGV4O1xuICAgICAgICBpaSArK1xuICAgICkgeyBzdGFydEJ5dGVzICs9IGJ1ZmZlcnNbaWldLmxlbmd0aCB9XG4gICAgXG4gICAgaWYgKGluZGV4IC0gc3RhcnRCeXRlcyA+IDApIHtcbiAgICAgICAgdmFyIHN0YXJ0ID0gaW5kZXggLSBzdGFydEJ5dGVzO1xuICAgICAgICBcbiAgICAgICAgaWYgKHN0YXJ0ICsgaG93TWFueSA8IGJ1ZmZlcnNbaWldLmxlbmd0aCkge1xuICAgICAgICAgICAgcmVtb3ZlZC5wdXNoKGJ1ZmZlcnNbaWldLnNsaWNlKHN0YXJ0LCBzdGFydCArIGhvd01hbnkpKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIG9yaWcgPSBidWZmZXJzW2lpXTtcbiAgICAgICAgICAgIC8vdmFyIGJ1ZiA9IG5ldyBCdWZmZXIob3JpZy5sZW5ndGggLSBob3dNYW55KTtcbiAgICAgICAgICAgIHZhciBidWYwID0gbmV3IEJ1ZmZlcihzdGFydCk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0YXJ0OyBpKyspIHtcbiAgICAgICAgICAgICAgICBidWYwW2ldID0gb3JpZ1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGJ1ZjEgPSBuZXcgQnVmZmVyKG9yaWcubGVuZ3RoIC0gc3RhcnQgLSBob3dNYW55KTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSBzdGFydCArIGhvd01hbnk7IGkgPCBvcmlnLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgYnVmMVsgaSAtIGhvd01hbnkgLSBzdGFydCBdID0gb3JpZ1tpXVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVwcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlcHNfID0gcmVwcy5zbGljZSgpO1xuICAgICAgICAgICAgICAgIHJlcHNfLnVuc2hpZnQoYnVmMCk7XG4gICAgICAgICAgICAgICAgcmVwc18ucHVzaChidWYxKTtcbiAgICAgICAgICAgICAgICBidWZmZXJzLnNwbGljZS5hcHBseShidWZmZXJzLCBbIGlpLCAxIF0uY29uY2F0KHJlcHNfKSk7XG4gICAgICAgICAgICAgICAgaWkgKz0gcmVwc18ubGVuZ3RoO1xuICAgICAgICAgICAgICAgIHJlcHMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGJ1ZmZlcnMuc3BsaWNlKGlpLCAxLCBidWYwLCBidWYxKTtcbiAgICAgICAgICAgICAgICAvL2J1ZmZlcnNbaWldID0gYnVmO1xuICAgICAgICAgICAgICAgIGlpICs9IDI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZW1vdmVkLnB1c2goYnVmZmVyc1tpaV0uc2xpY2Uoc3RhcnQpKTtcbiAgICAgICAgICAgIGJ1ZmZlcnNbaWldID0gYnVmZmVyc1tpaV0uc2xpY2UoMCwgc3RhcnQpO1xuICAgICAgICAgICAgaWkgKys7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgaWYgKHJlcHMubGVuZ3RoID4gMCkge1xuICAgICAgICBidWZmZXJzLnNwbGljZS5hcHBseShidWZmZXJzLCBbIGlpLCAwIF0uY29uY2F0KHJlcHMpKTtcbiAgICAgICAgaWkgKz0gcmVwcy5sZW5ndGg7XG4gICAgfVxuICAgIFxuICAgIHdoaWxlIChyZW1vdmVkLmxlbmd0aCA8IGhvd01hbnkpIHtcbiAgICAgICAgdmFyIGJ1ZiA9IGJ1ZmZlcnNbaWldO1xuICAgICAgICB2YXIgbGVuID0gYnVmLmxlbmd0aDtcbiAgICAgICAgdmFyIHRha2UgPSBNYXRoLm1pbihsZW4sIGhvd01hbnkgLSByZW1vdmVkLmxlbmd0aCk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGFrZSA9PT0gbGVuKSB7XG4gICAgICAgICAgICByZW1vdmVkLnB1c2goYnVmKTtcbiAgICAgICAgICAgIGJ1ZmZlcnMuc3BsaWNlKGlpLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlbW92ZWQucHVzaChidWYuc2xpY2UoMCwgdGFrZSkpO1xuICAgICAgICAgICAgYnVmZmVyc1tpaV0gPSBidWZmZXJzW2lpXS5zbGljZSh0YWtlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICB0aGlzLmxlbmd0aCAtPSByZW1vdmVkLmxlbmd0aDtcbiAgICBcbiAgICByZXR1cm4gcmVtb3ZlZDtcbn07XG4gXG5CdWZmZXJzLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIChpLCBqKSB7XG4gICAgdmFyIGJ1ZmZlcnMgPSB0aGlzLmJ1ZmZlcnM7XG4gICAgaWYgKGogPT09IHVuZGVmaW5lZCkgaiA9IHRoaXMubGVuZ3RoO1xuICAgIGlmIChpID09PSB1bmRlZmluZWQpIGkgPSAwO1xuICAgIFxuICAgIGlmIChqID4gdGhpcy5sZW5ndGgpIGogPSB0aGlzLmxlbmd0aDtcbiAgICBcbiAgICB2YXIgc3RhcnRCeXRlcyA9IDA7XG4gICAgZm9yIChcbiAgICAgICAgdmFyIHNpID0gMDtcbiAgICAgICAgc2kgPCBidWZmZXJzLmxlbmd0aCAmJiBzdGFydEJ5dGVzICsgYnVmZmVyc1tzaV0ubGVuZ3RoIDw9IGk7XG4gICAgICAgIHNpICsrXG4gICAgKSB7IHN0YXJ0Qnl0ZXMgKz0gYnVmZmVyc1tzaV0ubGVuZ3RoIH1cbiAgICBcbiAgICB2YXIgdGFyZ2V0ID0gbmV3IEJ1ZmZlcihqIC0gaSk7XG4gICAgXG4gICAgdmFyIHRpID0gMDtcbiAgICBmb3IgKHZhciBpaSA9IHNpOyB0aSA8IGogLSBpICYmIGlpIDwgYnVmZmVycy5sZW5ndGg7IGlpKyspIHtcbiAgICAgICAgdmFyIGxlbiA9IGJ1ZmZlcnNbaWldLmxlbmd0aDtcbiAgICAgICAgXG4gICAgICAgIHZhciBzdGFydCA9IHRpID09PSAwID8gaSAtIHN0YXJ0Qnl0ZXMgOiAwO1xuICAgICAgICB2YXIgZW5kID0gdGkgKyBsZW4gPj0gaiAtIGlcbiAgICAgICAgICAgID8gTWF0aC5taW4oc3RhcnQgKyAoaiAtIGkpIC0gdGksIGxlbilcbiAgICAgICAgICAgIDogbGVuXG4gICAgICAgIDtcbiAgICAgICAgXG4gICAgICAgIGJ1ZmZlcnNbaWldLmNvcHkodGFyZ2V0LCB0aSwgc3RhcnQsIGVuZCk7XG4gICAgICAgIHRpICs9IGVuZCAtIHN0YXJ0O1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gdGFyZ2V0O1xufTtcblxuQnVmZmVycy5wcm90b3R5cGUucG9zID0gZnVuY3Rpb24gKGkpIHtcbiAgICBpZiAoaSA8IDAgfHwgaSA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKCdvb2InKTtcbiAgICB2YXIgbCA9IGksIGJpID0gMCwgYnUgPSBudWxsO1xuICAgIGZvciAoOzspIHtcbiAgICAgICAgYnUgPSB0aGlzLmJ1ZmZlcnNbYmldO1xuICAgICAgICBpZiAobCA8IGJ1Lmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHtidWY6IGJpLCBvZmZzZXQ6IGx9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbCAtPSBidS5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgYmkrKztcbiAgICB9XG59O1xuXG5CdWZmZXJzLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiBnZXQgKGkpIHtcbiAgICB2YXIgcG9zID0gdGhpcy5wb3MoaSk7XG5cbiAgICByZXR1cm4gdGhpcy5idWZmZXJzW3Bvcy5idWZdLmdldChwb3Mub2Zmc2V0KTtcbn07XG5cbkJ1ZmZlcnMucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldCAoaSwgYikge1xuICAgIHZhciBwb3MgPSB0aGlzLnBvcyhpKTtcblxuICAgIHJldHVybiB0aGlzLmJ1ZmZlcnNbcG9zLmJ1Zl0uc2V0KHBvcy5vZmZzZXQsIGIpO1xufTtcblxuQnVmZmVycy5wcm90b3R5cGUuaW5kZXhPZiA9IGZ1bmN0aW9uIChuZWVkbGUsIG9mZnNldCkge1xuICAgIGlmIChcInN0cmluZ1wiID09PSB0eXBlb2YgbmVlZGxlKSB7XG4gICAgICAgIG5lZWRsZSA9IG5ldyBCdWZmZXIobmVlZGxlKTtcbiAgICB9IGVsc2UgaWYgKG5lZWRsZSBpbnN0YW5jZW9mIEJ1ZmZlcikge1xuICAgICAgICAvLyBhbHJlYWR5IGEgYnVmZmVyXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHR5cGUgZm9yIGEgc2VhcmNoIHN0cmluZycpO1xuICAgIH1cblxuICAgIGlmICghbmVlZGxlLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiAtMTtcbiAgICB9XG5cbiAgICB2YXIgaSA9IDAsIGogPSAwLCBtYXRjaCA9IDAsIG1zdGFydCwgcG9zID0gMDtcblxuICAgIC8vIHN0YXJ0IHNlYXJjaCBmcm9tIGEgcGFydGljdWxhciBwb2ludCBpbiB0aGUgdmlydHVhbCBidWZmZXJcbiAgICBpZiAob2Zmc2V0KSB7XG4gICAgICAgIHZhciBwID0gdGhpcy5wb3Mob2Zmc2V0KTtcbiAgICAgICAgaSA9IHAuYnVmO1xuICAgICAgICBqID0gcC5vZmZzZXQ7XG4gICAgICAgIHBvcyA9IG9mZnNldDtcbiAgICB9XG5cbiAgICAvLyBmb3IgZWFjaCBjaGFyYWN0ZXIgaW4gdmlydHVhbCBidWZmZXJcbiAgICBmb3IgKDs7KSB7XG4gICAgICAgIHdoaWxlIChqID49IHRoaXMuYnVmZmVyc1tpXS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGogPSAwO1xuICAgICAgICAgICAgaSsrO1xuXG4gICAgICAgICAgICBpZiAoaSA+PSB0aGlzLmJ1ZmZlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgLy8gc2VhcmNoIHN0cmluZyBub3QgZm91bmRcbiAgICAgICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY2hhciA9IHRoaXMuYnVmZmVyc1tpXVtqXTtcblxuICAgICAgICBpZiAoY2hhciA9PSBuZWVkbGVbbWF0Y2hdKSB7XG4gICAgICAgICAgICAvLyBrZWVwIHRyYWNrIHdoZXJlIG1hdGNoIHN0YXJ0ZWRcbiAgICAgICAgICAgIGlmIChtYXRjaCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgbXN0YXJ0ID0ge1xuICAgICAgICAgICAgICAgICAgICBpOiBpLFxuICAgICAgICAgICAgICAgICAgICBqOiBqLFxuICAgICAgICAgICAgICAgICAgICBwb3M6IHBvc1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtYXRjaCsrO1xuICAgICAgICAgICAgaWYgKG1hdGNoID09IG5lZWRsZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAvLyBmdWxsIG1hdGNoXG4gICAgICAgICAgICAgICAgcmV0dXJuIG1zdGFydC5wb3M7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAobWF0Y2ggIT0gMCkge1xuICAgICAgICAgICAgLy8gYSBwYXJ0aWFsIG1hdGNoIGVuZGVkLCBnbyBiYWNrIHRvIG1hdGNoIHN0YXJ0aW5nIHBvc2l0aW9uXG4gICAgICAgICAgICAvLyB0aGlzIHdpbGwgY29udGludWUgdGhlIHNlYXJjaCBhdCB0aGUgbmV4dCBjaGFyYWN0ZXJcbiAgICAgICAgICAgIGkgPSBtc3RhcnQuaTtcbiAgICAgICAgICAgIGogPSBtc3RhcnQuajtcbiAgICAgICAgICAgIHBvcyA9IG1zdGFydC5wb3M7XG4gICAgICAgICAgICBtYXRjaCA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBqKys7XG4gICAgICAgIHBvcysrO1xuICAgIH1cbn07XG5cbkJ1ZmZlcnMucHJvdG90eXBlLnRvQnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuc2xpY2UoKTtcbn1cblxuQnVmZmVycy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbihlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICAgIHJldHVybiB0aGlzLnNsaWNlKHN0YXJ0LCBlbmQpLnRvU3RyaW5nKGVuY29kaW5nKTtcbn1cbiIsInZhciBUcmF2ZXJzZSA9IHJlcXVpcmUoJ3RyYXZlcnNlJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENoYWluc2F3O1xuZnVuY3Rpb24gQ2hhaW5zYXcgKGJ1aWxkZXIpIHtcbiAgICB2YXIgc2F3ID0gQ2hhaW5zYXcuc2F3KGJ1aWxkZXIsIHt9KTtcbiAgICB2YXIgciA9IGJ1aWxkZXIuY2FsbChzYXcuaGFuZGxlcnMsIHNhdyk7XG4gICAgaWYgKHIgIT09IHVuZGVmaW5lZCkgc2F3LmhhbmRsZXJzID0gcjtcbiAgICBzYXcucmVjb3JkKCk7XG4gICAgcmV0dXJuIHNhdy5jaGFpbigpO1xufTtcblxuQ2hhaW5zYXcubGlnaHQgPSBmdW5jdGlvbiBDaGFpbnNhd0xpZ2h0IChidWlsZGVyKSB7XG4gICAgdmFyIHNhdyA9IENoYWluc2F3LnNhdyhidWlsZGVyLCB7fSk7XG4gICAgdmFyIHIgPSBidWlsZGVyLmNhbGwoc2F3LmhhbmRsZXJzLCBzYXcpO1xuICAgIGlmIChyICE9PSB1bmRlZmluZWQpIHNhdy5oYW5kbGVycyA9IHI7XG4gICAgcmV0dXJuIHNhdy5jaGFpbigpO1xufTtcblxuQ2hhaW5zYXcuc2F3ID0gZnVuY3Rpb24gKGJ1aWxkZXIsIGhhbmRsZXJzKSB7XG4gICAgdmFyIHNhdyA9IG5ldyBFdmVudEVtaXR0ZXI7XG4gICAgc2F3LmhhbmRsZXJzID0gaGFuZGxlcnM7XG4gICAgc2F3LmFjdGlvbnMgPSBbXTtcblxuICAgIHNhdy5jaGFpbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNoID0gVHJhdmVyc2Uoc2F3LmhhbmRsZXJzKS5tYXAoZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzUm9vdCkgcmV0dXJuIG5vZGU7XG4gICAgICAgICAgICB2YXIgcHMgPSB0aGlzLnBhdGg7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgc2F3LmFjdGlvbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoIDogcHMsXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzIDogW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2g7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2F3LmVtaXQoJ2JlZ2luJyk7XG4gICAgICAgICAgICBzYXcubmV4dCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gY2g7XG4gICAgfTtcblxuICAgIHNhdy5wb3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBzYXcuYWN0aW9ucy5zaGlmdCgpO1xuICAgIH07XG5cbiAgICBzYXcubmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGFjdGlvbiA9IHNhdy5wb3AoKTtcblxuICAgICAgICBpZiAoIWFjdGlvbikge1xuICAgICAgICAgICAgc2F3LmVtaXQoJ2VuZCcpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCFhY3Rpb24udHJhcCkge1xuICAgICAgICAgICAgdmFyIG5vZGUgPSBzYXcuaGFuZGxlcnM7XG4gICAgICAgICAgICBhY3Rpb24ucGF0aC5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHsgbm9kZSA9IG5vZGVba2V5XSB9KTtcbiAgICAgICAgICAgIG5vZGUuYXBwbHkoc2F3LmhhbmRsZXJzLCBhY3Rpb24uYXJncyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgc2F3Lm5lc3QgPSBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgIHZhciBhdXRvbmV4dCA9IHRydWU7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjYiA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICB2YXIgYXV0b25leHQgPSBjYjtcbiAgICAgICAgICAgIGNiID0gYXJncy5zaGlmdCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHMgPSBDaGFpbnNhdy5zYXcoYnVpbGRlciwge30pO1xuICAgICAgICB2YXIgciA9IGJ1aWxkZXIuY2FsbChzLmhhbmRsZXJzLCBzKTtcblxuICAgICAgICBpZiAociAhPT0gdW5kZWZpbmVkKSBzLmhhbmRsZXJzID0gcjtcblxuICAgICAgICAvLyBJZiB3ZSBhcmUgcmVjb3JkaW5nLi4uXG4gICAgICAgIGlmIChcInVuZGVmaW5lZFwiICE9PSB0eXBlb2Ygc2F3LnN0ZXApIHtcbiAgICAgICAgICAgIC8vIC4uLiBvdXIgY2hpbGRyZW4gc2hvdWxkLCB0b29cbiAgICAgICAgICAgIHMucmVjb3JkKCk7XG4gICAgICAgIH1cblxuICAgICAgICBjYi5hcHBseShzLmNoYWluKCksIGFyZ3MpO1xuICAgICAgICBpZiAoYXV0b25leHQgIT09IGZhbHNlKSBzLm9uKCdlbmQnLCBzYXcubmV4dCk7XG4gICAgfTtcblxuICAgIHNhdy5yZWNvcmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHVwZ3JhZGVDaGFpbnNhdyhzYXcpO1xuICAgIH07XG5cbiAgICBbJ3RyYXAnLCAnZG93bicsICdqdW1wJ10uZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kKSB7XG4gICAgICAgIHNhd1ttZXRob2RdID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVG8gdXNlIHRoZSB0cmFwLCBkb3duIGFuZCBqdW1wIGZlYXR1cmVzLCBwbGVhc2UgXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJjYWxsIHJlY29yZCgpIGZpcnN0IHRvIHN0YXJ0IHJlY29yZGluZyBhY3Rpb25zLlwiKTtcbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIHJldHVybiBzYXc7XG59O1xuXG5mdW5jdGlvbiB1cGdyYWRlQ2hhaW5zYXcoc2F3KSB7XG4gICAgc2F3LnN0ZXAgPSAwO1xuXG4gICAgLy8gb3ZlcnJpZGUgcG9wXG4gICAgc2F3LnBvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHNhdy5hY3Rpb25zW3Nhdy5zdGVwKytdO1xuICAgIH07XG5cbiAgICBzYXcudHJhcCA9IGZ1bmN0aW9uIChuYW1lLCBjYikge1xuICAgICAgICB2YXIgcHMgPSBBcnJheS5pc0FycmF5KG5hbWUpID8gbmFtZSA6IFtuYW1lXTtcbiAgICAgICAgc2F3LmFjdGlvbnMucHVzaCh7XG4gICAgICAgICAgICBwYXRoIDogcHMsXG4gICAgICAgICAgICBzdGVwIDogc2F3LnN0ZXAsXG4gICAgICAgICAgICBjYiA6IGNiLFxuICAgICAgICAgICAgdHJhcCA6IHRydWVcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHNhdy5kb3duID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgdmFyIHBzID0gKEFycmF5LmlzQXJyYXkobmFtZSkgPyBuYW1lIDogW25hbWVdKS5qb2luKCcvJyk7XG4gICAgICAgIHZhciBpID0gc2F3LmFjdGlvbnMuc2xpY2Uoc2F3LnN0ZXApLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgaWYgKHgudHJhcCAmJiB4LnN0ZXAgPD0gc2F3LnN0ZXApIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybiB4LnBhdGguam9pbignLycpID09IHBzO1xuICAgICAgICB9KS5pbmRleE9mKHRydWUpO1xuXG4gICAgICAgIGlmIChpID49IDApIHNhdy5zdGVwICs9IGk7XG4gICAgICAgIGVsc2Ugc2F3LnN0ZXAgPSBzYXcuYWN0aW9ucy5sZW5ndGg7XG5cbiAgICAgICAgdmFyIGFjdCA9IHNhdy5hY3Rpb25zW3Nhdy5zdGVwIC0gMV07XG4gICAgICAgIGlmIChhY3QgJiYgYWN0LnRyYXApIHtcbiAgICAgICAgICAgIC8vIEl0J3MgYSB0cmFwIVxuICAgICAgICAgICAgc2F3LnN0ZXAgPSBhY3Quc3RlcDtcbiAgICAgICAgICAgIGFjdC5jYigpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Ugc2F3Lm5leHQoKTtcbiAgICB9O1xuXG4gICAgc2F3Lmp1bXAgPSBmdW5jdGlvbiAoc3RlcCkge1xuICAgICAgICBzYXcuc3RlcCA9IHN0ZXA7XG4gICAgICAgIHNhdy5uZXh0KCk7XG4gICAgfTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh4cywgZm4pIHtcbiAgICB2YXIgcmVzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgeCA9IGZuKHhzW2ldLCBpKTtcbiAgICAgICAgaWYgKGlzQXJyYXkoeCkpIHJlcy5wdXNoLmFwcGx5KHJlcywgeCk7XG4gICAgICAgIGVsc2UgcmVzLnB1c2goeCk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59O1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHhzKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5cbmZ1bmN0aW9uIGlzQXJyYXkoYXJnKSB7XG4gIGlmIChBcnJheS5pc0FycmF5KSB7XG4gICAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXJnKTtcbiAgfVxuICByZXR1cm4gb2JqZWN0VG9TdHJpbmcoYXJnKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmV4cG9ydHMuaXNEYXRlID0gaXNEYXRlO1xuXG5mdW5jdGlvbiBpc0Vycm9yKGUpIHtcbiAgcmV0dXJuIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJ2J1ZmZlcicpLkJ1ZmZlci5pc0J1ZmZlcjtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSByZWFscGF0aFxucmVhbHBhdGgucmVhbHBhdGggPSByZWFscGF0aFxucmVhbHBhdGguc3luYyA9IHJlYWxwYXRoU3luY1xucmVhbHBhdGgucmVhbHBhdGhTeW5jID0gcmVhbHBhdGhTeW5jXG5yZWFscGF0aC5tb25rZXlwYXRjaCA9IG1vbmtleXBhdGNoXG5yZWFscGF0aC51bm1vbmtleXBhdGNoID0gdW5tb25rZXlwYXRjaFxuXG52YXIgZnMgPSByZXF1aXJlKCdmcycpXG52YXIgb3JpZ1JlYWxwYXRoID0gZnMucmVhbHBhdGhcbnZhciBvcmlnUmVhbHBhdGhTeW5jID0gZnMucmVhbHBhdGhTeW5jXG5cbnZhciB2ZXJzaW9uID0gcHJvY2Vzcy52ZXJzaW9uXG52YXIgb2sgPSAvXnZbMC01XVxcLi8udGVzdCh2ZXJzaW9uKVxudmFyIG9sZCA9IHJlcXVpcmUoJy4vb2xkLmpzJylcblxuZnVuY3Rpb24gbmV3RXJyb3IgKGVyKSB7XG4gIHJldHVybiBlciAmJiBlci5zeXNjYWxsID09PSAncmVhbHBhdGgnICYmIChcbiAgICBlci5jb2RlID09PSAnRUxPT1AnIHx8XG4gICAgZXIuY29kZSA9PT0gJ0VOT01FTScgfHxcbiAgICBlci5jb2RlID09PSAnRU5BTUVUT09MT05HJ1xuICApXG59XG5cbmZ1bmN0aW9uIHJlYWxwYXRoIChwLCBjYWNoZSwgY2IpIHtcbiAgaWYgKG9rKSB7XG4gICAgcmV0dXJuIG9yaWdSZWFscGF0aChwLCBjYWNoZSwgY2IpXG4gIH1cblxuICBpZiAodHlwZW9mIGNhY2hlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2IgPSBjYWNoZVxuICAgIGNhY2hlID0gbnVsbFxuICB9XG4gIG9yaWdSZWFscGF0aChwLCBjYWNoZSwgZnVuY3Rpb24gKGVyLCByZXN1bHQpIHtcbiAgICBpZiAobmV3RXJyb3IoZXIpKSB7XG4gICAgICBvbGQucmVhbHBhdGgocCwgY2FjaGUsIGNiKVxuICAgIH0gZWxzZSB7XG4gICAgICBjYihlciwgcmVzdWx0KVxuICAgIH1cbiAgfSlcbn1cblxuZnVuY3Rpb24gcmVhbHBhdGhTeW5jIChwLCBjYWNoZSkge1xuICBpZiAob2spIHtcbiAgICByZXR1cm4gb3JpZ1JlYWxwYXRoU3luYyhwLCBjYWNoZSlcbiAgfVxuXG4gIHRyeSB7XG4gICAgcmV0dXJuIG9yaWdSZWFscGF0aFN5bmMocCwgY2FjaGUpXG4gIH0gY2F0Y2ggKGVyKSB7XG4gICAgaWYgKG5ld0Vycm9yKGVyKSkge1xuICAgICAgcmV0dXJuIG9sZC5yZWFscGF0aFN5bmMocCwgY2FjaGUpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IGVyXG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG1vbmtleXBhdGNoICgpIHtcbiAgZnMucmVhbHBhdGggPSByZWFscGF0aFxuICBmcy5yZWFscGF0aFN5bmMgPSByZWFscGF0aFN5bmNcbn1cblxuZnVuY3Rpb24gdW5tb25rZXlwYXRjaCAoKSB7XG4gIGZzLnJlYWxwYXRoID0gb3JpZ1JlYWxwYXRoXG4gIGZzLnJlYWxwYXRoU3luYyA9IG9yaWdSZWFscGF0aFN5bmNcbn1cbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgcGF0aE1vZHVsZSA9IHJlcXVpcmUoJ3BhdGgnKTtcbnZhciBpc1dpbmRvd3MgPSBwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInO1xudmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcblxuLy8gSmF2YVNjcmlwdCBpbXBsZW1lbnRhdGlvbiBvZiByZWFscGF0aCwgcG9ydGVkIGZyb20gbm9kZSBwcmUtdjZcblxudmFyIERFQlVHID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyAmJiAvZnMvLnRlc3QocHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyk7XG5cbmZ1bmN0aW9uIHJldGhyb3coKSB7XG4gIC8vIE9ubHkgZW5hYmxlIGluIGRlYnVnIG1vZGUuIEEgYmFja3RyYWNlIHVzZXMgfjEwMDAgYnl0ZXMgb2YgaGVhcCBzcGFjZSBhbmRcbiAgLy8gaXMgZmFpcmx5IHNsb3cgdG8gZ2VuZXJhdGUuXG4gIHZhciBjYWxsYmFjaztcbiAgaWYgKERFQlVHKSB7XG4gICAgdmFyIGJhY2t0cmFjZSA9IG5ldyBFcnJvcjtcbiAgICBjYWxsYmFjayA9IGRlYnVnQ2FsbGJhY2s7XG4gIH0gZWxzZVxuICAgIGNhbGxiYWNrID0gbWlzc2luZ0NhbGxiYWNrO1xuXG4gIHJldHVybiBjYWxsYmFjaztcblxuICBmdW5jdGlvbiBkZWJ1Z0NhbGxiYWNrKGVycikge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIGJhY2t0cmFjZS5tZXNzYWdlID0gZXJyLm1lc3NhZ2U7XG4gICAgICBlcnIgPSBiYWNrdHJhY2U7XG4gICAgICBtaXNzaW5nQ2FsbGJhY2soZXJyKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBtaXNzaW5nQ2FsbGJhY2soZXJyKSB7XG4gICAgaWYgKGVycikge1xuICAgICAgaWYgKHByb2Nlc3MudGhyb3dEZXByZWNhdGlvbilcbiAgICAgICAgdGhyb3cgZXJyOyAgLy8gRm9yZ290IGEgY2FsbGJhY2sgYnV0IGRvbid0IGtub3cgd2hlcmU/IFVzZSBOT0RFX0RFQlVHPWZzXG4gICAgICBlbHNlIGlmICghcHJvY2Vzcy5ub0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHZhciBtc2cgPSAnZnM6IG1pc3NpbmcgY2FsbGJhY2sgJyArIChlcnIuc3RhY2sgfHwgZXJyLm1lc3NhZ2UpO1xuICAgICAgICBpZiAocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKVxuICAgICAgICAgIGNvbnNvbGUudHJhY2UobXNnKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gbWF5YmVDYWxsYmFjayhjYikge1xuICByZXR1cm4gdHlwZW9mIGNiID09PSAnZnVuY3Rpb24nID8gY2IgOiByZXRocm93KCk7XG59XG5cbnZhciBub3JtYWxpemUgPSBwYXRoTW9kdWxlLm5vcm1hbGl6ZTtcblxuLy8gUmVnZXhwIHRoYXQgZmluZHMgdGhlIG5leHQgcGFydGlvbiBvZiBhIChwYXJ0aWFsKSBwYXRoXG4vLyByZXN1bHQgaXMgW2Jhc2Vfd2l0aF9zbGFzaCwgYmFzZV0sIGUuZy4gWydzb21lZGlyLycsICdzb21lZGlyJ11cbmlmIChpc1dpbmRvd3MpIHtcbiAgdmFyIG5leHRQYXJ0UmUgPSAvKC4qPykoPzpbXFwvXFxcXF0rfCQpL2c7XG59IGVsc2Uge1xuICB2YXIgbmV4dFBhcnRSZSA9IC8oLio/KSg/OltcXC9dK3wkKS9nO1xufVxuXG4vLyBSZWdleCB0byBmaW5kIHRoZSBkZXZpY2Ugcm9vdCwgaW5jbHVkaW5nIHRyYWlsaW5nIHNsYXNoLiBFLmcuICdjOlxcXFwnLlxuaWYgKGlzV2luZG93cykge1xuICB2YXIgc3BsaXRSb290UmUgPSAvXig/OlthLXpBLVpdOnxbXFxcXFxcL117Mn1bXlxcXFxcXC9dK1tcXFxcXFwvXVteXFxcXFxcL10rKT9bXFxcXFxcL10qLztcbn0gZWxzZSB7XG4gIHZhciBzcGxpdFJvb3RSZSA9IC9eW1xcL10qLztcbn1cblxuZXhwb3J0cy5yZWFscGF0aFN5bmMgPSBmdW5jdGlvbiByZWFscGF0aFN5bmMocCwgY2FjaGUpIHtcbiAgLy8gbWFrZSBwIGlzIGFic29sdXRlXG4gIHAgPSBwYXRoTW9kdWxlLnJlc29sdmUocCk7XG5cbiAgaWYgKGNhY2hlICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjYWNoZSwgcCkpIHtcbiAgICByZXR1cm4gY2FjaGVbcF07XG4gIH1cblxuICB2YXIgb3JpZ2luYWwgPSBwLFxuICAgICAgc2VlbkxpbmtzID0ge30sXG4gICAgICBrbm93bkhhcmQgPSB7fTtcblxuICAvLyBjdXJyZW50IGNoYXJhY3RlciBwb3NpdGlvbiBpbiBwXG4gIHZhciBwb3M7XG4gIC8vIHRoZSBwYXJ0aWFsIHBhdGggc28gZmFyLCBpbmNsdWRpbmcgYSB0cmFpbGluZyBzbGFzaCBpZiBhbnlcbiAgdmFyIGN1cnJlbnQ7XG4gIC8vIHRoZSBwYXJ0aWFsIHBhdGggd2l0aG91dCBhIHRyYWlsaW5nIHNsYXNoIChleGNlcHQgd2hlbiBwb2ludGluZyBhdCBhIHJvb3QpXG4gIHZhciBiYXNlO1xuICAvLyB0aGUgcGFydGlhbCBwYXRoIHNjYW5uZWQgaW4gdGhlIHByZXZpb3VzIHJvdW5kLCB3aXRoIHNsYXNoXG4gIHZhciBwcmV2aW91cztcblxuICBzdGFydCgpO1xuXG4gIGZ1bmN0aW9uIHN0YXJ0KCkge1xuICAgIC8vIFNraXAgb3ZlciByb290c1xuICAgIHZhciBtID0gc3BsaXRSb290UmUuZXhlYyhwKTtcbiAgICBwb3MgPSBtWzBdLmxlbmd0aDtcbiAgICBjdXJyZW50ID0gbVswXTtcbiAgICBiYXNlID0gbVswXTtcbiAgICBwcmV2aW91cyA9ICcnO1xuXG4gICAgLy8gT24gd2luZG93cywgY2hlY2sgdGhhdCB0aGUgcm9vdCBleGlzdHMuIE9uIHVuaXggdGhlcmUgaXMgbm8gbmVlZC5cbiAgICBpZiAoaXNXaW5kb3dzICYmICFrbm93bkhhcmRbYmFzZV0pIHtcbiAgICAgIGZzLmxzdGF0U3luYyhiYXNlKTtcbiAgICAgIGtub3duSGFyZFtiYXNlXSA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgLy8gd2FsayBkb3duIHRoZSBwYXRoLCBzd2FwcGluZyBvdXQgbGlua2VkIHBhdGhwYXJ0cyBmb3IgdGhlaXIgcmVhbFxuICAvLyB2YWx1ZXNcbiAgLy8gTkI6IHAubGVuZ3RoIGNoYW5nZXMuXG4gIHdoaWxlIChwb3MgPCBwLmxlbmd0aCkge1xuICAgIC8vIGZpbmQgdGhlIG5leHQgcGFydFxuICAgIG5leHRQYXJ0UmUubGFzdEluZGV4ID0gcG9zO1xuICAgIHZhciByZXN1bHQgPSBuZXh0UGFydFJlLmV4ZWMocCk7XG4gICAgcHJldmlvdXMgPSBjdXJyZW50O1xuICAgIGN1cnJlbnQgKz0gcmVzdWx0WzBdO1xuICAgIGJhc2UgPSBwcmV2aW91cyArIHJlc3VsdFsxXTtcbiAgICBwb3MgPSBuZXh0UGFydFJlLmxhc3RJbmRleDtcblxuICAgIC8vIGNvbnRpbnVlIGlmIG5vdCBhIHN5bWxpbmtcbiAgICBpZiAoa25vd25IYXJkW2Jhc2VdIHx8IChjYWNoZSAmJiBjYWNoZVtiYXNlXSA9PT0gYmFzZSkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHZhciByZXNvbHZlZExpbms7XG4gICAgaWYgKGNhY2hlICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjYWNoZSwgYmFzZSkpIHtcbiAgICAgIC8vIHNvbWUga25vd24gc3ltYm9saWMgbGluay4gIG5vIG5lZWQgdG8gc3RhdCBhZ2Fpbi5cbiAgICAgIHJlc29sdmVkTGluayA9IGNhY2hlW2Jhc2VdO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgc3RhdCA9IGZzLmxzdGF0U3luYyhiYXNlKTtcbiAgICAgIGlmICghc3RhdC5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgIGtub3duSGFyZFtiYXNlXSA9IHRydWU7XG4gICAgICAgIGlmIChjYWNoZSkgY2FjaGVbYmFzZV0gPSBiYXNlO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gcmVhZCB0aGUgbGluayBpZiBpdCB3YXNuJ3QgcmVhZCBiZWZvcmVcbiAgICAgIC8vIGRldi9pbm8gYWx3YXlzIHJldHVybiAwIG9uIHdpbmRvd3MsIHNvIHNraXAgdGhlIGNoZWNrLlxuICAgICAgdmFyIGxpbmtUYXJnZXQgPSBudWxsO1xuICAgICAgaWYgKCFpc1dpbmRvd3MpIHtcbiAgICAgICAgdmFyIGlkID0gc3RhdC5kZXYudG9TdHJpbmcoMzIpICsgJzonICsgc3RhdC5pbm8udG9TdHJpbmcoMzIpO1xuICAgICAgICBpZiAoc2VlbkxpbmtzLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgIGxpbmtUYXJnZXQgPSBzZWVuTGlua3NbaWRdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAobGlua1RhcmdldCA9PT0gbnVsbCkge1xuICAgICAgICBmcy5zdGF0U3luYyhiYXNlKTtcbiAgICAgICAgbGlua1RhcmdldCA9IGZzLnJlYWRsaW5rU3luYyhiYXNlKTtcbiAgICAgIH1cbiAgICAgIHJlc29sdmVkTGluayA9IHBhdGhNb2R1bGUucmVzb2x2ZShwcmV2aW91cywgbGlua1RhcmdldCk7XG4gICAgICAvLyB0cmFjayB0aGlzLCBpZiBnaXZlbiBhIGNhY2hlLlxuICAgICAgaWYgKGNhY2hlKSBjYWNoZVtiYXNlXSA9IHJlc29sdmVkTGluaztcbiAgICAgIGlmICghaXNXaW5kb3dzKSBzZWVuTGlua3NbaWRdID0gbGlua1RhcmdldDtcbiAgICB9XG5cbiAgICAvLyByZXNvbHZlIHRoZSBsaW5rLCB0aGVuIHN0YXJ0IG92ZXJcbiAgICBwID0gcGF0aE1vZHVsZS5yZXNvbHZlKHJlc29sdmVkTGluaywgcC5zbGljZShwb3MpKTtcbiAgICBzdGFydCgpO1xuICB9XG5cbiAgaWYgKGNhY2hlKSBjYWNoZVtvcmlnaW5hbF0gPSBwO1xuXG4gIHJldHVybiBwO1xufTtcblxuXG5leHBvcnRzLnJlYWxwYXRoID0gZnVuY3Rpb24gcmVhbHBhdGgocCwgY2FjaGUsIGNiKSB7XG4gIGlmICh0eXBlb2YgY2IgIT09ICdmdW5jdGlvbicpIHtcbiAgICBjYiA9IG1heWJlQ2FsbGJhY2soY2FjaGUpO1xuICAgIGNhY2hlID0gbnVsbDtcbiAgfVxuXG4gIC8vIG1ha2UgcCBpcyBhYnNvbHV0ZVxuICBwID0gcGF0aE1vZHVsZS5yZXNvbHZlKHApO1xuXG4gIGlmIChjYWNoZSAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY2FjaGUsIHApKSB7XG4gICAgcmV0dXJuIHByb2Nlc3MubmV4dFRpY2soY2IuYmluZChudWxsLCBudWxsLCBjYWNoZVtwXSkpO1xuICB9XG5cbiAgdmFyIG9yaWdpbmFsID0gcCxcbiAgICAgIHNlZW5MaW5rcyA9IHt9LFxuICAgICAga25vd25IYXJkID0ge307XG5cbiAgLy8gY3VycmVudCBjaGFyYWN0ZXIgcG9zaXRpb24gaW4gcFxuICB2YXIgcG9zO1xuICAvLyB0aGUgcGFydGlhbCBwYXRoIHNvIGZhciwgaW5jbHVkaW5nIGEgdHJhaWxpbmcgc2xhc2ggaWYgYW55XG4gIHZhciBjdXJyZW50O1xuICAvLyB0aGUgcGFydGlhbCBwYXRoIHdpdGhvdXQgYSB0cmFpbGluZyBzbGFzaCAoZXhjZXB0IHdoZW4gcG9pbnRpbmcgYXQgYSByb290KVxuICB2YXIgYmFzZTtcbiAgLy8gdGhlIHBhcnRpYWwgcGF0aCBzY2FubmVkIGluIHRoZSBwcmV2aW91cyByb3VuZCwgd2l0aCBzbGFzaFxuICB2YXIgcHJldmlvdXM7XG5cbiAgc3RhcnQoKTtcblxuICBmdW5jdGlvbiBzdGFydCgpIHtcbiAgICAvLyBTa2lwIG92ZXIgcm9vdHNcbiAgICB2YXIgbSA9IHNwbGl0Um9vdFJlLmV4ZWMocCk7XG4gICAgcG9zID0gbVswXS5sZW5ndGg7XG4gICAgY3VycmVudCA9IG1bMF07XG4gICAgYmFzZSA9IG1bMF07XG4gICAgcHJldmlvdXMgPSAnJztcblxuICAgIC8vIE9uIHdpbmRvd3MsIGNoZWNrIHRoYXQgdGhlIHJvb3QgZXhpc3RzLiBPbiB1bml4IHRoZXJlIGlzIG5vIG5lZWQuXG4gICAgaWYgKGlzV2luZG93cyAmJiAha25vd25IYXJkW2Jhc2VdKSB7XG4gICAgICBmcy5sc3RhdChiYXNlLCBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgaWYgKGVycikgcmV0dXJuIGNiKGVycik7XG4gICAgICAgIGtub3duSGFyZFtiYXNlXSA9IHRydWU7XG4gICAgICAgIExPT1AoKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBwcm9jZXNzLm5leHRUaWNrKExPT1ApO1xuICAgIH1cbiAgfVxuXG4gIC8vIHdhbGsgZG93biB0aGUgcGF0aCwgc3dhcHBpbmcgb3V0IGxpbmtlZCBwYXRocGFydHMgZm9yIHRoZWlyIHJlYWxcbiAgLy8gdmFsdWVzXG4gIGZ1bmN0aW9uIExPT1AoKSB7XG4gICAgLy8gc3RvcCBpZiBzY2FubmVkIHBhc3QgZW5kIG9mIHBhdGhcbiAgICBpZiAocG9zID49IHAubGVuZ3RoKSB7XG4gICAgICBpZiAoY2FjaGUpIGNhY2hlW29yaWdpbmFsXSA9IHA7XG4gICAgICByZXR1cm4gY2IobnVsbCwgcCk7XG4gICAgfVxuXG4gICAgLy8gZmluZCB0aGUgbmV4dCBwYXJ0XG4gICAgbmV4dFBhcnRSZS5sYXN0SW5kZXggPSBwb3M7XG4gICAgdmFyIHJlc3VsdCA9IG5leHRQYXJ0UmUuZXhlYyhwKTtcbiAgICBwcmV2aW91cyA9IGN1cnJlbnQ7XG4gICAgY3VycmVudCArPSByZXN1bHRbMF07XG4gICAgYmFzZSA9IHByZXZpb3VzICsgcmVzdWx0WzFdO1xuICAgIHBvcyA9IG5leHRQYXJ0UmUubGFzdEluZGV4O1xuXG4gICAgLy8gY29udGludWUgaWYgbm90IGEgc3ltbGlua1xuICAgIGlmIChrbm93bkhhcmRbYmFzZV0gfHwgKGNhY2hlICYmIGNhY2hlW2Jhc2VdID09PSBiYXNlKSkge1xuICAgICAgcmV0dXJuIHByb2Nlc3MubmV4dFRpY2soTE9PUCk7XG4gICAgfVxuXG4gICAgaWYgKGNhY2hlICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjYWNoZSwgYmFzZSkpIHtcbiAgICAgIC8vIGtub3duIHN5bWJvbGljIGxpbmsuICBubyBuZWVkIHRvIHN0YXQgYWdhaW4uXG4gICAgICByZXR1cm4gZ290UmVzb2x2ZWRMaW5rKGNhY2hlW2Jhc2VdKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnMubHN0YXQoYmFzZSwgZ290U3RhdCk7XG4gIH1cblxuICBmdW5jdGlvbiBnb3RTdGF0KGVyciwgc3RhdCkge1xuICAgIGlmIChlcnIpIHJldHVybiBjYihlcnIpO1xuXG4gICAgLy8gaWYgbm90IGEgc3ltbGluaywgc2tpcCB0byB0aGUgbmV4dCBwYXRoIHBhcnRcbiAgICBpZiAoIXN0YXQuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAga25vd25IYXJkW2Jhc2VdID0gdHJ1ZTtcbiAgICAgIGlmIChjYWNoZSkgY2FjaGVbYmFzZV0gPSBiYXNlO1xuICAgICAgcmV0dXJuIHByb2Nlc3MubmV4dFRpY2soTE9PUCk7XG4gICAgfVxuXG4gICAgLy8gc3RhdCAmIHJlYWQgdGhlIGxpbmsgaWYgbm90IHJlYWQgYmVmb3JlXG4gICAgLy8gY2FsbCBnb3RUYXJnZXQgYXMgc29vbiBhcyB0aGUgbGluayB0YXJnZXQgaXMga25vd25cbiAgICAvLyBkZXYvaW5vIGFsd2F5cyByZXR1cm4gMCBvbiB3aW5kb3dzLCBzbyBza2lwIHRoZSBjaGVjay5cbiAgICBpZiAoIWlzV2luZG93cykge1xuICAgICAgdmFyIGlkID0gc3RhdC5kZXYudG9TdHJpbmcoMzIpICsgJzonICsgc3RhdC5pbm8udG9TdHJpbmcoMzIpO1xuICAgICAgaWYgKHNlZW5MaW5rcy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgcmV0dXJuIGdvdFRhcmdldChudWxsLCBzZWVuTGlua3NbaWRdLCBiYXNlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZnMuc3RhdChiYXNlLCBmdW5jdGlvbihlcnIpIHtcbiAgICAgIGlmIChlcnIpIHJldHVybiBjYihlcnIpO1xuXG4gICAgICBmcy5yZWFkbGluayhiYXNlLCBmdW5jdGlvbihlcnIsIHRhcmdldCkge1xuICAgICAgICBpZiAoIWlzV2luZG93cykgc2VlbkxpbmtzW2lkXSA9IHRhcmdldDtcbiAgICAgICAgZ290VGFyZ2V0KGVyciwgdGFyZ2V0KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gZ290VGFyZ2V0KGVyciwgdGFyZ2V0LCBiYXNlKSB7XG4gICAgaWYgKGVycikgcmV0dXJuIGNiKGVycik7XG5cbiAgICB2YXIgcmVzb2x2ZWRMaW5rID0gcGF0aE1vZHVsZS5yZXNvbHZlKHByZXZpb3VzLCB0YXJnZXQpO1xuICAgIGlmIChjYWNoZSkgY2FjaGVbYmFzZV0gPSByZXNvbHZlZExpbms7XG4gICAgZ290UmVzb2x2ZWRMaW5rKHJlc29sdmVkTGluayk7XG4gIH1cblxuICBmdW5jdGlvbiBnb3RSZXNvbHZlZExpbmsocmVzb2x2ZWRMaW5rKSB7XG4gICAgLy8gcmVzb2x2ZSB0aGUgbGluaywgdGhlbiBzdGFydCBvdmVyXG4gICAgcCA9IHBhdGhNb2R1bGUucmVzb2x2ZShyZXNvbHZlZExpbmssIHAuc2xpY2UocG9zKSk7XG4gICAgc3RhcnQoKTtcbiAgfVxufTtcbiIsImV4cG9ydHMuQWJzdHJhY3QgPSByZXF1aXJlKFwiLi9saWIvYWJzdHJhY3QuanNcIilcbmV4cG9ydHMuUmVhZGVyID0gcmVxdWlyZShcIi4vbGliL3JlYWRlci5qc1wiKVxuZXhwb3J0cy5Xcml0ZXIgPSByZXF1aXJlKFwiLi9saWIvd3JpdGVyLmpzXCIpXG5cbmV4cG9ydHMuRmlsZSA9XG4gIHsgUmVhZGVyOiByZXF1aXJlKFwiLi9saWIvZmlsZS1yZWFkZXIuanNcIilcbiAgLCBXcml0ZXI6IHJlcXVpcmUoXCIuL2xpYi9maWxlLXdyaXRlci5qc1wiKSB9XG5cbmV4cG9ydHMuRGlyID0gXG4gIHsgUmVhZGVyIDogcmVxdWlyZShcIi4vbGliL2Rpci1yZWFkZXIuanNcIilcbiAgLCBXcml0ZXIgOiByZXF1aXJlKFwiLi9saWIvZGlyLXdyaXRlci5qc1wiKSB9XG5cbmV4cG9ydHMuTGluayA9XG4gIHsgUmVhZGVyIDogcmVxdWlyZShcIi4vbGliL2xpbmstcmVhZGVyLmpzXCIpXG4gICwgV3JpdGVyIDogcmVxdWlyZShcIi4vbGliL2xpbmstd3JpdGVyLmpzXCIpIH1cblxuZXhwb3J0cy5Qcm94eSA9XG4gIHsgUmVhZGVyIDogcmVxdWlyZShcIi4vbGliL3Byb3h5LXJlYWRlci5qc1wiKVxuICAsIFdyaXRlciA6IHJlcXVpcmUoXCIuL2xpYi9wcm94eS13cml0ZXIuanNcIikgfVxuXG5leHBvcnRzLlJlYWRlci5EaXIgPSBleHBvcnRzLkRpclJlYWRlciA9IGV4cG9ydHMuRGlyLlJlYWRlclxuZXhwb3J0cy5SZWFkZXIuRmlsZSA9IGV4cG9ydHMuRmlsZVJlYWRlciA9IGV4cG9ydHMuRmlsZS5SZWFkZXJcbmV4cG9ydHMuUmVhZGVyLkxpbmsgPSBleHBvcnRzLkxpbmtSZWFkZXIgPSBleHBvcnRzLkxpbmsuUmVhZGVyXG5leHBvcnRzLlJlYWRlci5Qcm94eSA9IGV4cG9ydHMuUHJveHlSZWFkZXIgPSBleHBvcnRzLlByb3h5LlJlYWRlclxuXG5leHBvcnRzLldyaXRlci5EaXIgPSBleHBvcnRzLkRpcldyaXRlciA9IGV4cG9ydHMuRGlyLldyaXRlclxuZXhwb3J0cy5Xcml0ZXIuRmlsZSA9IGV4cG9ydHMuRmlsZVdyaXRlciA9IGV4cG9ydHMuRmlsZS5Xcml0ZXJcbmV4cG9ydHMuV3JpdGVyLkxpbmsgPSBleHBvcnRzLkxpbmtXcml0ZXIgPSBleHBvcnRzLkxpbmsuV3JpdGVyXG5leHBvcnRzLldyaXRlci5Qcm94eSA9IGV4cG9ydHMuUHJveHlXcml0ZXIgPSBleHBvcnRzLlByb3h5LldyaXRlclxuXG5leHBvcnRzLmNvbGxlY3QgPSByZXF1aXJlKFwiLi9saWIvY29sbGVjdC5qc1wiKVxuIiwiLy8gdGhlIHBhcmVudCBjbGFzcyBmb3IgYWxsIGZzdHJlYW1zLlxuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0XG5cbnZhciBTdHJlYW0gPSByZXF1aXJlKFwic3RyZWFtXCIpLlN0cmVhbVxuICAsIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpXG5cbmZ1bmN0aW9uIEFic3RyYWN0ICgpIHtcbiAgU3RyZWFtLmNhbGwodGhpcylcbn1cblxuaW5oZXJpdHMoQWJzdHJhY3QsIFN0cmVhbSlcblxuQWJzdHJhY3QucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gKGV2LCBmbikge1xuICBpZiAoZXYgPT09IFwicmVhZHlcIiAmJiB0aGlzLnJlYWR5KSB7XG4gICAgcHJvY2Vzcy5uZXh0VGljayhmbi5iaW5kKHRoaXMpKVxuICB9IGVsc2Uge1xuICAgIFN0cmVhbS5wcm90b3R5cGUub24uY2FsbCh0aGlzLCBldiwgZm4pXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQWJzdHJhY3QucHJvdG90eXBlLmFib3J0ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLl9hYm9ydGVkID0gdHJ1ZVxuICB0aGlzLmVtaXQoXCJhYm9ydFwiKVxufVxuXG5BYnN0cmFjdC5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHt9XG5cbkFic3RyYWN0LnByb3RvdHlwZS53YXJuID0gZnVuY3Rpb24gKG1zZywgY29kZSkge1xuICB2YXIgbWUgPSB0aGlzXG4gICAgLCBlciA9IGRlY29yYXRlKG1zZywgY29kZSwgbWUpXG4gIGlmICghbWUubGlzdGVuZXJzKFwid2FyblwiKSkge1xuICAgIGNvbnNvbGUuZXJyb3IoXCIlcyAlc1xcblwiICtcbiAgICAgICAgICAgICAgICAgIFwicGF0aCA9ICVzXFxuXCIgK1xuICAgICAgICAgICAgICAgICAgXCJzeXNjYWxsID0gJXNcXG5cIiArXG4gICAgICAgICAgICAgICAgICBcImZzdHJlYW1fdHlwZSA9ICVzXFxuXCIgK1xuICAgICAgICAgICAgICAgICAgXCJmc3RyZWFtX3BhdGggPSAlc1xcblwiICtcbiAgICAgICAgICAgICAgICAgIFwiZnN0cmVhbV91bmNfcGF0aCA9ICVzXFxuXCIgK1xuICAgICAgICAgICAgICAgICAgXCJmc3RyZWFtX2NsYXNzID0gJXNcXG5cIiArXG4gICAgICAgICAgICAgICAgICBcImZzdHJlYW1fc3RhY2sgPVxcbiVzXFxuXCIsXG4gICAgICAgICAgICAgICAgICBjb2RlIHx8IFwiVU5LTk9XTlwiLFxuICAgICAgICAgICAgICAgICAgZXIuc3RhY2ssXG4gICAgICAgICAgICAgICAgICBlci5wYXRoLFxuICAgICAgICAgICAgICAgICAgZXIuc3lzY2FsbCxcbiAgICAgICAgICAgICAgICAgIGVyLmZzdHJlYW1fdHlwZSxcbiAgICAgICAgICAgICAgICAgIGVyLmZzdHJlYW1fcGF0aCxcbiAgICAgICAgICAgICAgICAgIGVyLmZzdHJlYW1fdW5jX3BhdGgsXG4gICAgICAgICAgICAgICAgICBlci5mc3RyZWFtX2NsYXNzLFxuICAgICAgICAgICAgICAgICAgZXIuZnN0cmVhbV9zdGFjay5qb2luKFwiXFxuXCIpKVxuICB9IGVsc2Uge1xuICAgIG1lLmVtaXQoXCJ3YXJuXCIsIGVyKVxuICB9XG59XG5cbkFic3RyYWN0LnByb3RvdHlwZS5pbmZvID0gZnVuY3Rpb24gKG1zZywgY29kZSkge1xuICB0aGlzLmVtaXQoXCJpbmZvXCIsIG1zZywgY29kZSlcbn1cblxuQWJzdHJhY3QucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKG1zZywgY29kZSwgdGgpIHtcbiAgdmFyIGVyID0gZGVjb3JhdGUobXNnLCBjb2RlLCB0aGlzKVxuICBpZiAodGgpIHRocm93IGVyXG4gIGVsc2UgdGhpcy5lbWl0KFwiZXJyb3JcIiwgZXIpXG59XG5cbmZ1bmN0aW9uIGRlY29yYXRlIChlciwgY29kZSwgbWUpIHtcbiAgaWYgKCEoZXIgaW5zdGFuY2VvZiBFcnJvcikpIGVyID0gbmV3IEVycm9yKGVyKVxuICBlci5jb2RlID0gZXIuY29kZSB8fCBjb2RlXG4gIGVyLnBhdGggPSBlci5wYXRoIHx8IG1lLnBhdGhcbiAgZXIuZnN0cmVhbV90eXBlID0gZXIuZnN0cmVhbV90eXBlIHx8IG1lLnR5cGVcbiAgZXIuZnN0cmVhbV9wYXRoID0gZXIuZnN0cmVhbV9wYXRoIHx8IG1lLnBhdGhcbiAgaWYgKG1lLl9wYXRoICE9PSBtZS5wYXRoKSB7XG4gICAgZXIuZnN0cmVhbV91bmNfcGF0aCA9IGVyLmZzdHJlYW1fdW5jX3BhdGggfHwgbWUuX3BhdGhcbiAgfVxuICBpZiAobWUubGlua3BhdGgpIHtcbiAgICBlci5mc3RyZWFtX2xpbmtwYXRoID0gZXIuZnN0cmVhbV9saW5rcGF0aCB8fCBtZS5saW5rcGF0aFxuICB9XG4gIGVyLmZzdHJlYW1fY2xhc3MgPSBlci5mc3RyZWFtX2NsYXNzIHx8IG1lLmNvbnN0cnVjdG9yLm5hbWVcbiAgZXIuZnN0cmVhbV9zdGFjayA9IGVyLmZzdHJlYW1fc3RhY2sgfHxcbiAgICBuZXcgRXJyb3IoKS5zdGFjay5zcGxpdCgvXFxuLykuc2xpY2UoMykubWFwKGZ1bmN0aW9uIChzKSB7XG4gICAgICByZXR1cm4gcy5yZXBsYWNlKC9eICAgIGF0IC8sIFwiXCIpXG4gICAgfSlcblxuICByZXR1cm4gZXJcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gY29sbGVjdFxuXG5mdW5jdGlvbiBjb2xsZWN0IChzdHJlYW0pIHtcbiAgaWYgKHN0cmVhbS5fY29sbGVjdGVkKSByZXR1cm5cblxuICBzdHJlYW0uX2NvbGxlY3RlZCA9IHRydWVcbiAgc3RyZWFtLnBhdXNlKClcblxuICBzdHJlYW0ub24oXCJkYXRhXCIsIHNhdmUpXG4gIHN0cmVhbS5vbihcImVuZFwiLCBzYXZlKVxuICB2YXIgYnVmID0gW11cbiAgZnVuY3Rpb24gc2F2ZSAoYikge1xuICAgIGlmICh0eXBlb2YgYiA9PT0gXCJzdHJpbmdcIikgYiA9IG5ldyBCdWZmZXIoYilcbiAgICBpZiAoQnVmZmVyLmlzQnVmZmVyKGIpICYmICFiLmxlbmd0aCkgcmV0dXJuXG4gICAgYnVmLnB1c2goYilcbiAgfVxuXG4gIHN0cmVhbS5vbihcImVudHJ5XCIsIHNhdmVFbnRyeSlcbiAgdmFyIGVudHJ5QnVmZmVyID0gW11cbiAgZnVuY3Rpb24gc2F2ZUVudHJ5IChlKSB7XG4gICAgY29sbGVjdChlKVxuICAgIGVudHJ5QnVmZmVyLnB1c2goZSlcbiAgfVxuXG4gIHN0cmVhbS5vbihcInByb3h5XCIsIHByb3h5UGF1c2UpXG4gIGZ1bmN0aW9uIHByb3h5UGF1c2UgKHApIHtcbiAgICBwLnBhdXNlKClcbiAgfVxuXG5cbiAgLy8gcmVwbGFjZSB0aGUgcGlwZSBtZXRob2Qgd2l0aCBhIG5ldyB2ZXJzaW9uIHRoYXQgd2lsbFxuICAvLyB1bmxvY2sgdGhlIGJ1ZmZlcmVkIHN0dWZmLiAgaWYgeW91IGp1c3QgY2FsbCAucGlwZSgpXG4gIC8vIHdpdGhvdXQgYSBkZXN0aW5hdGlvbiwgdGhlbiBpdCdsbCByZS1wbGF5IHRoZSBldmVudHMuXG4gIHN0cmVhbS5waXBlID0gKGZ1bmN0aW9uIChvcmlnKSB7IHJldHVybiBmdW5jdGlvbiAoZGVzdCkge1xuICAgIC8vIGNvbnNvbGUuZXJyb3IoXCIgPT09IG9wZW4gdGhlIHBpcGVzXCIsIGRlc3QgJiYgZGVzdC5wYXRoKVxuXG4gICAgLy8gbGV0IHRoZSBlbnRyaWVzIGZsb3cgdGhyb3VnaCBvbmUgYXQgYSB0aW1lLlxuICAgIC8vIE9uY2UgdGhleSdyZSBhbGwgZG9uZSwgdGhlbiB3ZSBjYW4gcmVzdW1lIGNvbXBsZXRlbHkuXG4gICAgdmFyIGUgPSAwXG4gICAgOyhmdW5jdGlvbiB1bmJsb2NrRW50cnkgKCkge1xuICAgICAgdmFyIGVudHJ5ID0gZW50cnlCdWZmZXJbZSsrXVxuICAgICAgLy8gY29uc29sZS5lcnJvcihcIiA9PT09IHVuYmxvY2sgZW50cnlcIiwgZW50cnkgJiYgZW50cnkucGF0aClcbiAgICAgIGlmICghZW50cnkpIHJldHVybiByZXN1bWUoKVxuICAgICAgZW50cnkub24oXCJlbmRcIiwgdW5ibG9ja0VudHJ5KVxuICAgICAgaWYgKGRlc3QpIGRlc3QuYWRkKGVudHJ5KVxuICAgICAgZWxzZSBzdHJlYW0uZW1pdChcImVudHJ5XCIsIGVudHJ5KVxuICAgIH0pKClcblxuICAgIGZ1bmN0aW9uIHJlc3VtZSAoKSB7XG4gICAgICBzdHJlYW0ucmVtb3ZlTGlzdGVuZXIoXCJlbnRyeVwiLCBzYXZlRW50cnkpXG4gICAgICBzdHJlYW0ucmVtb3ZlTGlzdGVuZXIoXCJkYXRhXCIsIHNhdmUpXG4gICAgICBzdHJlYW0ucmVtb3ZlTGlzdGVuZXIoXCJlbmRcIiwgc2F2ZSlcblxuICAgICAgc3RyZWFtLnBpcGUgPSBvcmlnXG4gICAgICBpZiAoZGVzdCkgc3RyZWFtLnBpcGUoZGVzdClcblxuICAgICAgYnVmLmZvckVhY2goZnVuY3Rpb24gKGIpIHtcbiAgICAgICAgaWYgKGIpIHN0cmVhbS5lbWl0KFwiZGF0YVwiLCBiKVxuICAgICAgICBlbHNlIHN0cmVhbS5lbWl0KFwiZW5kXCIpXG4gICAgICB9KVxuXG4gICAgICBzdHJlYW0ucmVzdW1lKClcbiAgICB9XG5cbiAgICByZXR1cm4gZGVzdFxuICB9fSkoc3RyZWFtLnBpcGUpXG59XG4iLCIvLyBBIHRoaW5nIHRoYXQgZW1pdHMgXCJlbnRyeVwiIGV2ZW50cyB3aXRoIFJlYWRlciBvYmplY3RzXG4vLyBQYXVzaW5nIGl0IGNhdXNlcyBpdCB0byBzdG9wIGVtaXR0aW5nIGVudHJ5IGV2ZW50cywgYW5kIGFsc29cbi8vIHBhdXNlcyB0aGUgY3VycmVudCBlbnRyeSBpZiB0aGVyZSBpcyBvbmUuXG5cbm1vZHVsZS5leHBvcnRzID0gRGlyUmVhZGVyXG5cbnZhciBmcyA9IHJlcXVpcmUoXCJncmFjZWZ1bC1mc1wiKVxuICAsIGZzdHJlYW0gPSByZXF1aXJlKFwiLi4vZnN0cmVhbS5qc1wiKVxuICAsIFJlYWRlciA9IGZzdHJlYW0uUmVhZGVyXG4gICwgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIilcbiAgLCBta2RpciA9IHJlcXVpcmUoXCJta2RpcnBcIilcbiAgLCBwYXRoID0gcmVxdWlyZShcInBhdGhcIilcbiAgLCBSZWFkZXIgPSByZXF1aXJlKFwiLi9yZWFkZXIuanNcIilcbiAgLCBhc3NlcnQgPSByZXF1aXJlKFwiYXNzZXJ0XCIpLm9rXG5cbmluaGVyaXRzKERpclJlYWRlciwgUmVhZGVyKVxuXG5mdW5jdGlvbiBEaXJSZWFkZXIgKHByb3BzKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgaWYgKCEobWUgaW5zdGFuY2VvZiBEaXJSZWFkZXIpKSB0aHJvdyBuZXcgRXJyb3IoXG4gICAgXCJEaXJSZWFkZXIgbXVzdCBiZSBjYWxsZWQgYXMgY29uc3RydWN0b3IuXCIpXG5cbiAgLy8gc2hvdWxkIGFscmVhZHkgYmUgZXN0YWJsaXNoZWQgYXMgYSBEaXJlY3RvcnkgdHlwZVxuICBpZiAocHJvcHMudHlwZSAhPT0gXCJEaXJlY3RvcnlcIiB8fCAhcHJvcHMuRGlyZWN0b3J5KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm9uLWRpcmVjdG9yeSB0eXBlIFwiKyBwcm9wcy50eXBlKVxuICB9XG5cbiAgbWUuZW50cmllcyA9IG51bGxcbiAgbWUuX2luZGV4ID0gLTFcbiAgbWUuX3BhdXNlZCA9IGZhbHNlXG4gIG1lLl9sZW5ndGggPSAtMVxuXG4gIGlmIChwcm9wcy5zb3J0KSB7XG4gICAgdGhpcy5zb3J0ID0gcHJvcHMuc29ydFxuICB9XG5cbiAgUmVhZGVyLmNhbGwodGhpcywgcHJvcHMpXG59XG5cbkRpclJlYWRlci5wcm90b3R5cGUuX2dldEVudHJpZXMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBtZSA9IHRoaXNcblxuICAvLyByYWNlIGNvbmRpdGlvbi4gIG1pZ2h0IHBhdXNlKCkgYmVmb3JlIGNhbGxpbmcgX2dldEVudHJpZXMsXG4gIC8vIGFuZCB0aGVuIHJlc3VtZSwgYW5kIHRyeSB0byBnZXQgdGhlbSBhIHNlY29uZCB0aW1lLlxuICBpZiAobWUuX2dvdEVudHJpZXMpIHJldHVyblxuICBtZS5fZ290RW50cmllcyA9IHRydWVcblxuICBmcy5yZWFkZGlyKG1lLl9wYXRoLCBmdW5jdGlvbiAoZXIsIGVudHJpZXMpIHtcbiAgICBpZiAoZXIpIHJldHVybiBtZS5lcnJvcihlcilcblxuICAgIG1lLmVudHJpZXMgPSBlbnRyaWVzXG5cbiAgICBtZS5lbWl0KFwiZW50cmllc1wiLCBlbnRyaWVzKVxuICAgIGlmIChtZS5fcGF1c2VkKSBtZS5vbmNlKFwicmVzdW1lXCIsIHByb2Nlc3NFbnRyaWVzKVxuICAgIGVsc2UgcHJvY2Vzc0VudHJpZXMoKVxuXG4gICAgZnVuY3Rpb24gcHJvY2Vzc0VudHJpZXMgKCkge1xuICAgICAgbWUuX2xlbmd0aCA9IG1lLmVudHJpZXMubGVuZ3RoXG4gICAgICBpZiAodHlwZW9mIG1lLnNvcnQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBtZS5lbnRyaWVzID0gbWUuZW50cmllcy5zb3J0KG1lLnNvcnQuYmluZChtZSkpXG4gICAgICB9XG4gICAgICBtZS5fcmVhZCgpXG4gICAgfVxuICB9KVxufVxuXG4vLyBzdGFydCB3YWxraW5nIHRoZSBkaXIsIGFuZCBlbWl0IGFuIFwiZW50cnlcIiBldmVudCBmb3IgZWFjaCBvbmUuXG5EaXJSZWFkZXIucHJvdG90eXBlLl9yZWFkID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbWUgPSB0aGlzXG5cbiAgaWYgKCFtZS5lbnRyaWVzKSByZXR1cm4gbWUuX2dldEVudHJpZXMoKVxuXG4gIGlmIChtZS5fcGF1c2VkIHx8IG1lLl9jdXJyZW50RW50cnkgfHwgbWUuX2Fib3J0ZWQpIHtcbiAgICAvLyBjb25zb2xlLmVycm9yKFwiRFIgcGF1c2VkPSVqLCBjdXJyZW50PSVqLCBhYm9ydGVkPSVqXCIsIG1lLl9wYXVzZWQsICEhbWUuX2N1cnJlbnRFbnRyeSwgbWUuX2Fib3J0ZWQpXG4gICAgcmV0dXJuXG4gIH1cblxuICBtZS5faW5kZXggKytcbiAgaWYgKG1lLl9pbmRleCA+PSBtZS5lbnRyaWVzLmxlbmd0aCkge1xuICAgIGlmICghbWUuX2VuZGVkKSB7XG4gICAgICBtZS5fZW5kZWQgPSB0cnVlXG4gICAgICBtZS5lbWl0KFwiZW5kXCIpXG4gICAgICBtZS5lbWl0KFwiY2xvc2VcIilcbiAgICB9XG4gICAgcmV0dXJuXG4gIH1cblxuICAvLyBvaywgaGFuZGxlIHRoaXMgb25lLCB0aGVuLlxuXG4gIC8vIHNhdmUgY3JlYXRpbmcgYSBwcm94eSwgYnkgc3RhdCdpbmcgdGhlIHRoaW5nIG5vdy5cbiAgdmFyIHAgPSBwYXRoLnJlc29sdmUobWUuX3BhdGgsIG1lLmVudHJpZXNbbWUuX2luZGV4XSlcbiAgYXNzZXJ0KHAgIT09IG1lLl9wYXRoKVxuICBhc3NlcnQobWUuZW50cmllc1ttZS5faW5kZXhdKVxuXG4gIC8vIHNldCB0aGlzIHRvIHByZXZlbnQgdHJ5aW5nIHRvIF9yZWFkKCkgYWdhaW4gaW4gdGhlIHN0YXQgdGltZS5cbiAgbWUuX2N1cnJlbnRFbnRyeSA9IHBcbiAgZnNbIG1lLnByb3BzLmZvbGxvdyA/IFwic3RhdFwiIDogXCJsc3RhdFwiIF0ocCwgZnVuY3Rpb24gKGVyLCBzdGF0KSB7XG4gICAgaWYgKGVyKSByZXR1cm4gbWUuZXJyb3IoZXIpXG5cbiAgICB2YXIgd2hvID0gbWUuX3Byb3h5IHx8IG1lXG5cbiAgICBzdGF0LnBhdGggPSBwXG4gICAgc3RhdC5iYXNlbmFtZSA9IHBhdGguYmFzZW5hbWUocClcbiAgICBzdGF0LmRpcm5hbWUgPSBwYXRoLmRpcm5hbWUocClcbiAgICB2YXIgY2hpbGRQcm9wcyA9IG1lLmdldENoaWxkUHJvcHMuY2FsbCh3aG8sIHN0YXQpXG4gICAgY2hpbGRQcm9wcy5wYXRoID0gcFxuICAgIGNoaWxkUHJvcHMuYmFzZW5hbWUgPSBwYXRoLmJhc2VuYW1lKHApXG4gICAgY2hpbGRQcm9wcy5kaXJuYW1lID0gcGF0aC5kaXJuYW1lKHApXG5cbiAgICB2YXIgZW50cnkgPSBSZWFkZXIoY2hpbGRQcm9wcywgc3RhdClcblxuICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJEUiBFbnRyeVwiLCBwLCBzdGF0LnNpemUpXG5cbiAgICBtZS5fY3VycmVudEVudHJ5ID0gZW50cnlcblxuICAgIC8vIFwiZW50cnlcIiBldmVudHMgYXJlIGZvciBkaXJlY3QgZW50cmllcyBpbiBhIHNwZWNpZmljIGRpci5cbiAgICAvLyBcImNoaWxkXCIgZXZlbnRzIGFyZSBmb3IgYW55IGFuZCBhbGwgY2hpbGRyZW4gYXQgYWxsIGxldmVscy5cbiAgICAvLyBUaGlzIG5vbWVuY2xhdHVyZSBpcyBub3QgY29tcGxldGVseSBmaW5hbC5cblxuICAgIGVudHJ5Lm9uKFwicGF1c2VcIiwgZnVuY3Rpb24gKHdobykge1xuICAgICAgaWYgKCFtZS5fcGF1c2VkICYmICFlbnRyeS5fZGlzb3duZWQpIHtcbiAgICAgICAgbWUucGF1c2Uod2hvKVxuICAgICAgfVxuICAgIH0pXG5cbiAgICBlbnRyeS5vbihcInJlc3VtZVwiLCBmdW5jdGlvbiAod2hvKSB7XG4gICAgICBpZiAobWUuX3BhdXNlZCAmJiAhZW50cnkuX2Rpc293bmVkKSB7XG4gICAgICAgIG1lLnJlc3VtZSh3aG8pXG4gICAgICB9XG4gICAgfSlcblxuICAgIGVudHJ5Lm9uKFwic3RhdFwiLCBmdW5jdGlvbiAocHJvcHMpIHtcbiAgICAgIG1lLmVtaXQoXCJfZW50cnlTdGF0XCIsIGVudHJ5LCBwcm9wcylcbiAgICAgIGlmIChlbnRyeS5fYWJvcnRlZCkgcmV0dXJuXG4gICAgICBpZiAoZW50cnkuX3BhdXNlZCkgZW50cnkub25jZShcInJlc3VtZVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG1lLmVtaXQoXCJlbnRyeVN0YXRcIiwgZW50cnksIHByb3BzKVxuICAgICAgfSlcbiAgICAgIGVsc2UgbWUuZW1pdChcImVudHJ5U3RhdFwiLCBlbnRyeSwgcHJvcHMpXG4gICAgfSlcblxuICAgIGVudHJ5Lm9uKFwicmVhZHlcIiwgZnVuY3Rpb24gRU1JVENISUxEICgpIHtcbiAgICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJEUiBlbWl0IGNoaWxkXCIsIGVudHJ5Ll9wYXRoKVxuICAgICAgaWYgKG1lLl9wYXVzZWQpIHtcbiAgICAgICAgLy8gY29uc29sZS5lcnJvcihcIiAgRFIgZW1pdCBjaGlsZCAtIHRyeSBhZ2FpbiBsYXRlclwiKVxuICAgICAgICAvLyBwYXVzZSB0aGUgY2hpbGQsIGFuZCBlbWl0IHRoZSBcImVudHJ5XCIgZXZlbnQgb25jZSB3ZSBkcmFpbi5cbiAgICAgICAgLy8gY29uc29sZS5lcnJvcihcIkRSIHBhdXNpbmcgY2hpbGQgZW50cnlcIilcbiAgICAgICAgZW50cnkucGF1c2UobWUpXG4gICAgICAgIHJldHVybiBtZS5vbmNlKFwicmVzdW1lXCIsIEVNSVRDSElMRClcbiAgICAgIH1cblxuICAgICAgLy8gc2tpcCBvdmVyIHNvY2tldHMuICB0aGV5IGNhbid0IGJlIHBpcGVkIGFyb3VuZCBwcm9wZXJseSxcbiAgICAgIC8vIHNvIHRoZXJlJ3MgcmVhbGx5IG5vIHNlbnNlIGV2ZW4gYWNrbm93bGVkZ2luZyB0aGVtLlxuICAgICAgLy8gaWYgc29tZW9uZSByZWFsbHkgd2FudHMgdG8gc2VlIHRoZW0sIHRoZXkgY2FuIGxpc3RlbiB0b1xuICAgICAgLy8gdGhlIFwic29ja2V0XCIgZXZlbnRzLlxuICAgICAgaWYgKGVudHJ5LnR5cGUgPT09IFwiU29ja2V0XCIpIHtcbiAgICAgICAgbWUuZW1pdChcInNvY2tldFwiLCBlbnRyeSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1lLmVtaXRFbnRyeShlbnRyeSlcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdmFyIGVuZGVkID0gZmFsc2VcbiAgICBlbnRyeS5vbihcImNsb3NlXCIsIG9uZW5kKVxuICAgIGVudHJ5Lm9uKFwiZGlzb3duXCIsIG9uZW5kKVxuICAgIGZ1bmN0aW9uIG9uZW5kICgpIHtcbiAgICAgIGlmIChlbmRlZCkgcmV0dXJuXG4gICAgICBlbmRlZCA9IHRydWVcbiAgICAgIG1lLmVtaXQoXCJjaGlsZEVuZFwiLCBlbnRyeSlcbiAgICAgIG1lLmVtaXQoXCJlbnRyeUVuZFwiLCBlbnRyeSlcbiAgICAgIG1lLl9jdXJyZW50RW50cnkgPSBudWxsXG4gICAgICBpZiAoIW1lLl9wYXVzZWQpIHtcbiAgICAgICAgbWUuX3JlYWQoKVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFhYWCBSZW1vdmUgdGhpcy4gIFdvcmtzIGluIG5vZGUgYXMgb2YgMC42LjIgb3Igc28uXG4gICAgLy8gTG9uZyBmaWxlbmFtZXMgc2hvdWxkIG5vdCBicmVhayBzdHVmZi5cbiAgICBlbnRyeS5vbihcImVycm9yXCIsIGZ1bmN0aW9uIChlcikge1xuICAgICAgaWYgKGVudHJ5Ll9zd2FsbG93RXJyb3JzKSB7XG4gICAgICAgIG1lLndhcm4oZXIpXG4gICAgICAgIGVudHJ5LmVtaXQoXCJlbmRcIilcbiAgICAgICAgZW50cnkuZW1pdChcImNsb3NlXCIpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtZS5lbWl0KFwiZXJyb3JcIiwgZXIpXG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vIHByb3h5IHVwIHNvbWUgZXZlbnRzLlxuICAgIDsgWyBcImNoaWxkXCJcbiAgICAgICwgXCJjaGlsZEVuZFwiXG4gICAgICAsIFwid2FyblwiXG4gICAgICBdLmZvckVhY2goZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgIGVudHJ5Lm9uKGV2LCBtZS5lbWl0LmJpbmQobWUsIGV2KSlcbiAgICAgIH0pXG4gIH0pXG59XG5cbkRpclJlYWRlci5wcm90b3R5cGUuZGlzb3duID0gZnVuY3Rpb24gKGVudHJ5KSB7XG4gIGVudHJ5LmVtaXQoXCJiZWZvcmVEaXNvd25cIilcbiAgZW50cnkuX2Rpc293bmVkID0gdHJ1ZVxuICBlbnRyeS5wYXJlbnQgPSBlbnRyeS5yb290ID0gbnVsbFxuICBpZiAoZW50cnkgPT09IHRoaXMuX2N1cnJlbnRFbnRyeSkge1xuICAgIHRoaXMuX2N1cnJlbnRFbnRyeSA9IG51bGxcbiAgfVxuICBlbnRyeS5lbWl0KFwiZGlzb3duXCIpXG59XG5cbkRpclJlYWRlci5wcm90b3R5cGUuZ2V0Q2hpbGRQcm9wcyA9IGZ1bmN0aW9uIChzdGF0KSB7XG4gIHJldHVybiB7IGRlcHRoOiB0aGlzLmRlcHRoICsgMVxuICAgICAgICAgLCByb290OiB0aGlzLnJvb3QgfHwgdGhpc1xuICAgICAgICAgLCBwYXJlbnQ6IHRoaXNcbiAgICAgICAgICwgZm9sbG93OiB0aGlzLmZvbGxvd1xuICAgICAgICAgLCBmaWx0ZXI6IHRoaXMuZmlsdGVyXG4gICAgICAgICAsIHNvcnQ6IHRoaXMucHJvcHMuc29ydFxuICAgICAgICAgLCBoYXJkbGlua3M6IHRoaXMucHJvcHMuaGFyZGxpbmtzXG4gICAgICAgICB9XG59XG5cbkRpclJlYWRlci5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbiAod2hvKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgaWYgKG1lLl9wYXVzZWQpIHJldHVyblxuICB3aG8gPSB3aG8gfHwgbWVcbiAgbWUuX3BhdXNlZCA9IHRydWVcbiAgaWYgKG1lLl9jdXJyZW50RW50cnkgJiYgbWUuX2N1cnJlbnRFbnRyeS5wYXVzZSkge1xuICAgIG1lLl9jdXJyZW50RW50cnkucGF1c2Uod2hvKVxuICB9XG4gIG1lLmVtaXQoXCJwYXVzZVwiLCB3aG8pXG59XG5cbkRpclJlYWRlci5wcm90b3R5cGUucmVzdW1lID0gZnVuY3Rpb24gKHdobykge1xuICB2YXIgbWUgPSB0aGlzXG4gIGlmICghbWUuX3BhdXNlZCkgcmV0dXJuXG4gIHdobyA9IHdobyB8fCBtZVxuXG4gIG1lLl9wYXVzZWQgPSBmYWxzZVxuICAvLyBjb25zb2xlLmVycm9yKFwiRFIgRW1pdCBSZXN1bWVcIiwgbWUuX3BhdGgpXG4gIG1lLmVtaXQoXCJyZXN1bWVcIiwgd2hvKVxuICBpZiAobWUuX3BhdXNlZCkge1xuICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJEUiBSZS1wYXVzZWRcIiwgbWUuX3BhdGgpXG4gICAgcmV0dXJuXG4gIH1cblxuICBpZiAobWUuX2N1cnJlbnRFbnRyeSkge1xuICAgIGlmIChtZS5fY3VycmVudEVudHJ5LnJlc3VtZSkgbWUuX2N1cnJlbnRFbnRyeS5yZXN1bWUod2hvKVxuICB9IGVsc2UgbWUuX3JlYWQoKVxufVxuXG5EaXJSZWFkZXIucHJvdG90eXBlLmVtaXRFbnRyeSA9IGZ1bmN0aW9uIChlbnRyeSkge1xuICB0aGlzLmVtaXQoXCJlbnRyeVwiLCBlbnRyeSlcbiAgdGhpcy5lbWl0KFwiY2hpbGRcIiwgZW50cnkpXG59XG4iLCIvLyBJdCBpcyBleHBlY3RlZCB0aGF0LCB3aGVuIC5hZGQoKSByZXR1cm5zIGZhbHNlLCB0aGUgY29uc3VtZXJcbi8vIG9mIHRoZSBEaXJXcml0ZXIgd2lsbCBwYXVzZSB1bnRpbCBhIFwiZHJhaW5cIiBldmVudCBvY2N1cnMuIE5vdGVcbi8vIHRoYXQgdGhpcyBpcyAqYWxtb3N0IGFsd2F5cyBnb2luZyB0byBiZSB0aGUgY2FzZSosIHVubGVzcyB0aGVcbi8vIHRoaW5nIGJlaW5nIHdyaXR0ZW4gaXMgc29tZSBzb3J0IG9mIHVuc3VwcG9ydGVkIHR5cGUsIGFuZCB0aHVzXG4vLyBza2lwcGVkIG92ZXIuXG5cbm1vZHVsZS5leHBvcnRzID0gRGlyV3JpdGVyXG5cbnZhciBmcyA9IHJlcXVpcmUoXCJncmFjZWZ1bC1mc1wiKVxuICAsIGZzdHJlYW0gPSByZXF1aXJlKFwiLi4vZnN0cmVhbS5qc1wiKVxuICAsIFdyaXRlciA9IHJlcXVpcmUoXCIuL3dyaXRlci5qc1wiKVxuICAsIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpXG4gICwgbWtkaXIgPSByZXF1aXJlKFwibWtkaXJwXCIpXG4gICwgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpXG4gICwgY29sbGVjdCA9IHJlcXVpcmUoXCIuL2NvbGxlY3QuanNcIilcblxuaW5oZXJpdHMoRGlyV3JpdGVyLCBXcml0ZXIpXG5cbmZ1bmN0aW9uIERpcldyaXRlciAocHJvcHMpIHtcbiAgdmFyIG1lID0gdGhpc1xuICBpZiAoIShtZSBpbnN0YW5jZW9mIERpcldyaXRlcikpIG1lLmVycm9yKFxuICAgIFwiRGlyV3JpdGVyIG11c3QgYmUgY2FsbGVkIGFzIGNvbnN0cnVjdG9yLlwiLCBudWxsLCB0cnVlKVxuXG4gIC8vIHNob3VsZCBhbHJlYWR5IGJlIGVzdGFibGlzaGVkIGFzIGEgRGlyZWN0b3J5IHR5cGVcbiAgaWYgKHByb3BzLnR5cGUgIT09IFwiRGlyZWN0b3J5XCIgfHwgIXByb3BzLkRpcmVjdG9yeSkge1xuICAgIG1lLmVycm9yKFwiTm9uLWRpcmVjdG9yeSB0eXBlIFwiKyBwcm9wcy50eXBlICsgXCIgXCIgK1xuICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeShwcm9wcyksIG51bGwsIHRydWUpXG4gIH1cblxuICBXcml0ZXIuY2FsbCh0aGlzLCBwcm9wcylcbn1cblxuRGlyV3JpdGVyLnByb3RvdHlwZS5fY3JlYXRlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbWUgPSB0aGlzXG4gIG1rZGlyKG1lLl9wYXRoLCBXcml0ZXIuZGlybW9kZSwgZnVuY3Rpb24gKGVyKSB7XG4gICAgaWYgKGVyKSByZXR1cm4gbWUuZXJyb3IoZXIpXG4gICAgLy8gcmVhZHkgdG8gc3RhcnQgZ2V0dGluZyBlbnRyaWVzIVxuICAgIG1lLnJlYWR5ID0gdHJ1ZVxuICAgIG1lLmVtaXQoXCJyZWFkeVwiKVxuICAgIG1lLl9wcm9jZXNzKClcbiAgfSlcbn1cblxuLy8gYSBEaXJXcml0ZXIgaGFzIGFuIGFkZChlbnRyeSkgbWV0aG9kLCBidXQgaXRzIC53cml0ZSgpIGRvZXNuJ3Rcbi8vIGRvIGFueXRoaW5nLiAgV2h5IGEgbm8tb3AgcmF0aGVyIHRoYW4gYSB0aHJvdz8gIEJlY2F1c2UgdGhpc1xuLy8gbGVhdmVzIG9wZW4gdGhlIGRvb3IgZm9yIHdyaXRpbmcgZGlyZWN0b3J5IG1ldGFkYXRhIGZvclxuLy8gZ251L3NvbGFyaXMgc3R5bGUgZHVtcGRpcnMuXG5EaXJXcml0ZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdHJ1ZVxufVxuXG5EaXJXcml0ZXIucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5fZW5kZWQgPSB0cnVlXG4gIHRoaXMuX3Byb2Nlc3MoKVxufVxuXG5EaXJXcml0ZXIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChlbnRyeSkge1xuICB2YXIgbWUgPSB0aGlzXG5cbiAgLy8gY29uc29sZS5lcnJvcihcIlxcdGFkZFwiLCBlbnRyeS5fcGF0aCwgXCItPlwiLCBtZS5fcGF0aClcbiAgY29sbGVjdChlbnRyeSlcbiAgaWYgKCFtZS5yZWFkeSB8fCBtZS5fY3VycmVudEVudHJ5KSB7XG4gICAgbWUuX2J1ZmZlci5wdXNoKGVudHJ5KVxuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgLy8gY3JlYXRlIGEgbmV3IHdyaXRlciwgYW5kIHBpcGUgdGhlIGluY29taW5nIGVudHJ5IGludG8gaXQuXG4gIGlmIChtZS5fZW5kZWQpIHtcbiAgICByZXR1cm4gbWUuZXJyb3IoXCJhZGQgYWZ0ZXIgZW5kXCIpXG4gIH1cblxuICBtZS5fYnVmZmVyLnB1c2goZW50cnkpXG4gIG1lLl9wcm9jZXNzKClcblxuICByZXR1cm4gMCA9PT0gdGhpcy5fYnVmZmVyLmxlbmd0aFxufVxuXG5EaXJXcml0ZXIucHJvdG90eXBlLl9wcm9jZXNzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbWUgPSB0aGlzXG5cbiAgLy8gY29uc29sZS5lcnJvcihcIkRXIFByb2Nlc3MgcD0lalwiLCBtZS5fcHJvY2Vzc2luZywgbWUuYmFzZW5hbWUpXG5cbiAgaWYgKG1lLl9wcm9jZXNzaW5nKSByZXR1cm5cblxuICB2YXIgZW50cnkgPSBtZS5fYnVmZmVyLnNoaWZ0KClcbiAgaWYgKCFlbnRyeSkge1xuICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJEVyBEcmFpblwiKVxuICAgIG1lLmVtaXQoXCJkcmFpblwiKVxuICAgIGlmIChtZS5fZW5kZWQpIG1lLl9maW5pc2goKVxuICAgIHJldHVyblxuICB9XG5cbiAgbWUuX3Byb2Nlc3NpbmcgPSB0cnVlXG4gIC8vIGNvbnNvbGUuZXJyb3IoXCJEVyBFbnRyeVwiLCBlbnRyeS5fcGF0aClcblxuICBtZS5lbWl0KFwiZW50cnlcIiwgZW50cnkpXG5cbiAgLy8gb2ssIGFkZCB0aGlzIGVudHJ5XG4gIC8vXG4gIC8vIGRvbid0IGFsbG93IHJlY3Vyc2l2ZSBjb3B5aW5nXG4gIHZhciBwID0gZW50cnlcbiAgZG8ge1xuICAgIHZhciBwcCA9IHAuX3BhdGggfHwgcC5wYXRoXG4gICAgaWYgKHBwID09PSBtZS5yb290Ll9wYXRoIHx8IHBwID09PSBtZS5fcGF0aCB8fFxuICAgICAgICAocHAgJiYgcHAuaW5kZXhPZihtZS5fcGF0aCkgPT09IDApKSB7XG4gICAgICAvLyBjb25zb2xlLmVycm9yKFwiRFcgRXhpdCAocmVjdXJzaXZlKVwiLCBlbnRyeS5iYXNlbmFtZSwgbWUuX3BhdGgpXG4gICAgICBtZS5fcHJvY2Vzc2luZyA9IGZhbHNlXG4gICAgICBpZiAoZW50cnkuX2NvbGxlY3RlZCkgZW50cnkucGlwZSgpXG4gICAgICByZXR1cm4gbWUuX3Byb2Nlc3MoKVxuICAgIH1cbiAgfSB3aGlsZSAocCA9IHAucGFyZW50KVxuXG4gIC8vIGNvbnNvbGUuZXJyb3IoXCJEVyBub3QgcmVjdXJzaXZlXCIpXG5cbiAgLy8gY2hvcCBvZmYgdGhlIGVudHJ5J3Mgcm9vdCBkaXIsIHJlcGxhY2Ugd2l0aCBvdXJzXG4gIHZhciBwcm9wcyA9IHsgcGFyZW50OiBtZVxuICAgICAgICAgICAgICAsIHJvb3Q6IG1lLnJvb3QgfHwgbWVcbiAgICAgICAgICAgICAgLCB0eXBlOiBlbnRyeS50eXBlXG4gICAgICAgICAgICAgICwgZGVwdGg6IG1lLmRlcHRoICsgMSB9XG5cbiAgdmFyIHAgPSBlbnRyeS5fcGF0aCB8fCBlbnRyeS5wYXRoIHx8IGVudHJ5LnByb3BzLnBhdGhcbiAgaWYgKGVudHJ5LnBhcmVudCkge1xuICAgIHAgPSBwLnN1YnN0cihlbnRyeS5wYXJlbnQuX3BhdGgubGVuZ3RoICsgMSlcbiAgfVxuICAvLyBnZXQgcmlkIG9mIGFueSAuLi8uLi8gc2hlbmFuaWdhbnNcbiAgcHJvcHMucGF0aCA9IHBhdGguam9pbihtZS5wYXRoLCBwYXRoLmpvaW4oXCIvXCIsIHApKVxuXG4gIC8vIGlmIGkgaGF2ZSBhIGZpbHRlciwgdGhlIGNoaWxkIHNob3VsZCBpbmhlcml0IGl0LlxuICBwcm9wcy5maWx0ZXIgPSBtZS5maWx0ZXJcblxuICAvLyBhbGwgdGhlIHJlc3Qgb2YgdGhlIHN0dWZmLCBjb3B5IG92ZXIgZnJvbSB0aGUgc291cmNlLlxuICBPYmplY3Qua2V5cyhlbnRyeS5wcm9wcykuZm9yRWFjaChmdW5jdGlvbiAoaykge1xuICAgIGlmICghcHJvcHMuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgIHByb3BzW2tdID0gZW50cnkucHJvcHNba11cbiAgICB9XG4gIH0pXG5cbiAgLy8gbm90IHN1cmUgYXQgdGhpcyBwb2ludCB3aGF0IGtpbmQgb2Ygd3JpdGVyIHRoaXMgaXMuXG4gIHZhciBjaGlsZCA9IG1lLl9jdXJyZW50Q2hpbGQgPSBuZXcgV3JpdGVyKHByb3BzKVxuICBjaGlsZC5vbihcInJlYWR5XCIsIGZ1bmN0aW9uICgpIHtcbiAgICAvLyBjb25zb2xlLmVycm9yKFwiRFcgQ2hpbGQgUmVhZHlcIiwgY2hpbGQudHlwZSwgY2hpbGQuX3BhdGgpXG4gICAgLy8gY29uc29sZS5lcnJvcihcIiAgcmVzdW1pbmdcIiwgZW50cnkuX3BhdGgpXG4gICAgZW50cnkucGlwZShjaGlsZClcbiAgICBlbnRyeS5yZXN1bWUoKVxuICB9KVxuXG4gIC8vIFhYWCBNYWtlIHRoaXMgd29yayBpbiBub2RlLlxuICAvLyBMb25nIGZpbGVuYW1lcyBzaG91bGQgbm90IGJyZWFrIHN0dWZmLlxuICBjaGlsZC5vbihcImVycm9yXCIsIGZ1bmN0aW9uIChlcikge1xuICAgIGlmIChjaGlsZC5fc3dhbGxvd0Vycm9ycykge1xuICAgICAgbWUud2FybihlcilcbiAgICAgIGNoaWxkLmVtaXQoXCJlbmRcIilcbiAgICAgIGNoaWxkLmVtaXQoXCJjbG9zZVwiKVxuICAgIH0gZWxzZSB7XG4gICAgICBtZS5lbWl0KFwiZXJyb3JcIiwgZXIpXG4gICAgfVxuICB9KVxuXG4gIC8vIHdlIGZpcmUgX2VuZCBpbnRlcm5hbGx5ICphZnRlciogZW5kLCBzbyB0aGF0IHdlIGRvbid0IG1vdmUgb25cbiAgLy8gdW50aWwgYW55IFwiZW5kXCIgbGlzdGVuZXJzIGhhdmUgaGFkIHRoZWlyIGNoYW5jZSB0byBkbyBzdHVmZi5cbiAgY2hpbGQub24oXCJjbG9zZVwiLCBvbmVuZClcbiAgdmFyIGVuZGVkID0gZmFsc2VcbiAgZnVuY3Rpb24gb25lbmQgKCkge1xuICAgIGlmIChlbmRlZCkgcmV0dXJuXG4gICAgZW5kZWQgPSB0cnVlXG4gICAgLy8gY29uc29sZS5lcnJvcihcIiogRFcgQ2hpbGQgZW5kXCIsIGNoaWxkLmJhc2VuYW1lKVxuICAgIG1lLl9jdXJyZW50Q2hpbGQgPSBudWxsXG4gICAgbWUuX3Byb2Nlc3NpbmcgPSBmYWxzZVxuICAgIG1lLl9wcm9jZXNzKClcbiAgfVxufVxuIiwiLy8gQmFzaWNhbGx5IGp1c3QgYSB3cmFwcGVyIGFyb3VuZCBhbiBmcy5SZWFkU3RyZWFtXG5cbm1vZHVsZS5leHBvcnRzID0gRmlsZVJlYWRlclxuXG52YXIgZnMgPSByZXF1aXJlKFwiZ3JhY2VmdWwtZnNcIilcbiAgLCBmc3RyZWFtID0gcmVxdWlyZShcIi4uL2ZzdHJlYW0uanNcIilcbiAgLCBSZWFkZXIgPSBmc3RyZWFtLlJlYWRlclxuICAsIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpXG4gICwgbWtkaXIgPSByZXF1aXJlKFwibWtkaXJwXCIpXG4gICwgUmVhZGVyID0gcmVxdWlyZShcIi4vcmVhZGVyLmpzXCIpXG4gICwgRU9GID0ge0VPRjogdHJ1ZX1cbiAgLCBDTE9TRSA9IHtDTE9TRTogdHJ1ZX1cblxuaW5oZXJpdHMoRmlsZVJlYWRlciwgUmVhZGVyKVxuXG5mdW5jdGlvbiBGaWxlUmVhZGVyIChwcm9wcykge1xuICAvLyBjb25zb2xlLmVycm9yKFwiICAgIEZSIGNyZWF0ZVwiLCBwcm9wcy5wYXRoLCBwcm9wcy5zaXplLCBuZXcgRXJyb3IoKS5zdGFjaylcbiAgdmFyIG1lID0gdGhpc1xuICBpZiAoIShtZSBpbnN0YW5jZW9mIEZpbGVSZWFkZXIpKSB0aHJvdyBuZXcgRXJyb3IoXG4gICAgXCJGaWxlUmVhZGVyIG11c3QgYmUgY2FsbGVkIGFzIGNvbnN0cnVjdG9yLlwiKVxuXG4gIC8vIHNob3VsZCBhbHJlYWR5IGJlIGVzdGFibGlzaGVkIGFzIGEgRmlsZSB0eXBlXG4gIC8vIFhYWCBUb2RvOiBwcmVzZXJ2ZSBoYXJkbGlua3MgYnkgdHJhY2tpbmcgZGV2K2lub2RlK25saW5rLFxuICAvLyB3aXRoIGEgSGFyZExpbmtSZWFkZXIgY2xhc3MuXG4gIGlmICghKChwcm9wcy50eXBlID09PSBcIkxpbmtcIiAmJiBwcm9wcy5MaW5rKSB8fFxuICAgICAgICAocHJvcHMudHlwZSA9PT0gXCJGaWxlXCIgJiYgcHJvcHMuRmlsZSkpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm9uLWZpbGUgdHlwZSBcIisgcHJvcHMudHlwZSlcbiAgfVxuXG4gIG1lLl9idWZmZXIgPSBbXVxuICBtZS5fYnl0ZXNFbWl0dGVkID0gMFxuICBSZWFkZXIuY2FsbChtZSwgcHJvcHMpXG59XG5cbkZpbGVSZWFkZXIucHJvdG90eXBlLl9nZXRTdHJlYW0gPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgICAsIHN0cmVhbSA9IG1lLl9zdHJlYW0gPSBmcy5jcmVhdGVSZWFkU3RyZWFtKG1lLl9wYXRoLCBtZS5wcm9wcylcblxuICBpZiAobWUucHJvcHMuYmxrc2l6ZSkge1xuICAgIHN0cmVhbS5idWZmZXJTaXplID0gbWUucHJvcHMuYmxrc2l6ZVxuICB9XG5cbiAgc3RyZWFtLm9uKFwib3BlblwiLCBtZS5lbWl0LmJpbmQobWUsIFwib3BlblwiKSlcblxuICBzdHJlYW0ub24oXCJkYXRhXCIsIGZ1bmN0aW9uIChjKSB7XG4gICAgLy8gY29uc29sZS5lcnJvcihcIlxcdFxcdCVkICVzXCIsIGMubGVuZ3RoLCBtZS5iYXNlbmFtZSlcbiAgICBtZS5fYnl0ZXNFbWl0dGVkICs9IGMubGVuZ3RoXG4gICAgLy8gbm8gcG9pbnQgc2F2aW5nIGVtcHR5IGNodW5rc1xuICAgIGlmICghYy5sZW5ndGgpIHJldHVyblxuICAgIGVsc2UgaWYgKG1lLl9wYXVzZWQgfHwgbWUuX2J1ZmZlci5sZW5ndGgpIHtcbiAgICAgIG1lLl9idWZmZXIucHVzaChjKVxuICAgICAgbWUuX3JlYWQoKVxuICAgIH0gZWxzZSBtZS5lbWl0KFwiZGF0YVwiLCBjKVxuICB9KVxuXG4gIHN0cmVhbS5vbihcImVuZFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKG1lLl9wYXVzZWQgfHwgbWUuX2J1ZmZlci5sZW5ndGgpIHtcbiAgICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJGUiBCdWZmZXJpbmcgRW5kXCIsIG1lLl9wYXRoKVxuICAgICAgbWUuX2J1ZmZlci5wdXNoKEVPRilcbiAgICAgIG1lLl9yZWFkKClcbiAgICB9IGVsc2Uge1xuICAgICAgbWUuZW1pdChcImVuZFwiKVxuICAgIH1cblxuICAgIGlmIChtZS5fYnl0ZXNFbWl0dGVkICE9PSBtZS5wcm9wcy5zaXplKSB7XG4gICAgICBtZS5lcnJvcihcIkRpZG4ndCBnZXQgZXhwZWN0ZWQgYnl0ZSBjb3VudFxcblwiK1xuICAgICAgICAgICAgICAgXCJleHBlY3Q6IFwiK21lLnByb3BzLnNpemUgKyBcIlxcblwiICtcbiAgICAgICAgICAgICAgIFwiYWN0dWFsOiBcIittZS5fYnl0ZXNFbWl0dGVkKVxuICAgIH1cbiAgfSlcblxuICBzdHJlYW0ub24oXCJjbG9zZVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKG1lLl9wYXVzZWQgfHwgbWUuX2J1ZmZlci5sZW5ndGgpIHtcbiAgICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJGUiBCdWZmZXJpbmcgQ2xvc2VcIiwgbWUuX3BhdGgpXG4gICAgICBtZS5fYnVmZmVyLnB1c2goQ0xPU0UpXG4gICAgICBtZS5fcmVhZCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJGUiBjbG9zZSAxXCIsIG1lLl9wYXRoKVxuICAgICAgbWUuZW1pdChcImNsb3NlXCIpXG4gICAgfVxuICB9KVxuXG4gIG1lLl9yZWFkKClcbn1cblxuRmlsZVJlYWRlci5wcm90b3R5cGUuX3JlYWQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgLy8gY29uc29sZS5lcnJvcihcIkZSIF9yZWFkXCIsIG1lLl9wYXRoKVxuICBpZiAobWUuX3BhdXNlZCkge1xuICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJGUiBfcmVhZCBwYXVzZWRcIiwgbWUuX3BhdGgpXG4gICAgcmV0dXJuXG4gIH1cblxuICBpZiAoIW1lLl9zdHJlYW0pIHtcbiAgICAvLyBjb25zb2xlLmVycm9yKFwiRlIgX2dldFN0cmVhbSBjYWxsaW5nXCIsIG1lLl9wYXRoKVxuICAgIHJldHVybiBtZS5fZ2V0U3RyZWFtKClcbiAgfVxuXG4gIC8vIGNsZWFyIG91dCB0aGUgYnVmZmVyLCBpZiB0aGVyZSBpcyBvbmUuXG4gIGlmIChtZS5fYnVmZmVyLmxlbmd0aCkge1xuICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJGUiBfcmVhZCBoYXMgYnVmZmVyXCIsIG1lLl9idWZmZXIubGVuZ3RoLCBtZS5fcGF0aClcbiAgICB2YXIgYnVmID0gbWUuX2J1ZmZlclxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gYnVmLmxlbmd0aDsgaSA8IGw7IGkgKyspIHtcbiAgICAgIHZhciBjID0gYnVmW2ldXG4gICAgICBpZiAoYyA9PT0gRU9GKSB7XG4gICAgICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJGUiBSZWFkIGVtaXR0aW5nIGJ1ZmZlcmVkIGVuZFwiLCBtZS5fcGF0aClcbiAgICAgICAgbWUuZW1pdChcImVuZFwiKVxuICAgICAgfSBlbHNlIGlmIChjID09PSBDTE9TRSkge1xuICAgICAgICAvLyBjb25zb2xlLmVycm9yKFwiRlIgUmVhZCBlbWl0dGluZyBidWZmZXJlZCBjbG9zZVwiLCBtZS5fcGF0aClcbiAgICAgICAgbWUuZW1pdChcImNsb3NlXCIpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBjb25zb2xlLmVycm9yKFwiRlIgUmVhZCBlbWl0dGluZyBidWZmZXJlZCBkYXRhXCIsIG1lLl9wYXRoKVxuICAgICAgICBtZS5lbWl0KFwiZGF0YVwiLCBjKVxuICAgICAgfVxuXG4gICAgICBpZiAobWUuX3BhdXNlZCkge1xuICAgICAgICAvLyBjb25zb2xlLmVycm9yKFwiRlIgUmVhZCBSZS1wYXVzaW5nIGF0IFwiK2ksIG1lLl9wYXRoKVxuICAgICAgICBtZS5fYnVmZmVyID0gYnVmLnNsaWNlKGkpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgIH1cbiAgICBtZS5fYnVmZmVyLmxlbmd0aCA9IDBcbiAgfVxuICAvLyBjb25zb2xlLmVycm9yKFwiRlIgX3JlYWQgZG9uZVwiKVxuICAvLyB0aGF0J3MgYWJvdXQgYWxsIHRoZXJlIGlzIHRvIGl0LlxufVxuXG5GaWxlUmVhZGVyLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uICh3aG8pIHtcbiAgdmFyIG1lID0gdGhpc1xuICAvLyBjb25zb2xlLmVycm9yKFwiRlIgUGF1c2VcIiwgbWUuX3BhdGgpXG4gIGlmIChtZS5fcGF1c2VkKSByZXR1cm5cbiAgd2hvID0gd2hvIHx8IG1lXG4gIG1lLl9wYXVzZWQgPSB0cnVlXG4gIGlmIChtZS5fc3RyZWFtKSBtZS5fc3RyZWFtLnBhdXNlKClcbiAgbWUuZW1pdChcInBhdXNlXCIsIHdobylcbn1cblxuRmlsZVJlYWRlci5wcm90b3R5cGUucmVzdW1lID0gZnVuY3Rpb24gKHdobykge1xuICB2YXIgbWUgPSB0aGlzXG4gIC8vIGNvbnNvbGUuZXJyb3IoXCJGUiBSZXN1bWVcIiwgbWUuX3BhdGgpXG4gIGlmICghbWUuX3BhdXNlZCkgcmV0dXJuXG4gIHdobyA9IHdobyB8fCBtZVxuICBtZS5lbWl0KFwicmVzdW1lXCIsIHdobylcbiAgbWUuX3BhdXNlZCA9IGZhbHNlXG4gIGlmIChtZS5fc3RyZWFtKSBtZS5fc3RyZWFtLnJlc3VtZSgpXG4gIG1lLl9yZWFkKClcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gRmlsZVdyaXRlclxuXG52YXIgZnMgPSByZXF1aXJlKFwiZ3JhY2VmdWwtZnNcIilcbiAgLCBta2RpciA9IHJlcXVpcmUoXCJta2RpcnBcIilcbiAgLCBXcml0ZXIgPSByZXF1aXJlKFwiLi93cml0ZXIuanNcIilcbiAgLCBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKVxuICAsIEVPRiA9IHt9XG5cbmluaGVyaXRzKEZpbGVXcml0ZXIsIFdyaXRlcilcblxuZnVuY3Rpb24gRmlsZVdyaXRlciAocHJvcHMpIHtcbiAgdmFyIG1lID0gdGhpc1xuICBpZiAoIShtZSBpbnN0YW5jZW9mIEZpbGVXcml0ZXIpKSB0aHJvdyBuZXcgRXJyb3IoXG4gICAgXCJGaWxlV3JpdGVyIG11c3QgYmUgY2FsbGVkIGFzIGNvbnN0cnVjdG9yLlwiKVxuXG4gIC8vIHNob3VsZCBhbHJlYWR5IGJlIGVzdGFibGlzaGVkIGFzIGEgRmlsZSB0eXBlXG4gIGlmIChwcm9wcy50eXBlICE9PSBcIkZpbGVcIiB8fCAhcHJvcHMuRmlsZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk5vbi1maWxlIHR5cGUgXCIrIHByb3BzLnR5cGUpXG4gIH1cblxuICBtZS5fYnVmZmVyID0gW11cbiAgbWUuX2J5dGVzV3JpdHRlbiA9IDBcblxuICBXcml0ZXIuY2FsbCh0aGlzLCBwcm9wcylcbn1cblxuRmlsZVdyaXRlci5wcm90b3R5cGUuX2NyZWF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG1lID0gdGhpc1xuICBpZiAobWUuX3N0cmVhbSkgcmV0dXJuXG5cbiAgdmFyIHNvID0ge31cbiAgaWYgKG1lLnByb3BzLmZsYWdzKSBzby5mbGFncyA9IG1lLnByb3BzLmZsYWdzXG4gIHNvLm1vZGUgPSBXcml0ZXIuZmlsZW1vZGVcbiAgaWYgKG1lLl9vbGQgJiYgbWUuX29sZC5ibGtzaXplKSBzby5idWZmZXJTaXplID0gbWUuX29sZC5ibGtzaXplXG5cbiAgbWUuX3N0cmVhbSA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG1lLl9wYXRoLCBzbylcblxuICBtZS5fc3RyZWFtLm9uKFwib3BlblwiLCBmdW5jdGlvbiAoZmQpIHtcbiAgICAvLyBjb25zb2xlLmVycm9yKFwiRlcgb3BlblwiLCBtZS5fYnVmZmVyLCBtZS5fcGF0aClcbiAgICBtZS5yZWFkeSA9IHRydWVcbiAgICBtZS5fYnVmZmVyLmZvckVhY2goZnVuY3Rpb24gKGMpIHtcbiAgICAgIGlmIChjID09PSBFT0YpIG1lLl9zdHJlYW0uZW5kKClcbiAgICAgIGVsc2UgbWUuX3N0cmVhbS53cml0ZShjKVxuICAgIH0pXG4gICAgbWUuZW1pdChcInJlYWR5XCIpXG4gICAgLy8gZ2l2ZSB0aGlzIGEga2ljayBqdXN0IGluIGNhc2UgaXQgbmVlZHMgaXQuXG4gICAgbWUuZW1pdChcImRyYWluXCIpXG4gIH0pXG5cbiAgbWUuX3N0cmVhbS5vbihcImRyYWluXCIsIGZ1bmN0aW9uICgpIHsgbWUuZW1pdChcImRyYWluXCIpIH0pXG5cbiAgbWUuX3N0cmVhbS5vbihcImNsb3NlXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAvLyBjb25zb2xlLmVycm9yKFwiXFxuXFxuRlcgU3RyZWFtIENsb3NlXCIsIG1lLl9wYXRoLCBtZS5zaXplKVxuICAgIG1lLl9maW5pc2goKVxuICB9KVxufVxuXG5GaWxlV3JpdGVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIChjKSB7XG4gIHZhciBtZSA9IHRoaXNcblxuICBtZS5fYnl0ZXNXcml0dGVuICs9IGMubGVuZ3RoXG5cbiAgaWYgKCFtZS5yZWFkeSkge1xuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKGMpICYmIHR5cGVvZiBjICE9PSAnc3RyaW5nJylcbiAgICAgIHRocm93IG5ldyBFcnJvcignaW52YWxpZCB3cml0ZSBkYXRhJylcbiAgICBtZS5fYnVmZmVyLnB1c2goYylcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIHZhciByZXQgPSBtZS5fc3RyZWFtLndyaXRlKGMpXG4gIC8vIGNvbnNvbGUuZXJyb3IoXCJcXHQtLSBmdyB3cm90ZSwgX3N0cmVhbSBzYXlzXCIsIHJldCwgbWUuX3N0cmVhbS5fcXVldWUubGVuZ3RoKVxuXG4gIC8vIGFsbG93IDIgYnVmZmVyZWQgd3JpdGVzLCBiZWNhdXNlIG90aGVyd2lzZSB0aGVyZSdzIGp1c3QgdG9vXG4gIC8vIG11Y2ggc3RvcCBhbmQgZ28gYnMuXG4gIGlmIChyZXQgPT09IGZhbHNlICYmIG1lLl9zdHJlYW0uX3F1ZXVlKSB7XG4gICAgcmV0dXJuIG1lLl9zdHJlYW0uX3F1ZXVlLmxlbmd0aCA8PSAyO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiByZXQ7XG4gIH1cbn1cblxuRmlsZVdyaXRlci5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24gKGMpIHtcbiAgdmFyIG1lID0gdGhpc1xuXG4gIGlmIChjKSBtZS53cml0ZShjKVxuXG4gIGlmICghbWUucmVhZHkpIHtcbiAgICBtZS5fYnVmZmVyLnB1c2goRU9GKVxuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgcmV0dXJuIG1lLl9zdHJlYW0uZW5kKClcbn1cblxuRmlsZVdyaXRlci5wcm90b3R5cGUuX2ZpbmlzaCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG1lID0gdGhpc1xuICBpZiAodHlwZW9mIG1lLnNpemUgPT09IFwibnVtYmVyXCIgJiYgbWUuX2J5dGVzV3JpdHRlbiAhPSBtZS5zaXplKSB7XG4gICAgbWUuZXJyb3IoXG4gICAgICBcIkRpZCBub3QgZ2V0IGV4cGVjdGVkIGJ5dGUgY291bnQuXFxuXCIgK1xuICAgICAgXCJleHBlY3Q6IFwiICsgbWUuc2l6ZSArIFwiXFxuXCIgK1xuICAgICAgXCJhY3R1YWw6IFwiICsgbWUuX2J5dGVzV3JpdHRlbilcbiAgfVxuICBXcml0ZXIucHJvdG90eXBlLl9maW5pc2guY2FsbChtZSlcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZ2V0VHlwZVxuXG5mdW5jdGlvbiBnZXRUeXBlIChzdCkge1xuICB2YXIgdHlwZXMgPVxuICAgICAgWyBcIkRpcmVjdG9yeVwiXG4gICAgICAsIFwiRmlsZVwiXG4gICAgICAsIFwiU3ltYm9saWNMaW5rXCJcbiAgICAgICwgXCJMaW5rXCIgLy8gc3BlY2lhbCBmb3IgaGFyZGxpbmtzIGZyb20gdGFyYmFsbHNcbiAgICAgICwgXCJCbG9ja0RldmljZVwiXG4gICAgICAsIFwiQ2hhcmFjdGVyRGV2aWNlXCJcbiAgICAgICwgXCJGSUZPXCJcbiAgICAgICwgXCJTb2NrZXRcIiBdXG4gICAgLCB0eXBlXG5cbiAgaWYgKHN0LnR5cGUgJiYgLTEgIT09IHR5cGVzLmluZGV4T2Yoc3QudHlwZSkpIHtcbiAgICBzdFtzdC50eXBlXSA9IHRydWVcbiAgICByZXR1cm4gc3QudHlwZVxuICB9XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB0eXBlcy5sZW5ndGg7IGkgPCBsOyBpICsrKSB7XG4gICAgdHlwZSA9IHR5cGVzW2ldXG4gICAgdmFyIGlzID0gc3RbdHlwZV0gfHwgc3RbXCJpc1wiICsgdHlwZV1cbiAgICBpZiAodHlwZW9mIGlzID09PSBcImZ1bmN0aW9uXCIpIGlzID0gaXMuY2FsbChzdClcbiAgICBpZiAoaXMpIHtcbiAgICAgIHN0W3R5cGVdID0gdHJ1ZVxuICAgICAgc3QudHlwZSA9IHR5cGVcbiAgICAgIHJldHVybiB0eXBlXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGxcbn1cbiIsIi8vIEJhc2ljYWxseSBqdXN0IGEgd3JhcHBlciBhcm91bmQgYW4gZnMucmVhZGxpbmtcbi8vXG4vLyBYWFg6IEVuaGFuY2UgdGhpcyB0byBzdXBwb3J0IHRoZSBMaW5rIHR5cGUsIGJ5IGtlZXBpbmdcbi8vIGEgbG9va3VwIHRhYmxlIG9mIHs8ZGV2K2lub2RlPjo8cGF0aD59LCBzbyB0aGF0IGhhcmRsaW5rc1xuLy8gY2FuIGJlIHByZXNlcnZlZCBpbiB0YXJiYWxscy5cblxubW9kdWxlLmV4cG9ydHMgPSBMaW5rUmVhZGVyXG5cbnZhciBmcyA9IHJlcXVpcmUoXCJncmFjZWZ1bC1mc1wiKVxuICAsIGZzdHJlYW0gPSByZXF1aXJlKFwiLi4vZnN0cmVhbS5qc1wiKVxuICAsIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpXG4gICwgbWtkaXIgPSByZXF1aXJlKFwibWtkaXJwXCIpXG4gICwgUmVhZGVyID0gcmVxdWlyZShcIi4vcmVhZGVyLmpzXCIpXG5cbmluaGVyaXRzKExpbmtSZWFkZXIsIFJlYWRlcilcblxuZnVuY3Rpb24gTGlua1JlYWRlciAocHJvcHMpIHtcbiAgdmFyIG1lID0gdGhpc1xuICBpZiAoIShtZSBpbnN0YW5jZW9mIExpbmtSZWFkZXIpKSB0aHJvdyBuZXcgRXJyb3IoXG4gICAgXCJMaW5rUmVhZGVyIG11c3QgYmUgY2FsbGVkIGFzIGNvbnN0cnVjdG9yLlwiKVxuXG4gIGlmICghKChwcm9wcy50eXBlID09PSBcIkxpbmtcIiAmJiBwcm9wcy5MaW5rKSB8fFxuICAgICAgICAocHJvcHMudHlwZSA9PT0gXCJTeW1ib2xpY0xpbmtcIiAmJiBwcm9wcy5TeW1ib2xpY0xpbmspKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk5vbi1saW5rIHR5cGUgXCIrIHByb3BzLnR5cGUpXG4gIH1cblxuICBSZWFkZXIuY2FsbChtZSwgcHJvcHMpXG59XG5cbi8vIFdoZW4gcGlwaW5nIGEgTGlua1JlYWRlciBpbnRvIGEgTGlua1dyaXRlciwgd2UgaGF2ZSB0b1xuLy8gYWxyZWFkeSBoYXZlIHRoZSBsaW5rcGF0aCBwcm9wZXJ0eSBzZXQsIHNvIHRoYXQgaGFzIHRvXG4vLyBoYXBwZW4gKmJlZm9yZSogdGhlIFwicmVhZHlcIiBldmVudCwgd2hpY2ggbWVhbnMgd2UgbmVlZCB0b1xuLy8gb3ZlcnJpZGUgdGhlIF9zdGF0IG1ldGhvZC5cbkxpbmtSZWFkZXIucHJvdG90eXBlLl9zdGF0ID0gZnVuY3Rpb24gKGN1cnJlbnRTdGF0KSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgZnMucmVhZGxpbmsobWUuX3BhdGgsIGZ1bmN0aW9uIChlciwgbGlua3BhdGgpIHtcbiAgICBpZiAoZXIpIHJldHVybiBtZS5lcnJvcihlcilcbiAgICBtZS5saW5rcGF0aCA9IG1lLnByb3BzLmxpbmtwYXRoID0gbGlua3BhdGhcbiAgICBtZS5lbWl0KFwibGlua3BhdGhcIiwgbGlua3BhdGgpXG4gICAgUmVhZGVyLnByb3RvdHlwZS5fc3RhdC5jYWxsKG1lLCBjdXJyZW50U3RhdClcbiAgfSlcbn1cblxuTGlua1JlYWRlci5wcm90b3R5cGUuX3JlYWQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgaWYgKG1lLl9wYXVzZWQpIHJldHVyblxuICAvLyBiYXNpY2FsbHkganVzdCBhIG5vLW9wLCBzaW5jZSB3ZSBnb3QgYWxsIHRoZSBpbmZvIHdlIG5lZWRcbiAgLy8gZnJvbSB0aGUgX3N0YXQgbWV0aG9kXG4gIGlmICghbWUuX2VuZGVkKSB7XG4gICAgbWUuZW1pdChcImVuZFwiKVxuICAgIG1lLmVtaXQoXCJjbG9zZVwiKVxuICAgIG1lLl9lbmRlZCA9IHRydWVcbiAgfVxufVxuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IExpbmtXcml0ZXJcblxudmFyIGZzID0gcmVxdWlyZShcImdyYWNlZnVsLWZzXCIpXG4gICwgV3JpdGVyID0gcmVxdWlyZShcIi4vd3JpdGVyLmpzXCIpXG4gICwgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIilcbiAgLCBwYXRoID0gcmVxdWlyZShcInBhdGhcIilcbiAgLCByaW1yYWYgPSByZXF1aXJlKFwicmltcmFmXCIpXG5cbmluaGVyaXRzKExpbmtXcml0ZXIsIFdyaXRlcilcblxuZnVuY3Rpb24gTGlua1dyaXRlciAocHJvcHMpIHtcbiAgdmFyIG1lID0gdGhpc1xuICBpZiAoIShtZSBpbnN0YW5jZW9mIExpbmtXcml0ZXIpKSB0aHJvdyBuZXcgRXJyb3IoXG4gICAgXCJMaW5rV3JpdGVyIG11c3QgYmUgY2FsbGVkIGFzIGNvbnN0cnVjdG9yLlwiKVxuXG4gIC8vIHNob3VsZCBhbHJlYWR5IGJlIGVzdGFibGlzaGVkIGFzIGEgTGluayB0eXBlXG4gIGlmICghKChwcm9wcy50eXBlID09PSBcIkxpbmtcIiAmJiBwcm9wcy5MaW5rKSB8fFxuICAgICAgICAocHJvcHMudHlwZSA9PT0gXCJTeW1ib2xpY0xpbmtcIiAmJiBwcm9wcy5TeW1ib2xpY0xpbmspKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk5vbi1saW5rIHR5cGUgXCIrIHByb3BzLnR5cGUpXG4gIH1cblxuICBpZiAocHJvcHMubGlua3BhdGggPT09IFwiXCIpIHByb3BzLmxpbmtwYXRoID0gXCIuXCJcbiAgaWYgKCFwcm9wcy5saW5rcGF0aCkge1xuICAgIG1lLmVycm9yKFwiTmVlZCBsaW5rcGF0aCBwcm9wZXJ0eSB0byBjcmVhdGUgXCIgKyBwcm9wcy50eXBlKVxuICB9XG5cbiAgV3JpdGVyLmNhbGwodGhpcywgcHJvcHMpXG59XG5cbkxpbmtXcml0ZXIucHJvdG90eXBlLl9jcmVhdGUgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIGNvbnNvbGUuZXJyb3IoXCIgTFcgX2NyZWF0ZVwiKVxuICB2YXIgbWUgPSB0aGlzXG4gICAgLCBoYXJkID0gbWUudHlwZSA9PT0gXCJMaW5rXCIgfHwgcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJ3aW4zMlwiXG4gICAgLCBsaW5rID0gaGFyZCA/IFwibGlua1wiIDogXCJzeW1saW5rXCJcbiAgICAsIGxwID0gaGFyZCA/IHBhdGgucmVzb2x2ZShtZS5kaXJuYW1lLCBtZS5saW5rcGF0aCkgOiBtZS5saW5rcGF0aFxuXG4gIC8vIGNhbiBvbmx5IGNoYW5nZSB0aGUgbGluayBwYXRoIGJ5IGNsb2JiZXJpbmdcbiAgLy8gRm9yIGhhcmQgbGlua3MsIGxldCdzIGp1c3QgYXNzdW1lIHRoYXQncyBhbHdheXMgdGhlIGNhc2UsIHNpbmNlXG4gIC8vIHRoZXJlJ3Mgbm8gZ29vZCB3YXkgdG8gcmVhZCB0aGVtIGlmIHdlIGRvbid0IGFscmVhZHkga25vdy5cbiAgaWYgKGhhcmQpIHJldHVybiBjbG9iYmVyKG1lLCBscCwgbGluaylcblxuICBmcy5yZWFkbGluayhtZS5fcGF0aCwgZnVuY3Rpb24gKGVyLCBwKSB7XG4gICAgLy8gb25seSBza2lwIGNyZWF0aW9uIGlmIGl0J3MgZXhhY3RseSB0aGUgc2FtZSBsaW5rXG4gICAgaWYgKHAgJiYgcCA9PT0gbHApIHJldHVybiBmaW5pc2gobWUpXG4gICAgY2xvYmJlcihtZSwgbHAsIGxpbmspXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGNsb2JiZXIgKG1lLCBscCwgbGluaykge1xuICByaW1yYWYobWUuX3BhdGgsIGZ1bmN0aW9uIChlcikge1xuICAgIGlmIChlcikgcmV0dXJuIG1lLmVycm9yKGVyKVxuICAgIGNyZWF0ZShtZSwgbHAsIGxpbmspXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZSAobWUsIGxwLCBsaW5rKSB7XG4gIGZzW2xpbmtdKGxwLCBtZS5fcGF0aCwgZnVuY3Rpb24gKGVyKSB7XG4gICAgLy8gaWYgdGhpcyBpcyBhIGhhcmQgbGluaywgYW5kIHdlJ3JlIGluIHRoZSBwcm9jZXNzIG9mIHdyaXRpbmcgb3V0IGFcbiAgICAvLyBkaXJlY3RvcnksIGl0J3MgdmVyeSBwb3NzaWJsZSB0aGF0IHRoZSB0aGluZyB3ZSdyZSBsaW5raW5nIHRvXG4gICAgLy8gZG9lc24ndCBleGlzdCB5ZXQgKGVzcGVjaWFsbHkgaWYgaXQgd2FzIGludGVuZGVkIGFzIGEgc3ltbGluayksXG4gICAgLy8gc28gc3dhbGxvdyBFTk9FTlQgZXJyb3JzIGhlcmUgYW5kIGp1c3Qgc29sZGllciBpbi5cbiAgICAvLyBBZGRpdGlvbmFsbHksIGFuIEVQRVJNIG9yIEVBQ0NFUyBjYW4gaGFwcGVuIG9uIHdpbjMyIGlmIGl0J3MgdHJ5aW5nXG4gICAgLy8gdG8gbWFrZSBhIGxpbmsgdG8gYSBkaXJlY3RvcnkuICBBZ2FpbiwganVzdCBza2lwIGl0LlxuICAgIC8vIEEgYmV0dGVyIHNvbHV0aW9uIHdvdWxkIGJlIHRvIGhhdmUgZnMuc3ltbGluayBiZSBzdXBwb3J0ZWQgb25cbiAgICAvLyB3aW5kb3dzIGluIHNvbWUgbmljZSBmYXNoaW9uLlxuICAgIGlmIChlcikge1xuICAgICAgaWYgKChlci5jb2RlID09PSBcIkVOT0VOVFwiIHx8XG4gICAgICAgICAgIGVyLmNvZGUgPT09IFwiRUFDQ0VTXCIgfHxcbiAgICAgICAgICAgZXIuY29kZSA9PT0gXCJFUEVSTVwiICkgJiYgcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJ3aW4zMlwiKSB7XG4gICAgICAgIG1lLnJlYWR5ID0gdHJ1ZVxuICAgICAgICBtZS5lbWl0KFwicmVhZHlcIilcbiAgICAgICAgbWUuZW1pdChcImVuZFwiKVxuICAgICAgICBtZS5lbWl0KFwiY2xvc2VcIilcbiAgICAgICAgbWUuZW5kID0gbWUuX2ZpbmlzaCA9IGZ1bmN0aW9uICgpIHt9XG4gICAgICB9IGVsc2UgcmV0dXJuIG1lLmVycm9yKGVyKVxuICAgIH1cbiAgICBmaW5pc2gobWUpXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGZpbmlzaCAobWUpIHtcbiAgbWUucmVhZHkgPSB0cnVlXG4gIG1lLmVtaXQoXCJyZWFkeVwiKVxuICBpZiAobWUuX2VuZGVkICYmICFtZS5fZmluaXNoZWQpIG1lLl9maW5pc2goKVxufVxuXG5MaW5rV3JpdGVyLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIGNvbnNvbGUuZXJyb3IoXCJMVyBmaW5pc2ggaW4gZW5kXCIpXG4gIHRoaXMuX2VuZGVkID0gdHJ1ZVxuICBpZiAodGhpcy5yZWFkeSkge1xuICAgIHRoaXMuX2ZpbmlzaGVkID0gdHJ1ZVxuICAgIHRoaXMuX2ZpbmlzaCgpXG4gIH1cbn1cbiIsIi8vIEEgcmVhZGVyIGZvciB3aGVuIHdlIGRvbid0IHlldCBrbm93IHdoYXQga2luZCBvZiB0aGluZ1xuLy8gdGhlIHRoaW5nIGlzLlxuXG5tb2R1bGUuZXhwb3J0cyA9IFByb3h5UmVhZGVyXG5cbnZhciBSZWFkZXIgPSByZXF1aXJlKFwiLi9yZWFkZXIuanNcIilcbiAgLCBnZXRUeXBlID0gcmVxdWlyZShcIi4vZ2V0LXR5cGUuanNcIilcbiAgLCBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKVxuICAsIGZzID0gcmVxdWlyZShcImdyYWNlZnVsLWZzXCIpXG5cbmluaGVyaXRzKFByb3h5UmVhZGVyLCBSZWFkZXIpXG5cbmZ1bmN0aW9uIFByb3h5UmVhZGVyIChwcm9wcykge1xuICB2YXIgbWUgPSB0aGlzXG4gIGlmICghKG1lIGluc3RhbmNlb2YgUHJveHlSZWFkZXIpKSB0aHJvdyBuZXcgRXJyb3IoXG4gICAgXCJQcm94eVJlYWRlciBtdXN0IGJlIGNhbGxlZCBhcyBjb25zdHJ1Y3Rvci5cIilcblxuICBtZS5wcm9wcyA9IHByb3BzXG4gIG1lLl9idWZmZXIgPSBbXVxuICBtZS5yZWFkeSA9IGZhbHNlXG5cbiAgUmVhZGVyLmNhbGwobWUsIHByb3BzKVxufVxuXG5Qcm94eVJlYWRlci5wcm90b3R5cGUuX3N0YXQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgICAsIHByb3BzID0gbWUucHJvcHNcbiAgICAvLyBzdGF0IHRoZSB0aGluZyB0byBzZWUgd2hhdCB0aGUgcHJveHkgc2hvdWxkIGJlLlxuICAgICwgc3RhdCA9IHByb3BzLmZvbGxvdyA/IFwic3RhdFwiIDogXCJsc3RhdFwiXG5cbiAgZnNbc3RhdF0ocHJvcHMucGF0aCwgZnVuY3Rpb24gKGVyLCBjdXJyZW50KSB7XG4gICAgdmFyIHR5cGVcbiAgICBpZiAoZXIgfHwgIWN1cnJlbnQpIHtcbiAgICAgIHR5cGUgPSBcIkZpbGVcIlxuICAgIH0gZWxzZSB7XG4gICAgICB0eXBlID0gZ2V0VHlwZShjdXJyZW50KVxuICAgIH1cblxuICAgIHByb3BzW3R5cGVdID0gdHJ1ZVxuICAgIHByb3BzLnR5cGUgPSBtZS50eXBlID0gdHlwZVxuXG4gICAgbWUuX29sZCA9IGN1cnJlbnRcbiAgICBtZS5fYWRkUHJveHkoUmVhZGVyKHByb3BzLCBjdXJyZW50KSlcbiAgfSlcbn1cblxuUHJveHlSZWFkZXIucHJvdG90eXBlLl9hZGRQcm94eSA9IGZ1bmN0aW9uIChwcm94eSkge1xuICB2YXIgbWUgPSB0aGlzXG4gIGlmIChtZS5fcHJveHlUYXJnZXQpIHtcbiAgICByZXR1cm4gbWUuZXJyb3IoXCJwcm94eSBhbHJlYWR5IHNldFwiKVxuICB9XG5cbiAgbWUuX3Byb3h5VGFyZ2V0ID0gcHJveHlcbiAgcHJveHkuX3Byb3h5ID0gbWVcblxuICA7IFsgXCJlcnJvclwiXG4gICAgLCBcImRhdGFcIlxuICAgICwgXCJlbmRcIlxuICAgICwgXCJjbG9zZVwiXG4gICAgLCBcImxpbmtwYXRoXCJcbiAgICAsIFwiZW50cnlcIlxuICAgICwgXCJlbnRyeUVuZFwiXG4gICAgLCBcImNoaWxkXCJcbiAgICAsIFwiY2hpbGRFbmRcIlxuICAgICwgXCJ3YXJuXCJcbiAgICAsIFwic3RhdFwiXG4gICAgXS5mb3JFYWNoKGZ1bmN0aW9uIChldikge1xuICAgICAgLy8gY29uc29sZS5lcnJvcihcIn5+IHByb3h5IGV2ZW50XCIsIGV2LCBtZS5wYXRoKVxuICAgICAgcHJveHkub24oZXYsIG1lLmVtaXQuYmluZChtZSwgZXYpKVxuICAgIH0pXG5cbiAgbWUuZW1pdChcInByb3h5XCIsIHByb3h5KVxuXG4gIHByb3h5Lm9uKFwicmVhZHlcIiwgZnVuY3Rpb24gKCkge1xuICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJ+fiBwcm94eSBpcyByZWFkeSFcIiwgbWUucGF0aClcbiAgICBtZS5yZWFkeSA9IHRydWVcbiAgICBtZS5lbWl0KFwicmVhZHlcIilcbiAgfSlcblxuICB2YXIgY2FsbHMgPSBtZS5fYnVmZmVyXG4gIG1lLl9idWZmZXIubGVuZ3RoID0gMFxuICBjYWxscy5mb3JFYWNoKGZ1bmN0aW9uIChjKSB7XG4gICAgcHJveHlbY1swXV0uYXBwbHkocHJveHksIGNbMV0pXG4gIH0pXG59XG5cblByb3h5UmVhZGVyLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuX3Byb3h5VGFyZ2V0ID8gdGhpcy5fcHJveHlUYXJnZXQucGF1c2UoKSA6IGZhbHNlXG59XG5cblByb3h5UmVhZGVyLnByb3RvdHlwZS5yZXN1bWUgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLl9wcm94eVRhcmdldCA/IHRoaXMuX3Byb3h5VGFyZ2V0LnJlc3VtZSgpIDogZmFsc2Vcbn1cbiIsIi8vIEEgd3JpdGVyIGZvciB3aGVuIHdlIGRvbid0IGtub3cgd2hhdCBraW5kIG9mIHRoaW5nXG4vLyB0aGUgdGhpbmcgaXMuICBUaGF0IGlzLCBpdCdzIG5vdCBleHBsaWNpdGx5IHNldCxcbi8vIHNvIHdlJ3JlIGdvaW5nIHRvIG1ha2UgaXQgd2hhdGV2ZXIgdGhlIHRoaW5nIGFscmVhZHlcbi8vIGlzLCBvciBcIkZpbGVcIlxuLy9cbi8vIFVudGlsIHRoZW4sIGNvbGxlY3QgYWxsIGV2ZW50cy5cblxubW9kdWxlLmV4cG9ydHMgPSBQcm94eVdyaXRlclxuXG52YXIgV3JpdGVyID0gcmVxdWlyZShcIi4vd3JpdGVyLmpzXCIpXG4gICwgZ2V0VHlwZSA9IHJlcXVpcmUoXCIuL2dldC10eXBlLmpzXCIpXG4gICwgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIilcbiAgLCBjb2xsZWN0ID0gcmVxdWlyZShcIi4vY29sbGVjdC5qc1wiKVxuICAsIGZzID0gcmVxdWlyZShcImZzXCIpXG5cbmluaGVyaXRzKFByb3h5V3JpdGVyLCBXcml0ZXIpXG5cbmZ1bmN0aW9uIFByb3h5V3JpdGVyIChwcm9wcykge1xuICB2YXIgbWUgPSB0aGlzXG4gIGlmICghKG1lIGluc3RhbmNlb2YgUHJveHlXcml0ZXIpKSB0aHJvdyBuZXcgRXJyb3IoXG4gICAgXCJQcm94eVdyaXRlciBtdXN0IGJlIGNhbGxlZCBhcyBjb25zdHJ1Y3Rvci5cIilcblxuICBtZS5wcm9wcyA9IHByb3BzXG4gIG1lLl9uZWVkRHJhaW4gPSBmYWxzZVxuXG4gIFdyaXRlci5jYWxsKG1lLCBwcm9wcylcbn1cblxuUHJveHlXcml0ZXIucHJvdG90eXBlLl9zdGF0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbWUgPSB0aGlzXG4gICAgLCBwcm9wcyA9IG1lLnByb3BzXG4gICAgLy8gc3RhdCB0aGUgdGhpbmcgdG8gc2VlIHdoYXQgdGhlIHByb3h5IHNob3VsZCBiZS5cbiAgICAsIHN0YXQgPSBwcm9wcy5mb2xsb3cgPyBcInN0YXRcIiA6IFwibHN0YXRcIlxuXG4gIGZzW3N0YXRdKHByb3BzLnBhdGgsIGZ1bmN0aW9uIChlciwgY3VycmVudCkge1xuICAgIHZhciB0eXBlXG4gICAgaWYgKGVyIHx8ICFjdXJyZW50KSB7XG4gICAgICB0eXBlID0gXCJGaWxlXCJcbiAgICB9IGVsc2Uge1xuICAgICAgdHlwZSA9IGdldFR5cGUoY3VycmVudClcbiAgICB9XG5cbiAgICBwcm9wc1t0eXBlXSA9IHRydWVcbiAgICBwcm9wcy50eXBlID0gbWUudHlwZSA9IHR5cGVcblxuICAgIG1lLl9vbGQgPSBjdXJyZW50XG4gICAgbWUuX2FkZFByb3h5KFdyaXRlcihwcm9wcywgY3VycmVudCkpXG4gIH0pXG59XG5cblByb3h5V3JpdGVyLnByb3RvdHlwZS5fYWRkUHJveHkgPSBmdW5jdGlvbiAocHJveHkpIHtcbiAgLy8gY29uc29sZS5lcnJvcihcIn5+IHNldCBwcm94eVwiLCB0aGlzLnBhdGgpXG4gIHZhciBtZSA9IHRoaXNcbiAgaWYgKG1lLl9wcm94eSkge1xuICAgIHJldHVybiBtZS5lcnJvcihcInByb3h5IGFscmVhZHkgc2V0XCIpXG4gIH1cblxuICBtZS5fcHJveHkgPSBwcm94eVxuICA7IFsgXCJyZWFkeVwiXG4gICAgLCBcImVycm9yXCJcbiAgICAsIFwiY2xvc2VcIlxuICAgICwgXCJwaXBlXCJcbiAgICAsIFwiZHJhaW5cIlxuICAgICwgXCJ3YXJuXCJcbiAgICBdLmZvckVhY2goZnVuY3Rpb24gKGV2KSB7XG4gICAgICBwcm94eS5vbihldiwgbWUuZW1pdC5iaW5kKG1lLCBldikpXG4gICAgfSlcblxuICBtZS5lbWl0KFwicHJveHlcIiwgcHJveHkpXG5cbiAgdmFyIGNhbGxzID0gbWUuX2J1ZmZlclxuICBjYWxscy5mb3JFYWNoKGZ1bmN0aW9uIChjKSB7XG4gICAgLy8gY29uc29sZS5lcnJvcihcIn5+IH5+IHByb3h5IGJ1ZmZlcmVkIGNhbGxcIiwgY1swXSwgY1sxXSlcbiAgICBwcm94eVtjWzBdXS5hcHBseShwcm94eSwgY1sxXSlcbiAgfSlcbiAgbWUuX2J1ZmZlci5sZW5ndGggPSAwXG4gIGlmIChtZS5fbmVlZHNEcmFpbikgbWUuZW1pdChcImRyYWluXCIpXG59XG5cblByb3h5V3JpdGVyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAoZW50cnkpIHtcbiAgLy8gY29uc29sZS5lcnJvcihcIn5+IHByb3h5IGFkZFwiKVxuICBjb2xsZWN0KGVudHJ5KVxuXG4gIGlmICghdGhpcy5fcHJveHkpIHtcbiAgICB0aGlzLl9idWZmZXIucHVzaChbXCJhZGRcIiwgW2VudHJ5XV0pXG4gICAgdGhpcy5fbmVlZERyYWluID0gdHJ1ZVxuICAgIHJldHVybiBmYWxzZVxuICB9XG4gIHJldHVybiB0aGlzLl9wcm94eS5hZGQoZW50cnkpXG59XG5cblByb3h5V3JpdGVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIChjKSB7XG4gIC8vIGNvbnNvbGUuZXJyb3IoXCJ+fiBwcm94eSB3cml0ZVwiKVxuICBpZiAoIXRoaXMuX3Byb3h5KSB7XG4gICAgdGhpcy5fYnVmZmVyLnB1c2goW1wid3JpdGVcIiwgW2NdXSlcbiAgICB0aGlzLl9uZWVkRHJhaW4gPSB0cnVlXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgcmV0dXJuIHRoaXMuX3Byb3h5LndyaXRlKGMpXG59XG5cblByb3h5V3JpdGVyLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbiAoYykge1xuICAvLyBjb25zb2xlLmVycm9yKFwifn4gcHJveHkgZW5kXCIpXG4gIGlmICghdGhpcy5fcHJveHkpIHtcbiAgICB0aGlzLl9idWZmZXIucHVzaChbXCJlbmRcIiwgW2NdXSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuICByZXR1cm4gdGhpcy5fcHJveHkuZW5kKGMpXG59XG4iLCJcbm1vZHVsZS5leHBvcnRzID0gUmVhZGVyXG5cbnZhciBmcyA9IHJlcXVpcmUoXCJncmFjZWZ1bC1mc1wiKVxuICAsIFN0cmVhbSA9IHJlcXVpcmUoXCJzdHJlYW1cIikuU3RyZWFtXG4gICwgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIilcbiAgLCBwYXRoID0gcmVxdWlyZShcInBhdGhcIilcbiAgLCBnZXRUeXBlID0gcmVxdWlyZShcIi4vZ2V0LXR5cGUuanNcIilcbiAgLCBoYXJkTGlua3MgPSBSZWFkZXIuaGFyZExpbmtzID0ge31cbiAgLCBBYnN0cmFjdCA9IHJlcXVpcmUoXCIuL2Fic3RyYWN0LmpzXCIpXG5cbi8vIE11c3QgZG8gdGhpcyAqYmVmb3JlKiBsb2FkaW5nIHRoZSBjaGlsZCBjbGFzc2VzXG5pbmhlcml0cyhSZWFkZXIsIEFic3RyYWN0KVxuXG52YXIgRGlyUmVhZGVyID0gcmVxdWlyZShcIi4vZGlyLXJlYWRlci5qc1wiKVxuICAsIEZpbGVSZWFkZXIgPSByZXF1aXJlKFwiLi9maWxlLXJlYWRlci5qc1wiKVxuICAsIExpbmtSZWFkZXIgPSByZXF1aXJlKFwiLi9saW5rLXJlYWRlci5qc1wiKVxuICAsIFNvY2tldFJlYWRlciA9IHJlcXVpcmUoXCIuL3NvY2tldC1yZWFkZXIuanNcIilcbiAgLCBQcm94eVJlYWRlciA9IHJlcXVpcmUoXCIuL3Byb3h5LXJlYWRlci5qc1wiKVxuXG5mdW5jdGlvbiBSZWFkZXIgKHByb3BzLCBjdXJyZW50U3RhdCkge1xuICB2YXIgbWUgPSB0aGlzXG4gIGlmICghKG1lIGluc3RhbmNlb2YgUmVhZGVyKSkgcmV0dXJuIG5ldyBSZWFkZXIocHJvcHMsIGN1cnJlbnRTdGF0KVxuXG4gIGlmICh0eXBlb2YgcHJvcHMgPT09IFwic3RyaW5nXCIpIHtcbiAgICBwcm9wcyA9IHsgcGF0aDogcHJvcHMgfVxuICB9XG5cbiAgaWYgKCFwcm9wcy5wYXRoKSB7XG4gICAgbWUuZXJyb3IoXCJNdXN0IHByb3ZpZGUgYSBwYXRoXCIsIG51bGwsIHRydWUpXG4gIH1cblxuICAvLyBwb2x5bW9ycGhpc20uXG4gIC8vIGNhbGwgZnN0cmVhbS5SZWFkZXIoZGlyKSB0byBnZXQgYSBEaXJSZWFkZXIgb2JqZWN0LCBldGMuXG4gIC8vIE5vdGUgdGhhdCwgdW5saWtlIGluIHRoZSBXcml0ZXIgY2FzZSwgUHJveHlSZWFkZXIgaXMgZ29pbmdcbiAgLy8gdG8gYmUgdGhlICpub3JtYWwqIHN0YXRlIG9mIGFmZmFpcnMsIHNpbmNlIHdlIHJhcmVseSBrbm93XG4gIC8vIHRoZSB0eXBlIG9mIGEgZmlsZSBwcmlvciB0byByZWFkaW5nIGl0LlxuXG5cbiAgdmFyIHR5cGVcbiAgICAsIENsYXNzVHlwZVxuXG4gIGlmIChwcm9wcy50eXBlICYmIHR5cGVvZiBwcm9wcy50eXBlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB0eXBlID0gcHJvcHMudHlwZVxuICAgIENsYXNzVHlwZSA9IHR5cGVcbiAgfSBlbHNlIHtcbiAgICB0eXBlID0gZ2V0VHlwZShwcm9wcylcbiAgICBDbGFzc1R5cGUgPSBSZWFkZXJcbiAgfVxuXG4gIGlmIChjdXJyZW50U3RhdCAmJiAhdHlwZSkge1xuICAgIHR5cGUgPSBnZXRUeXBlKGN1cnJlbnRTdGF0KVxuICAgIHByb3BzW3R5cGVdID0gdHJ1ZVxuICAgIHByb3BzLnR5cGUgPSB0eXBlXG4gIH1cblxuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlIFwiRGlyZWN0b3J5XCI6XG4gICAgICBDbGFzc1R5cGUgPSBEaXJSZWFkZXJcbiAgICAgIGJyZWFrXG5cbiAgICBjYXNlIFwiTGlua1wiOlxuICAgICAgLy8gWFhYIGhhcmQgbGlua3MgYXJlIGp1c3QgZmlsZXMuXG4gICAgICAvLyBIb3dldmVyLCBpdCB3b3VsZCBiZSBnb29kIHRvIGtlZXAgdHJhY2sgb2YgZmlsZXMnIGRlditpbm9kZVxuICAgICAgLy8gYW5kIG5saW5rIHZhbHVlcywgYW5kIGNyZWF0ZSBhIEhhcmRMaW5rUmVhZGVyIHRoYXQgZW1pdHNcbiAgICAgIC8vIGEgbGlua3BhdGggdmFsdWUgb2YgdGhlIG9yaWdpbmFsIGNvcHksIHNvIHRoYXQgdGhlIHRhclxuICAgICAgLy8gd3JpdGVyIGNhbiBwcmVzZXJ2ZSB0aGVtLlxuICAgICAgLy8gQ2xhc3NUeXBlID0gSGFyZExpbmtSZWFkZXJcbiAgICAgIC8vIGJyZWFrXG5cbiAgICBjYXNlIFwiRmlsZVwiOlxuICAgICAgQ2xhc3NUeXBlID0gRmlsZVJlYWRlclxuICAgICAgYnJlYWtcblxuICAgIGNhc2UgXCJTeW1ib2xpY0xpbmtcIjpcbiAgICAgIENsYXNzVHlwZSA9IExpbmtSZWFkZXJcbiAgICAgIGJyZWFrXG5cbiAgICBjYXNlIFwiU29ja2V0XCI6XG4gICAgICBDbGFzc1R5cGUgPSBTb2NrZXRSZWFkZXJcbiAgICAgIGJyZWFrXG5cbiAgICBjYXNlIG51bGw6XG4gICAgICBDbGFzc1R5cGUgPSBQcm94eVJlYWRlclxuICAgICAgYnJlYWtcbiAgfVxuXG4gIGlmICghKG1lIGluc3RhbmNlb2YgQ2xhc3NUeXBlKSkge1xuICAgIHJldHVybiBuZXcgQ2xhc3NUeXBlKHByb3BzKVxuICB9XG5cbiAgQWJzdHJhY3QuY2FsbChtZSlcblxuICBtZS5yZWFkYWJsZSA9IHRydWVcbiAgbWUud3JpdGFibGUgPSBmYWxzZVxuXG4gIG1lLnR5cGUgPSB0eXBlXG4gIG1lLnByb3BzID0gcHJvcHNcbiAgbWUuZGVwdGggPSBwcm9wcy5kZXB0aCA9IHByb3BzLmRlcHRoIHx8IDBcbiAgbWUucGFyZW50ID0gcHJvcHMucGFyZW50IHx8IG51bGxcbiAgbWUucm9vdCA9IHByb3BzLnJvb3QgfHwgKHByb3BzLnBhcmVudCAmJiBwcm9wcy5wYXJlbnQucm9vdCkgfHwgbWVcblxuICBtZS5fcGF0aCA9IG1lLnBhdGggPSBwYXRoLnJlc29sdmUocHJvcHMucGF0aClcbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09IFwid2luMzJcIikge1xuICAgIG1lLnBhdGggPSBtZS5fcGF0aCA9IG1lLnBhdGgucmVwbGFjZSgvXFw/L2csIFwiX1wiKVxuICAgIGlmIChtZS5fcGF0aC5sZW5ndGggPj0gMjYwKSB7XG4gICAgICAvLyBob3cgRE9FUyBvbmUgY3JlYXRlIGZpbGVzIG9uIHRoZSBtb29uP1xuICAgICAgLy8gaWYgdGhlIHBhdGggaGFzIHNwYWNlcyBpbiBpdCwgdGhlbiBVTkMgd2lsbCBmYWlsLlxuICAgICAgbWUuX3N3YWxsb3dFcnJvcnMgPSB0cnVlXG4gICAgICAvL2lmIChtZS5fcGF0aC5pbmRleE9mKFwiIFwiKSA9PT0gLTEpIHtcbiAgICAgICAgbWUuX3BhdGggPSBcIlxcXFxcXFxcP1xcXFxcIiArIG1lLnBhdGgucmVwbGFjZSgvXFwvL2csIFwiXFxcXFwiKVxuICAgICAgLy99XG4gICAgfVxuICB9XG4gIG1lLmJhc2VuYW1lID0gcHJvcHMuYmFzZW5hbWUgPSBwYXRoLmJhc2VuYW1lKG1lLnBhdGgpXG4gIG1lLmRpcm5hbWUgPSBwcm9wcy5kaXJuYW1lID0gcGF0aC5kaXJuYW1lKG1lLnBhdGgpXG5cbiAgLy8gdGhlc2UgaGF2ZSBzZXJ2ZWQgdGhlaXIgcHVycG9zZSwgYW5kIGFyZSBub3cganVzdCBub2lzeSBjbHV0dGVyXG4gIHByb3BzLnBhcmVudCA9IHByb3BzLnJvb3QgPSBudWxsXG5cbiAgLy8gY29uc29sZS5lcnJvcihcIlxcblxcblxcbiVzIHNldHRpbmcgc2l6ZSB0b1wiLCBwcm9wcy5wYXRoLCBwcm9wcy5zaXplKVxuICBtZS5zaXplID0gcHJvcHMuc2l6ZVxuICBtZS5maWx0ZXIgPSB0eXBlb2YgcHJvcHMuZmlsdGVyID09PSBcImZ1bmN0aW9uXCIgPyBwcm9wcy5maWx0ZXIgOiBudWxsXG4gIGlmIChwcm9wcy5zb3J0ID09PSBcImFscGhhXCIpIHByb3BzLnNvcnQgPSBhbHBoYXNvcnRcblxuICAvLyBzdGFydCB0aGUgYmFsbCByb2xsaW5nLlxuICAvLyB0aGlzIHdpbGwgc3RhdCB0aGUgdGhpbmcsIGFuZCB0aGVuIGNhbGwgbWUuX3JlYWQoKVxuICAvLyB0byBzdGFydCByZWFkaW5nIHdoYXRldmVyIGl0IGlzLlxuICAvLyBjb25zb2xlLmVycm9yKFwiY2FsbGluZyBzdGF0XCIsIHByb3BzLnBhdGgsIGN1cnJlbnRTdGF0KVxuICBtZS5fc3RhdChjdXJyZW50U3RhdClcbn1cblxuZnVuY3Rpb24gYWxwaGFzb3J0IChhLCBiKSB7XG4gIHJldHVybiBhID09PSBiID8gMFxuICAgICAgIDogYS50b0xvd2VyQ2FzZSgpID4gYi50b0xvd2VyQ2FzZSgpID8gMVxuICAgICAgIDogYS50b0xvd2VyQ2FzZSgpIDwgYi50b0xvd2VyQ2FzZSgpID8gLTFcbiAgICAgICA6IGEgPiBiID8gMVxuICAgICAgIDogLTFcbn1cblxuUmVhZGVyLnByb3RvdHlwZS5fc3RhdCA9IGZ1bmN0aW9uIChjdXJyZW50U3RhdCkge1xuICB2YXIgbWUgPSB0aGlzXG4gICAgLCBwcm9wcyA9IG1lLnByb3BzXG4gICAgLCBzdGF0ID0gcHJvcHMuZm9sbG93ID8gXCJzdGF0XCIgOiBcImxzdGF0XCJcbiAgLy8gY29uc29sZS5lcnJvcihcIlJlYWRlci5fc3RhdFwiLCBtZS5fcGF0aCwgY3VycmVudFN0YXQpXG4gIGlmIChjdXJyZW50U3RhdCkgcHJvY2Vzcy5uZXh0VGljayhzdGF0Q2IuYmluZChudWxsLCBudWxsLCBjdXJyZW50U3RhdCkpXG4gIGVsc2UgZnNbc3RhdF0obWUuX3BhdGgsIHN0YXRDYilcblxuXG4gIGZ1bmN0aW9uIHN0YXRDYiAoZXIsIHByb3BzXykge1xuICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJSZWFkZXIuX3N0YXQsIHN0YXRDYlwiLCBtZS5fcGF0aCwgcHJvcHNfLCBwcm9wc18ubmxpbmspXG4gICAgaWYgKGVyKSByZXR1cm4gbWUuZXJyb3IoZXIpXG5cbiAgICBPYmplY3Qua2V5cyhwcm9wc18pLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICAgIHByb3BzW2tdID0gcHJvcHNfW2tdXG4gICAgfSlcblxuICAgIC8vIGlmIGl0J3Mgbm90IHRoZSBleHBlY3RlZCBzaXplLCB0aGVuIGFib3J0IGhlcmUuXG4gICAgaWYgKHVuZGVmaW5lZCAhPT0gbWUuc2l6ZSAmJiBwcm9wcy5zaXplICE9PSBtZS5zaXplKSB7XG4gICAgICByZXR1cm4gbWUuZXJyb3IoXCJpbmNvcnJlY3Qgc2l6ZVwiKVxuICAgIH1cbiAgICBtZS5zaXplID0gcHJvcHMuc2l6ZVxuXG4gICAgdmFyIHR5cGUgPSBnZXRUeXBlKHByb3BzKVxuICAgIHZhciBoYW5kbGVIYXJkbGlua3MgPSBwcm9wcy5oYXJkbGlua3MgIT09IGZhbHNlXG4gICAgXG4gICAgLy8gc3BlY2lhbCBsaXR0bGUgdGhpbmcgZm9yIGhhbmRsaW5nIGhhcmRsaW5rcy5cbiAgICBpZiAoaGFuZGxlSGFyZGxpbmtzICYmIHR5cGUgIT09IFwiRGlyZWN0b3J5XCIgJiYgcHJvcHMubmxpbmsgJiYgcHJvcHMubmxpbmsgPiAxKSB7XG4gICAgICB2YXIgayA9IHByb3BzLmRldiArIFwiOlwiICsgcHJvcHMuaW5vXG4gICAgICAvLyBjb25zb2xlLmVycm9yKFwiUmVhZGVyIGhhcyBubGlua1wiLCBtZS5fcGF0aCwgaylcbiAgICAgIGlmIChoYXJkTGlua3Nba10gPT09IG1lLl9wYXRoIHx8ICFoYXJkTGlua3Nba10pIGhhcmRMaW5rc1trXSA9IG1lLl9wYXRoXG4gICAgICBlbHNlIHtcbiAgICAgICAgLy8gc3dpdGNoIGludG8gaGFyZGxpbmsgbW9kZS5cbiAgICAgICAgdHlwZSA9IG1lLnR5cGUgPSBtZS5wcm9wcy50eXBlID0gXCJMaW5rXCJcbiAgICAgICAgbWUuTGluayA9IG1lLnByb3BzLkxpbmsgPSB0cnVlXG4gICAgICAgIG1lLmxpbmtwYXRoID0gbWUucHJvcHMubGlua3BhdGggPSBoYXJkTGlua3Nba11cbiAgICAgICAgLy8gY29uc29sZS5lcnJvcihcIkhhcmRsaW5rIGRldGVjdGVkLCBzd2l0Y2hpbmcgbW9kZVwiLCBtZS5fcGF0aCwgbWUubGlua3BhdGgpXG4gICAgICAgIC8vIFNldHRpbmcgX19wcm90b19fIHdvdWxkIGFyZ3VhYmx5IGJlIHRoZSBcImNvcnJlY3RcIlxuICAgICAgICAvLyBhcHByb2FjaCBoZXJlLCBidXQgdGhhdCBqdXN0IHNlZW1zIHRvbyB3cm9uZy5cbiAgICAgICAgbWUuX3N0YXQgPSBtZS5fcmVhZCA9IExpbmtSZWFkZXIucHJvdG90eXBlLl9yZWFkXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG1lLnR5cGUgJiYgbWUudHlwZSAhPT0gdHlwZSkge1xuICAgICAgbWUuZXJyb3IoXCJVbmV4cGVjdGVkIHR5cGU6IFwiICsgdHlwZSlcbiAgICB9XG5cbiAgICAvLyBpZiB0aGUgZmlsdGVyIGRvZXNuJ3QgcGFzcywgdGhlbiBqdXN0IHNraXAgb3ZlciB0aGlzIG9uZS5cbiAgICAvLyBzdGlsbCBoYXZlIHRvIGVtaXQgZW5kIHNvIHRoYXQgZGlyLXdhbGtpbmcgY2FuIG1vdmUgb24uXG4gICAgaWYgKG1lLmZpbHRlcikge1xuICAgICAgdmFyIHdobyA9IG1lLl9wcm94eSB8fCBtZVxuICAgICAgLy8gc3BlY2lhbCBoYW5kbGluZyBmb3IgUHJveHlSZWFkZXJzXG4gICAgICBpZiAoIW1lLmZpbHRlci5jYWxsKHdobywgd2hvLCBwcm9wcykpIHtcbiAgICAgICAgaWYgKCFtZS5fZGlzb3duZWQpIHtcbiAgICAgICAgICBtZS5hYm9ydCgpXG4gICAgICAgICAgbWUuZW1pdChcImVuZFwiKVxuICAgICAgICAgIG1lLmVtaXQoXCJjbG9zZVwiKVxuICAgICAgICB9XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGxhc3QgY2hhbmNlIHRvIGFib3J0IG9yIGRpc293biBiZWZvcmUgdGhlIGZsb3cgc3RhcnRzIVxuICAgIHZhciBldmVudHMgPSBbXCJfc3RhdFwiLCBcInN0YXRcIiwgXCJyZWFkeVwiXVxuICAgIHZhciBlID0gMFxuICAgIDsoZnVuY3Rpb24gZ28gKCkge1xuICAgICAgaWYgKG1lLl9hYm9ydGVkKSB7XG4gICAgICAgIG1lLmVtaXQoXCJlbmRcIilcbiAgICAgICAgbWUuZW1pdChcImNsb3NlXCIpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBpZiAobWUuX3BhdXNlZCAmJiBtZS50eXBlICE9PSBcIkRpcmVjdG9yeVwiKSB7XG4gICAgICAgIG1lLm9uY2UoXCJyZXN1bWVcIiwgZ28pXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICB2YXIgZXYgPSBldmVudHNbZSArK11cbiAgICAgIGlmICghZXYpIHtcbiAgICAgICAgcmV0dXJuIG1lLl9yZWFkKClcbiAgICAgIH1cbiAgICAgIG1lLmVtaXQoZXYsIHByb3BzKVxuICAgICAgZ28oKVxuICAgIH0pKClcbiAgfVxufVxuXG5SZWFkZXIucHJvdG90eXBlLnBpcGUgPSBmdW5jdGlvbiAoZGVzdCwgb3B0cykge1xuICB2YXIgbWUgPSB0aGlzXG4gIGlmICh0eXBlb2YgZGVzdC5hZGQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIC8vIHBpcGluZyB0byBhIG11bHRpLWNvbXBhdGlibGUsIGFuZCB3ZSd2ZSBnb3QgZGlyZWN0b3J5IGVudHJpZXMuXG4gICAgbWUub24oXCJlbnRyeVwiLCBmdW5jdGlvbiAoZW50cnkpIHtcbiAgICAgIHZhciByZXQgPSBkZXN0LmFkZChlbnRyeSlcbiAgICAgIGlmIChmYWxzZSA9PT0gcmV0KSB7XG4gICAgICAgIG1lLnBhdXNlKClcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgLy8gY29uc29sZS5lcnJvcihcIlIgUGlwZSBhcHBseSBTdHJlYW0gUGlwZVwiKVxuICByZXR1cm4gU3RyZWFtLnByb3RvdHlwZS5waXBlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbn1cblxuUmVhZGVyLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uICh3aG8pIHtcbiAgdGhpcy5fcGF1c2VkID0gdHJ1ZVxuICB3aG8gPSB3aG8gfHwgdGhpc1xuICB0aGlzLmVtaXQoXCJwYXVzZVwiLCB3aG8pXG4gIGlmICh0aGlzLl9zdHJlYW0pIHRoaXMuX3N0cmVhbS5wYXVzZSh3aG8pXG59XG5cblJlYWRlci5wcm90b3R5cGUucmVzdW1lID0gZnVuY3Rpb24gKHdobykge1xuICB0aGlzLl9wYXVzZWQgPSBmYWxzZVxuICB3aG8gPSB3aG8gfHwgdGhpc1xuICB0aGlzLmVtaXQoXCJyZXN1bWVcIiwgd2hvKVxuICBpZiAodGhpcy5fc3RyZWFtKSB0aGlzLl9zdHJlYW0ucmVzdW1lKHdobylcbiAgdGhpcy5fcmVhZCgpXG59XG5cblJlYWRlci5wcm90b3R5cGUuX3JlYWQgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZXJyb3IoXCJDYW5ub3QgcmVhZCB1bmtub3duIHR5cGU6IFwiK3RoaXMudHlwZSlcbn1cblxuIiwiLy8gSnVzdCBnZXQgdGhlIHN0YXRzLCBhbmQgdGhlbiBkb24ndCBkbyBhbnl0aGluZy5cbi8vIFlvdSBjYW4ndCByZWFsbHkgXCJyZWFkXCIgZnJvbSBhIHNvY2tldC4gIFlvdSBcImNvbm5lY3RcIiB0byBpdC5cbi8vIE1vc3RseSwgdGhpcyBpcyBoZXJlIHNvIHRoYXQgcmVhZGluZyBhIGRpciB3aXRoIGEgc29ja2V0IGluIGl0XG4vLyBkb2Vzbid0IGJsb3cgdXAuXG5cbm1vZHVsZS5leHBvcnRzID0gU29ja2V0UmVhZGVyXG5cbnZhciBmcyA9IHJlcXVpcmUoXCJncmFjZWZ1bC1mc1wiKVxuICAsIGZzdHJlYW0gPSByZXF1aXJlKFwiLi4vZnN0cmVhbS5qc1wiKVxuICAsIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpXG4gICwgbWtkaXIgPSByZXF1aXJlKFwibWtkaXJwXCIpXG4gICwgUmVhZGVyID0gcmVxdWlyZShcIi4vcmVhZGVyLmpzXCIpXG5cbmluaGVyaXRzKFNvY2tldFJlYWRlciwgUmVhZGVyKVxuXG5mdW5jdGlvbiBTb2NrZXRSZWFkZXIgKHByb3BzKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgaWYgKCEobWUgaW5zdGFuY2VvZiBTb2NrZXRSZWFkZXIpKSB0aHJvdyBuZXcgRXJyb3IoXG4gICAgXCJTb2NrZXRSZWFkZXIgbXVzdCBiZSBjYWxsZWQgYXMgY29uc3RydWN0b3IuXCIpXG5cbiAgaWYgKCEocHJvcHMudHlwZSA9PT0gXCJTb2NrZXRcIiAmJiBwcm9wcy5Tb2NrZXQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm9uLXNvY2tldCB0eXBlIFwiKyBwcm9wcy50eXBlKVxuICB9XG5cbiAgUmVhZGVyLmNhbGwobWUsIHByb3BzKVxufVxuXG5Tb2NrZXRSZWFkZXIucHJvdG90eXBlLl9yZWFkID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbWUgPSB0aGlzXG4gIGlmIChtZS5fcGF1c2VkKSByZXR1cm5cbiAgLy8gYmFzaWNhbGx5IGp1c3QgYSBuby1vcCwgc2luY2Ugd2UgZ290IGFsbCB0aGUgaW5mbyB3ZSBoYXZlXG4gIC8vIGZyb20gdGhlIF9zdGF0IG1ldGhvZFxuICBpZiAoIW1lLl9lbmRlZCkge1xuICAgIG1lLmVtaXQoXCJlbmRcIilcbiAgICBtZS5lbWl0KFwiY2xvc2VcIilcbiAgICBtZS5fZW5kZWQgPSB0cnVlXG4gIH1cbn1cbiIsIlxubW9kdWxlLmV4cG9ydHMgPSBXcml0ZXJcblxudmFyIGZzID0gcmVxdWlyZShcImdyYWNlZnVsLWZzXCIpXG4gICwgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIilcbiAgLCByaW1yYWYgPSByZXF1aXJlKFwicmltcmFmXCIpXG4gICwgbWtkaXIgPSByZXF1aXJlKFwibWtkaXJwXCIpXG4gICwgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpXG4gICwgdW1hc2sgPSBwcm9jZXNzLnBsYXRmb3JtID09PSBcIndpbjMyXCIgPyAwIDogcHJvY2Vzcy51bWFzaygpXG4gICwgZ2V0VHlwZSA9IHJlcXVpcmUoXCIuL2dldC10eXBlLmpzXCIpXG4gICwgQWJzdHJhY3QgPSByZXF1aXJlKFwiLi9hYnN0cmFjdC5qc1wiKVxuXG4vLyBNdXN0IGRvIHRoaXMgKmJlZm9yZSogbG9hZGluZyB0aGUgY2hpbGQgY2xhc3Nlc1xuaW5oZXJpdHMoV3JpdGVyLCBBYnN0cmFjdClcblxuV3JpdGVyLmRpcm1vZGUgPSAwNzc3ICYgKH51bWFzaylcbldyaXRlci5maWxlbW9kZSA9IDA2NjYgJiAofnVtYXNrKVxuXG52YXIgRGlyV3JpdGVyID0gcmVxdWlyZShcIi4vZGlyLXdyaXRlci5qc1wiKVxuICAsIExpbmtXcml0ZXIgPSByZXF1aXJlKFwiLi9saW5rLXdyaXRlci5qc1wiKVxuICAsIEZpbGVXcml0ZXIgPSByZXF1aXJlKFwiLi9maWxlLXdyaXRlci5qc1wiKVxuICAsIFByb3h5V3JpdGVyID0gcmVxdWlyZShcIi4vcHJveHktd3JpdGVyLmpzXCIpXG5cbi8vIHByb3BzIGlzIHRoZSBkZXNpcmVkIHN0YXRlLiAgY3VycmVudCBpcyBvcHRpb25hbGx5IHRoZSBjdXJyZW50IHN0YXQsXG4vLyBwcm92aWRlZCBoZXJlIHNvIHRoYXQgc3ViY2xhc3NlcyBjYW4gYXZvaWQgc3RhdHRpbmcgdGhlIHRhcmdldFxuLy8gbW9yZSB0aGFuIG5lY2Vzc2FyeS5cbmZ1bmN0aW9uIFdyaXRlciAocHJvcHMsIGN1cnJlbnQpIHtcbiAgdmFyIG1lID0gdGhpc1xuXG4gIGlmICh0eXBlb2YgcHJvcHMgPT09IFwic3RyaW5nXCIpIHtcbiAgICBwcm9wcyA9IHsgcGF0aDogcHJvcHMgfVxuICB9XG5cbiAgaWYgKCFwcm9wcy5wYXRoKSBtZS5lcnJvcihcIk11c3QgcHJvdmlkZSBhIHBhdGhcIiwgbnVsbCwgdHJ1ZSlcblxuICAvLyBwb2x5bW9ycGhpc20uXG4gIC8vIGNhbGwgZnN0cmVhbS5Xcml0ZXIoZGlyKSB0byBnZXQgYSBEaXJXcml0ZXIgb2JqZWN0LCBldGMuXG4gIHZhciB0eXBlID0gZ2V0VHlwZShwcm9wcylcbiAgICAsIENsYXNzVHlwZSA9IFdyaXRlclxuXG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgXCJEaXJlY3RvcnlcIjpcbiAgICAgIENsYXNzVHlwZSA9IERpcldyaXRlclxuICAgICAgYnJlYWtcbiAgICBjYXNlIFwiRmlsZVwiOlxuICAgICAgQ2xhc3NUeXBlID0gRmlsZVdyaXRlclxuICAgICAgYnJlYWtcbiAgICBjYXNlIFwiTGlua1wiOlxuICAgIGNhc2UgXCJTeW1ib2xpY0xpbmtcIjpcbiAgICAgIENsYXNzVHlwZSA9IExpbmtXcml0ZXJcbiAgICAgIGJyZWFrXG4gICAgY2FzZSBudWxsOlxuICAgICAgLy8gRG9uJ3Qga25vdyB5ZXQgd2hhdCB0eXBlIHRvIGNyZWF0ZSwgc28gd2Ugd3JhcCBpbiBhIHByb3h5LlxuICAgICAgQ2xhc3NUeXBlID0gUHJveHlXcml0ZXJcbiAgICAgIGJyZWFrXG4gIH1cblxuICBpZiAoIShtZSBpbnN0YW5jZW9mIENsYXNzVHlwZSkpIHJldHVybiBuZXcgQ2xhc3NUeXBlKHByb3BzKVxuXG4gIC8vIG5vdyBnZXQgZG93biB0byBidXNpbmVzcy5cblxuICBBYnN0cmFjdC5jYWxsKG1lKVxuXG4gIC8vIHByb3BzIGlzIHdoYXQgd2Ugd2FudCB0byBzZXQuXG4gIC8vIHNldCBzb21lIGNvbnZlbmllbmNlIHByb3BlcnRpZXMgYXMgd2VsbC5cbiAgbWUudHlwZSA9IHByb3BzLnR5cGVcbiAgbWUucHJvcHMgPSBwcm9wc1xuICBtZS5kZXB0aCA9IHByb3BzLmRlcHRoIHx8IDBcbiAgbWUuY2xvYmJlciA9IGZhbHNlID09PSBwcm9wcy5jbG9iYmVyID8gcHJvcHMuY2xvYmJlciA6IHRydWVcbiAgbWUucGFyZW50ID0gcHJvcHMucGFyZW50IHx8IG51bGxcbiAgbWUucm9vdCA9IHByb3BzLnJvb3QgfHwgKHByb3BzLnBhcmVudCAmJiBwcm9wcy5wYXJlbnQucm9vdCkgfHwgbWVcblxuICBtZS5fcGF0aCA9IG1lLnBhdGggPSBwYXRoLnJlc29sdmUocHJvcHMucGF0aClcbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09IFwid2luMzJcIikge1xuICAgIG1lLnBhdGggPSBtZS5fcGF0aCA9IG1lLnBhdGgucmVwbGFjZSgvXFw/L2csIFwiX1wiKVxuICAgIGlmIChtZS5fcGF0aC5sZW5ndGggPj0gMjYwKSB7XG4gICAgICBtZS5fc3dhbGxvd0Vycm9ycyA9IHRydWVcbiAgICAgIG1lLl9wYXRoID0gXCJcXFxcXFxcXD9cXFxcXCIgKyBtZS5wYXRoLnJlcGxhY2UoL1xcLy9nLCBcIlxcXFxcIilcbiAgICB9XG4gIH1cbiAgbWUuYmFzZW5hbWUgPSBwYXRoLmJhc2VuYW1lKHByb3BzLnBhdGgpXG4gIG1lLmRpcm5hbWUgPSBwYXRoLmRpcm5hbWUocHJvcHMucGF0aClcbiAgbWUubGlua3BhdGggPSBwcm9wcy5saW5rcGF0aCB8fCBudWxsXG5cbiAgcHJvcHMucGFyZW50ID0gcHJvcHMucm9vdCA9IG51bGxcblxuICAvLyBjb25zb2xlLmVycm9yKFwiXFxuXFxuXFxuJXMgc2V0dGluZyBzaXplIHRvXCIsIHByb3BzLnBhdGgsIHByb3BzLnNpemUpXG4gIG1lLnNpemUgPSBwcm9wcy5zaXplXG5cbiAgaWYgKHR5cGVvZiBwcm9wcy5tb2RlID09PSBcInN0cmluZ1wiKSB7XG4gICAgcHJvcHMubW9kZSA9IHBhcnNlSW50KHByb3BzLm1vZGUsIDgpXG4gIH1cblxuICBtZS5yZWFkYWJsZSA9IGZhbHNlXG4gIG1lLndyaXRhYmxlID0gdHJ1ZVxuXG4gIC8vIGJ1ZmZlciB1bnRpbCByZWFkeSwgb3Igd2hpbGUgaGFuZGxpbmcgYW5vdGhlciBlbnRyeVxuICBtZS5fYnVmZmVyID0gW11cbiAgbWUucmVhZHkgPSBmYWxzZVxuXG4gIG1lLmZpbHRlciA9IHR5cGVvZiBwcm9wcy5maWx0ZXIgPT09IFwiZnVuY3Rpb25cIiA/IHByb3BzLmZpbHRlcjogbnVsbFxuXG4gIC8vIHN0YXJ0IHRoZSBiYWxsIHJvbGxpbmcuXG4gIC8vIHRoaXMgY2hlY2tzIHdoYXQncyB0aGVyZSBhbHJlYWR5LCBhbmQgdGhlbiBjYWxsc1xuICAvLyBtZS5fY3JlYXRlKCkgdG8gY2FsbCB0aGUgaW1wbC1zcGVjaWZpYyBjcmVhdGlvbiBzdHVmZi5cbiAgbWUuX3N0YXQoY3VycmVudClcbn1cblxuLy8gQ2FsbGluZyB0aGlzIG1lYW5zIHRoYXQgaXQncyBzb21ldGhpbmcgd2UgY2FuJ3QgY3JlYXRlLlxuLy8gSnVzdCBhc3NlcnQgdGhhdCBpdCdzIGFscmVhZHkgdGhlcmUsIG90aGVyd2lzZSByYWlzZSBhIHdhcm5pbmcuXG5Xcml0ZXIucHJvdG90eXBlLl9jcmVhdGUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgZnNbbWUucHJvcHMuZm9sbG93ID8gXCJzdGF0XCIgOiBcImxzdGF0XCJdKG1lLl9wYXRoLCBmdW5jdGlvbiAoZXIsIGN1cnJlbnQpIHtcbiAgICBpZiAoZXIpIHtcbiAgICAgIHJldHVybiBtZS53YXJuKFwiQ2Fubm90IGNyZWF0ZSBcIiArIG1lLl9wYXRoICsgXCJcXG5cIiArXG4gICAgICAgICAgICAgICAgICAgICBcIlVuc3VwcG9ydGVkIHR5cGU6IFwiK21lLnR5cGUsIFwiRU5PVFNVUFwiKVxuICAgIH1cbiAgICBtZS5fZmluaXNoKClcbiAgfSlcbn1cblxuV3JpdGVyLnByb3RvdHlwZS5fc3RhdCA9IGZ1bmN0aW9uIChjdXJyZW50KSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgICAsIHByb3BzID0gbWUucHJvcHNcbiAgICAsIHN0YXQgPSBwcm9wcy5mb2xsb3cgPyBcInN0YXRcIiA6IFwibHN0YXRcIlxuICAgICwgd2hvID0gbWUuX3Byb3h5IHx8IG1lXG5cbiAgaWYgKGN1cnJlbnQpIHN0YXRDYihudWxsLCBjdXJyZW50KVxuICBlbHNlIGZzW3N0YXRdKG1lLl9wYXRoLCBzdGF0Q2IpXG5cbiAgZnVuY3Rpb24gc3RhdENiIChlciwgY3VycmVudCkge1xuICAgIGlmIChtZS5maWx0ZXIgJiYgIW1lLmZpbHRlci5jYWxsKHdobywgd2hvLCBjdXJyZW50KSkge1xuICAgICAgbWUuX2Fib3J0ZWQgPSB0cnVlXG4gICAgICBtZS5lbWl0KFwiZW5kXCIpXG4gICAgICBtZS5lbWl0KFwiY2xvc2VcIilcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIGlmIGl0J3Mgbm90IHRoZXJlLCBncmVhdC4gIFdlJ2xsIGp1c3QgY3JlYXRlIGl0LlxuICAgIC8vIGlmIGl0IGlzIHRoZXJlLCB0aGVuIHdlJ2xsIG5lZWQgdG8gY2hhbmdlIHdoYXRldmVyIGRpZmZlcnNcbiAgICBpZiAoZXIgfHwgIWN1cnJlbnQpIHtcbiAgICAgIHJldHVybiBjcmVhdGUobWUpXG4gICAgfVxuXG4gICAgbWUuX29sZCA9IGN1cnJlbnRcbiAgICB2YXIgY3VycmVudFR5cGUgPSBnZXRUeXBlKGN1cnJlbnQpXG5cbiAgICAvLyBpZiBpdCdzIGEgdHlwZSBjaGFuZ2UsIHRoZW4gd2UgbmVlZCB0byBjbG9iYmVyIG9yIGVycm9yLlxuICAgIC8vIGlmIGl0J3Mgbm90IGEgdHlwZSBjaGFuZ2UsIHRoZW4gbGV0IHRoZSBpbXBsIHRha2UgY2FyZSBvZiBpdC5cbiAgICBpZiAoY3VycmVudFR5cGUgIT09IG1lLnR5cGUpIHtcbiAgICAgIHJldHVybiByaW1yYWYobWUuX3BhdGgsIGZ1bmN0aW9uIChlcikge1xuICAgICAgICBpZiAoZXIpIHJldHVybiBtZS5lcnJvcihlcilcbiAgICAgICAgbWUuX29sZCA9IG51bGxcbiAgICAgICAgY3JlYXRlKG1lKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICAvLyBvdGhlcndpc2UsIGp1c3QgaGFuZGxlIGluIHRoZSBhcHAtc3BlY2lmaWMgd2F5XG4gICAgLy8gdGhpcyBjcmVhdGVzIGEgZnMuV3JpdGVTdHJlYW0sIG9yIG1rZGlyJ3MsIG9yIHdoYXRldmVyXG4gICAgY3JlYXRlKG1lKVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZSAobWUpIHtcbiAgLy8gY29uc29sZS5lcnJvcihcIlcgY3JlYXRlXCIsIG1lLl9wYXRoLCBXcml0ZXIuZGlybW9kZSlcblxuICAvLyBYWFggTmVlZCB0byBjbG9iYmVyIG5vbi1kaXJzIHRoYXQgYXJlIGluIHRoZSB3YXksXG4gIC8vIHVubGVzcyB7IGNsb2JiZXI6IGZhbHNlIH0gaW4gdGhlIHByb3BzLlxuICBta2RpcihwYXRoLmRpcm5hbWUobWUuX3BhdGgpLCBXcml0ZXIuZGlybW9kZSwgZnVuY3Rpb24gKGVyLCBtYWRlKSB7XG4gICAgLy8gY29uc29sZS5lcnJvcihcIlcgY3JlYXRlZFwiLCBwYXRoLmRpcm5hbWUobWUuX3BhdGgpLCBlcilcbiAgICBpZiAoZXIpIHJldHVybiBtZS5lcnJvcihlcilcblxuICAgIC8vIGxhdGVyIG9uLCB3ZSBoYXZlIHRvIHNldCB0aGUgbW9kZSBhbmQgb3duZXIgZm9yIHRoZXNlXG4gICAgbWUuX21hZGVEaXIgPSBtYWRlXG4gICAgcmV0dXJuIG1lLl9jcmVhdGUoKVxuICB9KVxufVxuXG5mdW5jdGlvbiBlbmRDaG1vZCAobWUsIHdhbnQsIGN1cnJlbnQsIHBhdGgsIGNiKSB7XG4gICAgdmFyIHdhbnRNb2RlID0gd2FudC5tb2RlXG4gICAgICAsIGNobW9kID0gd2FudC5mb2xsb3cgfHwgbWUudHlwZSAhPT0gXCJTeW1ib2xpY0xpbmtcIlxuICAgICAgICAgICAgICA/IFwiY2htb2RcIiA6IFwibGNobW9kXCJcblxuICBpZiAoIWZzW2NobW9kXSkgcmV0dXJuIGNiKClcbiAgaWYgKHR5cGVvZiB3YW50TW9kZSAhPT0gXCJudW1iZXJcIikgcmV0dXJuIGNiKClcblxuICB2YXIgY3VyTW9kZSA9IGN1cnJlbnQubW9kZSAmIDA3NzdcbiAgd2FudE1vZGUgPSB3YW50TW9kZSAmIDA3NzdcbiAgaWYgKHdhbnRNb2RlID09PSBjdXJNb2RlKSByZXR1cm4gY2IoKVxuXG4gIGZzW2NobW9kXShwYXRoLCB3YW50TW9kZSwgY2IpXG59XG5cblxuZnVuY3Rpb24gZW5kQ2hvd24gKG1lLCB3YW50LCBjdXJyZW50LCBwYXRoLCBjYikge1xuICAvLyBEb24ndCBldmVuIHRyeSBpdCB1bmxlc3Mgcm9vdC4gIFRvbyBlYXN5IHRvIEVQRVJNLlxuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJ3aW4zMlwiKSByZXR1cm4gY2IoKVxuICBpZiAoIXByb2Nlc3MuZ2V0dWlkIHx8ICFwcm9jZXNzLmdldHVpZCgpID09PSAwKSByZXR1cm4gY2IoKVxuICBpZiAodHlwZW9mIHdhbnQudWlkICE9PSBcIm51bWJlclwiICYmXG4gICAgICB0eXBlb2Ygd2FudC5naWQgIT09IFwibnVtYmVyXCIgKSByZXR1cm4gY2IoKVxuXG4gIGlmIChjdXJyZW50LnVpZCA9PT0gd2FudC51aWQgJiZcbiAgICAgIGN1cnJlbnQuZ2lkID09PSB3YW50LmdpZCkgcmV0dXJuIGNiKClcblxuICB2YXIgY2hvd24gPSAobWUucHJvcHMuZm9sbG93IHx8IG1lLnR5cGUgIT09IFwiU3ltYm9saWNMaW5rXCIpXG4gICAgICAgICAgICA/IFwiY2hvd25cIiA6IFwibGNob3duXCJcbiAgaWYgKCFmc1tjaG93bl0pIHJldHVybiBjYigpXG5cbiAgaWYgKHR5cGVvZiB3YW50LnVpZCAhPT0gXCJudW1iZXJcIikgd2FudC51aWQgPSBjdXJyZW50LnVpZFxuICBpZiAodHlwZW9mIHdhbnQuZ2lkICE9PSBcIm51bWJlclwiKSB3YW50LmdpZCA9IGN1cnJlbnQuZ2lkXG5cbiAgZnNbY2hvd25dKHBhdGgsIHdhbnQudWlkLCB3YW50LmdpZCwgY2IpXG59XG5cbmZ1bmN0aW9uIGVuZFV0aW1lcyAobWUsIHdhbnQsIGN1cnJlbnQsIHBhdGgsIGNiKSB7XG4gIGlmICghZnMudXRpbWVzIHx8IHByb2Nlc3MucGxhdGZvcm0gPT09IFwid2luMzJcIikgcmV0dXJuIGNiKClcblxuICB2YXIgdXRpbWVzID0gKHdhbnQuZm9sbG93IHx8IG1lLnR5cGUgIT09IFwiU3ltYm9saWNMaW5rXCIpXG4gICAgICAgICAgICAgPyBcInV0aW1lc1wiIDogXCJsdXRpbWVzXCJcblxuICBpZiAodXRpbWVzID09PSBcImx1dGltZXNcIiAmJiAhZnNbdXRpbWVzXSkge1xuICAgIHV0aW1lcyA9IFwidXRpbWVzXCJcbiAgfVxuXG4gIGlmICghZnNbdXRpbWVzXSkgcmV0dXJuIGNiKClcblxuICB2YXIgY3VyQSA9IGN1cnJlbnQuYXRpbWVcbiAgICAsIGN1ck0gPSBjdXJyZW50Lm10aW1lXG4gICAgLCBtZUEgPSB3YW50LmF0aW1lXG4gICAgLCBtZU0gPSB3YW50Lm10aW1lXG5cbiAgaWYgKG1lQSA9PT0gdW5kZWZpbmVkKSBtZUEgPSBjdXJBXG4gIGlmIChtZU0gPT09IHVuZGVmaW5lZCkgbWVNID0gY3VyTVxuXG4gIGlmICghaXNEYXRlKG1lQSkpIG1lQSA9IG5ldyBEYXRlKG1lQSlcbiAgaWYgKCFpc0RhdGUobWVNKSkgbWVBID0gbmV3IERhdGUobWVNKVxuXG4gIGlmIChtZUEuZ2V0VGltZSgpID09PSBjdXJBLmdldFRpbWUoKSAmJlxuICAgICAgbWVNLmdldFRpbWUoKSA9PT0gY3VyTS5nZXRUaW1lKCkpIHJldHVybiBjYigpXG5cbiAgZnNbdXRpbWVzXShwYXRoLCBtZUEsIG1lTSwgY2IpXG59XG5cblxuLy8gWFhYIFRoaXMgZnVuY3Rpb24gaXMgYmVhc3RseS4gIEJyZWFrIGl0IHVwIVxuV3JpdGVyLnByb3RvdHlwZS5fZmluaXNoID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbWUgPSB0aGlzXG5cbiAgLy8gY29uc29sZS5lcnJvcihcIiBXIEZpbmlzaFwiLCBtZS5fcGF0aCwgbWUuc2l6ZSlcblxuICAvLyBzZXQgdXAgYWxsIHRoZSB0aGluZ3MuXG4gIC8vIEF0IHRoaXMgcG9pbnQsIHdlJ3JlIGFscmVhZHkgZG9uZSB3cml0aW5nIHdoYXRldmVyIHdlJ3ZlIGdvdHRhIHdyaXRlLFxuICAvLyBhZGRpbmcgZmlsZXMgdG8gdGhlIGRpciwgZXRjLlxuICB2YXIgdG9kbyA9IDBcbiAgdmFyIGVyclN0YXRlID0gbnVsbFxuICB2YXIgZG9uZSA9IGZhbHNlXG5cbiAgaWYgKG1lLl9vbGQpIHtcbiAgICAvLyB0aGUgdGltZXMgd2lsbCBhbG1vc3QgKmNlcnRhaW5seSogaGF2ZSBjaGFuZ2VkLlxuICAgIC8vIGFkZHMgdGhlIHV0aW1lcyBzeXNjYWxsLCBidXQgcmVtb3ZlIGFub3RoZXIgc3RhdC5cbiAgICBtZS5fb2xkLmF0aW1lID0gbmV3IERhdGUoMClcbiAgICBtZS5fb2xkLm10aW1lID0gbmV3IERhdGUoMClcbiAgICAvLyBjb25zb2xlLmVycm9yKFwiIFcgRmluaXNoIFN0YWxlIFN0YXRcIiwgbWUuX3BhdGgsIG1lLnNpemUpXG4gICAgc2V0UHJvcHMobWUuX29sZClcbiAgfSBlbHNlIHtcbiAgICB2YXIgc3RhdCA9IG1lLnByb3BzLmZvbGxvdyA/IFwic3RhdFwiIDogXCJsc3RhdFwiXG4gICAgLy8gY29uc29sZS5lcnJvcihcIiBXIEZpbmlzaCBTdGF0aW5nXCIsIG1lLl9wYXRoLCBtZS5zaXplKVxuICAgIGZzW3N0YXRdKG1lLl9wYXRoLCBmdW5jdGlvbiAoZXIsIGN1cnJlbnQpIHtcbiAgICAgIC8vIGNvbnNvbGUuZXJyb3IoXCIgVyBGaW5pc2ggU3RhdGVkXCIsIG1lLl9wYXRoLCBtZS5zaXplLCBjdXJyZW50KVxuICAgICAgaWYgKGVyKSB7XG4gICAgICAgIC8vIGlmIHdlJ3JlIGluIHRoZSBwcm9jZXNzIG9mIHdyaXRpbmcgb3V0IGFcbiAgICAgICAgLy8gZGlyZWN0b3J5LCBpdCdzIHZlcnkgcG9zc2libGUgdGhhdCB0aGUgdGhpbmcgd2UncmUgbGlua2luZyB0b1xuICAgICAgICAvLyBkb2Vzbid0IGV4aXN0IHlldCAoZXNwZWNpYWxseSBpZiBpdCB3YXMgaW50ZW5kZWQgYXMgYSBzeW1saW5rKSxcbiAgICAgICAgLy8gc28gc3dhbGxvdyBFTk9FTlQgZXJyb3JzIGhlcmUgYW5kIGp1c3Qgc29sZGllciBvbi5cbiAgICAgICAgaWYgKGVyLmNvZGUgPT09IFwiRU5PRU5UXCIgJiZcbiAgICAgICAgICAgIChtZS50eXBlID09PSBcIkxpbmtcIiB8fCBtZS50eXBlID09PSBcIlN5bWJvbGljTGlua1wiKSAmJlxuICAgICAgICAgICAgcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJ3aW4zMlwiKSB7XG4gICAgICAgICAgbWUucmVhZHkgPSB0cnVlXG4gICAgICAgICAgbWUuZW1pdChcInJlYWR5XCIpXG4gICAgICAgICAgbWUuZW1pdChcImVuZFwiKVxuICAgICAgICAgIG1lLmVtaXQoXCJjbG9zZVwiKVxuICAgICAgICAgIG1lLmVuZCA9IG1lLl9maW5pc2ggPSBmdW5jdGlvbiAoKSB7fVxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9IGVsc2UgcmV0dXJuIG1lLmVycm9yKGVyKVxuICAgICAgfVxuICAgICAgc2V0UHJvcHMobWUuX29sZCA9IGN1cnJlbnQpXG4gICAgfSlcbiAgfVxuXG4gIHJldHVyblxuXG4gIGZ1bmN0aW9uIHNldFByb3BzIChjdXJyZW50KSB7XG4gICAgdG9kbyArPSAzXG4gICAgZW5kQ2htb2QobWUsIG1lLnByb3BzLCBjdXJyZW50LCBtZS5fcGF0aCwgbmV4dChcImNobW9kXCIpKVxuICAgIGVuZENob3duKG1lLCBtZS5wcm9wcywgY3VycmVudCwgbWUuX3BhdGgsIG5leHQoXCJjaG93blwiKSlcbiAgICBlbmRVdGltZXMobWUsIG1lLnByb3BzLCBjdXJyZW50LCBtZS5fcGF0aCwgbmV4dChcInV0aW1lc1wiKSlcbiAgfVxuXG4gIGZ1bmN0aW9uIG5leHQgKHdoYXQpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGVyKSB7XG4gICAgICAvLyBjb25zb2xlLmVycm9yKFwiICAgVyBGaW5pc2hcIiwgd2hhdCwgdG9kbylcbiAgICAgIGlmIChlcnJTdGF0ZSkgcmV0dXJuXG4gICAgICBpZiAoZXIpIHtcbiAgICAgICAgZXIuZnN0cmVhbV9maW5pc2hfY2FsbCA9IHdoYXRcbiAgICAgICAgcmV0dXJuIG1lLmVycm9yKGVyclN0YXRlID0gZXIpXG4gICAgICB9XG4gICAgICBpZiAoLS10b2RvID4gMCkgcmV0dXJuXG4gICAgICBpZiAoZG9uZSkgcmV0dXJuXG4gICAgICBkb25lID0gdHJ1ZVxuXG4gICAgICAvLyB3ZSBtYXkgc3RpbGwgbmVlZCB0byBzZXQgdGhlIG1vZGUvZXRjLiBvbiBzb21lIHBhcmVudCBkaXJzXG4gICAgICAvLyB0aGF0IHdlcmUgY3JlYXRlZCBwcmV2aW91c2x5LiAgZGVsYXkgZW5kL2Nsb3NlIHVudGlsIHRoZW4uXG4gICAgICBpZiAoIW1lLl9tYWRlRGlyKSByZXR1cm4gZW5kKClcbiAgICAgIGVsc2UgZW5kTWFkZURpcihtZSwgbWUuX3BhdGgsIGVuZClcblxuICAgICAgZnVuY3Rpb24gZW5kIChlcikge1xuICAgICAgICBpZiAoZXIpIHtcbiAgICAgICAgICBlci5mc3RyZWFtX2ZpbmlzaF9jYWxsID0gXCJzZXR1cE1hZGVEaXJcIlxuICAgICAgICAgIHJldHVybiBtZS5lcnJvcihlcilcbiAgICAgICAgfVxuICAgICAgICAvLyBhbGwgdGhlIHByb3BzIGhhdmUgYmVlbiBzZXQsIHNvIHdlJ3JlIGNvbXBsZXRlbHkgZG9uZS5cbiAgICAgICAgbWUuZW1pdChcImVuZFwiKVxuICAgICAgICBtZS5lbWl0KFwiY2xvc2VcIilcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZW5kTWFkZURpciAobWUsIHAsIGNiKSB7XG4gIHZhciBtYWRlID0gbWUuX21hZGVEaXJcbiAgLy8gZXZlcnl0aGluZyAqYmV0d2VlbiogbWFkZSBhbmQgcGF0aC5kaXJuYW1lKG1lLl9wYXRoKVxuICAvLyBuZWVkcyB0byBiZSBzZXQgdXAuICBOb3RlIHRoYXQgdGhpcyBtYXkganVzdCBiZSBvbmUgZGlyLlxuICB2YXIgZCA9IHBhdGguZGlybmFtZShwKVxuXG4gIGVuZE1hZGVEaXJfKG1lLCBkLCBmdW5jdGlvbiAoZXIpIHtcbiAgICBpZiAoZXIpIHJldHVybiBjYihlcilcbiAgICBpZiAoZCA9PT0gbWFkZSkge1xuICAgICAgcmV0dXJuIGNiKClcbiAgICB9XG4gICAgZW5kTWFkZURpcihtZSwgZCwgY2IpXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGVuZE1hZGVEaXJfIChtZSwgcCwgY2IpIHtcbiAgdmFyIGRpclByb3BzID0ge31cbiAgT2JqZWN0LmtleXMobWUucHJvcHMpLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICBkaXJQcm9wc1trXSA9IG1lLnByb3BzW2tdXG5cbiAgICAvLyBvbmx5IG1ha2Ugbm9uLXJlYWRhYmxlIGRpcnMgaWYgZXhwbGljaXRseSByZXF1ZXN0ZWQuXG4gICAgaWYgKGsgPT09IFwibW9kZVwiICYmIG1lLnR5cGUgIT09IFwiRGlyZWN0b3J5XCIpIHtcbiAgICAgIGRpclByb3BzW2tdID0gZGlyUHJvcHNba10gfCAwMTExXG4gICAgfVxuICB9KVxuXG4gIHZhciB0b2RvID0gM1xuICAsIGVyclN0YXRlID0gbnVsbFxuICBmcy5zdGF0KHAsIGZ1bmN0aW9uIChlciwgY3VycmVudCkge1xuICAgIGlmIChlcikgcmV0dXJuIGNiKGVyclN0YXRlID0gZXIpXG4gICAgZW5kQ2htb2QobWUsIGRpclByb3BzLCBjdXJyZW50LCBwLCBuZXh0KVxuICAgIGVuZENob3duKG1lLCBkaXJQcm9wcywgY3VycmVudCwgcCwgbmV4dClcbiAgICBlbmRVdGltZXMobWUsIGRpclByb3BzLCBjdXJyZW50LCBwLCBuZXh0KVxuICB9KVxuXG4gIGZ1bmN0aW9uIG5leHQgKGVyKSB7XG4gICAgaWYgKGVyclN0YXRlKSByZXR1cm5cbiAgICBpZiAoZXIpIHJldHVybiBjYihlcnJTdGF0ZSA9IGVyKVxuICAgIGlmICgtLSB0b2RvID09PSAwKSByZXR1cm4gY2IoKVxuICB9XG59XG5cbldyaXRlci5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5lcnJvcihcIkNhbid0IHBpcGUgZnJvbSB3cml0YWJsZSBzdHJlYW1cIilcbn1cblxuV3JpdGVyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZXJyb3IoXCJDYW5ub3QgYWRkIHRvIG5vbi1EaXJlY3RvcnkgdHlwZVwiKVxufVxuXG5Xcml0ZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdHJ1ZVxufVxuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyAoZCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGQpXG59XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiB0eXBlb2YgZCA9PT0gJ29iamVjdCcgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnbmF0aXZlcycpLnJlcXVpcmUoJ2ZzJywgWydzdHJlYW0nXSlcbiIsIi8vIE1vbmtleS1wYXRjaGluZyB0aGUgZnMgbW9kdWxlLlxuLy8gSXQncyB1Z2x5LCBidXQgdGhlcmUgaXMgc2ltcGx5IG5vIG90aGVyIHdheSB0byBkbyB0aGlzLlxudmFyIGZzID0gbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2ZzLmpzJylcblxudmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpXG5cbi8vIGZpeCB1cCBzb21lIGJ1c3RlZCBzdHVmZiwgbW9zdGx5IG9uIHdpbmRvd3MgYW5kIG9sZCBub2Rlc1xucmVxdWlyZSgnLi9wb2x5ZmlsbHMuanMnKVxuXG52YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKVxuXG5mdW5jdGlvbiBub29wICgpIHt9XG5cbnZhciBkZWJ1ZyA9IG5vb3BcbmlmICh1dGlsLmRlYnVnbG9nKVxuICBkZWJ1ZyA9IHV0aWwuZGVidWdsb2coJ2dmcycpXG5lbHNlIGlmICgvXFxiZ2ZzXFxiL2kudGVzdChwcm9jZXNzLmVudi5OT0RFX0RFQlVHIHx8ICcnKSlcbiAgZGVidWcgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbSA9IHV0aWwuZm9ybWF0LmFwcGx5KHV0aWwsIGFyZ3VtZW50cylcbiAgICBtID0gJ0dGUzogJyArIG0uc3BsaXQoL1xcbi8pLmpvaW4oJ1xcbkdGUzogJylcbiAgICBjb25zb2xlLmVycm9yKG0pXG4gIH1cblxuaWYgKC9cXGJnZnNcXGIvaS50ZXN0KHByb2Nlc3MuZW52Lk5PREVfREVCVUcgfHwgJycpKSB7XG4gIHByb2Nlc3Mub24oJ2V4aXQnLCBmdW5jdGlvbigpIHtcbiAgICBkZWJ1ZygnZmRzJywgZmRzKVxuICAgIGRlYnVnKHF1ZXVlKVxuICAgIGFzc2VydC5lcXVhbChxdWV1ZS5sZW5ndGgsIDApXG4gIH0pXG59XG5cblxudmFyIG9yaWdpbmFsT3BlbiA9IGZzLm9wZW5cbmZzLm9wZW4gPSBvcGVuXG5cbmZ1bmN0aW9uIG9wZW4ocGF0aCwgZmxhZ3MsIG1vZGUsIGNiKSB7XG4gIGlmICh0eXBlb2YgbW9kZSA9PT0gXCJmdW5jdGlvblwiKSBjYiA9IG1vZGUsIG1vZGUgPSBudWxsXG4gIGlmICh0eXBlb2YgY2IgIT09IFwiZnVuY3Rpb25cIikgY2IgPSBub29wXG4gIG5ldyBPcGVuUmVxKHBhdGgsIGZsYWdzLCBtb2RlLCBjYilcbn1cblxuZnVuY3Rpb24gT3BlblJlcShwYXRoLCBmbGFncywgbW9kZSwgY2IpIHtcbiAgdGhpcy5wYXRoID0gcGF0aFxuICB0aGlzLmZsYWdzID0gZmxhZ3NcbiAgdGhpcy5tb2RlID0gbW9kZVxuICB0aGlzLmNiID0gY2JcbiAgUmVxLmNhbGwodGhpcylcbn1cblxudXRpbC5pbmhlcml0cyhPcGVuUmVxLCBSZXEpXG5cbk9wZW5SZXEucHJvdG90eXBlLnByb2Nlc3MgPSBmdW5jdGlvbigpIHtcbiAgb3JpZ2luYWxPcGVuLmNhbGwoZnMsIHRoaXMucGF0aCwgdGhpcy5mbGFncywgdGhpcy5tb2RlLCB0aGlzLmRvbmUpXG59XG5cbnZhciBmZHMgPSB7fVxuT3BlblJlcS5wcm90b3R5cGUuZG9uZSA9IGZ1bmN0aW9uKGVyLCBmZCkge1xuICBkZWJ1Zygnb3BlbiBkb25lJywgZXIsIGZkKVxuICBpZiAoZmQpXG4gICAgZmRzWydmZCcgKyBmZF0gPSB0aGlzLnBhdGhcbiAgUmVxLnByb3RvdHlwZS5kb25lLmNhbGwodGhpcywgZXIsIGZkKVxufVxuXG5cbnZhciBvcmlnaW5hbFJlYWRkaXIgPSBmcy5yZWFkZGlyXG5mcy5yZWFkZGlyID0gcmVhZGRpclxuXG5mdW5jdGlvbiByZWFkZGlyKHBhdGgsIGNiKSB7XG4gIGlmICh0eXBlb2YgY2IgIT09IFwiZnVuY3Rpb25cIikgY2IgPSBub29wXG4gIG5ldyBSZWFkZGlyUmVxKHBhdGgsIGNiKVxufVxuXG5mdW5jdGlvbiBSZWFkZGlyUmVxKHBhdGgsIGNiKSB7XG4gIHRoaXMucGF0aCA9IHBhdGhcbiAgdGhpcy5jYiA9IGNiXG4gIFJlcS5jYWxsKHRoaXMpXG59XG5cbnV0aWwuaW5oZXJpdHMoUmVhZGRpclJlcSwgUmVxKVxuXG5SZWFkZGlyUmVxLnByb3RvdHlwZS5wcm9jZXNzID0gZnVuY3Rpb24oKSB7XG4gIG9yaWdpbmFsUmVhZGRpci5jYWxsKGZzLCB0aGlzLnBhdGgsIHRoaXMuZG9uZSlcbn1cblxuUmVhZGRpclJlcS5wcm90b3R5cGUuZG9uZSA9IGZ1bmN0aW9uKGVyLCBmaWxlcykge1xuICBpZiAoZmlsZXMgJiYgZmlsZXMuc29ydClcbiAgICBmaWxlcyA9IGZpbGVzLnNvcnQoKVxuICBSZXEucHJvdG90eXBlLmRvbmUuY2FsbCh0aGlzLCBlciwgZmlsZXMpXG4gIG9uY2xvc2UoKVxufVxuXG5cbnZhciBvcmlnaW5hbENsb3NlID0gZnMuY2xvc2VcbmZzLmNsb3NlID0gY2xvc2VcblxuZnVuY3Rpb24gY2xvc2UgKGZkLCBjYikge1xuICBkZWJ1ZygnY2xvc2UnLCBmZClcbiAgaWYgKHR5cGVvZiBjYiAhPT0gXCJmdW5jdGlvblwiKSBjYiA9IG5vb3BcbiAgZGVsZXRlIGZkc1snZmQnICsgZmRdXG4gIG9yaWdpbmFsQ2xvc2UuY2FsbChmcywgZmQsIGZ1bmN0aW9uKGVyKSB7XG4gICAgb25jbG9zZSgpXG4gICAgY2IoZXIpXG4gIH0pXG59XG5cblxudmFyIG9yaWdpbmFsQ2xvc2VTeW5jID0gZnMuY2xvc2VTeW5jXG5mcy5jbG9zZVN5bmMgPSBjbG9zZVN5bmNcblxuZnVuY3Rpb24gY2xvc2VTeW5jIChmZCkge1xuICB0cnkge1xuICAgIHJldHVybiBvcmlnaW5hbENsb3NlU3luYyhmZClcbiAgfSBmaW5hbGx5IHtcbiAgICBvbmNsb3NlKClcbiAgfVxufVxuXG5cbi8vIFJlcSBjbGFzc1xuZnVuY3Rpb24gUmVxICgpIHtcbiAgLy8gc3RhcnQgcHJvY2Vzc2luZ1xuICB0aGlzLmRvbmUgPSB0aGlzLmRvbmUuYmluZCh0aGlzKVxuICB0aGlzLmZhaWx1cmVzID0gMFxuICB0aGlzLnByb2Nlc3MoKVxufVxuXG5SZXEucHJvdG90eXBlLmRvbmUgPSBmdW5jdGlvbiAoZXIsIHJlc3VsdCkge1xuICB2YXIgdHJ5QWdhaW4gPSBmYWxzZVxuICBpZiAoZXIpIHtcbiAgICB2YXIgY29kZSA9IGVyLmNvZGVcbiAgICB2YXIgdHJ5QWdhaW4gPSBjb2RlID09PSBcIkVNRklMRVwiIHx8IGNvZGUgPT09IFwiRU5GSUxFXCJcbiAgICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJ3aW4zMlwiKVxuICAgICAgdHJ5QWdhaW4gPSB0cnlBZ2FpbiB8fCBjb2RlID09PSBcIk9LXCJcbiAgfVxuXG4gIGlmICh0cnlBZ2Fpbikge1xuICAgIHRoaXMuZmFpbHVyZXMgKytcbiAgICBlbnF1ZXVlKHRoaXMpXG4gIH0gZWxzZSB7XG4gICAgdmFyIGNiID0gdGhpcy5jYlxuICAgIGNiKGVyLCByZXN1bHQpXG4gIH1cbn1cblxudmFyIHF1ZXVlID0gW11cblxuZnVuY3Rpb24gZW5xdWV1ZShyZXEpIHtcbiAgcXVldWUucHVzaChyZXEpXG4gIGRlYnVnKCdlbnF1ZXVlICVkICVzJywgcXVldWUubGVuZ3RoLCByZXEuY29uc3RydWN0b3IubmFtZSwgcmVxKVxufVxuXG5mdW5jdGlvbiBvbmNsb3NlKCkge1xuICB2YXIgcmVxID0gcXVldWUuc2hpZnQoKVxuICBpZiAocmVxKSB7XG4gICAgZGVidWcoJ3Byb2Nlc3MnLCByZXEuY29uc3RydWN0b3IubmFtZSwgcmVxKVxuICAgIHJlcS5wcm9jZXNzKClcbiAgfVxufVxuIiwidmFyIGZzID0gcmVxdWlyZSgnLi9mcy5qcycpXG52YXIgY29uc3RhbnRzID0gcmVxdWlyZSgnY29uc3RhbnRzJylcblxudmFyIG9yaWdDd2QgPSBwcm9jZXNzLmN3ZFxudmFyIGN3ZCA9IG51bGxcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24oKSB7XG4gIGlmICghY3dkKVxuICAgIGN3ZCA9IG9yaWdDd2QuY2FsbChwcm9jZXNzKVxuICByZXR1cm4gY3dkXG59XG52YXIgY2hkaXIgPSBwcm9jZXNzLmNoZGlyXG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24oZCkge1xuICBjd2QgPSBudWxsXG4gIGNoZGlyLmNhbGwocHJvY2VzcywgZClcbn1cblxuLy8gKHJlLSlpbXBsZW1lbnQgc29tZSB0aGluZ3MgdGhhdCBhcmUga25vd24gYnVzdGVkIG9yIG1pc3NpbmcuXG5cbi8vIGxjaG1vZCwgYnJva2VuIHByaW9yIHRvIDAuNi4yXG4vLyBiYWNrLXBvcnQgdGhlIGZpeCBoZXJlLlxuaWYgKGNvbnN0YW50cy5oYXNPd25Qcm9wZXJ0eSgnT19TWU1MSU5LJykgJiZcbiAgICBwcm9jZXNzLnZlcnNpb24ubWF0Y2goL152MFxcLjZcXC5bMC0yXXxedjBcXC41XFwuLykpIHtcbiAgZnMubGNobW9kID0gZnVuY3Rpb24gKHBhdGgsIG1vZGUsIGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBub29wXG4gICAgZnMub3BlbiggcGF0aFxuICAgICAgICAgICAsIGNvbnN0YW50cy5PX1dST05MWSB8IGNvbnN0YW50cy5PX1NZTUxJTktcbiAgICAgICAgICAgLCBtb2RlXG4gICAgICAgICAgICwgZnVuY3Rpb24gKGVyciwgZmQpIHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgY2FsbGJhY2soZXJyKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIC8vIHByZWZlciB0byByZXR1cm4gdGhlIGNobW9kIGVycm9yLCBpZiBvbmUgb2NjdXJzLFxuICAgICAgLy8gYnV0IHN0aWxsIHRyeSB0byBjbG9zZSwgYW5kIHJlcG9ydCBjbG9zaW5nIGVycm9ycyBpZiB0aGV5IG9jY3VyLlxuICAgICAgZnMuZmNobW9kKGZkLCBtb2RlLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIGZzLmNsb3NlKGZkLCBmdW5jdGlvbihlcnIyKSB7XG4gICAgICAgICAgY2FsbGJhY2soZXJyIHx8IGVycjIpXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICBmcy5sY2htb2RTeW5jID0gZnVuY3Rpb24gKHBhdGgsIG1vZGUpIHtcbiAgICB2YXIgZmQgPSBmcy5vcGVuU3luYyhwYXRoLCBjb25zdGFudHMuT19XUk9OTFkgfCBjb25zdGFudHMuT19TWU1MSU5LLCBtb2RlKVxuXG4gICAgLy8gcHJlZmVyIHRvIHJldHVybiB0aGUgY2htb2QgZXJyb3IsIGlmIG9uZSBvY2N1cnMsXG4gICAgLy8gYnV0IHN0aWxsIHRyeSB0byBjbG9zZSwgYW5kIHJlcG9ydCBjbG9zaW5nIGVycm9ycyBpZiB0aGV5IG9jY3VyLlxuICAgIHZhciBlcnIsIGVycjJcbiAgICB0cnkge1xuICAgICAgdmFyIHJldCA9IGZzLmZjaG1vZFN5bmMoZmQsIG1vZGUpXG4gICAgfSBjYXRjaCAoZXIpIHtcbiAgICAgIGVyciA9IGVyXG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBmcy5jbG9zZVN5bmMoZmQpXG4gICAgfSBjYXRjaCAoZXIpIHtcbiAgICAgIGVycjIgPSBlclxuICAgIH1cbiAgICBpZiAoZXJyIHx8IGVycjIpIHRocm93IChlcnIgfHwgZXJyMilcbiAgICByZXR1cm4gcmV0XG4gIH1cbn1cblxuXG4vLyBsdXRpbWVzIGltcGxlbWVudGF0aW9uLCBvciBuby1vcFxuaWYgKCFmcy5sdXRpbWVzKSB7XG4gIGlmIChjb25zdGFudHMuaGFzT3duUHJvcGVydHkoXCJPX1NZTUxJTktcIikpIHtcbiAgICBmcy5sdXRpbWVzID0gZnVuY3Rpb24gKHBhdGgsIGF0LCBtdCwgY2IpIHtcbiAgICAgIGZzLm9wZW4ocGF0aCwgY29uc3RhbnRzLk9fU1lNTElOSywgZnVuY3Rpb24gKGVyLCBmZCkge1xuICAgICAgICBjYiA9IGNiIHx8IG5vb3BcbiAgICAgICAgaWYgKGVyKSByZXR1cm4gY2IoZXIpXG4gICAgICAgIGZzLmZ1dGltZXMoZmQsIGF0LCBtdCwgZnVuY3Rpb24gKGVyKSB7XG4gICAgICAgICAgZnMuY2xvc2UoZmQsIGZ1bmN0aW9uIChlcjIpIHtcbiAgICAgICAgICAgIHJldHVybiBjYihlciB8fCBlcjIpXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgZnMubHV0aW1lc1N5bmMgPSBmdW5jdGlvbiAocGF0aCwgYXQsIG10KSB7XG4gICAgICB2YXIgZmQgPSBmcy5vcGVuU3luYyhwYXRoLCBjb25zdGFudHMuT19TWU1MSU5LKVxuICAgICAgICAsIGVyclxuICAgICAgICAsIGVycjJcbiAgICAgICAgLCByZXRcblxuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIHJldCA9IGZzLmZ1dGltZXNTeW5jKGZkLCBhdCwgbXQpXG4gICAgICB9IGNhdGNoIChlcikge1xuICAgICAgICBlcnIgPSBlclxuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgZnMuY2xvc2VTeW5jKGZkKVxuICAgICAgfSBjYXRjaCAoZXIpIHtcbiAgICAgICAgZXJyMiA9IGVyXG4gICAgICB9XG4gICAgICBpZiAoZXJyIHx8IGVycjIpIHRocm93IChlcnIgfHwgZXJyMilcbiAgICAgIHJldHVybiByZXRcbiAgICB9XG5cbiAgfSBlbHNlIGlmIChmcy51dGltZW5zYXQgJiYgY29uc3RhbnRzLmhhc093blByb3BlcnR5KFwiQVRfU1lNTElOS19OT0ZPTExPV1wiKSkge1xuICAgIC8vIG1heWJlIHV0aW1lbnNhdCB3aWxsIGJlIGJvdW5kIHNvb25pc2g/XG4gICAgZnMubHV0aW1lcyA9IGZ1bmN0aW9uIChwYXRoLCBhdCwgbXQsIGNiKSB7XG4gICAgICBmcy51dGltZW5zYXQocGF0aCwgYXQsIG10LCBjb25zdGFudHMuQVRfU1lNTElOS19OT0ZPTExPVywgY2IpXG4gICAgfVxuXG4gICAgZnMubHV0aW1lc1N5bmMgPSBmdW5jdGlvbiAocGF0aCwgYXQsIG10KSB7XG4gICAgICByZXR1cm4gZnMudXRpbWVuc2F0U3luYyhwYXRoLCBhdCwgbXQsIGNvbnN0YW50cy5BVF9TWU1MSU5LX05PRk9MTE9XKVxuICAgIH1cblxuICB9IGVsc2Uge1xuICAgIGZzLmx1dGltZXMgPSBmdW5jdGlvbiAoX2EsIF9iLCBfYywgY2IpIHsgcHJvY2Vzcy5uZXh0VGljayhjYikgfVxuICAgIGZzLmx1dGltZXNTeW5jID0gZnVuY3Rpb24gKCkge31cbiAgfVxufVxuXG5cbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9pc2FhY3Mvbm9kZS1ncmFjZWZ1bC1mcy9pc3N1ZXMvNFxuLy8gQ2hvd24gc2hvdWxkIG5vdCBmYWlsIG9uIGVpbnZhbCBvciBlcGVybSBpZiBub24tcm9vdC5cbi8vIEl0IHNob3VsZCBub3QgZmFpbCBvbiBlbm9zeXMgZXZlciwgYXMgdGhpcyBqdXN0IGluZGljYXRlc1xuLy8gdGhhdCBhIGZzIGRvZXNuJ3Qgc3VwcG9ydCB0aGUgaW50ZW5kZWQgb3BlcmF0aW9uLlxuXG5mcy5jaG93biA9IGNob3duRml4KGZzLmNob3duKVxuZnMuZmNob3duID0gY2hvd25GaXgoZnMuZmNob3duKVxuZnMubGNob3duID0gY2hvd25GaXgoZnMubGNob3duKVxuXG5mcy5jaG1vZCA9IGNob3duRml4KGZzLmNobW9kKVxuZnMuZmNobW9kID0gY2hvd25GaXgoZnMuZmNobW9kKVxuZnMubGNobW9kID0gY2hvd25GaXgoZnMubGNobW9kKVxuXG5mcy5jaG93blN5bmMgPSBjaG93bkZpeFN5bmMoZnMuY2hvd25TeW5jKVxuZnMuZmNob3duU3luYyA9IGNob3duRml4U3luYyhmcy5mY2hvd25TeW5jKVxuZnMubGNob3duU3luYyA9IGNob3duRml4U3luYyhmcy5sY2hvd25TeW5jKVxuXG5mcy5jaG1vZFN5bmMgPSBjaG93bkZpeChmcy5jaG1vZFN5bmMpXG5mcy5mY2htb2RTeW5jID0gY2hvd25GaXgoZnMuZmNobW9kU3luYylcbmZzLmxjaG1vZFN5bmMgPSBjaG93bkZpeChmcy5sY2htb2RTeW5jKVxuXG5mdW5jdGlvbiBjaG93bkZpeCAob3JpZykge1xuICBpZiAoIW9yaWcpIHJldHVybiBvcmlnXG4gIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCB1aWQsIGdpZCwgY2IpIHtcbiAgICByZXR1cm4gb3JpZy5jYWxsKGZzLCB0YXJnZXQsIHVpZCwgZ2lkLCBmdW5jdGlvbiAoZXIsIHJlcykge1xuICAgICAgaWYgKGNob3duRXJPayhlcikpIGVyID0gbnVsbFxuICAgICAgY2IoZXIsIHJlcylcbiAgICB9KVxuICB9XG59XG5cbmZ1bmN0aW9uIGNob3duRml4U3luYyAob3JpZykge1xuICBpZiAoIW9yaWcpIHJldHVybiBvcmlnXG4gIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCB1aWQsIGdpZCkge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gb3JpZy5jYWxsKGZzLCB0YXJnZXQsIHVpZCwgZ2lkKVxuICAgIH0gY2F0Y2ggKGVyKSB7XG4gICAgICBpZiAoIWNob3duRXJPayhlcikpIHRocm93IGVyXG4gICAgfVxuICB9XG59XG5cbi8vIEVOT1NZUyBtZWFucyB0aGF0IHRoZSBmcyBkb2Vzbid0IHN1cHBvcnQgdGhlIG9wLiBKdXN0IGlnbm9yZVxuLy8gdGhhdCwgYmVjYXVzZSBpdCBkb2Vzbid0IG1hdHRlci5cbi8vXG4vLyBpZiB0aGVyZSdzIG5vIGdldHVpZCwgb3IgaWYgZ2V0dWlkKCkgaXMgc29tZXRoaW5nIG90aGVyXG4vLyB0aGFuIDAsIGFuZCB0aGUgZXJyb3IgaXMgRUlOVkFMIG9yIEVQRVJNLCB0aGVuIGp1c3QgaWdub3JlXG4vLyBpdC5cbi8vXG4vLyBUaGlzIHNwZWNpZmljIGNhc2UgaXMgYSBzaWxlbnQgZmFpbHVyZSBpbiBjcCwgaW5zdGFsbCwgdGFyLFxuLy8gYW5kIG1vc3Qgb3RoZXIgdW5peCB0b29scyB0aGF0IG1hbmFnZSBwZXJtaXNzaW9ucy5cbi8vXG4vLyBXaGVuIHJ1bm5pbmcgYXMgcm9vdCwgb3IgaWYgb3RoZXIgdHlwZXMgb2YgZXJyb3JzIGFyZVxuLy8gZW5jb3VudGVyZWQsIHRoZW4gaXQncyBzdHJpY3QuXG5mdW5jdGlvbiBjaG93bkVyT2sgKGVyKSB7XG4gIGlmICghZXIpXG4gICAgcmV0dXJuIHRydWVcblxuICBpZiAoZXIuY29kZSA9PT0gXCJFTk9TWVNcIilcbiAgICByZXR1cm4gdHJ1ZVxuXG4gIHZhciBub25yb290ID0gIXByb2Nlc3MuZ2V0dWlkIHx8IHByb2Nlc3MuZ2V0dWlkKCkgIT09IDBcbiAgaWYgKG5vbnJvb3QpIHtcbiAgICBpZiAoZXIuY29kZSA9PT0gXCJFSU5WQUxcIiB8fCBlci5jb2RlID09PSBcIkVQRVJNXCIpXG4gICAgICByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlXG59XG5cblxuLy8gaWYgbGNobW9kL2xjaG93biBkbyBub3QgZXhpc3QsIHRoZW4gbWFrZSB0aGVtIG5vLW9wc1xuaWYgKCFmcy5sY2htb2QpIHtcbiAgZnMubGNobW9kID0gZnVuY3Rpb24gKHBhdGgsIG1vZGUsIGNiKSB7XG4gICAgcHJvY2Vzcy5uZXh0VGljayhjYilcbiAgfVxuICBmcy5sY2htb2RTeW5jID0gZnVuY3Rpb24gKCkge31cbn1cbmlmICghZnMubGNob3duKSB7XG4gIGZzLmxjaG93biA9IGZ1bmN0aW9uIChwYXRoLCB1aWQsIGdpZCwgY2IpIHtcbiAgICBwcm9jZXNzLm5leHRUaWNrKGNiKVxuICB9XG4gIGZzLmxjaG93blN5bmMgPSBmdW5jdGlvbiAoKSB7fVxufVxuXG5cblxuLy8gb24gV2luZG93cywgQS9WIHNvZnR3YXJlIGNhbiBsb2NrIHRoZSBkaXJlY3RvcnksIGNhdXNpbmcgdGhpc1xuLy8gdG8gZmFpbCB3aXRoIGFuIEVBQ0NFUyBvciBFUEVSTSBpZiB0aGUgZGlyZWN0b3J5IGNvbnRhaW5zIG5ld2x5XG4vLyBjcmVhdGVkIGZpbGVzLiAgVHJ5IGFnYWluIG9uIGZhaWx1cmUsIGZvciB1cCB0byAxIHNlY29uZC5cbmlmIChwcm9jZXNzLnBsYXRmb3JtID09PSBcIndpbjMyXCIpIHtcbiAgdmFyIHJlbmFtZV8gPSBmcy5yZW5hbWVcbiAgZnMucmVuYW1lID0gZnVuY3Rpb24gcmVuYW1lIChmcm9tLCB0bywgY2IpIHtcbiAgICB2YXIgc3RhcnQgPSBEYXRlLm5vdygpXG4gICAgcmVuYW1lXyhmcm9tLCB0bywgZnVuY3Rpb24gQ0IgKGVyKSB7XG4gICAgICBpZiAoZXJcbiAgICAgICAgICAmJiAoZXIuY29kZSA9PT0gXCJFQUNDRVNcIiB8fCBlci5jb2RlID09PSBcIkVQRVJNXCIpXG4gICAgICAgICAgJiYgRGF0ZS5ub3coKSAtIHN0YXJ0IDwgMTAwMCkge1xuICAgICAgICByZXR1cm4gcmVuYW1lXyhmcm9tLCB0bywgQ0IpXG4gICAgICB9XG4gICAgICBpZihjYikgY2IoZXIpXG4gICAgfSlcbiAgfVxufVxuXG5cbi8vIGlmIHJlYWQoKSByZXR1cm5zIEVBR0FJTiwgdGhlbiBqdXN0IHRyeSBpdCBhZ2Fpbi5cbnZhciByZWFkID0gZnMucmVhZFxuZnMucmVhZCA9IGZ1bmN0aW9uIChmZCwgYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgcG9zaXRpb24sIGNhbGxiYWNrXykge1xuICB2YXIgY2FsbGJhY2tcbiAgaWYgKGNhbGxiYWNrXyAmJiB0eXBlb2YgY2FsbGJhY2tfID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdmFyIGVhZ0NvdW50ZXIgPSAwXG4gICAgY2FsbGJhY2sgPSBmdW5jdGlvbiAoZXIsIF8sIF9fKSB7XG4gICAgICBpZiAoZXIgJiYgZXIuY29kZSA9PT0gJ0VBR0FJTicgJiYgZWFnQ291bnRlciA8IDEwKSB7XG4gICAgICAgIGVhZ0NvdW50ZXIgKytcbiAgICAgICAgcmV0dXJuIHJlYWQuY2FsbChmcywgZmQsIGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIHBvc2l0aW9uLCBjYWxsYmFjaylcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrXy5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgfVxuICB9XG4gIHJldHVybiByZWFkLmNhbGwoZnMsIGZkLCBidWZmZXIsIG9mZnNldCwgbGVuZ3RoLCBwb3NpdGlvbiwgY2FsbGJhY2spXG59XG5cbnZhciByZWFkU3luYyA9IGZzLnJlYWRTeW5jXG5mcy5yZWFkU3luYyA9IGZ1bmN0aW9uIChmZCwgYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgcG9zaXRpb24pIHtcbiAgdmFyIGVhZ0NvdW50ZXIgPSAwXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiByZWFkU3luYy5jYWxsKGZzLCBmZCwgYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgcG9zaXRpb24pXG4gICAgfSBjYXRjaCAoZXIpIHtcbiAgICAgIGlmIChlci5jb2RlID09PSAnRUFHQUlOJyAmJiBlYWdDb3VudGVyIDwgMTApIHtcbiAgICAgICAgZWFnQ291bnRlciArK1xuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgICAgdGhyb3cgZXJcbiAgICB9XG4gIH1cbn1cblxuIiwiZXhwb3J0cy5zZXRvcHRzID0gc2V0b3B0c1xuZXhwb3J0cy5vd25Qcm9wID0gb3duUHJvcFxuZXhwb3J0cy5tYWtlQWJzID0gbWFrZUFic1xuZXhwb3J0cy5maW5pc2ggPSBmaW5pc2hcbmV4cG9ydHMubWFyayA9IG1hcmtcbmV4cG9ydHMuaXNJZ25vcmVkID0gaXNJZ25vcmVkXG5leHBvcnRzLmNoaWxkcmVuSWdub3JlZCA9IGNoaWxkcmVuSWdub3JlZFxuXG5mdW5jdGlvbiBvd25Qcm9wIChvYmosIGZpZWxkKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBmaWVsZClcbn1cblxudmFyIGZzID0gcmVxdWlyZShcImZzXCIpXG52YXIgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpXG52YXIgbWluaW1hdGNoID0gcmVxdWlyZShcIm1pbmltYXRjaFwiKVxudmFyIGlzQWJzb2x1dGUgPSByZXF1aXJlKFwicGF0aC1pcy1hYnNvbHV0ZVwiKVxudmFyIE1pbmltYXRjaCA9IG1pbmltYXRjaC5NaW5pbWF0Y2hcblxuZnVuY3Rpb24gYWxwaGFzb3J0IChhLCBiKSB7XG4gIHJldHVybiBhLmxvY2FsZUNvbXBhcmUoYiwgJ2VuJylcbn1cblxuZnVuY3Rpb24gc2V0dXBJZ25vcmVzIChzZWxmLCBvcHRpb25zKSB7XG4gIHNlbGYuaWdub3JlID0gb3B0aW9ucy5pZ25vcmUgfHwgW11cblxuICBpZiAoIUFycmF5LmlzQXJyYXkoc2VsZi5pZ25vcmUpKVxuICAgIHNlbGYuaWdub3JlID0gW3NlbGYuaWdub3JlXVxuXG4gIGlmIChzZWxmLmlnbm9yZS5sZW5ndGgpIHtcbiAgICBzZWxmLmlnbm9yZSA9IHNlbGYuaWdub3JlLm1hcChpZ25vcmVNYXApXG4gIH1cbn1cblxuLy8gaWdub3JlIHBhdHRlcm5zIGFyZSBhbHdheXMgaW4gZG90OnRydWUgbW9kZS5cbmZ1bmN0aW9uIGlnbm9yZU1hcCAocGF0dGVybikge1xuICB2YXIgZ21hdGNoZXIgPSBudWxsXG4gIGlmIChwYXR0ZXJuLnNsaWNlKC0zKSA9PT0gJy8qKicpIHtcbiAgICB2YXIgZ3BhdHRlcm4gPSBwYXR0ZXJuLnJlcGxhY2UoLyhcXC9cXCpcXCopKyQvLCAnJylcbiAgICBnbWF0Y2hlciA9IG5ldyBNaW5pbWF0Y2goZ3BhdHRlcm4sIHsgZG90OiB0cnVlIH0pXG4gIH1cblxuICByZXR1cm4ge1xuICAgIG1hdGNoZXI6IG5ldyBNaW5pbWF0Y2gocGF0dGVybiwgeyBkb3Q6IHRydWUgfSksXG4gICAgZ21hdGNoZXI6IGdtYXRjaGVyXG4gIH1cbn1cblxuZnVuY3Rpb24gc2V0b3B0cyAoc2VsZiwgcGF0dGVybiwgb3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpXG4gICAgb3B0aW9ucyA9IHt9XG5cbiAgLy8gYmFzZS1tYXRjaGluZzoganVzdCB1c2UgZ2xvYnN0YXIgZm9yIHRoYXQuXG4gIGlmIChvcHRpb25zLm1hdGNoQmFzZSAmJiAtMSA9PT0gcGF0dGVybi5pbmRleE9mKFwiL1wiKSkge1xuICAgIGlmIChvcHRpb25zLm5vZ2xvYnN0YXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImJhc2UgbWF0Y2hpbmcgcmVxdWlyZXMgZ2xvYnN0YXJcIilcbiAgICB9XG4gICAgcGF0dGVybiA9IFwiKiovXCIgKyBwYXR0ZXJuXG4gIH1cblxuICBzZWxmLnNpbGVudCA9ICEhb3B0aW9ucy5zaWxlbnRcbiAgc2VsZi5wYXR0ZXJuID0gcGF0dGVyblxuICBzZWxmLnN0cmljdCA9IG9wdGlvbnMuc3RyaWN0ICE9PSBmYWxzZVxuICBzZWxmLnJlYWxwYXRoID0gISFvcHRpb25zLnJlYWxwYXRoXG4gIHNlbGYucmVhbHBhdGhDYWNoZSA9IG9wdGlvbnMucmVhbHBhdGhDYWNoZSB8fCBPYmplY3QuY3JlYXRlKG51bGwpXG4gIHNlbGYuZm9sbG93ID0gISFvcHRpb25zLmZvbGxvd1xuICBzZWxmLmRvdCA9ICEhb3B0aW9ucy5kb3RcbiAgc2VsZi5tYXJrID0gISFvcHRpb25zLm1hcmtcbiAgc2VsZi5ub2RpciA9ICEhb3B0aW9ucy5ub2RpclxuICBpZiAoc2VsZi5ub2RpcilcbiAgICBzZWxmLm1hcmsgPSB0cnVlXG4gIHNlbGYuc3luYyA9ICEhb3B0aW9ucy5zeW5jXG4gIHNlbGYubm91bmlxdWUgPSAhIW9wdGlvbnMubm91bmlxdWVcbiAgc2VsZi5ub251bGwgPSAhIW9wdGlvbnMubm9udWxsXG4gIHNlbGYubm9zb3J0ID0gISFvcHRpb25zLm5vc29ydFxuICBzZWxmLm5vY2FzZSA9ICEhb3B0aW9ucy5ub2Nhc2VcbiAgc2VsZi5zdGF0ID0gISFvcHRpb25zLnN0YXRcbiAgc2VsZi5ub3Byb2Nlc3MgPSAhIW9wdGlvbnMubm9wcm9jZXNzXG4gIHNlbGYuYWJzb2x1dGUgPSAhIW9wdGlvbnMuYWJzb2x1dGVcbiAgc2VsZi5mcyA9IG9wdGlvbnMuZnMgfHwgZnNcblxuICBzZWxmLm1heExlbmd0aCA9IG9wdGlvbnMubWF4TGVuZ3RoIHx8IEluZmluaXR5XG4gIHNlbGYuY2FjaGUgPSBvcHRpb25zLmNhY2hlIHx8IE9iamVjdC5jcmVhdGUobnVsbClcbiAgc2VsZi5zdGF0Q2FjaGUgPSBvcHRpb25zLnN0YXRDYWNoZSB8fCBPYmplY3QuY3JlYXRlKG51bGwpXG4gIHNlbGYuc3ltbGlua3MgPSBvcHRpb25zLnN5bWxpbmtzIHx8IE9iamVjdC5jcmVhdGUobnVsbClcblxuICBzZXR1cElnbm9yZXMoc2VsZiwgb3B0aW9ucylcblxuICBzZWxmLmNoYW5nZWRDd2QgPSBmYWxzZVxuICB2YXIgY3dkID0gcHJvY2Vzcy5jd2QoKVxuICBpZiAoIW93blByb3Aob3B0aW9ucywgXCJjd2RcIikpXG4gICAgc2VsZi5jd2QgPSBjd2RcbiAgZWxzZSB7XG4gICAgc2VsZi5jd2QgPSBwYXRoLnJlc29sdmUob3B0aW9ucy5jd2QpXG4gICAgc2VsZi5jaGFuZ2VkQ3dkID0gc2VsZi5jd2QgIT09IGN3ZFxuICB9XG5cbiAgc2VsZi5yb290ID0gb3B0aW9ucy5yb290IHx8IHBhdGgucmVzb2x2ZShzZWxmLmN3ZCwgXCIvXCIpXG4gIHNlbGYucm9vdCA9IHBhdGgucmVzb2x2ZShzZWxmLnJvb3QpXG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSBcIndpbjMyXCIpXG4gICAgc2VsZi5yb290ID0gc2VsZi5yb290LnJlcGxhY2UoL1xcXFwvZywgXCIvXCIpXG5cbiAgLy8gVE9ETzogaXMgYW4gYWJzb2x1dGUgYGN3ZGAgc3VwcG9zZWQgdG8gYmUgcmVzb2x2ZWQgYWdhaW5zdCBgcm9vdGA/XG4gIC8vIGUuZy4geyBjd2Q6ICcvdGVzdCcsIHJvb3Q6IF9fZGlybmFtZSB9ID09PSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnL3Rlc3QnKVxuICBzZWxmLmN3ZEFicyA9IGlzQWJzb2x1dGUoc2VsZi5jd2QpID8gc2VsZi5jd2QgOiBtYWtlQWJzKHNlbGYsIHNlbGYuY3dkKVxuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJ3aW4zMlwiKVxuICAgIHNlbGYuY3dkQWJzID0gc2VsZi5jd2RBYnMucmVwbGFjZSgvXFxcXC9nLCBcIi9cIilcbiAgc2VsZi5ub21vdW50ID0gISFvcHRpb25zLm5vbW91bnRcblxuICAvLyBkaXNhYmxlIGNvbW1lbnRzIGFuZCBuZWdhdGlvbiBpbiBNaW5pbWF0Y2guXG4gIC8vIE5vdGUgdGhhdCB0aGV5IGFyZSBub3Qgc3VwcG9ydGVkIGluIEdsb2IgaXRzZWxmIGFueXdheS5cbiAgb3B0aW9ucy5ub25lZ2F0ZSA9IHRydWVcbiAgb3B0aW9ucy5ub2NvbW1lbnQgPSB0cnVlXG5cbiAgc2VsZi5taW5pbWF0Y2ggPSBuZXcgTWluaW1hdGNoKHBhdHRlcm4sIG9wdGlvbnMpXG4gIHNlbGYub3B0aW9ucyA9IHNlbGYubWluaW1hdGNoLm9wdGlvbnNcbn1cblxuZnVuY3Rpb24gZmluaXNoIChzZWxmKSB7XG4gIHZhciBub3UgPSBzZWxmLm5vdW5pcXVlXG4gIHZhciBhbGwgPSBub3UgPyBbXSA6IE9iamVjdC5jcmVhdGUobnVsbClcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IHNlbGYubWF0Y2hlcy5sZW5ndGg7IGkgPCBsOyBpICsrKSB7XG4gICAgdmFyIG1hdGNoZXMgPSBzZWxmLm1hdGNoZXNbaV1cbiAgICBpZiAoIW1hdGNoZXMgfHwgT2JqZWN0LmtleXMobWF0Y2hlcykubGVuZ3RoID09PSAwKSB7XG4gICAgICBpZiAoc2VsZi5ub251bGwpIHtcbiAgICAgICAgLy8gZG8gbGlrZSB0aGUgc2hlbGwsIGFuZCBzcGl0IG91dCB0aGUgbGl0ZXJhbCBnbG9iXG4gICAgICAgIHZhciBsaXRlcmFsID0gc2VsZi5taW5pbWF0Y2guZ2xvYlNldFtpXVxuICAgICAgICBpZiAobm91KVxuICAgICAgICAgIGFsbC5wdXNoKGxpdGVyYWwpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBhbGxbbGl0ZXJhbF0gPSB0cnVlXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGhhZCBtYXRjaGVzXG4gICAgICB2YXIgbSA9IE9iamVjdC5rZXlzKG1hdGNoZXMpXG4gICAgICBpZiAobm91KVxuICAgICAgICBhbGwucHVzaC5hcHBseShhbGwsIG0pXG4gICAgICBlbHNlXG4gICAgICAgIG0uZm9yRWFjaChmdW5jdGlvbiAobSkge1xuICAgICAgICAgIGFsbFttXSA9IHRydWVcbiAgICAgICAgfSlcbiAgICB9XG4gIH1cblxuICBpZiAoIW5vdSlcbiAgICBhbGwgPSBPYmplY3Qua2V5cyhhbGwpXG5cbiAgaWYgKCFzZWxmLm5vc29ydClcbiAgICBhbGwgPSBhbGwuc29ydChhbHBoYXNvcnQpXG5cbiAgLy8gYXQgKnNvbWUqIHBvaW50IHdlIHN0YXR0ZWQgYWxsIG9mIHRoZXNlXG4gIGlmIChzZWxmLm1hcmspIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFsbC5sZW5ndGg7IGkrKykge1xuICAgICAgYWxsW2ldID0gc2VsZi5fbWFyayhhbGxbaV0pXG4gICAgfVxuICAgIGlmIChzZWxmLm5vZGlyKSB7XG4gICAgICBhbGwgPSBhbGwuZmlsdGVyKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHZhciBub3REaXIgPSAhKC9cXC8kLy50ZXN0KGUpKVxuICAgICAgICB2YXIgYyA9IHNlbGYuY2FjaGVbZV0gfHwgc2VsZi5jYWNoZVttYWtlQWJzKHNlbGYsIGUpXVxuICAgICAgICBpZiAobm90RGlyICYmIGMpXG4gICAgICAgICAgbm90RGlyID0gYyAhPT0gJ0RJUicgJiYgIUFycmF5LmlzQXJyYXkoYylcbiAgICAgICAgcmV0dXJuIG5vdERpclxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICBpZiAoc2VsZi5pZ25vcmUubGVuZ3RoKVxuICAgIGFsbCA9IGFsbC5maWx0ZXIoZnVuY3Rpb24obSkge1xuICAgICAgcmV0dXJuICFpc0lnbm9yZWQoc2VsZiwgbSlcbiAgICB9KVxuXG4gIHNlbGYuZm91bmQgPSBhbGxcbn1cblxuZnVuY3Rpb24gbWFyayAoc2VsZiwgcCkge1xuICB2YXIgYWJzID0gbWFrZUFicyhzZWxmLCBwKVxuICB2YXIgYyA9IHNlbGYuY2FjaGVbYWJzXVxuICB2YXIgbSA9IHBcbiAgaWYgKGMpIHtcbiAgICB2YXIgaXNEaXIgPSBjID09PSAnRElSJyB8fCBBcnJheS5pc0FycmF5KGMpXG4gICAgdmFyIHNsYXNoID0gcC5zbGljZSgtMSkgPT09ICcvJ1xuXG4gICAgaWYgKGlzRGlyICYmICFzbGFzaClcbiAgICAgIG0gKz0gJy8nXG4gICAgZWxzZSBpZiAoIWlzRGlyICYmIHNsYXNoKVxuICAgICAgbSA9IG0uc2xpY2UoMCwgLTEpXG5cbiAgICBpZiAobSAhPT0gcCkge1xuICAgICAgdmFyIG1hYnMgPSBtYWtlQWJzKHNlbGYsIG0pXG4gICAgICBzZWxmLnN0YXRDYWNoZVttYWJzXSA9IHNlbGYuc3RhdENhY2hlW2Fic11cbiAgICAgIHNlbGYuY2FjaGVbbWFic10gPSBzZWxmLmNhY2hlW2Fic11cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbVxufVxuXG4vLyBsb3R0YSBzaXR1cHMuLi5cbmZ1bmN0aW9uIG1ha2VBYnMgKHNlbGYsIGYpIHtcbiAgdmFyIGFicyA9IGZcbiAgaWYgKGYuY2hhckF0KDApID09PSAnLycpIHtcbiAgICBhYnMgPSBwYXRoLmpvaW4oc2VsZi5yb290LCBmKVxuICB9IGVsc2UgaWYgKGlzQWJzb2x1dGUoZikgfHwgZiA9PT0gJycpIHtcbiAgICBhYnMgPSBmXG4gIH0gZWxzZSBpZiAoc2VsZi5jaGFuZ2VkQ3dkKSB7XG4gICAgYWJzID0gcGF0aC5yZXNvbHZlKHNlbGYuY3dkLCBmKVxuICB9IGVsc2Uge1xuICAgIGFicyA9IHBhdGgucmVzb2x2ZShmKVxuICB9XG5cbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpXG4gICAgYWJzID0gYWJzLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuXG4gIHJldHVybiBhYnNcbn1cblxuXG4vLyBSZXR1cm4gdHJ1ZSwgaWYgcGF0dGVybiBlbmRzIHdpdGggZ2xvYnN0YXIgJyoqJywgZm9yIHRoZSBhY2NvbXBhbnlpbmcgcGFyZW50IGRpcmVjdG9yeS5cbi8vIEV4Oi0gSWYgbm9kZV9tb2R1bGVzLyoqIGlzIHRoZSBwYXR0ZXJuLCBhZGQgJ25vZGVfbW9kdWxlcycgdG8gaWdub3JlIGxpc3QgYWxvbmcgd2l0aCBpdCdzIGNvbnRlbnRzXG5mdW5jdGlvbiBpc0lnbm9yZWQgKHNlbGYsIHBhdGgpIHtcbiAgaWYgKCFzZWxmLmlnbm9yZS5sZW5ndGgpXG4gICAgcmV0dXJuIGZhbHNlXG5cbiAgcmV0dXJuIHNlbGYuaWdub3JlLnNvbWUoZnVuY3Rpb24oaXRlbSkge1xuICAgIHJldHVybiBpdGVtLm1hdGNoZXIubWF0Y2gocGF0aCkgfHwgISEoaXRlbS5nbWF0Y2hlciAmJiBpdGVtLmdtYXRjaGVyLm1hdGNoKHBhdGgpKVxuICB9KVxufVxuXG5mdW5jdGlvbiBjaGlsZHJlbklnbm9yZWQgKHNlbGYsIHBhdGgpIHtcbiAgaWYgKCFzZWxmLmlnbm9yZS5sZW5ndGgpXG4gICAgcmV0dXJuIGZhbHNlXG5cbiAgcmV0dXJuIHNlbGYuaWdub3JlLnNvbWUoZnVuY3Rpb24oaXRlbSkge1xuICAgIHJldHVybiAhIShpdGVtLmdtYXRjaGVyICYmIGl0ZW0uZ21hdGNoZXIubWF0Y2gocGF0aCkpXG4gIH0pXG59XG4iLCIvLyBBcHByb2FjaDpcbi8vXG4vLyAxLiBHZXQgdGhlIG1pbmltYXRjaCBzZXRcbi8vIDIuIEZvciBlYWNoIHBhdHRlcm4gaW4gdGhlIHNldCwgUFJPQ0VTUyhwYXR0ZXJuLCBmYWxzZSlcbi8vIDMuIFN0b3JlIG1hdGNoZXMgcGVyLXNldCwgdGhlbiB1bmlxIHRoZW1cbi8vXG4vLyBQUk9DRVNTKHBhdHRlcm4sIGluR2xvYlN0YXIpXG4vLyBHZXQgdGhlIGZpcnN0IFtuXSBpdGVtcyBmcm9tIHBhdHRlcm4gdGhhdCBhcmUgYWxsIHN0cmluZ3Ncbi8vIEpvaW4gdGhlc2UgdG9nZXRoZXIuICBUaGlzIGlzIFBSRUZJWC5cbi8vICAgSWYgdGhlcmUgaXMgbm8gbW9yZSByZW1haW5pbmcsIHRoZW4gc3RhdChQUkVGSVgpIGFuZFxuLy8gICBhZGQgdG8gbWF0Y2hlcyBpZiBpdCBzdWNjZWVkcy4gIEVORC5cbi8vXG4vLyBJZiBpbkdsb2JTdGFyIGFuZCBQUkVGSVggaXMgc3ltbGluayBhbmQgcG9pbnRzIHRvIGRpclxuLy8gICBzZXQgRU5UUklFUyA9IFtdXG4vLyBlbHNlIHJlYWRkaXIoUFJFRklYKSBhcyBFTlRSSUVTXG4vLyAgIElmIGZhaWwsIEVORFxuLy9cbi8vIHdpdGggRU5UUklFU1xuLy8gICBJZiBwYXR0ZXJuW25dIGlzIEdMT0JTVEFSXG4vLyAgICAgLy8gaGFuZGxlIHRoZSBjYXNlIHdoZXJlIHRoZSBnbG9ic3RhciBtYXRjaCBpcyBlbXB0eVxuLy8gICAgIC8vIGJ5IHBydW5pbmcgaXQgb3V0LCBhbmQgdGVzdGluZyB0aGUgcmVzdWx0aW5nIHBhdHRlcm5cbi8vICAgICBQUk9DRVNTKHBhdHRlcm5bMC4ubl0gKyBwYXR0ZXJuW24rMSAuLiAkXSwgZmFsc2UpXG4vLyAgICAgLy8gaGFuZGxlIG90aGVyIGNhc2VzLlxuLy8gICAgIGZvciBFTlRSWSBpbiBFTlRSSUVTIChub3QgZG90ZmlsZXMpXG4vLyAgICAgICAvLyBhdHRhY2ggZ2xvYnN0YXIgKyB0YWlsIG9udG8gdGhlIGVudHJ5XG4vLyAgICAgICAvLyBNYXJrIHRoYXQgdGhpcyBlbnRyeSBpcyBhIGdsb2JzdGFyIG1hdGNoXG4vLyAgICAgICBQUk9DRVNTKHBhdHRlcm5bMC4ubl0gKyBFTlRSWSArIHBhdHRlcm5bbiAuLiAkXSwgdHJ1ZSlcbi8vXG4vLyAgIGVsc2UgLy8gbm90IGdsb2JzdGFyXG4vLyAgICAgZm9yIEVOVFJZIGluIEVOVFJJRVMgKG5vdCBkb3RmaWxlcywgdW5sZXNzIHBhdHRlcm5bbl0gaXMgZG90KVxuLy8gICAgICAgVGVzdCBFTlRSWSBhZ2FpbnN0IHBhdHRlcm5bbl1cbi8vICAgICAgIElmIGZhaWxzLCBjb250aW51ZVxuLy8gICAgICAgSWYgcGFzc2VzLCBQUk9DRVNTKHBhdHRlcm5bMC4ubl0gKyBpdGVtICsgcGF0dGVybltuKzEgLi4gJF0pXG4vL1xuLy8gQ2F2ZWF0OlxuLy8gICBDYWNoZSBhbGwgc3RhdHMgYW5kIHJlYWRkaXJzIHJlc3VsdHMgdG8gbWluaW1pemUgc3lzY2FsbC4gIFNpbmNlIGFsbFxuLy8gICB3ZSBldmVyIGNhcmUgYWJvdXQgaXMgZXhpc3RlbmNlIGFuZCBkaXJlY3RvcnktbmVzcywgd2UgY2FuIGp1c3Qga2VlcFxuLy8gICBgdHJ1ZWAgZm9yIGZpbGVzLCBhbmQgW2NoaWxkcmVuLC4uLl0gZm9yIGRpcmVjdG9yaWVzLCBvciBgZmFsc2VgIGZvclxuLy8gICB0aGluZ3MgdGhhdCBkb24ndCBleGlzdC5cblxubW9kdWxlLmV4cG9ydHMgPSBnbG9iXG5cbnZhciBycCA9IHJlcXVpcmUoJ2ZzLnJlYWxwYXRoJylcbnZhciBtaW5pbWF0Y2ggPSByZXF1aXJlKCdtaW5pbWF0Y2gnKVxudmFyIE1pbmltYXRjaCA9IG1pbmltYXRjaC5NaW5pbWF0Y2hcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJylcbnZhciBFRSA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlclxudmFyIHBhdGggPSByZXF1aXJlKCdwYXRoJylcbnZhciBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKVxudmFyIGlzQWJzb2x1dGUgPSByZXF1aXJlKCdwYXRoLWlzLWFic29sdXRlJylcbnZhciBnbG9iU3luYyA9IHJlcXVpcmUoJy4vc3luYy5qcycpXG52YXIgY29tbW9uID0gcmVxdWlyZSgnLi9jb21tb24uanMnKVxudmFyIHNldG9wdHMgPSBjb21tb24uc2V0b3B0c1xudmFyIG93blByb3AgPSBjb21tb24ub3duUHJvcFxudmFyIGluZmxpZ2h0ID0gcmVxdWlyZSgnaW5mbGlnaHQnKVxudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJylcbnZhciBjaGlsZHJlbklnbm9yZWQgPSBjb21tb24uY2hpbGRyZW5JZ25vcmVkXG52YXIgaXNJZ25vcmVkID0gY29tbW9uLmlzSWdub3JlZFxuXG52YXIgb25jZSA9IHJlcXVpcmUoJ29uY2UnKVxuXG5mdW5jdGlvbiBnbG9iIChwYXR0ZXJuLCBvcHRpb25zLCBjYikge1xuICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIGNiID0gb3B0aW9ucywgb3B0aW9ucyA9IHt9XG4gIGlmICghb3B0aW9ucykgb3B0aW9ucyA9IHt9XG5cbiAgaWYgKG9wdGlvbnMuc3luYykge1xuICAgIGlmIChjYilcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2NhbGxiYWNrIHByb3ZpZGVkIHRvIHN5bmMgZ2xvYicpXG4gICAgcmV0dXJuIGdsb2JTeW5jKHBhdHRlcm4sIG9wdGlvbnMpXG4gIH1cblxuICByZXR1cm4gbmV3IEdsb2IocGF0dGVybiwgb3B0aW9ucywgY2IpXG59XG5cbmdsb2Iuc3luYyA9IGdsb2JTeW5jXG52YXIgR2xvYlN5bmMgPSBnbG9iLkdsb2JTeW5jID0gZ2xvYlN5bmMuR2xvYlN5bmNcblxuLy8gb2xkIGFwaSBzdXJmYWNlXG5nbG9iLmdsb2IgPSBnbG9iXG5cbmZ1bmN0aW9uIGV4dGVuZCAob3JpZ2luLCBhZGQpIHtcbiAgaWYgKGFkZCA9PT0gbnVsbCB8fCB0eXBlb2YgYWRkICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiBvcmlnaW5cbiAgfVxuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKVxuICB2YXIgaSA9IGtleXMubGVuZ3RoXG4gIHdoaWxlIChpLS0pIHtcbiAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV1cbiAgfVxuICByZXR1cm4gb3JpZ2luXG59XG5cbmdsb2IuaGFzTWFnaWMgPSBmdW5jdGlvbiAocGF0dGVybiwgb3B0aW9uc18pIHtcbiAgdmFyIG9wdGlvbnMgPSBleHRlbmQoe30sIG9wdGlvbnNfKVxuICBvcHRpb25zLm5vcHJvY2VzcyA9IHRydWVcblxuICB2YXIgZyA9IG5ldyBHbG9iKHBhdHRlcm4sIG9wdGlvbnMpXG4gIHZhciBzZXQgPSBnLm1pbmltYXRjaC5zZXRcblxuICBpZiAoIXBhdHRlcm4pXG4gICAgcmV0dXJuIGZhbHNlXG5cbiAgaWYgKHNldC5sZW5ndGggPiAxKVxuICAgIHJldHVybiB0cnVlXG5cbiAgZm9yICh2YXIgaiA9IDA7IGogPCBzZXRbMF0ubGVuZ3RoOyBqKyspIHtcbiAgICBpZiAodHlwZW9mIHNldFswXVtqXSAhPT0gJ3N0cmluZycpXG4gICAgICByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlXG59XG5cbmdsb2IuR2xvYiA9IEdsb2JcbmluaGVyaXRzKEdsb2IsIEVFKVxuZnVuY3Rpb24gR2xvYiAocGF0dGVybiwgb3B0aW9ucywgY2IpIHtcbiAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2IgPSBvcHRpb25zXG4gICAgb3B0aW9ucyA9IG51bGxcbiAgfVxuXG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMuc3luYykge1xuICAgIGlmIChjYilcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2NhbGxiYWNrIHByb3ZpZGVkIHRvIHN5bmMgZ2xvYicpXG4gICAgcmV0dXJuIG5ldyBHbG9iU3luYyhwYXR0ZXJuLCBvcHRpb25zKVxuICB9XG5cbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEdsb2IpKVxuICAgIHJldHVybiBuZXcgR2xvYihwYXR0ZXJuLCBvcHRpb25zLCBjYilcblxuICBzZXRvcHRzKHRoaXMsIHBhdHRlcm4sIG9wdGlvbnMpXG4gIHRoaXMuX2RpZFJlYWxQYXRoID0gZmFsc2VcblxuICAvLyBwcm9jZXNzIGVhY2ggcGF0dGVybiBpbiB0aGUgbWluaW1hdGNoIHNldFxuICB2YXIgbiA9IHRoaXMubWluaW1hdGNoLnNldC5sZW5ndGhcblxuICAvLyBUaGUgbWF0Y2hlcyBhcmUgc3RvcmVkIGFzIHs8ZmlsZW5hbWU+OiB0cnVlLC4uLn0gc28gdGhhdFxuICAvLyBkdXBsaWNhdGVzIGFyZSBhdXRvbWFnaWNhbGx5IHBydW5lZC5cbiAgLy8gTGF0ZXIsIHdlIGRvIGFuIE9iamVjdC5rZXlzKCkgb24gdGhlc2UuXG4gIC8vIEtlZXAgdGhlbSBhcyBhIGxpc3Qgc28gd2UgY2FuIGZpbGwgaW4gd2hlbiBub251bGwgaXMgc2V0LlxuICB0aGlzLm1hdGNoZXMgPSBuZXcgQXJyYXkobilcblxuICBpZiAodHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2IgPSBvbmNlKGNiKVxuICAgIHRoaXMub24oJ2Vycm9yJywgY2IpXG4gICAgdGhpcy5vbignZW5kJywgZnVuY3Rpb24gKG1hdGNoZXMpIHtcbiAgICAgIGNiKG51bGwsIG1hdGNoZXMpXG4gICAgfSlcbiAgfVxuXG4gIHZhciBzZWxmID0gdGhpc1xuICB0aGlzLl9wcm9jZXNzaW5nID0gMFxuXG4gIHRoaXMuX2VtaXRRdWV1ZSA9IFtdXG4gIHRoaXMuX3Byb2Nlc3NRdWV1ZSA9IFtdXG4gIHRoaXMucGF1c2VkID0gZmFsc2VcblxuICBpZiAodGhpcy5ub3Byb2Nlc3MpXG4gICAgcmV0dXJuIHRoaXNcblxuICBpZiAobiA9PT0gMClcbiAgICByZXR1cm4gZG9uZSgpXG5cbiAgdmFyIHN5bmMgPSB0cnVlXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSArKykge1xuICAgIHRoaXMuX3Byb2Nlc3ModGhpcy5taW5pbWF0Y2guc2V0W2ldLCBpLCBmYWxzZSwgZG9uZSlcbiAgfVxuICBzeW5jID0gZmFsc2VcblxuICBmdW5jdGlvbiBkb25lICgpIHtcbiAgICAtLXNlbGYuX3Byb2Nlc3NpbmdcbiAgICBpZiAoc2VsZi5fcHJvY2Vzc2luZyA8PSAwKSB7XG4gICAgICBpZiAoc3luYykge1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBzZWxmLl9maW5pc2goKVxuICAgICAgICB9KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5fZmluaXNoKClcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuR2xvYi5wcm90b3R5cGUuX2ZpbmlzaCA9IGZ1bmN0aW9uICgpIHtcbiAgYXNzZXJ0KHRoaXMgaW5zdGFuY2VvZiBHbG9iKVxuICBpZiAodGhpcy5hYm9ydGVkKVxuICAgIHJldHVyblxuXG4gIGlmICh0aGlzLnJlYWxwYXRoICYmICF0aGlzLl9kaWRSZWFscGF0aClcbiAgICByZXR1cm4gdGhpcy5fcmVhbHBhdGgoKVxuXG4gIGNvbW1vbi5maW5pc2godGhpcylcbiAgdGhpcy5lbWl0KCdlbmQnLCB0aGlzLmZvdW5kKVxufVxuXG5HbG9iLnByb3RvdHlwZS5fcmVhbHBhdGggPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLl9kaWRSZWFscGF0aClcbiAgICByZXR1cm5cblxuICB0aGlzLl9kaWRSZWFscGF0aCA9IHRydWVcblxuICB2YXIgbiA9IHRoaXMubWF0Y2hlcy5sZW5ndGhcbiAgaWYgKG4gPT09IDApXG4gICAgcmV0dXJuIHRoaXMuX2ZpbmlzaCgpXG5cbiAgdmFyIHNlbGYgPSB0aGlzXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5tYXRjaGVzLmxlbmd0aDsgaSsrKVxuICAgIHRoaXMuX3JlYWxwYXRoU2V0KGksIG5leHQpXG5cbiAgZnVuY3Rpb24gbmV4dCAoKSB7XG4gICAgaWYgKC0tbiA9PT0gMClcbiAgICAgIHNlbGYuX2ZpbmlzaCgpXG4gIH1cbn1cblxuR2xvYi5wcm90b3R5cGUuX3JlYWxwYXRoU2V0ID0gZnVuY3Rpb24gKGluZGV4LCBjYikge1xuICB2YXIgbWF0Y2hzZXQgPSB0aGlzLm1hdGNoZXNbaW5kZXhdXG4gIGlmICghbWF0Y2hzZXQpXG4gICAgcmV0dXJuIGNiKClcblxuICB2YXIgZm91bmQgPSBPYmplY3Qua2V5cyhtYXRjaHNldClcbiAgdmFyIHNlbGYgPSB0aGlzXG4gIHZhciBuID0gZm91bmQubGVuZ3RoXG5cbiAgaWYgKG4gPT09IDApXG4gICAgcmV0dXJuIGNiKClcblxuICB2YXIgc2V0ID0gdGhpcy5tYXRjaGVzW2luZGV4XSA9IE9iamVjdC5jcmVhdGUobnVsbClcbiAgZm91bmQuZm9yRWFjaChmdW5jdGlvbiAocCwgaSkge1xuICAgIC8vIElmIHRoZXJlJ3MgYSBwcm9ibGVtIHdpdGggdGhlIHN0YXQsIHRoZW4gaXQgbWVhbnMgdGhhdFxuICAgIC8vIG9uZSBvciBtb3JlIG9mIHRoZSBsaW5rcyBpbiB0aGUgcmVhbHBhdGggY291bGRuJ3QgYmVcbiAgICAvLyByZXNvbHZlZC4gIGp1c3QgcmV0dXJuIHRoZSBhYnMgdmFsdWUgaW4gdGhhdCBjYXNlLlxuICAgIHAgPSBzZWxmLl9tYWtlQWJzKHApXG4gICAgcnAucmVhbHBhdGgocCwgc2VsZi5yZWFscGF0aENhY2hlLCBmdW5jdGlvbiAoZXIsIHJlYWwpIHtcbiAgICAgIGlmICghZXIpXG4gICAgICAgIHNldFtyZWFsXSA9IHRydWVcbiAgICAgIGVsc2UgaWYgKGVyLnN5c2NhbGwgPT09ICdzdGF0JylcbiAgICAgICAgc2V0W3BdID0gdHJ1ZVxuICAgICAgZWxzZVxuICAgICAgICBzZWxmLmVtaXQoJ2Vycm9yJywgZXIpIC8vIHNyc2x5IHd0ZiByaWdodCBoZXJlXG5cbiAgICAgIGlmICgtLW4gPT09IDApIHtcbiAgICAgICAgc2VsZi5tYXRjaGVzW2luZGV4XSA9IHNldFxuICAgICAgICBjYigpXG4gICAgICB9XG4gICAgfSlcbiAgfSlcbn1cblxuR2xvYi5wcm90b3R5cGUuX21hcmsgPSBmdW5jdGlvbiAocCkge1xuICByZXR1cm4gY29tbW9uLm1hcmsodGhpcywgcClcbn1cblxuR2xvYi5wcm90b3R5cGUuX21ha2VBYnMgPSBmdW5jdGlvbiAoZikge1xuICByZXR1cm4gY29tbW9uLm1ha2VBYnModGhpcywgZilcbn1cblxuR2xvYi5wcm90b3R5cGUuYWJvcnQgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuYWJvcnRlZCA9IHRydWVcbiAgdGhpcy5lbWl0KCdhYm9ydCcpXG59XG5cbkdsb2IucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24gKCkge1xuICBpZiAoIXRoaXMucGF1c2VkKSB7XG4gICAgdGhpcy5wYXVzZWQgPSB0cnVlXG4gICAgdGhpcy5lbWl0KCdwYXVzZScpXG4gIH1cbn1cblxuR2xvYi5wcm90b3R5cGUucmVzdW1lID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5wYXVzZWQpIHtcbiAgICB0aGlzLmVtaXQoJ3Jlc3VtZScpXG4gICAgdGhpcy5wYXVzZWQgPSBmYWxzZVxuICAgIGlmICh0aGlzLl9lbWl0UXVldWUubGVuZ3RoKSB7XG4gICAgICB2YXIgZXEgPSB0aGlzLl9lbWl0UXVldWUuc2xpY2UoMClcbiAgICAgIHRoaXMuX2VtaXRRdWV1ZS5sZW5ndGggPSAwXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVxLmxlbmd0aDsgaSArKykge1xuICAgICAgICB2YXIgZSA9IGVxW2ldXG4gICAgICAgIHRoaXMuX2VtaXRNYXRjaChlWzBdLCBlWzFdKVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAodGhpcy5fcHJvY2Vzc1F1ZXVlLmxlbmd0aCkge1xuICAgICAgdmFyIHBxID0gdGhpcy5fcHJvY2Vzc1F1ZXVlLnNsaWNlKDApXG4gICAgICB0aGlzLl9wcm9jZXNzUXVldWUubGVuZ3RoID0gMFxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcS5sZW5ndGg7IGkgKyspIHtcbiAgICAgICAgdmFyIHAgPSBwcVtpXVxuICAgICAgICB0aGlzLl9wcm9jZXNzaW5nLS1cbiAgICAgICAgdGhpcy5fcHJvY2VzcyhwWzBdLCBwWzFdLCBwWzJdLCBwWzNdKVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5HbG9iLnByb3RvdHlwZS5fcHJvY2VzcyA9IGZ1bmN0aW9uIChwYXR0ZXJuLCBpbmRleCwgaW5HbG9iU3RhciwgY2IpIHtcbiAgYXNzZXJ0KHRoaXMgaW5zdGFuY2VvZiBHbG9iKVxuICBhc3NlcnQodHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKVxuXG4gIGlmICh0aGlzLmFib3J0ZWQpXG4gICAgcmV0dXJuXG5cbiAgdGhpcy5fcHJvY2Vzc2luZysrXG4gIGlmICh0aGlzLnBhdXNlZCkge1xuICAgIHRoaXMuX3Byb2Nlc3NRdWV1ZS5wdXNoKFtwYXR0ZXJuLCBpbmRleCwgaW5HbG9iU3RhciwgY2JdKVxuICAgIHJldHVyblxuICB9XG5cbiAgLy9jb25zb2xlLmVycm9yKCdQUk9DRVNTICVkJywgdGhpcy5fcHJvY2Vzc2luZywgcGF0dGVybilcblxuICAvLyBHZXQgdGhlIGZpcnN0IFtuXSBwYXJ0cyBvZiBwYXR0ZXJuIHRoYXQgYXJlIGFsbCBzdHJpbmdzLlxuICB2YXIgbiA9IDBcbiAgd2hpbGUgKHR5cGVvZiBwYXR0ZXJuW25dID09PSAnc3RyaW5nJykge1xuICAgIG4gKytcbiAgfVxuICAvLyBub3cgbiBpcyB0aGUgaW5kZXggb2YgdGhlIGZpcnN0IG9uZSB0aGF0IGlzICpub3QqIGEgc3RyaW5nLlxuXG4gIC8vIHNlZSBpZiB0aGVyZSdzIGFueXRoaW5nIGVsc2VcbiAgdmFyIHByZWZpeFxuICBzd2l0Y2ggKG4pIHtcbiAgICAvLyBpZiBub3QsIHRoZW4gdGhpcyBpcyByYXRoZXIgc2ltcGxlXG4gICAgY2FzZSBwYXR0ZXJuLmxlbmd0aDpcbiAgICAgIHRoaXMuX3Byb2Nlc3NTaW1wbGUocGF0dGVybi5qb2luKCcvJyksIGluZGV4LCBjYilcbiAgICAgIHJldHVyblxuXG4gICAgY2FzZSAwOlxuICAgICAgLy8gcGF0dGVybiAqc3RhcnRzKiB3aXRoIHNvbWUgbm9uLXRyaXZpYWwgaXRlbS5cbiAgICAgIC8vIGdvaW5nIHRvIHJlYWRkaXIoY3dkKSwgYnV0IG5vdCBpbmNsdWRlIHRoZSBwcmVmaXggaW4gbWF0Y2hlcy5cbiAgICAgIHByZWZpeCA9IG51bGxcbiAgICAgIGJyZWFrXG5cbiAgICBkZWZhdWx0OlxuICAgICAgLy8gcGF0dGVybiBoYXMgc29tZSBzdHJpbmcgYml0cyBpbiB0aGUgZnJvbnQuXG4gICAgICAvLyB3aGF0ZXZlciBpdCBzdGFydHMgd2l0aCwgd2hldGhlciB0aGF0J3MgJ2Fic29sdXRlJyBsaWtlIC9mb28vYmFyLFxuICAgICAgLy8gb3IgJ3JlbGF0aXZlJyBsaWtlICcuLi9iYXonXG4gICAgICBwcmVmaXggPSBwYXR0ZXJuLnNsaWNlKDAsIG4pLmpvaW4oJy8nKVxuICAgICAgYnJlYWtcbiAgfVxuXG4gIHZhciByZW1haW4gPSBwYXR0ZXJuLnNsaWNlKG4pXG5cbiAgLy8gZ2V0IHRoZSBsaXN0IG9mIGVudHJpZXMuXG4gIHZhciByZWFkXG4gIGlmIChwcmVmaXggPT09IG51bGwpXG4gICAgcmVhZCA9ICcuJ1xuICBlbHNlIGlmIChpc0Fic29sdXRlKHByZWZpeCkgfHwgaXNBYnNvbHV0ZShwYXR0ZXJuLmpvaW4oJy8nKSkpIHtcbiAgICBpZiAoIXByZWZpeCB8fCAhaXNBYnNvbHV0ZShwcmVmaXgpKVxuICAgICAgcHJlZml4ID0gJy8nICsgcHJlZml4XG4gICAgcmVhZCA9IHByZWZpeFxuICB9IGVsc2VcbiAgICByZWFkID0gcHJlZml4XG5cbiAgdmFyIGFicyA9IHRoaXMuX21ha2VBYnMocmVhZClcblxuICAvL2lmIGlnbm9yZWQsIHNraXAgX3Byb2Nlc3NpbmdcbiAgaWYgKGNoaWxkcmVuSWdub3JlZCh0aGlzLCByZWFkKSlcbiAgICByZXR1cm4gY2IoKVxuXG4gIHZhciBpc0dsb2JTdGFyID0gcmVtYWluWzBdID09PSBtaW5pbWF0Y2guR0xPQlNUQVJcbiAgaWYgKGlzR2xvYlN0YXIpXG4gICAgdGhpcy5fcHJvY2Vzc0dsb2JTdGFyKHByZWZpeCwgcmVhZCwgYWJzLCByZW1haW4sIGluZGV4LCBpbkdsb2JTdGFyLCBjYilcbiAgZWxzZVxuICAgIHRoaXMuX3Byb2Nlc3NSZWFkZGlyKHByZWZpeCwgcmVhZCwgYWJzLCByZW1haW4sIGluZGV4LCBpbkdsb2JTdGFyLCBjYilcbn1cblxuR2xvYi5wcm90b3R5cGUuX3Byb2Nlc3NSZWFkZGlyID0gZnVuY3Rpb24gKHByZWZpeCwgcmVhZCwgYWJzLCByZW1haW4sIGluZGV4LCBpbkdsb2JTdGFyLCBjYikge1xuICB2YXIgc2VsZiA9IHRoaXNcbiAgdGhpcy5fcmVhZGRpcihhYnMsIGluR2xvYlN0YXIsIGZ1bmN0aW9uIChlciwgZW50cmllcykge1xuICAgIHJldHVybiBzZWxmLl9wcm9jZXNzUmVhZGRpcjIocHJlZml4LCByZWFkLCBhYnMsIHJlbWFpbiwgaW5kZXgsIGluR2xvYlN0YXIsIGVudHJpZXMsIGNiKVxuICB9KVxufVxuXG5HbG9iLnByb3RvdHlwZS5fcHJvY2Vzc1JlYWRkaXIyID0gZnVuY3Rpb24gKHByZWZpeCwgcmVhZCwgYWJzLCByZW1haW4sIGluZGV4LCBpbkdsb2JTdGFyLCBlbnRyaWVzLCBjYikge1xuXG4gIC8vIGlmIHRoZSBhYnMgaXNuJ3QgYSBkaXIsIHRoZW4gbm90aGluZyBjYW4gbWF0Y2ghXG4gIGlmICghZW50cmllcylcbiAgICByZXR1cm4gY2IoKVxuXG4gIC8vIEl0IHdpbGwgb25seSBtYXRjaCBkb3QgZW50cmllcyBpZiBpdCBzdGFydHMgd2l0aCBhIGRvdCwgb3IgaWZcbiAgLy8gZG90IGlzIHNldC4gIFN0dWZmIGxpa2UgQCguZm9vfC5iYXIpIGlzbid0IGFsbG93ZWQuXG4gIHZhciBwbiA9IHJlbWFpblswXVxuICB2YXIgbmVnYXRlID0gISF0aGlzLm1pbmltYXRjaC5uZWdhdGVcbiAgdmFyIHJhd0dsb2IgPSBwbi5fZ2xvYlxuICB2YXIgZG90T2sgPSB0aGlzLmRvdCB8fCByYXdHbG9iLmNoYXJBdCgwKSA9PT0gJy4nXG5cbiAgdmFyIG1hdGNoZWRFbnRyaWVzID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbnRyaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGUgPSBlbnRyaWVzW2ldXG4gICAgaWYgKGUuY2hhckF0KDApICE9PSAnLicgfHwgZG90T2spIHtcbiAgICAgIHZhciBtXG4gICAgICBpZiAobmVnYXRlICYmICFwcmVmaXgpIHtcbiAgICAgICAgbSA9ICFlLm1hdGNoKHBuKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbSA9IGUubWF0Y2gocG4pXG4gICAgICB9XG4gICAgICBpZiAobSlcbiAgICAgICAgbWF0Y2hlZEVudHJpZXMucHVzaChlKVxuICAgIH1cbiAgfVxuXG4gIC8vY29uc29sZS5lcnJvcigncHJkMicsIHByZWZpeCwgZW50cmllcywgcmVtYWluWzBdLl9nbG9iLCBtYXRjaGVkRW50cmllcylcblxuICB2YXIgbGVuID0gbWF0Y2hlZEVudHJpZXMubGVuZ3RoXG4gIC8vIElmIHRoZXJlIGFyZSBubyBtYXRjaGVkIGVudHJpZXMsIHRoZW4gbm90aGluZyBtYXRjaGVzLlxuICBpZiAobGVuID09PSAwKVxuICAgIHJldHVybiBjYigpXG5cbiAgLy8gaWYgdGhpcyBpcyB0aGUgbGFzdCByZW1haW5pbmcgcGF0dGVybiBiaXQsIHRoZW4gbm8gbmVlZCBmb3JcbiAgLy8gYW4gYWRkaXRpb25hbCBzdGF0ICp1bmxlc3MqIHRoZSB1c2VyIGhhcyBzcGVjaWZpZWQgbWFyayBvclxuICAvLyBzdGF0IGV4cGxpY2l0bHkuICBXZSBrbm93IHRoZXkgZXhpc3QsIHNpbmNlIHJlYWRkaXIgcmV0dXJuZWRcbiAgLy8gdGhlbS5cblxuICBpZiAocmVtYWluLmxlbmd0aCA9PT0gMSAmJiAhdGhpcy5tYXJrICYmICF0aGlzLnN0YXQpIHtcbiAgICBpZiAoIXRoaXMubWF0Y2hlc1tpbmRleF0pXG4gICAgICB0aGlzLm1hdGNoZXNbaW5kZXhdID0gT2JqZWN0LmNyZWF0ZShudWxsKVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKyspIHtcbiAgICAgIHZhciBlID0gbWF0Y2hlZEVudHJpZXNbaV1cbiAgICAgIGlmIChwcmVmaXgpIHtcbiAgICAgICAgaWYgKHByZWZpeCAhPT0gJy8nKVxuICAgICAgICAgIGUgPSBwcmVmaXggKyAnLycgKyBlXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBlID0gcHJlZml4ICsgZVxuICAgICAgfVxuXG4gICAgICBpZiAoZS5jaGFyQXQoMCkgPT09ICcvJyAmJiAhdGhpcy5ub21vdW50KSB7XG4gICAgICAgIGUgPSBwYXRoLmpvaW4odGhpcy5yb290LCBlKVxuICAgICAgfVxuICAgICAgdGhpcy5fZW1pdE1hdGNoKGluZGV4LCBlKVxuICAgIH1cbiAgICAvLyBUaGlzIHdhcyB0aGUgbGFzdCBvbmUsIGFuZCBubyBzdGF0cyB3ZXJlIG5lZWRlZFxuICAgIHJldHVybiBjYigpXG4gIH1cblxuICAvLyBub3cgdGVzdCBhbGwgbWF0Y2hlZCBlbnRyaWVzIGFzIHN0YW5kLWlucyBmb3IgdGhhdCBwYXJ0XG4gIC8vIG9mIHRoZSBwYXR0ZXJuLlxuICByZW1haW4uc2hpZnQoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArKykge1xuICAgIHZhciBlID0gbWF0Y2hlZEVudHJpZXNbaV1cbiAgICB2YXIgbmV3UGF0dGVyblxuICAgIGlmIChwcmVmaXgpIHtcbiAgICAgIGlmIChwcmVmaXggIT09ICcvJylcbiAgICAgICAgZSA9IHByZWZpeCArICcvJyArIGVcbiAgICAgIGVsc2VcbiAgICAgICAgZSA9IHByZWZpeCArIGVcbiAgICB9XG4gICAgdGhpcy5fcHJvY2VzcyhbZV0uY29uY2F0KHJlbWFpbiksIGluZGV4LCBpbkdsb2JTdGFyLCBjYilcbiAgfVxuICBjYigpXG59XG5cbkdsb2IucHJvdG90eXBlLl9lbWl0TWF0Y2ggPSBmdW5jdGlvbiAoaW5kZXgsIGUpIHtcbiAgaWYgKHRoaXMuYWJvcnRlZClcbiAgICByZXR1cm5cblxuICBpZiAoaXNJZ25vcmVkKHRoaXMsIGUpKVxuICAgIHJldHVyblxuXG4gIGlmICh0aGlzLnBhdXNlZCkge1xuICAgIHRoaXMuX2VtaXRRdWV1ZS5wdXNoKFtpbmRleCwgZV0pXG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgYWJzID0gaXNBYnNvbHV0ZShlKSA/IGUgOiB0aGlzLl9tYWtlQWJzKGUpXG5cbiAgaWYgKHRoaXMubWFyaylcbiAgICBlID0gdGhpcy5fbWFyayhlKVxuXG4gIGlmICh0aGlzLmFic29sdXRlKVxuICAgIGUgPSBhYnNcblxuICBpZiAodGhpcy5tYXRjaGVzW2luZGV4XVtlXSlcbiAgICByZXR1cm5cblxuICBpZiAodGhpcy5ub2Rpcikge1xuICAgIHZhciBjID0gdGhpcy5jYWNoZVthYnNdXG4gICAgaWYgKGMgPT09ICdESVInIHx8IEFycmF5LmlzQXJyYXkoYykpXG4gICAgICByZXR1cm5cbiAgfVxuXG4gIHRoaXMubWF0Y2hlc1tpbmRleF1bZV0gPSB0cnVlXG5cbiAgdmFyIHN0ID0gdGhpcy5zdGF0Q2FjaGVbYWJzXVxuICBpZiAoc3QpXG4gICAgdGhpcy5lbWl0KCdzdGF0JywgZSwgc3QpXG5cbiAgdGhpcy5lbWl0KCdtYXRjaCcsIGUpXG59XG5cbkdsb2IucHJvdG90eXBlLl9yZWFkZGlySW5HbG9iU3RhciA9IGZ1bmN0aW9uIChhYnMsIGNiKSB7XG4gIGlmICh0aGlzLmFib3J0ZWQpXG4gICAgcmV0dXJuXG5cbiAgLy8gZm9sbG93IGFsbCBzeW1saW5rZWQgZGlyZWN0b3JpZXMgZm9yZXZlclxuICAvLyBqdXN0IHByb2NlZWQgYXMgaWYgdGhpcyBpcyBhIG5vbi1nbG9ic3RhciBzaXR1YXRpb25cbiAgaWYgKHRoaXMuZm9sbG93KVxuICAgIHJldHVybiB0aGlzLl9yZWFkZGlyKGFicywgZmFsc2UsIGNiKVxuXG4gIHZhciBsc3RhdGtleSA9ICdsc3RhdFxcMCcgKyBhYnNcbiAgdmFyIHNlbGYgPSB0aGlzXG4gIHZhciBsc3RhdGNiID0gaW5mbGlnaHQobHN0YXRrZXksIGxzdGF0Y2JfKVxuXG4gIGlmIChsc3RhdGNiKVxuICAgIHNlbGYuZnMubHN0YXQoYWJzLCBsc3RhdGNiKVxuXG4gIGZ1bmN0aW9uIGxzdGF0Y2JfIChlciwgbHN0YXQpIHtcbiAgICBpZiAoZXIgJiYgZXIuY29kZSA9PT0gJ0VOT0VOVCcpXG4gICAgICByZXR1cm4gY2IoKVxuXG4gICAgdmFyIGlzU3ltID0gbHN0YXQgJiYgbHN0YXQuaXNTeW1ib2xpY0xpbmsoKVxuICAgIHNlbGYuc3ltbGlua3NbYWJzXSA9IGlzU3ltXG5cbiAgICAvLyBJZiBpdCdzIG5vdCBhIHN5bWxpbmsgb3IgYSBkaXIsIHRoZW4gaXQncyBkZWZpbml0ZWx5IGEgcmVndWxhciBmaWxlLlxuICAgIC8vIGRvbid0IGJvdGhlciBkb2luZyBhIHJlYWRkaXIgaW4gdGhhdCBjYXNlLlxuICAgIGlmICghaXNTeW0gJiYgbHN0YXQgJiYgIWxzdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgIHNlbGYuY2FjaGVbYWJzXSA9ICdGSUxFJ1xuICAgICAgY2IoKVxuICAgIH0gZWxzZVxuICAgICAgc2VsZi5fcmVhZGRpcihhYnMsIGZhbHNlLCBjYilcbiAgfVxufVxuXG5HbG9iLnByb3RvdHlwZS5fcmVhZGRpciA9IGZ1bmN0aW9uIChhYnMsIGluR2xvYlN0YXIsIGNiKSB7XG4gIGlmICh0aGlzLmFib3J0ZWQpXG4gICAgcmV0dXJuXG5cbiAgY2IgPSBpbmZsaWdodCgncmVhZGRpclxcMCcrYWJzKydcXDAnK2luR2xvYlN0YXIsIGNiKVxuICBpZiAoIWNiKVxuICAgIHJldHVyblxuXG4gIC8vY29uc29sZS5lcnJvcignUkQgJWogJWonLCAraW5HbG9iU3RhciwgYWJzKVxuICBpZiAoaW5HbG9iU3RhciAmJiAhb3duUHJvcCh0aGlzLnN5bWxpbmtzLCBhYnMpKVxuICAgIHJldHVybiB0aGlzLl9yZWFkZGlySW5HbG9iU3RhcihhYnMsIGNiKVxuXG4gIGlmIChvd25Qcm9wKHRoaXMuY2FjaGUsIGFicykpIHtcbiAgICB2YXIgYyA9IHRoaXMuY2FjaGVbYWJzXVxuICAgIGlmICghYyB8fCBjID09PSAnRklMRScpXG4gICAgICByZXR1cm4gY2IoKVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYykpXG4gICAgICByZXR1cm4gY2IobnVsbCwgYylcbiAgfVxuXG4gIHZhciBzZWxmID0gdGhpc1xuICBzZWxmLmZzLnJlYWRkaXIoYWJzLCByZWFkZGlyQ2IodGhpcywgYWJzLCBjYikpXG59XG5cbmZ1bmN0aW9uIHJlYWRkaXJDYiAoc2VsZiwgYWJzLCBjYikge1xuICByZXR1cm4gZnVuY3Rpb24gKGVyLCBlbnRyaWVzKSB7XG4gICAgaWYgKGVyKVxuICAgICAgc2VsZi5fcmVhZGRpckVycm9yKGFicywgZXIsIGNiKVxuICAgIGVsc2VcbiAgICAgIHNlbGYuX3JlYWRkaXJFbnRyaWVzKGFicywgZW50cmllcywgY2IpXG4gIH1cbn1cblxuR2xvYi5wcm90b3R5cGUuX3JlYWRkaXJFbnRyaWVzID0gZnVuY3Rpb24gKGFicywgZW50cmllcywgY2IpIHtcbiAgaWYgKHRoaXMuYWJvcnRlZClcbiAgICByZXR1cm5cblxuICAvLyBpZiB3ZSBoYXZlbid0IGFza2VkIHRvIHN0YXQgZXZlcnl0aGluZywgdGhlbiBqdXN0XG4gIC8vIGFzc3VtZSB0aGF0IGV2ZXJ5dGhpbmcgaW4gdGhlcmUgZXhpc3RzLCBzbyB3ZSBjYW4gYXZvaWRcbiAgLy8gaGF2aW5nIHRvIHN0YXQgaXQgYSBzZWNvbmQgdGltZS5cbiAgaWYgKCF0aGlzLm1hcmsgJiYgIXRoaXMuc3RhdCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZW50cmllcy5sZW5ndGg7IGkgKyspIHtcbiAgICAgIHZhciBlID0gZW50cmllc1tpXVxuICAgICAgaWYgKGFicyA9PT0gJy8nKVxuICAgICAgICBlID0gYWJzICsgZVxuICAgICAgZWxzZVxuICAgICAgICBlID0gYWJzICsgJy8nICsgZVxuICAgICAgdGhpcy5jYWNoZVtlXSA9IHRydWVcbiAgICB9XG4gIH1cblxuICB0aGlzLmNhY2hlW2Fic10gPSBlbnRyaWVzXG4gIHJldHVybiBjYihudWxsLCBlbnRyaWVzKVxufVxuXG5HbG9iLnByb3RvdHlwZS5fcmVhZGRpckVycm9yID0gZnVuY3Rpb24gKGYsIGVyLCBjYikge1xuICBpZiAodGhpcy5hYm9ydGVkKVxuICAgIHJldHVyblxuXG4gIC8vIGhhbmRsZSBlcnJvcnMsIGFuZCBjYWNoZSB0aGUgaW5mb3JtYXRpb25cbiAgc3dpdGNoIChlci5jb2RlKSB7XG4gICAgY2FzZSAnRU5PVFNVUCc6IC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9pc2FhY3Mvbm9kZS1nbG9iL2lzc3Vlcy8yMDVcbiAgICBjYXNlICdFTk9URElSJzogLy8gdG90YWxseSBub3JtYWwuIG1lYW5zIGl0ICpkb2VzKiBleGlzdC5cbiAgICAgIHZhciBhYnMgPSB0aGlzLl9tYWtlQWJzKGYpXG4gICAgICB0aGlzLmNhY2hlW2Fic10gPSAnRklMRSdcbiAgICAgIGlmIChhYnMgPT09IHRoaXMuY3dkQWJzKSB7XG4gICAgICAgIHZhciBlcnJvciA9IG5ldyBFcnJvcihlci5jb2RlICsgJyBpbnZhbGlkIGN3ZCAnICsgdGhpcy5jd2QpXG4gICAgICAgIGVycm9yLnBhdGggPSB0aGlzLmN3ZFxuICAgICAgICBlcnJvci5jb2RlID0gZXIuY29kZVxuICAgICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyb3IpXG4gICAgICAgIHRoaXMuYWJvcnQoKVxuICAgICAgfVxuICAgICAgYnJlYWtcblxuICAgIGNhc2UgJ0VOT0VOVCc6IC8vIG5vdCB0ZXJyaWJseSB1bnVzdWFsXG4gICAgY2FzZSAnRUxPT1AnOlxuICAgIGNhc2UgJ0VOQU1FVE9PTE9ORyc6XG4gICAgY2FzZSAnVU5LTk9XTic6XG4gICAgICB0aGlzLmNhY2hlW3RoaXMuX21ha2VBYnMoZildID0gZmFsc2VcbiAgICAgIGJyZWFrXG5cbiAgICBkZWZhdWx0OiAvLyBzb21lIHVudXN1YWwgZXJyb3IuICBUcmVhdCBhcyBmYWlsdXJlLlxuICAgICAgdGhpcy5jYWNoZVt0aGlzLl9tYWtlQWJzKGYpXSA9IGZhbHNlXG4gICAgICBpZiAodGhpcy5zdHJpY3QpIHtcbiAgICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIGVyKVxuICAgICAgICAvLyBJZiB0aGUgZXJyb3IgaXMgaGFuZGxlZCwgdGhlbiB3ZSBhYm9ydFxuICAgICAgICAvLyBpZiBub3QsIHdlIHRocmV3IG91dCBvZiBoZXJlXG4gICAgICAgIHRoaXMuYWJvcnQoKVxuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLnNpbGVudClcbiAgICAgICAgY29uc29sZS5lcnJvcignZ2xvYiBlcnJvcicsIGVyKVxuICAgICAgYnJlYWtcbiAgfVxuXG4gIHJldHVybiBjYigpXG59XG5cbkdsb2IucHJvdG90eXBlLl9wcm9jZXNzR2xvYlN0YXIgPSBmdW5jdGlvbiAocHJlZml4LCByZWFkLCBhYnMsIHJlbWFpbiwgaW5kZXgsIGluR2xvYlN0YXIsIGNiKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuICB0aGlzLl9yZWFkZGlyKGFicywgaW5HbG9iU3RhciwgZnVuY3Rpb24gKGVyLCBlbnRyaWVzKSB7XG4gICAgc2VsZi5fcHJvY2Vzc0dsb2JTdGFyMihwcmVmaXgsIHJlYWQsIGFicywgcmVtYWluLCBpbmRleCwgaW5HbG9iU3RhciwgZW50cmllcywgY2IpXG4gIH0pXG59XG5cblxuR2xvYi5wcm90b3R5cGUuX3Byb2Nlc3NHbG9iU3RhcjIgPSBmdW5jdGlvbiAocHJlZml4LCByZWFkLCBhYnMsIHJlbWFpbiwgaW5kZXgsIGluR2xvYlN0YXIsIGVudHJpZXMsIGNiKSB7XG4gIC8vY29uc29sZS5lcnJvcigncGdzMicsIHByZWZpeCwgcmVtYWluWzBdLCBlbnRyaWVzKVxuXG4gIC8vIG5vIGVudHJpZXMgbWVhbnMgbm90IGEgZGlyLCBzbyBpdCBjYW4gbmV2ZXIgaGF2ZSBtYXRjaGVzXG4gIC8vIGZvby50eHQvKiogZG9lc24ndCBtYXRjaCBmb28udHh0XG4gIGlmICghZW50cmllcylcbiAgICByZXR1cm4gY2IoKVxuXG4gIC8vIHRlc3Qgd2l0aG91dCB0aGUgZ2xvYnN0YXIsIGFuZCB3aXRoIGV2ZXJ5IGNoaWxkIGJvdGggYmVsb3dcbiAgLy8gYW5kIHJlcGxhY2luZyB0aGUgZ2xvYnN0YXIuXG4gIHZhciByZW1haW5XaXRob3V0R2xvYlN0YXIgPSByZW1haW4uc2xpY2UoMSlcbiAgdmFyIGdzcHJlZiA9IHByZWZpeCA/IFsgcHJlZml4IF0gOiBbXVxuICB2YXIgbm9HbG9iU3RhciA9IGdzcHJlZi5jb25jYXQocmVtYWluV2l0aG91dEdsb2JTdGFyKVxuXG4gIC8vIHRoZSBub0dsb2JTdGFyIHBhdHRlcm4gZXhpdHMgdGhlIGluR2xvYlN0YXIgc3RhdGVcbiAgdGhpcy5fcHJvY2Vzcyhub0dsb2JTdGFyLCBpbmRleCwgZmFsc2UsIGNiKVxuXG4gIHZhciBpc1N5bSA9IHRoaXMuc3ltbGlua3NbYWJzXVxuICB2YXIgbGVuID0gZW50cmllcy5sZW5ndGhcblxuICAvLyBJZiBpdCdzIGEgc3ltbGluaywgYW5kIHdlJ3JlIGluIGEgZ2xvYnN0YXIsIHRoZW4gc3RvcFxuICBpZiAoaXNTeW0gJiYgaW5HbG9iU3RhcilcbiAgICByZXR1cm4gY2IoKVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICB2YXIgZSA9IGVudHJpZXNbaV1cbiAgICBpZiAoZS5jaGFyQXQoMCkgPT09ICcuJyAmJiAhdGhpcy5kb3QpXG4gICAgICBjb250aW51ZVxuXG4gICAgLy8gdGhlc2UgdHdvIGNhc2VzIGVudGVyIHRoZSBpbkdsb2JTdGFyIHN0YXRlXG4gICAgdmFyIGluc3RlYWQgPSBnc3ByZWYuY29uY2F0KGVudHJpZXNbaV0sIHJlbWFpbldpdGhvdXRHbG9iU3RhcilcbiAgICB0aGlzLl9wcm9jZXNzKGluc3RlYWQsIGluZGV4LCB0cnVlLCBjYilcblxuICAgIHZhciBiZWxvdyA9IGdzcHJlZi5jb25jYXQoZW50cmllc1tpXSwgcmVtYWluKVxuICAgIHRoaXMuX3Byb2Nlc3MoYmVsb3csIGluZGV4LCB0cnVlLCBjYilcbiAgfVxuXG4gIGNiKClcbn1cblxuR2xvYi5wcm90b3R5cGUuX3Byb2Nlc3NTaW1wbGUgPSBmdW5jdGlvbiAocHJlZml4LCBpbmRleCwgY2IpIHtcbiAgLy8gWFhYIHJldmlldyB0aGlzLiAgU2hvdWxkbid0IGl0IGJlIGRvaW5nIHRoZSBtb3VudGluZyBldGNcbiAgLy8gYmVmb3JlIGRvaW5nIHN0YXQ/ICBraW5kYSB3ZWlyZD9cbiAgdmFyIHNlbGYgPSB0aGlzXG4gIHRoaXMuX3N0YXQocHJlZml4LCBmdW5jdGlvbiAoZXIsIGV4aXN0cykge1xuICAgIHNlbGYuX3Byb2Nlc3NTaW1wbGUyKHByZWZpeCwgaW5kZXgsIGVyLCBleGlzdHMsIGNiKVxuICB9KVxufVxuR2xvYi5wcm90b3R5cGUuX3Byb2Nlc3NTaW1wbGUyID0gZnVuY3Rpb24gKHByZWZpeCwgaW5kZXgsIGVyLCBleGlzdHMsIGNiKSB7XG5cbiAgLy9jb25zb2xlLmVycm9yKCdwczInLCBwcmVmaXgsIGV4aXN0cylcblxuICBpZiAoIXRoaXMubWF0Y2hlc1tpbmRleF0pXG4gICAgdGhpcy5tYXRjaGVzW2luZGV4XSA9IE9iamVjdC5jcmVhdGUobnVsbClcblxuICAvLyBJZiBpdCBkb2Vzbid0IGV4aXN0LCB0aGVuIGp1c3QgbWFyayB0aGUgbGFjayBvZiByZXN1bHRzXG4gIGlmICghZXhpc3RzKVxuICAgIHJldHVybiBjYigpXG5cbiAgaWYgKHByZWZpeCAmJiBpc0Fic29sdXRlKHByZWZpeCkgJiYgIXRoaXMubm9tb3VudCkge1xuICAgIHZhciB0cmFpbCA9IC9bXFwvXFxcXF0kLy50ZXN0KHByZWZpeClcbiAgICBpZiAocHJlZml4LmNoYXJBdCgwKSA9PT0gJy8nKSB7XG4gICAgICBwcmVmaXggPSBwYXRoLmpvaW4odGhpcy5yb290LCBwcmVmaXgpXG4gICAgfSBlbHNlIHtcbiAgICAgIHByZWZpeCA9IHBhdGgucmVzb2x2ZSh0aGlzLnJvb3QsIHByZWZpeClcbiAgICAgIGlmICh0cmFpbClcbiAgICAgICAgcHJlZml4ICs9ICcvJ1xuICAgIH1cbiAgfVxuXG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInKVxuICAgIHByZWZpeCA9IHByZWZpeC5yZXBsYWNlKC9cXFxcL2csICcvJylcblxuICAvLyBNYXJrIHRoaXMgYXMgYSBtYXRjaFxuICB0aGlzLl9lbWl0TWF0Y2goaW5kZXgsIHByZWZpeClcbiAgY2IoKVxufVxuXG4vLyBSZXR1cm5zIGVpdGhlciAnRElSJywgJ0ZJTEUnLCBvciBmYWxzZVxuR2xvYi5wcm90b3R5cGUuX3N0YXQgPSBmdW5jdGlvbiAoZiwgY2IpIHtcbiAgdmFyIGFicyA9IHRoaXMuX21ha2VBYnMoZilcbiAgdmFyIG5lZWREaXIgPSBmLnNsaWNlKC0xKSA9PT0gJy8nXG5cbiAgaWYgKGYubGVuZ3RoID4gdGhpcy5tYXhMZW5ndGgpXG4gICAgcmV0dXJuIGNiKClcblxuICBpZiAoIXRoaXMuc3RhdCAmJiBvd25Qcm9wKHRoaXMuY2FjaGUsIGFicykpIHtcbiAgICB2YXIgYyA9IHRoaXMuY2FjaGVbYWJzXVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYykpXG4gICAgICBjID0gJ0RJUidcblxuICAgIC8vIEl0IGV4aXN0cywgYnV0IG1heWJlIG5vdCBob3cgd2UgbmVlZCBpdFxuICAgIGlmICghbmVlZERpciB8fCBjID09PSAnRElSJylcbiAgICAgIHJldHVybiBjYihudWxsLCBjKVxuXG4gICAgaWYgKG5lZWREaXIgJiYgYyA9PT0gJ0ZJTEUnKVxuICAgICAgcmV0dXJuIGNiKClcblxuICAgIC8vIG90aGVyd2lzZSB3ZSBoYXZlIHRvIHN0YXQsIGJlY2F1c2UgbWF5YmUgYz10cnVlXG4gICAgLy8gaWYgd2Uga25vdyBpdCBleGlzdHMsIGJ1dCBub3Qgd2hhdCBpdCBpcy5cbiAgfVxuXG4gIHZhciBleGlzdHNcbiAgdmFyIHN0YXQgPSB0aGlzLnN0YXRDYWNoZVthYnNdXG4gIGlmIChzdGF0ICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAoc3RhdCA9PT0gZmFsc2UpXG4gICAgICByZXR1cm4gY2IobnVsbCwgc3RhdClcbiAgICBlbHNlIHtcbiAgICAgIHZhciB0eXBlID0gc3RhdC5pc0RpcmVjdG9yeSgpID8gJ0RJUicgOiAnRklMRSdcbiAgICAgIGlmIChuZWVkRGlyICYmIHR5cGUgPT09ICdGSUxFJylcbiAgICAgICAgcmV0dXJuIGNiKClcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIGNiKG51bGwsIHR5cGUsIHN0YXQpXG4gICAgfVxuICB9XG5cbiAgdmFyIHNlbGYgPSB0aGlzXG4gIHZhciBzdGF0Y2IgPSBpbmZsaWdodCgnc3RhdFxcMCcgKyBhYnMsIGxzdGF0Y2JfKVxuICBpZiAoc3RhdGNiKVxuICAgIHNlbGYuZnMubHN0YXQoYWJzLCBzdGF0Y2IpXG5cbiAgZnVuY3Rpb24gbHN0YXRjYl8gKGVyLCBsc3RhdCkge1xuICAgIGlmIChsc3RhdCAmJiBsc3RhdC5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAvLyBJZiBpdCdzIGEgc3ltbGluaywgdGhlbiB0cmVhdCBpdCBhcyB0aGUgdGFyZ2V0LCB1bmxlc3NcbiAgICAgIC8vIHRoZSB0YXJnZXQgZG9lcyBub3QgZXhpc3QsIHRoZW4gdHJlYXQgaXQgYXMgYSBmaWxlLlxuICAgICAgcmV0dXJuIHNlbGYuZnMuc3RhdChhYnMsIGZ1bmN0aW9uIChlciwgc3RhdCkge1xuICAgICAgICBpZiAoZXIpXG4gICAgICAgICAgc2VsZi5fc3RhdDIoZiwgYWJzLCBudWxsLCBsc3RhdCwgY2IpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBzZWxmLl9zdGF0MihmLCBhYnMsIGVyLCBzdGF0LCBjYilcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIHNlbGYuX3N0YXQyKGYsIGFicywgZXIsIGxzdGF0LCBjYilcbiAgICB9XG4gIH1cbn1cblxuR2xvYi5wcm90b3R5cGUuX3N0YXQyID0gZnVuY3Rpb24gKGYsIGFicywgZXIsIHN0YXQsIGNiKSB7XG4gIGlmIChlciAmJiAoZXIuY29kZSA9PT0gJ0VOT0VOVCcgfHwgZXIuY29kZSA9PT0gJ0VOT1RESVInKSkge1xuICAgIHRoaXMuc3RhdENhY2hlW2Fic10gPSBmYWxzZVxuICAgIHJldHVybiBjYigpXG4gIH1cblxuICB2YXIgbmVlZERpciA9IGYuc2xpY2UoLTEpID09PSAnLydcbiAgdGhpcy5zdGF0Q2FjaGVbYWJzXSA9IHN0YXRcblxuICBpZiAoYWJzLnNsaWNlKC0xKSA9PT0gJy8nICYmIHN0YXQgJiYgIXN0YXQuaXNEaXJlY3RvcnkoKSlcbiAgICByZXR1cm4gY2IobnVsbCwgZmFsc2UsIHN0YXQpXG5cbiAgdmFyIGMgPSB0cnVlXG4gIGlmIChzdGF0KVxuICAgIGMgPSBzdGF0LmlzRGlyZWN0b3J5KCkgPyAnRElSJyA6ICdGSUxFJ1xuICB0aGlzLmNhY2hlW2Fic10gPSB0aGlzLmNhY2hlW2Fic10gfHwgY1xuXG4gIGlmIChuZWVkRGlyICYmIGMgPT09ICdGSUxFJylcbiAgICByZXR1cm4gY2IoKVxuXG4gIHJldHVybiBjYihudWxsLCBjLCBzdGF0KVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBnbG9iU3luY1xuZ2xvYlN5bmMuR2xvYlN5bmMgPSBHbG9iU3luY1xuXG52YXIgcnAgPSByZXF1aXJlKCdmcy5yZWFscGF0aCcpXG52YXIgbWluaW1hdGNoID0gcmVxdWlyZSgnbWluaW1hdGNoJylcbnZhciBNaW5pbWF0Y2ggPSBtaW5pbWF0Y2guTWluaW1hdGNoXG52YXIgR2xvYiA9IHJlcXVpcmUoJy4vZ2xvYi5qcycpLkdsb2JcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpXG52YXIgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKVxudmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpXG52YXIgaXNBYnNvbHV0ZSA9IHJlcXVpcmUoJ3BhdGgtaXMtYWJzb2x1dGUnKVxudmFyIGNvbW1vbiA9IHJlcXVpcmUoJy4vY29tbW9uLmpzJylcbnZhciBzZXRvcHRzID0gY29tbW9uLnNldG9wdHNcbnZhciBvd25Qcm9wID0gY29tbW9uLm93blByb3BcbnZhciBjaGlsZHJlbklnbm9yZWQgPSBjb21tb24uY2hpbGRyZW5JZ25vcmVkXG52YXIgaXNJZ25vcmVkID0gY29tbW9uLmlzSWdub3JlZFxuXG5mdW5jdGlvbiBnbG9iU3luYyAocGF0dGVybiwgb3B0aW9ucykge1xuICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicgfHwgYXJndW1lbnRzLmxlbmd0aCA9PT0gMylcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdjYWxsYmFjayBwcm92aWRlZCB0byBzeW5jIGdsb2JcXG4nK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ1NlZTogaHR0cHM6Ly9naXRodWIuY29tL2lzYWFjcy9ub2RlLWdsb2IvaXNzdWVzLzE2NycpXG5cbiAgcmV0dXJuIG5ldyBHbG9iU3luYyhwYXR0ZXJuLCBvcHRpb25zKS5mb3VuZFxufVxuXG5mdW5jdGlvbiBHbG9iU3luYyAocGF0dGVybiwgb3B0aW9ucykge1xuICBpZiAoIXBhdHRlcm4pXG4gICAgdGhyb3cgbmV3IEVycm9yKCdtdXN0IHByb3ZpZGUgcGF0dGVybicpXG5cbiAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nIHx8IGFyZ3VtZW50cy5sZW5ndGggPT09IDMpXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignY2FsbGJhY2sgcHJvdmlkZWQgdG8gc3luYyBnbG9iXFxuJytcbiAgICAgICAgICAgICAgICAgICAgICAgICdTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9pc2FhY3Mvbm9kZS1nbG9iL2lzc3Vlcy8xNjcnKVxuXG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBHbG9iU3luYykpXG4gICAgcmV0dXJuIG5ldyBHbG9iU3luYyhwYXR0ZXJuLCBvcHRpb25zKVxuXG4gIHNldG9wdHModGhpcywgcGF0dGVybiwgb3B0aW9ucylcblxuICBpZiAodGhpcy5ub3Byb2Nlc3MpXG4gICAgcmV0dXJuIHRoaXNcblxuICB2YXIgbiA9IHRoaXMubWluaW1hdGNoLnNldC5sZW5ndGhcbiAgdGhpcy5tYXRjaGVzID0gbmV3IEFycmF5KG4pXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSArKykge1xuICAgIHRoaXMuX3Byb2Nlc3ModGhpcy5taW5pbWF0Y2guc2V0W2ldLCBpLCBmYWxzZSlcbiAgfVxuICB0aGlzLl9maW5pc2goKVxufVxuXG5HbG9iU3luYy5wcm90b3R5cGUuX2ZpbmlzaCA9IGZ1bmN0aW9uICgpIHtcbiAgYXNzZXJ0KHRoaXMgaW5zdGFuY2VvZiBHbG9iU3luYylcbiAgaWYgKHRoaXMucmVhbHBhdGgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICB0aGlzLm1hdGNoZXMuZm9yRWFjaChmdW5jdGlvbiAobWF0Y2hzZXQsIGluZGV4KSB7XG4gICAgICB2YXIgc2V0ID0gc2VsZi5tYXRjaGVzW2luZGV4XSA9IE9iamVjdC5jcmVhdGUobnVsbClcbiAgICAgIGZvciAodmFyIHAgaW4gbWF0Y2hzZXQpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBwID0gc2VsZi5fbWFrZUFicyhwKVxuICAgICAgICAgIHZhciByZWFsID0gcnAucmVhbHBhdGhTeW5jKHAsIHNlbGYucmVhbHBhdGhDYWNoZSlcbiAgICAgICAgICBzZXRbcmVhbF0gPSB0cnVlXG4gICAgICAgIH0gY2F0Y2ggKGVyKSB7XG4gICAgICAgICAgaWYgKGVyLnN5c2NhbGwgPT09ICdzdGF0JylcbiAgICAgICAgICAgIHNldFtzZWxmLl9tYWtlQWJzKHApXSA9IHRydWVcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICB0aHJvdyBlclxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfVxuICBjb21tb24uZmluaXNoKHRoaXMpXG59XG5cblxuR2xvYlN5bmMucHJvdG90eXBlLl9wcm9jZXNzID0gZnVuY3Rpb24gKHBhdHRlcm4sIGluZGV4LCBpbkdsb2JTdGFyKSB7XG4gIGFzc2VydCh0aGlzIGluc3RhbmNlb2YgR2xvYlN5bmMpXG5cbiAgLy8gR2V0IHRoZSBmaXJzdCBbbl0gcGFydHMgb2YgcGF0dGVybiB0aGF0IGFyZSBhbGwgc3RyaW5ncy5cbiAgdmFyIG4gPSAwXG4gIHdoaWxlICh0eXBlb2YgcGF0dGVybltuXSA9PT0gJ3N0cmluZycpIHtcbiAgICBuICsrXG4gIH1cbiAgLy8gbm93IG4gaXMgdGhlIGluZGV4IG9mIHRoZSBmaXJzdCBvbmUgdGhhdCBpcyAqbm90KiBhIHN0cmluZy5cblxuICAvLyBTZWUgaWYgdGhlcmUncyBhbnl0aGluZyBlbHNlXG4gIHZhciBwcmVmaXhcbiAgc3dpdGNoIChuKSB7XG4gICAgLy8gaWYgbm90LCB0aGVuIHRoaXMgaXMgcmF0aGVyIHNpbXBsZVxuICAgIGNhc2UgcGF0dGVybi5sZW5ndGg6XG4gICAgICB0aGlzLl9wcm9jZXNzU2ltcGxlKHBhdHRlcm4uam9pbignLycpLCBpbmRleClcbiAgICAgIHJldHVyblxuXG4gICAgY2FzZSAwOlxuICAgICAgLy8gcGF0dGVybiAqc3RhcnRzKiB3aXRoIHNvbWUgbm9uLXRyaXZpYWwgaXRlbS5cbiAgICAgIC8vIGdvaW5nIHRvIHJlYWRkaXIoY3dkKSwgYnV0IG5vdCBpbmNsdWRlIHRoZSBwcmVmaXggaW4gbWF0Y2hlcy5cbiAgICAgIHByZWZpeCA9IG51bGxcbiAgICAgIGJyZWFrXG5cbiAgICBkZWZhdWx0OlxuICAgICAgLy8gcGF0dGVybiBoYXMgc29tZSBzdHJpbmcgYml0cyBpbiB0aGUgZnJvbnQuXG4gICAgICAvLyB3aGF0ZXZlciBpdCBzdGFydHMgd2l0aCwgd2hldGhlciB0aGF0J3MgJ2Fic29sdXRlJyBsaWtlIC9mb28vYmFyLFxuICAgICAgLy8gb3IgJ3JlbGF0aXZlJyBsaWtlICcuLi9iYXonXG4gICAgICBwcmVmaXggPSBwYXR0ZXJuLnNsaWNlKDAsIG4pLmpvaW4oJy8nKVxuICAgICAgYnJlYWtcbiAgfVxuXG4gIHZhciByZW1haW4gPSBwYXR0ZXJuLnNsaWNlKG4pXG5cbiAgLy8gZ2V0IHRoZSBsaXN0IG9mIGVudHJpZXMuXG4gIHZhciByZWFkXG4gIGlmIChwcmVmaXggPT09IG51bGwpXG4gICAgcmVhZCA9ICcuJ1xuICBlbHNlIGlmIChpc0Fic29sdXRlKHByZWZpeCkgfHwgaXNBYnNvbHV0ZShwYXR0ZXJuLmpvaW4oJy8nKSkpIHtcbiAgICBpZiAoIXByZWZpeCB8fCAhaXNBYnNvbHV0ZShwcmVmaXgpKVxuICAgICAgcHJlZml4ID0gJy8nICsgcHJlZml4XG4gICAgcmVhZCA9IHByZWZpeFxuICB9IGVsc2VcbiAgICByZWFkID0gcHJlZml4XG5cbiAgdmFyIGFicyA9IHRoaXMuX21ha2VBYnMocmVhZClcblxuICAvL2lmIGlnbm9yZWQsIHNraXAgcHJvY2Vzc2luZ1xuICBpZiAoY2hpbGRyZW5JZ25vcmVkKHRoaXMsIHJlYWQpKVxuICAgIHJldHVyblxuXG4gIHZhciBpc0dsb2JTdGFyID0gcmVtYWluWzBdID09PSBtaW5pbWF0Y2guR0xPQlNUQVJcbiAgaWYgKGlzR2xvYlN0YXIpXG4gICAgdGhpcy5fcHJvY2Vzc0dsb2JTdGFyKHByZWZpeCwgcmVhZCwgYWJzLCByZW1haW4sIGluZGV4LCBpbkdsb2JTdGFyKVxuICBlbHNlXG4gICAgdGhpcy5fcHJvY2Vzc1JlYWRkaXIocHJlZml4LCByZWFkLCBhYnMsIHJlbWFpbiwgaW5kZXgsIGluR2xvYlN0YXIpXG59XG5cblxuR2xvYlN5bmMucHJvdG90eXBlLl9wcm9jZXNzUmVhZGRpciA9IGZ1bmN0aW9uIChwcmVmaXgsIHJlYWQsIGFicywgcmVtYWluLCBpbmRleCwgaW5HbG9iU3Rhcikge1xuICB2YXIgZW50cmllcyA9IHRoaXMuX3JlYWRkaXIoYWJzLCBpbkdsb2JTdGFyKVxuXG4gIC8vIGlmIHRoZSBhYnMgaXNuJ3QgYSBkaXIsIHRoZW4gbm90aGluZyBjYW4gbWF0Y2ghXG4gIGlmICghZW50cmllcylcbiAgICByZXR1cm5cblxuICAvLyBJdCB3aWxsIG9ubHkgbWF0Y2ggZG90IGVudHJpZXMgaWYgaXQgc3RhcnRzIHdpdGggYSBkb3QsIG9yIGlmXG4gIC8vIGRvdCBpcyBzZXQuICBTdHVmZiBsaWtlIEAoLmZvb3wuYmFyKSBpc24ndCBhbGxvd2VkLlxuICB2YXIgcG4gPSByZW1haW5bMF1cbiAgdmFyIG5lZ2F0ZSA9ICEhdGhpcy5taW5pbWF0Y2gubmVnYXRlXG4gIHZhciByYXdHbG9iID0gcG4uX2dsb2JcbiAgdmFyIGRvdE9rID0gdGhpcy5kb3QgfHwgcmF3R2xvYi5jaGFyQXQoMCkgPT09ICcuJ1xuXG4gIHZhciBtYXRjaGVkRW50cmllcyA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZW50cmllcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBlID0gZW50cmllc1tpXVxuICAgIGlmIChlLmNoYXJBdCgwKSAhPT0gJy4nIHx8IGRvdE9rKSB7XG4gICAgICB2YXIgbVxuICAgICAgaWYgKG5lZ2F0ZSAmJiAhcHJlZml4KSB7XG4gICAgICAgIG0gPSAhZS5tYXRjaChwbilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG0gPSBlLm1hdGNoKHBuKVxuICAgICAgfVxuICAgICAgaWYgKG0pXG4gICAgICAgIG1hdGNoZWRFbnRyaWVzLnB1c2goZSlcbiAgICB9XG4gIH1cblxuICB2YXIgbGVuID0gbWF0Y2hlZEVudHJpZXMubGVuZ3RoXG4gIC8vIElmIHRoZXJlIGFyZSBubyBtYXRjaGVkIGVudHJpZXMsIHRoZW4gbm90aGluZyBtYXRjaGVzLlxuICBpZiAobGVuID09PSAwKVxuICAgIHJldHVyblxuXG4gIC8vIGlmIHRoaXMgaXMgdGhlIGxhc3QgcmVtYWluaW5nIHBhdHRlcm4gYml0LCB0aGVuIG5vIG5lZWQgZm9yXG4gIC8vIGFuIGFkZGl0aW9uYWwgc3RhdCAqdW5sZXNzKiB0aGUgdXNlciBoYXMgc3BlY2lmaWVkIG1hcmsgb3JcbiAgLy8gc3RhdCBleHBsaWNpdGx5LiAgV2Uga25vdyB0aGV5IGV4aXN0LCBzaW5jZSByZWFkZGlyIHJldHVybmVkXG4gIC8vIHRoZW0uXG5cbiAgaWYgKHJlbWFpbi5sZW5ndGggPT09IDEgJiYgIXRoaXMubWFyayAmJiAhdGhpcy5zdGF0KSB7XG4gICAgaWYgKCF0aGlzLm1hdGNoZXNbaW5kZXhdKVxuICAgICAgdGhpcy5tYXRjaGVzW2luZGV4XSA9IE9iamVjdC5jcmVhdGUobnVsbClcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICsrKSB7XG4gICAgICB2YXIgZSA9IG1hdGNoZWRFbnRyaWVzW2ldXG4gICAgICBpZiAocHJlZml4KSB7XG4gICAgICAgIGlmIChwcmVmaXguc2xpY2UoLTEpICE9PSAnLycpXG4gICAgICAgICAgZSA9IHByZWZpeCArICcvJyArIGVcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGUgPSBwcmVmaXggKyBlXG4gICAgICB9XG5cbiAgICAgIGlmIChlLmNoYXJBdCgwKSA9PT0gJy8nICYmICF0aGlzLm5vbW91bnQpIHtcbiAgICAgICAgZSA9IHBhdGguam9pbih0aGlzLnJvb3QsIGUpXG4gICAgICB9XG4gICAgICB0aGlzLl9lbWl0TWF0Y2goaW5kZXgsIGUpXG4gICAgfVxuICAgIC8vIFRoaXMgd2FzIHRoZSBsYXN0IG9uZSwgYW5kIG5vIHN0YXRzIHdlcmUgbmVlZGVkXG4gICAgcmV0dXJuXG4gIH1cblxuICAvLyBub3cgdGVzdCBhbGwgbWF0Y2hlZCBlbnRyaWVzIGFzIHN0YW5kLWlucyBmb3IgdGhhdCBwYXJ0XG4gIC8vIG9mIHRoZSBwYXR0ZXJuLlxuICByZW1haW4uc2hpZnQoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArKykge1xuICAgIHZhciBlID0gbWF0Y2hlZEVudHJpZXNbaV1cbiAgICB2YXIgbmV3UGF0dGVyblxuICAgIGlmIChwcmVmaXgpXG4gICAgICBuZXdQYXR0ZXJuID0gW3ByZWZpeCwgZV1cbiAgICBlbHNlXG4gICAgICBuZXdQYXR0ZXJuID0gW2VdXG4gICAgdGhpcy5fcHJvY2VzcyhuZXdQYXR0ZXJuLmNvbmNhdChyZW1haW4pLCBpbmRleCwgaW5HbG9iU3RhcilcbiAgfVxufVxuXG5cbkdsb2JTeW5jLnByb3RvdHlwZS5fZW1pdE1hdGNoID0gZnVuY3Rpb24gKGluZGV4LCBlKSB7XG4gIGlmIChpc0lnbm9yZWQodGhpcywgZSkpXG4gICAgcmV0dXJuXG5cbiAgdmFyIGFicyA9IHRoaXMuX21ha2VBYnMoZSlcblxuICBpZiAodGhpcy5tYXJrKVxuICAgIGUgPSB0aGlzLl9tYXJrKGUpXG5cbiAgaWYgKHRoaXMuYWJzb2x1dGUpIHtcbiAgICBlID0gYWJzXG4gIH1cblxuICBpZiAodGhpcy5tYXRjaGVzW2luZGV4XVtlXSlcbiAgICByZXR1cm5cblxuICBpZiAodGhpcy5ub2Rpcikge1xuICAgIHZhciBjID0gdGhpcy5jYWNoZVthYnNdXG4gICAgaWYgKGMgPT09ICdESVInIHx8IEFycmF5LmlzQXJyYXkoYykpXG4gICAgICByZXR1cm5cbiAgfVxuXG4gIHRoaXMubWF0Y2hlc1tpbmRleF1bZV0gPSB0cnVlXG5cbiAgaWYgKHRoaXMuc3RhdClcbiAgICB0aGlzLl9zdGF0KGUpXG59XG5cblxuR2xvYlN5bmMucHJvdG90eXBlLl9yZWFkZGlySW5HbG9iU3RhciA9IGZ1bmN0aW9uIChhYnMpIHtcbiAgLy8gZm9sbG93IGFsbCBzeW1saW5rZWQgZGlyZWN0b3JpZXMgZm9yZXZlclxuICAvLyBqdXN0IHByb2NlZWQgYXMgaWYgdGhpcyBpcyBhIG5vbi1nbG9ic3RhciBzaXR1YXRpb25cbiAgaWYgKHRoaXMuZm9sbG93KVxuICAgIHJldHVybiB0aGlzLl9yZWFkZGlyKGFicywgZmFsc2UpXG5cbiAgdmFyIGVudHJpZXNcbiAgdmFyIGxzdGF0XG4gIHZhciBzdGF0XG4gIHRyeSB7XG4gICAgbHN0YXQgPSB0aGlzLmZzLmxzdGF0U3luYyhhYnMpXG4gIH0gY2F0Y2ggKGVyKSB7XG4gICAgaWYgKGVyLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAvLyBsc3RhdCBmYWlsZWQsIGRvZXNuJ3QgZXhpc3RcbiAgICAgIHJldHVybiBudWxsXG4gICAgfVxuICB9XG5cbiAgdmFyIGlzU3ltID0gbHN0YXQgJiYgbHN0YXQuaXNTeW1ib2xpY0xpbmsoKVxuICB0aGlzLnN5bWxpbmtzW2Fic10gPSBpc1N5bVxuXG4gIC8vIElmIGl0J3Mgbm90IGEgc3ltbGluayBvciBhIGRpciwgdGhlbiBpdCdzIGRlZmluaXRlbHkgYSByZWd1bGFyIGZpbGUuXG4gIC8vIGRvbid0IGJvdGhlciBkb2luZyBhIHJlYWRkaXIgaW4gdGhhdCBjYXNlLlxuICBpZiAoIWlzU3ltICYmIGxzdGF0ICYmICFsc3RhdC5pc0RpcmVjdG9yeSgpKVxuICAgIHRoaXMuY2FjaGVbYWJzXSA9ICdGSUxFJ1xuICBlbHNlXG4gICAgZW50cmllcyA9IHRoaXMuX3JlYWRkaXIoYWJzLCBmYWxzZSlcblxuICByZXR1cm4gZW50cmllc1xufVxuXG5HbG9iU3luYy5wcm90b3R5cGUuX3JlYWRkaXIgPSBmdW5jdGlvbiAoYWJzLCBpbkdsb2JTdGFyKSB7XG4gIHZhciBlbnRyaWVzXG5cbiAgaWYgKGluR2xvYlN0YXIgJiYgIW93blByb3AodGhpcy5zeW1saW5rcywgYWJzKSlcbiAgICByZXR1cm4gdGhpcy5fcmVhZGRpckluR2xvYlN0YXIoYWJzKVxuXG4gIGlmIChvd25Qcm9wKHRoaXMuY2FjaGUsIGFicykpIHtcbiAgICB2YXIgYyA9IHRoaXMuY2FjaGVbYWJzXVxuICAgIGlmICghYyB8fCBjID09PSAnRklMRScpXG4gICAgICByZXR1cm4gbnVsbFxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYykpXG4gICAgICByZXR1cm4gY1xuICB9XG5cbiAgdHJ5IHtcbiAgICByZXR1cm4gdGhpcy5fcmVhZGRpckVudHJpZXMoYWJzLCB0aGlzLmZzLnJlYWRkaXJTeW5jKGFicykpXG4gIH0gY2F0Y2ggKGVyKSB7XG4gICAgdGhpcy5fcmVhZGRpckVycm9yKGFicywgZXIpXG4gICAgcmV0dXJuIG51bGxcbiAgfVxufVxuXG5HbG9iU3luYy5wcm90b3R5cGUuX3JlYWRkaXJFbnRyaWVzID0gZnVuY3Rpb24gKGFicywgZW50cmllcykge1xuICAvLyBpZiB3ZSBoYXZlbid0IGFza2VkIHRvIHN0YXQgZXZlcnl0aGluZywgdGhlbiBqdXN0XG4gIC8vIGFzc3VtZSB0aGF0IGV2ZXJ5dGhpbmcgaW4gdGhlcmUgZXhpc3RzLCBzbyB3ZSBjYW4gYXZvaWRcbiAgLy8gaGF2aW5nIHRvIHN0YXQgaXQgYSBzZWNvbmQgdGltZS5cbiAgaWYgKCF0aGlzLm1hcmsgJiYgIXRoaXMuc3RhdCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZW50cmllcy5sZW5ndGg7IGkgKyspIHtcbiAgICAgIHZhciBlID0gZW50cmllc1tpXVxuICAgICAgaWYgKGFicyA9PT0gJy8nKVxuICAgICAgICBlID0gYWJzICsgZVxuICAgICAgZWxzZVxuICAgICAgICBlID0gYWJzICsgJy8nICsgZVxuICAgICAgdGhpcy5jYWNoZVtlXSA9IHRydWVcbiAgICB9XG4gIH1cblxuICB0aGlzLmNhY2hlW2Fic10gPSBlbnRyaWVzXG5cbiAgLy8gbWFyayBhbmQgY2FjaGUgZGlyLW5lc3NcbiAgcmV0dXJuIGVudHJpZXNcbn1cblxuR2xvYlN5bmMucHJvdG90eXBlLl9yZWFkZGlyRXJyb3IgPSBmdW5jdGlvbiAoZiwgZXIpIHtcbiAgLy8gaGFuZGxlIGVycm9ycywgYW5kIGNhY2hlIHRoZSBpbmZvcm1hdGlvblxuICBzd2l0Y2ggKGVyLmNvZGUpIHtcbiAgICBjYXNlICdFTk9UU1VQJzogLy8gaHR0cHM6Ly9naXRodWIuY29tL2lzYWFjcy9ub2RlLWdsb2IvaXNzdWVzLzIwNVxuICAgIGNhc2UgJ0VOT1RESVInOiAvLyB0b3RhbGx5IG5vcm1hbC4gbWVhbnMgaXQgKmRvZXMqIGV4aXN0LlxuICAgICAgdmFyIGFicyA9IHRoaXMuX21ha2VBYnMoZilcbiAgICAgIHRoaXMuY2FjaGVbYWJzXSA9ICdGSUxFJ1xuICAgICAgaWYgKGFicyA9PT0gdGhpcy5jd2RBYnMpIHtcbiAgICAgICAgdmFyIGVycm9yID0gbmV3IEVycm9yKGVyLmNvZGUgKyAnIGludmFsaWQgY3dkICcgKyB0aGlzLmN3ZClcbiAgICAgICAgZXJyb3IucGF0aCA9IHRoaXMuY3dkXG4gICAgICAgIGVycm9yLmNvZGUgPSBlci5jb2RlXG4gICAgICAgIHRocm93IGVycm9yXG4gICAgICB9XG4gICAgICBicmVha1xuXG4gICAgY2FzZSAnRU5PRU5UJzogLy8gbm90IHRlcnJpYmx5IHVudXN1YWxcbiAgICBjYXNlICdFTE9PUCc6XG4gICAgY2FzZSAnRU5BTUVUT09MT05HJzpcbiAgICBjYXNlICdVTktOT1dOJzpcbiAgICAgIHRoaXMuY2FjaGVbdGhpcy5fbWFrZUFicyhmKV0gPSBmYWxzZVxuICAgICAgYnJlYWtcblxuICAgIGRlZmF1bHQ6IC8vIHNvbWUgdW51c3VhbCBlcnJvci4gIFRyZWF0IGFzIGZhaWx1cmUuXG4gICAgICB0aGlzLmNhY2hlW3RoaXMuX21ha2VBYnMoZildID0gZmFsc2VcbiAgICAgIGlmICh0aGlzLnN0cmljdClcbiAgICAgICAgdGhyb3cgZXJcbiAgICAgIGlmICghdGhpcy5zaWxlbnQpXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ2dsb2IgZXJyb3InLCBlcilcbiAgICAgIGJyZWFrXG4gIH1cbn1cblxuR2xvYlN5bmMucHJvdG90eXBlLl9wcm9jZXNzR2xvYlN0YXIgPSBmdW5jdGlvbiAocHJlZml4LCByZWFkLCBhYnMsIHJlbWFpbiwgaW5kZXgsIGluR2xvYlN0YXIpIHtcblxuICB2YXIgZW50cmllcyA9IHRoaXMuX3JlYWRkaXIoYWJzLCBpbkdsb2JTdGFyKVxuXG4gIC8vIG5vIGVudHJpZXMgbWVhbnMgbm90IGEgZGlyLCBzbyBpdCBjYW4gbmV2ZXIgaGF2ZSBtYXRjaGVzXG4gIC8vIGZvby50eHQvKiogZG9lc24ndCBtYXRjaCBmb28udHh0XG4gIGlmICghZW50cmllcylcbiAgICByZXR1cm5cblxuICAvLyB0ZXN0IHdpdGhvdXQgdGhlIGdsb2JzdGFyLCBhbmQgd2l0aCBldmVyeSBjaGlsZCBib3RoIGJlbG93XG4gIC8vIGFuZCByZXBsYWNpbmcgdGhlIGdsb2JzdGFyLlxuICB2YXIgcmVtYWluV2l0aG91dEdsb2JTdGFyID0gcmVtYWluLnNsaWNlKDEpXG4gIHZhciBnc3ByZWYgPSBwcmVmaXggPyBbIHByZWZpeCBdIDogW11cbiAgdmFyIG5vR2xvYlN0YXIgPSBnc3ByZWYuY29uY2F0KHJlbWFpbldpdGhvdXRHbG9iU3RhcilcblxuICAvLyB0aGUgbm9HbG9iU3RhciBwYXR0ZXJuIGV4aXRzIHRoZSBpbkdsb2JTdGFyIHN0YXRlXG4gIHRoaXMuX3Byb2Nlc3Mobm9HbG9iU3RhciwgaW5kZXgsIGZhbHNlKVxuXG4gIHZhciBsZW4gPSBlbnRyaWVzLmxlbmd0aFxuICB2YXIgaXNTeW0gPSB0aGlzLnN5bWxpbmtzW2Fic11cblxuICAvLyBJZiBpdCdzIGEgc3ltbGluaywgYW5kIHdlJ3JlIGluIGEgZ2xvYnN0YXIsIHRoZW4gc3RvcFxuICBpZiAoaXNTeW0gJiYgaW5HbG9iU3RhcilcbiAgICByZXR1cm5cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgdmFyIGUgPSBlbnRyaWVzW2ldXG4gICAgaWYgKGUuY2hhckF0KDApID09PSAnLicgJiYgIXRoaXMuZG90KVxuICAgICAgY29udGludWVcblxuICAgIC8vIHRoZXNlIHR3byBjYXNlcyBlbnRlciB0aGUgaW5HbG9iU3RhciBzdGF0ZVxuICAgIHZhciBpbnN0ZWFkID0gZ3NwcmVmLmNvbmNhdChlbnRyaWVzW2ldLCByZW1haW5XaXRob3V0R2xvYlN0YXIpXG4gICAgdGhpcy5fcHJvY2VzcyhpbnN0ZWFkLCBpbmRleCwgdHJ1ZSlcblxuICAgIHZhciBiZWxvdyA9IGdzcHJlZi5jb25jYXQoZW50cmllc1tpXSwgcmVtYWluKVxuICAgIHRoaXMuX3Byb2Nlc3MoYmVsb3csIGluZGV4LCB0cnVlKVxuICB9XG59XG5cbkdsb2JTeW5jLnByb3RvdHlwZS5fcHJvY2Vzc1NpbXBsZSA9IGZ1bmN0aW9uIChwcmVmaXgsIGluZGV4KSB7XG4gIC8vIFhYWCByZXZpZXcgdGhpcy4gIFNob3VsZG4ndCBpdCBiZSBkb2luZyB0aGUgbW91bnRpbmcgZXRjXG4gIC8vIGJlZm9yZSBkb2luZyBzdGF0PyAga2luZGEgd2VpcmQ/XG4gIHZhciBleGlzdHMgPSB0aGlzLl9zdGF0KHByZWZpeClcblxuICBpZiAoIXRoaXMubWF0Y2hlc1tpbmRleF0pXG4gICAgdGhpcy5tYXRjaGVzW2luZGV4XSA9IE9iamVjdC5jcmVhdGUobnVsbClcblxuICAvLyBJZiBpdCBkb2Vzbid0IGV4aXN0LCB0aGVuIGp1c3QgbWFyayB0aGUgbGFjayBvZiByZXN1bHRzXG4gIGlmICghZXhpc3RzKVxuICAgIHJldHVyblxuXG4gIGlmIChwcmVmaXggJiYgaXNBYnNvbHV0ZShwcmVmaXgpICYmICF0aGlzLm5vbW91bnQpIHtcbiAgICB2YXIgdHJhaWwgPSAvW1xcL1xcXFxdJC8udGVzdChwcmVmaXgpXG4gICAgaWYgKHByZWZpeC5jaGFyQXQoMCkgPT09ICcvJykge1xuICAgICAgcHJlZml4ID0gcGF0aC5qb2luKHRoaXMucm9vdCwgcHJlZml4KVxuICAgIH0gZWxzZSB7XG4gICAgICBwcmVmaXggPSBwYXRoLnJlc29sdmUodGhpcy5yb290LCBwcmVmaXgpXG4gICAgICBpZiAodHJhaWwpXG4gICAgICAgIHByZWZpeCArPSAnLydcbiAgICB9XG4gIH1cblxuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJylcbiAgICBwcmVmaXggPSBwcmVmaXgucmVwbGFjZSgvXFxcXC9nLCAnLycpXG5cbiAgLy8gTWFyayB0aGlzIGFzIGEgbWF0Y2hcbiAgdGhpcy5fZW1pdE1hdGNoKGluZGV4LCBwcmVmaXgpXG59XG5cbi8vIFJldHVybnMgZWl0aGVyICdESVInLCAnRklMRScsIG9yIGZhbHNlXG5HbG9iU3luYy5wcm90b3R5cGUuX3N0YXQgPSBmdW5jdGlvbiAoZikge1xuICB2YXIgYWJzID0gdGhpcy5fbWFrZUFicyhmKVxuICB2YXIgbmVlZERpciA9IGYuc2xpY2UoLTEpID09PSAnLydcblxuICBpZiAoZi5sZW5ndGggPiB0aGlzLm1heExlbmd0aClcbiAgICByZXR1cm4gZmFsc2VcblxuICBpZiAoIXRoaXMuc3RhdCAmJiBvd25Qcm9wKHRoaXMuY2FjaGUsIGFicykpIHtcbiAgICB2YXIgYyA9IHRoaXMuY2FjaGVbYWJzXVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYykpXG4gICAgICBjID0gJ0RJUidcblxuICAgIC8vIEl0IGV4aXN0cywgYnV0IG1heWJlIG5vdCBob3cgd2UgbmVlZCBpdFxuICAgIGlmICghbmVlZERpciB8fCBjID09PSAnRElSJylcbiAgICAgIHJldHVybiBjXG5cbiAgICBpZiAobmVlZERpciAmJiBjID09PSAnRklMRScpXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgIC8vIG90aGVyd2lzZSB3ZSBoYXZlIHRvIHN0YXQsIGJlY2F1c2UgbWF5YmUgYz10cnVlXG4gICAgLy8gaWYgd2Uga25vdyBpdCBleGlzdHMsIGJ1dCBub3Qgd2hhdCBpdCBpcy5cbiAgfVxuXG4gIHZhciBleGlzdHNcbiAgdmFyIHN0YXQgPSB0aGlzLnN0YXRDYWNoZVthYnNdXG4gIGlmICghc3RhdCkge1xuICAgIHZhciBsc3RhdFxuICAgIHRyeSB7XG4gICAgICBsc3RhdCA9IHRoaXMuZnMubHN0YXRTeW5jKGFicylcbiAgICB9IGNhdGNoIChlcikge1xuICAgICAgaWYgKGVyICYmIChlci5jb2RlID09PSAnRU5PRU5UJyB8fCBlci5jb2RlID09PSAnRU5PVERJUicpKSB7XG4gICAgICAgIHRoaXMuc3RhdENhY2hlW2Fic10gPSBmYWxzZVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobHN0YXQgJiYgbHN0YXQuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgc3RhdCA9IHRoaXMuZnMuc3RhdFN5bmMoYWJzKVxuICAgICAgfSBjYXRjaCAoZXIpIHtcbiAgICAgICAgc3RhdCA9IGxzdGF0XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXQgPSBsc3RhdFxuICAgIH1cbiAgfVxuXG4gIHRoaXMuc3RhdENhY2hlW2Fic10gPSBzdGF0XG5cbiAgdmFyIGMgPSB0cnVlXG4gIGlmIChzdGF0KVxuICAgIGMgPSBzdGF0LmlzRGlyZWN0b3J5KCkgPyAnRElSJyA6ICdGSUxFJ1xuXG4gIHRoaXMuY2FjaGVbYWJzXSA9IHRoaXMuY2FjaGVbYWJzXSB8fCBjXG5cbiAgaWYgKG5lZWREaXIgJiYgYyA9PT0gJ0ZJTEUnKVxuICAgIHJldHVybiBmYWxzZVxuXG4gIHJldHVybiBjXG59XG5cbkdsb2JTeW5jLnByb3RvdHlwZS5fbWFyayA9IGZ1bmN0aW9uIChwKSB7XG4gIHJldHVybiBjb21tb24ubWFyayh0aGlzLCBwKVxufVxuXG5HbG9iU3luYy5wcm90b3R5cGUuX21ha2VBYnMgPSBmdW5jdGlvbiAoZikge1xuICByZXR1cm4gY29tbW9uLm1ha2VBYnModGhpcywgZilcbn1cbiIsInZhciB3cmFwcHkgPSByZXF1aXJlKCd3cmFwcHknKVxudmFyIHJlcXMgPSBPYmplY3QuY3JlYXRlKG51bGwpXG52YXIgb25jZSA9IHJlcXVpcmUoJ29uY2UnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHdyYXBweShpbmZsaWdodClcblxuZnVuY3Rpb24gaW5mbGlnaHQgKGtleSwgY2IpIHtcbiAgaWYgKHJlcXNba2V5XSkge1xuICAgIHJlcXNba2V5XS5wdXNoKGNiKVxuICAgIHJldHVybiBudWxsXG4gIH0gZWxzZSB7XG4gICAgcmVxc1trZXldID0gW2NiXVxuICAgIHJldHVybiBtYWtlcmVzKGtleSlcbiAgfVxufVxuXG5mdW5jdGlvbiBtYWtlcmVzIChrZXkpIHtcbiAgcmV0dXJuIG9uY2UoZnVuY3Rpb24gUkVTICgpIHtcbiAgICB2YXIgY2JzID0gcmVxc1trZXldXG4gICAgdmFyIGxlbiA9IGNicy5sZW5ndGhcbiAgICB2YXIgYXJncyA9IHNsaWNlKGFyZ3VtZW50cylcblxuICAgIC8vIFhYWCBJdCdzIHNvbWV3aGF0IGFtYmlndW91cyB3aGV0aGVyIGEgbmV3IGNhbGxiYWNrIGFkZGVkIGluIHRoaXNcbiAgICAvLyBwYXNzIHNob3VsZCBiZSBxdWV1ZWQgZm9yIGxhdGVyIGV4ZWN1dGlvbiBpZiBzb21ldGhpbmcgaW4gdGhlXG4gICAgLy8gbGlzdCBvZiBjYWxsYmFja3MgdGhyb3dzLCBvciBpZiBpdCBzaG91bGQganVzdCBiZSBkaXNjYXJkZWQuXG4gICAgLy8gSG93ZXZlciwgaXQncyBzdWNoIGFuIGVkZ2UgY2FzZSB0aGF0IGl0IGhhcmRseSBtYXR0ZXJzLCBhbmQgZWl0aGVyXG4gICAgLy8gY2hvaWNlIGlzIGxpa2VseSBhcyBzdXJwcmlzaW5nIGFzIHRoZSBvdGhlci5cbiAgICAvLyBBcyBpdCBoYXBwZW5zLCB3ZSBkbyBnbyBhaGVhZCBhbmQgc2NoZWR1bGUgaXQgZm9yIGxhdGVyIGV4ZWN1dGlvbi5cbiAgICB0cnkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBjYnNbaV0uYXBwbHkobnVsbCwgYXJncylcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgaWYgKGNicy5sZW5ndGggPiBsZW4pIHtcbiAgICAgICAgLy8gYWRkZWQgbW9yZSBpbiB0aGUgaW50ZXJpbS5cbiAgICAgICAgLy8gZGUtemFsZ28sIGp1c3QgaW4gY2FzZSwgYnV0IGRvbid0IGNhbGwgYWdhaW4uXG4gICAgICAgIGNicy5zcGxpY2UoMCwgbGVuKVxuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBSRVMuYXBwbHkobnVsbCwgYXJncylcbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlbGV0ZSByZXFzW2tleV1cbiAgICAgIH1cbiAgICB9XG4gIH0pXG59XG5cbmZ1bmN0aW9uIHNsaWNlIChhcmdzKSB7XG4gIHZhciBsZW5ndGggPSBhcmdzLmxlbmd0aFxuICB2YXIgYXJyYXkgPSBbXVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIGFycmF5W2ldID0gYXJnc1tpXVxuICByZXR1cm4gYXJyYXlcbn1cbiIsInRyeSB7XG4gIHZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICBpZiAodHlwZW9mIHV0aWwuaW5oZXJpdHMgIT09ICdmdW5jdGlvbicpIHRocm93ICcnO1xuICBtb2R1bGUuZXhwb3J0cyA9IHV0aWwuaW5oZXJpdHM7XG59IGNhdGNoIChlKSB7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gIG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9pbmhlcml0c19icm93c2VyLmpzJyk7XG59XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBpZiAoc3VwZXJDdG9yKSB7XG4gICAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGlmIChzdXBlckN0b3IpIHtcbiAgICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gICAgfVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKGFycikge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGFycikgPT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gTWF0Y2g7XG5cbnZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKCdzdHJlYW0nKS5UcmFuc2Zvcm07XG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwidXRpbFwiKS5pbmhlcml0cztcbnZhciBCdWZmZXJzID0gcmVxdWlyZSgnYnVmZmVycycpO1xuXG5pZiAoIVRyYW5zZm9ybSkge1xuICBUcmFuc2Zvcm0gPSByZXF1aXJlKCdyZWFkYWJsZS1zdHJlYW0vdHJhbnNmb3JtJyk7XG59XG5cbmluaGVyaXRzKE1hdGNoLCBUcmFuc2Zvcm0pO1xuXG5mdW5jdGlvbiBNYXRjaChvcHRzLCBtYXRjaEZuKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBNYXRjaCkpIHtcbiAgICByZXR1cm4gbmV3IE1hdGNoKG9wdHMsIG1hdGNoRm4pO1xuICB9XG5cbiAgLy90b2RvIC0gYmV0dGVyIGhhbmRsZSBvcHRzIGUuZy4gcGF0dGVybi5sZW5ndGggY2FuJ3QgYmUgPiBoaWdoV2F0ZXJNYXJrXG4gIHRoaXMuX29wdHMgPSBvcHRzO1xuICBpZiAodHlwZW9mIHRoaXMuX29wdHMucGF0dGVybiA9PT0gXCJzdHJpbmdcIikge1xuICAgIHRoaXMuX29wdHMucGF0dGVybiA9IG5ldyBCdWZmZXIodGhpcy5fb3B0cy5wYXR0ZXJuKTtcbiAgfVxuICB0aGlzLl9tYXRjaEZuID0gbWF0Y2hGbjtcbiAgdGhpcy5fYnVmcyA9IEJ1ZmZlcnMoKTtcblxuICBUcmFuc2Zvcm0uY2FsbCh0aGlzKTtcbn1cblxuTWF0Y2gucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbiAoY2h1bmssIGVuY29kaW5nLCBjYWxsYmFjaykge1xuICB2YXIgcGF0dGVybiA9IHRoaXMuX29wdHMucGF0dGVybjtcbiAgdGhpcy5fYnVmcy5wdXNoKGNodW5rKTtcblxuICB2YXIgaW5kZXggPSB0aGlzLl9idWZzLmluZGV4T2YocGF0dGVybik7XG4gIGlmIChpbmRleCA+PSAwKSB7XG4gICAgcHJvY2Vzc01hdGNoZXMuY2FsbCh0aGlzLCBpbmRleCwgcGF0dGVybiwgY2FsbGJhY2spO1xuICB9IGVsc2Uge1xuICAgIHZhciBidWYgPSB0aGlzLl9idWZzLnNwbGljZSgwLCB0aGlzLl9idWZzLmxlbmd0aCAtIGNodW5rLmxlbmd0aCk7XG4gICAgaWYgKGJ1ZiAmJiBidWYubGVuZ3RoID4gMCkge1xuICAgICAgdGhpcy5fbWF0Y2hGbihidWYudG9CdWZmZXIoKSk7XG4gICAgfVxuICAgIGNhbGxiYWNrKCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHByb2Nlc3NNYXRjaGVzKGluZGV4LCBwYXR0ZXJuLCBjYWxsYmFjaykge1xuICB2YXIgYnVmID0gdGhpcy5fYnVmcy5zcGxpY2UoMCwgaW5kZXgpLnRvQnVmZmVyKCk7XG4gIGlmICh0aGlzLl9vcHRzLmNvbnN1bWUpIHtcbiAgICB0aGlzLl9idWZzLnNwbGljZSgwLCBwYXR0ZXJuLmxlbmd0aCk7XG4gIH1cbiAgdGhpcy5fbWF0Y2hGbihidWYsIHBhdHRlcm4sIHRoaXMuX2J1ZnMudG9CdWZmZXIoKSk7XG5cbiAgaW5kZXggPSB0aGlzLl9idWZzLmluZGV4T2YocGF0dGVybik7XG4gIGlmIChpbmRleCA+IDAgfHwgdGhpcy5fb3B0cy5jb25zdW1lICYmIGluZGV4ID09PSAwKSB7XG4gICAgcHJvY2Vzcy5uZXh0VGljayhwcm9jZXNzTWF0Y2hlcy5iaW5kKHRoaXMsIGluZGV4LCBwYXR0ZXJuLCBjYWxsYmFjaykpO1xuICB9IGVsc2Uge1xuICAgIGNhbGxiYWNrKCk7XG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gbWluaW1hdGNoXG5taW5pbWF0Y2guTWluaW1hdGNoID0gTWluaW1hdGNoXG5cbnZhciBwYXRoID0geyBzZXA6ICcvJyB9XG50cnkge1xuICBwYXRoID0gcmVxdWlyZSgncGF0aCcpXG59IGNhdGNoIChlcikge31cblxudmFyIEdMT0JTVEFSID0gbWluaW1hdGNoLkdMT0JTVEFSID0gTWluaW1hdGNoLkdMT0JTVEFSID0ge31cbnZhciBleHBhbmQgPSByZXF1aXJlKCdicmFjZS1leHBhbnNpb24nKVxuXG52YXIgcGxUeXBlcyA9IHtcbiAgJyEnOiB7IG9wZW46ICcoPzooPyEoPzonLCBjbG9zZTogJykpW14vXSo/KSd9LFxuICAnPyc6IHsgb3BlbjogJyg/OicsIGNsb3NlOiAnKT8nIH0sXG4gICcrJzogeyBvcGVuOiAnKD86JywgY2xvc2U6ICcpKycgfSxcbiAgJyonOiB7IG9wZW46ICcoPzonLCBjbG9zZTogJykqJyB9LFxuICAnQCc6IHsgb3BlbjogJyg/OicsIGNsb3NlOiAnKScgfVxufVxuXG4vLyBhbnkgc2luZ2xlIHRoaW5nIG90aGVyIHRoYW4gL1xuLy8gZG9uJ3QgbmVlZCB0byBlc2NhcGUgLyB3aGVuIHVzaW5nIG5ldyBSZWdFeHAoKVxudmFyIHFtYXJrID0gJ1teL10nXG5cbi8vICogPT4gYW55IG51bWJlciBvZiBjaGFyYWN0ZXJzXG52YXIgc3RhciA9IHFtYXJrICsgJyo/J1xuXG4vLyAqKiB3aGVuIGRvdHMgYXJlIGFsbG93ZWQuICBBbnl0aGluZyBnb2VzLCBleGNlcHQgLi4gYW5kIC5cbi8vIG5vdCAoXiBvciAvIGZvbGxvd2VkIGJ5IG9uZSBvciB0d28gZG90cyBmb2xsb3dlZCBieSAkIG9yIC8pLFxuLy8gZm9sbG93ZWQgYnkgYW55dGhpbmcsIGFueSBudW1iZXIgb2YgdGltZXMuXG52YXIgdHdvU3RhckRvdCA9ICcoPzooPyEoPzpcXFxcXFwvfF4pKD86XFxcXC57MSwyfSkoJHxcXFxcXFwvKSkuKSo/J1xuXG4vLyBub3QgYSBeIG9yIC8gZm9sbG93ZWQgYnkgYSBkb3QsXG4vLyBmb2xsb3dlZCBieSBhbnl0aGluZywgYW55IG51bWJlciBvZiB0aW1lcy5cbnZhciB0d29TdGFyTm9Eb3QgPSAnKD86KD8hKD86XFxcXFxcL3xeKVxcXFwuKS4pKj8nXG5cbi8vIGNoYXJhY3RlcnMgdGhhdCBuZWVkIHRvIGJlIGVzY2FwZWQgaW4gUmVnRXhwLlxudmFyIHJlU3BlY2lhbHMgPSBjaGFyU2V0KCcoKS4qe30rP1tdXiRcXFxcIScpXG5cbi8vIFwiYWJjXCIgLT4geyBhOnRydWUsIGI6dHJ1ZSwgYzp0cnVlIH1cbmZ1bmN0aW9uIGNoYXJTZXQgKHMpIHtcbiAgcmV0dXJuIHMuc3BsaXQoJycpLnJlZHVjZShmdW5jdGlvbiAoc2V0LCBjKSB7XG4gICAgc2V0W2NdID0gdHJ1ZVxuICAgIHJldHVybiBzZXRcbiAgfSwge30pXG59XG5cbi8vIG5vcm1hbGl6ZXMgc2xhc2hlcy5cbnZhciBzbGFzaFNwbGl0ID0gL1xcLysvXG5cbm1pbmltYXRjaC5maWx0ZXIgPSBmaWx0ZXJcbmZ1bmN0aW9uIGZpbHRlciAocGF0dGVybiwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICByZXR1cm4gZnVuY3Rpb24gKHAsIGksIGxpc3QpIHtcbiAgICByZXR1cm4gbWluaW1hdGNoKHAsIHBhdHRlcm4sIG9wdGlvbnMpXG4gIH1cbn1cblxuZnVuY3Rpb24gZXh0IChhLCBiKSB7XG4gIGEgPSBhIHx8IHt9XG4gIGIgPSBiIHx8IHt9XG4gIHZhciB0ID0ge31cbiAgT2JqZWN0LmtleXMoYikuZm9yRWFjaChmdW5jdGlvbiAoaykge1xuICAgIHRba10gPSBiW2tdXG4gIH0pXG4gIE9iamVjdC5rZXlzKGEpLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICB0W2tdID0gYVtrXVxuICB9KVxuICByZXR1cm4gdFxufVxuXG5taW5pbWF0Y2guZGVmYXVsdHMgPSBmdW5jdGlvbiAoZGVmKSB7XG4gIGlmICghZGVmIHx8ICFPYmplY3Qua2V5cyhkZWYpLmxlbmd0aCkgcmV0dXJuIG1pbmltYXRjaFxuXG4gIHZhciBvcmlnID0gbWluaW1hdGNoXG5cbiAgdmFyIG0gPSBmdW5jdGlvbiBtaW5pbWF0Y2ggKHAsIHBhdHRlcm4sIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gb3JpZy5taW5pbWF0Y2gocCwgcGF0dGVybiwgZXh0KGRlZiwgb3B0aW9ucykpXG4gIH1cblxuICBtLk1pbmltYXRjaCA9IGZ1bmN0aW9uIE1pbmltYXRjaCAocGF0dGVybiwgb3B0aW9ucykge1xuICAgIHJldHVybiBuZXcgb3JpZy5NaW5pbWF0Y2gocGF0dGVybiwgZXh0KGRlZiwgb3B0aW9ucykpXG4gIH1cblxuICByZXR1cm4gbVxufVxuXG5NaW5pbWF0Y2guZGVmYXVsdHMgPSBmdW5jdGlvbiAoZGVmKSB7XG4gIGlmICghZGVmIHx8ICFPYmplY3Qua2V5cyhkZWYpLmxlbmd0aCkgcmV0dXJuIE1pbmltYXRjaFxuICByZXR1cm4gbWluaW1hdGNoLmRlZmF1bHRzKGRlZikuTWluaW1hdGNoXG59XG5cbmZ1bmN0aW9uIG1pbmltYXRjaCAocCwgcGF0dGVybiwgb3B0aW9ucykge1xuICBpZiAodHlwZW9mIHBhdHRlcm4gIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZ2xvYiBwYXR0ZXJuIHN0cmluZyByZXF1aXJlZCcpXG4gIH1cblxuICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fVxuXG4gIC8vIHNob3J0Y3V0OiBjb21tZW50cyBtYXRjaCBub3RoaW5nLlxuICBpZiAoIW9wdGlvbnMubm9jb21tZW50ICYmIHBhdHRlcm4uY2hhckF0KDApID09PSAnIycpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIC8vIFwiXCIgb25seSBtYXRjaGVzIFwiXCJcbiAgaWYgKHBhdHRlcm4udHJpbSgpID09PSAnJykgcmV0dXJuIHAgPT09ICcnXG5cbiAgcmV0dXJuIG5ldyBNaW5pbWF0Y2gocGF0dGVybiwgb3B0aW9ucykubWF0Y2gocClcbn1cblxuZnVuY3Rpb24gTWluaW1hdGNoIChwYXR0ZXJuLCBvcHRpb25zKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBNaW5pbWF0Y2gpKSB7XG4gICAgcmV0dXJuIG5ldyBNaW5pbWF0Y2gocGF0dGVybiwgb3B0aW9ucylcbiAgfVxuXG4gIGlmICh0eXBlb2YgcGF0dGVybiAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdnbG9iIHBhdHRlcm4gc3RyaW5nIHJlcXVpcmVkJylcbiAgfVxuXG4gIGlmICghb3B0aW9ucykgb3B0aW9ucyA9IHt9XG4gIHBhdHRlcm4gPSBwYXR0ZXJuLnRyaW0oKVxuXG4gIC8vIHdpbmRvd3Mgc3VwcG9ydDogbmVlZCB0byB1c2UgLywgbm90IFxcXG4gIGlmIChwYXRoLnNlcCAhPT0gJy8nKSB7XG4gICAgcGF0dGVybiA9IHBhdHRlcm4uc3BsaXQocGF0aC5zZXApLmpvaW4oJy8nKVxuICB9XG5cbiAgdGhpcy5vcHRpb25zID0gb3B0aW9uc1xuICB0aGlzLnNldCA9IFtdXG4gIHRoaXMucGF0dGVybiA9IHBhdHRlcm5cbiAgdGhpcy5yZWdleHAgPSBudWxsXG4gIHRoaXMubmVnYXRlID0gZmFsc2VcbiAgdGhpcy5jb21tZW50ID0gZmFsc2VcbiAgdGhpcy5lbXB0eSA9IGZhbHNlXG5cbiAgLy8gbWFrZSB0aGUgc2V0IG9mIHJlZ2V4cHMgZXRjLlxuICB0aGlzLm1ha2UoKVxufVxuXG5NaW5pbWF0Y2gucHJvdG90eXBlLmRlYnVnID0gZnVuY3Rpb24gKCkge31cblxuTWluaW1hdGNoLnByb3RvdHlwZS5tYWtlID0gbWFrZVxuZnVuY3Rpb24gbWFrZSAoKSB7XG4gIC8vIGRvbid0IGRvIGl0IG1vcmUgdGhhbiBvbmNlLlxuICBpZiAodGhpcy5fbWFkZSkgcmV0dXJuXG5cbiAgdmFyIHBhdHRlcm4gPSB0aGlzLnBhdHRlcm5cbiAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnNcblxuICAvLyBlbXB0eSBwYXR0ZXJucyBhbmQgY29tbWVudHMgbWF0Y2ggbm90aGluZy5cbiAgaWYgKCFvcHRpb25zLm5vY29tbWVudCAmJiBwYXR0ZXJuLmNoYXJBdCgwKSA9PT0gJyMnKSB7XG4gICAgdGhpcy5jb21tZW50ID0gdHJ1ZVxuICAgIHJldHVyblxuICB9XG4gIGlmICghcGF0dGVybikge1xuICAgIHRoaXMuZW1wdHkgPSB0cnVlXG4gICAgcmV0dXJuXG4gIH1cblxuICAvLyBzdGVwIDE6IGZpZ3VyZSBvdXQgbmVnYXRpb24sIGV0Yy5cbiAgdGhpcy5wYXJzZU5lZ2F0ZSgpXG5cbiAgLy8gc3RlcCAyOiBleHBhbmQgYnJhY2VzXG4gIHZhciBzZXQgPSB0aGlzLmdsb2JTZXQgPSB0aGlzLmJyYWNlRXhwYW5kKClcblxuICBpZiAob3B0aW9ucy5kZWJ1ZykgdGhpcy5kZWJ1ZyA9IGNvbnNvbGUuZXJyb3JcblxuICB0aGlzLmRlYnVnKHRoaXMucGF0dGVybiwgc2V0KVxuXG4gIC8vIHN0ZXAgMzogbm93IHdlIGhhdmUgYSBzZXQsIHNvIHR1cm4gZWFjaCBvbmUgaW50byBhIHNlcmllcyBvZiBwYXRoLXBvcnRpb25cbiAgLy8gbWF0Y2hpbmcgcGF0dGVybnMuXG4gIC8vIFRoZXNlIHdpbGwgYmUgcmVnZXhwcywgZXhjZXB0IGluIHRoZSBjYXNlIG9mIFwiKipcIiwgd2hpY2ggaXNcbiAgLy8gc2V0IHRvIHRoZSBHTE9CU1RBUiBvYmplY3QgZm9yIGdsb2JzdGFyIGJlaGF2aW9yLFxuICAvLyBhbmQgd2lsbCBub3QgY29udGFpbiBhbnkgLyBjaGFyYWN0ZXJzXG4gIHNldCA9IHRoaXMuZ2xvYlBhcnRzID0gc2V0Lm1hcChmdW5jdGlvbiAocykge1xuICAgIHJldHVybiBzLnNwbGl0KHNsYXNoU3BsaXQpXG4gIH0pXG5cbiAgdGhpcy5kZWJ1Zyh0aGlzLnBhdHRlcm4sIHNldClcblxuICAvLyBnbG9iIC0tPiByZWdleHBzXG4gIHNldCA9IHNldC5tYXAoZnVuY3Rpb24gKHMsIHNpLCBzZXQpIHtcbiAgICByZXR1cm4gcy5tYXAodGhpcy5wYXJzZSwgdGhpcylcbiAgfSwgdGhpcylcblxuICB0aGlzLmRlYnVnKHRoaXMucGF0dGVybiwgc2V0KVxuXG4gIC8vIGZpbHRlciBvdXQgZXZlcnl0aGluZyB0aGF0IGRpZG4ndCBjb21waWxlIHByb3Blcmx5LlxuICBzZXQgPSBzZXQuZmlsdGVyKGZ1bmN0aW9uIChzKSB7XG4gICAgcmV0dXJuIHMuaW5kZXhPZihmYWxzZSkgPT09IC0xXG4gIH0pXG5cbiAgdGhpcy5kZWJ1Zyh0aGlzLnBhdHRlcm4sIHNldClcblxuICB0aGlzLnNldCA9IHNldFxufVxuXG5NaW5pbWF0Y2gucHJvdG90eXBlLnBhcnNlTmVnYXRlID0gcGFyc2VOZWdhdGVcbmZ1bmN0aW9uIHBhcnNlTmVnYXRlICgpIHtcbiAgdmFyIHBhdHRlcm4gPSB0aGlzLnBhdHRlcm5cbiAgdmFyIG5lZ2F0ZSA9IGZhbHNlXG4gIHZhciBvcHRpb25zID0gdGhpcy5vcHRpb25zXG4gIHZhciBuZWdhdGVPZmZzZXQgPSAwXG5cbiAgaWYgKG9wdGlvbnMubm9uZWdhdGUpIHJldHVyblxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gcGF0dGVybi5sZW5ndGhcbiAgICA7IGkgPCBsICYmIHBhdHRlcm4uY2hhckF0KGkpID09PSAnISdcbiAgICA7IGkrKykge1xuICAgIG5lZ2F0ZSA9ICFuZWdhdGVcbiAgICBuZWdhdGVPZmZzZXQrK1xuICB9XG5cbiAgaWYgKG5lZ2F0ZU9mZnNldCkgdGhpcy5wYXR0ZXJuID0gcGF0dGVybi5zdWJzdHIobmVnYXRlT2Zmc2V0KVxuICB0aGlzLm5lZ2F0ZSA9IG5lZ2F0ZVxufVxuXG4vLyBCcmFjZSBleHBhbnNpb246XG4vLyBhe2IsY31kIC0+IGFiZCBhY2Rcbi8vIGF7Yix9YyAtPiBhYmMgYWNcbi8vIGF7MC4uM31kIC0+IGEwZCBhMWQgYTJkIGEzZFxuLy8gYXtiLGN7ZCxlfWZ9ZyAtPiBhYmcgYWNkZmcgYWNlZmdcbi8vIGF7YixjfWR7ZSxmfWcgLT4gYWJkZWcgYWNkZWcgYWJkZWcgYWJkZmdcbi8vXG4vLyBJbnZhbGlkIHNldHMgYXJlIG5vdCBleHBhbmRlZC5cbi8vIGF7Mi4ufWIgLT4gYXsyLi59YlxuLy8gYXtifWMgLT4gYXtifWNcbm1pbmltYXRjaC5icmFjZUV4cGFuZCA9IGZ1bmN0aW9uIChwYXR0ZXJuLCBvcHRpb25zKSB7XG4gIHJldHVybiBicmFjZUV4cGFuZChwYXR0ZXJuLCBvcHRpb25zKVxufVxuXG5NaW5pbWF0Y2gucHJvdG90eXBlLmJyYWNlRXhwYW5kID0gYnJhY2VFeHBhbmRcblxuZnVuY3Rpb24gYnJhY2VFeHBhbmQgKHBhdHRlcm4sIG9wdGlvbnMpIHtcbiAgaWYgKCFvcHRpb25zKSB7XG4gICAgaWYgKHRoaXMgaW5zdGFuY2VvZiBNaW5pbWF0Y2gpIHtcbiAgICAgIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnNcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0aW9ucyA9IHt9XG4gICAgfVxuICB9XG5cbiAgcGF0dGVybiA9IHR5cGVvZiBwYXR0ZXJuID09PSAndW5kZWZpbmVkJ1xuICAgID8gdGhpcy5wYXR0ZXJuIDogcGF0dGVyblxuXG4gIGlmICh0eXBlb2YgcGF0dGVybiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCd1bmRlZmluZWQgcGF0dGVybicpXG4gIH1cblxuICBpZiAob3B0aW9ucy5ub2JyYWNlIHx8XG4gICAgIXBhdHRlcm4ubWF0Y2goL1xcey4qXFx9LykpIHtcbiAgICAvLyBzaG9ydGN1dC4gbm8gbmVlZCB0byBleHBhbmQuXG4gICAgcmV0dXJuIFtwYXR0ZXJuXVxuICB9XG5cbiAgcmV0dXJuIGV4cGFuZChwYXR0ZXJuKVxufVxuXG4vLyBwYXJzZSBhIGNvbXBvbmVudCBvZiB0aGUgZXhwYW5kZWQgc2V0LlxuLy8gQXQgdGhpcyBwb2ludCwgbm8gcGF0dGVybiBtYXkgY29udGFpbiBcIi9cIiBpbiBpdFxuLy8gc28gd2UncmUgZ29pbmcgdG8gcmV0dXJuIGEgMmQgYXJyYXksIHdoZXJlIGVhY2ggZW50cnkgaXMgdGhlIGZ1bGxcbi8vIHBhdHRlcm4sIHNwbGl0IG9uICcvJywgYW5kIHRoZW4gdHVybmVkIGludG8gYSByZWd1bGFyIGV4cHJlc3Npb24uXG4vLyBBIHJlZ2V4cCBpcyBtYWRlIGF0IHRoZSBlbmQgd2hpY2ggam9pbnMgZWFjaCBhcnJheSB3aXRoIGFuXG4vLyBlc2NhcGVkIC8sIGFuZCBhbm90aGVyIGZ1bGwgb25lIHdoaWNoIGpvaW5zIGVhY2ggcmVnZXhwIHdpdGggfC5cbi8vXG4vLyBGb2xsb3dpbmcgdGhlIGxlYWQgb2YgQmFzaCA0LjEsIG5vdGUgdGhhdCBcIioqXCIgb25seSBoYXMgc3BlY2lhbCBtZWFuaW5nXG4vLyB3aGVuIGl0IGlzIHRoZSAqb25seSogdGhpbmcgaW4gYSBwYXRoIHBvcnRpb24uICBPdGhlcndpc2UsIGFueSBzZXJpZXNcbi8vIG9mICogaXMgZXF1aXZhbGVudCB0byBhIHNpbmdsZSAqLiAgR2xvYnN0YXIgYmVoYXZpb3IgaXMgZW5hYmxlZCBieVxuLy8gZGVmYXVsdCwgYW5kIGNhbiBiZSBkaXNhYmxlZCBieSBzZXR0aW5nIG9wdGlvbnMubm9nbG9ic3Rhci5cbk1pbmltYXRjaC5wcm90b3R5cGUucGFyc2UgPSBwYXJzZVxudmFyIFNVQlBBUlNFID0ge31cbmZ1bmN0aW9uIHBhcnNlIChwYXR0ZXJuLCBpc1N1Yikge1xuICBpZiAocGF0dGVybi5sZW5ndGggPiAxMDI0ICogNjQpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdwYXR0ZXJuIGlzIHRvbyBsb25nJylcbiAgfVxuXG4gIHZhciBvcHRpb25zID0gdGhpcy5vcHRpb25zXG5cbiAgLy8gc2hvcnRjdXRzXG4gIGlmICghb3B0aW9ucy5ub2dsb2JzdGFyICYmIHBhdHRlcm4gPT09ICcqKicpIHJldHVybiBHTE9CU1RBUlxuICBpZiAocGF0dGVybiA9PT0gJycpIHJldHVybiAnJ1xuXG4gIHZhciByZSA9ICcnXG4gIHZhciBoYXNNYWdpYyA9ICEhb3B0aW9ucy5ub2Nhc2VcbiAgdmFyIGVzY2FwaW5nID0gZmFsc2VcbiAgLy8gPyA9PiBvbmUgc2luZ2xlIGNoYXJhY3RlclxuICB2YXIgcGF0dGVybkxpc3RTdGFjayA9IFtdXG4gIHZhciBuZWdhdGl2ZUxpc3RzID0gW11cbiAgdmFyIHN0YXRlQ2hhclxuICB2YXIgaW5DbGFzcyA9IGZhbHNlXG4gIHZhciByZUNsYXNzU3RhcnQgPSAtMVxuICB2YXIgY2xhc3NTdGFydCA9IC0xXG4gIC8vIC4gYW5kIC4uIG5ldmVyIG1hdGNoIGFueXRoaW5nIHRoYXQgZG9lc24ndCBzdGFydCB3aXRoIC4sXG4gIC8vIGV2ZW4gd2hlbiBvcHRpb25zLmRvdCBpcyBzZXQuXG4gIHZhciBwYXR0ZXJuU3RhcnQgPSBwYXR0ZXJuLmNoYXJBdCgwKSA9PT0gJy4nID8gJycgLy8gYW55dGhpbmdcbiAgLy8gbm90IChzdGFydCBvciAvIGZvbGxvd2VkIGJ5IC4gb3IgLi4gZm9sbG93ZWQgYnkgLyBvciBlbmQpXG4gIDogb3B0aW9ucy5kb3QgPyAnKD8hKD86XnxcXFxcXFwvKVxcXFwuezEsMn0oPzokfFxcXFxcXC8pKSdcbiAgOiAnKD8hXFxcXC4pJ1xuICB2YXIgc2VsZiA9IHRoaXNcblxuICBmdW5jdGlvbiBjbGVhclN0YXRlQ2hhciAoKSB7XG4gICAgaWYgKHN0YXRlQ2hhcikge1xuICAgICAgLy8gd2UgaGFkIHNvbWUgc3RhdGUtdHJhY2tpbmcgY2hhcmFjdGVyXG4gICAgICAvLyB0aGF0IHdhc24ndCBjb25zdW1lZCBieSB0aGlzIHBhc3MuXG4gICAgICBzd2l0Y2ggKHN0YXRlQ2hhcikge1xuICAgICAgICBjYXNlICcqJzpcbiAgICAgICAgICByZSArPSBzdGFyXG4gICAgICAgICAgaGFzTWFnaWMgPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJz8nOlxuICAgICAgICAgIHJlICs9IHFtYXJrXG4gICAgICAgICAgaGFzTWFnaWMgPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcmUgKz0gJ1xcXFwnICsgc3RhdGVDaGFyXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBzZWxmLmRlYnVnKCdjbGVhclN0YXRlQ2hhciAlaiAlaicsIHN0YXRlQ2hhciwgcmUpXG4gICAgICBzdGF0ZUNoYXIgPSBmYWxzZVxuICAgIH1cbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBwYXR0ZXJuLmxlbmd0aCwgY1xuICAgIDsgKGkgPCBsZW4pICYmIChjID0gcGF0dGVybi5jaGFyQXQoaSkpXG4gICAgOyBpKyspIHtcbiAgICB0aGlzLmRlYnVnKCclc1xcdCVzICVzICVqJywgcGF0dGVybiwgaSwgcmUsIGMpXG5cbiAgICAvLyBza2lwIG92ZXIgYW55IHRoYXQgYXJlIGVzY2FwZWQuXG4gICAgaWYgKGVzY2FwaW5nICYmIHJlU3BlY2lhbHNbY10pIHtcbiAgICAgIHJlICs9ICdcXFxcJyArIGNcbiAgICAgIGVzY2FwaW5nID0gZmFsc2VcbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuXG4gICAgc3dpdGNoIChjKSB7XG4gICAgICBjYXNlICcvJzpcbiAgICAgICAgLy8gY29tcGxldGVseSBub3QgYWxsb3dlZCwgZXZlbiBlc2NhcGVkLlxuICAgICAgICAvLyBTaG91bGQgYWxyZWFkeSBiZSBwYXRoLXNwbGl0IGJ5IG5vdy5cbiAgICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAgIGNhc2UgJ1xcXFwnOlxuICAgICAgICBjbGVhclN0YXRlQ2hhcigpXG4gICAgICAgIGVzY2FwaW5nID0gdHJ1ZVxuICAgICAgY29udGludWVcblxuICAgICAgLy8gdGhlIHZhcmlvdXMgc3RhdGVDaGFyIHZhbHVlc1xuICAgICAgLy8gZm9yIHRoZSBcImV4dGdsb2JcIiBzdHVmZi5cbiAgICAgIGNhc2UgJz8nOlxuICAgICAgY2FzZSAnKic6XG4gICAgICBjYXNlICcrJzpcbiAgICAgIGNhc2UgJ0AnOlxuICAgICAgY2FzZSAnISc6XG4gICAgICAgIHRoaXMuZGVidWcoJyVzXFx0JXMgJXMgJWogPC0tIHN0YXRlQ2hhcicsIHBhdHRlcm4sIGksIHJlLCBjKVxuXG4gICAgICAgIC8vIGFsbCBvZiB0aG9zZSBhcmUgbGl0ZXJhbHMgaW5zaWRlIGEgY2xhc3MsIGV4Y2VwdCB0aGF0XG4gICAgICAgIC8vIHRoZSBnbG9iIFshYV0gbWVhbnMgW15hXSBpbiByZWdleHBcbiAgICAgICAgaWYgKGluQ2xhc3MpIHtcbiAgICAgICAgICB0aGlzLmRlYnVnKCcgIGluIGNsYXNzJylcbiAgICAgICAgICBpZiAoYyA9PT0gJyEnICYmIGkgPT09IGNsYXNzU3RhcnQgKyAxKSBjID0gJ14nXG4gICAgICAgICAgcmUgKz0gY1xuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiB3ZSBhbHJlYWR5IGhhdmUgYSBzdGF0ZUNoYXIsIHRoZW4gaXQgbWVhbnNcbiAgICAgICAgLy8gdGhhdCB0aGVyZSB3YXMgc29tZXRoaW5nIGxpa2UgKiogb3IgKz8gaW4gdGhlcmUuXG4gICAgICAgIC8vIEhhbmRsZSB0aGUgc3RhdGVDaGFyLCB0aGVuIHByb2NlZWQgd2l0aCB0aGlzIG9uZS5cbiAgICAgICAgc2VsZi5kZWJ1ZygnY2FsbCBjbGVhclN0YXRlQ2hhciAlaicsIHN0YXRlQ2hhcilcbiAgICAgICAgY2xlYXJTdGF0ZUNoYXIoKVxuICAgICAgICBzdGF0ZUNoYXIgPSBjXG4gICAgICAgIC8vIGlmIGV4dGdsb2IgaXMgZGlzYWJsZWQsIHRoZW4gKyhhc2RmfGZvbykgaXNuJ3QgYSB0aGluZy5cbiAgICAgICAgLy8ganVzdCBjbGVhciB0aGUgc3RhdGVjaGFyICpub3cqLCByYXRoZXIgdGhhbiBldmVuIGRpdmluZyBpbnRvXG4gICAgICAgIC8vIHRoZSBwYXR0ZXJuTGlzdCBzdHVmZi5cbiAgICAgICAgaWYgKG9wdGlvbnMubm9leHQpIGNsZWFyU3RhdGVDaGFyKClcbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgJygnOlxuICAgICAgICBpZiAoaW5DbGFzcykge1xuICAgICAgICAgIHJlICs9ICcoJ1xuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXN0YXRlQ2hhcikge1xuICAgICAgICAgIHJlICs9ICdcXFxcKCdcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgcGF0dGVybkxpc3RTdGFjay5wdXNoKHtcbiAgICAgICAgICB0eXBlOiBzdGF0ZUNoYXIsXG4gICAgICAgICAgc3RhcnQ6IGkgLSAxLFxuICAgICAgICAgIHJlU3RhcnQ6IHJlLmxlbmd0aCxcbiAgICAgICAgICBvcGVuOiBwbFR5cGVzW3N0YXRlQ2hhcl0ub3BlbixcbiAgICAgICAgICBjbG9zZTogcGxUeXBlc1tzdGF0ZUNoYXJdLmNsb3NlXG4gICAgICAgIH0pXG4gICAgICAgIC8vIG5lZ2F0aW9uIGlzICg/Oig/IWpzKVteL10qKVxuICAgICAgICByZSArPSBzdGF0ZUNoYXIgPT09ICchJyA/ICcoPzooPyEoPzonIDogJyg/OidcbiAgICAgICAgdGhpcy5kZWJ1ZygncGxUeXBlICVqICVqJywgc3RhdGVDaGFyLCByZSlcbiAgICAgICAgc3RhdGVDaGFyID0gZmFsc2VcbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgJyknOlxuICAgICAgICBpZiAoaW5DbGFzcyB8fCAhcGF0dGVybkxpc3RTdGFjay5sZW5ndGgpIHtcbiAgICAgICAgICByZSArPSAnXFxcXCknXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIGNsZWFyU3RhdGVDaGFyKClcbiAgICAgICAgaGFzTWFnaWMgPSB0cnVlXG4gICAgICAgIHZhciBwbCA9IHBhdHRlcm5MaXN0U3RhY2sucG9wKClcbiAgICAgICAgLy8gbmVnYXRpb24gaXMgKD86KD8hanMpW14vXSopXG4gICAgICAgIC8vIFRoZSBvdGhlcnMgYXJlICg/OjxwYXR0ZXJuPik8dHlwZT5cbiAgICAgICAgcmUgKz0gcGwuY2xvc2VcbiAgICAgICAgaWYgKHBsLnR5cGUgPT09ICchJykge1xuICAgICAgICAgIG5lZ2F0aXZlTGlzdHMucHVzaChwbClcbiAgICAgICAgfVxuICAgICAgICBwbC5yZUVuZCA9IHJlLmxlbmd0aFxuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSAnfCc6XG4gICAgICAgIGlmIChpbkNsYXNzIHx8ICFwYXR0ZXJuTGlzdFN0YWNrLmxlbmd0aCB8fCBlc2NhcGluZykge1xuICAgICAgICAgIHJlICs9ICdcXFxcfCdcbiAgICAgICAgICBlc2NhcGluZyA9IGZhbHNlXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIGNsZWFyU3RhdGVDaGFyKClcbiAgICAgICAgcmUgKz0gJ3wnXG4gICAgICBjb250aW51ZVxuXG4gICAgICAvLyB0aGVzZSBhcmUgbW9zdGx5IHRoZSBzYW1lIGluIHJlZ2V4cCBhbmQgZ2xvYlxuICAgICAgY2FzZSAnWyc6XG4gICAgICAgIC8vIHN3YWxsb3cgYW55IHN0YXRlLXRyYWNraW5nIGNoYXIgYmVmb3JlIHRoZSBbXG4gICAgICAgIGNsZWFyU3RhdGVDaGFyKClcblxuICAgICAgICBpZiAoaW5DbGFzcykge1xuICAgICAgICAgIHJlICs9ICdcXFxcJyArIGNcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgaW5DbGFzcyA9IHRydWVcbiAgICAgICAgY2xhc3NTdGFydCA9IGlcbiAgICAgICAgcmVDbGFzc1N0YXJ0ID0gcmUubGVuZ3RoXG4gICAgICAgIHJlICs9IGNcbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgJ10nOlxuICAgICAgICAvLyAgYSByaWdodCBicmFja2V0IHNoYWxsIGxvc2UgaXRzIHNwZWNpYWxcbiAgICAgICAgLy8gIG1lYW5pbmcgYW5kIHJlcHJlc2VudCBpdHNlbGYgaW5cbiAgICAgICAgLy8gIGEgYnJhY2tldCBleHByZXNzaW9uIGlmIGl0IG9jY3Vyc1xuICAgICAgICAvLyAgZmlyc3QgaW4gdGhlIGxpc3QuICAtLSBQT1NJWC4yIDIuOC4zLjJcbiAgICAgICAgaWYgKGkgPT09IGNsYXNzU3RhcnQgKyAxIHx8ICFpbkNsYXNzKSB7XG4gICAgICAgICAgcmUgKz0gJ1xcXFwnICsgY1xuICAgICAgICAgIGVzY2FwaW5nID0gZmFsc2VcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gaGFuZGxlIHRoZSBjYXNlIHdoZXJlIHdlIGxlZnQgYSBjbGFzcyBvcGVuLlxuICAgICAgICAvLyBcIlt6LWFdXCIgaXMgdmFsaWQsIGVxdWl2YWxlbnQgdG8gXCJcXFt6LWFcXF1cIlxuICAgICAgICBpZiAoaW5DbGFzcykge1xuICAgICAgICAgIC8vIHNwbGl0IHdoZXJlIHRoZSBsYXN0IFsgd2FzLCBtYWtlIHN1cmUgd2UgZG9uJ3QgaGF2ZVxuICAgICAgICAgIC8vIGFuIGludmFsaWQgcmUuIGlmIHNvLCByZS13YWxrIHRoZSBjb250ZW50cyBvZiB0aGVcbiAgICAgICAgICAvLyB3b3VsZC1iZSBjbGFzcyB0byByZS10cmFuc2xhdGUgYW55IGNoYXJhY3RlcnMgdGhhdFxuICAgICAgICAgIC8vIHdlcmUgcGFzc2VkIHRocm91Z2ggYXMtaXNcbiAgICAgICAgICAvLyBUT0RPOiBJdCB3b3VsZCBwcm9iYWJseSBiZSBmYXN0ZXIgdG8gZGV0ZXJtaW5lIHRoaXNcbiAgICAgICAgICAvLyB3aXRob3V0IGEgdHJ5L2NhdGNoIGFuZCBhIG5ldyBSZWdFeHAsIGJ1dCBpdCdzIHRyaWNreVxuICAgICAgICAgIC8vIHRvIGRvIHNhZmVseS4gIEZvciBub3csIHRoaXMgaXMgc2FmZSBhbmQgd29ya3MuXG4gICAgICAgICAgdmFyIGNzID0gcGF0dGVybi5zdWJzdHJpbmcoY2xhc3NTdGFydCArIDEsIGkpXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIFJlZ0V4cCgnWycgKyBjcyArICddJylcbiAgICAgICAgICB9IGNhdGNoIChlcikge1xuICAgICAgICAgICAgLy8gbm90IGEgdmFsaWQgY2xhc3MhXG4gICAgICAgICAgICB2YXIgc3AgPSB0aGlzLnBhcnNlKGNzLCBTVUJQQVJTRSlcbiAgICAgICAgICAgIHJlID0gcmUuc3Vic3RyKDAsIHJlQ2xhc3NTdGFydCkgKyAnXFxcXFsnICsgc3BbMF0gKyAnXFxcXF0nXG4gICAgICAgICAgICBoYXNNYWdpYyA9IGhhc01hZ2ljIHx8IHNwWzFdXG4gICAgICAgICAgICBpbkNsYXNzID0gZmFsc2VcbiAgICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gZmluaXNoIHVwIHRoZSBjbGFzcy5cbiAgICAgICAgaGFzTWFnaWMgPSB0cnVlXG4gICAgICAgIGluQ2xhc3MgPSBmYWxzZVxuICAgICAgICByZSArPSBjXG4gICAgICBjb250aW51ZVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICAvLyBzd2FsbG93IGFueSBzdGF0ZSBjaGFyIHRoYXQgd2Fzbid0IGNvbnN1bWVkXG4gICAgICAgIGNsZWFyU3RhdGVDaGFyKClcblxuICAgICAgICBpZiAoZXNjYXBpbmcpIHtcbiAgICAgICAgICAvLyBubyBuZWVkXG4gICAgICAgICAgZXNjYXBpbmcgPSBmYWxzZVxuICAgICAgICB9IGVsc2UgaWYgKHJlU3BlY2lhbHNbY11cbiAgICAgICAgICAmJiAhKGMgPT09ICdeJyAmJiBpbkNsYXNzKSkge1xuICAgICAgICAgIHJlICs9ICdcXFxcJ1xuICAgICAgICB9XG5cbiAgICAgICAgcmUgKz0gY1xuXG4gICAgfSAvLyBzd2l0Y2hcbiAgfSAvLyBmb3JcblxuICAvLyBoYW5kbGUgdGhlIGNhc2Ugd2hlcmUgd2UgbGVmdCBhIGNsYXNzIG9wZW4uXG4gIC8vIFwiW2FiY1wiIGlzIHZhbGlkLCBlcXVpdmFsZW50IHRvIFwiXFxbYWJjXCJcbiAgaWYgKGluQ2xhc3MpIHtcbiAgICAvLyBzcGxpdCB3aGVyZSB0aGUgbGFzdCBbIHdhcywgYW5kIGVzY2FwZSBpdFxuICAgIC8vIHRoaXMgaXMgYSBodWdlIHBpdGEuICBXZSBub3cgaGF2ZSB0byByZS13YWxrXG4gICAgLy8gdGhlIGNvbnRlbnRzIG9mIHRoZSB3b3VsZC1iZSBjbGFzcyB0byByZS10cmFuc2xhdGVcbiAgICAvLyBhbnkgY2hhcmFjdGVycyB0aGF0IHdlcmUgcGFzc2VkIHRocm91Z2ggYXMtaXNcbiAgICBjcyA9IHBhdHRlcm4uc3Vic3RyKGNsYXNzU3RhcnQgKyAxKVxuICAgIHNwID0gdGhpcy5wYXJzZShjcywgU1VCUEFSU0UpXG4gICAgcmUgPSByZS5zdWJzdHIoMCwgcmVDbGFzc1N0YXJ0KSArICdcXFxcWycgKyBzcFswXVxuICAgIGhhc01hZ2ljID0gaGFzTWFnaWMgfHwgc3BbMV1cbiAgfVxuXG4gIC8vIGhhbmRsZSB0aGUgY2FzZSB3aGVyZSB3ZSBoYWQgYSArKCB0aGluZyBhdCB0aGUgKmVuZCpcbiAgLy8gb2YgdGhlIHBhdHRlcm4uXG4gIC8vIGVhY2ggcGF0dGVybiBsaXN0IHN0YWNrIGFkZHMgMyBjaGFycywgYW5kIHdlIG5lZWQgdG8gZ28gdGhyb3VnaFxuICAvLyBhbmQgZXNjYXBlIGFueSB8IGNoYXJzIHRoYXQgd2VyZSBwYXNzZWQgdGhyb3VnaCBhcy1pcyBmb3IgdGhlIHJlZ2V4cC5cbiAgLy8gR28gdGhyb3VnaCBhbmQgZXNjYXBlIHRoZW0sIHRha2luZyBjYXJlIG5vdCB0byBkb3VibGUtZXNjYXBlIGFueVxuICAvLyB8IGNoYXJzIHRoYXQgd2VyZSBhbHJlYWR5IGVzY2FwZWQuXG4gIGZvciAocGwgPSBwYXR0ZXJuTGlzdFN0YWNrLnBvcCgpOyBwbDsgcGwgPSBwYXR0ZXJuTGlzdFN0YWNrLnBvcCgpKSB7XG4gICAgdmFyIHRhaWwgPSByZS5zbGljZShwbC5yZVN0YXJ0ICsgcGwub3Blbi5sZW5ndGgpXG4gICAgdGhpcy5kZWJ1Zygnc2V0dGluZyB0YWlsJywgcmUsIHBsKVxuICAgIC8vIG1heWJlIHNvbWUgZXZlbiBudW1iZXIgb2YgXFwsIHRoZW4gbWF5YmUgMSBcXCwgZm9sbG93ZWQgYnkgYSB8XG4gICAgdGFpbCA9IHRhaWwucmVwbGFjZSgvKCg/OlxcXFx7Mn0pezAsNjR9KShcXFxcPylcXHwvZywgZnVuY3Rpb24gKF8sICQxLCAkMikge1xuICAgICAgaWYgKCEkMikge1xuICAgICAgICAvLyB0aGUgfCBpc24ndCBhbHJlYWR5IGVzY2FwZWQsIHNvIGVzY2FwZSBpdC5cbiAgICAgICAgJDIgPSAnXFxcXCdcbiAgICAgIH1cblxuICAgICAgLy8gbmVlZCB0byBlc2NhcGUgYWxsIHRob3NlIHNsYXNoZXMgKmFnYWluKiwgd2l0aG91dCBlc2NhcGluZyB0aGVcbiAgICAgIC8vIG9uZSB0aGF0IHdlIG5lZWQgZm9yIGVzY2FwaW5nIHRoZSB8IGNoYXJhY3Rlci4gIEFzIGl0IHdvcmtzIG91dCxcbiAgICAgIC8vIGVzY2FwaW5nIGFuIGV2ZW4gbnVtYmVyIG9mIHNsYXNoZXMgY2FuIGJlIGRvbmUgYnkgc2ltcGx5IHJlcGVhdGluZ1xuICAgICAgLy8gaXQgZXhhY3RseSBhZnRlciBpdHNlbGYuICBUaGF0J3Mgd2h5IHRoaXMgdHJpY2sgd29ya3MuXG4gICAgICAvL1xuICAgICAgLy8gSSBhbSBzb3JyeSB0aGF0IHlvdSBoYXZlIHRvIHNlZSB0aGlzLlxuICAgICAgcmV0dXJuICQxICsgJDEgKyAkMiArICd8J1xuICAgIH0pXG5cbiAgICB0aGlzLmRlYnVnKCd0YWlsPSVqXFxuICAgJXMnLCB0YWlsLCB0YWlsLCBwbCwgcmUpXG4gICAgdmFyIHQgPSBwbC50eXBlID09PSAnKicgPyBzdGFyXG4gICAgICA6IHBsLnR5cGUgPT09ICc/JyA/IHFtYXJrXG4gICAgICA6ICdcXFxcJyArIHBsLnR5cGVcblxuICAgIGhhc01hZ2ljID0gdHJ1ZVxuICAgIHJlID0gcmUuc2xpY2UoMCwgcGwucmVTdGFydCkgKyB0ICsgJ1xcXFwoJyArIHRhaWxcbiAgfVxuXG4gIC8vIGhhbmRsZSB0cmFpbGluZyB0aGluZ3MgdGhhdCBvbmx5IG1hdHRlciBhdCB0aGUgdmVyeSBlbmQuXG4gIGNsZWFyU3RhdGVDaGFyKClcbiAgaWYgKGVzY2FwaW5nKSB7XG4gICAgLy8gdHJhaWxpbmcgXFxcXFxuICAgIHJlICs9ICdcXFxcXFxcXCdcbiAgfVxuXG4gIC8vIG9ubHkgbmVlZCB0byBhcHBseSB0aGUgbm9kb3Qgc3RhcnQgaWYgdGhlIHJlIHN0YXJ0cyB3aXRoXG4gIC8vIHNvbWV0aGluZyB0aGF0IGNvdWxkIGNvbmNlaXZhYmx5IGNhcHR1cmUgYSBkb3RcbiAgdmFyIGFkZFBhdHRlcm5TdGFydCA9IGZhbHNlXG4gIHN3aXRjaCAocmUuY2hhckF0KDApKSB7XG4gICAgY2FzZSAnLic6XG4gICAgY2FzZSAnWyc6XG4gICAgY2FzZSAnKCc6IGFkZFBhdHRlcm5TdGFydCA9IHRydWVcbiAgfVxuXG4gIC8vIEhhY2sgdG8gd29yayBhcm91bmQgbGFjayBvZiBuZWdhdGl2ZSBsb29rYmVoaW5kIGluIEpTXG4gIC8vIEEgcGF0dGVybiBsaWtlOiAqLiEoeCkuISh5fHopIG5lZWRzIHRvIGVuc3VyZSB0aGF0IGEgbmFtZVxuICAvLyBsaWtlICdhLnh5ei55eicgZG9lc24ndCBtYXRjaC4gIFNvLCB0aGUgZmlyc3QgbmVnYXRpdmVcbiAgLy8gbG9va2FoZWFkLCBoYXMgdG8gbG9vayBBTEwgdGhlIHdheSBhaGVhZCwgdG8gdGhlIGVuZCBvZlxuICAvLyB0aGUgcGF0dGVybi5cbiAgZm9yICh2YXIgbiA9IG5lZ2F0aXZlTGlzdHMubGVuZ3RoIC0gMTsgbiA+IC0xOyBuLS0pIHtcbiAgICB2YXIgbmwgPSBuZWdhdGl2ZUxpc3RzW25dXG5cbiAgICB2YXIgbmxCZWZvcmUgPSByZS5zbGljZSgwLCBubC5yZVN0YXJ0KVxuICAgIHZhciBubEZpcnN0ID0gcmUuc2xpY2UobmwucmVTdGFydCwgbmwucmVFbmQgLSA4KVxuICAgIHZhciBubExhc3QgPSByZS5zbGljZShubC5yZUVuZCAtIDgsIG5sLnJlRW5kKVxuICAgIHZhciBubEFmdGVyID0gcmUuc2xpY2UobmwucmVFbmQpXG5cbiAgICBubExhc3QgKz0gbmxBZnRlclxuXG4gICAgLy8gSGFuZGxlIG5lc3RlZCBzdHVmZiBsaWtlICooKi5qc3whKCouanNvbikpLCB3aGVyZSBvcGVuIHBhcmVuc1xuICAgIC8vIG1lYW4gdGhhdCB3ZSBzaG91bGQgKm5vdCogaW5jbHVkZSB0aGUgKSBpbiB0aGUgYml0IHRoYXQgaXMgY29uc2lkZXJlZFxuICAgIC8vIFwiYWZ0ZXJcIiB0aGUgbmVnYXRlZCBzZWN0aW9uLlxuICAgIHZhciBvcGVuUGFyZW5zQmVmb3JlID0gbmxCZWZvcmUuc3BsaXQoJygnKS5sZW5ndGggLSAxXG4gICAgdmFyIGNsZWFuQWZ0ZXIgPSBubEFmdGVyXG4gICAgZm9yIChpID0gMDsgaSA8IG9wZW5QYXJlbnNCZWZvcmU7IGkrKykge1xuICAgICAgY2xlYW5BZnRlciA9IGNsZWFuQWZ0ZXIucmVwbGFjZSgvXFwpWysqP10/LywgJycpXG4gICAgfVxuICAgIG5sQWZ0ZXIgPSBjbGVhbkFmdGVyXG5cbiAgICB2YXIgZG9sbGFyID0gJydcbiAgICBpZiAobmxBZnRlciA9PT0gJycgJiYgaXNTdWIgIT09IFNVQlBBUlNFKSB7XG4gICAgICBkb2xsYXIgPSAnJCdcbiAgICB9XG4gICAgdmFyIG5ld1JlID0gbmxCZWZvcmUgKyBubEZpcnN0ICsgbmxBZnRlciArIGRvbGxhciArIG5sTGFzdFxuICAgIHJlID0gbmV3UmVcbiAgfVxuXG4gIC8vIGlmIHRoZSByZSBpcyBub3QgXCJcIiBhdCB0aGlzIHBvaW50LCB0aGVuIHdlIG5lZWQgdG8gbWFrZSBzdXJlXG4gIC8vIGl0IGRvZXNuJ3QgbWF0Y2ggYWdhaW5zdCBhbiBlbXB0eSBwYXRoIHBhcnQuXG4gIC8vIE90aGVyd2lzZSBhLyogd2lsbCBtYXRjaCBhLywgd2hpY2ggaXQgc2hvdWxkIG5vdC5cbiAgaWYgKHJlICE9PSAnJyAmJiBoYXNNYWdpYykge1xuICAgIHJlID0gJyg/PS4pJyArIHJlXG4gIH1cblxuICBpZiAoYWRkUGF0dGVyblN0YXJ0KSB7XG4gICAgcmUgPSBwYXR0ZXJuU3RhcnQgKyByZVxuICB9XG5cbiAgLy8gcGFyc2luZyBqdXN0IGEgcGllY2Ugb2YgYSBsYXJnZXIgcGF0dGVybi5cbiAgaWYgKGlzU3ViID09PSBTVUJQQVJTRSkge1xuICAgIHJldHVybiBbcmUsIGhhc01hZ2ljXVxuICB9XG5cbiAgLy8gc2tpcCB0aGUgcmVnZXhwIGZvciBub24tbWFnaWNhbCBwYXR0ZXJuc1xuICAvLyB1bmVzY2FwZSBhbnl0aGluZyBpbiBpdCwgdGhvdWdoLCBzbyB0aGF0IGl0J2xsIGJlXG4gIC8vIGFuIGV4YWN0IG1hdGNoIGFnYWluc3QgYSBmaWxlIGV0Yy5cbiAgaWYgKCFoYXNNYWdpYykge1xuICAgIHJldHVybiBnbG9iVW5lc2NhcGUocGF0dGVybilcbiAgfVxuXG4gIHZhciBmbGFncyA9IG9wdGlvbnMubm9jYXNlID8gJ2knIDogJydcbiAgdHJ5IHtcbiAgICB2YXIgcmVnRXhwID0gbmV3IFJlZ0V4cCgnXicgKyByZSArICckJywgZmxhZ3MpXG4gIH0gY2F0Y2ggKGVyKSB7XG4gICAgLy8gSWYgaXQgd2FzIGFuIGludmFsaWQgcmVndWxhciBleHByZXNzaW9uLCB0aGVuIGl0IGNhbid0IG1hdGNoXG4gICAgLy8gYW55dGhpbmcuICBUaGlzIHRyaWNrIGxvb2tzIGZvciBhIGNoYXJhY3RlciBhZnRlciB0aGUgZW5kIG9mXG4gICAgLy8gdGhlIHN0cmluZywgd2hpY2ggaXMgb2YgY291cnNlIGltcG9zc2libGUsIGV4Y2VwdCBpbiBtdWx0aS1saW5lXG4gICAgLy8gbW9kZSwgYnV0IGl0J3Mgbm90IGEgL20gcmVnZXguXG4gICAgcmV0dXJuIG5ldyBSZWdFeHAoJyQuJylcbiAgfVxuXG4gIHJlZ0V4cC5fZ2xvYiA9IHBhdHRlcm5cbiAgcmVnRXhwLl9zcmMgPSByZVxuXG4gIHJldHVybiByZWdFeHBcbn1cblxubWluaW1hdGNoLm1ha2VSZSA9IGZ1bmN0aW9uIChwYXR0ZXJuLCBvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgTWluaW1hdGNoKHBhdHRlcm4sIG9wdGlvbnMgfHwge30pLm1ha2VSZSgpXG59XG5cbk1pbmltYXRjaC5wcm90b3R5cGUubWFrZVJlID0gbWFrZVJlXG5mdW5jdGlvbiBtYWtlUmUgKCkge1xuICBpZiAodGhpcy5yZWdleHAgfHwgdGhpcy5yZWdleHAgPT09IGZhbHNlKSByZXR1cm4gdGhpcy5yZWdleHBcblxuICAvLyBhdCB0aGlzIHBvaW50LCB0aGlzLnNldCBpcyBhIDJkIGFycmF5IG9mIHBhcnRpYWxcbiAgLy8gcGF0dGVybiBzdHJpbmdzLCBvciBcIioqXCIuXG4gIC8vXG4gIC8vIEl0J3MgYmV0dGVyIHRvIHVzZSAubWF0Y2goKS4gIFRoaXMgZnVuY3Rpb24gc2hvdWxkbid0XG4gIC8vIGJlIHVzZWQsIHJlYWxseSwgYnV0IGl0J3MgcHJldHR5IGNvbnZlbmllbnQgc29tZXRpbWVzLFxuICAvLyB3aGVuIHlvdSBqdXN0IHdhbnQgdG8gd29yayB3aXRoIGEgcmVnZXguXG4gIHZhciBzZXQgPSB0aGlzLnNldFxuXG4gIGlmICghc2V0Lmxlbmd0aCkge1xuICAgIHRoaXMucmVnZXhwID0gZmFsc2VcbiAgICByZXR1cm4gdGhpcy5yZWdleHBcbiAgfVxuICB2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9uc1xuXG4gIHZhciB0d29TdGFyID0gb3B0aW9ucy5ub2dsb2JzdGFyID8gc3RhclxuICAgIDogb3B0aW9ucy5kb3QgPyB0d29TdGFyRG90XG4gICAgOiB0d29TdGFyTm9Eb3RcbiAgdmFyIGZsYWdzID0gb3B0aW9ucy5ub2Nhc2UgPyAnaScgOiAnJ1xuXG4gIHZhciByZSA9IHNldC5tYXAoZnVuY3Rpb24gKHBhdHRlcm4pIHtcbiAgICByZXR1cm4gcGF0dGVybi5tYXAoZnVuY3Rpb24gKHApIHtcbiAgICAgIHJldHVybiAocCA9PT0gR0xPQlNUQVIpID8gdHdvU3RhclxuICAgICAgOiAodHlwZW9mIHAgPT09ICdzdHJpbmcnKSA/IHJlZ0V4cEVzY2FwZShwKVxuICAgICAgOiBwLl9zcmNcbiAgICB9KS5qb2luKCdcXFxcXFwvJylcbiAgfSkuam9pbignfCcpXG5cbiAgLy8gbXVzdCBtYXRjaCBlbnRpcmUgcGF0dGVyblxuICAvLyBlbmRpbmcgaW4gYSAqIG9yICoqIHdpbGwgbWFrZSBpdCBsZXNzIHN0cmljdC5cbiAgcmUgPSAnXig/OicgKyByZSArICcpJCdcblxuICAvLyBjYW4gbWF0Y2ggYW55dGhpbmcsIGFzIGxvbmcgYXMgaXQncyBub3QgdGhpcy5cbiAgaWYgKHRoaXMubmVnYXRlKSByZSA9ICdeKD8hJyArIHJlICsgJykuKiQnXG5cbiAgdHJ5IHtcbiAgICB0aGlzLnJlZ2V4cCA9IG5ldyBSZWdFeHAocmUsIGZsYWdzKVxuICB9IGNhdGNoIChleCkge1xuICAgIHRoaXMucmVnZXhwID0gZmFsc2VcbiAgfVxuICByZXR1cm4gdGhpcy5yZWdleHBcbn1cblxubWluaW1hdGNoLm1hdGNoID0gZnVuY3Rpb24gKGxpc3QsIHBhdHRlcm4sIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgdmFyIG1tID0gbmV3IE1pbmltYXRjaChwYXR0ZXJuLCBvcHRpb25zKVxuICBsaXN0ID0gbGlzdC5maWx0ZXIoZnVuY3Rpb24gKGYpIHtcbiAgICByZXR1cm4gbW0ubWF0Y2goZilcbiAgfSlcbiAgaWYgKG1tLm9wdGlvbnMubm9udWxsICYmICFsaXN0Lmxlbmd0aCkge1xuICAgIGxpc3QucHVzaChwYXR0ZXJuKVxuICB9XG4gIHJldHVybiBsaXN0XG59XG5cbk1pbmltYXRjaC5wcm90b3R5cGUubWF0Y2ggPSBtYXRjaFxuZnVuY3Rpb24gbWF0Y2ggKGYsIHBhcnRpYWwpIHtcbiAgdGhpcy5kZWJ1ZygnbWF0Y2gnLCBmLCB0aGlzLnBhdHRlcm4pXG4gIC8vIHNob3J0LWNpcmN1aXQgaW4gdGhlIGNhc2Ugb2YgYnVzdGVkIHRoaW5ncy5cbiAgLy8gY29tbWVudHMsIGV0Yy5cbiAgaWYgKHRoaXMuY29tbWVudCkgcmV0dXJuIGZhbHNlXG4gIGlmICh0aGlzLmVtcHR5KSByZXR1cm4gZiA9PT0gJydcblxuICBpZiAoZiA9PT0gJy8nICYmIHBhcnRpYWwpIHJldHVybiB0cnVlXG5cbiAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnNcblxuICAvLyB3aW5kb3dzOiBuZWVkIHRvIHVzZSAvLCBub3QgXFxcbiAgaWYgKHBhdGguc2VwICE9PSAnLycpIHtcbiAgICBmID0gZi5zcGxpdChwYXRoLnNlcCkuam9pbignLycpXG4gIH1cblxuICAvLyB0cmVhdCB0aGUgdGVzdCBwYXRoIGFzIGEgc2V0IG9mIHBhdGhwYXJ0cy5cbiAgZiA9IGYuc3BsaXQoc2xhc2hTcGxpdClcbiAgdGhpcy5kZWJ1Zyh0aGlzLnBhdHRlcm4sICdzcGxpdCcsIGYpXG5cbiAgLy8ganVzdCBPTkUgb2YgdGhlIHBhdHRlcm4gc2V0cyBpbiB0aGlzLnNldCBuZWVkcyB0byBtYXRjaFxuICAvLyBpbiBvcmRlciBmb3IgaXQgdG8gYmUgdmFsaWQuICBJZiBuZWdhdGluZywgdGhlbiBqdXN0IG9uZVxuICAvLyBtYXRjaCBtZWFucyB0aGF0IHdlIGhhdmUgZmFpbGVkLlxuICAvLyBFaXRoZXIgd2F5LCByZXR1cm4gb24gdGhlIGZpcnN0IGhpdC5cblxuICB2YXIgc2V0ID0gdGhpcy5zZXRcbiAgdGhpcy5kZWJ1Zyh0aGlzLnBhdHRlcm4sICdzZXQnLCBzZXQpXG5cbiAgLy8gRmluZCB0aGUgYmFzZW5hbWUgb2YgdGhlIHBhdGggYnkgbG9va2luZyBmb3IgdGhlIGxhc3Qgbm9uLWVtcHR5IHNlZ21lbnRcbiAgdmFyIGZpbGVuYW1lXG4gIHZhciBpXG4gIGZvciAoaSA9IGYubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBmaWxlbmFtZSA9IGZbaV1cbiAgICBpZiAoZmlsZW5hbWUpIGJyZWFrXG4gIH1cblxuICBmb3IgKGkgPSAwOyBpIDwgc2V0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHBhdHRlcm4gPSBzZXRbaV1cbiAgICB2YXIgZmlsZSA9IGZcbiAgICBpZiAob3B0aW9ucy5tYXRjaEJhc2UgJiYgcGF0dGVybi5sZW5ndGggPT09IDEpIHtcbiAgICAgIGZpbGUgPSBbZmlsZW5hbWVdXG4gICAgfVxuICAgIHZhciBoaXQgPSB0aGlzLm1hdGNoT25lKGZpbGUsIHBhdHRlcm4sIHBhcnRpYWwpXG4gICAgaWYgKGhpdCkge1xuICAgICAgaWYgKG9wdGlvbnMuZmxpcE5lZ2F0ZSkgcmV0dXJuIHRydWVcbiAgICAgIHJldHVybiAhdGhpcy5uZWdhdGVcbiAgICB9XG4gIH1cblxuICAvLyBkaWRuJ3QgZ2V0IGFueSBoaXRzLiAgdGhpcyBpcyBzdWNjZXNzIGlmIGl0J3MgYSBuZWdhdGl2ZVxuICAvLyBwYXR0ZXJuLCBmYWlsdXJlIG90aGVyd2lzZS5cbiAgaWYgKG9wdGlvbnMuZmxpcE5lZ2F0ZSkgcmV0dXJuIGZhbHNlXG4gIHJldHVybiB0aGlzLm5lZ2F0ZVxufVxuXG4vLyBzZXQgcGFydGlhbCB0byB0cnVlIHRvIHRlc3QgaWYsIGZvciBleGFtcGxlLFxuLy8gXCIvYS9iXCIgbWF0Y2hlcyB0aGUgc3RhcnQgb2YgXCIvKi9iLyovZFwiXG4vLyBQYXJ0aWFsIG1lYW5zLCBpZiB5b3UgcnVuIG91dCBvZiBmaWxlIGJlZm9yZSB5b3UgcnVuXG4vLyBvdXQgb2YgcGF0dGVybiwgdGhlbiB0aGF0J3MgZmluZSwgYXMgbG9uZyBhcyBhbGxcbi8vIHRoZSBwYXJ0cyBtYXRjaC5cbk1pbmltYXRjaC5wcm90b3R5cGUubWF0Y2hPbmUgPSBmdW5jdGlvbiAoZmlsZSwgcGF0dGVybiwgcGFydGlhbCkge1xuICB2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9uc1xuXG4gIHRoaXMuZGVidWcoJ21hdGNoT25lJyxcbiAgICB7ICd0aGlzJzogdGhpcywgZmlsZTogZmlsZSwgcGF0dGVybjogcGF0dGVybiB9KVxuXG4gIHRoaXMuZGVidWcoJ21hdGNoT25lJywgZmlsZS5sZW5ndGgsIHBhdHRlcm4ubGVuZ3RoKVxuXG4gIGZvciAodmFyIGZpID0gMCxcbiAgICAgIHBpID0gMCxcbiAgICAgIGZsID0gZmlsZS5sZW5ndGgsXG4gICAgICBwbCA9IHBhdHRlcm4ubGVuZ3RoXG4gICAgICA7IChmaSA8IGZsKSAmJiAocGkgPCBwbClcbiAgICAgIDsgZmkrKywgcGkrKykge1xuICAgIHRoaXMuZGVidWcoJ21hdGNoT25lIGxvb3AnKVxuICAgIHZhciBwID0gcGF0dGVybltwaV1cbiAgICB2YXIgZiA9IGZpbGVbZmldXG5cbiAgICB0aGlzLmRlYnVnKHBhdHRlcm4sIHAsIGYpXG5cbiAgICAvLyBzaG91bGQgYmUgaW1wb3NzaWJsZS5cbiAgICAvLyBzb21lIGludmFsaWQgcmVnZXhwIHN0dWZmIGluIHRoZSBzZXQuXG4gICAgaWYgKHAgPT09IGZhbHNlKSByZXR1cm4gZmFsc2VcblxuICAgIGlmIChwID09PSBHTE9CU1RBUikge1xuICAgICAgdGhpcy5kZWJ1ZygnR0xPQlNUQVInLCBbcGF0dGVybiwgcCwgZl0pXG5cbiAgICAgIC8vIFwiKipcIlxuICAgICAgLy8gYS8qKi9iLyoqL2Mgd291bGQgbWF0Y2ggdGhlIGZvbGxvd2luZzpcbiAgICAgIC8vIGEvYi94L3kvei9jXG4gICAgICAvLyBhL3gveS96L2IvY1xuICAgICAgLy8gYS9iL3gvYi94L2NcbiAgICAgIC8vIGEvYi9jXG4gICAgICAvLyBUbyBkbyB0aGlzLCB0YWtlIHRoZSByZXN0IG9mIHRoZSBwYXR0ZXJuIGFmdGVyXG4gICAgICAvLyB0aGUgKiosIGFuZCBzZWUgaWYgaXQgd291bGQgbWF0Y2ggdGhlIGZpbGUgcmVtYWluZGVyLlxuICAgICAgLy8gSWYgc28sIHJldHVybiBzdWNjZXNzLlxuICAgICAgLy8gSWYgbm90LCB0aGUgKiogXCJzd2FsbG93c1wiIGEgc2VnbWVudCwgYW5kIHRyeSBhZ2Fpbi5cbiAgICAgIC8vIFRoaXMgaXMgcmVjdXJzaXZlbHkgYXdmdWwuXG4gICAgICAvL1xuICAgICAgLy8gYS8qKi9iLyoqL2MgbWF0Y2hpbmcgYS9iL3gveS96L2NcbiAgICAgIC8vIC0gYSBtYXRjaGVzIGFcbiAgICAgIC8vIC0gZG91Ymxlc3RhclxuICAgICAgLy8gICAtIG1hdGNoT25lKGIveC95L3ovYywgYi8qKi9jKVxuICAgICAgLy8gICAgIC0gYiBtYXRjaGVzIGJcbiAgICAgIC8vICAgICAtIGRvdWJsZXN0YXJcbiAgICAgIC8vICAgICAgIC0gbWF0Y2hPbmUoeC95L3ovYywgYykgLT4gbm9cbiAgICAgIC8vICAgICAgIC0gbWF0Y2hPbmUoeS96L2MsIGMpIC0+IG5vXG4gICAgICAvLyAgICAgICAtIG1hdGNoT25lKHovYywgYykgLT4gbm9cbiAgICAgIC8vICAgICAgIC0gbWF0Y2hPbmUoYywgYykgeWVzLCBoaXRcbiAgICAgIHZhciBmciA9IGZpXG4gICAgICB2YXIgcHIgPSBwaSArIDFcbiAgICAgIGlmIChwciA9PT0gcGwpIHtcbiAgICAgICAgdGhpcy5kZWJ1ZygnKiogYXQgdGhlIGVuZCcpXG4gICAgICAgIC8vIGEgKiogYXQgdGhlIGVuZCB3aWxsIGp1c3Qgc3dhbGxvdyB0aGUgcmVzdC5cbiAgICAgICAgLy8gV2UgaGF2ZSBmb3VuZCBhIG1hdGNoLlxuICAgICAgICAvLyBob3dldmVyLCBpdCB3aWxsIG5vdCBzd2FsbG93IC8ueCwgdW5sZXNzXG4gICAgICAgIC8vIG9wdGlvbnMuZG90IGlzIHNldC5cbiAgICAgICAgLy8gLiBhbmQgLi4gYXJlICpuZXZlciogbWF0Y2hlZCBieSAqKiwgZm9yIGV4cGxvc2l2ZWx5XG4gICAgICAgIC8vIGV4cG9uZW50aWFsIHJlYXNvbnMuXG4gICAgICAgIGZvciAoOyBmaSA8IGZsOyBmaSsrKSB7XG4gICAgICAgICAgaWYgKGZpbGVbZmldID09PSAnLicgfHwgZmlsZVtmaV0gPT09ICcuLicgfHxcbiAgICAgICAgICAgICghb3B0aW9ucy5kb3QgJiYgZmlsZVtmaV0uY2hhckF0KDApID09PSAnLicpKSByZXR1cm4gZmFsc2VcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfVxuXG4gICAgICAvLyBvaywgbGV0J3Mgc2VlIGlmIHdlIGNhbiBzd2FsbG93IHdoYXRldmVyIHdlIGNhbi5cbiAgICAgIHdoaWxlIChmciA8IGZsKSB7XG4gICAgICAgIHZhciBzd2FsbG93ZWUgPSBmaWxlW2ZyXVxuXG4gICAgICAgIHRoaXMuZGVidWcoJ1xcbmdsb2JzdGFyIHdoaWxlJywgZmlsZSwgZnIsIHBhdHRlcm4sIHByLCBzd2FsbG93ZWUpXG5cbiAgICAgICAgLy8gWFhYIHJlbW92ZSB0aGlzIHNsaWNlLiAgSnVzdCBwYXNzIHRoZSBzdGFydCBpbmRleC5cbiAgICAgICAgaWYgKHRoaXMubWF0Y2hPbmUoZmlsZS5zbGljZShmciksIHBhdHRlcm4uc2xpY2UocHIpLCBwYXJ0aWFsKSkge1xuICAgICAgICAgIHRoaXMuZGVidWcoJ2dsb2JzdGFyIGZvdW5kIG1hdGNoIScsIGZyLCBmbCwgc3dhbGxvd2VlKVxuICAgICAgICAgIC8vIGZvdW5kIGEgbWF0Y2guXG4gICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBjYW4ndCBzd2FsbG93IFwiLlwiIG9yIFwiLi5cIiBldmVyLlxuICAgICAgICAgIC8vIGNhbiBvbmx5IHN3YWxsb3cgXCIuZm9vXCIgd2hlbiBleHBsaWNpdGx5IGFza2VkLlxuICAgICAgICAgIGlmIChzd2FsbG93ZWUgPT09ICcuJyB8fCBzd2FsbG93ZWUgPT09ICcuLicgfHxcbiAgICAgICAgICAgICghb3B0aW9ucy5kb3QgJiYgc3dhbGxvd2VlLmNoYXJBdCgwKSA9PT0gJy4nKSkge1xuICAgICAgICAgICAgdGhpcy5kZWJ1ZygnZG90IGRldGVjdGVkIScsIGZpbGUsIGZyLCBwYXR0ZXJuLCBwcilcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gKiogc3dhbGxvd3MgYSBzZWdtZW50LCBhbmQgY29udGludWUuXG4gICAgICAgICAgdGhpcy5kZWJ1ZygnZ2xvYnN0YXIgc3dhbGxvdyBhIHNlZ21lbnQsIGFuZCBjb250aW51ZScpXG4gICAgICAgICAgZnIrK1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIG5vIG1hdGNoIHdhcyBmb3VuZC5cbiAgICAgIC8vIEhvd2V2ZXIsIGluIHBhcnRpYWwgbW9kZSwgd2UgY2FuJ3Qgc2F5IHRoaXMgaXMgbmVjZXNzYXJpbHkgb3Zlci5cbiAgICAgIC8vIElmIHRoZXJlJ3MgbW9yZSAqcGF0dGVybiogbGVmdCwgdGhlblxuICAgICAgaWYgKHBhcnRpYWwpIHtcbiAgICAgICAgLy8gcmFuIG91dCBvZiBmaWxlXG4gICAgICAgIHRoaXMuZGVidWcoJ1xcbj4+PiBubyBtYXRjaCwgcGFydGlhbD8nLCBmaWxlLCBmciwgcGF0dGVybiwgcHIpXG4gICAgICAgIGlmIChmciA9PT0gZmwpIHJldHVybiB0cnVlXG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICAvLyBzb21ldGhpbmcgb3RoZXIgdGhhbiAqKlxuICAgIC8vIG5vbi1tYWdpYyBwYXR0ZXJucyBqdXN0IGhhdmUgdG8gbWF0Y2ggZXhhY3RseVxuICAgIC8vIHBhdHRlcm5zIHdpdGggbWFnaWMgaGF2ZSBiZWVuIHR1cm5lZCBpbnRvIHJlZ2V4cHMuXG4gICAgdmFyIGhpdFxuICAgIGlmICh0eXBlb2YgcCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGlmIChvcHRpb25zLm5vY2FzZSkge1xuICAgICAgICBoaXQgPSBmLnRvTG93ZXJDYXNlKCkgPT09IHAudG9Mb3dlckNhc2UoKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaGl0ID0gZiA9PT0gcFxuICAgICAgfVxuICAgICAgdGhpcy5kZWJ1Zygnc3RyaW5nIG1hdGNoJywgcCwgZiwgaGl0KVxuICAgIH0gZWxzZSB7XG4gICAgICBoaXQgPSBmLm1hdGNoKHApXG4gICAgICB0aGlzLmRlYnVnKCdwYXR0ZXJuIG1hdGNoJywgcCwgZiwgaGl0KVxuICAgIH1cblxuICAgIGlmICghaGl0KSByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIC8vIE5vdGU6IGVuZGluZyBpbiAvIG1lYW5zIHRoYXQgd2UnbGwgZ2V0IGEgZmluYWwgXCJcIlxuICAvLyBhdCB0aGUgZW5kIG9mIHRoZSBwYXR0ZXJuLiAgVGhpcyBjYW4gb25seSBtYXRjaCBhXG4gIC8vIGNvcnJlc3BvbmRpbmcgXCJcIiBhdCB0aGUgZW5kIG9mIHRoZSBmaWxlLlxuICAvLyBJZiB0aGUgZmlsZSBlbmRzIGluIC8sIHRoZW4gaXQgY2FuIG9ubHkgbWF0Y2ggYVxuICAvLyBhIHBhdHRlcm4gdGhhdCBlbmRzIGluIC8sIHVubGVzcyB0aGUgcGF0dGVybiBqdXN0XG4gIC8vIGRvZXNuJ3QgaGF2ZSBhbnkgbW9yZSBmb3IgaXQuIEJ1dCwgYS9iLyBzaG91bGQgKm5vdCpcbiAgLy8gbWF0Y2ggXCJhL2IvKlwiLCBldmVuIHRob3VnaCBcIlwiIG1hdGNoZXMgYWdhaW5zdCB0aGVcbiAgLy8gW14vXSo/IHBhdHRlcm4sIGV4Y2VwdCBpbiBwYXJ0aWFsIG1vZGUsIHdoZXJlIGl0IG1pZ2h0XG4gIC8vIHNpbXBseSBub3QgYmUgcmVhY2hlZCB5ZXQuXG4gIC8vIEhvd2V2ZXIsIGEvYi8gc2hvdWxkIHN0aWxsIHNhdGlzZnkgYS8qXG5cbiAgLy8gbm93IGVpdGhlciB3ZSBmZWxsIG9mZiB0aGUgZW5kIG9mIHRoZSBwYXR0ZXJuLCBvciB3ZSdyZSBkb25lLlxuICBpZiAoZmkgPT09IGZsICYmIHBpID09PSBwbCkge1xuICAgIC8vIHJhbiBvdXQgb2YgcGF0dGVybiBhbmQgZmlsZW5hbWUgYXQgdGhlIHNhbWUgdGltZS5cbiAgICAvLyBhbiBleGFjdCBoaXQhXG4gICAgcmV0dXJuIHRydWVcbiAgfSBlbHNlIGlmIChmaSA9PT0gZmwpIHtcbiAgICAvLyByYW4gb3V0IG9mIGZpbGUsIGJ1dCBzdGlsbCBoYWQgcGF0dGVybiBsZWZ0LlxuICAgIC8vIHRoaXMgaXMgb2sgaWYgd2UncmUgZG9pbmcgdGhlIG1hdGNoIGFzIHBhcnQgb2ZcbiAgICAvLyBhIGdsb2IgZnMgdHJhdmVyc2FsLlxuICAgIHJldHVybiBwYXJ0aWFsXG4gIH0gZWxzZSBpZiAocGkgPT09IHBsKSB7XG4gICAgLy8gcmFuIG91dCBvZiBwYXR0ZXJuLCBzdGlsbCBoYXZlIGZpbGUgbGVmdC5cbiAgICAvLyB0aGlzIGlzIG9ubHkgYWNjZXB0YWJsZSBpZiB3ZSdyZSBvbiB0aGUgdmVyeSBsYXN0XG4gICAgLy8gZW1wdHkgc2VnbWVudCBvZiBhIGZpbGUgd2l0aCBhIHRyYWlsaW5nIHNsYXNoLlxuICAgIC8vIGEvKiBzaG91bGQgbWF0Y2ggYS9iL1xuICAgIHZhciBlbXB0eUZpbGVFbmQgPSAoZmkgPT09IGZsIC0gMSkgJiYgKGZpbGVbZmldID09PSAnJylcbiAgICByZXR1cm4gZW1wdHlGaWxlRW5kXG4gIH1cblxuICAvLyBzaG91bGQgYmUgdW5yZWFjaGFibGUuXG4gIHRocm93IG5ldyBFcnJvcignd3RmPycpXG59XG5cbi8vIHJlcGxhY2Ugc3R1ZmYgbGlrZSBcXCogd2l0aCAqXG5mdW5jdGlvbiBnbG9iVW5lc2NhcGUgKHMpIHtcbiAgcmV0dXJuIHMucmVwbGFjZSgvXFxcXCguKS9nLCAnJDEnKVxufVxuXG5mdW5jdGlvbiByZWdFeHBFc2NhcGUgKHMpIHtcbiAgcmV0dXJuIHMucmVwbGFjZSgvWy1bXFxde30oKSorPy4sXFxcXF4kfCNcXHNdL2csICdcXFxcJCYnKVxufVxuIiwidmFyIHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG52YXIgZnMgPSByZXF1aXJlKCdmcycpO1xudmFyIF8wNzc3ID0gcGFyc2VJbnQoJzA3NzcnLCA4KTtcblxubW9kdWxlLmV4cG9ydHMgPSBta2RpclAubWtkaXJwID0gbWtkaXJQLm1rZGlyUCA9IG1rZGlyUDtcblxuZnVuY3Rpb24gbWtkaXJQIChwLCBvcHRzLCBmLCBtYWRlKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGYgPSBvcHRzO1xuICAgICAgICBvcHRzID0ge307XG4gICAgfVxuICAgIGVsc2UgaWYgKCFvcHRzIHx8IHR5cGVvZiBvcHRzICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBvcHRzID0geyBtb2RlOiBvcHRzIH07XG4gICAgfVxuICAgIFxuICAgIHZhciBtb2RlID0gb3B0cy5tb2RlO1xuICAgIHZhciB4ZnMgPSBvcHRzLmZzIHx8IGZzO1xuICAgIFxuICAgIGlmIChtb2RlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbW9kZSA9IF8wNzc3XG4gICAgfVxuICAgIGlmICghbWFkZSkgbWFkZSA9IG51bGw7XG4gICAgXG4gICAgdmFyIGNiID0gZiB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgICBwID0gcGF0aC5yZXNvbHZlKHApO1xuICAgIFxuICAgIHhmcy5ta2RpcihwLCBtb2RlLCBmdW5jdGlvbiAoZXIpIHtcbiAgICAgICAgaWYgKCFlcikge1xuICAgICAgICAgICAgbWFkZSA9IG1hZGUgfHwgcDtcbiAgICAgICAgICAgIHJldHVybiBjYihudWxsLCBtYWRlKTtcbiAgICAgICAgfVxuICAgICAgICBzd2l0Y2ggKGVyLmNvZGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ0VOT0VOVCc6XG4gICAgICAgICAgICAgICAgaWYgKHBhdGguZGlybmFtZShwKSA9PT0gcCkgcmV0dXJuIGNiKGVyKTtcbiAgICAgICAgICAgICAgICBta2RpclAocGF0aC5kaXJuYW1lKHApLCBvcHRzLCBmdW5jdGlvbiAoZXIsIG1hZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVyKSBjYihlciwgbWFkZSk7XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgbWtkaXJQKHAsIG9wdHMsIGNiLCBtYWRlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgLy8gSW4gdGhlIGNhc2Ugb2YgYW55IG90aGVyIGVycm9yLCBqdXN0IHNlZSBpZiB0aGVyZSdzIGEgZGlyXG4gICAgICAgICAgICAvLyB0aGVyZSBhbHJlYWR5LiAgSWYgc28sIHRoZW4gaG9vcmF5ISAgSWYgbm90LCB0aGVuIHNvbWV0aGluZ1xuICAgICAgICAgICAgLy8gaXMgYm9ya2VkLlxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB4ZnMuc3RhdChwLCBmdW5jdGlvbiAoZXIyLCBzdGF0KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHRoZSBzdGF0IGZhaWxzLCB0aGVuIHRoYXQncyBzdXBlciB3ZWlyZC5cbiAgICAgICAgICAgICAgICAgICAgLy8gbGV0IHRoZSBvcmlnaW5hbCBlcnJvciBiZSB0aGUgZmFpbHVyZSByZWFzb24uXG4gICAgICAgICAgICAgICAgICAgIGlmIChlcjIgfHwgIXN0YXQuaXNEaXJlY3RvcnkoKSkgY2IoZXIsIG1hZGUpXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgY2IobnVsbCwgbWFkZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxubWtkaXJQLnN5bmMgPSBmdW5jdGlvbiBzeW5jIChwLCBvcHRzLCBtYWRlKSB7XG4gICAgaWYgKCFvcHRzIHx8IHR5cGVvZiBvcHRzICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBvcHRzID0geyBtb2RlOiBvcHRzIH07XG4gICAgfVxuICAgIFxuICAgIHZhciBtb2RlID0gb3B0cy5tb2RlO1xuICAgIHZhciB4ZnMgPSBvcHRzLmZzIHx8IGZzO1xuICAgIFxuICAgIGlmIChtb2RlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbW9kZSA9IF8wNzc3XG4gICAgfVxuICAgIGlmICghbWFkZSkgbWFkZSA9IG51bGw7XG5cbiAgICBwID0gcGF0aC5yZXNvbHZlKHApO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgeGZzLm1rZGlyU3luYyhwLCBtb2RlKTtcbiAgICAgICAgbWFkZSA9IG1hZGUgfHwgcDtcbiAgICB9XG4gICAgY2F0Y2ggKGVycjApIHtcbiAgICAgICAgc3dpdGNoIChlcnIwLmNvZGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ0VOT0VOVCcgOlxuICAgICAgICAgICAgICAgIG1hZGUgPSBzeW5jKHBhdGguZGlybmFtZShwKSwgb3B0cywgbWFkZSk7XG4gICAgICAgICAgICAgICAgc3luYyhwLCBvcHRzLCBtYWRlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgLy8gSW4gdGhlIGNhc2Ugb2YgYW55IG90aGVyIGVycm9yLCBqdXN0IHNlZSBpZiB0aGVyZSdzIGEgZGlyXG4gICAgICAgICAgICAvLyB0aGVyZSBhbHJlYWR5LiAgSWYgc28sIHRoZW4gaG9vcmF5ISAgSWYgbm90LCB0aGVuIHNvbWV0aGluZ1xuICAgICAgICAgICAgLy8gaXMgYm9ya2VkLlxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB2YXIgc3RhdDtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ID0geGZzLnN0YXRTeW5jKHApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZXJyMSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnIwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIXN0YXQuaXNEaXJlY3RvcnkoKSkgdGhyb3cgZXJyMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBtYWRlO1xufTtcbiIsInZhciBuYXRpdmVzID0gcHJvY2Vzcy5iaW5kaW5nKCduYXRpdmVzJylcbnZhciBtb2R1bGUgPSByZXF1aXJlKCdtb2R1bGUnKVxudmFyIG5vcm1hbFJlcXVpcmUgPSByZXF1aXJlXG5leHBvcnRzLnNvdXJjZSA9IHNyY1xuZXhwb3J0cy5yZXF1aXJlID0gcmVxXG52YXIgdm0gPSByZXF1aXJlKCd2bScpXG5cbi8vIGZhbGxiYWNrIGZvciAwLnggc3VwcG9ydFxudmFyIHJ1bkluVGhpc0NvbnRleHQsIENvbnRleHRpZnlTY3JpcHQsIFNjcmlwdFxuLyppc3RhbmJ1bCBpZ25vcmUgbmV4dCovXG50cnkge1xuICBDb250ZXh0aWZ5U2NyaXB0ID0gcHJvY2Vzcy5iaW5kaW5nKCdjb250ZXh0aWZ5JykuQ29udGV4dGlmeVNjcmlwdDtcbiAgLyppc3RhbmJ1bCBpZ25vcmUgbmV4dCovXG4gIGlmIChwcm9jZXNzLnZlcnNpb24uc3BsaXQoJy4nKVswXS5sZW5ndGggPiAyKSB7ICAvLyB2MTAuMC4wIGFuZCBhYm92ZVxuICAgIHJ1bkluVGhpc0NvbnRleHQgPSB2bS5ydW5JblRoaXNDb250ZXh0O1xuICB9IGVsc2Uge1xuICAgIHJ1bkluVGhpc0NvbnRleHQgPSBmdW5jdGlvbiBydW5JblRoaXNDb250ZXh0KGNvZGUsIG9wdGlvbnMpIHtcbiAgICAgIHZhciBzY3JpcHQgPSBuZXcgQ29udGV4dGlmeVNjcmlwdChjb2RlLCBvcHRpb25zKTtcbiAgICAgIHJldHVybiBzY3JpcHQucnVuSW5UaGlzQ29udGV4dCgpO1xuICAgIH1cbiAgfVxufSBjYXRjaCAoZXIpIHtcbiAgU2NyaXB0ID0gcHJvY2Vzcy5iaW5kaW5nKCdldmFscycpLk5vZGVTY3JpcHQ7XG4gIHJ1bkluVGhpc0NvbnRleHQgPSBTY3JpcHQucnVuSW5UaGlzQ29udGV4dDtcbn1cblxudmFyIHdyYXAgPSBbXG4gICcoZnVuY3Rpb24gKGludGVybmFsQmluZGluZykgeycgK1xuICAgICcgcmV0dXJuIGZ1bmN0aW9uIChleHBvcnRzLCByZXF1aXJlLCBtb2R1bGUsIF9fZmlsZW5hbWUsIF9fZGlybmFtZSkgeyAnLFxuICAnXFxuICB9O1xcbn0pOydcbl07XG5cblxuLy8gQmFzaWNhbGx5IHRoZSBzYW1lIGZ1bmN0aW9uYWxpdHkgYXMgbm9kZSdzIChidXJpZWQgZGVlcClcbi8vIE5hdGl2ZU1vZHVsZSBjbGFzcywgYnV0IHdpdGhvdXQgY2FjaGluZywgb3IgaW50ZXJuYWwvIGJsb2NraW5nLFxuLy8gb3IgYSBjbGFzcywgc2luY2UgdGhhdCdzIG5vdCByZWFsbHkgbmVjZXNzYXJ5LiAgSSBhc3N1bWUgdGhhdCBpZlxuLy8geW91J3JlIGxvYWRpbmcgc29tZXRoaW5nIHdpdGggdGhpcyBtb2R1bGUsIGl0J3MgYmVjYXVzZSB5b3UgV0FOVFxuLy8gYSBzZXBhcmF0ZSBjb3B5LiAgSG93ZXZlciwgdG8gcHJlc2VydmUgc2VtYW50aWNzLCBhbnkgcmVxdWlyZSgpXG4vLyBjYWxscyBtYWRlIHRocm91Z2hvdXQgdGhlIGludGVybmFsIG1vZHVsZSBsb2FkIElTIGNhY2hlZC5cbmZ1bmN0aW9uIHJlcSAoaWQsIHdoaXRlbGlzdCkge1xuICB2YXIgY2FjaGUgPSBPYmplY3QuY3JlYXRlKG51bGwpXG5cbiAgaWYgKEFycmF5LmlzQXJyYXkod2hpdGVsaXN0KSkge1xuICAgIC8vIGEgd2hpdGVsaXN0IG9mIHRoaW5ncyB0byBwdWxsIGZyb20gdGhlIFwiYWN0dWFsXCIgbmF0aXZlIG1vZHVsZXNcbiAgICB3aGl0ZWxpc3QuZm9yRWFjaChmdW5jdGlvbiAoaWQpIHtcbiAgICAgIGNhY2hlW2lkXSA9IHtcbiAgICAgICAgbG9hZGluZzogZmFsc2UsXG4gICAgICAgIGxvYWRlZDogdHJ1ZSxcbiAgICAgICAgZmlsZW5hbWU6IGlkICsgJy5qcycsXG4gICAgICAgIGV4cG9ydHM6IHJlcXVpcmUoaWQpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIHJldHVybiByZXFfKGlkLCBjYWNoZSlcbn1cblxuZnVuY3Rpb24gcmVxXyAoaWQsIGNhY2hlKSB7XG4gIC8vIEJ1ZmZlciBpcyBzcGVjaWFsLCBiZWNhdXNlIGl0J3MgYSB0eXBlIHJhdGhlciB0aGFuIGEgXCJub3JtYWxcIlxuICAvLyBjbGFzcywgYW5kIG1hbnkgdGhpbmdzIGRlcGVuZCBvbiBgQnVmZmVyLmlzQnVmZmVyYCB3b3JraW5nLlxuICBpZiAoaWQgPT09ICdidWZmZXInKSB7XG4gICAgcmV0dXJuIHJlcXVpcmUoJ2J1ZmZlcicpXG4gIH1cblxuICAvLyBuYXRpdmVfbW9kdWxlIGlzbid0IGFjdHVhbGx5IGEgbmF0aXZlcyBiaW5kaW5nLlxuICAvLyB3ZWlyZCwgcmlnaHQ/XG4gIGlmIChpZCA9PT0gJ25hdGl2ZV9tb2R1bGUnKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGdldFNvdXJjZTogc3JjLFxuICAgICAgd3JhcDogZnVuY3Rpb24gKHNjcmlwdCkge1xuICAgICAgICByZXR1cm4gd3JhcFswXSArIHNjcmlwdCArIHdyYXBbMV1cbiAgICAgIH0sXG4gICAgICB3cmFwcGVyOiB3cmFwLFxuICAgICAgX2NhY2hlOiBjYWNoZSxcbiAgICAgIF9zb3VyY2U6IG5hdGl2ZXMsXG4gICAgICBub25JbnRlcm5hbEV4aXN0czogZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIHJldHVybiBpZC5pbmRleE9mKCdpbnRlcm5hbC8nKSAhPT0gMDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB2YXIgc291cmNlID0gc3JjKGlkKVxuICBpZiAoIXNvdXJjZSkge1xuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxuICBzb3VyY2UgPSB3cmFwWzBdICsgc291cmNlICsgd3JhcFsxXVxuXG4gIHZhciBpbnRlcm5hbEJpbmRpbmcgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgaWYgKG5hbWUgPT09ICd0eXBlcycpIHtcbiAgICAgIHJldHVybiBwcm9jZXNzLmJpbmRpbmcoJ3V0aWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHByb2Nlc3MuYmluZGluZyhuYW1lKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuICB9XG5cbiAgdmFyIGNhY2hpbmdSZXF1aXJlID0gZnVuY3Rpb24gcmVxdWlyZSAoaWQpIHtcbiAgICBpZiAoY2FjaGVbaWRdKSB7XG4gICAgICByZXR1cm4gY2FjaGVbaWRdLmV4cG9ydHNcbiAgICB9XG4gICAgaWYgKGlkID09PSAnaW50ZXJuYWwvYm9vdHN0cmFwL2xvYWRlcnMnIHx8IGlkID09PSAnaW50ZXJuYWwvcHJvY2VzcycpIHtcbiAgICAgIC8vIFByb3ZpZGUganVzdCBlbm91Z2ggdG8ga2VlcCBgZ3JhY2VmdWwtZnNAM2Agd29ya2luZyBhbmQgdGVzdHMgcGFzc2luZy5cbiAgICAgIC8vIEZvciBub3cuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBpbnRlcm5hbEJpbmRpbmc6IGludGVybmFsQmluZGluZyxcbiAgICAgICAgTmF0aXZlTW9kdWxlOiB7XG4gICAgICAgICAgX3NvdXJjZTogcHJvY2Vzcy5iaW5kaW5nKCduYXRpdmVzJyksXG4gICAgICAgICAgbm9uSW50ZXJuYWxFeGlzdHM6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgICAgICByZXR1cm4gIWlkLnN0YXJ0c1dpdGgoJ2ludGVybmFsLycpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcV8oaWQsIGNhY2hlKVxuICB9XG5cbiAgdmFyIG5tID0ge1xuICAgIGV4cG9ydHM6IHt9LFxuICAgIGxvYWRpbmc6IHRydWUsXG4gICAgbG9hZGVkOiBmYWxzZSxcbiAgICBmaWxlbmFtZTogaWQgKyAnLmpzJ1xuICB9XG4gIGNhY2hlW2lkXSA9IG5tXG4gIHZhciBmblxuICB2YXIgc2V0VjhGbGFncyA9IGZhbHNlXG4gIHRyeSB7XG4gICAgcmVxdWlyZSgndjgnKS5zZXRGbGFnc0Zyb21TdHJpbmcoJy0tYWxsb3dfbmF0aXZlc19zeW50YXgnKVxuICAgIHNldFY4RmxhZ3MgPSB0cnVlXG4gIH0gY2F0Y2ggKGUpIHt9XG4gIHRyeSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICBpZiAoQ29udGV4dGlmeVNjcmlwdCkge1xuICAgICAgZm4gPSBydW5JblRoaXNDb250ZXh0KHNvdXJjZSwge1xuICAgICAgICBmaWxlbmFtZTogbm0uZmlsZW5hbWUsXG4gICAgICAgIGxpbmVPZmZzZXQ6IDAsXG4gICAgICAgIGRpc3BsYXlFcnJvcnM6IHRydWVcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBmbiA9IHJ1bkluVGhpc0NvbnRleHQoc291cmNlLCBubS5maWxlbmFtZSwgdHJ1ZSk7XG4gICAgfVxuICAgIGZuKGludGVybmFsQmluZGluZykobm0uZXhwb3J0cywgY2FjaGluZ1JlcXVpcmUsIG5tLCBubS5maWxlbmFtZSwgJzxubyBkaXJuYW1lIGF2YWlsYWJsZT4nKVxuICAgIG5tLmxvYWRlZCA9IHRydWVcbiAgfSBmaW5hbGx5IHtcbiAgICBubS5sb2FkaW5nID0gZmFsc2VcbiAgICAvKmlzdGFuYnVsIGlnbm9yZSBuZXh0Ki9cbiAgICBpZiAoc2V0VjhGbGFncykge1xuICAgICAgLy8gUmVmOiBodHRwczovL2dpdGh1Yi5jb20vbm9kZWpzL25vZGUvYmxvYi81OTFhMjRiODE5ZDUzYTU1NTQ2M2IxY2JmOTI5MGE2ZDhiY2MxYmNiL2xpYi9pbnRlcm5hbC9ib290c3RyYXBfbm9kZS5qcyNMNDI5LUw0MzRcbiAgICAgIHZhciByZSA9IC9eLS1hbGxvd1stX11uYXRpdmVzWy1fXXN5bnRheCQvXG4gICAgICBpZiAoIXByb2Nlc3MuZXhlY0FyZ3Yuc29tZShmdW5jdGlvbiAocykgeyByZXR1cm4gcmUudGVzdChzKSB9KSlcbiAgICAgICAgcmVxdWlyZSgndjgnKS5zZXRGbGFnc0Zyb21TdHJpbmcoJy0tbm9hbGxvd19uYXRpdmVzX3N5bnRheCcpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5tLmV4cG9ydHNcbn1cblxuZnVuY3Rpb24gc3JjIChpZCkge1xuICByZXR1cm4gbmF0aXZlc1tpZF1cbn1cbiIsImZ1bmN0aW9uIHdlYnBhY2tFbXB0eUNvbnRleHQocmVxKSB7XG5cdHZhciBlID0gbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIiArIHJlcSArIFwiJ1wiKTtcblx0ZS5jb2RlID0gJ01PRFVMRV9OT1RfRk9VTkQnO1xuXHR0aHJvdyBlO1xufVxud2VicGFja0VtcHR5Q29udGV4dC5rZXlzID0gKCkgPT4gKFtdKTtcbndlYnBhY2tFbXB0eUNvbnRleHQucmVzb2x2ZSA9IHdlYnBhY2tFbXB0eUNvbnRleHQ7XG53ZWJwYWNrRW1wdHlDb250ZXh0LmlkID0gMTM5Mztcbm1vZHVsZS5leHBvcnRzID0gd2VicGFja0VtcHR5Q29udGV4dDsiLCJ2YXIgd3JhcHB5ID0gcmVxdWlyZSgnd3JhcHB5Jylcbm1vZHVsZS5leHBvcnRzID0gd3JhcHB5KG9uY2UpXG5tb2R1bGUuZXhwb3J0cy5zdHJpY3QgPSB3cmFwcHkob25jZVN0cmljdClcblxub25jZS5wcm90byA9IG9uY2UoZnVuY3Rpb24gKCkge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoRnVuY3Rpb24ucHJvdG90eXBlLCAnb25jZScsIHtcbiAgICB2YWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG9uY2UodGhpcylcbiAgICB9LFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICB9KVxuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShGdW5jdGlvbi5wcm90b3R5cGUsICdvbmNlU3RyaWN0Jywge1xuICAgIHZhbHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gb25jZVN0cmljdCh0aGlzKVxuICAgIH0sXG4gICAgY29uZmlndXJhYmxlOiB0cnVlXG4gIH0pXG59KVxuXG5mdW5jdGlvbiBvbmNlIChmbikge1xuICB2YXIgZiA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoZi5jYWxsZWQpIHJldHVybiBmLnZhbHVlXG4gICAgZi5jYWxsZWQgPSB0cnVlXG4gICAgcmV0dXJuIGYudmFsdWUgPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gIH1cbiAgZi5jYWxsZWQgPSBmYWxzZVxuICByZXR1cm4gZlxufVxuXG5mdW5jdGlvbiBvbmNlU3RyaWN0IChmbikge1xuICB2YXIgZiA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoZi5jYWxsZWQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoZi5vbmNlRXJyb3IpXG4gICAgZi5jYWxsZWQgPSB0cnVlXG4gICAgcmV0dXJuIGYudmFsdWUgPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gIH1cbiAgdmFyIG5hbWUgPSBmbi5uYW1lIHx8ICdGdW5jdGlvbiB3cmFwcGVkIHdpdGggYG9uY2VgJ1xuICBmLm9uY2VFcnJvciA9IG5hbWUgKyBcIiBzaG91bGRuJ3QgYmUgY2FsbGVkIG1vcmUgdGhhbiBvbmNlXCJcbiAgZi5jYWxsZWQgPSBmYWxzZVxuICByZXR1cm4gZlxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBvdmVybG9hZERlZnNcbi8vIHNlbGYsIG92ZXJsb2FkRGVmc1xudmFyIG92ZXJsb2FkID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmLCBzZWxmU2V0ID0gZmFsc2UsIG92ZXJsb2FkRGVmcztcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICBvdmVybG9hZERlZnMgPSBhcmd1bWVudHNbMF07XG4gIH0gZWxzZSB7XG4gICAgc2VsZlNldCA9IHRydWU7XG4gICAgc2VsZiA9IGFyZ3VtZW50c1swXTtcbiAgICBvdmVybG9hZERlZnMgPSBhcmd1bWVudHNbMV07XG4gIH1cbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXNlbGZTZXQpIHtcbiAgICAgIHNlbGYgPSB0aGlzO1xuICAgIH1cbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgdmFyIG92ZXJsb2FkTWF0Y2hEYXRhID0gZmluZE92ZXJsb2FkKG92ZXJsb2FkRGVmcywgYXJncyk7XG4gICAgaWYgKCFvdmVybG9hZE1hdGNoRGF0YSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGNyZWF0ZUVycm9yTWVzc2FnZSgnTm8gbWF0Y2ggZm91bmQuJywgb3ZlcmxvYWREZWZzKSk7XG4gICAgfVxuICAgIHZhciBvdmVybG9hZEZuID0gb3ZlcmxvYWRNYXRjaERhdGEuZGVmW292ZXJsb2FkTWF0Y2hEYXRhLmRlZi5sZW5ndGggLSAxXTtcbiAgICByZXR1cm4gb3ZlcmxvYWRGbi5hcHBseShzZWxmLCBvdmVybG9hZE1hdGNoRGF0YS5hcmdzKTtcbiAgfTtcbn07XG5cbnZhciBmaW5kT3ZlcmxvYWQgPSBvdmVybG9hZC5maW5kT3ZlcmxvYWQgPSBmdW5jdGlvbiAob3ZlcmxvYWREZWZzLCBhcmdzKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgb3ZlcmxvYWREZWZzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGkgPT09IG92ZXJsb2FkRGVmcy5sZW5ndGggLSAxICYmIHR5cGVvZihvdmVybG9hZERlZnNbaV0pID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4geyBhcmdzOiBhcmdzLCBkZWY6IFtvdmVybG9hZERlZnNbaV1dIH07XG4gICAgfVxuICAgIHZhciBuZXdBcmdzO1xuICAgIGlmIChuZXdBcmdzID0gaXNNYXRjaChvdmVybG9hZERlZnNbaV0sIGFyZ3MpKSB7XG4gICAgICByZXR1cm4geyBhcmdzOiBuZXdBcmdzLCBkZWY6IG92ZXJsb2FkRGVmc1tpXSB9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn07XG5cbmZ1bmN0aW9uIGlzTWF0Y2gob3ZlcmxvYWREZWYsIGFyZ3MpIHtcbiAgdmFyIG92ZXJsb2FkRGVmSWR4O1xuICB2YXIgYXJnSWR4O1xuICB2YXIgbmV3QXJncyA9IFtdO1xuICBmb3IgKG92ZXJsb2FkRGVmSWR4ID0gMCwgYXJnSWR4ID0gMDsgb3ZlcmxvYWREZWZJZHggPCBvdmVybG9hZERlZi5sZW5ndGggLSAxOyBvdmVybG9hZERlZklkeCsrKSB7XG4gICAgaWYgKHR5cGVvZihvdmVybG9hZERlZltvdmVybG9hZERlZklkeF0pICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIG92ZXJsb2FkIGRlZmluaXRpb24uIEFycmF5IHNob3VsZCBvbmx5IGNvbnRhaW4gZnVuY3Rpb25zLlwiKTtcbiAgICB9XG4gICAgLy9jb25zb2xlLmxvZygnb3ZlcmxvYWREZWYvYXJnOicsIG92ZXJsb2FkRGVmW292ZXJsb2FkRGVmSWR4XSwgYXJnc1thcmdJZHhdKTtcbiAgICB2YXIgcmVzdWx0ID0gb3ZlcmxvYWREZWZbb3ZlcmxvYWREZWZJZHhdKGFyZ3NbYXJnSWR4XSk7XG4gICAgLy9jb25zb2xlLmxvZygncmVzdWx0OicsIHJlc3VsdCk7XG4gICAgaWYgKHJlc3VsdCkge1xuICAgICAgaWYgKHJlc3VsdC5oYXNPd25Qcm9wZXJ0eSgnZGVmYXVsdFZhbHVlJykpIHtcbiAgICAgICAgbmV3QXJncy5wdXNoKHJlc3VsdC5kZWZhdWx0VmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKG92ZXJsb2FkRGVmW292ZXJsb2FkRGVmSWR4XS5vcHRpb25hbCAmJiBhcmdzW2FyZ0lkeF0gPT09IG51bGwpIHtcbiAgICAgICAgICBhcmdJZHgrKztcbiAgICAgICAgICBuZXdBcmdzLnB1c2gob3ZlcmxvYWREZWZbb3ZlcmxvYWREZWZJZHhdLmRlZmF1bHRWYWx1ZSk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgbmV3QXJncy5wdXNoKGFyZ3NbYXJnSWR4XSk7XG4gICAgICAgIGFyZ0lkeCsrO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAob3ZlcmxvYWREZWZbb3ZlcmxvYWREZWZJZHhdLm9wdGlvbmFsKSB7XG4gICAgICAgIG5ld0FyZ3MucHVzaChvdmVybG9hZERlZltvdmVybG9hZERlZklkeF0uZGVmYXVsdFZhbHVlKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIC8vY29uc29sZS5sb2coJ2NvbXBhcmVzJywgb3ZlcmxvYWREZWZJZHgsIG92ZXJsb2FkRGVmLmxlbmd0aCAtIDEsIGFyZ0lkeCwgYXJncy5sZW5ndGgsIG5ld0FyZ3MubGVuZ3RoKTtcbiAgaWYgKG92ZXJsb2FkRGVmSWR4ID09PSBvdmVybG9hZERlZi5sZW5ndGggLSAxICYmIGFyZ0lkeCA+PSBhcmdzLmxlbmd0aCkge1xuICAgIHJldHVybiBuZXdBcmdzO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlRXJyb3JNZXNzYWdlKG1lc3NhZ2UsIG92ZXJsb2FkRGVmcykge1xuICBtZXNzYWdlICs9ICdcXG4nO1xuICBtZXNzYWdlICs9ICcgIFBvc3NpYmxlIG1hdGNoZXM6XFxuJztcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBvdmVybG9hZERlZnMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgb3ZlcmxvYWREZWYgPSBvdmVybG9hZERlZnNbaV07XG4gICAgaWYgKHR5cGVvZihvdmVybG9hZERlZikgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIG1lc3NhZ2UgKz0gJyAgIFtkZWZhdWx0XVxcbic7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBtYXRjaGVycyA9IG92ZXJsb2FkRGVmLnNsaWNlKDAsIG92ZXJsb2FkRGVmLmxlbmd0aCAtIDEpO1xuICAgICAgbWF0Y2hlcnMgPSBtYXRjaGVycy5tYXAoZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgaWYgKCFtKSB7XG4gICAgICAgICAgcmV0dXJuICdbaW52YWxpZCBhcmd1bWVudCBkZWZpbml0aW9uXSc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG0ubmFtZSB8fCBtO1xuICAgICAgfSk7XG4gICAgICBpZiAobWF0Y2hlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIG1lc3NhZ2UgKz0gJyAgICgpXFxuJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1lc3NhZ2UgKz0gJyAgICgnICsgbWF0Y2hlcnMuam9pbignLCAnKSArICcpXFxuJztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG1lc3NhZ2U7XG59XG5cbi8vIC0tLSBmdW5jXG5vdmVybG9hZC5mdW5jID0gZnVuY3Rpb24gZnVuYyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZihhcmcpID09PSAnZnVuY3Rpb24nO1xufTtcblxub3ZlcmxvYWQuZnVuY09wdGlvbmFsID0gZnVuY3Rpb24gZnVuY09wdGlvbmFsKGFyZykge1xuICBpZiAoIWFyZykge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBvdmVybG9hZC5mdW5jKGFyZyk7XG59O1xub3ZlcmxvYWQuZnVuY09wdGlvbmFsLm9wdGlvbmFsID0gdHJ1ZTtcblxub3ZlcmxvYWQuZnVuY09wdGlvbmFsV2l0aERlZmF1bHQgPSBmdW5jdGlvbiAoZGVmKSB7XG4gIHZhciBmbiA9IGZ1bmN0aW9uIGZ1bmNPcHRpb25hbFdpdGhEZWZhdWx0KGFyZykge1xuICAgIGlmIChhcmcgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gb3ZlcmxvYWQuZnVuYyhhcmcpO1xuICB9O1xuICBmbi5vcHRpb25hbCA9IHRydWU7XG4gIGZuLmRlZmF1bHRWYWx1ZSA9IGRlZjtcbiAgcmV0dXJuIGZuO1xufTtcblxuLy8gLS0tIGNhbGxiYWNrXG5vdmVybG9hZC5jYWxsYmFja09wdGlvbmFsID0gZnVuY3Rpb24gY2FsbGJhY2tPcHRpb25hbChhcmcpIHtcbiAgaWYgKCFhcmcpIHtcbiAgICByZXR1cm4geyBkZWZhdWx0VmFsdWU6IGZ1bmN0aW9uIGRlZmF1bHRDYWxsYmFjaygpIHt9IH07XG4gIH1cbiAgcmV0dXJuIG92ZXJsb2FkLmZ1bmMoYXJnKTtcbn07XG5vdmVybG9hZC5jYWxsYmFja09wdGlvbmFsLm9wdGlvbmFsID0gdHJ1ZTtcblxuLy8gLS0tIHN0cmluZ1xub3ZlcmxvYWQuc3RyaW5nID0gZnVuY3Rpb24gc3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mKGFyZykgPT09ICdzdHJpbmcnO1xufTtcblxub3ZlcmxvYWQuc3RyaW5nT3B0aW9uYWwgPSBmdW5jdGlvbiBzdHJpbmdPcHRpb25hbChhcmcpIHtcbiAgaWYgKCFhcmcpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gb3ZlcmxvYWQuc3RyaW5nKGFyZyk7XG59O1xub3ZlcmxvYWQuc3RyaW5nT3B0aW9uYWwub3B0aW9uYWwgPSB0cnVlO1xuXG5vdmVybG9hZC5zdHJpbmdPcHRpb25hbFdpdGhEZWZhdWx0ID0gZnVuY3Rpb24gKGRlZikge1xuICB2YXIgZm4gPSBmdW5jdGlvbiBzdHJpbmdPcHRpb25hbFdpdGhEZWZhdWx0KGFyZykge1xuICAgIGlmIChhcmcgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gb3ZlcmxvYWQuc3RyaW5nKGFyZyk7XG4gIH07XG4gIGZuLm9wdGlvbmFsID0gdHJ1ZTtcbiAgZm4uZGVmYXVsdFZhbHVlID0gZGVmO1xuICByZXR1cm4gZm47XG59O1xuXG4vLyAtLS0gbnVtYmVyXG5vdmVybG9hZC5udW1iZXIgPSBmdW5jdGlvbiBudW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YoYXJnKSA9PT0gJ251bWJlcic7XG59O1xuXG5vdmVybG9hZC5udW1iZXJPcHRpb25hbCA9IGZ1bmN0aW9uIG51bWJlck9wdGlvbmFsKGFyZykge1xuICBpZiAoIWFyZykge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBvdmVybG9hZC5udW1iZXIoYXJnKTtcbn07XG5vdmVybG9hZC5udW1iZXJPcHRpb25hbC5vcHRpb25hbCA9IHRydWU7XG5cbm92ZXJsb2FkLm51bWJlck9wdGlvbmFsV2l0aERlZmF1bHQgPSBmdW5jdGlvbiAoZGVmKSB7XG4gIHZhciBmbiA9IGZ1bmN0aW9uIG51bWJlck9wdGlvbmFsV2l0aERlZmF1bHQoYXJnKSB7XG4gICAgaWYgKGFyZyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBvdmVybG9hZC5udW1iZXIoYXJnKTtcbiAgfTtcbiAgZm4ub3B0aW9uYWwgPSB0cnVlO1xuICBmbi5kZWZhdWx0VmFsdWUgPSBkZWY7XG4gIHJldHVybiBmbjtcbn07XG5cbi8vIC0tLSBhcnJheVxub3ZlcmxvYWQuYXJyYXkgPSBmdW5jdGlvbiBhcnJheShhcmcpIHtcbiAgcmV0dXJuIGFyZyBpbnN0YW5jZW9mIEFycmF5O1xufTtcblxub3ZlcmxvYWQuYXJyYXlPcHRpb25hbCA9IGZ1bmN0aW9uIGFycmF5T3B0aW9uYWwoYXJnKSB7XG4gIGlmICghYXJnKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIG92ZXJsb2FkLmFycmF5KGFyZyk7XG59O1xub3ZlcmxvYWQuYXJyYXlPcHRpb25hbC5vcHRpb25hbCA9IHRydWU7XG5cbm92ZXJsb2FkLmFycmF5T3B0aW9uYWxXaXRoRGVmYXVsdCA9IGZ1bmN0aW9uIChkZWYpIHtcbiAgdmFyIGZuID0gZnVuY3Rpb24gYXJyYXlPcHRpb25hbFdpdGhEZWZhdWx0KGFyZykge1xuICAgIGlmIChhcmcgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gb3ZlcmxvYWQuYXJyYXkoYXJnKTtcbiAgfTtcbiAgZm4ub3B0aW9uYWwgPSB0cnVlO1xuICBmbi5kZWZhdWx0VmFsdWUgPSBkZWY7XG4gIHJldHVybiBmbjtcbn07XG5cbi8vIC0tLSBvYmplY3Rcbm92ZXJsb2FkLm9iamVjdCA9IGZ1bmN0aW9uIG9iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZihhcmcpID09PSAnb2JqZWN0Jztcbn07XG5cbm92ZXJsb2FkLm9iamVjdE9wdGlvbmFsID0gZnVuY3Rpb24gb2JqZWN0T3B0aW9uYWwoYXJnKSB7XG4gIGlmICghYXJnKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIG92ZXJsb2FkLm9iamVjdChhcmcpO1xufTtcbm92ZXJsb2FkLm9iamVjdE9wdGlvbmFsLm9wdGlvbmFsID0gdHJ1ZTtcblxub3ZlcmxvYWQub2JqZWN0T3B0aW9uYWxXaXRoRGVmYXVsdCA9IGZ1bmN0aW9uIChkZWYpIHtcbiAgdmFyIGZuID0gZnVuY3Rpb24gb2JqZWN0T3B0aW9uYWxXaXRoRGVmYXVsdChhcmcpIHtcbiAgICBpZiAoYXJnID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIG92ZXJsb2FkLm9iamVjdChhcmcpO1xuICB9O1xuICBmbi5vcHRpb25hbCA9IHRydWU7XG4gIGZuLmRlZmF1bHRWYWx1ZSA9IGRlZjtcbiAgcmV0dXJuIGZuO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gcG9zaXgocGF0aCkge1xuXHRyZXR1cm4gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbn1cblxuZnVuY3Rpb24gd2luMzIocGF0aCkge1xuXHQvLyBodHRwczovL2dpdGh1Yi5jb20vbm9kZWpzL25vZGUvYmxvYi9iM2ZjYzI0NWZiMjU1Mzk5MDllZjFkNWVhYTAxZGJmOTJlMTY4NjMzL2xpYi9wYXRoLmpzI0w1NlxuXHR2YXIgc3BsaXREZXZpY2VSZSA9IC9eKFthLXpBLVpdOnxbXFxcXFxcL117Mn1bXlxcXFxcXC9dK1tcXFxcXFwvXStbXlxcXFxcXC9dKyk/KFtcXFxcXFwvXSk/KFtcXHNcXFNdKj8pJC87XG5cdHZhciByZXN1bHQgPSBzcGxpdERldmljZVJlLmV4ZWMocGF0aCk7XG5cdHZhciBkZXZpY2UgPSByZXN1bHRbMV0gfHwgJyc7XG5cdHZhciBpc1VuYyA9IEJvb2xlYW4oZGV2aWNlICYmIGRldmljZS5jaGFyQXQoMSkgIT09ICc6Jyk7XG5cblx0Ly8gVU5DIHBhdGhzIGFyZSBhbHdheXMgYWJzb2x1dGVcblx0cmV0dXJuIEJvb2xlYW4ocmVzdWx0WzJdIHx8IGlzVW5jKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInID8gd2luMzIgOiBwb3NpeDtcbm1vZHVsZS5leHBvcnRzLnBvc2l4ID0gcG9zaXg7XG5tb2R1bGUuZXhwb3J0cy53aW4zMiA9IHdpbjMyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFB1bGxTdHJlYW07XG5cbnJlcXVpcmUoXCJzZXRpbW1lZGlhdGVcIik7XG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwidXRpbFwiKS5pbmhlcml0cztcbnZhciBQYXNzVGhyb3VnaCA9IHJlcXVpcmUoJ3JlYWRhYmxlLXN0cmVhbS9wYXNzdGhyb3VnaCcpO1xudmFyIG92ZXIgPSByZXF1aXJlKCdvdmVyJyk7XG52YXIgU2xpY2VTdHJlYW0gPSByZXF1aXJlKCdzbGljZS1zdHJlYW0nKTtcblxuZnVuY3Rpb24gUHVsbFN0cmVhbShvcHRzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5vcHRzID0gb3B0cyB8fCB7fTtcbiAgUGFzc1Rocm91Z2guY2FsbCh0aGlzLCBvcHRzKTtcbiAgdGhpcy5vbmNlKCdmaW5pc2gnLCBmdW5jdGlvbigpIHtcbiAgICBzZWxmLl93cml0ZXNGaW5pc2hlZCA9IHRydWU7XG4gICAgaWYgKHNlbGYuX2ZsdXNoZWQpIHtcbiAgICAgIHNlbGYuX2ZpbmlzaCgpO1xuICAgIH1cbiAgfSk7XG4gIHRoaXMub24oJ3JlYWRhYmxlJywgZnVuY3Rpb24oKSB7XG4gICAgc2VsZi5fcHJvY2VzcygpO1xuICB9KTtcbn1cbmluaGVyaXRzKFB1bGxTdHJlYW0sIFBhc3NUaHJvdWdoKTtcblxuUHVsbFN0cmVhbS5wcm90b3R5cGUucHVsbCA9IG92ZXIoW1xuICBbb3Zlci5udW1iZXJPcHRpb25hbFdpdGhEZWZhdWx0KG51bGwpLCBvdmVyLmZ1bmMsIGZ1bmN0aW9uIChsZW4sIGNhbGxiYWNrKSB7XG4gICAgaWYgKGxlbiA9PT0gMCkge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIG5ldyBCdWZmZXIoMCkpO1xuICAgIH1cblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBwdWxsU2VydmljZVJlcXVlc3QoKTtcblxuICAgIGZ1bmN0aW9uIHB1bGxTZXJ2aWNlUmVxdWVzdCgpIHtcbiAgICAgIHNlbGYuX3NlcnZpY2VSZXF1ZXN0cyA9IG51bGw7XG4gICAgICBpZiAoc2VsZi5fZmx1c2hlZCkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdFbmQgb2YgU3RyZWFtJykpO1xuICAgICAgfVxuXG4gICAgICB2YXIgZGF0YSA9IHNlbGYucmVhZChsZW4gfHwgdW5kZWZpbmVkKTtcbiAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgIHNldEltbWVkaWF0ZShjYWxsYmFjay5iaW5kKG51bGwsIG51bGwsIGRhdGEpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYuX3NlcnZpY2VSZXF1ZXN0cyA9IHB1bGxTZXJ2aWNlUmVxdWVzdDtcbiAgICAgIH1cbiAgICB9XG4gIH1dXG5dKTtcblxuUHVsbFN0cmVhbS5wcm90b3R5cGUucHVsbFVwVG8gPSBvdmVyKFtcbiAgW292ZXIubnVtYmVyT3B0aW9uYWxXaXRoRGVmYXVsdChudWxsKSwgZnVuY3Rpb24gKGxlbikge1xuICAgIHZhciBkYXRhID0gdGhpcy5yZWFkKGxlbik7XG4gICAgaWYgKGxlbiAmJiAhZGF0YSkge1xuICAgICAgZGF0YSA9IHRoaXMucmVhZCgpO1xuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbiAgfV1cbl0pO1xuXG5QdWxsU3RyZWFtLnByb3RvdHlwZS5waXBlID0gb3ZlcihbXG4gIFtvdmVyLm51bWJlck9wdGlvbmFsV2l0aERlZmF1bHQobnVsbCksIG92ZXIub2JqZWN0LCBmdW5jdGlvbiAobGVuLCBkZXN0U3RyZWFtKSB7XG4gICAgaWYgKCFsZW4pIHtcbiAgICAgIHJldHVybiBQYXNzVGhyb3VnaC5wcm90b3R5cGUucGlwZS5jYWxsKHRoaXMsIGRlc3RTdHJlYW0pO1xuICAgIH1cblxuICAgIGlmIChsZW4gPT09IDApIHtcbiAgICAgIHJldHVybiBkZXN0U3RyZWFtLmVuZCgpO1xuICAgIH1cblxuXG4gICAgdmFyIHB1bGxzdHJlYW0gPSB0aGlzO1xuICAgIHB1bGxzdHJlYW1cbiAgICAgIC5waXBlKG5ldyBTbGljZVN0cmVhbSh7IGxlbmd0aDogbGVuIH0sIGZ1bmN0aW9uIChidWYsIHNsaWNlRW5kLCBleHRyYSkge1xuICAgICAgICBpZiAoIXNsaWNlRW5kKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucHVzaChidWYpO1xuICAgICAgICB9XG4gICAgICAgIHB1bGxzdHJlYW0udW5waXBlKCk7XG4gICAgICAgIHB1bGxzdHJlYW0udW5zaGlmdChleHRyYSk7XG4gICAgICAgIHRoaXMucHVzaChidWYpO1xuICAgICAgICByZXR1cm4gdGhpcy5wdXNoKG51bGwpO1xuICAgICAgfSkpXG4gICAgICAucGlwZShkZXN0U3RyZWFtKTtcblxuICAgIHJldHVybiBkZXN0U3RyZWFtO1xuICB9XVxuXSk7XG5cblB1bGxTdHJlYW0ucHJvdG90eXBlLl9wcm9jZXNzID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5fc2VydmljZVJlcXVlc3RzKSB7XG4gICAgdGhpcy5fc2VydmljZVJlcXVlc3RzKCk7XG4gIH1cbn07XG5cblB1bGxTdHJlYW0ucHJvdG90eXBlLnByZXBlbmQgPSBmdW5jdGlvbiAoY2h1bmspIHtcbiAgdGhpcy51bnNoaWZ0KGNodW5rKTtcbn07XG5cblB1bGxTdHJlYW0ucHJvdG90eXBlLmRyYWluID0gZnVuY3Rpb24gKGxlbiwgY2FsbGJhY2spIHtcbiAgaWYgKHRoaXMuX2ZsdXNoZWQpIHtcbiAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdFbmQgb2YgU3RyZWFtJykpO1xuICB9XG5cbiAgdmFyIGRhdGEgPSB0aGlzLnB1bGxVcFRvKGxlbik7XG4gIHZhciBieXRlc0RyYWluZWQgPSBkYXRhICYmIGRhdGEubGVuZ3RoIHx8IDA7XG4gIGlmIChieXRlc0RyYWluZWQgPT09IGxlbikge1xuICAgICBzZXRJbW1lZGlhdGUoY2FsbGJhY2spO1xuICB9IGVsc2UgaWYgKGJ5dGVzRHJhaW5lZCA+IDApIHtcbiAgICB0aGlzLmRyYWluKGxlbiAtIGJ5dGVzRHJhaW5lZCwgY2FsbGJhY2spO1xuICB9IGVsc2Uge1xuICAgIC8vaW50ZXJuYWwgYnVmZmVyIGlzIGVtcHR5LCB3YWl0IHVudGlsIGRhdGEgY2FuIGJlIGNvbnN1bWVkXG4gICAgdGhpcy5vbmNlKCdyZWFkYWJsZScsIHRoaXMuZHJhaW4uYmluZCh0aGlzLCBsZW4gLSBieXRlc0RyYWluZWQsIGNhbGxiYWNrKSk7XG4gIH1cbn07XG5cblB1bGxTdHJlYW0ucHJvdG90eXBlLl9mbHVzaCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICh0aGlzLl9yZWFkYWJsZVN0YXRlLmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gc2V0SW1tZWRpYXRlKHNlbGYuX2ZsdXNoLmJpbmQoc2VsZiwgY2FsbGJhY2spKTtcbiAgfVxuXG4gIHRoaXMuX2ZsdXNoZWQgPSB0cnVlO1xuICBpZiAoc2VsZi5fd3JpdGVzRmluaXNoZWQpIHtcbiAgICBzZWxmLl9maW5pc2goY2FsbGJhY2spO1xuICB9IGVsc2Uge1xuICAgIGNhbGxiYWNrKCk7XG4gIH1cbn07XG5cblB1bGxTdHJlYW0ucHJvdG90eXBlLl9maW5pc2ggPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgaWYgKHRoaXMuX3NlcnZpY2VSZXF1ZXN0cykge1xuICAgIHRoaXMuX3NlcnZpY2VSZXF1ZXN0cygpO1xuICB9XG4gIHNldEltbWVkaWF0ZShjYWxsYmFjayk7XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIGEgZHVwbGV4IHN0cmVhbSBpcyBqdXN0IGEgc3RyZWFtIHRoYXQgaXMgYm90aCByZWFkYWJsZSBhbmQgd3JpdGFibGUuXG4vLyBTaW5jZSBKUyBkb2Vzbid0IGhhdmUgbXVsdGlwbGUgcHJvdG90eXBhbCBpbmhlcml0YW5jZSwgdGhpcyBjbGFzc1xuLy8gcHJvdG90eXBhbGx5IGluaGVyaXRzIGZyb20gUmVhZGFibGUsIGFuZCB0aGVuIHBhcmFzaXRpY2FsbHkgZnJvbVxuLy8gV3JpdGFibGUuXG5cbm1vZHVsZS5leHBvcnRzID0gRHVwbGV4O1xuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIG9iamVjdEtleXMgPSBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqKSB7XG4gIHZhciBrZXlzID0gW107XG4gIGZvciAodmFyIGtleSBpbiBvYmopIGtleXMucHVzaChrZXkpO1xuICByZXR1cm4ga2V5cztcbn1cbi8qPC9yZXBsYWNlbWVudD4qL1xuXG5cbi8qPHJlcGxhY2VtZW50PiovXG52YXIgdXRpbCA9IHJlcXVpcmUoJ2NvcmUtdXRpbC1pcycpO1xudXRpbC5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxudmFyIFJlYWRhYmxlID0gcmVxdWlyZSgnLi9fc3RyZWFtX3JlYWRhYmxlJyk7XG52YXIgV3JpdGFibGUgPSByZXF1aXJlKCcuL19zdHJlYW1fd3JpdGFibGUnKTtcblxudXRpbC5pbmhlcml0cyhEdXBsZXgsIFJlYWRhYmxlKTtcblxuZm9yRWFjaChvYmplY3RLZXlzKFdyaXRhYmxlLnByb3RvdHlwZSksIGZ1bmN0aW9uKG1ldGhvZCkge1xuICBpZiAoIUR1cGxleC5wcm90b3R5cGVbbWV0aG9kXSlcbiAgICBEdXBsZXgucHJvdG90eXBlW21ldGhvZF0gPSBXcml0YWJsZS5wcm90b3R5cGVbbWV0aG9kXTtcbn0pO1xuXG5mdW5jdGlvbiBEdXBsZXgob3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRHVwbGV4KSlcbiAgICByZXR1cm4gbmV3IER1cGxleChvcHRpb25zKTtcblxuICBSZWFkYWJsZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuICBXcml0YWJsZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMucmVhZGFibGUgPT09IGZhbHNlKVxuICAgIHRoaXMucmVhZGFibGUgPSBmYWxzZTtcblxuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLndyaXRhYmxlID09PSBmYWxzZSlcbiAgICB0aGlzLndyaXRhYmxlID0gZmFsc2U7XG5cbiAgdGhpcy5hbGxvd0hhbGZPcGVuID0gdHJ1ZTtcbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5hbGxvd0hhbGZPcGVuID09PSBmYWxzZSlcbiAgICB0aGlzLmFsbG93SGFsZk9wZW4gPSBmYWxzZTtcblxuICB0aGlzLm9uY2UoJ2VuZCcsIG9uZW5kKTtcbn1cblxuLy8gdGhlIG5vLWhhbGYtb3BlbiBlbmZvcmNlclxuZnVuY3Rpb24gb25lbmQoKSB7XG4gIC8vIGlmIHdlIGFsbG93IGhhbGYtb3BlbiBzdGF0ZSwgb3IgaWYgdGhlIHdyaXRhYmxlIHNpZGUgZW5kZWQsXG4gIC8vIHRoZW4gd2UncmUgb2suXG4gIGlmICh0aGlzLmFsbG93SGFsZk9wZW4gfHwgdGhpcy5fd3JpdGFibGVTdGF0ZS5lbmRlZClcbiAgICByZXR1cm47XG5cbiAgLy8gbm8gbW9yZSBkYXRhIGNhbiBiZSB3cml0dGVuLlxuICAvLyBCdXQgYWxsb3cgbW9yZSB3cml0ZXMgdG8gaGFwcGVuIGluIHRoaXMgdGljay5cbiAgcHJvY2Vzcy5uZXh0VGljayh0aGlzLmVuZC5iaW5kKHRoaXMpKTtcbn1cblxuZnVuY3Rpb24gZm9yRWFjaCAoeHMsIGYpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB4cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBmKHhzW2ldLCBpKTtcbiAgfVxufVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIGEgcGFzc3Rocm91Z2ggc3RyZWFtLlxuLy8gYmFzaWNhbGx5IGp1c3QgdGhlIG1vc3QgbWluaW1hbCBzb3J0IG9mIFRyYW5zZm9ybSBzdHJlYW0uXG4vLyBFdmVyeSB3cml0dGVuIGNodW5rIGdldHMgb3V0cHV0IGFzLWlzLlxuXG5tb2R1bGUuZXhwb3J0cyA9IFBhc3NUaHJvdWdoO1xuXG52YXIgVHJhbnNmb3JtID0gcmVxdWlyZSgnLi9fc3RyZWFtX3RyYW5zZm9ybScpO1xuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIHV0aWwgPSByZXF1aXJlKCdjb3JlLXV0aWwtaXMnKTtcbnV0aWwuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuLyo8L3JlcGxhY2VtZW50PiovXG5cbnV0aWwuaW5oZXJpdHMoUGFzc1Rocm91Z2gsIFRyYW5zZm9ybSk7XG5cbmZ1bmN0aW9uIFBhc3NUaHJvdWdoKG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFBhc3NUaHJvdWdoKSlcbiAgICByZXR1cm4gbmV3IFBhc3NUaHJvdWdoKG9wdGlvbnMpO1xuXG4gIFRyYW5zZm9ybS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xufVxuXG5QYXNzVGhyb3VnaC5wcm90b3R5cGUuX3RyYW5zZm9ybSA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgY2IobnVsbCwgY2h1bmspO1xufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWRhYmxlO1xuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIGlzQXJyYXkgPSByZXF1aXJlKCdpc2FycmF5Jyk7XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIEJ1ZmZlciA9IHJlcXVpcmUoJ2J1ZmZlcicpLkJ1ZmZlcjtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG5SZWFkYWJsZS5SZWFkYWJsZVN0YXRlID0gUmVhZGFibGVTdGF0ZTtcblxudmFyIEVFID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xuXG4vKjxyZXBsYWNlbWVudD4qL1xuaWYgKCFFRS5saXN0ZW5lckNvdW50KSBFRS5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICByZXR1cm4gZW1pdHRlci5saXN0ZW5lcnModHlwZSkubGVuZ3RoO1xufTtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG52YXIgU3RyZWFtID0gcmVxdWlyZSgnc3RyZWFtJyk7XG5cbi8qPHJlcGxhY2VtZW50PiovXG52YXIgdXRpbCA9IHJlcXVpcmUoJ2NvcmUtdXRpbC1pcycpO1xudXRpbC5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxudmFyIFN0cmluZ0RlY29kZXI7XG5cbnV0aWwuaW5oZXJpdHMoUmVhZGFibGUsIFN0cmVhbSk7XG5cbmZ1bmN0aW9uIFJlYWRhYmxlU3RhdGUob3B0aW9ucywgc3RyZWFtKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vIHRoZSBwb2ludCBhdCB3aGljaCBpdCBzdG9wcyBjYWxsaW5nIF9yZWFkKCkgdG8gZmlsbCB0aGUgYnVmZmVyXG4gIC8vIE5vdGU6IDAgaXMgYSB2YWxpZCB2YWx1ZSwgbWVhbnMgXCJkb24ndCBjYWxsIF9yZWFkIHByZWVtcHRpdmVseSBldmVyXCJcbiAgdmFyIGh3bSA9IG9wdGlvbnMuaGlnaFdhdGVyTWFyaztcbiAgdGhpcy5oaWdoV2F0ZXJNYXJrID0gKGh3bSB8fCBod20gPT09IDApID8gaHdtIDogMTYgKiAxMDI0O1xuXG4gIC8vIGNhc3QgdG8gaW50cy5cbiAgdGhpcy5oaWdoV2F0ZXJNYXJrID0gfn50aGlzLmhpZ2hXYXRlck1hcms7XG5cbiAgdGhpcy5idWZmZXIgPSBbXTtcbiAgdGhpcy5sZW5ndGggPSAwO1xuICB0aGlzLnBpcGVzID0gbnVsbDtcbiAgdGhpcy5waXBlc0NvdW50ID0gMDtcbiAgdGhpcy5mbG93aW5nID0gZmFsc2U7XG4gIHRoaXMuZW5kZWQgPSBmYWxzZTtcbiAgdGhpcy5lbmRFbWl0dGVkID0gZmFsc2U7XG4gIHRoaXMucmVhZGluZyA9IGZhbHNlO1xuXG4gIC8vIEluIHN0cmVhbXMgdGhhdCBuZXZlciBoYXZlIGFueSBkYXRhLCBhbmQgZG8gcHVzaChudWxsKSByaWdodCBhd2F5LFxuICAvLyB0aGUgY29uc3VtZXIgY2FuIG1pc3MgdGhlICdlbmQnIGV2ZW50IGlmIHRoZXkgZG8gc29tZSBJL08gYmVmb3JlXG4gIC8vIGNvbnN1bWluZyB0aGUgc3RyZWFtLiAgU28sIHdlIGRvbid0IGVtaXQoJ2VuZCcpIHVudGlsIHNvbWUgcmVhZGluZ1xuICAvLyBoYXBwZW5zLlxuICB0aGlzLmNhbGxlZFJlYWQgPSBmYWxzZTtcblxuICAvLyBhIGZsYWcgdG8gYmUgYWJsZSB0byB0ZWxsIGlmIHRoZSBvbndyaXRlIGNiIGlzIGNhbGxlZCBpbW1lZGlhdGVseSxcbiAgLy8gb3Igb24gYSBsYXRlciB0aWNrLiAgV2Ugc2V0IHRoaXMgdG8gdHJ1ZSBhdCBmaXJzdCwgYmVjdWFzZSBhbnlcbiAgLy8gYWN0aW9ucyB0aGF0IHNob3VsZG4ndCBoYXBwZW4gdW50aWwgXCJsYXRlclwiIHNob3VsZCBnZW5lcmFsbHkgYWxzb1xuICAvLyBub3QgaGFwcGVuIGJlZm9yZSB0aGUgZmlyc3Qgd3JpdGUgY2FsbC5cbiAgdGhpcy5zeW5jID0gdHJ1ZTtcblxuICAvLyB3aGVuZXZlciB3ZSByZXR1cm4gbnVsbCwgdGhlbiB3ZSBzZXQgYSBmbGFnIHRvIHNheVxuICAvLyB0aGF0IHdlJ3JlIGF3YWl0aW5nIGEgJ3JlYWRhYmxlJyBldmVudCBlbWlzc2lvbi5cbiAgdGhpcy5uZWVkUmVhZGFibGUgPSBmYWxzZTtcbiAgdGhpcy5lbWl0dGVkUmVhZGFibGUgPSBmYWxzZTtcbiAgdGhpcy5yZWFkYWJsZUxpc3RlbmluZyA9IGZhbHNlO1xuXG5cbiAgLy8gb2JqZWN0IHN0cmVhbSBmbGFnLiBVc2VkIHRvIG1ha2UgcmVhZChuKSBpZ25vcmUgbiBhbmQgdG9cbiAgLy8gbWFrZSBhbGwgdGhlIGJ1ZmZlciBtZXJnaW5nIGFuZCBsZW5ndGggY2hlY2tzIGdvIGF3YXlcbiAgdGhpcy5vYmplY3RNb2RlID0gISFvcHRpb25zLm9iamVjdE1vZGU7XG5cbiAgLy8gQ3J5cHRvIGlzIGtpbmQgb2Ygb2xkIGFuZCBjcnVzdHkuICBIaXN0b3JpY2FsbHksIGl0cyBkZWZhdWx0IHN0cmluZ1xuICAvLyBlbmNvZGluZyBpcyAnYmluYXJ5JyBzbyB3ZSBoYXZlIHRvIG1ha2UgdGhpcyBjb25maWd1cmFibGUuXG4gIC8vIEV2ZXJ5dGhpbmcgZWxzZSBpbiB0aGUgdW5pdmVyc2UgdXNlcyAndXRmOCcsIHRob3VnaC5cbiAgdGhpcy5kZWZhdWx0RW5jb2RpbmcgPSBvcHRpb25zLmRlZmF1bHRFbmNvZGluZyB8fCAndXRmOCc7XG5cbiAgLy8gd2hlbiBwaXBpbmcsIHdlIG9ubHkgY2FyZSBhYm91dCAncmVhZGFibGUnIGV2ZW50cyB0aGF0IGhhcHBlblxuICAvLyBhZnRlciByZWFkKClpbmcgYWxsIHRoZSBieXRlcyBhbmQgbm90IGdldHRpbmcgYW55IHB1c2hiYWNrLlxuICB0aGlzLnJhbk91dCA9IGZhbHNlO1xuXG4gIC8vIHRoZSBudW1iZXIgb2Ygd3JpdGVycyB0aGF0IGFyZSBhd2FpdGluZyBhIGRyYWluIGV2ZW50IGluIC5waXBlKClzXG4gIHRoaXMuYXdhaXREcmFpbiA9IDA7XG5cbiAgLy8gaWYgdHJ1ZSwgYSBtYXliZVJlYWRNb3JlIGhhcyBiZWVuIHNjaGVkdWxlZFxuICB0aGlzLnJlYWRpbmdNb3JlID0gZmFsc2U7XG5cbiAgdGhpcy5kZWNvZGVyID0gbnVsbDtcbiAgdGhpcy5lbmNvZGluZyA9IG51bGw7XG4gIGlmIChvcHRpb25zLmVuY29kaW5nKSB7XG4gICAgaWYgKCFTdHJpbmdEZWNvZGVyKVxuICAgICAgU3RyaW5nRGVjb2RlciA9IHJlcXVpcmUoJ3N0cmluZ19kZWNvZGVyLycpLlN0cmluZ0RlY29kZXI7XG4gICAgdGhpcy5kZWNvZGVyID0gbmV3IFN0cmluZ0RlY29kZXIob3B0aW9ucy5lbmNvZGluZyk7XG4gICAgdGhpcy5lbmNvZGluZyA9IG9wdGlvbnMuZW5jb2Rpbmc7XG4gIH1cbn1cblxuZnVuY3Rpb24gUmVhZGFibGUob3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUmVhZGFibGUpKVxuICAgIHJldHVybiBuZXcgUmVhZGFibGUob3B0aW9ucyk7XG5cbiAgdGhpcy5fcmVhZGFibGVTdGF0ZSA9IG5ldyBSZWFkYWJsZVN0YXRlKG9wdGlvbnMsIHRoaXMpO1xuXG4gIC8vIGxlZ2FjeVxuICB0aGlzLnJlYWRhYmxlID0gdHJ1ZTtcblxuICBTdHJlYW0uY2FsbCh0aGlzKTtcbn1cblxuLy8gTWFudWFsbHkgc2hvdmUgc29tZXRoaW5nIGludG8gdGhlIHJlYWQoKSBidWZmZXIuXG4vLyBUaGlzIHJldHVybnMgdHJ1ZSBpZiB0aGUgaGlnaFdhdGVyTWFyayBoYXMgbm90IGJlZW4gaGl0IHlldCxcbi8vIHNpbWlsYXIgdG8gaG93IFdyaXRhYmxlLndyaXRlKCkgcmV0dXJucyB0cnVlIGlmIHlvdSBzaG91bGRcbi8vIHdyaXRlKCkgc29tZSBtb3JlLlxuUmVhZGFibGUucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcblxuICBpZiAodHlwZW9mIGNodW5rID09PSAnc3RyaW5nJyAmJiAhc3RhdGUub2JqZWN0TW9kZSkge1xuICAgIGVuY29kaW5nID0gZW5jb2RpbmcgfHwgc3RhdGUuZGVmYXVsdEVuY29kaW5nO1xuICAgIGlmIChlbmNvZGluZyAhPT0gc3RhdGUuZW5jb2RpbmcpIHtcbiAgICAgIGNodW5rID0gbmV3IEJ1ZmZlcihjaHVuaywgZW5jb2RpbmcpO1xuICAgICAgZW5jb2RpbmcgPSAnJztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVhZGFibGVBZGRDaHVuayh0aGlzLCBzdGF0ZSwgY2h1bmssIGVuY29kaW5nLCBmYWxzZSk7XG59O1xuXG4vLyBVbnNoaWZ0IHNob3VsZCAqYWx3YXlzKiBiZSBzb21ldGhpbmcgZGlyZWN0bHkgb3V0IG9mIHJlYWQoKVxuUmVhZGFibGUucHJvdG90eXBlLnVuc2hpZnQgPSBmdW5jdGlvbihjaHVuaykge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9yZWFkYWJsZVN0YXRlO1xuICByZXR1cm4gcmVhZGFibGVBZGRDaHVuayh0aGlzLCBzdGF0ZSwgY2h1bmssICcnLCB0cnVlKTtcbn07XG5cbmZ1bmN0aW9uIHJlYWRhYmxlQWRkQ2h1bmsoc3RyZWFtLCBzdGF0ZSwgY2h1bmssIGVuY29kaW5nLCBhZGRUb0Zyb250KSB7XG4gIHZhciBlciA9IGNodW5rSW52YWxpZChzdGF0ZSwgY2h1bmspO1xuICBpZiAoZXIpIHtcbiAgICBzdHJlYW0uZW1pdCgnZXJyb3InLCBlcik7XG4gIH0gZWxzZSBpZiAoY2h1bmsgPT09IG51bGwgfHwgY2h1bmsgPT09IHVuZGVmaW5lZCkge1xuICAgIHN0YXRlLnJlYWRpbmcgPSBmYWxzZTtcbiAgICBpZiAoIXN0YXRlLmVuZGVkKVxuICAgICAgb25Fb2ZDaHVuayhzdHJlYW0sIHN0YXRlKTtcbiAgfSBlbHNlIGlmIChzdGF0ZS5vYmplY3RNb2RlIHx8IGNodW5rICYmIGNodW5rLmxlbmd0aCA+IDApIHtcbiAgICBpZiAoc3RhdGUuZW5kZWQgJiYgIWFkZFRvRnJvbnQpIHtcbiAgICAgIHZhciBlID0gbmV3IEVycm9yKCdzdHJlYW0ucHVzaCgpIGFmdGVyIEVPRicpO1xuICAgICAgc3RyZWFtLmVtaXQoJ2Vycm9yJywgZSk7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS5lbmRFbWl0dGVkICYmIGFkZFRvRnJvbnQpIHtcbiAgICAgIHZhciBlID0gbmV3IEVycm9yKCdzdHJlYW0udW5zaGlmdCgpIGFmdGVyIGVuZCBldmVudCcpO1xuICAgICAgc3RyZWFtLmVtaXQoJ2Vycm9yJywgZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChzdGF0ZS5kZWNvZGVyICYmICFhZGRUb0Zyb250ICYmICFlbmNvZGluZylcbiAgICAgICAgY2h1bmsgPSBzdGF0ZS5kZWNvZGVyLndyaXRlKGNodW5rKTtcblxuICAgICAgLy8gdXBkYXRlIHRoZSBidWZmZXIgaW5mby5cbiAgICAgIHN0YXRlLmxlbmd0aCArPSBzdGF0ZS5vYmplY3RNb2RlID8gMSA6IGNodW5rLmxlbmd0aDtcbiAgICAgIGlmIChhZGRUb0Zyb250KSB7XG4gICAgICAgIHN0YXRlLmJ1ZmZlci51bnNoaWZ0KGNodW5rKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRlLnJlYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgc3RhdGUuYnVmZmVyLnB1c2goY2h1bmspO1xuICAgICAgfVxuXG4gICAgICBpZiAoc3RhdGUubmVlZFJlYWRhYmxlKVxuICAgICAgICBlbWl0UmVhZGFibGUoc3RyZWFtKTtcblxuICAgICAgbWF5YmVSZWFkTW9yZShzdHJlYW0sIHN0YXRlKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoIWFkZFRvRnJvbnQpIHtcbiAgICBzdGF0ZS5yZWFkaW5nID0gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gbmVlZE1vcmVEYXRhKHN0YXRlKTtcbn1cblxuXG5cbi8vIGlmIGl0J3MgcGFzdCB0aGUgaGlnaCB3YXRlciBtYXJrLCB3ZSBjYW4gcHVzaCBpbiBzb21lIG1vcmUuXG4vLyBBbHNvLCBpZiB3ZSBoYXZlIG5vIGRhdGEgeWV0LCB3ZSBjYW4gc3RhbmQgc29tZVxuLy8gbW9yZSBieXRlcy4gIFRoaXMgaXMgdG8gd29yayBhcm91bmQgY2FzZXMgd2hlcmUgaHdtPTAsXG4vLyBzdWNoIGFzIHRoZSByZXBsLiAgQWxzbywgaWYgdGhlIHB1c2goKSB0cmlnZ2VyZWQgYVxuLy8gcmVhZGFibGUgZXZlbnQsIGFuZCB0aGUgdXNlciBjYWxsZWQgcmVhZChsYXJnZU51bWJlcikgc3VjaCB0aGF0XG4vLyBuZWVkUmVhZGFibGUgd2FzIHNldCwgdGhlbiB3ZSBvdWdodCB0byBwdXNoIG1vcmUsIHNvIHRoYXQgYW5vdGhlclxuLy8gJ3JlYWRhYmxlJyBldmVudCB3aWxsIGJlIHRyaWdnZXJlZC5cbmZ1bmN0aW9uIG5lZWRNb3JlRGF0YShzdGF0ZSkge1xuICByZXR1cm4gIXN0YXRlLmVuZGVkICYmXG4gICAgICAgICAoc3RhdGUubmVlZFJlYWRhYmxlIHx8XG4gICAgICAgICAgc3RhdGUubGVuZ3RoIDwgc3RhdGUuaGlnaFdhdGVyTWFyayB8fFxuICAgICAgICAgIHN0YXRlLmxlbmd0aCA9PT0gMCk7XG59XG5cbi8vIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LlxuUmVhZGFibGUucHJvdG90eXBlLnNldEVuY29kaW5nID0gZnVuY3Rpb24oZW5jKSB7XG4gIGlmICghU3RyaW5nRGVjb2RlcilcbiAgICBTdHJpbmdEZWNvZGVyID0gcmVxdWlyZSgnc3RyaW5nX2RlY29kZXIvJykuU3RyaW5nRGVjb2RlcjtcbiAgdGhpcy5fcmVhZGFibGVTdGF0ZS5kZWNvZGVyID0gbmV3IFN0cmluZ0RlY29kZXIoZW5jKTtcbiAgdGhpcy5fcmVhZGFibGVTdGF0ZS5lbmNvZGluZyA9IGVuYztcbn07XG5cbi8vIERvbid0IHJhaXNlIHRoZSBod20gPiAxMjhNQlxudmFyIE1BWF9IV00gPSAweDgwMDAwMDtcbmZ1bmN0aW9uIHJvdW5kVXBUb05leHRQb3dlck9mMihuKSB7XG4gIGlmIChuID49IE1BWF9IV00pIHtcbiAgICBuID0gTUFYX0hXTTtcbiAgfSBlbHNlIHtcbiAgICAvLyBHZXQgdGhlIG5leHQgaGlnaGVzdCBwb3dlciBvZiAyXG4gICAgbi0tO1xuICAgIGZvciAodmFyIHAgPSAxOyBwIDwgMzI7IHAgPDw9IDEpIG4gfD0gbiA+PiBwO1xuICAgIG4rKztcbiAgfVxuICByZXR1cm4gbjtcbn1cblxuZnVuY3Rpb24gaG93TXVjaFRvUmVhZChuLCBzdGF0ZSkge1xuICBpZiAoc3RhdGUubGVuZ3RoID09PSAwICYmIHN0YXRlLmVuZGVkKVxuICAgIHJldHVybiAwO1xuXG4gIGlmIChzdGF0ZS5vYmplY3RNb2RlKVxuICAgIHJldHVybiBuID09PSAwID8gMCA6IDE7XG5cbiAgaWYgKG4gPT09IG51bGwgfHwgaXNOYU4obikpIHtcbiAgICAvLyBvbmx5IGZsb3cgb25lIGJ1ZmZlciBhdCBhIHRpbWVcbiAgICBpZiAoc3RhdGUuZmxvd2luZyAmJiBzdGF0ZS5idWZmZXIubGVuZ3RoKVxuICAgICAgcmV0dXJuIHN0YXRlLmJ1ZmZlclswXS5sZW5ndGg7XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIHN0YXRlLmxlbmd0aDtcbiAgfVxuXG4gIGlmIChuIDw9IDApXG4gICAgcmV0dXJuIDA7XG5cbiAgLy8gSWYgd2UncmUgYXNraW5nIGZvciBtb3JlIHRoYW4gdGhlIHRhcmdldCBidWZmZXIgbGV2ZWwsXG4gIC8vIHRoZW4gcmFpc2UgdGhlIHdhdGVyIG1hcmsuICBCdW1wIHVwIHRvIHRoZSBuZXh0IGhpZ2hlc3RcbiAgLy8gcG93ZXIgb2YgMiwgdG8gcHJldmVudCBpbmNyZWFzaW5nIGl0IGV4Y2Vzc2l2ZWx5IGluIHRpbnlcbiAgLy8gYW1vdW50cy5cbiAgaWYgKG4gPiBzdGF0ZS5oaWdoV2F0ZXJNYXJrKVxuICAgIHN0YXRlLmhpZ2hXYXRlck1hcmsgPSByb3VuZFVwVG9OZXh0UG93ZXJPZjIobik7XG5cbiAgLy8gZG9uJ3QgaGF2ZSB0aGF0IG11Y2guICByZXR1cm4gbnVsbCwgdW5sZXNzIHdlJ3ZlIGVuZGVkLlxuICBpZiAobiA+IHN0YXRlLmxlbmd0aCkge1xuICAgIGlmICghc3RhdGUuZW5kZWQpIHtcbiAgICAgIHN0YXRlLm5lZWRSZWFkYWJsZSA9IHRydWU7XG4gICAgICByZXR1cm4gMDtcbiAgICB9IGVsc2VcbiAgICAgIHJldHVybiBzdGF0ZS5sZW5ndGg7XG4gIH1cblxuICByZXR1cm4gbjtcbn1cblxuLy8geW91IGNhbiBvdmVycmlkZSBlaXRoZXIgdGhpcyBtZXRob2QsIG9yIHRoZSBhc3luYyBfcmVhZChuKSBiZWxvdy5cblJlYWRhYmxlLnByb3RvdHlwZS5yZWFkID0gZnVuY3Rpb24obikge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9yZWFkYWJsZVN0YXRlO1xuICBzdGF0ZS5jYWxsZWRSZWFkID0gdHJ1ZTtcbiAgdmFyIG5PcmlnID0gbjtcbiAgdmFyIHJldDtcblxuICBpZiAodHlwZW9mIG4gIT09ICdudW1iZXInIHx8IG4gPiAwKVxuICAgIHN0YXRlLmVtaXR0ZWRSZWFkYWJsZSA9IGZhbHNlO1xuXG4gIC8vIGlmIHdlJ3JlIGRvaW5nIHJlYWQoMCkgdG8gdHJpZ2dlciBhIHJlYWRhYmxlIGV2ZW50LCBidXQgd2VcbiAgLy8gYWxyZWFkeSBoYXZlIGEgYnVuY2ggb2YgZGF0YSBpbiB0aGUgYnVmZmVyLCB0aGVuIGp1c3QgdHJpZ2dlclxuICAvLyB0aGUgJ3JlYWRhYmxlJyBldmVudCBhbmQgbW92ZSBvbi5cbiAgaWYgKG4gPT09IDAgJiZcbiAgICAgIHN0YXRlLm5lZWRSZWFkYWJsZSAmJlxuICAgICAgKHN0YXRlLmxlbmd0aCA+PSBzdGF0ZS5oaWdoV2F0ZXJNYXJrIHx8IHN0YXRlLmVuZGVkKSkge1xuICAgIGVtaXRSZWFkYWJsZSh0aGlzKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIG4gPSBob3dNdWNoVG9SZWFkKG4sIHN0YXRlKTtcblxuICAvLyBpZiB3ZSd2ZSBlbmRlZCwgYW5kIHdlJ3JlIG5vdyBjbGVhciwgdGhlbiBmaW5pc2ggaXQgdXAuXG4gIGlmIChuID09PSAwICYmIHN0YXRlLmVuZGVkKSB7XG4gICAgcmV0ID0gbnVsbDtcblxuICAgIC8vIEluIGNhc2VzIHdoZXJlIHRoZSBkZWNvZGVyIGRpZCBub3QgcmVjZWl2ZSBlbm91Z2ggZGF0YVxuICAgIC8vIHRvIHByb2R1Y2UgYSBmdWxsIGNodW5rLCB0aGVuIGltbWVkaWF0ZWx5IHJlY2VpdmVkIGFuXG4gICAgLy8gRU9GLCBzdGF0ZS5idWZmZXIgd2lsbCBjb250YWluIFs8QnVmZmVyID4sIDxCdWZmZXIgMDAgLi4uPl0uXG4gICAgLy8gaG93TXVjaFRvUmVhZCB3aWxsIHNlZSB0aGlzIGFuZCBjb2VyY2UgdGhlIGFtb3VudCB0b1xuICAgIC8vIHJlYWQgdG8gemVybyAoYmVjYXVzZSBpdCdzIGxvb2tpbmcgYXQgdGhlIGxlbmd0aCBvZiB0aGVcbiAgICAvLyBmaXJzdCA8QnVmZmVyID4gaW4gc3RhdGUuYnVmZmVyKSwgYW5kIHdlJ2xsIGVuZCB1cCBoZXJlLlxuICAgIC8vXG4gICAgLy8gVGhpcyBjYW4gb25seSBoYXBwZW4gdmlhIHN0YXRlLmRlY29kZXIgLS0gbm8gb3RoZXIgdmVudWVcbiAgICAvLyBleGlzdHMgZm9yIHB1c2hpbmcgYSB6ZXJvLWxlbmd0aCBjaHVuayBpbnRvIHN0YXRlLmJ1ZmZlclxuICAgIC8vIGFuZCB0cmlnZ2VyaW5nIHRoaXMgYmVoYXZpb3IuIEluIHRoaXMgY2FzZSwgd2UgcmV0dXJuIG91clxuICAgIC8vIHJlbWFpbmluZyBkYXRhIGFuZCBlbmQgdGhlIHN0cmVhbSwgaWYgYXBwcm9wcmlhdGUuXG4gICAgaWYgKHN0YXRlLmxlbmd0aCA+IDAgJiYgc3RhdGUuZGVjb2Rlcikge1xuICAgICAgcmV0ID0gZnJvbUxpc3Qobiwgc3RhdGUpO1xuICAgICAgc3RhdGUubGVuZ3RoIC09IHJldC5sZW5ndGg7XG4gICAgfVxuXG4gICAgaWYgKHN0YXRlLmxlbmd0aCA9PT0gMClcbiAgICAgIGVuZFJlYWRhYmxlKHRoaXMpO1xuXG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIEFsbCB0aGUgYWN0dWFsIGNodW5rIGdlbmVyYXRpb24gbG9naWMgbmVlZHMgdG8gYmVcbiAgLy8gKmJlbG93KiB0aGUgY2FsbCB0byBfcmVhZC4gIFRoZSByZWFzb24gaXMgdGhhdCBpbiBjZXJ0YWluXG4gIC8vIHN5bnRoZXRpYyBzdHJlYW0gY2FzZXMsIHN1Y2ggYXMgcGFzc3Rocm91Z2ggc3RyZWFtcywgX3JlYWRcbiAgLy8gbWF5IGJlIGEgY29tcGxldGVseSBzeW5jaHJvbm91cyBvcGVyYXRpb24gd2hpY2ggbWF5IGNoYW5nZVxuICAvLyB0aGUgc3RhdGUgb2YgdGhlIHJlYWQgYnVmZmVyLCBwcm92aWRpbmcgZW5vdWdoIGRhdGEgd2hlblxuICAvLyBiZWZvcmUgdGhlcmUgd2FzICpub3QqIGVub3VnaC5cbiAgLy9cbiAgLy8gU28sIHRoZSBzdGVwcyBhcmU6XG4gIC8vIDEuIEZpZ3VyZSBvdXQgd2hhdCB0aGUgc3RhdGUgb2YgdGhpbmdzIHdpbGwgYmUgYWZ0ZXIgd2UgZG9cbiAgLy8gYSByZWFkIGZyb20gdGhlIGJ1ZmZlci5cbiAgLy9cbiAgLy8gMi4gSWYgdGhhdCByZXN1bHRpbmcgc3RhdGUgd2lsbCB0cmlnZ2VyIGEgX3JlYWQsIHRoZW4gY2FsbCBfcmVhZC5cbiAgLy8gTm90ZSB0aGF0IHRoaXMgbWF5IGJlIGFzeW5jaHJvbm91cywgb3Igc3luY2hyb25vdXMuICBZZXMsIGl0IGlzXG4gIC8vIGRlZXBseSB1Z2x5IHRvIHdyaXRlIEFQSXMgdGhpcyB3YXksIGJ1dCB0aGF0IHN0aWxsIGRvZXNuJ3QgbWVhblxuICAvLyB0aGF0IHRoZSBSZWFkYWJsZSBjbGFzcyBzaG91bGQgYmVoYXZlIGltcHJvcGVybHksIGFzIHN0cmVhbXMgYXJlXG4gIC8vIGRlc2lnbmVkIHRvIGJlIHN5bmMvYXN5bmMgYWdub3N0aWMuXG4gIC8vIFRha2Ugbm90ZSBpZiB0aGUgX3JlYWQgY2FsbCBpcyBzeW5jIG9yIGFzeW5jIChpZSwgaWYgdGhlIHJlYWQgY2FsbFxuICAvLyBoYXMgcmV0dXJuZWQgeWV0KSwgc28gdGhhdCB3ZSBrbm93IHdoZXRoZXIgb3Igbm90IGl0J3Mgc2FmZSB0byBlbWl0XG4gIC8vICdyZWFkYWJsZScgZXRjLlxuICAvL1xuICAvLyAzLiBBY3R1YWxseSBwdWxsIHRoZSByZXF1ZXN0ZWQgY2h1bmtzIG91dCBvZiB0aGUgYnVmZmVyIGFuZCByZXR1cm4uXG5cbiAgLy8gaWYgd2UgbmVlZCBhIHJlYWRhYmxlIGV2ZW50LCB0aGVuIHdlIG5lZWQgdG8gZG8gc29tZSByZWFkaW5nLlxuICB2YXIgZG9SZWFkID0gc3RhdGUubmVlZFJlYWRhYmxlO1xuXG4gIC8vIGlmIHdlIGN1cnJlbnRseSBoYXZlIGxlc3MgdGhhbiB0aGUgaGlnaFdhdGVyTWFyaywgdGhlbiBhbHNvIHJlYWQgc29tZVxuICBpZiAoc3RhdGUubGVuZ3RoIC0gbiA8PSBzdGF0ZS5oaWdoV2F0ZXJNYXJrKVxuICAgIGRvUmVhZCA9IHRydWU7XG5cbiAgLy8gaG93ZXZlciwgaWYgd2UndmUgZW5kZWQsIHRoZW4gdGhlcmUncyBubyBwb2ludCwgYW5kIGlmIHdlJ3JlIGFscmVhZHlcbiAgLy8gcmVhZGluZywgdGhlbiBpdCdzIHVubmVjZXNzYXJ5LlxuICBpZiAoc3RhdGUuZW5kZWQgfHwgc3RhdGUucmVhZGluZylcbiAgICBkb1JlYWQgPSBmYWxzZTtcblxuICBpZiAoZG9SZWFkKSB7XG4gICAgc3RhdGUucmVhZGluZyA9IHRydWU7XG4gICAgc3RhdGUuc3luYyA9IHRydWU7XG4gICAgLy8gaWYgdGhlIGxlbmd0aCBpcyBjdXJyZW50bHkgemVybywgdGhlbiB3ZSAqbmVlZCogYSByZWFkYWJsZSBldmVudC5cbiAgICBpZiAoc3RhdGUubGVuZ3RoID09PSAwKVxuICAgICAgc3RhdGUubmVlZFJlYWRhYmxlID0gdHJ1ZTtcbiAgICAvLyBjYWxsIGludGVybmFsIHJlYWQgbWV0aG9kXG4gICAgdGhpcy5fcmVhZChzdGF0ZS5oaWdoV2F0ZXJNYXJrKTtcbiAgICBzdGF0ZS5zeW5jID0gZmFsc2U7XG4gIH1cblxuICAvLyBJZiBfcmVhZCBjYWxsZWQgaXRzIGNhbGxiYWNrIHN5bmNocm9ub3VzbHksIHRoZW4gYHJlYWRpbmdgXG4gIC8vIHdpbGwgYmUgZmFsc2UsIGFuZCB3ZSBuZWVkIHRvIHJlLWV2YWx1YXRlIGhvdyBtdWNoIGRhdGEgd2VcbiAgLy8gY2FuIHJldHVybiB0byB0aGUgdXNlci5cbiAgaWYgKGRvUmVhZCAmJiAhc3RhdGUucmVhZGluZylcbiAgICBuID0gaG93TXVjaFRvUmVhZChuT3JpZywgc3RhdGUpO1xuXG4gIGlmIChuID4gMClcbiAgICByZXQgPSBmcm9tTGlzdChuLCBzdGF0ZSk7XG4gIGVsc2VcbiAgICByZXQgPSBudWxsO1xuXG4gIGlmIChyZXQgPT09IG51bGwpIHtcbiAgICBzdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuICAgIG4gPSAwO1xuICB9XG5cbiAgc3RhdGUubGVuZ3RoIC09IG47XG5cbiAgLy8gSWYgd2UgaGF2ZSBub3RoaW5nIGluIHRoZSBidWZmZXIsIHRoZW4gd2Ugd2FudCB0byBrbm93XG4gIC8vIGFzIHNvb24gYXMgd2UgKmRvKiBnZXQgc29tZXRoaW5nIGludG8gdGhlIGJ1ZmZlci5cbiAgaWYgKHN0YXRlLmxlbmd0aCA9PT0gMCAmJiAhc3RhdGUuZW5kZWQpXG4gICAgc3RhdGUubmVlZFJlYWRhYmxlID0gdHJ1ZTtcblxuICAvLyBJZiB3ZSBoYXBwZW5lZCB0byByZWFkKCkgZXhhY3RseSB0aGUgcmVtYWluaW5nIGFtb3VudCBpbiB0aGVcbiAgLy8gYnVmZmVyLCBhbmQgdGhlIEVPRiBoYXMgYmVlbiBzZWVuIGF0IHRoaXMgcG9pbnQsIHRoZW4gbWFrZSBzdXJlXG4gIC8vIHRoYXQgd2UgZW1pdCAnZW5kJyBvbiB0aGUgdmVyeSBuZXh0IHRpY2suXG4gIGlmIChzdGF0ZS5lbmRlZCAmJiAhc3RhdGUuZW5kRW1pdHRlZCAmJiBzdGF0ZS5sZW5ndGggPT09IDApXG4gICAgZW5kUmVhZGFibGUodGhpcyk7XG5cbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGNodW5rSW52YWxpZChzdGF0ZSwgY2h1bmspIHtcbiAgdmFyIGVyID0gbnVsbDtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoY2h1bmspICYmXG4gICAgICAnc3RyaW5nJyAhPT0gdHlwZW9mIGNodW5rICYmXG4gICAgICBjaHVuayAhPT0gbnVsbCAmJlxuICAgICAgY2h1bmsgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgIXN0YXRlLm9iamVjdE1vZGUpIHtcbiAgICBlciA9IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgbm9uLXN0cmluZy9idWZmZXIgY2h1bmsnKTtcbiAgfVxuICByZXR1cm4gZXI7XG59XG5cblxuZnVuY3Rpb24gb25Fb2ZDaHVuayhzdHJlYW0sIHN0YXRlKSB7XG4gIGlmIChzdGF0ZS5kZWNvZGVyICYmICFzdGF0ZS5lbmRlZCkge1xuICAgIHZhciBjaHVuayA9IHN0YXRlLmRlY29kZXIuZW5kKCk7XG4gICAgaWYgKGNodW5rICYmIGNodW5rLmxlbmd0aCkge1xuICAgICAgc3RhdGUuYnVmZmVyLnB1c2goY2h1bmspO1xuICAgICAgc3RhdGUubGVuZ3RoICs9IHN0YXRlLm9iamVjdE1vZGUgPyAxIDogY2h1bmsubGVuZ3RoO1xuICAgIH1cbiAgfVxuICBzdGF0ZS5lbmRlZCA9IHRydWU7XG5cbiAgLy8gaWYgd2UndmUgZW5kZWQgYW5kIHdlIGhhdmUgc29tZSBkYXRhIGxlZnQsIHRoZW4gZW1pdFxuICAvLyAncmVhZGFibGUnIG5vdyB0byBtYWtlIHN1cmUgaXQgZ2V0cyBwaWNrZWQgdXAuXG4gIGlmIChzdGF0ZS5sZW5ndGggPiAwKVxuICAgIGVtaXRSZWFkYWJsZShzdHJlYW0pO1xuICBlbHNlXG4gICAgZW5kUmVhZGFibGUoc3RyZWFtKTtcbn1cblxuLy8gRG9uJ3QgZW1pdCByZWFkYWJsZSByaWdodCBhd2F5IGluIHN5bmMgbW9kZSwgYmVjYXVzZSB0aGlzIGNhbiB0cmlnZ2VyXG4vLyBhbm90aGVyIHJlYWQoKSBjYWxsID0+IHN0YWNrIG92ZXJmbG93LiAgVGhpcyB3YXksIGl0IG1pZ2h0IHRyaWdnZXJcbi8vIGEgbmV4dFRpY2sgcmVjdXJzaW9uIHdhcm5pbmcsIGJ1dCB0aGF0J3Mgbm90IHNvIGJhZC5cbmZ1bmN0aW9uIGVtaXRSZWFkYWJsZShzdHJlYW0pIHtcbiAgdmFyIHN0YXRlID0gc3RyZWFtLl9yZWFkYWJsZVN0YXRlO1xuICBzdGF0ZS5uZWVkUmVhZGFibGUgPSBmYWxzZTtcbiAgaWYgKHN0YXRlLmVtaXR0ZWRSZWFkYWJsZSlcbiAgICByZXR1cm47XG5cbiAgc3RhdGUuZW1pdHRlZFJlYWRhYmxlID0gdHJ1ZTtcbiAgaWYgKHN0YXRlLnN5bmMpXG4gICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIGVtaXRSZWFkYWJsZV8oc3RyZWFtKTtcbiAgICB9KTtcbiAgZWxzZVxuICAgIGVtaXRSZWFkYWJsZV8oc3RyZWFtKTtcbn1cblxuZnVuY3Rpb24gZW1pdFJlYWRhYmxlXyhzdHJlYW0pIHtcbiAgc3RyZWFtLmVtaXQoJ3JlYWRhYmxlJyk7XG59XG5cblxuLy8gYXQgdGhpcyBwb2ludCwgdGhlIHVzZXIgaGFzIHByZXN1bWFibHkgc2VlbiB0aGUgJ3JlYWRhYmxlJyBldmVudCxcbi8vIGFuZCBjYWxsZWQgcmVhZCgpIHRvIGNvbnN1bWUgc29tZSBkYXRhLiAgdGhhdCBtYXkgaGF2ZSB0cmlnZ2VyZWRcbi8vIGluIHR1cm4gYW5vdGhlciBfcmVhZChuKSBjYWxsLCBpbiB3aGljaCBjYXNlIHJlYWRpbmcgPSB0cnVlIGlmXG4vLyBpdCdzIGluIHByb2dyZXNzLlxuLy8gSG93ZXZlciwgaWYgd2UncmUgbm90IGVuZGVkLCBvciByZWFkaW5nLCBhbmQgdGhlIGxlbmd0aCA8IGh3bSxcbi8vIHRoZW4gZ28gYWhlYWQgYW5kIHRyeSB0byByZWFkIHNvbWUgbW9yZSBwcmVlbXB0aXZlbHkuXG5mdW5jdGlvbiBtYXliZVJlYWRNb3JlKHN0cmVhbSwgc3RhdGUpIHtcbiAgaWYgKCFzdGF0ZS5yZWFkaW5nTW9yZSkge1xuICAgIHN0YXRlLnJlYWRpbmdNb3JlID0gdHJ1ZTtcbiAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgbWF5YmVSZWFkTW9yZV8oc3RyZWFtLCBzdGF0ZSk7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWF5YmVSZWFkTW9yZV8oc3RyZWFtLCBzdGF0ZSkge1xuICB2YXIgbGVuID0gc3RhdGUubGVuZ3RoO1xuICB3aGlsZSAoIXN0YXRlLnJlYWRpbmcgJiYgIXN0YXRlLmZsb3dpbmcgJiYgIXN0YXRlLmVuZGVkICYmXG4gICAgICAgICBzdGF0ZS5sZW5ndGggPCBzdGF0ZS5oaWdoV2F0ZXJNYXJrKSB7XG4gICAgc3RyZWFtLnJlYWQoMCk7XG4gICAgaWYgKGxlbiA9PT0gc3RhdGUubGVuZ3RoKVxuICAgICAgLy8gZGlkbid0IGdldCBhbnkgZGF0YSwgc3RvcCBzcGlubmluZy5cbiAgICAgIGJyZWFrO1xuICAgIGVsc2VcbiAgICAgIGxlbiA9IHN0YXRlLmxlbmd0aDtcbiAgfVxuICBzdGF0ZS5yZWFkaW5nTW9yZSA9IGZhbHNlO1xufVxuXG4vLyBhYnN0cmFjdCBtZXRob2QuICB0byBiZSBvdmVycmlkZGVuIGluIHNwZWNpZmljIGltcGxlbWVudGF0aW9uIGNsYXNzZXMuXG4vLyBjYWxsIGNiKGVyLCBkYXRhKSB3aGVyZSBkYXRhIGlzIDw9IG4gaW4gbGVuZ3RoLlxuLy8gZm9yIHZpcnR1YWwgKG5vbi1zdHJpbmcsIG5vbi1idWZmZXIpIHN0cmVhbXMsIFwibGVuZ3RoXCIgaXMgc29tZXdoYXRcbi8vIGFyYml0cmFyeSwgYW5kIHBlcmhhcHMgbm90IHZlcnkgbWVhbmluZ2Z1bC5cblJlYWRhYmxlLnByb3RvdHlwZS5fcmVhZCA9IGZ1bmN0aW9uKG4pIHtcbiAgdGhpcy5lbWl0KCdlcnJvcicsIG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJykpO1xufTtcblxuUmVhZGFibGUucHJvdG90eXBlLnBpcGUgPSBmdW5jdGlvbihkZXN0LCBwaXBlT3B0cykge1xuICB2YXIgc3JjID0gdGhpcztcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcblxuICBzd2l0Y2ggKHN0YXRlLnBpcGVzQ291bnQpIHtcbiAgICBjYXNlIDA6XG4gICAgICBzdGF0ZS5waXBlcyA9IGRlc3Q7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDE6XG4gICAgICBzdGF0ZS5waXBlcyA9IFtzdGF0ZS5waXBlcywgZGVzdF07XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgc3RhdGUucGlwZXMucHVzaChkZXN0KTtcbiAgICAgIGJyZWFrO1xuICB9XG4gIHN0YXRlLnBpcGVzQ291bnQgKz0gMTtcblxuICB2YXIgZG9FbmQgPSAoIXBpcGVPcHRzIHx8IHBpcGVPcHRzLmVuZCAhPT0gZmFsc2UpICYmXG4gICAgICAgICAgICAgIGRlc3QgIT09IHByb2Nlc3Muc3Rkb3V0ICYmXG4gICAgICAgICAgICAgIGRlc3QgIT09IHByb2Nlc3Muc3RkZXJyO1xuXG4gIHZhciBlbmRGbiA9IGRvRW5kID8gb25lbmQgOiBjbGVhbnVwO1xuICBpZiAoc3RhdGUuZW5kRW1pdHRlZClcbiAgICBwcm9jZXNzLm5leHRUaWNrKGVuZEZuKTtcbiAgZWxzZVxuICAgIHNyYy5vbmNlKCdlbmQnLCBlbmRGbik7XG5cbiAgZGVzdC5vbigndW5waXBlJywgb251bnBpcGUpO1xuICBmdW5jdGlvbiBvbnVucGlwZShyZWFkYWJsZSkge1xuICAgIGlmIChyZWFkYWJsZSAhPT0gc3JjKSByZXR1cm47XG4gICAgY2xlYW51cCgpO1xuICB9XG5cbiAgZnVuY3Rpb24gb25lbmQoKSB7XG4gICAgZGVzdC5lbmQoKTtcbiAgfVxuXG4gIC8vIHdoZW4gdGhlIGRlc3QgZHJhaW5zLCBpdCByZWR1Y2VzIHRoZSBhd2FpdERyYWluIGNvdW50ZXJcbiAgLy8gb24gdGhlIHNvdXJjZS4gIFRoaXMgd291bGQgYmUgbW9yZSBlbGVnYW50IHdpdGggYSAub25jZSgpXG4gIC8vIGhhbmRsZXIgaW4gZmxvdygpLCBidXQgYWRkaW5nIGFuZCByZW1vdmluZyByZXBlYXRlZGx5IGlzXG4gIC8vIHRvbyBzbG93LlxuICB2YXIgb25kcmFpbiA9IHBpcGVPbkRyYWluKHNyYyk7XG4gIGRlc3Qub24oJ2RyYWluJywgb25kcmFpbik7XG5cbiAgZnVuY3Rpb24gY2xlYW51cCgpIHtcbiAgICAvLyBjbGVhbnVwIGV2ZW50IGhhbmRsZXJzIG9uY2UgdGhlIHBpcGUgaXMgYnJva2VuXG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignY2xvc2UnLCBvbmNsb3NlKTtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdmaW5pc2gnLCBvbmZpbmlzaCk7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignZHJhaW4nLCBvbmRyYWluKTtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdlcnJvcicsIG9uZXJyb3IpO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ3VucGlwZScsIG9udW5waXBlKTtcbiAgICBzcmMucmVtb3ZlTGlzdGVuZXIoJ2VuZCcsIG9uZW5kKTtcbiAgICBzcmMucmVtb3ZlTGlzdGVuZXIoJ2VuZCcsIGNsZWFudXApO1xuXG4gICAgLy8gaWYgdGhlIHJlYWRlciBpcyB3YWl0aW5nIGZvciBhIGRyYWluIGV2ZW50IGZyb20gdGhpc1xuICAgIC8vIHNwZWNpZmljIHdyaXRlciwgdGhlbiBpdCB3b3VsZCBjYXVzZSBpdCB0byBuZXZlciBzdGFydFxuICAgIC8vIGZsb3dpbmcgYWdhaW4uXG4gICAgLy8gU28sIGlmIHRoaXMgaXMgYXdhaXRpbmcgYSBkcmFpbiwgdGhlbiB3ZSBqdXN0IGNhbGwgaXQgbm93LlxuICAgIC8vIElmIHdlIGRvbid0IGtub3csIHRoZW4gYXNzdW1lIHRoYXQgd2UgYXJlIHdhaXRpbmcgZm9yIG9uZS5cbiAgICBpZiAoIWRlc3QuX3dyaXRhYmxlU3RhdGUgfHwgZGVzdC5fd3JpdGFibGVTdGF0ZS5uZWVkRHJhaW4pXG4gICAgICBvbmRyYWluKCk7XG4gIH1cblxuICAvLyBpZiB0aGUgZGVzdCBoYXMgYW4gZXJyb3IsIHRoZW4gc3RvcCBwaXBpbmcgaW50byBpdC5cbiAgLy8gaG93ZXZlciwgZG9uJ3Qgc3VwcHJlc3MgdGhlIHRocm93aW5nIGJlaGF2aW9yIGZvciB0aGlzLlxuICBmdW5jdGlvbiBvbmVycm9yKGVyKSB7XG4gICAgdW5waXBlKCk7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignZXJyb3InLCBvbmVycm9yKTtcbiAgICBpZiAoRUUubGlzdGVuZXJDb3VudChkZXN0LCAnZXJyb3InKSA9PT0gMClcbiAgICAgIGRlc3QuZW1pdCgnZXJyb3InLCBlcik7XG4gIH1cbiAgLy8gVGhpcyBpcyBhIGJydXRhbGx5IHVnbHkgaGFjayB0byBtYWtlIHN1cmUgdGhhdCBvdXIgZXJyb3IgaGFuZGxlclxuICAvLyBpcyBhdHRhY2hlZCBiZWZvcmUgYW55IHVzZXJsYW5kIG9uZXMuICBORVZFUiBETyBUSElTLlxuICBpZiAoIWRlc3QuX2V2ZW50cyB8fCAhZGVzdC5fZXZlbnRzLmVycm9yKVxuICAgIGRlc3Qub24oJ2Vycm9yJywgb25lcnJvcik7XG4gIGVsc2UgaWYgKGlzQXJyYXkoZGVzdC5fZXZlbnRzLmVycm9yKSlcbiAgICBkZXN0Ll9ldmVudHMuZXJyb3IudW5zaGlmdChvbmVycm9yKTtcbiAgZWxzZVxuICAgIGRlc3QuX2V2ZW50cy5lcnJvciA9IFtvbmVycm9yLCBkZXN0Ll9ldmVudHMuZXJyb3JdO1xuXG5cblxuICAvLyBCb3RoIGNsb3NlIGFuZCBmaW5pc2ggc2hvdWxkIHRyaWdnZXIgdW5waXBlLCBidXQgb25seSBvbmNlLlxuICBmdW5jdGlvbiBvbmNsb3NlKCkge1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2ZpbmlzaCcsIG9uZmluaXNoKTtcbiAgICB1bnBpcGUoKTtcbiAgfVxuICBkZXN0Lm9uY2UoJ2Nsb3NlJywgb25jbG9zZSk7XG4gIGZ1bmN0aW9uIG9uZmluaXNoKCkge1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2Nsb3NlJywgb25jbG9zZSk7XG4gICAgdW5waXBlKCk7XG4gIH1cbiAgZGVzdC5vbmNlKCdmaW5pc2gnLCBvbmZpbmlzaCk7XG5cbiAgZnVuY3Rpb24gdW5waXBlKCkge1xuICAgIHNyYy51bnBpcGUoZGVzdCk7XG4gIH1cblxuICAvLyB0ZWxsIHRoZSBkZXN0IHRoYXQgaXQncyBiZWluZyBwaXBlZCB0b1xuICBkZXN0LmVtaXQoJ3BpcGUnLCBzcmMpO1xuXG4gIC8vIHN0YXJ0IHRoZSBmbG93IGlmIGl0IGhhc24ndCBiZWVuIHN0YXJ0ZWQgYWxyZWFkeS5cbiAgaWYgKCFzdGF0ZS5mbG93aW5nKSB7XG4gICAgLy8gdGhlIGhhbmRsZXIgdGhhdCB3YWl0cyBmb3IgcmVhZGFibGUgZXZlbnRzIGFmdGVyIGFsbFxuICAgIC8vIHRoZSBkYXRhIGdldHMgc3Vja2VkIG91dCBpbiBmbG93LlxuICAgIC8vIFRoaXMgd291bGQgYmUgZWFzaWVyIHRvIGZvbGxvdyB3aXRoIGEgLm9uY2UoKSBoYW5kbGVyXG4gICAgLy8gaW4gZmxvdygpLCBidXQgdGhhdCBpcyB0b28gc2xvdy5cbiAgICB0aGlzLm9uKCdyZWFkYWJsZScsIHBpcGVPblJlYWRhYmxlKTtcblxuICAgIHN0YXRlLmZsb3dpbmcgPSB0cnVlO1xuICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICBmbG93KHNyYyk7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gZGVzdDtcbn07XG5cbmZ1bmN0aW9uIHBpcGVPbkRyYWluKHNyYykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRlc3QgPSB0aGlzO1xuICAgIHZhciBzdGF0ZSA9IHNyYy5fcmVhZGFibGVTdGF0ZTtcbiAgICBzdGF0ZS5hd2FpdERyYWluLS07XG4gICAgaWYgKHN0YXRlLmF3YWl0RHJhaW4gPT09IDApXG4gICAgICBmbG93KHNyYyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGZsb3coc3JjKSB7XG4gIHZhciBzdGF0ZSA9IHNyYy5fcmVhZGFibGVTdGF0ZTtcbiAgdmFyIGNodW5rO1xuICBzdGF0ZS5hd2FpdERyYWluID0gMDtcblxuICBmdW5jdGlvbiB3cml0ZShkZXN0LCBpLCBsaXN0KSB7XG4gICAgdmFyIHdyaXR0ZW4gPSBkZXN0LndyaXRlKGNodW5rKTtcbiAgICBpZiAoZmFsc2UgPT09IHdyaXR0ZW4pIHtcbiAgICAgIHN0YXRlLmF3YWl0RHJhaW4rKztcbiAgICB9XG4gIH1cblxuICB3aGlsZSAoc3RhdGUucGlwZXNDb3VudCAmJiBudWxsICE9PSAoY2h1bmsgPSBzcmMucmVhZCgpKSkge1xuXG4gICAgaWYgKHN0YXRlLnBpcGVzQ291bnQgPT09IDEpXG4gICAgICB3cml0ZShzdGF0ZS5waXBlcywgMCwgbnVsbCk7XG4gICAgZWxzZVxuICAgICAgZm9yRWFjaChzdGF0ZS5waXBlcywgd3JpdGUpO1xuXG4gICAgc3JjLmVtaXQoJ2RhdGEnLCBjaHVuayk7XG5cbiAgICAvLyBpZiBhbnlvbmUgbmVlZHMgYSBkcmFpbiwgdGhlbiB3ZSBoYXZlIHRvIHdhaXQgZm9yIHRoYXQuXG4gICAgaWYgKHN0YXRlLmF3YWl0RHJhaW4gPiAwKVxuICAgICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gaWYgZXZlcnkgZGVzdGluYXRpb24gd2FzIHVucGlwZWQsIGVpdGhlciBiZWZvcmUgZW50ZXJpbmcgdGhpc1xuICAvLyBmdW5jdGlvbiwgb3IgaW4gdGhlIHdoaWxlIGxvb3AsIHRoZW4gc3RvcCBmbG93aW5nLlxuICAvL1xuICAvLyBOQjogVGhpcyBpcyBhIHByZXR0eSByYXJlIGVkZ2UgY2FzZS5cbiAgaWYgKHN0YXRlLnBpcGVzQ291bnQgPT09IDApIHtcbiAgICBzdGF0ZS5mbG93aW5nID0gZmFsc2U7XG5cbiAgICAvLyBpZiB0aGVyZSB3ZXJlIGRhdGEgZXZlbnQgbGlzdGVuZXJzIGFkZGVkLCB0aGVuIHN3aXRjaCB0byBvbGQgbW9kZS5cbiAgICBpZiAoRUUubGlzdGVuZXJDb3VudChzcmMsICdkYXRhJykgPiAwKVxuICAgICAgZW1pdERhdGFFdmVudHMoc3JjKTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBhdCB0aGlzIHBvaW50LCBubyBvbmUgbmVlZGVkIGEgZHJhaW4sIHNvIHdlIGp1c3QgcmFuIG91dCBvZiBkYXRhXG4gIC8vIG9uIHRoZSBuZXh0IHJlYWRhYmxlIGV2ZW50LCBzdGFydCBpdCBvdmVyIGFnYWluLlxuICBzdGF0ZS5yYW5PdXQgPSB0cnVlO1xufVxuXG5mdW5jdGlvbiBwaXBlT25SZWFkYWJsZSgpIHtcbiAgaWYgKHRoaXMuX3JlYWRhYmxlU3RhdGUucmFuT3V0KSB7XG4gICAgdGhpcy5fcmVhZGFibGVTdGF0ZS5yYW5PdXQgPSBmYWxzZTtcbiAgICBmbG93KHRoaXMpO1xuICB9XG59XG5cblxuUmVhZGFibGUucHJvdG90eXBlLnVucGlwZSA9IGZ1bmN0aW9uKGRlc3QpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcblxuICAvLyBpZiB3ZSdyZSBub3QgcGlwaW5nIGFueXdoZXJlLCB0aGVuIGRvIG5vdGhpbmcuXG4gIGlmIChzdGF0ZS5waXBlc0NvdW50ID09PSAwKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIGp1c3Qgb25lIGRlc3RpbmF0aW9uLiAgbW9zdCBjb21tb24gY2FzZS5cbiAgaWYgKHN0YXRlLnBpcGVzQ291bnQgPT09IDEpIHtcbiAgICAvLyBwYXNzZWQgaW4gb25lLCBidXQgaXQncyBub3QgdGhlIHJpZ2h0IG9uZS5cbiAgICBpZiAoZGVzdCAmJiBkZXN0ICE9PSBzdGF0ZS5waXBlcylcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKCFkZXN0KVxuICAgICAgZGVzdCA9IHN0YXRlLnBpcGVzO1xuXG4gICAgLy8gZ290IGEgbWF0Y2guXG4gICAgc3RhdGUucGlwZXMgPSBudWxsO1xuICAgIHN0YXRlLnBpcGVzQ291bnQgPSAwO1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIoJ3JlYWRhYmxlJywgcGlwZU9uUmVhZGFibGUpO1xuICAgIHN0YXRlLmZsb3dpbmcgPSBmYWxzZTtcbiAgICBpZiAoZGVzdClcbiAgICAgIGRlc3QuZW1pdCgndW5waXBlJywgdGhpcyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBzbG93IGNhc2UuIG11bHRpcGxlIHBpcGUgZGVzdGluYXRpb25zLlxuXG4gIGlmICghZGVzdCkge1xuICAgIC8vIHJlbW92ZSBhbGwuXG4gICAgdmFyIGRlc3RzID0gc3RhdGUucGlwZXM7XG4gICAgdmFyIGxlbiA9IHN0YXRlLnBpcGVzQ291bnQ7XG4gICAgc3RhdGUucGlwZXMgPSBudWxsO1xuICAgIHN0YXRlLnBpcGVzQ291bnQgPSAwO1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIoJ3JlYWRhYmxlJywgcGlwZU9uUmVhZGFibGUpO1xuICAgIHN0YXRlLmZsb3dpbmcgPSBmYWxzZTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBkZXN0c1tpXS5lbWl0KCd1bnBpcGUnLCB0aGlzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHRyeSB0byBmaW5kIHRoZSByaWdodCBvbmUuXG4gIHZhciBpID0gaW5kZXhPZihzdGF0ZS5waXBlcywgZGVzdCk7XG4gIGlmIChpID09PSAtMSlcbiAgICByZXR1cm4gdGhpcztcblxuICBzdGF0ZS5waXBlcy5zcGxpY2UoaSwgMSk7XG4gIHN0YXRlLnBpcGVzQ291bnQgLT0gMTtcbiAgaWYgKHN0YXRlLnBpcGVzQ291bnQgPT09IDEpXG4gICAgc3RhdGUucGlwZXMgPSBzdGF0ZS5waXBlc1swXTtcblxuICBkZXN0LmVtaXQoJ3VucGlwZScsIHRoaXMpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gc2V0IHVwIGRhdGEgZXZlbnRzIGlmIHRoZXkgYXJlIGFza2VkIGZvclxuLy8gRW5zdXJlIHJlYWRhYmxlIGxpc3RlbmVycyBldmVudHVhbGx5IGdldCBzb21ldGhpbmdcblJlYWRhYmxlLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKGV2LCBmbikge1xuICB2YXIgcmVzID0gU3RyZWFtLnByb3RvdHlwZS5vbi5jYWxsKHRoaXMsIGV2LCBmbik7XG5cbiAgaWYgKGV2ID09PSAnZGF0YScgJiYgIXRoaXMuX3JlYWRhYmxlU3RhdGUuZmxvd2luZylcbiAgICBlbWl0RGF0YUV2ZW50cyh0aGlzKTtcblxuICBpZiAoZXYgPT09ICdyZWFkYWJsZScgJiYgdGhpcy5yZWFkYWJsZSkge1xuICAgIHZhciBzdGF0ZSA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG4gICAgaWYgKCFzdGF0ZS5yZWFkYWJsZUxpc3RlbmluZykge1xuICAgICAgc3RhdGUucmVhZGFibGVMaXN0ZW5pbmcgPSB0cnVlO1xuICAgICAgc3RhdGUuZW1pdHRlZFJlYWRhYmxlID0gZmFsc2U7XG4gICAgICBzdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuICAgICAgaWYgKCFzdGF0ZS5yZWFkaW5nKSB7XG4gICAgICAgIHRoaXMucmVhZCgwKTtcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUubGVuZ3RoKSB7XG4gICAgICAgIGVtaXRSZWFkYWJsZSh0aGlzLCBzdGF0ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlcztcbn07XG5SZWFkYWJsZS5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBSZWFkYWJsZS5wcm90b3R5cGUub247XG5cbi8vIHBhdXNlKCkgYW5kIHJlc3VtZSgpIGFyZSByZW1uYW50cyBvZiB0aGUgbGVnYWN5IHJlYWRhYmxlIHN0cmVhbSBBUElcbi8vIElmIHRoZSB1c2VyIHVzZXMgdGhlbSwgdGhlbiBzd2l0Y2ggaW50byBvbGQgbW9kZS5cblJlYWRhYmxlLnByb3RvdHlwZS5yZXN1bWUgPSBmdW5jdGlvbigpIHtcbiAgZW1pdERhdGFFdmVudHModGhpcyk7XG4gIHRoaXMucmVhZCgwKTtcbiAgdGhpcy5lbWl0KCdyZXN1bWUnKTtcbn07XG5cblJlYWRhYmxlLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICBlbWl0RGF0YUV2ZW50cyh0aGlzLCB0cnVlKTtcbiAgdGhpcy5lbWl0KCdwYXVzZScpO1xufTtcblxuZnVuY3Rpb24gZW1pdERhdGFFdmVudHMoc3RyZWFtLCBzdGFydFBhdXNlZCkge1xuICB2YXIgc3RhdGUgPSBzdHJlYW0uX3JlYWRhYmxlU3RhdGU7XG5cbiAgaWYgKHN0YXRlLmZsb3dpbmcpIHtcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vaXNhYWNzL3JlYWRhYmxlLXN0cmVhbS9pc3N1ZXMvMTZcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBzd2l0Y2ggdG8gb2xkIG1vZGUgbm93LicpO1xuICB9XG5cbiAgdmFyIHBhdXNlZCA9IHN0YXJ0UGF1c2VkIHx8IGZhbHNlO1xuICB2YXIgcmVhZGFibGUgPSBmYWxzZTtcblxuICAvLyBjb252ZXJ0IHRvIGFuIG9sZC1zdHlsZSBzdHJlYW0uXG4gIHN0cmVhbS5yZWFkYWJsZSA9IHRydWU7XG4gIHN0cmVhbS5waXBlID0gU3RyZWFtLnByb3RvdHlwZS5waXBlO1xuICBzdHJlYW0ub24gPSBzdHJlYW0uYWRkTGlzdGVuZXIgPSBTdHJlYW0ucHJvdG90eXBlLm9uO1xuXG4gIHN0cmVhbS5vbigncmVhZGFibGUnLCBmdW5jdGlvbigpIHtcbiAgICByZWFkYWJsZSA9IHRydWU7XG5cbiAgICB2YXIgYztcbiAgICB3aGlsZSAoIXBhdXNlZCAmJiAobnVsbCAhPT0gKGMgPSBzdHJlYW0ucmVhZCgpKSkpXG4gICAgICBzdHJlYW0uZW1pdCgnZGF0YScsIGMpO1xuXG4gICAgaWYgKGMgPT09IG51bGwpIHtcbiAgICAgIHJlYWRhYmxlID0gZmFsc2U7XG4gICAgICBzdHJlYW0uX3JlYWRhYmxlU3RhdGUubmVlZFJlYWRhYmxlID0gdHJ1ZTtcbiAgICB9XG4gIH0pO1xuXG4gIHN0cmVhbS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHBhdXNlZCA9IHRydWU7XG4gICAgdGhpcy5lbWl0KCdwYXVzZScpO1xuICB9O1xuXG4gIHN0cmVhbS5yZXN1bWUgPSBmdW5jdGlvbigpIHtcbiAgICBwYXVzZWQgPSBmYWxzZTtcbiAgICBpZiAocmVhZGFibGUpXG4gICAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgICBzdHJlYW0uZW1pdCgncmVhZGFibGUnKTtcbiAgICAgIH0pO1xuICAgIGVsc2VcbiAgICAgIHRoaXMucmVhZCgwKTtcbiAgICB0aGlzLmVtaXQoJ3Jlc3VtZScpO1xuICB9O1xuXG4gIC8vIG5vdyBtYWtlIGl0IHN0YXJ0LCBqdXN0IGluIGNhc2UgaXQgaGFkbid0IGFscmVhZHkuXG4gIHN0cmVhbS5lbWl0KCdyZWFkYWJsZScpO1xufVxuXG4vLyB3cmFwIGFuIG9sZC1zdHlsZSBzdHJlYW0gYXMgdGhlIGFzeW5jIGRhdGEgc291cmNlLlxuLy8gVGhpcyBpcyAqbm90KiBwYXJ0IG9mIHRoZSByZWFkYWJsZSBzdHJlYW0gaW50ZXJmYWNlLlxuLy8gSXQgaXMgYW4gdWdseSB1bmZvcnR1bmF0ZSBtZXNzIG9mIGhpc3RvcnkuXG5SZWFkYWJsZS5wcm90b3R5cGUud3JhcCA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9yZWFkYWJsZVN0YXRlO1xuICB2YXIgcGF1c2VkID0gZmFsc2U7XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzdHJlYW0ub24oJ2VuZCcsIGZ1bmN0aW9uKCkge1xuICAgIGlmIChzdGF0ZS5kZWNvZGVyICYmICFzdGF0ZS5lbmRlZCkge1xuICAgICAgdmFyIGNodW5rID0gc3RhdGUuZGVjb2Rlci5lbmQoKTtcbiAgICAgIGlmIChjaHVuayAmJiBjaHVuay5sZW5ndGgpXG4gICAgICAgIHNlbGYucHVzaChjaHVuayk7XG4gICAgfVxuXG4gICAgc2VsZi5wdXNoKG51bGwpO1xuICB9KTtcblxuICBzdHJlYW0ub24oJ2RhdGEnLCBmdW5jdGlvbihjaHVuaykge1xuICAgIGlmIChzdGF0ZS5kZWNvZGVyKVxuICAgICAgY2h1bmsgPSBzdGF0ZS5kZWNvZGVyLndyaXRlKGNodW5rKTtcblxuICAgIC8vIGRvbid0IHNraXAgb3ZlciBmYWxzeSB2YWx1ZXMgaW4gb2JqZWN0TW9kZVxuICAgIC8vaWYgKHN0YXRlLm9iamVjdE1vZGUgJiYgdXRpbC5pc051bGxPclVuZGVmaW5lZChjaHVuaykpXG4gICAgaWYgKHN0YXRlLm9iamVjdE1vZGUgJiYgKGNodW5rID09PSBudWxsIHx8IGNodW5rID09PSB1bmRlZmluZWQpKVxuICAgICAgcmV0dXJuO1xuICAgIGVsc2UgaWYgKCFzdGF0ZS5vYmplY3RNb2RlICYmICghY2h1bmsgfHwgIWNodW5rLmxlbmd0aCkpXG4gICAgICByZXR1cm47XG5cbiAgICB2YXIgcmV0ID0gc2VsZi5wdXNoKGNodW5rKTtcbiAgICBpZiAoIXJldCkge1xuICAgICAgcGF1c2VkID0gdHJ1ZTtcbiAgICAgIHN0cmVhbS5wYXVzZSgpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gcHJveHkgYWxsIHRoZSBvdGhlciBtZXRob2RzLlxuICAvLyBpbXBvcnRhbnQgd2hlbiB3cmFwcGluZyBmaWx0ZXJzIGFuZCBkdXBsZXhlcy5cbiAgZm9yICh2YXIgaSBpbiBzdHJlYW0pIHtcbiAgICBpZiAodHlwZW9mIHN0cmVhbVtpXSA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgICB0eXBlb2YgdGhpc1tpXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXNbaV0gPSBmdW5jdGlvbihtZXRob2QpIHsgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gc3RyZWFtW21ldGhvZF0uYXBwbHkoc3RyZWFtLCBhcmd1bWVudHMpO1xuICAgICAgfX0oaSk7XG4gICAgfVxuICB9XG5cbiAgLy8gcHJveHkgY2VydGFpbiBpbXBvcnRhbnQgZXZlbnRzLlxuICB2YXIgZXZlbnRzID0gWydlcnJvcicsICdjbG9zZScsICdkZXN0cm95JywgJ3BhdXNlJywgJ3Jlc3VtZSddO1xuICBmb3JFYWNoKGV2ZW50cywgZnVuY3Rpb24oZXYpIHtcbiAgICBzdHJlYW0ub24oZXYsIHNlbGYuZW1pdC5iaW5kKHNlbGYsIGV2KSk7XG4gIH0pO1xuXG4gIC8vIHdoZW4gd2UgdHJ5IHRvIGNvbnN1bWUgc29tZSBtb3JlIGJ5dGVzLCBzaW1wbHkgdW5wYXVzZSB0aGVcbiAgLy8gdW5kZXJseWluZyBzdHJlYW0uXG4gIHNlbGYuX3JlYWQgPSBmdW5jdGlvbihuKSB7XG4gICAgaWYgKHBhdXNlZCkge1xuICAgICAgcGF1c2VkID0gZmFsc2U7XG4gICAgICBzdHJlYW0ucmVzdW1lKCk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBzZWxmO1xufTtcblxuXG5cbi8vIGV4cG9zZWQgZm9yIHRlc3RpbmcgcHVycG9zZXMgb25seS5cblJlYWRhYmxlLl9mcm9tTGlzdCA9IGZyb21MaXN0O1xuXG4vLyBQbHVjayBvZmYgbiBieXRlcyBmcm9tIGFuIGFycmF5IG9mIGJ1ZmZlcnMuXG4vLyBMZW5ndGggaXMgdGhlIGNvbWJpbmVkIGxlbmd0aHMgb2YgYWxsIHRoZSBidWZmZXJzIGluIHRoZSBsaXN0LlxuZnVuY3Rpb24gZnJvbUxpc3Qobiwgc3RhdGUpIHtcbiAgdmFyIGxpc3QgPSBzdGF0ZS5idWZmZXI7XG4gIHZhciBsZW5ndGggPSBzdGF0ZS5sZW5ndGg7XG4gIHZhciBzdHJpbmdNb2RlID0gISFzdGF0ZS5kZWNvZGVyO1xuICB2YXIgb2JqZWN0TW9kZSA9ICEhc3RhdGUub2JqZWN0TW9kZTtcbiAgdmFyIHJldDtcblxuICAvLyBub3RoaW5nIGluIHRoZSBsaXN0LCBkZWZpbml0ZWx5IGVtcHR5LlxuICBpZiAobGlzdC5sZW5ndGggPT09IDApXG4gICAgcmV0dXJuIG51bGw7XG5cbiAgaWYgKGxlbmd0aCA9PT0gMClcbiAgICByZXQgPSBudWxsO1xuICBlbHNlIGlmIChvYmplY3RNb2RlKVxuICAgIHJldCA9IGxpc3Quc2hpZnQoKTtcbiAgZWxzZSBpZiAoIW4gfHwgbiA+PSBsZW5ndGgpIHtcbiAgICAvLyByZWFkIGl0IGFsbCwgdHJ1bmNhdGUgdGhlIGFycmF5LlxuICAgIGlmIChzdHJpbmdNb2RlKVxuICAgICAgcmV0ID0gbGlzdC5qb2luKCcnKTtcbiAgICBlbHNlXG4gICAgICByZXQgPSBCdWZmZXIuY29uY2F0KGxpc3QsIGxlbmd0aCk7XG4gICAgbGlzdC5sZW5ndGggPSAwO1xuICB9IGVsc2Uge1xuICAgIC8vIHJlYWQganVzdCBzb21lIG9mIGl0LlxuICAgIGlmIChuIDwgbGlzdFswXS5sZW5ndGgpIHtcbiAgICAgIC8vIGp1c3QgdGFrZSBhIHBhcnQgb2YgdGhlIGZpcnN0IGxpc3QgaXRlbS5cbiAgICAgIC8vIHNsaWNlIGlzIHRoZSBzYW1lIGZvciBidWZmZXJzIGFuZCBzdHJpbmdzLlxuICAgICAgdmFyIGJ1ZiA9IGxpc3RbMF07XG4gICAgICByZXQgPSBidWYuc2xpY2UoMCwgbik7XG4gICAgICBsaXN0WzBdID0gYnVmLnNsaWNlKG4pO1xuICAgIH0gZWxzZSBpZiAobiA9PT0gbGlzdFswXS5sZW5ndGgpIHtcbiAgICAgIC8vIGZpcnN0IGxpc3QgaXMgYSBwZXJmZWN0IG1hdGNoXG4gICAgICByZXQgPSBsaXN0LnNoaWZ0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGNvbXBsZXggY2FzZS5cbiAgICAgIC8vIHdlIGhhdmUgZW5vdWdoIHRvIGNvdmVyIGl0LCBidXQgaXQgc3BhbnMgcGFzdCB0aGUgZmlyc3QgYnVmZmVyLlxuICAgICAgaWYgKHN0cmluZ01vZGUpXG4gICAgICAgIHJldCA9ICcnO1xuICAgICAgZWxzZVxuICAgICAgICByZXQgPSBuZXcgQnVmZmVyKG4pO1xuXG4gICAgICB2YXIgYyA9IDA7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGxpc3QubGVuZ3RoOyBpIDwgbCAmJiBjIDwgbjsgaSsrKSB7XG4gICAgICAgIHZhciBidWYgPSBsaXN0WzBdO1xuICAgICAgICB2YXIgY3B5ID0gTWF0aC5taW4obiAtIGMsIGJ1Zi5sZW5ndGgpO1xuXG4gICAgICAgIGlmIChzdHJpbmdNb2RlKVxuICAgICAgICAgIHJldCArPSBidWYuc2xpY2UoMCwgY3B5KTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGJ1Zi5jb3B5KHJldCwgYywgMCwgY3B5KTtcblxuICAgICAgICBpZiAoY3B5IDwgYnVmLmxlbmd0aClcbiAgICAgICAgICBsaXN0WzBdID0gYnVmLnNsaWNlKGNweSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBsaXN0LnNoaWZ0KCk7XG5cbiAgICAgICAgYyArPSBjcHk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gZW5kUmVhZGFibGUoc3RyZWFtKSB7XG4gIHZhciBzdGF0ZSA9IHN0cmVhbS5fcmVhZGFibGVTdGF0ZTtcblxuICAvLyBJZiB3ZSBnZXQgaGVyZSBiZWZvcmUgY29uc3VtaW5nIGFsbCB0aGUgYnl0ZXMsIHRoZW4gdGhhdCBpcyBhXG4gIC8vIGJ1ZyBpbiBub2RlLiAgU2hvdWxkIG5ldmVyIGhhcHBlbi5cbiAgaWYgKHN0YXRlLmxlbmd0aCA+IDApXG4gICAgdGhyb3cgbmV3IEVycm9yKCdlbmRSZWFkYWJsZSBjYWxsZWQgb24gbm9uLWVtcHR5IHN0cmVhbScpO1xuXG4gIGlmICghc3RhdGUuZW5kRW1pdHRlZCAmJiBzdGF0ZS5jYWxsZWRSZWFkKSB7XG4gICAgc3RhdGUuZW5kZWQgPSB0cnVlO1xuICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICAvLyBDaGVjayB0aGF0IHdlIGRpZG4ndCBnZXQgb25lIGxhc3QgdW5zaGlmdC5cbiAgICAgIGlmICghc3RhdGUuZW5kRW1pdHRlZCAmJiBzdGF0ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgc3RhdGUuZW5kRW1pdHRlZCA9IHRydWU7XG4gICAgICAgIHN0cmVhbS5yZWFkYWJsZSA9IGZhbHNlO1xuICAgICAgICBzdHJlYW0uZW1pdCgnZW5kJyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZm9yRWFjaCAoeHMsIGYpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB4cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBmKHhzW2ldLCBpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbmRleE9mICh4cywgeCkge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHhzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmICh4c1tpXSA9PT0geCkgcmV0dXJuIGk7XG4gIH1cbiAgcmV0dXJuIC0xO1xufVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cblxuLy8gYSB0cmFuc2Zvcm0gc3RyZWFtIGlzIGEgcmVhZGFibGUvd3JpdGFibGUgc3RyZWFtIHdoZXJlIHlvdSBkb1xuLy8gc29tZXRoaW5nIHdpdGggdGhlIGRhdGEuICBTb21ldGltZXMgaXQncyBjYWxsZWQgYSBcImZpbHRlclwiLFxuLy8gYnV0IHRoYXQncyBub3QgYSBncmVhdCBuYW1lIGZvciBpdCwgc2luY2UgdGhhdCBpbXBsaWVzIGEgdGhpbmcgd2hlcmVcbi8vIHNvbWUgYml0cyBwYXNzIHRocm91Z2gsIGFuZCBvdGhlcnMgYXJlIHNpbXBseSBpZ25vcmVkLiAgKFRoYXQgd291bGRcbi8vIGJlIGEgdmFsaWQgZXhhbXBsZSBvZiBhIHRyYW5zZm9ybSwgb2YgY291cnNlLilcbi8vXG4vLyBXaGlsZSB0aGUgb3V0cHV0IGlzIGNhdXNhbGx5IHJlbGF0ZWQgdG8gdGhlIGlucHV0LCBpdCdzIG5vdCBhXG4vLyBuZWNlc3NhcmlseSBzeW1tZXRyaWMgb3Igc3luY2hyb25vdXMgdHJhbnNmb3JtYXRpb24uICBGb3IgZXhhbXBsZSxcbi8vIGEgemxpYiBzdHJlYW0gbWlnaHQgdGFrZSBtdWx0aXBsZSBwbGFpbi10ZXh0IHdyaXRlcygpLCBhbmQgdGhlblxuLy8gZW1pdCBhIHNpbmdsZSBjb21wcmVzc2VkIGNodW5rIHNvbWUgdGltZSBpbiB0aGUgZnV0dXJlLlxuLy9cbi8vIEhlcmUncyBob3cgdGhpcyB3b3Jrczpcbi8vXG4vLyBUaGUgVHJhbnNmb3JtIHN0cmVhbSBoYXMgYWxsIHRoZSBhc3BlY3RzIG9mIHRoZSByZWFkYWJsZSBhbmQgd3JpdGFibGVcbi8vIHN0cmVhbSBjbGFzc2VzLiAgV2hlbiB5b3Ugd3JpdGUoY2h1bmspLCB0aGF0IGNhbGxzIF93cml0ZShjaHVuayxjYilcbi8vIGludGVybmFsbHksIGFuZCByZXR1cm5zIGZhbHNlIGlmIHRoZXJlJ3MgYSBsb3Qgb2YgcGVuZGluZyB3cml0ZXNcbi8vIGJ1ZmZlcmVkIHVwLiAgV2hlbiB5b3UgY2FsbCByZWFkKCksIHRoYXQgY2FsbHMgX3JlYWQobikgdW50aWxcbi8vIHRoZXJlJ3MgZW5vdWdoIHBlbmRpbmcgcmVhZGFibGUgZGF0YSBidWZmZXJlZCB1cC5cbi8vXG4vLyBJbiBhIHRyYW5zZm9ybSBzdHJlYW0sIHRoZSB3cml0dGVuIGRhdGEgaXMgcGxhY2VkIGluIGEgYnVmZmVyLiAgV2hlblxuLy8gX3JlYWQobikgaXMgY2FsbGVkLCBpdCB0cmFuc2Zvcm1zIHRoZSBxdWV1ZWQgdXAgZGF0YSwgY2FsbGluZyB0aGVcbi8vIGJ1ZmZlcmVkIF93cml0ZSBjYidzIGFzIGl0IGNvbnN1bWVzIGNodW5rcy4gIElmIGNvbnN1bWluZyBhIHNpbmdsZVxuLy8gd3JpdHRlbiBjaHVuayB3b3VsZCByZXN1bHQgaW4gbXVsdGlwbGUgb3V0cHV0IGNodW5rcywgdGhlbiB0aGUgZmlyc3Rcbi8vIG91dHB1dHRlZCBiaXQgY2FsbHMgdGhlIHJlYWRjYiwgYW5kIHN1YnNlcXVlbnQgY2h1bmtzIGp1c3QgZ28gaW50b1xuLy8gdGhlIHJlYWQgYnVmZmVyLCBhbmQgd2lsbCBjYXVzZSBpdCB0byBlbWl0ICdyZWFkYWJsZScgaWYgbmVjZXNzYXJ5LlxuLy9cbi8vIFRoaXMgd2F5LCBiYWNrLXByZXNzdXJlIGlzIGFjdHVhbGx5IGRldGVybWluZWQgYnkgdGhlIHJlYWRpbmcgc2lkZSxcbi8vIHNpbmNlIF9yZWFkIGhhcyB0byBiZSBjYWxsZWQgdG8gc3RhcnQgcHJvY2Vzc2luZyBhIG5ldyBjaHVuay4gIEhvd2V2ZXIsXG4vLyBhIHBhdGhvbG9naWNhbCBpbmZsYXRlIHR5cGUgb2YgdHJhbnNmb3JtIGNhbiBjYXVzZSBleGNlc3NpdmUgYnVmZmVyaW5nXG4vLyBoZXJlLiAgRm9yIGV4YW1wbGUsIGltYWdpbmUgYSBzdHJlYW0gd2hlcmUgZXZlcnkgYnl0ZSBvZiBpbnB1dCBpc1xuLy8gaW50ZXJwcmV0ZWQgYXMgYW4gaW50ZWdlciBmcm9tIDAtMjU1LCBhbmQgdGhlbiByZXN1bHRzIGluIHRoYXQgbWFueVxuLy8gYnl0ZXMgb2Ygb3V0cHV0LiAgV3JpdGluZyB0aGUgNCBieXRlcyB7ZmYsZmYsZmYsZmZ9IHdvdWxkIHJlc3VsdCBpblxuLy8gMWtiIG9mIGRhdGEgYmVpbmcgb3V0cHV0LiAgSW4gdGhpcyBjYXNlLCB5b3UgY291bGQgd3JpdGUgYSB2ZXJ5IHNtYWxsXG4vLyBhbW91bnQgb2YgaW5wdXQsIGFuZCBlbmQgdXAgd2l0aCBhIHZlcnkgbGFyZ2UgYW1vdW50IG9mIG91dHB1dC4gIEluXG4vLyBzdWNoIGEgcGF0aG9sb2dpY2FsIGluZmxhdGluZyBtZWNoYW5pc20sIHRoZXJlJ2QgYmUgbm8gd2F5IHRvIHRlbGxcbi8vIHRoZSBzeXN0ZW0gdG8gc3RvcCBkb2luZyB0aGUgdHJhbnNmb3JtLiAgQSBzaW5nbGUgNE1CIHdyaXRlIGNvdWxkXG4vLyBjYXVzZSB0aGUgc3lzdGVtIHRvIHJ1biBvdXQgb2YgbWVtb3J5LlxuLy9cbi8vIEhvd2V2ZXIsIGV2ZW4gaW4gc3VjaCBhIHBhdGhvbG9naWNhbCBjYXNlLCBvbmx5IGEgc2luZ2xlIHdyaXR0ZW4gY2h1bmtcbi8vIHdvdWxkIGJlIGNvbnN1bWVkLCBhbmQgdGhlbiB0aGUgcmVzdCB3b3VsZCB3YWl0ICh1bi10cmFuc2Zvcm1lZCkgdW50aWxcbi8vIHRoZSByZXN1bHRzIG9mIHRoZSBwcmV2aW91cyB0cmFuc2Zvcm1lZCBjaHVuayB3ZXJlIGNvbnN1bWVkLlxuXG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zZm9ybTtcblxudmFyIER1cGxleCA9IHJlcXVpcmUoJy4vX3N0cmVhbV9kdXBsZXgnKTtcblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciB1dGlsID0gcmVxdWlyZSgnY29yZS11dGlsLWlzJyk7XG51dGlsLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG51dGlsLmluaGVyaXRzKFRyYW5zZm9ybSwgRHVwbGV4KTtcblxuXG5mdW5jdGlvbiBUcmFuc2Zvcm1TdGF0ZShvcHRpb25zLCBzdHJlYW0pIHtcbiAgdGhpcy5hZnRlclRyYW5zZm9ybSA9IGZ1bmN0aW9uKGVyLCBkYXRhKSB7XG4gICAgcmV0dXJuIGFmdGVyVHJhbnNmb3JtKHN0cmVhbSwgZXIsIGRhdGEpO1xuICB9O1xuXG4gIHRoaXMubmVlZFRyYW5zZm9ybSA9IGZhbHNlO1xuICB0aGlzLnRyYW5zZm9ybWluZyA9IGZhbHNlO1xuICB0aGlzLndyaXRlY2IgPSBudWxsO1xuICB0aGlzLndyaXRlY2h1bmsgPSBudWxsO1xufVxuXG5mdW5jdGlvbiBhZnRlclRyYW5zZm9ybShzdHJlYW0sIGVyLCBkYXRhKSB7XG4gIHZhciB0cyA9IHN0cmVhbS5fdHJhbnNmb3JtU3RhdGU7XG4gIHRzLnRyYW5zZm9ybWluZyA9IGZhbHNlO1xuXG4gIHZhciBjYiA9IHRzLndyaXRlY2I7XG5cbiAgaWYgKCFjYilcbiAgICByZXR1cm4gc3RyZWFtLmVtaXQoJ2Vycm9yJywgbmV3IEVycm9yKCdubyB3cml0ZWNiIGluIFRyYW5zZm9ybSBjbGFzcycpKTtcblxuICB0cy53cml0ZWNodW5rID0gbnVsbDtcbiAgdHMud3JpdGVjYiA9IG51bGw7XG5cbiAgaWYgKGRhdGEgIT09IG51bGwgJiYgZGF0YSAhPT0gdW5kZWZpbmVkKVxuICAgIHN0cmVhbS5wdXNoKGRhdGEpO1xuXG4gIGlmIChjYilcbiAgICBjYihlcik7XG5cbiAgdmFyIHJzID0gc3RyZWFtLl9yZWFkYWJsZVN0YXRlO1xuICBycy5yZWFkaW5nID0gZmFsc2U7XG4gIGlmIChycy5uZWVkUmVhZGFibGUgfHwgcnMubGVuZ3RoIDwgcnMuaGlnaFdhdGVyTWFyaykge1xuICAgIHN0cmVhbS5fcmVhZChycy5oaWdoV2F0ZXJNYXJrKTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIFRyYW5zZm9ybShvcHRpb25zKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBUcmFuc2Zvcm0pKVxuICAgIHJldHVybiBuZXcgVHJhbnNmb3JtKG9wdGlvbnMpO1xuXG4gIER1cGxleC5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXG4gIHZhciB0cyA9IHRoaXMuX3RyYW5zZm9ybVN0YXRlID0gbmV3IFRyYW5zZm9ybVN0YXRlKG9wdGlvbnMsIHRoaXMpO1xuXG4gIC8vIHdoZW4gdGhlIHdyaXRhYmxlIHNpZGUgZmluaXNoZXMsIHRoZW4gZmx1c2ggb3V0IGFueXRoaW5nIHJlbWFpbmluZy5cbiAgdmFyIHN0cmVhbSA9IHRoaXM7XG5cbiAgLy8gc3RhcnQgb3V0IGFza2luZyBmb3IgYSByZWFkYWJsZSBldmVudCBvbmNlIGRhdGEgaXMgdHJhbnNmb3JtZWQuXG4gIHRoaXMuX3JlYWRhYmxlU3RhdGUubmVlZFJlYWRhYmxlID0gdHJ1ZTtcblxuICAvLyB3ZSBoYXZlIGltcGxlbWVudGVkIHRoZSBfcmVhZCBtZXRob2QsIGFuZCBkb25lIHRoZSBvdGhlciB0aGluZ3NcbiAgLy8gdGhhdCBSZWFkYWJsZSB3YW50cyBiZWZvcmUgdGhlIGZpcnN0IF9yZWFkIGNhbGwsIHNvIHVuc2V0IHRoZVxuICAvLyBzeW5jIGd1YXJkIGZsYWcuXG4gIHRoaXMuX3JlYWRhYmxlU3RhdGUuc3luYyA9IGZhbHNlO1xuXG4gIHRoaXMub25jZSgnZmluaXNoJywgZnVuY3Rpb24oKSB7XG4gICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiB0aGlzLl9mbHVzaClcbiAgICAgIHRoaXMuX2ZsdXNoKGZ1bmN0aW9uKGVyKSB7XG4gICAgICAgIGRvbmUoc3RyZWFtLCBlcik7XG4gICAgICB9KTtcbiAgICBlbHNlXG4gICAgICBkb25lKHN0cmVhbSk7XG4gIH0pO1xufVxuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcpIHtcbiAgdGhpcy5fdHJhbnNmb3JtU3RhdGUubmVlZFRyYW5zZm9ybSA9IGZhbHNlO1xuICByZXR1cm4gRHVwbGV4LnByb3RvdHlwZS5wdXNoLmNhbGwodGhpcywgY2h1bmssIGVuY29kaW5nKTtcbn07XG5cbi8vIFRoaXMgaXMgdGhlIHBhcnQgd2hlcmUgeW91IGRvIHN0dWZmIVxuLy8gb3ZlcnJpZGUgdGhpcyBmdW5jdGlvbiBpbiBpbXBsZW1lbnRhdGlvbiBjbGFzc2VzLlxuLy8gJ2NodW5rJyBpcyBhbiBpbnB1dCBjaHVuay5cbi8vXG4vLyBDYWxsIGBwdXNoKG5ld0NodW5rKWAgdG8gcGFzcyBhbG9uZyB0cmFuc2Zvcm1lZCBvdXRwdXRcbi8vIHRvIHRoZSByZWFkYWJsZSBzaWRlLiAgWW91IG1heSBjYWxsICdwdXNoJyB6ZXJvIG9yIG1vcmUgdGltZXMuXG4vL1xuLy8gQ2FsbCBgY2IoZXJyKWAgd2hlbiB5b3UgYXJlIGRvbmUgd2l0aCB0aGlzIGNodW5rLiAgSWYgeW91IHBhc3Ncbi8vIGFuIGVycm9yLCB0aGVuIHRoYXQnbGwgcHV0IHRoZSBodXJ0IG9uIHRoZSB3aG9sZSBvcGVyYXRpb24uICBJZiB5b3Vcbi8vIG5ldmVyIGNhbGwgY2IoKSwgdGhlbiB5b3UnbGwgbmV2ZXIgZ2V0IGFub3RoZXIgY2h1bmsuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG59O1xuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLl93cml0ZSA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgdmFyIHRzID0gdGhpcy5fdHJhbnNmb3JtU3RhdGU7XG4gIHRzLndyaXRlY2IgPSBjYjtcbiAgdHMud3JpdGVjaHVuayA9IGNodW5rO1xuICB0cy53cml0ZWVuY29kaW5nID0gZW5jb2Rpbmc7XG4gIGlmICghdHMudHJhbnNmb3JtaW5nKSB7XG4gICAgdmFyIHJzID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcbiAgICBpZiAodHMubmVlZFRyYW5zZm9ybSB8fFxuICAgICAgICBycy5uZWVkUmVhZGFibGUgfHxcbiAgICAgICAgcnMubGVuZ3RoIDwgcnMuaGlnaFdhdGVyTWFyaylcbiAgICAgIHRoaXMuX3JlYWQocnMuaGlnaFdhdGVyTWFyayk7XG4gIH1cbn07XG5cbi8vIERvZXNuJ3QgbWF0dGVyIHdoYXQgdGhlIGFyZ3MgYXJlIGhlcmUuXG4vLyBfdHJhbnNmb3JtIGRvZXMgYWxsIHRoZSB3b3JrLlxuLy8gVGhhdCB3ZSBnb3QgaGVyZSBtZWFucyB0aGF0IHRoZSByZWFkYWJsZSBzaWRlIHdhbnRzIG1vcmUgZGF0YS5cblRyYW5zZm9ybS5wcm90b3R5cGUuX3JlYWQgPSBmdW5jdGlvbihuKSB7XG4gIHZhciB0cyA9IHRoaXMuX3RyYW5zZm9ybVN0YXRlO1xuXG4gIGlmICh0cy53cml0ZWNodW5rICE9PSBudWxsICYmIHRzLndyaXRlY2IgJiYgIXRzLnRyYW5zZm9ybWluZykge1xuICAgIHRzLnRyYW5zZm9ybWluZyA9IHRydWU7XG4gICAgdGhpcy5fdHJhbnNmb3JtKHRzLndyaXRlY2h1bmssIHRzLndyaXRlZW5jb2RpbmcsIHRzLmFmdGVyVHJhbnNmb3JtKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBtYXJrIHRoYXQgd2UgbmVlZCBhIHRyYW5zZm9ybSwgc28gdGhhdCBhbnkgZGF0YSB0aGF0IGNvbWVzIGluXG4gICAgLy8gd2lsbCBnZXQgcHJvY2Vzc2VkLCBub3cgdGhhdCB3ZSd2ZSBhc2tlZCBmb3IgaXQuXG4gICAgdHMubmVlZFRyYW5zZm9ybSA9IHRydWU7XG4gIH1cbn07XG5cblxuZnVuY3Rpb24gZG9uZShzdHJlYW0sIGVyKSB7XG4gIGlmIChlcilcbiAgICByZXR1cm4gc3RyZWFtLmVtaXQoJ2Vycm9yJywgZXIpO1xuXG4gIC8vIGlmIHRoZXJlJ3Mgbm90aGluZyBpbiB0aGUgd3JpdGUgYnVmZmVyLCB0aGVuIHRoYXQgbWVhbnNcbiAgLy8gdGhhdCBub3RoaW5nIG1vcmUgd2lsbCBldmVyIGJlIHByb3ZpZGVkXG4gIHZhciB3cyA9IHN0cmVhbS5fd3JpdGFibGVTdGF0ZTtcbiAgdmFyIHJzID0gc3RyZWFtLl9yZWFkYWJsZVN0YXRlO1xuICB2YXIgdHMgPSBzdHJlYW0uX3RyYW5zZm9ybVN0YXRlO1xuXG4gIGlmICh3cy5sZW5ndGgpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdjYWxsaW5nIHRyYW5zZm9ybSBkb25lIHdoZW4gd3MubGVuZ3RoICE9IDAnKTtcblxuICBpZiAodHMudHJhbnNmb3JtaW5nKVxuICAgIHRocm93IG5ldyBFcnJvcignY2FsbGluZyB0cmFuc2Zvcm0gZG9uZSB3aGVuIHN0aWxsIHRyYW5zZm9ybWluZycpO1xuXG4gIHJldHVybiBzdHJlYW0ucHVzaChudWxsKTtcbn1cbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyBBIGJpdCBzaW1wbGVyIHRoYW4gcmVhZGFibGUgc3RyZWFtcy5cbi8vIEltcGxlbWVudCBhbiBhc3luYyAuX3dyaXRlKGNodW5rLCBjYiksIGFuZCBpdCdsbCBoYW5kbGUgYWxsXG4vLyB0aGUgZHJhaW4gZXZlbnQgZW1pc3Npb24gYW5kIGJ1ZmZlcmluZy5cblxubW9kdWxlLmV4cG9ydHMgPSBXcml0YWJsZTtcblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciBCdWZmZXIgPSByZXF1aXJlKCdidWZmZXInKS5CdWZmZXI7XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxuV3JpdGFibGUuV3JpdGFibGVTdGF0ZSA9IFdyaXRhYmxlU3RhdGU7XG5cblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciB1dGlsID0gcmVxdWlyZSgnY29yZS11dGlsLWlzJyk7XG51dGlsLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG52YXIgU3RyZWFtID0gcmVxdWlyZSgnc3RyZWFtJyk7XG5cbnV0aWwuaW5oZXJpdHMoV3JpdGFibGUsIFN0cmVhbSk7XG5cbmZ1bmN0aW9uIFdyaXRlUmVxKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgdGhpcy5jaHVuayA9IGNodW5rO1xuICB0aGlzLmVuY29kaW5nID0gZW5jb2Rpbmc7XG4gIHRoaXMuY2FsbGJhY2sgPSBjYjtcbn1cblxuZnVuY3Rpb24gV3JpdGFibGVTdGF0ZShvcHRpb25zLCBzdHJlYW0pIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgLy8gdGhlIHBvaW50IGF0IHdoaWNoIHdyaXRlKCkgc3RhcnRzIHJldHVybmluZyBmYWxzZVxuICAvLyBOb3RlOiAwIGlzIGEgdmFsaWQgdmFsdWUsIG1lYW5zIHRoYXQgd2UgYWx3YXlzIHJldHVybiBmYWxzZSBpZlxuICAvLyB0aGUgZW50aXJlIGJ1ZmZlciBpcyBub3QgZmx1c2hlZCBpbW1lZGlhdGVseSBvbiB3cml0ZSgpXG4gIHZhciBod20gPSBvcHRpb25zLmhpZ2hXYXRlck1hcms7XG4gIHRoaXMuaGlnaFdhdGVyTWFyayA9IChod20gfHwgaHdtID09PSAwKSA/IGh3bSA6IDE2ICogMTAyNDtcblxuICAvLyBvYmplY3Qgc3RyZWFtIGZsYWcgdG8gaW5kaWNhdGUgd2hldGhlciBvciBub3QgdGhpcyBzdHJlYW1cbiAgLy8gY29udGFpbnMgYnVmZmVycyBvciBvYmplY3RzLlxuICB0aGlzLm9iamVjdE1vZGUgPSAhIW9wdGlvbnMub2JqZWN0TW9kZTtcblxuICAvLyBjYXN0IHRvIGludHMuXG4gIHRoaXMuaGlnaFdhdGVyTWFyayA9IH5+dGhpcy5oaWdoV2F0ZXJNYXJrO1xuXG4gIHRoaXMubmVlZERyYWluID0gZmFsc2U7XG4gIC8vIGF0IHRoZSBzdGFydCBvZiBjYWxsaW5nIGVuZCgpXG4gIHRoaXMuZW5kaW5nID0gZmFsc2U7XG4gIC8vIHdoZW4gZW5kKCkgaGFzIGJlZW4gY2FsbGVkLCBhbmQgcmV0dXJuZWRcbiAgdGhpcy5lbmRlZCA9IGZhbHNlO1xuICAvLyB3aGVuICdmaW5pc2gnIGlzIGVtaXR0ZWRcbiAgdGhpcy5maW5pc2hlZCA9IGZhbHNlO1xuXG4gIC8vIHNob3VsZCB3ZSBkZWNvZGUgc3RyaW5ncyBpbnRvIGJ1ZmZlcnMgYmVmb3JlIHBhc3NpbmcgdG8gX3dyaXRlP1xuICAvLyB0aGlzIGlzIGhlcmUgc28gdGhhdCBzb21lIG5vZGUtY29yZSBzdHJlYW1zIGNhbiBvcHRpbWl6ZSBzdHJpbmdcbiAgLy8gaGFuZGxpbmcgYXQgYSBsb3dlciBsZXZlbC5cbiAgdmFyIG5vRGVjb2RlID0gb3B0aW9ucy5kZWNvZGVTdHJpbmdzID09PSBmYWxzZTtcbiAgdGhpcy5kZWNvZGVTdHJpbmdzID0gIW5vRGVjb2RlO1xuXG4gIC8vIENyeXB0byBpcyBraW5kIG9mIG9sZCBhbmQgY3J1c3R5LiAgSGlzdG9yaWNhbGx5LCBpdHMgZGVmYXVsdCBzdHJpbmdcbiAgLy8gZW5jb2RpbmcgaXMgJ2JpbmFyeScgc28gd2UgaGF2ZSB0byBtYWtlIHRoaXMgY29uZmlndXJhYmxlLlxuICAvLyBFdmVyeXRoaW5nIGVsc2UgaW4gdGhlIHVuaXZlcnNlIHVzZXMgJ3V0ZjgnLCB0aG91Z2guXG4gIHRoaXMuZGVmYXVsdEVuY29kaW5nID0gb3B0aW9ucy5kZWZhdWx0RW5jb2RpbmcgfHwgJ3V0ZjgnO1xuXG4gIC8vIG5vdCBhbiBhY3R1YWwgYnVmZmVyIHdlIGtlZXAgdHJhY2sgb2YsIGJ1dCBhIG1lYXN1cmVtZW50XG4gIC8vIG9mIGhvdyBtdWNoIHdlJ3JlIHdhaXRpbmcgdG8gZ2V0IHB1c2hlZCB0byBzb21lIHVuZGVybHlpbmdcbiAgLy8gc29ja2V0IG9yIGZpbGUuXG4gIHRoaXMubGVuZ3RoID0gMDtcblxuICAvLyBhIGZsYWcgdG8gc2VlIHdoZW4gd2UncmUgaW4gdGhlIG1pZGRsZSBvZiBhIHdyaXRlLlxuICB0aGlzLndyaXRpbmcgPSBmYWxzZTtcblxuICAvLyBhIGZsYWcgdG8gYmUgYWJsZSB0byB0ZWxsIGlmIHRoZSBvbndyaXRlIGNiIGlzIGNhbGxlZCBpbW1lZGlhdGVseSxcbiAgLy8gb3Igb24gYSBsYXRlciB0aWNrLiAgV2Ugc2V0IHRoaXMgdG8gdHJ1ZSBhdCBmaXJzdCwgYmVjdWFzZSBhbnlcbiAgLy8gYWN0aW9ucyB0aGF0IHNob3VsZG4ndCBoYXBwZW4gdW50aWwgXCJsYXRlclwiIHNob3VsZCBnZW5lcmFsbHkgYWxzb1xuICAvLyBub3QgaGFwcGVuIGJlZm9yZSB0aGUgZmlyc3Qgd3JpdGUgY2FsbC5cbiAgdGhpcy5zeW5jID0gdHJ1ZTtcblxuICAvLyBhIGZsYWcgdG8ga25vdyBpZiB3ZSdyZSBwcm9jZXNzaW5nIHByZXZpb3VzbHkgYnVmZmVyZWQgaXRlbXMsIHdoaWNoXG4gIC8vIG1heSBjYWxsIHRoZSBfd3JpdGUoKSBjYWxsYmFjayBpbiB0aGUgc2FtZSB0aWNrLCBzbyB0aGF0IHdlIGRvbid0XG4gIC8vIGVuZCB1cCBpbiBhbiBvdmVybGFwcGVkIG9ud3JpdGUgc2l0dWF0aW9uLlxuICB0aGlzLmJ1ZmZlclByb2Nlc3NpbmcgPSBmYWxzZTtcblxuICAvLyB0aGUgY2FsbGJhY2sgdGhhdCdzIHBhc3NlZCB0byBfd3JpdGUoY2h1bmssY2IpXG4gIHRoaXMub253cml0ZSA9IGZ1bmN0aW9uKGVyKSB7XG4gICAgb253cml0ZShzdHJlYW0sIGVyKTtcbiAgfTtcblxuICAvLyB0aGUgY2FsbGJhY2sgdGhhdCB0aGUgdXNlciBzdXBwbGllcyB0byB3cml0ZShjaHVuayxlbmNvZGluZyxjYilcbiAgdGhpcy53cml0ZWNiID0gbnVsbDtcblxuICAvLyB0aGUgYW1vdW50IHRoYXQgaXMgYmVpbmcgd3JpdHRlbiB3aGVuIF93cml0ZSBpcyBjYWxsZWQuXG4gIHRoaXMud3JpdGVsZW4gPSAwO1xuXG4gIHRoaXMuYnVmZmVyID0gW107XG5cbiAgLy8gVHJ1ZSBpZiB0aGUgZXJyb3Igd2FzIGFscmVhZHkgZW1pdHRlZCBhbmQgc2hvdWxkIG5vdCBiZSB0aHJvd24gYWdhaW5cbiAgdGhpcy5lcnJvckVtaXR0ZWQgPSBmYWxzZTtcbn1cblxuZnVuY3Rpb24gV3JpdGFibGUob3B0aW9ucykge1xuICB2YXIgRHVwbGV4ID0gcmVxdWlyZSgnLi9fc3RyZWFtX2R1cGxleCcpO1xuXG4gIC8vIFdyaXRhYmxlIGN0b3IgaXMgYXBwbGllZCB0byBEdXBsZXhlcywgdGhvdWdoIHRoZXkncmUgbm90XG4gIC8vIGluc3RhbmNlb2YgV3JpdGFibGUsIHRoZXkncmUgaW5zdGFuY2VvZiBSZWFkYWJsZS5cbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdyaXRhYmxlKSAmJiAhKHRoaXMgaW5zdGFuY2VvZiBEdXBsZXgpKVxuICAgIHJldHVybiBuZXcgV3JpdGFibGUob3B0aW9ucyk7XG5cbiAgdGhpcy5fd3JpdGFibGVTdGF0ZSA9IG5ldyBXcml0YWJsZVN0YXRlKG9wdGlvbnMsIHRoaXMpO1xuXG4gIC8vIGxlZ2FjeS5cbiAgdGhpcy53cml0YWJsZSA9IHRydWU7XG5cbiAgU3RyZWFtLmNhbGwodGhpcyk7XG59XG5cbi8vIE90aGVyd2lzZSBwZW9wbGUgY2FuIHBpcGUgV3JpdGFibGUgc3RyZWFtcywgd2hpY2ggaXMganVzdCB3cm9uZy5cbldyaXRhYmxlLnByb3RvdHlwZS5waXBlID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZW1pdCgnZXJyb3InLCBuZXcgRXJyb3IoJ0Nhbm5vdCBwaXBlLiBOb3QgcmVhZGFibGUuJykpO1xufTtcblxuXG5mdW5jdGlvbiB3cml0ZUFmdGVyRW5kKHN0cmVhbSwgc3RhdGUsIGNiKSB7XG4gIHZhciBlciA9IG5ldyBFcnJvcignd3JpdGUgYWZ0ZXIgZW5kJyk7XG4gIC8vIFRPRE86IGRlZmVyIGVycm9yIGV2ZW50cyBjb25zaXN0ZW50bHkgZXZlcnl3aGVyZSwgbm90IGp1c3QgdGhlIGNiXG4gIHN0cmVhbS5lbWl0KCdlcnJvcicsIGVyKTtcbiAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICBjYihlcik7XG4gIH0pO1xufVxuXG4vLyBJZiB3ZSBnZXQgc29tZXRoaW5nIHRoYXQgaXMgbm90IGEgYnVmZmVyLCBzdHJpbmcsIG51bGwsIG9yIHVuZGVmaW5lZCxcbi8vIGFuZCB3ZSdyZSBub3QgaW4gb2JqZWN0TW9kZSwgdGhlbiB0aGF0J3MgYW4gZXJyb3IuXG4vLyBPdGhlcndpc2Ugc3RyZWFtIGNodW5rcyBhcmUgYWxsIGNvbnNpZGVyZWQgdG8gYmUgb2YgbGVuZ3RoPTEsIGFuZCB0aGVcbi8vIHdhdGVybWFya3MgZGV0ZXJtaW5lIGhvdyBtYW55IG9iamVjdHMgdG8ga2VlcCBpbiB0aGUgYnVmZmVyLCByYXRoZXIgdGhhblxuLy8gaG93IG1hbnkgYnl0ZXMgb3IgY2hhcmFjdGVycy5cbmZ1bmN0aW9uIHZhbGlkQ2h1bmsoc3RyZWFtLCBzdGF0ZSwgY2h1bmssIGNiKSB7XG4gIHZhciB2YWxpZCA9IHRydWU7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGNodW5rKSAmJlxuICAgICAgJ3N0cmluZycgIT09IHR5cGVvZiBjaHVuayAmJlxuICAgICAgY2h1bmsgIT09IG51bGwgJiZcbiAgICAgIGNodW5rICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICFzdGF0ZS5vYmplY3RNb2RlKSB7XG4gICAgdmFyIGVyID0gbmV3IFR5cGVFcnJvcignSW52YWxpZCBub24tc3RyaW5nL2J1ZmZlciBjaHVuaycpO1xuICAgIHN0cmVhbS5lbWl0KCdlcnJvcicsIGVyKTtcbiAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgY2IoZXIpO1xuICAgIH0pO1xuICAgIHZhbGlkID0gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHZhbGlkO1xufVxuXG5Xcml0YWJsZS5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3dyaXRhYmxlU3RhdGU7XG4gIHZhciByZXQgPSBmYWxzZTtcblxuICBpZiAodHlwZW9mIGVuY29kaW5nID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2IgPSBlbmNvZGluZztcbiAgICBlbmNvZGluZyA9IG51bGw7XG4gIH1cblxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKGNodW5rKSlcbiAgICBlbmNvZGluZyA9ICdidWZmZXInO1xuICBlbHNlIGlmICghZW5jb2RpbmcpXG4gICAgZW5jb2RpbmcgPSBzdGF0ZS5kZWZhdWx0RW5jb2Rpbmc7XG5cbiAgaWYgKHR5cGVvZiBjYiAhPT0gJ2Z1bmN0aW9uJylcbiAgICBjYiA9IGZ1bmN0aW9uKCkge307XG5cbiAgaWYgKHN0YXRlLmVuZGVkKVxuICAgIHdyaXRlQWZ0ZXJFbmQodGhpcywgc3RhdGUsIGNiKTtcbiAgZWxzZSBpZiAodmFsaWRDaHVuayh0aGlzLCBzdGF0ZSwgY2h1bmssIGNiKSlcbiAgICByZXQgPSB3cml0ZU9yQnVmZmVyKHRoaXMsIHN0YXRlLCBjaHVuaywgZW5jb2RpbmcsIGNiKTtcblxuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gZGVjb2RlQ2h1bmsoc3RhdGUsIGNodW5rLCBlbmNvZGluZykge1xuICBpZiAoIXN0YXRlLm9iamVjdE1vZGUgJiZcbiAgICAgIHN0YXRlLmRlY29kZVN0cmluZ3MgIT09IGZhbHNlICYmXG4gICAgICB0eXBlb2YgY2h1bmsgPT09ICdzdHJpbmcnKSB7XG4gICAgY2h1bmsgPSBuZXcgQnVmZmVyKGNodW5rLCBlbmNvZGluZyk7XG4gIH1cbiAgcmV0dXJuIGNodW5rO1xufVxuXG4vLyBpZiB3ZSdyZSBhbHJlYWR5IHdyaXRpbmcgc29tZXRoaW5nLCB0aGVuIGp1c3QgcHV0IHRoaXNcbi8vIGluIHRoZSBxdWV1ZSwgYW5kIHdhaXQgb3VyIHR1cm4uICBPdGhlcndpc2UsIGNhbGwgX3dyaXRlXG4vLyBJZiB3ZSByZXR1cm4gZmFsc2UsIHRoZW4gd2UgbmVlZCBhIGRyYWluIGV2ZW50LCBzbyBzZXQgdGhhdCBmbGFnLlxuZnVuY3Rpb24gd3JpdGVPckJ1ZmZlcihzdHJlYW0sIHN0YXRlLCBjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIGNodW5rID0gZGVjb2RlQ2h1bmsoc3RhdGUsIGNodW5rLCBlbmNvZGluZyk7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoY2h1bmspKVxuICAgIGVuY29kaW5nID0gJ2J1ZmZlcic7XG4gIHZhciBsZW4gPSBzdGF0ZS5vYmplY3RNb2RlID8gMSA6IGNodW5rLmxlbmd0aDtcblxuICBzdGF0ZS5sZW5ndGggKz0gbGVuO1xuXG4gIHZhciByZXQgPSBzdGF0ZS5sZW5ndGggPCBzdGF0ZS5oaWdoV2F0ZXJNYXJrO1xuICAvLyB3ZSBtdXN0IGVuc3VyZSB0aGF0IHByZXZpb3VzIG5lZWREcmFpbiB3aWxsIG5vdCBiZSByZXNldCB0byBmYWxzZS5cbiAgaWYgKCFyZXQpXG4gICAgc3RhdGUubmVlZERyYWluID0gdHJ1ZTtcblxuICBpZiAoc3RhdGUud3JpdGluZylcbiAgICBzdGF0ZS5idWZmZXIucHVzaChuZXcgV3JpdGVSZXEoY2h1bmssIGVuY29kaW5nLCBjYikpO1xuICBlbHNlXG4gICAgZG9Xcml0ZShzdHJlYW0sIHN0YXRlLCBsZW4sIGNodW5rLCBlbmNvZGluZywgY2IpO1xuXG4gIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIGRvV3JpdGUoc3RyZWFtLCBzdGF0ZSwgbGVuLCBjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIHN0YXRlLndyaXRlbGVuID0gbGVuO1xuICBzdGF0ZS53cml0ZWNiID0gY2I7XG4gIHN0YXRlLndyaXRpbmcgPSB0cnVlO1xuICBzdGF0ZS5zeW5jID0gdHJ1ZTtcbiAgc3RyZWFtLl93cml0ZShjaHVuaywgZW5jb2RpbmcsIHN0YXRlLm9ud3JpdGUpO1xuICBzdGF0ZS5zeW5jID0gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIG9ud3JpdGVFcnJvcihzdHJlYW0sIHN0YXRlLCBzeW5jLCBlciwgY2IpIHtcbiAgaWYgKHN5bmMpXG4gICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIGNiKGVyKTtcbiAgICB9KTtcbiAgZWxzZVxuICAgIGNiKGVyKTtcblxuICBzdHJlYW0uX3dyaXRhYmxlU3RhdGUuZXJyb3JFbWl0dGVkID0gdHJ1ZTtcbiAgc3RyZWFtLmVtaXQoJ2Vycm9yJywgZXIpO1xufVxuXG5mdW5jdGlvbiBvbndyaXRlU3RhdGVVcGRhdGUoc3RhdGUpIHtcbiAgc3RhdGUud3JpdGluZyA9IGZhbHNlO1xuICBzdGF0ZS53cml0ZWNiID0gbnVsbDtcbiAgc3RhdGUubGVuZ3RoIC09IHN0YXRlLndyaXRlbGVuO1xuICBzdGF0ZS53cml0ZWxlbiA9IDA7XG59XG5cbmZ1bmN0aW9uIG9ud3JpdGUoc3RyZWFtLCBlcikge1xuICB2YXIgc3RhdGUgPSBzdHJlYW0uX3dyaXRhYmxlU3RhdGU7XG4gIHZhciBzeW5jID0gc3RhdGUuc3luYztcbiAgdmFyIGNiID0gc3RhdGUud3JpdGVjYjtcblxuICBvbndyaXRlU3RhdGVVcGRhdGUoc3RhdGUpO1xuXG4gIGlmIChlcilcbiAgICBvbndyaXRlRXJyb3Ioc3RyZWFtLCBzdGF0ZSwgc3luYywgZXIsIGNiKTtcbiAgZWxzZSB7XG4gICAgLy8gQ2hlY2sgaWYgd2UncmUgYWN0dWFsbHkgcmVhZHkgdG8gZmluaXNoLCBidXQgZG9uJ3QgZW1pdCB5ZXRcbiAgICB2YXIgZmluaXNoZWQgPSBuZWVkRmluaXNoKHN0cmVhbSwgc3RhdGUpO1xuXG4gICAgaWYgKCFmaW5pc2hlZCAmJiAhc3RhdGUuYnVmZmVyUHJvY2Vzc2luZyAmJiBzdGF0ZS5idWZmZXIubGVuZ3RoKVxuICAgICAgY2xlYXJCdWZmZXIoc3RyZWFtLCBzdGF0ZSk7XG5cbiAgICBpZiAoc3luYykge1xuICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgICAgYWZ0ZXJXcml0ZShzdHJlYW0sIHN0YXRlLCBmaW5pc2hlZCwgY2IpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFmdGVyV3JpdGUoc3RyZWFtLCBzdGF0ZSwgZmluaXNoZWQsIGNiKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gYWZ0ZXJXcml0ZShzdHJlYW0sIHN0YXRlLCBmaW5pc2hlZCwgY2IpIHtcbiAgaWYgKCFmaW5pc2hlZClcbiAgICBvbndyaXRlRHJhaW4oc3RyZWFtLCBzdGF0ZSk7XG4gIGNiKCk7XG4gIGlmIChmaW5pc2hlZClcbiAgICBmaW5pc2hNYXliZShzdHJlYW0sIHN0YXRlKTtcbn1cblxuLy8gTXVzdCBmb3JjZSBjYWxsYmFjayB0byBiZSBjYWxsZWQgb24gbmV4dFRpY2ssIHNvIHRoYXQgd2UgZG9uJ3Rcbi8vIGVtaXQgJ2RyYWluJyBiZWZvcmUgdGhlIHdyaXRlKCkgY29uc3VtZXIgZ2V0cyB0aGUgJ2ZhbHNlJyByZXR1cm5cbi8vIHZhbHVlLCBhbmQgaGFzIGEgY2hhbmNlIHRvIGF0dGFjaCBhICdkcmFpbicgbGlzdGVuZXIuXG5mdW5jdGlvbiBvbndyaXRlRHJhaW4oc3RyZWFtLCBzdGF0ZSkge1xuICBpZiAoc3RhdGUubGVuZ3RoID09PSAwICYmIHN0YXRlLm5lZWREcmFpbikge1xuICAgIHN0YXRlLm5lZWREcmFpbiA9IGZhbHNlO1xuICAgIHN0cmVhbS5lbWl0KCdkcmFpbicpO1xuICB9XG59XG5cblxuLy8gaWYgdGhlcmUncyBzb21ldGhpbmcgaW4gdGhlIGJ1ZmZlciB3YWl0aW5nLCB0aGVuIHByb2Nlc3MgaXRcbmZ1bmN0aW9uIGNsZWFyQnVmZmVyKHN0cmVhbSwgc3RhdGUpIHtcbiAgc3RhdGUuYnVmZmVyUHJvY2Vzc2luZyA9IHRydWU7XG5cbiAgZm9yICh2YXIgYyA9IDA7IGMgPCBzdGF0ZS5idWZmZXIubGVuZ3RoOyBjKyspIHtcbiAgICB2YXIgZW50cnkgPSBzdGF0ZS5idWZmZXJbY107XG4gICAgdmFyIGNodW5rID0gZW50cnkuY2h1bms7XG4gICAgdmFyIGVuY29kaW5nID0gZW50cnkuZW5jb2Rpbmc7XG4gICAgdmFyIGNiID0gZW50cnkuY2FsbGJhY2s7XG4gICAgdmFyIGxlbiA9IHN0YXRlLm9iamVjdE1vZGUgPyAxIDogY2h1bmsubGVuZ3RoO1xuXG4gICAgZG9Xcml0ZShzdHJlYW0sIHN0YXRlLCBsZW4sIGNodW5rLCBlbmNvZGluZywgY2IpO1xuXG4gICAgLy8gaWYgd2UgZGlkbid0IGNhbGwgdGhlIG9ud3JpdGUgaW1tZWRpYXRlbHksIHRoZW5cbiAgICAvLyBpdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gd2FpdCB1bnRpbCBpdCBkb2VzLlxuICAgIC8vIGFsc28sIHRoYXQgbWVhbnMgdGhhdCB0aGUgY2h1bmsgYW5kIGNiIGFyZSBjdXJyZW50bHlcbiAgICAvLyBiZWluZyBwcm9jZXNzZWQsIHNvIG1vdmUgdGhlIGJ1ZmZlciBjb3VudGVyIHBhc3QgdGhlbS5cbiAgICBpZiAoc3RhdGUud3JpdGluZykge1xuICAgICAgYysrO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgc3RhdGUuYnVmZmVyUHJvY2Vzc2luZyA9IGZhbHNlO1xuICBpZiAoYyA8IHN0YXRlLmJ1ZmZlci5sZW5ndGgpXG4gICAgc3RhdGUuYnVmZmVyID0gc3RhdGUuYnVmZmVyLnNsaWNlKGMpO1xuICBlbHNlXG4gICAgc3RhdGUuYnVmZmVyLmxlbmd0aCA9IDA7XG59XG5cbldyaXRhYmxlLnByb3RvdHlwZS5fd3JpdGUgPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIGNiKG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJykpO1xufTtcblxuV3JpdGFibGUucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fd3JpdGFibGVTdGF0ZTtcblxuICBpZiAodHlwZW9mIGNodW5rID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2IgPSBjaHVuaztcbiAgICBjaHVuayA9IG51bGw7XG4gICAgZW5jb2RpbmcgPSBudWxsO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBlbmNvZGluZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGNiID0gZW5jb2Rpbmc7XG4gICAgZW5jb2RpbmcgPSBudWxsO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBjaHVuayAhPT0gJ3VuZGVmaW5lZCcgJiYgY2h1bmsgIT09IG51bGwpXG4gICAgdGhpcy53cml0ZShjaHVuaywgZW5jb2RpbmcpO1xuXG4gIC8vIGlnbm9yZSB1bm5lY2Vzc2FyeSBlbmQoKSBjYWxscy5cbiAgaWYgKCFzdGF0ZS5lbmRpbmcgJiYgIXN0YXRlLmZpbmlzaGVkKVxuICAgIGVuZFdyaXRhYmxlKHRoaXMsIHN0YXRlLCBjYik7XG59O1xuXG5cbmZ1bmN0aW9uIG5lZWRGaW5pc2goc3RyZWFtLCBzdGF0ZSkge1xuICByZXR1cm4gKHN0YXRlLmVuZGluZyAmJlxuICAgICAgICAgIHN0YXRlLmxlbmd0aCA9PT0gMCAmJlxuICAgICAgICAgICFzdGF0ZS5maW5pc2hlZCAmJlxuICAgICAgICAgICFzdGF0ZS53cml0aW5nKTtcbn1cblxuZnVuY3Rpb24gZmluaXNoTWF5YmUoc3RyZWFtLCBzdGF0ZSkge1xuICB2YXIgbmVlZCA9IG5lZWRGaW5pc2goc3RyZWFtLCBzdGF0ZSk7XG4gIGlmIChuZWVkKSB7XG4gICAgc3RhdGUuZmluaXNoZWQgPSB0cnVlO1xuICAgIHN0cmVhbS5lbWl0KCdmaW5pc2gnKTtcbiAgfVxuICByZXR1cm4gbmVlZDtcbn1cblxuZnVuY3Rpb24gZW5kV3JpdGFibGUoc3RyZWFtLCBzdGF0ZSwgY2IpIHtcbiAgc3RhdGUuZW5kaW5nID0gdHJ1ZTtcbiAgZmluaXNoTWF5YmUoc3RyZWFtLCBzdGF0ZSk7XG4gIGlmIChjYikge1xuICAgIGlmIChzdGF0ZS5maW5pc2hlZClcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soY2IpO1xuICAgIGVsc2VcbiAgICAgIHN0cmVhbS5vbmNlKCdmaW5pc2gnLCBjYik7XG4gIH1cbiAgc3RhdGUuZW5kZWQgPSB0cnVlO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9saWIvX3N0cmVhbV9wYXNzdGhyb3VnaC5qc1wiKVxuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9saWIvX3N0cmVhbV90cmFuc2Zvcm0uanNcIilcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vbGliL19zdHJlYW1fd3JpdGFibGUuanNcIilcbiIsIm1vZHVsZS5leHBvcnRzID0gcmltcmFmXG5yaW1yYWYuc3luYyA9IHJpbXJhZlN5bmNcblxudmFyIGFzc2VydCA9IHJlcXVpcmUoXCJhc3NlcnRcIilcbnZhciBwYXRoID0gcmVxdWlyZShcInBhdGhcIilcbnZhciBmcyA9IHJlcXVpcmUoXCJmc1wiKVxudmFyIGdsb2IgPSB1bmRlZmluZWRcbnRyeSB7XG4gIGdsb2IgPSByZXF1aXJlKFwiZ2xvYlwiKVxufSBjYXRjaCAoX2Vycikge1xuICAvLyB0cmVhdCBnbG9iIGFzIG9wdGlvbmFsLlxufVxudmFyIF8wNjY2ID0gcGFyc2VJbnQoJzY2NicsIDgpXG5cbnZhciBkZWZhdWx0R2xvYk9wdHMgPSB7XG4gIG5vc29ydDogdHJ1ZSxcbiAgc2lsZW50OiB0cnVlXG59XG5cbi8vIGZvciBFTUZJTEUgaGFuZGxpbmdcbnZhciB0aW1lb3V0ID0gMFxuXG52YXIgaXNXaW5kb3dzID0gKHByb2Nlc3MucGxhdGZvcm0gPT09IFwid2luMzJcIilcblxuZnVuY3Rpb24gZGVmYXVsdHMgKG9wdGlvbnMpIHtcbiAgdmFyIG1ldGhvZHMgPSBbXG4gICAgJ3VubGluaycsXG4gICAgJ2NobW9kJyxcbiAgICAnc3RhdCcsXG4gICAgJ2xzdGF0JyxcbiAgICAncm1kaXInLFxuICAgICdyZWFkZGlyJ1xuICBdXG4gIG1ldGhvZHMuZm9yRWFjaChmdW5jdGlvbihtKSB7XG4gICAgb3B0aW9uc1ttXSA9IG9wdGlvbnNbbV0gfHwgZnNbbV1cbiAgICBtID0gbSArICdTeW5jJ1xuICAgIG9wdGlvbnNbbV0gPSBvcHRpb25zW21dIHx8IGZzW21dXG4gIH0pXG5cbiAgb3B0aW9ucy5tYXhCdXN5VHJpZXMgPSBvcHRpb25zLm1heEJ1c3lUcmllcyB8fCAzXG4gIG9wdGlvbnMuZW1maWxlV2FpdCA9IG9wdGlvbnMuZW1maWxlV2FpdCB8fCAxMDAwXG4gIGlmIChvcHRpb25zLmdsb2IgPT09IGZhbHNlKSB7XG4gICAgb3B0aW9ucy5kaXNhYmxlR2xvYiA9IHRydWVcbiAgfVxuICBpZiAob3B0aW9ucy5kaXNhYmxlR2xvYiAhPT0gdHJ1ZSAmJiBnbG9iID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBFcnJvcignZ2xvYiBkZXBlbmRlbmN5IG5vdCBmb3VuZCwgc2V0IGBvcHRpb25zLmRpc2FibGVHbG9iID0gdHJ1ZWAgaWYgaW50ZW50aW9uYWwnKVxuICB9XG4gIG9wdGlvbnMuZGlzYWJsZUdsb2IgPSBvcHRpb25zLmRpc2FibGVHbG9iIHx8IGZhbHNlXG4gIG9wdGlvbnMuZ2xvYiA9IG9wdGlvbnMuZ2xvYiB8fCBkZWZhdWx0R2xvYk9wdHNcbn1cblxuZnVuY3Rpb24gcmltcmFmIChwLCBvcHRpb25zLCBjYikge1xuICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYiA9IG9wdGlvbnNcbiAgICBvcHRpb25zID0ge31cbiAgfVxuXG4gIGFzc2VydChwLCAncmltcmFmOiBtaXNzaW5nIHBhdGgnKVxuICBhc3NlcnQuZXF1YWwodHlwZW9mIHAsICdzdHJpbmcnLCAncmltcmFmOiBwYXRoIHNob3VsZCBiZSBhIHN0cmluZycpXG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgY2IsICdmdW5jdGlvbicsICdyaW1yYWY6IGNhbGxiYWNrIGZ1bmN0aW9uIHJlcXVpcmVkJylcbiAgYXNzZXJ0KG9wdGlvbnMsICdyaW1yYWY6IGludmFsaWQgb3B0aW9ucyBhcmd1bWVudCBwcm92aWRlZCcpXG4gIGFzc2VydC5lcXVhbCh0eXBlb2Ygb3B0aW9ucywgJ29iamVjdCcsICdyaW1yYWY6IG9wdGlvbnMgc2hvdWxkIGJlIG9iamVjdCcpXG5cbiAgZGVmYXVsdHMob3B0aW9ucylcblxuICB2YXIgYnVzeVRyaWVzID0gMFxuICB2YXIgZXJyU3RhdGUgPSBudWxsXG4gIHZhciBuID0gMFxuXG4gIGlmIChvcHRpb25zLmRpc2FibGVHbG9iIHx8ICFnbG9iLmhhc01hZ2ljKHApKVxuICAgIHJldHVybiBhZnRlckdsb2IobnVsbCwgW3BdKVxuXG4gIG9wdGlvbnMubHN0YXQocCwgZnVuY3Rpb24gKGVyLCBzdGF0KSB7XG4gICAgaWYgKCFlcilcbiAgICAgIHJldHVybiBhZnRlckdsb2IobnVsbCwgW3BdKVxuXG4gICAgZ2xvYihwLCBvcHRpb25zLmdsb2IsIGFmdGVyR2xvYilcbiAgfSlcblxuICBmdW5jdGlvbiBuZXh0IChlcikge1xuICAgIGVyclN0YXRlID0gZXJyU3RhdGUgfHwgZXJcbiAgICBpZiAoLS1uID09PSAwKVxuICAgICAgY2IoZXJyU3RhdGUpXG4gIH1cblxuICBmdW5jdGlvbiBhZnRlckdsb2IgKGVyLCByZXN1bHRzKSB7XG4gICAgaWYgKGVyKVxuICAgICAgcmV0dXJuIGNiKGVyKVxuXG4gICAgbiA9IHJlc3VsdHMubGVuZ3RoXG4gICAgaWYgKG4gPT09IDApXG4gICAgICByZXR1cm4gY2IoKVxuXG4gICAgcmVzdWx0cy5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICByaW1yYWZfKHAsIG9wdGlvbnMsIGZ1bmN0aW9uIENCIChlcikge1xuICAgICAgICBpZiAoZXIpIHtcbiAgICAgICAgICBpZiAoKGVyLmNvZGUgPT09IFwiRUJVU1lcIiB8fCBlci5jb2RlID09PSBcIkVOT1RFTVBUWVwiIHx8IGVyLmNvZGUgPT09IFwiRVBFUk1cIikgJiZcbiAgICAgICAgICAgICAgYnVzeVRyaWVzIDwgb3B0aW9ucy5tYXhCdXN5VHJpZXMpIHtcbiAgICAgICAgICAgIGJ1c3lUcmllcyArK1xuICAgICAgICAgICAgdmFyIHRpbWUgPSBidXN5VHJpZXMgKiAxMDBcbiAgICAgICAgICAgIC8vIHRyeSBhZ2Fpbiwgd2l0aCB0aGUgc2FtZSBleGFjdCBjYWxsYmFjayBhcyB0aGlzIG9uZS5cbiAgICAgICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgcmltcmFmXyhwLCBvcHRpb25zLCBDQilcbiAgICAgICAgICAgIH0sIHRpbWUpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gdGhpcyBvbmUgd29uJ3QgaGFwcGVuIGlmIGdyYWNlZnVsLWZzIGlzIHVzZWQuXG4gICAgICAgICAgaWYgKGVyLmNvZGUgPT09IFwiRU1GSUxFXCIgJiYgdGltZW91dCA8IG9wdGlvbnMuZW1maWxlV2FpdCkge1xuICAgICAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICByaW1yYWZfKHAsIG9wdGlvbnMsIENCKVxuICAgICAgICAgICAgfSwgdGltZW91dCArKylcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBhbHJlYWR5IGdvbmVcbiAgICAgICAgICBpZiAoZXIuY29kZSA9PT0gXCJFTk9FTlRcIikgZXIgPSBudWxsXG4gICAgICAgIH1cblxuICAgICAgICB0aW1lb3V0ID0gMFxuICAgICAgICBuZXh0KGVyKVxuICAgICAgfSlcbiAgICB9KVxuICB9XG59XG5cbi8vIFR3byBwb3NzaWJsZSBzdHJhdGVnaWVzLlxuLy8gMS4gQXNzdW1lIGl0J3MgYSBmaWxlLiAgdW5saW5rIGl0LCB0aGVuIGRvIHRoZSBkaXIgc3R1ZmYgb24gRVBFUk0gb3IgRUlTRElSXG4vLyAyLiBBc3N1bWUgaXQncyBhIGRpcmVjdG9yeS4gIHJlYWRkaXIsIHRoZW4gZG8gdGhlIGZpbGUgc3R1ZmYgb24gRU5PVERJUlxuLy9cbi8vIEJvdGggcmVzdWx0IGluIGFuIGV4dHJhIHN5c2NhbGwgd2hlbiB5b3UgZ3Vlc3Mgd3JvbmcuICBIb3dldmVyLCB0aGVyZVxuLy8gYXJlIGxpa2VseSBmYXIgbW9yZSBub3JtYWwgZmlsZXMgaW4gdGhlIHdvcmxkIHRoYW4gZGlyZWN0b3JpZXMuICBUaGlzXG4vLyBpcyBiYXNlZCBvbiB0aGUgYXNzdW1wdGlvbiB0aGF0IGEgdGhlIGF2ZXJhZ2UgbnVtYmVyIG9mIGZpbGVzIHBlclxuLy8gZGlyZWN0b3J5IGlzID49IDEuXG4vL1xuLy8gSWYgYW55b25lIGV2ZXIgY29tcGxhaW5zIGFib3V0IHRoaXMsIHRoZW4gSSBndWVzcyB0aGUgc3RyYXRlZ3kgY291bGRcbi8vIGJlIG1hZGUgY29uZmlndXJhYmxlIHNvbWVob3cuICBCdXQgdW50aWwgdGhlbiwgWUFHTkkuXG5mdW5jdGlvbiByaW1yYWZfIChwLCBvcHRpb25zLCBjYikge1xuICBhc3NlcnQocClcbiAgYXNzZXJ0KG9wdGlvbnMpXG4gIGFzc2VydCh0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpXG5cbiAgLy8gc3Vub3MgbGV0cyB0aGUgcm9vdCB1c2VyIHVubGluayBkaXJlY3Rvcmllcywgd2hpY2ggaXMuLi4gd2VpcmQuXG4gIC8vIHNvIHdlIGhhdmUgdG8gbHN0YXQgaGVyZSBhbmQgbWFrZSBzdXJlIGl0J3Mgbm90IGEgZGlyLlxuICBvcHRpb25zLmxzdGF0KHAsIGZ1bmN0aW9uIChlciwgc3QpIHtcbiAgICBpZiAoZXIgJiYgZXIuY29kZSA9PT0gXCJFTk9FTlRcIilcbiAgICAgIHJldHVybiBjYihudWxsKVxuXG4gICAgLy8gV2luZG93cyBjYW4gRVBFUk0gb24gc3RhdC4gIExpZmUgaXMgc3VmZmVyaW5nLlxuICAgIGlmIChlciAmJiBlci5jb2RlID09PSBcIkVQRVJNXCIgJiYgaXNXaW5kb3dzKVxuICAgICAgZml4V2luRVBFUk0ocCwgb3B0aW9ucywgZXIsIGNiKVxuXG4gICAgaWYgKHN0ICYmIHN0LmlzRGlyZWN0b3J5KCkpXG4gICAgICByZXR1cm4gcm1kaXIocCwgb3B0aW9ucywgZXIsIGNiKVxuXG4gICAgb3B0aW9ucy51bmxpbmsocCwgZnVuY3Rpb24gKGVyKSB7XG4gICAgICBpZiAoZXIpIHtcbiAgICAgICAgaWYgKGVyLmNvZGUgPT09IFwiRU5PRU5UXCIpXG4gICAgICAgICAgcmV0dXJuIGNiKG51bGwpXG4gICAgICAgIGlmIChlci5jb2RlID09PSBcIkVQRVJNXCIpXG4gICAgICAgICAgcmV0dXJuIChpc1dpbmRvd3MpXG4gICAgICAgICAgICA/IGZpeFdpbkVQRVJNKHAsIG9wdGlvbnMsIGVyLCBjYilcbiAgICAgICAgICAgIDogcm1kaXIocCwgb3B0aW9ucywgZXIsIGNiKVxuICAgICAgICBpZiAoZXIuY29kZSA9PT0gXCJFSVNESVJcIilcbiAgICAgICAgICByZXR1cm4gcm1kaXIocCwgb3B0aW9ucywgZXIsIGNiKVxuICAgICAgfVxuICAgICAgcmV0dXJuIGNiKGVyKVxuICAgIH0pXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGZpeFdpbkVQRVJNIChwLCBvcHRpb25zLCBlciwgY2IpIHtcbiAgYXNzZXJ0KHApXG4gIGFzc2VydChvcHRpb25zKVxuICBhc3NlcnQodHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKVxuICBpZiAoZXIpXG4gICAgYXNzZXJ0KGVyIGluc3RhbmNlb2YgRXJyb3IpXG5cbiAgb3B0aW9ucy5jaG1vZChwLCBfMDY2NiwgZnVuY3Rpb24gKGVyMikge1xuICAgIGlmIChlcjIpXG4gICAgICBjYihlcjIuY29kZSA9PT0gXCJFTk9FTlRcIiA/IG51bGwgOiBlcilcbiAgICBlbHNlXG4gICAgICBvcHRpb25zLnN0YXQocCwgZnVuY3Rpb24oZXIzLCBzdGF0cykge1xuICAgICAgICBpZiAoZXIzKVxuICAgICAgICAgIGNiKGVyMy5jb2RlID09PSBcIkVOT0VOVFwiID8gbnVsbCA6IGVyKVxuICAgICAgICBlbHNlIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKVxuICAgICAgICAgIHJtZGlyKHAsIG9wdGlvbnMsIGVyLCBjYilcbiAgICAgICAgZWxzZVxuICAgICAgICAgIG9wdGlvbnMudW5saW5rKHAsIGNiKVxuICAgICAgfSlcbiAgfSlcbn1cblxuZnVuY3Rpb24gZml4V2luRVBFUk1TeW5jIChwLCBvcHRpb25zLCBlcikge1xuICBhc3NlcnQocClcbiAgYXNzZXJ0KG9wdGlvbnMpXG4gIGlmIChlcilcbiAgICBhc3NlcnQoZXIgaW5zdGFuY2VvZiBFcnJvcilcblxuICB0cnkge1xuICAgIG9wdGlvbnMuY2htb2RTeW5jKHAsIF8wNjY2KVxuICB9IGNhdGNoIChlcjIpIHtcbiAgICBpZiAoZXIyLmNvZGUgPT09IFwiRU5PRU5UXCIpXG4gICAgICByZXR1cm5cbiAgICBlbHNlXG4gICAgICB0aHJvdyBlclxuICB9XG5cbiAgdHJ5IHtcbiAgICB2YXIgc3RhdHMgPSBvcHRpb25zLnN0YXRTeW5jKHApXG4gIH0gY2F0Y2ggKGVyMykge1xuICAgIGlmIChlcjMuY29kZSA9PT0gXCJFTk9FTlRcIilcbiAgICAgIHJldHVyblxuICAgIGVsc2VcbiAgICAgIHRocm93IGVyXG4gIH1cblxuICBpZiAoc3RhdHMuaXNEaXJlY3RvcnkoKSlcbiAgICBybWRpclN5bmMocCwgb3B0aW9ucywgZXIpXG4gIGVsc2VcbiAgICBvcHRpb25zLnVubGlua1N5bmMocClcbn1cblxuZnVuY3Rpb24gcm1kaXIgKHAsIG9wdGlvbnMsIG9yaWdpbmFsRXIsIGNiKSB7XG4gIGFzc2VydChwKVxuICBhc3NlcnQob3B0aW9ucylcbiAgaWYgKG9yaWdpbmFsRXIpXG4gICAgYXNzZXJ0KG9yaWdpbmFsRXIgaW5zdGFuY2VvZiBFcnJvcilcbiAgYXNzZXJ0KHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJylcblxuICAvLyB0cnkgdG8gcm1kaXIgZmlyc3QsIGFuZCBvbmx5IHJlYWRkaXIgb24gRU5PVEVNUFRZIG9yIEVFWElTVCAoU3VuT1MpXG4gIC8vIGlmIHdlIGd1ZXNzZWQgd3JvbmcsIGFuZCBpdCdzIG5vdCBhIGRpcmVjdG9yeSwgdGhlblxuICAvLyByYWlzZSB0aGUgb3JpZ2luYWwgZXJyb3IuXG4gIG9wdGlvbnMucm1kaXIocCwgZnVuY3Rpb24gKGVyKSB7XG4gICAgaWYgKGVyICYmIChlci5jb2RlID09PSBcIkVOT1RFTVBUWVwiIHx8IGVyLmNvZGUgPT09IFwiRUVYSVNUXCIgfHwgZXIuY29kZSA9PT0gXCJFUEVSTVwiKSlcbiAgICAgIHJta2lkcyhwLCBvcHRpb25zLCBjYilcbiAgICBlbHNlIGlmIChlciAmJiBlci5jb2RlID09PSBcIkVOT1RESVJcIilcbiAgICAgIGNiKG9yaWdpbmFsRXIpXG4gICAgZWxzZVxuICAgICAgY2IoZXIpXG4gIH0pXG59XG5cbmZ1bmN0aW9uIHJta2lkcyhwLCBvcHRpb25zLCBjYikge1xuICBhc3NlcnQocClcbiAgYXNzZXJ0KG9wdGlvbnMpXG4gIGFzc2VydCh0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpXG5cbiAgb3B0aW9ucy5yZWFkZGlyKHAsIGZ1bmN0aW9uIChlciwgZmlsZXMpIHtcbiAgICBpZiAoZXIpXG4gICAgICByZXR1cm4gY2IoZXIpXG4gICAgdmFyIG4gPSBmaWxlcy5sZW5ndGhcbiAgICBpZiAobiA9PT0gMClcbiAgICAgIHJldHVybiBvcHRpb25zLnJtZGlyKHAsIGNiKVxuICAgIHZhciBlcnJTdGF0ZVxuICAgIGZpbGVzLmZvckVhY2goZnVuY3Rpb24gKGYpIHtcbiAgICAgIHJpbXJhZihwYXRoLmpvaW4ocCwgZiksIG9wdGlvbnMsIGZ1bmN0aW9uIChlcikge1xuICAgICAgICBpZiAoZXJyU3RhdGUpXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIGlmIChlcilcbiAgICAgICAgICByZXR1cm4gY2IoZXJyU3RhdGUgPSBlcilcbiAgICAgICAgaWYgKC0tbiA9PT0gMClcbiAgICAgICAgICBvcHRpb25zLnJtZGlyKHAsIGNiKVxuICAgICAgfSlcbiAgICB9KVxuICB9KVxufVxuXG4vLyB0aGlzIGxvb2tzIHNpbXBsZXIsIGFuZCBpcyBzdHJpY3RseSAqZmFzdGVyKiwgYnV0IHdpbGxcbi8vIHRpZSB1cCB0aGUgSmF2YVNjcmlwdCB0aHJlYWQgYW5kIGZhaWwgb24gZXhjZXNzaXZlbHlcbi8vIGRlZXAgZGlyZWN0b3J5IHRyZWVzLlxuZnVuY3Rpb24gcmltcmFmU3luYyAocCwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICBkZWZhdWx0cyhvcHRpb25zKVxuXG4gIGFzc2VydChwLCAncmltcmFmOiBtaXNzaW5nIHBhdGgnKVxuICBhc3NlcnQuZXF1YWwodHlwZW9mIHAsICdzdHJpbmcnLCAncmltcmFmOiBwYXRoIHNob3VsZCBiZSBhIHN0cmluZycpXG4gIGFzc2VydChvcHRpb25zLCAncmltcmFmOiBtaXNzaW5nIG9wdGlvbnMnKVxuICBhc3NlcnQuZXF1YWwodHlwZW9mIG9wdGlvbnMsICdvYmplY3QnLCAncmltcmFmOiBvcHRpb25zIHNob3VsZCBiZSBvYmplY3QnKVxuXG4gIHZhciByZXN1bHRzXG5cbiAgaWYgKG9wdGlvbnMuZGlzYWJsZUdsb2IgfHwgIWdsb2IuaGFzTWFnaWMocCkpIHtcbiAgICByZXN1bHRzID0gW3BdXG4gIH0gZWxzZSB7XG4gICAgdHJ5IHtcbiAgICAgIG9wdGlvbnMubHN0YXRTeW5jKHApXG4gICAgICByZXN1bHRzID0gW3BdXG4gICAgfSBjYXRjaCAoZXIpIHtcbiAgICAgIHJlc3VsdHMgPSBnbG9iLnN5bmMocCwgb3B0aW9ucy5nbG9iKVxuICAgIH1cbiAgfVxuXG4gIGlmICghcmVzdWx0cy5sZW5ndGgpXG4gICAgcmV0dXJuXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXN1bHRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHAgPSByZXN1bHRzW2ldXG5cbiAgICB0cnkge1xuICAgICAgdmFyIHN0ID0gb3B0aW9ucy5sc3RhdFN5bmMocClcbiAgICB9IGNhdGNoIChlcikge1xuICAgICAgaWYgKGVyLmNvZGUgPT09IFwiRU5PRU5UXCIpXG4gICAgICAgIHJldHVyblxuXG4gICAgICAvLyBXaW5kb3dzIGNhbiBFUEVSTSBvbiBzdGF0LiAgTGlmZSBpcyBzdWZmZXJpbmcuXG4gICAgICBpZiAoZXIuY29kZSA9PT0gXCJFUEVSTVwiICYmIGlzV2luZG93cylcbiAgICAgICAgZml4V2luRVBFUk1TeW5jKHAsIG9wdGlvbnMsIGVyKVxuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICAvLyBzdW5vcyBsZXRzIHRoZSByb290IHVzZXIgdW5saW5rIGRpcmVjdG9yaWVzLCB3aGljaCBpcy4uLiB3ZWlyZC5cbiAgICAgIGlmIChzdCAmJiBzdC5pc0RpcmVjdG9yeSgpKVxuICAgICAgICBybWRpclN5bmMocCwgb3B0aW9ucywgbnVsbClcbiAgICAgIGVsc2VcbiAgICAgICAgb3B0aW9ucy51bmxpbmtTeW5jKHApXG4gICAgfSBjYXRjaCAoZXIpIHtcbiAgICAgIGlmIChlci5jb2RlID09PSBcIkVOT0VOVFwiKVxuICAgICAgICByZXR1cm5cbiAgICAgIGlmIChlci5jb2RlID09PSBcIkVQRVJNXCIpXG4gICAgICAgIHJldHVybiBpc1dpbmRvd3MgPyBmaXhXaW5FUEVSTVN5bmMocCwgb3B0aW9ucywgZXIpIDogcm1kaXJTeW5jKHAsIG9wdGlvbnMsIGVyKVxuICAgICAgaWYgKGVyLmNvZGUgIT09IFwiRUlTRElSXCIpXG4gICAgICAgIHRocm93IGVyXG5cbiAgICAgIHJtZGlyU3luYyhwLCBvcHRpb25zLCBlcilcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcm1kaXJTeW5jIChwLCBvcHRpb25zLCBvcmlnaW5hbEVyKSB7XG4gIGFzc2VydChwKVxuICBhc3NlcnQob3B0aW9ucylcbiAgaWYgKG9yaWdpbmFsRXIpXG4gICAgYXNzZXJ0KG9yaWdpbmFsRXIgaW5zdGFuY2VvZiBFcnJvcilcblxuICB0cnkge1xuICAgIG9wdGlvbnMucm1kaXJTeW5jKHApXG4gIH0gY2F0Y2ggKGVyKSB7XG4gICAgaWYgKGVyLmNvZGUgPT09IFwiRU5PRU5UXCIpXG4gICAgICByZXR1cm5cbiAgICBpZiAoZXIuY29kZSA9PT0gXCJFTk9URElSXCIpXG4gICAgICB0aHJvdyBvcmlnaW5hbEVyXG4gICAgaWYgKGVyLmNvZGUgPT09IFwiRU5PVEVNUFRZXCIgfHwgZXIuY29kZSA9PT0gXCJFRVhJU1RcIiB8fCBlci5jb2RlID09PSBcIkVQRVJNXCIpXG4gICAgICBybWtpZHNTeW5jKHAsIG9wdGlvbnMpXG4gIH1cbn1cblxuZnVuY3Rpb24gcm1raWRzU3luYyAocCwgb3B0aW9ucykge1xuICBhc3NlcnQocClcbiAgYXNzZXJ0KG9wdGlvbnMpXG4gIG9wdGlvbnMucmVhZGRpclN5bmMocCkuZm9yRWFjaChmdW5jdGlvbiAoZikge1xuICAgIHJpbXJhZlN5bmMocGF0aC5qb2luKHAsIGYpLCBvcHRpb25zKVxuICB9KVxuXG4gIC8vIFdlIG9ubHkgZW5kIHVwIGhlcmUgb25jZSB3ZSBnb3QgRU5PVEVNUFRZIGF0IGxlYXN0IG9uY2UsIGFuZFxuICAvLyBhdCB0aGlzIHBvaW50LCB3ZSBhcmUgZ3VhcmFudGVlZCB0byBoYXZlIHJlbW92ZWQgYWxsIHRoZSBraWRzLlxuICAvLyBTbywgd2Uga25vdyB0aGF0IGl0IHdvbid0IGJlIEVOT0VOVCBvciBFTk9URElSIG9yIGFueXRoaW5nIGVsc2UuXG4gIC8vIHRyeSByZWFsbHkgaGFyZCB0byBkZWxldGUgc3R1ZmYgb24gd2luZG93cywgYmVjYXVzZSBpdCBoYXMgYVxuICAvLyBQUk9GT1VORExZIGFubm95aW5nIGhhYml0IG9mIG5vdCBjbG9zaW5nIGhhbmRsZXMgcHJvbXB0bHkgd2hlblxuICAvLyBmaWxlcyBhcmUgZGVsZXRlZCwgcmVzdWx0aW5nIGluIHNwdXJpb3VzIEVOT1RFTVBUWSBlcnJvcnMuXG4gIHZhciByZXRyaWVzID0gaXNXaW5kb3dzID8gMTAwIDogMVxuICB2YXIgaSA9IDBcbiAgZG8ge1xuICAgIHZhciB0aHJldyA9IHRydWVcbiAgICB0cnkge1xuICAgICAgdmFyIHJldCA9IG9wdGlvbnMucm1kaXJTeW5jKHAsIG9wdGlvbnMpXG4gICAgICB0aHJldyA9IGZhbHNlXG4gICAgICByZXR1cm4gcmV0XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGlmICgrK2kgPCByZXRyaWVzICYmIHRocmV3KVxuICAgICAgICBjb250aW51ZVxuICAgIH1cbiAgfSB3aGlsZSAodHJ1ZSlcbn1cbiIsIihmdW5jdGlvbiAoZ2xvYmFsLCB1bmRlZmluZWQpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIGlmIChnbG9iYWwuc2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgbmV4dEhhbmRsZSA9IDE7IC8vIFNwZWMgc2F5cyBncmVhdGVyIHRoYW4gemVyb1xuICAgIHZhciB0YXNrc0J5SGFuZGxlID0ge307XG4gICAgdmFyIGN1cnJlbnRseVJ1bm5pbmdBVGFzayA9IGZhbHNlO1xuICAgIHZhciBkb2MgPSBnbG9iYWwuZG9jdW1lbnQ7XG4gICAgdmFyIHJlZ2lzdGVySW1tZWRpYXRlO1xuXG4gICAgZnVuY3Rpb24gc2V0SW1tZWRpYXRlKGNhbGxiYWNrKSB7XG4gICAgICAvLyBDYWxsYmFjayBjYW4gZWl0aGVyIGJlIGEgZnVuY3Rpb24gb3IgYSBzdHJpbmdcbiAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBjYWxsYmFjayA9IG5ldyBGdW5jdGlvbihcIlwiICsgY2FsbGJhY2spO1xuICAgICAgfVxuICAgICAgLy8gQ29weSBmdW5jdGlvbiBhcmd1bWVudHNcbiAgICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGFyZ3NbaV0gPSBhcmd1bWVudHNbaSArIDFdO1xuICAgICAgfVxuICAgICAgLy8gU3RvcmUgYW5kIHJlZ2lzdGVyIHRoZSB0YXNrXG4gICAgICB2YXIgdGFzayA9IHsgY2FsbGJhY2s6IGNhbGxiYWNrLCBhcmdzOiBhcmdzIH07XG4gICAgICB0YXNrc0J5SGFuZGxlW25leHRIYW5kbGVdID0gdGFzaztcbiAgICAgIHJlZ2lzdGVySW1tZWRpYXRlKG5leHRIYW5kbGUpO1xuICAgICAgcmV0dXJuIG5leHRIYW5kbGUrKztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbGVhckltbWVkaWF0ZShoYW5kbGUpIHtcbiAgICAgICAgZGVsZXRlIHRhc2tzQnlIYW5kbGVbaGFuZGxlXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBydW4odGFzaykge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSB0YXNrLmNhbGxiYWNrO1xuICAgICAgICB2YXIgYXJncyA9IHRhc2suYXJncztcbiAgICAgICAgc3dpdGNoIChhcmdzLmxlbmd0aCkge1xuICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgIGNhbGxiYWNrKGFyZ3NbMF0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgIGNhbGxiYWNrKGFyZ3NbMF0sIGFyZ3NbMV0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgIGNhbGxiYWNrKGFyZ3NbMF0sIGFyZ3NbMV0sIGFyZ3NbMl0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBjYWxsYmFjay5hcHBseSh1bmRlZmluZWQsIGFyZ3MpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBydW5JZlByZXNlbnQoaGFuZGxlKSB7XG4gICAgICAgIC8vIEZyb20gdGhlIHNwZWM6IFwiV2FpdCB1bnRpbCBhbnkgaW52b2NhdGlvbnMgb2YgdGhpcyBhbGdvcml0aG0gc3RhcnRlZCBiZWZvcmUgdGhpcyBvbmUgaGF2ZSBjb21wbGV0ZWQuXCJcbiAgICAgICAgLy8gU28gaWYgd2UncmUgY3VycmVudGx5IHJ1bm5pbmcgYSB0YXNrLCB3ZSdsbCBuZWVkIHRvIGRlbGF5IHRoaXMgaW52b2NhdGlvbi5cbiAgICAgICAgaWYgKGN1cnJlbnRseVJ1bm5pbmdBVGFzaykge1xuICAgICAgICAgICAgLy8gRGVsYXkgYnkgZG9pbmcgYSBzZXRUaW1lb3V0LiBzZXRJbW1lZGlhdGUgd2FzIHRyaWVkIGluc3RlYWQsIGJ1dCBpbiBGaXJlZm94IDcgaXQgZ2VuZXJhdGVkIGFcbiAgICAgICAgICAgIC8vIFwidG9vIG11Y2ggcmVjdXJzaW9uXCIgZXJyb3IuXG4gICAgICAgICAgICBzZXRUaW1lb3V0KHJ1bklmUHJlc2VudCwgMCwgaGFuZGxlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciB0YXNrID0gdGFza3NCeUhhbmRsZVtoYW5kbGVdO1xuICAgICAgICAgICAgaWYgKHRhc2spIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50bHlSdW5uaW5nQVRhc2sgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHJ1bih0YXNrKTtcbiAgICAgICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhckltbWVkaWF0ZShoYW5kbGUpO1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50bHlSdW5uaW5nQVRhc2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnN0YWxsTmV4dFRpY2tJbXBsZW1lbnRhdGlvbigpIHtcbiAgICAgICAgcmVnaXN0ZXJJbW1lZGlhdGUgPSBmdW5jdGlvbihoYW5kbGUpIHtcbiAgICAgICAgICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24gKCkgeyBydW5JZlByZXNlbnQoaGFuZGxlKTsgfSk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FuVXNlUG9zdE1lc3NhZ2UoKSB7XG4gICAgICAgIC8vIFRoZSB0ZXN0IGFnYWluc3QgYGltcG9ydFNjcmlwdHNgIHByZXZlbnRzIHRoaXMgaW1wbGVtZW50YXRpb24gZnJvbSBiZWluZyBpbnN0YWxsZWQgaW5zaWRlIGEgd2ViIHdvcmtlcixcbiAgICAgICAgLy8gd2hlcmUgYGdsb2JhbC5wb3N0TWVzc2FnZWAgbWVhbnMgc29tZXRoaW5nIGNvbXBsZXRlbHkgZGlmZmVyZW50IGFuZCBjYW4ndCBiZSB1c2VkIGZvciB0aGlzIHB1cnBvc2UuXG4gICAgICAgIGlmIChnbG9iYWwucG9zdE1lc3NhZ2UgJiYgIWdsb2JhbC5pbXBvcnRTY3JpcHRzKSB7XG4gICAgICAgICAgICB2YXIgcG9zdE1lc3NhZ2VJc0FzeW5jaHJvbm91cyA9IHRydWU7XG4gICAgICAgICAgICB2YXIgb2xkT25NZXNzYWdlID0gZ2xvYmFsLm9ubWVzc2FnZTtcbiAgICAgICAgICAgIGdsb2JhbC5vbm1lc3NhZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBwb3N0TWVzc2FnZUlzQXN5bmNocm9ub3VzID0gZmFsc2U7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZ2xvYmFsLnBvc3RNZXNzYWdlKFwiXCIsIFwiKlwiKTtcbiAgICAgICAgICAgIGdsb2JhbC5vbm1lc3NhZ2UgPSBvbGRPbk1lc3NhZ2U7XG4gICAgICAgICAgICByZXR1cm4gcG9zdE1lc3NhZ2VJc0FzeW5jaHJvbm91cztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc3RhbGxQb3N0TWVzc2FnZUltcGxlbWVudGF0aW9uKCkge1xuICAgICAgICAvLyBJbnN0YWxscyBhbiBldmVudCBoYW5kbGVyIG9uIGBnbG9iYWxgIGZvciB0aGUgYG1lc3NhZ2VgIGV2ZW50OiBzZWVcbiAgICAgICAgLy8gKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9ET00vd2luZG93LnBvc3RNZXNzYWdlXG4gICAgICAgIC8vICogaHR0cDovL3d3dy53aGF0d2cub3JnL3NwZWNzL3dlYi1hcHBzL2N1cnJlbnQtd29yay9tdWx0aXBhZ2UvY29tbXMuaHRtbCNjcm9zc0RvY3VtZW50TWVzc2FnZXNcblxuICAgICAgICB2YXIgbWVzc2FnZVByZWZpeCA9IFwic2V0SW1tZWRpYXRlJFwiICsgTWF0aC5yYW5kb20oKSArIFwiJFwiO1xuICAgICAgICB2YXIgb25HbG9iYWxNZXNzYWdlID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGlmIChldmVudC5zb3VyY2UgPT09IGdsb2JhbCAmJlxuICAgICAgICAgICAgICAgIHR5cGVvZiBldmVudC5kYXRhID09PSBcInN0cmluZ1wiICYmXG4gICAgICAgICAgICAgICAgZXZlbnQuZGF0YS5pbmRleE9mKG1lc3NhZ2VQcmVmaXgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcnVuSWZQcmVzZW50KCtldmVudC5kYXRhLnNsaWNlKG1lc3NhZ2VQcmVmaXgubGVuZ3RoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGdsb2JhbC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICAgICAgICBnbG9iYWwuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgb25HbG9iYWxNZXNzYWdlLCBmYWxzZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBnbG9iYWwuYXR0YWNoRXZlbnQoXCJvbm1lc3NhZ2VcIiwgb25HbG9iYWxNZXNzYWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlZ2lzdGVySW1tZWRpYXRlID0gZnVuY3Rpb24oaGFuZGxlKSB7XG4gICAgICAgICAgICBnbG9iYWwucG9zdE1lc3NhZ2UobWVzc2FnZVByZWZpeCArIGhhbmRsZSwgXCIqXCIpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc3RhbGxNZXNzYWdlQ2hhbm5lbEltcGxlbWVudGF0aW9uKCkge1xuICAgICAgICB2YXIgY2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgICAgICBjaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICB2YXIgaGFuZGxlID0gZXZlbnQuZGF0YTtcbiAgICAgICAgICAgIHJ1bklmUHJlc2VudChoYW5kbGUpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJlZ2lzdGVySW1tZWRpYXRlID0gZnVuY3Rpb24oaGFuZGxlKSB7XG4gICAgICAgICAgICBjaGFubmVsLnBvcnQyLnBvc3RNZXNzYWdlKGhhbmRsZSk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5zdGFsbFJlYWR5U3RhdGVDaGFuZ2VJbXBsZW1lbnRhdGlvbigpIHtcbiAgICAgICAgdmFyIGh0bWwgPSBkb2MuZG9jdW1lbnRFbGVtZW50O1xuICAgICAgICByZWdpc3RlckltbWVkaWF0ZSA9IGZ1bmN0aW9uKGhhbmRsZSkge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgPHNjcmlwdD4gZWxlbWVudDsgaXRzIHJlYWR5c3RhdGVjaGFuZ2UgZXZlbnQgd2lsbCBiZSBmaXJlZCBhc3luY2hyb25vdXNseSBvbmNlIGl0IGlzIGluc2VydGVkXG4gICAgICAgICAgICAvLyBpbnRvIHRoZSBkb2N1bWVudC4gRG8gc28sIHRodXMgcXVldWluZyB1cCB0aGUgdGFzay4gUmVtZW1iZXIgdG8gY2xlYW4gdXAgb25jZSBpdCdzIGJlZW4gY2FsbGVkLlxuICAgICAgICAgICAgdmFyIHNjcmlwdCA9IGRvYy5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xuICAgICAgICAgICAgc2NyaXB0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBydW5JZlByZXNlbnQoaGFuZGxlKTtcbiAgICAgICAgICAgICAgICBzY3JpcHQub25yZWFkeXN0YXRlY2hhbmdlID0gbnVsbDtcbiAgICAgICAgICAgICAgICBodG1sLnJlbW92ZUNoaWxkKHNjcmlwdCk7XG4gICAgICAgICAgICAgICAgc2NyaXB0ID0gbnVsbDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBodG1sLmFwcGVuZENoaWxkKHNjcmlwdCk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5zdGFsbFNldFRpbWVvdXRJbXBsZW1lbnRhdGlvbigpIHtcbiAgICAgICAgcmVnaXN0ZXJJbW1lZGlhdGUgPSBmdW5jdGlvbihoYW5kbGUpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQocnVuSWZQcmVzZW50LCAwLCBoYW5kbGUpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIElmIHN1cHBvcnRlZCwgd2Ugc2hvdWxkIGF0dGFjaCB0byB0aGUgcHJvdG90eXBlIG9mIGdsb2JhbCwgc2luY2UgdGhhdCBpcyB3aGVyZSBzZXRUaW1lb3V0IGV0IGFsLiBsaXZlLlxuICAgIHZhciBhdHRhY2hUbyA9IE9iamVjdC5nZXRQcm90b3R5cGVPZiAmJiBPYmplY3QuZ2V0UHJvdG90eXBlT2YoZ2xvYmFsKTtcbiAgICBhdHRhY2hUbyA9IGF0dGFjaFRvICYmIGF0dGFjaFRvLnNldFRpbWVvdXQgPyBhdHRhY2hUbyA6IGdsb2JhbDtcblxuICAgIC8vIERvbid0IGdldCBmb29sZWQgYnkgZS5nLiBicm93c2VyaWZ5IGVudmlyb25tZW50cy5cbiAgICBpZiAoe30udG9TdHJpbmcuY2FsbChnbG9iYWwucHJvY2VzcykgPT09IFwiW29iamVjdCBwcm9jZXNzXVwiKSB7XG4gICAgICAgIC8vIEZvciBOb2RlLmpzIGJlZm9yZSAwLjlcbiAgICAgICAgaW5zdGFsbE5leHRUaWNrSW1wbGVtZW50YXRpb24oKTtcblxuICAgIH0gZWxzZSBpZiAoY2FuVXNlUG9zdE1lc3NhZ2UoKSkge1xuICAgICAgICAvLyBGb3Igbm9uLUlFMTAgbW9kZXJuIGJyb3dzZXJzXG4gICAgICAgIGluc3RhbGxQb3N0TWVzc2FnZUltcGxlbWVudGF0aW9uKCk7XG5cbiAgICB9IGVsc2UgaWYgKGdsb2JhbC5NZXNzYWdlQ2hhbm5lbCkge1xuICAgICAgICAvLyBGb3Igd2ViIHdvcmtlcnMsIHdoZXJlIHN1cHBvcnRlZFxuICAgICAgICBpbnN0YWxsTWVzc2FnZUNoYW5uZWxJbXBsZW1lbnRhdGlvbigpO1xuXG4gICAgfSBlbHNlIGlmIChkb2MgJiYgXCJvbnJlYWR5c3RhdGVjaGFuZ2VcIiBpbiBkb2MuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKSkge1xuICAgICAgICAvLyBGb3IgSUUgNuKAkzhcbiAgICAgICAgaW5zdGFsbFJlYWR5U3RhdGVDaGFuZ2VJbXBsZW1lbnRhdGlvbigpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRm9yIG9sZGVyIGJyb3dzZXJzXG4gICAgICAgIGluc3RhbGxTZXRUaW1lb3V0SW1wbGVtZW50YXRpb24oKTtcbiAgICB9XG5cbiAgICBhdHRhY2hUby5zZXRJbW1lZGlhdGUgPSBzZXRJbW1lZGlhdGU7XG4gICAgYXR0YWNoVG8uY2xlYXJJbW1lZGlhdGUgPSBjbGVhckltbWVkaWF0ZTtcbn0odHlwZW9mIHNlbGYgPT09IFwidW5kZWZpbmVkXCIgPyB0eXBlb2YgZ2xvYmFsID09PSBcInVuZGVmaW5lZFwiID8gdGhpcyA6IGdsb2JhbCA6IHNlbGYpKTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBTbGljZVN0cmVhbTtcblxudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJ3JlYWRhYmxlLXN0cmVhbS90cmFuc2Zvcm0nKTtcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJ1dGlsXCIpLmluaGVyaXRzO1xuXG5pbmhlcml0cyhTbGljZVN0cmVhbSwgVHJhbnNmb3JtKTtcblxuZnVuY3Rpb24gU2xpY2VTdHJlYW0ob3B0cywgc2xpY2VGbikge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU2xpY2VTdHJlYW0pKSB7XG4gICAgcmV0dXJuIG5ldyBTbGljZVN0cmVhbShvcHRzLCBzbGljZUZuKTtcbiAgfVxuXG4gIHRoaXMuX29wdHMgPSBvcHRzO1xuICB0aGlzLl9hY2N1bXVsYXRlZExlbmd0aCA9IDA7XG4gIHRoaXMuc2xpY2VGbiA9IHNsaWNlRm47XG5cbiAgVHJhbnNmb3JtLmNhbGwodGhpcyk7XG59XG5cblNsaWNlU3RyZWFtLnByb3RvdHlwZS5fdHJhbnNmb3JtID0gZnVuY3Rpb24gKGNodW5rLCBlbmNvZGluZywgY2FsbGJhY2spIHtcbiAgdGhpcy5fYWNjdW11bGF0ZWRMZW5ndGggKz0gY2h1bmsubGVuZ3RoO1xuXG4gIGlmICh0aGlzLl9hY2N1bXVsYXRlZExlbmd0aCA+PSB0aGlzLl9vcHRzLmxlbmd0aCkge1xuICAgIC8vdG9kbyBoYW5kbGUgbW9yZSB0aGFuIG9uZSBzbGljZSBpbiBhIHN0cmVhbVxuICAgIHZhciBvZmZzZXQgPSBjaHVuay5sZW5ndGggLSAodGhpcy5fYWNjdW11bGF0ZWRMZW5ndGggLSB0aGlzLl9vcHRzLmxlbmd0aCk7XG4gICAgdGhpcy5zbGljZUZuKGNodW5rLnNsaWNlKDAsIG9mZnNldCksIHRydWUsIGNodW5rLnNsaWNlKG9mZnNldCkpO1xuICAgIGNhbGxiYWNrKCk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5zbGljZUZuKGNodW5rKTtcbiAgICBjYWxsYmFjaygpO1xuICB9XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBCdWZmZXIgPSByZXF1aXJlKCdidWZmZXInKS5CdWZmZXI7XG5cbnZhciBpc0J1ZmZlckVuY29kaW5nID0gQnVmZmVyLmlzRW5jb2RpbmdcbiAgfHwgZnVuY3Rpb24oZW5jb2RpbmcpIHtcbiAgICAgICBzd2l0Y2ggKGVuY29kaW5nICYmIGVuY29kaW5nLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgIGNhc2UgJ2hleCc6IGNhc2UgJ3V0ZjgnOiBjYXNlICd1dGYtOCc6IGNhc2UgJ2FzY2lpJzogY2FzZSAnYmluYXJ5JzogY2FzZSAnYmFzZTY0JzogY2FzZSAndWNzMic6IGNhc2UgJ3Vjcy0yJzogY2FzZSAndXRmMTZsZSc6IGNhc2UgJ3V0Zi0xNmxlJzogY2FzZSAncmF3JzogcmV0dXJuIHRydWU7XG4gICAgICAgICBkZWZhdWx0OiByZXR1cm4gZmFsc2U7XG4gICAgICAgfVxuICAgICB9XG5cblxuZnVuY3Rpb24gYXNzZXJ0RW5jb2RpbmcoZW5jb2RpbmcpIHtcbiAgaWYgKGVuY29kaW5nICYmICFpc0J1ZmZlckVuY29kaW5nKGVuY29kaW5nKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKTtcbiAgfVxufVxuXG4vLyBTdHJpbmdEZWNvZGVyIHByb3ZpZGVzIGFuIGludGVyZmFjZSBmb3IgZWZmaWNpZW50bHkgc3BsaXR0aW5nIGEgc2VyaWVzIG9mXG4vLyBidWZmZXJzIGludG8gYSBzZXJpZXMgb2YgSlMgc3RyaW5ncyB3aXRob3V0IGJyZWFraW5nIGFwYXJ0IG11bHRpLWJ5dGVcbi8vIGNoYXJhY3RlcnMuIENFU1UtOCBpcyBoYW5kbGVkIGFzIHBhcnQgb2YgdGhlIFVURi04IGVuY29kaW5nLlxuLy9cbi8vIEBUT0RPIEhhbmRsaW5nIGFsbCBlbmNvZGluZ3MgaW5zaWRlIGEgc2luZ2xlIG9iamVjdCBtYWtlcyBpdCB2ZXJ5IGRpZmZpY3VsdFxuLy8gdG8gcmVhc29uIGFib3V0IHRoaXMgY29kZSwgc28gaXQgc2hvdWxkIGJlIHNwbGl0IHVwIGluIHRoZSBmdXR1cmUuXG4vLyBAVE9ETyBUaGVyZSBzaG91bGQgYmUgYSB1dGY4LXN0cmljdCBlbmNvZGluZyB0aGF0IHJlamVjdHMgaW52YWxpZCBVVEYtOCBjb2RlXG4vLyBwb2ludHMgYXMgdXNlZCBieSBDRVNVLTguXG52YXIgU3RyaW5nRGVjb2RlciA9IGV4cG9ydHMuU3RyaW5nRGVjb2RlciA9IGZ1bmN0aW9uKGVuY29kaW5nKSB7XG4gIHRoaXMuZW5jb2RpbmcgPSAoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1stX10vLCAnJyk7XG4gIGFzc2VydEVuY29kaW5nKGVuY29kaW5nKTtcbiAgc3dpdGNoICh0aGlzLmVuY29kaW5nKSB7XG4gICAgY2FzZSAndXRmOCc6XG4gICAgICAvLyBDRVNVLTggcmVwcmVzZW50cyBlYWNoIG9mIFN1cnJvZ2F0ZSBQYWlyIGJ5IDMtYnl0ZXNcbiAgICAgIHRoaXMuc3Vycm9nYXRlU2l6ZSA9IDM7XG4gICAgICBicmVhaztcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIC8vIFVURi0xNiByZXByZXNlbnRzIGVhY2ggb2YgU3Vycm9nYXRlIFBhaXIgYnkgMi1ieXRlc1xuICAgICAgdGhpcy5zdXJyb2dhdGVTaXplID0gMjtcbiAgICAgIHRoaXMuZGV0ZWN0SW5jb21wbGV0ZUNoYXIgPSB1dGYxNkRldGVjdEluY29tcGxldGVDaGFyO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIC8vIEJhc2UtNjQgc3RvcmVzIDMgYnl0ZXMgaW4gNCBjaGFycywgYW5kIHBhZHMgdGhlIHJlbWFpbmRlci5cbiAgICAgIHRoaXMuc3Vycm9nYXRlU2l6ZSA9IDM7XG4gICAgICB0aGlzLmRldGVjdEluY29tcGxldGVDaGFyID0gYmFzZTY0RGV0ZWN0SW5jb21wbGV0ZUNoYXI7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgdGhpcy53cml0ZSA9IHBhc3NUaHJvdWdoV3JpdGU7XG4gICAgICByZXR1cm47XG4gIH1cblxuICAvLyBFbm91Z2ggc3BhY2UgdG8gc3RvcmUgYWxsIGJ5dGVzIG9mIGEgc2luZ2xlIGNoYXJhY3Rlci4gVVRGLTggbmVlZHMgNFxuICAvLyBieXRlcywgYnV0IENFU1UtOCBtYXkgcmVxdWlyZSB1cCB0byA2ICgzIGJ5dGVzIHBlciBzdXJyb2dhdGUpLlxuICB0aGlzLmNoYXJCdWZmZXIgPSBuZXcgQnVmZmVyKDYpO1xuICAvLyBOdW1iZXIgb2YgYnl0ZXMgcmVjZWl2ZWQgZm9yIHRoZSBjdXJyZW50IGluY29tcGxldGUgbXVsdGktYnl0ZSBjaGFyYWN0ZXIuXG4gIHRoaXMuY2hhclJlY2VpdmVkID0gMDtcbiAgLy8gTnVtYmVyIG9mIGJ5dGVzIGV4cGVjdGVkIGZvciB0aGUgY3VycmVudCBpbmNvbXBsZXRlIG11bHRpLWJ5dGUgY2hhcmFjdGVyLlxuICB0aGlzLmNoYXJMZW5ndGggPSAwO1xufTtcblxuXG4vLyB3cml0ZSBkZWNvZGVzIHRoZSBnaXZlbiBidWZmZXIgYW5kIHJldHVybnMgaXQgYXMgSlMgc3RyaW5nIHRoYXQgaXNcbi8vIGd1YXJhbnRlZWQgdG8gbm90IGNvbnRhaW4gYW55IHBhcnRpYWwgbXVsdGktYnl0ZSBjaGFyYWN0ZXJzLiBBbnkgcGFydGlhbFxuLy8gY2hhcmFjdGVyIGZvdW5kIGF0IHRoZSBlbmQgb2YgdGhlIGJ1ZmZlciBpcyBidWZmZXJlZCB1cCwgYW5kIHdpbGwgYmVcbi8vIHJldHVybmVkIHdoZW4gY2FsbGluZyB3cml0ZSBhZ2FpbiB3aXRoIHRoZSByZW1haW5pbmcgYnl0ZXMuXG4vL1xuLy8gTm90ZTogQ29udmVydGluZyBhIEJ1ZmZlciBjb250YWluaW5nIGFuIG9ycGhhbiBzdXJyb2dhdGUgdG8gYSBTdHJpbmdcbi8vIGN1cnJlbnRseSB3b3JrcywgYnV0IGNvbnZlcnRpbmcgYSBTdHJpbmcgdG8gYSBCdWZmZXIgKHZpYSBgbmV3IEJ1ZmZlcmAsIG9yXG4vLyBCdWZmZXIjd3JpdGUpIHdpbGwgcmVwbGFjZSBpbmNvbXBsZXRlIHN1cnJvZ2F0ZXMgd2l0aCB0aGUgdW5pY29kZVxuLy8gcmVwbGFjZW1lbnQgY2hhcmFjdGVyLiBTZWUgaHR0cHM6Ly9jb2RlcmV2aWV3LmNocm9taXVtLm9yZy8xMjExNzMwMDkvIC5cblN0cmluZ0RlY29kZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gIHZhciBjaGFyU3RyID0gJyc7XG4gIC8vIGlmIG91ciBsYXN0IHdyaXRlIGVuZGVkIHdpdGggYW4gaW5jb21wbGV0ZSBtdWx0aWJ5dGUgY2hhcmFjdGVyXG4gIHdoaWxlICh0aGlzLmNoYXJMZW5ndGgpIHtcbiAgICAvLyBkZXRlcm1pbmUgaG93IG1hbnkgcmVtYWluaW5nIGJ5dGVzIHRoaXMgYnVmZmVyIGhhcyB0byBvZmZlciBmb3IgdGhpcyBjaGFyXG4gICAgdmFyIGF2YWlsYWJsZSA9IChidWZmZXIubGVuZ3RoID49IHRoaXMuY2hhckxlbmd0aCAtIHRoaXMuY2hhclJlY2VpdmVkKSA/XG4gICAgICAgIHRoaXMuY2hhckxlbmd0aCAtIHRoaXMuY2hhclJlY2VpdmVkIDpcbiAgICAgICAgYnVmZmVyLmxlbmd0aDtcblxuICAgIC8vIGFkZCB0aGUgbmV3IGJ5dGVzIHRvIHRoZSBjaGFyIGJ1ZmZlclxuICAgIGJ1ZmZlci5jb3B5KHRoaXMuY2hhckJ1ZmZlciwgdGhpcy5jaGFyUmVjZWl2ZWQsIDAsIGF2YWlsYWJsZSk7XG4gICAgdGhpcy5jaGFyUmVjZWl2ZWQgKz0gYXZhaWxhYmxlO1xuXG4gICAgaWYgKHRoaXMuY2hhclJlY2VpdmVkIDwgdGhpcy5jaGFyTGVuZ3RoKSB7XG4gICAgICAvLyBzdGlsbCBub3QgZW5vdWdoIGNoYXJzIGluIHRoaXMgYnVmZmVyPyB3YWl0IGZvciBtb3JlIC4uLlxuICAgICAgcmV0dXJuICcnO1xuICAgIH1cblxuICAgIC8vIHJlbW92ZSBieXRlcyBiZWxvbmdpbmcgdG8gdGhlIGN1cnJlbnQgY2hhcmFjdGVyIGZyb20gdGhlIGJ1ZmZlclxuICAgIGJ1ZmZlciA9IGJ1ZmZlci5zbGljZShhdmFpbGFibGUsIGJ1ZmZlci5sZW5ndGgpO1xuXG4gICAgLy8gZ2V0IHRoZSBjaGFyYWN0ZXIgdGhhdCB3YXMgc3BsaXRcbiAgICBjaGFyU3RyID0gdGhpcy5jaGFyQnVmZmVyLnNsaWNlKDAsIHRoaXMuY2hhckxlbmd0aCkudG9TdHJpbmcodGhpcy5lbmNvZGluZyk7XG5cbiAgICAvLyBDRVNVLTg6IGxlYWQgc3Vycm9nYXRlIChEODAwLURCRkYpIGlzIGFsc28gdGhlIGluY29tcGxldGUgY2hhcmFjdGVyXG4gICAgdmFyIGNoYXJDb2RlID0gY2hhclN0ci5jaGFyQ29kZUF0KGNoYXJTdHIubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGNoYXJDb2RlID49IDB4RDgwMCAmJiBjaGFyQ29kZSA8PSAweERCRkYpIHtcbiAgICAgIHRoaXMuY2hhckxlbmd0aCArPSB0aGlzLnN1cnJvZ2F0ZVNpemU7XG4gICAgICBjaGFyU3RyID0gJyc7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgdGhpcy5jaGFyUmVjZWl2ZWQgPSB0aGlzLmNoYXJMZW5ndGggPSAwO1xuXG4gICAgLy8gaWYgdGhlcmUgYXJlIG5vIG1vcmUgYnl0ZXMgaW4gdGhpcyBidWZmZXIsIGp1c3QgZW1pdCBvdXIgY2hhclxuICAgIGlmIChidWZmZXIubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gY2hhclN0cjtcbiAgICB9XG4gICAgYnJlYWs7XG4gIH1cblxuICAvLyBkZXRlcm1pbmUgYW5kIHNldCBjaGFyTGVuZ3RoIC8gY2hhclJlY2VpdmVkXG4gIHRoaXMuZGV0ZWN0SW5jb21wbGV0ZUNoYXIoYnVmZmVyKTtcblxuICB2YXIgZW5kID0gYnVmZmVyLmxlbmd0aDtcbiAgaWYgKHRoaXMuY2hhckxlbmd0aCkge1xuICAgIC8vIGJ1ZmZlciB0aGUgaW5jb21wbGV0ZSBjaGFyYWN0ZXIgYnl0ZXMgd2UgZ290XG4gICAgYnVmZmVyLmNvcHkodGhpcy5jaGFyQnVmZmVyLCAwLCBidWZmZXIubGVuZ3RoIC0gdGhpcy5jaGFyUmVjZWl2ZWQsIGVuZCk7XG4gICAgZW5kIC09IHRoaXMuY2hhclJlY2VpdmVkO1xuICB9XG5cbiAgY2hhclN0ciArPSBidWZmZXIudG9TdHJpbmcodGhpcy5lbmNvZGluZywgMCwgZW5kKTtcblxuICB2YXIgZW5kID0gY2hhclN0ci5sZW5ndGggLSAxO1xuICB2YXIgY2hhckNvZGUgPSBjaGFyU3RyLmNoYXJDb2RlQXQoZW5kKTtcbiAgLy8gQ0VTVS04OiBsZWFkIHN1cnJvZ2F0ZSAoRDgwMC1EQkZGKSBpcyBhbHNvIHRoZSBpbmNvbXBsZXRlIGNoYXJhY3RlclxuICBpZiAoY2hhckNvZGUgPj0gMHhEODAwICYmIGNoYXJDb2RlIDw9IDB4REJGRikge1xuICAgIHZhciBzaXplID0gdGhpcy5zdXJyb2dhdGVTaXplO1xuICAgIHRoaXMuY2hhckxlbmd0aCArPSBzaXplO1xuICAgIHRoaXMuY2hhclJlY2VpdmVkICs9IHNpemU7XG4gICAgdGhpcy5jaGFyQnVmZmVyLmNvcHkodGhpcy5jaGFyQnVmZmVyLCBzaXplLCAwLCBzaXplKTtcbiAgICBidWZmZXIuY29weSh0aGlzLmNoYXJCdWZmZXIsIDAsIDAsIHNpemUpO1xuICAgIHJldHVybiBjaGFyU3RyLnN1YnN0cmluZygwLCBlbmQpO1xuICB9XG5cbiAgLy8gb3IganVzdCBlbWl0IHRoZSBjaGFyU3RyXG4gIHJldHVybiBjaGFyU3RyO1xufTtcblxuLy8gZGV0ZWN0SW5jb21wbGV0ZUNoYXIgZGV0ZXJtaW5lcyBpZiB0aGVyZSBpcyBhbiBpbmNvbXBsZXRlIFVURi04IGNoYXJhY3RlciBhdFxuLy8gdGhlIGVuZCBvZiB0aGUgZ2l2ZW4gYnVmZmVyLiBJZiBzbywgaXQgc2V0cyB0aGlzLmNoYXJMZW5ndGggdG8gdGhlIGJ5dGVcbi8vIGxlbmd0aCB0aGF0IGNoYXJhY3RlciwgYW5kIHNldHMgdGhpcy5jaGFyUmVjZWl2ZWQgdG8gdGhlIG51bWJlciBvZiBieXRlc1xuLy8gdGhhdCBhcmUgYXZhaWxhYmxlIGZvciB0aGlzIGNoYXJhY3Rlci5cblN0cmluZ0RlY29kZXIucHJvdG90eXBlLmRldGVjdEluY29tcGxldGVDaGFyID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gIC8vIGRldGVybWluZSBob3cgbWFueSBieXRlcyB3ZSBoYXZlIHRvIGNoZWNrIGF0IHRoZSBlbmQgb2YgdGhpcyBidWZmZXJcbiAgdmFyIGkgPSAoYnVmZmVyLmxlbmd0aCA+PSAzKSA/IDMgOiBidWZmZXIubGVuZ3RoO1xuXG4gIC8vIEZpZ3VyZSBvdXQgaWYgb25lIG9mIHRoZSBsYXN0IGkgYnl0ZXMgb2Ygb3VyIGJ1ZmZlciBhbm5vdW5jZXMgYW5cbiAgLy8gaW5jb21wbGV0ZSBjaGFyLlxuICBmb3IgKDsgaSA+IDA7IGktLSkge1xuICAgIHZhciBjID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSBpXTtcblxuICAgIC8vIFNlZSBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1VURi04I0Rlc2NyaXB0aW9uXG5cbiAgICAvLyAxMTBYWFhYWFxuICAgIGlmIChpID09IDEgJiYgYyA+PiA1ID09IDB4MDYpIHtcbiAgICAgIHRoaXMuY2hhckxlbmd0aCA9IDI7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyAxMTEwWFhYWFxuICAgIGlmIChpIDw9IDIgJiYgYyA+PiA0ID09IDB4MEUpIHtcbiAgICAgIHRoaXMuY2hhckxlbmd0aCA9IDM7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyAxMTExMFhYWFxuICAgIGlmIChpIDw9IDMgJiYgYyA+PiAzID09IDB4MUUpIHtcbiAgICAgIHRoaXMuY2hhckxlbmd0aCA9IDQ7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgdGhpcy5jaGFyUmVjZWl2ZWQgPSBpO1xufTtcblxuU3RyaW5nRGVjb2Rlci5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gIHZhciByZXMgPSAnJztcbiAgaWYgKGJ1ZmZlciAmJiBidWZmZXIubGVuZ3RoKVxuICAgIHJlcyA9IHRoaXMud3JpdGUoYnVmZmVyKTtcblxuICBpZiAodGhpcy5jaGFyUmVjZWl2ZWQpIHtcbiAgICB2YXIgY3IgPSB0aGlzLmNoYXJSZWNlaXZlZDtcbiAgICB2YXIgYnVmID0gdGhpcy5jaGFyQnVmZmVyO1xuICAgIHZhciBlbmMgPSB0aGlzLmVuY29kaW5nO1xuICAgIHJlcyArPSBidWYuc2xpY2UoMCwgY3IpLnRvU3RyaW5nKGVuYyk7XG4gIH1cblxuICByZXR1cm4gcmVzO1xufTtcblxuZnVuY3Rpb24gcGFzc1Rocm91Z2hXcml0ZShidWZmZXIpIHtcbiAgcmV0dXJuIGJ1ZmZlci50b1N0cmluZyh0aGlzLmVuY29kaW5nKTtcbn1cblxuZnVuY3Rpb24gdXRmMTZEZXRlY3RJbmNvbXBsZXRlQ2hhcihidWZmZXIpIHtcbiAgdGhpcy5jaGFyUmVjZWl2ZWQgPSBidWZmZXIubGVuZ3RoICUgMjtcbiAgdGhpcy5jaGFyTGVuZ3RoID0gdGhpcy5jaGFyUmVjZWl2ZWQgPyAyIDogMDtcbn1cblxuZnVuY3Rpb24gYmFzZTY0RGV0ZWN0SW5jb21wbGV0ZUNoYXIoYnVmZmVyKSB7XG4gIHRoaXMuY2hhclJlY2VpdmVkID0gYnVmZmVyLmxlbmd0aCAlIDM7XG4gIHRoaXMuY2hhckxlbmd0aCA9IHRoaXMuY2hhclJlY2VpdmVkID8gMyA6IDA7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFRyYXZlcnNlO1xuZnVuY3Rpb24gVHJhdmVyc2UgKG9iaikge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBUcmF2ZXJzZSkpIHJldHVybiBuZXcgVHJhdmVyc2Uob2JqKTtcbiAgICB0aGlzLnZhbHVlID0gb2JqO1xufVxuXG5UcmF2ZXJzZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKHBzKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLnZhbHVlO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHMubGVuZ3RoOyBpICsrKSB7XG4gICAgICAgIHZhciBrZXkgPSBwc1tpXTtcbiAgICAgICAgaWYgKCFPYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChub2RlLCBrZXkpKSB7XG4gICAgICAgICAgICBub2RlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgbm9kZSA9IG5vZGVba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIG5vZGU7XG59O1xuXG5UcmF2ZXJzZS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKHBzLCB2YWx1ZSkge1xuICAgIHZhciBub2RlID0gdGhpcy52YWx1ZTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBzLmxlbmd0aCAtIDE7IGkgKyspIHtcbiAgICAgICAgdmFyIGtleSA9IHBzW2ldO1xuICAgICAgICBpZiAoIU9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKG5vZGUsIGtleSkpIG5vZGVba2V5XSA9IHt9O1xuICAgICAgICBub2RlID0gbm9kZVtrZXldO1xuICAgIH1cbiAgICBub2RlW3BzW2ldXSA9IHZhbHVlO1xuICAgIHJldHVybiB2YWx1ZTtcbn07XG5cblRyYXZlcnNlLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiAoY2IpIHtcbiAgICByZXR1cm4gd2Fsayh0aGlzLnZhbHVlLCBjYiwgdHJ1ZSk7XG59O1xuXG5UcmF2ZXJzZS5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uIChjYikge1xuICAgIHRoaXMudmFsdWUgPSB3YWxrKHRoaXMudmFsdWUsIGNiLCBmYWxzZSk7XG4gICAgcmV0dXJuIHRoaXMudmFsdWU7XG59O1xuXG5UcmF2ZXJzZS5wcm90b3R5cGUucmVkdWNlID0gZnVuY3Rpb24gKGNiLCBpbml0KSB7XG4gICAgdmFyIHNraXAgPSBhcmd1bWVudHMubGVuZ3RoID09PSAxO1xuICAgIHZhciBhY2MgPSBza2lwID8gdGhpcy52YWx1ZSA6IGluaXQ7XG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIGlmICghdGhpcy5pc1Jvb3QgfHwgIXNraXApIHtcbiAgICAgICAgICAgIGFjYyA9IGNiLmNhbGwodGhpcywgYWNjLCB4KTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBhY2M7XG59O1xuXG5UcmF2ZXJzZS5wcm90b3R5cGUuZGVlcEVxdWFsID0gZnVuY3Rpb24gKG9iaikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICdkZWVwRXF1YWwgcmVxdWlyZXMgZXhhY3RseSBvbmUgb2JqZWN0IHRvIGNvbXBhcmUgYWdhaW5zdCdcbiAgICAgICAgKTtcbiAgICB9XG4gICAgXG4gICAgdmFyIGVxdWFsID0gdHJ1ZTtcbiAgICB2YXIgbm9kZSA9IG9iajtcbiAgICBcbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHkpIHtcbiAgICAgICAgdmFyIG5vdEVxdWFsID0gKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGVxdWFsID0gZmFsc2U7XG4gICAgICAgICAgICAvL3RoaXMuc3RvcCgpO1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfSkuYmluZCh0aGlzKTtcbiAgICAgICAgXG4gICAgICAgIC8vaWYgKG5vZGUgPT09IHVuZGVmaW5lZCB8fCBub2RlID09PSBudWxsKSByZXR1cm4gbm90RXF1YWwoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghdGhpcy5pc1Jvb3QpIHtcbiAgICAgICAgLypcbiAgICAgICAgICAgIGlmICghT2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwobm9kZSwgdGhpcy5rZXkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vdEVxdWFsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICovXG4gICAgICAgICAgICBpZiAodHlwZW9mIG5vZGUgIT09ICdvYmplY3QnKSByZXR1cm4gbm90RXF1YWwoKTtcbiAgICAgICAgICAgIG5vZGUgPSBub2RlW3RoaXMua2V5XTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIHggPSBub2RlO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5wb3N0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIG5vZGUgPSB4O1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHZhciB0b1MgPSBmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmNpcmN1bGFyKSB7XG4gICAgICAgICAgICBpZiAoVHJhdmVyc2Uob2JqKS5nZXQodGhpcy5jaXJjdWxhci5wYXRoKSAhPT0geCkgbm90RXF1YWwoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0eXBlb2YgeCAhPT0gdHlwZW9mIHkpIHtcbiAgICAgICAgICAgIG5vdEVxdWFsKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoeCA9PT0gbnVsbCB8fCB5ID09PSBudWxsIHx8IHggPT09IHVuZGVmaW5lZCB8fCB5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGlmICh4ICE9PSB5KSBub3RFcXVhbCgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHguX19wcm90b19fICE9PSB5Ll9fcHJvdG9fXykge1xuICAgICAgICAgICAgbm90RXF1YWwoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh4ID09PSB5KSB7XG4gICAgICAgICAgICAvLyBub3BcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgaWYgKHggaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgICAgICAgICAvLyBib3RoIHJlZ2V4cHMgb24gYWNjb3VudCBvZiB0aGUgX19wcm90b19fIGNoZWNrXG4gICAgICAgICAgICAgICAgaWYgKHgudG9TdHJpbmcoKSAhPSB5LnRvU3RyaW5nKCkpIG5vdEVxdWFsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh4ICE9PSB5KSBub3RFcXVhbCgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiB4ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgaWYgKHRvUyh5KSA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXSdcbiAgICAgICAgICAgIHx8IHRvUyh4KSA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXScpIHtcbiAgICAgICAgICAgICAgICBpZiAodG9TKHgpICE9PSB0b1MoeSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbm90RXF1YWwoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh4IGluc3RhbmNlb2YgRGF0ZSB8fCB5IGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICAgICAgICAgIGlmICghKHggaW5zdGFuY2VvZiBEYXRlKSB8fCAhKHkgaW5zdGFuY2VvZiBEYXRlKVxuICAgICAgICAgICAgICAgIHx8IHguZ2V0VGltZSgpICE9PSB5LmdldFRpbWUoKSkge1xuICAgICAgICAgICAgICAgICAgICBub3RFcXVhbCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBreCA9IE9iamVjdC5rZXlzKHgpO1xuICAgICAgICAgICAgICAgIHZhciBreSA9IE9iamVjdC5rZXlzKHkpO1xuICAgICAgICAgICAgICAgIGlmIChreC5sZW5ndGggIT09IGt5Lmxlbmd0aCkgcmV0dXJuIG5vdEVxdWFsKCk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBreC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgayA9IGt4W2ldO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIU9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKHksIGspKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub3RFcXVhbCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgXG4gICAgcmV0dXJuIGVxdWFsO1xufTtcblxuVHJhdmVyc2UucHJvdG90eXBlLnBhdGhzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhY2MgPSBbXTtcbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgYWNjLnB1c2godGhpcy5wYXRoKTsgXG4gICAgfSk7XG4gICAgcmV0dXJuIGFjYztcbn07XG5cblRyYXZlcnNlLnByb3RvdHlwZS5ub2RlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYWNjID0gW107XG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIGFjYy5wdXNoKHRoaXMubm9kZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGFjYztcbn07XG5cblRyYXZlcnNlLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcGFyZW50cyA9IFtdLCBub2RlcyA9IFtdO1xuICAgIFxuICAgIHJldHVybiAoZnVuY3Rpb24gY2xvbmUgKHNyYykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChwYXJlbnRzW2ldID09PSBzcmMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZXNbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlb2Ygc3JjID09PSAnb2JqZWN0JyAmJiBzcmMgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHZhciBkc3QgPSBjb3B5KHNyYyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHBhcmVudHMucHVzaChzcmMpO1xuICAgICAgICAgICAgbm9kZXMucHVzaChkc3QpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhzcmMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgIGRzdFtrZXldID0gY2xvbmUoc3JjW2tleV0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHBhcmVudHMucG9wKCk7XG4gICAgICAgICAgICBub2Rlcy5wb3AoKTtcbiAgICAgICAgICAgIHJldHVybiBkc3Q7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gc3JjO1xuICAgICAgICB9XG4gICAgfSkodGhpcy52YWx1ZSk7XG59O1xuXG5mdW5jdGlvbiB3YWxrIChyb290LCBjYiwgaW1tdXRhYmxlKSB7XG4gICAgdmFyIHBhdGggPSBbXTtcbiAgICB2YXIgcGFyZW50cyA9IFtdO1xuICAgIHZhciBhbGl2ZSA9IHRydWU7XG4gICAgXG4gICAgcmV0dXJuIChmdW5jdGlvbiB3YWxrZXIgKG5vZGVfKSB7XG4gICAgICAgIHZhciBub2RlID0gaW1tdXRhYmxlID8gY29weShub2RlXykgOiBub2RlXztcbiAgICAgICAgdmFyIG1vZGlmaWVycyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgdmFyIHN0YXRlID0ge1xuICAgICAgICAgICAgbm9kZSA6IG5vZGUsXG4gICAgICAgICAgICBub2RlXyA6IG5vZGVfLFxuICAgICAgICAgICAgcGF0aCA6IFtdLmNvbmNhdChwYXRoKSxcbiAgICAgICAgICAgIHBhcmVudCA6IHBhcmVudHMuc2xpY2UoLTEpWzBdLFxuICAgICAgICAgICAga2V5IDogcGF0aC5zbGljZSgtMSlbMF0sXG4gICAgICAgICAgICBpc1Jvb3QgOiBwYXRoLmxlbmd0aCA9PT0gMCxcbiAgICAgICAgICAgIGxldmVsIDogcGF0aC5sZW5ndGgsXG4gICAgICAgICAgICBjaXJjdWxhciA6IG51bGwsXG4gICAgICAgICAgICB1cGRhdGUgOiBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIGlmICghc3RhdGUuaXNSb290KSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLnBhcmVudC5ub2RlW3N0YXRlLmtleV0gPSB4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdGF0ZS5ub2RlID0geDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnZGVsZXRlJyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgc3RhdGUucGFyZW50Lm5vZGVbc3RhdGUua2V5XTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZW1vdmUgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc3RhdGUucGFyZW50Lm5vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLnBhcmVudC5ub2RlLnNwbGljZShzdGF0ZS5rZXksIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHN0YXRlLnBhcmVudC5ub2RlW3N0YXRlLmtleV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGJlZm9yZSA6IGZ1bmN0aW9uIChmKSB7IG1vZGlmaWVycy5iZWZvcmUgPSBmIH0sXG4gICAgICAgICAgICBhZnRlciA6IGZ1bmN0aW9uIChmKSB7IG1vZGlmaWVycy5hZnRlciA9IGYgfSxcbiAgICAgICAgICAgIHByZSA6IGZ1bmN0aW9uIChmKSB7IG1vZGlmaWVycy5wcmUgPSBmIH0sXG4gICAgICAgICAgICBwb3N0IDogZnVuY3Rpb24gKGYpIHsgbW9kaWZpZXJzLnBvc3QgPSBmIH0sXG4gICAgICAgICAgICBzdG9wIDogZnVuY3Rpb24gKCkgeyBhbGl2ZSA9IGZhbHNlIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGlmICghYWxpdmUpIHJldHVybiBzdGF0ZTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ29iamVjdCcgJiYgbm9kZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgc3RhdGUuaXNMZWFmID0gT2JqZWN0LmtleXMobm9kZSkubGVuZ3RoID09IDA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFyZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChwYXJlbnRzW2ldLm5vZGVfID09PSBub2RlXykge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZS5jaXJjdWxhciA9IHBhcmVudHNbaV07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHN0YXRlLmlzTGVhZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN0YXRlLm5vdExlYWYgPSAhc3RhdGUuaXNMZWFmO1xuICAgICAgICBzdGF0ZS5ub3RSb290ID0gIXN0YXRlLmlzUm9vdDtcbiAgICAgICAgXG4gICAgICAgIC8vIHVzZSByZXR1cm4gdmFsdWVzIHRvIHVwZGF0ZSBpZiBkZWZpbmVkXG4gICAgICAgIHZhciByZXQgPSBjYi5jYWxsKHN0YXRlLCBzdGF0ZS5ub2RlKTtcbiAgICAgICAgaWYgKHJldCAhPT0gdW5kZWZpbmVkICYmIHN0YXRlLnVwZGF0ZSkgc3RhdGUudXBkYXRlKHJldCk7XG4gICAgICAgIGlmIChtb2RpZmllcnMuYmVmb3JlKSBtb2RpZmllcnMuYmVmb3JlLmNhbGwoc3RhdGUsIHN0YXRlLm5vZGUpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGVvZiBzdGF0ZS5ub2RlID09ICdvYmplY3QnXG4gICAgICAgICYmIHN0YXRlLm5vZGUgIT09IG51bGwgJiYgIXN0YXRlLmNpcmN1bGFyKSB7XG4gICAgICAgICAgICBwYXJlbnRzLnB1c2goc3RhdGUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHN0YXRlLm5vZGUpO1xuICAgICAgICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrZXksIGkpIHtcbiAgICAgICAgICAgICAgICBwYXRoLnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAobW9kaWZpZXJzLnByZSkgbW9kaWZpZXJzLnByZS5jYWxsKHN0YXRlLCBzdGF0ZS5ub2RlW2tleV0sIGtleSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdmFyIGNoaWxkID0gd2Fsa2VyKHN0YXRlLm5vZGVba2V5XSk7XG4gICAgICAgICAgICAgICAgaWYgKGltbXV0YWJsZSAmJiBPYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChzdGF0ZS5ub2RlLCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLm5vZGVba2V5XSA9IGNoaWxkLm5vZGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNoaWxkLmlzTGFzdCA9IGkgPT0ga2V5cy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgIGNoaWxkLmlzRmlyc3QgPSBpID09IDA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKG1vZGlmaWVycy5wb3N0KSBtb2RpZmllcnMucG9zdC5jYWxsKHN0YXRlLCBjaGlsZCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcGF0aC5wb3AoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcGFyZW50cy5wb3AoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKG1vZGlmaWVycy5hZnRlcikgbW9kaWZpZXJzLmFmdGVyLmNhbGwoc3RhdGUsIHN0YXRlLm5vZGUpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgIH0pKHJvb3QpLm5vZGU7XG59XG5cbk9iamVjdC5rZXlzKFRyYXZlcnNlLnByb3RvdHlwZSkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgVHJhdmVyc2Vba2V5XSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgIHZhciB0ID0gVHJhdmVyc2Uob2JqKTtcbiAgICAgICAgcmV0dXJuIHRba2V5XS5hcHBseSh0LCBhcmdzKTtcbiAgICB9O1xufSk7XG5cbmZ1bmN0aW9uIGNvcHkgKHNyYykge1xuICAgIGlmICh0eXBlb2Ygc3JjID09PSAnb2JqZWN0JyAmJiBzcmMgIT09IG51bGwpIHtcbiAgICAgICAgdmFyIGRzdDtcbiAgICAgICAgXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHNyYykpIHtcbiAgICAgICAgICAgIGRzdCA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHNyYyBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgICAgICAgIGRzdCA9IG5ldyBEYXRlKHNyYyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc3JjIGluc3RhbmNlb2YgQm9vbGVhbikge1xuICAgICAgICAgICAgZHN0ID0gbmV3IEJvb2xlYW4oc3JjKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzcmMgaW5zdGFuY2VvZiBOdW1iZXIpIHtcbiAgICAgICAgICAgIGRzdCA9IG5ldyBOdW1iZXIoc3JjKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzcmMgaW5zdGFuY2VvZiBTdHJpbmcpIHtcbiAgICAgICAgICAgIGRzdCA9IG5ldyBTdHJpbmcoc3JjKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGRzdCA9IE9iamVjdC5jcmVhdGUoT2JqZWN0LmdldFByb3RvdHlwZU9mKHNyYykpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBPYmplY3Qua2V5cyhzcmMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgZHN0W2tleV0gPSBzcmNba2V5XTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBkc3Q7XG4gICAgfVxuICAgIGVsc2UgcmV0dXJuIHNyYztcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBFbnRyeTtcblxudmFyIFBhc3NUaHJvdWdoID0gcmVxdWlyZSgncmVhZGFibGUtc3RyZWFtL3Bhc3N0aHJvdWdoJyk7XG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKCd1dGlsJykuaW5oZXJpdHM7XG5cbmluaGVyaXRzKEVudHJ5LCBQYXNzVGhyb3VnaCk7XG5cbmZ1bmN0aW9uIEVudHJ5ICgpIHtcbiAgUGFzc1Rocm91Z2guY2FsbCh0aGlzKTtcbiAgdGhpcy5wcm9wcyA9IHt9O1xufVxuXG5FbnRyeS5wcm90b3R5cGUuYXV0b2RyYWluID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLm9uKCdyZWFkYWJsZScsIHRoaXMucmVhZC5iaW5kKHRoaXMpKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gRXh0cmFjdDtcblxudmFyIFBhcnNlID0gcmVxdWlyZShcIi4uL3VuemlwXCIpLlBhcnNlO1xudmFyIFdyaXRlciA9IHJlcXVpcmUoXCJmc3RyZWFtXCIpLldyaXRlcjtcbnZhciBXcml0YWJsZSA9IHJlcXVpcmUoJ3JlYWRhYmxlLXN0cmVhbS93cml0YWJsZScpO1xudmFyIHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKCd1dGlsJykuaW5oZXJpdHM7XG5cbmluaGVyaXRzKEV4dHJhY3QsIFdyaXRhYmxlKTtcblxuZnVuY3Rpb24gRXh0cmFjdCAob3B0cykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBFeHRyYWN0KSkge1xuICAgIHJldHVybiBuZXcgRXh0cmFjdChvcHRzKTtcbiAgfVxuXG4gIFdyaXRhYmxlLmFwcGx5KHRoaXMpO1xuICB0aGlzLl9vcHRzID0gb3B0cyB8fCB7IHZlcmJvc2U6IGZhbHNlIH07XG5cbiAgdGhpcy5fcGFyc2VyID0gUGFyc2UodGhpcy5fb3B0cyk7XG4gIHRoaXMuX3BhcnNlci5vbignZXJyb3InLCBmdW5jdGlvbihlcnIpIHtcbiAgICBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgfSk7XG4gIHRoaXMub24oJ2ZpbmlzaCcsIGZ1bmN0aW9uKCkge1xuICAgIHNlbGYuX3BhcnNlci5lbmQoKTtcbiAgfSk7XG5cbiAgdmFyIHdyaXRlciA9IFdyaXRlcih7XG4gICAgdHlwZTogJ0RpcmVjdG9yeScsXG4gICAgcGF0aDogb3B0cy5wYXRoXG4gIH0pO1xuICB3cml0ZXIub24oJ2Vycm9yJywgZnVuY3Rpb24oZXJyKSB7XG4gICAgc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG4gIH0pO1xuICB3cml0ZXIub24oJ2Nsb3NlJywgZnVuY3Rpb24oKSB7XG4gICAgc2VsZi5lbWl0KCdjbG9zZScpXG4gIH0pO1xuXG4gIHRoaXMub24oJ3BpcGUnLCBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICBpZiAob3B0cy52ZXJib3NlICYmIHNvdXJjZS5wYXRoKSB7XG4gICAgICBjb25zb2xlLmxvZygnQXJjaGl2ZTogJywgc291cmNlLnBhdGgpO1xuICAgIH1cbiAgfSk7XG5cbiAgdGhpcy5fcGFyc2VyLnBpcGUod3JpdGVyKTtcbn1cblxuRXh0cmFjdC5wcm90b3R5cGUuX3dyaXRlID0gZnVuY3Rpb24gKGNodW5rLCBlbmNvZGluZywgY2FsbGJhY2spIHtcbiAgaWYgKHRoaXMuX3BhcnNlci53cml0ZShjaHVuaykpIHtcbiAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLl9wYXJzZXIub25jZSgnZHJhaW4nLCBjYWxsYmFjayk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBhcnNlLmNyZWF0ZSA9IFBhcnNlO1xuXG5yZXF1aXJlKFwic2V0aW1tZWRpYXRlXCIpO1xudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJ3JlYWRhYmxlLXN0cmVhbS90cmFuc2Zvcm0nKTtcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ3V0aWwnKS5pbmhlcml0cztcbnZhciB6bGliID0gcmVxdWlyZSgnemxpYicpO1xudmFyIGJpbmFyeSA9IHJlcXVpcmUoJ2JpbmFyeScpO1xudmFyIFB1bGxTdHJlYW0gPSByZXF1aXJlKCdwdWxsc3RyZWFtJyk7XG52YXIgTWF0Y2hTdHJlYW0gPSByZXF1aXJlKCdtYXRjaC1zdHJlYW0nKTtcbnZhciBFbnRyeSA9IHJlcXVpcmUoJy4vZW50cnknKTtcblxuaW5oZXJpdHMoUGFyc2UsIFRyYW5zZm9ybSk7XG5cbmZ1bmN0aW9uIFBhcnNlKG9wdHMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUGFyc2UpKSB7XG4gICAgcmV0dXJuIG5ldyBQYXJzZShvcHRzKTtcbiAgfVxuXG4gIFRyYW5zZm9ybS5jYWxsKHRoaXMsIHsgbG93V2F0ZXJNYXJrOiAwIH0pO1xuICB0aGlzLl9vcHRzID0gb3B0cyB8fCB7IHZlcmJvc2U6IGZhbHNlIH07XG4gIHRoaXMuX2hhc0VudHJ5TGlzdGVuZXIgPSBmYWxzZTtcblxuICB0aGlzLl9wdWxsU3RyZWFtID0gbmV3IFB1bGxTdHJlYW0oKTtcbiAgdGhpcy5fcHVsbFN0cmVhbS5vbihcImVycm9yXCIsIGZ1bmN0aW9uIChlKSB7XG4gICAgc2VsZi5lbWl0KCdlcnJvcicsIGUpO1xuICB9KTtcbiAgdGhpcy5fcHVsbFN0cmVhbS5vbmNlKFwiZW5kXCIsIGZ1bmN0aW9uICgpIHtcbiAgICBzZWxmLl9zdHJlYW1FbmQgPSB0cnVlO1xuICB9KTtcbiAgdGhpcy5fcHVsbFN0cmVhbS5vbmNlKFwiZmluaXNoXCIsIGZ1bmN0aW9uICgpIHtcbiAgICBzZWxmLl9zdHJlYW1GaW5pc2ggPSB0cnVlO1xuICB9KTtcblxuICB0aGlzLl9yZWFkUmVjb3JkKCk7XG59XG5cblBhcnNlLnByb3RvdHlwZS5fcmVhZFJlY29yZCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl9wdWxsU3RyZWFtLnB1bGwoNCwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIHJldHVybiBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICB9XG5cbiAgICBpZiAoZGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc2lnbmF0dXJlID0gZGF0YS5yZWFkVUludDMyTEUoMCk7XG4gICAgaWYgKHNpZ25hdHVyZSA9PT0gMHgwNDAzNGI1MCkge1xuICAgICAgc2VsZi5fcmVhZEZpbGUoKTtcbiAgICB9IGVsc2UgaWYgKHNpZ25hdHVyZSA9PT0gMHgwMjAxNGI1MCkge1xuICAgICAgc2VsZi5fcmVhZENlbnRyYWxEaXJlY3RvcnlGaWxlSGVhZGVyKCk7XG4gICAgfSBlbHNlIGlmIChzaWduYXR1cmUgPT09IDB4MDYwNTRiNTApIHtcbiAgICAgIHNlbGYuX3JlYWRFbmRPZkNlbnRyYWxEaXJlY3RvcnlSZWNvcmQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXJyID0gbmV3IEVycm9yKCdpbnZhbGlkIHNpZ25hdHVyZTogMHgnICsgc2lnbmF0dXJlLnRvU3RyaW5nKDE2KSk7XG4gICAgICBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICB9XG4gIH0pO1xufTtcblxuUGFyc2UucHJvdG90eXBlLl9yZWFkRmlsZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl9wdWxsU3RyZWFtLnB1bGwoMjYsIGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICByZXR1cm4gc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgfVxuXG4gICAgdmFyIHZhcnMgPSBiaW5hcnkucGFyc2UoZGF0YSlcbiAgICAgIC53b3JkMTZsdSgndmVyc2lvbnNOZWVkZWRUb0V4dHJhY3QnKVxuICAgICAgLndvcmQxNmx1KCdmbGFncycpXG4gICAgICAud29yZDE2bHUoJ2NvbXByZXNzaW9uTWV0aG9kJylcbiAgICAgIC53b3JkMTZsdSgnbGFzdE1vZGlmaWVkVGltZScpXG4gICAgICAud29yZDE2bHUoJ2xhc3RNb2RpZmllZERhdGUnKVxuICAgICAgLndvcmQzMmx1KCdjcmMzMicpXG4gICAgICAud29yZDMybHUoJ2NvbXByZXNzZWRTaXplJylcbiAgICAgIC53b3JkMzJsdSgndW5jb21wcmVzc2VkU2l6ZScpXG4gICAgICAud29yZDE2bHUoJ2ZpbGVOYW1lTGVuZ3RoJylcbiAgICAgIC53b3JkMTZsdSgnZXh0cmFGaWVsZExlbmd0aCcpXG4gICAgICAudmFycztcblxuICAgIHJldHVybiBzZWxmLl9wdWxsU3RyZWFtLnB1bGwodmFycy5maWxlTmFtZUxlbmd0aCwgZnVuY3Rpb24gKGVyciwgZmlsZU5hbWUpIHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgfVxuICAgICAgZmlsZU5hbWUgPSBmaWxlTmFtZS50b1N0cmluZygndXRmOCcpO1xuICAgICAgdmFyIGVudHJ5ID0gbmV3IEVudHJ5KCk7XG4gICAgICBlbnRyeS5wYXRoID0gZmlsZU5hbWU7XG4gICAgICBlbnRyeS5wcm9wcy5wYXRoID0gZmlsZU5hbWU7XG4gICAgICBlbnRyeS50eXBlID0gKHZhcnMuY29tcHJlc3NlZFNpemUgPT09IDAgJiYgL1tcXC9cXFxcXSQvLnRlc3QoZmlsZU5hbWUpKSA/ICdEaXJlY3RvcnknIDogJ0ZpbGUnO1xuXG4gICAgICBpZiAoc2VsZi5fb3B0cy52ZXJib3NlKSB7XG4gICAgICAgIGlmIChlbnRyeS50eXBlID09PSAnRGlyZWN0b3J5Jykge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCcgICBjcmVhdGluZzonLCBmaWxlTmFtZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoZW50cnkudHlwZSA9PT0gJ0ZpbGUnKSB7XG4gICAgICAgICAgaWYgKHZhcnMuY29tcHJlc3Npb25NZXRob2QgPT09IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCcgZXh0cmFjdGluZzonLCBmaWxlTmFtZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCcgIGluZmxhdGluZzonLCBmaWxlTmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciBoYXNFbnRyeUxpc3RlbmVyID0gc2VsZi5faGFzRW50cnlMaXN0ZW5lcjtcbiAgICAgIGlmIChoYXNFbnRyeUxpc3RlbmVyKSB7XG4gICAgICAgIHNlbGYuZW1pdCgnZW50cnknLCBlbnRyeSk7XG4gICAgICB9XG5cbiAgICAgIHNlbGYuX3B1bGxTdHJlYW0ucHVsbCh2YXJzLmV4dHJhRmllbGRMZW5ndGgsIGZ1bmN0aW9uIChlcnIsIGV4dHJhRmllbGQpIHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHJldHVybiBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFycy5jb21wcmVzc2lvbk1ldGhvZCA9PT0gMCkge1xuICAgICAgICAgIHNlbGYuX3B1bGxTdHJlYW0ucHVsbCh2YXJzLmNvbXByZXNzZWRTaXplLCBmdW5jdGlvbiAoZXJyLCBjb21wcmVzc2VkRGF0YSkge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICByZXR1cm4gc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChoYXNFbnRyeUxpc3RlbmVyKSB7XG4gICAgICAgICAgICAgIGVudHJ5LndyaXRlKGNvbXByZXNzZWREYXRhKTtcbiAgICAgICAgICAgICAgZW50cnkuZW5kKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBzZWxmLl9yZWFkUmVjb3JkKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIGZpbGVTaXplS25vd24gPSAhKHZhcnMuZmxhZ3MgJiAweDA4KTtcblxuICAgICAgICAgIHZhciBpbmZsYXRlciA9IHpsaWIuY3JlYXRlSW5mbGF0ZVJhdygpO1xuICAgICAgICAgIGluZmxhdGVyLm9uKCdlcnJvcicsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKGZpbGVTaXplS25vd24pIHtcbiAgICAgICAgICAgIGVudHJ5LnNpemUgPSB2YXJzLnVuY29tcHJlc3NlZFNpemU7XG4gICAgICAgICAgICBpZiAoaGFzRW50cnlMaXN0ZW5lcikge1xuICAgICAgICAgICAgICBlbnRyeS5vbignZmluaXNoJywgc2VsZi5fcmVhZFJlY29yZC5iaW5kKHNlbGYpKTtcbiAgICAgICAgICAgICAgc2VsZi5fcHVsbFN0cmVhbS5waXBlKHZhcnMuY29tcHJlc3NlZFNpemUsIGluZmxhdGVyKS5waXBlKGVudHJ5KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHNlbGYuX3B1bGxTdHJlYW0uZHJhaW4odmFycy5jb21wcmVzc2VkU2l6ZSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2VsZi5fcmVhZFJlY29yZCgpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGRlc2NyaXB0b3JTaWcgPSBuZXcgQnVmZmVyKDQpO1xuICAgICAgICAgICAgZGVzY3JpcHRvclNpZy53cml0ZVVJbnQzMkxFKDB4MDgwNzRiNTAsIDApO1xuXG4gICAgICAgICAgICB2YXIgbWF0Y2hTdHJlYW0gPSBuZXcgTWF0Y2hTdHJlYW0oeyBwYXR0ZXJuOiBkZXNjcmlwdG9yU2lnIH0sIGZ1bmN0aW9uIChidWYsIG1hdGNoZWQsIGV4dHJhKSB7XG4gICAgICAgICAgICAgIGlmIChoYXNFbnRyeUxpc3RlbmVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtYXRjaGVkKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wdXNoKGJ1Zik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMucHVzaChidWYpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHNldEltbWVkaWF0ZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl9wdWxsU3RyZWFtLnVucGlwZSgpO1xuICAgICAgICAgICAgICAgIHNlbGYuX3B1bGxTdHJlYW0ucHJlcGVuZChleHRyYSk7XG4gICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc0RhdGFEZXNjcmlwdG9yKGVudHJ5KTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLnB1c2gobnVsbCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgc2VsZi5fcHVsbFN0cmVhbS5waXBlKG1hdGNoU3RyZWFtKTtcbiAgICAgICAgICAgIGlmIChoYXNFbnRyeUxpc3RlbmVyKSB7XG4gICAgICAgICAgICAgIG1hdGNoU3RyZWFtLnBpcGUoaW5mbGF0ZXIpLnBpcGUoZW50cnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuUGFyc2UucHJvdG90eXBlLl9wcm9jZXNzRGF0YURlc2NyaXB0b3IgPSBmdW5jdGlvbiAoZW50cnkpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl9wdWxsU3RyZWFtLnB1bGwoMTYsIGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICByZXR1cm4gc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgfVxuXG4gICAgdmFyIHZhcnMgPSBiaW5hcnkucGFyc2UoZGF0YSlcbiAgICAgIC53b3JkMzJsdSgnZGF0YURlc2NyaXB0b3JTaWduYXR1cmUnKVxuICAgICAgLndvcmQzMmx1KCdjcmMzMicpXG4gICAgICAud29yZDMybHUoJ2NvbXByZXNzZWRTaXplJylcbiAgICAgIC53b3JkMzJsdSgndW5jb21wcmVzc2VkU2l6ZScpXG4gICAgICAudmFycztcblxuICAgIGVudHJ5LnNpemUgPSB2YXJzLnVuY29tcHJlc3NlZFNpemU7XG4gICAgc2VsZi5fcmVhZFJlY29yZCgpO1xuICB9KTtcbn07XG5cblBhcnNlLnByb3RvdHlwZS5fcmVhZENlbnRyYWxEaXJlY3RvcnlGaWxlSGVhZGVyID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuX3B1bGxTdHJlYW0ucHVsbCg0MiwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIHJldHVybiBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICB9XG5cbiAgICB2YXIgdmFycyA9IGJpbmFyeS5wYXJzZShkYXRhKVxuICAgICAgLndvcmQxNmx1KCd2ZXJzaW9uTWFkZUJ5JylcbiAgICAgIC53b3JkMTZsdSgndmVyc2lvbnNOZWVkZWRUb0V4dHJhY3QnKVxuICAgICAgLndvcmQxNmx1KCdmbGFncycpXG4gICAgICAud29yZDE2bHUoJ2NvbXByZXNzaW9uTWV0aG9kJylcbiAgICAgIC53b3JkMTZsdSgnbGFzdE1vZGlmaWVkVGltZScpXG4gICAgICAud29yZDE2bHUoJ2xhc3RNb2RpZmllZERhdGUnKVxuICAgICAgLndvcmQzMmx1KCdjcmMzMicpXG4gICAgICAud29yZDMybHUoJ2NvbXByZXNzZWRTaXplJylcbiAgICAgIC53b3JkMzJsdSgndW5jb21wcmVzc2VkU2l6ZScpXG4gICAgICAud29yZDE2bHUoJ2ZpbGVOYW1lTGVuZ3RoJylcbiAgICAgIC53b3JkMTZsdSgnZXh0cmFGaWVsZExlbmd0aCcpXG4gICAgICAud29yZDE2bHUoJ2ZpbGVDb21tZW50TGVuZ3RoJylcbiAgICAgIC53b3JkMTZsdSgnZGlza051bWJlcicpXG4gICAgICAud29yZDE2bHUoJ2ludGVybmFsRmlsZUF0dHJpYnV0ZXMnKVxuICAgICAgLndvcmQzMmx1KCdleHRlcm5hbEZpbGVBdHRyaWJ1dGVzJylcbiAgICAgIC53b3JkMzJsdSgnb2Zmc2V0VG9Mb2NhbEZpbGVIZWFkZXInKVxuICAgICAgLnZhcnM7XG5cbiAgICByZXR1cm4gc2VsZi5fcHVsbFN0cmVhbS5wdWxsKHZhcnMuZmlsZU5hbWVMZW5ndGgsIGZ1bmN0aW9uIChlcnIsIGZpbGVOYW1lKSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJldHVybiBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgIH1cbiAgICAgIGZpbGVOYW1lID0gZmlsZU5hbWUudG9TdHJpbmcoJ3V0ZjgnKTtcblxuICAgICAgc2VsZi5fcHVsbFN0cmVhbS5wdWxsKHZhcnMuZXh0cmFGaWVsZExlbmd0aCwgZnVuY3Rpb24gKGVyciwgZXh0cmFGaWVsZCkge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmV0dXJuIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgICB9XG4gICAgICAgIHNlbGYuX3B1bGxTdHJlYW0ucHVsbCh2YXJzLmZpbGVDb21tZW50TGVuZ3RoLCBmdW5jdGlvbiAoZXJyLCBmaWxlQ29tbWVudCkge1xuICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIHJldHVybiBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHNlbGYuX3JlYWRSZWNvcmQoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5QYXJzZS5wcm90b3R5cGUuX3JlYWRFbmRPZkNlbnRyYWxEaXJlY3RvcnlSZWNvcmQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5fcHVsbFN0cmVhbS5wdWxsKDE4LCBmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG4gICAgaWYgKGVycikge1xuICAgICAgcmV0dXJuIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgIH1cblxuICAgIHZhciB2YXJzID0gYmluYXJ5LnBhcnNlKGRhdGEpXG4gICAgICAud29yZDE2bHUoJ2Rpc2tOdW1iZXInKVxuICAgICAgLndvcmQxNmx1KCdkaXNrU3RhcnQnKVxuICAgICAgLndvcmQxNmx1KCdudW1iZXJPZlJlY29yZHNPbkRpc2snKVxuICAgICAgLndvcmQxNmx1KCdudW1iZXJPZlJlY29yZHMnKVxuICAgICAgLndvcmQzMmx1KCdzaXplT2ZDZW50cmFsRGlyZWN0b3J5JylcbiAgICAgIC53b3JkMzJsdSgnb2Zmc2V0VG9TdGFydE9mQ2VudHJhbERpcmVjdG9yeScpXG4gICAgICAud29yZDE2bHUoJ2NvbW1lbnRMZW5ndGgnKVxuICAgICAgLnZhcnM7XG5cbiAgICBpZiAodmFycy5jb21tZW50TGVuZ3RoKSB7XG4gICAgICBzZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7XG4gICAgICAgIHNlbGYuX3B1bGxTdHJlYW0ucHVsbCh2YXJzLmNvbW1lbnRMZW5ndGgsIGZ1bmN0aW9uIChlcnIsIGNvbW1lbnQpIHtcbiAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbW1lbnQgPSBjb21tZW50LnRvU3RyaW5nKCd1dGY4Jyk7XG4gICAgICAgICAgcmV0dXJuIHNlbGYuX3B1bGxTdHJlYW0uZW5kKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgc2VsZi5fcHVsbFN0cmVhbS5lbmQoKTtcbiAgICB9XG4gIH0pO1xufTtcblxuUGFyc2UucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbiAoY2h1bmssIGVuY29kaW5nLCBjYWxsYmFjaykge1xuICBpZiAodGhpcy5fcHVsbFN0cmVhbS53cml0ZShjaHVuaykpIHtcbiAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgfVxuXG4gIHRoaXMuX3B1bGxTdHJlYW0ub25jZSgnZHJhaW4nLCBjYWxsYmFjayk7XG59O1xuXG5QYXJzZS5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uIChkZXN0LCBvcHRzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHR5cGVvZiBkZXN0LmFkZCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgc2VsZi5vbihcImVudHJ5XCIsIGZ1bmN0aW9uIChlbnRyeSkge1xuICAgICAgZGVzdC5hZGQoZW50cnkpO1xuICAgIH0pXG4gIH1cbiAgcmV0dXJuIFRyYW5zZm9ybS5wcm90b3R5cGUucGlwZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuUGFyc2UucHJvdG90eXBlLl9mbHVzaCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICBpZiAoIXRoaXMuX3N0cmVhbUVuZCB8fCAhdGhpcy5fc3RyZWFtRmluaXNoKSB7XG4gICAgcmV0dXJuIHNldEltbWVkaWF0ZSh0aGlzLl9mbHVzaC5iaW5kKHRoaXMsIGNhbGxiYWNrKSk7XG4gIH1cblxuICB0aGlzLmVtaXQoJ2Nsb3NlJyk7XG4gIHJldHVybiBjYWxsYmFjaygpO1xufTtcblxuUGFyc2UucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCdlbnRyeScgPT09IHR5cGUpIHtcbiAgICB0aGlzLl9oYXNFbnRyeUxpc3RlbmVyID0gdHJ1ZTtcbiAgfVxuICByZXR1cm4gVHJhbnNmb3JtLnByb3RvdHlwZS5hZGRMaXN0ZW5lci5jYWxsKHRoaXMsIHR5cGUsIGxpc3RlbmVyKTtcbn07XG5cblBhcnNlLnByb3RvdHlwZS5vbiA9IFBhcnNlLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5QYXJzZSA9IHJlcXVpcmUoJy4vbGliL3BhcnNlJyk7XG5leHBvcnRzLkV4dHJhY3QgPSByZXF1aXJlKCcuL2xpYi9leHRyYWN0Jyk7IiwiLy8gUmV0dXJucyBhIHdyYXBwZXIgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgd3JhcHBlZCBjYWxsYmFja1xuLy8gVGhlIHdyYXBwZXIgZnVuY3Rpb24gc2hvdWxkIGRvIHNvbWUgc3R1ZmYsIGFuZCByZXR1cm4gYVxuLy8gcHJlc3VtYWJseSBkaWZmZXJlbnQgY2FsbGJhY2sgZnVuY3Rpb24uXG4vLyBUaGlzIG1ha2VzIHN1cmUgdGhhdCBvd24gcHJvcGVydGllcyBhcmUgcmV0YWluZWQsIHNvIHRoYXRcbi8vIGRlY29yYXRpb25zIGFuZCBzdWNoIGFyZSBub3QgbG9zdCBhbG9uZyB0aGUgd2F5LlxubW9kdWxlLmV4cG9ydHMgPSB3cmFwcHlcbmZ1bmN0aW9uIHdyYXBweSAoZm4sIGNiKSB7XG4gIGlmIChmbiAmJiBjYikgcmV0dXJuIHdyYXBweShmbikoY2IpXG5cbiAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJylcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCduZWVkIHdyYXBwZXIgZnVuY3Rpb24nKVxuXG4gIE9iamVjdC5rZXlzKGZuKS5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgd3JhcHBlcltrXSA9IGZuW2tdXG4gIH0pXG5cbiAgcmV0dXJuIHdyYXBwZXJcblxuICBmdW5jdGlvbiB3cmFwcGVyKCkge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGgpXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBhcmdzW2ldID0gYXJndW1lbnRzW2ldXG4gICAgfVxuICAgIHZhciByZXQgPSBmbi5hcHBseSh0aGlzLCBhcmdzKVxuICAgIHZhciBjYiA9IGFyZ3NbYXJncy5sZW5ndGgtMV1cbiAgICBpZiAodHlwZW9mIHJldCA9PT0gJ2Z1bmN0aW9uJyAmJiByZXQgIT09IGNiKSB7XG4gICAgICBPYmplY3Qua2V5cyhjYikuZm9yRWFjaChmdW5jdGlvbiAoaykge1xuICAgICAgICByZXRba10gPSBjYltrXVxuICAgICAgfSlcbiAgICB9XG4gICAgcmV0dXJuIHJldFxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJhc3NlcnRcIik7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiYnVmZmVyXCIpOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImNvbnN0YW50c1wiKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJldmVudHNcIik7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZnNcIik7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwibW9kdWxlXCIpOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInBhdGhcIik7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwic3RyZWFtXCIpOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInV0aWxcIik7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwidjhcIik7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwidm1cIik7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiemxpYlwiKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJ3ZWJvcy1zZXJ2aWNlXCIpOyIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gbm90ZTogVGhlIEpTIHNlcnZpY2UgbXVzdCBiZSBwYWNrYWdlZCBhbG9uZyB3aXRoIHRoZSBhcHAuXG4vLyBGaWxlIEkvTyBTZXJ2aWNlXG4vLyBBIHdlYk9TIHNlcnZpY2Ugc2FtcGxlIHVzaW5nIE5vZGUuanMgZnMsIGNyeXB0byBhbmQgdW56aXAgbGlicmFyeSBmdW5jdGlvbnNcbi8qXG5JZiB0aGUgSlMgc2VydmljZSB1c2VzIG1ldGhvZHMgb2YgZXh0ZXJuYWwgc2VydmljZXMsIFxueW91IG11c3QgYWRkIHRoZSBncm91cCBpbmZvcm1hdGlvbiBvZiB0aGUgZXh0ZXJuYWwgbWV0aG9kcyB0byB0aGUgcmVxdWlyZWRQZXJtaXNzaW9ucyBmaWVsZCBpbiBhcHBpbmZvLmpzb25cbiBvZiB0aGUgYXBwIHVzZWQgZm9yIHBhY2thZ2luZyB0aGUgSlMgc2VydmljZS4gU2VlIENvbmZpZ3VyaW5nIHRoZSBXZWIgQXBwIGZvciBkZXRhaWxzLlxuKi9cbi8vcGFja2FnZS5qc29uLT5leHRlcm5hbHMtPmlnbm9yZSBjb21waWxlIGxpa2UgQHRzLWlnbm9yZVxuLy9yZXF1aXJlIG5wbSBpbnN0YWxsIHBhcmNlbC1wbHVnaW4tZXh0ZXJuYWxzXG4vL+WmguaenOWHuueOsGFwcOaXoOazleWuieijheeahOaDheWGte+8jCDkuLvopoHljp/lm6DlsLHmmK9qcy1zZXJ2aWNl5Luj56CB5peg5rOV5omn6KGM5byV6LW377yM5Y+v5Lul6YCa6L+HXG4vL2pvdXJuYWxjdGwgLVMgXCIxIGhvdXIgYWdvXCJcbi8v5ZG95Luk5p+l55yL5a+86Ie05Luj56CB5peg5rOV5omn6KGM55qE5Y6f5Zug77yMIOi/nOeoi+WIsC9tZWRpYS9kZXZlbG9wZXIvYXBwcy91c3IvcGxhbXPnm67lvZXlrprkvY3nsbvkvLzkuIDkuIvplJnor6/vvIzlhYjov5znqIvkv67lpI3vvIzlho3ph43mlrDlronoo4Vcbi8qXG5PY3QgMTcgMTg6MDY6MTAgcmFzcGJlcnJ5cGk0IGxzLWh1YmRbMTUzNF06IFJlZmVyZW5jZUVycm9yOiB3ZWJvcyBpcyBub3QgZGVmaW5lZFxuT2N0IDE3IDE4OjA2OjEwIHJhc3BiZXJyeXBpNCBscy1odWJkWzE1MzRdOiAgICAgYXQgT2JqZWN0LjE1OSAoL21lZGlhL2RldmVsb3Blci9hcHBzL3Vzci9wYWxtL3NlcnZpY2VzL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvaW5kZXguanM6MjQ6MTgpXG5PY3QgMTcgMTg6MDY6MTAgcmFzcGJlcnJ5cGk0IGxzLWh1YmRbMTUzNF06ICAgICBhdCBfX3dlYnBhY2tfcmVxdWlyZV9fICgvbWVkaWEvZGV2ZWxvcGVyL2FwcHMvdXNyL3BhbG0vc2VydmljZXMvY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS9pbmRleC5qczo1Njo0MSlcbk9jdCAxNyAxODowNjoxMCByYXNwYmVycnlwaTQgbHMtaHViZFsxNTM0XTogICAgIGF0IC9tZWRpYS9kZXZlbG9wZXIvYXBwcy91c3IvcGFsbS9zZXJ2aWNlcy9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlL2luZGV4LmpzOjc2OjE3XG5PY3QgMTcgMTg6MDY6MTAgcmFzcGJlcnJ5cGk0IGxzLWh1YmRbMTUzNF06ICAgICBhdCAvbWVkaWEvZGV2ZWxvcGVyL2FwcHMvdXNyL3BhbG0vc2VydmljZXMvY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS9pbmRleC5qczoyNjY6M1xuT2N0IDE3IDE4OjA2OjEwIHJhc3BiZXJyeXBpNCBscy1odWJkWzE1MzRdOiAgICAgYXQgT2JqZWN0Ljxhbm9ueW1vdXM+ICgvbWVkaWEvZGV2ZWxvcGVyL2FwcHMvdXNyL3BhbG0vc2VydmljZXMvY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS9pbmRleC5qczoyNjg6MTIpXG5PY3QgMTcgMTg6MDY6MTAgcmFzcGJlcnJ5cGk0IGxzLWh1YmRbMTUzNF06ICAgICBhdCBNb2R1bGUuX2NvbXBpbGUgKGludGVybmFsL21vZHVsZXMvY2pzL2xvYWRlci5qczo5OTk6MzApXG5PY3QgMTcgMTg6MDY6MTAgcmFzcGJlcnJ5cGk0IGxzLWh1YmRbMTUzNF06ICAgICBhdCBPYmplY3QuTW9kdWxlLl9leHRlbnNpb25zLi5qcyAoaW50ZXJuYWwvbW9kdWxlcy9janMvbG9hZGVyLmpzOjEwMjc6MTApXG5PY3QgMTcgMTg6MDY6MTAgcmFzcGJlcnJ5cGk0IGxzLWh1YmRbMTUzNF06ICAgICBhdCBNb2R1bGUubG9hZCAoaW50ZXJuYWwvbW9kdWxlcy9janMvbG9hZGVyLmpzOjg2MzozMilcbk9jdCAxNyAxODowNjoxMCByYXNwYmVycnlwaTQgbHMtaHViZFsxNTM0XTogICAgIGF0IEZ1bmN0aW9uLk1vZHVsZS5fbG9hZCAoaW50ZXJuYWwvbW9kdWxlcy9janMvbG9hZGVyLmpzOjcwODoxNClcbk9jdCAxNyAxODowNjoxMCByYXNwYmVycnlwaTQgbHMtaHViZFsxNTM0XTogICAgIGF0IE1vZHVsZS5yZXF1aXJlIChpbnRlcm5hbC9tb2R1bGVzL2Nqcy9sb2FkZXIuanM6ODg3OjE5KVxuKi9cbmNvbnN0IFNlcnZpY2UgPSByZXF1aXJlKFwid2Vib3Mtc2VydmljZVwiKTtcbmNvbnN0IHBrZ0luZm8gPSByZXF1aXJlKCcuL3BhY2thZ2UuanNvbicpO1xuY29uc3Qgc2VydmljZSA9IG5ldyBTZXJ2aWNlKHBrZ0luZm8ubmFtZSk7XG5zZXJ2aWNlLmFjdGl2aXR5TWFuYWdlci5pZGxlVGltZW91dCA9IDVcblxuLy9jb25zdCBjcnlwdG8gPSByZXF1aXJlKFwiY3J5cHRvXCIpO1xuY29uc3QgZnMgPSByZXF1aXJlKFwiZnNcIik7XG5cbi8vIGNvcHlGaWxlXG5zZXJ2aWNlLnJlZ2lzdGVyKFwiY29weUZpbGVcIiwgZnVuY3Rpb24obWVzc2FnZSkge1xuICB2YXIgb3JpZ2luYWxQYXRoID0gIG1lc3NhZ2UucGF5bG9hZC5vcmlnaW5hbFBhdGg7XG4gIHZhciBjb3B5UGF0aCA9ICBtZXNzYWdlLnBheWxvYWQuY29weVBhdGg7XG5cbiAgLy8gY3JlYXRlUmVhZFN0cmVhbSAmIGNyZWF0ZVdyaXRlU3RyZWFtXG4gIHZhciBpbnB1dEZpbGUgPSBmcy5jcmVhdGVSZWFkU3RyZWFtKG9yaWdpbmFsUGF0aCk7XG4gIHZhciBvdXRwdXRGaWxlID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0oY29weVBhdGgpO1xuXG4gIC8vIEVycm9yIGhhbmRsaW5nXG4gIGlucHV0RmlsZS5vbihcImVycm9yXCIsIGZ1bmN0aW9uKGVycikge1xuICAgIG1lc3NhZ2UucmVzcG9uZCh7XG4gICAgICByZXR1cm5WYWx1ZTogZmFsc2UsXG4gICAgICBlcnJvckNvZGU6IFwiY29weUZpbGUgY3JlYXRlUmVhZFN0cmVhbSBFUlJPUlwiLFxuICAgICAgZXJyb3JUZXh0OiBlcnJcbiAgICB9KTtcbiAgfSk7XG5cbiAgb3V0cHV0RmlsZS5vbihcImVycm9yXCIsIGZ1bmN0aW9uKGVycikge1xuICAgIG1lc3NhZ2UucmVzcG9uZCh7XG4gICAgICByZXR1cm5WYWx1ZTogZmFsc2UsXG4gICAgICBlcnJvckNvZGU6IFwiY29weUZpbGUgY3JlYXRlV3JpdGVTdHJlYW0gRVJST1JcIixcbiAgICAgIGVycm9yVGV4dDogZXJyXG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vIERvIGNvcHkgJiBFbmQgZXZlbnRcbiAgaW5wdXRGaWxlLnBpcGUob3V0cHV0RmlsZSkub24oXCJjbG9zZVwiLCBmdW5jdGlvbihlcnIpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICBtZXNzYWdlLnJlc3BvbmQoe1xuICAgICAgICByZXR1cm5WYWx1ZTogZmFsc2UsXG4gICAgICAgIGVycm9yQ29kZTogXCJjb3B5RmlsZSBjcmVhdGVXcml0ZVN0cmVhbSBFUlJPUlwiLFxuICAgICAgICBlcnJvclRleHQ6IGVyclxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XG4gICAgICAgIHJldHVyblZhbHVlOiB0cnVlXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xufSk7XG5cbi8vIGV4aXN0c1xuc2VydmljZS5yZWdpc3RlcihcImV4aXN0c1wiLCBmdW5jdGlvbihtZXNzYWdlKSB7XG4gIHZhciBwYXRoID0gIG1lc3NhZ2UucGF5bG9hZC5wYXRoO1xuXG4gIGZzLmV4aXN0cyhwYXRoLCBmdW5jdGlvbihleGlzdHMpIHtcbiAgICBpZiAoIWV4aXN0cykge1xuICAgICAgbWVzc2FnZS5yZXNwb25kKHtcbiAgICAgICAgcmV0dXJuVmFsdWU6IGZhbHNlLFxuICAgICAgICBlcnJvckNvZGU6IFwiLTFcIixcbiAgICAgICAgZXJyb3JUZXh0OiBcIk5vdCBmb3VuZFwiXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWVzc2FnZS5yZXNwb25kKHtcbiAgICAgICAgcmV0dXJuVmFsdWU6IHRydWUsXG4gICAgICAgIGV4aXN0czogZXhpc3RzXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xufSk7XG5cbi8vIGxpc3RGaWxlc1xuc2VydmljZS5yZWdpc3RlcihcImxpc3RGaWxlc1wiLCBmdW5jdGlvbihtZXNzYWdlKSB7XG4gIHZhciBwYXRoID0gIG1lc3NhZ2UucGF5bG9hZC5wYXRoO1xuXG4gIGZzLnJlYWRkaXIocGF0aCwgZnVuY3Rpb24oZXJyLCBmaWxlcykge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XG4gICAgICAgIHJldHVyblZhbHVlOiBmYWxzZSxcbiAgICAgICAgZXJyb3JDb2RlOiBcImxpc3RGaWxlcyBFUlJPUlwiLFxuICAgICAgICBlcnJvclRleHQ6IGVyclxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XG4gICAgICAgIHJldHVyblZhbHVlOiB0cnVlLFxuICAgICAgICBmaWxlczogZmlsZXNcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG59KTtcblxuLy8gbWtkaXJcbnNlcnZpY2UucmVnaXN0ZXIoXCJta2RpclwiLCBmdW5jdGlvbihtZXNzYWdlKSB7XG4gIHZhciBwYXRoID0gIG1lc3NhZ2UucGF5bG9hZC5wYXRoO1xuICBjb25zb2xlLmxvZyhcInBhdGhcIiwgcGF0aCk7XG4gIGZzLm1rZGlyKHBhdGgsIGZ1bmN0aW9uKGVycikge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XG4gICAgICAgIHJldHVyblZhbHVlOiBmYWxzZSxcbiAgICAgICAgZXJyb3JDb2RlOiBcIm1rZGlyIEVSUk9SXCIsXG4gICAgICAgIGVycm9yVGV4dDogZXJyXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWVzc2FnZS5yZXNwb25kKHtcbiAgICAgICAgcmV0dXJuVmFsdWU6IHRydWVcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG59KTtcblxuLy8gcm1kaXJcbnNlcnZpY2UucmVnaXN0ZXIoXCJybWRpclwiLCBmdW5jdGlvbihtZXNzYWdlKSB7XG4gIHZhciBwYXRoID0gIG1lc3NhZ2UucGF5bG9hZC5wYXRoO1xuXG4gIGZzLnJtZGlyKHBhdGgsIGZ1bmN0aW9uKGVycikge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XG4gICAgICAgIHJldHVyblZhbHVlOiBmYWxzZSxcbiAgICAgICAgZXJyb3JDb2RlOiBcInJtZGlyIEVSUk9SXCIsXG4gICAgICAgIGVycm9yVGV4dDogZXJyXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWVzc2FnZS5yZXNwb25kKHtcbiAgICAgICAgcmV0dXJuVmFsdWU6IHRydWVcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG59KTtcblxuLy8gbW92ZUZpbGVcbnNlcnZpY2UucmVnaXN0ZXIoXCJtb3ZlRmlsZVwiLCBmdW5jdGlvbihtZXNzYWdlKSB7XG4gIHZhciBvcmlnaW5hbFBhdGggPSAgbWVzc2FnZS5wYXlsb2FkLm9yaWdpbmFsUGF0aDtcbiAgdmFyIGRlc3RpbmF0aW9uUGF0aCA9ICBtZXNzYWdlLnBheWxvYWQuZGVzdGluYXRpb25QYXRoO1xuXG4gIGZzLnJlbmFtZShvcmlnaW5hbFBhdGgsIGRlc3RpbmF0aW9uUGF0aCwgZnVuY3Rpb24oZXJyKSB7XG4gICAgaWYgKGVycikge1xuICAgICAgbWVzc2FnZS5yZXNwb25kKHtcbiAgICAgICAgcmV0dXJuVmFsdWU6IGZhbHNlLFxuICAgICAgICBlcnJvckNvZGU6IFwicmVuYW1lIEVSUk9SXCIsXG4gICAgICAgIGVycm9yVGV4dDogZXJyXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWVzc2FnZS5yZXNwb25kKHtcbiAgICAgICAgcmV0dXJuVmFsdWU6IHRydWVcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG59KTtcblxuLy8gcmVhZEZpbGVcbnNlcnZpY2UucmVnaXN0ZXIoXCJyZWFkRmlsZVwiLCBmdW5jdGlvbihtZXNzYWdlKSB7XG4gIHZhciBwYXRoID0gIG1lc3NhZ2UucGF5bG9hZC5wYXRoO1xuICB2YXIgZW5jb2RpbmcgPSBtZXNzYWdlLnBheWxvYWQuZW5jb2Rpbmc7XG5cbiAgZnMucmVhZEZpbGUocGF0aCwgZW5jb2RpbmcsIGZ1bmN0aW9uKGVyciwgZGF0YSkge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XG4gICAgICAgIHJldHVyblZhbHVlOiBmYWxzZSxcbiAgICAgICAgZXJyb3JDb2RlOiBcInJlYWRGaWxlIEVSUk9SXCIsXG4gICAgICAgIGVycm9yVGV4dDogZXJyXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWVzc2FnZS5yZXNwb25kKHtcbiAgICAgICAgcmV0dXJuVmFsdWU6IHRydWUsXG4gICAgICAgIGRhdGE6IGRhdGFcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG59KTtcblxuLy8gcmVtb3ZlRmlsZVxuc2VydmljZS5yZWdpc3RlcihcInJlbW92ZUZpbGVcIiwgZnVuY3Rpb24obWVzc2FnZSkge1xuICB2YXIgcGF0aCA9ICBtZXNzYWdlLnBheWxvYWQucGF0aDtcblxuICBmcy51bmxpbmsocGF0aCwgZnVuY3Rpb24oZXJyKSB7XG4gICAgaWYgKGVycikge1xuICAgICAgbWVzc2FnZS5yZXNwb25kKHtcbiAgICAgICAgcmV0dXJuVmFsdWU6IGZhbHNlLFxuICAgICAgICBlcnJvckNvZGU6IFwicmVtb3ZlRmlsZSBFUlJPUlwiLFxuICAgICAgICBlcnJvclRleHQ6IGVyclxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XG4gICAgICAgIHJldHVyblZhbHVlOiB0cnVlXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xufSk7XG5cbi8vIHVuemlwRmlsZVxuc2VydmljZS5yZWdpc3RlcihcInVuemlwRmlsZVwiLCBmdW5jdGlvbihtZXNzYWdlKSB7XG4gIGNvbnN0IHVuemlwID0gcmVxdWlyZShcInVuemlwXCIpO1xuXG4gIHZhciB6aXBGaWxlUGF0aCA9ICBtZXNzYWdlLnBheWxvYWQuemlwRmlsZVBhdGg7XG4gIHZhciBleHRyYWN0VG9EaXJlY3RvcnlQYXRoID0gIG1lc3NhZ2UucGF5bG9hZC5leHRyYWN0VG9EaXJlY3RvcnlQYXRoO1xuXG4gIC8vIGNyZWF0ZVJlYWRTdHJlYW1cbiAgdmFyIHJlYWRTdHJlYW0gPSBmcy5jcmVhdGVSZWFkU3RyZWFtKHppcEZpbGVQYXRoKTtcblxuICAvLyBFcnJvciBoYW5kbGluZ1xuICByZWFkU3RyZWFtLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24oZXJyKSB7XG4gICAgbWVzc2FnZS5yZXNwb25kKHtcbiAgICAgIHJldHVyblZhbHVlOiBmYWxzZSxcbiAgICAgIGVycm9yQ29kZTogXCJ1bnppcEZpbGUgY3JlYXRlUmVhZFN0cmVhbSBFUlJPUlwiLFxuICAgICAgZXJyb3JUZXh0OiBlcnJcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gRG8gdW56aXAgJiBFbmQgZXZlbnRcbiAgcmVhZFN0cmVhbVxuICAgIC5waXBlKFxuICAgICAgdW56aXAuRXh0cmFjdCh7XG4gICAgICAgIHBhdGg6IGV4dHJhY3RUb0RpcmVjdG9yeVBhdGhcbiAgICAgIH0pXG4gICAgKVxuICAgIC5vbihcImNsb3NlXCIsIGZ1bmN0aW9uKGVycikge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBtZXNzYWdlLnJlc3BvbmQoe1xuICAgICAgICAgIHJldHVyblZhbHVlOiBmYWxzZSxcbiAgICAgICAgICBlcnJvckNvZGU6IFwidW56aXBGaWxlIEV4dHJhY3QgRVJST1JcIixcbiAgICAgICAgICBlcnJvclRleHQ6IGVyclxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XG4gICAgICAgICAgcmV0dXJuVmFsdWU6IHRydWVcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG59KTtcblxuLy8gd3JpdGVGaWxlXG5zZXJ2aWNlLnJlZ2lzdGVyKFwid3JpdGVGaWxlXCIsIGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgdmFyIHBhdGggPSAgbWVzc2FnZS5wYXlsb2FkLnBhdGg7XG4gIHZhciBkYXRhID0gbWVzc2FnZS5wYXlsb2FkLmRhdGE7XG4gIHZhciBlbmNvZGluZyA9IG1lc3NhZ2UucGF5bG9hZC5lbmNvZGluZztcblxuICBmcy53cml0ZUZpbGUocGF0aCwgZGF0YSwgZW5jb2RpbmcsIGZ1bmN0aW9uKGVycikge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XG4gICAgICAgIHJldHVyblZhbHVlOiBmYWxzZSxcbiAgICAgICAgZXJyb3JDb2RlOiBcIndyaXRlRmlsZSBFUlJPUlwiLFxuICAgICAgICBlcnJvclRleHQ6IGVyclxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XG4gICAgICAgIHJldHVyblZhbHVlOiB0cnVlXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xufSkiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=