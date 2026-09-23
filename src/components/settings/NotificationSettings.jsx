import { useState, useEffect } from "react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { PRAYERS } from "../../constants/prayers";

import {
  loadNotificationSettings,
  saveNotificationSettings,
} from "../../lib/notificationSettings";

import {
  requestNotificationPermission,
  getPermissionState,
  schedulePrayerNotifications,
} from "../../lib/notificationService";

import { getItem } from "../../lib/db";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function NotificationSettings({
  masterEnabled = false,
  onPermissionGranted,
}) {
  const [settings, setSettings] = useState(null);
  const [permission, setPermission] = useState("default");
  const [showPerPrayer, setShowPerPrayer] = useState(false);
  const [loadingPermission, setLoadingPermission] = useState(true);

  // Load settings + notification permission
  useEffect(() => {
    async function loadSettings() {
      try {
        const [notificationSettings, permissionState] = await Promise.all([
          loadNotificationSettings(),
          getPermissionState(),
        ]);

        setSettings(notificationSettings);
        setPermission(permissionState);
      } catch (error) {
        console.error("Notification settings load error:", error);
      } finally {
        setLoadingPermission(false);
      }
    }

    loadSettings();
  }, []);

  const effectivePrayerNotifications =
    masterEnabled && settings?.prayerNotifications;

  const effectiveQazoReminders = masterEnabled && settings?.qazoReminders;

  const effectivePerPrayer = Object.fromEntries(
    Object.entries(settings?.perPrayer || {}).map(([key, value]) => [
      key,
      masterEnabled && value,
    ]),
  );
  const effectiveNotificationSound =
    masterEnabled && settings?.notificationSound;

  const effectiveVibration = masterEnabled && settings?.vibration;

  // Reschedule notifications after settings change
  async function reschedule() {
    try {
      const appSettings = await getItem("settings", "app_settings");

      const region = appSettings?.region;

      if (!region) {
        console.warn("Region not found. Notifications cannot be scheduled.");
        return;
      }

      await schedulePrayerNotifications(region);
    } catch (error) {
      console.error("Notification reschedule error:", error);
    }
  }

  // Update normal setting
  async function update(field, value) {
    if (!settings) return;

    const updated = {
      ...settings,
      [field]: value,
    };

    setSettings(updated);

    await saveNotificationSettings(updated);

    await reschedule();
  }

  // Update individual prayer
  async function updatePerPrayer(key, value) {
    if (!settings) return;

    const updated = {
      ...settings,
      perPrayer: {
        ...settings.perPrayer,
        [key]: value,
      },
    };

    setSettings(updated);

    await saveNotificationSettings(updated);

    await reschedule();
  }

  // Request notification permission
  async function handleEnable() {
    try {
      setLoadingPermission(true);

      const result = await requestNotificationPermission();

      setPermission(result);

      if (result === "granted") {
        await onPermissionGranted?.();
      }
    } catch (error) {
      console.error("Notification permission error:", error);
    } finally {
      setLoadingPermission(false);
    }
  }

  // Master notification toggle
  async function handlePrayerToggle(value) {
    if (!settings) return;

    // Turning OFF doesn't require permission
    if (!value) {
      await update("prayerNotifications", false);
      return;
    }

    // Verify/request permission before enabling
    try {
      setLoadingPermission(true);

      const currentPermission = await getPermissionState();

      if (currentPermission !== "granted") {
        const result = await requestNotificationPermission();

        setPermission(result);

        if (result !== "granted") {
          return;
        }
      } else {
        setPermission("granted");
      }

      const updated = {
        ...settings,
        prayerNotifications: true,
      };

      setSettings(updated);

      await saveNotificationSettings(updated);

      await reschedule();
    } catch (error) {
      console.error("Enable notification error:", error);
    } finally {
      setLoadingPermission(false);
    }
  }

  if (!settings || loadingPermission) {
    return (
      <Card>
        <div className="p-4 text-sm text-gray-500">
          Bildirishnoma sozlamalari yuklanmoqda...
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4 space-y-5">
        {/* Permission */}
        {permission !== "granted" && (
          <div className="rounded-xl border border-green-100 bg-green-50 p-4">
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-800">
                Bildirishnomalarga ruxsat kerak
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-600">
                Namoz va qazo vaqti kelganda telefoningizga bildirishnoma
                yuborish uchun ruxsat bering.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleEnable}
              disabled={loadingPermission}
            >
              {loadingPermission ? "Ruxsat so'ralmoqda..." : "Ruxsat berish"}
            </Button>

            {permission === "denied" && (
              <p className="mt-3 text-xs text-red-500">
                Bildirishnomalar bloklangan. Android sozlamalaridan ushbu
                ilovaga bildirishnomalarga ruxsat bering.
              </p>
            )}
          </div>
        )}

        {/* Main notification toggle */}
        {permission === "granted" && (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800">
                Namoz bildirishnomalari
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Namoz vaqti kelganda bildirishnoma yuborish
              </p>
            </div>

            <ToggleSwitch
              checked={effectivePrayerNotifications}
              onChange={handlePrayerToggle}
            />
          </div>
        )}

        {/* Individual prayers */}
        {permission === "granted" && effectivePrayerNotifications && (
          <div className="border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setShowPerPrayer((prev) => !prev)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Namozlar bo'yicha
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Qaysi namozlar uchun bildirishnoma kelishini tanlang
                </p>
              </div>

              <span className="text-gray-700">
                {showPerPrayer ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </span>
            </button>

            {showPerPrayer && (
              <div className="mt-4 space-y-3">
                {PRAYERS.map((prayer) => (
                  <div
                    key={prayer.key}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-700">{prayer.name}</span>

                    <ToggleSwitch
                      checked={effectivePerPrayer[prayer.key] ?? true}
                      onChange={(value) => updatePerPrayer(prayer.key, value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Qazo reminders */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800">
                Qazo eslatmalari
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Qazo rejangizni bajarish uchun eslatma
              </p>
            </div>

            <ToggleSwitch
              checked={effectiveQazoReminders}
              onChange={(value) => update("qazoReminders", value)}
            />
          </div>
        </div>

        {/* Sound */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800">Ovoz</p>

              <p className="mt-1 text-xs text-gray-500">
                Bildirishnoma ovoz bilan kelishi
              </p>
            </div>

            <ToggleSwitch
              checked={effectiveNotificationSound}
              onChange={(value) => update("notificationSound", value)}
            />
          </div>
        </div>

        {/* Vibration */}
        <div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800">Vibratsiya</p>

              <p className="mt-1 text-xs text-gray-500">
                Bildirishnoma kelganda telefon vibratsiyasi
              </p>
            </div>

            <ToggleSwitch
              checked={effectiveVibration}
              onChange={(value) => update("vibration", value)}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`
        relative h-5 w-10 shrink-0 rounded-full transition-colors
        ${checked ? "bg-green-500" : "bg-gray-300"}
      `}
    >
      <span
        className={`
          absolute left-0.5 top-0.5
          h-4 w-4 rounded-full bg-white shadow
          transition-transform duration-200
          ${checked ? "translate-x-5" : "translate-x-0"}
        `}
      />
    </button>
  );
}
