interface EnvironmentVariables {
  readonly ARGON2_MEMORY_COST: number;
  readonly ARGON2_TIME_COST: number;
  readonly PRIVATE_KEY: string;
  readonly PRIVATE_KEY_ENCODE: string;
  readonly PRIVATE_KEY_SECRET: string;
  readonly NEXT_PUBLIC_SITE_URL: string;
  readonly DOMAIN_API: string;
}

declare namespace NodeJS {
  interface ProcessEnv extends EnvironmentVariables {}
}
