import React, { useState } from "react";
import {
  CompanionAvatar,
  type CompanionAnimal,
  type CompanionExpression,
  type CompanionSize,
} from "./CompanionAvatar";
import { useTheme } from "../theme/ThemeContext";

export interface CompanionPreviewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentCompanion: string;
  onSelectCompanion: (companion: CompanionAnimal) => void;
  language?: string;
}

const ALL_ANIMALS: {
  id: CompanionAnimal;
  nameEn: string;
  nameBm: string;
  nameZh: string;
  descriptionEn: string;
  descriptionBm: string;
  descriptionZh: string;
  personality: string;
  paletteInfo: string;
}[] = [
  {
    id: "Cat",
    nameEn: "ONY the Cat",
    nameBm: "ONY Si Kucing",
    nameZh: "ONY 暖心小猫",
    descriptionEn: "Cream & peach tabby with soft pink inner ears and a soothing gentle presence.",
    descriptionBm: "Kucing krim berbelang pic lembut dengan telinga merah jambu yang mendamaikan.",
    descriptionZh: "奶桃暖色虎斑小猫，粉嫩内耳与温柔疗愈的静心陪伴。",
    personality: "Gentle, attentive & cozy listener",
    paletteInfo: "Cream #FFF7F0 · Peach #FEECE0 · Tabby #E2AC8D",
  },
  {
    id: "Dog",
    nameEn: "ONY the Dog",
    nameBm: "ONY Si Anjing Comel",
    nameZh: "ONY 忠诚小狗",
    descriptionEn: "Warm caramel puppy with soft floppy ears, a cream muzzle, and a wagging tail.",
    descriptionBm: "Anak anjing karamel hangat dengan telinga labuh lembut dan ekor bergoyang riang.",
    descriptionZh: "暖焦糖色垂耳小狗，乳白小嘴与摇尾鼓励，永远守候身旁。",
    personality: "Loyal, encouraging & cheerful companion",
    paletteInfo: "Caramel #FFECCE · Amber #C78750 · Cream #FFFDF9",
  },
  {
    id: "Bunny",
    nameEn: "ONY the Bunny",
    nameBm: "ONY Si Arnab",
    nameZh: "ONY 棉花糖兔兔",
    descriptionEn: "Marshmallow white-pink plushie with tall perky ears and a tiny powder-puff tail.",
    descriptionBm: "Arnab putih merah jambu marshmallow dengan telinga panjang gebu dan ekor bebola.",
    descriptionZh: "棉花糖白粉色软萌兔，修长立耳与小绒球尾巴，细腻守护心情。",
    personality: "Soft, mindful, patient & calming",
    paletteInfo: "Marshmallow #FFFFFF · Blossom #FEE6ED · Rose #FDC4D1",
  },
  {
    id: "Bear",
    nameEn: "ONY the Bear",
    nameBm: "ONY Si Beruang",
    nameZh: "ONY 蜂蜜小熊",
    descriptionEn: "Honey brown teddy with round ears, vanilla muzzle, and a warm teddy hug aura.",
    descriptionBm: "Beruang madu hangat dengan telinga bulat comel dan pelukan emosi yang menenangkan.",
    descriptionZh: "蜂蜜棕暖心泰迪熊，圆圆小耳与香草小鼻，给您安心的大拥抱。",
    personality: "Grounded, protective, warm & comforting",
    paletteInfo: "Honey Brown #D49E69 · Vanilla #FFF3E5 · Biscuit #BC834C",
  },
  {
    id: "Fox",
    nameEn: "ONY the Fox",
    nameBm: "ONY Si Musang",
    nameZh: "ONY 灵动小狐狸",
    descriptionEn: "Soft cinnamon-orange fox with charcoal ear tips, fluffy white ruffs, and tail tip.",
    descriptionBm: "Musang kayu manis jingga lembut dengan hujung telinga arang dan ekor kembang putih.",
    descriptionZh: "柔暖肉桂橘色小狐狸，墨尖耳尖与蓬松白绒尾尖，聪明解忧。",
    personality: "Empathetic, intuitive, wise & uplifting",
    paletteInfo: "Cinnamon #FF935E · Charcoal Tip #322E30 · Fluff #FFF9F5",
  },
  {
    id: "Panda",
    nameEn: "ONY the Panda",
    nameBm: "ONY Si Panda",
    nameZh: "ONY 悠然小熊猫",
    descriptionEn: "Velvety milk white panda with soft charcoal slate patches (no harsh pure blacks).",
    descriptionBm: "Panda baldu putih susu dengan tompok kelabu arang lembut yang mendamaikan.",
    descriptionZh: "丝绒乳白小熊猫，柔和灰炭眼斑与圆润小耳，悠然自得无压力。",
    personality: "Peaceful, restorative, slow & grounded",
    paletteInfo: "Milk White #FFFFFF · Soft Slate #3D3C46 · Cloud #E8E9F0",
  },
];

