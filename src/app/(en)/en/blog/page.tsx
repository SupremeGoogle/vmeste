import { BlogIndexView, blogIndexMetadata } from "@/app/(app)/(seo)/_seo/blog-index-view";

export const metadata = blogIndexMetadata("en");

export default function BlogPage() {
  return <BlogIndexView lang="en" />;
}
