import { Redirect, useRoute } from "wouter";
import { firehallCategoryExplorePath } from "@shared/browse-canonical";

/** Client-side fallback — category hubs redirect to filtered Explore. */
export default function FirehallCategoryRedirect() {
  const [, params] = useRoute("/categories/:categoryId");
  const categoryId = (params?.categoryId ?? "").trim().toLowerCase();
  return <Redirect to={firehallCategoryExplorePath(categoryId)} replace />;
}
