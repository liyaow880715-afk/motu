const fs = require("fs");
const path = require("path");

const dir = path.join(process.cwd(), "remotion", "public");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".png"));

let out = "export const IMAGES = {\n";
for (const f of files) {
  const base64 = fs.readFileSync(path.join(dir, f), "base64");
  const name = f.replace(".png", "");
  out += `  ${name}: "data:image/png;base64,${base64}",\n`;
}
out += "};\n";

fs.writeFileSync(path.join(process.cwd(), "remotion", "src", "image-assets.ts"), out);
console.log("Done:", files.join(", "));
