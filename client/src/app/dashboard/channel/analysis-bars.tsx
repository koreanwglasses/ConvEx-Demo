import * as d3 from "d3";
import { useD3VizComponent } from "./d3-analysis-viz";
import { useMessages } from "./channel-viz-group/channel-viz-group-slice";
import { useGroupKey } from "./channel-viz-group/channel-viz-group";

export const AnalysisBars = () => {
  const groupKey = useGroupKey();
  const messages = useMessages(groupKey);
  const barHeight = 20;
  const D3VizComponent = useD3VizComponent(
    (svgRef) => {
      const svg = d3.select(svgRef);
      const barsG = svg.append("g");
      return { svg, barsG };
    },
    ({ width, y, data, barsG }) => {
      const x = d3.scaleLinear().domain([0, 1]).range([0, width]);
      barsG
        .selectAll("rect")
        .data(data)
        .join("rect")
        .attr("x", x(0))
        .attr("width", ([, analysis]) => x(analysis ?? 0) - x(0))
        .attr("y", ([id]) => y(id) - barHeight / 2)
        .attr("height", barHeight)
        .attr("fill", ([, analysis]) =>
          analysis ? d3.interpolateYlOrRd(analysis) : "white"
        );
    }
  );
  return (
    <D3VizComponent
      messages={messages}
      filterMargin={barHeight}
    />
  );
};
