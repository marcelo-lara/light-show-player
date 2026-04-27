import fs from 'fs/promises';
import path from 'path';

export interface DmxFrame {
  timestampMs: number; // Timestamp in milliseconds from show start
  data: Uint8Array;    // 512 bytes of DMX channel data
}

/**
 * DMX Binary File Format (.dmx)
 *
 * Global Header (32 bytes):
 *  0-3:   Magic "DMXP" (0x44 0x4d 0x58 0x50)
 *  4-5:   Version (uint16 LE, =1)
 *  6-7:   Universe Count (uint16 LE, =1)
 *  8-11:  Total Frames (uint32 LE)
 *  12-15: Frame Rate (uint32 LE, e.g., 50 or 60)
 *  16-31: Reserved (padding)
 *
 * Frame Records (each 516 bytes):
 *  0-3:   Timestamp milliseconds from show start (uint32 LE)
 *  4-515: 512 bytes of DMX channel data (uint8[512])
 */
export class DmxFileLoader {
  private static readonly DMX_MAGIC = 'DMXP';
  private static readonly DMX_CHANNELS = 512;
  private static readonly HEADER_SIZE = 32;
  private static readonly FRAME_SIZE = 4 + DmxFileLoader.DMX_CHANNELS; // 516 bytes

   /**
    * Validates DMX binary file header
    */
   private async validateHeader(buffer: ArrayBuffer): Promise<{ frameCount: number; frameRate: number }> {
    if (buffer.byteLength < DmxFileLoader.HEADER_SIZE) {
      throw new Error('DMX file too small to contain header');
    }

    const view = new DataView(buffer);
    const magic = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );

    if (magic !== DmxFileLoader.DMX_MAGIC) {
      throw new Error(`Invalid DMX file: bad magic "${magic}", expected "DMXP"`);
    }

    const version = view.getUint16(4, true);
    if (version !== 1) {
      throw new Error(`Unsupported DMX version: ${version}`);
    }

    const universeCount = view.getUint16(6, true);
    if (universeCount !== 1) {
      throw new Error(`Only single-universe files supported, got: ${universeCount}`);
    }

    const frameCount = view.getUint32(8, true);
    const frameRate = view.getUint32(12, true);

    const expectedSize = DmxFileLoader.HEADER_SIZE + (frameCount * DmxFileLoader.FRAME_SIZE);
    if (buffer.byteLength !== expectedSize) {
      throw new Error(`DMX file size mismatch: expected ${expectedSize} bytes, got ${buffer.byteLength}`);
    }

    return { frameCount, frameRate };
  }

   /**
    * Loads a binary .dmx file and converts to SharedArrayBuffer for zero-copy worker access
    * The returned buffer contains frameCount * 516 bytes: [timestamp:uint32][dmxdata:512]
    */
   public async loadFile(filePath: string): Promise<{ buffer: SharedArrayBuffer; frameRate: number }> {
     const rawBuffer = await fs.readFile(filePath);
     const { frameCount, frameRate } = await this.validateHeader(rawBuffer.buffer);

     console.log(`[DmxFileLoader] Loading ${frameCount} frames @ ${frameRate}fps from ${path.basename(filePath)}`);

     // Allocate SharedArrayBuffer: frameCount * (timestamp + 512 channels)
     const sab = new SharedArrayBuffer(frameCount * DmxFileLoader.FRAME_SIZE);

     // Memory Limit: Shows are capped at 15 minutes (45,000 frames @ 50fps).
     const maxFrames = 45000;
     if (frameCount > maxFrames) {
       throw new Error(`DMX file exceeds maximum allowed frames: ${frameCount} > ${maxFrames}`);
     }

     const sabView = new Uint8Array(sab);

     // Copy raw frame data directly (skip 32-byte header)
     const frameDataOffset = DmxFileLoader.HEADER_SIZE;
     const frameDataSize = frameCount * DmxFileLoader.FRAME_SIZE;

     // Verify we're not overrunning
     if (rawBuffer.byteLength < frameDataOffset + frameDataSize) {
       throw new Error('DMX file truncated: not enough frame data');
     }

     sabView.set(
       new Uint8Array(rawBuffer.buffer, frameDataOffset, frameDataSize)
     );

     return { buffer: sab, frameRate };
   }

  /**
   * Get total number of frames from a loaded buffer
   */
  public static getFrameCount(buffer: SharedArrayBuffer): number {
    return buffer.byteLength / DmxFileLoader.FRAME_SIZE;
  }

  /**
   * Get frame data at index (returns timestampMs and Uint8Array view of 512 channels)
   */
  public static getFrame(buffer: SharedArrayBuffer, index: number): { timestampMs: number; data: Uint8Array } {
    const frameSize = DmxFileLoader.FRAME_SIZE;
    const view = new DataView(buffer);
    const timestampMs = view.getUint32(index * frameSize, true); // LE
    const data = new Uint8Array(buffer, index * frameSize + 4, DmxFileLoader.DMX_CHANNELS);
    return { timestampMs, data };
  }
}
