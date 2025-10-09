import { describe, expect, it } from "vitest";

import { camelToSnake, pluralizeModel } from "../naming";

describe("naming helpers", () => {
  it("pluralizeModel handles common suffixes", () => {
    expect(pluralizeModel("user")).toBe("users");
    expect(pluralizeModel("class")).toBe("classes");
    expect(pluralizeModel("company")).toBe("companies");
  });

  it("camelToSnake converts camelCase into snake_case", () => {
    expect(camelToSnake("createdAt")).toBe("created_at");
    expect(camelToSnake("userID")).toBe("user_i_d");
    expect(camelToSnake("status")).toBe("status");
  });
});
