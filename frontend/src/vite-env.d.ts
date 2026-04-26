/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
  readonly VITE_BACKEND_BASE_URL?: string;
  readonly VITE_FASTAPI_DEV_API_BASE_URL?: string;
  readonly VITE_FASTAPI_API_BASE_URL?: string;
  readonly VITE_BULK_MAILER_API_BASE_URL?: string;
  readonly VITE_INSTAGRAM_AUTOMATION_API_BASE_URL?: string;
  readonly VITE_REALTIME_RELAY_BASE_URL?: string;
  readonly VITE_REALTIME_MESSAGE_TTL_SECONDS?: string;
  readonly VITE_JUDGE0_BASE_URL?: string;
  readonly VITE_JUDGE0_AUTH_TOKEN?: string;
  readonly VITE_JUDGE0_AUTH_USER?: string;
  readonly VITE_PUBLIC_APP_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
}

declare module "html2pdf.js" {
  interface Html2PdfInstance {
    set(options: Record<string, unknown>): Html2PdfInstance;
    from(source: HTMLElement | string): Html2PdfInstance;
    save(filename?: string): Promise<void>;
  }

  export default function html2pdf(): Html2PdfInstance;
}
