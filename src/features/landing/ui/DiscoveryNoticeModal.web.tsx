import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LandingGlass } from './LandingGlass.web';
import { landingMotionTokens } from '../lib/landing-motion-tokens';

export interface DiscoveryNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DiscoveryNoticeModal({
  isOpen,
  onClose,
}: DiscoveryNoticeModalProps): React.ReactElement | null {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

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
            aria-labelledby="discovery-modal-title"
            aria-describedby="discovery-modal-desc"
          >
            <LandingGlass
              variant="card-elevated"
              className="sb-discovery-modal-card"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <span className="sb-card-badge" style={{ margin: 0 }}>
                  Expansão de Rede
                </span>
                <button
                  type="button"
                  ref={closeButtonRef}
                  onClick={onClose}
                  className="sb-modal-close-btn"
                  aria-label="Fechar modal informativo"
                >
                  ✕
                </button>
              </div>

              <h3
                id="discovery-modal-title"
                style={{
                  fontFamily: 'var(--sb-font-heading)',
                  fontSize: '1.375rem',
                  fontWeight: 700,
                  color: 'var(--sb-text-primary)',
                  margin: '0 0 12px 0',
                }}
              >
                Busca de barbearias em expansão
              </h3>

              <p
                id="discovery-modal-desc"
                style={{
                  fontSize: '0.9375rem',
                  color: 'var(--sb-text-secondary)',
                  lineHeight: 1.6,
                  margin: '0 0 20px 0',
                }}
              >
                A descoberta aberta por localização geográfica está em fase de implantação técnica.
                Hoje, os clientes agendam através do link direto compartilhado por suas barbearias credenciadas.
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
                💡 Se a sua barbearia habitual já utiliza o Smart Barber, solicite o link direto de agendamento da unidade para reservar seu atendimento.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  className="sb-btn-primary"
                  onClick={onClose}
                  style={{ minWidth: 120 }}
                >
                  Compreendi
                </button>
              </div>
            </LandingGlass>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
