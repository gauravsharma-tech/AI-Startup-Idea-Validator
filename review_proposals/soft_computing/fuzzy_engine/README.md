# Mamdani Fuzzy Inference System for Early-Stage Startup Viability (Soft Computing Review Proposal)

## 1. Problem Statement
The current scoring system (`src/lib/engine/scoring.ts` & `config.ts`) calculates final scores via a **linear weighted sum**:
$$\text{Raw} = 0.25 \times \text{demand} + 0.20 \times \text{problemFit} + 0.15 \times \text{innovation} + 0.15 \times \text{competition} + 0.15 \times \text{business} + 0.10 \times \text{scalability}$$

### The Compensatory Flaw in Linear Models:
In linear combinations, a high score in one dimension compensates for a catastrophic flaw in another. For example, if a founder writes a lengthy, keyword-rich pitch, `demand`, `problemFit`, and `innovation` scores can rise above 85. Even if `competition` is severe and `moat` is 0, the weighted sum averages out to a score above 65 ("Promising"), falsely reassuring the founder.

Furthermore, early-stage evaluation inputs (e.g. "Problem Severity", "Perceived Demand") are inherently fuzzy linguistic concepts, not crisp, exact measurements.

## 2. Proposed Solution: Mamdani Fuzzy Logic Inference
Soft Computing allows modeling epistemic uncertainty and non-linear bottleneck constraints using linguistic variables:
1. **Linguistic Variables & Continuous Membership Functions**:
   - `ProblemFit`: Poor, Moderate, Strong (Trapezoidal / Triangular)
   - `MarketDemand`: Thin, Moderate, Substantial
   - `CompetitionPressure`: Negligible, Moderate, Severe
   - `MoatStrength`: Weak, Moderate, Defensible
   - `StartupViability`: Fatal (0–35), HighRisk (25–60), Viable (50–85), HighlyViable (75–100)
2. **Fuzzy Rules**:
   - `IF ProblemFit is Poor AND MarketDemand is Thin THEN Viability is Fatal`
   - `IF CompetitionPressure is Severe AND MoatStrength is Weak THEN Viability is Fatal`
   - These rules act as **hard bottleneck guards** that linear models cannot express.
3. **Mamdani Min-Implication & Max-Aggregation**:
   - Firing strengths $\alpha_k$ clip the consequent membership curves.
4. **Centroid (Center of Gravity) Defuzzification**:
   - Numerical integration calculates a calibrated crisp viability score that reflects non-linear interactions.

## 3. Files in this Proposal
- `membership.ts`: Triangular, Trapezoidal, Gaussian, and Sigmoidal membership functions.
- `fuzzy_rule.ts`: Linguistic variables, fuzzy conditions, T-norm (MIN) and S-norm (MAX) operators.
- `fuzzy_system.ts`: Mamdani inference engine with Centroid and Mean of Maximum (MOM) defuzzifiers.
- `startup_fuzzy_model.ts`: Pre-calibrated 9-rule startup viability model.
- `fuzzy_system.test.ts`: Automated test suite verifying boundary conditions and bottleneck protection.

## 4. How to Test Independently
Run the standalone test suite without modifying the running application:
```bash
node --experimental-strip-types --test review_proposals/soft_computing/fuzzy_engine/fuzzy_system.test.ts
```

## 5. Potential Future Integration Point (Reference Only)
If approved in the future, the fuzzy score can be exposed on the results screen as an **Independent Soft Computing Consistency Check** alongside the Random Forest and Rules verdicts, or used to flag critical bottleneck risks in `src/lib/engine/insights.ts`.
