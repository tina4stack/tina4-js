// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import { describe, expect, it } from 'vitest';
import { push } from '../src/push';

describe('web push client helper', () => {
  it('decodes a base64url application server key', () => {
    expect(Array.from(push.decodeApplicationServerKey('AQID-_8'))).toEqual([1, 2, 3, 251, 255]);
  });

  it('serializes the browser subscription shape for a backend', () => {
    const subscription = {
      endpoint: 'https://push.example/subscription',
      toJSON: () => ({ keys: { p256dh: 'client-key', auth: 'auth-key' } }),
    } as unknown as globalThis.PushSubscription;
    expect(push.serialize(subscription)).toEqual({
      endpoint: 'https://push.example/subscription',
      keys: { p256dh: 'client-key', auth: 'auth-key' },
    });
  });
});

