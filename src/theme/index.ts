export const colors = {
  primary: '#FF6B00',
  primaryLight: '#FF8C38',
  primaryDark: '#CC5500',
  background: '#0A0A0A',
  surface: '#141414',
  surfaceElevated: '#1E1E1E',
  surfaceHighlight: '#252525',
  border: '#2A2A2A',
  borderLight: '#333333',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  success: '#22C55E',
  successBg: '#052E16',
  error: '#EF4444',
  errorBg: '#2D0A0A',
  warning: '#F59E0B',
  warningBg: '#2D1A00',
  info: '#3B82F6',
  infoBg: '#0A1628',
  white: '#FFFFFF',
  black: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Tracking (letterSpacing) is size-specific, never one fixed value (apple-design §15):
// large display text tightens with negative tracking, body stays near 0, and small
// text gets a touch of positive tracking for legibility. Leading tracks size
// inversely — tighter on headings, looser on body.
export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34, letterSpacing: -0.4 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24, letterSpacing: -0.2 },
  h4: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22, letterSpacing: -0.1 },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 22, letterSpacing: 0 },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18, letterSpacing: 0.1 },
  caption: { fontSize: 11, fontWeight: '400' as const, lineHeight: 16, letterSpacing: 0.2 },
  label: { fontSize: 13, fontWeight: '500' as const, lineHeight: 20, letterSpacing: 0.1 },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};
