import type { AppDestination } from './navigation.types';

export function getActiveDestinationFromPathname(
  pathname: string | null | undefined,
): AppDestination {
  if (!pathname) return 'home';

  const clean = pathname.toLowerCase();
  if (clean.includes('agenda')) return 'agenda';
  if (
    clean.includes('availability') ||
    clean.includes('horarios') ||
    clean.includes('horários')
  ) {
    return 'availability';
  }
  if (
    clean.includes('services') ||
    clean.includes('servicos') ||
    clean.includes('serviços')
  ) {
    return 'services';
  }
  return 'home';
}
