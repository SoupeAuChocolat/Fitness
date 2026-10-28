package fr.maforme.app

import android.content.Intent
import android.net.Uri
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateGroupByPeriodRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.time.Duration
import java.time.LocalDate
import java.time.Period
import java.time.ZoneId

/**
 * Lecture des pas et du sommeil dans Health Connect (« Connexion Santé »).
 * Les dates échangées avec le JavaScript sont des jours locaux « AAAA-MM-JJ ».
 */
@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val stepsPermission = HealthPermission.getReadPermission(StepsRecord::class)
    private val sleepPermission = HealthPermission.getReadPermission(SleepSessionRecord::class)
    private val permissionContract = PermissionController.createRequestPermissionResultContract()

    private val awakeStages = setOf(
        SleepSessionRecord.STAGE_TYPE_AWAKE,
        SleepSessionRecord.STAGE_TYPE_AWAKE_IN_BED,
        SleepSessionRecord.STAGE_TYPE_OUT_OF_BED,
    )

    private fun isAvailable() = HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE

    private fun client(call: PluginCall): HealthConnectClient? {
        if (!isAvailable()) {
            call.reject("Connexion Santé n'est pas disponible sur ce téléphone", "UNAVAILABLE")
            return null
        }
        return HealthConnectClient.getOrCreate(context)
    }

    private fun run(call: PluginCall, block: suspend () -> Unit) {
        scope.launch {
            try {
                block()
            } catch (e: Exception) {
                call.reject(e.message ?: e.javaClass.simpleName, e)
            }
        }
    }

    private fun dateRange(call: PluginCall): Pair<LocalDate, LocalDate>? {
        val start = call.getString("start")
        val end = call.getString("end")
        if (start == null || end == null) {
            call.reject("Paramètres start et end obligatoires")
            return null
        }
        return LocalDate.parse(start) to LocalDate.parse(end)
    }

    private suspend fun grantedResult(client: HealthConnectClient): JSObject {
        val granted = client.permissionController.getGrantedPermissions()
        return JSObject()
            .put("steps", stepsPermission in granted)
            .put("sleep", sleepPermission in granted)
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        val status = when (HealthConnectClient.getSdkStatus(context)) {
            HealthConnectClient.SDK_AVAILABLE -> "available"
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "update_required"
            else -> "unavailable"
        }
        if (status != "available") {
            call.resolve(JSObject().put("status", status).put("steps", false).put("sleep", false))
            return
        }
        run(call) {
            call.resolve(grantedResult(HealthConnectClient.getOrCreate(context)).put("status", status))
        }
    }

    @PluginMethod
    fun authorize(call: PluginCall) {
        if (client(call) == null) return
        val intent = permissionContract.createIntent(context, setOf(stepsPermission, sleepPermission))
        startActivityForResult(call, intent, "authorizeResult")
    }

    @ActivityCallback
    private fun authorizeResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        run(call) { call.resolve(grantedResult(HealthConnectClient.getOrCreate(context))) }
    }

    /** Pas par jour, agrégés par Health Connect (sans double comptage entre téléphone et montre). */
    @PluginMethod
    fun readSteps(call: PluginCall) {
        val client = client(call) ?: return
        val (start, end) = dateRange(call) ?: return
        run(call) {
            val buckets = client.aggregateGroupByPeriod(
                AggregateGroupByPeriodRequest(
                    metrics = setOf(StepsRecord.COUNT_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(start.atStartOfDay(), end.plusDays(1).atStartOfDay()),
                    timeRangeSlicer = Period.ofDays(1),
                ),
            )
            val days = JSArray()
            for (bucket in buckets) {
                val steps = bucket.result[StepsRecord.COUNT_TOTAL] ?: continue
                days.put(JSObject().put("date", bucket.startTime.toLocalDate().toString()).put("steps", steps))
            }
            call.resolve(JSObject().put("days", days))
        }
    }

    /**
     * Minutes de sommeil par nuit, rattachées au jour du réveil. Les phases d'éveil sont exclues.
     * Si plusieurs apps enregistrent la même nuit, on garde la source qui a le plus de données
     * au lieu de les additionner.
     */
    @PluginMethod
    fun readSleep(call: PluginCall) {
        val client = client(call) ?: return
        val (start, end) = dateRange(call) ?: return
        val zone = ZoneId.systemDefault()
        run(call) {
            val perSource = mutableMapOf<String, MutableMap<String, Long>>() // jour -> (app -> minutes)
            var pageToken: String? = null
            do {
                val response = client.readRecords(
                    ReadRecordsRequest(
                        recordType = SleepSessionRecord::class,
                        timeRangeFilter = TimeRangeFilter.between(
                            start.minusDays(1).atStartOfDay(zone).toInstant(),
                            end.plusDays(1).atStartOfDay(zone).toInstant(),
                        ),
                        pageToken = pageToken,
                    ),
                )
                for (session in response.records) {
                    val day = session.endTime.atZone(zone).toLocalDate()
                    if (day < start || day > end) continue
                    val minutes = if (session.stages.isNotEmpty()) {
                        session.stages.filter { it.stage !in awakeStages }
                            .sumOf { Duration.between(it.startTime, it.endTime).toMinutes() }
                    } else {
                        Duration.between(session.startTime, session.endTime).toMinutes()
                    }
                    val source = session.metadata.dataOrigin.packageName
                    perSource.getOrPut(day.toString()) { mutableMapOf() }.merge(source, minutes, Long::plus)
                }
                pageToken = response.pageToken
            } while (pageToken != null)

            val days = JSArray()
            for ((day, sources) in perSource.toSortedMap()) {
                days.put(JSObject().put("date", day).put("minutes", sources.values.max()))
            }
            call.resolve(JSObject().put("days", days))
        }
    }

    /** Ouvre l'écran Connexion Santé (ou sa fiche Play Store si l'app manque). */
    @PluginMethod
    fun openSettings(call: PluginCall) {
        val intent = if (isAvailable()) {
            Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS)
        } else {
            Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.apps.healthdata"))
        }
        try {
            activity.startActivity(intent)
            call.resolve()
        } catch (e: Exception) {
            call.reject("Impossible d'ouvrir Connexion Santé", e)
        }
    }

    override fun handleOnDestroy() {
        scope.cancel()
        super.handleOnDestroy()
    }
}
