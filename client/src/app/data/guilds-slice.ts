import { createSlice } from "@reduxjs/toolkit";
import type { RootState, AppThunk } from "../store";
import { GuildData } from "../../common/api-data-types";
import { fetchJSON } from "../../utils";

// Define a type for the slice state
interface GuildsState {
  pending: boolean;
  lastError?: any;
  guildsData?: Record<string, GuildData>;
  isValid: boolean;
}

// Define the initial state using that type
const initialState: GuildsState = {
  pending: false,
  isValid: false,
};

export const Guilds = createSlice({
  name: "counter",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    startFetchingGuilds(state) {
      state.lastError = undefined;
      state.guildsData = undefined;
      state.pending = true;
    },
    finishFetchingGuilds(
      state,
      action: { payload: { guilds?: GuildData[]; err?: any } }
    ) {
      state.lastError = action.payload.err;
      state.guildsData =
        action.payload.guilds &&
        Object.fromEntries(
          action.payload.guilds.map((guild) => [guild.id, guild])
        );
      state.pending = false;
      state.isValid = true;
    },
  },
});

export const { startFetchingGuilds, finishFetchingGuilds } = Guilds.actions;

export const fetchGuilds =
  (invalidate = false): AppThunk =>
  async (dispatch, getState) => {
    const state = getState().guilds;
    if (state.pending) return;
    if (!invalidate && state.isValid) return;

    dispatch(startFetchingGuilds());
    const [err, guilds] = await fetchJSON("/api/guilds/list");
    dispatch(finishFetchingGuilds({ guilds, err }));
  };

export const selectGuilds = (state: RootState) => state.guilds;

export const selectGuildById = (id: string) => (state: RootState) =>
  state.guilds.guildsData?.[id];

export default Guilds.reducer;
