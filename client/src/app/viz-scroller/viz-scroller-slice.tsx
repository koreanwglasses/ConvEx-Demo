import { createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../store";

// Define a type for the slice state
interface VizScrollersState {
  [key: string]: {
    offset: number;
    height: number;
    maxOffset?: number;
    initialOffsets: {
      type: "map";
      offsetMap: Record<string, number>;
    };
  };
}

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
      const slice = state[key] ?? {};
      const { offset = 0 } = slice;
      slice.offset = Math.max(offset + amount, 0);
      if (slice.maxOffset)
        slice.offset = Math.min(slice.offset, slice.maxOffset);
      state[key] = slice;
    },
    setInitialOffset(
      state,
      action: { payload: { key: string; itemKey: string; offset: number } }
    ) {
      const { key, itemKey, offset } = action.payload;
      const slice = state[key] ?? {};
      const { initialOffsets = { type: "map", offsetMap: {} } } = slice;
      initialOffsets.offsetMap[itemKey] = offset;
      slice.initialOffsets = initialOffsets;
      state[key] = slice;
    },
    clearInitialOffsets(state, action: { payload: { key: string } }) {
      const { key } = action.payload;
      const slice = state[key] ?? {};
      const { initialOffsets = { type: "map", offsetMap: {} } } = slice;
      initialOffsets.offsetMap = {};
      slice.initialOffsets = initialOffsets;
      state[key] = slice;
    },
    setMaxOffset(state, action: { payload: { key: string; offset?: number } }) {
      const { key } = action.payload;
      const slice = state[key] ?? {};
      slice.maxOffset = action.payload.offset;
      state[key] = slice;
    },
  },
});

export const {
  adjustScrollOffset,
  setInitialOffset,
  clearInitialOffsets,
  setMaxOffset,
} = VizScrollers.actions;

export const selectVizScrollerGroup = (key: string) => (state: RootState) => {
  const { offset = 0, height = 400, maxOffset } = state.vizScrollers[key] ?? {};
  return { offset, height, maxOffset };
};

export const selectInitialOffsets = (key: string) => (state: RootState) => {
  const itemOffsets = state.vizScrollers[key]?.initialOffsets;
  return !itemOffsets
    ? undefined
    : itemOffsets.type === "map"
    ? (itemKey: string) => itemOffsets.offsetMap[itemKey]
    : undefined;
};

export default VizScrollers.reducer;
