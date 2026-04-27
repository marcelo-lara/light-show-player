# Tasks: Fix Visual Regression Connectivity Issues

## 1. Frontend Configuration Fixes

- [ ] 1.1 Add resolve.alias to vite.config.ts for shared types path resolution
- [ ] 1.2 Implement intelligent backend URL resolution in App.tsx to handle IP vs localhost access
- [ ] 1.3 Test frontend builds successfully with path aliases

## 2. Backend Connectivity Validation

- [ ] 2.1 Verify WebSocket upgrade handling and CORS headers in backend
- [ ] 2.2 Add logging to backend for connection attempts and failures
- [ ] 2.3 Test backend HTTP endpoints respond correctly for song assets

## 3. Integration Testing

- [ ] 3.1 Test WebSocket connection establishes from browser to backend
- [ ] 3.2 Test song loading works from backend HTTP endpoints
- [ ] 3.3 Test full application functionality in Docker Compose environment
- [ ] 3.4 Verify connectivity works when accessing UI via IP address instead of localhost