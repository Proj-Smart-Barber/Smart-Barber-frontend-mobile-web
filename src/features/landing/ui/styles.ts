/**
 * Estilos CSS globais e modulares da Landing Page Web do Smart Barber.
 * Contém tokens dos temas Obsidian e Ivory, tipografia Inter e Epilogue,
 * classes obrigatórias tabular-nums e font-semibold, breakpoints e acessibilidade.
 */

export const landingStylesCss = `
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
    --sb-font-heading: 'Epilogue', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --sb-font-body: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
    --sb-border: rgba(255, 255, 255, 0.14);
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
    font-weight: 600;
    border-radius: 6px;
    z-index: 10000;
    text-decoration: none;
  }
  .sb-skip-link:focus {
    top: 16px;
  }

  /* Header */
  .sb-header {
    position: sticky;
    top: 0;
    z-index: 900;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    background-color: rgba(11, 11, 11, 0.85);
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
    gap: 12px;
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
    font-weight: 600;
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

  /* Hero Section */
  .sb-hero-section {
    padding: 48px 0 64px 0;
  }
  @media (min-width: 840px) {
    .sb-hero-section {
      padding: 72px 0 96px 0;
    }
  }
  .sb-hero-eyebrow {
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--sb-crimson);
    margin-bottom: 12px;
  }
  .sb-hero-headline {
    font-family: var(--sb-font-heading);
    font-weight: 800;
    font-size: 2.25rem;
    line-height: 1.15;
    letter-spacing: -0.03em;
    color: var(--sb-text-primary);
    margin: 0 0 16px 0;
    max-width: 780px;
  }
  @media (min-width: 840px) {
    .sb-hero-headline {
      font-size: 3.5rem;
    }
  }
  .sb-hero-support {
    font-size: 1.125rem;
    line-height: 1.5;
    color: var(--sb-text-secondary);
    max-width: 640px;
    margin: 0 0 36px 0;
  }
  .sb-hero-ctas-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 48px;
  }
  @media (min-width: 600px) {
    .sb-hero-ctas-grid {
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
  }
  .sb-hero-card {
    background: var(--sb-surface);
    border: 1px solid var(--sb-border);
    border-radius: 14px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 16px;
    box-shadow: var(--sb-card-shadow);
  }
  .sb-hero-card-tag {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--sb-crimson);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .sb-hero-card-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--sb-text-primary);
    margin: 0;
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
    font-weight: 600;
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
    background: var(--sb-surface);
    border: 1px solid var(--sb-border);
    border-radius: 16px;
    padding: 24px;
    overflow: hidden;
    box-shadow: var(--sb-card-shadow);
  }
  @media (min-width: 840px) {
    .sb-hero-mockup-wrapper {
      padding: 32px;
    }
  }
  .sb-mockup-tag {
    display: inline-block;
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
    background: var(--sb-surface-elevated);
    border: 1px solid var(--sb-border);
    border-radius: 12px;
    padding: 16px;
  }
  .sb-mockup-sync-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--sb-crimson);
    font-size: 0.8125rem;
    font-weight: 600;
    gap: 6px;
    padding: 12px 0;
  }
  .sb-mockup-tablet {
    background: var(--sb-surface-elevated);
    border: 1px solid var(--sb-border);
    border-radius: 12px;
    padding: 16px;
  }

  /* Faixa de Confiança (Social Proof) */
  .sb-trust-section {
    padding: 48px 0;
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
    font-size: 1.875rem;
    letter-spacing: -0.02em;
    margin: 0 0 12px 0;
    color: var(--sb-text-primary);
  }
  @media (min-width: 840px) {
    .sb-section-title {
      font-size: 2.5rem;
    }
  }
  .sb-section-subtitle {
    font-size: 1.0625rem;
    color: var(--sb-text-secondary);
    max-width: 600px;
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
    background: var(--sb-surface);
    border: 1px solid var(--sb-border);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .sb-card-badge {
    align-self: flex-start;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--sb-crimson);
    background: rgba(189, 32, 38, 0.12);
    padding: 3px 8px;
    border-radius: 4px;
    margin-bottom: 12px;
  }
  .sb-trust-card-highlight {
    font-size: 1.75rem;
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
    background: var(--sb-surface);
    border: 1px solid var(--sb-border);
    border-radius: 14px;
    padding: 28px;
  }
  .sb-problem-card.organized {
    border-color: var(--sb-crimson);
    box-shadow: 0 0 24px var(--sb-crimson-glow);
  }
  .sb-column-heading {
    font-family: var(--sb-font-heading);
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
    background: var(--sb-surface);
    border: 1px solid var(--sb-border);
    border-radius: 14px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: transform var(--sb-motion-fast), border-color var(--sb-motion-fast);
  }
  .sb-bento-card:hover {
    transform: translateY(-2px);
    border-color: rgba(189, 32, 38, 0.4);
  }
  .sb-btn-example {
    background: transparent;
    border: 1px solid var(--sb-border);
    border-radius: 6px;
    padding: 8px 14px;
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

  /* How it Works / Scrollytelling */
  .sb-how-section {
    padding: 64px 0;
  }
  .sb-tracks-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: 32px;
    margin-top: 40px;
  }
  @media (min-width: 840px) {
    .sb-tracks-container {
      grid-template-columns: 1fr 1fr;
      gap: 32px;
    }
  }
  .sb-track-card {
    background: var(--sb-surface);
    border: 1px solid var(--sb-border);
    border-radius: 14px;
    padding: 28px;
  }
  .sb-step-item {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
  }
  .sb-step-number {
    font-family: var(--sb-font-heading);
    font-weight: 800;
    font-size: 1.25rem;
    color: var(--sb-crimson);
    min-width: 32px;
  }

  /* Scrollytelling Desktop Sticky Visual */
  .sb-scrolly-container {
    margin-top: 48px;
    display: none;
  }
  @media (min-width: 840px) {
    .sb-scrolly-container {
      display: block;
    }
  }
  .sb-scrolly-layout {
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    gap: 32px;
  }
  .sb-scrolly-sticky-panel {
    position: sticky;
    top: 100px;
    background: var(--sb-surface);
    border: 1px solid var(--sb-border);
    border-radius: 16px;
    padding: 32px;
    box-shadow: var(--sb-card-shadow);
    min-height: 380px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .sb-scrolly-nav-btns {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
  }
  .sb-scrolly-btn {
    flex: 1;
    min-height: 44px;
    border-radius: 8px;
    border: 1px solid var(--sb-border);
    background: var(--sb-surface-elevated);
    color: var(--sb-text-secondary);
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color var(--sb-motion-fast), color var(--sb-motion-fast);
  }
  .sb-scrolly-btn.active {
    background: var(--sb-crimson);
    color: #FFFFFF;
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
    background: var(--sb-surface);
    border: 1px solid var(--sb-border);
    border-radius: 16px;
    padding: 32px 24px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: var(--sb-card-shadow);
  }
  .sb-pricing-card.featured {
    border: 2px solid var(--sb-crimson);
    box-shadow: 0 0 28px var(--sb-crimson-glow);
    position: relative;
  }
  .sb-pricing-price {
    font-size: 2rem;
    color: var(--sb-text-primary);
    margin: 16px 0;
  }
  .sb-pricing-features {
    list-style: none;
    padding: 0;
    margin: 24px 0;
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
    background: var(--sb-surface);
    border: 1px solid var(--sb-border);
    border-radius: 12px;
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
    font-size: 1rem;
    font-weight: 600;
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
    animation: sb-fade-in var(--sb-motion-fast) ease;
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
    background: var(--sb-surface);
    border: 1px solid var(--sb-border);
    border-radius: 14px;
    padding: 28px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 16px;
  }

  /* Form Container */
  .sb-demo-form-card {
    background: var(--sb-surface);
    border: 1px solid var(--sb-border);
    border-radius: 16px;
    padding: 32px 24px;
    max-width: 680px;
    margin: 0 auto 64px auto;
    box-shadow: var(--sb-card-shadow);
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
    font-size: 0.9375rem;
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
    background: var(--sb-surface-elevated);
    border-radius: 12px;
    border: 1px solid var(--sb-border);
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
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color var(--sb-motion-fast);
  }
  .sb-btn-secondary:hover {
    background: var(--sb-surface-hover);
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
  }
  .sb-footer-link:hover {
    color: var(--sb-text-primary);
  }

  /* Animations & Keyframes */
  @keyframes sb-fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* Prefer Reduced Motion */
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
    .sb-scrolly-sticky-panel {
      position: static !important;
    }
  }
`;
