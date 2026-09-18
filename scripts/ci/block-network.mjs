/**
 * Preload that makes any network call fail.
 *
 * Used to prove `next build` reads only committed JSON. Blocking a proxy does
 * not test this — Node's fetch ignores HTTP(S)_PROXY entirely, so a
 * proxy-blackholed build passes whether or not it makes requests. Replacing the
 * primitives catches the attempt however the runtime is configured to route.
 */
const blocked = (what) => () => {
  throw new Error(
    `Network call via ${what} during build. The site must read only committed JSON.`,
  );
};

globalThis.fetch = blocked('fetch');

const http = await import('node:http');
const https = await import('node:https');
for (const mod of [http.default, https.default]) {
  mod.request = blocked('http.request');
  mod.get = blocked('http.get');
}
