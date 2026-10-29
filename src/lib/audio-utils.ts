/**
 * Converts Float32Array audio data to 16-bit PCM (Int16Array).
 */
export function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

/**
 * Converts base64 encoded PCM16 back to Float32Array for AudioContext playback.
 */
export function base64ToFloat32(base64: string): Float32Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const int16Buffer = new Int16Array(bytes.buffer);
  const float32Buffer = new Float32Array(int16Buffer.length);
  for (let i = 0; i < int16Buffer.length; i++) {
    float32Buffer[i] = int16Buffer[i] / 32768.0;
  }
  return float32Buffer;
}

export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private onAudioData: (base64Data: string) => void;

  constructor(onAudioData: (base64Data: string) => void) {
    this.onAudioData = onAudioData;
  }

  async start() {
    try {
      // 1. Request stream FIRST to trigger permission prompt (better for mobile/Safari)
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        if (!this.onAudioData) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = floatTo16BitPCM(inputData);
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
        this.onAudioData(base64);
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (error) {
      console.error("Failed to start AudioRecorder:", error);
      throw error;
    }
  }

  stop() {
    this.source?.disconnect();
    this.processor?.disconnect();
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    this.source = null;
    this.processor = null;
    this.stream = null;
    this.audioContext = null;
  }
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private initialized: boolean = false;

  constructor() {
    // Listen for global user interaction to enable interruption
    if (typeof window !== 'undefined') {
      const handleInput = () => {
        if (this.activeSources.size > 0) {
          console.log("[AudioPlayer] Input detected, interrupting playback.");
          this.interrupt();
        }
      };
      
      window.addEventListener('keydown', handleInput);
      window.addEventListener('mousedown', handleInput);
    }
  }

  private async ensureContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      this.initialized = true;
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  async playChunk(base64Data: string) {
    try {
      const ctx = await this.ensureContext();
      
      const float32Data = base64ToFloat32(base64Data);
      const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      // Track active sources for interruption
      this.activeSources.add(source);
      source.onended = () => {
        this.activeSources.delete(source);
      };

      const currentTime = ctx.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime;
      }

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
    } catch (err) {
      console.error("AudioPlayer play error:", err);
    }
  }

  interrupt() {
    this.activeSources.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Source might not have started or already stopped
      }
    });
    this.activeSources.clear();
    this.nextStartTime = 0;
  }

  async stop() {
    this.interrupt();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }
    this.audioContext = null;
    this.initialized = false;
  }
}
