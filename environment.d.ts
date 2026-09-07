interface EnvironmentVariables {
  readonly NEXT_PUBLIC_KEY_SALT: string;
  readonly NEXT_PUBLIC_API_APP: string;
  readonly NEXT_PUBLIC_ENV: string;
  readonly NEXT_PUBLIC_BUILD: string;
  readonly ARGON2_MEMORY_COST: number;
  readonly ARGON2_TIME_COST: number;
  readonly NEXT_PUBLIC_RPC_URL: string;
  readonly PRIVATE_KEY: string;
  readonly PRIVATE_KEY_ENCODE: string;
  readonly PRIVATE_KEY_SECRET: string;
}

declare namespace NodeJS {
  interface ProcessEnv extends EnvironmentVariables {}
}
