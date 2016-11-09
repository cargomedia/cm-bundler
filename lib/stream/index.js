module.exports = {
  buffer: require('vinyl-buffer'),
  vinyl: require('vinyl-source-stream'),
  sourcemaps: require('gulp-sourcemaps'),
  condition: require('./condition'),
  concat: require('./concat'),
  merge: require('./merge'),
  remap: require('./remap'),
  debug: require('./debug'),
  uglify: require('gulp-uglify')
};
