import type { FeatureVector, MlClass } from "./types";
import forestJson from "./model/forest.json";

type Tree = {
  feature: number[];
  threshold: number[];
  left: number[];
  right: number[];
  value: number[][];
};

type ForestFile = {
  nClasses: number;
  classNames: MlClass[];
  featureNames: (keyof FeatureVector)[];
  trees: Tree[];
  nEstimators: number;
  /** Short hash of the training CSV; part of every report's modelVersion. */
  datasetId: string;
  metrics: {
    accuracy: number;
    precisionMacro: number;
    recallMacro: number;
    f1Macro: number;
    adjacentAccuracy: number;
    rulesAccuracy: number;
    agreementWithRules: number;
    confusionMatrix: number[][];
    nTrain: number;
    nTest: number;
    datasetKind: string;
    disclaimer: string;
  };
  importances: number[];
};

const MODEL = forestJson as ForestFile;
const LEAF = -2;

function walk(tree: Tree, x: number[]) {
  let node = 0;
  const { feature, threshold, left, right } = tree;
  while (feature[node] !== LEAF) {
    const f = feature[node];
    node = x[f] <= threshold[node] ? left[node] : right[node];
  }
  return tree.value[node];
}

export function predictForest(features: FeatureVector) {
  const x = MODEL.featureNames.map((name) => Number(features[name] ?? 0));
  const votes = new Array(MODEL.nClasses).fill(0);
  for (const tree of MODEL.trees) {
    const counts = walk(tree, x);
    let best = 0;
    let bestVal = -1;
    for (let i = 0; i < counts.length; i += 1) {
      if (counts[i] > bestVal) {
        bestVal = counts[i];
        best = i;
      }
    }
    votes[best] += 1;
  }
  const total = votes.reduce((a: number, b: number) => a + b, 0) || 1;
  const proba = votes.map((v: number) => v / total);
  let idx = 0;
  for (let i = 1; i < proba.length; i += 1) if (proba[i] > proba[idx]) idx = i;
  return {
    prediction: MODEL.classNames[idx],
    confidence: Number(proba[idx].toFixed(3)),
    proba,
  };
}

/** Identifies the exact training data behind the forest (changes on retrain). */
export function getForestId() {
  return MODEL.datasetId;
}

export function getModelMetrics() {
  return {
    ...MODEL.metrics,
    importances: MODEL.importances,
    featureNames: MODEL.featureNames,
    classNames: MODEL.classNames,
    nEstimators: MODEL.nEstimators,
  };
}
