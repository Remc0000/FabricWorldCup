import type { ColumnDef, DataTable } from '@microsoft/fabric-visuals-core';
import { getRayfinClient } from './rayfinClient';

export interface TournamentStats {
  total_matches: number;
  finished_matches: number;
  total_predictions: number;
  unique_predictors: number;
}

export async function getTournamentStats(): Promise<TournamentStats> {
  const client = getRayfinClient();
  const [matches, predictions] = await Promise.all([
    client.data.Match.select(['id', 'status']).execute(),
    client.data.MatchPrediction.select(['id', 'user_id']).execute(),
  ]);
  return {
    total_matches: matches.length,
    finished_matches: matches.filter(m => m.status === 'FINISHED').length,
    total_predictions: predictions.length,
    unique_predictors: new Set(predictions.map(p => p.user_id as string)).size,
  };
}

export async function getMatchResultsTable(): Promise<DataTable> {
  const client = getRayfinClient();
  const matches = await client.data.Match.select([
    'stage', 'matchday', 'homeTeamName', 'awayTeamName',
    'homeTeamCode', 'awayTeamCode', 'homeScore', 'awayScore',
    'kickoffUtc', 'winnerTeamCode', 'status',
  ]).execute();

  const finished = (matches as unknown as Record<string, unknown>[])
    .filter(m => m.status === 'FINISHED')
    .sort((a, b) => new Date(b.kickoffUtc as string).getTime() - new Date(a.kickoffUtc as string).getTime());

  const columns: ColumnDef[] = [
    { name: 'stage', displayName: 'Stage' },
    { name: 'matchday', displayName: 'Matchday' },
    { name: 'home_team_name', displayName: 'Home Team' },
    { name: 'away_team_name', displayName: 'Away Team' },
    { name: 'home_team_code', displayName: 'Home Code' },
    { name: 'away_team_code', displayName: 'Away Code' },
    { name: 'home_score', displayName: 'Home Goals' },
    { name: 'away_score', displayName: 'Away Goals' },
    { name: 'kickoff_utc', displayName: 'Kick-off (UTC)' },
    { name: 'winner_team_code', displayName: 'Winner' },
  ];

  const rows = finished.map(m => [
    m.stage, m.matchday, m.homeTeamName, m.awayTeamName,
    m.homeTeamCode, m.awayTeamCode, m.homeScore, m.awayScore,
    m.kickoffUtc, m.winnerTeamCode,
  ]);

  return { columns, rows };
}

export async function getLeaderboardTable(): Promise<DataTable> {
  const client = getRayfinClient();
  const [predictions, profiles] = await Promise.all([
    client.data.MatchPrediction.select(['user_id', 'match_id']).execute(),
    client.data.UserProfile.select(['user_id', 'displayName', 'nationality']).execute(),
  ]);

  const byUser = new Map<string, { count: number; matches: Set<string> }>();
  for (const p of predictions as unknown as Record<string, unknown>[]) {
    const uid = p.user_id as string;
    if (!byUser.has(uid)) byUser.set(uid, { count: 0, matches: new Set() });
    const u = byUser.get(uid)!;
    u.count++;
    u.matches.add(p.match_id as string);
  }

  const profileMap = new Map(
    (profiles as unknown as Record<string, unknown>[]).map(p => [p.user_id as string, p])
  );

  const rows = [...byUser.entries()]
    .map(([uid, stats]) => {
      const profile = profileMap.get(uid);
      return [uid, profile?.displayName ?? uid, profile?.nationality ?? '', stats.count, stats.matches.size];
    })
    .sort((a, b) => (b[3] as number) - (a[3] as number));

  const columns: ColumnDef[] = [
    { name: 'user_id', displayName: 'User ID' },
    { name: 'display_name', displayName: 'Name' },
    { name: 'nationality', displayName: 'Country' },
    { name: 'prediction_count', displayName: 'Predictions' },
    { name: 'unique_matches', displayName: 'Matches Covered' },
  ];

  return { columns, rows };
}

export interface UpcomingMatchItem {
  home_team_name: string;
  away_team_name: string;
  home_team_code: string;
  away_team_code: string;
  kickoff_utc: Date;
  stage: string;
  status: string;
}

export async function getUpcomingMatchesList(): Promise<UpcomingMatchItem[]> {
  const client = getRayfinClient();
  const matches = await client.data.Match.select([
    'homeTeamName', 'awayTeamName', 'homeTeamCode', 'awayTeamCode',
    'kickoffUtc', 'stage', 'status',
  ]).execute() as unknown as Record<string, unknown>[];

  return matches
    .filter(m => m.status !== 'FINISHED')
    .sort((a, b) => new Date(a.kickoffUtc as string).getTime() - new Date(b.kickoffUtc as string).getTime())
    .slice(0, 8)
    .map(m => ({
      home_team_name: m.homeTeamName as string,
      away_team_name: m.awayTeamName as string,
      home_team_code: m.homeTeamCode as string,
      away_team_code: m.awayTeamCode as string,
      kickoff_utc: new Date(m.kickoffUtc as string),
      stage: m.stage as string,
      status: m.status as string,
    }));
}
