const CONTROL_SELECTOR = '[role="button"], [role="tab"]';
const MAX_TAP_MOVEMENT = 10;
const MAX_TAP_DURATION = 500;

export function bindClientCapsuleTouch(root: HTMLElement): () => void {
  let pendingTap: { control: HTMLElement; start: Touch; timeStamp: number } | null = null;

  const withinTapDistance = (start: Touch, current: Touch) =>
    Math.hypot(start.clientX - current.clientX, start.clientY - current.clientY) <= MAX_TAP_MOVEMENT;

  const cancelTap = () => {
    pendingTap = null;
  };

  const startTap = (event: TouchEvent) => {
    cancelTap();
    if (event.touches.length !== 1 || !(event.target instanceof Element)) return;

    const control = event.target.closest(CONTROL_SELECTOR);
    if (!(control instanceof HTMLElement) || !root.contains(control)) return;
    if (control.getAttribute('aria-disabled') === 'true') return;

    pendingTap = { control, start: event.touches[0], timeStamp: event.timeStamp };
  };

  const moveTap = (event: TouchEvent) => {
    if (!pendingTap) return;
    const touch = event.touches[0];
    if (event.touches.length !== 1 || touch.identifier !== pendingTap.start.identifier ||
      !withinTapDistance(pendingTap.start, touch)) {
      cancelTap();
    }
  };

  const endTap = (event: TouchEvent) => {
    const tap = pendingTap;
    cancelTap();
    if (!tap || !event.cancelable || event.defaultPrevented || event.touches.length !== 0) return;
    if (event.changedTouches.length !== 1 || event.timeStamp - tap.timeStamp > MAX_TAP_DURATION) return;

    const touch = event.changedTouches[0];
    if (touch.identifier !== tap.start.identifier || !withinTapDistance(tap.start, touch)) return;
    if (!root.contains(tap.control) || tap.control.getAttribute('aria-disabled') === 'true') return;

    const target = root.ownerDocument.elementFromPoint(touch.clientX, touch.clientY);
    if (!tap.control.contains(target)) return;

    // Durante a inércia do scroll, o navegador pode entregar o toque sem gerar click.
    // O toque confirmado usa a mesma ação do mouse/teclado e cancela o click duplicado.
    event.preventDefault();
    tap.control.click();
  };

  root.addEventListener('touchstart', startTap, { passive: true });
  root.addEventListener('touchmove', moveTap, { passive: true });
  root.addEventListener('touchcancel', cancelTap, { passive: true });
  root.addEventListener('touchend', endTap, { passive: false });

  return () => {
    root.removeEventListener('touchstart', startTap);
    root.removeEventListener('touchmove', moveTap);
    root.removeEventListener('touchcancel', cancelTap);
    root.removeEventListener('touchend', endTap);
  };
}
