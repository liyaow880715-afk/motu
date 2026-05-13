import { NextRequest } from "next/server";
import { z } from "zod";
import { analyzeTemplate } from "@/lib/services/template-service";
import { checkAndDeductCredits, refundCredits } from "@/lib/services/credit-service";
import { getAccessKeyFromHeader } from "@/lib/utils/auth";
import { handleRouteError, ok } from "@/lib/utils/route";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import sharp from "sharp";

const analyzeSchema = z.object({
  description: z.string().optional().default(""),
  images: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const accessKey = getAccessKeyFromHeader(request);
  try {
    if (!accessKey) {
      return ok({ error: "缺少访问密钥" });
    }
    await checkAndDeductCredits(accessKey);

    const contentType = request.headers.get("content-type") ?? "";

    // Handle multipart form data (file upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const description = String(formData.get("description") ?? "");
      const imageFiles = formData.getAll("images") as File[];

      const imageUrls: string[] = [];
      const uploadDir = join(process.cwd(), "storage", "templates");
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        if (!file || file.size === 0) continue;

        const bytes = await file.arrayBuffer();
        let buffer: Buffer = Buffer.from(bytes) as Buffer;

        // Compress large images with sharp
        try {
          const metadata = await sharp(buffer).metadata();
          const width = metadata.width ?? 0;
          const height = metadata.height ?? 0;

          // If image is very large, resize and compress
          if (width > 1200 || height > 3000 || buffer.length > 1024 * 1024) {
            // Image compression in progress
            buffer = (await sharp(buffer)
              .resize({
                width: Math.min(width, 1200),
                height: Math.min(height, 4000),
                fit: "inside",
                withoutEnlargement: true,
              })
              .jpeg({ quality: 80, progressive: true })
              .toBuffer()) as Buffer;
            // Image compression complete
          }
        } catch (err) {
          // Sharp compression skipped
        }

        const ext = "jpg";
        const fileName = `${Date.now()}_${i}.${ext}`;
        const filePath = join(uploadDir, fileName);
        writeFileSync(filePath, buffer);

        const base64 = buffer.toString("base64");
        const mimeType = "image/jpeg";
        imageUrls.push(`data:${mimeType};base64,${base64}`);
      }

      const { structure, rawText } = await analyzeTemplate(description, imageUrls.length > 0 ? imageUrls : undefined);
      return ok({ structure, rawText });
    }

    // Handle JSON body (text-only)
    const parsed = analyzeSchema.parse(await request.json());
    const { structure, rawText } = await analyzeTemplate(parsed.description);
    return ok({ structure, rawText });
  } catch (error) {
    if (accessKey) await refundCredits(accessKey);
    return handleRouteError(error);
  }
}
