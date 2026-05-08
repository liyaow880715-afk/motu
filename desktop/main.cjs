const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const http = require("http");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const log = require("electron-log");

log.transports.file.level = "info";
log.transports.console.level = "debug";
log.info("Main process started");

const { toSqliteFileUrl } = require("../scripts/runtime-paths.cjs");

// ============================================================================
// Anti-tampering: Hardware Fingerprint
// ============================================================================

const FIXED_SALT = "motu-auth-v1-salt";

function getSystemUuid() {
  const { execSync } = require("child_process");
  try {
    if (process.platform === "win32") {
      const out = execSync("wmic csproduct get UUID", { encoding: "utf8", timeout: 5000 });
      const m = out.match(/([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})/);
      return m ? m[1] : "";
    } else if (process.platform === "darwin") {
      const out = execSync("system_profiler SPHardwareDataType | grep 'Hardware UUID'", { encoding: "utf8", timeout: 5000 });
      const m = out.match(/([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})/);
      return m ? m[1] : "";
    } else {
      try { return execSync("cat /etc/machine-id", { encoding: "utf8", timeout: 5000 }).trim(); } catch {}
      try { return execSync("cat /sys/class/dmi/id/product_uuid", { encoding: "utf8", timeout: 5000 }).trim(); } catch {}
      return "";
    }
  } catch {
    return "";
  }
}

