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

  // Onboarding
  onboarding_welcome_eyebrow: string;
  onboarding_welcome_title: string;
  onboarding_welcome_lead: string;
  onboarding_meet_eyebrow: string;
  onboarding_meet_title: string;
  onboarding_meet_lead: string;
  onboarding_companion_eyebrow: string;
  onboarding_companion_title: string;
  onboarding_companion_lead: string;
  onboarding_theme_eyebrow: string;
  onboarding_theme_title: string;
  onboarding_theme_lead: string;
  onboarding_sound_eyebrow: string;
  onboarding_sound_title: string;
  onboarding_sound_lead: string;
  onboarding_sound_continue_without: string;
  onboarding_personalise_eyebrow: string;
  onboarding_personalise_title: string;
  onboarding_personalise_lead: string;
  onboarding_boundaries_eyebrow: string;
  onboarding_boundaries_title: string;
  onboarding_boundaries_lead: string;
  onboarding_boundaries_tag1: string;
  onboarding_boundaries_tag2: string;
  onboarding_boundaries_tag3: string;
  onboarding_boundaries_ack: string;
  onboarding_privacy_eyebrow: string;
  onboarding_privacy_title: string;
  onboarding_privacy_lead: string;
  onboarding_privacy_allow_title: string;
  onboarding_privacy_allow_desc: string;
  onboarding_privacy_control_title: string;
  onboarding_privacy_control_desc: string;
  onboarding_complete_eyebrow: string;
  onboarding_complete_title: string;
  onboarding_complete_lead: string;
  onboarding_btn_continue: string;
  onboarding_btn_enter: string;

  // Profile Language Selector
  profile_lang_selector_title: string;
  profile_lang_selector_desc: string;
  profile_lang_current: string;

  // Extra Chat & Voice
  chat_safety_protocols: string;
  chat_resources: string;
  chat_chats_btn: string;
  chat_voice_on: string;
  chat_voice_off: string;
  chat_mood_reminder: string;
  chat_mood_checkin_btn: string;
  chat_memory_active_badge: string;
  chat_memory_paused_badge: string;
  chat_view_btn: string;
  chat_ai_notice: string;
  chat_limit_title: string;
  chat_limit_desc: string;
  chat_limit_unlock_btn: string;
  chat_mode_voice: string;
  chat_mode_text: string;
  chat_voice_tap_mic: string;
  chat_voice_listening_speak: string;
  chat_voice_ready_send: string;
  chat_voice_sent: string;
  chat_voice_processing: string;
  chat_voice_sub_idle: string;
  chat_voice_sub_listening: string;
  chat_voice_send_btn: string;

  // Extra Community
  community_zoom_in: string;
  community_zoom_out: string;
  community_back_world: string;
  community_tab_globe: string;
  community_tab_posts: string;
  community_discoverable_eyebrow: string;
  community_you_node: string;
  community_your_light: string;
  community_view_support_sent: string;

  // Extra Marketplace & Voucher
  market_nearby_eyebrow: string;
  market_hero_title: string;
  market_hero_desc: string;
  market_search_placeholder: string;
  market_wellness_vouchers: string;
  market_view_all: string;
  market_prof_banner_title: string;
  market_prof_banner_desc: string;
  voucher_details_title: string;
  voucher_partner_offer: string;
  voucher_terms_title: string;
  voucher_redeem_btn: string;
  voucher_ready_title: string;
  voucher_ready_subtitle: string;
  voucher_ready_eyebrow: string;
  voucher_done_btn: string;

  // Language Preferences Screen
  profile_menu_language: string;
  profile_menu_language_sub: string;
  language_screen_title: string;
  language_screen_subtitle: string;
  language_screen_desc: string;
  language_sync_notice: string;
  language_en_note: string;
  language_bm_note: string;
  language_zh_note: string;

  // Auth Flow
  auth_welcome_eyebrow: string;
  auth_welcome_title: string;
  auth_welcome_lead: string;
  auth_create_account: string;
  auth_login: string;
  auth_continue_guest: string;
  auth_guest_hint: string;
  auth_login_title: string;
  auth_login_lead: string;
  auth_register_title: string;
  auth_register_lead: string;
  auth_forgot_title: string;
  auth_forgot_lead: string;
  auth_email_label: string;
  auth_password_label: string;
  auth_confirm_password_label: string;
  auth_phone_label: string;
  auth_forgot_password_btn: string;
  auth_send_reset_btn: string;
  auth_sending_reset: string;
  auth_name_stage_title: string;
  auth_name_stage_lead: string;
  auth_name_label: string;
  auth_consent_title: string;
  auth_consent_lead: string;
  auth_consent_agree: string;
  auth_create_space_btn: string;
  auth_creating_space: string;
  auth_disclaimer_btn: string;
  auth_terms_btn: string;
  auth_privacy_btn: string;
  auth_crisis_btn: string;
  auth_secure_badge: string;

  // Personalise Options
  personalise_style_reflective: string;
  personalise_style_practical: string;
  personalise_style_mix: string;
  personalise_len_short: string;
  personalise_len_balanced: string;
  personalise_len_detailed: string;
  personalise_memories_toggle: string;
  personalise_memories_desc: string;

  // Common UI extra
  common_retry: string;
  common_dismiss: string;
  common_undo: string;
  common_you: string;
  common_edited: string;
  common_optional: string;
  common_play: string;
  common_pause: string;
  common_active: string;
  common_syncing: string;

  // Chat action chips & Voice extra
  chat_action_get_help: string;
  chat_action_find_support: string;
  chat_action_contact_trusted: string;
  chat_action_view_resources: string;
  chat_action_remember_this: string;
  chat_action_saved_vault: string;
  chat_action_try_calming: string;
  chat_action_breathing: string;
  chat_action_calming_music: string;
  chat_action_study_plan: string;
  chat_action_take_break: string;
  chat_action_talk_about_it: string;
  chat_action_find_jobs: string;
  chat_action_job_prefs: string;
  chat_action_tell_more: string;
  chat_action_help_reflect: string;
  chat_voice_quick_prompts: string;
  chat_voice_prompt_overwhelmed: string;
  chat_voice_prompt_breathing: string;
  chat_voice_prompt_talk: string;
  chat_voice_try_mic_again: string;
  chat_voice_session_privacy: string;
  chat_voice_listen: string;
  chat_voice_stop_speaking: string;

  // Mood & Check-ins extra
  mood_saved_today_title: string;
  mood_saved_today_desc: string;
  mood_view_history: string;
  mood_back_chat: string;
  mood_right_now: string;
  mood_scale_hint: string;
  mood_select_prompt: string;
  mood_review_previous: string;
  mood_complete_banner: string;
  mood_most_recent: string;
  mood_today_label: string;
  mood_empty_title: string;
  mood_empty_desc: string;
  mood_daily_checkins: string;
  mood_days_saved: string;
  mood_day_saved: string;
  mood_recent_pattern: string;
  mood_pattern_disclaimer: string;
  mood_need_three: string;
  mood_firestore_disclaimer: string;

  // Memory Vault extra
  memory_search_placeholder: string;
  memory_vault_control: string;
  memory_vault_heading: string;
  memory_vault_desc: string;
  memory_saved_section: string;
  memory_clear_all: string;
  memory_cleared_toast: string;
  memory_deleted_toast: string;
  memory_updated_toast: string;
  memory_added_toast: string;
  memory_why_remembers: string;
  memory_privacy_controls: string;
  memory_ask_before_saving: string;
  memory_edit_title: string;
  memory_add_sub: string;
  memory_hero_title: string;
  memory_hero_desc: string;
  memory_kind_text: string;
  memory_kind_image: string;
  memory_what_should_remember: string;
  memory_caption_label: string;
  memory_text_placeholder: string;
  memory_image_placeholder: string;
  memory_category_label: string;
  memory_allow_use: string;
  memory_allow_use_sub: string;
  memory_save_btn: string;
  memory_select_image: string;
  memory_select_image_sub: string;
  memory_change_image: string;

  // Community extra
  community_globe_pan_hint: string;
  community_nodes_count: string;
  community_someone_here: string;
  community_mood_higher: string;
  community_mood_okay: string;
  community_mood_lower: string;
  community_mood_none: string;
  community_guidelines_btn: string;
  community_appear_globe: string;
  community_appear_globe_desc: string;
  community_receive_support: string;
  community_receive_support_desc: string;
  community_regional_discovery: string;
  community_regional_desc: string;
  community_enable_area: string;
  community_manual_area: string;
  community_set_area: string;
  community_area_placeholder: string;
  community_safety_note: string;
  community_posts_heading: string;
  community_back_globe: string;
  community_search_posts: string;
  community_post_live: string;
  community_post_live_desc: string;
  community_return_feed: string;
  community_create_post_title: string;
  community_create_post_sub: string;
  community_post_as: string;
  community_my_profile: string;
  community_format: string;
  community_text: string;
  community_image: string;
  community_voice: string;
  community_title_label: string;
  community_title_placeholder: string;
  community_body_label: string;
  community_body_placeholder: string;
  community_record_voice: string;
  community_record_hint: string;
  community_voice_ready: string;
  community_re_record: string;
  community_quick_audio: string;
  community_mod_notice: string;
  community_post_detail_title: string;
  community_private_identity: string;
  community_profile_identity: string;
  community_calm_image: string;
  community_comments_title: string;
  community_no_comments: string;
  community_edit_comment_placeholder: string;
  community_edit_reply_placeholder: string;
  community_reply_to: string;
  community_comment_as: string;
  community_support_sent_to_you: string;
  community_my_node_desc: string;
  community_current_glow: string;
  community_support_received: string;
  community_locate_globe: string;
  community_msg_count: string;

  // Subscription extra
  sub_free_tier: string;
  sub_current_plan: string;
  sub_free_price: string;
  sub_rm0: string;
  sub_free_feat1: string;
  sub_free_feat2: string;
  sub_free_feat3: string;
  sub_free_feat4: string;
  sub_free_feat5: string;
  sub_allowance_reached: string;
  sub_continue_free: string;
  sub_payg_heading: string;
  sub_payg_active: string;
  sub_payg_title: string;
  sub_payg_price: string;
  sub_payg_desc: string;
  sub_payg_feat1: string;
  sub_payg_feat2: string;
  sub_payg_feat3: string;
  sub_payg_feat4: string;
  sub_monthly_heading: string;
  sub_monthly_active: string;
  sub_monthly_title: string;
  sub_monthly_price: string;
  sub_monthly_desc: string;
  sub_trial_hero_title: string;
  sub_trial_hero_desc: string;
  sub_start_trial: string;
  sub_trial_title: string;

  // Privacy & Account extra
  privacy_hero_title: string;
  privacy_hero_desc: string;
  privacy_what_used_title: string;
  privacy_what_used_desc: string;
  privacy_ai_title: string;
  privacy_ai_desc: string;
  privacy_less_id_title: string;
  privacy_less_id_desc: string;
  privacy_review_memories: string;
  privacy_view_logs: string;
  privacy_export_archive: string;
  privacy_clear_memories: string;
  privacy_delete_account: string;
  privacy_confirm_delete_title: string;
  privacy_confirm_delete_desc: string;
  privacy_confirm_btn: string;

  // About & Legal extra
  about_hero_title: string;
  about_hero_desc: string;
  about_not_therapy: string;
  about_not_diagnosis: string;
  about_not_emergency: string;
  about_built_care_title: string;
  about_built_care_desc: string;
  legal_hero_title: string;
  legal_hero_desc: string;

  // Trusted Contacts extra
  trusted_phone_section: string;
  trusted_saved_phone: string;
  trusted_not_set: string;
  trusted_edit_phone: string;
  trusted_add_phone: string;
  trusted_invite_link_title: string;
  trusted_invite_link_desc: string;
  trusted_share_link_btn: string;
  trusted_paste_link_toggle: string;
  trusted_requests_section: string;
  trusted_no_pending: string;
  trusted_accept_contact: string;
  trusted_reject_contact: string;
  trusted_people_supported: string;
  trusted_invite_directly: string;
  trusted_waiting_recipient: string;
  trusted_call_btn: string;
  trusted_send_msg_btn: string;
  trusted_remove_btn: string;
  trusted_invite_another: string;

  // Geolocation & Professional Help Nearby
  geo_detect_btn: string;
  geo_detecting: string;
  geo_located_success: string;
  geo_permission_denied: string;
  geo_retry: string;
  geo_clear: string;
  geo_approx_badge: string;
  geo_accuracy_notice: string;
  professional_nearest_tab: string;
  professional_directions_btn: string;
  professional_call_btn: string;
  professional_details_btn: string;
  professional_nationwide_badge: string;
  professional_emergency_tag: string;
  professional_walkin_tag: string;
  professional_filter_state: string;
  professional_all_states: string;
  professional_search_prompt: string;
  professional_closest_first: string;
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
    memory_add_btn: "Add Memory",
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
    logs_hero_desc: "Real-time audit log of security events, authentications, safety escalations, and system actions.",
    logs_export_log_btn: "Export .log File",
    logs_export_json_btn: "Export .json File",
    logs_diagnostic_btn: "+ Record Diagnostic Ping",
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

    // Onboarding
    onboarding_welcome_eyebrow: "Welcome to",
    onboarding_welcome_title: "ONY",
    onboarding_welcome_lead: "A gentle place to pause, share, and feel a little less alone.",
    onboarding_meet_eyebrow: "Meet ONY",
    onboarding_meet_title: "Your low-pressure companion",
    onboarding_meet_lead: "ONY is a gentle first layer for everyday emotional support—always at your pace.",
    onboarding_companion_eyebrow: "Make ONY yours",
    onboarding_companion_title: "Choose your ONY companion",
    onboarding_companion_lead: "Choose a companion appearance that feels right. Your companion is always called ONY.",
    onboarding_theme_eyebrow: "Your calming space",
    onboarding_theme_title: "Choose a space that feels comfortable for you",
    onboarding_theme_lead: "Pick a visual theme. Your choice applies throughout the app and can be changed later.",
    onboarding_sound_eyebrow: "Optional ambience",
    onboarding_sound_title: "Add a calming sound",
    onboarding_sound_lead: "Listen to soothing ambience. You can pause or change it anytime.",
    onboarding_sound_continue_without: "Continue without sound",
    onboarding_personalise_eyebrow: "Personalise ONY",
    onboarding_personalise_title: "What would feel helpful?",
    onboarding_personalise_lead: "Choose how ONY communicates, a language, and any topics on your mind.",
    onboarding_boundaries_eyebrow: "Clear boundaries",
    onboarding_boundaries_title: "Support, not treatment",
    onboarding_boundaries_lead: "ONY offers AI-based emotional support and self-help resources. It is not a psychologist, therapist, diagnostic tool, or emergency service.",
    onboarding_boundaries_tag1: "Not therapy",
    onboarding_boundaries_tag2: "No diagnosis",
    onboarding_boundaries_tag3: "Not emergency care",
    onboarding_boundaries_ack: "I understand ONY’s role and limitations.",
    onboarding_privacy_eyebrow: "Your privacy",
    onboarding_privacy_title: "What should ONY remember?",
    onboarding_privacy_lead: "You are always in control. Review, pause, or delete memories anytime.",
    onboarding_privacy_allow_title: "Allow relevant memories",
    onboarding_privacy_allow_desc: "ONY may save helpful context you share.",
    onboarding_privacy_control_title: "Let me control memories",
    onboarding_privacy_control_desc: "Ask before anything is saved.",
    onboarding_complete_eyebrow: "You’re all set",
    onboarding_complete_title: "Enter ONY",
    onboarding_complete_lead: "Experience compassionate companion conversations, daily mood check-ins, and verified wellbeing resources.",
    onboarding_btn_continue: "Continue",
    onboarding_btn_enter: "Enter ONY",

    // Profile Language Selector
    profile_lang_selector_title: "App Language",
    profile_lang_selector_desc: "Select your preferred language across the entire application",
    profile_lang_current: "Current Language",

    // Extra Chat & Voice
    chat_safety_protocols: "Safety protocols",
    chat_resources: "Resources",
    chat_chats_btn: "Chats",
    chat_voice_on: "Voice on",
    chat_voice_off: "Voice off",
    chat_mood_reminder: "You haven’t checked in your mood yet today.",
    chat_mood_checkin_btn: "Check in",
    chat_memory_active_badge: "Memory is on · You’re in control",
    chat_memory_paused_badge: "Memory sharing paused · You’re in control",
    chat_view_btn: "View",
    chat_ai_notice: "AI can be inaccurate · Not diagnosis or treatment",
    chat_limit_title: "Free message allowance reached",
    chat_limit_desc: "You’ve reached the free message limit. Please choose a plan or activate your free trial to continue chatting with ONY.",
    chat_limit_unlock_btn: "View Subscription Plans & Unlock",
    chat_mode_voice: "Voice",
    chat_mode_text: "Text",
    chat_voice_tap_mic: "Tap mic to speak",
    chat_voice_listening_speak: "Listening… speak into your mic",
    chat_voice_ready_send: "Listening… tap send when ready",
    chat_voice_sent: "Message sent",
    chat_voice_processing: "Processing voice",
    chat_voice_sub_idle: "ONY listens and transcribes in real time",
    chat_voice_sub_listening: "Speak at your own pace",
    chat_voice_send_btn: "Send to ONY",

    // Extra Community
    community_zoom_in: "Zoom in",
    community_zoom_out: "Zoom out",
    community_back_world: "Back to world",
    community_tab_globe: "Globe",
    community_tab_posts: "Posts",
    community_discoverable_eyebrow: "Discoverable people · Anonymous",
    community_you_node: "You",
    community_your_light: "Your light on the globe",
    community_view_support_sent: "View Support Sent to Me",

    // Extra Marketplace & Voucher
    market_nearby_eyebrow: "Wellness, Nearby",
    market_hero_title: "Make a little room for you.",
    market_hero_desc: "Exclusive partner privileges, calming spaces, and verified care directory.",
    market_search_placeholder: "Search providers or offers",
    market_wellness_vouchers: "Wellness Vouchers",
    market_view_all: "View all",
    market_prof_banner_title: "Find professional support nearby",
    market_prof_banner_desc: "Registered clinics, MENTARI centres, and certified counsellors",
    voucher_details_title: "Voucher Details",
    voucher_partner_offer: "Wellness Partner Offer",
    voucher_terms_title: "Terms & conditions",
    voucher_redeem_btn: "Redeem Voucher",
    voucher_ready_title: "Voucher Ready!",
    voucher_ready_subtitle: "Digital Member Pass",
    voucher_ready_eyebrow: "Your voucher is ready to use",
    voucher_done_btn: "Done",

    // Language Preferences Screen
    profile_menu_language: "Language Preferences",
    profile_menu_language_sub: "Choose your preferred app language",
    language_screen_title: "Language Preferences",
    language_screen_subtitle: "App interface & companion language",
    language_screen_desc: "Select your preferred language",
    language_sync_notice: "Your language preference is saved to your cloud profile and restored whenever you open the app.",
    language_en_note: "Full app interface and conversational companion in English",
    language_bm_note: "Antara muka penuh dan perbualan dalam Bahasa Melayu",
    language_zh_note: "完整的简体中文应用界面与中文陪伴对话",

    // Auth Flow
    auth_welcome_eyebrow: "Welcome to ONY",
    auth_welcome_title: "A gentle space that starts with you.",
    auth_welcome_lead: "Private reflection, supportive conversation, and practical resources—at your pace.",
    auth_create_account: "Create account",
    auth_login: "Log in",
    auth_continue_guest: "Continue as guest (local only)",
    auth_guest_hint: "Sign in to safely persist your reflections, check-ins, and personal settings.",
    auth_login_title: "Log in to ONY",
    auth_login_lead: "Your private space is protected with secure encryption.",
    auth_register_title: "Create an ONY account",
    auth_register_lead: "Start your journey with private reflections and secure cloud backup.",
    auth_forgot_title: "Reset your password",
    auth_forgot_lead: "We will send a secure password reset link to your email.",
    auth_email_label: "Email address",
    auth_password_label: "Password",
    auth_confirm_password_label: "Confirm password",
    auth_phone_label: "Phone number (saved for emergency contact)",
    auth_forgot_password_btn: "Forgot password?",
    auth_send_reset_btn: "Send reset link",
    auth_sending_reset: "Sending reset link...",
    auth_name_stage_title: "What should ONY call you?",
    auth_name_stage_lead: "Use a preferred display name and confirm your phone number for emergency support.",
    auth_name_label: "Display name",
    auth_consent_title: "Understand ONY's role.",
    auth_consent_lead: "ONY is an AI-based emotional-support and reflection companion. It is not a psychologist, therapist, diagnostic tool, or emergency medical service.",
    auth_consent_agree: "I have read and accept the Terms of Service and Privacy Policy, and understand ONY's role and safety boundaries.",
    auth_create_space_btn: "Accept and create space",
    auth_creating_space: "Creating space...",
    auth_disclaimer_btn: "Disclaimer & Boundaries",
    auth_terms_btn: "Terms of Service",
    auth_privacy_btn: "Privacy Policy",
    auth_crisis_btn: "Crisis Resources",
    auth_secure_badge: "Private & Encrypted",

    // Personalise Options
    personalise_style_reflective: "Reflective",
    personalise_style_practical: "Practical",
    personalise_style_mix: "A mix",
    personalise_len_short: "Short",
    personalise_len_balanced: "Balanced",
    personalise_len_detailed: "Detailed",
    personalise_memories_toggle: "Relevant memories",
    personalise_memories_desc: "Let ONY use active Vault memories.",

    // Common UI extra
    common_retry: "Retry",
    common_dismiss: "Dismiss",
    common_undo: "Undo",
    common_you: "You",
    common_edited: "edited",
    common_optional: "Optional",
    common_play: "Play",
    common_pause: "Pause",
    common_active: "Active",
    common_syncing: "Syncing…",

    // Chat action chips & Voice extra
    chat_action_get_help: "Get help now",
    chat_action_find_support: "Find professional support",
    chat_action_contact_trusted: "Contact trusted person",
    chat_action_view_resources: "View support resources",
    chat_action_remember_this: "Remember this",
    chat_action_saved_vault: "Saved to your Memory Vault.",
    chat_action_try_calming: "Try something calming",
    chat_action_breathing: "Breathing activity",
    chat_action_calming_music: "Calming music",
    chat_action_study_plan: "Study plan",
    chat_action_take_break: "Take a break",
    chat_action_talk_about_it: "Talk about it",
    chat_action_find_jobs: "Find job opportunities",
    chat_action_job_prefs: "Set job preferences",
    chat_action_tell_more: "Tell me more",
    chat_action_help_reflect: "Help me reflect",
    chat_voice_quick_prompts: "Quick voice prompts to speak with ONY:",
    chat_voice_prompt_overwhelmed: "I'm feeling overwhelmed today",
    chat_voice_prompt_breathing: "Help me relax with a breathing exercise",
    chat_voice_prompt_talk: "I want to talk about how I feel",
    chat_voice_try_mic_again: "Try Mic Again",
    chat_voice_session_privacy: "Voice stays in this session",
    chat_voice_listen: "Listen to ONY",
    chat_voice_stop_speaking: "Stop speaking",

    // Mood & Check-ins extra
    mood_saved_today_title: "Check-in saved for today",
    mood_saved_today_desc: "Your mood is saved in the database for today. Come back tomorrow for your next daily check-in.",
    mood_view_history: "View mood history",
    mood_back_chat: "Back to chat",
    mood_right_now: "Right now",
    mood_scale_hint: "Choose the closest fit. Your check-in is saved once per day to your private database history.",
    mood_select_prompt: "Select a mood to continue.",
    mood_review_previous: "Review previous check-ins",
    mood_complete_banner: "Today’s check-in complete",
    mood_most_recent: "Most recent",
    mood_today_label: "Today",
    mood_empty_title: "No mood check-ins yet",
    mood_empty_desc: "Your daily mood check-ins will appear here after you record one.",
    mood_daily_checkins: "Daily check-ins",
    mood_days_saved: "days saved",
    mood_day_saved: "day saved",
    mood_recent_pattern: "Recent pattern",
    mood_pattern_disclaimer: "A simple view of your daily entries, not a clinical interpretation.",
    mood_need_three: "At least three daily check-ins are needed before ONY shows a simple trend.",
    mood_firestore_disclaimer: "Each mood check-in is saved per day. Use the switch beside an entry to include or exclude it from monthly reports.",

    // Memory Vault extra
    memory_search_placeholder: "Search memories",
    memory_vault_control: "You’re in control",
    memory_vault_heading: "What ONY remembers",
    memory_vault_desc: "Pause, edit, or remove anything. Changes affect future conversations.",
    memory_saved_section: "Saved memories",
    memory_clear_all: "Clear all",
    memory_cleared_toast: "All memories cleared",
    memory_deleted_toast: "Memory deleted",
    memory_updated_toast: "Memory updated",
    memory_added_toast: "Memory added to your Vault",
    memory_why_remembers: "ONY remembers this because…",
    memory_privacy_controls: "Memory privacy controls",
    memory_ask_before_saving: "Ask before saving is currently",
    memory_edit_title: "Edit memory",
    memory_add_sub: "Only save what feels helpful",
    memory_hero_title: "You decide what stays.",
    memory_hero_desc: "ONY can only use this memory while the switch below is on.",
    memory_kind_text: "Text Memory",
    memory_kind_image: "Image Memory",
    memory_what_should_remember: "What should ONY remember?",
    memory_caption_label: "Caption (optional)",
    memory_text_placeholder: "For example: I feel calmer when I listen to music.",
    memory_image_placeholder: "A quiet walk that made me feel grounded.",
    memory_category_label: "Category",
    memory_allow_use: "Allow ONY to use this",
    memory_allow_use_sub: "Applies to future companion conversations.",
    memory_save_btn: "Save memory",
    memory_select_image: "Select an image",
    memory_select_image_sub: "Attach a calming photo from your gallery",
    memory_change_image: "Tap to change image",

    // Community extra
    community_globe_pan_hint: "Drag to pan · Tap \"You\" to view support messages sent to your node",
    community_nodes_count: "discoverable nodes",
    community_someone_here: "Someone is here",
    community_mood_higher: "Higher mood",
    community_mood_okay: "Okay",
    community_mood_lower: "Lower mood",
    community_mood_none: "No check-in",
    community_guidelines_btn: "Guidelines",
    community_appear_globe: "Appear on the globe",
    community_appear_globe_desc: "When off, your anonymous light is hidden from the globe.",
    community_receive_support: "Receive supportive messages",
    community_receive_support_desc: "When on, other community members can send anonymous encouragement to your node.",
    community_regional_discovery: "Broad Regional Discovery",
    community_regional_desc: "ONY protects your privacy. We only use broad state or district regions, never precise GPS addresses.",
    community_enable_area: "Enable Regional Area",
    community_manual_area: "Enter Area Manually",
    community_set_area: "Set Area",
    community_area_placeholder: "e.g. Petaling Jaya, Penang, Johor Bahru",
    community_safety_note: "All members and message delivery are anonymous. Nodes never reveal real-world addresses.",
    community_posts_heading: "Shared gently, together.",
    community_back_globe: "Back to globe",
    community_search_posts: "Search posts or topics",
    community_post_live: "Your post is live",
    community_post_live_desc: "Thanks for sharing with care. It’s now visible in the community feed.",
    community_return_feed: "Return to community",
    community_create_post_title: "Create a post",
    community_create_post_sub: "Share kindly, at your pace",
    community_post_as: "Post as",
    community_my_profile: "My ONY profile",
    community_format: "Format",
    community_text: "Text",
    community_image: "Image",
    community_voice: "Voice",
    community_title_label: "Title",
    community_title_placeholder: "What would you like to share?",
    community_body_label: "Your post",
    community_body_placeholder: "Write what’s on your mind...",
    community_record_voice: "Record voice message",
    community_record_hint: "Speak into your microphone gently",
    community_voice_ready: "Voice note ready",
    community_re_record: "Re-record",
    community_quick_audio: "Quick Audio Note",
    community_mod_notice: "Community guidelines and moderation apply. Profanity or unkind content is automatically blocked.",
    community_post_detail_title: "Community post",
    community_private_identity: "Identity kept private",
    community_profile_identity: "ONY community profile",
    community_calm_image: "Shared calming image",
    community_comments_title: "Comments",
    community_no_comments: "No comments yet. Share a supportive note below.",
    community_edit_comment_placeholder: "Edit your comment…",
    community_edit_reply_placeholder: "Edit your reply…",
    community_reply_to: "Reply to",
    community_comment_as: "Comment as",
    community_support_sent_to_you: "Support Sent to You",
    community_my_node_desc: "Only messages sent by other community members to your node appear here.",
    community_current_glow: "Your Current Mood Glow",
    community_support_received: "Support Received from Others",
    community_locate_globe: "Locate My Node on Globe",
    community_msg_count: "message",

    // Subscription extra
    sub_free_tier: "Free Tier",
    sub_current_plan: "Current Plan",
    sub_free_price: "Free",
    sub_rm0: "RM0",
    sub_free_feat1: "Unlimited daily mood check-ins",
    sub_free_feat2: "Core ONY conversational support",
    sub_free_feat3: "Memory Vault self-reflections",
    sub_free_feat4: "Essential crisis & helpline resources",
    sub_free_feat5: "Full community access",
    sub_allowance_reached: "Daily conversation allowance reached. Upgrade to Premium or continue tomorrow. Safety resources remain 100% free.",
    sub_continue_free: "Continue with Free",
    sub_payg_heading: "Pay As You Go",
    sub_payg_active: "Premium Active",
    sub_payg_title: "ONY 3-Day Pass",
    sub_payg_price: "RM5 / 3 days",
    sub_payg_desc: "Flexible Premium access whenever you need deeper support.",
    sub_payg_feat1: "Instant Premium access for 3 days",
    sub_payg_feat2: "Enhanced AI personalization & depth",
    sub_payg_feat3: "Unlimited conversational continuity",
    sub_payg_feat4: "Advanced weekly mood insights",
    sub_monthly_heading: "Monthly Plan",
    sub_monthly_active: "Active Subscription",
    sub_monthly_title: "ONY Premium",
    sub_monthly_price: "RM19.90 / month",
    sub_monthly_desc: "Continuous Premium companionship with full features unlocked.",
    sub_trial_hero_title: "Choose what fits you best.",
    sub_trial_hero_desc: "The Free tier is always available. Upgrade whenever you want deeper continuity and insights.",
    sub_start_trial: "Start 3-Day Free Trial",
    sub_trial_title: "3-Day Free Trial",

    // Privacy & Account extra
    privacy_hero_title: "Your data, your control.",
    privacy_hero_desc: "Reflections, consented memories, and check-ins are securely encrypted and can be reviewed or removed anytime.",
    privacy_what_used_title: "What may be used",
    privacy_what_used_desc: "Your selected persona, language, active consented memories, and bounded recent conversation context are sent securely with your message.",
    privacy_ai_title: "AI provider",
    privacy_ai_desc: "Conversational replies are processed via private, server-side Gemini API endpoints without exposing your credentials or personal identification.",
    privacy_less_id_title: "Share less identifying data",
    privacy_less_id_desc: "Avoid unnecessary names, addresses, IDs, financial details, or private information about other people.",
    privacy_review_memories: "Review saved memories",
    privacy_view_logs: "View Database Activity & System Logs (.log)",
    privacy_export_archive: "Export my data archive",
    privacy_clear_memories: "Clear saved memories",
    privacy_delete_account: "Delete account and all data",
    privacy_confirm_delete_title: "Permanently delete account?",
    privacy_confirm_delete_desc: "This will permanently purge your user profile, mood history, saved memories, and chat records from our secure servers.",
    privacy_confirm_btn: "Confirm delete my account",

    // About & Legal extra
    about_hero_title: "A softer first step.",
    about_hero_desc: "ONY is a compassionate, low-pressure first layer for everyday emotional support, created with Malaysian young adults in mind.",
    about_not_therapy: "Not therapy",
    about_not_diagnosis: "Not diagnosis",
    about_not_emergency: "Not emergency care",
    about_built_care_title: "Built with Care in Malaysia",
    about_built_care_desc: "ONY is engineered to provide compassionate, culturally-aware companionship, privacy-first community connection, and swift escalation to professional care when you need it most.",
    legal_hero_title: "Clear information, always accessible.",
    legal_hero_desc: "Read our commitment to your privacy, ethical artificial intelligence, and safety boundaries.",

    // Trusted Contacts extra
    trusted_phone_section: "Your Account & Emergency Phone",
    trusted_saved_phone: "Saved emergency number",
    trusted_not_set: "Not set yet",
    trusted_edit_phone: "Edit Phone",
    trusted_add_phone: "Add Phone",
    trusted_invite_link_title: "Invite a Friend via Link",
    trusted_invite_link_desc: "Share this link with a friend. When your friend clicks the link, they can request to become your emergency contact, and you can accept or reject their request right here.",
    trusted_share_link_btn: "Share Invite Link",
    trusted_paste_link_toggle: "Have a friend’s invite link? Paste it here",
    trusted_requests_section: "Requests for Your Approval",
    trusted_no_pending: "No pending requests waiting for your approval right now.",
    trusted_accept_contact: "Accept as My Emergency Contact",
    trusted_reject_contact: "Reject",
    trusted_people_supported: "People You Support as an Emergency Contact",
    trusted_invite_directly: "Or Invite Directly by Email / Name",
    trusted_waiting_recipient: "Request Pending · Waiting for Recipient",
    trusted_call_btn: "Call Contact",
    trusted_send_msg_btn: "Send Message",
    trusted_remove_btn: "Remove trusted contact",
    trusted_invite_another: "Invite Another Contact",

    // Geolocation & Professional Help Nearby
    geo_detect_btn: "Detect My Location",
    geo_detecting: "Detecting location...",
    geo_located_success: "Location detected successfully",
    geo_permission_denied: "Location access was denied or unavailable. Please enable browser permissions.",
    geo_retry: "Retry Detection",
    geo_clear: "Clear Location",
    geo_approx_badge: "Broad Region",
    geo_accuracy_notice: "Broad regional area used for privacy. Exact address is never shared.",
    professional_nearest_tab: "Nearest to Me",
    professional_directions_btn: "Get Directions",
    professional_call_btn: "Call Now",
    professional_details_btn: "Full Details",
    professional_nationwide_badge: "Nationwide (24/7)",
    professional_emergency_tag: "24/7 Emergency",
    professional_walkin_tag: "Walk-in Welcome",
    professional_filter_state: "Filter by State / Region",
    professional_all_states: "All Malaysia",
    professional_search_prompt: "Search clinic name, hospital, area, or service...",
    professional_closest_first: "Sorted by real GPS proximity to your current location",
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
    memory_add_btn: "Tambah Memori",
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
    logs_hero_desc: "Log audit masa nyata bagi peristiwa keselamatan, pengesahan, eskalasi kecemasan, dan tindakan sistem.",
    logs_export_log_btn: "Eksport Fail .log",
    logs_export_json_btn: "Eksport Fail .json",
    logs_diagnostic_btn: "+ Rakam Ujian Diagnostik",
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

    // Onboarding
    onboarding_welcome_eyebrow: "Selamat datang ke",
    onboarding_welcome_title: "ONY",
    onboarding_welcome_lead: "Ruang tenang untuk berehat, meluahkan perasaan, dan berasa tidak keseorangan.",
    onboarding_meet_eyebrow: "Kenali ONY",
    onboarding_meet_title: "Teman tanpa tekanan anda",
    onboarding_meet_lead: "ONY ialah sokongan emosi harian yang lembut—sentiasa mengikut rentak anda.",
    onboarding_companion_eyebrow: "Jadikan ONY milik anda",
    onboarding_companion_title: "Pilih rupa teman ONY anda",
    onboarding_companion_lead: "Pilih penampilan teman yang menyenangkan anda. Nama teman anda sentiasa ONY.",
    onboarding_theme_eyebrow: "Ruang ketenangan anda",
    onboarding_theme_title: "Pilih ruang yang terasa selesa untuk anda",
    onboarding_theme_lead: "Pilih tema visual. Pilihan anda diguna pakai di seluruh aplikasi dan boleh ditukar bila-bila masa.",
    onboarding_sound_eyebrow: "Suasana audio pilihan",
    onboarding_sound_title: "Tambah bunyi menenangkan",
    onboarding_sound_lead: "Dengar suasana yang menenangkan. Anda boleh menjeda atau menukarnya bila-bila masa.",
    onboarding_sound_continue_without: "Teruskan tanpa bunyi",
    onboarding_personalise_eyebrow: "Peribadikan ONY",
    onboarding_personalise_title: "Apa yang dirasakan membantu?",
    onboarding_personalise_lead: "Pilih gaya komunikasi ONY, bahasa, dan topik yang ada di fikiran anda.",
    onboarding_boundaries_eyebrow: "Batasan yang jelas",
    onboarding_boundaries_title: "Sokongan, bukan rawatan",
    onboarding_boundaries_lead: "ONY menawarkan sokongan emosi berasaskan AI dan sumber bantuan kendiri. Ia bukan pakar psikologi, ahli terapi, alat diagnostik, atau perkhidmatan kecemasan.",
    onboarding_boundaries_tag1: "Bukan terapi",
    onboarding_boundaries_tag2: "Tiada diagnosis",
    onboarding_boundaries_tag3: "Bukan rawatan kecemasan",
    onboarding_boundaries_ack: "Saya faham peranan dan batasan ONY.",
    onboarding_privacy_eyebrow: "Privasi anda",
    onboarding_privacy_title: "Apa yang perlu diingati oleh ONY?",
    onboarding_privacy_lead: "Anda sentiasa memegang kawalan. Semak, jeda, atau padam memori pada bila-bila masa.",
    onboarding_privacy_allow_title: "Benarkan memori berkaitan",
    onboarding_privacy_allow_desc: "ONY boleh menyimpan konteks berguna yang anda kongsikan.",
    onboarding_privacy_control_title: "Biar saya kawal memori",
    onboarding_privacy_control_desc: "Minta kebenaran sebelum sesuatu disimpan.",
    onboarding_complete_eyebrow: "Semuanya sedia",
    onboarding_complete_title: "Masuk ke ONY",
    onboarding_complete_lead: "Alami perbualan teman penuh empati, daftar masuk mood harian, dan sumber kesejahteraan yang disahkan.",
    onboarding_btn_continue: "Teruskan",
    onboarding_btn_enter: "Masuk ke ONY",

    // Profile Language Selector
    profile_lang_selector_title: "Bahasa Aplikasi",
    profile_lang_selector_desc: "Pilih bahasa pilihan anda merentasi seluruh aplikasi",
    profile_lang_current: "Bahasa Semasa",

    // Extra Chat & Voice
    chat_safety_protocols: "Protokol keselamatan",
    chat_resources: "Sumber bantuan",
    chat_chats_btn: "Perbualan",
    chat_voice_on: "Suara hidup",
    chat_voice_off: "Suara mati",
    chat_mood_reminder: "Anda belum mendaftar masuk mood anda hari ini.",
    chat_mood_checkin_btn: "Daftar masuk",
    chat_memory_active_badge: "Memori aktif · Anda memegang kawalan",
    chat_memory_paused_badge: "Perkongsian memori dijeda · Anda memegang kawalan",
    chat_view_btn: "Lihat",
    chat_ai_notice: "AI mungkin tidak tepat · Bukan diagnosis atau rawatan",
    chat_limit_title: "Had mesej percuma telah dicapai",
    chat_limit_desc: "Anda telah mencapai had mesej percuma. Sila pilih pelan atau aktifkan percubaan percuma untuk terus berbual dengan ONY.",
    chat_limit_unlock_btn: "Lihat Pelan Langganan & Buka Kunci",
    chat_mode_voice: "Suara",
    chat_mode_text: "Teks",
    chat_voice_tap_mic: "Ketik mikrofon untuk bercakap",
    chat_voice_listening_speak: "Mendengar… bercakap ke mikrofon anda",
    chat_voice_ready_send: "Mendengar… ketik hantar apabila selesai",
    chat_voice_sent: "Mesej dihantar",
    chat_voice_processing: "Memproses suara",
    chat_voice_sub_idle: "ONY mendengar dan mentranskripsi dalam masa nyata",
    chat_voice_sub_listening: "Bercakap mengikut rentak anda",
    chat_voice_send_btn: "Hantar kepada ONY",

    // Extra Community
    community_zoom_in: "Zum masuk",
    community_zoom_out: "Zum keluar",
    community_back_world: "Kembali ke dunia",
    community_tab_globe: "Glob",
    community_tab_posts: "Hantaran",
    community_discoverable_eyebrow: "Ahli boleh dilihat · Tanpa nama",
    community_you_node: "Anda",
    community_your_light: "Cahaya anda di glob",
    community_view_support_sent: "Lihat Sokongan Dihantar kepada Saya",

    // Extra Marketplace & Voucher
    market_nearby_eyebrow: "Kesejahteraan, Berhampiran",
    market_hero_title: "Beri sedikit ruang untuk diri anda.",
    market_hero_desc: "Keistimewaan rakan kongsi eksklusif, ruang menenangkan, dan direktori penjagaan disahkan.",
    market_search_placeholder: "Cari rakan kongsi atau tawaran",
    market_wellness_vouchers: "Baucar Kesejahteraan",
    market_view_all: "Lihat semua",
    market_prof_banner_title: "Cari sokongan profesional berhampiran",
    market_prof_banner_desc: "Klinik berdaftar, pusat MENTARI, dan kaunselor bertauliah",
    voucher_details_title: "Butiran Baucar",
    voucher_partner_offer: "Tawaran Rakan Kesejahteraan",
    voucher_terms_title: "Terma & syarat",
    voucher_redeem_btn: "Tebus Baucar",
    voucher_ready_title: "Baucar Sedia Digunakan!",
    voucher_ready_subtitle: "Pas Ahli Digital",
    voucher_ready_eyebrow: "Baucar anda sedia digunakan",
    voucher_done_btn: "Selesai",

    // Language Preferences Screen
    profile_menu_language: "Pilihan Bahasa",
    profile_menu_language_sub: "Pilih bahasa aplikasi pilihan anda",
    language_screen_title: "Pilihan Bahasa",
    language_screen_subtitle: "Bahasa antara muka & teman perbualan",
    language_screen_desc: "Pilih bahasa pilihan anda",
    language_sync_notice: "Pilihan bahasa anda disimpan ke profil awan anda dan dipulihkan setiap kali anda membuka aplikasi.",
    language_en_note: "Full app interface and conversational companion in English",
    language_bm_note: "Antara muka penuh dan perbualan dalam Bahasa Melayu",
    language_zh_note: "完整的简体中文应用界面与中文陪伴对话",

    // Auth Flow
    auth_welcome_eyebrow: "Selamat Datang ke ONY",
    auth_welcome_title: "Ruang tenang yang bermula daripada anda.",
    auth_welcome_lead: "Refleksi peribadi, perbualan menyokong, dan sumber berguna—mengikut rentak anda.",
    auth_create_account: "Daftar Akaun",
    auth_login: "Log Masuk",
    auth_continue_guest: "Teruskan sebagai tetamu (tempatan)",
    auth_guest_hint: "Log masuk untuk menyimpan refleksi, daftar masuk emosi, dan tetapan peribadi anda dengan selamat di awan.",
    auth_login_title: "Log Masuk ke ONY",
    auth_login_lead: "Ruang peribadi anda dilindungi dengan penyulitan selamat.",
    auth_register_title: "Cipta Akaun ONY",
    auth_register_lead: "Mulakan perjalanan anda dengan refleksi peribadi dan sandaran awan selamat.",
    auth_forgot_title: "Set Semula Kata Laluan",
    auth_forgot_lead: "Pautan set semula kata laluan yang selamat akan dihantar ke emel anda.",
    auth_email_label: "Alamat emel",
    auth_password_label: "Kata laluan",
    auth_confirm_password_label: "Sahkan kata laluan",
    auth_phone_label: "Nombor telefon (disimpan untuk hubungan kecemasan)",
    auth_forgot_password_btn: "Lupa kata laluan?",
    auth_send_reset_btn: "Hantar pautan set semula",
    auth_sending_reset: "Menghantar pautan...",
    auth_name_stage_title: "Apakah nama panggilan anda?",
    auth_name_stage_lead: "Gunakan nama panggilan pilihan anda dan sahkan nombor telefon untuk sokongan kecemasan.",
    auth_name_label: "Nama panggilan",
    auth_consent_title: "Fahami peranan ONY.",
    auth_consent_lead: "ONY ialah teman refleksi dan sokongan emosi berasaskan AI. Ia bukan ahli psikologi, ahli terapi, alat diagnosis klinikal, atau perkhidmatan kecemasan perubatan.",
    auth_consent_agree: "Saya telah membaca dan bersetuju dengan Terma Perkhidmatan dan Dasar Privasi, serta memahami peranan dan batasan keselamatan ONY.",
    auth_create_space_btn: "Terima dan cipta ruang",
    auth_creating_space: "Mencipta ruang...",
    auth_disclaimer_btn: "Penafian & Batasan",
    auth_terms_btn: "Terma Perkhidmatan",
    auth_privacy_btn: "Dasar Privasi",
    auth_crisis_btn: "Sumber Krisis",
    auth_secure_badge: "Selamat & Disulitkan",

    // Personalise Options
    personalise_style_reflective: "Reflektif",
    personalise_style_practical: "Praktikal",
    personalise_style_mix: "Campuran",
    personalise_len_short: "Ringkas",
    personalise_len_balanced: "Seimbang",
    personalise_len_detailed: "Terperinci",
    personalise_memories_toggle: "Memori berkaitan",
    personalise_memories_desc: "Benarkan ONY menggunakan memori aktif dari Kubah Memori.",

    // Common UI extra
    common_retry: "Cuba Semula",
    common_dismiss: "Tolak",
    common_undo: "Buat Semula",
    common_you: "Anda",
    common_edited: "disunting",
    common_optional: "Pilihan",
    common_play: "Mainkan",
    common_pause: "Jeda",
    common_active: "Aktif",
    common_syncing: "Penyegerakan…",

    // Chat action chips & Voice extra
    chat_action_get_help: "Dapatkan bantuan sekarang",
    chat_action_find_support: "Cari sokongan profesional",
    chat_action_contact_trusted: "Hubungi orang dipercayai",
    chat_action_view_resources: "Lihat sumber sokongan",
    chat_action_remember_this: "Ingati perkara ini",
    chat_action_saved_vault: "Disimpan ke Kubah Memori anda.",
    chat_action_try_calming: "Cuba aktiviti menenangkan",
    chat_action_breathing: "Aktiviti pernafasan",
    chat_action_calming_music: "Muzik menenangkan",
    chat_action_study_plan: "Pelan belajar",
    chat_action_take_break: "Berehat sejenak",
    chat_action_talk_about_it: "Bincangkan perkara ini",
    chat_action_find_jobs: "Cari peluang kerjaya",
    chat_action_job_prefs: "Tetapkan pilihan kerjaya",
    chat_action_tell_more: "Ceritakan lebih lanjut",
    chat_action_help_reflect: "Bantu saya renungkan",
    chat_voice_quick_prompts: "Cadangan suara pantas untuk bercakap dengan ONY:",
    chat_voice_prompt_overwhelmed: "Saya berasa sangat terbeban hari ini",
    chat_voice_prompt_breathing: "Bantu saya bertenang dengan latihan pernafasan",
    chat_voice_prompt_talk: "Saya ingin berkongsi tentang apa yang saya rasa",
    chat_voice_try_mic_again: "Cuba Mikrofon Semula",
    chat_voice_session_privacy: "Suara kekal dalam sesi ini sahaja",
    chat_voice_listen: "Dengar suara ONY",
    chat_voice_stop_speaking: "Hentikan pertuturan",

    // Mood & Check-ins extra
    mood_saved_today_title: "Daftar masuk hari ini telah disimpan",
    mood_saved_today_desc: "Emosi anda telah disimpan dalam pangkalan data untuk hari ini. Kembali esok untuk daftar masuk seterusnya.",
    mood_view_history: "Lihat sejarah emosi",
    mood_back_chat: "Kembali ke sembang",
    mood_right_now: "Saat ini",
    mood_scale_hint: "Pilih yang paling menggambarkan rasa anda. Daftar masuk disimpan sekali sehari ke pangkalan data peribadi anda.",
    mood_select_prompt: "Pilih emosi untuk meneruskan.",
    mood_review_previous: "Semak daftar masuk terdahulu",
    mood_complete_banner: "Daftar masuk hari ini telah selesai",
    mood_most_recent: "Paling terkini",
    mood_today_label: "Hari ini",
    mood_empty_title: "Belum ada daftar masuk emosi",
    mood_empty_desc: "Daftar masuk harian anda akan dipaparkan di sini selepas anda merekodnya.",
    mood_daily_checkins: "Daftar masuk harian",
    mood_days_saved: "hari disimpan",
    mood_day_saved: "hari disimpan",
    mood_recent_pattern: "Corak terkini",
    mood_pattern_disclaimer: "Gambaran ringkas rekod harian anda, bukan interpretasi klinikal.",
    mood_need_three: "Sekurang-kurangnya tiga daftar masuk harian diperlukan sebelum trend dipaparkan.",
    mood_firestore_disclaimer: "Setiap daftar masuk emosi disimpan harian. Gunakan suis di sebelah entri untuk sertakan atau kecualikan daripada laporan bulanan.",

    // Memory Vault extra
    memory_search_placeholder: "Cari memori",
    memory_vault_control: "Anda memegang kawalan",
    memory_vault_heading: "Apa yang ONY ingati",
    memory_vault_desc: "Jeda, sunting, atau padam apa jua perkara. Perubahan mempengaruhi perbualan masa depan.",
    memory_saved_section: "Memori tersimpan",
    memory_clear_all: "Kosongkan semua",
    memory_cleared_toast: "Semua memori telah dikosongkan",
    memory_deleted_toast: "Memori telah dipadam",
    memory_updated_toast: "Memori telah dikemas kini",
    memory_added_toast: "Memori berjaya ditambah ke Kubah anda",
    memory_why_remembers: "ONY mengingati ini kerana…",
    memory_privacy_controls: "Kawalan privasi memori",
    memory_ask_before_saving: "Tanya sebelum menyimpan kini",
    memory_edit_title: "Sunting memori",
    memory_add_sub: "Hanya simpan apa yang dirasakan bermanfaat",
    memory_hero_title: "Anda tentukan apa yang kekal.",
    memory_hero_desc: "ONY hanya boleh menggunakan memori ini apabila suis di bawah diaktifkan.",
    memory_kind_text: "Memori Teks",
    memory_kind_image: "Memori Imej",
    memory_what_should_remember: "Apa yang patut ONY ingati?",
    memory_caption_label: "Kapsyen (pilihan)",
    memory_text_placeholder: "Contohnya: Saya rasa lebih tenang apabila mendengar muzik.",
    memory_image_placeholder: "Jalan santai yang tenang dan menenangkan fikiran.",
    memory_category_label: "Kategori",
    memory_allow_use: "Benarkan ONY menggunakan ini",
    memory_allow_use_sub: "Digunakan dalam perbualan teman akan datang.",
    memory_save_btn: "Simpan memori",
    memory_select_image: "Pilih imej",
    memory_select_image_sub: "Lampirkan foto menenangkan dari galeri anda",
    memory_change_image: "Ketik untuk tukar imej",

    // Community extra
    community_globe_pan_hint: "Seret untuk putar · Ketik \"Anda\" untuk lihat mesej sokongan",
    community_nodes_count: "nod boleh ditemui",
    community_someone_here: "Seseorang berada di sini",
    community_mood_higher: "Emosi ceria",
    community_mood_okay: "Biasa",
    community_mood_lower: "Emosi rendah",
    community_mood_none: "Tiada rekod",
    community_guidelines_btn: "Garis Panduan",
    community_appear_globe: "Tampil di glob",
    community_appear_globe_desc: "Apabila dimatikan, cahaya tanpa nama anda disembunyikan daripada glob.",
    community_receive_support: "Terima mesej sokongan",
    community_receive_support_desc: "Apabila dihidupkan, ahli komuniti lain boleh menghantar kata-kata semangat kepada nod anda.",
    community_regional_discovery: "Penemuan Wilayah Luas",
    community_regional_desc: "ONY melindungi privasi anda. Kami hanya menggunakan negeri atau daerah luas, bukan alamat GPS tepat.",
    community_enable_area: "Dayakan Wilayah Luas",
    community_manual_area: "Masukkan Kawasan Manual",
    community_set_area: "Tetapkan Kawasan",
    community_area_placeholder: "cth. Petaling Jaya, Pulau Pinang, Johor Bahru",
    community_safety_note: "Semua ahli dan penghantaran mesej adalah tanpa nama. Nod tidak pernah mendedahkan alamat sebenar.",
    community_posts_heading: "Berkongsi dengan lembut, bersama-sama.",
    community_back_globe: "Kembali ke glob",
    community_search_posts: "Cari catatan atau topik",
    community_post_live: "Catatan anda kini aktif",
    community_post_live_desc: "Terima kasih kerana berkongsi dengan berhemah. Ia kini dipaparkan dalam suapan komuniti.",
    community_return_feed: "Return to community",
    community_create_post_title: "Cipta catatan",
    community_create_post_sub: "Kongsi dengan baik hati, mengikut keselesaan anda",
    community_post_as: "Hantar sebagai",
    community_my_profile: "Profil ONY saya",
    community_format: "Format",
    community_text: "Teks",
    community_image: "Imej",
    community_voice: "Suara",
    community_title_label: "Tajuk",
    community_title_placeholder: "Apa yang ingin anda kongsikan?",
    community_body_label: "Catatan anda",
    community_body_placeholder: "Tulis apa yang terlintas di fikiran anda...",
    community_record_voice: "Rakam mesej suara",
    community_record_hint: "Bercakap ke mikrofon anda dengan lembut",
    community_voice_ready: "Nota suara sedia",
    community_re_record: "Rakam semula",
    community_quick_audio: "Nota Audio Pantas",
    community_mod_notice: "Garis panduan dan moderasi komuniti berkuat kuasa. Kata-kata kasar disekat secara automatik.",
    community_post_detail_title: "Catatan komuniti",
    community_private_identity: "Identiti dirahsiakan",
    community_profile_identity: "Profil komuniti ONY",
    community_calm_image: "Imej menenangkan dikongsi",
    community_comments_title: "Komen",
    community_no_comments: "Belum ada komen. Tinggalkan kata-kata sokongan di bawah.",
    community_edit_comment_placeholder: "Sunting komen anda…",
    community_edit_reply_placeholder: "Sunting balasan anda…",
    community_reply_to: "Balas kepada",
    community_comment_as: "Komen sebagai",
    community_support_sent_to_you: "Sokongan Dihantar kepada Anda",
    community_my_node_desc: "Hanya mesej yang dihantar oleh ahli komuniti lain ke nod anda dipaparkan di sini.",
    community_current_glow: "Kilauan Emosi Semasa Anda",
    community_support_received: "Sokongan Diterima daripada Orang Lain",
    community_locate_globe: "Cari Nod Saya di Glob",
    community_msg_count: "mesej",

    // Subscription extra
    sub_free_tier: "Pelan Percuma",
    sub_current_plan: "Pelan Semasa",
    sub_free_price: "Percuma",
    sub_rm0: "RM0",
    sub_free_feat1: "Daftar masuk emosi harian tanpa had",
    sub_free_feat2: "Sokongan perbualan teras ONY",
    sub_free_feat3: "Refleksi kendiri Kubah Memori",
    sub_free_feat4: "Sumber krisis & talian bantuan penting",
    sub_free_feat5: "Akses penuh komuniti",
    sub_allowance_reached: "Had perbualan harian dicapai. Naik taraf ke Premium atau sambung esok. Sumber keselamatan kekal 100% percuma.",
    sub_continue_free: "Teruskan dengan Percuma",
    sub_payg_heading: "Bayar Apabila Perlu",
    sub_payg_active: "Premium Aktif",
    sub_payg_title: "Pas 3 Hari ONY",
    sub_payg_price: "RM5 / 3 hari",
    sub_payg_desc: "Akses Premium fleksibel bila-bila masa anda perlukan sokongan mendalam.",
    sub_payg_feat1: "Akses Premium segera selama 3 hari",
    sub_payg_feat2: "Pemperibadian & kedalaman AI dipertingkat",
    sub_payg_feat3: "Kesinambungan perbualan tanpa had",
    sub_payg_feat4: "Wawasan emosi mingguan lanjutan",
    sub_monthly_heading: "Pelan Bulanan",
    sub_monthly_active: "Langganan Aktif",
    sub_monthly_title: "ONY Premium",
    sub_monthly_price: "RM19.90 / bulan",
    sub_monthly_desc: "Teman Premium berterusan dengan semua ciri dibuka sepenuhnya.",
    sub_trial_hero_title: "Pilih yang paling sesuai untuk anda.",
    sub_trial_hero_desc: "Pelan Percuma sentiasa ada. Naik taraf bila-bila masa anda inginkan kesinambungan dan wawasan lebih mendalam.",
    sub_start_trial: "Mulakan Percubaan Percuma 3 Hari",
    sub_trial_title: "Percubaan Percuma 3 Hari",

    // Privacy & Account extra
    privacy_hero_title: "Data anda, kawalan anda.",
    privacy_hero_desc: "Refleksi, memori dengan kebenaran, dan daftar masuk dilindungi dengan selamat dan boleh disemak atau dipadam pada bila-bila masa.",
    privacy_what_used_title: "Apa yang mungkin digunakan",
    privacy_what_used_desc: "Personaliti pilihan, bahasa, memori aktif yang dipersetujui, dan konteks perbualan terkini dihantar dengan selamat bersama mesej anda.",
    privacy_ai_title: "Penyedia AI",
    privacy_ai_desc: "Balasan perbualan diproses melalui titik akhir Gemini API pelayan peribadi tanpa mendedahkan bukti kelayakan atau identiti peribadi anda.",
    privacy_less_id_title: "Kongsi kurang data peribadi",
    privacy_less_id_desc: "Elakkan nama yang tidak perlu, alamat, kad pengenalan, butiran kewangan, atau maklumat peribadi orang lain.",
    privacy_review_memories: "Semak memori tersimpan",
    privacy_view_logs: "Lihat Aktiviti Pangkalan Data & Log Sistem (.log)",
    privacy_export_archive: "Eksport arkib data saya",
    privacy_clear_memories: "Kosongkan memori tersimpan",
    privacy_delete_account: "Padam akaun dan semua data",
    privacy_confirm_delete_title: "Padam akaun secara kekal?",
    privacy_confirm_delete_desc: "Ini akan memadam profil pengguna, sejarah emosi, memori tersimpan, dan rekod sembang anda secara kekal dari pelayan kami.",
    privacy_confirm_btn: "Sahkan padam akaun saya",

    // About & Legal extra
    about_hero_title: "Langkah pertama yang lebih lembut.",
    about_hero_desc: "ONY ialah lapisan pertama yang penuh belas kasihan dan bebas tekanan untuk sokongan emosi harian, dicipta khas untuk belia Malaysia.",
    about_not_therapy: "Bukan terapi",
    about_not_diagnosis: "Bukan diagnosis",
    about_not_emergency: "Bukan rawatan kecemasan",
    about_built_care_title: "Dibina dengan Penuh Kasih di Malaysia",
    about_built_care_desc: "ONY direka untuk menyediakan teman yang prihatin dan peka budaya, hubungan komuniti yang menjaga privasi, serta peningkatan pantas kepada rawatan profesional apabila paling diperlukan.",
    legal_hero_title: "Maklumat jelas, sentiasa boleh diakses.",
    legal_hero_desc: "Baca komitmen kami terhadap privasi anda, kecerdasan buatan beretika, dan batasan keselamatan.",

    // Trusted Contacts extra
    trusted_phone_section: "Akaun & Telefon Kecemasan Anda",
    trusted_saved_phone: "Nombor kecemasan tersimpan",
    trusted_not_set: "Belum ditetapkan",
    trusted_edit_phone: "Sunting Telefon",
    trusted_add_phone: "Tambah Telefon",
    trusted_invite_link_title: "Jemput Rakan melalui Pautan",
    trusted_invite_link_desc: "Kongsi pautan ini dengan rakan. Apabila rakan mengetik pautan, mereka boleh memohon untuk menjadi kenalan kecemasan anda, dan anda boleh meluluskan atau menolak di sini.",
    trusted_share_link_btn: "Kongsi Pautan Jemputan",
    trusted_paste_link_toggle: "Ada pautan rakan? Tampal di sini",
    trusted_requests_section: "Permintaan untuk Kelulusan Anda",
    trusted_no_pending: "Tiada permintaan menunggu kelulusan anda pada masa ini.",
    trusted_accept_contact: "Terima sebagai Kenalan Kecemasan Saya",
    trusted_reject_contact: "Tolak",
    trusted_people_supported: "Individu yang Anda Sokong sebagai Kenalan Kecemasan",
    trusted_invite_directly: "Atau Jemput Terus mengikut E-mel / Nama",
    trusted_waiting_recipient: "Permintaan Menunggu · Menunggu Penerima",
    trusted_call_btn: "Panggil Kenalan",
    trusted_send_msg_btn: "Hantar Mesej",
    trusted_remove_btn: "Keluarkan kenalan dipercayai",
    trusted_invite_another: "Jemput Kenalan Lain",

    // Geolocation & Professional Help Nearby
    geo_detect_btn: "Kesan Lokasi Saya",
    geo_detecting: "Mengesan lokasi...",
    geo_located_success: "Lokasi berjaya dikesan",
    geo_permission_denied: "Akses lokasi ditolak atau tidak tersedia. Sila benarkan dalam tetapan pelayar.",
    geo_retry: "Cuba Semula Pengesanan",
    geo_clear: "Padamkan Lokasi",
    geo_approx_badge: "Wilayah Luas",
    geo_accuracy_notice: "Kawasan wilayah luas digunakan demi privasi. Alamat tepat tidak pernah dikongsi.",
    professional_nearest_tab: "Terdekat dengan Saya",
    professional_directions_btn: "Panduan Arah (Peta)",
    professional_call_btn: "Hubungi Sekarang",
    professional_details_btn: "Butiran Penuh",
    professional_nationwide_badge: "Seluruh Negara (24/7)",
    professional_emergency_tag: "Kecemasan 24/7",
    professional_walkin_tag: "Kemasukan Terus",
    professional_filter_state: "Tapis mengikut Negeri / Wilayah",
    professional_all_states: "Seluruh Malaysia",
    professional_search_prompt: "Cari nama klinik, hospital, kawasan, atau perkhidmatan...",
    professional_closest_first: "Disusun mengikut jarak GPS sebenar ke lokasi semasa anda",
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
    memory_add_btn: "添加记忆",
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
    logs_hero_desc: "实时展示系统安全事件、认证记录、危机升级和系统关键操作。",
    logs_export_log_btn: "导出 .log 文件",
    logs_export_json_btn: "导出 .json 文件",
    logs_diagnostic_btn: "+ 写入一条诊断测试日志",
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

    // Onboarding
    onboarding_welcome_eyebrow: "欢迎来到",
    onboarding_welcome_title: "ONY",
    onboarding_welcome_lead: "一个让您慢下来、倾诉心声、感受陪伴的温暖港湾。",
    onboarding_meet_eyebrow: "遇见 ONY",
    onboarding_meet_title: "您的无压力温暖伴侣",
    onboarding_meet_lead: "ONY 是您日常情绪支持的温和起点，始终贴合您的个人节奏。",
    onboarding_companion_eyebrow: "定制您的 ONY",
    onboarding_companion_title: "选择您的 ONY 伴侣外观",
    onboarding_companion_lead: "选择让您感到舒适的形象外观。伴侣的名字始终为 ONY。",
    onboarding_theme_eyebrow: "您的宁静空间",
    onboarding_theme_title: "选择一个让您感到安心舒适的界面主题",
    onboarding_theme_lead: "选择视觉色彩。此设置将应用于全局，后续可随时调整。",
    onboarding_sound_eyebrow: "可选环境白噪音",
    onboarding_sound_title: "开启宁静环境音",
    onboarding_sound_lead: "聆听舒缓的环境氛围音效。您可以随时暂停或切换。",
    onboarding_sound_continue_without: "静音直接继续",
    onboarding_personalise_eyebrow: "个性化 ONY",
    onboarding_personalise_title: "什么样的互动最能帮助您？",
    onboarding_personalise_lead: "选择 ONY 的沟通风格、常用语言与您关心的日常话题。",
    onboarding_boundaries_eyebrow: "清晰的服务边界",
    onboarding_boundaries_title: "陪伴倾诉，非医疗诊疗",
    onboarding_boundaries_lead: "ONY 提供基于人工智能的情绪陪伴与自愈资源。它不是心理学家、执业治疗师、诊断工具或紧急救援服务。",
    onboarding_boundaries_tag1: "非心理治疗",
    onboarding_boundaries_tag2: "不做医学诊断",
    onboarding_boundaries_tag3: "非紧急急救",
    onboarding_boundaries_ack: "我已理解 ONY 的定位及服务局限。",
    onboarding_privacy_eyebrow: "您的隐私安全",
    onboarding_privacy_title: "ONY 应该记住哪些对话记忆？",
    onboarding_privacy_lead: "您始终享有完全控制权。可随时查看、暂停或删除任何记忆条目。",
    onboarding_privacy_allow_title: "允许保留有益记忆",
    onboarding_privacy_allow_desc: "ONY 会妥善保存您分享的有益上下文。",
    onboarding_privacy_control_title: "由我自主确认每条记忆",
    onboarding_privacy_control_desc: "在存储任何信息前先向我询问确认。",
    onboarding_complete_eyebrow: "准备就绪",
    onboarding_complete_title: "进入 ONY",
    onboarding_complete_lead: "开启温暖共情的陪伴对话、每日心情打卡与经过验证的身心健康指南。",
    onboarding_btn_continue: "继续",
    onboarding_btn_enter: "开启 ONY",

    // Profile Language Selector
    profile_lang_selector_title: "应用语言",
    profile_lang_selector_desc: "切换整个应用的界面与交互语言",
    profile_lang_current: "当前语言",

    // Extra Chat & Voice
    chat_safety_protocols: "安全干预机制",
    chat_resources: "援助资源",
    chat_chats_btn: "对话历史",
    chat_voice_on: "语音播报开启",
    chat_voice_off: "语音播报关闭",
    chat_mood_reminder: "您今天尚未记录每日心情打卡。",
    chat_mood_checkin_btn: "去打卡",
    chat_memory_active_badge: "记忆功能开启 · 您享有完全控制",
    chat_memory_paused_badge: "记忆共享已暂停 · 您享有完全控制",
    chat_view_btn: "查看",
    chat_ai_notice: "AI 回复仅供参考 · 并非医疗诊断或专业处方",
    chat_limit_title: "已达到免费消息额度上限",
    chat_limit_desc: "您已用完当前的免费消息条数。请选择订阅计划或开启试用以继续与 ONY 畅聊。",
    chat_limit_unlock_btn: "查看订阅计划并解锁",
    chat_mode_voice: "语音",
    chat_mode_text: "文字",
    chat_voice_tap_mic: "点击麦克风开始说话",
    chat_voice_listening_speak: "正在倾听… 请对着麦克风说话",
    chat_voice_ready_send: "正在倾听… 讲完点击发送",
    chat_voice_sent: "消息已发送",
    chat_voice_processing: "正在识别处理语音",
    chat_voice_sub_idle: "ONY 会实时倾听并转写文字",
    chat_voice_sub_listening: "按您自然的语速诉说即可",
    chat_voice_send_btn: "发送给 ONY",

    // Extra Community
    community_zoom_in: "放大视图",
    community_zoom_out: "缩小视图",
    community_back_world: "重置为全球",
    community_tab_globe: "星球罗盘",
    community_tab_posts: "心情社区",
    community_discoverable_eyebrow: "公开漫游星标 · 严格匿名",
    community_you_node: "您",
    community_your_light: "您在星系中的微光",
    community_view_support_sent: "查看收到的温暖祝福",

    // Extra Marketplace & Voucher
    market_nearby_eyebrow: "身心疗愈 · 触手可及",
    market_hero_title: "为自己留一刻舒展的空间。",
    market_hero_desc: "专属合作伙伴礼遇、静心疗愈空间与严选专业健康目录。",
    market_search_placeholder: "搜索合作机构或专属优惠",
    market_wellness_vouchers: "身心关爱卡券",
    market_view_all: "查看全部",
    market_prof_banner_title: "寻找附近的专业心理与医疗机构",
    market_prof_banner_desc: "注册诊所、MENTARI 心理健康中心及认证辅导咨询师",
    voucher_details_title: "卡券详情",
    voucher_partner_offer: "疗愈商户专属礼遇",
    voucher_terms_title: "使用条款与规则",
    voucher_redeem_btn: "立即兑换卡券",
    voucher_ready_title: "卡券已就绪！",
    voucher_ready_subtitle: "数字会员通行证",
    voucher_ready_eyebrow: "您的凭证已生成，可出示核销",
    voucher_done_btn: "完成",

    // Language Preferences Screen
    profile_menu_language: "语言偏好设置",
    profile_menu_language_sub: "选择您偏好的应用语言",
    language_screen_title: "语言偏好设置",
    language_screen_subtitle: "应用界面与陪伴对话语言",
    language_screen_desc: "选择您的首选语言",
    language_sync_notice: "您的语言偏好将同步存储在云端个人资料中，下次打开应用时自动恢复。",
    language_en_note: "Full app interface and conversational companion in English",
    language_bm_note: "Antara muka penuh dan perbualan dalam Bahasa Melayu",
    language_zh_note: "完整的简体中文应用界面与中文陪伴对话",

    // Auth Flow
    auth_welcome_eyebrow: "欢迎来到 ONY",
    auth_welcome_title: "从你开始的温柔空间。",
    auth_welcome_lead: "随你节奏的私密反思、温暖倾听与实用支持。",
    auth_create_account: "创建账号",
    auth_login: "登录",
    auth_continue_guest: "以访客身份继续（仅本地）",
    auth_guest_hint: "登录后可将您的反思、心情打卡和个性化设置安全保存在云端。",
    auth_login_title: "登录 ONY",
    auth_login_lead: "您的专属空间受安全加密保护。",
    auth_register_title: "创建 ONY 账号",
    auth_register_lead: "开启属于您的旅程，享受私密反思与安全云端备份。",
    auth_forgot_title: "重置密码",
    auth_forgot_lead: "我们将向您的邮箱发送安全的密码重置链接。",
    auth_email_label: "电子邮箱",
    auth_password_label: "密码",
    auth_confirm_password_label: "确认密码",
    auth_phone_label: "手机号码（用于紧急联系人备份）",
    auth_forgot_password_btn: "忘记密码？",
    auth_send_reset_btn: "发送重置链接",
    auth_sending_reset: "正在发送重置链接...",
    auth_name_stage_title: "ONY 应该如何称呼您？",
    auth_name_stage_lead: "设置您喜欢的称呼，并确认您的紧急联系电话。",
    auth_name_label: "显示昵称",
    auth_consent_title: "了解 ONY 的角色与边界。",
    auth_consent_lead: "ONY 是一个基于 AI 的日常情感支持与反思伙伴。它不是心理学家、心理治疗师、临床诊断工具或紧急医疗服务。",
    auth_consent_agree: "我已阅读并接受服务条款和隐私政策，理解 ONY 的定位与安全边界。",
    auth_create_space_btn: "接受并开启空间",
    auth_creating_space: "正在为您创建专属空间...",
    auth_disclaimer_btn: "免责声明与边界",
    auth_terms_btn: "服务条款",
    auth_privacy_btn: "隐私政策",
    auth_crisis_btn: "危机救助资源",
    auth_secure_badge: "私密加密保护",

    // Personalise Options
    personalise_style_reflective: "反思启发",
    personalise_style_practical: "实用行动",
    personalise_style_mix: "两者兼顾",
    personalise_len_short: "简短精炼",
    personalise_len_balanced: "适中平衡",
    personalise_len_detailed: "详细深入",
    personalise_memories_toggle: "关联记忆使用",
    personalise_memories_desc: "允许 ONY 引用记忆库中的有效记忆。",

    // Common UI extra
    common_retry: "重试",
    common_dismiss: "忽略",
    common_undo: "撤销",
    common_you: "你",
    common_edited: "已编辑",
    common_optional: "可选",
    common_play: "播放",
    common_pause: "暂停",
    common_active: "生效中",
    common_syncing: "同步中…",

    // Chat action chips & Voice extra
    chat_action_get_help: "立即获取帮助",
    chat_action_find_support: "寻找专业支持",
    chat_action_contact_trusted: "联系紧急信任联系人",
    chat_action_view_resources: "查看求助资源",
    chat_action_remember_this: "记住这件事",
    chat_action_saved_vault: "已保存至您的记忆宝库。",
    chat_action_try_calming: "尝试舒缓练习",
    chat_action_breathing: "深呼吸练习",
    chat_action_calming_music: "舒缓音乐",
    chat_action_study_plan: "制定学习计划",
    chat_action_take_break: "短暂休息",
    chat_action_talk_about_it: "聊聊这件事",
    chat_action_find_jobs: "寻找适合机会",
    chat_action_job_prefs: "设置职场偏好",
    chat_action_tell_more: "多跟我说说",
    chat_action_help_reflect: "帮我梳理反思",
    chat_voice_quick_prompts: "快速语音提示词：",
    chat_voice_prompt_overwhelmed: "今天感觉有些不知所措",
    chat_voice_prompt_breathing: "带我做一次深呼吸放松",
    chat_voice_prompt_talk: "我想聊聊心里的感受",
    chat_voice_try_mic_again: "重试麦克风",
    chat_voice_session_privacy: "语音仅保留在本次会话中",
    chat_voice_listen: "收听 ONY 语音",
    chat_voice_stop_speaking: "停止朗读",

    // Mood & Check-ins extra
    mood_saved_today_title: "今日心晴已记录",
    mood_saved_today_desc: "您今天的心晴已安全保存到数据库。明天欢迎继续来进行每日记录。",
    mood_view_history: "查看心晴历史",
    mood_back_chat: "返回对话",
    mood_right_now: "此时此刻",
    mood_scale_hint: "选择最贴近当下感受的心晴。每日记录一次并安全存入您的个人历史。",
    mood_select_prompt: "选择一种心情以继续。",
    mood_review_previous: "查看过往心晴记录",
    mood_complete_banner: "今日心晴已完成",
    mood_most_recent: "最近一次记录",
    mood_today_label: "今天",
    mood_empty_title: "暂无心晴记录",
    mood_empty_desc: "完成一次每日记录后，您的心晴轨迹将显示在此处。",
    mood_daily_checkins: "每日心晴记录",
    mood_days_saved: "天已记录",
    mood_day_saved: "天已记录",
    mood_recent_pattern: "近期情绪走势",
    mood_pattern_disclaimer: "仅对您的每日记录作简明展示，非临床医学评估。",
    mood_need_three: "至少需要 3 天的心晴记录方可展示趋势图。",
    mood_firestore_disclaimer: "每日心晴记录均安全保存。您可随时切换右侧开关选择是否纳入月度回顾。",

    // Memory Vault extra
    memory_search_placeholder: "搜索记忆...",
    memory_vault_control: "掌控在您手中",
    memory_vault_heading: "ONY 记住的内容",
    memory_vault_desc: "可随时暂停、编辑或删除。更改将直接应用到未来的对话中。",
    memory_saved_section: "已保存的记忆",
    memory_clear_all: "清空全部",
    memory_cleared_toast: "已清空所有记忆",
    memory_deleted_toast: "记忆已删除",
    memory_updated_toast: "记忆已更新",
    memory_added_toast: "记忆已添加至您的宝库",
    memory_why_remembers: "ONY 记住这个是因为…",
    memory_privacy_controls: "记忆隐私控制",
    memory_ask_before_saving: "保存前询问功能当前为",
    memory_edit_title: "编辑记忆",
    memory_add_sub: "只保存对您有帮助的事项",
    memory_hero_title: "由您决定保留什么。",
    memory_hero_desc: "仅当下方开关开启时，ONY 才会在交流中使用此条记忆。",
    memory_kind_text: "文字记忆",
    memory_kind_image: "图像记忆",
    memory_what_should_remember: "希望 ONY 记住什么？",
    memory_caption_label: "说明文字（可选）",
    memory_text_placeholder: "例如：当我听舒缓音乐时会更容易平静下来。",
    memory_image_placeholder: "一次让我感到内心安宁的散步。",
    memory_category_label: "分类",
    memory_allow_use: "允许 ONY 在对话中使用",
    memory_allow_use_sub: "应用于后续与伙伴的日常对话中。",
    memory_save_btn: "保存记忆",
    memory_select_image: "选择一张图片",
    memory_select_image_sub: "从相册中附加一张舒缓心情的照片",
    memory_change_image: "点击更换图片",

    // Community extra
    community_globe_pan_hint: "拖动以旋转 · 点击“你”查看收到的温暖留言",
    community_nodes_count: "个公开闪烁节点",
    community_someone_here: "有人在这里",
    community_mood_higher: "心情舒畅",
    community_mood_okay: "平静如常",
    community_mood_lower: "情绪低落",
    community_mood_none: "未记录心晴",
    community_guidelines_btn: "社区公约",
    community_appear_globe: "在星球上显示我的光芒",
    community_appear_globe_desc: "关闭后，您的匿名光芒将从星球视图中隐去。",
    community_receive_support: "接收来自伙伴的善意留言",
    community_receive_support_desc: "开启后，其他社区成员可以向您的光芒节点发送匿名鼓励。",
    community_regional_discovery: "宽泛区域发现",
    community_regional_desc: "ONY 严密保护您的隐私。我们仅使用宽泛的省州或大区，绝不收集精准 GPS 地址。",
    community_enable_area: "启用宽泛区域",
    community_manual_area: "手动填写地区",
    community_set_area: "设置地区",
    community_area_placeholder: "例如：吉隆坡、槟城、新山",
    community_safety_note: "所有成员与留言均为匿名安全传递，光芒节点绝不暴露现实真实住址。",
    community_posts_heading: "温柔分享，彼此陪伴。",
    community_back_globe: "返回星球",
    community_search_posts: "搜索帖子或主题...",
    community_post_live: "您的分享已发布",
    community_post_live_desc: "感谢您的真诚倾诉。帖子已在社区动态中呈现。",
    community_return_feed: "返回社区",
    community_create_post_title: "发布分享",
    community_create_post_sub: "按自己的步调，传递善意与真诚",
    community_post_as: "发布身份",
    community_my_profile: "我的 ONY 资料",
    community_format: "格式",
    community_text: "文字",
    community_image: "配图",
    community_voice: "语音",
    community_title_label: "标题",
    community_title_placeholder: "想和大家分享些什么？",
    community_body_label: "正文内容",
    community_body_placeholder: "写下此刻所思所想...",
    community_record_voice: "录制语音消息",
    community_record_hint: "请对着麦克风轻声录制",
    community_voice_ready: "语音录制完成",
    community_re_record: "重录",
    community_quick_audio: "快捷录音样本",
    community_mod_notice: "社区公约与智能风控实时生效。辱骂或违规内容将被自动拦截。",
    community_post_detail_title: "社区动态详情",
    community_private_identity: "身份严格保密",
    community_profile_identity: "ONY 社区认证",
    community_calm_image: "分享舒缓心情的图片",
    community_comments_title: "评论",
    community_no_comments: "暂无评论。欢迎在下方留下暖心善意的话语。",
    community_edit_comment_placeholder: "修改您的评论…",
    community_edit_reply_placeholder: "修改您的回复…",
    community_reply_to: "回复",
    community_comment_as: "以该身份发表评论：",
    community_support_sent_to_you: "给您的善意留言",
    community_my_node_desc: "此处仅展示其他社区伙伴发送给您节点的温暖问候。",
    community_current_glow: "您当前的心情光芒",
    community_support_received: "已收到的温暖鼓励",
    community_locate_globe: "在星球上定位我的节点",
    community_msg_count: "条留言",

    // Subscription extra
    sub_free_tier: "免费基础版",
    sub_current_plan: "当前计划",
    sub_free_price: "免费",
    sub_rm0: "RM0",
    sub_free_feat1: "无限次每日心晴记录",
    sub_free_feat2: "核心 ONY 温暖倾诉支持",
    sub_free_feat3: "记忆宝库个人自我反思",
    sub_free_feat4: "核心危机救助热线与急救通道",
    sub_free_feat5: "完整无碍的互助社区接入",
    sub_allowance_reached: "今日免费对话额度已用完。升级至高级版或明日继续倾诉。急救与安全资源始终 100% 免费。",
    sub_continue_free: "继续使用免费版",
    sub_payg_heading: "按需随充随用",
    sub_payg_active: "高级特权生效中",
    sub_payg_title: "ONY 3天灵活通行证",
    sub_payg_price: "RM5 / 3天",
    sub_payg_desc: "考前或压力倍增期，随时获取深度的即时陪伴支持。",
    sub_payg_feat1: "即刻开启 3 天完整特权",
    sub_payg_feat2: "深度 AI 共情理解与长文对话",
    sub_payg_feat3: "无上限持续对话流",
    sub_payg_feat4: "高级情绪走势分析洞察",
    sub_monthly_heading: "月度订阅计划",
    sub_monthly_active: "已订阅会员",
    sub_monthly_title: "ONY 尊享会员",
    sub_monthly_price: "RM19.90 / 月",
    sub_monthly_desc: "持续无间断的心灵伴侣，畅享全套功能。",
    sub_trial_hero_title: "选择最契合您节奏的心灵陪伴。",
    sub_trial_hero_desc: "免费版始终对您敞开。无论何时需要更深度的洞察，随时轻松升级。",
    sub_start_trial: "开启 3 天免费试用",
    sub_trial_title: "3天免费试用",

    // Privacy & Account extra
    privacy_hero_title: "您的数据，全由您掌控。",
    privacy_hero_desc: "所有感悟记录、授权记忆和心晴历程均受严密加密保护，随时可查阅或删除。",
    privacy_what_used_title: "可能引用的信息",
    privacy_what_used_desc: "您所选的角色风格、语言、经过您授权的记忆片段以及短期上下文会安全附带在消息中。",
    privacy_ai_title: "AI 计算与服务边界",
    privacy_ai_desc: "对话由私密安全的服务端 Gemini API 驱动处理，绝不泄露您的凭据或现实身份识别。",
    privacy_less_id_title: "建议隐去个人敏感信息",
    privacy_less_id_desc: "请尽量避免输入真实姓名、详细住址、身份证号、银行账户等他人或个人隐私。",
    privacy_review_memories: "查看已保存的记忆",
    privacy_view_logs: "查看数据库活动与系统日志 (.log)",
    privacy_export_archive: "导出我的完整数据归档",
    privacy_clear_memories: "清空已保存的记忆",
    privacy_delete_account: "注销账号并抹除所有数据",
    privacy_confirm_delete_title: "确定永久注销此账号？",
    privacy_confirm_delete_desc: "此操作将从我们的安全服务器中永久抹除您的个人资料、心情记录、记忆宝库和全部聊天存档。",
    privacy_confirm_btn: "确认永久删除我的账号",

    // About & Legal extra
    about_hero_title: "迈出更轻柔的第一步。",
    about_hero_desc: "ONY 是专为马来西亚青年群体打造的无压力温暖伙伴，为日常情绪提供贴心倾听与第一道支持防线。",
    about_not_therapy: "非心理治疗",
    about_not_diagnosis: "非医学诊断",
    about_not_emergency: "非急救通道",
    about_built_care_title: "用心倾注 · 植根马来西亚",
    about_built_care_desc: "ONY 融合本土文化关怀与严密隐私防护，提供温暖有爱的情感倾听，并在需要时快速指引专业救助机构。",
    legal_hero_title: "清晰透明，随时可阅。",
    legal_hero_desc: "了解我们对隐私保护、负责任人工智能准则及安全边界的郑重承诺。",

    // Trusted Contacts extra
    trusted_phone_section: "您的账号与紧急联系电话",
    trusted_saved_phone: "已保存的紧急电话",
    trusted_not_set: "尚未设置",
    trusted_edit_phone: "修改号码",
    trusted_add_phone: "添加号码",
    trusted_invite_link_title: "通过链接邀请密友",
    trusted_invite_link_desc: "将此链接分享给好友。好友点击链接后可申请成为您的紧急联系人，您可以在此处随时接受或拒绝。",
    trusted_share_link_btn: "分享邀请链接",
    trusted_paste_link_toggle: "已有好友的邀请链接？点击在此粘贴",
    trusted_requests_section: "等待您审核的申请",
    trusted_no_pending: "目前没有等待您审核的申请。",
    trusted_accept_contact: "接受设为我的紧急联系人",
    trusted_reject_contact: "拒绝",
    trusted_people_supported: "您作为紧急联系人守护的朋友",
    trusted_invite_directly: "或通过账号邮箱/昵称直接邀请",
    trusted_waiting_recipient: "申请已发出 · 等待对方接受",
    trusted_call_btn: "拨打电话",
    trusted_send_msg_btn: "发送短信/信息",
    trusted_remove_btn: "解除紧急联系人关联",
    trusted_invite_another: "邀请其他紧急联系人",

    // Geolocation & Professional Help Nearby
    geo_detect_btn: "检测我的位置",
    geo_detecting: "正在定位中...",
    geo_located_success: "已成功定位您的区域",
    geo_permission_denied: "位置权限被拒绝或不可用。请在浏览器或设备设置中开启定位权限。",
    geo_retry: "重新检测",
    geo_clear: "清除位置",
    geo_approx_badge: "宽泛大区",
    geo_accuracy_notice: "仅使用宽泛大区以保护隐私，绝不收集或公开精确门牌地址。",
    professional_nearest_tab: "离我最近",
    professional_directions_btn: "路线导航",
    professional_call_btn: "立即拨打",
    professional_details_btn: "查看详情",
    professional_nationwide_badge: "全国覆盖 (24/7)",
    professional_emergency_tag: "24/7 急诊",
    professional_walkin_tag: "支持现场初诊",
    professional_filter_state: "按州属 / 区域筛选",
    professional_all_states: "全马来西亚",
    professional_search_prompt: "搜索诊所名称、医院、所在地区或服务项目...",
    professional_closest_first: "已根据您的当前 GPS 位置按距离由近到远排序",
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

