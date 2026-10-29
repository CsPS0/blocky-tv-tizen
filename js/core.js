// Colour helpers and the sun math, ported from the Android launcher's BlockRoom/Daylight.
// Plain ES5 so the 2017 Tizen 3.0 TV browser runs it. Colours are ARGB ints, 0xAARRGGBB; 0 is transparent.
(function (g) {
  'use strict';

  function A(c) { return (c >>> 24) & 255; }
  function R(c) { return (c >>> 16) & 255; }
  function G(c) { return (c >>> 8) & 255; }
  function B(c) { return c & 255; }
  function argb(a, r, gg, b) { return (((a & 255) << 24) | ((r & 255) << 16) | ((gg & 255) << 8) | (b & 255)) >>> 0; }
  function rgb(r, gg, b) { return argb(255, r, gg, b); }
  function clampByte(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }
  function shade(c, d) { return argb(A(c), clampByte(R(c) + d), clampByte(G(c) + d), clampByte(B(c) + d)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function gray(f) { var v = (f * 255) | 0; return rgb(v, v, v); }
  function mix(a, b, t) {
    return argb(
      (A(a) + (A(b) - A(a)) * t) | 0,
      (R(a) + (R(b) - R(a)) * t) | 0,
      (G(a) + (G(b) - G(a)) * t) | 0,
      (B(a) + (B(b) - B(a)) * t) | 0);
  }
  // CSS colour string from an ARGB int, for fillStyle.
  function css(c) { return 'rgba(' + R(c) + ',' + G(c) + ',' + B(c) + ',' + (A(c) / 255) + ')'; }

  // --- the sun, NOAA approximations (good to ~a degree). millis is UTC epoch ms. ---
  var RAD = Math.PI / 180, DEG = 180 / Math.PI;
  function floorMod(a, n) { return ((a % n) + n) % n; }

  // Returns {alt, ha}: altitude in degrees, hour angle in degrees (0 at solar noon, negative in the morning).
  function sun(lat, lon, millis) {
    var jc = (millis / 86400000 + 2440587.5 - 2451545.0) / 36525.0;
    var l0 = (280.46646 + jc * (36000.76983 + jc * 0.0003032)) % 360;
    var m = RAD * (357.52911 + jc * (35999.05029 - 0.0001537 * jc));
    var e = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);
    var center = Math.sin(m) * (1.914602 - jc * (0.004817 + 0.000014 * jc))
      + Math.sin(2 * m) * (0.019993 - 0.000101 * jc) + Math.sin(3 * m) * 0.000289;
    var omega = RAD * (125.04 - 1934.136 * jc);
    var lambda = RAD * (l0 + center - 0.00569 - 0.00478 * Math.sin(omega));
    var eps = RAD * (23 + (26 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60) / 60
      + 0.00256 * Math.cos(omega));
    var decl = Math.asin(Math.sin(eps) * Math.sin(lambda));
    var y = Math.pow(Math.tan(eps / 2), 2), l0r = RAD * l0;
    var eqMinutes = 4 * DEG * (y * Math.sin(2 * l0r) - 2 * e * Math.sin(m)
      + 4 * e * y * Math.sin(m) * Math.cos(2 * l0r) - 0.5 * y * y * Math.sin(4 * l0r) - 1.25 * e * e * Math.sin(2 * m));
    var utcMinutes = floorMod(millis, 86400000) / 60000;
    var hour = (utcMinutes + eqMinutes + 4 * lon) / 4 - 180;
    hour = floorMod(hour + 180, 360) - 180;
    var latR = RAD * lat, h = RAD * hour;
    var alt = Math.asin(Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(h));
    return { alt: DEG * alt, ha: hour };
  }

  // 0 at night (sun >=6 deg below the horizon), 1 by day (>=6 above), smoothstep between.
  function light(alt) {
    var t = Math.max(0, Math.min(1, (alt + 6) / 12));
    return t * t * (3 - 2 * t);
  }

  g.Core = {
    A: A, R: R, G: G, B: B, argb: argb, rgb: rgb, clampByte: clampByte,
    shade: shade, lerp: lerp, gray: gray, mix: mix, css: css,
    sun: sun, light: light
  };
})(window);
