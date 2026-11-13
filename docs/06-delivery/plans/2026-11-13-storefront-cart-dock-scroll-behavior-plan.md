# Implementation Plan: Mobile Storefront Floating Cart Dock Non-Blocking UX & Auto-Hide

**Date**: 2026-11-13  
**Task ID**: `storefront-cart-overlap-fix`  
**Reference Spike**: `docs/06-delivery/spikes/2026-11-13-storefront-cart-dock-scroll-behavior-spike.md`  
**Status**: Approved (Self-approved per user mandate: *"yes, approve everything yourself"*)  

---

## 1. Overview & Objective

Upgrade `apps/web/src/routes/customer/StorefrontPage.tsx` so that the mobile floating cart dock (`MobileFloatingCart`):
1. Does not obstruct product cards or their action buttons (ADD, stepper `- 1 +`) on mobile viewports.
2. Automatically hides on downward scroll (freeing up 100% of the screen for smooth browsing) and reveals on upward scroll or item addition/update.
3. Provides a minimize button (`expand_more`) to collapse into a compact, non-intrusive floating circular cart pill (`[🛍️ 9]`) in the bottom corner.
4. Includes an explicit bottom catalog spacer (`CatalogBottomSpacer`) ensuring the last products always scroll completely above the dock.

---

## 2. Technical Design & Interfaces

### A. State Management & Hooks in `StorefrontPage.tsx`
```tsx
// 1. Scroll-direction detection hook
const [isDockHiddenByScroll, setIsDockHiddenByScroll] = useState(false);
const [isDockMinimized, setIsDockMinimized] = useState(false);

useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const currentScrollY = window.scrollY;
                const diff = currentScrollY - lastScrollY;

                // Threshold of 10px to avoid micro-jitter
                if (diff > 10 && currentScrollY > 60) {
                    // Scrolling DOWN -> hide dock
                    setIsDockHiddenByScroll(true);
                } else if (diff < -8) {
                    // Scrolling UP -> reveal dock
                    setIsDockHiddenByScroll(false);
                }
                lastScrollY = currentScrollY;
                ticking = false;
            });
            ticking = true;
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

### B. Reveal on Item Addition / Modification
Whenever `handleAddToCart` or `updateQuantity` is triggered, set `setIsDockHiddenByScroll(false)` and `setIsDockMinimized(false)` so the customer immediately sees their updated cart summary.

### C. Styled Components Updates
```tsx
const MobileFloatingCart = styled.aside<{ $hidden?: boolean }>`
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    right: 1rem;
    z-index: 40;
    max-width: 28rem;
    margin: 0 auto;
    transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
    transform: ${({ $hidden }) => ($hidden ? 'translateY(calc(100% + 2rem))' : 'translateY(0)')};
    opacity: ${({ $hidden }) => ($hidden ? 0 : 1)};
    pointer-events: ${({ $hidden }) => ($hidden ? 'none' : 'auto')};

    ${media.desktop} {
        display: none;
    }
`;

const MinimizedCartPill = styled.button<{ $hidden?: boolean }>`
    position: fixed;
    bottom: 1.25rem;
    right: 1.25rem;
    z-index: 40;
    width: 3.25rem;
    height: 3.25rem;
    border-radius: 9999px;
    background: #2f3038;
    color: #ffffff;
    border: 2px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
    transform: ${({ $hidden }) => ($hidden ? 'translateY(calc(100% + 2rem))' : 'translateY(0)')};
    opacity: ${({ $hidden }) => ($hidden ? 0 : 1)};

    ${media.desktop} {
        display: none;
    }
`;

const CatalogBottomSpacer = styled.div<{ $hasActiveCart?: boolean }>`
    height: ${({ $hasActiveCart }) => ($hasActiveCart ? '7.5rem' : '3.5rem')};
    width: 100%;
    pointer-events: none;
`;
```

---

## 3. Tasks & TDD Execution Steps

### Task 1: Update `StorefrontPage.tsx`
- Add scroll listener for direction-aware auto-hide / auto-reveal.
- Add minimize/expand state (`isDockMinimized`).
- Render `MinimizedCartPill` when minimized, rendering full `MobileFloatingCart` when expanded.
- Add minimize button (`expand_more`) to the right of "View Cart".
- Add `CatalogBottomSpacer` after `</ProductGrid>`.
- Hook cart item mutations to auto-reveal dock.

### Task 2: Update Tests in `StorefrontPage.test.tsx`
- Verify `MobileFloatingCart` renders minimize button.
- Verify clicking minimize button collapses the dock into `MinimizedCartPill`.
- Verify clicking `MinimizedCartPill` expands back to full dock.
- Verify bottom spacer is present with correct spacing.

### Task 3: Full Verification & Sync
- Run `npm run test -w @dropzo/web -- StorefrontPage`
- Run `npm run typecheck -w @dropzo/web`
- Run `npm run lint -w @dropzo/web`
- Run `npm run build -w @dropzo/web`
- Run full web test suite.
- Commit changes.

---

## 4. Gate 2 Sign-Off
Approved. Proceed to Phase 3 Execution.
