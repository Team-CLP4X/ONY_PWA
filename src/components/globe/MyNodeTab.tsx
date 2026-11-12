import React, { useState, useMemo, useEffect } from "react";
import ThemedSwitch from "../common/ThemedSwitch";
import StatusPill from "../common/StatusPill";
import SectionCard from "../common/SectionCard";
import SupportiveMessageBubble from "../SupportiveMessageBubble";
import type { FirestoreCommunityMessage } from "../../firebase/firestore";

export interface MyNodeTabProps {
  discoverable: boolean;
  acceptMessages: boolean;
  onSetDiscoverable: (v: boolean) => void;
  onSetAcceptMessages: (v: boolean) => void;
  myMoodEmoji: string;
  myMoodLabel: string;
  myMoodGlow?: string;
  myRegion: { state: string; country: string };
  onLocateOnGlobe: () => void;
  messages: FirestoreCommunityMessage[];
  loadingMessages: boolean;
  onRefreshMessages: () => void;
  onDeleteMessage?: (id: string) => void;
  onReportMessage?: (id: string) => void;
  detectingLocation?: boolean;
  locationChoice?: "none" | "allowed" | "declined";
  onEnableLocation?: () => void;
  onClearLocation?: () => void;
  onSelectManualArea?: () => void;
  renderAreaPicker?: () => React.ReactNode;
  notify?: (msg: string) => void;
  language?: string;
}

function parseMessageTimestamp(createdAt: unknown): number {
  if (!createdAt) return Date.now();
  if (typeof createdAt === "number") return createdAt;
  if (createdAt instanceof Date) return createdAt.getTime();
  const obj = createdAt as { toMillis?: () => number; toDate?: () => Date; seconds?: number };
  if (typeof obj.toMillis === "function") return obj.toMillis();
  if (typeof obj.toDate === "function") return obj.toDate().getTime();
  if (typeof obj.seconds === "number") return obj.seconds * 1000;
  const parsed = Date.parse(String(createdAt));
  return isNaN(parsed) ? Date.now() : parsed;
}

