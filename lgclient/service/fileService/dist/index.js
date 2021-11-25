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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7O0FDN0RBLGVBQWUsbUJBQU8sQ0FBQyxJQUFVO0FBQ2pDLG1CQUFtQixzQ0FBOEI7QUFDakQsY0FBYyxtQkFBTyxDQUFDLElBQVM7QUFDL0IsV0FBVyxtQkFBTyxDQUFDLElBQWU7QUFDbEMsYUFBYSxnQ0FBd0I7O0FBRXJDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBOztBQUVBLGNBQWM7QUFDZDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwyQkFBMkI7QUFDM0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGdEQUFnRDtBQUNoRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQixhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQixhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxrQkFBa0I7QUFDbEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakIsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTs7QUFFQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDRCQUE0QjtBQUM1QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGtDQUFrQztBQUNsQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx3QkFBd0IsaURBQWlEO0FBQ3pFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLG9CQUFvQixrQkFBa0I7QUFDdEM7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0Esb0JBQW9CLGtCQUFrQjtBQUN0QztBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7O0FDNVlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNB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QUMzRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQTtBQUNBLHNCQUFzQixtQ0FBbUM7QUFDekQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBLG9CQUFvQjtBQUNwQixVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBLE1BQU07QUFDTjtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7Ozs7OztBQzVRQSxlQUFlLG1CQUFPLENBQUMsSUFBVTtBQUNqQyxtQkFBbUIsc0NBQThCOztBQUVqRDtBQUNBO0FBQ0Esc0NBQXNDO0FBQ3RDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxzQ0FBc0M7QUFDdEM7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFCQUFxQjtBQUNyQjtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpREFBaUQsa0JBQWtCO0FBQ25FO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsd0NBQXdDO0FBQ3hDOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7O0FDaEpBO0FBQ0E7QUFDQSxvQkFBb0IsZUFBZTtBQUNuQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7Ozs7OztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxlQUFlOztBQUVmO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjs7QUFFakI7QUFDQTtBQUNBO0FBQ0EsY0FBYzs7QUFFZDtBQUNBO0FBQ0E7QUFDQSx5QkFBeUI7O0FBRXpCO0FBQ0E7QUFDQTtBQUNBLGdCQUFnQjs7QUFFaEI7QUFDQTtBQUNBO0FBQ0EsZ0JBQWdCOztBQUVoQjtBQUNBO0FBQ0E7QUFDQSxnQkFBZ0I7O0FBRWhCO0FBQ0E7QUFDQTtBQUNBLG1CQUFtQjs7QUFFbkI7QUFDQTtBQUNBO0FBQ0EsZ0JBQWdCOztBQUVoQjtBQUNBO0FBQ0E7QUFDQSxnQkFBZ0I7O0FBRWhCO0FBQ0E7QUFDQTtBQUNBLGNBQWM7O0FBRWQ7QUFDQTtBQUNBO0FBQ0EsZUFBZTs7QUFFZjtBQUNBO0FBQ0E7QUFDQSxrQkFBa0I7O0FBRWxCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxtQkFBbUI7O0FBRW5CLDREQUFvRDs7QUFFcEQ7QUFDQTtBQUNBOzs7Ozs7OztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsU0FBUyxtQkFBTyxDQUFDLElBQUk7QUFDckI7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsVUFBVSxtQkFBTyxDQUFDLElBQVU7O0FBRTVCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7OztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLGlCQUFpQixtQkFBTyxDQUFDLElBQU07QUFDL0I7QUFDQSxTQUFTLG1CQUFPLENBQUMsSUFBSTs7QUFFckI7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0Esb0JBQW9CO0FBQ3BCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEVBQUU7QUFDRjtBQUNBOztBQUVBO0FBQ0E7QUFDQSwwQ0FBMEMsRUFBRTtBQUM1QyxFQUFFO0FBQ0Y7QUFDQTs7QUFFQSxvQkFBb0I7QUFDcEI7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxvQkFBb0I7QUFDcEI7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7OztBQUdBLGdCQUFnQjtBQUNoQjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLG9CQUFvQjtBQUNwQjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUCxNQUFNO0FBQ047QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUCxLQUFLO0FBQ0w7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7O0FDOVNBLDRDQUErQztBQUMvQywwQ0FBMkM7QUFDM0MseUNBQTJDOztBQUUzQyxZQUFZO0FBQ1osSUFBSSxRQUFRLG1CQUFPLENBQUMsSUFBc0I7QUFDMUMsWUFBWSxtQkFBTyxDQUFDLElBQXNCOztBQUUxQyxXQUFXO0FBQ1gsSUFBSSxTQUFTLG1CQUFPLENBQUMsSUFBcUI7QUFDMUMsYUFBYSxtQkFBTyxDQUFDLElBQXFCOztBQUUxQyxZQUFZO0FBQ1osSUFBSSxTQUFTLG1CQUFPLENBQUMsSUFBc0I7QUFDM0MsYUFBYSxtQkFBTyxDQUFDLElBQXNCOztBQUUzQyxhQUFhO0FBQ2IsSUFBSSxTQUFTLG1CQUFPLENBQUMsSUFBdUI7QUFDNUMsYUFBYSxtQkFBTyxDQUFDLElBQXVCOztBQUU1QyxrQkFBa0IsR0FBRyxpQkFBaUI7QUFDdEMsbUJBQW1CLEdBQUcsa0JBQWtCO0FBQ3hDLG1CQUFtQixHQUFHLGtCQUFrQjtBQUN4QyxvQkFBb0IsR0FBRyxtQkFBbUI7O0FBRTFDLGtCQUFrQixHQUFHLGlCQUFpQjtBQUN0QyxtQkFBbUIsR0FBRyxrQkFBa0I7QUFDeEMsbUJBQW1CLEdBQUcsa0JBQWtCO0FBQ3hDLG9CQUFvQixHQUFHLG1CQUFtQjs7QUFFMUMsMkNBQTZDOzs7Ozs7OztBQzlCN0M7O0FBRUE7O0FBRUEsYUFBYSxnQ0FBd0I7QUFDckMsZUFBZSxtQkFBTyxDQUFDLElBQVU7O0FBRWpDO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQTs7Ozs7Ozs7QUNwRkE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBbUM7QUFDbkM7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxPQUFPOztBQUVQO0FBQ0E7O0FBRUE7QUFDQSxJQUFJO0FBQ0o7Ozs7Ozs7O0FDbEVBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQSxTQUFTLG1CQUFPLENBQUMsSUFBYTtBQUM5QixjQUFjLG1CQUFPLENBQUMsSUFBZTtBQUNyQztBQUNBLGVBQWUsbUJBQU8sQ0FBQyxJQUFVO0FBQ2pDLFlBQVksbUJBQU8sQ0FBQyxJQUFRO0FBQzVCLFdBQVcsbUJBQU8sQ0FBQyxJQUFNO0FBQ3pCLGFBQWEsbUJBQU8sQ0FBQyxJQUFhO0FBQ2xDLGFBQWEsNEJBQW9COztBQUVqQzs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBLEtBQUs7O0FBRUw7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUjtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUjtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUCxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLElBQUk7QUFDSjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7QUMxUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQSxTQUFTLG1CQUFPLENBQUMsSUFBYTtBQUM5QixjQUFjLG1CQUFPLENBQUMsSUFBZTtBQUNyQyxhQUFhLG1CQUFPLENBQUMsR0FBYTtBQUNsQyxlQUFlLG1CQUFPLENBQUMsSUFBVTtBQUNqQyxZQUFZLG1CQUFPLENBQUMsSUFBUTtBQUM1QixXQUFXLG1CQUFPLENBQUMsSUFBTTtBQUN6QixjQUFjLG1CQUFPLENBQUMsSUFBYzs7QUFFcEM7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUk7O0FBRUo7O0FBRUE7QUFDQSxnQkFBZ0I7QUFDaEI7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7QUMxS0E7O0FBRUE7O0FBRUEsU0FBUyxtQkFBTyxDQUFDLElBQWE7QUFDOUIsY0FBYyxtQkFBTyxDQUFDLElBQWU7QUFDckM7QUFDQSxlQUFlLG1CQUFPLENBQUMsSUFBVTtBQUNqQyxZQUFZLG1CQUFPLENBQUMsSUFBUTtBQUM1QixhQUFhLG1CQUFPLENBQUMsSUFBYTtBQUNsQyxXQUFXO0FBQ1gsYUFBYTs7QUFFYjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTixHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG9DQUFvQyxPQUFPO0FBQzNDO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7OztBQ2xKQTs7QUFFQSxTQUFTLG1CQUFPLENBQUMsSUFBYTtBQUM5QixZQUFZLG1CQUFPLENBQUMsSUFBUTtBQUM1QixhQUFhLG1CQUFPLENBQUMsR0FBYTtBQUNsQyxlQUFlLG1CQUFPLENBQUMsSUFBVTtBQUNqQzs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVILHVDQUF1QyxrQkFBa0I7O0FBRXpEO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7O0FDdkdBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsb0NBQW9DLE9BQU87QUFDM0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBLHNCQUFzQixtQkFBbUI7QUFDekM7O0FBRUE7O0FBRUEsU0FBUyxtQkFBTyxDQUFDLElBQWE7QUFDOUIsY0FBYyxtQkFBTyxDQUFDLElBQWU7QUFDckMsZUFBZSxtQkFBTyxDQUFDLElBQVU7QUFDakMsWUFBWSxtQkFBTyxDQUFDLElBQVE7QUFDNUIsYUFBYSxtQkFBTyxDQUFDLElBQWE7O0FBRWxDOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7QUNwREE7O0FBRUEsU0FBUyxtQkFBTyxDQUFDLElBQWE7QUFDOUIsYUFBYSxtQkFBTyxDQUFDLEdBQWE7QUFDbEMsZUFBZSxtQkFBTyxDQUFDLElBQVU7QUFDakMsV0FBVyxtQkFBTyxDQUFDLElBQU07QUFDekIsYUFBYSxtQkFBTyxDQUFDLEdBQVE7O0FBRTdCOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBLEdBQUc7QUFDSDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7O0FDOUZBO0FBQ0E7O0FBRUE7O0FBRUEsYUFBYSxtQkFBTyxDQUFDLElBQWE7QUFDbEMsY0FBYyxtQkFBTyxDQUFDLElBQWU7QUFDckMsZUFBZSxtQkFBTyxDQUFDLElBQVU7QUFDakMsU0FBUyxtQkFBTyxDQUFDLElBQWE7O0FBRTlCOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7Ozs7Ozs7O0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQSxhQUFhLG1CQUFPLENBQUMsR0FBYTtBQUNsQyxjQUFjLG1CQUFPLENBQUMsSUFBZTtBQUNyQyxlQUFlLG1CQUFPLENBQUMsSUFBVTtBQUNqQyxjQUFjLG1CQUFPLENBQUMsSUFBYztBQUNwQyxTQUFTLG1CQUFPLENBQUMsSUFBSTs7QUFFckI7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7QUMzR0E7O0FBRUEsU0FBUyxtQkFBTyxDQUFDLElBQWE7QUFDOUIsYUFBYSxnQ0FBd0I7QUFDckMsZUFBZSxtQkFBTyxDQUFDLElBQVU7QUFDakMsV0FBVyxtQkFBTyxDQUFDLElBQU07QUFDekIsY0FBYyxtQkFBTyxDQUFDLElBQWU7QUFDckM7QUFDQSxlQUFlLG1CQUFPLENBQUMsSUFBZTs7QUFFdEM7QUFDQTs7QUFFQSxnQkFBZ0IsbUJBQU8sQ0FBQyxJQUFpQjtBQUN6QyxpQkFBaUIsbUJBQU8sQ0FBQyxJQUFrQjtBQUMzQyxpQkFBaUIsbUJBQU8sQ0FBQyxJQUFrQjtBQUMzQyxtQkFBbUIsbUJBQU8sQ0FBQyxFQUFvQjtBQUMvQyxrQkFBa0IsbUJBQU8sQ0FBQyxJQUFtQjs7QUFFN0M7QUFDQTtBQUNBOztBQUVBO0FBQ0EsY0FBYztBQUNkOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxLQUFLOztBQUVMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7Ozs7Ozs7QUNwUUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUEsU0FBUyxtQkFBTyxDQUFDLElBQWE7QUFDOUIsY0FBYyxtQkFBTyxDQUFDLElBQWU7QUFDckMsZUFBZSxtQkFBTyxDQUFDLElBQVU7QUFDakMsWUFBWSxtQkFBTyxDQUFDLElBQVE7QUFDNUIsYUFBYSxtQkFBTyxDQUFDLElBQWE7O0FBRWxDOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7OztBQ3BDQTs7QUFFQSxTQUFTLG1CQUFPLENBQUMsSUFBYTtBQUM5QixlQUFlLG1CQUFPLENBQUMsSUFBVTtBQUNqQyxhQUFhLG1CQUFPLENBQUMsR0FBUTtBQUM3QixZQUFZLG1CQUFPLENBQUMsSUFBUTtBQUM1QixXQUFXLG1CQUFPLENBQUMsSUFBTTtBQUN6QjtBQUNBLGNBQWMsbUJBQU8sQ0FBQyxJQUFlO0FBQ3JDLGVBQWUsbUJBQU8sQ0FBQyxJQUFlOztBQUV0QztBQUNBOztBQUVBO0FBQ0E7O0FBRUEsZ0JBQWdCLG1CQUFPLENBQUMsSUFBaUI7QUFDekMsaUJBQWlCLG1CQUFPLENBQUMsSUFBa0I7QUFDM0MsaUJBQWlCLG1CQUFPLENBQUMsSUFBa0I7QUFDM0Msa0JBQWtCLG1CQUFPLENBQUMsSUFBbUI7O0FBRTdDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxjQUFjO0FBQ2Q7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxjQUFjLGlCQUFpQjtBQUMvQjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYLFNBQVM7QUFDVCxPQUFPO0FBQ1A7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsSUFBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSxJQUFJO0FBQ0osNkNBQTZDO0FBQzdDO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QTtBQUNBO0FBQ0Esa0JBQWtCLFNBQVM7QUFDM0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxvQkFBb0Isb0JBQW9CO0FBQ3hDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUEsa0JBQWtCLFNBQVM7QUFDM0I7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUCxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOzs7Ozs7OztBQ2x4QkE7QUFDQTs7QUFFQSxTQUFTLG1CQUFPLENBQUMsSUFBYTtBQUM5QixnQkFBZ0IsbUJBQU8sQ0FBQyxJQUFXO0FBQ25DO0FBQ0EsV0FBVyw4QkFBeUI7QUFDcEMsV0FBVyxtQkFBTyxDQUFDLElBQU07QUFDekIsV0FBVyxtQkFBTyxDQUFDLElBQU07QUFDekIsYUFBYSxtQkFBTyxDQUFDLElBQVE7QUFDN0IsaUJBQWlCLG1CQUFPLENBQUMsSUFBa0I7QUFDM0MsYUFBYSxtQkFBTyxDQUFDLElBQWE7QUFDbEM7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0Esa0JBQWtCLE9BQU87QUFDekI7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0Esa0JBQWtCLG9CQUFvQjtBQUN0QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUEsb0JBQW9CLFNBQVM7QUFDN0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxrQkFBa0IsU0FBUztBQUMzQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0JBQW9CLG9CQUFvQjtBQUN4QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBLGtCQUFrQixTQUFTO0FBQzNCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFF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QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQSxNQUFNO0FBQ04sTUFBTTtBQUNOO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxLQUFLLElBQUk7QUFDVCxLQUFLLEdBQUc7QUFDUixLQUFLLEtBQUs7QUFDVixLQUFLLElBQUksSUFBSSxFQUFFO0FBQ2YsS0FBSyxJQUFJLEVBQUUsSUFBSTtBQUNmO0FBQ0E7QUFDQSxLQUFLLElBQUksT0FBTyxJQUFJO0FBQ3BCLEtBQUssRUFBRSxPQUFPLEVBQUU7QUFDaEI7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLHNCQUFzQixJQUFJO0FBQzFCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxvQ0FBb0MsSUFBSTtBQUN4QztBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLE1BQU07QUFDTixNQUFNO0FBQ047O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsWUFBWTtBQUNaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQSxNQUFNO0FBQ04sSUFBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0NBQW9DLElBQUk7QUFDeEM7QUFDQTtBQUNBO0FBQ0EsZ0NBQWdDLEVBQUUsRUFBRSxLQUFLO0FBQ3pDO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHlDQUF5QyxRQUFRO0FBQ2pEOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnQkFBZ0Isc0JBQXNCO0FBQ3RDO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLDZDQUE2QztBQUM3Qzs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMLEdBQUc7O0FBRUg7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EseUJBQXlCLFFBQVE7QUFDakM7QUFDQTtBQUNBOztBQUVBLGNBQWMsZ0JBQWdCO0FBQzlCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLE1BQU0sNENBQTRDOztBQUVsRDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUixRQUFRO0FBQ1I7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxlQUFlLFNBQVM7QUFDeEI7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Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGtCQUFrQix5QkFBeUI7QUFDM0M7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7QUMzT2E7O0FBRWI7QUFDQTtBQUNBOztBQUVB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OztBQUVBO0FBQ0E7QUFDQTtBQUNBLG9CQUFvQixnREFBd0M7QUFDNUQ7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBLG9CQUFvQixRQUFRO0FBQzVCO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLG9CQUFvQixTQUFTO0FBQzdCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNB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Q0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1AsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBOztBQUVBLGtCQUFrQix5QkFBeUI7QUFDM0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxTQUFTLE9BQU87QUFDaEI7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7OztBQzVOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxvQkFBb0IsZUFBZTtBQUNuQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLG9CQUFvQixtQkFBbUI7QUFDdkM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0wsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1AsTUFBTTtBQUNOO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxHQUFHO0FBQ0gsQ0FBQzs7QUFFRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMLEdBQUc7QUFDSCxDQUFDOztBQUVEO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1AsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBLEdBQUc7QUFDSCxDQUFDOztBQUVEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQLE1BQU07QUFDTjtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNILENBQUM7O0FBRUQ7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUCxNQUFNO0FBQ047QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBLEdBQUc7QUFDSCxDQUFDOztBQUVEO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUCxNQUFNO0FBQ047QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBLEdBQUc7QUFDSCxDQUFDOztBQUVEO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUCxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNILENBQUM7O0FBRUQ7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUCxNQUFNO0FBQ047QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBLEdBQUc7QUFDSCxDQUFDOztBQUVEO0FBQ0E7QUFDQSxnQkFBZ0IsbUJBQU8sQ0FBQyxJQUFPOztBQUUvQjtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVCxRQUFRO0FBQ1I7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBLEtBQUs7QUFDTCxDQUFDOztBQUVEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQLE1BQU07QUFDTjtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRztBQUNILENBQUMsQyIsInNvdXJjZXMiOlsid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvYmFsYW5jZWQtbWF0Y2gvaW5kZXguanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9iaW5hcnkvaW5kZXguanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9iaW5hcnkvbGliL3ZhcnMuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9icmFjZS1leHBhbnNpb24vaW5kZXguanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9idWZmZXJzL2luZGV4LmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvY2hhaW5zYXcvaW5kZXguanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9jb25jYXQtbWFwL2luZGV4LmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvY29yZS11dGlsLWlzL2xpYi91dGlsLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZnMucmVhbHBhdGgvaW5kZXguanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9mcy5yZWFscGF0aC9vbGQuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9mc3RyZWFtL2ZzdHJlYW0uanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9mc3RyZWFtL2xpYi9hYnN0cmFjdC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2ZzdHJlYW0vbGliL2NvbGxlY3QuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9mc3RyZWFtL2xpYi9kaXItcmVhZGVyLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZnN0cmVhbS9saWIvZGlyLXdyaXRlci5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2ZzdHJlYW0vbGliL2ZpbGUtcmVhZGVyLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZnN0cmVhbS9saWIvZmlsZS13cml0ZXIuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9mc3RyZWFtL2xpYi9nZXQtdHlwZS5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2ZzdHJlYW0vbGliL2xpbmstcmVhZGVyLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZnN0cmVhbS9saWIvbGluay13cml0ZXIuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9mc3RyZWFtL2xpYi9wcm94eS1yZWFkZXIuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9mc3RyZWFtL2xpYi9wcm94eS13cml0ZXIuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9mc3RyZWFtL2xpYi9yZWFkZXIuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9mc3RyZWFtL2xpYi9zb2NrZXQtcmVhZGVyLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZnN0cmVhbS9saWIvd3JpdGVyLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZnN0cmVhbS9ub2RlX21vZHVsZXMvZ3JhY2VmdWwtZnMvZnMuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9mc3RyZWFtL25vZGVfbW9kdWxlcy9ncmFjZWZ1bC1mcy9ncmFjZWZ1bC1mcy5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2ZzdHJlYW0vbm9kZV9tb2R1bGVzL2dyYWNlZnVsLWZzL3BvbHlmaWxscy5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2dsb2IvY29tbW9uLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZ2xvYi9nbG9iLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvZ2xvYi9zeW5jLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvaW5mbGlnaHQvaW5mbGlnaHQuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0cy5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9pc2FycmF5L2luZGV4LmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvbWF0Y2gtc3RyZWFtL21hdGNoLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvbWluaW1hdGNoL21pbmltYXRjaC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL21rZGlycC9pbmRleC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL25hdGl2ZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9uYXRpdmVzfHN5bmMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9vbmNlL29uY2UuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9vdmVyL292ZXJsb2FkLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvcGF0aC1pcy1hYnNvbHV0ZS9pbmRleC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL3B1bGxzdHJlYW0vcHVsbHN0cmVhbS5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9saWIvX3N0cmVhbV9kdXBsZXguanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vbGliL19zdHJlYW1fcGFzc3Rocm91Z2guanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vbGliL19zdHJlYW1fcmVhZGFibGUuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vbGliL19zdHJlYW1fdHJhbnNmb3JtLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvcmVhZGFibGUtc3RyZWFtL2xpYi9fc3RyZWFtX3dyaXRhYmxlLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvcmVhZGFibGUtc3RyZWFtL3Bhc3N0aHJvdWdoLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvcmVhZGFibGUtc3RyZWFtL3RyYW5zZm9ybS5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS93cml0YWJsZS5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL3JpbXJhZi9yaW1yYWYuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy9zZXRpbW1lZGlhdGUvc2V0SW1tZWRpYXRlLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvc2xpY2Utc3RyZWFtL3NsaWNlc3RyZWFtLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvc3RyaW5nX2RlY29kZXIvaW5kZXguanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy90cmF2ZXJzZS9pbmRleC5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL3VuemlwL2xpYi9lbnRyeS5qcyIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlLy4vbm9kZV9tb2R1bGVzL3VuemlwL2xpYi9leHRyYWN0LmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvdW56aXAvbGliL3BhcnNlLmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvLi9ub2RlX21vZHVsZXMvdW56aXAvdW56aXAuanMiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL25vZGVfbW9kdWxlcy93cmFwcHkvd3JhcHB5LmpzIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvZXh0ZXJuYWwgbm9kZS1jb21tb25qcyBcImFzc2VydFwiIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvZXh0ZXJuYWwgbm9kZS1jb21tb25qcyBcImJ1ZmZlclwiIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvZXh0ZXJuYWwgbm9kZS1jb21tb25qcyBcImNvbnN0YW50c1wiIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvZXh0ZXJuYWwgbm9kZS1jb21tb25qcyBcImV2ZW50c1wiIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvZXh0ZXJuYWwgbm9kZS1jb21tb25qcyBcImZzXCIiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS9leHRlcm5hbCBub2RlLWNvbW1vbmpzIFwibW9kdWxlXCIiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS9leHRlcm5hbCBub2RlLWNvbW1vbmpzIFwicGF0aFwiIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvZXh0ZXJuYWwgbm9kZS1jb21tb25qcyBcInN0cmVhbVwiIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvZXh0ZXJuYWwgbm9kZS1jb21tb25qcyBcInV0aWxcIiIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJ2OFwiIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvZXh0ZXJuYWwgbm9kZS1jb21tb25qcyBcInZtXCIiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS9leHRlcm5hbCBub2RlLWNvbW1vbmpzIFwiemxpYlwiIiwid2VicGFjazovL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvZXh0ZXJuYWwgdmFyIFwicmVxdWlyZShcXFwid2Vib3Mtc2VydmljZVxcXCIpXCIiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlL3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS8uL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gYmFsYW5jZWQ7XG5mdW5jdGlvbiBiYWxhbmNlZChhLCBiLCBzdHIpIHtcbiAgaWYgKGEgaW5zdGFuY2VvZiBSZWdFeHApIGEgPSBtYXliZU1hdGNoKGEsIHN0cik7XG4gIGlmIChiIGluc3RhbmNlb2YgUmVnRXhwKSBiID0gbWF5YmVNYXRjaChiLCBzdHIpO1xuXG4gIHZhciByID0gcmFuZ2UoYSwgYiwgc3RyKTtcblxuICByZXR1cm4gciAmJiB7XG4gICAgc3RhcnQ6IHJbMF0sXG4gICAgZW5kOiByWzFdLFxuICAgIHByZTogc3RyLnNsaWNlKDAsIHJbMF0pLFxuICAgIGJvZHk6IHN0ci5zbGljZShyWzBdICsgYS5sZW5ndGgsIHJbMV0pLFxuICAgIHBvc3Q6IHN0ci5zbGljZShyWzFdICsgYi5sZW5ndGgpXG4gIH07XG59XG5cbmZ1bmN0aW9uIG1heWJlTWF0Y2gocmVnLCBzdHIpIHtcbiAgdmFyIG0gPSBzdHIubWF0Y2gocmVnKTtcbiAgcmV0dXJuIG0gPyBtWzBdIDogbnVsbDtcbn1cblxuYmFsYW5jZWQucmFuZ2UgPSByYW5nZTtcbmZ1bmN0aW9uIHJhbmdlKGEsIGIsIHN0cikge1xuICB2YXIgYmVncywgYmVnLCBsZWZ0LCByaWdodCwgcmVzdWx0O1xuICB2YXIgYWkgPSBzdHIuaW5kZXhPZihhKTtcbiAgdmFyIGJpID0gc3RyLmluZGV4T2YoYiwgYWkgKyAxKTtcbiAgdmFyIGkgPSBhaTtcblxuICBpZiAoYWkgPj0gMCAmJiBiaSA+IDApIHtcbiAgICBpZihhPT09Yikge1xuICAgICAgcmV0dXJuIFthaSwgYmldO1xuICAgIH1cbiAgICBiZWdzID0gW107XG4gICAgbGVmdCA9IHN0ci5sZW5ndGg7XG5cbiAgICB3aGlsZSAoaSA+PSAwICYmICFyZXN1bHQpIHtcbiAgICAgIGlmIChpID09IGFpKSB7XG4gICAgICAgIGJlZ3MucHVzaChpKTtcbiAgICAgICAgYWkgPSBzdHIuaW5kZXhPZihhLCBpICsgMSk7XG4gICAgICB9IGVsc2UgaWYgKGJlZ3MubGVuZ3RoID09IDEpIHtcbiAgICAgICAgcmVzdWx0ID0gWyBiZWdzLnBvcCgpLCBiaSBdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYmVnID0gYmVncy5wb3AoKTtcbiAgICAgICAgaWYgKGJlZyA8IGxlZnQpIHtcbiAgICAgICAgICBsZWZ0ID0gYmVnO1xuICAgICAgICAgIHJpZ2h0ID0gYmk7XG4gICAgICAgIH1cblxuICAgICAgICBiaSA9IHN0ci5pbmRleE9mKGIsIGkgKyAxKTtcbiAgICAgIH1cblxuICAgICAgaSA9IGFpIDwgYmkgJiYgYWkgPj0gMCA/IGFpIDogYmk7XG4gICAgfVxuXG4gICAgaWYgKGJlZ3MubGVuZ3RoKSB7XG4gICAgICByZXN1bHQgPSBbIGxlZnQsIHJpZ2h0IF07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cbiIsInZhciBDaGFpbnNhdyA9IHJlcXVpcmUoJ2NoYWluc2F3Jyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xudmFyIEJ1ZmZlcnMgPSByZXF1aXJlKCdidWZmZXJzJyk7XG52YXIgVmFycyA9IHJlcXVpcmUoJy4vbGliL3ZhcnMuanMnKTtcbnZhciBTdHJlYW0gPSByZXF1aXJlKCdzdHJlYW0nKS5TdHJlYW07XG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChidWZPckVtLCBldmVudE5hbWUpIHtcbiAgICBpZiAoQnVmZmVyLmlzQnVmZmVyKGJ1Zk9yRW0pKSB7XG4gICAgICAgIHJldHVybiBleHBvcnRzLnBhcnNlKGJ1Zk9yRW0pO1xuICAgIH1cbiAgICBcbiAgICB2YXIgcyA9IGV4cG9ydHMuc3RyZWFtKCk7XG4gICAgaWYgKGJ1Zk9yRW0gJiYgYnVmT3JFbS5waXBlKSB7XG4gICAgICAgIGJ1Zk9yRW0ucGlwZShzKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoYnVmT3JFbSkge1xuICAgICAgICBidWZPckVtLm9uKGV2ZW50TmFtZSB8fCAnZGF0YScsIGZ1bmN0aW9uIChidWYpIHtcbiAgICAgICAgICAgIHMud3JpdGUoYnVmKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBidWZPckVtLm9uKCdlbmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzLmVuZCgpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHM7XG59O1xuXG5leHBvcnRzLnN0cmVhbSA9IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgIGlmIChpbnB1dCkgcmV0dXJuIGV4cG9ydHMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICBcbiAgICB2YXIgcGVuZGluZyA9IG51bGw7XG4gICAgZnVuY3Rpb24gZ2V0Qnl0ZXMgKGJ5dGVzLCBjYiwgc2tpcCkge1xuICAgICAgICBwZW5kaW5nID0ge1xuICAgICAgICAgICAgYnl0ZXMgOiBieXRlcyxcbiAgICAgICAgICAgIHNraXAgOiBza2lwLFxuICAgICAgICAgICAgY2IgOiBmdW5jdGlvbiAoYnVmKSB7XG4gICAgICAgICAgICAgICAgcGVuZGluZyA9IG51bGw7XG4gICAgICAgICAgICAgICAgY2IoYnVmKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgICAgIGRpc3BhdGNoKCk7XG4gICAgfVxuICAgIFxuICAgIHZhciBvZmZzZXQgPSBudWxsO1xuICAgIGZ1bmN0aW9uIGRpc3BhdGNoICgpIHtcbiAgICAgICAgaWYgKCFwZW5kaW5nKSB7XG4gICAgICAgICAgICBpZiAoY2F1Z2h0RW5kKSBkb25lID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHBlbmRpbmcgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHBlbmRpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBieXRlcyA9IG9mZnNldCArIHBlbmRpbmcuYnl0ZXM7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChidWZmZXJzLmxlbmd0aCA+PSBieXRlcykge1xuICAgICAgICAgICAgICAgIHZhciBidWY7XG4gICAgICAgICAgICAgICAgaWYgKG9mZnNldCA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1ZiA9IGJ1ZmZlcnMuc3BsaWNlKDAsIGJ5dGVzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwZW5kaW5nLnNraXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZiA9IGJ1Zi5zbGljZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXBlbmRpbmcuc2tpcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmID0gYnVmZmVycy5zbGljZShvZmZzZXQsIGJ5dGVzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBvZmZzZXQgPSBieXRlcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHBlbmRpbmcuc2tpcCkge1xuICAgICAgICAgICAgICAgICAgICBwZW5kaW5nLmNiKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwZW5kaW5nLmNiKGJ1Zik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIGZ1bmN0aW9uIGJ1aWxkZXIgKHNhdykge1xuICAgICAgICBmdW5jdGlvbiBuZXh0ICgpIHsgaWYgKCFkb25lKSBzYXcubmV4dCgpIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBzZWxmID0gd29yZHMoZnVuY3Rpb24gKGJ5dGVzLCBjYikge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgZ2V0Qnl0ZXMoYnl0ZXMsIGZ1bmN0aW9uIChidWYpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFycy5zZXQobmFtZSwgY2IoYnVmKSk7XG4gICAgICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgc2VsZi50YXAgPSBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgICAgIHNhdy5uZXN0KGNiLCB2YXJzLnN0b3JlKTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHNlbGYuaW50byA9IGZ1bmN0aW9uIChrZXksIGNiKSB7XG4gICAgICAgICAgICBpZiAoIXZhcnMuZ2V0KGtleSkpIHZhcnMuc2V0KGtleSwge30pO1xuICAgICAgICAgICAgdmFyIHBhcmVudCA9IHZhcnM7XG4gICAgICAgICAgICB2YXJzID0gVmFycyhwYXJlbnQuZ2V0KGtleSkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBzYXcubmVzdChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY2IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRhcChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhcnMgPSBwYXJlbnQ7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCB2YXJzLnN0b3JlKTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHNlbGYuZmx1c2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXJzLnN0b3JlID0ge307XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBzZWxmLmxvb3AgPSBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgICAgIHZhciBlbmQgPSBmYWxzZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2F3Lm5lc3QoZmFsc2UsIGZ1bmN0aW9uIGxvb3AgKCkge1xuICAgICAgICAgICAgICAgIHRoaXMudmFycyA9IHZhcnMuc3RvcmU7XG4gICAgICAgICAgICAgICAgY2IuY2FsbCh0aGlzLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGVuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgICAgICB9LCB2YXJzLnN0b3JlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRhcChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbmQpIHNhdy5uZXh0KClcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBsb29wLmNhbGwodGhpcylcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgfSwgdmFycy5zdG9yZSk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBzZWxmLmJ1ZmZlciA9IGZ1bmN0aW9uIChuYW1lLCBieXRlcykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBieXRlcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICBieXRlcyA9IHZhcnMuZ2V0KGJ5dGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZ2V0Qnl0ZXMoYnl0ZXMsIGZ1bmN0aW9uIChidWYpIHtcbiAgICAgICAgICAgICAgICB2YXJzLnNldChuYW1lLCBidWYpO1xuICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgc2VsZi5za2lwID0gZnVuY3Rpb24gKGJ5dGVzKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGJ5dGVzID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGJ5dGVzID0gdmFycy5nZXQoYnl0ZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBnZXRCeXRlcyhieXRlcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgc2VsZi5zY2FuID0gZnVuY3Rpb24gZmluZCAobmFtZSwgc2VhcmNoKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNlYXJjaCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICBzZWFyY2ggPSBuZXcgQnVmZmVyKHNlYXJjaCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICghQnVmZmVyLmlzQnVmZmVyKHNlYXJjaCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3NlYXJjaCBtdXN0IGJlIGEgQnVmZmVyIG9yIGEgc3RyaW5nJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciB0YWtlbiA9IDA7XG4gICAgICAgICAgICBwZW5kaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBwb3MgPSBidWZmZXJzLmluZGV4T2Yoc2VhcmNoLCBvZmZzZXQgKyB0YWtlbik7XG4gICAgICAgICAgICAgICAgdmFyIGkgPSBwb3Mtb2Zmc2V0LXRha2VuO1xuICAgICAgICAgICAgICAgIGlmIChwb3MgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHBlbmRpbmcgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBpZiAob2Zmc2V0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcnMuc2V0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVycy5zbGljZShvZmZzZXQsIG9mZnNldCArIHRha2VuICsgaSlcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQgKz0gdGFrZW4gKyBpICsgc2VhcmNoLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcnMuc2V0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVycy5zbGljZSgwLCB0YWtlbiArIGkpXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVycy5zcGxpY2UoMCwgdGFrZW4gKyBpICsgc2VhcmNoLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICAgICAgICBkaXNwYXRjaCgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGkgPSBNYXRoLm1heChidWZmZXJzLmxlbmd0aCAtIHNlYXJjaC5sZW5ndGggLSBvZmZzZXQgLSB0YWtlbiwgMCk7XG5cdFx0XHRcdH1cbiAgICAgICAgICAgICAgICB0YWtlbiArPSBpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGRpc3BhdGNoKCk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBzZWxmLnBlZWsgPSBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgICAgIG9mZnNldCA9IDA7XG4gICAgICAgICAgICBzYXcubmVzdChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY2IuY2FsbCh0aGlzLCB2YXJzLnN0b3JlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRhcChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIG9mZnNldCA9IG51bGw7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgIH07XG4gICAgXG4gICAgdmFyIHN0cmVhbSA9IENoYWluc2F3LmxpZ2h0KGJ1aWxkZXIpO1xuICAgIHN0cmVhbS53cml0YWJsZSA9IHRydWU7XG4gICAgXG4gICAgdmFyIGJ1ZmZlcnMgPSBCdWZmZXJzKCk7XG4gICAgXG4gICAgc3RyZWFtLndyaXRlID0gZnVuY3Rpb24gKGJ1Zikge1xuICAgICAgICBidWZmZXJzLnB1c2goYnVmKTtcbiAgICAgICAgZGlzcGF0Y2goKTtcbiAgICB9O1xuICAgIFxuICAgIHZhciB2YXJzID0gVmFycygpO1xuICAgIFxuICAgIHZhciBkb25lID0gZmFsc2UsIGNhdWdodEVuZCA9IGZhbHNlO1xuICAgIHN0cmVhbS5lbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNhdWdodEVuZCA9IHRydWU7XG4gICAgfTtcbiAgICBcbiAgICBzdHJlYW0ucGlwZSA9IFN0cmVhbS5wcm90b3R5cGUucGlwZTtcbiAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhFdmVudEVtaXR0ZXIucHJvdG90eXBlKS5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHN0cmVhbVtuYW1lXSA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGVbbmFtZV07XG4gICAgfSk7XG4gICAgXG4gICAgcmV0dXJuIHN0cmVhbTtcbn07XG5cbmV4cG9ydHMucGFyc2UgPSBmdW5jdGlvbiBwYXJzZSAoYnVmZmVyKSB7XG4gICAgdmFyIHNlbGYgPSB3b3JkcyhmdW5jdGlvbiAoYnl0ZXMsIGNiKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgaWYgKG9mZnNldCArIGJ5dGVzIDw9IGJ1ZmZlci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB2YXIgYnVmID0gYnVmZmVyLnNsaWNlKG9mZnNldCwgb2Zmc2V0ICsgYnl0ZXMpO1xuICAgICAgICAgICAgICAgIG9mZnNldCArPSBieXRlcztcbiAgICAgICAgICAgICAgICB2YXJzLnNldChuYW1lLCBjYihidWYpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhcnMuc2V0KG5hbWUsIG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH07XG4gICAgfSk7XG4gICAgXG4gICAgdmFyIG9mZnNldCA9IDA7XG4gICAgdmFyIHZhcnMgPSBWYXJzKCk7XG4gICAgc2VsZi52YXJzID0gdmFycy5zdG9yZTtcbiAgICBcbiAgICBzZWxmLnRhcCA9IGZ1bmN0aW9uIChjYikge1xuICAgICAgICBjYi5jYWxsKHNlbGYsIHZhcnMuc3RvcmUpO1xuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICB9O1xuICAgIFxuICAgIHNlbGYuaW50byA9IGZ1bmN0aW9uIChrZXksIGNiKSB7XG4gICAgICAgIGlmICghdmFycy5nZXQoa2V5KSkge1xuICAgICAgICAgICAgdmFycy5zZXQoa2V5LCB7fSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhcmVudCA9IHZhcnM7XG4gICAgICAgIHZhcnMgPSBWYXJzKHBhcmVudC5nZXQoa2V5KSk7XG4gICAgICAgIGNiLmNhbGwoc2VsZiwgdmFycy5zdG9yZSk7XG4gICAgICAgIHZhcnMgPSBwYXJlbnQ7XG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgIH07XG4gICAgXG4gICAgc2VsZi5sb29wID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgIHZhciBlbmQgPSBmYWxzZTtcbiAgICAgICAgdmFyIGVuZGVyID0gZnVuY3Rpb24gKCkgeyBlbmQgPSB0cnVlIH07XG4gICAgICAgIHdoaWxlIChlbmQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBjYi5jYWxsKHNlbGYsIGVuZGVyLCB2YXJzLnN0b3JlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICB9O1xuICAgIFxuICAgIHNlbGYuYnVmZmVyID0gZnVuY3Rpb24gKG5hbWUsIHNpemUpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBzaXplID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgc2l6ZSA9IHZhcnMuZ2V0KHNpemUpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBidWYgPSBidWZmZXIuc2xpY2Uob2Zmc2V0LCBNYXRoLm1pbihidWZmZXIubGVuZ3RoLCBvZmZzZXQgKyBzaXplKSk7XG4gICAgICAgIG9mZnNldCArPSBzaXplO1xuICAgICAgICB2YXJzLnNldChuYW1lLCBidWYpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfTtcbiAgICBcbiAgICBzZWxmLnNraXAgPSBmdW5jdGlvbiAoYnl0ZXMpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBieXRlcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGJ5dGVzID0gdmFycy5nZXQoYnl0ZXMpO1xuICAgICAgICB9XG4gICAgICAgIG9mZnNldCArPSBieXRlcztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgIH07XG4gICAgXG4gICAgc2VsZi5zY2FuID0gZnVuY3Rpb24gKG5hbWUsIHNlYXJjaCkge1xuICAgICAgICBpZiAodHlwZW9mIHNlYXJjaCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHNlYXJjaCA9IG5ldyBCdWZmZXIoc2VhcmNoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghQnVmZmVyLmlzQnVmZmVyKHNlYXJjaCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignc2VhcmNoIG11c3QgYmUgYSBCdWZmZXIgb3IgYSBzdHJpbmcnKTtcbiAgICAgICAgfVxuICAgICAgICB2YXJzLnNldChuYW1lLCBudWxsKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHNpbXBsZSBidXQgc2xvdyBzdHJpbmcgc2VhcmNoXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpICsgb2Zmc2V0IDw9IGJ1ZmZlci5sZW5ndGggLSBzZWFyY2gubGVuZ3RoICsgMTsgaSsrKSB7XG4gICAgICAgICAgICBmb3IgKFxuICAgICAgICAgICAgICAgIHZhciBqID0gMDtcbiAgICAgICAgICAgICAgICBqIDwgc2VhcmNoLmxlbmd0aCAmJiBidWZmZXJbb2Zmc2V0K2kral0gPT09IHNlYXJjaFtqXTtcbiAgICAgICAgICAgICAgICBqKytcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAoaiA9PT0gc2VhcmNoLmxlbmd0aCkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhcnMuc2V0KG5hbWUsIGJ1ZmZlci5zbGljZShvZmZzZXQsIG9mZnNldCArIGkpKTtcbiAgICAgICAgb2Zmc2V0ICs9IGkgKyBzZWFyY2gubGVuZ3RoO1xuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICB9O1xuICAgIFxuICAgIHNlbGYucGVlayA9IGZ1bmN0aW9uIChjYikge1xuICAgICAgICB2YXIgd2FzID0gb2Zmc2V0O1xuICAgICAgICBjYi5jYWxsKHNlbGYsIHZhcnMuc3RvcmUpO1xuICAgICAgICBvZmZzZXQgPSB3YXM7XG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgIH07XG4gICAgXG4gICAgc2VsZi5mbHVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFycy5zdG9yZSA9IHt9O1xuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICB9O1xuICAgIFxuICAgIHNlbGYuZW9mID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gb2Zmc2V0ID49IGJ1ZmZlci5sZW5ndGg7XG4gICAgfTtcbiAgICBcbiAgICByZXR1cm4gc2VsZjtcbn07XG5cbi8vIGNvbnZlcnQgYnl0ZSBzdHJpbmdzIHRvIHVuc2lnbmVkIGxpdHRsZSBlbmRpYW4gbnVtYmVyc1xuZnVuY3Rpb24gZGVjb2RlTEV1IChieXRlcykge1xuICAgIHZhciBhY2MgPSAwO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYWNjICs9IE1hdGgucG93KDI1NixpKSAqIGJ5dGVzW2ldO1xuICAgIH1cbiAgICByZXR1cm4gYWNjO1xufVxuXG4vLyBjb252ZXJ0IGJ5dGUgc3RyaW5ncyB0byB1bnNpZ25lZCBiaWcgZW5kaWFuIG51bWJlcnNcbmZ1bmN0aW9uIGRlY29kZUJFdSAoYnl0ZXMpIHtcbiAgICB2YXIgYWNjID0gMDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGFjYyArPSBNYXRoLnBvdygyNTYsIGJ5dGVzLmxlbmd0aCAtIGkgLSAxKSAqIGJ5dGVzW2ldO1xuICAgIH1cbiAgICByZXR1cm4gYWNjO1xufVxuXG4vLyBjb252ZXJ0IGJ5dGUgc3RyaW5ncyB0byBzaWduZWQgYmlnIGVuZGlhbiBudW1iZXJzXG5mdW5jdGlvbiBkZWNvZGVCRXMgKGJ5dGVzKSB7XG4gICAgdmFyIHZhbCA9IGRlY29kZUJFdShieXRlcyk7XG4gICAgaWYgKChieXRlc1swXSAmIDB4ODApID09IDB4ODApIHtcbiAgICAgICAgdmFsIC09IE1hdGgucG93KDI1NiwgYnl0ZXMubGVuZ3RoKTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbDtcbn1cblxuLy8gY29udmVydCBieXRlIHN0cmluZ3MgdG8gc2lnbmVkIGxpdHRsZSBlbmRpYW4gbnVtYmVyc1xuZnVuY3Rpb24gZGVjb2RlTEVzIChieXRlcykge1xuICAgIHZhciB2YWwgPSBkZWNvZGVMRXUoYnl0ZXMpO1xuICAgIGlmICgoYnl0ZXNbYnl0ZXMubGVuZ3RoIC0gMV0gJiAweDgwKSA9PSAweDgwKSB7XG4gICAgICAgIHZhbCAtPSBNYXRoLnBvdygyNTYsIGJ5dGVzLmxlbmd0aCk7XG4gICAgfVxuICAgIHJldHVybiB2YWw7XG59XG5cbmZ1bmN0aW9uIHdvcmRzIChkZWNvZGUpIHtcbiAgICB2YXIgc2VsZiA9IHt9O1xuICAgIFxuICAgIFsgMSwgMiwgNCwgOCBdLmZvckVhY2goZnVuY3Rpb24gKGJ5dGVzKSB7XG4gICAgICAgIHZhciBiaXRzID0gYnl0ZXMgKiA4O1xuICAgICAgICBcbiAgICAgICAgc2VsZlsnd29yZCcgKyBiaXRzICsgJ2xlJ11cbiAgICAgICAgPSBzZWxmWyd3b3JkJyArIGJpdHMgKyAnbHUnXVxuICAgICAgICA9IGRlY29kZShieXRlcywgZGVjb2RlTEV1KTtcbiAgICAgICAgXG4gICAgICAgIHNlbGZbJ3dvcmQnICsgYml0cyArICdscyddXG4gICAgICAgID0gZGVjb2RlKGJ5dGVzLCBkZWNvZGVMRXMpO1xuICAgICAgICBcbiAgICAgICAgc2VsZlsnd29yZCcgKyBiaXRzICsgJ2JlJ11cbiAgICAgICAgPSBzZWxmWyd3b3JkJyArIGJpdHMgKyAnYnUnXVxuICAgICAgICA9IGRlY29kZShieXRlcywgZGVjb2RlQkV1KTtcbiAgICAgICAgXG4gICAgICAgIHNlbGZbJ3dvcmQnICsgYml0cyArICdicyddXG4gICAgICAgID0gZGVjb2RlKGJ5dGVzLCBkZWNvZGVCRXMpO1xuICAgIH0pO1xuICAgIFxuICAgIC8vIHdvcmQ4YmUobikgPT0gd29yZDhsZShuKSBmb3IgYWxsIG5cbiAgICBzZWxmLndvcmQ4ID0gc2VsZi53b3JkOHUgPSBzZWxmLndvcmQ4YmU7XG4gICAgc2VsZi53b3JkOHMgPSBzZWxmLndvcmQ4YnM7XG4gICAgXG4gICAgcmV0dXJuIHNlbGY7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdG9yZSkge1xuICAgIGZ1bmN0aW9uIGdldHNldCAobmFtZSwgdmFsdWUpIHtcbiAgICAgICAgdmFyIG5vZGUgPSB2YXJzLnN0b3JlO1xuICAgICAgICB2YXIga2V5cyA9IG5hbWUuc3BsaXQoJy4nKTtcbiAgICAgICAga2V5cy5zbGljZSgwLC0xKS5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgICAgICAgICBpZiAobm9kZVtrXSA9PT0gdW5kZWZpbmVkKSBub2RlW2tdID0ge307XG4gICAgICAgICAgICBub2RlID0gbm9kZVtrXVxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGtleSA9IGtleXNba2V5cy5sZW5ndGggLSAxXTtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIG5vZGVba2V5XTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBub2RlW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICB2YXIgdmFycyA9IHtcbiAgICAgICAgZ2V0IDogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRzZXQobmFtZSk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldCA6IGZ1bmN0aW9uIChuYW1lLCB2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIGdldHNldChuYW1lLCB2YWx1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIHN0b3JlIDogc3RvcmUgfHwge30sXG4gICAgfTtcbiAgICByZXR1cm4gdmFycztcbn07XG4iLCJ2YXIgY29uY2F0TWFwID0gcmVxdWlyZSgnY29uY2F0LW1hcCcpO1xudmFyIGJhbGFuY2VkID0gcmVxdWlyZSgnYmFsYW5jZWQtbWF0Y2gnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBhbmRUb3A7XG5cbnZhciBlc2NTbGFzaCA9ICdcXDBTTEFTSCcrTWF0aC5yYW5kb20oKSsnXFwwJztcbnZhciBlc2NPcGVuID0gJ1xcME9QRU4nK01hdGgucmFuZG9tKCkrJ1xcMCc7XG52YXIgZXNjQ2xvc2UgPSAnXFwwQ0xPU0UnK01hdGgucmFuZG9tKCkrJ1xcMCc7XG52YXIgZXNjQ29tbWEgPSAnXFwwQ09NTUEnK01hdGgucmFuZG9tKCkrJ1xcMCc7XG52YXIgZXNjUGVyaW9kID0gJ1xcMFBFUklPRCcrTWF0aC5yYW5kb20oKSsnXFwwJztcblxuZnVuY3Rpb24gbnVtZXJpYyhzdHIpIHtcbiAgcmV0dXJuIHBhcnNlSW50KHN0ciwgMTApID09IHN0clxuICAgID8gcGFyc2VJbnQoc3RyLCAxMClcbiAgICA6IHN0ci5jaGFyQ29kZUF0KDApO1xufVxuXG5mdW5jdGlvbiBlc2NhcGVCcmFjZXMoc3RyKSB7XG4gIHJldHVybiBzdHIuc3BsaXQoJ1xcXFxcXFxcJykuam9pbihlc2NTbGFzaClcbiAgICAgICAgICAgIC5zcGxpdCgnXFxcXHsnKS5qb2luKGVzY09wZW4pXG4gICAgICAgICAgICAuc3BsaXQoJ1xcXFx9Jykuam9pbihlc2NDbG9zZSlcbiAgICAgICAgICAgIC5zcGxpdCgnXFxcXCwnKS5qb2luKGVzY0NvbW1hKVxuICAgICAgICAgICAgLnNwbGl0KCdcXFxcLicpLmpvaW4oZXNjUGVyaW9kKTtcbn1cblxuZnVuY3Rpb24gdW5lc2NhcGVCcmFjZXMoc3RyKSB7XG4gIHJldHVybiBzdHIuc3BsaXQoZXNjU2xhc2gpLmpvaW4oJ1xcXFwnKVxuICAgICAgICAgICAgLnNwbGl0KGVzY09wZW4pLmpvaW4oJ3snKVxuICAgICAgICAgICAgLnNwbGl0KGVzY0Nsb3NlKS5qb2luKCd9JylcbiAgICAgICAgICAgIC5zcGxpdChlc2NDb21tYSkuam9pbignLCcpXG4gICAgICAgICAgICAuc3BsaXQoZXNjUGVyaW9kKS5qb2luKCcuJyk7XG59XG5cblxuLy8gQmFzaWNhbGx5IGp1c3Qgc3RyLnNwbGl0KFwiLFwiKSwgYnV0IGhhbmRsaW5nIGNhc2VzXG4vLyB3aGVyZSB3ZSBoYXZlIG5lc3RlZCBicmFjZWQgc2VjdGlvbnMsIHdoaWNoIHNob3VsZCBiZVxuLy8gdHJlYXRlZCBhcyBpbmRpdmlkdWFsIG1lbWJlcnMsIGxpa2Uge2Ese2IsY30sZH1cbmZ1bmN0aW9uIHBhcnNlQ29tbWFQYXJ0cyhzdHIpIHtcbiAgaWYgKCFzdHIpXG4gICAgcmV0dXJuIFsnJ107XG5cbiAgdmFyIHBhcnRzID0gW107XG4gIHZhciBtID0gYmFsYW5jZWQoJ3snLCAnfScsIHN0cik7XG5cbiAgaWYgKCFtKVxuICAgIHJldHVybiBzdHIuc3BsaXQoJywnKTtcblxuICB2YXIgcHJlID0gbS5wcmU7XG4gIHZhciBib2R5ID0gbS5ib2R5O1xuICB2YXIgcG9zdCA9IG0ucG9zdDtcbiAgdmFyIHAgPSBwcmUuc3BsaXQoJywnKTtcblxuICBwW3AubGVuZ3RoLTFdICs9ICd7JyArIGJvZHkgKyAnfSc7XG4gIHZhciBwb3N0UGFydHMgPSBwYXJzZUNvbW1hUGFydHMocG9zdCk7XG4gIGlmIChwb3N0Lmxlbmd0aCkge1xuICAgIHBbcC5sZW5ndGgtMV0gKz0gcG9zdFBhcnRzLnNoaWZ0KCk7XG4gICAgcC5wdXNoLmFwcGx5KHAsIHBvc3RQYXJ0cyk7XG4gIH1cblxuICBwYXJ0cy5wdXNoLmFwcGx5KHBhcnRzLCBwKTtcblxuICByZXR1cm4gcGFydHM7XG59XG5cbmZ1bmN0aW9uIGV4cGFuZFRvcChzdHIpIHtcbiAgaWYgKCFzdHIpXG4gICAgcmV0dXJuIFtdO1xuXG4gIC8vIEkgZG9uJ3Qga25vdyB3aHkgQmFzaCA0LjMgZG9lcyB0aGlzLCBidXQgaXQgZG9lcy5cbiAgLy8gQW55dGhpbmcgc3RhcnRpbmcgd2l0aCB7fSB3aWxsIGhhdmUgdGhlIGZpcnN0IHR3byBieXRlcyBwcmVzZXJ2ZWRcbiAgLy8gYnV0ICpvbmx5KiBhdCB0aGUgdG9wIGxldmVsLCBzbyB7fSxhfWIgd2lsbCBub3QgZXhwYW5kIHRvIGFueXRoaW5nLFxuICAvLyBidXQgYXt9LGJ9YyB3aWxsIGJlIGV4cGFuZGVkIHRvIFthfWMsYWJjXS5cbiAgLy8gT25lIGNvdWxkIGFyZ3VlIHRoYXQgdGhpcyBpcyBhIGJ1ZyBpbiBCYXNoLCBidXQgc2luY2UgdGhlIGdvYWwgb2ZcbiAgLy8gdGhpcyBtb2R1bGUgaXMgdG8gbWF0Y2ggQmFzaCdzIHJ1bGVzLCB3ZSBlc2NhcGUgYSBsZWFkaW5nIHt9XG4gIGlmIChzdHIuc3Vic3RyKDAsIDIpID09PSAne30nKSB7XG4gICAgc3RyID0gJ1xcXFx7XFxcXH0nICsgc3RyLnN1YnN0cigyKTtcbiAgfVxuXG4gIHJldHVybiBleHBhbmQoZXNjYXBlQnJhY2VzKHN0ciksIHRydWUpLm1hcCh1bmVzY2FwZUJyYWNlcyk7XG59XG5cbmZ1bmN0aW9uIGlkZW50aXR5KGUpIHtcbiAgcmV0dXJuIGU7XG59XG5cbmZ1bmN0aW9uIGVtYnJhY2Uoc3RyKSB7XG4gIHJldHVybiAneycgKyBzdHIgKyAnfSc7XG59XG5mdW5jdGlvbiBpc1BhZGRlZChlbCkge1xuICByZXR1cm4gL14tPzBcXGQvLnRlc3QoZWwpO1xufVxuXG5mdW5jdGlvbiBsdGUoaSwgeSkge1xuICByZXR1cm4gaSA8PSB5O1xufVxuZnVuY3Rpb24gZ3RlKGksIHkpIHtcbiAgcmV0dXJuIGkgPj0geTtcbn1cblxuZnVuY3Rpb24gZXhwYW5kKHN0ciwgaXNUb3ApIHtcbiAgdmFyIGV4cGFuc2lvbnMgPSBbXTtcblxuICB2YXIgbSA9IGJhbGFuY2VkKCd7JywgJ30nLCBzdHIpO1xuICBpZiAoIW0gfHwgL1xcJCQvLnRlc3QobS5wcmUpKSByZXR1cm4gW3N0cl07XG5cbiAgdmFyIGlzTnVtZXJpY1NlcXVlbmNlID0gL14tP1xcZCtcXC5cXC4tP1xcZCsoPzpcXC5cXC4tP1xcZCspPyQvLnRlc3QobS5ib2R5KTtcbiAgdmFyIGlzQWxwaGFTZXF1ZW5jZSA9IC9eW2EtekEtWl1cXC5cXC5bYS16QS1aXSg/OlxcLlxcLi0/XFxkKyk/JC8udGVzdChtLmJvZHkpO1xuICB2YXIgaXNTZXF1ZW5jZSA9IGlzTnVtZXJpY1NlcXVlbmNlIHx8IGlzQWxwaGFTZXF1ZW5jZTtcbiAgdmFyIGlzT3B0aW9ucyA9IG0uYm9keS5pbmRleE9mKCcsJykgPj0gMDtcbiAgaWYgKCFpc1NlcXVlbmNlICYmICFpc09wdGlvbnMpIHtcbiAgICAvLyB7YX0sYn1cbiAgICBpZiAobS5wb3N0Lm1hdGNoKC8sLipcXH0vKSkge1xuICAgICAgc3RyID0gbS5wcmUgKyAneycgKyBtLmJvZHkgKyBlc2NDbG9zZSArIG0ucG9zdDtcbiAgICAgIHJldHVybiBleHBhbmQoc3RyKTtcbiAgICB9XG4gICAgcmV0dXJuIFtzdHJdO1xuICB9XG5cbiAgdmFyIG47XG4gIGlmIChpc1NlcXVlbmNlKSB7XG4gICAgbiA9IG0uYm9keS5zcGxpdCgvXFwuXFwuLyk7XG4gIH0gZWxzZSB7XG4gICAgbiA9IHBhcnNlQ29tbWFQYXJ0cyhtLmJvZHkpO1xuICAgIGlmIChuLmxlbmd0aCA9PT0gMSkge1xuICAgICAgLy8geHt7YSxifX15ID09PiB4e2F9eSB4e2J9eVxuICAgICAgbiA9IGV4cGFuZChuWzBdLCBmYWxzZSkubWFwKGVtYnJhY2UpO1xuICAgICAgaWYgKG4ubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHZhciBwb3N0ID0gbS5wb3N0Lmxlbmd0aFxuICAgICAgICAgID8gZXhwYW5kKG0ucG9zdCwgZmFsc2UpXG4gICAgICAgICAgOiBbJyddO1xuICAgICAgICByZXR1cm4gcG9zdC5tYXAoZnVuY3Rpb24ocCkge1xuICAgICAgICAgIHJldHVybiBtLnByZSArIG5bMF0gKyBwO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBhdCB0aGlzIHBvaW50LCBuIGlzIHRoZSBwYXJ0cywgYW5kIHdlIGtub3cgaXQncyBub3QgYSBjb21tYSBzZXRcbiAgLy8gd2l0aCBhIHNpbmdsZSBlbnRyeS5cblxuICAvLyBubyBuZWVkIHRvIGV4cGFuZCBwcmUsIHNpbmNlIGl0IGlzIGd1YXJhbnRlZWQgdG8gYmUgZnJlZSBvZiBicmFjZS1zZXRzXG4gIHZhciBwcmUgPSBtLnByZTtcbiAgdmFyIHBvc3QgPSBtLnBvc3QubGVuZ3RoXG4gICAgPyBleHBhbmQobS5wb3N0LCBmYWxzZSlcbiAgICA6IFsnJ107XG5cbiAgdmFyIE47XG5cbiAgaWYgKGlzU2VxdWVuY2UpIHtcbiAgICB2YXIgeCA9IG51bWVyaWMoblswXSk7XG4gICAgdmFyIHkgPSBudW1lcmljKG5bMV0pO1xuICAgIHZhciB3aWR0aCA9IE1hdGgubWF4KG5bMF0ubGVuZ3RoLCBuWzFdLmxlbmd0aClcbiAgICB2YXIgaW5jciA9IG4ubGVuZ3RoID09IDNcbiAgICAgID8gTWF0aC5hYnMobnVtZXJpYyhuWzJdKSlcbiAgICAgIDogMTtcbiAgICB2YXIgdGVzdCA9IGx0ZTtcbiAgICB2YXIgcmV2ZXJzZSA9IHkgPCB4O1xuICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICBpbmNyICo9IC0xO1xuICAgICAgdGVzdCA9IGd0ZTtcbiAgICB9XG4gICAgdmFyIHBhZCA9IG4uc29tZShpc1BhZGRlZCk7XG5cbiAgICBOID0gW107XG5cbiAgICBmb3IgKHZhciBpID0geDsgdGVzdChpLCB5KTsgaSArPSBpbmNyKSB7XG4gICAgICB2YXIgYztcbiAgICAgIGlmIChpc0FscGhhU2VxdWVuY2UpIHtcbiAgICAgICAgYyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoaSk7XG4gICAgICAgIGlmIChjID09PSAnXFxcXCcpXG4gICAgICAgICAgYyA9ICcnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYyA9IFN0cmluZyhpKTtcbiAgICAgICAgaWYgKHBhZCkge1xuICAgICAgICAgIHZhciBuZWVkID0gd2lkdGggLSBjLmxlbmd0aDtcbiAgICAgICAgICBpZiAobmVlZCA+IDApIHtcbiAgICAgICAgICAgIHZhciB6ID0gbmV3IEFycmF5KG5lZWQgKyAxKS5qb2luKCcwJyk7XG4gICAgICAgICAgICBpZiAoaSA8IDApXG4gICAgICAgICAgICAgIGMgPSAnLScgKyB6ICsgYy5zbGljZSgxKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgYyA9IHogKyBjO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgTi5wdXNoKGMpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBOID0gY29uY2F0TWFwKG4sIGZ1bmN0aW9uKGVsKSB7IHJldHVybiBleHBhbmQoZWwsIGZhbHNlKSB9KTtcbiAgfVxuXG4gIGZvciAodmFyIGogPSAwOyBqIDwgTi5sZW5ndGg7IGorKykge1xuICAgIGZvciAodmFyIGsgPSAwOyBrIDwgcG9zdC5sZW5ndGg7IGsrKykge1xuICAgICAgdmFyIGV4cGFuc2lvbiA9IHByZSArIE5bal0gKyBwb3N0W2tdO1xuICAgICAgaWYgKCFpc1RvcCB8fCBpc1NlcXVlbmNlIHx8IGV4cGFuc2lvbilcbiAgICAgICAgZXhwYW5zaW9ucy5wdXNoKGV4cGFuc2lvbik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGV4cGFuc2lvbnM7XG59XG5cbiIsIm1vZHVsZS5leHBvcnRzID0gQnVmZmVycztcblxuZnVuY3Rpb24gQnVmZmVycyAoYnVmcykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBCdWZmZXJzKSkgcmV0dXJuIG5ldyBCdWZmZXJzKGJ1ZnMpO1xuICAgIHRoaXMuYnVmZmVycyA9IGJ1ZnMgfHwgW107XG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLmJ1ZmZlcnMucmVkdWNlKGZ1bmN0aW9uIChzaXplLCBidWYpIHtcbiAgICAgICAgcmV0dXJuIHNpemUgKyBidWYubGVuZ3RoXG4gICAgfSwgMCk7XG59XG5cbkJ1ZmZlcnMucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYXJndW1lbnRzW2ldKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVHJpZWQgdG8gcHVzaCBhIG5vbi1idWZmZXInKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgYnVmID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB0aGlzLmJ1ZmZlcnMucHVzaChidWYpO1xuICAgICAgICB0aGlzLmxlbmd0aCArPSBidWYubGVuZ3RoO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5sZW5ndGg7XG59O1xuXG5CdWZmZXJzLnByb3RvdHlwZS51bnNoaWZ0ID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKGFyZ3VtZW50c1tpXSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RyaWVkIHRvIHVuc2hpZnQgYSBub24tYnVmZmVyJyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGJ1ZiA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgdGhpcy5idWZmZXJzLnVuc2hpZnQoYnVmKTtcbiAgICAgICAgdGhpcy5sZW5ndGggKz0gYnVmLmxlbmd0aDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubGVuZ3RoO1xufTtcblxuQnVmZmVycy5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uIChkc3QsIGRTdGFydCwgc3RhcnQsIGVuZCkge1xuICAgIHJldHVybiB0aGlzLnNsaWNlKHN0YXJ0LCBlbmQpLmNvcHkoZHN0LCBkU3RhcnQsIDAsIGVuZCAtIHN0YXJ0KTtcbn07XG5cbkJ1ZmZlcnMucHJvdG90eXBlLnNwbGljZSA9IGZ1bmN0aW9uIChpLCBob3dNYW55KSB7XG4gICAgdmFyIGJ1ZmZlcnMgPSB0aGlzLmJ1ZmZlcnM7XG4gICAgdmFyIGluZGV4ID0gaSA+PSAwID8gaSA6IHRoaXMubGVuZ3RoIC0gaTtcbiAgICB2YXIgcmVwcyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICBcbiAgICBpZiAoaG93TWFueSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGhvd01hbnkgPSB0aGlzLmxlbmd0aCAtIGluZGV4O1xuICAgIH1cbiAgICBlbHNlIGlmIChob3dNYW55ID4gdGhpcy5sZW5ndGggLSBpbmRleCkge1xuICAgICAgICBob3dNYW55ID0gdGhpcy5sZW5ndGggLSBpbmRleDtcbiAgICB9XG4gICAgXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXBzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMubGVuZ3RoICs9IHJlcHNbaV0ubGVuZ3RoO1xuICAgIH1cbiAgICBcbiAgICB2YXIgcmVtb3ZlZCA9IG5ldyBCdWZmZXJzKCk7XG4gICAgdmFyIGJ5dGVzID0gMDtcbiAgICBcbiAgICB2YXIgc3RhcnRCeXRlcyA9IDA7XG4gICAgZm9yIChcbiAgICAgICAgdmFyIGlpID0gMDtcbiAgICAgICAgaWkgPCBidWZmZXJzLmxlbmd0aCAmJiBzdGFydEJ5dGVzICsgYnVmZmVyc1tpaV0ubGVuZ3RoIDwgaW5kZXg7XG4gICAgICAgIGlpICsrXG4gICAgKSB7IHN0YXJ0Qnl0ZXMgKz0gYnVmZmVyc1tpaV0ubGVuZ3RoIH1cbiAgICBcbiAgICBpZiAoaW5kZXggLSBzdGFydEJ5dGVzID4gMCkge1xuICAgICAgICB2YXIgc3RhcnQgPSBpbmRleCAtIHN0YXJ0Qnl0ZXM7XG4gICAgICAgIFxuICAgICAgICBpZiAoc3RhcnQgKyBob3dNYW55IDwgYnVmZmVyc1tpaV0ubGVuZ3RoKSB7XG4gICAgICAgICAgICByZW1vdmVkLnB1c2goYnVmZmVyc1tpaV0uc2xpY2Uoc3RhcnQsIHN0YXJ0ICsgaG93TWFueSkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgb3JpZyA9IGJ1ZmZlcnNbaWldO1xuICAgICAgICAgICAgLy92YXIgYnVmID0gbmV3IEJ1ZmZlcihvcmlnLmxlbmd0aCAtIGhvd01hbnkpO1xuICAgICAgICAgICAgdmFyIGJ1ZjAgPSBuZXcgQnVmZmVyKHN0YXJ0KTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RhcnQ7IGkrKykge1xuICAgICAgICAgICAgICAgIGJ1ZjBbaV0gPSBvcmlnW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgYnVmMSA9IG5ldyBCdWZmZXIob3JpZy5sZW5ndGggLSBzdGFydCAtIGhvd01hbnkpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IHN0YXJ0ICsgaG93TWFueTsgaSA8IG9yaWcubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBidWYxWyBpIC0gaG93TWFueSAtIHN0YXJ0IF0gPSBvcmlnW2ldXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXBzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVwc18gPSByZXBzLnNsaWNlKCk7XG4gICAgICAgICAgICAgICAgcmVwc18udW5zaGlmdChidWYwKTtcbiAgICAgICAgICAgICAgICByZXBzXy5wdXNoKGJ1ZjEpO1xuICAgICAgICAgICAgICAgIGJ1ZmZlcnMuc3BsaWNlLmFwcGx5KGJ1ZmZlcnMsIFsgaWksIDEgXS5jb25jYXQocmVwc18pKTtcbiAgICAgICAgICAgICAgICBpaSArPSByZXBzXy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgcmVwcyA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYnVmZmVycy5zcGxpY2UoaWksIDEsIGJ1ZjAsIGJ1ZjEpO1xuICAgICAgICAgICAgICAgIC8vYnVmZmVyc1tpaV0gPSBidWY7XG4gICAgICAgICAgICAgICAgaWkgKz0gMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlbW92ZWQucHVzaChidWZmZXJzW2lpXS5zbGljZShzdGFydCkpO1xuICAgICAgICAgICAgYnVmZmVyc1tpaV0gPSBidWZmZXJzW2lpXS5zbGljZSgwLCBzdGFydCk7XG4gICAgICAgICAgICBpaSArKztcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBpZiAocmVwcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGJ1ZmZlcnMuc3BsaWNlLmFwcGx5KGJ1ZmZlcnMsIFsgaWksIDAgXS5jb25jYXQocmVwcykpO1xuICAgICAgICBpaSArPSByZXBzLmxlbmd0aDtcbiAgICB9XG4gICAgXG4gICAgd2hpbGUgKHJlbW92ZWQubGVuZ3RoIDwgaG93TWFueSkge1xuICAgICAgICB2YXIgYnVmID0gYnVmZmVyc1tpaV07XG4gICAgICAgIHZhciBsZW4gPSBidWYubGVuZ3RoO1xuICAgICAgICB2YXIgdGFrZSA9IE1hdGgubWluKGxlbiwgaG93TWFueSAtIHJlbW92ZWQubGVuZ3RoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0YWtlID09PSBsZW4pIHtcbiAgICAgICAgICAgIHJlbW92ZWQucHVzaChidWYpO1xuICAgICAgICAgICAgYnVmZmVycy5zcGxpY2UoaWksIDEpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVtb3ZlZC5wdXNoKGJ1Zi5zbGljZSgwLCB0YWtlKSk7XG4gICAgICAgICAgICBidWZmZXJzW2lpXSA9IGJ1ZmZlcnNbaWldLnNsaWNlKHRha2UpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHRoaXMubGVuZ3RoIC09IHJlbW92ZWQubGVuZ3RoO1xuICAgIFxuICAgIHJldHVybiByZW1vdmVkO1xufTtcbiBcbkJ1ZmZlcnMucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gKGksIGopIHtcbiAgICB2YXIgYnVmZmVycyA9IHRoaXMuYnVmZmVycztcbiAgICBpZiAoaiA9PT0gdW5kZWZpbmVkKSBqID0gdGhpcy5sZW5ndGg7XG4gICAgaWYgKGkgPT09IHVuZGVmaW5lZCkgaSA9IDA7XG4gICAgXG4gICAgaWYgKGogPiB0aGlzLmxlbmd0aCkgaiA9IHRoaXMubGVuZ3RoO1xuICAgIFxuICAgIHZhciBzdGFydEJ5dGVzID0gMDtcbiAgICBmb3IgKFxuICAgICAgICB2YXIgc2kgPSAwO1xuICAgICAgICBzaSA8IGJ1ZmZlcnMubGVuZ3RoICYmIHN0YXJ0Qnl0ZXMgKyBidWZmZXJzW3NpXS5sZW5ndGggPD0gaTtcbiAgICAgICAgc2kgKytcbiAgICApIHsgc3RhcnRCeXRlcyArPSBidWZmZXJzW3NpXS5sZW5ndGggfVxuICAgIFxuICAgIHZhciB0YXJnZXQgPSBuZXcgQnVmZmVyKGogLSBpKTtcbiAgICBcbiAgICB2YXIgdGkgPSAwO1xuICAgIGZvciAodmFyIGlpID0gc2k7IHRpIDwgaiAtIGkgJiYgaWkgPCBidWZmZXJzLmxlbmd0aDsgaWkrKykge1xuICAgICAgICB2YXIgbGVuID0gYnVmZmVyc1tpaV0ubGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgdmFyIHN0YXJ0ID0gdGkgPT09IDAgPyBpIC0gc3RhcnRCeXRlcyA6IDA7XG4gICAgICAgIHZhciBlbmQgPSB0aSArIGxlbiA+PSBqIC0gaVxuICAgICAgICAgICAgPyBNYXRoLm1pbihzdGFydCArIChqIC0gaSkgLSB0aSwgbGVuKVxuICAgICAgICAgICAgOiBsZW5cbiAgICAgICAgO1xuICAgICAgICBcbiAgICAgICAgYnVmZmVyc1tpaV0uY29weSh0YXJnZXQsIHRpLCBzdGFydCwgZW5kKTtcbiAgICAgICAgdGkgKz0gZW5kIC0gc3RhcnQ7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiB0YXJnZXQ7XG59O1xuXG5CdWZmZXJzLnByb3RvdHlwZS5wb3MgPSBmdW5jdGlvbiAoaSkge1xuICAgIGlmIChpIDwgMCB8fCBpID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoJ29vYicpO1xuICAgIHZhciBsID0gaSwgYmkgPSAwLCBidSA9IG51bGw7XG4gICAgZm9yICg7Oykge1xuICAgICAgICBidSA9IHRoaXMuYnVmZmVyc1tiaV07XG4gICAgICAgIGlmIChsIDwgYnUubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4ge2J1ZjogYmksIG9mZnNldDogbH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsIC09IGJ1Lmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICBiaSsrO1xuICAgIH1cbn07XG5cbkJ1ZmZlcnMucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIGdldCAoaSkge1xuICAgIHZhciBwb3MgPSB0aGlzLnBvcyhpKTtcblxuICAgIHJldHVybiB0aGlzLmJ1ZmZlcnNbcG9zLmJ1Zl0uZ2V0KHBvcy5vZmZzZXQpO1xufTtcblxuQnVmZmVycy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gc2V0IChpLCBiKSB7XG4gICAgdmFyIHBvcyA9IHRoaXMucG9zKGkpO1xuXG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyc1twb3MuYnVmXS5zZXQocG9zLm9mZnNldCwgYik7XG59O1xuXG5CdWZmZXJzLnByb3RvdHlwZS5pbmRleE9mID0gZnVuY3Rpb24gKG5lZWRsZSwgb2Zmc2V0KSB7XG4gICAgaWYgKFwic3RyaW5nXCIgPT09IHR5cGVvZiBuZWVkbGUpIHtcbiAgICAgICAgbmVlZGxlID0gbmV3IEJ1ZmZlcihuZWVkbGUpO1xuICAgIH0gZWxzZSBpZiAobmVlZGxlIGluc3RhbmNlb2YgQnVmZmVyKSB7XG4gICAgICAgIC8vIGFscmVhZHkgYSBidWZmZXJcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgdHlwZSBmb3IgYSBzZWFyY2ggc3RyaW5nJyk7XG4gICAgfVxuXG4gICAgaWYgKCFuZWVkbGUubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH1cblxuICAgIHZhciBpID0gMCwgaiA9IDAsIG1hdGNoID0gMCwgbXN0YXJ0LCBwb3MgPSAwO1xuXG4gICAgLy8gc3RhcnQgc2VhcmNoIGZyb20gYSBwYXJ0aWN1bGFyIHBvaW50IGluIHRoZSB2aXJ0dWFsIGJ1ZmZlclxuICAgIGlmIChvZmZzZXQpIHtcbiAgICAgICAgdmFyIHAgPSB0aGlzLnBvcyhvZmZzZXQpO1xuICAgICAgICBpID0gcC5idWY7XG4gICAgICAgIGogPSBwLm9mZnNldDtcbiAgICAgICAgcG9zID0gb2Zmc2V0O1xuICAgIH1cblxuICAgIC8vIGZvciBlYWNoIGNoYXJhY3RlciBpbiB2aXJ0dWFsIGJ1ZmZlclxuICAgIGZvciAoOzspIHtcbiAgICAgICAgd2hpbGUgKGogPj0gdGhpcy5idWZmZXJzW2ldLmxlbmd0aCkge1xuICAgICAgICAgICAgaiA9IDA7XG4gICAgICAgICAgICBpKys7XG5cbiAgICAgICAgICAgIGlmIChpID49IHRoaXMuYnVmZmVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAvLyBzZWFyY2ggc3RyaW5nIG5vdCBmb3VuZFxuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjaGFyID0gdGhpcy5idWZmZXJzW2ldW2pdO1xuXG4gICAgICAgIGlmIChjaGFyID09IG5lZWRsZVttYXRjaF0pIHtcbiAgICAgICAgICAgIC8vIGtlZXAgdHJhY2sgd2hlcmUgbWF0Y2ggc3RhcnRlZFxuICAgICAgICAgICAgaWYgKG1hdGNoID09IDApIHtcbiAgICAgICAgICAgICAgICBtc3RhcnQgPSB7XG4gICAgICAgICAgICAgICAgICAgIGk6IGksXG4gICAgICAgICAgICAgICAgICAgIGo6IGosXG4gICAgICAgICAgICAgICAgICAgIHBvczogcG9zXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1hdGNoKys7XG4gICAgICAgICAgICBpZiAobWF0Y2ggPT0gbmVlZGxlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIC8vIGZ1bGwgbWF0Y2hcbiAgICAgICAgICAgICAgICByZXR1cm4gbXN0YXJ0LnBvcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChtYXRjaCAhPSAwKSB7XG4gICAgICAgICAgICAvLyBhIHBhcnRpYWwgbWF0Y2ggZW5kZWQsIGdvIGJhY2sgdG8gbWF0Y2ggc3RhcnRpbmcgcG9zaXRpb25cbiAgICAgICAgICAgIC8vIHRoaXMgd2lsbCBjb250aW51ZSB0aGUgc2VhcmNoIGF0IHRoZSBuZXh0IGNoYXJhY3RlclxuICAgICAgICAgICAgaSA9IG1zdGFydC5pO1xuICAgICAgICAgICAgaiA9IG1zdGFydC5qO1xuICAgICAgICAgICAgcG9zID0gbXN0YXJ0LnBvcztcbiAgICAgICAgICAgIG1hdGNoID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGorKztcbiAgICAgICAgcG9zKys7XG4gICAgfVxufTtcblxuQnVmZmVycy5wcm90b3R5cGUudG9CdWZmZXIgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5zbGljZSgpO1xufVxuXG5CdWZmZXJzLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gICAgcmV0dXJuIHRoaXMuc2xpY2Uoc3RhcnQsIGVuZCkudG9TdHJpbmcoZW5jb2RpbmcpO1xufVxuIiwidmFyIFRyYXZlcnNlID0gcmVxdWlyZSgndHJhdmVyc2UnKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2hhaW5zYXc7XG5mdW5jdGlvbiBDaGFpbnNhdyAoYnVpbGRlcikge1xuICAgIHZhciBzYXcgPSBDaGFpbnNhdy5zYXcoYnVpbGRlciwge30pO1xuICAgIHZhciByID0gYnVpbGRlci5jYWxsKHNhdy5oYW5kbGVycywgc2F3KTtcbiAgICBpZiAociAhPT0gdW5kZWZpbmVkKSBzYXcuaGFuZGxlcnMgPSByO1xuICAgIHNhdy5yZWNvcmQoKTtcbiAgICByZXR1cm4gc2F3LmNoYWluKCk7XG59O1xuXG5DaGFpbnNhdy5saWdodCA9IGZ1bmN0aW9uIENoYWluc2F3TGlnaHQgKGJ1aWxkZXIpIHtcbiAgICB2YXIgc2F3ID0gQ2hhaW5zYXcuc2F3KGJ1aWxkZXIsIHt9KTtcbiAgICB2YXIgciA9IGJ1aWxkZXIuY2FsbChzYXcuaGFuZGxlcnMsIHNhdyk7XG4gICAgaWYgKHIgIT09IHVuZGVmaW5lZCkgc2F3LmhhbmRsZXJzID0gcjtcbiAgICByZXR1cm4gc2F3LmNoYWluKCk7XG59O1xuXG5DaGFpbnNhdy5zYXcgPSBmdW5jdGlvbiAoYnVpbGRlciwgaGFuZGxlcnMpIHtcbiAgICB2YXIgc2F3ID0gbmV3IEV2ZW50RW1pdHRlcjtcbiAgICBzYXcuaGFuZGxlcnMgPSBoYW5kbGVycztcbiAgICBzYXcuYWN0aW9ucyA9IFtdO1xuXG4gICAgc2F3LmNoYWluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2ggPSBUcmF2ZXJzZShzYXcuaGFuZGxlcnMpLm1hcChmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNSb290KSByZXR1cm4gbm9kZTtcbiAgICAgICAgICAgIHZhciBwcyA9IHRoaXMucGF0aDtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBub2RlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBzYXcuYWN0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGggOiBwcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MgOiBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjaDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzYXcuZW1pdCgnYmVnaW4nKTtcbiAgICAgICAgICAgIHNhdy5uZXh0KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBjaDtcbiAgICB9O1xuXG4gICAgc2F3LnBvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHNhdy5hY3Rpb25zLnNoaWZ0KCk7XG4gICAgfTtcblxuICAgIHNhdy5uZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYWN0aW9uID0gc2F3LnBvcCgpO1xuXG4gICAgICAgIGlmICghYWN0aW9uKSB7XG4gICAgICAgICAgICBzYXcuZW1pdCgnZW5kJyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIWFjdGlvbi50cmFwKSB7XG4gICAgICAgICAgICB2YXIgbm9kZSA9IHNhdy5oYW5kbGVycztcbiAgICAgICAgICAgIGFjdGlvbi5wYXRoLmZvckVhY2goZnVuY3Rpb24gKGtleSkgeyBub2RlID0gbm9kZVtrZXldIH0pO1xuICAgICAgICAgICAgbm9kZS5hcHBseShzYXcuaGFuZGxlcnMsIGFjdGlvbi5hcmdzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBzYXcubmVzdCA9IGZ1bmN0aW9uIChjYikge1xuICAgICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgdmFyIGF1dG9uZXh0ID0gdHJ1ZTtcblxuICAgICAgICBpZiAodHlwZW9mIGNiID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHZhciBhdXRvbmV4dCA9IGNiO1xuICAgICAgICAgICAgY2IgPSBhcmdzLnNoaWZ0KCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcyA9IENoYWluc2F3LnNhdyhidWlsZGVyLCB7fSk7XG4gICAgICAgIHZhciByID0gYnVpbGRlci5jYWxsKHMuaGFuZGxlcnMsIHMpO1xuXG4gICAgICAgIGlmIChyICE9PSB1bmRlZmluZWQpIHMuaGFuZGxlcnMgPSByO1xuXG4gICAgICAgIC8vIElmIHdlIGFyZSByZWNvcmRpbmcuLi5cbiAgICAgICAgaWYgKFwidW5kZWZpbmVkXCIgIT09IHR5cGVvZiBzYXcuc3RlcCkge1xuICAgICAgICAgICAgLy8gLi4uIG91ciBjaGlsZHJlbiBzaG91bGQsIHRvb1xuICAgICAgICAgICAgcy5yZWNvcmQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNiLmFwcGx5KHMuY2hhaW4oKSwgYXJncyk7XG4gICAgICAgIGlmIChhdXRvbmV4dCAhPT0gZmFsc2UpIHMub24oJ2VuZCcsIHNhdy5uZXh0KTtcbiAgICB9O1xuXG4gICAgc2F3LnJlY29yZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdXBncmFkZUNoYWluc2F3KHNhdyk7XG4gICAgfTtcblxuICAgIFsndHJhcCcsICdkb3duJywgJ2p1bXAnXS5mb3JFYWNoKGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgICAgICAgc2F3W21ldGhvZF0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUbyB1c2UgdGhlIHRyYXAsIGRvd24gYW5kIGp1bXAgZmVhdHVyZXMsIHBsZWFzZSBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImNhbGwgcmVjb3JkKCkgZmlyc3QgdG8gc3RhcnQgcmVjb3JkaW5nIGFjdGlvbnMuXCIpO1xuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHNhdztcbn07XG5cbmZ1bmN0aW9uIHVwZ3JhZGVDaGFpbnNhdyhzYXcpIHtcbiAgICBzYXcuc3RlcCA9IDA7XG5cbiAgICAvLyBvdmVycmlkZSBwb3BcbiAgICBzYXcucG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gc2F3LmFjdGlvbnNbc2F3LnN0ZXArK107XG4gICAgfTtcblxuICAgIHNhdy50cmFwID0gZnVuY3Rpb24gKG5hbWUsIGNiKSB7XG4gICAgICAgIHZhciBwcyA9IEFycmF5LmlzQXJyYXkobmFtZSkgPyBuYW1lIDogW25hbWVdO1xuICAgICAgICBzYXcuYWN0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgIHBhdGggOiBwcyxcbiAgICAgICAgICAgIHN0ZXAgOiBzYXcuc3RlcCxcbiAgICAgICAgICAgIGNiIDogY2IsXG4gICAgICAgICAgICB0cmFwIDogdHJ1ZVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgc2F3LmRvd24gPSBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICB2YXIgcHMgPSAoQXJyYXkuaXNBcnJheShuYW1lKSA/IG5hbWUgOiBbbmFtZV0pLmpvaW4oJy8nKTtcbiAgICAgICAgdmFyIGkgPSBzYXcuYWN0aW9ucy5zbGljZShzYXcuc3RlcCkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICBpZiAoeC50cmFwICYmIHguc3RlcCA8PSBzYXcuc3RlcCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuIHgucGF0aC5qb2luKCcvJykgPT0gcHM7XG4gICAgICAgIH0pLmluZGV4T2YodHJ1ZSk7XG5cbiAgICAgICAgaWYgKGkgPj0gMCkgc2F3LnN0ZXAgKz0gaTtcbiAgICAgICAgZWxzZSBzYXcuc3RlcCA9IHNhdy5hY3Rpb25zLmxlbmd0aDtcblxuICAgICAgICB2YXIgYWN0ID0gc2F3LmFjdGlvbnNbc2F3LnN0ZXAgLSAxXTtcbiAgICAgICAgaWYgKGFjdCAmJiBhY3QudHJhcCkge1xuICAgICAgICAgICAgLy8gSXQncyBhIHRyYXAhXG4gICAgICAgICAgICBzYXcuc3RlcCA9IGFjdC5zdGVwO1xuICAgICAgICAgICAgYWN0LmNiKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBzYXcubmV4dCgpO1xuICAgIH07XG5cbiAgICBzYXcuanVtcCA9IGZ1bmN0aW9uIChzdGVwKSB7XG4gICAgICAgIHNhdy5zdGVwID0gc3RlcDtcbiAgICAgICAgc2F3Lm5leHQoKTtcbiAgICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHhzLCBmbikge1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciB4ID0gZm4oeHNbaV0sIGkpO1xuICAgICAgICBpZiAoaXNBcnJheSh4KSkgcmVzLnB1c2guYXBwbHkocmVzLCB4KTtcbiAgICAgICAgZWxzZSByZXMucHVzaCh4KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn07XG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHhzKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gTk9URTogVGhlc2UgdHlwZSBjaGVja2luZyBmdW5jdGlvbnMgaW50ZW50aW9uYWxseSBkb24ndCB1c2UgYGluc3RhbmNlb2ZgXG4vLyBiZWNhdXNlIGl0IGlzIGZyYWdpbGUgYW5kIGNhbiBiZSBlYXNpbHkgZmFrZWQgd2l0aCBgT2JqZWN0LmNyZWF0ZSgpYC5cblxuZnVuY3Rpb24gaXNBcnJheShhcmcpIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkpIHtcbiAgICByZXR1cm4gQXJyYXkuaXNBcnJheShhcmcpO1xuICB9XG4gIHJldHVybiBvYmplY3RUb1N0cmluZyhhcmcpID09PSAnW29iamVjdCBBcnJheV0nO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaXNCb29sZWFuKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nO1xufVxuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuXG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xufVxuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1N5bWJvbChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnO1xufVxuZXhwb3J0cy5pc1N5bWJvbCA9IGlzU3ltYm9sO1xuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gKG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nIHx8IGUgaW5zdGFuY2VvZiBFcnJvcik7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCcgfHwgIC8vIEVTNiBzeW1ib2xcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnO1xufVxuZXhwb3J0cy5pc1ByaW1pdGl2ZSA9IGlzUHJpbWl0aXZlO1xuXG5leHBvcnRzLmlzQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyLmlzQnVmZmVyO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlYWxwYXRoXG5yZWFscGF0aC5yZWFscGF0aCA9IHJlYWxwYXRoXG5yZWFscGF0aC5zeW5jID0gcmVhbHBhdGhTeW5jXG5yZWFscGF0aC5yZWFscGF0aFN5bmMgPSByZWFscGF0aFN5bmNcbnJlYWxwYXRoLm1vbmtleXBhdGNoID0gbW9ua2V5cGF0Y2hcbnJlYWxwYXRoLnVubW9ua2V5cGF0Y2ggPSB1bm1vbmtleXBhdGNoXG5cbnZhciBmcyA9IHJlcXVpcmUoJ2ZzJylcbnZhciBvcmlnUmVhbHBhdGggPSBmcy5yZWFscGF0aFxudmFyIG9yaWdSZWFscGF0aFN5bmMgPSBmcy5yZWFscGF0aFN5bmNcblxudmFyIHZlcnNpb24gPSBwcm9jZXNzLnZlcnNpb25cbnZhciBvayA9IC9edlswLTVdXFwuLy50ZXN0KHZlcnNpb24pXG52YXIgb2xkID0gcmVxdWlyZSgnLi9vbGQuanMnKVxuXG5mdW5jdGlvbiBuZXdFcnJvciAoZXIpIHtcbiAgcmV0dXJuIGVyICYmIGVyLnN5c2NhbGwgPT09ICdyZWFscGF0aCcgJiYgKFxuICAgIGVyLmNvZGUgPT09ICdFTE9PUCcgfHxcbiAgICBlci5jb2RlID09PSAnRU5PTUVNJyB8fFxuICAgIGVyLmNvZGUgPT09ICdFTkFNRVRPT0xPTkcnXG4gIClcbn1cblxuZnVuY3Rpb24gcmVhbHBhdGggKHAsIGNhY2hlLCBjYikge1xuICBpZiAob2spIHtcbiAgICByZXR1cm4gb3JpZ1JlYWxwYXRoKHAsIGNhY2hlLCBjYilcbiAgfVxuXG4gIGlmICh0eXBlb2YgY2FjaGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYiA9IGNhY2hlXG4gICAgY2FjaGUgPSBudWxsXG4gIH1cbiAgb3JpZ1JlYWxwYXRoKHAsIGNhY2hlLCBmdW5jdGlvbiAoZXIsIHJlc3VsdCkge1xuICAgIGlmIChuZXdFcnJvcihlcikpIHtcbiAgICAgIG9sZC5yZWFscGF0aChwLCBjYWNoZSwgY2IpXG4gICAgfSBlbHNlIHtcbiAgICAgIGNiKGVyLCByZXN1bHQpXG4gICAgfVxuICB9KVxufVxuXG5mdW5jdGlvbiByZWFscGF0aFN5bmMgKHAsIGNhY2hlKSB7XG4gIGlmIChvaykge1xuICAgIHJldHVybiBvcmlnUmVhbHBhdGhTeW5jKHAsIGNhY2hlKVxuICB9XG5cbiAgdHJ5IHtcbiAgICByZXR1cm4gb3JpZ1JlYWxwYXRoU3luYyhwLCBjYWNoZSlcbiAgfSBjYXRjaCAoZXIpIHtcbiAgICBpZiAobmV3RXJyb3IoZXIpKSB7XG4gICAgICByZXR1cm4gb2xkLnJlYWxwYXRoU3luYyhwLCBjYWNoZSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgZXJcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gbW9ua2V5cGF0Y2ggKCkge1xuICBmcy5yZWFscGF0aCA9IHJlYWxwYXRoXG4gIGZzLnJlYWxwYXRoU3luYyA9IHJlYWxwYXRoU3luY1xufVxuXG5mdW5jdGlvbiB1bm1vbmtleXBhdGNoICgpIHtcbiAgZnMucmVhbHBhdGggPSBvcmlnUmVhbHBhdGhcbiAgZnMucmVhbHBhdGhTeW5jID0gb3JpZ1JlYWxwYXRoU3luY1xufVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBwYXRoTW9kdWxlID0gcmVxdWlyZSgncGF0aCcpO1xudmFyIGlzV2luZG93cyA9IHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMic7XG52YXIgZnMgPSByZXF1aXJlKCdmcycpO1xuXG4vLyBKYXZhU2NyaXB0IGltcGxlbWVudGF0aW9uIG9mIHJlYWxwYXRoLCBwb3J0ZWQgZnJvbSBub2RlIHByZS12NlxuXG52YXIgREVCVUcgPSBwcm9jZXNzLmVudi5OT0RFX0RFQlVHICYmIC9mcy8udGVzdChwcm9jZXNzLmVudi5OT0RFX0RFQlVHKTtcblxuZnVuY3Rpb24gcmV0aHJvdygpIHtcbiAgLy8gT25seSBlbmFibGUgaW4gZGVidWcgbW9kZS4gQSBiYWNrdHJhY2UgdXNlcyB+MTAwMCBieXRlcyBvZiBoZWFwIHNwYWNlIGFuZFxuICAvLyBpcyBmYWlybHkgc2xvdyB0byBnZW5lcmF0ZS5cbiAgdmFyIGNhbGxiYWNrO1xuICBpZiAoREVCVUcpIHtcbiAgICB2YXIgYmFja3RyYWNlID0gbmV3IEVycm9yO1xuICAgIGNhbGxiYWNrID0gZGVidWdDYWxsYmFjaztcbiAgfSBlbHNlXG4gICAgY2FsbGJhY2sgPSBtaXNzaW5nQ2FsbGJhY2s7XG5cbiAgcmV0dXJuIGNhbGxiYWNrO1xuXG4gIGZ1bmN0aW9uIGRlYnVnQ2FsbGJhY2soZXJyKSB7XG4gICAgaWYgKGVycikge1xuICAgICAgYmFja3RyYWNlLm1lc3NhZ2UgPSBlcnIubWVzc2FnZTtcbiAgICAgIGVyciA9IGJhY2t0cmFjZTtcbiAgICAgIG1pc3NpbmdDYWxsYmFjayhlcnIpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG1pc3NpbmdDYWxsYmFjayhlcnIpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKVxuICAgICAgICB0aHJvdyBlcnI7ICAvLyBGb3Jnb3QgYSBjYWxsYmFjayBidXQgZG9uJ3Qga25vdyB3aGVyZT8gVXNlIE5PREVfREVCVUc9ZnNcbiAgICAgIGVsc2UgaWYgKCFwcm9jZXNzLm5vRGVwcmVjYXRpb24pIHtcbiAgICAgICAgdmFyIG1zZyA9ICdmczogbWlzc2luZyBjYWxsYmFjayAnICsgKGVyci5zdGFjayB8fCBlcnIubWVzc2FnZSk7XG4gICAgICAgIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pXG4gICAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBtYXliZUNhbGxiYWNrKGNiKSB7XG4gIHJldHVybiB0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicgPyBjYiA6IHJldGhyb3coKTtcbn1cblxudmFyIG5vcm1hbGl6ZSA9IHBhdGhNb2R1bGUubm9ybWFsaXplO1xuXG4vLyBSZWdleHAgdGhhdCBmaW5kcyB0aGUgbmV4dCBwYXJ0aW9uIG9mIGEgKHBhcnRpYWwpIHBhdGhcbi8vIHJlc3VsdCBpcyBbYmFzZV93aXRoX3NsYXNoLCBiYXNlXSwgZS5nLiBbJ3NvbWVkaXIvJywgJ3NvbWVkaXInXVxuaWYgKGlzV2luZG93cykge1xuICB2YXIgbmV4dFBhcnRSZSA9IC8oLio/KSg/OltcXC9cXFxcXSt8JCkvZztcbn0gZWxzZSB7XG4gIHZhciBuZXh0UGFydFJlID0gLyguKj8pKD86W1xcL10rfCQpL2c7XG59XG5cbi8vIFJlZ2V4IHRvIGZpbmQgdGhlIGRldmljZSByb290LCBpbmNsdWRpbmcgdHJhaWxpbmcgc2xhc2guIEUuZy4gJ2M6XFxcXCcuXG5pZiAoaXNXaW5kb3dzKSB7XG4gIHZhciBzcGxpdFJvb3RSZSA9IC9eKD86W2EtekEtWl06fFtcXFxcXFwvXXsyfVteXFxcXFxcL10rW1xcXFxcXC9dW15cXFxcXFwvXSspP1tcXFxcXFwvXSovO1xufSBlbHNlIHtcbiAgdmFyIHNwbGl0Um9vdFJlID0gL15bXFwvXSovO1xufVxuXG5leHBvcnRzLnJlYWxwYXRoU3luYyA9IGZ1bmN0aW9uIHJlYWxwYXRoU3luYyhwLCBjYWNoZSkge1xuICAvLyBtYWtlIHAgaXMgYWJzb2x1dGVcbiAgcCA9IHBhdGhNb2R1bGUucmVzb2x2ZShwKTtcblxuICBpZiAoY2FjaGUgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNhY2hlLCBwKSkge1xuICAgIHJldHVybiBjYWNoZVtwXTtcbiAgfVxuXG4gIHZhciBvcmlnaW5hbCA9IHAsXG4gICAgICBzZWVuTGlua3MgPSB7fSxcbiAgICAgIGtub3duSGFyZCA9IHt9O1xuXG4gIC8vIGN1cnJlbnQgY2hhcmFjdGVyIHBvc2l0aW9uIGluIHBcbiAgdmFyIHBvcztcbiAgLy8gdGhlIHBhcnRpYWwgcGF0aCBzbyBmYXIsIGluY2x1ZGluZyBhIHRyYWlsaW5nIHNsYXNoIGlmIGFueVxuICB2YXIgY3VycmVudDtcbiAgLy8gdGhlIHBhcnRpYWwgcGF0aCB3aXRob3V0IGEgdHJhaWxpbmcgc2xhc2ggKGV4Y2VwdCB3aGVuIHBvaW50aW5nIGF0IGEgcm9vdClcbiAgdmFyIGJhc2U7XG4gIC8vIHRoZSBwYXJ0aWFsIHBhdGggc2Nhbm5lZCBpbiB0aGUgcHJldmlvdXMgcm91bmQsIHdpdGggc2xhc2hcbiAgdmFyIHByZXZpb3VzO1xuXG4gIHN0YXJ0KCk7XG5cbiAgZnVuY3Rpb24gc3RhcnQoKSB7XG4gICAgLy8gU2tpcCBvdmVyIHJvb3RzXG4gICAgdmFyIG0gPSBzcGxpdFJvb3RSZS5leGVjKHApO1xuICAgIHBvcyA9IG1bMF0ubGVuZ3RoO1xuICAgIGN1cnJlbnQgPSBtWzBdO1xuICAgIGJhc2UgPSBtWzBdO1xuICAgIHByZXZpb3VzID0gJyc7XG5cbiAgICAvLyBPbiB3aW5kb3dzLCBjaGVjayB0aGF0IHRoZSByb290IGV4aXN0cy4gT24gdW5peCB0aGVyZSBpcyBubyBuZWVkLlxuICAgIGlmIChpc1dpbmRvd3MgJiYgIWtub3duSGFyZFtiYXNlXSkge1xuICAgICAgZnMubHN0YXRTeW5jKGJhc2UpO1xuICAgICAga25vd25IYXJkW2Jhc2VdID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICAvLyB3YWxrIGRvd24gdGhlIHBhdGgsIHN3YXBwaW5nIG91dCBsaW5rZWQgcGF0aHBhcnRzIGZvciB0aGVpciByZWFsXG4gIC8vIHZhbHVlc1xuICAvLyBOQjogcC5sZW5ndGggY2hhbmdlcy5cbiAgd2hpbGUgKHBvcyA8IHAubGVuZ3RoKSB7XG4gICAgLy8gZmluZCB0aGUgbmV4dCBwYXJ0XG4gICAgbmV4dFBhcnRSZS5sYXN0SW5kZXggPSBwb3M7XG4gICAgdmFyIHJlc3VsdCA9IG5leHRQYXJ0UmUuZXhlYyhwKTtcbiAgICBwcmV2aW91cyA9IGN1cnJlbnQ7XG4gICAgY3VycmVudCArPSByZXN1bHRbMF07XG4gICAgYmFzZSA9IHByZXZpb3VzICsgcmVzdWx0WzFdO1xuICAgIHBvcyA9IG5leHRQYXJ0UmUubGFzdEluZGV4O1xuXG4gICAgLy8gY29udGludWUgaWYgbm90IGEgc3ltbGlua1xuICAgIGlmIChrbm93bkhhcmRbYmFzZV0gfHwgKGNhY2hlICYmIGNhY2hlW2Jhc2VdID09PSBiYXNlKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdmFyIHJlc29sdmVkTGluaztcbiAgICBpZiAoY2FjaGUgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNhY2hlLCBiYXNlKSkge1xuICAgICAgLy8gc29tZSBrbm93biBzeW1ib2xpYyBsaW5rLiAgbm8gbmVlZCB0byBzdGF0IGFnYWluLlxuICAgICAgcmVzb2x2ZWRMaW5rID0gY2FjaGVbYmFzZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBzdGF0ID0gZnMubHN0YXRTeW5jKGJhc2UpO1xuICAgICAgaWYgKCFzdGF0LmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAga25vd25IYXJkW2Jhc2VdID0gdHJ1ZTtcbiAgICAgICAgaWYgKGNhY2hlKSBjYWNoZVtiYXNlXSA9IGJhc2U7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyByZWFkIHRoZSBsaW5rIGlmIGl0IHdhc24ndCByZWFkIGJlZm9yZVxuICAgICAgLy8gZGV2L2lubyBhbHdheXMgcmV0dXJuIDAgb24gd2luZG93cywgc28gc2tpcCB0aGUgY2hlY2suXG4gICAgICB2YXIgbGlua1RhcmdldCA9IG51bGw7XG4gICAgICBpZiAoIWlzV2luZG93cykge1xuICAgICAgICB2YXIgaWQgPSBzdGF0LmRldi50b1N0cmluZygzMikgKyAnOicgKyBzdGF0Lmluby50b1N0cmluZygzMik7XG4gICAgICAgIGlmIChzZWVuTGlua3MuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgbGlua1RhcmdldCA9IHNlZW5MaW5rc1tpZF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChsaW5rVGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICAgIGZzLnN0YXRTeW5jKGJhc2UpO1xuICAgICAgICBsaW5rVGFyZ2V0ID0gZnMucmVhZGxpbmtTeW5jKGJhc2UpO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZWRMaW5rID0gcGF0aE1vZHVsZS5yZXNvbHZlKHByZXZpb3VzLCBsaW5rVGFyZ2V0KTtcbiAgICAgIC8vIHRyYWNrIHRoaXMsIGlmIGdpdmVuIGEgY2FjaGUuXG4gICAgICBpZiAoY2FjaGUpIGNhY2hlW2Jhc2VdID0gcmVzb2x2ZWRMaW5rO1xuICAgICAgaWYgKCFpc1dpbmRvd3MpIHNlZW5MaW5rc1tpZF0gPSBsaW5rVGFyZ2V0O1xuICAgIH1cblxuICAgIC8vIHJlc29sdmUgdGhlIGxpbmssIHRoZW4gc3RhcnQgb3ZlclxuICAgIHAgPSBwYXRoTW9kdWxlLnJlc29sdmUocmVzb2x2ZWRMaW5rLCBwLnNsaWNlKHBvcykpO1xuICAgIHN0YXJ0KCk7XG4gIH1cblxuICBpZiAoY2FjaGUpIGNhY2hlW29yaWdpbmFsXSA9IHA7XG5cbiAgcmV0dXJuIHA7XG59O1xuXG5cbmV4cG9ydHMucmVhbHBhdGggPSBmdW5jdGlvbiByZWFscGF0aChwLCBjYWNoZSwgY2IpIHtcbiAgaWYgKHR5cGVvZiBjYiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNiID0gbWF5YmVDYWxsYmFjayhjYWNoZSk7XG4gICAgY2FjaGUgPSBudWxsO1xuICB9XG5cbiAgLy8gbWFrZSBwIGlzIGFic29sdXRlXG4gIHAgPSBwYXRoTW9kdWxlLnJlc29sdmUocCk7XG5cbiAgaWYgKGNhY2hlICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjYWNoZSwgcCkpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5uZXh0VGljayhjYi5iaW5kKG51bGwsIG51bGwsIGNhY2hlW3BdKSk7XG4gIH1cblxuICB2YXIgb3JpZ2luYWwgPSBwLFxuICAgICAgc2VlbkxpbmtzID0ge30sXG4gICAgICBrbm93bkhhcmQgPSB7fTtcblxuICAvLyBjdXJyZW50IGNoYXJhY3RlciBwb3NpdGlvbiBpbiBwXG4gIHZhciBwb3M7XG4gIC8vIHRoZSBwYXJ0aWFsIHBhdGggc28gZmFyLCBpbmNsdWRpbmcgYSB0cmFpbGluZyBzbGFzaCBpZiBhbnlcbiAgdmFyIGN1cnJlbnQ7XG4gIC8vIHRoZSBwYXJ0aWFsIHBhdGggd2l0aG91dCBhIHRyYWlsaW5nIHNsYXNoIChleGNlcHQgd2hlbiBwb2ludGluZyBhdCBhIHJvb3QpXG4gIHZhciBiYXNlO1xuICAvLyB0aGUgcGFydGlhbCBwYXRoIHNjYW5uZWQgaW4gdGhlIHByZXZpb3VzIHJvdW5kLCB3aXRoIHNsYXNoXG4gIHZhciBwcmV2aW91cztcblxuICBzdGFydCgpO1xuXG4gIGZ1bmN0aW9uIHN0YXJ0KCkge1xuICAgIC8vIFNraXAgb3ZlciByb290c1xuICAgIHZhciBtID0gc3BsaXRSb290UmUuZXhlYyhwKTtcbiAgICBwb3MgPSBtWzBdLmxlbmd0aDtcbiAgICBjdXJyZW50ID0gbVswXTtcbiAgICBiYXNlID0gbVswXTtcbiAgICBwcmV2aW91cyA9ICcnO1xuXG4gICAgLy8gT24gd2luZG93cywgY2hlY2sgdGhhdCB0aGUgcm9vdCBleGlzdHMuIE9uIHVuaXggdGhlcmUgaXMgbm8gbmVlZC5cbiAgICBpZiAoaXNXaW5kb3dzICYmICFrbm93bkhhcmRbYmFzZV0pIHtcbiAgICAgIGZzLmxzdGF0KGJhc2UsIGZ1bmN0aW9uKGVycikge1xuICAgICAgICBpZiAoZXJyKSByZXR1cm4gY2IoZXJyKTtcbiAgICAgICAga25vd25IYXJkW2Jhc2VdID0gdHJ1ZTtcbiAgICAgICAgTE9PUCgpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soTE9PUCk7XG4gICAgfVxuICB9XG5cbiAgLy8gd2FsayBkb3duIHRoZSBwYXRoLCBzd2FwcGluZyBvdXQgbGlua2VkIHBhdGhwYXJ0cyBmb3IgdGhlaXIgcmVhbFxuICAvLyB2YWx1ZXNcbiAgZnVuY3Rpb24gTE9PUCgpIHtcbiAgICAvLyBzdG9wIGlmIHNjYW5uZWQgcGFzdCBlbmQgb2YgcGF0aFxuICAgIGlmIChwb3MgPj0gcC5sZW5ndGgpIHtcbiAgICAgIGlmIChjYWNoZSkgY2FjaGVbb3JpZ2luYWxdID0gcDtcbiAgICAgIHJldHVybiBjYihudWxsLCBwKTtcbiAgICB9XG5cbiAgICAvLyBmaW5kIHRoZSBuZXh0IHBhcnRcbiAgICBuZXh0UGFydFJlLmxhc3RJbmRleCA9IHBvcztcbiAgICB2YXIgcmVzdWx0ID0gbmV4dFBhcnRSZS5leGVjKHApO1xuICAgIHByZXZpb3VzID0gY3VycmVudDtcbiAgICBjdXJyZW50ICs9IHJlc3VsdFswXTtcbiAgICBiYXNlID0gcHJldmlvdXMgKyByZXN1bHRbMV07XG4gICAgcG9zID0gbmV4dFBhcnRSZS5sYXN0SW5kZXg7XG5cbiAgICAvLyBjb250aW51ZSBpZiBub3QgYSBzeW1saW5rXG4gICAgaWYgKGtub3duSGFyZFtiYXNlXSB8fCAoY2FjaGUgJiYgY2FjaGVbYmFzZV0gPT09IGJhc2UpKSB7XG4gICAgICByZXR1cm4gcHJvY2Vzcy5uZXh0VGljayhMT09QKTtcbiAgICB9XG5cbiAgICBpZiAoY2FjaGUgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNhY2hlLCBiYXNlKSkge1xuICAgICAgLy8ga25vd24gc3ltYm9saWMgbGluay4gIG5vIG5lZWQgdG8gc3RhdCBhZ2Fpbi5cbiAgICAgIHJldHVybiBnb3RSZXNvbHZlZExpbmsoY2FjaGVbYmFzZV0pO1xuICAgIH1cblxuICAgIHJldHVybiBmcy5sc3RhdChiYXNlLCBnb3RTdGF0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdvdFN0YXQoZXJyLCBzdGF0KSB7XG4gICAgaWYgKGVycikgcmV0dXJuIGNiKGVycik7XG5cbiAgICAvLyBpZiBub3QgYSBzeW1saW5rLCBza2lwIHRvIHRoZSBuZXh0IHBhdGggcGFydFxuICAgIGlmICghc3RhdC5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICBrbm93bkhhcmRbYmFzZV0gPSB0cnVlO1xuICAgICAgaWYgKGNhY2hlKSBjYWNoZVtiYXNlXSA9IGJhc2U7XG4gICAgICByZXR1cm4gcHJvY2Vzcy5uZXh0VGljayhMT09QKTtcbiAgICB9XG5cbiAgICAvLyBzdGF0ICYgcmVhZCB0aGUgbGluayBpZiBub3QgcmVhZCBiZWZvcmVcbiAgICAvLyBjYWxsIGdvdFRhcmdldCBhcyBzb29uIGFzIHRoZSBsaW5rIHRhcmdldCBpcyBrbm93blxuICAgIC8vIGRldi9pbm8gYWx3YXlzIHJldHVybiAwIG9uIHdpbmRvd3MsIHNvIHNraXAgdGhlIGNoZWNrLlxuICAgIGlmICghaXNXaW5kb3dzKSB7XG4gICAgICB2YXIgaWQgPSBzdGF0LmRldi50b1N0cmluZygzMikgKyAnOicgKyBzdGF0Lmluby50b1N0cmluZygzMik7XG4gICAgICBpZiAoc2VlbkxpbmtzLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICByZXR1cm4gZ290VGFyZ2V0KG51bGwsIHNlZW5MaW5rc1tpZF0sIGJhc2UpO1xuICAgICAgfVxuICAgIH1cbiAgICBmcy5zdGF0KGJhc2UsIGZ1bmN0aW9uKGVycikge1xuICAgICAgaWYgKGVycikgcmV0dXJuIGNiKGVycik7XG5cbiAgICAgIGZzLnJlYWRsaW5rKGJhc2UsIGZ1bmN0aW9uKGVyciwgdGFyZ2V0KSB7XG4gICAgICAgIGlmICghaXNXaW5kb3dzKSBzZWVuTGlua3NbaWRdID0gdGFyZ2V0O1xuICAgICAgICBnb3RUYXJnZXQoZXJyLCB0YXJnZXQpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBnb3RUYXJnZXQoZXJyLCB0YXJnZXQsIGJhc2UpIHtcbiAgICBpZiAoZXJyKSByZXR1cm4gY2IoZXJyKTtcblxuICAgIHZhciByZXNvbHZlZExpbmsgPSBwYXRoTW9kdWxlLnJlc29sdmUocHJldmlvdXMsIHRhcmdldCk7XG4gICAgaWYgKGNhY2hlKSBjYWNoZVtiYXNlXSA9IHJlc29sdmVkTGluaztcbiAgICBnb3RSZXNvbHZlZExpbmsocmVzb2x2ZWRMaW5rKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdvdFJlc29sdmVkTGluayhyZXNvbHZlZExpbmspIHtcbiAgICAvLyByZXNvbHZlIHRoZSBsaW5rLCB0aGVuIHN0YXJ0IG92ZXJcbiAgICBwID0gcGF0aE1vZHVsZS5yZXNvbHZlKHJlc29sdmVkTGluaywgcC5zbGljZShwb3MpKTtcbiAgICBzdGFydCgpO1xuICB9XG59O1xuIiwiZXhwb3J0cy5BYnN0cmFjdCA9IHJlcXVpcmUoXCIuL2xpYi9hYnN0cmFjdC5qc1wiKVxuZXhwb3J0cy5SZWFkZXIgPSByZXF1aXJlKFwiLi9saWIvcmVhZGVyLmpzXCIpXG5leHBvcnRzLldyaXRlciA9IHJlcXVpcmUoXCIuL2xpYi93cml0ZXIuanNcIilcblxuZXhwb3J0cy5GaWxlID1cbiAgeyBSZWFkZXI6IHJlcXVpcmUoXCIuL2xpYi9maWxlLXJlYWRlci5qc1wiKVxuICAsIFdyaXRlcjogcmVxdWlyZShcIi4vbGliL2ZpbGUtd3JpdGVyLmpzXCIpIH1cblxuZXhwb3J0cy5EaXIgPSBcbiAgeyBSZWFkZXIgOiByZXF1aXJlKFwiLi9saWIvZGlyLXJlYWRlci5qc1wiKVxuICAsIFdyaXRlciA6IHJlcXVpcmUoXCIuL2xpYi9kaXItd3JpdGVyLmpzXCIpIH1cblxuZXhwb3J0cy5MaW5rID1cbiAgeyBSZWFkZXIgOiByZXF1aXJlKFwiLi9saWIvbGluay1yZWFkZXIuanNcIilcbiAgLCBXcml0ZXIgOiByZXF1aXJlKFwiLi9saWIvbGluay13cml0ZXIuanNcIikgfVxuXG5leHBvcnRzLlByb3h5ID1cbiAgeyBSZWFkZXIgOiByZXF1aXJlKFwiLi9saWIvcHJveHktcmVhZGVyLmpzXCIpXG4gICwgV3JpdGVyIDogcmVxdWlyZShcIi4vbGliL3Byb3h5LXdyaXRlci5qc1wiKSB9XG5cbmV4cG9ydHMuUmVhZGVyLkRpciA9IGV4cG9ydHMuRGlyUmVhZGVyID0gZXhwb3J0cy5EaXIuUmVhZGVyXG5leHBvcnRzLlJlYWRlci5GaWxlID0gZXhwb3J0cy5GaWxlUmVhZGVyID0gZXhwb3J0cy5GaWxlLlJlYWRlclxuZXhwb3J0cy5SZWFkZXIuTGluayA9IGV4cG9ydHMuTGlua1JlYWRlciA9IGV4cG9ydHMuTGluay5SZWFkZXJcbmV4cG9ydHMuUmVhZGVyLlByb3h5ID0gZXhwb3J0cy5Qcm94eVJlYWRlciA9IGV4cG9ydHMuUHJveHkuUmVhZGVyXG5cbmV4cG9ydHMuV3JpdGVyLkRpciA9IGV4cG9ydHMuRGlyV3JpdGVyID0gZXhwb3J0cy5EaXIuV3JpdGVyXG5leHBvcnRzLldyaXRlci5GaWxlID0gZXhwb3J0cy5GaWxlV3JpdGVyID0gZXhwb3J0cy5GaWxlLldyaXRlclxuZXhwb3J0cy5Xcml0ZXIuTGluayA9IGV4cG9ydHMuTGlua1dyaXRlciA9IGV4cG9ydHMuTGluay5Xcml0ZXJcbmV4cG9ydHMuV3JpdGVyLlByb3h5ID0gZXhwb3J0cy5Qcm94eVdyaXRlciA9IGV4cG9ydHMuUHJveHkuV3JpdGVyXG5cbmV4cG9ydHMuY29sbGVjdCA9IHJlcXVpcmUoXCIuL2xpYi9jb2xsZWN0LmpzXCIpXG4iLCIvLyB0aGUgcGFyZW50IGNsYXNzIGZvciBhbGwgZnN0cmVhbXMuXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RcblxudmFyIFN0cmVhbSA9IHJlcXVpcmUoXCJzdHJlYW1cIikuU3RyZWFtXG4gICwgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIilcblxuZnVuY3Rpb24gQWJzdHJhY3QgKCkge1xuICBTdHJlYW0uY2FsbCh0aGlzKVxufVxuXG5pbmhlcml0cyhBYnN0cmFjdCwgU3RyZWFtKVxuXG5BYnN0cmFjdC5wcm90b3R5cGUub24gPSBmdW5jdGlvbiAoZXYsIGZuKSB7XG4gIGlmIChldiA9PT0gXCJyZWFkeVwiICYmIHRoaXMucmVhZHkpIHtcbiAgICBwcm9jZXNzLm5leHRUaWNrKGZuLmJpbmQodGhpcykpXG4gIH0gZWxzZSB7XG4gICAgU3RyZWFtLnByb3RvdHlwZS5vbi5jYWxsKHRoaXMsIGV2LCBmbilcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5BYnN0cmFjdC5wcm90b3R5cGUuYWJvcnQgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuX2Fib3J0ZWQgPSB0cnVlXG4gIHRoaXMuZW1pdChcImFib3J0XCIpXG59XG5cbkFic3RyYWN0LnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge31cblxuQWJzdHJhY3QucHJvdG90eXBlLndhcm4gPSBmdW5jdGlvbiAobXNnLCBjb2RlKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgICAsIGVyID0gZGVjb3JhdGUobXNnLCBjb2RlLCBtZSlcbiAgaWYgKCFtZS5saXN0ZW5lcnMoXCJ3YXJuXCIpKSB7XG4gICAgY29uc29sZS5lcnJvcihcIiVzICVzXFxuXCIgK1xuICAgICAgICAgICAgICAgICAgXCJwYXRoID0gJXNcXG5cIiArXG4gICAgICAgICAgICAgICAgICBcInN5c2NhbGwgPSAlc1xcblwiICtcbiAgICAgICAgICAgICAgICAgIFwiZnN0cmVhbV90eXBlID0gJXNcXG5cIiArXG4gICAgICAgICAgICAgICAgICBcImZzdHJlYW1fcGF0aCA9ICVzXFxuXCIgK1xuICAgICAgICAgICAgICAgICAgXCJmc3RyZWFtX3VuY19wYXRoID0gJXNcXG5cIiArXG4gICAgICAgICAgICAgICAgICBcImZzdHJlYW1fY2xhc3MgPSAlc1xcblwiICtcbiAgICAgICAgICAgICAgICAgIFwiZnN0cmVhbV9zdGFjayA9XFxuJXNcXG5cIixcbiAgICAgICAgICAgICAgICAgIGNvZGUgfHwgXCJVTktOT1dOXCIsXG4gICAgICAgICAgICAgICAgICBlci5zdGFjayxcbiAgICAgICAgICAgICAgICAgIGVyLnBhdGgsXG4gICAgICAgICAgICAgICAgICBlci5zeXNjYWxsLFxuICAgICAgICAgICAgICAgICAgZXIuZnN0cmVhbV90eXBlLFxuICAgICAgICAgICAgICAgICAgZXIuZnN0cmVhbV9wYXRoLFxuICAgICAgICAgICAgICAgICAgZXIuZnN0cmVhbV91bmNfcGF0aCxcbiAgICAgICAgICAgICAgICAgIGVyLmZzdHJlYW1fY2xhc3MsXG4gICAgICAgICAgICAgICAgICBlci5mc3RyZWFtX3N0YWNrLmpvaW4oXCJcXG5cIikpXG4gIH0gZWxzZSB7XG4gICAgbWUuZW1pdChcIndhcm5cIiwgZXIpXG4gIH1cbn1cblxuQWJzdHJhY3QucHJvdG90eXBlLmluZm8gPSBmdW5jdGlvbiAobXNnLCBjb2RlKSB7XG4gIHRoaXMuZW1pdChcImluZm9cIiwgbXNnLCBjb2RlKVxufVxuXG5BYnN0cmFjdC5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAobXNnLCBjb2RlLCB0aCkge1xuICB2YXIgZXIgPSBkZWNvcmF0ZShtc2csIGNvZGUsIHRoaXMpXG4gIGlmICh0aCkgdGhyb3cgZXJcbiAgZWxzZSB0aGlzLmVtaXQoXCJlcnJvclwiLCBlcilcbn1cblxuZnVuY3Rpb24gZGVjb3JhdGUgKGVyLCBjb2RlLCBtZSkge1xuICBpZiAoIShlciBpbnN0YW5jZW9mIEVycm9yKSkgZXIgPSBuZXcgRXJyb3IoZXIpXG4gIGVyLmNvZGUgPSBlci5jb2RlIHx8IGNvZGVcbiAgZXIucGF0aCA9IGVyLnBhdGggfHwgbWUucGF0aFxuICBlci5mc3RyZWFtX3R5cGUgPSBlci5mc3RyZWFtX3R5cGUgfHwgbWUudHlwZVxuICBlci5mc3RyZWFtX3BhdGggPSBlci5mc3RyZWFtX3BhdGggfHwgbWUucGF0aFxuICBpZiAobWUuX3BhdGggIT09IG1lLnBhdGgpIHtcbiAgICBlci5mc3RyZWFtX3VuY19wYXRoID0gZXIuZnN0cmVhbV91bmNfcGF0aCB8fCBtZS5fcGF0aFxuICB9XG4gIGlmIChtZS5saW5rcGF0aCkge1xuICAgIGVyLmZzdHJlYW1fbGlua3BhdGggPSBlci5mc3RyZWFtX2xpbmtwYXRoIHx8IG1lLmxpbmtwYXRoXG4gIH1cbiAgZXIuZnN0cmVhbV9jbGFzcyA9IGVyLmZzdHJlYW1fY2xhc3MgfHwgbWUuY29uc3RydWN0b3IubmFtZVxuICBlci5mc3RyZWFtX3N0YWNrID0gZXIuZnN0cmVhbV9zdGFjayB8fFxuICAgIG5ldyBFcnJvcigpLnN0YWNrLnNwbGl0KC9cXG4vKS5zbGljZSgzKS5tYXAoZnVuY3Rpb24gKHMpIHtcbiAgICAgIHJldHVybiBzLnJlcGxhY2UoL14gICAgYXQgLywgXCJcIilcbiAgICB9KVxuXG4gIHJldHVybiBlclxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBjb2xsZWN0XG5cbmZ1bmN0aW9uIGNvbGxlY3QgKHN0cmVhbSkge1xuICBpZiAoc3RyZWFtLl9jb2xsZWN0ZWQpIHJldHVyblxuXG4gIHN0cmVhbS5fY29sbGVjdGVkID0gdHJ1ZVxuICBzdHJlYW0ucGF1c2UoKVxuXG4gIHN0cmVhbS5vbihcImRhdGFcIiwgc2F2ZSlcbiAgc3RyZWFtLm9uKFwiZW5kXCIsIHNhdmUpXG4gIHZhciBidWYgPSBbXVxuICBmdW5jdGlvbiBzYXZlIChiKSB7XG4gICAgaWYgKHR5cGVvZiBiID09PSBcInN0cmluZ1wiKSBiID0gbmV3IEJ1ZmZlcihiKVxuICAgIGlmIChCdWZmZXIuaXNCdWZmZXIoYikgJiYgIWIubGVuZ3RoKSByZXR1cm5cbiAgICBidWYucHVzaChiKVxuICB9XG5cbiAgc3RyZWFtLm9uKFwiZW50cnlcIiwgc2F2ZUVudHJ5KVxuICB2YXIgZW50cnlCdWZmZXIgPSBbXVxuICBmdW5jdGlvbiBzYXZlRW50cnkgKGUpIHtcbiAgICBjb2xsZWN0KGUpXG4gICAgZW50cnlCdWZmZXIucHVzaChlKVxuICB9XG5cbiAgc3RyZWFtLm9uKFwicHJveHlcIiwgcHJveHlQYXVzZSlcbiAgZnVuY3Rpb24gcHJveHlQYXVzZSAocCkge1xuICAgIHAucGF1c2UoKVxuICB9XG5cblxuICAvLyByZXBsYWNlIHRoZSBwaXBlIG1ldGhvZCB3aXRoIGEgbmV3IHZlcnNpb24gdGhhdCB3aWxsXG4gIC8vIHVubG9jayB0aGUgYnVmZmVyZWQgc3R1ZmYuICBpZiB5b3UganVzdCBjYWxsIC5waXBlKClcbiAgLy8gd2l0aG91dCBhIGRlc3RpbmF0aW9uLCB0aGVuIGl0J2xsIHJlLXBsYXkgdGhlIGV2ZW50cy5cbiAgc3RyZWFtLnBpcGUgPSAoZnVuY3Rpb24gKG9yaWcpIHsgcmV0dXJuIGZ1bmN0aW9uIChkZXN0KSB7XG4gICAgLy8gY29uc29sZS5lcnJvcihcIiA9PT0gb3BlbiB0aGUgcGlwZXNcIiwgZGVzdCAmJiBkZXN0LnBhdGgpXG5cbiAgICAvLyBsZXQgdGhlIGVudHJpZXMgZmxvdyB0aHJvdWdoIG9uZSBhdCBhIHRpbWUuXG4gICAgLy8gT25jZSB0aGV5J3JlIGFsbCBkb25lLCB0aGVuIHdlIGNhbiByZXN1bWUgY29tcGxldGVseS5cbiAgICB2YXIgZSA9IDBcbiAgICA7KGZ1bmN0aW9uIHVuYmxvY2tFbnRyeSAoKSB7XG4gICAgICB2YXIgZW50cnkgPSBlbnRyeUJ1ZmZlcltlKytdXG4gICAgICAvLyBjb25zb2xlLmVycm9yKFwiID09PT0gdW5ibG9jayBlbnRyeVwiLCBlbnRyeSAmJiBlbnRyeS5wYXRoKVxuICAgICAgaWYgKCFlbnRyeSkgcmV0dXJuIHJlc3VtZSgpXG4gICAgICBlbnRyeS5vbihcImVuZFwiLCB1bmJsb2NrRW50cnkpXG4gICAgICBpZiAoZGVzdCkgZGVzdC5hZGQoZW50cnkpXG4gICAgICBlbHNlIHN0cmVhbS5lbWl0KFwiZW50cnlcIiwgZW50cnkpXG4gICAgfSkoKVxuXG4gICAgZnVuY3Rpb24gcmVzdW1lICgpIHtcbiAgICAgIHN0cmVhbS5yZW1vdmVMaXN0ZW5lcihcImVudHJ5XCIsIHNhdmVFbnRyeSlcbiAgICAgIHN0cmVhbS5yZW1vdmVMaXN0ZW5lcihcImRhdGFcIiwgc2F2ZSlcbiAgICAgIHN0cmVhbS5yZW1vdmVMaXN0ZW5lcihcImVuZFwiLCBzYXZlKVxuXG4gICAgICBzdHJlYW0ucGlwZSA9IG9yaWdcbiAgICAgIGlmIChkZXN0KSBzdHJlYW0ucGlwZShkZXN0KVxuXG4gICAgICBidWYuZm9yRWFjaChmdW5jdGlvbiAoYikge1xuICAgICAgICBpZiAoYikgc3RyZWFtLmVtaXQoXCJkYXRhXCIsIGIpXG4gICAgICAgIGVsc2Ugc3RyZWFtLmVtaXQoXCJlbmRcIilcbiAgICAgIH0pXG5cbiAgICAgIHN0cmVhbS5yZXN1bWUoKVxuICAgIH1cblxuICAgIHJldHVybiBkZXN0XG4gIH19KShzdHJlYW0ucGlwZSlcbn1cbiIsIi8vIEEgdGhpbmcgdGhhdCBlbWl0cyBcImVudHJ5XCIgZXZlbnRzIHdpdGggUmVhZGVyIG9iamVjdHNcbi8vIFBhdXNpbmcgaXQgY2F1c2VzIGl0IHRvIHN0b3AgZW1pdHRpbmcgZW50cnkgZXZlbnRzLCBhbmQgYWxzb1xuLy8gcGF1c2VzIHRoZSBjdXJyZW50IGVudHJ5IGlmIHRoZXJlIGlzIG9uZS5cblxubW9kdWxlLmV4cG9ydHMgPSBEaXJSZWFkZXJcblxudmFyIGZzID0gcmVxdWlyZShcImdyYWNlZnVsLWZzXCIpXG4gICwgZnN0cmVhbSA9IHJlcXVpcmUoXCIuLi9mc3RyZWFtLmpzXCIpXG4gICwgUmVhZGVyID0gZnN0cmVhbS5SZWFkZXJcbiAgLCBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKVxuICAsIG1rZGlyID0gcmVxdWlyZShcIm1rZGlycFwiKVxuICAsIHBhdGggPSByZXF1aXJlKFwicGF0aFwiKVxuICAsIFJlYWRlciA9IHJlcXVpcmUoXCIuL3JlYWRlci5qc1wiKVxuICAsIGFzc2VydCA9IHJlcXVpcmUoXCJhc3NlcnRcIikub2tcblxuaW5oZXJpdHMoRGlyUmVhZGVyLCBSZWFkZXIpXG5cbmZ1bmN0aW9uIERpclJlYWRlciAocHJvcHMpIHtcbiAgdmFyIG1lID0gdGhpc1xuICBpZiAoIShtZSBpbnN0YW5jZW9mIERpclJlYWRlcikpIHRocm93IG5ldyBFcnJvcihcbiAgICBcIkRpclJlYWRlciBtdXN0IGJlIGNhbGxlZCBhcyBjb25zdHJ1Y3Rvci5cIilcblxuICAvLyBzaG91bGQgYWxyZWFkeSBiZSBlc3RhYmxpc2hlZCBhcyBhIERpcmVjdG9yeSB0eXBlXG4gIGlmIChwcm9wcy50eXBlICE9PSBcIkRpcmVjdG9yeVwiIHx8ICFwcm9wcy5EaXJlY3RvcnkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb24tZGlyZWN0b3J5IHR5cGUgXCIrIHByb3BzLnR5cGUpXG4gIH1cblxuICBtZS5lbnRyaWVzID0gbnVsbFxuICBtZS5faW5kZXggPSAtMVxuICBtZS5fcGF1c2VkID0gZmFsc2VcbiAgbWUuX2xlbmd0aCA9IC0xXG5cbiAgaWYgKHByb3BzLnNvcnQpIHtcbiAgICB0aGlzLnNvcnQgPSBwcm9wcy5zb3J0XG4gIH1cblxuICBSZWFkZXIuY2FsbCh0aGlzLCBwcm9wcylcbn1cblxuRGlyUmVhZGVyLnByb3RvdHlwZS5fZ2V0RW50cmllcyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG1lID0gdGhpc1xuXG4gIC8vIHJhY2UgY29uZGl0aW9uLiAgbWlnaHQgcGF1c2UoKSBiZWZvcmUgY2FsbGluZyBfZ2V0RW50cmllcyxcbiAgLy8gYW5kIHRoZW4gcmVzdW1lLCBhbmQgdHJ5IHRvIGdldCB0aGVtIGEgc2Vjb25kIHRpbWUuXG4gIGlmIChtZS5fZ290RW50cmllcykgcmV0dXJuXG4gIG1lLl9nb3RFbnRyaWVzID0gdHJ1ZVxuXG4gIGZzLnJlYWRkaXIobWUuX3BhdGgsIGZ1bmN0aW9uIChlciwgZW50cmllcykge1xuICAgIGlmIChlcikgcmV0dXJuIG1lLmVycm9yKGVyKVxuXG4gICAgbWUuZW50cmllcyA9IGVudHJpZXNcblxuICAgIG1lLmVtaXQoXCJlbnRyaWVzXCIsIGVudHJpZXMpXG4gICAgaWYgKG1lLl9wYXVzZWQpIG1lLm9uY2UoXCJyZXN1bWVcIiwgcHJvY2Vzc0VudHJpZXMpXG4gICAgZWxzZSBwcm9jZXNzRW50cmllcygpXG5cbiAgICBmdW5jdGlvbiBwcm9jZXNzRW50cmllcyAoKSB7XG4gICAgICBtZS5fbGVuZ3RoID0gbWUuZW50cmllcy5sZW5ndGhcbiAgICAgIGlmICh0eXBlb2YgbWUuc29ydCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIG1lLmVudHJpZXMgPSBtZS5lbnRyaWVzLnNvcnQobWUuc29ydC5iaW5kKG1lKSlcbiAgICAgIH1cbiAgICAgIG1lLl9yZWFkKClcbiAgICB9XG4gIH0pXG59XG5cbi8vIHN0YXJ0IHdhbGtpbmcgdGhlIGRpciwgYW5kIGVtaXQgYW4gXCJlbnRyeVwiIGV2ZW50IGZvciBlYWNoIG9uZS5cbkRpclJlYWRlci5wcm90b3R5cGUuX3JlYWQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBtZSA9IHRoaXNcblxuICBpZiAoIW1lLmVudHJpZXMpIHJldHVybiBtZS5fZ2V0RW50cmllcygpXG5cbiAgaWYgKG1lLl9wYXVzZWQgfHwgbWUuX2N1cnJlbnRFbnRyeSB8fCBtZS5fYWJvcnRlZCkge1xuICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJEUiBwYXVzZWQ9JWosIGN1cnJlbnQ9JWosIGFib3J0ZWQ9JWpcIiwgbWUuX3BhdXNlZCwgISFtZS5fY3VycmVudEVudHJ5LCBtZS5fYWJvcnRlZClcbiAgICByZXR1cm5cbiAgfVxuXG4gIG1lLl9pbmRleCArK1xuICBpZiAobWUuX2luZGV4ID49IG1lLmVudHJpZXMubGVuZ3RoKSB7XG4gICAgaWYgKCFtZS5fZW5kZWQpIHtcbiAgICAgIG1lLl9lbmRlZCA9IHRydWVcbiAgICAgIG1lLmVtaXQoXCJlbmRcIilcbiAgICAgIG1lLmVtaXQoXCJjbG9zZVwiKVxuICAgIH1cbiAgICByZXR1cm5cbiAgfVxuXG4gIC8vIG9rLCBoYW5kbGUgdGhpcyBvbmUsIHRoZW4uXG5cbiAgLy8gc2F2ZSBjcmVhdGluZyBhIHByb3h5LCBieSBzdGF0J2luZyB0aGUgdGhpbmcgbm93LlxuICB2YXIgcCA9IHBhdGgucmVzb2x2ZShtZS5fcGF0aCwgbWUuZW50cmllc1ttZS5faW5kZXhdKVxuICBhc3NlcnQocCAhPT0gbWUuX3BhdGgpXG4gIGFzc2VydChtZS5lbnRyaWVzW21lLl9pbmRleF0pXG5cbiAgLy8gc2V0IHRoaXMgdG8gcHJldmVudCB0cnlpbmcgdG8gX3JlYWQoKSBhZ2FpbiBpbiB0aGUgc3RhdCB0aW1lLlxuICBtZS5fY3VycmVudEVudHJ5ID0gcFxuICBmc1sgbWUucHJvcHMuZm9sbG93ID8gXCJzdGF0XCIgOiBcImxzdGF0XCIgXShwLCBmdW5jdGlvbiAoZXIsIHN0YXQpIHtcbiAgICBpZiAoZXIpIHJldHVybiBtZS5lcnJvcihlcilcblxuICAgIHZhciB3aG8gPSBtZS5fcHJveHkgfHwgbWVcblxuICAgIHN0YXQucGF0aCA9IHBcbiAgICBzdGF0LmJhc2VuYW1lID0gcGF0aC5iYXNlbmFtZShwKVxuICAgIHN0YXQuZGlybmFtZSA9IHBhdGguZGlybmFtZShwKVxuICAgIHZhciBjaGlsZFByb3BzID0gbWUuZ2V0Q2hpbGRQcm9wcy5jYWxsKHdobywgc3RhdClcbiAgICBjaGlsZFByb3BzLnBhdGggPSBwXG4gICAgY2hpbGRQcm9wcy5iYXNlbmFtZSA9IHBhdGguYmFzZW5hbWUocClcbiAgICBjaGlsZFByb3BzLmRpcm5hbWUgPSBwYXRoLmRpcm5hbWUocClcblxuICAgIHZhciBlbnRyeSA9IFJlYWRlcihjaGlsZFByb3BzLCBzdGF0KVxuXG4gICAgLy8gY29uc29sZS5lcnJvcihcIkRSIEVudHJ5XCIsIHAsIHN0YXQuc2l6ZSlcblxuICAgIG1lLl9jdXJyZW50RW50cnkgPSBlbnRyeVxuXG4gICAgLy8gXCJlbnRyeVwiIGV2ZW50cyBhcmUgZm9yIGRpcmVjdCBlbnRyaWVzIGluIGEgc3BlY2lmaWMgZGlyLlxuICAgIC8vIFwiY2hpbGRcIiBldmVudHMgYXJlIGZvciBhbnkgYW5kIGFsbCBjaGlsZHJlbiBhdCBhbGwgbGV2ZWxzLlxuICAgIC8vIFRoaXMgbm9tZW5jbGF0dXJlIGlzIG5vdCBjb21wbGV0ZWx5IGZpbmFsLlxuXG4gICAgZW50cnkub24oXCJwYXVzZVwiLCBmdW5jdGlvbiAod2hvKSB7XG4gICAgICBpZiAoIW1lLl9wYXVzZWQgJiYgIWVudHJ5Ll9kaXNvd25lZCkge1xuICAgICAgICBtZS5wYXVzZSh3aG8pXG4gICAgICB9XG4gICAgfSlcblxuICAgIGVudHJ5Lm9uKFwicmVzdW1lXCIsIGZ1bmN0aW9uICh3aG8pIHtcbiAgICAgIGlmIChtZS5fcGF1c2VkICYmICFlbnRyeS5fZGlzb3duZWQpIHtcbiAgICAgICAgbWUucmVzdW1lKHdobylcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgZW50cnkub24oXCJzdGF0XCIsIGZ1bmN0aW9uIChwcm9wcykge1xuICAgICAgbWUuZW1pdChcIl9lbnRyeVN0YXRcIiwgZW50cnksIHByb3BzKVxuICAgICAgaWYgKGVudHJ5Ll9hYm9ydGVkKSByZXR1cm5cbiAgICAgIGlmIChlbnRyeS5fcGF1c2VkKSBlbnRyeS5vbmNlKFwicmVzdW1lXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbWUuZW1pdChcImVudHJ5U3RhdFwiLCBlbnRyeSwgcHJvcHMpXG4gICAgICB9KVxuICAgICAgZWxzZSBtZS5lbWl0KFwiZW50cnlTdGF0XCIsIGVudHJ5LCBwcm9wcylcbiAgICB9KVxuXG4gICAgZW50cnkub24oXCJyZWFkeVwiLCBmdW5jdGlvbiBFTUlUQ0hJTEQgKCkge1xuICAgICAgLy8gY29uc29sZS5lcnJvcihcIkRSIGVtaXQgY2hpbGRcIiwgZW50cnkuX3BhdGgpXG4gICAgICBpZiAobWUuX3BhdXNlZCkge1xuICAgICAgICAvLyBjb25zb2xlLmVycm9yKFwiICBEUiBlbWl0IGNoaWxkIC0gdHJ5IGFnYWluIGxhdGVyXCIpXG4gICAgICAgIC8vIHBhdXNlIHRoZSBjaGlsZCwgYW5kIGVtaXQgdGhlIFwiZW50cnlcIiBldmVudCBvbmNlIHdlIGRyYWluLlxuICAgICAgICAvLyBjb25zb2xlLmVycm9yKFwiRFIgcGF1c2luZyBjaGlsZCBlbnRyeVwiKVxuICAgICAgICBlbnRyeS5wYXVzZShtZSlcbiAgICAgICAgcmV0dXJuIG1lLm9uY2UoXCJyZXN1bWVcIiwgRU1JVENISUxEKVxuICAgICAgfVxuXG4gICAgICAvLyBza2lwIG92ZXIgc29ja2V0cy4gIHRoZXkgY2FuJ3QgYmUgcGlwZWQgYXJvdW5kIHByb3Blcmx5LFxuICAgICAgLy8gc28gdGhlcmUncyByZWFsbHkgbm8gc2Vuc2UgZXZlbiBhY2tub3dsZWRnaW5nIHRoZW0uXG4gICAgICAvLyBpZiBzb21lb25lIHJlYWxseSB3YW50cyB0byBzZWUgdGhlbSwgdGhleSBjYW4gbGlzdGVuIHRvXG4gICAgICAvLyB0aGUgXCJzb2NrZXRcIiBldmVudHMuXG4gICAgICBpZiAoZW50cnkudHlwZSA9PT0gXCJTb2NrZXRcIikge1xuICAgICAgICBtZS5lbWl0KFwic29ja2V0XCIsIGVudHJ5KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWUuZW1pdEVudHJ5KGVudHJ5KVxuICAgICAgfVxuICAgIH0pXG5cbiAgICB2YXIgZW5kZWQgPSBmYWxzZVxuICAgIGVudHJ5Lm9uKFwiY2xvc2VcIiwgb25lbmQpXG4gICAgZW50cnkub24oXCJkaXNvd25cIiwgb25lbmQpXG4gICAgZnVuY3Rpb24gb25lbmQgKCkge1xuICAgICAgaWYgKGVuZGVkKSByZXR1cm5cbiAgICAgIGVuZGVkID0gdHJ1ZVxuICAgICAgbWUuZW1pdChcImNoaWxkRW5kXCIsIGVudHJ5KVxuICAgICAgbWUuZW1pdChcImVudHJ5RW5kXCIsIGVudHJ5KVxuICAgICAgbWUuX2N1cnJlbnRFbnRyeSA9IG51bGxcbiAgICAgIGlmICghbWUuX3BhdXNlZCkge1xuICAgICAgICBtZS5fcmVhZCgpXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gWFhYIFJlbW92ZSB0aGlzLiAgV29ya3MgaW4gbm9kZSBhcyBvZiAwLjYuMiBvciBzby5cbiAgICAvLyBMb25nIGZpbGVuYW1lcyBzaG91bGQgbm90IGJyZWFrIHN0dWZmLlxuICAgIGVudHJ5Lm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24gKGVyKSB7XG4gICAgICBpZiAoZW50cnkuX3N3YWxsb3dFcnJvcnMpIHtcbiAgICAgICAgbWUud2FybihlcilcbiAgICAgICAgZW50cnkuZW1pdChcImVuZFwiKVxuICAgICAgICBlbnRyeS5lbWl0KFwiY2xvc2VcIilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1lLmVtaXQoXCJlcnJvclwiLCBlcilcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gcHJveHkgdXAgc29tZSBldmVudHMuXG4gICAgOyBbIFwiY2hpbGRcIlxuICAgICAgLCBcImNoaWxkRW5kXCJcbiAgICAgICwgXCJ3YXJuXCJcbiAgICAgIF0uZm9yRWFjaChmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgZW50cnkub24oZXYsIG1lLmVtaXQuYmluZChtZSwgZXYpKVxuICAgICAgfSlcbiAgfSlcbn1cblxuRGlyUmVhZGVyLnByb3RvdHlwZS5kaXNvd24gPSBmdW5jdGlvbiAoZW50cnkpIHtcbiAgZW50cnkuZW1pdChcImJlZm9yZURpc293blwiKVxuICBlbnRyeS5fZGlzb3duZWQgPSB0cnVlXG4gIGVudHJ5LnBhcmVudCA9IGVudHJ5LnJvb3QgPSBudWxsXG4gIGlmIChlbnRyeSA9PT0gdGhpcy5fY3VycmVudEVudHJ5KSB7XG4gICAgdGhpcy5fY3VycmVudEVudHJ5ID0gbnVsbFxuICB9XG4gIGVudHJ5LmVtaXQoXCJkaXNvd25cIilcbn1cblxuRGlyUmVhZGVyLnByb3RvdHlwZS5nZXRDaGlsZFByb3BzID0gZnVuY3Rpb24gKHN0YXQpIHtcbiAgcmV0dXJuIHsgZGVwdGg6IHRoaXMuZGVwdGggKyAxXG4gICAgICAgICAsIHJvb3Q6IHRoaXMucm9vdCB8fCB0aGlzXG4gICAgICAgICAsIHBhcmVudDogdGhpc1xuICAgICAgICAgLCBmb2xsb3c6IHRoaXMuZm9sbG93XG4gICAgICAgICAsIGZpbHRlcjogdGhpcy5maWx0ZXJcbiAgICAgICAgICwgc29ydDogdGhpcy5wcm9wcy5zb3J0XG4gICAgICAgICAsIGhhcmRsaW5rczogdGhpcy5wcm9wcy5oYXJkbGlua3NcbiAgICAgICAgIH1cbn1cblxuRGlyUmVhZGVyLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uICh3aG8pIHtcbiAgdmFyIG1lID0gdGhpc1xuICBpZiAobWUuX3BhdXNlZCkgcmV0dXJuXG4gIHdobyA9IHdobyB8fCBtZVxuICBtZS5fcGF1c2VkID0gdHJ1ZVxuICBpZiAobWUuX2N1cnJlbnRFbnRyeSAmJiBtZS5fY3VycmVudEVudHJ5LnBhdXNlKSB7XG4gICAgbWUuX2N1cnJlbnRFbnRyeS5wYXVzZSh3aG8pXG4gIH1cbiAgbWUuZW1pdChcInBhdXNlXCIsIHdobylcbn1cblxuRGlyUmVhZGVyLnByb3RvdHlwZS5yZXN1bWUgPSBmdW5jdGlvbiAod2hvKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgaWYgKCFtZS5fcGF1c2VkKSByZXR1cm5cbiAgd2hvID0gd2hvIHx8IG1lXG5cbiAgbWUuX3BhdXNlZCA9IGZhbHNlXG4gIC8vIGNvbnNvbGUuZXJyb3IoXCJEUiBFbWl0IFJlc3VtZVwiLCBtZS5fcGF0aClcbiAgbWUuZW1pdChcInJlc3VtZVwiLCB3aG8pXG4gIGlmIChtZS5fcGF1c2VkKSB7XG4gICAgLy8gY29uc29sZS5lcnJvcihcIkRSIFJlLXBhdXNlZFwiLCBtZS5fcGF0aClcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChtZS5fY3VycmVudEVudHJ5KSB7XG4gICAgaWYgKG1lLl9jdXJyZW50RW50cnkucmVzdW1lKSBtZS5fY3VycmVudEVudHJ5LnJlc3VtZSh3aG8pXG4gIH0gZWxzZSBtZS5fcmVhZCgpXG59XG5cbkRpclJlYWRlci5wcm90b3R5cGUuZW1pdEVudHJ5ID0gZnVuY3Rpb24gKGVudHJ5KSB7XG4gIHRoaXMuZW1pdChcImVudHJ5XCIsIGVudHJ5KVxuICB0aGlzLmVtaXQoXCJjaGlsZFwiLCBlbnRyeSlcbn1cbiIsIi8vIEl0IGlzIGV4cGVjdGVkIHRoYXQsIHdoZW4gLmFkZCgpIHJldHVybnMgZmFsc2UsIHRoZSBjb25zdW1lclxuLy8gb2YgdGhlIERpcldyaXRlciB3aWxsIHBhdXNlIHVudGlsIGEgXCJkcmFpblwiIGV2ZW50IG9jY3Vycy4gTm90ZVxuLy8gdGhhdCB0aGlzIGlzICphbG1vc3QgYWx3YXlzIGdvaW5nIHRvIGJlIHRoZSBjYXNlKiwgdW5sZXNzIHRoZVxuLy8gdGhpbmcgYmVpbmcgd3JpdHRlbiBpcyBzb21lIHNvcnQgb2YgdW5zdXBwb3J0ZWQgdHlwZSwgYW5kIHRodXNcbi8vIHNraXBwZWQgb3Zlci5cblxubW9kdWxlLmV4cG9ydHMgPSBEaXJXcml0ZXJcblxudmFyIGZzID0gcmVxdWlyZShcImdyYWNlZnVsLWZzXCIpXG4gICwgZnN0cmVhbSA9IHJlcXVpcmUoXCIuLi9mc3RyZWFtLmpzXCIpXG4gICwgV3JpdGVyID0gcmVxdWlyZShcIi4vd3JpdGVyLmpzXCIpXG4gICwgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIilcbiAgLCBta2RpciA9IHJlcXVpcmUoXCJta2RpcnBcIilcbiAgLCBwYXRoID0gcmVxdWlyZShcInBhdGhcIilcbiAgLCBjb2xsZWN0ID0gcmVxdWlyZShcIi4vY29sbGVjdC5qc1wiKVxuXG5pbmhlcml0cyhEaXJXcml0ZXIsIFdyaXRlcilcblxuZnVuY3Rpb24gRGlyV3JpdGVyIChwcm9wcykge1xuICB2YXIgbWUgPSB0aGlzXG4gIGlmICghKG1lIGluc3RhbmNlb2YgRGlyV3JpdGVyKSkgbWUuZXJyb3IoXG4gICAgXCJEaXJXcml0ZXIgbXVzdCBiZSBjYWxsZWQgYXMgY29uc3RydWN0b3IuXCIsIG51bGwsIHRydWUpXG5cbiAgLy8gc2hvdWxkIGFscmVhZHkgYmUgZXN0YWJsaXNoZWQgYXMgYSBEaXJlY3RvcnkgdHlwZVxuICBpZiAocHJvcHMudHlwZSAhPT0gXCJEaXJlY3RvcnlcIiB8fCAhcHJvcHMuRGlyZWN0b3J5KSB7XG4gICAgbWUuZXJyb3IoXCJOb24tZGlyZWN0b3J5IHR5cGUgXCIrIHByb3BzLnR5cGUgKyBcIiBcIiArXG4gICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHByb3BzKSwgbnVsbCwgdHJ1ZSlcbiAgfVxuXG4gIFdyaXRlci5jYWxsKHRoaXMsIHByb3BzKVxufVxuXG5EaXJXcml0ZXIucHJvdG90eXBlLl9jcmVhdGUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgbWtkaXIobWUuX3BhdGgsIFdyaXRlci5kaXJtb2RlLCBmdW5jdGlvbiAoZXIpIHtcbiAgICBpZiAoZXIpIHJldHVybiBtZS5lcnJvcihlcilcbiAgICAvLyByZWFkeSB0byBzdGFydCBnZXR0aW5nIGVudHJpZXMhXG4gICAgbWUucmVhZHkgPSB0cnVlXG4gICAgbWUuZW1pdChcInJlYWR5XCIpXG4gICAgbWUuX3Byb2Nlc3MoKVxuICB9KVxufVxuXG4vLyBhIERpcldyaXRlciBoYXMgYW4gYWRkKGVudHJ5KSBtZXRob2QsIGJ1dCBpdHMgLndyaXRlKCkgZG9lc24ndFxuLy8gZG8gYW55dGhpbmcuICBXaHkgYSBuby1vcCByYXRoZXIgdGhhbiBhIHRocm93PyAgQmVjYXVzZSB0aGlzXG4vLyBsZWF2ZXMgb3BlbiB0aGUgZG9vciBmb3Igd3JpdGluZyBkaXJlY3RvcnkgbWV0YWRhdGEgZm9yXG4vLyBnbnUvc29sYXJpcyBzdHlsZSBkdW1wZGlycy5cbkRpcldyaXRlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0cnVlXG59XG5cbkRpcldyaXRlci5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLl9lbmRlZCA9IHRydWVcbiAgdGhpcy5fcHJvY2VzcygpXG59XG5cbkRpcldyaXRlci5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKGVudHJ5KSB7XG4gIHZhciBtZSA9IHRoaXNcblxuICAvLyBjb25zb2xlLmVycm9yKFwiXFx0YWRkXCIsIGVudHJ5Ll9wYXRoLCBcIi0+XCIsIG1lLl9wYXRoKVxuICBjb2xsZWN0KGVudHJ5KVxuICBpZiAoIW1lLnJlYWR5IHx8IG1lLl9jdXJyZW50RW50cnkpIHtcbiAgICBtZS5fYnVmZmVyLnB1c2goZW50cnkpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBjcmVhdGUgYSBuZXcgd3JpdGVyLCBhbmQgcGlwZSB0aGUgaW5jb21pbmcgZW50cnkgaW50byBpdC5cbiAgaWYgKG1lLl9lbmRlZCkge1xuICAgIHJldHVybiBtZS5lcnJvcihcImFkZCBhZnRlciBlbmRcIilcbiAgfVxuXG4gIG1lLl9idWZmZXIucHVzaChlbnRyeSlcbiAgbWUuX3Byb2Nlc3MoKVxuXG4gIHJldHVybiAwID09PSB0aGlzLl9idWZmZXIubGVuZ3RoXG59XG5cbkRpcldyaXRlci5wcm90b3R5cGUuX3Byb2Nlc3MgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBtZSA9IHRoaXNcblxuICAvLyBjb25zb2xlLmVycm9yKFwiRFcgUHJvY2VzcyBwPSVqXCIsIG1lLl9wcm9jZXNzaW5nLCBtZS5iYXNlbmFtZSlcblxuICBpZiAobWUuX3Byb2Nlc3NpbmcpIHJldHVyblxuXG4gIHZhciBlbnRyeSA9IG1lLl9idWZmZXIuc2hpZnQoKVxuICBpZiAoIWVudHJ5KSB7XG4gICAgLy8gY29uc29sZS5lcnJvcihcIkRXIERyYWluXCIpXG4gICAgbWUuZW1pdChcImRyYWluXCIpXG4gICAgaWYgKG1lLl9lbmRlZCkgbWUuX2ZpbmlzaCgpXG4gICAgcmV0dXJuXG4gIH1cblxuICBtZS5fcHJvY2Vzc2luZyA9IHRydWVcbiAgLy8gY29uc29sZS5lcnJvcihcIkRXIEVudHJ5XCIsIGVudHJ5Ll9wYXRoKVxuXG4gIG1lLmVtaXQoXCJlbnRyeVwiLCBlbnRyeSlcblxuICAvLyBvaywgYWRkIHRoaXMgZW50cnlcbiAgLy9cbiAgLy8gZG9uJ3QgYWxsb3cgcmVjdXJzaXZlIGNvcHlpbmdcbiAgdmFyIHAgPSBlbnRyeVxuICBkbyB7XG4gICAgdmFyIHBwID0gcC5fcGF0aCB8fCBwLnBhdGhcbiAgICBpZiAocHAgPT09IG1lLnJvb3QuX3BhdGggfHwgcHAgPT09IG1lLl9wYXRoIHx8XG4gICAgICAgIChwcCAmJiBwcC5pbmRleE9mKG1lLl9wYXRoKSA9PT0gMCkpIHtcbiAgICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJEVyBFeGl0IChyZWN1cnNpdmUpXCIsIGVudHJ5LmJhc2VuYW1lLCBtZS5fcGF0aClcbiAgICAgIG1lLl9wcm9jZXNzaW5nID0gZmFsc2VcbiAgICAgIGlmIChlbnRyeS5fY29sbGVjdGVkKSBlbnRyeS5waXBlKClcbiAgICAgIHJldHVybiBtZS5fcHJvY2VzcygpXG4gICAgfVxuICB9IHdoaWxlIChwID0gcC5wYXJlbnQpXG5cbiAgLy8gY29uc29sZS5lcnJvcihcIkRXIG5vdCByZWN1cnNpdmVcIilcblxuICAvLyBjaG9wIG9mZiB0aGUgZW50cnkncyByb290IGRpciwgcmVwbGFjZSB3aXRoIG91cnNcbiAgdmFyIHByb3BzID0geyBwYXJlbnQ6IG1lXG4gICAgICAgICAgICAgICwgcm9vdDogbWUucm9vdCB8fCBtZVxuICAgICAgICAgICAgICAsIHR5cGU6IGVudHJ5LnR5cGVcbiAgICAgICAgICAgICAgLCBkZXB0aDogbWUuZGVwdGggKyAxIH1cblxuICB2YXIgcCA9IGVudHJ5Ll9wYXRoIHx8IGVudHJ5LnBhdGggfHwgZW50cnkucHJvcHMucGF0aFxuICBpZiAoZW50cnkucGFyZW50KSB7XG4gICAgcCA9IHAuc3Vic3RyKGVudHJ5LnBhcmVudC5fcGF0aC5sZW5ndGggKyAxKVxuICB9XG4gIC8vIGdldCByaWQgb2YgYW55IC4uLy4uLyBzaGVuYW5pZ2Fuc1xuICBwcm9wcy5wYXRoID0gcGF0aC5qb2luKG1lLnBhdGgsIHBhdGguam9pbihcIi9cIiwgcCkpXG5cbiAgLy8gaWYgaSBoYXZlIGEgZmlsdGVyLCB0aGUgY2hpbGQgc2hvdWxkIGluaGVyaXQgaXQuXG4gIHByb3BzLmZpbHRlciA9IG1lLmZpbHRlclxuXG4gIC8vIGFsbCB0aGUgcmVzdCBvZiB0aGUgc3R1ZmYsIGNvcHkgb3ZlciBmcm9tIHRoZSBzb3VyY2UuXG4gIE9iamVjdC5rZXlzKGVudHJ5LnByb3BzKS5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgaWYgKCFwcm9wcy5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgcHJvcHNba10gPSBlbnRyeS5wcm9wc1trXVxuICAgIH1cbiAgfSlcblxuICAvLyBub3Qgc3VyZSBhdCB0aGlzIHBvaW50IHdoYXQga2luZCBvZiB3cml0ZXIgdGhpcyBpcy5cbiAgdmFyIGNoaWxkID0gbWUuX2N1cnJlbnRDaGlsZCA9IG5ldyBXcml0ZXIocHJvcHMpXG4gIGNoaWxkLm9uKFwicmVhZHlcIiwgZnVuY3Rpb24gKCkge1xuICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJEVyBDaGlsZCBSZWFkeVwiLCBjaGlsZC50eXBlLCBjaGlsZC5fcGF0aClcbiAgICAvLyBjb25zb2xlLmVycm9yKFwiICByZXN1bWluZ1wiLCBlbnRyeS5fcGF0aClcbiAgICBlbnRyeS5waXBlKGNoaWxkKVxuICAgIGVudHJ5LnJlc3VtZSgpXG4gIH0pXG5cbiAgLy8gWFhYIE1ha2UgdGhpcyB3b3JrIGluIG5vZGUuXG4gIC8vIExvbmcgZmlsZW5hbWVzIHNob3VsZCBub3QgYnJlYWsgc3R1ZmYuXG4gIGNoaWxkLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24gKGVyKSB7XG4gICAgaWYgKGNoaWxkLl9zd2FsbG93RXJyb3JzKSB7XG4gICAgICBtZS53YXJuKGVyKVxuICAgICAgY2hpbGQuZW1pdChcImVuZFwiKVxuICAgICAgY2hpbGQuZW1pdChcImNsb3NlXCIpXG4gICAgfSBlbHNlIHtcbiAgICAgIG1lLmVtaXQoXCJlcnJvclwiLCBlcilcbiAgICB9XG4gIH0pXG5cbiAgLy8gd2UgZmlyZSBfZW5kIGludGVybmFsbHkgKmFmdGVyKiBlbmQsIHNvIHRoYXQgd2UgZG9uJ3QgbW92ZSBvblxuICAvLyB1bnRpbCBhbnkgXCJlbmRcIiBsaXN0ZW5lcnMgaGF2ZSBoYWQgdGhlaXIgY2hhbmNlIHRvIGRvIHN0dWZmLlxuICBjaGlsZC5vbihcImNsb3NlXCIsIG9uZW5kKVxuICB2YXIgZW5kZWQgPSBmYWxzZVxuICBmdW5jdGlvbiBvbmVuZCAoKSB7XG4gICAgaWYgKGVuZGVkKSByZXR1cm5cbiAgICBlbmRlZCA9IHRydWVcbiAgICAvLyBjb25zb2xlLmVycm9yKFwiKiBEVyBDaGlsZCBlbmRcIiwgY2hpbGQuYmFzZW5hbWUpXG4gICAgbWUuX2N1cnJlbnRDaGlsZCA9IG51bGxcbiAgICBtZS5fcHJvY2Vzc2luZyA9IGZhbHNlXG4gICAgbWUuX3Byb2Nlc3MoKVxuICB9XG59XG4iLCIvLyBCYXNpY2FsbHkganVzdCBhIHdyYXBwZXIgYXJvdW5kIGFuIGZzLlJlYWRTdHJlYW1cblxubW9kdWxlLmV4cG9ydHMgPSBGaWxlUmVhZGVyXG5cbnZhciBmcyA9IHJlcXVpcmUoXCJncmFjZWZ1bC1mc1wiKVxuICAsIGZzdHJlYW0gPSByZXF1aXJlKFwiLi4vZnN0cmVhbS5qc1wiKVxuICAsIFJlYWRlciA9IGZzdHJlYW0uUmVhZGVyXG4gICwgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIilcbiAgLCBta2RpciA9IHJlcXVpcmUoXCJta2RpcnBcIilcbiAgLCBSZWFkZXIgPSByZXF1aXJlKFwiLi9yZWFkZXIuanNcIilcbiAgLCBFT0YgPSB7RU9GOiB0cnVlfVxuICAsIENMT1NFID0ge0NMT1NFOiB0cnVlfVxuXG5pbmhlcml0cyhGaWxlUmVhZGVyLCBSZWFkZXIpXG5cbmZ1bmN0aW9uIEZpbGVSZWFkZXIgKHByb3BzKSB7XG4gIC8vIGNvbnNvbGUuZXJyb3IoXCIgICAgRlIgY3JlYXRlXCIsIHByb3BzLnBhdGgsIHByb3BzLnNpemUsIG5ldyBFcnJvcigpLnN0YWNrKVxuICB2YXIgbWUgPSB0aGlzXG4gIGlmICghKG1lIGluc3RhbmNlb2YgRmlsZVJlYWRlcikpIHRocm93IG5ldyBFcnJvcihcbiAgICBcIkZpbGVSZWFkZXIgbXVzdCBiZSBjYWxsZWQgYXMgY29uc3RydWN0b3IuXCIpXG5cbiAgLy8gc2hvdWxkIGFscmVhZHkgYmUgZXN0YWJsaXNoZWQgYXMgYSBGaWxlIHR5cGVcbiAgLy8gWFhYIFRvZG86IHByZXNlcnZlIGhhcmRsaW5rcyBieSB0cmFja2luZyBkZXYraW5vZGUrbmxpbmssXG4gIC8vIHdpdGggYSBIYXJkTGlua1JlYWRlciBjbGFzcy5cbiAgaWYgKCEoKHByb3BzLnR5cGUgPT09IFwiTGlua1wiICYmIHByb3BzLkxpbmspIHx8XG4gICAgICAgIChwcm9wcy50eXBlID09PSBcIkZpbGVcIiAmJiBwcm9wcy5GaWxlKSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb24tZmlsZSB0eXBlIFwiKyBwcm9wcy50eXBlKVxuICB9XG5cbiAgbWUuX2J1ZmZlciA9IFtdXG4gIG1lLl9ieXRlc0VtaXR0ZWQgPSAwXG4gIFJlYWRlci5jYWxsKG1lLCBwcm9wcylcbn1cblxuRmlsZVJlYWRlci5wcm90b3R5cGUuX2dldFN0cmVhbSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG1lID0gdGhpc1xuICAgICwgc3RyZWFtID0gbWUuX3N0cmVhbSA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0obWUuX3BhdGgsIG1lLnByb3BzKVxuXG4gIGlmIChtZS5wcm9wcy5ibGtzaXplKSB7XG4gICAgc3RyZWFtLmJ1ZmZlclNpemUgPSBtZS5wcm9wcy5ibGtzaXplXG4gIH1cblxuICBzdHJlYW0ub24oXCJvcGVuXCIsIG1lLmVtaXQuYmluZChtZSwgXCJvcGVuXCIpKVxuXG4gIHN0cmVhbS5vbihcImRhdGFcIiwgZnVuY3Rpb24gKGMpIHtcbiAgICAvLyBjb25zb2xlLmVycm9yKFwiXFx0XFx0JWQgJXNcIiwgYy5sZW5ndGgsIG1lLmJhc2VuYW1lKVxuICAgIG1lLl9ieXRlc0VtaXR0ZWQgKz0gYy5sZW5ndGhcbiAgICAvLyBubyBwb2ludCBzYXZpbmcgZW1wdHkgY2h1bmtzXG4gICAgaWYgKCFjLmxlbmd0aCkgcmV0dXJuXG4gICAgZWxzZSBpZiAobWUuX3BhdXNlZCB8fCBtZS5fYnVmZmVyLmxlbmd0aCkge1xuICAgICAgbWUuX2J1ZmZlci5wdXNoKGMpXG4gICAgICBtZS5fcmVhZCgpXG4gICAgfSBlbHNlIG1lLmVtaXQoXCJkYXRhXCIsIGMpXG4gIH0pXG5cbiAgc3RyZWFtLm9uKFwiZW5kXCIsIGZ1bmN0aW9uICgpIHtcbiAgICBpZiAobWUuX3BhdXNlZCB8fCBtZS5fYnVmZmVyLmxlbmd0aCkge1xuICAgICAgLy8gY29uc29sZS5lcnJvcihcIkZSIEJ1ZmZlcmluZyBFbmRcIiwgbWUuX3BhdGgpXG4gICAgICBtZS5fYnVmZmVyLnB1c2goRU9GKVxuICAgICAgbWUuX3JlYWQoKVxuICAgIH0gZWxzZSB7XG4gICAgICBtZS5lbWl0KFwiZW5kXCIpXG4gICAgfVxuXG4gICAgaWYgKG1lLl9ieXRlc0VtaXR0ZWQgIT09IG1lLnByb3BzLnNpemUpIHtcbiAgICAgIG1lLmVycm9yKFwiRGlkbid0IGdldCBleHBlY3RlZCBieXRlIGNvdW50XFxuXCIrXG4gICAgICAgICAgICAgICBcImV4cGVjdDogXCIrbWUucHJvcHMuc2l6ZSArIFwiXFxuXCIgK1xuICAgICAgICAgICAgICAgXCJhY3R1YWw6IFwiK21lLl9ieXRlc0VtaXR0ZWQpXG4gICAgfVxuICB9KVxuXG4gIHN0cmVhbS5vbihcImNsb3NlXCIsIGZ1bmN0aW9uICgpIHtcbiAgICBpZiAobWUuX3BhdXNlZCB8fCBtZS5fYnVmZmVyLmxlbmd0aCkge1xuICAgICAgLy8gY29uc29sZS5lcnJvcihcIkZSIEJ1ZmZlcmluZyBDbG9zZVwiLCBtZS5fcGF0aClcbiAgICAgIG1lLl9idWZmZXIucHVzaChDTE9TRSlcbiAgICAgIG1lLl9yZWFkKClcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gY29uc29sZS5lcnJvcihcIkZSIGNsb3NlIDFcIiwgbWUuX3BhdGgpXG4gICAgICBtZS5lbWl0KFwiY2xvc2VcIilcbiAgICB9XG4gIH0pXG5cbiAgbWUuX3JlYWQoKVxufVxuXG5GaWxlUmVhZGVyLnByb3RvdHlwZS5fcmVhZCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG1lID0gdGhpc1xuICAvLyBjb25zb2xlLmVycm9yKFwiRlIgX3JlYWRcIiwgbWUuX3BhdGgpXG4gIGlmIChtZS5fcGF1c2VkKSB7XG4gICAgLy8gY29uc29sZS5lcnJvcihcIkZSIF9yZWFkIHBhdXNlZFwiLCBtZS5fcGF0aClcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmICghbWUuX3N0cmVhbSkge1xuICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJGUiBfZ2V0U3RyZWFtIGNhbGxpbmdcIiwgbWUuX3BhdGgpXG4gICAgcmV0dXJuIG1lLl9nZXRTdHJlYW0oKVxuICB9XG5cbiAgLy8gY2xlYXIgb3V0IHRoZSBidWZmZXIsIGlmIHRoZXJlIGlzIG9uZS5cbiAgaWYgKG1lLl9idWZmZXIubGVuZ3RoKSB7XG4gICAgLy8gY29uc29sZS5lcnJvcihcIkZSIF9yZWFkIGhhcyBidWZmZXJcIiwgbWUuX2J1ZmZlci5sZW5ndGgsIG1lLl9wYXRoKVxuICAgIHZhciBidWYgPSBtZS5fYnVmZmVyXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBidWYubGVuZ3RoOyBpIDwgbDsgaSArKykge1xuICAgICAgdmFyIGMgPSBidWZbaV1cbiAgICAgIGlmIChjID09PSBFT0YpIHtcbiAgICAgICAgLy8gY29uc29sZS5lcnJvcihcIkZSIFJlYWQgZW1pdHRpbmcgYnVmZmVyZWQgZW5kXCIsIG1lLl9wYXRoKVxuICAgICAgICBtZS5lbWl0KFwiZW5kXCIpXG4gICAgICB9IGVsc2UgaWYgKGMgPT09IENMT1NFKSB7XG4gICAgICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJGUiBSZWFkIGVtaXR0aW5nIGJ1ZmZlcmVkIGNsb3NlXCIsIG1lLl9wYXRoKVxuICAgICAgICBtZS5lbWl0KFwiY2xvc2VcIilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJGUiBSZWFkIGVtaXR0aW5nIGJ1ZmZlcmVkIGRhdGFcIiwgbWUuX3BhdGgpXG4gICAgICAgIG1lLmVtaXQoXCJkYXRhXCIsIGMpXG4gICAgICB9XG5cbiAgICAgIGlmIChtZS5fcGF1c2VkKSB7XG4gICAgICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJGUiBSZWFkIFJlLXBhdXNpbmcgYXQgXCIraSwgbWUuX3BhdGgpXG4gICAgICAgIG1lLl9idWZmZXIgPSBidWYuc2xpY2UoaSlcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgfVxuICAgIG1lLl9idWZmZXIubGVuZ3RoID0gMFxuICB9XG4gIC8vIGNvbnNvbGUuZXJyb3IoXCJGUiBfcmVhZCBkb25lXCIpXG4gIC8vIHRoYXQncyBhYm91dCBhbGwgdGhlcmUgaXMgdG8gaXQuXG59XG5cbkZpbGVSZWFkZXIucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24gKHdobykge1xuICB2YXIgbWUgPSB0aGlzXG4gIC8vIGNvbnNvbGUuZXJyb3IoXCJGUiBQYXVzZVwiLCBtZS5fcGF0aClcbiAgaWYgKG1lLl9wYXVzZWQpIHJldHVyblxuICB3aG8gPSB3aG8gfHwgbWVcbiAgbWUuX3BhdXNlZCA9IHRydWVcbiAgaWYgKG1lLl9zdHJlYW0pIG1lLl9zdHJlYW0ucGF1c2UoKVxuICBtZS5lbWl0KFwicGF1c2VcIiwgd2hvKVxufVxuXG5GaWxlUmVhZGVyLnByb3RvdHlwZS5yZXN1bWUgPSBmdW5jdGlvbiAod2hvKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgLy8gY29uc29sZS5lcnJvcihcIkZSIFJlc3VtZVwiLCBtZS5fcGF0aClcbiAgaWYgKCFtZS5fcGF1c2VkKSByZXR1cm5cbiAgd2hvID0gd2hvIHx8IG1lXG4gIG1lLmVtaXQoXCJyZXN1bWVcIiwgd2hvKVxuICBtZS5fcGF1c2VkID0gZmFsc2VcbiAgaWYgKG1lLl9zdHJlYW0pIG1lLl9zdHJlYW0ucmVzdW1lKClcbiAgbWUuX3JlYWQoKVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBGaWxlV3JpdGVyXG5cbnZhciBmcyA9IHJlcXVpcmUoXCJncmFjZWZ1bC1mc1wiKVxuICAsIG1rZGlyID0gcmVxdWlyZShcIm1rZGlycFwiKVxuICAsIFdyaXRlciA9IHJlcXVpcmUoXCIuL3dyaXRlci5qc1wiKVxuICAsIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpXG4gICwgRU9GID0ge31cblxuaW5oZXJpdHMoRmlsZVdyaXRlciwgV3JpdGVyKVxuXG5mdW5jdGlvbiBGaWxlV3JpdGVyIChwcm9wcykge1xuICB2YXIgbWUgPSB0aGlzXG4gIGlmICghKG1lIGluc3RhbmNlb2YgRmlsZVdyaXRlcikpIHRocm93IG5ldyBFcnJvcihcbiAgICBcIkZpbGVXcml0ZXIgbXVzdCBiZSBjYWxsZWQgYXMgY29uc3RydWN0b3IuXCIpXG5cbiAgLy8gc2hvdWxkIGFscmVhZHkgYmUgZXN0YWJsaXNoZWQgYXMgYSBGaWxlIHR5cGVcbiAgaWYgKHByb3BzLnR5cGUgIT09IFwiRmlsZVwiIHx8ICFwcm9wcy5GaWxlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm9uLWZpbGUgdHlwZSBcIisgcHJvcHMudHlwZSlcbiAgfVxuXG4gIG1lLl9idWZmZXIgPSBbXVxuICBtZS5fYnl0ZXNXcml0dGVuID0gMFxuXG4gIFdyaXRlci5jYWxsKHRoaXMsIHByb3BzKVxufVxuXG5GaWxlV3JpdGVyLnByb3RvdHlwZS5fY3JlYXRlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbWUgPSB0aGlzXG4gIGlmIChtZS5fc3RyZWFtKSByZXR1cm5cblxuICB2YXIgc28gPSB7fVxuICBpZiAobWUucHJvcHMuZmxhZ3MpIHNvLmZsYWdzID0gbWUucHJvcHMuZmxhZ3NcbiAgc28ubW9kZSA9IFdyaXRlci5maWxlbW9kZVxuICBpZiAobWUuX29sZCAmJiBtZS5fb2xkLmJsa3NpemUpIHNvLmJ1ZmZlclNpemUgPSBtZS5fb2xkLmJsa3NpemVcblxuICBtZS5fc3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0obWUuX3BhdGgsIHNvKVxuXG4gIG1lLl9zdHJlYW0ub24oXCJvcGVuXCIsIGZ1bmN0aW9uIChmZCkge1xuICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJGVyBvcGVuXCIsIG1lLl9idWZmZXIsIG1lLl9wYXRoKVxuICAgIG1lLnJlYWR5ID0gdHJ1ZVxuICAgIG1lLl9idWZmZXIuZm9yRWFjaChmdW5jdGlvbiAoYykge1xuICAgICAgaWYgKGMgPT09IEVPRikgbWUuX3N0cmVhbS5lbmQoKVxuICAgICAgZWxzZSBtZS5fc3RyZWFtLndyaXRlKGMpXG4gICAgfSlcbiAgICBtZS5lbWl0KFwicmVhZHlcIilcbiAgICAvLyBnaXZlIHRoaXMgYSBraWNrIGp1c3QgaW4gY2FzZSBpdCBuZWVkcyBpdC5cbiAgICBtZS5lbWl0KFwiZHJhaW5cIilcbiAgfSlcblxuICBtZS5fc3RyZWFtLm9uKFwiZHJhaW5cIiwgZnVuY3Rpb24gKCkgeyBtZS5lbWl0KFwiZHJhaW5cIikgfSlcblxuICBtZS5fc3RyZWFtLm9uKFwiY2xvc2VcIiwgZnVuY3Rpb24gKCkge1xuICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJcXG5cXG5GVyBTdHJlYW0gQ2xvc2VcIiwgbWUuX3BhdGgsIG1lLnNpemUpXG4gICAgbWUuX2ZpbmlzaCgpXG4gIH0pXG59XG5cbkZpbGVXcml0ZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKGMpIHtcbiAgdmFyIG1lID0gdGhpc1xuXG4gIG1lLl9ieXRlc1dyaXR0ZW4gKz0gYy5sZW5ndGhcblxuICBpZiAoIW1lLnJlYWR5KSB7XG4gICAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYykgJiYgdHlwZW9mIGMgIT09ICdzdHJpbmcnKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhbGlkIHdyaXRlIGRhdGEnKVxuICAgIG1lLl9idWZmZXIucHVzaChjKVxuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgdmFyIHJldCA9IG1lLl9zdHJlYW0ud3JpdGUoYylcbiAgLy8gY29uc29sZS5lcnJvcihcIlxcdC0tIGZ3IHdyb3RlLCBfc3RyZWFtIHNheXNcIiwgcmV0LCBtZS5fc3RyZWFtLl9xdWV1ZS5sZW5ndGgpXG5cbiAgLy8gYWxsb3cgMiBidWZmZXJlZCB3cml0ZXMsIGJlY2F1c2Ugb3RoZXJ3aXNlIHRoZXJlJ3MganVzdCB0b29cbiAgLy8gbXVjaCBzdG9wIGFuZCBnbyBicy5cbiAgaWYgKHJldCA9PT0gZmFsc2UgJiYgbWUuX3N0cmVhbS5fcXVldWUpIHtcbiAgICByZXR1cm4gbWUuX3N0cmVhbS5fcXVldWUubGVuZ3RoIDw9IDI7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHJldDtcbiAgfVxufVxuXG5GaWxlV3JpdGVyLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbiAoYykge1xuICB2YXIgbWUgPSB0aGlzXG5cbiAgaWYgKGMpIG1lLndyaXRlKGMpXG5cbiAgaWYgKCFtZS5yZWFkeSkge1xuICAgIG1lLl9idWZmZXIucHVzaChFT0YpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICByZXR1cm4gbWUuX3N0cmVhbS5lbmQoKVxufVxuXG5GaWxlV3JpdGVyLnByb3RvdHlwZS5fZmluaXNoID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbWUgPSB0aGlzXG4gIGlmICh0eXBlb2YgbWUuc2l6ZSA9PT0gXCJudW1iZXJcIiAmJiBtZS5fYnl0ZXNXcml0dGVuICE9IG1lLnNpemUpIHtcbiAgICBtZS5lcnJvcihcbiAgICAgIFwiRGlkIG5vdCBnZXQgZXhwZWN0ZWQgYnl0ZSBjb3VudC5cXG5cIiArXG4gICAgICBcImV4cGVjdDogXCIgKyBtZS5zaXplICsgXCJcXG5cIiArXG4gICAgICBcImFjdHVhbDogXCIgKyBtZS5fYnl0ZXNXcml0dGVuKVxuICB9XG4gIFdyaXRlci5wcm90b3R5cGUuX2ZpbmlzaC5jYWxsKG1lKVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBnZXRUeXBlXG5cbmZ1bmN0aW9uIGdldFR5cGUgKHN0KSB7XG4gIHZhciB0eXBlcyA9XG4gICAgICBbIFwiRGlyZWN0b3J5XCJcbiAgICAgICwgXCJGaWxlXCJcbiAgICAgICwgXCJTeW1ib2xpY0xpbmtcIlxuICAgICAgLCBcIkxpbmtcIiAvLyBzcGVjaWFsIGZvciBoYXJkbGlua3MgZnJvbSB0YXJiYWxsc1xuICAgICAgLCBcIkJsb2NrRGV2aWNlXCJcbiAgICAgICwgXCJDaGFyYWN0ZXJEZXZpY2VcIlxuICAgICAgLCBcIkZJRk9cIlxuICAgICAgLCBcIlNvY2tldFwiIF1cbiAgICAsIHR5cGVcblxuICBpZiAoc3QudHlwZSAmJiAtMSAhPT0gdHlwZXMuaW5kZXhPZihzdC50eXBlKSkge1xuICAgIHN0W3N0LnR5cGVdID0gdHJ1ZVxuICAgIHJldHVybiBzdC50eXBlXG4gIH1cblxuICBmb3IgKHZhciBpID0gMCwgbCA9IHR5cGVzLmxlbmd0aDsgaSA8IGw7IGkgKyspIHtcbiAgICB0eXBlID0gdHlwZXNbaV1cbiAgICB2YXIgaXMgPSBzdFt0eXBlXSB8fCBzdFtcImlzXCIgKyB0eXBlXVxuICAgIGlmICh0eXBlb2YgaXMgPT09IFwiZnVuY3Rpb25cIikgaXMgPSBpcy5jYWxsKHN0KVxuICAgIGlmIChpcykge1xuICAgICAgc3RbdHlwZV0gPSB0cnVlXG4gICAgICBzdC50eXBlID0gdHlwZVxuICAgICAgcmV0dXJuIHR5cGVcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbFxufVxuIiwiLy8gQmFzaWNhbGx5IGp1c3QgYSB3cmFwcGVyIGFyb3VuZCBhbiBmcy5yZWFkbGlua1xuLy9cbi8vIFhYWDogRW5oYW5jZSB0aGlzIHRvIHN1cHBvcnQgdGhlIExpbmsgdHlwZSwgYnkga2VlcGluZ1xuLy8gYSBsb29rdXAgdGFibGUgb2YgezxkZXYraW5vZGU+OjxwYXRoPn0sIHNvIHRoYXQgaGFyZGxpbmtzXG4vLyBjYW4gYmUgcHJlc2VydmVkIGluIHRhcmJhbGxzLlxuXG5tb2R1bGUuZXhwb3J0cyA9IExpbmtSZWFkZXJcblxudmFyIGZzID0gcmVxdWlyZShcImdyYWNlZnVsLWZzXCIpXG4gICwgZnN0cmVhbSA9IHJlcXVpcmUoXCIuLi9mc3RyZWFtLmpzXCIpXG4gICwgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIilcbiAgLCBta2RpciA9IHJlcXVpcmUoXCJta2RpcnBcIilcbiAgLCBSZWFkZXIgPSByZXF1aXJlKFwiLi9yZWFkZXIuanNcIilcblxuaW5oZXJpdHMoTGlua1JlYWRlciwgUmVhZGVyKVxuXG5mdW5jdGlvbiBMaW5rUmVhZGVyIChwcm9wcykge1xuICB2YXIgbWUgPSB0aGlzXG4gIGlmICghKG1lIGluc3RhbmNlb2YgTGlua1JlYWRlcikpIHRocm93IG5ldyBFcnJvcihcbiAgICBcIkxpbmtSZWFkZXIgbXVzdCBiZSBjYWxsZWQgYXMgY29uc3RydWN0b3IuXCIpXG5cbiAgaWYgKCEoKHByb3BzLnR5cGUgPT09IFwiTGlua1wiICYmIHByb3BzLkxpbmspIHx8XG4gICAgICAgIChwcm9wcy50eXBlID09PSBcIlN5bWJvbGljTGlua1wiICYmIHByb3BzLlN5bWJvbGljTGluaykpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm9uLWxpbmsgdHlwZSBcIisgcHJvcHMudHlwZSlcbiAgfVxuXG4gIFJlYWRlci5jYWxsKG1lLCBwcm9wcylcbn1cblxuLy8gV2hlbiBwaXBpbmcgYSBMaW5rUmVhZGVyIGludG8gYSBMaW5rV3JpdGVyLCB3ZSBoYXZlIHRvXG4vLyBhbHJlYWR5IGhhdmUgdGhlIGxpbmtwYXRoIHByb3BlcnR5IHNldCwgc28gdGhhdCBoYXMgdG9cbi8vIGhhcHBlbiAqYmVmb3JlKiB0aGUgXCJyZWFkeVwiIGV2ZW50LCB3aGljaCBtZWFucyB3ZSBuZWVkIHRvXG4vLyBvdmVycmlkZSB0aGUgX3N0YXQgbWV0aG9kLlxuTGlua1JlYWRlci5wcm90b3R5cGUuX3N0YXQgPSBmdW5jdGlvbiAoY3VycmVudFN0YXQpIHtcbiAgdmFyIG1lID0gdGhpc1xuICBmcy5yZWFkbGluayhtZS5fcGF0aCwgZnVuY3Rpb24gKGVyLCBsaW5rcGF0aCkge1xuICAgIGlmIChlcikgcmV0dXJuIG1lLmVycm9yKGVyKVxuICAgIG1lLmxpbmtwYXRoID0gbWUucHJvcHMubGlua3BhdGggPSBsaW5rcGF0aFxuICAgIG1lLmVtaXQoXCJsaW5rcGF0aFwiLCBsaW5rcGF0aClcbiAgICBSZWFkZXIucHJvdG90eXBlLl9zdGF0LmNhbGwobWUsIGN1cnJlbnRTdGF0KVxuICB9KVxufVxuXG5MaW5rUmVhZGVyLnByb3RvdHlwZS5fcmVhZCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG1lID0gdGhpc1xuICBpZiAobWUuX3BhdXNlZCkgcmV0dXJuXG4gIC8vIGJhc2ljYWxseSBqdXN0IGEgbm8tb3AsIHNpbmNlIHdlIGdvdCBhbGwgdGhlIGluZm8gd2UgbmVlZFxuICAvLyBmcm9tIHRoZSBfc3RhdCBtZXRob2RcbiAgaWYgKCFtZS5fZW5kZWQpIHtcbiAgICBtZS5lbWl0KFwiZW5kXCIpXG4gICAgbWUuZW1pdChcImNsb3NlXCIpXG4gICAgbWUuX2VuZGVkID0gdHJ1ZVxuICB9XG59XG4iLCJcbm1vZHVsZS5leHBvcnRzID0gTGlua1dyaXRlclxuXG52YXIgZnMgPSByZXF1aXJlKFwiZ3JhY2VmdWwtZnNcIilcbiAgLCBXcml0ZXIgPSByZXF1aXJlKFwiLi93cml0ZXIuanNcIilcbiAgLCBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKVxuICAsIHBhdGggPSByZXF1aXJlKFwicGF0aFwiKVxuICAsIHJpbXJhZiA9IHJlcXVpcmUoXCJyaW1yYWZcIilcblxuaW5oZXJpdHMoTGlua1dyaXRlciwgV3JpdGVyKVxuXG5mdW5jdGlvbiBMaW5rV3JpdGVyIChwcm9wcykge1xuICB2YXIgbWUgPSB0aGlzXG4gIGlmICghKG1lIGluc3RhbmNlb2YgTGlua1dyaXRlcikpIHRocm93IG5ldyBFcnJvcihcbiAgICBcIkxpbmtXcml0ZXIgbXVzdCBiZSBjYWxsZWQgYXMgY29uc3RydWN0b3IuXCIpXG5cbiAgLy8gc2hvdWxkIGFscmVhZHkgYmUgZXN0YWJsaXNoZWQgYXMgYSBMaW5rIHR5cGVcbiAgaWYgKCEoKHByb3BzLnR5cGUgPT09IFwiTGlua1wiICYmIHByb3BzLkxpbmspIHx8XG4gICAgICAgIChwcm9wcy50eXBlID09PSBcIlN5bWJvbGljTGlua1wiICYmIHByb3BzLlN5bWJvbGljTGluaykpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm9uLWxpbmsgdHlwZSBcIisgcHJvcHMudHlwZSlcbiAgfVxuXG4gIGlmIChwcm9wcy5saW5rcGF0aCA9PT0gXCJcIikgcHJvcHMubGlua3BhdGggPSBcIi5cIlxuICBpZiAoIXByb3BzLmxpbmtwYXRoKSB7XG4gICAgbWUuZXJyb3IoXCJOZWVkIGxpbmtwYXRoIHByb3BlcnR5IHRvIGNyZWF0ZSBcIiArIHByb3BzLnR5cGUpXG4gIH1cblxuICBXcml0ZXIuY2FsbCh0aGlzLCBwcm9wcylcbn1cblxuTGlua1dyaXRlci5wcm90b3R5cGUuX2NyZWF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gY29uc29sZS5lcnJvcihcIiBMVyBfY3JlYXRlXCIpXG4gIHZhciBtZSA9IHRoaXNcbiAgICAsIGhhcmQgPSBtZS50eXBlID09PSBcIkxpbmtcIiB8fCBwcm9jZXNzLnBsYXRmb3JtID09PSBcIndpbjMyXCJcbiAgICAsIGxpbmsgPSBoYXJkID8gXCJsaW5rXCIgOiBcInN5bWxpbmtcIlxuICAgICwgbHAgPSBoYXJkID8gcGF0aC5yZXNvbHZlKG1lLmRpcm5hbWUsIG1lLmxpbmtwYXRoKSA6IG1lLmxpbmtwYXRoXG5cbiAgLy8gY2FuIG9ubHkgY2hhbmdlIHRoZSBsaW5rIHBhdGggYnkgY2xvYmJlcmluZ1xuICAvLyBGb3IgaGFyZCBsaW5rcywgbGV0J3MganVzdCBhc3N1bWUgdGhhdCdzIGFsd2F5cyB0aGUgY2FzZSwgc2luY2VcbiAgLy8gdGhlcmUncyBubyBnb29kIHdheSB0byByZWFkIHRoZW0gaWYgd2UgZG9uJ3QgYWxyZWFkeSBrbm93LlxuICBpZiAoaGFyZCkgcmV0dXJuIGNsb2JiZXIobWUsIGxwLCBsaW5rKVxuXG4gIGZzLnJlYWRsaW5rKG1lLl9wYXRoLCBmdW5jdGlvbiAoZXIsIHApIHtcbiAgICAvLyBvbmx5IHNraXAgY3JlYXRpb24gaWYgaXQncyBleGFjdGx5IHRoZSBzYW1lIGxpbmtcbiAgICBpZiAocCAmJiBwID09PSBscCkgcmV0dXJuIGZpbmlzaChtZSlcbiAgICBjbG9iYmVyKG1lLCBscCwgbGluaylcbiAgfSlcbn1cblxuZnVuY3Rpb24gY2xvYmJlciAobWUsIGxwLCBsaW5rKSB7XG4gIHJpbXJhZihtZS5fcGF0aCwgZnVuY3Rpb24gKGVyKSB7XG4gICAgaWYgKGVyKSByZXR1cm4gbWUuZXJyb3IoZXIpXG4gICAgY3JlYXRlKG1lLCBscCwgbGluaylcbiAgfSlcbn1cblxuZnVuY3Rpb24gY3JlYXRlIChtZSwgbHAsIGxpbmspIHtcbiAgZnNbbGlua10obHAsIG1lLl9wYXRoLCBmdW5jdGlvbiAoZXIpIHtcbiAgICAvLyBpZiB0aGlzIGlzIGEgaGFyZCBsaW5rLCBhbmQgd2UncmUgaW4gdGhlIHByb2Nlc3Mgb2Ygd3JpdGluZyBvdXQgYVxuICAgIC8vIGRpcmVjdG9yeSwgaXQncyB2ZXJ5IHBvc3NpYmxlIHRoYXQgdGhlIHRoaW5nIHdlJ3JlIGxpbmtpbmcgdG9cbiAgICAvLyBkb2Vzbid0IGV4aXN0IHlldCAoZXNwZWNpYWxseSBpZiBpdCB3YXMgaW50ZW5kZWQgYXMgYSBzeW1saW5rKSxcbiAgICAvLyBzbyBzd2FsbG93IEVOT0VOVCBlcnJvcnMgaGVyZSBhbmQganVzdCBzb2xkaWVyIGluLlxuICAgIC8vIEFkZGl0aW9uYWxseSwgYW4gRVBFUk0gb3IgRUFDQ0VTIGNhbiBoYXBwZW4gb24gd2luMzIgaWYgaXQncyB0cnlpbmdcbiAgICAvLyB0byBtYWtlIGEgbGluayB0byBhIGRpcmVjdG9yeS4gIEFnYWluLCBqdXN0IHNraXAgaXQuXG4gICAgLy8gQSBiZXR0ZXIgc29sdXRpb24gd291bGQgYmUgdG8gaGF2ZSBmcy5zeW1saW5rIGJlIHN1cHBvcnRlZCBvblxuICAgIC8vIHdpbmRvd3MgaW4gc29tZSBuaWNlIGZhc2hpb24uXG4gICAgaWYgKGVyKSB7XG4gICAgICBpZiAoKGVyLmNvZGUgPT09IFwiRU5PRU5UXCIgfHxcbiAgICAgICAgICAgZXIuY29kZSA9PT0gXCJFQUNDRVNcIiB8fFxuICAgICAgICAgICBlci5jb2RlID09PSBcIkVQRVJNXCIgKSAmJiBwcm9jZXNzLnBsYXRmb3JtID09PSBcIndpbjMyXCIpIHtcbiAgICAgICAgbWUucmVhZHkgPSB0cnVlXG4gICAgICAgIG1lLmVtaXQoXCJyZWFkeVwiKVxuICAgICAgICBtZS5lbWl0KFwiZW5kXCIpXG4gICAgICAgIG1lLmVtaXQoXCJjbG9zZVwiKVxuICAgICAgICBtZS5lbmQgPSBtZS5fZmluaXNoID0gZnVuY3Rpb24gKCkge31cbiAgICAgIH0gZWxzZSByZXR1cm4gbWUuZXJyb3IoZXIpXG4gICAgfVxuICAgIGZpbmlzaChtZSlcbiAgfSlcbn1cblxuZnVuY3Rpb24gZmluaXNoIChtZSkge1xuICBtZS5yZWFkeSA9IHRydWVcbiAgbWUuZW1pdChcInJlYWR5XCIpXG4gIGlmIChtZS5fZW5kZWQgJiYgIW1lLl9maW5pc2hlZCkgbWUuX2ZpbmlzaCgpXG59XG5cbkxpbmtXcml0ZXIucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gY29uc29sZS5lcnJvcihcIkxXIGZpbmlzaCBpbiBlbmRcIilcbiAgdGhpcy5fZW5kZWQgPSB0cnVlXG4gIGlmICh0aGlzLnJlYWR5KSB7XG4gICAgdGhpcy5fZmluaXNoZWQgPSB0cnVlXG4gICAgdGhpcy5fZmluaXNoKClcbiAgfVxufVxuIiwiLy8gQSByZWFkZXIgZm9yIHdoZW4gd2UgZG9uJ3QgeWV0IGtub3cgd2hhdCBraW5kIG9mIHRoaW5nXG4vLyB0aGUgdGhpbmcgaXMuXG5cbm1vZHVsZS5leHBvcnRzID0gUHJveHlSZWFkZXJcblxudmFyIFJlYWRlciA9IHJlcXVpcmUoXCIuL3JlYWRlci5qc1wiKVxuICAsIGdldFR5cGUgPSByZXF1aXJlKFwiLi9nZXQtdHlwZS5qc1wiKVxuICAsIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpXG4gICwgZnMgPSByZXF1aXJlKFwiZ3JhY2VmdWwtZnNcIilcblxuaW5oZXJpdHMoUHJveHlSZWFkZXIsIFJlYWRlcilcblxuZnVuY3Rpb24gUHJveHlSZWFkZXIgKHByb3BzKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgaWYgKCEobWUgaW5zdGFuY2VvZiBQcm94eVJlYWRlcikpIHRocm93IG5ldyBFcnJvcihcbiAgICBcIlByb3h5UmVhZGVyIG11c3QgYmUgY2FsbGVkIGFzIGNvbnN0cnVjdG9yLlwiKVxuXG4gIG1lLnByb3BzID0gcHJvcHNcbiAgbWUuX2J1ZmZlciA9IFtdXG4gIG1lLnJlYWR5ID0gZmFsc2VcblxuICBSZWFkZXIuY2FsbChtZSwgcHJvcHMpXG59XG5cblByb3h5UmVhZGVyLnByb3RvdHlwZS5fc3RhdCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG1lID0gdGhpc1xuICAgICwgcHJvcHMgPSBtZS5wcm9wc1xuICAgIC8vIHN0YXQgdGhlIHRoaW5nIHRvIHNlZSB3aGF0IHRoZSBwcm94eSBzaG91bGQgYmUuXG4gICAgLCBzdGF0ID0gcHJvcHMuZm9sbG93ID8gXCJzdGF0XCIgOiBcImxzdGF0XCJcblxuICBmc1tzdGF0XShwcm9wcy5wYXRoLCBmdW5jdGlvbiAoZXIsIGN1cnJlbnQpIHtcbiAgICB2YXIgdHlwZVxuICAgIGlmIChlciB8fCAhY3VycmVudCkge1xuICAgICAgdHlwZSA9IFwiRmlsZVwiXG4gICAgfSBlbHNlIHtcbiAgICAgIHR5cGUgPSBnZXRUeXBlKGN1cnJlbnQpXG4gICAgfVxuXG4gICAgcHJvcHNbdHlwZV0gPSB0cnVlXG4gICAgcHJvcHMudHlwZSA9IG1lLnR5cGUgPSB0eXBlXG5cbiAgICBtZS5fb2xkID0gY3VycmVudFxuICAgIG1lLl9hZGRQcm94eShSZWFkZXIocHJvcHMsIGN1cnJlbnQpKVxuICB9KVxufVxuXG5Qcm94eVJlYWRlci5wcm90b3R5cGUuX2FkZFByb3h5ID0gZnVuY3Rpb24gKHByb3h5KSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgaWYgKG1lLl9wcm94eVRhcmdldCkge1xuICAgIHJldHVybiBtZS5lcnJvcihcInByb3h5IGFscmVhZHkgc2V0XCIpXG4gIH1cblxuICBtZS5fcHJveHlUYXJnZXQgPSBwcm94eVxuICBwcm94eS5fcHJveHkgPSBtZVxuXG4gIDsgWyBcImVycm9yXCJcbiAgICAsIFwiZGF0YVwiXG4gICAgLCBcImVuZFwiXG4gICAgLCBcImNsb3NlXCJcbiAgICAsIFwibGlua3BhdGhcIlxuICAgICwgXCJlbnRyeVwiXG4gICAgLCBcImVudHJ5RW5kXCJcbiAgICAsIFwiY2hpbGRcIlxuICAgICwgXCJjaGlsZEVuZFwiXG4gICAgLCBcIndhcm5cIlxuICAgICwgXCJzdGF0XCJcbiAgICBdLmZvckVhY2goZnVuY3Rpb24gKGV2KSB7XG4gICAgICAvLyBjb25zb2xlLmVycm9yKFwifn4gcHJveHkgZXZlbnRcIiwgZXYsIG1lLnBhdGgpXG4gICAgICBwcm94eS5vbihldiwgbWUuZW1pdC5iaW5kKG1lLCBldikpXG4gICAgfSlcblxuICBtZS5lbWl0KFwicHJveHlcIiwgcHJveHkpXG5cbiAgcHJveHkub24oXCJyZWFkeVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgLy8gY29uc29sZS5lcnJvcihcIn5+IHByb3h5IGlzIHJlYWR5IVwiLCBtZS5wYXRoKVxuICAgIG1lLnJlYWR5ID0gdHJ1ZVxuICAgIG1lLmVtaXQoXCJyZWFkeVwiKVxuICB9KVxuXG4gIHZhciBjYWxscyA9IG1lLl9idWZmZXJcbiAgbWUuX2J1ZmZlci5sZW5ndGggPSAwXG4gIGNhbGxzLmZvckVhY2goZnVuY3Rpb24gKGMpIHtcbiAgICBwcm94eVtjWzBdXS5hcHBseShwcm94eSwgY1sxXSlcbiAgfSlcbn1cblxuUHJveHlSZWFkZXIucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5fcHJveHlUYXJnZXQgPyB0aGlzLl9wcm94eVRhcmdldC5wYXVzZSgpIDogZmFsc2Vcbn1cblxuUHJveHlSZWFkZXIucHJvdG90eXBlLnJlc3VtZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuX3Byb3h5VGFyZ2V0ID8gdGhpcy5fcHJveHlUYXJnZXQucmVzdW1lKCkgOiBmYWxzZVxufVxuIiwiLy8gQSB3cml0ZXIgZm9yIHdoZW4gd2UgZG9uJ3Qga25vdyB3aGF0IGtpbmQgb2YgdGhpbmdcbi8vIHRoZSB0aGluZyBpcy4gIFRoYXQgaXMsIGl0J3Mgbm90IGV4cGxpY2l0bHkgc2V0LFxuLy8gc28gd2UncmUgZ29pbmcgdG8gbWFrZSBpdCB3aGF0ZXZlciB0aGUgdGhpbmcgYWxyZWFkeVxuLy8gaXMsIG9yIFwiRmlsZVwiXG4vL1xuLy8gVW50aWwgdGhlbiwgY29sbGVjdCBhbGwgZXZlbnRzLlxuXG5tb2R1bGUuZXhwb3J0cyA9IFByb3h5V3JpdGVyXG5cbnZhciBXcml0ZXIgPSByZXF1aXJlKFwiLi93cml0ZXIuanNcIilcbiAgLCBnZXRUeXBlID0gcmVxdWlyZShcIi4vZ2V0LXR5cGUuanNcIilcbiAgLCBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKVxuICAsIGNvbGxlY3QgPSByZXF1aXJlKFwiLi9jb2xsZWN0LmpzXCIpXG4gICwgZnMgPSByZXF1aXJlKFwiZnNcIilcblxuaW5oZXJpdHMoUHJveHlXcml0ZXIsIFdyaXRlcilcblxuZnVuY3Rpb24gUHJveHlXcml0ZXIgKHByb3BzKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgaWYgKCEobWUgaW5zdGFuY2VvZiBQcm94eVdyaXRlcikpIHRocm93IG5ldyBFcnJvcihcbiAgICBcIlByb3h5V3JpdGVyIG11c3QgYmUgY2FsbGVkIGFzIGNvbnN0cnVjdG9yLlwiKVxuXG4gIG1lLnByb3BzID0gcHJvcHNcbiAgbWUuX25lZWREcmFpbiA9IGZhbHNlXG5cbiAgV3JpdGVyLmNhbGwobWUsIHByb3BzKVxufVxuXG5Qcm94eVdyaXRlci5wcm90b3R5cGUuX3N0YXQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgICAsIHByb3BzID0gbWUucHJvcHNcbiAgICAvLyBzdGF0IHRoZSB0aGluZyB0byBzZWUgd2hhdCB0aGUgcHJveHkgc2hvdWxkIGJlLlxuICAgICwgc3RhdCA9IHByb3BzLmZvbGxvdyA/IFwic3RhdFwiIDogXCJsc3RhdFwiXG5cbiAgZnNbc3RhdF0ocHJvcHMucGF0aCwgZnVuY3Rpb24gKGVyLCBjdXJyZW50KSB7XG4gICAgdmFyIHR5cGVcbiAgICBpZiAoZXIgfHwgIWN1cnJlbnQpIHtcbiAgICAgIHR5cGUgPSBcIkZpbGVcIlxuICAgIH0gZWxzZSB7XG4gICAgICB0eXBlID0gZ2V0VHlwZShjdXJyZW50KVxuICAgIH1cblxuICAgIHByb3BzW3R5cGVdID0gdHJ1ZVxuICAgIHByb3BzLnR5cGUgPSBtZS50eXBlID0gdHlwZVxuXG4gICAgbWUuX29sZCA9IGN1cnJlbnRcbiAgICBtZS5fYWRkUHJveHkoV3JpdGVyKHByb3BzLCBjdXJyZW50KSlcbiAgfSlcbn1cblxuUHJveHlXcml0ZXIucHJvdG90eXBlLl9hZGRQcm94eSA9IGZ1bmN0aW9uIChwcm94eSkge1xuICAvLyBjb25zb2xlLmVycm9yKFwifn4gc2V0IHByb3h5XCIsIHRoaXMucGF0aClcbiAgdmFyIG1lID0gdGhpc1xuICBpZiAobWUuX3Byb3h5KSB7XG4gICAgcmV0dXJuIG1lLmVycm9yKFwicHJveHkgYWxyZWFkeSBzZXRcIilcbiAgfVxuXG4gIG1lLl9wcm94eSA9IHByb3h5XG4gIDsgWyBcInJlYWR5XCJcbiAgICAsIFwiZXJyb3JcIlxuICAgICwgXCJjbG9zZVwiXG4gICAgLCBcInBpcGVcIlxuICAgICwgXCJkcmFpblwiXG4gICAgLCBcIndhcm5cIlxuICAgIF0uZm9yRWFjaChmdW5jdGlvbiAoZXYpIHtcbiAgICAgIHByb3h5Lm9uKGV2LCBtZS5lbWl0LmJpbmQobWUsIGV2KSlcbiAgICB9KVxuXG4gIG1lLmVtaXQoXCJwcm94eVwiLCBwcm94eSlcblxuICB2YXIgY2FsbHMgPSBtZS5fYnVmZmVyXG4gIGNhbGxzLmZvckVhY2goZnVuY3Rpb24gKGMpIHtcbiAgICAvLyBjb25zb2xlLmVycm9yKFwifn4gfn4gcHJveHkgYnVmZmVyZWQgY2FsbFwiLCBjWzBdLCBjWzFdKVxuICAgIHByb3h5W2NbMF1dLmFwcGx5KHByb3h5LCBjWzFdKVxuICB9KVxuICBtZS5fYnVmZmVyLmxlbmd0aCA9IDBcbiAgaWYgKG1lLl9uZWVkc0RyYWluKSBtZS5lbWl0KFwiZHJhaW5cIilcbn1cblxuUHJveHlXcml0ZXIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChlbnRyeSkge1xuICAvLyBjb25zb2xlLmVycm9yKFwifn4gcHJveHkgYWRkXCIpXG4gIGNvbGxlY3QoZW50cnkpXG5cbiAgaWYgKCF0aGlzLl9wcm94eSkge1xuICAgIHRoaXMuX2J1ZmZlci5wdXNoKFtcImFkZFwiLCBbZW50cnldXSlcbiAgICB0aGlzLl9uZWVkRHJhaW4gPSB0cnVlXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgcmV0dXJuIHRoaXMuX3Byb3h5LmFkZChlbnRyeSlcbn1cblxuUHJveHlXcml0ZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKGMpIHtcbiAgLy8gY29uc29sZS5lcnJvcihcIn5+IHByb3h5IHdyaXRlXCIpXG4gIGlmICghdGhpcy5fcHJveHkpIHtcbiAgICB0aGlzLl9idWZmZXIucHVzaChbXCJ3cml0ZVwiLCBbY11dKVxuICAgIHRoaXMuX25lZWREcmFpbiA9IHRydWVcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuICByZXR1cm4gdGhpcy5fcHJveHkud3JpdGUoYylcbn1cblxuUHJveHlXcml0ZXIucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uIChjKSB7XG4gIC8vIGNvbnNvbGUuZXJyb3IoXCJ+fiBwcm94eSBlbmRcIilcbiAgaWYgKCF0aGlzLl9wcm94eSkge1xuICAgIHRoaXMuX2J1ZmZlci5wdXNoKFtcImVuZFwiLCBbY11dKVxuICAgIHJldHVybiBmYWxzZVxuICB9XG4gIHJldHVybiB0aGlzLl9wcm94eS5lbmQoYylcbn1cbiIsIlxubW9kdWxlLmV4cG9ydHMgPSBSZWFkZXJcblxudmFyIGZzID0gcmVxdWlyZShcImdyYWNlZnVsLWZzXCIpXG4gICwgU3RyZWFtID0gcmVxdWlyZShcInN0cmVhbVwiKS5TdHJlYW1cbiAgLCBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKVxuICAsIHBhdGggPSByZXF1aXJlKFwicGF0aFwiKVxuICAsIGdldFR5cGUgPSByZXF1aXJlKFwiLi9nZXQtdHlwZS5qc1wiKVxuICAsIGhhcmRMaW5rcyA9IFJlYWRlci5oYXJkTGlua3MgPSB7fVxuICAsIEFic3RyYWN0ID0gcmVxdWlyZShcIi4vYWJzdHJhY3QuanNcIilcblxuLy8gTXVzdCBkbyB0aGlzICpiZWZvcmUqIGxvYWRpbmcgdGhlIGNoaWxkIGNsYXNzZXNcbmluaGVyaXRzKFJlYWRlciwgQWJzdHJhY3QpXG5cbnZhciBEaXJSZWFkZXIgPSByZXF1aXJlKFwiLi9kaXItcmVhZGVyLmpzXCIpXG4gICwgRmlsZVJlYWRlciA9IHJlcXVpcmUoXCIuL2ZpbGUtcmVhZGVyLmpzXCIpXG4gICwgTGlua1JlYWRlciA9IHJlcXVpcmUoXCIuL2xpbmstcmVhZGVyLmpzXCIpXG4gICwgU29ja2V0UmVhZGVyID0gcmVxdWlyZShcIi4vc29ja2V0LXJlYWRlci5qc1wiKVxuICAsIFByb3h5UmVhZGVyID0gcmVxdWlyZShcIi4vcHJveHktcmVhZGVyLmpzXCIpXG5cbmZ1bmN0aW9uIFJlYWRlciAocHJvcHMsIGN1cnJlbnRTdGF0KSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgaWYgKCEobWUgaW5zdGFuY2VvZiBSZWFkZXIpKSByZXR1cm4gbmV3IFJlYWRlcihwcm9wcywgY3VycmVudFN0YXQpXG5cbiAgaWYgKHR5cGVvZiBwcm9wcyA9PT0gXCJzdHJpbmdcIikge1xuICAgIHByb3BzID0geyBwYXRoOiBwcm9wcyB9XG4gIH1cblxuICBpZiAoIXByb3BzLnBhdGgpIHtcbiAgICBtZS5lcnJvcihcIk11c3QgcHJvdmlkZSBhIHBhdGhcIiwgbnVsbCwgdHJ1ZSlcbiAgfVxuXG4gIC8vIHBvbHltb3JwaGlzbS5cbiAgLy8gY2FsbCBmc3RyZWFtLlJlYWRlcihkaXIpIHRvIGdldCBhIERpclJlYWRlciBvYmplY3QsIGV0Yy5cbiAgLy8gTm90ZSB0aGF0LCB1bmxpa2UgaW4gdGhlIFdyaXRlciBjYXNlLCBQcm94eVJlYWRlciBpcyBnb2luZ1xuICAvLyB0byBiZSB0aGUgKm5vcm1hbCogc3RhdGUgb2YgYWZmYWlycywgc2luY2Ugd2UgcmFyZWx5IGtub3dcbiAgLy8gdGhlIHR5cGUgb2YgYSBmaWxlIHByaW9yIHRvIHJlYWRpbmcgaXQuXG5cblxuICB2YXIgdHlwZVxuICAgICwgQ2xhc3NUeXBlXG5cbiAgaWYgKHByb3BzLnR5cGUgJiYgdHlwZW9mIHByb3BzLnR5cGUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHR5cGUgPSBwcm9wcy50eXBlXG4gICAgQ2xhc3NUeXBlID0gdHlwZVxuICB9IGVsc2Uge1xuICAgIHR5cGUgPSBnZXRUeXBlKHByb3BzKVxuICAgIENsYXNzVHlwZSA9IFJlYWRlclxuICB9XG5cbiAgaWYgKGN1cnJlbnRTdGF0ICYmICF0eXBlKSB7XG4gICAgdHlwZSA9IGdldFR5cGUoY3VycmVudFN0YXQpXG4gICAgcHJvcHNbdHlwZV0gPSB0cnVlXG4gICAgcHJvcHMudHlwZSA9IHR5cGVcbiAgfVxuXG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgXCJEaXJlY3RvcnlcIjpcbiAgICAgIENsYXNzVHlwZSA9IERpclJlYWRlclxuICAgICAgYnJlYWtcblxuICAgIGNhc2UgXCJMaW5rXCI6XG4gICAgICAvLyBYWFggaGFyZCBsaW5rcyBhcmUganVzdCBmaWxlcy5cbiAgICAgIC8vIEhvd2V2ZXIsIGl0IHdvdWxkIGJlIGdvb2QgdG8ga2VlcCB0cmFjayBvZiBmaWxlcycgZGV2K2lub2RlXG4gICAgICAvLyBhbmQgbmxpbmsgdmFsdWVzLCBhbmQgY3JlYXRlIGEgSGFyZExpbmtSZWFkZXIgdGhhdCBlbWl0c1xuICAgICAgLy8gYSBsaW5rcGF0aCB2YWx1ZSBvZiB0aGUgb3JpZ2luYWwgY29weSwgc28gdGhhdCB0aGUgdGFyXG4gICAgICAvLyB3cml0ZXIgY2FuIHByZXNlcnZlIHRoZW0uXG4gICAgICAvLyBDbGFzc1R5cGUgPSBIYXJkTGlua1JlYWRlclxuICAgICAgLy8gYnJlYWtcblxuICAgIGNhc2UgXCJGaWxlXCI6XG4gICAgICBDbGFzc1R5cGUgPSBGaWxlUmVhZGVyXG4gICAgICBicmVha1xuXG4gICAgY2FzZSBcIlN5bWJvbGljTGlua1wiOlxuICAgICAgQ2xhc3NUeXBlID0gTGlua1JlYWRlclxuICAgICAgYnJlYWtcblxuICAgIGNhc2UgXCJTb2NrZXRcIjpcbiAgICAgIENsYXNzVHlwZSA9IFNvY2tldFJlYWRlclxuICAgICAgYnJlYWtcblxuICAgIGNhc2UgbnVsbDpcbiAgICAgIENsYXNzVHlwZSA9IFByb3h5UmVhZGVyXG4gICAgICBicmVha1xuICB9XG5cbiAgaWYgKCEobWUgaW5zdGFuY2VvZiBDbGFzc1R5cGUpKSB7XG4gICAgcmV0dXJuIG5ldyBDbGFzc1R5cGUocHJvcHMpXG4gIH1cblxuICBBYnN0cmFjdC5jYWxsKG1lKVxuXG4gIG1lLnJlYWRhYmxlID0gdHJ1ZVxuICBtZS53cml0YWJsZSA9IGZhbHNlXG5cbiAgbWUudHlwZSA9IHR5cGVcbiAgbWUucHJvcHMgPSBwcm9wc1xuICBtZS5kZXB0aCA9IHByb3BzLmRlcHRoID0gcHJvcHMuZGVwdGggfHwgMFxuICBtZS5wYXJlbnQgPSBwcm9wcy5wYXJlbnQgfHwgbnVsbFxuICBtZS5yb290ID0gcHJvcHMucm9vdCB8fCAocHJvcHMucGFyZW50ICYmIHByb3BzLnBhcmVudC5yb290KSB8fCBtZVxuXG4gIG1lLl9wYXRoID0gbWUucGF0aCA9IHBhdGgucmVzb2x2ZShwcm9wcy5wYXRoKVxuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJ3aW4zMlwiKSB7XG4gICAgbWUucGF0aCA9IG1lLl9wYXRoID0gbWUucGF0aC5yZXBsYWNlKC9cXD8vZywgXCJfXCIpXG4gICAgaWYgKG1lLl9wYXRoLmxlbmd0aCA+PSAyNjApIHtcbiAgICAgIC8vIGhvdyBET0VTIG9uZSBjcmVhdGUgZmlsZXMgb24gdGhlIG1vb24/XG4gICAgICAvLyBpZiB0aGUgcGF0aCBoYXMgc3BhY2VzIGluIGl0LCB0aGVuIFVOQyB3aWxsIGZhaWwuXG4gICAgICBtZS5fc3dhbGxvd0Vycm9ycyA9IHRydWVcbiAgICAgIC8vaWYgKG1lLl9wYXRoLmluZGV4T2YoXCIgXCIpID09PSAtMSkge1xuICAgICAgICBtZS5fcGF0aCA9IFwiXFxcXFxcXFw/XFxcXFwiICsgbWUucGF0aC5yZXBsYWNlKC9cXC8vZywgXCJcXFxcXCIpXG4gICAgICAvL31cbiAgICB9XG4gIH1cbiAgbWUuYmFzZW5hbWUgPSBwcm9wcy5iYXNlbmFtZSA9IHBhdGguYmFzZW5hbWUobWUucGF0aClcbiAgbWUuZGlybmFtZSA9IHByb3BzLmRpcm5hbWUgPSBwYXRoLmRpcm5hbWUobWUucGF0aClcblxuICAvLyB0aGVzZSBoYXZlIHNlcnZlZCB0aGVpciBwdXJwb3NlLCBhbmQgYXJlIG5vdyBqdXN0IG5vaXN5IGNsdXR0ZXJcbiAgcHJvcHMucGFyZW50ID0gcHJvcHMucm9vdCA9IG51bGxcblxuICAvLyBjb25zb2xlLmVycm9yKFwiXFxuXFxuXFxuJXMgc2V0dGluZyBzaXplIHRvXCIsIHByb3BzLnBhdGgsIHByb3BzLnNpemUpXG4gIG1lLnNpemUgPSBwcm9wcy5zaXplXG4gIG1lLmZpbHRlciA9IHR5cGVvZiBwcm9wcy5maWx0ZXIgPT09IFwiZnVuY3Rpb25cIiA/IHByb3BzLmZpbHRlciA6IG51bGxcbiAgaWYgKHByb3BzLnNvcnQgPT09IFwiYWxwaGFcIikgcHJvcHMuc29ydCA9IGFscGhhc29ydFxuXG4gIC8vIHN0YXJ0IHRoZSBiYWxsIHJvbGxpbmcuXG4gIC8vIHRoaXMgd2lsbCBzdGF0IHRoZSB0aGluZywgYW5kIHRoZW4gY2FsbCBtZS5fcmVhZCgpXG4gIC8vIHRvIHN0YXJ0IHJlYWRpbmcgd2hhdGV2ZXIgaXQgaXMuXG4gIC8vIGNvbnNvbGUuZXJyb3IoXCJjYWxsaW5nIHN0YXRcIiwgcHJvcHMucGF0aCwgY3VycmVudFN0YXQpXG4gIG1lLl9zdGF0KGN1cnJlbnRTdGF0KVxufVxuXG5mdW5jdGlvbiBhbHBoYXNvcnQgKGEsIGIpIHtcbiAgcmV0dXJuIGEgPT09IGIgPyAwXG4gICAgICAgOiBhLnRvTG93ZXJDYXNlKCkgPiBiLnRvTG93ZXJDYXNlKCkgPyAxXG4gICAgICAgOiBhLnRvTG93ZXJDYXNlKCkgPCBiLnRvTG93ZXJDYXNlKCkgPyAtMVxuICAgICAgIDogYSA+IGIgPyAxXG4gICAgICAgOiAtMVxufVxuXG5SZWFkZXIucHJvdG90eXBlLl9zdGF0ID0gZnVuY3Rpb24gKGN1cnJlbnRTdGF0KSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgICAsIHByb3BzID0gbWUucHJvcHNcbiAgICAsIHN0YXQgPSBwcm9wcy5mb2xsb3cgPyBcInN0YXRcIiA6IFwibHN0YXRcIlxuICAvLyBjb25zb2xlLmVycm9yKFwiUmVhZGVyLl9zdGF0XCIsIG1lLl9wYXRoLCBjdXJyZW50U3RhdClcbiAgaWYgKGN1cnJlbnRTdGF0KSBwcm9jZXNzLm5leHRUaWNrKHN0YXRDYi5iaW5kKG51bGwsIG51bGwsIGN1cnJlbnRTdGF0KSlcbiAgZWxzZSBmc1tzdGF0XShtZS5fcGF0aCwgc3RhdENiKVxuXG5cbiAgZnVuY3Rpb24gc3RhdENiIChlciwgcHJvcHNfKSB7XG4gICAgLy8gY29uc29sZS5lcnJvcihcIlJlYWRlci5fc3RhdCwgc3RhdENiXCIsIG1lLl9wYXRoLCBwcm9wc18sIHByb3BzXy5ubGluaylcbiAgICBpZiAoZXIpIHJldHVybiBtZS5lcnJvcihlcilcblxuICAgIE9iamVjdC5rZXlzKHByb3BzXykuZm9yRWFjaChmdW5jdGlvbiAoaykge1xuICAgICAgcHJvcHNba10gPSBwcm9wc19ba11cbiAgICB9KVxuXG4gICAgLy8gaWYgaXQncyBub3QgdGhlIGV4cGVjdGVkIHNpemUsIHRoZW4gYWJvcnQgaGVyZS5cbiAgICBpZiAodW5kZWZpbmVkICE9PSBtZS5zaXplICYmIHByb3BzLnNpemUgIT09IG1lLnNpemUpIHtcbiAgICAgIHJldHVybiBtZS5lcnJvcihcImluY29ycmVjdCBzaXplXCIpXG4gICAgfVxuICAgIG1lLnNpemUgPSBwcm9wcy5zaXplXG5cbiAgICB2YXIgdHlwZSA9IGdldFR5cGUocHJvcHMpXG4gICAgdmFyIGhhbmRsZUhhcmRsaW5rcyA9IHByb3BzLmhhcmRsaW5rcyAhPT0gZmFsc2VcbiAgICBcbiAgICAvLyBzcGVjaWFsIGxpdHRsZSB0aGluZyBmb3IgaGFuZGxpbmcgaGFyZGxpbmtzLlxuICAgIGlmIChoYW5kbGVIYXJkbGlua3MgJiYgdHlwZSAhPT0gXCJEaXJlY3RvcnlcIiAmJiBwcm9wcy5ubGluayAmJiBwcm9wcy5ubGluayA+IDEpIHtcbiAgICAgIHZhciBrID0gcHJvcHMuZGV2ICsgXCI6XCIgKyBwcm9wcy5pbm9cbiAgICAgIC8vIGNvbnNvbGUuZXJyb3IoXCJSZWFkZXIgaGFzIG5saW5rXCIsIG1lLl9wYXRoLCBrKVxuICAgICAgaWYgKGhhcmRMaW5rc1trXSA9PT0gbWUuX3BhdGggfHwgIWhhcmRMaW5rc1trXSkgaGFyZExpbmtzW2tdID0gbWUuX3BhdGhcbiAgICAgIGVsc2Uge1xuICAgICAgICAvLyBzd2l0Y2ggaW50byBoYXJkbGluayBtb2RlLlxuICAgICAgICB0eXBlID0gbWUudHlwZSA9IG1lLnByb3BzLnR5cGUgPSBcIkxpbmtcIlxuICAgICAgICBtZS5MaW5rID0gbWUucHJvcHMuTGluayA9IHRydWVcbiAgICAgICAgbWUubGlua3BhdGggPSBtZS5wcm9wcy5saW5rcGF0aCA9IGhhcmRMaW5rc1trXVxuICAgICAgICAvLyBjb25zb2xlLmVycm9yKFwiSGFyZGxpbmsgZGV0ZWN0ZWQsIHN3aXRjaGluZyBtb2RlXCIsIG1lLl9wYXRoLCBtZS5saW5rcGF0aClcbiAgICAgICAgLy8gU2V0dGluZyBfX3Byb3RvX18gd291bGQgYXJndWFibHkgYmUgdGhlIFwiY29ycmVjdFwiXG4gICAgICAgIC8vIGFwcHJvYWNoIGhlcmUsIGJ1dCB0aGF0IGp1c3Qgc2VlbXMgdG9vIHdyb25nLlxuICAgICAgICBtZS5fc3RhdCA9IG1lLl9yZWFkID0gTGlua1JlYWRlci5wcm90b3R5cGUuX3JlYWRcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobWUudHlwZSAmJiBtZS50eXBlICE9PSB0eXBlKSB7XG4gICAgICBtZS5lcnJvcihcIlVuZXhwZWN0ZWQgdHlwZTogXCIgKyB0eXBlKVxuICAgIH1cblxuICAgIC8vIGlmIHRoZSBmaWx0ZXIgZG9lc24ndCBwYXNzLCB0aGVuIGp1c3Qgc2tpcCBvdmVyIHRoaXMgb25lLlxuICAgIC8vIHN0aWxsIGhhdmUgdG8gZW1pdCBlbmQgc28gdGhhdCBkaXItd2Fsa2luZyBjYW4gbW92ZSBvbi5cbiAgICBpZiAobWUuZmlsdGVyKSB7XG4gICAgICB2YXIgd2hvID0gbWUuX3Byb3h5IHx8IG1lXG4gICAgICAvLyBzcGVjaWFsIGhhbmRsaW5nIGZvciBQcm94eVJlYWRlcnNcbiAgICAgIGlmICghbWUuZmlsdGVyLmNhbGwod2hvLCB3aG8sIHByb3BzKSkge1xuICAgICAgICBpZiAoIW1lLl9kaXNvd25lZCkge1xuICAgICAgICAgIG1lLmFib3J0KClcbiAgICAgICAgICBtZS5lbWl0KFwiZW5kXCIpXG4gICAgICAgICAgbWUuZW1pdChcImNsb3NlXCIpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gbGFzdCBjaGFuY2UgdG8gYWJvcnQgb3IgZGlzb3duIGJlZm9yZSB0aGUgZmxvdyBzdGFydHMhXG4gICAgdmFyIGV2ZW50cyA9IFtcIl9zdGF0XCIsIFwic3RhdFwiLCBcInJlYWR5XCJdXG4gICAgdmFyIGUgPSAwXG4gICAgOyhmdW5jdGlvbiBnbyAoKSB7XG4gICAgICBpZiAobWUuX2Fib3J0ZWQpIHtcbiAgICAgICAgbWUuZW1pdChcImVuZFwiKVxuICAgICAgICBtZS5lbWl0KFwiY2xvc2VcIilcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIGlmIChtZS5fcGF1c2VkICYmIG1lLnR5cGUgIT09IFwiRGlyZWN0b3J5XCIpIHtcbiAgICAgICAgbWUub25jZShcInJlc3VtZVwiLCBnbylcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIHZhciBldiA9IGV2ZW50c1tlICsrXVxuICAgICAgaWYgKCFldikge1xuICAgICAgICByZXR1cm4gbWUuX3JlYWQoKVxuICAgICAgfVxuICAgICAgbWUuZW1pdChldiwgcHJvcHMpXG4gICAgICBnbygpXG4gICAgfSkoKVxuICB9XG59XG5cblJlYWRlci5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uIChkZXN0LCBvcHRzKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgaWYgKHR5cGVvZiBkZXN0LmFkZCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgLy8gcGlwaW5nIHRvIGEgbXVsdGktY29tcGF0aWJsZSwgYW5kIHdlJ3ZlIGdvdCBkaXJlY3RvcnkgZW50cmllcy5cbiAgICBtZS5vbihcImVudHJ5XCIsIGZ1bmN0aW9uIChlbnRyeSkge1xuICAgICAgdmFyIHJldCA9IGRlc3QuYWRkKGVudHJ5KVxuICAgICAgaWYgKGZhbHNlID09PSByZXQpIHtcbiAgICAgICAgbWUucGF1c2UoKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICAvLyBjb25zb2xlLmVycm9yKFwiUiBQaXBlIGFwcGx5IFN0cmVhbSBQaXBlXCIpXG4gIHJldHVybiBTdHJlYW0ucHJvdG90eXBlLnBpcGUuYXBwbHkodGhpcywgYXJndW1lbnRzKVxufVxuXG5SZWFkZXIucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24gKHdobykge1xuICB0aGlzLl9wYXVzZWQgPSB0cnVlXG4gIHdobyA9IHdobyB8fCB0aGlzXG4gIHRoaXMuZW1pdChcInBhdXNlXCIsIHdobylcbiAgaWYgKHRoaXMuX3N0cmVhbSkgdGhpcy5fc3RyZWFtLnBhdXNlKHdobylcbn1cblxuUmVhZGVyLnByb3RvdHlwZS5yZXN1bWUgPSBmdW5jdGlvbiAod2hvKSB7XG4gIHRoaXMuX3BhdXNlZCA9IGZhbHNlXG4gIHdobyA9IHdobyB8fCB0aGlzXG4gIHRoaXMuZW1pdChcInJlc3VtZVwiLCB3aG8pXG4gIGlmICh0aGlzLl9zdHJlYW0pIHRoaXMuX3N0cmVhbS5yZXN1bWUod2hvKVxuICB0aGlzLl9yZWFkKClcbn1cblxuUmVhZGVyLnByb3RvdHlwZS5fcmVhZCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5lcnJvcihcIkNhbm5vdCByZWFkIHVua25vd24gdHlwZTogXCIrdGhpcy50eXBlKVxufVxuXG4iLCIvLyBKdXN0IGdldCB0aGUgc3RhdHMsIGFuZCB0aGVuIGRvbid0IGRvIGFueXRoaW5nLlxuLy8gWW91IGNhbid0IHJlYWxseSBcInJlYWRcIiBmcm9tIGEgc29ja2V0LiAgWW91IFwiY29ubmVjdFwiIHRvIGl0LlxuLy8gTW9zdGx5LCB0aGlzIGlzIGhlcmUgc28gdGhhdCByZWFkaW5nIGEgZGlyIHdpdGggYSBzb2NrZXQgaW4gaXRcbi8vIGRvZXNuJ3QgYmxvdyB1cC5cblxubW9kdWxlLmV4cG9ydHMgPSBTb2NrZXRSZWFkZXJcblxudmFyIGZzID0gcmVxdWlyZShcImdyYWNlZnVsLWZzXCIpXG4gICwgZnN0cmVhbSA9IHJlcXVpcmUoXCIuLi9mc3RyZWFtLmpzXCIpXG4gICwgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIilcbiAgLCBta2RpciA9IHJlcXVpcmUoXCJta2RpcnBcIilcbiAgLCBSZWFkZXIgPSByZXF1aXJlKFwiLi9yZWFkZXIuanNcIilcblxuaW5oZXJpdHMoU29ja2V0UmVhZGVyLCBSZWFkZXIpXG5cbmZ1bmN0aW9uIFNvY2tldFJlYWRlciAocHJvcHMpIHtcbiAgdmFyIG1lID0gdGhpc1xuICBpZiAoIShtZSBpbnN0YW5jZW9mIFNvY2tldFJlYWRlcikpIHRocm93IG5ldyBFcnJvcihcbiAgICBcIlNvY2tldFJlYWRlciBtdXN0IGJlIGNhbGxlZCBhcyBjb25zdHJ1Y3Rvci5cIilcblxuICBpZiAoIShwcm9wcy50eXBlID09PSBcIlNvY2tldFwiICYmIHByb3BzLlNvY2tldCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb24tc29ja2V0IHR5cGUgXCIrIHByb3BzLnR5cGUpXG4gIH1cblxuICBSZWFkZXIuY2FsbChtZSwgcHJvcHMpXG59XG5cblNvY2tldFJlYWRlci5wcm90b3R5cGUuX3JlYWQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgaWYgKG1lLl9wYXVzZWQpIHJldHVyblxuICAvLyBiYXNpY2FsbHkganVzdCBhIG5vLW9wLCBzaW5jZSB3ZSBnb3QgYWxsIHRoZSBpbmZvIHdlIGhhdmVcbiAgLy8gZnJvbSB0aGUgX3N0YXQgbWV0aG9kXG4gIGlmICghbWUuX2VuZGVkKSB7XG4gICAgbWUuZW1pdChcImVuZFwiKVxuICAgIG1lLmVtaXQoXCJjbG9zZVwiKVxuICAgIG1lLl9lbmRlZCA9IHRydWVcbiAgfVxufVxuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IFdyaXRlclxuXG52YXIgZnMgPSByZXF1aXJlKFwiZ3JhY2VmdWwtZnNcIilcbiAgLCBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKVxuICAsIHJpbXJhZiA9IHJlcXVpcmUoXCJyaW1yYWZcIilcbiAgLCBta2RpciA9IHJlcXVpcmUoXCJta2RpcnBcIilcbiAgLCBwYXRoID0gcmVxdWlyZShcInBhdGhcIilcbiAgLCB1bWFzayA9IHByb2Nlc3MucGxhdGZvcm0gPT09IFwid2luMzJcIiA/IDAgOiBwcm9jZXNzLnVtYXNrKClcbiAgLCBnZXRUeXBlID0gcmVxdWlyZShcIi4vZ2V0LXR5cGUuanNcIilcbiAgLCBBYnN0cmFjdCA9IHJlcXVpcmUoXCIuL2Fic3RyYWN0LmpzXCIpXG5cbi8vIE11c3QgZG8gdGhpcyAqYmVmb3JlKiBsb2FkaW5nIHRoZSBjaGlsZCBjbGFzc2VzXG5pbmhlcml0cyhXcml0ZXIsIEFic3RyYWN0KVxuXG5Xcml0ZXIuZGlybW9kZSA9IDA3NzcgJiAofnVtYXNrKVxuV3JpdGVyLmZpbGVtb2RlID0gMDY2NiAmICh+dW1hc2spXG5cbnZhciBEaXJXcml0ZXIgPSByZXF1aXJlKFwiLi9kaXItd3JpdGVyLmpzXCIpXG4gICwgTGlua1dyaXRlciA9IHJlcXVpcmUoXCIuL2xpbmstd3JpdGVyLmpzXCIpXG4gICwgRmlsZVdyaXRlciA9IHJlcXVpcmUoXCIuL2ZpbGUtd3JpdGVyLmpzXCIpXG4gICwgUHJveHlXcml0ZXIgPSByZXF1aXJlKFwiLi9wcm94eS13cml0ZXIuanNcIilcblxuLy8gcHJvcHMgaXMgdGhlIGRlc2lyZWQgc3RhdGUuICBjdXJyZW50IGlzIG9wdGlvbmFsbHkgdGhlIGN1cnJlbnQgc3RhdCxcbi8vIHByb3ZpZGVkIGhlcmUgc28gdGhhdCBzdWJjbGFzc2VzIGNhbiBhdm9pZCBzdGF0dGluZyB0aGUgdGFyZ2V0XG4vLyBtb3JlIHRoYW4gbmVjZXNzYXJ5LlxuZnVuY3Rpb24gV3JpdGVyIChwcm9wcywgY3VycmVudCkge1xuICB2YXIgbWUgPSB0aGlzXG5cbiAgaWYgKHR5cGVvZiBwcm9wcyA9PT0gXCJzdHJpbmdcIikge1xuICAgIHByb3BzID0geyBwYXRoOiBwcm9wcyB9XG4gIH1cblxuICBpZiAoIXByb3BzLnBhdGgpIG1lLmVycm9yKFwiTXVzdCBwcm92aWRlIGEgcGF0aFwiLCBudWxsLCB0cnVlKVxuXG4gIC8vIHBvbHltb3JwaGlzbS5cbiAgLy8gY2FsbCBmc3RyZWFtLldyaXRlcihkaXIpIHRvIGdldCBhIERpcldyaXRlciBvYmplY3QsIGV0Yy5cbiAgdmFyIHR5cGUgPSBnZXRUeXBlKHByb3BzKVxuICAgICwgQ2xhc3NUeXBlID0gV3JpdGVyXG5cbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSBcIkRpcmVjdG9yeVwiOlxuICAgICAgQ2xhc3NUeXBlID0gRGlyV3JpdGVyXG4gICAgICBicmVha1xuICAgIGNhc2UgXCJGaWxlXCI6XG4gICAgICBDbGFzc1R5cGUgPSBGaWxlV3JpdGVyXG4gICAgICBicmVha1xuICAgIGNhc2UgXCJMaW5rXCI6XG4gICAgY2FzZSBcIlN5bWJvbGljTGlua1wiOlxuICAgICAgQ2xhc3NUeXBlID0gTGlua1dyaXRlclxuICAgICAgYnJlYWtcbiAgICBjYXNlIG51bGw6XG4gICAgICAvLyBEb24ndCBrbm93IHlldCB3aGF0IHR5cGUgdG8gY3JlYXRlLCBzbyB3ZSB3cmFwIGluIGEgcHJveHkuXG4gICAgICBDbGFzc1R5cGUgPSBQcm94eVdyaXRlclxuICAgICAgYnJlYWtcbiAgfVxuXG4gIGlmICghKG1lIGluc3RhbmNlb2YgQ2xhc3NUeXBlKSkgcmV0dXJuIG5ldyBDbGFzc1R5cGUocHJvcHMpXG5cbiAgLy8gbm93IGdldCBkb3duIHRvIGJ1c2luZXNzLlxuXG4gIEFic3RyYWN0LmNhbGwobWUpXG5cbiAgLy8gcHJvcHMgaXMgd2hhdCB3ZSB3YW50IHRvIHNldC5cbiAgLy8gc2V0IHNvbWUgY29udmVuaWVuY2UgcHJvcGVydGllcyBhcyB3ZWxsLlxuICBtZS50eXBlID0gcHJvcHMudHlwZVxuICBtZS5wcm9wcyA9IHByb3BzXG4gIG1lLmRlcHRoID0gcHJvcHMuZGVwdGggfHwgMFxuICBtZS5jbG9iYmVyID0gZmFsc2UgPT09IHByb3BzLmNsb2JiZXIgPyBwcm9wcy5jbG9iYmVyIDogdHJ1ZVxuICBtZS5wYXJlbnQgPSBwcm9wcy5wYXJlbnQgfHwgbnVsbFxuICBtZS5yb290ID0gcHJvcHMucm9vdCB8fCAocHJvcHMucGFyZW50ICYmIHByb3BzLnBhcmVudC5yb290KSB8fCBtZVxuXG4gIG1lLl9wYXRoID0gbWUucGF0aCA9IHBhdGgucmVzb2x2ZShwcm9wcy5wYXRoKVxuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJ3aW4zMlwiKSB7XG4gICAgbWUucGF0aCA9IG1lLl9wYXRoID0gbWUucGF0aC5yZXBsYWNlKC9cXD8vZywgXCJfXCIpXG4gICAgaWYgKG1lLl9wYXRoLmxlbmd0aCA+PSAyNjApIHtcbiAgICAgIG1lLl9zd2FsbG93RXJyb3JzID0gdHJ1ZVxuICAgICAgbWUuX3BhdGggPSBcIlxcXFxcXFxcP1xcXFxcIiArIG1lLnBhdGgucmVwbGFjZSgvXFwvL2csIFwiXFxcXFwiKVxuICAgIH1cbiAgfVxuICBtZS5iYXNlbmFtZSA9IHBhdGguYmFzZW5hbWUocHJvcHMucGF0aClcbiAgbWUuZGlybmFtZSA9IHBhdGguZGlybmFtZShwcm9wcy5wYXRoKVxuICBtZS5saW5rcGF0aCA9IHByb3BzLmxpbmtwYXRoIHx8IG51bGxcblxuICBwcm9wcy5wYXJlbnQgPSBwcm9wcy5yb290ID0gbnVsbFxuXG4gIC8vIGNvbnNvbGUuZXJyb3IoXCJcXG5cXG5cXG4lcyBzZXR0aW5nIHNpemUgdG9cIiwgcHJvcHMucGF0aCwgcHJvcHMuc2l6ZSlcbiAgbWUuc2l6ZSA9IHByb3BzLnNpemVcblxuICBpZiAodHlwZW9mIHByb3BzLm1vZGUgPT09IFwic3RyaW5nXCIpIHtcbiAgICBwcm9wcy5tb2RlID0gcGFyc2VJbnQocHJvcHMubW9kZSwgOClcbiAgfVxuXG4gIG1lLnJlYWRhYmxlID0gZmFsc2VcbiAgbWUud3JpdGFibGUgPSB0cnVlXG5cbiAgLy8gYnVmZmVyIHVudGlsIHJlYWR5LCBvciB3aGlsZSBoYW5kbGluZyBhbm90aGVyIGVudHJ5XG4gIG1lLl9idWZmZXIgPSBbXVxuICBtZS5yZWFkeSA9IGZhbHNlXG5cbiAgbWUuZmlsdGVyID0gdHlwZW9mIHByb3BzLmZpbHRlciA9PT0gXCJmdW5jdGlvblwiID8gcHJvcHMuZmlsdGVyOiBudWxsXG5cbiAgLy8gc3RhcnQgdGhlIGJhbGwgcm9sbGluZy5cbiAgLy8gdGhpcyBjaGVja3Mgd2hhdCdzIHRoZXJlIGFscmVhZHksIGFuZCB0aGVuIGNhbGxzXG4gIC8vIG1lLl9jcmVhdGUoKSB0byBjYWxsIHRoZSBpbXBsLXNwZWNpZmljIGNyZWF0aW9uIHN0dWZmLlxuICBtZS5fc3RhdChjdXJyZW50KVxufVxuXG4vLyBDYWxsaW5nIHRoaXMgbWVhbnMgdGhhdCBpdCdzIHNvbWV0aGluZyB3ZSBjYW4ndCBjcmVhdGUuXG4vLyBKdXN0IGFzc2VydCB0aGF0IGl0J3MgYWxyZWFkeSB0aGVyZSwgb3RoZXJ3aXNlIHJhaXNlIGEgd2FybmluZy5cbldyaXRlci5wcm90b3R5cGUuX2NyZWF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG1lID0gdGhpc1xuICBmc1ttZS5wcm9wcy5mb2xsb3cgPyBcInN0YXRcIiA6IFwibHN0YXRcIl0obWUuX3BhdGgsIGZ1bmN0aW9uIChlciwgY3VycmVudCkge1xuICAgIGlmIChlcikge1xuICAgICAgcmV0dXJuIG1lLndhcm4oXCJDYW5ub3QgY3JlYXRlIFwiICsgbWUuX3BhdGggKyBcIlxcblwiICtcbiAgICAgICAgICAgICAgICAgICAgIFwiVW5zdXBwb3J0ZWQgdHlwZTogXCIrbWUudHlwZSwgXCJFTk9UU1VQXCIpXG4gICAgfVxuICAgIG1lLl9maW5pc2goKVxuICB9KVxufVxuXG5Xcml0ZXIucHJvdG90eXBlLl9zdGF0ID0gZnVuY3Rpb24gKGN1cnJlbnQpIHtcbiAgdmFyIG1lID0gdGhpc1xuICAgICwgcHJvcHMgPSBtZS5wcm9wc1xuICAgICwgc3RhdCA9IHByb3BzLmZvbGxvdyA/IFwic3RhdFwiIDogXCJsc3RhdFwiXG4gICAgLCB3aG8gPSBtZS5fcHJveHkgfHwgbWVcblxuICBpZiAoY3VycmVudCkgc3RhdENiKG51bGwsIGN1cnJlbnQpXG4gIGVsc2UgZnNbc3RhdF0obWUuX3BhdGgsIHN0YXRDYilcblxuICBmdW5jdGlvbiBzdGF0Q2IgKGVyLCBjdXJyZW50KSB7XG4gICAgaWYgKG1lLmZpbHRlciAmJiAhbWUuZmlsdGVyLmNhbGwod2hvLCB3aG8sIGN1cnJlbnQpKSB7XG4gICAgICBtZS5fYWJvcnRlZCA9IHRydWVcbiAgICAgIG1lLmVtaXQoXCJlbmRcIilcbiAgICAgIG1lLmVtaXQoXCJjbG9zZVwiKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gaWYgaXQncyBub3QgdGhlcmUsIGdyZWF0LiAgV2UnbGwganVzdCBjcmVhdGUgaXQuXG4gICAgLy8gaWYgaXQgaXMgdGhlcmUsIHRoZW4gd2UnbGwgbmVlZCB0byBjaGFuZ2Ugd2hhdGV2ZXIgZGlmZmVyc1xuICAgIGlmIChlciB8fCAhY3VycmVudCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZShtZSlcbiAgICB9XG5cbiAgICBtZS5fb2xkID0gY3VycmVudFxuICAgIHZhciBjdXJyZW50VHlwZSA9IGdldFR5cGUoY3VycmVudClcblxuICAgIC8vIGlmIGl0J3MgYSB0eXBlIGNoYW5nZSwgdGhlbiB3ZSBuZWVkIHRvIGNsb2JiZXIgb3IgZXJyb3IuXG4gICAgLy8gaWYgaXQncyBub3QgYSB0eXBlIGNoYW5nZSwgdGhlbiBsZXQgdGhlIGltcGwgdGFrZSBjYXJlIG9mIGl0LlxuICAgIGlmIChjdXJyZW50VHlwZSAhPT0gbWUudHlwZSkge1xuICAgICAgcmV0dXJuIHJpbXJhZihtZS5fcGF0aCwgZnVuY3Rpb24gKGVyKSB7XG4gICAgICAgIGlmIChlcikgcmV0dXJuIG1lLmVycm9yKGVyKVxuICAgICAgICBtZS5fb2xkID0gbnVsbFxuICAgICAgICBjcmVhdGUobWUpXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8vIG90aGVyd2lzZSwganVzdCBoYW5kbGUgaW4gdGhlIGFwcC1zcGVjaWZpYyB3YXlcbiAgICAvLyB0aGlzIGNyZWF0ZXMgYSBmcy5Xcml0ZVN0cmVhbSwgb3IgbWtkaXIncywgb3Igd2hhdGV2ZXJcbiAgICBjcmVhdGUobWUpXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlIChtZSkge1xuICAvLyBjb25zb2xlLmVycm9yKFwiVyBjcmVhdGVcIiwgbWUuX3BhdGgsIFdyaXRlci5kaXJtb2RlKVxuXG4gIC8vIFhYWCBOZWVkIHRvIGNsb2JiZXIgbm9uLWRpcnMgdGhhdCBhcmUgaW4gdGhlIHdheSxcbiAgLy8gdW5sZXNzIHsgY2xvYmJlcjogZmFsc2UgfSBpbiB0aGUgcHJvcHMuXG4gIG1rZGlyKHBhdGguZGlybmFtZShtZS5fcGF0aCksIFdyaXRlci5kaXJtb2RlLCBmdW5jdGlvbiAoZXIsIG1hZGUpIHtcbiAgICAvLyBjb25zb2xlLmVycm9yKFwiVyBjcmVhdGVkXCIsIHBhdGguZGlybmFtZShtZS5fcGF0aCksIGVyKVxuICAgIGlmIChlcikgcmV0dXJuIG1lLmVycm9yKGVyKVxuXG4gICAgLy8gbGF0ZXIgb24sIHdlIGhhdmUgdG8gc2V0IHRoZSBtb2RlIGFuZCBvd25lciBmb3IgdGhlc2VcbiAgICBtZS5fbWFkZURpciA9IG1hZGVcbiAgICByZXR1cm4gbWUuX2NyZWF0ZSgpXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGVuZENobW9kIChtZSwgd2FudCwgY3VycmVudCwgcGF0aCwgY2IpIHtcbiAgICB2YXIgd2FudE1vZGUgPSB3YW50Lm1vZGVcbiAgICAgICwgY2htb2QgPSB3YW50LmZvbGxvdyB8fCBtZS50eXBlICE9PSBcIlN5bWJvbGljTGlua1wiXG4gICAgICAgICAgICAgID8gXCJjaG1vZFwiIDogXCJsY2htb2RcIlxuXG4gIGlmICghZnNbY2htb2RdKSByZXR1cm4gY2IoKVxuICBpZiAodHlwZW9mIHdhbnRNb2RlICE9PSBcIm51bWJlclwiKSByZXR1cm4gY2IoKVxuXG4gIHZhciBjdXJNb2RlID0gY3VycmVudC5tb2RlICYgMDc3N1xuICB3YW50TW9kZSA9IHdhbnRNb2RlICYgMDc3N1xuICBpZiAod2FudE1vZGUgPT09IGN1ck1vZGUpIHJldHVybiBjYigpXG5cbiAgZnNbY2htb2RdKHBhdGgsIHdhbnRNb2RlLCBjYilcbn1cblxuXG5mdW5jdGlvbiBlbmRDaG93biAobWUsIHdhbnQsIGN1cnJlbnQsIHBhdGgsIGNiKSB7XG4gIC8vIERvbid0IGV2ZW4gdHJ5IGl0IHVubGVzcyByb290LiAgVG9vIGVhc3kgdG8gRVBFUk0uXG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSBcIndpbjMyXCIpIHJldHVybiBjYigpXG4gIGlmICghcHJvY2Vzcy5nZXR1aWQgfHwgIXByb2Nlc3MuZ2V0dWlkKCkgPT09IDApIHJldHVybiBjYigpXG4gIGlmICh0eXBlb2Ygd2FudC51aWQgIT09IFwibnVtYmVyXCIgJiZcbiAgICAgIHR5cGVvZiB3YW50LmdpZCAhPT0gXCJudW1iZXJcIiApIHJldHVybiBjYigpXG5cbiAgaWYgKGN1cnJlbnQudWlkID09PSB3YW50LnVpZCAmJlxuICAgICAgY3VycmVudC5naWQgPT09IHdhbnQuZ2lkKSByZXR1cm4gY2IoKVxuXG4gIHZhciBjaG93biA9IChtZS5wcm9wcy5mb2xsb3cgfHwgbWUudHlwZSAhPT0gXCJTeW1ib2xpY0xpbmtcIilcbiAgICAgICAgICAgID8gXCJjaG93blwiIDogXCJsY2hvd25cIlxuICBpZiAoIWZzW2Nob3duXSkgcmV0dXJuIGNiKClcblxuICBpZiAodHlwZW9mIHdhbnQudWlkICE9PSBcIm51bWJlclwiKSB3YW50LnVpZCA9IGN1cnJlbnQudWlkXG4gIGlmICh0eXBlb2Ygd2FudC5naWQgIT09IFwibnVtYmVyXCIpIHdhbnQuZ2lkID0gY3VycmVudC5naWRcblxuICBmc1tjaG93bl0ocGF0aCwgd2FudC51aWQsIHdhbnQuZ2lkLCBjYilcbn1cblxuZnVuY3Rpb24gZW5kVXRpbWVzIChtZSwgd2FudCwgY3VycmVudCwgcGF0aCwgY2IpIHtcbiAgaWYgKCFmcy51dGltZXMgfHwgcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJ3aW4zMlwiKSByZXR1cm4gY2IoKVxuXG4gIHZhciB1dGltZXMgPSAod2FudC5mb2xsb3cgfHwgbWUudHlwZSAhPT0gXCJTeW1ib2xpY0xpbmtcIilcbiAgICAgICAgICAgICA/IFwidXRpbWVzXCIgOiBcImx1dGltZXNcIlxuXG4gIGlmICh1dGltZXMgPT09IFwibHV0aW1lc1wiICYmICFmc1t1dGltZXNdKSB7XG4gICAgdXRpbWVzID0gXCJ1dGltZXNcIlxuICB9XG5cbiAgaWYgKCFmc1t1dGltZXNdKSByZXR1cm4gY2IoKVxuXG4gIHZhciBjdXJBID0gY3VycmVudC5hdGltZVxuICAgICwgY3VyTSA9IGN1cnJlbnQubXRpbWVcbiAgICAsIG1lQSA9IHdhbnQuYXRpbWVcbiAgICAsIG1lTSA9IHdhbnQubXRpbWVcblxuICBpZiAobWVBID09PSB1bmRlZmluZWQpIG1lQSA9IGN1ckFcbiAgaWYgKG1lTSA9PT0gdW5kZWZpbmVkKSBtZU0gPSBjdXJNXG5cbiAgaWYgKCFpc0RhdGUobWVBKSkgbWVBID0gbmV3IERhdGUobWVBKVxuICBpZiAoIWlzRGF0ZShtZU0pKSBtZUEgPSBuZXcgRGF0ZShtZU0pXG5cbiAgaWYgKG1lQS5nZXRUaW1lKCkgPT09IGN1ckEuZ2V0VGltZSgpICYmXG4gICAgICBtZU0uZ2V0VGltZSgpID09PSBjdXJNLmdldFRpbWUoKSkgcmV0dXJuIGNiKClcblxuICBmc1t1dGltZXNdKHBhdGgsIG1lQSwgbWVNLCBjYilcbn1cblxuXG4vLyBYWFggVGhpcyBmdW5jdGlvbiBpcyBiZWFzdGx5LiAgQnJlYWsgaXQgdXAhXG5Xcml0ZXIucHJvdG90eXBlLl9maW5pc2ggPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBtZSA9IHRoaXNcblxuICAvLyBjb25zb2xlLmVycm9yKFwiIFcgRmluaXNoXCIsIG1lLl9wYXRoLCBtZS5zaXplKVxuXG4gIC8vIHNldCB1cCBhbGwgdGhlIHRoaW5ncy5cbiAgLy8gQXQgdGhpcyBwb2ludCwgd2UncmUgYWxyZWFkeSBkb25lIHdyaXRpbmcgd2hhdGV2ZXIgd2UndmUgZ290dGEgd3JpdGUsXG4gIC8vIGFkZGluZyBmaWxlcyB0byB0aGUgZGlyLCBldGMuXG4gIHZhciB0b2RvID0gMFxuICB2YXIgZXJyU3RhdGUgPSBudWxsXG4gIHZhciBkb25lID0gZmFsc2VcblxuICBpZiAobWUuX29sZCkge1xuICAgIC8vIHRoZSB0aW1lcyB3aWxsIGFsbW9zdCAqY2VydGFpbmx5KiBoYXZlIGNoYW5nZWQuXG4gICAgLy8gYWRkcyB0aGUgdXRpbWVzIHN5c2NhbGwsIGJ1dCByZW1vdmUgYW5vdGhlciBzdGF0LlxuICAgIG1lLl9vbGQuYXRpbWUgPSBuZXcgRGF0ZSgwKVxuICAgIG1lLl9vbGQubXRpbWUgPSBuZXcgRGF0ZSgwKVxuICAgIC8vIGNvbnNvbGUuZXJyb3IoXCIgVyBGaW5pc2ggU3RhbGUgU3RhdFwiLCBtZS5fcGF0aCwgbWUuc2l6ZSlcbiAgICBzZXRQcm9wcyhtZS5fb2xkKVxuICB9IGVsc2Uge1xuICAgIHZhciBzdGF0ID0gbWUucHJvcHMuZm9sbG93ID8gXCJzdGF0XCIgOiBcImxzdGF0XCJcbiAgICAvLyBjb25zb2xlLmVycm9yKFwiIFcgRmluaXNoIFN0YXRpbmdcIiwgbWUuX3BhdGgsIG1lLnNpemUpXG4gICAgZnNbc3RhdF0obWUuX3BhdGgsIGZ1bmN0aW9uIChlciwgY3VycmVudCkge1xuICAgICAgLy8gY29uc29sZS5lcnJvcihcIiBXIEZpbmlzaCBTdGF0ZWRcIiwgbWUuX3BhdGgsIG1lLnNpemUsIGN1cnJlbnQpXG4gICAgICBpZiAoZXIpIHtcbiAgICAgICAgLy8gaWYgd2UncmUgaW4gdGhlIHByb2Nlc3Mgb2Ygd3JpdGluZyBvdXQgYVxuICAgICAgICAvLyBkaXJlY3RvcnksIGl0J3MgdmVyeSBwb3NzaWJsZSB0aGF0IHRoZSB0aGluZyB3ZSdyZSBsaW5raW5nIHRvXG4gICAgICAgIC8vIGRvZXNuJ3QgZXhpc3QgeWV0IChlc3BlY2lhbGx5IGlmIGl0IHdhcyBpbnRlbmRlZCBhcyBhIHN5bWxpbmspLFxuICAgICAgICAvLyBzbyBzd2FsbG93IEVOT0VOVCBlcnJvcnMgaGVyZSBhbmQganVzdCBzb2xkaWVyIG9uLlxuICAgICAgICBpZiAoZXIuY29kZSA9PT0gXCJFTk9FTlRcIiAmJlxuICAgICAgICAgICAgKG1lLnR5cGUgPT09IFwiTGlua1wiIHx8IG1lLnR5cGUgPT09IFwiU3ltYm9saWNMaW5rXCIpICYmXG4gICAgICAgICAgICBwcm9jZXNzLnBsYXRmb3JtID09PSBcIndpbjMyXCIpIHtcbiAgICAgICAgICBtZS5yZWFkeSA9IHRydWVcbiAgICAgICAgICBtZS5lbWl0KFwicmVhZHlcIilcbiAgICAgICAgICBtZS5lbWl0KFwiZW5kXCIpXG4gICAgICAgICAgbWUuZW1pdChcImNsb3NlXCIpXG4gICAgICAgICAgbWUuZW5kID0gbWUuX2ZpbmlzaCA9IGZ1bmN0aW9uICgpIHt9XG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH0gZWxzZSByZXR1cm4gbWUuZXJyb3IoZXIpXG4gICAgICB9XG4gICAgICBzZXRQcm9wcyhtZS5fb2xkID0gY3VycmVudClcbiAgICB9KVxuICB9XG5cbiAgcmV0dXJuXG5cbiAgZnVuY3Rpb24gc2V0UHJvcHMgKGN1cnJlbnQpIHtcbiAgICB0b2RvICs9IDNcbiAgICBlbmRDaG1vZChtZSwgbWUucHJvcHMsIGN1cnJlbnQsIG1lLl9wYXRoLCBuZXh0KFwiY2htb2RcIikpXG4gICAgZW5kQ2hvd24obWUsIG1lLnByb3BzLCBjdXJyZW50LCBtZS5fcGF0aCwgbmV4dChcImNob3duXCIpKVxuICAgIGVuZFV0aW1lcyhtZSwgbWUucHJvcHMsIGN1cnJlbnQsIG1lLl9wYXRoLCBuZXh0KFwidXRpbWVzXCIpKVxuICB9XG5cbiAgZnVuY3Rpb24gbmV4dCAod2hhdCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoZXIpIHtcbiAgICAgIC8vIGNvbnNvbGUuZXJyb3IoXCIgICBXIEZpbmlzaFwiLCB3aGF0LCB0b2RvKVxuICAgICAgaWYgKGVyclN0YXRlKSByZXR1cm5cbiAgICAgIGlmIChlcikge1xuICAgICAgICBlci5mc3RyZWFtX2ZpbmlzaF9jYWxsID0gd2hhdFxuICAgICAgICByZXR1cm4gbWUuZXJyb3IoZXJyU3RhdGUgPSBlcilcbiAgICAgIH1cbiAgICAgIGlmICgtLXRvZG8gPiAwKSByZXR1cm5cbiAgICAgIGlmIChkb25lKSByZXR1cm5cbiAgICAgIGRvbmUgPSB0cnVlXG5cbiAgICAgIC8vIHdlIG1heSBzdGlsbCBuZWVkIHRvIHNldCB0aGUgbW9kZS9ldGMuIG9uIHNvbWUgcGFyZW50IGRpcnNcbiAgICAgIC8vIHRoYXQgd2VyZSBjcmVhdGVkIHByZXZpb3VzbHkuICBkZWxheSBlbmQvY2xvc2UgdW50aWwgdGhlbi5cbiAgICAgIGlmICghbWUuX21hZGVEaXIpIHJldHVybiBlbmQoKVxuICAgICAgZWxzZSBlbmRNYWRlRGlyKG1lLCBtZS5fcGF0aCwgZW5kKVxuXG4gICAgICBmdW5jdGlvbiBlbmQgKGVyKSB7XG4gICAgICAgIGlmIChlcikge1xuICAgICAgICAgIGVyLmZzdHJlYW1fZmluaXNoX2NhbGwgPSBcInNldHVwTWFkZURpclwiXG4gICAgICAgICAgcmV0dXJuIG1lLmVycm9yKGVyKVxuICAgICAgICB9XG4gICAgICAgIC8vIGFsbCB0aGUgcHJvcHMgaGF2ZSBiZWVuIHNldCwgc28gd2UncmUgY29tcGxldGVseSBkb25lLlxuICAgICAgICBtZS5lbWl0KFwiZW5kXCIpXG4gICAgICAgIG1lLmVtaXQoXCJjbG9zZVwiKVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBlbmRNYWRlRGlyIChtZSwgcCwgY2IpIHtcbiAgdmFyIG1hZGUgPSBtZS5fbWFkZURpclxuICAvLyBldmVyeXRoaW5nICpiZXR3ZWVuKiBtYWRlIGFuZCBwYXRoLmRpcm5hbWUobWUuX3BhdGgpXG4gIC8vIG5lZWRzIHRvIGJlIHNldCB1cC4gIE5vdGUgdGhhdCB0aGlzIG1heSBqdXN0IGJlIG9uZSBkaXIuXG4gIHZhciBkID0gcGF0aC5kaXJuYW1lKHApXG5cbiAgZW5kTWFkZURpcl8obWUsIGQsIGZ1bmN0aW9uIChlcikge1xuICAgIGlmIChlcikgcmV0dXJuIGNiKGVyKVxuICAgIGlmIChkID09PSBtYWRlKSB7XG4gICAgICByZXR1cm4gY2IoKVxuICAgIH1cbiAgICBlbmRNYWRlRGlyKG1lLCBkLCBjYilcbiAgfSlcbn1cblxuZnVuY3Rpb24gZW5kTWFkZURpcl8gKG1lLCBwLCBjYikge1xuICB2YXIgZGlyUHJvcHMgPSB7fVxuICBPYmplY3Qua2V5cyhtZS5wcm9wcykuZm9yRWFjaChmdW5jdGlvbiAoaykge1xuICAgIGRpclByb3BzW2tdID0gbWUucHJvcHNba11cblxuICAgIC8vIG9ubHkgbWFrZSBub24tcmVhZGFibGUgZGlycyBpZiBleHBsaWNpdGx5IHJlcXVlc3RlZC5cbiAgICBpZiAoayA9PT0gXCJtb2RlXCIgJiYgbWUudHlwZSAhPT0gXCJEaXJlY3RvcnlcIikge1xuICAgICAgZGlyUHJvcHNba10gPSBkaXJQcm9wc1trXSB8IDAxMTFcbiAgICB9XG4gIH0pXG5cbiAgdmFyIHRvZG8gPSAzXG4gICwgZXJyU3RhdGUgPSBudWxsXG4gIGZzLnN0YXQocCwgZnVuY3Rpb24gKGVyLCBjdXJyZW50KSB7XG4gICAgaWYgKGVyKSByZXR1cm4gY2IoZXJyU3RhdGUgPSBlcilcbiAgICBlbmRDaG1vZChtZSwgZGlyUHJvcHMsIGN1cnJlbnQsIHAsIG5leHQpXG4gICAgZW5kQ2hvd24obWUsIGRpclByb3BzLCBjdXJyZW50LCBwLCBuZXh0KVxuICAgIGVuZFV0aW1lcyhtZSwgZGlyUHJvcHMsIGN1cnJlbnQsIHAsIG5leHQpXG4gIH0pXG5cbiAgZnVuY3Rpb24gbmV4dCAoZXIpIHtcbiAgICBpZiAoZXJyU3RhdGUpIHJldHVyblxuICAgIGlmIChlcikgcmV0dXJuIGNiKGVyclN0YXRlID0gZXIpXG4gICAgaWYgKC0tIHRvZG8gPT09IDApIHJldHVybiBjYigpXG4gIH1cbn1cblxuV3JpdGVyLnByb3RvdHlwZS5waXBlID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmVycm9yKFwiQ2FuJ3QgcGlwZSBmcm9tIHdyaXRhYmxlIHN0cmVhbVwiKVxufVxuXG5Xcml0ZXIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5lcnJvcihcIkNhbm5vdCBhZGQgdG8gbm9uLURpcmVjdG9yeSB0eXBlXCIpXG59XG5cbldyaXRlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0cnVlXG59XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nIChkKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZClcbn1cblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIHR5cGVvZiBkID09PSAnb2JqZWN0JyAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCduYXRpdmVzJykucmVxdWlyZSgnZnMnLCBbJ3N0cmVhbSddKVxuIiwiLy8gTW9ua2V5LXBhdGNoaW5nIHRoZSBmcyBtb2R1bGUuXG4vLyBJdCdzIHVnbHksIGJ1dCB0aGVyZSBpcyBzaW1wbHkgbm8gb3RoZXIgd2F5IHRvIGRvIHRoaXMuXG52YXIgZnMgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vZnMuanMnKVxuXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JylcblxuLy8gZml4IHVwIHNvbWUgYnVzdGVkIHN0dWZmLCBtb3N0bHkgb24gd2luZG93cyBhbmQgb2xkIG5vZGVzXG5yZXF1aXJlKCcuL3BvbHlmaWxscy5qcycpXG5cbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpXG5cbmZ1bmN0aW9uIG5vb3AgKCkge31cblxudmFyIGRlYnVnID0gbm9vcFxuaWYgKHV0aWwuZGVidWdsb2cpXG4gIGRlYnVnID0gdXRpbC5kZWJ1Z2xvZygnZ2ZzJylcbmVsc2UgaWYgKC9cXGJnZnNcXGIvaS50ZXN0KHByb2Nlc3MuZW52Lk5PREVfREVCVUcgfHwgJycpKVxuICBkZWJ1ZyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBtID0gdXRpbC5mb3JtYXQuYXBwbHkodXRpbCwgYXJndW1lbnRzKVxuICAgIG0gPSAnR0ZTOiAnICsgbS5zcGxpdCgvXFxuLykuam9pbignXFxuR0ZTOiAnKVxuICAgIGNvbnNvbGUuZXJyb3IobSlcbiAgfVxuXG5pZiAoL1xcYmdmc1xcYi9pLnRlc3QocHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJykpIHtcbiAgcHJvY2Vzcy5vbignZXhpdCcsIGZ1bmN0aW9uKCkge1xuICAgIGRlYnVnKCdmZHMnLCBmZHMpXG4gICAgZGVidWcocXVldWUpXG4gICAgYXNzZXJ0LmVxdWFsKHF1ZXVlLmxlbmd0aCwgMClcbiAgfSlcbn1cblxuXG52YXIgb3JpZ2luYWxPcGVuID0gZnMub3BlblxuZnMub3BlbiA9IG9wZW5cblxuZnVuY3Rpb24gb3BlbihwYXRoLCBmbGFncywgbW9kZSwgY2IpIHtcbiAgaWYgKHR5cGVvZiBtb2RlID09PSBcImZ1bmN0aW9uXCIpIGNiID0gbW9kZSwgbW9kZSA9IG51bGxcbiAgaWYgKHR5cGVvZiBjYiAhPT0gXCJmdW5jdGlvblwiKSBjYiA9IG5vb3BcbiAgbmV3IE9wZW5SZXEocGF0aCwgZmxhZ3MsIG1vZGUsIGNiKVxufVxuXG5mdW5jdGlvbiBPcGVuUmVxKHBhdGgsIGZsYWdzLCBtb2RlLCBjYikge1xuICB0aGlzLnBhdGggPSBwYXRoXG4gIHRoaXMuZmxhZ3MgPSBmbGFnc1xuICB0aGlzLm1vZGUgPSBtb2RlXG4gIHRoaXMuY2IgPSBjYlxuICBSZXEuY2FsbCh0aGlzKVxufVxuXG51dGlsLmluaGVyaXRzKE9wZW5SZXEsIFJlcSlcblxuT3BlblJlcS5wcm90b3R5cGUucHJvY2VzcyA9IGZ1bmN0aW9uKCkge1xuICBvcmlnaW5hbE9wZW4uY2FsbChmcywgdGhpcy5wYXRoLCB0aGlzLmZsYWdzLCB0aGlzLm1vZGUsIHRoaXMuZG9uZSlcbn1cblxudmFyIGZkcyA9IHt9XG5PcGVuUmVxLnByb3RvdHlwZS5kb25lID0gZnVuY3Rpb24oZXIsIGZkKSB7XG4gIGRlYnVnKCdvcGVuIGRvbmUnLCBlciwgZmQpXG4gIGlmIChmZClcbiAgICBmZHNbJ2ZkJyArIGZkXSA9IHRoaXMucGF0aFxuICBSZXEucHJvdG90eXBlLmRvbmUuY2FsbCh0aGlzLCBlciwgZmQpXG59XG5cblxudmFyIG9yaWdpbmFsUmVhZGRpciA9IGZzLnJlYWRkaXJcbmZzLnJlYWRkaXIgPSByZWFkZGlyXG5cbmZ1bmN0aW9uIHJlYWRkaXIocGF0aCwgY2IpIHtcbiAgaWYgKHR5cGVvZiBjYiAhPT0gXCJmdW5jdGlvblwiKSBjYiA9IG5vb3BcbiAgbmV3IFJlYWRkaXJSZXEocGF0aCwgY2IpXG59XG5cbmZ1bmN0aW9uIFJlYWRkaXJSZXEocGF0aCwgY2IpIHtcbiAgdGhpcy5wYXRoID0gcGF0aFxuICB0aGlzLmNiID0gY2JcbiAgUmVxLmNhbGwodGhpcylcbn1cblxudXRpbC5pbmhlcml0cyhSZWFkZGlyUmVxLCBSZXEpXG5cblJlYWRkaXJSZXEucHJvdG90eXBlLnByb2Nlc3MgPSBmdW5jdGlvbigpIHtcbiAgb3JpZ2luYWxSZWFkZGlyLmNhbGwoZnMsIHRoaXMucGF0aCwgdGhpcy5kb25lKVxufVxuXG5SZWFkZGlyUmVxLnByb3RvdHlwZS5kb25lID0gZnVuY3Rpb24oZXIsIGZpbGVzKSB7XG4gIGlmIChmaWxlcyAmJiBmaWxlcy5zb3J0KVxuICAgIGZpbGVzID0gZmlsZXMuc29ydCgpXG4gIFJlcS5wcm90b3R5cGUuZG9uZS5jYWxsKHRoaXMsIGVyLCBmaWxlcylcbiAgb25jbG9zZSgpXG59XG5cblxudmFyIG9yaWdpbmFsQ2xvc2UgPSBmcy5jbG9zZVxuZnMuY2xvc2UgPSBjbG9zZVxuXG5mdW5jdGlvbiBjbG9zZSAoZmQsIGNiKSB7XG4gIGRlYnVnKCdjbG9zZScsIGZkKVxuICBpZiAodHlwZW9mIGNiICE9PSBcImZ1bmN0aW9uXCIpIGNiID0gbm9vcFxuICBkZWxldGUgZmRzWydmZCcgKyBmZF1cbiAgb3JpZ2luYWxDbG9zZS5jYWxsKGZzLCBmZCwgZnVuY3Rpb24oZXIpIHtcbiAgICBvbmNsb3NlKClcbiAgICBjYihlcilcbiAgfSlcbn1cblxuXG52YXIgb3JpZ2luYWxDbG9zZVN5bmMgPSBmcy5jbG9zZVN5bmNcbmZzLmNsb3NlU3luYyA9IGNsb3NlU3luY1xuXG5mdW5jdGlvbiBjbG9zZVN5bmMgKGZkKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIG9yaWdpbmFsQ2xvc2VTeW5jKGZkKVxuICB9IGZpbmFsbHkge1xuICAgIG9uY2xvc2UoKVxuICB9XG59XG5cblxuLy8gUmVxIGNsYXNzXG5mdW5jdGlvbiBSZXEgKCkge1xuICAvLyBzdGFydCBwcm9jZXNzaW5nXG4gIHRoaXMuZG9uZSA9IHRoaXMuZG9uZS5iaW5kKHRoaXMpXG4gIHRoaXMuZmFpbHVyZXMgPSAwXG4gIHRoaXMucHJvY2VzcygpXG59XG5cblJlcS5wcm90b3R5cGUuZG9uZSA9IGZ1bmN0aW9uIChlciwgcmVzdWx0KSB7XG4gIHZhciB0cnlBZ2FpbiA9IGZhbHNlXG4gIGlmIChlcikge1xuICAgIHZhciBjb2RlID0gZXIuY29kZVxuICAgIHZhciB0cnlBZ2FpbiA9IGNvZGUgPT09IFwiRU1GSUxFXCIgfHwgY29kZSA9PT0gXCJFTkZJTEVcIlxuICAgIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSBcIndpbjMyXCIpXG4gICAgICB0cnlBZ2FpbiA9IHRyeUFnYWluIHx8IGNvZGUgPT09IFwiT0tcIlxuICB9XG5cbiAgaWYgKHRyeUFnYWluKSB7XG4gICAgdGhpcy5mYWlsdXJlcyArK1xuICAgIGVucXVldWUodGhpcylcbiAgfSBlbHNlIHtcbiAgICB2YXIgY2IgPSB0aGlzLmNiXG4gICAgY2IoZXIsIHJlc3VsdClcbiAgfVxufVxuXG52YXIgcXVldWUgPSBbXVxuXG5mdW5jdGlvbiBlbnF1ZXVlKHJlcSkge1xuICBxdWV1ZS5wdXNoKHJlcSlcbiAgZGVidWcoJ2VucXVldWUgJWQgJXMnLCBxdWV1ZS5sZW5ndGgsIHJlcS5jb25zdHJ1Y3Rvci5uYW1lLCByZXEpXG59XG5cbmZ1bmN0aW9uIG9uY2xvc2UoKSB7XG4gIHZhciByZXEgPSBxdWV1ZS5zaGlmdCgpXG4gIGlmIChyZXEpIHtcbiAgICBkZWJ1ZygncHJvY2VzcycsIHJlcS5jb25zdHJ1Y3Rvci5uYW1lLCByZXEpXG4gICAgcmVxLnByb2Nlc3MoKVxuICB9XG59XG4iLCJ2YXIgZnMgPSByZXF1aXJlKCcuL2ZzLmpzJylcbnZhciBjb25zdGFudHMgPSByZXF1aXJlKCdjb25zdGFudHMnKVxuXG52YXIgb3JpZ0N3ZCA9IHByb2Nlc3MuY3dkXG52YXIgY3dkID0gbnVsbFxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCFjd2QpXG4gICAgY3dkID0gb3JpZ0N3ZC5jYWxsKHByb2Nlc3MpXG4gIHJldHVybiBjd2Rcbn1cbnZhciBjaGRpciA9IHByb2Nlc3MuY2hkaXJcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbihkKSB7XG4gIGN3ZCA9IG51bGxcbiAgY2hkaXIuY2FsbChwcm9jZXNzLCBkKVxufVxuXG4vLyAocmUtKWltcGxlbWVudCBzb21lIHRoaW5ncyB0aGF0IGFyZSBrbm93biBidXN0ZWQgb3IgbWlzc2luZy5cblxuLy8gbGNobW9kLCBicm9rZW4gcHJpb3IgdG8gMC42LjJcbi8vIGJhY2stcG9ydCB0aGUgZml4IGhlcmUuXG5pZiAoY29uc3RhbnRzLmhhc093blByb3BlcnR5KCdPX1NZTUxJTksnKSAmJlxuICAgIHByb2Nlc3MudmVyc2lvbi5tYXRjaCgvXnYwXFwuNlxcLlswLTJdfF52MFxcLjVcXC4vKSkge1xuICBmcy5sY2htb2QgPSBmdW5jdGlvbiAocGF0aCwgbW9kZSwgY2FsbGJhY2spIHtcbiAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IG5vb3BcbiAgICBmcy5vcGVuKCBwYXRoXG4gICAgICAgICAgICwgY29uc3RhbnRzLk9fV1JPTkxZIHwgY29uc3RhbnRzLk9fU1lNTElOS1xuICAgICAgICAgICAsIG1vZGVcbiAgICAgICAgICAgLCBmdW5jdGlvbiAoZXJyLCBmZCkge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBjYWxsYmFjayhlcnIpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgLy8gcHJlZmVyIHRvIHJldHVybiB0aGUgY2htb2QgZXJyb3IsIGlmIG9uZSBvY2N1cnMsXG4gICAgICAvLyBidXQgc3RpbGwgdHJ5IHRvIGNsb3NlLCBhbmQgcmVwb3J0IGNsb3NpbmcgZXJyb3JzIGlmIHRoZXkgb2NjdXIuXG4gICAgICBmcy5mY2htb2QoZmQsIG1vZGUsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgZnMuY2xvc2UoZmQsIGZ1bmN0aW9uKGVycjIpIHtcbiAgICAgICAgICBjYWxsYmFjayhlcnIgfHwgZXJyMilcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIGZzLmxjaG1vZFN5bmMgPSBmdW5jdGlvbiAocGF0aCwgbW9kZSkge1xuICAgIHZhciBmZCA9IGZzLm9wZW5TeW5jKHBhdGgsIGNvbnN0YW50cy5PX1dST05MWSB8IGNvbnN0YW50cy5PX1NZTUxJTkssIG1vZGUpXG5cbiAgICAvLyBwcmVmZXIgdG8gcmV0dXJuIHRoZSBjaG1vZCBlcnJvciwgaWYgb25lIG9jY3VycyxcbiAgICAvLyBidXQgc3RpbGwgdHJ5IHRvIGNsb3NlLCBhbmQgcmVwb3J0IGNsb3NpbmcgZXJyb3JzIGlmIHRoZXkgb2NjdXIuXG4gICAgdmFyIGVyciwgZXJyMlxuICAgIHRyeSB7XG4gICAgICB2YXIgcmV0ID0gZnMuZmNobW9kU3luYyhmZCwgbW9kZSlcbiAgICB9IGNhdGNoIChlcikge1xuICAgICAgZXJyID0gZXJcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGZzLmNsb3NlU3luYyhmZClcbiAgICB9IGNhdGNoIChlcikge1xuICAgICAgZXJyMiA9IGVyXG4gICAgfVxuICAgIGlmIChlcnIgfHwgZXJyMikgdGhyb3cgKGVyciB8fCBlcnIyKVxuICAgIHJldHVybiByZXRcbiAgfVxufVxuXG5cbi8vIGx1dGltZXMgaW1wbGVtZW50YXRpb24sIG9yIG5vLW9wXG5pZiAoIWZzLmx1dGltZXMpIHtcbiAgaWYgKGNvbnN0YW50cy5oYXNPd25Qcm9wZXJ0eShcIk9fU1lNTElOS1wiKSkge1xuICAgIGZzLmx1dGltZXMgPSBmdW5jdGlvbiAocGF0aCwgYXQsIG10LCBjYikge1xuICAgICAgZnMub3BlbihwYXRoLCBjb25zdGFudHMuT19TWU1MSU5LLCBmdW5jdGlvbiAoZXIsIGZkKSB7XG4gICAgICAgIGNiID0gY2IgfHwgbm9vcFxuICAgICAgICBpZiAoZXIpIHJldHVybiBjYihlcilcbiAgICAgICAgZnMuZnV0aW1lcyhmZCwgYXQsIG10LCBmdW5jdGlvbiAoZXIpIHtcbiAgICAgICAgICBmcy5jbG9zZShmZCwgZnVuY3Rpb24gKGVyMikge1xuICAgICAgICAgICAgcmV0dXJuIGNiKGVyIHx8IGVyMilcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9XG5cbiAgICBmcy5sdXRpbWVzU3luYyA9IGZ1bmN0aW9uIChwYXRoLCBhdCwgbXQpIHtcbiAgICAgIHZhciBmZCA9IGZzLm9wZW5TeW5jKHBhdGgsIGNvbnN0YW50cy5PX1NZTUxJTkspXG4gICAgICAgICwgZXJyXG4gICAgICAgICwgZXJyMlxuICAgICAgICAsIHJldFxuXG4gICAgICB0cnkge1xuICAgICAgICB2YXIgcmV0ID0gZnMuZnV0aW1lc1N5bmMoZmQsIGF0LCBtdClcbiAgICAgIH0gY2F0Y2ggKGVyKSB7XG4gICAgICAgIGVyciA9IGVyXG4gICAgICB9XG4gICAgICB0cnkge1xuICAgICAgICBmcy5jbG9zZVN5bmMoZmQpXG4gICAgICB9IGNhdGNoIChlcikge1xuICAgICAgICBlcnIyID0gZXJcbiAgICAgIH1cbiAgICAgIGlmIChlcnIgfHwgZXJyMikgdGhyb3cgKGVyciB8fCBlcnIyKVxuICAgICAgcmV0dXJuIHJldFxuICAgIH1cblxuICB9IGVsc2UgaWYgKGZzLnV0aW1lbnNhdCAmJiBjb25zdGFudHMuaGFzT3duUHJvcGVydHkoXCJBVF9TWU1MSU5LX05PRk9MTE9XXCIpKSB7XG4gICAgLy8gbWF5YmUgdXRpbWVuc2F0IHdpbGwgYmUgYm91bmQgc29vbmlzaD9cbiAgICBmcy5sdXRpbWVzID0gZnVuY3Rpb24gKHBhdGgsIGF0LCBtdCwgY2IpIHtcbiAgICAgIGZzLnV0aW1lbnNhdChwYXRoLCBhdCwgbXQsIGNvbnN0YW50cy5BVF9TWU1MSU5LX05PRk9MTE9XLCBjYilcbiAgICB9XG5cbiAgICBmcy5sdXRpbWVzU3luYyA9IGZ1bmN0aW9uIChwYXRoLCBhdCwgbXQpIHtcbiAgICAgIHJldHVybiBmcy51dGltZW5zYXRTeW5jKHBhdGgsIGF0LCBtdCwgY29uc3RhbnRzLkFUX1NZTUxJTktfTk9GT0xMT1cpXG4gICAgfVxuXG4gIH0gZWxzZSB7XG4gICAgZnMubHV0aW1lcyA9IGZ1bmN0aW9uIChfYSwgX2IsIF9jLCBjYikgeyBwcm9jZXNzLm5leHRUaWNrKGNiKSB9XG4gICAgZnMubHV0aW1lc1N5bmMgPSBmdW5jdGlvbiAoKSB7fVxuICB9XG59XG5cblxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2lzYWFjcy9ub2RlLWdyYWNlZnVsLWZzL2lzc3Vlcy80XG4vLyBDaG93biBzaG91bGQgbm90IGZhaWwgb24gZWludmFsIG9yIGVwZXJtIGlmIG5vbi1yb290LlxuLy8gSXQgc2hvdWxkIG5vdCBmYWlsIG9uIGVub3N5cyBldmVyLCBhcyB0aGlzIGp1c3QgaW5kaWNhdGVzXG4vLyB0aGF0IGEgZnMgZG9lc24ndCBzdXBwb3J0IHRoZSBpbnRlbmRlZCBvcGVyYXRpb24uXG5cbmZzLmNob3duID0gY2hvd25GaXgoZnMuY2hvd24pXG5mcy5mY2hvd24gPSBjaG93bkZpeChmcy5mY2hvd24pXG5mcy5sY2hvd24gPSBjaG93bkZpeChmcy5sY2hvd24pXG5cbmZzLmNobW9kID0gY2hvd25GaXgoZnMuY2htb2QpXG5mcy5mY2htb2QgPSBjaG93bkZpeChmcy5mY2htb2QpXG5mcy5sY2htb2QgPSBjaG93bkZpeChmcy5sY2htb2QpXG5cbmZzLmNob3duU3luYyA9IGNob3duRml4U3luYyhmcy5jaG93blN5bmMpXG5mcy5mY2hvd25TeW5jID0gY2hvd25GaXhTeW5jKGZzLmZjaG93blN5bmMpXG5mcy5sY2hvd25TeW5jID0gY2hvd25GaXhTeW5jKGZzLmxjaG93blN5bmMpXG5cbmZzLmNobW9kU3luYyA9IGNob3duRml4KGZzLmNobW9kU3luYylcbmZzLmZjaG1vZFN5bmMgPSBjaG93bkZpeChmcy5mY2htb2RTeW5jKVxuZnMubGNobW9kU3luYyA9IGNob3duRml4KGZzLmxjaG1vZFN5bmMpXG5cbmZ1bmN0aW9uIGNob3duRml4IChvcmlnKSB7XG4gIGlmICghb3JpZykgcmV0dXJuIG9yaWdcbiAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIHVpZCwgZ2lkLCBjYikge1xuICAgIHJldHVybiBvcmlnLmNhbGwoZnMsIHRhcmdldCwgdWlkLCBnaWQsIGZ1bmN0aW9uIChlciwgcmVzKSB7XG4gICAgICBpZiAoY2hvd25Fck9rKGVyKSkgZXIgPSBudWxsXG4gICAgICBjYihlciwgcmVzKVxuICAgIH0pXG4gIH1cbn1cblxuZnVuY3Rpb24gY2hvd25GaXhTeW5jIChvcmlnKSB7XG4gIGlmICghb3JpZykgcmV0dXJuIG9yaWdcbiAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIHVpZCwgZ2lkKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBvcmlnLmNhbGwoZnMsIHRhcmdldCwgdWlkLCBnaWQpXG4gICAgfSBjYXRjaCAoZXIpIHtcbiAgICAgIGlmICghY2hvd25Fck9rKGVyKSkgdGhyb3cgZXJcbiAgICB9XG4gIH1cbn1cblxuLy8gRU5PU1lTIG1lYW5zIHRoYXQgdGhlIGZzIGRvZXNuJ3Qgc3VwcG9ydCB0aGUgb3AuIEp1c3QgaWdub3JlXG4vLyB0aGF0LCBiZWNhdXNlIGl0IGRvZXNuJ3QgbWF0dGVyLlxuLy9cbi8vIGlmIHRoZXJlJ3Mgbm8gZ2V0dWlkLCBvciBpZiBnZXR1aWQoKSBpcyBzb21ldGhpbmcgb3RoZXJcbi8vIHRoYW4gMCwgYW5kIHRoZSBlcnJvciBpcyBFSU5WQUwgb3IgRVBFUk0sIHRoZW4ganVzdCBpZ25vcmVcbi8vIGl0LlxuLy9cbi8vIFRoaXMgc3BlY2lmaWMgY2FzZSBpcyBhIHNpbGVudCBmYWlsdXJlIGluIGNwLCBpbnN0YWxsLCB0YXIsXG4vLyBhbmQgbW9zdCBvdGhlciB1bml4IHRvb2xzIHRoYXQgbWFuYWdlIHBlcm1pc3Npb25zLlxuLy9cbi8vIFdoZW4gcnVubmluZyBhcyByb290LCBvciBpZiBvdGhlciB0eXBlcyBvZiBlcnJvcnMgYXJlXG4vLyBlbmNvdW50ZXJlZCwgdGhlbiBpdCdzIHN0cmljdC5cbmZ1bmN0aW9uIGNob3duRXJPayAoZXIpIHtcbiAgaWYgKCFlcilcbiAgICByZXR1cm4gdHJ1ZVxuXG4gIGlmIChlci5jb2RlID09PSBcIkVOT1NZU1wiKVxuICAgIHJldHVybiB0cnVlXG5cbiAgdmFyIG5vbnJvb3QgPSAhcHJvY2Vzcy5nZXR1aWQgfHwgcHJvY2Vzcy5nZXR1aWQoKSAhPT0gMFxuICBpZiAobm9ucm9vdCkge1xuICAgIGlmIChlci5jb2RlID09PSBcIkVJTlZBTFwiIHx8IGVyLmNvZGUgPT09IFwiRVBFUk1cIilcbiAgICAgIHJldHVybiB0cnVlXG4gIH1cblxuICByZXR1cm4gZmFsc2Vcbn1cblxuXG4vLyBpZiBsY2htb2QvbGNob3duIGRvIG5vdCBleGlzdCwgdGhlbiBtYWtlIHRoZW0gbm8tb3BzXG5pZiAoIWZzLmxjaG1vZCkge1xuICBmcy5sY2htb2QgPSBmdW5jdGlvbiAocGF0aCwgbW9kZSwgY2IpIHtcbiAgICBwcm9jZXNzLm5leHRUaWNrKGNiKVxuICB9XG4gIGZzLmxjaG1vZFN5bmMgPSBmdW5jdGlvbiAoKSB7fVxufVxuaWYgKCFmcy5sY2hvd24pIHtcbiAgZnMubGNob3duID0gZnVuY3Rpb24gKHBhdGgsIHVpZCwgZ2lkLCBjYikge1xuICAgIHByb2Nlc3MubmV4dFRpY2soY2IpXG4gIH1cbiAgZnMubGNob3duU3luYyA9IGZ1bmN0aW9uICgpIHt9XG59XG5cblxuXG4vLyBvbiBXaW5kb3dzLCBBL1Ygc29mdHdhcmUgY2FuIGxvY2sgdGhlIGRpcmVjdG9yeSwgY2F1c2luZyB0aGlzXG4vLyB0byBmYWlsIHdpdGggYW4gRUFDQ0VTIG9yIEVQRVJNIGlmIHRoZSBkaXJlY3RvcnkgY29udGFpbnMgbmV3bHlcbi8vIGNyZWF0ZWQgZmlsZXMuICBUcnkgYWdhaW4gb24gZmFpbHVyZSwgZm9yIHVwIHRvIDEgc2Vjb25kLlxuaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09IFwid2luMzJcIikge1xuICB2YXIgcmVuYW1lXyA9IGZzLnJlbmFtZVxuICBmcy5yZW5hbWUgPSBmdW5jdGlvbiByZW5hbWUgKGZyb20sIHRvLCBjYikge1xuICAgIHZhciBzdGFydCA9IERhdGUubm93KClcbiAgICByZW5hbWVfKGZyb20sIHRvLCBmdW5jdGlvbiBDQiAoZXIpIHtcbiAgICAgIGlmIChlclxuICAgICAgICAgICYmIChlci5jb2RlID09PSBcIkVBQ0NFU1wiIHx8IGVyLmNvZGUgPT09IFwiRVBFUk1cIilcbiAgICAgICAgICAmJiBEYXRlLm5vdygpIC0gc3RhcnQgPCAxMDAwKSB7XG4gICAgICAgIHJldHVybiByZW5hbWVfKGZyb20sIHRvLCBDQilcbiAgICAgIH1cbiAgICAgIGlmKGNiKSBjYihlcilcbiAgICB9KVxuICB9XG59XG5cblxuLy8gaWYgcmVhZCgpIHJldHVybnMgRUFHQUlOLCB0aGVuIGp1c3QgdHJ5IGl0IGFnYWluLlxudmFyIHJlYWQgPSBmcy5yZWFkXG5mcy5yZWFkID0gZnVuY3Rpb24gKGZkLCBidWZmZXIsIG9mZnNldCwgbGVuZ3RoLCBwb3NpdGlvbiwgY2FsbGJhY2tfKSB7XG4gIHZhciBjYWxsYmFja1xuICBpZiAoY2FsbGJhY2tfICYmIHR5cGVvZiBjYWxsYmFja18gPT09ICdmdW5jdGlvbicpIHtcbiAgICB2YXIgZWFnQ291bnRlciA9IDBcbiAgICBjYWxsYmFjayA9IGZ1bmN0aW9uIChlciwgXywgX18pIHtcbiAgICAgIGlmIChlciAmJiBlci5jb2RlID09PSAnRUFHQUlOJyAmJiBlYWdDb3VudGVyIDwgMTApIHtcbiAgICAgICAgZWFnQ291bnRlciArK1xuICAgICAgICByZXR1cm4gcmVhZC5jYWxsKGZzLCBmZCwgYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCwgcG9zaXRpb24sIGNhbGxiYWNrKVxuICAgICAgfVxuICAgICAgY2FsbGJhY2tfLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlYWQuY2FsbChmcywgZmQsIGJ1ZmZlciwgb2Zmc2V0LCBsZW5ndGgsIHBvc2l0aW9uLCBjYWxsYmFjaylcbn1cblxudmFyIHJlYWRTeW5jID0gZnMucmVhZFN5bmNcbmZzLnJlYWRTeW5jID0gZnVuY3Rpb24gKGZkLCBidWZmZXIsIG9mZnNldCwgbGVuZ3RoLCBwb3NpdGlvbikge1xuICB2YXIgZWFnQ291bnRlciA9IDBcbiAgd2hpbGUgKHRydWUpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIHJlYWRTeW5jLmNhbGwoZnMsIGZkLCBidWZmZXIsIG9mZnNldCwgbGVuZ3RoLCBwb3NpdGlvbilcbiAgICB9IGNhdGNoIChlcikge1xuICAgICAgaWYgKGVyLmNvZGUgPT09ICdFQUdBSU4nICYmIGVhZ0NvdW50ZXIgPCAxMCkge1xuICAgICAgICBlYWdDb3VudGVyICsrXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgICB0aHJvdyBlclxuICAgIH1cbiAgfVxufVxuXG4iLCJleHBvcnRzLnNldG9wdHMgPSBzZXRvcHRzXG5leHBvcnRzLm93blByb3AgPSBvd25Qcm9wXG5leHBvcnRzLm1ha2VBYnMgPSBtYWtlQWJzXG5leHBvcnRzLmZpbmlzaCA9IGZpbmlzaFxuZXhwb3J0cy5tYXJrID0gbWFya1xuZXhwb3J0cy5pc0lnbm9yZWQgPSBpc0lnbm9yZWRcbmV4cG9ydHMuY2hpbGRyZW5JZ25vcmVkID0gY2hpbGRyZW5JZ25vcmVkXG5cbmZ1bmN0aW9uIG93blByb3AgKG9iaiwgZmllbGQpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGZpZWxkKVxufVxuXG52YXIgZnMgPSByZXF1aXJlKFwiZnNcIilcbnZhciBwYXRoID0gcmVxdWlyZShcInBhdGhcIilcbnZhciBtaW5pbWF0Y2ggPSByZXF1aXJlKFwibWluaW1hdGNoXCIpXG52YXIgaXNBYnNvbHV0ZSA9IHJlcXVpcmUoXCJwYXRoLWlzLWFic29sdXRlXCIpXG52YXIgTWluaW1hdGNoID0gbWluaW1hdGNoLk1pbmltYXRjaFxuXG5mdW5jdGlvbiBhbHBoYXNvcnQgKGEsIGIpIHtcbiAgcmV0dXJuIGEubG9jYWxlQ29tcGFyZShiLCAnZW4nKVxufVxuXG5mdW5jdGlvbiBzZXR1cElnbm9yZXMgKHNlbGYsIG9wdGlvbnMpIHtcbiAgc2VsZi5pZ25vcmUgPSBvcHRpb25zLmlnbm9yZSB8fCBbXVxuXG4gIGlmICghQXJyYXkuaXNBcnJheShzZWxmLmlnbm9yZSkpXG4gICAgc2VsZi5pZ25vcmUgPSBbc2VsZi5pZ25vcmVdXG5cbiAgaWYgKHNlbGYuaWdub3JlLmxlbmd0aCkge1xuICAgIHNlbGYuaWdub3JlID0gc2VsZi5pZ25vcmUubWFwKGlnbm9yZU1hcClcbiAgfVxufVxuXG4vLyBpZ25vcmUgcGF0dGVybnMgYXJlIGFsd2F5cyBpbiBkb3Q6dHJ1ZSBtb2RlLlxuZnVuY3Rpb24gaWdub3JlTWFwIChwYXR0ZXJuKSB7XG4gIHZhciBnbWF0Y2hlciA9IG51bGxcbiAgaWYgKHBhdHRlcm4uc2xpY2UoLTMpID09PSAnLyoqJykge1xuICAgIHZhciBncGF0dGVybiA9IHBhdHRlcm4ucmVwbGFjZSgvKFxcL1xcKlxcKikrJC8sICcnKVxuICAgIGdtYXRjaGVyID0gbmV3IE1pbmltYXRjaChncGF0dGVybiwgeyBkb3Q6IHRydWUgfSlcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgbWF0Y2hlcjogbmV3IE1pbmltYXRjaChwYXR0ZXJuLCB7IGRvdDogdHJ1ZSB9KSxcbiAgICBnbWF0Y2hlcjogZ21hdGNoZXJcbiAgfVxufVxuXG5mdW5jdGlvbiBzZXRvcHRzIChzZWxmLCBwYXR0ZXJuLCBvcHRpb25zKSB7XG4gIGlmICghb3B0aW9ucylcbiAgICBvcHRpb25zID0ge31cblxuICAvLyBiYXNlLW1hdGNoaW5nOiBqdXN0IHVzZSBnbG9ic3RhciBmb3IgdGhhdC5cbiAgaWYgKG9wdGlvbnMubWF0Y2hCYXNlICYmIC0xID09PSBwYXR0ZXJuLmluZGV4T2YoXCIvXCIpKSB7XG4gICAgaWYgKG9wdGlvbnMubm9nbG9ic3Rhcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiYmFzZSBtYXRjaGluZyByZXF1aXJlcyBnbG9ic3RhclwiKVxuICAgIH1cbiAgICBwYXR0ZXJuID0gXCIqKi9cIiArIHBhdHRlcm5cbiAgfVxuXG4gIHNlbGYuc2lsZW50ID0gISFvcHRpb25zLnNpbGVudFxuICBzZWxmLnBhdHRlcm4gPSBwYXR0ZXJuXG4gIHNlbGYuc3RyaWN0ID0gb3B0aW9ucy5zdHJpY3QgIT09IGZhbHNlXG4gIHNlbGYucmVhbHBhdGggPSAhIW9wdGlvbnMucmVhbHBhdGhcbiAgc2VsZi5yZWFscGF0aENhY2hlID0gb3B0aW9ucy5yZWFscGF0aENhY2hlIHx8IE9iamVjdC5jcmVhdGUobnVsbClcbiAgc2VsZi5mb2xsb3cgPSAhIW9wdGlvbnMuZm9sbG93XG4gIHNlbGYuZG90ID0gISFvcHRpb25zLmRvdFxuICBzZWxmLm1hcmsgPSAhIW9wdGlvbnMubWFya1xuICBzZWxmLm5vZGlyID0gISFvcHRpb25zLm5vZGlyXG4gIGlmIChzZWxmLm5vZGlyKVxuICAgIHNlbGYubWFyayA9IHRydWVcbiAgc2VsZi5zeW5jID0gISFvcHRpb25zLnN5bmNcbiAgc2VsZi5ub3VuaXF1ZSA9ICEhb3B0aW9ucy5ub3VuaXF1ZVxuICBzZWxmLm5vbnVsbCA9ICEhb3B0aW9ucy5ub251bGxcbiAgc2VsZi5ub3NvcnQgPSAhIW9wdGlvbnMubm9zb3J0XG4gIHNlbGYubm9jYXNlID0gISFvcHRpb25zLm5vY2FzZVxuICBzZWxmLnN0YXQgPSAhIW9wdGlvbnMuc3RhdFxuICBzZWxmLm5vcHJvY2VzcyA9ICEhb3B0aW9ucy5ub3Byb2Nlc3NcbiAgc2VsZi5hYnNvbHV0ZSA9ICEhb3B0aW9ucy5hYnNvbHV0ZVxuICBzZWxmLmZzID0gb3B0aW9ucy5mcyB8fCBmc1xuXG4gIHNlbGYubWF4TGVuZ3RoID0gb3B0aW9ucy5tYXhMZW5ndGggfHwgSW5maW5pdHlcbiAgc2VsZi5jYWNoZSA9IG9wdGlvbnMuY2FjaGUgfHwgT2JqZWN0LmNyZWF0ZShudWxsKVxuICBzZWxmLnN0YXRDYWNoZSA9IG9wdGlvbnMuc3RhdENhY2hlIHx8IE9iamVjdC5jcmVhdGUobnVsbClcbiAgc2VsZi5zeW1saW5rcyA9IG9wdGlvbnMuc3ltbGlua3MgfHwgT2JqZWN0LmNyZWF0ZShudWxsKVxuXG4gIHNldHVwSWdub3JlcyhzZWxmLCBvcHRpb25zKVxuXG4gIHNlbGYuY2hhbmdlZEN3ZCA9IGZhbHNlXG4gIHZhciBjd2QgPSBwcm9jZXNzLmN3ZCgpXG4gIGlmICghb3duUHJvcChvcHRpb25zLCBcImN3ZFwiKSlcbiAgICBzZWxmLmN3ZCA9IGN3ZFxuICBlbHNlIHtcbiAgICBzZWxmLmN3ZCA9IHBhdGgucmVzb2x2ZShvcHRpb25zLmN3ZClcbiAgICBzZWxmLmNoYW5nZWRDd2QgPSBzZWxmLmN3ZCAhPT0gY3dkXG4gIH1cblxuICBzZWxmLnJvb3QgPSBvcHRpb25zLnJvb3QgfHwgcGF0aC5yZXNvbHZlKHNlbGYuY3dkLCBcIi9cIilcbiAgc2VsZi5yb290ID0gcGF0aC5yZXNvbHZlKHNlbGYucm9vdClcbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09IFwid2luMzJcIilcbiAgICBzZWxmLnJvb3QgPSBzZWxmLnJvb3QucmVwbGFjZSgvXFxcXC9nLCBcIi9cIilcblxuICAvLyBUT0RPOiBpcyBhbiBhYnNvbHV0ZSBgY3dkYCBzdXBwb3NlZCB0byBiZSByZXNvbHZlZCBhZ2FpbnN0IGByb290YD9cbiAgLy8gZS5nLiB7IGN3ZDogJy90ZXN0Jywgcm9vdDogX19kaXJuYW1lIH0gPT09IHBhdGguam9pbihfX2Rpcm5hbWUsICcvdGVzdCcpXG4gIHNlbGYuY3dkQWJzID0gaXNBYnNvbHV0ZShzZWxmLmN3ZCkgPyBzZWxmLmN3ZCA6IG1ha2VBYnMoc2VsZiwgc2VsZi5jd2QpXG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSBcIndpbjMyXCIpXG4gICAgc2VsZi5jd2RBYnMgPSBzZWxmLmN3ZEFicy5yZXBsYWNlKC9cXFxcL2csIFwiL1wiKVxuICBzZWxmLm5vbW91bnQgPSAhIW9wdGlvbnMubm9tb3VudFxuXG4gIC8vIGRpc2FibGUgY29tbWVudHMgYW5kIG5lZ2F0aW9uIGluIE1pbmltYXRjaC5cbiAgLy8gTm90ZSB0aGF0IHRoZXkgYXJlIG5vdCBzdXBwb3J0ZWQgaW4gR2xvYiBpdHNlbGYgYW55d2F5LlxuICBvcHRpb25zLm5vbmVnYXRlID0gdHJ1ZVxuICBvcHRpb25zLm5vY29tbWVudCA9IHRydWVcblxuICBzZWxmLm1pbmltYXRjaCA9IG5ldyBNaW5pbWF0Y2gocGF0dGVybiwgb3B0aW9ucylcbiAgc2VsZi5vcHRpb25zID0gc2VsZi5taW5pbWF0Y2gub3B0aW9uc1xufVxuXG5mdW5jdGlvbiBmaW5pc2ggKHNlbGYpIHtcbiAgdmFyIG5vdSA9IHNlbGYubm91bmlxdWVcbiAgdmFyIGFsbCA9IG5vdSA/IFtdIDogT2JqZWN0LmNyZWF0ZShudWxsKVxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gc2VsZi5tYXRjaGVzLmxlbmd0aDsgaSA8IGw7IGkgKyspIHtcbiAgICB2YXIgbWF0Y2hlcyA9IHNlbGYubWF0Y2hlc1tpXVxuICAgIGlmICghbWF0Y2hlcyB8fCBPYmplY3Qua2V5cyhtYXRjaGVzKS5sZW5ndGggPT09IDApIHtcbiAgICAgIGlmIChzZWxmLm5vbnVsbCkge1xuICAgICAgICAvLyBkbyBsaWtlIHRoZSBzaGVsbCwgYW5kIHNwaXQgb3V0IHRoZSBsaXRlcmFsIGdsb2JcbiAgICAgICAgdmFyIGxpdGVyYWwgPSBzZWxmLm1pbmltYXRjaC5nbG9iU2V0W2ldXG4gICAgICAgIGlmIChub3UpXG4gICAgICAgICAgYWxsLnB1c2gobGl0ZXJhbClcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGFsbFtsaXRlcmFsXSA9IHRydWVcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gaGFkIG1hdGNoZXNcbiAgICAgIHZhciBtID0gT2JqZWN0LmtleXMobWF0Y2hlcylcbiAgICAgIGlmIChub3UpXG4gICAgICAgIGFsbC5wdXNoLmFwcGx5KGFsbCwgbSlcbiAgICAgIGVsc2VcbiAgICAgICAgbS5mb3JFYWNoKGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgYWxsW21dID0gdHJ1ZVxuICAgICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIGlmICghbm91KVxuICAgIGFsbCA9IE9iamVjdC5rZXlzKGFsbClcblxuICBpZiAoIXNlbGYubm9zb3J0KVxuICAgIGFsbCA9IGFsbC5zb3J0KGFscGhhc29ydClcblxuICAvLyBhdCAqc29tZSogcG9pbnQgd2Ugc3RhdHRlZCBhbGwgb2YgdGhlc2VcbiAgaWYgKHNlbGYubWFyaykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYWxsLmxlbmd0aDsgaSsrKSB7XG4gICAgICBhbGxbaV0gPSBzZWxmLl9tYXJrKGFsbFtpXSlcbiAgICB9XG4gICAgaWYgKHNlbGYubm9kaXIpIHtcbiAgICAgIGFsbCA9IGFsbC5maWx0ZXIoZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgdmFyIG5vdERpciA9ICEoL1xcLyQvLnRlc3QoZSkpXG4gICAgICAgIHZhciBjID0gc2VsZi5jYWNoZVtlXSB8fCBzZWxmLmNhY2hlW21ha2VBYnMoc2VsZiwgZSldXG4gICAgICAgIGlmIChub3REaXIgJiYgYylcbiAgICAgICAgICBub3REaXIgPSBjICE9PSAnRElSJyAmJiAhQXJyYXkuaXNBcnJheShjKVxuICAgICAgICByZXR1cm4gbm90RGlyXG4gICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIGlmIChzZWxmLmlnbm9yZS5sZW5ndGgpXG4gICAgYWxsID0gYWxsLmZpbHRlcihmdW5jdGlvbihtKSB7XG4gICAgICByZXR1cm4gIWlzSWdub3JlZChzZWxmLCBtKVxuICAgIH0pXG5cbiAgc2VsZi5mb3VuZCA9IGFsbFxufVxuXG5mdW5jdGlvbiBtYXJrIChzZWxmLCBwKSB7XG4gIHZhciBhYnMgPSBtYWtlQWJzKHNlbGYsIHApXG4gIHZhciBjID0gc2VsZi5jYWNoZVthYnNdXG4gIHZhciBtID0gcFxuICBpZiAoYykge1xuICAgIHZhciBpc0RpciA9IGMgPT09ICdESVInIHx8IEFycmF5LmlzQXJyYXkoYylcbiAgICB2YXIgc2xhc2ggPSBwLnNsaWNlKC0xKSA9PT0gJy8nXG5cbiAgICBpZiAoaXNEaXIgJiYgIXNsYXNoKVxuICAgICAgbSArPSAnLydcbiAgICBlbHNlIGlmICghaXNEaXIgJiYgc2xhc2gpXG4gICAgICBtID0gbS5zbGljZSgwLCAtMSlcblxuICAgIGlmIChtICE9PSBwKSB7XG4gICAgICB2YXIgbWFicyA9IG1ha2VBYnMoc2VsZiwgbSlcbiAgICAgIHNlbGYuc3RhdENhY2hlW21hYnNdID0gc2VsZi5zdGF0Q2FjaGVbYWJzXVxuICAgICAgc2VsZi5jYWNoZVttYWJzXSA9IHNlbGYuY2FjaGVbYWJzXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtXG59XG5cbi8vIGxvdHRhIHNpdHVwcy4uLlxuZnVuY3Rpb24gbWFrZUFicyAoc2VsZiwgZikge1xuICB2YXIgYWJzID0gZlxuICBpZiAoZi5jaGFyQXQoMCkgPT09ICcvJykge1xuICAgIGFicyA9IHBhdGguam9pbihzZWxmLnJvb3QsIGYpXG4gIH0gZWxzZSBpZiAoaXNBYnNvbHV0ZShmKSB8fCBmID09PSAnJykge1xuICAgIGFicyA9IGZcbiAgfSBlbHNlIGlmIChzZWxmLmNoYW5nZWRDd2QpIHtcbiAgICBhYnMgPSBwYXRoLnJlc29sdmUoc2VsZi5jd2QsIGYpXG4gIH0gZWxzZSB7XG4gICAgYWJzID0gcGF0aC5yZXNvbHZlKGYpXG4gIH1cblxuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJylcbiAgICBhYnMgPSBhYnMucmVwbGFjZSgvXFxcXC9nLCAnLycpXG5cbiAgcmV0dXJuIGFic1xufVxuXG5cbi8vIFJldHVybiB0cnVlLCBpZiBwYXR0ZXJuIGVuZHMgd2l0aCBnbG9ic3RhciAnKionLCBmb3IgdGhlIGFjY29tcGFueWluZyBwYXJlbnQgZGlyZWN0b3J5LlxuLy8gRXg6LSBJZiBub2RlX21vZHVsZXMvKiogaXMgdGhlIHBhdHRlcm4sIGFkZCAnbm9kZV9tb2R1bGVzJyB0byBpZ25vcmUgbGlzdCBhbG9uZyB3aXRoIGl0J3MgY29udGVudHNcbmZ1bmN0aW9uIGlzSWdub3JlZCAoc2VsZiwgcGF0aCkge1xuICBpZiAoIXNlbGYuaWdub3JlLmxlbmd0aClcbiAgICByZXR1cm4gZmFsc2VcblxuICByZXR1cm4gc2VsZi5pZ25vcmUuc29tZShmdW5jdGlvbihpdGVtKSB7XG4gICAgcmV0dXJuIGl0ZW0ubWF0Y2hlci5tYXRjaChwYXRoKSB8fCAhIShpdGVtLmdtYXRjaGVyICYmIGl0ZW0uZ21hdGNoZXIubWF0Y2gocGF0aCkpXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGNoaWxkcmVuSWdub3JlZCAoc2VsZiwgcGF0aCkge1xuICBpZiAoIXNlbGYuaWdub3JlLmxlbmd0aClcbiAgICByZXR1cm4gZmFsc2VcblxuICByZXR1cm4gc2VsZi5pZ25vcmUuc29tZShmdW5jdGlvbihpdGVtKSB7XG4gICAgcmV0dXJuICEhKGl0ZW0uZ21hdGNoZXIgJiYgaXRlbS5nbWF0Y2hlci5tYXRjaChwYXRoKSlcbiAgfSlcbn1cbiIsIi8vIEFwcHJvYWNoOlxuLy9cbi8vIDEuIEdldCB0aGUgbWluaW1hdGNoIHNldFxuLy8gMi4gRm9yIGVhY2ggcGF0dGVybiBpbiB0aGUgc2V0LCBQUk9DRVNTKHBhdHRlcm4sIGZhbHNlKVxuLy8gMy4gU3RvcmUgbWF0Y2hlcyBwZXItc2V0LCB0aGVuIHVuaXEgdGhlbVxuLy9cbi8vIFBST0NFU1MocGF0dGVybiwgaW5HbG9iU3Rhcilcbi8vIEdldCB0aGUgZmlyc3QgW25dIGl0ZW1zIGZyb20gcGF0dGVybiB0aGF0IGFyZSBhbGwgc3RyaW5nc1xuLy8gSm9pbiB0aGVzZSB0b2dldGhlci4gIFRoaXMgaXMgUFJFRklYLlxuLy8gICBJZiB0aGVyZSBpcyBubyBtb3JlIHJlbWFpbmluZywgdGhlbiBzdGF0KFBSRUZJWCkgYW5kXG4vLyAgIGFkZCB0byBtYXRjaGVzIGlmIGl0IHN1Y2NlZWRzLiAgRU5ELlxuLy9cbi8vIElmIGluR2xvYlN0YXIgYW5kIFBSRUZJWCBpcyBzeW1saW5rIGFuZCBwb2ludHMgdG8gZGlyXG4vLyAgIHNldCBFTlRSSUVTID0gW11cbi8vIGVsc2UgcmVhZGRpcihQUkVGSVgpIGFzIEVOVFJJRVNcbi8vICAgSWYgZmFpbCwgRU5EXG4vL1xuLy8gd2l0aCBFTlRSSUVTXG4vLyAgIElmIHBhdHRlcm5bbl0gaXMgR0xPQlNUQVJcbi8vICAgICAvLyBoYW5kbGUgdGhlIGNhc2Ugd2hlcmUgdGhlIGdsb2JzdGFyIG1hdGNoIGlzIGVtcHR5XG4vLyAgICAgLy8gYnkgcHJ1bmluZyBpdCBvdXQsIGFuZCB0ZXN0aW5nIHRoZSByZXN1bHRpbmcgcGF0dGVyblxuLy8gICAgIFBST0NFU1MocGF0dGVyblswLi5uXSArIHBhdHRlcm5bbisxIC4uICRdLCBmYWxzZSlcbi8vICAgICAvLyBoYW5kbGUgb3RoZXIgY2FzZXMuXG4vLyAgICAgZm9yIEVOVFJZIGluIEVOVFJJRVMgKG5vdCBkb3RmaWxlcylcbi8vICAgICAgIC8vIGF0dGFjaCBnbG9ic3RhciArIHRhaWwgb250byB0aGUgZW50cnlcbi8vICAgICAgIC8vIE1hcmsgdGhhdCB0aGlzIGVudHJ5IGlzIGEgZ2xvYnN0YXIgbWF0Y2hcbi8vICAgICAgIFBST0NFU1MocGF0dGVyblswLi5uXSArIEVOVFJZICsgcGF0dGVybltuIC4uICRdLCB0cnVlKVxuLy9cbi8vICAgZWxzZSAvLyBub3QgZ2xvYnN0YXJcbi8vICAgICBmb3IgRU5UUlkgaW4gRU5UUklFUyAobm90IGRvdGZpbGVzLCB1bmxlc3MgcGF0dGVybltuXSBpcyBkb3QpXG4vLyAgICAgICBUZXN0IEVOVFJZIGFnYWluc3QgcGF0dGVybltuXVxuLy8gICAgICAgSWYgZmFpbHMsIGNvbnRpbnVlXG4vLyAgICAgICBJZiBwYXNzZXMsIFBST0NFU1MocGF0dGVyblswLi5uXSArIGl0ZW0gKyBwYXR0ZXJuW24rMSAuLiAkXSlcbi8vXG4vLyBDYXZlYXQ6XG4vLyAgIENhY2hlIGFsbCBzdGF0cyBhbmQgcmVhZGRpcnMgcmVzdWx0cyB0byBtaW5pbWl6ZSBzeXNjYWxsLiAgU2luY2UgYWxsXG4vLyAgIHdlIGV2ZXIgY2FyZSBhYm91dCBpcyBleGlzdGVuY2UgYW5kIGRpcmVjdG9yeS1uZXNzLCB3ZSBjYW4ganVzdCBrZWVwXG4vLyAgIGB0cnVlYCBmb3IgZmlsZXMsIGFuZCBbY2hpbGRyZW4sLi4uXSBmb3IgZGlyZWN0b3JpZXMsIG9yIGBmYWxzZWAgZm9yXG4vLyAgIHRoaW5ncyB0aGF0IGRvbid0IGV4aXN0LlxuXG5tb2R1bGUuZXhwb3J0cyA9IGdsb2JcblxudmFyIHJwID0gcmVxdWlyZSgnZnMucmVhbHBhdGgnKVxudmFyIG1pbmltYXRjaCA9IHJlcXVpcmUoJ21pbmltYXRjaCcpXG52YXIgTWluaW1hdGNoID0gbWluaW1hdGNoLk1pbmltYXRjaFxudmFyIGluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKVxudmFyIEVFID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyXG52YXIgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKVxudmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpXG52YXIgaXNBYnNvbHV0ZSA9IHJlcXVpcmUoJ3BhdGgtaXMtYWJzb2x1dGUnKVxudmFyIGdsb2JTeW5jID0gcmVxdWlyZSgnLi9zeW5jLmpzJylcbnZhciBjb21tb24gPSByZXF1aXJlKCcuL2NvbW1vbi5qcycpXG52YXIgc2V0b3B0cyA9IGNvbW1vbi5zZXRvcHRzXG52YXIgb3duUHJvcCA9IGNvbW1vbi5vd25Qcm9wXG52YXIgaW5mbGlnaHQgPSByZXF1aXJlKCdpbmZsaWdodCcpXG52YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKVxudmFyIGNoaWxkcmVuSWdub3JlZCA9IGNvbW1vbi5jaGlsZHJlbklnbm9yZWRcbnZhciBpc0lnbm9yZWQgPSBjb21tb24uaXNJZ25vcmVkXG5cbnZhciBvbmNlID0gcmVxdWlyZSgnb25jZScpXG5cbmZ1bmN0aW9uIGdsb2IgKHBhdHRlcm4sIG9wdGlvbnMsIGNiKSB7XG4gIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykgY2IgPSBvcHRpb25zLCBvcHRpb25zID0ge31cbiAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge31cblxuICBpZiAob3B0aW9ucy5zeW5jKSB7XG4gICAgaWYgKGNiKVxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignY2FsbGJhY2sgcHJvdmlkZWQgdG8gc3luYyBnbG9iJylcbiAgICByZXR1cm4gZ2xvYlN5bmMocGF0dGVybiwgb3B0aW9ucylcbiAgfVxuXG4gIHJldHVybiBuZXcgR2xvYihwYXR0ZXJuLCBvcHRpb25zLCBjYilcbn1cblxuZ2xvYi5zeW5jID0gZ2xvYlN5bmNcbnZhciBHbG9iU3luYyA9IGdsb2IuR2xvYlN5bmMgPSBnbG9iU3luYy5HbG9iU3luY1xuXG4vLyBvbGQgYXBpIHN1cmZhY2Vcbmdsb2IuZ2xvYiA9IGdsb2JcblxuZnVuY3Rpb24gZXh0ZW5kIChvcmlnaW4sIGFkZCkge1xuICBpZiAoYWRkID09PSBudWxsIHx8IHR5cGVvZiBhZGQgIT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIG9yaWdpblxuICB9XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpXG4gIHZhciBpID0ga2V5cy5sZW5ndGhcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXVxuICB9XG4gIHJldHVybiBvcmlnaW5cbn1cblxuZ2xvYi5oYXNNYWdpYyA9IGZ1bmN0aW9uIChwYXR0ZXJuLCBvcHRpb25zXykge1xuICB2YXIgb3B0aW9ucyA9IGV4dGVuZCh7fSwgb3B0aW9uc18pXG4gIG9wdGlvbnMubm9wcm9jZXNzID0gdHJ1ZVxuXG4gIHZhciBnID0gbmV3IEdsb2IocGF0dGVybiwgb3B0aW9ucylcbiAgdmFyIHNldCA9IGcubWluaW1hdGNoLnNldFxuXG4gIGlmICghcGF0dGVybilcbiAgICByZXR1cm4gZmFsc2VcblxuICBpZiAoc2V0Lmxlbmd0aCA+IDEpXG4gICAgcmV0dXJuIHRydWVcblxuICBmb3IgKHZhciBqID0gMDsgaiA8IHNldFswXS5sZW5ndGg7IGorKykge1xuICAgIGlmICh0eXBlb2Ygc2V0WzBdW2pdICE9PSAnc3RyaW5nJylcbiAgICAgIHJldHVybiB0cnVlXG4gIH1cblxuICByZXR1cm4gZmFsc2Vcbn1cblxuZ2xvYi5HbG9iID0gR2xvYlxuaW5oZXJpdHMoR2xvYiwgRUUpXG5mdW5jdGlvbiBHbG9iIChwYXR0ZXJuLCBvcHRpb25zLCBjYikge1xuICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYiA9IG9wdGlvbnNcbiAgICBvcHRpb25zID0gbnVsbFxuICB9XG5cbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5zeW5jKSB7XG4gICAgaWYgKGNiKVxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignY2FsbGJhY2sgcHJvdmlkZWQgdG8gc3luYyBnbG9iJylcbiAgICByZXR1cm4gbmV3IEdsb2JTeW5jKHBhdHRlcm4sIG9wdGlvbnMpXG4gIH1cblxuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgR2xvYikpXG4gICAgcmV0dXJuIG5ldyBHbG9iKHBhdHRlcm4sIG9wdGlvbnMsIGNiKVxuXG4gIHNldG9wdHModGhpcywgcGF0dGVybiwgb3B0aW9ucylcbiAgdGhpcy5fZGlkUmVhbFBhdGggPSBmYWxzZVxuXG4gIC8vIHByb2Nlc3MgZWFjaCBwYXR0ZXJuIGluIHRoZSBtaW5pbWF0Y2ggc2V0XG4gIHZhciBuID0gdGhpcy5taW5pbWF0Y2guc2V0Lmxlbmd0aFxuXG4gIC8vIFRoZSBtYXRjaGVzIGFyZSBzdG9yZWQgYXMgezxmaWxlbmFtZT46IHRydWUsLi4ufSBzbyB0aGF0XG4gIC8vIGR1cGxpY2F0ZXMgYXJlIGF1dG9tYWdpY2FsbHkgcHJ1bmVkLlxuICAvLyBMYXRlciwgd2UgZG8gYW4gT2JqZWN0LmtleXMoKSBvbiB0aGVzZS5cbiAgLy8gS2VlcCB0aGVtIGFzIGEgbGlzdCBzbyB3ZSBjYW4gZmlsbCBpbiB3aGVuIG5vbnVsbCBpcyBzZXQuXG4gIHRoaXMubWF0Y2hlcyA9IG5ldyBBcnJheShuKVxuXG4gIGlmICh0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYiA9IG9uY2UoY2IpXG4gICAgdGhpcy5vbignZXJyb3InLCBjYilcbiAgICB0aGlzLm9uKCdlbmQnLCBmdW5jdGlvbiAobWF0Y2hlcykge1xuICAgICAgY2IobnVsbCwgbWF0Y2hlcylcbiAgICB9KVxuICB9XG5cbiAgdmFyIHNlbGYgPSB0aGlzXG4gIHRoaXMuX3Byb2Nlc3NpbmcgPSAwXG5cbiAgdGhpcy5fZW1pdFF1ZXVlID0gW11cbiAgdGhpcy5fcHJvY2Vzc1F1ZXVlID0gW11cbiAgdGhpcy5wYXVzZWQgPSBmYWxzZVxuXG4gIGlmICh0aGlzLm5vcHJvY2VzcylcbiAgICByZXR1cm4gdGhpc1xuXG4gIGlmIChuID09PSAwKVxuICAgIHJldHVybiBkb25lKClcblxuICB2YXIgc3luYyA9IHRydWVcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpICsrKSB7XG4gICAgdGhpcy5fcHJvY2Vzcyh0aGlzLm1pbmltYXRjaC5zZXRbaV0sIGksIGZhbHNlLCBkb25lKVxuICB9XG4gIHN5bmMgPSBmYWxzZVxuXG4gIGZ1bmN0aW9uIGRvbmUgKCkge1xuICAgIC0tc2VsZi5fcHJvY2Vzc2luZ1xuICAgIGlmIChzZWxmLl9wcm9jZXNzaW5nIDw9IDApIHtcbiAgICAgIGlmIChzeW5jKSB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHNlbGYuX2ZpbmlzaCgpXG4gICAgICAgIH0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWxmLl9maW5pc2goKVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5HbG9iLnByb3RvdHlwZS5fZmluaXNoID0gZnVuY3Rpb24gKCkge1xuICBhc3NlcnQodGhpcyBpbnN0YW5jZW9mIEdsb2IpXG4gIGlmICh0aGlzLmFib3J0ZWQpXG4gICAgcmV0dXJuXG5cbiAgaWYgKHRoaXMucmVhbHBhdGggJiYgIXRoaXMuX2RpZFJlYWxwYXRoKVxuICAgIHJldHVybiB0aGlzLl9yZWFscGF0aCgpXG5cbiAgY29tbW9uLmZpbmlzaCh0aGlzKVxuICB0aGlzLmVtaXQoJ2VuZCcsIHRoaXMuZm91bmQpXG59XG5cbkdsb2IucHJvdG90eXBlLl9yZWFscGF0aCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuX2RpZFJlYWxwYXRoKVxuICAgIHJldHVyblxuXG4gIHRoaXMuX2RpZFJlYWxwYXRoID0gdHJ1ZVxuXG4gIHZhciBuID0gdGhpcy5tYXRjaGVzLmxlbmd0aFxuICBpZiAobiA9PT0gMClcbiAgICByZXR1cm4gdGhpcy5fZmluaXNoKClcblxuICB2YXIgc2VsZiA9IHRoaXNcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm1hdGNoZXMubGVuZ3RoOyBpKyspXG4gICAgdGhpcy5fcmVhbHBhdGhTZXQoaSwgbmV4dClcblxuICBmdW5jdGlvbiBuZXh0ICgpIHtcbiAgICBpZiAoLS1uID09PSAwKVxuICAgICAgc2VsZi5fZmluaXNoKClcbiAgfVxufVxuXG5HbG9iLnByb3RvdHlwZS5fcmVhbHBhdGhTZXQgPSBmdW5jdGlvbiAoaW5kZXgsIGNiKSB7XG4gIHZhciBtYXRjaHNldCA9IHRoaXMubWF0Y2hlc1tpbmRleF1cbiAgaWYgKCFtYXRjaHNldClcbiAgICByZXR1cm4gY2IoKVxuXG4gIHZhciBmb3VuZCA9IE9iamVjdC5rZXlzKG1hdGNoc2V0KVxuICB2YXIgc2VsZiA9IHRoaXNcbiAgdmFyIG4gPSBmb3VuZC5sZW5ndGhcblxuICBpZiAobiA9PT0gMClcbiAgICByZXR1cm4gY2IoKVxuXG4gIHZhciBzZXQgPSB0aGlzLm1hdGNoZXNbaW5kZXhdID0gT2JqZWN0LmNyZWF0ZShudWxsKVxuICBmb3VuZC5mb3JFYWNoKGZ1bmN0aW9uIChwLCBpKSB7XG4gICAgLy8gSWYgdGhlcmUncyBhIHByb2JsZW0gd2l0aCB0aGUgc3RhdCwgdGhlbiBpdCBtZWFucyB0aGF0XG4gICAgLy8gb25lIG9yIG1vcmUgb2YgdGhlIGxpbmtzIGluIHRoZSByZWFscGF0aCBjb3VsZG4ndCBiZVxuICAgIC8vIHJlc29sdmVkLiAganVzdCByZXR1cm4gdGhlIGFicyB2YWx1ZSBpbiB0aGF0IGNhc2UuXG4gICAgcCA9IHNlbGYuX21ha2VBYnMocClcbiAgICBycC5yZWFscGF0aChwLCBzZWxmLnJlYWxwYXRoQ2FjaGUsIGZ1bmN0aW9uIChlciwgcmVhbCkge1xuICAgICAgaWYgKCFlcilcbiAgICAgICAgc2V0W3JlYWxdID0gdHJ1ZVxuICAgICAgZWxzZSBpZiAoZXIuc3lzY2FsbCA9PT0gJ3N0YXQnKVxuICAgICAgICBzZXRbcF0gPSB0cnVlXG4gICAgICBlbHNlXG4gICAgICAgIHNlbGYuZW1pdCgnZXJyb3InLCBlcikgLy8gc3JzbHkgd3RmIHJpZ2h0IGhlcmVcblxuICAgICAgaWYgKC0tbiA9PT0gMCkge1xuICAgICAgICBzZWxmLm1hdGNoZXNbaW5kZXhdID0gc2V0XG4gICAgICAgIGNiKClcbiAgICAgIH1cbiAgICB9KVxuICB9KVxufVxuXG5HbG9iLnByb3RvdHlwZS5fbWFyayA9IGZ1bmN0aW9uIChwKSB7XG4gIHJldHVybiBjb21tb24ubWFyayh0aGlzLCBwKVxufVxuXG5HbG9iLnByb3RvdHlwZS5fbWFrZUFicyA9IGZ1bmN0aW9uIChmKSB7XG4gIHJldHVybiBjb21tb24ubWFrZUFicyh0aGlzLCBmKVxufVxuXG5HbG9iLnByb3RvdHlwZS5hYm9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5hYm9ydGVkID0gdHJ1ZVxuICB0aGlzLmVtaXQoJ2Fib3J0Jylcbn1cblxuR2xvYi5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICghdGhpcy5wYXVzZWQpIHtcbiAgICB0aGlzLnBhdXNlZCA9IHRydWVcbiAgICB0aGlzLmVtaXQoJ3BhdXNlJylcbiAgfVxufVxuXG5HbG9iLnByb3RvdHlwZS5yZXN1bWUgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLnBhdXNlZCkge1xuICAgIHRoaXMuZW1pdCgncmVzdW1lJylcbiAgICB0aGlzLnBhdXNlZCA9IGZhbHNlXG4gICAgaWYgKHRoaXMuX2VtaXRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgIHZhciBlcSA9IHRoaXMuX2VtaXRRdWV1ZS5zbGljZSgwKVxuICAgICAgdGhpcy5fZW1pdFF1ZXVlLmxlbmd0aCA9IDBcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXEubGVuZ3RoOyBpICsrKSB7XG4gICAgICAgIHZhciBlID0gZXFbaV1cbiAgICAgICAgdGhpcy5fZW1pdE1hdGNoKGVbMF0sIGVbMV0pXG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0aGlzLl9wcm9jZXNzUXVldWUubGVuZ3RoKSB7XG4gICAgICB2YXIgcHEgPSB0aGlzLl9wcm9jZXNzUXVldWUuc2xpY2UoMClcbiAgICAgIHRoaXMuX3Byb2Nlc3NRdWV1ZS5sZW5ndGggPSAwXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBxLmxlbmd0aDsgaSArKykge1xuICAgICAgICB2YXIgcCA9IHBxW2ldXG4gICAgICAgIHRoaXMuX3Byb2Nlc3NpbmctLVxuICAgICAgICB0aGlzLl9wcm9jZXNzKHBbMF0sIHBbMV0sIHBbMl0sIHBbM10pXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbkdsb2IucHJvdG90eXBlLl9wcm9jZXNzID0gZnVuY3Rpb24gKHBhdHRlcm4sIGluZGV4LCBpbkdsb2JTdGFyLCBjYikge1xuICBhc3NlcnQodGhpcyBpbnN0YW5jZW9mIEdsb2IpXG4gIGFzc2VydCh0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpXG5cbiAgaWYgKHRoaXMuYWJvcnRlZClcbiAgICByZXR1cm5cblxuICB0aGlzLl9wcm9jZXNzaW5nKytcbiAgaWYgKHRoaXMucGF1c2VkKSB7XG4gICAgdGhpcy5fcHJvY2Vzc1F1ZXVlLnB1c2goW3BhdHRlcm4sIGluZGV4LCBpbkdsb2JTdGFyLCBjYl0pXG4gICAgcmV0dXJuXG4gIH1cblxuICAvL2NvbnNvbGUuZXJyb3IoJ1BST0NFU1MgJWQnLCB0aGlzLl9wcm9jZXNzaW5nLCBwYXR0ZXJuKVxuXG4gIC8vIEdldCB0aGUgZmlyc3QgW25dIHBhcnRzIG9mIHBhdHRlcm4gdGhhdCBhcmUgYWxsIHN0cmluZ3MuXG4gIHZhciBuID0gMFxuICB3aGlsZSAodHlwZW9mIHBhdHRlcm5bbl0gPT09ICdzdHJpbmcnKSB7XG4gICAgbiArK1xuICB9XG4gIC8vIG5vdyBuIGlzIHRoZSBpbmRleCBvZiB0aGUgZmlyc3Qgb25lIHRoYXQgaXMgKm5vdCogYSBzdHJpbmcuXG5cbiAgLy8gc2VlIGlmIHRoZXJlJ3MgYW55dGhpbmcgZWxzZVxuICB2YXIgcHJlZml4XG4gIHN3aXRjaCAobikge1xuICAgIC8vIGlmIG5vdCwgdGhlbiB0aGlzIGlzIHJhdGhlciBzaW1wbGVcbiAgICBjYXNlIHBhdHRlcm4ubGVuZ3RoOlxuICAgICAgdGhpcy5fcHJvY2Vzc1NpbXBsZShwYXR0ZXJuLmpvaW4oJy8nKSwgaW5kZXgsIGNiKVxuICAgICAgcmV0dXJuXG5cbiAgICBjYXNlIDA6XG4gICAgICAvLyBwYXR0ZXJuICpzdGFydHMqIHdpdGggc29tZSBub24tdHJpdmlhbCBpdGVtLlxuICAgICAgLy8gZ29pbmcgdG8gcmVhZGRpcihjd2QpLCBidXQgbm90IGluY2x1ZGUgdGhlIHByZWZpeCBpbiBtYXRjaGVzLlxuICAgICAgcHJlZml4ID0gbnVsbFxuICAgICAgYnJlYWtcblxuICAgIGRlZmF1bHQ6XG4gICAgICAvLyBwYXR0ZXJuIGhhcyBzb21lIHN0cmluZyBiaXRzIGluIHRoZSBmcm9udC5cbiAgICAgIC8vIHdoYXRldmVyIGl0IHN0YXJ0cyB3aXRoLCB3aGV0aGVyIHRoYXQncyAnYWJzb2x1dGUnIGxpa2UgL2Zvby9iYXIsXG4gICAgICAvLyBvciAncmVsYXRpdmUnIGxpa2UgJy4uL2JheidcbiAgICAgIHByZWZpeCA9IHBhdHRlcm4uc2xpY2UoMCwgbikuam9pbignLycpXG4gICAgICBicmVha1xuICB9XG5cbiAgdmFyIHJlbWFpbiA9IHBhdHRlcm4uc2xpY2UobilcblxuICAvLyBnZXQgdGhlIGxpc3Qgb2YgZW50cmllcy5cbiAgdmFyIHJlYWRcbiAgaWYgKHByZWZpeCA9PT0gbnVsbClcbiAgICByZWFkID0gJy4nXG4gIGVsc2UgaWYgKGlzQWJzb2x1dGUocHJlZml4KSB8fCBpc0Fic29sdXRlKHBhdHRlcm4uam9pbignLycpKSkge1xuICAgIGlmICghcHJlZml4IHx8ICFpc0Fic29sdXRlKHByZWZpeCkpXG4gICAgICBwcmVmaXggPSAnLycgKyBwcmVmaXhcbiAgICByZWFkID0gcHJlZml4XG4gIH0gZWxzZVxuICAgIHJlYWQgPSBwcmVmaXhcblxuICB2YXIgYWJzID0gdGhpcy5fbWFrZUFicyhyZWFkKVxuXG4gIC8vaWYgaWdub3JlZCwgc2tpcCBfcHJvY2Vzc2luZ1xuICBpZiAoY2hpbGRyZW5JZ25vcmVkKHRoaXMsIHJlYWQpKVxuICAgIHJldHVybiBjYigpXG5cbiAgdmFyIGlzR2xvYlN0YXIgPSByZW1haW5bMF0gPT09IG1pbmltYXRjaC5HTE9CU1RBUlxuICBpZiAoaXNHbG9iU3RhcilcbiAgICB0aGlzLl9wcm9jZXNzR2xvYlN0YXIocHJlZml4LCByZWFkLCBhYnMsIHJlbWFpbiwgaW5kZXgsIGluR2xvYlN0YXIsIGNiKVxuICBlbHNlXG4gICAgdGhpcy5fcHJvY2Vzc1JlYWRkaXIocHJlZml4LCByZWFkLCBhYnMsIHJlbWFpbiwgaW5kZXgsIGluR2xvYlN0YXIsIGNiKVxufVxuXG5HbG9iLnByb3RvdHlwZS5fcHJvY2Vzc1JlYWRkaXIgPSBmdW5jdGlvbiAocHJlZml4LCByZWFkLCBhYnMsIHJlbWFpbiwgaW5kZXgsIGluR2xvYlN0YXIsIGNiKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuICB0aGlzLl9yZWFkZGlyKGFicywgaW5HbG9iU3RhciwgZnVuY3Rpb24gKGVyLCBlbnRyaWVzKSB7XG4gICAgcmV0dXJuIHNlbGYuX3Byb2Nlc3NSZWFkZGlyMihwcmVmaXgsIHJlYWQsIGFicywgcmVtYWluLCBpbmRleCwgaW5HbG9iU3RhciwgZW50cmllcywgY2IpXG4gIH0pXG59XG5cbkdsb2IucHJvdG90eXBlLl9wcm9jZXNzUmVhZGRpcjIgPSBmdW5jdGlvbiAocHJlZml4LCByZWFkLCBhYnMsIHJlbWFpbiwgaW5kZXgsIGluR2xvYlN0YXIsIGVudHJpZXMsIGNiKSB7XG5cbiAgLy8gaWYgdGhlIGFicyBpc24ndCBhIGRpciwgdGhlbiBub3RoaW5nIGNhbiBtYXRjaCFcbiAgaWYgKCFlbnRyaWVzKVxuICAgIHJldHVybiBjYigpXG5cbiAgLy8gSXQgd2lsbCBvbmx5IG1hdGNoIGRvdCBlbnRyaWVzIGlmIGl0IHN0YXJ0cyB3aXRoIGEgZG90LCBvciBpZlxuICAvLyBkb3QgaXMgc2V0LiAgU3R1ZmYgbGlrZSBAKC5mb298LmJhcikgaXNuJ3QgYWxsb3dlZC5cbiAgdmFyIHBuID0gcmVtYWluWzBdXG4gIHZhciBuZWdhdGUgPSAhIXRoaXMubWluaW1hdGNoLm5lZ2F0ZVxuICB2YXIgcmF3R2xvYiA9IHBuLl9nbG9iXG4gIHZhciBkb3RPayA9IHRoaXMuZG90IHx8IHJhd0dsb2IuY2hhckF0KDApID09PSAnLidcblxuICB2YXIgbWF0Y2hlZEVudHJpZXMgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGVudHJpZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgZSA9IGVudHJpZXNbaV1cbiAgICBpZiAoZS5jaGFyQXQoMCkgIT09ICcuJyB8fCBkb3RPaykge1xuICAgICAgdmFyIG1cbiAgICAgIGlmIChuZWdhdGUgJiYgIXByZWZpeCkge1xuICAgICAgICBtID0gIWUubWF0Y2gocG4pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtID0gZS5tYXRjaChwbilcbiAgICAgIH1cbiAgICAgIGlmIChtKVxuICAgICAgICBtYXRjaGVkRW50cmllcy5wdXNoKGUpXG4gICAgfVxuICB9XG5cbiAgLy9jb25zb2xlLmVycm9yKCdwcmQyJywgcHJlZml4LCBlbnRyaWVzLCByZW1haW5bMF0uX2dsb2IsIG1hdGNoZWRFbnRyaWVzKVxuXG4gIHZhciBsZW4gPSBtYXRjaGVkRW50cmllcy5sZW5ndGhcbiAgLy8gSWYgdGhlcmUgYXJlIG5vIG1hdGNoZWQgZW50cmllcywgdGhlbiBub3RoaW5nIG1hdGNoZXMuXG4gIGlmIChsZW4gPT09IDApXG4gICAgcmV0dXJuIGNiKClcblxuICAvLyBpZiB0aGlzIGlzIHRoZSBsYXN0IHJlbWFpbmluZyBwYXR0ZXJuIGJpdCwgdGhlbiBubyBuZWVkIGZvclxuICAvLyBhbiBhZGRpdGlvbmFsIHN0YXQgKnVubGVzcyogdGhlIHVzZXIgaGFzIHNwZWNpZmllZCBtYXJrIG9yXG4gIC8vIHN0YXQgZXhwbGljaXRseS4gIFdlIGtub3cgdGhleSBleGlzdCwgc2luY2UgcmVhZGRpciByZXR1cm5lZFxuICAvLyB0aGVtLlxuXG4gIGlmIChyZW1haW4ubGVuZ3RoID09PSAxICYmICF0aGlzLm1hcmsgJiYgIXRoaXMuc3RhdCkge1xuICAgIGlmICghdGhpcy5tYXRjaGVzW2luZGV4XSlcbiAgICAgIHRoaXMubWF0Y2hlc1tpbmRleF0gPSBPYmplY3QuY3JlYXRlKG51bGwpXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArKykge1xuICAgICAgdmFyIGUgPSBtYXRjaGVkRW50cmllc1tpXVxuICAgICAgaWYgKHByZWZpeCkge1xuICAgICAgICBpZiAocHJlZml4ICE9PSAnLycpXG4gICAgICAgICAgZSA9IHByZWZpeCArICcvJyArIGVcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGUgPSBwcmVmaXggKyBlXG4gICAgICB9XG5cbiAgICAgIGlmIChlLmNoYXJBdCgwKSA9PT0gJy8nICYmICF0aGlzLm5vbW91bnQpIHtcbiAgICAgICAgZSA9IHBhdGguam9pbih0aGlzLnJvb3QsIGUpXG4gICAgICB9XG4gICAgICB0aGlzLl9lbWl0TWF0Y2goaW5kZXgsIGUpXG4gICAgfVxuICAgIC8vIFRoaXMgd2FzIHRoZSBsYXN0IG9uZSwgYW5kIG5vIHN0YXRzIHdlcmUgbmVlZGVkXG4gICAgcmV0dXJuIGNiKClcbiAgfVxuXG4gIC8vIG5vdyB0ZXN0IGFsbCBtYXRjaGVkIGVudHJpZXMgYXMgc3RhbmQtaW5zIGZvciB0aGF0IHBhcnRcbiAgLy8gb2YgdGhlIHBhdHRlcm4uXG4gIHJlbWFpbi5zaGlmdCgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICsrKSB7XG4gICAgdmFyIGUgPSBtYXRjaGVkRW50cmllc1tpXVxuICAgIHZhciBuZXdQYXR0ZXJuXG4gICAgaWYgKHByZWZpeCkge1xuICAgICAgaWYgKHByZWZpeCAhPT0gJy8nKVxuICAgICAgICBlID0gcHJlZml4ICsgJy8nICsgZVxuICAgICAgZWxzZVxuICAgICAgICBlID0gcHJlZml4ICsgZVxuICAgIH1cbiAgICB0aGlzLl9wcm9jZXNzKFtlXS5jb25jYXQocmVtYWluKSwgaW5kZXgsIGluR2xvYlN0YXIsIGNiKVxuICB9XG4gIGNiKClcbn1cblxuR2xvYi5wcm90b3R5cGUuX2VtaXRNYXRjaCA9IGZ1bmN0aW9uIChpbmRleCwgZSkge1xuICBpZiAodGhpcy5hYm9ydGVkKVxuICAgIHJldHVyblxuXG4gIGlmIChpc0lnbm9yZWQodGhpcywgZSkpXG4gICAgcmV0dXJuXG5cbiAgaWYgKHRoaXMucGF1c2VkKSB7XG4gICAgdGhpcy5fZW1pdFF1ZXVlLnB1c2goW2luZGV4LCBlXSlcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBhYnMgPSBpc0Fic29sdXRlKGUpID8gZSA6IHRoaXMuX21ha2VBYnMoZSlcblxuICBpZiAodGhpcy5tYXJrKVxuICAgIGUgPSB0aGlzLl9tYXJrKGUpXG5cbiAgaWYgKHRoaXMuYWJzb2x1dGUpXG4gICAgZSA9IGFic1xuXG4gIGlmICh0aGlzLm1hdGNoZXNbaW5kZXhdW2VdKVxuICAgIHJldHVyblxuXG4gIGlmICh0aGlzLm5vZGlyKSB7XG4gICAgdmFyIGMgPSB0aGlzLmNhY2hlW2Fic11cbiAgICBpZiAoYyA9PT0gJ0RJUicgfHwgQXJyYXkuaXNBcnJheShjKSlcbiAgICAgIHJldHVyblxuICB9XG5cbiAgdGhpcy5tYXRjaGVzW2luZGV4XVtlXSA9IHRydWVcblxuICB2YXIgc3QgPSB0aGlzLnN0YXRDYWNoZVthYnNdXG4gIGlmIChzdClcbiAgICB0aGlzLmVtaXQoJ3N0YXQnLCBlLCBzdClcblxuICB0aGlzLmVtaXQoJ21hdGNoJywgZSlcbn1cblxuR2xvYi5wcm90b3R5cGUuX3JlYWRkaXJJbkdsb2JTdGFyID0gZnVuY3Rpb24gKGFicywgY2IpIHtcbiAgaWYgKHRoaXMuYWJvcnRlZClcbiAgICByZXR1cm5cblxuICAvLyBmb2xsb3cgYWxsIHN5bWxpbmtlZCBkaXJlY3RvcmllcyBmb3JldmVyXG4gIC8vIGp1c3QgcHJvY2VlZCBhcyBpZiB0aGlzIGlzIGEgbm9uLWdsb2JzdGFyIHNpdHVhdGlvblxuICBpZiAodGhpcy5mb2xsb3cpXG4gICAgcmV0dXJuIHRoaXMuX3JlYWRkaXIoYWJzLCBmYWxzZSwgY2IpXG5cbiAgdmFyIGxzdGF0a2V5ID0gJ2xzdGF0XFwwJyArIGFic1xuICB2YXIgc2VsZiA9IHRoaXNcbiAgdmFyIGxzdGF0Y2IgPSBpbmZsaWdodChsc3RhdGtleSwgbHN0YXRjYl8pXG5cbiAgaWYgKGxzdGF0Y2IpXG4gICAgc2VsZi5mcy5sc3RhdChhYnMsIGxzdGF0Y2IpXG5cbiAgZnVuY3Rpb24gbHN0YXRjYl8gKGVyLCBsc3RhdCkge1xuICAgIGlmIChlciAmJiBlci5jb2RlID09PSAnRU5PRU5UJylcbiAgICAgIHJldHVybiBjYigpXG5cbiAgICB2YXIgaXNTeW0gPSBsc3RhdCAmJiBsc3RhdC5pc1N5bWJvbGljTGluaygpXG4gICAgc2VsZi5zeW1saW5rc1thYnNdID0gaXNTeW1cblxuICAgIC8vIElmIGl0J3Mgbm90IGEgc3ltbGluayBvciBhIGRpciwgdGhlbiBpdCdzIGRlZmluaXRlbHkgYSByZWd1bGFyIGZpbGUuXG4gICAgLy8gZG9uJ3QgYm90aGVyIGRvaW5nIGEgcmVhZGRpciBpbiB0aGF0IGNhc2UuXG4gICAgaWYgKCFpc1N5bSAmJiBsc3RhdCAmJiAhbHN0YXQuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgc2VsZi5jYWNoZVthYnNdID0gJ0ZJTEUnXG4gICAgICBjYigpXG4gICAgfSBlbHNlXG4gICAgICBzZWxmLl9yZWFkZGlyKGFicywgZmFsc2UsIGNiKVxuICB9XG59XG5cbkdsb2IucHJvdG90eXBlLl9yZWFkZGlyID0gZnVuY3Rpb24gKGFicywgaW5HbG9iU3RhciwgY2IpIHtcbiAgaWYgKHRoaXMuYWJvcnRlZClcbiAgICByZXR1cm5cblxuICBjYiA9IGluZmxpZ2h0KCdyZWFkZGlyXFwwJythYnMrJ1xcMCcraW5HbG9iU3RhciwgY2IpXG4gIGlmICghY2IpXG4gICAgcmV0dXJuXG5cbiAgLy9jb25zb2xlLmVycm9yKCdSRCAlaiAlaicsICtpbkdsb2JTdGFyLCBhYnMpXG4gIGlmIChpbkdsb2JTdGFyICYmICFvd25Qcm9wKHRoaXMuc3ltbGlua3MsIGFicykpXG4gICAgcmV0dXJuIHRoaXMuX3JlYWRkaXJJbkdsb2JTdGFyKGFicywgY2IpXG5cbiAgaWYgKG93blByb3AodGhpcy5jYWNoZSwgYWJzKSkge1xuICAgIHZhciBjID0gdGhpcy5jYWNoZVthYnNdXG4gICAgaWYgKCFjIHx8IGMgPT09ICdGSUxFJylcbiAgICAgIHJldHVybiBjYigpXG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShjKSlcbiAgICAgIHJldHVybiBjYihudWxsLCBjKVxuICB9XG5cbiAgdmFyIHNlbGYgPSB0aGlzXG4gIHNlbGYuZnMucmVhZGRpcihhYnMsIHJlYWRkaXJDYih0aGlzLCBhYnMsIGNiKSlcbn1cblxuZnVuY3Rpb24gcmVhZGRpckNiIChzZWxmLCBhYnMsIGNiKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoZXIsIGVudHJpZXMpIHtcbiAgICBpZiAoZXIpXG4gICAgICBzZWxmLl9yZWFkZGlyRXJyb3IoYWJzLCBlciwgY2IpXG4gICAgZWxzZVxuICAgICAgc2VsZi5fcmVhZGRpckVudHJpZXMoYWJzLCBlbnRyaWVzLCBjYilcbiAgfVxufVxuXG5HbG9iLnByb3RvdHlwZS5fcmVhZGRpckVudHJpZXMgPSBmdW5jdGlvbiAoYWJzLCBlbnRyaWVzLCBjYikge1xuICBpZiAodGhpcy5hYm9ydGVkKVxuICAgIHJldHVyblxuXG4gIC8vIGlmIHdlIGhhdmVuJ3QgYXNrZWQgdG8gc3RhdCBldmVyeXRoaW5nLCB0aGVuIGp1c3RcbiAgLy8gYXNzdW1lIHRoYXQgZXZlcnl0aGluZyBpbiB0aGVyZSBleGlzdHMsIHNvIHdlIGNhbiBhdm9pZFxuICAvLyBoYXZpbmcgdG8gc3RhdCBpdCBhIHNlY29uZCB0aW1lLlxuICBpZiAoIXRoaXMubWFyayAmJiAhdGhpcy5zdGF0KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbnRyaWVzLmxlbmd0aDsgaSArKykge1xuICAgICAgdmFyIGUgPSBlbnRyaWVzW2ldXG4gICAgICBpZiAoYWJzID09PSAnLycpXG4gICAgICAgIGUgPSBhYnMgKyBlXG4gICAgICBlbHNlXG4gICAgICAgIGUgPSBhYnMgKyAnLycgKyBlXG4gICAgICB0aGlzLmNhY2hlW2VdID0gdHJ1ZVxuICAgIH1cbiAgfVxuXG4gIHRoaXMuY2FjaGVbYWJzXSA9IGVudHJpZXNcbiAgcmV0dXJuIGNiKG51bGwsIGVudHJpZXMpXG59XG5cbkdsb2IucHJvdG90eXBlLl9yZWFkZGlyRXJyb3IgPSBmdW5jdGlvbiAoZiwgZXIsIGNiKSB7XG4gIGlmICh0aGlzLmFib3J0ZWQpXG4gICAgcmV0dXJuXG5cbiAgLy8gaGFuZGxlIGVycm9ycywgYW5kIGNhY2hlIHRoZSBpbmZvcm1hdGlvblxuICBzd2l0Y2ggKGVyLmNvZGUpIHtcbiAgICBjYXNlICdFTk9UU1VQJzogLy8gaHR0cHM6Ly9naXRodWIuY29tL2lzYWFjcy9ub2RlLWdsb2IvaXNzdWVzLzIwNVxuICAgIGNhc2UgJ0VOT1RESVInOiAvLyB0b3RhbGx5IG5vcm1hbC4gbWVhbnMgaXQgKmRvZXMqIGV4aXN0LlxuICAgICAgdmFyIGFicyA9IHRoaXMuX21ha2VBYnMoZilcbiAgICAgIHRoaXMuY2FjaGVbYWJzXSA9ICdGSUxFJ1xuICAgICAgaWYgKGFicyA9PT0gdGhpcy5jd2RBYnMpIHtcbiAgICAgICAgdmFyIGVycm9yID0gbmV3IEVycm9yKGVyLmNvZGUgKyAnIGludmFsaWQgY3dkICcgKyB0aGlzLmN3ZClcbiAgICAgICAgZXJyb3IucGF0aCA9IHRoaXMuY3dkXG4gICAgICAgIGVycm9yLmNvZGUgPSBlci5jb2RlXG4gICAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBlcnJvcilcbiAgICAgICAgdGhpcy5hYm9ydCgpXG4gICAgICB9XG4gICAgICBicmVha1xuXG4gICAgY2FzZSAnRU5PRU5UJzogLy8gbm90IHRlcnJpYmx5IHVudXN1YWxcbiAgICBjYXNlICdFTE9PUCc6XG4gICAgY2FzZSAnRU5BTUVUT09MT05HJzpcbiAgICBjYXNlICdVTktOT1dOJzpcbiAgICAgIHRoaXMuY2FjaGVbdGhpcy5fbWFrZUFicyhmKV0gPSBmYWxzZVxuICAgICAgYnJlYWtcblxuICAgIGRlZmF1bHQ6IC8vIHNvbWUgdW51c3VhbCBlcnJvci4gIFRyZWF0IGFzIGZhaWx1cmUuXG4gICAgICB0aGlzLmNhY2hlW3RoaXMuX21ha2VBYnMoZildID0gZmFsc2VcbiAgICAgIGlmICh0aGlzLnN0cmljdCkge1xuICAgICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXIpXG4gICAgICAgIC8vIElmIHRoZSBlcnJvciBpcyBoYW5kbGVkLCB0aGVuIHdlIGFib3J0XG4gICAgICAgIC8vIGlmIG5vdCwgd2UgdGhyZXcgb3V0IG9mIGhlcmVcbiAgICAgICAgdGhpcy5hYm9ydCgpXG4gICAgICB9XG4gICAgICBpZiAoIXRoaXMuc2lsZW50KVxuICAgICAgICBjb25zb2xlLmVycm9yKCdnbG9iIGVycm9yJywgZXIpXG4gICAgICBicmVha1xuICB9XG5cbiAgcmV0dXJuIGNiKClcbn1cblxuR2xvYi5wcm90b3R5cGUuX3Byb2Nlc3NHbG9iU3RhciA9IGZ1bmN0aW9uIChwcmVmaXgsIHJlYWQsIGFicywgcmVtYWluLCBpbmRleCwgaW5HbG9iU3RhciwgY2IpIHtcbiAgdmFyIHNlbGYgPSB0aGlzXG4gIHRoaXMuX3JlYWRkaXIoYWJzLCBpbkdsb2JTdGFyLCBmdW5jdGlvbiAoZXIsIGVudHJpZXMpIHtcbiAgICBzZWxmLl9wcm9jZXNzR2xvYlN0YXIyKHByZWZpeCwgcmVhZCwgYWJzLCByZW1haW4sIGluZGV4LCBpbkdsb2JTdGFyLCBlbnRyaWVzLCBjYilcbiAgfSlcbn1cblxuXG5HbG9iLnByb3RvdHlwZS5fcHJvY2Vzc0dsb2JTdGFyMiA9IGZ1bmN0aW9uIChwcmVmaXgsIHJlYWQsIGFicywgcmVtYWluLCBpbmRleCwgaW5HbG9iU3RhciwgZW50cmllcywgY2IpIHtcbiAgLy9jb25zb2xlLmVycm9yKCdwZ3MyJywgcHJlZml4LCByZW1haW5bMF0sIGVudHJpZXMpXG5cbiAgLy8gbm8gZW50cmllcyBtZWFucyBub3QgYSBkaXIsIHNvIGl0IGNhbiBuZXZlciBoYXZlIG1hdGNoZXNcbiAgLy8gZm9vLnR4dC8qKiBkb2Vzbid0IG1hdGNoIGZvby50eHRcbiAgaWYgKCFlbnRyaWVzKVxuICAgIHJldHVybiBjYigpXG5cbiAgLy8gdGVzdCB3aXRob3V0IHRoZSBnbG9ic3RhciwgYW5kIHdpdGggZXZlcnkgY2hpbGQgYm90aCBiZWxvd1xuICAvLyBhbmQgcmVwbGFjaW5nIHRoZSBnbG9ic3Rhci5cbiAgdmFyIHJlbWFpbldpdGhvdXRHbG9iU3RhciA9IHJlbWFpbi5zbGljZSgxKVxuICB2YXIgZ3NwcmVmID0gcHJlZml4ID8gWyBwcmVmaXggXSA6IFtdXG4gIHZhciBub0dsb2JTdGFyID0gZ3NwcmVmLmNvbmNhdChyZW1haW5XaXRob3V0R2xvYlN0YXIpXG5cbiAgLy8gdGhlIG5vR2xvYlN0YXIgcGF0dGVybiBleGl0cyB0aGUgaW5HbG9iU3RhciBzdGF0ZVxuICB0aGlzLl9wcm9jZXNzKG5vR2xvYlN0YXIsIGluZGV4LCBmYWxzZSwgY2IpXG5cbiAgdmFyIGlzU3ltID0gdGhpcy5zeW1saW5rc1thYnNdXG4gIHZhciBsZW4gPSBlbnRyaWVzLmxlbmd0aFxuXG4gIC8vIElmIGl0J3MgYSBzeW1saW5rLCBhbmQgd2UncmUgaW4gYSBnbG9ic3RhciwgdGhlbiBzdG9wXG4gIGlmIChpc1N5bSAmJiBpbkdsb2JTdGFyKVxuICAgIHJldHVybiBjYigpXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIHZhciBlID0gZW50cmllc1tpXVxuICAgIGlmIChlLmNoYXJBdCgwKSA9PT0gJy4nICYmICF0aGlzLmRvdClcbiAgICAgIGNvbnRpbnVlXG5cbiAgICAvLyB0aGVzZSB0d28gY2FzZXMgZW50ZXIgdGhlIGluR2xvYlN0YXIgc3RhdGVcbiAgICB2YXIgaW5zdGVhZCA9IGdzcHJlZi5jb25jYXQoZW50cmllc1tpXSwgcmVtYWluV2l0aG91dEdsb2JTdGFyKVxuICAgIHRoaXMuX3Byb2Nlc3MoaW5zdGVhZCwgaW5kZXgsIHRydWUsIGNiKVxuXG4gICAgdmFyIGJlbG93ID0gZ3NwcmVmLmNvbmNhdChlbnRyaWVzW2ldLCByZW1haW4pXG4gICAgdGhpcy5fcHJvY2VzcyhiZWxvdywgaW5kZXgsIHRydWUsIGNiKVxuICB9XG5cbiAgY2IoKVxufVxuXG5HbG9iLnByb3RvdHlwZS5fcHJvY2Vzc1NpbXBsZSA9IGZ1bmN0aW9uIChwcmVmaXgsIGluZGV4LCBjYikge1xuICAvLyBYWFggcmV2aWV3IHRoaXMuICBTaG91bGRuJ3QgaXQgYmUgZG9pbmcgdGhlIG1vdW50aW5nIGV0Y1xuICAvLyBiZWZvcmUgZG9pbmcgc3RhdD8gIGtpbmRhIHdlaXJkP1xuICB2YXIgc2VsZiA9IHRoaXNcbiAgdGhpcy5fc3RhdChwcmVmaXgsIGZ1bmN0aW9uIChlciwgZXhpc3RzKSB7XG4gICAgc2VsZi5fcHJvY2Vzc1NpbXBsZTIocHJlZml4LCBpbmRleCwgZXIsIGV4aXN0cywgY2IpXG4gIH0pXG59XG5HbG9iLnByb3RvdHlwZS5fcHJvY2Vzc1NpbXBsZTIgPSBmdW5jdGlvbiAocHJlZml4LCBpbmRleCwgZXIsIGV4aXN0cywgY2IpIHtcblxuICAvL2NvbnNvbGUuZXJyb3IoJ3BzMicsIHByZWZpeCwgZXhpc3RzKVxuXG4gIGlmICghdGhpcy5tYXRjaGVzW2luZGV4XSlcbiAgICB0aGlzLm1hdGNoZXNbaW5kZXhdID0gT2JqZWN0LmNyZWF0ZShudWxsKVxuXG4gIC8vIElmIGl0IGRvZXNuJ3QgZXhpc3QsIHRoZW4ganVzdCBtYXJrIHRoZSBsYWNrIG9mIHJlc3VsdHNcbiAgaWYgKCFleGlzdHMpXG4gICAgcmV0dXJuIGNiKClcblxuICBpZiAocHJlZml4ICYmIGlzQWJzb2x1dGUocHJlZml4KSAmJiAhdGhpcy5ub21vdW50KSB7XG4gICAgdmFyIHRyYWlsID0gL1tcXC9cXFxcXSQvLnRlc3QocHJlZml4KVxuICAgIGlmIChwcmVmaXguY2hhckF0KDApID09PSAnLycpIHtcbiAgICAgIHByZWZpeCA9IHBhdGguam9pbih0aGlzLnJvb3QsIHByZWZpeClcbiAgICB9IGVsc2Uge1xuICAgICAgcHJlZml4ID0gcGF0aC5yZXNvbHZlKHRoaXMucm9vdCwgcHJlZml4KVxuICAgICAgaWYgKHRyYWlsKVxuICAgICAgICBwcmVmaXggKz0gJy8nXG4gICAgfVxuICB9XG5cbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpXG4gICAgcHJlZml4ID0gcHJlZml4LnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuXG4gIC8vIE1hcmsgdGhpcyBhcyBhIG1hdGNoXG4gIHRoaXMuX2VtaXRNYXRjaChpbmRleCwgcHJlZml4KVxuICBjYigpXG59XG5cbi8vIFJldHVybnMgZWl0aGVyICdESVInLCAnRklMRScsIG9yIGZhbHNlXG5HbG9iLnByb3RvdHlwZS5fc3RhdCA9IGZ1bmN0aW9uIChmLCBjYikge1xuICB2YXIgYWJzID0gdGhpcy5fbWFrZUFicyhmKVxuICB2YXIgbmVlZERpciA9IGYuc2xpY2UoLTEpID09PSAnLydcblxuICBpZiAoZi5sZW5ndGggPiB0aGlzLm1heExlbmd0aClcbiAgICByZXR1cm4gY2IoKVxuXG4gIGlmICghdGhpcy5zdGF0ICYmIG93blByb3AodGhpcy5jYWNoZSwgYWJzKSkge1xuICAgIHZhciBjID0gdGhpcy5jYWNoZVthYnNdXG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShjKSlcbiAgICAgIGMgPSAnRElSJ1xuXG4gICAgLy8gSXQgZXhpc3RzLCBidXQgbWF5YmUgbm90IGhvdyB3ZSBuZWVkIGl0XG4gICAgaWYgKCFuZWVkRGlyIHx8IGMgPT09ICdESVInKVxuICAgICAgcmV0dXJuIGNiKG51bGwsIGMpXG5cbiAgICBpZiAobmVlZERpciAmJiBjID09PSAnRklMRScpXG4gICAgICByZXR1cm4gY2IoKVxuXG4gICAgLy8gb3RoZXJ3aXNlIHdlIGhhdmUgdG8gc3RhdCwgYmVjYXVzZSBtYXliZSBjPXRydWVcbiAgICAvLyBpZiB3ZSBrbm93IGl0IGV4aXN0cywgYnV0IG5vdCB3aGF0IGl0IGlzLlxuICB9XG5cbiAgdmFyIGV4aXN0c1xuICB2YXIgc3RhdCA9IHRoaXMuc3RhdENhY2hlW2Fic11cbiAgaWYgKHN0YXQgIT09IHVuZGVmaW5lZCkge1xuICAgIGlmIChzdGF0ID09PSBmYWxzZSlcbiAgICAgIHJldHVybiBjYihudWxsLCBzdGF0KVxuICAgIGVsc2Uge1xuICAgICAgdmFyIHR5cGUgPSBzdGF0LmlzRGlyZWN0b3J5KCkgPyAnRElSJyA6ICdGSUxFJ1xuICAgICAgaWYgKG5lZWREaXIgJiYgdHlwZSA9PT0gJ0ZJTEUnKVxuICAgICAgICByZXR1cm4gY2IoKVxuICAgICAgZWxzZVxuICAgICAgICByZXR1cm4gY2IobnVsbCwgdHlwZSwgc3RhdClcbiAgICB9XG4gIH1cblxuICB2YXIgc2VsZiA9IHRoaXNcbiAgdmFyIHN0YXRjYiA9IGluZmxpZ2h0KCdzdGF0XFwwJyArIGFicywgbHN0YXRjYl8pXG4gIGlmIChzdGF0Y2IpXG4gICAgc2VsZi5mcy5sc3RhdChhYnMsIHN0YXRjYilcblxuICBmdW5jdGlvbiBsc3RhdGNiXyAoZXIsIGxzdGF0KSB7XG4gICAgaWYgKGxzdGF0ICYmIGxzdGF0LmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgIC8vIElmIGl0J3MgYSBzeW1saW5rLCB0aGVuIHRyZWF0IGl0IGFzIHRoZSB0YXJnZXQsIHVubGVzc1xuICAgICAgLy8gdGhlIHRhcmdldCBkb2VzIG5vdCBleGlzdCwgdGhlbiB0cmVhdCBpdCBhcyBhIGZpbGUuXG4gICAgICByZXR1cm4gc2VsZi5mcy5zdGF0KGFicywgZnVuY3Rpb24gKGVyLCBzdGF0KSB7XG4gICAgICAgIGlmIChlcilcbiAgICAgICAgICBzZWxmLl9zdGF0MihmLCBhYnMsIG51bGwsIGxzdGF0LCBjYilcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHNlbGYuX3N0YXQyKGYsIGFicywgZXIsIHN0YXQsIGNiKVxuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgc2VsZi5fc3RhdDIoZiwgYWJzLCBlciwgbHN0YXQsIGNiKVxuICAgIH1cbiAgfVxufVxuXG5HbG9iLnByb3RvdHlwZS5fc3RhdDIgPSBmdW5jdGlvbiAoZiwgYWJzLCBlciwgc3RhdCwgY2IpIHtcbiAgaWYgKGVyICYmIChlci5jb2RlID09PSAnRU5PRU5UJyB8fCBlci5jb2RlID09PSAnRU5PVERJUicpKSB7XG4gICAgdGhpcy5zdGF0Q2FjaGVbYWJzXSA9IGZhbHNlXG4gICAgcmV0dXJuIGNiKClcbiAgfVxuXG4gIHZhciBuZWVkRGlyID0gZi5zbGljZSgtMSkgPT09ICcvJ1xuICB0aGlzLnN0YXRDYWNoZVthYnNdID0gc3RhdFxuXG4gIGlmIChhYnMuc2xpY2UoLTEpID09PSAnLycgJiYgc3RhdCAmJiAhc3RhdC5pc0RpcmVjdG9yeSgpKVxuICAgIHJldHVybiBjYihudWxsLCBmYWxzZSwgc3RhdClcblxuICB2YXIgYyA9IHRydWVcbiAgaWYgKHN0YXQpXG4gICAgYyA9IHN0YXQuaXNEaXJlY3RvcnkoKSA/ICdESVInIDogJ0ZJTEUnXG4gIHRoaXMuY2FjaGVbYWJzXSA9IHRoaXMuY2FjaGVbYWJzXSB8fCBjXG5cbiAgaWYgKG5lZWREaXIgJiYgYyA9PT0gJ0ZJTEUnKVxuICAgIHJldHVybiBjYigpXG5cbiAgcmV0dXJuIGNiKG51bGwsIGMsIHN0YXQpXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGdsb2JTeW5jXG5nbG9iU3luYy5HbG9iU3luYyA9IEdsb2JTeW5jXG5cbnZhciBycCA9IHJlcXVpcmUoJ2ZzLnJlYWxwYXRoJylcbnZhciBtaW5pbWF0Y2ggPSByZXF1aXJlKCdtaW5pbWF0Y2gnKVxudmFyIE1pbmltYXRjaCA9IG1pbmltYXRjaC5NaW5pbWF0Y2hcbnZhciBHbG9iID0gcmVxdWlyZSgnLi9nbG9iLmpzJykuR2xvYlxudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJylcbnZhciBwYXRoID0gcmVxdWlyZSgncGF0aCcpXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JylcbnZhciBpc0Fic29sdXRlID0gcmVxdWlyZSgncGF0aC1pcy1hYnNvbHV0ZScpXG52YXIgY29tbW9uID0gcmVxdWlyZSgnLi9jb21tb24uanMnKVxudmFyIHNldG9wdHMgPSBjb21tb24uc2V0b3B0c1xudmFyIG93blByb3AgPSBjb21tb24ub3duUHJvcFxudmFyIGNoaWxkcmVuSWdub3JlZCA9IGNvbW1vbi5jaGlsZHJlbklnbm9yZWRcbnZhciBpc0lnbm9yZWQgPSBjb21tb24uaXNJZ25vcmVkXG5cbmZ1bmN0aW9uIGdsb2JTeW5jIChwYXR0ZXJuLCBvcHRpb25zKSB7XG4gIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJyB8fCBhcmd1bWVudHMubGVuZ3RoID09PSAzKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2NhbGxiYWNrIHByb3ZpZGVkIHRvIHN5bmMgZ2xvYlxcbicrXG4gICAgICAgICAgICAgICAgICAgICAgICAnU2VlOiBodHRwczovL2dpdGh1Yi5jb20vaXNhYWNzL25vZGUtZ2xvYi9pc3N1ZXMvMTY3JylcblxuICByZXR1cm4gbmV3IEdsb2JTeW5jKHBhdHRlcm4sIG9wdGlvbnMpLmZvdW5kXG59XG5cbmZ1bmN0aW9uIEdsb2JTeW5jIChwYXR0ZXJuLCBvcHRpb25zKSB7XG4gIGlmICghcGF0dGVybilcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ211c3QgcHJvdmlkZSBwYXR0ZXJuJylcblxuICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicgfHwgYXJndW1lbnRzLmxlbmd0aCA9PT0gMylcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdjYWxsYmFjayBwcm92aWRlZCB0byBzeW5jIGdsb2JcXG4nK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ1NlZTogaHR0cHM6Ly9naXRodWIuY29tL2lzYWFjcy9ub2RlLWdsb2IvaXNzdWVzLzE2NycpXG5cbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEdsb2JTeW5jKSlcbiAgICByZXR1cm4gbmV3IEdsb2JTeW5jKHBhdHRlcm4sIG9wdGlvbnMpXG5cbiAgc2V0b3B0cyh0aGlzLCBwYXR0ZXJuLCBvcHRpb25zKVxuXG4gIGlmICh0aGlzLm5vcHJvY2VzcylcbiAgICByZXR1cm4gdGhpc1xuXG4gIHZhciBuID0gdGhpcy5taW5pbWF0Y2guc2V0Lmxlbmd0aFxuICB0aGlzLm1hdGNoZXMgPSBuZXcgQXJyYXkobilcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpICsrKSB7XG4gICAgdGhpcy5fcHJvY2Vzcyh0aGlzLm1pbmltYXRjaC5zZXRbaV0sIGksIGZhbHNlKVxuICB9XG4gIHRoaXMuX2ZpbmlzaCgpXG59XG5cbkdsb2JTeW5jLnByb3RvdHlwZS5fZmluaXNoID0gZnVuY3Rpb24gKCkge1xuICBhc3NlcnQodGhpcyBpbnN0YW5jZW9mIEdsb2JTeW5jKVxuICBpZiAodGhpcy5yZWFscGF0aCkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHRoaXMubWF0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uIChtYXRjaHNldCwgaW5kZXgpIHtcbiAgICAgIHZhciBzZXQgPSBzZWxmLm1hdGNoZXNbaW5kZXhdID0gT2JqZWN0LmNyZWF0ZShudWxsKVxuICAgICAgZm9yICh2YXIgcCBpbiBtYXRjaHNldCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHAgPSBzZWxmLl9tYWtlQWJzKHApXG4gICAgICAgICAgdmFyIHJlYWwgPSBycC5yZWFscGF0aFN5bmMocCwgc2VsZi5yZWFscGF0aENhY2hlKVxuICAgICAgICAgIHNldFtyZWFsXSA9IHRydWVcbiAgICAgICAgfSBjYXRjaCAoZXIpIHtcbiAgICAgICAgICBpZiAoZXIuc3lzY2FsbCA9PT0gJ3N0YXQnKVxuICAgICAgICAgICAgc2V0W3NlbGYuX21ha2VBYnMocCldID0gdHJ1ZVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHRocm93IGVyXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9XG4gIGNvbW1vbi5maW5pc2godGhpcylcbn1cblxuXG5HbG9iU3luYy5wcm90b3R5cGUuX3Byb2Nlc3MgPSBmdW5jdGlvbiAocGF0dGVybiwgaW5kZXgsIGluR2xvYlN0YXIpIHtcbiAgYXNzZXJ0KHRoaXMgaW5zdGFuY2VvZiBHbG9iU3luYylcblxuICAvLyBHZXQgdGhlIGZpcnN0IFtuXSBwYXJ0cyBvZiBwYXR0ZXJuIHRoYXQgYXJlIGFsbCBzdHJpbmdzLlxuICB2YXIgbiA9IDBcbiAgd2hpbGUgKHR5cGVvZiBwYXR0ZXJuW25dID09PSAnc3RyaW5nJykge1xuICAgIG4gKytcbiAgfVxuICAvLyBub3cgbiBpcyB0aGUgaW5kZXggb2YgdGhlIGZpcnN0IG9uZSB0aGF0IGlzICpub3QqIGEgc3RyaW5nLlxuXG4gIC8vIFNlZSBpZiB0aGVyZSdzIGFueXRoaW5nIGVsc2VcbiAgdmFyIHByZWZpeFxuICBzd2l0Y2ggKG4pIHtcbiAgICAvLyBpZiBub3QsIHRoZW4gdGhpcyBpcyByYXRoZXIgc2ltcGxlXG4gICAgY2FzZSBwYXR0ZXJuLmxlbmd0aDpcbiAgICAgIHRoaXMuX3Byb2Nlc3NTaW1wbGUocGF0dGVybi5qb2luKCcvJyksIGluZGV4KVxuICAgICAgcmV0dXJuXG5cbiAgICBjYXNlIDA6XG4gICAgICAvLyBwYXR0ZXJuICpzdGFydHMqIHdpdGggc29tZSBub24tdHJpdmlhbCBpdGVtLlxuICAgICAgLy8gZ29pbmcgdG8gcmVhZGRpcihjd2QpLCBidXQgbm90IGluY2x1ZGUgdGhlIHByZWZpeCBpbiBtYXRjaGVzLlxuICAgICAgcHJlZml4ID0gbnVsbFxuICAgICAgYnJlYWtcblxuICAgIGRlZmF1bHQ6XG4gICAgICAvLyBwYXR0ZXJuIGhhcyBzb21lIHN0cmluZyBiaXRzIGluIHRoZSBmcm9udC5cbiAgICAgIC8vIHdoYXRldmVyIGl0IHN0YXJ0cyB3aXRoLCB3aGV0aGVyIHRoYXQncyAnYWJzb2x1dGUnIGxpa2UgL2Zvby9iYXIsXG4gICAgICAvLyBvciAncmVsYXRpdmUnIGxpa2UgJy4uL2JheidcbiAgICAgIHByZWZpeCA9IHBhdHRlcm4uc2xpY2UoMCwgbikuam9pbignLycpXG4gICAgICBicmVha1xuICB9XG5cbiAgdmFyIHJlbWFpbiA9IHBhdHRlcm4uc2xpY2UobilcblxuICAvLyBnZXQgdGhlIGxpc3Qgb2YgZW50cmllcy5cbiAgdmFyIHJlYWRcbiAgaWYgKHByZWZpeCA9PT0gbnVsbClcbiAgICByZWFkID0gJy4nXG4gIGVsc2UgaWYgKGlzQWJzb2x1dGUocHJlZml4KSB8fCBpc0Fic29sdXRlKHBhdHRlcm4uam9pbignLycpKSkge1xuICAgIGlmICghcHJlZml4IHx8ICFpc0Fic29sdXRlKHByZWZpeCkpXG4gICAgICBwcmVmaXggPSAnLycgKyBwcmVmaXhcbiAgICByZWFkID0gcHJlZml4XG4gIH0gZWxzZVxuICAgIHJlYWQgPSBwcmVmaXhcblxuICB2YXIgYWJzID0gdGhpcy5fbWFrZUFicyhyZWFkKVxuXG4gIC8vaWYgaWdub3JlZCwgc2tpcCBwcm9jZXNzaW5nXG4gIGlmIChjaGlsZHJlbklnbm9yZWQodGhpcywgcmVhZCkpXG4gICAgcmV0dXJuXG5cbiAgdmFyIGlzR2xvYlN0YXIgPSByZW1haW5bMF0gPT09IG1pbmltYXRjaC5HTE9CU1RBUlxuICBpZiAoaXNHbG9iU3RhcilcbiAgICB0aGlzLl9wcm9jZXNzR2xvYlN0YXIocHJlZml4LCByZWFkLCBhYnMsIHJlbWFpbiwgaW5kZXgsIGluR2xvYlN0YXIpXG4gIGVsc2VcbiAgICB0aGlzLl9wcm9jZXNzUmVhZGRpcihwcmVmaXgsIHJlYWQsIGFicywgcmVtYWluLCBpbmRleCwgaW5HbG9iU3Rhcilcbn1cblxuXG5HbG9iU3luYy5wcm90b3R5cGUuX3Byb2Nlc3NSZWFkZGlyID0gZnVuY3Rpb24gKHByZWZpeCwgcmVhZCwgYWJzLCByZW1haW4sIGluZGV4LCBpbkdsb2JTdGFyKSB7XG4gIHZhciBlbnRyaWVzID0gdGhpcy5fcmVhZGRpcihhYnMsIGluR2xvYlN0YXIpXG5cbiAgLy8gaWYgdGhlIGFicyBpc24ndCBhIGRpciwgdGhlbiBub3RoaW5nIGNhbiBtYXRjaCFcbiAgaWYgKCFlbnRyaWVzKVxuICAgIHJldHVyblxuXG4gIC8vIEl0IHdpbGwgb25seSBtYXRjaCBkb3QgZW50cmllcyBpZiBpdCBzdGFydHMgd2l0aCBhIGRvdCwgb3IgaWZcbiAgLy8gZG90IGlzIHNldC4gIFN0dWZmIGxpa2UgQCguZm9vfC5iYXIpIGlzbid0IGFsbG93ZWQuXG4gIHZhciBwbiA9IHJlbWFpblswXVxuICB2YXIgbmVnYXRlID0gISF0aGlzLm1pbmltYXRjaC5uZWdhdGVcbiAgdmFyIHJhd0dsb2IgPSBwbi5fZ2xvYlxuICB2YXIgZG90T2sgPSB0aGlzLmRvdCB8fCByYXdHbG9iLmNoYXJBdCgwKSA9PT0gJy4nXG5cbiAgdmFyIG1hdGNoZWRFbnRyaWVzID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbnRyaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGUgPSBlbnRyaWVzW2ldXG4gICAgaWYgKGUuY2hhckF0KDApICE9PSAnLicgfHwgZG90T2spIHtcbiAgICAgIHZhciBtXG4gICAgICBpZiAobmVnYXRlICYmICFwcmVmaXgpIHtcbiAgICAgICAgbSA9ICFlLm1hdGNoKHBuKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbSA9IGUubWF0Y2gocG4pXG4gICAgICB9XG4gICAgICBpZiAobSlcbiAgICAgICAgbWF0Y2hlZEVudHJpZXMucHVzaChlKVxuICAgIH1cbiAgfVxuXG4gIHZhciBsZW4gPSBtYXRjaGVkRW50cmllcy5sZW5ndGhcbiAgLy8gSWYgdGhlcmUgYXJlIG5vIG1hdGNoZWQgZW50cmllcywgdGhlbiBub3RoaW5nIG1hdGNoZXMuXG4gIGlmIChsZW4gPT09IDApXG4gICAgcmV0dXJuXG5cbiAgLy8gaWYgdGhpcyBpcyB0aGUgbGFzdCByZW1haW5pbmcgcGF0dGVybiBiaXQsIHRoZW4gbm8gbmVlZCBmb3JcbiAgLy8gYW4gYWRkaXRpb25hbCBzdGF0ICp1bmxlc3MqIHRoZSB1c2VyIGhhcyBzcGVjaWZpZWQgbWFyayBvclxuICAvLyBzdGF0IGV4cGxpY2l0bHkuICBXZSBrbm93IHRoZXkgZXhpc3QsIHNpbmNlIHJlYWRkaXIgcmV0dXJuZWRcbiAgLy8gdGhlbS5cblxuICBpZiAocmVtYWluLmxlbmd0aCA9PT0gMSAmJiAhdGhpcy5tYXJrICYmICF0aGlzLnN0YXQpIHtcbiAgICBpZiAoIXRoaXMubWF0Y2hlc1tpbmRleF0pXG4gICAgICB0aGlzLm1hdGNoZXNbaW5kZXhdID0gT2JqZWN0LmNyZWF0ZShudWxsKVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKyspIHtcbiAgICAgIHZhciBlID0gbWF0Y2hlZEVudHJpZXNbaV1cbiAgICAgIGlmIChwcmVmaXgpIHtcbiAgICAgICAgaWYgKHByZWZpeC5zbGljZSgtMSkgIT09ICcvJylcbiAgICAgICAgICBlID0gcHJlZml4ICsgJy8nICsgZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgZSA9IHByZWZpeCArIGVcbiAgICAgIH1cblxuICAgICAgaWYgKGUuY2hhckF0KDApID09PSAnLycgJiYgIXRoaXMubm9tb3VudCkge1xuICAgICAgICBlID0gcGF0aC5qb2luKHRoaXMucm9vdCwgZSlcbiAgICAgIH1cbiAgICAgIHRoaXMuX2VtaXRNYXRjaChpbmRleCwgZSlcbiAgICB9XG4gICAgLy8gVGhpcyB3YXMgdGhlIGxhc3Qgb25lLCBhbmQgbm8gc3RhdHMgd2VyZSBuZWVkZWRcbiAgICByZXR1cm5cbiAgfVxuXG4gIC8vIG5vdyB0ZXN0IGFsbCBtYXRjaGVkIGVudHJpZXMgYXMgc3RhbmQtaW5zIGZvciB0aGF0IHBhcnRcbiAgLy8gb2YgdGhlIHBhdHRlcm4uXG4gIHJlbWFpbi5zaGlmdCgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICsrKSB7XG4gICAgdmFyIGUgPSBtYXRjaGVkRW50cmllc1tpXVxuICAgIHZhciBuZXdQYXR0ZXJuXG4gICAgaWYgKHByZWZpeClcbiAgICAgIG5ld1BhdHRlcm4gPSBbcHJlZml4LCBlXVxuICAgIGVsc2VcbiAgICAgIG5ld1BhdHRlcm4gPSBbZV1cbiAgICB0aGlzLl9wcm9jZXNzKG5ld1BhdHRlcm4uY29uY2F0KHJlbWFpbiksIGluZGV4LCBpbkdsb2JTdGFyKVxuICB9XG59XG5cblxuR2xvYlN5bmMucHJvdG90eXBlLl9lbWl0TWF0Y2ggPSBmdW5jdGlvbiAoaW5kZXgsIGUpIHtcbiAgaWYgKGlzSWdub3JlZCh0aGlzLCBlKSlcbiAgICByZXR1cm5cblxuICB2YXIgYWJzID0gdGhpcy5fbWFrZUFicyhlKVxuXG4gIGlmICh0aGlzLm1hcmspXG4gICAgZSA9IHRoaXMuX21hcmsoZSlcblxuICBpZiAodGhpcy5hYnNvbHV0ZSkge1xuICAgIGUgPSBhYnNcbiAgfVxuXG4gIGlmICh0aGlzLm1hdGNoZXNbaW5kZXhdW2VdKVxuICAgIHJldHVyblxuXG4gIGlmICh0aGlzLm5vZGlyKSB7XG4gICAgdmFyIGMgPSB0aGlzLmNhY2hlW2Fic11cbiAgICBpZiAoYyA9PT0gJ0RJUicgfHwgQXJyYXkuaXNBcnJheShjKSlcbiAgICAgIHJldHVyblxuICB9XG5cbiAgdGhpcy5tYXRjaGVzW2luZGV4XVtlXSA9IHRydWVcblxuICBpZiAodGhpcy5zdGF0KVxuICAgIHRoaXMuX3N0YXQoZSlcbn1cblxuXG5HbG9iU3luYy5wcm90b3R5cGUuX3JlYWRkaXJJbkdsb2JTdGFyID0gZnVuY3Rpb24gKGFicykge1xuICAvLyBmb2xsb3cgYWxsIHN5bWxpbmtlZCBkaXJlY3RvcmllcyBmb3JldmVyXG4gIC8vIGp1c3QgcHJvY2VlZCBhcyBpZiB0aGlzIGlzIGEgbm9uLWdsb2JzdGFyIHNpdHVhdGlvblxuICBpZiAodGhpcy5mb2xsb3cpXG4gICAgcmV0dXJuIHRoaXMuX3JlYWRkaXIoYWJzLCBmYWxzZSlcblxuICB2YXIgZW50cmllc1xuICB2YXIgbHN0YXRcbiAgdmFyIHN0YXRcbiAgdHJ5IHtcbiAgICBsc3RhdCA9IHRoaXMuZnMubHN0YXRTeW5jKGFicylcbiAgfSBjYXRjaCAoZXIpIHtcbiAgICBpZiAoZXIuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgIC8vIGxzdGF0IGZhaWxlZCwgZG9lc24ndCBleGlzdFxuICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG4gIH1cblxuICB2YXIgaXNTeW0gPSBsc3RhdCAmJiBsc3RhdC5pc1N5bWJvbGljTGluaygpXG4gIHRoaXMuc3ltbGlua3NbYWJzXSA9IGlzU3ltXG5cbiAgLy8gSWYgaXQncyBub3QgYSBzeW1saW5rIG9yIGEgZGlyLCB0aGVuIGl0J3MgZGVmaW5pdGVseSBhIHJlZ3VsYXIgZmlsZS5cbiAgLy8gZG9uJ3QgYm90aGVyIGRvaW5nIGEgcmVhZGRpciBpbiB0aGF0IGNhc2UuXG4gIGlmICghaXNTeW0gJiYgbHN0YXQgJiYgIWxzdGF0LmlzRGlyZWN0b3J5KCkpXG4gICAgdGhpcy5jYWNoZVthYnNdID0gJ0ZJTEUnXG4gIGVsc2VcbiAgICBlbnRyaWVzID0gdGhpcy5fcmVhZGRpcihhYnMsIGZhbHNlKVxuXG4gIHJldHVybiBlbnRyaWVzXG59XG5cbkdsb2JTeW5jLnByb3RvdHlwZS5fcmVhZGRpciA9IGZ1bmN0aW9uIChhYnMsIGluR2xvYlN0YXIpIHtcbiAgdmFyIGVudHJpZXNcblxuICBpZiAoaW5HbG9iU3RhciAmJiAhb3duUHJvcCh0aGlzLnN5bWxpbmtzLCBhYnMpKVxuICAgIHJldHVybiB0aGlzLl9yZWFkZGlySW5HbG9iU3RhcihhYnMpXG5cbiAgaWYgKG93blByb3AodGhpcy5jYWNoZSwgYWJzKSkge1xuICAgIHZhciBjID0gdGhpcy5jYWNoZVthYnNdXG4gICAgaWYgKCFjIHx8IGMgPT09ICdGSUxFJylcbiAgICAgIHJldHVybiBudWxsXG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShjKSlcbiAgICAgIHJldHVybiBjXG4gIH1cblxuICB0cnkge1xuICAgIHJldHVybiB0aGlzLl9yZWFkZGlyRW50cmllcyhhYnMsIHRoaXMuZnMucmVhZGRpclN5bmMoYWJzKSlcbiAgfSBjYXRjaCAoZXIpIHtcbiAgICB0aGlzLl9yZWFkZGlyRXJyb3IoYWJzLCBlcilcbiAgICByZXR1cm4gbnVsbFxuICB9XG59XG5cbkdsb2JTeW5jLnByb3RvdHlwZS5fcmVhZGRpckVudHJpZXMgPSBmdW5jdGlvbiAoYWJzLCBlbnRyaWVzKSB7XG4gIC8vIGlmIHdlIGhhdmVuJ3QgYXNrZWQgdG8gc3RhdCBldmVyeXRoaW5nLCB0aGVuIGp1c3RcbiAgLy8gYXNzdW1lIHRoYXQgZXZlcnl0aGluZyBpbiB0aGVyZSBleGlzdHMsIHNvIHdlIGNhbiBhdm9pZFxuICAvLyBoYXZpbmcgdG8gc3RhdCBpdCBhIHNlY29uZCB0aW1lLlxuICBpZiAoIXRoaXMubWFyayAmJiAhdGhpcy5zdGF0KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbnRyaWVzLmxlbmd0aDsgaSArKykge1xuICAgICAgdmFyIGUgPSBlbnRyaWVzW2ldXG4gICAgICBpZiAoYWJzID09PSAnLycpXG4gICAgICAgIGUgPSBhYnMgKyBlXG4gICAgICBlbHNlXG4gICAgICAgIGUgPSBhYnMgKyAnLycgKyBlXG4gICAgICB0aGlzLmNhY2hlW2VdID0gdHJ1ZVxuICAgIH1cbiAgfVxuXG4gIHRoaXMuY2FjaGVbYWJzXSA9IGVudHJpZXNcblxuICAvLyBtYXJrIGFuZCBjYWNoZSBkaXItbmVzc1xuICByZXR1cm4gZW50cmllc1xufVxuXG5HbG9iU3luYy5wcm90b3R5cGUuX3JlYWRkaXJFcnJvciA9IGZ1bmN0aW9uIChmLCBlcikge1xuICAvLyBoYW5kbGUgZXJyb3JzLCBhbmQgY2FjaGUgdGhlIGluZm9ybWF0aW9uXG4gIHN3aXRjaCAoZXIuY29kZSkge1xuICAgIGNhc2UgJ0VOT1RTVVAnOiAvLyBodHRwczovL2dpdGh1Yi5jb20vaXNhYWNzL25vZGUtZ2xvYi9pc3N1ZXMvMjA1XG4gICAgY2FzZSAnRU5PVERJUic6IC8vIHRvdGFsbHkgbm9ybWFsLiBtZWFucyBpdCAqZG9lcyogZXhpc3QuXG4gICAgICB2YXIgYWJzID0gdGhpcy5fbWFrZUFicyhmKVxuICAgICAgdGhpcy5jYWNoZVthYnNdID0gJ0ZJTEUnXG4gICAgICBpZiAoYWJzID09PSB0aGlzLmN3ZEFicykge1xuICAgICAgICB2YXIgZXJyb3IgPSBuZXcgRXJyb3IoZXIuY29kZSArICcgaW52YWxpZCBjd2QgJyArIHRoaXMuY3dkKVxuICAgICAgICBlcnJvci5wYXRoID0gdGhpcy5jd2RcbiAgICAgICAgZXJyb3IuY29kZSA9IGVyLmNvZGVcbiAgICAgICAgdGhyb3cgZXJyb3JcbiAgICAgIH1cbiAgICAgIGJyZWFrXG5cbiAgICBjYXNlICdFTk9FTlQnOiAvLyBub3QgdGVycmlibHkgdW51c3VhbFxuICAgIGNhc2UgJ0VMT09QJzpcbiAgICBjYXNlICdFTkFNRVRPT0xPTkcnOlxuICAgIGNhc2UgJ1VOS05PV04nOlxuICAgICAgdGhpcy5jYWNoZVt0aGlzLl9tYWtlQWJzKGYpXSA9IGZhbHNlXG4gICAgICBicmVha1xuXG4gICAgZGVmYXVsdDogLy8gc29tZSB1bnVzdWFsIGVycm9yLiAgVHJlYXQgYXMgZmFpbHVyZS5cbiAgICAgIHRoaXMuY2FjaGVbdGhpcy5fbWFrZUFicyhmKV0gPSBmYWxzZVxuICAgICAgaWYgKHRoaXMuc3RyaWN0KVxuICAgICAgICB0aHJvdyBlclxuICAgICAgaWYgKCF0aGlzLnNpbGVudClcbiAgICAgICAgY29uc29sZS5lcnJvcignZ2xvYiBlcnJvcicsIGVyKVxuICAgICAgYnJlYWtcbiAgfVxufVxuXG5HbG9iU3luYy5wcm90b3R5cGUuX3Byb2Nlc3NHbG9iU3RhciA9IGZ1bmN0aW9uIChwcmVmaXgsIHJlYWQsIGFicywgcmVtYWluLCBpbmRleCwgaW5HbG9iU3Rhcikge1xuXG4gIHZhciBlbnRyaWVzID0gdGhpcy5fcmVhZGRpcihhYnMsIGluR2xvYlN0YXIpXG5cbiAgLy8gbm8gZW50cmllcyBtZWFucyBub3QgYSBkaXIsIHNvIGl0IGNhbiBuZXZlciBoYXZlIG1hdGNoZXNcbiAgLy8gZm9vLnR4dC8qKiBkb2Vzbid0IG1hdGNoIGZvby50eHRcbiAgaWYgKCFlbnRyaWVzKVxuICAgIHJldHVyblxuXG4gIC8vIHRlc3Qgd2l0aG91dCB0aGUgZ2xvYnN0YXIsIGFuZCB3aXRoIGV2ZXJ5IGNoaWxkIGJvdGggYmVsb3dcbiAgLy8gYW5kIHJlcGxhY2luZyB0aGUgZ2xvYnN0YXIuXG4gIHZhciByZW1haW5XaXRob3V0R2xvYlN0YXIgPSByZW1haW4uc2xpY2UoMSlcbiAgdmFyIGdzcHJlZiA9IHByZWZpeCA/IFsgcHJlZml4IF0gOiBbXVxuICB2YXIgbm9HbG9iU3RhciA9IGdzcHJlZi5jb25jYXQocmVtYWluV2l0aG91dEdsb2JTdGFyKVxuXG4gIC8vIHRoZSBub0dsb2JTdGFyIHBhdHRlcm4gZXhpdHMgdGhlIGluR2xvYlN0YXIgc3RhdGVcbiAgdGhpcy5fcHJvY2Vzcyhub0dsb2JTdGFyLCBpbmRleCwgZmFsc2UpXG5cbiAgdmFyIGxlbiA9IGVudHJpZXMubGVuZ3RoXG4gIHZhciBpc1N5bSA9IHRoaXMuc3ltbGlua3NbYWJzXVxuXG4gIC8vIElmIGl0J3MgYSBzeW1saW5rLCBhbmQgd2UncmUgaW4gYSBnbG9ic3RhciwgdGhlbiBzdG9wXG4gIGlmIChpc1N5bSAmJiBpbkdsb2JTdGFyKVxuICAgIHJldHVyblxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICB2YXIgZSA9IGVudHJpZXNbaV1cbiAgICBpZiAoZS5jaGFyQXQoMCkgPT09ICcuJyAmJiAhdGhpcy5kb3QpXG4gICAgICBjb250aW51ZVxuXG4gICAgLy8gdGhlc2UgdHdvIGNhc2VzIGVudGVyIHRoZSBpbkdsb2JTdGFyIHN0YXRlXG4gICAgdmFyIGluc3RlYWQgPSBnc3ByZWYuY29uY2F0KGVudHJpZXNbaV0sIHJlbWFpbldpdGhvdXRHbG9iU3RhcilcbiAgICB0aGlzLl9wcm9jZXNzKGluc3RlYWQsIGluZGV4LCB0cnVlKVxuXG4gICAgdmFyIGJlbG93ID0gZ3NwcmVmLmNvbmNhdChlbnRyaWVzW2ldLCByZW1haW4pXG4gICAgdGhpcy5fcHJvY2VzcyhiZWxvdywgaW5kZXgsIHRydWUpXG4gIH1cbn1cblxuR2xvYlN5bmMucHJvdG90eXBlLl9wcm9jZXNzU2ltcGxlID0gZnVuY3Rpb24gKHByZWZpeCwgaW5kZXgpIHtcbiAgLy8gWFhYIHJldmlldyB0aGlzLiAgU2hvdWxkbid0IGl0IGJlIGRvaW5nIHRoZSBtb3VudGluZyBldGNcbiAgLy8gYmVmb3JlIGRvaW5nIHN0YXQ/ICBraW5kYSB3ZWlyZD9cbiAgdmFyIGV4aXN0cyA9IHRoaXMuX3N0YXQocHJlZml4KVxuXG4gIGlmICghdGhpcy5tYXRjaGVzW2luZGV4XSlcbiAgICB0aGlzLm1hdGNoZXNbaW5kZXhdID0gT2JqZWN0LmNyZWF0ZShudWxsKVxuXG4gIC8vIElmIGl0IGRvZXNuJ3QgZXhpc3QsIHRoZW4ganVzdCBtYXJrIHRoZSBsYWNrIG9mIHJlc3VsdHNcbiAgaWYgKCFleGlzdHMpXG4gICAgcmV0dXJuXG5cbiAgaWYgKHByZWZpeCAmJiBpc0Fic29sdXRlKHByZWZpeCkgJiYgIXRoaXMubm9tb3VudCkge1xuICAgIHZhciB0cmFpbCA9IC9bXFwvXFxcXF0kLy50ZXN0KHByZWZpeClcbiAgICBpZiAocHJlZml4LmNoYXJBdCgwKSA9PT0gJy8nKSB7XG4gICAgICBwcmVmaXggPSBwYXRoLmpvaW4odGhpcy5yb290LCBwcmVmaXgpXG4gICAgfSBlbHNlIHtcbiAgICAgIHByZWZpeCA9IHBhdGgucmVzb2x2ZSh0aGlzLnJvb3QsIHByZWZpeClcbiAgICAgIGlmICh0cmFpbClcbiAgICAgICAgcHJlZml4ICs9ICcvJ1xuICAgIH1cbiAgfVxuXG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInKVxuICAgIHByZWZpeCA9IHByZWZpeC5yZXBsYWNlKC9cXFxcL2csICcvJylcblxuICAvLyBNYXJrIHRoaXMgYXMgYSBtYXRjaFxuICB0aGlzLl9lbWl0TWF0Y2goaW5kZXgsIHByZWZpeClcbn1cblxuLy8gUmV0dXJucyBlaXRoZXIgJ0RJUicsICdGSUxFJywgb3IgZmFsc2Vcbkdsb2JTeW5jLnByb3RvdHlwZS5fc3RhdCA9IGZ1bmN0aW9uIChmKSB7XG4gIHZhciBhYnMgPSB0aGlzLl9tYWtlQWJzKGYpXG4gIHZhciBuZWVkRGlyID0gZi5zbGljZSgtMSkgPT09ICcvJ1xuXG4gIGlmIChmLmxlbmd0aCA+IHRoaXMubWF4TGVuZ3RoKVxuICAgIHJldHVybiBmYWxzZVxuXG4gIGlmICghdGhpcy5zdGF0ICYmIG93blByb3AodGhpcy5jYWNoZSwgYWJzKSkge1xuICAgIHZhciBjID0gdGhpcy5jYWNoZVthYnNdXG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShjKSlcbiAgICAgIGMgPSAnRElSJ1xuXG4gICAgLy8gSXQgZXhpc3RzLCBidXQgbWF5YmUgbm90IGhvdyB3ZSBuZWVkIGl0XG4gICAgaWYgKCFuZWVkRGlyIHx8IGMgPT09ICdESVInKVxuICAgICAgcmV0dXJuIGNcblxuICAgIGlmIChuZWVkRGlyICYmIGMgPT09ICdGSUxFJylcbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgLy8gb3RoZXJ3aXNlIHdlIGhhdmUgdG8gc3RhdCwgYmVjYXVzZSBtYXliZSBjPXRydWVcbiAgICAvLyBpZiB3ZSBrbm93IGl0IGV4aXN0cywgYnV0IG5vdCB3aGF0IGl0IGlzLlxuICB9XG5cbiAgdmFyIGV4aXN0c1xuICB2YXIgc3RhdCA9IHRoaXMuc3RhdENhY2hlW2Fic11cbiAgaWYgKCFzdGF0KSB7XG4gICAgdmFyIGxzdGF0XG4gICAgdHJ5IHtcbiAgICAgIGxzdGF0ID0gdGhpcy5mcy5sc3RhdFN5bmMoYWJzKVxuICAgIH0gY2F0Y2ggKGVyKSB7XG4gICAgICBpZiAoZXIgJiYgKGVyLmNvZGUgPT09ICdFTk9FTlQnIHx8IGVyLmNvZGUgPT09ICdFTk9URElSJykpIHtcbiAgICAgICAgdGhpcy5zdGF0Q2FjaGVbYWJzXSA9IGZhbHNlXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChsc3RhdCAmJiBsc3RhdC5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBzdGF0ID0gdGhpcy5mcy5zdGF0U3luYyhhYnMpXG4gICAgICB9IGNhdGNoIChlcikge1xuICAgICAgICBzdGF0ID0gbHN0YXRcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RhdCA9IGxzdGF0XG4gICAgfVxuICB9XG5cbiAgdGhpcy5zdGF0Q2FjaGVbYWJzXSA9IHN0YXRcblxuICB2YXIgYyA9IHRydWVcbiAgaWYgKHN0YXQpXG4gICAgYyA9IHN0YXQuaXNEaXJlY3RvcnkoKSA/ICdESVInIDogJ0ZJTEUnXG5cbiAgdGhpcy5jYWNoZVthYnNdID0gdGhpcy5jYWNoZVthYnNdIHx8IGNcblxuICBpZiAobmVlZERpciAmJiBjID09PSAnRklMRScpXG4gICAgcmV0dXJuIGZhbHNlXG5cbiAgcmV0dXJuIGNcbn1cblxuR2xvYlN5bmMucHJvdG90eXBlLl9tYXJrID0gZnVuY3Rpb24gKHApIHtcbiAgcmV0dXJuIGNvbW1vbi5tYXJrKHRoaXMsIHApXG59XG5cbkdsb2JTeW5jLnByb3RvdHlwZS5fbWFrZUFicyA9IGZ1bmN0aW9uIChmKSB7XG4gIHJldHVybiBjb21tb24ubWFrZUFicyh0aGlzLCBmKVxufVxuIiwidmFyIHdyYXBweSA9IHJlcXVpcmUoJ3dyYXBweScpXG52YXIgcmVxcyA9IE9iamVjdC5jcmVhdGUobnVsbClcbnZhciBvbmNlID0gcmVxdWlyZSgnb25jZScpXG5cbm1vZHVsZS5leHBvcnRzID0gd3JhcHB5KGluZmxpZ2h0KVxuXG5mdW5jdGlvbiBpbmZsaWdodCAoa2V5LCBjYikge1xuICBpZiAocmVxc1trZXldKSB7XG4gICAgcmVxc1trZXldLnB1c2goY2IpXG4gICAgcmV0dXJuIG51bGxcbiAgfSBlbHNlIHtcbiAgICByZXFzW2tleV0gPSBbY2JdXG4gICAgcmV0dXJuIG1ha2VyZXMoa2V5KVxuICB9XG59XG5cbmZ1bmN0aW9uIG1ha2VyZXMgKGtleSkge1xuICByZXR1cm4gb25jZShmdW5jdGlvbiBSRVMgKCkge1xuICAgIHZhciBjYnMgPSByZXFzW2tleV1cbiAgICB2YXIgbGVuID0gY2JzLmxlbmd0aFxuICAgIHZhciBhcmdzID0gc2xpY2UoYXJndW1lbnRzKVxuXG4gICAgLy8gWFhYIEl0J3Mgc29tZXdoYXQgYW1iaWd1b3VzIHdoZXRoZXIgYSBuZXcgY2FsbGJhY2sgYWRkZWQgaW4gdGhpc1xuICAgIC8vIHBhc3Mgc2hvdWxkIGJlIHF1ZXVlZCBmb3IgbGF0ZXIgZXhlY3V0aW9uIGlmIHNvbWV0aGluZyBpbiB0aGVcbiAgICAvLyBsaXN0IG9mIGNhbGxiYWNrcyB0aHJvd3MsIG9yIGlmIGl0IHNob3VsZCBqdXN0IGJlIGRpc2NhcmRlZC5cbiAgICAvLyBIb3dldmVyLCBpdCdzIHN1Y2ggYW4gZWRnZSBjYXNlIHRoYXQgaXQgaGFyZGx5IG1hdHRlcnMsIGFuZCBlaXRoZXJcbiAgICAvLyBjaG9pY2UgaXMgbGlrZWx5IGFzIHN1cnByaXNpbmcgYXMgdGhlIG90aGVyLlxuICAgIC8vIEFzIGl0IGhhcHBlbnMsIHdlIGRvIGdvIGFoZWFkIGFuZCBzY2hlZHVsZSBpdCBmb3IgbGF0ZXIgZXhlY3V0aW9uLlxuICAgIHRyeSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGNic1tpXS5hcHBseShudWxsLCBhcmdzKVxuICAgICAgfVxuICAgIH0gZmluYWxseSB7XG4gICAgICBpZiAoY2JzLmxlbmd0aCA+IGxlbikge1xuICAgICAgICAvLyBhZGRlZCBtb3JlIGluIHRoZSBpbnRlcmltLlxuICAgICAgICAvLyBkZS16YWxnbywganVzdCBpbiBjYXNlLCBidXQgZG9uJ3QgY2FsbCBhZ2Fpbi5cbiAgICAgICAgY2JzLnNwbGljZSgwLCBsZW4pXG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgIFJFUy5hcHBseShudWxsLCBhcmdzKVxuICAgICAgICB9KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVsZXRlIHJlcXNba2V5XVxuICAgICAgfVxuICAgIH1cbiAgfSlcbn1cblxuZnVuY3Rpb24gc2xpY2UgKGFyZ3MpIHtcbiAgdmFyIGxlbmd0aCA9IGFyZ3MubGVuZ3RoXG4gIHZhciBhcnJheSA9IFtdXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykgYXJyYXlbaV0gPSBhcmdzW2ldXG4gIHJldHVybiBhcnJheVxufVxuIiwidHJ5IHtcbiAgdmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gIGlmICh0eXBlb2YgdXRpbC5pbmhlcml0cyAhPT0gJ2Z1bmN0aW9uJykgdGhyb3cgJyc7XG4gIG1vZHVsZS5leHBvcnRzID0gdXRpbC5pbmhlcml0cztcbn0gY2F0Y2ggKGUpIHtcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2luaGVyaXRzX2Jyb3dzZXIuanMnKTtcbn1cbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGlmIChzdXBlckN0b3IpIHtcbiAgICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgaWYgKHN1cGVyQ3Rvcikge1xuICAgICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgICB9XG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoYXJyKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyKSA9PSAnW29iamVjdCBBcnJheV0nO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBNYXRjaDtcblxudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJ3N0cmVhbScpLlRyYW5zZm9ybTtcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJ1dGlsXCIpLmluaGVyaXRzO1xudmFyIEJ1ZmZlcnMgPSByZXF1aXJlKCdidWZmZXJzJyk7XG5cbmlmICghVHJhbnNmb3JtKSB7XG4gIFRyYW5zZm9ybSA9IHJlcXVpcmUoJ3JlYWRhYmxlLXN0cmVhbS90cmFuc2Zvcm0nKTtcbn1cblxuaW5oZXJpdHMoTWF0Y2gsIFRyYW5zZm9ybSk7XG5cbmZ1bmN0aW9uIE1hdGNoKG9wdHMsIG1hdGNoRm4pIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIE1hdGNoKSkge1xuICAgIHJldHVybiBuZXcgTWF0Y2gob3B0cywgbWF0Y2hGbik7XG4gIH1cblxuICAvL3RvZG8gLSBiZXR0ZXIgaGFuZGxlIG9wdHMgZS5nLiBwYXR0ZXJuLmxlbmd0aCBjYW4ndCBiZSA+IGhpZ2hXYXRlck1hcmtcbiAgdGhpcy5fb3B0cyA9IG9wdHM7XG4gIGlmICh0eXBlb2YgdGhpcy5fb3B0cy5wYXR0ZXJuID09PSBcInN0cmluZ1wiKSB7XG4gICAgdGhpcy5fb3B0cy5wYXR0ZXJuID0gbmV3IEJ1ZmZlcih0aGlzLl9vcHRzLnBhdHRlcm4pO1xuICB9XG4gIHRoaXMuX21hdGNoRm4gPSBtYXRjaEZuO1xuICB0aGlzLl9idWZzID0gQnVmZmVycygpO1xuXG4gIFRyYW5zZm9ybS5jYWxsKHRoaXMpO1xufVxuXG5NYXRjaC5wcm90b3R5cGUuX3RyYW5zZm9ybSA9IGZ1bmN0aW9uIChjaHVuaywgZW5jb2RpbmcsIGNhbGxiYWNrKSB7XG4gIHZhciBwYXR0ZXJuID0gdGhpcy5fb3B0cy5wYXR0ZXJuO1xuICB0aGlzLl9idWZzLnB1c2goY2h1bmspO1xuXG4gIHZhciBpbmRleCA9IHRoaXMuX2J1ZnMuaW5kZXhPZihwYXR0ZXJuKTtcbiAgaWYgKGluZGV4ID49IDApIHtcbiAgICBwcm9jZXNzTWF0Y2hlcy5jYWxsKHRoaXMsIGluZGV4LCBwYXR0ZXJuLCBjYWxsYmFjayk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGJ1ZiA9IHRoaXMuX2J1ZnMuc3BsaWNlKDAsIHRoaXMuX2J1ZnMubGVuZ3RoIC0gY2h1bmsubGVuZ3RoKTtcbiAgICBpZiAoYnVmICYmIGJ1Zi5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLl9tYXRjaEZuKGJ1Zi50b0J1ZmZlcigpKTtcbiAgICB9XG4gICAgY2FsbGJhY2soKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gcHJvY2Vzc01hdGNoZXMoaW5kZXgsIHBhdHRlcm4sIGNhbGxiYWNrKSB7XG4gIHZhciBidWYgPSB0aGlzLl9idWZzLnNwbGljZSgwLCBpbmRleCkudG9CdWZmZXIoKTtcbiAgaWYgKHRoaXMuX29wdHMuY29uc3VtZSkge1xuICAgIHRoaXMuX2J1ZnMuc3BsaWNlKDAsIHBhdHRlcm4ubGVuZ3RoKTtcbiAgfVxuICB0aGlzLl9tYXRjaEZuKGJ1ZiwgcGF0dGVybiwgdGhpcy5fYnVmcy50b0J1ZmZlcigpKTtcblxuICBpbmRleCA9IHRoaXMuX2J1ZnMuaW5kZXhPZihwYXR0ZXJuKTtcbiAgaWYgKGluZGV4ID4gMCB8fCB0aGlzLl9vcHRzLmNvbnN1bWUgJiYgaW5kZXggPT09IDApIHtcbiAgICBwcm9jZXNzLm5leHRUaWNrKHByb2Nlc3NNYXRjaGVzLmJpbmQodGhpcywgaW5kZXgsIHBhdHRlcm4sIGNhbGxiYWNrKSk7XG4gIH0gZWxzZSB7XG4gICAgY2FsbGJhY2soKTtcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBtaW5pbWF0Y2hcbm1pbmltYXRjaC5NaW5pbWF0Y2ggPSBNaW5pbWF0Y2hcblxudmFyIHBhdGggPSB7IHNlcDogJy8nIH1cbnRyeSB7XG4gIHBhdGggPSByZXF1aXJlKCdwYXRoJylcbn0gY2F0Y2ggKGVyKSB7fVxuXG52YXIgR0xPQlNUQVIgPSBtaW5pbWF0Y2guR0xPQlNUQVIgPSBNaW5pbWF0Y2guR0xPQlNUQVIgPSB7fVxudmFyIGV4cGFuZCA9IHJlcXVpcmUoJ2JyYWNlLWV4cGFuc2lvbicpXG5cbnZhciBwbFR5cGVzID0ge1xuICAnISc6IHsgb3BlbjogJyg/Oig/ISg/OicsIGNsb3NlOiAnKSlbXi9dKj8pJ30sXG4gICc/JzogeyBvcGVuOiAnKD86JywgY2xvc2U6ICcpPycgfSxcbiAgJysnOiB7IG9wZW46ICcoPzonLCBjbG9zZTogJykrJyB9LFxuICAnKic6IHsgb3BlbjogJyg/OicsIGNsb3NlOiAnKSonIH0sXG4gICdAJzogeyBvcGVuOiAnKD86JywgY2xvc2U6ICcpJyB9XG59XG5cbi8vIGFueSBzaW5nbGUgdGhpbmcgb3RoZXIgdGhhbiAvXG4vLyBkb24ndCBuZWVkIHRvIGVzY2FwZSAvIHdoZW4gdXNpbmcgbmV3IFJlZ0V4cCgpXG52YXIgcW1hcmsgPSAnW14vXSdcblxuLy8gKiA9PiBhbnkgbnVtYmVyIG9mIGNoYXJhY3RlcnNcbnZhciBzdGFyID0gcW1hcmsgKyAnKj8nXG5cbi8vICoqIHdoZW4gZG90cyBhcmUgYWxsb3dlZC4gIEFueXRoaW5nIGdvZXMsIGV4Y2VwdCAuLiBhbmQgLlxuLy8gbm90ICheIG9yIC8gZm9sbG93ZWQgYnkgb25lIG9yIHR3byBkb3RzIGZvbGxvd2VkIGJ5ICQgb3IgLyksXG4vLyBmb2xsb3dlZCBieSBhbnl0aGluZywgYW55IG51bWJlciBvZiB0aW1lcy5cbnZhciB0d29TdGFyRG90ID0gJyg/Oig/ISg/OlxcXFxcXC98XikoPzpcXFxcLnsxLDJ9KSgkfFxcXFxcXC8pKS4pKj8nXG5cbi8vIG5vdCBhIF4gb3IgLyBmb2xsb3dlZCBieSBhIGRvdCxcbi8vIGZvbGxvd2VkIGJ5IGFueXRoaW5nLCBhbnkgbnVtYmVyIG9mIHRpbWVzLlxudmFyIHR3b1N0YXJOb0RvdCA9ICcoPzooPyEoPzpcXFxcXFwvfF4pXFxcXC4pLikqPydcblxuLy8gY2hhcmFjdGVycyB0aGF0IG5lZWQgdG8gYmUgZXNjYXBlZCBpbiBSZWdFeHAuXG52YXIgcmVTcGVjaWFscyA9IGNoYXJTZXQoJygpLip7fSs/W11eJFxcXFwhJylcblxuLy8gXCJhYmNcIiAtPiB7IGE6dHJ1ZSwgYjp0cnVlLCBjOnRydWUgfVxuZnVuY3Rpb24gY2hhclNldCAocykge1xuICByZXR1cm4gcy5zcGxpdCgnJykucmVkdWNlKGZ1bmN0aW9uIChzZXQsIGMpIHtcbiAgICBzZXRbY10gPSB0cnVlXG4gICAgcmV0dXJuIHNldFxuICB9LCB7fSlcbn1cblxuLy8gbm9ybWFsaXplcyBzbGFzaGVzLlxudmFyIHNsYXNoU3BsaXQgPSAvXFwvKy9cblxubWluaW1hdGNoLmZpbHRlciA9IGZpbHRlclxuZnVuY3Rpb24gZmlsdGVyIChwYXR0ZXJuLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gIHJldHVybiBmdW5jdGlvbiAocCwgaSwgbGlzdCkge1xuICAgIHJldHVybiBtaW5pbWF0Y2gocCwgcGF0dGVybiwgb3B0aW9ucylcbiAgfVxufVxuXG5mdW5jdGlvbiBleHQgKGEsIGIpIHtcbiAgYSA9IGEgfHwge31cbiAgYiA9IGIgfHwge31cbiAgdmFyIHQgPSB7fVxuICBPYmplY3Qua2V5cyhiKS5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgdFtrXSA9IGJba11cbiAgfSlcbiAgT2JqZWN0LmtleXMoYSkuZm9yRWFjaChmdW5jdGlvbiAoaykge1xuICAgIHRba10gPSBhW2tdXG4gIH0pXG4gIHJldHVybiB0XG59XG5cbm1pbmltYXRjaC5kZWZhdWx0cyA9IGZ1bmN0aW9uIChkZWYpIHtcbiAgaWYgKCFkZWYgfHwgIU9iamVjdC5rZXlzKGRlZikubGVuZ3RoKSByZXR1cm4gbWluaW1hdGNoXG5cbiAgdmFyIG9yaWcgPSBtaW5pbWF0Y2hcblxuICB2YXIgbSA9IGZ1bmN0aW9uIG1pbmltYXRjaCAocCwgcGF0dGVybiwgb3B0aW9ucykge1xuICAgIHJldHVybiBvcmlnLm1pbmltYXRjaChwLCBwYXR0ZXJuLCBleHQoZGVmLCBvcHRpb25zKSlcbiAgfVxuXG4gIG0uTWluaW1hdGNoID0gZnVuY3Rpb24gTWluaW1hdGNoIChwYXR0ZXJuLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIG5ldyBvcmlnLk1pbmltYXRjaChwYXR0ZXJuLCBleHQoZGVmLCBvcHRpb25zKSlcbiAgfVxuXG4gIHJldHVybiBtXG59XG5cbk1pbmltYXRjaC5kZWZhdWx0cyA9IGZ1bmN0aW9uIChkZWYpIHtcbiAgaWYgKCFkZWYgfHwgIU9iamVjdC5rZXlzKGRlZikubGVuZ3RoKSByZXR1cm4gTWluaW1hdGNoXG4gIHJldHVybiBtaW5pbWF0Y2guZGVmYXVsdHMoZGVmKS5NaW5pbWF0Y2hcbn1cblxuZnVuY3Rpb24gbWluaW1hdGNoIChwLCBwYXR0ZXJuLCBvcHRpb25zKSB7XG4gIGlmICh0eXBlb2YgcGF0dGVybiAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdnbG9iIHBhdHRlcm4gc3RyaW5nIHJlcXVpcmVkJylcbiAgfVxuXG4gIGlmICghb3B0aW9ucykgb3B0aW9ucyA9IHt9XG5cbiAgLy8gc2hvcnRjdXQ6IGNvbW1lbnRzIG1hdGNoIG5vdGhpbmcuXG4gIGlmICghb3B0aW9ucy5ub2NvbW1lbnQgJiYgcGF0dGVybi5jaGFyQXQoMCkgPT09ICcjJykge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgLy8gXCJcIiBvbmx5IG1hdGNoZXMgXCJcIlxuICBpZiAocGF0dGVybi50cmltKCkgPT09ICcnKSByZXR1cm4gcCA9PT0gJydcblxuICByZXR1cm4gbmV3IE1pbmltYXRjaChwYXR0ZXJuLCBvcHRpb25zKS5tYXRjaChwKVxufVxuXG5mdW5jdGlvbiBNaW5pbWF0Y2ggKHBhdHRlcm4sIG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIE1pbmltYXRjaCkpIHtcbiAgICByZXR1cm4gbmV3IE1pbmltYXRjaChwYXR0ZXJuLCBvcHRpb25zKVxuICB9XG5cbiAgaWYgKHR5cGVvZiBwYXR0ZXJuICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2dsb2IgcGF0dGVybiBzdHJpbmcgcmVxdWlyZWQnKVxuICB9XG5cbiAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge31cbiAgcGF0dGVybiA9IHBhdHRlcm4udHJpbSgpXG5cbiAgLy8gd2luZG93cyBzdXBwb3J0OiBuZWVkIHRvIHVzZSAvLCBub3QgXFxcbiAgaWYgKHBhdGguc2VwICE9PSAnLycpIHtcbiAgICBwYXR0ZXJuID0gcGF0dGVybi5zcGxpdChwYXRoLnNlcCkuam9pbignLycpXG4gIH1cblxuICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zXG4gIHRoaXMuc2V0ID0gW11cbiAgdGhpcy5wYXR0ZXJuID0gcGF0dGVyblxuICB0aGlzLnJlZ2V4cCA9IG51bGxcbiAgdGhpcy5uZWdhdGUgPSBmYWxzZVxuICB0aGlzLmNvbW1lbnQgPSBmYWxzZVxuICB0aGlzLmVtcHR5ID0gZmFsc2VcblxuICAvLyBtYWtlIHRoZSBzZXQgb2YgcmVnZXhwcyBldGMuXG4gIHRoaXMubWFrZSgpXG59XG5cbk1pbmltYXRjaC5wcm90b3R5cGUuZGVidWcgPSBmdW5jdGlvbiAoKSB7fVxuXG5NaW5pbWF0Y2gucHJvdG90eXBlLm1ha2UgPSBtYWtlXG5mdW5jdGlvbiBtYWtlICgpIHtcbiAgLy8gZG9uJ3QgZG8gaXQgbW9yZSB0aGFuIG9uY2UuXG4gIGlmICh0aGlzLl9tYWRlKSByZXR1cm5cblxuICB2YXIgcGF0dGVybiA9IHRoaXMucGF0dGVyblxuICB2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9uc1xuXG4gIC8vIGVtcHR5IHBhdHRlcm5zIGFuZCBjb21tZW50cyBtYXRjaCBub3RoaW5nLlxuICBpZiAoIW9wdGlvbnMubm9jb21tZW50ICYmIHBhdHRlcm4uY2hhckF0KDApID09PSAnIycpIHtcbiAgICB0aGlzLmNvbW1lbnQgPSB0cnVlXG4gICAgcmV0dXJuXG4gIH1cbiAgaWYgKCFwYXR0ZXJuKSB7XG4gICAgdGhpcy5lbXB0eSA9IHRydWVcbiAgICByZXR1cm5cbiAgfVxuXG4gIC8vIHN0ZXAgMTogZmlndXJlIG91dCBuZWdhdGlvbiwgZXRjLlxuICB0aGlzLnBhcnNlTmVnYXRlKClcblxuICAvLyBzdGVwIDI6IGV4cGFuZCBicmFjZXNcbiAgdmFyIHNldCA9IHRoaXMuZ2xvYlNldCA9IHRoaXMuYnJhY2VFeHBhbmQoKVxuXG4gIGlmIChvcHRpb25zLmRlYnVnKSB0aGlzLmRlYnVnID0gY29uc29sZS5lcnJvclxuXG4gIHRoaXMuZGVidWcodGhpcy5wYXR0ZXJuLCBzZXQpXG5cbiAgLy8gc3RlcCAzOiBub3cgd2UgaGF2ZSBhIHNldCwgc28gdHVybiBlYWNoIG9uZSBpbnRvIGEgc2VyaWVzIG9mIHBhdGgtcG9ydGlvblxuICAvLyBtYXRjaGluZyBwYXR0ZXJucy5cbiAgLy8gVGhlc2Ugd2lsbCBiZSByZWdleHBzLCBleGNlcHQgaW4gdGhlIGNhc2Ugb2YgXCIqKlwiLCB3aGljaCBpc1xuICAvLyBzZXQgdG8gdGhlIEdMT0JTVEFSIG9iamVjdCBmb3IgZ2xvYnN0YXIgYmVoYXZpb3IsXG4gIC8vIGFuZCB3aWxsIG5vdCBjb250YWluIGFueSAvIGNoYXJhY3RlcnNcbiAgc2V0ID0gdGhpcy5nbG9iUGFydHMgPSBzZXQubWFwKGZ1bmN0aW9uIChzKSB7XG4gICAgcmV0dXJuIHMuc3BsaXQoc2xhc2hTcGxpdClcbiAgfSlcblxuICB0aGlzLmRlYnVnKHRoaXMucGF0dGVybiwgc2V0KVxuXG4gIC8vIGdsb2IgLS0+IHJlZ2V4cHNcbiAgc2V0ID0gc2V0Lm1hcChmdW5jdGlvbiAocywgc2ksIHNldCkge1xuICAgIHJldHVybiBzLm1hcCh0aGlzLnBhcnNlLCB0aGlzKVxuICB9LCB0aGlzKVxuXG4gIHRoaXMuZGVidWcodGhpcy5wYXR0ZXJuLCBzZXQpXG5cbiAgLy8gZmlsdGVyIG91dCBldmVyeXRoaW5nIHRoYXQgZGlkbid0IGNvbXBpbGUgcHJvcGVybHkuXG4gIHNldCA9IHNldC5maWx0ZXIoZnVuY3Rpb24gKHMpIHtcbiAgICByZXR1cm4gcy5pbmRleE9mKGZhbHNlKSA9PT0gLTFcbiAgfSlcblxuICB0aGlzLmRlYnVnKHRoaXMucGF0dGVybiwgc2V0KVxuXG4gIHRoaXMuc2V0ID0gc2V0XG59XG5cbk1pbmltYXRjaC5wcm90b3R5cGUucGFyc2VOZWdhdGUgPSBwYXJzZU5lZ2F0ZVxuZnVuY3Rpb24gcGFyc2VOZWdhdGUgKCkge1xuICB2YXIgcGF0dGVybiA9IHRoaXMucGF0dGVyblxuICB2YXIgbmVnYXRlID0gZmFsc2VcbiAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnNcbiAgdmFyIG5lZ2F0ZU9mZnNldCA9IDBcblxuICBpZiAob3B0aW9ucy5ub25lZ2F0ZSkgcmV0dXJuXG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBwYXR0ZXJuLmxlbmd0aFxuICAgIDsgaSA8IGwgJiYgcGF0dGVybi5jaGFyQXQoaSkgPT09ICchJ1xuICAgIDsgaSsrKSB7XG4gICAgbmVnYXRlID0gIW5lZ2F0ZVxuICAgIG5lZ2F0ZU9mZnNldCsrXG4gIH1cblxuICBpZiAobmVnYXRlT2Zmc2V0KSB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuLnN1YnN0cihuZWdhdGVPZmZzZXQpXG4gIHRoaXMubmVnYXRlID0gbmVnYXRlXG59XG5cbi8vIEJyYWNlIGV4cGFuc2lvbjpcbi8vIGF7YixjfWQgLT4gYWJkIGFjZFxuLy8gYXtiLH1jIC0+IGFiYyBhY1xuLy8gYXswLi4zfWQgLT4gYTBkIGExZCBhMmQgYTNkXG4vLyBhe2IsY3tkLGV9Zn1nIC0+IGFiZyBhY2RmZyBhY2VmZ1xuLy8gYXtiLGN9ZHtlLGZ9ZyAtPiBhYmRlZyBhY2RlZyBhYmRlZyBhYmRmZ1xuLy9cbi8vIEludmFsaWQgc2V0cyBhcmUgbm90IGV4cGFuZGVkLlxuLy8gYXsyLi59YiAtPiBhezIuLn1iXG4vLyBhe2J9YyAtPiBhe2J9Y1xubWluaW1hdGNoLmJyYWNlRXhwYW5kID0gZnVuY3Rpb24gKHBhdHRlcm4sIG9wdGlvbnMpIHtcbiAgcmV0dXJuIGJyYWNlRXhwYW5kKHBhdHRlcm4sIG9wdGlvbnMpXG59XG5cbk1pbmltYXRjaC5wcm90b3R5cGUuYnJhY2VFeHBhbmQgPSBicmFjZUV4cGFuZFxuXG5mdW5jdGlvbiBicmFjZUV4cGFuZCAocGF0dGVybiwgb3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIHtcbiAgICBpZiAodGhpcyBpbnN0YW5jZW9mIE1pbmltYXRjaCkge1xuICAgICAgb3B0aW9ucyA9IHRoaXMub3B0aW9uc1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb25zID0ge31cbiAgICB9XG4gIH1cblxuICBwYXR0ZXJuID0gdHlwZW9mIHBhdHRlcm4gPT09ICd1bmRlZmluZWQnXG4gICAgPyB0aGlzLnBhdHRlcm4gOiBwYXR0ZXJuXG5cbiAgaWYgKHR5cGVvZiBwYXR0ZXJuID09PSAndW5kZWZpbmVkJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3VuZGVmaW5lZCBwYXR0ZXJuJylcbiAgfVxuXG4gIGlmIChvcHRpb25zLm5vYnJhY2UgfHxcbiAgICAhcGF0dGVybi5tYXRjaCgvXFx7LipcXH0vKSkge1xuICAgIC8vIHNob3J0Y3V0LiBubyBuZWVkIHRvIGV4cGFuZC5cbiAgICByZXR1cm4gW3BhdHRlcm5dXG4gIH1cblxuICByZXR1cm4gZXhwYW5kKHBhdHRlcm4pXG59XG5cbi8vIHBhcnNlIGEgY29tcG9uZW50IG9mIHRoZSBleHBhbmRlZCBzZXQuXG4vLyBBdCB0aGlzIHBvaW50LCBubyBwYXR0ZXJuIG1heSBjb250YWluIFwiL1wiIGluIGl0XG4vLyBzbyB3ZSdyZSBnb2luZyB0byByZXR1cm4gYSAyZCBhcnJheSwgd2hlcmUgZWFjaCBlbnRyeSBpcyB0aGUgZnVsbFxuLy8gcGF0dGVybiwgc3BsaXQgb24gJy8nLCBhbmQgdGhlbiB0dXJuZWQgaW50byBhIHJlZ3VsYXIgZXhwcmVzc2lvbi5cbi8vIEEgcmVnZXhwIGlzIG1hZGUgYXQgdGhlIGVuZCB3aGljaCBqb2lucyBlYWNoIGFycmF5IHdpdGggYW5cbi8vIGVzY2FwZWQgLywgYW5kIGFub3RoZXIgZnVsbCBvbmUgd2hpY2ggam9pbnMgZWFjaCByZWdleHAgd2l0aCB8LlxuLy9cbi8vIEZvbGxvd2luZyB0aGUgbGVhZCBvZiBCYXNoIDQuMSwgbm90ZSB0aGF0IFwiKipcIiBvbmx5IGhhcyBzcGVjaWFsIG1lYW5pbmdcbi8vIHdoZW4gaXQgaXMgdGhlICpvbmx5KiB0aGluZyBpbiBhIHBhdGggcG9ydGlvbi4gIE90aGVyd2lzZSwgYW55IHNlcmllc1xuLy8gb2YgKiBpcyBlcXVpdmFsZW50IHRvIGEgc2luZ2xlICouICBHbG9ic3RhciBiZWhhdmlvciBpcyBlbmFibGVkIGJ5XG4vLyBkZWZhdWx0LCBhbmQgY2FuIGJlIGRpc2FibGVkIGJ5IHNldHRpbmcgb3B0aW9ucy5ub2dsb2JzdGFyLlxuTWluaW1hdGNoLnByb3RvdHlwZS5wYXJzZSA9IHBhcnNlXG52YXIgU1VCUEFSU0UgPSB7fVxuZnVuY3Rpb24gcGFyc2UgKHBhdHRlcm4sIGlzU3ViKSB7XG4gIGlmIChwYXR0ZXJuLmxlbmd0aCA+IDEwMjQgKiA2NCkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3BhdHRlcm4gaXMgdG9vIGxvbmcnKVxuICB9XG5cbiAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnNcblxuICAvLyBzaG9ydGN1dHNcbiAgaWYgKCFvcHRpb25zLm5vZ2xvYnN0YXIgJiYgcGF0dGVybiA9PT0gJyoqJykgcmV0dXJuIEdMT0JTVEFSXG4gIGlmIChwYXR0ZXJuID09PSAnJykgcmV0dXJuICcnXG5cbiAgdmFyIHJlID0gJydcbiAgdmFyIGhhc01hZ2ljID0gISFvcHRpb25zLm5vY2FzZVxuICB2YXIgZXNjYXBpbmcgPSBmYWxzZVxuICAvLyA/ID0+IG9uZSBzaW5nbGUgY2hhcmFjdGVyXG4gIHZhciBwYXR0ZXJuTGlzdFN0YWNrID0gW11cbiAgdmFyIG5lZ2F0aXZlTGlzdHMgPSBbXVxuICB2YXIgc3RhdGVDaGFyXG4gIHZhciBpbkNsYXNzID0gZmFsc2VcbiAgdmFyIHJlQ2xhc3NTdGFydCA9IC0xXG4gIHZhciBjbGFzc1N0YXJ0ID0gLTFcbiAgLy8gLiBhbmQgLi4gbmV2ZXIgbWF0Y2ggYW55dGhpbmcgdGhhdCBkb2Vzbid0IHN0YXJ0IHdpdGggLixcbiAgLy8gZXZlbiB3aGVuIG9wdGlvbnMuZG90IGlzIHNldC5cbiAgdmFyIHBhdHRlcm5TdGFydCA9IHBhdHRlcm4uY2hhckF0KDApID09PSAnLicgPyAnJyAvLyBhbnl0aGluZ1xuICAvLyBub3QgKHN0YXJ0IG9yIC8gZm9sbG93ZWQgYnkgLiBvciAuLiBmb2xsb3dlZCBieSAvIG9yIGVuZClcbiAgOiBvcHRpb25zLmRvdCA/ICcoPyEoPzpefFxcXFxcXC8pXFxcXC57MSwyfSg/OiR8XFxcXFxcLykpJ1xuICA6ICcoPyFcXFxcLiknXG4gIHZhciBzZWxmID0gdGhpc1xuXG4gIGZ1bmN0aW9uIGNsZWFyU3RhdGVDaGFyICgpIHtcbiAgICBpZiAoc3RhdGVDaGFyKSB7XG4gICAgICAvLyB3ZSBoYWQgc29tZSBzdGF0ZS10cmFja2luZyBjaGFyYWN0ZXJcbiAgICAgIC8vIHRoYXQgd2Fzbid0IGNvbnN1bWVkIGJ5IHRoaXMgcGFzcy5cbiAgICAgIHN3aXRjaCAoc3RhdGVDaGFyKSB7XG4gICAgICAgIGNhc2UgJyonOlxuICAgICAgICAgIHJlICs9IHN0YXJcbiAgICAgICAgICBoYXNNYWdpYyA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAnPyc6XG4gICAgICAgICAgcmUgKz0gcW1hcmtcbiAgICAgICAgICBoYXNNYWdpYyA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZSArPSAnXFxcXCcgKyBzdGF0ZUNoYXJcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIHNlbGYuZGVidWcoJ2NsZWFyU3RhdGVDaGFyICVqICVqJywgc3RhdGVDaGFyLCByZSlcbiAgICAgIHN0YXRlQ2hhciA9IGZhbHNlXG4gICAgfVxuICB9XG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhdHRlcm4ubGVuZ3RoLCBjXG4gICAgOyAoaSA8IGxlbikgJiYgKGMgPSBwYXR0ZXJuLmNoYXJBdChpKSlcbiAgICA7IGkrKykge1xuICAgIHRoaXMuZGVidWcoJyVzXFx0JXMgJXMgJWonLCBwYXR0ZXJuLCBpLCByZSwgYylcblxuICAgIC8vIHNraXAgb3ZlciBhbnkgdGhhdCBhcmUgZXNjYXBlZC5cbiAgICBpZiAoZXNjYXBpbmcgJiYgcmVTcGVjaWFsc1tjXSkge1xuICAgICAgcmUgKz0gJ1xcXFwnICsgY1xuICAgICAgZXNjYXBpbmcgPSBmYWxzZVxuICAgICAgY29udGludWVcbiAgICB9XG5cbiAgICBzd2l0Y2ggKGMpIHtcbiAgICAgIGNhc2UgJy8nOlxuICAgICAgICAvLyBjb21wbGV0ZWx5IG5vdCBhbGxvd2VkLCBldmVuIGVzY2FwZWQuXG4gICAgICAgIC8vIFNob3VsZCBhbHJlYWR5IGJlIHBhdGgtc3BsaXQgYnkgbm93LlxuICAgICAgICByZXR1cm4gZmFsc2VcblxuICAgICAgY2FzZSAnXFxcXCc6XG4gICAgICAgIGNsZWFyU3RhdGVDaGFyKClcbiAgICAgICAgZXNjYXBpbmcgPSB0cnVlXG4gICAgICBjb250aW51ZVxuXG4gICAgICAvLyB0aGUgdmFyaW91cyBzdGF0ZUNoYXIgdmFsdWVzXG4gICAgICAvLyBmb3IgdGhlIFwiZXh0Z2xvYlwiIHN0dWZmLlxuICAgICAgY2FzZSAnPyc6XG4gICAgICBjYXNlICcqJzpcbiAgICAgIGNhc2UgJysnOlxuICAgICAgY2FzZSAnQCc6XG4gICAgICBjYXNlICchJzpcbiAgICAgICAgdGhpcy5kZWJ1ZygnJXNcXHQlcyAlcyAlaiA8LS0gc3RhdGVDaGFyJywgcGF0dGVybiwgaSwgcmUsIGMpXG5cbiAgICAgICAgLy8gYWxsIG9mIHRob3NlIGFyZSBsaXRlcmFscyBpbnNpZGUgYSBjbGFzcywgZXhjZXB0IHRoYXRcbiAgICAgICAgLy8gdGhlIGdsb2IgWyFhXSBtZWFucyBbXmFdIGluIHJlZ2V4cFxuICAgICAgICBpZiAoaW5DbGFzcykge1xuICAgICAgICAgIHRoaXMuZGVidWcoJyAgaW4gY2xhc3MnKVxuICAgICAgICAgIGlmIChjID09PSAnIScgJiYgaSA9PT0gY2xhc3NTdGFydCArIDEpIGMgPSAnXidcbiAgICAgICAgICByZSArPSBjXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIHdlIGFscmVhZHkgaGF2ZSBhIHN0YXRlQ2hhciwgdGhlbiBpdCBtZWFuc1xuICAgICAgICAvLyB0aGF0IHRoZXJlIHdhcyBzb21ldGhpbmcgbGlrZSAqKiBvciArPyBpbiB0aGVyZS5cbiAgICAgICAgLy8gSGFuZGxlIHRoZSBzdGF0ZUNoYXIsIHRoZW4gcHJvY2VlZCB3aXRoIHRoaXMgb25lLlxuICAgICAgICBzZWxmLmRlYnVnKCdjYWxsIGNsZWFyU3RhdGVDaGFyICVqJywgc3RhdGVDaGFyKVxuICAgICAgICBjbGVhclN0YXRlQ2hhcigpXG4gICAgICAgIHN0YXRlQ2hhciA9IGNcbiAgICAgICAgLy8gaWYgZXh0Z2xvYiBpcyBkaXNhYmxlZCwgdGhlbiArKGFzZGZ8Zm9vKSBpc24ndCBhIHRoaW5nLlxuICAgICAgICAvLyBqdXN0IGNsZWFyIHRoZSBzdGF0ZWNoYXIgKm5vdyosIHJhdGhlciB0aGFuIGV2ZW4gZGl2aW5nIGludG9cbiAgICAgICAgLy8gdGhlIHBhdHRlcm5MaXN0IHN0dWZmLlxuICAgICAgICBpZiAob3B0aW9ucy5ub2V4dCkgY2xlYXJTdGF0ZUNoYXIoKVxuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSAnKCc6XG4gICAgICAgIGlmIChpbkNsYXNzKSB7XG4gICAgICAgICAgcmUgKz0gJygnXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghc3RhdGVDaGFyKSB7XG4gICAgICAgICAgcmUgKz0gJ1xcXFwoJ1xuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICBwYXR0ZXJuTGlzdFN0YWNrLnB1c2goe1xuICAgICAgICAgIHR5cGU6IHN0YXRlQ2hhcixcbiAgICAgICAgICBzdGFydDogaSAtIDEsXG4gICAgICAgICAgcmVTdGFydDogcmUubGVuZ3RoLFxuICAgICAgICAgIG9wZW46IHBsVHlwZXNbc3RhdGVDaGFyXS5vcGVuLFxuICAgICAgICAgIGNsb3NlOiBwbFR5cGVzW3N0YXRlQ2hhcl0uY2xvc2VcbiAgICAgICAgfSlcbiAgICAgICAgLy8gbmVnYXRpb24gaXMgKD86KD8hanMpW14vXSopXG4gICAgICAgIHJlICs9IHN0YXRlQ2hhciA9PT0gJyEnID8gJyg/Oig/ISg/OicgOiAnKD86J1xuICAgICAgICB0aGlzLmRlYnVnKCdwbFR5cGUgJWogJWonLCBzdGF0ZUNoYXIsIHJlKVxuICAgICAgICBzdGF0ZUNoYXIgPSBmYWxzZVxuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSAnKSc6XG4gICAgICAgIGlmIChpbkNsYXNzIHx8ICFwYXR0ZXJuTGlzdFN0YWNrLmxlbmd0aCkge1xuICAgICAgICAgIHJlICs9ICdcXFxcKSdcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgY2xlYXJTdGF0ZUNoYXIoKVxuICAgICAgICBoYXNNYWdpYyA9IHRydWVcbiAgICAgICAgdmFyIHBsID0gcGF0dGVybkxpc3RTdGFjay5wb3AoKVxuICAgICAgICAvLyBuZWdhdGlvbiBpcyAoPzooPyFqcylbXi9dKilcbiAgICAgICAgLy8gVGhlIG90aGVycyBhcmUgKD86PHBhdHRlcm4+KTx0eXBlPlxuICAgICAgICByZSArPSBwbC5jbG9zZVxuICAgICAgICBpZiAocGwudHlwZSA9PT0gJyEnKSB7XG4gICAgICAgICAgbmVnYXRpdmVMaXN0cy5wdXNoKHBsKVxuICAgICAgICB9XG4gICAgICAgIHBsLnJlRW5kID0gcmUubGVuZ3RoXG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlICd8JzpcbiAgICAgICAgaWYgKGluQ2xhc3MgfHwgIXBhdHRlcm5MaXN0U3RhY2subGVuZ3RoIHx8IGVzY2FwaW5nKSB7XG4gICAgICAgICAgcmUgKz0gJ1xcXFx8J1xuICAgICAgICAgIGVzY2FwaW5nID0gZmFsc2VcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgY2xlYXJTdGF0ZUNoYXIoKVxuICAgICAgICByZSArPSAnfCdcbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIC8vIHRoZXNlIGFyZSBtb3N0bHkgdGhlIHNhbWUgaW4gcmVnZXhwIGFuZCBnbG9iXG4gICAgICBjYXNlICdbJzpcbiAgICAgICAgLy8gc3dhbGxvdyBhbnkgc3RhdGUtdHJhY2tpbmcgY2hhciBiZWZvcmUgdGhlIFtcbiAgICAgICAgY2xlYXJTdGF0ZUNoYXIoKVxuXG4gICAgICAgIGlmIChpbkNsYXNzKSB7XG4gICAgICAgICAgcmUgKz0gJ1xcXFwnICsgY1xuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICBpbkNsYXNzID0gdHJ1ZVxuICAgICAgICBjbGFzc1N0YXJ0ID0gaVxuICAgICAgICByZUNsYXNzU3RhcnQgPSByZS5sZW5ndGhcbiAgICAgICAgcmUgKz0gY1xuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSAnXSc6XG4gICAgICAgIC8vICBhIHJpZ2h0IGJyYWNrZXQgc2hhbGwgbG9zZSBpdHMgc3BlY2lhbFxuICAgICAgICAvLyAgbWVhbmluZyBhbmQgcmVwcmVzZW50IGl0c2VsZiBpblxuICAgICAgICAvLyAgYSBicmFja2V0IGV4cHJlc3Npb24gaWYgaXQgb2NjdXJzXG4gICAgICAgIC8vICBmaXJzdCBpbiB0aGUgbGlzdC4gIC0tIFBPU0lYLjIgMi44LjMuMlxuICAgICAgICBpZiAoaSA9PT0gY2xhc3NTdGFydCArIDEgfHwgIWluQ2xhc3MpIHtcbiAgICAgICAgICByZSArPSAnXFxcXCcgKyBjXG4gICAgICAgICAgZXNjYXBpbmcgPSBmYWxzZVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyBoYW5kbGUgdGhlIGNhc2Ugd2hlcmUgd2UgbGVmdCBhIGNsYXNzIG9wZW4uXG4gICAgICAgIC8vIFwiW3otYV1cIiBpcyB2YWxpZCwgZXF1aXZhbGVudCB0byBcIlxcW3otYVxcXVwiXG4gICAgICAgIGlmIChpbkNsYXNzKSB7XG4gICAgICAgICAgLy8gc3BsaXQgd2hlcmUgdGhlIGxhc3QgWyB3YXMsIG1ha2Ugc3VyZSB3ZSBkb24ndCBoYXZlXG4gICAgICAgICAgLy8gYW4gaW52YWxpZCByZS4gaWYgc28sIHJlLXdhbGsgdGhlIGNvbnRlbnRzIG9mIHRoZVxuICAgICAgICAgIC8vIHdvdWxkLWJlIGNsYXNzIHRvIHJlLXRyYW5zbGF0ZSBhbnkgY2hhcmFjdGVycyB0aGF0XG4gICAgICAgICAgLy8gd2VyZSBwYXNzZWQgdGhyb3VnaCBhcy1pc1xuICAgICAgICAgIC8vIFRPRE86IEl0IHdvdWxkIHByb2JhYmx5IGJlIGZhc3RlciB0byBkZXRlcm1pbmUgdGhpc1xuICAgICAgICAgIC8vIHdpdGhvdXQgYSB0cnkvY2F0Y2ggYW5kIGEgbmV3IFJlZ0V4cCwgYnV0IGl0J3MgdHJpY2t5XG4gICAgICAgICAgLy8gdG8gZG8gc2FmZWx5LiAgRm9yIG5vdywgdGhpcyBpcyBzYWZlIGFuZCB3b3Jrcy5cbiAgICAgICAgICB2YXIgY3MgPSBwYXR0ZXJuLnN1YnN0cmluZyhjbGFzc1N0YXJ0ICsgMSwgaSlcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgUmVnRXhwKCdbJyArIGNzICsgJ10nKVxuICAgICAgICAgIH0gY2F0Y2ggKGVyKSB7XG4gICAgICAgICAgICAvLyBub3QgYSB2YWxpZCBjbGFzcyFcbiAgICAgICAgICAgIHZhciBzcCA9IHRoaXMucGFyc2UoY3MsIFNVQlBBUlNFKVxuICAgICAgICAgICAgcmUgPSByZS5zdWJzdHIoMCwgcmVDbGFzc1N0YXJ0KSArICdcXFxcWycgKyBzcFswXSArICdcXFxcXSdcbiAgICAgICAgICAgIGhhc01hZ2ljID0gaGFzTWFnaWMgfHwgc3BbMV1cbiAgICAgICAgICAgIGluQ2xhc3MgPSBmYWxzZVxuICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBmaW5pc2ggdXAgdGhlIGNsYXNzLlxuICAgICAgICBoYXNNYWdpYyA9IHRydWVcbiAgICAgICAgaW5DbGFzcyA9IGZhbHNlXG4gICAgICAgIHJlICs9IGNcbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIC8vIHN3YWxsb3cgYW55IHN0YXRlIGNoYXIgdGhhdCB3YXNuJ3QgY29uc3VtZWRcbiAgICAgICAgY2xlYXJTdGF0ZUNoYXIoKVxuXG4gICAgICAgIGlmIChlc2NhcGluZykge1xuICAgICAgICAgIC8vIG5vIG5lZWRcbiAgICAgICAgICBlc2NhcGluZyA9IGZhbHNlXG4gICAgICAgIH0gZWxzZSBpZiAocmVTcGVjaWFsc1tjXVxuICAgICAgICAgICYmICEoYyA9PT0gJ14nICYmIGluQ2xhc3MpKSB7XG4gICAgICAgICAgcmUgKz0gJ1xcXFwnXG4gICAgICAgIH1cblxuICAgICAgICByZSArPSBjXG5cbiAgICB9IC8vIHN3aXRjaFxuICB9IC8vIGZvclxuXG4gIC8vIGhhbmRsZSB0aGUgY2FzZSB3aGVyZSB3ZSBsZWZ0IGEgY2xhc3Mgb3Blbi5cbiAgLy8gXCJbYWJjXCIgaXMgdmFsaWQsIGVxdWl2YWxlbnQgdG8gXCJcXFthYmNcIlxuICBpZiAoaW5DbGFzcykge1xuICAgIC8vIHNwbGl0IHdoZXJlIHRoZSBsYXN0IFsgd2FzLCBhbmQgZXNjYXBlIGl0XG4gICAgLy8gdGhpcyBpcyBhIGh1Z2UgcGl0YS4gIFdlIG5vdyBoYXZlIHRvIHJlLXdhbGtcbiAgICAvLyB0aGUgY29udGVudHMgb2YgdGhlIHdvdWxkLWJlIGNsYXNzIHRvIHJlLXRyYW5zbGF0ZVxuICAgIC8vIGFueSBjaGFyYWN0ZXJzIHRoYXQgd2VyZSBwYXNzZWQgdGhyb3VnaCBhcy1pc1xuICAgIGNzID0gcGF0dGVybi5zdWJzdHIoY2xhc3NTdGFydCArIDEpXG4gICAgc3AgPSB0aGlzLnBhcnNlKGNzLCBTVUJQQVJTRSlcbiAgICByZSA9IHJlLnN1YnN0cigwLCByZUNsYXNzU3RhcnQpICsgJ1xcXFxbJyArIHNwWzBdXG4gICAgaGFzTWFnaWMgPSBoYXNNYWdpYyB8fCBzcFsxXVxuICB9XG5cbiAgLy8gaGFuZGxlIHRoZSBjYXNlIHdoZXJlIHdlIGhhZCBhICsoIHRoaW5nIGF0IHRoZSAqZW5kKlxuICAvLyBvZiB0aGUgcGF0dGVybi5cbiAgLy8gZWFjaCBwYXR0ZXJuIGxpc3Qgc3RhY2sgYWRkcyAzIGNoYXJzLCBhbmQgd2UgbmVlZCB0byBnbyB0aHJvdWdoXG4gIC8vIGFuZCBlc2NhcGUgYW55IHwgY2hhcnMgdGhhdCB3ZXJlIHBhc3NlZCB0aHJvdWdoIGFzLWlzIGZvciB0aGUgcmVnZXhwLlxuICAvLyBHbyB0aHJvdWdoIGFuZCBlc2NhcGUgdGhlbSwgdGFraW5nIGNhcmUgbm90IHRvIGRvdWJsZS1lc2NhcGUgYW55XG4gIC8vIHwgY2hhcnMgdGhhdCB3ZXJlIGFscmVhZHkgZXNjYXBlZC5cbiAgZm9yIChwbCA9IHBhdHRlcm5MaXN0U3RhY2sucG9wKCk7IHBsOyBwbCA9IHBhdHRlcm5MaXN0U3RhY2sucG9wKCkpIHtcbiAgICB2YXIgdGFpbCA9IHJlLnNsaWNlKHBsLnJlU3RhcnQgKyBwbC5vcGVuLmxlbmd0aClcbiAgICB0aGlzLmRlYnVnKCdzZXR0aW5nIHRhaWwnLCByZSwgcGwpXG4gICAgLy8gbWF5YmUgc29tZSBldmVuIG51bWJlciBvZiBcXCwgdGhlbiBtYXliZSAxIFxcLCBmb2xsb3dlZCBieSBhIHxcbiAgICB0YWlsID0gdGFpbC5yZXBsYWNlKC8oKD86XFxcXHsyfSl7MCw2NH0pKFxcXFw/KVxcfC9nLCBmdW5jdGlvbiAoXywgJDEsICQyKSB7XG4gICAgICBpZiAoISQyKSB7XG4gICAgICAgIC8vIHRoZSB8IGlzbid0IGFscmVhZHkgZXNjYXBlZCwgc28gZXNjYXBlIGl0LlxuICAgICAgICAkMiA9ICdcXFxcJ1xuICAgICAgfVxuXG4gICAgICAvLyBuZWVkIHRvIGVzY2FwZSBhbGwgdGhvc2Ugc2xhc2hlcyAqYWdhaW4qLCB3aXRob3V0IGVzY2FwaW5nIHRoZVxuICAgICAgLy8gb25lIHRoYXQgd2UgbmVlZCBmb3IgZXNjYXBpbmcgdGhlIHwgY2hhcmFjdGVyLiAgQXMgaXQgd29ya3Mgb3V0LFxuICAgICAgLy8gZXNjYXBpbmcgYW4gZXZlbiBudW1iZXIgb2Ygc2xhc2hlcyBjYW4gYmUgZG9uZSBieSBzaW1wbHkgcmVwZWF0aW5nXG4gICAgICAvLyBpdCBleGFjdGx5IGFmdGVyIGl0c2VsZi4gIFRoYXQncyB3aHkgdGhpcyB0cmljayB3b3Jrcy5cbiAgICAgIC8vXG4gICAgICAvLyBJIGFtIHNvcnJ5IHRoYXQgeW91IGhhdmUgdG8gc2VlIHRoaXMuXG4gICAgICByZXR1cm4gJDEgKyAkMSArICQyICsgJ3wnXG4gICAgfSlcblxuICAgIHRoaXMuZGVidWcoJ3RhaWw9JWpcXG4gICAlcycsIHRhaWwsIHRhaWwsIHBsLCByZSlcbiAgICB2YXIgdCA9IHBsLnR5cGUgPT09ICcqJyA/IHN0YXJcbiAgICAgIDogcGwudHlwZSA9PT0gJz8nID8gcW1hcmtcbiAgICAgIDogJ1xcXFwnICsgcGwudHlwZVxuXG4gICAgaGFzTWFnaWMgPSB0cnVlXG4gICAgcmUgPSByZS5zbGljZSgwLCBwbC5yZVN0YXJ0KSArIHQgKyAnXFxcXCgnICsgdGFpbFxuICB9XG5cbiAgLy8gaGFuZGxlIHRyYWlsaW5nIHRoaW5ncyB0aGF0IG9ubHkgbWF0dGVyIGF0IHRoZSB2ZXJ5IGVuZC5cbiAgY2xlYXJTdGF0ZUNoYXIoKVxuICBpZiAoZXNjYXBpbmcpIHtcbiAgICAvLyB0cmFpbGluZyBcXFxcXG4gICAgcmUgKz0gJ1xcXFxcXFxcJ1xuICB9XG5cbiAgLy8gb25seSBuZWVkIHRvIGFwcGx5IHRoZSBub2RvdCBzdGFydCBpZiB0aGUgcmUgc3RhcnRzIHdpdGhcbiAgLy8gc29tZXRoaW5nIHRoYXQgY291bGQgY29uY2VpdmFibHkgY2FwdHVyZSBhIGRvdFxuICB2YXIgYWRkUGF0dGVyblN0YXJ0ID0gZmFsc2VcbiAgc3dpdGNoIChyZS5jaGFyQXQoMCkpIHtcbiAgICBjYXNlICcuJzpcbiAgICBjYXNlICdbJzpcbiAgICBjYXNlICcoJzogYWRkUGF0dGVyblN0YXJ0ID0gdHJ1ZVxuICB9XG5cbiAgLy8gSGFjayB0byB3b3JrIGFyb3VuZCBsYWNrIG9mIG5lZ2F0aXZlIGxvb2tiZWhpbmQgaW4gSlNcbiAgLy8gQSBwYXR0ZXJuIGxpa2U6ICouISh4KS4hKHl8eikgbmVlZHMgdG8gZW5zdXJlIHRoYXQgYSBuYW1lXG4gIC8vIGxpa2UgJ2EueHl6Lnl6JyBkb2Vzbid0IG1hdGNoLiAgU28sIHRoZSBmaXJzdCBuZWdhdGl2ZVxuICAvLyBsb29rYWhlYWQsIGhhcyB0byBsb29rIEFMTCB0aGUgd2F5IGFoZWFkLCB0byB0aGUgZW5kIG9mXG4gIC8vIHRoZSBwYXR0ZXJuLlxuICBmb3IgKHZhciBuID0gbmVnYXRpdmVMaXN0cy5sZW5ndGggLSAxOyBuID4gLTE7IG4tLSkge1xuICAgIHZhciBubCA9IG5lZ2F0aXZlTGlzdHNbbl1cblxuICAgIHZhciBubEJlZm9yZSA9IHJlLnNsaWNlKDAsIG5sLnJlU3RhcnQpXG4gICAgdmFyIG5sRmlyc3QgPSByZS5zbGljZShubC5yZVN0YXJ0LCBubC5yZUVuZCAtIDgpXG4gICAgdmFyIG5sTGFzdCA9IHJlLnNsaWNlKG5sLnJlRW5kIC0gOCwgbmwucmVFbmQpXG4gICAgdmFyIG5sQWZ0ZXIgPSByZS5zbGljZShubC5yZUVuZClcblxuICAgIG5sTGFzdCArPSBubEFmdGVyXG5cbiAgICAvLyBIYW5kbGUgbmVzdGVkIHN0dWZmIGxpa2UgKigqLmpzfCEoKi5qc29uKSksIHdoZXJlIG9wZW4gcGFyZW5zXG4gICAgLy8gbWVhbiB0aGF0IHdlIHNob3VsZCAqbm90KiBpbmNsdWRlIHRoZSApIGluIHRoZSBiaXQgdGhhdCBpcyBjb25zaWRlcmVkXG4gICAgLy8gXCJhZnRlclwiIHRoZSBuZWdhdGVkIHNlY3Rpb24uXG4gICAgdmFyIG9wZW5QYXJlbnNCZWZvcmUgPSBubEJlZm9yZS5zcGxpdCgnKCcpLmxlbmd0aCAtIDFcbiAgICB2YXIgY2xlYW5BZnRlciA9IG5sQWZ0ZXJcbiAgICBmb3IgKGkgPSAwOyBpIDwgb3BlblBhcmVuc0JlZm9yZTsgaSsrKSB7XG4gICAgICBjbGVhbkFmdGVyID0gY2xlYW5BZnRlci5yZXBsYWNlKC9cXClbKyo/XT8vLCAnJylcbiAgICB9XG4gICAgbmxBZnRlciA9IGNsZWFuQWZ0ZXJcblxuICAgIHZhciBkb2xsYXIgPSAnJ1xuICAgIGlmIChubEFmdGVyID09PSAnJyAmJiBpc1N1YiAhPT0gU1VCUEFSU0UpIHtcbiAgICAgIGRvbGxhciA9ICckJ1xuICAgIH1cbiAgICB2YXIgbmV3UmUgPSBubEJlZm9yZSArIG5sRmlyc3QgKyBubEFmdGVyICsgZG9sbGFyICsgbmxMYXN0XG4gICAgcmUgPSBuZXdSZVxuICB9XG5cbiAgLy8gaWYgdGhlIHJlIGlzIG5vdCBcIlwiIGF0IHRoaXMgcG9pbnQsIHRoZW4gd2UgbmVlZCB0byBtYWtlIHN1cmVcbiAgLy8gaXQgZG9lc24ndCBtYXRjaCBhZ2FpbnN0IGFuIGVtcHR5IHBhdGggcGFydC5cbiAgLy8gT3RoZXJ3aXNlIGEvKiB3aWxsIG1hdGNoIGEvLCB3aGljaCBpdCBzaG91bGQgbm90LlxuICBpZiAocmUgIT09ICcnICYmIGhhc01hZ2ljKSB7XG4gICAgcmUgPSAnKD89LiknICsgcmVcbiAgfVxuXG4gIGlmIChhZGRQYXR0ZXJuU3RhcnQpIHtcbiAgICByZSA9IHBhdHRlcm5TdGFydCArIHJlXG4gIH1cblxuICAvLyBwYXJzaW5nIGp1c3QgYSBwaWVjZSBvZiBhIGxhcmdlciBwYXR0ZXJuLlxuICBpZiAoaXNTdWIgPT09IFNVQlBBUlNFKSB7XG4gICAgcmV0dXJuIFtyZSwgaGFzTWFnaWNdXG4gIH1cblxuICAvLyBza2lwIHRoZSByZWdleHAgZm9yIG5vbi1tYWdpY2FsIHBhdHRlcm5zXG4gIC8vIHVuZXNjYXBlIGFueXRoaW5nIGluIGl0LCB0aG91Z2gsIHNvIHRoYXQgaXQnbGwgYmVcbiAgLy8gYW4gZXhhY3QgbWF0Y2ggYWdhaW5zdCBhIGZpbGUgZXRjLlxuICBpZiAoIWhhc01hZ2ljKSB7XG4gICAgcmV0dXJuIGdsb2JVbmVzY2FwZShwYXR0ZXJuKVxuICB9XG5cbiAgdmFyIGZsYWdzID0gb3B0aW9ucy5ub2Nhc2UgPyAnaScgOiAnJ1xuICB0cnkge1xuICAgIHZhciByZWdFeHAgPSBuZXcgUmVnRXhwKCdeJyArIHJlICsgJyQnLCBmbGFncylcbiAgfSBjYXRjaCAoZXIpIHtcbiAgICAvLyBJZiBpdCB3YXMgYW4gaW52YWxpZCByZWd1bGFyIGV4cHJlc3Npb24sIHRoZW4gaXQgY2FuJ3QgbWF0Y2hcbiAgICAvLyBhbnl0aGluZy4gIFRoaXMgdHJpY2sgbG9va3MgZm9yIGEgY2hhcmFjdGVyIGFmdGVyIHRoZSBlbmQgb2ZcbiAgICAvLyB0aGUgc3RyaW5nLCB3aGljaCBpcyBvZiBjb3Vyc2UgaW1wb3NzaWJsZSwgZXhjZXB0IGluIG11bHRpLWxpbmVcbiAgICAvLyBtb2RlLCBidXQgaXQncyBub3QgYSAvbSByZWdleC5cbiAgICByZXR1cm4gbmV3IFJlZ0V4cCgnJC4nKVxuICB9XG5cbiAgcmVnRXhwLl9nbG9iID0gcGF0dGVyblxuICByZWdFeHAuX3NyYyA9IHJlXG5cbiAgcmV0dXJuIHJlZ0V4cFxufVxuXG5taW5pbWF0Y2gubWFrZVJlID0gZnVuY3Rpb24gKHBhdHRlcm4sIG9wdGlvbnMpIHtcbiAgcmV0dXJuIG5ldyBNaW5pbWF0Y2gocGF0dGVybiwgb3B0aW9ucyB8fCB7fSkubWFrZVJlKClcbn1cblxuTWluaW1hdGNoLnByb3RvdHlwZS5tYWtlUmUgPSBtYWtlUmVcbmZ1bmN0aW9uIG1ha2VSZSAoKSB7XG4gIGlmICh0aGlzLnJlZ2V4cCB8fCB0aGlzLnJlZ2V4cCA9PT0gZmFsc2UpIHJldHVybiB0aGlzLnJlZ2V4cFxuXG4gIC8vIGF0IHRoaXMgcG9pbnQsIHRoaXMuc2V0IGlzIGEgMmQgYXJyYXkgb2YgcGFydGlhbFxuICAvLyBwYXR0ZXJuIHN0cmluZ3MsIG9yIFwiKipcIi5cbiAgLy9cbiAgLy8gSXQncyBiZXR0ZXIgdG8gdXNlIC5tYXRjaCgpLiAgVGhpcyBmdW5jdGlvbiBzaG91bGRuJ3RcbiAgLy8gYmUgdXNlZCwgcmVhbGx5LCBidXQgaXQncyBwcmV0dHkgY29udmVuaWVudCBzb21ldGltZXMsXG4gIC8vIHdoZW4geW91IGp1c3Qgd2FudCB0byB3b3JrIHdpdGggYSByZWdleC5cbiAgdmFyIHNldCA9IHRoaXMuc2V0XG5cbiAgaWYgKCFzZXQubGVuZ3RoKSB7XG4gICAgdGhpcy5yZWdleHAgPSBmYWxzZVxuICAgIHJldHVybiB0aGlzLnJlZ2V4cFxuICB9XG4gIHZhciBvcHRpb25zID0gdGhpcy5vcHRpb25zXG5cbiAgdmFyIHR3b1N0YXIgPSBvcHRpb25zLm5vZ2xvYnN0YXIgPyBzdGFyXG4gICAgOiBvcHRpb25zLmRvdCA/IHR3b1N0YXJEb3RcbiAgICA6IHR3b1N0YXJOb0RvdFxuICB2YXIgZmxhZ3MgPSBvcHRpb25zLm5vY2FzZSA/ICdpJyA6ICcnXG5cbiAgdmFyIHJlID0gc2V0Lm1hcChmdW5jdGlvbiAocGF0dGVybikge1xuICAgIHJldHVybiBwYXR0ZXJuLm1hcChmdW5jdGlvbiAocCkge1xuICAgICAgcmV0dXJuIChwID09PSBHTE9CU1RBUikgPyB0d29TdGFyXG4gICAgICA6ICh0eXBlb2YgcCA9PT0gJ3N0cmluZycpID8gcmVnRXhwRXNjYXBlKHApXG4gICAgICA6IHAuX3NyY1xuICAgIH0pLmpvaW4oJ1xcXFxcXC8nKVxuICB9KS5qb2luKCd8JylcblxuICAvLyBtdXN0IG1hdGNoIGVudGlyZSBwYXR0ZXJuXG4gIC8vIGVuZGluZyBpbiBhICogb3IgKiogd2lsbCBtYWtlIGl0IGxlc3Mgc3RyaWN0LlxuICByZSA9ICdeKD86JyArIHJlICsgJykkJ1xuXG4gIC8vIGNhbiBtYXRjaCBhbnl0aGluZywgYXMgbG9uZyBhcyBpdCdzIG5vdCB0aGlzLlxuICBpZiAodGhpcy5uZWdhdGUpIHJlID0gJ14oPyEnICsgcmUgKyAnKS4qJCdcblxuICB0cnkge1xuICAgIHRoaXMucmVnZXhwID0gbmV3IFJlZ0V4cChyZSwgZmxhZ3MpXG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgdGhpcy5yZWdleHAgPSBmYWxzZVxuICB9XG4gIHJldHVybiB0aGlzLnJlZ2V4cFxufVxuXG5taW5pbWF0Y2gubWF0Y2ggPSBmdW5jdGlvbiAobGlzdCwgcGF0dGVybiwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICB2YXIgbW0gPSBuZXcgTWluaW1hdGNoKHBhdHRlcm4sIG9wdGlvbnMpXG4gIGxpc3QgPSBsaXN0LmZpbHRlcihmdW5jdGlvbiAoZikge1xuICAgIHJldHVybiBtbS5tYXRjaChmKVxuICB9KVxuICBpZiAobW0ub3B0aW9ucy5ub251bGwgJiYgIWxpc3QubGVuZ3RoKSB7XG4gICAgbGlzdC5wdXNoKHBhdHRlcm4pXG4gIH1cbiAgcmV0dXJuIGxpc3Rcbn1cblxuTWluaW1hdGNoLnByb3RvdHlwZS5tYXRjaCA9IG1hdGNoXG5mdW5jdGlvbiBtYXRjaCAoZiwgcGFydGlhbCkge1xuICB0aGlzLmRlYnVnKCdtYXRjaCcsIGYsIHRoaXMucGF0dGVybilcbiAgLy8gc2hvcnQtY2lyY3VpdCBpbiB0aGUgY2FzZSBvZiBidXN0ZWQgdGhpbmdzLlxuICAvLyBjb21tZW50cywgZXRjLlxuICBpZiAodGhpcy5jb21tZW50KSByZXR1cm4gZmFsc2VcbiAgaWYgKHRoaXMuZW1wdHkpIHJldHVybiBmID09PSAnJ1xuXG4gIGlmIChmID09PSAnLycgJiYgcGFydGlhbCkgcmV0dXJuIHRydWVcblxuICB2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9uc1xuXG4gIC8vIHdpbmRvd3M6IG5lZWQgdG8gdXNlIC8sIG5vdCBcXFxuICBpZiAocGF0aC5zZXAgIT09ICcvJykge1xuICAgIGYgPSBmLnNwbGl0KHBhdGguc2VwKS5qb2luKCcvJylcbiAgfVxuXG4gIC8vIHRyZWF0IHRoZSB0ZXN0IHBhdGggYXMgYSBzZXQgb2YgcGF0aHBhcnRzLlxuICBmID0gZi5zcGxpdChzbGFzaFNwbGl0KVxuICB0aGlzLmRlYnVnKHRoaXMucGF0dGVybiwgJ3NwbGl0JywgZilcblxuICAvLyBqdXN0IE9ORSBvZiB0aGUgcGF0dGVybiBzZXRzIGluIHRoaXMuc2V0IG5lZWRzIHRvIG1hdGNoXG4gIC8vIGluIG9yZGVyIGZvciBpdCB0byBiZSB2YWxpZC4gIElmIG5lZ2F0aW5nLCB0aGVuIGp1c3Qgb25lXG4gIC8vIG1hdGNoIG1lYW5zIHRoYXQgd2UgaGF2ZSBmYWlsZWQuXG4gIC8vIEVpdGhlciB3YXksIHJldHVybiBvbiB0aGUgZmlyc3QgaGl0LlxuXG4gIHZhciBzZXQgPSB0aGlzLnNldFxuICB0aGlzLmRlYnVnKHRoaXMucGF0dGVybiwgJ3NldCcsIHNldClcblxuICAvLyBGaW5kIHRoZSBiYXNlbmFtZSBvZiB0aGUgcGF0aCBieSBsb29raW5nIGZvciB0aGUgbGFzdCBub24tZW1wdHkgc2VnbWVudFxuICB2YXIgZmlsZW5hbWVcbiAgdmFyIGlcbiAgZm9yIChpID0gZi5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIGZpbGVuYW1lID0gZltpXVxuICAgIGlmIChmaWxlbmFtZSkgYnJlYWtcbiAgfVxuXG4gIGZvciAoaSA9IDA7IGkgPCBzZXQubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcGF0dGVybiA9IHNldFtpXVxuICAgIHZhciBmaWxlID0gZlxuICAgIGlmIChvcHRpb25zLm1hdGNoQmFzZSAmJiBwYXR0ZXJuLmxlbmd0aCA9PT0gMSkge1xuICAgICAgZmlsZSA9IFtmaWxlbmFtZV1cbiAgICB9XG4gICAgdmFyIGhpdCA9IHRoaXMubWF0Y2hPbmUoZmlsZSwgcGF0dGVybiwgcGFydGlhbClcbiAgICBpZiAoaGl0KSB7XG4gICAgICBpZiAob3B0aW9ucy5mbGlwTmVnYXRlKSByZXR1cm4gdHJ1ZVxuICAgICAgcmV0dXJuICF0aGlzLm5lZ2F0ZVxuICAgIH1cbiAgfVxuXG4gIC8vIGRpZG4ndCBnZXQgYW55IGhpdHMuICB0aGlzIGlzIHN1Y2Nlc3MgaWYgaXQncyBhIG5lZ2F0aXZlXG4gIC8vIHBhdHRlcm4sIGZhaWx1cmUgb3RoZXJ3aXNlLlxuICBpZiAob3B0aW9ucy5mbGlwTmVnYXRlKSByZXR1cm4gZmFsc2VcbiAgcmV0dXJuIHRoaXMubmVnYXRlXG59XG5cbi8vIHNldCBwYXJ0aWFsIHRvIHRydWUgdG8gdGVzdCBpZiwgZm9yIGV4YW1wbGUsXG4vLyBcIi9hL2JcIiBtYXRjaGVzIHRoZSBzdGFydCBvZiBcIi8qL2IvKi9kXCJcbi8vIFBhcnRpYWwgbWVhbnMsIGlmIHlvdSBydW4gb3V0IG9mIGZpbGUgYmVmb3JlIHlvdSBydW5cbi8vIG91dCBvZiBwYXR0ZXJuLCB0aGVuIHRoYXQncyBmaW5lLCBhcyBsb25nIGFzIGFsbFxuLy8gdGhlIHBhcnRzIG1hdGNoLlxuTWluaW1hdGNoLnByb3RvdHlwZS5tYXRjaE9uZSA9IGZ1bmN0aW9uIChmaWxlLCBwYXR0ZXJuLCBwYXJ0aWFsKSB7XG4gIHZhciBvcHRpb25zID0gdGhpcy5vcHRpb25zXG5cbiAgdGhpcy5kZWJ1ZygnbWF0Y2hPbmUnLFxuICAgIHsgJ3RoaXMnOiB0aGlzLCBmaWxlOiBmaWxlLCBwYXR0ZXJuOiBwYXR0ZXJuIH0pXG5cbiAgdGhpcy5kZWJ1ZygnbWF0Y2hPbmUnLCBmaWxlLmxlbmd0aCwgcGF0dGVybi5sZW5ndGgpXG5cbiAgZm9yICh2YXIgZmkgPSAwLFxuICAgICAgcGkgPSAwLFxuICAgICAgZmwgPSBmaWxlLmxlbmd0aCxcbiAgICAgIHBsID0gcGF0dGVybi5sZW5ndGhcbiAgICAgIDsgKGZpIDwgZmwpICYmIChwaSA8IHBsKVxuICAgICAgOyBmaSsrLCBwaSsrKSB7XG4gICAgdGhpcy5kZWJ1ZygnbWF0Y2hPbmUgbG9vcCcpXG4gICAgdmFyIHAgPSBwYXR0ZXJuW3BpXVxuICAgIHZhciBmID0gZmlsZVtmaV1cblxuICAgIHRoaXMuZGVidWcocGF0dGVybiwgcCwgZilcblxuICAgIC8vIHNob3VsZCBiZSBpbXBvc3NpYmxlLlxuICAgIC8vIHNvbWUgaW52YWxpZCByZWdleHAgc3R1ZmYgaW4gdGhlIHNldC5cbiAgICBpZiAocCA9PT0gZmFsc2UpIHJldHVybiBmYWxzZVxuXG4gICAgaWYgKHAgPT09IEdMT0JTVEFSKSB7XG4gICAgICB0aGlzLmRlYnVnKCdHTE9CU1RBUicsIFtwYXR0ZXJuLCBwLCBmXSlcblxuICAgICAgLy8gXCIqKlwiXG4gICAgICAvLyBhLyoqL2IvKiovYyB3b3VsZCBtYXRjaCB0aGUgZm9sbG93aW5nOlxuICAgICAgLy8gYS9iL3gveS96L2NcbiAgICAgIC8vIGEveC95L3ovYi9jXG4gICAgICAvLyBhL2IveC9iL3gvY1xuICAgICAgLy8gYS9iL2NcbiAgICAgIC8vIFRvIGRvIHRoaXMsIHRha2UgdGhlIHJlc3Qgb2YgdGhlIHBhdHRlcm4gYWZ0ZXJcbiAgICAgIC8vIHRoZSAqKiwgYW5kIHNlZSBpZiBpdCB3b3VsZCBtYXRjaCB0aGUgZmlsZSByZW1haW5kZXIuXG4gICAgICAvLyBJZiBzbywgcmV0dXJuIHN1Y2Nlc3MuXG4gICAgICAvLyBJZiBub3QsIHRoZSAqKiBcInN3YWxsb3dzXCIgYSBzZWdtZW50LCBhbmQgdHJ5IGFnYWluLlxuICAgICAgLy8gVGhpcyBpcyByZWN1cnNpdmVseSBhd2Z1bC5cbiAgICAgIC8vXG4gICAgICAvLyBhLyoqL2IvKiovYyBtYXRjaGluZyBhL2IveC95L3ovY1xuICAgICAgLy8gLSBhIG1hdGNoZXMgYVxuICAgICAgLy8gLSBkb3VibGVzdGFyXG4gICAgICAvLyAgIC0gbWF0Y2hPbmUoYi94L3kvei9jLCBiLyoqL2MpXG4gICAgICAvLyAgICAgLSBiIG1hdGNoZXMgYlxuICAgICAgLy8gICAgIC0gZG91Ymxlc3RhclxuICAgICAgLy8gICAgICAgLSBtYXRjaE9uZSh4L3kvei9jLCBjKSAtPiBub1xuICAgICAgLy8gICAgICAgLSBtYXRjaE9uZSh5L3ovYywgYykgLT4gbm9cbiAgICAgIC8vICAgICAgIC0gbWF0Y2hPbmUoei9jLCBjKSAtPiBub1xuICAgICAgLy8gICAgICAgLSBtYXRjaE9uZShjLCBjKSB5ZXMsIGhpdFxuICAgICAgdmFyIGZyID0gZmlcbiAgICAgIHZhciBwciA9IHBpICsgMVxuICAgICAgaWYgKHByID09PSBwbCkge1xuICAgICAgICB0aGlzLmRlYnVnKCcqKiBhdCB0aGUgZW5kJylcbiAgICAgICAgLy8gYSAqKiBhdCB0aGUgZW5kIHdpbGwganVzdCBzd2FsbG93IHRoZSByZXN0LlxuICAgICAgICAvLyBXZSBoYXZlIGZvdW5kIGEgbWF0Y2guXG4gICAgICAgIC8vIGhvd2V2ZXIsIGl0IHdpbGwgbm90IHN3YWxsb3cgLy54LCB1bmxlc3NcbiAgICAgICAgLy8gb3B0aW9ucy5kb3QgaXMgc2V0LlxuICAgICAgICAvLyAuIGFuZCAuLiBhcmUgKm5ldmVyKiBtYXRjaGVkIGJ5ICoqLCBmb3IgZXhwbG9zaXZlbHlcbiAgICAgICAgLy8gZXhwb25lbnRpYWwgcmVhc29ucy5cbiAgICAgICAgZm9yICg7IGZpIDwgZmw7IGZpKyspIHtcbiAgICAgICAgICBpZiAoZmlsZVtmaV0gPT09ICcuJyB8fCBmaWxlW2ZpXSA9PT0gJy4uJyB8fFxuICAgICAgICAgICAgKCFvcHRpb25zLmRvdCAmJiBmaWxlW2ZpXS5jaGFyQXQoMCkgPT09ICcuJykpIHJldHVybiBmYWxzZVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9XG5cbiAgICAgIC8vIG9rLCBsZXQncyBzZWUgaWYgd2UgY2FuIHN3YWxsb3cgd2hhdGV2ZXIgd2UgY2FuLlxuICAgICAgd2hpbGUgKGZyIDwgZmwpIHtcbiAgICAgICAgdmFyIHN3YWxsb3dlZSA9IGZpbGVbZnJdXG5cbiAgICAgICAgdGhpcy5kZWJ1ZygnXFxuZ2xvYnN0YXIgd2hpbGUnLCBmaWxlLCBmciwgcGF0dGVybiwgcHIsIHN3YWxsb3dlZSlcblxuICAgICAgICAvLyBYWFggcmVtb3ZlIHRoaXMgc2xpY2UuICBKdXN0IHBhc3MgdGhlIHN0YXJ0IGluZGV4LlxuICAgICAgICBpZiAodGhpcy5tYXRjaE9uZShmaWxlLnNsaWNlKGZyKSwgcGF0dGVybi5zbGljZShwciksIHBhcnRpYWwpKSB7XG4gICAgICAgICAgdGhpcy5kZWJ1ZygnZ2xvYnN0YXIgZm91bmQgbWF0Y2ghJywgZnIsIGZsLCBzd2FsbG93ZWUpXG4gICAgICAgICAgLy8gZm91bmQgYSBtYXRjaC5cbiAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGNhbid0IHN3YWxsb3cgXCIuXCIgb3IgXCIuLlwiIGV2ZXIuXG4gICAgICAgICAgLy8gY2FuIG9ubHkgc3dhbGxvdyBcIi5mb29cIiB3aGVuIGV4cGxpY2l0bHkgYXNrZWQuXG4gICAgICAgICAgaWYgKHN3YWxsb3dlZSA9PT0gJy4nIHx8IHN3YWxsb3dlZSA9PT0gJy4uJyB8fFxuICAgICAgICAgICAgKCFvcHRpb25zLmRvdCAmJiBzd2FsbG93ZWUuY2hhckF0KDApID09PSAnLicpKSB7XG4gICAgICAgICAgICB0aGlzLmRlYnVnKCdkb3QgZGV0ZWN0ZWQhJywgZmlsZSwgZnIsIHBhdHRlcm4sIHByKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyAqKiBzd2FsbG93cyBhIHNlZ21lbnQsIGFuZCBjb250aW51ZS5cbiAgICAgICAgICB0aGlzLmRlYnVnKCdnbG9ic3RhciBzd2FsbG93IGEgc2VnbWVudCwgYW5kIGNvbnRpbnVlJylcbiAgICAgICAgICBmcisrXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gbm8gbWF0Y2ggd2FzIGZvdW5kLlxuICAgICAgLy8gSG93ZXZlciwgaW4gcGFydGlhbCBtb2RlLCB3ZSBjYW4ndCBzYXkgdGhpcyBpcyBuZWNlc3NhcmlseSBvdmVyLlxuICAgICAgLy8gSWYgdGhlcmUncyBtb3JlICpwYXR0ZXJuKiBsZWZ0LCB0aGVuXG4gICAgICBpZiAocGFydGlhbCkge1xuICAgICAgICAvLyByYW4gb3V0IG9mIGZpbGVcbiAgICAgICAgdGhpcy5kZWJ1ZygnXFxuPj4+IG5vIG1hdGNoLCBwYXJ0aWFsPycsIGZpbGUsIGZyLCBwYXR0ZXJuLCBwcilcbiAgICAgICAgaWYgKGZyID09PSBmbCkgcmV0dXJuIHRydWVcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuICAgIC8vIHNvbWV0aGluZyBvdGhlciB0aGFuICoqXG4gICAgLy8gbm9uLW1hZ2ljIHBhdHRlcm5zIGp1c3QgaGF2ZSB0byBtYXRjaCBleGFjdGx5XG4gICAgLy8gcGF0dGVybnMgd2l0aCBtYWdpYyBoYXZlIGJlZW4gdHVybmVkIGludG8gcmVnZXhwcy5cbiAgICB2YXIgaGl0XG4gICAgaWYgKHR5cGVvZiBwID09PSAnc3RyaW5nJykge1xuICAgICAgaWYgKG9wdGlvbnMubm9jYXNlKSB7XG4gICAgICAgIGhpdCA9IGYudG9Mb3dlckNhc2UoKSA9PT0gcC50b0xvd2VyQ2FzZSgpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBoaXQgPSBmID09PSBwXG4gICAgICB9XG4gICAgICB0aGlzLmRlYnVnKCdzdHJpbmcgbWF0Y2gnLCBwLCBmLCBoaXQpXG4gICAgfSBlbHNlIHtcbiAgICAgIGhpdCA9IGYubWF0Y2gocClcbiAgICAgIHRoaXMuZGVidWcoJ3BhdHRlcm4gbWF0Y2gnLCBwLCBmLCBoaXQpXG4gICAgfVxuXG4gICAgaWYgKCFoaXQpIHJldHVybiBmYWxzZVxuICB9XG5cbiAgLy8gTm90ZTogZW5kaW5nIGluIC8gbWVhbnMgdGhhdCB3ZSdsbCBnZXQgYSBmaW5hbCBcIlwiXG4gIC8vIGF0IHRoZSBlbmQgb2YgdGhlIHBhdHRlcm4uICBUaGlzIGNhbiBvbmx5IG1hdGNoIGFcbiAgLy8gY29ycmVzcG9uZGluZyBcIlwiIGF0IHRoZSBlbmQgb2YgdGhlIGZpbGUuXG4gIC8vIElmIHRoZSBmaWxlIGVuZHMgaW4gLywgdGhlbiBpdCBjYW4gb25seSBtYXRjaCBhXG4gIC8vIGEgcGF0dGVybiB0aGF0IGVuZHMgaW4gLywgdW5sZXNzIHRoZSBwYXR0ZXJuIGp1c3RcbiAgLy8gZG9lc24ndCBoYXZlIGFueSBtb3JlIGZvciBpdC4gQnV0LCBhL2IvIHNob3VsZCAqbm90KlxuICAvLyBtYXRjaCBcImEvYi8qXCIsIGV2ZW4gdGhvdWdoIFwiXCIgbWF0Y2hlcyBhZ2FpbnN0IHRoZVxuICAvLyBbXi9dKj8gcGF0dGVybiwgZXhjZXB0IGluIHBhcnRpYWwgbW9kZSwgd2hlcmUgaXQgbWlnaHRcbiAgLy8gc2ltcGx5IG5vdCBiZSByZWFjaGVkIHlldC5cbiAgLy8gSG93ZXZlciwgYS9iLyBzaG91bGQgc3RpbGwgc2F0aXNmeSBhLypcblxuICAvLyBub3cgZWl0aGVyIHdlIGZlbGwgb2ZmIHRoZSBlbmQgb2YgdGhlIHBhdHRlcm4sIG9yIHdlJ3JlIGRvbmUuXG4gIGlmIChmaSA9PT0gZmwgJiYgcGkgPT09IHBsKSB7XG4gICAgLy8gcmFuIG91dCBvZiBwYXR0ZXJuIGFuZCBmaWxlbmFtZSBhdCB0aGUgc2FtZSB0aW1lLlxuICAgIC8vIGFuIGV4YWN0IGhpdCFcbiAgICByZXR1cm4gdHJ1ZVxuICB9IGVsc2UgaWYgKGZpID09PSBmbCkge1xuICAgIC8vIHJhbiBvdXQgb2YgZmlsZSwgYnV0IHN0aWxsIGhhZCBwYXR0ZXJuIGxlZnQuXG4gICAgLy8gdGhpcyBpcyBvayBpZiB3ZSdyZSBkb2luZyB0aGUgbWF0Y2ggYXMgcGFydCBvZlxuICAgIC8vIGEgZ2xvYiBmcyB0cmF2ZXJzYWwuXG4gICAgcmV0dXJuIHBhcnRpYWxcbiAgfSBlbHNlIGlmIChwaSA9PT0gcGwpIHtcbiAgICAvLyByYW4gb3V0IG9mIHBhdHRlcm4sIHN0aWxsIGhhdmUgZmlsZSBsZWZ0LlxuICAgIC8vIHRoaXMgaXMgb25seSBhY2NlcHRhYmxlIGlmIHdlJ3JlIG9uIHRoZSB2ZXJ5IGxhc3RcbiAgICAvLyBlbXB0eSBzZWdtZW50IG9mIGEgZmlsZSB3aXRoIGEgdHJhaWxpbmcgc2xhc2guXG4gICAgLy8gYS8qIHNob3VsZCBtYXRjaCBhL2IvXG4gICAgdmFyIGVtcHR5RmlsZUVuZCA9IChmaSA9PT0gZmwgLSAxKSAmJiAoZmlsZVtmaV0gPT09ICcnKVxuICAgIHJldHVybiBlbXB0eUZpbGVFbmRcbiAgfVxuXG4gIC8vIHNob3VsZCBiZSB1bnJlYWNoYWJsZS5cbiAgdGhyb3cgbmV3IEVycm9yKCd3dGY/Jylcbn1cblxuLy8gcmVwbGFjZSBzdHVmZiBsaWtlIFxcKiB3aXRoICpcbmZ1bmN0aW9uIGdsb2JVbmVzY2FwZSAocykge1xuICByZXR1cm4gcy5yZXBsYWNlKC9cXFxcKC4pL2csICckMScpXG59XG5cbmZ1bmN0aW9uIHJlZ0V4cEVzY2FwZSAocykge1xuICByZXR1cm4gcy5yZXBsYWNlKC9bLVtcXF17fSgpKis/LixcXFxcXiR8I1xcc10vZywgJ1xcXFwkJicpXG59XG4iLCJ2YXIgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbnZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG52YXIgXzA3NzcgPSBwYXJzZUludCgnMDc3NycsIDgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1rZGlyUC5ta2RpcnAgPSBta2RpclAubWtkaXJQID0gbWtkaXJQO1xuXG5mdW5jdGlvbiBta2RpclAgKHAsIG9wdHMsIGYsIG1hZGUpIHtcbiAgICBpZiAodHlwZW9mIG9wdHMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgZiA9IG9wdHM7XG4gICAgICAgIG9wdHMgPSB7fTtcbiAgICB9XG4gICAgZWxzZSBpZiAoIW9wdHMgfHwgdHlwZW9mIG9wdHMgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIG9wdHMgPSB7IG1vZGU6IG9wdHMgfTtcbiAgICB9XG4gICAgXG4gICAgdmFyIG1vZGUgPSBvcHRzLm1vZGU7XG4gICAgdmFyIHhmcyA9IG9wdHMuZnMgfHwgZnM7XG4gICAgXG4gICAgaWYgKG1vZGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBtb2RlID0gXzA3NzdcbiAgICB9XG4gICAgaWYgKCFtYWRlKSBtYWRlID0gbnVsbDtcbiAgICBcbiAgICB2YXIgY2IgPSBmIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgIHAgPSBwYXRoLnJlc29sdmUocCk7XG4gICAgXG4gICAgeGZzLm1rZGlyKHAsIG1vZGUsIGZ1bmN0aW9uIChlcikge1xuICAgICAgICBpZiAoIWVyKSB7XG4gICAgICAgICAgICBtYWRlID0gbWFkZSB8fCBwO1xuICAgICAgICAgICAgcmV0dXJuIGNiKG51bGwsIG1hZGUpO1xuICAgICAgICB9XG4gICAgICAgIHN3aXRjaCAoZXIuY29kZSkge1xuICAgICAgICAgICAgY2FzZSAnRU5PRU5UJzpcbiAgICAgICAgICAgICAgICBpZiAocGF0aC5kaXJuYW1lKHApID09PSBwKSByZXR1cm4gY2IoZXIpO1xuICAgICAgICAgICAgICAgIG1rZGlyUChwYXRoLmRpcm5hbWUocCksIG9wdHMsIGZ1bmN0aW9uIChlciwgbWFkZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXIpIGNiKGVyLCBtYWRlKTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBta2RpclAocCwgb3B0cywgY2IsIG1hZGUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAvLyBJbiB0aGUgY2FzZSBvZiBhbnkgb3RoZXIgZXJyb3IsIGp1c3Qgc2VlIGlmIHRoZXJlJ3MgYSBkaXJcbiAgICAgICAgICAgIC8vIHRoZXJlIGFscmVhZHkuICBJZiBzbywgdGhlbiBob29yYXkhICBJZiBub3QsIHRoZW4gc29tZXRoaW5nXG4gICAgICAgICAgICAvLyBpcyBib3JrZWQuXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHhmcy5zdGF0KHAsIGZ1bmN0aW9uIChlcjIsIHN0YXQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgdGhlIHN0YXQgZmFpbHMsIHRoZW4gdGhhdCdzIHN1cGVyIHdlaXJkLlxuICAgICAgICAgICAgICAgICAgICAvLyBsZXQgdGhlIG9yaWdpbmFsIGVycm9yIGJlIHRoZSBmYWlsdXJlIHJlYXNvbi5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGVyMiB8fCAhc3RhdC5pc0RpcmVjdG9yeSgpKSBjYihlciwgbWFkZSlcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBjYihudWxsLCBtYWRlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5ta2RpclAuc3luYyA9IGZ1bmN0aW9uIHN5bmMgKHAsIG9wdHMsIG1hZGUpIHtcbiAgICBpZiAoIW9wdHMgfHwgdHlwZW9mIG9wdHMgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIG9wdHMgPSB7IG1vZGU6IG9wdHMgfTtcbiAgICB9XG4gICAgXG4gICAgdmFyIG1vZGUgPSBvcHRzLm1vZGU7XG4gICAgdmFyIHhmcyA9IG9wdHMuZnMgfHwgZnM7XG4gICAgXG4gICAgaWYgKG1vZGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBtb2RlID0gXzA3NzdcbiAgICB9XG4gICAgaWYgKCFtYWRlKSBtYWRlID0gbnVsbDtcblxuICAgIHAgPSBwYXRoLnJlc29sdmUocCk7XG5cbiAgICB0cnkge1xuICAgICAgICB4ZnMubWtkaXJTeW5jKHAsIG1vZGUpO1xuICAgICAgICBtYWRlID0gbWFkZSB8fCBwO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyMCkge1xuICAgICAgICBzd2l0Y2ggKGVycjAuY29kZSkge1xuICAgICAgICAgICAgY2FzZSAnRU5PRU5UJyA6XG4gICAgICAgICAgICAgICAgbWFkZSA9IHN5bmMocGF0aC5kaXJuYW1lKHApLCBvcHRzLCBtYWRlKTtcbiAgICAgICAgICAgICAgICBzeW5jKHAsIG9wdHMsIG1hZGUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAvLyBJbiB0aGUgY2FzZSBvZiBhbnkgb3RoZXIgZXJyb3IsIGp1c3Qgc2VlIGlmIHRoZXJlJ3MgYSBkaXJcbiAgICAgICAgICAgIC8vIHRoZXJlIGFscmVhZHkuICBJZiBzbywgdGhlbiBob29yYXkhICBJZiBub3QsIHRoZW4gc29tZXRoaW5nXG4gICAgICAgICAgICAvLyBpcyBib3JrZWQuXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHZhciBzdGF0O1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXQgPSB4ZnMuc3RhdFN5bmMocCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIChlcnIxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IGVycjA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghc3RhdC5pc0RpcmVjdG9yeSgpKSB0aHJvdyBlcnIwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG1hZGU7XG59O1xuIiwidmFyIG5hdGl2ZXMgPSBwcm9jZXNzLmJpbmRpbmcoJ25hdGl2ZXMnKVxudmFyIG1vZHVsZSA9IHJlcXVpcmUoJ21vZHVsZScpXG52YXIgbm9ybWFsUmVxdWlyZSA9IHJlcXVpcmVcbmV4cG9ydHMuc291cmNlID0gc3JjXG5leHBvcnRzLnJlcXVpcmUgPSByZXFcbnZhciB2bSA9IHJlcXVpcmUoJ3ZtJylcblxuLy8gZmFsbGJhY2sgZm9yIDAueCBzdXBwb3J0XG52YXIgcnVuSW5UaGlzQ29udGV4dCwgQ29udGV4dGlmeVNjcmlwdCwgU2NyaXB0XG4vKmlzdGFuYnVsIGlnbm9yZSBuZXh0Ki9cbnRyeSB7XG4gIENvbnRleHRpZnlTY3JpcHQgPSBwcm9jZXNzLmJpbmRpbmcoJ2NvbnRleHRpZnknKS5Db250ZXh0aWZ5U2NyaXB0O1xuICAvKmlzdGFuYnVsIGlnbm9yZSBuZXh0Ki9cbiAgaWYgKHByb2Nlc3MudmVyc2lvbi5zcGxpdCgnLicpWzBdLmxlbmd0aCA+IDIpIHsgIC8vIHYxMC4wLjAgYW5kIGFib3ZlXG4gICAgcnVuSW5UaGlzQ29udGV4dCA9IHZtLnJ1bkluVGhpc0NvbnRleHQ7XG4gIH0gZWxzZSB7XG4gICAgcnVuSW5UaGlzQ29udGV4dCA9IGZ1bmN0aW9uIHJ1bkluVGhpc0NvbnRleHQoY29kZSwgb3B0aW9ucykge1xuICAgICAgdmFyIHNjcmlwdCA9IG5ldyBDb250ZXh0aWZ5U2NyaXB0KGNvZGUsIG9wdGlvbnMpO1xuICAgICAgcmV0dXJuIHNjcmlwdC5ydW5JblRoaXNDb250ZXh0KCk7XG4gICAgfVxuICB9XG59IGNhdGNoIChlcikge1xuICBTY3JpcHQgPSBwcm9jZXNzLmJpbmRpbmcoJ2V2YWxzJykuTm9kZVNjcmlwdDtcbiAgcnVuSW5UaGlzQ29udGV4dCA9IFNjcmlwdC5ydW5JblRoaXNDb250ZXh0O1xufVxuXG52YXIgd3JhcCA9IFtcbiAgJyhmdW5jdGlvbiAoaW50ZXJuYWxCaW5kaW5nKSB7JyArXG4gICAgJyByZXR1cm4gZnVuY3Rpb24gKGV4cG9ydHMsIHJlcXVpcmUsIG1vZHVsZSwgX19maWxlbmFtZSwgX19kaXJuYW1lKSB7ICcsXG4gICdcXG4gIH07XFxufSk7J1xuXTtcblxuXG4vLyBCYXNpY2FsbHkgdGhlIHNhbWUgZnVuY3Rpb25hbGl0eSBhcyBub2RlJ3MgKGJ1cmllZCBkZWVwKVxuLy8gTmF0aXZlTW9kdWxlIGNsYXNzLCBidXQgd2l0aG91dCBjYWNoaW5nLCBvciBpbnRlcm5hbC8gYmxvY2tpbmcsXG4vLyBvciBhIGNsYXNzLCBzaW5jZSB0aGF0J3Mgbm90IHJlYWxseSBuZWNlc3NhcnkuICBJIGFzc3VtZSB0aGF0IGlmXG4vLyB5b3UncmUgbG9hZGluZyBzb21ldGhpbmcgd2l0aCB0aGlzIG1vZHVsZSwgaXQncyBiZWNhdXNlIHlvdSBXQU5UXG4vLyBhIHNlcGFyYXRlIGNvcHkuICBIb3dldmVyLCB0byBwcmVzZXJ2ZSBzZW1hbnRpY3MsIGFueSByZXF1aXJlKClcbi8vIGNhbGxzIG1hZGUgdGhyb3VnaG91dCB0aGUgaW50ZXJuYWwgbW9kdWxlIGxvYWQgSVMgY2FjaGVkLlxuZnVuY3Rpb24gcmVxIChpZCwgd2hpdGVsaXN0KSB7XG4gIHZhciBjYWNoZSA9IE9iamVjdC5jcmVhdGUobnVsbClcblxuICBpZiAoQXJyYXkuaXNBcnJheSh3aGl0ZWxpc3QpKSB7XG4gICAgLy8gYSB3aGl0ZWxpc3Qgb2YgdGhpbmdzIHRvIHB1bGwgZnJvbSB0aGUgXCJhY3R1YWxcIiBuYXRpdmUgbW9kdWxlc1xuICAgIHdoaXRlbGlzdC5mb3JFYWNoKGZ1bmN0aW9uIChpZCkge1xuICAgICAgY2FjaGVbaWRdID0ge1xuICAgICAgICBsb2FkaW5nOiBmYWxzZSxcbiAgICAgICAgbG9hZGVkOiB0cnVlLFxuICAgICAgICBmaWxlbmFtZTogaWQgKyAnLmpzJyxcbiAgICAgICAgZXhwb3J0czogcmVxdWlyZShpZClcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgcmV0dXJuIHJlcV8oaWQsIGNhY2hlKVxufVxuXG5mdW5jdGlvbiByZXFfIChpZCwgY2FjaGUpIHtcbiAgLy8gQnVmZmVyIGlzIHNwZWNpYWwsIGJlY2F1c2UgaXQncyBhIHR5cGUgcmF0aGVyIHRoYW4gYSBcIm5vcm1hbFwiXG4gIC8vIGNsYXNzLCBhbmQgbWFueSB0aGluZ3MgZGVwZW5kIG9uIGBCdWZmZXIuaXNCdWZmZXJgIHdvcmtpbmcuXG4gIGlmIChpZCA9PT0gJ2J1ZmZlcicpIHtcbiAgICByZXR1cm4gcmVxdWlyZSgnYnVmZmVyJylcbiAgfVxuXG4gIC8vIG5hdGl2ZV9tb2R1bGUgaXNuJ3QgYWN0dWFsbHkgYSBuYXRpdmVzIGJpbmRpbmcuXG4gIC8vIHdlaXJkLCByaWdodD9cbiAgaWYgKGlkID09PSAnbmF0aXZlX21vZHVsZScpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZ2V0U291cmNlOiBzcmMsXG4gICAgICB3cmFwOiBmdW5jdGlvbiAoc2NyaXB0KSB7XG4gICAgICAgIHJldHVybiB3cmFwWzBdICsgc2NyaXB0ICsgd3JhcFsxXVxuICAgICAgfSxcbiAgICAgIHdyYXBwZXI6IHdyYXAsXG4gICAgICBfY2FjaGU6IGNhY2hlLFxuICAgICAgX3NvdXJjZTogbmF0aXZlcyxcbiAgICAgIG5vbkludGVybmFsRXhpc3RzOiBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgcmV0dXJuIGlkLmluZGV4T2YoJ2ludGVybmFsLycpICE9PSAwO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHZhciBzb3VyY2UgPSBzcmMoaWQpXG4gIGlmICghc291cmNlKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG4gIHNvdXJjZSA9IHdyYXBbMF0gKyBzb3VyY2UgKyB3cmFwWzFdXG5cbiAgdmFyIGludGVybmFsQmluZGluZyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBpZiAobmFtZSA9PT0gJ3R5cGVzJykge1xuICAgICAgcmV0dXJuIHByb2Nlc3MuYmluZGluZygndXRpbCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gcHJvY2Vzcy5iaW5kaW5nKG5hbWUpO1xuICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG4gIH1cblxuICB2YXIgY2FjaGluZ1JlcXVpcmUgPSBmdW5jdGlvbiByZXF1aXJlIChpZCkge1xuICAgIGlmIChjYWNoZVtpZF0pIHtcbiAgICAgIHJldHVybiBjYWNoZVtpZF0uZXhwb3J0c1xuICAgIH1cbiAgICBpZiAoaWQgPT09ICdpbnRlcm5hbC9ib290c3RyYXAvbG9hZGVycycgfHwgaWQgPT09ICdpbnRlcm5hbC9wcm9jZXNzJykge1xuICAgICAgLy8gUHJvdmlkZSBqdXN0IGVub3VnaCB0byBrZWVwIGBncmFjZWZ1bC1mc0AzYCB3b3JraW5nIGFuZCB0ZXN0cyBwYXNzaW5nLlxuICAgICAgLy8gRm9yIG5vdy5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGludGVybmFsQmluZGluZzogaW50ZXJuYWxCaW5kaW5nLFxuICAgICAgICBOYXRpdmVNb2R1bGU6IHtcbiAgICAgICAgICBfc291cmNlOiBwcm9jZXNzLmJpbmRpbmcoJ25hdGl2ZXMnKSxcbiAgICAgICAgICBub25JbnRlcm5hbEV4aXN0czogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgICAgIHJldHVybiAhaWQuc3RhcnRzV2l0aCgnaW50ZXJuYWwvJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gcmVxXyhpZCwgY2FjaGUpXG4gIH1cblxuICB2YXIgbm0gPSB7XG4gICAgZXhwb3J0czoge30sXG4gICAgbG9hZGluZzogdHJ1ZSxcbiAgICBsb2FkZWQ6IGZhbHNlLFxuICAgIGZpbGVuYW1lOiBpZCArICcuanMnXG4gIH1cbiAgY2FjaGVbaWRdID0gbm1cbiAgdmFyIGZuXG4gIHZhciBzZXRWOEZsYWdzID0gZmFsc2VcbiAgdHJ5IHtcbiAgICByZXF1aXJlKCd2OCcpLnNldEZsYWdzRnJvbVN0cmluZygnLS1hbGxvd19uYXRpdmVzX3N5bnRheCcpXG4gICAgc2V0VjhGbGFncyA9IHRydWVcbiAgfSBjYXRjaCAoZSkge31cbiAgdHJ5IHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgIGlmIChDb250ZXh0aWZ5U2NyaXB0KSB7XG4gICAgICBmbiA9IHJ1bkluVGhpc0NvbnRleHQoc291cmNlLCB7XG4gICAgICAgIGZpbGVuYW1lOiBubS5maWxlbmFtZSxcbiAgICAgICAgbGluZU9mZnNldDogMCxcbiAgICAgICAgZGlzcGxheUVycm9yczogdHJ1ZVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZuID0gcnVuSW5UaGlzQ29udGV4dChzb3VyY2UsIG5tLmZpbGVuYW1lLCB0cnVlKTtcbiAgICB9XG4gICAgZm4oaW50ZXJuYWxCaW5kaW5nKShubS5leHBvcnRzLCBjYWNoaW5nUmVxdWlyZSwgbm0sIG5tLmZpbGVuYW1lLCAnPG5vIGRpcm5hbWUgYXZhaWxhYmxlPicpXG4gICAgbm0ubG9hZGVkID0gdHJ1ZVxuICB9IGZpbmFsbHkge1xuICAgIG5tLmxvYWRpbmcgPSBmYWxzZVxuICAgIC8qaXN0YW5idWwgaWdub3JlIG5leHQqL1xuICAgIGlmIChzZXRWOEZsYWdzKSB7XG4gICAgICAvLyBSZWY6IGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9ibG9iLzU5MWEyNGI4MTlkNTNhNTU1NDYzYjFjYmY5MjkwYTZkOGJjYzFiY2IvbGliL2ludGVybmFsL2Jvb3RzdHJhcF9ub2RlLmpzI0w0MjktTDQzNFxuICAgICAgdmFyIHJlID0gL14tLWFsbG93Wy1fXW5hdGl2ZXNbLV9dc3ludGF4JC9cbiAgICAgIGlmICghcHJvY2Vzcy5leGVjQXJndi5zb21lKGZ1bmN0aW9uIChzKSB7IHJldHVybiByZS50ZXN0KHMpIH0pKVxuICAgICAgICByZXF1aXJlKCd2OCcpLnNldEZsYWdzRnJvbVN0cmluZygnLS1ub2FsbG93X25hdGl2ZXNfc3ludGF4JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbm0uZXhwb3J0c1xufVxuXG5mdW5jdGlvbiBzcmMgKGlkKSB7XG4gIHJldHVybiBuYXRpdmVzW2lkXVxufVxuIiwiZnVuY3Rpb24gd2VicGFja0VtcHR5Q29udGV4dChyZXEpIHtcblx0dmFyIGUgPSBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiICsgcmVxICsgXCInXCIpO1xuXHRlLmNvZGUgPSAnTU9EVUxFX05PVF9GT1VORCc7XG5cdHRocm93IGU7XG59XG53ZWJwYWNrRW1wdHlDb250ZXh0LmtleXMgPSAoKSA9PiAoW10pO1xud2VicGFja0VtcHR5Q29udGV4dC5yZXNvbHZlID0gd2VicGFja0VtcHR5Q29udGV4dDtcbndlYnBhY2tFbXB0eUNvbnRleHQuaWQgPSAxMzkzO1xubW9kdWxlLmV4cG9ydHMgPSB3ZWJwYWNrRW1wdHlDb250ZXh0OyIsInZhciB3cmFwcHkgPSByZXF1aXJlKCd3cmFwcHknKVxubW9kdWxlLmV4cG9ydHMgPSB3cmFwcHkob25jZSlcbm1vZHVsZS5leHBvcnRzLnN0cmljdCA9IHdyYXBweShvbmNlU3RyaWN0KVxuXG5vbmNlLnByb3RvID0gb25jZShmdW5jdGlvbiAoKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShGdW5jdGlvbi5wcm90b3R5cGUsICdvbmNlJywge1xuICAgIHZhbHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gb25jZSh0aGlzKVxuICAgIH0sXG4gICAgY29uZmlndXJhYmxlOiB0cnVlXG4gIH0pXG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEZ1bmN0aW9uLnByb3RvdHlwZSwgJ29uY2VTdHJpY3QnLCB7XG4gICAgdmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBvbmNlU3RyaWN0KHRoaXMpXG4gICAgfSxcbiAgICBjb25maWd1cmFibGU6IHRydWVcbiAgfSlcbn0pXG5cbmZ1bmN0aW9uIG9uY2UgKGZuKSB7XG4gIHZhciBmID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChmLmNhbGxlZCkgcmV0dXJuIGYudmFsdWVcbiAgICBmLmNhbGxlZCA9IHRydWVcbiAgICByZXR1cm4gZi52YWx1ZSA9IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgfVxuICBmLmNhbGxlZCA9IGZhbHNlXG4gIHJldHVybiBmXG59XG5cbmZ1bmN0aW9uIG9uY2VTdHJpY3QgKGZuKSB7XG4gIHZhciBmID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChmLmNhbGxlZClcbiAgICAgIHRocm93IG5ldyBFcnJvcihmLm9uY2VFcnJvcilcbiAgICBmLmNhbGxlZCA9IHRydWVcbiAgICByZXR1cm4gZi52YWx1ZSA9IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgfVxuICB2YXIgbmFtZSA9IGZuLm5hbWUgfHwgJ0Z1bmN0aW9uIHdyYXBwZWQgd2l0aCBgb25jZWAnXG4gIGYub25jZUVycm9yID0gbmFtZSArIFwiIHNob3VsZG4ndCBiZSBjYWxsZWQgbW9yZSB0aGFuIG9uY2VcIlxuICBmLmNhbGxlZCA9IGZhbHNlXG4gIHJldHVybiBmXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIG92ZXJsb2FkRGVmc1xuLy8gc2VsZiwgb3ZlcmxvYWREZWZzXG52YXIgb3ZlcmxvYWQgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYsIHNlbGZTZXQgPSBmYWxzZSwgb3ZlcmxvYWREZWZzO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgIG92ZXJsb2FkRGVmcyA9IGFyZ3VtZW50c1swXTtcbiAgfSBlbHNlIHtcbiAgICBzZWxmU2V0ID0gdHJ1ZTtcbiAgICBzZWxmID0gYXJndW1lbnRzWzBdO1xuICAgIG92ZXJsb2FkRGVmcyA9IGFyZ3VtZW50c1sxXTtcbiAgfVxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIGlmICghc2VsZlNldCkge1xuICAgICAgc2VsZiA9IHRoaXM7XG4gICAgfVxuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICB2YXIgb3ZlcmxvYWRNYXRjaERhdGEgPSBmaW5kT3ZlcmxvYWQob3ZlcmxvYWREZWZzLCBhcmdzKTtcbiAgICBpZiAoIW92ZXJsb2FkTWF0Y2hEYXRhKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoY3JlYXRlRXJyb3JNZXNzYWdlKCdObyBtYXRjaCBmb3VuZC4nLCBvdmVybG9hZERlZnMpKTtcbiAgICB9XG4gICAgdmFyIG92ZXJsb2FkRm4gPSBvdmVybG9hZE1hdGNoRGF0YS5kZWZbb3ZlcmxvYWRNYXRjaERhdGEuZGVmLmxlbmd0aCAtIDFdO1xuICAgIHJldHVybiBvdmVybG9hZEZuLmFwcGx5KHNlbGYsIG92ZXJsb2FkTWF0Y2hEYXRhLmFyZ3MpO1xuICB9O1xufTtcblxudmFyIGZpbmRPdmVybG9hZCA9IG92ZXJsb2FkLmZpbmRPdmVybG9hZCA9IGZ1bmN0aW9uIChvdmVybG9hZERlZnMsIGFyZ3MpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBvdmVybG9hZERlZnMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoaSA9PT0gb3ZlcmxvYWREZWZzLmxlbmd0aCAtIDEgJiYgdHlwZW9mKG92ZXJsb2FkRGVmc1tpXSkgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiB7IGFyZ3M6IGFyZ3MsIGRlZjogW292ZXJsb2FkRGVmc1tpXV0gfTtcbiAgICB9XG4gICAgdmFyIG5ld0FyZ3M7XG4gICAgaWYgKG5ld0FyZ3MgPSBpc01hdGNoKG92ZXJsb2FkRGVmc1tpXSwgYXJncykpIHtcbiAgICAgIHJldHVybiB7IGFyZ3M6IG5ld0FyZ3MsIGRlZjogb3ZlcmxvYWREZWZzW2ldIH07XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufTtcblxuZnVuY3Rpb24gaXNNYXRjaChvdmVybG9hZERlZiwgYXJncykge1xuICB2YXIgb3ZlcmxvYWREZWZJZHg7XG4gIHZhciBhcmdJZHg7XG4gIHZhciBuZXdBcmdzID0gW107XG4gIGZvciAob3ZlcmxvYWREZWZJZHggPSAwLCBhcmdJZHggPSAwOyBvdmVybG9hZERlZklkeCA8IG92ZXJsb2FkRGVmLmxlbmd0aCAtIDE7IG92ZXJsb2FkRGVmSWR4KyspIHtcbiAgICBpZiAodHlwZW9mKG92ZXJsb2FkRGVmW292ZXJsb2FkRGVmSWR4XSkgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgb3ZlcmxvYWQgZGVmaW5pdGlvbi4gQXJyYXkgc2hvdWxkIG9ubHkgY29udGFpbiBmdW5jdGlvbnMuXCIpO1xuICAgIH1cbiAgICAvL2NvbnNvbGUubG9nKCdvdmVybG9hZERlZi9hcmc6Jywgb3ZlcmxvYWREZWZbb3ZlcmxvYWREZWZJZHhdLCBhcmdzW2FyZ0lkeF0pO1xuICAgIHZhciByZXN1bHQgPSBvdmVybG9hZERlZltvdmVybG9hZERlZklkeF0oYXJnc1thcmdJZHhdKTtcbiAgICAvL2NvbnNvbGUubG9nKCdyZXN1bHQ6JywgcmVzdWx0KTtcbiAgICBpZiAocmVzdWx0KSB7XG4gICAgICBpZiAocmVzdWx0Lmhhc093blByb3BlcnR5KCdkZWZhdWx0VmFsdWUnKSkge1xuICAgICAgICBuZXdBcmdzLnB1c2gocmVzdWx0LmRlZmF1bHRWYWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAob3ZlcmxvYWREZWZbb3ZlcmxvYWREZWZJZHhdLm9wdGlvbmFsICYmIGFyZ3NbYXJnSWR4XSA9PT0gbnVsbCkge1xuICAgICAgICAgIGFyZ0lkeCsrO1xuICAgICAgICAgIG5ld0FyZ3MucHVzaChvdmVybG9hZERlZltvdmVybG9hZERlZklkeF0uZGVmYXVsdFZhbHVlKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBuZXdBcmdzLnB1c2goYXJnc1thcmdJZHhdKTtcbiAgICAgICAgYXJnSWR4Kys7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChvdmVybG9hZERlZltvdmVybG9hZERlZklkeF0ub3B0aW9uYWwpIHtcbiAgICAgICAgbmV3QXJncy5wdXNoKG92ZXJsb2FkRGVmW292ZXJsb2FkRGVmSWR4XS5kZWZhdWx0VmFsdWUpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgLy9jb25zb2xlLmxvZygnY29tcGFyZXMnLCBvdmVybG9hZERlZklkeCwgb3ZlcmxvYWREZWYubGVuZ3RoIC0gMSwgYXJnSWR4LCBhcmdzLmxlbmd0aCwgbmV3QXJncy5sZW5ndGgpO1xuICBpZiAob3ZlcmxvYWREZWZJZHggPT09IG92ZXJsb2FkRGVmLmxlbmd0aCAtIDEgJiYgYXJnSWR4ID49IGFyZ3MubGVuZ3RoKSB7XG4gICAgcmV0dXJuIG5ld0FyZ3M7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVFcnJvck1lc3NhZ2UobWVzc2FnZSwgb3ZlcmxvYWREZWZzKSB7XG4gIG1lc3NhZ2UgKz0gJ1xcbic7XG4gIG1lc3NhZ2UgKz0gJyAgUG9zc2libGUgbWF0Y2hlczpcXG4nO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG92ZXJsb2FkRGVmcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBvdmVybG9hZERlZiA9IG92ZXJsb2FkRGVmc1tpXTtcbiAgICBpZiAodHlwZW9mKG92ZXJsb2FkRGVmKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgbWVzc2FnZSArPSAnICAgW2RlZmF1bHRdXFxuJztcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIG1hdGNoZXJzID0gb3ZlcmxvYWREZWYuc2xpY2UoMCwgb3ZlcmxvYWREZWYubGVuZ3RoIC0gMSk7XG4gICAgICBtYXRjaGVycyA9IG1hdGNoZXJzLm1hcChmdW5jdGlvbiAobSkge1xuICAgICAgICBpZiAoIW0pIHtcbiAgICAgICAgICByZXR1cm4gJ1tpbnZhbGlkIGFyZ3VtZW50IGRlZmluaXRpb25dJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbS5uYW1lIHx8IG07XG4gICAgICB9KTtcbiAgICAgIGlmIChtYXRjaGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgbWVzc2FnZSArPSAnICAgKClcXG4nO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWVzc2FnZSArPSAnICAgKCcgKyBtYXRjaGVycy5qb2luKCcsICcpICsgJylcXG4nO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gbWVzc2FnZTtcbn1cblxuLy8gLS0tIGZ1bmNcbm92ZXJsb2FkLmZ1bmMgPSBmdW5jdGlvbiBmdW5jKGFyZykge1xuICByZXR1cm4gdHlwZW9mKGFyZykgPT09ICdmdW5jdGlvbic7XG59O1xuXG5vdmVybG9hZC5mdW5jT3B0aW9uYWwgPSBmdW5jdGlvbiBmdW5jT3B0aW9uYWwoYXJnKSB7XG4gIGlmICghYXJnKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIG92ZXJsb2FkLmZ1bmMoYXJnKTtcbn07XG5vdmVybG9hZC5mdW5jT3B0aW9uYWwub3B0aW9uYWwgPSB0cnVlO1xuXG5vdmVybG9hZC5mdW5jT3B0aW9uYWxXaXRoRGVmYXVsdCA9IGZ1bmN0aW9uIChkZWYpIHtcbiAgdmFyIGZuID0gZnVuY3Rpb24gZnVuY09wdGlvbmFsV2l0aERlZmF1bHQoYXJnKSB7XG4gICAgaWYgKGFyZyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBvdmVybG9hZC5mdW5jKGFyZyk7XG4gIH07XG4gIGZuLm9wdGlvbmFsID0gdHJ1ZTtcbiAgZm4uZGVmYXVsdFZhbHVlID0gZGVmO1xuICByZXR1cm4gZm47XG59O1xuXG4vLyAtLS0gY2FsbGJhY2tcbm92ZXJsb2FkLmNhbGxiYWNrT3B0aW9uYWwgPSBmdW5jdGlvbiBjYWxsYmFja09wdGlvbmFsKGFyZykge1xuICBpZiAoIWFyZykge1xuICAgIHJldHVybiB7IGRlZmF1bHRWYWx1ZTogZnVuY3Rpb24gZGVmYXVsdENhbGxiYWNrKCkge30gfTtcbiAgfVxuICByZXR1cm4gb3ZlcmxvYWQuZnVuYyhhcmcpO1xufTtcbm92ZXJsb2FkLmNhbGxiYWNrT3B0aW9uYWwub3B0aW9uYWwgPSB0cnVlO1xuXG4vLyAtLS0gc3RyaW5nXG5vdmVybG9hZC5zdHJpbmcgPSBmdW5jdGlvbiBzdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YoYXJnKSA9PT0gJ3N0cmluZyc7XG59O1xuXG5vdmVybG9hZC5zdHJpbmdPcHRpb25hbCA9IGZ1bmN0aW9uIHN0cmluZ09wdGlvbmFsKGFyZykge1xuICBpZiAoIWFyZykge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBvdmVybG9hZC5zdHJpbmcoYXJnKTtcbn07XG5vdmVybG9hZC5zdHJpbmdPcHRpb25hbC5vcHRpb25hbCA9IHRydWU7XG5cbm92ZXJsb2FkLnN0cmluZ09wdGlvbmFsV2l0aERlZmF1bHQgPSBmdW5jdGlvbiAoZGVmKSB7XG4gIHZhciBmbiA9IGZ1bmN0aW9uIHN0cmluZ09wdGlvbmFsV2l0aERlZmF1bHQoYXJnKSB7XG4gICAgaWYgKGFyZyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBvdmVybG9hZC5zdHJpbmcoYXJnKTtcbiAgfTtcbiAgZm4ub3B0aW9uYWwgPSB0cnVlO1xuICBmbi5kZWZhdWx0VmFsdWUgPSBkZWY7XG4gIHJldHVybiBmbjtcbn07XG5cbi8vIC0tLSBudW1iZXJcbm92ZXJsb2FkLm51bWJlciA9IGZ1bmN0aW9uIG51bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZihhcmcpID09PSAnbnVtYmVyJztcbn07XG5cbm92ZXJsb2FkLm51bWJlck9wdGlvbmFsID0gZnVuY3Rpb24gbnVtYmVyT3B0aW9uYWwoYXJnKSB7XG4gIGlmICghYXJnKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIG92ZXJsb2FkLm51bWJlcihhcmcpO1xufTtcbm92ZXJsb2FkLm51bWJlck9wdGlvbmFsLm9wdGlvbmFsID0gdHJ1ZTtcblxub3ZlcmxvYWQubnVtYmVyT3B0aW9uYWxXaXRoRGVmYXVsdCA9IGZ1bmN0aW9uIChkZWYpIHtcbiAgdmFyIGZuID0gZnVuY3Rpb24gbnVtYmVyT3B0aW9uYWxXaXRoRGVmYXVsdChhcmcpIHtcbiAgICBpZiAoYXJnID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIG92ZXJsb2FkLm51bWJlcihhcmcpO1xuICB9O1xuICBmbi5vcHRpb25hbCA9IHRydWU7XG4gIGZuLmRlZmF1bHRWYWx1ZSA9IGRlZjtcbiAgcmV0dXJuIGZuO1xufTtcblxuLy8gLS0tIGFycmF5XG5vdmVybG9hZC5hcnJheSA9IGZ1bmN0aW9uIGFycmF5KGFyZykge1xuICByZXR1cm4gYXJnIGluc3RhbmNlb2YgQXJyYXk7XG59O1xuXG5vdmVybG9hZC5hcnJheU9wdGlvbmFsID0gZnVuY3Rpb24gYXJyYXlPcHRpb25hbChhcmcpIHtcbiAgaWYgKCFhcmcpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gb3ZlcmxvYWQuYXJyYXkoYXJnKTtcbn07XG5vdmVybG9hZC5hcnJheU9wdGlvbmFsLm9wdGlvbmFsID0gdHJ1ZTtcblxub3ZlcmxvYWQuYXJyYXlPcHRpb25hbFdpdGhEZWZhdWx0ID0gZnVuY3Rpb24gKGRlZikge1xuICB2YXIgZm4gPSBmdW5jdGlvbiBhcnJheU9wdGlvbmFsV2l0aERlZmF1bHQoYXJnKSB7XG4gICAgaWYgKGFyZyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBvdmVybG9hZC5hcnJheShhcmcpO1xuICB9O1xuICBmbi5vcHRpb25hbCA9IHRydWU7XG4gIGZuLmRlZmF1bHRWYWx1ZSA9IGRlZjtcbiAgcmV0dXJuIGZuO1xufTtcblxuLy8gLS0tIG9iamVjdFxub3ZlcmxvYWQub2JqZWN0ID0gZnVuY3Rpb24gb2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mKGFyZykgPT09ICdvYmplY3QnO1xufTtcblxub3ZlcmxvYWQub2JqZWN0T3B0aW9uYWwgPSBmdW5jdGlvbiBvYmplY3RPcHRpb25hbChhcmcpIHtcbiAgaWYgKCFhcmcpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gb3ZlcmxvYWQub2JqZWN0KGFyZyk7XG59O1xub3ZlcmxvYWQub2JqZWN0T3B0aW9uYWwub3B0aW9uYWwgPSB0cnVlO1xuXG5vdmVybG9hZC5vYmplY3RPcHRpb25hbFdpdGhEZWZhdWx0ID0gZnVuY3Rpb24gKGRlZikge1xuICB2YXIgZm4gPSBmdW5jdGlvbiBvYmplY3RPcHRpb25hbFdpdGhEZWZhdWx0KGFyZykge1xuICAgIGlmIChhcmcgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gb3ZlcmxvYWQub2JqZWN0KGFyZyk7XG4gIH07XG4gIGZuLm9wdGlvbmFsID0gdHJ1ZTtcbiAgZm4uZGVmYXVsdFZhbHVlID0gZGVmO1xuICByZXR1cm4gZm47XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBwb3NpeChwYXRoKSB7XG5cdHJldHVybiBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xufVxuXG5mdW5jdGlvbiB3aW4zMihwYXRoKSB7XG5cdC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9ibG9iL2IzZmNjMjQ1ZmIyNTUzOTkwOWVmMWQ1ZWFhMDFkYmY5MmUxNjg2MzMvbGliL3BhdGguanMjTDU2XG5cdHZhciBzcGxpdERldmljZVJlID0gL14oW2EtekEtWl06fFtcXFxcXFwvXXsyfVteXFxcXFxcL10rW1xcXFxcXC9dK1teXFxcXFxcL10rKT8oW1xcXFxcXC9dKT8oW1xcc1xcU10qPykkLztcblx0dmFyIHJlc3VsdCA9IHNwbGl0RGV2aWNlUmUuZXhlYyhwYXRoKTtcblx0dmFyIGRldmljZSA9IHJlc3VsdFsxXSB8fCAnJztcblx0dmFyIGlzVW5jID0gQm9vbGVhbihkZXZpY2UgJiYgZGV2aWNlLmNoYXJBdCgxKSAhPT0gJzonKTtcblxuXHQvLyBVTkMgcGF0aHMgYXJlIGFsd2F5cyBhYnNvbHV0ZVxuXHRyZXR1cm4gQm9vbGVhbihyZXN1bHRbMl0gfHwgaXNVbmMpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicgPyB3aW4zMiA6IHBvc2l4O1xubW9kdWxlLmV4cG9ydHMucG9zaXggPSBwb3NpeDtcbm1vZHVsZS5leHBvcnRzLndpbjMyID0gd2luMzI7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gUHVsbFN0cmVhbTtcblxucmVxdWlyZShcInNldGltbWVkaWF0ZVwiKTtcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJ1dGlsXCIpLmluaGVyaXRzO1xudmFyIFBhc3NUaHJvdWdoID0gcmVxdWlyZSgncmVhZGFibGUtc3RyZWFtL3Bhc3N0aHJvdWdoJyk7XG52YXIgb3ZlciA9IHJlcXVpcmUoJ292ZXInKTtcbnZhciBTbGljZVN0cmVhbSA9IHJlcXVpcmUoJ3NsaWNlLXN0cmVhbScpO1xuXG5mdW5jdGlvbiBQdWxsU3RyZWFtKG9wdHMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLm9wdHMgPSBvcHRzIHx8IHt9O1xuICBQYXNzVGhyb3VnaC5jYWxsKHRoaXMsIG9wdHMpO1xuICB0aGlzLm9uY2UoJ2ZpbmlzaCcsIGZ1bmN0aW9uKCkge1xuICAgIHNlbGYuX3dyaXRlc0ZpbmlzaGVkID0gdHJ1ZTtcbiAgICBpZiAoc2VsZi5fZmx1c2hlZCkge1xuICAgICAgc2VsZi5fZmluaXNoKCk7XG4gICAgfVxuICB9KTtcbiAgdGhpcy5vbigncmVhZGFibGUnLCBmdW5jdGlvbigpIHtcbiAgICBzZWxmLl9wcm9jZXNzKCk7XG4gIH0pO1xufVxuaW5oZXJpdHMoUHVsbFN0cmVhbSwgUGFzc1Rocm91Z2gpO1xuXG5QdWxsU3RyZWFtLnByb3RvdHlwZS5wdWxsID0gb3ZlcihbXG4gIFtvdmVyLm51bWJlck9wdGlvbmFsV2l0aERlZmF1bHQobnVsbCksIG92ZXIuZnVuYywgZnVuY3Rpb24gKGxlbiwgY2FsbGJhY2spIHtcbiAgICBpZiAobGVuID09PSAwKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgbmV3IEJ1ZmZlcigwKSk7XG4gICAgfVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHB1bGxTZXJ2aWNlUmVxdWVzdCgpO1xuXG4gICAgZnVuY3Rpb24gcHVsbFNlcnZpY2VSZXF1ZXN0KCkge1xuICAgICAgc2VsZi5fc2VydmljZVJlcXVlc3RzID0gbnVsbDtcbiAgICAgIGlmIChzZWxmLl9mbHVzaGVkKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ0VuZCBvZiBTdHJlYW0nKSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBkYXRhID0gc2VsZi5yZWFkKGxlbiB8fCB1bmRlZmluZWQpO1xuICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgc2V0SW1tZWRpYXRlKGNhbGxiYWNrLmJpbmQobnVsbCwgbnVsbCwgZGF0YSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5fc2VydmljZVJlcXVlc3RzID0gcHVsbFNlcnZpY2VSZXF1ZXN0O1xuICAgICAgfVxuICAgIH1cbiAgfV1cbl0pO1xuXG5QdWxsU3RyZWFtLnByb3RvdHlwZS5wdWxsVXBUbyA9IG92ZXIoW1xuICBbb3Zlci5udW1iZXJPcHRpb25hbFdpdGhEZWZhdWx0KG51bGwpLCBmdW5jdGlvbiAobGVuKSB7XG4gICAgdmFyIGRhdGEgPSB0aGlzLnJlYWQobGVuKTtcbiAgICBpZiAobGVuICYmICFkYXRhKSB7XG4gICAgICBkYXRhID0gdGhpcy5yZWFkKCk7XG4gICAgfVxuICAgIHJldHVybiBkYXRhO1xuICB9XVxuXSk7XG5cblB1bGxTdHJlYW0ucHJvdG90eXBlLnBpcGUgPSBvdmVyKFtcbiAgW292ZXIubnVtYmVyT3B0aW9uYWxXaXRoRGVmYXVsdChudWxsKSwgb3Zlci5vYmplY3QsIGZ1bmN0aW9uIChsZW4sIGRlc3RTdHJlYW0pIHtcbiAgICBpZiAoIWxlbikge1xuICAgICAgcmV0dXJuIFBhc3NUaHJvdWdoLnByb3RvdHlwZS5waXBlLmNhbGwodGhpcywgZGVzdFN0cmVhbSk7XG4gICAgfVxuXG4gICAgaWYgKGxlbiA9PT0gMCkge1xuICAgICAgcmV0dXJuIGRlc3RTdHJlYW0uZW5kKCk7XG4gICAgfVxuXG5cbiAgICB2YXIgcHVsbHN0cmVhbSA9IHRoaXM7XG4gICAgcHVsbHN0cmVhbVxuICAgICAgLnBpcGUobmV3IFNsaWNlU3RyZWFtKHsgbGVuZ3RoOiBsZW4gfSwgZnVuY3Rpb24gKGJ1Ziwgc2xpY2VFbmQsIGV4dHJhKSB7XG4gICAgICAgIGlmICghc2xpY2VFbmQpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5wdXNoKGJ1Zik7XG4gICAgICAgIH1cbiAgICAgICAgcHVsbHN0cmVhbS51bnBpcGUoKTtcbiAgICAgICAgcHVsbHN0cmVhbS51bnNoaWZ0KGV4dHJhKTtcbiAgICAgICAgdGhpcy5wdXNoKGJ1Zik7XG4gICAgICAgIHJldHVybiB0aGlzLnB1c2gobnVsbCk7XG4gICAgICB9KSlcbiAgICAgIC5waXBlKGRlc3RTdHJlYW0pO1xuXG4gICAgcmV0dXJuIGRlc3RTdHJlYW07XG4gIH1dXG5dKTtcblxuUHVsbFN0cmVhbS5wcm90b3R5cGUuX3Byb2Nlc3MgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLl9zZXJ2aWNlUmVxdWVzdHMpIHtcbiAgICB0aGlzLl9zZXJ2aWNlUmVxdWVzdHMoKTtcbiAgfVxufTtcblxuUHVsbFN0cmVhbS5wcm90b3R5cGUucHJlcGVuZCA9IGZ1bmN0aW9uIChjaHVuaykge1xuICB0aGlzLnVuc2hpZnQoY2h1bmspO1xufTtcblxuUHVsbFN0cmVhbS5wcm90b3R5cGUuZHJhaW4gPSBmdW5jdGlvbiAobGVuLCBjYWxsYmFjaykge1xuICBpZiAodGhpcy5fZmx1c2hlZCkge1xuICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ0VuZCBvZiBTdHJlYW0nKSk7XG4gIH1cblxuICB2YXIgZGF0YSA9IHRoaXMucHVsbFVwVG8obGVuKTtcbiAgdmFyIGJ5dGVzRHJhaW5lZCA9IGRhdGEgJiYgZGF0YS5sZW5ndGggfHwgMDtcbiAgaWYgKGJ5dGVzRHJhaW5lZCA9PT0gbGVuKSB7XG4gICAgIHNldEltbWVkaWF0ZShjYWxsYmFjayk7XG4gIH0gZWxzZSBpZiAoYnl0ZXNEcmFpbmVkID4gMCkge1xuICAgIHRoaXMuZHJhaW4obGVuIC0gYnl0ZXNEcmFpbmVkLCBjYWxsYmFjayk7XG4gIH0gZWxzZSB7XG4gICAgLy9pbnRlcm5hbCBidWZmZXIgaXMgZW1wdHksIHdhaXQgdW50aWwgZGF0YSBjYW4gYmUgY29uc3VtZWRcbiAgICB0aGlzLm9uY2UoJ3JlYWRhYmxlJywgdGhpcy5kcmFpbi5iaW5kKHRoaXMsIGxlbiAtIGJ5dGVzRHJhaW5lZCwgY2FsbGJhY2spKTtcbiAgfVxufTtcblxuUHVsbFN0cmVhbS5wcm90b3R5cGUuX2ZsdXNoID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHRoaXMuX3JlYWRhYmxlU3RhdGUubGVuZ3RoID4gMCkge1xuICAgIHJldHVybiBzZXRJbW1lZGlhdGUoc2VsZi5fZmx1c2guYmluZChzZWxmLCBjYWxsYmFjaykpO1xuICB9XG5cbiAgdGhpcy5fZmx1c2hlZCA9IHRydWU7XG4gIGlmIChzZWxmLl93cml0ZXNGaW5pc2hlZCkge1xuICAgIHNlbGYuX2ZpbmlzaChjYWxsYmFjayk7XG4gIH0gZWxzZSB7XG4gICAgY2FsbGJhY2soKTtcbiAgfVxufTtcblxuUHVsbFN0cmVhbS5wcm90b3R5cGUuX2ZpbmlzaCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICBpZiAodGhpcy5fc2VydmljZVJlcXVlc3RzKSB7XG4gICAgdGhpcy5fc2VydmljZVJlcXVlc3RzKCk7XG4gIH1cbiAgc2V0SW1tZWRpYXRlKGNhbGxiYWNrKTtcbn07XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gYSBkdXBsZXggc3RyZWFtIGlzIGp1c3QgYSBzdHJlYW0gdGhhdCBpcyBib3RoIHJlYWRhYmxlIGFuZCB3cml0YWJsZS5cbi8vIFNpbmNlIEpTIGRvZXNuJ3QgaGF2ZSBtdWx0aXBsZSBwcm90b3R5cGFsIGluaGVyaXRhbmNlLCB0aGlzIGNsYXNzXG4vLyBwcm90b3R5cGFsbHkgaW5oZXJpdHMgZnJvbSBSZWFkYWJsZSwgYW5kIHRoZW4gcGFyYXNpdGljYWxseSBmcm9tXG4vLyBXcml0YWJsZS5cblxubW9kdWxlLmV4cG9ydHMgPSBEdXBsZXg7XG5cbi8qPHJlcGxhY2VtZW50PiovXG52YXIgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgdmFyIGtleXMgPSBbXTtcbiAgZm9yICh2YXIga2V5IGluIG9iaikga2V5cy5wdXNoKGtleSk7XG4gIHJldHVybiBrZXlzO1xufVxuLyo8L3JlcGxhY2VtZW50PiovXG5cblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciB1dGlsID0gcmVxdWlyZSgnY29yZS11dGlsLWlzJyk7XG51dGlsLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG52YXIgUmVhZGFibGUgPSByZXF1aXJlKCcuL19zdHJlYW1fcmVhZGFibGUnKTtcbnZhciBXcml0YWJsZSA9IHJlcXVpcmUoJy4vX3N0cmVhbV93cml0YWJsZScpO1xuXG51dGlsLmluaGVyaXRzKER1cGxleCwgUmVhZGFibGUpO1xuXG5mb3JFYWNoKG9iamVjdEtleXMoV3JpdGFibGUucHJvdG90eXBlKSwgZnVuY3Rpb24obWV0aG9kKSB7XG4gIGlmICghRHVwbGV4LnByb3RvdHlwZVttZXRob2RdKVxuICAgIER1cGxleC5wcm90b3R5cGVbbWV0aG9kXSA9IFdyaXRhYmxlLnByb3RvdHlwZVttZXRob2RdO1xufSk7XG5cbmZ1bmN0aW9uIER1cGxleChvcHRpb25zKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBEdXBsZXgpKVxuICAgIHJldHVybiBuZXcgRHVwbGV4KG9wdGlvbnMpO1xuXG4gIFJlYWRhYmxlLmNhbGwodGhpcywgb3B0aW9ucyk7XG4gIFdyaXRhYmxlLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5yZWFkYWJsZSA9PT0gZmFsc2UpXG4gICAgdGhpcy5yZWFkYWJsZSA9IGZhbHNlO1xuXG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMud3JpdGFibGUgPT09IGZhbHNlKVxuICAgIHRoaXMud3JpdGFibGUgPSBmYWxzZTtcblxuICB0aGlzLmFsbG93SGFsZk9wZW4gPSB0cnVlO1xuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmFsbG93SGFsZk9wZW4gPT09IGZhbHNlKVxuICAgIHRoaXMuYWxsb3dIYWxmT3BlbiA9IGZhbHNlO1xuXG4gIHRoaXMub25jZSgnZW5kJywgb25lbmQpO1xufVxuXG4vLyB0aGUgbm8taGFsZi1vcGVuIGVuZm9yY2VyXG5mdW5jdGlvbiBvbmVuZCgpIHtcbiAgLy8gaWYgd2UgYWxsb3cgaGFsZi1vcGVuIHN0YXRlLCBvciBpZiB0aGUgd3JpdGFibGUgc2lkZSBlbmRlZCxcbiAgLy8gdGhlbiB3ZSdyZSBvay5cbiAgaWYgKHRoaXMuYWxsb3dIYWxmT3BlbiB8fCB0aGlzLl93cml0YWJsZVN0YXRlLmVuZGVkKVxuICAgIHJldHVybjtcblxuICAvLyBubyBtb3JlIGRhdGEgY2FuIGJlIHdyaXR0ZW4uXG4gIC8vIEJ1dCBhbGxvdyBtb3JlIHdyaXRlcyB0byBoYXBwZW4gaW4gdGhpcyB0aWNrLlxuICBwcm9jZXNzLm5leHRUaWNrKHRoaXMuZW5kLmJpbmQodGhpcykpO1xufVxuXG5mdW5jdGlvbiBmb3JFYWNoICh4cywgZikge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHhzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGYoeHNbaV0sIGkpO1xuICB9XG59XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gYSBwYXNzdGhyb3VnaCBzdHJlYW0uXG4vLyBiYXNpY2FsbHkganVzdCB0aGUgbW9zdCBtaW5pbWFsIHNvcnQgb2YgVHJhbnNmb3JtIHN0cmVhbS5cbi8vIEV2ZXJ5IHdyaXR0ZW4gY2h1bmsgZ2V0cyBvdXRwdXQgYXMtaXMuXG5cbm1vZHVsZS5leHBvcnRzID0gUGFzc1Rocm91Z2g7XG5cbnZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKCcuL19zdHJlYW1fdHJhbnNmb3JtJyk7XG5cbi8qPHJlcGxhY2VtZW50PiovXG52YXIgdXRpbCA9IHJlcXVpcmUoJ2NvcmUtdXRpbC1pcycpO1xudXRpbC5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxudXRpbC5pbmhlcml0cyhQYXNzVGhyb3VnaCwgVHJhbnNmb3JtKTtcblxuZnVuY3Rpb24gUGFzc1Rocm91Z2gob3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUGFzc1Rocm91Z2gpKVxuICAgIHJldHVybiBuZXcgUGFzc1Rocm91Z2gob3B0aW9ucyk7XG5cbiAgVHJhbnNmb3JtLmNhbGwodGhpcywgb3B0aW9ucyk7XG59XG5cblBhc3NUaHJvdWdoLnByb3RvdHlwZS5fdHJhbnNmb3JtID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nLCBjYikge1xuICBjYihudWxsLCBjaHVuayk7XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhZGFibGU7XG5cbi8qPHJlcGxhY2VtZW50PiovXG52YXIgaXNBcnJheSA9IHJlcXVpcmUoJ2lzYXJyYXknKTtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG5cbi8qPHJlcGxhY2VtZW50PiovXG52YXIgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyO1xuLyo8L3JlcGxhY2VtZW50PiovXG5cblJlYWRhYmxlLlJlYWRhYmxlU3RhdGUgPSBSZWFkYWJsZVN0YXRlO1xuXG52YXIgRUUgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG5cbi8qPHJlcGxhY2VtZW50PiovXG5pZiAoIUVFLmxpc3RlbmVyQ291bnQpIEVFLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHJldHVybiBlbWl0dGVyLmxpc3RlbmVycyh0eXBlKS5sZW5ndGg7XG59O1xuLyo8L3JlcGxhY2VtZW50PiovXG5cbnZhciBTdHJlYW0gPSByZXF1aXJlKCdzdHJlYW0nKTtcblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciB1dGlsID0gcmVxdWlyZSgnY29yZS11dGlsLWlzJyk7XG51dGlsLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG52YXIgU3RyaW5nRGVjb2RlcjtcblxudXRpbC5pbmhlcml0cyhSZWFkYWJsZSwgU3RyZWFtKTtcblxuZnVuY3Rpb24gUmVhZGFibGVTdGF0ZShvcHRpb25zLCBzdHJlYW0pIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgLy8gdGhlIHBvaW50IGF0IHdoaWNoIGl0IHN0b3BzIGNhbGxpbmcgX3JlYWQoKSB0byBmaWxsIHRoZSBidWZmZXJcbiAgLy8gTm90ZTogMCBpcyBhIHZhbGlkIHZhbHVlLCBtZWFucyBcImRvbid0IGNhbGwgX3JlYWQgcHJlZW1wdGl2ZWx5IGV2ZXJcIlxuICB2YXIgaHdtID0gb3B0aW9ucy5oaWdoV2F0ZXJNYXJrO1xuICB0aGlzLmhpZ2hXYXRlck1hcmsgPSAoaHdtIHx8IGh3bSA9PT0gMCkgPyBod20gOiAxNiAqIDEwMjQ7XG5cbiAgLy8gY2FzdCB0byBpbnRzLlxuICB0aGlzLmhpZ2hXYXRlck1hcmsgPSB+fnRoaXMuaGlnaFdhdGVyTWFyaztcblxuICB0aGlzLmJ1ZmZlciA9IFtdO1xuICB0aGlzLmxlbmd0aCA9IDA7XG4gIHRoaXMucGlwZXMgPSBudWxsO1xuICB0aGlzLnBpcGVzQ291bnQgPSAwO1xuICB0aGlzLmZsb3dpbmcgPSBmYWxzZTtcbiAgdGhpcy5lbmRlZCA9IGZhbHNlO1xuICB0aGlzLmVuZEVtaXR0ZWQgPSBmYWxzZTtcbiAgdGhpcy5yZWFkaW5nID0gZmFsc2U7XG5cbiAgLy8gSW4gc3RyZWFtcyB0aGF0IG5ldmVyIGhhdmUgYW55IGRhdGEsIGFuZCBkbyBwdXNoKG51bGwpIHJpZ2h0IGF3YXksXG4gIC8vIHRoZSBjb25zdW1lciBjYW4gbWlzcyB0aGUgJ2VuZCcgZXZlbnQgaWYgdGhleSBkbyBzb21lIEkvTyBiZWZvcmVcbiAgLy8gY29uc3VtaW5nIHRoZSBzdHJlYW0uICBTbywgd2UgZG9uJ3QgZW1pdCgnZW5kJykgdW50aWwgc29tZSByZWFkaW5nXG4gIC8vIGhhcHBlbnMuXG4gIHRoaXMuY2FsbGVkUmVhZCA9IGZhbHNlO1xuXG4gIC8vIGEgZmxhZyB0byBiZSBhYmxlIHRvIHRlbGwgaWYgdGhlIG9ud3JpdGUgY2IgaXMgY2FsbGVkIGltbWVkaWF0ZWx5LFxuICAvLyBvciBvbiBhIGxhdGVyIHRpY2suICBXZSBzZXQgdGhpcyB0byB0cnVlIGF0IGZpcnN0LCBiZWN1YXNlIGFueVxuICAvLyBhY3Rpb25zIHRoYXQgc2hvdWxkbid0IGhhcHBlbiB1bnRpbCBcImxhdGVyXCIgc2hvdWxkIGdlbmVyYWxseSBhbHNvXG4gIC8vIG5vdCBoYXBwZW4gYmVmb3JlIHRoZSBmaXJzdCB3cml0ZSBjYWxsLlxuICB0aGlzLnN5bmMgPSB0cnVlO1xuXG4gIC8vIHdoZW5ldmVyIHdlIHJldHVybiBudWxsLCB0aGVuIHdlIHNldCBhIGZsYWcgdG8gc2F5XG4gIC8vIHRoYXQgd2UncmUgYXdhaXRpbmcgYSAncmVhZGFibGUnIGV2ZW50IGVtaXNzaW9uLlxuICB0aGlzLm5lZWRSZWFkYWJsZSA9IGZhbHNlO1xuICB0aGlzLmVtaXR0ZWRSZWFkYWJsZSA9IGZhbHNlO1xuICB0aGlzLnJlYWRhYmxlTGlzdGVuaW5nID0gZmFsc2U7XG5cblxuICAvLyBvYmplY3Qgc3RyZWFtIGZsYWcuIFVzZWQgdG8gbWFrZSByZWFkKG4pIGlnbm9yZSBuIGFuZCB0b1xuICAvLyBtYWtlIGFsbCB0aGUgYnVmZmVyIG1lcmdpbmcgYW5kIGxlbmd0aCBjaGVja3MgZ28gYXdheVxuICB0aGlzLm9iamVjdE1vZGUgPSAhIW9wdGlvbnMub2JqZWN0TW9kZTtcblxuICAvLyBDcnlwdG8gaXMga2luZCBvZiBvbGQgYW5kIGNydXN0eS4gIEhpc3RvcmljYWxseSwgaXRzIGRlZmF1bHQgc3RyaW5nXG4gIC8vIGVuY29kaW5nIGlzICdiaW5hcnknIHNvIHdlIGhhdmUgdG8gbWFrZSB0aGlzIGNvbmZpZ3VyYWJsZS5cbiAgLy8gRXZlcnl0aGluZyBlbHNlIGluIHRoZSB1bml2ZXJzZSB1c2VzICd1dGY4JywgdGhvdWdoLlxuICB0aGlzLmRlZmF1bHRFbmNvZGluZyA9IG9wdGlvbnMuZGVmYXVsdEVuY29kaW5nIHx8ICd1dGY4JztcblxuICAvLyB3aGVuIHBpcGluZywgd2Ugb25seSBjYXJlIGFib3V0ICdyZWFkYWJsZScgZXZlbnRzIHRoYXQgaGFwcGVuXG4gIC8vIGFmdGVyIHJlYWQoKWluZyBhbGwgdGhlIGJ5dGVzIGFuZCBub3QgZ2V0dGluZyBhbnkgcHVzaGJhY2suXG4gIHRoaXMucmFuT3V0ID0gZmFsc2U7XG5cbiAgLy8gdGhlIG51bWJlciBvZiB3cml0ZXJzIHRoYXQgYXJlIGF3YWl0aW5nIGEgZHJhaW4gZXZlbnQgaW4gLnBpcGUoKXNcbiAgdGhpcy5hd2FpdERyYWluID0gMDtcblxuICAvLyBpZiB0cnVlLCBhIG1heWJlUmVhZE1vcmUgaGFzIGJlZW4gc2NoZWR1bGVkXG4gIHRoaXMucmVhZGluZ01vcmUgPSBmYWxzZTtcblxuICB0aGlzLmRlY29kZXIgPSBudWxsO1xuICB0aGlzLmVuY29kaW5nID0gbnVsbDtcbiAgaWYgKG9wdGlvbnMuZW5jb2RpbmcpIHtcbiAgICBpZiAoIVN0cmluZ0RlY29kZXIpXG4gICAgICBTdHJpbmdEZWNvZGVyID0gcmVxdWlyZSgnc3RyaW5nX2RlY29kZXIvJykuU3RyaW5nRGVjb2RlcjtcbiAgICB0aGlzLmRlY29kZXIgPSBuZXcgU3RyaW5nRGVjb2RlcihvcHRpb25zLmVuY29kaW5nKTtcbiAgICB0aGlzLmVuY29kaW5nID0gb3B0aW9ucy5lbmNvZGluZztcbiAgfVxufVxuXG5mdW5jdGlvbiBSZWFkYWJsZShvcHRpb25zKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBSZWFkYWJsZSkpXG4gICAgcmV0dXJuIG5ldyBSZWFkYWJsZShvcHRpb25zKTtcblxuICB0aGlzLl9yZWFkYWJsZVN0YXRlID0gbmV3IFJlYWRhYmxlU3RhdGUob3B0aW9ucywgdGhpcyk7XG5cbiAgLy8gbGVnYWN5XG4gIHRoaXMucmVhZGFibGUgPSB0cnVlO1xuXG4gIFN0cmVhbS5jYWxsKHRoaXMpO1xufVxuXG4vLyBNYW51YWxseSBzaG92ZSBzb21ldGhpbmcgaW50byB0aGUgcmVhZCgpIGJ1ZmZlci5cbi8vIFRoaXMgcmV0dXJucyB0cnVlIGlmIHRoZSBoaWdoV2F0ZXJNYXJrIGhhcyBub3QgYmVlbiBoaXQgeWV0LFxuLy8gc2ltaWxhciB0byBob3cgV3JpdGFibGUud3JpdGUoKSByZXR1cm5zIHRydWUgaWYgeW91IHNob3VsZFxuLy8gd3JpdGUoKSBzb21lIG1vcmUuXG5SZWFkYWJsZS5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZykge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9yZWFkYWJsZVN0YXRlO1xuXG4gIGlmICh0eXBlb2YgY2h1bmsgPT09ICdzdHJpbmcnICYmICFzdGF0ZS5vYmplY3RNb2RlKSB7XG4gICAgZW5jb2RpbmcgPSBlbmNvZGluZyB8fCBzdGF0ZS5kZWZhdWx0RW5jb2Rpbmc7XG4gICAgaWYgKGVuY29kaW5nICE9PSBzdGF0ZS5lbmNvZGluZykge1xuICAgICAgY2h1bmsgPSBuZXcgQnVmZmVyKGNodW5rLCBlbmNvZGluZyk7XG4gICAgICBlbmNvZGluZyA9ICcnO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZWFkYWJsZUFkZENodW5rKHRoaXMsIHN0YXRlLCBjaHVuaywgZW5jb2RpbmcsIGZhbHNlKTtcbn07XG5cbi8vIFVuc2hpZnQgc2hvdWxkICphbHdheXMqIGJlIHNvbWV0aGluZyBkaXJlY3RseSBvdXQgb2YgcmVhZCgpXG5SZWFkYWJsZS5wcm90b3R5cGUudW5zaGlmdCA9IGZ1bmN0aW9uKGNodW5rKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG4gIHJldHVybiByZWFkYWJsZUFkZENodW5rKHRoaXMsIHN0YXRlLCBjaHVuaywgJycsIHRydWUpO1xufTtcblxuZnVuY3Rpb24gcmVhZGFibGVBZGRDaHVuayhzdHJlYW0sIHN0YXRlLCBjaHVuaywgZW5jb2RpbmcsIGFkZFRvRnJvbnQpIHtcbiAgdmFyIGVyID0gY2h1bmtJbnZhbGlkKHN0YXRlLCBjaHVuayk7XG4gIGlmIChlcikge1xuICAgIHN0cmVhbS5lbWl0KCdlcnJvcicsIGVyKTtcbiAgfSBlbHNlIGlmIChjaHVuayA9PT0gbnVsbCB8fCBjaHVuayA9PT0gdW5kZWZpbmVkKSB7XG4gICAgc3RhdGUucmVhZGluZyA9IGZhbHNlO1xuICAgIGlmICghc3RhdGUuZW5kZWQpXG4gICAgICBvbkVvZkNodW5rKHN0cmVhbSwgc3RhdGUpO1xuICB9IGVsc2UgaWYgKHN0YXRlLm9iamVjdE1vZGUgfHwgY2h1bmsgJiYgY2h1bmsubGVuZ3RoID4gMCkge1xuICAgIGlmIChzdGF0ZS5lbmRlZCAmJiAhYWRkVG9Gcm9udCkge1xuICAgICAgdmFyIGUgPSBuZXcgRXJyb3IoJ3N0cmVhbS5wdXNoKCkgYWZ0ZXIgRU9GJyk7XG4gICAgICBzdHJlYW0uZW1pdCgnZXJyb3InLCBlKTtcbiAgICB9IGVsc2UgaWYgKHN0YXRlLmVuZEVtaXR0ZWQgJiYgYWRkVG9Gcm9udCkge1xuICAgICAgdmFyIGUgPSBuZXcgRXJyb3IoJ3N0cmVhbS51bnNoaWZ0KCkgYWZ0ZXIgZW5kIGV2ZW50Jyk7XG4gICAgICBzdHJlYW0uZW1pdCgnZXJyb3InLCBlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHN0YXRlLmRlY29kZXIgJiYgIWFkZFRvRnJvbnQgJiYgIWVuY29kaW5nKVxuICAgICAgICBjaHVuayA9IHN0YXRlLmRlY29kZXIud3JpdGUoY2h1bmspO1xuXG4gICAgICAvLyB1cGRhdGUgdGhlIGJ1ZmZlciBpbmZvLlxuICAgICAgc3RhdGUubGVuZ3RoICs9IHN0YXRlLm9iamVjdE1vZGUgPyAxIDogY2h1bmsubGVuZ3RoO1xuICAgICAgaWYgKGFkZFRvRnJvbnQpIHtcbiAgICAgICAgc3RhdGUuYnVmZmVyLnVuc2hpZnQoY2h1bmspO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdGUucmVhZGluZyA9IGZhbHNlO1xuICAgICAgICBzdGF0ZS5idWZmZXIucHVzaChjaHVuayk7XG4gICAgICB9XG5cbiAgICAgIGlmIChzdGF0ZS5uZWVkUmVhZGFibGUpXG4gICAgICAgIGVtaXRSZWFkYWJsZShzdHJlYW0pO1xuXG4gICAgICBtYXliZVJlYWRNb3JlKHN0cmVhbSwgc3RhdGUpO1xuICAgIH1cbiAgfSBlbHNlIGlmICghYWRkVG9Gcm9udCkge1xuICAgIHN0YXRlLnJlYWRpbmcgPSBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiBuZWVkTW9yZURhdGEoc3RhdGUpO1xufVxuXG5cblxuLy8gaWYgaXQncyBwYXN0IHRoZSBoaWdoIHdhdGVyIG1hcmssIHdlIGNhbiBwdXNoIGluIHNvbWUgbW9yZS5cbi8vIEFsc28sIGlmIHdlIGhhdmUgbm8gZGF0YSB5ZXQsIHdlIGNhbiBzdGFuZCBzb21lXG4vLyBtb3JlIGJ5dGVzLiAgVGhpcyBpcyB0byB3b3JrIGFyb3VuZCBjYXNlcyB3aGVyZSBod209MCxcbi8vIHN1Y2ggYXMgdGhlIHJlcGwuICBBbHNvLCBpZiB0aGUgcHVzaCgpIHRyaWdnZXJlZCBhXG4vLyByZWFkYWJsZSBldmVudCwgYW5kIHRoZSB1c2VyIGNhbGxlZCByZWFkKGxhcmdlTnVtYmVyKSBzdWNoIHRoYXRcbi8vIG5lZWRSZWFkYWJsZSB3YXMgc2V0LCB0aGVuIHdlIG91Z2h0IHRvIHB1c2ggbW9yZSwgc28gdGhhdCBhbm90aGVyXG4vLyAncmVhZGFibGUnIGV2ZW50IHdpbGwgYmUgdHJpZ2dlcmVkLlxuZnVuY3Rpb24gbmVlZE1vcmVEYXRhKHN0YXRlKSB7XG4gIHJldHVybiAhc3RhdGUuZW5kZWQgJiZcbiAgICAgICAgIChzdGF0ZS5uZWVkUmVhZGFibGUgfHxcbiAgICAgICAgICBzdGF0ZS5sZW5ndGggPCBzdGF0ZS5oaWdoV2F0ZXJNYXJrIHx8XG4gICAgICAgICAgc3RhdGUubGVuZ3RoID09PSAwKTtcbn1cblxuLy8gYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuXG5SZWFkYWJsZS5wcm90b3R5cGUuc2V0RW5jb2RpbmcgPSBmdW5jdGlvbihlbmMpIHtcbiAgaWYgKCFTdHJpbmdEZWNvZGVyKVxuICAgIFN0cmluZ0RlY29kZXIgPSByZXF1aXJlKCdzdHJpbmdfZGVjb2Rlci8nKS5TdHJpbmdEZWNvZGVyO1xuICB0aGlzLl9yZWFkYWJsZVN0YXRlLmRlY29kZXIgPSBuZXcgU3RyaW5nRGVjb2RlcihlbmMpO1xuICB0aGlzLl9yZWFkYWJsZVN0YXRlLmVuY29kaW5nID0gZW5jO1xufTtcblxuLy8gRG9uJ3QgcmFpc2UgdGhlIGh3bSA+IDEyOE1CXG52YXIgTUFYX0hXTSA9IDB4ODAwMDAwO1xuZnVuY3Rpb24gcm91bmRVcFRvTmV4dFBvd2VyT2YyKG4pIHtcbiAgaWYgKG4gPj0gTUFYX0hXTSkge1xuICAgIG4gPSBNQVhfSFdNO1xuICB9IGVsc2Uge1xuICAgIC8vIEdldCB0aGUgbmV4dCBoaWdoZXN0IHBvd2VyIG9mIDJcbiAgICBuLS07XG4gICAgZm9yICh2YXIgcCA9IDE7IHAgPCAzMjsgcCA8PD0gMSkgbiB8PSBuID4+IHA7XG4gICAgbisrO1xuICB9XG4gIHJldHVybiBuO1xufVxuXG5mdW5jdGlvbiBob3dNdWNoVG9SZWFkKG4sIHN0YXRlKSB7XG4gIGlmIChzdGF0ZS5sZW5ndGggPT09IDAgJiYgc3RhdGUuZW5kZWQpXG4gICAgcmV0dXJuIDA7XG5cbiAgaWYgKHN0YXRlLm9iamVjdE1vZGUpXG4gICAgcmV0dXJuIG4gPT09IDAgPyAwIDogMTtcblxuICBpZiAobiA9PT0gbnVsbCB8fCBpc05hTihuKSkge1xuICAgIC8vIG9ubHkgZmxvdyBvbmUgYnVmZmVyIGF0IGEgdGltZVxuICAgIGlmIChzdGF0ZS5mbG93aW5nICYmIHN0YXRlLmJ1ZmZlci5sZW5ndGgpXG4gICAgICByZXR1cm4gc3RhdGUuYnVmZmVyWzBdLmxlbmd0aDtcbiAgICBlbHNlXG4gICAgICByZXR1cm4gc3RhdGUubGVuZ3RoO1xuICB9XG5cbiAgaWYgKG4gPD0gMClcbiAgICByZXR1cm4gMDtcblxuICAvLyBJZiB3ZSdyZSBhc2tpbmcgZm9yIG1vcmUgdGhhbiB0aGUgdGFyZ2V0IGJ1ZmZlciBsZXZlbCxcbiAgLy8gdGhlbiByYWlzZSB0aGUgd2F0ZXIgbWFyay4gIEJ1bXAgdXAgdG8gdGhlIG5leHQgaGlnaGVzdFxuICAvLyBwb3dlciBvZiAyLCB0byBwcmV2ZW50IGluY3JlYXNpbmcgaXQgZXhjZXNzaXZlbHkgaW4gdGlueVxuICAvLyBhbW91bnRzLlxuICBpZiAobiA+IHN0YXRlLmhpZ2hXYXRlck1hcmspXG4gICAgc3RhdGUuaGlnaFdhdGVyTWFyayA9IHJvdW5kVXBUb05leHRQb3dlck9mMihuKTtcblxuICAvLyBkb24ndCBoYXZlIHRoYXQgbXVjaC4gIHJldHVybiBudWxsLCB1bmxlc3Mgd2UndmUgZW5kZWQuXG4gIGlmIChuID4gc3RhdGUubGVuZ3RoKSB7XG4gICAgaWYgKCFzdGF0ZS5lbmRlZCkge1xuICAgICAgc3RhdGUubmVlZFJlYWRhYmxlID0gdHJ1ZTtcbiAgICAgIHJldHVybiAwO1xuICAgIH0gZWxzZVxuICAgICAgcmV0dXJuIHN0YXRlLmxlbmd0aDtcbiAgfVxuXG4gIHJldHVybiBuO1xufVxuXG4vLyB5b3UgY2FuIG92ZXJyaWRlIGVpdGhlciB0aGlzIG1ldGhvZCwgb3IgdGhlIGFzeW5jIF9yZWFkKG4pIGJlbG93LlxuUmVhZGFibGUucHJvdG90eXBlLnJlYWQgPSBmdW5jdGlvbihuKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG4gIHN0YXRlLmNhbGxlZFJlYWQgPSB0cnVlO1xuICB2YXIgbk9yaWcgPSBuO1xuICB2YXIgcmV0O1xuXG4gIGlmICh0eXBlb2YgbiAhPT0gJ251bWJlcicgfHwgbiA+IDApXG4gICAgc3RhdGUuZW1pdHRlZFJlYWRhYmxlID0gZmFsc2U7XG5cbiAgLy8gaWYgd2UncmUgZG9pbmcgcmVhZCgwKSB0byB0cmlnZ2VyIGEgcmVhZGFibGUgZXZlbnQsIGJ1dCB3ZVxuICAvLyBhbHJlYWR5IGhhdmUgYSBidW5jaCBvZiBkYXRhIGluIHRoZSBidWZmZXIsIHRoZW4ganVzdCB0cmlnZ2VyXG4gIC8vIHRoZSAncmVhZGFibGUnIGV2ZW50IGFuZCBtb3ZlIG9uLlxuICBpZiAobiA9PT0gMCAmJlxuICAgICAgc3RhdGUubmVlZFJlYWRhYmxlICYmXG4gICAgICAoc3RhdGUubGVuZ3RoID49IHN0YXRlLmhpZ2hXYXRlck1hcmsgfHwgc3RhdGUuZW5kZWQpKSB7XG4gICAgZW1pdFJlYWRhYmxlKHRoaXMpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgbiA9IGhvd011Y2hUb1JlYWQobiwgc3RhdGUpO1xuXG4gIC8vIGlmIHdlJ3ZlIGVuZGVkLCBhbmQgd2UncmUgbm93IGNsZWFyLCB0aGVuIGZpbmlzaCBpdCB1cC5cbiAgaWYgKG4gPT09IDAgJiYgc3RhdGUuZW5kZWQpIHtcbiAgICByZXQgPSBudWxsO1xuXG4gICAgLy8gSW4gY2FzZXMgd2hlcmUgdGhlIGRlY29kZXIgZGlkIG5vdCByZWNlaXZlIGVub3VnaCBkYXRhXG4gICAgLy8gdG8gcHJvZHVjZSBhIGZ1bGwgY2h1bmssIHRoZW4gaW1tZWRpYXRlbHkgcmVjZWl2ZWQgYW5cbiAgICAvLyBFT0YsIHN0YXRlLmJ1ZmZlciB3aWxsIGNvbnRhaW4gWzxCdWZmZXIgPiwgPEJ1ZmZlciAwMCAuLi4+XS5cbiAgICAvLyBob3dNdWNoVG9SZWFkIHdpbGwgc2VlIHRoaXMgYW5kIGNvZXJjZSB0aGUgYW1vdW50IHRvXG4gICAgLy8gcmVhZCB0byB6ZXJvIChiZWNhdXNlIGl0J3MgbG9va2luZyBhdCB0aGUgbGVuZ3RoIG9mIHRoZVxuICAgIC8vIGZpcnN0IDxCdWZmZXIgPiBpbiBzdGF0ZS5idWZmZXIpLCBhbmQgd2UnbGwgZW5kIHVwIGhlcmUuXG4gICAgLy9cbiAgICAvLyBUaGlzIGNhbiBvbmx5IGhhcHBlbiB2aWEgc3RhdGUuZGVjb2RlciAtLSBubyBvdGhlciB2ZW51ZVxuICAgIC8vIGV4aXN0cyBmb3IgcHVzaGluZyBhIHplcm8tbGVuZ3RoIGNodW5rIGludG8gc3RhdGUuYnVmZmVyXG4gICAgLy8gYW5kIHRyaWdnZXJpbmcgdGhpcyBiZWhhdmlvci4gSW4gdGhpcyBjYXNlLCB3ZSByZXR1cm4gb3VyXG4gICAgLy8gcmVtYWluaW5nIGRhdGEgYW5kIGVuZCB0aGUgc3RyZWFtLCBpZiBhcHByb3ByaWF0ZS5cbiAgICBpZiAoc3RhdGUubGVuZ3RoID4gMCAmJiBzdGF0ZS5kZWNvZGVyKSB7XG4gICAgICByZXQgPSBmcm9tTGlzdChuLCBzdGF0ZSk7XG4gICAgICBzdGF0ZS5sZW5ndGggLT0gcmV0Lmxlbmd0aDtcbiAgICB9XG5cbiAgICBpZiAoc3RhdGUubGVuZ3RoID09PSAwKVxuICAgICAgZW5kUmVhZGFibGUodGhpcyk7XG5cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gQWxsIHRoZSBhY3R1YWwgY2h1bmsgZ2VuZXJhdGlvbiBsb2dpYyBuZWVkcyB0byBiZVxuICAvLyAqYmVsb3cqIHRoZSBjYWxsIHRvIF9yZWFkLiAgVGhlIHJlYXNvbiBpcyB0aGF0IGluIGNlcnRhaW5cbiAgLy8gc3ludGhldGljIHN0cmVhbSBjYXNlcywgc3VjaCBhcyBwYXNzdGhyb3VnaCBzdHJlYW1zLCBfcmVhZFxuICAvLyBtYXkgYmUgYSBjb21wbGV0ZWx5IHN5bmNocm9ub3VzIG9wZXJhdGlvbiB3aGljaCBtYXkgY2hhbmdlXG4gIC8vIHRoZSBzdGF0ZSBvZiB0aGUgcmVhZCBidWZmZXIsIHByb3ZpZGluZyBlbm91Z2ggZGF0YSB3aGVuXG4gIC8vIGJlZm9yZSB0aGVyZSB3YXMgKm5vdCogZW5vdWdoLlxuICAvL1xuICAvLyBTbywgdGhlIHN0ZXBzIGFyZTpcbiAgLy8gMS4gRmlndXJlIG91dCB3aGF0IHRoZSBzdGF0ZSBvZiB0aGluZ3Mgd2lsbCBiZSBhZnRlciB3ZSBkb1xuICAvLyBhIHJlYWQgZnJvbSB0aGUgYnVmZmVyLlxuICAvL1xuICAvLyAyLiBJZiB0aGF0IHJlc3VsdGluZyBzdGF0ZSB3aWxsIHRyaWdnZXIgYSBfcmVhZCwgdGhlbiBjYWxsIF9yZWFkLlxuICAvLyBOb3RlIHRoYXQgdGhpcyBtYXkgYmUgYXN5bmNocm9ub3VzLCBvciBzeW5jaHJvbm91cy4gIFllcywgaXQgaXNcbiAgLy8gZGVlcGx5IHVnbHkgdG8gd3JpdGUgQVBJcyB0aGlzIHdheSwgYnV0IHRoYXQgc3RpbGwgZG9lc24ndCBtZWFuXG4gIC8vIHRoYXQgdGhlIFJlYWRhYmxlIGNsYXNzIHNob3VsZCBiZWhhdmUgaW1wcm9wZXJseSwgYXMgc3RyZWFtcyBhcmVcbiAgLy8gZGVzaWduZWQgdG8gYmUgc3luYy9hc3luYyBhZ25vc3RpYy5cbiAgLy8gVGFrZSBub3RlIGlmIHRoZSBfcmVhZCBjYWxsIGlzIHN5bmMgb3IgYXN5bmMgKGllLCBpZiB0aGUgcmVhZCBjYWxsXG4gIC8vIGhhcyByZXR1cm5lZCB5ZXQpLCBzbyB0aGF0IHdlIGtub3cgd2hldGhlciBvciBub3QgaXQncyBzYWZlIHRvIGVtaXRcbiAgLy8gJ3JlYWRhYmxlJyBldGMuXG4gIC8vXG4gIC8vIDMuIEFjdHVhbGx5IHB1bGwgdGhlIHJlcXVlc3RlZCBjaHVua3Mgb3V0IG9mIHRoZSBidWZmZXIgYW5kIHJldHVybi5cblxuICAvLyBpZiB3ZSBuZWVkIGEgcmVhZGFibGUgZXZlbnQsIHRoZW4gd2UgbmVlZCB0byBkbyBzb21lIHJlYWRpbmcuXG4gIHZhciBkb1JlYWQgPSBzdGF0ZS5uZWVkUmVhZGFibGU7XG5cbiAgLy8gaWYgd2UgY3VycmVudGx5IGhhdmUgbGVzcyB0aGFuIHRoZSBoaWdoV2F0ZXJNYXJrLCB0aGVuIGFsc28gcmVhZCBzb21lXG4gIGlmIChzdGF0ZS5sZW5ndGggLSBuIDw9IHN0YXRlLmhpZ2hXYXRlck1hcmspXG4gICAgZG9SZWFkID0gdHJ1ZTtcblxuICAvLyBob3dldmVyLCBpZiB3ZSd2ZSBlbmRlZCwgdGhlbiB0aGVyZSdzIG5vIHBvaW50LCBhbmQgaWYgd2UncmUgYWxyZWFkeVxuICAvLyByZWFkaW5nLCB0aGVuIGl0J3MgdW5uZWNlc3NhcnkuXG4gIGlmIChzdGF0ZS5lbmRlZCB8fCBzdGF0ZS5yZWFkaW5nKVxuICAgIGRvUmVhZCA9IGZhbHNlO1xuXG4gIGlmIChkb1JlYWQpIHtcbiAgICBzdGF0ZS5yZWFkaW5nID0gdHJ1ZTtcbiAgICBzdGF0ZS5zeW5jID0gdHJ1ZTtcbiAgICAvLyBpZiB0aGUgbGVuZ3RoIGlzIGN1cnJlbnRseSB6ZXJvLCB0aGVuIHdlICpuZWVkKiBhIHJlYWRhYmxlIGV2ZW50LlxuICAgIGlmIChzdGF0ZS5sZW5ndGggPT09IDApXG4gICAgICBzdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuICAgIC8vIGNhbGwgaW50ZXJuYWwgcmVhZCBtZXRob2RcbiAgICB0aGlzLl9yZWFkKHN0YXRlLmhpZ2hXYXRlck1hcmspO1xuICAgIHN0YXRlLnN5bmMgPSBmYWxzZTtcbiAgfVxuXG4gIC8vIElmIF9yZWFkIGNhbGxlZCBpdHMgY2FsbGJhY2sgc3luY2hyb25vdXNseSwgdGhlbiBgcmVhZGluZ2BcbiAgLy8gd2lsbCBiZSBmYWxzZSwgYW5kIHdlIG5lZWQgdG8gcmUtZXZhbHVhdGUgaG93IG11Y2ggZGF0YSB3ZVxuICAvLyBjYW4gcmV0dXJuIHRvIHRoZSB1c2VyLlxuICBpZiAoZG9SZWFkICYmICFzdGF0ZS5yZWFkaW5nKVxuICAgIG4gPSBob3dNdWNoVG9SZWFkKG5PcmlnLCBzdGF0ZSk7XG5cbiAgaWYgKG4gPiAwKVxuICAgIHJldCA9IGZyb21MaXN0KG4sIHN0YXRlKTtcbiAgZWxzZVxuICAgIHJldCA9IG51bGw7XG5cbiAgaWYgKHJldCA9PT0gbnVsbCkge1xuICAgIHN0YXRlLm5lZWRSZWFkYWJsZSA9IHRydWU7XG4gICAgbiA9IDA7XG4gIH1cblxuICBzdGF0ZS5sZW5ndGggLT0gbjtcblxuICAvLyBJZiB3ZSBoYXZlIG5vdGhpbmcgaW4gdGhlIGJ1ZmZlciwgdGhlbiB3ZSB3YW50IHRvIGtub3dcbiAgLy8gYXMgc29vbiBhcyB3ZSAqZG8qIGdldCBzb21ldGhpbmcgaW50byB0aGUgYnVmZmVyLlxuICBpZiAoc3RhdGUubGVuZ3RoID09PSAwICYmICFzdGF0ZS5lbmRlZClcbiAgICBzdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuXG4gIC8vIElmIHdlIGhhcHBlbmVkIHRvIHJlYWQoKSBleGFjdGx5IHRoZSByZW1haW5pbmcgYW1vdW50IGluIHRoZVxuICAvLyBidWZmZXIsIGFuZCB0aGUgRU9GIGhhcyBiZWVuIHNlZW4gYXQgdGhpcyBwb2ludCwgdGhlbiBtYWtlIHN1cmVcbiAgLy8gdGhhdCB3ZSBlbWl0ICdlbmQnIG9uIHRoZSB2ZXJ5IG5leHQgdGljay5cbiAgaWYgKHN0YXRlLmVuZGVkICYmICFzdGF0ZS5lbmRFbWl0dGVkICYmIHN0YXRlLmxlbmd0aCA9PT0gMClcbiAgICBlbmRSZWFkYWJsZSh0aGlzKTtcblxuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gY2h1bmtJbnZhbGlkKHN0YXRlLCBjaHVuaykge1xuICB2YXIgZXIgPSBudWxsO1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihjaHVuaykgJiZcbiAgICAgICdzdHJpbmcnICE9PSB0eXBlb2YgY2h1bmsgJiZcbiAgICAgIGNodW5rICE9PSBudWxsICYmXG4gICAgICBjaHVuayAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAhc3RhdGUub2JqZWN0TW9kZSkge1xuICAgIGVyID0gbmV3IFR5cGVFcnJvcignSW52YWxpZCBub24tc3RyaW5nL2J1ZmZlciBjaHVuaycpO1xuICB9XG4gIHJldHVybiBlcjtcbn1cblxuXG5mdW5jdGlvbiBvbkVvZkNodW5rKHN0cmVhbSwgc3RhdGUpIHtcbiAgaWYgKHN0YXRlLmRlY29kZXIgJiYgIXN0YXRlLmVuZGVkKSB7XG4gICAgdmFyIGNodW5rID0gc3RhdGUuZGVjb2Rlci5lbmQoKTtcbiAgICBpZiAoY2h1bmsgJiYgY2h1bmsubGVuZ3RoKSB7XG4gICAgICBzdGF0ZS5idWZmZXIucHVzaChjaHVuayk7XG4gICAgICBzdGF0ZS5sZW5ndGggKz0gc3RhdGUub2JqZWN0TW9kZSA/IDEgOiBjaHVuay5sZW5ndGg7XG4gICAgfVxuICB9XG4gIHN0YXRlLmVuZGVkID0gdHJ1ZTtcblxuICAvLyBpZiB3ZSd2ZSBlbmRlZCBhbmQgd2UgaGF2ZSBzb21lIGRhdGEgbGVmdCwgdGhlbiBlbWl0XG4gIC8vICdyZWFkYWJsZScgbm93IHRvIG1ha2Ugc3VyZSBpdCBnZXRzIHBpY2tlZCB1cC5cbiAgaWYgKHN0YXRlLmxlbmd0aCA+IDApXG4gICAgZW1pdFJlYWRhYmxlKHN0cmVhbSk7XG4gIGVsc2VcbiAgICBlbmRSZWFkYWJsZShzdHJlYW0pO1xufVxuXG4vLyBEb24ndCBlbWl0IHJlYWRhYmxlIHJpZ2h0IGF3YXkgaW4gc3luYyBtb2RlLCBiZWNhdXNlIHRoaXMgY2FuIHRyaWdnZXJcbi8vIGFub3RoZXIgcmVhZCgpIGNhbGwgPT4gc3RhY2sgb3ZlcmZsb3cuICBUaGlzIHdheSwgaXQgbWlnaHQgdHJpZ2dlclxuLy8gYSBuZXh0VGljayByZWN1cnNpb24gd2FybmluZywgYnV0IHRoYXQncyBub3Qgc28gYmFkLlxuZnVuY3Rpb24gZW1pdFJlYWRhYmxlKHN0cmVhbSkge1xuICB2YXIgc3RhdGUgPSBzdHJlYW0uX3JlYWRhYmxlU3RhdGU7XG4gIHN0YXRlLm5lZWRSZWFkYWJsZSA9IGZhbHNlO1xuICBpZiAoc3RhdGUuZW1pdHRlZFJlYWRhYmxlKVxuICAgIHJldHVybjtcblxuICBzdGF0ZS5lbWl0dGVkUmVhZGFibGUgPSB0cnVlO1xuICBpZiAoc3RhdGUuc3luYylcbiAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgZW1pdFJlYWRhYmxlXyhzdHJlYW0pO1xuICAgIH0pO1xuICBlbHNlXG4gICAgZW1pdFJlYWRhYmxlXyhzdHJlYW0pO1xufVxuXG5mdW5jdGlvbiBlbWl0UmVhZGFibGVfKHN0cmVhbSkge1xuICBzdHJlYW0uZW1pdCgncmVhZGFibGUnKTtcbn1cblxuXG4vLyBhdCB0aGlzIHBvaW50LCB0aGUgdXNlciBoYXMgcHJlc3VtYWJseSBzZWVuIHRoZSAncmVhZGFibGUnIGV2ZW50LFxuLy8gYW5kIGNhbGxlZCByZWFkKCkgdG8gY29uc3VtZSBzb21lIGRhdGEuICB0aGF0IG1heSBoYXZlIHRyaWdnZXJlZFxuLy8gaW4gdHVybiBhbm90aGVyIF9yZWFkKG4pIGNhbGwsIGluIHdoaWNoIGNhc2UgcmVhZGluZyA9IHRydWUgaWZcbi8vIGl0J3MgaW4gcHJvZ3Jlc3MuXG4vLyBIb3dldmVyLCBpZiB3ZSdyZSBub3QgZW5kZWQsIG9yIHJlYWRpbmcsIGFuZCB0aGUgbGVuZ3RoIDwgaHdtLFxuLy8gdGhlbiBnbyBhaGVhZCBhbmQgdHJ5IHRvIHJlYWQgc29tZSBtb3JlIHByZWVtcHRpdmVseS5cbmZ1bmN0aW9uIG1heWJlUmVhZE1vcmUoc3RyZWFtLCBzdGF0ZSkge1xuICBpZiAoIXN0YXRlLnJlYWRpbmdNb3JlKSB7XG4gICAgc3RhdGUucmVhZGluZ01vcmUgPSB0cnVlO1xuICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICBtYXliZVJlYWRNb3JlXyhzdHJlYW0sIHN0YXRlKTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBtYXliZVJlYWRNb3JlXyhzdHJlYW0sIHN0YXRlKSB7XG4gIHZhciBsZW4gPSBzdGF0ZS5sZW5ndGg7XG4gIHdoaWxlICghc3RhdGUucmVhZGluZyAmJiAhc3RhdGUuZmxvd2luZyAmJiAhc3RhdGUuZW5kZWQgJiZcbiAgICAgICAgIHN0YXRlLmxlbmd0aCA8IHN0YXRlLmhpZ2hXYXRlck1hcmspIHtcbiAgICBzdHJlYW0ucmVhZCgwKTtcbiAgICBpZiAobGVuID09PSBzdGF0ZS5sZW5ndGgpXG4gICAgICAvLyBkaWRuJ3QgZ2V0IGFueSBkYXRhLCBzdG9wIHNwaW5uaW5nLlxuICAgICAgYnJlYWs7XG4gICAgZWxzZVxuICAgICAgbGVuID0gc3RhdGUubGVuZ3RoO1xuICB9XG4gIHN0YXRlLnJlYWRpbmdNb3JlID0gZmFsc2U7XG59XG5cbi8vIGFic3RyYWN0IG1ldGhvZC4gIHRvIGJlIG92ZXJyaWRkZW4gaW4gc3BlY2lmaWMgaW1wbGVtZW50YXRpb24gY2xhc3Nlcy5cbi8vIGNhbGwgY2IoZXIsIGRhdGEpIHdoZXJlIGRhdGEgaXMgPD0gbiBpbiBsZW5ndGguXG4vLyBmb3IgdmlydHVhbCAobm9uLXN0cmluZywgbm9uLWJ1ZmZlcikgc3RyZWFtcywgXCJsZW5ndGhcIiBpcyBzb21ld2hhdFxuLy8gYXJiaXRyYXJ5LCBhbmQgcGVyaGFwcyBub3QgdmVyeSBtZWFuaW5nZnVsLlxuUmVhZGFibGUucHJvdG90eXBlLl9yZWFkID0gZnVuY3Rpb24obikge1xuICB0aGlzLmVtaXQoJ2Vycm9yJywgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKSk7XG59O1xuXG5SZWFkYWJsZS5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uKGRlc3QsIHBpcGVPcHRzKSB7XG4gIHZhciBzcmMgPSB0aGlzO1xuICB2YXIgc3RhdGUgPSB0aGlzLl9yZWFkYWJsZVN0YXRlO1xuXG4gIHN3aXRjaCAoc3RhdGUucGlwZXNDb3VudCkge1xuICAgIGNhc2UgMDpcbiAgICAgIHN0YXRlLnBpcGVzID0gZGVzdDtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMTpcbiAgICAgIHN0YXRlLnBpcGVzID0gW3N0YXRlLnBpcGVzLCBkZXN0XTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBzdGF0ZS5waXBlcy5wdXNoKGRlc3QpO1xuICAgICAgYnJlYWs7XG4gIH1cbiAgc3RhdGUucGlwZXNDb3VudCArPSAxO1xuXG4gIHZhciBkb0VuZCA9ICghcGlwZU9wdHMgfHwgcGlwZU9wdHMuZW5kICE9PSBmYWxzZSkgJiZcbiAgICAgICAgICAgICAgZGVzdCAhPT0gcHJvY2Vzcy5zdGRvdXQgJiZcbiAgICAgICAgICAgICAgZGVzdCAhPT0gcHJvY2Vzcy5zdGRlcnI7XG5cbiAgdmFyIGVuZEZuID0gZG9FbmQgPyBvbmVuZCA6IGNsZWFudXA7XG4gIGlmIChzdGF0ZS5lbmRFbWl0dGVkKVxuICAgIHByb2Nlc3MubmV4dFRpY2soZW5kRm4pO1xuICBlbHNlXG4gICAgc3JjLm9uY2UoJ2VuZCcsIGVuZEZuKTtcblxuICBkZXN0Lm9uKCd1bnBpcGUnLCBvbnVucGlwZSk7XG4gIGZ1bmN0aW9uIG9udW5waXBlKHJlYWRhYmxlKSB7XG4gICAgaWYgKHJlYWRhYmxlICE9PSBzcmMpIHJldHVybjtcbiAgICBjbGVhbnVwKCk7XG4gIH1cblxuICBmdW5jdGlvbiBvbmVuZCgpIHtcbiAgICBkZXN0LmVuZCgpO1xuICB9XG5cbiAgLy8gd2hlbiB0aGUgZGVzdCBkcmFpbnMsIGl0IHJlZHVjZXMgdGhlIGF3YWl0RHJhaW4gY291bnRlclxuICAvLyBvbiB0aGUgc291cmNlLiAgVGhpcyB3b3VsZCBiZSBtb3JlIGVsZWdhbnQgd2l0aCBhIC5vbmNlKClcbiAgLy8gaGFuZGxlciBpbiBmbG93KCksIGJ1dCBhZGRpbmcgYW5kIHJlbW92aW5nIHJlcGVhdGVkbHkgaXNcbiAgLy8gdG9vIHNsb3cuXG4gIHZhciBvbmRyYWluID0gcGlwZU9uRHJhaW4oc3JjKTtcbiAgZGVzdC5vbignZHJhaW4nLCBvbmRyYWluKTtcblxuICBmdW5jdGlvbiBjbGVhbnVwKCkge1xuICAgIC8vIGNsZWFudXAgZXZlbnQgaGFuZGxlcnMgb25jZSB0aGUgcGlwZSBpcyBicm9rZW5cbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdjbG9zZScsIG9uY2xvc2UpO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2ZpbmlzaCcsIG9uZmluaXNoKTtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdkcmFpbicsIG9uZHJhaW4pO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2Vycm9yJywgb25lcnJvcik7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcigndW5waXBlJywgb251bnBpcGUpO1xuICAgIHNyYy5yZW1vdmVMaXN0ZW5lcignZW5kJywgb25lbmQpO1xuICAgIHNyYy5yZW1vdmVMaXN0ZW5lcignZW5kJywgY2xlYW51cCk7XG5cbiAgICAvLyBpZiB0aGUgcmVhZGVyIGlzIHdhaXRpbmcgZm9yIGEgZHJhaW4gZXZlbnQgZnJvbSB0aGlzXG4gICAgLy8gc3BlY2lmaWMgd3JpdGVyLCB0aGVuIGl0IHdvdWxkIGNhdXNlIGl0IHRvIG5ldmVyIHN0YXJ0XG4gICAgLy8gZmxvd2luZyBhZ2Fpbi5cbiAgICAvLyBTbywgaWYgdGhpcyBpcyBhd2FpdGluZyBhIGRyYWluLCB0aGVuIHdlIGp1c3QgY2FsbCBpdCBub3cuXG4gICAgLy8gSWYgd2UgZG9uJ3Qga25vdywgdGhlbiBhc3N1bWUgdGhhdCB3ZSBhcmUgd2FpdGluZyBmb3Igb25lLlxuICAgIGlmICghZGVzdC5fd3JpdGFibGVTdGF0ZSB8fCBkZXN0Ll93cml0YWJsZVN0YXRlLm5lZWREcmFpbilcbiAgICAgIG9uZHJhaW4oKTtcbiAgfVxuXG4gIC8vIGlmIHRoZSBkZXN0IGhhcyBhbiBlcnJvciwgdGhlbiBzdG9wIHBpcGluZyBpbnRvIGl0LlxuICAvLyBob3dldmVyLCBkb24ndCBzdXBwcmVzcyB0aGUgdGhyb3dpbmcgYmVoYXZpb3IgZm9yIHRoaXMuXG4gIGZ1bmN0aW9uIG9uZXJyb3IoZXIpIHtcbiAgICB1bnBpcGUoKTtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdlcnJvcicsIG9uZXJyb3IpO1xuICAgIGlmIChFRS5saXN0ZW5lckNvdW50KGRlc3QsICdlcnJvcicpID09PSAwKVxuICAgICAgZGVzdC5lbWl0KCdlcnJvcicsIGVyKTtcbiAgfVxuICAvLyBUaGlzIGlzIGEgYnJ1dGFsbHkgdWdseSBoYWNrIHRvIG1ha2Ugc3VyZSB0aGF0IG91ciBlcnJvciBoYW5kbGVyXG4gIC8vIGlzIGF0dGFjaGVkIGJlZm9yZSBhbnkgdXNlcmxhbmQgb25lcy4gIE5FVkVSIERPIFRISVMuXG4gIGlmICghZGVzdC5fZXZlbnRzIHx8ICFkZXN0Ll9ldmVudHMuZXJyb3IpXG4gICAgZGVzdC5vbignZXJyb3InLCBvbmVycm9yKTtcbiAgZWxzZSBpZiAoaXNBcnJheShkZXN0Ll9ldmVudHMuZXJyb3IpKVxuICAgIGRlc3QuX2V2ZW50cy5lcnJvci51bnNoaWZ0KG9uZXJyb3IpO1xuICBlbHNlXG4gICAgZGVzdC5fZXZlbnRzLmVycm9yID0gW29uZXJyb3IsIGRlc3QuX2V2ZW50cy5lcnJvcl07XG5cblxuXG4gIC8vIEJvdGggY2xvc2UgYW5kIGZpbmlzaCBzaG91bGQgdHJpZ2dlciB1bnBpcGUsIGJ1dCBvbmx5IG9uY2UuXG4gIGZ1bmN0aW9uIG9uY2xvc2UoKSB7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignZmluaXNoJywgb25maW5pc2gpO1xuICAgIHVucGlwZSgpO1xuICB9XG4gIGRlc3Qub25jZSgnY2xvc2UnLCBvbmNsb3NlKTtcbiAgZnVuY3Rpb24gb25maW5pc2goKSB7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignY2xvc2UnLCBvbmNsb3NlKTtcbiAgICB1bnBpcGUoKTtcbiAgfVxuICBkZXN0Lm9uY2UoJ2ZpbmlzaCcsIG9uZmluaXNoKTtcblxuICBmdW5jdGlvbiB1bnBpcGUoKSB7XG4gICAgc3JjLnVucGlwZShkZXN0KTtcbiAgfVxuXG4gIC8vIHRlbGwgdGhlIGRlc3QgdGhhdCBpdCdzIGJlaW5nIHBpcGVkIHRvXG4gIGRlc3QuZW1pdCgncGlwZScsIHNyYyk7XG5cbiAgLy8gc3RhcnQgdGhlIGZsb3cgaWYgaXQgaGFzbid0IGJlZW4gc3RhcnRlZCBhbHJlYWR5LlxuICBpZiAoIXN0YXRlLmZsb3dpbmcpIHtcbiAgICAvLyB0aGUgaGFuZGxlciB0aGF0IHdhaXRzIGZvciByZWFkYWJsZSBldmVudHMgYWZ0ZXIgYWxsXG4gICAgLy8gdGhlIGRhdGEgZ2V0cyBzdWNrZWQgb3V0IGluIGZsb3cuXG4gICAgLy8gVGhpcyB3b3VsZCBiZSBlYXNpZXIgdG8gZm9sbG93IHdpdGggYSAub25jZSgpIGhhbmRsZXJcbiAgICAvLyBpbiBmbG93KCksIGJ1dCB0aGF0IGlzIHRvbyBzbG93LlxuICAgIHRoaXMub24oJ3JlYWRhYmxlJywgcGlwZU9uUmVhZGFibGUpO1xuXG4gICAgc3RhdGUuZmxvd2luZyA9IHRydWU7XG4gICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIGZsb3coc3JjKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBkZXN0O1xufTtcblxuZnVuY3Rpb24gcGlwZU9uRHJhaW4oc3JjKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZGVzdCA9IHRoaXM7XG4gICAgdmFyIHN0YXRlID0gc3JjLl9yZWFkYWJsZVN0YXRlO1xuICAgIHN0YXRlLmF3YWl0RHJhaW4tLTtcbiAgICBpZiAoc3RhdGUuYXdhaXREcmFpbiA9PT0gMClcbiAgICAgIGZsb3coc3JjKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZmxvdyhzcmMpIHtcbiAgdmFyIHN0YXRlID0gc3JjLl9yZWFkYWJsZVN0YXRlO1xuICB2YXIgY2h1bms7XG4gIHN0YXRlLmF3YWl0RHJhaW4gPSAwO1xuXG4gIGZ1bmN0aW9uIHdyaXRlKGRlc3QsIGksIGxpc3QpIHtcbiAgICB2YXIgd3JpdHRlbiA9IGRlc3Qud3JpdGUoY2h1bmspO1xuICAgIGlmIChmYWxzZSA9PT0gd3JpdHRlbikge1xuICAgICAgc3RhdGUuYXdhaXREcmFpbisrO1xuICAgIH1cbiAgfVxuXG4gIHdoaWxlIChzdGF0ZS5waXBlc0NvdW50ICYmIG51bGwgIT09IChjaHVuayA9IHNyYy5yZWFkKCkpKSB7XG5cbiAgICBpZiAoc3RhdGUucGlwZXNDb3VudCA9PT0gMSlcbiAgICAgIHdyaXRlKHN0YXRlLnBpcGVzLCAwLCBudWxsKTtcbiAgICBlbHNlXG4gICAgICBmb3JFYWNoKHN0YXRlLnBpcGVzLCB3cml0ZSk7XG5cbiAgICBzcmMuZW1pdCgnZGF0YScsIGNodW5rKTtcblxuICAgIC8vIGlmIGFueW9uZSBuZWVkcyBhIGRyYWluLCB0aGVuIHdlIGhhdmUgdG8gd2FpdCBmb3IgdGhhdC5cbiAgICBpZiAoc3RhdGUuYXdhaXREcmFpbiA+IDApXG4gICAgICByZXR1cm47XG4gIH1cblxuICAvLyBpZiBldmVyeSBkZXN0aW5hdGlvbiB3YXMgdW5waXBlZCwgZWl0aGVyIGJlZm9yZSBlbnRlcmluZyB0aGlzXG4gIC8vIGZ1bmN0aW9uLCBvciBpbiB0aGUgd2hpbGUgbG9vcCwgdGhlbiBzdG9wIGZsb3dpbmcuXG4gIC8vXG4gIC8vIE5COiBUaGlzIGlzIGEgcHJldHR5IHJhcmUgZWRnZSBjYXNlLlxuICBpZiAoc3RhdGUucGlwZXNDb3VudCA9PT0gMCkge1xuICAgIHN0YXRlLmZsb3dpbmcgPSBmYWxzZTtcblxuICAgIC8vIGlmIHRoZXJlIHdlcmUgZGF0YSBldmVudCBsaXN0ZW5lcnMgYWRkZWQsIHRoZW4gc3dpdGNoIHRvIG9sZCBtb2RlLlxuICAgIGlmIChFRS5saXN0ZW5lckNvdW50KHNyYywgJ2RhdGEnKSA+IDApXG4gICAgICBlbWl0RGF0YUV2ZW50cyhzcmMpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGF0IHRoaXMgcG9pbnQsIG5vIG9uZSBuZWVkZWQgYSBkcmFpbiwgc28gd2UganVzdCByYW4gb3V0IG9mIGRhdGFcbiAgLy8gb24gdGhlIG5leHQgcmVhZGFibGUgZXZlbnQsIHN0YXJ0IGl0IG92ZXIgYWdhaW4uXG4gIHN0YXRlLnJhbk91dCA9IHRydWU7XG59XG5cbmZ1bmN0aW9uIHBpcGVPblJlYWRhYmxlKCkge1xuICBpZiAodGhpcy5fcmVhZGFibGVTdGF0ZS5yYW5PdXQpIHtcbiAgICB0aGlzLl9yZWFkYWJsZVN0YXRlLnJhbk91dCA9IGZhbHNlO1xuICAgIGZsb3codGhpcyk7XG4gIH1cbn1cblxuXG5SZWFkYWJsZS5wcm90b3R5cGUudW5waXBlID0gZnVuY3Rpb24oZGVzdCkge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9yZWFkYWJsZVN0YXRlO1xuXG4gIC8vIGlmIHdlJ3JlIG5vdCBwaXBpbmcgYW55d2hlcmUsIHRoZW4gZG8gbm90aGluZy5cbiAgaWYgKHN0YXRlLnBpcGVzQ291bnQgPT09IDApXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8ganVzdCBvbmUgZGVzdGluYXRpb24uICBtb3N0IGNvbW1vbiBjYXNlLlxuICBpZiAoc3RhdGUucGlwZXNDb3VudCA9PT0gMSkge1xuICAgIC8vIHBhc3NlZCBpbiBvbmUsIGJ1dCBpdCdzIG5vdCB0aGUgcmlnaHQgb25lLlxuICAgIGlmIChkZXN0ICYmIGRlc3QgIT09IHN0YXRlLnBpcGVzKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAoIWRlc3QpXG4gICAgICBkZXN0ID0gc3RhdGUucGlwZXM7XG5cbiAgICAvLyBnb3QgYSBtYXRjaC5cbiAgICBzdGF0ZS5waXBlcyA9IG51bGw7XG4gICAgc3RhdGUucGlwZXNDb3VudCA9IDA7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcigncmVhZGFibGUnLCBwaXBlT25SZWFkYWJsZSk7XG4gICAgc3RhdGUuZmxvd2luZyA9IGZhbHNlO1xuICAgIGlmIChkZXN0KVxuICAgICAgZGVzdC5lbWl0KCd1bnBpcGUnLCB0aGlzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHNsb3cgY2FzZS4gbXVsdGlwbGUgcGlwZSBkZXN0aW5hdGlvbnMuXG5cbiAgaWYgKCFkZXN0KSB7XG4gICAgLy8gcmVtb3ZlIGFsbC5cbiAgICB2YXIgZGVzdHMgPSBzdGF0ZS5waXBlcztcbiAgICB2YXIgbGVuID0gc3RhdGUucGlwZXNDb3VudDtcbiAgICBzdGF0ZS5waXBlcyA9IG51bGw7XG4gICAgc3RhdGUucGlwZXNDb3VudCA9IDA7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcigncmVhZGFibGUnLCBwaXBlT25SZWFkYWJsZSk7XG4gICAgc3RhdGUuZmxvd2luZyA9IGZhbHNlO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGRlc3RzW2ldLmVtaXQoJ3VucGlwZScsIHRoaXMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gdHJ5IHRvIGZpbmQgdGhlIHJpZ2h0IG9uZS5cbiAgdmFyIGkgPSBpbmRleE9mKHN0YXRlLnBpcGVzLCBkZXN0KTtcbiAgaWYgKGkgPT09IC0xKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIHN0YXRlLnBpcGVzLnNwbGljZShpLCAxKTtcbiAgc3RhdGUucGlwZXNDb3VudCAtPSAxO1xuICBpZiAoc3RhdGUucGlwZXNDb3VudCA9PT0gMSlcbiAgICBzdGF0ZS5waXBlcyA9IHN0YXRlLnBpcGVzWzBdO1xuXG4gIGRlc3QuZW1pdCgndW5waXBlJywgdGhpcyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBzZXQgdXAgZGF0YSBldmVudHMgaWYgdGhleSBhcmUgYXNrZWQgZm9yXG4vLyBFbnN1cmUgcmVhZGFibGUgbGlzdGVuZXJzIGV2ZW50dWFsbHkgZ2V0IHNvbWV0aGluZ1xuUmVhZGFibGUucHJvdG90eXBlLm9uID0gZnVuY3Rpb24oZXYsIGZuKSB7XG4gIHZhciByZXMgPSBTdHJlYW0ucHJvdG90eXBlLm9uLmNhbGwodGhpcywgZXYsIGZuKTtcblxuICBpZiAoZXYgPT09ICdkYXRhJyAmJiAhdGhpcy5fcmVhZGFibGVTdGF0ZS5mbG93aW5nKVxuICAgIGVtaXREYXRhRXZlbnRzKHRoaXMpO1xuXG4gIGlmIChldiA9PT0gJ3JlYWRhYmxlJyAmJiB0aGlzLnJlYWRhYmxlKSB7XG4gICAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcbiAgICBpZiAoIXN0YXRlLnJlYWRhYmxlTGlzdGVuaW5nKSB7XG4gICAgICBzdGF0ZS5yZWFkYWJsZUxpc3RlbmluZyA9IHRydWU7XG4gICAgICBzdGF0ZS5lbWl0dGVkUmVhZGFibGUgPSBmYWxzZTtcbiAgICAgIHN0YXRlLm5lZWRSZWFkYWJsZSA9IHRydWU7XG4gICAgICBpZiAoIXN0YXRlLnJlYWRpbmcpIHtcbiAgICAgICAgdGhpcy5yZWFkKDApO1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZS5sZW5ndGgpIHtcbiAgICAgICAgZW1pdFJlYWRhYmxlKHRoaXMsIHN0YXRlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzO1xufTtcblJlYWRhYmxlLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IFJlYWRhYmxlLnByb3RvdHlwZS5vbjtcblxuLy8gcGF1c2UoKSBhbmQgcmVzdW1lKCkgYXJlIHJlbW5hbnRzIG9mIHRoZSBsZWdhY3kgcmVhZGFibGUgc3RyZWFtIEFQSVxuLy8gSWYgdGhlIHVzZXIgdXNlcyB0aGVtLCB0aGVuIHN3aXRjaCBpbnRvIG9sZCBtb2RlLlxuUmVhZGFibGUucHJvdG90eXBlLnJlc3VtZSA9IGZ1bmN0aW9uKCkge1xuICBlbWl0RGF0YUV2ZW50cyh0aGlzKTtcbiAgdGhpcy5yZWFkKDApO1xuICB0aGlzLmVtaXQoJ3Jlc3VtZScpO1xufTtcblxuUmVhZGFibGUucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gIGVtaXREYXRhRXZlbnRzKHRoaXMsIHRydWUpO1xuICB0aGlzLmVtaXQoJ3BhdXNlJyk7XG59O1xuXG5mdW5jdGlvbiBlbWl0RGF0YUV2ZW50cyhzdHJlYW0sIHN0YXJ0UGF1c2VkKSB7XG4gIHZhciBzdGF0ZSA9IHN0cmVhbS5fcmVhZGFibGVTdGF0ZTtcblxuICBpZiAoc3RhdGUuZmxvd2luZykge1xuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9pc2FhY3MvcmVhZGFibGUtc3RyZWFtL2lzc3Vlcy8xNlxuICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHN3aXRjaCB0byBvbGQgbW9kZSBub3cuJyk7XG4gIH1cblxuICB2YXIgcGF1c2VkID0gc3RhcnRQYXVzZWQgfHwgZmFsc2U7XG4gIHZhciByZWFkYWJsZSA9IGZhbHNlO1xuXG4gIC8vIGNvbnZlcnQgdG8gYW4gb2xkLXN0eWxlIHN0cmVhbS5cbiAgc3RyZWFtLnJlYWRhYmxlID0gdHJ1ZTtcbiAgc3RyZWFtLnBpcGUgPSBTdHJlYW0ucHJvdG90eXBlLnBpcGU7XG4gIHN0cmVhbS5vbiA9IHN0cmVhbS5hZGRMaXN0ZW5lciA9IFN0cmVhbS5wcm90b3R5cGUub247XG5cbiAgc3RyZWFtLm9uKCdyZWFkYWJsZScsIGZ1bmN0aW9uKCkge1xuICAgIHJlYWRhYmxlID0gdHJ1ZTtcblxuICAgIHZhciBjO1xuICAgIHdoaWxlICghcGF1c2VkICYmIChudWxsICE9PSAoYyA9IHN0cmVhbS5yZWFkKCkpKSlcbiAgICAgIHN0cmVhbS5lbWl0KCdkYXRhJywgYyk7XG5cbiAgICBpZiAoYyA9PT0gbnVsbCkge1xuICAgICAgcmVhZGFibGUgPSBmYWxzZTtcbiAgICAgIHN0cmVhbS5fcmVhZGFibGVTdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuICAgIH1cbiAgfSk7XG5cbiAgc3RyZWFtLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgcGF1c2VkID0gdHJ1ZTtcbiAgICB0aGlzLmVtaXQoJ3BhdXNlJyk7XG4gIH07XG5cbiAgc3RyZWFtLnJlc3VtZSA9IGZ1bmN0aW9uKCkge1xuICAgIHBhdXNlZCA9IGZhbHNlO1xuICAgIGlmIChyZWFkYWJsZSlcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICAgIHN0cmVhbS5lbWl0KCdyZWFkYWJsZScpO1xuICAgICAgfSk7XG4gICAgZWxzZVxuICAgICAgdGhpcy5yZWFkKDApO1xuICAgIHRoaXMuZW1pdCgncmVzdW1lJyk7XG4gIH07XG5cbiAgLy8gbm93IG1ha2UgaXQgc3RhcnQsIGp1c3QgaW4gY2FzZSBpdCBoYWRuJ3QgYWxyZWFkeS5cbiAgc3RyZWFtLmVtaXQoJ3JlYWRhYmxlJyk7XG59XG5cbi8vIHdyYXAgYW4gb2xkLXN0eWxlIHN0cmVhbSBhcyB0aGUgYXN5bmMgZGF0YSBzb3VyY2UuXG4vLyBUaGlzIGlzICpub3QqIHBhcnQgb2YgdGhlIHJlYWRhYmxlIHN0cmVhbSBpbnRlcmZhY2UuXG4vLyBJdCBpcyBhbiB1Z2x5IHVuZm9ydHVuYXRlIG1lc3Mgb2YgaGlzdG9yeS5cblJlYWRhYmxlLnByb3RvdHlwZS53cmFwID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG4gIHZhciBwYXVzZWQgPSBmYWxzZTtcblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHN0cmVhbS5vbignZW5kJywgZnVuY3Rpb24oKSB7XG4gICAgaWYgKHN0YXRlLmRlY29kZXIgJiYgIXN0YXRlLmVuZGVkKSB7XG4gICAgICB2YXIgY2h1bmsgPSBzdGF0ZS5kZWNvZGVyLmVuZCgpO1xuICAgICAgaWYgKGNodW5rICYmIGNodW5rLmxlbmd0aClcbiAgICAgICAgc2VsZi5wdXNoKGNodW5rKTtcbiAgICB9XG5cbiAgICBzZWxmLnB1c2gobnVsbCk7XG4gIH0pO1xuXG4gIHN0cmVhbS5vbignZGF0YScsIGZ1bmN0aW9uKGNodW5rKSB7XG4gICAgaWYgKHN0YXRlLmRlY29kZXIpXG4gICAgICBjaHVuayA9IHN0YXRlLmRlY29kZXIud3JpdGUoY2h1bmspO1xuXG4gICAgLy8gZG9uJ3Qgc2tpcCBvdmVyIGZhbHN5IHZhbHVlcyBpbiBvYmplY3RNb2RlXG4gICAgLy9pZiAoc3RhdGUub2JqZWN0TW9kZSAmJiB1dGlsLmlzTnVsbE9yVW5kZWZpbmVkKGNodW5rKSlcbiAgICBpZiAoc3RhdGUub2JqZWN0TW9kZSAmJiAoY2h1bmsgPT09IG51bGwgfHwgY2h1bmsgPT09IHVuZGVmaW5lZCkpXG4gICAgICByZXR1cm47XG4gICAgZWxzZSBpZiAoIXN0YXRlLm9iamVjdE1vZGUgJiYgKCFjaHVuayB8fCAhY2h1bmsubGVuZ3RoKSlcbiAgICAgIHJldHVybjtcblxuICAgIHZhciByZXQgPSBzZWxmLnB1c2goY2h1bmspO1xuICAgIGlmICghcmV0KSB7XG4gICAgICBwYXVzZWQgPSB0cnVlO1xuICAgICAgc3RyZWFtLnBhdXNlKCk7XG4gICAgfVxuICB9KTtcblxuICAvLyBwcm94eSBhbGwgdGhlIG90aGVyIG1ldGhvZHMuXG4gIC8vIGltcG9ydGFudCB3aGVuIHdyYXBwaW5nIGZpbHRlcnMgYW5kIGR1cGxleGVzLlxuICBmb3IgKHZhciBpIGluIHN0cmVhbSkge1xuICAgIGlmICh0eXBlb2Ygc3RyZWFtW2ldID09PSAnZnVuY3Rpb24nICYmXG4gICAgICAgIHR5cGVvZiB0aGlzW2ldID09PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpc1tpXSA9IGZ1bmN0aW9uKG1ldGhvZCkgeyByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBzdHJlYW1bbWV0aG9kXS5hcHBseShzdHJlYW0sIGFyZ3VtZW50cyk7XG4gICAgICB9fShpKTtcbiAgICB9XG4gIH1cblxuICAvLyBwcm94eSBjZXJ0YWluIGltcG9ydGFudCBldmVudHMuXG4gIHZhciBldmVudHMgPSBbJ2Vycm9yJywgJ2Nsb3NlJywgJ2Rlc3Ryb3knLCAncGF1c2UnLCAncmVzdW1lJ107XG4gIGZvckVhY2goZXZlbnRzLCBmdW5jdGlvbihldikge1xuICAgIHN0cmVhbS5vbihldiwgc2VsZi5lbWl0LmJpbmQoc2VsZiwgZXYpKTtcbiAgfSk7XG5cbiAgLy8gd2hlbiB3ZSB0cnkgdG8gY29uc3VtZSBzb21lIG1vcmUgYnl0ZXMsIHNpbXBseSB1bnBhdXNlIHRoZVxuICAvLyB1bmRlcmx5aW5nIHN0cmVhbS5cbiAgc2VsZi5fcmVhZCA9IGZ1bmN0aW9uKG4pIHtcbiAgICBpZiAocGF1c2VkKSB7XG4gICAgICBwYXVzZWQgPSBmYWxzZTtcbiAgICAgIHN0cmVhbS5yZXN1bWUoKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIHNlbGY7XG59O1xuXG5cblxuLy8gZXhwb3NlZCBmb3IgdGVzdGluZyBwdXJwb3NlcyBvbmx5LlxuUmVhZGFibGUuX2Zyb21MaXN0ID0gZnJvbUxpc3Q7XG5cbi8vIFBsdWNrIG9mZiBuIGJ5dGVzIGZyb20gYW4gYXJyYXkgb2YgYnVmZmVycy5cbi8vIExlbmd0aCBpcyB0aGUgY29tYmluZWQgbGVuZ3RocyBvZiBhbGwgdGhlIGJ1ZmZlcnMgaW4gdGhlIGxpc3QuXG5mdW5jdGlvbiBmcm9tTGlzdChuLCBzdGF0ZSkge1xuICB2YXIgbGlzdCA9IHN0YXRlLmJ1ZmZlcjtcbiAgdmFyIGxlbmd0aCA9IHN0YXRlLmxlbmd0aDtcbiAgdmFyIHN0cmluZ01vZGUgPSAhIXN0YXRlLmRlY29kZXI7XG4gIHZhciBvYmplY3RNb2RlID0gISFzdGF0ZS5vYmplY3RNb2RlO1xuICB2YXIgcmV0O1xuXG4gIC8vIG5vdGhpbmcgaW4gdGhlIGxpc3QsIGRlZmluaXRlbHkgZW1wdHkuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMClcbiAgICByZXR1cm4gbnVsbDtcblxuICBpZiAobGVuZ3RoID09PSAwKVxuICAgIHJldCA9IG51bGw7XG4gIGVsc2UgaWYgKG9iamVjdE1vZGUpXG4gICAgcmV0ID0gbGlzdC5zaGlmdCgpO1xuICBlbHNlIGlmICghbiB8fCBuID49IGxlbmd0aCkge1xuICAgIC8vIHJlYWQgaXQgYWxsLCB0cnVuY2F0ZSB0aGUgYXJyYXkuXG4gICAgaWYgKHN0cmluZ01vZGUpXG4gICAgICByZXQgPSBsaXN0LmpvaW4oJycpO1xuICAgIGVsc2VcbiAgICAgIHJldCA9IEJ1ZmZlci5jb25jYXQobGlzdCwgbGVuZ3RoKTtcbiAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gIH0gZWxzZSB7XG4gICAgLy8gcmVhZCBqdXN0IHNvbWUgb2YgaXQuXG4gICAgaWYgKG4gPCBsaXN0WzBdLmxlbmd0aCkge1xuICAgICAgLy8ganVzdCB0YWtlIGEgcGFydCBvZiB0aGUgZmlyc3QgbGlzdCBpdGVtLlxuICAgICAgLy8gc2xpY2UgaXMgdGhlIHNhbWUgZm9yIGJ1ZmZlcnMgYW5kIHN0cmluZ3MuXG4gICAgICB2YXIgYnVmID0gbGlzdFswXTtcbiAgICAgIHJldCA9IGJ1Zi5zbGljZSgwLCBuKTtcbiAgICAgIGxpc3RbMF0gPSBidWYuc2xpY2Uobik7XG4gICAgfSBlbHNlIGlmIChuID09PSBsaXN0WzBdLmxlbmd0aCkge1xuICAgICAgLy8gZmlyc3QgbGlzdCBpcyBhIHBlcmZlY3QgbWF0Y2hcbiAgICAgIHJldCA9IGxpc3Quc2hpZnQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gY29tcGxleCBjYXNlLlxuICAgICAgLy8gd2UgaGF2ZSBlbm91Z2ggdG8gY292ZXIgaXQsIGJ1dCBpdCBzcGFucyBwYXN0IHRoZSBmaXJzdCBidWZmZXIuXG4gICAgICBpZiAoc3RyaW5nTW9kZSlcbiAgICAgICAgcmV0ID0gJyc7XG4gICAgICBlbHNlXG4gICAgICAgIHJldCA9IG5ldyBCdWZmZXIobik7XG5cbiAgICAgIHZhciBjID0gMDtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gbGlzdC5sZW5ndGg7IGkgPCBsICYmIGMgPCBuOyBpKyspIHtcbiAgICAgICAgdmFyIGJ1ZiA9IGxpc3RbMF07XG4gICAgICAgIHZhciBjcHkgPSBNYXRoLm1pbihuIC0gYywgYnVmLmxlbmd0aCk7XG5cbiAgICAgICAgaWYgKHN0cmluZ01vZGUpXG4gICAgICAgICAgcmV0ICs9IGJ1Zi5zbGljZSgwLCBjcHkpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgYnVmLmNvcHkocmV0LCBjLCAwLCBjcHkpO1xuXG4gICAgICAgIGlmIChjcHkgPCBidWYubGVuZ3RoKVxuICAgICAgICAgIGxpc3RbMF0gPSBidWYuc2xpY2UoY3B5KTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGxpc3Quc2hpZnQoKTtcblxuICAgICAgICBjICs9IGNweTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmV0O1xufVxuXG5mdW5jdGlvbiBlbmRSZWFkYWJsZShzdHJlYW0pIHtcbiAgdmFyIHN0YXRlID0gc3RyZWFtLl9yZWFkYWJsZVN0YXRlO1xuXG4gIC8vIElmIHdlIGdldCBoZXJlIGJlZm9yZSBjb25zdW1pbmcgYWxsIHRoZSBieXRlcywgdGhlbiB0aGF0IGlzIGFcbiAgLy8gYnVnIGluIG5vZGUuICBTaG91bGQgbmV2ZXIgaGFwcGVuLlxuICBpZiAoc3RhdGUubGVuZ3RoID4gMClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2VuZFJlYWRhYmxlIGNhbGxlZCBvbiBub24tZW1wdHkgc3RyZWFtJyk7XG5cbiAgaWYgKCFzdGF0ZS5lbmRFbWl0dGVkICYmIHN0YXRlLmNhbGxlZFJlYWQpIHtcbiAgICBzdGF0ZS5lbmRlZCA9IHRydWU7XG4gICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIC8vIENoZWNrIHRoYXQgd2UgZGlkbid0IGdldCBvbmUgbGFzdCB1bnNoaWZ0LlxuICAgICAgaWYgKCFzdGF0ZS5lbmRFbWl0dGVkICYmIHN0YXRlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBzdGF0ZS5lbmRFbWl0dGVkID0gdHJ1ZTtcbiAgICAgICAgc3RyZWFtLnJlYWRhYmxlID0gZmFsc2U7XG4gICAgICAgIHN0cmVhbS5lbWl0KCdlbmQnKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmb3JFYWNoICh4cywgZikge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHhzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGYoeHNbaV0sIGkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGluZGV4T2YgKHhzLCB4KSB7XG4gIGZvciAodmFyIGkgPSAwLCBsID0geHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKHhzW2ldID09PSB4KSByZXR1cm4gaTtcbiAgfVxuICByZXR1cm4gLTE7XG59XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuXG4vLyBhIHRyYW5zZm9ybSBzdHJlYW0gaXMgYSByZWFkYWJsZS93cml0YWJsZSBzdHJlYW0gd2hlcmUgeW91IGRvXG4vLyBzb21ldGhpbmcgd2l0aCB0aGUgZGF0YS4gIFNvbWV0aW1lcyBpdCdzIGNhbGxlZCBhIFwiZmlsdGVyXCIsXG4vLyBidXQgdGhhdCdzIG5vdCBhIGdyZWF0IG5hbWUgZm9yIGl0LCBzaW5jZSB0aGF0IGltcGxpZXMgYSB0aGluZyB3aGVyZVxuLy8gc29tZSBiaXRzIHBhc3MgdGhyb3VnaCwgYW5kIG90aGVycyBhcmUgc2ltcGx5IGlnbm9yZWQuICAoVGhhdCB3b3VsZFxuLy8gYmUgYSB2YWxpZCBleGFtcGxlIG9mIGEgdHJhbnNmb3JtLCBvZiBjb3Vyc2UuKVxuLy9cbi8vIFdoaWxlIHRoZSBvdXRwdXQgaXMgY2F1c2FsbHkgcmVsYXRlZCB0byB0aGUgaW5wdXQsIGl0J3Mgbm90IGFcbi8vIG5lY2Vzc2FyaWx5IHN5bW1ldHJpYyBvciBzeW5jaHJvbm91cyB0cmFuc2Zvcm1hdGlvbi4gIEZvciBleGFtcGxlLFxuLy8gYSB6bGliIHN0cmVhbSBtaWdodCB0YWtlIG11bHRpcGxlIHBsYWluLXRleHQgd3JpdGVzKCksIGFuZCB0aGVuXG4vLyBlbWl0IGEgc2luZ2xlIGNvbXByZXNzZWQgY2h1bmsgc29tZSB0aW1lIGluIHRoZSBmdXR1cmUuXG4vL1xuLy8gSGVyZSdzIGhvdyB0aGlzIHdvcmtzOlxuLy9cbi8vIFRoZSBUcmFuc2Zvcm0gc3RyZWFtIGhhcyBhbGwgdGhlIGFzcGVjdHMgb2YgdGhlIHJlYWRhYmxlIGFuZCB3cml0YWJsZVxuLy8gc3RyZWFtIGNsYXNzZXMuICBXaGVuIHlvdSB3cml0ZShjaHVuayksIHRoYXQgY2FsbHMgX3dyaXRlKGNodW5rLGNiKVxuLy8gaW50ZXJuYWxseSwgYW5kIHJldHVybnMgZmFsc2UgaWYgdGhlcmUncyBhIGxvdCBvZiBwZW5kaW5nIHdyaXRlc1xuLy8gYnVmZmVyZWQgdXAuICBXaGVuIHlvdSBjYWxsIHJlYWQoKSwgdGhhdCBjYWxscyBfcmVhZChuKSB1bnRpbFxuLy8gdGhlcmUncyBlbm91Z2ggcGVuZGluZyByZWFkYWJsZSBkYXRhIGJ1ZmZlcmVkIHVwLlxuLy9cbi8vIEluIGEgdHJhbnNmb3JtIHN0cmVhbSwgdGhlIHdyaXR0ZW4gZGF0YSBpcyBwbGFjZWQgaW4gYSBidWZmZXIuICBXaGVuXG4vLyBfcmVhZChuKSBpcyBjYWxsZWQsIGl0IHRyYW5zZm9ybXMgdGhlIHF1ZXVlZCB1cCBkYXRhLCBjYWxsaW5nIHRoZVxuLy8gYnVmZmVyZWQgX3dyaXRlIGNiJ3MgYXMgaXQgY29uc3VtZXMgY2h1bmtzLiAgSWYgY29uc3VtaW5nIGEgc2luZ2xlXG4vLyB3cml0dGVuIGNodW5rIHdvdWxkIHJlc3VsdCBpbiBtdWx0aXBsZSBvdXRwdXQgY2h1bmtzLCB0aGVuIHRoZSBmaXJzdFxuLy8gb3V0cHV0dGVkIGJpdCBjYWxscyB0aGUgcmVhZGNiLCBhbmQgc3Vic2VxdWVudCBjaHVua3MganVzdCBnbyBpbnRvXG4vLyB0aGUgcmVhZCBidWZmZXIsIGFuZCB3aWxsIGNhdXNlIGl0IHRvIGVtaXQgJ3JlYWRhYmxlJyBpZiBuZWNlc3NhcnkuXG4vL1xuLy8gVGhpcyB3YXksIGJhY2stcHJlc3N1cmUgaXMgYWN0dWFsbHkgZGV0ZXJtaW5lZCBieSB0aGUgcmVhZGluZyBzaWRlLFxuLy8gc2luY2UgX3JlYWQgaGFzIHRvIGJlIGNhbGxlZCB0byBzdGFydCBwcm9jZXNzaW5nIGEgbmV3IGNodW5rLiAgSG93ZXZlcixcbi8vIGEgcGF0aG9sb2dpY2FsIGluZmxhdGUgdHlwZSBvZiB0cmFuc2Zvcm0gY2FuIGNhdXNlIGV4Y2Vzc2l2ZSBidWZmZXJpbmdcbi8vIGhlcmUuICBGb3IgZXhhbXBsZSwgaW1hZ2luZSBhIHN0cmVhbSB3aGVyZSBldmVyeSBieXRlIG9mIGlucHV0IGlzXG4vLyBpbnRlcnByZXRlZCBhcyBhbiBpbnRlZ2VyIGZyb20gMC0yNTUsIGFuZCB0aGVuIHJlc3VsdHMgaW4gdGhhdCBtYW55XG4vLyBieXRlcyBvZiBvdXRwdXQuICBXcml0aW5nIHRoZSA0IGJ5dGVzIHtmZixmZixmZixmZn0gd291bGQgcmVzdWx0IGluXG4vLyAxa2Igb2YgZGF0YSBiZWluZyBvdXRwdXQuICBJbiB0aGlzIGNhc2UsIHlvdSBjb3VsZCB3cml0ZSBhIHZlcnkgc21hbGxcbi8vIGFtb3VudCBvZiBpbnB1dCwgYW5kIGVuZCB1cCB3aXRoIGEgdmVyeSBsYXJnZSBhbW91bnQgb2Ygb3V0cHV0LiAgSW5cbi8vIHN1Y2ggYSBwYXRob2xvZ2ljYWwgaW5mbGF0aW5nIG1lY2hhbmlzbSwgdGhlcmUnZCBiZSBubyB3YXkgdG8gdGVsbFxuLy8gdGhlIHN5c3RlbSB0byBzdG9wIGRvaW5nIHRoZSB0cmFuc2Zvcm0uICBBIHNpbmdsZSA0TUIgd3JpdGUgY291bGRcbi8vIGNhdXNlIHRoZSBzeXN0ZW0gdG8gcnVuIG91dCBvZiBtZW1vcnkuXG4vL1xuLy8gSG93ZXZlciwgZXZlbiBpbiBzdWNoIGEgcGF0aG9sb2dpY2FsIGNhc2UsIG9ubHkgYSBzaW5nbGUgd3JpdHRlbiBjaHVua1xuLy8gd291bGQgYmUgY29uc3VtZWQsIGFuZCB0aGVuIHRoZSByZXN0IHdvdWxkIHdhaXQgKHVuLXRyYW5zZm9ybWVkKSB1bnRpbFxuLy8gdGhlIHJlc3VsdHMgb2YgdGhlIHByZXZpb3VzIHRyYW5zZm9ybWVkIGNodW5rIHdlcmUgY29uc3VtZWQuXG5cbm1vZHVsZS5leHBvcnRzID0gVHJhbnNmb3JtO1xuXG52YXIgRHVwbGV4ID0gcmVxdWlyZSgnLi9fc3RyZWFtX2R1cGxleCcpO1xuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIHV0aWwgPSByZXF1aXJlKCdjb3JlLXV0aWwtaXMnKTtcbnV0aWwuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuLyo8L3JlcGxhY2VtZW50PiovXG5cbnV0aWwuaW5oZXJpdHMoVHJhbnNmb3JtLCBEdXBsZXgpO1xuXG5cbmZ1bmN0aW9uIFRyYW5zZm9ybVN0YXRlKG9wdGlvbnMsIHN0cmVhbSkge1xuICB0aGlzLmFmdGVyVHJhbnNmb3JtID0gZnVuY3Rpb24oZXIsIGRhdGEpIHtcbiAgICByZXR1cm4gYWZ0ZXJUcmFuc2Zvcm0oc3RyZWFtLCBlciwgZGF0YSk7XG4gIH07XG5cbiAgdGhpcy5uZWVkVHJhbnNmb3JtID0gZmFsc2U7XG4gIHRoaXMudHJhbnNmb3JtaW5nID0gZmFsc2U7XG4gIHRoaXMud3JpdGVjYiA9IG51bGw7XG4gIHRoaXMud3JpdGVjaHVuayA9IG51bGw7XG59XG5cbmZ1bmN0aW9uIGFmdGVyVHJhbnNmb3JtKHN0cmVhbSwgZXIsIGRhdGEpIHtcbiAgdmFyIHRzID0gc3RyZWFtLl90cmFuc2Zvcm1TdGF0ZTtcbiAgdHMudHJhbnNmb3JtaW5nID0gZmFsc2U7XG5cbiAgdmFyIGNiID0gdHMud3JpdGVjYjtcblxuICBpZiAoIWNiKVxuICAgIHJldHVybiBzdHJlYW0uZW1pdCgnZXJyb3InLCBuZXcgRXJyb3IoJ25vIHdyaXRlY2IgaW4gVHJhbnNmb3JtIGNsYXNzJykpO1xuXG4gIHRzLndyaXRlY2h1bmsgPSBudWxsO1xuICB0cy53cml0ZWNiID0gbnVsbDtcblxuICBpZiAoZGF0YSAhPT0gbnVsbCAmJiBkYXRhICE9PSB1bmRlZmluZWQpXG4gICAgc3RyZWFtLnB1c2goZGF0YSk7XG5cbiAgaWYgKGNiKVxuICAgIGNiKGVyKTtcblxuICB2YXIgcnMgPSBzdHJlYW0uX3JlYWRhYmxlU3RhdGU7XG4gIHJzLnJlYWRpbmcgPSBmYWxzZTtcbiAgaWYgKHJzLm5lZWRSZWFkYWJsZSB8fCBycy5sZW5ndGggPCBycy5oaWdoV2F0ZXJNYXJrKSB7XG4gICAgc3RyZWFtLl9yZWFkKHJzLmhpZ2hXYXRlck1hcmspO1xuICB9XG59XG5cblxuZnVuY3Rpb24gVHJhbnNmb3JtKG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFRyYW5zZm9ybSkpXG4gICAgcmV0dXJuIG5ldyBUcmFuc2Zvcm0ob3B0aW9ucyk7XG5cbiAgRHVwbGV4LmNhbGwodGhpcywgb3B0aW9ucyk7XG5cbiAgdmFyIHRzID0gdGhpcy5fdHJhbnNmb3JtU3RhdGUgPSBuZXcgVHJhbnNmb3JtU3RhdGUob3B0aW9ucywgdGhpcyk7XG5cbiAgLy8gd2hlbiB0aGUgd3JpdGFibGUgc2lkZSBmaW5pc2hlcywgdGhlbiBmbHVzaCBvdXQgYW55dGhpbmcgcmVtYWluaW5nLlxuICB2YXIgc3RyZWFtID0gdGhpcztcblxuICAvLyBzdGFydCBvdXQgYXNraW5nIGZvciBhIHJlYWRhYmxlIGV2ZW50IG9uY2UgZGF0YSBpcyB0cmFuc2Zvcm1lZC5cbiAgdGhpcy5fcmVhZGFibGVTdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuXG4gIC8vIHdlIGhhdmUgaW1wbGVtZW50ZWQgdGhlIF9yZWFkIG1ldGhvZCwgYW5kIGRvbmUgdGhlIG90aGVyIHRoaW5nc1xuICAvLyB0aGF0IFJlYWRhYmxlIHdhbnRzIGJlZm9yZSB0aGUgZmlyc3QgX3JlYWQgY2FsbCwgc28gdW5zZXQgdGhlXG4gIC8vIHN5bmMgZ3VhcmQgZmxhZy5cbiAgdGhpcy5fcmVhZGFibGVTdGF0ZS5zeW5jID0gZmFsc2U7XG5cbiAgdGhpcy5vbmNlKCdmaW5pc2gnLCBmdW5jdGlvbigpIHtcbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHRoaXMuX2ZsdXNoKVxuICAgICAgdGhpcy5fZmx1c2goZnVuY3Rpb24oZXIpIHtcbiAgICAgICAgZG9uZShzdHJlYW0sIGVyKTtcbiAgICAgIH0pO1xuICAgIGVsc2VcbiAgICAgIGRvbmUoc3RyZWFtKTtcbiAgfSk7XG59XG5cblRyYW5zZm9ybS5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZykge1xuICB0aGlzLl90cmFuc2Zvcm1TdGF0ZS5uZWVkVHJhbnNmb3JtID0gZmFsc2U7XG4gIHJldHVybiBEdXBsZXgucHJvdG90eXBlLnB1c2guY2FsbCh0aGlzLCBjaHVuaywgZW5jb2RpbmcpO1xufTtcblxuLy8gVGhpcyBpcyB0aGUgcGFydCB3aGVyZSB5b3UgZG8gc3R1ZmYhXG4vLyBvdmVycmlkZSB0aGlzIGZ1bmN0aW9uIGluIGltcGxlbWVudGF0aW9uIGNsYXNzZXMuXG4vLyAnY2h1bmsnIGlzIGFuIGlucHV0IGNodW5rLlxuLy9cbi8vIENhbGwgYHB1c2gobmV3Q2h1bmspYCB0byBwYXNzIGFsb25nIHRyYW5zZm9ybWVkIG91dHB1dFxuLy8gdG8gdGhlIHJlYWRhYmxlIHNpZGUuICBZb3UgbWF5IGNhbGwgJ3B1c2gnIHplcm8gb3IgbW9yZSB0aW1lcy5cbi8vXG4vLyBDYWxsIGBjYihlcnIpYCB3aGVuIHlvdSBhcmUgZG9uZSB3aXRoIHRoaXMgY2h1bmsuICBJZiB5b3UgcGFzc1xuLy8gYW4gZXJyb3IsIHRoZW4gdGhhdCdsbCBwdXQgdGhlIGh1cnQgb24gdGhlIHdob2xlIG9wZXJhdGlvbi4gIElmIHlvdVxuLy8gbmV2ZXIgY2FsbCBjYigpLCB0aGVuIHlvdSdsbCBuZXZlciBnZXQgYW5vdGhlciBjaHVuay5cblRyYW5zZm9ybS5wcm90b3R5cGUuX3RyYW5zZm9ybSA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgdGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcbn07XG5cblRyYW5zZm9ybS5wcm90b3R5cGUuX3dyaXRlID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nLCBjYikge1xuICB2YXIgdHMgPSB0aGlzLl90cmFuc2Zvcm1TdGF0ZTtcbiAgdHMud3JpdGVjYiA9IGNiO1xuICB0cy53cml0ZWNodW5rID0gY2h1bms7XG4gIHRzLndyaXRlZW5jb2RpbmcgPSBlbmNvZGluZztcbiAgaWYgKCF0cy50cmFuc2Zvcm1pbmcpIHtcbiAgICB2YXIgcnMgPSB0aGlzLl9yZWFkYWJsZVN0YXRlO1xuICAgIGlmICh0cy5uZWVkVHJhbnNmb3JtIHx8XG4gICAgICAgIHJzLm5lZWRSZWFkYWJsZSB8fFxuICAgICAgICBycy5sZW5ndGggPCBycy5oaWdoV2F0ZXJNYXJrKVxuICAgICAgdGhpcy5fcmVhZChycy5oaWdoV2F0ZXJNYXJrKTtcbiAgfVxufTtcblxuLy8gRG9lc24ndCBtYXR0ZXIgd2hhdCB0aGUgYXJncyBhcmUgaGVyZS5cbi8vIF90cmFuc2Zvcm0gZG9lcyBhbGwgdGhlIHdvcmsuXG4vLyBUaGF0IHdlIGdvdCBoZXJlIG1lYW5zIHRoYXQgdGhlIHJlYWRhYmxlIHNpZGUgd2FudHMgbW9yZSBkYXRhLlxuVHJhbnNmb3JtLnByb3RvdHlwZS5fcmVhZCA9IGZ1bmN0aW9uKG4pIHtcbiAgdmFyIHRzID0gdGhpcy5fdHJhbnNmb3JtU3RhdGU7XG5cbiAgaWYgKHRzLndyaXRlY2h1bmsgIT09IG51bGwgJiYgdHMud3JpdGVjYiAmJiAhdHMudHJhbnNmb3JtaW5nKSB7XG4gICAgdHMudHJhbnNmb3JtaW5nID0gdHJ1ZTtcbiAgICB0aGlzLl90cmFuc2Zvcm0odHMud3JpdGVjaHVuaywgdHMud3JpdGVlbmNvZGluZywgdHMuYWZ0ZXJUcmFuc2Zvcm0pO1xuICB9IGVsc2Uge1xuICAgIC8vIG1hcmsgdGhhdCB3ZSBuZWVkIGEgdHJhbnNmb3JtLCBzbyB0aGF0IGFueSBkYXRhIHRoYXQgY29tZXMgaW5cbiAgICAvLyB3aWxsIGdldCBwcm9jZXNzZWQsIG5vdyB0aGF0IHdlJ3ZlIGFza2VkIGZvciBpdC5cbiAgICB0cy5uZWVkVHJhbnNmb3JtID0gdHJ1ZTtcbiAgfVxufTtcblxuXG5mdW5jdGlvbiBkb25lKHN0cmVhbSwgZXIpIHtcbiAgaWYgKGVyKVxuICAgIHJldHVybiBzdHJlYW0uZW1pdCgnZXJyb3InLCBlcik7XG5cbiAgLy8gaWYgdGhlcmUncyBub3RoaW5nIGluIHRoZSB3cml0ZSBidWZmZXIsIHRoZW4gdGhhdCBtZWFuc1xuICAvLyB0aGF0IG5vdGhpbmcgbW9yZSB3aWxsIGV2ZXIgYmUgcHJvdmlkZWRcbiAgdmFyIHdzID0gc3RyZWFtLl93cml0YWJsZVN0YXRlO1xuICB2YXIgcnMgPSBzdHJlYW0uX3JlYWRhYmxlU3RhdGU7XG4gIHZhciB0cyA9IHN0cmVhbS5fdHJhbnNmb3JtU3RhdGU7XG5cbiAgaWYgKHdzLmxlbmd0aClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NhbGxpbmcgdHJhbnNmb3JtIGRvbmUgd2hlbiB3cy5sZW5ndGggIT0gMCcpO1xuXG4gIGlmICh0cy50cmFuc2Zvcm1pbmcpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdjYWxsaW5nIHRyYW5zZm9ybSBkb25lIHdoZW4gc3RpbGwgdHJhbnNmb3JtaW5nJyk7XG5cbiAgcmV0dXJuIHN0cmVhbS5wdXNoKG51bGwpO1xufVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIEEgYml0IHNpbXBsZXIgdGhhbiByZWFkYWJsZSBzdHJlYW1zLlxuLy8gSW1wbGVtZW50IGFuIGFzeW5jIC5fd3JpdGUoY2h1bmssIGNiKSwgYW5kIGl0J2xsIGhhbmRsZSBhbGxcbi8vIHRoZSBkcmFpbiBldmVudCBlbWlzc2lvbiBhbmQgYnVmZmVyaW5nLlxuXG5tb2R1bGUuZXhwb3J0cyA9IFdyaXRhYmxlO1xuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIEJ1ZmZlciA9IHJlcXVpcmUoJ2J1ZmZlcicpLkJ1ZmZlcjtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG5Xcml0YWJsZS5Xcml0YWJsZVN0YXRlID0gV3JpdGFibGVTdGF0ZTtcblxuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIHV0aWwgPSByZXF1aXJlKCdjb3JlLXV0aWwtaXMnKTtcbnV0aWwuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuLyo8L3JlcGxhY2VtZW50PiovXG5cbnZhciBTdHJlYW0gPSByZXF1aXJlKCdzdHJlYW0nKTtcblxudXRpbC5pbmhlcml0cyhXcml0YWJsZSwgU3RyZWFtKTtcblxuZnVuY3Rpb24gV3JpdGVSZXEoY2h1bmssIGVuY29kaW5nLCBjYikge1xuICB0aGlzLmNodW5rID0gY2h1bms7XG4gIHRoaXMuZW5jb2RpbmcgPSBlbmNvZGluZztcbiAgdGhpcy5jYWxsYmFjayA9IGNiO1xufVxuXG5mdW5jdGlvbiBXcml0YWJsZVN0YXRlKG9wdGlvbnMsIHN0cmVhbSkge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAvLyB0aGUgcG9pbnQgYXQgd2hpY2ggd3JpdGUoKSBzdGFydHMgcmV0dXJuaW5nIGZhbHNlXG4gIC8vIE5vdGU6IDAgaXMgYSB2YWxpZCB2YWx1ZSwgbWVhbnMgdGhhdCB3ZSBhbHdheXMgcmV0dXJuIGZhbHNlIGlmXG4gIC8vIHRoZSBlbnRpcmUgYnVmZmVyIGlzIG5vdCBmbHVzaGVkIGltbWVkaWF0ZWx5IG9uIHdyaXRlKClcbiAgdmFyIGh3bSA9IG9wdGlvbnMuaGlnaFdhdGVyTWFyaztcbiAgdGhpcy5oaWdoV2F0ZXJNYXJrID0gKGh3bSB8fCBod20gPT09IDApID8gaHdtIDogMTYgKiAxMDI0O1xuXG4gIC8vIG9iamVjdCBzdHJlYW0gZmxhZyB0byBpbmRpY2F0ZSB3aGV0aGVyIG9yIG5vdCB0aGlzIHN0cmVhbVxuICAvLyBjb250YWlucyBidWZmZXJzIG9yIG9iamVjdHMuXG4gIHRoaXMub2JqZWN0TW9kZSA9ICEhb3B0aW9ucy5vYmplY3RNb2RlO1xuXG4gIC8vIGNhc3QgdG8gaW50cy5cbiAgdGhpcy5oaWdoV2F0ZXJNYXJrID0gfn50aGlzLmhpZ2hXYXRlck1hcms7XG5cbiAgdGhpcy5uZWVkRHJhaW4gPSBmYWxzZTtcbiAgLy8gYXQgdGhlIHN0YXJ0IG9mIGNhbGxpbmcgZW5kKClcbiAgdGhpcy5lbmRpbmcgPSBmYWxzZTtcbiAgLy8gd2hlbiBlbmQoKSBoYXMgYmVlbiBjYWxsZWQsIGFuZCByZXR1cm5lZFxuICB0aGlzLmVuZGVkID0gZmFsc2U7XG4gIC8vIHdoZW4gJ2ZpbmlzaCcgaXMgZW1pdHRlZFxuICB0aGlzLmZpbmlzaGVkID0gZmFsc2U7XG5cbiAgLy8gc2hvdWxkIHdlIGRlY29kZSBzdHJpbmdzIGludG8gYnVmZmVycyBiZWZvcmUgcGFzc2luZyB0byBfd3JpdGU/XG4gIC8vIHRoaXMgaXMgaGVyZSBzbyB0aGF0IHNvbWUgbm9kZS1jb3JlIHN0cmVhbXMgY2FuIG9wdGltaXplIHN0cmluZ1xuICAvLyBoYW5kbGluZyBhdCBhIGxvd2VyIGxldmVsLlxuICB2YXIgbm9EZWNvZGUgPSBvcHRpb25zLmRlY29kZVN0cmluZ3MgPT09IGZhbHNlO1xuICB0aGlzLmRlY29kZVN0cmluZ3MgPSAhbm9EZWNvZGU7XG5cbiAgLy8gQ3J5cHRvIGlzIGtpbmQgb2Ygb2xkIGFuZCBjcnVzdHkuICBIaXN0b3JpY2FsbHksIGl0cyBkZWZhdWx0IHN0cmluZ1xuICAvLyBlbmNvZGluZyBpcyAnYmluYXJ5JyBzbyB3ZSBoYXZlIHRvIG1ha2UgdGhpcyBjb25maWd1cmFibGUuXG4gIC8vIEV2ZXJ5dGhpbmcgZWxzZSBpbiB0aGUgdW5pdmVyc2UgdXNlcyAndXRmOCcsIHRob3VnaC5cbiAgdGhpcy5kZWZhdWx0RW5jb2RpbmcgPSBvcHRpb25zLmRlZmF1bHRFbmNvZGluZyB8fCAndXRmOCc7XG5cbiAgLy8gbm90IGFuIGFjdHVhbCBidWZmZXIgd2Uga2VlcCB0cmFjayBvZiwgYnV0IGEgbWVhc3VyZW1lbnRcbiAgLy8gb2YgaG93IG11Y2ggd2UncmUgd2FpdGluZyB0byBnZXQgcHVzaGVkIHRvIHNvbWUgdW5kZXJseWluZ1xuICAvLyBzb2NrZXQgb3IgZmlsZS5cbiAgdGhpcy5sZW5ndGggPSAwO1xuXG4gIC8vIGEgZmxhZyB0byBzZWUgd2hlbiB3ZSdyZSBpbiB0aGUgbWlkZGxlIG9mIGEgd3JpdGUuXG4gIHRoaXMud3JpdGluZyA9IGZhbHNlO1xuXG4gIC8vIGEgZmxhZyB0byBiZSBhYmxlIHRvIHRlbGwgaWYgdGhlIG9ud3JpdGUgY2IgaXMgY2FsbGVkIGltbWVkaWF0ZWx5LFxuICAvLyBvciBvbiBhIGxhdGVyIHRpY2suICBXZSBzZXQgdGhpcyB0byB0cnVlIGF0IGZpcnN0LCBiZWN1YXNlIGFueVxuICAvLyBhY3Rpb25zIHRoYXQgc2hvdWxkbid0IGhhcHBlbiB1bnRpbCBcImxhdGVyXCIgc2hvdWxkIGdlbmVyYWxseSBhbHNvXG4gIC8vIG5vdCBoYXBwZW4gYmVmb3JlIHRoZSBmaXJzdCB3cml0ZSBjYWxsLlxuICB0aGlzLnN5bmMgPSB0cnVlO1xuXG4gIC8vIGEgZmxhZyB0byBrbm93IGlmIHdlJ3JlIHByb2Nlc3NpbmcgcHJldmlvdXNseSBidWZmZXJlZCBpdGVtcywgd2hpY2hcbiAgLy8gbWF5IGNhbGwgdGhlIF93cml0ZSgpIGNhbGxiYWNrIGluIHRoZSBzYW1lIHRpY2ssIHNvIHRoYXQgd2UgZG9uJ3RcbiAgLy8gZW5kIHVwIGluIGFuIG92ZXJsYXBwZWQgb253cml0ZSBzaXR1YXRpb24uXG4gIHRoaXMuYnVmZmVyUHJvY2Vzc2luZyA9IGZhbHNlO1xuXG4gIC8vIHRoZSBjYWxsYmFjayB0aGF0J3MgcGFzc2VkIHRvIF93cml0ZShjaHVuayxjYilcbiAgdGhpcy5vbndyaXRlID0gZnVuY3Rpb24oZXIpIHtcbiAgICBvbndyaXRlKHN0cmVhbSwgZXIpO1xuICB9O1xuXG4gIC8vIHRoZSBjYWxsYmFjayB0aGF0IHRoZSB1c2VyIHN1cHBsaWVzIHRvIHdyaXRlKGNodW5rLGVuY29kaW5nLGNiKVxuICB0aGlzLndyaXRlY2IgPSBudWxsO1xuXG4gIC8vIHRoZSBhbW91bnQgdGhhdCBpcyBiZWluZyB3cml0dGVuIHdoZW4gX3dyaXRlIGlzIGNhbGxlZC5cbiAgdGhpcy53cml0ZWxlbiA9IDA7XG5cbiAgdGhpcy5idWZmZXIgPSBbXTtcblxuICAvLyBUcnVlIGlmIHRoZSBlcnJvciB3YXMgYWxyZWFkeSBlbWl0dGVkIGFuZCBzaG91bGQgbm90IGJlIHRocm93biBhZ2FpblxuICB0aGlzLmVycm9yRW1pdHRlZCA9IGZhbHNlO1xufVxuXG5mdW5jdGlvbiBXcml0YWJsZShvcHRpb25zKSB7XG4gIHZhciBEdXBsZXggPSByZXF1aXJlKCcuL19zdHJlYW1fZHVwbGV4Jyk7XG5cbiAgLy8gV3JpdGFibGUgY3RvciBpcyBhcHBsaWVkIHRvIER1cGxleGVzLCB0aG91Z2ggdGhleSdyZSBub3RcbiAgLy8gaW5zdGFuY2VvZiBXcml0YWJsZSwgdGhleSdyZSBpbnN0YW5jZW9mIFJlYWRhYmxlLlxuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV3JpdGFibGUpICYmICEodGhpcyBpbnN0YW5jZW9mIER1cGxleCkpXG4gICAgcmV0dXJuIG5ldyBXcml0YWJsZShvcHRpb25zKTtcblxuICB0aGlzLl93cml0YWJsZVN0YXRlID0gbmV3IFdyaXRhYmxlU3RhdGUob3B0aW9ucywgdGhpcyk7XG5cbiAgLy8gbGVnYWN5LlxuICB0aGlzLndyaXRhYmxlID0gdHJ1ZTtcblxuICBTdHJlYW0uY2FsbCh0aGlzKTtcbn1cblxuLy8gT3RoZXJ3aXNlIHBlb3BsZSBjYW4gcGlwZSBXcml0YWJsZSBzdHJlYW1zLCB3aGljaCBpcyBqdXN0IHdyb25nLlxuV3JpdGFibGUucHJvdG90eXBlLnBpcGUgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5lbWl0KCdlcnJvcicsIG5ldyBFcnJvcignQ2Fubm90IHBpcGUuIE5vdCByZWFkYWJsZS4nKSk7XG59O1xuXG5cbmZ1bmN0aW9uIHdyaXRlQWZ0ZXJFbmQoc3RyZWFtLCBzdGF0ZSwgY2IpIHtcbiAgdmFyIGVyID0gbmV3IEVycm9yKCd3cml0ZSBhZnRlciBlbmQnKTtcbiAgLy8gVE9ETzogZGVmZXIgZXJyb3IgZXZlbnRzIGNvbnNpc3RlbnRseSBldmVyeXdoZXJlLCBub3QganVzdCB0aGUgY2JcbiAgc3RyZWFtLmVtaXQoJ2Vycm9yJywgZXIpO1xuICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgIGNiKGVyKTtcbiAgfSk7XG59XG5cbi8vIElmIHdlIGdldCBzb21ldGhpbmcgdGhhdCBpcyBub3QgYSBidWZmZXIsIHN0cmluZywgbnVsbCwgb3IgdW5kZWZpbmVkLFxuLy8gYW5kIHdlJ3JlIG5vdCBpbiBvYmplY3RNb2RlLCB0aGVuIHRoYXQncyBhbiBlcnJvci5cbi8vIE90aGVyd2lzZSBzdHJlYW0gY2h1bmtzIGFyZSBhbGwgY29uc2lkZXJlZCB0byBiZSBvZiBsZW5ndGg9MSwgYW5kIHRoZVxuLy8gd2F0ZXJtYXJrcyBkZXRlcm1pbmUgaG93IG1hbnkgb2JqZWN0cyB0byBrZWVwIGluIHRoZSBidWZmZXIsIHJhdGhlciB0aGFuXG4vLyBob3cgbWFueSBieXRlcyBvciBjaGFyYWN0ZXJzLlxuZnVuY3Rpb24gdmFsaWRDaHVuayhzdHJlYW0sIHN0YXRlLCBjaHVuaywgY2IpIHtcbiAgdmFyIHZhbGlkID0gdHJ1ZTtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoY2h1bmspICYmXG4gICAgICAnc3RyaW5nJyAhPT0gdHlwZW9mIGNodW5rICYmXG4gICAgICBjaHVuayAhPT0gbnVsbCAmJlxuICAgICAgY2h1bmsgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgIXN0YXRlLm9iamVjdE1vZGUpIHtcbiAgICB2YXIgZXIgPSBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIG5vbi1zdHJpbmcvYnVmZmVyIGNodW5rJyk7XG4gICAgc3RyZWFtLmVtaXQoJ2Vycm9yJywgZXIpO1xuICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICBjYihlcik7XG4gICAgfSk7XG4gICAgdmFsaWQgPSBmYWxzZTtcbiAgfVxuICByZXR1cm4gdmFsaWQ7XG59XG5cbldyaXRhYmxlLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fd3JpdGFibGVTdGF0ZTtcbiAgdmFyIHJldCA9IGZhbHNlO1xuXG4gIGlmICh0eXBlb2YgZW5jb2RpbmcgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYiA9IGVuY29kaW5nO1xuICAgIGVuY29kaW5nID0gbnVsbDtcbiAgfVxuXG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoY2h1bmspKVxuICAgIGVuY29kaW5nID0gJ2J1ZmZlcic7XG4gIGVsc2UgaWYgKCFlbmNvZGluZylcbiAgICBlbmNvZGluZyA9IHN0YXRlLmRlZmF1bHRFbmNvZGluZztcblxuICBpZiAodHlwZW9mIGNiICE9PSAnZnVuY3Rpb24nKVxuICAgIGNiID0gZnVuY3Rpb24oKSB7fTtcblxuICBpZiAoc3RhdGUuZW5kZWQpXG4gICAgd3JpdGVBZnRlckVuZCh0aGlzLCBzdGF0ZSwgY2IpO1xuICBlbHNlIGlmICh2YWxpZENodW5rKHRoaXMsIHN0YXRlLCBjaHVuaywgY2IpKVxuICAgIHJldCA9IHdyaXRlT3JCdWZmZXIodGhpcywgc3RhdGUsIGNodW5rLCBlbmNvZGluZywgY2IpO1xuXG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBkZWNvZGVDaHVuayhzdGF0ZSwgY2h1bmssIGVuY29kaW5nKSB7XG4gIGlmICghc3RhdGUub2JqZWN0TW9kZSAmJlxuICAgICAgc3RhdGUuZGVjb2RlU3RyaW5ncyAhPT0gZmFsc2UgJiZcbiAgICAgIHR5cGVvZiBjaHVuayA9PT0gJ3N0cmluZycpIHtcbiAgICBjaHVuayA9IG5ldyBCdWZmZXIoY2h1bmssIGVuY29kaW5nKTtcbiAgfVxuICByZXR1cm4gY2h1bms7XG59XG5cbi8vIGlmIHdlJ3JlIGFscmVhZHkgd3JpdGluZyBzb21ldGhpbmcsIHRoZW4ganVzdCBwdXQgdGhpc1xuLy8gaW4gdGhlIHF1ZXVlLCBhbmQgd2FpdCBvdXIgdHVybi4gIE90aGVyd2lzZSwgY2FsbCBfd3JpdGVcbi8vIElmIHdlIHJldHVybiBmYWxzZSwgdGhlbiB3ZSBuZWVkIGEgZHJhaW4gZXZlbnQsIHNvIHNldCB0aGF0IGZsYWcuXG5mdW5jdGlvbiB3cml0ZU9yQnVmZmVyKHN0cmVhbSwgc3RhdGUsIGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgY2h1bmsgPSBkZWNvZGVDaHVuayhzdGF0ZSwgY2h1bmssIGVuY29kaW5nKTtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihjaHVuaykpXG4gICAgZW5jb2RpbmcgPSAnYnVmZmVyJztcbiAgdmFyIGxlbiA9IHN0YXRlLm9iamVjdE1vZGUgPyAxIDogY2h1bmsubGVuZ3RoO1xuXG4gIHN0YXRlLmxlbmd0aCArPSBsZW47XG5cbiAgdmFyIHJldCA9IHN0YXRlLmxlbmd0aCA8IHN0YXRlLmhpZ2hXYXRlck1hcms7XG4gIC8vIHdlIG11c3QgZW5zdXJlIHRoYXQgcHJldmlvdXMgbmVlZERyYWluIHdpbGwgbm90IGJlIHJlc2V0IHRvIGZhbHNlLlxuICBpZiAoIXJldClcbiAgICBzdGF0ZS5uZWVkRHJhaW4gPSB0cnVlO1xuXG4gIGlmIChzdGF0ZS53cml0aW5nKVxuICAgIHN0YXRlLmJ1ZmZlci5wdXNoKG5ldyBXcml0ZVJlcShjaHVuaywgZW5jb2RpbmcsIGNiKSk7XG4gIGVsc2VcbiAgICBkb1dyaXRlKHN0cmVhbSwgc3RhdGUsIGxlbiwgY2h1bmssIGVuY29kaW5nLCBjYik7XG5cbiAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gZG9Xcml0ZShzdHJlYW0sIHN0YXRlLCBsZW4sIGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgc3RhdGUud3JpdGVsZW4gPSBsZW47XG4gIHN0YXRlLndyaXRlY2IgPSBjYjtcbiAgc3RhdGUud3JpdGluZyA9IHRydWU7XG4gIHN0YXRlLnN5bmMgPSB0cnVlO1xuICBzdHJlYW0uX3dyaXRlKGNodW5rLCBlbmNvZGluZywgc3RhdGUub253cml0ZSk7XG4gIHN0YXRlLnN5bmMgPSBmYWxzZTtcbn1cblxuZnVuY3Rpb24gb253cml0ZUVycm9yKHN0cmVhbSwgc3RhdGUsIHN5bmMsIGVyLCBjYikge1xuICBpZiAoc3luYylcbiAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgY2IoZXIpO1xuICAgIH0pO1xuICBlbHNlXG4gICAgY2IoZXIpO1xuXG4gIHN0cmVhbS5fd3JpdGFibGVTdGF0ZS5lcnJvckVtaXR0ZWQgPSB0cnVlO1xuICBzdHJlYW0uZW1pdCgnZXJyb3InLCBlcik7XG59XG5cbmZ1bmN0aW9uIG9ud3JpdGVTdGF0ZVVwZGF0ZShzdGF0ZSkge1xuICBzdGF0ZS53cml0aW5nID0gZmFsc2U7XG4gIHN0YXRlLndyaXRlY2IgPSBudWxsO1xuICBzdGF0ZS5sZW5ndGggLT0gc3RhdGUud3JpdGVsZW47XG4gIHN0YXRlLndyaXRlbGVuID0gMDtcbn1cblxuZnVuY3Rpb24gb253cml0ZShzdHJlYW0sIGVyKSB7XG4gIHZhciBzdGF0ZSA9IHN0cmVhbS5fd3JpdGFibGVTdGF0ZTtcbiAgdmFyIHN5bmMgPSBzdGF0ZS5zeW5jO1xuICB2YXIgY2IgPSBzdGF0ZS53cml0ZWNiO1xuXG4gIG9ud3JpdGVTdGF0ZVVwZGF0ZShzdGF0ZSk7XG5cbiAgaWYgKGVyKVxuICAgIG9ud3JpdGVFcnJvcihzdHJlYW0sIHN0YXRlLCBzeW5jLCBlciwgY2IpO1xuICBlbHNlIHtcbiAgICAvLyBDaGVjayBpZiB3ZSdyZSBhY3R1YWxseSByZWFkeSB0byBmaW5pc2gsIGJ1dCBkb24ndCBlbWl0IHlldFxuICAgIHZhciBmaW5pc2hlZCA9IG5lZWRGaW5pc2goc3RyZWFtLCBzdGF0ZSk7XG5cbiAgICBpZiAoIWZpbmlzaGVkICYmICFzdGF0ZS5idWZmZXJQcm9jZXNzaW5nICYmIHN0YXRlLmJ1ZmZlci5sZW5ndGgpXG4gICAgICBjbGVhckJ1ZmZlcihzdHJlYW0sIHN0YXRlKTtcblxuICAgIGlmIChzeW5jKSB7XG4gICAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgICBhZnRlcldyaXRlKHN0cmVhbSwgc3RhdGUsIGZpbmlzaGVkLCBjYik7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYWZ0ZXJXcml0ZShzdHJlYW0sIHN0YXRlLCBmaW5pc2hlZCwgY2IpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBhZnRlcldyaXRlKHN0cmVhbSwgc3RhdGUsIGZpbmlzaGVkLCBjYikge1xuICBpZiAoIWZpbmlzaGVkKVxuICAgIG9ud3JpdGVEcmFpbihzdHJlYW0sIHN0YXRlKTtcbiAgY2IoKTtcbiAgaWYgKGZpbmlzaGVkKVxuICAgIGZpbmlzaE1heWJlKHN0cmVhbSwgc3RhdGUpO1xufVxuXG4vLyBNdXN0IGZvcmNlIGNhbGxiYWNrIHRvIGJlIGNhbGxlZCBvbiBuZXh0VGljaywgc28gdGhhdCB3ZSBkb24ndFxuLy8gZW1pdCAnZHJhaW4nIGJlZm9yZSB0aGUgd3JpdGUoKSBjb25zdW1lciBnZXRzIHRoZSAnZmFsc2UnIHJldHVyblxuLy8gdmFsdWUsIGFuZCBoYXMgYSBjaGFuY2UgdG8gYXR0YWNoIGEgJ2RyYWluJyBsaXN0ZW5lci5cbmZ1bmN0aW9uIG9ud3JpdGVEcmFpbihzdHJlYW0sIHN0YXRlKSB7XG4gIGlmIChzdGF0ZS5sZW5ndGggPT09IDAgJiYgc3RhdGUubmVlZERyYWluKSB7XG4gICAgc3RhdGUubmVlZERyYWluID0gZmFsc2U7XG4gICAgc3RyZWFtLmVtaXQoJ2RyYWluJyk7XG4gIH1cbn1cblxuXG4vLyBpZiB0aGVyZSdzIHNvbWV0aGluZyBpbiB0aGUgYnVmZmVyIHdhaXRpbmcsIHRoZW4gcHJvY2VzcyBpdFxuZnVuY3Rpb24gY2xlYXJCdWZmZXIoc3RyZWFtLCBzdGF0ZSkge1xuICBzdGF0ZS5idWZmZXJQcm9jZXNzaW5nID0gdHJ1ZTtcblxuICBmb3IgKHZhciBjID0gMDsgYyA8IHN0YXRlLmJ1ZmZlci5sZW5ndGg7IGMrKykge1xuICAgIHZhciBlbnRyeSA9IHN0YXRlLmJ1ZmZlcltjXTtcbiAgICB2YXIgY2h1bmsgPSBlbnRyeS5jaHVuaztcbiAgICB2YXIgZW5jb2RpbmcgPSBlbnRyeS5lbmNvZGluZztcbiAgICB2YXIgY2IgPSBlbnRyeS5jYWxsYmFjaztcbiAgICB2YXIgbGVuID0gc3RhdGUub2JqZWN0TW9kZSA/IDEgOiBjaHVuay5sZW5ndGg7XG5cbiAgICBkb1dyaXRlKHN0cmVhbSwgc3RhdGUsIGxlbiwgY2h1bmssIGVuY29kaW5nLCBjYik7XG5cbiAgICAvLyBpZiB3ZSBkaWRuJ3QgY2FsbCB0aGUgb253cml0ZSBpbW1lZGlhdGVseSwgdGhlblxuICAgIC8vIGl0IG1lYW5zIHRoYXQgd2UgbmVlZCB0byB3YWl0IHVudGlsIGl0IGRvZXMuXG4gICAgLy8gYWxzbywgdGhhdCBtZWFucyB0aGF0IHRoZSBjaHVuayBhbmQgY2IgYXJlIGN1cnJlbnRseVxuICAgIC8vIGJlaW5nIHByb2Nlc3NlZCwgc28gbW92ZSB0aGUgYnVmZmVyIGNvdW50ZXIgcGFzdCB0aGVtLlxuICAgIGlmIChzdGF0ZS53cml0aW5nKSB7XG4gICAgICBjKys7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBzdGF0ZS5idWZmZXJQcm9jZXNzaW5nID0gZmFsc2U7XG4gIGlmIChjIDwgc3RhdGUuYnVmZmVyLmxlbmd0aClcbiAgICBzdGF0ZS5idWZmZXIgPSBzdGF0ZS5idWZmZXIuc2xpY2UoYyk7XG4gIGVsc2VcbiAgICBzdGF0ZS5idWZmZXIubGVuZ3RoID0gMDtcbn1cblxuV3JpdGFibGUucHJvdG90eXBlLl93cml0ZSA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgY2IobmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKSk7XG59O1xuXG5Xcml0YWJsZS5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nLCBjYikge1xuICB2YXIgc3RhdGUgPSB0aGlzLl93cml0YWJsZVN0YXRlO1xuXG4gIGlmICh0eXBlb2YgY2h1bmsgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYiA9IGNodW5rO1xuICAgIGNodW5rID0gbnVsbDtcbiAgICBlbmNvZGluZyA9IG51bGw7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGVuY29kaW5nID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2IgPSBlbmNvZGluZztcbiAgICBlbmNvZGluZyA9IG51bGw7XG4gIH1cblxuICBpZiAodHlwZW9mIGNodW5rICE9PSAndW5kZWZpbmVkJyAmJiBjaHVuayAhPT0gbnVsbClcbiAgICB0aGlzLndyaXRlKGNodW5rLCBlbmNvZGluZyk7XG5cbiAgLy8gaWdub3JlIHVubmVjZXNzYXJ5IGVuZCgpIGNhbGxzLlxuICBpZiAoIXN0YXRlLmVuZGluZyAmJiAhc3RhdGUuZmluaXNoZWQpXG4gICAgZW5kV3JpdGFibGUodGhpcywgc3RhdGUsIGNiKTtcbn07XG5cblxuZnVuY3Rpb24gbmVlZEZpbmlzaChzdHJlYW0sIHN0YXRlKSB7XG4gIHJldHVybiAoc3RhdGUuZW5kaW5nICYmXG4gICAgICAgICAgc3RhdGUubGVuZ3RoID09PSAwICYmXG4gICAgICAgICAgIXN0YXRlLmZpbmlzaGVkICYmXG4gICAgICAgICAgIXN0YXRlLndyaXRpbmcpO1xufVxuXG5mdW5jdGlvbiBmaW5pc2hNYXliZShzdHJlYW0sIHN0YXRlKSB7XG4gIHZhciBuZWVkID0gbmVlZEZpbmlzaChzdHJlYW0sIHN0YXRlKTtcbiAgaWYgKG5lZWQpIHtcbiAgICBzdGF0ZS5maW5pc2hlZCA9IHRydWU7XG4gICAgc3RyZWFtLmVtaXQoJ2ZpbmlzaCcpO1xuICB9XG4gIHJldHVybiBuZWVkO1xufVxuXG5mdW5jdGlvbiBlbmRXcml0YWJsZShzdHJlYW0sIHN0YXRlLCBjYikge1xuICBzdGF0ZS5lbmRpbmcgPSB0cnVlO1xuICBmaW5pc2hNYXliZShzdHJlYW0sIHN0YXRlKTtcbiAgaWYgKGNiKSB7XG4gICAgaWYgKHN0YXRlLmZpbmlzaGVkKVxuICAgICAgcHJvY2Vzcy5uZXh0VGljayhjYik7XG4gICAgZWxzZVxuICAgICAgc3RyZWFtLm9uY2UoJ2ZpbmlzaCcsIGNiKTtcbiAgfVxuICBzdGF0ZS5lbmRlZCA9IHRydWU7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2xpYi9fc3RyZWFtX3Bhc3N0aHJvdWdoLmpzXCIpXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2xpYi9fc3RyZWFtX3RyYW5zZm9ybS5qc1wiKVxuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9saWIvX3N0cmVhbV93cml0YWJsZS5qc1wiKVxuIiwibW9kdWxlLmV4cG9ydHMgPSByaW1yYWZcbnJpbXJhZi5zeW5jID0gcmltcmFmU3luY1xuXG52YXIgYXNzZXJ0ID0gcmVxdWlyZShcImFzc2VydFwiKVxudmFyIHBhdGggPSByZXF1aXJlKFwicGF0aFwiKVxudmFyIGZzID0gcmVxdWlyZShcImZzXCIpXG52YXIgZ2xvYiA9IHVuZGVmaW5lZFxudHJ5IHtcbiAgZ2xvYiA9IHJlcXVpcmUoXCJnbG9iXCIpXG59IGNhdGNoIChfZXJyKSB7XG4gIC8vIHRyZWF0IGdsb2IgYXMgb3B0aW9uYWwuXG59XG52YXIgXzA2NjYgPSBwYXJzZUludCgnNjY2JywgOClcblxudmFyIGRlZmF1bHRHbG9iT3B0cyA9IHtcbiAgbm9zb3J0OiB0cnVlLFxuICBzaWxlbnQ6IHRydWVcbn1cblxuLy8gZm9yIEVNRklMRSBoYW5kbGluZ1xudmFyIHRpbWVvdXQgPSAwXG5cbnZhciBpc1dpbmRvd3MgPSAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJ3aW4zMlwiKVxuXG5mdW5jdGlvbiBkZWZhdWx0cyAob3B0aW9ucykge1xuICB2YXIgbWV0aG9kcyA9IFtcbiAgICAndW5saW5rJyxcbiAgICAnY2htb2QnLFxuICAgICdzdGF0JyxcbiAgICAnbHN0YXQnLFxuICAgICdybWRpcicsXG4gICAgJ3JlYWRkaXInXG4gIF1cbiAgbWV0aG9kcy5mb3JFYWNoKGZ1bmN0aW9uKG0pIHtcbiAgICBvcHRpb25zW21dID0gb3B0aW9uc1ttXSB8fCBmc1ttXVxuICAgIG0gPSBtICsgJ1N5bmMnXG4gICAgb3B0aW9uc1ttXSA9IG9wdGlvbnNbbV0gfHwgZnNbbV1cbiAgfSlcblxuICBvcHRpb25zLm1heEJ1c3lUcmllcyA9IG9wdGlvbnMubWF4QnVzeVRyaWVzIHx8IDNcbiAgb3B0aW9ucy5lbWZpbGVXYWl0ID0gb3B0aW9ucy5lbWZpbGVXYWl0IHx8IDEwMDBcbiAgaWYgKG9wdGlvbnMuZ2xvYiA9PT0gZmFsc2UpIHtcbiAgICBvcHRpb25zLmRpc2FibGVHbG9iID0gdHJ1ZVxuICB9XG4gIGlmIChvcHRpb25zLmRpc2FibGVHbG9iICE9PSB0cnVlICYmIGdsb2IgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IEVycm9yKCdnbG9iIGRlcGVuZGVuY3kgbm90IGZvdW5kLCBzZXQgYG9wdGlvbnMuZGlzYWJsZUdsb2IgPSB0cnVlYCBpZiBpbnRlbnRpb25hbCcpXG4gIH1cbiAgb3B0aW9ucy5kaXNhYmxlR2xvYiA9IG9wdGlvbnMuZGlzYWJsZUdsb2IgfHwgZmFsc2VcbiAgb3B0aW9ucy5nbG9iID0gb3B0aW9ucy5nbG9iIHx8IGRlZmF1bHRHbG9iT3B0c1xufVxuXG5mdW5jdGlvbiByaW1yYWYgKHAsIG9wdGlvbnMsIGNiKSB7XG4gIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGNiID0gb3B0aW9uc1xuICAgIG9wdGlvbnMgPSB7fVxuICB9XG5cbiAgYXNzZXJ0KHAsICdyaW1yYWY6IG1pc3NpbmcgcGF0aCcpXG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgcCwgJ3N0cmluZycsICdyaW1yYWY6IHBhdGggc2hvdWxkIGJlIGEgc3RyaW5nJylcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBjYiwgJ2Z1bmN0aW9uJywgJ3JpbXJhZjogY2FsbGJhY2sgZnVuY3Rpb24gcmVxdWlyZWQnKVxuICBhc3NlcnQob3B0aW9ucywgJ3JpbXJhZjogaW52YWxpZCBvcHRpb25zIGFyZ3VtZW50IHByb3ZpZGVkJylcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBvcHRpb25zLCAnb2JqZWN0JywgJ3JpbXJhZjogb3B0aW9ucyBzaG91bGQgYmUgb2JqZWN0JylcblxuICBkZWZhdWx0cyhvcHRpb25zKVxuXG4gIHZhciBidXN5VHJpZXMgPSAwXG4gIHZhciBlcnJTdGF0ZSA9IG51bGxcbiAgdmFyIG4gPSAwXG5cbiAgaWYgKG9wdGlvbnMuZGlzYWJsZUdsb2IgfHwgIWdsb2IuaGFzTWFnaWMocCkpXG4gICAgcmV0dXJuIGFmdGVyR2xvYihudWxsLCBbcF0pXG5cbiAgb3B0aW9ucy5sc3RhdChwLCBmdW5jdGlvbiAoZXIsIHN0YXQpIHtcbiAgICBpZiAoIWVyKVxuICAgICAgcmV0dXJuIGFmdGVyR2xvYihudWxsLCBbcF0pXG5cbiAgICBnbG9iKHAsIG9wdGlvbnMuZ2xvYiwgYWZ0ZXJHbG9iKVxuICB9KVxuXG4gIGZ1bmN0aW9uIG5leHQgKGVyKSB7XG4gICAgZXJyU3RhdGUgPSBlcnJTdGF0ZSB8fCBlclxuICAgIGlmICgtLW4gPT09IDApXG4gICAgICBjYihlcnJTdGF0ZSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGFmdGVyR2xvYiAoZXIsIHJlc3VsdHMpIHtcbiAgICBpZiAoZXIpXG4gICAgICByZXR1cm4gY2IoZXIpXG5cbiAgICBuID0gcmVzdWx0cy5sZW5ndGhcbiAgICBpZiAobiA9PT0gMClcbiAgICAgIHJldHVybiBjYigpXG5cbiAgICByZXN1bHRzLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgIHJpbXJhZl8ocCwgb3B0aW9ucywgZnVuY3Rpb24gQ0IgKGVyKSB7XG4gICAgICAgIGlmIChlcikge1xuICAgICAgICAgIGlmICgoZXIuY29kZSA9PT0gXCJFQlVTWVwiIHx8IGVyLmNvZGUgPT09IFwiRU5PVEVNUFRZXCIgfHwgZXIuY29kZSA9PT0gXCJFUEVSTVwiKSAmJlxuICAgICAgICAgICAgICBidXN5VHJpZXMgPCBvcHRpb25zLm1heEJ1c3lUcmllcykge1xuICAgICAgICAgICAgYnVzeVRyaWVzICsrXG4gICAgICAgICAgICB2YXIgdGltZSA9IGJ1c3lUcmllcyAqIDEwMFxuICAgICAgICAgICAgLy8gdHJ5IGFnYWluLCB3aXRoIHRoZSBzYW1lIGV4YWN0IGNhbGxiYWNrIGFzIHRoaXMgb25lLlxuICAgICAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICByaW1yYWZfKHAsIG9wdGlvbnMsIENCKVxuICAgICAgICAgICAgfSwgdGltZSlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyB0aGlzIG9uZSB3b24ndCBoYXBwZW4gaWYgZ3JhY2VmdWwtZnMgaXMgdXNlZC5cbiAgICAgICAgICBpZiAoZXIuY29kZSA9PT0gXCJFTUZJTEVcIiAmJiB0aW1lb3V0IDwgb3B0aW9ucy5lbWZpbGVXYWl0KSB7XG4gICAgICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHJpbXJhZl8ocCwgb3B0aW9ucywgQ0IpXG4gICAgICAgICAgICB9LCB0aW1lb3V0ICsrKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGFscmVhZHkgZ29uZVxuICAgICAgICAgIGlmIChlci5jb2RlID09PSBcIkVOT0VOVFwiKSBlciA9IG51bGxcbiAgICAgICAgfVxuXG4gICAgICAgIHRpbWVvdXQgPSAwXG4gICAgICAgIG5leHQoZXIpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cbn1cblxuLy8gVHdvIHBvc3NpYmxlIHN0cmF0ZWdpZXMuXG4vLyAxLiBBc3N1bWUgaXQncyBhIGZpbGUuICB1bmxpbmsgaXQsIHRoZW4gZG8gdGhlIGRpciBzdHVmZiBvbiBFUEVSTSBvciBFSVNESVJcbi8vIDIuIEFzc3VtZSBpdCdzIGEgZGlyZWN0b3J5LiAgcmVhZGRpciwgdGhlbiBkbyB0aGUgZmlsZSBzdHVmZiBvbiBFTk9URElSXG4vL1xuLy8gQm90aCByZXN1bHQgaW4gYW4gZXh0cmEgc3lzY2FsbCB3aGVuIHlvdSBndWVzcyB3cm9uZy4gIEhvd2V2ZXIsIHRoZXJlXG4vLyBhcmUgbGlrZWx5IGZhciBtb3JlIG5vcm1hbCBmaWxlcyBpbiB0aGUgd29ybGQgdGhhbiBkaXJlY3Rvcmllcy4gIFRoaXNcbi8vIGlzIGJhc2VkIG9uIHRoZSBhc3N1bXB0aW9uIHRoYXQgYSB0aGUgYXZlcmFnZSBudW1iZXIgb2YgZmlsZXMgcGVyXG4vLyBkaXJlY3RvcnkgaXMgPj0gMS5cbi8vXG4vLyBJZiBhbnlvbmUgZXZlciBjb21wbGFpbnMgYWJvdXQgdGhpcywgdGhlbiBJIGd1ZXNzIHRoZSBzdHJhdGVneSBjb3VsZFxuLy8gYmUgbWFkZSBjb25maWd1cmFibGUgc29tZWhvdy4gIEJ1dCB1bnRpbCB0aGVuLCBZQUdOSS5cbmZ1bmN0aW9uIHJpbXJhZl8gKHAsIG9wdGlvbnMsIGNiKSB7XG4gIGFzc2VydChwKVxuICBhc3NlcnQob3B0aW9ucylcbiAgYXNzZXJ0KHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJylcblxuICAvLyBzdW5vcyBsZXRzIHRoZSByb290IHVzZXIgdW5saW5rIGRpcmVjdG9yaWVzLCB3aGljaCBpcy4uLiB3ZWlyZC5cbiAgLy8gc28gd2UgaGF2ZSB0byBsc3RhdCBoZXJlIGFuZCBtYWtlIHN1cmUgaXQncyBub3QgYSBkaXIuXG4gIG9wdGlvbnMubHN0YXQocCwgZnVuY3Rpb24gKGVyLCBzdCkge1xuICAgIGlmIChlciAmJiBlci5jb2RlID09PSBcIkVOT0VOVFwiKVxuICAgICAgcmV0dXJuIGNiKG51bGwpXG5cbiAgICAvLyBXaW5kb3dzIGNhbiBFUEVSTSBvbiBzdGF0LiAgTGlmZSBpcyBzdWZmZXJpbmcuXG4gICAgaWYgKGVyICYmIGVyLmNvZGUgPT09IFwiRVBFUk1cIiAmJiBpc1dpbmRvd3MpXG4gICAgICBmaXhXaW5FUEVSTShwLCBvcHRpb25zLCBlciwgY2IpXG5cbiAgICBpZiAoc3QgJiYgc3QuaXNEaXJlY3RvcnkoKSlcbiAgICAgIHJldHVybiBybWRpcihwLCBvcHRpb25zLCBlciwgY2IpXG5cbiAgICBvcHRpb25zLnVubGluayhwLCBmdW5jdGlvbiAoZXIpIHtcbiAgICAgIGlmIChlcikge1xuICAgICAgICBpZiAoZXIuY29kZSA9PT0gXCJFTk9FTlRcIilcbiAgICAgICAgICByZXR1cm4gY2IobnVsbClcbiAgICAgICAgaWYgKGVyLmNvZGUgPT09IFwiRVBFUk1cIilcbiAgICAgICAgICByZXR1cm4gKGlzV2luZG93cylcbiAgICAgICAgICAgID8gZml4V2luRVBFUk0ocCwgb3B0aW9ucywgZXIsIGNiKVxuICAgICAgICAgICAgOiBybWRpcihwLCBvcHRpb25zLCBlciwgY2IpXG4gICAgICAgIGlmIChlci5jb2RlID09PSBcIkVJU0RJUlwiKVxuICAgICAgICAgIHJldHVybiBybWRpcihwLCBvcHRpb25zLCBlciwgY2IpXG4gICAgICB9XG4gICAgICByZXR1cm4gY2IoZXIpXG4gICAgfSlcbiAgfSlcbn1cblxuZnVuY3Rpb24gZml4V2luRVBFUk0gKHAsIG9wdGlvbnMsIGVyLCBjYikge1xuICBhc3NlcnQocClcbiAgYXNzZXJ0KG9wdGlvbnMpXG4gIGFzc2VydCh0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpXG4gIGlmIChlcilcbiAgICBhc3NlcnQoZXIgaW5zdGFuY2VvZiBFcnJvcilcblxuICBvcHRpb25zLmNobW9kKHAsIF8wNjY2LCBmdW5jdGlvbiAoZXIyKSB7XG4gICAgaWYgKGVyMilcbiAgICAgIGNiKGVyMi5jb2RlID09PSBcIkVOT0VOVFwiID8gbnVsbCA6IGVyKVxuICAgIGVsc2VcbiAgICAgIG9wdGlvbnMuc3RhdChwLCBmdW5jdGlvbihlcjMsIHN0YXRzKSB7XG4gICAgICAgIGlmIChlcjMpXG4gICAgICAgICAgY2IoZXIzLmNvZGUgPT09IFwiRU5PRU5UXCIgPyBudWxsIDogZXIpXG4gICAgICAgIGVsc2UgaWYgKHN0YXRzLmlzRGlyZWN0b3J5KCkpXG4gICAgICAgICAgcm1kaXIocCwgb3B0aW9ucywgZXIsIGNiKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgb3B0aW9ucy51bmxpbmsocCwgY2IpXG4gICAgICB9KVxuICB9KVxufVxuXG5mdW5jdGlvbiBmaXhXaW5FUEVSTVN5bmMgKHAsIG9wdGlvbnMsIGVyKSB7XG4gIGFzc2VydChwKVxuICBhc3NlcnQob3B0aW9ucylcbiAgaWYgKGVyKVxuICAgIGFzc2VydChlciBpbnN0YW5jZW9mIEVycm9yKVxuXG4gIHRyeSB7XG4gICAgb3B0aW9ucy5jaG1vZFN5bmMocCwgXzA2NjYpXG4gIH0gY2F0Y2ggKGVyMikge1xuICAgIGlmIChlcjIuY29kZSA9PT0gXCJFTk9FTlRcIilcbiAgICAgIHJldHVyblxuICAgIGVsc2VcbiAgICAgIHRocm93IGVyXG4gIH1cblxuICB0cnkge1xuICAgIHZhciBzdGF0cyA9IG9wdGlvbnMuc3RhdFN5bmMocClcbiAgfSBjYXRjaCAoZXIzKSB7XG4gICAgaWYgKGVyMy5jb2RlID09PSBcIkVOT0VOVFwiKVxuICAgICAgcmV0dXJuXG4gICAgZWxzZVxuICAgICAgdGhyb3cgZXJcbiAgfVxuXG4gIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKVxuICAgIHJtZGlyU3luYyhwLCBvcHRpb25zLCBlcilcbiAgZWxzZVxuICAgIG9wdGlvbnMudW5saW5rU3luYyhwKVxufVxuXG5mdW5jdGlvbiBybWRpciAocCwgb3B0aW9ucywgb3JpZ2luYWxFciwgY2IpIHtcbiAgYXNzZXJ0KHApXG4gIGFzc2VydChvcHRpb25zKVxuICBpZiAob3JpZ2luYWxFcilcbiAgICBhc3NlcnQob3JpZ2luYWxFciBpbnN0YW5jZW9mIEVycm9yKVxuICBhc3NlcnQodHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKVxuXG4gIC8vIHRyeSB0byBybWRpciBmaXJzdCwgYW5kIG9ubHkgcmVhZGRpciBvbiBFTk9URU1QVFkgb3IgRUVYSVNUIChTdW5PUylcbiAgLy8gaWYgd2UgZ3Vlc3NlZCB3cm9uZywgYW5kIGl0J3Mgbm90IGEgZGlyZWN0b3J5LCB0aGVuXG4gIC8vIHJhaXNlIHRoZSBvcmlnaW5hbCBlcnJvci5cbiAgb3B0aW9ucy5ybWRpcihwLCBmdW5jdGlvbiAoZXIpIHtcbiAgICBpZiAoZXIgJiYgKGVyLmNvZGUgPT09IFwiRU5PVEVNUFRZXCIgfHwgZXIuY29kZSA9PT0gXCJFRVhJU1RcIiB8fCBlci5jb2RlID09PSBcIkVQRVJNXCIpKVxuICAgICAgcm1raWRzKHAsIG9wdGlvbnMsIGNiKVxuICAgIGVsc2UgaWYgKGVyICYmIGVyLmNvZGUgPT09IFwiRU5PVERJUlwiKVxuICAgICAgY2Iob3JpZ2luYWxFcilcbiAgICBlbHNlXG4gICAgICBjYihlcilcbiAgfSlcbn1cblxuZnVuY3Rpb24gcm1raWRzKHAsIG9wdGlvbnMsIGNiKSB7XG4gIGFzc2VydChwKVxuICBhc3NlcnQob3B0aW9ucylcbiAgYXNzZXJ0KHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJylcblxuICBvcHRpb25zLnJlYWRkaXIocCwgZnVuY3Rpb24gKGVyLCBmaWxlcykge1xuICAgIGlmIChlcilcbiAgICAgIHJldHVybiBjYihlcilcbiAgICB2YXIgbiA9IGZpbGVzLmxlbmd0aFxuICAgIGlmIChuID09PSAwKVxuICAgICAgcmV0dXJuIG9wdGlvbnMucm1kaXIocCwgY2IpXG4gICAgdmFyIGVyclN0YXRlXG4gICAgZmlsZXMuZm9yRWFjaChmdW5jdGlvbiAoZikge1xuICAgICAgcmltcmFmKHBhdGguam9pbihwLCBmKSwgb3B0aW9ucywgZnVuY3Rpb24gKGVyKSB7XG4gICAgICAgIGlmIChlcnJTdGF0ZSlcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgaWYgKGVyKVxuICAgICAgICAgIHJldHVybiBjYihlcnJTdGF0ZSA9IGVyKVxuICAgICAgICBpZiAoLS1uID09PSAwKVxuICAgICAgICAgIG9wdGlvbnMucm1kaXIocCwgY2IpXG4gICAgICB9KVxuICAgIH0pXG4gIH0pXG59XG5cbi8vIHRoaXMgbG9va3Mgc2ltcGxlciwgYW5kIGlzIHN0cmljdGx5ICpmYXN0ZXIqLCBidXQgd2lsbFxuLy8gdGllIHVwIHRoZSBKYXZhU2NyaXB0IHRocmVhZCBhbmQgZmFpbCBvbiBleGNlc3NpdmVseVxuLy8gZGVlcCBkaXJlY3RvcnkgdHJlZXMuXG5mdW5jdGlvbiByaW1yYWZTeW5jIChwLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gIGRlZmF1bHRzKG9wdGlvbnMpXG5cbiAgYXNzZXJ0KHAsICdyaW1yYWY6IG1pc3NpbmcgcGF0aCcpXG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgcCwgJ3N0cmluZycsICdyaW1yYWY6IHBhdGggc2hvdWxkIGJlIGEgc3RyaW5nJylcbiAgYXNzZXJ0KG9wdGlvbnMsICdyaW1yYWY6IG1pc3Npbmcgb3B0aW9ucycpXG4gIGFzc2VydC5lcXVhbCh0eXBlb2Ygb3B0aW9ucywgJ29iamVjdCcsICdyaW1yYWY6IG9wdGlvbnMgc2hvdWxkIGJlIG9iamVjdCcpXG5cbiAgdmFyIHJlc3VsdHNcblxuICBpZiAob3B0aW9ucy5kaXNhYmxlR2xvYiB8fCAhZ2xvYi5oYXNNYWdpYyhwKSkge1xuICAgIHJlc3VsdHMgPSBbcF1cbiAgfSBlbHNlIHtcbiAgICB0cnkge1xuICAgICAgb3B0aW9ucy5sc3RhdFN5bmMocClcbiAgICAgIHJlc3VsdHMgPSBbcF1cbiAgICB9IGNhdGNoIChlcikge1xuICAgICAgcmVzdWx0cyA9IGdsb2Iuc3luYyhwLCBvcHRpb25zLmdsb2IpXG4gICAgfVxuICB9XG5cbiAgaWYgKCFyZXN1bHRzLmxlbmd0aClcbiAgICByZXR1cm5cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHJlc3VsdHMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcCA9IHJlc3VsdHNbaV1cblxuICAgIHRyeSB7XG4gICAgICB2YXIgc3QgPSBvcHRpb25zLmxzdGF0U3luYyhwKVxuICAgIH0gY2F0Y2ggKGVyKSB7XG4gICAgICBpZiAoZXIuY29kZSA9PT0gXCJFTk9FTlRcIilcbiAgICAgICAgcmV0dXJuXG5cbiAgICAgIC8vIFdpbmRvd3MgY2FuIEVQRVJNIG9uIHN0YXQuICBMaWZlIGlzIHN1ZmZlcmluZy5cbiAgICAgIGlmIChlci5jb2RlID09PSBcIkVQRVJNXCIgJiYgaXNXaW5kb3dzKVxuICAgICAgICBmaXhXaW5FUEVSTVN5bmMocCwgb3B0aW9ucywgZXIpXG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIC8vIHN1bm9zIGxldHMgdGhlIHJvb3QgdXNlciB1bmxpbmsgZGlyZWN0b3JpZXMsIHdoaWNoIGlzLi4uIHdlaXJkLlxuICAgICAgaWYgKHN0ICYmIHN0LmlzRGlyZWN0b3J5KCkpXG4gICAgICAgIHJtZGlyU3luYyhwLCBvcHRpb25zLCBudWxsKVxuICAgICAgZWxzZVxuICAgICAgICBvcHRpb25zLnVubGlua1N5bmMocClcbiAgICB9IGNhdGNoIChlcikge1xuICAgICAgaWYgKGVyLmNvZGUgPT09IFwiRU5PRU5UXCIpXG4gICAgICAgIHJldHVyblxuICAgICAgaWYgKGVyLmNvZGUgPT09IFwiRVBFUk1cIilcbiAgICAgICAgcmV0dXJuIGlzV2luZG93cyA/IGZpeFdpbkVQRVJNU3luYyhwLCBvcHRpb25zLCBlcikgOiBybWRpclN5bmMocCwgb3B0aW9ucywgZXIpXG4gICAgICBpZiAoZXIuY29kZSAhPT0gXCJFSVNESVJcIilcbiAgICAgICAgdGhyb3cgZXJcblxuICAgICAgcm1kaXJTeW5jKHAsIG9wdGlvbnMsIGVyKVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBybWRpclN5bmMgKHAsIG9wdGlvbnMsIG9yaWdpbmFsRXIpIHtcbiAgYXNzZXJ0KHApXG4gIGFzc2VydChvcHRpb25zKVxuICBpZiAob3JpZ2luYWxFcilcbiAgICBhc3NlcnQob3JpZ2luYWxFciBpbnN0YW5jZW9mIEVycm9yKVxuXG4gIHRyeSB7XG4gICAgb3B0aW9ucy5ybWRpclN5bmMocClcbiAgfSBjYXRjaCAoZXIpIHtcbiAgICBpZiAoZXIuY29kZSA9PT0gXCJFTk9FTlRcIilcbiAgICAgIHJldHVyblxuICAgIGlmIChlci5jb2RlID09PSBcIkVOT1RESVJcIilcbiAgICAgIHRocm93IG9yaWdpbmFsRXJcbiAgICBpZiAoZXIuY29kZSA9PT0gXCJFTk9URU1QVFlcIiB8fCBlci5jb2RlID09PSBcIkVFWElTVFwiIHx8IGVyLmNvZGUgPT09IFwiRVBFUk1cIilcbiAgICAgIHJta2lkc1N5bmMocCwgb3B0aW9ucylcbiAgfVxufVxuXG5mdW5jdGlvbiBybWtpZHNTeW5jIChwLCBvcHRpb25zKSB7XG4gIGFzc2VydChwKVxuICBhc3NlcnQob3B0aW9ucylcbiAgb3B0aW9ucy5yZWFkZGlyU3luYyhwKS5mb3JFYWNoKGZ1bmN0aW9uIChmKSB7XG4gICAgcmltcmFmU3luYyhwYXRoLmpvaW4ocCwgZiksIG9wdGlvbnMpXG4gIH0pXG5cbiAgLy8gV2Ugb25seSBlbmQgdXAgaGVyZSBvbmNlIHdlIGdvdCBFTk9URU1QVFkgYXQgbGVhc3Qgb25jZSwgYW5kXG4gIC8vIGF0IHRoaXMgcG9pbnQsIHdlIGFyZSBndWFyYW50ZWVkIHRvIGhhdmUgcmVtb3ZlZCBhbGwgdGhlIGtpZHMuXG4gIC8vIFNvLCB3ZSBrbm93IHRoYXQgaXQgd29uJ3QgYmUgRU5PRU5UIG9yIEVOT1RESVIgb3IgYW55dGhpbmcgZWxzZS5cbiAgLy8gdHJ5IHJlYWxseSBoYXJkIHRvIGRlbGV0ZSBzdHVmZiBvbiB3aW5kb3dzLCBiZWNhdXNlIGl0IGhhcyBhXG4gIC8vIFBST0ZPVU5ETFkgYW5ub3lpbmcgaGFiaXQgb2Ygbm90IGNsb3NpbmcgaGFuZGxlcyBwcm9tcHRseSB3aGVuXG4gIC8vIGZpbGVzIGFyZSBkZWxldGVkLCByZXN1bHRpbmcgaW4gc3B1cmlvdXMgRU5PVEVNUFRZIGVycm9ycy5cbiAgdmFyIHJldHJpZXMgPSBpc1dpbmRvd3MgPyAxMDAgOiAxXG4gIHZhciBpID0gMFxuICBkbyB7XG4gICAgdmFyIHRocmV3ID0gdHJ1ZVxuICAgIHRyeSB7XG4gICAgICB2YXIgcmV0ID0gb3B0aW9ucy5ybWRpclN5bmMocCwgb3B0aW9ucylcbiAgICAgIHRocmV3ID0gZmFsc2VcbiAgICAgIHJldHVybiByZXRcbiAgICB9IGZpbmFsbHkge1xuICAgICAgaWYgKCsraSA8IHJldHJpZXMgJiYgdGhyZXcpXG4gICAgICAgIGNvbnRpbnVlXG4gICAgfVxuICB9IHdoaWxlICh0cnVlKVxufVxuIiwiKGZ1bmN0aW9uIChnbG9iYWwsIHVuZGVmaW5lZCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgaWYgKGdsb2JhbC5zZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBuZXh0SGFuZGxlID0gMTsgLy8gU3BlYyBzYXlzIGdyZWF0ZXIgdGhhbiB6ZXJvXG4gICAgdmFyIHRhc2tzQnlIYW5kbGUgPSB7fTtcbiAgICB2YXIgY3VycmVudGx5UnVubmluZ0FUYXNrID0gZmFsc2U7XG4gICAgdmFyIGRvYyA9IGdsb2JhbC5kb2N1bWVudDtcbiAgICB2YXIgcmVnaXN0ZXJJbW1lZGlhdGU7XG5cbiAgICBmdW5jdGlvbiBzZXRJbW1lZGlhdGUoY2FsbGJhY2spIHtcbiAgICAgIC8vIENhbGxiYWNrIGNhbiBlaXRoZXIgYmUgYSBmdW5jdGlvbiBvciBhIHN0cmluZ1xuICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGNhbGxiYWNrID0gbmV3IEZ1bmN0aW9uKFwiXCIgKyBjYWxsYmFjayk7XG4gICAgICB9XG4gICAgICAvLyBDb3B5IGZ1bmN0aW9uIGFyZ3VtZW50c1xuICAgICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgYXJnc1tpXSA9IGFyZ3VtZW50c1tpICsgMV07XG4gICAgICB9XG4gICAgICAvLyBTdG9yZSBhbmQgcmVnaXN0ZXIgdGhlIHRhc2tcbiAgICAgIHZhciB0YXNrID0geyBjYWxsYmFjazogY2FsbGJhY2ssIGFyZ3M6IGFyZ3MgfTtcbiAgICAgIHRhc2tzQnlIYW5kbGVbbmV4dEhhbmRsZV0gPSB0YXNrO1xuICAgICAgcmVnaXN0ZXJJbW1lZGlhdGUobmV4dEhhbmRsZSk7XG4gICAgICByZXR1cm4gbmV4dEhhbmRsZSsrO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsZWFySW1tZWRpYXRlKGhhbmRsZSkge1xuICAgICAgICBkZWxldGUgdGFza3NCeUhhbmRsZVtoYW5kbGVdO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJ1bih0YXNrKSB7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IHRhc2suY2FsbGJhY2s7XG4gICAgICAgIHZhciBhcmdzID0gdGFzay5hcmdzO1xuICAgICAgICBzd2l0Y2ggKGFyZ3MubGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgY2FsbGJhY2soYXJnc1swXSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgY2FsbGJhY2soYXJnc1swXSwgYXJnc1sxXSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgY2FsbGJhY2soYXJnc1swXSwgYXJnc1sxXSwgYXJnc1syXSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KHVuZGVmaW5lZCwgYXJncyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJ1bklmUHJlc2VudChoYW5kbGUpIHtcbiAgICAgICAgLy8gRnJvbSB0aGUgc3BlYzogXCJXYWl0IHVudGlsIGFueSBpbnZvY2F0aW9ucyBvZiB0aGlzIGFsZ29yaXRobSBzdGFydGVkIGJlZm9yZSB0aGlzIG9uZSBoYXZlIGNvbXBsZXRlZC5cIlxuICAgICAgICAvLyBTbyBpZiB3ZSdyZSBjdXJyZW50bHkgcnVubmluZyBhIHRhc2ssIHdlJ2xsIG5lZWQgdG8gZGVsYXkgdGhpcyBpbnZvY2F0aW9uLlxuICAgICAgICBpZiAoY3VycmVudGx5UnVubmluZ0FUYXNrKSB7XG4gICAgICAgICAgICAvLyBEZWxheSBieSBkb2luZyBhIHNldFRpbWVvdXQuIHNldEltbWVkaWF0ZSB3YXMgdHJpZWQgaW5zdGVhZCwgYnV0IGluIEZpcmVmb3ggNyBpdCBnZW5lcmF0ZWQgYVxuICAgICAgICAgICAgLy8gXCJ0b28gbXVjaCByZWN1cnNpb25cIiBlcnJvci5cbiAgICAgICAgICAgIHNldFRpbWVvdXQocnVuSWZQcmVzZW50LCAwLCBoYW5kbGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIHRhc2sgPSB0YXNrc0J5SGFuZGxlW2hhbmRsZV07XG4gICAgICAgICAgICBpZiAodGFzaykge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRseVJ1bm5pbmdBVGFzayA9IHRydWU7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgcnVuKHRhc2spO1xuICAgICAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW1tZWRpYXRlKGhhbmRsZSk7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRseVJ1bm5pbmdBVGFzayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc3RhbGxOZXh0VGlja0ltcGxlbWVudGF0aW9uKCkge1xuICAgICAgICByZWdpc3RlckltbWVkaWF0ZSA9IGZ1bmN0aW9uKGhhbmRsZSkge1xuICAgICAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbiAoKSB7IHJ1bklmUHJlc2VudChoYW5kbGUpOyB9KTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjYW5Vc2VQb3N0TWVzc2FnZSgpIHtcbiAgICAgICAgLy8gVGhlIHRlc3QgYWdhaW5zdCBgaW1wb3J0U2NyaXB0c2AgcHJldmVudHMgdGhpcyBpbXBsZW1lbnRhdGlvbiBmcm9tIGJlaW5nIGluc3RhbGxlZCBpbnNpZGUgYSB3ZWIgd29ya2VyLFxuICAgICAgICAvLyB3aGVyZSBgZ2xvYmFsLnBvc3RNZXNzYWdlYCBtZWFucyBzb21ldGhpbmcgY29tcGxldGVseSBkaWZmZXJlbnQgYW5kIGNhbid0IGJlIHVzZWQgZm9yIHRoaXMgcHVycG9zZS5cbiAgICAgICAgaWYgKGdsb2JhbC5wb3N0TWVzc2FnZSAmJiAhZ2xvYmFsLmltcG9ydFNjcmlwdHMpIHtcbiAgICAgICAgICAgIHZhciBwb3N0TWVzc2FnZUlzQXN5bmNocm9ub3VzID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhciBvbGRPbk1lc3NhZ2UgPSBnbG9iYWwub25tZXNzYWdlO1xuICAgICAgICAgICAgZ2xvYmFsLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHBvc3RNZXNzYWdlSXNBc3luY2hyb25vdXMgPSBmYWxzZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBnbG9iYWwucG9zdE1lc3NhZ2UoXCJcIiwgXCIqXCIpO1xuICAgICAgICAgICAgZ2xvYmFsLm9ubWVzc2FnZSA9IG9sZE9uTWVzc2FnZTtcbiAgICAgICAgICAgIHJldHVybiBwb3N0TWVzc2FnZUlzQXN5bmNocm9ub3VzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5zdGFsbFBvc3RNZXNzYWdlSW1wbGVtZW50YXRpb24oKSB7XG4gICAgICAgIC8vIEluc3RhbGxzIGFuIGV2ZW50IGhhbmRsZXIgb24gYGdsb2JhbGAgZm9yIHRoZSBgbWVzc2FnZWAgZXZlbnQ6IHNlZVxuICAgICAgICAvLyAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0RPTS93aW5kb3cucG9zdE1lc3NhZ2VcbiAgICAgICAgLy8gKiBodHRwOi8vd3d3LndoYXR3Zy5vcmcvc3BlY3Mvd2ViLWFwcHMvY3VycmVudC13b3JrL211bHRpcGFnZS9jb21tcy5odG1sI2Nyb3NzRG9jdW1lbnRNZXNzYWdlc1xuXG4gICAgICAgIHZhciBtZXNzYWdlUHJlZml4ID0gXCJzZXRJbW1lZGlhdGUkXCIgKyBNYXRoLnJhbmRvbSgpICsgXCIkXCI7XG4gICAgICAgIHZhciBvbkdsb2JhbE1lc3NhZ2UgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgaWYgKGV2ZW50LnNvdXJjZSA9PT0gZ2xvYmFsICYmXG4gICAgICAgICAgICAgICAgdHlwZW9mIGV2ZW50LmRhdGEgPT09IFwic3RyaW5nXCIgJiZcbiAgICAgICAgICAgICAgICBldmVudC5kYXRhLmluZGV4T2YobWVzc2FnZVByZWZpeCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICBydW5JZlByZXNlbnQoK2V2ZW50LmRhdGEuc2xpY2UobWVzc2FnZVByZWZpeC5sZW5ndGgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoZ2xvYmFsLmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgICAgIGdsb2JhbC5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBvbkdsb2JhbE1lc3NhZ2UsIGZhbHNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdsb2JhbC5hdHRhY2hFdmVudChcIm9ubWVzc2FnZVwiLCBvbkdsb2JhbE1lc3NhZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVnaXN0ZXJJbW1lZGlhdGUgPSBmdW5jdGlvbihoYW5kbGUpIHtcbiAgICAgICAgICAgIGdsb2JhbC5wb3N0TWVzc2FnZShtZXNzYWdlUHJlZml4ICsgaGFuZGxlLCBcIipcIik7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5zdGFsbE1lc3NhZ2VDaGFubmVsSW1wbGVtZW50YXRpb24oKSB7XG4gICAgICAgIHZhciBjaGFubmVsID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gICAgICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIHZhciBoYW5kbGUgPSBldmVudC5kYXRhO1xuICAgICAgICAgICAgcnVuSWZQcmVzZW50KGhhbmRsZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVnaXN0ZXJJbW1lZGlhdGUgPSBmdW5jdGlvbihoYW5kbGUpIHtcbiAgICAgICAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoaGFuZGxlKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnN0YWxsUmVhZHlTdGF0ZUNoYW5nZUltcGxlbWVudGF0aW9uKCkge1xuICAgICAgICB2YXIgaHRtbCA9IGRvYy5kb2N1bWVudEVsZW1lbnQ7XG4gICAgICAgIHJlZ2lzdGVySW1tZWRpYXRlID0gZnVuY3Rpb24oaGFuZGxlKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgYSA8c2NyaXB0PiBlbGVtZW50OyBpdHMgcmVhZHlzdGF0ZWNoYW5nZSBldmVudCB3aWxsIGJlIGZpcmVkIGFzeW5jaHJvbm91c2x5IG9uY2UgaXQgaXMgaW5zZXJ0ZWRcbiAgICAgICAgICAgIC8vIGludG8gdGhlIGRvY3VtZW50LiBEbyBzbywgdGh1cyBxdWV1aW5nIHVwIHRoZSB0YXNrLiBSZW1lbWJlciB0byBjbGVhbiB1cCBvbmNlIGl0J3MgYmVlbiBjYWxsZWQuXG4gICAgICAgICAgICB2YXIgc2NyaXB0ID0gZG9jLmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIik7XG4gICAgICAgICAgICBzY3JpcHQub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJ1bklmUHJlc2VudChoYW5kbGUpO1xuICAgICAgICAgICAgICAgIHNjcmlwdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBudWxsO1xuICAgICAgICAgICAgICAgIGh0bWwucmVtb3ZlQ2hpbGQoc2NyaXB0KTtcbiAgICAgICAgICAgICAgICBzY3JpcHQgPSBudWxsO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGh0bWwuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnN0YWxsU2V0VGltZW91dEltcGxlbWVudGF0aW9uKCkge1xuICAgICAgICByZWdpc3RlckltbWVkaWF0ZSA9IGZ1bmN0aW9uKGhhbmRsZSkge1xuICAgICAgICAgICAgc2V0VGltZW91dChydW5JZlByZXNlbnQsIDAsIGhhbmRsZSk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gSWYgc3VwcG9ydGVkLCB3ZSBzaG91bGQgYXR0YWNoIHRvIHRoZSBwcm90b3R5cGUgb2YgZ2xvYmFsLCBzaW5jZSB0aGF0IGlzIHdoZXJlIHNldFRpbWVvdXQgZXQgYWwuIGxpdmUuXG4gICAgdmFyIGF0dGFjaFRvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZihnbG9iYWwpO1xuICAgIGF0dGFjaFRvID0gYXR0YWNoVG8gJiYgYXR0YWNoVG8uc2V0VGltZW91dCA/IGF0dGFjaFRvIDogZ2xvYmFsO1xuXG4gICAgLy8gRG9uJ3QgZ2V0IGZvb2xlZCBieSBlLmcuIGJyb3dzZXJpZnkgZW52aXJvbm1lbnRzLlxuICAgIGlmICh7fS50b1N0cmluZy5jYWxsKGdsb2JhbC5wcm9jZXNzKSA9PT0gXCJbb2JqZWN0IHByb2Nlc3NdXCIpIHtcbiAgICAgICAgLy8gRm9yIE5vZGUuanMgYmVmb3JlIDAuOVxuICAgICAgICBpbnN0YWxsTmV4dFRpY2tJbXBsZW1lbnRhdGlvbigpO1xuXG4gICAgfSBlbHNlIGlmIChjYW5Vc2VQb3N0TWVzc2FnZSgpKSB7XG4gICAgICAgIC8vIEZvciBub24tSUUxMCBtb2Rlcm4gYnJvd3NlcnNcbiAgICAgICAgaW5zdGFsbFBvc3RNZXNzYWdlSW1wbGVtZW50YXRpb24oKTtcblxuICAgIH0gZWxzZSBpZiAoZ2xvYmFsLk1lc3NhZ2VDaGFubmVsKSB7XG4gICAgICAgIC8vIEZvciB3ZWIgd29ya2Vycywgd2hlcmUgc3VwcG9ydGVkXG4gICAgICAgIGluc3RhbGxNZXNzYWdlQ2hhbm5lbEltcGxlbWVudGF0aW9uKCk7XG5cbiAgICB9IGVsc2UgaWYgKGRvYyAmJiBcIm9ucmVhZHlzdGF0ZWNoYW5nZVwiIGluIGRvYy5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpKSB7XG4gICAgICAgIC8vIEZvciBJRSA24oCTOFxuICAgICAgICBpbnN0YWxsUmVhZHlTdGF0ZUNoYW5nZUltcGxlbWVudGF0aW9uKCk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBGb3Igb2xkZXIgYnJvd3NlcnNcbiAgICAgICAgaW5zdGFsbFNldFRpbWVvdXRJbXBsZW1lbnRhdGlvbigpO1xuICAgIH1cblxuICAgIGF0dGFjaFRvLnNldEltbWVkaWF0ZSA9IHNldEltbWVkaWF0ZTtcbiAgICBhdHRhY2hUby5jbGVhckltbWVkaWF0ZSA9IGNsZWFySW1tZWRpYXRlO1xufSh0eXBlb2Ygc2VsZiA9PT0gXCJ1bmRlZmluZWRcIiA/IHR5cGVvZiBnbG9iYWwgPT09IFwidW5kZWZpbmVkXCIgPyB0aGlzIDogZ2xvYmFsIDogc2VsZikpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNsaWNlU3RyZWFtO1xuXG52YXIgVHJhbnNmb3JtID0gcmVxdWlyZSgncmVhZGFibGUtc3RyZWFtL3RyYW5zZm9ybScpO1xudmFyIGluaGVyaXRzID0gcmVxdWlyZShcInV0aWxcIikuaW5oZXJpdHM7XG5cbmluaGVyaXRzKFNsaWNlU3RyZWFtLCBUcmFuc2Zvcm0pO1xuXG5mdW5jdGlvbiBTbGljZVN0cmVhbShvcHRzLCBzbGljZUZuKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTbGljZVN0cmVhbSkpIHtcbiAgICByZXR1cm4gbmV3IFNsaWNlU3RyZWFtKG9wdHMsIHNsaWNlRm4pO1xuICB9XG5cbiAgdGhpcy5fb3B0cyA9IG9wdHM7XG4gIHRoaXMuX2FjY3VtdWxhdGVkTGVuZ3RoID0gMDtcbiAgdGhpcy5zbGljZUZuID0gc2xpY2VGbjtcblxuICBUcmFuc2Zvcm0uY2FsbCh0aGlzKTtcbn1cblxuU2xpY2VTdHJlYW0ucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbiAoY2h1bmssIGVuY29kaW5nLCBjYWxsYmFjaykge1xuICB0aGlzLl9hY2N1bXVsYXRlZExlbmd0aCArPSBjaHVuay5sZW5ndGg7XG5cbiAgaWYgKHRoaXMuX2FjY3VtdWxhdGVkTGVuZ3RoID49IHRoaXMuX29wdHMubGVuZ3RoKSB7XG4gICAgLy90b2RvIGhhbmRsZSBtb3JlIHRoYW4gb25lIHNsaWNlIGluIGEgc3RyZWFtXG4gICAgdmFyIG9mZnNldCA9IGNodW5rLmxlbmd0aCAtICh0aGlzLl9hY2N1bXVsYXRlZExlbmd0aCAtIHRoaXMuX29wdHMubGVuZ3RoKTtcbiAgICB0aGlzLnNsaWNlRm4oY2h1bmsuc2xpY2UoMCwgb2Zmc2V0KSwgdHJ1ZSwgY2h1bmsuc2xpY2Uob2Zmc2V0KSk7XG4gICAgY2FsbGJhY2soKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnNsaWNlRm4oY2h1bmspO1xuICAgIGNhbGxiYWNrKCk7XG4gIH1cbn07XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIEJ1ZmZlciA9IHJlcXVpcmUoJ2J1ZmZlcicpLkJ1ZmZlcjtcblxudmFyIGlzQnVmZmVyRW5jb2RpbmcgPSBCdWZmZXIuaXNFbmNvZGluZ1xuICB8fCBmdW5jdGlvbihlbmNvZGluZykge1xuICAgICAgIHN3aXRjaCAoZW5jb2RpbmcgJiYgZW5jb2RpbmcudG9Mb3dlckNhc2UoKSkge1xuICAgICAgICAgY2FzZSAnaGV4JzogY2FzZSAndXRmOCc6IGNhc2UgJ3V0Zi04JzogY2FzZSAnYXNjaWknOiBjYXNlICdiaW5hcnknOiBjYXNlICdiYXNlNjQnOiBjYXNlICd1Y3MyJzogY2FzZSAndWNzLTInOiBjYXNlICd1dGYxNmxlJzogY2FzZSAndXRmLTE2bGUnOiBjYXNlICdyYXcnOiByZXR1cm4gdHJ1ZTtcbiAgICAgICAgIGRlZmF1bHQ6IHJldHVybiBmYWxzZTtcbiAgICAgICB9XG4gICAgIH1cblxuXG5mdW5jdGlvbiBhc3NlcnRFbmNvZGluZyhlbmNvZGluZykge1xuICBpZiAoZW5jb2RpbmcgJiYgIWlzQnVmZmVyRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpO1xuICB9XG59XG5cbi8vIFN0cmluZ0RlY29kZXIgcHJvdmlkZXMgYW4gaW50ZXJmYWNlIGZvciBlZmZpY2llbnRseSBzcGxpdHRpbmcgYSBzZXJpZXMgb2Zcbi8vIGJ1ZmZlcnMgaW50byBhIHNlcmllcyBvZiBKUyBzdHJpbmdzIHdpdGhvdXQgYnJlYWtpbmcgYXBhcnQgbXVsdGktYnl0ZVxuLy8gY2hhcmFjdGVycy4gQ0VTVS04IGlzIGhhbmRsZWQgYXMgcGFydCBvZiB0aGUgVVRGLTggZW5jb2RpbmcuXG4vL1xuLy8gQFRPRE8gSGFuZGxpbmcgYWxsIGVuY29kaW5ncyBpbnNpZGUgYSBzaW5nbGUgb2JqZWN0IG1ha2VzIGl0IHZlcnkgZGlmZmljdWx0XG4vLyB0byByZWFzb24gYWJvdXQgdGhpcyBjb2RlLCBzbyBpdCBzaG91bGQgYmUgc3BsaXQgdXAgaW4gdGhlIGZ1dHVyZS5cbi8vIEBUT0RPIFRoZXJlIHNob3VsZCBiZSBhIHV0Zjgtc3RyaWN0IGVuY29kaW5nIHRoYXQgcmVqZWN0cyBpbnZhbGlkIFVURi04IGNvZGVcbi8vIHBvaW50cyBhcyB1c2VkIGJ5IENFU1UtOC5cbnZhciBTdHJpbmdEZWNvZGVyID0gZXhwb3J0cy5TdHJpbmdEZWNvZGVyID0gZnVuY3Rpb24oZW5jb2RpbmcpIHtcbiAgdGhpcy5lbmNvZGluZyA9IChlbmNvZGluZyB8fCAndXRmOCcpLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvWy1fXS8sICcnKTtcbiAgYXNzZXJ0RW5jb2RpbmcoZW5jb2RpbmcpO1xuICBzd2l0Y2ggKHRoaXMuZW5jb2RpbmcpIHtcbiAgICBjYXNlICd1dGY4JzpcbiAgICAgIC8vIENFU1UtOCByZXByZXNlbnRzIGVhY2ggb2YgU3Vycm9nYXRlIFBhaXIgYnkgMy1ieXRlc1xuICAgICAgdGhpcy5zdXJyb2dhdGVTaXplID0gMztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgLy8gVVRGLTE2IHJlcHJlc2VudHMgZWFjaCBvZiBTdXJyb2dhdGUgUGFpciBieSAyLWJ5dGVzXG4gICAgICB0aGlzLnN1cnJvZ2F0ZVNpemUgPSAyO1xuICAgICAgdGhpcy5kZXRlY3RJbmNvbXBsZXRlQ2hhciA9IHV0ZjE2RGV0ZWN0SW5jb21wbGV0ZUNoYXI7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgLy8gQmFzZS02NCBzdG9yZXMgMyBieXRlcyBpbiA0IGNoYXJzLCBhbmQgcGFkcyB0aGUgcmVtYWluZGVyLlxuICAgICAgdGhpcy5zdXJyb2dhdGVTaXplID0gMztcbiAgICAgIHRoaXMuZGV0ZWN0SW5jb21wbGV0ZUNoYXIgPSBiYXNlNjREZXRlY3RJbmNvbXBsZXRlQ2hhcjtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aGlzLndyaXRlID0gcGFzc1Rocm91Z2hXcml0ZTtcbiAgICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIEVub3VnaCBzcGFjZSB0byBzdG9yZSBhbGwgYnl0ZXMgb2YgYSBzaW5nbGUgY2hhcmFjdGVyLiBVVEYtOCBuZWVkcyA0XG4gIC8vIGJ5dGVzLCBidXQgQ0VTVS04IG1heSByZXF1aXJlIHVwIHRvIDYgKDMgYnl0ZXMgcGVyIHN1cnJvZ2F0ZSkuXG4gIHRoaXMuY2hhckJ1ZmZlciA9IG5ldyBCdWZmZXIoNik7XG4gIC8vIE51bWJlciBvZiBieXRlcyByZWNlaXZlZCBmb3IgdGhlIGN1cnJlbnQgaW5jb21wbGV0ZSBtdWx0aS1ieXRlIGNoYXJhY3Rlci5cbiAgdGhpcy5jaGFyUmVjZWl2ZWQgPSAwO1xuICAvLyBOdW1iZXIgb2YgYnl0ZXMgZXhwZWN0ZWQgZm9yIHRoZSBjdXJyZW50IGluY29tcGxldGUgbXVsdGktYnl0ZSBjaGFyYWN0ZXIuXG4gIHRoaXMuY2hhckxlbmd0aCA9IDA7XG59O1xuXG5cbi8vIHdyaXRlIGRlY29kZXMgdGhlIGdpdmVuIGJ1ZmZlciBhbmQgcmV0dXJucyBpdCBhcyBKUyBzdHJpbmcgdGhhdCBpc1xuLy8gZ3VhcmFudGVlZCB0byBub3QgY29udGFpbiBhbnkgcGFydGlhbCBtdWx0aS1ieXRlIGNoYXJhY3RlcnMuIEFueSBwYXJ0aWFsXG4vLyBjaGFyYWN0ZXIgZm91bmQgYXQgdGhlIGVuZCBvZiB0aGUgYnVmZmVyIGlzIGJ1ZmZlcmVkIHVwLCBhbmQgd2lsbCBiZVxuLy8gcmV0dXJuZWQgd2hlbiBjYWxsaW5nIHdyaXRlIGFnYWluIHdpdGggdGhlIHJlbWFpbmluZyBieXRlcy5cbi8vXG4vLyBOb3RlOiBDb252ZXJ0aW5nIGEgQnVmZmVyIGNvbnRhaW5pbmcgYW4gb3JwaGFuIHN1cnJvZ2F0ZSB0byBhIFN0cmluZ1xuLy8gY3VycmVudGx5IHdvcmtzLCBidXQgY29udmVydGluZyBhIFN0cmluZyB0byBhIEJ1ZmZlciAodmlhIGBuZXcgQnVmZmVyYCwgb3Jcbi8vIEJ1ZmZlciN3cml0ZSkgd2lsbCByZXBsYWNlIGluY29tcGxldGUgc3Vycm9nYXRlcyB3aXRoIHRoZSB1bmljb2RlXG4vLyByZXBsYWNlbWVudCBjaGFyYWN0ZXIuIFNlZSBodHRwczovL2NvZGVyZXZpZXcuY2hyb21pdW0ub3JnLzEyMTE3MzAwOS8gLlxuU3RyaW5nRGVjb2Rlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgdmFyIGNoYXJTdHIgPSAnJztcbiAgLy8gaWYgb3VyIGxhc3Qgd3JpdGUgZW5kZWQgd2l0aCBhbiBpbmNvbXBsZXRlIG11bHRpYnl0ZSBjaGFyYWN0ZXJcbiAgd2hpbGUgKHRoaXMuY2hhckxlbmd0aCkge1xuICAgIC8vIGRldGVybWluZSBob3cgbWFueSByZW1haW5pbmcgYnl0ZXMgdGhpcyBidWZmZXIgaGFzIHRvIG9mZmVyIGZvciB0aGlzIGNoYXJcbiAgICB2YXIgYXZhaWxhYmxlID0gKGJ1ZmZlci5sZW5ndGggPj0gdGhpcy5jaGFyTGVuZ3RoIC0gdGhpcy5jaGFyUmVjZWl2ZWQpID9cbiAgICAgICAgdGhpcy5jaGFyTGVuZ3RoIC0gdGhpcy5jaGFyUmVjZWl2ZWQgOlxuICAgICAgICBidWZmZXIubGVuZ3RoO1xuXG4gICAgLy8gYWRkIHRoZSBuZXcgYnl0ZXMgdG8gdGhlIGNoYXIgYnVmZmVyXG4gICAgYnVmZmVyLmNvcHkodGhpcy5jaGFyQnVmZmVyLCB0aGlzLmNoYXJSZWNlaXZlZCwgMCwgYXZhaWxhYmxlKTtcbiAgICB0aGlzLmNoYXJSZWNlaXZlZCArPSBhdmFpbGFibGU7XG5cbiAgICBpZiAodGhpcy5jaGFyUmVjZWl2ZWQgPCB0aGlzLmNoYXJMZW5ndGgpIHtcbiAgICAgIC8vIHN0aWxsIG5vdCBlbm91Z2ggY2hhcnMgaW4gdGhpcyBidWZmZXI/IHdhaXQgZm9yIG1vcmUgLi4uXG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuXG4gICAgLy8gcmVtb3ZlIGJ5dGVzIGJlbG9uZ2luZyB0byB0aGUgY3VycmVudCBjaGFyYWN0ZXIgZnJvbSB0aGUgYnVmZmVyXG4gICAgYnVmZmVyID0gYnVmZmVyLnNsaWNlKGF2YWlsYWJsZSwgYnVmZmVyLmxlbmd0aCk7XG5cbiAgICAvLyBnZXQgdGhlIGNoYXJhY3RlciB0aGF0IHdhcyBzcGxpdFxuICAgIGNoYXJTdHIgPSB0aGlzLmNoYXJCdWZmZXIuc2xpY2UoMCwgdGhpcy5jaGFyTGVuZ3RoKS50b1N0cmluZyh0aGlzLmVuY29kaW5nKTtcblxuICAgIC8vIENFU1UtODogbGVhZCBzdXJyb2dhdGUgKEQ4MDAtREJGRikgaXMgYWxzbyB0aGUgaW5jb21wbGV0ZSBjaGFyYWN0ZXJcbiAgICB2YXIgY2hhckNvZGUgPSBjaGFyU3RyLmNoYXJDb2RlQXQoY2hhclN0ci5sZW5ndGggLSAxKTtcbiAgICBpZiAoY2hhckNvZGUgPj0gMHhEODAwICYmIGNoYXJDb2RlIDw9IDB4REJGRikge1xuICAgICAgdGhpcy5jaGFyTGVuZ3RoICs9IHRoaXMuc3Vycm9nYXRlU2l6ZTtcbiAgICAgIGNoYXJTdHIgPSAnJztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICB0aGlzLmNoYXJSZWNlaXZlZCA9IHRoaXMuY2hhckxlbmd0aCA9IDA7XG5cbiAgICAvLyBpZiB0aGVyZSBhcmUgbm8gbW9yZSBieXRlcyBpbiB0aGlzIGJ1ZmZlciwganVzdCBlbWl0IG91ciBjaGFyXG4gICAgaWYgKGJ1ZmZlci5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBjaGFyU3RyO1xuICAgIH1cbiAgICBicmVhaztcbiAgfVxuXG4gIC8vIGRldGVybWluZSBhbmQgc2V0IGNoYXJMZW5ndGggLyBjaGFyUmVjZWl2ZWRcbiAgdGhpcy5kZXRlY3RJbmNvbXBsZXRlQ2hhcihidWZmZXIpO1xuXG4gIHZhciBlbmQgPSBidWZmZXIubGVuZ3RoO1xuICBpZiAodGhpcy5jaGFyTGVuZ3RoKSB7XG4gICAgLy8gYnVmZmVyIHRoZSBpbmNvbXBsZXRlIGNoYXJhY3RlciBieXRlcyB3ZSBnb3RcbiAgICBidWZmZXIuY29weSh0aGlzLmNoYXJCdWZmZXIsIDAsIGJ1ZmZlci5sZW5ndGggLSB0aGlzLmNoYXJSZWNlaXZlZCwgZW5kKTtcbiAgICBlbmQgLT0gdGhpcy5jaGFyUmVjZWl2ZWQ7XG4gIH1cblxuICBjaGFyU3RyICs9IGJ1ZmZlci50b1N0cmluZyh0aGlzLmVuY29kaW5nLCAwLCBlbmQpO1xuXG4gIHZhciBlbmQgPSBjaGFyU3RyLmxlbmd0aCAtIDE7XG4gIHZhciBjaGFyQ29kZSA9IGNoYXJTdHIuY2hhckNvZGVBdChlbmQpO1xuICAvLyBDRVNVLTg6IGxlYWQgc3Vycm9nYXRlIChEODAwLURCRkYpIGlzIGFsc28gdGhlIGluY29tcGxldGUgY2hhcmFjdGVyXG4gIGlmIChjaGFyQ29kZSA+PSAweEQ4MDAgJiYgY2hhckNvZGUgPD0gMHhEQkZGKSB7XG4gICAgdmFyIHNpemUgPSB0aGlzLnN1cnJvZ2F0ZVNpemU7XG4gICAgdGhpcy5jaGFyTGVuZ3RoICs9IHNpemU7XG4gICAgdGhpcy5jaGFyUmVjZWl2ZWQgKz0gc2l6ZTtcbiAgICB0aGlzLmNoYXJCdWZmZXIuY29weSh0aGlzLmNoYXJCdWZmZXIsIHNpemUsIDAsIHNpemUpO1xuICAgIGJ1ZmZlci5jb3B5KHRoaXMuY2hhckJ1ZmZlciwgMCwgMCwgc2l6ZSk7XG4gICAgcmV0dXJuIGNoYXJTdHIuc3Vic3RyaW5nKDAsIGVuZCk7XG4gIH1cblxuICAvLyBvciBqdXN0IGVtaXQgdGhlIGNoYXJTdHJcbiAgcmV0dXJuIGNoYXJTdHI7XG59O1xuXG4vLyBkZXRlY3RJbmNvbXBsZXRlQ2hhciBkZXRlcm1pbmVzIGlmIHRoZXJlIGlzIGFuIGluY29tcGxldGUgVVRGLTggY2hhcmFjdGVyIGF0XG4vLyB0aGUgZW5kIG9mIHRoZSBnaXZlbiBidWZmZXIuIElmIHNvLCBpdCBzZXRzIHRoaXMuY2hhckxlbmd0aCB0byB0aGUgYnl0ZVxuLy8gbGVuZ3RoIHRoYXQgY2hhcmFjdGVyLCBhbmQgc2V0cyB0aGlzLmNoYXJSZWNlaXZlZCB0byB0aGUgbnVtYmVyIG9mIGJ5dGVzXG4vLyB0aGF0IGFyZSBhdmFpbGFibGUgZm9yIHRoaXMgY2hhcmFjdGVyLlxuU3RyaW5nRGVjb2Rlci5wcm90b3R5cGUuZGV0ZWN0SW5jb21wbGV0ZUNoYXIgPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgLy8gZGV0ZXJtaW5lIGhvdyBtYW55IGJ5dGVzIHdlIGhhdmUgdG8gY2hlY2sgYXQgdGhlIGVuZCBvZiB0aGlzIGJ1ZmZlclxuICB2YXIgaSA9IChidWZmZXIubGVuZ3RoID49IDMpID8gMyA6IGJ1ZmZlci5sZW5ndGg7XG5cbiAgLy8gRmlndXJlIG91dCBpZiBvbmUgb2YgdGhlIGxhc3QgaSBieXRlcyBvZiBvdXIgYnVmZmVyIGFubm91bmNlcyBhblxuICAvLyBpbmNvbXBsZXRlIGNoYXIuXG4gIGZvciAoOyBpID4gMDsgaS0tKSB7XG4gICAgdmFyIGMgPSBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIGldO1xuXG4gICAgLy8gU2VlIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvVVRGLTgjRGVzY3JpcHRpb25cblxuICAgIC8vIDExMFhYWFhYXG4gICAgaWYgKGkgPT0gMSAmJiBjID4+IDUgPT0gMHgwNikge1xuICAgICAgdGhpcy5jaGFyTGVuZ3RoID0gMjtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIDExMTBYWFhYXG4gICAgaWYgKGkgPD0gMiAmJiBjID4+IDQgPT0gMHgwRSkge1xuICAgICAgdGhpcy5jaGFyTGVuZ3RoID0gMztcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIDExMTEwWFhYXG4gICAgaWYgKGkgPD0gMyAmJiBjID4+IDMgPT0gMHgxRSkge1xuICAgICAgdGhpcy5jaGFyTGVuZ3RoID0gNDtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICB0aGlzLmNoYXJSZWNlaXZlZCA9IGk7XG59O1xuXG5TdHJpbmdEZWNvZGVyLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgdmFyIHJlcyA9ICcnO1xuICBpZiAoYnVmZmVyICYmIGJ1ZmZlci5sZW5ndGgpXG4gICAgcmVzID0gdGhpcy53cml0ZShidWZmZXIpO1xuXG4gIGlmICh0aGlzLmNoYXJSZWNlaXZlZCkge1xuICAgIHZhciBjciA9IHRoaXMuY2hhclJlY2VpdmVkO1xuICAgIHZhciBidWYgPSB0aGlzLmNoYXJCdWZmZXI7XG4gICAgdmFyIGVuYyA9IHRoaXMuZW5jb2Rpbmc7XG4gICAgcmVzICs9IGJ1Zi5zbGljZSgwLCBjcikudG9TdHJpbmcoZW5jKTtcbiAgfVxuXG4gIHJldHVybiByZXM7XG59O1xuXG5mdW5jdGlvbiBwYXNzVGhyb3VnaFdyaXRlKGJ1ZmZlcikge1xuICByZXR1cm4gYnVmZmVyLnRvU3RyaW5nKHRoaXMuZW5jb2RpbmcpO1xufVxuXG5mdW5jdGlvbiB1dGYxNkRldGVjdEluY29tcGxldGVDaGFyKGJ1ZmZlcikge1xuICB0aGlzLmNoYXJSZWNlaXZlZCA9IGJ1ZmZlci5sZW5ndGggJSAyO1xuICB0aGlzLmNoYXJMZW5ndGggPSB0aGlzLmNoYXJSZWNlaXZlZCA/IDIgOiAwO1xufVxuXG5mdW5jdGlvbiBiYXNlNjREZXRlY3RJbmNvbXBsZXRlQ2hhcihidWZmZXIpIHtcbiAgdGhpcy5jaGFyUmVjZWl2ZWQgPSBidWZmZXIubGVuZ3RoICUgMztcbiAgdGhpcy5jaGFyTGVuZ3RoID0gdGhpcy5jaGFyUmVjZWl2ZWQgPyAzIDogMDtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gVHJhdmVyc2U7XG5mdW5jdGlvbiBUcmF2ZXJzZSAob2JqKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFRyYXZlcnNlKSkgcmV0dXJuIG5ldyBUcmF2ZXJzZShvYmopO1xuICAgIHRoaXMudmFsdWUgPSBvYmo7XG59XG5cblRyYXZlcnNlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAocHMpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMudmFsdWU7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcy5sZW5ndGg7IGkgKyspIHtcbiAgICAgICAgdmFyIGtleSA9IHBzW2ldO1xuICAgICAgICBpZiAoIU9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKG5vZGUsIGtleSkpIHtcbiAgICAgICAgICAgIG5vZGUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBub2RlID0gbm9kZVtrZXldO1xuICAgIH1cbiAgICByZXR1cm4gbm9kZTtcbn07XG5cblRyYXZlcnNlLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAocHMsIHZhbHVlKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLnZhbHVlO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHMubGVuZ3RoIC0gMTsgaSArKykge1xuICAgICAgICB2YXIga2V5ID0gcHNbaV07XG4gICAgICAgIGlmICghT2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwobm9kZSwga2V5KSkgbm9kZVtrZXldID0ge307XG4gICAgICAgIG5vZGUgPSBub2RlW2tleV07XG4gICAgfVxuICAgIG5vZGVbcHNbaV1dID0gdmFsdWU7XG4gICAgcmV0dXJuIHZhbHVlO1xufTtcblxuVHJhdmVyc2UucHJvdG90eXBlLm1hcCA9IGZ1bmN0aW9uIChjYikge1xuICAgIHJldHVybiB3YWxrKHRoaXMudmFsdWUsIGNiLCB0cnVlKTtcbn07XG5cblRyYXZlcnNlLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgdGhpcy52YWx1ZSA9IHdhbGsodGhpcy52YWx1ZSwgY2IsIGZhbHNlKTtcbiAgICByZXR1cm4gdGhpcy52YWx1ZTtcbn07XG5cblRyYXZlcnNlLnByb3RvdHlwZS5yZWR1Y2UgPSBmdW5jdGlvbiAoY2IsIGluaXQpIHtcbiAgICB2YXIgc2tpcCA9IGFyZ3VtZW50cy5sZW5ndGggPT09IDE7XG4gICAgdmFyIGFjYyA9IHNraXAgPyB0aGlzLnZhbHVlIDogaW5pdDtcbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzUm9vdCB8fCAhc2tpcCkge1xuICAgICAgICAgICAgYWNjID0gY2IuY2FsbCh0aGlzLCBhY2MsIHgpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGFjYztcbn07XG5cblRyYXZlcnNlLnByb3RvdHlwZS5kZWVwRXF1YWwgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgJ2RlZXBFcXVhbCByZXF1aXJlcyBleGFjdGx5IG9uZSBvYmplY3QgdG8gY29tcGFyZSBhZ2FpbnN0J1xuICAgICAgICApO1xuICAgIH1cbiAgICBcbiAgICB2YXIgZXF1YWwgPSB0cnVlO1xuICAgIHZhciBub2RlID0gb2JqO1xuICAgIFxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAoeSkge1xuICAgICAgICB2YXIgbm90RXF1YWwgPSAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZXF1YWwgPSBmYWxzZTtcbiAgICAgICAgICAgIC8vdGhpcy5zdG9wKCk7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9KS5iaW5kKHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgLy9pZiAobm9kZSA9PT0gdW5kZWZpbmVkIHx8IG5vZGUgPT09IG51bGwpIHJldHVybiBub3RFcXVhbCgpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCF0aGlzLmlzUm9vdCkge1xuICAgICAgICAvKlxuICAgICAgICAgICAgaWYgKCFPYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChub2RlLCB0aGlzLmtleSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm90RXF1YWwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKi9cbiAgICAgICAgICAgIGlmICh0eXBlb2Ygbm9kZSAhPT0gJ29iamVjdCcpIHJldHVybiBub3RFcXVhbCgpO1xuICAgICAgICAgICAgbm9kZSA9IG5vZGVbdGhpcy5rZXldO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgeCA9IG5vZGU7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnBvc3QoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgbm9kZSA9IHg7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdmFyIHRvUyA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuY2lyY3VsYXIpIHtcbiAgICAgICAgICAgIGlmIChUcmF2ZXJzZShvYmopLmdldCh0aGlzLmNpcmN1bGFyLnBhdGgpICE9PSB4KSBub3RFcXVhbCgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiB4ICE9PSB0eXBlb2YgeSkge1xuICAgICAgICAgICAgbm90RXF1YWwoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh4ID09PSBudWxsIHx8IHkgPT09IG51bGwgfHwgeCA9PT0gdW5kZWZpbmVkIHx8IHkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaWYgKHggIT09IHkpIG5vdEVxdWFsKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoeC5fX3Byb3RvX18gIT09IHkuX19wcm90b19fKSB7XG4gICAgICAgICAgICBub3RFcXVhbCgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHggPT09IHkpIHtcbiAgICAgICAgICAgIC8vIG5vcFxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBpZiAoeCBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICAgICAgICAgIC8vIGJvdGggcmVnZXhwcyBvbiBhY2NvdW50IG9mIHRoZSBfX3Byb3RvX18gY2hlY2tcbiAgICAgICAgICAgICAgICBpZiAoeC50b1N0cmluZygpICE9IHkudG9TdHJpbmcoKSkgbm90RXF1YWwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHggIT09IHkpIG5vdEVxdWFsKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIHggPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBpZiAodG9TKHkpID09PSAnW29iamVjdCBBcmd1bWVudHNdJ1xuICAgICAgICAgICAgfHwgdG9TKHgpID09PSAnW29iamVjdCBBcmd1bWVudHNdJykge1xuICAgICAgICAgICAgICAgIGlmICh0b1MoeCkgIT09IHRvUyh5KSkge1xuICAgICAgICAgICAgICAgICAgICBub3RFcXVhbCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHggaW5zdGFuY2VvZiBEYXRlIHx8IHkgaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoeCBpbnN0YW5jZW9mIERhdGUpIHx8ICEoeSBpbnN0YW5jZW9mIERhdGUpXG4gICAgICAgICAgICAgICAgfHwgeC5nZXRUaW1lKCkgIT09IHkuZ2V0VGltZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vdEVxdWFsKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGt4ID0gT2JqZWN0LmtleXMoeCk7XG4gICAgICAgICAgICAgICAgdmFyIGt5ID0gT2JqZWN0LmtleXMoeSk7XG4gICAgICAgICAgICAgICAgaWYgKGt4Lmxlbmd0aCAhPT0ga3kubGVuZ3RoKSByZXR1cm4gbm90RXF1YWwoKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGt4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBrID0ga3hbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmICghT2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwoeSwgaykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdEVxdWFsKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBcbiAgICByZXR1cm4gZXF1YWw7XG59O1xuXG5UcmF2ZXJzZS5wcm90b3R5cGUucGF0aHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFjYyA9IFtdO1xuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICBhY2MucHVzaCh0aGlzLnBhdGgpOyBcbiAgICB9KTtcbiAgICByZXR1cm4gYWNjO1xufTtcblxuVHJhdmVyc2UucHJvdG90eXBlLm5vZGVzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhY2MgPSBbXTtcbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgYWNjLnB1c2godGhpcy5ub2RlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gYWNjO1xufTtcblxuVHJhdmVyc2UucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwYXJlbnRzID0gW10sIG5vZGVzID0gW107XG4gICAgXG4gICAgcmV0dXJuIChmdW5jdGlvbiBjbG9uZSAoc3JjKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFyZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHBhcmVudHNbaV0gPT09IHNyYykge1xuICAgICAgICAgICAgICAgIHJldHVybiBub2Rlc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGVvZiBzcmMgPT09ICdvYmplY3QnICYmIHNyYyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdmFyIGRzdCA9IGNvcHkoc3JjKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcGFyZW50cy5wdXNoKHNyYyk7XG4gICAgICAgICAgICBub2Rlcy5wdXNoKGRzdCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKHNyYykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgZHN0W2tleV0gPSBjbG9uZShzcmNba2V5XSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcGFyZW50cy5wb3AoKTtcbiAgICAgICAgICAgIG5vZGVzLnBvcCgpO1xuICAgICAgICAgICAgcmV0dXJuIGRzdDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBzcmM7XG4gICAgICAgIH1cbiAgICB9KSh0aGlzLnZhbHVlKTtcbn07XG5cbmZ1bmN0aW9uIHdhbGsgKHJvb3QsIGNiLCBpbW11dGFibGUpIHtcbiAgICB2YXIgcGF0aCA9IFtdO1xuICAgIHZhciBwYXJlbnRzID0gW107XG4gICAgdmFyIGFsaXZlID0gdHJ1ZTtcbiAgICBcbiAgICByZXR1cm4gKGZ1bmN0aW9uIHdhbGtlciAobm9kZV8pIHtcbiAgICAgICAgdmFyIG5vZGUgPSBpbW11dGFibGUgPyBjb3B5KG5vZGVfKSA6IG5vZGVfO1xuICAgICAgICB2YXIgbW9kaWZpZXJzID0ge307XG4gICAgICAgIFxuICAgICAgICB2YXIgc3RhdGUgPSB7XG4gICAgICAgICAgICBub2RlIDogbm9kZSxcbiAgICAgICAgICAgIG5vZGVfIDogbm9kZV8sXG4gICAgICAgICAgICBwYXRoIDogW10uY29uY2F0KHBhdGgpLFxuICAgICAgICAgICAgcGFyZW50IDogcGFyZW50cy5zbGljZSgtMSlbMF0sXG4gICAgICAgICAgICBrZXkgOiBwYXRoLnNsaWNlKC0xKVswXSxcbiAgICAgICAgICAgIGlzUm9vdCA6IHBhdGgubGVuZ3RoID09PSAwLFxuICAgICAgICAgICAgbGV2ZWwgOiBwYXRoLmxlbmd0aCxcbiAgICAgICAgICAgIGNpcmN1bGFyIDogbnVsbCxcbiAgICAgICAgICAgIHVwZGF0ZSA6IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgaWYgKCFzdGF0ZS5pc1Jvb3QpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUucGFyZW50Lm5vZGVbc3RhdGUua2V5XSA9IHg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0YXRlLm5vZGUgPSB4O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdkZWxldGUnIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBzdGF0ZS5wYXJlbnQubm9kZVtzdGF0ZS5rZXldO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlbW92ZSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShzdGF0ZS5wYXJlbnQubm9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUucGFyZW50Lm5vZGUuc3BsaWNlKHN0YXRlLmtleSwgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgc3RhdGUucGFyZW50Lm5vZGVbc3RhdGUua2V5XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYmVmb3JlIDogZnVuY3Rpb24gKGYpIHsgbW9kaWZpZXJzLmJlZm9yZSA9IGYgfSxcbiAgICAgICAgICAgIGFmdGVyIDogZnVuY3Rpb24gKGYpIHsgbW9kaWZpZXJzLmFmdGVyID0gZiB9LFxuICAgICAgICAgICAgcHJlIDogZnVuY3Rpb24gKGYpIHsgbW9kaWZpZXJzLnByZSA9IGYgfSxcbiAgICAgICAgICAgIHBvc3QgOiBmdW5jdGlvbiAoZikgeyBtb2RpZmllcnMucG9zdCA9IGYgfSxcbiAgICAgICAgICAgIHN0b3AgOiBmdW5jdGlvbiAoKSB7IGFsaXZlID0gZmFsc2UgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgaWYgKCFhbGl2ZSkgcmV0dXJuIHN0YXRlO1xuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGVvZiBub2RlID09PSAnb2JqZWN0JyAmJiBub2RlICE9PSBudWxsKSB7XG4gICAgICAgICAgICBzdGF0ZS5pc0xlYWYgPSBPYmplY3Qua2V5cyhub2RlKS5sZW5ndGggPT0gMDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhcmVudHNbaV0ubm9kZV8gPT09IG5vZGVfKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLmNpcmN1bGFyID0gcGFyZW50c1tpXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc3RhdGUuaXNMZWFmID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgc3RhdGUubm90TGVhZiA9ICFzdGF0ZS5pc0xlYWY7XG4gICAgICAgIHN0YXRlLm5vdFJvb3QgPSAhc3RhdGUuaXNSb290O1xuICAgICAgICBcbiAgICAgICAgLy8gdXNlIHJldHVybiB2YWx1ZXMgdG8gdXBkYXRlIGlmIGRlZmluZWRcbiAgICAgICAgdmFyIHJldCA9IGNiLmNhbGwoc3RhdGUsIHN0YXRlLm5vZGUpO1xuICAgICAgICBpZiAocmV0ICE9PSB1bmRlZmluZWQgJiYgc3RhdGUudXBkYXRlKSBzdGF0ZS51cGRhdGUocmV0KTtcbiAgICAgICAgaWYgKG1vZGlmaWVycy5iZWZvcmUpIG1vZGlmaWVycy5iZWZvcmUuY2FsbChzdGF0ZSwgc3RhdGUubm9kZSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodHlwZW9mIHN0YXRlLm5vZGUgPT0gJ29iamVjdCdcbiAgICAgICAgJiYgc3RhdGUubm9kZSAhPT0gbnVsbCAmJiAhc3RhdGUuY2lyY3VsYXIpIHtcbiAgICAgICAgICAgIHBhcmVudHMucHVzaChzdGF0ZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoc3RhdGUubm9kZSk7XG4gICAgICAgICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24gKGtleSwgaSkge1xuICAgICAgICAgICAgICAgIHBhdGgucHVzaChrZXkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChtb2RpZmllcnMucHJlKSBtb2RpZmllcnMucHJlLmNhbGwoc3RhdGUsIHN0YXRlLm5vZGVba2V5XSwga2V5KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB2YXIgY2hpbGQgPSB3YWxrZXIoc3RhdGUubm9kZVtrZXldKTtcbiAgICAgICAgICAgICAgICBpZiAoaW1tdXRhYmxlICYmIE9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKHN0YXRlLm5vZGUsIGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUubm9kZVtrZXldID0gY2hpbGQubm9kZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY2hpbGQuaXNMYXN0ID0gaSA9PSBrZXlzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgY2hpbGQuaXNGaXJzdCA9IGkgPT0gMDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAobW9kaWZpZXJzLnBvc3QpIG1vZGlmaWVycy5wb3N0LmNhbGwoc3RhdGUsIGNoaWxkKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBwYXRoLnBvcCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBwYXJlbnRzLnBvcCgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAobW9kaWZpZXJzLmFmdGVyKSBtb2RpZmllcnMuYWZ0ZXIuY2FsbChzdGF0ZSwgc3RhdGUubm9kZSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgfSkocm9vdCkubm9kZTtcbn1cblxuT2JqZWN0LmtleXMoVHJhdmVyc2UucHJvdG90eXBlKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICBUcmF2ZXJzZVtrZXldID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgdmFyIHQgPSBUcmF2ZXJzZShvYmopO1xuICAgICAgICByZXR1cm4gdFtrZXldLmFwcGx5KHQsIGFyZ3MpO1xuICAgIH07XG59KTtcblxuZnVuY3Rpb24gY29weSAoc3JjKSB7XG4gICAgaWYgKHR5cGVvZiBzcmMgPT09ICdvYmplY3QnICYmIHNyYyAhPT0gbnVsbCkge1xuICAgICAgICB2YXIgZHN0O1xuICAgICAgICBcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc3JjKSkge1xuICAgICAgICAgICAgZHN0ID0gW107XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc3JjIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICAgICAgZHN0ID0gbmV3IERhdGUoc3JjKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzcmMgaW5zdGFuY2VvZiBCb29sZWFuKSB7XG4gICAgICAgICAgICBkc3QgPSBuZXcgQm9vbGVhbihzcmMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHNyYyBpbnN0YW5jZW9mIE51bWJlcikge1xuICAgICAgICAgICAgZHN0ID0gbmV3IE51bWJlcihzcmMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHNyYyBpbnN0YW5jZW9mIFN0cmluZykge1xuICAgICAgICAgICAgZHN0ID0gbmV3IFN0cmluZyhzcmMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZHN0ID0gT2JqZWN0LmNyZWF0ZShPYmplY3QuZ2V0UHJvdG90eXBlT2Yoc3JjKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIE9iamVjdC5rZXlzKHNyYykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICBkc3Rba2V5XSA9IHNyY1trZXldO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGRzdDtcbiAgICB9XG4gICAgZWxzZSByZXR1cm4gc3JjO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVudHJ5O1xuXG52YXIgUGFzc1Rocm91Z2ggPSByZXF1aXJlKCdyZWFkYWJsZS1zdHJlYW0vcGFzc3Rocm91Z2gnKTtcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ3V0aWwnKS5pbmhlcml0cztcblxuaW5oZXJpdHMoRW50cnksIFBhc3NUaHJvdWdoKTtcblxuZnVuY3Rpb24gRW50cnkgKCkge1xuICBQYXNzVGhyb3VnaC5jYWxsKHRoaXMpO1xuICB0aGlzLnByb3BzID0ge307XG59XG5cbkVudHJ5LnByb3RvdHlwZS5hdXRvZHJhaW4gPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMub24oJ3JlYWRhYmxlJywgdGhpcy5yZWFkLmJpbmQodGhpcykpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBFeHRyYWN0O1xuXG52YXIgUGFyc2UgPSByZXF1aXJlKFwiLi4vdW56aXBcIikuUGFyc2U7XG52YXIgV3JpdGVyID0gcmVxdWlyZShcImZzdHJlYW1cIikuV3JpdGVyO1xudmFyIFdyaXRhYmxlID0gcmVxdWlyZSgncmVhZGFibGUtc3RyZWFtL3dyaXRhYmxlJyk7XG52YXIgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ3V0aWwnKS5pbmhlcml0cztcblxuaW5oZXJpdHMoRXh0cmFjdCwgV3JpdGFibGUpO1xuXG5mdW5jdGlvbiBFeHRyYWN0IChvcHRzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEV4dHJhY3QpKSB7XG4gICAgcmV0dXJuIG5ldyBFeHRyYWN0KG9wdHMpO1xuICB9XG5cbiAgV3JpdGFibGUuYXBwbHkodGhpcyk7XG4gIHRoaXMuX29wdHMgPSBvcHRzIHx8IHsgdmVyYm9zZTogZmFsc2UgfTtcblxuICB0aGlzLl9wYXJzZXIgPSBQYXJzZSh0aGlzLl9vcHRzKTtcbiAgdGhpcy5fcGFyc2VyLm9uKCdlcnJvcicsIGZ1bmN0aW9uKGVycikge1xuICAgIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuICB9KTtcbiAgdGhpcy5vbignZmluaXNoJywgZnVuY3Rpb24oKSB7XG4gICAgc2VsZi5fcGFyc2VyLmVuZCgpO1xuICB9KTtcblxuICB2YXIgd3JpdGVyID0gV3JpdGVyKHtcbiAgICB0eXBlOiAnRGlyZWN0b3J5JyxcbiAgICBwYXRoOiBvcHRzLnBhdGhcbiAgfSk7XG4gIHdyaXRlci5vbignZXJyb3InLCBmdW5jdGlvbihlcnIpIHtcbiAgICBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgfSk7XG4gIHdyaXRlci5vbignY2xvc2UnLCBmdW5jdGlvbigpIHtcbiAgICBzZWxmLmVtaXQoJ2Nsb3NlJylcbiAgfSk7XG5cbiAgdGhpcy5vbigncGlwZScsIGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgIGlmIChvcHRzLnZlcmJvc2UgJiYgc291cmNlLnBhdGgpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdBcmNoaXZlOiAnLCBzb3VyY2UucGF0aCk7XG4gICAgfVxuICB9KTtcblxuICB0aGlzLl9wYXJzZXIucGlwZSh3cml0ZXIpO1xufVxuXG5FeHRyYWN0LnByb3RvdHlwZS5fd3JpdGUgPSBmdW5jdGlvbiAoY2h1bmssIGVuY29kaW5nLCBjYWxsYmFjaykge1xuICBpZiAodGhpcy5fcGFyc2VyLndyaXRlKGNodW5rKSkge1xuICAgIHJldHVybiBjYWxsYmFjaygpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuX3BhcnNlci5vbmNlKCdkcmFpbicsIGNhbGxiYWNrKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gUGFyc2UuY3JlYXRlID0gUGFyc2U7XG5cbnJlcXVpcmUoXCJzZXRpbW1lZGlhdGVcIik7XG52YXIgVHJhbnNmb3JtID0gcmVxdWlyZSgncmVhZGFibGUtc3RyZWFtL3RyYW5zZm9ybScpO1xudmFyIGluaGVyaXRzID0gcmVxdWlyZSgndXRpbCcpLmluaGVyaXRzO1xudmFyIHpsaWIgPSByZXF1aXJlKCd6bGliJyk7XG52YXIgYmluYXJ5ID0gcmVxdWlyZSgnYmluYXJ5Jyk7XG52YXIgUHVsbFN0cmVhbSA9IHJlcXVpcmUoJ3B1bGxzdHJlYW0nKTtcbnZhciBNYXRjaFN0cmVhbSA9IHJlcXVpcmUoJ21hdGNoLXN0cmVhbScpO1xudmFyIEVudHJ5ID0gcmVxdWlyZSgnLi9lbnRyeScpO1xuXG5pbmhlcml0cyhQYXJzZSwgVHJhbnNmb3JtKTtcblxuZnVuY3Rpb24gUGFyc2Uob3B0cykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBQYXJzZSkpIHtcbiAgICByZXR1cm4gbmV3IFBhcnNlKG9wdHMpO1xuICB9XG5cbiAgVHJhbnNmb3JtLmNhbGwodGhpcywgeyBsb3dXYXRlck1hcms6IDAgfSk7XG4gIHRoaXMuX29wdHMgPSBvcHRzIHx8IHsgdmVyYm9zZTogZmFsc2UgfTtcbiAgdGhpcy5faGFzRW50cnlMaXN0ZW5lciA9IGZhbHNlO1xuXG4gIHRoaXMuX3B1bGxTdHJlYW0gPSBuZXcgUHVsbFN0cmVhbSgpO1xuICB0aGlzLl9wdWxsU3RyZWFtLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24gKGUpIHtcbiAgICBzZWxmLmVtaXQoJ2Vycm9yJywgZSk7XG4gIH0pO1xuICB0aGlzLl9wdWxsU3RyZWFtLm9uY2UoXCJlbmRcIiwgZnVuY3Rpb24gKCkge1xuICAgIHNlbGYuX3N0cmVhbUVuZCA9IHRydWU7XG4gIH0pO1xuICB0aGlzLl9wdWxsU3RyZWFtLm9uY2UoXCJmaW5pc2hcIiwgZnVuY3Rpb24gKCkge1xuICAgIHNlbGYuX3N0cmVhbUZpbmlzaCA9IHRydWU7XG4gIH0pO1xuXG4gIHRoaXMuX3JlYWRSZWNvcmQoKTtcbn1cblxuUGFyc2UucHJvdG90eXBlLl9yZWFkUmVjb3JkID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuX3B1bGxTdHJlYW0ucHVsbCg0LCBmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG4gICAgaWYgKGVycikge1xuICAgICAgcmV0dXJuIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgIH1cblxuICAgIGlmIChkYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBzaWduYXR1cmUgPSBkYXRhLnJlYWRVSW50MzJMRSgwKTtcbiAgICBpZiAoc2lnbmF0dXJlID09PSAweDA0MDM0YjUwKSB7XG4gICAgICBzZWxmLl9yZWFkRmlsZSgpO1xuICAgIH0gZWxzZSBpZiAoc2lnbmF0dXJlID09PSAweDAyMDE0YjUwKSB7XG4gICAgICBzZWxmLl9yZWFkQ2VudHJhbERpcmVjdG9yeUZpbGVIZWFkZXIoKTtcbiAgICB9IGVsc2UgaWYgKHNpZ25hdHVyZSA9PT0gMHgwNjA1NGI1MCkge1xuICAgICAgc2VsZi5fcmVhZEVuZE9mQ2VudHJhbERpcmVjdG9yeVJlY29yZCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlcnIgPSBuZXcgRXJyb3IoJ2ludmFsaWQgc2lnbmF0dXJlOiAweCcgKyBzaWduYXR1cmUudG9TdHJpbmcoMTYpKTtcbiAgICAgIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgIH1cbiAgfSk7XG59O1xuXG5QYXJzZS5wcm90b3R5cGUuX3JlYWRGaWxlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuX3B1bGxTdHJlYW0ucHVsbCgyNiwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIHJldHVybiBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICB9XG5cbiAgICB2YXIgdmFycyA9IGJpbmFyeS5wYXJzZShkYXRhKVxuICAgICAgLndvcmQxNmx1KCd2ZXJzaW9uc05lZWRlZFRvRXh0cmFjdCcpXG4gICAgICAud29yZDE2bHUoJ2ZsYWdzJylcbiAgICAgIC53b3JkMTZsdSgnY29tcHJlc3Npb25NZXRob2QnKVxuICAgICAgLndvcmQxNmx1KCdsYXN0TW9kaWZpZWRUaW1lJylcbiAgICAgIC53b3JkMTZsdSgnbGFzdE1vZGlmaWVkRGF0ZScpXG4gICAgICAud29yZDMybHUoJ2NyYzMyJylcbiAgICAgIC53b3JkMzJsdSgnY29tcHJlc3NlZFNpemUnKVxuICAgICAgLndvcmQzMmx1KCd1bmNvbXByZXNzZWRTaXplJylcbiAgICAgIC53b3JkMTZsdSgnZmlsZU5hbWVMZW5ndGgnKVxuICAgICAgLndvcmQxNmx1KCdleHRyYUZpZWxkTGVuZ3RoJylcbiAgICAgIC52YXJzO1xuXG4gICAgcmV0dXJuIHNlbGYuX3B1bGxTdHJlYW0ucHVsbCh2YXJzLmZpbGVOYW1lTGVuZ3RoLCBmdW5jdGlvbiAoZXJyLCBmaWxlTmFtZSkge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICB9XG4gICAgICBmaWxlTmFtZSA9IGZpbGVOYW1lLnRvU3RyaW5nKCd1dGY4Jyk7XG4gICAgICB2YXIgZW50cnkgPSBuZXcgRW50cnkoKTtcbiAgICAgIGVudHJ5LnBhdGggPSBmaWxlTmFtZTtcbiAgICAgIGVudHJ5LnByb3BzLnBhdGggPSBmaWxlTmFtZTtcbiAgICAgIGVudHJ5LnR5cGUgPSAodmFycy5jb21wcmVzc2VkU2l6ZSA9PT0gMCAmJiAvW1xcL1xcXFxdJC8udGVzdChmaWxlTmFtZSkpID8gJ0RpcmVjdG9yeScgOiAnRmlsZSc7XG5cbiAgICAgIGlmIChzZWxmLl9vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgaWYgKGVudHJ5LnR5cGUgPT09ICdEaXJlY3RvcnknKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJyAgIGNyZWF0aW5nOicsIGZpbGVOYW1lKTtcbiAgICAgICAgfSBlbHNlIGlmIChlbnRyeS50eXBlID09PSAnRmlsZScpIHtcbiAgICAgICAgICBpZiAodmFycy5jb21wcmVzc2lvbk1ldGhvZCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJyBleHRyYWN0aW5nOicsIGZpbGVOYW1lKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJyAgaW5mbGF0aW5nOicsIGZpbGVOYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFyIGhhc0VudHJ5TGlzdGVuZXIgPSBzZWxmLl9oYXNFbnRyeUxpc3RlbmVyO1xuICAgICAgaWYgKGhhc0VudHJ5TGlzdGVuZXIpIHtcbiAgICAgICAgc2VsZi5lbWl0KCdlbnRyeScsIGVudHJ5KTtcbiAgICAgIH1cblxuICAgICAgc2VsZi5fcHVsbFN0cmVhbS5wdWxsKHZhcnMuZXh0cmFGaWVsZExlbmd0aCwgZnVuY3Rpb24gKGVyciwgZXh0cmFGaWVsZCkge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmV0dXJuIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YXJzLmNvbXByZXNzaW9uTWV0aG9kID09PSAwKSB7XG4gICAgICAgICAgc2VsZi5fcHVsbFN0cmVhbS5wdWxsKHZhcnMuY29tcHJlc3NlZFNpemUsIGZ1bmN0aW9uIChlcnIsIGNvbXByZXNzZWREYXRhKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgIHJldHVybiBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGhhc0VudHJ5TGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgZW50cnkud3JpdGUoY29tcHJlc3NlZERhdGEpO1xuICAgICAgICAgICAgICBlbnRyeS5lbmQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHNlbGYuX3JlYWRSZWNvcmQoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgZmlsZVNpemVLbm93biA9ICEodmFycy5mbGFncyAmIDB4MDgpO1xuXG4gICAgICAgICAgdmFyIGluZmxhdGVyID0gemxpYi5jcmVhdGVJbmZsYXRlUmF3KCk7XG4gICAgICAgICAgaW5mbGF0ZXIub24oJ2Vycm9yJywgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBpZiAoZmlsZVNpemVLbm93bikge1xuICAgICAgICAgICAgZW50cnkuc2l6ZSA9IHZhcnMudW5jb21wcmVzc2VkU2l6ZTtcbiAgICAgICAgICAgIGlmIChoYXNFbnRyeUxpc3RlbmVyKSB7XG4gICAgICAgICAgICAgIGVudHJ5Lm9uKCdmaW5pc2gnLCBzZWxmLl9yZWFkUmVjb3JkLmJpbmQoc2VsZikpO1xuICAgICAgICAgICAgICBzZWxmLl9wdWxsU3RyZWFtLnBpcGUodmFycy5jb21wcmVzc2VkU2l6ZSwgaW5mbGF0ZXIpLnBpcGUoZW50cnkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgc2VsZi5fcHVsbFN0cmVhbS5kcmFpbih2YXJzLmNvbXByZXNzZWRTaXplLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzZWxmLl9yZWFkUmVjb3JkKCk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgZGVzY3JpcHRvclNpZyA9IG5ldyBCdWZmZXIoNCk7XG4gICAgICAgICAgICBkZXNjcmlwdG9yU2lnLndyaXRlVUludDMyTEUoMHgwODA3NGI1MCwgMCk7XG5cbiAgICAgICAgICAgIHZhciBtYXRjaFN0cmVhbSA9IG5ldyBNYXRjaFN0cmVhbSh7IHBhdHRlcm46IGRlc2NyaXB0b3JTaWcgfSwgZnVuY3Rpb24gKGJ1ZiwgbWF0Y2hlZCwgZXh0cmEpIHtcbiAgICAgICAgICAgICAgaWYgKGhhc0VudHJ5TGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1hdGNoZWQpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnB1c2goYnVmKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoKGJ1Zik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHNlbGYuX3B1bGxTdHJlYW0udW5waXBlKCk7XG4gICAgICAgICAgICAgICAgc2VsZi5fcHVsbFN0cmVhbS5wcmVwZW5kKGV4dHJhKTtcbiAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzRGF0YURlc2NyaXB0b3IoZW50cnkpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHVzaChudWxsKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBzZWxmLl9wdWxsU3RyZWFtLnBpcGUobWF0Y2hTdHJlYW0pO1xuICAgICAgICAgICAgaWYgKGhhc0VudHJ5TGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgbWF0Y2hTdHJlYW0ucGlwZShpbmZsYXRlcikucGlwZShlbnRyeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5QYXJzZS5wcm90b3R5cGUuX3Byb2Nlc3NEYXRhRGVzY3JpcHRvciA9IGZ1bmN0aW9uIChlbnRyeSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuX3B1bGxTdHJlYW0ucHVsbCgxNiwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIHJldHVybiBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICB9XG5cbiAgICB2YXIgdmFycyA9IGJpbmFyeS5wYXJzZShkYXRhKVxuICAgICAgLndvcmQzMmx1KCdkYXRhRGVzY3JpcHRvclNpZ25hdHVyZScpXG4gICAgICAud29yZDMybHUoJ2NyYzMyJylcbiAgICAgIC53b3JkMzJsdSgnY29tcHJlc3NlZFNpemUnKVxuICAgICAgLndvcmQzMmx1KCd1bmNvbXByZXNzZWRTaXplJylcbiAgICAgIC52YXJzO1xuXG4gICAgZW50cnkuc2l6ZSA9IHZhcnMudW5jb21wcmVzc2VkU2l6ZTtcbiAgICBzZWxmLl9yZWFkUmVjb3JkKCk7XG4gIH0pO1xufTtcblxuUGFyc2UucHJvdG90eXBlLl9yZWFkQ2VudHJhbERpcmVjdG9yeUZpbGVIZWFkZXIgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5fcHVsbFN0cmVhbS5wdWxsKDQyLCBmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG4gICAgaWYgKGVycikge1xuICAgICAgcmV0dXJuIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgIH1cblxuICAgIHZhciB2YXJzID0gYmluYXJ5LnBhcnNlKGRhdGEpXG4gICAgICAud29yZDE2bHUoJ3ZlcnNpb25NYWRlQnknKVxuICAgICAgLndvcmQxNmx1KCd2ZXJzaW9uc05lZWRlZFRvRXh0cmFjdCcpXG4gICAgICAud29yZDE2bHUoJ2ZsYWdzJylcbiAgICAgIC53b3JkMTZsdSgnY29tcHJlc3Npb25NZXRob2QnKVxuICAgICAgLndvcmQxNmx1KCdsYXN0TW9kaWZpZWRUaW1lJylcbiAgICAgIC53b3JkMTZsdSgnbGFzdE1vZGlmaWVkRGF0ZScpXG4gICAgICAud29yZDMybHUoJ2NyYzMyJylcbiAgICAgIC53b3JkMzJsdSgnY29tcHJlc3NlZFNpemUnKVxuICAgICAgLndvcmQzMmx1KCd1bmNvbXByZXNzZWRTaXplJylcbiAgICAgIC53b3JkMTZsdSgnZmlsZU5hbWVMZW5ndGgnKVxuICAgICAgLndvcmQxNmx1KCdleHRyYUZpZWxkTGVuZ3RoJylcbiAgICAgIC53b3JkMTZsdSgnZmlsZUNvbW1lbnRMZW5ndGgnKVxuICAgICAgLndvcmQxNmx1KCdkaXNrTnVtYmVyJylcbiAgICAgIC53b3JkMTZsdSgnaW50ZXJuYWxGaWxlQXR0cmlidXRlcycpXG4gICAgICAud29yZDMybHUoJ2V4dGVybmFsRmlsZUF0dHJpYnV0ZXMnKVxuICAgICAgLndvcmQzMmx1KCdvZmZzZXRUb0xvY2FsRmlsZUhlYWRlcicpXG4gICAgICAudmFycztcblxuICAgIHJldHVybiBzZWxmLl9wdWxsU3RyZWFtLnB1bGwodmFycy5maWxlTmFtZUxlbmd0aCwgZnVuY3Rpb24gKGVyciwgZmlsZU5hbWUpIHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgfVxuICAgICAgZmlsZU5hbWUgPSBmaWxlTmFtZS50b1N0cmluZygndXRmOCcpO1xuXG4gICAgICBzZWxmLl9wdWxsU3RyZWFtLnB1bGwodmFycy5leHRyYUZpZWxkTGVuZ3RoLCBmdW5jdGlvbiAoZXJyLCBleHRyYUZpZWxkKSB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZXR1cm4gc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICAgIH1cbiAgICAgICAgc2VsZi5fcHVsbFN0cmVhbS5wdWxsKHZhcnMuZmlsZUNvbW1lbnRMZW5ndGgsIGZ1bmN0aW9uIChlcnIsIGZpbGVDb21tZW50KSB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGYuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gc2VsZi5fcmVhZFJlY29yZCgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcbn07XG5cblBhcnNlLnByb3RvdHlwZS5fcmVhZEVuZE9mQ2VudHJhbERpcmVjdG9yeVJlY29yZCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl9wdWxsU3RyZWFtLnB1bGwoMTgsIGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICByZXR1cm4gc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgfVxuXG4gICAgdmFyIHZhcnMgPSBiaW5hcnkucGFyc2UoZGF0YSlcbiAgICAgIC53b3JkMTZsdSgnZGlza051bWJlcicpXG4gICAgICAud29yZDE2bHUoJ2Rpc2tTdGFydCcpXG4gICAgICAud29yZDE2bHUoJ251bWJlck9mUmVjb3Jkc09uRGlzaycpXG4gICAgICAud29yZDE2bHUoJ251bWJlck9mUmVjb3JkcycpXG4gICAgICAud29yZDMybHUoJ3NpemVPZkNlbnRyYWxEaXJlY3RvcnknKVxuICAgICAgLndvcmQzMmx1KCdvZmZzZXRUb1N0YXJ0T2ZDZW50cmFsRGlyZWN0b3J5JylcbiAgICAgIC53b3JkMTZsdSgnY29tbWVudExlbmd0aCcpXG4gICAgICAudmFycztcblxuICAgIGlmICh2YXJzLmNvbW1lbnRMZW5ndGgpIHtcbiAgICAgIHNldEltbWVkaWF0ZShmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi5fcHVsbFN0cmVhbS5wdWxsKHZhcnMuY29tbWVudExlbmd0aCwgZnVuY3Rpb24gKGVyciwgY29tbWVudCkge1xuICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIHJldHVybiBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29tbWVudCA9IGNvbW1lbnQudG9TdHJpbmcoJ3V0ZjgnKTtcbiAgICAgICAgICByZXR1cm4gc2VsZi5fcHVsbFN0cmVhbS5lbmQoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBzZWxmLl9wdWxsU3RyZWFtLmVuZCgpO1xuICAgIH1cbiAgfSk7XG59O1xuXG5QYXJzZS5wcm90b3R5cGUuX3RyYW5zZm9ybSA9IGZ1bmN0aW9uIChjaHVuaywgZW5jb2RpbmcsIGNhbGxiYWNrKSB7XG4gIGlmICh0aGlzLl9wdWxsU3RyZWFtLndyaXRlKGNodW5rKSkge1xuICAgIHJldHVybiBjYWxsYmFjaygpO1xuICB9XG5cbiAgdGhpcy5fcHVsbFN0cmVhbS5vbmNlKCdkcmFpbicsIGNhbGxiYWNrKTtcbn07XG5cblBhcnNlLnByb3RvdHlwZS5waXBlID0gZnVuY3Rpb24gKGRlc3QsIG9wdHMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAodHlwZW9mIGRlc3QuYWRkID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBzZWxmLm9uKFwiZW50cnlcIiwgZnVuY3Rpb24gKGVudHJ5KSB7XG4gICAgICBkZXN0LmFkZChlbnRyeSk7XG4gICAgfSlcbiAgfVxuICByZXR1cm4gVHJhbnNmb3JtLnByb3RvdHlwZS5waXBlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG5QYXJzZS5wcm90b3R5cGUuX2ZsdXNoID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gIGlmICghdGhpcy5fc3RyZWFtRW5kIHx8ICF0aGlzLl9zdHJlYW1GaW5pc2gpIHtcbiAgICByZXR1cm4gc2V0SW1tZWRpYXRlKHRoaXMuX2ZsdXNoLmJpbmQodGhpcywgY2FsbGJhY2spKTtcbiAgfVxuXG4gIHRoaXMuZW1pdCgnY2xvc2UnKTtcbiAgcmV0dXJuIGNhbGxiYWNrKCk7XG59O1xuXG5QYXJzZS5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoJ2VudHJ5JyA9PT0gdHlwZSkge1xuICAgIHRoaXMuX2hhc0VudHJ5TGlzdGVuZXIgPSB0cnVlO1xuICB9XG4gIHJldHVybiBUcmFuc2Zvcm0ucHJvdG90eXBlLmFkZExpc3RlbmVyLmNhbGwodGhpcywgdHlwZSwgbGlzdGVuZXIpO1xufTtcblxuUGFyc2UucHJvdG90eXBlLm9uID0gUGFyc2UucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLlBhcnNlID0gcmVxdWlyZSgnLi9saWIvcGFyc2UnKTtcbmV4cG9ydHMuRXh0cmFjdCA9IHJlcXVpcmUoJy4vbGliL2V4dHJhY3QnKTsiLCIvLyBSZXR1cm5zIGEgd3JhcHBlciBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSB3cmFwcGVkIGNhbGxiYWNrXG4vLyBUaGUgd3JhcHBlciBmdW5jdGlvbiBzaG91bGQgZG8gc29tZSBzdHVmZiwgYW5kIHJldHVybiBhXG4vLyBwcmVzdW1hYmx5IGRpZmZlcmVudCBjYWxsYmFjayBmdW5jdGlvbi5cbi8vIFRoaXMgbWFrZXMgc3VyZSB0aGF0IG93biBwcm9wZXJ0aWVzIGFyZSByZXRhaW5lZCwgc28gdGhhdFxuLy8gZGVjb3JhdGlvbnMgYW5kIHN1Y2ggYXJlIG5vdCBsb3N0IGFsb25nIHRoZSB3YXkuXG5tb2R1bGUuZXhwb3J0cyA9IHdyYXBweVxuZnVuY3Rpb24gd3JhcHB5IChmbiwgY2IpIHtcbiAgaWYgKGZuICYmIGNiKSByZXR1cm4gd3JhcHB5KGZuKShjYilcblxuICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ25lZWQgd3JhcHBlciBmdW5jdGlvbicpXG5cbiAgT2JqZWN0LmtleXMoZm4pLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICB3cmFwcGVyW2tdID0gZm5ba11cbiAgfSlcblxuICByZXR1cm4gd3JhcHBlclxuXG4gIGZ1bmN0aW9uIHdyYXBwZXIoKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aClcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGFyZ3NbaV0gPSBhcmd1bWVudHNbaV1cbiAgICB9XG4gICAgdmFyIHJldCA9IGZuLmFwcGx5KHRoaXMsIGFyZ3MpXG4gICAgdmFyIGNiID0gYXJnc1thcmdzLmxlbmd0aC0xXVxuICAgIGlmICh0eXBlb2YgcmV0ID09PSAnZnVuY3Rpb24nICYmIHJldCAhPT0gY2IpIHtcbiAgICAgIE9iamVjdC5rZXlzKGNiKS5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgICAgIHJldFtrXSA9IGNiW2tdXG4gICAgICB9KVxuICAgIH1cbiAgICByZXR1cm4gcmV0XG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImFzc2VydFwiKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJidWZmZXJcIik7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiY29uc3RhbnRzXCIpOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImV2ZW50c1wiKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJmc1wiKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJtb2R1bGVcIik7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwicGF0aFwiKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJzdHJlYW1cIik7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwidXRpbFwiKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJ2OFwiKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJ2bVwiKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJ6bGliXCIpOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIndlYm9zLXNlcnZpY2VcIik7IiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIl9fd2VicGFja19yZXF1aXJlX18ubyA9IChvYmosIHByb3ApID0+IChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSkiLCIvLyBub3RlOiBUaGUgSlMgc2VydmljZSBtdXN0IGJlIHBhY2thZ2VkIGFsb25nIHdpdGggdGhlIGFwcC5cbi8vIEZpbGUgSS9PIFNlcnZpY2Vcbi8vIEEgd2ViT1Mgc2VydmljZSBzYW1wbGUgdXNpbmcgTm9kZS5qcyBmcywgY3J5cHRvIGFuZCB1bnppcCBsaWJyYXJ5IGZ1bmN0aW9uc1xuLypcbklmIHRoZSBKUyBzZXJ2aWNlIHVzZXMgbWV0aG9kcyBvZiBleHRlcm5hbCBzZXJ2aWNlcywgXG55b3UgbXVzdCBhZGQgdGhlIGdyb3VwIGluZm9ybWF0aW9uIG9mIHRoZSBleHRlcm5hbCBtZXRob2RzIHRvIHRoZSByZXF1aXJlZFBlcm1pc3Npb25zIGZpZWxkIGluIGFwcGluZm8uanNvblxuIG9mIHRoZSBhcHAgdXNlZCBmb3IgcGFja2FnaW5nIHRoZSBKUyBzZXJ2aWNlLiBTZWUgQ29uZmlndXJpbmcgdGhlIFdlYiBBcHAgZm9yIGRldGFpbHMuXG4qL1xuLy9wYWNrYWdlLmpzb24tPmV4dGVybmFscy0+aWdub3JlIGNvbXBpbGUgbGlrZSBAdHMtaWdub3JlXG4vL3JlcXVpcmUgbnBtIGluc3RhbGwgcGFyY2VsLXBsdWdpbi1leHRlcm5hbHNcbi8v5aaC5p6c5Ye6546wYXBw5peg5rOV5a6J6KOF55qE5oOF5Ya177yMIOS4u+imgeWOn+WboOWwseaYr2pzLXNlcnZpY2Xku6PnoIHml6Dms5XmiafooYzlvJXotbfvvIzlj6/ku6XpgJrov4dcbi8vam91cm5hbGN0bCAtUyBcIjEgaG91ciBhZ29cIlxuLy/lkb3ku6Tmn6XnnIvlr7zoh7Tku6PnoIHml6Dms5XmiafooYznmoTljp/lm6DvvIwg6L+c56iL5YiwL21lZGlhL2RldmVsb3Blci9hcHBzL3Vzci9wbGFtc+ebruW9leWumuS9jeexu+S8vOS4gOS4i+mUmeivr++8jOWFiOi/nOeoi+S/ruWkje+8jOWGjemHjeaWsOWuieijhVxuLypcbk9jdCAxNyAxODowNjoxMCByYXNwYmVycnlwaTQgbHMtaHViZFsxNTM0XTogUmVmZXJlbmNlRXJyb3I6IHdlYm9zIGlzIG5vdCBkZWZpbmVkXG5PY3QgMTcgMTg6MDY6MTAgcmFzcGJlcnJ5cGk0IGxzLWh1YmRbMTUzNF06ICAgICBhdCBPYmplY3QuMTU5ICgvbWVkaWEvZGV2ZWxvcGVyL2FwcHMvdXNyL3BhbG0vc2VydmljZXMvY29tLmlvbGl6LmRjLmFwcC5maWxlc2VydmljZS9pbmRleC5qczoyNDoxOClcbk9jdCAxNyAxODowNjoxMCByYXNwYmVycnlwaTQgbHMtaHViZFsxNTM0XTogICAgIGF0IF9fd2VicGFja19yZXF1aXJlX18gKC9tZWRpYS9kZXZlbG9wZXIvYXBwcy91c3IvcGFsbS9zZXJ2aWNlcy9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlL2luZGV4LmpzOjU2OjQxKVxuT2N0IDE3IDE4OjA2OjEwIHJhc3BiZXJyeXBpNCBscy1odWJkWzE1MzRdOiAgICAgYXQgL21lZGlhL2RldmVsb3Blci9hcHBzL3Vzci9wYWxtL3NlcnZpY2VzL2NvbS5pb2xpei5kYy5hcHAuZmlsZXNlcnZpY2UvaW5kZXguanM6NzY6MTdcbk9jdCAxNyAxODowNjoxMCByYXNwYmVycnlwaTQgbHMtaHViZFsxNTM0XTogICAgIGF0IC9tZWRpYS9kZXZlbG9wZXIvYXBwcy91c3IvcGFsbS9zZXJ2aWNlcy9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlL2luZGV4LmpzOjI2NjozXG5PY3QgMTcgMTg6MDY6MTAgcmFzcGJlcnJ5cGk0IGxzLWh1YmRbMTUzNF06ICAgICBhdCBPYmplY3QuPGFub255bW91cz4gKC9tZWRpYS9kZXZlbG9wZXIvYXBwcy91c3IvcGFsbS9zZXJ2aWNlcy9jb20uaW9saXouZGMuYXBwLmZpbGVzZXJ2aWNlL2luZGV4LmpzOjI2ODoxMilcbk9jdCAxNyAxODowNjoxMCByYXNwYmVycnlwaTQgbHMtaHViZFsxNTM0XTogICAgIGF0IE1vZHVsZS5fY29tcGlsZSAoaW50ZXJuYWwvbW9kdWxlcy9janMvbG9hZGVyLmpzOjk5OTozMClcbk9jdCAxNyAxODowNjoxMCByYXNwYmVycnlwaTQgbHMtaHViZFsxNTM0XTogICAgIGF0IE9iamVjdC5Nb2R1bGUuX2V4dGVuc2lvbnMuLmpzIChpbnRlcm5hbC9tb2R1bGVzL2Nqcy9sb2FkZXIuanM6MTAyNzoxMClcbk9jdCAxNyAxODowNjoxMCByYXNwYmVycnlwaTQgbHMtaHViZFsxNTM0XTogICAgIGF0IE1vZHVsZS5sb2FkIChpbnRlcm5hbC9tb2R1bGVzL2Nqcy9sb2FkZXIuanM6ODYzOjMyKVxuT2N0IDE3IDE4OjA2OjEwIHJhc3BiZXJyeXBpNCBscy1odWJkWzE1MzRdOiAgICAgYXQgRnVuY3Rpb24uTW9kdWxlLl9sb2FkIChpbnRlcm5hbC9tb2R1bGVzL2Nqcy9sb2FkZXIuanM6NzA4OjE0KVxuT2N0IDE3IDE4OjA2OjEwIHJhc3BiZXJyeXBpNCBscy1odWJkWzE1MzRdOiAgICAgYXQgTW9kdWxlLnJlcXVpcmUgKGludGVybmFsL21vZHVsZXMvY2pzL2xvYWRlci5qczo4ODc6MTkpXG4qL1xuY29uc3QgU2VydmljZSA9IHJlcXVpcmUoXCJ3ZWJvcy1zZXJ2aWNlXCIpO1xuY29uc3QgcGtnSW5mbyA9IHJlcXVpcmUoJy4vcGFja2FnZS5qc29uJyk7XG5jb25zdCBzZXJ2aWNlID0gbmV3IFNlcnZpY2UocGtnSW5mby5uYW1lKTtcbnNlcnZpY2UuYWN0aXZpdHlNYW5hZ2VyLmlkbGVUaW1lb3V0ID0gNVxuXG4vL2NvbnN0IGNyeXB0byA9IHJlcXVpcmUoXCJjcnlwdG9cIik7XG5jb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcblxuLy8gY29weUZpbGVcbnNlcnZpY2UucmVnaXN0ZXIoXCJjb3B5RmlsZVwiLCBmdW5jdGlvbihtZXNzYWdlKSB7XG4gIHZhciBvcmlnaW5hbFBhdGggPSAgbWVzc2FnZS5wYXlsb2FkLm9yaWdpbmFsUGF0aDtcbiAgdmFyIGNvcHlQYXRoID0gIG1lc3NhZ2UucGF5bG9hZC5jb3B5UGF0aDtcblxuICAvLyBjcmVhdGVSZWFkU3RyZWFtICYgY3JlYXRlV3JpdGVTdHJlYW1cbiAgdmFyIGlucHV0RmlsZSA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0ob3JpZ2luYWxQYXRoKTtcbiAgdmFyIG91dHB1dEZpbGUgPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShjb3B5UGF0aCk7XG5cbiAgLy8gRXJyb3IgaGFuZGxpbmdcbiAgaW5wdXRGaWxlLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24oZXJyKSB7XG4gICAgbWVzc2FnZS5yZXNwb25kKHtcbiAgICAgIHJldHVyblZhbHVlOiBmYWxzZSxcbiAgICAgIGVycm9yQ29kZTogXCJjb3B5RmlsZSBjcmVhdGVSZWFkU3RyZWFtIEVSUk9SXCIsXG4gICAgICBlcnJvclRleHQ6IGVyclxuICAgIH0pO1xuICB9KTtcblxuICBvdXRwdXRGaWxlLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24oZXJyKSB7XG4gICAgbWVzc2FnZS5yZXNwb25kKHtcbiAgICAgIHJldHVyblZhbHVlOiBmYWxzZSxcbiAgICAgIGVycm9yQ29kZTogXCJjb3B5RmlsZSBjcmVhdGVXcml0ZVN0cmVhbSBFUlJPUlwiLFxuICAgICAgZXJyb3JUZXh0OiBlcnJcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gRG8gY29weSAmIEVuZCBldmVudFxuICBpbnB1dEZpbGUucGlwZShvdXRwdXRGaWxlKS5vbihcImNsb3NlXCIsIGZ1bmN0aW9uKGVycikge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XG4gICAgICAgIHJldHVyblZhbHVlOiBmYWxzZSxcbiAgICAgICAgZXJyb3JDb2RlOiBcImNvcHlGaWxlIGNyZWF0ZVdyaXRlU3RyZWFtIEVSUk9SXCIsXG4gICAgICAgIGVycm9yVGV4dDogZXJyXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWVzc2FnZS5yZXNwb25kKHtcbiAgICAgICAgcmV0dXJuVmFsdWU6IHRydWVcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG59KTtcblxuLy8gZXhpc3RzXG5zZXJ2aWNlLnJlZ2lzdGVyKFwiZXhpc3RzXCIsIGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgdmFyIHBhdGggPSAgbWVzc2FnZS5wYXlsb2FkLnBhdGg7XG5cbiAgZnMuZXhpc3RzKHBhdGgsIGZ1bmN0aW9uKGV4aXN0cykge1xuICAgIG1lc3NhZ2UucmVzcG9uZCh7XG4gICAgICByZXR1cm5WYWx1ZTogZXhpc3RzLFxuICAgIH0pO1xuICB9KTtcbn0pO1xuXG4vLyBsaXN0RmlsZXNcbnNlcnZpY2UucmVnaXN0ZXIoXCJsaXN0RmlsZXNcIiwgZnVuY3Rpb24obWVzc2FnZSkge1xuICB2YXIgcGF0aCA9ICBtZXNzYWdlLnBheWxvYWQucGF0aDtcblxuICBmcy5yZWFkZGlyKHBhdGgsIGZ1bmN0aW9uKGVyciwgZmlsZXMpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICBtZXNzYWdlLnJlc3BvbmQoe1xuICAgICAgICByZXR1cm5WYWx1ZTogZmFsc2UsXG4gICAgICAgIGVycm9yQ29kZTogXCJsaXN0RmlsZXMgRVJST1JcIixcbiAgICAgICAgZXJyb3JUZXh0OiBlcnJcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBtZXNzYWdlLnJlc3BvbmQoe1xuICAgICAgICByZXR1cm5WYWx1ZTogdHJ1ZSxcbiAgICAgICAgZmlsZXM6IGZpbGVzXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xufSk7XG5cbi8vIG1rZGlyXG5zZXJ2aWNlLnJlZ2lzdGVyKFwibWtkaXJcIiwgZnVuY3Rpb24obWVzc2FnZSkge1xuICB2YXIgcGF0aCA9ICBtZXNzYWdlLnBheWxvYWQucGF0aDtcbiAgY29uc29sZS5sb2coXCJwYXRoXCIsIHBhdGgpO1xuICBmcy5ta2RpcihwYXRoLCBmdW5jdGlvbihlcnIpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICBtZXNzYWdlLnJlc3BvbmQoe1xuICAgICAgICByZXR1cm5WYWx1ZTogZmFsc2UsXG4gICAgICAgIGVycm9yQ29kZTogXCJta2RpciBFUlJPUlwiLFxuICAgICAgICBlcnJvclRleHQ6IGVyclxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XG4gICAgICAgIHJldHVyblZhbHVlOiB0cnVlXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xufSk7XG5cbi8vIHJtZGlyXG5zZXJ2aWNlLnJlZ2lzdGVyKFwicm1kaXJcIiwgZnVuY3Rpb24obWVzc2FnZSkge1xuICB2YXIgcGF0aCA9ICBtZXNzYWdlLnBheWxvYWQucGF0aDtcblxuICBmcy5ybWRpcihwYXRoLCBmdW5jdGlvbihlcnIpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICBtZXNzYWdlLnJlc3BvbmQoe1xuICAgICAgICByZXR1cm5WYWx1ZTogZmFsc2UsXG4gICAgICAgIGVycm9yQ29kZTogXCJybWRpciBFUlJPUlwiLFxuICAgICAgICBlcnJvclRleHQ6IGVyclxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XG4gICAgICAgIHJldHVyblZhbHVlOiB0cnVlXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xufSk7XG5cbi8vIG1vdmVGaWxlXG5zZXJ2aWNlLnJlZ2lzdGVyKFwibW92ZUZpbGVcIiwgZnVuY3Rpb24obWVzc2FnZSkge1xuICB2YXIgb3JpZ2luYWxQYXRoID0gIG1lc3NhZ2UucGF5bG9hZC5vcmlnaW5hbFBhdGg7XG4gIHZhciBkZXN0aW5hdGlvblBhdGggPSAgbWVzc2FnZS5wYXlsb2FkLmRlc3RpbmF0aW9uUGF0aDtcblxuICBmcy5yZW5hbWUob3JpZ2luYWxQYXRoLCBkZXN0aW5hdGlvblBhdGgsIGZ1bmN0aW9uKGVycikge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XG4gICAgICAgIHJldHVyblZhbHVlOiBmYWxzZSxcbiAgICAgICAgZXJyb3JDb2RlOiBcInJlbmFtZSBFUlJPUlwiLFxuICAgICAgICBlcnJvclRleHQ6IGVyclxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XG4gICAgICAgIHJldHVyblZhbHVlOiB0cnVlXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xufSk7XG5cbi8vIHJlYWRGaWxlXG5zZXJ2aWNlLnJlZ2lzdGVyKFwicmVhZEZpbGVcIiwgZnVuY3Rpb24obWVzc2FnZSkge1xuICB2YXIgcGF0aCA9ICBtZXNzYWdlLnBheWxvYWQucGF0aDtcbiAgdmFyIGVuY29kaW5nID0gbWVzc2FnZS5wYXlsb2FkLmVuY29kaW5nO1xuXG4gIGZzLnJlYWRGaWxlKHBhdGgsIGVuY29kaW5nLCBmdW5jdGlvbihlcnIsIGRhdGEpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICBtZXNzYWdlLnJlc3BvbmQoe1xuICAgICAgICByZXR1cm5WYWx1ZTogZmFsc2UsXG4gICAgICAgIGVycm9yQ29kZTogXCJyZWFkRmlsZSBFUlJPUlwiLFxuICAgICAgICBlcnJvclRleHQ6IGVyclxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XG4gICAgICAgIHJldHVyblZhbHVlOiB0cnVlLFxuICAgICAgICBkYXRhOiBkYXRhXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xufSk7XG5cbi8vIHJlbW92ZUZpbGVcbnNlcnZpY2UucmVnaXN0ZXIoXCJyZW1vdmVGaWxlXCIsIGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgdmFyIHBhdGggPSAgbWVzc2FnZS5wYXlsb2FkLnBhdGg7XG5cbiAgZnMudW5saW5rKHBhdGgsIGZ1bmN0aW9uKGVycikge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIG1lc3NhZ2UucmVzcG9uZCh7XG4gICAgICAgIHJldHVyblZhbHVlOiBmYWxzZSxcbiAgICAgICAgZXJyb3JDb2RlOiBcInJlbW92ZUZpbGUgRVJST1JcIixcbiAgICAgICAgZXJyb3JUZXh0OiBlcnJcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBtZXNzYWdlLnJlc3BvbmQoe1xuICAgICAgICByZXR1cm5WYWx1ZTogdHJ1ZVxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbn0pO1xuXG4vLyB1bnppcEZpbGVcbnNlcnZpY2UucmVnaXN0ZXIoXCJ1bnppcEZpbGVcIiwgZnVuY3Rpb24obWVzc2FnZSkge1xuICBjb25zdCB1bnppcCA9IHJlcXVpcmUoXCJ1bnppcFwiKTtcblxuICB2YXIgemlwRmlsZVBhdGggPSAgbWVzc2FnZS5wYXlsb2FkLnppcEZpbGVQYXRoO1xuICB2YXIgZXh0cmFjdFRvRGlyZWN0b3J5UGF0aCA9ICBtZXNzYWdlLnBheWxvYWQuZXh0cmFjdFRvRGlyZWN0b3J5UGF0aDtcblxuICAvLyBjcmVhdGVSZWFkU3RyZWFtXG4gIHZhciByZWFkU3RyZWFtID0gZnMuY3JlYXRlUmVhZFN0cmVhbSh6aXBGaWxlUGF0aCk7XG5cbiAgLy8gRXJyb3IgaGFuZGxpbmdcbiAgcmVhZFN0cmVhbS5vbihcImVycm9yXCIsIGZ1bmN0aW9uKGVycikge1xuICAgIG1lc3NhZ2UucmVzcG9uZCh7XG4gICAgICByZXR1cm5WYWx1ZTogZmFsc2UsXG4gICAgICBlcnJvckNvZGU6IFwidW56aXBGaWxlIGNyZWF0ZVJlYWRTdHJlYW0gRVJST1JcIixcbiAgICAgIGVycm9yVGV4dDogZXJyXG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vIERvIHVuemlwICYgRW5kIGV2ZW50XG4gIHJlYWRTdHJlYW1cbiAgICAucGlwZShcbiAgICAgIHVuemlwLkV4dHJhY3Qoe1xuICAgICAgICBwYXRoOiBleHRyYWN0VG9EaXJlY3RvcnlQYXRoXG4gICAgICB9KVxuICAgIClcbiAgICAub24oXCJjbG9zZVwiLCBmdW5jdGlvbihlcnIpIHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgbWVzc2FnZS5yZXNwb25kKHtcbiAgICAgICAgICByZXR1cm5WYWx1ZTogZmFsc2UsXG4gICAgICAgICAgZXJyb3JDb2RlOiBcInVuemlwRmlsZSBFeHRyYWN0IEVSUk9SXCIsXG4gICAgICAgICAgZXJyb3JUZXh0OiBlcnJcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtZXNzYWdlLnJlc3BvbmQoe1xuICAgICAgICAgIHJldHVyblZhbHVlOiB0cnVlXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xufSk7XG5cbi8vIHdyaXRlRmlsZVxuc2VydmljZS5yZWdpc3RlcihcIndyaXRlRmlsZVwiLCBmdW5jdGlvbihtZXNzYWdlKSB7XG4gIHZhciBwYXRoID0gIG1lc3NhZ2UucGF5bG9hZC5wYXRoO1xuICB2YXIgZGF0YSA9IG1lc3NhZ2UucGF5bG9hZC5kYXRhO1xuICB2YXIgZW5jb2RpbmcgPSBtZXNzYWdlLnBheWxvYWQuZW5jb2Rpbmc7XG5cbiAgZnMud3JpdGVGaWxlKHBhdGgsIGRhdGEsIGVuY29kaW5nLCBmdW5jdGlvbihlcnIpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICBtZXNzYWdlLnJlc3BvbmQoe1xuICAgICAgICByZXR1cm5WYWx1ZTogZmFsc2UsXG4gICAgICAgIGVycm9yQ29kZTogXCJ3cml0ZUZpbGUgRVJST1JcIixcbiAgICAgICAgZXJyb3JUZXh0OiBlcnJcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBtZXNzYWdlLnJlc3BvbmQoe1xuICAgICAgICByZXR1cm5WYWx1ZTogdHJ1ZVxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbn0pIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9