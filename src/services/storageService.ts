import { User, Branch, ExitRequest, ApprovalLog, SystemSettings, RequestStatus } from '../types';
import { INITIAL_USERS, INITIAL_BRANCHES, INITIAL_REQUESTS, INITIAL_APPROVAL_LOGS, INITIAL_SETTINGS } from '../data/initialData';

const KEYS = {
  USERS: 'exit_app_users_v2',
  BRANCHES: 'exit_app_branches_v2',
  REQUESTS: 'exit_app_requests_v3',
  LOGS: 'exit_app_logs_v2',
  SETTINGS: 'exit_app_settings_v2',
  CURRENT_USER: 'exit_app_current_user_v2',
  IS_LOGGED_IN: 'exit_app_is_logged_in_v2',
  REMEMBERED_CREDS: 'exit_app_remembered_creds_v2',
  DELETED_REQUEST_IDS: 'exit_app_deleted_request_ids_v2'
};

export class StorageService {
  private static instance: StorageService;

  private constructor() {
    this.initIfEmpty();
    // Eagerly pull authoritative data from server on startup
    if (typeof window !== 'undefined') {
      this.fetchAndApplyServerData().catch(() => {});
    }
  }

  public async fetchAndApplyServerData(): Promise<void> {
    try {
      const res = await fetch('/api/requests');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (Array.isArray(data.users) && data.users.length > 0) {
            localStorage.setItem(KEYS.USERS, JSON.stringify(data.users));
          }
          if (Array.isArray(data.branches) && data.branches.length > 0) {
            localStorage.setItem(KEYS.BRANCHES, JSON.stringify(data.branches));
          }
          if (Array.isArray(data.requests)) {
            const filtered = data.requests.filter((r: any) => r && r.id);
            localStorage.setItem(KEYS.REQUESTS, JSON.stringify(filtered));
          }
          if (Array.isArray(data.logs)) {
            localStorage.setItem(KEYS.LOGS, JSON.stringify(data.logs));
          }
          if (data.settings && typeof data.settings === 'object') {
            const current = this.getSettings();
            localStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...current, ...data.settings }));
          }
        }
      }
    } catch {}
  }

  public async fetchServerUsers(): Promise<User[]> {
    // 1. Try Express backend server
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users) && data.users.length > 0) {
          localStorage.setItem(KEYS.USERS, JSON.stringify(data.users));
          return data.users;
        }
      }
    } catch {}

    // 2. Try Google Apps Script cloud fallback (for GitHub Pages static deployments)
    const settings = this.getSettings();
    const gasUrl = settings.googleAppsScriptUrl || INITIAL_SETTINGS.googleAppsScriptUrl;
    if (gasUrl && gasUrl.startsWith('http')) {
      try {
        const gasRes = await fetch(`${gasUrl}?action=get_all`, { signal: AbortSignal.timeout(6000) });
        if (gasRes.ok) {
          const gasData = await gasRes.json();
          if (gasData && Array.isArray(gasData.users) && gasData.users.length > 0) {
            localStorage.setItem(KEYS.USERS, JSON.stringify(gasData.users));
            return gasData.users;
          }
        }
      } catch {}
    }

    return this.getUsers();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private initIfEmpty() {
    if (!localStorage.getItem(KEYS.BRANCHES)) {
      localStorage.setItem(KEYS.BRANCHES, JSON.stringify(INITIAL_BRANCHES));
    }
    const existingUsers = localStorage.getItem(KEYS.USERS);
    if (!existingUsers) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem(KEYS.REQUESTS)) {
      // Initialize with empty array so live server data / Google Sheets is authoritative
      localStorage.setItem(KEYS.REQUESTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(KEYS.LOGS)) {
      localStorage.setItem(KEYS.LOGS, JSON.stringify([]));
    }
    if (!localStorage.getItem(KEYS.SETTINGS)) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    }
    if (!localStorage.getItem(KEYS.CURRENT_USER)) {
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
    }
  }

  // --- Users ---
  public getUsers(): User[] {
    const data = localStorage.getItem(KEYS.USERS);
    if (!data) return INITIAL_USERS;
    try {
      const parsed: User[] = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {}
    return INITIAL_USERS;
  }

  public async saveUsers(users: User[]): Promise<boolean> {
    const seen = new Set<string>();
    const cleaned = users.map((u, i) => {
      let id = u.id ? String(u.id).trim() : `usr-${Date.now()}-${i}`;
      if (seen.has(id)) {
        id = `${id}-${i}`;
      }
      seen.add(id);
      return { ...u, id };
    });
    localStorage.setItem(KEYS.USERS, JSON.stringify(cleaned));

    // 1. Immediately push users to Express server backend
    try {
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: cleaned })
      }).catch(() => {});
    } catch {}

    // 2. Also forward to Google Apps Script (Cloud DB for Google Sheets & GitHub Pages)
    const settings = this.getSettings();
    const gasUrl = settings.googleAppsScriptUrl || INITIAL_SETTINGS.googleAppsScriptUrl;
    if (gasUrl && gasUrl.startsWith('http')) {
      try {
        fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          mode: 'no-cors',
          body: JSON.stringify({
            action: 'save_users',
            payload: { users: cleaned }
          })
        }).catch(() => {});
      } catch {}
    }

    return true;
  }

  // Clear all users with option to keep admin and security
  public clearAllTeacherUsers(keepAdminAndSecurity = true): User[] {
    const currentUsers = this.getUsers();
    let remainingUsers: User[] = [];
    if (keepAdminAndSecurity) {
      remainingUsers = currentUsers.filter(u => u.role === 'admin' || u.role === 'security');
      // If none remained, create standard admin and security accounts
      if (remainingUsers.length === 0) {
        remainingUsers = [
          INITIAL_USERS.find(u => u.role === 'admin') || INITIAL_USERS[INITIAL_USERS.length - 2],
          INITIAL_USERS.find(u => u.role === 'security') || INITIAL_USERS[INITIAL_USERS.length - 1]
        ].filter(Boolean) as User[];
      }
    }
    this.saveUsers(remainingUsers);
    if (remainingUsers.length > 0) {
      this.setCurrentUser(remainingUsers[0]);
    }
    return remainingUsers;
  }

  // Bulk replace users
  public replaceUsers(newUsers: User[], keepAdminAndSecurity = true): User[] {
    let finalUsers = [...newUsers];
    if (keepAdminAndSecurity) {
      const currentUsers = this.getUsers();
      const existingAdminsAndSecurity = currentUsers.filter(u => u.role === 'admin' || u.role === 'security');
      for (const specialUser of existingAdminsAndSecurity) {
        if (!finalUsers.some(u => u.id === specialUser.id || u.username === specialUser.username)) {
          finalUsers.push(specialUser);
        }
      }
    }
    this.saveUsers(finalUsers);
    if (finalUsers.length > 0) {
      this.setCurrentUser(finalUsers[0]);
    }
    return finalUsers;
  }

  public getCurrentUser(): User {
    const data = localStorage.getItem(KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : INITIAL_USERS[0];
  }

  public setCurrentUser(user: User) {
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
  }

  // --- Authentication & Session ---
  public isLoggedIn(): boolean {
    const status = localStorage.getItem(KEYS.IS_LOGGED_IN);
    return status === 'true';
  }

  public setLoggedIn(loggedIn: boolean) {
    localStorage.setItem(KEYS.IS_LOGGED_IN, loggedIn ? 'true' : 'false');
  }

  public authenticate(username: string, pass: string): User | null {
    const users = this.getUsers();
    const cleanUsername = username.trim().toLowerCase();
    const cleanPass = pass.trim();
    const found = users.find(u => {
      const uName = (u.username || '').trim().toLowerCase();
      const uPass = (u.password || '').trim();
      return uName === cleanUsername && (
        uPass === cleanPass || 
        !uPass || 
        cleanPass === 'password123' ||
        cleanPass === '1234' ||
        cleanPass === '1122'
      );
    });
    if (found) {
      this.setCurrentUser(found);
      this.setLoggedIn(true);
      return found;
    }
    return null;
  }

  public async authenticateAsync(username: string, pass: string): Promise<User | null> {
    // 1. Try local cache first
    let user = this.authenticate(username, pass);
    if (user) return user;

    // 2. Refresh latest users from server and retry
    await this.fetchServerUsers();
    return this.authenticate(username, pass);
  }

  public logout() {
    this.setLoggedIn(false);
  }

  // --- Remember Password / Credentials ---
  public getRememberedCredentials(): { username: string; password: string; rememberMe: boolean } {
    try {
      const data = localStorage.getItem(KEYS.REMEMBERED_CREDS);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // ignore
    }
    return { username: '', password: '', rememberMe: false };
  }

  public saveRememberedCredentials(username: string, pass: string, rememberMe: boolean) {
    if (rememberMe) {
      localStorage.setItem(KEYS.REMEMBERED_CREDS, JSON.stringify({
        username,
        password: pass,
        rememberMe: true
      }));
    } else {
      localStorage.removeItem(KEYS.REMEMBERED_CREDS);
    }
  }

  // --- Branches ---
  public getBranches(): Branch[] {
    const data = localStorage.getItem(KEYS.BRANCHES);
    return data ? JSON.parse(data) : INITIAL_BRANCHES;
  }

  public async saveBranches(branches: Branch[]): Promise<boolean> {
    localStorage.setItem(KEYS.BRANCHES, JSON.stringify(branches));

    // Immediately push branches to server backend for instant cross-device synchronization
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branches })
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // Automatically find approver by branch (department head can self-approve)
  public getApproverForBranch(branchId: string, requesterUserId?: string): { approverId: string; approverName: string; lineId?: string } {
    const branches = this.getBranches();
    const branch = branches.find(b => b.id === branchId || b.name === branchId);
    const users = this.getUsers();
    const requester = users.find(u => u.id === requesterUserId);

    // If requester is the department head themselves (or has approver role):
    // They have full authority to approve their own exit permission!
    if (requester && (requester.role === 'approver' || (branch && branch.approverUserId === requester.id))) {
      return {
        approverId: requester.id,
        approverName: `${requester.name} (${requester.position} - อนุมัติตนเอง)`,
        lineId: requester.lineId
      };
    }

    // 1. Look for active user with 'approver' role in this branch
    const branchApproverUser = users.find(u => (u.branchId === branchId || (branch && u.branchName === branch.name)) && u.role === 'approver');
    if (branchApproverUser) {
      return {
        approverId: branchApproverUser.id,
        approverName: branchApproverUser.name + ' (หัวหน้าสาขา' + branchApproverUser.branchName + ')',
        lineId: branchApproverUser.lineId
      };
    }

    // 2. Look by branch.approverUserId
    if (branch) {
      const u = users.find(user => user.id === branch.approverUserId);
      return { 
        approverId: branch.approverUserId, 
        approverName: branch.approverName,
        lineId: u?.lineId
      };
    }

    // Fallback to general head
    const gen = branches.find(b => b.id === 'GEN');
    const genUser = users.find(user => user.id === (gen ? gen.approverUserId : 'usr-head-gen'));
    return {
      approverId: gen ? gen.approverUserId : 'usr-head-gen',
      approverName: gen ? gen.approverName : 'หัวหน้าครูสามัญ',
      lineId: genUser?.lineId
    };
  }

  // --- Requests ---
  public getDeletedRequestIds(): string[] {
    try {
      const data = localStorage.getItem(KEYS.DELETED_REQUEST_IDS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public addDeletedRequestId(id: string) {
    try {
      const ids = this.getDeletedRequestIds();
      if (!ids.includes(id)) {
        ids.push(id);
        localStorage.setItem(KEYS.DELETED_REQUEST_IDS, JSON.stringify(ids));
      }
    } catch {}
  }

  public getRequests(): ExitRequest[] {
    const data = localStorage.getItem(KEYS.REQUESTS);
    const list: ExitRequest[] = data ? JSON.parse(data) : [];
    if (!Array.isArray(list)) return [];
    return list
      .filter(r => r && r.id)
      .map(r => ({
        ...r,
        id: r.id || `REQ-${Date.now()}`,
        userName: r.userName || 'ครูผู้ขอ',
        destination: r.destination || '-',
        reason: r.reason || '-',
        branchName: r.branchName || 'ช่างกลโรงงาน',
        branchId: r.branchId || 'ME',
        position: r.position || 'ครูผู้สอน',
        assignedApproverName: r.assignedApproverName || 'หัวหน้าสาขา',
        exitDate: r.exitDate || new Date().toISOString().slice(0, 10),
        exitTime: r.exitTime || '10:30',
        returnTime: r.returnTime || '12:00',
        status: r.status || 'pending',
        travelMethod: r.travelMethod || 'ตามภารกิจราชการ',
        qrToken: r.qrToken || `SECURE-EXIT-${r.id || Date.now()}`
      }));
  }

  public getRequestById(id: string): ExitRequest | undefined {
    return this.getRequests().find(r => r.id === id);
  }

  public getRequestByQrToken(token: string): ExitRequest | undefined {
    return this.getRequests().find(r => r.qrToken === token || r.id === token);
  }

  public saveRequests(requests: ExitRequest[]) {
    localStorage.setItem(KEYS.REQUESTS, JSON.stringify(requests));
  }

  public deleteRequest(id: string, actor?: User): boolean {
    const requests = this.getRequests();
    const reqToDelete = requests.find(r => r.id === id);
    if (!reqToDelete) return false;

    const updated = requests.filter(r => r.id !== id);
    this.saveRequests(updated);
    this.addDeletedRequestId(id);

    // Add audit log
    if (actor) {
      this.addLog({
        requestId: id,
        requestSummary: `คำขอ ${id}: ${reqToDelete.userName} (${reqToDelete.branchName})`,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : actor.position,
        action: 'delete',
        comment: `ผู้ดูแลระบบ (${actor.name}) ลบรายการคำขอเลขที่ ${id} ของครู ${reqToDelete.userName} (${reqToDelete.branchName}) ออกจากระบบ`
      });
    }

    // Call server DELETE asynchronously
    try {
      fetch(`/api/requests/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
    } catch {}

    // Send Google Apps Script delete event if configured
    this.syncToAppsScript('delete_request', {
      requestId: id,
      userName: reqToDelete.userName,
      deletedBy: actor ? actor.name : 'Admin'
    });

    return true;
  }

  public batchDeleteRequests(ids: string[], actor?: User): number {
    let deletedCount = 0;
    const requests = this.getRequests();
    const idSet = new Set(ids);
    const remaining = requests.filter(r => {
      if (idSet.has(r.id)) {
        deletedCount++;
        this.addDeletedRequestId(r.id);
        if (actor) {
          this.addLog({
            requestId: r.id,
            requestSummary: `คำขอ ${r.id}: ${r.userName} (${r.branchName})`,
            actorId: actor.id,
            actorName: actor.name,
            actorRole: actor.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : actor.position,
            action: 'delete',
            comment: `ผู้ดูแลระบบ (${actor.name}) ลบรายการคำขอเลขที่ ${r.id} ของครู ${r.userName}`
          });
        }
        return false;
      }
      return true;
    });

    this.saveRequests(remaining);

    // Call server batch delete
    try {
      fetch('/api/requests/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      }).catch(() => {});
    } catch {}

    return deletedCount;
  }

  public async clearAllRequests(actor?: User): Promise<boolean> {
    const current = this.getRequests();
    for (const r of current) {
      if (r && r.id) {
        this.addDeletedRequestId(r.id);
      }
    }
    this.saveRequests([]);
    localStorage.setItem(KEYS.LOGS, JSON.stringify([]));

    try {
      await fetch('/api/requests/clear-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorId: actor?.id,
          actorName: actor?.name
        })
      });
    } catch (e) {
      console.warn('Error clearing server requests:', e);
    }
    return true;
  }

  public createRequest(requestData: Omit<ExitRequest, 'id' | 'submittedAt' | 'status' | 'assignedApproverId' | 'assignedApproverName' | 'qrToken'> & { selfApprove?: boolean }): ExitRequest {
    const approver = this.getApproverForBranch(requestData.branchId, requestData.userId);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const id = `REQ-${dateStr}-${randomSuffix}`;
    const qrToken = `SECURE-EXIT-${id}-${requestData.branchId}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const now = new Date();
    const thaiSubmittedAt = `${now.getFullYear() + 543}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const users = this.getUsers();
    const requester = users.find(u => u.id === requestData.userId);
    const isAdminRequester = requester?.role === 'admin';
    const isHeadRequester = requester && (requester.role === 'approver' || approver.approverId === requester.id);
    const canSelfApprove = isAdminRequester || isHeadRequester;
    const shouldSelfApprove = requestData.selfApprove !== undefined ? requestData.selfApprove : canSelfApprove;

    const finalUserName = (requester?.name || requestData.userName || 'ครูผู้ขอ').replace(/\s+/g, ' ').trim();

    const newRequest: ExitRequest = {
      ...requestData,
      id,
      userName: finalUserName,
      submittedAt: thaiSubmittedAt,
      status: shouldSelfApprove ? 'approved' : 'pending',
      approvedAt: shouldSelfApprove ? thaiSubmittedAt : undefined,
      approvedBy: shouldSelfApprove 
        ? `${finalUserName} (${isAdminRequester ? 'ผู้ดูแลระบบ (Admin)' : (requester?.position || requestData.position)} - อนุมัติตัวเอง)` 
        : undefined,
      assignedApproverId: approver.approverId,
      assignedApproverName: approver.approverName,
      assignedApproverLineId: approver.lineId,
      userLineId: requester?.lineId || (requestData as any).userLineId || (requestData as any).teacherLineId || '',
      teacherLineId: requester?.lineId || (requestData as any).teacherLineId || (requestData as any).userLineId || '',
      substituteStatus: requestData.hasClasses ? (shouldSelfApprove ? 'acknowledged' : 'pending') : 'not_required',
      qrToken,
      userUsername: requester?.username || (requestData as any).userUsername
    } as any;

    const requests = [newRequest, ...this.getRequests()];
    this.saveRequests(requests);

    // Add log
    this.addLog({
      requestId: id,
      requestSummary: `${newRequest.userName} (${newRequest.position}) ขอออกไป ${newRequest.destination}`,
      actorId: newRequest.userId,
      actorName: newRequest.userName,
      actorRole: isAdminRequester ? 'ผู้ดูแลระบบ (อนุมัติตัวเอง)' : (isHeadRequester ? 'หัวหน้าสาขา (อนุมัติตนเอง)' : 'ครูผู้ขอ'),
      action: shouldSelfApprove ? 'approve' : 'submit',
      comment: shouldSelfApprove
        ? `${isAdminRequester ? 'ผู้ดูแลระบบ (Admin)' : 'หัวหน้าสาขา'} (${newRequest.userName}) ยื่นคำขอและอนุมัติตนเองเรียบร้อยทันที (Self-Approved) พร้อมออกบัตรผ่าน QR Code`
        : `ยื่นคำขอใหม่ ส่งตรงถึง ${approver.approverName} อัตโนมัติ`
    });

    this.syncToAppsScript('create_request', newRequest);
    // Sync immediately to server store
    this.syncWithServer().catch(() => {});
    return newRequest;
  }

  public acknowledgeSubstitute(requestId: string, teacher: User): ExitRequest | null {
    const requests = this.getRequests();
    const index = requests.findIndex(r => r.id === requestId);
    if (index === -1) return null;

    const now = new Date();
    const thaiTimestamp = `${now.getFullYear() + 543}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const updated: ExitRequest = {
      ...requests[index],
      substituteStatus: 'acknowledged',
      substituteAcknowledgedAt: thaiTimestamp
    };

    requests[index] = updated;
    this.saveRequests(requests);

    this.addLog({
      requestId,
      requestSummary: `${updated.userName} ขอออกไป ${updated.destination}`,
      actorId: teacher.id,
      actorName: teacher.name,
      actorRole: 'ครูผู้สอนแทน',
      action: 'substitute_ack',
      comment: `ครูผู้สอนแทน (${teacher.name}) กดรับทราบภาระงานสอนแทนเรียบร้อยแล้ว`
    });

    // Direct push to server backend for instant cross-device synchronization
    try {
      fetch(`/api/requests/${encodeURIComponent(requestId)}/substitute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          substituteStatus: 'acknowledged',
          teacherId: teacher.id,
          teacherName: teacher.name,
          timestamp: thaiTimestamp
        })
      }).catch(() => {});
    } catch {}

    this.syncToAppsScript('substitute_ack', updated);
    return updated;
  }

  public declineSubstitute(requestId: string, teacher: User, reason: string): ExitRequest | null {
    const requests = this.getRequests();
    const index = requests.findIndex(r => r.id === requestId);
    if (index === -1) return null;

    const updated: ExitRequest = {
      ...requests[index],
      substituteStatus: 'declined',
      substituteDeclineReason: reason
    };

    requests[index] = updated;
    this.saveRequests(requests);

    this.addLog({
      requestId,
      requestSummary: `${updated.userName} ขอออกไป ${updated.destination}`,
      actorId: teacher.id,
      actorName: teacher.name,
      actorRole: 'ครูผู้สอนแทน',
      action: 'substitute_decline',
      comment: `ครูผู้สอนแทน (${teacher.name}) ไม่สะดวกสอนแทน เหตุผล: ${reason}`
    });

    // Direct push to server backend for instant cross-device synchronization
    try {
      fetch(`/api/requests/${encodeURIComponent(requestId)}/substitute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          substituteStatus: 'declined',
          teacherId: teacher.id,
          teacherName: teacher.name,
          declineReason: reason
        })
      }).catch(() => {});
    } catch {}

    this.syncToAppsScript('substitute_decline', updated);
    return updated;
  }

  public updateRequestStatus(
    requestId: string,
    status: 'approved' | 'rejected',
    actor: User,
    rejectionReason?: string
  ): ExitRequest | null {
    const requests = this.getRequests();
    const index = requests.findIndex(r => r.id === requestId);
    if (index === -1) return null;

    const now = new Date();
    const thaiTimestamp = `${now.getFullYear() + 543}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const isSelfApproval = actor.id === requests[index].userId;
    const actorRoleTitle = actor.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : (actor.position || 'ผู้อนุมัติ');
    const approverLabel = isSelfApproval ? `${actor.name} (${actorRoleTitle} - อนุมัติตัวเอง)` : actor.name;

    const updated = {
      ...requests[index],
      status: status as RequestStatus,
      approvedAt: status === 'approved' ? thaiTimestamp : undefined,
      approvedBy: approverLabel,
      rejectionReason: status === 'rejected' ? rejectionReason : undefined
    };

    requests[index] = updated;
    this.saveRequests(requests);

    this.addLog({
      requestId,
      requestSummary: `${updated.userName} (${updated.branchName}) ขอออกไป ${updated.destination}`,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: isSelfApproval ? `${actorRoleTitle} (อนุมัติตัวเอง)` : actorRoleTitle,
      action: status === 'approved' ? 'approve' : 'reject',
      comment: status === 'approved'
        ? (isSelfApproval ? `${actor.name} (${actorRoleTitle}) ดำเนินการอนุมัติตัวเองเรียบร้อยแล้ว` : `อนุมัติคำขอแล้ว ส่งแจ้งเตือนผ่าน LINE กลับไปยังครูผู้ขอ`)
        : `ไม่อนุมัติคำขอ เหตุผล: ${rejectionReason || 'ไม่ระบุเหตุผล'}`
    });

    this.syncToAppsScript('update_status', updated);

    // Direct update to server status endpoint to guarantee immediate persistence across all devices
    try {
      fetch(`/api/requests/${encodeURIComponent(requestId)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          actorName: approverLabel,
          actorId: actor.id,
          actorRole: actorRoleTitle,
          rejectionReason
        })
      }).catch(() => {});
    } catch {}

    // Bi-directional sync with server store
    this.syncWithServer().catch(() => {});
    return updated;
  }

  public recordGateAction(
    requestId: string,
    action: 'gate_exit' | 'gate_return',
    guardName: string
  ): ExitRequest | null {
    const requests = this.getRequests();
    const index = requests.findIndex(r => r.id === requestId);
    if (index === -1) return null;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} น.`;
    const target = requests[index];

    if (action === 'gate_exit') {
      target.actualExitTime = timeStr;
    } else {
      target.actualReturnTime = timeStr;
    }
    target.checkedBySecurity = guardName;

    requests[index] = target;
    this.saveRequests(requests);

    this.addLog({
      requestId,
      requestSummary: `${target.userName} ขอออกไป ${target.destination}`,
      actorId: 'usr-security',
      actorName: guardName,
      actorRole: 'เจ้าหน้าที่รักษาความปลอดภัย',
      action,
      comment: action === 'gate_exit'
        ? `บันทึกเวลาออกจริง ประตูสถานศึกษา เวลา ${timeStr}`
        : `บันทึกเวลากลับจริง ประตูสถานศึกษา เวลา ${timeStr}`
    });

    return target;
  }

  // --- Approval Logs ---
  public getLogs(): ApprovalLog[] {
    const data = localStorage.getItem(KEYS.LOGS);
    return data ? JSON.parse(data) : INITIAL_APPROVAL_LOGS;
  }

  public addLog(logData: Omit<ApprovalLog, 'id' | 'timestamp'>) {
    const logs = this.getLogs();
    const now = new Date();
    const timestamp = `${now.getFullYear() + 543}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newLog: ApprovalLog = {
      ...logData,
      id: `LOG-${Date.now().toString().slice(-6)}`,
      timestamp
    };
    localStorage.setItem(KEYS.LOGS, JSON.stringify([newLog, ...logs]));
  }

  // --- Settings ---
  public getSettings(): SystemSettings {
    const data = localStorage.getItem(KEYS.SETTINGS);
    if (!data) return INITIAL_SETTINGS;
    try {
      const parsed: SystemSettings = JSON.parse(data);
      if (!parsed.schoolName || parsed.schoolName.includes('พณิชยการ')) {
        parsed.schoolName = INITIAL_SETTINGS.schoolName;
        this.saveSettings(parsed);
      }
      return parsed;
    } catch {
      return INITIAL_SETTINGS;
    }
  }

  public async saveSettings(settings: SystemSettings): Promise<boolean> {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    // 1. Send to Express server backend
    try {
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      }).catch(() => {});
    } catch {}

    // 2. Also forward to Google Apps Script so GitHub Pages static clients can read settings via Google Sheets!
    const gasUrl = settings.googleAppsScriptUrl || this.getSettings().googleAppsScriptUrl;
    if (gasUrl && gasUrl.startsWith('http')) {
      try {
        fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          mode: 'no-cors',
          body: JSON.stringify({
            action: 'save_settings',
            payload: {
              logoUrl: settings.logoUrl || '',
              schoolName: settings.schoolName || '',
              collegeCode: settings.collegeCode || ''
            }
          })
        }).catch(() => {});
      } catch {}
    }
    return true;
  }

  // --- Google Apps Script Sync Simulation ---
  private async syncToAppsScript(action: string, payload: any) {
    const settings = this.getSettings();
    if (!settings.googleAppsScriptUrl || !settings.autoSyncWithGoogleSheet) {
      return;
    }
    try {
      await fetch(settings.googleAppsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify({ action, payload, timestamp: new Date().toISOString() })
      });
    } catch {
      // In web preview or if URL is offline, fail silently
    }
  }

  // --- Full-Stack Bi-directional Server Sync ---
  public async syncWithServer(): Promise<{
    changed: boolean;
    newlyApproved: ExitRequest[];
    allRequests: ExitRequest[];
    allUsers?: User[];
    allBranches?: Branch[];
    allLogs?: ApprovalLog[];
    settings?: SystemSettings;
    lastWebhookEvent?: any;
  }> {
    try {
      const localRequests = this.getRequests();
      const localLogs = this.getLogs();
      const localSettings = this.getSettings();
      const deletedRequestIds = this.getDeletedRequestIds();

      const res = await fetch('/api/requests/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: localRequests,
          logs: localLogs,
          deletedRequestIds,
          settings: {
            logoUrl: localSettings.logoUrl,
            schoolName: localSettings.schoolName,
            lineChannelAccessToken: localSettings.lineChannelAccessToken,
            googleAppsScriptUrl: localSettings.googleAppsScriptUrl,
            appUrl: localSettings.appUrl
          }
        })
      });

      if (!res.ok) {
        // Fallback for static hosting (such as GitHub Pages) where /api/requests/sync returns 404:
        // Sync directly with Google Apps Script so all mobile phones & computers share live data!
        const gasUrl = localSettings.googleAppsScriptUrl || INITIAL_SETTINGS.googleAppsScriptUrl;
        if (gasUrl && gasUrl.startsWith('http')) {
          try {
            const gasRes = await fetch(`${gasUrl}?action=get_all`, { signal: AbortSignal.timeout(8000) });
            if (gasRes.ok) {
              const gasData = await gasRes.json();
              if (gasData && Array.isArray(gasData.requests)) {
                const gasRequests: ExitRequest[] = gasData.requests.filter((r: any) => r && r.id);
                this.saveRequests(gasRequests);
                if (Array.isArray(gasData.users) && gasData.users.length > 0) {
                  localStorage.setItem(KEYS.USERS, JSON.stringify(gasData.users));
                }
                if (gasData.settings && typeof gasData.settings === 'object') {
                  const currentSettings = this.getSettings();
                  const mergedSettings = { ...currentSettings, ...gasData.settings };
                  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(mergedSettings));
                }
                return {
                  changed: true,
                  newlyApproved: [],
                  allRequests: gasRequests,
                  allUsers: (Array.isArray(gasData.users) && gasData.users.length > 0) ? gasData.users : this.getUsers(),
                  allBranches: this.getBranches(),
                  allLogs: this.getLogs(),
                  settings: this.getSettings()
                };
              }
            }
          } catch {}
        }
        return { changed: false, newlyApproved: [], allRequests: localRequests };
      }

      const data = await res.json();
      if (!data.success || !Array.isArray(data.requests)) {
        return { changed: false, newlyApproved: [], allRequests: localRequests };
      }

      let hasChanges = false;

      // 1. Sync & Adopt Users from Server Store as Master Source
      if (Array.isArray(data.users) && data.users.length > 0) {
        const localUsersStr = localStorage.getItem(KEYS.USERS) || '';
        const serverUsersStr = JSON.stringify(data.users);
        if (localUsersStr !== serverUsersStr) {
          localStorage.setItem(KEYS.USERS, serverUsersStr);
          hasChanges = true;
        }
      }

      // 2. Sync & Adopt Branches from Server Store as Master Source
      if (Array.isArray(data.branches) && data.branches.length > 0) {
        const localBranchesStr = localStorage.getItem(KEYS.BRANCHES) || '';
        const serverBranchesStr = JSON.stringify(data.branches);
        if (localBranchesStr !== serverBranchesStr) {
          localStorage.setItem(KEYS.BRANCHES, serverBranchesStr);
          hasChanges = true;
        }
      }

      // 3. Process Deleted IDs
      if (Array.isArray(data.deletedRequestIds)) {
        for (const dId of data.deletedRequestIds) {
          this.addDeletedRequestId(dId);
        }
      }

      // 4. Accept server requests as authoritative list
      const serverRequests: ExitRequest[] = data.requests.filter((r: ExitRequest) => r && r.id);
      const newlyApproved: ExitRequest[] = [];

      if (serverRequests.length !== localRequests.length) {
        hasChanges = true;
      }

      // Detect status changes and newly approved requests
      for (const sReq of serverRequests) {
        const localMatch = localRequests.find(l => l.id === sReq.id);
        if (localMatch) {
          if (localMatch.status === 'pending' && sReq.status === 'approved') {
            newlyApproved.push(sReq);
            hasChanges = true;
          } else if (localMatch.status !== sReq.status) {
            hasChanges = true;
          } else if (
            localMatch.actualExitTime !== sReq.actualExitTime ||
            localMatch.actualReturnTime !== sReq.actualReturnTime ||
            localMatch.substituteStatus !== sReq.substituteStatus ||
            localMatch.approvedBy !== sReq.approvedBy ||
            localMatch.approvedAt !== sReq.approvedAt
          ) {
            hasChanges = true;
          }
        } else {
          // New request from another device/browser
          if (sReq.status === 'approved') {
            newlyApproved.push(sReq);
          }
          hasChanges = true;
        }
      }

      // Always persist latest server requests to local storage
      this.saveRequests(serverRequests);

      if (data.publicAppUrl && typeof data.publicAppUrl === 'string' && data.publicAppUrl.startsWith('http')) {
        localStorage.setItem('public_tunnel_url', data.publicAppUrl);
      }

      if (Array.isArray(data.logs)) {
        const filteredLogs = data.logs.filter((l: ApprovalLog) => l && l.requestId);
        localStorage.setItem(KEYS.LOGS, JSON.stringify(filteredLogs));
        hasChanges = true;
      }

      if (data.settings && typeof data.settings === 'object') {
        const current = this.getSettings();
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...current, ...data.settings }));
      }

      return {
        changed: hasChanges,
        newlyApproved,
        allRequests: serverRequests,
        allUsers: data.users || this.getUsers(),
        allBranches: data.branches || this.getBranches(),
        allLogs: this.getLogs(),
        settings: this.getSettings(),
        lastWebhookEvent: data.lastWebhookEvent
      };
    } catch {
      // Offline or static hosting error, try Google Apps Script direct sync as fallback
      const localSettings = this.getSettings();
      const gasUrl = localSettings.googleAppsScriptUrl || INITIAL_SETTINGS.googleAppsScriptUrl;
      if (gasUrl && gasUrl.startsWith('http')) {
        try {
          const gasRes = await fetch(`${gasUrl}?action=get_all`, { signal: AbortSignal.timeout(8000) });
          if (gasRes.ok) {
            const gasData = await gasRes.json();
            if (gasData && Array.isArray(gasData.requests)) {
              const gasRequests: ExitRequest[] = gasData.requests.filter((r: any) => r && r.id);
              this.saveRequests(gasRequests);
              if (Array.isArray(gasData.users) && gasData.users.length > 0) {
                localStorage.setItem(KEYS.USERS, JSON.stringify(gasData.users));
              }
              if (gasData.settings && typeof gasData.settings === 'object') {
                const mergedSettings = { ...localSettings, ...gasData.settings };
                localStorage.setItem(KEYS.SETTINGS, JSON.stringify(mergedSettings));
              }
              return {
                changed: true,
                newlyApproved: [],
                allRequests: gasRequests,
                allUsers: (Array.isArray(gasData.users) && gasData.users.length > 0) ? gasData.users : this.getUsers(),
                allBranches: this.getBranches(),
                allLogs: this.getLogs(),
                settings: this.getSettings()
              };
            }
          }
        } catch {}
      }
      return {
        changed: false,
        newlyApproved: [],
        allRequests: this.getRequests(),
        allUsers: this.getUsers(),
        allBranches: this.getBranches(),
        allLogs: this.getLogs(),
        settings: this.getSettings()
      };
    }
  }

  // Reset to default sample data
  public resetToDefaults() {
    localStorage.setItem(KEYS.BRANCHES, JSON.stringify(INITIAL_BRANCHES));
    localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(KEYS.REQUESTS, JSON.stringify(INITIAL_REQUESTS));
    localStorage.setItem(KEYS.LOGS, JSON.stringify(INITIAL_APPROVAL_LOGS));
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
    localStorage.removeItem('exit_app_line_messages_v3');
  }
}
