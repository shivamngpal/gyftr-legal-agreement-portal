import { prisma } from "../config/db";

const TEAMS = ["LEGAL", "FINANCE", "BUSINESS", "COMPLIANCE"] as const;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export class DashboardService {
  static async getStats() {
    const threeDaysAgo = new Date(Date.now() - THREE_DAYS_MS);

    // Parallel: active agreements (with latest draft + review statuses) + approved statuses for avg turnaround
    const [activeAgreements, approvedStatuses] = await Promise.all([
      prisma.agreement.findMany({
        where: { status: { notIn: ["EXECUTED", "CANCELLED"] } },
        select: {
          id: true,
          clientName: true,
          status: true,
          updatedAt: true,
          drafts: {
            orderBy: { version: "desc" },
            take: 1,
            select: {
              id: true,
              reviewStatuses: {
                select: { team: true, status: true, updatedAt: true },
              },
            },
          },
        },
      }),
      prisma.reviewStatus.findMany({
        where: { status: "APPROVED" },
        select: {
          team: true,
          updatedAt: true,
          draft: { select: { createdAt: true } },
        },
      }),
    ]);

    // open clause count requires latest draft IDs from query above
    const latestDraftIds = activeAgreements
      .map((a) => a.drafts[0]?.id)
      .filter((id): id is string => Boolean(id));

    const openClauseCount = await prisma.clause.count({
      where: {
        draftId: { in: latestDraftIds },
        outcome: { in: ["PENDING", "HELD"] },
      },
    });

    // stuck: any team PENDING/UNDER_REVIEW on latest draft for >3 days
    const stuckAgreements = activeAgreements.filter((a) => {
      const draft = a.drafts[0];
      if (!draft) return false;
      return draft.reviewStatuses.some(
        (rs) =>
          (rs.status === "PENDING" || rs.status === "UNDER_REVIEW") &&
          rs.updatedAt < threeDaysAgo
      );
    }).length;

    // waiting count per team
    const waitingPerTeam: Record<string, number> = {
      LEGAL: 0, FINANCE: 0, BUSINESS: 0, COMPLIANCE: 0,
    };
    for (const agreement of activeAgreements) {
      const draft = agreement.drafts[0];
      if (!draft) continue;
      for (const rs of draft.reviewStatuses) {
        if (rs.status === "PENDING" || rs.status === "UNDER_REVIEW") {
          waitingPerTeam[rs.team as string] = (waitingPerTeam[rs.team as string] ?? 0) + 1;
        }
      }
    }

    // avg turnaround per team: (reviewStatus.updatedAt - draft.createdAt) in hours for APPROVED records
    const avgResponseHours: Record<string, number | null> = {
      LEGAL: null, FINANCE: null, BUSINESS: null, COMPLIANCE: null,
    };
    for (const team of TEAMS) {
      const teamStatuses = approvedStatuses.filter((rs) => rs.team === team);
      if (teamStatuses.length > 0) {
        const totalHours = teamStatuses.reduce((sum, rs) => {
          return sum + (rs.updatedAt.getTime() - rs.draft.createdAt.getTime()) / 3_600_000;
        }, 0);
        avgResponseHours[team] = totalHours / teamStatuses.length;
      }
    }

    const teamStats = TEAMS.map((team) => ({
      team,
      waitingCount: waitingPerTeam[team] ?? 0,
      avgResponseHours: avgResponseHours[team],
    }));

    // priority list: agreements with blocking teams, sorted by most blocked then oldest
    const priorityList = activeAgreements
      .map((a) => {
        const draft = a.drafts[0];
        const blockingTeams = draft
          ? draft.reviewStatuses
              .filter((rs) => rs.status === "PENDING" || rs.status === "UNDER_REVIEW")
              .map((rs) => rs.team as string)
          : [];
        return {
          agreementId: a.id,
          clientName: a.clientName,
          status: a.status as string,
          updatedAt: a.updatedAt,
          blockingTeams,
        };
      })
      .filter((a) => a.blockingTeams.length > 0)
      .sort((a, b) => {
        if (b.blockingTeams.length !== a.blockingTeams.length) {
          return b.blockingTeams.length - a.blockingTeams.length;
        }
        return a.updatedAt.getTime() - b.updatedAt.getTime();
      });

    return {
      totalActive: activeAgreements.length,
      stuckAgreements,
      openClauseCount,
      teamStats,
      priorityList,
    };
  }
}
