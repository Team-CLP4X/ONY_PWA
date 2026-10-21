export type AppLanguage = "English" | "Bahasa Melayu" | "中文";

export interface TranslationDictionary {
  // Navigation
  nav_chat: string;
  nav_memory: string;
  nav_community: string;
  nav_market: string;
  nav_profile: string;

  // Common UI
  common_save: string;
  common_cancel: string;
  common_back: string;
  common_done: string;
  common_submit: string;
  common_delete: string;
  common_edit: string;
  common_report: string;
  common_block: string;
  common_search: string;
  common_loading: string;
  common_close: string;
  common_all: string;
  common_refresh: string;
  common_copy: string;
  common_copied: string;
  common_share: string;

  // Header & Top actions
  header_language: string;
  header_notifications: string;

  // Chat Screen
  chat_title: string;
  chat_subtitle: string;
  chat_greeting_prefix: string;
  chat_greeting_question: string;
  chat_input_placeholder: string;
  chat_send_button: string;
  chat_thinking: string;
  chat_voice_start: string;
  chat_voice_stop: string;
  chat_voice_listening: string;
  chat_clear_chat: string;
  chat_suggestions_label: string;
  chat_mood_prompt: string;
  chat_study_prompt: string;
  chat_calm_prompt: string;
  chat_grounding_prompt: string;

  // Mood & Check-ins
  mood_modal_title: string;
  mood_modal_subtitle: string;
  mood_question: string;
  mood_great: string;
  mood_good: string;
  mood_okay: string;
  mood_low: string;
  mood_difficult: string;
  mood_note_label: string;
  mood_note_placeholder: string;
  mood_save_btn: string;
  mood_saved_toast: string;
  mood_today_badge: string;
  mood_trends_title: string;
  mood_trends_subtitle: string;

  // Memory Vault
  memory_title: string;
  memory_subtitle: string;
  memory_add_btn: string;
  memory_empty_title: string;
  memory_empty_desc: string;
  memory_card_active: string;
  memory_card_inactive: string;
  memory_add_title: string;
  memory_input_label: string;
  memory_reason_label: string;
  memory_saved_toast: string;

  // Community
  community_title: string;
  community_subtitle: string;
  community_create_post: string;
  community_my_node: string;
  community_anonymous_member: string;
  community_filter_all: string;
  community_filter_thoughts: string;
  community_filter_vent: string;
  community_filter_encouragement: string;
  community_like: string;
  community_comment: string;
  community_reply: string;
  community_send_support: string;
  community_voice_greeting: string;
  community_post_placeholder: string;

  // Marketplace
  market_title: string;
  market_subtitle: string;
  market_verified_partners: string;
  market_claim_voucher: string;
  market_voucher_validity: string;

  // Profile & Settings
  profile_title: string;
  profile_subtitle: string;
  profile_settings_head: string;
  profile_menu_personalise: string;
  profile_menu_personalise_sub: string;
  profile_menu_monthly: string;
  profile_menu_monthly_sub: string;
  profile_menu_trusted: string;
  profile_menu_notifications: string;
  profile_menu_privacy: string;
  profile_menu_privacy_sub: string;
  profile_menu_logs: string;
  profile_menu_logs_sub: string;
  profile_menu_legal: string;
  profile_menu_legal_sub: string;
  profile_menu_subscription: string;
  profile_menu_help: string;
  profile_menu_help_sub: string;
  profile_menu_about: string;
  profile_menu_logout: string;

  // Personalise Screen
  personalise_title: string;
  personalise_subtitle: string;
  personalise_language: string;
  personalise_companion: string;
  personalise_persona: string;
  personalise_theme: string;
  personalise_style: string;
  personalise_response_length: string;
  personalise_save_toast: string;

  // Notifications & Quiet Hours
  notif_title: string;
  notif_subtitle: string;
  notif_mark_all_read: string;
  notif_all_caught_up: string;
  notif_unread: string;
  notif_settings_title: string;
  notif_settings_subtitle: string;
  notif_quiet_hours: string;
  notif_quiet_hours_desc: string;
  notif_bedtime: string;
  notif_wakeup: string;
  notif_emergency_override: string;
  notif_categories_heading: string;
  notif_save_btn: string;
  notif_saved_toast: string;

