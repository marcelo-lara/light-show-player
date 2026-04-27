import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import { DmxFileLoader } from './services/DmxFileLoader.js';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runBenchmark() {
  // Load a DMX file
  const dmxPath = path.resolve(__dirname, '../../data/shows/Cinderella - Ella Lee.show_20260427.dmx');
  const buffer = await fs.readFile(dmxPath);
  const sab = new SharedArrayBuffer(buffer.length);
  new Uint8Array(sab).set(new Uint8Array(buffer));

  const frameRate = 50; // Assume 50fps
  const totalFrames = DmxFileLoader.getFrameCount(sab);
  const targetIp = '127.0.0.1'; // Dummy for benchmark
  const universe = 0;

  const workerPath = path.resolve(__dirname, '../dist/backend/src/services/scheduler.worker.js');

  const worker = new Worker(workerPath, {
    workerData: {
      buffer: sab,
      targetIp,
      universe,
      frameRate,
      totalFrames,
      benchmark: true, // Add benchmark mode
    },
  });

  const timings: number[] = [];

  worker.on('message', (msg) => {
    if (msg.type === 'FRAME_SENT') {
      timings.push(msg.timestamp);
    }
    if (msg.type === 'BENCHMARK_DONE') {
      analyzeTimings(timings);
      worker.terminate();
    }
  });

  // Start CPU stress
  startCpuStress();

  // Start scheduler
  worker.postMessage({ type: 'PLAY' });

  // Run for 10 seconds
  setTimeout(() => {
    worker.postMessage({ type: 'STOP' });
    stopCpuStress();
    setTimeout(() => {
      worker.postMessage({ type: 'BENCHMARK_DONE' });
    }, 1000);
  }, 10000);
}

function startCpuStress() {
  // Start multiple CPU stress workers
  for (let i = 0; i < 4; i++) {
    const stressWorker = new Worker(path.resolve(__dirname, 'cpu-stress.js'));
  }
}

function stopCpuStress() {
  // Terminate after benchmark
}

function analyzeTimings(timings: number[]) {
  if (timings.length < 2) return;

  const intervals = [];
  for (let i = 1; i < timings.length; i++) {
    intervals.push(timings[i] - timings[i-1]);
  }

  const avg = intervals.reduce((a,b) => a+b, 0) / intervals.length;
  const variance = intervals.reduce((a,b) => a + (b - avg)**2, 0) / intervals.length;
  const stdDev = Math.sqrt(variance);
  const maxJitter = Math.max(...intervals.map(i => Math.abs(i - 20))); // 20ms for 50fps

  console.log(`Average interval: ${avg.toFixed(2)}ms`);
  console.log(`Std Dev: ${stdDev.toFixed(2)}ms`);
  console.log(`Max jitter: ${maxJitter.toFixed(2)}ms`);

  if (maxJitter < 10) {
    console.log('PASS: Jitter < 10ms');
  } else {
    console.log('FAIL: Jitter >= 10ms');
  }
}

runBenchmark().catch(console.error);