import {
  authentication,
  createDashboards,
  createDirectus,
  createFlows,
  createFolders,
  createItems,
  updateOperations,
  updateOperation,
  createOperations,
  createPanels,
  createPermissions,
  createPolicies,
  createPresets,
  createRelation,
  createRoles,
  createTranslations,
  createUsers,
  readDashboards,
  readFlows,
  readFolders,
  readOperations,
  readPanels,
  readPermissions,
  readPolicies,
  readPresets,
  readRelation,
  readRoles,
  readTranslations,
  readUsers,
  rest,
  updateSettings,
} from "@directus/sdk";

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = createDirectus("http://localhost:8055")
  .with(rest())
  .with(authentication("json"));

await client.login({
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
});

const getJsonData = (collection) => {
  const folder = path.join(
    __dirname,
    "directus/template/src/database/initialization/data"
  );
  return (
    JSON.parse(fs.readFileSync(path.join(folder, collection), "utf-8")) || []
  );
};

const getContentData = (collection) => {
  const folder = path.join(
    __dirname,
    "directus/template/src/database/initialization/content"
  );
  return (
    JSON.parse(fs.readFileSync(path.join(folder, collection), "utf-8")) || []
  );
};

const importTable = async (
  collectionName,
  content,
  readFnc,
  createFnc,
  queryField = "id"
) => {
  try {
    const existing = await client.request(readFnc({ limit: -1 }));
    const imported = [];
    for (const item of content) {
      const exists = existing?.some(
        (e) => e[queryField] === item[queryField] || e?.id === item?.id
      );
      if (exists) {
        console.log(
          `⏭ Skipped (already exists): ${item[queryField]} on ${collectionName}`
        );
        continue;
      }

      try {
        await client.request(createFnc([item]));
        console.log(`✅ Imported: ${item[queryField]} on ${collectionName}`);
        imported.push(item);
      } catch (error) {
        console.warn(
          `⚠️ Failed to import ${collectionName}:`,
          error.message || error
        );
      }
    }

    console.log(
      `✅ Done importing ${collectionName}: ${imported.length} created, ${
        content.length - imported.length
      } skipped`
    );
  } catch (error) {
    console.warn(
      `${collectionName} ⚠️ Skipped file due to error:`,
      error.message || error
    );
    return null;
  }
};

const importPosts = async () => {
  try {
    const contents = getContentData("posts.json");
    return await client.request(createItems("posts", contents));
  } catch (error) {
    console.warn(`Posts ⚠️ Skipped file due to error:`, error.message || error);
    return null;
  }
};

const importOperation = async () => {
  try {
    const contents = getJsonData("operations.json");
    const data = contents.map((c) => {
      return { ...c, resolve: null, reject: null };
    });

    const result = await client.request(createOperations(data));

    for (const element of result) {
      const initialization = contents?.find((c) => c.id == element.id);
      if (initialization.reject || initialization.resolve) {
        await client.request(
          updateOperation(element.id, {
            reject: initialization.reject,
            resolve: initialization.resolve,
          })
        );
      }
      continue;
    }

    return contents;
  } catch (error) {
    console.warn(
      `Operation ⚠️ Skipped file due to error:`,
      error.message || error
    );
    return null;
  }
};

const updateTable = async (collectionName, content, updateFnc) => {
  try {
    await client.request(updateFnc(content));
    console.log(`✅ Updated: ${content?.id} on ${collectionName}`);
  } catch (error) {
    console.warn(
      `${collectionName} ⚠️ Skipped file due to error:`,
      error.message || error
    );
    return null;
  }
};

async function importData() {
  try {
    await importTable(
      "relations",
      getJsonData("relations.json"),
      readRelation,
      createRelation
    );

    await importTable(
      "folders",
      getJsonData("folders.json"),
      readFolders,
      createFolders
    );
    await updateTable("settings", getJsonData("settings.json"), updateSettings);

    await importTable(
      "translations",
      getJsonData("translations.json"),
      readTranslations,
      createTranslations
    );

    await importTable(
      "policies",
      getJsonData("policies.json"),
      readPolicies,
      createPolicies
    );

    await importTable(
      "roles",
      getJsonData("roles.json"),
      readRoles,
      createRoles
    );

    await importTable(
      "users",
      getJsonData("users.json").map((user) => {
        return {
          ...user,
          password: user.password && process.env.DEFAULT_PASSWORD,
        };
      }),
      readUsers,
      createUsers,
      "email"
    );

    await importTable(
      "presets",
      getJsonData("presets.json"),
      readPresets,
      createPresets
    );

    await importTable(
      "flows",
      getJsonData("flows.json"),
      readFlows,
      createFlows
    );

    await importOperation();

    await importTable(
      "dashboards",
      getJsonData("dashboards.json"),
      readDashboards,
      createDashboards
    );

    await importTable(
      "panels",
      getJsonData("panels.json"),
      readPanels,
      createPanels
    );

    await importTable(
      "permissions",
      getJsonData("permissions.json").map((p, i) => {
        return { ...p, id: i };
      }),
      readPermissions,
      createPermissions,
      "id"
    );

    await importPosts();
    console.log("🎉 All files imported successfully!");
    return;
  } catch (error) {
    console.error("❌ Import failed:", error.message || error);
    return null;
  } finally {
    console.log("DONE!");
    process.exit();
  }
}

importData();
