/* agent-frontmatter:start
AGENT: Base64 helper tests
PURPOSE: Ensure arrayBufferToBase64 preserves binary data integrity
USAGE: pnpm vitest base64.test.ts
EXPORTS: (tests only)
FEATURES:
  - Validates encoding of zero bytes
  - Exercises chunked conversion across segment boundaries
SEARCHABLE: base64 test, blob upload integrity
agent-frontmatter:end */

import { Buffer } from "node:buffer";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { arrayBufferToBase64 } from "./base64";

type BtoaGlobal = Omit<typeof globalThis, "btoa"> & {
  btoa?: (data: string) => string;
};

const globalWithOptionalBtoa = globalThis as BtoaGlobal;
const originalBtoa = globalWithOptionalBtoa.btoa;

beforeAll(() => {
  if (!globalWithOptionalBtoa.btoa) {
    globalWithOptionalBtoa.btoa = (value: string) =>
      Buffer.from(value, "binary").toString("base64");
  }
});

afterAll(() => {
  if (originalBtoa) {
    globalWithOptionalBtoa.btoa = originalBtoa;
  } else {
    delete globalWithOptionalBtoa.btoa;
  }
});

describe("arrayBufferToBase64", () => {
  it("encodes data that includes null bytes", () => {
    const source = new Uint8Array([0, 255, 1, 0, 2, 128]);
    const expected = Buffer.from(source).toString("base64");

    expect(arrayBufferToBase64(source.buffer)).toBe(expected);
  });

  it("handles payloads larger than a single chunk", () => {
    const source = new Uint8Array(0x9000);
    source[0] = 17;
    source[0x8000] = 34;
    source[source.length - 1] = 51;
    const expected = Buffer.from(source).toString("base64");

    expect(arrayBufferToBase64(source.buffer)).toBe(expected);
  });
});
