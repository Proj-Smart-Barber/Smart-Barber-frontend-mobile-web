/**
 * Resolução de fuso horário comercial brasileiro (IANA) com base em UF, Cidade e CEP.
 * 
 * Regras territoriais oficiais brasileiras (Decreto 2.784/1913, Lei 11.662/2008, Lei 12.876/2013):
 * - UTC-2: Fernando de Noronha (PE) -> America/Noronha
 * - UTC-3: Sudeste, Sul, Nordeste, GO, DF, TO, PA, AP -> America/Sao_Paulo
 * - UTC-4: MT -> America/Cuiaba
 *          MS -> America/Campo_Grande
 *          RO -> America/Porto_Velho
 *          RR -> America/Boa_Vista
 *          AM (maioria) -> America/Manaus
 * - UTC-5: AC e 13 municípios do extremo oeste do AM -> America/Rio_Branco
 * 
 * NUNCA utilizar o fuso do dispositivo do usuário (celular/browser).
 */

export const BRAZIL_COMMERCIAL_TIMEZONES = [
  'America/Sao_Paulo',
  'America/Noronha',
  'America/Cuiaba',
  'America/Campo_Grande',
  'America/Porto_Velho',
  'America/Boa_Vista',
  'America/Manaus',
  'America/Rio_Branco',
] as const;

export type BrazilCommercialTimezone = typeof BRAZIL_COMMERCIAL_TIMEZONES[number];

const AM_UTC_MINUS_5_CITIES = new Set([
  'atalaia do norte',
  'benjamin constant',
  'boca do acre',
  'eirunepe',
  'envira',
  'guajara',
  'ipixuna',
  'itamarati',
  'jutai',
  'labrea',
  'pauini',
  'sao paulo de olivenca',
  'tabatinga',
]);

function normalizeString(val?: string | null): string {
  if (!val) return '';
  return val
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export interface ResolveTimezoneParams {
  state?: string | null;
  city?: string | null;
  cep?: string | null;
}

export function resolveCommercialTimezone(params: ResolveTimezoneParams): BrazilCommercialTimezone {
  const state = (params.state || '').trim().toUpperCase();
  const normCity = normalizeString(params.city);
  const cepDigits = (params.cep || '').replace(/\D/g, '');

  // 1. Fernando de Noronha (PE) - UTC-2
  if (normCity.includes('fernando de noronha') || cepDigits.startsWith('53990')) {
    return 'America/Noronha';
  }

  // 2. Acre - UTC-5
  if (state === 'AC' || state === 'ACRE') {
    return 'America/Rio_Branco';
  }

  // 3. Amazonas - bifurcação entre UTC-4 (Manaus) e UTC-5 (13 municípios do oeste)
  if (state === 'AM' || state === 'AMAZONAS') {
    if (AM_UTC_MINUS_5_CITIES.has(normCity)) {
      return 'America/Rio_Branco';
    }
    return 'America/Manaus';
  }

  // 4. Roraima - UTC-4
  if (state === 'RR' || state === 'RORAIMA') {
    return 'America/Boa_Vista';
  }

  // 5. Rondônia - UTC-4
  if (state === 'RO' || state === 'RO NDO NIA' || state === 'RONDONIA') {
    return 'America/Porto_Velho';
  }

  // 6. Mato Grosso - UTC-4
  if (state === 'MT' || state === 'MATO GROSSO') {
    return 'America/Cuiaba';
  }

  // 7. Mato Grosso do Sul - UTC-4
  if (state === 'MS' || state === 'MATO GROSSO DO SUL') {
    return 'America/Campo_Grande';
  }

  // 8. Demais estados (Sudeste, Sul, Nordeste, GO, DF, TO, PA, AP) - UTC-3
  return 'America/Sao_Paulo';
}
