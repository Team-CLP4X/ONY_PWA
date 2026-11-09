// ==========================================
// ONY Wellness Toolkit Content & Self-Help Guides
// Culturally-mindful, gentle language for Malaysian users.
// ==========================================

export type FeelingTag =
  | "Anxious"
  | "Overwhelmed"
  | "Low mood"
  | "Can't sleep"
  | "Angry"
  | "Lonely";

export interface ToolkitStep {
  number: number;
  title: string;
  instruction: string;
  tip?: string;
  actionPrompt?: string;
}

export interface ToolkitGuide {
  id: string;
  title: string;
  titleBm: string;
  titleZh: string;
  duration: string; // e.g. "1 min", "3 min"
  durationMinutes: number;
  icon: string;
  feelings: FeelingTag[];
  tags: string[];
  tagsBm: string[];
  tagsZh: string[];
  summary: string;
  summaryBm: string;
  summaryZh: string;
  intro: string;
  introBm: string;
  introZh: string;
  attribution: string;
  type: "breathing" | "grounding" | "journaling" | "steps";
  steps: ToolkitStep[];
  journalPrompts?: {
    id: string;
    question: string;
    questionBm: string;
    questionZh: string;
    placeholder: string;
  }[];
}

export interface MalaysianHelpline {
  id: string;
  name: string;
  nameBm: string;
  nameZh: string;
  service: string;
  serviceBm: string;
  serviceZh: string;
  phoneNumber: string; // Dial string for tel:
  displayPhone: string;
  hours: string;
  hoursBm: string;
  hoursZh: string;
  tollFree: boolean;
  description: string;
  descriptionBm: string;
  descriptionZh: string;
  verifiedSourceUrl?: string;
}

