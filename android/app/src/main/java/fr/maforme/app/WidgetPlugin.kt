package fr.maforme.app

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/** Reçoit les chiffres du jour depuis le JavaScript et rafraîchit le widget. */
@CapacitorPlugin(name = "MaFormeWidget")
class WidgetPlugin : Plugin() {
    private val keys = listOf("kcalLeft", "kcalLabel", "eaten", "steps", "sport", "waterCount", "waterGoal", "theme")

    @PluginMethod
    fun update(call: PluginCall) {
        val editor = context.getSharedPreferences(WidgetProvider.PREFS, Context.MODE_PRIVATE).edit()
        for (key in keys) editor.putString(key, call.getString(key) ?: "")
        editor.apply()
        WidgetProvider.refresh(context)
        call.resolve()
    }

    /** Renvoie les verres ajoutés depuis le widget depuis le dernier passage, puis les remet à zéro. */
    /** Active l'icône et l'écran de démarrage du thème (un seul lanceur activé à la fois). */
    @PluginMethod
    fun setLauncherTheme(call: PluginCall) {
        val theme = call.getString("theme") ?: "default"
        val aliases = mapOf("default" to "LauncherDefault", "cyberpunk" to "LauncherCyberpunk", "solo" to "LauncherSolo")
        val wanted = aliases[theme] ?: "LauncherDefault"
        val pm = context.packageManager
        val enabledNow = aliases.values.firstOrNull {
            pm.getComponentEnabledSetting(ComponentName(context, "fr.maforme.app.$it")).let { s ->
                s == PackageManager.COMPONENT_ENABLED_STATE_ENABLED ||
                    (s == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT && it == "LauncherDefault")
            }
        }
        if (enabledNow != wanted) {
            // Activer d'abord le nouveau lanceur : l'app ne se retrouve jamais sans icône.
            pm.setComponentEnabledSetting(
                ComponentName(context, "fr.maforme.app.$wanted"), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP,
            )
            for (other in aliases.values.filter { it != wanted }) {
                pm.setComponentEnabledSetting(
                    ComponentName(context, "fr.maforme.app.$other"), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP,
                )
            }
        }
        call.resolve()
    }

    @PluginMethod
    fun consumeWater(call: PluginCall) {
        val prefs = context.getSharedPreferences(WidgetProvider.PREFS, Context.MODE_PRIVATE)
        val count = prefs.getInt(WidgetProvider.PENDING_WATER, 0)
        prefs.edit().putInt(WidgetProvider.PENDING_WATER, 0).apply()
        WidgetProvider.refresh(context)
        call.resolve(JSObject().put("count", count))
    }
}
