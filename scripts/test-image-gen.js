const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const algorithm = "aes-256-gcm";
const ivLength = 12;
const APP_SECRET = "replace-with-your-own-long-secret";

function getKey() {
  return crypto.createHash("sha256").update(APP_SECRET).digest();
}

function decryptSecret(value) {
  const [ivHex, tagHex, encryptedHex] = value.split(":");
  if (!ivHex || !tagHex || !encryptedHex) throw new Error("Invalid encrypted secret payload.");
  const decipher = crypto.createDecipheriv(algorithm, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]).toString("utf8");
}

const prisma = new PrismaClient();

async function main() {
  const p = await prisma.providerConfig.findFirst({ where: { purpose: 'image', isActive: true } });
  if (!p) { console.log('No active image provider'); return; }

  const apiKey = decryptSecret(p.apiKeyEncrypted);
  const baseUrl = p.baseUrl.replace(/\/+$/, '');

  console.log('Provider:', p.name, p.baseUrl);
  console.log('Key prefix:', apiKey.slice(0, 8) + '...');

  for (const path of ['/images/generations', '/v1/images/generations']) {
    console.log('\n--- Testing', baseUrl + path);
    try {
      const res = await fetch(baseUrl + path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'image2',
          prompt: 'A cute cat sitting on a sofa, photorealistic',
          size: '1024x1024',
        }),
      });
      const body = await res.text();
      console.log('Status:', res.status);
      console.log('Body:', body.slice(0, 2000));
    } catch (e) {
      console.log('Error:', e.message);
    }
  }

  // Also test /models to see what's available
  console.log('\n--- Testing /models');
  try {
    const res = await fetch(baseUrl + '/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const body = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', body.slice(0, 3000));
  } catch (e) {
    console.log('Error:', e.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
