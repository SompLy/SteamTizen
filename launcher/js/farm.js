// Built-in: a tiny farming toy (Hay Day flavored). Arrows move the cursor,
// OK plants a seed or harvests a grown crop; harvesting pays coins and seeds.
window.FarmGame = (function () {
  'use strict';

  var COLS = 6, ROWS = 4, PITCH = 150, SIZE = 130, OX = (1920 - COLS * PITCH) / 2, OY = (1080 - ROWS * PITCH) / 2;
  var GROW_MS = 4500;
  var canvas = null, ctx = null, raf = null, running = false, last = 0, tickAt = 0;
  var plots = [], cx = 0, cy = 0, coins = 0, seeds = 4, total = 0;

  function reset() {
    plots = [];
    for (var i = 0; i < COLS * ROWS; i++) { plots.push({ stage: 0, at: 0 }); }
    cx = 0; cy = 0; coins = 0; seeds = 4; total = 0;
  }

  function act() {
    var p = plots[cy * COLS + cx];
    if (p.stage === 0) {
      if (seeds > 0) { seeds -= 1; p.stage = 1; p.at = Date.now(); }
      else { window.AeroTizen.toast('No seeds — harvest a grown crop first'); }
    } else if (p.stage === 2) {
      coins += 2; seeds += 1; total += 1;
      p.stage = 0; p.at = 0;
    }
  }

  function rrect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawCrop(x, y, p, now) {
    if (p.stage === 1) {
      var t = Math.min(1, (now - p.at) / GROW_MS);
      ctx.strokeStyle = '#1ed760'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + SIZE / 2, y + SIZE - 34);
      ctx.lineTo(x + SIZE / 2, y + SIZE - 34 - 46 * t);
      ctx.stroke();
      if (t > 0.45) {
        ctx.beginPath();
        ctx.moveTo(x + SIZE / 2, y + SIZE - 52);
        ctx.lineTo(x + SIZE / 2 - 22, y + SIZE - 66);
        ctx.stroke();
      }
    } else if (p.stage === 2) {
      ctx.strokeStyle = '#f5c518'; ctx.lineWidth = 8; ctx.lineCap = 'round';
      for (var k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(x + SIZE / 2 + k * 12, y + SIZE - 30);
        ctx.lineTo(x + SIZE / 2 + k * 20, y + SIZE - 84);
        ctx.stroke();
      }
      ctx.fillStyle = '#f5c518';
      for (var w = -1; w <= 1; w++) {
        ctx.beginPath();
        ctx.arc(x + SIZE / 2 + w * 20, y + SIZE - 90, 9, 0, 6.29);
        ctx.fill();
      }
    }
  }

  function draw(now) {
    ctx.fillStyle = '#12201a'; ctx.fillRect(0, 0, 1920, 1080);
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = OX + c * PITCH + 10, y = OY + r * PITCH + 10;
        ctx.fillStyle = (r + c) % 2 ? '#2c5134' : '#294c30';
        rrect(ctx, x, y, SIZE, SIZE, 18); ctx.fill();
        var p = plots[r * COLS + c];
        if (p.stage === 2 || (p.stage === 1 && now - p.at >= GROW_MS)) { p.stage = 2; }
        drawCrop(x, y, p, now);
      }
    }
    // cursor
    var gx = OX + cx * PITCH + 10, gy = OY + cy * PITCH + 10;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 5;
    rrect(ctx, gx - 6, gy - 6, SIZE + 12, SIZE + 12, 22); ctx.stroke();
    ctx.fillStyle = 'rgba(26,159,255,.14)';
    rrect(ctx, gx, gy, SIZE, SIZE, 18); ctx.fill();
    // HUD
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = '700 48px Roboto, sans-serif';
    ctx.fillText('Coins ' + coins + '  ·  Seeds ' + seeds + '  ·  Harvested ' + total, OX, OY - 28);
  }

  function frameLoop(t) {
    if (!running) { return; }
    if (t - last > 32) { last = t; draw(Date.now()); }
    raf = requestAnimationFrame(frameLoop);
  }

  window.FarmGame = {
    open: function () {
      if (!canvas) { canvas = document.getElementById('farm-canvas'); ctx = canvas.getContext('2d'); }
      reset(); draw(Date.now());
      running = true; last = 0;
      raf = requestAnimationFrame(frameLoop);
    },
    close: function () { running = false; if (raf) { cancelAnimationFrame(raf); raf = null; } },
    keydown: function (k) {
      if (k === 37) { cx = Math.max(0, cx - 1); }
      else if (k === 39) { cx = Math.min(COLS - 1, cx + 1); }
      else if (k === 38) { cy = Math.max(0, cy - 1); }
      else if (k === 40) { cy = Math.min(ROWS - 1, cy + 1); }
      else if (k === 13) { act(); }
      return true;
    }
  };
  return window.FarmGame;
})();
