// Sound notification system for booking events

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('soundEnabled', String(enabled));
  }

  isEnabled(): boolean {
    const stored = localStorage.getItem('soundEnabled');
    if (stored !== null) {
      this.enabled = stored === 'true';
    }
    return this.enabled;
  }

  // Satisfying "cha-ching" sound for new bookings
  async playBookingSound() {
    if (!this.isEnabled()) return;

    try {
      const ctx = this.getAudioContext();
      
      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const now = ctx.currentTime;

      // Create a pleasant, satisfying "success" sound
      // First tone - higher pitch
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.setValueAtTime(880, now); // A5
      osc1.frequency.setValueAtTime(1108.73, now + 0.1); // C#6
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gain1.gain.linearRampToValueAtTime(0, now + 0.3);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Second tone - creates a "cha-ching" effect
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.setValueAtTime(1318.51, now + 0.15); // E6
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0, now + 0.15);
      gain2.gain.linearRampToValueAtTime(0.4, now + 0.2);
      gain2.gain.linearRampToValueAtTime(0, now + 0.5);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.5);

      // Add a subtle shimmer effect
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.frequency.setValueAtTime(2637.02, now + 0.2); // E7
      osc3.type = 'sine';
      gain3.gain.setValueAtTime(0, now + 0.2);
      gain3.gain.linearRampToValueAtTime(0.15, now + 0.25);
      gain3.gain.linearRampToValueAtTime(0, now + 0.6);
      osc3.start(now + 0.2);
      osc3.stop(now + 0.6);

    } catch (error) {
      console.error('Error playing booking sound:', error);
    }
  }

  // Gentle notification sound for messages
  async playMessageSound() {
    if (!this.isEnabled()) return;

    try {
      const ctx = this.getAudioContext();
      
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(783.99, now + 0.1); // G5
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);

    } catch (error) {
      console.error('Error playing message sound:', error);
    }
  }

  // Confirmation sound
  async playConfirmSound() {
    if (!this.isEnabled()) return;

    try {
      const ctx = this.getAudioContext();
      
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.25);
      gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);

    } catch (error) {
      console.error('Error playing confirm sound:', error);
    }
  }
}

export const soundManager = new SoundManager();
