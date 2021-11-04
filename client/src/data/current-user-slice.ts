import { createSlice } from "@reduxjs/toolkit";
import type { RootState, AppThunk } from "../app/store";
import { fetchJSON } from "../utils";
import { UserData } from "../common/api-data-types";

// Define a type for the slice state
interface CurrentUserState {
  pending: boolean;
  userData?: UserData;
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
      state.lastError = undefined;
    },
    finishFetchingCurrentUser(
      state,
      action: { payload: { userData?: UserData; err?: any } }
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
  dispatch(startFetchingUserData());
  const [err, userData] = await fetchJSON("/api/user/current");
  dispatch(finishFetchingUserData({ err, userData }));
};

export const selectCurrentUser = (state: RootState) => state.currentUser;

export default currentUserSlice.reducer;
