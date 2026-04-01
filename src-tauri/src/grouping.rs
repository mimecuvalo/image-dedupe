use image_hasher::ImageHash;

/// Groups image indices by perceptual hash similarity using Union-Find.
pub fn cluster_by_hamming(
    hashes: &[(usize, ImageHash)],
    threshold: u32,
) -> Vec<Vec<usize>> {
    let n = hashes.len();
    let mut parent: Vec<usize> = (0..n).collect();
    let mut rank: Vec<usize> = vec![0; n];

    // Find with path compression
    fn find(parent: &mut [usize], i: usize) -> usize {
        if parent[i] != i {
            parent[i] = find(parent, parent[i]);
        }
        parent[i]
    }

    // Union by rank
    fn union(parent: &mut [usize], rank: &mut [usize], a: usize, b: usize) {
        let ra = find(parent, a);
        let rb = find(parent, b);
        if ra == rb {
            return;
        }
        if rank[ra] < rank[rb] {
            parent[ra] = rb;
        } else if rank[ra] > rank[rb] {
            parent[rb] = ra;
        } else {
            parent[rb] = ra;
            rank[ra] += 1;
        }
    }

    // Pairwise comparison
    for i in 0..n {
        for j in (i + 1)..n {
            let dist = hashes[i].1.dist(&hashes[j].1);
            if dist <= threshold {
                union(&mut parent, &mut rank, i, j);
            }
        }
    }

    // Collect groups
    let mut groups: std::collections::HashMap<usize, Vec<usize>> =
        std::collections::HashMap::new();
    for i in 0..n {
        let root = find(&mut parent, i);
        groups
            .entry(root)
            .or_default()
            .push(hashes[i].0); // push the original image index
    }

    // Only return groups with 2+ images
    groups
        .into_values()
        .filter(|g| g.len() > 1)
        .collect()
}
