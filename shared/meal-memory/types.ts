/** A meal the user marked "Not for us" — hidden from automatic picks, still in Explore. */
export interface RecipeDislike {
  slug: string;
  title: string;
  imageUrl: string | null;
  /** Public recipe page. */
  path: string;
  createdAt: string;
}

export interface RecipeDislikesResponse {
  dislikes: RecipeDislike[];
}