export function formatFriendlyTime(isoString: string, lang?: AppLanguage): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      if (lang === "Bahasa Melayu") return "Baru-baru ini";
      if (lang === "中文") return "最近";
      return "Recently";
    }
    const now = Date.now();
    const diff = (now - d.getTime()) / 1000;
    if (diff < 60) {
      if (lang === "Bahasa Melayu") return "Sebentar tadi";
      if (lang === "中文") return "刚刚";
      return "Just now";
    }
    if (diff < 3600) {
      const m = Math.floor(diff / 60);
      if (lang === "Bahasa Melayu") return `${m} minit lalu`;
      if (lang === "中文") return `${m}分钟前`;
      return `${m}m ago`;
    }
    if (diff < 86400) {
      const h = Math.floor(diff / 3600);
      if (lang === "Bahasa Melayu") return `${h} jam lalu`;
      if (lang === "中文") return `${h}小时前`;
      return `${h}h ago`;
    }
    const locale = lang === "Bahasa Melayu" ? "ms-MY" : lang === "中文" ? "zh-CN" : "en-US";
    return d.toLocaleDateString(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    if (lang === "Bahasa Melayu") return "Baru-baru ini";
    if (lang === "中文") return "最近";
    return "Recently";
  }
}

export function getCategoryLabel(category: string, lang?: AppLanguage): string {
  const map: Record<string, { bm: string; zh: string }> = {
    All: { bm: "Semua", zh: "全部" },
    Study: { bm: "Pelajaran", zh: "学习" },
    Work: { bm: "Kerjaya", zh: "工作" },
    Relationships: { bm: "Hubungan", zh: "人际" },
    Motivation: { bm: "Motivasi", zh: "动力" },
    "Self-care": { bm: "Penjagaan Diri", zh: "自愈" },
    General: { bm: "Umum", zh: "随笔" },
    "About Me": { bm: "Tentang Saya", zh: "关于我" },
    Preferences: { bm: "Keutamaan", zh: "偏好习惯" },
    "Important People": { bm: "Orang Penting", zh: "重要的人" },
    Goals: { bm: "Matlamat", zh: "目标" },
    "Things That Help Me": { bm: "Perkara Yang Membantu", zh: "对我有帮助的事" },
    "Special Memories": { bm: "Memori Istimewa", zh: "特别记忆" },
    "Emotional Wellbeing": { bm: "Kesejahteraan Emosi", zh: "情绪关怀" },
    Wellbeing: { bm: "Kesejahteraan", zh: "身心健康" },
    Career: { bm: "Kerjaya", zh: "职场" },
    Stress: { bm: "Tekanan", zh: "减压排解" },
    Loneliness: { bm: "Kesunyian", zh: "告别孤单" },
    "Self-confidence": { bm: "Keyakinan Diri", zh: "自信建立" },
    "General emotional support": { bm: "Sokongan Emosi Umum", zh: "日常情感陪伴" },
    Café: { bm: "Kafe", zh: "静心咖啡" },
    "Art / creative": { bm: "Seni / Kreatif", zh: "艺术与手工" },
    "Yoga / meditation": { bm: "Yoga / Meditasi", zh: "瑜伽与冥想" },
    Music: { bm: "Muzik", zh: "疗愈音乐" },
    Relaxation: { bm: "Relaksasi", zh: "舒缓放松" },
    "Wellness products": { bm: "Produk Kesejahteraan", zh: "健康好物" },
    "Professional support": { bm: "Sokongan Profesional", zh: "专业心理服务" },
  };

  if (!lang || lang === "English") return category;
  const entry = map[category];
  if (!entry) return category;
  return lang === "Bahasa Melayu" ? entry.bm : entry.zh;
}

