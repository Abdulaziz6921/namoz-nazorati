import NotificationActions from "../services/notificationActionsPlugin";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

import { getItem, putItem } from "./db";
import { getPrayerTimes } from "./prayerTimesService";
import { formatDate, todayKey } from "./dateUtils";
import { PRAYERS } from "../constants/prayers";

import { loadNotificationSettings } from "./notificationSettings";

import {
  loadQazoBalance,
  loadQazoPlan,
  recordQazoCompletion,
} from "./qazoService";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const SCHEDULE_KEY = "notification_schedule";

const NOTIFICATION_CHANNEL_ID = "prayer_notifications_v3";

const BANNER_CALLBACKS = new Set();

const PRAYER_NAMES = {
  bomdod: "Bomdod",
  peshin: "Peshin",
  asr: "Asr",
  shom: "Shom",
  xufton: "Xufton",
};

const PRAYER_EMOJI = {
  bomdod: "🌅",
  peshin: "☀️",
  asr: "🌤️",
  shom: "🌇",
  xufton: "🌙",
};

// Follow-up rules.
//
// Peshin is a fixed clock time.
// Other prayers are relative to their prayer time.
const FOLLOW_UP_MINUTES = {
  bomdod: 30,
  asr: 15,
  shom: 15,
  xufton: 25,
};

const PRAYER_COMPLETION_ACTION_TYPE = "PRAYER_COMPLETION";
const QAZO_COMPLETION_ACTION_TYPE = "QAZO_COMPLETION";

let nativeListenersInitialized = false;

// Browser fallback timers
const browserTimers = new Map();

// ─────────────────────────────────────────────
// Sync qazo state to native Android
// ─────────────────────────────────────────────

async function syncQazoStateToNative() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const plan = await loadQazoPlan();
    const balance = await loadQazoBalance();
    const settings = await loadNotificationSettings();
    const appSettings = await getItem("settings", "app_settings");

    const qazoState = {
      enabled: Boolean(appSettings?.notificationsEnabled),
      plan: plan?.planType || null,
      qazoReminders: Boolean(settings?.qazoReminders),
      sound: Boolean(settings?.notificationSound),
      remainingByPrayer: {
        bomdod: Number(balance?.byPrayer?.bomdod || 0),
        peshin: Number(balance?.byPrayer?.peshin || 0),
        asr: Number(balance?.byPrayer?.asr || 0),
        shom: Number(balance?.byPrayer?.shom || 0),
        xufton: Number(balance?.byPrayer?.xufton || 0),
      },
    };

    await NotificationActions.saveQazoState({
      qazoState: JSON.stringify(qazoState),
    });

    console.log("💾 Qazo state synced to native:", qazoState);
  } catch (error) {
    console.error("❌ Failed to sync qazo state to native:", error);
  }
}

// ─────────────────────────────────────────────
// Permission
// ─────────────────────────────────────────────

export async function requestNotificationPermission() {
  if (!Capacitor.isNativePlatform()) {
    if (!("Notification" in window)) {
      return "unsupported";
    }

    if (Notification.permission === "granted") {
      return "granted";
    }

    if (Notification.permission === "denied") {
      return "denied";
    }

    return await Notification.requestPermission();
  }

  try {
    const result = await LocalNotifications.requestPermissions();

    if (
      result.display === "prompt" ||
      result.display === "prompt-with-rationale"
    ) {
      return "default";
    }

    return result.display;
  } catch (error) {
    console.error("Notification permission request failed:", error);
    return "denied";
  }
}

export async function getPermissionState() {
  if (!Capacitor.isNativePlatform()) {
    if (!("Notification" in window)) {
      return "unsupported";
    }

    return Notification.permission;
  }

  try {
    const result = await LocalNotifications.checkPermissions();

    if (
      result.display === "prompt" ||
      result.display === "prompt-with-rationale"
    ) {
      return "default";
    }

    return result.display;
  } catch (error) {
    console.error("Notification permission check failed:", error);
    return "denied";
  }
}

// ─────────────────────────────────────────────
// Android notification channel
// ─────────────────────────────────────────────

