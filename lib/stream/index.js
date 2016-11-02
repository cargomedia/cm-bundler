module.exports = {
  buffer: require('vinyl-buffer'),
  vinyl: require('vinyl-source-stream'),
  sourcemaps: require('gulp-sourcemaps'),
  uglify: require('gulp-uglify'),
  sources: require('./sources'),
  condition: require('./condition'),
  concat: require('./concat'),
  remap: require('./remap'),
  debug: require('./debug')
};
