import { Platform } from 'react-native';

/** Palette chaude et douce : crème, vert sauge, terracotta, jaune miel. */
export const colors = {
  cream: '#FFF6E9',
  creamDark: '#F6E7D0',
  paper: '#FFFDF8',
  sage: '#A8C3A0',
  sageDark: '#6E8F6A',
  terracotta: '#D98A6C',
  terracottaDark: '#B86A4F',
  honey: '#F2C46D',
  honeyLight: '#FBE3AE',
  wood: '#C89B6D',
  woodDark: '#9C7049',
  woodLight: '#E3C39C',
  text: '#4A3B32',
  textSoft: '#8A776A',
  white: '#FFFFFF',
  shadow: 'rgba(74, 59, 50, 0.18)',
  overlay: 'rgba(74, 59, 50, 0.35)',
};

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const fonts = {
  rounded: Platform.select({
    ios: 'ui-rounded',
    web: "'Nunito', 'Quicksand', ui-rounded, 'SF Pro Rounded', system-ui, sans-serif",
    default: 'normal',
  }),
};

export const softShadow = {
  shadowColor: '#4A3B32',
  shadowOpacity: 0.12,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};
