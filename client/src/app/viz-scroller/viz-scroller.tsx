import { Box, SxProps } from "@mui/system";
import React, { forwardRef, useEffect, useRef, useState } from "react";
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
        <CustomScrollbar groupKey={groupKey} container={ref_.current} />
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
          overflowY: "clip",
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

const CustomScrollbar = ({
  groupKey,
  container,
}: {
  groupKey: string;
  container: HTMLDivElement | null;
}) => {
  const { maxScrollHeight = 400, clientHeight } = useVizScrollerGroup(groupKey);

  const thumb = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const thumbHeight = 50;
  const paddingVertical = 3;

  const [isScrolling, setIsScrolling] = useState(false);
  useEffect(() => {
    if (container) {
      let timeout: NodeJS.Timeout;
      const handleScroll = () => {
        if (!isDragging.current)
          thumb.current?.setAttribute(
            "style",
            `bottom:${
              (-container.scrollTop / (maxScrollHeight - clientHeight)) *
                (clientHeight - thumbHeight - 2 * paddingVertical) +
              paddingVertical
            }px`
          );

        setIsScrolling(true);

        if (timeout) clearTimeout(timeout);
        const lastScrollTop = container.scrollTop;
        timeout = setTimeout(() => {
          if (container.scrollTop === lastScrollTop) {
            setIsScrolling(false);
          }
        }, 500);
      };
      container.addEventListener("scroll", handleScroll);

      const handleMouseUp = () => {
        isDragging.current = false;
      };
      window.addEventListener("mouseup", handleMouseUp);

      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging.current) {
          const y = container.getBoundingClientRect().bottom - e.clientY;
          container.scrollTop = Math.max(
            Math.min(
              0,
              (-(maxScrollHeight - clientHeight) *
                (y - thumbHeight / 2 - paddingVertical)) /
                (clientHeight - thumbHeight - 2 * paddingVertical)
            ),
            -maxScrollHeight + clientHeight
          );

          thumb.current?.setAttribute(
            "style",
            `bottom:${Math.min(
              Math.max(paddingVertical, y - thumbHeight / 2),
              clientHeight - paddingVertical - thumbHeight
            )}px`
          );
        }
      };
      window.addEventListener("mousemove", handleMouseMove);

      return () => {
        container.removeEventListener("scroll", handleScroll);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("mousemove", handleMouseMove);
      };
    }
  }, [clientHeight, container, maxScrollHeight]);

  return (
    <Box
      sx={{
        position: "fixed",
        right: 2,
        top: paddingVertical,
        height: "calc(100% - 6px)",
        width: 9,
        bgcolor: "rgba(0,0,0,0.1)",
        opacity: 0,
        transition: "opacity 0.3s",
        "&:hover": {
          opacity: 1,
          transition: "opacity 0.3s",
        },
      }}
      style={
        isScrolling
          ? {
              opacity: 1,
              transition: "opacity 0.3s",
            }
          : undefined
      }
      onMouseDown={() => {
        isDragging.current = true;
      }}
    >
      <Box
        sx={{
          position: "fixed",
          right: 2,
          height: thumbHeight,
          width: 9,
          borderRadius: 5,
          bgcolor: "rgba(0,0,0,0.25)",
          bottom: 3,
          transition: "bottom 0.05s",
        }}
        ref={thumb}
      ></Box>
    </Box>
  );
};
