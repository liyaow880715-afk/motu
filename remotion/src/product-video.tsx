import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
  Img,
  Sequence,
} from "remotion";
import { IMAGE_DATA_URIS } from "./image-data";

// ============ 配置 ============
const DURATION = 450; // 15秒 @ 30fps

// 阶段时间线（帧）
const PHASES = {
  painPoints: { start: 0, end: 75 },      // 0-2.5s: 痛点冲击
  brandIntro: { start: 75, end: 150 },    // 2.5-5s: 品牌引入
  steps: { start: 150, end: 420 },        // 5-14s: 五步流程（每步54帧）
  outro: { start: 420, end: 450 },        // 14-15s: 结尾
};

const STEPS = [
  {
    icon: "📷",
    color: "#3b82f6",
    title: "上传商品图",
    pain: "手动填信息太烦？",
    solve: "AI 自动识别产品信息",
    imageIndex: 1,
  },
  {
    icon: "🧠",
    color: "#8b5cf6",
    title: "AI 智能分析",
    pain: "卖点写不出来？",
    solve: "自动提炼卖点 + 受众分析",
    imageIndex: 2,
  },
  {
    icon: "📐",
    color: "#10b981",
    title: "模块规划",
    pain: "不知道放什么模块？",
    solve: "10 秒生成完整结构",
    imageIndex: 3,
  },
  {
    icon: "🎨",
    color: "#f59e0b",
    title: "图片生成",
    pain: "没有拍摄预算？",
    solve: "AI 生成场景图、细节图",
    imageIndex: 4,
  },
  {
    icon: "✏️",
    color: "#ef4444",
    title: "在线编辑",
    pain: "改一版要半天？",
    solve: "模块级编辑，1 分钟改完",
    imageIndex: 5,
  },
];

// ============ 主组件 ============
export const ProductVideo: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* 阶段1: 痛点冲击 */}
      <Sequence from={PHASES.painPoints.start} durationInFrames={PHASES.painPoints.end - PHASES.painPoints.start}>
        <PainPointsPhase />
      </Sequence>

      {/* 阶段2: 品牌引入 + 主图 */}
      <Sequence from={PHASES.brandIntro.start} durationInFrames={PHASES.brandIntro.end - PHASES.brandIntro.start}>
        <BrandIntroPhase />
      </Sequence>

      {/* 阶段3: 五步流程 */}
      {STEPS.map((step, index) => {
        const stepStart = PHASES.steps.start + index * 54;
        const stepEnd = stepStart + 54;
        return (
          <Sequence key={step.title} from={stepStart} durationInFrames={54}>
            <StepPhase step={step} index={index} />
          </Sequence>
        );
      })}

      {/* 阶段4: 结尾 */}
      <Sequence from={PHASES.outro.start} durationInFrames={PHASES.outro.end - PHASES.outro.start}>
        <OutroPhase />
      </Sequence>

      {/* 全局进度条 */}
      <ProgressBar />
    </AbsoluteFill>
  );
};

// ============ 阶段1: 痛点冲击 ============
const PainPointsPhase: React.FC = () => {
  const frame = useCurrentFrame();

  const painPoints = [
    { text: "做详情页要 3~7 天？", sub: "拍摄 → 设计 → 排版，流程太长" },
    { text: "设计师 500~2000 元/页？", sub: "中小商家负担不起" },
    { text: "卖点文案写不出来？", sub: "知道产品好，写不出打动买家的话" },
  ];

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
      }}
    >
      {/* 顶部标题 */}
      <PainTitle frame={frame} />

      {/* 三个痛点卡片 */}
      {painPoints.map((pp, i) => (
        <PainCard key={i} text={pp.text} sub={pp.sub} index={i} frame={frame} />
      ))}

      {/* 底部解决方案出现 */}
      <SolutionReveal frame={frame} />
    </AbsoluteFill>
  );
};

const PainTitle: React.FC<{ frame: number }> = ({ frame }) => {
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [0, 12], [-20, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        marginBottom: 20,
      }}
    >
      <p style={{ fontSize: 28, color: "#666", fontWeight: 500, letterSpacing: 2 }}>
        电商卖家是否正在经历这些困扰？
      </p>
    </div>
  );
};

