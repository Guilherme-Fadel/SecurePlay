const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

async function run() {
  const local = process.argv.includes('--local');
  const single = process.argv.indexOf('--slug');
  const manifestPath = path.resolve(__dirname, '../../docs/achievement-art-manifest.json');
  const assetRoot = path.resolve(__dirname, '../../frontend/public/achievements');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entries = single < 0 ? manifest : manifest.filter(a => a.slug === process.argv[single + 1]);
  if (!entries.length) throw new Error('No matching assets');
  for (const entry of entries) {
    if (!/^[a-z0-9-]+$/.test(entry.slug)) throw new Error('Invalid slug');
    if (!fs.existsSync(path.join(assetRoot, entry.slug + '.png'))) throw new Error('Missing asset: ' + entry.slug);
  }
  const bucket = process.env.S3_BUCKET_NAME || 'secureplay-media';
  const s3 = new S3Client({region:process.env.AWS_REGION || 'us-east-1', endpoint:process.env.S3_ENDPOINT || undefined, forcePathStyle:process.env.S3_FORCE_PATH_STYLE === 'true', credentials:{accessKeyId:process.env.AWS_ACCESS_KEY_ID,secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY}});
  const db = await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT || 3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,connectTimeout:10000});
  try {
    const [columns] = await db.query("SHOW COLUMNS FROM achievement LIKE 'image_url'");
    if (!columns.length) await db.query('ALTER TABLE achievement ADD COLUMN image_url VARCHAR(1024) NULL');
    const slugs = entries.map(a=>a.slug);
    const [before] = await db.query('SELECT slug,image_url FROM achievement WHERE slug IN (?)', [slugs]);
    if (before.length !== entries.length) throw new Error('Catalog does not match manifest');
    const backupDir = path.resolve(__dirname, '../../tmp/achievement-art');
    fs.mkdirSync(backupDir,{recursive:true});
    fs.writeFileSync(path.join(backupDir, 'backup-' + Date.now() + '.json'), JSON.stringify(before,null,2));
    const updates = [];
    for (const entry of entries) {
      let source = '/achievements/' + entry.slug + '.png';
      if (!local) {
        const body = fs.readFileSync(path.join(assetRoot, entry.slug + '.png'));
        const hash = crypto.createHash('sha256').update(body).digest('hex').slice(0,16);
        const key = 'achievements/pixel-v1/' + entry.slug + '-' + hash + '.png';
        try {
          await s3.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:body,ContentType:'image/png',CacheControl:'public, max-age=31536000, immutable',IfNoneMatch:'*'}));
        } catch (e) { if (e.$metadata?.httpStatusCode !== 412) throw e; }
        const signed = await getSignedUrl(s3,new GetObjectCommand({Bucket:bucket,Key:key}),{expiresIn:60});
        const response = await fetch(signed);
        if (!response.ok) throw new Error('Image read failed: ' + response.status);
        const downloaded = Buffer.from(await response.arrayBuffer());
        if (!downloaded.equals(body)) throw new Error('Uploaded image differs');
        source = 's3://' + bucket + '/' + key;
      }
      updates.push([source, entry.slug]);
      console.log('Verified ' + entry.slug + (local ? ' locally' : ' in S3'));
    }
    await db.beginTransaction();
    try {
      for (const [source,slug] of updates) await db.execute('UPDATE achievement SET image_url=? WHERE slug=?',[source,slug]);
      await db.commit();
    } catch(e) { await db.rollback(); throw e; }
    console.log('Updated images for ' + updates.length + ' achievements.');
  } finally { await db.end(); }
}
run().catch(e=>{console.error(JSON.stringify({name:e.name,code:e.code,status:e.$metadata?.httpStatusCode,message:e.message}));process.exitCode=1;});
