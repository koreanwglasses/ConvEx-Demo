import { Box } from "@mui/system";
import * as d3 from "d3";
import { useCallback, useRef, useMemo } from "react";
import { useTimeExtent, useTimeScale } from "./d3-viz-hooks";
import { useGroupKey } from "./channel-viz-group/channel-viz-group";
import {
  selectSummaryInterval,
  useChannelVizGroup,
} from "./channel-viz-group/channel-viz-group-slice";
import { AnalysisSummary as AnalysisSummaryType } from "../../../common/api-data-types";
import { D3Viz, drawCallback } from "../../components/ui/d3-viz";
import { useVizScrollerGroup } from "../../viz-scroller/viz-scroller-slice";
import { useAnalysisSummaries } from "../../data/analysis-summaries-slice";
import { TimeGrid } from "../../components/ui/time-grid";
import { useAppSelector } from "../../hooks";
import { deepEqual } from "../../../utils";
import { theme } from "../../app";

export const AnalysisSummary = ({
  hidden,
  width = 300,
}: {
  hidden?: boolean;
  width?: number;
}) => {
  const groupKey = useGroupKey();
  const { guildId, channelId } = useChannelVizGroup(groupKey);
  const { canvasHeight } = useVizScrollerGroup(groupKey);

  const barHeight = 30;

  const stickiesContainer = useRef<HTMLDivElement>(null);

  const { interval } = useAppSelector(
    selectSummaryInterval(groupKey),
    deepEqual
  );

  const [start, end] = (useTimeExtent(groupKey) ?? []) as [number, number];
  const data = useAnalysisSummaries(guildId, channelId, start, end)[
    interval as "hour" | "minute"
  ];

  const yTime = useTimeScale(groupKey);

  const initialize = useCallback((svgRef: SVGSVGElement) => {
    const svg = d3.select(svgRef);
    const gridG = svg.append("g");

    const barsG = svg.append("g");
    const errorBarsG = svg.append("g");

    const nowG = svg.append("g");
    nowG.append("path");
    nowG.append("text");

    const labelsG = d3.select(svgRef.parentElement).append("div");
    labelsG.style("position", "absolute");
    labelsG.style("height", "100%");
    labelsG.style("width", "100%");

    return {
      svg,
      barsG,
      errorBarsG,
      labelsG,
      gridG,
      nowG,
      state: {
        interval: undefined as NodeJS.Timeout | undefined,
      },
    };
  }, []);

  const draw = useMemo(
    () =>
      drawCallback(
        initialize,
        ({ barsG, errorBarsG, gridG, labelsG, nowG, state }) => {
          ////////////////
          // BASE GRAPH //
          ////////////////

          const x = d3.scaleLinear().domain([0, 1]).nice().range([0, width]);
          gridG
            .attr("class", "grid")
            .attr("transform", `translate(0, ${canvasHeight})`)
            .attr("color", "rgba(255, 255, 255, 0.075)")
            .call(d3.axisBottom(x).tickSize(-canvasHeight).tickFormat(null));

          barsG
            .selectAll("rect")
            .data(data)
            .join("rect")
            .attr("x", x(0))
            .attr("y", (d) => yTime(d.timeInterval.start) + 1)
            .attr("fill", (d) => d3.interpolateYlOrRd(d.summary.toxicity.mean))
            .attr("height", barHeight)
            .attr("width", (d) => x(d.summary.toxicity.mean) - x(0));

          errorBarsG
            .selectAll("path")
            .data(data)
            .join("path")
            .attr("d", (d) => {
              const stddev = Math.sqrt(d.summary.toxicity.variance);
              const x1 = x(d.summary.toxicity.mean - stddev);
              const x2 = x(d.summary.toxicity.mean + stddev);

              const y0 = yTime(d.timeInterval.start);
              return d3.line().defined((d) => Array.isArray(d))([
                [x2, y0],
                [x2, y0 + barHeight],
                null,
                [x2, y0 + barHeight / 2],
                [x1, y0 + barHeight / 2],
                null,
                [x1, y0],
                [x1, y0 + barHeight],
              ] as any);
            })
            .attr("stroke", "rgba(255,255,255,0.5)")
            .style("mix-blend-mode", "difference")
            .attr("fill", "none");

          const stddev = (d: AnalysisSummaryType) =>
            Number.isNaN(Math.sqrt(d.summary.toxicity.variance))
              ? 0
              : Math.sqrt(d.summary.toxicity.variance);

          labelsG
            .selectAll("div")
            .data(
              data.filter((d) => typeof d.summary.toxicity.mean !== "undefined")
            )
            .join("div")
            .style("position", "absolute")
            .style("user-select", "none")
            .style(
              "top",
              (d) => `${yTime(d.timeInterval.start) + barHeight / 2 - 14}px`
            )
            .style(
              "left",
              (d) =>
                `${Math.min(
                  width - 155,
                  5 + x(d.summary.toxicity.mean + stddev(d))
                )}px`
            )
            .style("font-size", "12px")
            .style("color", "rgba(255,255,255,0.5)")
            .style("line-height", "14px")
            .style(
              "background-color",
              (() => {
                const c = d3.color(theme.palette.background.paper)!;
                c.opacity = 0.75;
                return c.formatRgb();
              })()
            )
            .html(
              (d) =>
                `mean toxicity: ${d.summary.toxicity.mean.toFixed(
                  3
                )}<br/>std.dev: ${Math.sqrt(
                  d.summary.toxicity.variance
                ).toFixed(3)}`
            );

          const updateNowG = () => {
            const now = Date.now();

            nowG
              .selectAll("path")
              .attr("stroke", "red")
              .attr("stroke-width", 2)
              .attr(
                "d",
                d3.line()([
                  [0, yTime(now)],
                  [width, yTime(now)],
                ])
              );

            nowG
              .selectAll("text")
              .attr("x", width - 27)
              .attr("y", yTime(now) - 4)
              .text("Now")
              .style("font-size", "12px")
              .style("fill", "red");
          };
          updateNowG();

          if (state.interval) clearInterval(state.interval);
          state.interval = setInterval(updateNowG, 1000);
        }
      ),
    [canvasHeight, data, initialize, width, yTime]
  );

  return (
    <D3Viz
      groupKey={groupKey}
      initialize={initialize}
      draw={draw}
      hidden={hidden}
      width={width}
      before={<TimeGrid groupKey={groupKey} />}
    >
      <Box ref={stickiesContainer} />
    </D3Viz>
  );
};
