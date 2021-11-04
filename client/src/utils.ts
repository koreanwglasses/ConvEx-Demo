import { to } from "await-to-js";

export const fetchJSON = async <T = any>(url: string) => {
  const [err0, res] = await to(fetch(url));
  if (err0) return [err0] as const;
  if (!res?.ok) return [res] as const;

  const [err1, result] = await to(res.json());
  if (err1) return [err1] as const;
  return [null, result as T] as const;
};
