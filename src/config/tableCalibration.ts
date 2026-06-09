export type ScreenPoint = {
  x: number;
  y: number;
};

export type NormalizedBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type TableCalibration = {
  projectionBounds: NormalizedBounds;
};

export const TABLE_CALIBRATION: TableCalibration = {
  projectionBounds: {
    minX: 0.1,
    minY: 0.1,
    maxX: 0.9,
    maxY: 0.9,
  },
};

export function getViewportSize() {
  return {
    width: Math.max(window.innerWidth, 1),
    height: Math.max(window.innerHeight, 1),
  };
}

export function normalizePoint(point: ScreenPoint) {
  const viewport = getViewportSize();

  return {
    x: point.x / viewport.width,
    y: point.y / viewport.height,
  };
}

export function isPointInsideProjectionBounds(
  point: ScreenPoint,
  calibration = TABLE_CALIBRATION,
) {
  const normalizedPoint = normalizePoint(point);
  const bounds = calibration.projectionBounds;

  return (
    normalizedPoint.x >= bounds.minX &&
    normalizedPoint.x <= bounds.maxX &&
    normalizedPoint.y >= bounds.minY &&
    normalizedPoint.y <= bounds.maxY
  );
}

export function projectPointToTable(
  point: ScreenPoint,
  calibration = TABLE_CALIBRATION,
) {
  if (!isPointInsideProjectionBounds(point, calibration)) {
    return null;
  }

  const viewport = getViewportSize();
  const normalizedPoint = normalizePoint(point);
  const bounds = calibration.projectionBounds;
  const frameWidth = Math.max(bounds.maxX - bounds.minX, 0.01);
  const frameHeight = Math.max(bounds.maxY - bounds.minY, 0.01);

  return {
    x: ((normalizedPoint.x - bounds.minX) / frameWidth) * viewport.width,
    y: ((normalizedPoint.y - bounds.minY) / frameHeight) * viewport.height,
  };
}
