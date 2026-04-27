import { useEffect, useRef, useState, useCallback } from 'react';
import { Intent, ServerEvent, StatusPayload } from 'shared/types/intents';

export function useWebSocket(url: string) {
  const [state, setState] = useState<'IDLE' | 'LOADED' | 'PLAYING' | 'PAUSED'>('IDLE');
  const [manifest, setManifest] = useState<{ songs: string[]; shows: Record<string, string[]> }>({ songs: [], shows: {} });
  const [lastAck, setLastAck] = useState<any>(null);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const shouldReconnect = useRef(true);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimer.current !== null) {
      window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    clearReconnectTimer();
    setReadyState(WebSocket.CONNECTING);

    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      if (ws.current !== socket) {
        socket.close();
        return;
      }

      setReadyState(WebSocket.OPEN);
      socket.send(JSON.stringify({ type: 'LIST_ASSETS', payload: {}, timestamp: Date.now() }));
    };

    socket.onmessage = (event) => {
      if (ws.current !== socket) return;

      try {
        const serverEvent: ServerEvent = JSON.parse(event.data);
        handleServerEvent(serverEvent);
      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    };

    socket.onclose = () => {
      if (ws.current !== socket) {
        return;
      }

      if (ws.current === socket) {
        ws.current = null;
      }

      setReadyState(WebSocket.CLOSED);

      if (!shouldReconnect.current) {
        return;
      }

      console.log('Disconnected. Reconnecting in 3s...');
      reconnectTimer.current = window.setTimeout(() => {
        connect();
      }, 3000);
    };

    socket.onerror = (err) => {
      if (ws.current !== socket) return;
      console.error('WebSocket error:', err);
    };
  }, [clearReconnectTimer, url]);

  const handleServerEvent = (event: ServerEvent) => {
    switch (event.type) {
      case 'STATE_CHANGE':
        setState(event.payload.state);
        break;
      case 'ASSETS_MANIFEST':
        // The backend returns { songs: string[], shows: Record<string, string[]> }
        setManifest(event.payload);
        break;
      case 'ACK':
        setLastAck(event.payload);
        break;
      case 'STATUS':
        setStatus(event.payload as StatusPayload);
        break;
    }
  };

  useEffect(() => {
    shouldReconnect.current = true;
    connect();
    return () => {
      shouldReconnect.current = false;
      clearReconnectTimer();
      ws.current?.close();
      ws.current = null;
    };
  }, [clearReconnectTimer, connect]);

  const sendIntent = useCallback((intent: Partial<Intent>) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const fullIntent: Intent = {
        type: intent.type!,
        payload: intent.payload || {},
        timestamp: intent.timestamp || Date.now()
      };
      ws.current.send(JSON.stringify(fullIntent));
    }
  }, []);

  return { state, manifest, lastAck, status, sendIntent, readyState };
}