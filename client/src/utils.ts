import { to } from "await-to-js";
import { shallowEqual } from "react-redux";

const removeUndefined = (obj: any) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([k, v]) => typeof v !== "undefined")
  );
};

export const fetchJSON = async <T = any>(url: string, body?: any) => {
  const [err0, res] = await to(
    fetch(
      url,
      removeUndefined({
        method: "POST",
        headers: body && {
          "Content-Type": "application/json",
        },
        body: body && JSON.stringify(removeUndefined(body)),
      })
    )
  );
  if (err0) return [err0] as const;
  if (!res?.ok) return [res] as const;

  const [err1, result] = await to(res.json());
  if (err1) return [err1] as const;
  return [null, result as T] as const;
};

export const arrayEqual = (left?: unknown[], right?: unknown[]) => {
  if (left === right) return true;
  if (!left || !right) return false;
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) {
    if (!shallowEqual(left[i], right[i])) return false;
  }
  return true;
};
