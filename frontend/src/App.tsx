import { useState, useEffect, useRef, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { useWebSocket } from './hooks/useWebSocket';
import { StatusPayload } from '../../shared/types/intents';
import { Box, Button, Typography, Select, MenuItem, FormControl, Chip, Grid } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import FileUploadIcon from '@mui/icons-material/FileUpload';

const BACKEND_WS = (import.meta.env.VITE_BACKEND_URL as string) || 'ws://localhost:3001';
const BACKEND_HTTP = BACKEND_WS.replace(/^ws/, 'http');

function getSongBaseName(songFile: string): string {
  return songFile.replace(/\.(mp3|wav|ogg|flac)$/i, '');
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hundredths = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
}

function formatMsValue(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return 'n/a';
  }

  return `${value.toFixed(1)} ms`;
}

function formatReadyState(readyState: number): string {
  if (readyState === WebSocket.OPEN) return 'OPEN';
  if (readyState === WebSocket.CONNECTING) return 'CONNECTING';
  return 'CLOSED';
}

export default function App() {
  const { state, manifest, lastAck, status, sendIntent, readyState } = useWebSocket(BACKEND_WS);
  const [selectedSong, setSelectedSong] = useState('');
  const [selectedShow, setSelectedShow] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [startupOffsetMs, setStartupOffsetMs] = useState<number | null>(null);

  const statusRef = useRef<StatusPayload | null>(null);
  statusRef.current = status;

  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scheduledPlayTimerRef = useRef<number | null>(null);
  const isSocketOpen = readyState === WebSocket.OPEN;
  const liveDriftMs = status ? currentTime * 1000 - status.backendTimeMs : null;

  const clearScheduledPlay = useCallback(() => {
    if (scheduledPlayTimerRef.current !== null) {
      window.clearTimeout(scheduledPlayTimerRef.current);
      scheduledPlayTimerRef.current = null;
    }
  }, []);

  const handleLoad = useCallback(() => {
    if (!selectedSong || !isSocketOpen) return;

    const songBase = getSongBaseName(selectedSong);
    const dmxFile = selectedShow ? `${songBase}.${selectedShow}.dmx` : '';
    sendIntent({
      type: 'LOAD',
      payload: { songFile: selectedSong, dmxFile },
    });
  }, [isSocketOpen, selectedShow, selectedSong, sendIntent]);

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#333333',
      progressColor: '#9000dd',
      cursorWidth: 0,
      barWidth: 2,
      height: 128,
      normalize: true,
      minPxPerSec: 100,
    });

    ws.on('ready', () => {
      setDuration(ws.getDuration());
    });

    ws.on('interaction', () => {
      // Allow seeking in monitor mode if we're IDLE or LOADED?
      // Actually if we're not controller, we probably shouldn't seek while PLAYING
      // since that might mess with local playback. Or maybe we can't seek the backend.
      // Let's only emit SEEK if we're controller or allowed. But wait, SEEK sets the playhead.
      // Let's enforce that we only send SEEK if we're the controller or state is not PLAYING.
      // The task says "Disable steering SYNC emissions when operating in Monitor Mode", but maybe SEEK is fine when loaded.
      // We will let the backend reject it if necessary, but we should definitely prevent it if we know we're monitor and PLAYING.
      const currentStatus = statusRef.current;
      if (currentStatus && !currentStatus.isController && currentStatus.state === 'PLAYING') {
         // Optionally reset playhead to backend time if someone clicks
         // For now, doing nothing is fine.
         return;
      }
      const timeMs = ws.getCurrentTime() * 1000;
      sendIntent({ type: 'SEEK', payload: { time: timeMs } });
    });

    ws.on('audioprocess', () => {
      setCurrentTime(ws.getCurrentTime());
    });

    waveSurferRef.current = ws;

    return () => {
      ws.destroy();
      waveSurferRef.current = null;
    };
  }, [sendIntent]);

  useEffect(() => {
    if (manifest.songs.length === 0 || selectedSong) return;

    const firstSongWithShow = manifest.songs.find((song) => {
      const songBase = getSongBaseName(song);
      return (manifest.shows[songBase] || []).length > 0;
    });

    setSelectedSong(firstSongWithShow || manifest.songs[0]);
  }, [manifest.songs, manifest.shows, selectedSong]);

  useEffect(() => {
    if (!selectedSong) return;

    const songBase = getSongBaseName(selectedSong);
    const availableShows = manifest.shows[songBase] || [];

    if (availableShows.length === 0) {
      if (selectedShow) {
        setSelectedShow('');
      }
      return;
    }

    if (!selectedShow || !availableShows.includes(selectedShow)) {
      setSelectedShow(availableShows[0]);
    }
  }, [manifest.shows, selectedShow, selectedSong]);

  useEffect(() => {
    if (!isSocketOpen) return;

    if (selectedSong && selectedShow && state === 'IDLE') {
      handleLoad();
    }
  }, [handleLoad, isSocketOpen, selectedShow, selectedSong, state]);

  useEffect(() => {
    if (!selectedSong || !waveSurferRef.current) return;

    clearScheduledPlay();
    setStartupOffsetMs(null);
    setCurrentTime(0);
    setDuration(0);
    waveSurferRef.current.load(`${BACKEND_HTTP}/data/songs/${encodeURIComponent(selectedSong)}`);
  }, [clearScheduledPlay, selectedSong]);

  useEffect(() => {
    if (!isSocketOpen) return;

    const heartbeat = setInterval(() => {
      sendIntent({ type: 'HEARTBEAT' });
    }, 333);

    return () => clearInterval(heartbeat);
  }, [isSocketOpen, sendIntent]);

  useEffect(() => {
    if (!isSocketOpen || state !== 'PLAYING') return;
    if (status && !status.isController) return;

    const sync = setInterval(() => {
      const timeMs = waveSurferRef.current ? waveSurferRef.current.getCurrentTime() * 1000 : 0;
      sendIntent({ type: 'SYNC', payload: { currentTime: timeMs } });
    }, 1000);

    return () => clearInterval(sync);
  }, [isSocketOpen, sendIntent, state, status]);

  useEffect(() => {
    if (!isSocketOpen) return;

    const statusPoll = setInterval(() => {
      sendIntent({ type: 'GET_STATUS' });
    }, 250);

    return () => clearInterval(statusPoll);
  }, [isSocketOpen, sendIntent]);

  useEffect(() => {
    if (state !== 'PLAYING' || !status || startupOffsetMs !== null) return;

    if (currentTime === 0 && status.backendTimeMs === 0) {
      return;
    }

    setStartupOffsetMs(currentTime * 1000 - status.backendTimeMs);
  }, [currentTime, startupOffsetMs, state, status]);

  useEffect(() => {
    if (state === 'IDLE' || state === 'LOADED') {
      clearScheduledPlay();
    }

    if (state !== 'PLAYING') {
      setStartupOffsetMs(null);
    }
  }, [clearScheduledPlay, state]);

  useEffect(() => {
    return () => {
      clearScheduledPlay();
    };
  }, [clearScheduledPlay]);

  const handlePlay = () => {
    if (!isSocketOpen) return;

    const startAtTime = Date.now() + 100;
    const currentTimeMs = waveSurferRef.current ? waveSurferRef.current.getCurrentTime() * 1000 : currentTime * 1000;

    clearScheduledPlay();
    setStartupOffsetMs(null);
    sendIntent({ type: 'PLAY', payload: { startAtTime, currentTime: currentTimeMs } });

    scheduledPlayTimerRef.current = window.setTimeout(() => {
      scheduledPlayTimerRef.current = null;
      waveSurferRef.current?.play();

      const playbackTimeMs = waveSurferRef.current ? waveSurferRef.current.getCurrentTime() * 1000 : currentTimeMs;
      sendIntent({ type: 'SYNC', payload: { currentTime: playbackTimeMs } });
    }, Math.max(0, startAtTime - Date.now()));
  };

  const handlePause = () => {
    if (!isSocketOpen) return;

    clearScheduledPlay();
    sendIntent({ type: 'PAUSE' });
    waveSurferRef.current?.pause();
  };

  const handleStop = () => {
    if (!isSocketOpen) return;

    clearScheduledPlay();
    sendIntent({ type: 'STOP' });
    waveSurferRef.current?.stop();
    setCurrentTime(0);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary', fontFamily: 'monospace' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'primary.main', p: 1 }}>
        <FormControl sx={{ mr: 2, minWidth: 120 }}>
          <Select
            value={selectedSong}
            onChange={(e) => setSelectedSong(e.target.value)}
            displayEmpty
            sx={{ bgcolor: 'background.paper', color: 'text.primary' }}
          >
            <MenuItem value="">
              <Typography>Select Song</Typography>
            </MenuItem>
            {manifest.songs.map((song) => (
              <MenuItem key={song} value={song}>
                <Typography>{getSongBaseName(song)}</Typography>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 120 }}>
          <Select
            value={selectedShow}
            onChange={(e) => setSelectedShow(e.target.value)}
            displayEmpty
            disabled={!selectedSong}
            sx={{ bgcolor: 'background.paper', color: 'text.primary' }}
          >
            <MenuItem value="">
              <Typography>Select Show</Typography>
            </MenuItem>
            {selectedSong && (() => {
              const songBase = getSongBaseName(selectedSong);
              const availableShows = manifest.shows[songBase] || [];
              return availableShows.length > 0 ? availableShows.map((show) => (
                <MenuItem key={show} value={show}>
                  <Typography>{show}</Typography>
                </MenuItem>
              )) : (
                <MenuItem disabled>
                  <Typography color="text.secondary">*no shows available*</Typography>
                </MenuItem>
              );
            })()}
          </Select>
        </FormControl>

        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={state}
            color={state === 'PLAYING' ? 'success' : 'default'}
            size="small"
          />
          <Typography variant="body2" color="text.secondary">{state}</Typography>
        </Box>
      </Box>

      <Box sx={{ p: 1 }}>
        <Box
          ref={containerRef}
          sx={{ width: '100%', bgcolor: 'background.paper', border: 1, borderColor: 'grey.700' }}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderTop: 1, borderColor: 'primary.main' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            onClick={handleLoad}
            disabled={!selectedSong || !isSocketOpen}
            variant="contained"
            color="primary"
            startIcon={<FileUploadIcon />}
          >
            Load
          </Button>
          <Button
            onClick={handlePlay}
            disabled={state === 'IDLE' || !isSocketOpen}
            variant="contained"
            color="success"
            startIcon={<PlayArrowIcon />}
          >
            Play
          </Button>
          <Button
            onClick={handlePause}
            disabled={state !== 'PLAYING' || !isSocketOpen}
            variant="contained"
            color="warning"
            startIcon={<PauseIcon />}
          >
            Pause
          </Button>
          <Button
            onClick={handleStop}
            disabled={state === 'IDLE' || !isSocketOpen}
            variant="contained"
            color="error"
            startIcon={<StopIcon />}
          >
            Stop
          </Button>
        </Box>

        <Typography variant="h4" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
          {formatTime(currentTime)}
        </Typography>
      </Box>

      <Grid container sx={{ p: 1 }} spacing={1}>
        <Grid size={4}>
          <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'grey.700', height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary" variant="body2">DMX Monitor</Typography>
          </Box>
        </Grid>
        <Grid size={4}>
          <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'grey.700', height: 96, p: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.5 }}>
            <Typography color="text.secondary" variant="body2">
              Event Log
              {status && (
                <Chip
                  label={status.isController ? 'MASTER' : 'MONITOR'}
                  color={status.isController ? 'success' : 'default'}
                  size="small"
                  sx={{ ml: 1, height: 16, fontSize: '0.65rem' }}
                />
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Last Ack: {lastAck ? `${lastAck.intentType} ${lastAck.status}` : 'n/a'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              WebSocket: {formatReadyState(readyState)}
            </Typography>
          </Box>
        </Grid>
        <Grid size={4}>
          <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'grey.700', height: 96, p: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.5 }}>
            <Typography color="text.secondary" variant="body2">Diagnostics</Typography>
            <Typography variant="caption" color="text.secondary">Frontend: {formatTime(currentTime)}</Typography>
            <Typography variant="caption" color="text.secondary">Backend: {formatTime((status?.backendTimeMs ?? 0) / 1000)}</Typography>
            <Typography variant="caption" color="text.secondary">Live Drift: {formatMsValue(liveDriftMs)}</Typography>
            <Typography variant="caption" color="text.secondary">Startup Offset: {formatMsValue(startupOffsetMs)}</Typography>
            <Typography variant="caption" color="text.secondary">Backend Start Lag: {formatMsValue(status?.backendStartLagMs ?? null)}</Typography>
            <Typography variant="caption" color="text.secondary">Speed: {status ? status.speedFactor.toFixed(4) : 'n/a'}</Typography>
            <Typography variant="caption" color="text.secondary">Controller: {status?.isController ? 'yes' : 'no'}</Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}