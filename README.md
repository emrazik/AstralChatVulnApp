# AstralChat CTF

A deliberately vulnerable AI chatbot for practicing attacks on (and defenses for) LLM apps: prompt injection, RAG leaks, agent tool abuse, insecure output handling and SSRF. Each exploit unlocks a card you can use to battle the AI.

<img src="docs/screenshots/prompt-injection-unlock.png" alt="AstralChat" width="900">

> ⚠️ **Intentionally insecure.** Run it in an isolated AWS account and network, never with real data, and only test systems you own.

## Setup

### Prerequisites

- Node.js 20+, npm 10+, AWS CLI v2, Terraform 1.6+
- An AWS identity for Terraform with `bedrock:*`, `cognito-idp:*`, `s3:*`, `iam:*`, `aoss:*`, `dynamodb:*`, plus `aws-marketplace:ViewSubscriptions` and `aws-marketplace:Subscribe` for first-time model access

### 1. Deploy the infrastructure

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # set your model ARN; never commit this file
terraform init
terraform apply
```

This creates Cognito, an S3 bucket, a Bedrock Knowledge Base (OpenSearch Serverless), a Bedrock Guardrail, DynamoDB tables and IAM roles.

Invoke the model once so Bedrock enables it for your account:

```bash
aws bedrock-runtime invoke-model \
  --model-id anthropic.claude-3-haiku-20240307-v1:0 --region us-east-1 \
  --content-type application/json --accept application/json \
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}' \
  /dev/null
```

Haiku works, but the PDF scanner is more reliable with Sonnet 4.5 (use an inference-profile ARN).

### 2. Load the knowledge base

```powershell
.\infra\scripts\upload-kb.ps1    # reads bucket/KB IDs from terraform output and starts ingestion
```

### 3. Configure and run

```bash
cp .env.example .env.local
npm install
npm run dev        # http://localhost:3000
```

Fill `.env.local` from `terraform output -raw <name>` (on Windows, `.\scripts\sync-env-from-terraform.ps1 -EnvFile .env.local` does most of it):

| Variable | Source |
|---|---|
| `BEDROCK_KNOWLEDGE_BASE_ID` | `knowledge_base_id` |
| `BEDROCK_GUARDRAIL_ID` / `BEDROCK_GUARDRAIL_VERSION` | `guardrail_id` / `guardrail_version` |
| `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` | `cognito_user_pool_id` / `cognito_client_id` |
| `DYNAMODB_PROFILE_TABLE` / `_BATTLES_TABLE` / `_MESSAGES_TABLE` | `profile_table_name` / `battles_table_name` / `messages_table_name` |
| `BEDROCK_MODEL_ARN` | Same model you gave Terraform |
| `APP_SECRET` | Any random value: `openssl rand -hex 32` |

### Docker (optional)

```bash
cp .env.docker.example .env.docker     # same values as above
mkdir .aws-runtime                     # add a credentials file with an [astralchat-runtime] profile
docker compose up -d --build           # http://127.0.0.1:3000
```

The container only sees `.aws-runtime/`, never your `~/.aws`. Give that profile the minimal policy below.

<details>
<summary>Minimal runtime IAM policy</summary>

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": ["arn:aws:bedrock:*::foundation-model/*", "arn:aws:bedrock:*:<account-id>:inference-profile/*"] },
    { "Effect": "Allow", "Action": ["bedrock:Retrieve", "bedrock:RetrieveAndGenerate"],
      "Resource": "arn:aws:bedrock:<region>:<account-id>:knowledge-base/<kb-id>" },
    { "Effect": "Allow", "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:Scan"],
      "Resource": "arn:aws:dynamodb:<region>:<account-id>:table/astralchat-*" },
    { "Effect": "Allow", "Action": "cognito-idp:AdminConfirmSignUp",
      "Resource": "arn:aws:cognito-idp:<region>:<account-id>:userpool/<user-pool-id>" }
  ]
}
```

</details>

### Hosting for others

- The SSRF is real: run the app on an isolated VM or VPC, not on your home network. On AWS, enforce IMDSv2 with a hop limit of 1.
- Use the runtime policy above, never admin credentials, and set an AWS Budget alarm.
- Every flag is in this repo. For a live event, change the secret key (`lib/bedrock.ts`, `lib/nova-agent.ts`, `lib/overseer.ts`) and the planted key in the Mercury article.

### Tear down

```bash
cd infra && terraform destroy
```

### Troubleshooting

| Error | Fix |
|---|---|
| `Model access is denied … aws-marketplace` | Add the `aws-marketplace` permissions above, then invoke the model once |
| `on-demand throughput isn't supported` | Use an inference-profile ARN (`aws bedrock list-inference-profiles`) |
| `guardrail identifier or version … does not exist` | `aws bedrock create-guardrail-version --guardrail-identifier <id>` |
| `dynamodb:DescribeTable … is not authorized` | Add DynamoDB permissions to the Terraform identity |
| `Document context must come from an uploaded PDF` | Re-upload the PDF; set `APP_SECRET` so this survives restarts |

## Challenges

Seven vulnerabilities, each unlocking a card when you exploit it. Collect all seven, then beat Celeste in battle for a hidden Mythic card. Hints are on the landing page.

<details>
<summary><b>Show challenges</b> (mild spoilers)</summary>

1. Extract the secret from Celeste's system prompt
2. Leak a credential hidden in the knowledge base
3. Make the link preview fetch a URL of your choosing
4. Read another user's profile through Celeste's tools
5. Get Celeste to run JavaScript in the chat
6. Deliver that payload through a PDF the scanner approves
7. Hijack Nova, the background agent, from #general

</details>

<details>
<summary><b>Show solutions and mitigations</b> (full spoilers)</summary>

1. **System prompt leak.** The prompt contains `SECRET KEY=461961`. *Fix:* keep secrets out of prompts entirely; assume users can read them.
2. **RAG leak.** `content/articles/article-digital-boundaries-mercury.md` holds a fake API key. *Fix:* scan documents before ingestion and filter retrieval by user/role.
3. **SSRF.** `/api/preview` fetches any URL, follows redirects and returns the body. *Fix:* allowlist hosts, block private/link-local ranges on every redirect, enforce IMDSv2.
4. **BOLA via tools.** `get_user_profile` accepts any user ID (try Luna, `U4C554E`). *Fix:* authorize tools with the session's identity, never model-supplied arguments.
5. **XSS.** Replies render through `markdown-it` with `html: true` and a weak `naiveStrip()`. *Fix:* treat model output as untrusted; disable HTML or sanitize, and add a CSP.
6. **Indirect injection via PDF.** The scanner checks rendered pixels, but `pdf-parse` also extracts white-on-white or 0-pt text. *Fix:* inspect the extracted text, and never treat documents as instructions.
7. **Agent hijack.** Nova obeys channel messages shaped like `send_message` tool calls. *Fix:* agents shouldn't take instructions from content they read; scope their tools and gate side effects.

</details>