const EXPRESSIONS: {
  id: CompanionExpression;
  labelEn: string;
  labelBm: string;
  labelZh: string;
  desc: string;
}[] = [
  { id: "idle", labelEn: "Idle / Rest", labelBm: "Rehat", labelZh: "日常静息", desc: "Gentle breathing, glossy eyes & occasional natural blink" },
  { id: "listening", labelEn: "Listening", labelBm: "Mendengar", labelZh: "倾听模式", desc: "Curious tilt, perked ears & focused attentive gaze" },
  { id: "speaking", labelEn: "Speaking", labelBm: "Bercakap", labelZh: "轻语互动", desc: "Gentle bounce, joyful expression & subtle speaking mouth" },
  { id: "happy", labelEn: "Happy", labelBm: "Gembira", labelZh: "开怀微笑", desc: "Beaming smile eyes, blushing cheeks & floating heart" },
  { id: "comforting", labelEn: "Comforting", labelBm: "Menenangkan", labelZh: "舒缓抚慰", desc: "Warm gentle smile, twinkle stars & soothing aura pulse" },
];

const SIZES: { id: CompanionSize; label: string; px: number }[] = [
  { id: "xs", label: "XS (28px) · Status / Dot", px: 28 },
  { id: "sm", label: "SM (40px) · Chat Header", px: 40 },
  { id: "md", label: "MD (52px) · Card / List", px: 52 },
  { id: "lg", label: "LG (84px) · Companion Picker", px: 84 },
  { id: "xl", label: "XL (140px) · Chat Welcome Hero", px: 140 },
];

