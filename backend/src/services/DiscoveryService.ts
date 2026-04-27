import fs from 'fs/promises';
import path from 'path';

export interface AssetManifest {
  songs: string[];
  shows: Record<string, string[]>; // Map song names to their available .dmx shows
}

export class DiscoveryService {
  private readonly songsPath = '/data/songs';
  private readonly showsPath = '/data/shows';

  public async getManifest(): Promise<AssetManifest> {
    const manifest: AssetManifest = {
      songs: [],
      shows: {}
    };

    try {
      // 1. Index Songs
      const songFiles = await fs.readdir(this.songsPath);
      manifest.songs = songFiles.filter(f => /\.(mp3|wav|ogg|flac)$/i.test(f));

      // 2. Index Shows
      const showFiles = await fs.readdir(this.showsPath);
      for (const file of showFiles) {
        if (file.endsWith('.dmx')) {
          // Expected format: {song_name}.{show_name}.dmx
          const parts = file.split('.');
          if (parts.length >= 3) {
            // The song name is everything before the last two segments (.show_name.dmx)
            const showName = parts[parts.length - 2];
            const songBaseName = parts.slice(0, -2).join('.');
            
            if (!manifest.shows[songBaseName]) {
              manifest.shows[songBaseName] = [];
            }
            manifest.shows[songBaseName].push(showName);
          }
        }
      }
    } catch (error) {
      console.error('[DiscoveryService] Error indexing assets:', error);
    }

    return manifest;
  }
}