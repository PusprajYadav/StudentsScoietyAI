package com.studentsociety.a2zworkhub;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeDownloadsPlugin.class);
        registerPlugin(NativeNotificationSettingsPlugin.class);
        super.onCreate(savedInstanceState);
        persistIncomingUriPermission(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        persistIncomingUriPermission(intent);
    }

    private void persistIncomingUriPermission(Intent intent) {
        if (intent == null) {
            return;
        }

        Uri uri = intent.getData();
        if (uri == null || !"content".equalsIgnoreCase(uri.getScheme()) || Build.VERSION.SDK_INT < Build.VERSION_CODES.KITKAT) {
            return;
        }

        int grantedFlags = intent.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        if ((grantedFlags & Intent.FLAG_GRANT_READ_URI_PERMISSION) == 0) {
            return;
        }

        try {
            getContentResolver().takePersistableUriPermission(uri, grantedFlags);
        } catch (SecurityException ignored) {
            // Some providers grant one-time access only. In that case we still keep the temporary grant.
        } catch (Exception exception) {
            exception.printStackTrace();
        }
    }
}
