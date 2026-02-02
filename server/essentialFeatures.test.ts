import { describe, it, expect } from "vitest";
import {
  calculateVacationPeriods,
  calculateVacationBalance,
  formatVacationPeriod,
} from "./vacationService";
import {
  calculateBenefitCosts,
  formatCurrency,
} from "./benefitService";
import {
  calculateChecklistProgress,
  getChecklistStatusLabel,
} from "./checklistService";
import {
  formatNotificationDate,
  getNotificationPriority,
} from "./notificationService";

describe("Vacation Service", () => {
  describe("calculateVacationPeriods", () => {
    it("should calculate acquisition period correctly", () => {
      const hireDate = new Date("2024-01-15");
      const periods = calculateVacationPeriods(hireDate);
      
      expect(periods).toBeDefined();
      expect(periods.acquisitionStart).toBeDefined();
      expect(periods.acquisitionEnd).toBeDefined();
    });

    it("should calculate concession period correctly", () => {
      const hireDate = new Date("2023-01-15");
      const periods = calculateVacationPeriods(hireDate);
      
      expect(periods.concessionStart).toBeDefined();
      expect(periods.concessionEnd).toBeDefined();
    });
  });

  describe("calculateVacationBalance", () => {
    it("should return 30 days for full year worked", () => {
      const balance = calculateVacationBalance(30, 0);
      expect(balance).toBe(30);
    });

    it("should subtract used days from balance", () => {
      const balance = calculateVacationBalance(30, 10);
      expect(balance).toBe(20);
    });

    it("should not return negative balance", () => {
      const balance = calculateVacationBalance(30, 40);
      expect(balance).toBe(0);
    });
  });

  describe("formatVacationPeriod", () => {
    it("should format date range correctly", () => {
      const start = new Date(2025, 0, 1); // Jan 1, 2025
      const end = new Date(2025, 0, 30); // Jan 30, 2025
      const formatted = formatVacationPeriod(start, end);
      
      expect(formatted).toContain("01/01/2025");
      expect(formatted).toContain("30/01/2025");
    });
  });
});

describe("Benefit Service", () => {
  describe("calculateBenefitCosts", () => {
    it("should calculate total cost correctly", () => {
      const benefits = [
        { value: 500, employeeContribution: 100 },
        { value: 300, employeeContribution: 50 },
      ];
      const costs = calculateBenefitCosts(benefits);
      
      expect(costs.totalValue).toBe(800);
      expect(costs.totalContribution).toBe(150);
      expect(costs.companyCost).toBe(650);
    });

    it("should handle empty benefits array", () => {
      const costs = calculateBenefitCosts([]);
      
      expect(costs.totalValue).toBe(0);
      expect(costs.totalContribution).toBe(0);
      expect(costs.companyCost).toBe(0);
    });
  });

  describe("formatCurrency", () => {
    it("should format currency in BRL", () => {
      const formatted = formatCurrency(1234.56);
      expect(formatted).toContain("1.234,56");
    });

    it("should handle zero value", () => {
      const formatted = formatCurrency(0);
      expect(formatted).toContain("0,00");
    });
  });
});

describe("Checklist Service", () => {
  describe("calculateChecklistProgress", () => {
    it("should calculate progress percentage correctly", () => {
      const progress = calculateChecklistProgress(5, 10);
      expect(progress).toBe(50);
    });

    it("should return 100 for completed checklist", () => {
      const progress = calculateChecklistProgress(10, 10);
      expect(progress).toBe(100);
    });

    it("should return 0 for empty checklist", () => {
      const progress = calculateChecklistProgress(0, 10);
      expect(progress).toBe(0);
    });

    it("should handle zero total items", () => {
      const progress = calculateChecklistProgress(0, 0);
      expect(progress).toBe(0);
    });
  });

  describe("getChecklistStatusLabel", () => {
    it("should return correct label for pending status", () => {
      const label = getChecklistStatusLabel("pending");
      expect(label).toBe("Pendente");
    });

    it("should return correct label for in_progress status", () => {
      const label = getChecklistStatusLabel("in_progress");
      expect(label).toBe("Em Andamento");
    });

    it("should return correct label for completed status", () => {
      const label = getChecklistStatusLabel("completed");
      expect(label).toBe("Concluído");
    });

    it("should return correct label for cancelled status", () => {
      const label = getChecklistStatusLabel("cancelled");
      expect(label).toBe("Cancelado");
    });
  });
});

describe("Notification Service", () => {
  describe("formatNotificationDate", () => {
    it("should format date correctly", () => {
      const date = new Date("2025-02-01T10:30:00");
      const formatted = formatNotificationDate(date);
      
      expect(formatted).toContain("01/02/2025");
    });

    it("should include time in format", () => {
      const date = new Date("2025-02-01T10:30:00");
      const formatted = formatNotificationDate(date);
      
      expect(formatted).toContain("10:30");
    });
  });

  describe("getNotificationPriority", () => {
    it("should return high priority for urgent types", () => {
      const priority = getNotificationPriority("vacation_expiring");
      expect(priority).toBe("high");
    });

    it("should return medium priority for normal types", () => {
      const priority = getNotificationPriority("document_pending");
      expect(priority).toBe("medium");
    });

    it("should return low priority for info types", () => {
      const priority = getNotificationPriority("checklist_completed");
      expect(priority).toBe("low");
    });
  });
});
