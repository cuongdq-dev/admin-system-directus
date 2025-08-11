const { execSync } = require("child_process");
const fs = require("fs");

const extensionsFile =
  "./directus/template/src/database/migration/data/extensions.json";
const extensions = JSON.parse(fs.readFileSync(extensionsFile, "utf-8"));

try {
  extensions.forEach((ext) => {
    if (ext.bundle) return;
    const name = ext?.schema?.name;
    if (!name) {
      console.warn("⚠️  Extension has no name. Skipping...");
      return;
    }

    try {
      console.log(`📦 Installing ${name}...`);
      execSync(`pnpm install ${name}`, { stdio: "inherit" });
      console.log(`✅ Installed: ${name}`);
    } catch (error) {
      console.error(
        `❌ Failed to install ${name}. Skipping...\n`,
        error.message
      );
    }
  });
} catch (error) {
  console.log("Extensions FALSE!!");
  return null;
} finally {
  console.log("🏁 All extensions processed.");
  process.exit();
}
