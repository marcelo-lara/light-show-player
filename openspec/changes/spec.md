# Capability: DMX Playback

The DMX Playback capability provides synchronized, frame-accurate output of DMX data via the ArtNet protocol, driven by a remote master audio clock.

## Requirements

### Functional
- **ArtNet Output**: Support for sending DMX universes at a constant 50fps (20ms interval).
- **Remote Control**: Start, Stop, Pause, and Seek operations via WebSocket "Intents".
- **Audio Sync**: Maintain frame alignment with a Web Audio API-based clock in a browser.
- **Show Loading**: Efficiently load and parse binary DMX show files.
- **Asset Management**: Automatic indexing of audio in `/data/songs` and associated shows in `/data/shows`.
- **Naming Convention**: DMX files must follow the pattern `/data/shows/{song_name}.{show_name}.dmx`.
- **Operational Locking**: Strictly restrict available commands to `PAUSE` and `STOP` while a show is in the 'Playing' state. `LOAD` must be locked out to prevent accidental drops.
- **Network Resilience**: UI sends a continuous `HEARTBEAT` stream to monitor connection health.

### Quality Attributes (Production Grade)
- **Jitter Ceiling**: Maximum allowable jitter per frame is **10ms**. Target average jitter is < 2ms.
- **Clock Steering**: Phase-adjustment must be linear; playback speed adjustments cannot exceed ±1% to prevent visible stutter. UI sends Sync intents at 1-second intervals.
- **Memory Efficiency**: Zero-copy DMX frame passing between File Loader and Scheduler via Shared Memory.
- **Fail-safe**: Guaranteed "Blackout Burst" (5 consecutive zero-frames) followed by silence within **1.0 second** of stop or connection failure.
- **Capacity**: Optimized for 1 universe (512 channels) at 50fps with full show pre-loading (max duration: 15 minutes).
- **Visual Identity**: High-contrast **Dark Mode** UI with `#9000dd` as the primary accent color.
- **Design Language**: Hard edges only (border-radius: 0) and high-density spacing (max 0.5em padding).
- **Environment**: Docker-only development and publishing workflow.
- **Storage**: Persistent volume mounted at `/data` for songs and DMX files.
- **Network**: Public exposure of port 3000 for local network UI access.

## Constraints
- Communication must be strictly asynchronous via WebSockets.
- The backend must not rely on local system time as the master source; it must be a follower of the UI time.

## Success Criteria
- ArtNet output verified at 50Hz via network packet analysis.
- Audio/Visual sync perceived as "instant" (drift < 40ms) over a 30-minute show.
- Fail-safe activates properly on network disconnection or explicit stop commands within 1s.
