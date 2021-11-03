import config from "./config";

export function baseURL() {
  return `http://${config.express.hostname}${
    config.express.port == 80 || config.express.port == 8080
      ? ""
      : `:${config.express.port}`
  }`;
}
