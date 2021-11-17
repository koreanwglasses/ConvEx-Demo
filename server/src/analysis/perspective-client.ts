import Perspective from "perspective-api-client";
import config from "../config";

export let perspective: Perspective;

export function init() {
  const apiKey = config.perspective.apiKey;
  if (!apiKey)
    throw new Error(
      "Cannot initialize the Perspective API client. Please set the environment " +
        "variable PERSPECTIVE_API_KEY to a valid key."
    );

  perspective = new Perspective({ apiKey: config.perspective.apiKey });
}
