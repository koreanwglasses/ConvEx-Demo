import { Box } from "@mui/system";
import * as d3 from "d3";
import { useRef, useCallback, useMemo } from "react";
import { MessageData } from "../../../common/api-data-types";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { useGroupKey } from "./channel-viz-group/channel-viz-group";
import {
  selectThreshold,
  setThreshold,
} from "./channel-viz-group/channel-viz-group-slice";
import {
  useMessagesOnCanvas as useVisibleMessages,
  useSetYWithTransition,
  useTimeScale,
} from "./d3-viz-hooks";
import ReactDOM from "react-dom";
import { CompactMessageGroupBase } from "../../components/ui/compact-chat-view-base";
import { selectMember } from "../../data/members-slice";
import { store } from "../../store";
import { Card } from "@mui/material";
import { TimeGrid } from "../../components/ui/time-grid";
import { D3Viz, drawCallback } from "../../components/ui/d3-viz";
import { useVizScrollerGroup } from "../../viz-scroller/viz-scroller-slice";

export const AnalysisBars = ({
  hidden,
  width = 300,
  onDoubleClickBar,
}: {
  hidden?: boolean;
  width?: number;
  onDoubleClickBar?: (
    event: MouseEvent,
    data: readonly [MessageData, number | undefined]
  ) => void;
}) => {
  const groupKey = useGroupKey();

  const initialThreshold = useAppSelector(selectThreshold(groupKey));
  const { canvasHeight } = useVizScrollerGroup(groupKey);

  const dispatch = useAppDispatch();

  const rulerActiveRadius = 20;
  const barHeight = 20;

  const stickiesContainer = useRef<HTMLDivElement>(null);
  const overlayContainer = useRef<HTMLDivElement>(null);
  const thresholdLabel = useRef<HTMLElement>(null);
  const messagePopover = useRef<HTMLDivElement>(null);

  const data = useVisibleMessages(groupKey);
  const scaleTime = useTimeScale(groupKey);
  const setY = useSetYWithTransition(groupKey);

  const initialize = useCallback(
    (svgRef: SVGSVGElement) => {
      const svg = d3.select(svgRef);
      const gridG = svg.append("g");
      const timeGridG = svg.append("g");
      const timeGrid2G = svg.append("g");

      const barsG = svg.append("g");
      const labelsG = svg.append("g");

      const rulerG = svg.append("g");
      const rulerThumb = rulerG.append("circle");
      const ruler = rulerG.append("path");
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
        timeGridG,
        timeGrid2G,
        rulerG,
        ruler,
        rulerActiveArea,
        rulerThumb,
        state,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const draw = useMemo(
    () =>
      drawCallback(
        data,
        initialize,
        ({
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
          ////////////////
          // BASE GRAPH //
          ////////////////

          const x = d3.scaleLinear().domain([0, 1]).range([0, width]);
          const bars = barsG
            .selectAll("rect")
            .data(data)
            .join("rect")
            .attr("x", x(0))
            .attr("width", ([, tox]) => x(tox ?? 0) - x(0))
            .attr("height", barHeight)
            .attr("fill", ([, tox]) =>
              tox ? d3.interpolateYlOrRd(tox) : "white"
            )
            .call(setY(-barHeight / 2))
            .on("dblclick", (e, data) => onDoubleClickBar?.(e, data));

          const labelOutsideCutoff = 0.9;
          const labels = labelsG
            .selectAll("text")
            .data(data)
            .join("text")
            .style("user-select", "none")
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
            .call(setY(barHeight / 2 - 6))
            .text(([, tox]) =>
              typeof tox === "number" ? `${tox.toFixed(3).slice(1)}` : "N/A"
            );

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

          /////////////////////
          // DYNAMIC STYLING //
          /////////////////////

          const setOpacity = () => {
            const opacity = ([, tox]: readonly [
              MessageData,
              number | undefined
            ]) => (typeof tox === "number" && tox < state.threshold ? 0.4 : 1);

            bars.attr("opacity", opacity);
            labels.attr("opacity", opacity);
          };
          setOpacity();

          const updateLabel = () => {
            if (!thresholdLabel.current) return;

            if (state.threshold < 0.01) {
              thresholdLabel.current.setAttribute("style", "opacity: 0");
            } else {
              thresholdLabel.current.textContent = state.threshold
                .toFixed(3)
                .slice(1);
              thresholdLabel.current.setAttribute(
                "style",
                `left: ${
                  width * state.threshold + (state.threshold < 0.9 ? 2.5 : -35)
                }px; color: ${d3.interpolateYlOrRd(state.threshold)};`
              );
            }
          };
          updateLabel();

          ///////////////////////
          // RULER / THRESHOLD //
          ///////////////////////

          // Base Styles
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

          // Dynamic Styles
          const resetStyle = () => {
            ruler.attr("stroke-width", 1.5);
            ruler.attr("stroke", d3.interpolateYlOrRd(state.threshold));
            rulerThumb.attr("fill", d3.interpolateYlOrRd(state.threshold));
            rulerThumb.attr("r", 0);
            rulerActiveArea.attr(
              "x",
              width * state.threshold - rulerActiveRadius
            );
          };
          resetStyle();

          // Higer-Order Event Handlers
          const whileHovering = (e: MouseEvent) => {
            resetStyle();
            const [x, y] = d3.pointer(e, svg.node());

            const hoverThumbRadius =
              5 *
              Math.min(
                Math.max(
                  1.5 -
                    Math.abs(x - width * state.threshold) / rulerActiveRadius,
                  0
                ),
                1
              );

            rulerThumb
              .attr("cx", width * state.threshold)
              .attr("cy", y)
              .attr("r", hoverThumbRadius);

            ruler.attr("stroke-width", 3);
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

          // Event Handlers
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

          /////////////
          // POPOVER //
          /////////////

          const mouseenter = (
            e: MouseEvent,
            [message, tox]: readonly [MessageData, number | undefined]
          ) => {
            if (!messagePopover.current) return;

            const { member } = selectMember(
              message.guildId,
              message.authorId
            )(store.getState());

            ReactDOM.render(
              <CompactMessageGroupBase
                messages={[message]}
                analyses={[
                  {
                    pending: false,
                    valid: true,
                    analysis:
                      typeof tox === "number" ? { overallToxicity: tox } : null,
                  },
                ]}
                threshold={0}
                member={member}
              />,
              messagePopover.current
            );

            const [x] = d3.pointer(e, overlayContainer.current);
            const left = Math.max(0, Math.min(x + 300, width) - 300);
            const bottom =
              2 +
              overlayContainer.current!.getBoundingClientRect().bottom -
              (e.currentTarget as SVGRectElement).getBoundingClientRect().top;

            messagePopover.current.setAttribute(
              "style",
              `bottom: ${bottom}px; left: ${left}px;`
            );
            messagePopover.current.classList.add("hover");
          };

          const mouseleave = () => {
            if (!messagePopover.current) return;
            messagePopover.current.classList.remove("hover");
          };

          bars.on("mouseenter", mouseenter).on("mouseleave", mouseleave);
          labels.on("mouseenter", mouseenter).on("mouseleave", mouseleave);
        }
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      canvasHeight,
      data,
      dispatch,
      groupKey,
      initialize,
      // onDoubleClickBar,
      setY,
      width,
      scaleTime,
    ]
  );

  return (
    <D3Viz
      groupKey={groupKey}
      data={data}
      initialize={initialize}
      draw={draw}
      hidden={hidden}
      width={width}
      before={<TimeGrid groupKey={groupKey} />}
    >
      <Box
        ref={stickiesContainer}
        sx={{ position: "absolute", top: 0, width: 1.0 }}
      />
      <Box
        sx={{ position: "fixed", top: 0, pointerEvents: "none" }}
        ref={overlayContainer}
      >
        <Box
          sx={{
            position: "absolute",
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
        <Card
          variant="outlined"
          sx={{
            position: "absolute",
            width: 300,
            maxWidth: width,
            p: 0.5,

            maxHeight: 0,
            opacity: 0,
            transition: "max-height 0.2s step-end, opacity 0.2s step-end",
            "&.hover": {
              transition: "none",
              maxHeight: 200,
              opacity: 1,
            },
          }}
          ref={messagePopover}
        ></Card>
      </Box>
    </D3Viz>
  );
};
