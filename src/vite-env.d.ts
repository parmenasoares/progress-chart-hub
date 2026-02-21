/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_CALENDLY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; expires_in?: number }) => void;
            error_callback?: () => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

export {};
