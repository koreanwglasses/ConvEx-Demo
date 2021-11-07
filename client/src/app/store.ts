import { AnyAction, configureStore, ThunkAction } from "@reduxjs/toolkit";
import thunk, { ThunkDispatch } from "redux-thunk";
import currentUser from "./data/current-user-slice";
import users from "./data/members-slice";
import guilds from "./data/guilds-slice";
import channels from "./data/channels-slice";
import messages from "./data/messages-slice";
import analyses from "./data/analyses-slice";
import vizScrollers from "./viz-scroller/viz-scroller-slice";
import channelVizGroups from "./dashboard/channel/channel-viz-group/channel-viz-group-slice";

export const store = configureStore({
  reducer: {
    currentUser,
    users,
    guilds,
    channels,
    messages,
    analyses,
    vizScrollers,
    channelVizGroups,
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
