export interface ImageInfo {
  id: string;
  path: string;
  filename: string;
  sizeBytes: number;
  width: number;
  height: number;
  thumbnailPath: string;
}

export interface DuplicateGroup {
  groupId: string;
  images: ImageInfo[];
  similarityScore: number;
}

export type ScanEvent =
  | { event: "discoveryProgress"; data: { foundCount: number } }
  | { event: "discoveryComplete"; data: { totalImages: number } }
  | { event: "hashingProgress"; data: { processed: number; total: number } }
  | { event: "hashingComplete"; data: { candidateGroups: number } }
  | { event: "thumbnailProgress"; data: { processed: number; total: number } }
  | { event: "compareProgress"; data: { processed: number; total: number } }
  | { event: "compareComplete"; data: { duplicateGroups: number } }
  | { event: "error"; data: { message: string } };

export type ScanPhase =
  | "idle"
  | "discovering"
  | "thumbnails"
  | "hashing"
  | "comparing"
  | "complete"
  | "error";
