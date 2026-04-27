
import { Box, Button, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { usePlayerContext } from '../contexts/PlayerContext';
import { formatTime } from '../utils/formatters';

export function PlayerControls() {
  const {
    state,
    selectedSong,
    isSocketOpen,
    currentTime,
    handleLoad,
    handlePlay,
    handlePause,
    handleStop,
  } = usePlayerContext();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderTop: 1, borderColor: 'primary.main' }}>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          onClick={handleLoad}
          disabled={!selectedSong || !isSocketOpen}
          variant="text"
          color="primary"
          sx={{ minWidth: 0, p: 1 }}
        >
          <FileUploadIcon />
        </Button>
        <Button
          onClick={handleStop}
          disabled={state === 'IDLE' || !isSocketOpen}
          variant="text"
          color="error"
          sx={{ minWidth: 0, p: 1 }}
        >
          <StopIcon />
        </Button>
        <Button
          onClick={state === 'PLAYING' ? handlePause : handlePlay}
          disabled={(state !== 'IDLE' && state !== 'LOADED' && state !== 'PLAYING' && state !== 'PAUSED') || !isSocketOpen}
          variant="text"
          color={state === 'PLAYING' ? 'warning' : 'success'}
          sx={{ minWidth: 0, p: 1 }}
        >
          {state === 'PLAYING' ? <PauseIcon sx={{ fontSize: '1.75em' }} /> : <PlayArrowIcon sx={{ fontSize: '1.75em' }} />}
        </Button>
      </Box>

      <Typography variant="h4" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
        {formatTime(currentTime)}
      </Typography>
    </Box>
  );
}
