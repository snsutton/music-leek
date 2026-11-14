import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import express, { Request, Response, NextFunction, Router } from 'express';
import { Storage, DATA_DIR, isSafeGuildId } from '../utils/storage';
import { League } from '../types';

const EDIT_BACKUP_DIR = path.join(DATA_DIR, 'edit-backups');

/**
 * Version tag for a league. The pull script sends it back on push so a push
 * is rejected if the bot changed the league after it was pulled.
 */
export function leagueEtag(league: League): string {
  const hash = crypto.createHash('sha256').update(JSON.stringify(league)).digest('hex');
  return `"${hash.slice(0, 16)}"`;
}

function requireToken(token: string) {
  const expected = Buffer.from(`Bearer ${token}`);
  return (req: Request, res: Response, next: NextFunction) => {
    const provided = Buffer.from(req.get('authorization') || '');
    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  };
}

function validateLeague(body: unknown, guildId: string): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Body must be a league object';
  const league = body as Partial<League>;
  if (league.guildId !== guildId) return `guildId in body must match URL (${guildId})`;
  if (typeof league.name !== 'string') return 'name must be a string';
  if (typeof league.channelId !== 'string') return 'channelId must be a string';
  if (typeof league.currentRound !== 'number') return 'currentRound must be a number';
  if (typeof league.totalRounds !== 'number') return 'totalRounds must be a number';
  if (typeof league.isCompleted !== 'boolean') return 'isCompleted must be a boolean';
  if (!Array.isArray(league.rounds)) return 'rounds must be an array';
  if (!Array.isArray(league.participants)) return 'participants must be an array';
  if (!Array.isArray(league.admins)) return 'admins must be an array';
  if (league.isCompleted && !league.completedAt) return 'completedAt is required when isCompleted is true';
  return null;
}

function backupLeague(league: League): void {
  fs.mkdirSync(EDIT_BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(
    path.join(EDIT_BACKUP_DIR, `${league.guildId}-${stamp}.json`),
    JSON.stringify(league, null, 2)
  );
}

/**
 * Admin routes for pulling and pushing league JSON without touching the volume.
 * Returns null when ADMIN_API_TOKEN is not set, so the routes don't exist.
 */
export function createAdminRouter(token: string | undefined = process.env.ADMIN_API_TOKEN): Router | null {
  if (!token) return null;

  const router = express.Router();
  router.use(requireToken(token));
  router.use(express.json({ limit: '5mb' }));

  router.param('guildId', (req, res, next, guildId: string) => {
    if (!isSafeGuildId(guildId)) {
      res.status(400).json({ error: 'Invalid guild ID' });
      return;
    }
    next();
  });

  router.get('/leagues', (req, res) => {
    const leagues = Storage.getAllLeagues().map(l => ({ guildId: l.guildId, name: l.name }));
    res.json(leagues);
  });

  router.get('/leagues/:guildId', (req, res) => {
    const league = Storage.getLeagueByGuild(req.params.guildId);
    if (!league) {
      res.status(404).json({ error: 'League not found' });
      return;
    }
    res.set('ETag', leagueEtag(league)).json(league);
  });

  router.put('/leagues/:guildId', async (req, res) => {
    const { guildId } = req.params;
    const error = validateLeague(req.body, guildId);
    if (error) {
      res.status(400).json({ error });
      return;
    }

    const ifMatch = req.get('if-match');
    // Cast keeps TS from narrowing to 'not-found'; the updater callback assigns it
    let outcome = 'not-found' as 'not-found' | 'conflict' | 'saved';

    const saved = await Storage.atomicUpdate(guildId, current => {
      if (ifMatch && ifMatch !== leagueEtag(current)) {
        outcome = 'conflict';
        return null;
      }
      backupLeague(current);
      outcome = 'saved';
      return req.body as League;
    });

    if (outcome === 'conflict') {
      res.status(409).json({ error: 'League changed since it was pulled. Pull again, or push with --force.' });
      return;
    }
    if (outcome === 'not-found' || !saved) {
      res.status(404).json({ error: 'League not found' });
      return;
    }

    console.log(`[Admin] League ${guildId} replaced via admin API`);
    res.set('ETag', leagueEtag(saved)).json({ ok: true });
  });

  return router;
}
