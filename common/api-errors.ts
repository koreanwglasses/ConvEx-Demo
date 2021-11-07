export class ConvExSocketError implements Error {
  name = "ConvExSocketError";
  constructor(
    public message:
      | "Unauthorized"
      | "Forbidden"
      | "Already subscribed"
      | "Not subscribed"
  ) {}
}
