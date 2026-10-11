// Real voice and audio services using Web Audio API, MediaStream, MediaRecorder, SpeechRecognition, and SpeechSynthesis

// --- 1. Speech Recognition (Chatbot Voice Dictation) ---

export interface SpeechRecognitionResultState {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  error: string | null;
  supported: boolean;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  );
}

export class ChatSpeechRecognizer {
  private recognition: any = null;
  private isListening = false;
  private finalTranscript = "";
  private onUpdateCallback: ((state: { transcript: string; interim: string; isListening: boolean }) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor(lang = "en-US") {
    if (!isSpeechRecognitionSupported()) return;
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = lang;

      this.recognition.onstart = () => {
        this.isListening = true;
      };

      this.recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            this.finalTranscript += (this.finalTranscript ? " " : "") + result[0].transcript.trim();
          } else {
            interim += result[0].transcript;
          }
        }
        if (this.onUpdateCallback) {
          this.onUpdateCallback({
            transcript: this.finalTranscript,
            interim: interim.trim(),
            isListening: this.isListening,
          });
        }
      };

      this.recognition.onerror = (event: any) => {
        const err = event.error || "Speech recognition error";
        if (err !== "no-speech" && this.onErrorCallback) {
          const isNotAllowed = err === "not-allowed" || err === "service-not-allowed";
          this.onErrorCallback(
            isNotAllowed
              ? "Microphone access was not permitted by your browser (browser may suppress permission prompts in iframe previews or blocked settings). You can use simulated voice below or switch to text mode."
              : `Voice error: ${err}`
          );
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onEndCallback) {
          this.onEndCallback();
        }
      };
    } catch (e) {
      console.warn("[VoiceService] SpeechRecognition init failed:", e);
    }
  }

  setLanguage(lang: string) {
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  start(callbacks: {
    initialText?: string;
    onUpdate: (state: { transcript: string; interim: string; isListening: boolean }) => void;
    onError: (error: string) => void;
    onEnd: () => void;
  }): boolean {
    if (!this.recognition) {
      callbacks.onError("Speech recognition is not supported in this browser.");
      return false;
    }

    this.finalTranscript = callbacks.initialText || "";
    this.onUpdateCallback = callbacks.onUpdate;
    this.onErrorCallback = callbacks.onError;
    this.onEndCallback = callbacks.onEnd;

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (e) {
      console.warn("[VoiceService] start error:", e);
      return false;
    }
  }

  stop(): string {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    this.isListening = false;
    return this.finalTranscript;
  }

  abort() {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        // ignore
      }
    }
    this.isListening = false;
    this.finalTranscript = "";
  }
}

// --- 2. Real Microphone Audio Recorder (For Community & Node Chat) ---

export interface RecordedAudioResult {
  blob: Blob;
  dataUrl: string;
  duration: number; // in seconds
}

export class VoiceRecorder {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private startTime = 0;
  private timerInterval: number | null = null;

  private onVolumeChange: ((level: number) => void) | null = null;
  private onTimeUpdate: ((seconds: number) => void) | null = null;

