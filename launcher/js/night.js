// Auto night dim: between NIGHT hours, one translucent veil above the UI (below the
// settings sheet) dims everything. No filters, so it composites cheaply on TV GPUs.
(function (A) {
  'use strict';

  var cfg = A.config;

  function isNight(h) {
    return cfg.NIGHT_START > cfg.NIGHT_END
      ? h >= cfg.NIGHT_START || h < cfg.NIGHT_END
      : h >= cfg.NIGHT_START && h < cfg.NIGHT_END;
  }

  function update() {
    document.body.classList.toggle('night', A.settings.nightDim !== false && isNight(new Date().getHours()));
  }

  A.night = {
    update: update,
    start: function () { update(); setInterval(update, 60000); }
  };
})(window.AeroTizen);
