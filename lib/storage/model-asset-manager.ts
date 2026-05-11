import fs from "fs/promises";
import path from "path";

import { nanoid } from "nanoid";

import { env } from "@/lib/utils/env";
import { sanitizeFileName } from "@/lib/utils/files";

function rootDir() {
  return path.resolve(process.cwd(), env.STORAGE_ROOT);
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function saveModelImage(params: {
  modelId: string;
  view: "front" | "back" | "side";
  source: { b64Json?: string | null; url?: string | null };
}) {
  const dir = path.join(rootDir(), "models", params.modelId);
  await ensureDir(dir);

  const fileName = `${params.view}.png`;
  const relativePath = path.join("models", params.modelId, fileName);
  const fullPath = path.join(rootDir(), relativePath);

  if (params.source.b64Json) {
    await fs.writeFile(fullPath, Buffer.from(params.source.b64Json, "base64"));
  } else if (params.source.url) {
    const res = await fetch(params.source.url);
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(fullPath, buffer);
  }

  return relativePath;
}

export async function saveOutfitImage(params: {
  shootId: string;
  angle: string;
  source: { b64Json?: string | null; url?: string | null };
}) {
  const dir = path.join(rootDir(), "outfits", params.shootId);
  await ensureDir(dir);

  const safeAngle = sanitizeFileName(params.angle);
  const fileName = `${Date.now()}-${nanoid(4)}-${safeAngle}.png`;
  const relativePath = path.join("outfits", params.shootId, fileName);
  const fullPath = path.join(rootDir(), relativePath);

  if (params.source.b64Json) {
    await fs.writeFile(fullPath, Buffer.from(params.source.b64Json, "base64"));
  } else if (params.source.url) {
    const res = await fetch(params.source.url);
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(fullPath, buffer);
  }

  return relativePath;
}

export async function readModelImage(modelId: string, view: "front" | "back" | "side"): Promise<Buffer | null> {
  const filePath = path.join(rootDir(), "models", modelId, `${view}.png`);
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

export async function deleteModelImages(modelId: string) {
  const dir = path.join(rootDir(), "models", modelId);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

export async function deleteOutfitImages(shootId: string) {
  const dir = path.join(rootDir(), "outfits", shootId);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}
