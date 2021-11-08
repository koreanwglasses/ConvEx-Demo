import { useEffect, useRef, useState } from "react";

const TransitionContainer = ({
  mounted,
  delay,
  children,
}: {
  mounted: boolean;
  delay: number;
  children: (hidden: boolean) => React.ReactNode;
}) => {
  const [actuallyMounted, setActuallyMounted] = useState(mounted);
  const [firstRender, setFirstRender] = useState(false);

  const timeout = useRef<NodeJS.Timeout>();
  const lastMounted = useRef(mounted);

  useEffect(() => {
    if (!mounted && lastMounted.current) {
      timeout.current = setTimeout(() => {
        timeout.current = undefined;
        setActuallyMounted(false);
      }, delay);
    }
    lastMounted.current = mounted;

    if (mounted && timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = undefined;
    }

    if (mounted && !actuallyMounted) {
      setActuallyMounted(true);
      setFirstRender(true);
    }
  }, [actuallyMounted, delay, mounted]);

  useEffect(() => {
    if (firstRender) setFirstRender(false);
  }, [firstRender]);

  return <>{actuallyMounted && children(firstRender || !mounted)}</>;
};

export default TransitionContainer;
