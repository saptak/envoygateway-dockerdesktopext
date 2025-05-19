/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DDC_HOST: string;
  readonly VITE_DDC_PORT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