async function setupNotificationChannel() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await LocalNotifications.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: "Namoz bildirishnomalari",
      description: "Namoz va qazo eslatmalari",
      importance: 5,
      visibility: 1,
      sound: "notification_sound",
      vibration: true,
    });
    await LocalNotifications.createChannel({
      id: "prayer_bomdod_time",
      name: "Bomdod vaqti",
      description: "Bomdod namoz vaqti bildirishnomasi",
      importance: 5,
      visibility: 1,
      sound: "bomdod_time",
      vibration: true,
    });

    await LocalNotifications.createChannel({
      id: "prayer_bomdod_followup",
      name: "Bomdod keyingi eslatma",
      description: "Bomdod keyingi eslatmasi",
      importance: 5,
      visibility: 1,
      sound: "bomdod_followup",
      vibration: true,
    });

    await LocalNotifications.createChannel({
      id: "prayer_peshin_time",
      name: "Peshin vaqti",
      description: "Peshin namoz vaqti bildirishnomasi",
      importance: 5,
      visibility: 1,
      sound: "peshin_time",
      vibration: true,
    });

    await LocalNotifications.createChannel({
      id: "prayer_peshin_followup",
      name: "Peshin keyingi eslatma",
      description: "Peshin keyingi eslatmasi",
      importance: 5,
      visibility: 1,
      sound: "peshin_followup",
      vibration: true,
    });

    await LocalNotifications.createChannel({
      id: "prayer_asr_time",
      name: "Asr vaqti",
      description: "Asr namoz vaqti bildirishnomasi",
      importance: 5,
      visibility: 1,
      sound: "asr_time",
      vibration: true,
    });

    await LocalNotifications.createChannel({
      id: "prayer_asr_followup",
      name: "Asr keyingi eslatma",
      description: "Asr keyingi eslatmasi",
      importance: 5,
      visibility: 1,
      sound: "asr_followup",
      vibration: true,
    });

    await LocalNotifications.createChannel({
      id: "prayer_shom_time",
      name: "Shom vaqti",
      description: "Shom namoz vaqti bildirishnomasi",
      importance: 5,
      visibility: 1,
      sound: "shom_time",
      vibration: true,
    });

    await LocalNotifications.createChannel({
      id: "prayer_shom_followup",
      name: "Shom keyingi eslatma",
      description: "Shom keyingi eslatmasi",
      importance: 5,
      visibility: 1,
      sound: "shom_followup",
      vibration: true,
    });

    await LocalNotifications.createChannel({
      id: "prayer_xufton_time",
      name: "Xufton vaqti",
      description: "Xufton namoz vaqti bildirishnomasi",
      importance: 5,
      visibility: 1,
      sound: "xufton_time",
      vibration: true,
    });

    await LocalNotifications.createChannel({
      id: "prayer_xufton_followup",
      name: "Xufton keyingi eslatma",
      description: "Xufton keyingi eslatmasi",
      importance: 5,
      visibility: 1,
      sound: "xufton_followup",
      vibration: true,
    });

    console.log("✅ Notification channel ready");
  } catch (error) {
    console.error("Notification channel setup failed:", error);
  }
}

// ─────────────────────────────────────────────
// Android notification action buttons
// ─────────────────────────────────────────────

async function setupNotificationActions() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: PRAYER_COMPLETION_ACTION_TYPE,
          actions: [
            {
              id: "completed",
              title: "Ha, o'qidim",
              foreground: false,
            },
            {
              id: "not_completed",
              title: "Yo'q",
              foreground: false,
              destructive: false,
            },
          ],
        },

        {
          id: QAZO_COMPLETION_ACTION_TYPE,
          actions: [
            {
              id: "completed",
              title: "Ha, o'qidim",
              foreground: false,
            },
            {
              id: "not_completed",
              title: "Yo'q",
              foreground: false,
              destructive: false,
            },
          ],
        },
      ],
    });

    console.log("✅ Notification actions ready");
  } catch (error) {
    console.error("Notification actions setup failed:", error);
  }
}

// ─────────────────────────────────────────────
// In-app banner system
// ─────────────────────────────────────────────

export function onNotificationBanner(callback) {
  BANNER_CALLBACKS.add(callback);

  return () => {
    BANNER_CALLBACKS.delete(callback);
  };
}

function showBanner(banner) {
  for (const callback of BANNER_CALLBACKS) {
    callback(banner);
  }
}

export function dismissBanner(id) {
  showBanner({
    type: "dismiss",
    id,
  });
}

// ─────────────────────────────────────────────
// Complete prayer from native notification
// ─────────────────────────────────────────────

