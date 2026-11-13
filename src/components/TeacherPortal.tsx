import React, { useState, useEffect } from 'react';
import { User, ExitRequest, Branch } from '../types';
import { 
  FileText, 
  Send, 
  Clock, 
  MapPin, 
  Calendar, 
  Car, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  QrCode, 
  Printer, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Info,
  ShieldAlert,
  User as UserIcon,
  BookOpen,
  UserCheck,
  CheckSquare,
  Handshake,
  AlertTriangle,
  Lock,
  RefreshCw,
  MessageCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StorageService } from '../services/storageService';

interface TeacherPortalProps {
  currentUser: User;
  users: User[];
  requests: ExitRequest[];
  branches: Branch[];
  onSubmitRequest: (reqData: any) => Promise<any> | any;
  onViewQrPass: (req: ExitRequest) => void;
  onPrintSlip: (req: ExitRequest) => void;
  onOpenLineModal?: () => void;
  onAcknowledgeSubstitute?: (requestId: string) => void;
  onDeclineSubstitute?: (requestId: string, reason: string) => void;
  onApprove?: (requestId: string) => void;
}

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
  currentUser,
  users,
  requests,
  branches,
  onSubmitRequest,
  onViewQrPass,
  onPrintSlip,
  onApprove
}) => {
  // Active Tab in Teacher Portal: 'create' | 'my-requests'
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'my-requests'>('create');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form State
  const today = new Date().toISOString().slice(0, 10);
  const [exitDate, setExitDate] = useState(today);
  const [exitTime, setExitTime] = useState('10:30');
  const [returnTime, setReturnTime] = useState('12:00');
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  // Automatically determine the approver based on role and branch
  const normBranchKey = (s?: string) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const currentBranch = branches.find(b =>
    normBranchKey(b.id) === normBranchKey(currentUser.branchId) ||
    normBranchKey(b.name) === normBranchKey(currentUser.branchName) ||
    normBranchKey(b.name) === normBranchKey(currentUser.branchId) ||
    normBranchKey(b.id) === normBranchKey(currentUser.branchName)
  );
  const resolvedApprover = StorageService.getInstance().getApproverForBranch(
    currentUser.branchId || currentUser.branchName,
    currentUser.id
  );
  const isAdmin = currentUser.role === 'admin';
  const isHeadOfDept =
    currentUser.role === 'approver' ||
    (currentBranch && currentBranch.approverUserId === currentUser.id) ||
    resolvedApprover.approverId === currentUser.id;
  const autoApproverName = resolvedApprover.approverName || (currentBranch ? currentBranch.approverName : 'หัวหน้าสาขาประจำสังกัด');
  const [syncingLine, setSyncingLine] = useState<boolean>(false);

  const handleManualSyncLine = async () => {
    setSyncingLine(true);
    try {
      await fetch('/api/requests/sync-gas');
      await StorageService.getInstance().syncWithServer();
    } catch {}
    setTimeout(() => setSyncingLine(false), 800);
  };

  // Helper to normalize Thai names and text (collapsing any multiple spaces)
  const norm = (s?: string) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const cleanThaiName = (s?: string) => {
    return (s || '')
      .replace(/^(นาย|นางสาว|นาง|ว่าที่\s*ร\.ต\.|ดร\.|อ\.)\s*/i, '')
      .replace(/\s+/g, '')
      .trim()
      .toLowerCase();
  };

  // Get recently created request IDs from sessionStorage (so creator always sees their own submitted requests)
  const sessionReqIds = (() => {
    try {
      const data = typeof window !== 'undefined' ? sessionStorage.getItem('last_submitted_req_ids') : null;
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  })();

  // Filter requests for the current user (match by user ID, or full name with space normalization, or username, or clean Thai name)
  const userRequests = requests.filter(r => {
    if (r.id && sessionReqIds.includes(r.id)) return true;
    if (r.userId && currentUser.id && r.userId === currentUser.id) return true;
    if (currentUser.name && r.userName && norm(r.userName) === norm(currentUser.name)) return true;
    if (currentUser.name && r.userName && cleanThaiName(r.userName) === cleanThaiName(currentUser.name)) return true;
    if (currentUser.username && (r as any).userUsername && norm((r as any).userUsername) === norm(currentUser.username)) return true;
    return false;
  });

  // Strictly restrict to current user's own requests (users cannot view other people from this panel)
  const displayRequests = userRequests;

  const pendingRequests = displayRequests.filter(r => r.status === 'pending');
  const approvedRequests = displayRequests.filter(r => r.status === 'approved');
  const rejectedRequests = displayRequests.filter(r => r.status === 'rejected');

  // Total substitute requests across entire college
  const allSubstituteRequestsInCollege = requests.filter(r => 
    Boolean(r.hasClasses === true || String(r.hasClasses).toLowerCase() === 'true' || r.substituteTeacherName)
  );
  const allPendingSubstituteInCollege = allSubstituteRequestsInCollege.filter(r => r.substituteStatus === 'pending');

  // Substitute requests assigned to current user (or all if scope is 'all' or user is admin, or matching URL reqId)
  const filteredList = displayRequests.filter(r => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  // Fast fill prompt's exact example
  const handleFillSomchaiExample = () => {
    setExitDate('2026-10-05');
    setExitTime('10:30');
    setReturnTime('12:00');
    setDestination('ศูนย์บริการรถยนต์ มิตซูบิชิ สุราษฎร์ธานี');
    setReason('นำรถยนต์ราชการส่วนกลางเข้าตรวจเช็กระยะ 20,000 กม.');
    setNotes('ได้นัดหมายกับศูนย์บริการไว้ล่วงหน้าเรียบร้อยแล้ว');
  };

  // Fast fill example for department head
  const handleFillHeadExample = () => {
    setExitDate('2026-10-05');
    setExitTime('13:30');
    setReturnTime('16:30');
    setDestination('สถาบันพัฒนาฝีมือแรงงาน ภาค 11 สุราษฎร์ธานี');
    setReason(`เข้าร่วมประชุมคณะกรรมการจัดสอบมาตรฐานวิชาชีพฝีมือแรงงานแห่งชาติ สาขาวิชา${currentUser.branchName}`);
    setNotes('เข้าร่วมประชุมตามหนังสือราชการ');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim() || !reason.trim()) {
      alert('กรุณากรอกสถานที่และเหตุผลการขออนุญาต');
      return;
    }

    const payload = {
      userId: currentUser.id,
      userName: currentUser.name,
      branchId: currentUser.branchId,
      branchName: currentUser.branchName,
      position: currentUser.position,
      userPhone: currentUser.phone || '',
      userLineId: currentUser.lineId || '',
      teacherLineId: currentUser.lineId || '',
      exitDate,
      exitTime,
      returnTime,
      destination,
      reason,
      travelMethod: 'ตามภารกิจราชการ',
      vehiclePlate: '',
      companions: '',
      notes: notes || '',
      hasClasses: false,
      substituteStatus: 'not_required' as const
    };

    onSubmitRequest(payload);

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

    // Reset Form
    setDestination('');
    setReason('');
    setNotes('');

    // Switch to My Requests tab to see new request
    setTimeout(() => {
      setActiveSubTab('my-requests');
    }, 1500);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Teacher Profile Summary Card (Mobile-Optimized) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
            <UserIcon className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">{currentUser.name}</h2>
              <span className="bg-blue-50 text-blue-700 text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-medium border border-blue-200">
                {currentUser.position}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1 sm:gap-2">
              <span className="font-semibold text-slate-700">สาขา: {currentUser.branchName}</span>
            </p>
          </div>
        </div>

        {/* Automatic Route Preview */}
        <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Send className="w-4 h-4" />
          </div>
          <div className="text-left text-xs min-w-0">
            <span className="text-indigo-900 font-bold block text-[11px] sm:text-xs">ส่งคำขออัตโนมัติ:</span>
            <span className="text-slate-600 block text-[11px] truncate">
              ส่งตรงไปยัง <strong className="text-indigo-700">{autoApproverName}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Tab Controller (Mobile-First Segmented Control) */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 p-1 bg-slate-200/80 rounded-2xl gap-1">
          <button
            onClick={() => setActiveSubTab('create')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === 'create'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">
              <span className="inline sm:hidden">ยื่นขอออกนอก</span>
              <span className="hidden sm:inline">แบบฟอร์มขอออกนอกสถานศึกษา</span>
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('my-requests')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === 'my-requests'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span className="truncate">
              <span className="inline sm:hidden">คำขอฉัน ({userRequests.length})</span>
              <span className="hidden sm:inline">ประวัติ & คำขอของฉัน ({userRequests.length})</span>
            </span>
          </button>
        </div>

        {/* Clean Compact Status Bar */}
        <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-amber-700 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              รออนุมัติ ({pendingRequests.length})
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              อนุมัติ ({approvedRequests.length})
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 text-rose-700 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              ไม่อนุมัติ ({rejectedRequests.length})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleManualSyncLine}
              disabled={syncingLine}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] sm:text-[11px] font-bold border border-emerald-200 transition-all cursor-pointer shadow-2xs active:scale-95"
              title="ตรวจสอบผลอนุมัติจาก LINE ล่าสุดทันที"
            >
              <RefreshCw className={`w-3 h-3 text-emerald-600 ${syncingLine ? 'animate-spin' : ''}`} />
              <span>{syncingLine ? 'กำลังซิงค์...' : 'ตรวจสอบผลจาก LINE'}</span>
            </button>
            <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-semibold hidden xs:inline-block">
              เฉพาะตนเอง
            </span>
          </div>
        </div>
      </div>

      {/* Subtab 1: Form View */}
      {activeSubTab === 'create' && (
        <div className="max-w-4xl mx-auto w-full space-y-4">
          {/* Prominent Alert Banner if teacher has approved requests */}
          {approvedRequests.length > 0 && (
            <div className="bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-4 sm:p-5 rounded-2xl shadow-lg border border-emerald-500/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/50 text-[11px] font-bold">
                    <span>🎉 คำขอของท่านได้รับการอนุมัติแล้ว ({approvedRequests.length} รายการ)</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold mt-0.5 truncate">
                    {approvedRequests[0].id}: {approvedRequests[0].destination}
                  </h4>
                  <p className="text-xs text-emerald-100 truncate">
                    ผู้อนุมัติ: {approvedRequests[0].approvedBy || 'หัวหน้าสาขาวิชา'} • ท่านสามารถเปิดบัตรผ่าน QR Code แสดงต่อเจ้าหน้าที่ รปภ. ได้ทันที
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onViewQrPass(approvedRequests[0])}
                  className="px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-800 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <QrCode className="w-4 h-4 text-emerald-700" />
                  <span>เปิดบัตรผ่าน QR Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSubTab('my-requests');
                    setFilterStatus('all');
                  }}
                  className="px-3 py-2 bg-emerald-800/50 hover:bg-emerald-800 text-white rounded-xl font-semibold text-xs transition-all cursor-pointer"
                >
                  ดูประวัติคำขอ
                </button>
              </div>
            </div>
          )}

          {/* Main Form */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex flex-wrap items-center gap-2">
                    <span>ยื่นคำขออนุญาตออกนอกบริเวณสถานศึกษา</span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    ระบบจะส่งคำขอไปยังหัวหน้าสาขาเพื่อพิจารณาอนุมัติทันที
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isHeadOfDept ? (
                    <button
                      type="button"
                      onClick={handleFillHeadExample}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl sm:rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-all cursor-pointer shadow-2xs"
                      title="เติมข้อมูลตัวอย่างของหัวหน้าสาขา (ประชุมราชการภายนอก)"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>⚡ ตัวอย่างหัวหน้าสาขาไปประชุม</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFillSomchaiExample}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl sm:rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                      title="เติมข้อมูลตัวอย่างของครูสมชาย (นำรถราชการเข้าตรวจเช็กตามโจทย์)"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>⚡ เติมข้อมูลตัวอย่างตามโจทย์</span>
                    </button>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* 1. ข้อมูลผู้ขอ (Read-only summary) */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    ส่วนที่ 1: ข้อมูลผู้ขอ (ดึงจากโปรไฟล์ในระบบอัตโนมัติ)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block">ชื่อ-นามสกุลผู้ขอ:</span>
                      <span className="font-semibold text-slate-800 text-sm">{currentUser.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">สาขาวิชา/กลุ่มสาระ:</span>
                      <span className="font-semibold text-slate-800 text-sm">{currentUser.branchName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">ตำแหน่ง:</span>
                      <span className="font-semibold text-slate-800 text-sm">{currentUser.position}</span>
                    </div>
                  </div>
                </div>

                {/* 2. ข้อมูลการออกนอกสถานศึกษา */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    ส่วนที่ 2: รายละเอียดการออกนอกสถานศึกษา
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        📅 วันที่ออกนอกสถานศึกษา <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={exitDate}
                        onChange={(e) => setExitDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        🕐 เวลาที่ขอออก <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={exitTime}
                        onChange={(e) => setExitTime(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        🕐 เวลากลับโดยประมาณ <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={returnTime}
                        onChange={(e) => setReturnTime(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      📍 สถานที่ที่จะไป <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="เช่น ศูนย์บริการรถยนต์ มิตซูบิชิ ปทุมวัน, ธนาคารกรุงไทย สาขาศาลายา"
                      required
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      📝 จุดประสงค์ / เหตุผลความจำเป็น <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      placeholder="ระบุเหตุผลความจำเป็นในการออกนอกสถานศึกษาในเวลาราชการ..."
                      required
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      หมายเหตุเพิ่มเติม / ภาระงานอื่น
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="เช่น ได้ประสานงานมอบหมายภาระงานไว้เรียบร้อยแล้ว"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      ส่งคำขอตรงไปยัง <strong className="text-slate-800">{autoApproverName}</strong> เพื่อพิจารณาอนุมัติทันที
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold text-sm transition-all shadow-md cursor-pointer bg-blue-600 hover:bg-blue-700 shadow-blue-500/25"
                  >
                    <Send className="w-4 h-4" />
                    <span>ส่งคำขอออกนอกสถานศึกษา</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
      )}

      {/* Subtab 2: My Requests List */}
      {activeSubTab === 'my-requests' && (
        <div className="space-y-4">
          {/* Teacher Personal Privacy Banner */}
          <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-blue-900">
                  ประวัติเข้า-ออกและคำขอ (เฉพาะของครู: {currentUser.name})
                </h4>
                <p className="text-blue-700 text-[11px] mt-0.5">
                  สิทธิ์ครูผู้สอนจะแสดงเฉพาะประวัติคำขอและเวลาสแกนเข้า-ออกประตู รปภ. ของตนเองเท่านั้น เพื่อความเป็นส่วนตัวและความปลอดภัย (หัวหน้าสาขาและแอดมินสามารถดูของทุกคนได้)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-600 text-white shadow-xs">
                👤 คำขอของฉัน ({displayRequests.length})
              </span>
            </div>
          </div>
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  filterStatus === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                ทั้งหมด ({displayRequests.length})
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  filterStatus === 'pending' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                🟡 รออนุมัติ ({pendingRequests.length})
              </button>
              <button
                onClick={() => setFilterStatus('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  filterStatus === 'approved' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                🟢 อนุมัติแล้ว ({approvedRequests.length})
              </button>
              <button
                onClick={() => setFilterStatus('rejected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  filterStatus === 'rejected' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                🔴 ไม่อนุมัติ ({rejectedRequests.length})
              </button>
            </div>

            <button
              onClick={() => setActiveSubTab('create')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1"
            >
              + เขียนคำขอใหม่
            </button>
          </div>

          {/* Quick Notice for Approved Requests */}
          {approvedRequests.length > 0 && filterStatus !== 'approved' && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold text-xs sm:text-sm text-emerald-900">
                    🎉 ท่านมีคำขอที่ได้รับการอนุมัติแล้ว ({approvedRequests.length} รายการ)!
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    คำขอ {approvedRequests[0].id} ({approvedRequests[0].destination}) ได้รับอนุมัติแล้ว พร้อมแสดงบัตรผ่าน QR Code
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onViewQrPass(approvedRequests[0])}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>เปิดบัตรผ่าน QR Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('approved')}
                  className="px-2.5 py-1.5 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  ดูเฉพาะที่อนุมัติ
                </button>
              </div>
            </div>
          )}

          {/* Cards List */}
          {filteredList.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-700">ไม่พบคำขอในหมวดหมู่นี้</h3>
              <p className="text-xs text-slate-400 mt-1">
                ท่านสามารถกด "แบบฟอร์มขออนุญาต" เพื่อยื่นคำขอใหม่ได้ตลอดเวลา
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredList.map((req, idx) => {
                const isApproved = req.status === 'approved';
                const isPending = req.status === 'pending';
                const isRejected = req.status === 'rejected';

                return (
                  <div
                    key={`teacher-req-${req.id}-${idx}`}
                    className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <span className="text-[11px] font-mono font-bold text-slate-400 block">
                            {req.id}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                            {req.destination}
                          </h4>
                        </div>
                        <div>
                          {isPending && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                              รออนุมัติ
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3.5 h-3.5" />
                              อนุมัติแล้ว
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3.5 h-3.5" />
                              ไม่อนุมัติ
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Detail Body */}
                      <div className="space-y-2 text-xs text-slate-600 bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>วันที่: <strong>{req.exitDate}</strong> ({req.exitTime} – {req.returnTime} น.)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>เหตุผล: {req.reason}</span>
                        </div>
                        {req.travelMethod && req.travelMethod !== 'ตามภารกิจราชการ' && (
                          <div className="flex items-center gap-2">
                            <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>เดินทางโดย: {req.travelMethod} {req.vehiclePlate && `(${req.vehiclePlate})`}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-slate-500 pt-1 border-t border-slate-200/50">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>ผู้อนุมัติ: {req.assignedApproverName}</span>
                        </div>

                        {/* Rejection Note if rejected */}
                        {isRejected && req.rejectionReason && (
                          <div className="bg-rose-50 text-rose-700 p-2 rounded-lg border border-rose-200 text-xs">
                            <strong>เหตุผลที่ไม่อนุมัติ:</strong> {req.rejectionReason}
                          </div>
                        )}

                        {/* Security Gate Timestamp if checked */}
                        {req.actualExitTime && (
                          <div className="bg-emerald-50 text-emerald-800 p-2 rounded-lg border border-emerald-200 text-[11px] flex items-center justify-between">
                            <span>🕒 ผ่านประตูขาออก: <strong>{req.actualExitTime}</strong></span>
                            {req.actualReturnTime ? (
                              <span>กลับเข้า: <strong>{req.actualReturnTime}</strong></span>
                            ) : (
                              <span className="text-amber-600 font-medium">ยังไม่กลับเข้า</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons for Card */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400">
                        ยื่นเมื่อ: {req.submittedAt}
                      </span>

                      <div className="flex items-center gap-2">
                        {isApproved && (
                          <>
                            <button
                              onClick={() => onViewQrPass(req)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs transition-all"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>บัตรผ่าน QR</span>
                            </button>
                            <button
                              onClick={() => onPrintSlip(req)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer border border-slate-200 transition-all"
                              title="พิมพ์ใบขออนุญาตออกนอกสถานศึกษา"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>พิมพ์</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
