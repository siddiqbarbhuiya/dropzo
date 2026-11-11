import { describe, expect, it } from 'vitest';
import { dropzoTheme, typeScale } from './theme';

describe('dropzoTheme', () => {
    it('uses the approved brand tokens', () => {
        expect(dropzoTheme.colors.primary).toBe('#FF5733');
        expect(dropzoTheme.colors.primaryDark).toBe('#E04826');
        expect(dropzoTheme.colors.primaryLight).toBe('#FFECE8');
        expect(dropzoTheme.colors.secondary).toBe('#006E2D');
        expect(dropzoTheme.colors.tertiary).toBe('#006398');
        expect(dropzoTheme.colors.background).toBe('#FBF8FF');
    });

    it('uses the approved geometry tokens', () => {
        expect(dropzoTheme.radii.xl).toBe('1rem');
        expect(dropzoTheme.radii.full).toBe('9999px');
        expect(dropzoTheme.spacing.xs).toBe('0.25rem');
    });

    it('carries the approved font family', () => {
        expect(dropzoTheme.typography.fontFamily).toContain('Plus Jakarta Sans');
    });
});

describe('typeScale', () => {
    it('renders a CSS declaration block from a type token', () => {
        const css = typeScale(dropzoTheme.typography.bodyMd);
        expect(css).toContain('font-size: 0.875rem');
        expect(css).toContain('font-weight: 400');
    });
});
