import { customAlphabet } from "nanoid";

export function generateId() {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  const nanoid = customAlphabet(alphabet, 10);
  return nanoid();
}
