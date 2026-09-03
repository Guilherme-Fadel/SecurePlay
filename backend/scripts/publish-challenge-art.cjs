// Publishes only known placeholder artwork; preserves custom images and nulls.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

async function run() {
  const apply = process.argv.includes('--apply');
  const bucket = process.env.S3_BUCKET_NAME || 'secureplay-media';
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1', endpoint: process.env.S3_ENDPOINT || undefined, forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true', credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } });
  const slugs = ['caca-phishing', 'termotech', 'quiz-relampago', 'classificacao-dados', 'worldmap'];
  try {
    const updates = [];
    for (const table of ['arcade_game', 'challenge']) {
      const [rows] = await db.query(`SELECT id,image FROM ${table}`);
      for (const row of rows) {
        const slug = slugs.find(s => row.image === `/challenges/${s}.svg` || row.image === `/challenges/${s}.png` || row.image === `/challenges/${s}-pixel.png` || (s === 'worldmap' && row.image === '/prototypes/worldmap/global-map.png'));
        if (slug) updates.push({ table, id: row.id, before: row.image, slug });
      }
    }
    console.log(JSON.stringify({ apply, updates }));
    if (!apply || !updates.length) return;
    const backupDir = path.resolve(__dirname, '../../tmp/challenge-art');
    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(path.join(backupDir, `backup-${Date.now()}.json`), JSON.stringify(updates, null, 2));
    const sources = new Map();
    for (const slug of new Set(updates.map(u => u.slug))) {
      const body = fs.readFileSync(path.resolve(__dirname, `../../frontend/public/challenges/${slug}-pixel.png`));
      const hash = crypto.createHash('sha256').update(body).digest('hex').slice(0, 16);
      const key = `challenges/pixel-v1/${slug}-${hash}.png`;
      try {
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'image/png', CacheControl: 'public, max-age=31536000, immutable', IfNoneMatch: '*' }));
      } catch (e) { if (e.$metadata?.httpStatusCode !== 412) throw e; }
      const signed = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 60 });
      const response = await fetch(signed);
      if (!response.ok || !Buffer.from(await response.arrayBuffer()).equals(body)) throw new Error(`Verification failed: ${slug}`);
      sources.set(slug, `s3://${bucket}/${key}`);
      console.log(`Verified ${slug} in S3`);
    }
    await db.beginTransaction();
    try {
      for (const u of updates) {
        const [result] = await db.execute(`UPDATE ${u.table} SET image=? WHERE id=? AND image=?`, [sources.get(u.slug), u.id, u.before]);
        if (result.affectedRows !== 1) throw new Error('Concurrent image change; rolling back');
      }
      await db.commit();
    } catch (e) { await db.rollback(); throw e; }
    console.log(`Updated ${updates.length} records; custom images and nulls preserved.`);
  } finally { await db.end(); }
}
run().catch(e => { console.error({ name: e.name, code: e.code, message: e.message }); process.exitCode = 1; });
