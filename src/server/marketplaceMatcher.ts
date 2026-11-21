import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MarketplaceRecommendation, SafetyAction } from "../services/contracts.ts";
import { formatVoucherValidity, isVoucherActiveAndValid, type FirestoreMerchant } from "../data/merchants.ts";
export { isVoucherActiveAndValid };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPaths = [
  path.resolve(__dirname, "../../firebase-applet-config.json"),
  path.resolve(process.cwd(), "firebase-applet-config.json"),
];

let appConfig: { projectId?: string; firestoreDatabaseId?: string } = {};
for (const p of configPaths) {
  if (fs.existsSync(p)) {
    try {
      appConfig = JSON.parse(fs.readFileSync(p, "utf8"));
      break;
    } catch {
      // ignore invalid config
    }
  }
}

export interface MatchVoucherInput {
  userMessage: string;
  recentHistory?: { role: string; content: string }[];
  safetyAction: SafetyAction;
  memories?: string[];
  language?: string;
  idToken?: string;
  merchantsOverride?: FirestoreMerchant[];
}

export interface MatchVoucherResult {
  vouchers: MarketplaceRecommendation[];
  copingActivity?: string;
}

let cachedMerchants: FirestoreMerchant[] | null = null;
let lastCacheTimestamp = 0;
const CACHE_TTL_MS = 2 * 60 * 1000;

interface FirestoreRestValue {
  stringValue?: string;
  booleanValue?: boolean;
  arrayValue?: { values?: FirestoreRestValue[] };
}

function readRestString(fields: Record<string, FirestoreRestValue> | undefined, key: string, fallback = ""): string {
  const val = fields?.[key]?.stringValue;
  return typeof val === "string" ? val : fallback;
}

function readRestBool(fields: Record<string, FirestoreRestValue> | undefined, key: string, fallback: boolean): boolean {
  const val = fields?.[key]?.booleanValue;
  return typeof val === "boolean" ? val : fallback;
}

/**
 * Fetches active partner offers from Firestore REST `/merchants` using the caller's Firebase ID token.
 * Returns [] if unavailable or empty (never falls back to mocked merchant data).
 */
