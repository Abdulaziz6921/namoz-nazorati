import { deleteItem, getAll, putItem } from "./db";
import { loadNotificationSettings } from "./notificationSettings";
import { supabase } from "./supabase";

const BACKUP_EXCLUDED_SETTINGS = new Set([
  "notification_schedule",
  "missed_prayer_processed",
  "notification_debug",
]);

export async function createBackupSnapshot() {
  const [userProfile, settings, qazoBalance, qazoPlan, prayerLogs, qazoLogs] =
    await Promise.all([
      getAll("user_profile"),
      getAll("settings"),
      getAll("qazo_balance"),
      getAll("qazo_plan"),
      getAll("prayer_logs"),
      getAll("qazo_logs"),
    ]);

  return {
    version: 1,
    createdAt: Date.now(),

    userProfile,
    settings,
    qazoBalance,
    qazoPlan,
    prayerLogs,
    qazoLogs,
  };
}

export async function backupProfileToCloud() {
  const profile = await getAll("user_profile");

  if (!profile.length) {
    throw new Error("Mahalliy profil topilmadi.");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  const user = userData.user;

  if (!user) {
    throw new Error("Hisobga kirilmagan.");
  }

  const localProfile = profile[0];

  const cloudProfile = {
    user_id: user.id,
    gender: localProfile.gender,
    birth_date: localProfile.birthDate,
    accountability_date: localProfile.accountabilityDate,
    regular_prayer_start_date: localProfile.regularPrayerStartDate,
    regular_prayer_start_type: localProfile.regularPrayerStartType,
    consistency_estimate: localProfile.consistencyEstimate,
    menstruation_days: localProfile.menstruationDays,
    onboarding_completed: localProfile.onboardingCompleted ?? false,
    language: localProfile.language ?? "uz",
    notification_preferences: localProfile.notificationPreferences ?? {},
    prayer_tracking_start_date: localProfile.prayerTrackingStartDate,
    created_at: localProfile.createdAt
      ? new Date(localProfile.createdAt).toISOString()
      : undefined,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(cloudProfile)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function restoreProfileFromCloud() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  const user = userData.user;

  if (!user) {
    throw new Error("Hisobga kirilmagan.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const localProfile = {
    key: "user_profile",
    gender: data.gender ?? null,
    birthDate: data.birth_date ?? null,
    accountabilityDate: data.accountability_date ?? null,
    regularPrayerStartDate: data.regular_prayer_start_date ?? null,
    regularPrayerStartType: data.regular_prayer_start_type ?? null,
    consistencyEstimate: data.consistency_estimate ?? null,
    menstruationDays: data.menstruation_days ?? null,
    onboardingCompleted: data.onboarding_completed ?? false,
    language: data.language ?? "uz",
    notificationPreferences: data.notification_preferences ?? {
      notificationsEnabled: false,
    },
    prayerTrackingStartDate: data.prayer_tracking_start_date ?? null,
    createdAt: data.created_at ? new Date(data.created_at).getTime() : null,
    updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : null,
  };

  await putItem("user_profile", localProfile);

  return localProfile;
}

export async function backupSettingsToCloud() {
  const settings = await getAll("settings");

  const persistentSettings = settings.filter(
    (item) => item?.key && !BACKUP_EXCLUDED_SETTINGS.has(item.key),
  );

  if (!persistentSettings.length) {
    throw new Error("Mahalliy sozlamalar topilmadi.");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  const user = userData.user;

  if (!user) {
    throw new Error("Hisobga kirilmagan.");
  }

  const appSettings =
    persistentSettings.find((item) => item.key === "app_settings") || {};

  const notificationSettings = await loadNotificationSettings();

  const cloudSettings = {
    user_id: user.id,
    region: appSettings.region ?? null,
    notifications_enabled: appSettings.notificationsEnabled ?? false,
    qazo_calculation_method: appSettings.qazoCalculationMethod ?? "hanafi",
    language: appSettings.language ?? "uz",
    notification_preferences: notificationSettings,
  };

  const { data: settingsData, error: settingsError } = await supabase
    .from("settings")
    .upsert(cloudSettings)
    .select()
    .single();

  if (settingsError) {
    throw settingsError;
  }

  return {
    settings: settingsData,
    notificationSettings,
  };
}

export async function restoreSettingsFromCloud() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  const user = userData.user;

  if (!user) {
    throw new Error("Hisobga kirilmagan.");
  }

  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  await putItem("settings", {
    key: "app_settings",
    region: data.region ?? null,
    notificationsEnabled: data.notifications_enabled ?? false,
    qazoCalculationMethod: data.qazo_calculation_method ?? "hanafi",
    language: data.language ?? "uz",
  });

  if (data.notification_preferences) {
    await putItem("settings", {
      key: "notification_settings",
      value: data.notification_preferences,
    });
  }

  return data;
}

export async function backupQazoBalanceToCloud() {
  const qazoBalance = await getAll("qazo_balance");

  if (!qazoBalance.length) {
    throw new Error("Mahalliy qazo balansi topilmadi.");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;

  const user = userData.user;
  if (!user) throw new Error("Hisobga kirilmagan.");

  const localBalance = qazoBalance[0];

  const cloudBalance = {
    user_id: user.id,
    by_prayer: localBalance.byPrayer ?? {},
    total: localBalance.total ?? 0,
    is_estimate: localBalance.isEstimate ?? false,
    start_date: localBalance.startDate
      ? new Date(localBalance.startDate).toISOString()
      : null,
    end_date: localBalance.endDate
      ? new Date(localBalance.endDate).toISOString()
      : null,
    historical_qazo: localBalance.historicalQazo ?? false,
    manually_adjusted: localBalance.manuallyAdjusted ?? false,
    qazo_setup_completed: localBalance.qazoSetupCompleted ?? false,
    calculation_profile: localBalance.calculationProfile ?? null,
    confirmed_at: localBalance.confirmedAt
      ? new Date(localBalance.confirmedAt).toISOString()
      : null,
    created_at: localBalance.createdAt
      ? new Date(localBalance.createdAt).toISOString()
      : undefined,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("qazo_balance")
    .upsert(cloudBalance)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function restoreQazoBalanceFromCloud() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  const user = userData.user;

  if (!user) {
    throw new Error("Hisobga kirilmagan.");
  }

  const { data, error } = await supabase
    .from("qazo_balance")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const localBalance = {
    key: "qazo_balance",
    byPrayer: data.by_prayer ?? {},
    total: data.total ?? 0,
    isEstimate: data.is_estimate ?? false,
    startDate: data.start_date ? new Date(data.start_date).getTime() : null,
    endDate: data.end_date ? new Date(data.end_date).getTime() : null,
    historicalQazo: data.historical_qazo ?? false,
    manuallyAdjusted: data.manually_adjusted ?? false,
    qazoSetupCompleted: data.qazo_setup_completed ?? false,
    calculationProfile: data.calculation_profile ?? null,
    confirmedAt: data.confirmed_at
      ? new Date(data.confirmed_at).getTime()
      : null,
    createdAt: data.created_at ? new Date(data.created_at).getTime() : null,
    updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : null,
  };

  await putItem("qazo_balance", localBalance);

  return localBalance;
}

export async function backupQazoPlanToCloud() {
  const qazoPlans = await getAll("qazo_plan");

  if (!qazoPlans.length) {
    throw new Error("Mahalliy qazo rejasi topilmadi.");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;

  const user = userData.user;
  if (!user) throw new Error("Hisobga kirilmagan.");

  const localPlan = qazoPlans[0];

  const cloudPlan = {
    user_id: user.id,
    plan_type: localPlan.planType ?? null,
    label: localPlan.label ?? null,
    daily_target: localPlan.dailyTarget ?? null,
    custom_daily_target: localPlan.customDailyTarget ?? null,
    plan_setup_completed: localPlan.planSetupCompleted ?? false,
    created_at: localPlan.createdAt
      ? new Date(localPlan.createdAt).toISOString()
      : undefined,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("qazo_plan")
    .upsert(cloudPlan)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function restoreQazoPlanFromCloud() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  const user = userData.user;

  if (!user) {
    throw new Error("Hisobga kirilmagan.");
  }

  const { data, error } = await supabase
    .from("qazo_plan")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const localPlan = {
    key: "qazo_plan",
    planType: data.plan_type ?? null,
    label: data.label ?? null,
    dailyTarget: data.daily_target ?? null,
    customDailyTarget: data.custom_daily_target ?? null,
    planSetupCompleted: data.plan_setup_completed ?? false,
    createdAt: data.created_at ? new Date(data.created_at).getTime() : null,
    updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : null,
  };

  await putItem("qazo_plan", localPlan);

  return localPlan;
}

export async function backupPrayerLogsToCloud() {
  const prayerLogs = await getAll("prayer_logs");

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;

  const user = userData.user;
  if (!user) throw new Error("Hisobga kirilmagan.");

  const cloudLogs = prayerLogs.map((log) => ({
    user_id: user.id,
    id: log.id,
    date: log.date,
    prayer: log.prayer,
    completed: log.completed ?? false,
    created_at: log.createdAt ? new Date(log.createdAt).toISOString() : null,
    missed_at: log.missedAt ? new Date(log.missedAt).toISOString() : null,
    auto_added_to_qazo: log.autoAddedToQazo ?? false,
  }));

  if (!cloudLogs.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("prayer_logs")
    .upsert(cloudLogs)
    .select();

  if (error) throw error;

  return data;
}

export async function restorePrayerLogsFromCloud() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  const user = userData.user;

  if (!user) {
    throw new Error("Hisobga kirilmagan.");
  }

  const { data, error } = await supabase
    .from("prayer_logs")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  if (!data?.length) {
    return [];
  }

  const localLogs = data.map((log) => ({
    id: log.id,
    date: log.date,
    prayer: log.prayer,
    completed: log.completed ?? false,
    createdAt: log.created_at ? new Date(log.created_at).getTime() : null,
    missedAt: log.missed_at ? new Date(log.missed_at).getTime() : null,
    autoAddedToQazo: log.auto_added_to_qazo ?? false,
  }));

  for (const log of localLogs) {
    await putItem("prayer_logs", log);
  }

  return localLogs;
}

export async function backupQazoLogsToCloud() {
  const qazoLogs = await getAll("qazo_logs");

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;

  const user = userData.user;
  if (!user) throw new Error("Hisobga kirilmagan.");

  const cloudLogs = qazoLogs.map((log) => ({
    user_id: user.id,
    id: log.id,
    date: log.date,
    prayer: log.prayer,
    quantity: log.quantity ?? 0,
    created_at: log.createdAt ? new Date(log.createdAt).toISOString() : null,
  }));

  if (!cloudLogs.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("qazo_logs")
    .upsert(cloudLogs)
    .select();

  if (error) throw error;

  return data;
}

export async function restoreQazoLogsFromCloud() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  const user = userData.user;

  if (!user) {
    throw new Error("Hisobga kirilmagan.");
  }

  const { data, error } = await supabase
    .from("qazo_logs")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  if (!data?.length) {
    return [];
  }

  const localLogs = data.map((log) => ({
    id: log.id,
    date: log.date,
    prayer: log.prayer,
    quantity: log.quantity ?? 0,
    createdAt: log.created_at ? new Date(log.created_at).getTime() : null,
  }));

  for (const log of localLogs) {
    await putItem("qazo_logs", log);
  }

  return localLogs;
}

export async function backupAllToCloud() {
  const profile = await backupProfileToCloud();
  const settings = await backupSettingsToCloud();
  const qazoBalance = await backupQazoBalanceToCloud();
  const qazoPlan = await backupQazoPlanToCloud();
  const prayerLogs = await backupPrayerLogsToCloud();
  const qazoLogs = await backupQazoLogsToCloud();

  return {
    profile,
    settings,
    qazoBalance,
    qazoPlan,
    prayerLogs,
    qazoLogs,
  };
}

export async function restoreAllFromCloud() {
  const profile = await restoreProfileFromCloud();

  if (!profile) {
    return null;
  }

  await restoreSettingsFromCloud();
  await restoreQazoBalanceFromCloud();
  await restoreQazoPlanFromCloud();
  await restorePrayerLogsFromCloud();
  await restoreQazoLogsFromCloud();

  return profile;
}

export async function mergeLocalDataWithCloud() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  const user = userData.user;

  if (!user) {
    throw new Error("Hisobga kirilmagan.");
  }

  // -------------------------------------------------------
  // 1. Read current local data BEFORE deleting anything
  // -------------------------------------------------------

  const [localProfile, localSettings, localPrayerLogs, localQazoLogs] =
    await Promise.all([
      getAll("user_profile"),
      getAll("settings"),
      getAll("prayer_logs"),
      getAll("qazo_logs"),
    ]);

  const localTransientSettings = localSettings.filter(
    (item) =>
      item?.key === "notification_schedule" ||
      item?.key === "missed_prayer_processed" ||
      item?.key === "notification_debug",
  );

  // -------------------------------------------------------
  // 2. Read cloud data
  // -------------------------------------------------------

  const [
    cloudProfileResult,
    cloudSettingsResult,
    cloudBalanceResult,
    cloudPlanResult,
    cloudPrayerLogsResult,
    cloudQazoLogsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),

    supabase.from("settings").select("*").eq("user_id", user.id).maybeSingle(),

    supabase
      .from("qazo_balance")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),

    supabase.from("qazo_plan").select("*").eq("user_id", user.id).maybeSingle(),

    supabase.from("prayer_logs").select("*").eq("user_id", user.id),

    supabase.from("qazo_logs").select("*").eq("user_id", user.id),
  ]);

  const cloudResults = [
    cloudProfileResult,
    cloudSettingsResult,
    cloudBalanceResult,
    cloudPlanResult,
    cloudPrayerLogsResult,
    cloudQazoLogsResult,
  ];

  for (const result of cloudResults) {
    if (result.error) {
      throw result.error;
    }
  }

  const cloudProfile = cloudProfileResult.data;
  const cloudSettings = cloudSettingsResult.data;
  const cloudBalance = cloudBalanceResult.data;
  const cloudPlan = cloudPlanResult.data;
  const cloudPrayerLogs = cloudPrayerLogsResult.data || [];
  const cloudQazoLogs = cloudQazoLogsResult.data || [];

  if (!cloudProfile) {
    throw new Error("Bulutdagi profil topilmadi.");
  }

  // -------------------------------------------------------
  // 3. Find the real cloud history cutoff
  //
  // IMPORTANT:
  // Do NOT use last_backup_at or qazo_balance.end_date.
  // The cutoff comes from actual dated history.
  // -------------------------------------------------------

  const cloudDates = [
    ...cloudPrayerLogs.map((log) => log.date).filter(Boolean),
    ...cloudQazoLogs.map((log) => log.date).filter(Boolean),
  ].sort();

  const cloudCutoff = cloudDates.length
    ? cloudDates[cloudDates.length - 1]
    : null;

  // -------------------------------------------------------
  // 4. Preserve only LOCAL activity after cloud cutoff
  // -------------------------------------------------------

  const localPrayerLogsToKeep = cloudCutoff
    ? localPrayerLogs.filter((log) => log?.date && log.date > cloudCutoff)
    : localPrayerLogs;

  const localQazoLogsToKeep = cloudCutoff
    ? localQazoLogs.filter((log) => log?.date && log.date > cloudCutoff)
    : localQazoLogs;

  // -------------------------------------------------------
  // 5. Clear local historical/conflicting data
  // -------------------------------------------------------

  await Promise.all([
    ...localProfile.map((item) => deleteItem("user_profile", item.key)),
    ...localSettings.map((item) => deleteItem("settings", item.key)),
    ...localPrayerLogs.map((item) => deleteItem("prayer_logs", item.id)),
    ...localQazoLogs.map((item) => deleteItem("qazo_logs", item.id)),
  ]);

  // Clear qazo balance and plan completely.
  // Their onboarding values must NOT survive the merge.
  const localQazoBalances = await getAll("qazo_balance");
  const localQazoPlans = await getAll("qazo_plan");

  await Promise.all([
    ...localQazoBalances.map((item) => deleteItem("qazo_balance", item.key)),
    ...localQazoPlans.map((item) => deleteItem("qazo_plan", item.key)),
  ]);

  // -------------------------------------------------------
  // 6. Restore cloud profile
  // -------------------------------------------------------

  const restoredProfile = {
    key: "user_profile",
    gender: cloudProfile.gender ?? null,
    birthDate: cloudProfile.birth_date ?? null,
    accountabilityDate: cloudProfile.accountability_date ?? null,
    regularPrayerStartDate: cloudProfile.regular_prayer_start_date ?? null,
    regularPrayerStartType: cloudProfile.regular_prayer_start_type ?? null,
    consistencyEstimate: cloudProfile.consistency_estimate ?? null,
    menstruationDays: cloudProfile.menstruation_days ?? null,
    onboardingCompleted: cloudProfile.onboarding_completed ?? false,
    language: cloudProfile.language ?? "uz",
    notificationPreferences: cloudProfile.notification_preferences ?? {
      notificationsEnabled: false,
    },
    prayerTrackingStartDate: cloudProfile.prayer_tracking_start_date ?? null,
    createdAt: cloudProfile.created_at
      ? new Date(cloudProfile.created_at).getTime()
      : null,
    updatedAt: cloudProfile.updated_at
      ? new Date(cloudProfile.updated_at).getTime()
      : null,
  };

  await putItem("user_profile", restoredProfile);

  // -------------------------------------------------------
  // 7. Restore cloud settings
  // -------------------------------------------------------

  if (cloudSettings) {
    await putItem("settings", {
      key: "app_settings",
      region: cloudSettings.region ?? null,
      notificationsEnabled: cloudSettings.notifications_enabled ?? false,
      qazoCalculationMethod: cloudSettings.qazo_calculation_method ?? "hanafi",
      language: cloudSettings.language ?? "uz",
    });

    if (cloudSettings.notification_preferences) {
      await putItem("settings", {
        key: "notification_settings",
        value: cloudSettings.notification_preferences,
      });
    }
  }

  for (const setting of localTransientSettings) {
    await putItem("settings", setting);
  }

  // -------------------------------------------------------
  // 8. Restore cloud prayer logs
  // -------------------------------------------------------

  for (const log of cloudPrayerLogs) {
    await putItem("prayer_logs", {
      id: log.id,
      date: log.date,
      prayer: log.prayer,
      completed: log.completed ?? false,
      createdAt: log.created_at ? new Date(log.created_at).getTime() : null,
      missedAt: log.missed_at ? new Date(log.missed_at).getTime() : null,
      autoAddedToQazo: log.auto_added_to_qazo ?? false,
    });
  }

  // -------------------------------------------------------
  // 9. Restore cloud qazo logs
  // -------------------------------------------------------

  for (const log of cloudQazoLogs) {
    await putItem("qazo_logs", {
      id: log.id,
      date: log.date,
      prayer: log.prayer,
      quantity: log.quantity ?? 0,
      createdAt: log.created_at ? new Date(log.created_at).getTime() : null,
    });
  }

  // -------------------------------------------------------
  // 10. Restore cloud qazo plan
  // -------------------------------------------------------

  if (cloudPlan) {
    await putItem("qazo_plan", {
      key: "qazo_plan",
      planType: cloudPlan.plan_type ?? null,
      label: cloudPlan.label ?? null,
      dailyTarget: cloudPlan.daily_target ?? null,
      customDailyTarget: cloudPlan.custom_daily_target ?? null,
      planSetupCompleted: cloudPlan.plan_setup_completed ?? false,
      createdAt: cloudPlan.created_at
        ? new Date(cloudPlan.created_at).getTime()
        : null,
      updatedAt: cloudPlan.updated_at
        ? new Date(cloudPlan.updated_at).getTime()
        : null,
    });
  }

  // -------------------------------------------------------
  // 11. Restore cloud qazo balance as the historical base
  // -------------------------------------------------------

  if (cloudBalance) {
    const byPrayer = {
      bomdod: Number(cloudBalance.by_prayer?.bomdod) || 0,
      peshin: Number(cloudBalance.by_prayer?.peshin) || 0,
      asr: Number(cloudBalance.by_prayer?.asr) || 0,
      shom: Number(cloudBalance.by_prayer?.shom) || 0,
      xufton: Number(cloudBalance.by_prayer?.xufton) || 0,
    };

    // -----------------------------------------------------
    // 12. Apply REAL local missed prayers after cutoff
    //
    // Xufton = 7 rak'at
    // Others use their actual qazo rak'at count.
    // -----------------------------------------------------

    const missedPrayerQuantity = {
      bomdod: 2,
      peshin: 4,
      asr: 4,
      shom: 3,
      xufton: 7,
    };

    for (const log of localPrayerLogsToKeep) {
      if (!log.autoAddedToQazo) continue;

      const prayer = log.prayer;
      const quantity = missedPrayerQuantity[prayer];

      if (!quantity || byPrayer[prayer] === undefined) {
        continue;
      }

      byPrayer[prayer] += quantity;
    }

    // -----------------------------------------------------
    // 13. Apply REAL local completed qazo after cutoff
    // -----------------------------------------------------

    for (const log of localQazoLogsToKeep) {
      const prayer = log.prayer;
      const quantity = Number(log.quantity) || 0;

      if (!quantity || byPrayer[prayer] === undefined) {
        continue;
      }

      byPrayer[prayer] = Math.max(0, byPrayer[prayer] - quantity);
    }

    const total = Object.values(byPrayer).reduce(
      (sum, value) => sum + value,
      0,
    );

    await putItem("qazo_balance", {
      key: "qazo_balance",
      byPrayer,
      total,
      isEstimate: cloudBalance.is_estimate ?? false,
      startDate: cloudBalance.start_date
        ? new Date(cloudBalance.start_date).getTime()
        : null,
      endDate: cloudBalance.end_date
        ? new Date(cloudBalance.end_date).getTime()
        : null,
      historicalQazo: cloudBalance.historical_qazo ?? false,
      manuallyAdjusted: cloudBalance.manually_adjusted ?? false,
      qazoSetupCompleted: cloudBalance.qazo_setup_completed ?? false,
      calculationProfile: cloudBalance.calculation_profile ?? null,
      confirmedAt: cloudBalance.confirmed_at
        ? new Date(cloudBalance.confirmed_at).getTime()
        : null,
      createdAt: cloudBalance.created_at
        ? new Date(cloudBalance.created_at).getTime()
        : null,
      updatedAt: Date.now(),
    });
  }

  // -------------------------------------------------------
  // 14. Add preserved LOCAL real activity back
  // -------------------------------------------------------

  for (const log of localPrayerLogsToKeep) {
    await putItem("prayer_logs", log);
  }

  for (const log of localQazoLogsToKeep) {
    await putItem("qazo_logs", log);
  }

  return {
    profile: restoredProfile,
    cloudCutoff,
    preservedPrayerLogs: localPrayerLogsToKeep.length,
    preservedQazoLogs: localQazoLogsToKeep.length,
  };
}

let backupTimer = null;

export function scheduleBackupAfterLocalChange() {
  if (backupTimer) {
    clearTimeout(backupTimer);
  }

  backupTimer = setTimeout(async () => {
    backupTimer = null;

    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error("Backup auth tekshiruvida xatolik:", error);
        return;
      }

      if (!data.user) {
        return;
      }

      await backupAllToCloud();

      const backupTime = new Date().toISOString();

      await putItem("settings", {
        key: "last_backup_at",
        value: backupTime,
      });

      console.log("☁️ Automatic backup completed:", backupTime);
    } catch (error) {
      console.error("☁️ Automatic backup failed:", error);
    }
  }, 1500);
}
