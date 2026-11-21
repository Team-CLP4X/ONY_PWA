import assert from "node:assert/strict";
import {
  evaluateMarketplaceRecommendations,
  evaluateMarketplaceRecommendation,
  isVoucherActiveAndValid,
  getActiveDatabaseVouchers,
} from "../src/server/marketplaceMatcher.ts";
import { type FirestoreMerchant } from "../src/data/merchants.ts";

const TEST_MERCHANTS: FirestoreMerchant[] = [
  {
    id: "ruang_rasa",
    name: "Ruang Rasa",
    category: "Café",
    offer: "Slow afternoon set",
    value: "15% OFF",
    description: "A quiet table, warm artisan drink, and peaceful room to pause.",
    image: "https://images.unsplash.com/photo-1613274554329-70f997f5789f?auto=format&fit=crop&w=600&q=80",
    validity: "Valid until 30 Jun 2027",
    active: true,
    expired: false,
  },
  {
    id: "tangan_studio",
    name: "Tangan Studio",
    category: "Art / creative",
    offer: "Mindful clay session",
    value: "RM10 OFF",
    description: "A gentle hands-on pottery session for curious beginners.",
    image: "https://images.unsplash.com/photo-1590605095243-072811dbe64c?auto=format&fit=crop&w=600&q=80",
    validity: "Weekdays only",
    active: true,
    expired: false,
  },
  {
    id: "nafas_space",
    name: "Nafas Space",
    category: "Yoga / meditation",
    offer: "First community class",
    value: "RM18 CLASS",
    description: "A calm guided yoga and meditation class with no experience required.",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80",
    validity: "Valid for first visit",
    active: true,
    expired: false,
  },
  {
    id: "tenang_goods",
    name: "Tenang Goods",
    category: "Wellness products",
    offer: "Sleep ritual set",
    value: "20% OFF",
    description: "Handcrafted aromatherapy and herbal goods for a restful evening.",
    image: "https://images.unsplash.com/photo-1761864293818-603c23655cee?auto=format&fit=crop&w=600&q=80",
    validity: "Valid until 15 Jul 2027",
    active: true,
    expired: false,
  },
  {
    id: "sora_sounds",
    name: "Sora Sounds",
    category: "Music",
    offer: "Calming playlist session",
    value: "FREE SESSION",
    description: "Curated binaural soundscapes and relaxation listening guides.",
    image: "https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?auto=format&fit=crop&w=600&q=80",
    validity: "Online access",
    active: true,
    expired: false,
  },
  {
    id: "senja_rest",
    name: "Senja Rest",
    category: "Relaxation",
    offer: "Quiet reset session",
    value: "RM15 OFF",
    description: "A calming head & shoulder relaxation and holistic wellness session.",
    image: "https://images.unsplash.com/photo-1557388243-e1194223f99b?auto=format&fit=crop&w=600&q=80",
    validity: "Weekdays only",
    active: true,
    expired: false,
  },
];

console.log("=== ONY Emotion-Based Voucher Recommendation Test Suite ===");

async function test1_databaseConnectionAndNoMockContract() {
  console.log("\n[Test 1] Verify unauthenticated REST query returns [] (zero hardcoded mock leaks) & schema fixture integrity:");
  const unauthenticated = await getActiveDatabaseVouchers();
  assert.equal(
    unauthenticated.length,
    0,
    "Unauthenticated getActiveDatabaseVouchers() must return [] instead of mock fallback data",
  );

  const names = TEST_MERCHANTS.map((v) => v.name);
  assert.ok(names.includes("Ruang Rasa"), "Ruang Rasa fixture present");
  assert.ok(names.includes("Tangan Studio"), "Tangan Studio fixture present");
  assert.ok(names.includes("Nafas Space"), "Nafas Space fixture present");

  for (const v of TEST_MERCHANTS) {
    assert.ok(v.id, `Voucher ${v.name} must have an ID`);
    assert.ok(v.offer, `Voucher ${v.name} must have an offer description`);
    assert.ok(v.value, `Voucher ${v.name} must have a discount value`);
    assert.ok(v.category, `Voucher ${v.name} must have a category`);
    assert.ok(v.validity, `Voucher ${v.name} must have validity`);
    assert.ok(!v.name.toLowerCase().includes("grab"), "No Grab vouchers exist in partner wellness DB");
  }

  console.log("✓ PASS: Unauthenticated lookup does not leak mock data & catalog fixture schema is valid.");
}

