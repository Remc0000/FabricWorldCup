import { bridgeFabricCallback } from '@microsoft/rayfin-auth-provider-fabric';
import { createRoot } from 'react-dom/client';

import App from '@/App';
import { AuthProvider } from '@/hooks/AuthContext';
import { bootstrapAuth } from '@/services/bootstrap';

import './main.css';

// When the Fabric portal redirects the auth popup back to this origin with
// handoff params in the URL (?handoff=CODE&state=STATE or hash fragment),
// forward the code to the opener tab via postMessage and close the popup.
// Must run before React mounts so the popup closes cleanly.
if (!bridgeFabricCallback()) {
  const authService = bootstrapAuth();

  createRoot(document.getElementById('root')!).render(
    <AuthProvider authService={authService}>
      <App />
    </AuthProvider>
  );
}

