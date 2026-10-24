// Shared shell for the built-in games: one fullscreen overlay at a time.
// Game modules are resolved by name at open time (config loads before them).
window.Games = (function () {
  'use strict';

  var current = null, layer = null;

  function def() { return window.AeroTizen.config.BUILTIN_APPS[current]; }

  function open(id) {
    if (!window.AeroTizen.config.BUILTIN_APPS[id]) { return; }
    close();
    current = id;
    layer = document.getElementById(def().layer);
    layer.hidden = false;
    var mod = def().module && window[def().module];
    if (mod) { mod.open(); }
  }

  function close() {
    if (!current) { return; }
    var mod = def().module && window[def().module];
    if (mod) { mod.close(); }
    layer.hidden = true;
    current = null; layer = null;
  }

  function keydown(k) {
    if (!current) { return false; }
    var mod = def().module && window[def().module];
    return mod ? (mod.keydown(k) !== false) : true;
  }

  return { open: open, close: close, keydown: keydown, current: function () { return current; } };
})();
