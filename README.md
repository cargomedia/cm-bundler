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

    -h, --help     output usage information
    -V, --version  output the version number
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
      "name": "foo",           // not accessible from the global scope
      "data": "var qux = require('baz/qux'); module.exports = function() { //something... };"
    },
    {
      "name": "bar", 
      "required": true,       // accessible with `require('bar')`
      "mapPath": "source/map/path/bar.js", 
      "data": "var bla = require('blubb/bla'); module.exports = function() { //something... };"
    }
  ],
  "concat": [                 // non CommonJS files prepended to the bundle
    "vanilla/file/foo.js",
    "vanilla/file/bar.js"
  ],
  "paths": [
     "path/lib/foo",          // paths for require() lookup
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

The replacement could be defined by a regular expression or a string, in this case, it will be converted into `/<matching-string>/g`.
Example: `/usr/foo/my/lib/file.js` file with `{"foo/lib/": ".*my/lib/"}` replacement will be visible in the browser as `foo/lib/file.js`.

Test
----

```bash
npm test
```


 [travis]: https://travis-ci.org/cargomedia/cm-bundler
 [b-prelude]: https://github.com/substack/browser-pack