function getMachineFingerprint() {
  const os = require("os");
  const nics = os.networkInterfaces();
  let mac = "";
  for (const name of Object.keys(nics)) {
    for (const nic of nics[name]) {
      if (!nic.internal && nic.mac && nic.mac !== "00:00:00:00:00:00") {
        mac = nic.mac;
        break;
      }
    }
    if (mac) break;
  }
  const raw = `${getSystemUuid()}:${mac}:${os.hostname()}:${os.cpus()[0]?.model || ""}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// ============================================================================
// Anti-tampering: Encrypted Activation Config
// ============================================================================

const CONFIG_FILE = "activation.dat";

function getConfigPath() {
  return path.join(app.getPath("userData"), CONFIG_FILE);
}

function deriveKey(fingerprint) {
  return crypto.pbkdf2Sync(fingerprint + FIXED_SALT, FIXED_SALT, 100000, 32, "sha256");
}

function encryptConfig(config, fingerprint) {
  const key = deriveKey(fingerprint);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(JSON.stringify(config), "utf8", "base64");
  encrypted += cipher.final("base64");
  const tag = cipher.getAuthTag();
  return { v: 1, iv: iv.toString("base64"), tag: tag.toString("base64"), data: encrypted };
}

function decryptConfig(encryptedData, fingerprint) {
  const key = deriveKey(fingerprint);
  const iv = Buffer.from(encryptedData.iv, "base64");
  const tag = Buffer.from(encryptedData.tag, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encryptedData.data, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
}

function readActivationConfig() {
  try {
    const fingerprint = getMachineFingerprint();
    const payload = JSON.parse(fs.readFileSync(getConfigPath(), "utf8"));
    const config = decryptConfig(payload, fingerprint);
    if (config && !config.machineId) {
      config.machineId = crypto.randomUUID();
      writeActivationConfig(config);
    }
    return config;
  } catch {
    return null;
  }
}

function writeActivationConfig(config) {
  const fingerprint = getMachineFingerprint();
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify(encryptConfig(config, fingerprint), null, 2));
}

function clearActivationConfig() {
  try {
    fs.unlinkSync(getConfigPath());
  } catch {}
}

// ============================================================================
// Server Communication
// ============================================================================

async function getPublicKey(serverUrl) {
  try {
    const url = new URL("/api/auth/public-key", serverUrl.endsWith("/") ? serverUrl.slice(0, -1) : serverUrl);
    const response = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    const result = await response.json();
    return result.success ? result.data.key : null;
  } catch {
    return null;
  }
}

async function verifyActivationOnServer(serverUrl, key, machineId) {
  const url = new URL("/api/auth/verify", serverUrl.endsWith("/") ? serverUrl.slice(0, -1) : serverUrl);
  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, machineId }),
  });
  return response.json();
}

async function heartbeatActivation(serverUrl, key, machineId) {
  try {
    const url = new URL("/api/auth/heartbeat", serverUrl.endsWith("/") ? serverUrl.slice(0, -1) : serverUrl);
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, machineId }),
      signal: AbortSignal.timeout(10000),
    });
    return response.json();
  } catch {
    return { success: false, offline: true };
  }
}

function verifyServerSignature(data, signature, publicKey) {
  try {
    const verify = crypto.createVerify("SHA256");
    verify.update(JSON.stringify(data));
    verify.end();
    return verify.verify(publicKey, signature, "base64");
  } catch {
    return false;
  }
}

// ============================================================================
// Electron Exec Path Fallback (Windows shortcut / install path mismatch)
// ============================================================================

function getElectronExecPath() {
  const candidates = [
    { name: "process.execPath", path: process.execPath },
    { name: "process.argv[0]", path: process.argv[0] },
    { name: "app.getPath('exe')", path: app.getPath("exe") },
  ];
  for (const c of candidates) {
    const exists = fs.existsSync(c.path);
    log.info(`[getElectronExecPath] ${c.name} = ${c.path}, exists = ${exists}`);
    if (exists) return c.path;
  }
  throw new Error(
    `找不到 Electron 可执行文件，请尝试完全卸载旧版本后重新安装。\n` +
    `已尝试: ${candidates.map(c => c.name + '=' + c.path).join(', ')}`
  );
}

// ============================================================================
// Window Management
// ============================================================================

let mainWindow = null;
let activateWindow = null;
let splashWindow = null;
let serverProcess = null;
let serverUrl = null;
let isQuitting = false;

function getWindowIcon() {
  if (process.platform === "darwin") return undefined;
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "icon.ico")
    : path.join(__dirname, "..", "build", "icon.ico");
  if (fs.existsSync(iconPath)) return iconPath;
  return undefined;
}

function buildActivateHtml() {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data:; connect-src *;" />
<title>摹图 - 激活</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 100%; height: 100%; overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  background: linear-gradient(135deg, #0a0a0b 0%, #141416 100%);
  color: #ffffff;
  display: flex; align-items: center; justify-content: center;
}
.card {
  width: 420px; max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px);
  padding: 32px 28px;
  border-radius: 20px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 24px 80px rgba(0,0,0,0.4);
  overflow-y: auto;
}
.brand {
  text-align: center; margin-bottom: 28px;
}
.brand-icon {
  width: 48px; height: 48px; margin: 0 auto 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 700;
}
.brand h1 { font-size: 22px; font-weight: 600; letter-spacing: 0.5px; }
.brand p { font-size: 13px; color: rgba(255,255,255,0.45); margin-top: 6px; }
.field { margin-bottom: 16px; }
.field label {
  display: block; font-size: 12px; color: rgba(255,255,255,0.5);
  margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.08em;
}
.field input {
  width: 100%; padding: 12px 14px;
  border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05); color: #fff; font-size: 14px;
  outline: none; transition: border-color 0.2s;
}
.field input:focus { border-color: rgba(255,255,255,0.25); }
.field input::placeholder { color: rgba(255,255,255,0.25); }
.btn {
  width: 100%; padding: 13px;
  border-radius: 12px; border: none;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: #fff; font-size: 15px; font-weight: 500;
  cursor: pointer; transition: opacity 0.2s; margin-top: 8px;
}
.btn:hover { opacity: 0.9; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.status {
  margin-top: 14px; min-height: 20px;
  font-size: 13px; text-align: center;
}
.status.ok { color: #34d399; }
.status.err { color: #f87171; }
.status.loading { color: #93c5fd; }
.footer {
  margin-top: 22px; text-align: center;
  font-size: 12px; color: rgba(255,255,255,0.3);
}
</style>
</head>
<body>
<div class="card">
  <div class="brand">
    <div class="brand-icon">M</div>
    <h1>摹图</h1>
    <p>AI 电商详情页生成工作台</p>
  </div>
  <div class="field">
    <label>服务器地址</label>
    <input id="serverUrl" type="text" placeholder="例如：https://your-server.com" value="http://localhost:3000" />
  </div>
  <div class="field">
    <label>激活码</label>
    <input id="key" type="text" placeholder="请输入您的激活码" />
  </div>
  <button class="btn" id="submit">激活并开始使用</button>
  <div class="status" id="status"></div>
  <div class="footer">激活码由管理员统一分配</div>
</div>
<script>
const $ = id => document.getElementById(id);
let verifying = false;

async function activate() {
  if (verifying) return;
  const serverUrl = $('serverUrl').value.trim();
  const key = $('key').value.trim();
  const status = $('status');

  if (!serverUrl) { status.textContent = '请输入服务器地址'; status.className = 'status err'; return; }
  if (!key) { status.textContent = '请输入激活码'; status.className = 'status err'; return; }

  verifying = true;
  $('submit').disabled = true;
  status.textContent = '正在验证激活码...';
  status.className = 'status loading';

  try {
    const result = await window.electronAPI.verifyActivation(serverUrl, key);
    if (result.success) {
      status.textContent = '激活成功！正在启动...';
      status.className = 'status ok';
    } else {
      status.textContent = result.error?.message || '激活失败';
      status.className = 'status err';
      verifying = false;
      $('submit').disabled = false;
    }
  } catch (e) {
    status.textContent = '网络错误：' + (e.message || '无法连接服务器');
    status.className = 'status err';
    verifying = false;
    $('submit').disabled = false;
  }
}

$('submit').addEventListener('click', activate);
$('key').addEventListener('keydown', e => { if (e.key === 'Enter') activate(); });
</script>
</body>
</html>
  `.trim();
}

