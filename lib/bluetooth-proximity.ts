/**
 * Web Bluetooth proximity check for gym fixation.
 * Graceful fallback when API unavailable (iOS Safari, HTTP, denied permission).
 */

export type BluetoothScanResult =
  | { available: true; trainerId: string; proof: string }
  | { available: false; reason: string };

const BEACON_PREFIX = "WP-TRAINER-";

export function isBluetoothApiAvailable(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

function parseTrainerBeacon(name: string): string | null {
  if (!name.startsWith(BEACON_PREFIX)) return null;
  const id = name.slice(BEACON_PREFIX.length).trim();
  return id.length > 0 ? id : null;
}

/**
 * Scan for a trainer BLE beacon named `WP-TRAINER-{trainerId}`.
 * Requires user gesture + HTTPS. Returns unavailable on unsupported platforms.
 */
export async function scanTrainerBeacon(
  expectedTrainerId: string,
): Promise<BluetoothScanResult> {
  if (!isBluetoothApiAvailable()) {
    return {
      available: false,
      reason: "Bluetooth недоступен. Используй QR или код тренера.",
    };
  }

  try {
    const nav = navigator as Navigator & {
      bluetooth: {
        requestDevice: (opts: {
          filters: { namePrefix: string }[];
          optionalServices: string[];
        }) => Promise<{ name?: string; id: string }>;
      };
    };

    const device = await nav.bluetooth.requestDevice({
      filters: [{ namePrefix: BEACON_PREFIX }],
      optionalServices: ["battery_service"],
    });

    const trainerId = device.name ? parseTrainerBeacon(device.name) : null;
    if (!trainerId) {
      return { available: false, reason: "Маяк тренера не распознан." };
    }
    if (trainerId !== expectedTrainerId) {
      return { available: false, reason: "Рядом другой тренер. Подойди к своему." };
    }

    return {
      available: true,
      trainerId,
      proof: `ble:${device.id}:${Date.now()}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bluetooth отменён";
    if (message.toLowerCase().includes("cancel")) {
      return { available: false, reason: "Сканирование отменено." };
    }
    return {
      available: false,
      reason: "Bluetooth недоступен. Используй QR или код тренера.",
    };
  }
}
