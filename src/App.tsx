import { FormEvent, ReactNode, useRef, useState } from "react";
import logo from "./assets/ony-logo.png";

type Tab = "chat" | "memory" | "community" | "market" | "profile";
type Screen =
  | "main"
  | "mood"
  | "trend"
  | "safety"
  | "help"
  | "personalise"
  | "notifications"
  | "subscription"
  | "merchant"
  | "voucher"
  | "post"
  | "privacy"
  | "about"
  | "addMemory"
  | "jobPrefs"
  | "jobs"
  | "jobDetail"
  | "wellbeing"
  | "professional"
  | "provider"
  | "trusted"
  | "communityMember"
  | "guidelines"
  | "chatHistory"
  | "monthlyReport"
  | "postDetail"
  | "riskDemo"
  | "resources"
  | "legal";

type Theme = "ocean" | "sunset" | "forest" | "lavender" | "peach" | "neutral";
type Companion = "Cat" | "Dog" | "Bunny" | "Bear" | "Fox" | "Panda";
type ContactStatus = "none" | "accepted";
type SubscriptionStatus = "free" | "trial" | "trialEnded" | "payg" | "monthly";
type Persona = "gentle" | "friendly" | "calm";
type RiskLevel = "low" | "moderate" | "high";

type Message = { from: "ony" | "user"; text: string };
type Conversation = { id: number; title: string; category: string; day: "Today" | "Yesterday"; messages: Message[]; folderId?: number; archived?: boolean; reportAllowed?: boolean };
type ChatFolder = { id: number; name: string };
type LegalDocumentId = "disclaimer" | "terms" | "privacy" | "crisis";
type MoodEntry = { id: number; level: number; emoji: string; label: string; note: string; createdAt: string; reportAllowed: boolean };
type GlobeUser = { id: number; moodGlow: "bright" | "soft" | "dim" | "neutral"; moodLabel: string; discoverable: boolean; acceptsMessages: boolean; minLevel: number; lon: number; lat: number };
type Merchant = { name: string; category: string; offer: string; value: string; description: string; image: string; validity: string };
type Memory = { id: number; text: string; reason: string; active: boolean; category?: string; kind?: "text" | "image"; imageTone?: string };
type Post = {
  id: number;
  author: string;
  title: string;
  body: string;
  category: string;
  likes: number;
  saved?: boolean;
  media?: "image" | "voice";
};

const Icon = ({ name }: { name: string }) => {
  const paths: Record<string, ReactNode> = {
    chat: <><path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9h8M8 12h5"/></>,
    memory: <><path d="M6 3h12v18l-6-3-6 3V3Z"/><path d="M9 8h6M9 12h4"/></>,
    community: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2"/><path d="M3 20c0-4 2-6 6-6s6 2 6 6M15 15c4 0 6 2 6 5"/></>,
    market: <><path d="M4 9h16l-1 12H5L4 9ZM7 9V7a5 5 0 0 1 10 0v2"/></>,
    profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-7 8-7s8 2 8 7"/></>,
    back: <path d="m15 18-6-6 6-6"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    send: <path d="m4 4 17 8-17 8 3-8-3-8Zm3 8h14"/>,
    heart: <path d="M20 5c-2-2-5-2-8 1-3-3-6-3-8-1-3 3-1 7 8 14 9-7 11-11 8-14Z"/>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    shield: <><path d="M12 3 4 6v5c0 5 3 8 8 10 5-2 8-5 8-10V6l-8-3Z"/><path d="m9 12 2 2 4-5"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    bell: <><path d="M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3V9ZM10 20h4"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
    edit: <><path d="m4 20 4-1 11-11-3-3L5 16l-1 4ZM14 7l3 3"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>,
  };
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
};

function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return <button type={type} disabled={disabled} onClick={onClick} className={`btn btn-${variant} ${className}`}>{children}</button>;
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} />;
}

function Toggle({ on, setOn }: { on: boolean; setOn: (v: boolean) => void }) {
  return <button className={`toggle ${on ? "on" : ""}`} onClick={() => setOn(!on)} aria-label={on ? "Turn off" : "Turn on"}><span /></button>;
}

const topics = ["Stress", "Loneliness", "Study", "Work", "Relationships", "Self-confidence", "General emotional support"];
const moodOptions = [
  { emoji: "😢", label: "Very low" },
  { emoji: "😟", label: "Low" },
  { emoji: "😐", label: "Okay" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😄", label: "Great" },
];
const emotions = ["stressed", "tired", "lonely", "anxious", "calm", "happy", "overwhelmed"];
const categories = ["All", "Study", "Work", "Relationships", "Motivation", "Self-care", "General"];
const themeOptions: { id: Theme; name: string; note: string }[] = [
  { id: "ocean", name: "Ocean / Sea", note: "Clear and steady" },
  { id: "sunset", name: "Sunset", note: "Soft and hopeful" },
  { id: "forest", name: "Forest / Nature", note: "Grounded and calm" },
  { id: "lavender", name: "Lavender", note: "Quiet and gentle" },
  { id: "peach", name: "Warm Peach", note: "Familiar ONY warmth" },
  { id: "neutral", name: "Minimal / Neutral", note: "Simple and focused" },
];
const personaOptions: { id: Persona; name: string; note: string; preview: string }[] = [
  { id: "gentle", name: "Gentle & Comforting", note: "Warm, empathetic, and reassuring", preview: "That sounds like a lot to carry. We can take this gently, one small step at a time." },
  { id: "friendly", name: "Friendly & Casual", note: "Relaxed, approachable, and conversational", preview: "That’s a lot for one day. Want to unpack the hardest bit together?" },
  { id: "calm", name: "Calm & Thoughtful", note: "Reflective, patient, and composed", preview: "Let’s pause with what you’re feeling. Which part needs your attention first?" },
];

type AuthFlowProps = {
  theme: Theme;
  displayName: string;
  setDisplayName: (name: string) => void;
  onComplete: () => void;
};

function AuthFlow(props: AuthFlowProps) {
  return <AuthFlowContent {...props} />;
}

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [displayName, setDisplayName] = useState("Aina");
  const [onboarding, setOnboarding] = useState(0);
  const [memoryConsent, setMemoryConsent] = useState("allow");
  const [language, setLanguage] = useState("English");
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["Stress", "Study"]);
  const [theme, setTheme] = useState<Theme>("peach");
  const [companion, setCompanion] = useState<Companion>("Cat");
  const [persona, setPersona] = useState<Persona>("gentle");
  const [soundOn, setSoundOn] = useState(false);
  const [volume, setVolume] = useState(55);
  const [trustedName, setTrustedName] = useState("Alex");
  const [trustedNumber, setTrustedNumber] = useState("012-345 6789");
  const [contactStatus, setContactStatus] = useState<ContactStatus>("none");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedMerchantName, setSelectedMerchantName] = useState("Ruang Rasa");
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>("free");
  const [freeUsage, setFreeUsage] = useState(0);
  const freeLimit = 3;
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [selectedCommunityUser, setSelectedCommunityUser] = useState<GlobeUser | null>(null);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [folders, setFolders] = useState<ChatFolder[]>([
    { id: 1, name: "Study & Work" },
    { id: 2, name: "Relationships" },
    { id: 3, name: "Self-Care" },
    { id: 4, name: "Personal Reflections" },
  ]);
  const [conversations, setConversations] = useState<Conversation[]>([
    { id: 101, title: "Feeling overwhelmed", category: "Emotional Wellbeing", day: "Today", folderId: 4, reportAllowed: true, messages: [{ from: "user", text: "Everything feels like a lot today." }, { from: "ony", text: "I hear you. We can slow this down together—what feels most urgent right now?" }] },
    { id: 102, title: "Internship search", category: "Career", day: "Today", folderId: 1, reportAllowed: true, messages: [{ from: "user", text: "I want to find an internship." }, { from: "ony", text: "Let’s begin with the kind of work and environment you want." }] },
    { id: 103, title: "Study pressure", category: "Study", day: "Today", folderId: 1, reportAllowed: true, messages: [{ from: "user", text: "My exams are getting close." }, { from: "ony", text: "That pressure makes sense. Let’s choose one small task for today." }] },
    { id: 104, title: "Relationship thoughts", category: "Relationships", day: "Yesterday", folderId: 2, reportAllowed: true, messages: [{ from: "user", text: "I keep replaying a difficult conversation." }, { from: "ony", text: "It sounds like it stayed with you. Which part keeps coming back?" }] },
    { id: 105, title: "Feeling anxious", category: "Emotional Wellbeing", day: "Yesterday", folderId: 3, reportAllowed: true, messages: [{ from: "user", text: "I’m feeling anxious." }, { from: "ony", text: "I’m here. Would something calming help, or would you like to talk it through?" }] },
  ]);
  const [memories, setMemories] = useState<Memory[]>([
    { id: 1, text: "I have exams coming up.", reason: "You mentioned this during a study-pressure chat.", active: true, category: "Study" },
    { id: 2, text: "I prefer shorter replies.", reason: "You chose this in your conversation preferences.", active: true, category: "Preference" },
    { id: 3, text: "I enjoy listening to music when stressed.", reason: "You said music helps you feel grounded.", active: true, category: "Wellbeing" },
  ]);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [tab, setTab] = useState<Tab>("chat");
  const [screen, setScreen] = useState<Screen>("main");
  const [history, setHistory] = useState<Screen[]>([]);
  const [toast, setToast] = useState("");
  const navigate = (next: Screen) => { setHistory((h) => [...h, screen]); setScreen(next); };
  const back = () => { const prev = history[history.length - 1] || "main"; setHistory((h) => h.slice(0, -1)); setScreen(prev); };
  const notify = (text: string) => { setToast(text); window.setTimeout(() => setToast(""), 2200); };
  const goTab = (next: Tab) => { setTab(next); setScreen("main"); setHistory([]); };

  if (!authenticated) {
    return <AuthFlow theme={theme} displayName={displayName} setDisplayName={setDisplayName} onComplete={() => setAuthenticated(true)} />;
  }

  if (onboarding < 9) {
    return <Onboarding
      step={onboarding}
      setStep={setOnboarding}
      displayName={displayName}
      consent={memoryConsent}
      setConsent={setMemoryConsent}
      language={language}
      setLanguage={setLanguage}
      selectedTopics={selectedTopics}
      setSelectedTopics={setSelectedTopics}
      theme={theme}
      setTheme={setTheme}
      companion={companion}
      setCompanion={setCompanion}
      persona={persona}
      setPersona={setPersona}
      soundOn={soundOn}
      setSoundOn={setSoundOn}
    />;
  }

  return (
    <div className={`app-shell theme-${theme}`}>
      <div className="phone">
        <div className={`environment environment-${theme}`} aria-hidden="true"><i /><i /><i /></div>
        {screen === "main" ? (
          <>
            <main className="main-content">
              {tab === "chat" && <ChatHome navigate={navigate} goTab={goTab} displayName={displayName} companion={companion} persona={persona} soundOn={soundOn} setSoundOn={setSoundOn} conversations={conversations} setConversations={setConversations} activeChatId={activeChatId} setActiveChatId={setActiveChatId} selectedFolderId={selectedFolderId} memories={memories} setMemories={setMemories} registerFreeUse={() => {
                if (subscriptionStatus === "trial" || subscriptionStatus === "payg" || subscriptionStatus === "monthly") return;
                const next = freeUsage + 1;
                setFreeUsage(next);
                if (next >= freeLimit) window.setTimeout(() => navigate("subscription"), 750);
              }} notify={notify} />}
              {tab === "memory" && <MemoryVault memories={memories} setMemories={setMemories} navigate={navigate} setEditingMemory={setEditingMemory} companion={companion} notify={notify} />}
              {tab === "community" && <Community navigate={navigate} openPost={(post) => { setSelectedPost(post); navigate("postDetail"); }} openMember={(user) => { setSelectedCommunityUser(user); navigate("communityMember"); }} notify={notify} />}
              {tab === "market" && <Marketplace navigate={navigate} openMerchant={(name) => { setSelectedMerchantName(name); navigate("merchant"); }} />}
              {tab === "profile" && <Profile navigate={navigate} displayName={displayName} language={language} persona={persona} theme={theme} companion={companion} trustedName={trustedName} contactStatus={contactStatus} subscriptionStatus={subscriptionStatus} onLogout={() => { setAuthenticated(false); setOnboarding(0); }} />}
            </main>
          </>
        ) : (
          <main className="overlay-page">
            {screen === "mood" && <MoodCheck back={back} navigate={navigate} entries={moodEntries} setEntries={setMoodEntries} notify={notify} />}
            {screen === "trend" && <MoodTrend back={back} entries={moodEntries} setEntries={setMoodEntries} />}
            {screen === "safety" && <SafetyFlow back={back} navigate={navigate} />}
            {screen === "help" && <Help back={back} navigate={navigate} />}
            {screen === "personalise" && <Personalise back={back} language={language} setLanguage={setLanguage} theme={theme} setTheme={setTheme} companion={companion} setCompanion={setCompanion} persona={persona} setPersona={setPersona} soundOn={soundOn} setSoundOn={setSoundOn} volume={volume} setVolume={setVolume} notify={notify} />}
            {screen === "notifications" && <Notifications back={back} />}
            {screen === "subscription" && <Subscription back={back} openHelp={() => navigate("help")} status={subscriptionStatus} setStatus={setSubscriptionStatus} freeUsage={freeUsage} freeLimit={freeLimit} resetFreeUsage={() => setFreeUsage(0)} notify={notify} />}
            {screen === "merchant" && <MerchantDetail back={back} navigate={navigate} merchantName={selectedMerchantName} notify={notify} />}
            {screen === "voucher" && <Voucher back={back} merchantName={selectedMerchantName} />}
            {screen === "post" && <CreatePost back={back} notify={notify} />}
            {screen === "privacy" && <Privacy back={back} notify={notify} memoryCount={memories.length} reviewMemories={() => goTab("memory")} clearMemories={() => setMemories([])} />}
            {screen === "about" && <About back={back} />}
            {screen === "addMemory" && <AddMemory back={back} memories={memories} setMemories={setMemories} editing={editingMemory} notify={notify} />}
            {screen === "jobPrefs" && <JobPreferences back={back} navigate={navigate} />}
            {screen === "jobs" && <JobOpportunities back={back} navigate={navigate} />}
            {screen === "jobDetail" && <JobDetail back={back} notify={notify} />}
            {screen === "wellbeing" && <Wellbeing back={back} navigate={navigate} notify={notify} />}
            {screen === "professional" && <ProfessionalSupport back={back} navigate={navigate} />}
            {screen === "provider" && <ProviderDetail back={back} notify={notify} />}
            {screen === "trusted" && <TrustedContact back={back} name={trustedName} number={trustedNumber} setName={setTrustedName} setNumber={setTrustedNumber} status={contactStatus} setStatus={setContactStatus} notify={notify} />}
            {screen === "communityMember" && selectedCommunityUser && <CommunityMember back={back} user={selectedCommunityUser} notify={notify} />}
            {screen === "guidelines" && <CommunityGuidelines back={back} />}
            {screen === "chatHistory" && <ChatHistory back={back} navigate={navigate} conversations={conversations} setConversations={setConversations} activeChatId={activeChatId} setActiveChatId={setActiveChatId} folders={folders} setFolders={setFolders} selectedFolderId={selectedFolderId} setSelectedFolderId={setSelectedFolderId} />}
            {screen === "monthlyReport" && <MonthlyReport back={back} moodEntries={moodEntries} setMoodEntries={setMoodEntries} conversations={conversations} setConversations={setConversations} memories={memories} />}
            {screen === "postDetail" && selectedPost && <PostDetail back={() => { sessionStorage.setItem("ony-show-posts", "true"); back(); }} post={selectedPost} notify={notify} />}
            {screen === "riskDemo" && <RiskDemo back={back} navigate={navigate} persona={persona} companion={companion} />}
            {screen === "resources" && <ResourceLibrary back={back} navigate={navigate} notify={notify} />}
            {screen === "legal" && <LegalHub back={back} navigate={navigate} />}
          </main>
        )}
        <BottomNav tab={tab} setTab={goTab} />
        {toast && <div className="toast"><Icon name="check" />{toast}</div>}
      </div>
    </div>
  );
}

