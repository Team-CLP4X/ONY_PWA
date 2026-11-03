// Ambient Music & Soundscape Engine for Anxiety, Stress Relief, and Sleep
// Powered by Web Audio API - 100% client-side, zero CORS dependencies, offline-capable

export interface CalmingTrack {
  id: string;
  title: string;
  titleBm: string;
  titleZh: string;
  subtitle: string;
  subtitleBm: string;
  subtitleZh: string;
  category: "anxiety" | "stress" | "breathing" | "sleep" | "focus";
  badge: string;
  badgeBm: string;
  badgeZh: string;
  icon: string;
  color: string;
  tone: string;
}

export const CALMING_TRACKS: CalmingTrack[] = [
  {
    id: "serenity_432",
    title: "432Hz Serenity Drone",
    titleBm: "Dron Tenang 432Hz",
    titleZh: "432Hz 颂钵疗愈共鸣",
    subtitle: "Calms rapid heartbeat & down-regulates nervous system",
    subtitleBm: "Menenangkan degupan jantung & meredakan sistem saraf",
    subtitleZh: "平复心悸紧绷 · 舒缓交感神经过载",
    category: "anxiety",
    badge: "Anxiety Relief",
    badgeBm: "Redakan Gelisah",
    badgeZh: "缓解焦虑",
    icon: "shield",
    color: "#e96f73",
    tone: "peach",
  },
  {
    id: "rain_leaves",
    title: "Rain on Temple Leaves",
    titleBm: "Hujan di Daun Rimba",
    titleZh: "热带雨林静心微雨",
    subtitle: "Washes away mental fatigue, burnout & overthinking",
    subtitleBm: "Membersihkan keletihan minda & beban fikiran",
    subtitleZh: "洗涤大脑疲惫 · 停下思绪内耗",
    category: "stress",
    badge: "Stress Decompression",
    badgeBm: "Redakan Tekanan",
    badgeZh: "深度减压",
    icon: "cloud",
    color: "#6b8e67",
    tone: "forest",
  },
  {
    id: "ocean_breath",
    title: "Ocean Tide Breathing (10s)",
    titleBm: "Ombak Pernafasan (10s)",
    titleZh: "潮汐腹式深呼吸 (10秒)",
    subtitle: "10-second wave rhythm matching parasympathetic 5s in / 5s out",
    subtitleBm: "Rentak ombak 10 saat sepadan pernafasan tenang 5s tarik / 5s hembus",
    subtitleZh: "10秒潮涨潮落 · 同步5秒吸气5秒呼气",
    category: "breathing",
    badge: "Parasympathetic Sync",
    badgeBm: "Irama Pernafasan",
    badgeZh: "正念节律",
    icon: "wind",
    color: "#4e9fac",
    tone: "ocean",
  },
  {
    id: "singing_bowls",
    title: "Tibetan Singing Bowls",
    titleBm: "Mangkuk Tibet & Loceng Buluh",
    titleZh: "藏式颂钵与古道清钟",
    subtitle: "Grounding harmonic reverberations for panic relief & centering",
    subtitleBm: "Gema harmonik untuk redakan panik & kembalikan fokus kendiri",
    subtitleZh: "沉浸式谐波回响 · 抚平惊恐心慌",
    category: "anxiety",
    badge: "Panic Grounding",
    badgeBm: "Redakan Panik",
    badgeZh: "平复惊恐",
    icon: "sparkles",
    color: "#9175ad",
    tone: "lavender",
  },
  {
    id: "lofi_piano",
    title: "Midnight Cozy Piano",
    titleBm: "Piano Lembut Tengah Malam",
    titleZh: "午夜温润暖心钢琴",
    subtitle: "Warm acoustic chords & gentle vinyl for restful sleep & gentle focus",
    subtitleBm: "Kord akustik lembut & vinil hangat untuk tidur lena & fokus",
    subtitleZh: "治愈系爵士和弦 · 助眠伴读与舒心安歇",
    category: "sleep",
    badge: "Sleep & Study",
    badgeBm: "Tidur & Rehat",
    badgeZh: "助眠伴读",
    icon: "coffee",
    color: "#d48259",
    tone: "sunset",
  },
];

class AmbientMusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private currentTrackId = "serenity_432";
  private activeNodes: { stop?: () => void; disconnect?: () => void }[] = [];
  private volume = 0.55;
  private scheduledInterval: number | null = null;
  private onStateChangeListeners: Set<(state: { isPlaying: boolean; trackId: string; volume: number }) => void> = new Set();

  private getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public subscribe(listener: (state: { isPlaying: boolean; trackId: string; volume: number }) => void): () => void {
    this.onStateChangeListeners.add(listener);
    listener({ isPlaying: this.isPlaying, trackId: this.currentTrackId, volume: this.volume });
    return () => {
      this.onStateChangeListeners.delete(listener);
    };
  }

  private notify() {
    const state = { isPlaying: this.isPlaying, trackId: this.currentTrackId, volume: this.volume };
    this.onStateChangeListeners.forEach((fn) => {
      try {
        fn(state);
      } catch (e) {
        console.warn("[AmbientMusic] Listener error:", e);
      }
    });
  }

  public setVolume(volPercent: number) {
    const clamped = Math.max(0, Math.min(100, volPercent)) / 100;
    this.volume = clamped;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
    }
    this.notify();
  }

  public getVolumePercent(): number {
    return Math.round(this.volume * 100);
  }

  public getCurrentTrack(): CalmingTrack {
    return CALMING_TRACKS.find((t) => t.id === this.currentTrackId) || CALMING_TRACKS[0];
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public async play(trackId?: string): Promise<void> {
    const targetTrack = trackId || this.currentTrackId;
    this.currentTrackId = targetTrack;

    try {
      const ctx = this.getAudioContext();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      this.stopCurrentSynthesis();
      this.isPlaying = true;
      this.startTrackSynthesis(targetTrack);
      this.notify();
    } catch (err) {
      console.warn("[AmbientMusic] Play error:", err);
    }
  }

  public pause(): void {
    this.stopCurrentSynthesis();
    this.isPlaying = false;
    this.notify();
  }

  public toggle(trackId?: string): void {
    if (this.isPlaying) {
      if (trackId && trackId !== this.currentTrackId) {
        void this.play(trackId);
      } else {
        this.pause();
      }
    } else {
      void this.play(trackId || this.currentTrackId);
    }
  }

  public nextTrack(): void {
    const idx = CALMING_TRACKS.findIndex((t) => t.id === this.currentTrackId);
    const nextIdx = (idx + 1) % CALMING_TRACKS.length;
    void this.play(CALMING_TRACKS[nextIdx].id);
  }

  public prevTrack(): void {
    const idx = CALMING_TRACKS.findIndex((t) => t.id === this.currentTrackId);
    const prevIdx = (idx - 1 + CALMING_TRACKS.length) % CALMING_TRACKS.length;
    void this.play(CALMING_TRACKS[prevIdx].id);
  }

  private stopCurrentSynthesis(): void {
    if (this.scheduledInterval !== null) {
      window.clearInterval(this.scheduledInterval);
      this.scheduledInterval = null;
    }

    this.activeNodes.forEach((node) => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch {
        // ignore already stopped nodes
      }
    });
    this.activeNodes = [];
  }

  // --- Soundscape Synthesis Routines ---

  private startTrackSynthesis(trackId: string): void {
    switch (trackId) {
      case "serenity_432":
        this.synthesize432HzDrone();
        break;
      case "rain_leaves":
        this.synthesizeRainAndThunder();
        break;
      case "ocean_breath":
        this.synthesizeOceanBreath();
        break;
      case "singing_bowls":
        this.synthesizeTibetanBowls();
        break;
      case "lofi_piano":
        this.synthesizeLofiPianoChords();
        break;
      default:
        this.synthesize432HzDrone();
        break;
    }
  }

  // Track 1: 432Hz Deep Calming Drone (Anxiety & Panic Relief)
  private synthesize432HzDrone(): void {
    const ctx = this.getAudioContext();
    if (!this.masterGain) return;

    const baseFreq = 108; // 432 / 4 = 108Hz (deep grounding octave)
    const harmonics = [108, 216, 432, 648];

    const trackGain = ctx.createGain();
    trackGain.gain.setValueAtTime(0.001, ctx.currentTime);
    trackGain.gain.linearRampToValueAtTime(0.24, ctx.currentTime + 1.8);
    trackGain.connect(this.masterGain);

    // Warm Low-pass Filter for lush velvet warmth
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(550, ctx.currentTime);
    filter.connect(trackGain);

    // Subtle Filter LFO for breathing drone movement
    const filterLfo = ctx.createOscillator();
    const filterLfoGain = ctx.createGain();
    filterLfo.frequency.setValueAtTime(0.08, ctx.currentTime); // 12.5s gentle breath cycle
    filterLfoGain.gain.setValueAtTime(140, ctx.currentTime);
    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(filter.frequency);
    filterLfo.start();
    this.activeNodes.push(filterLfo, filterLfoGain);

    // Detuned Sine/Triangle Drones
    harmonics.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = idx === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Subtle detune for rich warmth
      const detuneCents = (idx % 2 === 0 ? 1 : -1) * (2 + idx * 1.5);
      osc.detune.setValueAtTime(detuneCents, ctx.currentTime);

      const amp = idx === 0 ? 0.35 : idx === 1 ? 0.25 : 0.15;
      oscGain.gain.setValueAtTime(amp, ctx.currentTime);

      osc.connect(oscGain);
      oscGain.connect(filter);
      osc.start();
      this.activeNodes.push(osc, oscGain);
    });

    // Soft pink noise bed (gentle waterfall wash)
    const noiseNode = this.createPinkNoiseNode(ctx);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(320, ctx.currentTime);
    noiseFilter.Q.setValueAtTime(0.8, ctx.currentTime);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.035, ctx.currentTime);

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(trackGain);
    this.activeNodes.push(noiseNode, noiseFilter, noiseGain, trackGain);
  }

  // Track 2: Rain on Temple Leaves (Stress Decompression)
  private synthesizeRainAndThunder(): void {
    const ctx = this.getAudioContext();
    if (!this.masterGain) return;

    const trackGain = ctx.createGain();
    trackGain.gain.setValueAtTime(0.001, ctx.currentTime);
    trackGain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 1.5);
    trackGain.connect(this.masterGain);

    // Continuous rain noise layers (soft high rustle + body)
    const rainNoise = this.createPinkNoiseNode(ctx);

    const rainFilter1 = ctx.createBiquadFilter();
    rainFilter1.type = "bandpass";
    rainFilter1.frequency.setValueAtTime(1200, ctx.currentTime);
    rainFilter1.Q.setValueAtTime(0.6, ctx.currentTime);

    const rainGain1 = ctx.createGain();
    rainGain1.gain.setValueAtTime(0.12, ctx.currentTime);
    rainNoise.connect(rainFilter1);
    rainFilter1.connect(rainGain1);
    rainGain1.connect(trackGain);

    // Secondary low-frequency stream wash
    const rainFilter2 = ctx.createBiquadFilter();
    rainFilter2.type = "lowpass";
    rainFilter2.frequency.setValueAtTime(600, ctx.currentTime);

    const rainGain2 = ctx.createGain();
    rainGain2.gain.setValueAtTime(0.08, ctx.currentTime);
    rainNoise.connect(rainFilter2);
    rainFilter2.connect(rainGain2);
    rainGain2.connect(trackGain);

    this.activeNodes.push(rainNoise, rainFilter1, rainGain1, rainFilter2, rainGain2, trackGain);

    // Randomized organic droplet pings
    const dropletNotes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // Pentatonic drops
    const triggerDrop = () => {
      if (!this.isPlaying) return;
      try {
        const dropOsc = ctx.createOscillator();
        const dropGain = ctx.createGain();
        const now = ctx.currentTime;
        const freq = dropletNotes[Math.floor(Math.random() * dropletNotes.length)];

        dropOsc.type = "sine";
        dropOsc.frequency.setValueAtTime(freq, now);
        dropOsc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.18);

        dropGain.gain.setValueAtTime(0.001, now);
        dropGain.gain.linearRampToValueAtTime(0.025 + Math.random() * 0.02, now + 0.02);
        dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

        dropOsc.connect(dropGain);
        dropGain.connect(trackGain);

        dropOsc.start(now);
        dropOsc.stop(now + 0.25);
      } catch {
        // ignore
      }
    };

    // Distant calming low rumble every 12 seconds
    const triggerDistantRumble = () => {
      if (!this.isPlaying) return;
      try {
        const rumbleOsc = ctx.createOscillator();
        const rumbleFilter = ctx.createBiquadFilter();
        const rumbleGain = ctx.createGain();
        const now = ctx.currentTime;

        rumbleOsc.type = "triangle";
        rumbleOsc.frequency.setValueAtTime(52, now);
        rumbleOsc.frequency.exponentialRampToValueAtTime(40, now + 4.5);

        rumbleFilter.type = "lowpass";
        rumbleFilter.frequency.setValueAtTime(95, now);

        rumbleGain.gain.setValueAtTime(0.001, now);
        rumbleGain.gain.linearRampToValueAtTime(0.06, now + 1.2);
        rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 5.0);

        rumbleOsc.connect(rumbleFilter);
        rumbleFilter.connect(rumbleGain);
        rumbleGain.connect(trackGain);

        rumbleOsc.start(now);
        rumbleOsc.stop(now + 5.2);
      } catch {
        // ignore
      }
    };

    this.scheduledInterval = window.setInterval(() => {
      if (Math.random() > 0.35) triggerDrop();
      if (Math.random() > 0.88) triggerDistantRumble();
    }, 450);
  }

  // Track 3: Ocean Tide Breathing (Parasympathetic 10s Cycle)
  private synthesizeOceanBreath(): void {
    const ctx = this.getAudioContext();
    if (!this.masterGain) return;

    const trackGain = ctx.createGain();
    trackGain.gain.setValueAtTime(0.001, ctx.currentTime);
    trackGain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 1.8);
    trackGain.connect(this.masterGain);

    // Oceanic surf noise generator
    const surfNoise = this.createPinkNoiseNode(ctx);

    const surfFilter = ctx.createBiquadFilter();
    surfFilter.type = "bandpass";
    surfFilter.frequency.setValueAtTime(380, ctx.currentTime);
    surfFilter.Q.setValueAtTime(1.1, ctx.currentTime);

    // 10s Inhale/Exhale LFO (0.1 Hz)
    const swellLfo = ctx.createOscillator();
    const swellGain = ctx.createGain();
    swellLfo.frequency.setValueAtTime(0.1, ctx.currentTime); // exactly 10s per full breath wave
    swellGain.gain.setValueAtTime(260, ctx.currentTime);

    swellLfo.connect(swellGain);
    swellGain.connect(surfFilter.frequency);
    swellLfo.start();

    // Volume modulation for natural crest and withdraw
    const volumeLfo = ctx.createOscillator();
    const volumeLfoGain = ctx.createGain();
    volumeLfo.frequency.setValueAtTime(0.1, ctx.currentTime);
    volumeLfoGain.gain.setValueAtTime(0.11, ctx.currentTime);

    const surfGain = ctx.createGain();
    surfGain.gain.setValueAtTime(0.14, ctx.currentTime);

    volumeLfo.connect(volumeLfoGain);
    volumeLfoGain.connect(surfGain.gain);
    volumeLfo.start();

    surfNoise.connect(surfFilter);
    surfFilter.connect(surfGain);
    surfGain.connect(trackGain);

    this.activeNodes.push(surfNoise, surfFilter, surfGain, swellLfo, swellGain, volumeLfo, volumeLfoGain, trackGain);

    // Soft warm pentatonic acoustic tone at the crest of waves
    const crestChords = [
      [329.63, 392.0, 493.88], // E4, G4, B4
      [261.63, 329.63, 392.0], // C4, E4, G4
      [392.0, 493.88, 587.33], // G4, B4, D5
    ];
    let chordIdx = 0;

    const playCrestTone = () => {
      if (!this.isPlaying) return;
      try {
        const chord = crestChords[chordIdx % crestChords.length];
        chordIdx++;
        chord.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const now = ctx.currentTime;

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + i * 0.12);

          gain.gain.setValueAtTime(0.001, now + i * 0.12);
          gain.gain.linearRampToValueAtTime(0.035, now + i * 0.12 + 1.2);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 4.8);

          osc.connect(gain);
          gain.connect(trackGain);

          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 5.0);
        });
      } catch {
        // ignore
      }
    };

    playCrestTone();
    this.scheduledInterval = window.setInterval(() => {
      playCrestTone();
    }, 10000); // synchronizes with 10s wave
  }

  // Track 4: Tibetan Singing Bowls & Bamboo Chimes (Panic & Heart Grounding)
  private synthesizeTibetanBowls(): void {
    const ctx = this.getAudioContext();
    if (!this.masterGain) return;

    const trackGain = ctx.createGain();
    trackGain.gain.setValueAtTime(0.001, ctx.currentTime);
    trackGain.gain.linearRampToValueAtTime(0.26, ctx.currentTime + 1.6);
    trackGain.connect(this.masterGain);

    // Base background calm drone
    const droneOsc = ctx.createOscillator();
    const droneGain = ctx.createGain();
    droneOsc.type = "sine";
    droneOsc.frequency.setValueAtTime(108, ctx.currentTime); // Om base
    droneGain.gain.setValueAtTime(0.05, ctx.currentTime);
    droneOsc.connect(droneGain);
    droneGain.connect(trackGain);
    droneOsc.start();
    this.activeNodes.push(droneOsc, droneGain, trackGain);

    // Singing Bowl Harmonics (Fundamental, 2.7x, 5.2x partials)
    const bowlFrequencies = [216, 288, 432, 576]; // Solfeggio resonant series
    let bowlIdx = 0;

    const strikeBowl = () => {
      if (!this.isPlaying) return;
      try {
        const base = bowlFrequencies[bowlIdx % bowlFrequencies.length];
        bowlIdx++;
        const partials = [
          { mult: 1.0, gain: 0.12, decay: 7.5 },
          { mult: 2.76, gain: 0.05, decay: 5.5 },
          { mult: 5.18, gain: 0.025, decay: 4.0 },
        ];

        const now = ctx.currentTime;
        partials.forEach((p) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(base * p.mult, now);

          // Natural singing bowl subtle shimmer
          const vibrato = ctx.createOscillator();
          const vibratoGain = ctx.createGain();
          vibrato.frequency.setValueAtTime(4.2, now);
          vibratoGain.gain.setValueAtTime(1.8, now);
          vibrato.connect(vibratoGain);
          vibratoGain.connect(osc.frequency);
          vibrato.start(now);
          vibrato.stop(now + p.decay);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(p.gain, now + 0.06);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

          osc.connect(gain);
          gain.connect(trackGain);

          osc.start(now);
          osc.stop(now + p.decay + 0.2);
        });
      } catch {
        // ignore
      }
    };

    strikeBowl();
    this.scheduledInterval = window.setInterval(() => {
      strikeBowl();
    }, 6500);
  }

  // Track 5: Midnight Cozy Piano (Sleep, Study & Deep Calm)
  private synthesizeLofiPianoChords(): void {
    const ctx = this.getAudioContext();
    if (!this.masterGain) return;

    const trackGain = ctx.createGain();
    trackGain.gain.setValueAtTime(0.001, ctx.currentTime);
    trackGain.gain.linearRampToValueAtTime(0.26, ctx.currentTime + 1.8);
    trackGain.connect(this.masterGain);

    // Warm Vinyl Crackle & Dust
    const vinylNoise = this.createPinkNoiseNode(ctx);
    const vinylFilter = ctx.createBiquadFilter();
    vinylFilter.type = "bandpass";
    vinylFilter.frequency.setValueAtTime(2200, ctx.currentTime);
    vinylFilter.Q.setValueAtTime(1.5, ctx.currentTime);

    const vinylGain = ctx.createGain();
    vinylGain.gain.setValueAtTime(0.012, ctx.currentTime);

    vinylNoise.connect(vinylFilter);
    vinylFilter.connect(vinylGain);
    vinylGain.connect(trackGain);
    this.activeNodes.push(vinylNoise, vinylFilter, vinylGain, trackGain);

    // Lush Jazz/Lo-Fi Chords: Fmaj9 -> Am9 -> Dm9 -> Bbmaj7
    const chordProgression: number[][] = [
      [174.61, 261.63, 329.63, 392.0, 440.0], // Fmaj9
      [110.0, 220.0, 261.63, 329.63, 493.88], // Am9
      [146.83, 220.0, 261.63, 349.23, 440.0], // Dm9
      [116.54, 233.08, 293.66, 349.23, 440.0], // Bbmaj7
    ];
    let step = 0;

    const playPianoChord = () => {
      if (!this.isPlaying) return;
      try {
        const chord = chordProgression[step % chordProgression.length];
        step++;
        const now = ctx.currentTime;

        chord.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();

          osc.type = i === 0 ? "triangle" : "sine";
          osc.frequency.setValueAtTime(freq, now + i * 0.04);

          // Lo-Fi warm low-pass filter
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(850, now);

          gain.gain.setValueAtTime(0.001, now + i * 0.04);
          gain.gain.linearRampToValueAtTime(0.05 - i * 0.006, now + i * 0.04 + 0.12);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.04 + 5.2);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(trackGain);

          osc.start(now + i * 0.04);
          osc.stop(now + i * 0.04 + 5.5);
        });
      } catch {
        // ignore
      }
    };

    playPianoChord();
    this.scheduledInterval = window.setInterval(() => {
      playPianoChord();
    }, 4500);
  }

  // Pink Noise Generator (Paul Kellet's filtered white noise algorithm)
  private createPinkNoiseNode(ctx: AudioContext): AudioNode {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;
    whiteNoise.start();
    return whiteNoise;
  }
}

export const ambientMusicEngine = new AmbientMusicEngine();
