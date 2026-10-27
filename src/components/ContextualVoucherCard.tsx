import React from "react";
import type { MarketplaceRecommendation } from "../services/contracts";

interface ContextualVoucherCardProps {
  voucher: MarketplaceRecommendation;
  onExplore: () => void;
  onDismiss: () => void;
  language?: string;
}

export function ContextualVoucherCard({
  voucher,
  onExplore,
  onDismiss,
  language = "English",
}: ContextualVoucherCardProps) {
  const dismissLabel =
    language === "Bahasa Melayu"
      ? "Tutup cadangan"
      : language === "中文"
        ? "暂不需要"
        : "Dismiss suggestion";

  const partnerLabel =
    language === "Bahasa Melayu"
      ? "Cadangan Rakan Tenang"
      : language === "中文"
        ? "温和伙伴推荐"
        : "Gentle Partner Suggestion";

  return (
    <div className="chat-voucher-card" role="region" aria-label="Marketplace suggestion">
      <div className="chat-voucher-header">
        <span className="chat-voucher-badge">
          <span className="leaf-dot" aria-hidden="true">🌱</span>
          <span>{partnerLabel}</span>
        </span>
        <button
          type="button"
          className="chat-voucher-dismiss"
          onClick={onDismiss}
          title={dismissLabel}
          aria-label={dismissLabel}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {voucher.contextReason && (
        <p className="chat-voucher-reason">{voucher.contextReason}</p>
      )}

      <div className="chat-voucher-body">
        {voucher.image && (
          <img
            src={voucher.image}
            alt={voucher.merchantName}
            className="chat-voucher-img"
            loading="lazy"
          />
        )}
        <div className="chat-voucher-info">
          <div className="chat-voucher-topline">
            <span className="chat-voucher-category">{voucher.category}</span>
            <span className="chat-voucher-value">{voucher.value}</span>
          </div>
          <strong className="chat-voucher-name">{voucher.merchantName}</strong>
          <span className="chat-voucher-offer">{voucher.offer}</span>
          <p className="chat-voucher-desc">{voucher.description}</p>
          <small className="chat-voucher-validity">{voucher.validity}</small>
        </div>
      </div>

      <div className="chat-voucher-actions">
        <button
          type="button"
          className="chat-voucher-btn-primary"
          onClick={onExplore}
        >
          <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          {voucher.actionLabel || "Explore vouchers"}
        </button>
        <button
          type="button"
          className="chat-voucher-btn-ghost"
          onClick={onDismiss}
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  );
}

export default ContextualVoucherCard;
