import React from "react";

export interface SectionCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function SectionCard({
  title,
  subtitle,
  icon,
  action,
  children,
  className = "",
  onClick,
}: SectionCardProps) {
  return (
    <div
      className={`section-card ${onClick ? "is-clickable" : ""} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {(title || action || icon) && (
        <div className="section-card-header">
          <div className="section-card-title-group">
            {icon && <span className="section-card-icon" aria-hidden="true">{icon}</span>}
            <div>
              {title && <h3 className="section-card-title">{title}</h3>}
              {subtitle && <p className="section-card-subtitle">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="section-card-action">{action}</div>}
        </div>
      )}
      <div className="section-card-body">{children}</div>
    </div>
  );
}

export default SectionCard;
