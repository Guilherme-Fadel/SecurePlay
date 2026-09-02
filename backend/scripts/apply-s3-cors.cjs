const { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } = require('@aws-sdk/client-s3');

// Origens permitidas para acesso direto do navegador ao bucket (upload via
// presigned POST e leitura via presigned GET). Ajuste conforme os ambientes.
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

// Origens de producao vindas do CORS_ORIGIN (mesma convencao do backend).
const prodOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const origins = Array.from(new Set([...ALLOWED_ORIGINS, ...prodOrigins]));

async function run() {
  const bucket = process.env.S3_BUCKET_NAME || 'secureplay-media';

  const client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const corsConfiguration = {
    CORSRules: [
      {
        AllowedOrigins: origins,
        AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD'],
        AllowedHeaders: ['*'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3000,
      },
    ],
  };

  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: corsConfiguration,
    }),
  );

  const current = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
  process.stdout.write(
    `CORS aplicado ao bucket "${bucket}". Regras atuais:\n${JSON.stringify(current.CORSRules, null, 2)}\n`,
  );
}

run().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