function createActivateWindow() {
  activateWindow = new BrowserWindow({
    width: 520,
    height: 460,
    resizable: false,
    minimizable: false,
    maximizable: false,
    frame: false,
    show: false,
    center: true,
    backgroundColor: "#0a0a0b",
    title: "摹图 - 激活",
    icon: getWindowIcon(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  activateWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildActivateHtml())}`);

  activateWindow.once("ready-to-show", () => {
    activateWindow?.show();
  });

  activateWindow.on("closed", () => {
    activateWindow = null;
    if (!mainWindow && !isQuitting) {
      app.quit();
    }
  });
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 460,
    height: 280,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    frame: false,
    show: false,
    center: true,
    backgroundColor: "#0a0a0b",
    title: "摹图",
    icon: getWindowIcon(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const splashHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data:;" />
<title>摹图</title>
<style>
* { box-sizing: border-box; }
html, body { margin: 0; width: 100%; height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  background: linear-gradient(135deg, #0a0a0b 0%, #141416 100%); color: #ffffff; }
.wrap { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 24px; }
.card { width: 100%; border-radius: 18px; background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08); padding: 28px 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.32); }
.title { font-size: 20px; font-weight: 700; letter-spacing: 0.2px; margin-bottom: 6px; }
.desc { font-size: 13px; color: rgba(255,255,255,0.55); line-height: 1.6; margin-bottom: 18px; }
.status { font-size: 13px; color: #93c5fd; margin-bottom: 14px; min-height: 20px; }
.bar { width: 100%; height: 6px; border-radius: 999px; overflow: hidden; background: rgba(255,255,255,0.08); }
.bar > div { width: 40%; height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  animation: loading 1.4s ease-in-out infinite; }
.foot { margin-top: 14px; font-size: 12px; color: rgba(255,255,255,0.35); }
@keyframes loading { 0% { transform: translateX(-120%); } 100% { transform: translateX(280%); } }
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="title">摹图</div>
    <div class="desc">AI 电商详情页生成与编辑工作台</div>
    <div class="status" id="status">正在启动应用...</div>
    <div class="bar"><div></div></div>
    <div class="foot">请稍候，正在初始化本地服务与数据环境</div>
  </div>
</div>
</body>
</html>
  `;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);

  splashWindow.once("ready-to-show", () => {
    splashWindow?.show();
  });

  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

function updateSplashStatus(text) {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  const safeText = JSON.stringify(text);
  splashWindow.webContents
    .executeJavaScript(`(() => { const el = document.getElementById("status"); if (el) el.textContent = ${safeText}; })();`, true)
    .catch(() => {});
}

function createMainWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1520,
    height: 980,
    minWidth: 1280,
    minHeight: 820,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#f5f5f5",
    title: "摹图",
    icon: getWindowIcon(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.on("dom-ready", () => {
    const config = readActivationConfig();
    if (config?.key) {
      mainWindow.webContents.executeJavaScript(
        `localStorage.setItem('bm_access_key', ${JSON.stringify(config.key)});`,
        true
      ).catch(() => {});
    }
    if (config?.serverUrl) {
      mainWindow.webContents.executeJavaScript(
        `localStorage.setItem('bm_server_url', ${JSON.stringify(config.serverUrl)});`,
        true
      ).catch(() => {});
    }
    if (config?.machineId) {
      mainWindow.webContents.executeJavaScript(
        `localStorage.setItem('bm_machine_id', ${JSON.stringify(config.machineId)});`,
        true
      ).catch(() => {});
    }
  });

  return mainWindow.loadURL(url);
}

// ============================================================================
// Local Server (from original implementation)
// ============================================================================

function getStandaloneRoot() {
  return path.resolve(__dirname, "..", ".next", "standalone");
}

function getServerEntry() {
  return path.join(getStandaloneRoot(), "server.js");
}

function getMigrationScript() {
  return path.join(getStandaloneRoot(), "scripts", "apply-prisma-migrations.cjs");
}

async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fsp.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fsp.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function ensureDesktopRuntimeConfig() {
  const userDataDir = app.getPath("userData");
  const prismaDir = path.join(userDataDir, "prisma");
  const storageDir = path.join(userDataDir, "storage");
  const configPath = path.join(userDataDir, "config", "runtime.json");

  await Promise.all([ensureDir(userDataDir), ensureDir(prismaDir), ensureDir(storageDir)]);

  const currentConfig = (await readJson(configPath)) ?? {};
  const appSecret =
    typeof currentConfig.appSecret === "string" && currentConfig.appSecret.length >= 12
      ? currentConfig.appSecret
      : crypto.randomBytes(32).toString("hex");

  const nextConfig = { appSecret, updatedAt: new Date().toISOString() };
  await writeJson(configPath, nextConfig);

  return {
    userDataDir,
    prismaDir,
    storageDir,
    databasePath: path.join(prismaDir, "dev.db"),
    appSecret,
  };
}

function getRuntimeEnv(runtime, port) {
  const env = {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    APP_RUNTIME: "desktop",
    APP_USER_DATA_DIR: runtime.userDataDir,
    DATABASE_URL: toSqliteFileUrl(runtime.databasePath),
    STORAGE_ROOT: runtime.storageDir,
    APP_SECRET: runtime.appSecret,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "摹图",
  };
  if (process.env.AUTH_SERVER_URL) {
    env.AUTH_SERVER_URL = process.env.AUTH_SERVER_URL;
  }
  return env;
}

function spawnNodeScript(scriptPath, env) {
  return new Promise((resolve, reject) => {
    const execPath = getElectronExecPath();
    const spawnEnv = Object.fromEntries(Object.entries({ ...env, ELECTRON_RUN_AS_NODE: "1" }).filter(([, v]) => v !== undefined));
    log.info(`[spawnNodeScript] execPath=${execPath}, cwd=${getStandaloneRoot()}, envKeys=${Object.keys(spawnEnv).length}`);
    const child = spawn(execPath, [scriptPath], {
      cwd: getStandaloneRoot(),
      env: spawnEnv,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    let stdout = "";

    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr || stdout || `Script failed with exit code ${code}`));
      }
    });
  });
}

