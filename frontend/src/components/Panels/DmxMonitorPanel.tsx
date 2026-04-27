
import { Box, Typography } from '@mui/material';

export function DmxMonitorPanel() {
  return (
    <Box sx={{ bgcolor: 'background.paper', flexGrow: 1, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography color="text.secondary" variant="body2">DMX Monitor</Typography>
    </Box>
  );
}
