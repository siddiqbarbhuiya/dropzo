import { createGlobalStyle } from 'styled-components';

/** Global resets, font loading and focus/state rules shared by every screen. */
export const GlobalStyles = createGlobalStyle`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    *, *::before, *::after {
        box-sizing: border-box;
    }

    html, body {
        margin: 0;
        padding: 0;
    }

    body {
        font-family: ${({ theme }) => theme.typography.fontFamily};
        background: ${({ theme }) => theme.colors.background};
        color: ${({ theme }) => theme.colors.textPrimary};
        -webkit-font-smoothing: antialiased;
    }

    h1, h2, h3, h4, h5, h6, p {
        margin: 0;
    }

    button, input, select, textarea {
        font-family: inherit;
    }

    button {
        font-size: inherit;
    }

    a {
        color: ${({ theme }) => theme.colors.primary};
    }

    /* Keyboard-only focus ring. Mouse/touch interaction never shows it. */
    :focus {
        outline: none;
    }

    :focus-visible {
        outline: 2px solid ${({ theme }) => theme.colors.tertiary};
        outline-offset: 2px;
    }

    [disabled] {
        cursor: not-allowed;
    }
`;
