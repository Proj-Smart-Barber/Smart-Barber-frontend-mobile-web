import React, { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, useReducedMotion, AnimatePresence } from 'motion/react';
import { LandingGlass } from './LandingGlass.web';
import { landingMotionTokens } from '../lib/landing-motion-tokens';

interface SceneData {
  id: string;
  stepNumber: string;
  title: string;
  actor: string;
  preview: string;
  detail: string;
}

const scenesData: SceneData[] = [
  {
    id: 'cena-escolha',
    stepNumber: '01',
    title: 'Escolha com autonomia',
    actor: 'Cliente',
    preview: 'Corte Degradê & Barba • R$ 85,00',
    detail: 'O cliente consulta os serviços catalogados, confere os valores e escolhe o profissional e o horário ideal sem trocas infinitas de mensagens.',
  },
  {
    id: 'cena-revisao',
    stepNumber: '02',
    title: 'Validação transparente',
    actor: 'Sistema',
    preview: 'Sexta-feira às 16:30 com Marcos Silva',
    detail: 'O sistema valida a grade livre do profissional e apresenta o resumo completo antes de qualquer confirmação, evitando sobreposição e choque de horários.',
  },
  {
    id: 'cena-agenda',
    stepNumber: '03',
    title: 'Registro na agenda',
    actor: 'Barbearia',
    preview: 'Grade operacional atualizada em tempo real',
    detail: 'O agendamento surge organizado na linha do tempo do profissional, com tempo estimado de execução, histórico e previsibilidade de caixa.',
  },
];

