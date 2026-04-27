import { createContext, useContext } from 'react';
import { StatusPayload } from '../../../shared/types/intents';

export interface PlayerContextProps {
  // WebSocket State
  state: 'IDLE' | 'LOADED' | 'PLAYING' | 'PAUSED';
  manifest: { songs: string[]; shows: Record<string, string[]> };
  lastAck: any;
  status: StatusPayload | null;
  sendIntent: (intent: any) => void;
  readyState: number;
  isSocketOpen: boolean;

  // Player Selection State
  selectedSong: string;
  setSelectedSong: (song: string) => void;
  selectedShow: string;
  setSelectedShow: (show: string) => void;

  // Time and Metrics State
  currentTime: number;
  setCurrentTime: (time: number) => void;
  duration: number;
  setDuration: (duration: number) => void;
  startupOffsetMs: number | null;
  setStartupOffsetMs: (offset: number | null) => void;
  liveDriftMs: number | null;

  // Action Handlers
  handleLoad: () => void;
  handlePlay: () => void;
  handlePause: () => void;
  handleStop: () => void;
}

const PlayerContext = createContext<PlayerContextProps | undefined>(undefined);

export const PlayerProvider = PlayerContext.Provider;

export function usePlayerContext() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayerContext must be used within a PlayerProvider');
  }
  return context;
}