  async start(options?: {
    onVolumeChange?: (level: number) => void;
    onTimeUpdate?: (seconds: number) => void;
    maxDurationSeconds?: number;
    onMaxDurationReached?: () => void;
  }): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone access is not supported by your browser.");
    }

    this.audioChunks = [];
    this.onVolumeChange = options?.onVolumeChange || null;
    this.onTimeUpdate = options?.onTimeUpdate || null;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Set up AudioContext volume analyser for live visualizer
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
          if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
          }
          const source = this.audioContext.createMediaStreamSource(this.mediaStream);
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 64;
          source.connect(this.analyser);

          const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
          const updateVolume = () => {
            if (!this.analyser) return;
            this.analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const normalized = Math.min(1, Math.max(0.05, average / 128));
            if (this.onVolumeChange) {
              this.onVolumeChange(normalized);
            }
            this.animFrameId = requestAnimationFrame(updateVolume);
          };
          updateVolume();
        }
      } catch (e) {
        console.warn("[VoiceRecorder] AudioContext analyser warning:", e);
      }

      // Check supported MIME types
      let mimeType = "";
      if (typeof MediaRecorder !== "undefined") {
        const candidates = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
          "audio/ogg;codecs=opus",
          "audio/ogg",
        ];
        for (const candidate of candidates) {
          if (MediaRecorder.isTypeSupported(candidate)) {
            mimeType = candidate;
            break;
          }
        }
      }

      this.mediaRecorder = mimeType
        ? new MediaRecorder(this.mediaStream, { mimeType })
        : new MediaRecorder(this.mediaStream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.startTime = Date.now();
      this.mediaRecorder.start(200); // 200ms slices

      // Live timer
      const maxSeconds = options?.maxDurationSeconds || 120;
      this.timerInterval = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        if (this.onTimeUpdate) {
          this.onTimeUpdate(elapsed);
        }
        if (elapsed >= maxSeconds) {
          if (options?.onMaxDurationReached) {
            options.onMaxDurationReached();
          }
        }
      }, 500);

      return true;
    } catch (err: any) {
      this.cleanup();
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError" || err.name === "SecurityError") {
        throw new Error(
          "Microphone access could not be granted (browser did not show or allowed permission prompt). You can use 'Use Voice Sample' below or switch to text mode."
        );
      }
      throw new Error(err.message || "Could not start audio recording.");
    }
  }

  async stop(): Promise<RecordedAudioResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        this.cleanup();
        reject(new Error("No active recording."));
        return;
      }

      const duration = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));

      this.mediaRecorder.onstop = async () => {
        try {
          const mimeType = this.mediaRecorder?.mimeType || "audio/webm";
          const blob = new Blob(this.audioChunks, { type: mimeType });

          // Convert blob to Base64 data URL for persistence
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            this.cleanup();
            resolve({ blob, dataUrl, duration });
          };
          reader.onerror = () => {
            const objectUrl = URL.createObjectURL(blob);
            this.cleanup();
            resolve({ blob, dataUrl: objectUrl, duration });
          };
          reader.readAsDataURL(blob);
        } catch (e) {
          this.cleanup();
          reject(e);
        }
      };

      try {
        if (this.mediaRecorder.state !== "inactive") {
          this.mediaRecorder.stop();
        }
      } catch (err) {
        this.cleanup();
        reject(err);
      }
    });
  }

  cancel() {
    this.cleanup();
  }

  private cleanup() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}

// --- 3. Text-to-Speech (ONY Voice Output) ---

export class OnySpeechSynthesizer {
  private static instance: OnySpeechSynthesizer | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speakingId: string | null = null;
  private onStateChange: ((speakingId: string | null) => void) | null = null;

  static getInstance(): OnySpeechSynthesizer {
    if (!this.instance) {
      this.instance = new OnySpeechSynthesizer();
    }
    return this.instance;
  }

  isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  setOnStateChange(cb: (speakingId: string | null) => void) {
    this.onStateChange = cb;
  }

