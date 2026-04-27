import { WebSocketServer, WebSocket } from 'ws';
import { Intent, ServerEvent, StateChangePayload } from '../../shared/types/intents.js';
import { DiscoveryService } from './services/DiscoveryService.js';

export class SocketServer {
    private wss: WebSocketServer;
    private state: 'IDLE' | 'LOADED' | 'PLAYING' | 'PAUSED' = 'IDLE';

    constructor(port: number) {
        this.wss = new WebSocketServer({ port });
        this.setup();
        console.log(`[SocketServer] Listening on port ${port}`);
    }

    private setup() {
        this.wss.on('connection', (ws: WebSocket) => {
            console.log('[SocketServer] Client connected');
            
            ws.on('message', (data: string) => {
                try {
                    const intent: Intent = JSON.parse(data);
                    this.handleIntent(ws, intent);
                } catch (err) {
                    console.error('[SocketServer] Error parsing intent:', err);
                }
            });
        });
    }

    private handleIntent(ws: WebSocket, intent: Intent) {
        console.log(`[SocketServer] Received intent: ${intent.type}`);
        
        switch (intent.type) {
            case 'LIST_ASSETS':
                this.handleListAssets(ws);
                break;
            case 'LOAD':
                this.handleLoad(ws, intent.payload);
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

    private handleLoad(ws: WebSocket, payload: { songFile: string; dmxFile: string }) {
        if (this.state === 'PLAYING') {
            return this.sendAck(ws, 'LOAD', 'FAILED', 'Cannot load while playing');
        }
        
        this.state = 'LOADED';
        this.broadcastState();
        this.sendAck(ws, 'LOAD', 'SUCCESS');
    }

    private sendAck(ws: WebSocket, intentType: string, status: 'SUCCESS' | 'IGNORED' | 'FAILED', message?: string) {
        this.sendEvent(ws, 'ACK', { intentType, status, message });
    }

    private broadcastState() {
        const payload: StateChangePayload = { state: this.state };
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
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