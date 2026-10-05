export type Role = 'teacher' | 'approver' | 'admin' | 'security';

export interface Branch {
  id: string; // e.g. 'AT'
  name: string; // e.g. 'ช่างยนต์'
  approverUserId: string; // e.g. 'user-head-at'
  approverName: string; // e.g. 'อ.วิชัย ช่างทอง'
  color: string;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: Role;
  branchId: string;
  branchName: string;
  position: string;
  phone?: string;
  lineId?: string;
  avatar?: string;
}

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface ExitRequest {
  id: string; // e.g. 'REQ-20261005-001'
  userId: string;
  userName: string;
  branchId: string;
  branchName: string;
  position: string;
  userPhone?: string;
  
  submittedAt: string; // ISO string or Thai date
  exitDate: string; // YYYY-MM-DD
  exitTime: string; // HH:mm
  returnTime: string; // HH:mm
  destination: string;
  reason: string;
  travelMethod: string; // 'ยานพาหนะส่วนตัว' | 'รถราชการ' | 'เดินเท้า' | 'รถโดยสารสาธารณะ' | 'อื่นๆ'
  vehiclePlate?: string;
  companions?: string; // ผู้ร่วมเดินทาง
  notes?: string;

  // Substitute Teaching Duties (การสอนแทน)
  hasClasses?: boolean;
  substituteTeacherId?: string;
  substituteTeacherName?: string;
  substituteSubject?: string;
  substituteTasks?: string;
  substituteStatus?: 'not_required' | 'pending' | 'acknowledged' | 'declined';
  substituteAcknowledgedAt?: string;
  substituteDeclineReason?: string;

  // Approval Routing
  assignedApproverId: string;
  assignedApproverName: string;
  status: RequestStatus;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;

  // Gate Check
  actualExitTime?: string;
  actualReturnTime?: string;
  checkedBySecurity?: string;

  // Verification
  qrToken: string;
}

export interface ApprovalLog {
  id: string;
  requestId: string;
  requestSummary: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: 'submit' | 'approve' | 'reject' | 'cancel' | 'gate_exit' | 'gate_return' | 'substitute_ack' | 'substitute_decline';
  timestamp: string;
  comment?: string;
}

export interface SystemSettings {
  schoolName: string;
  collegeCode: string;
  logoUrl?: string;
  lineChannelAccessToken: string;
  lineChannelSecret: string;
  googleAppsScriptUrl: string;
  enableLineNotifications: boolean;
  autoSyncWithGoogleSheet: boolean;
  securityContact: string;
}

export interface LineSimulatedMessage {
  id: string;
  timestamp: string;
  recipientType: 'approver' | 'teacher';
  recipientName: string;
  recipientBranch: string;
  requestId: string;
  teacherName: string;
  exitDate: string;
  timeRange: string;
  destination: string;
  reason: string;
  status: RequestStatus;
  approverName?: string;
  rejectionReason?: string;
  actionTaken?: 'approved' | 'rejected' | 'acknowledged';
  substituteSubject?: string;
  substituteTasks?: string;
}
