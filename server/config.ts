const config = {
  discord: {
    /**
     * Token for the Discord bot ConvEx will use
     */
    botToken: process.env.DISCORD_BOT_TOKEN,
    clientID: process.env.DISCORD_OAUTH_CLIENT_ID,
    clientSecret: process.env.DISCORD_OAUTH_CLIENT_SECRET,
  },

  perspective: {
    /**
     * API key for Perspective API
     */
    apiKey: process.env.PERSPECTIVE_API_KEY,
  },

  server: {
    /**
     * Port to start express server on
     */
    port: +process.env.PORT || 4000,
    /**
     * IP address to start the server on
     */
    hostname: process.env.HOSTNAME ?? "localhost",
    sessionSecret: process.env.SESSION_SECRET ?? "abc",
  },

  database: {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 27017,
  },
};

export default config;
