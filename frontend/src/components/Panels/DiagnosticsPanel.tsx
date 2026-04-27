
import { Box, Typography } from '@mui/material';
import { usePlayerContext } from '../../contexts/PlayerContext';
import { formatTime, formatMsValue } from '../../utils/formatters';

export function DiagnosticsPanel() {
  const { currentTime, status, liveDriftMs, startupOffsetMs } = usePlayerContext();

  return (
    <Box sx={{ bgcolor: 'background.paper', flexGrow: 1, overflowY: 'auto', p: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.5 }}>
      <Typography color="text.secondary" variant="body2">Diagnostics</Typography>
      <Typography variant="caption" color="text.secondary">Frontend: {formatTime(currentTime)}</Typography>
      <Typography variant="caption" color="text.secondary">Backend: {formatTime((status?.backendTimeMs ?? 0) / 1000)}</Typography>
      <Typography variant="caption" color="text.secondary">Live Drift: {formatMsValue(liveDriftMs)}</Typography>
      <Typography variant="caption" color="text.secondary">Startup Offset: {formatMsValue(startupOffsetMs)}</Typography>
      <Typography variant="caption" color="text.secondary">Backend Start Lag: {formatMsValue(status?.backendStartLagMs ?? null)}</Typography>
      <Typography variant="caption" color="text.secondary">Speed: {status ? status.speedFactor.toFixed(4) : 'n/a'}</Typography>
      <Typography variant="caption" color="text.secondary">Controller: {status?.isController ? 'yes' : 'no'}</Typography>
    </Box>
  );
}
