import type { AppLanguage } from "../../i18n/translations";

export interface CaughtUpCardProps {
  onCreatePost: () => void;
  onBackToTop: () => void;
  language: AppLanguage;
  variant?: "feed" | "list";
}

export function CaughtUpCard({
  onCreatePost,
  onBackToTop,
  language,
  variant = "feed",
}: CaughtUpCardProps) {
  const heading =
    language === "Bahasa Melayu"
      ? "Anda sudah mengikuti semuanya 🌿"
      : language === "中文"
        ? "已经看完所有动态啦 🌿"
        : "You're all caught up 🌿";

  const subtitle =
    language === "Bahasa Melayu"
      ? "Terima kasih kerana meluangkan masa dengan penuh kasih bersama komuniti."
      : language === "中文"
        ? "谢谢你温柔地停留在这里，与大家互相陪伴。"
        : "Thank you for holding space with the community today.";

  const writeLabel =
    language === "Bahasa Melayu"
      ? "Tulis sesuatu yang baik"
      : language === "中文"
        ? "写下一份温暖分享"
        : "Write something kind";

  const backTopLabel =
    language === "Bahasa Melayu"
      ? "Kembali ke atas"
      : language === "中文"
        ? "回到顶部"
        : "Back to top";

  return (
    <section
      className={`caught-up-card ${variant === "list" ? "is-list" : "is-feed"}`}
      aria-label={heading}
    >
      <div className="caught-up-illustration" aria-hidden="true">
        <span>🌿</span>
      </div>
      <h3 className="caught-up-title">{heading}</h3>
      <p className="caught-up-subtitle">{subtitle}</p>
      <div className="caught-up-actions">
        <button
          type="button"
          className="caught-up-btn primary"
          onClick={onCreatePost}
        >
          {writeLabel}
        </button>
        <button
          type="button"
          className="caught-up-btn secondary"
          onClick={onBackToTop}
        >
          {backTopLabel}
        </button>
      </div>
    </section>
  );
}

export default CaughtUpCard;
