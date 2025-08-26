import "dotenv/config";
import RSS from "rss";
import { writeFileSync } from "fs";

async function getPCBRdata() {
  const url = process.env.API_URL;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const data = await response.json();

    const articles = data.docs.map((article) => ({
      title: article.titleText,
      description: article.snippetText,
      date: article.publishDate,
      url: `${process.env.BASE_URL}/artigo/${article.sqid}-${article.slug}`,
      guid: article.sqid,
    }));

    return articles;
  } catch (error) {
    console.error(error.message);
  }
}

const feed = new RSS({
  title: "Jornal do Futuro",
  description: "Um jornal político para todo o Brasil.",
  feed_url: process.env.FEED_URL,
  site_url: process.env.BASE_URL,
  image_url: `${process.env.BASE_URL}/favicon.png`,
  language: "pt-BR",
});

async function generateFeedItems() {
  const articles = await getPCBRdata();

  for (const article of articles) {
    feed.item({
      title: article.title,
      description: article.description,
      url: article.url,
      guid: article.guid,
      date: article.date,
    });
  }
}

async function generateFeed() {
  await generateFeedItems();
  writeFileSync("./public/feed.xml", feed.xml({ indent: true }));
}

generateFeed();
