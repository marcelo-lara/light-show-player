import { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { Box } from '@mui/material';

import { PlayerProvider } from './contexts/PlayerContext';
import { TopBar } from './components/TopBar';
import { PlayerControls } from './components/PlayerControls';
import { PanelGrid } from './components/Panels/PanelGrid';
import { Waveform, WaveformHandle } from './components/Waveform';
import { getSongBaseName } from './utils/formatters';

const BACKEND_WS = (import.meta.env.VITE_BACKEND_URL as string) || 'ws://localhost:3001';

export default function App() {
  const { state, manifest, lastAck, status, sendIntent, readyState } = useWebSocket(BACKEND_WS);
  const [selectedSong, setSelectedSong] = useState('');
  const [selectedShow, setSelectedShow] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [startupOffsetMs, setStartupOffsetMs] = useState<number | null>(null);

  const waveformRef = useRef<WaveformHandle>(null);
  const scheduledPlayTimerRef = useRef<number | null>(null);
  const isSocketOpen = readyState === 1 /* WebSocket.OPEN */;
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
    if (!selectedSong) return;

    clearScheduledPlay();
    setStartupOffsetMs(null);
    setCurrentTime(0);
    setDuration(0);
    waveformRef.current?.load(selectedSong);
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
      const timeMs = waveformRef.current ? waveformRef.current.getCurrentTime() * 1000 : 0;
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
    const currentTimeMs = waveformRef.current ? waveformRef.current.getCurrentTime() * 1000 : currentTime * 1000;

    clearScheduledPlay();
    setStartupOffsetMs(null);
    sendIntent({ type: 'PLAY', payload: { startAtTime, currentTime: currentTimeMs } });

    scheduledPlayTimerRef.current = window.setTimeout(() => {
      scheduledPlayTimerRef.current = null;
      waveformRef.current?.play();

      const playbackTimeMs = waveformRef.current ? waveformRef.current.getCurrentTime() * 1000 : currentTimeMs;
      sendIntent({ type: 'SYNC', payload: { currentTime: playbackTimeMs } });
    }, Math.max(0, startAtTime - Date.now()));
  };

  const handlePause = () => {
    if (!isSocketOpen) return;

    clearScheduledPlay();
    sendIntent({ type: 'PAUSE' });
    waveformRef.current?.pause();
  };

  const handleStop = () => {
    if (!isSocketOpen) return;

    clearScheduledPlay();
    sendIntent({ type: 'STOP' });
    waveformRef.current?.stop();
    setCurrentTime(0);
  };

  const providerValue = {
    state, manifest, lastAck, status, sendIntent, readyState, isSocketOpen,
    selectedSong, setSelectedSong, selectedShow, setSelectedShow,
    currentTime, setCurrentTime, duration, setDuration, startupOffsetMs, setStartupOffsetMs, liveDriftMs,
    handleLoad, handlePlay, handlePause, handleStop,
  };

  return (
    <PlayerProvider value={providerValue}>
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', color: 'text.primary', fontFamily: 'monospace' }}>
        <TopBar />
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Waveform ref={waveformRef} />
          <PlayerControls />
          <PanelGrid />
        </Box>
      </Box>
    </PlayerProvider>
  );
}
