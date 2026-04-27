## 1. Global Layout & Styling

- [ ] 1.1 Convert top-level `<Box>` in `App.tsx` to `minHeight: '100vh'`, `display: 'flex'`, `flexDirection: 'column'` to command vertical height without native browser scrolling.
- [ ] 1.2 Apply `flexGrow: 1` and `minHeight: 0` to the bottom 3-column `<Grid>` grouping, and enforce `overflowY: 'auto'` with Custom Scrollbars per column.
- [ ] 1.3 Remove external borders on all column containers and the main wave timeline container to implement the borderless design.

## 2. Top-Row Action and Telemetry Refinements

- [ ] 2.1 Remove borders and background formatting from the Top-Left "Song" and "Show" Selection Dropdowns, ensuring simple, matching icon-color text.
- [ ] 2.2 Refactor the Top-Right Server dashboard to eliminate verbose labels, condensing elements down to three highly visual, compact chips.
- [ ] 2.3 Rebuild Server Chip into a static text "SERVER" box featuring Green/Yellow/Red background color interpolation triggered dynamically by `WebSocket` availability state.
- [ ] 2.4 Create a 4em width "Drift Gauge" centered `<Box>` utilizing clamped (-/+ 100ms) coordinates to drive a red tracking line, while rendering numeric `<Typography>` dead center.
- [ ] 2.5 Condense the application status tracking Chip to illuminate green only when the internal state is exactly "READY" or "PLAYING" leaving other conditions gray. Replace the "LOADED" text with "READY".

## 3. Media Timeline & Transport Iconography

- [ ] 3.1 Create global CSS rules or nested `sx` overrides to force WaveSurfer's native scrollbar generation into 0.5em width dimensions sporting a black track and gray thumb.
- [ ] 3.2 Eliminate text annotations embedded physically on button components (Load, Play, Stop).
- [ ] 3.3 Combine the explicit "Play" and "Pause" UI nodes into a single, overriding dynamic toggle icon driven by the active `state` condition.
- [ ] 3.4 Scale the `<PlayArrowIcon />` and `<PauseIcon />` toggle button 0.25em larger than sibling `<Load>` or `<Stop>` interactive surfaces.

## 4. Visual Validation

- [ ] 4.1 Ensure the application is running via Docker Compose, connect the integrated browser to the exposed frontend service (e.g., http://localhost:5173), and use vision/screenshot capabilities to visually verify the new layout specs.
