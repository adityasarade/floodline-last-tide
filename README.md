# AFTERGLOW — The City Answers

> Make a mark. Watch the city catch it.

**AFTERGLOW** is an original, browser-native coastal print experience built for Unlayer’s React Image Editor challenge. A visitor makes a one-of-one “nightprint” in the editor, releases its actual saved export, then sees that artwork become a market canopy, a tide-house projection, and a ferry sail in a living fictional city.

The editor is the product’s creative engine, not a decorative stop. Without the user’s saved image, there is no city takeover or downloadable result.

## The experience

1. Start with an original three-panel screen print.
2. Draw, type, shape, sticker, filter, or crop in React Image Editor.
3. Save the image; the app reads broad visible pixel changes in its three vertical zones.
4. Release it into the city. The exact saved export is composited onto an illustrated market canopy, waterfront projection, and ferry sail. More changed surface in a zone gives its corresponding block more glow.
5. Download the full edited nightprint and a browser-generated city takeover card.

There is deliberately no claim of semantic understanding, AI image analysis, or real-world simulation. The effect is transparent: a pixel-difference scan measures broad visual change, while the saved image itself supplies the material visitors see in the city.

## Why it is a competition entry

- It begins with personal authorship, not a score screen: visitors make something they want to keep.
- The result is a city-scale payoff rather than a static mockup. One artwork appears as several different physical materials inside one animated scene.
- React Image Editor is necessary to make, revise, and save the artwork that powers the reveal.
- The visual world is original: fictional locations, original copy, a code-drawn city renderer, and an original base print.
- It is responsive, requires no account or API key, and runs entirely in the browser after the editor loads.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL Vite prints.

```bash
npm test
npm run lint
npm run build
```

## Project structure

```text
src/App.tsx              Experience flow, editor integration, and canvas city renderer
src/afterglow.ts         Transparent saved-pixel zone analysis
src/afterglow.test.ts    Tests for no-op and zone attribution behaviour
public/nightprint/       Original runtime base print
docs/                    Provenance, competition audit, and submission copy
```

## Asset and IP safety

The runtime base print is an original asset generated for this project with OpenAI Image Generation, using a prompt that explicitly excluded text, logos, franchise characters, locations, and GTA/Vice City references. The city renderer, UI, fiction, and all copy were authored in this repository. No Rockstar, Take-Two, GTA VI, leaked, stock, or competitor assets are used.

AFTERGLOW takes only a broad, non-protected genre cue from a contemporary coastal open-world fantasy: warm spectacle, water, nightlife, and a social city. It does not reproduce protected names, characters, storylines, maps, logos, vehicles, UI, music, or screenshots. See [asset provenance](docs/asset-provenance.md) and [competition audit](docs/competition-audit.md).

## License

MIT. The React Image Editor dependency remains subject to its own MIT license.
