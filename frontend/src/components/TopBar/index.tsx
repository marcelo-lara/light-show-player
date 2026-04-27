import { Box } from '@mui/material';
import { Selectors } from './Selectors';
import { StatusGrid } from './StatusGrid';

export function TopBar() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'primary.main', p: 1 }}>
      <Selectors />
      <StatusGrid />
    </Box>
  );
}