async function test2_normalStressMessageReturnsMatchingVouchers() {
  console.log("\n[Test 2] Single stress message does NOT push vouchers; continuous inquiry for places/activities returns vouchers:");

  // A) Merely stating stress/fatigue without asking for places or activities must return 0 vouchers
  const singleStatementRes = await evaluateMarketplaceRecommendations({
    userMessage: "I've been working late all week and feel completely exhausted and drained.",
    recentHistory: [],
    safetyAction: "support",
    language: "English",
    merchantsOverride: TEST_MERCHANTS,
  });
  assert.equal(
    singleStatementRes.vouchers.length,
    0,
    "Merely expressing stress/fatigue must NOT pop up voucher cards without places/activities inquiry",
  );

  // B) When user asks continuously for places/activities that the bot suggests:
  const continuousRes = await evaluateMarketplaceRecommendations({
    userMessage: "What places or activities do you suggest to relax and unwind?",
    recentHistory: [
      { role: "user", content: "I've been working late all week and feel completely exhausted and drained." },
      { role: "assistant", content: "That sounds like a heavy week. Taking a gentle pause at a quiet café or resting your mind can help." },
    ],
    safetyAction: "support",
    language: "English",
    merchantsOverride: TEST_MERCHANTS,
  });

  assert.ok(continuousRes.vouchers.length > 0, "Should return matching vouchers when asking continuously for places/activities");
  assert.ok(continuousRes.vouchers.length <= 3, "Must return at most 3 suitable matches");

  const merchantNames = continuousRes.vouchers.map((v) => v.merchantName);
  console.log("Returned vouchers for work stress places/activities inquiry:", merchantNames);
  assert.ok(
    merchantNames.includes("Ruang Rasa") || merchantNames.includes("Senja Rest"),
    "Work fatigue should recommend restorative café pause or relaxation reset",
  );

  // Check structured fields on returned recommendation
  const primary = continuousRes.vouchers[0];
  assert.ok(primary.id, "Recommendation must have an id");
  assert.ok(primary.merchantName, "Must have merchantName");
  assert.ok(primary.offer, "Must have offer");
  assert.ok(primary.value, "Must have discount value");
  assert.ok(primary.contextReason.length > 0, "Must have empathetic contextReason");
  assert.equal(primary.actionLabel, "View / Use Voucher");

  console.log("✓ PASS: Single statement withholds vouchers; continuous inquiry for places/activities returns matching vouchers.");
}

async function test3_studyPressureAndLonelinessMatches() {
  console.log("\n[Test 3] Study pressure and loneliness emotion matching when asking for places/activities:");

  // A) Study pressure (English)
  const studyRes = await evaluateMarketplaceRecommendations({
    userMessage: "Finals week is killing me, what quiet places or activities do you suggest where I can decompress?",
    recentHistory: [],
    safetyAction: "support",
    language: "English",
    merchantsOverride: TEST_MERCHANTS,
  });
  const studyNames = studyRes.vouchers.map((v) => v.merchantName);
  console.log("Study pressure vouchers:", studyNames);
  assert.ok(
    studyNames.includes("Ruang Rasa") || studyNames.includes("Sora Sounds"),
    "Study pressure should match quiet study café or calming instrumental sounds",
  );

  // B) Loneliness (feeling isolated)
  const lonelyRes = await evaluateMarketplaceRecommendations({
    userMessage: "I moved to KL recently and feel so lonely, what places or activities do you suggest to connect?",
    recentHistory: [],
    safetyAction: "support",
    language: "English",
    merchantsOverride: TEST_MERCHANTS,
  });
  const lonelyNames = lonelyRes.vouchers.map((v) => v.merchantName);
  console.log("Loneliness vouchers:", lonelyNames);
  assert.ok(
    lonelyNames.includes("Tangan Studio") || lonelyNames.includes("Ruang Rasa"),
    "Loneliness should recommend mindful hands-on pottery or welcoming café space",
  );

  // C) Multilingual Malay matching
  const bmRes = await evaluateMarketplaceRecommendations({
    userMessage: "Penat sangat hari ni serabut dengan assignment universiti, apa tempat atau aktiviti santai yang awak cadang?",
    recentHistory: [],
    safetyAction: "support",
    language: "Bahasa Melayu",
    merchantsOverride: TEST_MERCHANTS,
  });
  assert.ok(bmRes.vouchers.length > 0, "Bahasa Melayu study stress should match vouchers");
  assert.equal(bmRes.vouchers[0].actionLabel, "Lihat & Guna Baucar");

  // D) Multilingual Chinese matching
  const zhRes = await evaluateMarketplaceRecommendations({
    userMessage: "最近连日加班赶项目好心累，你有什么推荐的放松地方或活动吗？",
    recentHistory: [],
    safetyAction: "support",
    language: "中文",
    merchantsOverride: TEST_MERCHANTS,
  });
  assert.ok(zhRes.vouchers.length > 0, "Chinese work fatigue should match vouchers");
  assert.equal(zhRes.vouchers[0].actionLabel, "查看并使用礼券");

  console.log("✓ PASS: Study pressure and loneliness accurately matched in English, Malay, and Chinese.");
}

