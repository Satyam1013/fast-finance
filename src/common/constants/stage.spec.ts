import { buildStageTracker } from "./stage";

describe("buildStageTracker", () => {
  it("marks earlier steps completed, the current one current, later pending", () => {
    const t = buildStageTracker(4);
    expect(t.map((s) => s.status)).toEqual([
      "completed",
      "completed",
      "completed",
      "current",
      "pending",
      "pending",
      "pending",
    ]);
    expect(t).toHaveLength(7);
  });

  it("marks the final stage completed when not rejected", () => {
    const t = buildStageTracker(7);
    expect(t[6].status).toBe("completed");
  });

  it("freezes at the rejection stage as current", () => {
    const t = buildStageTracker(3, true);
    expect(t[2].status).toBe("current");
    expect(t[3].status).toBe("pending");
  });
});
