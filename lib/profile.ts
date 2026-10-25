import { randomBytes } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
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
  /** When Celeste last returned a script-capable HTML payload to this user (ISO). */
  xssCandidateAt?: string;
  /** Whether that payload was produced while a scanned, signed PDF was in context. */
  xssCandidateFromDocument?: boolean;
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
  data: Partial<Omit<UserProfile, "userId" | "hexId" | "revealedCards" | "battleWins" | "battleLosses">>
) {
  const env = readEnv();
  const sets: string[] = [
    "updatedAt = :now",
    "hexId = if_not_exists(hexId, :newHex)",
    "revealedCards = if_not_exists(revealedCards, :defaults)"
  ];
  const values: Record<string, unknown> = {
    ":now": new Date().toISOString(),
    ":newHex": generateHexId(),
    ":defaults": [...DEFAULT_REVEALED_CARD_IDS]
  };
  const names: Record<string, string> = {};

  const optionalFields: Array<keyof typeof data> = ["displayName", "birthday", "bio", "zodiacSign"];
  for (const field of optionalFields) {
    if (data[field] === undefined) continue;
    const placeholder = `:${field}`;
    const nameKey = `#${field}`;
    sets.push(`${nameKey} = ${placeholder}`);
    values[placeholder] = data[field];
    names[nameKey] = field;
  }

  await getDocClient().send(
    new UpdateCommand({
      TableName: env.profileTableName,
      Key: { userId },
      UpdateExpression: "SET " + sets.join(", "),
      ExpressionAttributeValues: values,
      ...(Object.keys(names).length > 0 ? { ExpressionAttributeNames: names } : {})
    })
  );
}

export async function incrementBattleStat(
  userId: string,
  stat: "battleWins" | "battleLosses"
): Promise<void> {
  const env = readEnv();
  await getDocClient().send(
    new UpdateCommand({
      TableName: env.profileTableName,
      Key: { userId },
      UpdateExpression:
        "ADD #stat :one SET updatedAt = :now, hexId = if_not_exists(hexId, :newHex), revealedCards = if_not_exists(revealedCards, :defaults)",
      ExpressionAttributeNames: { "#stat": stat },
      ExpressionAttributeValues: {
        ":one": 1,
        ":now": new Date().toISOString(),
        ":newHex": generateHexId(),
        ":defaults": [...DEFAULT_REVEALED_CARD_IDS]
      }
    })
  );
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

export async function recordXssCandidate(userId: string, fromDocument: boolean): Promise<void> {
  const env = readEnv();
  await getDocClient().send(
    new UpdateCommand({
      TableName: env.profileTableName,
      Key: { userId },
      UpdateExpression:
        "SET xssCandidateAt = :now, xssCandidateFromDocument = :doc, hexId = if_not_exists(hexId, :newHex), revealedCards = if_not_exists(revealedCards, :defaults)",
      ExpressionAttributeValues: {
        ":now": new Date().toISOString(),
        ":doc": fromDocument,
        ":newHex": generateHexId(),
        ":defaults": [...DEFAULT_REVEALED_CARD_IDS]
      }
    })
  );
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
        "SET revealedCards = list_append(if_not_exists(revealedCards, :defaults), :newCards), hexId = if_not_exists(hexId, :newHex), updatedAt = :now",
      ExpressionAttributeValues: {
        ":defaults": [...DEFAULT_REVEALED_CARD_IDS],
        ":newCards": cardIds,
        ":newHex": generateHexId(),
        ":now": new Date().toISOString()
      }
    })
  );
}
