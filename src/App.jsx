import { useEffect, useState, useCallback } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import NotificationActions from "./services/notificationActionsPlugin";

import AppLayout from "./components/layout/AppLayout";
import BottomNav from "./components/layout/BottomNav";
import NotificationBanner from "./components/ui/NotificationBanner";

import AsosiyPage from "./pages/AsosiyPage";
import KalendarPage from "./pages/KalendarPage";
import StatistikaPage from "./pages/StatistikaPage";
import SozlamalarPage from "./pages/SozlamalarPage";
import OnboardingPage from "./pages/OnboardingPage";

import QazoResultScreen from "./components/qazo/QazoResultScreen";
import QazoPlanScreen from "./components/qazo/QazoPlanScreen";
import Spinner from "./components/ui/Spinner";

import { isOnboardingCompleted, loadProfile } from "./lib/profileService";

import {
  calculateQadaEstimate,
  initializeQazoBalance,
  loadQazoBalance,
  confirmQazoBalance,
  isQazoPlanSetupCompleted,
  recordQazoCompletion,
} from "./lib/qazoService";

import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

import { getItem, putItem } from "./lib/db";
import { getStoredRegion } from "./lib/prayerTimesService";
import { DEFAULT_REGION } from "./constants/regions";

import {
  initNotificationSystem,
  scheduleQazoReminder,
  getPendingNotifications,
  completeQazoFromNotification,
} from "./lib/notificationService";

import { checkAndProcessMissedPrayers } from "./lib/missedPrayerService";

