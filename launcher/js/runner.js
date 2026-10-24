// Built-in game: 3-lane endless runner, flat side view.
// Left/right switch lane, Up jumps, Down rolls under bars; trains need a lane switch.
window.RunnerGame = (function () {
  'use strict';

  var LANES = 3, LANE_H = 300, BY = (1080 - LANES * LANE_H) / 2, PX = 320;
  var canvas = null, ctx = null, raf = null, running = false, last = 0, acc = 0;
  var lane = 1, yOff = 0, vy = 0, rollT = 0;
  var speed = 7, dist = 0, nextSpawn = 0, obstacles = [], coins = [], taken = 0, dead = false;

  function laneY(l) { return BY + l * LANE_H; }
  function playerH() { return rollT > 0 ? 48 : 92; }
  function playerBox() {
    var h = playerH(), ground = laneY(lane) + LANE_H - 24;
    return { x: PX - 30, y: ground - h + yOff, w: 60, h: h };
  }

  function reset() {
    lane = 1; yOff = 0; vy = 0; rollT = 0;
    speed = 7; dist = 0; nextSpawn = 1200; obstacles = []; coins = []; taken = 0; dead = false;
  }

  function spawn() {
    var l = (Math.random() * LANES) | 0, r = Math.random();
    if (r < 0.3) {
      obstacles.push({ lane: l, x: 2000, w: 380, h: 190, type: 'train' });
    } else if (r < 0.65) {
      obstacles.push({ lane: l, x: 2000, w: 90, h: 96, type: 'block' });
      if (Math.random() < 0.5) { coins.push({ lane: l, x: 2000 + 130 }); }
    } else {
      obstacles.push({ lane: l, x: 2000, w: 110, h: 64, type: 'bar' });
      coins.push({ lane: l, x: 2000 + 55 });
    }
    nextSpawn = dist + 700 + Math.random() * 700;
  }

  function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  function step() {
    speed = Math.min(15, 7 + dist / 1500);
    dist += speed;
    if (dist >= nextSpawn) { spawn(); }
    if (rollT > 0) { rollT -= 1; }
    if (yOff !== 0 || vy !== 0) {
      vy += 0.9; yOff += vy;
      if (yOff >= 0) { yOff = 0; vy = 0; }
    }
    var pb = playerBox();
    obstacles = obstacles.filter(function (o) { return o.x + o.w > -80; });
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      o.x -= speed;
      var ob = { x: o.x, y: o.type === 'bar' ? laneY(o.lane) + 20 : laneY(o.lane) + LANE_H - 24 - o.h, w: o.w, h: o.h };
      if (o.lane === lane && overlap(pb, ob)) { dead = true; return; }
    }
    coins = coins.filter(function (cn) { return cn.x > -60; });
    for (var j = 0; j < coins.length; j++) {
      var c = coins[j];
      c.x -= speed;
      if (c.lane === lane && Math.abs(c.x - (PX + 30)) < 46) {
        taken += 1;
        coins.splice(j, 1); j -= 1;
      }
    }
  }

  function rrect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function draw() {
    ctx.fillStyle = '#0b1016'; ctx.fillRect(0, 0, 1920, 1080);
    for (var l = 0; l < LANES; l++) {
      ctx.fillStyle = l === lane ? 'rgba(26,159,255,.10)' : 'rgba(255,255,255,.03)';
      ctx.fillRect(0, laneY(l), 1920, LANE_H);
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
      ctx.strokeRect(0, laneY(l), 1920, LANE_H);
    }
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      var oy = o.type === 'bar' ? laneY(o.lane) + 20 : laneY(o.lane) + LANE_H - 24 - o.h;
      ctx.fillStyle = o.type === 'train' ? '#5a6472' : o.type === 'bar' ? '#8f98a0' : '#c2380d';
      rrect(ctx, o.x, oy, o.w, o.h, 10); ctx.fill();
      if (o.type === 'train') {
        ctx.fillStyle = 'rgba(255,255,255,.25)';
        rrect(ctx, o.x + 30, oy + 30, o.w - 60, 34, 8); ctx.fill();
      }
    }
    ctx.fillStyle = '#f5c518';
    for (var j = 0; j < coins.length; j++) {
      ctx.beginPath(); ctx.arc(coins[j].x, laneY(coins[j].lane) + LANE_H - 100, 22, 0, 6.29); ctx.fill();
    }
    // player
    var pb = playerBox();
    ctx.fillStyle = '#1a9fff';
    rrect(ctx, pb.x, pb.y, pb.w, pb.h, rollT > 0 ? 22 : 26); ctx.fill();
    ctx.fillStyle = '#7ecbff';
    ctx.beginPath(); ctx.arc(PX + (rollT > 0 ? 14 : 0), pb.y + (rollT > 0 ? pb.h / 2 : 20), rollT > 0 ? 18 : 20, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.font = '700 44px Roboto, sans-serif';
    ctx.fillText('Score ' + (((dist / 10) | 0) + taken * 5), 24, BY + 58);
    if (dead) {
      ctx.fillStyle = 'rgba(5,8,12,.78)'; ctx.fillRect(0, 0, 1920, 1080);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.font = '700 96px Roboto, sans-serif';
      ctx.fillText('Crashed!', 960, 470);
      ctx.font = '500 52px Roboto, sans-serif';
      ctx.fillText('Score ' + (((dist / 10) | 0) + taken * 5) + ' — OK to run again', 960, 580);
      ctx.textAlign = 'left';
    }
  }

  function frameLoop(t) {
    if (!running) { return; }
    if (t - last > 15) {
      acc = Math.min(80, t - last); last = t;
      if (!dead) { while (acc > 0) { step(); acc -= 16; } }
      draw();
    }
    raf = requestAnimationFrame(frameLoop);
  }

  window.RunnerGame = {
    open: function () {
      if (!canvas) { canvas = document.getElementById('runner-canvas'); ctx = canvas.getContext('2d'); }
      reset(); draw();
      running = true; last = 0;
      raf = requestAnimationFrame(frameLoop);
    },
    close: function () { running = false; if (raf) { cancelAnimationFrame(raf); raf = null; } },
    keydown: function (k) {
      if (dead) { return k === 13 ? (reset(), true) : true; }
      if (k === 37) { lane = Math.max(0, lane - 1); }
      else if (k === 39) { lane = Math.min(LANES - 1, lane + 1); }
      else if (k === 38 && yOff === 0) { vy = -17; yOff = -1; }
      else if (k === 40) { rollT = 34; if (yOff < 0) { vy = Math.max(vy, 6); } }
      return true;
    }
  };
  return window.RunnerGame;
})();