export function getCompanionLabel(companion: string, lang?: AppLanguage): string {
  const map: Record<string, { bm: string; zh: string }> = {
    Cat: { bm: "Kucing", zh: "小猫" },
    Dog: { bm: "Anjing", zh: "小狗" },
    Bunny: { bm: "Arnab", zh: "小兔" },
    Bear: { bm: "Beruang", zh: "小熊" },
    Fox: { bm: "Musang", zh: "小狐狸" },
    Panda: { bm: "Panda", zh: "熊猫" },
  };
  if (!lang || lang === "English") return companion;
  return map[companion]?.[lang === "Bahasa Melayu" ? "bm" : "zh"] || companion;
}

export function getThemeDetails(id: string, name: string, note: string, lang?: AppLanguage): { name: string; note: string } {
  if (!lang || lang === "English") return { name, note };
  const map: Record<string, { bm: { name: string; note: string }; zh: { name: string; note: string } }> = {
    ocean: {
      bm: { name: "Lautan / Laut", note: "Jernih dan tenang" },
      zh: { name: "海洋", note: "清澈稳静" },
    },
    sunset: {
      bm: { name: "Senja", note: "Lembut dan penuh harapan" },
      zh: { name: "日落", note: "柔和希望" },
    },
    forest: {
      bm: { name: "Hutan / Alam", note: "Tenang dan membumi" },
      zh: { name: "森林自然", note: "平和安定" },
    },
    lavender: {
      bm: { name: "Lavender", note: "Hening dan lembut" },
      zh: { name: "薰衣草", note: "宁静温和" },
    },
    peach: {
      bm: { name: "Pic Hangat", note: "Kehangatan mesra ONY" },
      zh: { name: "暖桃", note: "熟悉的 ONY 温暖" },
    },
    neutral: {
      bm: { name: "Minimalis / Neutral", note: "Ringkas dan fokus" },
      zh: { name: "极简中性", note: "简约专注" },
    },
  };
  return map[id]?.[lang === "Bahasa Melayu" ? "bm" : "zh"] || { name, note };
}

