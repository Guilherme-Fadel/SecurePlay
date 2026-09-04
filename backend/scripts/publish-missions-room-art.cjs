const { createReadStream, readdirSync, statSync } = require('fs');
const { join } = require('path');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

async function run() {
  const bucket = process.env.S3_BUCKET_NAME || 'secureplay-media';
  const source = join(__dirname, '..', '..', 'frontend', 'src', 'assets', 'missions-room');
  const files = readdirSync(source).filter((name) => name.endsWith('.png'));
  const client = new S3Client({
    region: process.env.AWS_REGION || (process.env.S3_ENDPOINT ? 'auto' : 'us-east-1'),
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY },
  });

  for (const name of files) {
    const path = join(source, name);
    const key = `ui/missions-room/v1/${name}`;
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: createReadStream(path), ContentType: 'image/png', CacheControl: 'private, max-age=31536000, immutable' }));
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    if (Number(head.ContentLength) !== statSync(path).size) throw new Error(`Falha ao verificar ${name}`);
    console.log(`Uploaded and verified ${key}`);
  }
}

run().catch((error) => { console.error(error.message); process.exitCode = 1; });
