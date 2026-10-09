import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ARTICLES, getArticle } from "@/content/blog";
import { ArticleView, articleMetadata } from "@/app/(app)/(seo)/_seo/article-view";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return ARTICLES.en.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getArticle("en", (await params).slug);
  return article ? articleMetadata(article) : {};
}

export default async function ArticlePage({ params }: Props) {
  const article = getArticle("en", (await params).slug);
  if (!article) notFound();
  return <ArticleView article={article} />;
}
