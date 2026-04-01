use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};

use image::DynamicImage;
use rayon::prelude::*;
use tauri::ipc::Channel;

use crate::types::ScanEvent;

fn load_and_resize_pair(path_a: &PathBuf, path_b: &PathBuf) -> Option<(DynamicImage, DynamicImage)> {
    let img_a = image::open(path_a).ok()?;
    let img_b = image::open(path_b).ok()?;

    // Resize both to the same dimensions (use the smaller of the two)
    let w = img_a.width().min(img_b.width());
    let h = img_a.height().min(img_b.height());

    let img_a = img_a.resize_exact(w, h, image::imageops::FilterType::Triangle);
    let img_b = img_b.resize_exact(w, h, image::imageops::FilterType::Triangle);

    Some((img_a, img_b))
}

fn compare_pair(img_a: &DynamicImage, img_b: &DynamicImage) -> Option<f64> {
    let gray_a = img_a.to_luma8();
    let gray_b = img_b.to_luma8();

    let result = image_compare::gray_similarity_structure(
        &image_compare::Algorithm::MSSIMSimple,
        &gray_a,
        &gray_b,
    )
    .ok()?;

    Some(result.score)
}

/// Compare all pairs within each candidate group and return pairs that exceed the threshold.
/// Returns (index_a, index_b, similarity_score) for qualifying pairs.
pub fn compare_groups(
    groups: &[Vec<usize>],
    image_paths: &[PathBuf],
    similarity_threshold: f64,
    on_progress: &Channel<ScanEvent>,
) -> Vec<(usize, usize, f64)> {
    // Count total pairs for progress
    let total_pairs: usize = groups
        .iter()
        .map(|g| g.len() * (g.len() - 1) / 2)
        .sum();

    let counter = AtomicUsize::new(0);

    let results: Vec<(usize, usize, f64)> = groups
        .par_iter()
        .flat_map(|group| {
            let mut pairs = Vec::new();
            for i in 0..group.len() {
                for j in (i + 1)..group.len() {
                    let idx_a = group[i];
                    let idx_b = group[j];

                    let score = load_and_resize_pair(&image_paths[idx_a], &image_paths[idx_b])
                        .and_then(|(a, b)| compare_pair(&a, &b))
                        .unwrap_or(0.0);

                    let done = counter.fetch_add(1, Ordering::Relaxed) + 1;
                    if done % 10 == 0 || done == total_pairs {
                        let _ = on_progress.send(ScanEvent::CompareProgress {
                            processed: done,
                            total: total_pairs,
                        });
                    }

                    if score >= similarity_threshold {
                        pairs.push((idx_a, idx_b, score));
                    }
                }
            }
            pairs
        })
        .collect();

    results
}
