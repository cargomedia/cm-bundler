var stream = require('stream');

module.exports = {
  process: function(browserify, contents) {
    contents.forEach(function(content) {
      if(!('name' in content)) {
        throw new Error('content.name property required.');
      }
      if(!('data' in content)) {
        throw new Error('content.data property required.');
      }
      if(!('mapPath' in content)) {
        content.mapPath = content.name;
      }

      var options = {file: content.mapPath};
      var s = new stream.Readable();
      s._read = function noop() {
      };
      s.push(content.data);
      s.push(null);

      if (content.require) {
        options.expose = content.name;
        browserify.require(s, options);
      } else {
        browserify.add(s, options);
      }
    });
  }
};
