import { loadData, saveData, STORAGE_KEYS } from "@/lib/storage";
import type { WarriorCalibration } from "@/lib/calibration";

type CalibrationMap = Record<string, WarriorCalibration>;

function loadMap(): CalibrationMap {
  return loadData<CalibrationMap>(STORAGE_KEYS.calibration, {});
}

function saveMap(map: CalibrationMap): void {
  saveData(STORAGE_KEYS.calibration, map);
}

export function saveCalibration(
  fighterId: string,
  calibration: WarriorCalibration,
): void {
  const map = loadMap();
  map[fighterId] = calibration;
  saveMap(map);
}

export function getCalibration(fighterId: string): WarriorCalibration | null {
  return loadMap()[fighterId] ?? null;
}

export function isCalibrated(fighterId: string): boolean {
  return getCalibration(fighterId)?.verifiedFighter === true;
}
