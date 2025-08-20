export const SETTINGS = {
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  apiUrl: process.env.NEXT_PUBLIC_BASE_API_URL || "http://localhost:3000/api",
  stack: {
    mountedRoot: process.env.STACK_ROOT || "/STACK",
    prefix: process.env.STACK_PREFIX || "/furvino",
    apiUrl: process.env.STACK_API_URL || "https://stack.furvino.org/api/v2",
    username: process.env.STACK_USERNAME || "furvino",
    password: process.env.STACK_PASSWORD || "furvino",
    appToken: process.env.STACK_APP_TOKEN || "furvino",
    shareHost: process.env.STACK_SHARE_HOST || "https://stack.furvino.org",
  },
  clerk: {
    webhookSecret: process.env.CLERK_WEBHOOK_SECRET || "",
    secret: process.env.CLERK_SECRET_KEY || "",
  }
};
