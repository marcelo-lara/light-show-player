# light-show-player
DMX player module to the [AI Light Show](https://github.com/marcelo-lara/ai-light-show-v2)

A dedicated playback engine bridging browser-based audio playback with network-based DMX hardware using professional-grade timing and synchronization.

## Architecture: The "Buffered-Follower"

- **Web UI (Master Clock):** A React/Vite browser application loads the mp3 and directs the show. It sends playback `Intents` via WebSocket, broadcasting exact `SYNC` timecodes every 1 second and a `HEARTBEAT` every 333ms.
- **Backend Service (Follower):** A Node.js backend receives commands, pre-loads the binary `.dmx` files into a `SharedArrayBuffer`, and spins up a dedicated Worker Thread. 
- **ArtNet Scheduler:** The worker uses `process.hrtime.bigint()` to dispatch UDP ArtNet packets efficiently at a rigid 50fps (20ms intervals) eliminating main-event-loop jitter.
- **Clock Steering:** Instead of hard-setting the playhead on syncs (causing visual glitches), the backend uses a Variable Speed Oscillator to linearly speed up or slow down (up to ±1%) to smoothly chase the master audio clock.
- **Strict Safety:** Built for robust professional use. Strict operational locking prevents loading/dropping shows while playing. If a WebSocket disconnects (missing 3 heartbeats / 1 second), it immediately broadcasts a 5-frame Blackout burst to zero-out fixtures.

## Features

### Feature 1: Web UI
- Base Web Application and Dark-mode UI (Hard edges, `#9000dd` accent)
- Song & Show Discovery loader
- Audio Player with `wavesurfer.js` waveform visualization
- WebSocket client with automatic reconnection and 3Hz heartbeat
- Master Show Controls (Play, Pause, Seek, Stop/Blackout)

### Feature 2: DMX Player Service
- DMX/ArtNet fast UDP transmitter
- `SharedArrayBuffer` memory mapping for up to 15-minute zero-copy show loading
- Precise 'Yield-Loop' High-Resolution Scheduler in a Worker Thread
- Continuous drift compensation steering
- State manager enforcing safe play/pause/load transitions

## Development
This module is strictly developed and deployed via Docker to ensure network and timing consistency across environments.
