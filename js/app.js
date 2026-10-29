// Bootstraps the cabin and a dock of the TV's streaming apps. Plain ES5 for Tizen 3.0.
// The dock is a curated list (exact Tizen app ids from this TV), so it shows the right apps as clean tiles
// and launches them reliably — getAppsInfo returns a messy set of system packages, so we don't use it here.
// Keys are attached FIRST and everything else is wrapped, so one failure can't leave the remote dead.
(function (g) {
  'use strict';

  // --- where the sun is. Default Budapest; change for another city (lat north +, lon east +). ---
  var LAT = 47.50, LON = 19.04;

  // The apps to show, in order. id = Tizen app id; t = tile text; bg/fg = tile colours.
  // If an app is reinstalled its id changes — update it here (list them with the TV in Developer mode).
  var DOCK = [
    { id: '9Ur5IzDKqV.TizenYouTube', name: 'YouTube', t: 'YT', bg: '#FF0000', fg: '#FFFFFF' },
    { id: 'RN1MCdNq8t.Netflix', name: 'Netflix', t: 'N', bg: '#000000', fg: '#E50914' },
    { id: 'MCmYXNxgcu.DisneyPlus', name: 'Disney+', t: 'D+', bg: '#0B1446', fg: '#FFFFFF' },
    { id: 'evKhCgZelL.AmazonIgnitionLauncher2', name: 'Prime Video', t: 'P', bg: '#00A8E1', fg: '#FFFFFF' },
    { id: 'Y6A54cEa22.AppleTV', name: 'Apple TV', t: 'tv', bg: '#111111', fg: '#FFFFFF' },
    { id: 'rJeHak5zRg.Spotify', name: 'Spotify', t: 'S', bg: '#1DB954', fg: '#FFFFFF' },
    { id: 'skysh0WTIM.SkyShowtime', name: 'SkyShowtime', t: 'Sky', bg: '#5B2A86', fg: '#FFFFFF' },
    { id: 'vbUQClczfR.Wuakitv', name: 'Rakuten TV', t: 'R', bg: '#BF0000', fg: '#FFFFFF' },
    { id: 'FyObqYlHVG.SWEETTV', name: 'SWEET.TV', t: 'SW', bg: '#F5A623', fg: '#222222' }
  ];

  // Keep only the apps actually installed (ids can differ on another TV); if that lookup fails, show them all.
  function dockList(cb) {
    if (!g.tizen || !tizen.application || !tizen.application.getAppsInfo) { cb(DOCK); return; }
    try {
      tizen.application.getAppsInfo(function (apps) {
        var have = {}, i;
        for (i = 0; i < apps.length; i++) have[apps[i].id] = true;
        var out = [];
        for (i = 0; i < DOCK.length; i++) if (have[DOCK[i].id]) out.push(DOCK[i]);
        cb(out.length ? out : DOCK);
      }, function () { cb(DOCK); });
    } catch (e) { cb(DOCK); }
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
      var inner = document.createElement('div'); inner.className = 'inner';
      inner.style.background = a.bg; inner.style.color = a.fg;
      inner.appendChild(document.createTextNode(a.t));
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
    if (k === 37) move(-1);
    else if (k === 39) move(1);
    else if (k === 13) { if (tiles[focus]) launch(tiles[focus].getAttribute('data-id')); }
    else return;
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
    document.addEventListener('keydown', onKey, false);
    registerTizenKeys();
    try { document.addEventListener('tizenhwkey', function () { }, false); } catch (e) { }

    try { dockList(buildDock); } catch (e) { try { buildDock(DOCK); } catch (e2) { } }

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
