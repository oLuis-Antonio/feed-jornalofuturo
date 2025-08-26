import "dotenv/config";
import RSS from "rss";
import { writeFileSync } from "fs";

function renderBody(node) {
  if (!node) return "";

  if (Array.isArray(node)) {
    return node.map((n) => renderBody(n)).join("");
  }

  if (node.children && node.children.length > 0) {
    return node.children.map((child) => renderBody(child)).join("");
  }

  switch (node.type) {
    case "paragraph":
      return `<p>${renderBody(node.children)}</p>`;
    case "text": {
      let text = node.text || "";
      if (node.style === "bold") text = `<strong>${text}</strong>`;
      if (node.style === "italic") text = `<em>${text}</em>`;
      return text;
    }
    case "link": {
      const url = node.fields?.url || "#";
      return `<a href="${url}">${renderBody(node.children)}</a>`;
    }
    case "image": {
      const src = node.fields?.src || node.url || "";
      const alt = node.fields?.alt || node.altText || "";
      return `<img src="${src}" alt="${alt}" />`;
    }
    case "list": {
      const tag = node.ordered ? "ol" : "ul";
      const items =
        node.children?.map((li) => `<li>${renderBody(li)}</li>`).join("") || "";
      return `<${tag}>${items}</${tag}>`;
    }
    case "listItem":
      return renderBody(node.children);
    case "lineBreak":
      return "<br />";
    default:
      return "";
  }
}

async function getPCBRdata() {
  try {
    const response = await fetch(`${process.env.API_URL}/article/list`);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const data = await response.json();

    const articles = await Promise.all(
      data.docs.map(async (article) => {
        const detailResp = await fetch(
          `${process.env.API_URL}/article/details/${article.sqid}`
        );
        const detail = await detailResp.json();
        const contentHtml = renderBody(detail.body.root);

        return {
          title: article.titleText,
          description: article.snippetText,
          date: article.publishDate,
          url: `${process.env.BASE_URL}/artigo/${article.sqid}-${article.slug}`,
          guid: article.sqid,
          content: contentHtml,
        };
      })
    );

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
      custom_elements: [
        { "content:encoded": `<![CDATA[${article.content}]]>` },
      ],
    });
  }
}

async function generateFeed() {
  await generateFeedItems();
  writeFileSync("./docs/feed.xml", feed.xml({ indent: true }));
}

generateFeed();