export default function MyNodeTab({
  discoverable,
  acceptMessages,
  onSetDiscoverable,
  onSetAcceptMessages,
  myMoodEmoji,
  myMoodLabel,
  myMoodGlow = "soft",
  myRegion,
  onLocateOnGlobe,
  messages,
  loadingMessages,
  onRefreshMessages,
  onDeleteMessage,
  onReportMessage,
  detectingLocation = false,
  locationChoice = "none",
  onEnableLocation,
  onClearLocation,
  onSelectManualArea,
  renderAreaPicker,
  notify,
  language = "English",
}: MyNodeTabProps) {
  // Filter chips state
  const [filter, setFilter] = useState<"all" | "text" | "voice">("all");

  // Region editor open/close state
  const [isEditingRegion, setIsEditingRegion] = useState(false);

  // Privacy info expandable
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);

  // Auto-translate preference saved in localStorage
  const [autoTranslate, setAutoTranslate] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("ony_auto_translate_messages");
      return stored !== null ? stored === "true" : true;
    } catch {
      return true;
    }
  });

  const handleToggleAutoTranslate = (checked: boolean) => {
    setAutoTranslate(checked);
    try {
      localStorage.setItem("ony_auto_translate_messages", String(checked));
    } catch {}
    if (notify) {
      notify(
        checked
          ? language === "中文"
            ? "已开启自动翻译支持留言"
            : language === "Bahasa Melayu"
              ? "Auto-terjemah mesej sokongan diaktifkan"
              : "Auto-translate enabled for community messages"
          : language === "中文"
            ? "已关闭自动翻译，将显示原文"
            : language === "Bahasa Melayu"
              ? "Auto-terjemah dimatikan, teks asal dipaparkan"
              : "Auto-translate turned off; original text shown",
      );
    }
  };

  // Filter messages by kind
  const filteredMessages = useMemo(() => {
    if (filter === "all") return messages;
    if (filter === "text") return messages.filter((m) => !m.kind || m.kind === "text");
    if (filter === "voice") return messages.filter((m) => m.kind === "voice");
    return messages;
  }, [messages, filter]);

  // Counts for tabs
  const textCount = useMemo(
    () => messages.filter((m) => !m.kind || m.kind === "text").length,
    [messages],
  );
  const voiceCount = useMemo(
    () => messages.filter((m) => m.kind === "voice").length,
    [messages],
  );

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;

    const todayList: FirestoreCommunityMessage[] = [];
    const thisWeekList: FirestoreCommunityMessage[] = [];
    const olderList: FirestoreCommunityMessage[] = [];

    for (const msg of filteredMessages) {
      const ts = parseMessageTimestamp(msg.createdAt);
      if (ts >= startOfToday) {
        todayList.push(msg);
      } else if (ts >= sevenDaysAgo) {
        thisWeekList.push(msg);
      } else {
        olderList.push(msg);
      }
    }

    return {
      today: todayList,
      thisWeek: thisWeekList,
      older: olderList,
    };
  }, [filteredMessages]);

  const labels = {
    myLight:
      language === "Bahasa Melayu"
        ? "Cahaya Tanpa Nama Anda"
        : language === "中文"
          ? "您的匿名微光"
          : "Your anonymous light",
    visible:
      language === "Bahasa Melayu"
        ? "Kelihatan di Glob"
        : language === "中文"
          ? "星球可见"
          : "Visible on Globe",
    hidden:
      language === "Bahasa Melayu"
        ? "Tersembunyi"
        : language === "中文"
          ? "已隐藏"
          : "Hidden",
    moodGlow:
      language === "Bahasa Melayu"
        ? "Cahaya Emosi Semasa"
        : language === "中文"
          ? "当前心情微光"
          : "Mood glow",
    supportReceived:
      language === "Bahasa Melayu"
        ? "Sokongan Diterima"
        : language === "中文"
          ? "收到支持鼓励"
          : "Support received",
    locateOnGlobe:
      language === "Bahasa Melayu"
        ? "Cari di glob"
        : language === "中文"
          ? "在星球上定位"
          : "Locate on globe",
    messagesHeading:
      language === "Bahasa Melayu"
        ? "Sokongan Dihantar Kepada Anda"
        : language === "中文"
          ? "发送给您的温暖鼓励"
          : "Support sent to you",
    refresh:
      language === "Bahasa Melayu"
        ? "Segarkan"
        : language === "中文"
          ? "刷新"
          : "Refresh",
    refreshing:
      language === "Bahasa Melayu"
        ? "Menyegarkan…"
        : language === "中文"
          ? "刷新中…"
          : "Refreshing…",
    all:
      language === "Bahasa Melayu"
        ? "Semua"
        : language === "中文"
          ? "全部"
          : "All",
    textOnly:
      language === "Bahasa Melayu"
        ? "Teks"
        : language === "中文"
          ? "文字"
          : "Text",
    voiceOnly:
      language === "Bahasa Melayu"
        ? "Suara"
        : language === "中文"
          ? "语音"
          : "Voice",
    autoTranslateLabel:
      language === "Bahasa Melayu"
        ? "Auto-terjemah mesej ke bahasa saya"
        : language === "中文"
          ? "自动翻译留言到我的语言"
          : "Auto-translate messages to my language",
    autoTranslateDesc:
      language === "Bahasa Melayu"
        ? "Menterjemah mesej sokongan komuniti secara automatik."
        : language === "中文"
          ? "自动将社区鼓励翻译为当前界面语言。"
          : "Automatically renders community messages in your chosen language.",
    today:
      language === "Bahasa Melayu"
        ? "Hari ini"
        : language === "中文"
          ? "今天"
          : "Today",
    thisWeek:
      language === "Bahasa Melayu"
        ? "Awal minggu ini"
        : language === "中文"
          ? "本周早些时候"
          : "Earlier this week",
    older:
      language === "Bahasa Melayu"
        ? "Sebelum ini"
        : language === "中文"
          ? "更早的鼓励"
          : "Older",
    emptyTitle:
      language === "Bahasa Melayu"
        ? "Belum ada mesej sokongan"
        : language === "中文"
          ? "暂无支持留言"
          : "No support messages yet",
    emptyDesc:
      language === "Bahasa Melayu"
        ? "Apabila ahli komuniti menghantar kata-kata semangat atau bisikan audio kepada cahaya anda, ia akan muncul di sini."
        : language === "中文"
          ? "当社区伙伴向您的微光发送温柔鼓励或语音暖言时，它们会显示在这里。"
          : "When community members send warm whispers or words of kindness to your light, they will appear here.",
    visibilityHeading:
      language === "Bahasa Melayu"
        ? "Keterlihatan Glob & Mesej"
        : language === "中文"
          ? "星球可见性与留言设置"
          : "Globe & Message Visibility",
    visibilitySub:
      language === "Bahasa Melayu"
        ? "Kawal bagaimana kehadiran tanpa nama anda dipaparkan"
        : language === "中文"
          ? "掌控您的匿名微光展示与留言接收"
          : "Control how your anonymous presence appears to others",
    appearTitle:
      language === "Bahasa Melayu"
        ? "Tampil di atas glob"
        : language === "中文"
          ? "在社区星球上发光"
          : "Appear on the globe",
    appearDesc:
      language === "Bahasa Melayu"
        ? "Biarkan cahaya hangat anda kelihatan oleh komuniti di rantau anda."
        : language === "中文"
          ? "让您所在大区的社区伙伴看见您的温暖微光。"
          : "Let your warm light be seen by others in your broad region.",
    appearOnStatus:
      language === "Bahasa Melayu"
        ? "Aktif · kelihatan kepada orang lain"
        : language === "中文"
          ? "开启 · 对社区可见"
          : "On · visible to others",
    appearOffStatus:
      language === "Bahasa Melayu"
        ? "Mati · tersembunyi"
        : language === "中文"
          ? "关闭 · 已隐藏"
          : "Off · hidden",
    acceptTitle:
      language === "Bahasa Melayu"
        ? "Terima mesej sokongan"
        : language === "中文"
          ? "接收温暖支持留言"
          : "Accept supportive messages",
    acceptDesc:
      language === "Bahasa Melayu"
        ? "Terima kata-kata lembut dan bisikan audio daripada komuniti."
        : language === "中文"
          ? "接收来自社区伙伴的温暖文字与语音关怀。"
          : "Receive gentle words and audio whispers from community members.",
    acceptOnStatus:
      language === "Bahasa Melayu"
        ? "Aktif · sedia menerima sokongan"
        : language === "中文"
          ? "开启 · 正常接收支持"
          : "On · receiving messages",
    acceptOffStatus:
      language === "Bahasa Melayu"
        ? "Mati · mesej dijeda"
        : language === "中文"
          ? "关闭 · 已暂停接收"
          : "Off · messages paused",
    regionHeading:
      language === "Bahasa Melayu"
        ? "Kawasan Serantau Luas"
        : language === "中文"
          ? "大区地理范围"
          : "Broad Regional Discovery",
    regionSub:
      language === "Bahasa Melayu"
        ? "Hanya negeri atau rantau anda digunakan, bukan lokasi tepat (~25 km)"
        : language === "中文"
          ? "仅使用大区或省州范围，绝不使用精确定位（约 25 公里泛化）"
          : "Only your state or region is used, never your exact location (~25 km coarsened)",
    editArea:
      language === "Bahasa Melayu"
        ? "Tukar kawasan"
        : language === "中文"
          ? "更换区域"
          : "Change area",
    doneEditing:
      language === "Bahasa Melayu"
        ? "Selesai"
        : language === "中文"
          ? "完成"
          : "Done",
    useCurrentArea:
      language === "Bahasa Melayu"
        ? "Gunakan kawasan semasa saya"
        : language === "中文"
          ? "使用我当前大区"
          : "Use my current area",
    chooseAreaManual:
      language === "Bahasa Melayu"
        ? "Pilih kawasan secara manual"
        : language === "中文"
          ? "手动搜索选择区域"
          : "Choose area manually",
    detecting:
      language === "Bahasa Melayu"
        ? "Mengenal pasti rantau…"
        : language === "中文"
          ? "正在识别大区…"
          : "Detecting broad region…",
    privacyNoteShort:
      language === "Bahasa Melayu"
        ? "Lokasi digeneralisasikan ke peringkat wilayah (~25 km). Kurang daripada 5 orang digabungkan ke kluster induk."
        : language === "中文"
          ? "位置仅展示为省州大区范围（约 25 公里），少于 5 人的区域合并入上级星团以保护隐私。"
          : "Locations are coarsened to broad state regions (~25 km). Areas with fewer than 5 people merge into their parent cluster.",
    learnMore:
      language === "Bahasa Melayu"
        ? "Ketahui lebih lanjut"
        : language === "中文"
          ? "了解更多"
          : "Learn more",
    hideDetails:
      language === "Bahasa Melayu"
        ? "Tutup penerangan"
        : language === "中文"
          ? "收起说明"
          : "Hide details",
    privacyDetail:
      language === "Bahasa Melayu"
        ? "Untuk memastikan keselamatan dan kerahsiaan anda sepenuhnya, koordinat GPS tepat tidak pernah disimpan atau dihantar ke pelayan. Titik koordinat sentiasa digeneralisasikan ke pusat rantau luas (~25 km). Sekiranya kurang daripada 5 orang aktif dalam negeri anda, cahaya anda digabungkan secara automatik ke kluster kebangsaan. Anda boleh mematikan cahaya anda atau menjeda mesej pada bila-bila masa."
        : language === "中文"
          ? "为全面保护您的隐私与人身安全，精确的 GPS 坐标绝不会存储或上传至服务器，仅会在设备本地即时泛化为约 25 公里的大区中心。若您所在的省州活跃人数少于 5 人，系统会自动将您的微光合并至国家级星团以防止反向推测。您可以随时隐藏微光或暂停接收留言。"
          : "To protect your safety and complete anonymity, precise GPS coordinates are never stored or transmitted. They are coarsened locally into broad regional centers (~25 km). If fewer than 5 people are active in your state, your light automatically merges into the national cluster. You can turn off your light or pause messages at any time.",
  };

  return (
    <div className="my-node-tab-root">
      {/* 1. Header Card (Compact & Dignified, No 'Node #0') */}
      <section className="my-node-header-card" aria-label="Your anonymous node summary">
        <div className="my-node-header-top">
          <div className="my-node-beacon-avatar" aria-hidden="true">
            <span className="beacon-emoji">{myMoodEmoji || "🌱"}</span>
            <span className={`beacon-ring ${myMoodGlow}`} />
          </div>

          <div className="my-node-header-info">
            <div className="my-node-header-title-row">
              <h1 className="my-node-title">{labels.myLight}</h1>
              <StatusPill
                variant={discoverable ? "visible" : "hidden"}
                label={discoverable ? labels.visible : labels.hidden}
              />
            </div>
            <p className="my-node-region-caption">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{myRegion.state ? `${myRegion.state}, ${myRegion.country}` : myRegion.country || "Earth"}</span>
            </p>
          </div>
        </div>

        {/* 2 Stat Tiles */}
        <div className="my-node-stats-grid">
          <div className="my-node-stat-tile">
            <span className="stat-label">{labels.moodGlow}</span>
            <div className="stat-value">
              <i className={`mood-dot-mini ${myMoodGlow}`} aria-hidden="true" />
              <span>{myMoodLabel}</span>
            </div>
          </div>

          <div className="my-node-stat-tile">
            <span className="stat-label">{labels.supportReceived}</span>
            <div className="stat-value">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              <span>{messages.length}</span>
            </div>
          </div>
        </div>

        {/* Locate on Globe Button */}
        <button
          type="button"
          className="my-node-locate-btn"
          onClick={onLocateOnGlobe}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a14 14 0 0 0 0 18M12 3a14 14 0 0 1 0 18M3.6 9h16.8M3.6 15h16.8" />
          </svg>
          <span>{labels.locateOnGlobe}</span>
        </button>
      </section>

      {/* 2. Messages ("Support sent to you") - Main Content Placed Directly Below Header */}
      <section className="my-node-messages-section" aria-label={labels.messagesHeading}>
        <div className="my-node-messages-header">
          <div className="messages-heading-info">
            <h2 className="messages-title">{labels.messagesHeading}</h2>
            <span className="messages-count-badge">{messages.length}</span>
          </div>

          <button
            type="button"
            className="my-node-refresh-btn"
            onClick={onRefreshMessages}
            disabled={loadingMessages}
            aria-label={labels.refresh}
          >
            <svg
              className={loadingMessages ? "spin-icon" : ""}
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>{loadingMessages ? labels.refreshing : labels.refresh}</span>
          </button>
        </div>

        {/* Filter chips (All, Text, Voice) */}
        <div className="my-node-filters-row" role="tablist" aria-label="Filter messages">
          <button
            type="button"
            role="tab"
            aria-selected={filter === "all"}
            className={`my-node-filter-chip ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            <span>{labels.all}</span>
            <span className="filter-count">({messages.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={filter === "text"}
            className={`my-node-filter-chip ${filter === "text" ? "active" : ""}`}
            onClick={() => setFilter("text")}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>{labels.textOnly}</span>
            <span className="filter-count">({textCount})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={filter === "voice"}
            className={`my-node-filter-chip ${filter === "voice" ? "active" : ""}`}
            onClick={() => setFilter("voice")}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
            </svg>
            <span>{labels.voiceOnly}</span>
            <span className="filter-count">({voiceCount})</span>
          </button>
        </div>

        {/* Auto-translate row */}
        <div className="my-node-autotranslate-card">
          <div className="autotranslate-text">
            <span className="autotranslate-title">{labels.autoTranslateLabel}</span>
            <span className="autotranslate-desc">{labels.autoTranslateDesc}</span>
          </div>
          <ThemedSwitch
            checked={autoTranslate}
            onChange={handleToggleAutoTranslate}
            ariaLabel={labels.autoTranslateLabel}
          />
        </div>

        {/* Loading skeleton */}
        {loadingMessages && (
          <div className="my-node-skeleton-list" aria-busy="true">
            <div className="support-skeleton" />
            <div className="support-skeleton" />
            <div className="support-skeleton" />
          </div>
        )}

        {/* Empty state */}
        {!loadingMessages && filteredMessages.length === 0 && (
          <div className="my-node-empty-box">
            <div className="empty-icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h8M12 8v8" opacity="0.4" />
              </svg>
            </div>
            <h3 className="empty-title">{labels.emptyTitle}</h3>
            <p className="empty-desc">{labels.emptyDesc}</p>
          </div>
        )}

        {/* Date Grouped Messages List */}
        {!loadingMessages && filteredMessages.length > 0 && (
          <div className="my-node-message-groups">
            {groupedMessages.today.length > 0 && (
              <div className="message-group-block">
                <div className="message-date-header">
                  <span className="date-label">{labels.today}</span>
                  <span className="date-count">({groupedMessages.today.length})</span>
                </div>
                <div className="message-group-items">
                  {groupedMessages.today.map((msg) => (
                    <SupportiveMessageBubble
                      key={msg.id}
                      id={msg.id}
                      kind={msg.kind}
                      text={msg.text}
                      audioUrl={msg.audioUrl}
                      audioDuration={msg.audioDuration}
                      transcription={msg.transcription}
                      senderAnonymous={msg.senderAnonymous}
                      toYou={true}
                      autoTranslate={autoTranslate}
                      language={language}
                      onDelete={onDeleteMessage}
                      onReport={onReportMessage}
                      notify={notify}
                    />
                  ))}
                </div>
              </div>
            )}

            {groupedMessages.thisWeek.length > 0 && (
              <div className="message-group-block">
                <div className="message-date-header">
                  <span className="date-label">{labels.thisWeek}</span>
                  <span className="date-count">({groupedMessages.thisWeek.length})</span>
                </div>
                <div className="message-group-items">
                  {groupedMessages.thisWeek.map((msg) => (
                    <SupportiveMessageBubble
                      key={msg.id}
                      id={msg.id}
                      kind={msg.kind}
                      text={msg.text}
                      audioUrl={msg.audioUrl}
                      audioDuration={msg.audioDuration}
                      transcription={msg.transcription}
                      senderAnonymous={msg.senderAnonymous}
                      toYou={true}
                      autoTranslate={autoTranslate}
                      language={language}
                      onDelete={onDeleteMessage}
                      onReport={onReportMessage}
                      notify={notify}
                    />
                  ))}
                </div>
              </div>
            )}

            {groupedMessages.older.length > 0 && (
              <div className="message-group-block">
                <div className="message-date-header">
                  <span className="date-label">{labels.older}</span>
                  <span className="date-count">({groupedMessages.older.length})</span>
                </div>
                <div className="message-group-items">
                  {groupedMessages.older.map((msg) => (
                    <SupportiveMessageBubble
                      key={msg.id}
                      id={msg.id}
                      kind={msg.kind}
                      text={msg.text}
                      audioUrl={msg.audioUrl}
                      audioDuration={msg.audioDuration}
                      transcription={msg.transcription}
                      senderAnonymous={msg.senderAnonymous}
                      toYou={true}
                      autoTranslate={autoTranslate}
                      language={language}
                      onDelete={onDeleteMessage}
                      onReport={onReportMessage}
                      notify={notify}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. Visibility Card (Two ThemedSwitch toggles with divider) */}
      <SectionCard
        title={labels.visibilityHeading}
        subtitle={labels.visibilitySub}
      >
        <div className="toggle-row-item">
          <ThemedSwitch
            checked={discoverable}
            onChange={onSetDiscoverable}
            label={labels.appearTitle}
            description={labels.appearDesc}
            onStatusText={labels.appearOnStatus}
            offStatusText={labels.appearOffStatus}
            ariaLabel={labels.appearTitle}
          />
        </div>

        <div className="section-card-divider" />

        <div className="toggle-row-item">
          <ThemedSwitch
            checked={acceptMessages}
            onChange={onSetAcceptMessages}
            label={labels.acceptTitle}
            description={labels.acceptDesc}
            onStatusText={labels.acceptOnStatus}
            offStatusText={labels.acceptOffStatus}
            ariaLabel={labels.acceptTitle}
          />
        </div>
      </SectionCard>

      {/* 4. Region Card (Compact row with Edit button) */}
      <SectionCard
        title={labels.regionHeading}
        action={
          <button
            type="button"
            className="card-action-btn"
            onClick={() => setIsEditingRegion((prev) => !prev)}
          >
            {isEditingRegion ? labels.doneEditing : labels.editArea}
          </button>
        }
      >
        {!isEditingRegion ? (
          <div className="region-compact-row">
            <div className="region-badge-info">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <strong>
                {myRegion.state ? `${myRegion.state}, ${myRegion.country}` : myRegion.country || "Earth"}
              </strong>
            </div>
          </div>
        ) : (
          <div className="region-edit-panel">
            {detectingLocation && (
              <div className="region-detecting-state">
                <span className="spinner mini" />
                <span>{labels.detecting}</span>
              </div>
            )}

            {!detectingLocation && (
              <div className="region-actions-stack">
                <div className="region-buttons-row">
                  <button
                    type="button"
                    className="region-btn primary"
                    onClick={() => {
                      if (onEnableLocation) onEnableLocation();
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                    </svg>
                    <span>{labels.useCurrentArea}</span>
                  </button>

                  <button
                    type="button"
                    className="region-btn secondary"
                    onClick={() => {
                      if (onSelectManualArea) onSelectManualArea();
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    <span>{labels.chooseAreaManual}</span>
                  </button>
                </div>

                {renderAreaPicker && renderAreaPicker()}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* 5. Privacy Note (Collapsed to 1 line with Learn More) */}
      <div className="my-node-privacy-banner" role="region" aria-label="Privacy safeguards">
        <div className="privacy-banner-summary">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <p className="privacy-summary-text">{labels.privacyNoteShort}</p>
          <button
            type="button"
            className="privacy-learn-more-link"
            onClick={() => setShowPrivacyDetails((prev) => !prev)}
            aria-expanded={showPrivacyDetails}
          >
            {showPrivacyDetails ? labels.hideDetails : labels.learnMore}
          </button>
        </div>

        {showPrivacyDetails && (
          <div className="privacy-banner-expanded">
            <p>{labels.privacyDetail}</p>
          </div>
        )}
      </div>
    </div>
  );
}
