export const COLORS = {
  charcoal: '#2F2F37',
  ivory: '#F7F6F2',
  // Flat fallback for the rare spot the true gold gradient can't be used
  // (e.g. an SVG icon's stroke/fill prop). Matches website's own
  // `--color-gold: var(--privi-gold-mid)` fallback — prefer GOLD_GRADIENT
  // via GoldGradientText/GoldGradientBorder wherever possible instead.
  gold: '#e4bc50',
  teal: '#6FA7A1',
  // Utility colors
  lightGray: '#EFEDE5',
  mediumGray: '#8A8983',
  darkGray: '#6F6E68',
  white: '#FFFFFF',
} as const;

// PRIVI GOLD MATERIAL — ported unchanged from website/src/app/globals.css
// (privi_gold_material_code.css). Applies to every gold logo, icon,
// divider, button border, accent and decorative text element, site-wide.
// See GoldGradientText / GoldGradientBorder / GoldGradientFill.
export const GOLD_GRADIENT_STOPS = ['#f8df82', '#f2d16b', '#e4bc50', '#cfa03a'] as const;
export const GOLD_GRADIENT_LOCATIONS = [0, 0.32, 0.68, 1] as const;

// Brand overlay/dimming
export const OVERLAY = {
  dark: 'rgba(47, 47, 55, 0.25)',
  darkStrong: 'rgba(47, 47, 55, 0.4)',
} as const;