  // Safety & Crisis
  safety_title: string;
  safety_subtitle: string;
  safety_sorry_heading: string;
  safety_lead: string;
  safety_immediate_question: string;
  safety_immediate_desc: string;
  safety_yes_danger: string;
  safety_no_support: string;
  safety_call_999: string;
  safety_emergency_services: string;
  safety_healline_15555: string;
  safety_befrienders: string;
  safety_contact_trusted: string;
  safety_disclaimer: string;

  // Activity & System Logs
  logs_title: string;
  logs_subtitle: string;
  logs_hero_desc: string;
  logs_export_log_btn: string;
  logs_export_json_btn: string;
  logs_diagnostic_btn: string;
  logs_search_placeholder: string;
  logs_total_events: string;
  logs_database_instance: string;

  // Extended screens
  report_title: string;
  report_subtitle: string;
  trusted_title: string;
  trusted_subtitle: string;
  privacy_title: string;
  privacy_subtitle: string;
  about_title: string;
  about_subtitle: string;
  guidelines_title: string;
  guidelines_subtitle: string;
  sub_title: string;
  sub_subtitle: string;
}

export const translations: Record<AppLanguage, TranslationDictionary> = {
  English: {
    // Navigation
    nav_chat: "Chatbot",
    nav_memory: "Memory Vault",
    nav_community: "Community",
    nav_market: "Marketplace",
    nav_profile: "Profile",

    // Common UI
    common_save: "Save",
    common_cancel: "Cancel",
    common_back: "Back",
    common_done: "Done",
    common_submit: "Submit",
    common_delete: "Delete",
    common_edit: "Edit",
    common_report: "Report",
    common_block: "Block",
    common_search: "Search...",
    common_loading: "Loading...",
    common_close: "Close",
    common_all: "All",
    common_refresh: "Refresh",
    common_copy: "Copy Link",
    common_copied: "Link copied to clipboard",
    common_share: "Share",

    // Header & Top actions
    header_language: "Language",
    header_notifications: "Notifications",

    // Chat Screen
    chat_title: "ONY Companion",
    chat_subtitle: "Gentle emotional support & reflection",
    chat_greeting_prefix: "Hello",
    chat_greeting_question: "How are you holding up today? I'm here to listen without judgment.",
    chat_input_placeholder: "Type a feeling or thought...",
    chat_send_button: "Send",
    chat_thinking: "ONY is reflecting...",
    chat_voice_start: "Tap mic to speak",
    chat_voice_stop: "Recording (Tap to send)",
    chat_voice_listening: "Listening to your voice...",
    chat_clear_chat: "Clear Chat",
    chat_suggestions_label: "Gentle prompts to begin:",
    chat_mood_prompt: "I feel overwhelmed with work today",
    chat_study_prompt: "Need a minute to calm exam anxiety",
    chat_calm_prompt: "Guide me through a quick breathing pause",
    chat_grounding_prompt: "Can you help me break down a stressful task?",

    // Mood & Check-ins
    mood_modal_title: "Daily Check-in",
    mood_modal_subtitle: "How is your heart feeling today?",
    mood_question: "Select the glow that best reflects your current space:",
    mood_great: "Great",
    mood_good: "Good",
    mood_okay: "Okay",
    mood_low: "Low",
    mood_difficult: "Difficult",
    mood_note_label: "Add a gentle note (optional)",
    mood_note_placeholder: "What contributed to how you feel right now?...",
    mood_save_btn: "Save Check-in",
    mood_saved_toast: "Today's mood check-in recorded gently",
    mood_today_badge: "Today's Mood Check-in",
    mood_trends_title: "Mood Reflections",
    mood_trends_subtitle: "Your weekly emotional journey",

    // Memory Vault
    memory_title: "Memory Vault",
    memory_subtitle: "Consented insights & safe reflections",
    memory_add_btn: "+ Add Memory",
    memory_empty_title: "Your vault is peaceful",
    memory_empty_desc: "Save personal boundaries, grounding anchors, or memorable moments you want ONY to remember.",
    memory_card_active: "Active memory",
    memory_card_inactive: "Paused",
    memory_add_title: "Store a Consented Memory",
    memory_input_label: "Memory reflection text",
    memory_reason_label: "Why this matters to you (optional)",
    memory_saved_toast: "Reflection saved securely in your Memory Vault",

    // Community
    community_title: "Community",
    community_subtitle: "Connected gently, across the world",
    community_create_post: "+ Create Post",
    community_my_node: "Your Anonymous Node",
    community_anonymous_member: "Anonymous Member",
    community_filter_all: "All",
    community_filter_thoughts: "Thoughts",
    community_filter_vent: "Safe Space",
    community_filter_encouragement: "Encouragement",
    community_like: "Support",
    community_comment: "Comment",
    community_reply: "Reply",
    community_send_support: "Send Warm Encouragement",
    community_voice_greeting: "Voice Greeting",
    community_post_placeholder: "Share an honest reflection anonymously...",

    // Marketplace
    market_title: "Discover",
    market_subtitle: "Wellness & Verified Partner Offers",
    market_verified_partners: "Verified Partners",
    market_claim_voucher: "Claim Voucher",
    market_voucher_validity: "Validity",

    // Profile & Settings
    profile_title: "Profile",
    profile_subtitle: "Your ONY, your way",
    profile_settings_head: "Settings & Preferences",
    profile_menu_personalise: "Companion & Communication",
    profile_menu_personalise_sub: "Tone, companion, language & style",
    profile_menu_monthly: "Monthly Reflection",
    profile_menu_monthly_sub: "Review check-in insights and habits",
    profile_menu_trusted: "Trusted Contact",
    profile_menu_notifications: "Notifications",
    profile_menu_privacy: "Privacy & Memory",
    profile_menu_privacy_sub: "You're always in complete control",
    profile_menu_logs: "Activity & System Logs",
    profile_menu_logs_sub: "Cloud database audit trail & .log export",
    profile_menu_legal: "Legal & Safety",
    profile_menu_legal_sub: "Terms, privacy, and crisis standards",
    profile_menu_subscription: "Subscription",
    profile_menu_help: "Help & Helplines",
    profile_menu_help_sub: "Malaysian crisis resources & directories",
    profile_menu_about: "About ONY",
    profile_menu_logout: "Log out",

    // Personalise Screen
    personalise_title: "Personalise ONY",
    personalise_subtitle: "Shape how conversations feel",
    personalise_language: "App & Chat Language",
    personalise_companion: "ONY Companion",
    personalise_persona: "Tone & Voice",
    personalise_theme: "Color Theme",
    personalise_style: "Conversation Style",
    personalise_response_length: "Response Length",
    personalise_save_toast: "Personalization saved and synced to database",

    // Notifications & Quiet Hours
    notif_title: "Notifications",
    notif_subtitle: "All your activity & updates",
    notif_mark_all_read: "Mark all as read",
    notif_all_caught_up: "All caught up",
    notif_unread: "unread",
    notif_settings_title: "Notification Settings",
    notif_settings_subtitle: "Preferences & quiet hours",
    notif_quiet_hours: "🌙 Quiet Hours",
    notif_quiet_hours_desc: "Mute non-urgent notifications during sleep or focus time.",
    notif_bedtime: "Start (Bedtime)",
    notif_wakeup: "End (Wake up)",
    notif_emergency_override: "Emergency Override: Trusted contact alerts and crisis safety links always bypass quiet hours.",
    notif_categories_heading: "Choose What Updates You Receive",
    notif_save_btn: "Save Preferences",
    notif_saved_toast: "Notification preferences & quiet hours saved",

    // Safety & Crisis
    safety_title: "Immediate support",
    safety_subtitle: "Let's focus on your safety",
    safety_sorry_heading: "I'm really sorry you're going through this.",
    safety_lead: "You don't have to handle this alone. I want to help you connect with support that can respond right now.",
    safety_immediate_question: "Are you in immediate danger?",
    safety_immediate_desc: "This includes having a plan, access to means, or feeling you may act right now.",
    safety_yes_danger: "Yes, I need immediate help",
    safety_no_support: "No, but I need support",
    safety_call_999: "Call 999 (Emergency)",
    safety_emergency_services: "Malaysian Emergency Services",
    safety_healline_15555: "Talian HEAL 15555 (MOH Malaysia · 24/7 Free Helpline)",
    safety_befrienders: "Befrienders KL (03-7627 2929 · 24/7 Emotional Care)",
    safety_contact_trusted: "Contact someone I trust",
    safety_disclaimer: "ONY is an AI companion and does not replace human emergency services. If in immediate life-threatening crisis, call 999 or Talian HEAL 15555 immediately.",

    // Activity & System Logs
    logs_title: "Activity & System Logs",
    logs_subtitle: "Production database audit trail",
    logs_hero_desc: "Real-time audit log of security events, authentications, safety escalations, and system actions stored in Cloud Firestore.",
    logs_export_log_btn: "Export .log File",
    logs_export_json_btn: "Export .json File",
    logs_diagnostic_btn: "+ Record Diagnostic Ping in Firestore",
    logs_search_placeholder: "Search action, message, or user...",
    logs_total_events: "logged events",
    logs_database_instance: "Database Instance",

    // Extended screens
    report_title: "Monthly Mood Reflection",
    report_subtitle: "Your emotional patterns & self-care journey",
    trusted_title: "Trusted Contacts",
    trusted_subtitle: "Emergency circle & crisis escalations",
    privacy_title: "Privacy & Memory Control",
    privacy_subtitle: "Your data is entirely yours",
    about_title: "About ONY",
    about_subtitle: "Your private mental wellness companion",
    guidelines_title: "Community Guidelines",
    guidelines_subtitle: "Kind, private, supportive",
    sub_title: "Subscription Passes",
    sub_subtitle: "Fair pricing, student discounts & flexible passes",
  },

  "Bahasa Melayu": {
    // Navigation
    nav_chat: "Pembantu",
    nav_memory: "Kubah Memori",
    nav_community: "Komuniti",
    nav_market: "Pasaran",
    nav_profile: "Profil",

    // Common UI
    common_save: "Simpan",
    common_cancel: "Batal",
    common_back: "Kembali",
    common_done: "Selesai",
    common_submit: "Hantar",
    common_delete: "Padam",
    common_edit: "Sunting",
    common_report: "Lapor",
    common_block: "Sekat",
    common_search: "Cari...",
    common_loading: "Memuatkan...",
    common_close: "Tutup",
    common_all: "Semua",
    common_refresh: "Muat Semula",
    common_copy: "Salin Pautan",
    common_copied: "Pautan berjaya disalin",
    common_share: "Kongsi",

    // Header & Top actions
    header_language: "Bahasa",
    header_notifications: "Pemberitahuan",

    // Chat Screen
    chat_title: "Teman ONY",
    chat_subtitle: "Sokongan emosi & refleksi yang menenangkan",
    chat_greeting_prefix: "Hai",
    chat_greeting_question: "Bagaimana keadaan hati anda hari ini? Saya di sini sedia mendengar tanpa menghakimi.",
    chat_input_placeholder: "Tuliskan luahan atau perasaan anda...",
    chat_send_button: "Hantar",
    chat_thinking: "ONY sedang berfikir...",
    chat_voice_start: "Tekan mikrofon untuk bercakap",
    chat_voice_stop: "Merakam (Tekan untuk hantar)",
    chat_voice_listening: "Mendengar suara anda...",
    chat_clear_chat: "Kosongkan Sembang",
    chat_suggestions_label: "Cadangan untuk memulakan luahan:",
    chat_mood_prompt: "Saya rasa tertekan dengan tugasan kerja hari ini",
    chat_study_prompt: "Perlukan rehat sejenak untuk tenangkan gementar peperiksaan",
    chat_calm_prompt: "Bimbing saya dalam latihan pernafasan ringkas",
    chat_grounding_prompt: "Bolehkah bantu saya pecahkan tugas yang berat ini?",

    // Mood & Check-ins
    mood_modal_title: "Daftar Masuk Emosi Harian",
    mood_modal_subtitle: "Bagaimanakah perasaan anda hari ini?",
    mood_question: "Pilih cahaya yang paling mewakili keadaan diri anda:",
    mood_great: "Sangat Baik",
    mood_good: "Baik",
    mood_okay: "Biasa",
    mood_low: "Rendah",
    mood_difficult: "Sukar",
    mood_note_label: "Tambah nota ringkas (pilihan)",
    mood_note_placeholder: "Apakah yang mempengaruhi perasaan anda sekarang?...",
    mood_save_btn: "Simpan Rekod Emosi",
    mood_saved_toast: "Daftar masuk emosi hari ini berjaya direkodkan",
    mood_today_badge: "Daftar Masuk Hari Ini",
    mood_trends_title: "Refleksi Emosi",
    mood_trends_subtitle: "Perjalanan emosi mingguan anda",

    // Memory Vault
    memory_title: "Kubah Memori",
    memory_subtitle: "Wawasan berkeizinan & refleksi selamat",
    memory_add_btn: "+ Tambah Memori",
    memory_empty_title: "Kubah anda tenang",
    memory_empty_desc: "Simpan sempadan peribadi, sauh ketenangan, atau detik bermakna yang anda mahu ONY ingat.",
    memory_card_active: "Memori aktif",
    memory_card_inactive: "Dijeda",
    memory_add_title: "Simpan Memori Berkeizinan",
    memory_input_label: "Teks refleksi memori",
    memory_reason_label: "Mengapa ini penting bagi anda (pilihan)",
    memory_saved_toast: "Refleksi disimpan dengan selamat di Kubah Memori",

    // Community
    community_title: "Komuniti",
    community_subtitle: "Terhubung secara harmoni dari seluruh dunia",
    community_create_post: "+ Cipta Siaran",
    community_my_node: "Nod Tanpa Nama Anda",
    community_anonymous_member: "Ahli Tanpa Nama",
    community_filter_all: "Semua",
    community_filter_thoughts: "Luahan Fikiran",
    community_filter_vent: "Ruang Tenang",
    community_filter_encouragement: "Dorongan",
    community_like: "Sokong",
    community_comment: "Ulasan",
    community_reply: "Balas",
    community_send_support: "Hantar Kata-Kata Semangat",
    community_voice_greeting: "Salam Suara",
    community_post_placeholder: "Kongsi refleksi jujur secara tanpa nama...",

    // Marketplace
    market_title: "Teroka",
    market_subtitle: "Kesejahteraan & Tawaran Rakan Kongsi Sah",
    market_verified_partners: "Rakan Kongsi Sah",
    market_claim_voucher: "Tuntut Baucar",
    market_voucher_validity: "Sah Sehingga",

    // Profile & Settings
    profile_title: "Profil",
    profile_subtitle: "ONY anda, mengikut pilihan anda",
    profile_settings_head: "Tetapan & Pilihan",
    profile_menu_personalise: "Teman & Komunikasi",
    profile_menu_personalise_sub: "Nada, teman, bahasa & gaya sembang",
    profile_menu_monthly: "Refleksi Bulanan",
    profile_menu_monthly_sub: "Semak wawasan daftar emosi dan corak tabiat",
    profile_menu_trusted: "Kenalan Dipercayai",
    profile_menu_notifications: "Pemberitahuan",
    profile_menu_privacy: "Privasi & Memori",
    profile_menu_privacy_sub: "Anda sentiasa memegang kawalan penuh",
    profile_menu_logs: "Log Aktiviti & Sistem",
    profile_menu_logs_sub: "Jejak audit pangkalan data awan & eksport .log",
    profile_menu_legal: "Undang-undang & Keselamatan",
    profile_menu_legal_sub: "Terma, privasi, dan piawaian kecemasan",
    profile_menu_subscription: "Langganan",
    profile_menu_help: "Bantuan & Talian Krisis",
    profile_menu_help_sub: "Sumber krisis & direktori pakar Malaysia",
    profile_menu_about: "Mengenai ONY",
    profile_menu_logout: "Log keluar",

    // Personalise Screen
    personalise_title: "Peribadikan ONY",
    personalise_subtitle: "Sesuaikan suasana perbualan anda",
    personalise_language: "Bahasa Aplikasi & Sembang",
    personalise_companion: "Teman ONY",
    personalise_persona: "Nada & Suara",
    personalise_theme: "Tema Warna",
    personalise_style: "Gaya Perbualan",
    personalise_response_length: "Panjang Balasan",
    personalise_save_toast: "Pilihan berjaya disimpan dan disegerakkan ke pangkalan data",

    // Notifications & Quiet Hours
    notif_title: "Pemberitahuan",
    notif_subtitle: "Semua aktiviti & makluman terkini",
    notif_mark_all_read: "Tanda semua dibaca",
    notif_all_caught_up: "Tiada makluman baharu",
    notif_unread: "belum dibaca",
    notif_settings_title: "Tetapan Pemberitahuan",
    notif_settings_subtitle: "Pilihan makluman & waktu senyap",
    notif_quiet_hours: "🌙 Waktu Senyap",
    notif_quiet_hours_desc: "Senyapkan makluman bukan segera semasa tidur atau waktu fokus.",
    notif_bedtime: "Mula (Waktu Tidur)",
    notif_wakeup: "Tamat (Waktu Bangun)",
    notif_emergency_override: "Pelepasan Kecemasan: Amaran kenalan dipercayai dan bantuan krisis sentiasa dibenarkan melalui waktu senyap.",
    notif_categories_heading: "Pilih Makluman Yang Ingin Diterima",
    notif_save_btn: "Simpan Pilihan",
    notif_saved_toast: "Pilihan pemberitahuan & waktu senyap disimpan",

    // Safety & Crisis
    safety_title: "Sokongan segera",
    safety_subtitle: "Marilah utamakan keselamatan anda",
    safety_sorry_heading: "Saya amat bersimpati dengan apa yang sedang anda lalui.",
    safety_lead: "Anda tidak perlu mengharungi ujian ini bersendirian. Saya ingin menghubungkan anda dengan bantuan yang boleh bertindak sekarang.",
    safety_immediate_question: "Adakah anda dalam bahaya serta-merta?",
    safety_immediate_desc: "Ini termasuk mempunyai rancangan, akses kepada alat berbahaya, atau rasa ingin bertindak sekarang.",
    safety_yes_danger: "Ya, saya perlukan bantuan segera",
    safety_no_support: "Tidak, tetapi saya perlukan sokongan",
    safety_call_999: "Hubungi 999 (Kecemasan)",
    safety_emergency_services: "Perkhidmatan Kecemasan Malaysia",
    safety_healline_15555: "Talian HEAL 15555 (KKM Malaysia · 24/7 Percuma & Rahsia)",
    safety_befrienders: "Befrienders KL (03-7627 2929 · 24/7 Sokongan Emosi)",
    safety_contact_trusted: "Hubungi seseorang yang saya percayai",
    safety_disclaimer: "ONY adalah pembantu AI dan tidak menggantikan perkhidmatan kecemasan manusia. Jika menghadapi krisis yang mengancam nyawa, hubungi 999 atau Talian HEAL 15555 dengan segera.",

    // Activity & System Logs
    logs_title: "Log Aktiviti & Sistem",
    logs_subtitle: "Jejak audit pangkalan data pengeluaran",
    logs_hero_desc: "Log audit masa nyata bagi peristiwa keselamatan, pengesahan, eskalasi kecemasan, dan tindakan sistem yang disimpan dalam Cloud Firestore.",
    logs_export_log_btn: "Eksport Fail .log",
    logs_export_json_btn: "Eksport Fail .json",
    logs_diagnostic_btn: "+ Rakam Ujian Diagnostik ke Firestore",
    logs_search_placeholder: "Cari tindakan, mesej, atau pengguna...",
    logs_total_events: "peristiwa direkodkan",
    logs_database_instance: "Pangkalan Data",

    // Extended screens
    report_title: "Refleksi Emosi Bulanan",
    report_subtitle: "Corak emosi & perjalanan penjagaan diri anda",
    trusted_title: "Kenalan Dipercayai",
    trusted_subtitle: "Rangkaian kecemasan & bantuan pantas",
    privacy_title: "Kawalan Privasi & Memori",
    privacy_subtitle: "Data anda adalah hak mutlak anda",
    about_title: "Mengenai ONY",
    about_subtitle: "Teman kesejahteraan mental peribadi anda",
    guidelines_title: "Garis Panduan Komuniti",
    guidelines_subtitle: "Prihatin, selamat & saling menyokong",
    sub_title: "Pas Langganan",
    sub_subtitle: "Harga berpatutan, diskaun pelajar & pas fleksibel",
  },

  "中文": {
    // Navigation
    nav_chat: "倾诉伙伴",
    nav_memory: "记忆宝库",
    nav_community: "互助社区",
    nav_market: "精选好物",
    nav_profile: "个人中心",

    // Common UI
    common_save: "保存",
    common_cancel: "取消",
    common_back: "返回",
    common_done: "完成",
    common_submit: "提交",
    common_delete: "删除",
    common_edit: "编辑",
    common_report: "举报",
    common_block: "屏蔽",
    common_search: "搜索...",
    common_loading: "加载中...",
    common_close: "关闭",
    common_all: "全部",
    common_refresh: "刷新",
    common_copy: "复制链接",
    common_copied: "链接已复制到剪贴板",
    common_share: "分享",

    // Header & Top actions
    header_language: "语言",
    header_notifications: "消息通知",

    // Chat Screen
    chat_title: "ONY 情绪伙伴",
    chat_subtitle: "温和陪伴与日常情绪反思",
    chat_greeting_prefix: "你好",
    chat_greeting_question: "今天的心情还好吗？我在这里，随时倾听你的心声，绝不带有评判。",
    chat_input_placeholder: "写下你此刻的想法或感受...",
    chat_send_button: "发送",
    chat_thinking: "ONY 正在用心思考...",
    chat_voice_start: "点击麦克风说话",
    chat_voice_stop: "正在录音（点击发送）",
    chat_voice_listening: "正在倾听您的声音...",
    chat_clear_chat: "清空对话",
    chat_suggestions_label: "您可以从这里开始倾诉：",
    chat_mood_prompt: "今天的工作压力让我感到透不过气",
    chat_study_prompt: "想要缓解考试前的焦虑不安",
    chat_calm_prompt: "带我做一次简短的深呼吸放松练习",
    chat_grounding_prompt: "能不能帮我把一件复杂棘手的事拆成小步？",

    // Mood & Check-ins
    mood_modal_title: "每日心情记录",
    mood_modal_subtitle: "今天你的内心是怎样的色彩？",
    mood_question: "选择最贴合你此刻心境的光芒：",
    mood_great: "极好",
    mood_good: "不错",
    mood_okay: "平稳",
    mood_low: "低落",
    mood_difficult: "艰难",
    mood_note_label: "写下一两句想法（选填）",
    mood_note_placeholder: "是什么影响了你此刻的心情？...",
    mood_save_btn: "记录心情",
    mood_saved_toast: "今天的心情已温柔收录",
    mood_today_badge: "今日心情记录",
    mood_trends_title: "情绪轨迹",
    mood_trends_subtitle: "您的每周心情波动与陪伴洞察",

    // Memory Vault
    memory_title: "记忆宝库",
    memory_subtitle: "经授权保留的心灵记忆与锚点",
    memory_add_btn: "+ 添加记忆",
    memory_empty_title: "宝库正静候您的心声",
    memory_empty_desc: "保存个人边界、放松锚点或难忘时刻，让 ONY 在对话中更加懂你。",
    memory_card_active: "已启用",
    memory_card_inactive: "已暂停",
    memory_add_title: "存入经授权的专属记忆",
    memory_input_label: "记忆内容与感悟",
    memory_reason_label: "为何这对你很重要（选填）",
    memory_saved_toast: "回忆已安全加密保存在您的记忆宝库中",

    // Community
    community_title: "互助社区",
    community_subtitle: "温柔相连，共度人间悲欢",
    community_create_post: "+ 发布心声",
    community_my_node: "您的匿名光点",
    community_anonymous_member: "匿名成员",
    community_filter_all: "全部",
    community_filter_thoughts: "随想",
    community_filter_vent: "情绪树洞",
    community_filter_encouragement: "互相打气",
    community_like: "抱抱支持",
    community_comment: "留言",
    community_reply: "回复",
    community_send_support: "传递温暖鼓励",
    community_voice_greeting: "温馨语音问候",
    community_post_placeholder: "在温暖安全的社区里匿名分享真实心声...",

    // Marketplace
    market_title: "发现精选",
    market_subtitle: "身心健康与认证合作伙伴礼遇",
    market_verified_partners: "认证合作伙伴",
    market_claim_voucher: "领取优惠券",
    market_voucher_validity: "有效期至",

    // Profile & Settings
    profile_title: "个人中心",
    profile_subtitle: "专属于你的 ONY 体验",
    profile_settings_head: "设置与偏好",
    profile_menu_personalise: "伙伴与沟通偏好",
    profile_menu_personalise_sub: "语气、陪伴形象、语言与风格",
    profile_menu_monthly: "月度情绪月报",
    profile_menu_monthly_sub: "查看您的情绪起伏与自我关怀轨迹",
    profile_menu_trusted: "紧急信任联络人",
    profile_menu_notifications: "消息通知",
    profile_menu_privacy: "隐私与记忆控制",
    profile_menu_privacy_sub: "随时掌控自己的全部数据",
    profile_menu_logs: "活动与系统审计日志",
    profile_menu_logs_sub: "云端数据库审计流水与 .log 导出",
    profile_menu_legal: "法律与安全准则",
    profile_menu_legal_sub: "服务条款、隐私政策与危机处置标准",
    profile_menu_subscription: "会员方案",
    profile_menu_help: "危机求助与热线",
    profile_menu_help_sub: "马来西亚官方危机热线与专业心理机构",
    profile_menu_about: "关于 ONY",
    profile_menu_logout: "退出登录",

    // Personalise Screen
    personalise_title: "个性化定制 ONY",
    personalise_subtitle: "塑造陪伴聊天的语调与氛围",
    personalise_language: "应用与聊天语言",
    personalise_companion: "选择陪伴形象",
    personalise_persona: "沟通语调与性格",
    personalise_theme: "色彩主题",
    personalise_style: "对话风格偏好",
    personalise_response_length: "回复详略程度",
    personalise_save_toast: "个性化设置已保存并同步至数据库",

    // Notifications & Quiet Hours
    notif_title: "消息通知",
    notif_subtitle: "所有互动与动态提醒",
    notif_mark_all_read: "全部标为已读",
    notif_all_caught_up: "暂无未读消息",
    notif_unread: "条未读",
    notif_settings_title: "通知与免打扰设置",
    notif_settings_subtitle: "提醒偏好与静音时间",
    notif_quiet_hours: "🌙 免打扰时段",
    notif_quiet_hours_desc: "在睡眠或专注时段静音非紧急提醒。",
    notif_bedtime: "开始（入睡时段）",
    notif_wakeup: "结束（醒来时段）",
    notif_emergency_override: "紧急穿透：紧急信任人警报和危机求助资源将始终穿透免打扰时段，确保安全。",
    notif_categories_heading: "选择您想接收的通知类别",
    notif_save_btn: "保存通知偏好",
    notif_saved_toast: "通知偏好与免打扰时段已成功保存",

    // Safety & Crisis
    safety_title: "紧急即时支持",
    safety_subtitle: "我们首先关注您的生命安全",
    safety_sorry_heading: "看到你承受着这样的痛苦，我感到非常难过。",
    safety_lead: "你不需要独自承受这一切。我想帮助你立刻联系能够及时响应并帮助你的人。",
    safety_immediate_question: "你现在是否处于即刻的危险之中？",
    safety_immediate_desc: "包括是否有伤害自己的计划、手边是否有危险工具，或感到此刻可能采取行动。",
    safety_yes_danger: "是的，我需要即刻紧急救援",
    safety_no_support: "没有生命危险，但我需要支持倾听",
    safety_call_999: "拨打 999（急救报警热线）",
    safety_emergency_services: "马来西亚紧急救援热线",
    safety_healline_15555: "Talian HEAL 15555（马来西亚卫生部 24/7 心理辅导专线）",
    safety_befrienders: "吉隆坡心灵扶助会 Befrienders（03-7627 2929 免费倾听）",
    safety_contact_trusted: "联系我信任的亲友",
    safety_disclaimer: "ONY 是 AI 情绪陪伴工具，不能代替人类医疗与紧急危机救援。如遇生命危险，请立即拨打 999 或 Talian HEAL 15555。",

    // Activity & System Logs
    logs_title: "活动与系统审计日志",
    logs_subtitle: "生产级数据库审计流水",
    logs_hero_desc: "实时展示存储于 Cloud Firestore 的安全事件、认证记录、危机升级和系统关键操作。",
    logs_export_log_btn: "导出 .log 文件",
    logs_export_json_btn: "导出 .json 文件",
    logs_diagnostic_btn: "+ 向 Firestore 写入一条诊断测试日志",
    logs_search_placeholder: "搜索操作、消息或用户...",
    logs_total_events: "条日志记录",
    logs_database_instance: "数据库实例",

    // Extended screens
    report_title: "月度情绪月报",
    report_subtitle: "您的情绪起伏与自我关怀轨迹",
    trusted_title: "紧急信任联络人",
    trusted_subtitle: "紧急守护圈与危机响应",
    privacy_title: "隐私与记忆控制",
    privacy_subtitle: "数据完全由您掌控",
    about_title: "关于 ONY",
    about_subtitle: "专属于您的隐私情绪健康伙伴",
    guidelines_title: "社区公约与安全准则",
    guidelines_subtitle: "友善、私密、相互扶持",
    sub_title: "会员与通行证",
    sub_subtitle: "平价方案、学生特惠与灵活通行证",
  },
};

export function getTranslation(lang: string): TranslationDictionary {
  if (lang === "Bahasa Melayu" || lang === "ms") {
    return translations["Bahasa Melayu"];
  }
  if (lang === "中文" || lang === "zh") {
    return translations["中文"];
  }
  return translations.English;
}
