package com.abdulaziz.namoznazorati;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

public class QazoNotificationReceiver extends BroadcastReceiver {

    private static final String TAG = "NamozNotification";

    private static final String CHANNEL_ID = "prayer_notifications_v3";

    private static final String EXTRA_NOTIFICATION_ID =
            "qazo_notification_id";

    private static final String EXTRA_PRAYER_KEY =
            "qazo_prayer_key";

    private static final String EXTRA_DATE =
            "qazo_date";

    @Override
    public void onReceive(Context context, Intent intent) {

        Log.d(TAG, "🤲 QazoNotificationReceiver.onReceive()");

        int notificationId = intent.getIntExtra(
                EXTRA_NOTIFICATION_ID,
                Integer.MIN_VALUE
        );

        String prayerKey = intent.getStringExtra(EXTRA_PRAYER_KEY);
        String date = intent.getStringExtra(EXTRA_DATE);

        Log.d(TAG, "qazo notificationId = " + notificationId);
        Log.d(TAG, "qazo prayerKey = " + prayerKey);
        Log.d(TAG, "qazo date = " + date);

        if (notificationId == Integer.MIN_VALUE) {
            Log.e(TAG, "❌ Missing qazo notification ID");
            return;
        }

        if (prayerKey == null || date == null) {
            Log.e(TAG, "❌ Missing qazo prayer data");
            return;
        }

        createNotificationChannel(context);

        NotificationManager notificationManager =
                (NotificationManager) context.getSystemService(
                        Context.NOTIFICATION_SERVICE
                );

        if (notificationManager == null) {
            Log.e(TAG, "❌ NotificationManager is null");
            return;
        }

        /*
         * YES — user completed qazo
         */
        Intent completedIntent = new Intent(
                context,
                NotificationActionReceiver.class
        );

        completedIntent.putExtra(
                "LocalNotificationId",
                notificationId
        );

        completedIntent.putExtra(
                "LocalNotificationUserAction",
                "completed"
        );

        completedIntent.putExtra(
                "notificationType",
                "qazo-follow-up"
        );

        completedIntent.putExtra(
                "prayerKey",
                prayerKey
        );

        completedIntent.putExtra(
                "date",
                date
        );

        int completedRequestCode =
                notificationId + 10001;

        int pendingFlags =
                PendingIntent.FLAG_UPDATE_CURRENT
                        | PendingIntent.FLAG_IMMUTABLE;

        PendingIntent completedPendingIntent =
                PendingIntent.getBroadcast(
                        context,
                        completedRequestCode,
                        completedIntent,
                        pendingFlags
                );

        /*
         * NO — user did not complete qazo
         */
        Intent notCompletedIntent = new Intent(
                context,
                NotificationActionReceiver.class
        );

        notCompletedIntent.putExtra(
                "LocalNotificationId",
                notificationId
        );

        notCompletedIntent.putExtra(
                "LocalNotificationUserAction",
                "not_completed"
        );

        notCompletedIntent.putExtra(
                "notificationType",
                "qazo-follow-up"
        );

        notCompletedIntent.putExtra(
                "prayerKey",
                prayerKey
        );

        notCompletedIntent.putExtra(
                "date",
                date
        );

        int notCompletedRequestCode =
                notificationId + 10002;

        PendingIntent notCompletedPendingIntent =
                PendingIntent.getBroadcast(
                        context,
                        notCompletedRequestCode,
                        notCompletedIntent,
                        pendingFlags
                );

        String prayerName = getPrayerName(prayerKey);

        Notification notification =
                new NotificationCompat.Builder(
                        context,
                        CHANNEL_ID
                )
                        .setSmallIcon(
                                R.drawable.ic_notification
                        )
                        .setContentTitle(
                                prayerName + " qazosini o‘qidingizmi?"
                        )
                        .setContentText(
                                "5 rakat qazo rejangiz bo‘yicha"
                        )
                        .setPriority(
                                NotificationCompat.PRIORITY_HIGH
                        )
                        .setAutoCancel(true)
                        .addAction(
                                new NotificationCompat.Action.Builder(
                                        0,
                                        "Ha, o‘qidim",
                                        completedPendingIntent
                                ).build()
                        )
                        .addAction(
                                new NotificationCompat.Action.Builder(
                                        0,
                                        "Yo‘q",
                                        notCompletedPendingIntent
                                ).build()
                        )
                        .build();

        notificationManager.notify(
                notificationId,
                notification
        );

        Log.d(
                TAG,
                "✅ Qazo notification shown: "
                        + prayerName
                        + " / "
                        + prayerKey
        );
    }

    private void createNotificationChannel(Context context) {

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager notificationManager =
                (NotificationManager) context.getSystemService(
                        Context.NOTIFICATION_SERVICE
                );

        if (notificationManager == null) {
            return;
        }

        NotificationChannel channel =
                new NotificationChannel(
                        CHANNEL_ID,
                        "Namoz bildirishnomalari",
                        NotificationManager.IMPORTANCE_HIGH
                );

        channel.setDescription(
                "Namoz va qazo eslatmalari"
        );

        Uri soundUri = Uri.parse(
                "android.resource://"
                        + context.getPackageName()
                        + "/raw/notification_sound"
        );

        AudioAttributes audioAttributes =
                new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .setContentType(
                                AudioAttributes.CONTENT_TYPE_SONIFICATION
                        )
                        .build();

        channel.setSound(
                soundUri,
                audioAttributes
        );

        channel.enableVibration(true);

        notificationManager.createNotificationChannel(channel);
    }

    private String getPrayerName(String prayerKey) {

        return switch (prayerKey) {
            case "bomdod" -> "Bomdod";
            case "peshin" -> "Peshin";
            case "asr" -> "Asr";
            case "shom" -> "Shom";
            case "xufton" -> "Xufton";
            default -> prayerKey;
        };
    }
}