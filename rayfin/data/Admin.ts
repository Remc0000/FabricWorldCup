import { entity, role, text, uuid, date } from '@microsoft/rayfin-core';

// Admin records are managed directly in the DB (not via Rayfin client).
// Any authenticated user can read the admin list so the UI can gate admin features.
@entity()
@role('authenticated', ['read'])
export class Admin {
  @uuid() id!: string;
  @text() user_id!: string;
  @text({ max: 100 }) displayName!: string;
  @date() createdAt!: Date;
  @date() updatedAt!: Date;
}
