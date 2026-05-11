import { NextRequest } from "next/server";

import {
  createOutfitShoot,
  generateOutfitShot,
  updateOutfitShoot,
} from "@/lib/services/model-service";
import { handleRouteError, ok } from "@/lib/utils/route";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      modelTemplateId,
      name,
      clothingType,
      clothingImagePath,
      sceneStyle,
      accessories,
      background,
      aspectRatio,
    } = body;

    if (!modelTemplateId || !clothingType || !clothingImagePath) {
      throw new Error("modelTemplateId, clothingType, and clothingImagePath are required");
    }

    // 1. Create outfit shoot record
    const shoot = await createOutfitShoot({
      modelTemplateId,
      name: name || `${clothingType} 试衣`,
      clothingType,
      clothingAssets: [{ filePath: clothingImagePath, type: clothingType }],
      sceneStyle,
      accessories,
      background,
    });

    // 2. Update status to generating
    await updateOutfitShoot(shoot.id, { status: "generating" });

    // 3. Generate outfit shot
    const resultPath = await generateOutfitShot({
      shootId: shoot.id,
      modelTemplateId,
      clothingType,
      clothingImagePath,
      sceneStyle,
      accessories,
      background,
      aspectRatio,
    });

    // 4. Update with result
    const updated = await updateOutfitShoot(shoot.id, {
      status: "completed",
      resultImages: [{ angle: "front", filePath: resultPath }],
    });

    return ok(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}
