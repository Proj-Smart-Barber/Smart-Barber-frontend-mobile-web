import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BrandMark } from '@/shared/brand';
import { landingMotionTokens } from '../lib/landing-motion-tokens';

export interface AnimatedBrandProps {
  size?: number;
  variant?: 'header' | 'hero' | 'footer';
  showText?: boolean;
  textClassName?: string;
}

export function AnimatedBrand({
  size = 36,
  variant = 'header',
  showText = true,
  textClassName = 'sb-logo-text',
}: AnimatedBrandProps): React.ReactElement {
  const shouldReduceMotion = useReducedMotion();

  const isHero = variant === 'hero';
  const isFooter = variant === 'footer';

  const initialY = shouldReduceMotion ? 0 : isHero ? 16 : isFooter ? 6 : 4;
  const initialScale = shouldReduceMotion ? 1 : isHero ? 0.98 : 1;
  const duration = isFooter
    ? landingMotionTokens.duration.normal
    : landingMotionTokens.duration.slow;

  return (
    <div className={`sb-animated-brand sb-brand-${variant}`}>
      <motion.div
        className="sb-brand-symbol-wrapper"
        initial={shouldReduceMotion ? false : { opacity: 0.9, y: initialY, scale: initialScale }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration,
          ease: landingMotionTokens.easing.cinematic,
        }}
      >
        {/* Camada de luz decorativa cinematográfica atrás do símbolo oficial */}
        {!shouldReduceMotion && (
          <motion.div
            className="sb-brand-light-sheen"
            initial={{ opacity: 0, x: '-100%' }}
            animate={{ opacity: [0, 0.45, 0], x: '100%' }}
            transition={{
              duration: 1.2,
              delay: isHero ? 0.3 : 0.15,
              ease: 'easeInOut',
            }}
            aria-hidden="true"
          />
        )}
        <BrandMark
          variant="symbol-crimson"
          size={size}
          decorative
        />
      </motion.div>

      {showText && (
        <span className={textClassName}>
          Smart Barber
        </span>
      )}
    </div>
  );
}
