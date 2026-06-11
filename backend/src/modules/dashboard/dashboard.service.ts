import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Définir les types d'interface
interface ClassStat {
  classeId: string;
  classeNom: string;
  totalEnfants: number;
  totalPresences: number;
  presents: number;
  absents: number;
  justifies: number;
  attendanceRate: number;
}

interface DailyStat {
  date: string;
  present: number;
  absent: number;
  justify: number;
}

interface PresenceStats {
  period: 'day' | 'week' | 'month';
  startDate: string;
  endDate: string;
  totalEnfants: number;
  totalPresences: number;
  presents: number;
  absents: number;
  justifies: number;
  byDay: DailyStat[];
  presentPercentage: number;
  attendanceRate: number;
  byClass: ClassStat[];
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getPresenceStats(period: 'day' | 'week' | 'month'): Promise<PresenceStats> {
    const today = new Date();
    let startDate: Date;
    
    if (period === 'day') {
      startDate = new Date(today);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
    } else {
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);
    }
    
    const presences = await this.prisma.presence.findMany({
      where: {
        date: {
          gte: startDate
        }
      },
      include: {
        enfant: {
          include: {
            classe: true
          }
        }
      }
    });
    
    // Calcul des statistiques par jour
    const byDay: Record<string, DailyStat> = {};
    
    for (const presence of presences) {
      const dateKey = presence.date.toISOString().split('T')[0];
      
      if (!byDay[dateKey]) {
        byDay[dateKey] = { 
          date: dateKey, 
          present: 0, 
          absent: 0, 
          justify: 0 
        };
      }
      
      if (presence.statut === 'Present') {
        byDay[dateKey].present++;
      } else if (presence.statut === 'Absent') {
        byDay[dateKey].absent++;
      } else if (presence.statut === 'Justifie') {
        byDay[dateKey].justify++;
      }
    }
    
    // Convertir l'objet en tableau trié
    const byDayArray: DailyStat[] = Object.values(byDay)
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Calculer le nombre total d'enfants dans le système
    const totalEnfants = await this.prisma.enfant.count();
    
    const presents = presences.filter(p => p.statut === 'Present').length;
    const absents = presences.filter(p => p.statut === 'Absent').length;
    const justifies = presences.filter(p => p.statut === 'Justifie').length;
    const totalPresences = presences.length;
    
    const stats: PresenceStats = {
      period,
      startDate: startDate.toISOString(),
      endDate: today.toISOString(),
      totalEnfants,
      totalPresences,
      presents,
      absents,
      justifies,
      byDay: byDayArray,
      presentPercentage: totalPresences > 0 
        ? Math.round((presents / totalPresences) * 100)
        : 0,
      attendanceRate: totalPresences > 0
        ? Math.round(((presents + justifies) / totalPresences) * 100)
        : 0,
      byClass: await this.getPresenceStatsByClass(startDate, today)
    };
    
