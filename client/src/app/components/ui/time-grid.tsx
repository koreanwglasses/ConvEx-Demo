import * as d3 from "d3";
import { StickyWrapper } from "./sticky-wrapper";
import { Box } from "@mui/system";
import { theme } from "../../app";
import {
  useMessagesOnCanvas,
  useTimeExtent,
  useTimeScale,
} from "../../dashboard/channel/d3-viz-hooks";
import { useAppSelector } from "../../hooks";
import { shallowEqual } from "react-redux";
import {
  selectLayoutMode,
  selectAggregateInterval,
} from "../../dashboard/channel/channel-viz-group/channel-viz-group-slice";
import { useVizScrollerGroup } from "../../viz-scroller/viz-scroller-slice";
import { useMemo } from "react";
import { deepEqual, getTimeInterval } from "../../../utils";

export const TimeGrid = ({ groupKey }: { groupKey: string }) => {
  const { mode } = useAppSelector(selectLayoutMode(groupKey), shallowEqual);
  const { canvasHeight } = useVizScrollerGroup(groupKey);
  const timeExtent = useTimeExtent(groupKey);
  const yTime = useTimeScale(groupKey);
  const data = useMessagesOnCanvas(groupKey);

  const { unit: minorUnit, step } = useAppSelector(
    selectAggregateInterval(groupKey),
    deepEqual
  );
  const minorInterval = useMemo(
    () => getTimeInterval(minorUnit, 3 * step),
    [minorUnit, step]
  );

  const majorUnit = ({ minute: "hour", hour: "day" } as const)[minorUnit];
  const majorInterval = useMemo(() => getTimeInterval(majorUnit), [majorUnit]);

  const minor =
    mode === "time"
      ? timeExtent
        ? minorInterval.range(new Date(timeExtent[0]), new Date(timeExtent[1]))
        : []
      : d3.sort(
          new d3.InternSet(
            data
              ?.map(([msg]) => new Date(msg.createdTimestamp))
              .map((date) => d3.timeHour.floor(date)) ?? []
          )
        );

  const major = new d3.InternSet(
    minor.filter(
      (minorTick, i, array) =>
        i - 1 < 0 ||
        +majorInterval.floor(minorTick) !== +majorInterval.floor(array[i - 1])
    )
  );

  return (
    <>
      {minor.map((time, i, array) => (
        <>
          <Box
            sx={{
              position: "absolute",
              width: 1.0,
              height: "1px",
              bgcolor: "rgba(255,255,255,0.1)",
            }}
            style={{ top: yTime(time) }}
          />
          <TimeLabel
            array={array}
            i={i}
            yTime={yTime}
            canvasHeight={canvasHeight}
            format={minorUnit === "minute" ? "%M:%S" : "%I %p"}
            stickyTop={15}
            offset={major.has(time) ? 15 : 0}
          />
        </>
      ))}

      {[...major].map((time, i, array) => (
        <TimeLabel
          array={array}
          i={i}
          yTime={yTime}
          canvasHeight={canvasHeight}
          format={majorUnit === "hour" ? "%I %p" : "%b %e"}
          stickyTop={0}
          offset={0}
        />
      ))}
    </>
  );
};

const TimeLabel = ({
  array,
  i,
  yTime,
  canvasHeight,
  format,
  stickyTop,
  offset,
}: {
  array: Date[];
  i: number;
  canvasHeight: number;
  yTime: d3.ScaleTime<number, number>;
  format: string;
  stickyTop: number;
  offset: number;
}) => {
  const time = array[i];
  return (
    <>
      <StickyWrapper
        y={yTime(time) + offset}
        height={
          i + 1 < array.length
            ? Math.max(yTime(array[i + 1]) - yTime(time) - 18 - offset, 0)
            : canvasHeight - yTime(time) - offset
        }
        stickyTop={stickyTop}
      >
        <Box
          sx={{
            fontSize: 12,
            position: "absolute",
            color: "rgba(255,255,255,0.25)",
            bgcolor: () => {
              const c = d3.color(theme.palette.background.paper)!;
              c.opacity = 0.75;
              return c.formatRgb();
            },
            right: 2,
            pl: 0.25,
            top: 1,
          }}
        >
          {d3.timeFormat(format)(time)}
        </Box>
      </StickyWrapper>
    </>
  );
};
