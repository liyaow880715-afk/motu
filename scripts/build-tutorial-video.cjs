const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const FRAMES_DIR = './storage/tutorial-frames';
const OUTPUT_DIR = './storage/tutorial-output';
const TEMP_DIR = './storage/tutorial-temp';

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const FONT = 'storage/tutorial-frames/font.ttc';

const scenes = [
  { type: 'title', text: '摹图', sub: 'AI 电商详情页生成工作台', duration: 5 },
  { type: 'image', text: '输入激活码，快速登录工作台', duration: 6, file: '01-login.png' },
  { type: 'image', text: '填写产品信息，AI 自动生成详情页方案', duration: 6, file: '02-dashboard.png' },
  { type: 'image', text: 'AI 深度分析商品卖点与目标人群', duration: 6, file: '03-analysis.png' },
  { type: 'image', text: '智能规划详情页结构与模块', duration: 6, file: '04-planner.png' },
  { type: 'image', text: '可视化编辑文案与视觉 Prompt，实时预览手机端效果', duration: 8, file: '05-editor.png' },
  { type: 'image', text: '一键导出全部图片与项目数据', duration: 5, file: '06-export.png' },
  { type: 'image', text: '历史项目随时查看、编辑与回溯', duration: 5, file: '07-history.png' },
  { type: 'image', text: '批量生成电商主图，支持多种风格与尺寸', duration: 5, file: '08-hero-batch.png' },
  { type: 'image', text: '套版中心：保存并复用详情页模板', duration: 5, file: '09-templates.png' },
  { type: 'image', text: '激活码管理：灵活分配使用权限', duration: 5, file: '10-settings-keys.png' },
  { type: 'image', text: '自由配置 AI 提供商与模型参数', duration: 4, file: '11-settings-providers.png' },
  { type: 'title', text: '摹图', sub: '让 AI 为你的电商详情页赋能', duration: 5 },
];

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-y', ...args], { stdio: 'inherit' });
    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

async function buildClip(index, scene) {
  const outFile = path.join(TEMP_DIR, `clip-${String(index).padStart(2, '0')}.mp4`);
  const fadeIn = 0.5;
  const fadeOut = 0.5;
  const totalDur = scene.duration;
  const fadeOutStart = totalDur - fadeOut;

  if (scene.type === 'title') {
    const vf = [
      `fade=t=in:st=0:d=${fadeIn}`,
      `fade=t=out:st=${fadeOutStart}:d=${fadeOut}`,
      `drawtext=fontfile=${FONT}:text=${scene.text}:fontsize=72:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-40:alpha='if(lt(t,0.3),t/0.3,1)'`,
      `drawtext=fontfile=${FONT}:text=${scene.sub}:fontsize=28:fontcolor=#a0a0a0:x=(w-text_w)/2:y=(h-text_h)/2+50:alpha='if(lt(t,0.3),t/0.3,1)'`,
    ].join(',');

    await runFfmpeg([
      '-f', 'lavfi',
      '-i', `color=c=#0a0a0b:s=1920x1080:d=${totalDur}`,
      '-vf', vf,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-an',
      '-t', String(totalDur),
      outFile,
    ]);
  } else {
    const imgPath = path.join(FRAMES_DIR, scene.file);
    const vf = [
      `fade=t=in:st=0:d=${fadeIn}`,
      `fade=t=out:st=${fadeOutStart}:d=${fadeOut}`,
      'scale=1920:1080:force_original_aspect_ratio=decrease',
      'pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
      `drawtext=fontfile=${FONT}:text=${scene.text}:fontsize=32:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=16:x=(w-text_w)/2:y=h-text_h-60`,
    ].join(',');

    await runFfmpeg([
      '-loop', '1',
      '-i', imgPath,
      '-vf', vf,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-an',
      '-t', String(totalDur),
      outFile,
    ]);
  }
  return outFile;
}

async function concatClips(clips) {
  const listFile = path.join(TEMP_DIR, 'list.txt');
  fs.writeFileSync(listFile, clips.map(c => `file '${c.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'));

  const outFile = path.join(OUTPUT_DIR, 'tutorial.mp4');
  await runFfmpeg([
    '-f', 'concat',
    '-safe', '0',
    '-i', listFile,
    '-c', 'copy',
    outFile,
  ]);
  return outFile;
}

async function main() {
  const clips = [];
  for (let i = 0; i < scenes.length; i++) {
    console.log(`Building clip ${i + 1}/${scenes.length}: ${scenes[i].text}`);
    try {
      const clip = await buildClip(i, scenes[i]);
      clips.push(clip);
    } catch (e) {
      console.error(`Failed to build clip ${i}:`, e.message);
    }
  }

  console.log('Concatenating clips...');
  const finalVideo = await concatClips(clips);
  console.log('Video created:', finalVideo);

  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  console.log('Done!');
}

main().catch(console.error);
