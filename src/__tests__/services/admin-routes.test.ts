import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import express from 'express';
import { League } from '../../types';

// Storage reads DATA_DIR at import time, so point it at a temp dir before loading modules
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'music-leek-admin-'));
process.env.DATA_DIR = dataDir;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Storage } = require('../../utils/storage') as typeof import('../../utils/storage');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createAdminRouter } = require('../../services/admin-routes') as typeof import('../../services/admin-routes');

const TOKEN = 'test-admin-token';
const GUILD_ID = 'guild-123';

function makeLeague(overrides: Partial<League> = {}): League {
  return {
    name: 'Test League',
    guildId: GUILD_ID,
    channelId: 'channel-1',
    createdBy: 'user-1',
    admins: ['user-1'],
    createdAt: '2026-01-01T12:00:00.000Z',
    currentRound: 0,
    rounds: [],
    participants: ['user-1'],
    totalRounds: 4,
    isCompleted: false,
    ...overrides,
  };
}

describe('admin routes', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(done => {
    const app = express();
    app.use('/admin', createAdminRouter(TOKEN)!);
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/admin`;
      done();
    });
  });

  afterAll(done => {
    server.close(() => {
      fs.rmSync(dataDir, { recursive: true, force: true });
      done();
    });
  });

  beforeEach(() => {
    fs.rmSync(path.join(dataDir, 'leagues'), { recursive: true, force: true });
    fs.mkdirSync(path.join(dataDir, 'leagues', 'completed'), { recursive: true });
    Storage.saveLeague(makeLeague());
  });

  const auth = { Authorization: `Bearer ${TOKEN}` };

  it('is disabled when no token is configured', () => {
    expect(createAdminRouter(undefined)).toBeNull();
  });

  it('rejects requests without the token', async () => {
    const res = await fetch(`${baseUrl}/leagues/${GUILD_ID}`);
    expect(res.status).toBe(401);
  });

  it('pulls a league with an ETag', async () => {
    const res = await fetch(`${baseUrl}/leagues/${GUILD_ID}`, { headers: auth });
    expect(res.status).toBe(200);
    expect(res.headers.get('etag')).toBeTruthy();
    expect(((await res.json()) as League).name).toBe('Test League');
  });

  it('returns 404 for an unknown league', async () => {
    const res = await fetch(`${baseUrl}/leagues/nope`, { headers: auth });
    expect(res.status).toBe(404);
  });

  it('pushes an edited league and backs up the previous version', async () => {
    const pulled = await fetch(`${baseUrl}/leagues/${GUILD_ID}`, { headers: auth });
    const etag = pulled.headers.get('etag')!;

    const res = await fetch(`${baseUrl}/leagues/${GUILD_ID}`, {
      method: 'PUT',
      headers: { ...auth, 'Content-Type': 'application/json', 'If-Match': etag },
      body: JSON.stringify(makeLeague({ name: 'Renamed' })),
    });

    expect(res.status).toBe(200);
    expect(Storage.getLeagueByGuild(GUILD_ID)!.name).toBe('Renamed');
    const backups = fs.readdirSync(path.join(dataDir, 'edit-backups'));
    expect(backups.some(f => f.startsWith(GUILD_ID))).toBe(true);
  });

  it('rejects a push when the league changed since it was pulled', async () => {
    const pulled = await fetch(`${baseUrl}/leagues/${GUILD_ID}`, { headers: auth });
    const etag = pulled.headers.get('etag')!;

    // Bot changes the league while the admin is editing
    Storage.saveLeague(makeLeague({ participants: ['user-1', 'user-2'] }));

    const res = await fetch(`${baseUrl}/leagues/${GUILD_ID}`, {
      method: 'PUT',
      headers: { ...auth, 'Content-Type': 'application/json', 'If-Match': etag },
      body: JSON.stringify(makeLeague({ name: 'Renamed' })),
    });

    expect(res.status).toBe(409);
    expect(Storage.getLeagueByGuild(GUILD_ID)!.participants).toEqual(['user-1', 'user-2']);
  });

  it('rejects a push whose guildId does not match the URL', async () => {
    const res = await fetch(`${baseUrl}/leagues/${GUILD_ID}`, {
      method: 'PUT',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(makeLeague({ guildId: 'other-guild' })),
    });
    expect(res.status).toBe(400);
  });

  it('rejects a push missing required fields', async () => {
    const { rounds, ...broken } = makeLeague();
    const res = await fetch(`${baseUrl}/leagues/${GUILD_ID}`, {
      method: 'PUT',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(broken),
    });
    expect(res.status).toBe(400);
  });
});
