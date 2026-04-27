# Design: Fix Visual Regression Connectivity Issues

## Context

The light show player consists of a React frontend (Vite dev server) and Node.js backend (WebSocket + HTTP server) deployed via Docker Compose. The frontend attempts to connect to the backend via WebSocket for control intents and HTTP for static assets (songs), but connections fail in the browser despite successful builds and tests.

Current architecture:
- Frontend: Vite dev server on port 5173 (mapped to 3000)
- Backend: Node.js server on port 3001 with WebSocket upgrade handling
- Network: Docker Compose default network
- Assets: Songs served from `/data` volume via backend HTTP

## Goals / Non-Goals

**Goals:**
- Restore WebSocket connectivity between frontend and backend in browser
- Fix song loading from backend HTTP endpoints
- Ensure reliable connectivity when accessing UI via IP addresses or hostnames
- Maintain existing Docker Compose deployment workflow

**Non-Goals:**
- Change core DMX playback or ArtNet functionality
- Modify existing WebSocket protocol or intent handling
- Alter backend architecture or service boundaries

## Decisions

### 1. Add Vite Path Resolution for Shared Types
**Decision**: Add `resolve.alias` to `vite.config.ts` to properly resolve `shared/*` imports in the browser.

**Rationale**: 
- Frontend `useWebSocket.ts` imports `shared/types/intents` but Vite cannot resolve this path
- Without alias, browser fails to load the WebSocket hook, preventing connection attempts
- TypeScript config has the path mapping but Vite needs explicit alias configuration

**Alternatives Considered**:
- Move shared types into frontend src/ - violates monorepo structure
- Use relative imports - breaks when shared code moves
- Bundle shared types in build - unnecessary complexity

### 2. Implement Intelligent Backend URL Resolution  
**Decision**: Derive the WebSocket URL dynamically from the browser's current location (`window.location.hostname`) using the fixed backend port `3001`.

**Rationale**:
- The server is always running on `s2.local` (or a direct local IP), with the UI on port `3000` and the WebSocket server strictly on port `3001`.
- Relying on `VITE_BACKEND_URL=ws://localhost:3001` in Docker Compose causes the client to connect to their own machine's localhost.
- By building the URL using `ws://${window.location.hostname}:3001` (or `wss://` if on HTTPS), clients on the same network will dynamically resolve the correct server address regardless of whether they used the `s2.local` hostname or a raw IP.

**Alternatives Considered**:
- Hardcoding `ws://s2.local:3001` - could fail if a client device doesn't support mDNS/Bonjour and needs to connect via a raw IP.
- Reverse Proxy (mapping `/ws` to the backend) - violates the strict constraint that the WebSocket server must be accessed directly on port `3001`.
- Require manual configuration - poor user experience.

### 3. Add CORS and Protocol Validation
**Decision**: Ensure backend properly handles CORS headers and WebSocket protocol upgrades for all expected origins.

**Rationale**:
- Backend sets `Access-Control-Allow-Origin: *` but may need more specific handling
- WebSocket upgrade may fail if request headers don't match expectations
- Need to verify protocol compatibility between Vite dev server and Node.js WebSocket server

**Alternatives Considered**:
- Remove CORS headers - breaks legitimate cross-origin requests
- Use Vite proxy - adds complexity and may interfere with WebSocket

## Risks / Trade-offs

**Risk**: Dynamic URL resolution may fail in complex network setups
**Mitigation**: Provide fallback to configured URL with clear error messaging

**Risk**: Vite alias changes may affect hot module reloading
**Mitigation**: Test HMR functionality after changes

**Risk**: CORS wildcard may expose backend in production environments  
**Mitigation**: Document security considerations for production deployment

**Risk**: Changes may affect local development workflow
**Mitigation**: Test both Docker Compose and local development scenarios