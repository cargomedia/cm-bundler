/**
 * default configuration
 *
 * merged with cli option -c/--config file
 * some cli options could also override this config (log, host, port, etc...)
 */
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
    enabled: false,                      // cm-bundler specific
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
