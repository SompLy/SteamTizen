// Recently played: per-app last-launch times in their own storage key, so an app
// update never clobbers them and settings.save() stays untouched.
(function (A) {
  'use strict';

  var KEY = 'aerotizen.recents.v1';
  var recents = A.recents = { map: {} };

  recents.load = function () {
    try { recents.map = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }
    catch (e) { recents.map = {}; }  // corrupt or unavailable storage: start empty
  };

  recents.record = function (id) {
    if (!id || id === A.config.FIREPLACE_ID) { return; }
    recents.map[id] = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(recents.map)); } catch (e) { /* session-only then */ }
  };

  recents.list = function (count) {
    return Object.keys(recents.map).sort(function (a, b) { return recents.map[b] - recents.map[a]; })
      .map(function (id) { return A.apps.byId(id); }).filter(Boolean)
      .slice(0, count || A.config.RECENTS_COUNT);
  };
})(window.AeroTizen);
