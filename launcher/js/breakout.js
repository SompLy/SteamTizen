// Built-in game: brick breaker. Arrows move the paddle, OK serves; three balls,
// five brick rows. Clearing the board wins it.
window.BreakoutGame = (function () {
  'use strict';

  var COLS = 8, ROWS = 5, BW = 200, BH = 74, GAP = 12, TOP = 200;
  var BOARD_W = COLS * BW + (COLS - 1) * GAP;
  var BX = (1920 - BOARD_W) / 2, WALL_TOP = 140;
  var PW = 320, PH = 30, PY = 980, R = 16;
  var ROW_FILL = ['#c2380d', '#e08b1e', '#f5c518', '#1ed760', '#1a9fff'];
  var canvas = null, ctx = null, raf = null, running = false, last = 0, acc = 0;
  var px = 960, ball = { x: 960, y: 0, vx: 0, vy: 0 }, bricks = [], lives = 0, score = 0;
  var serving = false, dead = false, won = false;

  function reset() {
    bricks = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        bricks.push({ x: BX + c * (BW + GAP), y: TOP + r * (BH + GAP), row: r, alive: true });
      }
    }
    px = 960; lives = 3; score = 0; dead = false; won = false; serve();
  }

  function serve() {
    ball.x = px; ball.y = PY - R - 2; ball.vx = 0; ball.vy = 0; serving = true;
  }

  function launch() { serving = false; ball.vx = 5; ball.vy = -10; }

  function step() {
    if (serving) { ball.x = px; ball.y = PY - R - 2; return; }
    ball.x += ball.vx; ball.y += ball.vy;
    if (ball.x - R < BX) { ball.x = BX + R; ball.vx = Math.abs(ball.vx); }
    if (ball.x + R > BX + BOARD_W) { ball.x = BX + BOARD_W - R; ball.vx = -Math.abs(ball.vx); }
    if (ball.y - R < WALL_TOP) { ball.y = WALL_TOP + R; ball.vy = Math.abs(ball.vy); }
    // paddle: angle follows where the ball lands on it
    if (ball.vy > 0 && ball.y + R >= PY && ball.y + R <= PY + PH + 14 && Math.abs(ball.x - px) <= PW / 2 + R) {
      ball.vy = -Math.abs(ball.vy);
      ball.vx = Math.max(-8, Math.min(8, (ball.x - px) / (PW / 2) * 8));
      if (Math.abs(ball.vx) < 2) { ball.vx = ball.vx >= 0 ? 2 : -2; }
    }
    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      if (!b.alive) { continue; }
      var ox = Math.min(ball.x + R, b.x + BW) - Math.max(ball.x - R, b.x);
      var oy = Math.min(ball.y + R, b.y + BH) - Math.max(ball.y - R, b.y);
      if (ox <= 0 || oy <= 0) { continue; }
      b.alive = false; score += 10;
      if (oy < ox) { ball.vy = -ball.vy; } else { ball.vx = -ball.vx; }  // bounce off the shallow side
      break;
    }
    var left = 0;
    for (var j = 0; j < bricks.length; j++) { if (bricks[j].alive) { left += 1; } }
    if (!left) { won = true; return; }
    if (ball.y - R > 1080) {
      lives -= 1;
      if (lives > 0) { serve(); } else { dead = true; }
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
    ctx.strokeStyle = 'rgba(26,159,255,.35)'; ctx.lineWidth = 3;
    ctx.strokeRect(BX - 3, WALL_TOP - 3, BOARD_W + 6, 1080 - WALL_TOP + 3);
    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      if (!b.alive) { continue; }
      ctx.fillStyle = ROW_FILL[b.row];
      rrect(ctx, b.x, b.y, BW, BH, 12); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      rrect(ctx, b.x + 8, b.y + 8, BW - 16, 18, 8); ctx.fill();
    }
    ctx.fillStyle = '#7ecbff';
    rrect(ctx, px - PW / 2, PY, PW, PH, 12); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ball.x, ball.y, R, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = '700 44px Roboto, sans-serif';
    ctx.fillText('Score ' + score, 24, 58);
    for (var l = 0; l < lives; l++) {
      ctx.beginPath(); ctx.arc(1920 - 40 - l * 60, 44, 16, 0, 6.29); ctx.fill();
    }
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '500 32px Roboto, sans-serif';
    if (serving) { ctx.fillText('Arrows move · OK serves', 960, 1060); }
    ctx.textAlign = 'left';
    if (dead || won) {
      ctx.fillStyle = 'rgba(5,8,12,.78)'; ctx.fillRect(0, 0, 1920, 1080);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.font = '700 96px Roboto, sans-serif';
      ctx.fillText(won ? 'Cleared!' : 'Out of balls', 960, 470);
      ctx.font = '500 52px Roboto, sans-serif';
      ctx.fillText('Score ' + score + ' — OK to play again', 960, 580);
      ctx.textAlign = 'left';
    }
  }

  function frameLoop(t) {
    if (!running) { return; }
    if (t - last > 15) {
      acc = Math.min(80, t - last); last = t;
      if (!dead && !won) { while (acc > 0) { step(); acc -= 16; } }
      draw();
    }
    raf = requestAnimationFrame(frameLoop);
  }

  window.BreakoutGame = {
    open: function () {
      if (!canvas) { canvas = document.getElementById('breakout-canvas'); ctx = canvas.getContext('2d'); }
      reset(); draw();
      running = true; last = 0;
      raf = requestAnimationFrame(frameLoop);
    },
    close: function () { running = false; if (raf) { cancelAnimationFrame(raf); raf = null; } },
    keydown: function (k) {
      if (k === 10009 || k === 27) { return false; }  // BACK/ESC: the shell closes the game
      if (dead || won) { if (k === 13) { reset(); draw(); } return true; }
      if (k === 37) { px = Math.max(BX + PW / 2, px - 60); }
      else if (k === 39) { px = Math.min(BX + BOARD_W - PW / 2, px + 60); }
      else if (k === 13 && serving) { launch(); }
      return true;
    },
    _state: function () { return { ball: ball, px: px, lives: lives, score: score, serving: serving, dead: dead, won: won }; }  // test hook
  };
  return window.BreakoutGame;
})();
