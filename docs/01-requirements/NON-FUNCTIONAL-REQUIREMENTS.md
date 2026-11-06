# Non-functional requirements

**Status: Accepted** (as targets, not guarantees — see caution below).

CAUTION: None of the figures below are measured service-level guarantees. They are planning
targets for a solo-developer MVP. Do not quote them as commitments to merchants or customers
until they are actually measured in production.

| ID            | Requirement                                                                                             | Status                                                |
| ------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| NFR-UX-001    | Mobile-first, responsive PWA.                                                                           | Planned                                               |
| NFR-SEC-001   | HTTPS everywhere in any deployed environment.                                                           | Planned                                               |
| NFR-PERF-001  | API responses for simple, cached reads target under 500 ms, subject to hosting and network conditions.  | Planned (target, not measured)                        |
| NFR-DATA-001  | Stock reservation is transactional; no overselling under concurrent checkout.                           | Planned                                               |
| NFR-API-001   | Repeated identical checkout/payment requests never create duplicate orders or charges (idempotency).    | Planned                                               |
| NFR-SEC-002   | Role-based and resource-level access control on every protected endpoint.                               | Planned                                               |
| NFR-OPS-001   | Database backups exist and restoration is tested before public launch.                                  | Planned                                               |
| NFR-OPS-002   | Centralised error logging exists before public launch.                                                  | Planned                                               |
| NFR-UX-002    | Clear, accessible error messages; no raw stack traces shown to users.                                   | Planned                                               |
| NFR-API-002   | Large result sets are paginated.                                                                        | Planned                                               |
| NFR-LOC-001   | Service zones and delivery fees are configurable data, not hardcoded.                                   | Planned                                               |
| NFR-SEC-003   | Sensitive actions (refunds, stock adjustments, settlements) are audit-logged.                           | Planned                                               |
| NFR-DATA-002  | Timestamps are stored in UTC; display is timezone-aware.                                                | Planned                                               |
| NFR-SCALE-001 | The data model supports expansion to multiple cities without a redesign.                                | Accepted (architectural principle, not yet exercised) |
| NFR-OPS-003   | The system degrades gracefully on intermittent mobile connectivity (no silent data loss, safe retries). | Planned                                               |
| NFR-AVAIL-001 | 99.5% monthly availability is a target after pilot stabilisation, not from day one.                     | Planned (target, not measured)                        |

## Related documents

- [`FUNCTIONAL-REQUIREMENTS.md`](FUNCTIONAL-REQUIREMENTS.md)
- [`../05-engineering/SECURITY-STANDARDS.md`](../05-engineering/SECURITY-STANDARDS.md)
- [`../08-quality/RISK-REGISTER.md`](../08-quality/RISK-REGISTER.md)
