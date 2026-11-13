import React from "react";

export interface SettingsCardProps {
  sectionLabel?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingsCard({
  sectionLabel,
  description,
  children,
  className = "",
}: SettingsCardProps) {
  return (
    <section className={`node-settings-group ${className}`}>
      {sectionLabel && <h2 className="node-settings-section-label">{sectionLabel}</h2>}
      <div className="node-settings-card">{children}</div>
      {description && <p className="node-settings-group-desc">{description}</p>}
    </section>
  );
}

export default SettingsCard;
