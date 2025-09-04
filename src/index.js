import "dotenv/config";
import RSS from "rss";
import { writeFileSync } from "fs";
import * as cheerio from "cheerio";
import sanitizeHtml from "sanitize-html";

// BASE RSS FEED
const feed = new RSS({
  title: "Jornal o Futuro",
  description: "Um jornal político para todo o Brasil.",
  feed_url: process.env.FEED_URL,
  site_url: process.env.BASE_URL,
  image_url: `${process.env.BASE_URL}/favicon.png`,
  language: "pt-BR",
});

// FETCH DATA FROM "O FUTURO" API
async function getPCBRdata() {
  try {
    const response = await fetch(`${process.env.API_URL}/article/list`);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const data = await response.json();

    return data.docs.map((article) => ({
      title: article.titleText,
      description: article.snippetText,
      date: article.publishDate,
      url: `${process.env.BASE_URL}/artigo/${article.sqid}-${article.slug}`,
      guid: article.sqid,
    }));
  } catch (error) {
    console.error(error.message);
    return [];
  }
}

async function getArticleContent(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${articleUrl}`);
    const html = await response.text();

    const $ = cheerio.load(html);
    const rawContent = $(".text-body").html() || "";

    const cleanContent = sanitizeHtml(rawContent, {
      allowedTags: [
        "p",
        "br",
        "strong",
        "em",
        "ul",
        "ol",
        "li",
        "blockquote",
        "code",
        "pre",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "img",
        "a",
      ],
      allowedAttributes: {
        a: ["href", "title", "target"],
        img: ["src", "alt", "title"],
      },
      allowedSchemes: ["http", "https", "mailto"],
    });

    return cleanContent;
  } catch (error) {
    console.error("Error fetching article content:", error.message);
    return "";
  }
}

async function generateFeedItems() {
  const articles = await getPCBRdata();

  for (const article of articles) {
    const content = await getArticleContent(article.url);
    feed.item({
      title: article.title,
      description: article.description,
      url: article.url,
      guid: article.guid,
      date: article.date,
      custom_elements: [{ "content:encoded": content }],
    });
  }
}

async function generateFeed() {
  await generateFeedItems();
  writeFileSync("./docs/feed.xml", feed.xml({ indent: true }));
}

generateFeed();
