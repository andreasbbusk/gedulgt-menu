export type HandPose = "open" | "fist" | "unknown";

type Pt = { x: number; y: number };

const FINGERS = [
  { tip: 8, pip: 6, mcp: 5 },
  { tip: 12, pip: 10, mcp: 9 },
  { tip: 16, pip: 14, mcp: 13 },
  { tip: 20, pip: 18, mcp: 17 },
] as const;

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export function classifyPose(lm: Pt[]): HandPose {
  const wrist = lm[0];
  const middleMcp = lm[9];
  if (!wrist || !middleMcp) return "unknown";

  const palmSize = Math.max(dist(wrist, middleMcp), 0.001);
  let curled = 0;
  let extended = 0;

  for (const f of FINGERS) {
    const tip = lm[f.tip], pip = lm[f.pip], mcp = lm[f.mcp];
    if (!tip || !pip || !mcp) continue;
    const wristToTip = dist(wrist, tip);
    const wristToPip = dist(wrist, pip);
    if (wristToTip < wristToPip * 0.98 || dist(tip, mcp) < palmSize * 0.55) curled++;
    else if (wristToTip > wristToPip * 1.03 && dist(tip, mcp) > palmSize * 0.68) extended++;
  }

  if (extended >= 3) return "open";
  if (curled >= 3) return "fist";
  return "unknown";
}
