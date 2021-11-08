import { createSlice } from "@reduxjs/toolkit";
import { shallowEqual } from "react-redux";
import { useAppSelector } from "../hooks";
import type { AppThunk, RootState } from "../store";

interface SubState {
  offset: number;
  clientHeight: number;
  maxScrollHeight?: number;
  scrollTop: number;

  dScrollTop: number;
}

const scrollHeight = (substate: SubState) =>
  Math.min(
    canvasHeight(substate) + substate.clientHeight + substate.offset,
    substate.maxScrollHeight ?? Number.POSITIVE_INFINITY
  );

const canvasHeight = (substate: SubState) => 3 * substate.clientHeight;

const canvasTop = (substate: SubState) =>
  substate.maxScrollHeight
    ? Math.min(
        substate.maxScrollHeight - canvasHeight(substate) - substate.offset,
        substate.clientHeight
      )
    : substate.clientHeight;

// Define a type for the slice state
interface VizScrollersState {
  [key: string]: SubState;
}

export const sub = (state: VizScrollersState, key: string, write = true) => {
  const substate: SubState = {
    offset: 0,
    clientHeight: 400,
    scrollTop: 0,
    dScrollTop: 0,
  } as const;
  return state[key] ?? (write ? (state[key] = substate) : substate);
};

// Define the initial state using that type
const initialState: VizScrollersState = {};

export const VizScrollers = createSlice({
  name: "counter",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    setMaxScrollHeight(
      state,
      action: { payload: { key: string; offset?: number } }
    ) {
      const { key } = action.payload;
      const substate = sub(state, key);
      substate.maxScrollHeight = action.payload.offset;
    },
    setClientHeight(
      state,
      action: { payload: { key: string; height: number } }
    ) {
      const { key, height } = action.payload;
      const substate = sub(state, key);
      substate.clientHeight = height;
    },
    computeScrollOffset(
      state,
      action: { payload: { key: string; scrollTop: number } }
    ) {
      const { key, scrollTop } = action.payload;
      const substate = sub(state, key);
      substate.scrollTop = scrollTop;

      if (
        -scrollTop - substate.offset < substate.clientHeight / 2 ||
        substate.offset +
          canvasHeight(substate) +
          scrollTop -
          substate.clientHeight <
          substate.clientHeight / 2
      ) {
        substate.offset = Math.max(
          -scrollTop - canvasHeight(substate) / 2 + substate.clientHeight / 2,
          0
        );
        if (substate.maxScrollHeight) {
          substate.offset = Math.min(
            substate.offset,
            substate.maxScrollHeight - canvasHeight(substate)
          );
        }
      }
    },
    adjustScrollTop_(
      state,
      action: { payload: { key: string; dScrollTop?: number; reset?: true } }
    ) {
      const { key, dScrollTop, reset } = action.payload;
      const substate = sub(state, key);

      if (reset) {
        substate.dScrollTop = 0;
      }

      if (typeof dScrollTop === "number") {
        substate.dScrollTop = dScrollTop;

        substate.maxScrollHeight =
          substate.maxScrollHeight &&
          Math.max(
            substate.maxScrollHeight,
            canvasHeight(substate) - substate.scrollTop - dScrollTop
          );
      }
    },
  },
});

export const {
  setMaxScrollHeight,
  setClientHeight,
  computeScrollOffset,
  adjustScrollTop_,
} = VizScrollers.actions;

export const selectVizScrollerGroup = (key: string) => (state: RootState) => {
  const substate = sub(state.vizScrollers, key, false);
  return {
    scrollHeight: scrollHeight(substate),
    canvasHeight: canvasHeight(substate),
    canvasTop: canvasTop(substate),
    ...substate,
  };
};

export const useVizScrollerGroup = (key: string) =>
  useAppSelector(selectVizScrollerGroup(key), shallowEqual);

export const adjustScrollTop =
  (key: string, dScrollTop: number): AppThunk =>
  (dispatch, getState) => {
    const substate = sub(getState().vizScrollers, key, false);
    dispatch(adjustScrollTop_({ key, dScrollTop }));
    dispatch(
      computeScrollOffset({ key, scrollTop: substate.scrollTop + dScrollTop })
    );
  };

export default VizScrollers.reducer;
