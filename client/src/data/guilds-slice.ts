import { createSlice } from "@reduxjs/toolkit";
import { Guild } from "discord.js";
import type { RootState, AppThunk } from "../app/store";
import { APIData, fetchJSON } from "../utils";

// Define a type for the slice state
interface GuildsState {
  pending: boolean;
  lastError?: any;
  guilds?: APIData<Guild>[];
}

// Define the initial state using that type
const initialState: GuildsState = {
  pending: false,
};

export const Guilds = createSlice({
  name: "counter",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    startFetchingGuilds(state) {
      state.lastError = undefined;
      state.guilds = undefined;
      state.pending = true;
    },
    finishFetchingGuilds(
      state,
      action: { payload: { guilds?: APIData<Guild>[]; err?: any } }
    ) {
      state.lastError = action.payload.err;
      state.guilds = action.payload.guilds;
      state.pending = false;
    },
  },
});

export const { startFetchingGuilds, finishFetchingGuilds } = Guilds.actions;

export const fetchGuilds = (): AppThunk => async (dispatch) => {
  dispatch(startFetchingGuilds());
  const [err, guilds] = await fetchJSON("/api/guilds/list");
  dispatch(finishFetchingGuilds({ guilds, err }));
};

export const selectGuilds = (state: RootState) => state.guilds;

export default Guilds.reducer;
