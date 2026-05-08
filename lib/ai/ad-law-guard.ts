/**
 * 广告法风控模块 - 类目化广告法敏感词与规则库
 * 按产品类目提供广告法禁区提示，用于注入 AI prompt 和后处理校验
 */

export type AdLawCategory = "food" | "health_food" | "cosmetic" | "medical_device" | "pharmacy" | "baby" | "textile" | "general" | "digital" | "home";

export interface AdLawRule {
  category: AdLawCategory;
  categoryLabel: string;
  forbiddenWords: string[];
  forbiddenPatterns: RegExp[];
  cautionPhrases: string[];
  guidelines: string[];
}

const ABSOLUTE_WORDS = [
  "最", "第一", "顶级", "最佳", "唯一", "首创", "领先", "极品", "终极",
  "国家级", "最高级", "第一品牌", "NO.1", "销量第一", "排名第一", "独一无二",
  "绝对", "永远", "100%", "百分百", "纯天然", "纯手工", "无副作用",
  "永不", "零风险", "无效退款", "立竿见影", "药到病除", "根治", "痊愈",
  "治疗", "治愈", "疗效", "药效", "医疗作用", "诊断", "处方", "神医",
  "药妆", "医学护肤", "医学级", "医院同款", "医生推荐", "专利", "秘方",
  "祖传", "皇室", "御用", "进贡", "特供", "专供", "免检", "国家领导人",
  "央视", "央视上榜", "CCTV", "诺贝尔奖", "国际认证（无依据时）",
];