async function completePrayerFromNotification(notification) {
  const extra = notification?.extra || {};

  const prayerKey = extra.prayerKey;
  const date = extra.date;

  if (!prayerKey || !date) {
    console.warn("Cannot complete prayer: missing prayerKey/date", extra);

    return;
  }

  const now = Date.now();

  const record = {
    id: `${date}_${prayerKey}`,
    date,
    prayer: prayerKey,
    completed: true,
    completedAt: now,
    createdAt: now,
  };

  await putItem("prayer_logs", record);

  console.log(`✅ ${PRAYER_NAMES[prayerKey] || prayerKey} marked as completed`);

  // Tell the currently-open app to refresh its prayer state.
  showBanner({
    type: "prayer-completed",
    id: `completed_${date}_${prayerKey}`,
    prayerKey,
    prayerName: PRAYER_NAMES[prayerKey],
    date,
  });

  // IMPORTANT:
  // Only daily_5 can trigger the qazo notification.
  //
  // This happens ONLY after the user presses
  // "Ha, o'qidim" for the current prayer.
  await scheduleDaily5QazoReminder(prayerKey, date);
}

// ─────────────────────────────────────────────
// Mark prayer as not completed
// ─────────────────────────────────────────────

async function markPrayerNotCompletedFromNotification(notification) {
  const extra = notification?.extra || {};

  const prayerKey = extra.prayerKey;
  const date = extra.date;

  if (!prayerKey || !date) {
    return;
  }

  const now = Date.now();

  const record = {
    id: `${date}_${prayerKey}`,
    date,
    prayer: prayerKey,
    completed: false,
    completedAt: null,
    createdAt: now,
  };

  await putItem("prayer_logs", record);

  console.log(`ℹ️ ${PRAYER_NAMES[prayerKey] || prayerKey} remains uncompleted`);

  showBanner({
    type: "prayer-not-completed",
    id: `not_completed_${date}_${prayerKey}`,
    prayerKey,
    prayerName: PRAYER_NAMES[prayerKey],
    date,
  });
}

// ─────────────────────────────────────────────
// Daily 5 qazo reminder
// ─────────────────────────────────────────────
//
// Flow:
//
// Prayer time
//     ↓
// "Bomdod vaqti bo'ldi"
//     ↓
// "Bomdod namozini o'qidingizmi?"
//     ↓
// User presses "Ha, o'qidim"
//     ↓
// Save normal prayer as completed
//     ↓
// Check qazo plan
//     ↓
// If daily_5 → check that prayer's qazo
//     ↓
// "Bomdod qazosini o'qidingizmi?"
// "5 rakat qazo rejangiz bo'yicha"
//     ↓
// "Ha, o'qidim"
//     ↓
// Bomdod qazo: 93 → 92
//
// "Yo'q"
//     ↓
// Nothing changes
//
// ─────────────────────────────────────────────

