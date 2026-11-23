import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC = "isPublic";

/** Marks a route as reachable without an access token (every other route requires one). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
