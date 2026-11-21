// Small in-memory handoff between the request gate and its mounted wizard.
// Navigating to a route is not proof the user can interact with that screen.
const observers = new Set();
export function onPresenceWizardState(listener) {
  observers.add(listener);
  return () => observers.delete(listener);
}
export function emitPresenceWizardState(requestId, state) {
  const event = { requestId: String(requestId || ''), state };
  for (const observer of observers) {
    try { observer(event); } catch (_) {}
  }
}
