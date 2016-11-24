module.exports = {
  bundler: {
    timeout: 20000
  },
  watcher: {
    enabled: false
  },
  uglify: {
    enabled: true
  },
  cache: {
    config: {
      max: 30,
      maxAge: 5 * 60 * 1000,
      timeout: 5000
    },
    concat: {
      max: 1000,
      maxAge: 5 * 60 * 1000
    },
    browserify: {
      max: 1000,
      maxAge: 5 * 60 * 1000
    }
  }
};
