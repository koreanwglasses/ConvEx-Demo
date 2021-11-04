import { AnyAction, configureStore, ThunkAction } from "@reduxjs/toolkit";
import thunk, { ThunkDispatch } from "redux-thunk";
import currentUser from "../data/current-user-slice";

export const store = configureStore({
  reducer: {
    currentUser,
  },
  middleware: [thunk] as const,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch &
  ThunkDispatch<RootState, unknown, AnyAction>;

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  AnyAction
>;
