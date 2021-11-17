import config from "./config";
import mongoose from "mongoose";

const uri =
  `mongodb://${config.database.user}:${config.database.password}` +
  `@${config.database.host}:${config.database.port}/${config.database.name}` +
  `?retryWrites=true&writeConcern=majority`;

export async function init() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to database!");
  } catch (e) {
    console.error("Could not connect to database.");
  }
}
