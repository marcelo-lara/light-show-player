# Tasks: DMX Player Initialization

## Phase 1: Project Skeleton & Protocol
- [x] Create Monorepo directory structure (`/backend`, `/frontend`, `/shared`).
- [ ] Set up `backend` Node.js/TypeScript project (`package.json`, `tsconfig.json`).
- [ ] Set up `frontend` React/Vite project (`package.json`, `tsconfig.json`).
- [ ] Set up WebSocket server with Typed Intent handling in the backend.
- [x] Define `Intent` interfaces and validation logic in `shared/types`.
- [x] Implement `DiscoveryService` for indexing songs in `/data/songs` and shows in `/data/shows`.
- [ ] Implement state-aware Intent filtering (Operational Locking).
- [ ] Configure `Dockerfile` and `docker-compose.yml` with `DMX_NODE_IP`, ArtNet routing variables, and monorepo build steps.

## Phase 2: DMX Engine (Backend)
- [ ] Implement `ArtNetService` using raw dgram sockets for performance.
- [ ] Implement `SharedArrayBuffer` preloading with 15-minute (45,000 frame) safety cap.
- [ ] Implement Variable Speed Oscillator (VSO) for steering.
- [ ] Build `HighResolutionScheduler` precise yield loop in Worker Thread.
- [ ] **Spike**: Benchmark the scheduler jitter under 80% CPU load to verify <10ms tolerance.
- [ ] Implement `DmxFileLoader` with binary validation and SAB allocation.
- [ ] Create the "Steering" logic for smooth clock synchronization.

## Phase 3: Web UI (Frontend)
- [ ] Build React/Vite scaffolding (if not fully completed in Phase 1).
- [ ] Implement Web Audio API player with master clock output.
- [ ] Implement **wavesurfer.js** audio player with master clock output.
- [ ] Build WebSocket client with automatic reconnection, heartbeat (3Hz), and state sync.
- [ ] Integrate `material-icons` package for UI iconography.
- [ ] Implement Dark Mode theme: `#9000dd` accent, 0px border-radius, max 0.5em padding.
- [ ] Create Asset Selection view using the manifest provided by `DiscoveryService`.
- [ ] Create UI controls (Play/Pause/Seek/Load).

## Phase 4: Integration & Safety
- [ ] Implement "Heartbeat" (1-second missing timeout) and connection monitoring fail-safes.
- [ ] Build the "Blackout" safety mechanism (5 frames of zeros) for Disconnects and Stop events. 
- [ ] Perform latency stress test (Measure UI-to-ArtNet delta).
- [ ] Verify 50fps stability under CPU load.