async function test4_noMatchingEmotionalNeedReturnsNoFabricatedOffers() {
  console.log("\n[Test 4] No matching emotion/lifestyle need and non-places queries return 0 fabricated offers:");
  const testInputs = [
    "What is the capital of France?",
    "Can you solve this algebra equation: 3x + 12 = 48?",
    "Hello there, what is the weather like in Penang today?",
    "I have work tomorrow morning at 9am.",
    "Just finished classes for the afternoon.",
    "I'm feeling really sad today.",
    "I've been crying in my room.",
  ];

  for (const input of testInputs) {
    const res = await evaluateMarketplaceRecommendations({
      userMessage: input,
      recentHistory: [],
      safetyAction: "support",
      language: "English",
      merchantsOverride: TEST_MERCHANTS,
    });
    assert.equal(res.vouchers.length, 0, `Query '${input}' must not fabricate any vouchers`);
  }

  console.log("✓ PASS: Non-emotional, factual, and single sadness statements return 0 fabricated vouchers.");
}

async function test5_expiredOrInactiveVouchersAreExcluded() {
  console.log("\n[Test 5] Expired and inactive vouchers are strictly excluded (with full & yearless date parsing):");

  const referenceNow = new Date(2026, 10, 20, 12, 0, 0, 0); // 20 Nov 2026 12:00 local

  const activeVoucher: FirestoreMerchant = {
    id: "active_test",
    name: "Active Partner",
    category: "Café",
    offer: "Fresh Tea Set",
    value: "10% OFF",
    description: "Relaxing table",
    image: "https://example.com/pic.jpg",
    validity: "Valid until 31 Dec 2029",
    active: true,
  };
  assert.equal(isVoucherActiveAndValid(activeVoucher, referenceNow), true, "Active future 4-digit-year voucher should be valid");

  assert.equal(
    isVoucherActiveAndValid({ ...activeVoucher, validity: "Valid until 30 Jun 2026" }, referenceNow),
    false,
    "Past 4-digit-year voucher (30 Jun 2026) must be expired on 20 Nov 2026",
  );

  assert.equal(
    isVoucherActiveAndValid({ ...activeVoucher, validity: "Valid until 2026-10-01" }, referenceNow),
    false,
    "Past ISO date (2026-10-01) must be expired on 20 Nov 2026",
  );

  assert.equal(
    isVoucherActiveAndValid({ ...activeVoucher, validity: "2026-12-31" }, referenceNow),
    true,
    "Future ISO date (2026-12-31) must be valid on 20 Nov 2026",
  );

  // Same-day end-of-day boundary: valid until 20 Nov 2026 23:59:59.999
  assert.equal(
    isVoucherActiveAndValid({ ...activeVoucher, validity: "Valid until 20 Nov 2026" }, referenceNow),
    true,
    "Voucher expiring today must remain valid until local 23:59:59.999",
  );
  assert.equal(
    isVoucherActiveAndValid(
      { ...activeVoucher, validity: "Valid until 20 Nov 2026" },
      new Date(2026, 10, 21, 0, 0, 1, 0),
    ),
    false,
    "Voucher expired yesterday must become invalid after local midnight",
  );

  // Yearless dates resolved against `now.getFullYear()` instead of JS year 2001 default
  assert.equal(
    isVoucherActiveAndValid({ ...activeVoucher, validity: "Valid until 31 Dec" }, referenceNow),
    true,
    "Yearless future date ('Valid until 31 Dec' in Nov 2026) must resolve to current year and stay valid",
  );
  assert.equal(
    isVoucherActiveAndValid({ ...activeVoucher, validity: "Valid until 30 Jun" }, referenceNow),
    false,
    "Yearless past date ('Valid until 30 Jun' in Nov 2026) must be expired",
  );
  assert.equal(
    isVoucherActiveAndValid({ ...activeVoucher, validity: "Sah sehingga 25 Dis" }, referenceNow),
    true,
    "Yearless Malay future date ('Sah sehingga 25 Dis' in Nov 2026) must resolve to current year",
  );

  const inactiveVoucher: FirestoreMerchant = {
    ...activeVoucher,
    active: false,
  };
  assert.equal(isVoucherActiveAndValid(inactiveVoucher, referenceNow), false, "Inactive voucher must be excluded");

  const expiredFieldVoucher: FirestoreMerchant = {
    ...activeVoucher,
    expired: true,
  };
  assert.equal(isVoucherActiveAndValid(expiredFieldVoucher, referenceNow), false, "Voucher marked expired must be excluded");

  const expiredTextVoucher: FirestoreMerchant = {
    ...activeVoucher,
    validity: "Expired on 1 Jan 2024",
  };
  assert.equal(isVoucherActiveAndValid(expiredTextVoucher, referenceNow), false, "Voucher with expired text must be excluded");

  console.log("✓ PASS: Inactive and expired vouchers are properly excluded by validator (including ISO & yearless dates).");
}

