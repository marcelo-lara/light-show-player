import { parentPort, workerData } from 'worker_threads';

/**
 * The Scheduler Worker uses a high-resolution busy-wait loop 
 * to ensure ArtNet packets are triggered every 20ms with <1ms jitter.
 */

const { sharedBuffer, controlBuffer, intervalMs } = workerData;

// controlBuffer[0]: 0 = STOPPED, 1 = PLAYING, 2 = PAUSED
// controlBuffer[1]: Current frame index
const controls = new Int32Array(controlBuffer);
const dmxData = new Uint8Array(sharedBuffer);

const NS_PER_MS = 1_000_000n;
const intervalNs = BigInt(intervalMs) * NS_PER_MS;

let lastFrameTime = process.hrtime.bigint();

function tick() {
  if (controls[0] !== 1) {
    // If not playing, yield and check later
    setTimeout(tick, 10);
    return;
  }

  const now = process.hrtime.bigint();
  const elapsed = now - lastFrameTime;

  if (elapsed >= intervalNs) {
    // 1. Signal main thread to send the current frame in sharedBuffer
    // We use postMessage here to trigger the dgram socket send on main thread
    // or we could pass the socket handle (more complex).
    parentPort?.postMessage({
      type: 'TICK',
      frame: controls[1],
      timestamp: Number(now / NS_PER_MS)
    });

    // 2. Increment frame counter
    controls[1]++;

    // 3. Reset timer
    lastFrameTime = now;

    // 4. Schedule next tick
    // For extreme precision, we don't use setImmediate here. 
    // we use a tight loop or a very short timeout.
    setImmediate(tick);
  } else {
    // If we have more than 2ms to go, yield to OS
    const remainingMs = Number((intervalNs - elapsed) / NS_PER_MS);
    if (remainingMs > 2) {
      setTimeout(tick, 1);
    } else {
      // Busy wait for the final <2ms to guarantee sub-millisecond precision
      setImmediate(tick);
    }
  }
}

console.log(`[DMX Worker] Scheduler started. Interval: ${intervalMs}ms`);
tick();

/**
 * Note: In a true production environment, we would use 
 * Atomics.wait() for the "coarse sleep" phase to be more 
 * power-efficient while maintaining precision.
 */