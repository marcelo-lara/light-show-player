import { FormControl, Select, MenuItem, Typography } from '@mui/material';
import { usePlayerContext } from '../../contexts/PlayerContext';
import { getSongBaseName } from '../../utils/formatters';

export function Selectors() {
  const {
    manifest,
    selectedSong,
    setSelectedSong,
    selectedShow,
    setSelectedShow,
  } = usePlayerContext();

  return (
    <>
      <FormControl sx={{ mr: 2, minWidth: 120 }}>
        <Select
          value={selectedSong}
          onChange={(e) => setSelectedSong(e.target.value)}
          displayEmpty
          variant="standard"
          disableUnderline
          sx={{ color: 'text.primary', '& .MuiSvgIcon-root': { color: 'text.primary' } }}
        >
          <MenuItem value="">
            <Typography>Select Song</Typography>
          </MenuItem>
          {manifest.songs.map((song) => (
            <MenuItem key={song} value={song}>
              <Typography>{getSongBaseName(song)}</Typography>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 120 }}>
        <Select
          value={selectedShow}
          onChange={(e) => setSelectedShow(e.target.value)}
          displayEmpty
          disabled={!selectedSong}
          variant="standard"
          disableUnderline
          sx={{ color: 'text.primary', '& .MuiSvgIcon-root': { color: 'text.primary' } }}
        >
          <MenuItem value="">
            <Typography>Select Show</Typography>
          </MenuItem>
          {selectedSong && (() => {
            const songBase = getSongBaseName(selectedSong);
            const availableShows = manifest.shows[songBase] || [];
            return availableShows.length > 0 ? availableShows.map((show) => (
              <MenuItem key={show} value={show}>
                <Typography>{show}</Typography>
              </MenuItem>
            )) : (
              <MenuItem disabled>
                <Typography color="text.secondary">*no shows available*</Typography>
              </MenuItem>
            );
          })()}
        </Select>
      </FormControl>
    </>
  );
}