export function CompanionPreviewSheet({
  isOpen,
  onClose,
  currentCompanion,
  onSelectCompanion,
  language = "English",
}: CompanionPreviewSheetProps) {
  const { isDark, tokens } = useTheme();
  const [activeMood, setActiveMood] = useState<CompanionExpression>("idle");
  const [selectedAnimalForDetail, setSelectedAnimalForDetail] = useState<CompanionAnimal>(
    (currentCompanion as CompanionAnimal) || "Cat"
  );
  const [previewMode, setPreviewMode] = useState<"current" | "forceLight" | "forceDark">("current");

  if (!isOpen) return null;

  const effectiveIsDark =
    previewMode === "forceLight" ? false : previewMode === "forceDark" ? true : isDark;

  const lang = language.toLowerCase();
  const isBm = lang.includes("melayu") || lang.includes("bm");
  const isZh = lang.includes("中文") || lang.includes("zh");

  return (
    <div
      className="ony-preview-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Companion Characters Showcase"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(10, 10, 15, 0.72)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto",
      }}
    >
      <div
        className="ony-preview-sheet-modal"
        onClick={(e) => e.stopPropagation()}
        data-theme-mode={effectiveIsDark ? "dark" : "light"}
        style={{
          width: "100%",
          maxWidth: "860px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "28px",
          background: effectiveIsDark ? "var(--theme-surface, #1e1919)" : "var(--theme-surface, #ffffff)",
          border: "1px solid var(--theme-border, rgba(0,0,0,0.1))",
          boxShadow: effectiveIsDark
            ? "0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)"
            : "0 24px 60px rgba(233,111,115,0.22), 0 0 0 1px rgba(0,0,0,0.05)",
          color: "var(--theme-text-primary, #2d2424)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <header
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--theme-border, rgba(0,0,0,0.08))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexShrink: 0,
            background: effectiveIsDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.6)",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--theme-primary, #F28C78)",
                marginBottom: "3px",
              }}
            >
              {isBm ? "Keluarga Maskot ONY" : isZh ? "ONY 吉祥物设计全景" : "Redesigned Mascot Family"}
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              {isBm
                ? "Pratonton 6 Rakan Comel ONY"
                : isZh
                ? "6位暖心萌友 · 治愈系立绘全鉴"
                : "Meet All 6 ONY Companions"}
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Mode override pills */}
            <div
              style={{
                display: "inline-flex",
                background: effectiveIsDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                padding: "3px",
                borderRadius: "100px",
                gap: "2px",
              }}
            >
              <button
                type="button"
                onClick={() => setPreviewMode("forceLight")}
                style={{
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "100px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: previewMode === "forceLight" ? "var(--theme-primary, #F28C78)" : "transparent",
                  color: previewMode === "forceLight" ? "#ffffff" : "inherit",
                }}
              >
                ☀️ Light
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("forceDark")}
                style={{
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "100px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: previewMode === "forceDark" ? "var(--theme-primary, #F28C78)" : "transparent",
                  color: previewMode === "forceDark" ? "#ffffff" : "inherit",
                }}
              >
                🌙 Dark
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("current")}
                style={{
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "100px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: previewMode === "current" ? "var(--theme-primary, #F28C78)" : "transparent",
                  color: previewMode === "current" ? "#ffffff" : "inherit",
                }}
              >
                ⚙️ System
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: "none",
                background: effectiveIsDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                color: "inherit",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                fontSize: "18px",
              }}
            >
              ✕
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "28px",
          }}
        >
          {/* SECTION 1: All 6 Animals Showcase Grid */}
          <section>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "14px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
                {isBm
                  ? "Pilih Rakan Anda (Ketik untuk pratonton/pilih)"
                  : isZh
                  ? "选择您的专属萌友 (点击查看表情并一键更换)"
                  : "Mascot Family (Tap to view details & switch)"}
              </h3>
              <span style={{ fontSize: "12px", opacity: 0.7 }}>
                Current: <strong>{currentCompanion}</strong>
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(124px, 1fr))",
                gap: "12px",
              }}
            >
              {ALL_ANIMALS.map((animal) => {
                const isCurrent = currentCompanion === animal.id;
                const isSelected = selectedAnimalForDetail === animal.id;

                return (
                  <button
                    key={animal.id}
                    type="button"
                    onClick={() => setSelectedAnimalForDetail(animal.id)}
                    style={{
                      position: "relative",
                      borderRadius: "20px",
                      padding: "16px 8px 12px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      cursor: "pointer",
                      border: isSelected
                        ? "2px solid var(--theme-primary, #F28C78)"
                        : "1px solid var(--theme-border, rgba(0,0,0,0.1))",
                      background: isSelected
                        ? effectiveIsDark
                          ? "rgba(242, 140, 120, 0.16)"
                          : "var(--theme-surface-elevated, #FFF0EC)"
                        : effectiveIsDark
                        ? "rgba(255,255,255,0.03)"
                        : "var(--theme-surface, #ffffff)",
                      transition: "all 0.2s ease",
                      outline: "none",
                    }}
                  >
                    {isCurrent && (
                      <span
                        style={{
                          position: "absolute",
                          top: "8px",
                          right: "8px",
                          background: "var(--theme-primary, #F28C78)",
                          color: "#ffffff",
                          fontSize: "10px",
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: "100px",
                        }}
                      >
                        ✓ Active
                      </span>
                    )}

                    <CompanionAvatar
                      animal={animal.id}
                      size="lg"
                      mood={isSelected ? activeMood : "idle"}
                      interactive
                    />

                    <div style={{ textAlign: "center" }}>
                      <strong style={{ fontSize: "13px", display: "block" }}>
                        {isBm ? animal.nameBm : isZh ? animal.nameZh : animal.nameEn}
                      </strong>
                      <span
                        style={{
                          fontSize: "11px",
                          opacity: 0.65,
                          display: "block",
                          marginTop: "2px",
                        }}
                      >
                        {animal.personality.split(",")[0]}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* SECTION 2: Expression & Tone Testing Stage */}
          <section
            style={{
              borderRadius: "24px",
              padding: "20px",
              background: effectiveIsDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              border: "1px solid var(--theme-border, rgba(0,0,0,0.08))",
              display: "grid",
              gridTemplateColumns: "1fr 1.3fr",
              gap: "24px",
              alignItems: "center",
            }}
          >
            {/* Mascot Live Interactive Stage */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "16px",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "180px",
                  height: "180px",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <CompanionAvatar
                  animal={selectedAnimalForDetail}
                  size="2xl"
                  mood={activeMood}
                  showGlow
                  interactive
                />
              </div>

              <div style={{ marginTop: "12px" }}>
                <strong style={{ fontSize: "16px", display: "block" }}>
                  {selectedAnimalForDetail} · {activeMood.toUpperCase()}
                </strong>
                <p
                  style={{
                    fontSize: "12px",
                    margin: "4px 0 12px",
                    opacity: 0.75,
                    maxWidth: "240px",
                  }}
                >
                  {EXPRESSIONS.find((e) => e.id === activeMood)?.desc}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    onSelectCompanion(selectedAnimalForDetail);
                    onClose();
                  }}
                  style={{
                    background: "var(--theme-primary, #F28C78)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "100px",
                    padding: "8px 20px",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(242,140,120,0.35)",
                  }}
                >
                  {isBm
                    ? `Gunakan ${selectedAnimalForDetail}`
                    : isZh
                    ? `设为当前伴侣 (${selectedAnimalForDetail})`
                    : `Set as Active Companion`}
                </button>
              </div>
            </div>

            {/* Expression Switcher & Details */}
            <div>
              <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}>
                {isBm
                  ? "Uji Reaksi Emosi & Ekspresi"
                  : isZh
                  ? "测试伴侣动态表情 (随对话情绪智能切换)"
                  : "Interactive Expressions & Moods"}
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {EXPRESSIONS.map((exp) => {
                  const isActive = activeMood === exp.id;
                  return (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => setActiveMood(exp.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: "14px",
                        border: isActive
                          ? "2px solid var(--theme-primary, #F28C78)"
                          : "1px solid var(--theme-border, rgba(0,0,0,0.08))",
                        background: isActive
                          ? effectiveIsDark
                            ? "rgba(242, 140, 120, 0.14)"
                            : "var(--theme-surface-elevated, #FFF0EC)"
                          : "transparent",
                        color: "inherit",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "13px", display: "block" }}>
                          {isBm ? exp.labelBm : isZh ? exp.labelZh : exp.labelEn}
                        </strong>
                        <small style={{ fontSize: "11px", opacity: 0.65 }}>
                          {exp.desc}
                        </small>
                      </div>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 800,
                          color: isActive ? "var(--theme-primary, #F28C78)" : "transparent",
                        }}
                      >
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SECTION 3: Responsive Scale Matrix */}
          <section>
            <h4 style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: 700 }}>
              {isBm
                ? "Skala Saiz Sejagat (28px hingga 140px)"
                : isZh
                ? "全场景尺寸适配矩阵 (28px - 140px 无损矢量)"
                : "Scalable Vector Size Matrix (28px to 140px)"}
            </h4>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-end",
                gap: "20px",
                padding: "18px 20px",
                borderRadius: "20px",
                background: effectiveIsDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                border: "1px solid var(--theme-border, rgba(0,0,0,0.06))",
              }}
            >
              {SIZES.map((sz) => (
                <div
                  key={sz.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <CompanionAvatar
                    animal={selectedAnimalForDetail}
                    size={sz.id}
                    mood={activeMood}
                    interactive
                  />
                  <span
                    style={{
                      fontSize: "10px",
                      opacity: 0.7,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {sz.label}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <footer
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--theme-border, rgba(0,0,0,0.08))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: effectiveIsDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.6)",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: "12px", opacity: 0.7 }}>
            ✨ Pure Scalable SVG · Zero clipping · Theme & dark mode aware
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 24px",
              borderRadius: "100px",
              border: "none",
              background: "var(--theme-primary, #F28C78)",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {isBm ? "Tutup Pratonton" : isZh ? "完成并返回" : "Done"}
          </button>
        </footer>
      </div>
    </div>
  );
}

export default CompanionPreviewSheet;
