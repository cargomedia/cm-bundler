module.exports = {
  buffer: require('vinyl-buffer'),
  vinyl: require('vinyl-source-stream'),
  sourcemaps: require('gulp-sourcemaps'),
  uglify: require('gulp-uglify'),
  sources: require('../stream/sources'),
  condition: require('../stream/condition'),
  concat: require('../stream/concat'),
  remap: require('../stream/remap')
};
