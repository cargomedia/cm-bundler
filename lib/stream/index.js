module.exports = {
  buffer: require('vinyl-buffer'),
  vinyl: require('vinyl-source-stream'),
  sourcemaps: require('gulp-sourcemaps'),
  condition: require('./condition'),
  order: require('./order'),
  concat: require('./concat'),
  merge: require('./merge'),
  remap: require('./remap'),
  uglify: require('gulp-uglify')
};
