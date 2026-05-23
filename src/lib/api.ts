const API_BASE = '';

export async function apiFetch(path: string, options?: RequestInit) {
  const token =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('task-platform-auth') || '{}')?.state?.token
      : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ========== Auth ==========

export async function authAdminLogin(email: string, password: string) {
  return apiFetch('/api/auth/admin-login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function authEmployeeLogin(username: string, employeeCode: string, password: string) {
  return apiFetch('/api/auth/employee-login', {
    method: 'POST',
    body: JSON.stringify({ username, employeeCode, password }),
  });
}

export async function getMe() {
  return apiFetch('/api/auth/me');
}

// ========== Employees ==========

export async function getEmployees(params?: { page?: number; limit?: number; search?: string; department?: string; status?: string }) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.department) query.set('department', params.department);
  if (params?.status) query.set('status', params.status);
  const qs = query.toString();
  return apiFetch(`/api/employees${qs ? `?${qs}` : ''}`);
}

export async function getEmployee(id: string) {
  return apiFetch(`/api/employees/${id}`);
}

export async function createEmployee(data: {
  name: string;
  email: string;
  department: string;
  designation: string;
  password?: string;
  phone?: string;
}) {
  return apiFetch('/api/employees', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateEmployee(id: string, data: Record<string, unknown>) {
  return apiFetch(`/api/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteEmployee(id: string) {
  return apiFetch(`/api/employees/${id}`, {
    method: 'DELETE',
  });
}

// ========== Tasks ==========

export async function getTasks(params?: {
  page?: number;
  limit?: number;
  assignedTo?: string;
  status?: string;
  priority?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.assignedTo) query.set('assignedTo', params.assignedTo);
  if (params?.status) query.set('status', params.status);
  if (params?.priority) query.set('priority', params.priority);
  const qs = query.toString();
  return apiFetch(`/api/tasks${qs ? `?${qs}` : ''}`);
}

export async function getTask(id: string) {
  return apiFetch(`/api/tasks/${id}`);
}

export async function createTask(data: {
  title: string;
  description?: string;
  assignedTo: string;
  priority: string;
  dueDate: string;
}) {
  return apiFetch('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTask(id: string, data: Record<string, unknown>) {
  return apiFetch(`/api/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTask(id: string) {
  return apiFetch(`/api/tasks/${id}`, {
    method: 'DELETE',
  });
}

// ========== Notifications ==========

export async function getNotifications(userId?: string, userRole?: string) {
  const query = new URLSearchParams();
  if (userId) query.set('userId', userId);
  if (userRole) query.set('userRole', userRole);
  const qs = query.toString();
  return apiFetch(`/api/notifications${qs ? `?${qs}` : ''}`);
}

export async function markNotificationRead(notificationId: string) {
  return apiFetch('/api/notifications', {
    method: 'PUT',
    body: JSON.stringify({ notificationId }),
  });
}

export async function markAllNotificationsRead(userId: string, userRole: string) {
  return apiFetch('/api/notifications', {
    method: 'PUT',
    body: JSON.stringify({ markAll: true, userId, userRole }),
  });
}

// ========== Analytics ==========

export async function getAnalytics() {
  return apiFetch('/api/analytics');
}

// ========== Attendance ==========

export async function getAttendance(params?: { employeeId?: string; date?: string }) {
  const query = new URLSearchParams();
  if (params?.employeeId) query.set('employeeId', params.employeeId);
  if (params?.date) query.set('date', params.date);
  const qs = query.toString();
  return apiFetch(`/api/attendance${qs ? `?${qs}` : ''}`);
}

export async function clockIn() {
  return apiFetch('/api/attendance', {
    method: 'POST',
    body: JSON.stringify({ action: 'clock-in' }),
  });
}

export async function clockOut(attendanceId: string) {
  return apiFetch('/api/attendance', {
    method: 'PUT',
    body: JSON.stringify({ attendanceId, action: 'clock-out' }),
  });
}

// ========== Chat ==========

export async function getChatMessages(roomId: string, page?: number, limit?: number) {
  const query = new URLSearchParams();
  query.set('roomId', roomId);
  if (page) query.set('page', String(page));
  if (limit) query.set('limit', String(limit));
  return apiFetch(`/api/chat?${query.toString()}`);
}

export async function sendChatMessage(roomId: string, message: string) {
  return apiFetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ roomId, message }),
  });
}

// ========== Upload ==========

export async function uploadFile(file: File) {
  const token =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('task-platform-auth') || '{}')?.state?.token
      : null;

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}
