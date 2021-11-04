import { createSlice } from "@reduxjs/toolkit";
import to from "await-to-js";
import { User } from "discord.js";
import type { RootState, AppThunk } from "../app/store";
import { APIData } from "../utils";

// Define a type for the slice state
interface CurrentUserState {
  pending: boolean;
  userData?: APIData<User>;
  lastError?: any;
}

// Define the initial state using that type
const initialState: CurrentUserState = {
  pending: false,
};

export const currentUserSlice = createSlice({
  name: "counter",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    startFetchingCurrentUser(state) {
      state.userData = undefined;
      state.pending = true;
    },
    finishFetchingCurrentUser(
      state,
      action: { payload: { userData?: APIData<User>; err?: any } }
    ) {
      state.lastError = action.payload.err;
      state.userData = action.payload.userData;
      state.pending = false;
    },
    logout(state) {
      state.userData = undefined;
      state.pending = false;
    },
  },
});

export const {
  startFetchingCurrentUser: startFetchingUserData,
  finishFetchingCurrentUser: finishFetchingUserData,
  logout,
} = currentUserSlice.actions;

export const fetchCurrentUser = (): AppThunk => async (dispatch) => {
  dispatch(startFetchingUserData);

  const [err0, res] = await to(fetch("/api/user/current"));
  if (err0) return dispatch(finishFetchingUserData({ err: err0 }));
  if (!res?.ok) return dispatch(finishFetchingUserData({ err: res }));

  const [err1, userData] = await to(res.json());
  if (err1) return dispatch(finishFetchingUserData({ err: err1 }));
  return dispatch(finishFetchingUserData({ userData }));
};

export const selectCurrentUser = (state: RootState) => state.currentUser;

export default currentUserSlice.reducer;
