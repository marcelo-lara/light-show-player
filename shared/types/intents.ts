/**
 * Intent Protocol definitions as per OpenSpec Design.
 */

export type IntentType = 'PLAY' | 'PAUSE' | 'STOP' | 'SEEK' | 'SYNC' | 'LOAD' | 'LIST_ASSETS' | 'HEARTBEAT' | 'GET_STATUS';

export interface Intent<T = any> {
  type: IntentType;
  payload: T;
  timestamp: number; // UI Master Time in ms
}

export interface LoadPayload {
  songFile: string;
  dmxFile: string;
}

export interface PlayPayload {
  startAtTime: number;
  currentTime: number;
}

export interface SyncPayload {
  currentTime: number;
}

export type ServerEventType = 
  | 'ACK' 
  | 'STATE_CHANGE' 
  | 'ASSETS_MANIFEST' 
  | 'STATUS'
  | 'WARNING' 
  | 'ERROR';

export interface ServerEvent<T = any> {
  type: ServerEventType;
  payload: T;
  timestamp: number; // Server's internal precision timestamp
}

export interface AckPayload {
  intentType: string;
  status: 'SUCCESS' | 'IGNORED' | 'FAILED';
  message?: string;
}

export interface StateChangePayload {
  state: 'IDLE' | 'LOADED' | 'PLAYING' | 'PAUSED';
  activeAssets?: { 
    song: string; 
    show: string; 
  };
}

export interface AssetsManifestPayload {
  songs: string[];
  shows: Record<string, string[]>;
}

export interface StatusPayload {
  state: 'IDLE' | 'LOADED' | 'PLAYING' | 'PAUSED';
  backendTimeMs: number;
  currentFrame: number;
  totalFrames: number;
  speedFactor: number;
  scheduledStartAtTime: number | null;
  backendStartLagMs: number | null;
  lastSyncDriftMs: number | null;
  isController: boolean;
}

export interface WarningPayload {
  code: 'BUFFER_UNDERRUN' | 'HIGH_JITTER' | 'STEERING_MAXED';
  message: string;
}

export interface ErrorPayload {
  code: 'FILE_NOT_FOUND' | 'INVALID_FORMAT' | 'WORKER_CRASH';
  message: string;
}
