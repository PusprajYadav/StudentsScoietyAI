package com.studentsociety.a2zworkhub;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeNotificationSettings")
public class NativeNotificationSettingsPlugin extends Plugin {

    @PluginMethod
    public void openAppNotificationSettings(PluginCall call) {
        try {
            Intent intent;
            String packageName = getContext().getPackageName();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, packageName);
            } else {
                intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.fromParts("package", packageName, null));
            }

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception exception) {
            call.reject("Could not open Android notification settings.", exception);
        }
    }
}