// ============================================================================
// CRITICAL: VERIFIED MALAYSIAN CRISIS HELPLINES
// TODO: Administrator / tester please verify these official Malaysian helpline
// numbers and operational hours before production deployment.
// Verified against Ministry of Health Malaysia (KKM) official portal.
// ============================================================================
export const MALAYSIAN_CRISIS_HELPLINES: MalaysianHelpline[] = [
  {
    id: "malaysian_emergency_999",
    name: "Malaysian Emergency Services",
    nameBm: "Perkhidmatan Kecemasan Malaysia (MERS 999)",
    nameZh: "马来西亚紧急救援专线 (MERS 999)",
    service: "Police, Ambulance & Emergency Medical Rescue",
    serviceBm: "Polis, Ambulans & Bantuan Perubatan Kecemasan",
    serviceZh: "报警、急救救护车与院前紧急医疗救援",
    phoneNumber: "999",
    displayPhone: "999",
    hours: "24/7 · Immediate Life-Threatening Crisis",
    hoursBm: "24 Jam Setiap Hari · Bahaya Nyawa Serta-merta",
    hoursZh: "24 小时 · 紧急危及生命险情",
    tollFree: true,
    description: "For immediate danger, self-harm emergencies, or acute medical risk.",
    descriptionBm: "Untuk bahaya segera, kecemasan mencederakan diri, atau risiko perubatan kritikal.",
    descriptionZh: "用于即刻人身危险、自伤自残危急状况或突发严重躯体医疗险情。",
    verifiedSourceUrl: "https://999.gov.my",
  },
  {
    id: "talian_heal_15555",
    name: "Talian HEAL 15555 (MOH Malaysia)",
    nameBm: "Talian HEAL 15555 (KKM Malaysia)",
    nameZh: "马来西亚卫生部 HEAL 15555 心理危机热线",
    service: "National Mental Health Crisis Helpline",
    serviceBm: "Talian Krisis Kesihatan Mental Kebangsaan",
    serviceZh: "国家级心理危机干预与心理急救热线",
    phoneNumber: "15555",
    displayPhone: "15555",
    // NOTE: Talian HEAL operates 8:00 AM to 12:00 AM (midnight) daily, NOT 24 hours.
    hours: "8:00 AM – 12:00 AM (Midnight) Daily",
    hoursBm: "8:00 Pagi – 12:00 Tengah Malam Setiap Hari",
    hoursZh: "每天 8:00 AM – 12:00 AM (午夜)",
    tollFree: true,
    description: "Free, confidential crisis counselling operated directly by Ministry of Health (KKM) psychologists.",
    descriptionBm: "Kaunseling krisis percuma dan sulit dikendalikan oleh Pegawai Psikologi Kaunseling Kementerian Kesihatan Malaysia.",
    descriptionZh: "由马来西亚卫生部 (KKM) 注册心理辅导官员接听，提供专业保密的危机干预与心理疏导。",
    verifiedSourceUrl: "https://www.moh.gov.my",
  },
  {
    id: "befrienders_kl",
    name: "Befrienders Kuala Lumpur",
    nameBm: "Befrienders Kuala Lumpur",
    nameZh: "吉隆坡心灵扶助会 (Befrienders KL)",
    service: "24/7 Emotional Care & Suicide Prevention",
    serviceBm: "Sokongan Emosi 24 Jam & Pencegahan Bunuh Diri",
    serviceZh: "24小时免费情感支持与自杀干预热线",
    phoneNumber: "0376272929",
    displayPhone: "03-7627 2929",
    hours: "24 Hours Daily · Always Available",
    hoursBm: "24 Jam Setiap Hari · Sentiasa Ada",
    hoursZh: "24 小时全天候倾听",
    tollFree: false,
    description: "Compassionate, non-judgmental emotional listening for anyone feeling distressed or alone.",
    descriptionBm: "Pusat pendengar emosi yang prihatin dan tanpa menghakimi untuk sesiapa yang berasa tertekan atau sunyi.",
    descriptionZh: "由训练有素的志愿者提供充满温情、绝不带评判的情感倾听，陪伴困顿中的您。",
    verifiedSourceUrl: "https://www.befrienders.org.my",
  },
  {
    id: "talian_kasih_15999",
    name: "Talian Kasih 15999",
    nameBm: "Talian Kasih 15999 (KPWKM)",
    nameZh: "关怀热线 Talian Kasih 15999 (妇女家庭部)",
    service: "Family Welfare, Domestic Care & Crisis Support",
    serviceBm: "Kebajikan Keluarga, Krisis Domestik & Kaunseling",
    serviceZh: "家庭关怀、心理辅导与家庭危机支持",
    phoneNumber: "15999",
    displayPhone: "15999 / WA: 019-261 5999",
    hours: "24 Hours Daily · Free Toll-Free",
    hoursBm: "24 Jam Setiap Hari · Bebas Tol Percuma",
    hoursZh: "24 小时免费专线",
    tollFree: true,
    description: "National helpline under the Ministry of Women, Family and Community Development (KPWKM).",
    descriptionBm: "Talian bantuan kebangsaan di bawah Kementerian Pembangunan Wanita, Keluarga dan Masyarakat.",
    descriptionZh: "马来西亚妇女、家庭及社会发展部官方24小时救助专线，提供心理支持与危机庇护转介。",
    verifiedSourceUrl: "https://www.kpwkm.gov.my",
  },
];