function findAvailablePort(preferredPort = 3000, maxAttempts = 20) {
  const tryPort = (port, remaining) =>
    new Promise((resolve, reject) => {
      const tester = net.createServer();
      tester.once("error", (error) => {
        tester.close();
        if (remaining <= 0) { reject(error); return; }
        resolve(tryPort(port + 1, remaining - 1));
      });
      tester.once("listening", () => {
        const address = tester.address();
        tester.close(() => {
          if (typeof address === "object" && address && typeof address.port === "number") {
            resolve(address.port);
            return;
          }
          resolve(port);
        });
      });
      tester.listen(port, "127.0.0.1");
    });

  return tryPort(preferredPort, maxAttempts);
}

function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if ((response.statusCode ?? 500) < 500) { resolve(true); return; }
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Server health check failed with status ${response.statusCode}`));
          return;
        }
        setTimeout(attempt, 500);
      });
      request.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error("Timed out waiting for local desktop server to start."));
          return;
        }
        setTimeout(attempt, 500);
      });
    };
    attempt();
  });
}

async function startNextServer(runtime) {
  const serverEntry = getServerEntry();
  if (!fs.existsSync(serverEntry)) {
    throw new Error(`Missing Next standalone server entry: ${serverEntry}`);
  }

  const port = await findAvailablePort(3000);
  const env = getRuntimeEnv(runtime, port);

  log.info("Starting Next.js server on port", port);
  const execPath = getElectronExecPath();
  const spawnEnv = Object.fromEntries(Object.entries({ ...env, ELECTRON_RUN_AS_NODE: "1" }).filter(([, v]) => v !== undefined));
  log.info(`[startNextServer] execPath=${execPath}, serverEntry=${serverEntry}, cwd=${getStandaloneRoot()}, envKeys=${Object.keys(spawnEnv).length}`);
  serverProcess = spawn(execPath, [serverEntry], {
    cwd: getStandaloneRoot(),
    env: spawnEnv,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let serverErrors = "";
  serverProcess.stderr.on("data", (chunk) => { serverErrors += chunk.toString(); });

  serverProcess.on("error", (err) => {
    if (!isQuitting) {
      log.error("Server spawn error:", err);
      dialog.showErrorBox("摹图 启动失败", err.message || "内置服务启动失败");
      app.quit();
    }
  });

  serverProcess.on("exit", (code) => {
    if (!isQuitting && code !== 0) {
      log.error("App bootstrap failed:", serverErrors || `Exit code ${code}`);
  dialog.showErrorBox("摹图 启动失败", serverErrors || `内置服务异常退出，退出码：${code}`);
      app.quit();
    }
  });

  serverUrl = `http://127.0.0.1:${port}`;
  await waitForServer(serverUrl);
  return serverUrl;
}

