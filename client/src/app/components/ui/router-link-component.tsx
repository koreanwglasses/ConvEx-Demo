import { forwardRef } from "react";
import { Link } from "react-router-dom";

export const RouterLink = forwardRef(({ href, ...props }: any, ref) => (
  <Link {...props} to={href} ref={ref} />
));
