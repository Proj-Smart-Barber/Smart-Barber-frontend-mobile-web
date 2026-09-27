export interface Barbershop {
  id: string;
  name: string;
  /** IANA timezone, ex: "America/Sao_Paulo". Migration aprovada; default no banco: "America/Sao_Paulo". */
  timezone: string;
}
