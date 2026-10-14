'use client';

import { REQUESTER_STORAGE_KEY, type RequesterDraft, restoreRequester } from '@pyp/shared';

// The requester's data in localStorage (pyp.requester.v1, APP-FLOW §4.5): read to prefill the
// form, written after a valid submission. Never throws: without storage the form starts empty.

export function loadRequester(now: Date = new Date()): RequesterDraft {
  try {
    const raw = window.localStorage.getItem(REQUESTER_STORAGE_KEY);
    return raw ? restoreRequester(JSON.parse(raw), now) : {};
  } catch {
    return {};
  }
}

export function saveRequester(draft: RequesterDraft, now: Date = new Date()): void {
  try {
    window.localStorage.setItem(
      REQUESTER_STORAGE_KEY,
      JSON.stringify({ savedAt: now.toISOString(), draft }),
    );
  } catch {
    // Strict private mode: nothing is remembered, the form still works.
  }
}
