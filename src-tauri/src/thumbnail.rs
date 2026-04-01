use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};

use image::imageops::FilterType;
use rayon::prelude::*;
use tauri::ipc::Channel;

use crate::types::ScanEvent;

const THUMB_WIDTH: u32 = 200;

fn thumb_filename(original_path: &Path) -> String {
    let hash = {
        let bytes = original_path.to_string_lossy();
        let mut h: u64 = 0xcbf29ce484222325;
        for b in bytes.as_bytes() {
            h ^= *b as u64;
            h = h.wrapping_mul(0x100000001b3);
        }
        h
    };
    format!("{:016x}.jpg", hash)
}

pub fn generate_thumbnails(
    image_paths: &[PathBuf],
    cache_dir: &Path,
    on_progress: &Channel<ScanEvent>,
) -> Vec<(PathBuf, PathBuf)> {
    std::fs::create_dir_all(cache_dir).ok();

    let total = image_paths.len();
    let counter = AtomicUsize::new(0);

    image_paths
        .par_iter()
        .filter_map(|original| {
            let thumb_name = thumb_filename(original);
            let thumb_path = cache_dir.join(&thumb_name);

            // Skip if thumbnail already exists
            if thumb_path.exists() {
                let done = counter.fetch_add(1, Ordering::Relaxed) + 1;
                if done % 50 == 0 || done == total {
                    let _ = on_progress.send(ScanEvent::ThumbnailProgress {
                        processed: done,
                        total,
                    });
                }
                return Some((original.clone(), thumb_path));
            }

            let img = image::open(original).ok()?;
            let thumb = img.resize(THUMB_WIDTH, u32::MAX, FilterType::Triangle);
            thumb.save(&thumb_path).ok()?;

            let done = counter.fetch_add(1, Ordering::Relaxed) + 1;
            if done % 50 == 0 || done == total {
                let _ = on_progress.send(ScanEvent::ThumbnailProgress {
                    processed: done,
                    total,
                });
            }

            Some((original.clone(), thumb_path))
        })
        .collect()
}
