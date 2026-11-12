import React from "react";

export type StatusPillVariant =
  | "visible"
  | "hidden"
  | "success"
  | "warning"
  | "neutral"
  | "info";

export interface StatusPillProps {
  label: string;
  variant?: StatusPillVariant;
  dot?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function StatusPill({
  label,
  variant = "neutral",
  dot = true,
  className = "",
  size = "md",
}: StatusPillProps) {
  return (
    <span className={`status-pill status-pill-${variant} status-pill-${size} ${className}`}>
      {dot && <span className="status-pill-dot" aria-hidden="true" />}
      <span className="status-pill-text">{label}</span>
    </span>
  );
}

export default StatusPill;