async function shutdownServerProcess() {
  if (!serverProcess || serverProcess.killed) return;
  await new Promise((resolve) => {
    const currentProcess = serverProcess;
    currentProcess.once("exit", () => resolve(null));
    currentProcess.kill();
    setTimeout(() => {
      if (!currentProcess.killed) currentProcess.kill("SIGKILL");
      resolve(null);
    }, 3000);
  });
}

async function bootstrapDesktopApp() {
  console.time("desktop:total");

  createSplashWindow();
  updateSplashStatus("正在准备本地运行环境...");
  console.time("desktop:runtime");
  const runtime = await ensureDesktopRuntimeConfig();
  console.timeEnd("desktop:runtime");

  updateSplashStatus("正在初始化数据库...");
  console.time("desktop:migration");
  await spawnNodeScript(getMigrationScript(), getRuntimeEnv(runtime, 3000));
  console.timeEnd("desktop:migration");

  updateSplashStatus("正在启动本地服务...");
  console.time("desktop:server");
  const url = await startNextServer(runtime);
  console.timeEnd("desktop:server");

  updateSplashStatus("正在加载界面...");
  console.time("desktop:window");
  await createMainWindow(url);
  console.timeEnd("desktop:window");

  console.timeEnd("desktop:total");
}

// ============================================================================
// Activation Flow
// ============================================================================

async function handleActivation(serverUrl, key) {
  const config = readActivationConfig();
  const machineId = config?.machineId || crypto.randomUUID();
  log.info("[handleActivation] key=", key, "server=", serverUrl, "machineId=", machineId);

  const publicKey = await getPublicKey(serverUrl);
  if (!publicKey) {
    log.error("[handleActivation] cannot fetch public key");
    throw new Error("无法获取服务器公钥，请检查网络连接");
  }

  const result = await verifyActivationOnServer(serverUrl, key, machineId);
  if (!result.success) {
    log.error("[handleActivation] verify failed:", result.error);
    throw new Error(result.error?.message || "激活失败，请检查激活码和服务器地址");
  }

  const { signature, ...signPayload } = result.data;
  log.info("[handleActivation] signature present=", !!signature, "payload keys=", Object.keys(signPayload).join(","));
  if (!signature || !verifyServerSignature(signPayload, signature, publicKey)) {
    log.error("[handleActivation] signature verification failed");
    throw new Error("激活响应签名验证失败，可能存在安全风险");
  }
  log.info("[handleActivation] signature verified OK");

  writeActivationConfig({
    serverUrl: serverUrl.endsWith("/") ? serverUrl.slice(0, -1) : serverUrl,
    key,
    keyInfo: result.data,
    machineId,
    fingerprint: getMachineFingerprint(),
    activatedAt: new Date().toISOString(),
    lastVerifiedAt: new Date().toISOString(),
    publicKey,
  });
  log.info("[handleActivation] config saved");
  return result;
}

function checkOfflineGrace(config) {
  const GRACE_DAYS = 7;
  const GRACE_MS = GRACE_DAYS * 24 * 60 * 60 * 1000;
  const lastVerified = config.lastVerifiedAt ? new Date(config.lastVerifiedAt) : null;
  if (lastVerified && Date.now() - lastVerified.getTime() < GRACE_MS) {
    return { valid: true, offline: true, reason: "OFFLINE_GRACE" };
  }
  return { valid: false, reason: "HEARTBEAT_FAILED", message: `离线超过 ${GRACE_DAYS} 天，请联网重新验证激活状态` };
}

