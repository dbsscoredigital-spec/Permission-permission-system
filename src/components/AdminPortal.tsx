import React, { useState } from 'react';
import { User, Branch, ExitRequest, ApprovalLog, SystemSettings } from '../types';
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
  Check,
  Copy,
  UserMinus,
  UserPlus,
  ListPlus,
  User as UserIcon,
  Calendar,
  MapPin,
  Image as ImageIcon,
  Link as LinkIcon
} from 'lucide-react';

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
    const matchesSearch = 
      r.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase());
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
      r.id,
      r.submittedAt,
      r.userName,
      r.branchName,
      r.exitDate,
      r.exitTime,
      r.returnTime,
      `"${r.destination.replace(/"/g, '""')}"`,
      `"${r.reason.replace(/"/g, '""')}"`,
      `"${r.assignedApproverName.replace(/"/g, '""')}"`,
      r.status,
      r.approvedAt || '',
      r.travelMethod,
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

          {/* Table Container: Mobile Card List + Desktop Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Mobile Cards (Visible on mobile screens < sm) */}
            <div className="sm:hidden p-3 space-y-2.5">
              {filteredRequests.map((req, idx) => (
                <div key={`admin-req-card-${req.id}-${idx}`} className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] text-slate-400 block">{req.id}</span>
                      <strong className="text-slate-900 text-xs block">{req.userName}</strong>
                      <span className="text-[11px] text-purple-700 font-medium">{req.branchName} • {req.position}</span>
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
                    <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
                      ผู้อนุมัติ: {req.assignedApproverName.split(' ')[0]}
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
                    <th className="px-4 py-3">รหัสคำขอ / ผู้ขอ</th>
                    <th className="px-4 py-3">สาขาวิชา</th>
                    <th className="px-4 py-3">วัน-เวลาขอออก</th>
                    <th className="px-4 py-3">สถานที่ / เหตุผล</th>
                    <th className="px-4 py-3">เวลาสแกนประตู รปภ. (เข้า-ออกจริง)</th>
                    <th className="px-4 py-3">ผู้อนุมัติ</th>
                    <th className="px-4 py-3">สถานะ</th>
                    <th className="px-4 py-3 text-right">เอกสาร / ตรวจสอบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
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
                        <span className="block truncate max-w-[130px]">{req.assignedApproverName.split(' ')[0]} {req.assignedApproverName.split(' ')[1]}</span>
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
                            {(req.assignedApproverId === 'usr-admin' || req.position.includes('หัวหน้า')) && (
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
                      const matchesSearch = 
                        u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                        u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                        u.id.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                        u.position.toLowerCase().includes(userSearchTerm.toLowerCase());
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
                          <div className="flex justify-between pt-0.5 border-t border-slate-200/60 font-mono text-[10px]">
                            <span className="text-slate-400">LINE ID:</span>
                            <span className="text-emerald-700 font-semibold">{u.lineId || '-'}</span>
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
                          const matchesSearch = 
                            u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                            u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                            u.id.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                            u.position.toLowerCase().includes(userSearchTerm.toLowerCase());
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
                              <span className="font-mono text-[11px] text-emerald-700 font-semibold block">{u.lineId || '-'}</span>
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                LINE Channel Access Token (Messaging API)
              </label>
              <textarea
                value={localSettings.lineChannelAccessToken}
                onChange={(e) => setLocalSettings({ ...localSettings, lineChannelAccessToken: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono text-[11px]"
              />
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
                <label className="block font-semibold text-slate-700 mb-1">
                  LINE ID (สำหรับส่งข้อความแจ้งเตือน)
                </label>
                <input
                  type="text"
                  value={editFormData.lineId || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, lineId: e.target.value })}
                  placeholder="U_LINE_XXXX"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-[11px] text-emerald-700 bg-white"
                />
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
    </div>
  );
};
