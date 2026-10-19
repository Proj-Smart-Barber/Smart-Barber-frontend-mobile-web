import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useSession } from '@/features/auth';
import { landingContent, BentoItem } from '../content/landing-content';
import { landingConfig } from '../lib/config';
import { trackLandingEvent } from '../lib/analytics';
import { validateDemoForm, DemoFormData, DemoFormErrors, ProfessionalsRange } from '../model/demo-form';
import { buildWhatsAppUrl, buildWhatsAppMessage, copyMessageToClipboard } from '../lib/whatsapp';
import { landingStylesCss } from './styles';
import { LandingGlass } from './LandingGlass.web';
import { AnimatedBrand } from './AnimatedBrand.web';
import { ProductStory } from './ProductStory.web';
import { DiscoveryNoticeModal } from './DiscoveryNoticeModal.web';
import { LegalNoticeModal } from './LegalNoticeModal.web';
import { landingMotionTokens } from '../lib/landing-motion-tokens';

export function LandingPage(): React.ReactElement {
  const { status } = useSession();
  const shouldReduceMotion = useReducedMotion();

  // Estado do formulário comercial
  const [formData, setFormData] = useState<DemoFormData>({
    nome: '',
    barbearia: '',
    cidadeUf: '',
    profissionais: '2-5',
    necessidade: '',
    configuracao: '',
  });

  const [formErrors, setFormErrors] = useState<DemoFormErrors>({});
  const [hasStartedForm, setHasStartedForm] = useState(false);
  const [preparedUrl, setPreparedUrl] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [manualCopyFallback, setManualCopyFallback] = useState(false);

  // Estados de modais e UI interativa
  const [isDiscoveryModalOpen, setIsDiscoveryModalOpen] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy' | null>(null);
  const [activeFaqId, setActiveFaqId] = useState<string | null>(null);
  const [expandedBentoId, setExpandedBentoId] = useState<string | null>(null);

  // Desbloqueio explícito de rolagem da janela para o navegador web
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const originalHtmlOverflowY = document.documentElement.style.overflowY;
      const originalHtmlOverflowX = document.documentElement.style.overflowX;
      const originalBodyOverflowY = document.body.style.overflowY;
      const originalBodyOverflowX = document.body.style.overflowX;
      const originalHtmlHeight = document.documentElement.style.height;
      const originalBodyHeight = document.body.style.height;

      document.documentElement.style.overflowY = 'auto';
      document.documentElement.style.overflowX = 'hidden';
      document.documentElement.style.height = 'auto';
      document.body.style.overflowY = 'auto';
      document.body.style.overflowX = 'hidden';
      document.body.style.height = 'auto';

      return () => {
        document.documentElement.style.overflowY = originalHtmlOverflowY;
        document.documentElement.style.overflowX = originalHtmlOverflowX;
        document.body.style.overflowY = originalBodyOverflowY;
        document.body.style.overflowX = originalBodyOverflowX;
        document.documentElement.style.height = originalHtmlHeight;
        document.body.style.height = originalBodyHeight;
      };
    }
  }, []);

  // Refs para acessibilidade e foco
  const formTitleRef = useRef<HTMLHeadingElement | null>(null);
  const nomeInputRef = useRef<HTMLInputElement | null>(null);
  const barbeariaInputRef = useRef<HTMLInputElement | null>(null);
  const cidadeUfInputRef = useRef<HTMLInputElement | null>(null);
  const necessidadeInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Seleção de plano vindo dos cards de Pricing
  const handleSelectPlan = useCallback((planName: string) => {
    setFormData((prev) => ({ ...prev, configuracao: planName }));
    setPreparedUrl(null); // Invalida URL antiga quando altera plano
    trackLandingEvent({
      name: 'landing_cta_click',
      properties: { audience: 'barber', position: 'pricing', target: planName },
    });

    // Rola suavemente até o formulário e posiciona o foco no título
    const formElement = document.getElementById('demonstracao');
    if (formElement) {
      formElement.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' });
      setTimeout(() => {
        formTitleRef.current?.focus();
      }, 300);
    }
  }, [shouldReduceMotion]);

  // Manipulação de campos do formulário (invalida preparedUrl ao editar)
  const handleInputChange = (field: keyof DemoFormData, value: string) => {
    if (!hasStartedForm) {
      setHasStartedForm(true);
      trackLandingEvent({ name: 'demo_form_start', properties: { origin: 'direct' } });
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
    setPreparedUrl(null); // Invalidação imediata para evitar reaproveitamento de dados desatualizados
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Clique no CTA de Cliente
  const handleClientCtaClick = (e: React.MouseEvent, position: 'hero' | 'footer') => {
    trackLandingEvent({
      name: 'landing_cta_click',
      properties: { audience: 'client', position, target: landingContent.hero.clientCta.action },
    });

    if (!landingConfig.enableDiscovery) {
      e.preventDefault();
      setIsDiscoveryModalOpen(true);
    }
  };

  // Envio do formulário e handoff para WhatsApp
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateDemoForm(formData);
    if (!validation.success || !validation.data) {
      setFormErrors(validation.errors ?? {});
      if (validation.firstErrorField === 'nome') nomeInputRef.current?.focus();
      else if (validation.firstErrorField === 'barbearia') barbeariaInputRef.current?.focus();
      else if (validation.firstErrorField === 'cidadeUf') cidadeUfInputRef.current?.focus();
      else if (validation.firstErrorField === 'necessidade') necessidadeInputRef.current?.focus();
      return;
    }

    setFormErrors({});

    // Evento analítico estritamente categórico sem PII
    trackLandingEvent({
      name: 'demo_form_valid',
      properties: {
        professionalsRange: validation.data.profissionais,
        hasConfiguration: Boolean(validation.data.configuracao),
        hasNeed: Boolean(validation.data.necessidade && validation.data.necessidade.length > 0),
      },
    });

    if (!landingConfig.isWhatsAppConfigured) {
      // Feedback transparente quando o canal comercial ainda não possui número configurado no ambiente
      setPreparedUrl('pending_configuration');
      return;
    }

    const url = buildWhatsAppUrl(landingConfig.whatsAppNumber, validation.data);
    setPreparedUrl(url);

    trackLandingEvent({
      name: 'whatsapp_handoff_click',
      properties: {
        professionalsRange: validation.data.profissionais,
        hasConfiguration: Boolean(validation.data.configuracao),
        hasNeed: Boolean(validation.data.necessidade && validation.data.necessidade.length > 0),
      },
    });

    // Abertura segura no browser sem bloqueio de pop-up
    if (typeof window !== 'undefined' && url) {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = url;
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  // Ação de copiar texto para área de transferência
  const handleCopyMessage = async () => {
    const message = buildWhatsAppMessage(formData);
    const success = await copyMessageToClipboard(message);
    if (success) {
      setCopiedSuccess(true);
      setManualCopyFallback(false);
      setTimeout(() => setCopiedSuccess(false), 3000);
    } else {
      setManualCopyFallback(true);
    }
  };

  // Re-abertura da conversa
  const handleReopenConversation = () => {
    if (!preparedUrl || preparedUrl === 'pending_configuration') return;
    if (typeof window !== 'undefined') {
      window.open(preparedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Toggle do FAQ
  const toggleFaq = (id: string) => {
    setActiveFaqId((prev) => (prev === id ? null : id));
  };

  // Toggle do Bento Grid Example
  const toggleBentoExample = (id: string) => {
    setExpandedBentoId((prev) => (prev === id ? null : id));
  };

  const isAuthenticated = status === 'authenticated';
  const authDestination = isAuthenticated ? '/(app)' : '/(auth)/login';
  const authLabel = isAuthenticated ? landingContent.header.authenticatedAction : landingContent.header.loginAction;

  return (
    <div className="sb-landing-root theme-obsidian">
      <style dangerouslySetInnerHTML={{ __html: landingStylesCss }} />

      {/* Acessibilidade: Skip link */}
      <a href="#conteudo-principal" className="sb-skip-link">
        Pular para o conteúdo principal
      </a>

      {/* 1. Header com Liquid Glass e Marca Animada */}
      <header className="sb-header" role="banner">
        <div className="sb-container sb-header-inner">
          <a href="#inicio" className="sb-logo-link" aria-label="Smart Barber - Página Inicial">
            <AnimatedBrand variant="header" size={34} />
          </a>

          <nav className="sb-nav-menu" aria-label="Navegação principal">
            {landingContent.header.links.map((link) => (
              <a key={link.href} href={link.href} className="sb-nav-link">
                {link.label}
              </a>
            ))}
          </nav>

          <a
            href={authDestination}
            className="sb-btn-auth"
            onClick={() =>
              trackLandingEvent({
                name: 'landing_cta_click',
                properties: { audience: 'barber', position: 'header', target: authLabel },
              })
            }
          >
            {authLabel}
          </a>
        </div>
      </header>

      <main id="conteudo-principal">
        {/* 2. Hero Section Cinematográfica */}
        <section id="inicio" className="sb-hero-section">
          <div className="sb-container">
            <div className="sb-hero-eyebrow">{landingContent.hero.eyebrow}</div>
            <h1 className="sb-hero-headline">{landingContent.hero.headline}</h1>
            <p className="sb-hero-support">{landingContent.hero.support}</p>

            {/* Dois CTAs equivalentes acima da dobra */}
            <div className="sb-hero-ctas-grid">
              <LandingGlass variant="card" className="sb-hero-card">
                <div>
                  <span className="sb-hero-card-tag">{landingContent.hero.clientCta.tag}</span>
                  <h2 className="sb-hero-card-title">{landingContent.hero.clientCta.title}</h2>
                </div>
                <a
                  href={landingConfig.discoveryPath || '#'}
                  className="sb-btn-primary"
                  onClick={(e) => handleClientCtaClick(e, 'hero')}
                >
                  {landingContent.hero.clientCta.action}
                </a>
              </LandingGlass>

              <LandingGlass variant="card" className="sb-hero-card">
                <div>
                  <span className="sb-hero-card-tag">{landingContent.hero.barberCta.tag}</span>
                  <h2 className="sb-hero-card-title">{landingContent.hero.barberCta.title}</h2>
                </div>
                <a
                  href="#demonstracao"
                  className="sb-btn-primary"
                  onClick={() =>
                    trackLandingEvent({
                      name: 'landing_cta_click',
                      properties: { audience: 'barber', position: 'hero', target: landingContent.hero.barberCta.action },
                    })
                  }
                >
                  {landingContent.hero.barberCta.action}
                </a>
              </LandingGlass>
            </div>

            {/* Mockup Cinematográfico Conectando Catálogo à Agenda */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: landingMotionTokens.duration.slow, ease: landingMotionTokens.easing.cinematic }}
            >
              <LandingGlass variant="card-elevated" className="sb-hero-mockup-wrapper">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <span className="sb-mockup-tag" style={{ margin: 0 }}>
                    {landingContent.hero.mockupNotice}
                  </span>
                  <div style={{ opacity: 0.9 }}>
                    <AnimatedBrand variant="hero" size={26} showText={false} />
                  </div>
                </div>

                <div className="sb-mockup-columns">
                  {/* Catálogo do Cliente */}
                  <div className="sb-mockup-phone">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--sb-font-heading-bold)', fontWeight: 700 }}>
                        Barbearia Navalha & Estilo
                      </span>
                      <span className="sb-card-badge" style={{ margin: 0 }}>Catálogo</span>
                    </div>
                    <div style={{ padding: 12, background: 'rgba(32, 33, 38, 0.7)', borderRadius: 8, marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Corte Tradicional Degradê</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <span className="tabular-nums font-semibold" style={{ color: 'var(--sb-crimson)' }}>R$ 55,00</span>
                        <span className="tabular-nums font-semibold" style={{ fontSize: '0.8125rem', color: 'var(--sb-text-muted)' }}>30 min</span>
                      </div>
                    </div>
                    <div style={{ padding: 12, background: 'rgba(32, 33, 38, 0.7)', borderRadius: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Barba Terapia Completa</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <span className="tabular-nums font-semibold" style={{ color: 'var(--sb-crimson)' }}>R$ 35,00</span>
                        <span className="tabular-nums font-semibold" style={{ fontSize: '0.8125rem', color: 'var(--sb-text-muted)' }}>25 min</span>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, fontSize: '0.8125rem', color: 'var(--sb-text-secondary)' }}>
                      Horário escolhido: <strong className="tabular-nums font-semibold" style={{ color: '#FFF' }}>16:30</strong> com <strong className="font-semibold" style={{ color: '#FFF' }}>Marcos Silva</strong>
                    </div>
                  </div>

                  {/* Indicador de Sincronização */}
                  <div className="sb-mockup-sync-indicator" aria-hidden="true">
                    <span style={{ fontSize: '1.5rem' }}>➔</span>
                    <span>Fluxo Integrado</span>
                  </div>

                  {/* Agenda da Barbearia */}
                  <div className="sb-mockup-tablet">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--sb-font-heading-bold)', fontWeight: 700 }}>
                        Grade Operacional do Dia
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)' }}>Sexta-feira</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ padding: 8, background: 'rgba(32, 33, 38, 0.7)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="tabular-nums font-semibold" style={{ fontSize: '0.8125rem' }}>15:30 - 16:00</span>
                        <span style={{ fontSize: '0.8125rem' }}>Lucas Prado • Barba</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)' }}>Concluído</span>
                      </div>
                      <div style={{ padding: 8, background: 'rgba(45, 30, 32, 0.7)', border: '1px solid var(--sb-crimson)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="tabular-nums font-semibold" style={{ fontSize: '0.8125rem', color: '#FFF' }}>16:30 - 17:25</span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#FFF' }}>Corte & Barba • R$ 90,00</span>
                        <span style={{ fontSize: '0.75rem', color: '#4ADE80', fontWeight: 600 }}>● Confirmado</span>
                      </div>
                      <div style={{ padding: 8, background: 'rgba(32, 33, 38, 0.7)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="tabular-nums font-semibold" style={{ fontSize: '0.8125rem', color: 'var(--sb-text-muted)' }}>17:30 - 18:00</span>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--sb-text-muted)' }}>Horário livre na grade</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)' }}>Disponível</span>
                      </div>
                    </div>
                  </div>
                </div>
              </LandingGlass>
            </motion.div>
          </div>
        </section>

        {/* 3. Faixa de Confiança com Viewport Animation */}
        <section className="sb-trust-section" aria-labelledby="trust-heading">
          <div className="sb-container">
            <div className="sb-section-title-wrap">
              <h2 id="trust-heading" className="sb-section-title">{landingContent.trust.headline}</h2>
              <p className="sb-section-subtitle">{landingContent.trust.subtitle}</p>
            </div>

            <div className="sb-trust-grid">
              {landingContent.trust.items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{
                    duration: landingMotionTokens.duration.normal,
                    delay: index * landingMotionTokens.stagger.default,
                    ease: landingMotionTokens.easing.cinematic,
                  }}
                >
                  <LandingGlass variant="card" className="sb-trust-card">
                    <div>
                      <span className="sb-card-badge">{item.badge}</span>
                      <h3 style={{ fontFamily: 'var(--sb-font-heading-bold)', fontSize: '1.125rem', fontWeight: 700, margin: '8px 0 4px 0' }}>
                        {item.title}
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--sb-text-secondary)', margin: 0 }}>
                        {item.description}
                      </p>
                    </div>
                    <div>
                      <div className="sb-trust-card-highlight tabular-nums font-semibold">{item.highlight}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--sb-text-muted)' }}>{item.meta}</div>
                    </div>
                  </LandingGlass>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Problema vs Solução Integrada */}
        <section id="para-barbearias" className="sb-problem-section" aria-labelledby="problem-heading">
          <div className="sb-container">
            <div className="sb-section-title-wrap">
              <h2 id="problem-heading" className="sb-section-title">{landingContent.problem.headline}</h2>
              <p className="sb-section-subtitle">{landingContent.problem.subtitle}</p>
            </div>

            <div className="sb-comparison-grid">
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: landingMotionTokens.duration.slow, ease: landingMotionTokens.easing.cinematic }}
              >
                <LandingGlass variant="card" className="sb-problem-card">
                  <h3 className="sb-column-heading" style={{ color: 'var(--sb-text-muted)' }}>
                    {landingContent.problem.beforeTitle}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {landingContent.problem.beforePoints.map((pt, idx) => (
                      <div key={idx} style={{ padding: 14, background: 'rgba(255, 255, 255, 0.03)', borderRadius: 10, borderLeft: '3px solid #666' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--sb-text-muted)', display: 'block', marginBottom: 4 }}>
                          {pt.author}
                        </span>
                        <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--sb-text-secondary)', fontStyle: 'italic' }}>
                          "{pt.quote}"
                        </p>
                      </div>
                    ))}
                  </div>
                </LandingGlass>
              </motion.div>

              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: landingMotionTokens.duration.slow, ease: landingMotionTokens.easing.cinematic }}
              >
                <LandingGlass variant="card-elevated" className="sb-problem-card">
                  <h3 className="sb-column-heading" style={{ color: 'var(--sb-text-primary)' }}>
                    {landingContent.problem.afterTitle}
                  </h3>
                  <p style={{ fontSize: '1rem', color: 'var(--sb-text-primary)', fontWeight: 600, marginBottom: 20 }}>
                    {landingContent.problem.afterResolution}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {landingContent.problem.afterSteps.map((step, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ color: 'var(--sb-crimson)', fontWeight: 700, fontSize: '1.125rem' }}>✓</span>
                        <span style={{ fontSize: '0.9375rem', color: 'var(--sb-text-secondary)' }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </LandingGlass>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 5. Bento Grid Modular */}
        <section className="sb-bento-section" aria-labelledby="bento-heading">
          <div className="sb-container">
            <div className="sb-section-title-wrap">
              <h2 id="bento-heading" className="sb-section-title">{landingContent.bento.headline}</h2>
              <p className="sb-section-subtitle">{landingContent.bento.subtitle}</p>
            </div>

            <div className="sb-bento-grid">
              {landingContent.bento.items.map((item: BentoItem, index: number) => {
                const isExpanded = expandedBentoId === item.id;
                return (
                  <motion.div
                    key={item.id}
                    className={item.span === 'wide' ? 'sb-bento-item-wide' : ''}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{
                      duration: landingMotionTokens.duration.normal,
                      delay: (index % 3) * landingMotionTokens.stagger.default,
                      ease: landingMotionTokens.easing.cinematic,
                    }}
                  >
                    <LandingGlass variant={item.span === 'wide' ? 'card-elevated' : 'card'} className="sb-bento-card">
                      <div>
                        <span className="sb-card-badge">{item.badge}</span>
                        <h3 style={{ fontFamily: 'var(--sb-font-heading-bold)', fontSize: '1.25rem', fontWeight: 700, margin: '8px 0' }}>
                          {item.title}
                        </h3>
                        <p style={{ fontSize: '0.9375rem', color: 'var(--sb-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                          {item.description}
                        </p>
                      </div>

                      <div>
                        <button
                          type="button"
                          className="sb-btn-example"
                          onClick={() => toggleBentoExample(item.id)}
                          aria-expanded={isExpanded}
                          aria-controls={`bento-example-${item.id}`}
                        >
                          {isExpanded ? 'Ocultar detalhe ▲' : 'Ver demonstração ▼'}
                        </button>

                        {isExpanded && (
                          <div id={`bento-example-${item.id}`} className="sb-bento-example-box" role="region">
                            <strong style={{ display: 'block', color: 'var(--sb-text-primary)', marginBottom: 4 }}>
                              {item.exampleTitle}
                            </strong>
                            {item.exampleDetail}
                          </div>
                        )}
                      </div>
                    </LandingGlass>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 6. Demonstração de Fluxo com Palco Cinematográfico Contínuo */}
        <section id="como-funciona" className="sb-how-section" aria-labelledby="how-heading">
          <ProductStory />
        </section>

        {/* 7. Planos e Preços (Três níveis sob consulta) */}
        <section id="precos" className="sb-pricing-section" aria-labelledby="pricing-heading">
          <div className="sb-container">
            <div className="sb-section-title-wrap">
              <h2 id="pricing-heading" className="sb-section-title">{landingContent.pricing.headline}</h2>
              <p className="sb-section-subtitle">{landingContent.pricing.subtitle}</p>
            </div>

            <div className="sb-pricing-grid">
              {landingContent.pricing.plans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{
                    duration: landingMotionTokens.duration.normal,
                    delay: index * landingMotionTokens.stagger.default,
                    ease: landingMotionTokens.easing.cinematic,
                  }}
                >
                  <LandingGlass
                    variant={plan.isFeatured ? 'card-elevated' : 'card'}
                    className="sb-pricing-card"
                  >
                    <div>
                      {plan.badge && <span className="sb-card-badge">{plan.badge}</span>}
                      <h3 style={{ fontFamily: 'var(--sb-font-heading-bold)', fontSize: '1.5rem', fontWeight: 700, margin: '8px 0 6px 0' }}>
                        {plan.name}
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--sb-text-secondary)', margin: '0 0 16px 0' }}>
                        {plan.target}
                      </p>

                      <div className="sb-pricing-price tabular-nums font-semibold">{plan.price}</div>

                      <ul className="sb-pricing-features">
                        {plan.features.map((feat, fi) => (
                          <li key={fi} className="sb-pricing-feature-item">
                            {feat}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      className="sb-btn-primary"
                      style={{ width: '100%', marginTop: 16 }}
                      onClick={() => handleSelectPlan(plan.name)}
                    >
                      {plan.ctaLabel}
                    </button>
                  </LandingGlass>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. FAQ Estratégico */}
        <section id="faq" className="sb-faq-section" aria-labelledby="faq-heading">
          <div className="sb-container">
            <div className="sb-section-title-wrap">
              <h2 id="faq-heading" className="sb-section-title">{landingContent.faq.headline}</h2>
              <p className="sb-section-subtitle">{landingContent.faq.subtitle}</p>
            </div>

            <div className="sb-faq-list" role="region" aria-label="Perguntas frequentes">
              {landingContent.faq.items.map((item) => {
                const isOpen = activeFaqId === item.id;
                return (
                  <LandingGlass key={item.id} variant="card" className="sb-faq-card">
                    <button
                      type="button"
                      className="sb-faq-trigger"
                      onClick={() => toggleFaq(item.id)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${item.id}`}
                      id={`faq-trigger-${item.id}`}
                    >
                      <span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--sb-crimson)', textTransform: 'uppercase', marginRight: 8, fontWeight: 700 }}>
                          [{item.category}]
                        </span>
                        {item.question}
                      </span>
                      <span className={`sb-faq-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true">
                        ▼
                      </span>
                    </button>

                    {isOpen && (
                      <div
                        id={`faq-answer-${item.id}`}
                        role="region"
                        aria-labelledby={`faq-trigger-${item.id}`}
                        className="sb-faq-content"
                      >
                        {item.answer}
                      </div>
                    )}
                  </LandingGlass>
                );
              })}
            </div>
          </div>
        </section>

        {/* 9. Footer CTA & Formulário Comercial */}
        <section className="sb-footer-cta-section" aria-labelledby="cta-heading">
          <div className="sb-container">
            <div className="sb-section-title-wrap">
              <h2 id="cta-heading" className="sb-section-title">{landingContent.footer.headline}</h2>
              <p className="sb-section-subtitle">{landingContent.footer.subtitle}</p>
            </div>

            {/* Dois painéis finais equivalentes */}
            <div className="sb-footer-panels-grid">
              <LandingGlass variant="card" className="sb-footer-panel">
                <div>
                  <span className="sb-card-badge">{landingContent.footer.clientPanel.tag}</span>
                  <h3 style={{ fontFamily: 'var(--sb-font-heading-bold)', fontSize: '1.25rem', fontWeight: 700, margin: '8px 0' }}>
                    {landingContent.footer.clientPanel.title}
                  </h3>
                  <p style={{ fontSize: '0.9375rem', color: 'var(--sb-text-secondary)', margin: 0 }}>
                    {landingContent.footer.clientPanel.description}
                  </p>
                </div>
                <a
                  href={landingConfig.discoveryPath || '#'}
                  className="sb-btn-primary"
                  onClick={(e) => handleClientCtaClick(e, 'footer')}
                >
                  {landingContent.footer.clientPanel.action}
                </a>
              </LandingGlass>

              <LandingGlass variant="card" className="sb-footer-panel">
                <div>
                  <span className="sb-card-badge">{landingContent.footer.barberPanel.tag}</span>
                  <h3 style={{ fontFamily: 'var(--sb-font-heading-bold)', fontSize: '1.25rem', fontWeight: 700, margin: '8px 0' }}>
                    {landingContent.footer.barberPanel.title}
                  </h3>
                  <p style={{ fontSize: '0.9375rem', color: 'var(--sb-text-secondary)', margin: 0 }}>
                    {landingContent.footer.barberPanel.description}
                  </p>
                </div>
                <a
                  href="#demonstracao"
                  className="sb-btn-primary"
                  onClick={() =>
                    trackLandingEvent({
                      name: 'landing_cta_click',
                      properties: { audience: 'barber', position: 'footer', target: landingContent.footer.barberPanel.action },
                    })
                  }
                >
                  {landingContent.footer.barberPanel.action}
                </a>
              </LandingGlass>
            </div>

            {/* Formulário Comercial Inline #demonstracao com Liquid Glass Form */}
            <LandingGlass variant="form" className="sb-demo-form-card" id="demonstracao" tabIndex={-1}>
              <h3
                ref={formTitleRef}
                tabIndex={-1}
                style={{ fontFamily: 'var(--sb-font-heading)', fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px 0', outline: 'none' }}
              >
                {landingContent.footer.formTitle}
              </h3>
              <p style={{ fontSize: '0.9375rem', color: 'var(--sb-text-secondary)', margin: '0 0 24px 0' }}>
                {landingContent.footer.formSubtitle}
              </p>

              {/* Indicador de plano pré-selecionado */}
              {formData.configuracao && (
                <div className="sb-selected-plan-badge">
                  <span>Configuração selecionada: <strong className="font-semibold">{formData.configuracao}</strong></span>
                  <button
                    type="button"
                    className="sb-plan-clear-btn"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, configuracao: '' }));
                      setPreparedUrl(null);
                    }}
                    aria-label="Remover configuração selecionada"
                  >
                    ✕
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmitForm} noValidate>
                {/* Nome */}
                <div className="sb-form-group">
                  <label htmlFor="sb-form-nome" className="sb-form-label">
                    Seu nome completo *
                  </label>
                  <input
                    id="sb-form-nome"
                    ref={nomeInputRef}
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    className={`sb-form-input ${formErrors.nome ? 'has-error' : ''}`}
                    placeholder="Ex: João da Silva"
                    aria-invalid={Boolean(formErrors.nome)}
                    aria-describedby={formErrors.nome ? 'err-nome' : undefined}
                  />
                  {formErrors.nome && <div id="err-nome" className="sb-field-error">{formErrors.nome}</div>}
                </div>

                {/* Barbearia */}
                <div className="sb-form-group">
                  <label htmlFor="sb-form-barbearia" className="sb-form-label">
                    Nome da sua barbearia *
                  </label>
                  <input
                    id="sb-form-barbearia"
                    ref={barbeariaInputRef}
                    type="text"
                    required
                    value={formData.barbearia}
                    onChange={(e) => handleInputChange('barbearia', e.target.value)}
                    className={`sb-form-input ${formErrors.barbearia ? 'has-error' : ''}`}
                    placeholder="Ex: Barbearia Estilo Clássico"
                    aria-invalid={Boolean(formErrors.barbearia)}
                    aria-describedby={formErrors.barbearia ? 'err-barbearia' : undefined}
                  />
                  {formErrors.barbearia && <div id="err-barbearia" className="sb-field-error">{formErrors.barbearia}</div>}
                </div>

                {/* Cidade / UF */}
                <div className="sb-form-group">
                  <label htmlFor="sb-form-cidade" className="sb-form-label">
                    Cidade e Estado *
                  </label>
                  <input
                    id="sb-form-cidade"
                    ref={cidadeUfInputRef}
                    type="text"
                    required
                    value={formData.cidadeUf}
                    onChange={(e) => handleInputChange('cidadeUf', e.target.value)}
                    className={`sb-form-input ${formErrors.cidadeUf ? 'has-error' : ''}`}
                    placeholder="Ex: São Paulo / SP"
                    aria-invalid={Boolean(formErrors.cidadeUf)}
                    aria-describedby={formErrors.cidadeUf ? 'err-cidade' : undefined}
                  />
                  {formErrors.cidadeUf && <div id="err-cidade" className="sb-field-error">{formErrors.cidadeUf}</div>}
                </div>

                {/* Faixa de profissionais */}
                <div className="sb-form-group">
                  <span className="sb-form-label">Quantidade de profissionais atendendo *</span>
                  <div className="sb-range-selector" role="radiogroup" aria-label="Quantidade de profissionais">
                    {(['1', '2-5', '6-10', '11+'] as ProfessionalsRange[]).map((range) => (
                      <button
                        key={range}
                        type="button"
                        role="radio"
                        aria-checked={formData.profissionais === range}
                        className={`sb-range-btn tabular-nums font-semibold ${
                          formData.profissionais === range ? 'selected' : ''
                        }`}
                        onClick={() => handleInputChange('profissionais', range)}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                  {formErrors.profissionais && (
                    <div className="sb-field-error">{formErrors.profissionais}</div>
                  )}
                </div>

                {/* Principal necessidade */}
                <div className="sb-form-group">
                  <label htmlFor="sb-form-necessidade" className="sb-form-label">
                    Principal desafio ou necessidade (opcional)
                  </label>
                  <textarea
                    id="sb-form-necessidade"
                    ref={necessidadeInputRef}
                    rows={3}
                    maxLength={240}
                    value={formData.necessidade}
                    onChange={(e) => handleInputChange('necessidade', e.target.value)}
                    className="sb-form-textarea"
                    placeholder="Ex: Reduzir tempo no WhatsApp e organizar os horários da equipe..."
                  />
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--sb-text-muted)', marginTop: 4 }}>
                    <span className="tabular-nums font-semibold">{formData.necessidade?.length ?? 0}</span> / 240
                  </div>
                </div>

                <div style={{ margin: '24px 0 16px 0' }}>
                  <button type="submit" className="sb-btn-primary" style={{ width: '100%', minHeight: 52 }}>
                    Continuar no WhatsApp
                  </button>
                </div>

                <p style={{ fontSize: '0.8125rem', color: 'var(--sb-text-muted)', margin: 0, textAlign: 'center' }}>
                  {landingContent.footer.formNotice}
                </p>
              </form>

              {/* Bloco de feedback caso o canal comercial não esteja configurado */}
              {preparedUrl === 'pending_configuration' && (
                <div className="sb-commercial-unconfigured-notice" role="status">
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#F59E0B' }}>
                    Canal direto em homologação técnica
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--sb-text-secondary)', lineHeight: 1.5 }}>
                    O número comercial de WhatsApp ainda não foi configurado neste ambiente.
                    Seus dados foram validados e estão preservados abaixo. Você pode copiar a mensagem para enviá-la diretamente:
                  </div>
                  <div className="sb-fallback-actions">
                    <button type="button" className="sb-btn-secondary" onClick={handleCopyMessage}>
                      {copiedSuccess ? '✓ Mensagem copiada!' : 'Copiar mensagem estruturada'}
                    </button>
                  </div>
                  {manualCopyFallback && (
                    <div style={{ marginTop: 12 }}>
                      <textarea
                        readOnly
                        value={buildWhatsAppMessage(formData)}
                        className="sb-form-textarea"
                        style={{ fontSize: '0.8125rem' }}
                        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Caixa de fallback caso a URL esteja preparada */}
              {preparedUrl && preparedUrl !== 'pending_configuration' && (
                <div className="sb-handoff-fallback-box" role="status">
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--sb-text-primary)' }}>
                    Mensagem estruturada e pronta para envio no WhatsApp.
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--sb-text-secondary)' }}>
                    Se a conversa não abriu automaticamente no seu aplicativo ou navegador:
                  </div>

                  <div className="sb-fallback-actions">
                    <button type="button" className="sb-btn-secondary" onClick={handleReopenConversation}>
                      Abrir conversa novamente
                    </button>
                    <button type="button" className="sb-btn-secondary" onClick={handleCopyMessage}>
                      {copiedSuccess ? '✓ Mensagem copiada!' : 'Copiar mensagem'}
                    </button>
                  </div>

                  {manualCopyFallback && (
                    <div style={{ marginTop: 12 }}>
                      <textarea
                        readOnly
                        value={buildWhatsAppMessage(formData)}
                        className="sb-form-textarea"
                        style={{ fontSize: '0.8125rem' }}
                        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                      />
                    </div>
                  )}
                </div>
              )}
            </LandingGlass>
          </div>
        </section>
      </main>

      {/* 10. Footer Institucional com Marca Animada */}
      <footer className="sb-footer" role="contentinfo">
        <div className="sb-container sb-footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AnimatedBrand variant="footer" size={28} showText={false} />
            <span style={{ fontSize: '0.875rem', color: 'var(--sb-text-muted)' }}>
              {landingContent.footer.copyright}
            </span>
          </div>

          <div className="sb-footer-links">
            <button
              type="button"
              className="sb-footer-link"
              onClick={() => setLegalModalType('terms')}
            >
              {landingContent.footer.termsLabel}
            </button>
            <button
              type="button"
              className="sb-footer-link"
              onClick={() => setLegalModalType('privacy')}
            >
              {landingContent.footer.privacyLabel}
            </button>
            <a href={`mailto:${landingConfig.legal.contactEmail}`} className="sb-footer-link">
              {landingContent.footer.contactLabel}
            </a>
            <a href={authDestination} className="sb-footer-link">
              {landingContent.footer.loginLabel}
            </a>
          </div>
        </div>
      </footer>

      {/* Modais Informativos Acessíveis */}
      <DiscoveryNoticeModal
        isOpen={isDiscoveryModalOpen}
        onClose={() => setIsDiscoveryModalOpen(false)}
      />
      <LegalNoticeModal
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />
    </div>
  );
}
