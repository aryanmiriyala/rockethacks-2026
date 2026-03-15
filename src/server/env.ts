function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getAwsConfig() {
  const region = requiredEnv("AWS_REGION");
  const accessKeyId = requiredEnv("AWS_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("AWS_SECRET_ACCESS_KEY");
  const sessionToken = process.env.AWS_SESSION_TOKEN?.trim() || undefined;

  return {
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
      sessionToken,
    },
  };
}

export function getRequiredEnv(name: string): string {
  return requiredEnv(name);
}
