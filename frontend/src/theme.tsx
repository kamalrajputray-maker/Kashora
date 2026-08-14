import { createTheme, ThemeOptions } from '@mui/material/styles';
import { deepPurple, teal } from '@mui/material/colors';

// Vibrant palette – can be customized later
const lightPalette = {
  primary: { main: '#5e35b1' }, // deepPurple
  secondary: { main: '#26a69a' }, // teal
  background: { default: '#f5f5f5', paper: '#ffffff' },
};

const darkPalette = {
  primary: { main: '#9575cd' },
  secondary: { main: '#80cbc4' },
  background: { default: '#121212', paper: '#1e1e1e' },
};

export const getTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: mode === 'light' ? lightPalette : darkPalette,
    typography: { fontFamily: 'Inter, Roboto, sans-serif' },
    components: {
      MuiCard: { styleOverrides: { root: { borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } } },
    },
  } as ThemeOptions);
