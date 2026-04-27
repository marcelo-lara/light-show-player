
import { Box, Typography, Chip } from '@mui/material';
import { usePlayerContext } from '../../contexts/PlayerContext';
import { formatReadyState } from '../../utils/formatters';

export function EventLogPanel() {
  const { status, lastAck, readyState } = usePlayerContext();

  return (
    <Box sx={{ bgcolor: 'background.paper', flexGrow: 1, overflowY: 'auto', p: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.5 }}>
      <Typography color="text.secondary" variant="body2">
        Event Log
        {status && (
          <Chip
            label={status.isController ? 'MASTER' : 'MONITOR'}
            color={status.isController ? 'success' : 'default'}
            size="small"
            sx={{ ml: 1, height: 16, fontSize: '0.65rem' }}
          />
        )}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Last Ack: {lastAck ? `${lastAck.intentType} ${lastAck.status}` : 'n/a'}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        WebSocket: {formatReadyState(readyState)}
      </Typography>
    </Box>
  );
}
