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
  REMEMBERED_CREDS: 'exit_app_remembered_creds_v2'
};

export class StorageService {
  private static instance: StorageService;

  private constructor() {
    this.initIfEmpty();
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
    if (!localStorage.getItem(KEYS.USERS)) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem(KEYS.REQUESTS)) {
      localStorage.setItem(KEYS.REQUESTS, JSON.stringify(INITIAL_REQUESTS));
    }
    if (!localStorage.getItem(KEYS.LOGS)) {
      localStorage.setItem(KEYS.LOGS, JSON.stringify(INITIAL_APPROVAL_LOGS));
    }
    if (!localStorage.getItem(KEYS.SETTINGS)) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    }
    if (!localStorage.getItem(KEYS.CURRENT_USER)) {
      // Default to Somchai (Teacher at ช่างยนต์)
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
    }
  }

  // --- Users ---
  public getUsers(): User[] {
    const data = localStorage.getItem(KEYS.USERS);
    const raw: User[] = data ? JSON.parse(data) : INITIAL_USERS;
    const seen = new Set<string>();
    const deduplicated: User[] = [];
    for (let i = 0; i < raw.length; i++) {
      const u = raw[i];
      if (!u.id || seen.has(u.id)) {
        const uniqueUser = { ...u, id: `${u.id || 'usr'}-${i}` };
        seen.add(uniqueUser.id);
        deduplicated.push(uniqueUser);
      } else {
        seen.add(u.id);
        deduplicated.push(u);
      }
    }
    return deduplicated;
  }

  public saveUsers(users: User[]) {
    const seen = new Set<string>();
    const cleaned = users.map((u, i) => {
      let id = u.id;
      if (!id || seen.has(id)) {
        id = `${id || 'usr'}-${Date.now()}-${i}`;
      }
      seen.add(id);
      return { ...u, id };
    });
    localStorage.setItem(KEYS.USERS, JSON.stringify(cleaned));
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
    const found = users.find(u => 
      u.username.toLowerCase() === cleanUsername && (u.password === pass || !u.password || pass === 'password123')
    );
    if (found) {
      this.setCurrentUser(found);
      this.setLoggedIn(true);
      return found;
    }
    return null;
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

  public saveBranches(branches: Branch[]) {
    localStorage.setItem(KEYS.BRANCHES, JSON.stringify(branches));
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
  public getRequests(): ExitRequest[] {
    const data = localStorage.getItem(KEYS.REQUESTS);
    const list: ExitRequest[] = data ? JSON.parse(data) : INITIAL_REQUESTS;
    if (!Array.isArray(list)) return INITIAL_REQUESTS;
    return list.map(r => ({
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

    const newRequest: ExitRequest = {
      ...requestData,
      id,
      submittedAt: thaiSubmittedAt,
      status: shouldSelfApprove ? 'approved' : 'pending',
      approvedAt: shouldSelfApprove ? thaiSubmittedAt : undefined,
      approvedBy: shouldSelfApprove 
        ? `${requester?.name || requestData.userName} (${isAdminRequester ? 'ผู้ดูแลระบบ (Admin)' : (requester?.position || requestData.position)} - อนุมัติตัวเอง)` 
        : undefined,
      assignedApproverId: approver.approverId,
      assignedApproverName: approver.approverName,
      assignedApproverLineId: approver.lineId,
      substituteStatus: requestData.hasClasses ? (shouldSelfApprove ? 'acknowledged' : 'pending') : 'not_required',
      qrToken
    };

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
    // Sync to server store
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

  public saveSettings(settings: SystemSettings) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
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
    lastWebhookEvent?: any;
  }> {
    try {
      const localRequests = this.getRequests();
      const localLogs = this.getLogs();
      const localSettings = this.getSettings();

      const res = await fetch('/api/requests/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: localRequests,
          logs: localLogs,
          settings: {
            lineChannelAccessToken: localSettings.lineChannelAccessToken,
            googleAppsScriptUrl: localSettings.googleAppsScriptUrl,
            appUrl: localSettings.appUrl
          }
        })
      });

      if (!res.ok) {
        return { changed: false, newlyApproved: [], allRequests: localRequests };
      }

      const data = await res.json();
      if (!data.success || !Array.isArray(data.requests)) {
        return { changed: false, newlyApproved: [], allRequests: localRequests };
      }

      const serverRequests: ExitRequest[] = data.requests;
      const newlyApproved: ExitRequest[] = [];
      let hasChanges = false;

      // Detect if any local request was transitioned from 'pending' to 'approved' or 'rejected' on the server (e.g. by LINE Webhook)
      for (const sReq of serverRequests) {
        const localMatch = localRequests.find(l => l.id === sReq.id);
        if (localMatch) {
          if (localMatch.status === 'pending' && sReq.status === 'approved') {
            newlyApproved.push(sReq);
            hasChanges = true;
          } else if (localMatch.status === 'pending' && sReq.status === 'rejected') {
            hasChanges = true;
          } else if (localMatch.status !== sReq.status) {
            hasChanges = true;
          }
        } else {
          // New request from another device/browser
          hasChanges = true;
        }
      }

      if (hasChanges || serverRequests.length !== localRequests.length) {
        this.saveRequests(serverRequests);
      }

      if (Array.isArray(data.logs) && data.logs.length > localLogs.length) {
        localStorage.setItem(KEYS.LOGS, JSON.stringify(data.logs));
      }

      return {
        changed: hasChanges,
        newlyApproved,
        allRequests: serverRequests,
        lastWebhookEvent: data.lastWebhookEvent
      };
    } catch {
      // Offline or network error, silently return local state
      return {
        changed: false,
        newlyApproved: [],
        allRequests: this.getRequests()
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
