/**
 * Tipos comuns utilitários do Smart Barber
 */

export type Nullable<T> = T | null;

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };
