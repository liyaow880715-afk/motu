import { NextRequest } from "next/server";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";

import { prisma } from "@/lib/db/prisma";
import { handleRouteError, ok } from "@/lib/utils/route";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        analysis: true,
        sections: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!project) {
      return handleRouteError(new Error("Project not found."));
    }

    const children: any[] = [];

    children.push(new Paragraph({
      text: `${project.name} 详情页设计方案`,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }));

    if (project.style) {
      children.push(new Paragraph({
        text: `设计风格：${project.style}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }));
    }

    project.sections.forEach((section, index) => {
      const editable = (section.editableData as Record<string, unknown>) ?? {};
      children.push(new Paragraph({ text: "", spacing: { before: 300 } }));
      children.push(new Paragraph({
        text: `模块${index + 1}：${section.title}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 150 },
      }));

      if (editable.mainTitle) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: "【主标题】：", bold: true, size: 21 }),
            new TextRun({ text: String(editable.mainTitle), size: 21 }),
          ],
          spacing: { after: 100 },
        }));
      }

      if (editable.subTitle) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: "【副标题】：", bold: true, size: 21 }),
            new TextRun({ text: String(editable.subTitle), size: 21 }),
          ],
          spacing: { after: 100 },
        }));
      }

      if (editable.layout) {
        children.push(new Paragraph({
          children: [new TextRun({ text: "【排版布局】：", bold: true, size: 21 })],
          spacing: { after: 60 },
        }));
        children.push(new Paragraph({ text: String(editable.layout), spacing: { after: 150 } }));
      }

      if (editable.visualDescription) {
        children.push(new Paragraph({
          children: [new TextRun({ text: "【视觉描述】：", bold: true, size: 21 })],
          spacing: { after: 60 },
        }));
        children.push(new Paragraph({ text: String(editable.visualDescription), spacing: { after: 150 } }));
      }

      children.push(new Paragraph({
        children: [new TextRun({ text: "【AI 绘画正向提示词】：", bold: true, size: 21, color: "2D5016" })],
        spacing: { after: 60 },
      }));
      children.push(new Paragraph({
        text: section.visualPrompt || "",
        spacing: { after: 100 },
      }));

      if (editable.negativePrompt) {
        children.push(new Paragraph({
          children: [new TextRun({ text: "【负向提示词】：", bold: true, size: 21, color: "991B1B" })],
          spacing: { after: 60 },
        }));
        children.push(new Paragraph({
          text: String(editable.negativePrompt),
          spacing: { after: 100 },
        }));
      }

      if (editable.colorScheme) {
        children.push(new Paragraph({
          children: [new TextRun({ text: "【色彩方案】：", bold: true, size: 21 })],
          spacing: { after: 60 },
        }));
        const cs = editable.colorScheme as Record<string, string[][]>;
        ["primary", "secondary", "accent"].forEach((type) => {
          const label = type === "primary" ? "主色" : type === "secondary" ? "辅助色" : "点缀色";
          (cs[type] || []).forEach((c: string[]) => {
            children.push(new Paragraph({
              children: [new TextRun({ text: `${label}：${c[0]} ${c[1]}`, size: 21 })],
              spacing: { after: 40 },
            }));
          });
        });
      }

      children.push(new Paragraph({
        children: [
          new TextRun({ text: "【留白率】：", bold: true, size: 21 }),
          new TextRun({ text: `${editable.whitespaceRatio || 35}%`, size: 21 }),
        ],
        spacing: { before: 100, after: 200 },
      }));
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children,
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const base64 = buffer.toString("base64");

    return ok({
      fileName: `${project.name}_详情页方案.docx`,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      base64,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