export function getPersonaDetails(id: string, name: string, note: string, preview: string, lang?: AppLanguage): { name: string; note: string; preview: string } {
  if (!lang || lang === "English") return { name, note, preview };
  const map: Record<string, { bm: { name: string; note: string; preview: string }; zh: { name: string; note: string; preview: string } }> = {
    gentle: {
      bm: {
        name: "Lembut & Menenangkan",
        note: "Hangat, empati, dan meyakinkan",
        preview: "Beban itu terasa berat untuk dipikul sendirian. Kita boleh lalui ini secara perlahan, langkah demi langkah.",
      },
      zh: {
        name: "温柔抚慰",
        note: "温暖、富有同理心且令人安心",
        preview: "听起来今天经历了很多不容易的事。我们慢慢来，一次只理清一小步就好。",
      },
    },
    friendly: {
      bm: {
        name: "Mesra & Santai",
        note: "Santai, mudah didekati, dan santai berbual",
        preview: "Banyak perkara untuk satu hari. Nak kita sembang bahagian yang paling mencabar dahulu?",
      },
      zh: {
        name: "亲切日常",
        note: "轻松、随和、像朋友般畅聊",
        preview: "今天真是辛苦了！想先和我聊聊最让你头疼的那部分吗？",
      },
    },
    calm: {
      bm: {
        name: "Tenang & Penuh Pertimbangan",
        note: "Reflektif, sabar, dan teratur",
        preview: "Mari kita berhenti sejenak dengan apa yang anda rasa. Bahagian manakah yang memerlukan perhatian anda dahulu?",
      },
      zh: {
        name: "沉静深思",
        note: "注重反思、耐心沉稳、条理清晰",
        preview: "让我们先停下来感受此刻的心绪。哪一个念头现在最需要被好好安顿？",
      },
    },
  };
  return map[id]?.[lang === "Bahasa Melayu" ? "bm" : "zh"] || { name, note, preview };
}