  speak(text: string, id: string, language = "en"): boolean {
    if (!this.isSupported()) return false;
    this.stop();

    const synth = window.speechSynthesis;
    // Clean text: strip markdown stars, code fences, etc.
    const cleanText = text
      .replace(/[*_#`~]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) return false;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.96; // slightly warm and unhurried
    utterance.pitch = 1.02;

    // Pick a natural, calming voice if available
    const voices = synth.getVoices();
    const isMalay = language === "ms";
    const preferredVoice = voices.find((v) => {
      const name = v.name.toLowerCase();
      if (isMalay) {
        return v.lang.startsWith("ms") || v.lang.startsWith("id");
      }
      return (
        v.lang.startsWith("en") &&
        (name.includes("natural") ||
          name.includes("female") ||
          name.includes("samantha") ||
          name.includes("serena") ||
          name.includes("victoria") ||
          name.includes("google uk english female") ||
          name.includes("karen"))
      );
    }) || voices.find((v) => (isMalay ? v.lang.startsWith("ms") : v.lang.startsWith("en"))) || voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    this.speakingId = id;
    this.currentUtterance = utterance;

    utterance.onstart = () => {
      if (this.onStateChange) this.onStateChange(this.speakingId);
    };

    utterance.onend = () => {
      this.speakingId = null;
      this.currentUtterance = null;
      if (this.onStateChange) this.onStateChange(null);
    };

    utterance.onerror = (e) => {
      console.warn("[OnySpeech] Synth error:", e);
      this.speakingId = null;
      this.currentUtterance = null;
      if (this.onStateChange) this.onStateChange(null);
    };

    synth.speak(utterance);
    return true;
  }

  stop() {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
    this.speakingId = null;
    this.currentUtterance = null;
    if (this.onStateChange) this.onStateChange(null);
  }

  getCurrentSpeakingId(): string | null {
    return this.speakingId;
  }
}

// --- 4. Soothing Audio Chime for Sample / Fallback Voice Notes ---

export function playSoothingChime(duration = 4): Promise<void> {
  return new Promise((resolve) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        resolve();
        return;
      }
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Soothing chord notes: C4, E4, G4, B4, D5 (Major 9th soothing chime)
      const frequencies = [261.63, 329.63, 392.0, 493.88, 587.33];
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.35);

        gain.gain.setValueAtTime(0.001, now + idx * 0.35);
        gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.35 + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.35 + 2.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.35);
        osc.stop(now + idx * 0.35 + 2.5);
      });

      window.setTimeout(() => {
        ctx.close().catch(() => {});
        resolve();
      }, duration * 1000);
    } catch {
      resolve();
    }
  });
}

// Utility: format seconds to 00:00
export function formatAudioDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Generates a soothing synthesized WAV audio clip for preview and fallback when mic is unavailable in iframe
export function generateSampleVoiceAudio(durationSeconds = 8): Promise<{ blob: Blob; dataUrl: string; duration: number }> {
  return new Promise((resolve) => {
    try {
      const sampleRate = 22050;
      const totalSamples = sampleRate * durationSeconds;
      const samples = new Float32Array(totalSamples);

      // Layered gentle soothing acoustic tone sequence (C - E - G - B - C)
      const notes = [261.63, 329.63, 392.0, 493.88, 523.25, 392.0];
      const segmentLen = totalSamples / notes.length;

      for (let i = 0; i < totalSamples; i++) {
        const segIdx = Math.floor(i / segmentLen);
        const freq = notes[segIdx % notes.length];
        const segProgress = (i % segmentLen) / segmentLen;
        const envelope = Math.sin(Math.PI * segProgress);
        const t = i / sampleRate;
        const wave = (Math.sin(2 * Math.PI * freq * t) * 0.35 + Math.sin(2 * Math.PI * freq * 2 * t) * 0.08) * envelope;
        samples[i] = wave;
      }

      // WAV Header
      const buffer = new ArrayBuffer(44 + samples.length * 2);
      const view = new DataView(buffer);

      const writeString = (offset: number, str: string) => {
        for (let j = 0; j < str.length; j++) {
          view.setUint8(offset + j, str.charCodeAt(j));
        }
      };

      writeString(0, "RIFF");
      view.setUint32(4, 36 + samples.length * 2, true);
      writeString(8, "WAVE");
      writeString(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // 1 channel
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, "data");
      view.setUint32(40, samples.length * 2, true);

      let offset = 44;
      for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }

      const blob = new Blob([new Uint8Array(buffer)], { type: "audio/wav" });
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({ blob, dataUrl: (reader.result as string) || "", duration: durationSeconds });
      };
      reader.readAsDataURL(blob);
    } catch {
      resolve({ blob: new Blob([]), dataUrl: "", duration: durationSeconds });
    }
  });
}

