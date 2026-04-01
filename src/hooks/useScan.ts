import { useState, useCallback } from "react";
import { invoke, Channel } from "@tauri-apps/api/core";
import type { DuplicateGroup, ScanEvent, ScanPhase } from "../types";

interface ScanProgress {
  processed: number;
  total: number;
}

interface ScanState {
  phase: ScanPhase;
  progress: ScanProgress;
  duplicateGroups: DuplicateGroup[];
  error: string | null;
}

export function useScan() {
  const [state, setState] = useState<ScanState>({
    phase: "idle",
    progress: { processed: 0, total: 0 },
    duplicateGroups: [],
    error: null,
  });

  const startScan = useCallback(
    async (
      folderPath: string,
      options?: {
        hashAlgorithm?: string;
        hammingThreshold?: number;
        similarityThreshold?: number;
      }
    ) => {
      setState((s) => ({
        ...s,
        phase: "discovering",
        progress: { processed: 0, total: 0 },
        duplicateGroups: [],
        error: null,
      }));

      const channel = new Channel<ScanEvent>();

      channel.onmessage = (msg: ScanEvent) => {
        switch (msg.event) {
          case "discoveryProgress":
            setState((s) => ({
              ...s,
              phase: "discovering",
              progress: { processed: msg.data.foundCount, total: 0 },
            }));
            break;
          case "discoveryComplete":
            setState((s) => ({
              ...s,
              phase: "thumbnails",
              progress: { processed: 0, total: msg.data.totalImages },
            }));
            break;
          case "thumbnailProgress":
            setState((s) => ({
              ...s,
              phase: "thumbnails",
              progress: {
                processed: msg.data.processed,
                total: msg.data.total,
              },
            }));
            break;
          case "hashingProgress":
            setState((s) => ({
              ...s,
              phase: "hashing",
              progress: {
                processed: msg.data.processed,
                total: msg.data.total,
              },
            }));
            break;
          case "hashingComplete":
            setState((s) => ({
              ...s,
              phase: "comparing",
              progress: { processed: 0, total: 0 },
            }));
            break;
          case "compareProgress":
            setState((s) => ({
              ...s,
              progress: {
                processed: msg.data.processed,
                total: msg.data.total,
              },
            }));
            break;
          case "compareComplete":
            break;
          case "error":
            setState((s) => ({
              ...s,
              phase: "error",
              error: msg.data.message,
            }));
            break;
        }
      };

      try {
        const groups = await invoke<DuplicateGroup[]>("scan_for_duplicates", {
          folderPath,
          hashAlgorithm: options?.hashAlgorithm ?? "dhash",
          hammingThreshold: options?.hammingThreshold ?? 10,
          similarityThreshold: options?.similarityThreshold ?? 0.92,
          onProgress: channel,
        });
        setState((s) => ({
          ...s,
          phase: "complete",
          duplicateGroups: groups,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          phase: "error",
          error: String(err),
        }));
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({
      phase: "idle",
      progress: { processed: 0, total: 0 },
      duplicateGroups: [],
      error: null,
    });
  }, []);

  return { ...state, startScan, reset };
}
