use std::path::{Path, PathBuf};
use tauri::ipc::Channel;
use walkdir::WalkDir;

use crate::types::ScanEvent;

const IMAGE_EXTENSIONS: &[&str] = &[
    "png", "jpg", "jpeg", "webp", "tiff", "tif",
];

fn is_image_file(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|ext| IMAGE_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
}

pub fn discover_images(folder: &str, on_progress: &Channel<ScanEvent>) -> Vec<PathBuf> {
    let mut images = Vec::new();

    for entry in WalkDir::new(folder)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.into_path();
        if path.is_file() && is_image_file(&path) {
            images.push(path);
            if images.len() % 100 == 0 {
                let _ = on_progress.send(ScanEvent::DiscoveryProgress {
                    found_count: images.len(),
                });
            }
        }
    }

    let _ = on_progress.send(ScanEvent::DiscoveryComplete {
        total_images: images.len(),
    });

    images
}
