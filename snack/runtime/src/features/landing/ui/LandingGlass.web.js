import React from 'react';
/**
 * Adapter semântico Web de Liquid Glass para a Landing Page.
 * Aplica os tokens Obsidian Atelier do Design System v2 (Seção 52).
 * Mantém uma única face de material sem aninhar blurs caros em inputs e chips internos.
 */
export const LandingGlass = React.forwardRef(({ as = 'div', variant = 'card', className = '', children, ...rest }, ref) => {
    const Component = as;
    const variantClass = `sb-glass-${variant}`;
    const combinedClassName = `sb-glass-base ${variantClass} ${className}`.trim();
    return React.createElement(Component, {
        ...rest,
        ref,
        className: combinedClassName,
    }, children);
});
LandingGlass.displayName = 'LandingGlass';
