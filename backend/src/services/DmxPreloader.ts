export class DmxPreloader {
  private buffer: SharedArrayBuffer;

  constructor(buffer: SharedArrayBuffer) {
    this.buffer = buffer;
  }

  /**
   * Returns the SharedArrayBuffer to be passed to the Worker Thread
   */
  public getBuffer(): SharedArrayBuffer {
    return this.buffer;
  }

  /**
   * Reset all channels to 0 (Blackout)
   */
  public clear() {
    const view = new Uint8Array(this.buffer);
    view.fill(0);
  }

  /**
   * Get total frame count based on buffer size (each frame = 516 bytes)
   */
  public getFrameCount(): number {
    return this.buffer.byteLength / 516;
  }

  /**
   * Get current value of a specific channel (DEBUG)
   */
  public getChannel(frameIndex: number, channelIndex: number): number {
    const frameOffset = frameIndex * 516 + 4; // skip timestamp
    const view = new Uint8Array(this.buffer);
    return view[frameOffset + channelIndex];
  }
}
