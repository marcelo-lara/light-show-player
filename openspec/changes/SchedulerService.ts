import { Worker } from 'worker_threads';
import path from 'path';
import { ArtNetService } from './ArtNetService';

export class SchedulerService {
  private worker: Worker | null = null;
  private sharedBuffer = new SharedArrayBuffer(512 * 4); // Support 4 universes
  private controlBuffer = new SharedArrayBuffer(16); // 4 integers for control
  private controls = new Int32Array(this.controlBuffer);

  constructor(private artnet: ArtNetService) {}

  public start(fps: number = 50) {
    const intervalMs = 1000 / fps;

    this.worker = new Worker(path.resolve(__dirname, '../workers/scheduler.worker.ts'), {
      workerData: {
        sharedBuffer: this.sharedBuffer,
        controlBuffer: this.controlBuffer,
        intervalMs
      }
    });

    this.worker.on('message', (msg) => {
      if (msg.type === 'TICK') {
        this.dispatchFrames();
      }
    });

    this.controls[0] = 1; // Set state to PLAYING
  }

  public pause() {
    this.controls[0] = 2;
  }

  public seek(frameIndex: number) {
    this.controls[1] = frameIndex;
  }

  private dispatchFrames() {
    // In a real show, we'd iterate over active universes
    // For now, we send the first 512 bytes to Universe 0
    const frameData = new Uint8Array(this.sharedBuffer, 0, 512);
    this.artnet.send(0, frameData);
  }

  /**
   * Updates the shared memory with the next frame's data.
   * Called by the DmxFileLoader (Main Thread).
   */
  public updateFrameData(data: Uint8Array) {
    const view = new Uint8Array(this.sharedBuffer);
    view.set(data);
  }
}