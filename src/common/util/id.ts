import { Types } from "mongoose";

/** Stringify a Mongo `_id` (ObjectId | string | unknown) without lint noise. */
export function toIdString(id: unknown): string {
  if (id instanceof Types.ObjectId) return id.toHexString();
  return typeof id === "string" ? id : "";
}

/** Read a string field off an untyped payload, with a fallback. */
export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length ? value : fallback;
}
