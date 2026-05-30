# Recommendations & Docs

Living documentation for `skills.app` — findings, audits, and proposed work.

## Contents

- [`upgrade-report.md`](./upgrade-report.md) — prioritized, verified upgrade
  recommendations (dependencies, framework, tooling, code patterns). Produced by
  a multi-agent review workflow: scan → loop-until-dry discovery → adversarial
  verification → synthesis. 54 candidates discovered, 38 verified real, grouped
  into **Do now / Plan soon / Nice to have** with a 5-batch execution order.

## How the upgrade report was generated

A budget-paced workflow ran three parallel scans (deps, tooling, code patterns),
then looped generating new upgrade candidates until rounds went dry, then had an
independent skeptic agent adversarially verify each candidate against the real
working tree (rejecting anything already done, speculative, or not applicable),
and finally synthesized the survivors into the ranked report.
