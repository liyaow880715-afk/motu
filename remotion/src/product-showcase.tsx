import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
  Img,
  Sequence,
} from "remotion";
import { IMAGE_DATA_URIS } from "./image-data";

export const ProductShowcase: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const titleY = interpolate(frame, [0, 20], [40, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const outroOpacity = interpolate(frame, [420, 450], [1, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <Sequence from={30} durationInFrames={90}>
        <MainImage src={IMAGE_DATA_URIS[0]} />
      </Sequence>

      <Sequence from={120} durationInFrames={300}>
        <ImageCarousel images={IMAGE_DATA_URIS.slice(1)} />
      </Sequence>

      {frame < 30 && (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          <div style={{ textAlign: "center", color: "#fff" }}>
            <h1
              style={{
                fontSize: 72,
                fontWeight: 800,
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
          </div>
        </AbsoluteFill>
      )}

      {frame >= 420 && (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: outroOpacity,
          }}
        >
          <div style={{ textAlign: "center", color: "#fff" }}>
            <h1
              style={{
                fontSize: 96,
                fontWeight: 900,
                margin: 0,
                letterSpacing: 4,
              }}
            >
              摹图
            </h1>
            <p
              style={{
                fontSize: 32,
                marginTop: 20,
                color: "#888",
              }}
            >
              AI 电商详情页生成器
            </p>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

const MainImage: React.FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [0, 90], [1, 1.08], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
};

const ImageCarousel: React.FC<{ images: string[] }> = ({ images }) => {
  const frame = useCurrentFrame();
  const perSlide = 21;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {images.map((src, index) => {
        const slideStart = index * perSlide;
        const slideEnd = slideStart + perSlide;

        if (frame < slideStart - 10 || frame > slideEnd + 10) {
          return null;
        }

        const localFrame = frame - slideStart;

        const opacity = interpolate(
          localFrame,
          [0, 6, perSlide - 6, perSlide],
          [0, 1, 1, 0],
          { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
        );

        const translateX = interpolate(
          localFrame,
          [0, 6, perSlide - 6, perSlide],
          [60, 0, 0, -60],
          { extrapolateRight: "clamp", extrapolateLeft: "clamp", easing: Easing.out(Easing.cubic) }
        );

        const scale = interpolate(
          localFrame,
          [0, 6, perSlide - 6, perSlide],
          [0.95, 1, 1, 0.95],
          { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
        );

        return (
          <AbsoluteFill
            key={index}
            style={{
              opacity,
              transform: `translateX(${translateX}px) scale(${scale})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
