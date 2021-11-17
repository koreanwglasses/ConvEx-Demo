import { createSlice } from "@reduxjs/toolkit";
import type { RootState, AppThunk } from "../store";
import { AnalysisSummary } from "../../common/api-data-types";
import { deepEqual, fetchJSON } from "../../utils";
import * as d3 from "d3";
import { rangeDifference, simplifyRangeUnion } from "../../ranges";
import { useAppDispatch, useAppSelector } from "../hooks";

type Summaries = {
  minute: AnalysisSummary[];
  hour: AnalysisSummary[];
};

interface SubState {
  pending: boolean;
  lastError?: any;
  summaries: Summaries;
  validRanges: [number, number][];
}

// Define a type for the slice state
interface AnalysisSummariesState {
  [key: `${string}/${string}`]: SubState;
}

const key = (guildId: string, channelId: string) =>
  `${guildId}/${channelId}` as const;

const sub = (
  state: AnalysisSummariesState,
  guildId: string,
  channelId: string,
  write = true
) => {
  const defaults = {
    pending: false as const,
    validRanges: [],
    summaries: {
      minute: [],
      hour: [],
    },
  };
  return (
    state[key(guildId, channelId)] ??
    (write ? (state[key(guildId, channelId)] = defaults) : defaults)
  );
};

const mergeSummaries = (
  currentSummaries: AnalysisSummary[],
  incomingSummaries: AnalysisSummary[]
): AnalysisSummary[] => {
  const allSummaries = new Map(
    currentSummaries.map(
      (summary) => [summary.timeInterval.start, summary] as const
    )
  );
  incomingSummaries.forEach((summary) =>
    allSummaries.set(summary.timeInterval.start, summary)
  );
  return [...allSummaries.values()].sort(
    (a, b) => b.timeInterval.start - a.timeInterval.start
  );
};

// Define the initial state using that type
const initialState: AnalysisSummariesState = {};

export const AnalysisSummaries = createSlice({
  name: "analysis-summaries",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    startFetchingAnalysisSummaries(
      state,
      action: {
        payload: { guildId: string; channelId: string };
      }
    ) {
      const { channelId, guildId } = action.payload;
      sub(state, guildId, channelId).pending = true;
    },
    finishFetchingAnalysisSummaries(
      state,
      action: {
        payload: {
          guildId: string;
          channelId: string;
          ranges?: [number, number][];
          summaries?: AnalysisSummary[];
          err?: any;
        };
      }
    ) {
      const { guildId, channelId, err, summaries, ranges } = action.payload;
      const substate = sub(state, guildId, channelId);
      substate.lastError = err;
      substate.pending = false;

      if (summaries)
        substate.summaries = {
          minute: mergeSummaries(
            substate.summaries.minute,
            summaries.filter(
              (summary) =>
                summary.timeInterval.interval === "minute" &&
                summary.timeInterval.step === 1
            ) ?? []
          ),
          hour: mergeSummaries(
            substate.summaries.hour,
            summaries.filter(
              (summary) =>
                summary.timeInterval.interval === "hour" &&
                summary.timeInterval.step === 1
            ) ?? []
          ),
        };

      if (ranges)
        substate.validRanges = simplifyRangeUnion([
          ...substate.validRanges,
          ...ranges,
        ]);
    },
  },
});

const { startFetchingAnalysisSummaries, finishFetchingAnalysisSummaries } =
  AnalysisSummaries.actions;

export const fetchAnalysisSummaries =
  (
    guildId: string,
    channelId: string,
    start: number,
    end: number
  ): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    const { pending, validRanges } = sub(
      getState().analysisSummaries,
      guildId,
      channelId,
      false
    );

    if (pending) return;

    const ranges = rangeDifference([[start, end]], validRanges);

    dispatch(
      startFetchingAnalysisSummaries({
        guildId,
        channelId,
      })
    );

    const summaries: AnalysisSummary[] = [];
    for (const [start_, end_] of ranges) {
      const [err, summaries_] = await fetchJSON(`/api/analyzer/summaries`, {
        guildId,
        channelId,
        start: start_,
        end: end_,
      });

      if (err) {
        console.warn("Aborted: Error occured while fetching analyses");
        dispatch(
          finishFetchingAnalysisSummaries({
            guildId,
            channelId,
            err,
          })
        );
        return;
      } else {
        summaries.push(...summaries_);
      }
    }

    dispatch(
      finishFetchingAnalysisSummaries({
        guildId,
        channelId,
        summaries,
        ranges,
      })
    );
  };

export const selectAnalysisSummaries =
  (guildId: string, channelId: string, start: number, end: number) =>
  (state: RootState) =>
    Object.fromEntries(
      Object.entries(
        sub(state.analysisSummaries, guildId, channelId, false).summaries
      ).map(
        ([interval, summaries]) =>
          [
            interval,
            summaries.filter((summary) => {
              const timeInterval = {
                minute: d3.timeMinute,
                hour: d3.timeHour,
                day: d3.timeDay,
              }[summary.timeInterval.interval].every(
                summary.timeInterval.step
              )!;

              const summaryEnd = +timeInterval.offset(
                new Date(summary.timeInterval.start),
                1
              );

              if (typeof end === "number") {
                const summaryStart = summary.timeInterval.start;

                const span_0 = end - start + summaryEnd - summaryStart;
                const span = Math.max(end - summaryStart, summaryEnd - start);

                return span <= span_0;
              } else {
                return start <= summaryEnd;
              }
            }),
          ] as const
      )
    ) as Summaries;

export const useAnalysisSummaries = (
  guildId: string,
  channelId: string,
  start: number,
  end: number
) => {
  const dispatch = useAppDispatch();
  const { validRanges, pending } = useAppSelector(
    (state: RootState) =>
      sub(state.analysisSummaries, guildId, channelId, false),
    deepEqual
  );

  if (!pending && rangeDifference([[start, end]], validRanges).length !== 0) {
    dispatch(fetchAnalysisSummaries(guildId, channelId, start, end));
  }

  return useAppSelector(
    selectAnalysisSummaries(guildId, channelId, start, end),
    deepEqual
  );
};

export default AnalysisSummaries.reducer;
