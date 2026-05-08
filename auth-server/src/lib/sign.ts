import { generateKeyPairSync, createSign, createVerify } from "crypto";
import fs from "fs";
import path from "path";

const KEYS_DIR = path.join(process.cwd(), "keys");
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, "private.pem");
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, "public.pem");

function ensureKeys(): void {
  if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
    return;
  }
  fs.mkdirSync(KEYS_DIR, { recursive: true });
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  fs.writeFileSync(PRIVATE_KEY_PATH, privateKey);
  fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);
  console.log("[motu-auth-server] RSA key pair generated at", KEYS_DIR);
}

export function getPrivateKey(): string {
  ensureKeys();
  return fs.readFileSync(PRIVATE_KEY_PATH, "utf8");
}

export function getPublicKey(): string {
  ensureKeys();
  return fs.readFileSync(PUBLIC_KEY_PATH, "utf8");
}

export function signData(data: object): string {
  const sign = createSign("SHA256");
  sign.update(JSON.stringify(data));
  sign.end();
  return sign.sign(getPrivateKey(), "base64");
}

export function verifyData(data: object, signature: string): boolean {
  const verify = createVerify("SHA256");
  verify.update(JSON.stringify(data));
  verify.end();
  return verify.verify(getPublicKey(), signature, "base64");
}
