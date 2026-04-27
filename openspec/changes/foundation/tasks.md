# Tasks: DMX Player Initialization

## Phase 1: Project Skeleton & Protocol
- [x] Create Monorepo directory structure (`/backend`, `/frontend`, `/shared`).
- [x] Set up `backend` Node.js/TypeScript project (`package.json`, `tsconfig.json`).
- [x] Set up `frontend` React/Vite project (`package.json`, `tsconfig.json`).
- [x] Set up WebSocket server with Typed Intent handling in the backend.
- [x] Define `Intent` interfaces and validation logic in `shared/types`.
- [x] Implement `DiscoveryService` for indexing songs in `/data/songs` and shows in `/data/shows`.
- [x] Implement state-aware Intent filtering (Operational Locking).
- [x] Configure `Dockerfile` and `docker-compose.yml` with `DMX_NODE_IP`, ArtNet routing variables, and monorepo build steps.

## Phase 2: DMX Engine (Backend)
- [x] Implement `ArtNetService` using raw dgram sockets for performance.
- [x] Implement `SharedArrayBuffer` preloading with 15-minute (45,000 frame) safety cap.
- [x] Implement Variable Speed Oscillator (VSO) for steering.
- [x] Build `HighResolutionScheduler` precise yield loop in Worker Thread.
- [x] **Spike**: Benchmark the scheduler jitter under 80% CPU load to verify <10ms tolerance.
- [x] Implement `DmxFileLoader` with binary validation and SAB allocation.
- [x] Create the "Steering" logic for smooth clock synchronization.
- [x] Implement Master Election logic in `SocketServer` (assign master on `PLAY`, transfer explicitly).
- [x] Enforce Master-only role for `SYNC` intents (reject `SYNC` from non-master sockets).

## Phase 3: Web UI (Frontend)
- [x] Build React/Vite scaffolding (if not fully completed in Phase 1).
- [x] Implement Web Audio API player with master clock output.
- [x] Implement **wavesurfer.js** audio player with master clock output.
- [x] Build WebSocket client with automatic reconnection, heartbeat (3Hz), and state sync.
- [x] Integrate `material-icons` package for UI iconography.
- [x] Implement Dark Mode theme: `#9000dd` accent, 0px border-radius, max 0.5em padding.
- [x] Create Asset Selection view using the manifest provided by `DiscoveryService`.
- [x] Create UI controls (Play/Pause/Seek/Load).
- [x] Update frontend to respect `status.isController` flag (Monitor Mode).
- [x] Disable steering `SYNC` emissions when operating in Monitor Mode.
- [x] Display current control status (Master vs Monitor) in the UI Event Log/Diagnostics panel.

## Phase 5: Verification & Smoke Test
- [x] Bring up the application stack using `docker-compose up --build`.
- [x] Open the frontend UI and verify the connection state is 'IDLE'.
- [x] Perform a smoke test: Load a show and song, trigger Play/Pause/Stop, and verify state changes.
- [x] Verify backend terminal logs indicate ArtNet scheduler execution and successful socket connection.

## Phase 4: Integration & Safety
- [x] Implement "Heartbeat" (1-second missing timeout) and connection monitoring fail-safes.
- [x] Build the "Blackout" safety mechanism (5 frames of zeros) for Disconnects and Stop events. 
- [x] Perform latency stress test (Measure UI-to-ArtNet delta).
- [x] Verify 50fps stability under CPU load.
