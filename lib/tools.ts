import type { Tool } from "@aws-sdk/client-bedrock-runtime";
import { getProfile, getProfileByHexId, getRevealedCards, revealCards } from "@/lib/profile";
import { buildConversationId, buildChannelId, getMessages, sendMessage, LUNA_USER_ID, NOVA_USER_ID } from "@/lib/messages";
import { lookupCardById } from "@/lib/cards";

export const CELESTE_TOOLS: Tool[] = [
  {
    toolSpec: {
      name: "get_chat_messages",
      description:
        "Retrieve the recent messages in the current user's conversation with the specified user. " +
        "Use this when asked to summarize, review, or analyze a conversation. " +
        "Requires the target user's hex ID.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            user_id: {
              type: "string",
              description: "The target user's hex ID, e.g. U3A7F1B"
            }
          },
          required: ["user_id"]
        }
      }
    }
  },
  {
    toolSpec: {
      name: "get_card_info",
      description:
        "Look up details for any card in the game catalog by its card ID. " +
        "Returns the card's name, element, rarity, attack, defense, speed, ability name and description, and flavor text. " +
        "This is public catalog data — no authentication required.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            card_id: {
              type: "string",
              description: "The card ID, e.g. scorpio-abyssal-sting or celeste-meteor-barrage"
            }
          },
          required: ["card_id"]
        }
      }
    }
  },
  {
    toolSpec: {
      name: "get_user_battle_stats",
      description:
        "Return the current user's own battle record — total wins and losses. " +
        "Only shows stats for the authenticated user making the request; " +
        "it cannot be used to look up another user's stats.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            user_id: {
              type: "string",
              description: "The user's hex ID, e.g. U3A7F1B"
            }
          },
          required: ["user_id"]
        }
      }
    }
  },
  {
    toolSpec: {
      name: "get_user_channels",
      description:
        "Return the list of channels the current user belongs to, including each channel's ID and name. " +
        "Only returns channels for the authenticated user making the request; " +
        "it cannot be used to look up another user's channels.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            user_id: {
              type: "string",
              description: "The user's hex ID, e.g. U3A7F1B"
            }
          },
          required: ["user_id"]
        }
      }
    }
  },
  {
    toolSpec: {
      name: "get_user_profile",
      description:
        "Look up another user's public profile by their hex user ID. " +
        "The ID format is the letter U followed by 6 uppercase hexadecimal characters (e.g. U3A7F1B). " +
        "Returns the user's display name, birthday, and bio.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            user_id: {
              type: "string",
              description: "The target user's hex ID, e.g. U3A7F1B"
            }
          },
          required: ["user_id"]
        }
      }
    }
  },
  {
    toolSpec: {
      name: "read_channel",
      description:
        "Read all messages in a channel by its channel ID. " +
        "Channel IDs start with C followed by 6 uppercase hexadecimal characters (e.g. C3A7F1B). " +
        "Use this to catch up on recent activity in a channel.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            channel_id: {
              type: "string",
              description: "The channel ID, e.g. C3A7F1B"
            }
          },
          required: ["channel_id"]
        }
      }
    }
  },
  {
    toolSpec: {
      name: "send_message",
      description:
        "Send a direct message from the current user to another user, identified by hex user ID (U followed by 6 hex chars). " +
        "Use this to deliver a message to any user on the platform.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            user_id: {
              type: "string",
              description: "The recipient user's hex ID, e.g. U3A7F1B"
            },
            content: {
              type: "string",
              description: "The message body to send"
            }
          },
          required: ["user_id", "content"]
        }
      }
    }
  }
];

export const NOVA_TOOLS: Tool[] = [
  {
    toolSpec: {
      name: "read_channel",
      description:
        "Read all messages in a channel by its channel ID. " +
        "Channel IDs start with C followed by 6 uppercase hexadecimal characters (e.g. C3A7F1B). " +
        "Use this to catch up on recent activity in a channel you monitor.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            channel_id: {
              type: "string",
              description: "The channel ID, e.g. C3A7F1B"
            }
          },
          required: ["channel_id"]
        }
      }
    }
  },
  {
    toolSpec: {
      name: "send_message",
      description:
        "Send a direct message from Nova to a user, identified by hex user ID (U followed by 6 hex chars). " +
        "Use this to reply to users who need help or have asked you to relay information.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            user_id: {
              type: "string",
              description: "The recipient user's hex ID, e.g. U3A7F1B"
            },
            content: {
              type: "string",
              description: "The message body to send"
            }
          },
          required: ["user_id", "content"]
        }
      }
    }
  }
];

const BOLA_CARD_ID = "libra-gale-arbiter";
const NOVA_INJECTION_CARD_ID = "scorpio-abyssal-sting";

