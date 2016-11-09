[![Build Status](https://travis-ci.org/cargomedia/cm-bundler.svg?branch=master)][travis]

CM bundler
==========

Command line tool to bundle up javascript from different sources: CommonJS / Vanilla / inline code.


Installation
------------

```bash
npm install cm-bundler
```

Usage
-----

```bash
$ cm-bundler --help

  Usage: cm-bundler [options]

  Options:

    -h, --help             output usage information
    -V, --version          output the version number
    -H, --host <host>      hostname (default: 0.0.0.0)
    -p, --port <port>      port (default: 6644)
    -c, --config <file>    config file (JSON format)
    -s, --socket <file>    unix domain socket file
    -l, --log-file <file>  output logs to a file
    -C, --no-color         output logs to standard output without colors
    -v, --verbose          be verbose
    -M, --more-verbose     be more verbose
```


### Configuration

The service configuration is defined as a module and use `/config.js` module located at the root of the project by default.
Optionally, the configuration may be overridden by a module file passed via `-c/--config <file>`.
Additionally, some cli options may also override this config (log, host, port, etc...).

```js
module.exports = {
  bundler: {
    port: 6644,
    host: '0.0.0.0',
    socket: null,                       // serve through a unix domain socket (host:port ignored)
    timeout: 10000,                     // max time to build a bundle
    updateDelay: 100                    // delay between 2 bundle renew due to file changes (only if watcher is enabled)
  },
  log: {
    file: null,
    level: 'info',
    color: true
  },
  watcher: {                            // see https://github.com/paulmillr/chokidar#persistence
    enabled: true                       // cm-bundler specific
  },
  uglify: {                             // see https://github.com/mishoo/UglifyJS2#api-reference
    enabled: true,                      // cm-bundler specific
    mangle: false,
    compress: false,
    output: {
      quote_keys: true,
      beautify: false
    }
  },
  cache: {                              // see https://github.com/isaacs/node-lru-cache
    config: {
      max: 12,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      timeout: 5000                     // max time to create + watch a config
    },
    concat: {
      max: 1000,
      maxAge: 60 * 60 * 1000
    },
    browserify: {
      max: 1000,
      maxAge: 60 * 60 * 1000
    }
  }
};
```

### Request

```js
{
  "command": "sourcemaps" || "code",  // type of request
  "config": {...}                        // see "JSON configuration"
}
```

_Each request must be terminated by a [End-of-Transmission character][eot] (`U+004`)_

#### JSON configuration

```js
{
  "bundleName": "my-bundle.js", // bundle filename (output from bundler pipe)  
  "watch": [                    // watched glob patterns
    "path/to/bar.js",
    "path/lib/**/*.js"
  ],
  "entries": [
    "foo.js",                   // loaded as entry-points, not accessible from the global scope    
    "path/to/bar.js"
  ],
  "libraries": [         
    "path/lib/foo/baz/qux.js"   // accessible with `require('baz/qux')` (see "paths")
  ],
  "content": [
    {
      "path": "foo",           
      "source": "// js source code"
    },
    {
      "path": "bar", 
      "source": "// js source code",
      "execute": true,          // loaded as an entry-point 
      "expose": true            // accessible with `require('bar')`
    }
  ],
  "ignoreMissing": false,       // ignore missing module, see https://github.com/substack/module-deps#var-d--mdepsopts
  "concat": [                   // non CommonJS glob patterns prepended to the bundle
    "vanilla/file/foo.js",
    "vanilla/file/**/*.js"
  ],
  "paths": [
     "path/lib/foo",            // paths for require() lookup
     "path/lib/bar"
  ],
  "sourceMaps": {
    "replace": {
      "vanilla": "vanilla/file/"   // {[replacement]: [matching str/regex]} replace source paths in the sourcemaps 
    }
  }
}
```

##### `sourceMaps.replace`

This option replace all matching `file.path` in the sourcemaps, in addition to some built-in replacements:
- `^.*/?browser-pack/_prelude.js` changed into `.cm-bundler/require`, see browserify generated [prelude][b-prelude] file
- `^.*/?cm-bundler` changed into `.cm-bundler`, ie. for browserify [compatibilty modules][b-compat]
- remove all `.js` extensions


The replacement could be defined by a regular expression or a string, in this case, it will be converted into `/<matching-string>/gi`.
Example: `/usr/foo/my/lib/file.js` file with `{"foo/lib/": ".*my/lib/"}` replacement will be visible in the browser as `foo/lib/file.js`.


### Response

**success**
```js
{
   "content": "..."  // generated bundle content
}
```

**error**
```js
{
   "error": "Error message",
   "stack": "stracktrace..."
}
```


Test
----

```bash
npm test
```


 [travis]: https://travis-ci.org/cargomedia/cm-bundler
 [b-prelude]: https://github.com/substack/browser-pack
 [b-compat]: https://github.com/substack/node-browserify#compatibility
 [eot]: https://en.wikipedia.org/wiki/End-of-Transmission_character
