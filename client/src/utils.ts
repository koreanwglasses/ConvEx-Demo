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

export const isInViewport = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

export const onEnterViewport = (element: HTMLElement, callback: () => void) => {
  let wasInViewport = false;
  const listener = () => {
    const inViewport = isInViewport(element);
    if (inViewport && !wasInViewport) callback();
    wasInViewport = inViewport;
  };
  listener();
  window.addEventListener("scroll", listener);
  return { dispose: window.removeEventListener("scroll", listener) };
};
