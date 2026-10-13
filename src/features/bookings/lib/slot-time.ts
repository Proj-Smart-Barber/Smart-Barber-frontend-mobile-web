export function formatSlotTime(instant: string, timezone: string): string {
  if (!timezone || !Number.isFinite(Date.parse(instant))) throw new Error('Horário ou fuso inválido.');
  return new Intl.DateTimeFormat('pt-BR', {timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(instant));
}
