/**
 * Text-transform methods (titleCase, pluralForm, pastTense, ...).
 *
 * These are best-effort English morphology approximations for the live
 * preview. Perchance's real engine does the authoritative transform at run
 * time; the preview only needs to be representative, and the SERIALIZER emits
 * the real `.pastTense` call so published output is always correct.
 */

const SMALL_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'nor', 'of',
  'on', 'or', 'per', 'the', 'to', 'via', 'vs',
]);

export function titleCase(s: string): string {
  const words = s.split(/(\s+)/);
  let wordIndex = 0;
  return words
    .map((tok) => {
      if (/^\s+$/.test(tok)) return tok;
      const isEdge = wordIndex === 0;
      wordIndex += 1;
      const lower = tok.toLowerCase();
      if (!isEdge && SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

export function sentenceCase(s: string): string {
  const trimmed = s.trimStart();
  if (!trimmed) return s;
  const lead = s.slice(0, s.length - trimmed.length);
  return lead + trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function pluralForm(s: string): string {
  if (/[^aeiou]y$/i.test(s)) return s.slice(0, -1) + 'ies';
  if (/(s|x|z|ch|sh)$/i.test(s)) return s + 'es';
  return s + 's';
}

export function singularForm(s: string): string {
  if (/ies$/i.test(s)) return s.slice(0, -3) + 'y';
  if (/(ses|xes|zes|ches|shes)$/i.test(s)) return s.slice(0, -2);
  if (/s$/i.test(s) && !/ss$/i.test(s)) return s.slice(0, -1);
  return s;
}

export function pastTense(s: string): string {
  if (/e$/i.test(s)) return s + 'd';
  if (/[^aeiou]y$/i.test(s)) return s.slice(0, -1) + 'ied';
  return s + 'ed';
}

export function presentTense(s: string): string {
  if (/(s|x|z|ch|sh)$/i.test(s)) return s + 'es';
  if (/[^aeiou]y$/i.test(s)) return s.slice(0, -1) + 'ies';
  return s + 's';
}

export function futureTense(s: string): string {
  return 'will ' + s;
}

export const TRANSFORMS: Record<string, (s: string) => string> = {
  titleCase,
  sentenceCase,
  upperCase: (s) => s.toUpperCase(),
  lowerCase: (s) => s.toLowerCase(),
  pluralForm,
  singularForm,
  pastTense,
  presentTense,
  futureTense,
};