function AuthFlowContent({ theme, displayName, setDisplayName, onComplete }: AuthFlowProps) {
  const [stage, setStage] = useState<"welcome" | "login" | "register" | "forgot" | "name" | "consent">("welcome");
  const [legal, setLegal] = useState<LegalDocumentId | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const finishLoading = (next: () => void) => {
    setLoading(true);
    setError("");
    window.setTimeout(() => {
      setLoading(false);
      next();
    }, 550);
  };
  const validEmail = /\S+@\S+\.\S+/.test(email);
  const submitAuth = (event: FormEvent) => {
    event.preventDefault();
    if (!validEmail) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (stage === "register" && password !== confirmPassword) return setError("Passwords do not match.");
    finishLoading(() => setStage(stage === "register" ? "name" : "consent"));
  };
  if (legal) return <div className={`app-shell theme-${theme}`}><div className="phone auth-phone"><LegalDocument document={legal} back={() => setLegal(null)} /></div></div>;
  return <div className={`app-shell theme-${theme}`}><div className="phone auth-phone"><div className={`environment environment-${theme}`} aria-hidden="true"><i /><i /><i /></div>
    <section className="auth-page">
      <div className="auth-brand"><img src={logo} alt="Official ONY logo" /><span className="prototype-label">Frontend prototype</span></div>
      {stage === "welcome" && <div className="auth-panel welcome-panel"><span className="eyebrow">Welcome to ONY</span><h1>A gentle space that starts with you.</h1><p>Private reflection, supportive conversation, and practical resources—at your pace.</p><Button className="full" onClick={() => setStage("register")}>Create account</Button><Button className="full" variant="secondary" onClick={() => setStage("login")}>Log in</Button><small>No real account is created yet. Authentication requires a secure provider and backend.</small></div>}
      {(stage === "login" || stage === "register") && <form className="auth-panel" onSubmit={submitAuth}><div className="auth-heading"><Button variant="ghost" className="auth-back" onClick={() => { setStage("welcome"); setError(""); }}><Icon name="back" />Back</Button><span className="eyebrow">{stage === "login" ? "Welcome back" : "Create your space"}</span></div><h1>{stage === "login" ? "Log in to ONY" : "Create an ONY account"}</h1><p className="muted">Prototype form only. Passwords remain in temporary component state and are not stored or submitted.</p><label className="field-label">Email</label><TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /><label className="field-label">Password</label><TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete={stage === "login" ? "current-password" : "new-password"} />{stage === "register" && <><label className="field-label">Confirm password</label><TextInput type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" autoComplete="new-password" /></>}{error && <div className="form-error"><Icon name="info" />{error}</div>}<Button className="full" type="submit" disabled={loading}>{loading ? "Please wait…" : stage === "login" ? "Log in" : "Continue"}</Button>{stage === "login" && <Button variant="ghost" className="full" onClick={() => { setStage("forgot"); setError(""); }}>Forgot password?</Button>}</form>}
      {stage === "forgot" && <form className="auth-panel" onSubmit={(event) => { event.preventDefault(); if (!validEmail) return setError("Enter the email associated with your account."); finishLoading(() => setNotice("If an account exists, a reset link would be sent by the future authentication provider.")); }}><Button variant="ghost" className="auth-back" onClick={() => setStage("login")}><Icon name="back" />Back</Button><span className="eyebrow">Account access</span><h1>Reset your password</h1><p className="muted">A connected authentication provider will handle reset links securely.</p><label className="field-label">Email</label><TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />{error && <div className="form-error"><Icon name="info" />{error}</div>}{notice ? <div className="form-success"><Icon name="check" />{notice}</div> : <Button className="full" type="submit" disabled={loading}>{loading ? "Checking…" : "Send reset link"}</Button>}</form>}
      {stage === "name" && <form className="auth-panel" onSubmit={(event) => { event.preventDefault(); if (displayName.trim().length < 2) return setError("Enter a display name with at least 2 characters."); setError(""); setStage("consent"); }}><span className="eyebrow">Your public name</span><h1>What should ONY call you?</h1><p className="muted">Use a preferred display name. Your legal or full name is not required.</p><label className="field-label">Display name</label><TextInput value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={30} />{error && <div className="form-error"><Icon name="info" />{error}</div>}<Button className="full" type="submit">Continue</Button></form>}
      {stage === "consent" && <div className="auth-panel consent-panel"><span className="eyebrow">Before you continue</span><h1>Understand ONY’s role.</h1><p>ONY is an AI-based emotional-support and reflection tool. It is not a psychologist, therapist, medical professional, or emergency service. AI responses may be inaccurate.</p><div className="legal-links"><Button variant="secondary" onClick={() => setLegal("disclaimer")}>Disclaimer & AI limitations</Button><Button variant="secondary" onClick={() => setLegal("terms")}>Terms & Conditions</Button><Button variant="secondary" onClick={() => setLegal("privacy")}>Privacy Policy</Button><Button variant="secondary" onClick={() => setLegal("crisis")}>Crisis information</Button></div><label className="check-row consent-check"><TextInput type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>I have read and accept the draft Terms and Privacy Policy, and understand ONY’s limitations.</span></label><Button className="full" disabled={!accepted} onClick={onComplete}>Accept and personalise ONY</Button><small>Draft documents require legal, privacy, and clinical-safety review before launch.</small></div>}
    </section>
  </div></div>;
}

function LegalDocument({ document, back }: { document: LegalDocumentId; back: () => void }) {
  const content: Record<LegalDocumentId, { title: string; subtitle: string; sections: { heading: string; text: string }[] }> = {
    disclaimer: { title: "Disclaimer & AI limitations", subtitle: "Draft for review", sections: [{ heading: "What ONY is", text: "ONY is designed for emotional support, self-reflection, and educational self-help. It is not medical care, therapy, diagnosis, or an emergency service." }, { heading: "AI limitations", text: "Generated responses can be incomplete, inaccurate, or biased. ONY aims to reduce harmful responses but cannot guarantee an unbiased or correct answer." }, { heading: "Your choices", text: "You can stop a conversation, change persona, manage memories, or seek qualified professional support at any time." }] },
    terms: { title: "Terms & Conditions", subtitle: "Draft—not final legal terms", sections: [{ heading: "Appropriate use", text: "Use ONY for personal reflection and support. Do not rely on it for diagnosis, treatment decisions, emergency response, or instructions that could harm someone." }, { heading: "Prototype availability", text: "This frontend demonstration may change, lose local state, or show simulated functionality. It does not create a production service agreement." }, { heading: "Community", text: "Public posts must respect privacy, consent, moderation rules, and the safety of other people." }] },
    privacy: { title: "Privacy Policy", subtitle: "Draft for privacy review", sections: [{ heading: "Information involved", text: "A future service may process account details, profile preferences, conversations, consented memories, mood check-ins, and optional broad location selections." }, { heading: "Current prototype", text: "Current data is temporary frontend state. No authentication, AI, analytics, secure database, or production deletion service is connected." }, { heading: "Model improvement", text: "This prototype sends nothing to an AI model. A production policy must state whether provider retention or model improvement applies before any AI connection is enabled." }, { heading: "Location", text: "Precise location should not be required for browsing. Nearby search must request separate permission and offer manual area selection." }] },
    crisis: { title: "Crisis & emergency support", subtitle: "Confirm local details before relying on them", sections: [{ heading: "Immediate danger", text: "If you or someone else may be in immediate danger, contact your local emergency service or go to the nearest emergency department." }, { heading: "What ONY cannot do", text: "ONY is not monitored live, cannot dispatch responders, and will not automatically message a contact or share your location." }, { heading: "Before launch", text: "Crisis contacts, service hours, and regional availability must be verified from authoritative sources and kept current." }] },
  };
  const item = content[document];
  return <><PageHeader title={item.title} subtitle={item.subtitle} back={back} /><section className="page-pad legal-document"><span className="prototype-label">Draft content</span>{item.sections.map((section) => <div className="card" key={section.heading}><h3>{section.heading}</h3><p>{section.text}</p></div>)}<p className="disclaimer"><Icon name="info" />This document is written for prototype clarity and requires professional legal review before launch.</p></section></>;
}

function LegalHub({ back, navigate }: { back: () => void; navigate: (screen: Screen) => void }) {
  const [document, setDocument] = useState<LegalDocumentId | null>(null);
  if (document) return <LegalDocument document={document} back={() => setDocument(null)} />;
  return <><PageHeader title="Legal & safety" subtitle="Draft documents and limitations" back={back} /><section className="page-pad"><div className="help-hero"><Icon name="shield" /><div><h2>Clear information, easy to revisit.</h2><p>These prototype documents are separated for readability and require review before launch.</p></div></div><div className="menu legal-menu">{([["disclaimer", "Disclaimer & AI limitations"], ["terms", "Terms & Conditions"], ["privacy", "Privacy Policy"], ["crisis", "Crisis & emergency information"]] as [LegalDocumentId, string][]).map(([id, title]) => <Button key={id} variant="ghost" onClick={() => setDocument(id)}><span><strong>{title}</strong><small>Draft for review</small></span><Icon name="chevron" /></Button>)}</div><Button className="full" variant="secondary" onClick={() => navigate("privacy")}>Open privacy controls</Button></section></>;
}

function Onboarding({ step, setStep, displayName, consent, setConsent, language, setLanguage, selectedTopics, setSelectedTopics, theme, setTheme, companion, setCompanion, persona, setPersona, soundOn, setSoundOn }: {
  step: number; setStep: (v: number) => void; displayName: string; consent: string; setConsent: (v: string) => void;
  language: string; setLanguage: (v: string) => void; selectedTopics: string[]; setSelectedTopics: (v: string[]) => void;
  theme: Theme; setTheme: (v: Theme) => void;
  companion: Companion; setCompanion: (v: Companion) => void;
  persona: Persona; setPersona: (v: Persona) => void;
  soundOn: boolean; setSoundOn: (v: boolean) => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  return (
    <div className={`app-shell onboarding-shell theme-${theme}`}>
      <div className="phone onboarding">
        <div className={`environment environment-${theme}`} aria-hidden="true"><i /><i /><i /></div>
        <div className="progress"><span style={{ width: `${((step + 1) / 9) * 100}%` }} /></div>
        <div className="onboarding-body">
          {step === 0 && <>
            <img className={`brand-art ${step === 0 ? "hero-art" : ""}`} src={logo} alt="Official ONY cat mascot with green leaves" />
            <div className="eyebrow">Welcome to</div><h1>ONY</h1>
            <p className="lead">A gentle place to pause, share, and feel a little less alone.</p>
          </>}
          {step === 1 && <>
            <img className="brand-art compact-art" src={logo} alt="Official ONY logo" />
            <div className="eyebrow">Meet ONY</div><h1>Your low-pressure companion</h1>
            <p className="lead">ONY is a gentle first layer for everyday emotional support—always at your pace.</p>
          </>}
          {step === 2 && <>
            <SmallLogo /><div className="eyebrow">Make ONY yours</div><h1>Choose your ONY companion</h1>
            <p className="lead">Choose a companion appearance that feels right. Your companion is always called ONY.</p>
            <CompanionPicker value={companion} setValue={setCompanion} />
          </>}
          {step === 3 && <>
            <SmallLogo /><div className="eyebrow">Your calming space</div><h1>Choose a space that feels comfortable for you</h1>
            <p className="lead">Pick a visual theme. Your choice applies throughout the app and can be changed later.</p>
            <ThemePicker value={theme} setValue={setTheme} />
          </>}
          {step === 4 && <>
            <SmallLogo /><div className="eyebrow">Optional ambience</div><h1>Add a calming sound</h1>
            <p className="lead">Try simulated {themeOptions.find((item) => item.id === theme)?.name.toLowerCase()} ambience. You can pause or change it anytime.</p>
            <div className="ambient-onboarding"><span className={`sound-orb ${soundOn ? "playing" : ""}`}><i /><i /><i /></span><strong>{soundOn ? "Ambience playing" : "Ambience paused"}</strong><Button onClick={() => setSoundOn(!soundOn)}>{soundOn ? "Pause" : "Play"}</Button></div>
            <Button className="full" variant="ghost" onClick={() => setSoundOn(false)}>Continue without sound</Button>
          </>}
          {step === 5 && <>
            <SmallLogo /><div className="eyebrow">Personalise ONY</div><h1>What would feel helpful?</h1>
            <p className="lead">Choose how ONY communicates, a language, and any topics on your mind.</p>
            <PersonaPicker value={persona} setValue={setPersona} compact />
            <div className="segmented">{["English", "Bahasa Melayu", "中文"].map((x) => <Button key={x} variant={language === x ? "primary" : "secondary"} onClick={() => setLanguage(x)}>{x}</Button>)}</div>
            <div className="chips">{topics.map((x) => <Button key={x} variant={selectedTopics.includes(x) ? "primary" : "secondary"} onClick={() => setSelectedTopics(selectedTopics.includes(x) ? selectedTopics.filter((t) => t !== x) : [...selectedTopics, x])}>{x}</Button>)}</div>
          </>}
          {step === 6 && <>
            <img className="brand-art compact-art" src={logo} alt="Official ONY logo" />
            <div className="eyebrow">Clear boundaries</div><h1>Support, not treatment</h1>
            <p className="lead">ONY offers AI-based emotional support and self-help resources. It is not a psychologist, therapist, diagnostic tool, or emergency service.</p>
            <div className="boundary-list"><span>Not therapy</span><span>No diagnosis</span><span>Not emergency care</span></div>
            <p className="disclaimer"><Icon name="info" />AI responses may be inaccurate. Safety information, crisis resources, and privacy details remain available in the app.</p>
            <label className="check-row"><TextInput type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /><span>I understand ONY’s role and limitations.</span></label>
          </>}
          {step === 7 && <>
            <SmallLogo />
            <div className="eyebrow">Your privacy</div><h1>What should ONY remember?</h1>
            <p className="lead">You are always in control. Review, pause, or delete memories anytime.</p>
            <Choice active={consent === "allow"} onClick={() => setConsent("allow")} title="Allow relevant memories" text="ONY may save helpful context you share." />
            <Choice active={consent === "control"} onClick={() => setConsent("control")} title="Let me control memories" text="Ask before anything is saved." />
          </>}
          {step === 8 && <>
            <div className="companion-confirm"><CompanionAvatar companion={companion} large /><img src={logo} alt="Official ONY logo" /></div>
            <div className="eyebrow">You’re all set</div><h1>Enter ONY for free</h1>
            <p className="lead">Explore core conversations, basic mood check-ins, and essential support before deciding whether you want more.</p>
            <div className="demo-profile"><span className="avatar">{displayName[0]?.toUpperCase()}</span><div><strong>{displayName}</strong><small>{companion} appearance · {themeOptions.find((item) => item.id === theme)?.name}</small></div><Icon name="check" /></div>
          </>}
        </div>
        <div className="onboarding-actions">
          {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}
          <Button className="grow" disabled={step === 6 && !acknowledged} onClick={() => setStep(step + 1)}>{step === 8 ? "Enter ONY" : "Continue"}</Button>
        </div>
      </div>
    </div>
  );
}

function PersonaPicker({ value, setValue, compact = false }: { value: Persona; setValue: (v: Persona) => void; compact?: boolean }) {
  return <div className={`persona-grid ${compact ? "compact" : ""}`}>{personaOptions.map((item) => <Button key={item.id} variant="secondary" className={value === item.id ? "active" : ""} onClick={() => setValue(item.id)}><span className="persona-check">{value === item.id && <Icon name="check" />}</span><strong>{item.name}</strong><small>{item.note}</small>{!compact && <p>“{item.preview}”</p>}</Button>)}</div>;
}

function CompanionAvatar({ companion, large = false }: { companion: Companion; large?: boolean }) {
  if (companion === "Cat") return <img className={`companion-logo ${large ? "large" : ""}`} src={logo} alt="ONY Cat companion" />;
  return <span className={`companion-face animal-${companion.toLowerCase()} ${large ? "large" : ""}`} aria-label={`ONY with ${companion.toLowerCase()} appearance`}><i className="ear left" /><i className="ear right" /><i className="face-patch" /><i className="eye left" /><i className="eye right" /><i className="nose" /><small>ONY</small></span>;
}

function CompanionPicker({ value, setValue }: { value: Companion; setValue: (v: Companion) => void }) {
  const companions: Companion[] = ["Cat", "Dog", "Bunny", "Bear", "Fox", "Panda"];
  return <div className="companion-grid">{companions.map((item) => <button key={item} className={value === item ? "active" : ""} onClick={() => setValue(item)}><CompanionAvatar companion={item} /><strong>{item}</strong>{value === item && <span><Icon name="check" /></span>}</button>)}</div>;
}

function ThemePicker({ value, setValue }: { value: Theme; setValue: (v: Theme) => void }) {
  return <div className="theme-grid">{themeOptions.map((item) => <button key={item.id} className={`theme-option ${value === item.id ? "active" : ""}`} onClick={() => setValue(item.id)}><span className={`theme-preview preview-${item.id}`}><i /><i /><i /></span><strong>{item.name}</strong><small>{item.note}</small>{value === item.id && <b><Icon name="check" /></b>}</button>)}</div>;
}

function SmallLogo() {
  return <img className="small-logo" src={logo} alt="ONY" />;
}

function Choice({ active, onClick, title, text }: { active: boolean; onClick: () => void; title: string; text?: string }) {
  return <button className={`choice ${active ? "active" : ""}`} onClick={onClick}><span className="choice-radio">{active && <span />}</span><span><strong>{title}</strong>{text && <small>{text}</small>}</span></button>;
}

function PageHeader({ title, subtitle, back, action }: { title: string; subtitle?: string; back?: () => void; action?: ReactNode }) {
  return <header className="page-header">{back ? <Button variant="ghost" className="icon-btn" onClick={back}><Icon name="back" /></Button> : <SmallLogo />}<div className="header-copy"><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action || <span className="header-spacer" />}</header>;
}

function ChatHome({ navigate, goTab, displayName, companion, persona, soundOn, setSoundOn, conversations, setConversations, activeChatId, setActiveChatId, selectedFolderId, memories, setMemories, registerFreeUse, notify }: {
  navigate: (s: Screen) => void; goTab: (t: Tab) => void; displayName: string; companion: Companion; persona: Persona; soundOn: boolean; setSoundOn: (v: boolean) => void;
  conversations: Conversation[]; setConversations: (value: Conversation[] | ((items: Conversation[]) => Conversation[])) => void; activeChatId: number | null; setActiveChatId: (id: number | null) => void;
  selectedFolderId: number | null;
  memories: Memory[]; setMemories: (items: Memory[]) => void; registerFreeUse: () => void; notify: (s: string) => void;
}) {
  const activeIdRef = useRef<number | null>(activeChatId);
  activeIdRef.current = activeChatId;
  const messages = conversations.find((chat) => chat.id === activeChatId)?.messages || [];
  const setMessages = (update: Message[] | ((items: Message[]) => Message[])) => {
    const id = activeIdRef.current;
    if (id === null) {
      const next = typeof update === "function" ? update([]) : update;
      const firstText = next.find((message) => message.from === "user")?.text || "New conversation";
      const lower = firstText.toLowerCase();
      const category = lower.includes("job") || lower.includes("work") ? "Career" : lower.includes("study") || lower.includes("exam") ? "Study" : lower.includes("relationship") ? "Relationships" : lower.includes("stress") || lower.includes("anxious") || lower.includes("overwhelmed") ? "Emotional Wellbeing" : "Other";
      const title = lower.includes("job") ? "Job search" : lower.includes("study") ? "Study pressure" : lower.includes("anxious") ? "Feeling anxious" : lower.includes("stress") || lower.includes("overwhelmed") ? "Feeling overwhelmed" : firstText.slice(0, 32);
      const newId = Date.now();
      activeIdRef.current = newId;
      setActiveChatId(newId);
      setConversations((items) => [{ id: newId, title, category, day: "Today", folderId: selectedFolderId || undefined, reportAllowed: true, messages: next }, ...items]);
      return;
    }
    setConversations((items) => items.map((chat) => chat.id === id ? { ...chat, messages: typeof update === "function" ? update(chat.messages) : update } : chat));
  };
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "recording" | "sent">("idle");
  const [savedMemoryId, setSavedMemoryId] = useState<number | null>(null);
  const suggestions = ["I feel stressed", "I feel anxious", "I need someone to talk to", "Find a job", "Study pressure", "I want to relax"];
  const reply = (text: string) => {
    if (!text.trim()) return;
    setSavedMemoryId(null);
    const lower = text.toLowerCase();
    if (lower.includes("hurt myself") || lower.includes("self-harm") || lower.includes("suicide")) {
      setMessages((m) => [...m, { from: "user", text }, { from: "ony", text: "I’m really sorry you’re going through this. You don’t have to handle it alone. Let’s focus on getting you immediate human support." }]); setInput(""); return;
    }
    if (lower.includes("find a job") || lower.includes("finding work") || lower.includes("job opportunities")) {
      registerFreeUse();
      setMessages((m) => [...m, { from: "user", text }, { from: "ony", text: "I can help you explore sample opportunities. First, what kind of work are you looking for?" }]);
      setInput("");
      return;
    }
    if (lower.includes("professional support") || lower.includes("therapist") || lower.includes("counsellor")) {
      setMessages((m) => [...m, { from: "user", text }, { from: "ony", text: "I can show you peer support and qualified professional options. You can choose what feels right." }]);
      window.setTimeout(() => navigate("professional"), 500); return;
    }
    if (lower.includes("remember this")) { registerFreeUse(); setMessages((m) => [...m, { from: "user", text }, { from: "ony", text: "I can save that as a private memory if you’d like." }]); setInput(""); return; }
    if (lower.includes("show my memories")) { goTab("memory"); return; }
    if (lower.includes("community")) { goTab("community"); return; }
    if (lower.includes("something relaxing") || lower.includes("help me relax") || lower.includes("want to relax")) { window.setTimeout(() => navigate("wellbeing"), 350); return; }
    registerFreeUse();
    const baseResponse = lower.includes("lonely")
      ? "That sounds lonely, especially when you’ve been carrying it quietly. Would it help to tell me when it feels strongest?"
      : lower.includes("study") || lower.includes("exam")
        ? "It sounds like there’s a lot riding on this. Let’s make it smaller: what’s the one task that feels most urgent?"
        : lower.includes("work")
          ? "Work pressure can follow you home. What happened today that’s still sitting with you?"
          : lower.includes("relationship")
            ? "It makes sense that this feels heavy. You don’t have to decide everything now—what part hurts most?"
            : lower.includes("stress")
              ? "I hear you. Before we solve anything, take one slow breath with me. What’s taking up the most space in your mind?"
              : "I’m listening. You don’t need to make it sound neat—tell me whatever feels important right now.";
    const response = persona === "friendly"
      ? `I’m with you. ${baseResponse.replace("I hear you. ", "").replace("I’m listening. ", "")}`
      : persona === "calm"
        ? `Let’s pause here. ${baseResponse.replace("I hear you. ", "").replace("I’m listening. ", "")}`
        : baseResponse;
    setMessages((m) => [...m, { from: "user", text }]); setInput(""); setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { from: "ony", text: response }]);
    }, 650);
  };
  const submit = (e: FormEvent) => { e.preventDefault(); reply(input); };
  const handleVoice = () => {
    if (voiceState === "idle" || voiceState === "sent") {
      setVoiceState("listening");
      window.setTimeout(() => setVoiceState("recording"), 450);
    }
    else if (voiceState === "listening") setVoiceState("recording");
    else if (voiceState === "recording") { registerFreeUse(); setVoiceState("sent"); setMessages((m) => [...m, { from: "user", text: "I’ve been feeling a bit overwhelmed today." }, { from: "ony", text: "I hear you. Thank you for saying it out loud. Would you like something calming, or would you rather talk through what feels heaviest?" }]); notify("Voice transcribed and sent"); }
    else setVoiceState("idle");
  };
  const latestUserText = [...messages].reverse().find((message) => message.from === "user")?.text || "";
  const latestLower = latestUserText.toLowerCase();
  const safetyContext = ["hurt myself", "self-harm", "suicide", "not safe", "end my life"].some((phrase) => latestLower.includes(phrase));
  const memoryContext = ["always", "helps me", "calmer when", "remember this", "important to me", "i prefer", "i like"].some((phrase) => latestLower.includes(phrase));
  const anxietyContext = ["anxious", "anxiety", "stress", "overwhelmed", "panic"].some((phrase) => latestLower.includes(phrase));
  const studyContext = ["study", "exam", "assignment", "class"].some((phrase) => latestLower.includes(phrase));
  const jobContext = ["job", "work opportunity", "internship", "career"].some((phrase) => latestLower.includes(phrase));
  const relationshipContext = ["relationship", "partner", "boyfriend", "girlfriend", "friendship"].some((phrase) => latestLower.includes(phrase));
  const saveContextMemory = () => {
    const id = Date.now();
    setMemories([{ id, text: latestUserText, category: "Things That Help Me", active: true, kind: "text", reason: "You chose to remember this during an ONY conversation." }, ...memories]);
    setSavedMemoryId(id);
    notify("Saved to your Memory Vault");
  };
  const undoContextMemory = () => {
    if (savedMemoryId !== null) setMemories(memories.filter((memory) => memory.id !== savedMemoryId));
    setSavedMemoryId(null);
    notify("Memory removed");
  };
  return <div className="chat-page">
    <PageHeader title="Chat with ONY" subtitle="Here with you, at your pace" action={<div className="chat-header-actions"><Button variant="secondary" onClick={() => navigate("mood")}>Mood</Button><Button variant="secondary" onClick={() => navigate("help")}>Help</Button></div>} />
    <div className="chat-scroll">
    <div className="chat-history-entry"><Button variant="secondary" onClick={() => navigate("chatHistory")}><Icon name="chat" />Chats</Button><div className="chat-trust-links"><Button variant="ghost" onClick={() => navigate("riskDemo")}>Safety demo</Button><Button variant="ghost" onClick={() => navigate("resources")}>Resources</Button></div></div>
    {messages.length > 0 && <div className="memory-note"><Icon name="memory" /><span>Memory is on · You’re in control</span><Button variant="ghost" onClick={() => goTab("memory")}>View</Button></div>}
    {messages.length === 0 && <div className="chat-welcome"><div className="companion-stage"><CompanionAvatar companion={companion} large /><span className="leaf-accent">ONY</span></div><span className="persona-label">{personaOptions.find((item) => item.id === persona)?.name}</span><h1>Hi {displayName}, I’m here.</h1><p>{personaOptions.find((item) => item.id === persona)?.preview}</p><div className="welcome-suggestions">{suggestions.map((s) => <button key={s} onClick={() => reply(s)}>{s}<Icon name="chevron" /></button>)}</div><div className="ambient-mini"><span>{soundOn ? "Ambient sound playing" : "Calming ambience"}</span><Button variant="ghost" onClick={() => setSoundOn(!soundOn)}>{soundOn ? "Pause" : "Play"}</Button></div></div>}
    {messages.length > 0 && <div className="messages">
      {messages.map((m, i) => <div key={i} className={`message-row ${m.from}`} >
        {m.from === "ony" && <CompanionAvatar companion={companion} />}
        <div className="message">{m.text}</div>
      </div>)}
      {typing && <div className="message-row ony"><CompanionAvatar companion={companion} /><div className="message typing"><i /><i /><i /></div></div>}
      {!typing && <div className="context-actions">
        {safetyContext && <><Button variant="danger" onClick={() => navigate("safety")}>Get help now</Button><Button variant="secondary" onClick={() => navigate("professional")}>Find professional support</Button><Button variant="secondary" onClick={() => navigate("trusted")}>Contact trusted person</Button></>}
        {!safetyContext && memoryContext && (savedMemoryId === null ? <Button variant="secondary" onClick={saveContextMemory}><Icon name="memory" />Remember this</Button> : <div className="memory-saved"><Icon name="check" /><span>Saved to your Memory Vault.</span><Button variant="ghost" onClick={undoContextMemory}>Undo</Button></div>)}
        {!safetyContext && anxietyContext && <><Button variant="secondary" onClick={() => navigate("wellbeing")}>Try something calming</Button><Button variant="secondary" onClick={() => notify("One-minute breathing activity opened")}>Breathing activity</Button><Button variant="secondary" onClick={() => navigate("wellbeing")}>Calming music</Button></>}
        {!safetyContext && studyContext && <><Button variant="secondary" onClick={() => reply("Help me make a study plan")}>Study plan</Button><Button variant="secondary" onClick={() => notify("A five-minute break timer started")}>Take a break</Button><Button variant="secondary" onClick={() => reply("I want to talk about my study pressure")}>Talk about it</Button></>}
        {!safetyContext && jobContext && <><Button variant="secondary" onClick={() => navigate("jobs")}>Find job opportunities</Button><Button variant="secondary" onClick={() => navigate("jobPrefs")}>Set job preferences</Button></>}
        {!safetyContext && relationshipContext && <><Button variant="secondary" onClick={() => reply("I want to tell you more about it")}>Tell me more</Button><Button variant="secondary" onClick={() => reply("Help me reflect on this relationship")}>Help me reflect</Button></>}
      </div>}
    </div>}
    </div>
    <div className="chat-composer">
      <Button variant="ghost" className="ai-notice" onClick={() => navigate("resources")}><Icon name="info" />AI can be inaccurate · Not diagnosis or treatment</Button>
      <div className="mode-switch"><button className={inputMode === "voice" ? "active" : ""} onClick={() => setInputMode("voice")}><Icon name="mic" />Voice</button><button className={inputMode === "text" ? "active" : ""} onClick={() => setInputMode("text")}><Icon name="chat" />Text</button></div>
      {inputMode === "voice" ? <div className={`voice-composer state-${voiceState}`}><button className="primary-mic" onClick={handleVoice}><Icon name={voiceState === "recording" ? "close" : voiceState === "sent" ? "check" : "mic"} /></button><div><strong>{voiceState === "idle" ? "Tap to speak" : voiceState === "listening" ? "Listening…" : voiceState === "recording" ? "Recording · tap Done" : "Message sent"}</strong><small>{voiceState === "listening" ? "Start talking when you’re ready" : voiceState === "recording" ? "00:08 · Stop / Done" : voiceState === "sent" ? "Tap the mic to speak again" : "Voice stays in this demo"}</small></div></div> :
    <form className="chat-input" onSubmit={submit}>
      <TextInput value={input} onChange={(e) => setInput(e.target.value)} placeholder="Share what’s on your mind..." aria-label="Message ONY" />
      <Button className="send-btn" type="submit"><Icon name="send" /></Button>
    </form>}
    </div>
  </div>;
}

