<!-- TITLE: TFC Anvil Calculator -->
<!-- KEYWORDS: minecraft -->
<!-- LANGUAGES: Javascript, HTML, CSS, Python -->
<!-- TECHNOLOGY: Bootstrap -->
<!-- STATUS: Semi-Active -->

# TFC Anvil Calculator

[About](#about) - [Usage](#usage) -  [License](#license)

## Status

**`Semi-Active`**

## About
<!-- DESCRIPTION START -->
This is yet another calculator for the Terrafirmacraft mod anvil mechanic.
<!-- DESCRIPTION END -->

### Why

I have been sick and playing modded Minecraft. Felt like making a calculator, made it in python, but then wanted to use it on my phone. Also I wanted to mess around with some HTML.

## Usage

The static site is hosted at [lehuman.github.io/TFCAnvil](https://lehuman.github.io/TFCAnvil/), use any modern browser to access it.

### Requirements

- [npm](https://www.npmjs.com/) >= ~10.x.x
- [py] (<https://www.python.org/>) >= 3.12.0
  - If just using py script

### Running

#### npm

If developing on windows, run the `watch.ps1` script to auto compile and update the website using `npx esbuild` and `npx live-server`.

```sh
.\watch.ps1
```

Otherwise, use the following to run a local instance.

```sh
npm update
npx esbuild script.js --bundle --outfile=main.js --minify --platform=node
npx live-server
# You can also use http-server instead of live-server
npx http-server
```

#### Python

Edit `tfc_anvil.py` to fit your needs and run in your terminal.

```sh
.\tfc_anvil.py
```

This is intentionally vague, as the py script is not the focus. However, it does sometimes seem to output less complex results.

## License

MIT
