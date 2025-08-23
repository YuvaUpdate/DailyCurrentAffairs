export const light = {
  background: '#FFFFFF',
  surface: '#F8FAFF',
  text: '#0F172A',
  subText: '#6B7280',
  accent: '#2563EB',
  border: '#E6EEF8',
  headerBg: '#FFFFFF',
  buttonBg: '#2563EB',
  buttonText: '#FFFFFF',
  success: '#10B981',
  error: '#EF4444',
  subtleShadow: 'rgba(16,24,40,0.06)'
};

export const dark = {
  background: '#000000',
  surface: '#000000',
  text: '#E6EEF8',
  subText: '#94A3B8',
  accent: '#000000',
  border: '#12304A',
  headerBg: '#000000',
  buttonBg: '#000000',
  buttonText: '#FFFFFF',
  success: '#10B981',
  error: '#EF4444',
  subtleShadow: 'rgba(0,0,0,0.6)'
};

export function getTheme(isDark: boolean) {
  return isDark ? dark : light;
}