export async function scheduleDaily5QazoReminder(prayerKey, dateStr) {
  try {
    if (!prayerKey || !dateStr) {
      return;
    }

    // ─────────────────────────────────────────
    // Only daily_5 uses this automatic flow.
    // ─────────────────────────────────────────

    const plan = await loadQazoPlan();

    if (plan?.planType !== "daily_5") {
      console.log("ℹ️ Qazo notification skipped: plan is not daily_5");

      return;
    }

    // ─────────────────────────────────────────
    // Prevent duplicate native qazo notifications.
    //
    // If the native NotificationActionReceiver already
    // scheduled this qazo notification while the app
    // was closed, React must NOT schedule it again
    // when the app opens.
    // ─────────────────────────────────────────

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await NotificationActions.isQazoScheduled({
          date: dateStr,
          prayerKey,
        });

        if (result?.scheduled) {
          console.log(
            `⏭️ Qazo already scheduled natively: ${dateStr} / ${prayerKey}`,
          );

          return;
        }
      } catch (error) {
        console.error("❌ Failed to check native qazo schedule:", error);
      }
    }

    // ─────────────────────────────────────────
    // Load current qazo balance.
    // ─────────────────────────────────────────

    const balance = await loadQazoBalance();

    if (!balance?.qazoSetupCompleted) {
      console.log("ℹ️ Qazo notification skipped: qazo setup is incomplete");

      return;
    }

    // ─────────────────────────────────────────
    // Check only the qazo belonging to the
    // same prayer.
    // ─────────────────────────────────────────

    const remaining = Number(balance?.byPrayer?.[prayerKey] || 0);

    if (remaining <= 0) {
      console.log(
        `ℹ️ ${PRAYER_NAMES[prayerKey]} qazo = 0, notification skipped`,
      );

      return;
    }

    // ─────────────────────────────────────────
    // Notification settings
    // ─────────────────────────────────────────

    const settings = await loadNotificationSettings();

    const appSettings = await getItem("settings", "app_settings");

    if (!appSettings?.notificationsEnabled) {
      console.log("🔕 Qazo notification skipped: global notifications are OFF");

      return;
    }

    if (!settings.qazoReminders) {
      console.log("🔕 Qazo notification skipped: qazo reminders are OFF");

      return;
    }

    // ─────────────────────────────────────────
    // Capacitor / Android
    // ─────────────────────────────────────────

    if (Capacitor.isNativePlatform()) {
      const permission = await getPermissionState();

      if (permission !== "granted") {
        console.warn(
          "Qazo notification permission is not granted:",
          permission,
        );

        return;
      }

      await setupNotificationChannel();
      await setupNotificationActions();

      // Show qazo notification 1.5 seconds after
      // the prayer is marked as completed.
      const fireAt = new Date(Date.now() + 1500);

      const prayerIndex = PRAYERS.findIndex(
        (prayer) => prayer.key === prayerKey,
      );

      if (prayerIndex === -1) {
        console.error(`❌ Unknown prayer key: ${prayerKey}`);

        return;
      }

      // ───────────────────────────────────────
      // Safe Android 32-bit notification ID
      //
      // Example:
      // 2026-09-18 + Asr
      // → 2609182
      // → +80
      // → 2609262
      // ───────────────────────────────────────

      const dateShort = Number(dateStr.replaceAll("-", "").substring(2));

      const safeQazoId = dateShort * 10 + 80 + prayerIndex;

      await LocalNotifications.schedule({
        notifications: [
          {
            id: safeQazoId,

            title: `🤲 ${PRAYER_NAMES[prayerKey]} qazosini o'qidingizmi?`,

            body: `5 rakat qazo rejangiz bo'yicha (${remaining} ta qoldi)`,

            channelId: NOTIFICATION_CHANNEL_ID,

            actionTypeId: QAZO_COMPLETION_ACTION_TYPE,

            schedule: {
              at: fireAt,
              allowWhileIdle: true,
              exact: true,
            },

            sound: settings.notificationSound
              ? "notification_sound"
              : undefined,

            extra: {
              type: "qazo-follow-up",
              prayerKey,
              date: dateStr,
              fireAt: fireAt.toISOString(),
            },
          },
        ],
      });

      console.log(
        `✅ Daily_5 ${PRAYER_NAMES[prayerKey]} qazo notification scheduled with ID: ${safeQazoId}`,
      );

      return;
    }

    // ─────────────────────────────────────────
    // Browser fallback
    // ─────────────────────────────────────────

    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      const timerKey = `qazo_followup_${dateStr}_${prayerKey}`;

      const timerId = setTimeout(() => {
        showBrowserNotification(
          `🤲 ${PRAYER_NAMES[prayerKey]} qazosini o'qidingizmi?`,
          "5 rakat qazo rejangiz bo'yicha",
          timerKey,
          {
            type: "qazo-follow-up",
            prayerKey,
            date: dateStr,
          },
        );

        showBanner({
          type: "qazo",
          id: `qazo_${dateStr}_${prayerKey}_${Date.now()}`,
          prayerKey,
          date: dateStr,
        });
      }, 1000);

      browserTimers.set(timerKey, timerId);
    }
  } catch (error) {
    console.error("Failed to schedule daily_5 qazo reminder:", error);
  }
}

// ─────────────────────────────────────────────
// Complete qazo from notification
// ─────────────────────────────────────────────

export async function completeQazoFromNotification(notification) {
  const extra = notification?.extra || {};

  const prayerKey = extra.prayerKey;
  const date = extra.date;

  if (!prayerKey || !date) {
    console.warn("Cannot complete qazo: missing prayerKey/date", extra);

    return;
  }

  try {
    // Safety check: only daily_5 may complete through
    // this automatic notification flow.
    const plan = await loadQazoPlan();

    if (plan?.planType !== "daily_5") {
      console.log("ℹ️ Qazo completion skipped: plan is not daily_5");

      return;
    }

    const balance = await loadQazoBalance();

    if (!balance?.qazoSetupCompleted) {
      return;
    }

    const remaining = Number(balance?.byPrayer?.[prayerKey] || 0);

    // Never allow the counter to go below zero.
    if (remaining <= 0) {
      console.log(`ℹ️ ${PRAYER_NAMES[prayerKey]} qazo is already 0`);

      return;
    }

    // IMPORTANT:
    // Exactly ONE qazo is completed.
    //
    // Example:
    // Bomdod = 93
    // User presses "Ha, o'qidim"
    // Bomdod = 92
    //
    // We intentionally pass quantity = 1.
    await recordQazoCompletion(prayerKey, 1, date, balance);

    if (Capacitor.isNativePlatform()) {
      try {
        await NotificationActions.clearQazoScheduled({
          date,
          prayerKey,
        });
      } catch (error) {
        console.error("❌ Failed to clear native qazo schedule marker:", error);
      }
    }

    await syncQazoStateToNative();

    console.log(`✅ ${PRAYER_NAMES[prayerKey]} qazo completed: -1`);

    showBanner({
      type: "qazo-completed",
      id: `qazo_completed_${date}_${prayerKey}`,
      prayerKey,
      prayerName: PRAYER_NAMES[prayerKey],
      date,
    });
  } catch (error) {
    console.error("Failed to complete qazo from notification:", error);
  }
}

