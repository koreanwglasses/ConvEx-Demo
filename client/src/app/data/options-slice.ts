import { createSlice } from "@reduxjs/toolkit";
import { AppThunk, RootState } from "../store";
import { deepEqual, fetchJSON } from "../../utils";
import { WritableDraft } from "immer/dist/types/types-external";
import { useAppDispatch, useAppSelector } from "../hooks";

interface SubState {
  pending: boolean;
  lastErr?: any;
  options?: { keywords: string[] };
}

// Define a type for the slice state
interface OptionsState {
  [key: string]: SubState;
}

export const sub = (state: OptionsState, guildId: string, write = true) => {
  const defaults = {
    pending: false,
  };
  return state[guildId] ?? (write ? (state[guildId] = defaults) : defaults);
};

// Define the initial state using that type
const initialState: OptionsState = {};

export const Options = createSlice({
  name: "options",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    startFetchingOptions(
      state,
      action: {
        payload: {
          guildId: string;
        };
      }
    ) {
      const { guildId } = action.payload;
      const slice = sub(state, guildId);
      slice.pending = true;
    },
    finishFetchingOptions(
      state,
      action: {
        payload: {
          guildId: string;
          options: { keywords: string[] };
          err?: any;
        };
      }
    ) {
      const { guildId, options, err } = action.payload;
      const slice = sub(state, guildId);
      slice.pending = false;
      slice.lastErr = err;
      if (options) {
        slice.options = options;
      }
    },
    setOptions(
      state: WritableDraft<OptionsState>,
      action: {
        payload: {
          guildId: string;
          options: { keywords?: string[] };
        };
      }
    ) {
      const { guildId, options } = action.payload;
      const slice = sub(state, guildId);
      Object.assign(slice.options, options);
    },
  },
});

const {
  startFetchingOptions,
  finishFetchingOptions,
  setOptions: _setOptions,
} = Options.actions;

const fetchOptions =
  (guildId: string): AppThunk<Promise<{ keywords: string[] }>> =>
  async (dispatch, getState) => {
    const slice = sub(getState().options, guildId, false);
    if (slice.pending) return;

    dispatch(startFetchingOptions({ guildId }));
    const [err, options] = await fetchJSON(`/api/options/guild`, {
      guildId,
    });
    dispatch(finishFetchingOptions({ guildId, options, err }));

    return options;
  };

export const setOptions =
  (
    guildId: string,
    options: { keywords?: string[] }
  ): AppThunk<Promise<Error | null>> =>
  async (dispatch) => {
    const [err] = await fetchJSON(`/api/options/guild`, {
      guildId,
      options,
    });

    if (!err) dispatch(_setOptions({ guildId, options }));

    return err as Error;
  };

const select = (guildId: string) => (state: RootState) =>
  sub(state.options, guildId, false);

export const useOptions = (guildId: string) => {
  const dispatch = useAppDispatch();

  const state = useAppSelector(select(guildId), deepEqual());
  if (!state.options && !state.pending && !state.lastErr) {
    dispatch(fetchOptions(guildId));
    return null;
  }

  return state.options;
};

export default Options.reducer;
