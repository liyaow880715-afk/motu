import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
  Img,
  Sequence,
} from "remotion";
import { IMAGES } from "./image-assets";

const DURATION = 690; // 23s @ 30fps

const PHASES = {
  pain: { start: 0, end: 90 },
  hook: { start: 90, end: 210 },
  features: { start: 210, end: 570 },
  outro: { start: 570, end: DURATION },
};

const FEATURES = [
  { title: "上传商品图", desc: "AI 自动识别产品信息", img: IMAGES.editor, color: "#3b82f6" },
  { title: "AI 智能分析", desc: "自动提炼卖点 + 受众分析", img: IMAGES.analysis, color: "#8b5cf6" },
  { title: "模块规划", desc: "10 秒生成完整页面结构", img: IMAGES.overview, color: "#10b981" },
  { title: "一键生成", desc: "详情页图片 + 文案全搞定", img: IMAGES.result, color: "#f59e0b" },
];

export const PromoVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* 阶段1: 痛点 */}
      <Sequence from={PHASES.pain.start} durationInFrames={PHASES.pain.end - PHASES.pain.start}>
        <PainPhase />
      </Sequence>

      {/* 阶段2: 反问钩子 */}
      <Sequence from={PHASES.hook.start} durationInFrames={PHASES.hook.end - PHASES.hook.start}>
        <HookPhase />
      </Sequence>

      {/* 阶段3: 功能展示 */}
      {FEATURES.map((f, i) => {
        const start = PHASES.features.start + i * 90;
        return (
          <Sequence key={f.title} from={start} durationInFrames={90}>
            <FeaturePhase feature={f} index={i} />
          </Sequence>
        );
      })}

      {/* 阶段4: 结尾 */}
      <Sequence from={PHASES.outro.start} durationInFrames={PHASES.outro.end - PHASES.outro.start}>
        <OutroPhase />
      </Sequence>

      {/* 全局品牌栏 - 全程置顶 */}
      <BrandBar />

      {/* 全局进度条 */}
      <ProgressBar />
    </AbsoluteFill>
  );
};

// ========== 全局品牌栏 ==========
const BrandBar: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        zIndex: 200,
        background: "linear-gradient(to top, rgba(10,10,10,0.9), rgba(10,10,10,0))",
        paddingBottom: 16,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 30px rgba(59,130,246,0.3)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 36, fontWeight: 800, color: "#fff" }}>M</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 36, fontWeight: 800, color: "#fff", letterSpacing: 4, lineHeight: 1.1 }}>摹图</span>
        <span style={{ fontSize: 20, color: "#888", fontWeight: 500, marginTop: 2 }}>AI 电商详情页生成器</span>
      </div>
    </div>
  );
};

// ========== 阶段1: 痛点冲击 ==========
const PainPhase: React.FC = () => {
  const frame = useCurrentFrame();

  const pains = [
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
        gap: 24,
        paddingTop: 80,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 52, color: "#aaa", fontWeight: 700, letterSpacing: 2 }}>
          电商卖家是否正在经历这些困扰？
        </p>
      </div>
      {pains.map((p, i) => {
        const delay = 6 + i * 18;
        const opacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateRight: "clamp" });
        const x = interpolate(frame, [delay, delay + 10], [-40, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
        const strike = interpolate(frame, [delay + 14, delay + 24], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
        return (
          <div
            key={i}
            style={{
              opacity,
              transform: `translateX(${x}px)`,
              width: "90%",
              maxWidth: 980,
              backgroundColor: "#1a1a1a",
              borderRadius: 20,
              padding: "28px 36px",
              border: "1px solid #333",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "relative", display: "inline-block" }}>
              <span style={{ fontSize: 56, fontWeight: 800, color: "#ff6b6b" }}>{p.text}</span>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: "55%",
                  height: 4,
                  backgroundColor: "#ff6b6b",
                  width: `${strike * 100}%`,
                  borderRadius: 2,
                }}
              />
            </div>
            <p style={{ fontSize: 36, color: "#aaa", marginTop: 14, marginBottom: 0 }}>{p.sub}</p>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ========== 阶段2: 反问钩子 ==========
const HookPhase: React.FC = () => {
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
        paddingTop: 80,
      }}
    >
      <div
        style={{
          width: "85%",
          maxWidth: 960,
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 52, fontWeight: 800, color: "#fff", lineHeight: 1.4, margin: 0 }}>
          如果有个工具
        </p>
        <p style={{ fontSize: 52, fontWeight: 800, color: "#fff", lineHeight: 1.4, margin: "12px 0 0" }}>
          让你{" "}
          <span style={{ color: "#ff6b6b", textDecoration: "line-through" }}>三天</span>
          {" → "}
          <span style={{ color: "#22c55e" }}>三分钟</span>
          {" "}完成
        </p>
        <div
          style={{
            marginTop: 40,
            display: "inline-block",
            backgroundColor: "rgba(59, 130, 246, 0.15)",
            border: "2px solid rgba(59, 130, 246, 0.5)",
            padding: "24px 56px",
            borderRadius: 20,
          }}
        >
          <p style={{ fontSize: 72, fontWeight: 900, color: "#60a5fa", margin: 0 }}>你用不用？</p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ========== 阶段3: 功能截图 ==========
const FeaturePhase: React.FC<{ feature: typeof FEATURES[0]; index: number }> = ({ feature, index }) => {
  const frame = useCurrentFrame();

  const cardOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const cardY = interpolate(frame, [0, 10], [30, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const imgOpacity = interpolate(frame, [5, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      {/* 截图 */}
      <div
        style={{
          position: "absolute",
          top: 100,
          left: 0,
          right: 0,
          height: "58%",
          opacity: imgOpacity,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#111",
        }}
      >
        <Img
          src={feature.img}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 160,
            background: "linear-gradient(to top, #0a0a0a, transparent)",
          }}
        />
      </div>

      {/* 信息卡片 */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
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
        <div
          style={{
            fontSize: 18,
            color: "#64748b",
            fontWeight: 600,
            letterSpacing: 2,
            marginBottom: 12,
          }}
        >
          STEP {index + 1} / {FEATURES.length}
        </div>

        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            backgroundColor: feature.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
            boxShadow: `0 0 50px ${feature.color}44`,
          }}
        >
          <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "#fff" }} />
        </div>

        <h2
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "#fff",
            margin: 0,
            textAlign: "center",
          }}
        >
          {feature.title}
        </h2>
        <p style={{ fontSize: 32, color: "#22c55e", fontWeight: 700, marginTop: 12 }}>{feature.desc}</p>
      </div>
    </AbsoluteFill>
  );
};

// ========== 阶段4: 结尾 ==========
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
      <h1 style={{ fontSize: 72, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: -1 }}>
        让详情页制作
      </h1>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16 }}>
        <span style={{ fontSize: 56, color: "#ff6b6b", fontWeight: 700, textDecoration: "line-through" }}>3 天</span>
        <span style={{ fontSize: 44, color: "#666" }}>→</span>
        <span style={{ fontSize: 56, color: "#22c55e", fontWeight: 800 }}>3 分钟</span>
      </div>
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
      <p style={{ fontSize: 32, color: "#888", marginTop: 12 }}>AI 电商详情页生成器</p>
    </AbsoluteFill>
  );
};

// ========== 全局进度条 ==========
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
        bottom: 110,
        left: 50,
        right: 50,
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
