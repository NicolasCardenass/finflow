import "server-only";

/** Base URL of the FinFlow API. Only the Next.js server talks to it. */
export const API_URL = (process.env.FINFLOW_API_URL ?? "http://localhost:3333/api").replace(
  /\/+$/,
  "",
);

export const IS_PRODUCTION = process.env.NODE_ENV === "production";
