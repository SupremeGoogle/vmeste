import { BlogIndexView, blogIndexMetadata } from "../_seo/blog-index-view";

export const metadata = blogIndexMetadata("ru");

export default function BlogPage() {
  return <BlogIndexView lang="ru" />;
}
