import type {
  ChatSuggestion,
  SafetyAction,
} from "./contracts.ts";

export interface ParseAiSuggestionsResult {
  cleanReply: string;
  aiSuggestions: Partial<ChatSuggestion>[];
}

export interface BuildContextualSuggestionsInput {
  replyText: string;
  userMessage?: string;
  aiSuggestions?: Partial<ChatSuggestion>[];
  recentShownIds?: string[];
  memories?: string[];
  language?: string;
  safetyAction?: SafetyAction;
  maxCount?: number;
}

const VALID_TOOLKIT_IDS = new Set([
  "breathing_box",
  "grounding_54321",
  "stress_reset",
  "sleep_winddown",
  "reflection_journaling",
  "calming_anger",
  "self_compassion_loneliness",
]);

function getLangCode(language?: string): "bm" | "zh" | "en" {
  const lower = (language || "").toLowerCase();
  if (lower.includes("melayu") || lower === "bm") return "bm";
  if (lower.includes("中文") || lower === "zh" || lower.includes("chinese")) return "zh";
  return "en";
}

function localizedText(lang: "bm" | "zh" | "en", en: string, bm: string, zh: string): string {
  if (lang === "bm") return bm;
  if (lang === "zh") return zh;
  return en;
}

/**
 * Strips any hidden `[ONY_SUGGESTIONS: ...]` metadata line emitted by the AI model
 * and safely parses JSON suggestion entries without ever exposing raw tags to users.
 */
