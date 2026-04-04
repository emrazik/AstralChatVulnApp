/**
 * Creates the Bedrock-compatible vector index on OpenSearch Serverless (SigV4, service "aoss").
 * Run from repo root: node infra/scripts/create-aoss-kb-index.cjs
 * Env: COLLECTION_ENDPOINT, AWS_REGION, INDEX_NAME, EMBEDDING_DIMENSION, VECTOR_FIELD
 */

const https = require("https");
const { URL } = require("url");
const { defaultProvider } = require("@aws-sdk/credential-provider-node");
const { SignatureV4 } = require("@smithy/signature-v4");
const { Sha256 } = require("@aws-crypto/sha256-js");
const { HttpRequest } = require("@smithy/protocol-http");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isAlreadyExists(statusCode, body) {
  const t = `${body}`;
  return (
    statusCode === 400 &&
    (/resource_already_exists_exception/i.test(t) ||
      /index_already_exists_exception/i.test(t) ||
      /already exists/i.test(t))
  );
}

async function putIndexOnce({ host, path, body, region }) {
  const url = new URL(`https://${host}${path}`);
  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region,
    service: "aoss",
    sha256: Sha256,
  });

  const request = new HttpRequest({
    method: "PUT",
    hostname: host,
    path: url.pathname,
    protocol: url.protocol.replace(":", ""),
    headers: {
      host,
      "content-type": "application/json",
    },
    body,
  });

  const signed = await signer.sign(request);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: host,
        path: url.pathname,
        method: "PUT",
        headers: signed.headers,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => {
          data += c;
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode, body: data });
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const endpoint = process.env.COLLECTION_ENDPOINT;
  const region = process.env.AWS_REGION;
  const indexName = process.env.INDEX_NAME;
  const dimension = parseInt(process.env.EMBEDDING_DIMENSION || "1024", 10);
  const vectorField = process.env.VECTOR_FIELD || "bedrock-knowledge-base-vector";

  if (!endpoint || !region || !indexName) {
    console.error("Missing COLLECTION_ENDPOINT, AWS_REGION, or INDEX_NAME");
    process.exit(1);
  }

  const base = new URL(endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint);
  const host = base.hostname;
  const path = `/${indexName}`;

  const payload = {
    settings: {
      index: { knn: true },
    },
    mappings: {
      properties: {
        [vectorField]: {
          type: "knn_vector",
          dimension,
          space_type: "l2",
          method: {
            name: "hnsw",
            engine: "faiss",
            parameters: {
              ef_construction: 128,
              m: 24,
            },
          },
        },
        AMAZON_BEDROCK_METADATA: {
          type: "text",
          index: false,
        },
        AMAZON_BEDROCK_TEXT_CHUNK: {
          type: "text",
          index: true,
        },
      },
    },
  };

  const body = JSON.stringify(payload);
  const maxAttempts = 8;
  const delayMs = 15000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { statusCode, body: resBody } = await putIndexOnce({ host, path, body, region });
      if (statusCode === 200 || statusCode === 201) {
        console.log(`Index ${indexName} created (${statusCode})`);
        return;
      }
      if (isAlreadyExists(statusCode, resBody)) {
        console.log(`Index ${indexName} already exists; ok`);
        return;
      }
      console.error(`Attempt ${attempt}/${maxAttempts}: HTTP ${statusCode}: ${resBody}`);
    } catch (e) {
      console.error(`Attempt ${attempt}/${maxAttempts}: ${e.message || e}`);
    }
    if (attempt < maxAttempts) {
      await sleep(delayMs);
    }
  }

  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
