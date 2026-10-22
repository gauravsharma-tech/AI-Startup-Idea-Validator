#!/usr/bin/env python3
"""Train the Random Forest "consistency check" on simulated startup ideas.

The data is SIMULATED, not real startup outcomes. Each row is an idea that was
generated with a hidden quality score and then run through the app's own feature
extractor (src/lib/engine/features.ts), so the feature distribution matches what
the app produces at runtime. The label is the hidden quality (plus noise) cut into
the same four classes the rules verdict uses.

Pipeline (the generator is TypeScript so it can reuse the real engine):

    node --experimental-strip-types --no-warnings -e \
      "import('./src/lib/engine/demo.ts').then(async m => process.stdout.write(await m.simulatedDatasetCsv(4000, 42)))" \
      > data/synthetic_startups.csv
    python backend/ml/train.py

Re-run both whenever scoring (features.ts, nlp.ts, config.ts CALIBRATION) changes,
then bump MODEL_VERSION in src/lib/engine/config.ts.

The trained forest is exported as JSON so the Node runtime can run inference
without Python.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "src" / "lib" / "engine" / "model"
CSV_PATH = ROOT / "data" / "synthetic_startups.csv"

# Order must match SIM_FEATURE_ORDER in src/lib/engine/demo.ts.
FEATURE_NAMES = [
    "market_demand",
    "problem_fit",
    "innovation",
    "competition",
    "business_potential",
    "scalability",
    "customer_need",
    "risk",
    "competitor_count",
    "desc_specificity",
    "pricing_present",
    "differentiator_strength",
    "text_evidence",
    "self_rating_avg",
]
# Weakest to strongest; identical to ML_CLASS_NAMES in types.ts and the rules verdicts.
CLASS_NAMES = [
    "Needs Major Improvement",
    "High Risk",
    "Promising",
    "Highly Promising",
]


def export_forest(clf: RandomForestClassifier) -> dict:
    trees = []
    for est in clf.estimators_:
        t = est.tree_
        trees.append(
            {
                "feature": t.feature.tolist(),
                "threshold": np.round(t.threshold, 4).tolist(),
                "left": t.children_left.tolist(),
                "right": t.children_right.tolist(),
                "value": np.round(t.value.reshape(t.node_count, -1), 4).tolist(),
            }
        )
    return {
        "nClasses": int(clf.n_classes_),
        "classNames": CLASS_NAMES,
        "featureNames": FEATURE_NAMES,
        "nEstimators": int(clf.n_estimators),
        "maxDepth": int(clf.max_depth or 0),
        "importances": [float(x) for x in clf.feature_importances_],
        "trees": trees,
    }


def main() -> None:
    raw = CSV_PATH.read_bytes()
    dataset_id = hashlib.sha1(raw).hexdigest()[:8]
    df = pd.read_csv(CSV_PATH)
    X = df[FEATURE_NAMES].to_numpy(dtype=float)
    y = df["label"].to_numpy(dtype=int)
    rules = df["rules_label"].to_numpy(dtype=int)  # reporting only, never a feature

    idx = np.arange(len(df))
    tr, te = train_test_split(idx, test_size=0.25, random_state=42, stratify=y)
    clf = RandomForestClassifier(
        n_estimators=64,
        max_depth=8,
        min_samples_leaf=8,
        max_features="sqrt",
        random_state=42,
        n_jobs=1,
    )
    clf.fit(X[tr], y[tr])
    pred = clf.predict(X[te])
    y_te, rules_te = y[te], rules[te]

    adjacent = float(np.mean(np.abs(pred - y_te) <= 1))
    metrics = {
        "accuracy": round(float(accuracy_score(y_te, pred)), 4),
        "precisionMacro": round(float(precision_score(y_te, pred, average="macro", zero_division=0)), 4),
        "recallMacro": round(float(recall_score(y_te, pred, average="macro", zero_division=0)), 4),
        "f1Macro": round(float(f1_score(y_te, pred, average="macro", zero_division=0)), 4),
        "precisionWeighted": round(float(precision_score(y_te, pred, average="weighted", zero_division=0)), 4),
        "recallWeighted": round(float(recall_score(y_te, pred, average="weighted", zero_division=0)), 4),
        "f1Weighted": round(float(f1_score(y_te, pred, average="weighted", zero_division=0)), 4),
        # Within one class of the simulated label: the number that matters for a consistency check.
        "adjacentAccuracy": round(adjacent, 4),
        # The same held-out rows scored by the calibrated rules, for comparison.
        "rulesAccuracy": round(float(accuracy_score(y_te, rules_te)), 4),
        # How often forest and rules land in the same class / within one class.
        "agreementWithRules": round(float(np.mean(pred == rules_te)), 4),
        "adjacentAgreementWithRules": round(float(np.mean(np.abs(pred - rules_te) <= 1)), 4),
        "confusionMatrix": confusion_matrix(y_te, pred, labels=[0, 1, 2, 3]).tolist(),
        "classNames": CLASS_NAMES,
        "nTrain": int(len(tr)),
        "nTest": int(len(te)),
        "datasetId": dataset_id,
        "classificationReport": classification_report(
            y_te, pred, labels=[0, 1, 2, 3], target_names=CLASS_NAMES, zero_division=0
        ),
        "datasetKind": "simulated",
        "disclaimer": (
            "Metrics reflect performance on held-out SIMULATED ideas whose labels come from a "
            "simulated quality score. They are not a claim of real-world startup prediction accuracy."
        ),
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    model = export_forest(clf)
    model["datasetId"] = dataset_id
    model["metrics"] = {
        k: metrics[k]
        for k in (
            "accuracy",
            "precisionMacro",
            "recallMacro",
            "f1Macro",
            "adjacentAccuracy",
            "rulesAccuracy",
            "agreementWithRules",
            "confusionMatrix",
            "nTrain",
            "nTest",
            "datasetKind",
            "disclaimer",
        )
    }
    (OUT_DIR / "forest.json").write_text(json.dumps(model))
    (OUT_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2))

    print("dataset", dataset_id, "rows", len(df))
    print("forest accuracy", metrics["accuracy"], "| within-one-class", metrics["adjacentAccuracy"])
    print("rules accuracy (same rows)", metrics["rulesAccuracy"])
    print("forest vs rules: same class", metrics["agreementWithRules"], "| within one", metrics["adjacentAgreementWithRules"])
    print("f1_macro", metrics["f1Macro"])
    print("confusion", metrics["confusionMatrix"])
    print("top features", sorted(zip(FEATURE_NAMES, clf.feature_importances_), key=lambda x: -x[1])[:5])
    print("wrote", OUT_DIR / "forest.json")


if __name__ == "__main__":
    main()
