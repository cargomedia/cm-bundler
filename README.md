[![Build Status](https://travis-ci.org/cargomedia/cm-bundler.svg?branch=master)][travis]
[![npm](https://img.shields.io/npm/v/cm-bundler.svg)][npm]

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
    -H, --host <host>      hostname (default: 127.0.0.1)
    -p, --port <port>      port (default: 6644)
    -b, --base-dir <dir>   base directory
    -c, --config <file>    config file (JSON format)
    -s, --socket <file>    unix domain socket file
    -l, --log-file <file>  output logs to a file
    -C, --no-color         output logs to standard output without colors
    -v, --verbose          be verbose (-v,-vv,-vvv)
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
  "command": "sourcemaps" || "code",     // type of request
  "name": "bundle name",                 // use mainly in logs
  "config": {...}                        // see "JSON configuration"
}
```

_Each request must be terminated by a [End-of-Transmission character][eot] (`U+004`)_


##### example
```bash
echo -ne '{"name":"test","command":"code","config":{}}\004' | nc 127.0.0.1 6644 
```

#### JSON configuration

```json
{
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

##### `watch`

Only patterns listed by the `watch` property will be watched.
Only file changes (add/remove/change) will trigger a renew of the config cache.

_see [Caches](#caches) section for more details._

##### `sourceMaps.replace`

This option replace all matching `file.path` in the sourcemaps, in addition to some built-in replacements:
- `^.*/?browser-pack/_prelude.js` changed into `.cm-bundler/require`, see browserify generated [prelude][b-prelude] file
- `^.*/?cm-bundler` changed into `.cm-bundler`, ie. for browserify [compatibilty modules][b-compat]
- remove all `.js` extensions


The replacement could be defined by a regular expression or a string, in this case, it will be converted into `/<matching-string>/gi`.
Example: `/usr/foo/my/lib/file.js` file with `{"foo/lib/": ".*my/lib/"}` replacement will be visible in the browser as `foo/lib/file.js`.


### Response

**success**
```json
{
   "content": "..."  // generated bundle content
}
```

**error**
```json
{
   "error": "Error message",
   "stack": "stracktrace..."
}
```

Caches
------

There are 2 type of cache:
- config specific:
  - config cache: overall bundle cache, the key is a combination of the config hash + watched files checksum 
- shared by all config:
  - [browserify cache][b-cache]: per browserify module
  - concat cache: per concat patterns  

When a watched file is changed, matching shared caches are invalidated and the config cache is regenerated.


[Browserify Plugins][code-bundler-plugin]
-----------------------------------------

### Cache

Store the output of [module-deps][m-deps] stream and use it as the [`cache` options][b-cache] during the next browserify execution.

The cache is invalidated per module, so only this module + its dependencies will be resolved by [module-deps][m-deps] during the next 
browserify build.

_Plugin strongly inspired by [watchify plugin][b-watch]._


### Content

Inject inline content in the bundle, the code can refer to other modules available through browserify.
In `expose` mode, other browserify modules can refer to the inline content, with `require(<path>)`.

#### Syntax

- `path`: name used to refer to the inline module (`require(<path>)`)
- `source`: source code
- `execute / optional (default: true)`: like `browserify.add` for entries, the code is executed when it is loaded
- `expose / optional (default: false)`: like `browserify.require`, the code is exposed to the global scope via `require()`

_Note: with `execute: false` + `expose: false`, the code will never be executed and will be unreachable_


Test
----

```bash
npm test
```

Release
-------

 - update package.json with a new version
 - release a new git tag with the updated package.json

After that the npm release should be done automatically. If it didn't happen then release it manually:
```
npm publish https://github.com/cargomedia/cm-bundler/archive/<GitTagWithUpdatedPackageJson>.tar.gz
```


 [travis]: https://travis-ci.org/cargomedia/cm-bundler
 [npm]: https://www.npmjs.com/package/cm-bundler
 [b-prelude]: https://github.com/substack/browser-pack
 [b-compat]: https://github.com/substack/node-browserify#compatibility
 [b-cache]: https://github.com/substack/module-deps#var-d--mdepsopts
 [b-watch]: https://github.com/substack/watchify
 [m-deps]: https://github.com/substack/module-deps
 [eot]: https://en.wikipedia.org/wiki/End-of-Transmission_character
 [code-bundler-plugin]: https://github.com/cargomedia/cm-bundler/tree/master/lib/bundler/plugins
