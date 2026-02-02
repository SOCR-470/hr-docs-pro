import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

// Função para obter URL de login OAuth
export function getLoginUrl(): string {
  const appId = import.meta.env.VITE_APP_ID;
  const portalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const currentUrl = window.location.origin + '/api/oauth/callback';
  const state = btoa(currentUrl);
  return `${portalUrl}/login?app_id=${appId}&state=${state}`;
}
