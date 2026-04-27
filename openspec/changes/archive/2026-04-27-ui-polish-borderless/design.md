## Context

The current LightShow player dashboard functions accurately but suffers from a prototypical web feel. Borders around grid columns and elements, standard web scrollbars, and labeled buttons detract from the "industrial" dashboard vibe required by lighting operations interfaces. This design standardizes the application into a borderless, full-screen flex layout focused entirely on data visualization and minimal control interactions.

## Goals / Non-Goals

**Goals:**
- Apply a borderless, dark-theme first design language.
- Provide a clear, color-coded telemetry dashboard using MUI Chips and dynamic custom bars.
- Refactor the WaveSurfer layout to employ custom CSS scrollbars.
- Transition transport control to toggle-based icons.
- Ensure the application behaves like a standalone, vertical-locking dashboard where components scroll their internal overflow instead of causing browser-level page scrolling.

**Non-Goals:**
- Modification of backend DMX output logic.
- Adding new audio rendering features to WaveSurfer.
- Complex theming / skinning architectures (just adapting the existing fixed layout).

## Decisions

- **Full-Screen Strict Layout:** By restructuring the main `<Box>` into a `flexDirection: column` with `height: 100vh`, and forcing the secondary `Grid` row to employ `flexGrow: 1` and `minHeight: 0`, the browser's native scrollbar will be hidden. Individual columns inside the grid will be forced to specify `overflowY: 'auto'`.
- **Custom Drift Gauge:** Instead of complicated canvas or SVG drawing, the Live Drift visualization will be rendered using nested `<Box>` tags. A `4em` centered relative container will hold a `2px` absolute red bar that shifts left or right computationally based on `liveDriftMs` mapped to coordinate transforms or padding values. White text will sit absolutely positioned over it to ensure contrast.
- **Toggle Transport Buttons:** The Transport button group will conditionally swap between `<PlayArrowIcon />` and `<PauseIcon />` relying strictly on the `status.state === 'PLAYING'` flag, drastically decreasing horizontal sprawl.
- **WaveSurfer Custom Theming:** Using MUI's `sx` propagation or generic `.css` injection, CSS selectors like `::-webkit-scrollbar` will be applied globally or specifically targeted to the WaveSurfer DOM references to implement the custom black track and gray thumb at exactly `0.5em` styling.

## Risks / Trade-offs

- **Flexbox Overflow Challenges:** Heavy nested flexboxes sometimes struggle with inner scrollability if `minHeight: 0` is omitted on intermediate columns; styling regressions are possible.
- **Gauge Interpolation:** The Drift Gauge will need a ceiling/floor value (e.g. ±100ms max deviation) to clamp the red line within the 4em domain to prevent layout breakout.
