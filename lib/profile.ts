import { randomBytes } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import { readEnv } from "@/lib/env";
import { DEFAULT_REVEALED_CARD_IDS } from "@/lib/cards";

export type UserProfile = {
  userId: string;
  hexId?: string;
  displayName?: string;
  birthday?: string;
  bio?: string;
  zodiacSign?: string;
  battleWins?: number;
  battleLosses?: number;
  revealedCards?: string[];
  updatedAt?: string;
};

function generateHexId(): string {
  return "U" + randomBytes(3).toString("hex").toUpperCase();
}

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
  data: Partial<Omit<UserProfile, "userId" | "hexId">>
) {
  const env = readEnv();
  const existing = (await getProfile(userId)) ?? { userId };
  const next: UserProfile = {
    ...existing,
    ...data,
    userId,
    hexId: existing.hexId ?? generateHexId(),
    // New accounts start with every non-vuln card revealed — vuln-reward cards
    // remain locked until the corresponding exploit is pulled off.
    revealedCards: existing.revealedCards ?? [...DEFAULT_REVEALED_CARD_IDS],
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

export async function getProfileByHexId(hexId: string): Promise<UserProfile | null> {
  const env = readEnv();
  const result = await getDocClient().send(
    new ScanCommand({
      TableName: env.profileTableName,
      FilterExpression: "hexId = :hexId",
      ExpressionAttributeValues: { ":hexId": hexId }
    })
  );
  return (result.Items?.[0] as UserProfile) ?? null;
}

export async function getProfileByDisplayName(displayName: string): Promise<UserProfile | null> {
  const env = readEnv();
  const result = await getDocClient().send(
    new ScanCommand({
      TableName: env.profileTableName,
      FilterExpression: "displayName = :name",
      ExpressionAttributeValues: { ":name": displayName }
    })
  );
  return (result.Items?.[0] as UserProfile) ?? null;
}

export async function getRevealedCards(userId: string): Promise<string[]> {
  const profile = await getProfile(userId);
  return [...new Set(profile?.revealedCards ?? DEFAULT_REVEALED_CARD_IDS)];
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
