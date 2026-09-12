// Isolated browsers and synthetic QA records only; no real user vault is opened.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import env from '@next/env';
import { totp, removeQaFactor } from './vault-qa-totp.mjs';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { build } from 'esbuild';

if (process.env.DIARYDOCK_E2E_CONFIRM !== 'two-test-accounts') throw new Error('QA opt-in required.');
env.loadEnvConfig(process.cwd());
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const base = process.env.VAULT_E2E_ORIGIN || 'http://127.0.0.1:3027';
const out = '.qa-password-vault'; await fs.mkdir(out, { recursive: true });
const [actor] = JSON.parse(await fs.readFile('.qa-web-e2e/accounts.json', 'utf8'));
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
const user = await admin.auth.admin.getUserById(actor.id);
assert.equal(user.data.user?.user_metadata?.purpose, 'diarydock-web-e2e');
assert.equal(user.data.user?.email, actor.email);
const existing = await admin.from('password_vaults').select('user_id').eq('user_id', actor.id).maybeSingle();
assert.equal(existing.error, null); assert.equal(existing.data, null, 'Refusing to overwrite an existing QA vault');
const cookies = new Map();
const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => [...cookies.values()], setAll: values => values.forEach(v => cookies.set(v.name, v)) },
  });
const signedIn = await auth.auth.signInWithPassword({ email: actor.email, password: actor.password });
assert.equal(signedIn.error, null);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addCookies([...cookies.values()].map(({ name, value }) => ({ name, value, url: base, sameSite: 'Lax' })));
const page = await context.newPage();
await page.clock.install();
const errors = [], transmitted = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (request.url().endsWith('/api/password-vault') && request.method() === 'POST') transmitted.push(request.postData()); });
const passphrase = 'Synthetic vault passphrase for UI QA';
const secret = 'Synthetic-UI-secret-Only!';
let created = false;
let qaFactorId, qaFactorSecret;
const originalFactors = new Set(user.data.user.factors?.map(f => f.id) ?? []);
const pass = name => console.log(`PASS ${name}`);
async function unlock(target) {
  await target.getByLabel('Vault passphrase', { exact: true }).fill(passphrase);
  await target.getByRole('button', { name: 'Unlock vault', exact: true }).click();
  await target.getByRole('button', { name: /^(Add account|Add)$/ }).waitFor();
}
try {
  const response = await page.goto(`${base}/passwords`);
  const cspHeader = response.headers()['content-security-policy'];
  assert.ok(cspHeader && !cspHeader.split(';').find(s => s.trim().startsWith('script-src ')).includes("'unsafe-inline'"));
  const nonce = /'nonce-([^']+)'/.exec(cspHeader)[1];
  const html = await response.text();
  const scriptTags = [...html.matchAll(/<script\b[^>]*>/g)].map(match => match[0]);
  assert.ok(scriptTags.length > 0 && scriptTags.every(tag => tag.includes('nonce="' + nonce + '"')));
  // strict-dynamic also permits chunks loaded by those trusted bootstrap scripts.
  const again = await context.request.get(`${base}/passwords`, { headers: { 'x-nonce': 'attacker' } });
  assert.notEqual(/'nonce-([^']+)'/.exec(again.headers()['content-security-policy'])[1], nonce);
  await context.route(base + '/passwords?vault-injection-check=1', async route => {
    const original = await route.fetch();
    const injected = (await original.text()).replace('</head>', '<script>window.__injectedVaultScript = true</script></head>');
    await route.fulfill({ response: original, body: injected });
  });
  const injectionPage = await context.newPage();
  await injectionPage.goto(base + '/passwords?vault-injection-check=1');
  assert.equal(await injectionPage.evaluate(() => Boolean(window.__injectedVaultScript)), false);
  await injectionPage.close();
  pass('fresh CSP nonces protect framework scripts and block injected inline scripts');
  await page.getByRole('button', { name: 'Set up authenticator', exact: true }).click();
  await page.locator('.vault-mfa-setup code').waitFor({ state: 'attached' });
  qaFactorSecret = await page.locator('.vault-mfa-setup code').textContent();
  const factors = (await admin.auth.admin.getUserById(actor.id)).data.user.factors;
  qaFactorId = factors.find(f => !originalFactors.has(f.id)).id;
  await page.getByLabel('Six-digit authentication code').fill(totp(qaFactorSecret));
  await page.getByRole('button', { name: 'Verify and continue', exact: true }).click();
  await page.getByLabel('Vault passphrase', { exact: true }).waitFor();
  pass('actual web authenticator enrollment and MFA verification succeed');
  await page.getByLabel('Vault passphrase', { exact: true }).fill(passphrase);
  await page.getByLabel('Confirm passphrase', { exact: true }).fill(passphrase);
  await page.getByRole('button', { name: 'Create encrypted vault', exact: true }).click();
  await page.getByRole('button', { name: 'Add account', exact: true }).waitFor();
  created = true; pass('web setup performs Argon2id under production CSP');
  await page.getByRole('button', { name: 'Add account', exact: true }).click();
  await page.getByLabel('Account or service', { exact: true }).fill('Synthetic UI login');
  await page.getByLabel('Username or email', { exact: true }).fill('qa@example.test');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  assert.equal((await page.getByLabel('Password', { exact: true }).inputValue()).length, 24);
  await page.getByLabel('Password', { exact: true }).fill(secret);
  await page.getByRole('button', { name: 'Encrypt and save', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('heading', { name: 'Synthetic UI login', exact: true }).waitFor();
  assert.equal(await page.getByText(secret, { exact: true }).count(), 0);
  pass('web generates and saves a password, hidden by default');
  await page.screenshot({ path: `${out}/web-vault.png`, fullPage: true });
  await page.reload();
  await page.getByLabel('Vault passphrase', { exact: true }).fill('Wrong synthetic passphrase');
  await page.getByRole('button', { name: 'Unlock vault', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'not correct' }).waitFor();
  await unlock(page); pass('reload locks the web vault and wrong passphrases fail');

  // Bundle the actual mobile screen with its production CSP and live API adapter.
  await build({ stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
    import {PasswordVaultScreen} from './apps/mobile/src/password-vault/PasswordVaultScreen';
    import '@diarydock/design-system/theme.css';
    import './apps/mobile/src/mobile.css';
    import './apps/mobile/src/components/mobile-navigation.css';
    import {getMobileSupabase} from './apps/mobile/src/auth/supabase-client';
    const client = getMobileSupabase();
    function Harness() {
      const [token,setToken] = React.useState(window.__vaultQA.access_token);
      React.useEffect(() => {
        const {data} = client.auth.onAuthStateChange((_event,session) => setToken(session?.access_token ?? ''));
        return () => data.subscription.unsubscribe();
      },[]);
      return React.createElement(PasswordVaultScreen,{accessToken:token,accountId:window.__vaultQA.user.id,onBack:()=>{},onNavigate:()=>{}});
    }
    await client.auth.setSession(window.__vaultQA);
    window.__qaDowngrade = () => client.auth.signInWithPassword(window.__vaultQACredentials);
    createRoot(document.getElementById('root')).render(React.createElement(Harness));`, loader: 'tsx', resolveDir: process.cwd() },
    bundle: true, minify: true, format: 'esm', outfile: `${out}/mobile.js`,
    alias: { '@mobile': path.resolve('apps/mobile/src') },
    define: { 'import.meta.env.VITE_API_ORIGIN': JSON.stringify(base), 'import.meta.env.PROD': 'false',
      'import.meta.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL),
      'import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) },
    loader: { '.png': 'dataurl', '.webp': 'dataurl' } });
  const nativeHtml = await fs.readFile('apps/mobile/index.html', 'utf8');
  const csp = /content="(default-src[^"]+)"/.exec(nativeHtml)[1];
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobileAuth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {auth:{persistSession:false,autoRefreshToken:false}});
  const mobileLogin = await mobileAuth.auth.signInWithPassword({email:actor.email,password:actor.password});
  assert.equal(mobileLogin.error,null);
  await mobileContext.addInitScript(value => {
    window.__vaultQA = value.session;
    window.__vaultQACredentials = value.credentials;
  }, {session:mobileLogin.data.session,credentials:{email:actor.email,password:actor.password}});
  await mobileContext.route(`${base}/__qa-vault-mobile*`, async route => {
    const url = route.request().url();
    if (url.endsWith('.js')) return route.fulfill({ contentType: 'text/javascript', body: await fs.readFile(`${out}/mobile.js`) });
    if (url.endsWith('.css')) return route.fulfill({ contentType: 'text/css', body: await fs.readFile(`${out}/mobile.css`) });
    return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"><link rel="stylesheet" href="/__qa-vault-mobile.css"></head><body><div id="root"></div><script type="module" src="/__qa-vault-mobile.js"></script></body></html>` });
  });
  const mobile = await mobileContext.newPage();
  await mobile.clock.install();
  mobile.on('pageerror', error => errors.push(error.message));
  mobile.on('request', request => { if (request.url().endsWith('/api/password-vault') && request.method() === 'POST') transmitted.push(request.postData()); });
  await mobile.goto(`${base}/__qa-vault-mobile`);
  await mobile.getByLabel('Six-digit authentication code').fill('000000');
  await mobile.getByRole('button',{name:'Verify and continue',exact:true}).click();
  await mobile.getByRole('alert').filter({hasText:'could not be verified'}).waitFor();
  await mobile.getByLabel('Six-digit authentication code').fill(totp(qaFactorSecret));
  await mobile.getByRole('button',{name:'Verify and continue',exact:true}).click();
  await unlock(mobile);
  pass('actual mobile MFA rejects a wrong code and accepts the authenticator code');
  await mobile.getByRole('heading', { name: 'Synthetic UI login', exact: true }).waitFor();
  pass('actual mobile screen decrypts the web-created login');
  await mobile.getByRole('button', { name: 'Edit', exact: true }).click();
  await mobile.getByLabel('Password', { exact: true }).fill('Synthetic-mobile-update!');
  await mobile.getByRole('button', { name: 'Encrypt and save', exact: true }).click();
  await mobile.getByRole('dialog').waitFor({ state: 'hidden' });
  await mobile.screenshot({ path: `${out}/mobile-vault.png`, fullPage: true });
  await page.reload(); await unlock(page);
  await page.getByRole('button', { name: 'Show', exact: true }).click();
  await page.getByText('Synthetic-mobile-update!', { exact: true }).waitFor();
  pass('mobile edit appears on web after re-unlock');
  for (const target of [page, mobile]) {
    await target.getByRole('button', { name: 'Edit', exact: true }).click();
    await target.clock.fastForward(301_000);
    await target.getByRole('dialog').waitFor({ state: 'hidden' });
    await target.getByRole('button', { name: 'Unlock vault', exact: true }).waitFor();
    assert.equal(await target.getByText('Synthetic UI login', { exact: true }).count(), 0);
    assert.equal(await target.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }
  pass('both clients remove open editors and plaintext on automatic lock');
  await unlock(mobile);
  await mobile.getByRole('button',{name:'Edit',exact:true}).click();
  await mobile.evaluate(() => window.__qaDowngrade());
  await mobile.getByLabel('Six-digit authentication code').waitFor();
  assert.equal(await mobile.getByRole('dialog').count(),0);
  assert.equal(await mobile.getByText('Synthetic UI login',{exact:true}).count(),0);
  pass('same-account downgrade to password-only session immediately removes decrypted content');
  assert.equal(transmitted.some(body => [passphrase, secret, 'Synthetic-mobile-update!', 'Synthetic UI login'].some(s => body.includes(s))), false);
  assert.deepEqual(errors, []); pass('no plaintext in vault requests or uncaught browser errors');
} finally {
  await browser.close();
  if (qaFactorId) await removeQaFactor(admin, actor, qaFactorId);
  if (created) {
    const cleanup = await admin.from('password_vaults').delete().eq('user_id', actor.id);
    assert.equal(cleanup.error, null); pass('synthetic UI vault cleaned up');
  }
}
