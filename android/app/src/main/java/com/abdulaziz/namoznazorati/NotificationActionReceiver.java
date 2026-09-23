package com.abdulaziz.namoznazorati;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONObject;

public class NotificationActionReceiver extends BroadcastReceiver {

    private static final String TAG = "NamozNotification";

    private static final String PREFS_NAME =
            "NamozNotificationActions";

    private static final String QAZO_STATE_PREFS =
            "NamozQazoState";

    private static final String QAZO_STATE_KEY =
            "qazo_state";

    private static final String QAZO_SCHEDULED_PREFIX =
            "qazo_scheduled_";

    private static final String EXTRA_NOTIFICATION_ID =
            "qazo_notification_id";

    private static final String EXTRA_PRAYER_KEY =
            "qazo_prayer_key";

    private static final String EXTRA_DATE =
            "qazo_date";

    @Override
    public void onReceive(Context context, Intent intent) {

        int notificationId = intent.getIntExtra(
                "LocalNotificationId",
                Integer.MIN_VALUE
        );

        String actionId = intent.getStringExtra(
                "LocalNotificationUserAction"
        );

        String notificationType =
                intent.getStringExtra("notificationType");

        String prayerKey =
                intent.getStringExtra("prayerKey");

        String date =
                intent.getStringExtra("date");

        Log.d(TAG, "🔔 Notification action received");
        Log.d(TAG, "notificationId = " + notificationId);
        Log.d(TAG, "actionId = " + actionId);
        Log.d(TAG, "notificationType = " + notificationType);
        Log.d(TAG, "prayerKey = " + prayerKey);
        Log.d(TAG, "date = " + date);

        // Always dismiss the notification.
        if (notificationId != Integer.MIN_VALUE) {

            NotificationManager notificationManager =
                    (NotificationManager) context.getSystemService(
                            Context.NOTIFICATION_SERVICE
                    );

            if (notificationManager != null) {
                try {
                    notificationManager.cancel(notificationId);
                } catch (SecurityException e) {
                    Log.e(
                            TAG,
                            "Could not dismiss notification",
                            e
                    );
                }
            }
        }

        if ("not_completed".equals(actionId)) {
            Log.d(
                    TAG,
                    "❌ User selected NO - nothing saved"
            );
            return;
        }

        if (!"completed".equals(actionId)) {
            Log.w(
                    TAG,
                    "⚠️ Unknown action: " + actionId
            );
            return;
        }

        if (notificationType == null
                || prayerKey == null
                || date == null) {

            Log.e(
                    TAG,
                    "❌ Missing notification data"
            );

            return;
        }

        String actionType;

        if ("prayer-follow-up".equals(notificationType)) {

            actionType = "prayer";

        } else if ("qazo-follow-up".equals(notificationType)) {

            actionType = "qazo";

        } else {

            Log.e(
                    TAG,
                    "❌ Unknown notification type: "
                            + notificationType
            );

            return;
        }

        // ─────────────────────────────────────
        // Save action for React / IndexedDB sync
        // ─────────────────────────────────────

        SharedPreferences prefs =
                context.getSharedPreferences(
                        PREFS_NAME,
                        Context.MODE_PRIVATE
                );

        String actionIdKey =
                actionType
                        + "_"
                        + date
                        + "_"
                        + prayerKey;

        String actionData =
                "{"
                        + "\"type\":\""
                        + actionType
                        + "\","
                        + "\"date\":\""
                        + date
                        + "\","
                        + "\"prayer\":\""
                        + prayerKey
                        + "\""
                        + "}";

        prefs.edit()
                .putString(
                        actionIdKey,
                        actionData
                )
                .apply();

        Log.d(
                TAG,
                "✅ Native action saved: "
                        + actionData
        );

        // ─────────────────────────────────────
        // Prayer completed → schedule qazo
        // ─────────────────────────────────────

        if ("prayer".equals(actionType)) {

            scheduleNativeQazoIfNeeded(
                    context,
                    prayerKey,
                    date
            );
        }
    }

    // ─────────────────────────────────────────
    // Native qazo scheduling
    // ─────────────────────────────────────────

