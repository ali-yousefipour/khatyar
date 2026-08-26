package expo.modules.securitycheck

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.NetworkInterface
import java.util.Collections

class SecurityCheckModule : Module() {

  private fun context(): Context? = appContext.reactContext ?: appContext.currentActivity

  private fun readDeveloperModeEnabled(): Boolean {
    return try {
      val resolver = context()?.contentResolver ?: return false
      Settings.Global.getInt(resolver, Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) != 0
    } catch (_: Exception) { false }
  }

  /**
   * Returns OS-level VPN diagnostics. Compatible with Android 8 (API 26)+.
   * No privileged permission is required. Public IP/country is intentionally
   * resolved in JavaScript/server; Android remains the source of truth for
   * TRANSPORT_VPN and active tunnel interfaces.
   */
  private fun readVpnNetworkInfo(): Map<String, Any?> {
    var transportVpn = false
    var networkType = "unknown"
    val dnsServers = mutableListOf<String>()
    val interfaces = mutableListOf<String>()

    try {
      val cm = context()?.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
      val active = cm?.activeNetwork
      val caps = if (active != null) cm.getNetworkCapabilities(active) else null
      transportVpn = caps?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) == true
      networkType = when {
        caps?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) == true -> "vpn"
        caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true -> "wifi"
        caps?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true -> "cellular"
        caps?.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) == true -> "ethernet"
        else -> "unknown"
      }
      if (active != null) {
        cm.getLinkProperties(active)?.dnsServers?.forEach { addr ->
          addr.hostAddress?.let { if (it.isNotBlank()) dnsServers.add(it) }
        }
      }
    } catch (_: Exception) { }

    try {
      val all = NetworkInterface.getNetworkInterfaces()
      if (all != null) {
        for (iface in Collections.list(all)) {
          if (iface.isUp && !iface.isLoopback) interfaces.add(iface.name ?: "")
        }
      }
    } catch (_: Exception) { }

    val tunnelNames = interfaces.filter { name ->
      val n = name.lowercase()
      n.startsWith("tun") || n.startsWith("tap") || n.startsWith("ppp") ||
        n.startsWith("wg") || n.startsWith("ipsec") || n.startsWith("pptp")
    }
    val activeTunnelNames = mutableListOf<String>()
    try {
      val all = NetworkInterface.getNetworkInterfaces()
      if (all != null) {
        for (iface in Collections.list(all)) {
          val n = (iface.name ?: "").lowercase()
          val isTunnel = n.startsWith("tun") || n.startsWith("tap") || n.startsWith("ppp") ||
            n.startsWith("wg") || n.startsWith("ipsec") || n.startsWith("pptp")
          if (isTunnel && iface.isUp && !iface.isLoopback && Collections.list(iface.inetAddresses).any { !it.isLoopbackAddress }) {
            activeTunnelNames.add(iface.name ?: "")
          }
        }
      }
    } catch (_: Exception) { }

    return mapOf(
      "transportVpn" to transportVpn,
      "networkType" to networkType,
      "interfaces" to interfaces.distinct(),
      "tunnelInterfaces" to tunnelNames.distinct(),
      "activeTunnelInterfaces" to activeTunnelNames.distinct(),
      "dnsServers" to dnsServers.distinct(),
      "sdkInt" to Build.VERSION.SDK_INT
    )
  }

  override fun definition() = ModuleDefinition {
    Name("SecurityCheck")

    Function("isDeveloperModeEnabledSync") { readDeveloperModeEnabled() }
    AsyncFunction("isDeveloperModeEnabled") { readDeveloperModeEnabled() }
    AsyncFunction("getVpnNetworkInfoAsync") { readVpnNetworkInfo() }
  }
}
