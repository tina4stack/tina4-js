// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

/**
 * Browser-side Web Push setup.
 *
 * Delivery and VAPID signing belong to the backend frameworks. This helper
 * only handles permission, service-worker registration, and subscription
 * serialisation so the resulting object can be sent to a Tina4 API.
 */

export interface PushClientOptions {
  /** Base64url VAPID public key issued by the backend. */
  applicationServerKey: string | Uint8Array;
  /** Use a known registration, otherwise wait for navigator.serviceWorker.ready. */
  serviceWorker?: ServiceWorkerRegistration;
  userVisibleOnly?: boolean;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeBase64Url(value: ArrayBuffer | ArrayBufferView): string {
  const bytes = value instanceof ArrayBuffer
    ? new Uint8Array(value)
    : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function requireSupported(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || typeof PushManager === 'undefined') {
    throw new Error('Web Push is not supported in this browser');
  }
  if (typeof Notification === 'undefined') {
    throw new Error('Web Push requires the browser Notification API');
  }
}

async function registrationFor(options: PushClientOptions): Promise<ServiceWorkerRegistration> {
  requireSupported();
  return options.serviceWorker ?? navigator.serviceWorker.ready;
}

export const push = {
  supported(): boolean {
    return typeof navigator !== 'undefined'
      && 'serviceWorker' in navigator
      && typeof PushManager !== 'undefined'
      && typeof Notification !== 'undefined';
  },

  async permission(): Promise<NotificationPermission> {
    requireSupported();
    return Notification.permission;
  },

  async requestPermission(): Promise<NotificationPermission> {
    requireSupported();
    return Notification.requestPermission();
  },

  async subscribe(options: PushClientOptions): Promise<PushSubscriptionData> {
    const registration = await registrationFor(options);
    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
    if (permission !== 'granted') throw new Error(`Web Push permission was ${permission}`);
    const applicationServerKey = typeof options.applicationServerKey === 'string'
      ? decodeBase64Url(options.applicationServerKey)
      : options.applicationServerKey;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: options.userVisibleOnly ?? true,
      applicationServerKey: applicationServerKey as unknown as BufferSource,
    });
    return this.serialize(subscription);
  },

  async current(options: Pick<PushClientOptions, 'serviceWorker'> = {}): Promise<PushSubscriptionData | null> {
    const registration = await registrationFor({ applicationServerKey: new Uint8Array(), ...options });
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? this.serialize(subscription) : null;
  },

  async unsubscribe(options: Pick<PushClientOptions, 'serviceWorker'> = {}): Promise<boolean> {
    const registration = await registrationFor({ applicationServerKey: new Uint8Array(), ...options });
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? subscription.unsubscribe() : false;
  },

  serialize(subscription: globalThis.PushSubscription): PushSubscriptionData {
    const json = subscription.toJSON();
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!p256dh || !auth) throw new Error('Browser returned an incomplete Web Push subscription');
    return {
      endpoint: subscription.endpoint,
      keys: { p256dh, auth },
    };
  },

  /** Exposed for tests and non-browser adapters that need the Web Push key bytes. */
  decodeApplicationServerKey: decodeBase64Url,
  encodeKey: encodeBase64Url,
};
