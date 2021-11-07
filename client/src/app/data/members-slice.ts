import { createSlice } from "@reduxjs/toolkit";
import type { RootState, AppThunk } from "../store";
import { MemberData } from "../../common/api-data-types";
import { fetchJSON } from "../../utils";

// Define a type for the slice state
interface MembersState {
  [key: `${string}/${string}`]: {
    pending: boolean;
    lastError?: any;
    member?: MemberData;
    valid: boolean;
  };
}

const key = (guildId: string, memberId: string) =>
  `${guildId}/${memberId}` as const;

// Define the initial state using that type
const initialState: MembersState = {};

export const Members = createSlice({
  name: "counter",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    startFetchingMember(
      state,
      action: { payload: { guildId: string; memberId: string } }
    ) {
      const { memberId, guildId } = action.payload;
      state[key(guildId, memberId)] = { pending: true, valid: false };
    },
    finishFetchingMember(
      state,
      action: {
        payload: {
          guildId: string;
          memberId: string;
          member?: MemberData;
          err?: any;
        };
      }
    ) {
      const { memberId, guildId } = action.payload;
      state[key(guildId, memberId)] = {
        lastError: action.payload.err,
        member: action.payload.member,
        pending: false,
        valid: true,
      };
    },
  },
});

const { startFetchingMember, finishFetchingMember } = Members.actions;

export const fetchMember =
  (guildId: string, memberId: string, invalidate = false): AppThunk =>
  async (dispatch, getState) => {
    const state = getState().users[key(guildId, memberId)] ?? {
      pending: false,
      valid: false,
    };
    if (state.pending) return;
    if (!invalidate && state.valid) return;

    dispatch(startFetchingMember({ guildId, memberId }));
    const [err, member] = await fetchJSON(`/api/members`, {
      guildId,
      memberId,
    });
    dispatch(finishFetchingMember({ guildId, memberId, member, err }));
  };

export const selectMember =
  (guildId: string, memberId: string) => (state: RootState) =>
    state.users[key(guildId, memberId)] ?? {
      pending: false,
      valid: false,
    };

export default Members.reducer;
