import { dropzoTheme } from './theme';

/** Mobile-first breakpoint helpers for styled-components, e.g. `${media.tablet}{ ... }`. */
export const media = {
    tablet: `@media (min-width: ${dropzoTheme.breakpoints.mobile})`,
    desktop: `@media (min-width: ${dropzoTheme.breakpoints.tablet})`,
    wide: `@media (min-width: ${dropzoTheme.breakpoints.desktop})`,
};
