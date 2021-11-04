export interface GuildData {
  id: string;
  name: string;
  iconURL: string;
}

export interface UserData {
  id: string;
  username: string;
  discriminator: string;
  avatarURL: string;
}

export interface ChannelData {
  id: string;
  name: string;
}