    return stats;
  }

  async getPresenceStatsByClass(startDate: Date, endDate: Date): Promise<ClassStat[]> {
    // Compter le nombre total d'enfants par classe
    const classesWithChildren = await this.prisma.classe.findMany({
      include: {
        enfants: true
      }
    });
    
    const classStats: ClassStat[] = [];
    
    for (const classe of classesWithChildren) {
      // Obtenir les présences pour cette classe dans la période
      const presences = await this.prisma.presence.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate
          },
          enfant: {
            classeId: classe.id
          }
        }
      });
      
      const totalEnfants = classe.enfants.length;
      const presents = presences.filter(p => p.statut === 'Present').length;
      const absents = presences.filter(p => p.statut === 'Absent').length;
      const justifies = presences.filter(p => p.statut === 'Justifie').length;
      const totalPresences = presences.length;
      
      classStats.push({
        classeId: classe.id,
        classeNom: classe.nom,
        totalEnfants,
        totalPresences,
        presents,
        absents,
        justifies,
        attendanceRate: totalPresences > 0 
          ? Math.round(((presents + justifies) / totalPresences) * 100) 
          : 0
      });
    }
    
    return classStats;
  }

  async getPresences(from?: string, to?: string) {
    const where: any = {};
    if (from || to) {
      where.date = {};
      if (from) {
        where.date.gte = new Date(from);
      }
      if (to) {
        const max = new Date(to);
        // inclure toute la journée "to"
        max.setDate(max.getDate() + 1);
        where.date.lt = max;
      }
    }

    const presences = await this.prisma.presence.findMany({ where });

    const byDate: Record<string, { date: string; present: number; absent: number; justifie: number }> = {};

    for (const p of presences) {
      const d = p.date.toISOString().slice(0, 10);
      if (!byDate[d]) {
        byDate[d] = { date: d, present: 0, absent: 0, justifie: 0 };
      }
      if (p.statut === 'Present') byDate[d].present += 1;
      else if (p.statut === 'Absent') byDate[d].absent += 1;
      else if (p.statut === 'Justifie') byDate[d].justifie += 1;
    }

    return {
      from: from || null,
      to: to || null,
      groupBy: 'day',
      items: Object.values(byDate).sort((a, b) => (a.date < b.date ? -1 : 1)),
    };
  }

  async getInscriptions(year?: number) {
    let from: Date | undefined;
    let to: Date | undefined;

    if (year) {
      from = new Date(Date.UTC(year, 0, 1));
      to = new Date(Date.UTC(year + 1, 0, 1));
    }

    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lt = to;
    }

    const inscriptions = await this.prisma.inscription.findMany({ where });

    const byMonth: Record<string, { month: string; total: number }> = {};

    for (const ins of inscriptions) {
      const d = ins.createdAt;
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) {
        byMonth[key] = { month: key, total: 0 };
      }
      byMonth[key].total += 1;
    }

    return {
      year: year || null,
      items: Object.values(byMonth).sort((a, b) => (a.month < b.month ? -1 : 1)),
    };
  }

  async getUpcomingEvents(from?: string, to?: string) {
    const now = new Date();
    const fromDate = from ? new Date(from) : now;
    const toDate = to ? new Date(to) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const events = await this.prisma.event.findMany({
      where: {
        startAt: { gte: fromDate },
        endAt: { lte: toDate },
      },
      orderBy: { startAt: 'asc' },
    });

    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      items: events.map((e) => ({
        id: e.id,
        title: e.titre,
        description: e.description,
        startAt: e.startAt,
        endAt: e.endAt,
        classeId: e.classeId,
        status: e.status,
      })),
    };
  }

  async getTeacherAttendanceStatus(from?: string, to?: string) {
    const where: any = {};
    if (from || to) {
      where.date = {};
      if (from) {
        where.date.gte = new Date(from);
      }
      if (to) {
        const max = new Date(to);
        max.setDate(max.getDate() + 1);
        where.date.lt = max;
      }
    } else {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      where.date = { gte: startOfDay, lt: endOfDay };
    }

    const enseignants = await this.prisma.enseignant.findMany({
      include: {
        utilisateur: {
          select: { prenom: true, nom: true, email: true },
        },
        classes: {
          where: { dateFin: null },
          include: {
            classe: {
              include: {
                enfants: {
                  include: {
                    presences: {
                      where,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const result: Array<{
      date: string;
      enseignantId: string;
      enseignantNom: string;
      enseignantPrenom: string;
      classes: Array<{
        classeId: string;
        classeNom: string;
        totalEnfants: number;
        enfantsAvecPresence: number;
        completed: boolean;
      }>;
      totalEnfants: number;
      totalEnfantsAvecPresence: number;
      completed: boolean;
    }> = [];

    for (const enseignant of enseignants) {
      if (!enseignant.classes.length) continue;

      const dateMap = new Map<string, any>();

      for (const enseignantClasse of enseignant.classes) {
        const classe = enseignantClasse.classe;
        const totalEnfants = classe.enfants.length;

        for (const enfant of classe.enfants) {
          for (const presence of enfant.presences) {
            const dateKey = presence.date.toISOString().slice(0, 10);
            
            if (!dateMap.has(dateKey)) {
              dateMap.set(dateKey, {
                date: dateKey,
                enseignantId: enseignant.id,
                enseignantNom: enseignant.utilisateur?.nom || '',
                enseignantPrenom: enseignant.utilisateur?.prenom || '',
                classes: [],
                totalEnfants: 0,
                totalEnfantsAvecPresence: 0,
                completed: false,
              });
            }

            const dayData = dateMap.get(dateKey);
            let classData = dayData.classes.find(c => c.classeId === classe.id);
            
            if (!classData) {
              classData = {
                classeId: classe.id,
                classeNom: classe.nom,
                totalEnfants,
                enfantsAvecPresence: 0,
                completed: false,
              };
              dayData.classes.push(classData);
              dayData.totalEnfants += totalEnfants;
            }

            classData.enfantsAvecPresence++;
            dayData.totalEnfantsAvecPresence++;
          }
        }
      }

      for (const dayData of dateMap.values()) {
        for (const classData of dayData.classes) {
          classData.completed = classData.enfantsAvecPresence === classData.totalEnfants;
        }
        dayData.completed = dayData.totalEnfantsAvecPresence === dayData.totalEnfants;
        result.push(dayData);
      }
    }

    return {
      from: from || null,
      to: to || null,
      items: result.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return a.enseignantNom.localeCompare(b.enseignantNom);
      }),
    };
  }
}