import styled from 'styled-components';
import { media } from '../../theme';

/** Standard page-width wrapper: mobile gutter, desktop margin + max width. */
export const ResponsiveContainer = styled.div`
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 ${({ theme }) => theme.spacing.lg};

    ${media.tablet} {
        padding: 0 ${({ theme }) => theme.spacing.xl};
    }
`;