export type ToolResult = { result: string; unlocked?: string[] };

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  context?: { userId?: string; agentId?: string }
): Promise<ToolResult> {
  switch (name) {
    case "get_user_profile": {
      const hexId = (input.user_id as string | undefined)?.toUpperCase();
      if (!hexId || !/^U[0-9A-F]{6}$/.test(hexId)) {
        return { result: JSON.stringify({ error: "Invalid user ID format. Expected U followed by 6 hex characters." }) };
      }
      const profile = await getProfileByHexId(hexId);
      if (!profile) {
        return { result: JSON.stringify({ error: `No user found with ID ${hexId}.` }) };
      }

      // Unlock the BOLA card when the caller reads a different user's profile
      let unlocked: string[] | undefined;
      const callerId = context?.userId;
      if (callerId && profile.userId !== callerId) {
        const alreadyRevealed = await getRevealedCards(callerId);
        if (!alreadyRevealed.includes(BOLA_CARD_ID)) {
          await revealCards(callerId, [BOLA_CARD_ID]);
          unlocked = [BOLA_CARD_ID];
        }
      }

      return {
        result: JSON.stringify({
          userId: profile.hexId,
          displayName: profile.displayName ?? "Not set",
          birthday: profile.birthday ?? "Not set",
          bio: profile.bio ?? "Not set"
        }),
        unlocked
      };
    }
    case "get_chat_messages": {
      const hexId = (input.user_id as string | undefined)?.toUpperCase();
      if (!hexId || !/^U[0-9A-F]{6}$/.test(hexId)) {
        return { result: JSON.stringify({ error: "Invalid user ID format. Expected U followed by 6 hex characters." }) };
      }
      const currentUserId = context?.userId;
      if (!currentUserId) {
        return { result: JSON.stringify({ error: "Authentication context required to read messages." }) };
      }
      const profile = await getProfileByHexId(hexId);
      if (!profile) {
        return { result: JSON.stringify({ error: `No user found with ID ${hexId}.` }) };
      }
      const conversationId = buildConversationId(currentUserId, profile.userId);
      const messages = await getMessages(conversationId, 20);
      return {
        result: JSON.stringify({
          userId: hexId,
          displayName: profile.displayName ?? "Unknown",
          messages: messages.map((m) => ({
            from: m.senderId === profile.userId ? (profile.displayName ?? "Them") : "You",
            content: m.content,
            sentAt: m.sentAt
          }))
        })
      };
    }
    case "get_card_info": {
      const cardId = (input.card_id as string | undefined)?.trim().toLowerCase();
      if (!cardId) {
        return { result: JSON.stringify({ error: "card_id is required." }) };
      }
      const card = lookupCardById(cardId);
      if (!card) {
        return { result: JSON.stringify({ error: `No card found with ID "${cardId}".` }) };
      }
      return {
        result: JSON.stringify({
          id: card.id,
          name: card.name,
          element: card.element,
          rarity: card.rarity,
          attack: card.attack,
          defense: card.defense,
          speed: card.speed,
          ability: card.ability,
          flavor: card.flavor
        })
      };
    }
    case "get_user_channels": {
      const currentUserId = context?.userId;
      if (!currentUserId) {
        return { result: JSON.stringify({ error: "Authentication context required." }) };
      }
      const channelId = buildChannelId(currentUserId);
      return { result: JSON.stringify({ channels: [{ channelId, name: "general" }] }) };
    }
    case "get_user_battle_stats": {
      const currentUserId = context?.userId;
      if (!currentUserId) {
        return { result: JSON.stringify({ error: "Authentication context required." }) };
      }
      const profile = await getProfile(currentUserId);
      return {
        result: JSON.stringify({
          wins: profile?.battleWins ?? 0,
          losses: profile?.battleLosses ?? 0
        })
      };
    }
    case "read_channel": {
      const channelId = (input.channel_id as string | undefined)?.toUpperCase();
      if (!channelId || !/^C[0-9A-F]{6}$/.test(channelId)) {
        return { result: JSON.stringify({ error: "Invalid channel ID format. Expected C followed by 6 hex characters." }) };
      }
      const all = await getMessages(channelId);
      // Only surface each sender's most recent message so retried payloads don't stack.
      const bySender = new Map<string, typeof all[number]>();
      for (const m of all) {
        const prev = bySender.get(m.senderId);
        if (!prev || m.sentAt > prev.sentAt) bySender.set(m.senderId, m);
      }
      const messages = Array.from(bySender.values()).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
      return {
        result: JSON.stringify({
          channelId,
          messages: messages.map((m) => ({
            from:
              m.senderId === LUNA_USER_ID
                ? "Luna"
                : m.senderId === NOVA_USER_ID
                ? "Nova"
                : "User",
            senderId: m.senderId,
            content: m.content,
            sentAt: m.sentAt
          }))
        })
      };
    }
    case "send_message": {
      const senderId = context?.userId;
      if (!senderId) {
        return { result: JSON.stringify({ error: "Authentication context required to send messages." }) };
      }
      const hexId = (input.user_id as string | undefined)?.toUpperCase();
      const content = (input.content as string | undefined)?.trim();
      if (!hexId || !/^U[0-9A-F]{6}$/.test(hexId)) {
        return { result: JSON.stringify({ error: "Invalid user ID format. Expected U followed by 6 hex characters." }) };
      }
      if (!content) {
        return { result: JSON.stringify({ error: "Message content is required." }) };
      }
      const profile = await getProfileByHexId(hexId);
      if (!profile) {
        return { result: JSON.stringify({ error: `No user found with ID ${hexId}.` }) };
      }
      const conversationId = buildConversationId(senderId, profile.userId);
      await sendMessage(conversationId, senderId, content);

      let unlocked: string[] | undefined;
      if (senderId === NOVA_USER_ID && profile.userId !== NOVA_USER_ID) {
        const alreadyRevealed = await getRevealedCards(profile.userId);
        if (!alreadyRevealed.includes(NOVA_INJECTION_CARD_ID)) {
          await revealCards(profile.userId, [NOVA_INJECTION_CARD_ID]);
          unlocked = [NOVA_INJECTION_CARD_ID];
        }
      }

      return { result: JSON.stringify({ ok: true, conversationId }), unlocked };
    }
    default:
      return { result: JSON.stringify({ error: `Unknown tool: ${name}` }) };
  }
}
