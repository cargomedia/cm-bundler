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
$ ./bin/cmd.js

  Usage: cmd [options] <json>

  Options:

    -h, --help             output usage information
    -V, --version          output the version number
    -c, --code-only        output the source code only
    -s, --sourcemaps-only  output the sourcemaps only
    -n, --nice             JSON formatting.
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
  "concat": [                 // non CommonJS files, concatenated after CommonJS content
    "vanilla/file/foo.js",
    "vanilla/file/bar.js"
  ],
  "paths": [
     "path/lib/foo",          // paths for require() lookup
     "path/lib/bar"
  ],
  "sourceMaps": true          // generate inline source maps
}
```


Test
----

```bash
npm test
```
