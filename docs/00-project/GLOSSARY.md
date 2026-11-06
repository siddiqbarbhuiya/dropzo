# Glossary

**Status: Accepted.**

| Term                     | Meaning                                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Merchant                 | A local shop or store registered on Dropzo. One merchant may own multiple stores.                                                        |
| Store                    | A single physical location belonging to a merchant. Has its own stock, prices, and operating hours.                                      |
| Store product / listing  | A product as sold by one specific store — has its own price and stock, separate from the global product record.                          |
| Product                  | The catalogue-level description of an item (name, brand, category), shared across stores.                                                |
| Pickup                   | The customer collects their order from the store in person, verified by a one-time code.                                                 |
| Delivery                 | The order is brought to the customer's address by a delivery partner.                                                                    |
| Merchant-owned inventory | Stock that belongs to and is managed by the merchant, not Dropzo. The launch model.                                                      |
| Platform-owned inventory | Stock that Dropzo itself purchases and stocks. Not used at launch; the data model supports it for later.                                 |
| COD                      | Cash on delivery / cash on pickup — payment collected at the point of handover.                                                          |
| MVP                      | Minimum viable product — the smallest set of features needed for a real pilot.                                                           |
| Service zone             | A geographic area where Dropzo currently accepts orders.                                                                                 |
| FEFO                     | First-Expiry-First-Out — a stock-picking rule for perishable goods (planned, not yet implemented).                                       |
| ADR                      | Architecture Decision Record — a short document capturing one significant technical decision and why it was made.                        |
| Modular monolith         | One deployable backend application, internally organised into independent modules with clear boundaries — the opposite of microservices. |

## Related documents

- [`PROJECT-OVERVIEW.md`](PROJECT-OVERVIEW.md)
- [`SCOPE.md`](SCOPE.md)
