import { createGlobalStyle } from 'styled-components';

/** Global resets, font loading and focus/state rules shared by every screen. */
export const GlobalStyles = createGlobalStyle`
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

    .material-symbols-outlined {
        font-family: 'Material Symbols Outlined';
        font-weight: normal;
        font-style: normal;
        font-size: 20px;
        line-height: 1;
        letter-spacing: normal;
        text-transform: none;
        display: inline-block;
        white-space: nowrap;
        word-wrap: normal;
        direction: ltr;
        -webkit-font-smoothing: antialiased;
        font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: .5; }
    }

    @keyframes ping {
        75%, 100% {
            transform: scale(2);
            opacity: 0;
        }
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