async function test6_suicideRiskMessageNeverReturnsVouchers() {
  console.log("\n[Test 6] Suicide-risk & crisis messages strictly return 0 vouchers:");

  const crisisInputs = [
    { text: "I want to kill myself, I can't take this anymore", action: "urgent_safety_flow" as const },
    { text: "Saya rasa nak bunuh diri, dah tak tahan hidup", action: "urgent_safety_flow" as const },
    { text: "我真的很想自杀，不想活了", action: "urgent_safety_flow" as const },
  ];

  for (const c of crisisInputs) {
    const res = await evaluateMarketplaceRecommendations({
      userMessage: c.text,
      recentHistory: [],
      safetyAction: c.action,
      language: "English",
      merchantsOverride: TEST_MERCHANTS,
    });

    assert.equal(
      res.vouchers.length,
      0,
      `Crisis message '${c.text}' must NEVER return vouchers`,
    );
  }

  console.log("✓ PASS: Crisis situations strictly return 0 vouchers and never include commercial offers.");
}

async function test7_avoidDuplicateRecommendationsInConsecutiveMessages() {
  console.log("\n[Test 7] Avoid duplicate recommendations in consecutive messages:");

  // Turn 1: User asks for suggested places/activities, receives Ruang Rasa
  const turn1 = await evaluateMarketplaceRecommendations({
    userMessage: "I'm feeling so burnt out from work, what places or activities do you suggest?",
    recentHistory: [],
    safetyAction: "support",
    language: "English",
    merchantsOverride: TEST_MERCHANTS,
  });
  assert.ok(turn1.vouchers.length > 0);
  const firstMerchant = turn1.vouchers[0].merchantName;

  // Turn 2: User again asks for other spots, but history shows Ruang Rasa was just recommended
  const turn2 = await evaluateMarketplaceRecommendations({
    userMessage: "Still feeling exhausted, what other spots or activities do you suggest?",
    recentHistory: [
      { role: "user", content: "I'm feeling so burnt out from work, what places or activities do you suggest?" },
      { role: "assistant", content: `I hear you. Here is a voucher for ${firstMerchant}.` },
    ],
    safetyAction: "support",
    language: "English",
    merchantsOverride: TEST_MERCHANTS,
  });

  const turn2Names = turn2.vouchers.map((v) => v.merchantName);
  console.log(`Turn 1 recommended: ${firstMerchant}; Turn 2 recommended:`, turn2Names);
  assert.ok(
    !turn2Names.includes(firstMerchant),
    `Turn 2 must NOT duplicate ${firstMerchant} consecutively`,
  );

  console.log("✓ PASS: Consecutive duplicate vouchers are avoided.");
}

async function test8_emptyDatabaseReturnsZeroFabricatedVouchers() {
  console.log("\n[Test 8] Empty / unavailable catalog fails gracefully without fabricated vouchers:");

  const res = await evaluateMarketplaceRecommendations({
    userMessage: "I feel stressed from exams, what places or activities do you suggest for a relaxing pause?",
    recentHistory: [],
    safetyAction: "support",
    language: "English",
    merchantsOverride: [],
  });

  assert.ok(Array.isArray(res.vouchers), "Must always return an array");
  assert.equal(res.vouchers.length, 0, "Empty database must return [] without fabricating offers");

  console.log("✓ PASS: Unavailable merchant catalog fails gracefully with zero fabricated offers.");
}

async function runAll() {
  await test1_databaseConnectionAndNoMockContract();
  await test2_normalStressMessageReturnsMatchingVouchers();
  await test3_studyPressureAndLonelinessMatches();
  await test4_noMatchingEmotionalNeedReturnsNoFabricatedOffers();
  await test5_expiredOrInactiveVouchersAreExcluded();
  await test6_suicideRiskMessageNeverReturnsVouchers();
  await test7_avoidDuplicateRecommendationsInConsecutiveMessages();
  await test8_emptyDatabaseReturnsZeroFabricatedVouchers();

  console.log("\n========================================================");
  console.log("ALL 8 VOUCHER RECOMMENDATION TESTS PASSED SUCCESSFULLY!");
  console.log("========================================================\n");
  process.exit(0);
}

runAll().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
