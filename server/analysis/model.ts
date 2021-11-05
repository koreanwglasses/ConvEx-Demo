import to from "await-to-js";
import { Result } from "perspective-api-client";
import { AnalysisData } from "../common/api-data-types";
import { perspective } from "./perspective";

const toAnalysisData = (result: Result): AnalysisData =>
  result && {
    overallToxicity: result.attributeScores["TOXICITY"].summaryScore.value,
  };

export const analyze = async (text: string | null) => {
  if (!text) return null;

  // ignore err for now
  const [err, result] = await to(perspective.analyze(text));

  return toAnalysisData(result) as AnalysisData | null;
};
