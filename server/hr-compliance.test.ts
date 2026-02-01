import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock database functions
vi.mock("./db", () => ({
  getDashboardStats: vi.fn().mockResolvedValue({
    totalEmployees: 10,
    avgComplianceScore: 88,
    openAlerts: 4,
    departmentStats: [
      { departmentId: 1, departmentName: "TI", employeeCount: 2, avgCompliance: 97 },
    ],
    recentAlerts: [],
  }),
  getDepartments: vi.fn().mockResolvedValue([
    { id: 1, name: "TI", description: "Tecnologia" },
    { id: 2, name: "RH", description: "Recursos Humanos" },
  ]),
  getEmployees: vi.fn().mockResolvedValue([
    { id: 1, name: "Maria Silva", cpf: "123.456.789-00", status: "active", complianceScore: 92 },
    { id: 2, name: "João Oliveira", cpf: "234.567.890-11", status: "active", complianceScore: 88 },
  ]),
  getComplianceAlerts: vi.fn().mockResolvedValue([
    { id: 1, type: "late_arrival", severity: "high", title: "Atrasos", status: "open" },
  ]),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "admin@test.com",
    name: "Admin Test",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("HR Compliance System - Dashboard", () => {
  it("returns dashboard stats for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.dashboard.stats();

    expect(stats).toBeDefined();
    expect(stats?.totalEmployees).toBe(10);
    expect(stats?.avgComplianceScore).toBe(88);
    expect(stats?.openAlerts).toBe(4);
  });
});

describe("HR Compliance System - Departments", () => {
  it("lists departments for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const departments = await caller.departments.list();

    expect(Array.isArray(departments)).toBe(true);
    expect(departments.length).toBeGreaterThan(0);
    expect(departments[0]).toHaveProperty("name");
  });
});

describe("HR Compliance System - Employees", () => {
  it("lists employees for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const employees = await caller.employees.list();

    expect(Array.isArray(employees)).toBe(true);
    expect(employees.length).toBeGreaterThan(0);
    expect(employees[0]).toHaveProperty("name");
    expect(employees[0]).toHaveProperty("complianceScore");
  });
});

describe("HR Compliance System - Alerts", () => {
  it("lists compliance alerts for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const alerts = await caller.alerts.list();

    expect(Array.isArray(alerts)).toBe(true);
    expect(alerts[0]).toHaveProperty("type");
    expect(alerts[0]).toHaveProperty("severity");
  });
});

describe("HR Compliance System - Chatbot Placeholder", () => {
  it("returns not_implemented status for chatbot", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const status = await caller.chatbot.status();

    expect(status.status).toBe("not_implemented");
    expect(status.message).toContain("desenvolvimento");
  });
});
