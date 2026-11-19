/**
 * Standalone admin/CLI script to populate or refresh the `/merchants` collection in Firestore.
 * Run manually when provisioning a new environment (NOT imported by application runtime code).
 *
 * Usage:
 *   npx tsx scripts/seed-merchants.ts
 * Requires FIREBASE_ID_TOKEN or GOOGLE_APPLICATION_CREDENTIALS with Firestore write access.
 */
import fs from "node:fs";
import path from "node:path";
import type { FirestoreMerchant } from "../src/data/merchants.ts";

const MERCHANTS_SEED: FirestoreMerchant[] = [
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

async function main() {
  const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const { initializeApp, applicationDefault } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");

  const app = initializeApp({
    credential: applicationDefault(),
    projectId: config.projectId,
  });
  const db = config.firestoreDatabaseId
    ? getFirestore(app, config.firestoreDatabaseId)
    : getFirestore(app);

  for (const merchant of MERCHANTS_SEED) {
    const id = merchant.id || merchant.name.toLowerCase().replace(/\s+/g, "_");
    await db.collection("merchants").doc(id).set(merchant, { merge: true });
    console.log(`Seeded merchant: ${id}`);
  }
}

main().catch((err) => {
  console.error("Merchant seeding failed (requires admin credentials):", err.message || err);
  process.exit(1);
});
