import { Link } from "react-router-dom";

export const RouterLink = ({ innerRef, href, ...props }: any) => (
  <Link {...props} to={href} />
)