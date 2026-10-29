// Pixel sprites for the cabin, ported from BlockSprites.java. Each returns a small offscreen <canvas>.
// Original art written as rows of palette letters; figure()/head()/limb() draw the farmer from joint angles.
(function (g) {
  'use strict';
  var C = g.Core;

  function canvasFrom(px, w, h) {
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    var img = ctx.createImageData(w, h), d = img.data;
    for (var i = 0; i < w * h; i++) {
      var c = px[i], j = i * 4;
      d[j] = C.R(c); d[j + 1] = C.G(c); d[j + 2] = C.B(c); d[j + 3] = C.A(c);
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  // Build from palette " x:rrggbb ..." and full rows of letters ('.' = transparent).
  function toArt(pal, rows) {
    var w = 0, y, x;
    for (y = 0; y < rows.length; y++) w = Math.max(w, rows[y].length);
    var px = new Array(w * rows.length); for (var k = 0; k < px.length; k++) px[k] = 0;
    for (y = 0; y < rows.length; y++) {
      for (x = 0; x < rows[y].length; x++) {
        var ch = rows[y].charAt(x);
        if (ch === '.') continue;
        var idx = pal.indexOf(' ' + ch + ':');
        if (idx < 0) throw new Error("no colour for '" + ch + "'");
        px[y * w + x] = (0xFF000000 | parseInt(pal.substr(idx + 3, 6), 16)) >>> 0;
      }
    }
    return canvasFrom(px, w, rows.length);
  }

  function walk(pal, body, legsA, legsB) {
    return [toArt(pal, body.concat(legsA)), toArt(pal, body.concat(legsB))];
  }

  var DOG_PAL = ' W:e8e4dc w:c2bbaf g:a59e92 d:5e574e k:1e1e1e r:c8302a';
  var CAT_PAL = ' o:e09a3a s:a86418 W:f2e6d0 e:6ed04a p:e07a8a';

  function dog() {
    return [
      toArt(DOG_PAL, ['................d..d....', '...............gwggwg...', '.ww............WWWWWW...', '.ww............WWWWkW...', '..WW...........WWWWWWWWk', '..WW...........WWWWWWWWW', '...WgggggggggggWWWWWWwww', '...WWWWWWWWWWWWrr.......', '....WWWWWWWWWWWrr.......', '....WWWWWWWWWWWrr.......', '....WWWWWWWWWWWWW.......', '....WwwwwwwwwwwwW.......', '.....ww.WW..ww.WW.......', '.....ww.WW..ww.WW.......', '.....ww.WW..ww.WW.......']),
      toArt(DOG_PAL, ['................d..d....', '...............gwggwg...', '...............WWWWWW...', '...............WWWWkW...', '...............WWWWWWWWk', '...............WWWWWWWWW', '....gggggggggggWWWWWWwww', '.wwwWWWWWWWWWWWrr.......', '.wwwWWWWWWWWWWWrr.......', '....WWWWWWWWWWWrr.......', '....WWWWWWWWWWWWW.......', '....WwwwwwwwwwwwW.......', '......WW.ww..Www........', '......WW.ww..Www........', '......WW.ww..Www........']),
      toArt(DOG_PAL, ['................d..d....', '...............gwggwg...', '...............WWWWWW...', '...............WWWWkW...', '...............WWWWWWWWk', '...............WWWWWWWWW', '........gggggggWWWWWWwww', '........WWWWWWWrr.......', '..ww....WWWWWWWrr.......', '..ww....WWWWWWWrr.......', '...wwwgggggggggWW.......', '...wwwWWWWWWWWWWww......', '......WWWWWWWWWWww......', '......WWWWWWWWWWww......', '......WWWWWWWWWWww......']),
      toArt(DOG_PAL, ['................d..d....', '...............gwggwg...', '...............WWWWWW...', '...............WWWWkW...', '...............WWWWWWWWk', '...............WWWWWWWWW', '........gggggggWWWWWWwww', '........WWWWWWWrr.......', '........WWWWWWWrr.......', '........WWWWWWWrr.......', '......gggggggggWW.......', '......WWWWWWWWWWww......', '......WWWWWWWWWWww......', '..wwwwWWWWWWWWWWww......', '..wwwwWWWWWWWWWWww......'])
    ];
  }

  function cat() {
    var head = ['......o..o..', '......oooo..', '......oeop..', '......ooWW..', '....oooWW...'];
    return [
      toArt(CAT_PAL, head.concat(['....sssWW...', 's...oooWW...', 's...sssWW...', '.sssooooo...', '....ooWWW...'])),
      toArt(CAT_PAL, head.concat(['....sssWW...', '....oooWW...', '....sssWW...', 's...ooooo...', '.sssooWWW...'])),
      toArt(CAT_PAL, head.concat(['....sssWWooo', 's...oooWW..W', 's...sssWW...', '.sssooooo...', '....ooWWW...']))
    ];
  }

  function sheep() {
    var pal = ' W:e9e9e9 w:c4c4c4 f:d8b493 k:2a2a2a l:b89474';
    var body = ['...wwww...', '.wWWWWWWff', 'wWWWWWWWfk', 'wWWWWWWWff', '.wwWWWWw..'];
    return walk(pal, body, ['.l.l..l.l.', '.l.l..l.l.'], ['..ll...ll.', '..ll...ll.']);
  }
  function cow() {
    var pal = ' b:5b3a24 W:ececec p:e8a0a8 k:1a1a1a h:d8d0b8';
    var body = ['........h.', '.bbbbbbbbb', 'bWWbbbbbkb', 'bWWbbWWbpp', '.bbbbbbbb.'];
    return walk(pal, body, ['.b.b..b.b.', '.b.b..b.b.'], ['..bb...bb.', '..bb...bb.']);
  }
  function pig() {
    var pal = ' p:f0a6a6 q:d07a7a s:e98a96 k:1a1a1a';
    var body = ['..pppppp..', '.pppppppkp', 'qpppppppss', '.pppppppp.'];
    return walk(pal, body, ['.q.q..q.q.'], ['..q.q..q.q']);
  }
  function chicken() {
    var pal = ' W:f2f2f2 y:e8a030 r:d02828 k:1a1a1a';
    var body = ['..WW.', '..Wky', 'WWWWr', 'WWWW.'];
    return walk(pal, body, ['.y.y.'], ['..yy.']);
  }
  function zombie() {
    var pal = ' g:4e8a3a G:3c6e2c c:2e8a8a u:3a3a8a k:1a1a1a';
    var body = ['ggg...', 'ggk...', 'GGG...', 'ccgggg', 'cc....', 'cc....', 'uu....'];
    return walk(pal, body, ['u.u...', 'u.u...'], ['.uu...', '.uu...']);
  }
  function skeleton() {
    var pal = ' B:d6d6d6 d:6a6a6a o:7a5230';
    var body = ['BBB...', 'BBd...', 'BBB...', '.B.o..', '.BBBo.', '.B..o.', '.B....'];
    return walk(pal, body, ['B.B...', 'B.B...'], ['.BB...', '.BB...']);
  }
  function spider() {
    var pal = ' d:2e2622 D:1c1614 R:ff3030';
    var body = ['..dddd....', '.dddddDDRR', 'dddddddddd'];
    return walk(pal, body, ['d.d.d.d.d.', 'd...d...d.'], ['.d.d.d.d.d', '.d...d...d']);
  }

  // --- the farmer, drawn from limb angles ---
  var SHIRT = 0xFF3A7A3A, BELT = 0xFF5A3A1A, BUCKLE = 0xFFC8A040, PANTS = 0xFF4A4A6A, BOOTS = 0xFF3A2A1A;
  var HAIR = 0xFF4A2E1A, SKIN = 0xFFE0A878, EYE = 0xFF2A2A6A;

  function fillRectPx(p, w, x0, y0, fw, fh, c) {
    for (var y = y0; y < y0 + fh; y++) for (var x = x0; x < x0 + fw; x++) p[y * w + x] = c;
  }
  function head(p, w, x0, y0, asleep) {
    fillRectPx(p, w, x0, y0, 10, 10, SKIN);
    fillRectPx(p, w, x0, y0, 10, 3, HAIR);
    fillRectPx(p, w, x0, y0, 3, 7, HAIR);
    fillRectPx(p, w, x0 + 9, y0 + 3, 1, 1, HAIR);
    if (asleep) {
      fillRectPx(p, w, x0 + 7, y0 + 5, 2, 1, 0xFF8A5A3A);
    } else {
      fillRectPx(p, w, x0 + 7, y0 + 4, 1, 2, 0xFFF4F4F4);
      fillRectPx(p, w, x0 + 8, y0 + 4, 1, 2, EYE);
    }
    fillRectPx(p, w, x0 + 8, y0 + 8, 2, 1, C.shade(SKIN, -40));
  }
  function limb(p, w, px, py, deg, len, width, upper, lower, split) {
    var a = deg * Math.PI / 180, dx = Math.sin(a), dy = Math.cos(a);
    for (var i = 0; i < p.length; i++) {
      var rx = (i % w) + 0.5 - px, ry = Math.floor(i / w) + 0.5 - py;
      var along = rx * dx + ry * dy, across = rx * dy - ry * dx;
      if (along >= -width / 2 && along < len && Math.abs(across) < width / 2) p[i] = along < split ? upper : lower;
    }
  }
  // Side view, 26 x 41, facing right. Far arm/leg are shaded darker.
  function figure(nearLeg, farLeg, nearArm, farArm) {
    var w = 26, h = 41, p = new Array(w * h), i;
    for (i = 0; i < p.length; i++) p[i] = 0;
    limb(p, w, 10, 15, farArm, 12, 4, C.shade(SHIRT, -30), C.shade(SKIN, -30), 4);
    limb(p, w, 10, 25, farLeg, 15, 4, C.shade(PANTS, -25), C.shade(BOOTS, -20), 12);
    limb(p, w, 10, 25, nearLeg, 15, 4, PANTS, BOOTS, 12);
    fillRectPx(p, w, 8, 13, 5, 11, SHIRT);
    fillRectPx(p, w, 8, 13, 1, 11, C.shade(SHIRT, -18));
    fillRectPx(p, w, 8, 24, 5, 1, BELT);
    fillRectPx(p, w, 11, 24, 2, 1, BUCKLE);
    head(p, w, 5, 3, false);
    limb(p, w, 10, 15, nearArm, 12, 4, SHIRT, SKIN, 4);
    return canvasFrom(p, w, h);
  }
  // [head lying face-up, crown toward the headboard (10x10, rotated -90); blanket over the body (32x6)].
  function sleeper() {
    var p = new Array(100), i;
    for (i = 0; i < 100; i++) p[i] = 0;
    head(p, 10, 0, 0, true);
    var upright = canvasFrom(p, 10, 10);
    var hc = document.createElement('canvas'); hc.width = 10; hc.height = 10;
    var hx = hc.getContext('2d'); hx.imageSmoothingEnabled = false;
    hx.translate(5, 5); hx.rotate(-Math.PI / 2); hx.drawImage(upright, -5, -5); // Matrix.postRotate(-90)
    var w = 32, hh = 6, b = new Array(w * hh);
    for (i = 0; i < b.length; i++) b[i] = 0;
    for (var y = 0; y < hh; y++)
      for (var x = 0; x < w; x++) {
        var top = x < 2 ? 1 : x < 14 ? 0 : x < 22 ? 1 : 2 + ((x - 22) / 4 | 0);
        if (y >= top) b[y * w + x] = (y === top) ? 0xFFC84A40 : (((x + y) % 6 < 3) ? 0xFFB0302A : 0xFF9C2A24);
      }
    return [hc, canvasFrom(b, w, hh)];
  }
  function chestOpen() {
    return toArt(' k:2a1a0e L:7a4e26 l:5e3c1c d:1a100a y:f0c040 g:40d070', [
      'kkkkkkkkkkkkkkkkkkkkkkkkkk', 'kLLLLLLLLLLLLLLLLLLLLLLLLk', 'kLllllllllllllllllllllllLk',
      'kLllllllllllllllllllllllLk', 'kLllllllllllllllllllllllLk', 'kLllllllllllllllllllllllLk',
      'kLLLLLLLLLLLLLLLLLLLLLLLLk', 'kkkkkkkkkkkkkkkkkkkkkkkkkk', 'kddddddddddddddddddddddddk',
      'kddddddddddddddddddddddddk', 'kdddyyddddddddgdddddyydddk', 'kddyyyydddddddggddddyyyddk',
      'kddddddddddddddddddddddddk', 'kddddddddddddddddddddddddk', 'kddddddddddddddddddddddddk',
      'kddddddddddddddddddddddddk', 'kkkkkkkkkkkkkkkkkkkkkkkkkk']);
  }
  function gear() {
    return toArt(' l:e2e2e2 g:a8a8a8 d:5e5e5e', [
      '................', '.......ll.......', '...l...ll...g...', '..lllllllggggg..', '...lllllggggg...',
      '...llllddgggg...', '...llld..dggg...', '.lllld....dgddd.', '.lllgd....ddddd.', '...gggd..dddd...',
      '...ggggdddddd...', '...gggggddddd...', '..gggggddddddd..', '...g...dd...d...', '.......dd.......', '................']);
  }

  g.Sprites = {
    dog: dog, cat: cat, sheep: sheep, cow: cow, pig: pig, chicken: chicken,
    zombie: zombie, skeleton: skeleton, spider: spider,
    figure: figure, sleeper: sleeper, chestOpen: chestOpen, gear: gear
  };
})(window);
