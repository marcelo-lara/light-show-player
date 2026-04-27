import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Box } from '@mui/material';
import WaveSurfer from 'wavesurfer.js';
import { usePlayerContext } from '../contexts/PlayerContext';
import { StatusPayload } from '../../../shared/types/intents';

const BACKEND_WS = (import.meta.env.VITE_BACKEND_URL as string) || 'ws://localhost:3001';
const BACKEND_HTTP = BACKEND_WS.replace(/^ws/, 'http');

export interface WaveformHandle {
  play: () => void;
  pause: () => void;
  stop: () => void;
  load: (url: string) => void;
  getCurrentTime: () => number;
}

export const Waveform = forwardRef<WaveformHandle>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const { sendIntent, setDuration, setCurrentTime, status } = usePlayerContext();

  const statusRef = useRef<StatusPayload | null>(null);
  statusRef.current = status;

  useImperativeHandle(ref, () => ({
    play: () => waveSurferRef.current?.play(),
    pause: () => waveSurferRef.current?.pause(),
    stop: () => waveSurferRef.current?.stop(),
    load: (url: string) => waveSurferRef.current?.load(`${BACKEND_HTTP}/data/songs/${encodeURIComponent(url)}`),
    getCurrentTime: () => waveSurferRef.current?.getCurrentTime() || 0,
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#333333',
      progressColor: '#9000dd',
      cursorWidth: 1,
      barWidth: 2,
      height: 128,
      normalize: true,
      minPxPerSec: 100,
    });

    ws.on('ready', () => {
      setDuration(ws.getDuration());
    });

    const shadowHost = containerRef.current?.firstElementChild;
    const shadowRoot = shadowHost?.shadowRoot;
    
    if (shadowRoot) {
      const style = document.createElement('style');
      style.textContent = `
        ::-webkit-scrollbar {
          width: 0.5em;
          height: 0.5em;
        }
        ::-webkit-scrollbar-track {
          background: #000;
        }
        ::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #aaa;
        }
      `;
      shadowRoot.appendChild(style);
    }

    ws.on('interaction', () => {
      const currentStatus = statusRef.current;
      if (currentStatus && !currentStatus.isController && currentStatus.state === 'PLAYING') {
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
  }, [sendIntent, setDuration, setCurrentTime]);

  return (
    <Box sx={{ p: 1 }}>
      <Box ref={containerRef} className="wsplayer" sx={{ width: '100%', bgcolor: 'background.paper' }} />
    </Box>
  );
});
