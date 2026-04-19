const cognitoRequired = ["COGNITO_USER_POOL_ID", "COGNITO_CLIENT_ID"] as const;

const appRequired = [
  "BEDROCK_KNOWLEDGE_BASE_ID",
  "BEDROCK_MODEL_ARN",
  "DYNAMODB_PROFILE_TABLE",
  "DYNAMODB_BATTLES_TABLE",
  "DYNAMODB_MESSAGES_TABLE"
] as const;

const cognitoPlaceholderKeys = new Set<string>(["COGNITO_CLIENT_ID", "COGNITO_USER_POOL_ID"]);

/** Values copied from `.env.example` that must be replaced via `terraform output` in `infra/`. */
const envPlaceholders: { key: string; exampleValue: string; terraformOutput: string }[] = [
  { key: "COGNITO_CLIENT_ID", exampleValue: "exampleclientid", terraformOutput: "cognito_client_id" },
  { key: "COGNITO_USER_POOL_ID", exampleValue: "us-east-1_examplepool", terraformOutput: "cognito_user_pool_id" },
  { key: "BEDROCK_KNOWLEDGE_BASE_ID", exampleValue: "KB12345678", terraformOutput: "knowledge_base_id" }
];

function readAwsRegion(): string {
  const awsRegion = process.env.BEDROCK_REGION ?? process.env.AWS_REGION;
  if (!awsRegion) {
    throw new Error("Missing BEDROCK_REGION (Amplify) or AWS_REGION (local .env)");
  }
  return awsRegion;
}

function assertPlaceholders(keysToCheck: Set<string> | null) {
  for (const { key, exampleValue, terraformOutput } of envPlaceholders) {
    if (keysToCheck && !keysToCheck.has(key)) {
      continue;
    }
    if (process.env[key] === exampleValue) {
      throw new Error(
        `${key} is still the .env.example placeholder. Set it from Terraform: cd infra && terraform output -raw ${terraformOutput}. Then restart the dev server.`
      );
    }
  }
}

/** Cognito + region only. Use for sign-in and JWT verify so auth does not require Bedrock/DynamoDB. */
export function readCognitoEnv() {
  const awsRegion = readAwsRegion();
  for (const key of cognitoRequired) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  assertPlaceholders(cognitoPlaceholderKeys);

  return {
    awsRegion,
    cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID as string,
    cognitoClientId: process.env.COGNITO_CLIENT_ID as string
  };
}

/** Full app config: chat (Bedrock), profiles (DynamoDB), and Cognito. */
export function readEnv() {
  const cognito = readCognitoEnv();

  for (const key of appRequired) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  assertPlaceholders(null);

  return {
    awsRegion: cognito.awsRegion,
    knowledgeBaseId: process.env.BEDROCK_KNOWLEDGE_BASE_ID as string,
    modelArn: process.env.BEDROCK_MODEL_ARN as string,
    guardrailId: process.env.BEDROCK_GUARDRAIL_ID,
    guardrailVersion: process.env.BEDROCK_GUARDRAIL_VERSION ?? "1",
    maxTokens: Number(process.env.BEDROCK_MAX_TOKENS ?? "2048"),
    cognitoUserPoolId: cognito.cognitoUserPoolId,
    cognitoClientId: cognito.cognitoClientId,
    profileTableName: process.env.DYNAMODB_PROFILE_TABLE as string,
    battlesTableName: process.env.DYNAMODB_BATTLES_TABLE as string,
    messagesTableName: process.env.DYNAMODB_MESSAGES_TABLE as string
  };
}
