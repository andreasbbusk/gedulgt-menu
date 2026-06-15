import { describe, expect, it } from "vitest";
import { classifyPose } from "./handPose";

type Pt = { x: number; y: number };

const FINGERS = [
  { tip: 8, pip: 6, mcp: 5, x: -0.3 },
  { tip: 12, pip: 10, mcp: 9, x: -0.1 },
  { tip: 16, pip: 14, mcp: 13, x: 0.1 },
  { tip: 20, pip: 18, mcp: 17, x: 0.3 },
] as const;

function landmarks() {
  return Array.from({ length: 21 }, () => ({ x: 0, y: 0 }));
}

function setFinger(
  lm: Pt[],
  finger: (typeof FINGERS)[number],
  points: { mcp: number; pip: number; tip: number },
) {
  lm[finger.mcp] = { x: finger.x, y: points.mcp };
  lm[finger.pip] = { x: finger.x, y: points.pip };
  lm[finger.tip] = { x: finger.x, y: points.tip };
}

function makeOpenHand() {
  const lm = landmarks();
  lm[0] = { x: 0, y: 0 };
  lm[9] = { x: -0.1, y: 1 };

  FINGERS.forEach((finger) => {
    setFinger(lm, finger, { mcp: 1, pip: 1.35, tip: 1.82 });
  });

  return lm;
}

function makeFist() {
  const lm = landmarks();
  lm[0] = { x: 0, y: 0 };
  lm[9] = { x: -0.1, y: 1 };

  FINGERS.forEach((finger) => {
    setFinger(lm, finger, { mcp: 1, pip: 1.2, tip: 0.86 });
  });

  return lm;
}

describe("classifyPose", () => {
  it("returns unknown when wrist or middle MCP landmarks are missing", () => {
    expect(classifyPose([])).toBe("unknown");
    expect(classifyPose([{ x: 0, y: 0 }])).toBe("unknown");
  });

  it("classifies an open hand when at least three fingers are extended", () => {
    expect(classifyPose(makeOpenHand())).toBe("open");
  });

  it("classifies a fist when at least three fingers are curled", () => {
    expect(classifyPose(makeFist())).toBe("fist");
  });

  it("returns unknown for mixed finger evidence", () => {
    const lm = landmarks();
    lm[0] = { x: 0, y: 0 };
    lm[9] = { x: -0.1, y: 1 };

    setFinger(lm, FINGERS[0], { mcp: 1, pip: 1.35, tip: 1.82 });
    setFinger(lm, FINGERS[1], { mcp: 1, pip: 1.35, tip: 1.82 });
    setFinger(lm, FINGERS[2], { mcp: 1, pip: 1.2, tip: 0.86 });
    setFinger(lm, FINGERS[3], { mcp: 1, pip: 1.2, tip: 0.86 });

    expect(classifyPose(lm)).toBe("unknown");
  });
});
