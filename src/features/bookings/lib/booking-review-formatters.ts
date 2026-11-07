/**
 * Utilitários puros de formatação e apresentação para o resumo de agendamento (BookingReview).
 * Preserva o fuso de negócio e data civil local sem deslocamentos por UTC.
 */

export function formatReviewDate(dateInput?: string | Date | null): string {
  if (!dateInput) return 'Data a confirmar';

  let datePart = '';
  if (typeof dateInput === 'string') {
    datePart = dateInput.trim().slice(0, 10);
  } else if (dateInput instanceof Date) {
    if (Number.isNaN(dateInput.getTime())) return 'Data a confirmar';
    datePart = dateInput.toISOString().slice(0, 10);
  }

  const parts = datePart.split('-');
  if (parts.length !== 3) return 'Data a confirmar';

  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
    return 'Data a confirmar';
  }

  // Cria objeto Date no meio-dia local para evitar virada de fuso horário
  const d = new Date(year, month - 1, day, 12, 0, 0);
  if (Number.isNaN(d.getTime())) return 'Data a confirmar';

  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' });
  const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const monthLong = d.toLocaleDateString('pt-BR', { month: 'long' });

  return `${formattedWeekday}, ${day} de ${monthLong} de ${year}`;
}
