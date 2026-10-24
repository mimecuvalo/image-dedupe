<img src="src-tauri/icons/128x128@2x.png" alt="Image Dedupe icon" width="128" height="128" style="image-rendering: pixelated">

# Image Dedupe

A desktop app to find and remove duplicate images. Built with Tauri 2, React, and Rust.

Scans a folder for images, identifies duplicates using a two-phase approach (fast perceptual hashing followed by precise pixel comparison), and lets you review and delete them.

<img width="1312" height="912" alt="Screenshot 2026-04-04 at 21 55 40" src="https://github.com/user-attachments/assets/f41a1bbd-4ad3-4df9-8719-1961c596043b" />

## Features

- **Two-phase duplicate detection** — perceptual hash pre-filter (dHash) then MSSIM pixel comparison on candidates
- **Parallel processing** — Rayon thread pool for hashing and comparison across all CPU cores
- **Split-screen preview** — click any thumbnail to inspect the full-resolution image in a resizable side panel
- **Batch deletion** — mark duplicates for deletion, move to trash or permanently delete
- **"Keep best" quick action** — automatically keeps the highest-resolution image in each group
- Supports PNG, JPEG, WebP, and TIFF

## Prerequisites

- [Rust](https://rustup.rs/) (1.88+)
- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/)

## Development

```bash
# Install frontend dependencies
pnpm install

# Run in dev mode (hot-reloads frontend, rebuilds Rust on change)
pnpm tauri dev
```

## Building

```bash
pnpm tauri build
```

This produces:
- `src-tauri/target/release/bundle/macos/Image Dedupe.app`
- `src-tauri/target/release/bundle/dmg/Image Dedupe_<version>_aarch64.dmg`

## How it works

1. **Discovery** — recursively scans the selected folder for image files using `walkdir`
2. **Thumbnails** — generates 200px-wide JPEG thumbnails cached in `~/Library/Caches/com.nightlight.image-dedupe/thumbnails/`
3. **Phase 1: Hashing** — computes perceptual hashes (`image_hasher` crate, dHash 16x16) for all images in parallel, then clusters by hamming distance
4. **Phase 2: Comparison** — runs MSSIM structural similarity (`image-compare` crate) on candidate pairs, filters by threshold
5. **Review** — displays duplicate groups with thumbnails; click to preview full image, checkbox to mark for deletion

## Project structure

```
src/                    React frontend (TypeScript)
  components/           UI components (FolderPicker, ImageCard, PreviewPanel, etc.)
  hooks/                Custom hooks (useScan)
  types.ts              Shared TypeScript types

src-tauri/              Rust backend
  src/
    commands.rs         Tauri IPC commands (scan_for_duplicates, delete_images)
    scanner.rs          Recursive image file discovery
    hasher.rs           Perceptual hashing with Rayon parallelism
    grouping.rs         Union-Find clustering by hamming distance
    comparer.rs         MSSIM image comparison
    thumbnail.rs        Thumbnail generation and caching
    types.rs            Shared Rust types
```

## License

[MIT](LICENSE)
