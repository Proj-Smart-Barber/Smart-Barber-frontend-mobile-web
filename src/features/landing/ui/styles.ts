/**
 * Estilos CSS globais e modulares da Landing Page Web do Smart Barber.
 * Incorpora tokens dos temas Obsidian Atelier do DSv2 (Seção 52),
 * tipografia oficial Epilogue e Inter, materiais Liquid Glass,
 * classes obrigatórias tabular-nums e font-semibold, breakpoints e acessibilidade.
 */

export const landingStylesCss = `
  /* Carregamento prioritário de tipografia oficial e aliases autoritativos */
  @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');

  @font-face {
    font-family: 'Epilogue';
    font-weight: 700;
    src: local('Epilogue_700Bold'), local('Epilogue-Bold');
    font-display: swap;
  }
  @font-face {
    font-family: 'Epilogue';
    font-weight: 800;
    src: local('Epilogue_800ExtraBold'), local('Epilogue-ExtraBold');
    font-display: swap;
  }
  @font-face {
    font-family: 'Inter';
    font-weight: 400;
    src: local('Inter_400Regular'), local('Inter-Regular');
    font-display: swap;
  }
  @font-face {
    font-family: 'Inter';
    font-weight: 500;
    src: local('Inter_500Medium'), local('Inter-Medium');
    font-display: swap;
  }
  @font-face {
    font-family: 'Inter';
    font-weight: 600;
    src: local('Inter_600SemiBold'), local('Inter-SemiBold');
    font-display: swap;
  }
  @font-face {
    font-family: 'Inter';
    font-weight: 700;
    src: local('Inter_700Bold'), local('Inter-Bold');
    font-display: swap;
  }

  /* Desbloqueio global de rolagem da janela e fixação no tema escuro Obsidian */
  html,
  body {
    overflow-y: auto !important;
    overflow-x: hidden !important;
    height: auto !important;
    min-height: 100% !important;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    background-color: #0B0B0B !important;
    color: #FFFFFF !important;
    color-scheme: dark;
  }

  #root,
  #root > div,
  .css-g5y9jx.r-13awgt0,
  .css-g5y9jx.r-1p0dtai {
    height: auto !important;
    min-height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    flex: 1 0 auto !important;
    overflow: visible !important;
    position: static !important;
  }

  /* Reset e variáveis raiz: Tema Obsidian Atelier Fixo */
  .sb-landing-root,
  .sb-landing-root.theme-obsidian {
    --sb-font-heading: 'Epilogue_800ExtraBold', 'Epilogue', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --sb-font-heading-bold: 'Epilogue_700Bold', 'Epilogue', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --sb-font-body: 'Inter_400Regular', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --sb-font-body-medium: 'Inter_500Medium', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --sb-font-body-semibold: 'Inter_600SemiBold', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --sb-font-body-bold: 'Inter_700Bold', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

    --sb-max-width: 1040px;
    --sb-motion-fast: 140ms;
    --sb-motion-normal: 220ms;
    --sb-motion-slow: 300ms;

    --sb-bg: #0B0B0B;
    --sb-surface: #131313;
    --sb-surface-elevated: #1F1F1F;
    --sb-surface-hover: #262626;
    --sb-crimson: #BD2026;
    --sb-crimson-hover: #A31B20;
    --sb-crimson-glow: rgba(189, 32, 38, 0.28);
    --sb-text-primary: #FFFFFF;
    --sb-text-secondary: #D4D4D4;
    --sb-text-muted: #8E8E93;
    --sb-border: rgba(255, 255, 255, 0.12);
    --sb-border-subtle: rgba(255, 255, 255, 0.08);
    --sb-card-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
    --sb-input-bg: #1A1A1A;
    --sb-input-border: rgba(255, 255, 255, 0.18);
    --sb-input-focus: #BD2026;

    background-color: var(--sb-bg);
    color: var(--sb-text-primary);
    min-height: 100vh;
    width: 100%;
    overflow: visible;
    font-family: var(--sb-font-body);
    font-size: 16px;
    line-height: 1.6;
    letter-spacing: -0.01em;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Regras Tipográficas Hard Constraints */
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }

  .font-semibold {
    font-weight: 600;
  }

  /* -------------------------------------------------------------
     Contrato Liquid Glass (DSv2 Seção 52)
     ------------------------------------------------------------- */
  .sb-glass-base {
    position: relative;
    box-sizing: border-box;
    transition: border-color var(--sb-motion-normal), background-color var(--sb-motion-normal), box-shadow var(--sb-motion-normal);
  }

  .sb-glass-navigation {
    background-color: rgba(20, 20, 20, 0.72);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 32px;
  }

  .sb-glass-card {
    background-color: rgba(32, 33, 38, 0.64);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 26px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.45);
  }

  .sb-glass-card-elevated {
    background-color: rgba(40, 42, 48, 0.76);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(189, 32, 38, 0.35);
    border-radius: 26px;
    box-shadow: 0 8px 32px rgba(189, 32, 38, 0.16), 0 4px 24px rgba(0, 0, 0, 0.6);
  }

  .sb-glass-form {
    background-color: rgba(24, 25, 29, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 26px;
    box-shadow: 0 8px 36px rgba(0, 0, 0, 0.65);
  }

  @supports not (backdrop-filter: blur(10px)) {
    .sb-glass-navigation { background-color: #141414; }
    .sb-glass-card { background-color: #191A1E; }
    .sb-glass-card-elevated { background-color: #202227; }
    .sb-glass-form { background-color: #16171A; }
  }

  @media (prefers-reduced-transparency: reduce) {
    .sb-glass-navigation { background-color: #141414 !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
    .sb-glass-card { background-color: #191A1E !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
    .sb-glass-card-elevated { background-color: #202227 !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
    .sb-glass-form { background-color: #16171A !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
  }

  .sb-container {
    max-width: var(--sb-max-width);
    margin: 0 auto;
    padding: 0 20px;
    width: 100%;
    box-sizing: border-box;
  }

  @media (min-width: 600px) {
    .sb-container {
      padding: 0 32px;
    }
  }

  @media (min-width: 840px) {
    .sb-container {
      padding: 0 48px;
    }
  }

  /* Skip link acessibilidade */
  .sb-skip-link {
    position: absolute;
    top: -999px;
    left: 16px;
    background: var(--sb-crimson);
    color: #FFFFFF;
    padding: 12px 20px;
    font-family: var(--sb-font-heading-bold);
    font-weight: 700;
    border-radius: 6px;
    z-index: 10000;
    text-decoration: none;
  }
  .sb-skip-link:focus {
    top: 16px;
  }

  /* Marca Animada */
  .sb-animated-brand {
    display: inline-flex;
    align-items: center;
    gap: 12px;
  }
  .sb-brand-symbol-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 8px;
  }
  .sb-brand-light-sheen {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 60%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
    transform: skewX(-20deg);
    pointer-events: none;
  }

  /* Header */
  .sb-header {
    position: sticky;
    top: 0;
    z-index: 900;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    background-color: rgba(11, 11, 11, 0.82);
    border-bottom: 1px solid var(--sb-border-subtle);
    transition: background-color var(--sb-motion-normal);
  }
  .sb-header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 72px;
  }
  .sb-logo-link {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: var(--sb-text-primary);
    min-height: 44px;
    min-width: 44px;
  }
  .sb-logo-text {
    font-family: var(--sb-font-heading);
    font-weight: 800;
    font-size: 1.25rem;
    letter-spacing: -0.02em;
    color: var(--sb-text-primary);
  }
  .sb-nav-menu {
    display: none;
    align-items: center;
    gap: 24px;
  }
  @media (min-width: 840px) {
    .sb-nav-menu {
      display: flex;
    }
  }
  .sb-nav-link {
    color: var(--sb-text-secondary);
    text-decoration: none;
    font-family: var(--sb-font-body-medium);
    font-size: 0.9375rem;
    font-weight: 500;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    padding: 0 4px;
    transition: color var(--sb-motion-fast);
  }
  .sb-nav-link:hover {
    color: var(--sb-text-primary);
  }
  .sb-btn-auth {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    padding: 0 16px;
    border-radius: 8px;
    font-family: var(--sb-font-heading-bold);
    font-weight: 700;
    font-size: 0.875rem;
    color: var(--sb-text-primary);
    border: 1px solid var(--sb-border);
    background: var(--sb-surface);
    text-decoration: none;
    min-width: 44px;
    min-height: 44px;
    transition: background-color var(--sb-motion-fast), border-color var(--sb-motion-fast);
  }
  .sb-btn-auth:hover {
    background: var(--sb-surface-hover);
    border-color: var(--sb-crimson);
  }

  /* -------------------------------------------------------------
     Hero Section (Otimizado para dobra mobile 390x844)
     ------------------------------------------------------------- */
  .sb-hero-section {
    padding: 28px 0 48px 0;
  }
  @media (min-width: 840px) {
    .sb-hero-section {
      padding: 64px 0 80px 0;
    }
  }
  .sb-hero-eyebrow {
    font-family: var(--sb-font-body-semibold);
    font-size: 0.8125rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--sb-crimson);
    margin-bottom: 8px;
  }
  .sb-hero-headline {
    font-family: var(--sb-font-heading);
    font-weight: 800;
    font-size: clamp(2rem, 5vw, 3.5rem);
    line-height: 1.12;
    letter-spacing: -0.03em;
    color: var(--sb-text-primary);
    margin: 0 0 14px 0;
    max-width: 820px;
  }
  .sb-hero-support {
    font-family: var(--sb-font-body-medium);
    font-size: clamp(1rem, 2vw, 1.125rem);
    line-height: 1.5;
    color: var(--sb-text-secondary);
    max-width: 660px;
    margin: 0 0 28px 0;
  }
  .sb-hero-ctas-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
    margin-bottom: 36px;
  }
  @media (min-width: 600px) {
    .sb-hero-ctas-grid {
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
  }
  .sb-hero-card {
    padding: 22px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 14px;
  }
  .sb-hero-card-tag {
    font-family: var(--sb-font-body-semibold);
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--sb-crimson);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .sb-hero-card-title {
    font-family: var(--sb-font-heading-bold);
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--sb-text-primary);
    margin: 4px 0 0 0;
  }
  .sb-btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 48px;
    padding: 0 24px;
    border-radius: 10px;
    background: var(--sb-crimson);
    color: #FFFFFF !important;
    font-family: var(--sb-font-heading-bold);
    font-weight: 700;
    font-size: 0.9375rem;
    text-decoration: none;
    border: none;
    cursor: pointer;
    box-shadow: 0 2px 8px var(--sb-crimson-glow);
    transition: background-color var(--sb-motion-fast), transform var(--sb-motion-fast);
  }
  .sb-btn-primary:hover {
    background: var(--sb-crimson-hover);
    transform: translateY(-1px);
  }
  .sb-btn-primary:active {
    transform: scale(0.98);
  }

  /* Mockup Visual Hero */
  .sb-hero-mockup-wrapper {
    position: relative;
    padding: 24px;
    overflow: hidden;
  }
  @media (min-width: 840px) {
    .sb-hero-mockup-wrapper {
      padding: 32px;
    }
  }
  .sb-mockup-tag {
    display: inline-block;
    font-family: var(--sb-font-body-semibold);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--sb-text-muted);
    background: var(--sb-surface-elevated);
    padding: 4px 10px;
    border-radius: 6px;
    margin-bottom: 20px;
    border: 1px solid var(--sb-border-subtle);
  }
  .sb-mockup-columns {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }
  @media (min-width: 840px) {
    .sb-mockup-columns {
      grid-template-columns: 1fr auto 1.2fr;
      align-items: center;
    }
  }
  .sb-mockup-phone {
    background: rgba(26, 26, 26, 0.85);
    border: 1px solid var(--sb-border);
    border-radius: 14px;
    padding: 16px;
  }
  .sb-mockup-sync-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--sb-crimson);
    font-family: var(--sb-font-heading-bold);
    font-size: 0.8125rem;
    font-weight: 700;
    gap: 6px;
    padding: 12px 0;
  }
  .sb-mockup-tablet {
    background: rgba(26, 26, 26, 0.85);
    border: 1px solid var(--sb-border);
    border-radius: 14px;
    padding: 16px;
  }

  /* Faixa de Confiança (Social Proof) */
  .sb-trust-section {
    padding: 56px 0;
    border-top: 1px solid var(--sb-border-subtle);
    border-bottom: 1px solid var(--sb-border-subtle);
  }
  .sb-section-title-wrap {
    text-align: center;
    margin-bottom: 40px;
  }
  .sb-section-title {
    font-family: var(--sb-font-heading);
    font-weight: 800;
    font-size: clamp(1.75rem, 3.5vw, 2.5rem);
    letter-spacing: -0.02em;
    margin: 0 0 12px 0;
    color: var(--sb-text-primary);
  }
  .sb-section-subtitle {
    font-family: var(--sb-font-body-medium);
    font-size: 1.0625rem;
    color: var(--sb-text-secondary);
    max-width: 620px;
    margin: 0 auto;
  }
  .sb-trust-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }
  @media (min-width: 840px) {
    .sb-trust-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
  }
  .sb-trust-card {
    padding: 22px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .sb-card-badge {
    align-self: flex-start;
    font-family: var(--sb-font-body-semibold);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--sb-crimson);
    background: rgba(189, 32, 38, 0.14);
    border: 1px solid rgba(189, 32, 38, 0.25);
    padding: 3px 8px;
    border-radius: 4px;
    margin-bottom: 12px;
  }
  .sb-trust-card-highlight {
    font-family: var(--sb-font-heading-bold);
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--sb-text-primary);
    margin: 8px 0;
  }

  /* Problema vs Nova Era */
  .sb-problem-section {
    padding: 64px 0;
  }
  .sb-comparison-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    margin-top: 36px;
  }
  @media (min-width: 840px) {
    .sb-comparison-grid {
      grid-template-columns: 1fr 1fr;
      gap: 32px;
    }
  }
  .sb-problem-card {
    padding: 28px;
  }
  .sb-column-heading {
    font-family: var(--sb-font-heading-bold);
    font-size: 1.375rem;
    font-weight: 700;
    margin: 0 0 20px 0;
    color: var(--sb-text-primary);
  }

  /* Bento Grid */
  .sb-bento-section {
    padding: 64px 0;
  }
  .sb-bento-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    margin-top: 36px;
  }
  @media (min-width: 600px) {
    .sb-bento-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (min-width: 840px) {
    .sb-bento-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .sb-bento-item-wide {
      grid-column: span 2;
    }
  }
  .sb-bento-card {
    padding: 24px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: transform var(--sb-motion-fast), border-color var(--sb-motion-fast);
  }
  .sb-bento-card:hover {
    transform: translateY(-2px);
    border-color: rgba(189, 32, 38, 0.45);
  }
  .sb-btn-example {
    background: transparent;
    border: 1px solid var(--sb-border);
    border-radius: 6px;
    padding: 8px 14px;
    font-family: var(--sb-font-body-semibold);
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--sb-text-secondary);
    cursor: pointer;
    margin-top: 16px;
    align-self: flex-start;
    min-height: 44px;
    min-width: 44px;
    display: inline-flex;
    align-items: center;
    transition: background-color var(--sb-motion-fast), color var(--sb-motion-fast);
  }
  .sb-btn-example:hover, .sb-btn-example:focus-visible {
    background: var(--sb-surface-elevated);
    color: var(--sb-text-primary);
    border-color: var(--sb-crimson);
  }
  .sb-bento-example-box {
    margin-top: 14px;
    padding: 14px;
    background: var(--sb-surface-elevated);
    border-radius: 8px;
    border-left: 3px solid var(--sb-crimson);
    font-size: 0.875rem;
    color: var(--sb-text-secondary);
  }

  /* -------------------------------------------------------------
     Palco Cinematográfico de Três Cenas (ProductStory)
     ------------------------------------------------------------- */
  .sb-product-story-wrapper {
    position: relative;
    padding: 40px 0 64px 0;
  }
  @media (min-width: 1024px) {
    .sb-product-story-wrapper {
      min-height: 200vh;
      padding: 0;
    }
  }
  .sb-product-story-sticky {
    position: relative;
  }
  @media (min-width: 1024px) {
    .sb-product-story-sticky {
      position: sticky;
      top: 96px;
      min-height: calc(100vh - 120px);
      display: flex;
      align-items: center;
    }
  }
  .sb-product-story-inner {
    display: grid;
    grid-template-columns: 1fr;
    gap: 36px;
    align-items: center;
  }
  @media (min-width: 1024px) {
    .sb-product-story-inner {
      grid-template-columns: 1.05fr 1.15fr;
      gap: 48px;
    }
  }
  .sb-story-controls-col {
    display: flex;
    flex-direction: column;
  }
  .sb-scrolly-nav-btns {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  .sb-scrolly-btn {
    flex: 1;
    min-height: 44px;
    border-radius: 10px;
    border: 1px solid var(--sb-border);
    background: rgba(32, 33, 38, 0.6);
    color: var(--sb-text-secondary);
    font-family: var(--sb-font-heading-bold);
    font-size: 0.8125rem;
    font-weight: 700;
    cursor: pointer;
    padding: 0 12px;
    transition: background-color var(--sb-motion-fast), color var(--sb-motion-fast), border-color var(--sb-motion-fast);
  }
  .sb-scrolly-btn.active {
    background: var(--sb-crimson);
    color: #FFFFFF;
    border-color: var(--sb-crimson);
    box-shadow: 0 2px 10px var(--sb-crimson-glow);
  }
  .sb-story-detail-card {
    padding: 22px;
    background: rgba(26, 26, 26, 0.7);
    border: 1px solid var(--sb-border-subtle);
    border-radius: 14px;
  }
  .sb-story-stage-col {
    width: 100%;
  }
  .sb-story-stage-glass {
    padding: 24px;
    border-radius: 20px;
    min-height: 380px;
    display: flex;
    flex-direction: column;
  }
  .sb-stage-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--sb-border-subtle);
    margin-bottom: 16px;
  }
  .sb-stage-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
  .sb-stage-dot.red { background-color: #EF4444; }
  .sb-stage-dot.yellow { background-color: #F59E0B; }
  .sb-stage-dot.green { background-color: #10B981; }
  .sb-stage-viewport {
    flex: 1;
    position: relative;
    min-height: 280px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .sb-stage-card-body {
    background: rgba(18, 18, 20, 0.8);
    border: 1px solid var(--sb-border-subtle);
    border-radius: 14px;
    padding: 20px;
  }
  .sb-stage-badge-tag {
    font-family: var(--sb-font-body-semibold);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--sb-crimson);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
  }
  .sb-stage-card-title {
    font-family: var(--sb-font-heading-bold);
    font-size: 1.125rem;
    font-weight: 700;
    color: #FFFFFF;
    margin-bottom: 14px;
  }
  .sb-stage-item {
    padding: 12px 14px;
    background: rgba(32, 33, 38, 0.7);
    border: 1px solid var(--sb-border-subtle);
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .sb-stage-item.selected {
    border-color: rgba(189, 32, 38, 0.4);
    background: rgba(40, 30, 32, 0.6);
  }
  .sb-stage-footer-callout {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid var(--sb-border-subtle);
    font-size: 0.875rem;
    color: var(--sb-text-secondary);
  }
  .sb-stage-summary-box {
    background: rgba(28, 29, 34, 0.7);
    border-radius: 10px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 0.875rem;
  }
  .sb-stage-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .sb-stage-pill-notice {
    margin-top: 12px;
    padding: 8px 12px;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.25);
    border-radius: 6px;
    color: #34D399;
    font-size: 0.8125rem;
    text-align: center;
  }
  .sb-stage-agenda-item {
    padding: 10px 14px;
    background: rgba(28, 29, 34, 0.6);
    border: 1px solid var(--sb-border-subtle);
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
  }
  .sb-stage-agenda-item.active-highlight {
    background: rgba(45, 30, 33, 0.7);
    border-color: var(--sb-crimson);
  }

  /* Pricing Section */
  .sb-pricing-section {
    padding: 64px 0;
  }
  .sb-pricing-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
    margin-top: 40px;
  }
  @media (min-width: 840px) {
    .sb-pricing-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }
  }
  .sb-pricing-card {
    padding: 32px 24px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .sb-pricing-price {
    font-family: var(--sb-font-heading);
    font-size: 1.875rem;
    font-weight: 800;
    color: var(--sb-text-primary);
    margin: 16px 0;
  }
  .sb-pricing-features {
    list-style: none;
    padding: 0;
    margin: 20px 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .sb-pricing-feature-item {
    font-size: 0.875rem;
    color: var(--sb-text-secondary);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .sb-pricing-feature-item::before {
    content: "✓";
    color: var(--sb-crimson);
    font-weight: 700;
  }

  /* FAQ Accordion */
  .sb-faq-section {
    padding: 64px 0;
  }
  .sb-faq-list {
    max-width: 760px;
    margin: 36px auto 0 auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .sb-faq-card {
    border-radius: 14px;
    overflow: hidden;
  }
  .sb-faq-trigger {
    width: 100%;
    min-height: 56px;
    padding: 16px 20px;
    background: transparent;
    border: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    color: var(--sb-text-primary);
    font-family: var(--sb-font-heading-bold);
    font-size: 1rem;
    font-weight: 700;
    text-align: left;
  }
  .sb-faq-chevron {
    transition: transform var(--sb-motion-fast) ease;
    font-size: 1.125rem;
    color: var(--sb-crimson);
  }
  .sb-faq-chevron.open {
    transform: rotate(180deg);
  }
  .sb-faq-content {
    padding: 0 20px 20px 20px;
    font-size: 0.9375rem;
    color: var(--sb-text-secondary);
    line-height: 1.6;
  }

  /* Footer CTA Panels & Form */
  .sb-footer-cta-section {
    padding: 64px 0 32px 0;
  }
  .sb-footer-panels-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
    margin-bottom: 48px;
  }
  @media (min-width: 840px) {
    .sb-footer-panels-grid {
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
  }
  .sb-footer-panel {
    padding: 28px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 16px;
  }

  /* Form Container */
  .sb-demo-form-card {
    padding: 32px 24px;
    max-width: 680px;
    margin: 0 auto 64px auto;
  }
  @media (min-width: 600px) {
    .sb-demo-form-card {
      padding: 40px 36px;
    }
  }
  .sb-form-group {
    margin-bottom: 20px;
  }
  .sb-form-label {
    display: block;
    font-family: var(--sb-font-body-semibold);
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--sb-text-primary);
  }
  .sb-form-input, .sb-form-textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 12px 14px;
    border-radius: 8px;
    border: 1px solid var(--sb-input-border);
    background: var(--sb-input-bg);
    color: var(--sb-text-primary);
    font-family: var(--sb-font-body);
    font-size: 1rem;
    min-height: 48px;
    transition: border-color var(--sb-motion-fast);
  }
  .sb-form-textarea {
    min-height: 96px;
    resize: vertical;
  }
  .sb-form-input:focus, .sb-form-textarea:focus {
    outline: none;
    border-color: var(--sb-input-focus);
    box-shadow: 0 0 0 3px var(--sb-crimson-glow);
  }
  .sb-form-input.has-error, .sb-form-textarea.has-error {
    border-color: #FF5C62;
  }
  .sb-field-error {
    color: #FF5C62;
    font-size: 0.8125rem;
    margin-top: 6px;
  }
  .sb-range-selector {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .sb-range-btn {
    min-height: 44px;
    border-radius: 8px;
    border: 1px solid var(--sb-border);
    background: var(--sb-surface-elevated);
    color: var(--sb-text-primary);
    font-family: var(--sb-font-body-semibold);
    font-weight: 600;
    cursor: pointer;
    transition: background-color var(--sb-motion-fast), border-color var(--sb-motion-fast);
  }
  .sb-range-btn.selected {
    background: var(--sb-crimson);
    color: #FFFFFF;
    border-color: var(--sb-crimson);
  }
  .sb-selected-plan-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(189, 32, 38, 0.15);
    border: 1px solid var(--sb-crimson);
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 0.875rem;
    color: var(--sb-text-primary);
    margin-bottom: 20px;
  }
  .sb-plan-clear-btn {
    background: none;
    border: none;
    color: var(--sb-text-muted);
    cursor: pointer;
    font-weight: bold;
    padding: 0 4px;
  }

  /* Form Fallback Box */
  .sb-handoff-fallback-box {
    margin-top: 24px;
    padding: 20px;
    background: rgba(32, 33, 38, 0.8);
    border-radius: 12px;
    border: 1px solid var(--sb-border);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .sb-commercial-unconfigured-notice {
    margin-top: 24px;
    padding: 20px;
    background: rgba(45, 30, 20, 0.7);
    border-radius: 12px;
    border: 1px solid rgba(245, 158, 11, 0.35);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .sb-fallback-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  .sb-btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0 16px;
    border-radius: 8px;
    background: var(--sb-surface);
    color: var(--sb-text-primary);
    border: 1px solid var(--sb-border);
    font-family: var(--sb-font-heading-bold);
    font-weight: 700;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color var(--sb-motion-fast);
  }
  .sb-btn-secondary:hover {
    background: var(--sb-surface-hover);
  }

  /* Modais Informativos Acessíveis */
  .sb-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
    box-sizing: border-box;
  }
  .sb-discovery-modal-card {
    max-width: 520px;
    width: 100%;
    padding: 28px;
    box-sizing: border-box;
  }
  .sb-modal-close-btn {
    background: transparent;
    border: none;
    color: var(--sb-text-muted);
    font-size: 1.25rem;
    cursor: pointer;
    min-width: 44px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: color var(--sb-motion-fast), background-color var(--sb-motion-fast);
  }
  .sb-modal-close-btn:hover {
    color: var(--sb-text-primary);
    background: rgba(255, 255, 255, 0.08);
  }

  /* Institutional Footer */
  .sb-footer {
    border-top: 1px solid var(--sb-border-subtle);
    padding: 48px 0 64px 0;
  }
  .sb-footer-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }
  @media (min-width: 840px) {
    .sb-footer-inner {
      flex-direction: row;
    }
  }
  .sb-footer-links {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 20px;
  }
  .sb-footer-link {
    color: var(--sb-text-muted);
    text-decoration: none;
    font-size: 0.875rem;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    transition: color var(--sb-motion-fast);
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    padding: 0;
  }
  .sb-footer-link:hover {
    color: var(--sb-text-primary);
  }

  /* Prefer Reduced Motion */
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
    .sb-product-story-sticky {
      position: static !important;
    }
    .sb-product-story-wrapper {
      min-height: auto !important;
    }
  }
`;
