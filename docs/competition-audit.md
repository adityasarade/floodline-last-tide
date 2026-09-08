# Competition compliance audit

This audit follows the challenge’s published [official FAQ](https://unlayer.notion.site/Build-With-Image-Editor-Challenge-FAQ-3cf0ceb4c8e180309d91cd730811ebd1?pvs=73) and [submission form](https://forms.gle/QxJSXeASJXJrW51y9). Recheck both immediately before submission because their requirements may change.

| Requirement | FLOODLINE evidence | Status before publication |
| --- | --- | --- |
| Original GTA VI-inspired experience | Original fictional coastal open-world emergency in Morrow Bay; no borrowed franchise material. | Ready |
| React Image Editor is core | `src/App.tsx` mounts `ImageEditor`; the only route to the simulation is saving an edit. | Ready |
| Visitors edit/customize a visual | Player modifies the original construction sheet using editor tools. | Ready |
| Saved edit visibly changes experience | `analyzeFlood` reads the saved export; `TideOverlay` animates the resulting barrier and flood field. | Ready |
| Public GitHub source | [Dedicated public repository](https://github.com/adityasarade/floodline-last-tide) includes source, docs, provenance, tests, and package config. | Ready |
| Working public deployment | [Production Vercel URL](https://floodline-last-tide.vercel.app) is deployed; a real three-stroke plan reached the public 100/100, 5/5-district result. | Ready; recheck immediately before form submission |
| Clear README | `README.md` explains premise, editor mechanics, technical model, assets, and run steps. | Ready; add final hosted screenshots/GIF before submission |
| Original/rightful assets | Original SVG source and an asset ledger; no restricted assets. | Ready |
| Separate form entry | `docs/submission-kit.md` contains form-ready copy. | Needs human submission |
| Repository support | Dependency is credited and visibly used. | Recheck the live FAQ for any newly prescribed action |

## Honest technical claims

- The game measures visible exported pixel differences; it does not understand user intent or layers.
- It ignores ordinary JPEG output noise so an unchanged source image is not accidentally treated as construction.
- The tide calculation is deterministic and stylized. It is not a real flood prediction, civil-defense tool, or engineering assessment.
- React Image Editor loads through Unlayer’s CDN; a connected browser is required for editor use. The app includes a recovery state if it cannot load.

## Pre-submission human checklist

1. Review the live FAQ, form, deadline, and eligibility wording.
2. Review the public repository’s first commit for accidental local files or credentials.
3. Exercise the full judge path on the deployed production URL in a clean browser.
4. Optionally recapture final desktop and mobile media from that deployed URL.
5. Use the form copy in `docs/submission-kit.md`, confirm the required declarations, and submit a separate entry.
