import dgram from 'dgram';

export class ArtNetService {
  private socket: dgram.Socket;
  private targetIp: string;
  private port = 6454;

  constructor(targetIp: string) {
    this.targetIp = targetIp;
    this.socket = dgram.createSocket('udp4');
  }

  public sendUniverse(universe: number, data: Uint8Array) {
    const packet = this.createPacket(universe, data);
    this.socket.send(packet, this.port, this.targetIp);
  }

  private createPacket(universe: number, data: Uint8Array): Buffer {
    const buffer = Buffer.alloc(18 + 512, 0);
    // Art-Net ID
    buffer.write('Art-Net\0', 0);
    // OpDmx
    buffer.writeUInt16LE(0x5000, 8);
    // Version 14
    buffer.writeUInt16BE(14, 10);
    // Sequence 0
    buffer.writeUInt8(0, 12);
    // Physical 0
    buffer.writeUInt8(0, 13);
    // Universe
    buffer.writeUInt16LE(universe, 14);
    // Length 512
    buffer.writeUInt16BE(512, 16);
    // Data
    Buffer.from(data).copy(buffer, 18);
    return buffer;
  }

  public blackout(universe: number) {
    this.sendUniverse(universe, new Uint8Array(512).fill(0));
  }

  public close() {
    this.socket.close();
  }
}
