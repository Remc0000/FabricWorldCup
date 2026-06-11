import { getRayfinClient, isLocalBackend } from './rayfinClient';

export interface AdminRecord {
  id: string;
  user_id: string;
  displayName: string;
}

export interface UserProfileItem {
  id: string;
  user_id: string;
  displayName: string;
  nationality?: string;
  expectedWinnerTeamCode?: string;
  createdAt: Date;
}

export async function getAdmins(): Promise<AdminRecord[]> {
  if (isLocalBackend()) return [];
  const client = getRayfinClient();
  const results = await client.data.Admin.select(['id', 'user_id', 'displayName']).execute();
  return results as AdminRecord[];
}

export async function getAllUserProfiles(): Promise<UserProfileItem[]> {
  if (isLocalBackend()) return [];
  const client = getRayfinClient();
  const results = await client.data.UserProfile.select([
    'id', 'user_id', 'displayName', 'nationality', 'expectedWinnerTeamCode', 'createdAt',
  ]).orderBy({ createdAt: 'asc' }).execute();
  return results as UserProfileItem[];
}

export async function getUserPredictionCount(userId: string): Promise<number> {
  if (isLocalBackend()) return 0;
  const client = getRayfinClient();
  const results = await client.data.MatchPrediction.select(['id'])
    .where({ user_id: { eq: userId } })
    .execute();
  return results.length;
}
