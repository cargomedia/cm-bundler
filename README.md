CM bundler
==========

Command line tool to generate javascript bundles from different sources: CommonJS / Vanilla / inline code.
The configuration is read from the standard input and it generates the bundle code on the standard output.


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
  "entries": [
    "foo.js",                  // loaded as an entry-points, not accessible from the global scope    
    "path/to/bar.js"
  ],
  "libraries": [         
    "path/lib/foo/baz/qux.js"  // accessible with `require('baz/qux')` (see "paths")
  ],
  "content": [
    {
      "name": "foo",         // not accessible from the global scope
      "data": "var qux = require('baz/qux'); module.exports = function() { //something... };"
    },
    {
      "name": "bar", 
      "required": true,     // accessible with `require('bar')`
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
  "sourceMaps": true        
  "uglify": true             
}
```


Test
----

```bash
npm test
```
