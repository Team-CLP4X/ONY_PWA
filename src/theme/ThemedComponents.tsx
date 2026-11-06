import React from "react";
import { useTheme } from "./ThemeContext";

export interface ThemedTextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: "title" | "heading" | "subheading" | "body" | "bodySm" | "caption" | "micro" | "button";
  color?: "primary" | "secondary" | "muted" | "accent" | "danger" | "inherit";
  weight?: "normal" | "medium" | "semibold" | "bold" | "extrabold";
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div" | "label";
  children: React.ReactNode;
}

export const ThemedText: React.FC<ThemedTextProps> = ({
  variant = "body",
  color = "primary",
  weight,
  as: Component = "span",
  className = "",
  style,
  children,
  ...props
}) => {
  const { tokens } = useTheme();

  // Typography scale font sizes based on CSS variables
  const sizeMap: Record<string, string> = {
    title: "var(--font-title, 22px)",
    heading: "var(--font-heading, 18px)",
    subheading: "var(--font-subheading, 16px)",
    body: "var(--font-body, 14px)",
    bodySm: "var(--font-body-sm, 13px)",
    caption: "var(--font-caption, 12px)",
    micro: "var(--font-micro, 10px)",
    button: "var(--font-button, 14px)",
  };

  const defaultWeightMap: Record<string, number> = {
    title: 800,
    heading: 700,
    subheading: 600,
    body: 400,
    bodySm: 400,
    caption: 500,
    micro: 600,
    button: 700,
  };

  const colorMap: Record<string, string> = {
    primary: tokens.textPrimary,
    secondary: tokens.textSecondary,
    muted: tokens.textMuted,
    accent: tokens.accent,
    danger: tokens.error,
    inherit: "inherit",
  };

  const fontFamilies: Record<string, string> = {
    title: '"Nunito", sans-serif',
    heading: '"Nunito", sans-serif',
    subheading: '"Nunito", sans-serif',
    body: '"DM Sans", sans-serif',
    bodySm: '"DM Sans", sans-serif',
    caption: '"DM Sans", sans-serif',
    micro: '"DM Sans", sans-serif',
    button: '"DM Sans", sans-serif',
  };

  const weightVal = weight
    ? weight === "extrabold"
      ? 800
      : weight === "bold"
        ? 700
        : weight === "semibold"
          ? 600
          : weight === "medium"
            ? 500
            : 400
    : defaultWeightMap[variant] || 400;

  return React.createElement(
    Component,
    {
      className: `themed-text ${className}`.trim(),
      style: {
        fontSize: sizeMap[variant],
        color: colorMap[color],
        fontWeight: weightVal,
        fontFamily: fontFamilies[variant],
        lineHeight: variant === "title" || variant === "heading" ? 1.25 : 1.5,
        wordBreak: "break-word",
        ...style,
      },
      ...props,
    },
    children,
  );
};

export interface ThemedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: "base" | "elevated" | "soft";
  bordered?: boolean;
  padded?: boolean;
  children: React.ReactNode;
}

export const ThemedCard: React.FC<ThemedCardProps> = ({
  elevation = "base",
  bordered = true,
  padded = true,
  className = "",
  style,
  children,
  ...props
}) => {
  const { tokens } = useTheme();

  const bgMap: Record<string, string> = {
    base: tokens.surface,
    elevated: tokens.surfaceElevated,
    soft: tokens.surfaceSoft,
  };

  return (
    <div
      className={`themed-card ${className}`.trim()}
      style={{
        backgroundColor: bgMap[elevation],
        borderColor: bordered ? tokens.border : "transparent",
        borderWidth: bordered ? "1px" : "0",
        borderStyle: "solid",
        borderRadius: "20px",
        padding: padded ? "16px" : "0",
        color: tokens.textPrimary,
        transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export interface ThemedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const ThemedButton: React.FC<ThemedButtonProps> = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  style,
  disabled,
  children,
  ...props
}) => {
  const { tokens } = useTheme();

  const padMap = {
    sm: "7px 14px",
    md: "10px 18px",
    lg: "13px 22px",
  };

  const fontSizes = {
    sm: "var(--font-caption, 12px)",
    md: "var(--font-body, 14px)",
    lg: "var(--font-subheading, 16px)",
  };

  let bg = tokens.primary;
  let text = tokens.onPrimary;
  let border = "transparent";

  if (variant === "secondary") {
    bg = tokens.surfaceElevated;
    text = tokens.textPrimary;
    border = tokens.border;
  } else if (variant === "outline") {
    bg = "transparent";
    text = tokens.textPrimary;
    border = tokens.border;
  } else if (variant === "ghost") {
    bg = "transparent";
    text = tokens.textPrimary;
    border = "transparent";
  } else if (variant === "danger") {
    bg = tokens.error;
    text = "#ffffff";
    border = "transparent";
  }

  return (
    <button
      className={`themed-btn ${className}`.trim()}
      disabled={disabled}
      style={{
        backgroundColor: bg,
        color: text,
        borderColor: border,
        borderWidth: border !== "transparent" ? "1px" : "0",
        borderStyle: "solid",
        borderRadius: "14px",
        padding: padMap[size],
        fontSize: fontSizes[size],
        fontWeight: 700,
        width: fullWidth ? "100%" : "auto",
        minHeight: "44px", // Safe accessibility tap target
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.2s ease",
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
};
