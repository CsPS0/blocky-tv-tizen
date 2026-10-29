// The cabin: a plank room with a window onto a sky that follows the real sun, torches and a furnace, a dog, a cat,
// a farmer who works by day and sleeps by night, and animals outside by day / monsters by night.
// Ported from BlockRoom.java. Painted at 320x180 art pixels into an offscreen image, scaled up unsmoothed.
(function (g) {
  'use strict';
  var C = g.Core, S = g.Sprites;

  var W = 320, H = 180;
  var WX = 104, WY = 24, WW = 112, WH = 80;          // window opening
  var TORCH_X = [88, 230], TORCH_Y = 50;
  var FRAME_X = 258, FRAME_Y = 54, FRAME_W = 24;      // item frame with the gear
  var PAINT_X = 16, PAINT_Y = 22, PAINT_W = 68, PAINT_H = 48;
  var FLOOR = 148;
  var FX = 234, FY = 116;                              // furnace
  var CAT_X = 36;
  var CHEST_X = 204, CHEST_Y = 124;
  var BED_X = 78;
  var STEP_MS = 400;
  var BOOKS = [0xFF8E2B2B, 0xFF2E4C8C, 0xFF3E7A3A, 0xFF6B4A2A, 0xFF5A3A7A, 0xFFB08A3A];
  var FLAME = [0xFFFFF4B0, 0xFFFFD060, 0xFFFF9A30];
  // task ids
  var SLEEP = 0, WANDER = 1, CHEST = 2, CRAFT = 3, COOK = 4, PET_DOG = 5, PET_CAT = 6;
  var WALK = 4;
  var ZED = ['####', '..#.', '.#..', '####'];
  var HEART = ['#.#', '###', '.#.'];

  function rint(n) { return (Math.random() * n) | 0; }

  // --- paint primitives into the W*H albedo array ---
  function set(p, x, y, c) { if (x >= 0 && x < W && y >= 0 && y < H) p[y * W + x] = c; }
  function rect(p, x0, y0, w, h, c) { for (var y = y0; y < y0 + h; y++) for (var x = x0; x < x0 + w; x++) set(p, x, y, c); }
  function outline(p, x, y, w, h) { var c = 0xFF2E2010; rect(p, x, y, w, 1, c); rect(p, x, y + h - 1, w, 1, c); rect(p, x, y, 1, h, c); rect(p, x + w - 1, y, 1, h, c); }
  function planks(p, x0, y0, w, h, base) {
    for (var y = y0; y < y0 + h; y++) {
      var row = ((y - y0) / 4) | 0, inRow = (y - y0) % 4;
      for (var x = x0; x < x0 + w; x++) {
        var along = x - x0 + row * 7, board = (along / 16) | 0;
        var b = C.shade(base, (row * 31 + board * 17) % 13 - 6);
        var c = C.shade(b, rint(9) - 4);
        if ((along * 3 + inRow * 7 + row) % 11 === 0) c = C.shade(c, -12);
        if (rint(150) === 0 && inRow === 1) c = C.shade(b, -40);
        if (inRow === 3) c = C.shade(base, -40);
        else if (along % 16 === 0) c = C.shade(base, -32);
        else if (along % 16 === 1 && inRow === 1 && board % 2 === 0) c = 0xFF9A9A92;
        else if (inRow === 0) c = C.shade(c, 12);
        set(p, x, y, c);
      }
    }
  }
  function cobble(p, x0, y0, w, h) {
    for (var y = y0; y < y0 + h; y++) {
      var row = ((y - y0) / 5) | 0, inRow = (y - y0) % 5, off = (row % 2) * 3;
      for (var x = x0; x < x0 + w; x++) {
        var col = ((x - x0 + off) / 6) | 0, inCol = (x - x0 + off) % 6;
        var stone = C.shade(0xFF7C7C7C, (row * 53 + col * 29) % 31 - 15);
        var c = (inRow === 0 || inCol === 0) ? 0xFF464646 : C.shade(stone, rint(11) - 5);
        if (inRow === 1 && inCol > 0) c = C.shade(c, 14);
        set(p, x, y, c);
      }
    }
  }
  function logBlock(p, x0, y0, w, h, horizontal) {
    for (var y = y0; y < y0 + h; y++)
      for (var x = x0; x < x0 + w; x++) {
        var along = horizontal ? x : y, across = horizontal ? y : x;
        var c = C.shade(0xFF5B4128, rint(9) - 4);
        if ((across + ((along / 6) | 0)) % 3 === 0) c = C.shade(c, -16);
        set(p, x, y, c);
      }
  }

  function Room(canvas, lat, lon) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.ctx.imageSmoothingEnabled = false;
    this.lat = lat; this.lon = lon;
    this.albedo = new Array(W * H); for (var i = 0; i < W * H; i++) this.albedo[i] = 0;
    this.ao = new Float32Array(W * H);
    this.ground = new Array(((WW / 4) | 0) + 1);

    this.paintRoom();
    this.shadeAO();
    var hh = 2;
    for (i = 0; i < this.ground.length; i++) { hh = Math.max(0, Math.min(3, hh + rint(3) - 1)); this.ground[i] = WH - 12 - 4 * hh; }
    this.hills = this.paintHills();
    this.stars = [];
    for (i = 0; i < 60; i++) this.stars.push({ x: rint(WW), y: rint((WH * 2 / 3) | 0) });

    // offscreen layers
    this.still = document.createElement('canvas'); this.still.width = W; this.still.height = H;
    this.stillCtx = this.still.getContext('2d');
    this.stillImg = this.stillCtx.createImageData(W, H);
    this.sky = document.createElement('canvas'); this.sky.width = WW; this.sky.height = WH;
    this.skyCtx = this.sky.getContext('2d'); this.skyCtx.imageSmoothingEnabled = false;
    this.scratch = document.createElement('canvas'); this.scratch.width = 128; this.scratch.height = 128;
    this.scratchCtx = this.scratch.getContext('2d'); this.scratchCtx.imageSmoothingEnabled = false;

    // creatures
    var d = S.dog();
    this.dog = new Mob([d[0], d[1]], [d[2], d[3]], 120, 1.5, 52, 232);
    this.cat = S.cat();
    this.dayMobs = [mob(S.sheep(), 26, 0.5), mob(S.sheep(), 58, 0.5), mob(S.cow(), 86, 0.5), mob(S.pig(), 40, 0.7), mob(S.chicken(), 70, 1)];
    this.nightMobs = [mob(S.zombie(), 20, 0.5), mob(S.zombie(), 76, 0.5), mob(S.skeleton(), 50, 0.7), mob(S.spider(), 92, 1)];
    this.gear = S.gear();
    this.chestOpen = S.chestOpen();
    this.sleeper = S.sleeper();
    this.walkFig = [S.figure(25, -25, -25, 25), S.figure(-25, 25, 25, -25)];
    var stand = S.figure(0, 0, 4, -4);
    this.workFig = [];
    this.workFig[WANDER] = [stand, stand];
    this.workFig[CHEST] = [S.figure(0, 0, 70, -5), S.figure(0, 0, 100, -5)];
    this.workFig[CRAFT] = [S.figure(0, 0, 125, -5), S.figure(0, 0, 85, -5)];
    this.workFig[COOK] = [S.figure(0, 0, 45, -5), S.figure(0, 0, 62, -5)];
    this.workFig[PET_DOG] = [S.figure(8, -4, 35, -5), S.figure(8, -4, 50, -5)];
    this.workFig[PET_CAT] = [S.figure(0, 0, 132, -5), S.figure(0, 0, 150, -5)];

    this.task = -1; this.pdir = 1; this.face = 1; this.pframe = 0; this.px = 0; this.goal = 0;
    this.there = false; this.doneAt = 0; this.teaseUntil = 0; this.dogHeldUntil = 0;
    this.lastStep = 0; this.stillKey = null;
  }

  function Mob(walk, rest, x, speed, min, max) {
    this.walk = walk; this.rest = rest; this.x = x; this.speed = speed;
    this.dir = 1; this.frame = 0; this.restUntil = 0;
    this.min = min; this.max = max - walk[0].width;
  }
  Mob.prototype.step = function (now, restOdds) {
    this.frame ^= 1;
    if (now < this.restUntil) return;
    if (rint(restOdds) === 0) { this.restUntil = now + 2000 + rint(8000); return; }
    if (rint(30) === 0) this.dir = -this.dir;
    this.x += this.dir * this.speed;
    if (this.x < this.min) { this.x = this.min; this.dir = 1; }
    if (this.x > this.max) { this.x = this.max; this.dir = -1; }
  };
  Mob.prototype.bitmap = function (now) {
    if (now < this.restUntil) return this.rest ? this.rest[this.frame] : this.walk[0];
    return this.walk[this.frame];
  };
  function mob(walk, x, speed) { return new Mob(walk, null, x, speed, 1, WW - 1); }

  var P = Room.prototype;

  P.paintRoom = function () {
    var p = this.albedo, x, y;
    planks(p, 0, 8, W, 140, 0xFF9A7448);
    cobble(p, 0, 128, W, FLOOR - 128);
    planks(p, 0, 125, W, 3, 0xFF6E5030);
    logBlock(p, 0, 0, W, 8, true);
    logBlock(p, 0, 8, 10, 140, false);
    logBlock(p, W - 10, 8, 10, 140, false);
    planks(p, 0, FLOOR, W, 32, 0xFF7A5A36);
    for (x = 0; x < W; x++) p[FLOOR * W + x] = C.shade(p[FLOOR * W + x], 24);

    logBlock(p, WX - 3, WY - 3, WW + 6, WH + 6, true);
    rect(p, WX, WY, WW, WH, 0);
    rect(p, WX + WW / 2 - 1, WY, 2, WH, 0xFF5B4128);
    rect(p, WX, WY + WH / 2 - 1, WW, 2, 0xFF5B4128);
    planks(p, WX - 6, WY + WH + 3, WW + 12, 3, 0xFFB08A58);

    rect(p, WX - 14, WY - 9, WW + 28, 2, 0xFF3A2A1C);
    for (var side = 0; side < 2; side++) {
      var x0 = side === 0 ? WX - 10 : WX + WW - 8;
      for (y = WY - 7; y < WY + WH + 7; y++)
        for (x = x0; x < x0 + 18; x++) {
          var fold = (x - x0) % 4;
          var c = C.shade(0xFF8A2A2A, fold === 0 ? -26 : fold === 2 ? 14 : 0);
          set(p, x, y, C.shade(c, rint(7) - 3));
        }
      rect(p, x0, WY + WH / 2 + 8, 18, 2, 0xFFC8A040);
    }

    planks(p, 18, 116, 32, 32, 0xFF7E5C38);
    for (var shelf = 0; shelf < 2; shelf++) {
      var bottom = 131 + shelf * 15;
      rect(p, 20, bottom - 12, 28, 12, 0xFF3A2A18);
      for (x = 20; x < 48;) {
        var w = 2 + rint(2), hb = 8 + rint(4), col = BOOKS[rint(BOOKS.length)];
        w = Math.min(w, 48 - x);
        rect(p, x, bottom - hb, w, hb, col);
        rect(p, x, bottom - hb + 2, w, 1, C.shade(col, 40));
        x += w;
      }
    }
    outline(p, 18, 116, 32, 32);

    rect(p, 56, 126, 4, 22, 0xFF6E4E2E); outline(p, 56, 126, 4, 22);
    rect(p, 60, 136, 46, 7, 0xFFE8E4DA);
    rect(p, 61, 133, 10, 5, 0xFFF4F2EC);
    rect(p, 61, 137, 10, 1, 0xFFC8C2B4);
    for (y = 135; y < 143; y++) for (x = 72; x < 106; x++) set(p, x, y, C.shade((x + y) % 6 < 3 ? 0xFFB0302A : 0xFF9C2A24, rint(7) - 3));
    rect(p, 72, 135, 34, 1, 0xFFC84A40);
    planks(p, 58, 143, 48, 3, 0xFF7A5A36);
    rect(p, 58, 146, 3, 2, 0xFF4E3220); rect(p, 103, 146, 3, 2, 0xFF4E3220);

    cobble(p, FX, FY, 32, 32);
    rect(p, FX, FY, 32, 3, 0xFF5E5E5E);
    rect(p, FX + 7, FY + 15, 18, 13, 0xFF2E2E2E);
    rect(p, FX + 9, FY + 17, 14, 9, 0xFF140C08);
    for (x = FX + 9; x < FX + 23; x += 3) rect(p, x, FY + 17, 1, 9, 0xFF3A3A3A);
    rect(p, FX + 8, FY + 6, 16, 2, 0xFF4A4A4A);
    outline(p, FX, FY, 32, 32);

    planks(p, 270, 120, 32, 28, 0xFF7A4E2E);
    rect(p, 270, 120, 3, 28, 0xFF4E3220); rect(p, 299, 120, 3, 28, 0xFF4E3220);
    rect(p, 270, 116, 32, 4, 0xFF6E5030);
    for (x = 270; x < 302; x += 4) rect(p, x, 116, 1, 4, 0xFF4E3820);
    rect(p, 270, 118, 32, 1, 0xFF4E3820);
    rect(p, 274, 128, 10, 3, 0xFFB9B9B9);
    for (x = 274; x < 284; x += 2) rect(p, x, 131, 1, 1, 0xFF8A8A8A);
    rect(p, 284, 128, 3, 3, 0xFF5B4128);
    rect(p, 292, 126, 1, 9, 0xFF5B4128);
    rect(p, 290, 125, 5, 2, 0xFF7E7E7E);
    outline(p, 270, 116, 32, 32);

    rect(p, FRAME_X, FRAME_Y, FRAME_W, FRAME_W, 0xFFB08A58);
    for (y = FRAME_Y + 2; y < FRAME_Y + FRAME_W - 2; y++) for (x = FRAME_X + 2; x < FRAME_X + FRAME_W - 2; x++) set(p, x, y, C.shade(0xFF7A4E2E, rint(11) - 5));
    outline(p, FRAME_X, FRAME_Y, FRAME_W, FRAME_W);
    for (var kk = 0; kk < 4; kk++) rect(p, FRAME_X + (kk % 2) * (FRAME_W - 3), FRAME_Y + ((kk / 2) | 0) * (FRAME_W - 3), 3, 3, 0xFF6E5030);

    var px0 = PAINT_X + 3, py0 = PAINT_Y + 3, pw = PAINT_W - 6, ph = PAINT_H - 6;
    rect(p, PAINT_X, PAINT_Y, PAINT_W, PAINT_H, 0xFF4A3220);
    for (y = 0; y < ph; y++) for (x = 0; x < pw; x++) set(p, px0 + x, py0 + y, C.shade(C.mix(0xFF231E46, 0xFF7A4256, y / ph), rint(7) - 3));
    for (x = 0; x < pw; x++) {
      var ridge = ph - 9 - ((5 * Math.abs(Math.sin(x / 8.0))) | 0) - ((x / 4) | 0) % 3;
      for (y = ridge; y < ph; y++) set(p, px0 + x, py0 + y, C.shade(y >= ph - 3 ? 0xFF2A3E26 : 0xFF33304A, rint(7) - 3));
    }
    rect(p, px0 + 3, py0 + 3, 4, 4, 0xFFE8E2C8);
    outline(p, PAINT_X, PAINT_Y, PAINT_W, PAINT_H);

    for (var t = 0; t < 2; t++) {
      var tx = TORCH_X[t];
      for (y = TORCH_Y + 3; y < TORCH_Y + 12; y++) { p[y * W + tx] = 0xFF6B4A28; p[y * W + tx + 1] = 0xFF4E361D; }
      rect(p, tx - 1, TORCH_Y + 10, 4, 1, 0xFF5A5A5A);
    }

    planks(p, CHEST_X, CHEST_Y, 26, 24, 0xFF8E5E2C);
    rect(p, CHEST_X, CHEST_Y, 2, 24, 0xFF6A4420); rect(p, CHEST_X + 24, CHEST_Y, 2, 24, 0xFF6A4420);
    rect(p, CHEST_X, CHEST_Y + 8, 26, 1, 0xFF3A2614);
    rect(p, CHEST_X + 11, CHEST_Y + 6, 4, 5, 0xFF5A5A5A);
    rect(p, CHEST_X + 12, CHEST_Y + 7, 2, 3, 0xFFB8B8B8);
    outline(p, CHEST_X, CHEST_Y, 26, 24);
  };

  P.shadeAO = function () {
    var ao = this.ao;
    function drop(x, y, bx, by, bw, bh) { return x >= bx + 2 && x < bx + bw + 2 && y >= by + 2 && y < by + bh + 2 && (x >= bx + bw || y >= by + bh); }
    for (var y = 0; y < H; y++)
      for (var x = 0; x < W; x++) {
        var o = 1;
        if (y >= 8 && y < 22) o *= 0.62 + 0.38 * (y - 8) / 14;
        if (y >= 128 && y < FLOOR) o *= 1 - 0.28 * (y - 128) / 20;
        if (y >= FLOOR) o *= 0.8 + 0.2 * (y - FLOOR) / 32;
        if (x >= 10 && x < 20) o *= 0.7 + 0.3 * (x - 10) / 10;
        if (x >= W - 20 && x < W - 10) o *= 0.7 + 0.3 * (W - 10 - x) / 10;
        var onFloor = y >= FLOOR && y < FLOOR + 5;
        if (onFloor && (x >= 15 && x < 53 || x >= 54 && x < 106 || x >= CHEST_X - 2 && x < CHEST_X + 28 || x >= FX - 2 && x < 305)) o *= 0.55 + 0.09 * (y - FLOOR);
        if (y >= 124 && y < 128) o *= 0.85;
        if (y >= 116 && y < FLOOR && (x >= 50 && x < 55 || x >= 265 && x < 270)) o *= 0.8;
        if (drop(x, y, FRAME_X, FRAME_Y, FRAME_W, FRAME_W) || drop(x, y, PAINT_X, PAINT_Y, PAINT_W, PAINT_H)) o *= 0.6;
        if (y >= WY + WH + 6 && y < WY + WH + 11 && x >= WX - 6 && x < WX + WW + 6) o *= 0.8;
        ao[y * W + x] = o;
      }
  };

  P.paintHills = function () {
    var cvp = new Array(WW * WH), x, y;
    for (var i = 0; i < WW * WH; i++) cvp[i] = 0;
    for (x = 0; x < WW; x++) {
      var top = this.ground[(x / 4) | 0];
      for (y = top; y < WH; y++) cvp[y * WW + x] = C.shade(y - top < 2 ? 0xFF5E9E3A : 0xFF7A5634, rint(13) - 6);
    }
    var trees = [18, 82];
    for (var ti = 0; ti < 2; ti++) {
      var tx = trees[ti], foot = this.ground[(tx / 4) | 0];
      for (y = foot - 9; y < foot; y++) { cvp[y * WW + tx] = 0xFF5B4128; cvp[y * WW + tx + 1] = 0xFF4A3420; }
      for (y = foot - 17; y < foot - 7; y++) for (x = tx - 4; x < tx + 6; x++) if (rint(7) !== 0) cvp[y * WW + x] = C.shade(0xFF3E7A2E, rint(17) - 8);
    }
    var cv = document.createElement('canvas'); cv.width = WW; cv.height = WH;
    var ictx = cv.getContext('2d'), img = ictx.createImageData(WW, WH), dd = img.data;
    for (i = 0; i < WW * WH; i++) { var c = cvp[i], j = i * 4; dd[j] = C.R(c); dd[j + 1] = C.G(c); dd[j + 2] = C.B(c); dd[j + 3] = C.A(c); }
    ictx.putImageData(img, 0, 0);
    return cv;
  };

  // Light every pixel: albedo x (sky ambient x AO + window spill + sun patch + torches + furnace). Cached by `key`.
  P.paintStill = function (day, dusk, sunK, patchX) {
    var night = 1 - day;
    var ar = C.lerp(0.16, 1.0, day) + 0.25 * dusk, ag = C.lerp(0.19, 0.97, day) + 0.08 * dusk, ab = C.lerp(0.34, 0.92, day) - 0.06 * dusk;
    var torch = 0.12 + 1.1 * night;
    var spill = 0.35 * day, wcx = WX + WW / 2, wcy = WY + WH / 2;
    var p = this.albedo, ao = this.ao, data = this.stillImg.data;
    for (var y = 0; y < H; y++)
      for (var x = 0; x < W; x++) {
        var i = y * W + x, c = p[i], j = i * 4;
        if (c === 0) { data[j] = data[j + 1] = data[j + 2] = data[j + 3] = 0; continue; }
        var o = ao[i], r = ar * o, gg = ag * o, b = ab * o, dx, dy, f;
        for (var t = 0; t < 2; t++) {
          dx = x - TORCH_X[t] - 1; dy = y - TORCH_Y - 1; f = torch / (1 + (dx * dx + dy * dy) / 400);
          r += f; gg += f * 0.62; b += f * 0.3;
        }
        dx = x - FX - 16; dy = y - FY - 22; f = torch * 0.8 / (1 + (dx * dx + dy * dy) / 500);
        r += f; gg += f * 0.5; b += f * 0.2;
        dx = x - wcx; dy = y - wcy; f = spill / (1 + (dx * dx + dy * dy) / 2500);
        r += f; gg += f; b += f * 1.05;
        if (y >= FLOOR && sunK > 0) {
          var edge = 1 - Math.abs(x - patchX) / (WW * 0.6);
          if (edge > 0) { f = sunK * Math.min(1, edge * 3) * 0.9 * (1 - (y - FLOOR) / 48); r += f; gg += f * 0.9; b += f * 0.7; }
        }
        data[j] = C.clampByte((C.R(c) * r) | 0); data[j + 1] = C.clampByte((C.G(c) * gg) | 0); data[j + 2] = C.clampByte((C.B(c) * b) | 0); data[j + 3] = 255;
      }
    this.stillCtx.putImageData(this.stillImg, 0, 0);
  };

  // draw one sprite canvas at art-position (ax,ay), scale k, optionally flipped and dimmed to `bright`.
  P.sprite = function (ctx, cv, ax, ay, k, flip, bright) {
    var src = cv, w = cv.width, h = cv.height;
    if (bright < 0.996) {
      var sc = this.scratchCtx;
      sc.clearRect(0, 0, w, h); sc.drawImage(cv, 0, 0);
      sc.globalCompositeOperation = 'source-atop'; sc.fillStyle = 'rgba(0,0,0,' + (1 - bright) + ')'; sc.fillRect(0, 0, w, h);
      sc.globalCompositeOperation = 'source-over';
      src = this.scratch;
    }
    var dw = w * k, dh = h * k, dx = ax * k, dy = ay * k;
    if (flip) { ctx.save(); ctx.translate(dx + dw, dy); ctx.scale(-1, 1); ctx.drawImage(src, 0, 0, w, h, 0, 0, dw, dh); ctx.restore(); }
    else ctx.drawImage(src, 0, 0, w, h, dx, dy, dw, dh);
  };

  P.drawSky = function (now, sun, day) {
    var ctx = this.skyCtx, dusk = Math.max(0, 1 - Math.abs(sun.alt) / 10);
    var top = C.mix(0xFF0A0F2A, 0xFF5F8FEF, day);
    var low = C.mix(C.mix(0xFF1A2550, 0xFF9CC2FF, day), 0xFFF0905A, dusk * 0.8);
    ctx.clearRect(0, 0, WW, WH);
    for (var y = 0; y < WH; y += 4) { ctx.fillStyle = C.css(C.mix(top, low, y / WH)); ctx.fillRect(0, y, WW, 4); }
    if (day < 0.6) {
      var a = (255 * (1 - day / 0.6)) | 0;
      for (var i = 0; i < this.stars.length; i++) {
        var st = this.stars[i], dim = ((now / 700 | 0) + i * 31) % 9 === 0;
        ctx.fillStyle = 'rgba(255,255,230,' + ((dim ? a / 3 : a) / 255) + ')';
        ctx.fillRect(st.x, st.y, 1, 1);
      }
    }
    this.body(ctx, sun.ha, sun.alt, 12, 0xFFFFD35A, 0xFFFFF2B0, false);
    this.body(ctx, sun.ha + 180, -sun.alt, 10, 0xFFB8BCC8, 0xFFE8EAF0, true);
    this.clouds(ctx, now, day);
    this.sprite(ctx, this.hills, 0, 0, 1, false, C.lerp(0.22, 1, day));
    var mobs = day >= 0.5 ? this.dayMobs : this.nightMobs, bright = C.lerp(0.45, 1, day);
    for (i = 0; i < mobs.length; i++) {
      var m = mobs[i], b = m.bitmap(now), foot = this.ground[Math.min(this.ground.length - 1, (((m.x | 0) + b.width / 2) / 4) | 0)];
      this.sprite(ctx, b, m.x, foot - b.height, 1, m.dir < 0, bright);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 0, WW, WH);
    ctx.fillStyle = 'rgba(255,255,255,0.19)';
    for (var pxs = 8; pxs < WW; pxs += WW / 2) for (i = 0; i < 7; i++) ctx.fillRect(pxs + i, 14 - i, 1, 1);
  };

  P.body = function (ctx, hourAngle, alt, size, rim, core, craters) {
    var ha = ((hourAngle % 360) + 540) % 360 - 180;
    if (alt < -8) return;
    var horizon = WH - 14;
    var x = Math.round(WW / 2 + (ha / 100) * (WW / 2 + 10) - size / 2);
    var y = Math.round(horizon - (Math.min(alt, 60) / 60) * (horizon - 4) - size / 2);
    ctx.fillStyle = C.css(rim); ctx.fillRect(x, y, size, size);
    ctx.fillStyle = C.css(core); ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
    if (craters) { ctx.fillStyle = C.css(rim); ctx.fillRect(x + 3, y + 4, 2, 2); ctx.fillRect(x + 6, y + 6, 1, 1); }
  };

  P.clouds = function (ctx, now, day) {
    ctx.fillStyle = C.css((C.mix(0xFF39405A, 0xFFF4F6FA, day) & 0x00FFFFFF | 0xE0000000) >>> 0);
    var span = WW + 60;
    for (var i = 0; i < 4; i++) {
      var x = -30 + ((now / 1000 * (2 + i % 2) / 2 + i * 47) % span);
      var y = 6 + (i * 9) % 30, w = 18 + (i * 13) % 16;
      ctx.fillRect(x, y, w, 4); ctx.fillRect(x + 4, y - 3, w - 6, 3);
    }
  };

  // --- creatures ---
  P.stepDog = function (now, day) {
    var dog = this.dog;
    if (now < this.dogHeldUntil) { dog.frame ^= 1; return; }
    if (now >= this.teaseUntil) {
      if (rint(90) === 0) this.teaseUntil = now + 16000;
      dog.step(now, day < 0.3 ? 12 : 30);
      return;
    }
    dog.dir = -1; dog.frame ^= 1;
    if (dog.x > dog.min) { dog.x = Math.max(dog.min, dog.x - dog.speed * 2); dog.restUntil = 0; }
    else dog.restUntil = this.teaseUntil;
  };

  P.stepPlayer = function (now, day) {
    var night = day < 0.5;
    if (this.task < 0) { this.task = night ? SLEEP : WANDER; this.px = this.goal = night ? BED_X : 150; this.there = true; }
    if (night && this.task !== SLEEP) { this.finishTask(now); this.task = SLEEP; this.goal = BED_X; this.there = false; }
    else if (!night && this.task === SLEEP) { this.task = WANDER; this.px = this.goal = BED_X + 10; this.there = true; this.doneAt = now + 3000; }
    this.pframe ^= 1;
    if (!this.there) {
      var d = this.goal - this.px;
      if (Math.abs(d) > WALK) { this.pdir = d > 0 ? 1 : -1; this.px += this.pdir * WALK; return; }
      this.px = this.goal; this.pdir = this.face; this.there = true;
      this.doneAt = now + (this.task === CRAFT || this.task === COOK ? 9000 : 6000 + rint(3000));
      return;
    }
    if (this.task === SLEEP || now < this.doneAt) return;
    this.finishTask(now);
    var next; do { next = 1 + rint(6); } while (next === this.task);
    this.startTask(next);
  };

  P.startTask = function (t) {
    this.task = t; this.there = false;
    if (t === CHEST) { this.goal = CHEST_X - 18; this.face = 1; }
    else if (t === CRAFT) { this.goal = 265; this.face = 1; }
    else if (t === COOK) { this.goal = 225; this.face = 1; }
    else if (t === PET_CAT) { this.goal = CAT_X; this.face = -1; }
    else if (t === PET_DOG) {
      this.teaseUntil = 0; this.dogHeldUntil = this.dog.restUntil = Number.MAX_VALUE;
      this.dog.dir = this.px < this.dog.x ? -1 : 1;
      this.goal = this.dog.dir < 0 ? this.dog.x - 12 : this.dog.x + 9.5; this.face = -this.dog.dir;
    } else { this.goal = 30 + rint(230); this.face = this.goal > this.px ? 1 : -1; }
  };
  P.finishTask = function (now) { if (this.task === PET_DOG) this.dogHeldUntil = this.dog.restUntil = now + 1500; };

  P.pattern = function (ctx, rows, x0, y0, k, sx) {
    for (var y = 0; y < rows.length; y++)
      for (var x = 0; x < rows[y].length; x++)
        if (rows[y].charAt(x) === '#') ctx.fillRect((x0 + x * k) * sx, (y0 + y * k) * sx, k * sx, k * sx);
  };

  P.frame = function (now) {
    var ctx = this.ctx, cw = this.cv.width, ch = this.cv.height, sx = cw / W;
    var sun = C.sun(this.lat, this.lon, now), day = C.light(sun.alt), night = 1 - day;
    var dusk = Math.max(0, 1 - Math.abs(sun.alt) / 10);
    var sunK = (sun.alt > 1 && Math.abs(sun.ha) < 95) ? day * Math.min(1, sun.alt / 12) : 0;
    var patchX = WX + WW / 2 - sun.ha / 90 * 80;

    var key = [Math.round(day * 32), Math.round(sunK * 8), Math.round(patchX / 4)].join(',');
    if (key !== this.stillKey) { this.stillKey = key; this.paintStill(day, dusk, sunK, patchX); }

    if (now - this.lastStep > 10 * STEP_MS) this.lastStep = now - STEP_MS;
    while (now - this.lastStep >= STEP_MS) {
      this.lastStep += STEP_MS;
      this.stepDog(now, day); this.stepPlayer(now, day);
      var ms = day >= 0.5 ? this.dayMobs : this.nightMobs;
      for (var mi = 0; mi < ms.length; mi++) ms[mi].step(now, 25);
    }
    var asleep = this.task === SLEEP && this.there, busy = this.there && now < this.doneAt;

    this.drawSky(now, sun, day);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(this.still, 0, 0, W, H, 0, 0, cw, ch);
    ctx.drawImage(this.sky, 0, 0, WW, WH, WX * sx, WY * sx, WW * sx, WH * sx);

    if (sunK > 0) this.drawRays(ctx, sx, patchX, sunK);
    if (this.task === CHEST && busy) this.sprite(ctx, this.chestOpen, CHEST_X, CHEST_Y - 8, sx, false, 1);

    var dogBright = C.lerp(0.5, 1, day), catH = this.cat[0].height;
    var teased = now < this.teaseUntil && this.dog.x <= this.dog.min;
    var kitty = teased ? this.cat[((now / 300 | 0) % 2) * 2] : this.cat[(now / 1500 | 0) % 2];
    this.sprite(ctx, kitty, CAT_X, 116 - catH, sx, false, dogBright);
    this.drawFire(ctx, sx);

    var dcv = this.dog.bitmap(now);
    ctx.fillStyle = 'rgba(0,0,0,0.31)';
    ctx.fillRect((this.dog.x + 2) * sx, (FLOOR - 1) * sx, (dcv.width - 3) * sx, 2 * sx);
    this.sprite(ctx, dcv, this.dog.x, FLOOR - dcv.height, sx, this.dog.dir < 0, dogBright);

    if (asleep) {
      this.sprite(ctx, this.sleeper[1], 71, 130, sx, false, dogBright);
      this.sprite(ctx, this.sleeper[0], 61, 124, sx, false, dogBright);
    } else {
      var fcv = this.there ? this.workFig[this.task][this.pframe] : this.walkFig[this.pframe];
      var bx = this.px + (this.pdir < 0 ? 15.5 : 10.5);
      ctx.fillStyle = 'rgba(0,0,0,0.31)'; ctx.fillRect((bx - 5) * sx, (FLOOR - 1) * sx, 10 * sx, 2 * sx);
      this.sprite(ctx, fcv, this.px, FLOOR - fcv.height, sx, this.pdir < 0, dogBright);
    }

    this.drawFlames(ctx, sx);
    this.sprite(ctx, this.gear, FRAME_X + FRAME_W / 2 - 8, FRAME_Y + FRAME_W / 2 - 8, sx, false, 1);

    ctx.globalCompositeOperation = 'lighter';
    this.glow(ctx, sx, TORCH_X[0] + 1, TORCH_Y + 1, (0.15 + 0.85 * night) * (170 + rint(60)));
    this.glow(ctx, sx, TORCH_X[1] + 1, TORCH_Y + 1, (0.15 + 0.85 * night) * (170 + rint(60)));
    this.glow(ctx, sx, FX + 16, FY + 22, (0.2 + 0.8 * night) * (150 + rint(80)));
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    this.drawVignette(ctx, cw, ch, (90 + 110 * night) / 255);

    if (asleep) this.drawZzz(ctx, now, sx);
    if (busy && this.task === PET_CAT) this.drawHeart(ctx, now, CAT_X + 7, 104, sx);
    if (busy && this.task === PET_DOG) this.drawHeart(ctx, now, this.dog.x + (this.dog.dir > 0 ? 18 : 6), 131, sx);

    this.drawClock(ctx, now, sx);
  };

  P.drawRays = function (ctx, sx, patchX, sunK) {
    var top = WY + WH + 3, half = WW * 0.55;
    var grad = ctx.createLinearGradient(0, top * sx, 0, H * sx);
    grad.addColorStop(0, 'rgba(255,230,170,' + (0.35 * sunK) + ')'); grad.addColorStop(1, 'rgba(255,230,170,0)');
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo((WX - 4) * sx, top * sx); ctx.lineTo((WX + WW + 4) * sx, top * sx);
    ctx.lineTo((patchX + half) * sx, H * sx); ctx.lineTo((patchX - half) * sx, H * sx);
    ctx.closePath(); ctx.fill(); ctx.restore();
  };
  P.drawFlames = function (ctx, sx) {
    for (var t = 0; t < 2; t++) {
      var tx = TORCH_X[t];
      for (var i = 0; i < 6; i++) {
        var x = tx + i % 2, y = TORCH_Y + ((i / 2) | 0);
        if (i < 2 && rint(4) === 0) continue;
        ctx.fillStyle = C.css(FLAME[Math.min(2, ((i / 2) | 0) + rint(2))]);
        ctx.fillRect(Math.round(x * sx), Math.round(y * sx), Math.round(sx), Math.round(sx));
      }
    }
  };
  P.drawFire = function (ctx, sx) {
    var hot = this.task === COOK && this.there;
    for (var x = FX + 9; x < FX + 23; x++) {
      var h = 1 + rint(hot ? 8 : 4);
      for (var y = FY + 26 - h; y < FY + 26; y++) { ctx.fillStyle = C.css(FLAME[Math.min(2, ((FY + 26 - y) / 2 | 0) + rint(2))]); ctx.fillRect(x * sx, y * sx, sx, sx); }
    }
  };
  P.glow = function (ctx, sx, ax, ay, alpha) {
    var cx = ax * sx, cy = ay * sx, r = 24 * sx;
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, 'rgba(255,176,96,1)'); grad.addColorStop(1, 'rgba(255,176,96,0)');
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha / 255)); ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.fill();
  };
  P.drawVignette = function (ctx, cw, ch, alpha) {
    var r = Math.sqrt(cw * cw + ch * ch) * 0.55;
    var grad = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, r);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(0.6, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha)); ctx.fillStyle = grad; ctx.fillRect(0, 0, cw, ch); ctx.globalAlpha = 1;
  };
  P.drawZzz = function (ctx, now, sx) {
    for (var i = 0; i < 3; i++) {
      var t = (now + i * 1000) % 3000 / 3000;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * Math.sin(Math.PI * t)) + ')';
      this.pattern(ctx, ZED, 70 + 14 * t, 118 - 26 * t, 1 + t, sx);
    }
  };
  P.drawHeart = function (ctx, now, x, y, sx) {
    var t = now % 1200 / 1200;
    ctx.fillStyle = 'rgba(232,48,60,' + Math.sin(Math.PI * t) + ')';
    this.pattern(ctx, HEART, x - 1.5, y - 4 - 8 * t, 1, sx);
  };
  P.drawClock = function (ctx, now, sx) {
    var d = new Date(now);
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    var time = pad(d.getHours()) + ':' + pad(d.getMinutes());
    var cx = (PAINT_X + PAINT_W / 2) * sx;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.font = 'bold ' + Math.round(15 * sx) + 'px "Courier New",monospace';
    ctx.fillText(time, cx + sx, (PAINT_Y + 20) * sx + sx);
    ctx.fillStyle = '#f2ead6';
    ctx.fillText(time, cx, (PAINT_Y + 20) * sx);
    ctx.font = 'bold ' + Math.round(6 * sx) + 'px "Courier New",monospace';
    var date = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()] + ' ' + d.getDate();
    ctx.fillStyle = '#d8d0c0';
    ctx.fillText(date, cx, (PAINT_Y + 33) * sx);
  };

  g.Room = Room;
})(window);
