/**
 * Web Audio API synthesizer & HTML5 Desktop Notification manager.
 * Provides zero-dependency, ultra-crisp audio chimes and native browser notifications.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

// User preferences in localStorage
const SOUND_KEY = 'hub:audio_chime_enabled';

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(SOUND_KEY) !== 'false';
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_KEY, enabled ? 'true' : 'false');
}

export function toggleSound(): boolean {
  const next = !isSoundEnabled();
  setSoundEnabled(next);
  return next;
}

export type ChimeType = 'chime' | 'warning' | 'completed' | 'pop';

/**
 * Plays a synthesized chime using Web Audio API without any external asset latency.
 */
export function playChime(type: ChimeType = 'chime'): void {
  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'chime') {
      // Crisp, modern affirmative glass chime (E6 -> B6)
      playTone(ctx, 1318.51, now, 0.35, 0.12, 'sine');
      playTone(ctx, 1975.53, now + 0.08, 0.45, 0.15, 'sine');
    } else if (type === 'warning') {
      // Warm, distinct two-stage reminder chime (A5 -> D6)
      playTone(ctx, 880.0, now, 0.25, 0.14, 'triangle');
      playTone(ctx, 1174.66, now + 0.14, 0.35, 0.16, 'sine');
    } else if (type === 'completed') {
      // Smooth descending resolution chime (C6 -> G5 -> E5)
      playTone(ctx, 1046.5, now, 0.22, 0.12, 'sine');
      playTone(ctx, 783.99, now + 0.11, 0.25, 0.12, 'sine');
      playTone(ctx, 659.25, now + 0.22, 0.4, 0.14, 'sine');
    } else if (type === 'pop') {
      // Subtle tactile click/pop
      playTone(ctx, 600, now, 0.08, 0.08, 'sine');
    }
  } catch (err) {
    console.debug('[Sound] Audio playback suppressed:', err);
  }
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  gainLevel = 0.15,
  waveType: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = waveType;
  osc.frequency.setValueAtTime(freq, startTime);

  // Soft attack and smooth exponential decay
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainLevel, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/**
 * Checks current Desktop Notification permission.
 */
export function getDesktopNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Requests desktop notification permission from the user.
 */
export async function requestDesktopNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (e) {
    console.error('[Notification] Permission request failed:', e);
    return false;
  }
}

/**
 * Fires a native OS desktop notification.
 */
export function showDesktopNotification(title: string, body: string, tag?: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notif = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: tag || title,
      silent: true, // We already manage our own harmonious Web Audio chime
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  } catch (e) {
    console.debug('[Notification] Failed to show desktop notification:', e);
  }
}

/**
 * Unified alert handler: plays chime and triggers desktop push notification.
 */
export function handleIncomingAlert(title: string, body: string): void {
  let chimeType: ChimeType = 'chime';
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes('ending soon') || lowerTitle.includes('warning') || lowerTitle.includes('expir')) {
    chimeType = 'warning';
  } else if (lowerTitle.includes('concluded') || lowerTitle.includes('completed') || lowerTitle.includes('ended')) {
    chimeType = 'completed';
  }

  playChime(chimeType);
  showDesktopNotification(title, body, lowerTitle);
}
