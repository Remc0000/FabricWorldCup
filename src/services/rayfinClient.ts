import { RayfinClient } from '@microsoft/rayfin-client';

import type { WorldCupSchema } from '../../rayfin/data/schema';

export interface RayfinClientConfig {
  baseUrl: string;
  publishableKey: string;
  functionsBaseUrl?: string;
  localDev: boolean;
}

let client: RayfinClient<WorldCupSchema> | null = null;
let localDev = false;

export function initRayfinClient(
  config: RayfinClientConfig
): RayfinClient<WorldCupSchema> {
  if (client) {
    throw new Error('Rayfin client is already initialized.');
  }
  client = new RayfinClient<WorldCupSchema>({
    baseUrl: config.baseUrl,
    publishableKey: config.publishableKey,
    useProxy: false,
    authStorage: true,
    ...(config.functionsBaseUrl
      ? { functionsBaseUrl: config.functionsBaseUrl }
      : {}),
  });
  localDev = config.localDev;
  return client;
}

export function getRayfinClient(): RayfinClient<WorldCupSchema> {
  if (!client) {
    throw new Error(
      'Rayfin client not initialized. Call bootstrapAuth() first.'
    );
  }
  return client;
}

export function isLocalBackend(): boolean {
  return localDev;
}
