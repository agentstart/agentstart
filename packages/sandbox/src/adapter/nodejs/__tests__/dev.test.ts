import { describe, expect, it } from "vitest";

import { Dev } from "../dev";

describe("Dev", () => {
  it("starts a command and reports running status", async () => {
    const dev = new Dev();
    const status = await dev.startDev({
      command: 'node -e "setTimeout(()=>{}, 10)"',
    });

    expect(status.id).toBeDefined();
    expect(status.command).toBe('node -e "setTimeout(()=>{}, 10)"');

    const result = await dev.stopDev({ id: status.id });
    expect(result.id).toBe(status.id);
  });

  it("captures stdout when the command exits", async () => {
    const dev = new Dev();
    const status = await dev.startDev({
      command: "node -e \"process.stdout.write('hello')\"",
    });

    const result = await dev.stopDev({ id: status.id });
    expect(result.stdout).toContain("hello");
  });

  it("rejects duplicate command identifiers", async () => {
    const dev = new Dev();
    await dev.startDev({
      id: "duplicate",
      command: 'node -e "setTimeout(()=>{}, 10)"',
    });

    await expect(
      dev.startDev({
        id: "duplicate",
        command: 'node -e "setTimeout(()=>{}, 10)"',
      }),
    ).rejects.toThrow("Command 'duplicate' is already running");

    await dev.stopDev({ id: "duplicate" });
  });
});
