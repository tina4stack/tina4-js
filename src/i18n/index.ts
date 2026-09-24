// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

/**
 * tina4js/i18n — Reactive internationalization and localization.
 *
 * Translations (key-based, fallback, {placeholder} interpolation) plus
 * Intl-backed number / currency / date / relative-time formatting and an
 * RTL direction helper. The active locale is a signal, so everything
 * re-renders in place on setLocale().
 */
export { createI18n, i18n, t, setLocale, getLocale } from './i18n';
export type { I18n, I18nOptions, Messages, LocaleMessages } from './i18n';
