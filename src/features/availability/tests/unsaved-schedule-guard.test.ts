import { beforeEach, describe, expect, it, vi } from 'vitest';

const controls = vi.hoisted(() => ({
  effect: undefined as (() => void | (() => void)) | undefined,
  blocked: false,
  onRemove: undefined as ((options: { data: { action: object } }) => void) | undefined,
  dispatch: vi.fn(), alert: vi.fn(), confirm: vi.fn(), add: vi.fn(), remove: vi.fn(),
  platform: { OS: 'web' },
}));
vi.mock('react', () => ({ useEffect: (effect: typeof controls.effect) => { controls.effect = effect; } }));
vi.mock('react-native', () => ({ Platform: controls.platform, Alert: { alert: controls.alert } }));
vi.mock('expo-router', () => ({ useNavigation: () => ({ dispatch: controls.dispatch }) }));
vi.mock('expo-router/react-navigation', () => ({ usePreventRemove: (blocked: boolean, callback: typeof controls.onRemove) => {
  controls.blocked = blocked; controls.onRemove = callback;
} }));
import { confirmScheduleDiscard, useUnsavedScheduleGuard } from '../model/use-unsaved-schedule-guard';

describe('proteção de navegação da jornada pessoal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controls.platform.OS = 'web';
    vi.stubGlobal('window', { confirm: controls.confirm, addEventListener: controls.add, removeEventListener: controls.remove });
  });
  it('edição limpa libera navegação e não registra beforeunload', () => {
    useUnsavedScheduleGuard(false, false);
    controls.effect?.();
    expect(controls.blocked).toBe(false);
    expect(controls.add).not.toHaveBeenCalled();
  });
  it('cancelar mantém a edição; confirmar prossegue com a mesma ação', () => {
    useUnsavedScheduleGuard(true, false);
    const action = { type: 'GO_BACK' };
    controls.confirm.mockReturnValue(false);
    controls.onRemove?.({ data: { action } });
    expect(controls.dispatch).not.toHaveBeenCalled();
    controls.confirm.mockReturnValue(true);
    controls.onRemove?.({ data: { action } });
    expect(controls.dispatch).toHaveBeenCalledWith(action);
  });
  it('bloqueia saída enquanto uma operação está em andamento', () => {
    useUnsavedScheduleGuard(false, true);
    controls.onRemove?.({ data: { action: { type: 'GO_BACK' } } });
    expect(controls.blocked).toBe(true);
    expect(controls.confirm).not.toHaveBeenCalled();
    expect(controls.dispatch).not.toHaveBeenCalled();
  });
  it('avisa no fechamento da aba e remove o listener no cleanup', () => {
    useUnsavedScheduleGuard(true, false);
    const cleanup = controls.effect?.();
    const [event, handler] = controls.add.mock.calls[0];
    expect(event).toBe('beforeunload');
    const unload = { preventDefault: vi.fn(), returnValue: undefined };
    handler(unload);
    expect(unload.preventDefault).toHaveBeenCalledOnce();
    if (cleanup) cleanup();
    expect(controls.remove).toHaveBeenCalledWith('beforeunload', handler);
  });
  it('no mobile, descartar exige ação explícita no alerta', () => {
    controls.platform.OS = 'android';
    const discard = vi.fn();
    confirmScheduleDiscard(discard);
    expect(discard).not.toHaveBeenCalled();
    const buttons = controls.alert.mock.calls[0][2];
    expect(buttons[0].style).toBe('cancel');
    buttons[1].onPress();
    expect(discard).toHaveBeenCalledOnce();
  });
});
