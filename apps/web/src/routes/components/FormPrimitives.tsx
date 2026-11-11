import styled from 'styled-components';

/** Shared styled primitives, extracted from MerchantOrderDetailPage's original inline definitions
 * now that BC-010 adds several more pages reusing the same look - the first shared UI primitives
 * in the app (previously every page defined its own). */
export const Section = styled.section`
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1rem;
`;

export const ActionRow = styled.div`
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
`;

export const Button = styled.button`
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    border: none;
    background: #15803d;
    color: white;
    cursor: pointer;

    &:disabled {
        background: #94a3b8;
        cursor: not-allowed;
    }
`;

export const DangerButton = styled(Button)`
    background: #b91c1c;
`;

export const SecondaryButton = styled(Button)`
    background: #334155;
`;

export const Field = styled.input`
    padding: 0.5rem;
    border-radius: 0.375rem;
    border: 1px solid #cbd5e1;
`;

export const Select = styled.select`
    padding: 0.5rem;
    border-radius: 0.375rem;
    border: 1px solid #cbd5e1;
`;

export const ErrorText = styled.p`
    color: #b91c1c;
`;

export const SuccessText = styled.p`
    color: #15803d;
`;
