/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export interface LogSummary {
  text: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SummaryHandler = (payload: any) => string | null;

// Handlers for specific CDP methods (used both top-level and nested)
// Returns the *suffix* to append to the method name (e.g. " [type] url")
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const methodHandlers: Record<string, (params: any) => string | null> = {
  'Target.attachedToTarget': (p) => {
    const info = p.targetInfo;
    const type = info?.type ? ` [${info.type}]` : '';
    const url = info?.url ? ` ${info.url}` : '';
    return `${type}${url}`;
  },
  'Target.detachedFromTarget': (p) => {
    return p.targetId ? ` ${p.targetId.slice(-4)}` : '';
  },
  'Runtime.consoleAPICalled': (p) => {
    const type = p.type ? ` [${p.type}]` : '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args = p.args?.map((a: any) => a.value).join(' ') || '';
    const truncatedArgs = args.length > 50 ? ` ${args.slice(0, 50)}...` : ` ${args}`;
    return `${type}${truncatedArgs}`;
  },
  'Page.frameNavigated': (p) => {
    return p.frame?.url ? ` ${p.frame.url}` : '';
  },
  'Network.requestWillBeSent': (p) => {
    const reqMethod = p.request?.method ? ` ${p.request.method}` : '';
    const url = p.request?.url ? ` ${p.request.url}` : '';
    return `${reqMethod}${url}`;
  },
  'Log.entryAdded': (p) => {
    const level = p.entry?.level ? ` [${p.entry.level}]` : '';
    const text = p.entry?.text ? ` ${p.entry.text}` : '';
    return `${level}${text}`;
  },
  'Security.setIgnoreCertificateErrors': (p) => {
    return `(${p.ignore})`;
  },
  'Target.setDiscoverTargets': (p) => {
    return `(${p.discover})`;
  },
  'Target.setAutoAttach': (p) => {
    const parts = [`${p.autoAttach}`];
    if (p.filter) {
      // Filter can be complex, just hint it exists or simplistic view
      parts.push('filter');
    }
    return `(${parts.join(', ')})`;
  },
  'Page.lifecycleEvent': (p) => {
    return `(${p.name})`;
  },
  'Network.dataReceived': (p) => {
    return `(${p.dataLength})`;
  },
  'Page.frameStartedNavigating': (p) => {
    return `(${p.navigationType}, ${p.url})`;
  },
  'Network.responseReceived': (p) => {
    return `(${p.type}, ${p.response?.url})`;
  },
  'Page.setPrerenderingAllowed': (p) => {
    return `(${p.isAllowed})`;
  },
};

const handlers: Record<string, SummaryHandler> = {
  'Runtime.bindingCalled': (payload) => {
    // Check if payload is the root object (has params) or the params itself
    const params = payload?.params || payload;

    // Check for "name" at least.
    if (params?.name) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let inner: any = null;

      if (typeof params.payload === 'string') {
        try {
          inner = JSON.parse(params.payload);
        } catch {
          // Ignore
        }
      } else if (typeof params.payload === 'object') {
        inner = params.payload;
      }

      if (inner) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let messages: any[] = [];

        // Normalize to array of objects
        if (Array.isArray(inner)) {
          messages = inner;
        } else if (Array.isArray(inner?.messages)) {
          messages = inner.messages;
        } else if (inner && typeof inner === 'object') {
          messages = [inner];
        }

        if (messages.length > 0) {
          const summaries = messages
            .map((m: any) => {
              // Handle double-encoded message string
              if (typeof m === 'string' && m.startsWith('{')) {
                try {
                  m = JSON.parse(m);
                } catch {
                  // Ignore
                }
              }

              const method = m.method || m.name || '';
              const p = m.params || {};

              // Use specific handler if available
              if (methodHandlers[method]) {
                return `${method}${methodHandlers[method](p)}`;
              }

              // Generic Fallback
              const type = p.type ? ` [${p.type}]` : '';
              const tId = p.targetId ? ` ${p.targetId.slice(-4)}` : '';

              if (method) {
                return `${method}${type}${tId}`;
              }
              return '';
            })
            .filter(Boolean);

          if (summaries.length > 0) {
            return summaries.join(', ');
          }

          // Fallback: If parsed but no method found, show keys to debug
          const keys = Array.isArray(inner) ? 'Array' : Object.keys(inner).join(',');
          return `${params.name}: (No method, keys: ${keys})`;
        }
      }
      return params.name;
    }
    return null;
  },
  GetWindows: (payload) => {
    // WebDriver response: { value: [...] }
    if (Array.isArray(payload?.value)) {
      return `Windows: ${payload.value.join(', ')}`;
    }
    return null;
  },
  'Page.getFrameTree': (payload) => {
    // CDP Response: { result: { frameTree: ... } } or just { frameTree: ... }
    const res = payload?.result || payload;

    if (res?.frameTree?.frame?.url) {
      return `Top Frame: ${res.frameTree.frame.url}`;
    }
    return null;
  },
};

/**
 * Returns a concise summary string for a given log entry if available.
 */

export function getInlineLogSummary(
  method: string | undefined,
  _type: 'command' | 'response' | 'event',
  payload: any,
): string | null {
  if (!method || !payload) return null;

  // Direct match handler (Top Level)
  if (handlers[method]) {
    return handlers[method](payload);
  }

  // Method handlers (Top Level Generic)
  if (method && methodHandlers[method]) {
    // Let's assume payload IS the params object for simpler commands, OR payload.params exists.
    const params = payload.params || payload;
    return `${method}${methodHandlers[method](params)}`;
  }

  // Generic fallbacks or heuristics could go here
  return null;
}
