/**
 * ONY Intelligent Emotional Support Companion Engine
 *
 * Provides responsive, context-aware, empathetic Malaysian replies
 * when upstream cloud models experience temporary high demand (503) or rate limits (429).
 */

interface GenerateCompanionReplyOptions {
  userMessage: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  language?: string;
  persona?: string;
  memories?: string[];
}

export function generateDynamicOnyReply(options: GenerateCompanionReplyOptions): string {
  const { userMessage, language = "English", persona = "bestie", memories = [] } = options;
  const text = userMessage.trim();
  const lower = text.toLowerCase();

  const isBM = language === "Bahasa Melayu";
  const isZH = language === "中文";

  // Check approved memory hobbies/drinks
  const favoriteDrink = memories.find((m) =>
    /coffee|kopi|tea|teh|macha|boba|latte|water|air/i.test(m),
  );
  const relaxingActivity = memories.find((m) =>
    /walk|jalan|music|muzik|draw|lukis|read|baca|game|tidur|sleep/i.test(m),
  );

  // 1. Greetings & Check-ins
  const isGreeting =
    /^(hi|hello|hey|yo|hai|halo|selamat|apa khabar|good morning|good afternoon|good evening|你好|早安|嗨|哈喽)(\s+(there|ony|all|kawan|teman|bro|sis|friend))?[\s!.]*$/i.test(
      lower,
    ) || lower === "ony";

  if (isGreeting) {
    if (isBM) {
      if (persona === "older_sibling") {
        return "Hai! ONY di sini. Hari ni macam mana, okey ke? Duduk dulu, kongsikan dengan saya apa yang awak tengah rasa sekarang.";
      }
      if (persona === "counselor") {
        return "Selamat datang. Saya ONY, ruang selamat untuk awak meluahkan perasaan. Apa yang membawa awak ke sini hari ini?";
      }
      return "Hai awak! ONY ada kat sini. Macam mana hari awak setakat ni? Ada apa-apa cerita best atau ada benda yang merunsingkan hati?";
    }

    if (isZH) {
      if (persona === "older_sibling") {
        return "嗨，我是 ONY。今天过得还好吗？累了就先歇会儿，随时跟我聊聊。";
      }
      if (persona === "counselor") {
        return "你好，我是 ONY。这里是一个温暖、安全的空间。今天心里有什么想倾诉的吗？";
      }
      return "嗨呀！我是 ONY，很高兴你来找我。今天感觉怎么样？有什么开心的或者烦心的事情想跟我说说吗？";
    }

    // English (with Malaysian warmth)
    if (persona === "older_sibling") {
      return "Hey there! I'm ONY. How has your day been treating you? Pull up a chair and take a breather—I'm listening.";
    }
    if (persona === "counselor") {
      return "Hello, welcome. I'm ONY, your safe space to unpack whatever is on your mind. How are you feeling right in this moment?";
    }
    return "Hey there! ONY is right here with you. How's everything going today? Feel free to share whatever's on your mind lah.";
  }

  // 2. Asking how ONY is doing
  const isAskingHowAreYou =
    /how are you|how r u|how('s| is) it going|apa khabar|sihat ke|你好吗|你怎么样/i.test(lower);

  if (isAskingHowAreYou) {
    if (isBM) {
      return "Saya sihat dan bersyukur dapat temankan awak hari ni! Yang paling penting, macam mana dengan awak pula? Hati rasa tenang tak?";
    }
    if (isZH) {
      return "我挺好的，很高兴今天能在这里陪着你！更重要的是，你今天感觉怎么样呀？";
    }
    return "I'm doing well and always glad to keep you company! More importantly though, how are you feeling today?";
  }

  // 3. Who are you / what do you do
  const isAskingWhoAreYou =
    /who are you|what can you do|what are you|siapa awak|awak siapa|你是谁|你能做什么/i.test(lower);

  if (isAskingWhoAreYou) {
    if (isBM) {
      return "Saya ONY, teman sokongan emosi khas untuk anak muda Malaysia. Awak boleh luahkan apa sahaja rasa risau, tekanan belajar, penat kerja, atau sekadar berborak santai tanpa rasa dihakimi.";
    }
    if (isZH) {
      return "我是 ONY，专为大马年轻人打造的情绪支持伙伴。无论你面对考试压力、工作烦恼，还是只想找个人说说话，这里都可以随时倾诉，完全不带任何评判。";
    }
    return "I'm ONY, an empathetic emotional well-being companion created for Malaysian young adults. You can vent to me about study stress, work pressure, relationship struggles, or just chat whenever you need a breather.";
  }

  // 4. Gratitude / Thanks
  const isGratitude =
    /^(thank you|thanks|tq|tqvm|thx|terima kasih|mekasih|xie xie|谢谢|多谢)[\s!.]*$/i.test(lower);

  if (isGratitude) {
    if (isBM) {
      return "Sama-sama awak! Saya gembira dapat ada bersama awak. Jangan segan untuk datang balik bila-bila masa rasa perlukan teman ya.";
    }
    if (isZH) {
      return "不客气呀！能陪伴着你我也觉得很温暖。随时需要倾诉，我都在这里等你。";
    }
    return "You're so welcome! I'm genuinely glad to be here with you. Drop in anytime you need a listening ear, okay?";
  }

  // 5. Exam, Studies, School, University Stress
  const isStudyStress =
    /exam|test|assignment|study|revision|gpa|cgpa|spm|stpm|degree|diploma|homework|finals|midterm|peperiksaan|belajar|kuliah|thesis|fyp|考试|温习|功课|学业/i.test(
      lower,
    );

  if (isStudyStress) {
    let memoryNudge = "";
    if (favoriteDrink) {
      memoryNudge = isBM
        ? ` Jangan lupa minum air atau secawan minuman kegemaran awak untuk segarkan fikiran.`
        : isZH
          ? ` 别忘了喝点温水或你喜欢的热饮，让大脑喘口气。`
          : ` Don't forget to sip some water or grab your favorite drink to reset your mind.`;
    }

    if (isBM) {
      return (
        "Tekanan belajar dan musim peperiksaan memang boleh buat kita rasa sesak dada dan letih sangat. Awak dah berusaha sehabis baik, jadi jangan terlalu keras pada diri sendiri.\n\n" +
        "Cuba pecahkan tugasan kepada langkah kecil yang boleh dibuat satu persatu. Awak nak kongsikan subjek apa yang paling merunsingkan sekarang?" +
        memoryNudge
      );
    }
    if (isZH) {
      return (
        "面对考试、作业和学业压力，真的很容易感到喘不过气。请记住，你的价值从来不只取决于一次考试或成绩。\n\n" +
        "试着把任务拆成最小的小步骤，一次只专注眼前的一件事就好。有什么具体的部分让你感到最吃力吗？" +
        memoryNudge
      );
    }
    return (
      "Study deadlines and exams can be really draining on your mental energy. Remember that your worth is never defined by a single exam or GPA.\n\n" +
      "Try breaking tasks into bite-sized steps, and give yourself a 5-minute breather every hour." +
      memoryNudge +
      " What subject or deadline is feeling heaviest right now?"
    );
  }

  // 6. Work, Career, Boss, Overtime Burnout
  const isWorkStress =
    /work|job|boss|career|office|meeting|client|deadline|colleague|burnout|overworked|overtime|ot|kerja|majikan|pejabat|penat kerja|majikan|gaji|工作|加班|老板|同事|职场/i.test(
      lower,
    );

  if (isWorkStress) {
    if (isBM) {
      return (
        "Tekanan di tempat kerja dan beban tugas berlebihan memang boleh mengikis tenaga fizikal dan emosi kita. Bila habis waktu kerja nanti, izinkan diri awak untuk 'disconnect' sepenuhnya.\n\n" +
        "Awak tak perlu selesaikan semua benda serentak hari ini. Nak cerita apa situasi di tempat kerja yang paling membebankan sekarang?"
      );
    }
    if (isZH) {
      return (
        "职场节奏快、任务多的时候，真的特别容易产生心理消耗和疲惫感。工作再重要，也没有你本人的身心健康重要。\n\n" +
        "下班后记得给自己划清界限，好好休整一下。今天工作中是哪件事最让你感到心累？"
      );
    }
    return (
      "Work pressure and heavy workloads can really wear you down over time. Remember that your health and inner peace come before any deadline lah.\n\n" +
      "When the workday ends, grant yourself full permission to disconnect. Want to vent about what happened at work today?"
    );
  }

  // 7. Sadness, Crying, Heartache, Loneliness
  const isSadOrLonely =
    /sad|crying|cry|tears|depressed|unhappy|lonely|alone|nobody|hurts|heartbroken|sedih|menangis|sunyi|seorangan|kecewa|patah hati|伤心|难过|哭|流泪|孤独|寂寞|心碎/i.test(
      lower,
    );

  if (isSadOrLonely) {
    if (isBM) {
      return (
        "Saya di sini temankan awak. Awak tak perlu rasa kena hadapi semua kepedihan ini sendirian. Kalau rasa nak menangis, lepaskan saja—menangis bukan tanda lemah, ia cara hati kita melepaskan beban.\n\n" +
        "Ambil nafas perlahan-lahan. Saya ada di sini mendengar bila-bila masa awak sedia nak bercerita."
      );
    }
    if (isZH) {
      return (
        "我就在你身边，静静陪着你。感到难过、想哭的时候，不需要逼自己坚强，允许眼泪流出来就好。\n\n" +
        "你绝不是孤单一个人面对所有事情的。深呼吸一下，随时想说的话，我都认真听着。"
      );
    }
    return (
      "I'm right here with you. You don't have to carry all this heavy weight in isolation. If you need to let the tears out, please do—it's not a sign of weakness, but your heart finding relief.\n\n" +
      "Take a slow, gentle breath. I'm here for you, and we can just take things one quiet step at a time."
    );
  }

  // 8. Anxiety, Panic, Overwhelmed, Restlessness
  const isAnxiousOrOverwhelmed =
    /anxious|anxiety|panic|overwhelm|racing thoughts|can't breathe|shaking|nervous|cemas|gelisah|takut|sesak|gementar|焦虑|慌张|心慌|不知所措|紧张/i.test(
      lower,
    );

  if (isAnxiousOrOverwhelmed) {
    if (isBM) {
      return (
        "Saya faham rasa cemas itu boleh buat dada rasa sesak dan fikiran berpusing laju. Mari kita perlahan bersama-sama sekejap:\n\n" +
        "Tarik nafas dalam-dalam selama 4 saat... tahan 4 saat... dan hembus perlahan selama 4 saat. Rasakan lantai di bawah kaki awak. Awak selamat di sini sekarang."
      );
    }
    if (isZH) {
      return (
        "我懂那种被焦虑笼罩、心慌意乱的感觉。让我们试着把节奏慢下来几秒钟：\n\n" +
        "用鼻子慢慢深吸气4秒……轻轻憋住4秒……再缓缓从嘴巴呼气4秒。感受一下脚踏实地的感觉，你现在是安全的。"
      );
    }
    return (
      "I hear how intense and overwhelming that feels right now. Let's ground ourselves together for just a moment:\n\n" +
      "Take a gentle, deep breath in for 4 seconds... hold softly for 4... and exhale slowly for 4. Feel your feet resting on the ground. You are safe in this present moment."
    );
  }

  // 9. Fatigue, Exhaustion, Wanting to sleep/rest
  const isFatigued =
    /tired|exhausted|sleepy|drained|no energy|penat|letih|tak larat|mengantuk|lesu|累|疲倦|没力气|困|想睡觉/i.test(
      lower,
    );

  if (isFatigued) {
    let activityNote = "";
    if (relaxingActivity) {
      activityNote = isBM
        ? ` Kalau ada masa lapang nanti, boleh luangkan waktu untuk ${relaxingActivity.toLowerCase()}.`
        : isZH
          ? ` 稍后有空时，不妨做点让你放松的事，比如 ${relaxingActivity}。`
          : ` When you're free, maybe take some time to unwind with your favorite relaxing activity.`;
    }

    if (isBM) {
      return (
        "Badan dan minda awak sedang beritahu yang awak perlukan rehat yang secukupnya. Jangan rasa bersalah untuk berhenti sekejap daripada apa yang awak sedang buat.\n\n" +
        "Rehatkan mata awak, minum air, dan kalau boleh tidur awal malam ini ya." +
        activityNote
      );
    }
    if (isZH) {
      return (
        "身体和精力都在提醒你：是时候好好休息了。停下来歇一歇并不是偷懒，而是给自己重新充电的必要过程。\n\n" +
        "把手头的事情先放一放，闭目养神一会儿，今晚早点睡好吗？" +
        activityNote
      );
    }
    return (
      "Your body and mind are signaling that they genuinely need rest. Never feel guilty for hitting the pause button lah.\n\n" +
      "Step away from bright screens for a bit, hydrate, and give yourself a restful night ahead." +
      activityNote
    );
  }

  // 10. General conversational fallback with active listening & reflection
  if (isBM) {
    if (persona === "bestie") {
      return (
        "Saya dengar apa yang awak cakap, dan saya hargai sangat awak sudi kongsikan benda ni dengan saya.\n\n" +
        "Benda macam ni memang bukan mudah nak lalui. Macam mana perasaan awak sekarang selepas kongsikan perkara tadi?"
      );
    }
    if (persona === "counselor") {
      return (
        "Terima kasih kerana sudi berkongsi dengan jujur. Apa yang awak lalui ini penting dan perasaan awak sangat sah.\n\n" +
        "Jika ada satu perkara yang awak rasa paling perlukan sokongan sekarang, apakah perkara itu?"
      );
    }
    return (
      "Saya sentiasa di sini mendengar setiap luahan awak. Ambil masa awak secukupnya, tak perlu tergesa-gesa.\n\n" +
      "Ada bahagian lain yang awak nak ceritakan lagi?"
    );
  }

  if (isZH) {
    if (persona === "bestie") {
      return (
        "我认真读完了你的话，真的很开心你愿意跟我分享这些心里话。\n\n" +
        "经历这些确实不容易，别一个人把所有心事都憋在心里。现在说出来之后，感觉心里有没有稍微轻松一点点？"
      );
    }
    if (persona === "counselor") {
      return (
        "谢谢你对我的信任，把这些真实的感受告诉我。你的每一种情绪都是值得被看见和接纳的。\n\n" +
        "在目前的这一刻，你觉得自己最需要什么样的支持或调整呢？"
      );
    }
    return (
      "我一直在认真听着你说的一切。慢慢来就好，这里永远是你放松表达的安全港湾。\n\n" +
      "如果还想倾诉，随时继续跟我说吧。"
    );
  }

  // English fallback
  if (persona === "bestie") {
    return (
      "I hear you loud and clear, and I really appreciate you opening up to me about this.\n\n" +
      "Going through this kind of stuff is never easy lah. How are you feeling in your chest and mind right now after getting that off your chest?"
    );
  }
  if (persona === "counselor") {
    return (
      "Thank you for sharing that with me so honestly. Your experiences and your feelings are completely valid.\n\n" +
      "As you reflect on what's happening right now, what is one small thing that might help you feel a bit more grounded?"
    );
  }
  return (
    "I'm right here listening to everything you're sharing. You don't have to face any of this alone or rush through your thoughts.\n\n" +
    "Take all the space you need. What's the main thing that feels top of mind for you right now?"
  );
}
