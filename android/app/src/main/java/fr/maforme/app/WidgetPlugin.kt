package fr.maforme.app

import android.content.Context
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/** Reçoit les chiffres du jour depuis le JavaScript et rafraîchit le widget. */
@CapacitorPlugin(name = "MaFormeWidget")
class WidgetPlugin : Plugin() {
    private val keys = listOf("kcalLeft", "kcalLabel", "eaten", "steps", "sport")

    @PluginMethod
    fun update(call: PluginCall) {
        val editor = context.getSharedPreferences(WidgetProvider.PREFS, Context.MODE_PRIVATE).edit()
        for (key in keys) editor.putString(key, call.getString(key) ?: "")
        editor.apply()
        WidgetProvider.refresh(context)
        call.resolve()
    }
}
