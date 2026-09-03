// Compatibility screen: the legacy route expects a default PresentListScreen export.
// Reuse the stable attendance list implementation instead of introducing a second copy.
export { AttendanceScreen as default } from './screens/ListScreens';
