import { createSlice } from "@reduxjs/toolkit";
import type { RootState, AppThunk } from "../store";
import { AnalysisData, MessageData } from "../../common/api-data-types";
import { fetchJSON } from "../../utils";

// Define a type for the slice state
interface AnalysesState {
  [key: `${string}/${string}/${string}`]: {
    pending: boolean;
    analysis?: AnalysisData | null;
    valid: boolean;
  };
  lastError?: any;
}

const key = ({
  guildId,
  channelId,
  messageId,
}: {
  guildId: string;
  channelId: string;
  messageId: string;
}) => `${guildId}/${channelId}/${messageId}` as const;

// Define the initial state using that type
const initialState: AnalysesState = {};

export const Members = createSlice({
  name: "counter",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    startFetchingAnalyses(
      state,
      action: {
        payload: { guildId: string; channelId: string; messageId: string }[];
      }
    ) {
      action.payload.forEach(
        (id) => (state[key(id)] = { pending: true, valid: false })
      );
    },
    finishFetchingAnalyses(
      state,
      action: {
        payload: {
          err?: any;
          results?: {
            guildId: string;
            channelId: string;
            messageId: string;
            analysis: AnalysisData;
          }[];
        };
      }
    ) {
      action.payload.results?.forEach(
        ({ analysis, ...id }) =>
          (state[key(id)] = { pending: false, valid: true, analysis })
      );
      state.lastError = action.payload.err;
    },
  },
});

const { startFetchingAnalyses, finishFetchingAnalyses } = Members.actions;

export const fetchAnalyses =
  (messages: MessageData[], invalidate = false): AppThunk =>
  async (dispatch, getState) => {
    const slice = getState().analyses;

    const messageIdsToFetch = messages
      .map(({ guildId, channelId, id }) => ({
        guildId,
        channelId,
        messageId: id,
      }))
      .filter(
        (id) =>
          !slice[key(id)]?.pending && (invalidate || !slice[key(id)]?.valid)
      );

    const batchSize = 100;
    for (let i = 0; i < messageIdsToFetch.length; i += batchSize) {
      const batch = messageIdsToFetch.slice(i, i + 100);

      dispatch(startFetchingAnalyses(batch));
      const [err, analyses] = await fetchJSON(`/api/analyze`, {
        messageIds: batch,
      });
      dispatch(
        finishFetchingAnalyses({
          err,
          results: batch.map((id, i) => ({
            ...id,
            analysis: analyses?.[i],
          })),
        })
      );

      if (err) {
        return console.warn("Aborted: Error occured while fetching analyses");
      }
    }
  };

export const selectBatchAnalysis =
  (messages: MessageData[]) => (state: RootState) =>
    messages
      .map(({ guildId, channelId, id }) => ({
        guildId,
        channelId,
        messageId: id,
      }))
      .map((id) => state.analyses[key(id)] ?? { pending: false, valid: false });

export const selectAnalysis =
  (guildId: string, channelId: string, messageId: string) =>
  (state: RootState) =>
    state.analyses[key({ guildId, channelId, messageId })] ?? {
      pending: false,
      valid: false,
    };

export default Members.reducer;