// ============================================================================
// SELF-HELP GUIDES DATA
// ============================================================================
export const TOOLKIT_GUIDES: ToolkitGuide[] = [
  {
    id: "breathing_box",
    title: "Box Breathing (Square Breathing)",
    titleBm: "Pernafasan Empat Segi (Box Breathing)",
    titleZh: "箱式呼吸法 (4-4-4-4 正方形呼吸)",
    duration: "1 min",
    durationMinutes: 1,
    icon: "wind",
    feelings: ["Anxious", "Overwhelmed", "Angry"],
    tags: ["acute anxiety", "panic spikes", "nervous system reset"],
    tagsBm: ["kebimbangan akut", "panik", "set semula saraf"],
    tagsZh: ["急性焦虑", "惊恐平复", "平复心率"],
    summary: "Slow 4-4-4-4 rhythm to slow down a racing heart and reset panic.",
    summaryBm: "Irama perlahan 4-4-4-4 untuk menenangkan degupan jantung dan set semula panik.",
    summaryZh: "经典的 4-4-4-4 节奏呼吸，迅速平缓心律与交感神经过度激活。",
    intro:
      "Box breathing regulates the autonomic nervous system by equalizing oxygen and carbon dioxide levels. It is used by first responders and healthcare clinicians to regain focus during high stress.",
    introBm:
      "Pernafasan empat segi mengimbangi sistem saraf autonomik anda dengan menyamakan kitaran oksigen dan karbon dioksida. Ia digunakan secara meluas oleh petugas kecemasan untuk memulihkan ketenangan.",
    introZh:
      "箱式呼吸通过均等化吸气、屏息与呼气，向大脑迷走神经发送安全信号，帮助身心迅速退出‘战斗或逃跑’应激状态。",
    attribution: "Adapted from clinical breathing protocols & Mayo Clinic stress-reduction practices.",
    type: "breathing",
    steps: [
      {
        number: 1,
        title: "Find your grounding posture",
        instruction: "Sit comfortably with your spine tall and both feet planted flat on the floor. Drop your shoulders away from your ears.",
        tip: "Unclench your jaw and rest your hands gently on your lap.",
      },
      {
        number: 2,
        title: "Inhale gently (4 seconds)",
        instruction: "Breathe in through your nose slowly and smoothly for 4 counts. Feel your belly rise gently.",
        tip: "Keep the breath gentle, not forced.",
      },
      {
        number: 3,
        title: "Hold with ease (4 seconds)",
        instruction: "Gently hold the breath for 4 counts without tensing your throat or chest.",
        tip: "Notice the stillness in your body.",
      },
      {
        number: 4,
        title: "Exhale softly (4 seconds)",
        instruction: "Release the breath through your mouth or nose for 4 smooth counts, letting your muscles soften.",
        tip: "Imagine blowing out tension.",
      },
      {
        number: 5,
        title: "Rest empty (4 seconds)",
        instruction: "Pause comfortably for 4 counts before the next cycle begins.",
        tip: "Repeat 4 to 6 cycles to settle the nervous system.",
      },
    ],
  },
  {
    id: "grounding_54321",
    title: "5-4-3-2-1 Sensory Grounding",
    titleBm: "Teknik Pembumian Deria 5-4-3-2-1",
    titleZh: "5-4-3-2-1 五感身心着陆法",
    duration: "2 min",
    durationMinutes: 2,
    icon: "eye",
    feelings: ["Anxious", "Overwhelmed", "Low mood"],
    tags: ["racing thoughts", "dissociation", "sensory overwhelm"],
    tagsBm: ["fikiran bercelaru", "kebas emosi", "terlalu terbeban"],
    tagsZh: ["杂念纷飞", "思维反刍", "身体游离"],
    summary: "Engage all 5 senses to bring your mind back into the safe, physical present.",
    summaryBm: "Gunakan 5 deria fizikal untuk membawa fikiran anda kembali ke masa kini yang selamat.",
    summaryZh: "借助视、触、听、嗅、味五种感官，将注意力轻柔带回当下的实体世界。",
    intro:
      "When anxiety floods the mind, thoughts get stuck in past regrets or future fears. Sensory grounding interrupts that loop by redirecting brain activity to immediate, tangible sensory inputs around you.",
    introBm:
      "Apabila fikiran dibanjiri kebimbangan, minda sering terperangkap dalam ketakutan masa depan. Pembumian deria memecahkan kitaran ini dengan memfokuskan semula kepada persekitaran nyata anda.",
    introZh:
      "当焦虑袭来，大脑容易深陷负面假想。五感着陆法通过搜集身边的真实物理信号，向大脑杏仁核证实：此时此刻，您是安全的。",
    attribution: "Adapted from NHS UK Grounding Techniques & Dialectical Behavior Therapy (DBT) mindfulness.",
    type: "grounding",
    steps: [
      {
        number: 1,
        title: "5 things you can SEE",
        instruction: "Look around your space right now. Name 5 distinct things you see (e.g. a shadow on the floor, a light switch, a pen, a curtain fold, a potted leaf).",
        tip: "Notice the exact colors and shapes.",
      },
      {
        number: 2,
        title: "4 things you can FEEL",
        instruction: "Notice 4 physical textures or contact points (e.g. your feet on the floor, the fabric of your shirt, the cool phone in your hand, air on your skin).",
        tip: "Take a moment to truly feel the sensation.",
      },
      {
        number: 3,
        title: "3 things you can HEAR",
        instruction: "Listen closely to the room or outside. Pick out 3 distinct sounds (e.g. a distant engine, a ceiling fan whirring, birds, or your own breath).",
        tip: "Notice soft background noises you usually ignore.",
      },
      {
        number: 4,
        title: "2 things you can SMELL",
        instruction: "Notice 2 scents in the air (e.g. fresh coffee, soap, rain, clean fabric, or take a sniff of your sleeve).",
        tip: "If you can't smell anything, imagine your favorite comforting aroma.",
      },
      {
        number: 5,
        title: "1 thing you can TASTE or APPRECIATE",
        instruction: "Notice the lingering taste of water or mint, or mentally name one small reassuring truth: 'Right now, in this second, I am okay.'",
        tip: "Finish with one deep, gentle sigh.",
      },
    ],
  },
  {
    id: "stress_reset",
    title: "Stress Management & Micro-Action",
    titleBm: "Pengurusan Tekanan & Tindakan Mikro",
    titleZh: "压力解冻与微行动清单",
    duration: "3 min",
    durationMinutes: 3,
    icon: "checkCircle",
    feelings: ["Overwhelmed", "Anxious"],
    tags: ["work & study overload", "decision paralysis", "brain freeze"],
    tagsBm: ["beban belajar & kerja", "kebuntuan keputusan", "otak tepu"],
    tagsZh: ["学业工作重负", "选择困难", "拖延与瘫痪感"],
    summary: "Shrink overwhelming tasks into the single smallest step you can begin today.",
    summaryBm: "Kecilkan tugasan besar kepada satu langkah paling mudah yang boleh dimulakan hari ini.",
    summaryZh: "将庞大重压拆解为‘小到不可思议’的第一步微行动，告别拖延瘫痪。",
    intro:
      "When we feel overwhelmed, our brain treats a giant to-do list like a physical threat. Shrinking our focus to one tiny 2-minute action dissolves paralysis and rebuilds self-trust.",
    introBm:
      "Apabila kita rasa tertekan, otak menganggap senarai tugas yang panjang seperti ancaman fizikal. Memfokuskan hanya kepada satu tindakan kecil memulihkan keyakinan kendiri tanpa keletihan.",
    introZh:
      "面对堆积如山的事项，大脑会触发‘应激假死’。微行动法帮助您只聚焦接下来的10分钟，将掌控感重新夺回手中。",
    attribution: "Adapted from WHO 'Doing What Matters in Times of Stress' & Behavioral Activation principles.",
    type: "steps",
    steps: [
      {
        number: 1,
        title: "Name the pressure",
        instruction: "Mentally name the single heaviest thought weighing on you right now. Say it plainly: 'I am feeling overwhelmed by...'",
        tip: "Naming it reduces emotional reactivity in the brain.",
      },
      {
        number: 2,
        title: "Sort into two piles",
        instruction: "Ask yourself: 'What part of this is actually within my control in the next 15 minutes, and what must be put down for now?'",
        tip: "You cannot solve next week's worries this afternoon.",
      },
      {
        number: 3,
        title: "Shrink to an absurdly small step",
        instruction: "Identify the smallest visible movement. Not 'finish the assignment', but 'open the laptop file' or 'put 1 dish in the sink'.",
        tip: "If it feels too heavy, shrink it in half again.",
      },
      {
        number: 4,
        title: "Set a 5-minute timer",
        instruction: "Give yourself permission to do only this one tiny thing for 5 minutes. When the timer dings, you can stop guilt-free.",
        tip: "Movement creates momentum.",
      },
      {
        number: 5,
        title: "Acknowledge your effort",
        instruction: "Take a quiet moment to recognize: 'I showed up for myself today under heavy circumstances. That counts.'",
        tip: "Consistency beats perfection every time.",
      },
    ],
  },
  {
    id: "sleep_winddown",
    title: "Sleep Wind-Down & Body Scan",
    titleBm: "Relaksasi Tidur & Imbasan Tubuh",
    titleZh: "助眠平缓与渐进式身体扫描",
    duration: "4 min",
    durationMinutes: 4,
    icon: "moon",
    feelings: ["Can't sleep", "Anxious", "Overwhelmed"],
    tags: ["bedtime rumination", "muscle tension", "sleep anxiety"],
    tagsBm: ["sukar tidur", "ketegangan otot", "fikiran malam"],
    tagsZh: ["睡前反刍", "身体紧绷", "入睡困难"],
    summary: "Release physical tightness from head to toe to tell your body it is safe to rest.",
    summaryBm: "Lepaskan ketegangan fizikal dari kepala ke kaki untuk memberi isyarat selamat kepada badan anda.",
    summaryZh: "从头顶到脚趾逐级释放肌肉紧绷，向身体发出可以安然入眠的信号。",
    intro:
      "Racing thoughts at bedtime are usually sustained by hidden physical tension in the jaw, shoulders, and abdomen. Releasing physical tightness signals the brain to lower cortisol and prepare for sleep.",
    introBm:
      "Fikiran yang laju sebelum tidur sering dipicu oleh ketegangan tersembunyi pada rahang dan bahu. Melepaskan ketegangan ini menghantar isyarat bahawa masa bahaya sudah berlalu.",
    introZh:
      "夜间失眠往往源于无意识的咬牙、耸肩与浅呼吸。渐进式身体扫描能有效解除肌肉痉挛，帮助自主神经自然过渡到副交感神经修复状态。",
    attribution: "Adapted from Harvard Sleep Health protocols & Progressive Muscle Relaxation (PMR).",
    type: "steps",
    steps: [
      {
        number: 1,
        title: "Prepare your resting sanctuary",
        instruction: "Dim the screen brightness, lay flat on your back, and let your arms rest loosely by your sides.",
        tip: "Place a pillow under your knees if your lower back feels tight.",
      },
      {
        number: 2,
        title: "Unclench your jaw and soften your face",
        instruction: "Drop your jaw slightly so your upper and lower teeth don't touch. Let your tongue rest gently on the floor of your mouth. Smooth the space between your eyebrows.",
        tip: "We carry immense silent tension in our forehead and jaw.",
      },
      {
        number: 3,
        title: "Melt your shoulders into the bed",
        instruction: "Exhale deeply and let your shoulders drop downwards, feeling the mattress support your full upper body weight.",
        tip: "You don't need to hold yourself up anymore.",
      },
      {
        number: 4,
        title: "Soft belly breathing",
        instruction: "Place one hand gently on your belly. Breathe softly so only your hand rises and falls. No deep gasping—just quiet, natural rhythm.",
        tip: "Let each exhale feel slightly longer than each inhale.",
      },
      {
        number: 5,
        title: "Heaviness through legs and toes",
        instruction: "Bring gentle awareness to your hips, thighs, calves, and feet. Imagine a warm, safe weight grounding your legs, letting all remaining alertness drift away.",
        tip: "Allow sleep to come when it's ready, without forcing.",
      },
    ],
  },
  {
    id: "reflection_journaling",
    title: "Mindful Reflection & Journaling",
    titleBm: "Refleksi Minda & Penulisan Jurnal",
    titleZh: "正念反思与舒缓情绪日记",
    duration: "5 min",
    durationMinutes: 5,
    icon: "edit",
    feelings: ["Low mood", "Overwhelmed", "Lonely"],
    tags: ["emotional clarity", "processing feelings", "diary release"],
    tagsBm: ["kejelasan emosi", "luahan rasa", "diari peribadi"],
    tagsZh: ["理清心绪", "情感表达", "私密日志"],
    summary: "Guided prompts to untangle confusing feelings, with one-tap save to your private diary.",
    summaryBm: "Soalan berpandu untuk merungkai emosi yang mengelirukan, dengan simpan terus ke diari anda.",
    summaryZh: "三道温柔启发式问答，倾听内心深处的微小声音，并可一键收纳进私密日记。",
    intro:
      "Putting emotional distress into written words moves activity from the reactive emotional centers of the brain to the reflective prefrontal cortex, bringing immediate calm and psychological distance.",
    introBm:
      "Menyusun emosi ke dalam kata-kata bertulis membantu otak memproses perasaan secara tenang dan memberi ruang kelegaan yang selamat.",
    introZh:
      "将情绪具象化为文字，能有效降低大脑杏仁核的过载预警，建立温和的自我觉察与治愈空间。",
    attribution: "Based on Pennebaker therapeutic expressive writing research & reflective journaling models.",
    type: "journaling",
    steps: [
      {
        number: 1,
        title: "Arrive without judgment",
        instruction: "Whatever you are feeling today—numb, frustrated, tired, or quiet—is welcome here. There is no 'right' way to feel.",
        tip: "Write for yourself, not for an audience.",
      },
      {
        number: 2,
        title: "Prompt 1: What is present?",
        instruction: "Answer the first reflection prompt below to name your inner weather today.",
        tip: "Keep it honest and simple.",
      },
      {
        number: 3,
        title: "Prompt 2: What is heavy?",
        instruction: "Express anything you've been carrying alone that deserves to be put down on paper.",
        tip: "Words on a screen don't define who you are.",
      },
      {
        number: 4,
        title: "Prompt 3: A small kindness",
        instruction: "What is one gentle mercy or boundary you can gift yourself before today ends?",
        tip: "Even resting 10 minutes earlier counts.",
      },
      {
        number: 5,
        title: "Save to your Memory Vault",
        instruction: "Tap 'Save to Memory Vault' to safely preserve this entry in your private diary for future reflection.",
        tip: "Your entries are encrypted and private.",
      },
    ],
    journalPrompts: [
      {
        id: "prompt_weather",
        question: "What is one feeling that has been visiting you today, without judging it as good or bad?",
        questionBm: "Apakah satu perasaan yang hadir dalam diri anda hari ini, tanpa menilai ia sebagai baik atau buruk?",
        questionZh: "今天内心最常浮现的一种情绪是什么？试着不带评判地接纳它。",
        placeholder: "Today I noticed a feeling of...",
      },
      {
        id: "prompt_heavy",
        question: "What is something heavy you have been carrying alone that you'd like to put down for a moment?",
        questionBm: "Apakah beban yang anda tanggung sendirian yang ingin anda lepaskan seketika di sini?",
        questionZh: "最近独自背负的某件重担是什么？在这里把它轻轻写下，暂时卸下防线。",
        placeholder: "Something weighing heavily on me is...",
      },
      {
        id: "prompt_kindness",
        question: "What is one gentle kindness you can offer yourself before this day ends?",
        questionBm: "Apakah satu kebaikan kecil yang boleh anda berikan kepada diri anda sebelum hari ini berakhir?",
        questionZh: "在今天结束前，你能给疲惫的自己送上的一句安慰或一个微小的体恤是什么？",
        placeholder: "Before tonight, I can treat myself with...",
      },
    ],
  },
  {
    id: "calming_anger",
    title: "Cooling Anger & Releasing Tension",
    titleBm: "Menenangkan Kemarahan & Melepaskan Ketegangan",
    titleZh: "化解怒火与释放肌肉紧绷",
    duration: "4 min",
    durationMinutes: 4,
    icon: "alertTriangle",
    feelings: ["Angry", "Overwhelmed"],
    tags: ["frustration", "irritation", "diffuse anger"],
    tagsBm: ["kemarahan", "rasa geram", "tekanan emosi"],
    tagsZh: ["易怒烦躁", "情绪激惹", "躯体发热"],
    summary: "Physical cooldown techniques to safely release adrenaline and regain composure.",
    summaryBm: "Teknik penyejukan fizikal untuk melepaskan adrenalin dengan selamat dan tenang semula.",
    summaryZh: "通过物理降温与肌肉舒缩，快速代谢肾上腺素激增，恢复理智和平和。",
    intro:
      "Anger triggers intense somatic arousal—clenched fists, rapid pulse, and tunnel vision. Cooling down physically before speaking or texting prevents regret and protects your boundaries.",
    introBm:
      "Kemarahan mencetuskan tindak balas fizikal seperti degupan laju dan genggaman ketat. Menyejukkan badan secara fizikal memberi masa untuk berfikir secara tenang.",
    introZh:
      "愤怒是边界被侵犯时的自然警报，但冲动反应常带来伤害。本练习帮助您在安全空间释放生理性愤怒冲动，化解身体毒素。",
    attribution: "Adapted from Cognitive Behavioral Therapy (CBT) somatic regulation & DBT distress tolerance.",
    type: "steps",
    steps: [
      {
        number: 1,
        title: "Step away & physical cooldown",
        instruction: "Physically step back from the situation or your phone. Splash cool water on your face or hold a cold glass of water against your wrists.",
        tip: "Cool sensations trigger the mammalian dive reflex to drop heart rate.",
      },
      {
        number: 2,
        title: "The 5-second fist clench",
        instruction: "Squeeze your hands into tight fists for 5 seconds. Feel the raw energy. Then, intentionally open your palms completely wide and drop them to your sides.",
        tip: "Repeat 3 times to discharge motor tension.",
      },
      {
        number: 3,
        title: "Extended sigh exhale",
        instruction: "Breathe in through your nose for 3 seconds, then exhale with a long, audible sigh through your mouth for 6 seconds.",
        tip: "Long exhales stimulate the parasympathetic braking system.",
      },
      {
        number: 4,
        title: "Validate the signal",
        instruction: "Acknowledge the boundary: 'My anger is telling me something crossed a line. I will protect myself best by responding with clarity, not impulse.'",
        tip: "Anger is valid information, but not always a good driver.",
      },
      {
        number: 5,
        title: "Pause before communicating",
        instruction: "Agree with yourself not to send texts, emails, or make decisions for at least 30 minutes until your pulse returns to normal.",
        tip: "Draft it in your private notes if you need to let it out first.",
      },
    ],
  },
  {
    id: "self_compassion_loneliness",
    title: "Soothing Loneliness & Self-Compassion",
    titleBm: "Merawat Kesunyian & Belas Kasihan Kendiri",
    titleZh: "抚平孤独与温柔自我关怀",
    duration: "3 min",
    durationMinutes: 3,
    icon: "heart",
    feelings: ["Lonely", "Low mood"],
    tags: ["isolation", "feeling unseen", "soothing touch"],
    tagsBm: ["rasa terasing", "sunyi", "sentuhan menenangkan"],
    tagsZh: ["孤立无援", "被忽视感", "自我慈悲"],
    summary: "Comforting self-touch and reassuring words to counter the ache of feeling alone.",
    summaryBm: "Sentuhan fizikal yang mendamaikan dan kata-kata penenang untuk merawat rasa kesunyian.",
    summaryZh: "运用富有治愈力的躯体温热与自我宽慰絮语，拥抱感到孤单的心灵。",
    intro:
      "Loneliness is not a personal failure; it is an innate human ache for connection. Placing a warm hand on your chest stimulates oxytocin, releasing feelings of safety and companionship.",
    introBm:
      "Kesunyian bukanlah kelemahan diri, tetapi fitrah manusia yang mendambakan perhubungan. Meletakkan tangan di dada merangsang hormon ketenangan dan keselamatan.",
    introZh:
      "孤独是渴望连结的本能信号。通过将温暖的手心贴在胸口，大脑会接收到类似拥抱的催产素神经反馈，消融内心的冰冷与空虚。",
    attribution: "Adapted from Dr. Kristin Neff's Self-Compassion Break & Mindful Self-Compassion (MSC).",
    type: "steps",
    steps: [
      {
        number: 1,
        title: "Soothing touch",
        instruction: "Place one or both hands gently over the center of your chest, or wrap your arms around your shoulders in a warm hug.",
        tip: "Feel the literal warmth and subtle rise and fall of your heartbeat.",
      },
      {
        number: 2,
        title: "Acknowledge the ache",
        instruction: "Say to yourself gently: 'This is a moment of loneliness. Loneliness hurts, and it is a heavy feeling to carry right now.'",
        tip: "Don't rush to fix it; just give it room to exist.",
      },
      {
        number: 3,
        title: "Remember common humanity",
        instruction: "Remind yourself: 'I am not broken for feeling this way. Right now, thousands of other gentle people in Malaysia and across the world are feeling this same human longing.'",
        tip: "You are part of a shared human fabric.",
      },
      {
        number: 4,
        title: "Offer words of warmth",
        instruction: "Speak inwardly with the voice you would use for a cherished friend: 'May I be patient with myself. May I give myself the kindness I need right now.'",
        tip: "Let the words sink into your chest.",
      },
      {
        number: 5,
        title: "Connect with one small thing",
        instruction: "Drink a warm cup of water, step out to look at the sky, or send a low-pressure hello to a loved one or ONY.",
        tip: "One gentle step reconnects you with the world.",
      },
    ],
  },
];
