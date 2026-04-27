import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { Intent, PlayPayload, ServerEvent, StateChangePayload, StatusPayload, SyncPayload } from '../../shared/types/intents.js';
import { DiscoveryService } from './services/DiscoveryService.js';
import { DmxFileLoader } from './services/DmxFileLoader.js';
import { DmxPreloader } from './services/DmxPreloader.js';
import { SchedulerService } from './services/SchedulerService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getMimeType(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.mp3': return 'audio/mpeg';
    case '.wav': return 'audio/wav';
    case '.ogg': return 'audio/ogg';
    case '.flac': return 'audio/flac';
    case '.dmx': return 'application/octet-stream';
    default: return 'application/octet-stream';
  }
}

export class SocketServer {
  private httpServer: http.Server;
  private wss: WebSocketServer;
  private state: 'IDLE' | 'LOADED' | 'PLAYING' | 'PAUSED' = 'IDLE';
  private preloader: DmxPreloader | null = null;
  private scheduler: SchedulerService | null = null;
  private loadedSong: string = '';
  private loadedShow: string = '';
  private currentSpeedFactor: number = 1.0;
  private controllerClient: WebSocket | null = null;
  private scheduledPlayTimer: NodeJS.Timeout | null = null;
  private scheduledStartAtTime: number | null = null;
  private backendStartLagMs: number | null = null;
  private lastSyncDriftMs: number | null = null;

  private readonly targetIp: string = process.env.DMX_NODE_IP || '192.168.10.221';
  private readonly universe: number = parseInt(process.env.ARTNET_UNIVERSE || '0', 10);

