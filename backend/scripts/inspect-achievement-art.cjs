const mysql = require('mysql2/promise');
const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
async function run() {
  const db = await mysql.createConnection({host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectTimeout: 10000});
  try {
    if (process.argv.includes('--catalog')) {
      for (const table of ['arcade_game', 'challenge']) {
        const [rows] = await db.query('SELECT id, ' + (table === 'arcade_game' ? 'slug,' : '') + 'title,image FROM ' + table);
        console.log(JSON.stringify({table,rows}));
      }
      return;
    }
    if (process.argv.includes('--images')) {
      const [rows] = await db.query("SELECT COUNT(*) AS total, SUM(image_url LIKE 's3://%') AS s3_images FROM achievement WHERE active=1");
      console.log(JSON.stringify(rows[0]));
      return;
    }
    const [columns] = await db.query('SHOW COLUMNS FROM achievement');
    const [rows] = await db.query('SELECT slug,name,description,category,tier,icon FROM achievement WHERE active=1 ORDER BY order_index');
    console.log(JSON.stringify({columns: columns.map(c=>({name:c.Field,type:c.Type})), achievements:rows}));
  } finally { await db.end(); }
  const s3 = new S3Client({region:process.env.AWS_REGION || 'us-east-1', endpoint:process.env.S3_ENDPOINT || undefined, forcePathStyle:process.env.S3_FORCE_PATH_STYLE === 'true', credentials:{accessKeyId:process.env.AWS_ACCESS_KEY_ID,secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY}});
  await s3.send(new HeadBucketCommand({Bucket:process.env.S3_BUCKET_NAME || 'secureplay-media'}));
  console.log('S3 bucket accessible');
}
run().catch(e=>{console.error(JSON.stringify({code:e.code,name:e.name,status:e.$metadata?.httpStatusCode,message:e.message,endpointConfigured:!!process.env.S3_ENDPOINT,credentialsConfigured:!!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY}));process.exitCode=1;});