// ─────────────────────────────────────────────
// Native notification listeners
// ─────────────────────────────────────────────

// async function setupNativeNotificationListeners() {
//   if (!Capacitor.isNativePlatform()) {
//     return;
//   }

//   if (nativeListenersInitialized) {
//     return;
//   }

//   nativeListenersInitialized = true;

//   try {
//     // ⚠️ MUHIM CHORALARDAN BIRI: Ilova faol paytda kelgan xabarlarni tutish
//     await LocalNotifications.addListener(
//       "localNotificationReceived",
//       (notification) => {
//         // Agar foydalanuvchi ilovadan chiqib ketayotgan paytda tasodifan ishga tushsa,
//         // ichkarida banner chiqishini oldini olamiz
//         const extra = notification?.extra || {};
//         console.log(
//           "🔔 Local notification received in foreground:",
//           notification,
//         );

//         if (extra.type === "prayer-follow-up") {
//           showBanner({
//             type: "prayer",
//             id: `prayer_followup_${extra.date}_${extra.prayerKey}`,
//             prayerKey: extra.prayerKey,
//             prayerName: PRAYER_NAMES[extra.prayerKey] || extra.prayerKey,
//             date: extra.date,
//           });
//         }
//       },
//     );

//     // 🏆 ASOSIY TUZATISH SHU YERDA: Foydalanuvchi tugmani bosganda
//     await LocalNotifications.addListener(
//       "localNotificationActionPerformed",
//       async (event) => {
//         const actionId = event?.actionId;
//         const notification = event?.notification;
//         const extra = notification?.extra || {};

//         console.log("👆 Notification action:", actionId, notification);

//         // 1. NAMOS VAQTI ESALTMALARI
//         if (extra.type === "prayer-follow-up") {
//           if (actionId === "completed") {
//             try {
//               // Baza yangilanadi (ichidagi showBanner faqat ilova ochilgani uchun bazani yangilashga xizmat qiladi)
//               await completePrayerFromNotification(notification);
//             } catch (error) {
//               console.error("Failed to complete prayer:", error);
//             } finally {
//               // 🚀 Ilovani foydalanuvchiga ko'rsatmasdan darhol orqa fonga qaytaramiz (yopamiz)
//               if (Capacitor.isNativePlatform()) {
//                 await App.minimizeApp();
//               }
//             }
//           }

//           if (actionId === "not_completed") {
//             // "Yo'q" tugmasi bosilganda hech narsa qilmaymiz va ilovani darhol yopamiz
//             if (Capacitor.isNativePlatform()) {
//               await App.minimizeApp();
//             }
//           }
//         }

//         // 2. QAZO REJASI ESALTMALARI
//         if (extra.type === "qazo-follow-up") {
//           if (actionId === "completed") {
//             try {
//               // Qazo sonini 1 taga kamaytirish
//               await completeQazoFromNotification(notification);
//             } catch (error) {
//               console.error("Failed to complete qazo:", error);
//             } finally {
//               // Ilovani darhol orqa fonga qaytaramiz
//               if (Capacitor.isNativePlatform()) {
//                 await App.minimizeApp();
//               }
//             }
//           }

//           if (actionId === "not_completed") {
//             // Hech narsa o'zgarmaydi va ilova yopiladi
//             if (Capacitor.isNativePlatform()) {
//               await App.minimizeApp();
//             }
//           }
//         }
//       },
//     );

//     console.log("✅ Native notification listeners ready");
//   } catch (error) {
//     nativeListenersInitialized = false;
//     console.error("Notification listener setup failed:", error);
//   }
// }

