package fr.maforme.app

import android.content.Context
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
    @PluginMethod
    fun consumeWater(call: PluginCall) {
        val prefs = context.getSharedPreferences(WidgetProvider.PREFS, Context.MODE_PRIVATE)
        val count = prefs.getInt(WidgetProvider.PENDING_WATER, 0)
        prefs.edit().putInt(WidgetProvider.PENDING_WATER, 0).apply()
        WidgetProvider.refresh(context)
        call.resolve(JSObject().put("count", count))
    }
}