const PainCard: React.FC<{ text: string; sub: string; index: number; frame: number }> = ({
  text,
  sub,
  index,
  frame,
}) => {
  const delay = 8 + index * 18;
  const opacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateRight: "clamp" });
  const x = interpolate(frame, [delay, delay + 10], [-40, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  // 划掉效果：在显示约10帧后开始划线
  const strikeProgress = interpolate(frame, [delay + 14, delay + 22], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${x}px)`,
        width: "85%",
        maxWidth: 920,
        backgroundColor: "#1a1a1a",
        borderRadius: 16,
        padding: "20px 28px",
        border: "1px solid #333",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "relative", display: "inline-block" }}>
        <span style={{ fontSize: 32, fontWeight: 700, color: "#ff6b6b" }}>{text}</span>
        {/* 删除线 */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            height: 3,
            backgroundColor: "#ff6b6b",
            width: `${strikeProgress * 100}%`,
            borderRadius: 2,
          }}
        />
      </div>
      <p style={{ fontSize: 22, color: "#888", marginTop: 8, marginBottom: 0 }}>{sub}</p>
    </div>
  );
};

const SolutionReveal: React.FC<{ frame: number }> = ({ frame }) => {
  const opacity = interpolate(frame, [55, 65], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [55, 65], [0.9, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.5)) });

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        marginTop: 16,
        backgroundColor: "#22c55e",
        padding: "14px 36px",
        borderRadius: 40,
      }}
    >
      <span style={{ fontSize: 30, fontWeight: 800, color: "#fff" }}>✓ AI 一键全解决</span>
    </div>
  );
};

// ============ 阶段2: 品牌引入 ============
const BrandIntroPhase: React.FC = () => {
  const frame = useCurrentFrame();

  const bgOpacity = interpolate(frame, [0, 15], [0, 0.25], { extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [5, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [5, 20], [40, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const subtitleOpacity = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: "clamp" });
  const taglineOpacity = interpolate(frame, [25, 40], [0, 1], { extrapolateRight: "clamp" });
  const imageScale = interpolate(frame, [0, 75], [1, 1.1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      {/* 背景图 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: bgOpacity,
        }}
      >
        <Img
          src={IMAGE_DATA_URIS[0]}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${imageScale})`,
            filter: "blur(2px)",
          }}
        />
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.7)" }} />
      </div>

      {/* 文字内容 */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, textAlign: "center" }}>
          <h1
            style={{
              fontSize: 120,
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
          <p style={{ fontSize: 40, color: "#a0a0a0", margin: 0, fontWeight: 400 }}>
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
          <p style={{ fontSize: 28, color: "#60a5fa", margin: 0, fontWeight: 600 }}>
            让详情页制作，从 3 天 → 3 分钟
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ============ 阶段3: 五步流程 ============
const StepPhase: React.FC<{ step: typeof STEPS[0]; index: number }> = ({ step, index }) => {
  const frame = useCurrentFrame();

  const cardOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const cardY = interpolate(frame, [0, 10], [30, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const imageOpacity = interpolate(frame, [5, 15], [0, 1], { extrapolateRight: "clamp" });
  const imageScale = interpolate(frame, [5, 54], [1, 1.05], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      {/* 上半部分：效果图 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "55%",
          opacity: imageOpacity,
          overflow: "hidden",
        }}
      >
        <Img
          src={IMAGE_DATA_URIS[step.imageIndex]}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${imageScale})`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 120,
            background: "linear-gradient(to top, #0a0a0a, transparent)",
          }}
        />
      </div>

      {/* 下半部分：步骤卡片 */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 40px",
          opacity: cardOpacity,
          transform: `translateY(${cardY}px)`,
        }}
      >
        {/* 步骤序号 */}
        <div
          style={{
            fontSize: 18,
            color: "#64748b",
            fontWeight: 600,
            letterSpacing: 2,
            marginBottom: 12,
          }}
        >
          STEP {index + 1} / {STEPS.length}
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
            marginBottom: 20,
            boxShadow: `0 0 60px ${step.color}44`,
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
          }}
        >
          {step.title}
        </h2>

        {/* 痛点 → 解决 */}
        <div
          style={{
            marginTop: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 24, color: "#ff6b6b", textDecoration: "line-through", fontWeight: 500 }}>
            {step.pain}
          </span>
          <span style={{ fontSize: 20, color: "#666" }}>↓</span>
          <span style={{ fontSize: 26, color: "#22c55e", fontWeight: 700 }}>
            {step.solve}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============ 阶段4: 结尾 ============
const OutroPhase: React.FC = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, 15], [0.9, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

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
          fontSize: 72,
          fontWeight: 800,
          color: "#fff",
          margin: 0,
          letterSpacing: -1,
          lineHeight: 1.1,
        }}
      >
        AI 智能生成
      </h1>
      <p
        style={{
          fontSize: 36,
          marginTop: 16,
          color: "#a0a0a0",
          fontWeight: 400,
        }}
      >
        电商详情页 · 一键出品
      </p>
      <div
        style={{
          marginTop: 40,
          fontSize: 96,
          fontWeight: 900,
          color: "#fff",
          letterSpacing: 8,
        }}
      >
        摹图
      </div>
    </AbsoluteFill>
  );
};

// ============ 全局进度条 ============
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
