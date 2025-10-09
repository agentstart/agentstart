import { describe, expect, it } from "vitest";

import {
  ensureArrayValue,
  normalizeSortInput,
  normalizeWhereInput,
  splitWhereConditions,
} from "../where";

describe("where helpers", () => {
  it("normalizes where clauses", () => {
    const result = normalizeWhereInput([
      { field: "id", value: "123" },
      { field: "email", value: "foo@example.com", operator: "eq" },
      {
        field: "role",
        value: ["admin", "editor"],
        operator: "in",
        connector: "OR",
      },
    ]);

    expect(result).toEqual([
      { field: "id", value: "123", operator: undefined, connector: undefined },
      {
        field: "email",
        value: "foo@example.com",
        operator: "eq",
        connector: undefined,
      },
      {
        field: "role",
        value: ["admin", "editor"],
        operator: "in",
        connector: "OR",
      },
    ]);
  });

  it("throws when where input is not an array", () => {
    expect(() => normalizeWhereInput("invalid")).toThrow(
      /Where clause must be an array/,
    );
  });

  it("ensures array value operators receive arrays", () => {
    expect(
      ensureArrayValue({ field: "tags", value: ["foo"], operator: "in" }),
    ).toEqual(["foo"]);
    expect(() =>
      ensureArrayValue({ field: "tags", value: "foo", operator: "in" }),
    ).toThrow(/requires an array value/);
  });

  it("normalizes sort directions", () => {
    expect(
      normalizeSortInput([
        { field: "created_at" },
        { field: "name", direction: "desc" },
      ]),
    ).toEqual([
      { field: "created_at", direction: "asc" },
      { field: "name", direction: "desc" },
    ]);
  });

  it("splits conditions into AND/OR buckets", () => {
    const { andConditions, orConditions } = splitWhereConditions([
      { field: "id", value: "1" },
      { field: "status", value: "active", connector: "OR" },
      { field: "archived", value: false },
    ]);

    expect(andConditions).toHaveLength(2);
    expect(orConditions).toHaveLength(1);
  });
});
