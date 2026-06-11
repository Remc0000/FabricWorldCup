import {
  entity,
  role,
  text,
  int,
  date,
  uuid,
  boolean,
} from '@microsoft/rayfin-core';

@entity()
@role('authenticated', 'read')
export class Match {
  @uuid() id!: string;
  @int() externalId!: number;
  @text({ max: 50 }) stage!: string;
  @int() matchday!: number;
  @text({ max: 10, optional: true }) groupKey?: string;
  @text({ max: 10 }) homeTeamCode!: string;
  @text({ max: 10 }) awayTeamCode!: string;
  @text({ max: 100 }) homeTeamName!: string;
  @text({ max: 100 }) awayTeamName!: string;
  @date() kickoffUtc!: Date;
  @text({ max: 30 }) status!: string;
  @int({ optional: true }) homeScore?: number;
  @int({ optional: true }) awayScore?: number;
  @text({ max: 10, optional: true }) winnerTeamCode?: string;
  @boolean() isFinalized!: boolean;
}
