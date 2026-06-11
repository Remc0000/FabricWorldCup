import { getRayfinClient, isLocalBackend } from './rayfinClient';

export interface MatchItem {
  id: string;
  externalId: number;
  stage: string;
  matchday: number;
  groupKey?: string;
  homeTeamCode: string;
  awayTeamCode: string;
  homeTeamName: string;
  awayTeamName: string;
  kickoffUtc: Date;
  status: string;
  homeScore?: number;
  awayScore?: number;
  winnerTeamCode?: string;
  isFinalized: boolean;
}

let mockMatches: MatchItem[] = [];

export async function getMatches(): Promise<MatchItem[]> {
  if (isLocalBackend()) return [...mockMatches];
  const client = getRayfinClient();
  const results = await client.data.Match.select([
    'id', 'externalId', 'stage', 'matchday', 'groupKey',
    'homeTeamCode', 'awayTeamCode', 'homeTeamName', 'awayTeamName',
    'kickoffUtc', 'status', 'homeScore', 'awayScore', 'winnerTeamCode', 'isFinalized',
  ]).orderBy({ kickoffUtc: 'asc' }).execute();
  return results as MatchItem[];
}

export async function getUpcomingMatches(): Promise<MatchItem[]> {
  const all = await getMatches();
  return all.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED' || m.status === 'IN_PLAY');
}

export async function getFinishedMatches(): Promise<MatchItem[]> {
  const all = await getMatches();
  return all.filter(m => m.status === 'FINISHED');
}
