import { Box, SxProps } from "@mui/system";
import React, { forwardRef, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../hooks";
import {
  selectVizScrollerGroup,
  adjustScrollOffset,
} from "./viz-scroller-slice";

export const VizGroupContainer = ({
  groupKey,
  onScroll: onScroll_,
  children,
}: React.PropsWithChildren<{
  groupKey: string;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
  fixedBaseline?: boolean;
}>) => {
  const { height, offset, maxScrollOffset } = useAppSelector(
    selectVizScrollerGroup(groupKey)
  );

  const dispatch = useAppDispatch();
  const computeOffset = useMemo(
    () => (ref: HTMLDivElement) => {
      const scrollFromTop =
        ref.scrollHeight + ref.scrollTop - ref.clientHeight - height;
      if (
        scrollFromTop < height / 2 &&
        (!maxScrollOffset || offset + 3 * height < maxScrollOffset)
      ) {
        dispatch(
          adjustScrollOffset({
            key: groupKey,
            amount: height / 2,
          })
        );
      } else if (scrollFromTop > (3 * height) / 2 && offset > 0) {
        dispatch(
          adjustScrollOffset({
            key: groupKey,
            amount: -height / 2,
          })
        );
      }
    },
    [dispatch, groupKey, height, maxScrollOffset, offset]
  );

  const onScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
    computeOffset(e.currentTarget);
    onScroll_ && onScroll_(e);
  };

  return (
    <Box
      sx={{
        height,
        overflowY: "scroll",
        scrollbarWidth: "none",
        display: "flex",
        flexFlow: "column-reverse",
        "::-webkit-scrollbar": {
          display: "none",
        },
      }}
      onScroll={onScroll}
    >
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "flex-start",
          height: Math.min(
            4 * height + offset,
            maxScrollOffset ?? Number.POSITIVE_INFINITY
          ),
        }}
      >
        {children}
      </div>
    </Box>
  );
};

export const VizScroller = forwardRef(
  (
    {
      groupKey,
      children,
      fixedBaseline = false,
      sx = {},
    }: {
      groupKey: string;
      children:
        | React.ReactNode
        | (({ offset }: { offset: number }) => React.ReactNode);
      fixedBaseline?: boolean;
      sx?: SxProps;
    },
    ref
  ) => {
    const { height, offset, maxScrollOffset } = useAppSelector(
      selectVizScrollerGroup(groupKey)
    );

    return (
      <Box
        sx={{
          height: 3 * height,
          overflowY: "hidden",
          display: "flex",
          flexFlow: "column-reverse",
          position: "relative",
          top: height,
          ...sx,
        }}
        style={{
          height: fixedBaseline ? 3 * height + offset : undefined,
          top: maxScrollOffset
            ? Math.min(maxScrollOffset - 3 * height - offset, height)
            : undefined,
        }}
        ref={ref}
      >
        {typeof children === "function" ? children({ offset }) : children}
      </Box>
    );
  }
);
