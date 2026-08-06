(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.InterceptActive = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function isActive(input) {
    var source = input && typeof input === 'object' ? input : {};
    var mode = source.openMode === 'devtools' ? 'devtools' : 'popup';

    if (mode === 'devtools') {
      return source.devtoolsConnected === true && source.devtoolsTabEnabled === true;
    }

    return source.globalEnabled === true;
  }

  return {
    isActive: isActive
  };
});
