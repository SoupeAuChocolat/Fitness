package fr.maforme.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews

/** Widget d'écran d'accueil : chiffres du jour, mis à jour par l'app à chaque changement. */
class WidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) appWidgetManager.updateAppWidget(id, views(context))
    }

    companion object {
        const val PREFS = "maforme_widget"

        fun refresh(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, WidgetProvider::class.java))
            for (id in ids) manager.updateAppWidget(id, views(context))
        }

        private fun views(context: Context): RemoteViews {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val views = RemoteViews(context.packageName, R.layout.widget_maforme)
            views.setTextViewText(R.id.w_kcal, prefs.getString("kcalLeft", "—"))
            views.setTextViewText(R.id.w_kcal_label, prefs.getString("kcalLabel", "kcal restantes"))
            views.setTextViewText(R.id.w_eaten, prefs.getString("eaten", ""))
            views.setTextViewText(R.id.w_steps, prefs.getString("steps", ""))
            views.setTextViewText(R.id.w_sport, prefs.getString("sport", ""))
            context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { intent ->
                val pending = PendingIntent.getActivity(
                    context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )
                views.setOnClickPendingIntent(R.id.w_root, pending)
            }
            return views
        }
    }
}