    private void scheduleNativeQazoIfNeeded(
            Context context,
            String prayerKey,
            String date
    ) {

        Log.d(
                TAG,
                "🤲 Prayer completed action received"
        );

        SharedPreferences qazoPrefs =
                context.getSharedPreferences(
                        QAZO_STATE_PREFS,
                        Context.MODE_PRIVATE
                );

        String qazoStateJson =
                qazoPrefs.getString(
                        QAZO_STATE_KEY,
                        null
                );

        if (qazoStateJson == null) {

            Log.d(
                    TAG,
                    "📭 No native qazo state found"
            );

            return;
        }

        Log.d(
                TAG,
                "📦 Native qazo state: "
                        + qazoStateJson
        );

        try {

            JSONObject state =
                    new JSONObject(qazoStateJson);

            boolean enabled =
                    state.optBoolean(
                            "enabled",
                            false
                    );

            String plan =
                    state.optString(
                            "plan",
                            ""
                    );

            boolean qazoReminders =
                    state.optBoolean(
                            "qazoReminders",
                            false
                    );

            if (!enabled) {

                Log.d(
                        TAG,
                        "🔕 Qazo skipped: notifications OFF"
                );

                return;
            }

            if (!"daily_5".equals(plan)) {

                Log.d(
                        TAG,
                        "ℹ️ Qazo skipped: plan is "
                                + plan
                );

                return;
            }

            if (!qazoReminders) {

                Log.d(
                        TAG,
                        "🔕 Qazo skipped: qazo reminders OFF"
                );

                return;
            }

            JSONObject remainingByPrayer =
                    state.optJSONObject(
                            "remainingByPrayer"
                    );

            if (remainingByPrayer == null) {

                Log.d(
                        TAG,
                        "📭 No qazo balance found"
                );

                return;
            }

            int remaining =
                    remainingByPrayer.optInt(
                            prayerKey,
                            0
                    );

            Log.d(
                    TAG,
                    "📊 "
                            + prayerKey
                            + " qazo remaining = "
                            + remaining
            );

            if (remaining <= 0) {

                Log.d(
                        TAG,
                        "ℹ️ "
                                + prayerKey
                                + " qazo = 0, skipped"
                );

                return;
            }

            String scheduleKey =
                    QAZO_SCHEDULED_PREFIX
                            + date
                            + "_"
                            + prayerKey;

            boolean alreadyScheduled =
                    qazoPrefs.getBoolean(
                            scheduleKey,
                            false
                    );

            if (alreadyScheduled) {

                Log.d(
                        TAG,
                        "⏭️ Qazo already scheduled: "
                                + scheduleKey
                );

                return;
            }

            int prayerIndex =
                    getPrayerIndex(prayerKey);

            if (prayerIndex < 0) {

                Log.e(
                        TAG,
                        "❌ Unknown prayer: "
                                + prayerKey
                );

                return;
            }

            int notificationId =
                    getQazoNotificationId(
                            date,
                            prayerIndex
                    );

            Log.d(
                    TAG,
                    "⏰ Scheduling native qazo notification..."
            );

            scheduleQazoAlarm(
                    context,
                    notificationId,
                    prayerKey,
                    date
            );

            qazoPrefs.edit()
                    .putBoolean(
                            scheduleKey,
                            true
                    )
                    .apply();

            Log.d(
                    TAG,
                    "✅ Native qazo notification scheduled: ID "
                            + notificationId
            );

        } catch (Exception e) {

            Log.e(
                    TAG,
                    "❌ Failed to process native qazo state",
                    e
            );
        }
    }

    // ─────────────────────────────────────────
    // Schedule AlarmManager
    // ─────────────────────────────────────────

    private void scheduleQazoAlarm(
            Context context,
            int notificationId,
            String prayerKey,
            String date
    ) {

        Intent intent =
                new Intent(
                        context,
                        QazoNotificationReceiver.class
                );

        intent.putExtra(
                EXTRA_NOTIFICATION_ID,
                notificationId
        );

        intent.putExtra(
                EXTRA_PRAYER_KEY,
                prayerKey
        );

        intent.putExtra(
                EXTRA_DATE,
                date
        );

        int requestCode =
                notificationId + 20001;

        int flags =
                PendingIntent.FLAG_UPDATE_CURRENT
                        | PendingIntent.FLAG_IMMUTABLE;

        PendingIntent pendingIntent =
                PendingIntent.getBroadcast(
                        context,
                        requestCode,
                        intent,
                        flags
                );

        AlarmManager alarmManager =
                (AlarmManager) context.getSystemService(
                        Context.ALARM_SERVICE
                );

        if (alarmManager == null) {

            Log.e(
                    TAG,
                    "❌ AlarmManager is null"
            );

            return;
        }

        long triggerAt =
                System.currentTimeMillis() + 1500;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                && !alarmManager.canScheduleExactAlarms()) {

            Log.w(
                    TAG,
                    "⚠️ Exact alarms are not allowed, using fallback alarm"
            );

            alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerAt,
                    pendingIntent
            );

            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {

            alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerAt,
                    pendingIntent
            );

        } else {

            alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    triggerAt,
                    pendingIntent
            );
        }
    }

    // ─────────────────────────────────────────
    // Notification ID
    // ─────────────────────────────────────────

    private int getQazoNotificationId(
            String date,
            int prayerIndex
    ) {

        String digits =
                date.replace("-", "");

        String shortDate =
                digits.substring(2);

        int dateShort =
                Integer.parseInt(shortDate);

        return dateShort * 10 + 80 + prayerIndex;
    }

    // ─────────────────────────────────────────
    // Prayer index
    // ─────────────────────────────────────────

    private int getPrayerIndex(
            String prayerKey
    ) {

        return switch (prayerKey) {

            case "bomdod" -> 0;

            case "peshin" -> 1;

            case "asr" -> 2;

            case "shom" -> 3;

            case "xufton" -> 4;

            default -> -1;
        };
    }
}