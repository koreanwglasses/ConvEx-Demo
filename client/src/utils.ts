type Primitive = number | boolean | string | null | undefined;
export type AsResponse<T> = {
  [K in keyof T as T[K] extends Primitive | Primitive[] | (() => Primitive)
    ? K
    : never]: T[K] extends () => infer S ? S : T[K];
};
