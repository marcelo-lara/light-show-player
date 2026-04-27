## Why

The current LightShow Player UI is functional but lacks the visual refinement and layout clarity of professional audio/lighting playback software. By stripping away unnecessary borders, restructuring the top telemetry bar for at-a-glance status, merging Play/Pause controls, and adopting a true full-screen dashboard layout with independent scrolling columns, the application will feel significantly more polished, modern, and bespoke to its purpose as a live show controller. 

## What Changes

- **Global Design:** Adopt a "borderless" default aesthetic across all components.
- **Top Row (Left):** Convert Song and Show selection dropdowns to "naked" styles (no borders, no backgrounds, matching chevron).
- **Top Row (Right):** Overhaul the telemetry dashboard to use minimalist, color-coded indicators:
  - `SERVER` chip (Green/Yellow/Red traffic light based on WebSocket state).
  - Live Drift 4em continuous gauge (2px red bar originating from center `0` with overlaid ms text).
  - State chip (Green for `READY`/`PLAYING`, Gray for `IDLE`/other).
- **Waveform Area:** Remove the overall container border and implement a custom 0.5em scrollbar (black track, gray thumb) for the wavesurfer.
- **Playback Controls:** Switch to an icon-only transport. Combine Play and Pause into a single toggle button that is 0.25em larger than Load and Stop.
- **Bottom Layout (3 Columns):** Remove column borders and allow them to expand to fill all remaining vertical screen height. Each column will handle its own auto-hiding vertical overflow scrollbar.

## Capabilities

### New Capabilities
- `player-ui`: The core visual layout and interactive style guidelines for the LightShow Player dashboard.

### Modified Capabilities
None - No core backend functional requirements are changing.

## Impact

- `frontend/src/App.tsx`: Layout restructuring and MUI styling applying `sx` prop updates.
- `frontend/src/theme.ts` or `index.css`: Global scrollbar styles and potential overrides.
