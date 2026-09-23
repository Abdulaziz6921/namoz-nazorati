package com.abdulaziz.namoznazorati;

import android.os.Bundle;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "NamozNotification";

    @Override
    protected void onCreate(Bundle savedInstanceState) {

        Log.d(TAG, "🚀 MainActivity.onCreate()");

        registerPlugin(NotificationActionsPlugin.class);

        Log.d(TAG, "✅ NotificationActionsPlugin registered");

        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();

        Log.d(TAG, "🔄 MainActivity.onResume()");
    }
}