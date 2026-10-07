import React, { useState, useEffect } from 'react';
import { User, Branch, ExitRequest, ApprovalLog, SystemSettings } from '../types';
import { StorageService } from '../services/storageService';
import { DonBoscoLogo } from './DonBoscoLogo';
import { 
  Shield, 
  Users, 
  Building2, 
  FileText, 
  FileSpreadsheet, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Settings, 
  History, 
  CheckCircle,
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus, 
  Edit3, 
  Trash2,
  ExternalLink,
  Save,
  RefreshCw,
  QrCode,
  UploadCloud,
  FileUp,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Check,
  Copy,
  UserMinus,
  UserPlus,
  ListPlus,
  User as UserIcon,
  Calendar,
  MapPin,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageSquare,
  Send,
  Key,
  Bot,
  Smartphone,
  HelpCircle
} from 'lucide-react';
import { LineService } from '../services/lineService';

interface AdminPortalProps {
  currentUser: User;
  users: User[];
  branches: Branch[];
  requests: ExitRequest[];
  logs: ApprovalLog[];
  settings: SystemSettings;
  onUpdateUsers: (users: User[]) => void;
  onUpdateBranches: (branches: Branch[]) => void;
  onUpdateSettings: (settings: SystemSettings) => void;
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string, reason: string) => void;
  onDeleteRequest?: (requestId: string) => void;
  onBatchDeleteRequests?: (requestIds: string[]) => void;
  onPrintSlip: (req: ExitRequest) => void;
  onViewQrPass: (req: ExitRequest) => void;
  onOpenSheetsModal: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentUser,
  users,
  branches,
  requests,
  logs,
  settings,
  onUpdateUsers,
  onUpdateBranches,
  onUpdateSettings,
  onApprove,
  onReject,
  onDeleteRequest,
  onBatchDeleteRequests,
  onPrintSlip,
  onViewQrPass,
  onOpenSheetsModal
}) => {
  // Tabs: 'requests' | 'users' | 'branches' | 'logs' | 'settings'
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'branches' | 'logs' | 'settings'>('requests');

  // Search & Filter state for Requests
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Rejection dialog state for Admin
  const [rejectingAdminReq, setRejectingAdminReq] = useState<ExitRequest | null>(null);
  const [adminRejectReason, setAdminRejectReason] = useState('');

  // Request Deletion state for Admin
  const [requestToDelete, setRequestToDelete] = useState<ExitRequest | null>(null);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Settings local state
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);
  const [settingsSavedAlert, setSettingsSavedAlert] = useState(false);

  // New User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({
    name: '',
    username: '',
    password: 'password123',
    role: 'teacher',
    branchId: 'AT',
    branchName: 'ช่างยนต์',
    position: 'ครู',
    lineId: ''
  });

  // User Search & Filters
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userBranchFilter, setUserBranchFilter] = useState('all');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState<User | null>(null);

  // Delete User State (Modal-based - 100% reliable inside iframes)
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Bulk Import State
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkInputText, setBulkInputText] = useState('');
  const [bulkDefaultBranch, setBulkDefaultBranch] = useState(branches[0]?.id || 'ME');
  const [bulkMode, setBulkMode] = useState<'replace' | 'append'>('append');
  const [bulkKeepAdminAndSecurity, setBulkKeepAdminAndSecurity] = useState(true);
  const [bulkFeedback, setBulkFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Clear Users Confirmation State
  const [showClearUsersModal, setShowClearUsersModal] = useState(false);
  const [clearKeepAdminAndSecurity, setClearKeepAdminAndSecurity] = useState(true);

  // LINE Push Notification Testing States
  const [testLineUser, setTestLineUser] = useState<User | null>(null);
  const [testLineStatus, setTestLineStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
    code?: string;
  } | null>(null);
  const [tokenInputForTest, setTokenInputForTest] = useState('');
  const [verifyTokenLoading, setVerifyTokenLoading] = useState(false);
  const [botInfo, setBotInfo] = useState<{
    displayName: string;
    basicId: string;
    pictureUrl?: string;
  } | null>(null);

  // Webhook Monitor and Simulator State
  const [webhookInfo, setWebhookInfo] = useState<{
    totalEvents: number;
    lastEvent?: any;
    loading: boolean;
    publicWebhookUrl?: string;
  }>({ totalEvents: 0, loading: false });

  const [simulateReqId, setSimulateReqId] = useState<string>('');
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [simulateResult, setSimulateResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchWebhookStatus = async () => {
    try {
      setWebhookInfo(prev => ({ ...prev, loading: true }));
      const res = await fetch('/api/webhook/status');
      if (res.ok) {
        const data = await res.json();
        setWebhookInfo({
          totalEvents: data.totalWebhooksReceived || 0,
          lastEvent: data.lastWebhookEvent,
          publicWebhookUrl: data.publicWebhookUrl,
          loading: false
        });
      }
    } catch {
      setWebhookInfo(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (activeTab === 'settings') {
      fetchWebhookStatus();
    }
  }, [activeTab]);

  const handleSimulateWebhookApprove = async (targetId?: string) => {
    const idToUse = targetId || simulateReqId;
    if (!idToUse) {
      alert('กรุณาเลือกหรือระบุรหัสคำขอที่ต้องการทดสอบ');
      return;
    }
    setSimulateLoading(true);
    setSimulateResult(null);
    try {
      const res = await fetch('/api/webhook/test-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reqId: idToUse, action: 'approve' })
      });
      const data = await res.json();
      if (data.success) {
        setSimulateResult({ success: true, message: data.message });
        await StorageService.getInstance().syncWithServer();
        if (onApprove) {
          onApprove(idToUse);
        }
        fetchWebhookStatus();
      } else {
        setSimulateResult({ success: false, message: data.error || 'เกิดข้อผิดพลาดในการจำลอง' });
      }
    } catch (err: any) {
      setSimulateResult({ success: false, message: 'เกิดข้อผิดพลาด: ' + (err.message || String(err)) });
    } finally {
      setSimulateLoading(false);
    }
  };

  const handleOpenTestLine = (user: User) => {
    setTestLineUser(user);
    setTestLineStatus(null);
    const curToken = localSettings.lineChannelAccessToken;
    setTokenInputForTest(curToken && !curToken.startsWith('MOCK_') ? curToken : '');
  };

  const handleExecuteLineTest = async (lineId: string, name: string, overrideToken?: string) => {
    setTestLineStatus({ loading: true });
    const tokenToUse = overrideToken !== undefined ? overrideToken : localSettings.lineChannelAccessToken;
    const res = await LineService.getInstance().testSendNotification(lineId, name, tokenToUse);
    setTestLineStatus({
      loading: false,
      success: res.success,
      message: res.message,
      code: (res as any).code
    });
  };

  const handleVerifyLineBot = async () => {
    const token = localSettings.lineChannelAccessToken;
    if (!token || token.startsWith('MOCK_') || token.includes('ใส่_TOKEN')) {
      alert('กรุณากรอก LINE Channel Access Token จริงจาก LINE Developers Console ก่อนทำการตรวจสอบ');
      return;
    }
    setVerifyTokenLoading(true);
    try {
      const res = await LineService.getInstance().verifyToken(token);
      if (res.success && res.bot) {
        setBotInfo(res.bot);
      } else {
        setBotInfo(null);
        alert('ตรวจสอบไม่ผ่าน: ' + (res.error || 'Token ไม่ถูกต้องหรือติดต่อ LINE API ไม่ได้'));
      }
    } finally {
      setVerifyTokenLoading(false);
    }
  };

  // Parse bulk user text lines
  const parseBulkUsersText = (text: string, defaultBranchId: string): User[] => {
    if (!text || !text.trim()) return [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const defaultAvatars = [
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    ];

    return lines.map((line, idx) => {
      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t').map(p => p.trim());
      } else if (line.includes(',')) {
        parts = line.split(',').map(p => p.trim());
      } else if (line.includes(';')) {
        parts = line.split(';').map(p => p.trim());
      } else if (line.includes('|')) {
        parts = line.split('|').map(p => p.trim());
      } else {
        const cleanSingle = line.replace(/^\d+[\.\)\s\-]+/, '').trim();
        parts = [cleanSingle];
      }

      let rawName = (parts[0] || `ครูท่านที่ ${idx + 1}`).replace(/^\d+[\.\)\s\-]+/, '').trim();
      let rawBranch = parts[1] || '';
      let rawPos = parts[2] || '';
      let rawPhone = parts[3] || '';
      let rawLine = parts[4] || '';

      // Match branch
      let targetBranch = branches.find(b => 
        (rawBranch && (b.id.toLowerCase() === rawBranch.toLowerCase() || b.name.includes(rawBranch))) ||
        rawName.includes(b.name) ||
        rawPos.includes(b.name)
      );
      if (!targetBranch) {
        targetBranch = branches.find(b => b.id === defaultBranchId) || branches[0];
      }

      // Role determination
      let role: 'teacher' | 'approver' | 'admin' | 'security' = 'teacher';
      if (rawName.includes('หัวหน้า') || rawPos.includes('หัวหน้า') || rawBranch.includes('หัวหน้า')) {
        role = 'approver';
      } else if (rawName.includes('ผอ.') || rawName.includes('ผู้อำนวยการ') || rawPos.includes('รอง ผอ.')) {
        role = 'admin';
      } else if (rawName.includes('รปภ.') || rawPos.includes('รปภ.') || rawName.includes('ยาม')) {
        role = 'security';
      }

      // Default position
      if (!rawPos) {
        if (role === 'approver') rawPos = `หัวหน้าสาขา${targetBranch?.name || ''}`;
        else if (role === 'admin') rawPos = 'ผู้บริหารสถานศึกษา';
        else if (role === 'security') rawPos = 'เจ้าหน้าที่รักษาความปลอดภัย';
        else rawPos = 'ครูผู้สอน';
      }

      const uniqueSuffix = `${Date.now().toString().slice(-4)}${idx + 1}`;
      const generatedUsername = `teacher_${uniqueSuffix}`;

      return {
        id: `usr-import-${uniqueSuffix}`,
        username: generatedUsername,
        password: 'password123',
        name: rawName,
        role,
        branchId: targetBranch?.id || 'AT',
        branchName: targetBranch?.name || 'ช่างยนต์',
        position: rawPos,
        lineId: rawLine || `U_LINE_${uniqueSuffix}`
      };
    });
  };

  // Parsed users in real time
  const parsedPreviewUsers = parseBulkUsersText(bulkInputText, bulkDefaultBranch);

  // Filter requests
  const filteredRequests = requests.filter(r => {
    if (!r) return false;
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      (r.userName || '').toLowerCase().includes(search) ||
      (r.destination || '').toLowerCase().includes(search) ||
      (r.reason || '').toLowerCase().includes(search) ||
      (r.id || '').toLowerCase().includes(search);
    const matchesBranch = branchFilter === 'all' || r.branchId === branchFilter || r.branchName === branchFilter;
    
    let matchesStatus = true;
    if (statusFilter === 'exited') {
      matchesStatus = Boolean(r.actualExitTime && !r.actualReturnTime);
    } else if (statusFilter === 'returned') {
      matchesStatus = Boolean(r.actualReturnTime);
    } else if (statusFilter !== 'all') {
      matchesStatus = r.status === statusFilter;
    }

    const matchesDate = !dateFilter || r.exitDate === dateFilter;
    return matchesSearch && matchesBranch && matchesStatus && matchesDate;
  });

  // Handle single request deletion
  const handleSingleDelete = () => {
    if (!requestToDelete) return;
    setIsDeleting(true);
    try {
      if (onDeleteRequest) {
        onDeleteRequest(requestToDelete.id);
      } else {
        StorageService.getInstance().deleteRequest(requestToDelete.id, currentUser);
      }
      setSelectedRequestIds(prev => prev.filter(id => id !== requestToDelete.id));
      setRequestToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle batch deletion
  const handleBatchDelete = () => {
    if (selectedRequestIds.length === 0) return;
    setIsDeleting(true);
    try {
      if (onBatchDeleteRequests) {
        onBatchDeleteRequests(selectedRequestIds);
      } else {
        StorageService.getInstance().batchDeleteRequests(selectedRequestIds, currentUser);
      }
      setSelectedRequestIds([]);
      setShowBatchDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle select all requests in current filtered view
  const handleToggleSelectAll = () => {
    if (filteredRequests.length > 0 && selectedRequestIds.length === filteredRequests.length) {
      setSelectedRequestIds([]);
    } else {
      setSelectedRequestIds(filteredRequests.map(r => r.id));
    }
  };

  // Toggle single request selection
  const handleToggleSelectOne = (id: string) => {
    setSelectedRequestIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Export Requests to CSV
  const handleExportCSV = () => {
    const headers = [
      'RequestID',
      'วันที่ยื่น',
      'ชื่อผู้ขอ',
      'สาขาวิชา',
      'วันที่ออก',
      'เวลาออก',
      'เวลากลับ',
      'สถานที่',
      'เหตุผล',
      'ผู้อนุมัติ',
      'สถานะ',
      'วันที่อนุมัติ',
      'ยานพาหนะ',
      'ทะเบียนรถ',
      'เวลาออกจริง',
      'เวลากลับจริง'
    ];

    const rows = filteredRequests.map(r => [
      r.id || '',
      r.submittedAt || '',
      r.userName || '',
      r.branchName || '',
      r.exitDate || '',
      r.exitTime || '',
      r.returnTime || '',
      `"${(r.destination || '').replace(/"/g, '""')}"`,
      `"${(r.reason || '').replace(/"/g, '""')}"`,
      `"${(r.assignedApproverName || '').replace(/"/g, '""')}"`,
      r.status || '',
      r.approvedAt || '',
      r.travelMethod || '',
      r.vehiclePlate || '',
      r.actualExitTime || '',
      r.actualReturnTime || ''
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `รายงานการออกนอกสถานศึกษา_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add user handler
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.username) return;

    const branch = branches.find(b => b.id === newUser.branchId);
    const fullUser: User = {
      id: `usr-${Date.now().toString().slice(-6)}`,
      username: newUser.username!,
      password: newUser.password || 'password123',
      name: newUser.name!,
      role: newUser.role as any,
      branchId: newUser.branchId || 'GEN',
      branchName: branch ? branch.name : 'ครูสามัญ',
      position: newUser.position || 'ครู',
      lineId: newUser.lineId || `U_${newUser.username?.toUpperCase()}`
    };

    onUpdateUsers([fullUser, ...users]);
    setShowAddUserModal(false);
    setNewUser({
      name: '',
      username: '',
      password: 'password123',
      role: 'teacher',
      branchId: 'AT',
      branchName: 'ช่างยนต์',
      position: 'ครู',
      lineId: ''
    });
  };

  // Start Editing a User
  const handleStartEditUser = (user: User) => {
    setEditingUser(user);
    setEditFormData({ ...user });
  };

  // Save Edited User
  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData || !editFormData.name.trim()) return;

    const targetBranch = branches.find(b => b.id === editFormData.branchId) || { id: editFormData.branchId, name: editFormData.branchName };
    const updatedUser: User = {
      ...editFormData,
      name: editFormData.name.trim(),
      username: (editFormData.username || `user_${Date.now().toString().slice(-4)}`).trim(),
      branchId: targetBranch.id,
      branchName: targetBranch.name,
      position: (editFormData.position || 'ครูผู้สอน').trim(),
      lineId: (editFormData.lineId || '-').trim()
    };

    const updatedUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    onUpdateUsers(updatedUsers);

    // If role is approver, sync with branch approver
    if (updatedUser.role === 'approver') {
      const updatedBranches = branches.map(b => {
        if (b.id === updatedUser.branchId) {
          return {
            ...b,
            approverUserId: updatedUser.id,
            approverName: `${updatedUser.name} (${updatedUser.position})`
          };
        }
        return b;
      });
      onUpdateBranches(updatedBranches);
    }

    setEditingUser(null);
    setEditFormData(null);
  };

  // Delete user (triggers in-app modal, works 100% reliably in all iframe environments)
  const handleDeleteUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      setUserToDelete(target);
    }
  };

  // Clear all users (with option to keep admin and security)
  const handleConfirmClearUsers = () => {
    let remainingUsers: User[] = [];
    if (clearKeepAdminAndSecurity) {
      remainingUsers = users.filter(u => u.role === 'admin' || u.role === 'security');
      if (remainingUsers.length === 0) {
        // Fallback safety
        const existingAdmin = users.find(u => u.id === 'usr-admin') || {
          id: 'usr-admin',
          username: 'admin',
          password: 'adminpassword',
          name: 'ดร.สมเกียรติ บริหารการศึกษา (รอง ผอ.ฝ่ายวิชาการ/Admin)',
          role: 'admin' as const,
          branchId: 'GEN',
          branchName: 'ฝ่ายบริหาร',
          position: 'ผู้ดูแลระบบ / รองผู้อำนวยการ',
          phone: '081-999-0000',
          lineId: 'U_ADMIN_CENTRAL'
        };
        const existingSecurity = users.find(u => u.id === 'usr-security') || {
          id: 'usr-security',
          username: 'guard',
          password: 'password123',
          name: 'นายบุญส่ง มั่นคง (รปภ. ประตู 1)',
          role: 'security' as const,
          branchId: 'GEN',
          branchName: 'ฝ่ายอาคารสถานที่',
          position: 'เจ้าหน้าที่ รปภ.',
          phone: '083-111-2233',
          lineId: 'U_SECURITY_GATE'
        };
        remainingUsers = [existingAdmin, existingSecurity];
      }
    }

    onUpdateUsers(remainingUsers);
    setShowClearUsersModal(false);
  };

  // Execute bulk import
  const handleExecuteBulkImport = () => {
    if (parsedPreviewUsers.length === 0) {
      setBulkFeedback({ type: 'error', message: 'ไม่พบรายชื่อครูที่สามารถนำเข้าได้ กรุณาวางรายชื่ออย่างน้อย 1 รายการ' });
      return;
    }

    let finalUsersList: User[] = [];
    if (bulkMode === 'replace') {
      finalUsersList = [...parsedPreviewUsers];
      if (bulkKeepAdminAndSecurity) {
        const retained = users.filter(u => u.role === 'admin' || u.role === 'security');
        for (const special of retained) {
          if (!finalUsersList.some(u => u.id === special.id || u.username === special.username)) {
            finalUsersList.push(special);
          }
        }
      }
    } else {
      // Append mode
      finalUsersList = [...users, ...parsedPreviewUsers];
    }

    // Auto-update branch approvers if any imported user is set as approver for that branch
    const updatedBranches = branches.map(b => {
      const newHeadForBranch = parsedPreviewUsers.find(u => u.branchId === b.id && u.role === 'approver');
      if (newHeadForBranch) {
        return {
          ...b,
          approverUserId: newHeadForBranch.id,
          approverName: `${newHeadForBranch.name} (${newHeadForBranch.position})`
        };
      }
      return b;
    });

    onUpdateUsers(finalUsersList);
    onUpdateBranches(updatedBranches);

    setShowBulkImportModal(false);
    setBulkInputText('');
    setBulkFeedback(null);
  };

  // Samples for bulk import
  const handleLoadSample = (sampleType: 'simple' | 'excel' | 'vocational') => {
    if (sampleType === 'simple') {
      setBulkInputText(
`อ.สมศักดิ์ รักการสอน
อ.วันเพ็ญ ปัญญาเลิศ
อ.เกรียงเดช เทคโนโลยี
อ.พิมพ์ชนก สุขสำราญ
อ.ณัฐพล นวัตกรรม
อ.กมลวรรณ ศิลปศาสตร์`
      );
    } else if (sampleType === 'excel') {
      setBulkInputText(
`อ.วิโรจน์ เจริญยนต์	ช่างยนต์	หัวหน้าสาขาช่างยนต์	081-445-5667	U_VIROJ
อ.ธนากร เครื่องกล	ช่างยนต์	ครู ค.ศ.2	082-334-4556	U_THANAKORN
อ.ศิริพร ดิจิทัลมีเดีย	ธุรกิจดิจิทัล	ครูชำนาญการ	089-887-7665	U_SIRIPORN
อ.นิภาภรณ์ สมาร์ทไอที	ธุรกิจดิจิทัล	ครูผู้ช่วย	083-221-1009	U_NIPAPORN
อ.ประสิทธิ์ ไฟฟ้ากำลัง	ช่างไฟฟ้า	หัวหน้าสาขาช่างไฟฟ้า	085-667-7889	U_PRASIT
อ.วิภาดา ภาษาสากล	ครูสามัญ	ครูชำนาญการพิเศษ	086-778-8990	U_WIPADA`
      );
    } else if (sampleType === 'vocational') {
      setBulkInputText(
`นายธีระพัฒน์ ยนต์การ (ช่างยนต์)
นางสาวสุพัตรา บัญชีการเงิน (การบัญชี)
นายอลงกรณ์ อิเล็กทรอนิกส์ (ช่างไฟฟ้า)
นายชัยวัฒน์ โรงงานอุตสาหกรรม (ช่างกลโรงงาน)
นางสาวมณีรัตน์ พาณิชยการ (ธุรกิจดิจิทัล)
นางสาวดวงใจ การศึกษาทั่วไป (ครูสามัญ)`
      );
    }
  };

  // Update approver for branch
  const handleBranchApproverChange = (branchId: string, approverUserId: string) => {
    const approverUser = users.find(u => u.id === approverUserId);
    const updatedBranches = branches.map(b => {
      if (b.id === branchId) {
        return {
          ...b,
          approverUserId,
          approverName: approverUser ? `${approverUser.name} (${approverUser.position})` : b.approverName
        };
      }
      return b;
    });
    onUpdateBranches(updatedBranches);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(localSettings);
    setSettingsSavedAlert(true);
    setTimeout(() => setSettingsSavedAlert(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-linear-to-r from-purple-900 to-indigo-900 rounded-2xl p-4 sm:p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="bg-purple-500/30 text-purple-200 border border-purple-400/30 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold inline-flex items-center gap-1.5 mb-2">
            <Shield className="w-3.5 h-3.5" />
            ส่วนการบริหารจัดการระบบส่วนกลาง (Central Administrator)
          </span>
          <h2 className="text-base sm:text-xl font-bold tracking-tight">
            ศูนย์ควบคุมระบบและการเชื่อมต่อ Google Sheets 5 ชีต
          </h2>
          <p className="text-[11px] sm:text-xs text-purple-200/90 mt-1 max-w-xl">
            จัดการบัญชีครู กำหนดเส้นทางอนุมัติ 6 สาขาวิชา ตรวจสอบ Log และตั้งค่า LINE Messaging API Webhook
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSheetsModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-xl bg-white text-purple-900 hover:bg-purple-50 font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-purple-700" />
            <span>ดูโค้ด Apps Script & ชีต 5 ชุด</span>
          </button>
        </div>
      </div>

      {/* Main Admin Tab Bar (Mobile swipeable) */}
      <div className="flex items-center border-b border-slate-200 overflow-x-auto gap-1.5 sm:gap-2 pb-2 no-scrollbar">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'requests'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>ประวัติ & คำขอทุกคน ({requests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>จัดการผู้ใช้งาน ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('branches')}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'branches'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>ผู้อนุมัติ 6 สาขา</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>ประวัติระบบ ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>ตั้งค่าระบบ & API</span>
        </button>
      </div>

      {/* Tab 1: Requests & Reports (Everyone's Entry-Exit History) */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Top Entry-Exit & Requests KPI Cards for Admin */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 block">คำขอและประวัติทั้งหมด</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-purple-700">{requests.length}</span>
                <span className="text-xs text-slate-500">รายการ</span>
              </div>
              <span className="text-[10px] text-purple-600 block mt-0.5">รวมครูทุกคนทุกสาขา</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-amber-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 block">กำลังอยู่นอกสถานศึกษา</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-amber-600">
                  {requests.filter(r => r.actualExitTime && !r.actualReturnTime).length}
                </span>
                <span className="text-xs text-slate-500">ท่าน</span>
              </div>
              <span className="text-[10px] text-amber-700 block mt-0.5">สแกนออกแล้ว ยังไม่กลับ</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-blue-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 block">กลับเข้าสถานศึกษาแล้ว</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-blue-600">
                  {requests.filter(r => r.actualReturnTime).length}
                </span>
                <span className="text-xs text-slate-500">ท่าน</span>
              </div>
              <span className="text-[10px] text-blue-700 block mt-0.5">สแกนครบขาออก-ขาเข้า</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 block">อนุมัติแล้วทั้งหมด</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-emerald-600">
                  {requests.filter(r => r.status === 'approved').length}
                </span>
                <span className="text-xs text-slate-500">รายการ</span>
              </div>
              <span className="text-[10px] text-emerald-700 block mt-0.5">รอพิจารณา: {requests.filter(r => r.status === 'pending').length} รายการ</span>
            </div>
          </div>

          {/* Admin Permission Information Banner */}
          <div className="bg-purple-50/90 border border-purple-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-purple-900">
                  สิทธิ์ผู้ดูแลระบบ (Admin): ตรวจสอบและดูประวัติการเข้า-ออกของทุกคนในวิทยาลัย
                </h4>
                <p className="text-purple-700 text-[11px] mt-0.5">
                  ท่านสามารถตรวจสอบประวัติการขออนุญาตและเวลาสแกนเข้า-ออกประตู รปภ. ของครูและบุคลากรทุกคน ทุกสาขาวิชาได้อย่างครบถ้วน (ครูผู้สอนจะเห็นเฉพาะของตนเอง)
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold bg-white text-purple-800 border border-purple-200 px-3 py-1 rounded-full shrink-0 shadow-2xs">
              👥 ตรวจสอบได้ทุกคน ({requests.length} รายการ)
            </span>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่อครู, สถานที่, เหตุผล, รหัสคำขอ..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Excel (CSV)</span>
                </button>
              </div>
            </div>

            {/* Filter pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">กรองตามสาขาวิชา</label>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                >
                  <option value="all">ทุกสาขาวิชา (ทั้ง 6 สาขา)</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">กรองตามสถานะ & การเข้า-ออก</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-medium"
                >
                  <option value="all">ทุกสถานะ (คำขอ & เข้าออกทั้งหมด)</option>
                  <option value="exited">🟡 กำลังอยู่นอก (สแกนออกแล้ว)</option>
                  <option value="returned">🟢 กลับเข้ามาแล้ว (สแกนกลับแล้ว)</option>
                  <option value="pending">⏳ รออนุมัติ</option>
                  <option value="approved">✅ อนุมัติแล้ว</option>
                  <option value="rejected">❌ ไม่อนุมัติ</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">กรองตามวันที่ออก</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Batch Action Toolbar when items are selected */}
          {selectedRequestIds.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 sm:px-4 flex flex-wrap items-center justify-between gap-2.5 text-xs shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-600 text-white text-[11px] font-bold">
                  {selectedRequestIds.length}
                </span>
                <span className="font-bold text-rose-900 text-xs sm:text-sm">
                  เลือกไว้ {selectedRequestIds.length} รายการ
                </span>
                <span className="text-slate-500 text-[11px] hidden sm:inline">
                  (จากรายการที่แสดงทั้งหมด {filteredRequests.length} รายการ)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRequestIds([])}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer text-xs"
                >
                  ยกเลิกการเลือก
                </button>
                <button
                  type="button"
                  onClick={() => setShowBatchDeleteConfirm(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบคำขอที่เลือก ({selectedRequestIds.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Table Container: Mobile Card List + Desktop Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Mobile Cards (Visible on mobile screens < sm) */}
            <div className="sm:hidden p-3 space-y-2.5">
              {filteredRequests.map((req, idx) => (
                <div key={`admin-req-card-${req.id}-${idx}`} className={`bg-white rounded-xl border p-3 shadow-2xs space-y-2 text-xs transition-colors ${selectedRequestIds.includes(req.id) ? 'border-purple-300 bg-purple-50/20' : 'border-slate-200/90'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selectedRequestIds.includes(req.id)}
                        onChange={() => handleToggleSelectOne(req.id)}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer mt-0.5 shrink-0"
                      />
                      <div>
                        <span className="font-mono text-[10px] text-slate-400 block">{req.id}</span>
                        <strong className="text-slate-900 text-xs block">{req.userName}</strong>
                        <span className="text-[11px] text-purple-700 font-medium">{req.branchName} • {req.position}</span>
                      </div>
                    </div>
                    <div>
                      {req.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          รออนุมัติ
                        </span>
                      )}
                      {req.status === 'approved' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          อนุมัติแล้ว
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          ไม่อนุมัติ
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>วันที่: <strong>{req.exitDate}</strong> ({req.exitTime}-{req.returnTime} น.)</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-slate-700">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <span>ไปที่: <strong>{req.destination}</strong></span>
                    </div>
                    <div className="text-slate-500 text-[10px] line-clamp-2">
                      เหตุผล: {req.reason}
                    </div>
                    {req.actualExitTime ? (
                      <div className="text-emerald-700 text-[10px] font-medium pt-1 border-t border-slate-200/60">
                        🕒 สแกนออก: {req.actualExitTime} น. {req.actualReturnTime ? `• กลับ: ${req.actualReturnTime} น.` : '• ยังไม่กลับเข้า'}
                      </div>
                    ) : (
                      <div className="text-slate-400 text-[10px] pt-1 border-t border-slate-200/60">
                        {req.status === 'approved' ? '⚪ ยังไม่ผ่านประตู รปภ.' : '-'}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 truncate max-w-[110px]">
                      ผู้อนุมัติ: {(req.assignedApproverName || '-').split(' ')[0]}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {req.status === 'pending' && onApprove && (
                        <>
                          <button
                            onClick={() => onApprove(req.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold text-white cursor-pointer shadow-xs ${
                              req.userId === currentUser.id
                                ? 'bg-purple-600 hover:bg-purple-700'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                            title={req.userId === currentUser.id ? 'อนุมัติตัวเองทันที' : 'อนุมัติคำขอนี้'}
                          >
                            {req.userId === currentUser.id ? '⚡ อนุมัติตัวเอง' : '✅ อนุมัติ'}
                          </button>
                          <button
                            onClick={() => {
                              setRejectingAdminReq(req);
                              setAdminRejectReason('');
                            }}
                            className="px-2 py-1 rounded-lg text-[11px] font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                          >
                            ❌ ไม่
                          </button>
                        </>
                      )}
                      {req.status === 'approved' && (
                        <>
                          <button
                            onClick={() => onViewQrPass(req)}
                            className="px-2 py-1 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer flex items-center gap-1"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>QR</span>
                          </button>
                          <button
                            onClick={() => onPrintSlip(req)}
                            className="px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 cursor-pointer flex items-center gap-1"
                          >
                            <Printer className="w-3 h-3" />
                            <span>พิมพ์</span>
                          </button>
                        </>
                      )}
                      {/* Delete Button for Admin on Mobile */}
                      <button
                        type="button"
                        onClick={() => setRequestToDelete(req)}
                        className="px-2 py-1 rounded-lg text-[11px] font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer flex items-center gap-1 transition-colors"
                        title="ลบรายการคำขอนี้"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>ลบ</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={filteredRequests.length > 0 && selectedRequestIds.length === filteredRequests.length}
                        onChange={handleToggleSelectAll}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                        title="เลือกทั้งหมด"
                      />
                    </th>
                    <th className="px-4 py-3">รหัสคำขอ / ผู้ขอ</th>
                    <th className="px-4 py-3">สาขาวิชา</th>
                    <th className="px-4 py-3">วัน-เวลาขอออก</th>
                    <th className="px-4 py-3">สถานที่ / เหตุผล</th>
                    <th className="px-4 py-3">เวลาสแกนประตู รปภ. (เข้า-ออกจริง)</th>
                    <th className="px-4 py-3">ผู้อนุมัติ</th>
                    <th className="px-4 py-3">สถานะ</th>
                    <th className="px-4 py-3 text-right">เอกสาร / จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.map(req => (
                    <tr key={req.id} className={`hover:bg-slate-50/80 transition-colors ${selectedRequestIds.includes(req.id) ? 'bg-purple-50/40' : ''}`}>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRequestIds.includes(req.id)}
                          onChange={() => handleToggleSelectOne(req.id)}
                          className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[10px] text-slate-400 block">{req.id}</span>
                        <strong className="text-slate-900 text-xs">{req.userName}</strong>
                        <span className="text-[11px] text-slate-400 block">{req.position}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          {req.branchName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800 block">{req.exitDate}</span>
                        <span className="text-slate-500">{req.exitTime} - {req.returnTime} น.</span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <span className="font-medium text-slate-800 block truncate">{req.destination}</span>
                        <span className="text-slate-500 text-[11px] block truncate">{req.reason}</span>
                      </td>
                      <td className="px-4 py-3">
                        {req.actualExitTime ? (
                          <div className="space-y-0.5">
                            <span className="text-[11px] text-emerald-700 font-semibold block flex items-center gap-1">
                              <span>ออก:</span> {req.actualExitTime} น.
                            </span>
                            {req.actualReturnTime ? (
                              <span className="text-[11px] text-blue-700 font-semibold block flex items-center gap-1">
                                <span>กลับ:</span> {req.actualReturnTime} น.
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 block w-max font-medium">
                                🟡 กำลังอยู่นอก
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {req.status === 'approved' ? '⚪ ยังไม่ผ่านประตู' : '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="block truncate max-w-[130px]">
                          {(req.assignedApproverName || '-').split(' ')[0]} {(req.assignedApproverName || '').split(' ')[1] || ''}
                        </span>
                        {req.approvedAt && (
                          <span className="text-[10px] text-emerald-600 block">{req.approvedAt}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {req.status === 'pending' && (
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 block w-max">
                              รออนุมัติ
                            </span>
                            {(req.assignedApproverId === 'usr-admin' || (req.position || '').includes('หัวหน้า')) && (
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 block w-max">
                                🌟 คำขอหัวหน้าสาขา
                              </span>
                            )}
                          </div>
                        )}
                        {req.status === 'approved' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            อนุมัติแล้ว
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            ไม่อนุมัติ
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {req.status === 'pending' && onApprove && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => onApprove(req.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold text-white cursor-pointer shadow-xs ${
                                  req.userId === currentUser.id
                                    ? 'bg-purple-600 hover:bg-purple-700'
                                    : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                                title={req.userId === currentUser.id ? 'อนุมัติตัวเองทันที' : 'อนุมัติคำขอนี้ในฐานะผู้ดูแลระบบ'}
                              >
                                {req.userId === currentUser.id ? '⚡ อนุมัติตัวเอง' : '✅ อนุมัติ'}
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingAdminReq(req);
                                  setAdminRejectReason('');
                                }}
                                className="px-2 py-1 rounded-lg text-[11px] font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                                title="ไม่อนุมัติ"
                              >
                                ❌ ไม่อนุมัติ
                              </button>
                            </div>
                          )}

                          {req.status === 'approved' && (
                            <>
                              <button
                                onClick={() => onViewQrPass(req)}
                                className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                                title="ดูบัตรผ่าน QR Code"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onPrintSlip(req)}
                                className="p-1 rounded-md text-slate-600 hover:bg-slate-100 cursor-pointer"
                                title="พิมพ์ใบขออนุญาตออกนอกสถานศึกษา"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Delete Request Button for Admin */}
                          <button
                            type="button"
                            onClick={() => setRequestToDelete(req)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                            title="ลบรายการคำขอ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Admin Delete Request Confirmation Modal */}
      {requestToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ยืนยันการลบรายการคำขอ
                </h3>
                <span className="text-xs text-rose-600 font-semibold font-mono">
                  {requestToDelete.id}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">ครูผู้ยื่นคำขอ:</span>
                <span className="font-bold text-slate-900">{requestToDelete.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">สาขาวิชา:</span>
                <span className="font-semibold text-purple-700">{requestToDelete.branchName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">วัน-เวลาขอออก:</span>
                <span>{requestToDelete.exitDate} ({requestToDelete.exitTime} - {requestToDelete.returnTime} น.)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">สถานที่:</span>
                <span className="font-medium truncate max-w-[200px]">{requestToDelete.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">สถานะปัจจุบัน:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  requestToDelete.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                  requestToDelete.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {requestToDelete.status === 'approved' ? 'อนุมัติแล้ว' :
                   requestToDelete.status === 'rejected' ? 'ไม่อนุมัติ' : 'รออนุมัติ'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>
                <strong>คำเตือน:</strong> การลบรายการนี้จะลบออกจากระบบและชีตอย่างถาวร QR Code หรือประวัติที่เกี่ยวข้องจะไม่สามารถนำกลับมาใช้งานได้
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setRequestToDelete(null)}
                className="px-4 py-2 text-xs rounded-xl font-medium text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleSingleDelete}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังลบ...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ยืนยันลบรายการนี้</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Batch Delete Confirmation Modal */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ยืนยันการลบหลายรายการ
                </h3>
                <span className="text-xs text-rose-600 font-semibold">
                  ลบทั้งหมด {selectedRequestIds.length} รายการที่เลือก
                </span>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              {selectedRequestIds.map(id => {
                const req = requests.find(r => r.id === id);
                return (
                  <div key={id} className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-slate-200/60">
                    <span className="font-mono text-[10px] text-slate-500">{id}</span>
                    <span className="font-medium text-slate-800 text-[11px] truncate max-w-[150px]">
                      {req ? req.userName : '-'}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      req?.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                      req?.status === 'rejected' ? 'bg-rose-50 text-rose-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {req?.status === 'approved' ? 'อนุมัติ' : req?.status === 'rejected' ? 'ไม่อนุมัติ' : 'รอ'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>
                <strong>คำเตือน:</strong> คุณกำลังจะลบคำขอทั้ง {selectedRequestIds.length} รายการอย่างถาวร ข้อมูลจะไม่สามารถกู้คืนได้
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="px-4 py-2 text-xs rounded-xl font-medium text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleBatchDelete}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังลบ...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ยืนยันลบ {selectedRequestIds.length} รายการ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Reject Reason Modal */}
      {rejectingAdminReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-rose-700 mb-2">
              ระบุเหตุผลไม่อนุมัติ (ในฐานะรอง ผอ.ฝ่ายวิชาการ/Admin)
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              คำขอของ <strong>{rejectingAdminReq.userName}</strong> ({rejectingAdminReq.position}) จะถูกปฏิเสธและแจ้งเตือนผ่าน LINE
            </p>
            <textarea
              value={adminRejectReason}
              onChange={(e) => setAdminRejectReason(e.target.value)}
              rows={3}
              placeholder="ระบุเหตุผล เช่น ติดภารกิจราชการสำคัญเร่งด่วนในวิทยาลัย"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingAdminReq(null)}
                className="px-4 py-2 text-xs rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!adminRejectReason.trim()) {
                    alert('กรุณากรอกเหตุผล');
                    return;
                  }
                  if (onReject) {
                    onReject(rejectingAdminReq.id, adminRejectReason.trim());
                  }
                  setRejectingAdminReq(null);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs"
              >
                ยืนยันไม่อนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Users Management (Sheet: Users) */}
      {activeTab === 'users' && (
        <div className="space-y-5">
          {/* Top User Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">ผู้ใช้ทั้งหมด</span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">{users.length} ท่าน</span>
              <span className="text-[10px] text-slate-400">ในตารางชีต Users</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs bg-linear-to-b from-blue-50/30 to-white">
              <span className="text-xs font-semibold text-blue-700 block">ครูผู้สอน (Teacher)</span>
              <span className="text-2xl font-bold text-blue-900 mt-1 block">
                {users.filter(u => u.role === 'teacher').length} ท่าน
              </span>
              <span className="text-[10px] text-blue-500">ยื่นขอออกนอกได้</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs bg-linear-to-b from-emerald-50/30 to-white">
              <span className="text-xs font-semibold text-emerald-700 block">หัวหน้าสาขา (Approver)</span>
              <span className="text-2xl font-bold text-emerald-900 mt-1 block">
                {users.filter(u => u.role === 'approver').length} ท่าน
              </span>
              <span className="text-[10px] text-emerald-600">อนุมัติ & ยื่นของตนเองได้</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs bg-linear-to-b from-purple-50/30 to-white">
              <span className="text-xs font-semibold text-purple-700 block">Admin & รปภ.</span>
              <span className="text-2xl font-bold text-purple-900 mt-1 block">
                {users.filter(u => u.role === 'admin' || u.role === 'security').length} ท่าน
              </span>
              <span className="text-[10px] text-purple-500">บริหาร & ตรวจประตู</span>
            </div>
          </div>

          {/* Action Header & Bulk Tools */}
          <div className="bg-linear-to-r from-slate-900 via-purple-950 to-indigo-950 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/30 text-purple-200 border border-purple-400/30">
                  ระบบจัดการครูและบุคลากร
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-300" />
                  รายชื่อครูปัจจุบันได้รับการปกป้อง (ห้ามลบ)
                </span>
              </div>
              <h3 className="text-base font-bold text-white">
                จัดการรายชื่อครูและบุคลากร ({users.length} ท่าน)
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
                ท่านสามารถกดปุ่ม <strong>"แก้ไข"</strong> ในตารางเพื่อแก้ไขชื่อ สาขาวิชา ตำแหน่ง หรือรหัสผ่านของครูแต่ละท่านได้ตลอดเวลา
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={() => {
                  setBulkMode('append');
                  setBulkFeedback(null);
                  setShowBulkImportModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>📥 นำเข้ารายชื่อเพิ่ม</span>
              </button>

              <button
                onClick={() => setShowAddUserModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มรายบุคคล</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อครู, Username, ตำแหน่ง, รหัส..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={userBranchFilter}
                onChange={(e) => setUserBranchFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
              >
                <option value="all">ทุกสาขาวิชา</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
              >
                <option value="all">ทุกบทบาท</option>
                <option value="teacher">ครูผู้สอน (Teacher)</option>
                <option value="approver">หัวหน้าสาขา (Approver)</option>
                <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                <option value="security">เจ้าหน้าที่ รปภ.</option>
              </select>

              {(userSearchTerm || userBranchFilter !== 'all' || userRoleFilter !== 'all') && (
                <button
                  onClick={() => {
                    setUserSearchTerm('');
                    setUserBranchFilter('all');
                    setUserRoleFilter('all');
                  }}
                  className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {users.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-800">ยังไม่มีรายชื่อผู้ใช้งานในระบบ</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  ท่านสามารถวางรายชื่อครูจาก Excel หรือพิมพ์รายชื่อแยกบรรทัด เพื่อสร้างบัญชีและสาขาได้ทันที
                </p>
                <button
                  onClick={() => {
                    setBulkMode('replace');
                    setShowBulkImportModal(true);
                  }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-sm hover:bg-purple-700 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>📥 วางรายชื่อครู / นำเข้าแบบกลุ่ม</span>
                </button>
              </div>
            ) : (
              <>
                {/* Mobile User Cards (Visible on screens < sm) */}
                <div className="sm:hidden p-3 space-y-2.5">
                  {users
                    .filter(u => {
                      const sTerm = (userSearchTerm || '').toLowerCase();
                      const matchesSearch = 
                        (u.name || '').toLowerCase().includes(sTerm) ||
                        (u.username || '').toLowerCase().includes(sTerm) ||
                        (u.id || '').toLowerCase().includes(sTerm) ||
                        (u.position || '').toLowerCase().includes(sTerm);
                      const matchesBranch = userBranchFilter === 'all' || u.branchId === userBranchFilter;
                      const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
                      return matchesSearch && matchesBranch && matchesRole;
                    })
                    .map((u, idx) => (
                      <div
                        key={`admin-usr-card-${u.id}-${idx}`}
                        className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                              <UserIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <strong className="text-slate-900 block text-xs">{u.name}</strong>
                              <span className="text-[10px] text-purple-700 font-mono font-medium">@{u.username}</span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.role === 'teacher' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            u.role === 'approver' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            u.role === 'admin' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {u.role === 'teacher' ? 'ครูผู้ขอ' :
                             u.role === 'approver' ? 'หัวหน้าสาขา' :
                             u.role === 'admin' ? 'ผู้ดูแลระบบ' : 'รปภ. ประตู'}
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] space-y-0.5">
                          <div className="flex justify-between">
                            <span className="text-slate-400">สังกัดสาขา:</span>
                            <span className="font-semibold text-slate-800">{u.branchName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">ตำแหน่ง:</span>
                            <span className="text-slate-700">{u.position}</span>
                          </div>
                          <div className="flex items-center justify-between pt-0.5 border-t border-slate-200/60 font-mono text-[10px]">
                            <span className="text-slate-400">LINE ID:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-emerald-700 font-semibold">{u.lineId || '-'}</span>
                              {u.lineId && u.lineId.trim().startsWith('U') && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenTestLine(u)}
                                  className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded border border-emerald-300 cursor-pointer"
                                >
                                  ⚡ ทดสอบ LINE
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-1.5 pt-0.5">
                          <button
                            onClick={() => handleStartEditUser(u)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>แก้ไข</span>
                          </button>
                          {u.id !== 'usr-admin' && (
                            <button
                              onClick={() => setUserToDelete(u)}
                              className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Desktop Users Table (Hidden on mobile) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">ผู้ใช้งาน</th>
                        <th className="px-4 py-3">Username / Password</th>
                        <th className="px-4 py-3">สาขาวิชา / ตำแหน่ง</th>
                        <th className="px-4 py-3">บทบาท (Role)</th>
                        <th className="px-4 py-3">LINE ID</th>
                        <th className="px-4 py-3 text-right">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users
                        .filter(u => {
                          const sTerm = (userSearchTerm || '').toLowerCase();
                          const matchesSearch = 
                            (u.name || '').toLowerCase().includes(sTerm) ||
                            (u.username || '').toLowerCase().includes(sTerm) ||
                            (u.id || '').toLowerCase().includes(sTerm) ||
                            (u.position || '').toLowerCase().includes(sTerm);
                          const matchesBranch = userBranchFilter === 'all' || u.branchId === userBranchFilter;
                          const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
                          return matchesSearch && matchesBranch && matchesRole;
                        })
                        .map((u, idx) => (
                          <tr key={`admin-usr-${u.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                                  <UserIcon className="w-4 h-4" />
                                </div>
                                <div>
                                  <strong className="text-slate-900 block text-xs">{u.name}</strong>
                                  <span className="text-[10px] text-slate-400 font-mono">{u.id}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono">
                              <span className="text-purple-700 font-semibold">{u.username}</span>
                              <span className="text-slate-400 block text-[10px]">••••••••</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-800 block">{u.branchName}</span>
                              <span className="text-slate-500 text-[11px] block">{u.position}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                u.role === 'teacher' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                u.role === 'approver' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                u.role === 'admin' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {u.role === 'teacher' ? 'ครูผู้ขอ' :
                                 u.role === 'approver' ? 'หัวหน้าสาขา' :
                                 u.role === 'admin' ? 'ผู้ดูแลระบบ' : 'รปภ. ประตู'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[11px] text-emerald-700 font-semibold">{u.lineId || '-'}</span>
                                {u.lineId && u.lineId.trim().startsWith('U') && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenTestLine(u)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 transition-colors cursor-pointer shadow-2xs shrink-0"
                                    title="ทดสอบส่งข้อความแจ้งเตือนเข้า LINE นี้ทันที"
                                  >
                                    <Send className="w-2.5 h-2.5" />
                                    <span>ทดสอบ LINE</span>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleStartEditUser(u)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-200 transition-colors cursor-pointer shadow-2xs"
                                  title="แก้ไขข้อมูลครู/ผู้ใช้งานนี้"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>แก้ไข</span>
                                </button>
                                {u.id !== 'usr-admin' && (
                                  <button
                                    onClick={() => setUserToDelete(u)}
                                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                                    title={`ลบข้อมูล ${u.name}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Branches & Approver Routing (Sheet: Branches) */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
            <strong>💡 กฎการกำหนดเส้นทางอนุมัติอัตโนมัติ (6 หน่วยงาน):</strong> เมื่อครูส่งคำขอ ระบบจะส่งตรงไปยังหัวหน้าสาขาที่กำหนดไว้ในตารางนี้ทันที โดยที่ครูไม่ต้องเลือกผู้อนุมัติเอง
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Mobile Branches Cards (Visible on screens < sm) */}
            <div className="sm:hidden p-3 space-y-2.5">
              {branches.map(b => {
                const approverUser = users.find(u => u.id === b.approverUserId);
                return (
                  <div
                    key={`branch-card-${b.id}`}
                    className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                          {b.id}
                        </span>
                        <strong className="text-slate-900 text-sm">{b.name}</strong>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-mono font-medium">
                        LINE: {approverUser?.lineId || '-'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-500">
                        ผู้อนุมัติประจำสาขา (Department Head):
                      </label>
                      <select
                        value={b.approverUserId}
                        onChange={(e) => handleBranchApproverChange(b.id, e.target.value)}
                        className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-medium text-slate-800"
                      >
                        {users.map((u, idx) => (
                          <option key={`branch-card-user-${u.id}-${idx}`} value={u.id}>
                            {u.name} ({u.position})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Branches Table (Hidden on mobile) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">รหัสสาขา</th>
                    <th className="px-4 py-3">ชื่อสาขาวิชา / กลุ่มสาระ</th>
                    <th className="px-4 py-3">ผู้อนุมัติประจำสาขา (Department Head)</th>
                    <th className="px-4 py-3">LINE ID ผู้อนุมัติ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branches.map(b => {
                    const approverUser = users.find(u => u.id === b.approverUserId);
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">
                          {b.id}
                        </td>
                        <td className="px-4 py-3">
                          <strong className="text-slate-900 text-sm">{b.name}</strong>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={b.approverUserId}
                            onChange={(e) => handleBranchApproverChange(b.id, e.target.value)}
                            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-medium text-slate-800"
                          >
                            {users.map((u, idx) => (
                              <option key={`branch-user-${u.id}-${idx}`} value={u.id}>
                                {u.name} ({u.position})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 font-mono text-emerald-700">
                          {approverUser?.lineId || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Logs Audit Trail (Sheet: ApprovalLog) */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              บันทึกประวัติการดำเนินการ (ตารางชีต ApprovalLog)
            </h3>
            <span className="text-xs text-slate-400">
              บันทึกทุกขั้นตอน: ยื่นคำขอ, หัวหน้าอนุมัติ, ตรวจสแกนประตู
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">LogID</th>
                    <th className="px-4 py-3">รหัสคำขอ</th>
                    <th className="px-4 py-3">ผู้กระทำ (Actor)</th>
                    <th className="px-4 py-3">การกระทำ (Action)</th>
                    <th className="px-4 py-3">วัน-เวลา</th>
                    <th className="px-4 py-3">รายละเอียดบันทึก (Note)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-mono text-slate-400">{log.id}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-700">{log.requestId}</td>
                      <td className="px-4 py-3">
                        <strong className="text-slate-900 block">{log.actorName}</strong>
                        <span className="text-[10px] text-slate-400">{log.actorRole}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.action === 'submit' ? 'bg-blue-50 text-blue-700' :
                          log.action === 'approve' ? 'bg-emerald-50 text-emerald-700' :
                          log.action === 'reject' ? 'bg-rose-50 text-rose-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{log.timestamp}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-sm">{log.comment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Settings & Webhooks */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              การตั้งค่าระบบและการเชื่อมต่อภายนอก (Settings)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              กำหนดค่า LINE Channel Access Token และ Google Apps Script Web App URL
            </p>
          </div>

          {settingsSavedAlert && (
            <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>บันทึกการตั้งค่าเรียบร้อยแล้ว</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อสถานศึกษา / วิทยาลัย
              </label>
              <input
                type="text"
                value={localSettings.schoolName}
                onChange={(e) => setLocalSettings({ ...localSettings, schoolName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
              />
            </div>

            {/* Logo Setting Section */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                    <span>ตราสัญลักษณ์ / ลิงก์ภาพโลโก้สถานศึกษา (Logo Image URL)</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ภาพโลโก้จะนำไปแสดงในหน้าเข้าสู่ระบบ, แถบเมนูด้านบน, บัตรผ่านสแกน (QR Pass) และใบขออนุญาตออกนอกทางการ
                  </p>
                </div>

                {localSettings.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLocalSettings({ ...localSettings, logoUrl: '' })}
                    className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                  >
                    ล้างภาพ / ใช้ตรามาตรฐาน
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                {/* Live Preview Box */}
                <div className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-slate-300 p-1 flex flex-col items-center justify-center shrink-0 shadow-xs relative overflow-hidden">
                  <DonBoscoLogo size={68} logoUrl={localSettings.logoUrl} />
                </div>

                {/* URL Input and File Upload */}
                <div className="flex-1 w-full space-y-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <LinkIcon className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="url"
                      value={localSettings.logoUrl || ''}
                      onChange={(e) => setLocalSettings({ ...localSettings, logoUrl: e.target.value.trim() })}
                      placeholder="วางลิงก์รูปภาพ เช่น https://example.com/logo.png หรือ data:image/..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-mono"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer shadow-2xs transition-all">
                      <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
                      <span>เลือกไฟล์ภาพจากเครื่อง</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) {
                              alert('ขนาดไฟล์ภาพใหญ่เกิน 2MB กรุณาเลือกภาพที่ขนาดเล็กลง');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64 = event.target?.result as string;
                              if (base64) {
                                setLocalSettings({ ...localSettings, logoUrl: base64 });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setLocalSettings({ ...localSettings, logoUrl: '' })}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 cursor-pointer shadow-2xs"
                    >
                      <RefreshCw className="w-3 h-3 text-slate-400" />
                      <span>รีเซ็ตเป็นตราดอนบอสโก</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Google Apps Script Web App URL (doPost Endpoint)
              </label>
              <input
                type="url"
                value={localSettings.googleAppsScriptUrl}
                onChange={(e) => setLocalSettings({ ...localSettings, googleAppsScriptUrl: e.target.value })}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono text-[11px]"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                เมื่อกรอก URL นี้ ระบบจะยิง Webhook ไปยัง Google Sheet ทุกครั้งที่มีการยื่นคำขอหรืออนุมัติ
              </span>
            </div>

            {/* LINE Channel Access Token Settings */}
            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span>LINE Channel Access Token (Messaging API สำหรับส่งข้อความแจ้งเตือน)</span>
                  </label>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    คัดลอกจากแท็บ Messaging API &gt; Channel access token (long-lived) ใน LINE Developers Console
                  </p>
                </div>
                <button
                  type="button"
                  disabled={verifyTokenLoading || !localSettings.lineChannelAccessToken || localSettings.lineChannelAccessToken.startsWith('MOCK_')}
                  onClick={handleVerifyLineBot}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>{verifyTokenLoading ? 'กำลังตรวจสอบ...' : '🔍 ตรวจสอบ Token กับบอท'}</span>
                </button>
              </div>

              <textarea
                value={localSettings.lineChannelAccessToken}
                onChange={(e) => setLocalSettings({ ...localSettings, lineChannelAccessToken: e.target.value.trim() })}
                rows={2}
                placeholder="วาง Long-lived Channel Access Token ที่นี่..."
                className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-xl font-mono text-[11px] text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />

              {/* Bot Info card if verified */}
              {botInfo && (
                <div className="p-3 bg-white rounded-xl border border-emerald-300 flex items-center justify-between gap-3 shadow-2xs animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    {botInfo.pictureUrl ? (
                      <img src={botInfo.pictureUrl} alt={botInfo.displayName} className="w-10 h-10 rounded-full border border-emerald-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <Bot className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-slate-900 text-xs">{botInfo.displayName}</strong>
                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          เชื่อมต่อแล้ว
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">LINE Basic ID: {botInfo.basicId || '-'}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-emerald-800 font-medium bg-emerald-50 p-1.5 rounded-lg border border-emerald-100">
                    ✓ พร้อมส่งข้อความแจ้งเตือนหาครูและหัวหน้าสาขา
                  </span>
                </div>
              )}

              {/* LINE Webhook URL for Direct in-chat Approval */}
              <div className="p-4 bg-indigo-50/80 rounded-2xl border border-indigo-200 text-xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <strong className="text-indigo-950 font-bold text-sm flex items-center gap-1.5">
                      <LinkIcon className="w-4 h-4 text-indigo-600" />
                      <span>ตั้งค่า Webhook เพื่อให้กด "อนุมัติ" ใน LINE ได้ทันที (ไม่ต้องเข้าเว็บ):</span>
                    </strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fetchWebhookStatus}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-indigo-200 cursor-pointer shadow-2xs"
                    >
                      <RefreshCw className={`w-3 h-3 ${webhookInfo.loading ? 'animate-spin' : ''}`} />
                      <span>รีเฟรชสถานะ</span>
                    </button>
                  </div>
                </div>

                {/* Primary Webhook URL Box: Direct Public Webhook (Cloudflare 200 OK) */}
                {(() => {
                  const directWebhook = webhookInfo.publicWebhookUrl || 'https://green-sig-cos-remarks.trycloudflare.com/api/line/webhook';
                  return (
                    <div className="p-3 bg-white rounded-xl border-2 border-emerald-500 shadow-sm space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Webhook URL สำหรับใส่ใน LINE Developers (กด Verify ผ่าน 200 OK ทันที 100%):</span>
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                          Public HTTPS (200 OK - ไม่ติด 302)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <code className="text-[11px] font-mono bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200 flex-1 truncate select-all text-emerald-950 font-bold">
                          {directWebhook}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(directWebhook);
                            alert('คัดลอก Webhook URL เรียบร้อยแล้ว!\nนำไปวางที่ LINE Developers > Messaging API > Webhook settings แล้วกด Verify ได้ทันที');
                          }}
                          className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer shrink-0 shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          <Copy className="w-4 h-4" />
                          <span>คัดลอก Webhook URL</span>
                        </button>
                      </div>

                      <p className="text-[11px] text-emerald-800">
                        ✨ นำ URL ด้านบนนี้ไปวางในหน้า <strong>LINE Developers &gt; Webhook URL</strong> แทน URL เดิมที่ติด 302 แล้วกด <strong>Verify</strong> จะขึ้น <strong>Success 200 OK</strong> ทันที!
                      </p>
                    </div>
                  );
                })()}

                {/* Option 2: Google Apps Script Webhook */}
                {localSettings.googleAppsScriptUrl && (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <span className="font-semibold text-slate-700 block text-[11px]">หรือใช้ Google Apps Script Webhook URL ของท่าน:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] font-mono bg-white p-1.5 rounded border border-slate-200 flex-1 truncate text-slate-600 select-all">
                        {localSettings.googleAppsScriptUrl}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(localSettings.googleAppsScriptUrl);
                          alert('คัดลอก Apps Script Webhook URL แล้ว');
                        }}
                        className="px-2.5 py-1 text-[11px] bg-slate-200 hover:bg-slate-300 text-slate-800 rounded cursor-pointer font-medium"
                      >
                        คัดลอก
                      </button>
                    </div>
                  </div>
                )}

                {/* Dev Environment Notice */}
                <div className="p-2.5 bg-amber-50/90 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>สาเหตุที่ใส่ URL ais-dev-... แล้ว LINE แจ้งเตือน Error 302 Found:</strong>
                    <p className="text-amber-800 mt-0.5 leading-relaxed">
                      เนื่องจาก URL ที่ขึ้นต้นด้วย <code className="bg-amber-100 px-1 py-0.2 rounded font-mono">ais-dev-...</code> เป็นระบบพรีวิวทดสอบภายในของ Google Cloud ที่มีระบบรักษาความปลอดภัยดักจับ (Cookie Redirect) เซิร์ฟเวอร์ของ LINE จึงไม่สามารถเชื่อมต่อได้โดยตรง <strong>กรุณาใช้ URL ของ Google Apps Script ด้านบนแทน</strong> ซึ่งเป็นเซิร์ฟเวอร์สาธารณะของ Google ที่ LINE ตรวจสอบผ่าน 200 OK ทันทีครับ
                    </p>
                  </div>
                </div>

                {/* Live Webhook Status Card */}
                <div className="p-3 bg-white/90 rounded-xl border border-indigo-100 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">สัญญาณ Webhook ที่เซิร์ฟเวอร์ได้รับทั้งหมด:</span>
                    <span className="font-bold font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {webhookInfo.totalEvents} ครั้ง
                    </span>
                  </div>
                  {webhookInfo.lastEvent ? (
                    <div className="text-[11px] text-slate-700 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-emerald-900 block font-semibold">
                          สัญญาณล่าสุด: {webhookInfo.lastEvent.summary || 'ได้รับ Webhook สำเร็จ'}
                        </strong>
                        <span className="text-[10px] text-emerald-700 font-mono">
                          {new Date(webhookInfo.lastEvent.timestamp).toLocaleString('th-TH')}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>ยังไม่พบสัญญาณ Webhook จาก LINE (กรุณากดปุ่ม <strong>Verify</strong> ใน LINE Developers Console)</span>
                    </div>
                  )}
                </div>

                {/* Quick Simulation Tool (Test Webhook Approval Live) */}
                <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-300">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>เครื่องมือทดสอบ: จำลองการกดปุ่ม "อนุมัติ" ผ่าน LINE</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      ทดสอบว่าสถานะหน้าเว็บปรับเปลี่ยนทันทีหรือไม่
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 items-center">
                    <select
                      value={simulateReqId}
                      onChange={(e) => setSimulateReqId(e.target.value)}
                      className="flex-1 w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:ring-1 focus:ring-amber-400 font-mono"
                    >
                      <option value="">-- เลือกรหัสคำขอที่ต้องการทดสอบอนุมัติ --</option>
                      {requests.filter(r => r.status === 'pending').map(r => (
                        <option key={r.id} value={r.id}>
                          {r.id} - {r.userName} ({r.reason?.slice(0, 20)}...) [รออนุมัติ]
                        </option>
                      ))}
                      {requests.filter(r => r.status === 'approved').map(r => (
                        <option key={r.id} value={r.id}>
                          {r.id} - {r.userName} [อนุมัติแล้ว]
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={simulateLoading || !simulateReqId}
                      onClick={() => handleSimulateWebhookApprove()}
                      className="w-full sm:w-auto px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 flex items-center justify-center gap-1.5"
                    >
                      {simulateLoading ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>กำลังจำลอง...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>⚡ ทดสอบกดอนุมัติทันที</span>
                        </>
                      )}
                    </button>
                  </div>

                  {simulateResult && (
                    <div className={`p-2 rounded-lg text-xs font-medium ${simulateResult.success ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-700' : 'bg-rose-900/60 text-rose-200 border border-rose-700'}`}>
                      {simulateResult.message}
                    </div>
                  )}
                </div>

                {/* 302 Found Notice & Recommended Google Apps Script Webhook URL */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>หากกด Verify ใน LINE แล้วขึ้น Error 302 Found:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    เนื่องจาก URL <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">ais-dev-...</code> เป็นระบบพรีวิวทดสอบของ Google Cloud ที่มีระบบตรวจเช็คสิทธิ์ (Cookie Check) บ็อตของ LINE จึงได้รับรหัส 302 <strong>วิธีแก้ไขที่ถูกต้องและมาตรฐาน 100%:</strong> ให้ใช้ <strong>Google Apps Script Webhook URL</strong> แทน (Google Apps Script จะตอบกลับ 200 OK ทันที)
                  </p>
                  {localSettings.googleAppsScriptUrl && (
                    <div className="pt-1 flex flex-col sm:flex-row gap-1.5 items-stretch sm:items-center">
                      <span className="text-[11px] font-semibold text-slate-700 shrink-0">URL Apps Script ของท่าน:</span>
                      <code className="text-[10px] font-mono bg-white px-2 py-1 rounded border border-amber-300 truncate flex-1 text-slate-800 select-all">
                        {localSettings.googleAppsScriptUrl}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(localSettings.googleAppsScriptUrl);
                          alert('คัดลอก Google Apps Script Webhook URL แล้ว!\nนำไปวางใน LINE Developers > Webhook URL แล้วกด Verify ได้ทันที');
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded cursor-pointer shrink-0 transition-colors"
                      >
                        คัดลอกไปใส่ใน LINE
                      </button>
                    </div>
                  )}
                </div>

                {/* Important Checklist for LINE Developers and LINE OA Manager */}
                <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-2 text-[11px]">
                  <strong className="text-slate-900 block font-bold text-xs flex items-center gap-1 text-indigo-900">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                    <span>วิธีตั้งค่าให้กดปุ่มใน LINE แล้วสถานะบนเว็บเปลี่ยนเป็น "อนุมัติแล้ว" อัตโนมัติ:</span>
                  </strong>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <span className="font-bold text-indigo-950 block">1. ใน LINE Developers Console:</span>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                        <li>เปิด Channel &gt; แท็บ <strong>Messaging API</strong></li>
                        <li>เลื่อนลงที่ <strong>Webhook settings</strong></li>
                        <li>วาง Webhook URL ด้านบน</li>
                        <li>กดปุ่ม <strong>Verify</strong> (ต้องขึ้น <em>Success</em>)</li>
                        <li>สลับสวิตช์ <strong>Use webhook เป็น ON</strong> (สำคัญมาก!)</li>
                      </ul>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <span className="font-bold text-emerald-950 block">2. ใน LINE Official Account Manager:</span>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                        <li>ไปที่ <strong>chat.line.biz</strong> &gt; บัญชีบอทของท่าน</li>
                        <li>กด <strong>ตั้งค่า (Settings)</strong> มุมขวาบน</li>
                        <li>เลือก <strong>ตั้งค่าการตอบกลับ (Response settings)</strong></li>
                        <li>โหมดการตอบกลับ: เลือก <strong>บ็อต (Bot)</strong></li>
                        <li>Webhook: เลือก <strong>เปิด (Enabled)</strong></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Help & Explanation Guide */}
              <div className="text-[11px] text-slate-600 bg-white p-3.5 rounded-xl border border-emerald-100 space-y-1.5">
                <p className="font-bold text-slate-800 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                  <span>3 ขั้นตอนเชื่อมต่อเพื่อให้ LINE ของหัวหน้าสาขาได้รับแจ้งเตือน:</span>
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                  <li>
                    <strong>รับ Channel Access Token:</strong> ในเว็บ LINE Developers &gt; Channel ของท่าน &gt; แท็บ <em>Messaging API</em> &gt; เลื่อนลงล่างสุดกด Issue / Copy Token นำมาวางในช่องด้านบนนี้
                  </li>
                  <li>
                    <strong>เพิ่มเพื่อนกับ LINE Official Account:</strong> ให้หัวหน้าสาขาเปิดแอป LINE ในมือถือ สแกน QR หรือแอดเพื่อนกับบัญชี LINE Official Account ของโรงเรียน <em>(หากไม่แอดเพื่อน LINE API จะไม่อนุญาตให้ระบบส่ง Push Message หาได้)</em>
                  </li>
                  <li>
                    <strong>ใส่ User ID:</strong> ในแท็บ "ครูและผู้ใช้งาน" &gt; กดแก้ไขหัวหน้าสาขา &gt; ใส่รหัส User ID (ขึ้นต้นด้วย U...) ซึ่งท่านใส่เรียบร้อยแล้ว แล้วกดปุ่ม <strong>"⚡ ทดสอบส่ง LINE"</strong> ได้เลย!
                  </li>
                </ol>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เบอร์ติดต่อฉุกเฉิน / ป้อมยามประตู
              </label>
              <input
                type="text"
                value={localSettings.securityContact}
                onChange={(e) => setLocalSettings({ ...localSettings, securityContact: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white cursor-pointer shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกการตั้งค่า</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              เพิ่มครู / ผู้ใช้งานใหม่
            </h3>

            <form onSubmit={handleAddUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="เช่น นายเอกชัย ใจดี"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="ekachai"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">สาขาวิชา</label>
                  <select
                    value={newUser.branchId}
                    onChange={(e) => setNewUser({ ...newUser, branchId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">บทบาท (Role)</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="teacher">ครูผู้ขอ (Teacher)</option>
                    <option value="approver">หัวหน้าสาขา (Approver)</option>
                    <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                    <option value="security">เจ้าหน้าที่ รปภ.</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ตำแหน่ง</label>
                <input
                  type="text"
                  value={newUser.position}
                  onChange={(e) => setNewUser({ ...newUser, position: e.target.value })}
                  placeholder="ครู ค.ศ. 1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">LINE ID</label>
                <input
                  type="text"
                  value={newUser.lineId}
                  onChange={(e) => setNewUser({ ...newUser, lineId: e.target.value })}
                  placeholder="U_EKACHAI"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl font-semibold cursor-pointer shadow-sm"
                >
                  บันทึกผู้ใช้
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Teachers Modal */}
      {showBulkImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    วางรายชื่อครู / นำเข้าแบบกลุ่ม (Bulk Import)
                  </h3>
                  <p className="text-xs text-slate-500">
                    วางรายชื่อจาก Excel, Google Sheets หรือพิมพ์รายชื่อแยกบรรทัด
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkImportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Quick Templates Buttons */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span>เลือกรูปแบบตัวอย่างเพื่อทดสอบ:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleLoadSample('simple')}
                  className="px-3 py-1.5 rounded-lg text-xs bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>📋 1. พิมพ์ชื่ออย่างเดียว</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('excel')}
                  className="px-3 py-1.5 rounded-lg text-xs bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>📊 2. วางจาก Excel (มีสาขา/ตำแหน่ง)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('vocational')}
                  className="px-3 py-1.5 rounded-lg text-xs bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>🏫 3. ครู 6 สาขาวิชา</span>
                </button>
              </div>
            </div>

            {/* Textarea for Bulk Paste */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ช่องสำหรับวางรายชื่อครู (1 คนต่อ 1 บรรทัด):
              </label>
              <textarea
                value={bulkInputText}
                onChange={(e) => setBulkInputText(e.target.value)}
                rows={6}
                placeholder="วางรายชื่อครูที่นี่ (1 คนต่อ 1 บรรทัด)...&#10;ตัวอย่าง:&#10;อ.สมศักดิ์ รักการสอน&#10;อ.วันเพ็ญ ปัญญาเลิศ&#10;หรือคัดลอกหลายคอลัมน์จาก Excel:&#10;อ.วิโรจน์ เจริญยนต์	ช่างยนต์	หัวหน้าสาขาช่างยนต์	081-445-5667"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-mono text-slate-800 leading-relaxed"
              />
            </div>

            {/* Import Options */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3 mb-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    สาขาวิชาเริ่มต้น (กรณีไม่ได้ระบุในบรรทัด):
                  </label>
                  <select
                    value={bulkDefaultBranch}
                    onChange={(e) => setBulkDefaultBranch(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    โหมดการนำเข้า:
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="bulkMode"
                        checked={bulkMode === 'replace'}
                        onChange={() => setBulkMode('replace')}
                        className="text-purple-600"
                      />
                      <span className="font-semibold text-purple-900">แทนที่ผู้ใช้เดิมทั้งหมด</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="bulkMode"
                        checked={bulkMode === 'append'}
                        onChange={() => setBulkMode('append')}
                        className="text-purple-600"
                      />
                      <span className="text-slate-700">เพิ่มต่อท้าย</span>
                    </label>
                  </div>
                </div>
              </div>

              {bulkMode === 'replace' && (
                <div className="pt-2 border-t border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800">
                    <input
                      type="checkbox"
                      checked={bulkKeepAdminAndSecurity}
                      onChange={(e) => setBulkKeepAdminAndSecurity(e.target.checked)}
                      className="rounded text-purple-600"
                    />
                    <span>
                      <strong>คงบัญชีผู้ดูแลระบบ (Admin) และ รปภ. ประตู ไว้</strong> (แนะนำ เพื่อให้สามารถบริหารจัดการและตรวจสแกน QR ผ่านประตูได้ต่อเนื่อง)
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Parsed Preview Table */}
            {parsedPreviewUsers.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">
                    ตัวอย่างข้อมูลที่ตรวจพบ ({parsedPreviewUsers.length} ท่าน):
                  </span>
                  <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    ✓ ตรวจสอบความถูกต้องก่อนกดนำเข้า
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-white">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">ชื่อ-นามสกุล</th>
                        <th className="px-3 py-2">สาขาวิชา</th>
                        <th className="px-3 py-2">ตำแหน่ง</th>
                        <th className="px-3 py-2">บทบาท</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedPreviewUsers.map((u, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 font-mono text-slate-400">{i + 1}</td>
                          <td className="px-3 py-1.5 font-semibold text-slate-900">{u.name}</td>
                          <td className="px-3 py-1.5 text-slate-700">{u.branchName}</td>
                          <td className="px-3 py-1.5 text-slate-500">{u.position}</td>
                          <td className="px-3 py-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              u.role === 'approver' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              u.role === 'admin' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                              'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {u.role === 'approver' ? 'หัวหน้าสาขา' : u.role === 'admin' ? 'Admin' : 'ครูผู้สอน'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {bulkFeedback && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {bulkFeedback.message}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBulkImportModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkImport}
                disabled={parsedPreviewUsers.length === 0}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>
                  {bulkMode === 'replace' ? 'ลบของเดิม & นำเข้าชุดใหม่' : 'เพิ่มต่อท้าย'} ({parsedPreviewUsers.length} ท่าน)
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Users Confirmation Modal */}
      {showClearUsersModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              ยืนยันการลบผู้ใช้เดิมทั้งหมด
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              ท่านต้องการลบรายชื่อผู้ใช้ทั้งหมดที่มีอยู่ในระบบ ({users.length} ท่าน) เพื่อให้พร้อมสำหรับการใส่รายชื่อครูจริงชุดใหม่ใช่หรือไม่?
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={clearKeepAdminAndSecurity}
                  onChange={(e) => setClearKeepAdminAndSecurity(e.target.checked)}
                  className="rounded text-rose-600"
                />
                <span>
                  <strong>คงบัญชีผู้ดูแลระบบ (Admin) และ เจ้าหน้าที่ รปภ. ไว้</strong>
                </span>
              </label>
              <p className="text-[11px] text-slate-500 mt-1 pl-6">
                เพื่อให้ท่านสามารถเข้าสู่ระบบและทดสอบสแกนประตูได้ต่อเนื่อง
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearUsersModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmClearUsers}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>ยืนยันลบผู้ใช้เดิม</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && editFormData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    แก้ไขข้อมูลครู / ผู้ใช้งาน
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    รหัสผู้ใช้: {editingUser.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setEditFormData(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อ-นามสกุล <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="เช่น นายสุมัณฑิต ทิพย์มนตรี"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 font-medium bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Username (ชื่อผู้ใช้สำหรับเข้าสู่ระบบ)
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.username}
                    onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Password (รหัสผ่าน)
                  </label>
                  <input
                    type="text"
                    value={editFormData.password || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                    placeholder="password123"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-800 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    สาขาวิชา / แผนก
                  </label>
                  <select
                    value={editFormData.branchId}
                    onChange={(e) => {
                      const selBranch = branches.find(b => b.id === e.target.value);
                      setEditFormData({
                        ...editFormData,
                        branchId: e.target.value,
                        branchName: selBranch ? selBranch.name : editFormData.branchName
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    บทบาท (Role)
                  </label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800"
                  >
                    <option value="teacher">ครูผู้ขอ (Teacher)</option>
                    <option value="approver">หัวหน้าสาขาวิชา (Approver)</option>
                    <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                    <option value="security">เจ้าหน้าที่ รปภ. (Security)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ตำแหน่งงาน
                </label>
                <input
                  type="text"
                  value={editFormData.position}
                  onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })}
                  placeholder="เช่น ครูผู้สอน, ครู ค.ศ. 1, หัวหน้าสาขา"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    LINE ID (สำหรับส่งข้อความแจ้งเตือน)
                  </label>
                  {editFormData.lineId && editFormData.lineId.trim().startsWith('U') && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                      ✓ รูปแบบ LINE User ID ถูกต้อง
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={editFormData.lineId || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, lineId: e.target.value.trim() })}
                  placeholder="เช่น U81778d734346f14e047e07cb37d1ccd1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-[11px] text-emerald-800 bg-white"
                />

                {/* Real-time LINE Test Panel inside Edit Modal */}
                <div className="mt-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] text-slate-700 font-semibold flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      ทดสอบส่งข้อความแจ้งเตือนเข้า LINE นี้
                    </span>
                    <button
                      type="button"
                      disabled={!editFormData.lineId || !editFormData.lineId.trim().startsWith('U') || testLineStatus?.loading}
                      onClick={async () => {
                        if (!editFormData.lineId) return;
                        await handleExecuteLineTest(editFormData.lineId, editFormData.name);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-3 h-3" />
                      <span>{testLineStatus?.loading ? 'กำลังส่ง...' : '⚡ ทดสอบส่งข้อความเข้า LINE นี้'}</span>
                    </button>
                  </div>

                  {/* Feedback Result */}
                  {testLineStatus && (
                    <div className={`p-2.5 rounded-xl text-xs font-medium border animate-in fade-in ${
                      testLineStatus.success
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        : testLineStatus.code === 'TOKEN_REQUIRED'
                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                        : 'bg-rose-50 text-rose-900 border-rose-300'
                    }`}>
                      <div className="flex items-start gap-2">
                        {testLineStatus.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 space-y-1.5">
                          <p className="font-bold">{testLineStatus.message}</p>
                          {testLineStatus.code === 'TOKEN_REQUIRED' && (
                            <div className="mt-2 pt-2 border-t border-amber-200/80 space-y-1.5">
                              <label className="text-[11px] block text-amber-900 font-bold">
                                🔑 วาง LINE Channel Access Token เพื่อทดสอบและบันทึกทันที:
                              </label>
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  placeholder="วาง Channel Access Token จาก LINE Developers..."
                                  value={tokenInputForTest}
                                  onChange={(e) => setTokenInputForTest(e.target.value.trim())}
                                  className="flex-1 px-2.5 py-1 text-xs bg-white border border-amber-300 rounded-lg font-mono text-[11px]"
                                />
                                <button
                                  type="button"
                                  disabled={!tokenInputForTest}
                                  onClick={async () => {
                                    const updatedSettings = { ...localSettings, lineChannelAccessToken: tokenInputForTest };
                                    setLocalSettings(updatedSettings);
                                    onUpdateSettings(updatedSettings);
                                    if (editFormData.lineId) {
                                      await handleExecuteLineTest(editFormData.lineId, editFormData.name, tokenInputForTest);
                                    }
                                  }}
                                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                                >
                                  บันทึกและส่งทันที
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Clarification Tips */}
                  <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-200/80">
                    <p className="font-bold text-slate-700">💡 ทำไมใส่ User ID แล้วไม่ได้รับแจ้งเตือน LINE?</p>
                    <p className="flex items-start gap-1">
                      <span>1.</span>
                      <span><strong>ต้องแอดเพื่อนก่อน:</strong> บัญชี LINE นี้ต้องกดเพิ่มเพื่อนกับ LINE Official Account (Bot) ของโรงเรียนก่อน</span>
                    </p>
                    <p className="flex items-start gap-1">
                      <span>2.</span>
                      <span><strong>ต้องมี Token:</strong> ต้องกรอก Channel Access Token (long-lived) จาก LINE Developers ในเมนู "การตั้งค่าระบบ"</span>
                    </p>
                    <p className="flex items-start gap-1">
                      <span>3.</span>
                      <span><strong>User ID ถูกต้องแล้ว:</strong> รหัส {editFormData.lineId || 'U...'} คือ User ID สำหรับรับ Push Notification โดยเฉพาะ</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                    setEditFormData(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึกการแก้ไข</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal (100% reliable inside iframe) */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              ยืนยันการลบผู้ใช้งาน
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              คุณต้องการลบข้อมูลของ <strong>"{userToDelete.name}"</strong> ({userToDelete.position} - {userToDelete.branchName}) ออกจากระบบหรือไม่?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateUsers(users.filter(u => u.id !== userToDelete.id));
                  setUserToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>ลบผู้ใช้นี้ทันที</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standalone LINE Notification Test Modal */}
      {testLineUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ทดสอบส่งข้อความแจ้งเตือน LINE
                  </h3>
                  <p className="text-xs text-slate-500">
                    {testLineUser.name} ({testLineUser.position})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTestLineUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">ผู้รับ:</span>
                  <span className="font-bold text-slate-800 font-sans">{testLineUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">สาขาวิชา:</span>
                  <span className="text-slate-700 font-sans">{testLineUser.branchName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">บทบาท:</span>
                  <span className="text-emerald-700 font-sans font-semibold">
                    {testLineUser.role === 'approver' ? 'หัวหน้าสาขา (ผู้อนุมัติ)' : testLineUser.role}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-400">LINE User ID:</span>
                  <span className="text-emerald-800 font-bold">{testLineUser.lineId || 'ยังไม่ได้ระบุ'}</span>
                </div>
              </div>

              {/* Token Input or Status */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  LINE Channel Access Token:
                </label>
                <input
                  type="text"
                  placeholder="วาง Channel Access Token จาก LINE Developers..."
                  value={tokenInputForTest}
                  onChange={(e) => setTokenInputForTest(e.target.value.trim())}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-[11px] bg-white text-slate-800"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  คัดลอกจากแท็บ Messaging API ใน LINE Developers Console
                </span>
              </div>

              {/* Test Status Banner */}
              {testLineStatus && (
                <div className={`p-3 rounded-xl border animate-in fade-in ${
                  testLineStatus.success
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : testLineStatus.code === 'TOKEN_REQUIRED'
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-rose-50 text-rose-900 border-rose-300'
                }`}>
                  <div className="flex items-start gap-2">
                    {testLineStatus.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <p className="font-bold">{testLineStatus.message}</p>
                      {testLineStatus.success && (
                        <p className="text-[11px] text-emerald-700">
                          📱 กรุณาเปิดแอป LINE ในโทรศัพท์ของ {testLineUser.name} เพื่อตรวจสอบข้อความแจ้งเตือน
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Important Requirements Checklist */}
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
                <p className="font-bold">⚠️ สิ่งสำคัญที่ต้องทำเพื่อให้ LINE แจ้งเตือนสำเร็จ:</p>
                <p>1. บัญชี LINE นี้ต้อง <strong>"เพิ่มเพื่อน"</strong> กับ LINE Official Account ของโรงเรียนก่อน</p>
                <p>2. ต้องมี <strong>Channel Access Token (long-lived)</strong> ที่ถูกต้องจาก LINE Developers</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTestLineUser(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
                >
                  ปิด
                </button>
                <button
                  type="button"
                  disabled={testLineStatus?.loading || !testLineUser.lineId}
                  onClick={async () => {
                    if (tokenInputForTest && tokenInputForTest !== localSettings.lineChannelAccessToken) {
                      const updated = { ...localSettings, lineChannelAccessToken: tokenInputForTest };
                      setLocalSettings(updated);
                      onUpdateSettings(updated);
                    }
                    await handleExecuteLineTest(testLineUser.lineId!, testLineUser.name, tokenInputForTest || localSettings.lineChannelAccessToken);
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{testLineStatus?.loading ? 'กำลังส่งแจ้งเตือน...' : 'ส่งข้อความทดสอบทันที'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
