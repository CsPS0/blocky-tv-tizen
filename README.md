# Blocky Cabin — a Samsung TV (Tizen) home-screen app

A port of the CleanYourTV launcher's "blocky" cabin theme to a Samsung Tizen TV, as a normal installed
app. A pixel-art cabin whose window follows the real sun for your city: animals outside and a working
farmer by day, monsters and a sleeping farmer by night, torches and a furnace that glow after dark, a dog,
a cat, and a clock on the wall painting. Along the bottom is a dock of **your TV's own apps** that launches
them.

Built from the Android launcher's `BlockRoom`/`BlockSprites`/`Daylight`, rewritten in plain ES5 so the
2017 TV's older browser runs it. No build step, no frameworks.

## What it can and can't do

Tizen is not Android, so this is **not** the full launcher takeover from the set-top box:

- **It can't replace Samsung's home screen.** The remote's **Home** button still opens Samsung's own bar.
  The closest you get is **Autorun Last App** (below), so the TV switches *on* into the cabin.
- **No Settings button, no Inputs/Live TV row.** On Tizen 3 (this 2017 TV) an app that opens the TV's
  settings freezes the set, and switching inputs needs a Samsung partner licence. Use the remote's own
  Settings and Source buttons.
- **It changes nothing on the TV** and roots nothing. Delete it and the TV is exactly as before.

The dock **launches** your installed streaming apps; it does not update or install them. Getting the latest
Netflix/Max onto a 2017 panel is a separate problem (the app versions are tied to the old OS and DRM).

## Install (via Apps2Samsung, which you already use)

The TV must be in Developer Mode (Apps → `12345` → Developer mode on, Host PC IP = this computer, restart).

1. Open **Apps2Samsung**, pick your TV.
2. Choose the **install a custom `.wgt`** option and select **`BlockyCabin.wgt`** from this folder.
   Apps2Samsung signs it with your existing certificate and installs it — you don't touch the certificate.
3. On the TV, open **Blocky Cabin** from the Apps row.

To have the TV start into it: TV **Settings → General → (Smart Features) → Autorun Last App → On**, then
open Blocky Cabin once so it's the "last app". (Exact menu path varies by year.)

To remove it: delete it on the TV (Apps → Blocky Cabin → hold OK/options → Delete), or uninstall from
Apps2Samsung.

## Make it yours

- **Your city.** The sun follows `LAT`/`LON` at the top of [`js/app.js`](js/app.js) — default Budapest
  (47.50, 19.04). Change the two numbers (north +, east +) and rebuild.
- **Dock letters.** Netflix, Max/HBO and Disney+ show a big blocky letter instead of their wordmark icon
  (the `LETTERS` list in `app.js`); every other app shows its own icon. Edit `LETTERS`/`ORDER` to taste.

## Rebuild the .wgt

After editing anything, repackage (any zip tool works; `config.xml` must be at the archive root):

```bash
python - <<'PY'
import zipfile, os
root='.'; files=['config.xml','index.html','icon.png','css/style.css','js/core.js','js/sprites.js','js/room.js','js/app.js']
with zipfile.ZipFile('BlockyCabin.wgt','w',zipfile.ZIP_DEFLATED) as z:
    for f in files: z.write(f, f)
PY
```

## Preview on a computer

Serve the folder and open it in a browser (`python -m http.server 8777`, then `http://127.0.0.1:8777/`).
Add `?t=12` to shift the clock 12 hours to preview the night scene. The dock shows a sample app list off-TV;
on the TV it lists the real installed apps.