export function parseAiSuggestionsFromReply(rawReply: string): ParseAiSuggestionsResult {
  const text = (rawReply || "").trim();
  if (!text) {
    return { cleanReply: "", aiSuggestions: [] };
  }

  let aiSuggestions: Partial<ChatSuggestion>[] = [];

  const tagRegex = /\[ONY_SUGGESTIONS:\s*(\[[\s\S]*?\])\s*\]/gi;
  let match: RegExpExecArray | null = null;
  while ((match = tagRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) {
        aiSuggestions = parsed.filter((item) => item && typeof item === "object");
      }
    } catch {
      // Ignore malformed AI metadata JSON safely and fall back to classifier
    }
  }

  const cleanReply = text
    .replace(/\[ONY_SUGGESTIONS:[\s\S]*$/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { cleanReply, aiSuggestions };
}

function normalizeAiSuggestion(
  raw: Partial<ChatSuggestion>,
  lang: "bm" | "zh" | "en",
): ChatSuggestion | null {
  if (!raw || typeof raw !== "object") return null;

  const rawId = typeof raw.id === "string" ? raw.id.trim().toLowerCase() : "";
  const rawToolId = typeof raw.toolId === "string" ? raw.toolId.trim() : "";
  const rawLabel = typeof raw.label === "string" ? raw.label.trim() : "";

  if (rawToolId && VALID_TOOLKIT_IDS.has(rawToolId)) {
    return buildToolkitSuggestion(rawToolId, lang, rawLabel || undefined);
  }
  if (VALID_TOOLKIT_IDS.has(rawId)) {
    return buildToolkitSuggestion(rawId, lang, rawLabel || undefined);
  }

  if (raw.action === "music" || rawId === "music" || rawId === "act_music") {
    return buildActivitySuggestion("act_music", lang, rawLabel || undefined);
  }
  if (raw.action === "timer" || rawId === "break_timer" || rawId === "act_break_timer") {
    return buildActivitySuggestion(
      "act_break_timer",
      lang,
      rawLabel || undefined,
      typeof raw.durationMinutes === "number" ? raw.durationMinutes : undefined,
    );
  }
  if (rawId === "walk" || rawId === "act_walk") {
    return buildActivitySuggestion(
      "act_walk",
      lang,
      rawLabel || undefined,
      typeof raw.durationMinutes === "number" ? raw.durationMinutes : undefined,
    );
  }
  if (raw.action === "hydrate" || rawId === "water" || rawId === "act_water") {
    return buildActivitySuggestion("act_water", lang, rawLabel || undefined);
  }
  if (rawId === "stretch" || rawId === "act_stretch") {
    return buildActivitySuggestion(
      "act_stretch",
      lang,
      rawLabel || undefined,
      typeof raw.durationMinutes === "number" ? raw.durationMinutes : undefined,
    );
  }

  if (raw.action === "follow_up" && rawLabel && typeof raw.followUpPrompt === "string" && raw.followUpPrompt.trim()) {
    return {
      id: rawId || `follow_${rawLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 24)}`,
      type: "activity",
      action: "follow_up",
      label: rawLabel.slice(0, 32),
      icon: "sparkles",
      followUpPrompt: raw.followUpPrompt.trim(),
    };
  }

  return null;
}

export function buildToolkitSuggestion(
  toolId: string,
  lang: "bm" | "zh" | "en",
  customLabel?: string,
): ChatSuggestion {
  switch (toolId) {
    case "grounding_54321":
      return {
        id: "tool_grounding_54321",
        type: "toolkit",
        action: "toolkit",
        toolId: "grounding_54321",
        label: customLabel || localizedText(lang, "5-4-3-2-1 Grounding", "Pembumian 5-4-3-2-1", "5-4-3-2-1 着陆法"),
        icon: "eye",
        durationMinutes: 2,
      };
    case "stress_reset":
      return {
        id: "tool_stress_reset",
        type: "toolkit",
        action: "toolkit",
        toolId: "stress_reset",
        label: customLabel || localizedText(lang, "One small step", "Satu langkah kecil", "拆解一小步"),
        icon: "checkCircle",
        durationMinutes: 3,
      };
    case "sleep_winddown":
      return {
        id: "tool_sleep_winddown",
        type: "toolkit",
        action: "toolkit",
        toolId: "sleep_winddown",
        label: customLabel || localizedText(lang, "Sleep Wind-Down", "Relaksasi Tidur", "睡前助眠扫描"),
        icon: "moon",
        durationMinutes: 4,
      };
    case "reflection_journaling":
      return {
        id: "tool_reflection_journaling",
        type: "toolkit",
        action: "toolkit",
        toolId: "reflection_journaling",
        label: customLabel || localizedText(lang, "Write & Reflect", "Tulis Refleksi", "情绪反思日记"),
        icon: "edit",
        durationMinutes: 5,
      };
    case "calming_anger":
      return {
        id: "tool_calming_anger",
        type: "toolkit",
        action: "toolkit",
        toolId: "calming_anger",
        label: customLabel || localizedText(lang, "Cool Down Reset", "Redakan Marah", "化解烦躁降温"),
        icon: "wind",
        durationMinutes: 4,
      };
    case "self_compassion_loneliness":
      return {
        id: "tool_self_compassion_loneliness",
        type: "toolkit",
        action: "toolkit",
        toolId: "self_compassion_loneliness",
        label: customLabel || localizedText(lang, "Self-Compassion", "Belas Kasihan Diri", "温柔自我关怀"),
        icon: "heart",
        durationMinutes: 3,
      };
    case "breathing_box":
    default:
      return {
        id: "tool_breathing_box",
        type: "toolkit",
        action: "toolkit",
        toolId: "breathing_box",
        label: customLabel || localizedText(lang, "Box Breathing", "Pernafasan 4-4-4-4", "箱式呼吸练习"),
        icon: "wind",
        durationMinutes: 1,
      };
  }
}

export function buildActivitySuggestion(
  activityId: "act_music" | "act_break_timer" | "act_walk" | "act_water" | "act_stretch",
  lang: "bm" | "zh" | "en",
  customLabel?: string,
  durationMinutes?: number,
): ChatSuggestion {
  switch (activityId) {
    case "act_music":
      return {
        id: "act_music",
        type: "activity",
        action: "music",
        label: customLabel || localizedText(lang, "Play calming music", "Main muzik tenang", "播放舒缓音乐"),
        icon: "music",
      };
    case "act_break_timer":
      return {
        id: "act_break_timer",
        type: "activity",
        action: "timer",
        label: customLabel || localizedText(lang, "Take a short break", "Rehat 5 minit", "休息 5 分钟"),
        icon: "coffee",
        durationMinutes: durationMinutes && durationMinutes > 0 ? durationMinutes : 5,
      };
    case "act_walk":
      return {
        id: "act_walk",
        type: "activity",
        action: "timer",
        label: customLabel || localizedText(lang, "Go for a walk", "Jalan kaki sekejap", "出去走走透气"),
        icon: "footprints",
        durationMinutes: durationMinutes && durationMinutes > 0 ? durationMinutes : 10,
      };
    case "act_stretch":
      return {
        id: "act_stretch",
        type: "activity",
        action: "timer",
        label: customLabel || localizedText(lang, "Gentle stretch", "Regangan ringan", "放松伸展 2 分钟"),
        icon: "sparkles",
        durationMinutes: durationMinutes && durationMinutes > 0 ? durationMinutes : 2,
      };
    case "act_water":
    default:
      return {
        id: "act_water",
        type: "activity",
        action: "hydrate",
        label: customLabel || localizedText(lang, "Drink some water", "Minum air kosong", "喝口温水歇歇"),
        icon: "droplet",
      };
  }
}

interface CandidateEntry {
  suggestion: ChatSuggestion;
  score: number;
}

const CRISIS_TRIGGER_REGEX =
  /\b(hurt myself|self[- ]?harm|suicid(?:e|al)|end my life|kill myself|don'?t want to live|want to die|bunuh diri|cederakan diri|tak nak hidup)\b|自杀|自殺|伤害自己|不想活/i;

/**
 * Classifies BOTH the bot's latest reply AND the user's message (plus any AI-emitted
 * metadata suggestions) to produce up to 3 varied, context-matched suggestions
 * without repeating exact suggestions from the immediately preceding turn.
 */
export function buildContextualSuggestions(
  input: BuildContextualSuggestionsInput,
): ChatSuggestion[] {
  const {
    replyText = "",
    userMessage = "",
    aiSuggestions = [],
    recentShownIds = [],
    language = "English",
    safetyAction = "support",
    maxCount = 3,
  } = input;

  if (
    safetyAction === "urgent_safety_flow" ||
    CRISIS_TRIGGER_REGEX.test(userMessage)
  ) {
    return [];
  }

  const lang = getLangCode(language);
  const replyLower = replyText.toLowerCase();
  const userLower = userMessage.toLowerCase();

  const candidateMap = new Map<string, CandidateEntry>();

  const addCandidate = (suggestion: ChatSuggestion, score: number) => {
    const existing = candidateMap.get(suggestion.id);
    if (!existing || score > existing.score) {
      candidateMap.set(suggestion.id, { suggestion, score });
    }
  };

  // 1. Prioritize structured AI-returned suggestions when valid
  aiSuggestions.forEach((rawItem, idx) => {
    const normalized = normalizeAiSuggestion(rawItem, lang);
    if (normalized) {
      addCandidate(normalized, 120 - idx * 8);
    }
  });

  // 2. Analyze BOT'S LATEST REPLY (highest signal so suggestions match what ONY just suggested)

  // Music / audio / rain / lo-fi / soundscape
  if (
    /\b(music|song|songs|tune|playlist|audio|lo-?fi|soundscape|rain sounds|binaural|432hz|piano|headphones|acoustic|lagu|muzik|bunyi tenang|alunan|hujan)\b|音乐|听歌|白噪音|雨声|旋律|轻音乐|耳机/.test(
      replyLower,
    )
  ) {
    addCandidate(buildActivitySuggestion("act_music", lang), 108);
  }

  // Break from game / screen / phone / work / study / pause
  if (
    /\b(take a break|short break|5-minute|5 minute|step away|disconnect|pause button|close your eyes|rest your eyes|screen|screens|game|gaming|tilted|match|berehat|rehat sekejap|rehat kejap|jauhkan diri|skrin)\b|休息|歇一歇|暂停|离开屏幕|放下手机|闭目养神|打游戏|充充电/.test(
      replyLower,
    )
  ) {
    addCandidate(buildActivitySuggestion("act_break_timer", lang), 104);
  }

  // Walk / fresh air / park / outdoors / nature
  if (
    /\b(walk|stroll|fresh air|step outside|outside|park|lake|garden|greenery|trees|nature|jalan kaki|udara segar|taman|kehijauan)\b|散步|走走|出去走|呼吸新鲜空气|公园|绿树|大自然/.test(
      replyLower,
    )
  ) {
    addCandidate(buildActivitySuggestion("act_walk", lang), 102);
  }

  // Water / hydrate / warm tea / drink
  if (
    /\b(drink|water|hydrate|hydration|sip|warm cup|tea|coffee|kopi|teh|minum air|air suam|air kosong|secawan)\b|喝水|温水|喝杯|热茶|热饮|补充水分/.test(
      replyLower,
    )
  ) {
    addCandidate(buildActivitySuggestion("act_water", lang), 96);
  }

  // Stretch / jaw / shoulders / physical muscle tension
  if (
    /\b(stretch|shoulders|unclench|jaw|muscles|posture|regangan|bahu|otot)\b|伸展|肩膀|松开|下巴|肌肉/.test(
      replyLower,
    )
  ) {
    addCandidate(buildActivitySuggestion("act_stretch", lang), 92);
  }

  // Breathing explicit mention in reply
  if (
    /\b(breath|breathe|breathing|inhale|exhale|4 seconds|4-4-4-4|tarik nafas|hembus|pernafasan)\b|深呼吸|呼吸|吸气|呼气/.test(
      replyLower,
    )
  ) {
    addCandidate(buildToolkitSuggestion("breathing_box", lang), 95);
  }

  // Grounding / 5 senses / feet on floor
  if (
    /\b(ground|grounding|5-4-3-2-1|senses|feet on the floor|feet resting|present moment|pembumian|rasakan lantai)\b|着陆|五感|脚踏实地|当下/.test(
      replyLower,
    )
  ) {
    addCandidate(buildToolkitSuggestion("grounding_54321", lang), 94);
  }

  // Small steps / breaking down tasks / overwhelm
  if (
    /\b(bite-sized|small step|one step|break.*down|one thing|langkah kecil|satu persatu)\b|拆成.*小步骤|小步骤|一次只专注|一步一步/.test(
      replyLower,
    )
  ) {
    addCandidate(buildToolkitSuggestion("stress_reset", lang), 90);
  }

  // Sleep / night rest / wind down
  if (
    /\b(sleep|bedtime|night|early tonight|rest tonight|tidur awal|malam ini)\b|早点睡|入睡|睡眠|睡前/.test(
      replyLower,
    )
  ) {
    addCandidate(buildToolkitSuggestion("sleep_winddown", lang), 93);
  }

  // Journal / writing down thoughts
  if (
    /\b(journal|write it down|write down|diary|put.*words|jurnal|diari|tulis)\b|写下来|日记|记录下来/.test(
      replyLower,
    )
  ) {
    addCandidate(buildToolkitSuggestion("reflection_journaling", lang), 90);
  }

  // Anger / cool down / frustration
  if (
    /\b(cool down|adrenaline|frustrat|anger|angry|cool water|kemarahan|marah|geram)\b|愤怒|生气|烦躁|冷静/.test(
      replyLower,
    )
  ) {
    addCandidate(buildToolkitSuggestion("calming_anger", lang), 91);
  }

  // Loneliness / warmth / self-compassion / isolation
  if (
    /\b(lonely|loneliness|isolation|alone|not alone|kind to yourself|kesunyian|sunyi|sendirian)\b|孤单|孤独|寂寞|温柔对待自己/.test(
      replyLower,
    )
  ) {
    addCandidate(buildToolkitSuggestion("self_compassion_loneliness", lang), 89);
  }

  // 3. Analyze USER MESSAGE (complements bot reply, never overrides reply-specific actions)

  if (
    /\b(music|song|songs|playlist|lofi|sound|lagu|muzik)\b|音乐|听歌|歌/.test(userLower)
  ) {
    addCandidate(buildActivitySuggestion("act_music", lang), 88);
  }

  if (
    /\b(game|gaming|tilt|tilted|losing|ranked|play|screen|burnout|tired|exhausted|penat|letih|main game)\b|打游戏|游戏|累|疲惫|不想干了/.test(
      userLower,
    )
  ) {
    addCandidate(buildActivitySuggestion("act_break_timer", lang), 85);
  }

  if (
    /\b(sleep|insomnia|awake|can'?t sleep|midnight|tidur|mengantuk)\b|睡不着|失眠|熬夜|困/.test(
      userLower,
    )
  ) {
    addCandidate(buildToolkitSuggestion("sleep_winddown", lang), 86);
  }

  if (
    /\b(angry|furious|mad|annoyed|frustrated|irritated|marah|geram|benci)\b|生气|愤怒|烦死|好烦|气死/.test(
      userLower,
    )
  ) {
    addCandidate(buildToolkitSuggestion("calming_anger", lang), 84);
  }

  if (
    /\b(lonely|alone|nobody|isolated|sunyi|seorangan|sorang)\b|孤单|寂寞|孤独|没人理/.test(
      userLower,
    )
  ) {
    addCandidate(buildToolkitSuggestion("self_compassion_loneliness", lang), 83);
  }

  if (
    /\b(ground|panic|racing thoughts|shaking|spiral|panik|sesak)\b|惊恐|着陆|胡思乱想|喘不过气/.test(
      userLower,
    )
  ) {
    addCandidate(buildToolkitSuggestion("grounding_54321", lang), 82);
  }

  if (
    /\b(study|exam|assignment|deadline|fyp|work|boss|overwhelm|overwhelmed|stress|stressed|peperiksaan|kerja|tugasan)\b|考试|作业|压力|工作|加班|好累/.test(
      userLower,
    )
  ) {
    addCandidate(buildToolkitSuggestion("stress_reset", lang), 80);
    addCandidate(
      {
        id: "follow_small_step",
        type: "activity",
        action: "follow_up",
        label: localizedText(lang, "Plan one tiny step", "Susun 1 langkah kecil", "定一个微目标"),
        icon: "sparkles",
        followUpPrompt: localizedText(
          lang,
          "Help me pick just one tiny, manageable step to start with.",
          "Bantu saya pilih satu langkah paling kecil untuk mula sekarang.",
          "帮我选一个现在最容易开始的微小一步吧。",
        ),
      },
      74,
    );
  }

  if (
    /\b(anxious|anxiety|nervous|worried|cemas|gelisah|risau)\b|焦虑|担心|紧张|不安/.test(
      userLower,
    )
  ) {
    addCandidate(buildToolkitSuggestion("breathing_box", lang), 78);
    addCandidate(buildActivitySuggestion("act_music", lang), 72);
  }

  if (
    /\b(sad|crying|cry|heartbroken|low|journal|reflect|confuse|confused|sedih|menangis|kecewa)\b|难过|伤心|哭|迷茫|郁闷/.test(
      userLower,
    )
  ) {
    addCandidate(buildToolkitSuggestion("reflection_journaling", lang), 79);
  }

  if (
    /\b(hungry|food|eat|lunch|dinner|supper|drink|thirsty|makan|lapar|minum)\b|饿|吃什么|喝/.test(
      userLower,
    )
  ) {
    addCandidate(buildActivitySuggestion("act_water", lang), 76);
  }

  if (
    /\b(walk|park|outside|cafe|spot|place|taman|lepak)\b|散步|出去|公园/.test(
      userLower,
    )
  ) {
    addCandidate(buildActivitySuggestion("act_walk", lang), 78);
  }

  // Always allow a gentle contextual follow-up if conversation is emotional/reflective and we need variety
  if (candidateMap.size > 0 && candidateMap.size < 3) {
    addCandidate(
      {
        id: "follow_unpack_more",
        type: "activity",
        action: "follow_up",
        label: localizedText(lang, "Tell ONY more", "Cerita lebih lanjut", "继续多聊聊"),
        icon: "chat",
        followUpPrompt: localizedText(
          lang,
          "I want to unpack this a bit more with you.",
          "Saya nak luahkan lagi tentang perkara ini.",
          "我想和你多聊聊这件事的细节。",
        ),
      },
      40,
    );
  }

  const recentSet = new Set(recentShownIds);

  // Sort by score descending
  const sorted = Array.from(candidateMap.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.suggestion);

  // Never repeat the exact same suggestion twice in consecutive turns
  const freshOnly = sorted.filter((item) => !recentSet.has(item.id));

  if (freshOnly.length > 0) {
    return freshOnly.slice(0, maxCount);
  }

  // If every matched item happened to be shown last turn, avoid repeating the #1 exact repeat
  // by offering a non-repeating gentle fallback when appropriate, or returning empty rather than repeating
  return [];
}