async function setupNativeNotificationListeners() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  if (nativeListenersInitialized) {
    return;
  }

  nativeListenersInitialized = true;

  try {
    // Faqatgina ilova ochiq (foreground) paytda bildirishnoma kelsa banner ko'rsatish
    await LocalNotifications.addListener(
      "localNotificationReceived",
      (notification) => {
        const extra = notification?.extra || {};
        console.log("🔔 Local notification received:", notification);

        const fireAt = extra.fireAt ? new Date(extra.fireAt).getTime() : null;

        const now = Date.now();

        const bannerIsFresh =
          fireAt !== null &&
          Number.isFinite(fireAt) &&
          now - fireAt >= 0 &&
          now - fireAt <= 30 * 1000;

        if (!bannerIsFresh) {
          console.log("⏭️ Skipping stale notification banner:", {
            type: extra.type,
            prayerKey: extra.prayerKey,
            date: extra.date,
            fireAt: extra.fireAt,
          });

          return;
        }

        if (extra.type === "prayer-follow-up") {
          showBanner({
            type: "prayer",
            id: `prayer_followup_${extra.date}_${extra.prayerKey}`,
            prayerKey: extra.prayerKey,
            prayerName: PRAYER_NAMES[extra.prayerKey] || extra.prayerKey,
            date: extra.date,
          });
        }

        if (extra.type === "qazo-follow-up") {
          showBanner({
            type: "qazo",
            id: `qazo_${extra.date}_${extra.prayerKey}_${Date.now()}`,
            prayerKey: extra.prayerKey,
            date: extra.date,
          });
        }
      },
    );

    // 🚀 DIQQAT: localNotificationActionPerformed TINGLOVCHISI BUTUNLAY OLIB TASHLANDI!
    // Chunki tugma bosilganda harakatlar ilovani ochmasdan to'g'ri Java-ga boradi.

    console.log("✅ Native notification listeners ready");
  } catch (error) {
    nativeListenersInitialized = false;
    console.error("Notification listener setup failed:", error);
  }
}

// ─────────────────────────────────────────────
// Browser fallback
// ─────────────────────────────────────────────

function showBrowserNotification(title, body, tag, data = {}) {
  if (!("Notification" in window)) {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  try {
    const notification = new Notification(title, {
      body,
      tag,
      data,
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Ignore browser notification errors.
  }
}

// ─────────────────────────────────────────────
// Date helper
// ─────────────────────────────────────────────

function prayerTimeToDate(dateStr, timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);

  const date = new Date(`${dateStr}T00:00:00`);

  date.setHours(hours, minutes, 0, 0);

  return date;
}

// ─────────────────────────────────────────────
// Follow-up time
// ─────────────────────────────────────────────

function getFollowUpTime(prayerKey, dateStr, prayerTime) {
  // Peshin follow-up is ALWAYS 13:10.
  if (prayerKey === "peshin") {
    return prayerTimeToDate(dateStr, "13:10");
  }

  const minutes = FOLLOW_UP_MINUTES[prayerKey];

  if (!minutes) {
    return null;
  }

  return new Date(prayerTime.getTime() + minutes * 60 * 1000);
}

// ─────────────────────────────────────────────
// Notification IDs
// ─────────────────────────────────────────────

function getPrayerNotificationId(dateStr, prayerIndex) {
  // Masalan: "2026-09-14" -> 2609140 (Android sig'adigan toza ID)
  const dateShort = Number(dateStr.replaceAll("-", "").substring(2));
  return dateShort * 10 + prayerIndex;
}

function getPrayerFollowUpNotificationId(dateStr, prayerIndex) {
  const dateShort = Number(dateStr.replaceAll("-", "").substring(2));
  return dateShort * 10 + 50 + prayerIndex; // 50 qo'shish orqali unikal bo'ladi
}

function getQazoFollowUpNotificationId(dateStr, prayerIndex) {
  const dateShort = Number(dateStr.replaceAll("-", "").substring(2));
  return dateShort * 10 + 80 + prayerIndex; // 80 qo'shish orqali unikal bo'ladi
}

// ─────────────────────────────────────────────
// Clear scheduled notifications
// ─────────────────────────────────────────────

export async function clearAllScheduled() {
  // Clear browser timers.
  for (const timer of browserTimers.values()) {
    clearTimeout(timer);
  }

  browserTimers.clear();

  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const pending = await LocalNotifications.getPending();

    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((notification) => ({
          id: notification.id,
        })),
      });
    }

    console.log("🧹 Scheduled notifications cleared");
  } catch (error) {
    console.error("Failed to clear scheduled notifications:", error);
  }
}

// ─────────────────────────────────────────────
// Get pending notifications
// ─────────────────────────────────────────────

