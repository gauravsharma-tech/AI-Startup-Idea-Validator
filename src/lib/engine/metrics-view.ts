import metricsJson from "./model/metrics.json";

export type PublishedMetrics = {
  accuracy: number;
  precisionMacro: number;
  recallMacro: number;
  f1Macro: number;
  precisionWeighted: number;
  recallWeighted: number;
  f1Weighted: number;
  adjacentAccuracy: number;
  rulesAccuracy: number;
  agreementWithRules: number;
  adjacentAgreementWithRules: number;
  datasetId: string;
  confusionMatrix: number[][];
  classNames: string[];
  nTrain: number;
  nTest: number;
  classificationReport: string;
  datasetKind: string;
  disclaimer: string;
};

export function getPublishedMetrics(): PublishedMetrics {
  return metricsJson as PublishedMetrics;
}