async function validateActivationOnStartup(config) {
  const fingerprint = getMachineFingerprint();
  log.info("[validateActivation] fingerprint=", fingerprint, "stored=", config.fingerprint);

  // 1. Hardware fingerprint mismatch
  if (config.fingerprint && config.fingerprint !== fingerprint) {
    log.warn("[validateActivation] MACHINE_MISMATCH");
    return { valid: false, reason: "MACHINE_MISMATCH", message: "激活文件与当前设备不匹配" };
  }

  // 2. Backward compatibility: legacy config without signature → just heartbeat
  if (!config.keyInfo?.signature) {
    log.info("[validateActivation] no signature, trying heartbeat");
    const heartbeat = await heartbeatActivation(config.serverUrl, config.key, config.machineId);
    if (heartbeat.success) {
      config.keyInfo = heartbeat.data;
      config.lastVerifiedAt = new Date().toISOString();
      writeActivationConfig(config);
      return { valid: true, offline: false };
    }
    return checkOfflineGrace(config);
  }

  // 3. Verify server signature
  const publicKey = config.publicKey || await getPublicKey(config.serverUrl);
  log.info("[validateActivation] publicKey present=", !!publicKey, "stored publicKey=", !!config.publicKey);
  if (!publicKey) {
    return checkOfflineGrace(config);
  }

  const { signature, ...signPayload } = config.keyInfo;
  const sigOk = verifyServerSignature(signPayload, config.keyInfo.signature, publicKey);
  log.info("[validateActivation] sigOk=", sigOk, "payloadKeys=", Object.keys(signPayload).join(","));
  if (!sigOk) {
    log.warn("[validateActivation] sig verify failed, trying heartbeat refresh");
    const heartbeat = await heartbeatActivation(config.serverUrl, config.key, config.machineId);
    if (heartbeat.success && heartbeat.data?.signature) {
      config.keyInfo = heartbeat.data;
      config.lastVerifiedAt = new Date().toISOString();
      writeActivationConfig(config);
      return { valid: true, offline: false };
    }
    const currentPublicKey = await getPublicKey(config.serverUrl);
    if (currentPublicKey && currentPublicKey !== config.publicKey) {
      log.warn("[validateActivation] KEY_ROTATION");
      return { valid: false, reason: "KEY_ROTATION", message: "服务器密钥已更新，请重新激活" };
    }
    log.error("[validateActivation] INVALID_SIGNATURE");
    return { valid: false, reason: "INVALID_SIGNATURE", message: "激活签名验证失败，激活文件可能已被篡改" };
  }

  // 4. Send heartbeat
  const heartbeat = await heartbeatActivation(config.serverUrl, config.key, config.machineId);
  if (heartbeat.success) {
    config.keyInfo = heartbeat.data;
    config.lastVerifiedAt = new Date().toISOString();
    writeActivationConfig(config);
    return { valid: true, offline: false };
  }

  return checkOfflineGrace(config);
}

async function bootstrapWithActivation() {
  const config = readActivationConfig();

  if (!config || !config.key || !config.serverUrl) {
    createActivateWindow();
    return;
  }

  // Anti-tampering: validate activation on every startup
  const validation = await validateActivationOnStartup(config);
  if (!validation.valid) {
    log.warn("Activation validation failed:", validation.reason);
    clearActivationConfig();
    dialog.showErrorBox("激活验证失败", validation.message || "请重新激活");
    createActivateWindow();
    return;
  }

  if (validation.offline) {
    log.info("Running in offline grace mode");
  }

  await bootstrapDesktopApp();
}

// ============================================================================
// IPC
// ============================================================================

ipcMain.handle("desktop:verify-activation", async (_, serverUrl, key) => {
  try {
    const result = await handleActivation(serverUrl, key);
    if (result.success && activateWindow && !activateWindow.isDestroyed()) {
      activateWindow.close();
    }
    if (result.success) {
      await bootstrapDesktopApp();
    }
    return result;
  } catch (error) {
    return { success: false, error: { message: error.message } };
  }
});

ipcMain.handle("desktop:get-activation", () => {
  return readActivationConfig();
});

ipcMain.handle("desktop:logout", () => {
  clearActivationConfig();
  app.relaunch();
  app.quit();
});

// ============================================================================
// App Events
// ============================================================================

app.on("before-quit", async () => {
  isQuitting = true;
  await shutdownServerProcess();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (!mainWindow && serverUrl) {
    await createMainWindow(serverUrl);
  }
});

app.whenReady().then(() => {
  bootstrapWithActivation().catch((error) => {
    log.error("App bootstrap error:", error);
  dialog.showErrorBox("摹图 启动失败", error instanceof Error ? error.message : "未知错误");
    app.quit();
  });
});
