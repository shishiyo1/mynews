const fs = require("fs/promises");
const path = require("path");

const API_KEY = process.env.GNEWS_API_KEY;
if (!API_KEY) {
  throw new Error("GNEWS_API_KEY is not set");
}

const CATEGORIES = (process.env.GNEWS_CATEGORIES || "general,technology,business,entertainment,sports,science")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const COUNT = Math.max(1, Math.min(100, Number(process.env.GNEWS_COUNT || "10")));
const BASE_URL = "https://gnews.io/api/v4/top-headlines";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPage(params) {
  const url = new URL(BASE_URL);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  });
  url.searchParams.set("apikey", API_KEY);

  const res = await fetch(url.toString(), { headers: { "Accept": "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      Array.isArray(data?.errors) ? data.errors.join(" / ") :
      typeof data?.errors === "string" ? data.errors :
      data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

async function fetchArticlesFor(params, desiredCount) {
  const articles = [];
  let page = 1;
  while (articles.length < desiredCount) {
    const pageSize = Math.min(10, desiredCount - articles.length);
    const data = await fetchPage({ ...params, max: pageSize, page });
    const batch = Array.isArray(data?.articles) ? data.articles : [];
    if (!batch.length) break;
    articles.push(...batch);
    if (batch.length < pageSize) break;
    page += 1;
    await sleep(1200);
  }
  return articles.slice(0, desiredCount).map(a => ({
    title: a.title || "",
    description: a.description || "",
    url: a.url || "#",
    source: { name: a.source?.name || "" },
    publishedAt: a.publishedAt || null,
    image: a.image || null,
    language: params.lang || ""
  }));
}

async function main() {
  const out = {
    provider: "GNews via GitHub Actions",
    updatedAt: new Date().toISOString(),
    windowLabel: "GitHub Pages 互換版",
    categories: {}
  };

  for (const category of CATEGORIES) {
    out.categories[category] = { jp: [], world: [] };

    out.categories[category].jp = await fetchArticlesFor({
      category,
      country: "jp",
      lang: "ja"
    }, COUNT);

    await sleep(1500);

    out.categories[category].world = await fetchArticlesFor({
      category,
      lang: "en"
    }, COUNT);

    await sleep(1500);
  }

  const outputPath = path.join(process.cwd(), "data", "news.json");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(out, null, 2), "utf8");
  console.log(`updated ${outputPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
