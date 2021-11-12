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
  canvasHeight: number,
  width: number
) => {
  const hours = d3.sort(
    new d3.InternSet(
      data
        .map(([msg]) => new Date(msg.createdTimestamp))
        .map((date) => d3.timeHour.floor(date))
    )
  );

  const days = d3.sort(
    new d3.InternSet(
      data
        .map(([msg]) => new Date(msg.createdTimestamp))
        .map((date) => d3.timeDay.floor(date))
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
          <StickyWrapper
            y={yTime(time)}
            height={
              i + 1 < array.length
                ? Math.max(yTime(array[i + 1]) - yTime(time) - 18, 0)
                : canvasHeight - yTime(time)
            }
            stickyTop={15}
          >
            <Box
              sx={{
                fontSize: 12,
                position: "absolute",
                right: 2,
                color: "rgba(255,255,255,0.25)",
              }}
            >
              {d3.timeFormat("%I %p")(time)}
            </Box>
          </StickyWrapper>
        </>
      ))}

      {days.map((time, i, array) => (
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
          <StickyWrapper
            y={yTime(time)}
            height={
              i + 1 < array.length
                ? Math.max(yTime(array[i + 1]) - yTime(time) - 18, 0)
                : canvasHeight - yTime(time)
            }
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
              }}
            >
              {d3.timeFormat("%b %e")(time)}
            </Box>
          </StickyWrapper>
        </>
      ))}
    </>,
    container
  );
};
