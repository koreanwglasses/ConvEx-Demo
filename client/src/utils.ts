import { to } from "await-to-js";

const removeUndefined = (obj: any) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([k, v]) => typeof v !== "undefined")
  );
};

export const fetchJSON = async <T = any>(url: string, body?: any) => {
  const [err0, res] = await to(
    fetch(
      url,
      body && {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(removeUndefined(body)),
      }
    )
  );
  if (err0) return [err0] as const;
  if (!res?.ok) return [res] as const;

  const [err1, result] = await to(res.json());
  if (err1) return [err1] as const;
  return [null, result as T] as const;
};
