/* Deprecated v3 station-map shim. The old implementation mutated nodes inside the React root
 * and could trigger NotFoundError/removeChild. The safe implementation is station-admin-tabs-v4.js,
 * which mounts only into #kh-line-admin-host outside React. Kept as a no-op for cache/legacy callers. */
(function(){'use strict';window.__KH_STATION_MAP_V3__=true;})();
