import { createSlice } from "@reduxjs/toolkit";
import type { RootState, AppThunk } from "../store";
import { fetchJSON } from "../../utils";
import { UserData } from "../../common/api-data-types";

// Define a type for the slice state
interface CurrentUserState {
  pending: boolean;
  userData?: UserData;
  lastError?: any;
  valid: boolean;
}

// Define the initial state using that type
const initialState: CurrentUserState = {
  pending: false,
  valid: false,
};

export const currentUserSlice = createSlice({
  name: "counter",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    startFetchingCurrentUser(state) {
      state.userData = undefined;
      state.pending = true;
      state.lastError = undefined;
      state.valid = false;
    },
    finishFetchingCurrentUser(
      state,
      action: { payload: { userData?: UserData; err?: any } }
    ) {
      state.lastError = action.payload.err;
      state.userData = action.payload.userData;
      state.pending = false;
      state.valid = true;
    },
    logout(state) {
      state.userData = undefined;
      state.pending = false;
    },
  },
});

const { startFetchingCurrentUser, finishFetchingCurrentUser, logout } =
  currentUserSlice.actions;

export { logout };

export const fetchCurrentUser =
  (invalidate = false): AppThunk =>
  async (dispatch, getState) => {
    const state = getState().currentUser;
    if (state.pending) return;
    if (!invalidate && state.valid) return;

    dispatch(startFetchingCurrentUser());
    const [err, userData] = await fetchJSON("/api/users/current");
    dispatch(finishFetchingCurrentUser({ err, userData }));
  };

export const selectCurrentUser = (state: RootState) => state.currentUser;

export default currentUserSlice.reducer;
