# Proposal: Fix Visual Regression Issues

## Why

The light show player application builds successfully and tests pass, but the browser UI fails to load songs and reports WebSocket connection as 'closed'. This indicates a connectivity regression between the frontend and backend components, preventing the application from functioning in the browser despite being deployable.

## What Changes

- Fix WebSocket connection issues preventing frontend-backend communication
- Resolve song loading failures from backend HTTP endpoints  
- Ensure browser can access backend services when deployed via Docker Compose
- Maintain existing functionality while restoring connectivity

## Capabilities

### New Capabilities

### Modified Capabilities

## Impact

- Frontend WebSocket client connectivity
- Backend HTTP static file serving for songs
- Docker Compose network configuration between frontend and backend containers
- No changes to core DMX playback or ArtNet functionality