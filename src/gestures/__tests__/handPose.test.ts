import { describe, expect, it } from "vitest";
import { classifyPose } from "../handPose";

type Pt = { x: number; y: number };

const FINGERS = [
  { tip: 8, pip: 6, mcp: 5, x: -0.3 },
  { tip: 12, pip: 10, mcp: 9, x: -0.1 },
  { tip: 16, pip: 14, mcp: 13, x: 0.1 },
  { tip: 20, pip: 18, mcp: 17, x: 0.3 },
] as const;

type FingerState = "open" | "curled" | "neutral";

function landmarks() {
  return Array.from({ length: 21 }, () => ({ x: 0, y: 0 }));
}

function setFinger(
  lm: Pt[],
  finger: (typeof FINGERS)[number],
  state: FingerState,
) {
  const shapes: Record<FingerState, { mcp: number; pip: number; tip: number }> =
    {
      open: { mcp: 1, pip: 1.35, tip: 1.82 },
      curled: { mcp: 1, pip: 1.2, tip: 0.86 },
      neutral: { mcp: 1, pip: 1.55, tip: 1.58 },
    };
  const shape = shapes[state];

  lm[finger.mcp] = { x: finger.x, y: shape.mcp };
  lm[finger.pip] = { x: finger.x, y: shape.pip };
  lm[finger.tip] = { x: finger.x, y: shape.tip };
}

function makeHand(fingerStates: FingerState[]) {
  const lm = landmarks();
  lm[0] = { x: 0, y: 0 };
  lm[9] = { x: -0.1, y: 1 };

  FINGERS.forEach((finger, index) => {
    setFinger(lm, finger, fingerStates[index] ?? "neutral");
  });

  return lm;
}

describe("classifyPose", () => {
  it("returns unknown when landmarks array is empty", () => {
    expect(classifyPose([])).toBe("unknown");
  });

  it("returns unknown when wrist (lm[0]) is missing", () => {
    const lm = [] as Pt[];
    lm[9] = { x: 0, y: 1 };

    expect(classifyPose(lm)).toBe("unknown");
  });

  it("returns unknown when middleMcp (lm[9]) is missing", () => {
    expect(classifyPose([{ x: 0, y: 0 }])).toBe("unknown");
  });

  it("returns open when 3+ fingers are extended", () => {
    expect(classifyPose(makeHand(["open", "open", "open", "open"]))).toBe(
      "open",
    );
  });

  it("returns open when exactly 3 fingers are extended", () => {
    expect(classifyPose(makeHand(["open", "open", "open", "neutral"]))).toBe(
      "open",
    );
  });

  it("returns fist when 3+ fingers are curled", () => {
    expect(
      classifyPose(makeHand(["curled", "curled", "curled", "curled"])),
    ).toBe("fist");
  });

  it("returns fist when exactly 3 fingers are curled", () => {
    expect(
      classifyPose(makeHand(["curled", "curled", "curled", "neutral"])),
    ).toBe("fist");
  });

  it("returns unknown when 2 extended, 2 curled", () => {
    expect(classifyPose(makeHand(["open", "open", "curled", "curled"]))).toBe(
      "unknown",
    );
  });

  it("returns unknown when palmSize would be 0", () => {
    const lm = makeHand(["open", "open", "open", "open"]);
    lm[9] = { x: 0, y: 0 };

    expect(classifyPose(lm)).toBe("unknown");
  });
});
