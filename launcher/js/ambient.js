// Ambient idle mode: after a few quiet minutes the launcher fades into a large clock.
// Any key wakes it (capture phase, so the key still reaches its normal layer).
(function (A) {
  'use strict';

  var cfg = A.config, timer = null, ticker = null, on = false;
  var layer = null, timeEl = null, dateEl = null;

  function busy() {
    return window.Fireplace.isOpen() || A.inputs.watching || A.settingsUi.isOpen();
  }

  function tick() {
    var d = new Date();
    timeEl.textContent = A.clock.formatTime(d, A.settings.timeFormat);
    dateEl.textContent = A.clock.formatDate(d, 'long');
  }

  function enter() {
    timer = null;
    if (busy()) { return arm(); }
    on = true;
    document.body.classList.add('ambient');
    layer.hidden = false;
    tick(); ticker = setInterval(tick, 1000);
  }

  function exit() {
    if (!on) { return; }
    on = false;
    document.body.classList.remove('ambient');
    layer.hidden = true;
    clearInterval(ticker); ticker = null;
  }

  function arm() {
    clearTimeout(timer);
    if (cfg.AMBIENT_MS > 0) { timer = setTimeout(enter, cfg.AMBIENT_MS); }
  }

  function wake() { exit(); arm(); }

  A.ambient = {
    start: function () {
      layer = A.$('ambient'); timeEl = A.$('ambient-time'); dateEl = A.$('ambient-date');
      document.addEventListener('keydown', wake, true);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) { wake(); } });
      arm();
    }
  };
})(window.AeroTizen);
