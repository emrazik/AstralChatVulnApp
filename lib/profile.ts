import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import { readEnv } from "@/lib/env";

export type UserProfile = {
  userId: string;
  displayName?: string;
  birthday?: string;
  bio?: string;
  zodiacSign?: string;
  battleWins?: number;
  battleLosses?: number;
  revealedCards?: string[];
  updatedAt?: string;
};

let docClient: DynamoDBDocumentClient | null = null;

function getDocClient() {
  if (!docClient) {
    const env = readEnv();
    const raw = new DynamoDBClient({ region: env.awsRegion });
    docClient = DynamoDBDocumentClient.from(raw);
  }
  return docClient;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const env = readEnv();
  const out = await getDocClient().send(
    new GetCommand({
      TableName: env.profileTableName,
      Key: { userId }
    })
  );
  if (!out.Item) return null;
  return out.Item as UserProfile;
}

export async function upsertProfile(
  userId: string,
  data: Partial<Omit<UserProfile, "userId">>
) {
  const env = readEnv();
  const existing = (await getProfile(userId)) ?? { userId };
  const next: UserProfile = {
    ...existing,
    ...data,
    userId,
    updatedAt: new Date().toISOString()
  };
  await getDocClient().send(
    new PutCommand({
      TableName: env.profileTableName,
      Item: next
    })
  );
  return next;
}

export async function getRevealedCards(userId: string): Promise<string[]> {
  const profile = await getProfile(userId);
  return profile?.revealedCards ?? [];
}

export async function revealCards(
  userId: string,
  cardIds: string[]
): Promise<void> {
  if (cardIds.length === 0) return;
  const env = readEnv();
  await getDocClient().send(
    new UpdateCommand({
      TableName: env.profileTableName,
      Key: { userId },
      UpdateExpression:
        "SET revealedCards = list_append(if_not_exists(revealedCards, :empty), :newCards), updatedAt = :now",
      ExpressionAttributeValues: {
        ":empty": [] as string[],
        ":newCards": cardIds,
        ":now": new Date().toISOString()
      }
    })
  );
}
