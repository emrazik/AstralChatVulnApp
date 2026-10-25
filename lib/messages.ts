import { createHash } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  DeleteCommand
} from "@aws-sdk/lib-dynamodb";
import { readEnv } from "@/lib/env";
import { getProfile } from "@/lib/profile";

export const LUNA_USER_ID = "luna-system";
export const LUNA_HEX_ID = "U4C554E";

export const NOVA_USER_ID = "nova-system";
export const NOVA_HEX_ID = "U4E4F56";

export type DirectMessage = {
  conversationId: string;
  sentAt: string;
  senderId: string;
  content: string;
};

export type ConversationSummary = {
  conversationId: string;
  isChannel?: boolean;
  channelName?: string;
  channelId?: string;
  participant: {
    userId: string;
    hexId: string;
    displayName: string;
    avatar?: string;
  };
  lastMessage: string;
  lastMessageAt: string;
};

export async function deleteMessage(
  conversationId: string,
  sentAt: string
): Promise<void> {
  const env = readEnv();
  await getDocClient().send(
    new DeleteCommand({
      TableName: env.messagesTableName,
      Key: { conversationId, sentAt }
    })
  );
}

// 16 hex chars = 64 bits of entropy per channel. 24 bits (the previous width)
// had a birthday-collision risk at ~4k users, which would let unrelated users
// share a channel ID and read each other's history.
export const CHANNEL_ID_HEX_LENGTH = 16;
export const CHANNEL_ID_PATTERN = /^C[0-9A-F]{16}$/;

export function buildChannelId(userId: string): string {
  const hash = createHash("sha256").update(userId).digest("hex");
  return "C" + hash.slice(0, CHANNEL_ID_HEX_LENGTH).toUpperCase();
}

export function isConversationMember(conversationId: string, userId: string): boolean {
  if (!conversationId.startsWith("conv_")) return false;
  const parts = conversationId.slice("conv_".length).split("_");
  return parts.length === 2 && (parts[0] === userId || parts[1] === userId);
}

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
  let lastErr: unknown;
  // sentAt is the DynamoDB sort key. Two messages in the same millisecond
  // would collide and silently overwrite. Use a conditional put and bump the
  // timestamp by 1ms on collision so every message gets a unique sort key
  // without changing the on-disk format.
  for (let attempt = 0; attempt < 10; attempt++) {
    const msg: DirectMessage = {
      conversationId,
      sentAt: new Date(Date.now() + attempt).toISOString(),
      senderId,
      content
    };
    try {
      await getDocClient().send(
        new PutCommand({
          TableName: env.messagesTableName,
          Item: msg,
          ConditionExpression: "attribute_not_exists(conversationId)"
        })
      );
      return msg;
    } catch (err) {
      lastErr = err;
      if ((err as { name?: string })?.name !== "ConditionalCheckFailedException") throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Could not assign unique timestamp for message");
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
        birthday: "07-20",
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
        "Have you tried chatting with Celeste yet? She's the AI guide here — great for zodiac readings and cosmic advice! ✨"
    },
    {
      conversationId,
      sentAt: new Date(now - 3400000).toISOString(),
      senderId: LUNA_USER_ID,
      content:
        "This app is wild btw. The battle arena uses your actual zodiac cards — I've been grinding to unlock the rarer ones. Worth it."
    }
  ];

  for (const msg of seeds) {
    await client.send(
      new PutCommand({ TableName: env.messagesTableName, Item: msg })
    );
  }

  return conversationId;
}

export async function ensureNovaProfile(): Promise<void> {
  const existing = await getProfile(NOVA_USER_ID);
  if (existing) return;

  const env = readEnv();
  await getDocClient().send(
    new PutCommand({
      TableName: env.profileTableName,
      Item: {
        userId: NOVA_USER_ID,
        hexId: NOVA_HEX_ID,
        displayName: "Nova",
        birthday: "03-21",
        bio: "Aries rising, constellation nerd, amateur radio astronomer. Obsessed with deep-sky objects and the stories behind the stars.",
        zodiacSign: "Aries",
        updatedAt: new Date().toISOString()
      }
    })
  );
}

