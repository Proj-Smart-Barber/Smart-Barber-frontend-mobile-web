import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LandingGlass } from './LandingGlass.web';
import { landingConfig } from '../lib/config';
import { landingMotionTokens } from '../lib/landing-motion-tokens';

export interface LegalNoticeModalProps {
  type: 'terms' | 'privacy' | null;
  onClose: () => void;
}

export function LegalNoticeModal({
  type,
  onClose,
}: LegalNoticeModalProps): React.ReactElement | null {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const isOpen = type !== null;

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const title = type === 'terms' ? 'Termos de Serviço' : 'Política de Privacidade e LGPD';
  const description =
    type === 'terms'
      ? 'Os Termos de Serviço vigentes estão passando por consolidação jurídica e homologação operacional para o lançamento público da plataforma. Nenhuma cobrança ou contratação com compromisso é realizada sem envio formal do contrato de adesão correspondente.'
      : 'O Smart Barber respeita integralmente a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018). Os dados informados para agendamento e demonstração são utilizados exclusivamente para comunicação operacional e prestação do serviço, sem compartilhamento com terceiros.';

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="sb-modal-backdrop"
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{
              duration: landingMotionTokens.duration.normal,
              ease: landingMotionTokens.easing.cinematic,
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-modal-title"
            aria-describedby="legal-modal-desc"
          >
            <LandingGlass
              variant="card-elevated"
              className="sb-discovery-modal-card"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <span className="sb-card-badge" style={{ margin: 0 }}>
                  Informação Institucional
                </span>
                <button
                  type="button"
                  ref={closeButtonRef}
                  onClick={onClose}
                  className="sb-modal-close-btn"
                  aria-label="Fechar modal institucional"
                >
                  ✕
                </button>
              </div>

              <h3
                id="legal-modal-title"
                style={{
                  fontFamily: 'var(--sb-font-heading)',
                  fontSize: '1.375rem',
                  fontWeight: 700,
                  color: 'var(--sb-text-primary)',
                  margin: '0 0 12px 0',
                }}
              >
                {title}
              </h3>

              <p
                id="legal-modal-desc"
                style={{
                  fontSize: '0.9375rem',
                  color: 'var(--sb-text-secondary)',
                  lineHeight: 1.6,
                  margin: '0 0 20px 0',
                }}
              >
                {description}
              </p>

              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: 10,
                  border: '1px solid var(--sb-border-subtle)',
                  fontSize: '0.875rem',
                  color: 'var(--sb-text-muted)',
                  marginBottom: 24,
                }}
              >
                Para solicitações de privacidade, suporte técnico ou dúvidas contratuais, entre em contato diretamente pelo e-mail oficial:{' '}
                <strong style={{ color: 'var(--sb-text-primary)' }}>
                  {landingConfig.legal.contactEmail}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  className="sb-btn-primary"
                  onClick={onClose}
                  style={{ minWidth: 120 }}
                >
                  Fechar
                </button>
              </div>
            </LandingGlass>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
