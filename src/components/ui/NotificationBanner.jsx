import { useState, useEffect, useCallback } from "react";

import {
  onNotificationBanner,
  dismissBanner,
  scheduleDaily5QazoReminder,
} from "../../lib/notificationService";

import { putItem } from "../../lib/db";
import { todayKey } from "../../lib/dateUtils";
import { Check, Clock3, Star, X } from "lucide-react";

/**
 * Global notification banner — renders in-app actionable notifications.
 *
 * Shows two types:
 *   - prayer: "X namozini o'qidingizmi?" with Ha / Yo'q buttons
 *   - qazo: qazo completion reminder
 *
 * When user answers "Ha" on a prayer banner:
 *   - Marks prayer as completed in prayer_logs
 *   - If qazo plan is daily_5 and this prayer has qazo remaining,
 *     immediately schedules the corresponding qazo notification.
 *
 * When user answers "Yo'q":
 *   - Prayer stays uncompleted.
 *   - No automatic qazo notification is triggered.
 */
export default function NotificationBanner({
  onPrayerCompleted,
  onQazoReminder,
}) {
  const [banners, setBanners] = useState([]);

  const unregister = useCallback(
    onNotificationBanner((banner) => {
      if (banner.type === "dismiss") {
        setBanners((prev) => prev.filter((b) => b.id !== banner.id));
        return;
      }

      setBanners((prev) => {
        // Avoid duplicates
        if (prev.some((b) => b.id === banner.id)) {
          return prev;
        }

        return [...prev, banner];
      });
    }),
    [],
  );

  useEffect(() => {
    return () => unregister();
  }, [unregister]);

  // ─────────────────────────────────────────────
  // Current prayer → Ha
  // ─────────────────────────────────────────────

  async function handleHa(banner) {
    if (banner.type === "prayer") {
      const date = banner.date || todayKey();

      const record = {
        id: `${date}_${banner.prayerKey}`,
        date,
        prayer: banner.prayerKey,
        completed: true,
        completedAt: Date.now(),
        createdAt: Date.now(),
      };

      await putItem("prayer_logs", record);

      // Refresh the prayer UI if the parent provides a callback.
      if (onPrayerCompleted) {
        onPrayerCompleted(banner.prayerKey, date);
      }

      // IMPORTANT:
      // After successfully completing the current prayer,
      // check whether the user has the daily_5 qazo plan.
      //
      // scheduleDaily5QazoReminder() itself checks:
      //   - planType === "daily_5"
      //   - qazo setup is completed
      //   - this prayer has remaining qazo
      //
      // If any condition fails, nothing is scheduled.
      await scheduleDaily5QazoReminder(banner.prayerKey, date);
    }

    dismissBanner(banner.id);
  }

  // ─────────────────────────────────────────────
  // Current prayer → Yo'q
  // ─────────────────────────────────────────────

  async function handleYoq(banner) {
    // Do NOT schedule qazo here.
    //
    // The prayer remains uncompleted and the existing
    // missed-prayer/qazo logic can handle it later.
    dismissBanner(banner.id);
  }

  // ─────────────────────────────────────────────
  // Qazo banner → O'qidim
  // ─────────────────────────────────────────────

  async function handleQazoDone(banner) {
    if (onQazoReminder) {
      onQazoReminder(banner.prayerKey, banner.date || todayKey());
    }

    dismissBanner(banner.id);
  }

  // ─────────────────────────────────────────────
  // Qazo banner → Keyinroq
  // ─────────────────────────────────────────────

  function handleQazoLater(banner) {
    dismissBanner(banner.id);
  }

  if (banners.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[70] flex flex-col items-center px-4 pt-3 pointer-events-none">
      <div className="w-full max-w-md space-y-2 pointer-events-auto">
        {banners.map((banner) => (
          <div
            key={banner.id}
            className="bg-cream-50 rounded-2xl shadow-[0_8px_32px_rgba(23,61,42,0.2)] border border-green-100 overflow-hidden animate-slide-down"
          >
            {banner.type === "prayer" ? (
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center shrink-0">
                    <Clock3
                      size={20}
                      strokeWidth={1.8}
                      className="text-[#FBF8F1]"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-green-800 text-sm tracking-tight">
                      {banner.prayerName} vaqti
                    </p>

                    <p className="text-green-500 text-xs mt-0.5">
                      {banner.prayerName} namozini o'qidingizmi?
                    </p>
                  </div>

                  <button
                    onClick={() => dismissBanner(banner.id)}
                    className="w-7 h-7 rounded-lg bg-cream-100 text-green-400 flex items-center justify-center hover:bg-cream-200 transition-colors shrink-0"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleHa(banner)}
                    className="flex-1 bg-green-600 text-cream-50 font-semibold text-sm py-2.5 rounded-xl hover:bg-green-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Check size={16} strokeWidth={2.5} />
                    Ha
                  </button>

                  <button
                    onClick={() => handleYoq(banner)}
                    className="flex-1 bg-cream-100 text-green-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-cream-200 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    <X size={16} strokeWidth={2.5} />
                    Yo'q
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-300 to-gold-500 flex items-center justify-center shrink-0">
                    <Star
                      size={20}
                      strokeWidth={1.8}
                      className="text-[#1F5238]"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-green-800 text-sm tracking-tight">
                      Qazo eslatmasi
                    </p>

                    <p className="text-green-500 text-xs mt-0.5">
                      Bugungi qazo rejangizdan bittasini ado etasizmi?
                    </p>
                  </div>

                  <button
                    onClick={() => dismissBanner(banner.id)}
                    className="w-7 h-7 rounded-lg bg-cream-100 text-green-400 flex items-center justify-center hover:bg-cream-200 transition-colors shrink-0"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleQazoDone(banner)}
                    className="flex-1 bg-green-600 text-cream-50 font-semibold text-sm py-2.5 rounded-xl hover:bg-green-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Check size={16} strokeWidth={2.5} />
                    O'qidim
                  </button>

                  <button
                    onClick={() => handleQazoLater(banner)}
                    className="flex-1 bg-cream-100 text-green-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-cream-200 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Clock3 size={16} strokeWidth={2.5} />
                    Keyinroq
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