export const adLawRules: Record<AdLawCategory, AdLawRule> = {
  food: {
    category: "food",
    categoryLabel: "食品/普通食品",
    forbiddenWords: [
      ...ABSOLUTE_WORDS,
      "治疗", "治愈", "疗效", "药效", "医疗作用", "诊断", "处方",
      "保健功能", "调节血脂", "降血糖", "降血压", "抗癌", "防癌",
      "排毒", "清肠", "燃脂", "瘦身", "减肥", "丰胸", "增高",
      "纯天然", "零添加", "无添加", "不含任何化学成分",
      "有机（无认证时）", "绿色（无认证时）",
    ],
    forbiddenPatterns: [
      /治疗\w+/, /治愈\w+/, /疗效/, /药效/, /医疗作用/,
      /调节(血糖|血脂|血压)/, /抗癌|防癌/,
      /排毒|清肠|燃脂|瘦身|减肥|丰胸|增高/,
      /零添加|无添加|不含.*化学/,
    ],
    cautionPhrases: [
      "低GI", "高纤维", "益生菌", "乳酸菌", "发酵",
      "营养成分", "膳食纤维", "维生素", "矿物质",
    ],
    guidelines: [
      "普通食品不得宣称治疗、预防疾病功能",
      "不得暗示保健功能（除非有保健食品批文号）",
      "不得使用'纯天然'、'零添加'等无法验证的绝对化表述",
      "涉及营养成分的宣称需有依据，不得夸大",
      "不得使用'治疗'、'疗效'、'药效'等医疗用语",
    ],
  },
  health_food: {
    category: "health_food",
    categoryLabel: "保健食品",
    forbiddenWords: [
      ...ABSOLUTE_WORDS,
      "治疗", "治愈", "疗效", "药效", "医疗作用", "诊断", "处方",
      "根治", "药到病除", "立竿见影",
    ],
    forbiddenPatterns: [
      /治疗\w+/, /治愈\w+/, /疗效/, /药效/, /医疗作用/,
    ],
    cautionPhrases: [
      "调节", "改善", "辅助", "增强免疫力", "缓解疲劳",
    ],
    guidelines: [
      "保健食品仅可宣称注册批准的保健功能，不得扩大范围",
      "必须标注'本品不能代替药物'",
      "不得涉及疾病预防、治疗功能",
      "不得使用医疗用语或易与药品混淆的用语",
    ],
  },
  cosmetic: {
    category: "cosmetic",
    categoryLabel: "化妆品",
    forbiddenWords: [
      ...ABSOLUTE_WORDS,
      "治疗", "治愈", "疗效", "药效", "医疗作用", "诊断", "处方",
      "药妆", "医学护肤", "医学级", "医院同款", "医生推荐",
      "抗炎", "抗菌", "抑菌", "除菌", "杀菌", "消炎",
      "改变基因", "修复DNA", "细胞再生",
    ],
    forbiddenPatterns: [
      /治疗\w+/, /治愈\w+/, /疗效/, /药效/, /医疗作用/,
      /药妆|医学护肤|医学级/,
      /抗炎|抗菌|抑菌|除菌|杀菌|消炎/,
    ],
    cautionPhrases: [
      "保湿", "补水", "滋养", "修护", "舒缓", "紧致",
    ],
    guidelines: [
      "化妆品不得宣称医疗作用",
      "不得使用'药妆'、'医学护肤'等易与药品混淆的用语",
      "不得涉及疾病治疗功能",
      "功效宣称需有充分的科学依据",
    ],
  },
  medical_device: {
    category: "medical_device",
    categoryLabel: "医疗器械",
    forbiddenWords: [
      ...ABSOLUTE_WORDS,
      "根治", "药到病除", "立竿见影", "100%治愈",
    ],
    forbiddenPatterns: [
      /根治/, /100%治愈/, /药到病除/,
    ],
    cautionPhrases: [
      "辅助治疗", "缓解", "改善",
    ],
    guidelines: [
      "必须标注批准文号或备案号",
      "适用范围不得超过注册批准的内容",
      "不得夸大功效或适用范围",
      "必须标注'请仔细阅读产品说明书或在医务人员指导下购买和使用'",
    ],
  },
  pharmacy: {
    category: "pharmacy",
    categoryLabel: "药品",
    forbiddenWords: [
      ...ABSOLUTE_WORDS,
      "根治", "药到病除", "立竿见影", "100%治愈", "无副作用（绝对化）",
    ],
    forbiddenPatterns: [
      /根治/, /100%治愈/, /药到病除/, /无副作用/,
    ],
    cautionPhrases: [
      "适应症", "用法用量", "不良反应", "禁忌",
    ],
    guidelines: [
      "处方药广告只能在专业医学刊物上发布",
      "必须标注'请按药品说明书或在药师指导下购买和使用'",
      "非处方药广告必须标注 OTC 标识",
      "不得含有有效率、治愈率等保证性内容",
    ],
  },
  baby: {
    category: "baby",
    categoryLabel: "母婴/婴幼儿用品",
    forbiddenWords: [
      ...ABSOLUTE_WORDS,
      "益智", "提高智商", "开发大脑", "促进发育（无依据时）",
      "零刺激", "零过敏", "绝对安全",
    ],
    forbiddenPatterns: [
      /提高智商|开发大脑|益智/,
      /零刺激|零过敏|绝对安全/,
    ],
    cautionPhrases: [
      "温和", "亲肤", "无香精", "低敏",
    ],
    guidelines: [
      "婴幼儿食品不得暗示保健或治疗功能",
      "不得使用'益智'、'提高智商'等无依据的功效宣称",
      "不得绝对化安全性表述",
    ],
  },
  textile: {
    category: "textile",
    categoryLabel: "服装/纺织品",
    forbiddenWords: [
      ...ABSOLUTE_WORDS,
      "100%纯棉（非100%时）", "纯羊绒（非100%时）",
      "抗菌（无认证时）", "防螨（无认证时）",
    ],
    forbiddenPatterns: [
      /100%纯棉(?!.*实际含量)/,
      /抗菌|防螨/,
    ],
    cautionPhrases: [
      "透气", "舒适", "亲肤", "柔软",
    ],
    guidelines: [
      "纤维含量标注必须真实准确",
      "功能性宣称（抗菌、防螨等）需有检测报告支撑",
      "不得使用绝对化用语描述材质",
    ],
  },
  digital: {
    category: "digital",
    categoryLabel: "数码/电子",
    forbiddenWords: [
      ...ABSOLUTE_WORDS,
      "国家级", "军工级", "航天级", "实验室级（无依据时）",
    ],
    forbiddenPatterns: [
      /军工级|航天级|实验室级/,
    ],
    cautionPhrases: [
      "高性能", "快充", "长续航", "高清",
    ],
    guidelines: [
      "性能参数需真实可验证",
      "不得使用'军工级'、'航天级'等无依据的等级描述",
      "对比数据需注明来源和测试条件",
    ],
  },
  home: {
    category: "home",
    categoryLabel: "家居/家装",
    forbiddenWords: [
      ...ABSOLUTE_WORDS,
      "零甲醛", "零污染", "绝对环保（无检测报告时）",
    ],
    forbiddenPatterns: [
      /零甲醛|零污染|绝对环保/,
    ],
    cautionPhrases: [
      "环保", "健康", "舒适", "耐用",
    ],
    guidelines: [
      "环保宣称需有检测报告支撑",
      "不得使用'零甲醛'等绝对化环保表述（除非有权威认证）",
      "材质描述需真实准确",
    ],
  },
  general: {
    category: "general",
    categoryLabel: "通用/其他",
    forbiddenWords: ABSOLUTE_WORDS,
    forbiddenPatterns: [
      /最\w+/, /第一\w+/, /顶级\w+/, /最佳\w+/, /唯一\w+/,
    ],
    cautionPhrases: [],
    guidelines: [
      "不得使用国家级、最高级、最佳等绝对化用语",
      "不得虚假宣传或夸大产品功效",
      "涉及专利、荣誉、认证的需有真实依据并标注来源",
      "不得贬低其他生产经营者的商品或服务",
    ],
  },
};