function QazoResultSettingsRoute() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const balance = await loadQazoBalance();

        if (!balance) {
          setResult(null);
          return;
        }

        setResult({
          byPrayer: {
            ...(balance.byPrayer || {}),
          },
          total: balance.total || 0,
          isEstimate: balance.isEstimate ?? false,
          startDate: balance.startDate ? new Date(balance.startDate) : null,
          endDate: balance.endDate ? new Date(balance.endDate) : null,
        });
      } catch (error) {
        console.error("Qazo hisobini yuklashda xatolik:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function handleContinue(adjustedBalance) {
    try {
      const existing = await loadQazoBalance();

      if (!existing) {
        console.error("Qazo balansi topilmadi");
        return;
      }

      await confirmQazoBalance(adjustedBalance.byPrayer, existing);

      window.location.hash = "#/sozlamalar";
    } catch (error) {
      console.error("Qazo hisobini saqlashda xatolik:", error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <Spinner size={48} />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-green-700 font-semibold">Qazo hisobi topilmadi</p>

          <button
            type="button"
            onClick={() => {
              window.location.hash = "#/sozlamalar";
            }}
            className="mt-4 text-sm text-green-600"
          >
            Sozlamalarga qaytish
          </button>
        </div>
      </div>
    );
  }

  return <QazoResultScreen result={result} onContinue={handleContinue} />;
}

function App() {
  const [checking, setChecking] = useState(true);
  const [onboarded, setOnboarded] = useState(false);

  const [showInitialQazoResult, setShowInitialQazoResult] = useState(false);

  const [showInitialQazoPlan, setShowInitialQazoPlan] = useState(false);

  const [qazoResult, setQazoResult] = useState(null);

  /*
   * ---------------------------------------------------------
   * ONBOARDING
   * ---------------------------------------------------------
   */

  async function handleOnboardingComplete() {
    const profile = await loadProfile();

    // Initialize/update app settings after onboarding
    const existingSettings = await getItem("settings", "app_settings");

    const updatedSettings = {
      ...(existingSettings || {}),
      key: "app_settings",
      notificationsEnabled: existingSettings?.notificationsEnabled ?? false,
      qazoCalculationMethod:
        existingSettings?.qazoCalculationMethod ?? "hanafi",
      language: existingSettings?.language ?? "uz",
      region: existingSettings?.region ?? DEFAULT_REGION,
    };

    await putItem("settings", updatedSettings);

    console.log("✅ App settings initialized:", updatedSettings);

    if (profile) {
      await initializeQazoBalance(profile);

      const result = calculateQadaEstimate(profile);

      const qazoTotal = Object.values(result.byPrayer || {}).reduce(
        (sum, value) => sum + (Number(value) || 0),
        0,
      );

      if (qazoTotal > 0) {
        setQazoResult(result);
        setShowInitialQazoResult(true);
      } else {
        // No qazo to complete.
        // Mark qazo setup as completed so it won't appear again after refresh.
        const balance = await loadQazoBalance();

        if (balance) {
          await confirmQazoBalance(balance.byPrayer || {}, balance);
        }
      }

      setOnboarded(true);
    } else {
      setOnboarded(true);
    }
  }

  /*
   * ---------------------------------------------------------
   * INITIAL QAZO RESULT
   * ---------------------------------------------------------
   */

  async function handleInitialQazoContinue(adjustedBalance) {
    const existing = await loadQazoBalance();

    const confirmedBalance = await confirmQazoBalance(
      adjustedBalance.byPrayer,
      existing,
    );

    const qazoTotal = Object.values(confirmedBalance.byPrayer || {}).reduce(
      (sum, value) => sum + (Number(value) || 0),
      0,
    );

    setShowInitialQazoResult(false);
    setQazoResult(null);

    if (qazoTotal <= 0) {
      setShowInitialQazoPlan(false);
      window.location.hash = "#/";
      return;
    }

    setShowInitialQazoPlan(true);
  }

  /*
   * ---------------------------------------------------------
   * INITIAL QAZO PLAN
   * ---------------------------------------------------------
   */

  function handleInitialPlanComplete() {
    setShowInitialQazoPlan(false);

    window.location.hash = "#/";
  }

  /*
   * ---------------------------------------------------------
   * NOTIFICATION CALLBACKS
   * ---------------------------------------------------------
   */

  const handlePrayerCompleted = useCallback(async (prayerKey, date) => {
    await scheduleQazoReminder(prayerKey, date);
  }, []);

  const handleQazoReminderCompleted = useCallback(async (prayerKey, date) => {
    const balance = await loadQazoBalance();

    if (balance) {
      await recordQazoCompletion(prayerKey, 1, date, balance);
    }
  }, []);

  // SHARED NATIVE NOTIFICATION SYNC WILL GO HERE
  const syncNativeNotificationActions = useCallback(async () => {
    // if (cancelled) return;
    if (Capacitor.getPlatform() !== "android") return;

    console.log("📥 Checking native notification actions...");

    try {
      const result = await NotificationActions.getActions();

      // if (cancelled) return;

      console.log("📦 Native notification actions:", result);

      const rawActions = result?.actions || [];

      console.log("📦 Native action count:", rawActions.length);

      if (rawActions.length === 0) {
        return;
      }

      const actions = [];

      for (const rawAction of rawActions) {
        try {
          const action =
            typeof rawAction === "string" ? JSON.parse(rawAction) : rawAction;

          if (!action?.type || !action?.date || !action?.prayer) {
            console.warn("⚠️ Invalid native action:", action);
            continue;
          }

          actions.push(action);
        } catch (error) {
          console.error("❌ Failed to parse native action:", rawAction, error);
        }
      }

      if (actions.length === 0) {
        return;
      }

      let processedCount = 0;

      /*
       * -------------------------------------------------------
       * PRAYER ACTIONS
       * -------------------------------------------------------
       */

      for (const action of actions) {
        if (action.type !== "prayer") {
          continue;
        }

        try {
          console.log("🔍 Processing native prayer action:", action);

          const { date, prayer } = action;

          const now = Date.now();

          const record = {
            id: `${date}_${prayer}`,
            date,
            prayer,
            completed: true,
            completedAt: now,
            createdAt: now,
          };

          await putItem("prayer_logs", record);

          console.log(`✅ Prayer synced: ${prayer} ${date}`);

          /*
           * If a matching qazo action already exists,
           * the user has already completed the qazo.
           *
           * Therefore DO NOT schedule another qazo
           * notification.
           */

          const matchingQazoAction = actions.some(
            (otherAction) =>
              otherAction.type === "qazo" &&
              otherAction.date === date &&
              otherAction.prayer === prayer,
          );

          if (matchingQazoAction) {
            console.log(
              `⏭️ Matching qazo action already exists: ${prayer} ${date}`,
            );
          } else {
            await handlePrayerCompleted(prayer, date);
          }

          processedCount++;
        } catch (error) {
          console.error("❌ Failed to process prayer action:", action, error);
        }
      }

      /*
       * -------------------------------------------------------
       * QAZO ACTIONS
       * -------------------------------------------------------
       */

      for (const action of actions) {
        if (action.type !== "qazo") {
          continue;
        }

        try {
          console.log("🔍 Processing native qazo action:", action);

          const { date, prayer } = action;

          await completeQazoFromNotification({
            extra: {
              type: "qazo-follow-up",
              prayerKey: prayer,
              date,
            },
          });

          console.log(`✅ Qazo action synced: ${prayer} ${date}`);

          processedCount++;
        } catch (error) {
          console.error("❌ Failed to process qazo action:", action, error);
        }
      }

      /*
       * -------------------------------------------------------
       * CLEAR PROCESSED ACTIONS
       * -------------------------------------------------------
       */

      if (processedCount > 0) {
        await NotificationActions.clearActions();

        console.log("🧹 Native notification actions cleared");
      }
    } catch (error) {
      console.error("❌ Native notification action sync failed:", error);
    }
  }, [handlePrayerCompleted]);

  /*
   * ---------------------------------------------------------
   * APP INITIALIZATION
   * ---------------------------------------------------------
   */

  useEffect(() => {
    async function check() {
      try {
        const done = await isOnboardingCompleted();

        setOnboarded(done);

        if (!done) {
          setChecking(false);
          return;
        }

        /*
         * QAZO INITIALIZATION
         */

        const balance = await loadQazoBalance();

        if (!balance || !balance.qazoSetupCompleted) {
          const profile = await loadProfile();

          if (profile) {
            let currentBalance = balance;

            if (!currentBalance) {
              currentBalance = await initializeQazoBalance(profile);
            }

            const result = calculateQadaEstimate(profile);

            const qazoTotal = Object.values(result.byPrayer || {}).reduce(
              (sum, value) => sum + (Number(value) || 0),
              0,
            );

            if (qazoTotal > 0) {
              setQazoResult(result);
              setShowInitialQazoResult(true);
            } else {
              // Zero qazo: mark setup completed and do not show qazo screens.
              await confirmQazoBalance(
                currentBalance.byPrayer || {},
                currentBalance,
              );
            }
          }
        } else {
          const qazoTotal = Object.values(balance.byPrayer || {}).reduce(
            (sum, value) => sum + (Number(value) || 0),
            0,
          );

          // If there is no qazo, skip the plan completely.
          if (qazoTotal > 0) {
            const planSetup = await isQazoPlanSetupCompleted();

            if (!planSetup) {
              setShowInitialQazoPlan(true);
            }
          }
        }

        /*
         * -----------------------------------------------------
         * REGION + NOTIFICATION INITIALIZATION
         * -----------------------------------------------------
         */

        try {
          const region = await getStoredRegion();

          /*
           * REGION DEBUG
           */

          await putItem("settings", {
            key: "notification_debug",
            stage: "REGION_CHECK",
            data: {
              region,
              hasRegion: !!region,
            },
            updatedAt: new Date().toISOString(),
          });

          if (!region) {
            await putItem("settings", {
              key: "notification_debug",
              stage: "REGION_MISSING",
              data: {
                message: "getStoredRegion() returned null/undefined",
              },
              updatedAt: new Date().toISOString(),
            });

            return;
          }

          /*
           * REGION FOUND
           */

          await putItem("settings", {
            key: "notification_debug",
            stage: "REGION_FOUND",
            data: {
              region,
            },
            updatedAt: new Date().toISOString(),
          });

          /*
           * SYNC NATIVE NOTIFICATION ACTIONS FIRST
           */

          await syncNativeNotificationActions();

          /*
           * MISSED PRAYERS
           */

          await checkAndProcessMissedPrayers(region);

          await putItem("settings", {
            key: "notification_debug",
            stage: "MISSED_PRAYERS_PROCESSED",
            data: {
              region,
            },
            updatedAt: new Date().toISOString(),
          });

          /*
           * NOTIFICATION SYSTEM
           */

          await initNotificationSystem(region);

          await putItem("settings", {
            key: "notification_debug",
            stage: "NOTIFICATION_INIT_FINISHED",
            data: {
              region,
            },
            updatedAt: new Date().toISOString(),
          });
        } catch (notificationError) {
          await putItem("settings", {
            key: "notification_debug",
            stage: "NOTIFICATION_INIT_ERROR",
            data: {
              message: notificationError?.message || String(notificationError),
              stack: notificationError?.stack || null,
            },
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error("Yuklashda xatolik:", e);

        setOnboarded(false);
      } finally {
        setChecking(false);
      }
    }

    check();
  }, [syncNativeNotificationActions]);

  useEffect(() => {
    let cancelled = false;
    let appStateListener = null;

    async function setupAppStateListener() {
      const listener = await CapacitorApp.addListener(
        "appStateChange",
        ({ isActive }) => {
          if (isActive) {
            console.log(
              "🔄 App became active — checking native notification actions...",
            );

            syncNativeNotificationActions();
          }
        },
      );

      if (cancelled) {
        listener.remove();
        return;
      }

      appStateListener = listener;
    }

    // syncNativeNotificationActions();
    setupAppStateListener();

    return () => {
      cancelled = true;

      if (appStateListener) {
        appStateListener.remove();
        appStateListener = null;
      }
    };
  }, [syncNativeNotificationActions]);
  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (checking) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <Spinner size={48} />
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * ONBOARDING
   * ---------------------------------------------------------
   */

  if (!onboarded) {
    return <OnboardingPage onComplete={handleOnboardingComplete} />;
  }

  /*
   * ---------------------------------------------------------
   * INITIAL QAZO RESULT SCREEN
   * ---------------------------------------------------------
   */

  if (showInitialQazoResult && qazoResult) {
    return (
      <>
        <QazoResultScreen
          result={qazoResult}
          onContinue={handleInitialQazoContinue}
        />

        <NotificationBanner
          onPrayerCompleted={handlePrayerCompleted}
          onQazoReminder={handleQazoReminderCompleted}
        />
      </>
    );
  }

  /*
   * ---------------------------------------------------------
   * INITIAL QAZO PLAN SCREEN
   * ---------------------------------------------------------
   */

  if (showInitialQazoPlan) {
    return (
      <>
        <QazoPlanScreen onContinue={handleInitialPlanComplete} />

        <NotificationBanner onPrayerCompleted={handlePrayerCompleted} />
      </>
    );
  }

  /*
   * ---------------------------------------------------------
   * MAIN APP
   * ---------------------------------------------------------
   */

  return (
    <HashRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<AsosiyPage />} />

          <Route path="/kalendar" element={<KalendarPage />} />

          <Route path="/statistika" element={<StatistikaPage />} />

          <Route path="/sozlamalar" element={<SozlamalarPage />} />

          <Route
            path="/qazo-plan"
            element={
              <QazoPlanScreen
                onContinue={() => (window.location.hash = "#/sozlamalar")}
              />
            }
          />

          <Route path="/qazo-result" element={<QazoResultSettingsRoute />} />
        </Routes>
      </AppLayout>

      <BottomNav />

      <NotificationBanner onPrayerCompleted={handlePrayerCompleted} />
    </HashRouter>
  );
}

export default App;
