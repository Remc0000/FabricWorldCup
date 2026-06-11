import {
  entity,
  role,
  text,
  int,
  date,
  uuid,
} from '@microsoft/rayfin-core';

@entity()
// All authenticated users can read all predictions (needed for leaderboard/analytics).
@role('authenticated', ['read'])
// Users can only write/delete their own predictions.
@role('authenticated', ['create', 'update', 'delete'], {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class MatchPrediction {
  @uuid() id!: string;
  @text() user_id!: string;
  @uuid() match_id!: string;
  @int() homeGoals!: number;
  @int() awayGoals!: number;
  @text({ max: 10, optional: true }) advanceTeamCode?: string;
  @date() createdAt!: Date;
  @date() updatedAt!: Date;
}
