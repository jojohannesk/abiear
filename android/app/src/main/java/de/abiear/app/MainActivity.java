package de.abiear.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(Systemeinstellungen.class);
        super.onCreate(savedInstanceState);
    }

    /**
     * Öffnet die Mitteilungseinstellungen der App — das Gegenstück zu
     * {@code UIApplication.openSettingsURLString} unter iOS. Ab Android 13
     * fragt das System nach zweimaligem Ablehnen nicht mehr; dann führt nur
     * dieser Weg zurück zu den Erinnerungen.
     */
    @CapacitorPlugin(name = "Systemeinstellungen")
    public static class Systemeinstellungen extends Plugin {
        @PluginMethod
        public void mitteilungenOeffnen(PluginCall call) {
            Intent absicht;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                absicht = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
            } else {
                absicht = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                    .setData(Uri.fromParts("package", getContext().getPackageName(), null));
            }
            absicht.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(absicht);
            call.resolve();
        }
    }
}
