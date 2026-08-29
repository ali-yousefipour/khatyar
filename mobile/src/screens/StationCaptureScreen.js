// Canonical station wizard entry point.
// V5 implements the documented six-step flow: precise/manual location,
// five nearest lines, line search without exposing internal IDs, sign-photo
// capture with confirmation, station photo, full address, final review/save,
// and edit support through stationId route params.
export { default } from './StationCaptureV5Screen';
