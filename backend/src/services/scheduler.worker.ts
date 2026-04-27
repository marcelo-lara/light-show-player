import { parentPort, workerData } from 'worker_threads';
import dgram from 'dgram';
import { DmxFileLoader } from './DmxFileLoader.js';

interface WorkerInit {
  buffer: SharedArrayBuffer;
  targetIp: string;
  universe: number;
  frameRate: number;
  totalFrames: number;
  benchmark?: boolean;
}

type WorkerState = 'STOPPED' | 'PLAYING' | 'PAUSED';

class SchedulerWorker {
  private buffer: SharedArrayBuffer;
  private frameRate: number;
  private totalFrames: number;
  private frameIntervalMs: number;
  private targetIp: string;
  private universe: number;
  private socket: dgram.Socket;
  private state: WorkerState = 'STOPPED';
  private speedFactor: number = 1.0;
  private showTimeMs: number = 0;
  private currentFrameIdx: number = -1;
  private lastRealTimeNs: bigint = 0n;
  private scheduleHandle: NodeJS.Timeout | null = null;
  private benchmark: boolean;

  private dmxView: Uint8Array;
  private packet: Buffer;

  constructor(init: WorkerInit) {
    this.buffer = init.buffer;
    this.targetIp = init.targetIp;
    this.universe = init.universe;
    this.frameRate = init.frameRate;
    this.totalFrames = init.totalFrames;
    this.frameIntervalMs = 1000 / this.frameRate;
    this.benchmark = init.benchmark || false;

    this.dmxView = new Uint8Array(this.buffer);
    this.socket = dgram.createSocket('udp4');

    // Build static Art-Net header
    this.packet = Buffer.alloc(18 + 512, 0);
    this.packet.write('Art-Net\0', 0);
    this.packet.writeUInt16LE(0x5000, 8); // OpDmx
    this.packet.writeUInt16BE(14, 10);    // Protocol Version
    this.packet.writeUInt16LE(this.universe, 14);
    this.packet.writeUInt16BE(512, 16);   // Length

    this.setupMessageHandler();
  }

  private setupMessageHandler() {
    if (!parentPort) return;
    parentPort.on('message', (msg) => this.handleMessage(msg));
  }

  private handleMessage(msg: any) {
    switch (msg.type) {
      case 'START':
      case 'PLAY':
        this.play();
        break;
      case 'STOP':
        this.stop();
        break;
      case 'PAUSE':
        this.pause();
        break;
      case 'RESUME':
        this.play();
        break;
      case 'SET_SPEED':
        this.speedFactor = msg.speed;
        break;
      case 'SEEK_FRAME':
        this.seekFrame(msg.frame);
        break;
      case 'SEEK_TIME':
        this.seekTime(msg.timeMs);
        break;
      case 'GET_STATUS':
        this.sendStatus();
        break;
      case 'BLACKOUT':
        this.blackoutBurst();
        break;
      case 'BENCHMARK_DONE':
        parentPort?.postMessage({ type: 'BENCHMARK_DONE' });
        break;
    }
  }

  private play() {
    if (this.state === 'PLAYING') return;
    if (this.state === 'STOPPED') {
      this.showTimeMs = 0;
      this.currentFrameIdx = -1;
    }
    // When resuming from PAUSE, we keep showTimeMs as is
    this.state = 'PLAYING';
    this.lastRealTimeNs = process.hrtime.bigint();
    this.sendStateChange();
    this.tick(); // start loop
  }

