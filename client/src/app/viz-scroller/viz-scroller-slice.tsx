import { createSlice } from "@reduxjs/toolkit";
import { shallowEqual } from "react-redux";
import { useAppSelector } from "../hooks";
import type { RootState } from "../store";

interface SubState {
  offset: number;
  height: number;
  maxScrollOffset?: number;
  initialOffsets: {
    type: "map";
    offsetMap: Record<string, number>;
    version: number;
  };
}

// Define a type for the slice state
interface VizScrollersState {
  [key: string]: SubState;
}

const sub = (state: VizScrollersState, key: string, write = true) => {
  const defaults = {
    offset: 0,
    height: 400,
    initialOffsets: {
      type: "map",
      offsetMap: {},
      version: 0,
    },
  } as const;
  return state[key] ?? (write ? (state[key] = defaults) : defaults);
};

// Define the initial state using that type
const initialState: VizScrollersState = {};

export const VizScrollers = createSlice({
  name: "counter",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    adjustScrollOffset(
      state,
      action: {
        payload: { key: string; amount: number };
      }
    ) {
      const { key, amount } = action.payload;
      const substate = sub(state, key);
      substate.offset = Math.max(substate.offset + amount, 0);
      if (substate.maxScrollOffset)
        substate.offset = Math.min(
          substate.offset,
          substate.maxScrollOffset - 3 * substate.height
        );
    },
    setInitialOffset(
      state,
      action: { payload: { key: string; itemKey: string; offset: number } }
    ) {
      const { key, itemKey, offset } = action.payload;
      const substate = sub(state, key);
      substate.initialOffsets.offsetMap[itemKey] = offset;
      substate.initialOffsets.version++;
    },
    clearInitialOffsets(state, action: { payload: { key: string } }) {
      const { key } = action.payload;
      const substate = sub(state, key);
      substate.initialOffsets.offsetMap = {};
      substate.initialOffsets.version++;
    },
    setMaxScrollOffset(
      state,
      action: { payload: { key: string; offset?: number } }
    ) {
      const { key } = action.payload;
      const substate = sub(state, key);
      substate.maxScrollOffset = action.payload.offset;
    },
  },
});

export const {
  adjustScrollOffset,
  setInitialOffset,
  clearInitialOffsets,
  setMaxScrollOffset,
} = VizScrollers.actions;

export const selectVizScrollerGroup = (key: string) => (state: RootState) =>
  sub(state.vizScrollers, key, false);

export const selectInitialOffsets = (key: string) => (state: RootState) =>
  sub(state.vizScrollers, key, false).initialOffsets;

export const useInitialOffsets = (key: string) => {
  const initialOffsets = useAppSelector(
    selectInitialOffsets(key),
    shallowEqual
  );
  return initialOffsets.type === "map"
    ? (itemKey: string) => initialOffsets.offsetMap[itemKey]
    : undefined;
};

export default VizScrollers.reducer;
