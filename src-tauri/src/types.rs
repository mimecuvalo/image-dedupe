use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageInfo {
    pub id: String,
    pub path: String,
    pub filename: String,
    pub size_bytes: u64,
    pub width: u32,
    pub height: u32,
    pub thumbnail_path: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateGroup {
    pub group_id: String,
    pub images: Vec<ImageInfo>,
    pub similarity_score: f64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
pub enum ScanEvent {
    DiscoveryProgress { found_count: usize },
    DiscoveryComplete { total_images: usize },
    HashingProgress { processed: usize, total: usize },
    HashingComplete { candidate_groups: usize },
    CompareProgress { processed: usize, total: usize },
    CompareComplete { duplicate_groups: usize },
    ThumbnailProgress { processed: usize, total: usize },
    Error { message: String },
}
