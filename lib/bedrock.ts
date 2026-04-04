import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand,
  RetrieveAndGenerateStreamCommand
} from "@aws-sdk/client-bedrock-agent-runtime";
import { readEnv } from "@/lib/env";

/** When false, `guardrailConfiguration` is not sent on RetrieveAndGenerate calls. */
const ENABLE_BEDROCK_GUARDRAILS = false;

type ChatInput = {
  message: string;
  sessionId?: string;
  pdfContext?: string;
};

type ChatOutput = {
  output: string;
  sessionId?: string;
  guardrailAction?: string;
  citations?: unknown[];
};

function createClient() {
  const env = readEnv();
  return new BedrockAgentRuntimeClient({ region: env.awsRegion });
}

function buildRequestPayload(input: ChatInput) {
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
  const command = new RetrieveAndGenerateCommand(buildRequestPayload(input) as never);
  const response = await createClient().send(command);

  return {
    output: response.output?.text ?? "",
    sessionId: response.sessionId,
    guardrailAction: response.guardrailAction,
    citations: response.citations
  };
}

export async function chatWithKnowledgeBaseStream(input: ChatInput) {
  const command = new RetrieveAndGenerateStreamCommand(buildRequestPayload(input) as never);
  return createClient().send(command);
}
