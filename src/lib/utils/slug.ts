import slugify from "slugify";
import { nanoid } from "nanoid";

export function generateSlug(title: string): string {
  const base = slugify(title, { lower: true, strict: true });
  const suffix = nanoid(8);
  return `${base}-${suffix}`;
}
