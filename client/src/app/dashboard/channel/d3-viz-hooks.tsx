import { MessageData } from "../../../common/api-data-types";
import { useAppSelector, useDeepMemo } from "../../hooks";
import { useVizScrollerGroup } from "../../viz-scroller/viz-scroller-slice";
import {
  selectLayoutMode,
  selectLayoutData,
  useOffsets,
  useMessages,
} from "./channel-viz-group/channel-viz-group-slice";
import * as d3 from "d3";
import { shallowEqual } from "react-redux";
import { useCallback, useMemo } from "react";
import { selectBatchAnalysis } from "../../data/analyses-slice";
import { deepEqual } from "../../../utils";

export type Datum = readonly [MessageData, number | null | undefined];

export const useY = (groupKey: string) => {
  const offsets = useOffsets(groupKey);
  const { offset, canvasHeight } = useVizScrollerGroup(groupKey);
  return useCallback(
    (datum: Datum) => offsets(datum[0]) + offset + canvasHeight,
    [canvasHeight, offset, offsets]
  );
};

export const useYPrev = (groupKey: string) => {
  const { prevMode } = useAppSelector(selectLayoutMode(groupKey), shallowEqual);
  const offsets = useOffsets(groupKey, prevMode);
  const { offset, canvasHeight } = useVizScrollerGroup(groupKey);
  return useCallback(
    (datum: Datum) => offsets(datum[0]) + offset + canvasHeight,
    [canvasHeight, offset, offsets]
  );
};

export const useMessagesOnCanvas = (groupKey: string, outerMargin = 50) => {
  const messages = useDeepMemo(
    useMessages(groupKey)?.filter(
      (message) => message.type === "DEFAULT" || message.type === "REPLY"
    )
  );
  const analyses = useAppSelector(
    selectBatchAnalysis(messages ?? []),
    deepEqual()
  );

  const { isTransitioning } = useAppSelector(
    selectLayoutMode(groupKey),
    shallowEqual
  );
  const { canvasHeight } = useVizScrollerGroup(groupKey);
  const y = useY(groupKey);
  const yPrev = useYPrev(groupKey);

  const isWithinMargin = useCallback(
    (y?: number) =>
      typeof y === "number" &&
      -outerMargin <= y &&
      y <= canvasHeight + outerMargin,
    [canvasHeight, outerMargin]
  );

  return useDeepMemo(
    useMemo(
      () =>
        messages
          ?.map(
            (msg, i) => [msg, analyses[i].analysis?.overallToxicity] as const
          )
          .filter(
            (datum) =>
              isWithinMargin(y(datum)) ||
              (isTransitioning && isWithinMargin(yPrev(datum)))
          ),
      [analyses, isTransitioning, isWithinMargin, messages, y, yPrev]
    )
  );
};

export const useSetYWithTransition = (groupKey: string) => {
  const { isTransitioning, transitionOffset } = useAppSelector(
    selectLayoutMode(groupKey),
    shallowEqual
  );
  const y = useY(groupKey);
  const yPrev = useYPrev(groupKey);

  return useCallback(
    (offsetY: number | ((datum: Datum) => number), targetAttr = "y") =>
      (sel: d3.Selection<any, Datum, any, unknown>) => {
        const offset = (datum: Datum) =>
          typeof offsetY === "number" ? offsetY : offsetY(datum);

        if (isTransitioning) {
          sel
            .attr(
              targetAttr,
              (datum) => yPrev(datum) + offset(datum) + transitionOffset
            )
            .transition()
            .delay(250)
            .duration(400)
            .attr(targetAttr, (datum) => y(datum) + offset(datum));
        } else {
          sel.attr(targetAttr, (datum) => y(datum) + offset(datum));
        }
      },
    [isTransitioning, transitionOffset, y, yPrev]
  );
};

export const useTimeExtent = (groupKey: string, outerMargin?: number) => {
  const { mode } = useAppSelector(selectLayoutMode(groupKey), shallowEqual);

  const { canvasHeight, offset } = useVizScrollerGroup(groupKey);
  const offsetFunc = useOffsets(groupKey);

  const data = useMessagesOnCanvas(groupKey, outerMargin);

  return useMemo(
    () =>
      mode === "time"
        ? ([
            offsetFunc.inverse(offset + canvasHeight),
            offsetFunc.inverse(offset),
          ] as const)
        : data?.length
        ? (d3.extent(data?.map((d) => d[0].createdTimestamp)) as [
            number,
            number
          ])
        : undefined,
    [canvasHeight, data, mode, offset, offsetFunc]
  );
};

export const useTimeScale = (groupKey: string, outerMargin?: number) => {
  const { canvasHeight } = useVizScrollerGroup(groupKey);
  const { mode } = useAppSelector(selectLayoutMode(groupKey), shallowEqual);
  const { offsetTopMap, offsetMap } = useAppSelector(
    selectLayoutData(groupKey),
    shallowEqual
  );

  const data = useMessagesOnCanvas(groupKey, outerMargin);
  const y = useY(groupKey);

  const timeExtent = useTimeExtent(groupKey);

  return useMemo(
    () =>
      mode === "time"
        ? d3
            .scaleTime()
            .domain(timeExtent ?? [])
            .range([0, canvasHeight])
        : d3
            .scaleTime()
            .domain(data?.map((d) => d[0].createdTimestamp) ?? [])
            .range(
              data?.map((d) =>
                mode === "map"
                  ? offsetTopMap[d[0].id] - offsetMap[d[0].id] + y(d)
                  : y(d)
              ) ?? []
            ),
    [canvasHeight, data, mode, offsetMap, offsetTopMap, timeExtent, y]
  );
};
