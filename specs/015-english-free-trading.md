# SPEC-TRADE-EN-001 English free trading mode

- The English version of the free trading mode lives at `/trade/en/`; the Japanese version stays at `/trade/`.
- Both pages share `trade/accounting.mjs` (ports, prices, FIFO cost, fares, closing rules) and the local save key `voyage-trade-v1`, so a player can switch language and keep the same voyage.
- The English page maps port ids to English names (Venice, Alexandria, Constantinople, Barcelona) and journal account labels to English terms: Cash, Capital, Merchandise, Sales, Cost of goods sold, Voyage expenses.
- Amounts stay in gold coins. Statements are split into an income statement (P/L) and a two-column balance sheet (B/S) with the same layout and stylesheet as the Japanese page.
- Language links: the Japanese trade page links to `./en/`, the English trade page links to `../` (Japanese) and `../../en/` (English home). The English home page links to `../trade/en/`.
- Tests: `tests/e2e/trade-en.spec.mjs` covers mobile trade preview and commit, journal and statement wording, departure and reload persistence, voyage closing and continuation, language links and the shared save. `npm run check` syntax-checks `trade/en/app.js`.
