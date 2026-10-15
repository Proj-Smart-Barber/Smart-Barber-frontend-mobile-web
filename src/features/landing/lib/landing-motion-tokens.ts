/**
 * Tokens de animação cinematográfica da Landing Page do Smart Barber.
 * Alinhado às decisões de ritmo, profundidade e acessibilidade.
 */

export const landingMotionTokens = {
  duration: {
    instant: 0,
    fast: 0.14,
    normal: 0.22,
    slow: 0.30,
    sceneTransition: 0.45,
    sceneOpening: 0.75,
  },
  easing: {
    cinematic: [0.16, 1, 0.3, 1] as const,
    subtle: [0.25, 0.1, 0.25, 1] as const,
    exit: [0.4, 0, 1, 1] as const,
  },
  distance: {
    micro: 4,
    sm: 8,
    md: 16,
    lg: 24,
  },
  stagger: {
    tight: 0.05,
    default: 0.08,
    relaxed: 0.12,
  },
  scale: {
    initial: 0.98,
    full: 1.0,
    hover: 1.01,
  },
} as const;

export type LandingMotionTokens = typeof landingMotionTokens;