export async function getPendingNotifications() {
  if (!Capacitor.isNativePlatform()) {
    return [];
  }

  try {
    const result = await LocalNotifications.getPending();

    // console.log("📅 Pending notifications:", result.notifications);
    console.log(
      "📅 Pending notifications:",
      JSON.stringify(result.notifications, null, 2),
    );

    return result.notifications;
  } catch (error) {
    console.error("Failed to get pending notifications:", error);

    return [];
  }
}

// ─────────────────────────────────────────────
// Schedule prayer notifications
// ─────────────────────────────────────────────

export async function schedulePrayerNotifications(region) {
  const settings = await loadNotificationSettings();

  const appSettings = await getItem("settings", "app_settings");

  await syncQazoStateToNative();

  if (Capacitor.isNativePlatform()) {
    await setupNotificationChannel();
    await setupNotificationActions();
    await setupNativeNotificationListeners();
  }

  // Global master switch is OFF.
  if (!appSettings?.notificationsEnabled) {
    console.log("🔕 Global notification master is OFF");

    await clearAllScheduled();

    return [];
  }

  // Prayer notification preference is OFF.
  if (!settings.prayerNotifications) {
    console.log("🔕 Prayer notifications are OFF");

    await clearAllScheduled();

    return [];
  }

  // Check permission.
  const permission = await getPermissionState();

  if (permission !== "granted") {
    console.warn("Notifications are not permitted:", permission);

    return [];
  }

  // Remove previous schedule before creating
  // the new schedule.
  await clearAllScheduled();

  const today = todayKey();

  const tomorrow = formatDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

  const dates = [today, tomorrow];

  const now = Date.now();

  const scheduled = [];

  // ───────────────────────────────────────────
  // Browser
  // ───────────────────────────────────────────

  if (!Capacitor.isNativePlatform()) {
    for (const dateStr of dates) {
      let dayTimes;

      try {
        dayTimes = await getPrayerTimes(dateStr, region);
      } catch (error) {
        console.error(`Failed to get prayer times for ${dateStr}:`, error);

        continue;
      }

      if (!dayTimes?.times) {
        continue;
      }

      for (const prayer of PRAYERS) {
        if (!settings.perPrayer?.[prayer.key]) {
          continue;
        }

        const timeStr = dayTimes.times[prayer.key];

        if (!timeStr) {
          continue;
        }

        const fireAt = prayerTimeToDate(dateStr, timeStr);

        // ─────────────────────────────────────
        // Prayer-time notification
        // ─────────────────────────────────────

        if (fireAt.getTime() > now) {
          const delay = fireAt.getTime() - now;

          const timerId = setTimeout(() => {
            showBrowserNotification(
              `${PRAYER_EMOJI[prayer.key]} ${PRAYER_NAMES[prayer.key]} vaqti bo'ldi`,

              `«Namoz mo‘minlarga vaqtida farz qilingandir»`,

              `prayer_start_${dateStr}_${prayer.key}`,

              {
                type: "prayer-start",
                prayerKey: prayer.key,
                date: dateStr,
              },
            );
          }, delay);

          browserTimers.set(`start_${dateStr}_${prayer.key}`, timerId);

          scheduled.push({
            type: "prayer-start",
            prayerKey: prayer.key,
            date: dateStr,
            fireAt,
          });
        }

        // ─────────────────────────────────────
        // Prayer completion follow-up
        // ─────────────────────────────────────

        const followUpAt = getFollowUpTime(prayer.key, dateStr, fireAt);

        if (followUpAt && followUpAt.getTime() > now) {
          const followUpDelay = followUpAt.getTime() - now;

          const timerId = setTimeout(() => {
            showBrowserNotification(
              `🕌 ${PRAYER_NAMES[prayer.key]} namozini o'qidingizmi?`,

              `prayer_followup_${dateStr}_${prayer.key}`,

              {
                type: "prayer-follow-up",
                prayerKey: prayer.key,
                date: dateStr,
              },
            );

            showBanner({
              type: "prayer",
              id: `prayer_followup_${dateStr}_${prayer.key}`,
              prayerKey: prayer.key,
              prayerName: PRAYER_NAMES[prayer.key],
              date: dateStr,
            });
          }, followUpDelay);

          browserTimers.set(`followup_${dateStr}_${prayer.key}`, timerId);

          scheduled.push({
            type: "prayer-follow-up",
            prayerKey: prayer.key,
            date: dateStr,
            fireAt: followUpAt,
          });
        }
      }
    }

    await putItem("settings", {
      key: SCHEDULE_KEY,
      scheduledAt: Date.now(),
      region,
      items: scheduled.map((item) => ({
        type: item.type,
        prayerKey: item.prayerKey,
        date: item.date,
        fireAt: item.fireAt.toISOString(),
      })),
    });

    return scheduled;
  }

  // ───────────────────────────────────────────
  // Capacitor Android / iOS
  // ───────────────────────────────────────────

  const notifications = [];

  for (const dateStr of dates) {
    let dayTimes;

    try {
      dayTimes = await getPrayerTimes(dateStr, region);
    } catch (error) {
      console.error(`Failed to get prayer times for ${dateStr}:`, error);

      continue;
    }

    if (!dayTimes?.times) {
      continue;
    }

    for (let index = 0; index < PRAYERS.length; index++) {
      const prayer = PRAYERS[index];

      if (!settings.perPrayer?.[prayer.key]) {
        continue;
      }

      const timeStr = dayTimes.times[prayer.key];

      if (!timeStr) {
        continue;
      }

      const fireAt = prayerTimeToDate(dateStr, timeStr);

      // ─────────────────────────────────────
      // 1. Prayer-time notification
      // ─────────────────────────────────────

      if (fireAt.getTime() > now) {
        notifications.push({
          id: getPrayerNotificationId(dateStr, index),

          title: `${PRAYER_EMOJI[prayer.key]} ${PRAYER_NAMES[prayer.key]} vaqti bo'ldi`,

          body: "«Namoz mo‘minlarga vaqtida farz qilingandir»",

          channelId: `prayer_${prayer.key}_time`,

          schedule: {
            at: fireAt,
            allowWhileIdle: true,
            exact: true,
          },

          sound: settings.notificationSound ? `${prayer.key}_time` : undefined,

          extra: {
            type: "prayer-start",
            prayerKey: prayer.key,
            date: dateStr,
          },
        });

        scheduled.push({
          type: "prayer-start",
          prayerKey: prayer.key,
          date: dateStr,
          fireAt,
        });
      }

      // ─────────────────────────────────────
      // 2. Prayer completion follow-up
      // ─────────────────────────────────────

      const followUpAt = getFollowUpTime(prayer.key, dateStr, fireAt);

      if (followUpAt && followUpAt.getTime() > now) {
        notifications.push({
          id: getPrayerFollowUpNotificationId(dateStr, index),

          title: `🕌 ${PRAYER_NAMES[prayer.key]} namozini o'qidingizmi?`,

          channelId: `prayer_${prayer.key}_followup`,

          actionTypeId: PRAYER_COMPLETION_ACTION_TYPE,

          schedule: {
            at: followUpAt,
            allowWhileIdle: true,
            exact: true,
          },

          sound: settings.notificationSound
            ? `${prayer.key}_followup`
            : undefined,

          extra: {
            type: "prayer-follow-up",
            prayerKey: prayer.key,
            date: dateStr,
            fireAt: followUpAt.toISOString(),
          },
        });

        scheduled.push({
          type: "prayer-follow-up",
          prayerKey: prayer.key,
          date: dateStr,
          fireAt: followUpAt,
        });
      }
    }
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({
      notifications,
    });

    console.log(`✅ ${notifications.length} notification(s) scheduled`);
  }

  await putItem("settings", {
    key: SCHEDULE_KEY,
    scheduledAt: Date.now(),
    region,

    items: scheduled.map((item) => ({
      type: item.type,
      prayerKey: item.prayerKey,
      date: item.date,
      fireAt: item.fireAt.toISOString(),
    })),
  });

  const pending = await getPendingNotifications();

  console.log(`📅 ${pending.length} notification(s) currently pending`);

  return scheduled;
}

// ─────────────────────────────────────────────
// Initialize notification system
// ─────────────────────────────────────────────

export async function initNotificationSystem(region) {
  const settings = await loadNotificationSettings();
  const appSettings = await getItem("settings", "app_settings");

  await syncQazoStateToNative();

  if (Capacitor.isNativePlatform()) {
    await setupNotificationChannel();
    await setupNotificationActions();
    await setupNativeNotificationListeners();
  }

  if (!appSettings?.notificationsEnabled) {
    console.log("🔕 Global notification master is OFF");
    return;
  }

  if (!settings.prayerNotifications) {
    return;
  }

  let permission = await getPermissionState();

  if (permission !== "granted") {
    return;
  }

  await schedulePrayerNotifications(region);
}

export async function scheduleQazoReminder(prayerKey, dateStr) {
  return scheduleDaily5QazoReminder(prayerKey, dateStr);
}
