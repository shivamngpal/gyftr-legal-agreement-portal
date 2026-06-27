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

    // Verify user exists
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      throw new Error("User not found");
    }

    // Execute updates in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update all clauses
      await Promise.all(
        clauses.map(clause =>
          tx.clause.update({
            where: { id: clause.id },
            data: {
              outcome: clause.outcome,
              comments: clause.comments,
            },
          })
        )
      );

      // 2. Create history log
      await tx.historyLog.create({
        data: {
          agreementId: draft.agreementId,
          draftId: draft.id,
          action: "CLAUSE_REVIEW_COMPLETED",
          details: `Legal reviewed clauses for Draft Version ${draft.version}`,
          actorId: userId,
        },
      });
    });

    return { message: "Clauses updated successfully" };
  }

  static async getComparison(draftId: string, baseDraftId?: string) {
    let currentDraft;
    let baseDraft = null;

    if (baseDraftId) {
      // 1. Fetch both drafts in parallel
      [currentDraft, baseDraft] = await Promise.all([
        prisma.draft.findUnique({
          where: { id: draftId },
          include: { clauses: true },
        }),
        prisma.draft.findUnique({
          where: { id: baseDraftId },
          include: { clauses: true },
        }),
      ]);

      if (!currentDraft) {
        throw new Error("Draft not found");
      }

      if (baseDraft && baseDraft.agreementId !== currentDraft.agreementId) {
        throw new Error("Base draft does not belong to this agreement");
      }
    } else {
      // 1. Fetch current draft first to get its version
      currentDraft = await prisma.draft.findUnique({
        where: { id: draftId },
        include: { clauses: true },
      });

      if (!currentDraft) {
        throw new Error("Draft not found");
      }

      if (currentDraft.version > 1) {
        baseDraft = await prisma.draft.findFirst({
          where: {
            agreementId: currentDraft.agreementId,
            version: currentDraft.version - 1,
          },
          include: { clauses: true },
        });
      }
    }

    // Sort current clauses
    currentDraft.clauses.sort((a, b) => 
      a.identifier.localeCompare(b.identifier, undefined, { numeric: true, sensitivity: 'base' })
    );

    if (!baseDraft) {
      return {
        baseDraft: null,
        currentDraft,
        comparisons: [],
      };
    }

    // 3. Match Clauses
    const comparisons: { baseClause: any | null, currentClause: any }[] = [];

    // Map for O(1) lookup
    const baseClausesMap = new Map();
    for (const bc of baseDraft.clauses) {
      // exact match on identifier
      baseClausesMap.set(bc.identifier, bc);
    }

    for (const currentClause of currentDraft.clauses) {
      const baseClause = baseClausesMap.get(currentClause.identifier) || null;
      comparisons.push({
        baseClause,
        currentClause,
      });
    }

    return {
      baseDraft,
      currentDraft,
      comparisons,
    };
  }
}
