export interface FirestoreMerchant {
  id?: string;
  name: string;
  category: string;
  offer: string;
  value: string;
  description: string;
  image: string;
  validity: string;
}

export const DEFAULT_MERCHANTS: FirestoreMerchant[] = [
  {
    name: "Ruang Rasa",
    category: "Café",
    offer: "Slow afternoon set",
    value: "15% OFF",
    description: "A quiet table, warm drink, and room to pause.",
    image: "https://images.unsplash.com/photo-1613274554329-70f997f5789f?auto=format&fit=crop&w=600&q=80",
    validity: "Valid until 30 Jun · Demo",
  },
  {
    name: "Tangan Studio",
    category: "Art / creative",
    offer: "Mindful clay session",
    value: "RM10 OFF",
    description: "A gentle hands-on session for curious beginners.",
    image: "https://images.unsplash.com/photo-1590605095243-072811dbe64c?auto=format&fit=crop&w=600&q=80",
    validity: "Weekdays only · Demo",
  },
  {
    name: "Nafas Space",
    category: "Yoga / meditation",
    offer: "First community class",
    value: "RM18 CLASS",
    description: "A calm guided class with no experience required.",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80",
    validity: "Valid for first visit · Demo",
  },
  {
    name: "Tenang Goods",
    category: "Wellness products",
    offer: "Sleep ritual set",
    value: "20% OFF",
    description: "Simple example products for a slower evening.",
    image: "https://images.unsplash.com/photo-1761864293818-603c23655cee?auto=format&fit=crop&w=600&q=80",
    validity: "Valid until 15 Jul · Demo",
  },
  {
    name: "Sora Sounds",
    category: "Music",
    offer: "Calming playlist session",
    value: "FREE SESSION",
    description: "Instrumental and relaxation listening guides.",
    image: "https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?auto=format&fit=crop&w=600&q=80",
    validity: "Online access · Demo",
  },
  {
    name: "Senja Rest",
    category: "Relaxation",
    offer: "Quiet reset session",
    value: "RM15 OFF",
    description: "A future-stage relaxation and spa discovery offer.",
    image: "https://images.unsplash.com/photo-1557388243-e1194223f99b?auto=format&fit=crop&w=600&q=80",
    validity: "Weekdays only · Demo",
  },
];
