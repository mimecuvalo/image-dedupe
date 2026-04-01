import type { ScanPhase } from "../types";

interface ScanProgressProps {
  phase: ScanPhase;
  processed: number;
  total: number;
}

const phaseLabels: Record<ScanPhase, string> = {
  idle: "",
  discovering: "Discovering images",
  thumbnails: "Generating thumbnails",
  hashing: "Computing perceptual hashes",
  comparing: "Comparing candidates",
  complete: "Scan complete",
  error: "Error",
};

export function ScanProgress({ phase, processed, total }: ScanProgressProps) {
  if (phase === "idle" || phase === "complete") return null;

  const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
  const isIndeterminate = phase === "discovering" || total === 0;

  return (
    <div className="w-full max-w-md">
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>{phaseLabels[phase]}</span>
        {!isIndeterminate && (
          <span>
            {processed} / {total} ({percentage}%)
          </span>
        )}
        {phase === "discovering" && processed > 0 && (
          <span>{processed} found</span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        {isIndeterminate ? (
          <div className="bg-blue-600 h-2.5 rounded-full w-1/3 animate-pulse" />
        ) : (
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
    </div>
  );
}
