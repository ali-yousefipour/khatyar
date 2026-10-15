import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

let owner = null;
let availableAt = 0;

export function isCameraInUse() {
  return owner !== null || Date.now() < availableAt;
}

export function useCameraSession(enabled) {
  const token = useRef(Symbol('camera'));
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [acquired, setAcquired] = useState(false);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!enabled || !foreground) return undefined;
    const acquire = () => {
      if (!isCameraInUse()) {
        owner = token.current;
        setAcquired(true);
      }
    };
    acquire();
    const timer = setInterval(acquire, 250);
    return () => {
      clearInterval(timer);
      setAcquired(false);
      if (owner === token.current) {
        owner = null;
        availableAt = Date.now() + 350;
      }
    };
  }, [enabled, foreground, generation]);

  return { cameraActive: enabled && foreground && acquired, cameraKey: generation,
    restartCamera: () => { setAcquired(false); setGeneration(value => value + 1); } };
}
