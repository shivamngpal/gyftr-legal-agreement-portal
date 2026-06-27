import { prisma } from "../config/db";
import { Role } from "../generated/prisma/enums";

export class ReminderService {
  static async createReminder(senderId: string, agreementId: string, targetTeam: Role, message?: string) {
    const agreement = await prisma.agreement.findUnique({ where: { id: agreementId } });
    if (!agreement) throw new Error("Agreement not found");

    return prisma.$transaction(async (tx) => {
      // Create Reminder
      const reminder = await tx.reminder.create({
        data: {
          agreementId,
          senderId,
          targetTeam,
          message,
        },
      });

      // Log to History
      await tx.historyLog.create({
        data: {
          agreementId,
          actorId: senderId,
          action: "REMINDER_SENT",
          details: `Legal sent a reminder to ${targetTeam} for agreement ${agreement.clientName}`,
        },
      });

      return reminder;
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
