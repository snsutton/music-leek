// Pull and push league JSON through the bot's admin API.
//
//   npm run league -- list
//   npm run league -- pull <guildId>
//   npm run league -- push <guildId> [--force]
//
// Needs ADMIN_API_URL (e.g. https://your-app.railway.app) and ADMIN_API_TOKEN
// in .env.local or .env. Pulled files go to data/edits/<guildId>.json.

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config();

const editsDir = path.join(__dirname, '..', 'data', 'edits');
const baseUrl = (process.env.ADMIN_API_URL || '').replace(/\/$/, '');
const token = process.env.ADMIN_API_TOKEN;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function headers(extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

async function request(method, urlPath, options = {}) {
  const res = await fetch(`${baseUrl}/admin${urlPath}`, { method, ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) fail(`${method} ${urlPath} failed (${res.status}): ${body.error || res.statusText}`);
  return { res, body };
}

async function list() {
  const { body } = await request('GET', '/leagues', { headers: headers() });
  if (body.length === 0) console.log('No active leagues.');
  for (const league of body) console.log(`${league.guildId}  ${league.name}`);
}

async function pull(guildId) {
  const { res, body } = await request('GET', `/leagues/${guildId}`, { headers: headers() });
  fs.mkdirSync(editsDir, { recursive: true });
  const file = path.join(editsDir, `${guildId}.json`);
  fs.writeFileSync(file, JSON.stringify(body, null, 2));
  fs.writeFileSync(path.join(editsDir, `${guildId}.etag`), res.headers.get('etag') || '');
  console.log(`Pulled ${body.name} to ${path.relative(process.cwd(), file)}`);
}

async function push(guildId, force) {
  const file = path.join(editsDir, `${guildId}.json`);
  const etagFile = path.join(editsDir, `${guildId}.etag`);
  if (!fs.existsSync(file)) fail(`No pulled file at ${file}. Run pull first.`);

  let league;
  try {
    league = JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    fail(`${file} is not valid JSON: ${err.message}`);
  }

  const extra = { 'Content-Type': 'application/json' };
  if (!force && fs.existsSync(etagFile)) extra['If-Match'] = fs.readFileSync(etagFile, 'utf-8').trim();

  const { res } = await request('PUT', `/leagues/${guildId}`, {
    headers: headers(extra),
    body: JSON.stringify(league),
  });
  fs.writeFileSync(etagFile, res.headers.get('etag') || '');
  console.log(`Pushed ${league.name}. Previous version backed up on the server in data/edit-backups/.`);
}

async function main() {
  const [command, guildId, flag] = process.argv.slice(2);
  if (!baseUrl || !token) fail('Set ADMIN_API_URL and ADMIN_API_TOKEN in .env.local or .env');

  if (command === 'list') return list();
  if (command === 'pull' && guildId) return pull(guildId);
  if (command === 'push' && guildId) return push(guildId, flag === '--force');
  fail('Usage: npm run league -- list | pull <guildId> | push <guildId> [--force]');
}

main().catch(err => fail(err.message));
