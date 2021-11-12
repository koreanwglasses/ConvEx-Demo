import { MessageData } from "../../../common/api-data-types";
import * as d3 from "d3";
import ReactDOM from "react-dom";
import { StickyWrapper } from "./sticky-wrapper";
import { Box } from "@mui/system";
import { theme } from "../../app";

export const renderTimeGrid = (
  data: (readonly [MessageData, unknown?])[],
  yTime: d3.ScaleTime<number, number>,
  container: HTMLElement | null,
  canvasHeight: number
) => {
  const hours = d3.sort(
    new d3.InternSet(
      data
        .map(([msg]) => new Date(msg.createdTimestamp))
        .map((date) => d3.timeHour.floor(date))
    )
  );

  const days = new d3.InternSet(
    hours.filter(
      (hour, i, array) =>
        i - 1 < 0 || +d3.timeDay.floor(hour) !== +d3.timeDay.floor(array[i - 1])
    )
  );

  ReactDOM.render(
    <>
      {hours.map((time, i, array) => (
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
            format={"%I %p"}
            stickyTop={15}
            offset={days.has(time) ? 15 : 0}
          />
        </>
      ))}

      {[...days].map((time, i, array) => (
        <TimeLabel
          array={array}
          i={i}
          yTime={yTime}
          canvasHeight={canvasHeight}
          format={"%b %e"}
          stickyTop={0}
          offset={0}
        />
      ))}
    </>,
    container
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
