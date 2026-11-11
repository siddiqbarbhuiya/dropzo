import type { ReactElement } from 'react';
import { ThemeProvider } from 'styled-components';
import { dropzoTheme } from '../theme';

/** Wraps a component tree with the Dropzo theme, so styled-components tokens resolve in tests. */
export function withTheme(ui: ReactElement) {
    return <ThemeProvider theme={dropzoTheme}>{ui}</ThemeProvider>;
}
