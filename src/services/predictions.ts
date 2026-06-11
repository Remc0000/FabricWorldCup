import { getRayfinClient, isLocalBackend } from './rayfinClient';

export interface MatchPredictionItem {
  id: string;
  user_id: string;
  match_id: string;
  homeGoals: number;
  awayGoals: number;
  advanceTeamCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

let mockPredictions: MatchPredictionItem[] = [];

export async function getMyPredictions(): Promise<MatchPredictionItem[]> {
  if (isLocalBackend()) return [...mockPredictions];
  const client = getRayfinClient();
  const session = client.auth.getSession();
  if (!session.isAuthenticated || !session.user) return [];
  const results = await client.data.MatchPrediction.select([
    'id', 'user_id', 'match_id', 'homeGoals', 'awayGoals', 'advanceTeamCode',
    'createdAt', 'updatedAt',
  ]).where({ user_id: { eq: session.user.id } }).orderBy({ createdAt: 'asc' }).execute();
  return results as MatchPredictionItem[];
}

export async function upsertMatchPrediction(
  matchId: string,
  homeGoals: number,
  awayGoals: number,
  advanceTeamCode?: string
): Promise<MatchPredictionItem> {
  if (isLocalBackend()) {
    const existing = mockPredictions.find(p => p.match_id === matchId);
    const now = new Date();
    if (existing) {
      Object.assign(existing, { homeGoals, awayGoals, advanceTeamCode, updatedAt: now });
      return { ...existing };
    }
    const p: MatchPredictionItem = {
      id: crypto.randomUUID(),
      user_id: 'local-user',
      match_id: matchId,
      homeGoals,
      awayGoals,
      advanceTeamCode,
      createdAt: now,
      updatedAt: now,
    };
    mockPredictions.push(p);
    return p;
  }

  const client = getRayfinClient();
  const session = client.auth.getSession();
  if (!session.isAuthenticated || !session.user) throw new Error('Not authenticated');

  const existing = await client.data.MatchPrediction.select(['id'])
    .where({ match_id: { eq: matchId }, user_id: { eq: session.user.id } })
    .execute();

  const now = new Date();
  if (existing.length > 0) {
    await client.data.MatchPrediction.update(
      { id: existing[0].id as string },
      { homeGoals, awayGoals, advanceTeamCode, updatedAt: now }
    );
    return (await client.data.MatchPrediction.findById(existing[0].id as string)) as MatchPredictionItem;
  }

  return (await client.data.MatchPrediction.create({
    user_id: session.user.id,
    match_id: matchId,
    homeGoals,
    awayGoals,
    advanceTeamCode,
    createdAt: now,
    updatedAt: now,
  })) as MatchPredictionItem;
}

export async function deleteMatchPrediction(id: string): Promise<void> {
  if (isLocalBackend()) {
    mockPredictions = mockPredictions.filter(p => p.id !== id);
    return;
  }
  const client = getRayfinClient();
  await client.data.MatchPrediction.delete({ id });
}
