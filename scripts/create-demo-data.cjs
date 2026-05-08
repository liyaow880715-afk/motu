const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Create a demo access key
  const accessKey = await prisma.accessKey.upsert({
    where: { key: 'DEMO-KEY-001' },
    update: {},
    create: {
      key: 'DEMO-KEY-001',
      label: '演示账号',
      type: 'DAILY',
      activatedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('Created access key:', accessKey.key);

  // Create a demo project
  const project = await prisma.project.create({
    data: {
      name: '全麦山药茯苓馒头',
      status: 'DRAFT',
      platform: '淘宝',
      style: '清新自然',
      description: '低GI认证，药食同源，适合控糖人群的全麦健康馒头',
      accessKeyId: accessKey.key,
      analysis: {
        create: {
          rawResult: {},
          normalizedResult: {
            productName: '全麦山药茯苓馒头',
            category: '食品/烘焙',
            targetAudience: '控糖人群、健身人士、养生一族',
            sellingPoints: ['低GI认证', '三重高纤', '乳酸菌发酵', '药食同源'],
            scenarios: ['早餐代餐', '健身补充', '控糖主食'],
          },
        },
      },
      sections: {
        create: [
          {
            sectionKey: 'hero',
            type: 'HERO',
            title: '主图横幅',
            goal: '吸引眼球，展示产品核心卖点',
            copy: '低GI全麦山药茯苓馒头 | 控糖也能吃的主食',
            visualPrompt: '清新自然风格，产品特写，温暖的早餐场景',
            order: 0,
            status: 'SUCCESS',
          },
          {
            sectionKey: 'selling_points',
            type: 'SELLING_POINTS',
            title: '核心卖点',
            goal: '突出四大核心优势',
            copy: '低GI认证 · 三重高纤 · 乳酸菌发酵 · 药食同源',
            visualPrompt: '图标+文字排版，清新配色',
            order: 1,
            status: 'SUCCESS',
          },
          {
            sectionKey: 'scenario',
            type: 'SCENARIO',
            title: '使用场景',
            goal: '展示产品在实际生活中的应用',
            copy: '早餐代餐、健身补充、控糖主食，一日三餐都能吃',
            visualPrompt: '生活场景图，温馨家庭氛围',
            order: 2,
            status: 'SUCCESS',
          },
          {
            sectionKey: 'detail_closeup',
            type: 'DETAIL_CLOSEUP',
            title: '产品细节',
            goal: '展示产品规格和成分',
            copy: '规格：500g/袋（10个装）\n保质期：-18℃冷冻保存30天\n配料：全麦粉、山药粉、茯苓粉、酵母、水',
            visualPrompt: '产品包装展示，营养成分表',
            order: 3,
            status: 'IDLE',
          },
          {
            sectionKey: 'specs',
            type: 'SPECS',
            title: '参数规格',
            goal: '展示详细参数',
            copy: '产地：山东\n净含量：500g\n包装方式：真空包装\n储存条件：-18℃冷冻',
            visualPrompt: '参数表格排版',
            order: 4,
            status: 'IDLE',
          },
        ],
      },
    },
  });
  console.log('Created project:', project.id, project.name);

  // Create a second project
  const project2 = await prisma.project.create({
    data: {
      name: '有机野生蓝莓干',
      status: 'DRAFT',
      platform: '京东',
      style: '高端简约',
      description: '大兴安岭野生蓝莓，无添加健康零食',
      accessKeyId: accessKey.key,
      analysis: {
        create: {
          rawResult: {},
          normalizedResult: {
            productName: '有机野生蓝莓干',
            category: '食品/零食',
            targetAudience: '白领女性、健康人群、儿童',
            sellingPoints: ['野生采摘', '无添加', '花青素丰富', '独立小包装'],
          },
        },
      },
      sections: {
        create: [
          {
            sectionKey: 'hero',
            type: 'HERO',
            title: '主图横幅',
            goal: '吸引眼球',
            copy: '大兴安岭野生蓝莓干 | 零添加的健康零食',
            visualPrompt: '蓝莓特写，森林背景',
            order: 0,
            status: 'SUCCESS',
          },
        ],
      },
    },
  });
  console.log('Created project 2:', project2.id, project2.name);

  // Create some generation tasks
  await prisma.generationTask.createMany({
    data: [
      {
        projectId: project.id,
        taskType: 'ANALYZE',
        status: 'SUCCESS',
        inputPayload: {},
        outputPayload: {},
      },
      {
        projectId: project.id,
        taskType: 'PLAN',
        status: 'SUCCESS',
        inputPayload: {},
        outputPayload: {},
      },
      {
        projectId: project.id,
        taskType: 'GENERATE',
        status: 'SUCCESS',
        inputPayload: {},
        outputPayload: {},
      },
    ],
  });

  console.log('Demo data created successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
