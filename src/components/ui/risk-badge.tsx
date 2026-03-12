import clsx from "clsx";

type RiskLevel = "stable" | "watch" | "at_risk" | "critical";
type BadgeSize = "sm" | "md";

type RiskBadgeProps = {
  level: RiskLevel;
  size?: BadgeSize;
  showLabel?: boolean;
};

const riskConfig: Record<RiskLevel, { label: string; classes: string }> = {
  stable: {
    label: "Stable",
    classes: "text-risk-stable bg-risk-stable/10",
  },
  watch: {
    label: "Watch",
    classes: "text-risk-watch bg-risk-watch/10",
  },
  at_risk: {
    label: "At Risk",
    classes: "text-risk-at-risk bg-risk-at-risk/10",
  },
  critical: {
    label: "Critical",
    classes: "text-risk-critical bg-risk-critical/10",
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-sm",
};

export function RiskBadge({
  level,
  size = "sm",
  showLabel = true,
}: RiskBadgeProps) {
  const config = riskConfig[level] ?? riskConfig.stable;

  if (!showLabel) {
    return (
      <span
        className={clsx("inline-block h-2.5 w-2.5 rounded-full", config.classes)}
        aria-label={config.label}
      />
    );
  }

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full font-medium",
        config.classes,
        sizeStyles[size],
      )}
    >
      {config.label}
    </span>
  );
}
