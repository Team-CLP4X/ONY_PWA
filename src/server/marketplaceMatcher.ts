import type { MarketplaceRecommendation, SafetyAction } from "../services/contracts.ts";
import { DEFAULT_MERCHANTS, type FirestoreMerchant } from "../firebase/firestore.ts";

// Emotional vulnerability, acute distress, or crisis triggers where commercial suggestions are strictly forbidden
const SENSITIVE_DISTRESS_PATTERNS = [
  /\b(suicid|kill myself|end my life|hurt myself|self[- ]?harm|don'?t want to live|want to die)\b/i,
  /\b(crying|burst into tears|depressed|heartbroken|breakup|divorce|grief|mourning|loss of|died|passed away)\b/i,
  /\b(hopeless|worthless|hate myself|can'?t take it|panic attack|breakdown|trauma|abuse|assault)\b/i,
  /\b(so lonely|nobody cares|no one loves me|empty inside|exhausted from life)\b/i,
  /\b(menangis|putus asa|kemurungan|cederakan diri|bunuh diri|mati|patah hati|duka|trauma)\b/i,
  /哭|绝望|难过得想哭|自残|自杀|不想活|痛苦|崩溃|分手|心碎|抑郁/,
];

export interface MatchVoucherInput {
  userMessage: string;
  recentHistory?: { role: string; content: string }[];
  safetyAction: SafetyAction;
  memories?: string[];
  language?: string;
}

export function evaluateMarketplaceRecommendation(
  input: MatchVoucherInput,
): MarketplaceRecommendation | null {
  const { userMessage, recentHistory = [], safetyAction, memories = [], language = "English" } = input;

  // 1. Absolute Priority: Never interrupt crisis, acute distress, or sensitive emotional moments
  if (safetyAction !== "support") {
    return null;
  }

  const allRecentText = [
    ...recentHistory.slice(-3).map((h) => h.content),
    userMessage,
  ].join(" ").toLowerCase();

  for (const pattern of SENSITIVE_DISTRESS_PATTERNS) {
    if (pattern.test(allRecentText)) {
      return null;
    }
  }

  // 2. Identify conversational intent for leisure, unwinding, breaks, or lifestyle activities
  const msgLower = userMessage.toLowerCase();
  const memoryText = memories.join(" ").toLowerCase();

  // Keyword intents
  const cafeIntent =
    /\b(coffee|caf[eé]|kopi|tea|teh|latte|matcha|afternoon tea|quiet spot to read|table to sit|cafe voucher)\b/i.test(msgLower) ||
    (/\b(break|unwind|pause|lepak|berehat|relax|歇一下|喝杯咖啡|咖啡馆)\b/i.test(msgLower) &&
      /\b(coffee|caf[eé]|kopi|tea|teh|cafe)\b/i.test(memoryText));

  const potteryIntent =
    /\b(pottery|clay|ceramics|art workshop|crafting|tanah liat|seramik|陶艺|捏陶|手作)\b/i.test(msgLower) ||
    (/\b(craft|hands-on|creative activity|seni)\b/i.test(msgLower) &&
      /\b(pottery|clay|ceramics|craft)\b/i.test(memoryText));

  const yogaIntent =
    /\b(yoga|pilates|meditation class|stretching class|mindful breathing class|meditasi|senaman regangan|瑜伽|冥想课)\b/i.test(msgLower) ||
    (/\b(stretch|body tension|mindful movement)\b/i.test(msgLower) &&
      /\b(yoga|meditation)\b/i.test(memoryText));

  const sleepGoodsIntent =
    /\b(sleep spray|sleep ritual|pillow mist|bedtime aroma|essential oil|aromatherapy|produk tidur|minyak pati|助眠|睡眠喷雾|晚安精油)\b/i.test(msgLower) ||
    (/\b(winding down at night|sleep better|evening routine)\b/i.test(msgLower) &&
      /\b(aromatherapy|pillow mist|sleep ritual)\b/i.test(memoryText));

  const musicIntent =
    /\b(playlist|calming music|ambient sound|lofi|instrumental track|lagu tenang|muzik santai|疗愈音乐|白噪音|纯音乐)\b/i.test(msgLower) ||
    (/\b(background sounds|relaxing sounds)\b/i.test(msgLower) &&
      /\b(music|playlist|instrumental)\b/i.test(memoryText));

  const spaIntent =
    /\b(massage|spa|quiet reset session|body massage|urut|relaksasi badan|水疗|按摩|身体重置)\b/i.test(msgLower);

  // 3. Match against verified DEFAULT_MERCHANTS without hallucination
  let matchedMerchant: FirestoreMerchant | undefined;
  let contextReason = "";
  let actionLabel = "";

  if (cafeIntent) {
    matchedMerchant = DEFAULT_MERCHANTS.find((m) => m.name === "Ruang Rasa");
    if (language === "Bahasa Melayu") {
      contextReason = "Memandangkan anda mencari kafe tenang untuk berehat seketika";
      actionLabel = "Terokai baucar kafe";
    } else if (language === "中文") {
      contextReason = "因为您提到了想找个安静的咖啡馆稍作歇息";
      actionLabel = "探索静心咖啡礼券";
    } else {
      contextReason = "Since you mentioned wanting a quiet coffee break to unwind";
      actionLabel = "Explore café vouchers";
    }
  } else if (potteryIntent) {
    matchedMerchant = DEFAULT_MERCHANTS.find((m) => m.name === "Tangan Studio");
    if (language === "Bahasa Melayu") {
      contextReason = "Memandangkan anda berminat mencuba aktiviti seni seramik";
      actionLabel = "Terokai sesi seramik";
    } else if (language === "中文") {
      contextReason = "因为您对陶艺手作体验感兴趣";
      actionLabel = "探索正念陶艺礼券";
    } else {
      contextReason = "Since you expressed interest in mindful hands-on clay";
      actionLabel = "Explore pottery voucher";
    }
  } else if (yogaIntent) {
    matchedMerchant = DEFAULT_MERCHANTS.find((m) => m.name === "Nafas Space");
    if (language === "Bahasa Melayu") {
      contextReason = "Memandangkan anda ingin mencuba kelas regangan yoga komuniti";
      actionLabel = "Terokai kelas yoga";
    } else if (language === "中文") {
      contextReason = "因为您想体验轻松的社区身心瑜伽课";
      actionLabel = "探索轻瑜伽体验券";
    } else {
      contextReason = "Since you mentioned wanting a gentle community yoga class";
      actionLabel = "Explore yoga voucher";
    }
  } else if (sleepGoodsIntent) {
    matchedMerchant = DEFAULT_MERCHANTS.find((m) => m.name === "Tenang Goods");
    if (language === "Bahasa Melayu") {
      contextReason = "Memandangkan anda ingin membina rutin malam yang lebih tenang";
      actionLabel = "Terokai set tidur tenang";
    } else if (language === "中文") {
      contextReason = "因为您想打造更宁静舒缓的睡前习惯";
      actionLabel = "探索助眠礼遇";
    } else {
      contextReason = "Since you are looking into gentle evening wind-down rituals";
      actionLabel = "Explore sleep ritual voucher";
    }
  } else if (musicIntent) {
    matchedMerchant = DEFAULT_MERCHANTS.find((m) => m.name === "Sora Sounds");
    if (language === "Bahasa Melayu") {
      contextReason = "Memandangkan anda menikmati senarai main instrumental santai";
      actionLabel = "Terokai sesi muzik percuma";
    } else if (language === "中文") {
      contextReason = "因为您喜欢倾听舒缓放松的器乐旋律";
      actionLabel = "探索免费音乐疗愈";
    } else {
      contextReason = "Since you enjoy calming instrumental playlists";
      actionLabel = "Explore free sound session";
    }
  } else if (spaIntent) {
    matchedMerchant = DEFAULT_MERCHANTS.find((m) => m.name === "Senja Rest");
    if (language === "Bahasa Melayu") {
      contextReason = "Memandangkan anda ingin melegakan keletihan badan";
      actionLabel = "Terokai sesi relaksasi";
    } else if (language === "中文") {
      contextReason = "因为您想做一次彻底的身体放松与舒缓重置";
      actionLabel = "探索深度放松礼券";
    } else {
      contextReason = "Since you are looking for a gentle physical reset";
      actionLabel = "Explore reset voucher";
    }
  }

  if (!matchedMerchant) {
    return null;
  }

  // 4. Return verified, structured recommendation
  return {
    merchantName: matchedMerchant.name,
    category: matchedMerchant.category,
    offer: matchedMerchant.offer,
    value: matchedMerchant.value,
    description: matchedMerchant.description,
    image: matchedMerchant.image,
    validity: matchedMerchant.validity,
    contextReason,
    actionLabel,
  };
}
