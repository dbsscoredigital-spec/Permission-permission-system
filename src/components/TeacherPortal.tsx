import React, { useState } from 'react';
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
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TeacherPortalProps {
  currentUser: User;
  users: User[];
  requests: ExitRequest[];
  branches: Branch[];
  onSubmitRequest: (reqData: any) => void;
  onViewQrPass: (req: ExitRequest) => void;
  onPrintSlip: (req: ExitRequest) => void;
  onOpenLineModal?: () => void;
  onAcknowledgeSubstitute: (requestId: string) => void;
  onDeclineSubstitute: (requestId: string, reason: string) => void;
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
  onAcknowledgeSubstitute,
  onDeclineSubstitute,
  onApprove
}) => {
  // Active Tab in Teacher Portal: 'create' | 'my-requests' | 'substitute-tasks'
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'my-requests' | 'substitute-tasks'>('create');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form State
  const today = new Date().toISOString().slice(0, 10);
  const [exitDate, setExitDate] = useState(today);
  const [exitTime, setExitTime] = useState('10:30');
  const [returnTime, setReturnTime] = useState('12:00');
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  
  // Substitute Teaching Duties state
  const [hasClasses, setHasClasses] = useState<boolean>(false);
  const [substituteTeacherId, setSubstituteTeacherId] = useState<string>('');
  const [substituteSubject, setSubstituteSubject] = useState<string>('');
  const [substituteTasks, setSubstituteTasks] = useState<string>('');

  // Decline Dialog for Substitute
  const [decliningReqId, setDecliningReqId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('');

  // List of other teachers available for substitute teaching
  const candidateSubstituteTeachers = users.filter(u => u.id !== currentUser.id && (u.role === 'teacher' || u.role === 'approver'));

  // Automatically determine the approver based on role and branch
  const currentBranch = branches.find(b => b.id === currentUser.branchId || b.name === currentUser.branchName);
  const isAdmin = currentUser.role === 'admin';
  const isHeadOfDept = currentUser.role === 'approver' || (currentBranch && currentBranch.approverUserId === currentUser.id);
  const canSelfApprove = isAdmin || isHeadOfDept;
  const autoApproverName = isAdmin
    ? `${currentUser.name} (ผู้ดูแลระบบ - อนุมัติตนเองได้ทันที)`
    : isHeadOfDept
    ? `${currentUser.name} (${currentUser.position} - อนุมัติตนเองได้ทันที)`
    : (currentBranch ? currentBranch.approverName : 'หัวหน้าสาขาประจำสังกัด');
  const [headSelfApprove, setHeadSelfApprove] = useState<boolean>(true);

  // Filter requests for the current user
  const userRequests = requests.filter(r => r.userId === currentUser.id);
  const pendingRequests = userRequests.filter(r => r.status === 'pending');
  const approvedRequests = userRequests.filter(r => r.status === 'approved');
  const rejectedRequests = userRequests.filter(r => r.status === 'rejected');

  // Substitute requests assigned to current user
  const substituteRequestsForMe = requests.filter(r => r.substituteTeacherId === currentUser.id);
  const pendingSubstituteForMe = substituteRequestsForMe.filter(r => r.substituteStatus === 'pending');

  const filteredList = userRequests.filter(r => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  // Fast fill prompt's exact example with Substitute Teacher
  const handleFillSomchaiExample = () => {
    setExitDate('2026-10-05');
    setExitTime('10:30');
    setReturnTime('12:00');
    setDestination('ศูนย์บริการรถยนต์ มิตซูบิชิ ปทุมวัน');
    setReason('นำรถยนต์ราชการส่วนกลางเข้าตรวจเช็กระยะ 20,000 กม.');
    setHasClasses(true);
    // Find teacher Prasert or first candidate
    const subTeacher = candidateSubstituteTeachers.find(t => t.id === 'usr-teacher-prasert') || candidateSubstituteTeachers[0];
    if (subTeacher) {
      setSubstituteTeacherId(subTeacher.id);
    }
    setSubstituteSubject('วิชาเครื่องยนต์ดีเซล ระดับ ปวช.2 (คาบ 3-4 ห้องปฏิบัติการช่างยนต์ 2)');
    setSubstituteTasks('มอบหมายใบงานที่ 4 การตรวจเช็กระบบหล่อลื่นและไส้กรองน้ำมันเครื่อง ให้นักเรียนทำในสมุดส่งท้ายคาบ');
    setNotes('ได้โทรศัพท์นัดหมายและประสานงานกับครูผู้สอนแทนล่วงหน้าเรียบร้อยแล้ว');
  };

  // Fast fill example for department head
  const handleFillHeadExample = () => {
    setExitDate('2026-10-05');
    setExitTime('13:30');
    setReturnTime('16:30');
    setDestination('สถาบันพัฒนาฝีมือแรงงาน ภาค 1 สมุทรปราการ');
    setReason(`เข้าร่วมประชุมคณะกรรมการจัดสอบมาตรฐานวิชาชีพฝีมือแรงงานแห่งชาติ สาขาวิชา${currentUser.branchName}`);
    setHasClasses(false);
    setSubstituteTeacherId('');
    setSubstituteSubject('');
    setSubstituteTasks('');
    setNotes('หัวหน้าสาขายื่นคำขอและอนุมัติตัวเองทันที');
    setHeadSelfApprove(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim() || !reason.trim()) {
      alert('กรุณากรอกสถานที่และเหตุผลการขออนุญาต');
      return;
    }

    if (hasClasses && !substituteTeacherId) {
      alert('กรุณาเลือกครูผู้สอนแทนเนื่องจากท่านระบุว่ามีคาบสอน');
      return;
    }

    const selectedSubTeacher = candidateSubstituteTeachers.find(t => t.id === substituteTeacherId);

    const payload = {
      userId: currentUser.id,
      userName: currentUser.name,
      branchId: currentUser.branchId,
      branchName: currentUser.branchName,
      position: currentUser.position,
      userPhone: '',
      exitDate,
      exitTime,
      returnTime,
      destination,
      reason,
      travelMethod: 'ตามภารกิจราชการ',
      vehiclePlate: '',
      companions: '',
      notes: notes || (canSelfApprove && headSelfApprove ? `${isAdmin ? 'ผู้ดูแลระบบ (Admin)' : 'หัวหน้าสาขา'}ยื่นขออนุญาตและอนุมัติตัวเองเรียบร้อย` : ''),
      hasClasses,
      substituteTeacherId: hasClasses ? substituteTeacherId : undefined,
      substituteTeacherName: hasClasses && selectedSubTeacher ? selectedSubTeacher.name : undefined,
      substituteSubject: hasClasses ? substituteSubject : undefined,
      substituteTasks: hasClasses ? substituteTasks : undefined,
      substituteStatus: hasClasses ? (canSelfApprove && headSelfApprove ? 'acknowledged' : 'pending' as const) : ('not_required' as const),
      selfApprove: canSelfApprove ? headSelfApprove : undefined
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
    setHasClasses(false);
    setSubstituteTeacherId('');
    setSubstituteSubject('');
    setSubstituteTasks('');

    // Switch to My Requests tab to see new request
    setTimeout(() => {
      setActiveSubTab('my-requests');
    }, 1500);
  };

  const handleConfirmDecline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decliningReqId) return;
    if (!declineReason.trim()) {
      alert('กรุณากรอกเหตุผลที่ไม่สะดวกสอนแทน');
      return;
    }
    onDeclineSubstitute(decliningReqId, declineReason.trim());
    setDecliningReqId(null);
    setDeclineReason('');
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
        <div className="grid grid-cols-3 p-1 bg-slate-200/80 rounded-2xl gap-1">
          <button
            onClick={() => setActiveSubTab('create')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === 'create'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">
              <span className="inline sm:hidden">ยื่นขอออก</span>
              <span className="hidden sm:inline">แบบฟอร์มขอออกนอก</span>
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('my-requests')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === 'my-requests'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span className="truncate">
              <span className="inline sm:hidden">คำขอฉัน ({userRequests.length})</span>
              <span className="hidden sm:inline">ประวัติ & คำขอ ({userRequests.length})</span>
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('substitute-tasks')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer relative ${
              activeSubTab === 'substitute-tasks'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Handshake className="w-4 h-4 shrink-0" />
            <span className="truncate">
              <span className="inline sm:hidden">สอนแทน ({substituteRequestsForMe.length})</span>
              <span className="hidden sm:inline">ภาระงานสอนแทน ({substituteRequestsForMe.length})</span>
            </span>
            {pendingSubstituteForMe.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2 animate-ping"></span>
            )}
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
          <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-semibold hidden xs:inline-block">
            เฉพาะตนเอง
          </span>
        </div>
      </div>

      {/* Subtab 1: Form View */}
      {activeSubTab === 'create' && (
        <div className="max-w-4xl mx-auto w-full">
          {/* Main Form */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex flex-wrap items-center gap-2">
                    <span>ยื่นคำขออนุญาตออกนอกบริเวณสถานศึกษา</span>
                    {canSelfApprove && (
                      <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full border ${isAdmin ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}`}>
                        {isAdmin ? 'สำหรับผู้ดูแลระบบ (Admin)' : 'สำหรับหัวหน้าสาขาวิชา'}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    {isAdmin
                      ? 'ในฐานะผู้ดูแลระบบ (Admin) ท่านมีสิทธิ์อนุมัติตัวเองได้เลยทันที พร้อมรับบัตรผ่าน QR Code ทันที'
                      : isHeadOfDept 
                      ? 'ในฐานะหัวหน้าสาขาวิชา ท่านมีสิทธิ์อนุมัติตัวเองได้เลยทันที พร้อมรับบัตรผ่าน QR Code ทันที' 
                      : 'ระบบจะส่งแจ้งเตือน LINE ไปยังหัวหน้าสาขาโดยอัตโนมัติ ไม่ต้องเลือกผู้อนุมัติเอง'}
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

                  {/* 3. การปฏิบัติการสอน & มอบหมายครูสอนแทน */}
                  <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-amber-600" />
                        <span>ภาระการสอน & การมอบหมายครูสอนแทน</span>
                      </h4>
                      {hasClasses && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                          มีคาบสอนในเวลาที่ขอออก
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-800">
                        ท่านมีภาระคาบสอนในช่วงเวลาที่ขออนุญาตออกนอกสถานศึกษาหรือไม่? <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                          !hasClasses 
                            ? 'bg-white border-emerald-500 shadow-xs ring-1 ring-emerald-400 font-semibold text-slate-900' 
                            : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-white'
                        }`}>
                          <input
                            type="radio"
                            name="hasClasses"
                            checked={!hasClasses}
                            onChange={() => setHasClasses(false)}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>🟢 ไม่มีคาบสอนในช่วงเวลาดังกล่าว</span>
                        </label>

                        <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                          hasClasses 
                            ? 'bg-amber-100/90 border-amber-500 shadow-xs ring-1 ring-amber-400 font-semibold text-amber-950' 
                            : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-white'
                        }`}>
                          <input
                            type="radio"
                            name="hasClasses"
                            checked={hasClasses}
                            onChange={() => setHasClasses(true)}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span>🟡 มีคาบสอน (ส่งให้ครูสอนแทนกดรับทราบ)</span>
                        </label>
                      </div>
                    </div>

                    {/* If Has Classes: Show Assignment Fields */}
                    {hasClasses && (
                      <div className="pt-3 border-t border-amber-200 space-y-3 animate-in fade-in">
                        <div className="bg-emerald-50/90 p-3 rounded-xl border border-emerald-300 text-xs text-emerald-950 flex items-start gap-2 shadow-2xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block text-emerald-900">💡 นโยบายประหยัดโควต้า LINE (แพ็กเกจฟรี 300 ข้อความ/เดือน):</strong>
                            <span>ครูผู้สอนแทนจะเข้ามากดรับทราบผ่านระบบเว็บนี้ (ไม่ส่งข้อความ LINE เพื่อประหยัดโควต้า) เมื่อครูสอนแทนกดรับทราบแล้ว ระบบจะส่ง LINE ข้อความที่ 1/2 ไปยังหัวหน้าสาขาโดยอัตโนมัติ</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-800 mb-1">
                              เลือกครูผู้สอนแทน <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={substituteTeacherId}
                              onChange={(e) => setSubstituteTeacherId(e.target.value)}
                              required={hasClasses}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium"
                            >
                              <option value="">-- เลือกครูผู้ปฏิบัติการสอนแทน --</option>
                              {candidateSubstituteTeachers.map((t, idx) => (
                                <option key={`sub-teacher-${t.id}-${idx}`} value={t.id}>
                                  {t.name} ({t.position} • {t.branchName})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-800 mb-1">
                              รายวิชา / คาบสอน / ระดับชั้น <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={substituteSubject}
                              onChange={(e) => setSubstituteSubject(e.target.value)}
                              placeholder="เช่น วิชาเครื่องยนต์ดีเซล ปวช.2 คาบ 3-4"
                              required={hasClasses}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-800 mb-1">
                            ภาระงาน / ใบงานที่มอบหมายให้นักศึกษาปฏิบัติ
                          </label>
                          <textarea
                            value={substituteTasks}
                            onChange={(e) => setSubstituteTasks(e.target.value)}
                            rows={2}
                            placeholder="เช่น ให้นักศึกษาทำใบงานบทที่ 4 ในห้องปฏิบัติการ พร้อมเช็กชื่อและส่งงานท้ายคาบ..."
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      หมายเหตุเพิ่มเติม / ภาระงานอื่น
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="เช่น ไม่มีภาระคาบสอนในเวลาดังกล่าว ได้มอบหมายงานไว้แล้ว"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Self-Approval Toggle for Department Head or Admin */}
                {canSelfApprove && (
                  <div className={`p-3.5 rounded-2xl border ${isAdmin ? 'bg-purple-50 border-purple-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={headSelfApprove}
                        onChange={(e) => setHeadSelfApprove(e.target.checked)}
                        className={`w-4 h-4 rounded mt-0.5 cursor-pointer ${isAdmin ? 'text-purple-600' : 'text-emerald-600'}`}
                      />
                      <div>
                        <span className={`font-bold text-xs flex items-center gap-1.5 ${isAdmin ? 'text-purple-950' : 'text-emerald-950'}`}>
                          <span>⚡ อนุมัติตัวเองทันที (Self-Approval)</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${isAdmin ? 'bg-purple-200 text-purple-800' : 'bg-emerald-200 text-emerald-800'}`}>
                            {isAdmin ? 'สิทธิ์ผู้ดูแลระบบ (Admin)' : 'สิทธิ์หัวหน้าสาขา'}
                          </span>
                        </span>
                        <span className={`text-[11px] block mt-0.5 ${isAdmin ? 'text-purple-700' : 'text-emerald-700'}`}>
                          {isAdmin 
                            ? 'ผู้ดูแลระบบ (Admin) มีอำนาจอนุมัติตัวเองได้ทันที เมื่อกดยื่นคำขอจะได้รับสถานะ "อนุมัติแล้ว" พร้อมรับบัตรผ่าน QR Code ทันที' 
                            : 'หัวหน้าสาขามีอำนาจอนุมัติตนเองได้ทันที เมื่อกดยื่นคำขอจะได้รับสถานะ "อนุมัติแล้ว" พร้อมรับบัตรผ่าน QR Code ทันที'}
                        </span>
                      </div>
                    </label>
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>
                      {canSelfApprove && headSelfApprove
                        ? 'เมื่อกดยืนยัน ระบบจะอนุมัติทันทีและออกบัตรผ่าน QR Code'
                        : `เมื่อกดยืนยัน ระบบจะส่งคำขอไปยัง ${autoApproverName} ทันที`}
                    </span>
                  </div>

                  <button
                    type="submit"
                    className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold text-sm transition-all shadow-md cursor-pointer ${
                      canSelfApprove && headSelfApprove
                        ? (isAdmin ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/25' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25')
                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
                    }`}
                  >
                    {canSelfApprove && headSelfApprove ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>ยื่นและอนุมัติตัวเองทันที</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>ส่งคำขอออกนอกสถานศึกษา</span>
                      </>
                    )}
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
            <span className="text-[11px] font-semibold bg-white text-blue-800 border border-blue-200 px-3 py-1 rounded-full shrink-0 shadow-2xs">
              🔒 สิทธิ์เฉพาะตนเอง ({userRequests.length} รายการ)
            </span>
          </div>
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  filterStatus === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                ทั้งหมด ({userRequests.length})
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

                        {/* Substitute Teaching Status */}
                        {req.hasClasses && (
                          <div className="bg-amber-50/90 p-2.5 rounded-xl border border-amber-200 text-xs space-y-1 mt-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-900 flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                                <span>{req.substituteSubject || 'มีคาบสอนแทน'}</span>
                              </span>
                              {req.substituteStatus === 'acknowledged' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  <CheckSquare className="w-3 h-3 text-emerald-600" />
                                  ครูสอนแทนรับทราบแล้ว
                                </span>
                              )}
                              {req.substituteStatus === 'pending' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                                  <Clock className="w-3 h-3 text-amber-700" />
                                  รอครูสอนแทนกดรับทราบ
                                </span>
                              )}
                              {req.substituteStatus === 'declined' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  ครูสอนแทนไม่สะดวก
                                </span>
                              )}
                            </div>
                            <div className="text-slate-700 text-[11px]">
                              ครูผู้สอนแทน: <strong>{req.substituteTeacherName}</strong>
                            </div>
                            {req.substituteTasks && (
                              <div className="text-slate-500 text-[10px]">
                                ภาระงาน: {req.substituteTasks}
                              </div>
                            )}
                          </div>
                        )}

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
                        {isPending && canSelfApprove && onApprove && (
                          <button
                            onClick={() => onApprove(req.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs transition-all"
                            title="อนุมัติคำขอนี้ด้วยตนเองทันที"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>⚡ อนุมัติตัวเอง</span>
                          </button>
                        )}

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

      {/* Subtab 3: Substitute Tasks Assigned to Me */}
      {activeSubTab === 'substitute-tasks' && (
        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <Handshake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  รายการภาระงานสอนแทนที่มอบหมายถึงท่าน ({substituteRequestsForMe.length} รายการ)
                </h3>
                <p className="text-slate-600 mt-0.5">
                  เมื่อเพื่อนครูมีคาบสอนและขอออกนอกสถานศึกษา ท่านสามารถกดรับทราบในระบบนี้ได้ทันที (ไม่เสียโควต้า LINE 300 ครั้ง/ด.) เมื่อรับทราบแล้วระบบจะส่ง LINE ข้อความที่ 1 ให้หัวหน้าสาขา
                </p>
              </div>
            </div>

            {pendingSubstituteForMe.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500 text-white font-bold text-xs shadow-xs shrink-0">
                <AlertTriangle className="w-4 h-4" />
                <span>รอท่านกดรับทราบ {pendingSubstituteForMe.length} รายการ</span>
              </span>
            )}
          </div>

          {substituteRequestsForMe.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-700">ไม่มีภาระงานสอนแทนที่มอบหมายถึงท่านในขณะนี้</h3>
              <p className="text-xs text-slate-400 mt-1">
                เมื่อมีเพื่อนครูระบุชื่อท่านเป็นครูผู้สอนแทน รายการจะแสดงขึ้นที่นี่โดยอัตโนมัติ
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {substituteRequestsForMe.map((req, idx) => {
                const isPendingAck = req.substituteStatus === 'pending';
                const isAcked = req.substituteStatus === 'acknowledged';
                const isDeclined = req.substituteStatus === 'declined';

                return (
                  <div
                    key={`sub-req-me-${req.id}-${idx}`}
                    className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                      isPendingAck ? 'border-2 border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Card Top */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <span className="text-[11px] font-mono text-slate-400 block">{req.id}</span>
                          <h4 className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                            <span>ผู้ขอ: <strong>{req.userName}</strong></span>
                            <span className="text-xs font-normal text-slate-500">({req.branchName})</span>
                          </h4>
                        </div>

                        <div>
                          {isPendingAck && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              รอท่านกดรับทราบ
                            </span>
                          )}
                          {isAcked && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              ท่านรับทราบแล้ว
                            </span>
                          )}
                          {isDeclined && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              ท่านแจ้งไม่สะดวก
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Detail */}
                      <div className="space-y-2 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>วันที่สอนแทน: <strong>{req.exitDate}</strong> เวลา: <strong>{req.exitTime} – {req.returnTime} น.</strong></span>
                        </div>

                        <div className="bg-amber-100/60 p-2.5 rounded-lg border border-amber-200/80 text-amber-950 space-y-1">
                          <div className="font-bold flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-amber-700 shrink-0" />
                            <span>วิชาที่ขอให้สอนแทน: {req.substituteSubject || 'ภาระงานสอนประจำวัน'}</span>
                          </div>
                          {req.substituteTasks && (
                            <div className="text-[11px] text-slate-700">
                              <span className="font-semibold text-slate-900">งานที่มอบหมายให้นักเรียน:</span> {req.substituteTasks}
                            </div>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                          สถานที่ครูไป: {req.destination} (เหตุผล: {req.reason})
                        </div>

                        {isDeclined && req.substituteDeclineReason && (
                          <div className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                            เหตุผลที่ไม่สะดวก: {req.substituteDeclineReason}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                      <span className="text-[11px] text-slate-400">
                        สถานะคำขอ: {req.status === 'approved' ? '🟢 อนุมัติแล้ว' : req.status === 'pending' ? '🟡 รอหัวหน้าอนุมัติ' : '🔴 ไม่อนุมัติ'}
                      </span>

                      {isPendingAck ? (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <button
                            onClick={() => {
                              setDecliningReqId(req.id);
                              setDeclineReason('');
                            }}
                            className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer transition-all text-center"
                          >
                            ไม่สะดวกสอนแทน
                          </button>
                          <button
                            onClick={() => onAcknowledgeSubstitute(req.id)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer transition-all text-center"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>✅ กดรับทราบการสอนแทน</span>
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">
                          {isAcked ? `รับทราบเมื่อ: ${req.substituteAcknowledgedAt || '-'}` : 'ดำเนินการแล้ว'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Decline Substitute Dialog Modal */}
      {decliningReqId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-rose-700 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5" />
              ระบุเหตุผลที่ไม่สะดวกปฏิบัติการสอนแทน
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              ระบบจะแจ้งกลับไปยังครูผู้ขอเพื่อให้จัดหาครูสอนแทนท่านอื่น
            </p>

            <form onSubmit={handleConfirmDecline} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เหตุผลที่ไม่สะดวก <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  rows={3}
                  placeholder="เช่น ติดคาบสอนในเวลาเดียวกัน, ติดภารกิจนิเทศนักศึกษาฝึกงาน..."
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDecliningReqId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-sm"
                >
                  ยืนยันแจ้งไม่สะดวก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
