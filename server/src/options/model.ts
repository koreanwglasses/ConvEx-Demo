import mongoose from "mongoose";
const { Schema, model } = mongoose;

interface GuildOptions {
  guildId: string;
  keywords: string[];
}

const schema = new Schema<GuildOptions>({
  guildId: String,
  keywords: [String],
});

export const GuildOptions = model<GuildOptions>("GuildOptions", schema);

export const update = async (
  guildId: string,
  options: Partial<GuildOptions>
) => {
  return await GuildOptions.findOneAndUpdate({ guildId }, options ?? {}, { new: true, upsert: true })
    .lean()
    .exec();
};
