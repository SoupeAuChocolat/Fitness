package fr.maforme.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/**
 * Widget d'écran d'accueil : chiffres du jour et bouton « + verre d'eau ».
 * Les verres ajoutés sont mémorisés ici et repris par l'app à son prochain passage.
 */
class WidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) appWidgetManager.updateAppWidget(id, views(context))
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_ADD_WATER) {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            prefs.edit().putInt(PENDING_WATER, prefs.getInt(PENDING_WATER, 0) + 1).apply()
            refresh(context)
        }
    }

    companion object {
        const val PREFS = "maforme_widget"
        const val PENDING_WATER = "pendingWater"
        const val ACTION_ADD_WATER = "fr.maforme.app.ADD_WATER"

        fun refresh(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, WidgetProvider::class.java))
            for (id in ids) manager.updateAppWidget(id, views(context))
        }

        // Couleurs du widget selon le thème choisi dans l'app.
        private fun applyTheme(views: RemoteViews, theme: String) {
            val (bg, accent, text, muted) = when (theme) {
                "cyberpunk" -> listOf(R.drawable.widget_bg_cyberpunk, 0xFFFCEE0A, 0xFFF4F4EE, 0xFFCFCFC4)
                "solo" -> listOf(R.drawable.widget_bg_solo, 0xFF6CBCFF, 0xFFE6F1FF, 0xFFB5CAE6)
                else -> listOf(R.drawable.widget_bg, 0xFF0B8159, 0xFF121614, 0xFF4A504C)
            }.map { it.toLong() }
            views.setInt(R.id.w_root, "setBackgroundResource", bg.toInt())
            views.setTextColor(R.id.w_title, accent.toInt())
            views.setTextColor(R.id.w_kcal, if (theme == "default") text.toInt() else accent.toInt())
            views.setTextColor(R.id.w_kcal_label, muted.toInt())
            for (id in listOf(R.id.w_eaten, R.id.w_steps, R.id.w_sport, R.id.w_water)) views.setTextColor(id, text.toInt())
        }

        private fun views(context: Context): RemoteViews {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val pending = prefs.getInt(PENDING_WATER, 0)
            val water = (prefs.getString("waterCount", "0")?.toIntOrNull() ?: 0) + pending
            val goal = prefs.getString("waterGoal", "8") ?: "8"

            val views = RemoteViews(context.packageName, R.layout.widget_maforme)
            views.setTextViewText(R.id.w_kcal, prefs.getString("kcalLeft", "—"))
            views.setTextViewText(R.id.w_kcal_label, prefs.getString("kcalLabel", "kcal restantes"))
            views.setTextViewText(R.id.w_eaten, prefs.getString("eaten", ""))
            views.setTextViewText(R.id.w_steps, prefs.getString("steps", ""))
            views.setTextViewText(R.id.w_sport, prefs.getString("sport", ""))
            views.setTextViewText(R.id.w_water, "💧 $water / $goal verres")
            applyTheme(views, prefs.getString("theme", "default") ?: "default")

            context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { intent ->
                val open = PendingIntent.getActivity(
                    context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )
                views.setOnClickPendingIntent(R.id.w_root, open)
            }
            val addWater = Intent(context, WidgetProvider::class.java).setAction(ACTION_ADD_WATER)
            val addPending = PendingIntent.getBroadcast(
                context, 1, addWater, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            views.setOnClickPendingIntent(R.id.w_water_btn, addPending)
            return views
        }
    }
}
