/** Dropzo design-system theme. Source: docs/04-design/DESIGN-SYSTEM-EXTRACTION.md (approved). */
export interface DropzoTheme {
    colors: {
        primary: string;
        primaryDark: string;
        primaryLight: string;
        rust: string;
        secondary: string;
        secondaryLight: string;
        tertiary: string;
        skyBlue: string;
        background: string;
        surface: string;
        surfaceDim: string;
        surfaceContainerLowest: string;
        surfaceContainerLow: string;
        surfaceContainer: string;
        surfaceContainerHigh: string;
        surfaceContainerHighest: string;
        textPrimary: string;
        textSecondary: string;
        textMuted: string;
        textInverse: string;
        textOnPrimary: string;
        textOnSecondary: string;
        border: string;
        borderOutlineVariant: string;
        borderSubtle: string;
        divider: string;
        error: string;
        errorContainer: string;
        errorText: string;
        success: string;
        successContainer: string;
        warning: string;
        warningContainer: string;
    };
    typography: {
        fontFamily: string;
        headlineXl: TypeScaleToken;
        headlineLg: TypeScaleToken;
        headlineMd: TypeScaleToken;
        headlineSm: TypeScaleToken;
        bodyLg: TypeScaleToken;
        bodyMd: TypeScaleToken;
        bodySm: TypeScaleToken;
        labelLg: TypeScaleToken;
        labelMd: TypeScaleToken;
        labelSm: TypeScaleToken;
    };
    spacing: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        xxl: string;
    };
    radii: {
        sm: string;
        md: string;
        lg: string;
        xl: string;
        xxl: string;
        full: string;
    };
    shadows: {
        card: string;
        cardHover: string;
        ctaGlow: string;
        modal: string;
    };
    breakpoints: {
        mobile: string;
        tablet: string;
        desktop: string;
    };
    zIndex: {
        dropdown: number;
        modal: number;
        toast: number;
    };
}

export interface TypeScaleToken {
    fontSize: string;
    fontWeight: number;
    lineHeight: string;
    letterSpacing: string;
}

export const dropzoTheme: DropzoTheme = {
    colors: {
        primary: '#FF5733',
        primaryDark: '#E04826',
        primaryLight: '#FFECE8',
        rust: '#B72301',
        secondary: '#006E2D',
        secondaryLight: '#DCFCE7',
        tertiary: '#006398',
        skyBlue: '#3298DC',
        background: '#FBF8FF',
        surface: '#FBF8FF',
        surfaceDim: '#DAD9E3',
        surfaceContainerLowest: '#FFFFFF',
        surfaceContainerLow: '#F4F2FD',
        surfaceContainer: '#EEEDF7',
        surfaceContainerHigh: '#E8E7F1',
        surfaceContainerHighest: '#E3E1EC',
        textPrimary: '#1A1B22',
        textSecondary: '#5B403A',
        textMuted: '#71717A',
        textInverse: '#F1EFFA',
        textOnPrimary: '#FFFFFF',
        textOnSecondary: '#FFFFFF',
        border: '#8F7069',
        borderOutlineVariant: '#E4BEB6',
        borderSubtle: '#F1F5F9',
        divider: '#E4E4E7',
        error: '#BA1A1A',
        errorContainer: '#FFDAD6',
        errorText: '#93000A',
        success: '#006E2D',
        successContainer: '#7CF994',
        warning: '#D97706',
        warningContainer: '#FEF3C7',
    },
    typography: {
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        headlineXl: {
            fontSize: '2rem',
            fontWeight: 800,
            lineHeight: '2.5rem',
            letterSpacing: '-0.02em',
        },
        headlineLg: {
            fontSize: '1.5rem',
            fontWeight: 700,
            lineHeight: '2rem',
            letterSpacing: '-0.015em',
        },
        headlineMd: {
            fontSize: '1.25rem',
            fontWeight: 700,
            lineHeight: '1.75rem',
            letterSpacing: '-0.01em',
        },
        headlineSm: {
            fontSize: '1.125rem',
            fontWeight: 600,
            lineHeight: '1.5rem',
            letterSpacing: 'normal',
        },
        bodyLg: {
            fontSize: '1rem',
            fontWeight: 500,
            lineHeight: '1.5rem',
            letterSpacing: 'normal',
        },
        bodyMd: {
            fontSize: '0.875rem',
            fontWeight: 400,
            lineHeight: '1.25rem',
            letterSpacing: 'normal',
        },
        bodySm: {
            fontSize: '0.75rem',
            fontWeight: 400,
            lineHeight: '1.125rem',
            letterSpacing: 'normal',
        },
        labelLg: {
            fontSize: '0.875rem',
            fontWeight: 600,
            lineHeight: '1.25rem',
            letterSpacing: '0.01em',
        },
        labelMd: {
            fontSize: '0.75rem',
            fontWeight: 600,
            lineHeight: '1rem',
            letterSpacing: 'normal',
        },
        labelSm: {
            fontSize: '0.6875rem',
            fontWeight: 700,
            lineHeight: '0.875rem',
            letterSpacing: '0.02em',
        },
    },
    spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        xxl: '2rem',
    },
    radii: {
        sm: '0.25rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        xxl: '1.5rem',
        full: '9999px',
    },
    shadows: {
        card: '0 2px 8px -2px rgba(26, 27, 34, 0.05)',
        cardHover: '0 8px 16px -4px rgba(26, 27, 34, 0.08)',
        ctaGlow: '0 8px 16px -4px rgba(255, 87, 51, 0.35)',
        modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    },
    breakpoints: {
        mobile: '768px',
        tablet: '1024px',
        desktop: '1280px',
    },
    zIndex: {
        dropdown: 1000,
        modal: 1100,
        toast: 1200,
    },
};

export function typeScale(token: TypeScaleToken): string {
    return `
        font-size: ${token.fontSize};
        font-weight: ${token.fontWeight};
        line-height: ${token.lineHeight};
        letter-spacing: ${token.letterSpacing};
    `;
}
