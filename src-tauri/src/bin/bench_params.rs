use std::path::PathBuf;
use std::time::Instant;

use image::DynamicImage;
use image_hasher::{HashAlg, HasherConfig};

const HASH_ALGORITHMS: &[(&str, HashAlg)] = &[
    ("mean (aHash)", HashAlg::Mean),
    ("gradient (dHash)", HashAlg::Gradient),
    ("double_gradient (pHash)", HashAlg::DoubleGradient),
    ("blockhash", HashAlg::Blockhash),
];

const HAMMING_THRESHOLDS: &[u32] = &[0, 2, 5, 8, 10, 15, 20, 30, 50];
const SIMILARITY_THRESHOLDS: &[f64] = &[0.70, 0.75, 0.80, 0.85, 0.88, 0.90, 0.92, 0.95, 0.98];

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 3 {
        eprintln!("Usage: bench_params <image_a> <image_b>");
        std::process::exit(1);
    }
    let path_a = PathBuf::from(&args[1]);
    let path_b = PathBuf::from(&args[2]);

    println!("Loading images...");
    let img_a = image::open(&path_a).expect("Failed to open image A");
    let img_b = image::open(&path_b).expect("Failed to open image B");
    println!(
        "  A: {} ({}x{})",
        path_a.display(),
        img_a.width(),
        img_a.height()
    );
    println!(
        "  B: {} ({}x{})",
        path_b.display(),
        img_b.width(),
        img_b.height()
    );

    // Phase 2: MSSIM comparison (algorithm-independent, run once)
    println!("\n{}", "=".repeat(80));
    println!("PHASE 2: MSSIM pixel comparison (independent of hash algorithm)");
    println!("{}", "=".repeat(80));

    let (mssim_score, mssim_elapsed) = bench_mssim(&img_a, &img_b);
    println!("  MSSIM score : {:.6}", mssim_score);
    println!("  Time        : {:.2}ms", mssim_elapsed.as_secs_f64() * 1000.0);

    println!(
        "\n  {:>6}  result",
        "thresh"
    );
    println!("  {:-<6}  {:-<10}", "", "");
    for &thresh in SIMILARITY_THRESHOLDS {
        let pass = mssim_score >= thresh;
        println!(
            "  {:>6.2}  {}",
            thresh,
            if pass { "DUPLICATE" } else { "different" }
        );
    }

    // Phase 1: Hashing + Hamming distance
    println!("\n{}", "=".repeat(80));
    println!("PHASE 1: Perceptual hashing & Hamming distance");
    println!("{}", "=".repeat(80));

    for &(name, alg) in HASH_ALGORITHMS {
        println!("\n--- {} ---", name);

        let start = Instant::now();
        let config = HasherConfig::new().hash_alg(alg).hash_size(16, 16);
        let hasher = config.to_hasher();
        let hash_a = hasher.hash_image(&img_a);
        let hash_b = hasher.hash_image(&img_b);
        let hash_elapsed = start.elapsed();

        let hamming_dist = hash_a.dist(&hash_b);

        println!("  Hash A      : {}", hash_a.to_base64());
        println!("  Hash B      : {}", hash_b.to_base64());
        println!("  Hamming dist: {} / 256 bits", hamming_dist);
        println!("  Hash time   : {:.2}ms", hash_elapsed.as_secs_f64() * 1000.0);

        println!(
            "\n  {:>6}  candidate?  -> then MSSIM at each similarity threshold",
            "ham_th"
        );
        println!("  {:-<6}  {:-<10}     {}", "", "", "-".repeat(50));
        for &ham_thresh in HAMMING_THRESHOLDS {
            let is_candidate = hamming_dist <= ham_thresh;
            let candidate_str = if is_candidate {
                "YES"
            } else {
                "no "
            };

            let sim_results: String = if is_candidate {
                SIMILARITY_THRESHOLDS
                    .iter()
                    .map(|&st| {
                        if mssim_score >= st {
                            format!("{:.0}✓", st * 100.0)
                        } else {
                            format!("{:.0}✗", st * 100.0)
                        }
                    })
                    .collect::<Vec<_>>()
                    .join(" ")
            } else {
                "skipped (not a candidate)".to_string()
            };

            println!(
                "  {:>6}  {}         {}",
                ham_thresh, candidate_str, sim_results
            );
        }
    }

    // Summary
    println!("\n{}", "=".repeat(80));
    println!("SUMMARY");
    println!("{}", "=".repeat(80));
    println!("  MSSIM score: {:.6} (computed in {:.2}ms)", mssim_score, mssim_elapsed.as_secs_f64() * 1000.0);
    println!();

    let best_sim = SIMILARITY_THRESHOLDS
        .iter()
        .filter(|&&t| mssim_score >= t)
        .last();

    if let Some(&best) = best_sim {
        println!(
            "  Highest similarity threshold that still detects the pair: {:.2}",
            best
        );
    } else {
        println!("  These images do NOT pass any tested similarity threshold.");
    }

    println!();
    for &(name, alg) in HASH_ALGORITHMS {
        let config = HasherConfig::new().hash_alg(alg).hash_size(16, 16);
        let hasher = config.to_hasher();
        let hash_a = hasher.hash_image(&img_a);
        let hash_b = hasher.hash_image(&img_b);
        let dist = hash_a.dist(&hash_b);

        let min_hamming = HAMMING_THRESHOLDS
            .iter()
            .find(|&&t| dist <= t);

        match min_hamming {
            Some(&t) => println!(
                "  {:<30} hamming_dist={:<3}  min hamming_threshold to catch it: {}",
                name, dist, t
            ),
            None => println!(
                "  {:<30} hamming_dist={:<3}  NOT caught by any tested threshold (max={})",
                name, dist, HAMMING_THRESHOLDS.last().unwrap()
            ),
        }
    }

    println!();
    println!("  Current defaults: hashAlgorithm=dhash, hammingThreshold=10, similarityThreshold=0.92");
    println!();
}

fn bench_mssim(img_a: &DynamicImage, img_b: &DynamicImage) -> (f64, std::time::Duration) {
    let w = img_a.width().min(img_b.width());
    let h = img_a.height().min(img_b.height());

    let resized_a = img_a.resize_exact(w, h, image::imageops::FilterType::Triangle);
    let resized_b = img_b.resize_exact(w, h, image::imageops::FilterType::Triangle);

    let gray_a = resized_a.to_luma8();
    let gray_b = resized_b.to_luma8();

    let start = Instant::now();
    let result = image_compare::gray_similarity_structure(
        &image_compare::Algorithm::MSSIMSimple,
        &gray_a,
        &gray_b,
    )
    .expect("MSSIM comparison failed");
    let elapsed = start.elapsed();

    (result.score, elapsed)
}
