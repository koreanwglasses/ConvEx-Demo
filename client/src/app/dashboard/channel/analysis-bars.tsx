import { Box } from "@mui/system";
import * as d3 from "d3";
import { useRef } from "react";
import { MessageData } from "../../../common/api-data-types";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { useGroupKey } from "./channel-viz-group/channel-viz-group";
import {
  selectThreshold,
  setThreshold,
} from "./channel-viz-group/channel-viz-group-slice";
import { useD3VizComponent } from "./d3-analysis-viz";

export const AnalysisBars = ({
  hidden,
  width,
  onDoubleClickBar,
}: {
  hidden?: boolean;
  width?: number;
  onDoubleClickBar?: (
    event: MouseEvent,
    data: readonly [MessageData, number | undefined]
  ) => void;
}) => {
  const rulerActiveRadius = 20;
  const barHeight = 20;
  const thresholdLabel = useRef<HTMLElement>(null);

  const groupKey = useGroupKey();
  const initialThreshold = useAppSelector(selectThreshold(groupKey));
  const dispatch = useAppDispatch();

  const D3VizComponent = useD3VizComponent(
    (svgRef) => {
      const svg = d3.select(svgRef);
      const gridG = svg.append("g");

      const rulerG = svg.append("g");
      const rulerThumb = rulerG.append("circle");
      const ruler = rulerG.append("path");

      const barsG = svg.append("g");
      const labelsG = svg.append("g");

      const rulerActiveArea = svg.append("rect");

      const state = {
        isDragging: false,
        isHovering: false,
        threshold: initialThreshold,
      };
      return {
        svg,
        barsG,
        labelsG,
        gridG,
        ruler,
        rulerActiveArea,
        rulerThumb,
        state,
      };
    },
    ({
      width,
      canvasHeight,
      applyY,
      data,
      svg,
      barsG,
      labelsG,
      gridG,
      ruler,
      rulerActiveArea,
      rulerThumb,
      state,
    }) => {
      const x = d3.scaleLinear().domain([0, 1]).range([0, width]);
      const sel0 = barsG
        .selectAll("rect")
        .data(data)
        .join("rect")
        .attr("x", x(0))
        .attr("width", ([, tox]) => x(tox ?? 0) - x(0))
        .attr("height", barHeight)
        .attr("fill", ([, tox]) => (tox ? d3.interpolateYlOrRd(tox) : "white"))
        .call(applyY(() => -barHeight / 2))
        .on("dblclick", (e, data) => onDoubleClickBar?.(e, data));

      const labelOutsideCutoff = 0.9;
      const sel1 = labelsG
        .selectAll("text")
        .data(data)
        .join("text")
        .style("font-weight", "bold")
        .style("fill", ([, tox]) =>
          typeof tox !== "number"
            ? "rgba(255,255,255,0.2)"
            : tox < labelOutsideCutoff
            ? d3.interpolateYlOrRd(tox)
            : "white"
        )
        .style("font-size", "12px")
        .attr("x", ([, tox]) =>
          typeof tox !== "number"
            ? 3
            : tox < labelOutsideCutoff
            ? x(tox) - x(0) + 5
            : x(tox) - x(0) - 28
        )
        .call(applyY(() => barHeight / 2 - 6))
        .text(([, tox]) =>
          typeof tox === "number" ? `${tox.toFixed(3).slice(1)}` : "N/A"
        );

      const setOpacity = () => {
        const opacity = ([, tox]: readonly [MessageData, number | undefined]) =>
          typeof tox === "number" && tox < state.threshold ? 0.4 : 1;

        sel0.attr("opacity", opacity);
        sel1.attr("opacity", opacity);
      };
      setOpacity();

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

      const updateLabel = () => {
        if (!thresholdLabel.current) return;
        thresholdLabel.current.textContent = state.threshold
          .toFixed(3)
          .slice(1);
        thresholdLabel.current.setAttribute(
          "style",
          `left: ${
            width * state.threshold + (state.threshold < 0.9 ? 2.5 : -35)
          }px; color: ${d3.interpolateYlOrRd(state.threshold)};`
        );
      };
      updateLabel();

      ///////////////////////
      // RULER / THRESHOLD //
      ///////////////////////

      rulerActiveArea
        .attr("y", 0)
        .attr("width", 2 * rulerActiveRadius)
        .attr("height", canvasHeight)
        .attr("fill", "rgba(0,0,0,0)")
        .attr("cursor", "pointer");

      ruler.attr("fill", "none").attr(
        "d",
        d3.line()([
          [state.threshold * width, 0],
          [state.threshold * width, canvasHeight],
        ])
      );

      // states
      const resetStyle = () => {
        rulerActiveArea.attr("x", width * state.threshold - rulerActiveRadius);
        ruler.attr("stroke-width", 1.5);
        ruler.attr("stroke", d3.interpolateYlOrRd(state.threshold));
        rulerThumb.attr("fill", d3.interpolateYlOrRd(state.threshold));
        rulerThumb.attr("r", 0);
      };
      resetStyle();

      const whileHovering = (e: MouseEvent) => {
        resetStyle();
        const [x, y] = d3.pointer(e, svg.node());

        const hoverThumbRadius =
          5 *
          Math.min(
            Math.max(
              1.5 - Math.abs(x - width * state.threshold) / rulerActiveRadius,
              0
            ),
            1
          );

        rulerThumb
          .attr("cx", width * state.threshold)
          .attr("cy", y)
          .attr("r", hoverThumbRadius);

        ruler.attr("stroke-width", 2.5);
      };

      const whileDragging = (e: MouseEvent) => {
        resetStyle();
        const [x, y] = d3.pointer(e, svg.node());

        rulerThumb.attr("cx", x).attr("cy", y).attr("r", 7.5);

        ruler.attr("stroke-width", 4).attr(
          "d",
          d3.line()([
            [x, 0],
            [x, canvasHeight],
          ])
        );

        state.threshold = x / width;
        setOpacity();
        updateLabel();
        dispatch(setThreshold({ groupKey, threshold: state.threshold }));
      };

      // events
      rulerActiveArea
        .on("mouseenter", (e: MouseEvent) => {
          state.isHovering = true;
          if (!state.isDragging) whileHovering(e);
        })
        .on("mouseleave", () => {
          state.isHovering = false;
          if (!state.isDragging) resetStyle();
        })
        .on("mousedown", (e: MouseEvent) => {
          if (e.button === 0) state.isDragging = true;
        });

      const mousemove = (e: MouseEvent) => {
        if (!(e.buttons & 1)) {
          state.isDragging = false;
          if (state.isHovering) whileHovering(e);
          else resetStyle();
        }
        if (state.isDragging) whileDragging(e);
        else if (state.isHovering) whileHovering(e);
      };
      ruler.on("mousemove", mousemove);
      svg.on("mousemove", mousemove);

      const mouseup = (e: MouseEvent) => {
        if (e.button === 0) {
          state.isDragging = false;
          if (state.isHovering) whileHovering(e);
          else resetStyle();
        }
      };
      ruler.on("mouseup", mouseup);
      svg.on("mouseup", mouseup);
    }
  );
  return (
    <D3VizComponent filterMargin={barHeight} hidden={hidden} width={width}>
      <Box sx={{ position: "fixed", top: 0, pointerEvents: "none" }}>
        <Box
          sx={{
            position: "relative",
            fontSize: "12px",
            fontWeight: "bold",
            backgroundColor: (theme) => {
              const color = d3.color(theme.palette.background.paper)!;
              color.opacity = 0.6;
              return color.formatRgb();
            },
            py: 0.25,
            px: 0.5,
          }}
          ref={thresholdLabel}
        />
      </Box>
    </D3VizComponent>
  );
};
