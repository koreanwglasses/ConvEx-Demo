import { CircularProgress } from "@mui/material";
import { Box } from "@mui/system";
import { MessageData } from "../../../common/api-data-types";
import { useAppSelector } from "../../hooks";
import { VizScroller } from "../../viz-scroller/viz-scroller";
import {
  selectInitialOffsets,
  selectVizScrollerGroup,
} from "../../viz-scroller/viz-scroller-slice";
import * as d3 from "d3";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { selectBatchAnalysis } from "../../data/analyses-slice";

export const AnalysisBars = ({
  guildId,
  channelId,
  messages,
  groupKey,
}: {
  messages?: MessageData[];
  guildId: string;
  channelId: string;
  groupKey: string;
  reachedBeginning?: boolean;
}) => {
  //////////
  // DATA //
  //////////

  // Only rendering default messages and replies for now
  const messagesToRender = messages?.filter(
    (message) => message.type === "DEFAULT" || message.type === "REPLY"
  );
  const analyses = useAppSelector(
    selectBatchAnalysis(
      messagesToRender?.map((message) => ({
        guildId,
        channelId,
        messageId: message.id,
      })) ?? []
    )
  );
  const data = messagesToRender?.map(
    (message, i) => [message.id, analyses[i].analysis?.overallToxicity] as const
  );

  ////////////
  // LAYOUT //
  ////////////

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const width = containerRef.current?.clientWidth;
  const { height, offset } = useAppSelector(selectVizScrollerGroup(groupKey));

  const initialOffsets = useAppSelector(selectInitialOffsets(groupKey));

  ///////////
  // CHART //
  ///////////

  const init = useCallback(() => {
    const svg = d3.select(svgRef.current);
    const barsG = svg.append("g");
    return { svg, barsG };
  },[])
  const selections = useRef<ReturnType<typeof init>>();

  useEffect(() => {
    if ( !data || !width || !initialOffsets) return;
    if (!selections.current && !(selections.current = init())) return;

    const barHeight = 20;

    const x = d3.scaleLinear().domain([0, 1]).range([0, width]);
    const y = (id: string) => height*3+initialOffsets(id)+offset;

    const { barsG } = selections.current;

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
  }, [data, height, init, initialOffsets, offset, width]);

  return (
    <VizScroller
      groupKey={groupKey}
      sx={{ flexBasis: 300, flexGrow: 1, position: "relative" }}
      ref={containerRef}
    >
      <svg width={width} height={height*3} ref={svgRef} />
      {!messages && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height,
            width: containerRef.current?.clientWidth,
            mb: 1,
            position: "absolute",
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </VizScroller>
  );
};
