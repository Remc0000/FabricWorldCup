import {
  entity,
  role,
  text,
  date,
  uuid,
} from '@microsoft/rayfin-core';

@entity()
// All authenticated users can read all profiles (leaderboard).
@role('authenticated', ['read'])
// Users can only write/delete their own profile.
@role('authenticated', ['create', 'update', 'delete'], {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class UserProfile {
  @uuid() id!: string;
  @text() user_id!: string;
  @text({ max: 100 }) displayName!: string;
  @text({ max: 3, optional: true }) nationality?: string;
  @text({ max: 10, optional: true }) expectedWinnerTeamCode?: string;
  @date() createdAt!: Date;
  @date() updatedAt!: Date;
}
