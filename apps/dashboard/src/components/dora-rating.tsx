import { Badge } from "@/components/ui/badge";
import type {
  DoraMetricRating,
  MetricsSummaryDoraRating,
  TeamHealthMetricsDoraRating,
  LeaderboardEntryDoraRating,
} from "@argus/api-client-react";

type Rating =
  | DoraMetricRating
  | MetricsSummaryDoraRating
  | TeamHealthMetricsDoraRating
  | LeaderboardEntryDoraRating
  | "elite"
  | "high"
  | "medium"
  | "low";

const RATING_CONFIG = {
  elite: { color: "bg-purple-500/10 text-purple-500 border-purple-500/20", label: "Elite" },
  high: { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", label: "High" },
  medium: { color: "bg-amber-500/10 text-amber-500 border-amber-500/20", label: "Medium" },
  low: { color: "bg-red-500/10 text-red-500 border-red-500/20", label: "Low" },
} as const;

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-sm",
  lg: "px-3 py-1 text-base font-medium uppercase tracking-wider",
} as const;

interface DoraRatingBadgeProps {
  rating?: Rating;
  size?: "sm" | "md" | "lg";
}

/**
 * Renders a coloured DORA rating badge (Elite / High / Medium / Low).
 * Returns null when no rating is provided.
 */
export function DoraRatingBadge({ rating, size = "md" }: DoraRatingBadgeProps) {
  if (!rating) return null;

  const c = RATING_CONFIG[rating as keyof typeof RATING_CONFIG] ?? RATING_CONFIG.medium;

  return (
    <Badge variant="outline" className={`${c.color} ${SIZE_CLASSES[size]}`}>
      {c.label}
    </Badge>
  );
}
