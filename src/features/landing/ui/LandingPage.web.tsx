import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useTheme } from '@/shared/theme';
import { useSession } from '@/features/auth';
import { BrandMark } from '@/shared/brand';
import { landingContent, BentoItem } from '../content/landing-content';
import { landingConfig } from '../lib/config';
import { trackLandingEvent } from '../lib/analytics';
import { validateDemoForm, DemoFormData, DemoFormErrors, ProfessionalsRange } from '../model/demo-form';
import { buildWhatsAppUrl, buildWhatsAppMessage, copyMessageToClipboard } from '../lib/whatsapp';
import { landingStylesCss } from './styles';

export function LandingPage(): React.ReactElement {
  const { isDark } = useTheme();
  const { status, identity } = useSession();
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

  // Estados de UI interativa
  const [activeFaqId, setActiveFaqId] = useState<string | null>(null);
  const [expandedBentoId, setExpandedBentoId] = useState<string | null>(null);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);

  // Refs para acessibilidade e foco
  const formTitleRef = useRef<HTMLHeadingElement | null>(null);
  const nomeInputRef = useRef<HTMLInputElement | null>(null);
  const barbeariaInputRef = useRef<HTMLInputElement | null>(null);
  const cidadeUfInputRef = useRef<HTMLInputElement | null>(null);
  const necessidadeInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Seleção de plano vindo dos cards de Pricing
  const handleSelectPlan = useCallback((planName: string) => {
    setFormData((prev) => ({ ...prev, configuracao: planName }));
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

  // Manipulação de campos do formulário
  const handleInputChange = (field: keyof DemoFormData, value: string) => {
    if (!hasStartedForm) {
      setHasStartedForm(true);
      trackLandingEvent({ name: 'demo_form_start', properties: { origin: 'direct' } });
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Envio do formulário e handoff para WhatsApp
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateDemoForm(formData);
    if (!validation.success || !validation.data) {
      setFormErrors(validation.errors ?? {});
      // Foca automaticamente no primeiro campo com erro
      if (validation.firstErrorField === 'nome') nomeInputRef.current?.focus();
      else if (validation.firstErrorField === 'barbearia') barbeariaInputRef.current?.focus();
      else if (validation.firstErrorField === 'cidadeUf') cidadeUfInputRef.current?.focus();
      else if (validation.firstErrorField === 'necessidade') necessidadeInputRef.current?.focus();
      return;
    }

    setFormErrors({});

    // Dispara evento analítico tipado sem PII
    trackLandingEvent({
      name: 'demo_form_valid',
      properties: {
        professionalsRange: validation.data.profissionais,
        hasConfiguration: Boolean(validation.data.configuracao),
        hasNeed: Boolean(validation.data.necessidade && validation.data.necessidade.length > 0),
      },
    });

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

    // Abertura segura sem bloqueio de pop-up
    if (typeof window !== 'undefined') {
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
      setTimeout(() => setCopiedSuccess(false), 3000);
    }
  };

  // Re-abertura da conversa
  const handleReopenConversation = () => {
    if (!preparedUrl) return;
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
    <div className={`sb-landing-root ${isDark ? 'theme-obsidian' : 'theme-ivory'}`}>
      <style dangerouslySetInnerHTML={{ __html: landingStylesCss }} />

      {/* Acessibilidade: Skip link */}
      <a href="#conteudo-principal" className="sb-skip-link">
        Pular para o conteúdo principal
      </a>

      {/* 1. Header */}
      <header className="sb-header" role="banner">
        <div className="sb-container sb-header-inner">
          <a href="#inicio" className="sb-logo-link" aria-label="Smart Barber - Página Inicial">
            <BrandMark variant="symbol-crimson" size={36} decorative />
            <span className="sb-logo-text">{landingContent.header.brandName}</span>
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
        {/* 2. Hero Section */}
        <section id="inicio" className="sb-hero-section">
          <div className="sb-container">
            <div className="sb-hero-eyebrow">{landingContent.hero.eyebrow}</div>
            <h1 className="sb-hero-headline">{landingContent.hero.headline}</h1>
            <p className="sb-hero-support">{landingContent.hero.support}</p>

            {/* Dois CTAs equivalentes */}
            <div className="sb-hero-ctas-grid">
              <div className="sb-hero-card">
                <div>
                  <span className="sb-hero-card-tag">{landingContent.hero.clientCta.tag}</span>
                  <h2 className="sb-hero-card-title">{landingContent.hero.clientCta.title}</h2>
                </div>
                <a
                  href={landingConfig.discoveryPath}
                  className="sb-btn-primary"
                  onClick={() =>
                    trackLandingEvent({
                      name: 'landing_cta_click',
                      properties: { audience: 'client', position: 'hero', target: landingContent.hero.clientCta.action },
                    })
                  }
                >
                  {landingContent.hero.clientCta.action}
                </a>
              </div>

              <div className="sb-hero-card">
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
              </div>
            </div>

            {/* Mockup do Hero conectando catálogo à agenda */}
            <motion.div
              className="sb-hero-mockup-wrapper"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="sb-mockup-tag">{landingContent.hero.mockupNotice}</div>
              <div className="sb-mockup-columns">
                {/* Lado Esquerdo: Catálogo do Cliente */}
                <div className="sb-mockup-phone">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Barbearia Navalha & Estilo</span>
                    <span className="sb-card-badge" style={{ margin: 0 }}>Catálogo</span>
                  </div>
                  <div style={{ padding: 12, background: 'var(--sb-surface)', borderRadius: 8, marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Corte Tradicional Degradê</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span className="tabular-nums font-semibold" style={{ color: 'var(--sb-crimson)' }}>R$ 55,00</span>
                      <span className="tabular-nums font-semibold" style={{ fontSize: '0.8125rem', color: 'var(--sb-text-muted)' }}>30 min</span>
                    </div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--sb-surface)', borderRadius: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Barba Terapia Completa</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span className="tabular-nums font-semibold" style={{ color: 'var(--sb-crimson)' }}>R$ 35,00</span>
                      <span className="tabular-nums font-semibold" style={{ fontSize: '0.8125rem', color: 'var(--sb-text-muted)' }}>25 min</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, fontSize: '0.8125rem', color: 'var(--sb-text-secondary)' }}>
                    Horário escolhido: <strong className="tabular-nums font-semibold">16:30</strong> com <strong className="font-semibold">Marcos Silva</strong>
                  </div>
                </div>

                {/* Centro: Indicador de Sincronização */}
                <div className="sb-mockup-sync-indicator" aria-hidden="true">
                  <span style={{ fontSize: '1.5rem' }}>➔</span>
                  <span>Fluxo Conectado</span>
                </div>

                {/* Lado Direito: Agenda da Barbearia */}
                <div className="sb-mockup-tablet">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Grade Operacional do Dia</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)' }}>Sexta-feira</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ padding: 8, background: 'var(--sb-surface)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="tabular-nums font-semibold" style={{ fontSize: '0.8125rem' }}>15:30 - 16:00</span>
                      <span style={{ fontSize: '0.8125rem' }}>Carlos Eduardo (Corte)</span>
                      <span style={{ fontSize: '0.75rem', color: '#34D399', fontWeight: 600 }}>Concluído</span>
                    </div>
                    <div style={{ padding: 8, background: 'rgba(189, 32, 38, 0.16)', borderLeft: '3px solid var(--sb-crimson)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="tabular-nums font-semibold" style={{ fontSize: '0.8125rem', color: 'var(--sb-crimson)' }}>16:30 - 17:15</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Atendimento Confirmado</span>
                      <span style={{ fontSize: '0.75rem', background: 'var(--sb-crimson)', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>Em breve</span>
                    </div>
                    <div style={{ padding: 8, background: 'var(--sb-surface)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="tabular-nums font-semibold" style={{ fontSize: '0.8125rem' }}>17:30 - 18:00</span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--sb-text-muted)' }}>Horário livre para agendamento</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)' }}>Disponível</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 3. Prova Social / Autoridade (Faixa de Confiança) */}
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
                  className="sb-trust-card"
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: index * 0.06 }}
                >
                  <span className="sb-card-badge">{item.badge}</span>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.0625rem', fontWeight: 600 }}>{item.title}</h3>
                  <div className="sb-trust-card-highlight tabular-nums font-semibold">{item.highlight}</div>
                  <div className="tabular-nums font-semibold" style={{ fontSize: '0.875rem', color: 'var(--sb-text-secondary)', marginBottom: 12 }}>
                    {item.meta}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--sb-text-muted)' }}>{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. O Problema vs. A Nova Era */}
        <section className="sb-problem-section" aria-labelledby="problem-heading">
          <div className="sb-container">
            <div className="sb-section-title-wrap">
              <h2 id="problem-heading" className="sb-section-title">{landingContent.problem.headline}</h2>
              <p className="sb-section-subtitle">{landingContent.problem.subtitle}</p>
            </div>

            <div className="sb-comparison-grid">
              {/* Coluna 1: Hoje, tudo espalhado */}
              <div className="sb-problem-card">
                <h3 className="sb-column-heading" style={{ color: '#FF5C62' }}>{landingContent.problem.beforeTitle}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {landingContent.problem.beforePoints.map((pt, i) => (
                    <div key={i} style={{ padding: 12, background: 'var(--sb-surface-elevated)', borderRadius: 8 }}>
                      <strong style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--sb-text-muted)', marginBottom: 4 }}>
                        {pt.author}:
                      </strong>
                      <span style={{ fontStyle: 'italic', color: 'var(--sb-text-secondary)', fontSize: '0.9375rem' }}>
                        &ldquo;{pt.quote}&rdquo;
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coluna 2: Com o fluxo organizado */}
              <div className="sb-problem-card organized">
                <h3 className="sb-column-heading" style={{ color: 'var(--sb-crimson)' }}>{landingContent.problem.afterTitle}</h3>
                <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--sb-text-primary)', marginBottom: 20 }}>
                  {landingContent.problem.afterResolution}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {landingContent.problem.afterSteps.map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: 'var(--sb-crimson)', fontWeight: 800 }}>✔</span>
                      <span style={{ fontSize: '0.9375rem', color: 'var(--sb-text-primary)' }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Bento Grid de Funcionalidades */}
        <section id="para-barbearias" className="sb-bento-section" aria-labelledby="bento-heading">
          <div className="sb-container">
            <div className="sb-section-title-wrap">
              <h2 id="bento-heading" className="sb-section-title">{landingContent.bento.headline}</h2>
              <p className="sb-section-subtitle">{landingContent.bento.subtitle}</p>
            </div>

            <div className="sb-bento-grid">
              {landingContent.bento.items.map((item) => (
                <div
                  key={item.id}
                  className={`sb-bento-card ${item.span === 'wide' ? 'sb-bento-item-wide' : ''}`}
                >
                  <div>
                    <span className="sb-card-badge">{item.badge}</span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '8px 0 12px 0' }}>{item.title}</h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--sb-text-secondary)', margin: 0 }}>
                      {item.description}
                    </p>
                  </div>

                  <div>
                    <button
                      type="button"
                      className="sb-btn-example"
                      onClick={() => toggleBentoExample(item.id)}
                      aria-expanded={expandedBentoId === item.id}
                    >
                      {expandedBentoId === item.id ? 'Fechar exemplo' : 'Ver exemplo'}
                    </button>

                    {expandedBentoId === item.id && (
                      <div className="sb-bento-example-box" role="region" aria-label={item.exampleTitle}>
                        <strong style={{ display: 'block', color: 'var(--sb-text-primary)', marginBottom: 4 }}>
                          {item.exampleTitle}
                        </strong>
                        {item.exampleDetail}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Demonstração de Fluxo — How it Works */}
        <section id="como-funciona" className="sb-how-section" aria-labelledby="how-heading">
          <div className="sb-container">
            <div className="sb-section-title-wrap">
              <h2 id="how-heading" className="sb-section-title">{landingContent.howItWorks.headline}</h2>
              <p className="sb-section-subtitle">{landingContent.howItWorks.subtitle}</p>
            </div>

            {/* Duas trilhas complementares */}
            <div className="sb-tracks-container">
              {/* Trilha do Cliente */}
              <div id="para-clientes" className="sb-track-card">
                <span className="sb-card-badge">{landingContent.howItWorks.clientTrack.badge}</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '8px 0 24px 0' }}>
                  {landingContent.howItWorks.clientTrack.title}
                </h3>
                {landingContent.howItWorks.clientTrack.steps.map((st) => (
                  <div key={st.number} className="sb-step-item">
                    <span className="sb-step-number tabular-nums font-semibold">{st.number}</span>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600 }}>{st.title}</h4>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--sb-text-secondary)' }}>{st.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trilha da Barbearia */}
              <div className="sb-track-card">
                <span className="sb-card-badge">{landingContent.howItWorks.barberTrack.badge}</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '8px 0 24px 0' }}>
                  {landingContent.howItWorks.barberTrack.title}
                </h3>
                {landingContent.howItWorks.barberTrack.steps.map((st) => (
                  <div key={st.number} className="sb-step-item">
                    <span className="sb-step-number tabular-nums font-semibold">{st.number}</span>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600 }}>{st.title}</h4>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--sb-text-secondary)' }}>{st.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Painel Interativo de Cenas (Scrollytelling Desktop / Acessível) */}
            <div className="sb-scrolly-container">
              <div className="sb-scrolly-sticky-panel">
                <div>
                  <div className="sb-scrolly-nav-btns" role="tablist" aria-label="Cenas do fluxo operacional">
                    {landingContent.howItWorks.scenes.map((scene, idx) => (
                      <button
                        key={scene.id}
                        type="button"
                        role="tab"
                        aria-selected={activeSceneIndex === idx}
                        className={`sb-scrolly-btn ${activeSceneIndex === idx ? 'active' : ''}`}
                        onClick={() => setActiveSceneIndex(idx)}
                      >
                        {scene.title}
                      </button>
                    ))}
                  </div>

                  <div style={{ padding: 24, background: 'var(--sb-surface-elevated)', borderRadius: 12 }}>
                    <span className="sb-card-badge" style={{ marginBottom: 12 }}>
                      {landingContent.howItWorks.scenes[activeSceneIndex].tag}
                    </span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '8px 0 12px 0' }}>
                      {landingContent.howItWorks.scenes[activeSceneIndex].preview}
                    </h3>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--sb-text-secondary)', margin: 0 }}>
                      {landingContent.howItWorks.scenes[activeSceneIndex].detail}
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: 24, fontSize: '0.8125rem', color: 'var(--sb-text-muted)' }}>
                  Interação ilustrativa: A escolha feita pelo cliente reflete diretamente na agenda operacional da barbearia.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Planos e Preços (Três níveis sob consulta) */}
        <section id="precos" className="sb-pricing-section" aria-labelledby="pricing-heading">
          <div className="sb-container">
            <div className="sb-section-title-wrap">
              <h2 id="pricing-heading" className="sb-section-title">{landingContent.pricing.headline}</h2>
              <p className="sb-section-subtitle">{landingContent.pricing.subtitle}</p>
            </div>

            <div className="sb-pricing-grid">
              {landingContent.pricing.plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`sb-pricing-card ${plan.isFeatured ? 'featured' : ''}`}
                >
                  <div>
                    {plan.badge && <span className="sb-card-badge">{plan.badge}</span>}
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '8px 0 6px 0' }}>{plan.name}</h3>
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
                    style={{ width: '100%' }}
                    onClick={() => handleSelectPlan(plan.name)}
                  >
                    {plan.ctaLabel}
                  </button>
                </div>
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
                  <div key={item.id} className="sb-faq-card">
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
                  </div>
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
              <div className="sb-footer-panel">
                <div>
                  <span className="sb-card-badge">{landingContent.footer.clientPanel.tag}</span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '8px 0' }}>
                    {landingContent.footer.clientPanel.title}
                  </h3>
                  <p style={{ fontSize: '0.9375rem', color: 'var(--sb-text-secondary)', margin: 0 }}>
                    {landingContent.footer.clientPanel.description}
                  </p>
                </div>
                <a
                  href={landingConfig.discoveryPath}
                  className="sb-btn-primary"
                  onClick={() =>
                    trackLandingEvent({
                      name: 'landing_cta_click',
                      properties: { audience: 'client', position: 'footer', target: landingContent.footer.clientPanel.action },
                    })
                  }
                >
                  {landingContent.footer.clientPanel.action}
                </a>
              </div>

              <div className="sb-footer-panel">
                <div>
                  <span className="sb-card-badge">{landingContent.footer.barberPanel.tag}</span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '8px 0' }}>
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
              </div>
            </div>

            {/* Formulário Comercial Inline #demonstracao */}
            <div id="demonstracao" className="sb-demo-form-card" tabIndex={-1}>
              <h3
                ref={formTitleRef}
                tabIndex={-1}
                style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px 0', outline: 'none' }}
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
                    onClick={() => setFormData((prev) => ({ ...prev, configuracao: '' }))}
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
                    placeholder="Ex: Reduzir tempo no WhatsApp e organizar os horários dos 3 barbeiros..."
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

              {/* Caixa de fallback caso o usuário volte ou o pop-up bloqueie */}
              {preparedUrl && (
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
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* 10. Footer Institucional */}
      <footer className="sb-footer" role="contentinfo">
        <div className="sb-container sb-footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrandMark variant="symbol-crimson" size={28} decorative />
            <span style={{ fontSize: '0.875rem', color: 'var(--sb-text-muted)' }}>
              {landingContent.footer.copyright}
            </span>
          </div>

          <div className="sb-footer-links">
            <a href={landingConfig.legal.termsUrl} className="sb-footer-link">
              {landingContent.footer.termsLabel}
            </a>
            <a href={landingConfig.legal.privacyUrl} className="sb-footer-link">
              {landingContent.footer.privacyLabel}
            </a>
            <a href={`mailto:${landingConfig.legal.contactEmail}`} className="sb-footer-link">
              {landingContent.footer.contactLabel}
            </a>
            <a href={authDestination} className="sb-footer-link">
              {landingContent.footer.loginLabel}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
