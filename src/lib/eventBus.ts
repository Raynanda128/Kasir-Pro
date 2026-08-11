const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('kasirpro_sync_bus') : null;
const syncListeners = new Set<(entity: string) => void>();

export function notifyDataChange(entity: string) {
  syncListeners.forEach(listener => listener(entity));
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'DATA_CHANGE', entity, time: Date.now() });
    } catch (e) {}
  }
}

export function addSyncListener(fn: (entity: string) => void) {
  syncListeners.add(fn);
  return () => {
    syncListeners.delete(fn);
  };
}

if (syncChannel) {
  syncChannel.onmessage = (e) => {
    if (e.data && e.data.type === 'DATA_CHANGE') {
      syncListeners.forEach(listener => listener(e.data.entity));
    }
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('kasirpro_')) {
      const entity = e.key.replace('kasirpro_', '');
      syncListeners.forEach(listener => listener(entity));
    }
  });
}
