import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

it("loads Firebase Admin and resolves RSA signing keys without require(esm)", () => {
  // Reproduce the CommonJS loader restriction seen in the deployed function.
  const output = execFileSync(
    process.execPath,
    [
      "--no-experimental-require-module",
      "-e",
      `
      const assert = require('node:assert/strict');
      const crypto = require('node:crypto');
      const { createRequire } = require('node:module');
      const { getAuth } = require('firebase-admin/auth');
      assert.equal(typeof getAuth, 'function');
      const adminRequire = createRequire(require.resolve('firebase-admin/auth'));
      const jwksClient = adminRequire('jwks-rsa');
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });
      const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test', use: 'sig', alg: 'RS256' };
      const client = jwksClient({
        jwksUri: 'https://example.invalid/jwks',
        fetcher: async () => ({ keys: [jwk] }),
      });
      (async () => {
        const key = await client.getSigningKey('test');
        const message = Buffer.from('runtime compatibility check');
        const signature = crypto.sign('RSA-SHA256', message, privateKey);
        assert.ok(crypto.verify('RSA-SHA256', message, key.getPublicKey(), signature));
        assert.equal(crypto.verify('RSA-SHA256', Buffer.from('tampered'), key.getPublicKey(), signature), false);
        console.log('ok');
      })().catch(error => { console.error(error); process.exitCode = 1; });
    `,
    ],
    { encoding: "utf8", timeout: 10_000 },
  );
  expect(output.trim()).toBe("ok");
});
