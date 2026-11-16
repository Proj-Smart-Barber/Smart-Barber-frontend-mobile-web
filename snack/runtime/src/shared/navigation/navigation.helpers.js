export function getActiveDestinationFromPathname(pathname) {
    if (!pathname)
        return 'home';
    const clean = pathname.toLowerCase();
    if (clean.includes('/finance'))
        return 'finance';
    if (clean.includes('/reviews') || clean.includes('avaliacoes') || clean.includes('avaliações')) {
        return 'reviews';
    }
    if (clean.includes('profile-preview'))
        return 'profile-preview';
    if (clean.includes('availability') ||
        clean.includes('my-schedule') ||
        clean.includes('horarios') ||
        clean.includes('horários')) {
        return 'availability';
    }
    if (clean.includes('settings')) {
        return 'settings';
    }
    if (clean.includes('agenda') ||
        clean.includes('atendimentos')) {
        return 'agenda';
    }
    if (clean.includes('services') ||
        clean.includes('servicos') ||
        clean.includes('serviços')) {
        return 'services';
    }
    if (clean.includes('team') || clean.includes('equipe')) {
        return 'team';
    }
    return 'home';
}
