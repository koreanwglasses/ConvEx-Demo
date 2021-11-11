import * as d3 from "d3";
import { useD3VizComponent } from "./d3-analysis-viz";

export const ActivityVolume = ({
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
      const gridG = svg.append("g");
      const timeGridG = svg.append("g");
      const timeGrid2G = svg.append("g");

      const barsG = svg.append("g");

      return {
        svg,
        barsG,
        gridG,
        timeGridG,
        timeGrid2G,
      };
    },
    ({
      width,
      clientHeight,
      canvasHeight,
      y,
      applyY,
      data,
      svg,
      barsG,
      gridG,
      timeGridG,
      timeGrid2G,
    }) => {
      ////////////////
      // BASE GRAPH //
      ////////////////

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

      gridG
        .attr("class", "grid")
        .attr("transform", `translate(0, ${canvasHeight})`)
        .attr("color", "rgba(255, 255, 255, 0.075)")
        .call(
          d3
            .axisBottom(x)
            .tickValues([0, 0.25, 0.5, 0.75, 1])
            .tickSize(-canvasHeight)
            .tickFormat(null)
        );

      const timeAxis = d3
        .scaleTime()
        .domain(data.map(([msg]) => msg.createdTimestamp))
        .range(data.map(([msg]) => y(msg)));
      timeGridG
        .attr("class", "grid")
        .attr("transform", `translate(${width}, 0)`)
        .attr("color", "rgba(255, 255, 255, 0.075)")
        .call(d3.axisLeft(timeAxis).tickSize(10));
      timeGrid2G
        .attr("class", "grid")
        .attr("transform", `translate(0, 0)`)
        .attr("color", "rgba(255, 255, 255, 0.075)")
        .call(
          d3
            .axisRight(timeAxis)
            .tickSize(width - 50)
            .tickFormat("" as any)
        );
    }
  );
  return (
    <D3VizComponent filterMargin={barHeight} hidden={hidden} width={width} />
  );
};
