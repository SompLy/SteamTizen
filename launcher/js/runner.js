// Built-in game: 3-lane endless runner, Subway Surfers view — lanes run away from you,
// obstacles bear down from the top. Left/right switch lane, Up jumps, Down rolls under
// bars. An obstacle is judged once, as its front reaches your line: jump crates,
// roll under bars, switch lanes away from trains.
window.RunnerGame = (function () {
  'use strict';

  var LANES = 3, LANE_W = 560, OX = (1920 - LANES * LANE_W) / 2, GROUND = 1006;
  var canvas = null, ctx = null, raf = null, running = false, last = 0, acc = 0;
  var lane = 1, yOff = 0, vy = 0, rollT = 0;
  var speed = 7, dist = 0, nextSpawn = 0, obstacles = [], coins = [], taken = 0, dead = false;

  function laneX(l) { return OX + l * LANE_W; }
  function playerH() { return rollT > 0 ? 48 : 92; }
  function centerY() { return GROUND - playerH() / 2 + yOff; }
  function playerBox() {
    var h = playerH(), cx = laneX(lane) + LANE_W / 2;
    return { x: cx - 30, y: GROUND - h + yOff, w: 60, h: h };
  }

  function reset() {
    lane = 1; yOff = 0; vy = 0; rollT = 0;
    speed = 7; dist = 0; nextSpawn = 1200; obstacles = []; coins = []; taken = 0; dead = false;
  }

  function spawn() {
    var l = (Math.random() * LANES) | 0, r = Math.random();
    if (r < 0.3) {
      obstacles.push({ lane: l, y: -440, w: 500, h: 420, type: 'train', strike: GROUND - 420, passed: false });
    } else if (r < 0.65) {
      obstacles.push({ lane: l, y: -130, w: 150, h: 120, type: 'block', strike: GROUND - 120, passed: false });
      if (Math.random() < 0.5) { coins.push({ lane: l, y: -160 }); }
    } else {
      obstacles.push({ lane: l, y: -250, w: 440, h: 90, type: 'bar', strike: GROUND - 160, passed: false });
      coins.push({ lane: l, y: -126 });  // stays in the roll gap under the bar as both scroll
    }
    nextSpawn = dist + 700 + Math.random() * 700;
  }

  function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  // Self-check: at the strike line a standing player hits crates and bars, a full
  // jump (apex 200: vy -19, gravity .9) clears crates, rolling clears bars, and
  // nothing clears trains.
  (function () {
    var x = 0;
    var standing = { x: x, y: GROUND - 92, w: 60, h: 92 };
    var jumping = { x: x, y: GROUND - 92 - 200, w: 60, h: 92 };
    var rolling = { x: x, y: GROUND - 48, w: 60, h: 48 };
    var block = { x: x, y: GROUND - 120, w: 150, h: 120 };
    var bar = { x: x, y: GROUND - 160, w: 440, h: 90 };
    var train = { x: x, y: GROUND - 420, w: 500, h: 420 };
    if (overlap(standing, block) !== true || overlap(jumping, block) !== false
        || overlap(standing, bar) !== true || overlap(rolling, bar) !== false
        || overlap(jumping, train) !== true) {
      console.error('Lane Runner: strike geometry must make crates jumpable, bars rollable, trains lethal');
    }
  })();

  function step() {
    speed = Math.min(15, 7 + dist / 1500);
    dist += speed;
    if (dist >= nextSpawn) { spawn(); }
    if (rollT > 0) { rollT -= 1; }
    if (yOff !== 0 || vy !== 0) {
      vy += 0.9; yOff += vy;
      if (yOff >= 0) { yOff = 0; vy = 0; }
    }
    obstacles = obstacles.filter(function (o) { return o.y < GROUND + 120; });
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      o.y += speed;
      // Judged once, as the obstacle's front crosses your line: jump crates,
      // roll under bars, leave trains for another lane.
      if (!o.passed && o.y >= o.strike) {
        o.passed = true;
        if (o.lane === lane) {
          if (o.type === 'train' || (o.type === 'block' && yOff > -85) || (o.type === 'bar' && rollT <= 0)) { dead = true; return; }
        }
      }
    }
    coins = coins.filter(function (c) { return c.y < GROUND + 80; });
    for (var j = 0; j < coins.length; j++) {
      var c = coins[j];
      c.y += speed;
      if (c.lane === lane && Math.abs(c.y - centerY()) < 50) {
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
    var bg = ctx.createLinearGradient(0, 0, 0, 1080);
    bg.addColorStop(0, '#070b11'); bg.addColorStop(1, '#111a26');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1920, 1080);
    // track bed with scrolling sleepers to sell the speed
    ctx.fillStyle = '#0c1219'; ctx.fillRect(OX, 0, LANES * LANE_W, 1080);
    ctx.fillStyle = 'rgba(255,255,255,.045)';
    for (var sy = (dist % 130) - 130; sy < GROUND; sy += 130) { ctx.fillRect(OX, sy, LANES * LANE_W, 44); }
    for (var l = 0; l < LANES; l++) {
      if (l === lane) { ctx.fillStyle = 'rgba(26,159,255,.10)'; ctx.fillRect(laneX(l), 0, LANE_W, 1080); }
      ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(laneX(l), 0); ctx.lineTo(laneX(l), GROUND + 40); ctx.stroke();
      // two rails per lane
      ctx.strokeStyle = 'rgba(170,190,210,.15)';
      ctx.beginPath(); ctx.moveTo(laneX(l) + LANE_W * 0.32, 0); ctx.lineTo(laneX(l) + LANE_W * 0.32, GROUND + 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(laneX(l) + LANE_W * 0.68, 0); ctx.lineTo(laneX(l) + LANE_W * 0.68, GROUND + 40); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.10)';
    ctx.beginPath(); ctx.moveTo(OX, GROUND + 40); ctx.lineTo(OX + LANES * LANE_W, GROUND + 40); ctx.stroke();
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      var ox = laneX(o.lane) + (LANE_W - o.w) / 2, oy = o.y;
      if (o.type === 'train') {
        ctx.fillStyle = '#4b5563'; rrect(ctx, ox, oy, o.w, o.h, 26); ctx.fill();
        ctx.fillStyle = '#3a434f'; rrect(ctx, ox, oy, o.w, 72, 26); ctx.fill();
        ctx.fillStyle = 'rgba(235,242,250,.8)';
        for (var wx = 0; wx < 3; wx++) { rrect(ctx, ox + 50 + wx * 134, oy + 104, 96, 72, 12); ctx.fill(); }
        ctx.fillStyle = '#ffd27a';
        ctx.beginPath(); ctx.arc(ox + o.w / 2, oy + o.h - 44, 16, 0, 6.29); ctx.fill();
        ctx.fillStyle = 'rgba(255,210,122,.16)';
        ctx.beginPath(); ctx.arc(ox + o.w / 2, oy + o.h + 46, 96, 0, 6.29); ctx.fill();
      } else if (o.type === 'bar') {
        ctx.fillStyle = '#8f98a0'; rrect(ctx, ox, oy, o.w, o.h, 18); ctx.fill();
        ctx.save(); rrect(ctx, ox, oy, o.w, o.h, 18); ctx.clip();
        ctx.fillStyle = 'rgba(22,28,34,.5)';
        for (var sx = -90; sx < o.w + 90; sx += 96) {
          ctx.beginPath();
          ctx.moveTo(ox + sx, oy + o.h); ctx.lineTo(ox + sx + 48, oy + o.h);
          ctx.lineTo(ox + sx + 48 + o.h, oy); ctx.lineTo(ox + sx + o.h, oy);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      } else {
        ctx.fillStyle = '#c2380d'; rrect(ctx, ox, oy, o.w, o.h, 14); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 6;
        rrect(ctx, ox + 12, oy + 12, o.w - 24, o.h - 24, 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ox + 12, oy + 12); ctx.lineTo(ox + o.w - 12, oy + o.h - 12); ctx.stroke();
      }
    }
    ctx.fillStyle = '#f5c518';
    for (var j = 0; j < coins.length; j++) {
      var c = coins[j], cx = laneX(c.lane) + LANE_W / 2;
      ctx.beginPath(); ctx.arc(cx, c.y, 22, 0, 6.29); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(cx, c.y, 12, 0, 6.29); ctx.stroke();
    }
    // player
    var pb = playerBox();
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath();
    ctx.ellipse(pb.x + 30, GROUND + 10, 34 * (1 + yOff / 400), 10 * (1 + yOff / 500), 0, 0, 6.29);
    ctx.fill();
    ctx.fillStyle = '#1a9fff';
    rrect(ctx, pb.x, pb.y, pb.w, pb.h, rollT > 0 ? 22 : 26); ctx.fill();
    ctx.fillStyle = '#7ecbff';
    ctx.beginPath(); ctx.arc(pb.x + (rollT > 0 ? 14 : 0), rollT > 0 ? pb.y + pb.h / 2 : pb.y + 20, rollT > 0 ? 18 : 20, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.font = '700 44px Roboto, sans-serif';
    ctx.fillText('Score ' + (((dist / 10) | 0) + taken * 5), 24, 58);
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
      if (k === 10009 || k === 27) { return false; }  // BACK/ESC: the shell closes the game
      if (dead) { return k === 13 ? (reset(), true) : true; }
      if (k === 37) { lane = Math.max(0, lane - 1); }
      else if (k === 39) { lane = Math.min(LANES - 1, lane + 1); }
      else if (k === 38 && yOff === 0) { vy = -19; yOff = -1; }
      else if (k === 40) { rollT = 34; if (yOff < 0) { vy = Math.max(vy, 6); } }
      return true;
    }
  };
  return window.RunnerGame;
})();
