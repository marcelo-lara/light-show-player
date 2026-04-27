# Proposal: Initialize DMX Player Foundation

## Problem
The existing AI Light Show ecosystem requires a dedicated playback engine that can bridge the gap between browser-based audio playback and network-based DMX hardware with professional-grade timing and synchronization.

## Solution
Implement a Node.js/TypeScript backend service using a High-Resolution Timer (HRT) for ArtNet scheduling, controlled by a React-based Web UI. The system will use a "Buffered-Follower" architecture where the UI sends periodic clock updates, and the backend steers its playback speed to match.

## Scope

### In-Scope
- Core WebSocket Intent Protocol definition.
- ArtNet Scheduler (50fps) with drift compensation.
- Web UI with Audio Player and Show Controls.
- Binary DMX file loader.

### Out-of-Scope
- DMX Sequence editing/creation (Playback only).
- RDM (Remote Device Management) support.
- Multi-client sync (Single UI master only).

## Risks & Mitigations
- **Node.js Event Loop Jitter**: Mitigated by using Worker Threads for the DMX scheduler.
- **Network Latency**: Mitigated by a 500ms look-ahead buffer on the backend.
- **Clock Drift**: Mitigated by a Linear Steering algorithm for phase-adjustment.