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
  const { userMessage, language = "English", persona = "gentle", memories = [] } = options;
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
      if (persona === "friendly") {
        return "Hai awak! ONY kat sini. Hari ni macam mana, okey ke tak okey? Jom lepak kejap, ada cerita best atau benda buat pening kepala nak sembang?";
      }
      if (persona === "calm") {
        return "Salam sejahtera. Saya ONY, ruang tenang untuk awak berhenti sejenak. Bagaimana heningnya fikiran awak saat ini?";
      }
      return "Hai... selamat datang. Saya ONY. Tarik nafas perlahan-lahan ya. Macam mana hati awak rasa hari ni? Saya ada kat sini teman awak lembut-lembut.";
    }

    if (isZH) {
      if (persona === "friendly") {
        return "嗨呀！我是 ONY，今天过得怎么样？先喝口水歇歇，有什么开心的小事或者烦心的糟心事想跟我吐槽吐槽吗？";
      }
      if (persona === "calm") {
        return "你好，我是 ONY。在喧嚣的一天里，这里是专属于你的一方安宁角落。此刻你的呼吸与心绪，感觉如何？";
      }
      return "嗨... 很高兴你来找我。我是 ONY。今天过得辛苦了吗？慢慢来不用着急，无论心里有什么情绪，我都温柔陪着你。";
    }

    // English
    if (persona === "friendly") {
      return "Hey there! ONY is right here with you. How's your day been treating you? Grab a drink and let's chat—anything wild or stressful happen today?";
    }
    if (persona === "calm") {
      return "Hello, welcome. I'm ONY, your quiet sanctuary to step back and breathe. How is your mind and inner pace feeling in this moment?";
    }
    return "Hello, so gentle to see you here. I'm ONY. Take a slow, comforting breath... how is your heart feeling today? There is no rush at all, I'm right beside you.";
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

  // 10. Food, Dining, Supper, & Comfort Meals
  const isFoodOrMeal =
    /food|eat|hungry|dinner|lunch|breakfast|supper|snack|makan|lapar|sarapan|tengah hari|makan malam|makanan|lauk|吃什么|好饿|晚餐|午餐|宵夜|美食|吃饭/i.test(
      lower,
    );

  if (isFoodOrMeal) {
    if (isBM) {
      if (persona === "friendly") {
        return (
          "Bab makan memang kena jaga! Kalau tengah lapar atau stress, jangan tahan perut.\n\n" +
          "Untuk comfort food Malaysia, apa kata cuba telur dadar panas kicap dengan nasi putih, atau singgah mamak pekena roti canai garing dengan teh tarik kurang manis. Kalau nak yang hangat dan selesa, sup ayam atau sup cendawan pun padu!"
        );
      }
      if (persona === "calm") {
        return (
          "Pemakanan yang hangat mampu menenangkan tubuh dan jiwa kita sejenak.\n\n" +
          "Secawan bubur panas dengan halia, sup sayur segar, atau secawan teh herba suam boleh membantu sistem penghadaman berehat dengan damai. Ambil masa makan secara perlahan tanpa gangguan skrin ya."
        );
      }
      return (
        "Bila fikiran kita letih, hidangan yang hangat dan ringkas memang sangat melegakan hati.\n\n" +
        "Mungkin nasi panas dengan telur kicap yang ringkas, atau sup mi yang berkuah suam boleh kembalikan tenaga awak perlahan-lahan. Jangan lupa minum air kosong secukupnya juga ya."
      );
    }

    if (isZH) {
      if (persona === "friendly") {
        return (
          "肚子饿了千万别硬撑，吃饱了才有力气面对生活呀！\n\n" +
          "想吃舒服一点的话，推荐一碗热腾腾的清汤云吞面、热乎的白粥配煎蛋，或者去附近打包一份香脆的 Roti Canai 配少甜拉茶。你现在比较想吃咸香的还是温热清淡的？"
        );
      }
      if (persona === "calm") {
        return (
          "适时的温热饮食，能够安抚我们紧绷了一天的身心神经。\n\n" +
          "推荐清淡好消化的食物，比如温热的姜汁菜汤、鲜鱼粥，或一杯舒缓的洋甘菊温茶。进餐时试着放下手机，静静感受食物带给身体的温热与滋养。"
        );
      }
      return (
        "辛苦的时候，一份带着热气的美食最能给予我们温柔的抚慰。\n\n" +
        "不要让肚子受委屈，来一碗热气腾腾的面汤，或者简单的煎蛋拌饭都很好。慢慢吃，细细咀嚼，让温暖慢慢流淌到心底。"
      );
    }

    // English
    if (persona === "friendly") {
      return (
        "Never skip meals when you're feeling weighed down—comfort food really works wonders!\n\n" +
        "If you want something easy and comforting: hot rice with a crispy fried egg and sweet soy sauce (Telur Kicap) hits the spot every single time. Or hit up the nearest mamak for fresh Roti Canai or a warm bowl of clear noodle soup. What are you craving right now?"
      );
    }
    if (persona === "calm") {
      return (
        "Nourishing our body with warmth is a quiet act of self-care when the day feels heavy.\n\n" +
        "A warm bowl of ginger chicken soup, wholesome porridge, or lightly steamed greens with jasmine tea can ground your energy. Take your time to savor each bite mindfully away from screens."
      );
    }
    return (
      "When life feels demanding, a warm, simple comfort meal can be deeply soothing for the spirit.\n\n" +
      "Something gentle like warm chicken soup, porridge, or even humble rice with a comforting egg can restore your strength softly. Please make sure you nourish yourself today—you deserve that care."
    );
  }

  // 11. Music, Songs, Soundscapes, Anxiety Audio
  const isMusicOrSound =
    /music|song|songs|tune|playlist|audio|lo-?fi|soundscape|binaural|lagu|muzik|bunyi|dengar lagu|音乐|听歌|播放音乐|白噪音|疗愈音乐/i.test(
      lower,
    );

  if (isMusicOrSound) {
    if (isBM) {
      if (persona === "friendly") {
        return (
          "Muzik memang terapi terbaik bila kepala serabut! Dalam aplikasi ONY ni, ada pemain muzik khas untuk bantu hilangkan cemas dan rasa risau.\n\n" +
          "Awak boleh tekan pemain muzik di penjuru atas untuk dengar alunan hujan lembut, lo-fi chill, atau muzik gamelan akustik yang mendamaikan. Cuba pasang fon telinga dan tutup mata sekejap!"
        );
      }
      if (persona === "calm") {
        return (
          "Getaran bunyi yang perlahan dan selaras mampu menurunkan degupan jantung serta meredakan gelombang otak.\n\n" +
          "Saya cadangkan mendengar frekuensi binaural 432Hz atau alunan air mengalir melalui pemain audio ONY. Selaraskan tarikan nafas awak mengikut irama muzik tersebut."
        );
      }
      return (
        "Alunan muzik yang lembut sentiasa sedia memeluk hati yang sedang risau.\n\n" +
        "Di dalam ONY, awak boleh gunakan ciri pemain audio kami untuk alunan hujan rintik-rintik atau melodi piano tenang. Biarkan iramanya menemani awak tanpa perlu memikirkan apa-apa buat masa ini."
      );
    }

    if (isZH) {
      if (persona === "friendly") {
        return (
          "觉得焦虑或者心烦的时候，听点好听的音乐超级管用！在 ONY 应用里，我们为你准备了专属的舒缓减压音乐功能。\n\n" +
          "你可以点击顶部的音乐播放器，聆听温和的雨声、轻松治愈的 Lo-fi 旋律或者轻柔的大自然白噪音。戴上耳机深呼吸几下，心情会舒服很多哦！"
        );
      }
      if (persona === "calm") {
        return (
          "平缓的音律能够帮助平复起伏的脑电波，让我们重新找回内在的秩序与安宁。\n\n" +
          "推荐通过 ONY 顶部的音频播放器聆听流动水声、颂钵音频或 432Hz 舒缓音乐。闭上双眼，感受音符像水流一样轻轻拂过你的呼吸。"
        );
      }
      return (
        "温柔的音乐是一剂无声的良药。当外界太喧嚣时，不妨戴上耳机听听柔和的旋律。\n\n" +
        "ONY 顶部的音乐播放功能备有专为舒缓压力和焦虑调配的环境音与轻音乐。让轻缓的旋律陪伴你，慢慢卸下心里的包袱。"
      );
    }

    if (persona === "friendly") {
      return (
        "Music is honestly such a lifesaver when the mind won't stop racing! Right here inside ONY, you can tap the ambient music player in the top corner.\n\n" +
        "Pop on your headphones and try the gentle lo-fi chill tracks, soft tropical rainfall, or acoustic ambient tunes. It really helps bring the stress down a notch!"
      );
    }
    if (persona === "calm") {
      return (
        "Gentle harmonic frequencies can slow down an elevated heart rate and guide your nervous system into restorative rest.\n\n" +
        "I invite you to use ONY's built-in sound player to listen to 432Hz soothing tones or gentle natural streams. Let your breath synchronize effortlessly with each passing note."
      );
    }
    return (
      "Soft music has a wonderful way of holding space when words feel like too much.\n\n" +
      "You can activate the ambient music player right here at the top of ONY for calming rain sounds, lo-fi beats, or serene piano pieces. Close your eyes gently and let the soothing sounds wrap around you."
    );
  }

  // 12. Places to Relax, Chill Hangouts, Nature Spots in Malaysia
  const isPlacesOrSpots =
    /place|places|spot|spots|where to go|where should i go|cafe|park|lake|nature|lepak|tempat santai|taman|tempat rehat|kafe|去处|地方|哪里放松|公园|咖啡馆/i.test(
      lower,
    );

  if (isPlacesOrSpots) {
    if (isBM) {
      if (persona === "friendly") {
        return (
          "Kalau nak cari tempat lepak santai yang tak bising sangat di sekitar KL/Selangor:\n\n" +
          "1. Taman Rimba Kiara (TTDI) — redup banyak pokok, sedap jalan kaki hirup udara segar.\n" +
          "2. Kafe buku di Petaling Street — sunyi dan tenang kalau nak minum kopi sambil layan fikiran.\n" +
          "3. Tasik Titiwangsa waktu petang — angin nyaman sambil tengok pemandangan tasik."
        );
      }
      if (persona === "calm") {
        return (
          "Tempat yang dikelilingi kehijauan semula jadi adalah penawar paling tulen untuk meredakan kelesuan minda.\n\n" +
          "Taman Botani Perdana atau laluan hijau Bukit Kiara menyediakan suasana hening di mana awak boleh mendengar desiran daun dan menyusun semula ketenangan batin."
        );
      }
      return (
        "Kadang-kadang keluar sebentar melihat pemandangan hijau dapat memberi ruang bernafas yang lapang untuk dada kita.\n\n" +
        "Kawasan tasik berdekatan rumah, taman bunga yang redup, atau sudut kafe yang tenang dengan pencahayaan lembut boleh jadi tempat rehat yang menyenangkan hari ini."
      );
    }

    if (isZH) {
      if (persona === "friendly") {
        return (
          "想找个安静又舒服的地方透透气？推荐几个吉隆坡和雪兰莪的宝藏放松好去处：\n\n" +
          "1. TTDI Taman Rimba Kiara — 绿树成荫，沿着林间小道散步特别解压。\n" +
          "2. 茨厂街的静谧独立书店咖啡馆 — 点一杯手冲，安安静静坐一个下午。\n" +
          "3. 蒂蒂旺沙湖滨公园 (Titiwangsa Lake) — 傍晚湖面微风吹拂，很适合发呆散心。"
        );
      }
      if (persona === "calm") {
        return (
          "融入大自然的怀抱，是让浮躁思绪沉淀下来最深远的方式。\n\n" +
          "建议造访吉隆坡植物园 (Perdana Botanical Gardens) 或家附近的宁静绿道。漫步其间，感受清风与阳光，给心灵一片无拘无束的天地。"
        );
      }
      return (
        "换一个充满生机的环境，往往能让我们心里的压抑感悄悄化解开来。\n\n" +
        "去一个绿植环绕的小公园散步二十分钟，或者找一家光线柔和的静谧小咖啡馆坐坐，都能为今天注入一份温柔与踏实。"
      );
    }

    if (persona === "friendly") {
      return (
        "Looking for a peaceful spot to decompress around KL / Klang Valley? Here are top cozy suggestions:\n\n" +
        "1. Taman Rimba Kiara (TTDI) — shaded lush green trees, perfect for a slow unhurried walk.\n" +
        "2. A quiet heritage book cafe around Petaling Street — great coffee, zero rush.\n" +
        "3. Titiwangsa Lake Park in the late afternoon — gentle breeze, wide open skyline."
      );
    }
    if (persona === "calm") {
      return (
        "Immersing ourselves in natural greenery is one of the most grounding practices for an overstimulated mind.\n\n" +
        "The Perdana Botanical Gardens or quiet forest canopy walkways offer sacred stillness where you can simply observe the rustle of leaves and breathe."
      );
    }
    return (
      "Stepping outside to a quiet green space can create so much gentle breathing room for your heart.\n\n" +
      "Even a brief stroll through a neighborhood garden, sitting beneath a canopy of trees, or resting in a calm, dimly lit cafe can help restore your inner equilibrium."
    );
  }

  // 13. Dynamic Contextual Reflection for General & Uncategorized Messages
  // Extract key nouns/words to prove active listening and prevent static canned responses
  const cleanTokens = lower
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 3 &&
        !/^(this|that|with|from|have|what|when|where|which|there|their|they|about|would|could|should|your|some|more|just|like|very|want|been|feel|will|then|make|tell|know)$/.test(
          w,
        ),
    );

  const topicSnippet = cleanTokens.slice(0, 3).join(" ");
  const isQuestion = lower.includes("?") || /^(can|how|what|why|is|are|should|would|do|does)\b/i.test(lower);

  // Hash-based selection (0, 1, 2) to ensure variety across messages
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  const variant = Math.abs(hash) % 3;

  if (isBM) {
    const topicRef = topicSnippet ? `mengenai "${topicSnippet}"` : "perkara yang awak kongsikan tadi";
    if (persona === "friendly") {
      if (isQuestion) {
        return variant === 0
          ? `Bila sebut tentang ${topicRef}, memang banyak sudut boleh kita tengok! Kalau dari pandangan santai saya, yang paling utama adalah apa yang bagi awak rasa paling selesa dan tak membebankan diri.`
          : variant === 1
            ? `Soalan yang menarik tentang ${topicRef}! Kadang-kadang tak payah tergesa-gesa buat kata putus sekarang. Apa kata ambil masa sekejap, tengok mana satu pilihan yang buat hati rasa lebih lapang?`
            : `Faham sangat kenapa awak tertanya-tanya pasal ${topicRef}. Jom sembang lagi, apa yang buat awak paling berbelah bahagi tentang hal ni?`;
      }
      return variant === 0
        ? `Saya faham betul apa yang awak maksudkan tentang ${topicRef}. Benda macam ni memang buat kita rasa terbeban kalau simpan sorang-sorang.\n\nSekarang bila dah kongsikan, rasa lega sikit tak? Ceritalah lagi apa-apa yang terlintas dalam fikiran.`
        : variant === 1
          ? `Terima kasih sudi cerita pasal ${topicRef}. Saya sokong awak sepenuhnya! Jangan lupa untuk beri diri sendiri pujian sebab mampu bertahan sejauh ini ya.`
          : `Betul tu, bab ${topicRef} ni bukan perkara remeh. Saya ada kat sini teman awak, ada bahagian mana yang paling awak nak fokus selesaikan dulu?`;
    }

    if (persona === "calm") {
      return variant === 0
        ? `Terima kasih kerana membawa perkara berkaitan ${topicRef} ini ke dalam ruang perbualan kita secara tenang. Setiap rasa dan persoalan yang hadir mempunyai makna yang wajar didengari.\n\nMari kita tarik nafas perlahan-lahan. Apakah yang paling diperlukan oleh batin awak saat ini?`
        : variant === 1
          ? `Saya merenung bersama awak mengenai ${topicRef}. Di sebalik kegelisahan atau kekusutan, izinkan diri awak untuk berhenti sejenak dan mencari titik hening dalam diri.`
          : `Apa yang awak lalui berhubung ${topicRef} adalah sah dan bermakna. Luangkan beberapa saat untuk merasai kedamaian di sini tanpa tekanan masa.`;
    }

    // gentle
    return variant === 0
      ? `Saya mendengar dengan penuh kelembutan apa yang awak sampaikan tentang ${topicRef}. Awak tidak perlu memikul segalanya sendirian, dan tidak perlu tergesa-gesa mencari semua jawapan hari ini.\n\nTarik nafas perlahan ya. Saya sentiasa ada di sini mendengar apa saja yang ingin awak kongsikan.`
      : variant === 1
        ? `Hati saya bersama awak saat memikirkan ${topicRef}. Luangkan masa awak secukupnya; saya sedia menjadi ruang selamat untuk segala perasaan yang sedang awak rasakan.`
        : `Segala luahan awak tentang ${topicRef} disambut di sini dengan penuh kasih dan tanpa sebarang penghakiman. Apa yang paling membuatkan hati awak rasa sayu atau risau mengenainya?`;
  }

  if (isZH) {
    const topicRef = topicSnippet ? `关于“${topicSnippet}”` : "你刚才提到的这些";
    if (persona === "friendly") {
      if (isQuestion) {
        return variant === 0
          ? `聊到${topicRef}，确实有很多角度值得去想想！以我的角度来看，最重要的还是优先照顾你自己的感受，选一个让你心里最轻松踏实的方向。`
          : variant === 1
            ? `问得特别好！关于${topicRef}，很多时候我们不需要立刻把答案定死。先喝口水歇一歇，看看哪一个选择能让你感觉最舒展？`
            : `我完全理解你为什么会琢磨${topicRef}。来跟我多聊聊，这件事里哪一个细节最让你觉得拿不定主意？`;
      }
      return variant === 0
        ? `我完全能体会你说的${topicRef}，这种事情压在心里确实容易让人头大又心烦。\n\n跟我吐槽出来之后，心里有没有畅快一点？还有什么想聊的尽管告诉我！`
        : variant === 1
          ? `谢谢你愿意跟我聊聊${topicRef}。无论遇到什么，我都站在你这边给你加油打气！记得对自己好一点哦。`
          : `真的，经历${topicRef}这种事换作任何人都会觉得不容易。你已经做得很棒了，接下来想先怎么做呢？`;
    }

    if (persona === "calm") {
      return variant === 0
        ? `感谢你如此真诚地带入${topicRef}这一话题。在起伏不定的思绪中，留出一片属于你自己的宁静空间格外重要。\n\n让我们一起静下心来深呼吸几次，此刻你内心最渴望的是怎样的平复？`
        : variant === 1
          ? `静静凝视${topicRef}所带来的心绪波动，允许它们存在，但也允许自己放下紧绷。在这里，你的每一个感受都被平等待之。`
          : `关于${topicRef}，放慢脚步往往能看清更多。给自己的心灵留出一段空白，深吸气，再缓缓吐气。`;
    }

    // gentle
    return variant === 0
      ? `我在这里温柔听着你关于${topicRef}的心声。你不必一个人孤单扛下所有困惑，更不需要在今天就把所有事情都弄得一清二楚。\n\n慢慢呼吸，累了就靠一靠，无论何时我都静静守候在你的身边。`
      : variant === 1
        ? `得知你在面对${topicRef}，我心里很想给你一个温暖的拥抱。不管外界步伐多快，在这里你完全可以按照自己的节奏慢慢梳理。`
        : `你所诉说的关于${topicRef}的一切，都被温柔地接纳着。如果心里还有压抑或委屈，随时跟我说，我一直都在。`;
  }

  // English fallback with active keyword reflection and dynamic variations
  const topicRef = topicSnippet ? `about "${topicSnippet}"` : "what you just shared";
  if (persona === "friendly") {
    if (isQuestion) {
      return variant === 0
        ? `When it comes to ${topicRef}, there are definitely a few angles to consider! Honestly, the best step is whatever protects your peace of mind and doesn't drain your battery further.\n\nWhich option or path is leaning closer to your gut feeling right now?`
        : variant === 1
          ? `That's a really solid question regarding ${topicRef}. You don't have to force an immediate permanent decision right this second though! What if you took a breather first and asked what feels lighter on your shoulders?`
          : `I completely get why you're wondering about ${topicRef}! Let's unpack it together—what's the main thing making you hesitate or think twice?`;
    }
    return variant === 0
      ? `I totally get where you're coming from with ${topicRef}. Dealing with stuff like this can definitely weigh on your mood.\n\nNow that you've put it into words, does it feel a little lighter? I'm right here if you want to keep chatting!`
      : variant === 1
        ? `Thanks for keeping it real with me about ${topicRef}. Honestly, you're handling a lot and doing better than you probably give yourself credit for! Grab a warm drink, you deserve a break.`
        : `Hear hear—navigating ${topicRef} is definitely not a walk in the park. I've got your back! Want to share more about how it started?`;
  }

  if (persona === "calm") {
    return variant === 0
      ? `Thank you for bringing your thoughts on ${topicRef} into this calm sanctuary. Every feeling and reflection you hold has a rightful place here.\n\nLet's take a slow breath together. What would bring the deepest sense of peace to your mind right now?`
      : variant === 1
        ? `Reflecting quietly on ${topicRef}... Often when thoughts feel knotty, stepping back to observe the breath creates the spaciousness we need. You are grounded and safe in this moment.`
        : `Your experiences regarding ${topicRef} are completely valid and worthy of thoughtful space. Take a quiet moment right here to release any tension resting in your shoulders and jaw.`;
  }

  // Gentle (Default)
  return variant === 0
    ? `I hear you so gently as you speak of ${topicRef}. You don't have to carry every piece of this alone, nor rush to solve all the puzzle pieces today.\n\nTake a slow, tender breath. I'm right here holding space for you, and listening with care whenever you'd like to share more.`
    : variant === 1
      ? `My heart goes out to you thinking about ${topicRef}. Whatever feelings are rising up right now, let them be welcomed softly without any judgment.\n\nTake all the time you need—there's no hurry at all in this quiet space.`
      : `Everything you've expressed concerning ${topicRef} is held with warmth and deep gentleness. If there is one part that feels heaviest right now, we can sit with it softly together.`;
}
