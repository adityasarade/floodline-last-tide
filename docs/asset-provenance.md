# Asset provenance — AFTERGLOW

| Asset or component | Location | Source | Notes |
| --- | --- | --- | --- |
| Base nightprint | `public/nightprint/afterglow-base.png` | Generated with OpenAI Image Generation for this project on 9 September 2026 | Original three-panel screen-print prompt. Explicit exclusions: text, logos, franchise characters, locations, GTA/Vice City references, and watermarks. Used as the editable starter artwork. |
| Coastal city reveal | `src/App.tsx` / `CityCanvas` | Original code-drawn Canvas illustration | Sky, buildings, water, lanterns, silhouettes, projection surfaces, and animation are rendered locally. The player’s saved image is drawn into its physical surfaces. |
| Interface, labels, and fiction | `src/`, `README.md`, and docs | Original writing and UI implementation | AFTERGLOW, The Last Light Festival, Sable Market, Tide House, and Quiet Quay are fictional original names. |
| User-edited export | Browser memory and user download | Created by each visitor in React Image Editor | The app does not upload or persist it. Visitors must have rights to anything they choose to add. |
| React Image Editor | npm dependency | `@unlayer/react-image-editor` | Used under its dependency license; its editor resources load from Unlayer’s delivery infrastructure. |
| Fonts | Google Fonts import with system fallback | Archivo Black, DM Mono, Manrope | Optional typography enhancement only. |

## Deliberate exclusions

No Rockstar Games, Take-Two, Grand Theft Auto, GTA VI, leaked, stock-photo, competitor, trademark, logo, character, map, vehicle, screenshot, music, or other protected game assets are bundled or referenced. The broad coastal-nightlife genre cue is transformed into an original public-art festival, not an imitation of any franchise setting.
