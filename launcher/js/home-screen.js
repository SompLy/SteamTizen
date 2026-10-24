// Left rail (Home / Fun / Apps / Settings) and the content rows share remote navigation.
// Focus moves LEFT from the first tile column onto the rail; only Home tiles move (hold OK).
(function (A) {
  'use strict';

  var cfg = A.config, COLS = 3;
  var rows = [], row = 0, col = [], scrollY = 0;
  var page = 'home', mode = 'content', railIndex = 0, query = '';
  var moving = null;
  var CHEVRONS = { left: 'M15 5l-7 7 7 7', right: 'M9 5l7 7-7 7', up: 'M5 15l7-7 7 7', down: 'M5 9l7 7 7-7' };

  function railItems() { return [A.$('rail-home'), A.$('rail-fun'), A.$('rail-apps'), A.$('gear')]; }
  function gridTiles() { return [].slice.call(A.$('grid').children); }

  function render() {
    var grid = A.$('grid'), home = A.settings.home, size = A.settings.cardSize === 'small' ? 'small' : 'big';
    COLS = cfg.CARD_COLUMNS[size];
    grid.className = 'app-grid cards-' + size + (page === 'fun' ? ' fun' : '');
    grid.textContent = '';
    if (page === 'home') {
      // Home is streaming apps only; built-in activities moved to the Fun tab.
      home = home.filter(function (id) { return A.apps.byId(id); });
      A.settings.home = home;
    } else if (page === 'fun') {
      home = cfg.BUILTIN_IDS;
    } else {
      home = A.apps.all.map(function (app) { return app.id; });
    }
    A.$('apps-empty').hidden = page === 'home' || home.length > 0;
    grid.setAttribute('aria-label', page === 'home' ? 'Home apps' : page === 'fun' ? 'Fun activities' : 'All apps');
    A.$('rail-home').classList.toggle('active', page === 'home');
    A.$('rail-fun').classList.toggle('active', page === 'fun');
    A.$('rail-apps').classList.toggle('active', page === 'apps');
    // Search row only on the All apps page; typing filters the grid live.
    if (page === 'apps') {
      A.$('search-section').hidden = false;
      if (query) {
        home = home.filter(function (id) { return A.apps.byId(id).name.toLowerCase().indexOf(query) >= 0; });
      }
      A.$('apps-empty').textContent = query ? 'No matching apps.' : 'No apps found.';
    } else {
      A.$('search-section').hidden = true;
    }
    home.forEach(function (id) {
      var tile;
      if (id === cfg.FIREPLACE_ID) {
        tile = A.el('div', 'tile fire');
        tile.setAttribute('role', 'button');
        tile.setAttribute('aria-label', 'Fireplace');
        tile.title = 'Fireplace';
        tile.innerHTML = A.tiles.ICONS.flame;
        tile.onclick = A.apps.playFireplace;
      } else if (cfg.BUILTIN_APPS[id]) {
        var b = cfg.BUILTIN_APPS[id];
        tile = A.el('div', 'tile builtin');
        tile.setAttribute('role', 'button');
        tile.setAttribute('aria-label', b.label);
        tile.title = b.label;
        tile.innerHTML = A.tiles.ICONS[b.icon];
        tile.onclick = function () { window.Games.open(id); };
      } else {
        var app = A.apps.byId(id);
        tile = A.tiles.app(app, '', function () { A.apps.launch(app); });
      }
      tile.dataset.id = id;
      grid.appendChild(tile);
    });
    buildRows();
  }

  function buildRows() {
    rows = [];
    if (page === 'apps') { rows.push([A.$('search-bar')]); }
    rows = rows.concat(A.chunk(gridTiles(), COLS));
    var inputTiles = [].slice.call(A.$('inputs').children);
    A.$('inputs-section').hidden = page !== 'home' || inputTiles.length === 0;
    if (!A.$('inputs-section').hidden) { rows.push(inputTiles); }
    for (var r = 0; r < rows.length; r++) { if (col[r] === undefined) { col[r] = 0; } }
    focus();
  }

  function focus() {
    if (A.settingsUi.isOpen()) { return; }
    A.clearFocus();
    if (mode === 'rail') {
      var railEl = railItems()[railIndex];
      if (railEl) { railEl.classList.add('focused'); }
      return;
    }
    if (!rows.length) { return; }
    row = Math.max(0, Math.min(row, rows.length - 1));
    while (row > 0 && !rows[row].length) { row--; }
    col[row] = Math.max(0, Math.min(col[row] || 0, rows[row].length - 1));
    var el = rows[row][col[row]];
    el.classList.add('focused');
    // Keep the focused row on screen (only matters with more than 6 apps). Measured on screen,
    // since offsetTop is relative to the nearest positioned parent.
    var main = A.$('rows'), rect = el.getBoundingClientRect(), mainTop = main.getBoundingClientRect().top;
    // Use the unscrolled position so rapid key repeats cannot compound an active transition.
    var viewportTop = main.parentNode.getBoundingClientRect().top;
    var top = rect.top - mainTop + viewportTop, bottom = rect.bottom - mainTop + viewportTop;
    if (row <= 1) { scrollY = 0; } else if (bottom - scrollY > 1040) { scrollY = bottom - 1040; } else if (top - scrollY < 140) { scrollY = Math.max(0, top - 140); }
    A.$('rows').style.transform = 'translate3d(0,' + (-scrollY) + 'px,0)';
  }

  function moveFocus(dRow, dCol) {
    var input = A.$('app-search');
    if (document.activeElement === input) { input.blur(); }  // arrow keys leave the IME
    if (dCol) { col[row] += dCol; return focus(); }
    var c = col[row] || 0, r = row + dRow;
    while (r > 0 && r < rows.length && !rows[r].length) { r += dRow; }
    if (r < 0 || r >= rows.length) { return; }
    row = r; col[row] = c; focus();
  }

  function current() { return rows[row] && rows[row][col[row]]; }

  function showPage(next) {
    if (moving) { endMove(); }
    clearTimeout(pressTimer); pressTimer = null;
    page = next;
    query = '';
    A.$('app-search').value = '';
    A.$('app-search').blur();
    scrollY = 0;
    A.$('rows').style.transform = 'translate3d(0,0,0)';
    render();
  }

  function enterRail() {
    mode = 'rail';
    // the rail highlights where you are, so re-entry lands on the current section
    var idx = { home: 0, fun: 1, apps: 2 }[page];
    railIndex = idx === undefined ? 0 : idx;
    focus();
  }
  function enterContent() {
    mode = 'content';
    if (!rows[row] || !rows[row].length) { row = 0; }
    focus();
  }
  function activateRail() {
    var el = railItems()[railIndex];
    if (el === A.$('gear')) { A.settingsUi.open(); return; }
    showPage(el === A.$('rail-apps') ? 'apps' : el === A.$('rail-fun') ? 'fun' : 'home');
  }

  // ---- hold OK to move ---------------------------------------------------------
  function showArrows() {
    var old = document.querySelectorAll('.move-arrow');
    for (var i = 0; i < old.length; i++) { old[i].parentNode.removeChild(old[i]); }
    if (!moving) { return; }
    var tiles = gridTiles(), at = tiles.indexOf(moving), n = tiles.length;
    var can = { left: at > 0, right: at < n - 1, up: at - COLS >= 0, down: at + COLS < n };
    Object.keys(can).forEach(function (dir) {
      if (!can[dir]) { return; }
      var arrow = A.el('div', 'move-arrow ' + dir);
      arrow.innerHTML = '<svg viewBox="0 0 24 24"><path fill="none" stroke="#111" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="' + CHEVRONS[dir] + '"/></svg>';
      moving.appendChild(arrow);
    });
  }

  function startMove() {
    var el = current();
    if (page !== 'home' || !el || el.parentNode !== A.$('grid')) { return false; }
    moving = el;
    moving.classList.add('moving');
    showArrows();
    A.toast('Use the arrows to move it, OK to drop');
    return true;
  }

  function stepMove(delta) {
    var tiles = gridTiles(), from = tiles.indexOf(moving);
    var to = Math.max(0, Math.min(tiles.length - 1, from + delta));
    if (to === from) { return; }
    var grid = A.$('grid');
    grid.removeChild(moving);
    grid.insertBefore(moving, gridTiles()[to] || null);
    row = 1 + Math.floor(to / COLS); col[row] = to % COLS;
    buildRows();
    moving.classList.add('moving');
    showArrows();
  }

  function endMove() {
    A.settings.home = gridTiles().map(function (t) { return t.dataset.id; });
    moving.classList.remove('moving');
    moving = null;
    showArrows();
    A.settings.save();
    A.hideToast();
  }

  // ---- keys --------------------------------------------------------------------
  var KEY = cfg.KEY, pressTimer = null, pressHandled = false;

  function keydown(k, e) {
    if (moving) {
      if (k === KEY.LEFT) { stepMove(-1); } else if (k === KEY.RIGHT) { stepMove(1); } else if (k === KEY.UP) { stepMove(-COLS); } else if (k === KEY.DOWN) { stepMove(COLS); } else if (k === KEY.ENTER || k === KEY.BACK || k === KEY.ESC) { e.preventDefault(); pressHandled = true; endMove(); }
      return;
    }
    if (mode === 'rail') {
      if (k === KEY.UP) { railIndex = Math.max(0, railIndex - 1); focus(); }
      else if (k === KEY.DOWN) { railIndex = Math.min(railItems().length - 1, railIndex + 1); focus(); }
      else if (k === KEY.ENTER) { e.preventDefault(); activateRail(); }
      else if (k === KEY.RIGHT) { enterContent(); }
      return;
    }
    if (k === KEY.LEFT) {
      if (col[row] > 0) { moveFocus(0, -1); } else { enterRail(); }
    } else if (k === KEY.RIGHT) { moveFocus(0, 1); } else if (k === KEY.UP) { moveFocus(-1); } else if (k === KEY.DOWN) { moveFocus(1); } else if (k === KEY.ENTER) {
      e.preventDefault();
      // Held keys auto-repeat; only the first keydown starts the long-press timer.
      if (pressTimer || pressHandled) { return; }
      pressTimer = setTimeout(function () { pressTimer = null; pressHandled = startMove(); }, cfg.LONG_PRESS_MS);
      return;
    } else if (k === KEY.BACK || k === KEY.ESC) {
      e.preventDefault();
      if (page !== 'home') { showPage('home'); }
    }
  }

  // A short press (released before the long-press timer) opens the focused item.
  function keyup(k) {
    if (mode !== 'content') { pressHandled = false; return; }
    if (k === KEY.ENTER && pressTimer) {
      clearTimeout(pressTimer); pressTimer = null;
      var el = current();
      if (el && el.onclick) { el.onclick(); }
    }
    pressHandled = false;
  }

  A.homeScreen = { render: render, buildRows: buildRows, focus: focus, keydown: keydown, keyup: keyup };
  A.$('rail-home').onclick = function () { railIndex = 0; showPage('home'); };
  A.$('rail-fun').onclick = function () { railIndex = 1; showPage('fun'); };
  A.$('rail-apps').onclick = function () { railIndex = 2; showPage('apps'); };
  A.$('gear').onclick = function () { railIndex = 3; if (moving) { endMove(); } A.settingsUi.open(); };
  A.$('search-bar').onclick = function () { A.$('app-search').focus(); };
  A.$('app-search').oninput = function () {
    var input = A.$('app-search');
    query = input.value.trim().toLowerCase();
    render();
  };
})(window.AeroTizen);
