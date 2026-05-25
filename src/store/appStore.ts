import { create } from 'zustand';

type AdminPage = 'dashboard' | 'employees' | 'tasks' | 'analytics' | 'notifications' | 'settings' | 'attendance';
type EmployeePage = 'dashboard' | 'my-tasks' | 'calendar' | 'notifications' | 'profile' | 'settings';

interface AppState {
  currentPage: AdminPage | EmployeePage;
  sidebarOpen: boolean;
  setCurrentPage: (page: AdminPage | EmployeePage) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  currentPage: 'dashboard',
  sidebarOpen: true,
  setCurrentPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
