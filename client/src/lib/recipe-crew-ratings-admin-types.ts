/** Client mirror of server CrewRatingAnalytics */
export interface CrewRatingAnalytics {
  mostLiked: Array<{ slug: string; thumbsUp: number; totalVotes: number; approvalScore: number | null }>;
  mostDisliked: Array<{ slug: string; thumbsDown: number; totalVotes: number; approvalScore: number | null }>;
  highestApproval: Array<{ slug: string; approvalScore: number; totalVotes: number }>;
  lowestApproval: Array<{ slug: string; approvalScore: number; totalVotes: number }>;
  mostVoted: Array<{ slug: string; totalVotes: number; approvalScore: number | null }>;
  fastestGrowing: Array<{ slug: string; votesLast7Days: number; votesLast30Days: number }>;
  complaintBreakdown: Array<{ category: string; count: number }>;
  badgeDistribution: Record<string, number>;
  totalRatedRecipes: number;
  totalVotes: number;
  badgeRate: number;
}
