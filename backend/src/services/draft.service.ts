import { prisma } from "../config/db";

export class DraftService {
  static async getClausesByDraftId(draftId: string) {
    // Check if draft exists
    const draft = await prisma.draft.findUnique({ where: { id: draftId } });
    if (!draft) {
      throw new Error("Draft not found");
    }

    const clauses = await prisma.clause.findMany({
      where: { draftId },
      select: {
        id: true,
        identifier: true,
        text: true,
        outcome: true,
        comments: true,
      },
    });

    // Sort clauses naturally so "2" comes before "10", "1.2" before "1.10", etc.
    return clauses.sort((a, b) => 
      a.identifier.localeCompare(b.identifier, undefined, { numeric: true, sensitivity: 'base' })
    );
  }

  static async updateClauses(
    draftId: string, 
    userId: string, 
    clauses: { id: string, outcome: any, comments?: string | null }[]
  ) {
    // Verify draft exists
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
      include: { agreement: true },
    });
    if (!draft) {
      throw new Error("Draft not found");
    }

    // Verify user exists and get role
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found");
    }

    const teamRole = user.role.charAt(0) + user.role.slice(1).toLowerCase(); // LEGAL -> Legal

    // Execute updates in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update all clauses
      for (const clause of clauses) {
        await tx.clause.update({
          where: { id: clause.id },
          data: {
            outcome: clause.outcome,
            comments: clause.comments,
          },
        });
      }

      // 2. Create history log
      await tx.historyLog.create({
        data: {
          agreementId: draft.agreementId,
          action: "CLAUSE_REVIEW_COMPLETED",
          details: `Legal reviewed clauses for Draft Version ${draft.version}`,
          actorId: userId,
        },
      });
    });

    return { message: "Clauses updated successfully" };
  }

  static async getComparison(draftId: string) {
    // 1. Load the current Draft
    const currentDraft = await prisma.draft.findUnique({
      where: { id: draftId },
      include: { clauses: true },
    });
    
    if (!currentDraft) {
      throw new Error("Draft not found");
    }

    // Sort current clauses
    currentDraft.clauses.sort((a, b) => 
      a.identifier.localeCompare(b.identifier, undefined, { numeric: true, sensitivity: 'base' })
    );

    // 2. Determine previous draft
    if (currentDraft.version === 1) {
      return {
        previousDraft: null,
        currentDraft,
        comparisons: [],
      };
    }

    const previousDraft = await prisma.draft.findFirst({
      where: {
        agreementId: currentDraft.agreementId,
        version: currentDraft.version - 1,
      },
      include: { clauses: true },
    });

    if (!previousDraft) {
      return {
        previousDraft: null,
        currentDraft,
        comparisons: [],
      };
    }

    // 3. Match Clauses
    const comparisons: { previousClause: any | null, currentClause: any }[] = [];

    // Map for O(1) lookup
    const previousClausesMap = new Map();
    for (const pc of previousDraft.clauses) {
      // exact match on identifier
      previousClausesMap.set(pc.identifier, pc);
    }

    for (const currentClause of currentDraft.clauses) {
      const previousClause = previousClausesMap.get(currentClause.identifier) || null;
      comparisons.push({
        previousClause,
        currentClause,
      });
    }

    return {
      previousDraft,
      currentDraft,
      comparisons,
    };
  }
}
