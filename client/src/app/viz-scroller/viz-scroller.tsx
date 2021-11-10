import { Box, SxProps } from "@mui/system";
import React, { forwardRef, useEffect, useRef } from "react";
import { useAppDispatch } from "../hooks";
import {
  adjustScrollTop_,
  computeScrollOffset,
  useVizScrollerGroup,
} from "./viz-scroller-slice";
import mergeRefs from "react-merge-refs";

type Props = React.PropsWithChildren<{
  groupKey: string;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
  fixedBaseline?: boolean;
}>;
export const VizGroupContainer = React.forwardRef<HTMLDivElement, Props>(
  ({ groupKey, onScroll: onScroll_, children }: Props, ref) => {
    const { scrollHeight, clientHeight, dScrollTop } =
      useVizScrollerGroup(groupKey);

    const dispatch = useAppDispatch();

    const lastTimestamp = useRef<number>();
    const onScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
      if (!lastTimestamp.current || e.timeStamp - lastTimestamp.current > 50) {
        dispatch(
          computeScrollOffset({
            key: groupKey,
            scrollTop: e.currentTarget.scrollTop,
          })
        );
      }
      lastTimestamp.current = e.timeStamp;

      onScroll_ && onScroll_(e);
    };

    const ref_ = useRef<HTMLDivElement>(null);
    useEffect(() => {
      if (ref_.current && dScrollTop) {
        ref_.current.scrollTop += dScrollTop;        
        dispatch(adjustScrollTop_({ key: groupKey, reset: true }));
      }
    }, [dScrollTop, dispatch, groupKey]);

    return (
      <Box sx={{ transform: "translate(0,0)" }}>
        <Box
          sx={{
            height: clientHeight,
            overflowY: "scroll",
            scrollbarWidth: "none",
            display: "flex",
            flexFlow: "column-reverse",
            "::-webkit-scrollbar": {
              display: "none",
            },
          }}
          onScroll={onScroll}
          ref={mergeRefs([ref, ref_])}
        >
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "flex-start",
              height: ref_.current
                ? Math.max(
                    scrollHeight,
                    clientHeight - ref_.current.scrollTop,
                    clientHeight - ref_.current.scrollTop - dScrollTop
                  )
                : scrollHeight,
            }}
          >
            {children}
          </div>
        </Box>
      </Box>
    );
  }
);

export const VizScroller = forwardRef(
  (
    {
      groupKey,
      children,
      fixedBaseline = false,
      sx = {},
      style = {},
    }: {
      groupKey: string;
      children:
        | React.ReactNode
        | (({ offset }: { offset: number }) => React.ReactNode);
      fixedBaseline?: boolean;
      sx?: SxProps;
      style?: React.CSSProperties;
    },
    ref
  ) => {
    const { clientHeight, canvasHeight, scrollHeight, canvasTop, offset } =
      useVizScrollerGroup(groupKey);

    return (
      <Box
        sx={{
          overflowY: "hidden",
          display: "flex",
          flexFlow: "column-reverse",
          position: "relative",
          ...sx,
        }}
        style={{
          height: fixedBaseline ? scrollHeight - clientHeight : canvasHeight,
          top: canvasTop,
          ...style,
        }}
        ref={ref}
      >
        {typeof children === "function" ? children({ offset }) : children}
      </Box>
    );
  }
);
