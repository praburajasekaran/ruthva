import clsx from "clsx";

type JourneyStatus = "active" | "completed" | "dropped";
type BadgeSize = "sm" | "md";

type StatusBadgeProps = {
  status: JourneyStatus;
  size?: BadgeSize;
};

const statusConfig: Record<JourneyStatus, { label: string; classes: string }> = {
  active: {
    label: "Active",
    classes: "text-brand-700 bg-brand-50",
  },
  completed: {
    label: "Completed",
    classes: "text-text-secondary bg-surface-sunken",
  },
  dropped: {
    label: "Dropped",
    classes: "text-danger bg-danger/10",
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-sm",
};

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.active;

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