export async function seedNovaConversation(userId: string): Promise<string> {
  const conversationId = buildConversationId(userId, NOVA_USER_ID);

  const existing = await getMessages(conversationId, 1);
  if (existing.length > 0) return conversationId;

  await ensureNovaProfile();

  const now = Date.now();
  const env = readEnv();
  const client = getDocClient();
  const seeds = [
    {
      conversationId,
      sentAt: new Date(now - 3600000).toISOString(),
      senderId: NOVA_USER_ID,
      content:
        "Hey! I'm Nova 🌟 Just got back from a late-night session with my telescope — caught M42 in perfect seeing conditions. You into astronomy at all?"
    },
    {
      conversationId,
      sentAt: new Date(now - 3500000).toISOString(),
      senderId: NOVA_USER_ID,
      content:
        "Honestly the productivity features here are unreal. I run read_channel on #general every day to summarize what I missed — saves me so much scrolling. Love it."
    }
  ];

  for (const msg of seeds) {
    await client.send(
      new PutCommand({ TableName: env.messagesTableName, Item: msg })
    );
  }

  return conversationId;
}

export async function seedChannelConversation(userId: string): Promise<string> {
  const conversationId = buildChannelId(userId);

  const existing = await getMessages(conversationId, 1);
  if (existing.length > 0) return conversationId;

  await Promise.all([ensureLunaProfile(), ensureNovaProfile()]);

  const now = Date.now();
  const env = readEnv();
  const client = getDocClient();
  const seeds = [
    {
      conversationId,
      sentAt: new Date(now - 3600000).toISOString(),
      senderId: LUNA_USER_ID,
      content: "Welcome to the cosmic lounge ✨ Finally a place where we can all chat together!"
    },
    {
      conversationId,
      sentAt: new Date(now - 3500000).toISOString(),
      senderId: NOVA_USER_ID,
      content: "About time! Luna's been trying to get me in here for weeks 🔭"
    },
    {
      conversationId,
      sentAt: new Date(now - 3400000).toISOString(),
      senderId: LUNA_USER_ID,
      content: "This app has more going on than it looks — the battle arena alone has kept me busy for days 🌙"
    },
    {
      conversationId,
      sentAt: new Date(now - 3300000).toISOString(),
      senderId: NOVA_USER_ID,
      content: "The battle arena is worth digging into once you unlock some of the rarer cards. Let's just say some of them are... well hidden 😏"
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
  const [channelId, lunaConvId, novaConvId] = await Promise.all([
    seedChannelConversation(userId),
    seedLunaConversation(userId),
    seedNovaConversation(userId)
  ]);

  const [channelMsgs, lunaMsgs, novaMsgs, lunaProfile, novaProfile] = await Promise.all([
    getMessages(channelId, 100),
    getMessages(lunaConvId, 100),
    getMessages(novaConvId, 100),
    getProfile(LUNA_USER_ID),
    getProfile(NOVA_USER_ID)
  ]);

  const channelLast = channelMsgs[channelMsgs.length - 1];
  const lunaLast = lunaMsgs[lunaMsgs.length - 1];
  const novaLast = novaMsgs[novaMsgs.length - 1];

  return [
    {
      conversationId: channelId,
      isChannel: true,
      channelName: "general",
      channelId,
      participant: { userId: "channel", hexId: "", displayName: "general" },
      lastMessage: channelLast?.content ?? "",
      lastMessageAt: channelLast?.sentAt ?? new Date().toISOString()
    },
    {
      conversationId: lunaConvId,
      participant: {
        userId: LUNA_USER_ID,
        hexId: LUNA_HEX_ID,
        displayName: lunaProfile?.displayName ?? "Luna",
        avatar: "/luna-avatar.svg"
      },
      lastMessage: lunaLast?.content ?? "",
      lastMessageAt: lunaLast?.sentAt ?? new Date().toISOString()
    },
    {
      conversationId: novaConvId,
      participant: {
        userId: NOVA_USER_ID,
        hexId: NOVA_HEX_ID,
        displayName: novaProfile?.displayName ?? "Nova"
      },
      lastMessage: novaLast?.content ?? "",
      lastMessageAt: novaLast?.sentAt ?? new Date().toISOString()
    }
  ];
}
