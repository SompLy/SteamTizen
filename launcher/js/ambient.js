// Ambient idle screensaver: after an hour without input the screen goes black and a
// DVD logo bounces around, changing colour on every wall hit. Any key wakes it
// (capture phase, so the key still reaches its normal layer).
(function (A) {
  'use strict';

  var cfg = A.config, timer = null, raf = null, on = false;
  var layer = null, logo = null;
  var COLORS = ['#1a9fff', '#e0001c', '#f5c518', '#7c5cff', '#1ed760', '#ff6ec7'], colorAt = 0;
  var x = 300, y = 250, vx = 2.4, vy = 2.4;

  function busy() {
    return window.Fireplace.isOpen() || A.inputs.watching || A.settingsUi.isOpen();
  }

  // ~30 fps; one element moved with transforms only, so the TV GPU composites it cheaply.
  function loop(step) {
    var last = 0, raf = window.requestAnimationFrame || function (f) { return setTimeout(function () { f(Date.now()); }, 33); };
    var alive = true;
    function frame(now) {
      if (!alive) { return; }
      if (!document.hidden && now - last >= 32) { step(); last = now; }
      raf(frame);
    }
    raf(frame);
    return { stop: function () { alive = false; } };
  }

  function stepLogo() {
    var w = logo.offsetWidth, h = logo.offsetHeight;
    if (!w) { return; }
    x += vx; y += vy;
    var bounced = false;
    if (x < 0) { x = 0; vx = -vx; bounced = true; }
    else if (x > 1920 - w) { x = 1920 - w; vx = -vx; bounced = true; }
    if (y < 0) { y = 0; vy = -vy; bounced = true; }
    else if (y > 1080 - h) { y = 1080 - h; vy = -vy; bounced = true; }
    if (bounced) {
      colorAt = (colorAt + 1) % COLORS.length;
      logo.style.color = COLORS[colorAt];
    }
    logo.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
  }

  function enter() {
    timer = null;
    if (busy()) { return arm(); }
    on = true;
    document.body.classList.add('ambient');
    layer.hidden = false;
    x = 300 + Math.random() * 600; y = 200 + Math.random() * 300;
    colorAt = Math.floor(Math.random() * COLORS.length);
    logo.style.color = COLORS[colorAt];
    logo.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    raf = loop(stepLogo);
  }

  function exit() {
    if (!on) { return; }
    on = false;
    document.body.classList.remove('ambient');
    layer.hidden = true;
    if (raf) { raf.stop(); raf = null; }
  }

  function arm() {
    clearTimeout(timer);
    if (cfg.AMBIENT_MS > 0) { timer = setTimeout(enter, cfg.AMBIENT_MS); }
  }

  function wake() { exit(); arm(); }

  A.ambient = {
    start: function () {
      layer = A.$('ambient'); logo = A.$('dvd');
      document.addEventListener('keydown', wake, true);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) { wake(); } });
      arm();
    }
  };
})(window.AeroTizen);
