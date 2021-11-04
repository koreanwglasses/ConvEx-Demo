import { createSlice } from "@reduxjs/toolkit";
import type { RootState, AppThunk } from "../store";
import { ChannelData } from "../../common/api-data-types";
import { fetchJSON } from "../../utils";

// Define a type for the slice state
interface ChannelsState {
  channelsByGuild: Record<
    string,
    {
      pending: boolean;
      lastError?: any;
      channelsData?: Record<string, ChannelData>;
      isValid: boolean;
    }
  >;
}

// Define the initial state using that type
const initialState: ChannelsState = { channelsByGuild: {} };

export const Channels = createSlice({
  name: "counter",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    startFetchingChannels(state, action: { payload: { guildId: string } }) {
      const { guildId } = action.payload;
      state.channelsByGuild[guildId] = { pending: true, isValid: false };
    },
    finishFetchingChannels(
      state,
      action: {
        payload: { guildId: string; channels?: ChannelData[]; err?: any };
      }
    ) {
      const { guildId } = action.payload;
      state.channelsByGuild[guildId] = {
        lastError: action.payload.err,
        channelsData:
          action.payload.channels &&
          Object.fromEntries(
            action.payload.channels.map((guild) => [guild.id, guild])
          ),
        pending: false,
        isValid: true,
      };
    },
  },
});

export const { startFetchingChannels, finishFetchingChannels } =
  Channels.actions;

export const fetchChannels =
  (guildId: string, invalidate = false): AppThunk =>
  async (dispatch, getState) => {
    const state = getState().channels.channelsByGuild[guildId] ?? {
      pending: false,
      isValid: false,
    };
    if (state.pending) return;
    if (!invalidate && state.isValid) return;

    dispatch(startFetchingChannels({ guildId }));
    const [err, channels] = await fetchJSON(`/api/channels/${guildId}/list`);
    dispatch(finishFetchingChannels({ guildId, channels, err }));
  };

export const selectChannels = (guildId: string) => (state: RootState) =>
  state.channels.channelsByGuild[guildId] ?? {
    pending: false,
    isValid: false,
  };

export const selectChannelById =
  (guildId: string, channelId: string) => (state: RootState) =>
    state.channels.channelsByGuild[guildId]?.channelsData?.[channelId];

export default Channels.reducer;
