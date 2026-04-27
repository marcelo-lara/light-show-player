import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import { DmxFileLoader } from './DmxFileLoader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type SchedulerState = 'STOPPED' | 'PLAYING' | 'PAUSED';

export class SchedulerService {
  private worker: Worker | null = null;
  private targetIp: string;
  private universe: number;
  private buffer: SharedArrayBuffer;
  private frameRate: number;

  constructor(buffer: SharedArrayBuffer, targetIp: string, universe: number, frameRate: number) {
    this.buffer = buffer;
    this.targetIp = targetIp;
    this.universe = universe;
    this.frameRate = frameRate;
  }

  public start() {
    if (this.worker) this.worker.postMessage({ type: 'STOP' });

    const workerPath = path.resolve(__dirname, 'scheduler.worker.js');
    const totalFrames = DmxFileLoader.getFrameCount(this.buffer);

    this.worker = new Worker(workerPath, {
      workerData: {
        buffer: this.buffer,
        targetIp: this.targetIp,
        universe: this.universe,
        frameRate: this.frameRate,
        totalFrames,
      },
    });

    this.worker.on('message', (msg) => {
      if (msg.type === 'STATE_CHANGE') {
        console.log(`[Scheduler] ${msg.state} (frame ${msg.currentFrame}/${msg.totalFrames})`);
      }
    });

    this.worker.on('error', (err) => {
      console.error('[Scheduler] Worker error:', err);
    });

    this.worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`[Scheduler] Worker exited with code ${code}`);
      }
      this.worker = null;
    });
  }

  public stop() {
    if (this.worker) {
      this.worker.postMessage({ type: 'STOP' });
    }
  }

  public pause() {
    if (this.worker) {
      this.worker.postMessage({ type: 'PAUSE' });
    }
  }

  public resume() {
    if (this.worker) {
      this.worker.postMessage({ type: 'RESUME' });
    }
  }

  public setSpeed(speedFactor: number) {
    if (this.worker) {
      this.worker.postMessage({ type: 'SET_SPEED', speed: speedFactor });
    }
  }

  public seekFrame(frameIndex: number) {
    if (this.worker) {
      this.worker.postMessage({ type: 'SEEK_FRAME', frame: frameIndex });
    }
  }

  public seekTime(timeMs: number) {
    if (this.worker) {
      this.worker.postMessage({ type: 'SEEK_TIME', timeMs });
    }
  }

  public blackout() {
    if (this.worker) {
      this.worker.postMessage({ type: 'BLACKOUT' });
    }
  }

  public requestStatus(cb: (status: { showTimeMs: number; currentFrame: number; totalFrames: number; state: string }) => void) {
    if (!this.worker) return;
    const handler = (msg: any) => {
      if (msg.type === 'STATUS') {
        this.worker!.removeListener('message', handler);
        cb(msg);
      }
    };
    this.worker.on('message', handler);
    this.worker.postMessage({ type: 'GET_STATUS' });
  }

  public isRunning(): boolean {
    return this.worker !== null;
  }
}
