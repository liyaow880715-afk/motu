import { Composition } from "remotion";
import { ProductVideo } from "./product-video";
import { TutorialVideo } from "./tutorial-video";
import { PromoVideo } from "./promo-video";

export const RemotionRoot = () => (
  <>
    <Composition
      id="ProductVideo"
      component={ProductVideo}
      durationInFrames={450}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="TutorialVideo"
      component={TutorialVideo}
      durationInFrames={600}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="PromoVideo"
      component={PromoVideo}
      durationInFrames={690}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
