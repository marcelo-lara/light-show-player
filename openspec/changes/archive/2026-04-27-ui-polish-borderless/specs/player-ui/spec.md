## ADDED Requirements

### Requirement: Borderless Aesthetic
The system SHALL display all main layout components, such as panels, grids, lists, and waveform players, without visible CSS borders, preferring whitespace as partition. Dropdowns MUST not highlight with background colors unless actively focused or hovered. 

#### Scenario: Verify Borderless View
- **WHEN** the browser renders the main dashboard
- **THEN** the main layout components display no active CSS borders

### Requirement: Naked Dropdowns Selection
The Song and Show selection dropdowns SHALL present themselves inline with the header background color without prominent border strokes. Dropdown chevrons MUST match the text color.

#### Scenario: Naked Selection Rendering
- **WHEN** viewing the top-row controls
- **THEN** the dropdown menus display transparently with matching chevrons

### Requirement: Telemetry Dashboard Highlighting
The system SHALL aggregate playback server data in the top right corner. The dashboard MUST show a Server Chip that colors GREEN/YELLOW/RED according to WebSocket connection state, a continuous -/+ Drift Gauge spanning a 4em width with dynamic centering, and a State Chip detailing READY/PLAYING playback conditions. The State Chip MUST be green exclusively when READY or PLAYING.

#### Scenario: Server Telemetry Dash Update
- **WHEN** the backend state is modified
- **THEN** the top-right Server, Live Drift, and State chips reflect accurate backend colors without redundant text labels

### Requirement: Condensed Media Transport Control
The UI SHALL display media playback operations using iconographic action triggers instead of textual buttons. The 'Play' and 'Pause' operations MUST be presented on a single, shared toggle button, styled to be visually distinct (+0.25em larger scale) from secondary actions like Load and Stop.

#### Scenario: Verify Transport Layout
- **WHEN** the transport bar is rendered
- **THEN** the Play button appears as an icon 0.25em larger than Load and Stop

### Requirement: Fluid Scroll Dash Layout
The diagnostic logs, DMX states, and connection dashboards SHALL be arranged in a three-column alignment that seamlessly fills the total available vertical height beneath the media timeline. Each content column MUST encapsulate its own vertical overflow using a custom scrollbar visualization.

#### Scenario: Verify Column Expand height
- **WHEN** there is extra space beneath the WaveSurfer
- **THEN** the three logs stretch and apply auto-hiding scrollbars based on data saturation

### Requirement: WaveSurfer Scrubber Interface
The media timeline container SHALL feature a custom dark scrollbar with a base height of 0.5em. The scroll track MUST be styled as solid black and the accompanying scrubbing thumb MUST be colored gray, maintaining native audio workstation paradigms.

#### Scenario: Verify Timeline Scroll UI
- **WHEN** the browser displays the WaveSurfer audio
- **THEN** the horizontal scrollbar track is #000 (black) and thumb is gray, sized at 0.5em
