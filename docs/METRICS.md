# GALI METRICS METHODOLOGY & GROUND TRUTH SPECIFICATION

> **Official Documentation of the M1–M9 Metrics Methodology, Scenario Engine, & Provenance Audit**
> Methodology Version: `2.0-verified` · Date: **29 August 2026**

---

## 1. Methodology Overview & Core Principles

GALI (**Ground-truth Analytics for Listed Issuers**) combines public exchange data (IDX) with upstream physical operational, geospatial, and licensing data (Indonesia's Ministry of Energy and Mineral Resources & Sectors Mining Intelligence) to expose the fundamental reality of Indonesian natural-resource issuers.

### Core Data Integrity Principles of GALI:
1. **Zero Guesswork / No Proxy Hallucination**: A field that is `NULL` in the upstream data stays `NULL` in the output. Using industry averages, guessed estimates, or unfounded imputation is prohibited.
2. **Audit Provenance**: Every number produced links directly to a raw response ID (`raw.responses.id`) and records an explicit reason for any empty field.
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
- **Data Limitation**: If a mine's reserves are not reported (e.g. DSSA), RLI is `NULL`.

---

### M2 — Reserve-Backed Value (RBV) & Implied Life

- **Description**: Computes the fair value of reserve assets by discounting an annuity of gross-profit cash flows over the remaining mine life, compares it against exchange market capitalization (*RBV Gap*), and solves for the market-implied mine life (*Implied Life*).
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
- **Unbounded Case**: If $\text{market\_cap\_usd} \times r \ge \text{attributable\_GP}$, the market is assuming an infinite mine life $\implies \text{implied\_life} = \text{NULL}$ with the flag `"unbounded": true`.

---

### M3 — License Cliff

- **Description**: Identifies the risk of mining concessions (IUP/IUPK) expiring within 1-, 3-, and 5-year horizons, the Clean and Clear (CNC) certification ratio, and the weighted average days remaining.
- **Formula**:
  $$\text{cliff}_{Ny}(s) = \frac{\sum \{ l \in L(s) : l.\text{expiry} \le \text{today} + N\text{y} \land l.\text{activity} = \text{'Operasi Produksi'} \} \text{licensed\_area\_ha}}{\sum \{ l \in L(s) \} \text{licensed\_area\_ha}}$$
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
- **National Cost Curve**: All coal issuers are sorted ascending by `cash_cost_per_ton`. The X-axis represents cumulative production (Mt). `cost_curve_percentile` represents the midpoint of cumulative volume relative to total industry volume.

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

---

### M9 — Market Divergence

- **Description**: Measures the disparity between market valuation (RBV Gap percentile) and underlying asset quality (Ground Truth Score percentile), complemented by an overlay of foreign investor fund flows (*Foreign Flow*) and insider transaction sentiment (*Insider Filings*).
- **Formula**:
  $$\text{divergence}(s) = \text{percentile}(\text{rbv\_gap\_pct}) - \text{percentile}(\text{ground\_truth\_score})$$
- **Interpretation Quadrants**:
  - `Overvalued Premia / Weak Ground Truth`: Market valuation is high above underlying asset value.
  - `Deep Value Discount / Strong Ground Truth`: Market valuation is discounted relative to the strength of reserve fundamentals and operating costs.

---

## 3. Parametric Scenario Simulation Engine (Scenario Studio)

A high-performance in-memory simulation engine ($< 50$ ms) for evaluating macroeconomic impact live:
1. **Commodity Price Shock** ($\pm \Delta\%$).
2. **Destination-Country Import Restriction Shock** ($\Delta\%$ of volume per country, e.g. China $-30\%$).
3. **Concession License Renewal Failure** (*License Cliff Drop*).
4. **Discount Rate & Variable Cost Parameter Adjustment** (`discount_rate` and `variable_cost_share`, default $0.65$).
5. **Output**: Instant recomputation of gross profit, post-shock RBV, and issuer ranking shifts (*Rank Change*).

---

## 4. Methodological Limitations & Legal Disclaimer

> [!IMPORTANT]
> **OFFICIAL DISCLAIMER:**
> All metrics, scores, reserve-backed valuation (RBV) estimates, and scenario simulations produced by the GALI platform are presented exclusively for analytical information, academic research, and understanding of mining-industry operations.
> 
> GALI is **NOT** a licensed investment advisory institution, and the content on this platform **CANNOT** be construed as a recommendation, offer, or solicitation to buy, sell, or hold any security listed on the Indonesia Stock Exchange (IDX). Investment decisions are entirely the independent responsibility of the user.
