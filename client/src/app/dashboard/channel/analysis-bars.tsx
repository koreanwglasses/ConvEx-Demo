import * as d3 from "d3";
import { useD3VizComponent } from "./d3-analysis-viz";

export const AnalysisBars = ({
  hidden,
  width,
}: {
  hidden?: boolean;
  width?: number;
}) => {
  const barHeight = 20;
  const D3VizComponent = useD3VizComponent(
    (svgRef) => {
      const svg = d3.select(svgRef);
      const barsG = svg.append("g");
      return { svg, barsG };
    },
    ({ width, applyY, data, barsG }) => {
      const x = d3.scaleLinear().domain([0, 1]).range([0, width]);
      barsG
        .selectAll("rect")
        .data(data)
        .join("rect")
        .attr("x", x(0))
        .attr("width", ([, analysis]) => x(analysis ?? 0) - x(0))
        .attr("height", barHeight)
        .attr("fill", ([, analysis]) =>
          analysis ? d3.interpolateYlOrRd(analysis) : "white"
        )
        .call(applyY(() => -barHeight / 2));
    }
  );
  return (
    <D3VizComponent filterMargin={barHeight} hidden={hidden} width={width} />
  );
};