function MoodCheck({ back, navigate, entries, setEntries, notify }: { back: () => void; navigate: (s: Screen) => void; entries: MoodEntry[]; setEntries: (entries: MoodEntry[]) => void; notify: (s: string) => void }) {
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const selected = mood === null ? null : moodOptions[mood];
  const save = () => {
    if (!selected || mood === null) return;
    setEntries([{ id: Date.now(), level: mood + 1, emoji: selected.emoji, label: selected.label, note: note.trim(), createdAt: new Date().toISOString(), reportAllowed: true }, ...entries]);
    setDone(true);
    notify("Added to your private mood history");
  };
  if (done && selected) return <div className="centered-state"><img src={logo} alt="ONY" /><div className="success-mark"><Icon name="check" /></div><h1>Check-in saved</h1><p>You chose <strong>{selected.emoji} {selected.label}</strong>. One check-in cannot capture everything you’re feeling, but it can be a useful moment of reflection.</p><Button onClick={() => navigate("trend")}>View mood history</Button><Button variant="ghost" onClick={back}>Back to chat</Button></div>;
  return <><PageHeader title="Mood check-in" subtitle="A quick moment for you" back={back} /><section className="page-pad">
    <div className="eyebrow">Right now</div><h1>How is your mood today?</h1><p className="muted">Choose the closest fit. An emoji is only one small part of how you feel.</p>
    <div className="mood-scale emoji-scale">{moodOptions.map((option, index) => <button key={option.label} onClick={() => setMood(index)} className={mood === index ? "active" : ""} aria-pressed={mood === index}><span>{option.emoji}</span><small>{option.label}</small></button>)}</div>
    <div className="selected-mood">{selected ? <><span>{selected.emoji}</span><strong>{selected.label}</strong></> : <p>Select a mood to continue.</p>}</div>
    <label className="field-label">What’s contributing to your mood today? <small>Optional</small></label><TextArea rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Write as much or as little as you like…" />
    <Button className="full" disabled={!selected} onClick={save}>Save check-in</Button>
    <Button className="full" variant="ghost" onClick={() => navigate("trend")}>Review previous check-ins</Button>
  </section></>;
}

