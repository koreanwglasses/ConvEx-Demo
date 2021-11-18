import { to } from "await-to-js";
import { perspective } from "./perspective-client";

export const analyzeText = async (
  text: string | null
): Promise<number | null> => {
  if (!text) return null;

  // ignore err for now
  const [err, result] = await to(perspective.analyze(text));

  if (err) return null;
  return result.attributeScores.TOXICITY.summaryScore.value;
};
