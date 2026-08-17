import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { gzipSync } from 'zlib';

function readBuiltBundle(path: string): Buffer {
  if (!existsSync(path)) {
    throw new Error(`${path} not found — the bundle-size gate requires a production build`);
  }
  return readFileSync(path);
}

describe('bundle size', () => {
  it('core bundle (signals + html + component) is under 3KB gzipped', () => {
    const path = './dist/core.es.js';
    const bundle = readBuiltBundle(path);
    const gzipped = gzipSync(bundle);
    const sizeKB = gzipped.length / 1024;

    console.log(`Core: ${bundle.length}B raw, ${gzipped.length}B gzip (${sizeKB.toFixed(2)}KB)`);
    expect(sizeKB).toBeLessThan(3);
  });

  it('router bundle is under 2KB gzipped', () => {
    const path = './dist/router.es.js';
    const bundle = readBuiltBundle(path);
    const gzipped = gzipSync(bundle);
    const sizeKB = gzipped.length / 1024;

    console.log(`Router: ${bundle.length}B raw, ${gzipped.length}B gzip (${sizeKB.toFixed(2)}KB)`);
    expect(sizeKB).toBeLessThan(2);
  });

  it('api bundle is under 2.5KB gzipped', () => {
    const path = './dist/api.es.js';
    const bundle = readBuiltBundle(path);
    const gzipped = gzipSync(bundle);
    const sizeKB = gzipped.length / 1024;

    console.log(`API: ${bundle.length}B raw, ${gzipped.length}B gzip (${sizeKB.toFixed(2)}KB)`);
    expect(sizeKB).toBeLessThan(2.5);
  });

  it('pwa bundle is under 2KB gzipped', () => {
    const path = './dist/pwa.es.js';
    const bundle = readBuiltBundle(path);
    const gzipped = gzipSync(bundle);
    const sizeKB = gzipped.length / 1024;

    console.log(`PWA: ${bundle.length}B raw, ${gzipped.length}B gzip (${sizeKB.toFixed(2)}KB)`);
    expect(sizeKB).toBeLessThan(2);
  });

  it('ws bundle is under 1.5KB gzipped', () => {
    const path = './dist/ws.es.js';
    const bundle = readBuiltBundle(path);
    const gzipped = gzipSync(bundle);
    const sizeKB = gzipped.length / 1024;

    console.log(`WS: ${bundle.length}B raw, ${gzipped.length}B gzip (${sizeKB.toFixed(2)}KB)`);
    expect(sizeKB).toBeLessThan(1.5);
  });

  it('sse bundle is under 1.5KB gzipped', () => {
    const path = './dist/sse.es.js';
    const bundle = readBuiltBundle(path);
    const gzipped = gzipSync(bundle);
    const sizeKB = gzipped.length / 1024;

    console.log(`SSE: ${bundle.length}B raw, ${gzipped.length}B gzip (${sizeKB.toFixed(2)}KB)`);
    expect(sizeKB).toBeLessThan(1.5);
  });

  it('full framework re-export is under 0.5KB gzipped', () => {
    const path = './dist/tina4.es.js';
    const bundle = readBuiltBundle(path);
    const gzipped = gzipSync(bundle);
    const sizeKB = gzipped.length / 1024;

    console.log(`Re-export barrel: ${bundle.length}B raw, ${gzipped.length}B gzip (${sizeKB.toFixed(2)}KB)`);
    expect(sizeKB).toBeLessThan(0.5);
  });
});
