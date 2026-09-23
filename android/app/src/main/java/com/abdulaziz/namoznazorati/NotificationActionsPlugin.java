package com.abdulaziz.namoznazorati;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Map;

@CapacitorPlugin(name = "NotificationActions")
public class NotificationActionsPlugin extends Plugin {

    private static final String TAG = "NamozNotification";

    private static final String PREFS_NAME =
            "NamozNotificationActions";

    private static final String QAZO_STATE_PREFS =
            "NamozQazoState";

    private static final String QAZO_STATE_KEY =
            "qazo_state";

    // ─────────────────────────────────────────────
    // Existing: get native notification actions
    // ─────────────────────────────────────────────

    @PluginMethod
    public void getActions(PluginCall call) {

        Context context = getContext();

        SharedPreferences prefs =
                context.getSharedPreferences(
                        PREFS_NAME,
                        Context.MODE_PRIVATE
                );

        Map<String, ?> allEntries = prefs.getAll();

        JSArray actions = new JSArray();

        for (Map.Entry<String, ?> entry : allEntries.entrySet()) {

            Object value = entry.getValue();

            if (!(value instanceof String)) {
                continue;
            }

            String actionJson = (String) value;

            if (!actionJson.trim().startsWith("{")) {
                continue;
            }

            actions.put(actionJson);
        }

        JSObject result = new JSObject();
        result.put("actions", actions);

        android.util.Log.d(
                TAG,
                "📦 Native actions returned: " + actions
        );

        call.resolve(result);
    }

    // ─────────────────────────────────────────────
    // Existing: clear native notification actions
    // ─────────────────────────────────────────────

    @PluginMethod
    public void clearActions(PluginCall call) {

        Context context = getContext();

        SharedPreferences prefs =
                context.getSharedPreferences(
                        PREFS_NAME,
                        Context.MODE_PRIVATE
                );

        prefs.edit().clear().apply();

        android.util.Log.d(
                TAG,
                "🧹 Native notification actions cleared"
        );

        call.resolve();
    }

    // ─────────────────────────────────────────────
    // NEW: save qazo state from React
    // ─────────────────────────────────────────────

    @PluginMethod
    public void saveQazoState(PluginCall call) {

        String qazoState = call.getString("qazoState");

        if (qazoState == null || qazoState.trim().isEmpty()) {

            call.reject(
                    "qazoState is required"
            );

            return;
        }

        Context context = getContext();

        SharedPreferences prefs =
                context.getSharedPreferences(
                        QAZO_STATE_PREFS,
                        Context.MODE_PRIVATE
                );

        prefs.edit()
                .putString(
                        QAZO_STATE_KEY,
                        qazoState
                )
                .apply();

        android.util.Log.d(
                TAG,
                "💾 Qazo state saved: " + qazoState
        );

        call.resolve();
    }

    // ─────────────────────────────────────────────
    // NEW: get qazo state from native storage
    // ─────────────────────────────────────────────

    @PluginMethod
    public void getQazoState(PluginCall call) {

        Context context = getContext();

        SharedPreferences prefs =
                context.getSharedPreferences(
                        QAZO_STATE_PREFS,
                        Context.MODE_PRIVATE
                );

        String qazoState =
                prefs.getString(
                        QAZO_STATE_KEY,
                        null
                );

        JSObject result = new JSObject();

        if (qazoState == null) {

            result.put(
                    "qazoState",
                    JSObject.NULL
            );

            android.util.Log.d(
                    TAG,
                    "📭 No native qazo state found"
            );

        } else {

            result.put(
                    "qazoState",
                    qazoState
            );

            android.util.Log.d(
                    TAG,
                    "📦 Native qazo state returned: "
                            + qazoState
            );
        }

        call.resolve(result);
    }

    @PluginMethod
    public void isQazoScheduled(PluginCall call) {
        String date = call.getString("date");
        String prayerKey = call.getString("prayerKey");

        if (date == null || prayerKey == null) {
            call.reject("date and prayerKey are required");
            return;
        }

        Context context = getContext();

        SharedPreferences prefs =
                context.getSharedPreferences(
                        QAZO_STATE_PREFS,
                        Context.MODE_PRIVATE
                );

        String key =
                "qazo_scheduled_"
                        + date
                        + "_"
                        + prayerKey;

        boolean scheduled = prefs.getBoolean(key, false);

        JSObject result = new JSObject();
        result.put("scheduled", scheduled);

        android.util.Log.d(
                TAG,
                "🔍 Qazo scheduled check: "
                        + key
                        + " = "
                        + scheduled
        );

        call.resolve(result);
    }

    @PluginMethod
    public void clearQazoScheduled(PluginCall call) {
        String date = call.getString("date");
        String prayerKey = call.getString("prayerKey");

        if (date == null || prayerKey == null) {
            call.reject("date and prayerKey are required");
            return;
        }

        Context context = getContext();

        SharedPreferences prefs =
                context.getSharedPreferences(
                        QAZO_STATE_PREFS,
                        Context.MODE_PRIVATE
                );

        String key =
                "qazo_scheduled_"
                        + date
                        + "_"
                        + prayerKey;

        prefs.edit()
                .remove(key)
                .apply();

        android.util.Log.d(
                TAG,
                "🧹 Qazo schedule marker cleared: "
                        + key
        );

        call.resolve();
    }
}