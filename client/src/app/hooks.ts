import { useRef } from "react";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { deepEqual } from "../utils";
import type { RootState, AppDispatch } from "./store";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const usePreviousValue = <T>(
  value: T,
  onChange?: (prevValue: T | undefined, currValue: T) => void
) => {
  const valueOnLastRender = useRef<T>();
  const previousValue = useRef<T>();

  if (valueOnLastRender.current !== value) {
    previousValue.current = valueOnLastRender.current;
    onChange?.(previousValue.current, value);
  }

  valueOnLastRender.current = value;

  return previousValue.current;
};

export const useDeepMemo = <T>(obj: T, depth?: number) => {
  const lastObj = useRef(obj);
  if (deepEqual(depth)(obj, lastObj.current)) return lastObj.current;
  else return (lastObj.current = obj);
};
