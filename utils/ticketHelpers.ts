// Add 'export' keyword before the Ticket interface
export interface Ticket {
  Incident: string;
  assignedTo?: string;
  lastAssignedTime?: number;
  status?: string;
  SID?: string;
  TTR: string;
  category?: string;
  level?: string;
  lastUpdated?: string;
  'Detail Case'?: string;
  Analisa?: string;
  'Escalation Level'?: string;
  closedAt?: number;
  action?: string;
}
  
// Helper functions moved to separate file
export function getWIBTime(): string {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'short',
      timeStyle: 'medium',
    });
    return formatter.format(now);
  }
  
  export function isMaxEscalationLevel(ticket: Ticket): boolean {
    const maxLevels: Record<string, string> = {
      K1: "L7",
      K2: "L3",
      K3: "L2",
    };
    return ticket.level === maxLevels[ticket.category || ""] || false;
  }
  
  export function escalateLevel(currentLevel?: string): string {
    const levels = ["L1", "L2", "L3", "L4", "L5", "L6", "L7"];
    const currentIndex = levels.indexOf(currentLevel || "L1");
    if (currentIndex < levels.length - 1) {
      return levels[currentIndex + 1];
    }
    return currentLevel || "L1";
  }
  
  export function assignLevelBasedOnTTR(ticket: Ticket): string {
    const { category, TTR } = ticket;
    if (!category || !TTR) return 'Unknown';
  
    const [hours, minutes, seconds] = TTR.split(':').map(Number);
    const ttrInMinutes = (hours * 60) + minutes + (seconds / 60);
  
    if (category === 'K1') {
      if (ttrInMinutes > 9 * 60) return 'L7';
      if (ttrInMinutes > 6 * 60) return 'L6';
      if (ttrInMinutes > 4 * 60) return 'L5';
      if (ttrInMinutes > 2.5 * 60) return 'L4';
      if (ttrInMinutes > 1.5 * 60) return 'L3';
      if (ttrInMinutes > 60) return 'L2';
      if (ttrInMinutes > 30) return 'L1';
    } else if (category === 'K2') {
      if (ttrInMinutes > 1.5 * 60) return 'L3';
      if (ttrInMinutes > 60) return 'L2';
      if (ttrInMinutes > 30) return 'L1';
    } else if (category === 'K3') {
      if (ttrInMinutes > 60) return 'L2';
      if (ttrInMinutes > 30) return 'L1';
    }
  
    return 'L1';
  }
  
  export function shouldCloseTicket(ticket: Ticket, existingTicket: Ticket | null): boolean {
    if (!existingTicket || existingTicket.status !== 'Completed') {
      return false;
    }
  
    const { category, TTR } = ticket;
    if (!category || !TTR) return false;
  
    const [hours, minutes, seconds] = TTR.split(':').map(Number);
    const ttrInMinutes = (hours * 60) + minutes + (seconds / 60);
  
    if (category === 'K2' && ttrInMinutes > 1.5 * 60) return true;
    if (category === 'K3' && ttrInMinutes > 60) return true;
  
    return false;
  }