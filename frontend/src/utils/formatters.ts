export function getSongBaseName(songFile: string): string {
  return songFile.replace(/\.(mp3|wav|ogg|flac)$/i, '');
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hundredths = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
}

export function formatMsValue(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return 'n/a';
  }

  return `${value.toFixed(1)} ms`;
}

export function formatReadyState(readyState: number): string {
  if (readyState === 1 /* WebSocket.OPEN */) return 'OPEN';
  if (readyState === 0 /* WebSocket.CONNECTING */) return 'CONNECTING';
  return 'CLOSED';
}
