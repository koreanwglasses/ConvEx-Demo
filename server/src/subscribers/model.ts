import mongoose from "mongoose";
const { Schema, model } = mongoose;

type Privilege = "BackgroundAnalysis";

interface Subscriber {
  guildId: string;
  privileges: Privilege[];
}

const schema = new Schema<Subscriber>({
  guildId: String,
  privileges: [String],
});

export const Subscriber = model<Subscriber>("Subscriber", schema);
