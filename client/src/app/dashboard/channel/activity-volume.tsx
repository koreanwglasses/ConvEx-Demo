import { Box } from "@mui/system";
import * as d3 from "d3";
import { useRef } from "react";
import {
  getDefaultDataFilter,
  messageTimeScale,
  useD3VizComponent,
} from "./d3-analysis-viz";
import { renderTimeGrid } from "../../components/ui/time-grid";
import { useGroupKey } from "./channel-viz-group/channel-viz-group";

export const ActivityVolume = ({
  hidden,
  width,
}: {
  hidden?: boolean;
  width?: number;
}) => {
  const groupKey = useGroupKey();
  const barHeight = 40;

  const stickiesContainer = useRef<HTMLDivElement>(null);

  const D3VizComponent = useD3VizComponent(
    (svgRef) => {
      const svg = d3.select(svgRef);
      const gridG = svg.append("g");
      const timeGridG = svg.append("g");
      const timeGrid2G = svg.append("g");

      const barsG = svg.append("g");
      const bars2G = svg.append("g");

      const labelsG = svg.append("g");

      return {
        svg,
        barsG,
        bars2G,
        labelsG,
        gridG,
        timeGridG,
        timeGrid2G,
      };
    },
    ({
      width,
      clientHeight,
      canvasHeight,
      data,
      svg,
      barsG,
      labelsG,
      gridG,
      timeGridG,
      timeGrid2G,
    }) => {
      ////////////////
      // BASE GRAPH //
      ////////////////

      const yTime = messageTimeScale(groupKey, data);

      const timeInterval = d3.timeHour;

      const messagesPerTimeInterval = d3.groups(data, ([msg]) =>
        timeInterval.floor(new Date(msg.createdTimestamp))
      );

      const x = d3
        .scaleLinear()
        .domain([
          0,
          1.2 *
            Math.max(...messagesPerTimeInterval.map(([, msgs]) => msgs.length)),
        ])
        .nice()
        .range([0, width]);

      // barsG
      //   .selectAll("rect")
      //   .data(messagesPerTimeInterval)
      //   .join("rect")
      //   .attr("x", x(0))
      //   .attr("y", ([time]) => timeY(time))
      //   .attr("fill", "blue")
      //   .attr(
      //     "height",
      //     ([time]) => timeY(d3.timeHour.offset(time, 1)) - timeY(time)
      //   )
      //   .attr("width", ([, msgs]) => x(msgs.length) - x(0));

      renderTimeGrid(
        data,
        yTime,
        stickiesContainer.current,
        canvasHeight
      );

      // gridG
      //   .attr("class", "grid")
      //   .attr("transform", `translate(0, ${canvasHeight})`)
      //   .attr("color", "rgba(255, 255, 255, 0.075)")
      //   .call(d3.axisBottom(x).tickSize(-canvasHeight).tickFormat(null));
    }
  );
  return (
    <D3VizComponent
      dataFilter={getDefaultDataFilter(groupKey, barHeight)}
      hidden={hidden}
      width={width}
    >
      <Box ref={stickiesContainer} />
    </D3VizComponent>
  );
};
