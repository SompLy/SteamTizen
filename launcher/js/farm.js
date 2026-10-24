// Built-in: a tiny farming game (Hay Day flavored). Arrows move the cursor, OK plants a
// seed or harvests a grown crop; harvesting pays coins and seeds. GREEN (or S in the
// browser) opens the shop to spend coins on upgrades; OK on a plot with no seeds left
// opens it too. Progress persists in localStorage between sessions.
window.FarmGame = (function () {
  'use strict';

  var COLS = 6, BASE_ROWS = 4, PITCH = 150, SIZE = 130, OX = (1920 - COLS * PITCH) / 2;
  var GROW_MS = 4500, SAVE_KEY = 'aerotizen.farm.v1';
  var KEY = window.AeroTizen.config.KEY;
  var canvas = null, ctx = null, raf = null, running = false, last = 0;
  var plots = [], rows = BASE_ROWS, cx = 0, cy = 0, coins = 0, seeds = 4, total = 0;
  var lv = { sprinkler: 0, market: 0, barn: 0, land: 0 };
  var shop = false, shopSel = 0;

  var UPGRADES = [
    { id: 'sprinkler', name: 'Sprinkler',    desc: 'Crops grow 20% faster',  max: 4, price: [10, 25, 60, 150] },
    { id: 'market',    name: 'Market stall', desc: 'Harvest pays +1 coin',   max: 4, price: [15, 40, 100, 250] },
    { id: 'barn',      name: 'Seed barn',    desc: 'Harvest yields +1 seed', max: 2, price: [20, 60] },
    { id: 'land',      name: 'Clear land',   desc: 'Adds a row of plots',    max: 2, price: [30, 90] }
  ];

  function freshPlot() { return { stage: 0, at: 0 }; }
  function growMs() { return Math.round(GROW_MS * Math.pow(0.8, lv.sprinkler)); }

  function reset() {
    plots = [];
    for (var i = 0; i < COLS * BASE_ROWS; i++) { plots.push(freshPlot()); }
    rows = BASE_ROWS; cx = 0; cy = 0; coins = 0; seeds = 4; total = 0;
    lv = { sprinkler: 0, market: 0, barn: 0, land: 0 };
    shop = false; shopSel = 0;
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ coins: coins, seeds: seeds, total: total, lv: lv, rows: rows, plots: plots })); } catch (e) { /* blocked or full storage: play unsaved */ }
  }

  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { s = null; }
    if (!s || !Array.isArray(s.plots) || typeof s.coins !== 'number' || typeof s.seeds !== 'number') { return false; }
    rows = Math.max(BASE_ROWS, Math.min(BASE_ROWS + 2, s.rows | 0));
    if (s.plots.length !== COLS * rows) { return false; }
    plots = s.plots; coins = Math.max(0, s.coins | 0); seeds = Math.max(0, s.seeds | 0); total = Math.max(0, s.total | 0);
    lv = { sprinkler: 0, market: 0, barn: 0, land: 0 };
    for (var i = 0; i < UPGRADES.length; i++) {
      lv[UPGRADES[i].id] = Math.max(0, Math.min(UPGRADES[i].max, (s.lv && s.lv[UPGRADES[i].id]) | 0));
    }
    for (var j = 0; j < plots.length; j++) {
      plots[j].stage = plots[j].stage === 1 || plots[j].stage === 2 ? plots[j].stage : 0;
      plots[j].at = +plots[j].at || 0;
    }
    shop = false; shopSel = 0;
    return true;
  }

  function act() {
    var p = plots[cy * COLS + cx];
    if (p.stage === 0) {
      if (seeds > 0) { seeds -= 1; p.stage = 1; p.at = Date.now(); save(); }
      else { shop = true; shopSel = 0; }  // out of seeds: the shop is the way forward
    } else if (p.stage === 2) {
      coins += 2 + lv.market; seeds += 1 + lv.barn; total += 1;
      p.stage = 0; p.at = 0;
      save();
    }
  }

  function buy(u) {
    if (lv[u.id] >= u.max) { window.AeroTizen.toast('Already maxed out'); return; }
    var price = u.price[lv[u.id]];
    if (coins < price) { window.AeroTizen.toast('Not enough coins'); return; }
    coins -= price; lv[u.id] += 1;
    if (u.id === 'land') {
      for (var i = 0; i < COLS; i++) { plots.push(freshPlot()); }
      rows += 1; cy = Math.min(cy, rows - 1);
    }
    window.AeroTizen.toast(u.name + ' upgraded');
    save();
  }

  function rrect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawCrop(x, y, p, now) {
    if (p.stage === 1) {
      var t = Math.min(1, (now - p.at) / growMs());
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
    var oy = (1080 - rows * PITCH) / 2;
    ctx.fillStyle = '#12201a'; ctx.fillRect(0, 0, 1920, 1080);
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = OX + c * PITCH + 10, y = oy + r * PITCH + 10;
        ctx.fillStyle = (r + c) % 2 ? '#2c5134' : '#294c30';
        rrect(ctx, x, y, SIZE, SIZE, 18); ctx.fill();
        var p = plots[r * COLS + c];
        if (p.stage === 2 || (p.stage === 1 && now - p.at >= growMs())) { p.stage = 2; }
        drawCrop(x, y, p, now);
      }
    }
    // cursor
    var gx = OX + cx * PITCH + 10, gy = oy + cy * PITCH + 10;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 5;
    rrect(ctx, gx - 6, gy - 6, SIZE + 12, SIZE + 12, 22); ctx.stroke();
    ctx.fillStyle = 'rgba(26,159,255,.14)';
    rrect(ctx, gx, gy, SIZE, SIZE, 18); ctx.fill();
    // HUD
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = '700 48px Roboto, sans-serif';
    ctx.fillText('Coins ' + coins + '  ·  Seeds ' + seeds + '  ·  Harvested ' + total, OX, oy - 28);
    ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillText('GREEN shop', 1920 - OX, 1080 - 36);
    if (shop) { drawShop(); }
    ctx.textAlign = 'left';
  }

  function drawShop() {
    var PW = 900, px = (1920 - PW) / 2, py = 120, rowH = 130;
    ctx.fillStyle = 'rgba(5,8,12,.82)'; ctx.fillRect(0, 0, 1920, 1080);
    ctx.fillStyle = '#101722'; rrect(ctx, px, py, PW, 700, 24); ctx.fill();
    ctx.strokeStyle = '#263140'; ctx.lineWidth = 3; rrect(ctx, px, py, PW, 700, 24); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = '700 60px Roboto, sans-serif';
    ctx.fillText('Shop', px + 44, py + 76);
    ctx.textAlign = 'right'; ctx.fillStyle = '#f5c518';
    ctx.fillText(coins + ' coins', px + PW - 44, py + 76);
    for (var i = 0; i < UPGRADES.length; i++) {
      var u = UPGRADES[i], y = py + 116 + i * rowH, level = lv[u.id], maxed = level >= u.max;
      if (i === shopSel) {
        ctx.fillStyle = 'rgba(26,159,255,.16)'; rrect(ctx, px + 20, y, PW - 40, rowH - 14, 16); ctx.fill();
        ctx.strokeStyle = '#1a9fff'; ctx.lineWidth = 4; rrect(ctx, px + 20, y, PW - 40, rowH - 14, 16); ctx.stroke();
      }
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '700 40px Roboto, sans-serif';
      ctx.fillText(u.name, px + 48, y + 46);
      ctx.fillStyle = '#8f98a0'; ctx.font = '500 30px Roboto, sans-serif';
      ctx.fillText(u.desc, px + 48, y + 90);
      ctx.textAlign = 'right';
      if (maxed) {
        ctx.fillStyle = '#5b6672'; ctx.font = '700 36px Roboto, sans-serif';
        ctx.fillText('MAX · Lv ' + level, px + PW - 48, y + 66);
      } else {
        var price = u.price[level];
        ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '500 30px Roboto, sans-serif';
        ctx.fillText('Lv ' + level + ' → ' + (level + 1), px + PW - 48, y + 44);
        ctx.fillStyle = coins >= price ? '#f5c518' : '#c2380d'; ctx.font = '700 38px Roboto, sans-serif';
        ctx.fillText(price + ' coins', px + PW - 48, y + 90);
      }
    }
    ctx.textAlign = 'center'; ctx.fillStyle = '#8f98a0'; ctx.font = '500 32px Roboto, sans-serif';
    ctx.fillText('OK buy · GREEN close', 960, py + 660);
  }

  function frameLoop(t) {
    if (!running) { return; }
    if (t - last > 32) { last = t; draw(Date.now()); }
    raf = requestAnimationFrame(frameLoop);
  }

  window.FarmGame = {
    open: function () {
      if (!canvas) { canvas = document.getElementById('farm-canvas'); ctx = canvas.getContext('2d'); }
      if (!load()) { reset(); }
      draw(Date.now());
      running = true; last = 0;
      raf = requestAnimationFrame(frameLoop);
    },
    close: function () { running = false; if (raf) { cancelAnimationFrame(raf); raf = null; } },
    keydown: function (k) {
      if (shop) {
        if (k === KEY.UP) { shopSel = Math.max(0, shopSel - 1); }
        else if (k === KEY.DOWN) { shopSel = Math.min(UPGRADES.length - 1, shopSel + 1); }
        else if (k === KEY.ENTER) { buy(UPGRADES[shopSel]); }
        else if (k === KEY.GREEN || k === 83) { shop = false; }  // 83 = S: shop toggle in the browser
        return true;
      }
      if (k === KEY.GREEN || k === 83) { shop = true; shopSel = 0; return true; }
      if (k === KEY.BACK || k === KEY.ESC) { return false; }  // the shell closes the game
      if (k === KEY.LEFT) { cx = Math.max(0, cx - 1); }
      else if (k === KEY.RIGHT) { cx = Math.min(COLS - 1, cx + 1); }
      else if (k === KEY.UP) { cy = Math.max(0, cy - 1); }
      else if (k === KEY.DOWN) { cy = Math.min(rows - 1, cy + 1); }
      else if (k === KEY.ENTER) { act(); }
      return true;
    }
  };
  return window.FarmGame;
})();
