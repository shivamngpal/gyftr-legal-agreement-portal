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
}
