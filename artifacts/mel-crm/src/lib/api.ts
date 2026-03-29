const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const API = `${BASE}/api`;

export interface Lead {
  id: string; name: string; email: string; phone: string; intent: string; status: string; source: string;
  priceMin: number; priceMax: number; neighborhoods: string; bedsMin: number; bathsMin: number;
  preApproval: string; preApprovalAmount: number; timeline: string; propertyAddress: string;
  estimatedValue: number; notes: string; nextStep: string; nextStepDate: string;
  createdAt: string; updatedAt: string;
}
export interface Task {
  id: string; title: string; type: string; leadId: string; leadName: string;
  dueDate: string; dueTime: string; priority: string; completed: boolean; notes: string; createdAt: string;
}
export interface Commission {
  id: string; leadId: string; clientName: string; propertyAddress: string; salePrice: number;
  commissionRate: number; commissionAmount: number; status: string; closeDate: string; notes: string; createdAt: string;
}
export interface CRMEvent {
  id: string; title: string; type: string; date: string; time: string; endTime: string;
  leadId: string; leadName: string; location: string; notes: string; createdAt: string;
}
export interface Todo {
  id: string; title: string; category: string; completed: boolean; dueDate: string; createdAt: string;
}
export interface CRMFile {
  id: string; name: string; category: string; url: string; notes: string; size: string; createdAt: string;
}
export interface ContentIdea {
  id: string; text: string; topic: string; pinned: boolean; createdAt: string;
}
export interface Stats {
  totalLeads: number; activeLeads: number; tasksDueToday: number; totalCommissionYTD: number; closedCommissions: number;
}
export interface AIChatContext {
  activeLeads?: string; totalLeads?: number; activeLeadCount?: number;
  overdueTasks?: string; todayTasks?: string; events?: string; leads?: Lead[];
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = localStorage.getItem("crm_token");
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  // Auth
  login: (password: string) => req<{ token: string }>("POST", "/auth/login", { password }),
  logout: () => req("POST", "/auth/logout"),
  verify: () => req<{ ok: boolean }>("GET", "/auth/verify"),

  // Core CRM
  getLeads: () => req<Lead[]>("GET", "/leads"),
  createLead: (data: Partial<Lead>) => req<Lead>("POST", "/leads", data),
  updateLead: (id: string, data: Partial<Lead>) => req<Lead>("PUT", `/leads/${id}`, data),
  deleteLead: (id: string) => req<void>("DELETE", `/leads/${id}`),

  getTasks: () => req<Task[]>("GET", "/tasks"),
  createTask: (data: Partial<Task>) => req<Task>("POST", "/tasks", data),
  updateTask: (id: string, data: Partial<Task>) => req<Task>("PUT", `/tasks/${id}`, data),
  deleteTask: (id: string) => req<void>("DELETE", `/tasks/${id}`),

  getCommissions: () => req<Commission[]>("GET", "/commissions"),
  createCommission: (data: Partial<Commission>) => req<Commission>("POST", "/commissions", data),
  updateCommission: (id: string, data: Partial<Commission>) => req<Commission>("PUT", `/commissions/${id}`, data),
  deleteCommission: (id: string) => req<void>("DELETE", `/commissions/${id}`),

  stats: () => req<Stats>("GET", "/stats"),

  // Events / Calendar
  getEvents: () => req<CRMEvent[]>("GET", "/events"),
  createEvent: (data: Partial<CRMEvent>) => req<CRMEvent>("POST", "/events", data),
  updateEvent: (id: string, data: Partial<CRMEvent>) => req<CRMEvent>("PUT", `/events/${id}`, data),
  deleteEvent: (id: string) => req<void>("DELETE", `/events/${id}`),

  // Todos
  getTodos: () => req<Todo[]>("GET", "/todos"),
  createTodo: (data: Partial<Todo>) => req<Todo>("POST", "/todos", data),
  updateTodo: (id: string, data: Partial<Todo>) => req<Todo>("PUT", `/todos/${id}`, data),
  deleteTodo: (id: string) => req<void>("DELETE", `/todos/${id}`),

  // Files
  getFiles: () => req<CRMFile[]>("GET", "/files"),
  createFile: (data: Partial<CRMFile>) => req<CRMFile>("POST", "/files", data),
  updateFile: (id: string, data: Partial<CRMFile>) => req<CRMFile>("PUT", `/files/${id}`, data),
  deleteFile: (id: string) => req<void>("DELETE", `/files/${id}`),

  // Content Ideas
  getContentIdeas: () => req<ContentIdea[]>("GET", "/content-ideas"),
  createContentIdea: (data: Partial<ContentIdea>) => req<ContentIdea>("POST", "/content-ideas", data),
  deleteContentIdea: (id: string) => req<void>("DELETE", `/content-ideas/${id}`),

  // AI
  generateContent: (topic: string) => req<{ ideas: string[] }>("POST", "/ai/content", { topic }),
  aiChat: (message: string, context: AIChatContext) => req<{ message: string; action?: string; event?: Partial<CRMEvent> }>("POST", "/ai/chat", { message, context }),
};
