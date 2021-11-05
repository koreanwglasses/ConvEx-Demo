import config from "./config";

export function baseURL() {
  return `http://${config.server.hostname}${
    config.server.port == 80 || config.server.port == 8080
      ? ""
      : `:${config.server.port}`
  }`;
}
