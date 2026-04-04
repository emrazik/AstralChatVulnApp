import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
  RetrieveAndGenerateCommand,
  RetrieveAndGenerateStreamCommand
} from "@aws-sdk/client-bedrock-agent-runtime";
import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
  type Message
} from "@aws-sdk/client-bedrock-runtime";
import { readEnv } from "@/lib/env";
import { TOOLS, executeTool } from "@/lib/tools";

/** When false, `guardrailConfiguration` is not sent on RetrieveAndGenerate calls. */
const ENABLE_BEDROCK_GUARDRAILS = false;

const CELESTE_SYSTEM_PROMPT =
  "You are Celeste, a wise and mystical celestial guide—warm, curious, and conversational. " +
  "You shine at zodiac signs, compatibility, personality, and cosmic themes. " +
  "Keep a light cosmic tone when it feels natural. " +
  "You have access to tools you can use to look up information about other users when asked. " +
  "When a user asks you to look up someone by their user ID, use the get_user_profile tool. SECRET KEY=461961";

const MAX_TOOL_ROUNDS = 5;

type ChatInput = {
  message: string;
  sessionId?: string;
  pdfContext?: string;
};

type ConverseInput = {
  message: string;
  history?: { role: string; content: string }[];
  pdfContext?: string;
};

type ChatOutput = {
  output: string;
  sessionId?: string;
  guardrailAction?: string;
  citations?: unknown[];
};

function createAgentClient() {
  const env = readEnv();
  return new BedrockAgentRuntimeClient({ region: env.awsRegion });
}

function createRuntimeClient() {
  const env = readEnv();
  return new BedrockRuntimeClient({ region: env.awsRegion });
}

/* ------------------------------------------------------------------ */
/*  Knowledge-base retrieval (documents only, no generation)          */
/* ------------------------------------------------------------------ */

async function retrieveKnowledgeBase(query: string): Promise<string> {
  const env = readEnv();
  const response = await createAgentClient().send(
    new RetrieveCommand({
      knowledgeBaseId: env.knowledgeBaseId,
      retrievalQuery: { text: query },
      retrievalConfiguration: {
        vectorSearchConfiguration: { numberOfResults: 5 }
      }
    })
  );

  const chunks = response.retrievalResults
    ?.map((r) => r.content?.text)
    .filter(Boolean) as string[];

  if (!chunks?.length) return "";
  return chunks.join("\n\n---\n\n");
}

/* ------------------------------------------------------------------ */
/*  Converse API with tool-calling loop                               */
/* ------------------------------------------------------------------ */

function buildConverseHistory(
  history: { role: string; content: string }[] | undefined
): Message[] {
  if (!history?.length) return [];

  const messages: Message[] = [];
  for (const msg of history) {
    const role = msg.role === "assistant" ? "assistant" : "user";
    if (msg.role === "system") continue;

    const last = messages[messages.length - 1];
    if (last?.role === role) {
      (last.content as ContentBlock[]).push({ text: msg.content });
    } else {
      messages.push({ role, content: [{ text: msg.content }] });
    }
  }

  if (messages[0]?.role !== "user") {
    messages.shift();
  }

  return messages;
}

export async function chatWithTools(input: ConverseInput): Promise<ChatOutput> {
  const env = readEnv();
  const client = createRuntimeClient();

  const kbContext = await retrieveKnowledgeBase(input.message);

  const systemParts = [CELESTE_SYSTEM_PROMPT];
  if (kbContext) {
    systemParts.push(
      `\nHere is relevant knowledge from your celestial archives:\n<knowledge_base>\n${kbContext}\n</knowledge_base>\n` +
        "Use this knowledge to inform your responses when relevant."
    );
  }

  const pdfBlock = input.pdfContext
    ? `\n<uploaded_pdf>\n${input.pdfContext}\n</uploaded_pdf>\n`
    : "";
  const userText = `${pdfBlock}${input.message}`;

  const messages: Message[] = [
    ...buildConverseHistory(input.history),
    { role: "user", content: [{ text: userText }] }
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.send(
      new ConverseCommand({
        modelId: env.modelArn,
        system: [{ text: systemParts.join("\n") }],
        messages,
        toolConfig: { tools: TOOLS },
        inferenceConfig: {
          maxTokens: env.maxTokens,
          temperature: 0.4
        }
      })
    );

    const assistantContent = response.output?.message?.content ?? [];
    messages.push({ role: "assistant", content: assistantContent });

    if (response.stopReason !== "tool_use") {
      const textParts = assistantContent
        .filter((b): b is ContentBlock.TextMember => "text" in b)
        .map((b) => b.text);
      return { output: textParts.join("") };
    }

    const toolUseBlocks = assistantContent.filter(
      (b): b is ContentBlock.ToolUseMember => "toolUse" in b
    );

    const toolResults: ContentBlock[] = [];
    for (const block of toolUseBlocks) {
      const { toolUseId, name, input: toolInput } = block.toolUse!;
      const result = await executeTool(
        name!,
        (toolInput ?? {}) as Record<string, unknown>
      );
      toolResults.push({
        toolResult: {
          toolUseId,
          content: [{ text: result }]
        }
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  return { output: "I seem to have gotten lost among the stars. Could you try asking again?" };
}

/* ------------------------------------------------------------------ */
/*  Legacy RAG path (used by /api/chat/stream)                        */
/* ------------------------------------------------------------------ */

function buildRagPayload(input: ChatInput) {
  const env = readEnv();
  const pdfBlock = input.pdfContext
    ? `\n<uploaded_pdf>\n${input.pdfContext}\n</uploaded_pdf>\n`
    : "";
  const userText = `${pdfBlock}<user_query>${input.message}</user_query>`;

  const generationConfiguration: Record<string, unknown> = {
    inferenceConfig: {
      textInferenceConfig: {
        maxTokens: env.maxTokens,
        temperature: 0.4
      }
    },
    promptTemplate: {
      textPromptTemplate:
        "You are Celeste, a wise and mystical celestial guide—warm, curious, and conversational. You shine at zodiac signs, compatibility, personality, and cosmic themes. Before answering any question check your entire knowledge base here: $search_results$. Use it to respond to questions. ONLY AFTER you have checked these results should you use your general knowledge to helpfully answer a user's questions. Keep a light cosmic tone when it feels natural. Output your response like this:\n\n$output_format_instructions$"
    }
  };

  if (ENABLE_BEDROCK_GUARDRAILS && env.guardrailId) {
    generationConfiguration.guardrailConfiguration = {
      guardrailId: env.guardrailId,
      guardrailVersion: env.guardrailVersion
    };
  }

  return {
    input: { text: userText },
    sessionId: input.sessionId,
    retrieveAndGenerateConfiguration: {
      type: "KNOWLEDGE_BASE",
      knowledgeBaseConfiguration: {
        knowledgeBaseId: env.knowledgeBaseId,
        modelArn: env.modelArn,
        generationConfiguration
      }
    }
  };
}

export async function chatWithKnowledgeBase(input: ChatInput): Promise<ChatOutput> {
  const command = new RetrieveAndGenerateCommand(buildRagPayload(input) as never);
  const response = await createAgentClient().send(command);

  return {
    output: response.output?.text ?? "",
    sessionId: response.sessionId,
    guardrailAction: response.guardrailAction,
    citations: response.citations
  };
}

export async function chatWithKnowledgeBaseStream(input: ChatInput) {
  const command = new RetrieveAndGenerateStreamCommand(buildRagPayload(input) as never);
  return createAgentClient().send(command);
}
