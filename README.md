# AstralChat

AstralChat is a dark, galaxy-themed web app where users chat with an "Astral Guide" character for star-sign insights. It uses AWS Bedrock RAG (`RetrieveAndGenerate`) with a Bedrock Knowledge Base, Cognito auth, Guardrails for prompt-injection and unsafe-content protection, and Terraform for one-command start/stop of infrastructure.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- AWS Bedrock Agent Runtime (`@aws-sdk/client-bedrock-agent-runtime`)
- Amazon Cognito auth (JWT-based session cookie)
- Bedrock Guardrails
- Terraform for Cognito + S3 + KB + Guardrail + Amplify + IAM

## Local Setup

1. Install prerequisites:
   - Node.js 20+
   - npm 10+
   - AWS CLI v2
2. **IAM permissions** – The IAM user or role running `terraform apply` and the local dev server needs these permissions at minimum:
   - `bedrock:*`, `cognito-idp:*`, `s3:*`, `iam:*`, `aoss:*`
   - `dynamodb:*` (or at least `DescribeTable`, `CreateTable`, `UpdateTable`, `DeleteTable`, `PutItem`, `GetItem`, `UpdateItem`, `ListTables`) – required for the user profile table and for Terraform to manage `aws_dynamodb_table.profiles`. Without this, `terraform apply` fails with `AccessDeniedException` on `dynamodb:DescribeTable`.
   - `aws-marketplace:ViewSubscriptions`, `aws-marketplace:Subscribe` – required for first-time model activation (Bedrock auto-subscribes to Marketplace-backed models like Claude on first invocation)
3. **Activate the model** – After `terraform apply`, invoke the generation model once so Bedrock enables it account-wide:
   ```bash
   aws bedrock-runtime invoke-model \
     --model-id anthropic.claude-3-haiku-20240307-v1:0 \
     --region us-east-1 \
     --content-type application/json --accept application/json \
     --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}' \
     /dev/null
   ```
   If this returns a 403 about Marketplace permissions, add the `aws-marketplace` actions listed above to your IAM policy and retry after ~2 minutes.
4. Copy `.env.example` to `.env.local` and populate values (use `BEDROCK_REGION` or `AWS_REGION` for the AWS region).
5. Install dependencies:
   - `npm install`
6. Start development server:
   - `npm run dev`
7. Open `http://localhost:3000`.

## Auth Flow

- `/api/auth/signup` creates users in Cognito.
- `/api/auth/confirm` confirms user sign-up.
- `/api/auth/login` verifies credentials and sets secure HTTP-only cookie.
- `/api/auth/session` checks current auth state.
- `/api/chat` and `/api/chat/stream` require valid auth.

## Bedrock RAG + Guardrails

- Chat endpoints call `RetrieveAndGenerate` / `RetrieveAndGenerateStream`.
- User prompt is wrapped in `<user_query>...</user_query>` before model call.
- Guardrail config is applied through `generationConfiguration.guardrailConfiguration`.
- If Guardrails block content, API returns a safe blocked response state.

## Astral Theme

- Dark-mode only.
- Blue/purple accents, starfield background, cosmic visual style.
- Theme tokens in `app/globals.css` and Tailwind config.

## Cost Controls

- Default to a smaller model ARN (Haiku-class recommended).
- Response token cap via `BEDROCK_MAX_TOKENS`.
- Optional in-memory rate limit per authenticated user.
- On-demand inference and serverless hosting to minimize idle spend.
- Add AWS Budgets and Cost Anomaly Detection for alerts.

## Terraform: Start and Stop

All infra is under `infra/`.

### Initialize

Create a local vars file (gitignored; never commit secrets):

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # macOS/Linux
# Windows (PowerShell): Copy-Item terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` as needed (e.g. GitHub PAT when `enable_amplify_hosting` is true), then:

```bash
terraform init
```

### Start stack

```bash
terraform apply
```

This provisions:
- Cognito user pool + app client
- S3 bucket for KB content
- Bedrock knowledge base + data source
- Bedrock guardrail + published version (required for `RetrieveAndGenerate` — `DRAFT` alone is not sufficient)
- IAM roles/policies for Bedrock access (including `aws-marketplace` permissions for model activation)
- Optionally (see `enable_amplify_hosting` in `infra/terraform.tfvars.example`): Amplify app + main branch connected to GitHub

### Upload and sync KB content

After `terraform apply`, get IDs from Terraform (avoids needing `bedrock:ListDataSources` on your IAM user):

```powershell
cd infra
terraform output -raw kb_bucket_name
terraform output -raw knowledge_base_id
terraform output -raw kb_data_source_id
```

Upload content and start ingestion:

```powershell
.\infra\scripts\upload-kb.ps1 -BucketName "<bucket>" -KnowledgeBaseId "<kbId>" -DataSourceId "<dataSourceId>" -Region "us-east-1"
```

### Stop stack

```bash
cd infra
terraform destroy
```

This removes all app infra resources so you can quickly stop spend when not using the project.

## Deploy with Amplify

Set `enable_amplify_hosting = true` in your local `infra/terraform.tfvars` (from the example) and use a valid GitHub PAT. If Amplify returns **401**, the token is wrong, expired, or missing **repo** (classic) or the right repository permissions (fine-grained). With hosting off (`false`, the default in the example), apply still provisions Cognito, Bedrock, and OpenSearch for local use.

When enabled, Terraform provisions `aws_amplify_app` with `platform = "WEB_COMPUTE"` and pushes env vars required by the Next.js app.

The app uses `amplify.yml` for CI build:
- `npm ci`
- `npm run build`

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `textPromptTemplate must contain the $search_results$ placeholder` | Prompt template in `lib/bedrock.ts` is missing `$search_results$` | Ensure `textPromptTemplate` includes `$search_results$` (Bedrock injects KB results here) |
| `Model access is denied … aws-marketplace:ViewSubscriptions` | IAM user/role lacks Marketplace permissions for first-time model activation | Add `aws-marketplace:ViewSubscriptions` and `aws-marketplace:Subscribe` to IAM policy, then invoke the model once |
| `The guardrail identifier or version … does not exist` | Guardrail has only a `DRAFT` version; no published numeric version | Terraform now creates a published version automatically; if missing, run `aws bedrock create-guardrail-version --guardrail-identifier <id>` |
| `dynamodb:DescribeTable … is not authorized` during `terraform apply` | IAM user running Terraform has no DynamoDB permissions | Add `dynamodb:*` (or the actions listed under **IAM permissions** above) to that user’s policy, then run `terraform apply` again |
| `Invocation of model ID … with on-demand throughput isn’t supported` / use an inference profile | You’re using a foundation-model ARN for a model that only accepts **inference profiles** (common for newer Claude Sonnet, etc.) | Set `BEDROCK_MODEL_ARN` to an inference profile ARN: `arn:aws:bedrock:<region>:<account-id>:inference-profile/<profile-id>` (e.g. `us.anthropic.claude-sonnet-4-5-20250929-v1:0` in `us-east-1`). Find IDs: `aws bedrock list-inference-profiles --region <region>`; account: `aws sts get-caller-identity --query Account --output text`. Use the same value for `bedrock_generation_model_arn` in Amplify/Terraform if you deploy that way. |

## Notes

- Keep `BEDROCK_MODEL_ARN` on a lower-cost model unless higher quality is required.
- Never expose AWS credentials in client-side code.
- Consider adding durable rate limits (Redis/API Gateway) for production-scale abuse protection.
