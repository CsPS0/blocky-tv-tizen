// Bootstraps the cabin, builds a dock of the TV's installed apps, and launches them. Plain ES5 for Tizen 3.0.
(function (g) {
  'use strict';

  // --- where the sun is. Default Budapest; change for another city (lat north +, lon east +). ---
  var LAT = 47.50, LON = 19.04;

  // Apps whose own icon is a hard-to-read wordmark get a big blocky letter instead, like the Android launcher.
  var LETTERS = [
    { m: /netflix/i, t: 'N', fg: '#E50914', bg: '#000000' },
    { m: /\b(max|hbo)\b/i, t: 'M', fg: '#FFFFFF', bg: '#002BE7' },
    { m: /disney/i, t: 'D+', fg: '#FFFFFF', bg: '#0B1446' }
  ];
  // Preferred order at the front of the dock; the rest follow in the TV's own order.
  var ORDER = [/youtube/i, /netflix/i, /disney/i, /\b(max|hbo)\b/i, /prime|amazon/i, /apple/i, /spotify/i];

  function letterFor(name) { for (var i = 0; i < LETTERS.length; i++) if (LETTERS[i].m.test(name)) return LETTERS[i]; return null; }
  function orderRank(name) { for (var i = 0; i < ORDER.length; i++) if (ORDER[i].test(name)) return i; return ORDER.length + 1; }

  function listApps(cb) {
    if (!g.tizen || !tizen.application || !tizen.application.getAppsInfo) {
      // Browser-pane preview: a sample dock.
      cb([
        { id: 'p.youtube', name: 'YouTube', iconPath: null },
        { id: 'p.netflix', name: 'Netflix', iconPath: null },
        { id: 'p.disney', name: 'Disney+', iconPath: null },
        { id: 'p.max', name: 'Max', iconPath: null },
        { id: 'p.prime', name: 'Prime Video', iconPath: null },
        { id: 'p.apple', name: 'Apple TV', iconPath: null },
        { id: 'p.spotify', name: 'Spotify', iconPath: null }
      ]);
      return;
    }
    var self = null;
    try { self = tizen.application.getCurrentApplication().appInfo.id; } catch (e) { }
    tizen.application.getAppsInfo(function (apps) {
      var out = [];
      for (var i = 0; i < apps.length; i++) {
        var a = apps[i];
        if (a.id === self || a.show === false) continue;
        if (!a.name) continue;
        out.push({ id: a.id, name: a.name, iconPath: a.iconPath });
      }
      out.sort(function (x, y) { var rx = orderRank(x.name), ry = orderRank(y.name); return rx !== ry ? rx - ry : 0; });
      cb(out);
    }, function () { cb([]); });
  }

  function launch(id) {
    if (!g.tizen || !tizen.application) return;
    tizen.application.launch(id, null, function (e) { /* app not launchable; stay on the cabin */ });
  }

  var tiles = [], focus = 0, dockEl;

  function buildDock(apps) {
    dockEl = document.getElementById('dock');
    dockEl.innerHTML = '';
    tiles = [];
    for (var i = 0; i < apps.length; i++) {
      var a = apps[i];
      var tile = document.createElement('div'); tile.className = 'tile';
      var inner = document.createElement('div'); inner.className = 'inner';
      var letter = letterFor(a.name);
      if (letter) {
        inner.style.background = letter.bg; inner.style.color = letter.fg;
        inner.className += ' letter'; inner.textContent = letter.t;
      } else if (a.iconPath) {
        var img = document.createElement('img'); img.src = a.iconPath;
        (function (innerEl, nm) { img.onerror = function () { innerEl.className += ' letter'; innerEl.textContent = nm.charAt(0).toUpperCase(); }; })(inner, a.name);
        inner.appendChild(img);
      } else { inner.className += ' letter'; inner.textContent = a.name.charAt(0).toUpperCase(); }
      tile.appendChild(inner);
      var label = document.createElement('div'); label.className = 'label'; label.textContent = a.name;
      tile.appendChild(label);
      tile.setAttribute('data-id', a.id);
      dockEl.appendChild(tile);
      tiles.push(tile);
    }
    focus = 0; applyFocus();
  }

  function applyFocus() {
    for (var i = 0; i < tiles.length; i++) tiles[i].className = 'tile' + (i === focus ? ' on' : '');
    if (tiles[focus]) tiles[focus].scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function move(d) { if (!tiles.length) return; focus = Math.max(0, Math.min(tiles.length - 1, focus + d)); applyFocus(); }

  function onKey(e) {
    var k = e.keyCode;
    if (k === 37) { move(-1); e.preventDefault(); }           // left
    else if (k === 39) { move(1); e.preventDefault(); }        // right
    else if (k === 13) { if (tiles[focus]) launch(tiles[focus].getAttribute('data-id')); e.preventDefault(); }  // OK
    // Back (10009) and others: let the TV handle them; never trap Exit.
  }

  function start() {
    var canvas = document.getElementById('room');
    canvas.width = 1920; canvas.height = 1080;
    var room = new g.Room(canvas, LAT, LON);

    // ?t=<hours> shifts the clock, to preview night from a browser. No effect without the param.
    var off = 0, m = /[?&]t=(-?\d+(?:\.\d+)?)/.exec(location.search); if (m) off = parseFloat(m[1]) * 3600000;

    function tick() { room.frame(Date.now() + off); }
    tick();
    setInterval(tick, 400);

    listApps(buildDock);
    document.addEventListener('keydown', onKey, false);
    // Tizen hardware back/menu key, if delivered separately.
    document.addEventListener('tizenhwkey', function (e) { /* keep the cabin; do not exit on Back */ }, false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, false);
  else start();
})(window);
