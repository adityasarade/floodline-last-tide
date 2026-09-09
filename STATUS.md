# Status — AFTERGLOW — The City Answers

Last verified locally: 9 September 2026 (IST)

## Complete

- [x] Separate React + Vite project retained; `saltline-dispatch` and unrelated workspace work were not touched.
- [x] Replaced the prior score-first prototype with AFTERGLOW’s creative city-takeover experience.
- [x] Original fictional visual identity, copy, original base nightprint, and code-drawn responsive city scene.
- [x] React Image Editor is central: Crop, Filter, Draw, Text, Shapes, and Stickers all produce a save that drives the reveal.
- [x] Honest saved-pixel comparison, three-zone signal reading, revision path, interactive result view, full-print download, and browser-generated city-card download.
- [x] Automated tests for unchanged output and zone attribution; `npm test`, `npm run lint`, and `npm run build` pass.
- [x] Browser-tested desktop path: load editor → make a real freehand mark → save → scan → release to animated city result.
- [x] README, provenance, competition audit, and concise submission copy updated.

## Remaining before public submission

- [ ] Browser-check the current build at a narrow mobile viewport and capture final desktop/mobile media.
- [ ] Commit and publish the revised experience to a public GitHub repository under its final AFTERGLOW name.
- [ ] Deploy the revised build to a final public Vercel URL; run the full production flow.
- [ ] Recheck the live challenge FAQ/form immediately before submission, then submit the public source and production URL.

## Known risks

- React Image Editor loads its embed from Unlayer’s CDN, so editing needs network access.
- The pixel reading is deliberately a stylized visual-response model, not an assessment of artistic quality or a semantic detector.
- Player-added third-party imagery is optional; users are responsible for having rights to anything they add. The supplied default asset is documented in the provenance ledger.
