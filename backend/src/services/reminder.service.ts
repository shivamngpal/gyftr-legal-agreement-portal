import { prisma } from "../config/db";
import { Role } from "../generated/prisma/enums";

export class ReminderService {
  static async createReminders(senderId: string, agreementId: string, targetTeams: Role[], message?: string) {
    const agreement = await prisma.agreement.findUnique({ where: { id: agreementId } });
    if (!agreement) throw new Error("Agreement not found");

    return prisma.$transaction(async (tx) => {
      // Create one Reminder per team
      const reminders = await Promise.all(
        targetTeams.map((team) =>
          tx.reminder.create({
            data: { agreementId, senderId, targetTeam: team, message },
          })
        )
      );

      // Single history log entry covering all teams
      await tx.historyLog.create({
        data: {
          agreementId,
          actorId: senderId,
          action: "REMINDER_SENT",
          details: `Legal sent a reminder to ${targetTeams.join(", ")} for agreement ${agreement.clientName}`,
        },
      });

      return reminders;
    });
  }

  static async getMyReminders(userRole: Role) {
    return prisma.reminder.findMany({
      where: {
        targetTeam: userRole,
        read: false,
      },
      orderBy: {
        timestamp: "desc",
      },
      include: {
        sender: {
          select: { name: true, role: true },
        },
        agreement: {
          select: { clientName: true },
        },
      },
    });
  }

  static async markAsRead(reminderId: string, userRole: Role) {
    const reminder = await prisma.reminder.findUnique({
      where: { id: reminderId },
    });

    if (!reminder) throw new Error("Reminder not found");
    if (reminder.targetTeam !== userRole) {
      throw new Error("Unauthorized to mark this reminder as read");
    }

    return prisma.reminder.update({
      where: { id: reminderId },
      data: { read: true },
    });
  }
}
