import config from "./config";
import mongoose from "mongoose";
import session from "express-session";
import MongoDBStore from "connect-mongodb-session";
import mongooseLong from "mongoose-long";
mongooseLong(mongoose);

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

export const store = new (MongoDBStore(session))({
  uri,
  collection: "sessions",
});
