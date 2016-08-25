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
$ cm-bundler

  Usage: cm-bundler [options] [command]


  Commands:

    code <json>        generate the bundle code
    sourcemaps <json>  generate the sourcemaps
    checksum <json>    generate the bundle checksum
    all <json>         generate the bundle code + inline sourcemaps

  Options:

    -h, --help              output usage information
    -V, --version           output the version number
    -b, --benchmark <file>  benchmark output file
```

#### JSON configuration

```js
{
  "bundleName": "my-bundle.js", // bundle filename (output from bundler pipe)  
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
  "concat": [                   // non CommonJS files prepended to the bundle
    "vanilla/file/foo.js",
    "vanilla/file/bar.js"
  ],
  "paths": [
     "path/lib/foo",            // paths for require() lookup
     "path/lib/bar"
  ],
  "sourceMaps": {
    "enabled": true,
    "replace": {
      "vanilla": "vanilla/file/"   // {[replacement]: [matching str/regex]} replace source paths in the sourcemaps 
    }
  },       
  "uglify": true             
}
```


##### `sourceMaps.replace`

This option replace all matching `file.path` in the sourcemaps, in addition to some built-in replacements:
- all relative references (`../`) are removed (`/\.\.\//g`)
- `.*browser-pack/_prelude.js` changed by `_pack/.prelude`, see browserify generated [prelude][b-prelude] file

The replacement could be defined by a regular expression or a string, in this case, it will be converted into `/<matching-string>/gi`.
Example: `/usr/foo/my/lib/file.js` file with `{"foo/lib/": ".*my/lib/"}` replacement will be visible in the browser as `foo/lib/file.js`.


#### Benchmark option

`--benchmark <file>` could be used to generate benchmark report for each command.

Reports give information about the time spent on each pipeline step, for example:

```
start: 0.004s
browserify: 2.727s
sourcemap: 0.023s
concat: 1.248s
uglify: 23.183s
remap: 0.002s
write-sourcemap: 0.122s
end: 0.107s
```

Test
----

```bash
npm test
```


 [travis]: https://travis-ci.org/cargomedia/cm-bundler
 [b-prelude]: https://github.com/substack/browser-pack
