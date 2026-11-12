import React, { useCallback } from "react";

export interface ThemedSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  onStatusText?: string;
  offStatusText?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * Standard iOS/Material-style ThemedSwitch
 * - Track: 52px wide x 30px tall pill shape
 * - Knob: 24px solid circle, 3px padding, soft shadow, contrasting in light & dark mode
 * - OFF: Muted grey track, white knob on LEFT (translateX 0px)
 * - ON: Theme primary color track, white knob on RIGHT (translateX 22px) with optional checkmark
 * - Smooth 200ms slide animation (respects prefers-reduced-motion)
 * - Haptic feedback (navigator.vibrate)
 * - 44px minimum tap target, full-row tappable
 * - Accessible: role="switch", aria-checked, keyboard support
 */
export function ThemedSwitch({
  checked,
  onChange,
  id,
  label,
  description,
  onStatusText,
  offStatusText,
  disabled = false,
  className = "",
  ariaLabel,
}: ThemedSwitchProps) {
  const triggerHaptic = useCallback(() => {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(10);
      }
    } catch {
      // Haptics optional on unsupported hardware
    }
  }, []);

  const handleToggle = useCallback(
    (e?: React.MouseEvent | React.KeyboardEvent) => {
      if (e) {
        e.stopPropagation();
      }
      if (disabled) return;
      triggerHaptic();
      onChange(!checked);
    },
    [checked, disabled, onChange, triggerHaptic],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleToggle(e);
    }
  };

  const statusText = checked ? onStatusText : offStatusText;
  const computedAriaLabel =
    ariaLabel || (typeof label === "string" ? label : undefined) || "Toggle switch";

  // Standard iOS/Material Switch Element (52px x 30px track, 24px knob, 3px padding)
  const switchElement = (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={computedAriaLabel}
      disabled={disabled}
      className={`themed-switch-btn ${checked ? "is-on" : "is-off"} ${disabled ? "is-disabled" : ""}`}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
    >
      <span className={`themed-switch-track ${checked ? "track-on" : "track-off"}`}>
        <span className={`themed-switch-knob ${checked ? "knob-on" : "knob-off"}`}>
          {checked && (
            <svg
              className="themed-switch-check-icon"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="3.5 8.5 6.5 11.5 12.5 5" />
            </svg>
          )}
        </span>
      </span>
    </button>
  );

  // Standalone switch (without label or description)
  if (!label && !description) {
    if (statusText) {
      return (
        <div
          className={`themed-switch-standalone-wrap ${disabled ? "is-disabled" : ""} ${className}`}
          onClick={handleToggle}
          role="presentation"
        >
          {switchElement}
          <span className={`themed-switch-status ${checked ? "status-on" : "status-off"}`}>
            {statusText}
          </span>
        </div>
      );
    }
    return <div className={`themed-switch-standalone ${className}`}>{switchElement}</div>;
  }

  // Standard Settings Row Layout:
  // - Title & description on LEFT
  // - Switch vertically centered on RIGHT
  // - Status text as small line under description
  // - Whole row is tappable (44px min tap target)
  return (
    <div
      className={`themed-switch-row ${disabled ? "is-disabled" : ""} ${className}`}
      onClick={handleToggle}
      role="presentation"
    >
      <div className="themed-switch-text-group">
        {label && <strong className="themed-switch-label">{label}</strong>}
        {description && <p className="themed-switch-desc">{description}</p>}
        {statusText && (
          <span className={`themed-switch-status ${checked ? "status-on" : "status-off"}`}>
            {statusText}
          </span>
        )}
      </div>
      <div className="themed-switch-action" onClick={(e) => e.stopPropagation()}>
        {switchElement}
      </div>
    </div>
  );
}

export default ThemedSwitch;
