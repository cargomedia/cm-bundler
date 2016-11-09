module.exports = {
  buffer: require('vinyl-buffer'),
  vinyl: require('vinyl-source-stream'),
  sourcemaps: require('gulp-sourcemaps'),
  condition: require('./condition'),
  concat: require('./concat'),
  remap: require('./remap'),
  debug: require('./debug'),
  uglify: require('./uglify')
};
