import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
  Sequence,
} from "remotion";

const STEPS = [
  {
    title: "上传商品图",
    subtitle: "一键上传主图，AI 自动识别",
    color: "#3b82f6",
    icon: "📷",
  },
  {
    title: "AI 智能分析",
    subtitle: "提取卖点、定位受众、分析竞品",
    color: "#8b5cf6",
    icon: "🧠",
  },
  {
    title: "模块规划",
    subtitle: "自动规划详情页模块结构与文案",
    color: "#10b981",
    icon: "📐",
  },
  {
    title: "图片生成",
    subtitle: "AI 生成场景图、卖点图、细节图",
    color: "#f59e0b",
    icon: "🎨",
  },
  {
    title: "在线编辑",
    subtitle: "可视化编辑文案、替换图片、调整排版",
    color: "#ef4444",
    icon: "✏️",
  },
];

export const FrameworkDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      {STEPS.map((step, index) => {
        const start = index * 90;
        const duration = 90;
        return (
          <Sequence key={step.title} from={start} durationInFrames={duration}>
            <StepCard step={step} index={index} />
          </Sequence>
        );
      })}

      {/* 进度条 */}
      <Sequence from={0} durationInFrames={450}>
        <ProgressBar />
      </Sequence>
    </AbsoluteFill>
  );
};

const StepCard: React.FC<{ step: typeof STEPS[0]; index: number }> = ({
  step,
  index,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 15, 75, 90], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const translateY = interpolate(frame, [0, 15, 75, 90], [60, 0, 0, -60], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const scale = interpolate(frame, [0, 15, 75, 90], [0.9, 1, 1, 0.9], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
      }}
    >
      {/* 图标 */}
      <div
        style={{
          width: 160,
          height: 160,
          borderRadius: 40,
          backgroundColor: step.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 72,
          marginBottom: 48,
          boxShadow: `0 0 80px ${step.color}44`,
        }}
      >
        {step.icon}
      </div>

      {/* 序号 */}
      <div
        style={{
          fontSize: 20,
          color: "#64748b",
          fontWeight: 600,
          letterSpacing: 2,
          marginBottom: 16,
        }}
      >
        STEP {index + 1} / {STEPS.length}
      </div>

      {/* 标题 */}
      <h1
        style={{
          fontSize: 64,
          fontWeight: 800,
          color: "#fff",
          margin: 0,
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {step.title}
      </h1>

      {/* 副标题 */}
      <p
        style={{
          fontSize: 32,
          color: "#94a3b8",
          marginTop: 20,
          textAlign: "center",
          maxWidth: 800,
          lineHeight: 1.5,
        }}
      >
        {step.subtitle}
      </p>
    </AbsoluteFill>
  );
};

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [0, 450], [0, 100], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: 80,
        right: 80,
        height: 6,
        backgroundColor: "#1e293b",
        borderRadius: 3,
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: "100%",
          backgroundColor: "#3b82f6",
          borderRadius: 3,
        }}
      />
    </div>
  );
};