function MoodTrend({ back, entries, setEntries }: { back: () => void; entries: MoodEntry[]; setEntries: (entries: MoodEntry[]) => void }) {
  const recent = entries[0];
  return <><PageHeader title="Mood history" subtitle="Private reflection, not a diagnosis" back={back} /><section className="page-pad">
    {recent && <div className="trend-summary"><div><span>Most recent</span><strong>{recent.emoji} {recent.label}</strong><small>{new Date(recent.createdAt).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}</small></div><span className="score">{recent.level}/5</span></div>}
    {entries.length === 0 ? <div className="empty"><span className="empty-emoji">😐</span><h3>No mood check-ins yet</h3><p>Your saved check-ins will appear here after you choose to record one.</p></div> : <><div className="card"><div className="card-title"><h3>Your entries</h3><span>{entries.length} saved</span></div><div className="mood-history-list">{entries.map((entry) => <div key={entry.id}><span className="history-emoji">{entry.emoji}</span><div><strong>{entry.label}</strong><small>{new Date(entry.createdAt).toLocaleString("en-MY", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</small>{entry.note && <p>{entry.note}</p>}</div><Toggle on={entry.reportAllowed} setOn={(value) => setEntries(entries.map((item) => item.id === entry.id ? { ...item, reportAllowed: value } : item))} /><Button variant="ghost" onClick={() => setEntries(entries.filter((item) => item.id !== entry.id))}><Icon name="trash" /></Button></div>)}</div></div>{entries.length >= 3 ? <div className="card"><h3>Recent pattern</h3><div className="bars mood-entry-bars">{[...entries].reverse().slice(-7).map((entry) => <div key={entry.id}><span style={{ height: `${entry.level * 20}%` }} /><small>{entry.emoji}</small></div>)}</div><p className="muted">A simple view of your saved entries, not a clinical interpretation.</p></div> : <div className="community-note"><Icon name="info" />At least three included check-ins are needed before ONY shows a simple trend.</div>}</>}
    <p className="disclaimer"><Icon name="info" />Use the switch beside an entry to include or exclude it from monthly reports. Deleting an entry removes it from this local prototype state.</p>
  </section></>;
}

function MemoryVault({ memories: items, setMemories: setItems, navigate, setEditingMemory, companion, notify }: {
  memories: Memory[]; setMemories: (v: Memory[]) => void; navigate: (s: Screen) => void;
  setEditingMemory: (v: Memory | null) => void; companion: Companion; notify: (s: string) => void;
}) {
  const [query, setQuery] = useState("");
  const update = (id: number, patch: Partial<Memory>) => setItems(items.map((x) => x.id === id ? { ...x, ...patch } : x));
  return <><PageHeader title="Memory Vault" subtitle={`${items.filter((x) => x.active).length} active memories`} /><section className="page-pad topless">
    <div className="search"><Icon name="search" /><TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search memories" /></div>
    <div className="vault-intro"><div><span className="eyebrow">You’re in control</span><h2>What ONY remembers</h2><p>Pause, edit, or remove anything. Changes affect future conversations.</p></div><Icon name="memory" /></div>
    <Button className="full add-memory-btn" onClick={() => { setEditingMemory(null); navigate("addMemory"); }}>+ Add Memory</Button>
    <div className="section-head"><h3>Saved memories</h3><Button variant="ghost" onClick={() => { setItems([]); notify("All memories cleared"); }}>Clear all</Button></div>
    {items.filter((x) => x.text.toLowerCase().includes(query.toLowerCase())).map((item) => <div className={`memory-card ${!item.active ? "paused" : ""}`} key={item.id}>
      <div className="memory-top"><span className="memory-icon"><Icon name="memory" /></span><Toggle on={item.active} setOn={(v) => update(item.id, { active: v })} /></div>
      {item.kind === "image" && <div className={`memory-image ${item.imageTone || "forest"}`}><span>Image memory</span></div>}
      {item.category && <span className="memory-category">{item.category}</span>}<strong>{item.text}</strong>
      <details><summary>ONY remembers this because…</summary><p>{item.reason}</p></details>
      <div className="memory-actions"><Button variant="ghost" onClick={() => { setEditingMemory(item); navigate("addMemory"); }}><Icon name="edit" />Edit</Button><Button variant="ghost" onClick={() => { setItems(items.filter((x) => x.id !== item.id)); notify("Memory deleted"); }}><Icon name="trash" />Delete</Button></div>
    </div>)}
    {!items.length && <div className="empty"><CompanionAvatar companion={companion} large /><h3>Your vault is clear</h3><p>New memories will only appear with your permission.</p></div>}
    <div className="privacy-row"><Icon name="shield" /><div><strong>Memory privacy controls</strong><p>Ask before saving is currently {items.length ? "off" : "on"}.</p></div><Toggle on={memoryConsentOn(items)} setOn={() => notify("Memory preference updated")} /></div>
  </section></>;
}
const memoryConsentOn = (items: Memory[]) => items.length > 0;

function AddMemory({ back, memories, setMemories, editing, notify }: {
  back: () => void; memories: Memory[]; setMemories: (v: Memory[]) => void; editing: Memory | null; notify: (s: string) => void;
}) {
  const [text, setText] = useState(editing?.text || "");
  const [category, setCategory] = useState(editing?.category || "");
  const [active, setActive] = useState(editing?.active ?? true);
  const [kind, setKind] = useState<"text" | "image">(editing?.kind || "text");
  const [imageSelected, setImageSelected] = useState(editing?.kind === "image");
  const save = () => {
    const item: Memory = { id: editing?.id || Date.now(), text: text || "A special image memory", category: category || undefined, active, kind, imageTone: kind === "image" ? "forest" : undefined, reason: editing?.reason || "You added this directly to your Memory Vault." };
    setMemories(editing ? memories.map((memory) => memory.id === editing.id ? item : memory) : [item, ...memories]);
    notify(editing ? "Memory updated" : "Memory added to your Vault");
    back();
  };
  return <><PageHeader title={editing ? "Edit memory" : "Add memory"} subtitle="Only save what feels helpful" back={back} /><section className="page-pad">
    <div className="help-hero"><Icon name="memory" /><div><h2>You decide what stays.</h2><p>ONY can only use this memory while the switch below is on.</p></div></div>
    <div className="memory-type"><Button variant={kind === "text" ? "primary" : "secondary"} onClick={() => setKind("text")}>Text Memory</Button><Button variant={kind === "image" ? "primary" : "secondary"} onClick={() => setKind("image")}>Image Memory</Button></div>
    {kind === "image" && <button className={`image-upload ${imageSelected ? "selected" : ""}`} onClick={() => { setImageSelected(true); notify("Demo image selected"); }}>{imageSelected ? <><span className="sample-photo"><i /></span><strong>Forest walk.jpg</strong><small>Tap to replace demo image</small></> : <><Icon name="market" /><strong>Select an image</strong><small>Prototype placeholder · no file is uploaded</small></>}</button>}
    <label className="field-label">{kind === "text" ? "What should ONY remember?" : "Caption (optional)"}</label><TextArea rows={kind === "text" ? 5 : 3} value={text} onChange={(e) => setText(e.target.value)} placeholder={kind === "text" ? "For example: I feel calmer when I listen to music." : "A quiet walk that made me feel grounded."} />
    <label className="field-label">Category</label><div className="chips memory-categories">{["About Me", "Preferences", "Important People", "Goals", "Things That Help Me", "Special Memories"].map((item) => <Button key={item} variant={category === item ? "primary" : "secondary"} onClick={() => setCategory(item)}>{item}</Button>)}</div>
    <div className="setting-toggle"><div><strong>Allow ONY to use this</strong><p>Applies to future companion conversations.</p></div><Toggle on={active} setOn={setActive} /></div>
    <Button className="full" disabled={kind === "text" ? !text.trim() : !imageSelected} onClick={save}>Save memory</Button><Button className="full" variant="secondary" onClick={back}>Cancel</Button>
  </section></>;
}

function Community({ navigate, openPost, openMember, notify }: { navigate: (s: Screen) => void; openPost: (post: Post) => void; openMember: (user: GlobeUser) => void; notify: (s: string) => void }) {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"globe" | "posts">(() => {
    const showPosts = sessionStorage.getItem("ony-show-posts") === "true";
    sessionStorage.removeItem("ony-show-posts");
    return showPosts ? "posts" : "globe";
  });
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [regionLevel, setRegionLevel] = useState(0);
  const [locationChoice, setLocationChoice] = useState<"none" | "declined" | "allowed">("none");
  const [manualArea, setManualArea] = useState("");
  const [discoverable, setDiscoverable] = useState(false);
  const [acceptMessages, setAcceptMessages] = useState(true);
  const regions = [
    { label: "World", note: "Discoverable mock users across broad, privacy-safe regions" },
    { label: "Malaysia", note: "Approximate country view; no precise user locations" },
    { label: "Selangor", note: "Approximate state view with more discoverable users" },
    { label: "Petaling district", note: "Broad local area; never a home or current-location view" },
  ];
  const region = regions[regionLevel];
  const drag = useRef({ active: false, moved: false, x: 0, rotation: 0 });
  const globeUsers: GlobeUser[] = [
    { id: 1, moodGlow: "bright", moodLabel: "Good", discoverable: true, acceptsMessages: true, minLevel: 0, lon: -145, lat: 38 },
    { id: 2, moodGlow: "soft", moodLabel: "Okay", discoverable: true, acceptsMessages: false, minLevel: 0, lon: -45, lat: 24 },
    { id: 3, moodGlow: "dim", moodLabel: "Low", discoverable: true, acceptsMessages: true, minLevel: 0, lon: 70, lat: -4 },
    { id: 4, moodGlow: "neutral", moodLabel: "No check-in shared", discoverable: true, acceptsMessages: false, minLevel: 0, lon: 150, lat: 28 },
    { id: 5, moodGlow: "bright", moodLabel: "Great", discoverable: true, acceptsMessages: false, minLevel: 1, lon: 96, lat: 12 },
    { id: 6, moodGlow: "dim", moodLabel: "Very low", discoverable: true, acceptsMessages: true, minLevel: 1, lon: 118, lat: -12 },
    { id: 7, moodGlow: "soft", moodLabel: "Okay", discoverable: true, acceptsMessages: true, minLevel: 2, lon: 132, lat: 22 },
    { id: 8, moodGlow: "neutral", moodLabel: "No check-in shared", discoverable: true, acceptsMessages: true, minLevel: 2, lon: 82, lat: -25 },
    { id: 9, moodGlow: "bright", moodLabel: "Good", discoverable: true, acceptsMessages: true, minLevel: 3, lon: 108, lat: 32 },
    { id: 10, moodGlow: "dim", moodLabel: "Low", discoverable: true, acceptsMessages: false, minLevel: 3, lon: 145, lat: -4 },
    { id: 11, moodGlow: "soft", moodLabel: "Okay", discoverable: false, acceptsMessages: true, minLevel: 3, lon: 118, lat: 18 },
  ];
  const visibleUsers = globeUsers.filter((user) => user.discoverable && user.minLevel <= regionLevel);
  const selectedUser = globeUsers.find((user) => user.id === selectedNode) || null;
  const [posts, setPosts] = useState<Post[]>(() => {
    const demoPosts: Post[] = [
      { id: 1, author: "Nadia · 21", title: "One tiny win during finals week", body: "I put my phone away for 25 minutes and finished one page. Sharing because small still counts.", category: "Study", likes: 34 },
      { id: 2, author: "Anonymous", title: "Starting over at a new job", body: "Week two and I still feel out of place. Today a colleague invited me for lunch, and it helped.", category: "Work", likes: 21, media: "voice" },
      { id: 3, author: "Jia · 24", title: "A low-energy self-care list", body: "Water, shower, clean shirt, one message to a friend. That is enough for some days.", category: "Self-care", likes: 56, media: "image" },
    ];
    const created = sessionStorage.getItem("ony-created-post");
    return created ? [JSON.parse(created) as Post, ...demoPosts] : demoPosts;
  });
  const shown = posts.filter((p) => (filter === "All" || p.category === filter) && `${p.title} ${p.body}`.toLowerCase().includes(query.toLowerCase()));
  return <><PageHeader title="Community" subtitle="Connected gently, across the world" action={<Button className="create-post-top" onClick={() => navigate("post")}>+ Create Post</Button>} /><section className="page-pad community-page">
    <div className="community-view-switch"><Button variant={view === "globe" ? "primary" : "secondary"} onClick={() => setView("globe")}>Community Globe</Button><Button variant={view === "posts" ? "primary" : "secondary"} onClick={() => setView("posts")}>Community Posts</Button></div>
    {view === "globe" && <>
      <div className="community-world full-globe">
        <div className="world-copy">
          <span className="eyebrow">Discoverable people · Simulated</span>
          <div className="region-breadcrumb">{regions.slice(0, regionLevel + 1).map((item, index) => <span key={item.label}>{index > 0 && "›"} {item.label}</span>)}</div>
          <h2>{region.label}</h2><p>{region.note}. Drag to pan and zoom to reveal more opted-in mock users.</p>
        </div>
        <div className="globe-controls"><Button variant="ghost" disabled={regionLevel === 0} onClick={() => { setRegionLevel((level) => Math.max(0, level - 1)); setSelectedNode(null); }}>Zoom out</Button><span>{visibleUsers.length} discoverable mock users</span><Button disabled={regionLevel === regions.length - 1} onClick={() => { setRegionLevel((level) => Math.min(regions.length - 1, level + 1)); setSelectedNode(null); }}>Zoom in</Button></div>
        {regionLevel > 0 && <Button variant="ghost" className="back-world" onClick={() => { setRegionLevel(0); setSelectedNode(null); }}>Back to world</Button>}
        <div className="globe-stage"><div className={`globe globe-level-${regionLevel}`} aria-label={`Interactive mock user globe for ${region.label}`} style={{ backgroundPosition: `${rotation * 1.4}px center` }} onPointerDown={(event) => { drag.current = { active: true, moved: false, x: event.clientX, rotation }; if (!(event.target as HTMLElement).closest(".globe-node")) event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (drag.current.active) { const distance = event.clientX - drag.current.x; if (Math.abs(distance) > 5) drag.current.moved = true; setRotation(drag.current.rotation + distance * .7); } }} onPointerUp={() => { drag.current.active = false; }} onPointerCancel={() => { drag.current.active = false; }}><i className="orbit one" /><i className="orbit two" />{visibleUsers.map((user) => {
          const angle = (user.lon + rotation) * Math.PI / 180;
          const depth = Math.cos(angle);
          const x = 50 + Math.sin(angle) * 43;
          const y = 50 - user.lat * .48;
          return <button aria-label={`Anonymous user node, mood glow ${user.moodLabel}`} key={user.id} className={`globe-node mood-${user.moodGlow} ${selectedNode === user.id ? "selected" : ""}`} style={{ left: `${x}%`, top: `${y}%`, opacity: depth < -.2 ? .38 : depth * .35 + .65, transform: "translate(-50%, -50%)", zIndex: Math.round((depth + 1) * 10) }} onPointerUp={(event) => { if (!drag.current.moved) { drag.current.active = false; event.stopPropagation(); setSelectedNode(user.id); } }}><span /></button>;
        })}</div><span className="rotate-hint">Drag to pan · Each node is one opted-in mock user</span></div>
        {selectedUser && <div className="node-card user-node-card"><Button variant="ghost" className="node-close" onClick={() => setSelectedNode(null)}><Icon name="close" /></Button><span className={`anonymous-light mood-${selectedUser.moodGlow}`} /><span className="prototype-label">Anonymous mock user</span><strong>Someone is here</strong><p>The light reflects an optional mood check-in: {selectedUser.moodLabel.toLowerCase()}. No identity or precise location is shared.</p>{!selectedUser.acceptsMessages && <div className="messages-off-notice"><Icon name="info" />This person is visible but is not receiving supportive messages right now.</div>}<div>{selectedUser.acceptsMessages ? <Button onClick={() => openMember(selectedUser)}>Send Support</Button> : <Button disabled>Support messages off</Button>}<Button variant="ghost" onClick={() => notify("Anonymous user report sent to simulated moderation")}>Report</Button><Button variant="ghost" onClick={() => { notify("Anonymous user blocked in this session"); setSelectedNode(null); }}>Block</Button></div></div>}
        <div className="world-legend mood-legend"><span><i className="bright" />Higher mood</span><span><i className="soft" />Okay</span><span><i className="dim" />Lower mood</span><span><i className="neutral" />No check-in</span><Button variant="ghost" onClick={() => navigate("guidelines")}>Guidelines</Button></div>
      </div>
      <div className="globe-privacy-settings"><div><strong>Appear on the globe</strong><p>When off, your anonymous light is hidden. This prototype setting is independent from messaging.</p></div><Toggle on={discoverable} setOn={setDiscoverable} /></div>
      <div className="globe-privacy-settings"><div><strong>Receive supportive messages</strong><p>When off, your light may still appear if globe visibility is on, but people cannot message you.</p></div><Toggle on={acceptMessages} setOn={setAcceptMessages} /></div>
      <div className="location-choice"><strong>Nearby discovery is optional</strong><p>No precise location is needed. Real nearby discovery would request permission and convert location to a broad area.</p>{locationChoice === "none" && <div><Button onClick={() => setLocationChoice("allowed")}>Allow location for demo</Button><Button variant="secondary" onClick={() => setLocationChoice("declined")}>Choose area manually</Button></div>}{locationChoice === "allowed" && <div className="form-success"><Icon name="check" />Permission simulated only. No device location was accessed.</div>}{locationChoice === "declined" && <div className="folder-create"><TextInput value={manualArea} onChange={(event) => setManualArea(event.target.value)} placeholder="Country, state, city, or postcode" /><Button disabled={!manualArea.trim()} onClick={() => notify(`Sample area set to ${manualArea}`)}>Set area</Button></div>}</div>
      <Button className="full posts-entry" variant="secondary" onClick={() => setView("posts")}>Explore Community Posts</Button><div className="community-note"><Icon name="shield" />All people and message delivery are simulated. Nodes never show exact locations.</div>
    </>}
    {view === "posts" && <>
    <div className="posts-heading"><div><span className="eyebrow">Community posts</span><h2>Shared gently, together.</h2></div><Button variant="ghost" onClick={() => setView("globe")}>Back to globe</Button></div>
    <div className="search"><Icon name="search" /><TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search posts or topics" /></div>
    <div className="scroll-chips">{categories.map((x) => <Button key={x} variant={filter === x ? "primary" : "secondary"} onClick={() => setFilter(x)}>{x}</Button>)}</div>
    <div className="feed">{shown.map((post) => <article className="post-card" key={post.id}>
      <div className="post-meta"><span className="mini-avatar">{post.author[0]}</span><div><strong>{post.author}</strong><small>{post.category} · 2h</small></div><Button variant="ghost" onClick={() => notify("Reported · sent to mock moderation")}>Report</Button></div>
      <button className="post-open" onClick={() => openPost(post)}><h3>{post.title}</h3><p>{post.body}</p></button>
      {post.media === "voice" && <VoiceNote notify={notify} />}
      {post.media === "image" && <div className="post-image"><span>Shared calming image</span></div>}
      <div className="post-actions"><Button variant="ghost" onClick={() => setPosts(posts.map((x) => x.id === post.id ? { ...x, likes: x.likes + 1 } : x))}><Icon name="heart" />{post.likes}</Button><Button variant="ghost" onClick={() => notify("Comment added in demo")}>2 comments</Button><Button variant="ghost" onClick={() => { setPosts(posts.map((x) => x.id === post.id ? { ...x, saved: !x.saved } : x)); notify(post.saved ? "Removed from saved" : "Post saved"); }}><Icon name="memory" />{post.saved ? "Saved" : "Save"}</Button></div>
    </article>)}</div></>}
  </section></>;
}

function CreatePost({ back, notify }: { back: () => void; notify: (s: string) => void }) {
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [category, setCategory] = useState("General"); const [posted, setPosted] = useState(false);
  const [postAs, setPostAs] = useState("Anonymous"); const [media, setMedia] = useState<"text" | "image" | "voice">("text"); const [recording, setRecording] = useState(false); const [recorded, setRecorded] = useState(false);
  if (posted) return <div className="centered-state"><div className="success-mark"><Icon name="check" /></div><h1>Your post is live</h1><p>Thanks for sharing with care. It’s now visible in the prototype community feed.</p><Button onClick={back}>Return to community</Button></div>;
  return <><PageHeader title="Create a post" subtitle="Share kindly, at your pace" back={back} /><section className="page-pad">
    <label className="field-label">Post as</label><div className="segmented"><Button variant={postAs === "ONY profile" ? "primary" : "secondary"} onClick={() => setPostAs("ONY profile")}>My ONY profile</Button><Button variant={postAs === "Anonymous" ? "primary" : "secondary"} onClick={() => setPostAs("Anonymous")}>Anonymous</Button></div>
    <label className="field-label">Format</label><div className="segmented"><Button variant={media === "text" ? "primary" : "secondary"} onClick={() => setMedia("text")}>Text</Button><Button variant={media === "image" ? "primary" : "secondary"} onClick={() => setMedia("image")}>Image</Button><Button variant={media === "voice" ? "primary" : "secondary"} onClick={() => setMedia("voice")}>Voice</Button></div>
    <label className="field-label">Title</label><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What would you like to share?" />
    {media !== "voice" && <><label className="field-label">Your post</label><TextArea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Write what’s on your mind..." /></>}
    {media === "image" && <button className="image-upload selected" onClick={() => notify("Demo community image selected")}><span className="sample-photo sunset"><i /></span><strong>Sunset moment.jpg</strong><small>Tap to replace demo image</small></button>}
    {media === "voice" && <div className="voice-record-card"><button className={recording ? "recording" : ""} onClick={() => { if (recording) { setRecording(false); setRecorded(true); } else setRecording(true); }}><Icon name={recording ? "close" : "mic"} /></button><div><strong>{recording ? "Recording · tap to stop" : recorded ? "Voice message ready · 0:12" : "Record voice message"}</strong><small>{recording ? "00:08" : "No private contact details are shared"}</small></div>{recorded && <Button variant="ghost" onClick={() => notify("Playing voice preview")}>Play</Button>}</div>}
    <label className="field-label">Category</label><div className="chips">{categories.slice(1).map((x) => <Button key={x} variant={category === x ? "primary" : "secondary"} onClick={() => setCategory(x)}>{x}</Button>)}</div><div className="community-note"><Icon name="info" />Community guidelines and moderation apply. Unsafe content can be reported and reviewed.</div><Button className="full" disabled={!title || (media === "text" && !body) || (media === "voice" && !recorded)} onClick={() => {
    sessionStorage.setItem("ony-created-post", JSON.stringify({ id: Date.now(), author: postAs === "Anonymous" ? "Anonymous" : "My ONY profile", title, body: body || "Voice message shared with the community.", category, likes: 0, media: media === "text" ? undefined : media }));
    sessionStorage.setItem("ony-show-posts", "true");
    setPosted(true);
    notify("Post published");
  }}>Publish post</Button></section></>;
}

function VoiceNote({ notify }: { notify: (s: string) => void }) {
  const [playing, setPlaying] = useState(false);
  return <div className="voice-note"><Button className="icon-btn" onClick={() => { setPlaying(!playing); notify(playing ? "Voice paused" : "Playing voice message"); }}><Icon name={playing ? "close" : "send"} /></Button><span className={playing ? "playing" : ""}><i /><i /><i /><i /><i /><i /></span><small>0:12</small></div>;
}

function PostDetail({ back, post, notify }: { back: () => void; post: Post; notify: (text: string) => void }) {
  const [likes, setLikes] = useState(post.likes);
  const [liked, setLiked] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([
    { author: "Anonymous", text: "Small absolutely counts. I needed this reminder today.", time: "38m" },
    { author: "Mei · ONY profile", text: "Proud of you for starting with one page.", time: "12m" },
  ]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!comment.trim()) return;
    setComments([...comments, { author: "My ONY profile", text: comment, time: "now" }]);
    setComment("");
    notify("Comment added");
  };
  return <div className="post-detail-page"><PageHeader title="Community post" subtitle={`${post.category} · 2 hours ago`} back={back} /><section className="page-pad post-detail-scroll">
    <article className="post-detail-card"><div className="post-meta"><span className="mini-avatar">{post.author[0]}</span><div><strong>{post.author}</strong><small>{post.author === "Anonymous" ? "Identity kept private" : "ONY community profile"}</small></div><Button variant="ghost" onClick={() => notify("Reported · sent to mock moderation")}>Report</Button></div><h1>{post.title}</h1><p>{post.body}</p>{post.media === "voice" && <VoiceNote notify={notify} />}{post.media === "image" && <div className="post-image detail"><span>Shared calming image</span></div>}<div className="post-detail-stats"><span>{likes} reactions</span><span>{comments.length} comments</span></div><div className="post-detail-actions"><Button variant={liked ? "primary" : "secondary"} onClick={() => { setLiked(!liked); setLikes(likes + (liked ? -1 : 1)); }}><Icon name="heart" />{liked ? "Liked" : "Like"}</Button><Button variant="secondary" onClick={() => notify("Encouragement shared")}>Share encouragement</Button><Button variant="ghost" onClick={() => notify("Post saved")}>Save</Button></div></article>
    <div className="comments-section"><h3>Comments</h3>{comments.map((item, index) => <div className="comment" key={`${item.author}-${index}`}><span>{item.author[0]}</span><div><strong>{item.author}<small>{item.time}</small></strong><p>{item.text}</p></div></div>)}</div>
    </section><form className="comment-composer" onSubmit={submit}><TextInput value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write a comment…" aria-label="Add a comment" /><Button type="submit" disabled={!comment.trim()}><Icon name="send" /></Button></form></div>;
}

const merchants: Merchant[] = [
  { name: "Ruang Rasa", category: "Café", offer: "Slow afternoon set", value: "15% OFF", description: "A quiet table, warm drink, and room to pause.", image: "https://images.unsplash.com/photo-1613274554329-70f997f5789f?auto=format&fit=crop&w=600&q=80", validity: "Valid until 30 Jun · Demo" },
  { name: "Tangan Studio", category: "Art / creative", offer: "Mindful clay session", value: "RM10 OFF", description: "A gentle hands-on session for curious beginners.", image: "https://images.unsplash.com/photo-1590605095243-072811dbe64c?auto=format&fit=crop&w=600&q=80", validity: "Weekdays only · Demo" },
  { name: "Nafas Space", category: "Yoga / meditation", offer: "First community class", value: "RM18 CLASS", description: "A calm guided class with no experience required.", image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80", validity: "Valid for first visit · Demo" },
  { name: "Tenang Goods", category: "Wellness products", offer: "Sleep ritual set", value: "20% OFF", description: "Simple example products for a slower evening.", image: "https://images.unsplash.com/photo-1761864293818-603c23655cee?auto=format&fit=crop&w=600&q=80", validity: "Valid until 15 Jul · Demo" },
  { name: "Sora Sounds", category: "Music", offer: "Calming playlist session", value: "FREE SESSION", description: "Instrumental and relaxation listening guides.", image: "https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?auto=format&fit=crop&w=600&q=80", validity: "Online access · Demo" },
  { name: "Senja Rest", category: "Relaxation", offer: "Quiet reset session", value: "RM15 OFF", description: "A future-stage relaxation and spa discovery offer.", image: "https://images.unsplash.com/photo-1557388243-e1194223f99b?auto=format&fit=crop&w=600&q=80", validity: "Weekdays only · Demo" },
];

function Marketplace({ navigate, openMerchant }: { navigate: (s: Screen) => void; openMerchant: (name: string) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const cats = ["All", "Café", "Art / creative", "Yoga / meditation", "Music", "Relaxation", "Wellness products", "Professional support"];
  const shown = merchants.filter((m) => (category === "All" || m.category === category) && `${m.name} ${m.offer}`.toLowerCase().includes(query.toLowerCase()));
  return <><PageHeader title="Discover" subtitle="Wellness and support options" action={<span className="prototype-label">Demo</span>} /><section className="page-pad topless">
    <div className="market-hero"><span className="eyebrow">Wellness, nearby</span><h2>Make a little room for you.</h2><p>Explore sample offers and future professional-support discovery.</p></div>
    <div className="search"><Icon name="search" /><TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search providers or offers" /></div>
    <div className="scroll-chips">{cats.map((x) => <Button key={x} variant={category === x ? "primary" : "secondary"} onClick={() => x === "Professional support" ? navigate("professional") : setCategory(x)}>{x}</Button>)}</div>
    <div className="market-section-head"><h3>Wellness vouchers</h3><Button variant="ghost" onClick={() => setCategory("All")}>View all</Button></div>
    <div className="voucher-list">{shown.map((m) => <button className="voucher-ticket" key={m.name} onClick={() => openMerchant(m.name)}><span className="voucher-ticket-stub"><img src={m.image} alt="" /><small>{m.category}</small><strong>{m.value}</strong></span><span className="voucher-ticket-body"><small>{m.category} · Sample</small><strong>{m.name}</strong><b>{m.offer}</b><span>{m.description}</span><em>{m.validity}</em><i>Tap to open voucher</i></span></button>)}</div>
    <button className="professional-banner" onClick={() => navigate("professional")}><Icon name="shield" /><span><strong>Find professional support nearby</strong><small>Sample counsellors, psychologists, clinics, and hospitals</small></span><Icon name="chevron" /></button>
    <p className="disclaimer"><Icon name="info" /> All providers and offers shown are fictional prototype examples. No partnerships are implied.</p>
  </section></>;
}

function MerchantDetail({ back, navigate, merchantName, notify }: { back: () => void; navigate: (s: Screen) => void; merchantName: string; notify: (s: string) => void }) {
  const merchant = merchants.find((item) => item.name === merchantName) || merchants[0];
  return <><PageHeader title="Voucher details" subtitle="Physical voucher · digitised in ONY" back={back} /><section className="page-pad voucher-detail-page"><div className="physical-voucher large"><div className="physical-voucher-image"><img src={merchant.image} alt={`${merchant.category} example for ${merchant.name}`} /><span>Sample</span></div><div className="physical-voucher-main"><small>{merchant.category} · Sample</small><h1>{merchant.name}</h1><strong>{merchant.value}</strong><h3>{merchant.offer}</h3><p>{merchant.description}</p><em>{merchant.validity}</em></div><div className="voucher-serial">ONY · DEMO · 2025</div></div><div className="voucher-terms"><h3>Terms & conditions</h3><p>One prototype voucher per demo user. Subject to sample availability and stated validity. This fictional offer cannot be exchanged for cash and does not represent a real merchant partnership.</p></div><Button className="full redeem-voucher" onClick={() => { notify("Voucher selected for mock redemption"); navigate("voucher"); }}>Redeem Voucher</Button><p className="disclaimer"><Icon name="info" />Prototype only. No payment, transaction, or real redemption will occur.</p></section></>;
}

function Voucher({ back, merchantName }: { back: () => void; merchantName: string }) {
  const merchant = merchants.find((item) => item.name === merchantName) || merchants[0];
  return <div className="voucher-page"><PageHeader title="Voucher Redeemed!" subtitle="Mock redemption confirmation" back={back} /><section className="page-pad"><div className="redeemed-mark"><Icon name="check" /></div><div className="voucher-card"><SmallLogo /><span className="eyebrow">Your voucher is ready to use</span><h1>{merchant.value}</h1><p>{merchant.offer} at {merchant.name}</p><div className="voucher-code">ONY-DEMO-{merchant.name.slice(0, 2).toUpperCase()}</div><div className="barcode">|||| || ||| | |||| |||</div><small>Sample only · not valid for real redemption</small></div><div className="community-note"><Icon name="info" />Present this code only as part of the ONY prototype demonstration.</div><Button className="full" onClick={back}>Done</Button></section></div>;
}

function Profile({ navigate, displayName, language, persona, theme, companion, trustedName, contactStatus, subscriptionStatus, onLogout }: {
  navigate: (s: Screen) => void; displayName: string; language: string; persona: Persona; theme: Theme; companion: Companion; trustedName: string;
  contactStatus: ContactStatus; subscriptionStatus: SubscriptionStatus; onLogout: () => void;
}) {
  const contactLabel = contactStatus === "accepted" ? `${trustedName} · Saved` : "No trusted contact saved";
  const subscriptionLabel = subscriptionStatus === "trial"
    ? "ONY Premium Trial · 2 days remaining"
    : subscriptionStatus === "payg"
      ? "ONY Premium · RM5 / 3 days"
      : subscriptionStatus === "monthly"
        ? "ONY Premium · RM19.90/month"
        : subscriptionStatus === "trialEnded"
          ? "Free · Trial ended"
          : "Free · Free access";
  const menu = [
    ["personalise", "Companion & communication", `${personaOptions.find((item) => item.id === persona)?.name}`],
    ["monthlyReport", "Monthly Reflection", "Your conversations and check-ins"],
    ["trusted", "Trusted contact", contactLabel],
    ["notifications", "Notifications", "Daily check-in on"],
    ["privacy", "Privacy & memory", "You’re in control"],
    ["legal", "Legal & safety", "Disclaimer, terms, privacy, and crisis information"],
    ["subscription", "Subscription", subscriptionLabel],
    ["help", "Help & support", "Resources and crisis help"],
    ["about", "About ONY", "Prototype v1.0"],
  ] as [Screen, string, string][];
  return <><PageHeader title="Profile" subtitle="Your ONY, your way" /><section className="page-pad top-row">
    <div className="profile-card"><CompanionAvatar companion={companion} /><div><h2>{displayName} & ONY</h2><p>Preferred display name · {language}</p><span>{companion} · {personaOptions.find((item) => item.id === persona)?.name}</span></div><SmallLogo /></div>
    <div className="section-head"><h3>Settings</h3></div><div className="menu">{menu.map(([id, title, text]) => <button key={id} onClick={() => navigate(id)}><span className="menu-icon"><Icon name={id === "help" ? "shield" : id === "notifications" ? "bell" : id === "privacy" ? "memory" : "profile"} /></span><span><strong>{title}</strong><small>{text}</small></span><Icon name="chevron" /></button>)}</div>
    <Button variant="secondary" className="full logout" onClick={onLogout}>Log out</Button>
    <p className="prototype-foot">Frontend prototype. Authentication, secure persistence, and live AI are not connected.</p>
  </section></>;
}

function Personalise({ back, language, setLanguage, theme, setTheme, companion, setCompanion, persona, setPersona, soundOn, setSoundOn, volume, setVolume, notify }: {
  back: () => void; language: string; setLanguage: (v: string) => void; theme: Theme; setTheme: (v: Theme) => void; companion: Companion; setCompanion: (v: Companion) => void;
  soundOn: boolean; setSoundOn: (v: boolean) => void; volume: number; setVolume: (v: number) => void; notify: (s: string) => void;
  persona: Persona; setPersona: (v: Persona) => void;
}) {
  const [style, setStyle] = useState("Reflective"); const [length, setLength] = useState("Short"); const [memory, setMemory] = useState(true);
  return <><PageHeader title="Personalise ONY" subtitle="Shape how conversations feel" back={back} /><section className="page-pad">
    <div className="setting-block"><h3>ONY companion</h3><p>Choose who accompanies you.</p><CompanionPicker value={companion} setValue={setCompanion} /></div>
    <div className="setting-block"><h3>Environment</h3><p>Choose a calming space for the whole app.</p><ThemePicker value={theme} setValue={setTheme} /></div>
    <div className="ambient-settings"><div><strong>{themeOptions.find((item) => item.id === theme)?.name} ambience</strong><small>Simulated prototype sound</small></div><Button variant={soundOn ? "primary" : "secondary"} onClick={() => setSoundOn(!soundOn)}>{soundOn ? "Pause" : "Play"}</Button><label>Volume <TextInput type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} /></label></div>
    <div className="setting-block"><h3>Communication style</h3><p>Tone changes, but ONY’s safety rules never do.</p><PersonaPicker value={persona} setValue={setPersona} /></div>
    <SettingChoices title="Conversation style" values={["Reflective", "Practical", "A mix"]} value={style} setValue={setStyle} />
    <SettingChoices title="Response length" values={["Short", "Balanced", "Detailed"]} value={length} setValue={setLength} />
    <SettingChoices title="Language" values={["English", "Bahasa Melayu", "中文"]} value={language} setValue={setLanguage} />
    <div className="setting-toggle"><div><strong>Relevant memories</strong><p>Let ONY use active Vault memories.</p></div><Toggle on={memory} setOn={setMemory} /></div>
    <div className="preview-bubble"><CompanionAvatar companion={companion} /><div><span>Your preview</span><p>{personaOptions.find((item) => item.id === persona)?.preview}</p></div></div>
    <Button className="full" onClick={() => notify("Your ONY preferences are saved")}>Save preferences</Button>
  </section></>;
}

function SettingChoices({ title, subtitle, values, value, setValue }: { title: string; subtitle?: string; values: string[]; value: string; setValue: (v: string) => void }) {
  return <div className="setting-block"><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}<div className="segmented">{values.map((x) => <Button key={x} variant={value === x ? "primary" : "secondary"} onClick={() => setValue(x)}>{x}</Button>)}</div></div>;
}

function ChatHistory({ back, navigate, conversations, setConversations, activeChatId, setActiveChatId, folders, setFolders, selectedFolderId, setSelectedFolderId }: {
  back: () => void; navigate: (s: Screen) => void; conversations: Conversation[];
  setConversations: (value: Conversation[] | ((items: Conversation[]) => Conversation[])) => void; activeChatId: number | null; setActiveChatId: (id: number | null) => void;
  folders: ChatFolder[]; setFolders: (value: ChatFolder[] | ((items: ChatFolder[]) => ChatFolder[])) => void;
  selectedFolderId: number | null; setSelectedFolderId: (id: number | null) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const update = (id: number, patch: Partial<Conversation>) => setConversations((items) => items.map((chat) => chat.id === id ? { ...chat, ...patch } : chat));
  const visible = conversations.filter((chat) => {
    const matchesFolder = selectedFolderId === null || chat.folderId === selectedFolderId;
    const matchesArchive = Boolean(chat.archived) === showArchived;
    const haystack = `${chat.title} ${chat.messages.map((message) => message.text).join(" ")}`.toLowerCase();
    return matchesFolder && matchesArchive && haystack.includes(query.toLowerCase());
  });
  const createFolder = () => {
    if (!newFolder.trim()) return;
    const folder = { id: Date.now(), name: newFolder.trim() };
    setFolders((items) => [...items, folder]);
    setSelectedFolderId(folder.id);
    setNewFolder("");
  };
  return <><PageHeader title="Chats" subtitle="Separate conversations, organised your way" back={back} action={<Button onClick={() => { setActiveChatId(null); back(); }}>+ New Chat</Button>} /><section className="page-pad">
    <Button className="monthly-entry" variant="ghost" onClick={() => navigate("monthlyReport")}><Icon name="memory" /><span><strong>Monthly Reflection</strong><small>Uses only conversations and memories you allow</small></span><Icon name="chevron" /></Button>
    <div className="search"><Icon name="search" /><TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search chat titles and messages" /></div>
    <div className="folder-create"><TextInput value={newFolder} onChange={(event) => setNewFolder(event.target.value)} placeholder="New folder name" /><Button disabled={!newFolder.trim()} onClick={createFolder}>Create</Button></div>
    <div className="folder-strip"><Button variant={selectedFolderId === null ? "primary" : "secondary"} onClick={() => setSelectedFolderId(null)}>All chats</Button>{folders.map((folder) => <Button key={folder.id} variant={selectedFolderId === folder.id ? "primary" : "secondary"} onClick={() => setSelectedFolderId(folder.id)}>{folder.name}</Button>)}</div>
    {selectedFolderId !== null && <div className="folder-manage">{renamingFolder === selectedFolderId ? <><TextInput value={folders.find((folder) => folder.id === selectedFolderId)?.name || ""} onChange={(event) => setFolders((items) => items.map((folder) => folder.id === selectedFolderId ? { ...folder, name: event.target.value } : folder))} /><Button onClick={() => setRenamingFolder(null)}>Done</Button></> : <><span>{folders.find((folder) => folder.id === selectedFolderId)?.name}</span><Button variant="ghost" onClick={() => setRenamingFolder(selectedFolderId)}>Rename</Button><Button variant="ghost" onClick={() => { setFolders((items) => items.filter((folder) => folder.id !== selectedFolderId)); setConversations((items) => items.map((chat) => chat.folderId === selectedFolderId ? { ...chat, folderId: undefined } : chat)); setSelectedFolderId(null); }}>Delete folder</Button><Button onClick={() => { setActiveChatId(null); back(); }}>New chat here</Button></>}</div>}
    <div className="archive-switch"><Button variant={!showArchived ? "primary" : "secondary"} onClick={() => setShowArchived(false)}>Active</Button><Button variant={showArchived ? "primary" : "secondary"} onClick={() => setShowArchived(true)}>Archived</Button></div>
    {visible.length === 0 && <div className="empty"><Icon name="chat" /><h3>{query ? "No matching conversations" : showArchived ? "No archived conversations" : "This folder is empty"}</h3><p>{query ? "Try another search." : "Start a new conversation here whenever you’re ready."}</p><Button onClick={() => { setActiveChatId(null); back(); }}>Start a conversation</Button></div>}
    {(["Today", "Yesterday"] as const).map((day) => {
      const dayChats = visible.filter((chat) => chat.day === day);
      if (!dayChats.length) return null;
      return <div className="history-group" key={day}><h3>{day}</h3>{dayChats.map((chat) => <div className="chat-history-card" key={chat.id}>
        {editing === chat.id ? <><TextInput value={chat.title} onChange={(event) => update(chat.id, { title: event.target.value })} /><label className="field-label">Move to folder</label><div className="chips history-categories"><Button variant={!chat.folderId ? "primary" : "secondary"} onClick={() => update(chat.id, { folderId: undefined })}>No folder</Button>{folders.map((folder) => <Button key={folder.id} variant={chat.folderId === folder.id ? "primary" : "secondary"} onClick={() => update(chat.id, { folderId: folder.id })}>{folder.name}</Button>)}</div><div className="setting-toggle"><div><strong>Use in monthly report</strong><p>Allow themes from this conversation to be summarized.</p></div><Toggle on={chat.reportAllowed !== false} setOn={(value) => update(chat.id, { reportAllowed: value })} /></div><Button className="full" onClick={() => setEditing(null)}>Done</Button></> :
        <><Button variant="ghost" className="history-open" onClick={() => { setActiveChatId(chat.id); setSelectedFolderId(chat.folderId || null); back(); }}><span><strong>{chat.title}</strong><small>{folders.find((folder) => folder.id === chat.folderId)?.name || "No folder"} · {chat.reportAllowed === false ? "Excluded from report" : "Report allowed"}</small></span><Icon name="chevron" /></Button><div className="memory-actions"><Button variant="ghost" onClick={() => setEditing(chat.id)}><Icon name="edit" />Organize</Button><Button variant="ghost" onClick={() => update(chat.id, { archived: !chat.archived })}>{chat.archived ? "Restore" : "Archive"}</Button><Button variant="ghost" onClick={() => { setConversations((items) => items.filter((item) => item.id !== chat.id)); if (activeChatId === chat.id) setActiveChatId(null); }}><Icon name="trash" />Delete</Button></div></>}
      </div>)}</div>;
    })}
  </section></>;
}

function MonthlyReport({ back, moodEntries, setMoodEntries, conversations, setConversations, memories }: { back: () => void; moodEntries: MoodEntry[]; setMoodEntries: (entries: MoodEntry[]) => void; conversations: Conversation[]; setConversations: (value: Conversation[] | ((items: Conversation[]) => Conversation[])) => void; memories: Memory[] }) {
  const [includedMemories, setIncludedMemories] = useState<number[]>(memories.filter((memory) => memory.active).map((memory) => memory.id));
  const [intention, setIntention] = useState("");
  const [generated, setGenerated] = useState(1);
  const allowedChats = conversations.filter((chat) => chat.reportAllowed !== false && !chat.archived);
  const allowedMoods = moodEntries.filter((entry) => entry.reportAllowed);
  const themes = Object.entries(allowedChats.reduce<Record<string, number>>((counts, chat) => ({ ...counts, [chat.category]: (counts[chat.category] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  const allowedMemories = memories.filter((memory) => memory.active && includedMemories.includes(memory.id));
  const copingMemories = allowedMemories.filter((memory) => memory.category === "Wellbeing" || memory.category === "Things That Help Me");
  const positiveMemories = allowedMemories.filter((memory) => memory.category === "Special Memories" || memory.category === "Goals");
  const now = new Date();
  const dateRange = `${new Intl.DateTimeFormat("en-MY", { month: "long", year: "numeric" }).format(now)} · current local prototype data`;
  const deleteReportData = () => {
    setIncludedMemories([]);
    setConversations((items) => items.map((chat) => ({ ...chat, reportAllowed: false })));
    setMoodEntries(moodEntries.map((entry) => ({ ...entry, reportAllowed: false })));
    setIntention("");
    setGenerated((value) => value + 1);
  };
  return <><PageHeader title="Monthly Reflection" subtitle="Consented data, never a diagnosis" back={back} /><section className="page-pad">
    <div className="monthly-hero"><SmallLogo /><span className="eyebrow">Monthly with ONY</span><h1>Your reflection</h1><p>{dateRange}</p></div>
    <div className="report-source"><Icon name="info" /><p>Generated locally from {allowedMoods.length} allowed mood entries, {allowedChats.length} conversations, and {allowedMemories.length} active selected memories. Version {generated}.</p></div>
    <div className="report-grid"><div><span>Included mood entries</span><strong>{allowedMoods.length}</strong><small>{moodEntries.length - allowedMoods.length} excluded from this report</small></div><div><span>Included chats</span><strong>{allowedChats.length}</strong><small>{conversations.length - allowedChats.length} excluded or archived</small></div></div>
    <div className="card"><h3>Mood patterns</h3>{allowedMoods.length >= 3 ? <><div className="bars mood-entry-bars">{[...allowedMoods].reverse().slice(-7).map((entry) => <div key={entry.id}><span style={{ height: `${entry.level * 20}%` }} /><small>{entry.emoji}</small></div>)}</div><p>Simple visualization of your included check-ins. ONY does not interpret this as a diagnosis or clinical trend.</p></> : <p>At least three included mood entries are needed before a trend is shown. ONY will not invent missing check-ins.</p>}<div className="report-memory-list mood-report-list">{moodEntries.map((entry) => <div key={entry.id}><Toggle on={entry.reportAllowed} setOn={(value) => setMoodEntries(moodEntries.map((item) => item.id === entry.id ? { ...item, reportAllowed: value } : item))} /><span><strong>{entry.emoji} {entry.label}</strong><small>{new Date(entry.createdAt).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}{entry.note ? ` · ${entry.note}` : ""}</small></span></div>)}</div></div>
    <div className="card"><h3>Conversation themes</h3>{themes.length ? <div className="theme-bars">{themes.map(([theme, count]) => <div key={theme}><span><strong>{theme}</strong><small>{count} {count === 1 ? "conversation" : "conversations"}</small></span><i><b style={{ width: `${Math.max(12, (count / allowedChats.length) * 100)}%` }} /></i></div>)}</div> : <p>No conversations are currently included. Allow a conversation from Chat folders to see themes here.</p>}</div>
    <div className="card"><h3>Personal reflections & memories</h3>{memories.length ? <div className="report-memory-list">{memories.map((memory) => <div key={memory.id}><Toggle on={includedMemories.includes(memory.id)} setOn={(value) => setIncludedMemories(value ? [...includedMemories, memory.id] : includedMemories.filter((id) => id !== memory.id))} /><span><strong>{memory.text}</strong><small>{memory.active ? "Active memory" : "Paused in Memory Vault"}</small></span></div>)}</div> : <p>No saved memories are available. ONY will not invent personal reflections.</p>}</div>
    <div className="card"><h3>Coping and self-care</h3>{copingMemories.length ? copingMemories.map((memory) => <p key={memory.id}>{memory.text}<small className="source-note">Source: user-approved memory</small></p>) : <p>No approved coping strategies have been saved yet.</p>}</div>
    <div className="card"><h3>Positive moments</h3>{positiveMemories.length ? positiveMemories.map((memory) => <p key={memory.id}>{memory.text}</p>) : <p>No positive moments are currently saved. ONY will not create achievements you did not share.</p>}</div>
    <div className="reflection"><SmallLogo /><div><strong>Reflection prompt</strong><p>{themes.length ? `When ${themes[0][0].toLowerCase()} came up, what kind of support felt most useful?` : "What is one moment from this month you would like to remember?"}</p></div></div>
    <label className="field-label">Optional intention for next month</label><TextArea value={intention} onChange={(event) => setIntention(event.target.value)} rows={3} placeholder="A small intention you choose for yourself…" />
    <Button className="full" onClick={() => setGenerated((value) => value + 1)}>Regenerate from selected data</Button>
    <Button className="full" variant="danger" onClick={deleteReportData}>Delete report selections</Button>
    <p className="disclaimer"><Icon name="info" />This local reflection explains its sources and avoids clinical conclusions. Real report generation requires secure persistence, consent records, and reviewed AI prompts.</p>
  </section></>;
}

function Notifications({ back }: { back: () => void }) {
  const [settings, setSettings] = useState<Record<string, boolean>>({ "Daily check-in": true, "Gentle follow-up": true, "Saved memory update": true, "Community activity": false, "Voucher reminder": true });
  return <><PageHeader title="Notifications" subtitle="Gentle, never noisy" back={back} /><section className="page-pad"><div className="notification-preview"><Icon name="bell" /><div><strong>How are you, really?</strong><p>A quiet moment to check in with yourself.</p><small>Example notification · 8:30 PM</small></div></div>{Object.entries(settings).map(([name, on]) => <div className="setting-toggle" key={name}><div><strong>{name}</strong><p>{name === "Daily check-in" ? "A once-a-day mood reminder." : `Updates about ${name.toLowerCase()}.`}</p></div><Toggle on={on} setOn={(v) => setSettings({ ...settings, [name]: v })} /></div>)}<p className="disclaimer"><Icon name="info" />Prototype notifications will not be sent to your device.</p></section></>;
}

function Subscription({ back, openHelp, status, setStatus, freeUsage, freeLimit, resetFreeUsage, notify }: {
  back: () => void; openHelp: () => void; status: SubscriptionStatus; setStatus: (status: SubscriptionStatus) => void;
  freeUsage: number; freeLimit: number; resetFreeUsage: () => void; notify: (s: string) => void;
}) {
  const activate = (next: SubscriptionStatus, message: string) => {
    setStatus(next);
    if (next !== "free") resetFreeUsage();
    notify(message);
  };
  const freeCard = <div className={`subscription-plan free-plan ${status === "free" || status === "trialEnded" ? "current" : ""}`}><div className="plan-heading"><span>Free Tier</span>{(status === "free" || status === "trialEnded") && <b>Current Plan</b>}</div><h2>Free</h2><strong>RM0</strong><ul><li>Basic ONY conversations</li><li>Basic mood check-ins</li><li>Essential support/resources</li><li>Core ONY experience</li></ul>{freeUsage >= freeLimit && <p className="allowance-note">Prototype conversation allowance reached. Free safety and support access remains available.</p>}<Button variant="secondary" className="full" onClick={() => { setStatus(status === "trialEnded" ? "trialEnded" : "free"); resetFreeUsage(); notify("Continuing with Free"); back(); }}>Continue with Free</Button></div>;
  const paygCard = <div className={`subscription-plan payg-plan ${status === "payg" ? "current" : ""}`}><div className="plan-heading"><span>Pay as you go</span>{status === "payg" && <b>Premium active</b>}</div><h2>ONY Premium</h2><strong>RM5 <small>/ 3 days</small></strong><p>Get Premium access for 3 days whenever you need it.</p><ul><li>Premium access for 3 days</li><li>Enhanced personalisation</li><li>Deeper continuity</li><li>Advanced mood insights</li></ul>{status === "payg" ? <><div className="days-remaining">2 days remaining</div><Button className="full" variant="secondary" onClick={() => { activate("trialEnded", "PAYG period ended — returned to Free"); }}>Simulate 3-day expiry</Button></> : <><small className="best-for">Best for occasional Premium use</small><Button className="full" onClick={() => activate("payg", "RM5 PAYG Premium active — mock payment only")}>Get Premium for RM5</Button></>}</div>;
  const monthlyCard = <div className={`subscription-plan monthly-plan ${status === "monthly" ? "current" : ""}`}><div className="plan-heading"><span>Monthly Plan</span>{status === "monthly" && <b>Active subscription</b>}</div><h2>ONY Premium</h2><strong>RM19.90 <small>/ month</small></strong><p>Enjoy continuous Premium access with a monthly subscription.</p><ul><li>Continuous Premium access</li><li>Enhanced personalisation</li><li>Deeper continuity</li><li>Advanced mood insights</li><li>Full ONY Premium experience</li></ul>{status === "monthly" ? <div className="days-remaining">Premium active</div> : <><small className="best-for">Best for continuous Premium access</small><Button className="full" onClick={() => activate("monthly", "Monthly Premium active — no real payment")}>Subscribe for RM19.90/month</Button></>}</div>;
  if (status === "trial") return <><PageHeader title="ONY Premium Trial" subtitle="3-Day Free Trial" back={back} /><section className="page-pad"><div className="pricing-status trial"><div className="success-mark"><Icon name="check" /></div><span className="eyebrow">Trial active</span><h1>ONY Premium Trial</h1><strong>RM0 for 3 days</strong><p>Premium access is currently free during your trial.</p><div className="days-remaining">2 days remaining</div></div><div className="benefits"><h3>Free trial access</h3><span><Icon name="check" />Enhanced personalisation</span><span><Icon name="check" />Deeper memory and continuity</span><span><Icon name="check" />Advanced mood insights</span><span><Icon name="check" />Expanded Premium experience</span></div><Button className="full" onClick={() => activate("trialEnded", "Free trial ended — returned to Free")}>Simulate end of free trial</Button><Button className="full" variant="secondary" onClick={back}>Continue Free Trial</Button><p className="disclaimer"><Icon name="info" />No payment information is collected and there is no automatic charge after this prototype trial.</p></section></>;
  if (status === "trialEnded") return <><PageHeader title="Your Premium options" subtitle="Your free trial has ended" back={back} /><section className="page-pad"><div className="trial-ended"><SmallLogo /><span className="eyebrow">Free trial complete</span><h1>Your free trial has ended.</h1><p>You can continue using ONY for free, or choose a Premium plan that fits you.</p></div>{freeCard}<div className="paid-options-heading"><span>Premium options</span><p>Choose occasional access or continuous access.</p></div>{paygCard}{monthlyCard}<Button className="full" variant="ghost" onClick={openHelp}><Icon name="shield" />Access essential support</Button><p className="disclaimer"><Icon name="info" />Mock pricing interactions only. No payment is processed.</p></section></>;
  if (status === "payg") return <><PageHeader title="ONY Premium" subtitle="Pay As You Go" back={back} /><section className="page-pad">{paygCard}<div className="community-note"><Icon name="info" />After this 3-day period, access returns to Free unless you choose another Premium period.</div>{monthlyCard}<Button className="full" variant="ghost" onClick={openHelp}><Icon name="shield" />Access essential support</Button></section></>;
  if (status === "monthly") return <><PageHeader title="ONY Premium" subtitle="Monthly Plan" back={back} /><section className="page-pad">{monthlyCard}<div className="community-note"><Icon name="info" />This mock subscription provides continuous Premium access and never changes to PAYG automatically.</div><Button className="full" variant="ghost" onClick={openHelp}><Icon name="shield" />Access essential support</Button></section></>;
  return <><PageHeader title="Subscription" subtitle="Free and Premium options" back={back} /><section className="page-pad"><div className="pricing-intro"><span className="eyebrow">Your ONY access</span><h1>Choose what fits you.</h1><p>Free always remains available. Premium pricing and features are prototype hypotheses.</p></div>{freeCard}<div className="subscription-plan trial-plan"><div className="plan-heading"><span>Try Premium free</span><b>Eligible</b></div><h2>3-Day Free Trial</h2><strong>RM0 <small>for 3 days</small></strong><p>Experience ONY Premium free for 3 days.</p><ul><li>Enhanced personalisation</li><li>Deeper continuity</li><li>Advanced mood insights</li><li>Expanded Premium experience</li></ul><Button className="full" onClick={() => activate("trial", "3-Day Free Trial started")}>Start Free Trial</Button><Button className="full" variant="ghost" onClick={back}>Stay on Free</Button></div><div className="paid-options-heading"><span>Or choose Premium directly</span><p>Both paid options remain available.</p></div>{paygCard}{monthlyCard}<Button className="full" variant="ghost" onClick={openHelp}><Icon name="shield" />Access essential support</Button><p className="disclaimer"><Icon name="info" />No real payment processing. Essential safety and crisis resources are always accessible.</p></section></>;
}

function SafetyFlow({ back, navigate }: { back: () => void; navigate: (s: Screen) => void }) {
  const [answer, setAnswer] = useState<"none" | "yes" | "no">("none");
  return <div className="safety-page"><PageHeader title="Immediate support" subtitle="Let’s focus on your safety" back={back} /><section className="page-pad">
    <div className="safety-mark"><Icon name="shield" /></div><h1>I’m really sorry you’re going through this.</h1><p className="lead">You don’t have to handle this alone. I want to help you connect with support that can respond right now.</p>
    {answer === "none" && <div className="danger-card"><strong>Are you in immediate danger?</strong><p>This includes having a plan, access to means, or feeling you may act now.</p><Button variant="danger" className="full" onClick={() => setAnswer("yes")}>Yes, I need immediate help</Button><Button variant="secondary" className="full" onClick={() => setAnswer("no")}>No, but I need support</Button></div>}
    {answer === "yes" && <div className="emergency"><span className="eyebrow">Need immediate help?</span><a href="tel:999">999</a><strong>Emergency</strong><p>If you can, move away from anything you could use to hurt yourself and go to a trusted person or public place.</p><Button className="full" onClick={() => navigate("help")}>See Malaysia crisis resources</Button><Button variant="secondary" className="full" onClick={() => navigate("professional")}>Find Professional Help Near Me</Button><Button variant="secondary" className="full" onClick={() => navigate("trusted")}>Contact someone I trust</Button></div>}
    {answer === "no" && <div className="danger-card"><strong>Let’s connect you with someone.</strong><p>Consider contacting a trusted person and staying near others. A befriender, counsellor, or support line can listen without judgment.</p><Button className="full" onClick={() => navigate("help")}>View crisis resources</Button><Button variant="secondary" className="full" onClick={() => navigate("professional")}>Find Professional Help Near Me</Button><Button variant="secondary" className="full" onClick={() => navigate("trusted")}>Contact someone I trust</Button><Button variant="ghost" className="full" onClick={back}>Return when I’m ready</Button></div>}
    <p className="safety-disclaimer"><strong>ONY is not an emergency service and is not monitored live 24/7.</strong> It cannot dispatch emergency services or provide a human responder.</p>
    <div className="sop"><span>Simulated signal</span><span>Supportive response</span><span>Offer resources</span><span>User chooses</span></div>
  </section></div>;
}

function Help({ back, navigate }: { back: () => void; navigate: (s: Screen) => void }) {
  return <><PageHeader title="Get support" subtitle="Professional and urgent help" back={back} /><section className="page-pad">
    <div className="help-hero"><Icon name="shield" /><div><h2>You deserve the right support.</h2><p>ONY provides emotional support and information. It is not a replacement for professional or emergency care.</p></div></div>
    <h3 className="group-title">Immediate danger</h3><a className="resource emergency-resource" href="tel:999"><span><strong>Malaysian emergency services</strong><small>Police, ambulance, fire</small></span><b>Call 999</b></a>
    <h3 className="group-title">Crisis & emotional support</h3>
    <a className="resource" href="https://www.befrienders.org.my" target="_blank" rel="noreferrer"><span><strong>Befrienders Kuala Lumpur</strong><small>Open the official website to verify current contact details and hours</small></span><b>Official site</b></a>
    <a className="resource" href="https://www.moh.gov.my" target="_blank" rel="noreferrer"><span><strong>Ministry of Health Malaysia</strong><small>Use the official website to verify current public support services</small></span><b>Official site</b></a>
    <div className="resource"><span><strong>University counselling centre</strong><small>Contact your campus wellbeing or student affairs office</small></span><Icon name="chevron" /></div>
    <h3 className="group-title">Professional care</h3><button className="resource resource-button" onClick={() => navigate("professional")}><span><strong>Find professional help near me</strong><small>Sample counsellors, psychologists, clinics, and hospitals</small></span><Icon name="chevron" /></button>
    <p className="disclaimer"><Icon name="info" />Except for the Malaysia emergency number shown above, this prototype links to official websites instead of reproducing details that may change. Verify all crisis information before launch.</p>
  </section></>;
}

function JobPreferences({ back, navigate }: { back: () => void; navigate: (s: Screen) => void }) {
  const [type, setType] = useState("Internship");
  const [field, setField] = useState("Marketing");
  const [location, setLocation] = useState("Kuala Lumpur");
  const [arrangement, setArrangement] = useState("Hybrid");
  const [experience, setExperience] = useState("Entry level");
  return <><PageHeader title="Job preferences" subtitle="Let’s narrow down what fits" back={back} /><section className="page-pad">
    <div className="help-hero"><Icon name="market" /><div><h2>What kind of work do you want?</h2><p>These answers personalise sample opportunities only. ONY is not a recruitment service.</p></div></div>
    <SettingChoices title="Job type" values={["Internship", "Part-time", "Full-time"]} value={type} setValue={setType} />
    <SettingChoices title="Job field" values={["Marketing", "Tech", "Design", "Operations"]} value={field} setValue={setField} />
    <label className="field-label">Preferred location</label><TextInput value={location} onChange={(e) => setLocation(e.target.value)} />
    <SettingChoices title="Work arrangement" values={["On-site", "Hybrid", "Remote"]} value={arrangement} setValue={setArrangement} />
    <SettingChoices title="Experience level" values={["No experience", "Entry level", "1–3 years"]} value={experience} setValue={setExperience} />
    <Button className="full" onClick={() => navigate("jobs")}>Show sample opportunities</Button>
  </section></>;
}

function JobOpportunities({ back, navigate }: { back: () => void; navigate: (s: Screen) => void }) {
  const jobs = [
    { title: "Junior Content Coordinator", company: "Kita Studio · Sample", location: "Kuala Lumpur", type: "Full-time · Hybrid", body: "Support social content, campaign planning, and community stories." },
    { title: "Marketing Intern", company: "Bina Digital · Demo", location: "Petaling Jaya", type: "Internship · Hybrid", body: "Learn campaign operations with a small, collaborative team." },
    { title: "Community Assistant", company: "Ruang Muda · Sample", location: "Remote, Malaysia", type: "Part-time · Remote", body: "Help coordinate online events and member communication." },
  ];
  return <><PageHeader title="Job opportunities" subtitle="Sample results for your demo" back={back} /><section className="page-pad">
    <div className="community-note"><Icon name="info" />SAMPLE / DEMO opportunities only. Listings are not live and applications are not submitted.</div>
    <div className="result-summary"><strong>3 sample matches</strong><span>Marketing · Entry level · KL</span></div>
    {jobs.map((job) => <div className="job-card" key={job.title}><span className="prototype-label">Sample</span><h3>{job.title}</h3><strong>{job.company}</strong><div className="job-meta"><span>{job.location}</span><span>{job.type}</span></div><p>{job.body}</p><div className="job-actions"><Button variant="secondary" onClick={() => navigate("jobDetail")}>View Job</Button><Button onClick={() => navigate("jobDetail")}>Apply / Save</Button></div></div>)}
  </section></>;
}

function JobDetail({ back, notify }: { back: () => void; notify: (s: string) => void }) {
  return <><PageHeader title="Job details" subtitle="Sample / demo opportunity" back={back} /><section className="page-pad">
    <div className="job-detail-head"><span className="prototype-label">Sample listing</span><h1>Junior Content Coordinator</h1><strong>Kita Studio · Fictional demo company</strong><div className="job-meta"><span>Kuala Lumpur</span><span>Full-time</span><span>Hybrid</span></div></div>
    <div className="card"><h3>About the role</h3><p>Support social content, organise campaign calendars, and help turn community insights into useful stories.</p><h3>What this demo role looks for</h3><p>Clear communication, curiosity, basic social-media familiarity, and willingness to learn. No prior full-time experience required.</p></div>
    <Button className="full" onClick={() => notify("Demo application saved — nothing was submitted")}>Save sample opportunity</Button><Button variant="secondary" className="full" onClick={() => notify("Application preview opened — no data sent")}>Preview application</Button>
    <p className="disclaimer"><Icon name="info" />This fictional listing demonstrates a future career-support journey. ONY does not verify employers or submit applications.</p>
  </section></>;
}

function Wellbeing({ back, navigate, notify }: { back: () => void; navigate: (s: Screen) => void; notify: (s: string) => void }) {
  const [mode, setMode] = useState("All");
  const options = [
    { title: "Slow instrumental mix", type: "Music", detail: "Focus · 24 min", tone: "ocean" },
    { title: "One-minute breathing pause", type: "Relaxation", detail: "Guided · 1 min", tone: "forest" },
    { title: "Ocean horizon", type: "Nature", detail: "Calming visual", tone: "ocean" },
    { title: "Soft sunset", type: "Nature", detail: "Calming visual", tone: "sunset" },
    { title: "Mindful clay session", type: "Wellness", detail: "Sample activity", tone: "peach" },
  ];
  const shown = options.filter((item) => mode === "All" || item.type === mode);
  return <><PageHeader title="Gentle suggestions" subtitle="Everyday wellbeing, not treatment" back={back} /><section className="page-pad">
    <div className="reflection"><SmallLogo /><div><strong>Let’s make this moment a little lighter.</strong><p>Choose whatever feels manageable. You can stop at any time.</p></div></div>
    <div className="scroll-chips wellbeing-tabs">{["All", "Music", "Nature", "Relaxation", "Wellness"].map((item) => <Button key={item} variant={mode === item ? "primary" : "secondary"} onClick={() => setMode(item)}>{item}</Button>)}</div>
    <div className="wellbeing-grid">{shown.map((item) => <button key={item.title} className="wellbeing-card" onClick={() => item.type === "Wellness" ? navigate("merchant") : notify(`${item.title} opened in demo`)}><span className={`wellbeing-visual visual-${item.tone}`}><i /></span><span className="eyebrow">{item.type}</span><strong>{item.title}</strong><small>{item.detail}</small><b>Open</b></button>)}</div>
    <button className="professional-banner" onClick={() => navigate("merchant")}><Icon name="market" /><span><strong>Explore wellness vouchers</strong><small>Cafés, art, yoga, and relaxation activities</small></span><Icon name="chevron" /></button>
    <p className="disclaimer"><Icon name="info" />These lifestyle suggestions are for everyday wellbeing and are not medical treatment.</p>
  </section></>;
}

const providers = [
  { name: "Example public mental-health clinic", service: "Mental health clinic", area: "Selected broad area", contact: "Contact unavailable", label: "Sample interface" },
  { name: "Example registered counsellor", service: "Registered counsellor", area: "Selected broad area", contact: "Credentials not connected", label: "Sample interface" },
  { name: "Example hospital service", service: "Hospital / emergency department", area: "Selected broad area", contact: "Verify through an official directory", label: "Sample interface" },
];

function ProfessionalSupport({ back, navigate }: { back: () => void; navigate: (s: Screen) => void }) {
  const [filter, setFilter] = useState("All");
  const [location, setLocation] = useState<"ask" | "allowed" | "manual">("ask");
  const [area, setArea] = useState("");
  const shown = providers.filter((provider) => filter === "All" || provider.service.toLowerCase().includes(filter.toLowerCase()));
  return <><PageHeader title="Professional help nearby" subtitle="Sample directory interface" back={back} /><section className="page-pad">
    <a className="resource emergency-resource emergency-strip" href="tel:999"><span><strong>Immediate danger?</strong><small>ONY cannot contact services for you.</small></span><b>Call 999</b></a>
    <div className="location-choice"><strong>Choose how to search</strong><p>Location is optional and must use a permission-controlled directory service.</p>{location === "ask" && <div><Button onClick={() => setLocation("allowed")}>Allow location for demo</Button><Button variant="secondary" onClick={() => setLocation("manual")}>Enter area manually</Button></div>}{location === "allowed" && <div className="form-success"><Icon name="check" />Permission simulated. No device location was requested.</div>}{location === "manual" && <div className="folder-create"><TextInput value={area} onChange={(event) => setArea(event.target.value)} placeholder="Country, state, city, or postcode" /><Button disabled={!area.trim()}>Search</Button></div>}</div>
    <div className="support-distinction"><div><strong>Peer / befriender support</strong><p>Non-clinical listening and emotional support.</p></div><div><strong>Professional care</strong><p>Qualified counselling, therapy, psychology, or medical care.</p></div></div>
    <div className="scroll-chips">{["All", "peer support", "counsellor", "therapist", "psychologist", "Clinic", "Hospital"].map((item) => <Button key={item} variant={filter === item ? "primary" : "secondary"} onClick={() => setFilter(item)}>{item}</Button>)}</div>
    {shown.map((provider) => <div className="provider-card" key={provider.name}><div><span className="prototype-label">{provider.label}</span><h3>{provider.name}</h3><strong>{provider.service}</strong><p>{provider.area} · {provider.contact}</p></div><div className="provider-actions"><Button variant="secondary" onClick={() => navigate("provider")}>View sample details</Button><Button disabled>Contact unavailable</Button></div></div>)}
    <Button className="full" variant="secondary" onClick={() => window.open("https://mentari.moh.gov.my", "_blank")}>Open official MENTARI Malaysia website</Button>
    <p className="disclaimer"><Icon name="info" />No live directory is connected. Sample cards contain no invented phone numbers, distances, hours, or availability.</p>
  </section></>;
}

function ProviderDetail({ back, notify }: { back: () => void; notify: (s: string) => void }) {
  return <><PageHeader title="Provider details" subtitle="Sample professional listing" back={back} /><section className="page-pad">
    <div className="provider-hero"><span className="prototype-label">Sample interface only</span><div className="provider-avatar"><Icon name="shield" /></div><h1>Verified provider name</h1><p>Service type · selected broad area</p></div>
    <div className="card"><h3>Required live directory fields</h3><p>Verified provider name, credentials, service type, address, current contact method, reliable distance, accessibility information, and source verification date.</p><h3>Current status</h3><p>No provider-directory API is connected, so contact and directions are intentionally unavailable.</p></div>
    <Button className="full" disabled>Contact provider unavailable</Button><Button className="full" variant="ghost" onClick={() => notify("Sample provider saved locally")}>Save sample card</Button>
    <p className="disclaimer"><Icon name="info" />A production release must verify credentials, availability, contact details, and emergency-service distinctions.</p>
  </section></>;
}

function TrustedContact({ back, name, number, setName, setNumber, status, setStatus, notify }: {
  back: () => void; name: string; number: string; setName: (v: string) => void; setNumber: (v: string) => void;
  status: ContactStatus; setStatus: (status: ContactStatus) => void; notify: (s: string) => void;
}) {
  const [callState, setCallState] = useState<"idle" | "calling" | "message">("idle");
  if (callState !== "idle") return <div className="centered-state trusted-state"><div className={`call-pulse ${callState}`}><Icon name={callState === "calling" ? "profile" : "send"} /></div><span className="eyebrow">Simulated demo</span><h1>{callState === "calling" ? `Calling ${name}…` : `Message sent to ${name}`}</h1><p>{callState === "calling" ? "No real call is being placed." : "“I could use someone to talk to. Are you free?”"}</p><Button onClick={() => setCallState("idle")}>{callState === "calling" ? "End simulated call" : "Done"}</Button></div>;
  return <><PageHeader title="Trusted contact" subtitle="Your optional safety support" back={back} /><section className="page-pad">
    {status !== "accepted" ? <><div className="help-hero"><Icon name="profile" /><div><h2>Choose someone you can contact.</h2><p>This saves a prototype contact shortcut only. ONY will never contact them automatically.</p></div></div><label className="field-label">Contact name</label><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Someone you trust" /><label className="field-label">Phone number</label><TextInput value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Enter a number" /><Button className="full" disabled={!name.trim() || !number.trim()} onClick={() => { setStatus("accepted"); notify("Trusted contact saved in this demo"); }}>Save trusted contact</Button></> :
      <><div className="trusted-card connected"><span className="trusted-avatar">{name[0]}</span><span className="status-pill accepted">Saved contact</span><h1>{name}</h1><p>{number}</p><div className="trusted-actions"><Button onClick={() => setCallState("calling")}>Simulate call</Button><Button variant="secondary" onClick={() => setCallState("message")}>Simulate message</Button></div></div><Button className="full" variant="secondary" onClick={() => setStatus("none")}>Edit contact</Button><Button className="full" variant="danger" onClick={() => { setStatus("none"); setName(""); setNumber(""); notify("Trusted contact removed"); }}>Remove contact</Button></>}
    <p className="disclaimer"><Icon name="info" />No call, message, location, or personal data is sent. Real contact actions require explicit consent and platform integrations.</p>
  </section></>;
}

function CommunityMember({ back, user, notify }: { back: () => void; user: GlobeUser; notify: (s: string) => void }) {
  const [voice, setVoice] = useState<"idle" | "recording" | "ready">("idle");
  const [text, setText] = useState("");
  const [textPreview, setTextPreview] = useState("");
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [messages, setMessages] = useState<{ from: "member" | "me"; kind: "text" | "voice"; text: string }[]>([]);
  const sendText = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim() || !consent) return;
    setTextPreview(text.trim());
    setText("");
  };
  const encouragements = ["You’re doing great 🌱", "Take it one step at a time", "Hope today gets a little lighter", "Sending you some support"];
  const confirmText = () => {
    setMessages([...messages, { from: "me", kind: "text", text: textPreview }]);
    setTextPreview("");
    setSent("Support message simulated");
    notify("Support message simulated — nothing was delivered");
  };
  const confirmVoice = () => {
    setMessages([...messages, { from: "me", kind: "voice", text: "Voice message · 0:08" }]);
    setVoice("idle");
    setSent("Voice support simulated");
    notify("Voice support simulated — no audio was uploaded");
  };
  if (blocked) return <div className="centered-state"><div className="success-mark"><Icon name="shield" /></div><h1>Anonymous user blocked</h1><p>This local prototype will hide the mock user for the rest of this screen. No backend block was created.</p><Button onClick={back}>Return to globe</Button></div>;
  return <div className="node-chat-page"><PageHeader title="Send anonymous support" subtitle="Identity-free mock connection" back={back} /><section className="page-pad node-chat-scroll">
    <div className="anonymous-profile"><span className={`anonymous-orbit mood-${user.moodGlow}`}><i /></span><div><span className="prototype-label">Anonymous mock user</span><h1>Someone is here</h1><strong>Optional mood check-in: {user.moodLabel}</strong><p>No name, image, initials, or precise location is visible. Replying is always optional.</p></div></div>
    <div className="encouragement-intro"><span className="eyebrow">Send a little encouragement</span><h2>A few kind words can make someone’s day.</h2><div className="encouragement-chips">{encouragements.map((message) => <button key={message} onClick={() => setText(message)}>{message}</button>)}</div></div>
    <label className="check-row community-consent"><TextInput type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I’ll keep this supportive, respect privacy, and not share harmful or identifying content.</span></label>
    <div className="conversation-label"><span>Message preview</span><small>Nothing is delivered in this prototype</small></div>
    {messages.length === 0 && !textPreview && voice !== "ready" && <div className="empty mini-empty"><Icon name="chat" /><p>Your text or voice preview will appear here before sending.</p></div>}
    <div className="community-thread">{messages.map((message, index) => <div className={`community-message ${message.from}`} key={index}>{message.kind === "text" ? <span>{message.text}</span> : <VoiceNote notify={notify} />}</div>)}</div>
    {textPreview && <div className="support-preview"><span className="prototype-label">Text preview</span><p>{textPreview}</p><div><Button variant="secondary" onClick={() => setTextPreview("")}>Cancel</Button><Button onClick={confirmText}>Simulate send</Button></div></div>}
    {sent && <div className="form-success"><Icon name="check" />{sent}. The mock user is not expected to reply.</div>}
    <div className="moderation-actions"><Button variant="ghost" onClick={() => notify("Mock user report sent to simulated moderation")}>Report user</Button><Button variant="ghost" onClick={() => setBlocked(true)}>Block user</Button></div>
    <p className="disclaimer"><Icon name="info" />Text and voice messages are simulated. Real messaging requires secure accounts, moderation, consent records, abuse controls, and encrypted voice storage.</p>
    </section><div className="node-chat-fixed">{voice !== "idle" && <div className="recording-panel"><span className={voice === "recording" ? "live-dot" : "ready-dot"} /><div><strong>{voice === "recording" ? "Recording voice preview" : "Voice preview ready"}</strong><small>{voice === "recording" ? "00:08 · tap stop when ready" : "0:08 · play before simulated send"}</small></div>{voice === "recording" && <Button variant="ghost" onClick={() => setVoice("idle")}>Cancel</Button>}{voice === "ready" && <><Button variant="ghost" onClick={() => notify("Playing local voice preview")}>Play</Button><Button variant="ghost" onClick={() => setVoice("idle")}>Cancel</Button><Button disabled={!consent} onClick={confirmVoice}>Simulate send</Button></>}</div>}<div className="node-message-composer"><form onSubmit={sendText}><TextInput value={text} onChange={(event) => setText(event.target.value)} placeholder="Write an encouraging message…" /><Button type="submit" disabled={!text.trim() || !consent}><Icon name="send" /></Button></form><button className={voice === "recording" ? "recording" : ""} disabled={!consent} onClick={() => setVoice(voice === "recording" ? "ready" : "recording")} aria-label={voice === "recording" ? "Stop voice recording" : "Record voice message"}><Icon name={voice === "recording" ? "close" : "mic"} /></button></div></div></div>;
}

function CommunityGuidelines({ back }: { back: () => void }) {
  return <><PageHeader title="Community guidelines" subtitle="Kind, private, supportive" back={back} /><section className="page-pad"><div className="help-hero"><Icon name="shield" /><div><h2>A safer shared space.</h2><p>Community content can be reported and enters a mock moderation review.</p></div></div><div className="card"><h3>Be kind</h3><p>Respond with empathy. No harassment, discrimination, or pressure.</p><h3>Protect privacy</h3><p>Do not share private contact details or another person’s information.</p><h3>Know the boundary</h3><p>Community support is not professional or emergency care.</p><h3>Report concerns</h3><p>Use the report action on posts or profiles. The prototype will show a moderation confirmation.</p></div><Button className="full" onClick={back}>I understand</Button></section></>;
}

function RiskDemo({ back, navigate, persona, companion }: { back: () => void; navigate: (s: Screen) => void; persona: Persona; companion: Companion }) {
  const [level, setLevel] = useState<RiskLevel>("low");
  const scenarios: Record<RiskLevel, { label: string; message: string; response: string; next: string[] }> = {
    low: {
      label: "Lower concern",
      message: "I’m stressed about an assignment and can’t focus.",
      response: persona === "friendly" ? "That deadline pressure sounds rough. Want to pick one tiny task and do a short breathing reset first?" : persona === "calm" ? "Let’s slow this down. We can name the next manageable task, then take a brief grounding pause." : "That sounds tiring. We can make it feel smaller together—perhaps one gentle task and a short breathing pause.",
      next: ["Try a grounding exercise", "Break the task into one step", "Keep talking with ONY"],
    },
    moderate: {
      label: "Moderate concern",
      message: "I haven’t been coping for days. I feel hopeless and I’m pulling away from everyone.",
      response: "I’m sorry things have felt this heavy. I won’t assume what this means, but I’d like to understand what support feels possible right now. We can try one grounding step, contact someone you trust, or look at verified human-support options.",
      next: ["Stay connected to someone", "Try a simple grounding step", "Explore human support"],
    },
    high: {
      label: "Potential immediate danger",
      message: "I’m thinking about ending my life and I don’t feel safe.",
      response: "I’m really sorry you’re in this much pain. Are you in immediate danger or likely to act now? If yes, call emergency services now, move away from anything you could use to hurt yourself, and go to a trusted person or public place. I can help you open those options.",
      next: ["Clarify immediate danger", "Contact emergency support", "Reach a trusted person"],
    },
  };
  const scenario = scenarios[level];
  return <><PageHeader title="Safety response demo" subtitle="Predefined prototype scenarios" back={back} /><section className="page-pad">
    <div className="demo-notice"><Icon name="info" /><div><strong>Simulation only</strong><p>These classifications are predefined, not live AI inference or a clinical assessment.</p></div></div>
    <div className="risk-switch" aria-label="Choose a demonstration risk level">{(["low", "moderate", "high"] as RiskLevel[]).map((item) => <Button key={item} variant={level === item ? item === "high" ? "danger" : "primary" : "secondary"} onClick={() => setLevel(item)}>{scenarios[item].label}</Button>)}</div>
    <div className={`risk-indicator risk-${level}`}><span /><div><strong>{scenario.label}</strong><small>Automated assessments can be wrong or miss important context.</small></div></div>
    <div className="scenario-thread">
      <span className="scenario-label">Sample user message</span><div className="message-row user"><div className="message">{scenario.message}</div></div>
      <span className="scenario-label">ONY response · {personaOptions.find((item) => item.id === persona)?.name}</span><div className="message-row ony"><CompanionAvatar companion={companion} /><div className="message">{scenario.response}</div></div>
    </div>
    <div className="card next-steps"><h3>Recommended next steps</h3>{scenario.next.map((item) => <span key={item}><Icon name="check" />{item}</span>)}</div>
    {level === "low" && <Button className="full" onClick={() => navigate("resources")}>Open self-help library</Button>}
    {level === "moderate" && <><Button className="full" onClick={() => navigate("resources")}>View coping resources</Button><Button className="full" variant="secondary" onClick={() => navigate("professional")}>Explore human support</Button></>}
    {level === "high" && <><Button className="full" variant="danger" onClick={() => navigate("safety")}>Open immediate safety steps</Button><Button className="full" variant="secondary" onClick={() => navigate("trusted")}>Contact a trusted person</Button></>}
    <p className="disclaimer"><Icon name="shield" />Persona changes tone only. Every style follows the same no-diagnosis, no-treatment, and crisis-escalation rules.</p>
  </section></>;
}

function ResourceLibrary({ back, navigate, notify }: { back: () => void; navigate: (s: Screen) => void; notify: (s: string) => void }) {
  const [open, setOpen] = useState("Breathing & grounding");
  const resources = [
    { title: "Stress management", description: "Name the pressure, choose one small next step, and pause before reassessing.", action: "Open stress reset" },
    { title: "Breathing & grounding", description: "Try a slow exhale and notice five things you can see around you.", action: "Start 60-second guide" },
    { title: "Reflection & journaling", description: "Write what happened, what you felt, and what support might help.", action: "Open reflection prompt" },
    { title: "Sleep & relaxation", description: "Build a gentle wind-down routine and reduce stimulation before rest.", action: "View sleep habits" },
    { title: "Study or work pressure", description: "Reduce a large task to the smallest visible action you can begin.", action: "Make a small plan" },
    { title: "Professional support", description: "Understand the difference between peer support and qualified care.", action: "Find support" },
    { title: "Crisis & emergency", description: "Access urgent safety steps and confirm current crisis contact details.", action: "View urgent help" },
  ];
  const openResource = (title: string, action: string) => {
    if (open !== title) {
      setOpen(title);
      return;
    }
    if (title === "Professional support") navigate("professional");
    else if (title === "Crisis & emergency") navigate("help");
    else notify(`${action} opened in demo`);
  };
  return <><PageHeader title="Support library" subtitle="Curated sample knowledge" back={back} /><section className="page-pad">
    <div className="help-hero"><Icon name="memory" /><div><h2>Practical support, in small steps.</h2><p>ONY can surface curated resources instead of relying only on generated answers.</p></div></div>
    <div className="knowledge-status"><span className="prototype-label">Sample content</span><p>Content requires professional review and verification before launch.</p></div>
    <div className="resource-library">{resources.map((resource) => <Button key={resource.title} variant="secondary" className={`resource-card ${open === resource.title ? "active" : ""}`} onClick={() => openResource(resource.title, resource.action)}><span><strong>{resource.title}</strong><small>{resource.description}</small>{open === resource.title && <b>{resource.action}</b>}</span><Icon name={open === resource.title ? "check" : "chevron"} /></Button>)}</div>
    <p className="disclaimer"><Icon name="info" />Sample educational content only. It is not diagnosis, treatment, or a substitute for personalised professional advice.</p>
  </section></>;
}

function Privacy({ back, notify, memoryCount, reviewMemories, clearMemories }: { back: () => void; notify: (s: string) => void; memoryCount: number; reviewMemories: () => void; clearMemories: () => void }) {
  const [analytics, setAnalytics] = useState(false); const [memory, setMemory] = useState(true);
  return <><PageHeader title="Privacy & safety" subtitle="Clear choices, always" back={back} /><section className="page-pad"><div className="help-hero"><Icon name="shield" /><div><h2>Know what this demo does.</h2><p>Conversation state is held locally for this session. No production backend, account security, or deletion service is connected.</p></div></div>
    <div className="privacy-facts"><div><strong>What may be used</strong><p>Your selected persona, active memories, and current conversation context can personalise mock replies.</p></div><div><strong>AI model training</strong><p>This prototype does not send conversations to an AI model, so they are not used for model training.</p></div><div><strong>Share less identifying data</strong><p>Avoid unnecessary names, addresses, IDs, financial details, or private information about other people.</p></div></div>
    <div className="setting-toggle"><div><strong>Use active memories</strong><p>Allow {memoryCount} saved {memoryCount === 1 ? "memory" : "memories"} to personalise future mock replies.</p></div><Toggle on={memory} setOn={setMemory} /></div>
    <div className="setting-toggle"><div><strong>Proposed anonymous analytics</strong><p>Illustrative setting only; no analytics service is connected.</p></div><Toggle on={analytics} setOn={setAnalytics} /></div>
    <Button variant="secondary" className="full" onClick={reviewMemories}>Review saved memories</Button>
    <Button variant="secondary" className="full" onClick={() => notify("Demo data export simulated — no file created")}>Preview data export</Button>
    <Button variant="danger" className="full" onClick={() => { clearMemories(); notify("Saved demo memories cleared"); }}>Delete saved memories</Button>
    <p className="disclaimer"><Icon name="info" />Illustrative controls only. ONY does not claim anonymity, encryption, retention guarantees, or production-grade deletion in this prototype.</p></section></>;
}

function About({ back }: { back: () => void }) {
  return <><PageHeader title="About ONY" back={back} /><section className="page-pad about"><img src={logo} alt="Official ONY logo" /><span className="eyebrow">University business proposal prototype</span><h1>A softer first step.</h1><p>ONY is a low-pressure first layer for everyday emotional support, created with Malaysian young adults in mind.</p><div className="boundary-list"><span>Not therapy</span><span>Not diagnosis</span><span>Not emergency care</span></div><div className="card"><h3>Prototype scope</h3><p>This experience uses mock data and scripted interactions. It has no live AI, users, merchants, payments, or crisis monitoring.</p></div><small>ONY prototype · Version 1.0</small></section></>;
}

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const nav: [Tab, string, string][] = [["chat", "Chatbot", "chat"], ["memory", "Memory Vault", "memory"], ["community", "Community", "community"], ["market", "Marketplace", "market"], ["profile", "Profile", "profile"]];
  return <nav className="bottom-nav">{nav.map(([id, label, icon]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon name={icon} /><span>{label}</span></button>)}</nav>;
}

export default App;
