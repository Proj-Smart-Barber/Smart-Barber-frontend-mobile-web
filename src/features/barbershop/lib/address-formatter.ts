import { formatCep, normalizeCep } from './cep';

export interface AddressFields {
  street: string;
  number?: string;
  withoutNumber?: boolean;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  cep?: string;
}

/**
 * Monta o endereço canônico a partir dos campos estruturados.
 * Elimina duplicações de pontuação, remove componentes vazios e
 * garante formatação consistente para geocoding, preview e envio à API.
 */
export function buildCanonicalLocation(fields: AddressFields): string {
  const parts: string[] = [];

  const street = (fields.street || '').trim();
  if (street) {
    parts.push(street);
  }

  const isNoNumber = Boolean(fields.withoutNumber);
  const numberVal = (fields.number || '').trim();
  if (isNoNumber) {
    parts.push('s/n');
  } else if (numberVal) {
    parts.push(numberVal);
  }

  const complement = (fields.complement || '').trim();
  if (complement) {
    parts.push(complement);
  }

  const neighborhood = (fields.neighborhood || '').trim();
  if (neighborhood) {
    parts.push(neighborhood);
  }

  const city = (fields.city || '').trim();
  const state = (fields.state || '').trim().toUpperCase();

  if (city && state) {
    parts.push(`${city} - ${state}`);
  } else if (city) {
    parts.push(city);
  } else if (state) {
    parts.push(state);
  }

  const rawCep = normalizeCep(fields.cep);
  if (rawCep.length === 8) {
    parts.push(`CEP ${formatCep(rawCep)}`);
  }

  return parts.join(', ');
}
