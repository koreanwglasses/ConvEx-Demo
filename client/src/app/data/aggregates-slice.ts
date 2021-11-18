import { createSlice } from "@reduxjs/toolkit";
import type { RootState, AppThunk } from "../store";
import { AggregateData } from "../../common/api-data-types";
import { deepEqual, fetchJSON, getTimeInterval } from "../../utils";
import { rangeDifference, simplifyRangeUnion } from "../../ranges";
import { useAppDispatch, useAppSelector } from "../hooks";

interface SubState {
  pending: boolean;
  lastError?: any;
  aggregates: AggregateData[];
  validRanges: [number, number][];
  interval: {
    unit: "minute" | "hour";
    step: number;
  };
  toxicityThreshold: number;
}

// Define a type for the slice state
interface AggregatesState {
  [key: `${string}/${string}`]: SubState;
}

const key = (guildId: string, channelId: string) =>
  `${guildId}/${channelId}` as const;

const sub = (
  state: AggregatesState,
  guildId: string,
  channelId: string,
  write = true
) => {
  const defaults = {
    pending: false as const,
    validRanges: [],
    aggregates: [],
    interval: {
      unit: "minute" as const,
      step: 5,
    },
    toxicityThreshold: 0.75,
  };
  return (
    state[key(guildId, channelId)] ??
    (write ? (state[key(guildId, channelId)] = defaults) : defaults)
  );
};

const mergeAggregates = (
  currentAggregates: AggregateData[],
  incomingAggregates: AggregateData[]
): AggregateData[] => {
  const allSummaries = new Map(
    currentAggregates.map(
      (aggregate) => [aggregate.timespan.start, aggregate] as const
    )
  );
  incomingAggregates.forEach((aggregate) =>
    allSummaries.set(aggregate.timespan.start, aggregate)
  );
  return [...allSummaries.values()].sort(
    (a, b) => b.timespan.start - a.timespan.start
  );
};

// Define the initial state using that type
const initialState: AggregatesState = {};

export const Aggregates = createSlice({
  name: "aggregates",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    startFetchingAggregates(
      state,
      action: {
        payload: { guildId: string; channelId: string };
      }
    ) {
      const { channelId, guildId } = action.payload;
      sub(state, guildId, channelId).pending = true;
    },
    finishFetchingAggregates(
      state,
      action: {
        payload: {
          guildId: string;
          channelId: string;
          ranges?: [number, number][];
          aggregates?: AggregateData[];
          err?: any;
        };
      }
    ) {
      const { guildId, channelId, err, aggregates, ranges } = action.payload;
      const substate = sub(state, guildId, channelId);
      substate.lastError = err;
      substate.pending = false;

      if (aggregates)
        substate.aggregates = mergeAggregates(substate.aggregates, aggregates);

      if (ranges)
        substate.validRanges = simplifyRangeUnion([
          ...substate.validRanges,
          ...ranges,
        ]);
    },
  },
});

const { startFetchingAggregates, finishFetchingAggregates } =
  Aggregates.actions;

export const fetchAggregates =
  (guildId: string, channelId: string, start: number, end: number): AppThunk =>
  async (dispatch, getState) => {
    const {
      pending,
      validRanges,
      interval: { unit, step },
      toxicityThreshold,
    } = sub(getState().aggregates, guildId, channelId, false);

    if (pending) return;

    const ranges = rangeDifference([[start, end]], validRanges);

    dispatch(
      startFetchingAggregates({
        guildId,
        channelId,
      })
    );

    const aggregates: AggregateData[] = [];

    for (const [start, end] of ranges) {
      const [err, aggregates_] = await fetchJSON(`/api/aggregate`, {
        guildId,
        channelId,
        start,
        end,
        intervalStep: step,
        intervalUnit: unit,
        toxicityThreshold,
      });

      if (err) {
        console.warn("An error occured while fetching aggregates. Aborting");
        return dispatch(
          finishFetchingAggregates({
            guildId,
            channelId,
            err,
          })
        );
      }

      aggregates.push(...aggregates_);
    }

    dispatch(
      finishFetchingAggregates({
        guildId,
        channelId,
        aggregates,
        ranges,
      })
    );
  };

export const selectInterval =
  (guildId: string, channelId: string) => (state: RootState) => {
    const { unit, step } = sub(
      state.aggregates,
      guildId,
      channelId,
      false
    ).interval;
    return getTimeInterval(unit, step);
  };

export const selectAggregates =
  (guildId: string, channelId: string, start: number, end: number) =>
  (state: RootState) =>
    sub(state.aggregates, guildId, channelId, false).aggregates;

export const useAggregates = (
  guildId: string,
  channelId: string,
  start: number,
  end: number
) => {
  const dispatch = useAppDispatch();
  const { validRanges, pending } = useAppSelector(
    (state: RootState) => sub(state.aggregates, guildId, channelId, false),
    deepEqual
  );

  const interval = useAppSelector(selectInterval(guildId, channelId));

  if (
    !pending &&
    rangeDifference([[start, +interval.floor(new Date(end))]], validRanges)
      .length !== 0
  ) {
    dispatch(fetchAggregates(guildId, channelId, start, end));
  }

  return useAppSelector(
    selectAggregates(guildId, channelId, start, end),
    deepEqual
  );
};

export default Aggregates.reducer;