export function ProductStory(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [isManualOverride, setIsManualOverride] = useState(false);

  // Monitora progresso do scroll do trecho local
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  useEffect(() => {
    if (shouldReduceMotion || !scrollYProgress || typeof scrollYProgress.on !== 'function') return;

    const unsubscribe = scrollYProgress.on('change', (latest) => {
      if (latest < 0.33) {
        setActiveSceneIndex(0);
      } else if (latest < 0.66) {
        setActiveSceneIndex(1);
      } else {
        setActiveSceneIndex(2);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [scrollYProgress, shouldReduceMotion]);

  const handleSelectScene = (index: number) => {
    setIsManualOverride(true);
    setActiveSceneIndex(index);
  };

  const currentScene = scenesData[activeSceneIndex];

  return (
    <div ref={containerRef} className="sb-product-story-wrapper">
      <div className="sb-product-story-sticky">
        <div className="sb-container sb-product-story-inner">
          {/* Lado Esquerdo: Narrativa e Controles Acessíveis */}
          <div className="sb-story-controls-col">
            <span className="sb-card-badge" style={{ marginBottom: 12 }}>
              Fluxo Conectado do Produto
            </span>
            <h2
              style={{
                fontFamily: 'var(--sb-font-heading)',
                fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                fontWeight: 800,
                lineHeight: 1.15,
                margin: '0 0 16px 0',
                color: 'var(--sb-text-primary)',
              }}
            >
              Do catálogo do cliente à grade do barbeiro.
            </h2>
            <p
              style={{
                fontSize: '1rem',
                color: 'var(--sb-text-secondary)',
                lineHeight: 1.6,
                margin: '0 0 28px 0',
              }}
            >
              Cada ação realizada pelo cliente alimenta diretamente a organização da equipe.
              Nenhum dado perdido em prints de conversas.
            </p>

            {/* Controles de Cenas com Semântica de Tabs */}
            <div
              className="sb-scrolly-nav-btns"
              role="tablist"
              aria-label="Etapas do fluxo integrado"
            >
              {scenesData.map((scene, idx) => {
                const isActive = activeSceneIndex === idx;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    role="tab"
                    id={`tab-${scene.id}`}
                    aria-selected={isActive}
                    aria-controls={`panel-${scene.id}`}
                    className={`sb-scrolly-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectScene(idx)}
                  >
                    <span className="tabular-nums font-semibold" style={{ opacity: 0.7, marginRight: 6 }}>
                      {scene.stepNumber}
                    </span>
                    {scene.title}
                  </button>
                );
              })}
            </div>

            {/* Descrição Acessível da Etapa Ativa */}
            <div
              id={`panel-${currentScene.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${currentScene.id}`}
              className="sb-story-detail-card"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span className="sb-card-badge" style={{ margin: 0 }}>
                  Etapa {currentScene.stepNumber} • {currentScene.actor}
                </span>
              </div>
              <h3
                style={{
                  fontFamily: 'var(--sb-font-heading)',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  margin: '0 0 8px 0',
                  color: 'var(--sb-text-primary)',
                }}
              >
                {currentScene.preview}
              </h3>
              <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--sb-text-secondary)', lineHeight: 1.6 }}>
                {currentScene.detail}
              </p>
            </div>

            <div style={{ marginTop: 20, fontSize: '0.8125rem', color: 'var(--sb-text-muted)' }}>
              ✦ Demonstração ilustrativa baseada nos contratos das telas de Catálogo, Reserva e Agenda.
            </div>
          </div>

          {/* Lado Direito: MiniUI Cinematográfica com Camadas Liquid Glass */}
          <div className="sb-story-stage-col" aria-hidden="true">
            <LandingGlass variant="card-elevated" className="sb-story-stage-glass">
              {/* Top bar da MiniUI */}
              <div className="sb-stage-topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="sb-stage-dot red" />
                  <div className="sb-stage-dot yellow" />
                  <div className="sb-stage-dot green" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)', marginLeft: 8 }}>
                    Smart Barber Studio • Demonstração
                  </span>
                </div>
                <span className="sb-card-badge" style={{ margin: 0, fontSize: '0.6875rem' }}>
                  {currentScene.actor}
                </span>
              </div>

              {/* Corpo da Cena Intercambiável */}
              <div className="sb-stage-viewport">
                <AnimatePresence mode="wait">
                  {activeSceneIndex === 0 && (
                    <motion.div
                      key="scene-0"
                      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
                      transition={{ duration: landingMotionTokens.duration.slow, ease: landingMotionTokens.easing.cinematic }}
                      className="sb-stage-card-body"
                    >
                      <div className="sb-stage-badge-tag">Passo 1: Catálogo do Cliente</div>
                      <div className="sb-stage-card-title">Barbearia Navalha de Ouro</div>
                      
                      <div className="sb-stage-item selected">
                        <div>
                          <div style={{ fontWeight: 600, color: '#FFF' }}>Corte Masculino & Degradê</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--sb-text-muted)' }}>Finalização com navalha e pomada</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="tabular-nums font-semibold" style={{ color: 'var(--sb-crimson)' }}>R$ 50,00</div>
                          <div className="tabular-nums font-semibold" style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)' }}>35 min</div>
                        </div>
                      </div>

                      <div className="sb-stage-item selected" style={{ marginTop: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#FFF' }}>Barboterapia Tradicional</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--sb-text-muted)' }}>Toalha quente e óleo essencial</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="tabular-nums font-semibold" style={{ color: 'var(--sb-crimson)' }}>R$ 35,00</div>
                          <div className="tabular-nums font-semibold" style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)' }}>25 min</div>
                        </div>
                      </div>

                      <div className="sb-stage-footer-callout">
                        <span>Total do atendimento:</span>
                        <strong className="tabular-nums font-semibold" style={{ fontSize: '1rem', color: '#FFF' }}>
                          R$ 85,00 (60 min)
                        </strong>
                      </div>
                    </motion.div>
                  )}

                  {activeSceneIndex === 1 && (
                    <motion.div
                      key="scene-1"
                      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
                      transition={{ duration: landingMotionTokens.duration.slow, ease: landingMotionTokens.easing.cinematic }}
                      className="sb-stage-card-body"
                    >
                      <div className="sb-stage-badge-tag">Passo 2: Revisão de Parâmetros</div>
                      <div className="sb-stage-card-title">Confirmação de Disponibilidade</div>

                      <div className="sb-stage-summary-box">
                        <div className="sb-stage-row">
                          <span style={{ color: 'var(--sb-text-muted)' }}>Profissional:</span>
                          <strong style={{ color: '#FFF' }}>Marcos Silva</strong>
                        </div>
                        <div className="sb-stage-row">
                          <span style={{ color: 'var(--sb-text-muted)' }}>Data e horário:</span>
                          <strong className="tabular-nums font-semibold" style={{ color: '#FFF' }}>
                            Sexta-feira às 16:30
                          </strong>
                        </div>
                        <div className="sb-stage-row">
                          <span style={{ color: 'var(--sb-text-muted)' }}>Duração reservada:</span>
                          <span className="tabular-nums font-semibold">16:30 – 17:30 (60 min)</span>
                        </div>
                        <div className="sb-stage-row" style={{ borderTop: '1px solid var(--sb-border-subtle)', paddingTop: 8 }}>
                          <span style={{ color: 'var(--sb-text-muted)' }}>Status da grade:</span>
                          <span style={{ color: '#4ADE80', fontWeight: 600 }}>● Horário livre e verificado</span>
                        </div>
                      </div>

                      <div className="sb-stage-pill-notice">
                        Nenhum conflito de horário com outros atendimentos da barbearia.
                      </div>
                    </motion.div>
                  )}

                  {activeSceneIndex === 2 && (
                    <motion.div
                      key="scene-2"
                      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
                      transition={{ duration: landingMotionTokens.duration.slow, ease: landingMotionTokens.easing.cinematic }}
                      className="sb-stage-card-body"
                    >
                      <div className="sb-stage-badge-tag">Passo 3: Grade Operacional</div>
                      <div className="sb-stage-card-title">Agenda de Marcos Silva — Sexta</div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div className="sb-stage-agenda-item done">
                          <span className="tabular-nums font-semibold" style={{ fontSize: '0.8125rem', width: 90 }}>15:00 - 15:45</span>
                          <span>Lucas Ferreira • Barba</span>
                          <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Concluído</span>
                        </div>

                        <div className="sb-stage-agenda-item active-highlight">
                          <span className="tabular-nums font-semibold" style={{ fontSize: '0.8125rem', width: 90 }}>16:30 - 17:30</span>
                          <div>
                            <div style={{ fontWeight: 600, color: '#FFF' }}>Atendimento Confirmado</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)' }}>Corte & Barba • R$ 85,00</div>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#4ADE80', fontWeight: 600 }}>● Na Grade</span>
                        </div>

                        <div className="sb-stage-agenda-item">
                          <span className="tabular-nums font-semibold" style={{ fontSize: '0.8125rem', width: 90, color: 'var(--sb-text-muted)' }}>18:00 - 18:40</span>
                          <span style={{ color: 'var(--sb-text-muted)' }}>Rodrigo Dias • Corte Clássico</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--sb-text-muted)' }}>Agendado</span>
                        </div>
                      </div>

                      <div className="sb-stage-footer-callout" style={{ marginTop: 12 }}>
                        <span>Previsão de caixa do dia:</span>
                        <strong className="tabular-nums font-semibold" style={{ color: '#FFF' }}>
                          7 atendimentos agendados
                        </strong>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </LandingGlass>
          </div>
        </div>
      </div>
    </div>
  );
}
