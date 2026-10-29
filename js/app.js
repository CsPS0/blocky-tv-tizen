// Bootstraps the cabin, builds a dock of the TV's installed apps, and launches them. Plain ES5 for Tizen 3.0.
// Order matters: the remote-key handler is attached FIRST, and the dock and cabin are each wrapped, so a
// failure in one (e.g. an old-browser canvas quirk, or getAppsInfo) can never leave the remote dead.
(function (g) {
  'use strict';

  // --- where the sun is. Default Budapest; change for another city (lat north +, lon east +). ---
  var LAT = 47.50, LON = 19.04;

  // Apps whose own icon is a hard-to-read wordmark get a big blocky letter, like the Android launcher.
  var LETTERS = [
    { m: /netflix/i, t: 'N', fg: '#E50914', bg: '#000000' },
    { m: /\b(max|hbo)\b/i, t: 'M', fg: '#FFFFFF', bg: '#002BE7' },
    { m: /disney/i, t: 'D+', fg: '#FFFFFF', bg: '#0B1446' }
  ];
  var ORDER = [/youtube/i, /netflix/i, /disney/i, /\b(max|hbo)\b/i, /prime|amazon/i, /apple/i, /spotify/i];
  var PALETTE = ['#C0392B', '#2E86C1', '#27AE60', '#8E44AD', '#D35400', '#16A085', '#C62828', '#B7950B', '#2C3E50'];

  function letterFor(name) { for (var i = 0; i < LETTERS.length; i++) if (LETTERS[i].m.test(name)) return LETTERS[i]; return null; }
  function orderRank(name) { for (var i = 0; i < ORDER.length; i++) if (ORDER[i].test(name)) return i; return ORDER.length + 1; }
  function hashColor(name) { var s = 0; for (var i = 0; i < name.length; i++) s += name.charCodeAt(i); return PALETTE[s % PALETTE.length]; }

  function listApps(cb) {
    if (!g.tizen || !tizen.application || !tizen.application.getAppsInfo) {
      cb([{ id: 'p.youtube', name: 'YouTube' }, { id: 'p.netflix', name: 'Netflix' }, { id: 'p.disney', name: 'Disney+' },
      { id: 'p.max', name: 'Max' }, { id: 'p.prime', name: 'Prime Video' }, { id: 'p.apple', name: 'Apple TV' }, { id: 'p.spotify', name: 'Spotify' }]);
      return;
    }
    var self = null;
    try { self = tizen.application.getCurrentApplication().appInfo.id; } catch (e) { }
    try {
      tizen.application.getAppsInfo(function (apps) {
        var out = [];
        for (var i = 0; i < apps.length; i++) {
          var a = apps[i];
          if (a.id === self || a.show === false || !a.name) continue;
          out.push({ id: a.id, name: a.name, iconPath: a.iconPath });
        }
        out.sort(function (x, y) { return orderRank(x.name) - orderRank(y.name); });
        cb(out);
      }, function () { cb([]); });
    } catch (e) { cb([]); }
  }

  function launch(id) {
    if (!g.tizen || !tizen.application || !id) return;
    try { tizen.application.launch(id, null, function () { }); } catch (e) { }
  }

  var tiles = [], focus = 0, dockEl;

  function buildDock(apps) {
    dockEl = document.getElementById('dock');
    while (dockEl.firstChild) dockEl.removeChild(dockEl.firstChild);
    tiles = [];
    for (var i = 0; i < apps.length; i++) {
      var a = apps[i];
      var tile = document.createElement('div'); tile.className = 'tile';
      var inner = document.createElement('div'); inner.className = 'inner letter';
      var brand = letterFor(a.name);
      if (brand) { inner.style.background = brand.bg; inner.style.color = brand.fg; inner.appendChild(document.createTextNode(brand.t)); }
      else { inner.style.background = hashColor(a.name); inner.style.color = '#fff'; inner.appendChild(document.createTextNode(a.name.charAt(0).toUpperCase())); }
      // Swap in the real icon only if it actually loads (file paths often don't, on the TV).
      if (a.iconPath) {
        (function (innerEl, path) {
          var img = new Image();
          img.onload = function () { while (innerEl.firstChild) innerEl.removeChild(innerEl.firstChild); innerEl.className = 'inner'; innerEl.style.background = '#000'; innerEl.appendChild(img); };
          img.onerror = function () { };
          img.src = (path.charAt(0) === '/' ? 'file://' + path : path);
        })(inner, a.iconPath);
      }
      tile.appendChild(inner);
      var label = document.createElement('div'); label.className = 'label'; label.appendChild(document.createTextNode(a.name));
      tile.appendChild(label);
      tile.setAttribute('data-id', a.id);
      dockEl.appendChild(tile);
      tiles.push(tile);
    }
    focus = 0; applyFocus();
  }

  function applyFocus() {
    for (var i = 0; i < tiles.length; i++) tiles[i].className = 'tile' + (i === focus ? ' on' : '');
    try { if (tiles[focus] && tiles[focus].scrollIntoView) tiles[focus].scrollIntoView(); } catch (e) { }
  }
  function move(d) { if (!tiles.length) return; focus = Math.max(0, Math.min(tiles.length - 1, focus + d)); applyFocus(); }

  function onKey(e) {
    var k = e.keyCode;
    if (k === 37) move(-1);                 // left
    else if (k === 39) move(1);             // right
    else if (k === 13) { if (tiles[focus]) launch(tiles[focus].getAttribute('data-id')); }  // OK / Enter
    else return;                            // leave up/down, Back, etc. to the TV
    if (e.preventDefault) e.preventDefault();
  }

  function registerTizenKeys() {
    try {
      if (g.tizen && tizen.tvinputdevice && tizen.tvinputdevice.registerKey) {
        var keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Return'];
        for (var i = 0; i < keys.length; i++) { try { tizen.tvinputdevice.registerKey(keys[i]); } catch (e) { } }
      }
    } catch (e) { }
  }

  function start() {
    // 1) Remote first — nothing below can stop the keys from working.
    document.addEventListener('keydown', onKey, false);
    registerTizenKeys();
    try { document.addEventListener('tizenhwkey', function () { }, false); } catch (e) { }

    // 2) Dock.
    try { listApps(buildDock); } catch (e) { try { buildDock([]); } catch (e2) { } }

    // 3) Cabin (least critical: if it fails, the dock still works).
    try {
      var canvas = document.getElementById('room');
      canvas.width = 1920; canvas.height = 1080;
      var room = new g.Room(canvas, LAT, LON);
      var off = 0, m = /[?&]t=(-?\d+(?:\.\d+)?)/.exec(location.search); if (m) off = parseFloat(m[1]) * 3600000;
      room.frame(Date.now() + off);
      setInterval(function () { try { room.frame(Date.now() + off); } catch (e) { } }, 400);
    } catch (e) { }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, false);
  else start();
})(window);
