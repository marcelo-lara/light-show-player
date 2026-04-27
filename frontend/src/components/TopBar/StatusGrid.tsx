import { Box, Typography, Chip } from '@mui/material';
import { usePlayerContext } from '../../contexts/PlayerContext';

export function StatusGrid() {
  const {
    readyState,
    state,
    liveDriftMs,
  } = usePlayerContext();

  return (
    <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
      <Chip
        label="SERVER"
        sx={{
          bgcolor: readyState === 1 /* WebSocket.OPEN */ ? 'success.main' : readyState === 0 /* WebSocket.CONNECTING */ ? 'warning.main' : 'error.main',
          color: '#fff',
          fontWeight: 'bold',
        }}
        size="small"
      />

      <Box sx={{ position: 'relative', width: '4em', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'transparent', overflow: 'hidden' }}>
        {/* Base line for gauge */}
        <Box sx={{ position: 'absolute', width: '100%', height: '2px', bgcolor: 'grey.800' }} />
        {/* Dynamic drift bar */}
        {liveDriftMs !== null && (
          <Box sx={{
            position: 'absolute',
            height: '2px',
            bgcolor: 'error.main',
            width: `${Math.min(50, Math.abs((liveDriftMs / 100) * 50))}%`,
            left: liveDriftMs < 0 ? `calc(50% - ${Math.min(50, Math.abs((liveDriftMs / 100) * 50))}%)` : '50%',
          }} />
        )}
        {/* Overlaid numeric text */}
        <Typography variant="caption" sx={{ zIndex: 1, color: '#fff', textShadow: '0px 0px 4px rgba(0,0,0,0.8)' }}>
          {liveDriftMs !== null ? `${Math.round(liveDriftMs)}ms` : '-'}
        </Typography>
      </Box>

      <Chip
        label={state === 'LOADED' ? 'READY' : state}
        sx={{
          bgcolor: (state === 'LOADED' || state === 'PLAYING') ? 'success.main' : 'grey.600',
          color: '#fff',
          fontWeight: 'bold'
        }}
        size="small"
      />
    </Box>
  );
}
