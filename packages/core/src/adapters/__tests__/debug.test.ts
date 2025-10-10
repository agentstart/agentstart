import { describe, expect, it, vi } from "vitest";

import { createDebugLoggerHook } from "../shared";

describe("createDebugLoggerHook", () => {
  it("logs through console when debug=true", () => {
    const loggerSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const hook = createDebugLoggerHook<{ debug?: true }>("memory");
    const logger = hook({
      options: { debug: true },
      defaultLogger: vi.fn(),
    });

    logger("create", { foo: "bar" });

    expect(loggerSpy).toHaveBeenCalledWith("[memory-adapter] create", {
      foo: "bar",
    });
    loggerSpy.mockRestore();
  });

  it("delegates to custom logger when provided", () => {
    const custom = vi.fn();
    const fallback = vi.fn();
    const hook = createDebugLoggerHook<{ debug?: { logger: typeof custom } }>(
      "prisma",
    );
    const logger = hook({
      options: { debug: { logger: custom } },
      defaultLogger: fallback,
    });

    logger("update", { id: "1" });
    expect(custom).toHaveBeenCalledWith("update", { id: "1" });
    expect(fallback).toHaveBeenCalledWith("update", { id: "1" });
  });

  it("returns default logger when debug disabled", () => {
    const fallback = vi.fn();
    const hook = createDebugLoggerHook<{ debug?: false }>("kysely");
    const logger = hook({
      options: {},
      defaultLogger: fallback,
    });

    logger("noop");
    expect(fallback).toHaveBeenCalledWith("noop");
  });
});