export async function getActiveDatabaseVouchers(idToken?: string): Promise<FirestoreMerchant[]> {
  const now = Date.now();
  if (cachedMerchants && now - lastCacheTimestamp < CACHE_TTL_MS) {
    return cachedMerchants;
  }

  const projectId = appConfig.projectId || process.env.FIREBASE_PROJECT_ID;
  if (!projectId || !idToken) {
    return [];
  }

  const databaseId = appConfig.firestoreDatabaseId || "(default)";
  const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents/merchants?pageSize=50`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${idToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.warn(`[ONY VoucherMatcher] Firestore REST read returned HTTP ${res.status}`);
      return [];
    }

    const payload = (await res.json()) as {
      documents?: Array<{
        name: string;
        fields?: Record<string, FirestoreRestValue>;
      }>;
    };

    const docs = Array.isArray(payload.documents) ? payload.documents : [];
    const liveList: FirestoreMerchant[] = docs.map((d) => {
      const docId = d.name.split("/").pop() || "";
      const fields = d.fields || {};
      const tags = fields.tags?.arrayValue?.values
        ?.map((v) => v.stringValue)
        .filter((v): v is string => typeof v === "string");

      return {
        id: docId,
        name: readRestString(fields, "name", docId),
        category: readRestString(fields, "category", "Wellness"),
        offer: readRestString(fields, "offer", "Partner Offer"),
        value: readRestString(fields, "value", "Special Value"),
        description: readRestString(fields, "description", ""),
        image: readRestString(fields, "image", ""),
        validity: readRestString(fields, "validity", "Active"),
        active: readRestBool(fields, "active", true),
        expired: readRestBool(fields, "expired", false),
        tags,
      };
    });

    cachedMerchants = liveList;
    lastCacheTimestamp = now;
    return liveList;
  } catch (err) {
    console.warn("[ONY VoucherMatcher] Live Firestore read failed:", err);
    return [];
  }
}

export function clearVoucherMatcherCache(): void {
  cachedMerchants = null;
  lastCacheTimestamp = 0;
}

// isVoucherActiveAndValid is imported and re-exported from ../data/merchants.ts

const CRISIS_OR_EMERGENCY_TRIGGERS = [
  /\b(suicid|kill myself|end my life|hurt myself|self[- ]?harm|don'?t want to live|want to die)\b/i,
  /\b(bunuh diri|cederakan diri|tak nak hidup|mati)\b/i,
  /自杀|自殺|伤害自己|不想活/,
];

export async function evaluateMarketplaceRecommendations(
  input: MatchVoucherInput,
): Promise<MatchVoucherResult> {
  const {
    userMessage,
    recentHistory = [],
    safetyAction,
    memories = [],
    language = "English",
    idToken,
    merchantsOverride,
  } = input;

  if (safetyAction !== "support") {
    return { vouchers: [] };
  }

  const userMsgLower = userMessage.toLowerCase();
  for (const pattern of CRISIS_OR_EMERGENCY_TRIGGERS) {
    if (pattern.test(userMsgLower)) {
      return { vouchers: [] };
    }
  }

  const allMerchants = Array.isArray(merchantsOverride)
    ? merchantsOverride
    : await getActiveDatabaseVouchers(idToken);
  const validVouchers = allMerchants.filter((m) => isVoucherActiveAndValid(m));

  if (validVouchers.length === 0) {
    return {
      vouchers: [],
      copingActivity: getCopingActivity(language),
    };
  }

  const recentAssistantTexts = recentHistory
    .filter((h) => h.role === "assistant" || h.role === "ony")
    .slice(-2)
    .map((h) => h.content.toLowerCase());

  const isRecentlyRecommended = (merchantName: string): boolean => {
    const mLower = merchantName.toLowerCase();
    return recentAssistantTexts.some((text) => text.includes(mLower));
  };

  const userTurns = recentHistory
    .filter((h) => h.role === "user")
    .map((h) => h.content.toLowerCase());

  const priorUserText = userTurns.slice(-2).join(" ");
  const memoryText = memories.join(" ").toLowerCase();
  const combinedContext = `${userMsgLower} ${priorUserText} ${memoryText}`;

  const isWorkFatigueOrBurnout =
    /\b(work|job|boss|colleague|office|ot|overtime|shift|long day|burnout|drained|exhausted|depleted|working late)\b/i.test(combinedContext) ||
    /\b(penat kerja|bos|kerja banyak|letih sangat|habis tenaga|penat gila)\b/i.test(combinedContext) ||
    /加班|工作好累|好心累|上班|老板|职场|心力交瘁|喘不过气/.test(combinedContext);

  const isStudyPressure =
    /\b(study|studying|exam|exams|assignment|assignments|deadline|fyp|thesis|finals|quiz|revision|homework|college|university|spm|stpm)\b/i.test(combinedContext) ||
    /\b(ulangkaji|kerja kursus|peperiksaan|belajar|tarikh akhir)\b/i.test(combinedContext) ||
    /考试|备考|赶due|作业|复习|论文|学业|大考|测验/.test(combinedContext);

  const isBodyTensionOrAnxiety =
    /\b(anxious|anxiety|panic|tense|tension|tight chest|restless|racing thoughts|can'?t breathe|jittery|nervous|shaking)\b/i.test(combinedContext) ||
    /\b(cemas|gementar|tegang|sesak nafas|gelisah|risau sangat)\b/i.test(combinedContext) ||
    /焦虑|紧绷|心慌|慌张|胸口闷|呼吸急促|神经紧绷/.test(combinedContext);

  const isLoneliness =
    /\b(lonely|so lonely|isolated|alone|feeling alone|disconnected|no one around|empty room|nobody to talk to)\b/i.test(combinedContext) ||
    /\b(sunyi|kesepian|rasa terasing|sorang-sorang|takde kawan)\b/i.test(combinedContext) ||
    /孤单|寂寞|好孤单|一个人|感觉好孤独|没人陪/.test(combinedContext);

  const isSleepIssue =
    /\b(sleep|insomnia|can'?t sleep|awake|midnight|bedtime|tossing and turning|nightmare|restless night)\b/i.test(combinedContext) ||
    /\b(susah tidur|tak boleh tidur|tidur lena|terjaga tengah malam)\b/i.test(combinedContext) ||
    /失眠|睡不着|彻夜未眠|半夜醒来|入睡困难/.test(combinedContext);

  const isRelaxationOrLeisure =
    /\b(relax|unwind|chill|take a break|pause|rest|quiet spot|coffee|tea|cafe|pottery|clay|massage|spa|weekend)\b/i.test(combinedContext) ||
    /\b(berehat|rehat kejap|santai|lepak|kopi|teh|urut)\b/i.test(combinedContext) ||
    /放松|歇一下|休息|去咖啡馆|喝杯茶|喝咖啡|做手作|陶艺|水疗/.test(combinedContext);

  const isGeneralStress =
    /\b(stressed|stress|overwhelmed|heavy|too much|need a break|struggling today)\b/i.test(combinedContext) ||
    /\b(berserabut|stres|berat kepala|serabut)\b/i.test(combinedContext) ||
    /压力好大|压力很大|好压抑|心好累/.test(combinedContext);

  const hasEmotionalIntent =
    isWorkFatigueOrBurnout ||
    isStudyPressure ||
    isBodyTensionOrAnxiety ||
    isLoneliness ||
    isSleepIssue ||
    isRelaxationOrLeisure ||
    isGeneralStress;

  const isAskingAboutPlacesOrActivities =
    /(places?|spots?|caf[eé]|coffee|studio|workshop|activities|activity|where (can|should) (i|we) go|where to (go|relax|chill|unwind|visit|rest)|what (places?|spots?|activities|activity)|tell me more (about|of) (the|those)? *(places?|spots?|activities?)|which (place|spot|caf[eé]|activity)|any (quiet|relaxing)? *(place|spot|caf[eé]|activity)|places? (or|and) activities|activities (or|and) places)/i.test(userMsgLower) ||
    /\b(tempat|mana tempat|tempat lepak|tempat santai|tempat rehat|tempat tenang|kafe|kopi|bengkel|aktiviti|aktiviti menarik|mana boleh pergi|cerita pasal tempat|tempat atau aktiviti|aktiviti atau tempat)\b/i.test(userMsgLower) ||
    /地方|去处|去哪里|去哪儿|有什么地方|咖啡馆|工坊|活动|有什么活动|推荐地方|推荐活动|哪里可以放松|可以去哪|地方或活动|活动或地方|介绍一下那个地方/.test(userMsgLower);

  const isDirectlyAskingForBotSuggestions =
    /(what|any|which) (places?|activities|activity|spots?) (do you|did you|would you) (suggest|recommend)|(suggest|recommend) (some |any )?(places?|activities|spots?|caf[eé])|(places?|activities) (that )?(you|the bot) (suggest|recommend)/i.test(userMsgLower) ||
    /\b(apa|mana) (tempat|aktiviti) (yang )?(awak|kamu|bot) cadang|\b(cadangkan|cadang) (tempat|aktiviti)/i.test(userMsgLower) ||
    /你(推荐|建议)(什么|哪些)?(地方|活动)|(推荐|建议)一些?(地方|活动)|(地方|活动)(是)?你(推荐|建议)的/.test(userMsgLower);

  const assistantTurns = recentHistory
    .filter((h) => h.role === "assistant" || h.role === "ony")
    .map((h) => h.content.toLowerCase());

  const botSuggestedPlacesOrActivities = assistantTurns.slice(-2).some((msg) =>
    /(place|spot|caf[eé]|coffee|tea|pottery|clay|yoga|stretch|breathe|breathwork|music|soundscape|walk|studio|rest|unwind|rehat|kafe|tempat|aktiviti|放松|去处|地方|咖啡|活动|工坊|伸展|正念)/i.test(msg),
  );

  const priorUserAskedForPlacesOrSuggestions = userTurns.some((msg) =>
    /(suggest|recommend|place|spot|caf[eé]|activity|activities|where|cadang|tempat|aktiviti|建议|推荐|地方|去处|活动)/i.test(msg),
  );

  const isAskingContinuouslyForPlacesOrActivities =
    isDirectlyAskingForBotSuggestions ||
    (isAskingAboutPlacesOrActivities && (botSuggestedPlacesOrActivities || priorUserAskedForPlacesOrSuggestions || userTurns.length >= 1)) ||
    (isAskingAboutPlacesOrActivities && /(suggest|recommend|cadang|推荐|建议)/i.test(userMsgLower));

  const shouldRecommendVoucher = isAskingContinuouslyForPlacesOrActivities && hasEmotionalIntent;

  if (!shouldRecommendVoucher) {
    return { vouchers: [] };
  }

  const candidates: { voucher: FirestoreMerchant; priority: number; needCategory: string }[] = [];

  const addCandidate = (name: string, priority: number, needCategory: string) => {
    const found = validVouchers.find(
      (v) => v.name.toLowerCase() === name.toLowerCase() || (v.id && v.id.toLowerCase() === name.toLowerCase()),
    );
    if (found && !isRecentlyRecommended(found.name)) {
      if (!candidates.some((c) => c.voucher.name === found.name)) {
        candidates.push({ voucher: found, priority, needCategory });
      }
    }
  };

  if (isSleepIssue) {
    addCandidate("Tenang Goods", 10, "sleep");
    addCandidate("Sora Sounds", 8, "sleep");
    addCandidate("Senja Rest", 6, "sleep");
  } else if (isLoneliness) {
    addCandidate("Tangan Studio", 10, "loneliness");
    addCandidate("Ruang Rasa", 8, "loneliness");
    addCandidate("Sora Sounds", 6, "loneliness");
  } else if (isBodyTensionOrAnxiety) {
    addCandidate("Nafas Space", 10, "anxiety");
    addCandidate("Senja Rest", 8, "anxiety");
    addCandidate("Sora Sounds", 6, "anxiety");
  } else if (isStudyPressure) {
    addCandidate("Ruang Rasa", 10, "study");
    addCandidate("Sora Sounds", 8, "study");
    addCandidate("Nafas Space", 6, "study");
  } else if (isWorkFatigueOrBurnout) {
    addCandidate("Ruang Rasa", 10, "work_fatigue");
    addCandidate("Senja Rest", 8, "work_fatigue");
    addCandidate("Sora Sounds", 6, "work_fatigue");
  } else if (isRelaxationOrLeisure || isGeneralStress) {
    if (/coffee|caf[eé]|kopi|tea|teh|quiet spot/i.test(combinedContext)) {
      addCandidate("Ruang Rasa", 10, "relaxation");
    }
    if (/pottery|clay|art|craft|tanah liat/i.test(combinedContext)) {
      addCandidate("Tangan Studio", 10, "relaxation");
    }
    if (/yoga|meditat|stretch|senaman/i.test(combinedContext)) {
      addCandidate("Nafas Space", 10, "relaxation");
    }
    if (/massage|spa|body|urut/i.test(combinedContext)) {
      addCandidate("Senja Rest", 10, "relaxation");
    }
    if (/music|sound|lofi|playlist|lagu/i.test(combinedContext)) {
      addCandidate("Sora Sounds", 10, "relaxation");
    }
    if (/sleep|pillow|aroma/i.test(combinedContext)) {
      addCandidate("Tenang Goods", 10, "relaxation");
    }

    addCandidate("Ruang Rasa", 7, "relaxation");
    addCandidate("Sora Sounds", 6, "relaxation");
    addCandidate("Tangan Studio", 5, "relaxation");
  }

  candidates.sort((a, b) => b.priority - a.priority);
  const selectedMatches = candidates.slice(0, 3);

  if (selectedMatches.length === 0) {
    return {
      vouchers: [],
      copingActivity: getCopingActivity(language),
    };
  }

  const formattedVouchers: MarketplaceRecommendation[] = selectedMatches.map((match) => {
    const v = match.voucher;
    const { contextReason, actionLabel } = getLocalizedVoucherLabels(
      v.name,
      match.needCategory,
      language,
    );

    return {
      id: v.id || v.name.toLowerCase().replace(/\s+/g, "_"),
      merchantName: v.name,
      category: v.category,
      offer: v.offer,
      value: v.value,
      description: v.description,
      image: v.image,
      validity: formatVoucherValidity(v.validity),
      contextReason,
      actionLabel,
    };
  });

  return {
    vouchers: formattedVouchers,
    copingActivity: getCopingActivity(language),
  };
}

export async function evaluateMarketplaceRecommendation(
  input: MatchVoucherInput,
): Promise<MarketplaceRecommendation | null> {
  const result = await evaluateMarketplaceRecommendations(input);
  return result.vouchers[0] || null;
}

function getLocalizedVoucherLabels(
  merchantName: string,
  needCategory: string,
  language: string,
): { contextReason: string; actionLabel: string } {
  let actionLabel = "View / Use Voucher";
  if (language === "Bahasa Melayu") {
    actionLabel = "Lihat & Guna Baucar";
  } else if (language === "中文") {
    actionLabel = "查看并使用礼券";
  }

  let contextReason = "";
  if (merchantName === "Ruang Rasa") {
    if (language === "Bahasa Melayu") {
      contextReason = needCategory === "study"
        ? "Memandangkan anda sedang mengulang kaji, sudut kafe tenang ini sesuai untuk rehat seketika."
        : "Memandangkan anda berasa penat hari ini, secawan minuman hangat di kafe tenang mungkin dapat melegakan fikiran.";
    } else if (language === "中文") {
      contextReason = needCategory === "study"
        ? "备考或赶作业累了，可以到安静的咖啡馆稍作歇息、换个心情。"
        : "因为你提到今天有些疲累，不妨在安静温暖的角落喝杯热饮、稍作停顿。";
    } else {
      contextReason = needCategory === "study"
        ? "Since you've been focused on your studies, a quiet café table is a gentle place to take a breather."
        : "Since you mentioned feeling drained today, a slow drink in a quiet space might help you reset.";
    }
  } else if (merchantName === "Nafas Space") {
    if (language === "Bahasa Melayu") {
      contextReason = "Memandangkan anda berasa cemas atau tegang, regangan nafas lembut ini boleh membantu menenangkan badan.";
    } else if (language === "中文") {
      contextReason = "感受到身体的紧绷与焦虑，或许温和的正念呼吸与伸展能帮你舒缓压力。";
    } else {
      contextReason = "Since you're feeling anxious or physically tense, gentle breathwork and stretching can help ground you.";
    }
  } else if (merchantName === "Tangan Studio") {
    if (language === "Bahasa Melayu") {
      contextReason = "Memandangkan anda berasa sunyi atau kosong, aktiviti tanah liat tangan ini memberi ruang selamat untuk minda berehat.";
    } else if (language === "中文") {
      contextReason = "如果觉得孤单或思绪纷乱，专注的陶艺手作体验能让内心找回平静。";
    } else {
      contextReason = "Since you're feeling lonely or disconnected, hands-on clay craft offers a gentle, tactile way to center yourself.";
    }
  } else if (merchantName === "Tenang Goods") {
    if (language === "Bahasa Melayu") {
      contextReason = "Memandangkan anda mengalami kesukaran untuk tidur, ritual malam yang tenang boleh membantu badan berehat.";
    } else if (language === "中文") {
      contextReason = "因为你提到晚上难以入眠，温和的晚安香氛与睡前习惯能帮助身心慢慢放松。";
    } else {
      contextReason = "Since you're having trouble sleeping, a gentle bedtime ritual can help your mind unwind for the night.";
    }
  } else if (merchantName === "Sora Sounds") {
    if (language === "Bahasa Melayu") {
      contextReason = "Memandangkan fikiran anda terasa sesak, muzik instrumental dan bunyi tenang percuma ini boleh melegakan minda.";
    } else if (language === "中文") {
      contextReason = "如果思绪有些凌乱嘈杂，免费的舒缓疗愈背景乐能帮你找回专注与安宁。";
    } else {
      contextReason = "Since your mind is feeling overloaded, calming instrumental soundscapes can help quiet the noise.";
    }
  } else if (merchantName === "Senja Rest") {
    if (language === "Bahasa Melayu") {
      contextReason = "Memandangkan keletihan terkumpul memberi kesan kepada badan, sesi relaksasi tenang ini menawarkan pemulihan menyeluruh.";
    } else if (language === "中文") {
      contextReason = "如果身体积攒了太多的疲惫，一次舒缓的身体放松体验或许正是此刻所需要的。";
    } else {
      contextReason = "Since you've been carrying a lot of physical exhaustion, a quiet reset session can give your body a break.";
    }
  } else {
    contextReason = language === "Bahasa Melayu"
      ? "Cadangan rakan niaga yang bersesuaian dengan keperluan anda."
      : language === "中文"
        ? "为你精选的社区伙伴健康礼遇。"
        : "A partner offer matched to your emotional need.";
  }

  return { contextReason, actionLabel };
}

function getCopingActivity(language: string): string {
  if (language === "Bahasa Melayu") {
    return "Cuba berehat 5 minit: minum segelas air suam, pejamkan mata sekejap, dan tarik nafas perlahan-lahan.";
  }
  if (language === "中文") {
    return "给自己一个5分钟的暂停：放下手头的事情，喝一杯温水，深呼吸让肩膀沉下来。";
  }
  return "Try a 5-minute pause: step away from your screen, sip a warm glass of water, and roll your shoulders back.";
}