/**
 * 根据类目关键词推断广告法类目
 */
export function detectAdLawCategory(category: string, subcategory: string): AdLawCategory {
  const text = `${category} ${subcategory}`.toLowerCase();

  if (/保健食品|保健品|膳食补充|营养素/.test(text)) return "health_food";
  if (/食品|零食|饮料|茶叶|咖啡|酒水|粮油|生鲜|特产/.test(text)) return "food";
  if (/化妆品|护肤|彩妆|香水|洗护|面膜|精华|口红/.test(text)) return "cosmetic";
  if (/医疗器械|康复|理疗|按摩|血糖仪|血压计/.test(text)) return "medical_device";
  if (/药品|处方药|非处方药|OTC|中药|西药/.test(text)) return "pharmacy";
  if (/母婴|婴儿|宝宝|孕妇|童装|奶粉|辅食|纸尿裤/.test(text)) return "baby";
  if (/服装|纺织|面料|家纺|床上用品|窗帘/.test(text)) return "textile";
  if (/数码|电子|手机|电脑|家电|智能设备|耳机|相机/.test(text)) return "digital";
  if (/家居|家具|家装|建材|灯具|厨具|卫浴/.test(text)) return "home";

  return "general";
}

/**
 * 获取类目的广告法规则
 */
export function getAdLawRule(category: string, subcategory: string): AdLawRule {
  const adLawCategory = detectAdLawCategory(category, subcategory);
  return adLawRules[adLawCategory];
}

/**
 * 生成用于注入 AI prompt 的广告法合规提示文本
 */
export function buildAdLawPromptSection(category: string, subcategory: string): string {
  const rule = getAdLawRule(category, subcategory);

  // 只取最关键的 5 个禁用词，避免 prompt 过长
  const topForbidden = rule.forbiddenWords.slice(0, 5);
  // 只取前 2 条核心指引
  const topGuidelines = rule.guidelines.slice(0, 2);

  return [
    "",
    "## 广告法合规（必须遵守）：",
    `类目：${rule.categoryLabel}`,
    `禁用词：${topForbidden.join("、")}`,
    ...topGuidelines.map((g) => `注意：${g}`),
    "所有文案必须避免绝对化用语和虚假医疗/功效宣称。",
  ].join(" ");
}

/**
 * 快速文本扫描：检测是否包含广告法敏感词
 * 返回发现的违规项列表
 */
export function scanAdLawViolations(text: string, category: string, subcategory: string): Array<{ word: string; type: "forbidden" | "caution"; position: number }> {
  const rule = getAdLawRule(category, subcategory);
  const violations: Array<{ word: string; type: "forbidden" | "caution"; position: number }> = [];

  for (const word of rule.forbiddenWords) {
    let pos = text.indexOf(word);
    while (pos !== -1) {
      violations.push({ word, type: "forbidden", position: pos });
      pos = text.indexOf(word, pos + 1);
    }
  }

  for (const pattern of rule.forbiddenPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match.index !== undefined) {
        violations.push({ word: match[0], type: "forbidden", position: match.index });
      }
    }
  }

  return violations;
}
