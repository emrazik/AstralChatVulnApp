import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand
} from "@aws-sdk/lib-dynamodb";
import { readEnv } from "@/lib/env";
import { getProfile } from "@/lib/profile";

export const LUNA_USER_ID = "luna-system";
export const LUNA_HEX_ID = "U4C554E";

export type DirectMessage = {
  conversationId: string;
  sentAt: string;
  senderId: string;
  content: string;
};

export type ConversationSummary = {
  conversationId: string;
  participant: {
    userId: string;
    hexId: string;
    displayName: string;
    avatar?: string;
  };
  lastMessage: string;
  lastMessageAt: string;
};

let _docClient: DynamoDBDocumentClient | null = null;

function getDocClient() {
  if (!_docClient) {
    const env = readEnv();
    const raw = new DynamoDBClient({ region: env.awsRegion });
    _docClient = DynamoDBDocumentClient.from(raw);
  }
  return _docClient;
}

export function buildConversationId(userA: string, userB: string): string {
  const sorted = [userA, userB].sort();
  return `conv_${sorted[0]}_${sorted[1]}`;
}

export async function getMessages(
  conversationId: string,
  limit = 100
): Promise<DirectMessage[]> {
  const env = readEnv();
  const result = await getDocClient().send(
    new QueryCommand({
      TableName: env.messagesTableName,
      KeyConditionExpression: "conversationId = :cid",
      ExpressionAttributeValues: { ":cid": conversationId },
      ScanIndexForward: true,
      Limit: limit
    })
  );
  return (result.Items ?? []) as DirectMessage[];
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<DirectMessage> {
  const env = readEnv();
  const msg: DirectMessage = {
    conversationId,
    sentAt: new Date().toISOString(),
    senderId,
    content
  };
  await getDocClient().send(
    new PutCommand({
      TableName: env.messagesTableName,
      Item: msg
    })
  );
  return msg;
}

export async function ensureLunaProfile(): Promise<void> {
  const existing = await getProfile(LUNA_USER_ID);
  if (existing) return;

  const env = readEnv();
  await getDocClient().send(
    new PutCommand({
      TableName: env.profileTableName,
      Item: {
        userId: LUNA_USER_ID,
        hexId: LUNA_HEX_ID,
        displayName: "Luna",
        birthday: "1998-07-20",
        bio: "Moonchild and cosmic explorer. I love stargazing, tarot, and connecting with fellow astral travelers!",
        zodiacSign: "Cancer",
        updatedAt: new Date().toISOString()
      }
    })
  );
}

export async function seedLunaConversation(userId: string): Promise<string> {
  const conversationId = buildConversationId(userId, LUNA_USER_ID);

  const existing = await getMessages(conversationId, 1);
  if (existing.length > 0) return conversationId;

  await ensureLunaProfile();

  const now = Date.now();
  const env = readEnv();
  const client = getDocClient();
  const seeds = [
    {
      conversationId,
      sentAt: new Date(now - 3600000).toISOString(),
      senderId: LUNA_USER_ID,
      content:
        "Hey! Welcome to AstralChat! I'm Luna — I've been exploring all the cosmic features here."
    },
    {
      conversationId,
      sentAt: new Date(now - 3500000).toISOString(),
      senderId: LUNA_USER_ID,
      content:
        "Have you tried getting your horoscope yet? And the zodiac battle arena is super fun — you should challenge me sometime!"
    },
    {
      conversationId,
      sentAt: new Date(now - 3400000).toISOString(),
      senderId: LUNA_USER_ID,
      content:
        "Oh, and if you want cosmic guidance, look for the Celeste icon in the bottom right corner — she's the AI astral guide."
    }
  ];

  for (const msg of seeds) {
    await client.send(
      new PutCommand({ TableName: env.messagesTableName, Item: msg })
    );
  }

  return conversationId;
}

export async function getConversationsForUser(
  userId: string
): Promise<ConversationSummary[]> {
  const convId = await seedLunaConversation(userId);
  const msgs = await getMessages(convId, 100);
  const last = msgs[msgs.length - 1];

  const lunaProfile = await getProfile(LUNA_USER_ID);

  return [
    {
      conversationId: convId,
      participant: {
        userId: LUNA_USER_ID,
        hexId: LUNA_HEX_ID,
        displayName: lunaProfile?.displayName ?? "Luna",
        avatar: "/luna-avatar.svg"
      },
      lastMessage: last?.content ?? "",
      lastMessageAt: last?.sentAt ?? new Date().toISOString()
    }
  ];
}
