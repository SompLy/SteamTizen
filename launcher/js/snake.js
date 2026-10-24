// Built-in game: classic Snake on a 40x22 board. Arrows steer, OK restarts after death.
window.SnakeGame = (function () {
  'use strict';

  var GX = 40, GY = 22, CELL = 48, OY = (1080 - GY * CELL) / 2;
  var canvas = null, ctx = null, snake = [], dir = null, queued = null, food = null;
  var score = 0, dead = false, raf = null, running = false, last = 0, acc = 0, speed = 140;

  function onSnake(p, skipTail) {
    for (var i = 0; i < snake.length - (skipTail ? 1 : 0); i++) {
      if (snake[i].x === p.x && snake[i].y === p.y) { return true; }
    }
    return false;
  }

  function placeFood() {
    do { food = { x: (Math.random() * GX) | 0, y: (Math.random() * GY) | 0 }; } while (onSnake(food));
  }

  function reset() {
    snake = [{ x: 12, y: 11 }, { x: 11, y: 11 }, { x: 10, y: 11 }];
    dir = { x: 1, y: 0 }; queued = null; score = 0; dead = false; speed = 140;
    placeFood();
  }

  function step() {
    if (queued) { dir = queued; queued = null; }
    var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (head.x < 0 || head.y < 0 || head.x >= GX || head.y >= GY || onSnake(head, true)) { dead = true; return; }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10; speed = Math.max(70, speed - 4); placeFood();
    } else { snake.pop(); }
  }

  function rrect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function draw() {
    var bg = ctx.createLinearGradient(0, 0, 0, 1080);
    bg.addColorStop(0, '#0a1018'); bg.addColorStop(1, '#0d1521');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1920, 1080);
    // faint grid
    ctx.strokeStyle = 'rgba(126,203,255,.06)'; ctx.lineWidth = 1;
    for (var gx = 0; gx <= GX; gx++) { ctx.beginPath(); ctx.moveTo(gx * CELL, OY); ctx.lineTo(gx * CELL, OY + GY * CELL); ctx.stroke(); }
    for (var gy = 0; gy <= GY; gy++) { ctx.beginPath(); ctx.moveTo(0, OY + gy * CELL); ctx.lineTo(GX * CELL, OY + gy * CELL); ctx.stroke(); }
    // frame: soft outer line + bright inner line
    ctx.strokeStyle = 'rgba(26,159,255,.35)'; ctx.lineWidth = 10;
    ctx.strokeRect(5, OY + 5, GX * CELL - 10, GY * CELL - 10);
    ctx.strokeStyle = 'rgba(26,159,255,.8)'; ctx.lineWidth = 3;
    ctx.strokeRect(10, OY + 10, GX * CELL - 20, GY * CELL - 20);
    // apple with a highlight
    var fx = food.x * CELL + CELL / 2, fy = OY + food.y * CELL + CELL / 2;
    ctx.fillStyle = '#e0001c';
    ctx.beginPath(); ctx.arc(fx, fy, CELL * 0.32, 0, 6.29); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath(); ctx.arc(fx - 7, fy - 8, 5, 0, 6.29); ctx.fill();
    // body fades toward the tail
    for (var i = snake.length - 1; i >= 0; i--) {
      var s = snake[i], k = 1 - 0.35 * (i / Math.max(1, snake.length - 1));
      ctx.fillStyle = i === 0 ? '#7ecbff' : 'rgb(' + ((26 * k) | 0) + ',' + ((159 * k) | 0) + ',' + ((255 * k) | 0) + ')';
      rrect(ctx, s.x * CELL + 4, OY + s.y * CELL + 4, CELL - 8, CELL - 8, 12);
      ctx.fill();
    }
    // head with eyes looking where it steers
    var h0 = snake[0], hx = h0.x * CELL + CELL / 2, hy = OY + h0.y * CELL + CELL / 2;
    var ex = dir.y ? 10 : 0, ey = dir.x ? 10 : 0;
    for (var e = -1; e <= 1; e += 2) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(hx + e * ex + dir.x * 9, hy + e * ey + dir.y * 9, 7, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#0b1016';
      ctx.beginPath(); ctx.arc(hx + e * ex + dir.x * 12, hy + e * ey + dir.y * 12, 3.4, 0, 6.29); ctx.fill();
    }
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = '700 44px Roboto, sans-serif';
    ctx.fillText('Score ' + score, 24, OY + 58);
    if (dead) {
      ctx.fillStyle = 'rgba(5,8,12,.78)'; ctx.fillRect(0, 0, 1920, 1080);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.font = '700 96px Roboto, sans-serif';
      ctx.fillText('Game Over', 960, 470);
      ctx.font = '500 52px Roboto, sans-serif';
      ctx.fillText('Score ' + score + ' — OK to play again', 960, 580);
      ctx.textAlign = 'left';
    }
  }

  function frameLoop(t) {
    if (!running) { return; }
    if (t - last > 32) {
      acc += Math.min(120, t - last); last = t;
      while (acc >= speed && !dead) { step(); acc -= speed; }
      draw();
    }
    raf = requestAnimationFrame(frameLoop);
  }

  var MAP = { 37: { x: -1, y: 0 }, 38: { x: 0, y: -1 }, 39: { x: 1, y: 0 }, 40: { x: 0, y: 1 } };

  window.SnakeGame = {
    open: function () {
      if (!canvas) { canvas = document.getElementById('snake-canvas'); ctx = canvas.getContext('2d'); }
      reset(); draw();
      running = true; last = 0; acc = 0;
      raf = requestAnimationFrame(frameLoop);
    },
    close: function () { running = false; if (raf) { cancelAnimationFrame(raf); raf = null; } },
    keydown: function (k) {
      if (k === 10009 || k === 27) { return false; }  // BACK/ESC: the shell closes the game
      if (MAP[k]) {
        if (!dead && !(MAP[k].x === -dir.x && MAP[k].y === -dir.y)) { queued = MAP[k]; }
        return true;
      }
      if (k === 13 && dead) { reset(); draw(); return true; }
      return true;  // the game owns every key while it is open
    }
  };
  return window.SnakeGame;
})();
