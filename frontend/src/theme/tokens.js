// ── Slate & Citrus — tokens de design ────────────────────────────────────────
// Source de vérité : "Gougoul Holocron - Core Modules.dc.html" (Claude Design,
// 2026-09-04). Un seul accent (citron), statuts en palette neutre, cartes sans
// bordure (élévation par luminosité uniquement). Voir CONTEXT.md section 9 et
// DECISIONS.md D-2026-07-14-02.
export const darkTokens = {
  mode: 'dark',
  bg: '#0B0B0C',
  surface: '#1E1E20',
  surfaceAlt: '#242426',
  surfaceHover: '#2A2A2C',
  accent: '#C4F042',
  accentText: '#0B0B0C',
  accentDim: 'rgba(196,240,66,0.14)',
  text: '#EDEDED',
  textMuted: '#8A8A8E',
  border: '#242426',
  success: '#3ECF7E',
  danger: '#C97A7A',
  dangerDim: 'rgba(201,122,122,0.12)',
};

export const lightTokens = {
  mode: 'light',
  bg: '#FAFAFA',
  surface: '#F0F0F0',
  surfaceAlt: '#EDEDED',
  surfaceHover: '#E6E6E6',
  accent: '#7A9A00',
  accentText: '#FFFFFF',
  accentDim: 'rgba(122,154,0,0.12)',
  text: '#141414',
  textMuted: '#6E6E72',
  border: '#EDEDED',
  success: '#1FA35C',
  danger: '#B5544B',
  dangerDim: 'rgba(181,84,75,0.08)',
};

export const getTokens = (dark) => (dark ? darkTokens : lightTokens);
