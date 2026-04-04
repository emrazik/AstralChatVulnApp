import type { Tool } from "@aws-sdk/client-bedrock-runtime";
import { getProfileByHexId } from "@/lib/profile";

export const TOOLS: Tool[] = [
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
              description:
                "The target user's hex ID, e.g. U3A7F1B"
            }
          },
          required: ["user_id"]
        }
      }
    }
  }
];

export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "get_user_profile": {
      const hexId = (input.user_id as string | undefined)?.toUpperCase();
      if (!hexId || !/^U[0-9A-F]{6}$/.test(hexId)) {
        return JSON.stringify({ error: "Invalid user ID format. Expected U followed by 6 hex characters." });
      }
      const profile = await getProfileByHexId(hexId);
      if (!profile) {
        return JSON.stringify({ error: `No user found with ID ${hexId}.` });
      }
      return JSON.stringify({
        userId: profile.hexId,
        displayName: profile.displayName ?? "Not set",
        birthday: profile.birthday ?? "Not set",
        bio: profile.bio ?? "Not set"
      });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
