export type UiLocale = 'zh' | 'en';
export type InterfaceMode = 'user' | 'developer';

export interface HostBridge {
  embedded: boolean;
  dispose: () => void;
}

/**
 * Only opt-in, same-origin iframes can exchange host messages.
 * No origin, token or redirect destination is accepted from a URL parameter.
 */
export function setupHostBridge(
  onLanguage: (locale: UiLocale) => void,
  onExport: () => unknown,
  onInterfaceMode: (mode: InterfaceMode) => void = () => {},
): HostBridge {
  if (typeof window === 'undefined') return { embedded: false, dispose: () => {} };

  const embedded = new URLSearchParams(window.location.search).get('embedded') === '1'
    && window.parent !== window;
  if (!embedded) return { embedded: false, dispose: () => {} };

  const host = window.parent;
  const origin = window.location.origin;
  // Opaque origins are never trusted, even if an incoming event also says "null".
  if (origin === 'null') return { embedded: false, dispose: () => {} };

  let disposed = false;
  const replyError = (requestId: string | number) => {
    if (disposed) return;
    host.postMessage({
      type: 'vf:project-export',
      requestId,
      error: { code: 'EXPORT_FAILED' },
    }, origin);
  };
  const onMessage = (event: MessageEvent) => {
    if (disposed || event.source !== host || event.origin !== origin) return;
    const data: unknown = event.data;
    if (!data || typeof data !== 'object' || !('type' in data)) return;

    if (data.type === 'vf:ui-language' && 'lang' in data) {
      if (data.lang === 'zh' || data.lang === 'en') onLanguage(data.lang);
      return;
    }

    if (data.type === 'vf:interface-mode' && 'mode' in data) {
      if (data.mode === 'user' || data.mode === 'developer') onInterfaceMode(data.mode);
      return;
    }

    if (data.type !== 'vf:export-project' || !('requestId' in data)) return;
    const requestId = data.requestId;
    if (typeof requestId !== 'string' && typeof requestId !== 'number') return;
    if (typeof requestId === 'number' && !Number.isFinite(requestId)) return;
    // Await async serializers while preserving the original correlation identifier.
    Promise.resolve().then(onExport).then((payload) => {
      if (!disposed) host.postMessage({ type: 'vf:project-export', requestId, payload }, origin);
    }).catch(() => replyError(requestId));
  };

  window.addEventListener('message', onMessage);
  host.postMessage({
    type: 'vf:tool-ready',
    protocolVersion: 1,
    toolType: 'icons',
    requests: ['vf:ui-language', 'vf:interface-mode'],
  }, origin);

  return {
    embedded: true,
    dispose: () => {
      disposed = true;
      window.removeEventListener('message', onMessage);
    },
  };
}
