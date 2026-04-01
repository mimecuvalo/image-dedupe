use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use tauri::ipc::Channel;
use tauri::{AppHandle, Manager};

use crate::comparer;
use crate::grouping;
use crate::hasher;
use crate::scanner;
use crate::thumbnail;
use crate::types::{DuplicateGroup, ImageInfo, ScanEvent};

#[tauri::command]
pub async fn scan_for_duplicates(
    app: AppHandle,
    folder_path: String,
    hash_algorithm: String,
    hamming_threshold: u32,
    similarity_threshold: f64,
    on_progress: Channel<ScanEvent>,
) -> Result<Vec<DuplicateGroup>, String> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("thumbnails");

    tauri::async_runtime::spawn_blocking(move || {
        // Phase 0: Discover images
        let image_paths = scanner::discover_images(&folder_path, &on_progress);
        if image_paths.is_empty() {
            return Ok(Vec::new());
        }

        // Generate thumbnails
        let thumb_map: HashMap<PathBuf, PathBuf> =
            thumbnail::generate_thumbnails(&image_paths, &cache_dir, &on_progress)
                .into_iter()
                .collect();

        // Build ImageInfo list
        let images: Vec<ImageInfo> = image_paths
            .iter()
            .enumerate()
            .filter_map(|(_idx, path)| {
                let meta = fs::metadata(path).ok()?;
                let filename = path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                let thumb = thumb_map
                    .get(path)
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_default();

                // Get image dimensions (try to read just the header)
                let (width, height) = image::image_dimensions(path).unwrap_or((0, 0));

                Some(ImageInfo {
                    id: uuid::Uuid::new_v4().to_string(),
                    path: path.to_string_lossy().to_string(),
                    filename,
                    size_bytes: meta.len(),
                    width,
                    height,
                    thumbnail_path: thumb,
                })
            })
            .collect();

        // Phase 1: Perceptual hashing
        let algorithm = hasher::parse_algorithm(&hash_algorithm);
        let hashes = hasher::hash_all(&image_paths, algorithm, &on_progress);

        let candidate_groups = grouping::cluster_by_hamming(&hashes, hamming_threshold);
        let _ = on_progress.send(ScanEvent::HashingComplete {
            candidate_groups: candidate_groups.len(),
        });

        if candidate_groups.is_empty() {
            return Ok(Vec::new());
        }

        // Phase 2: Precise comparison
        let confirmed_pairs = comparer::compare_groups(
            &candidate_groups,
            &image_paths,
            similarity_threshold,
            &on_progress,
        );

        // Merge confirmed pairs into groups using union-find
        let mut parent: HashMap<usize, usize> = HashMap::new();

        fn find(parent: &mut HashMap<usize, usize>, i: usize) -> usize {
            let p = *parent.get(&i).unwrap_or(&i);
            if p == i {
                return i;
            }
            let root = find(parent, p);
            parent.insert(i, root);
            root
        }

        for &(a, b, _) in &confirmed_pairs {
            let ra = find(&mut parent, a);
            let rb = find(&mut parent, b);
            if ra != rb {
                parent.insert(ra, rb);
            }
        }

        // Collect into groups
        let mut group_map: HashMap<usize, Vec<usize>> = HashMap::new();
        let all_indices: Vec<usize> = confirmed_pairs
            .iter()
            .flat_map(|&(a, b, _)| vec![a, b])
            .collect();

        for idx in all_indices {
            let root = find(&mut parent, idx);
            group_map.entry(root).or_default().push(idx);
        }

        // Deduplicate indices within each group
        let duplicate_groups: Vec<DuplicateGroup> = group_map
            .into_values()
            .map(|mut indices| {
                indices.sort();
                indices.dedup();
                let group_images: Vec<ImageInfo> = indices
                    .iter()
                    .filter_map(|&i| images.get(i).cloned())
                    .collect();
                // Average similarity for the group
                let avg_score = confirmed_pairs
                    .iter()
                    .filter(|&&(a, b, _)| indices.contains(&a) && indices.contains(&b))
                    .map(|&(_, _, s)| s)
                    .sum::<f64>()
                    / confirmed_pairs
                        .iter()
                        .filter(|&&(a, b, _)| indices.contains(&a) && indices.contains(&b))
                        .count()
                        .max(1) as f64;

                DuplicateGroup {
                    group_id: uuid::Uuid::new_v4().to_string(),
                    images: group_images,
                    similarity_score: avg_score,
                }
            })
            .filter(|g| g.images.len() > 1)
            .collect();

        let _ = on_progress.send(ScanEvent::CompareComplete {
            duplicate_groups: duplicate_groups.len(),
        });

        Ok(duplicate_groups)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn delete_images(paths: Vec<String>, to_trash: bool) -> Result<usize, String> {
    let mut deleted = 0;
    for path_str in &paths {
        let path = PathBuf::from(path_str);
        let result = if to_trash {
            trash::delete(&path).map_err(|e| e.to_string())
        } else {
            fs::remove_file(&path).map_err(|e| e.to_string())
        };
        if result.is_ok() {
            deleted += 1;
        }
    }
    Ok(deleted)
}