  private pause() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.cancelSchedule();
    this.sendStateChange();
  }

  private stop() {
    this.state = 'STOPPED';
    this.cancelSchedule();
    this.blackoutBurst();
    this.sendStateChange();
  }

  private seekFrame(frameIdx: number) {
    if (frameIdx < 0) frameIdx = 0;
    if (frameIdx >= this.totalFrames) frameIdx = this.totalFrames - 1;
    this.showTimeMs = frameIdx * this.frameIntervalMs;
    this.currentFrameIdx = frameIdx - 1;
    if (this.state === 'PLAYING') {
      this.lastRealTimeNs = process.hrtime.bigint();
    }
  }

  private seekTime(timeMs: number) {
    if (timeMs < 0) timeMs = 0;
    this.showTimeMs = timeMs;
    this.currentFrameIdx = Math.floor(timeMs / this.frameIntervalMs) - 1;
    if (this.currentFrameIdx >= this.totalFrames) {
      this.currentFrameIdx = this.totalFrames - 1;
    }
    if (this.state === 'PLAYING') {
      this.lastRealTimeNs = process.hrtime.bigint();
    }
  }

  private sendFrame(idx: number) {
    // Copy DMX data for frame idx to packet
    const offset = idx * 516 + 4; // skip timestamp (frame start +4)
    const frameData = this.dmxView.subarray(offset, offset + 512);
    this.packet.set(frameData, 18);
    this.socket.send(this.packet, 6454, this.targetIp);

    if (this.benchmark) {
      parentPort?.postMessage({
        type: 'FRAME_SENT',
        timestamp: Date.now(),
        frame: idx,
      });
    }
  }

  private blackoutBurst() {
    const zeroPacket = Buffer.alloc(18 + 512, 0);
    zeroPacket.write('Art-Net\0', 0);
    zeroPacket.writeUInt16LE(0x5000, 8);
    zeroPacket.writeUInt16BE(14, 10);
    zeroPacket.writeUInt16LE(this.universe, 14);
    zeroPacket.writeUInt16BE(512, 16);
    for (let i = 0; i < 5; i++) {
      this.socket.send(zeroPacket, 6454, this.targetIp);
    }
  }

  private tick() {
    if (this.state !== 'PLAYING') return;

    const nowNs = process.hrtime.bigint();

    if (this.lastRealTimeNs === 0n) {
      this.lastRealTimeNs = nowNs;
    }

    const deltaNs = nowNs - this.lastRealTimeNs;
    this.lastRealTimeNs = nowNs;
    const deltaMs = Number(deltaNs) / 1e6;
    this.showTimeMs += deltaMs * this.speedFactor;

    // Send all frames up to current show time
    let nextIdx = Math.floor(this.showTimeMs / this.frameIntervalMs);
    if (nextIdx >= this.totalFrames) {
      this.stop();
      return;
    }

    while (nextIdx > this.currentFrameIdx) {
      this.currentFrameIdx++;
      this.sendFrame(this.currentFrameIdx);
    }

    this.sendStateChange();

    // Schedule next tick
    this.scheduleNext();
  }

  private scheduleNext() {
    if (this.state !== 'PLAYING') return;

    const nextFrameIdx = this.currentFrameIdx + 1;
    if (nextFrameIdx >= this.totalFrames) {
      this.stop();
      return;
    }

    const nextFrameShowTime = nextFrameIdx * this.frameIntervalMs;
    const remainingShowMs = nextFrameShowTime - this.showTimeMs;
    const remainingRealMs = remainingShowMs / this.speedFactor;

    if (remainingRealMs > 2) {
      const coarse = remainingRealMs - 1;
      this.scheduleHandle = setTimeout(() => {
        // busy-wait last ~1ms
        this.busyWait(1);
        this.tick();
      }, coarse);
    } else if (remainingRealMs > 0) {
      this.busyWaitAndTick(remainingRealMs);
    } else {
      // Behind, tick immediately
      this.tick();
    }
  }

  private busyWait(ms: number) {
    const target = process.hrtime.bigint() + BigInt(Math.round(ms * 1e6));
    while (process.hrtime.bigint() < target) {}
  }

  private busyWaitAndTick(ms: number) {
    this.busyWait(ms);
    this.tick();
  }

  private cancelSchedule() {
    if (this.scheduleHandle) {
      clearTimeout(this.scheduleHandle);
      this.scheduleHandle = null;
    }
  }

  private sendStateChange() {
    parentPort?.postMessage({
      type: 'STATE_CHANGE',
      state: this.state,
      currentFrame: this.currentFrameIdx,
      totalFrames: this.totalFrames,
    });
  }

  private sendStatus() {
    parentPort?.postMessage({
      type: 'STATUS',
      showTimeMs: this.showTimeMs,
      currentFrame: this.currentFrameIdx,
      totalFrames: this.totalFrames,
      state: this.state,
    });
  }
}

new SchedulerWorker(workerData as WorkerInit);
