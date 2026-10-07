# GALI METRICS METHODOLOGY & GROUND TRUTH SPECIFICATION

> **Official Documentation of the M1–M9 Metrics Methodology, Scenario Engine, & Provenance Audit**
> Methodology Version: `3.0-context` · Updated: **5 October 2026**

---

## 1. Methodology Overview & Core Principles

GALI (**Ground-truth Analytics for Listed Issuers**) combines public exchange data (IDX) with upstream physical operational, geospatial, and licensing data (Indonesia's Ministry of Energy and Mineral Resources & Sectors Mining Intelligence) to expose the fundamental reality of Indonesian natural-resource issuers.

### Core Data Integrity Principles of GALI:
1. **Zero Guesswork / No Proxy Hallucination**: A field that is `NULL` in the upstream data stays `NULL` in the output. Using industry averages, guessed estimates, or unfounded imputation is prohibited.
2. **Audit Provenance**: Evidence records assumptions, selected input years, missing-field reasons, and relevant cached endpoint references (`raw.responses.id`). These references include shared registries; exact field-level lineage and raw payload inspection are not yet available in the UI.
3. **Weight Re-normalization**: If a component's data is unavailable for an issuer, that component's weight is dropped and the weights of the available components are re-normalized to sum to 100%, with the effective weight recorded in the confidence score.
4. **Blue/Green Atomic Publishing**: Metrics are computed in a `building` state, validated through a sanity gate, and published atomically with no downtime.

---

## 2. Fundamental & Operational Metric Specifications (M1–M9)

### M1 — Reserve Life Index (RLI)

- **Description**: Measures the remaining operational life of a mine's reserves (in years) based on the current production rate and the issuer's effective ownership share of the operating entities.
- **Formula**:
  $$\text{reserves}(s) = \sum_{c} \text{eff\_own}(s,c) \times \text{total\_reserves\_Mt}(c)$$
  $$\text{production}(s) = \sum_{c} \text{eff\_own}(s,c) \times \text{production\_volume}(c)$$
  $$\text{RLI}(s) = \frac{\text{reserves}(s)}{\text{production}(s)}$$
- **Golden Test Benchmark**: Adaro (AADI) = $819.0\text{ Mt} / 48.11\text{ Mt} = 17.02 \pm 0.05$ years.
- **Data Limitation**: RLI requires paired reserves and positive production for each attributable entity, with explicit ownership. Missing pairs produce `NULL`; reserves from one operator are not divided by production from a different operator. Proven plus probable reserves are summed only when both are available. No ticker-specific missing-data exception is applied.

---

### M2 — Reserve-Backed Value (RBV) & Implied Life

- **Description**: Computes a research proxy by discounting an annuity of attributable gross profit over the remaining mine life, compares it against equity market capitalization (*RBV Gap*), and solves for the market-implied mine life (*Implied Life*).
- **Formula**:
  $$\text{GP}(c) = \text{revenue\_usd}(c) - \text{cost\_of\_revenue\_usd}(c)$$
  $$\text{attributable\_GP}(s) = \sum_{c} \text{eff\_own}(s,c) \times \text{GP}(c)$$
  $$\text{RBV}(s) = \text{attributable\_GP}(s) \times \frac{1 - (1+r)^{-\min(\text{RLI}(s), 30)}}{r}$$
  $$\text{rbv\_gap\_pct}(s) = \frac{\text{market\_cap\_usd}(s) - \text{RBV}(s)}{\text{RBV}(s)} \times 100$$
  $$\text{implied\_life}(s) = \frac{-\ln\left(1 - \frac{\text{market\_cap\_usd}(s) \times r}{\text{attributable\_GP}(s)}\right)}{\ln(1+r)}$$
  $$\text{reserve\_life\_gap}(s) = \text{implied\_life}(s) - \text{RLI}(s)$$
- **Parameter Assumptions**:
  - `discount_rate` ($r$): Default $0.12$ (12% hurdle rate for Indonesian natural-resource equities).
  - `fx_idr_usd`: Default $16,200.0$ IDR/USD.
  - `max_annuity_years`: 30 years.
- **Unbounded Case**: If $\text{market\_cap\_usd} \times r \ge \text{attributable\_GP}$, the a finite implied life cannot be solved under this gross-profit annuity model $\implies \text{implied\_life} = \text{NULL}$ with an internal unbounded result flag.

---

Issuer identity self-links with no financial or performance records, when linked operators exist, remain in the graph and are explicitly excluded from the operator model. Included/excluded scope is recorded in Evidence.

M2 requires a consistent gross-profit basis and explicit effective ownership for all attributable links. Generic `profit_usd` is accepted only when identified as gross profit; net profit is never substituted silently. Incomplete financial coverage prevents an issuer-wide projection. Nonpositive gross profit stays visible but has no positive annuity valuation.

RBV excludes overhead, tax, reinvestment and the enterprise-to-equity bridge. Comparing it with market capitalization does not establish fair value.

### M3 — License Cliff

- **Description**: Identifies the risk of mining concessions (IUP/IUPK) expiring within 1-, 3-, and 5-year horizons, the Clean and Clear (CNC) certification ratio, and the weighted average days remaining.
- **Formula**:
  $$\text{cliff}_{Ny}(s) = \frac{\sum \{ l \in L(s) : l.\text{expiry} \le \text{today} + N\text{y} \land l.\text{is\_production\_operation} \} \text{licensed\_area\_ha}}{\sum \{ l \in L(s) \} \text{licensed\_area\_ha}}$$

  The numerator includes production-operation licenses. The formula uses an English descriptive predicate for the source activity classification; the engine retains the upstream enum value unchanged.
  $$\text{cnc\_coverage\_pct}(s) = \frac{\sum_{l \in L(s), l.\text{cnc} = \text{'CNC'}} \text{licensed\_area\_ha}}{\sum_{l \in L(s)} \text{licensed\_area\_ha}} \times 100$$
  $$\text{weighted\_days\_to\_expiry}(s) = \frac{\sum_{l \in L(s)} (\text{area}_l \times \text{days\_to\_expiry}_l)}{\sum_{l \in L(s)} \text{area}_l}$$

---

### M4 — Cash Cost Curve & Breakeven

- **Description**: Computes the cash cost of mining per ton (FOB cash cost), the average realized selling price, the unit margin, the percentile position on the cumulative national cost curve, and the breakeven price.
- **Formula**:
  $$\text{mining\_cost}(c) = \text{cost\_of\_revenue\_usd}(c) - \text{cost\_of\_revenue\_breakdown}.\text{get}('purchased\_coal', 0)$$
  $$\text{tons}(c) = \text{sales\_volume} \times 10^6$$
  $$\text{cash\_cost\_per\_ton}(c) = \frac{\text{mining\_cost}(c)}{\text{tons}(c)}$$
  $$\text{realized\_price\_per\_ton}(c) = \frac{\text{mining\_revenue}(c)}{\text{tons}(c)}$$
  $$\text{unit\_margin}(c) = \text{realized\_price\_per\_ton} - \text{cash\_cost\_per\_ton}$$
  $$\text{breakeven\_benchmark\_price}(c) = \text{benchmark\_price} \times \frac{\text{cash\_cost}}{\text{realized}}$$
- **National Cost Curve**: All coal issuers are sorted ascending by `cash_cost_per_ton`. The numeric X-axis represents cumulative annual sales volume (Mt), with production volume used when sales volume is unavailable. `cost_curve_percentile` represents the midpoint of cumulative volume relative to total volume of the current issuer universe.

---

### M5 — Quality-Adjusted Realization

- **Description**: Maps the issuer's average coal calorific value (CV kcal/kg GAR) to industry benchmark standards (Indonesian Coal Index / Newcastle).
- **Coal Grade Classification**:
  - $\text{CV} < 4200\text{ kcal/kg} \implies \text{ICI-4 (4200 GAR)}$
  - $4200 \le \text{CV} < 5000\text{ kcal/kg} \implies \text{ICI-3 (5000 GAR)}$
  - $5000 \le \text{CV} < 5800\text{ kcal/kg} \implies \text{ICI-2 (5800 GAR)}$
  - $\text{CV} \ge 5800\text{ kcal/kg} \implies \text{ICI-1 / Newcastle (6000 GAR)}$
- **Quality Discount/Premium**:
  $$\text{quality\_discount\_pct} = \frac{\text{benchmark\_price} - \text{realized\_price\_per\_ton}}{\text{benchmark\_price}} \times 100$$

---

### M6 — Destination Stress Test & Concentration HHI

- **Description**: Measures the issuer's export-market concentration using the Herfindahl-Hirschman Index (HHI) and identifies the share of the top destination country.
- **Formula**:
  $$\text{destination\_hhi}(s) = \sum_{\text{country}} (\text{pct\_of\_sales\_volume}(s, \text{country}))^2 \quad [0 - 10000]$$

---

### M7 — Contractor / Supply-Chain Graph

- **Description**: Evaluates dependence on a single mining-services contractor and the proportion of operating contracts expiring within the next 12 months.
- **Formula**:
  $$\text{contractor\_hhi}(s) = \sum_{\text{contractor}} (\text{share of owner's contracts})^2 \quad [0 - 10000]$$
  $$\text{contract\_cliff\_12m}(s) = \frac{\text{number of contracts with end\_date} \le \text{today} + 1\text{y}}{\text{total contracts}} \times 100$$
- **Missing inputs**: Missing contractor identities make HHI unavailable; missing or invalid end dates make the cliff unavailable. The composite contractor pillar requires both inputs and is dropped when incomplete. No neutral HHI or zero expiry risk is imputed.

---

### M8 — Ground Truth Score (0–100)

- **Description**: A composite fundamental asset score (not a technical buy/sell signal) that combines 5 main pillars through percentile ranking across the universe.
- **Base Weight Structure & Direction**:
  1. **RLI** (Weight 25%, direction: higher is better)
  2. **License Cliff 3y** (Weight 20%, direction: lower / less risk is better)
  3. **Cost Curve Percentile** (Weight 25%, direction: lower cost is better)
  4. **Destination HHI** (Weight 15%, direction: more diversification is better)
  5. **Contractor Risk** (Weight 15%, direction: lower contract risk is better)
- **Dynamic Re-normalization**:
  $$\text{norm\_weight}_i = \frac{\text{base\_weight}_i}{\sum_{j \in \text{Available}} \text{base\_weight}_j}$$
  $$\text{Ground Truth Score}(s) = \sum_{i \in \text{Available}} \text{percentile\_score}_i(s) \times \text{norm\_weight}_i$$
  $$\text{confidence}(s) = \sum_{j \in \text{Available}} \text{base\_weight}_j$$

The legacy API name `confidence` means **available weight coverage**, not statistical confidence. A single valid peer receives the neutral percentile 50. Scores with missing pillars stay available as provisional research summaries, but have no comparable complete-score rank. Complete ranking also requires RLI, RBV, and cash cost. Ties share competition ranks.

Weight sensitivity tests 11 configurations: baseline plus each of five weights multiplied separately by 0.8 and 1.2, followed by renormalization. Other weights and source inputs stay fixed. The reported score/rank ranges are sensitivity results, not confidence intervals. Partial scores never acquire a full-score rank through these tests.

---

### M9 — Market Divergence

- **Description**: Measures the disparity between market valuation (RBV Gap percentile) and underlying asset quality (Ground Truth Score percentile), complemented by an overlay of foreign investor fund flows (*Foreign Flow*) from the 30 calendar days ending at the metric date; insider sentiment is not shown by this endpoint.
- **Formula**:
  $$\text{divergence}(s) = \text{percentile}(\text{rbv\_gap\_pct}) - \text{percentile}(\text{ground\_truth\_score})$$
- **Interpretation Quadrants**:
  - `Higher Model Gap / Lower Score`
  - `Lower Model Gap / Higher Score`
  - `Higher Model Gap / Higher Score`
  - `Lower Model Gap / Lower Score`

Quadrants use the same peers with a model gap and complete score. Higher/lower refers to the peer median, not fair value, a price target, or necessarily the sign of the gap. Provisional scores have no quadrant.

---

## 3. Parametric Scenario Simulation Engine (Scenario Studio)

An in-memory simulation engine for evaluating macroeconomic impact live:
1. **Commodity Price Shock** ($\pm \Delta\%$).
2. **Destination-Country Import Restriction Shock** ($\Delta\%$ of volume per country, e.g. China $-30\%$).
3. **Concession License Renewal Failure** (*License Cliff Drop*).
4. **Discount Rate & Variable Cost Parameter Adjustment** (`discount_rate` and `variable_cost_share`, default $0.65$).
5. **Output**: Recomputed gross profit, post-shock RBV, and issuer ranking shifts (*Rank Change*). `delta_rbv_pct` already contains percentage points, so −25 means −25%, not −2500%.

When attributable revenue (`R`) and cost (`C`) reconcile with the published gross profit, demand loss `d` and price shock `p` produce:

$$R' = R(1+p)(1-d)$$
$$C' = C[(1-v)+v(1-d)]$$
$$GP' = R'-C'$$
$$\text{RBV}' = \max(GP',0) \times \text{annuity}(\min(RLI',30),r')$$

`v` is the variable-cost share, default 0.65. Without this breakdown, the engine labels `gross_profit_proxy` and scales published gross profit by price and volume; variable-cost share is not applied and revenue at risk remains unknown for nonzero demand loss. Country shocks represent demand reductions, not import tariff rates. License expiry uses area share as a reserve-life proxy; 100% expiry can reduce scenario reserve value to zero.

Negative gross profit remains negative in the response. `gross_loss_usd` exposes the loss while RBV retains a zero floor. Revenue and cost are not inferred for a gross-profit proxy. The break-even price change solves `C' / [R(1-d)] - 1`, holding scenario volume and cost assumptions fixed.

Driver attribution applies price, destination volume, license life, then discount rate sequentially. Interactions belong to the later driver. A material published-baseline reconciliation is shown separately. Rounded dollar contributions reconcile to the headline change.

The sensitivity grid varies price by −20, −10, 0, +10, +20 percentage points around the current shock and discount by −4, 0, +4 percentage points around its current value. Values are clipped to request bounds and deduplicated; other parameters stay fixed. The active cell equals the scenario result. These combinations are not probabilities. Size ranks order RBV, not resilience; ties share ranks.

Baseline discount rate comes from the published run (default 12%); the request discount rate changes the scenario only. New metric runs store scenario inputs in evidence. Legacy runs can derive missing inputs from current linked data and carry proxy warnings. The UI debounces controls, cancels superseded requests, and hides results that no longer match the controls. URL parameters restore the same scenario after refresh.

---

## 4. Explicit Local Dataset

`GALI_DATA_MODE=simulation` selects a bundled, synthetic snapshot dated 30 September 2026. Issuer identifiers are real ticker labels; financials, reserves, operators, locations, licenses, and flows are fictitious scenarios. Python M1–M9 functions compute the bundled metrics. The local TypeScript scenario engine is checked against Python outputs, and recalculates every parameter change. Source origin appears in dataset status, Coverage, Evidence, API headers, and CSV exports.

The dashboard resilience matrix uses three separate scenarios: commodity price −20%, China destination demand −30%, and non-renewal of licenses expiring within three years. Aggregate cards include complete issuers with quantifiable RBV; partial issuers remain visible in the matrix with unavailable values. Unit economics separates gross margin from earnings and free cash flow. The local map is schematic, with leader lines to synthetic coordinates; it is not verified cadastral geography.

`GALI_DATA_MODE=sectors` retains the upstream/cache-backed integration and never silently substitutes synthetic data. See `docs/LOCAL_DATASET.md` for generation, execution, and limitations.

## 5. Methodological Limitations & Legal Disclaimer

- Latest reporting years are selected per entity; operations and financials may still come from different reporting periods. Review the years in Evidence.
- RBV is a gross-profit annuity, not a full equity valuation: it does not deduct all taxes, capex, financing, or reclamation costs. No backtest, investment performance claim, or measured research-time saving is provided.
- “COMPLETE” means RLI, RBV, and cash cost are populated. It does not assert all five score pillars or all upstream endpoints are complete. The displayed confidence percentage is available score weight, not statistical confidence.
- Generic Coal reference prices are not relabeled ICI grade prices. Missing prices stay null. Product CV is a simple mean of specifications, not a production-weighted product mix.
- License cliff values require qualified matches and available areas/expiry dates. Missing inputs remain null; zero is not a guarantee of renewal.
- Ownership seeds and the existing ADRO–AADI mapping require review against source dates. Summing issuer RBVs can count the same underlying entity through multiple listed ownership interests.
- The current graph and geospatial read endpoints use normalized current entities. Full historical graph/site snapshots and exact per-field raw lineage remain future work.
- Data analysis mode and comparative summaries use explicit rules on API facts. Since version 0.5.0, AI analysis and AI research briefs can optionally explain the results in plain language, while numeric metrics remain deterministic.


> [!IMPORTANT]
> **OFFICIAL DISCLAIMER:**
> All metrics, scores, reserve-backed valuation (RBV) estimates, and scenario simulations produced by the GALI platform are presented exclusively for analytical information, academic research, and understanding of mining-industry operations.
> 
> GALI is **NOT** a licensed investment advisory institution, and the content on this platform **CANNOT** be construed as a recommendation, offer, or solicitation to buy, sell, or hold any security listed on the Indonesia Stock Exchange (IDX). Investment decisions are entirely the independent responsibility of the user.
