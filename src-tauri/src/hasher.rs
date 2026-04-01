use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};

use image_hasher::{HashAlg, HasherConfig, ImageHash};
use rayon::prelude::*;
use tauri::ipc::Channel;

use crate::types::ScanEvent;

pub fn parse_algorithm(name: &str) -> HashAlg {
    match name.to_lowercase().as_str() {
        "ahash" | "mean" => HashAlg::Mean,
        "dhash" | "gradient" => HashAlg::Gradient,
        "phash" | "dct" => HashAlg::DoubleGradient,
        "blockhash" => HashAlg::Blockhash,
        _ => HashAlg::Gradient, // dHash is a good default
    }
}

pub fn hash_all(
    image_paths: &[PathBuf],
    algorithm: HashAlg,
    on_progress: &Channel<ScanEvent>,
) -> Vec<(usize, ImageHash)> {
    let total = image_paths.len();
    let counter = AtomicUsize::new(0);

    let config = HasherConfig::new()
        .hash_alg(algorithm)
        .hash_size(16, 16);

    image_paths
        .par_iter()
        .enumerate()
        .filter_map(|(idx, path)| {
            let hasher = config.to_hasher();
            let img = image::open(path).ok()?;
            let hash = hasher.hash_image(&img);

            let done = counter.fetch_add(1, Ordering::Relaxed) + 1;
            if done % 50 == 0 || done == total {
                let _ = on_progress.send(ScanEvent::HashingProgress {
                    processed: done,
                    total,
                });
            }

            Some((idx, hash))
        })
        .collect()
}