  constructor(port: number) {
    this.httpServer = http.createServer(this.handleRequest.bind(this));
    this.wss = new WebSocketServer({ noServer: true });

    this.setupWebSocket();
    this.startHeartbeatMonitor();

    this.httpServer.on('upgrade', (request, socket, head) => {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request);
      });
    });

    this.httpServer.listen(port, '0.0.0.0', () => {
      console.log(`[SocketServer] HTTP+WS listening on port ${port}`);
      console.log(`[DMX] Outputting to ${this.targetIp} (Universe ${this.universe})`);
    });
  }

  private startHeartbeatMonitor() {
    // Check every 500ms for missing heartbeats (1s timeout)
    setInterval(() => this.checkConnections(), 500);
  }

  private clearScheduledPlay() {
    if (this.scheduledPlayTimer) {
      clearTimeout(this.scheduledPlayTimer);
      this.scheduledPlayTimer = null;
    }
    this.scheduledStartAtTime = null;
    this.backendStartLagMs = null;
  }

  private getControllerClient(): WebSocket | null {
    if (this.controllerClient && this.controllerClient.readyState !== WebSocket.OPEN) {
      this.controllerClient = null;
    }

    return this.controllerClient;
  }

  private isControllerClient(ws: WebSocket): boolean {
    const controller = this.getControllerClient();
    return controller !== null && controller === ws;
  }

  private shouldIgnoreTimingIntent(ws: WebSocket): boolean {
    const controller = this.getControllerClient();
    return controller !== null && controller !== ws;
  }

  private buildStatusPayload(ws: WebSocket, schedulerStatus?: { showTimeMs: number; currentFrame: number; totalFrames: number; state: string }): StatusPayload {
    return {
      state: this.state,
      backendTimeMs: schedulerStatus?.showTimeMs ?? 0,
      currentFrame: schedulerStatus?.currentFrame ?? -1,
      totalFrames: schedulerStatus?.totalFrames ?? 0,
      speedFactor: this.currentSpeedFactor,
      scheduledStartAtTime: this.scheduledStartAtTime,
      backendStartLagMs: this.backendStartLagMs,
      lastSyncDriftMs: this.lastSyncDriftMs,
      isController: this.isControllerClient(ws),
    };
  }

  private sendStatus(ws: WebSocket, schedulerStatus?: { showTimeMs: number; currentFrame: number; totalFrames: number; state: string }) {
    this.sendEvent(ws, 'STATUS', this.buildStatusPayload(ws, schedulerStatus));
  }

  private pausePlayback() {
    this.clearScheduledPlay();

    if (this.scheduler) {
      this.scheduler.pause();
    }

    this.state = 'PAUSED';
    this.broadcastState();
  }

  private getOtherOpenClients(excludedClient?: WebSocket): WebSocket[] {
    return Array.from(this.wss.clients).filter((client) => {
      return client !== excludedClient && client.readyState === WebSocket.OPEN;
    }) as WebSocket[];
  }

  private handleLastClientDisconnect() {
    console.log('[SocketServer] Last client lost, blackout and reset');

    if (this.scheduler) {
      this.scheduler.blackout();
      this.scheduler.stop();
      this.scheduler = null;
    }

    if (this.preloader) {
      this.preloader.clear();
      this.preloader = null;
    }

    this.controllerClient = null;
    this.clearScheduledPlay();
    this.lastSyncDriftMs = null;
    this.currentSpeedFactor = 1.0;

    this.state = 'IDLE';
    this.broadcastState();
  }

  private checkConnections() {
    const now = Date.now();
    const clients = Array.from(this.wss.clients);
    for (const client of clients) {
      if (client.readyState !== WebSocket.OPEN) continue;
      const last = (client as any).lastHeartbeat as number | undefined;
      if (last && now - last > 1000) {
        console.log('[SocketServer] Heartbeat timeout, disconnecting stale client');
        if (this.getOtherOpenClients(client).length === 0) {
          this.handleLastClientDisconnect();
        }
        client.close();
      }
    }
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    if (req.url?.startsWith('/data/')) {
      // Serve static files from /data (mounted)
      const filePath = path.join('/data', decodeURIComponent(req.url.slice(5)));
      try {
        const stat = await fs.promises.stat(filePath);
        if (stat.isDirectory()) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }
        const ext = path.extname(filePath);
        const mime = getMimeType(ext);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.writeHead(200, { 'Content-Type': mime });
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          res.writeHead(404);
          res.end('Not found');
        } else {
          res.writeHead(500);
          res.end('Server error');
        }
      }
      return;
    }

    // Default: 404
    res.writeHead(404);
    res.end('Not found');
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[SocketServer] Client connected');
      (ws as any).lastHeartbeat = Date.now();

      this.sendEvent(ws, 'STATE_CHANGE', { state: this.state });
      this.sendStatus(ws);

      ws.on('message', (data: string) => {
        try {
          const intent: Intent = JSON.parse(data.toString());
          this.handleIntent(ws, intent);
        } catch (err) {
          console.error('[SocketServer] Error parsing intent:', err);
        }
      });

      ws.on('close', () => {
        console.log('[SocketServer] Client disconnected');
        const wasController = this.controllerClient === ws;

        if (wasController) {
          this.controllerClient = null;
          this.clearScheduledPlay();

          if (this.state === 'PLAYING') {
            this.pausePlayback();
            return;
          }
        }

        if (this.state === 'PLAYING' && this.getOtherOpenClients(ws).length === 0) {
          this.pausePlayback();
        }
      });
    });
  }

  private handleIntent(ws: WebSocket, intent: Intent) {
    console.log('[SocketServer] Received intent:', intent.type);
    switch (intent.type) {
      case 'LIST_ASSETS':
        this.handleListAssets(ws);
        break;
      case 'LOAD':
        this.handleLoad(ws, intent.payload);
        break;
      case 'PLAY':
        this.handlePlay(ws, intent.payload);
        break;
      case 'PAUSE':
        this.handlePause(ws);
        break;
      case 'STOP':
        this.handleStop(ws);
        break;
      case 'SYNC':
        this.handleSync(ws, intent.payload);
        break;
      case 'HEARTBEAT':
        (ws as any).lastHeartbeat = Date.now();
        this.sendAck(ws, 'HEARTBEAT', 'SUCCESS');
        break;
      case 'SEEK':
        this.handleSeek(ws, intent.payload);
        break;
      case 'GET_STATUS':
        this.handleGetStatus(ws);
        break;
      default:
        this.sendAck(ws, intent.type, 'IGNORED', 'Not implemented yet');
    }
  }

  private async handleListAssets(ws: WebSocket) {
    const discovery = new DiscoveryService();
    const manifest = await discovery.getManifest();
    this.sendEvent(ws, 'ASSETS_MANIFEST', manifest);
  }

  private async handleLoad(ws: WebSocket, payload: { songFile: string; dmxFile: string }) {
    if (this.state === 'PLAYING') {
      return this.sendAck(ws, 'LOAD', 'FAILED', 'Cannot load while playing');
    }

    const songName = payload.songFile;
    const dmxName = payload.dmxFile;

    console.log(`[SocketServer] Loading song "${songName}"` + (dmxName ? ` with DMX "${dmxName}"` : ' without DMX'));

    if (dmxName) {
      const dmxPath = path.join('/data', 'shows', dmxName);
      const loader = new DmxFileLoader();
      const { buffer, frameRate } = await loader.loadFile(dmxPath);

      this.preloader = new DmxPreloader(buffer);
      if (this.scheduler) {
        this.scheduler.stop();
      }
      this.scheduler = new SchedulerService(buffer, this.targetIp, this.universe, frameRate);
      this.scheduler.start();

      this.loadedShow = dmxName;
    } else {
      // No DMX, just clear any existing
      if (this.scheduler) {
        this.scheduler.stop();
        this.scheduler = null;
      }
      if (this.preloader) {
        this.preloader.clear();
        this.preloader = null;
      }
      this.loadedShow = '';
    }

    this.loadedSong = songName;
    this.state = 'LOADED';
    this.currentSpeedFactor = 1.0;
    this.lastSyncDriftMs = null;
    this.clearScheduledPlay();

    this.sendAck(ws, 'LOAD', 'SUCCESS');
    this.broadcastState();
  }

  private handlePlay(ws: WebSocket, payload: PlayPayload) {
    if (this.state === 'IDLE') {
      return this.sendAck(ws, 'PLAY', 'FAILED', 'No show loaded');
    }

    if (this.state === 'PLAYING') {
      return this.sendAck(ws, 'PLAY', 'IGNORED', 'Already playing');
    }

    const currentTime = Math.max(0, payload?.currentTime ?? 0);
    const requestedStartAtTime = payload?.startAtTime ?? Date.now();
    const delayMs = Math.max(0, requestedStartAtTime - Date.now());

    this.controllerClient = ws;
    this.clearScheduledPlay();
    this.currentSpeedFactor = 1.0;
    this.lastSyncDriftMs = null;

    if (this.scheduler) {
      this.scheduler.seekTime(currentTime);
      this.scheduler.setSpeed(1.0);
    }

    this.scheduledStartAtTime = requestedStartAtTime;
    this.scheduledPlayTimer = setTimeout(() => {
      this.scheduledPlayTimer = null;
      this.backendStartLagMs = Date.now() - requestedStartAtTime;

      if (this.scheduler) {
        this.scheduler.resume();
      }

      this.state = 'PLAYING';
      this.broadcastState();
    }, delayMs);

    this.sendAck(ws, 'PLAY', 'SUCCESS');
    this.sendStatus(ws);
  }

  private handlePause(ws: WebSocket) {
    if (this.shouldIgnoreTimingIntent(ws)) {
      return this.sendAck(ws, 'PAUSE', 'IGNORED', 'Another controller is active');
    }

    if (this.state !== 'PLAYING') {
      return this.sendAck(ws, 'PAUSE', 'FAILED', 'Not playing');
    }

    this.pausePlayback();
    this.sendAck(ws, 'PAUSE', 'SUCCESS');
  }

  private handleStop(ws: WebSocket) {
    if (this.shouldIgnoreTimingIntent(ws)) {
      return this.sendAck(ws, 'STOP', 'IGNORED', 'Another controller is active');
    }

    this.clearScheduledPlay();

    if (this.scheduler) {
      this.scheduler.stop();
      this.scheduler = null;
    }
    if (this.preloader) {
      this.preloader.clear();
      this.preloader = null;
    }
    this.state = 'IDLE';
    this.loadedSong = '';
    this.loadedShow = '';
    this.currentSpeedFactor = 1.0;
    this.controllerClient = null;
    this.lastSyncDriftMs = null;
    this.sendAck(ws, 'STOP', 'SUCCESS');
    this.broadcastState();
  }

  private handleSync(ws: WebSocket, payload: SyncPayload) {
    if (this.shouldIgnoreTimingIntent(ws)) {
      return this.sendAck(ws, 'SYNC', 'IGNORED', 'Another controller is active');
    }

    const uiTimeMs = payload.currentTime;
    const sched = this.scheduler;

    if (!sched || this.state !== 'PLAYING') {
      return this.sendAck(ws, 'SYNC', 'SUCCESS');
    }

    sched.requestStatus((status) => {
      const backendTimeMs = status.showTimeMs;
      const drift = uiTimeMs - backendTimeMs;
      const SEEK_THRESHOLD = 500; // ms
      const STEER_ADJUST = 0.005; // 0.5%

      this.lastSyncDriftMs = drift;

      if (Math.abs(drift) > SEEK_THRESHOLD) {
        sched.seekTime(uiTimeMs);
        this.currentSpeedFactor = 1.0;
        sched.setSpeed(1.0);
        console.log(`[VSO] Large drift (${drift.toFixed(1)}ms) - seeking to ${uiTimeMs}ms`);
      } else {
        if (drift > 0) {
          this.currentSpeedFactor *= (1 + STEER_ADJUST);
        } else if (drift < 0) {
          this.currentSpeedFactor *= (1 - STEER_ADJUST);
        }
        this.currentSpeedFactor = Math.max(0.5, Math.min(2.0, this.currentSpeedFactor));
        sched.setSpeed(this.currentSpeedFactor);
        console.log(`[VSO] Drift ${drift.toFixed(1)}ms, speed ${this.currentSpeedFactor.toFixed(4)}`);
      }

      this.sendStatus(ws, status);
    });

    this.sendAck(ws, 'SYNC', 'SUCCESS');
  }

  private handleSeek(ws: WebSocket, payload: { time: number }) {
    if (this.shouldIgnoreTimingIntent(ws)) {
      return this.sendAck(ws, 'SEEK', 'IGNORED', 'Another controller is active');
    }

    if (!this.scheduler) {
      return this.sendAck(ws, 'SEEK', 'FAILED', 'No show loaded');
    }
    this.scheduler.seekTime(payload.time);
    this.sendAck(ws, 'SEEK', 'SUCCESS');
  }

  private handleGetStatus(ws: WebSocket) {
    if (!this.scheduler) {
      this.sendStatus(ws);
      return;
    }

    this.scheduler.requestStatus((status) => {
      this.sendStatus(ws, status);
    });
  }

  private sendAck(ws: WebSocket, intentType: string, status: 'SUCCESS' | 'IGNORED' | 'FAILED', message?: string) {
    this.sendEvent(ws, 'ACK', { intentType, status, message });
  }

  private broadcastState() {
    const payload: StateChangePayload = { state: this.state };
    this.wss.clients.forEach(client => {
      if (client && client.readyState === WebSocket.OPEN) {
        this.sendEvent(client, 'STATE_CHANGE', payload);
      }
    });
  }

  private sendEvent(ws: WebSocket, type: string, payload: any) {
    const event: ServerEvent = {
      type: type as any,
      payload,
      timestamp: Date.now()
    };
    ws.send(JSON.stringify(event));
  }
}

const PORT = parseInt(process.env.PORT || '3001');
new SocketServer(PORT);