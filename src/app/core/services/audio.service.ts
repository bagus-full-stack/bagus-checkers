import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface SoundEffect {
  id: string;
  name: string;
  src: string;
  volume: number;
}

export const SOUND_EFFECTS: Record<string, SoundEffect> = {
  move: { id: 'move', name: 'Déplacement', src: '/assets/sounds/move.mp3', volume: 0.5 },
  capture: { id: 'capture', name: 'Capture', src: '/assets/sounds/capture.mp3', volume: 0.6 },
  promotion: { id: 'promotion', name: 'Promotion', src: '/assets/sounds/promotion.mp3', volume: 0.7 },
  check: { id: 'check', name: 'Échec', src: '/assets/sounds/check.mp3', volume: 0.6 },
  gameStart: { id: 'gameStart', name: 'Début de partie', src: '/assets/sounds/game-start.mp3', volume: 0.5 },
  gameEnd: { id: 'gameEnd', name: 'Fin de partie', src: '/assets/sounds/game-end.mp3', volume: 0.6 },
  click: { id: 'click', name: 'Clic', src: '/assets/sounds/click.mp3', volume: 0.3 },
  error: { id: 'error', name: 'Erreur', src: '/assets/sounds/error.mp3', volume: 0.4 },
  notification: { id: 'notification', name: 'Notification', src: '/assets/sounds/notification.mp3', volume: 0.5 },
  tick: { id: 'tick', name: 'Tic-tac', src: '/assets/sounds/tick.mp3', volume: 0.2 },
  lowTime: { id: 'lowTime', name: 'Temps faible', src: '/assets/sounds/low-time.mp3', volume: 0.6 },
  chat: { id: 'chat', name: 'Message chat', src: '/assets/sounds/chat.mp3', volume: 0.4 },
};

const AUDIO_SETTINGS_KEY = 'checkers_audio_settings';

interface AudioSettings {
  masterVolume: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  musicVolume: number;
}

const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 0.7,
  soundEnabled: true,
  musicEnabled: false,
  musicVolume: 0.3,
};

/**
 * Service for managing audio and sound effects
 */
@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private audioCache = new Map<string, HTMLAudioElement>();
  private backgroundMusic: HTMLAudioElement | null = null;

  private readonly _settings = signal<AudioSettings>(this.loadSettings());

  /** Current audio settings */
  readonly settings = this._settings.asReadonly();

  /** Master volume (0-1) */
  readonly masterVolume = computed(() => this._settings().masterVolume);

  /** Is sound enabled */
  readonly soundEnabled = computed(() => this._settings().soundEnabled);

  /** Is music enabled */
  readonly musicEnabled = computed(() => this._settings().musicEnabled);

  /** Music volume (0-1) */
  readonly musicVolume = computed(() => this._settings().musicVolume);

  constructor() {
    if (this.isBrowser) {
      this.preloadSounds();
    }
  }

  /**
   * Preloads all sound effects
   */
  private preloadSounds(): void {
    Object.values(SOUND_EFFECTS).forEach(sound => {
      this.loadSound(sound.id, sound.src);
    });
  }

  /**
   * Loads a sound into cache
   */
  private loadSound(id: string, src: string): HTMLAudioElement | null {
    if (!this.isBrowser) return null;

    try {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = src;
      this.audioCache.set(id, audio);
      return audio;
    } catch (error) {
      console.warn(`Failed to load sound: ${id}`, error);
      return null;
    }
  }

  /**
   * Plays a sound effect
   */
  play(soundId: keyof typeof SOUND_EFFECTS): void {
    if (!this.isBrowser || !this.soundEnabled()) return;

    const sound = SOUND_EFFECTS[soundId];
    if (!sound) return;

    let audio = this.audioCache.get(soundId);
    if (!audio) {
      audio = this.loadSound(soundId, sound.src) ?? undefined;
    }

    if (audio) {
      // Clone for overlapping sounds
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = sound.volume * this.masterVolume();
      clone.play().catch(() => {
        // Ignore autoplay restrictions
      });
    }
  }

  /**
   * Plays move sound
   */
  playMove(): void {
    this.play('move');
  }

  /**
   * Plays capture sound
   */
  playCapture(): void {
    this.play('capture');
  }

  /**
   * Plays promotion sound
   */
  playPromotion(): void {
    this.play('promotion');
  }

  /**
   * Plays game start sound
   */
  playGameStart(): void {
    this.play('gameStart');
  }

  /**
   * Plays game end sound
   */
  playGameEnd(): void {
    this.play('gameEnd');
  }

  /**
   * Plays click sound
   */
  playClick(): void {
    this.play('click');
  }

  /**
   * Plays error sound
   */
  playError(): void {
    this.play('error');
  }

  /**
   * Plays notification sound
   */
  playNotification(): void {
    this.play('notification');
  }

  /**
   * Plays low time warning
   */
  playLowTime(): void {
    this.play('lowTime');
  }

  /**
   * Plays chat message sound
   */
  playChat(): void {
    this.play('chat');
  }

  /**
   * Starts background music
   */
  startMusic(src: string = '/assets/sounds/background-music.mp3'): void {
    if (!this.isBrowser || !this.musicEnabled()) return;

    this.stopMusic();

    try {
      this.backgroundMusic = new Audio(src);
      this.backgroundMusic.loop = true;
      this.backgroundMusic.volume = this.musicVolume() * this.masterVolume();
      this.backgroundMusic.play().catch(() => {
        // Ignore autoplay restrictions
      });
    } catch (error) {
      console.warn('Failed to start background music', error);
    }
  }

  /**
   * Stops background music
   */
  stopMusic(): void {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
      this.backgroundMusic = null;
    }
  }

  /**
   * Pauses background music
   */
  pauseMusic(): void {
    this.backgroundMusic?.pause();
  }

  /**
   * Resumes background music
   */
  resumeMusic(): void {
    if (this.musicEnabled() && this.backgroundMusic) {
      this.backgroundMusic.play().catch(() => {});
    }
  }

  /**
   * Sets master volume
   */
  setMasterVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this._settings.update(s => ({ ...s, masterVolume: clamped }));
    this.saveSettings();

    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.musicVolume() * clamped;
    }
  }

  /**
   * Toggles sound effects
   */
  toggleSound(): void {
    this._settings.update(s => ({ ...s, soundEnabled: !s.soundEnabled }));
    this.saveSettings();
  }

  /**
   * Toggles background music
   */
  toggleMusic(): void {
    const newEnabled = !this.musicEnabled();
    this._settings.update(s => ({ ...s, musicEnabled: newEnabled }));
    this.saveSettings();

    if (newEnabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  /**
   * Sets music volume
   */
  setMusicVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this._settings.update(s => ({ ...s, musicVolume: clamped }));
    this.saveSettings();

    if (this.backgroundMusic) {
      this.backgroundMusic.volume = clamped * this.masterVolume();
    }
  }

  private loadSettings(): AudioSettings {
    if (!this.isBrowser) return DEFAULT_SETTINGS;

    try {
      const stored = localStorage.getItem(AUDIO_SETTINGS_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      console.warn('Failed to load audio settings');
    }
    return DEFAULT_SETTINGS;
  }

  private saveSettings(): void {
    if (!this.isBrowser) return;

    try {
      localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(this._settings()));
    } catch {
      console.warn('Failed to save audio settings');
    }
  }
}

