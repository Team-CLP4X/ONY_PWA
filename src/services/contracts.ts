export type PersonaId = "gentle" | "friendly" | "calm";

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthService {
  register(email: string, password: string): Promise<AuthenticatedUser>;
  login(email: string, password: string): Promise<AuthenticatedUser>;
  requestPasswordReset(email: string): Promise<void>;
  logout(): Promise<void>;
}

export interface ApprovedContext {
  memoryIds: string[];
  conversationIds: string[];
  consentVersion: string;
}

export interface AIConversationRequest {
  conversationId: string;
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  persona: PersonaId;
  approvedContext: ApprovedContext;
}

export interface AIConversationResponse {
  message: string;
  safetyAction: "support" | "offer_human_support" | "urgent_safety_flow";
  citedResourceIds: string[];
}

export interface AIService {
  sendMessage(request: AIConversationRequest): Promise<AIConversationResponse>;
}

export interface SupportSearch {
  country: string;
  state?: string;
  cityOrPostcode?: string;
  coordinates?: { latitude: number; longitude: number };
}

export interface VerifiedSupportProvider {
  id: string;
  name: string;
  serviceType: string;
  address: string;
  contactUrl: string;
  distanceKm?: number;
  sourceUrl: string;
  verifiedAt: string;
}

export interface SupportDirectoryService {
  search(query: SupportSearch): Promise<VerifiedSupportProvider[]>;
}

export interface MoodRecord {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  note?: string;
  createdAt: string;
  includeInReports: boolean;
}

export interface DiscoverableCommunityUser {
  id: string;
  broadRegionId: string;
  moodGlow: "bright" | "soft" | "dim" | "neutral";
  moodLabel?: string;
  discoverable: boolean;
  acceptsMessages: boolean;
}

export interface CommunityMessagingService {
  listDiscoverableUsers(regionId: string, zoomLevel: number): Promise<DiscoverableCommunityUser[]>;
  sendTextSupport(recipientId: string, message: string, moderationConsentVersion: string): Promise<void>;
  uploadVoicePreview(audio: Blob): Promise<{ previewId: string; playbackUrl: string }>;
  sendVoiceSupport(recipientId: string, previewId: string, moderationConsentVersion: string): Promise<void>;
  blockUser(userId: string): Promise<void>;
  reportUser(userId: string, reason: string): Promise<void>;
}

// Implement these contracts in server-backed adapters. Never place Gemini,
// authentication-provider, map, or directory secrets in the Vite client.
