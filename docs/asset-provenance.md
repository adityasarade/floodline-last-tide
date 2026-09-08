# Asset provenance — FLOODLINE — Last Tide

| Asset or dependency | Location / source | Rights and use | Notes |
| --- | --- | --- | --- |
| Morrow Bay construction sheet | `public/map/floodline-sheet.svg` | Original code-native SVG authored for this entry | Fictional map, labels, buildings, gates, districts, and decorative patterns. No third-party imagery. |
| Runtime construction sheet | `public/map/floodline-sheet.png` | Derived locally from the original SVG with macOS `sips` | Canonical 1600 × 1000 image fed to the editor and pixel model. |
| Product interface, tide overlay, map effects | `src/App.tsx`, `src/styles.css`, `src/sim.ts` | Original implementation for this entry | CSS, React markup, Canvas drawing, and deterministic algorithm. |
| Product copy and names | Source files and docs | Original fictional writing | Morrow Bay, Floodline, the district names, and all narrative language are invented. |
| React Image Editor | npm package `@unlayer/react-image-editor` | Installed dependency, MIT licensed | Used through its documented API; package/browser embed code is not copied into this repository. |
| React, React DOM, Vite, TypeScript, Vitest, ESLint | `package.json` | Open-source dependencies under their respective licenses | Standard development/runtime dependencies. |
| Archivo Black, DM Mono, Manrope | Google Fonts CSS import with system fallbacks | Served by Google Fonts under their published font licenses | Optional enhancement only; no font binary is committed. |

## Explicit exclusions

This project does **not** contain Rockstar Games, Take-Two, GTA VI, Vice City, Grand Theft Auto, leaked material, trademark logos, screenshots, characters, vehicles, maps, audio, copied competitor assets, stock photos, or generated-image assets. It uses no user uploads and no external asset API.

The challenge’s GTA VI-inspired framing is met through an original fictional coastal open-world setting and player fantasy, not borrowed IP or a trailer recreation.
