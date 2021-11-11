import { MessageData } from "../../../common/api-data-types";
import * as d3 from "d3";
import ReactDOM from "react-dom";
import { StickyWrapper } from "./sticky-wrapper";
import { Box } from "@mui/system";
import {
  selectLayoutData,
  selectLayoutMode,
} from "../../dashboard/channel/channel-viz-group/channel-viz-group-slice";
import { store } from "../../store";

export const renderTimeGrid = (
  data: (readonly [MessageData, unknown?])[],
  yTime: d3.ScaleTime<number, number>,
  container: HTMLElement | null,
  canvasHeight: number
) => {
  const significantTimes = d3.sort(
    new d3.InternSet(
      data
        .map(([msg]) => new Date(msg.createdTimestamp))
        .map((date) => [d3.timeHour.floor(date), d3.timeDay.floor(date)])
        .flat()
    )
  );

  ReactDOM.render(
    <>
      {significantTimes.map((time, i, array) => (
        <StickyWrapper
          y={yTime(time)}
          height={
            i + 1 < array.length
              ? Math.max(yTime(array[i + 1]) - yTime(time) - 18, 0)
              : canvasHeight - yTime(time)
          }
        >
          <Box
            sx={{ width: 1, height: "1px", bgcolor: "rgba(255,255,255,0.1)" }}
          ></Box>
          <Box
            sx={{
              fontSize: 12,
              position: "absolute",
              right: 2,
              color: "rgba(255,255,255,0.25)",
            }}
          >
            {d3.timeFormat(
              +time === +d3.timeDay.floor(time) ? "%b %e" : "%I %p"
            )(time)}
          </Box>
        </StickyWrapper>
      ))}
    </>,
    container
  );
};

export const messageTimeScale = (
  groupKey: string,
  y: (msg: MessageData) => number,
  data: (readonly [MessageData, unknown?])[]
) => {
  const { offsetTopMap, offsetMap } = selectLayoutData(groupKey)(
    store.getState()
  );
  const { mode } = selectLayoutMode(groupKey)(store.getState());
  return d3
    .scaleTime()
    .domain(data.map(([msg]) => msg.createdTimestamp))
    .range(
      data.map(([msg]) =>
        mode === "map"
          ? offsetTopMap[msg.id] - offsetMap[msg.id] + y(msg)
          : y(msg)
      )
    );
};
