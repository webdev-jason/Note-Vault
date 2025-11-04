# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- Ongoing tweaks and polish.

## [2025-11-04]
### Added
- Initial vanilla HTML/CSS/JS app scaffold with three-panel layout per `Notevault.md`.
- LocalStorage-backed notes model with multi-page support and unlimited images per page.
- JSON Export/Import for all notes.
- 1:1 cropper modal using canvas; keyboard, mouse, and corner-handle controls.
- Zoomed, centered crop view with accurate mapping from on-screen selection to saved crop.
- Image upload pipeline with compression-on-import (3000px then 1800px fallback) to avoid localStorage quota.
- Caption handling in viewer: independent, optional captions; no empty bars.

### Changed
- Editor image buttons set to `type="button"` and prevented default to stop form submissions closing the modal.
- Cropper layout updated to show full rectangular image (object-fit: contain); larger modal/stage.
- Crop box logic clamps to actual displayed image rect; click-to-center, arrow nudge, wheel resize.
- Viewer rendering switched from `figure/figcaption` to `.image-card` with `.image-frame` and optional `.caption`.
- Stored images now retain `originalDataUrl` for re-cropping from the original.

### Fixed
- Crop result mismatch with modal view by computing displayed-image rectangle and translating to natural pixels.
- Intermittent image upload hangs with robust error handling and file input reset.
- Blank caption bars appearing without captions (CSS and DOM rendering fixes).

---

Notes:
- Images stored in localStorage are compressed to balance fidelity and browser storage limits.
- Further improvements (e.g., IndexedDB storage) can be tracked in future entries.

