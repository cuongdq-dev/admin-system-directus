import {
  authentication,
  createDirectus,
  readCollections,
  rest,
} from "@directus/sdk";
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateJson() {
  try {
    const client = createDirectus("http://localhost:8055")
      .with(rest())
      .with(authentication("json"));

    await client.login({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });

    const collections = await client.request(readCollections());
    const token = await client.getToken();

    for (const collection of collections) {
      console.log(collection.collection);
      const isSystem = collection.collection.startsWith("directus_");
      const tableName = isSystem
        ? collection.collection.replace("directus_", "")
        : collection.collection;

      const fetchUrl = isSystem
        ? `http://localhost:8055/${tableName}`
        : `http://localhost:8055/items/${tableName}`;

      const rawFetch = await client.globals.fetch(fetchUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const { data } = await rawFetch.json();
      if (!data) continue;
      const pathName = isSystem ? "data" : "content";

      const filePath = path.join(
        __dirname,
        `./directus/template/src/database/migration/${pathName}/${tableName}.json`
      );

      // 👉 Đảm bảo folder tồn tại trước khi ghi file
      const dirPath = path.dirname(filePath);
      fs.mkdirSync(dirPath, { recursive: true });

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`✅ Exported ${collection.collection} → ${filePath}`);
    }
  } catch (error) {
    return null;
  } finally {
    console.log("🎉 Export hoàn tất!");
    process.exit();
  }
}

generateJson();
