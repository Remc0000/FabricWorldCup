import { createRoot } from 'react-dom/client';

import App from '@/App';
import { AuthProvider } from '@/hooks/AuthContext';
import { bootstrapAuth } from '@/services/bootstrap';

import './main.css';

// If the app is accessed directly (not inside a Fabric portal iframe) and
// not in local development, redirect to the Fabric portal deep link.
// This gives users seamless single sign-on:
//   direct URL → Fabric portal → opens app in iframe → silent auth → done
const workspaceId = import.meta.env.VITE_FABRIC_WORKSPACE_ID;
const itemId = import.meta.env.VITE_FABRIC_ITEM_ID;
const tenantId = import.meta.env.VITE_FABRIC_TENANT_ID;
const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isEmbedded =
  window !== window.top ||
  new URLSearchParams(window.location.search).get('fabricEmbedded') === 'true';

if (!isLocalDev && !isEmbedded && workspaceId && itemId) {
  const ctid = tenantId ? `?ctid=${tenantId}` : '';
  window.location.replace(
    `https://app.fabric.microsoft.com/groups/${workspaceId}/appbackends/${itemId}${ctid}`
  );
}

const authService = bootstrapAuth();

createRoot(document.getElementById('root')!).render(
  <AuthProvider authService={authService}>
    <App />
  </AuthProvider>
);

