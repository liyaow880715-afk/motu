import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
  Sequence,
} from "remotion";

const DURATION = 600; // 20秒 @ 30fps
const FPS = 30;

const PHASES = {
  intro: { start: 0, end: 90 },           // 0-3s: 品牌开场
  step1: { start: 90, end: 180 },         // 3-6s: 配置 AI Provider
  step2: { start: 180, end: 270 },        // 6-9s: 创建项目
  step3: { start: 270, end: 360 },        // 9-12s: AI 分析
  step4: { start: 360, end: 450 },        // 12-15s: 页面规划
  step5: { start: 450, end: 540 },        // 15-18s: 编辑与生成
  outro: { start: 540, end: 600 },        // 18-20s: 结尾
};

const STEPS = [
  {
    icon: "🔌",
    color: "#3b82f6",
    title: "配置 AI Provider",
    desc: "填写 Base URL 和 API Key，发现模型并分配默认模型",
    detail: "支持 Gemini / OpenAI / 任意兼容代理",
  },
  {
    icon: "📝",
    color: "#8b5cf6",
    title: "创建项目",
    desc: "填写商品信息，上传 3-5 张商品图片",
    detail: "产品信息 + 分类 + 卖点 + 目标人群",
  },
  {
    icon: "🧠",
    color: "#10b981",
    title: "AI 商品分析",
    desc: "AI 自动提取结构化商品信息、卖点、风格标签",
    detail: "支持服装类自动检测，强制 3:4 比例 + 11 固定模块",
  },
  {
    icon: "📐",
    color: "#f59e0b",
    title: "页面规划",
    desc: "AI 生成头图 + 详情模块结构，每个模块含文案和提示词",
    detail: "服装类自动使用 11 模块固定模板",
  },
  {
    icon: "🎨",
    color: "#ef4444",
    title: "编辑与生成图片",
    desc: "编辑文案/Prompt，一键生成各模块图片",
    detail: "支持参考图上传、版本管理、批量生成",
  },
];

export const TutorialVideo: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        fontFamily: '"Microsoft YaHei", "PingFang SC", system-ui, sans-serif',
      }}
    >
      {/* 开场 */}
      <Sequence
        from={PHASES.intro.start}
        durationInFrames={PHASES.intro.end - PHASES.intro.start}
      >
        <IntroPhase />
      </Sequence>

      {/* 步骤 */}
      {STEPS.map((step, index) => {
        const stepStart = PHASES.step1.start + index * 90;
        const stepEnd = stepStart + 90;
        return (
          <Sequence
            key={step.title}
            from={stepStart}
            durationInFrames={90}
          >
            <StepPhase step={step} index={index} total={STEPS.length} />
          </Sequence>
        );
      })}

      {/* 结尾 */}
      <Sequence
        from={PHASES.outro.start}
        durationInFrames={PHASES.outro.end - PHASES.outro.start}
      >
        <OutroPhase />
      </Sequence>

      {/* 全局进度条 */}
      <ProgressBar />
    </AbsoluteFill>
  );
};

// ============ 开场 ============
const IntroPhase: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [0, 20], [40, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const subtitleOpacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateRight: "clamp",
  });
  const taglineOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: "#fff",
            margin: 0,
            letterSpacing: 8,
            lineHeight: 1.1,
          }}
        >
          摹图
        </h1>
      </div>

      <div style={{ opacity: subtitleOpacity, marginTop: 20, textAlign: "center" }}>
        <p style={{ fontSize: 36, color: "#a0a0a0", margin: 0 }}>
          AI 电商详情页生成器
        </p>
      </div>

      <div
        style={{
          opacity: taglineOpacity,
          marginTop: 40,
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          border: "1px solid rgba(59, 130, 246, 0.4)",
          padding: "16px 40px",
          borderRadius: 12,
        }}
      >
        <p style={{ fontSize: 24, color: "#60a5fa", margin: 0, fontWeight: 600 }}>
          使用教程 · 5 步生成详情页
        </p>
      </div>
    </AbsoluteFill>
  );
};

// ============ 步骤 ============
const StepPhase: React.FC<{
  step: (typeof STEPS)[0];
  index: number;
  total: number;
}> = ({ step, index, total }) => {
  const frame = useCurrentFrame();

  const cardOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });
  const cardY = interpolate(frame, [0, 12], [30, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const detailOpacity = interpolate(frame, [8, 18], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 60px",
      }}
    >
      {/* 步骤序号 */}
      <div
        style={{
          fontSize: 16,
          color: "#64748b",
          fontWeight: 600,
          letterSpacing: 2,
          marginBottom: 20,
          opacity: cardOpacity,
        }}
      >
        STEP {index + 1} / {total}
      </div>

      {/* 图标 */}
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: 28,
          backgroundColor: step.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 48,
          marginBottom: 24,
          boxShadow: `0 0 60px ${step.color}44`,
          opacity: cardOpacity,
          transform: `translateY(${cardY}px)`,
        }}
      >
        {step.icon}
      </div>

      {/* 标题 */}
      <h2
        style={{
          fontSize: 52,
          fontWeight: 800,
          color: "#fff",
          margin: 0,
          textAlign: "center",
          lineHeight: 1.2,
          opacity: cardOpacity,
          transform: `translateY(${cardY}px)`,
        }}
      >
        {step.title}
      </h2>

      {/* 描述 */}
      <p
        style={{
          fontSize: 28,
          color: "#a0a0a0",
          marginTop: 16,
          textAlign: "center",
          maxWidth: 800,
          opacity: detailOpacity,
        }}
      >
        {step.desc}
      </p>

      {/* 补充说明 */}
      <div
        style={{
          marginTop: 24,
          backgroundColor: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "12px 28px",
          borderRadius: 10,
          opacity: detailOpacity,
        }}
      >
        <p style={{ fontSize: 20, color: "#888", margin: 0 }}>{step.detail}</p>
      </div>
    </AbsoluteFill>
  );
};

// ============ 结尾 ============
const OutroPhase: React.FC = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [0, 15], [0.9, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <h1
        style={{
          fontSize: 64,
          fontWeight: 800,
          color: "#fff",
          margin: 0,
          letterSpacing: -1,
          lineHeight: 1.1,
        }}
      >
        3 天 → 3 分钟
      </h1>
      <p
        style={{
          fontSize: 32,
          marginTop: 16,
          color: "#a0a0a0",
          fontWeight: 400,
        }}
      >
        AI 让详情页制作快 1000 倍
      </p>
      <div
        style={{
          marginTop: 40,
          fontSize: 80,
          fontWeight: 900,
          color: "#fff",
          letterSpacing: 8,
        }}
      >
        摹图
      </div>
      <p style={{ fontSize: 20, color: "#666", marginTop: 16 }}>
        访问 /guide 查看完整图文教程
      </p>
    </AbsoluteFill>
  );
};

// ============ 进度条 ============
const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [0, DURATION], [0, 100], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 40,
        left: 60,
        right: 60,
        height: 4,
        backgroundColor: "#1e293b",
        borderRadius: 2,
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: "100%",
          backgroundColor: "#3b82f6",
          borderRadius: 2,
        }}
      />
    </div>
  );
};
