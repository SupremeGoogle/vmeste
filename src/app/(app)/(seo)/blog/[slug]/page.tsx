import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ARTICLES, getArticle } from "@/content/blog";
import { ArticleView, articleMetadata } from "../../_seo/article-view";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return ARTICLES.ru.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getArticle("ru", (await params).slug);
  return article ? articleMetadata(article) : {};
}

export default async function ArticlePage({ params }: Props) {
  const article = getArticle("ru", (await params).slug);
  if (!article) notFound();
  return <ArticleView article={article} />;
}
