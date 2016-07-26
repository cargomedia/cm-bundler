var context = {
  execCount: {},
  loadCount: {}
};

window.moduleLoaded = function(name) {
  context.loadCount[name] = name in context.loadCount ? context.loadCount[name]++ : 1;
};
window.getCountLoaded = function(name) {
  return name in context.loadCount ? context.loadCount[name] : 0;
};
window.moduleExecuted = function(name) {
  context.execCount[name] = name in context.execCount ? context.execCount[name]++ : 1;
};
window.getCountExecuted = function(name) {
  return name in context.execCount ? context.execCount[name] : 0;
};

