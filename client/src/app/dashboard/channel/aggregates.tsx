import { Box } from "@mui/system";
import * as d3 from "d3";
import { useCallback, useRef, useMemo } from "react";
import { useTimeExtent, useTimeScale } from "./d3-viz-hooks";
import { useGroupKey } from "./channel-viz-group/channel-viz-group";
import { useChannelVizGroup } from "./channel-viz-group/channel-viz-group-slice";
import { D3Viz, drawCallback } from "../../components/ui/d3-viz";
import { useVizScrollerGroup } from "../../viz-scroller/viz-scroller-slice";
import { useAggregates } from "../../data/aggregates-slice";
import { TimeGrid } from "../../components/ui/time-grid";

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

  const barHeight = 25;

  const stickiesContainer = useRef<HTMLDivElement>(null);

  const [start, end] = (useTimeExtent(groupKey) ?? []) as [number, number];
  const data = useAggregates(guildId, channelId, start, end);

  const yTime = useTimeScale(groupKey);

  const initialize = useCallback((svgRef: SVGSVGElement) => {
    const svg = d3.select(svgRef);
    const gridG = svg.append("g");
    const bars1G = svg.append("g");
    const bars2G = svg.append("g");

    const nowG = svg.append("g");
    nowG.append("path");
    nowG.append("text");

    return {
      svg,
      bars1G,
      bars2G,
      gridG,
      nowG,
      state: {
        interval: undefined as NodeJS.Timeout | undefined,
      },
    };
  }, []);

  const draw = useMemo(
    () =>
      drawCallback(initialize, ({ bars1G, bars2G, gridG, nowG, state }) => {
        ////////////////
        // BASE GRAPH //
        ////////////////

        const x = d3
          .scaleLinear()
          .domain([0, Math.max(5, ...data.map((d) => d.numMessages + 1))])
          .nice()
          .range([0, width]);
        gridG
          .attr("class", "grid")
          .attr("transform", `translate(0, ${canvasHeight})`)
          .attr("color", "rgba(255, 255, 255, 0.075)")
          .call(d3.axisBottom(x).tickSize(-canvasHeight).tickFormat(null));

        bars1G
          .selectAll("rect")
          .data(data)
          .join("rect")
          .attr("x", x(0))
          .attr("y", (d) => yTime(d.timespan.start))
          .attr("fill", "#22aaff")
          .attr("height", barHeight)
          .attr("width", (d) => x(d.numMessages) - x(0));

        bars2G
          .selectAll("rect")
          .data(data)
          .join("rect")
          .attr("x", x(0))
          .attr("y", (d) => yTime(d.timespan.start))
          .attr("fill", "#ff0000")
          .attr("height", barHeight)
          .attr("width", (d) => x(d.toxicity.numOverThreshold) - x(0));

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
      }),
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
