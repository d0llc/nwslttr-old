/// <reference types="next" />
/// <reference types="next/image-types/global" />

declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string
    NEXTAUTH_URL: string
    NEXTAUTH_SECRET: string
    NODE_ENV: 'development' | 'production' | 'test'
    CF_API_TOKEN: string
    CF_ACCOUNT_ID: string
  }
}
