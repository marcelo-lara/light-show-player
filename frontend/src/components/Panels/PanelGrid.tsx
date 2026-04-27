
import { Grid } from '@mui/material';
import { DmxMonitorPanel } from './DmxMonitorPanel';
import { EventLogPanel } from './EventLogPanel';
import { DiagnosticsPanel } from './DiagnosticsPanel';

export function PanelGrid() {
  return (
    <Grid container sx={{ p: 1, flexGrow: 1, minHeight: 0 }} spacing={1}>
      <Grid size={4} sx={{ display: 'flex', flexDirection: 'column' }}>
        <DmxMonitorPanel />
      </Grid>
      <Grid size={4} sx={{ display: 'flex', flexDirection: 'column' }}>
        <EventLogPanel />
      </Grid>
      <Grid size={4} sx={{ display: 'flex', flexDirection: 'column' }}>
        <DiagnosticsPanel />
      </Grid>
    </Grid>
  );
}
