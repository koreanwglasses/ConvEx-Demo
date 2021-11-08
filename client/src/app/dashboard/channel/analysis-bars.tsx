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
      const labelsG = svg.append("g");
      return { svg, barsG, labelsG };
    },
    ({ width, applyY, data, barsG, labelsG }) => {
      const x = d3.scaleLinear().domain([0, 1]).range([0, width]);
      barsG
        .selectAll("rect")
        .data(data)
        .join("rect")
        .attr("x", x(0))
        .attr("width", ([, tox]) => x(tox ?? 0) - x(0))
        .attr("height", barHeight)
        .attr("fill", ([, tox]) => (tox ? d3.interpolateYlOrRd(tox) : "white"))
        .call(applyY(() => -barHeight / 2));

      const cutoff = 0.9;
      labelsG
        .selectAll("text")
        .data(data)
        .join("text")
        .style("font-weight", "bold")
        .style("fill", ([, tox]) =>
          typeof tox !== "number"
            ? "rgba(255,255,255,0.2)"
            : tox < cutoff
            ? d3.interpolateYlOrRd(tox)
            : "white"
        )
        .style("font-size", "12px")
        .attr("x", ([, tox]) =>
          typeof tox !== "number"
            ? 2
            : tox < cutoff
            ? x(tox) - x(0) + 5
            : x(tox) - x(0) - 28
        )
        .call(applyY(() => barHeight / 2 - 6))
        .text(([, tox]) =>
          typeof tox === "number" ? `${tox.toFixed(3).slice(1)}` : "N/A"
        );
    }
  );
  return (
    <D3VizComponent filterMargin={barHeight} hidden={hidden} width={width} />
  );
};
