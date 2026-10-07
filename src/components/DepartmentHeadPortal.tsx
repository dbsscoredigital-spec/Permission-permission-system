import React, { useState } from 'react';
import { User, ExitRequest, Branch } from '../types';
import { 
  Building2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Eye, 
  Calendar, 
  MapPin, 
  Car, 
  User as UserIcon, 
  MessageSquare,
  ShieldCheck,
  Send,
  FileCheck2,
  CheckCircle2,
  X,
  PlusCircle,
  FileText,
  Printer,
  QrCode,
  Sparkles,
  BookOpen,
  Search,
  Filter,
  Users,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DepartmentHeadPortalProps {
  currentUser: User;
  users: User[];
  branches: Branch[];
  requests: ExitRequest[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string, reason: string) => void;
  onSubmitRequest: (reqData: any) => void;
  onOpenLineModal?: () => void;
  onViewQrPass: (req: ExitRequest) => void;
  onPrintSlip: (req: ExitRequest) => void;
}

export const DepartmentHeadPortal: React.FC<DepartmentHeadPortalProps> = ({
  currentUser,
  users,
  branches,
  requests,
  onApprove,
  onReject,
  onSubmitRequest,
  onViewQrPass,
  onPrintSlip
}) => {
  // History filter state (Strictly scoped to Department Head's own branch only)
  const [historySearchTerm, setHistorySearchTerm] = useState<string>('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');

  // Requests assigned to this department head to review (teachers in their branch)
  const pendingTeacherRequests = requests.filter(r => 
    r.assignedApproverId === currentUser.id && r.status === 'pending'
  );

  // Helper to determine if a request belongs to this department head's branch
  const isBranchRequest = (r: ExitRequest) => {
    const headBranchId = (currentUser.branchId || '').trim().toLowerCase();
    const headBranchName = (currentUser.branchName || '').trim().toLowerCase();
    const reqBranchId = (r.branchId || '').trim().toLowerCase();
    const reqBranchName = (r.branchName || '').trim().toLowerCase();

    return (
      (headBranchId && reqBranchId === headBranchId) ||
      (headBranchName && reqBranchName === headBranchName) ||
      r.assignedApproverId === currentUser.id ||
      r.userId === currentUser.id
    );
  };

  // Entry & exit history STRICTLY for department head's own branch
  const branchHistoryRequests = requests.filter(isBranchRequest);

  const filteredHistoryRequests = branchHistoryRequests.filter(r => {
    let matchesStatus = true;
    if (historyStatusFilter === 'exited') {
      matchesStatus = Boolean(r.actualExitTime && !r.actualReturnTime);
    } else if (historyStatusFilter === 'returned') {
      matchesStatus = Boolean(r.actualReturnTime);
    } else if (historyStatusFilter === 'approved') {
      matchesStatus = r.status === 'approved';
    } else if (historyStatusFilter === 'rejected') {
      matchesStatus = r.status === 'rejected';
    } else if (historyStatusFilter === 'pending') {
      matchesStatus = r.status === 'pending';
    }

    const search = historySearchTerm.toLowerCase();
    const matchesSearch = 
      (r.userName || '').toLowerCase().includes(search) ||
      (r.destination || '').toLowerCase().includes(search) ||
      (r.reason || '').toLowerCase().includes(search) ||
      (r.id || '').toLowerCase().includes(search) ||
      (r.branchName && r.branchName.toLowerCase().includes(search));

    return matchesStatus && matchesSearch;
  });

  const totalDecidedHistoryCount = branchHistoryRequests.length;

  // Requests submitted BY the department head themselves
  const myHeadRequests = requests.filter(r => r.userId === currentUser.id);

  // Selected Request for Review Modal
  const [selectedReq, setSelectedReq] = useState<ExitRequest | null>(null);
  
  // Rejection Dialog State
  const [rejectingReq, setRejectingReq] = useState<ExitRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Subtab: 'pending' | 'history' | 'my-requests'
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'history' | 'my-requests'>('pending');

  // Form State for Head Request
  const today = new Date().toISOString().slice(0, 10);
  const [headExitDate, setHeadExitDate] = useState(today);
  const [headExitTime, setHeadExitTime] = useState('13:30');
  const [headReturnTime, setHeadReturnTime] = useState('16:30');
  const [headDestination, setHeadDestination] = useState('');
  const [headReason, setHeadReason] = useState('');
  const [headTravelMethod, setHeadTravelMethod] = useState('ตามภารกิจราชการ');
  const [headVehiclePlate, setHeadVehiclePlate] = useState('');
  const [headCompanions, setHeadCompanions] = useState('');
  const [headNotes, setHeadNotes] = useState('');
  const [headHasClasses, setHeadHasClasses] = useState(false);
  const [headSubTeacherId, setHeadSubTeacherId] = useState('');
  const [headSubSubject, setHeadSubSubject] = useState('');
  const [headSubTasks, setHeadSubTasks] = useState('');
  const [headSelfApprove, setHeadSelfApprove] = useState(true);
  const [showCreateFormModal, setShowCreateFormModal] = useState(false);

  // Candidate substitute teachers (teachers in the same college)
  const candidateSubstituteTeachers = users.filter(u => u.id !== currentUser.id && (u.role === 'teacher' || u.role === 'approver'));

  const handleApproveAction = (reqId: string) => {
    onApprove(reqId);
    setSelectedReq(null);
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.5 }
      });
    } catch {
      // ignore
    }
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingReq) return;
    if (!rejectionReason.trim()) {
      alert('กรุณาระบุเหตุผลที่ไม่อนุมัติ');
      return;
    }
    onReject(rejectingReq.id, rejectionReason.trim());
    setRejectingReq(null);
    setSelectedReq(null);
    setRejectionReason('');
  };

  // Quick fill example for department head
  const handleFastFillHeadExample = () => {
    setHeadExitDate(today);
    setHeadExitTime('13:30');
    setHeadReturnTime('16:30');
    setHeadDestination('สถาบันพัฒนาฝีมือแรงงาน ภาค 1 สมุทรปราการ');
    setHeadReason('เข้าร่วมประชุมคณะกรรมการจัดสอบมาตรฐานวิชาชีพฝีมือแรงงานแห่งชาติ สาขาวิชา' + currentUser.branchName);
    setHeadTravelMethod('ตามภารกิจราชการ');
    setHeadVehiclePlate('');
    setHeadCompanions('');
    setHeadNotes('หัวหน้าสาขายื่นคำขอและอนุมัติตัวเองเรียบร้อยทันที');
    setHeadHasClasses(false);
    setHeadSelfApprove(true);
  };

  const handleHeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headDestination.trim() || !headReason.trim()) {
      alert('กรุณากรอกสถานที่และเหตุผลการขออนุญาต');
      return;
    }

    if (headHasClasses && !headSubTeacherId) {
      alert('กรุณาเลือกครูผู้สอนแทนเนื่องจากท่านระบุว่ามีคาบสอน');
      return;
    }

    const selectedSub = candidateSubstituteTeachers.find(t => t.id === headSubTeacherId);

    const payload = {
      userId: currentUser.id,
      userName: currentUser.name,
      branchId: currentUser.branchId,
      branchName: currentUser.branchName,
      position: currentUser.position,
      userPhone: '',
      exitDate: headExitDate,
      exitTime: headExitTime,
      returnTime: headReturnTime,
      destination: headDestination,
      reason: headReason,
      travelMethod: headTravelMethod,
      vehiclePlate: headVehiclePlate,
      companions: headCompanions,
      notes: headNotes || (headSelfApprove ? 'คำขอออกนอกสถานศึกษาของหัวหน้าสาขา (อนุมัติตนเองทันที)' : 'คำขอออกนอกสถานศึกษาของหัวหน้าสาขา'),
      hasClasses: headHasClasses,
      substituteTeacherId: headHasClasses ? headSubTeacherId : undefined,
      substituteTeacherName: headHasClasses && selectedSub ? selectedSub.name : undefined,
      substituteSubject: headHasClasses ? headSubSubject : undefined,
      substituteTasks: headHasClasses ? headSubTasks : undefined,
      substituteStatus: headHasClasses ? (headSelfApprove ? 'acknowledged' : 'pending' as const) : ('not_required' as const),
      selfApprove: headSelfApprove
    };

    onSubmitRequest(payload);
    setShowCreateFormModal(false);
    setActiveSubTab('my-requests');

    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

    // Reset Form
    setHeadDestination('');
    setHeadReason('');
    setHeadNotes('');
    setHeadHasClasses(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - Strict Branch Scoping Display + Head Leave Submission */}
      <div className="bg-linear-to-r from-emerald-800 to-teal-900 rounded-2xl p-4 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
              <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                ผู้อนุมัติประจำสาขา: {currentUser.branchName}
              </span>
              <span className="bg-white/10 text-white/80 px-2 py-0.5 rounded-full text-[11px] sm:text-xs">
                แยกสิทธิ์ความปลอดภัย 100%
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-bold tracking-tight">
              ระบบพิจารณาอนุมัติ & ยื่นคำขอ: สาขาวิชา{currentUser.branchName}
            </h2>
            <p className="text-[11px] sm:text-xs text-emerald-100/90 mt-1 max-w-xl leading-relaxed">
              ยินดีต้อนรับ <strong>{currentUser.name}</strong> ({currentUser.position}) ท่านสามารถพิจารณาอนุมัติคำขอของครูในสาขา และ<strong>สามารถยื่นขอออกนอกสถานศึกษาและอนุมัติตัวเองได้เลยทันที</strong>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              onClick={() => {
                setActiveSubTab('my-requests');
                setShowCreateFormModal(true);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-slate-900" />
              <span>➕ หัวหน้าสาขายื่นขอออกนอก</span>
            </button>
          </div>
        </div>

        {/* Subtle decorative circles */}
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
      </div>

      {/* Stats KPI Cards (Mobile-optimized 3 columns) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white rounded-2xl p-2.5 sm:p-4 border border-amber-200/80 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 block truncate">รอพิจารณา</span>
            <span className="text-base sm:text-2xl font-black text-amber-600 mt-0.5 sm:mt-1 block">
              {pendingTeacherRequests.length} <span className="text-[10px] sm:text-xs font-normal">รายการ</span>
            </span>
          </div>
          <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-2.5 sm:p-4 border border-emerald-200/80 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 block truncate">ประวัติเฉพาะสาขา</span>
            <span className="text-base sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1 block">
              {totalDecidedHistoryCount} <span className="text-[10px] sm:text-xs font-normal">รายการ</span>
            </span>
            <span className="text-[9px] text-emerald-600 hidden sm:block truncate">เฉพาะสาขาวิชา{currentUser.branchName}</span>
          </div>
          <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Users className="w-3.5 h-3.5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-2.5 sm:p-4 border border-indigo-200/80 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 block truncate">คำขอฉัน</span>
            <span className="text-base sm:text-2xl font-black text-indigo-600 mt-0.5 sm:mt-1 block">
              {myHeadRequests.length} <span className="text-[10px] sm:text-xs font-normal">รายการ</span>
            </span>
          </div>
          <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FileText className="w-3.5 h-3.5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Tab Navigators (Mobile swipeable) */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1 gap-2">
        <div className="flex items-center overflow-x-auto gap-1.5 sm:gap-2 no-scrollbar">
          <button
            onClick={() => setActiveSubTab('pending')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'pending'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>รออนุมัติ ({pendingTeacherRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>ประวัติสาขา ({totalDecidedHistoryCount})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('my-requests')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'my-requests'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>คำขอฉัน ({myHeadRequests.length})</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 hidden sm:inline-block shrink-0">
          สาขาวิชา: <strong>{currentUser.branchName}</strong>
        </span>
      </div>

      {/* Subtab 1: Pending Requests Table / Cards */}
      {activeSubTab === 'pending' && (
        <div className="space-y-4">
          {pendingTeacherRequests.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">ไม่มีคำขอค้างรออนุมัติ</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                คำขอทั้งหมดของสาขาวิชา{currentUser.branchName}ได้รับการพิจารณาเรียบร้อยแล้ว เมื่อครูในสาขายื่นคำขอใหม่ ระบบจะแจ้งเตือนมายังหน้านี้และ LINE อัตโนมัติ
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingTeacherRequests.map(req => (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border-2 border-amber-300 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-all"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="text-[11px] font-mono font-bold text-slate-400 block">
                          {req.id}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                          <span>{req.userName}</span>
                          <span className="text-xs font-normal text-slate-500">({req.position})</span>
                        </h4>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                        รอท่านอนุมัติ
                      </span>
                    </div>

                    {/* Request Details */}
                    <div className="space-y-2.5 text-xs text-slate-700 bg-amber-50/40 p-3.5 rounded-xl border border-amber-100">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>วันที่ออก: <strong>{req.exitDate}</strong> เวลา: <strong>{req.exitTime} – {req.returnTime} น.</strong></span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>สถานที่: <strong>{req.destination}</strong></span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-slate-500 shrink-0">เหตุผล:</span>
                        <span className="text-slate-900 font-medium">{req.reason}</span>
                      </div>

                      {/* Teaching Duties Status */}
                      <div className="pt-1.5 border-t border-amber-200/80">
                        {req.hasClasses ? (
                          <div className="bg-amber-100/70 p-2 rounded-lg text-amber-950 space-y-0.5">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span>📚 คาบสอน: {req.substituteSubject}</span>
                              {req.substituteStatus === 'acknowledged' && (
                                <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-bold text-[10px]">
                                  ✓ ครูสอนแทนรับทราบแล้ว
                                </span>
                              )}
                              {req.substituteStatus === 'pending' && (
                                <span className="text-amber-800 bg-amber-200 px-1.5 py-0.2 rounded font-bold text-[10px] animate-pulse">
                                  ⏳ รอครูสอนแทนกดรับทราบ
                                </span>
                              )}
                              {req.substituteStatus === 'declined' && (
                                <span className="text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded font-bold text-[10px]">
                                  ✕ ครูสอนแทนไม่สะดวก
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-700">
                              ครูผู้สอนแทน: <strong>{req.substituteTeacherName}</strong>
                            </div>
                            {req.substituteTasks && (
                              <div className="text-[10px] text-slate-500">
                                งานที่มอบหมาย: {req.substituteTasks}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] text-emerald-700 font-medium">
                            ✓ ไม่มีภาระคาบสอนในช่วงเวลาดังกล่าว
                          </div>
                        )}
                      </div>

                      {req.travelMethod && req.travelMethod !== 'ตามภารกิจราชการ' && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Car className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>เดินทางโดย: {req.travelMethod} {req.vehiclePlate && `(${req.vehiclePlate})`}</span>
                        </div>
                      )}
                      {req.companions && (
                        <div className="text-slate-500 text-[11px] pt-1 border-t border-amber-100">
                          ผู้ร่วมเดินทาง: {req.companions}
                        </div>
                      )}
                      {req.notes && (
                        <div className="text-slate-500 text-[11px]">
                          หมายเหตุ: {req.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setSelectedReq(req)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>ดูรายละเอียดเต็ม</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setRejectingReq(req);
                          setRejectionReason('');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>❌ ไม่อนุมัติ</span>
                      </button>

                      {req.hasClasses && req.substituteStatus === 'pending' ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-100/90 text-amber-900 border border-amber-300"
                          title="ต้องรอครูผู้สอนแทนกดรับทราบในระบบเว็บก่อน ระบบจึงจะส่ง LINE แจ้งเตือนและเปิดให้อนุมัติ"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                          <span>รอครูสอนแทนรับทราบก่อน</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApproveAction(req.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/30 transition-all cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>✅ อนุมัติ</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subtab 2: Branch History (Approved & Rejected & Gate Scanned - Scoped strictly to own branch) */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อครู, สถานที่, รหัสคำขอในสาขา..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1.5 rounded-xl font-medium">
                <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>เฉพาะสาขา: <strong>{currentUser.branchName}</strong></span>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium">สถานะ:</span>
                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
                >
                  <option value="all">สถานะทั้งหมดในสาขา</option>
                  <option value="exited">🟡 กำลังอยู่นอก (สแกนออกแล้ว)</option>
                  <option value="returned">🟢 กลับเข้ามาแล้ว (สแกนกลับแล้ว)</option>
                  <option value="approved">✅ อนุมัติแล้ว</option>
                  <option value="pending">⏳ รออนุมัติ</option>
                  <option value="rejected">❌ ไม่อนุมัติ</option>
                </select>
              </div>

              {(historySearchTerm || historyStatusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setHistorySearchTerm('');
                    setHistoryStatusFilter('all');
                  }}
                  className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  ประวัติการเข้า-ออกของบุคลากร สาขาวิชา{currentUser.branchName} ({filteredHistoryRequests.length} รายการ)
                </h3>
              </div>
              <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-medium inline-flex items-center gap-1 w-max">
                🔒 ดูได้เฉพาะสาขาตนเองเท่านั้น
              </span>
            </div>

            {filteredHistoryRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <span>ไม่พบประวัติการเข้า-ออกของสาขาวิชา{currentUser.branchName} ตามเงื่อนไขที่เลือก</span>
              </div>
            ) : (
              <>
                {/* Mobile Cards View (Visible on small screens) */}
                <div className="sm:hidden p-3 space-y-2.5">
                  {filteredHistoryRequests.map((req, idx) => (
                    <div
                      key={`head-hist-m-${req.id}-${idx}`}
                      className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-[10px] text-slate-400 block">{req.id}</span>
                          <strong className="text-slate-900 text-xs">{req.userName}</strong>
                          <span className="text-[11px] text-indigo-700 font-medium block">
                            {req.branchName} • {req.position}
                          </span>
                        </div>
                        {req.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            <CheckCircle className="w-3 h-3" /> อนุมัติแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                            <XCircle className="w-3 h-3" /> ไม่อนุมัติ
                          </span>
                        )}
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
                            - ยังไม่สแกนผ่านประตู รปภ. -
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          onClick={() => setSelectedReq(req)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium hover:bg-slate-200 cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>รายละเอียด</span>
                        </button>
                        {req.status === 'approved' && (
                          <>
                            <button
                              onClick={() => onViewQrPass(req)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium hover:bg-emerald-100 cursor-pointer flex items-center gap-1"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>QR</span>
                            </button>
                            <button
                              onClick={() => onPrintSlip(req)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium hover:bg-slate-200 cursor-pointer flex items-center gap-1"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>พิมพ์</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Full Table View (Hidden on mobile) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">ผู้ขอ / สาขาวิชา</th>
                        <th className="px-4 py-3">วัน-เวลาที่ขอออก</th>
                        <th className="px-4 py-3">สถานที่ / เหตุผล</th>
                        <th className="px-4 py-3">เวลาสแกนประตู รปภ. (เข้า-ออกจริง)</th>
                        <th className="px-4 py-3">สถานะคำขอ</th>
                        <th className="px-4 py-3 text-right">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredHistoryRequests.map(req => (
                        <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono text-[10px] text-slate-400 block">{req.id}</span>
                            <strong className="text-slate-900 text-xs block">{req.userName}</strong>
                            <span className="text-[11px] text-indigo-700 font-medium">{req.branchName}</span>
                            <span className="text-[10px] text-slate-400 ml-1">({req.position})</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-800 block">{req.exitDate}</span>
                            <span className="text-slate-500">{req.exitTime} - {req.returnTime} น.</span>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <span className="font-medium text-slate-800 block truncate">{req.destination}</span>
                            <span className="text-slate-500 text-[11px] block truncate">{req.reason}</span>
                            {req.travelMethod && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">{req.travelMethod}</span>
                            )}
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
                                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 block w-max">
                                    กำลังอยู่นอก
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">- ยังไม่สแกนออก -</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {req.status === 'approved' ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle className="w-3 h-3" /> อนุมัติแล้ว
                                </span>
                                {req.approvedBy && (
                                  <span className="text-[10px] text-slate-400 block truncate max-w-[130px]" title={req.approvedBy}>
                                    โดย: {req.approvedBy}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-3 h-3" /> ไม่อนุมัติ
                                </span>
                                {req.rejectionReason && (
                                  <span className="text-rose-600 block text-[10px] truncate max-w-[130px]" title={req.rejectionReason}>
                                    {req.rejectionReason}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedReq(req)}
                                className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                                title="ดูรายละเอียดคำขอ"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {req.status === 'approved' && (
                                <>
                                  <button
                                    onClick={() => onViewQrPass(req)}
                                    className="p-1 rounded-md text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 cursor-pointer"
                                    title="ตรวจ QR Code"
                                  >
                                    <QrCode className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => onPrintSlip(req)}
                                    className="p-1 rounded-md text-slate-600 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                                    title="พิมพ์ใบอนุญาต"
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
              </>
            )}
          </div>
        </div>
      )}

      {/* Subtab 3: My Exit Requests as Department Head */}
      {activeSubTab === 'my-requests' && (
        <div className="space-y-4">
          {/* Info Card on Department Head Exit Requests */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-indigo-950">
                  สิทธิ์การอนุมัติตนเองสำหรับหัวหน้าสาขาวิชา
                </h4>
                <p className="text-xs text-indigo-800/90 mt-0.5 leading-relaxed">
                  หัวหน้าสาขาสามารถยื่นขอออกนอกสถานศึกษาและ<strong>อนุมัติตัวเองได้เลยทันที</strong> พร้อมรับบัตรผ่าน QR Code สำหรับสแกนผ่านประตูและพิมพ์ใบอนุญาตได้ทันที
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateFormModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/25 shrink-0 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>สร้างคำขอใหม่</span>
            </button>
          </div>

          {/* List of Department Head's Requests */}
          {myHeadRequests.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">ท่านยังไม่เคยยื่นคำขอออกนอกสถานศึกษา</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                เมื่อท่านมีภารกิจราชการ ประชุมภายนอก หรือติดต่อสถานประกอบการ สามารถกดยื่นคำขอและอนุมัติตัวเองได้ทันที
              </p>
              <button
                onClick={() => setShowCreateFormModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xs hover:bg-indigo-700 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>ยื่นคำขอแรกของท่าน</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myHeadRequests.map(req => (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">{req.id}</span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">{req.destination}</h4>
                      </div>
                      {req.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-3.5 h-3.5 animate-spin" /> รออนุมัติ
                        </span>
                      )}
                      {req.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle className="w-3.5 h-3.5" /> อนุมัติตนเองแล้ว
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                          <XCircle className="w-3.5 h-3.5" /> ไม่อนุมัติ
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3">
                      <div><strong>วันที่ออก:</strong> {req.exitDate} เวลา {req.exitTime} – {req.returnTime} น.</div>
                      <div><strong>เหตุผล:</strong> {req.reason}</div>
                      <div><strong>ผู้อนุมัติ:</strong> {req.assignedApproverName}</div>
                      {req.travelMethod && (
                        <div><strong>การเดินทาง:</strong> {req.travelMethod} {req.vehiclePlate && `(${req.vehiclePlate})`}</div>
                      )}
                      {req.approvedAt && (
                        <div className="text-emerald-700"><strong>อนุมัติเมื่อ:</strong> {req.approvedAt} ({req.approvedBy})</div>
                      )}
                      {req.rejectionReason && (
                        <div className="text-rose-700"><strong>เหตุผลที่ไม่อนุมัติ:</strong> {req.rejectionReason}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    {req.status === 'pending' && (
                      <button
                        onClick={() => handleApproveAction(req.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                        title="หัวหน้าสาขาสามารถกดอนุมัติตัวเองได้ทันที"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>✅ อนุมัติตัวเองทันที</span>
                      </button>
                    )}

                    {req.status === 'approved' && (
                      <>
                        <button
                          onClick={() => onViewQrPass(req)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>ดูบัตรผ่าน QR</span>
                        </button>
                        <button
                          onClick={() => onPrintSlip(req)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>พิมพ์ใบอนุญาต</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Exit Request for Department Head */}
      {showCreateFormModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative my-8">
            <button
              onClick={() => setShowCreateFormModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ยื่นคำขอออกนอกสถานศึกษา (สำหรับหัวหน้าสาขา)
                  </h3>
                  <p className="text-xs text-slate-500">
                    ผู้ขอ: {currentUser.name} • {currentUser.position}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFastFillHeadExample}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer"
                title="เติมตัวอย่างเข้าร่วมประชุมราชการภายนอก"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>⚡ ตัวอย่างด่วน</span>
              </button>
            </div>

            {/* Self-Approval Authority Notice */}
            <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold block">สิทธิ์หัวหน้าสาขาวิชา: อนุมัติตัวเองได้ทันที</span>
                <span>หัวหน้าสาขามีอำนาจอนุมัติคำขอออกนอกสถานศึกษาของตนเองได้ทันที พร้อมรับบัตรผ่าน QR Code สำหรับสแกนผ่านประตู</span>
              </div>
            </div>

            <form onSubmit={handleHeadSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">วันที่ขอออก <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    value={headExitDate}
                    onChange={(e) => setHeadExitDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เวลาออก <span className="text-rose-500">*</span></label>
                  <input
                    type="time"
                    value={headExitTime}
                    onChange={(e) => setHeadExitTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เวลากลับ <span className="text-rose-500">*</span></label>
                  <input
                    type="time"
                    value={headReturnTime}
                    onChange={(e) => setHeadReturnTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">สถานที่ไป <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={headDestination}
                  onChange={(e) => setHeadDestination(e.target.value)}
                  placeholder="เช่น สถาบันพัฒนาฝีมือแรงงาน ภาค 1, บริษัท โตโยต้า มอเตอร์ ประเทศไทย"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">เหตุผลความจำเป็น <span className="text-rose-500">*</span></label>
                <textarea
                  value={headReason}
                  onChange={(e) => setHeadReason(e.target.value)}
                  rows={2}
                  placeholder="เช่น เข้าร่วมประชุมคณะกรรมการจัดทำหลักสูตรวิชาชีพระยะสั้นร่วมกับสถานประกอบการ"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Teaching Duties Option */}
              <div className="pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={headHasClasses}
                    onChange={(e) => setHeadHasClasses(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span>มีภาระคาบสอนในช่วงเวลาดังกล่าว (ต้องมอบหมายครูสอนแทน)</span>
                </label>

                {headHasClasses && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        เลือกครูผู้สอนแทน <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={headSubTeacherId}
                        onChange={(e) => setHeadSubTeacherId(e.target.value)}
                        required={headHasClasses}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                      >
                        <option value="">-- เลือกครูในสถานศึกษา --</option>
                        {candidateSubstituteTeachers.map((u, idx) => (
                          <option key={`head-sub-${u.id}-${idx}`} value={u.id}>
                            {u.name} ({u.position} - {u.branchName})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">วิชา/ชั้นเรียนที่สอนแทน</label>
                      <input
                        type="text"
                        value={headSubSubject}
                        onChange={(e) => setHeadSubSubject(e.target.value)}
                        placeholder="เช่น วิชาเทคโนโลยียานยนต์ ปวส.1 ห้อง 2"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">งานหรือใบงานที่มอบหมาย</label>
                      <input
                        type="text"
                        value={headSubTasks}
                        onChange={(e) => setHeadSubTasks(e.target.value)}
                        placeholder="เช่น มอบหมายใบงานบทที่ 3 ให้นักศึกษาทำส่ง"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
                <input
                  type="text"
                  value={headNotes}
                  onChange={(e) => setHeadNotes(e.target.value)}
                  placeholder="เช่น ประสานงานหน่วยงานภายนอกไว้เรียบร้อยแล้ว"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Self-Approval Toggle Option */}
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={headSelfApprove}
                    onChange={(e) => setHeadSelfApprove(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                      <span>⚡ อนุมัติตัวเองทันที (Self-Approval)</span>
                      <span className="bg-emerald-200 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-bold">สิทธิ์หัวหน้าสาขา</span>
                    </span>
                    <span className="text-[11px] text-emerald-700 block mt-0.5">
                      หัวหน้าสาขามีอำนาจอนุมัติตัวเองได้เลยทันที โดยระบบจะบันทึกสถานะ "อนุมัติแล้ว" และออกบัตรผ่าน QR Code ให้ทันทีโดยไม่ต้องรอผู้อื่น
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateFormModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-500/25 cursor-pointer flex items-center gap-1.5"
                >
                  {headSelfApprove ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>ยื่นและอนุมัติตัวเองทันที</span>
                    </>
                  ) : (
                    <span>ยืนยันยื่นคำขอ</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setSelectedReq(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  พิจารณาคำขอออกนอกสถานศึกษา
                </h3>
                <p className="text-xs text-slate-500">รหัสคำขอ: {selectedReq.id}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-6">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block">ผู้ขอ:</span>
                  <strong className="text-slate-900 text-sm">{selectedReq.userName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">สาขาวิชา:</span>
                  <strong className="text-slate-900">{selectedReq.branchName}</strong>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block">วัน-เวลา:</span>
                <span className="text-slate-800 font-semibold">{selectedReq.exitDate} เวลา {selectedReq.exitTime} – {selectedReq.returnTime} น.</span>
              </div>

              <div>
                <span className="text-slate-400 block">สถานที่ไป:</span>
                <span className="text-slate-800 font-semibold">{selectedReq.destination}</span>
              </div>

              <div>
                <span className="text-slate-400 block">เหตุผลความจำเป็น:</span>
                <p className="text-slate-800 mt-0.5 leading-relaxed">{selectedReq.reason}</p>
              </div>

              {/* Substitute Teaching Details */}
              <div className="bg-amber-100/70 p-3 rounded-xl border border-amber-200">
                <span className="text-amber-900 font-bold block mb-1">
                  📚 ภาระงานสอนและการสอนแทน:
                </span>
                {selectedReq.hasClasses ? (
                  <div className="space-y-1 text-slate-800">
                    <div>วิชาที่ขอให้สอนแทน: <strong>{selectedReq.substituteSubject}</strong></div>
                    <div>ครูผู้สอนแทน: <strong>{selectedReq.substituteTeacherName}</strong></div>
                    {selectedReq.substituteTasks && (
                      <div className="text-slate-600 text-[11px]">งานที่มอบหมาย: {selectedReq.substituteTasks}</div>
                    )}
                    <div className="pt-1 flex items-center gap-1 font-semibold text-[11px]">
                      สถานะการรับทราบของครูสอนแทน:
                      {selectedReq.substituteStatus === 'acknowledged' && (
                        <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                          ✓ รับทราบแล้ว ({selectedReq.substituteAcknowledgedAt || ''})
                        </span>
                      )}
                      {selectedReq.substituteStatus === 'pending' && (
                        <span className="text-amber-800 bg-amber-200 px-2 py-0.5 rounded font-bold">
                          ⏳ รอครูสอนแทนกดรับทราบ
                        </span>
                      )}
                      {selectedReq.substituteStatus === 'declined' && (
                        <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded font-bold">
                          ✕ ครูสอนแทนแจ้งไม่สะดวก ({selectedReq.substituteDeclineReason || ''})
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-emerald-700 font-medium">
                    ✓ ผู้ขอยืนยันไม่มีคาบสอนในช่วงเวลาดังกล่าว
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-slate-400 block">เบอร์ติดต่อ:</span>
                  <span className="text-slate-800">{selectedReq.userPhone}</span>
                </div>
                {selectedReq.travelMethod && selectedReq.travelMethod !== 'ตามภารกิจราชการ' && (
                  <div>
                    <span className="text-slate-400 block">ยานพาหนะ:</span>
                    <span className="text-slate-800">{selectedReq.travelMethod} {selectedReq.vehiclePlate}</span>
                  </div>
                )}
              </div>
            </div>

            {selectedReq.status === 'pending' ? (
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingReq(selectedReq);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                >
                  ❌ ไม่อนุมัติ
                </button>
                {selectedReq.hasClasses && selectedReq.substituteStatus === 'pending' ? (
                  <span
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5"
                    title="ต้องรอให้ครูผู้สอนแทนกดรับทราบในระบบก่อน จึงจะสามารถอนุมัติได้"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                    <span>รอครูผู้สอนแทน ({selectedReq.substituteTeacherName}) กดรับทราบในระบบเว็บก่อน</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleApproveAction(selectedReq.id)}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/25 cursor-pointer"
                  >
                    ✅ อนุมัติคำขอทันที
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center text-xs text-slate-500">
                คำขอนี้พิจารณาแล้ว ({selectedReq.status})
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Reason Dialog Modal */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-rose-700 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5" />
              ระบุเหตุผลที่ไม่อนุมัติคำขอ
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              คำขอของ <strong>{rejectingReq.userName}</strong> จะถูกปฏิเสธ และระบบจะส่งเหตุผลนี้กลับไปยังครูผู้ขอใน LINE
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เหตุผลความจำเป็นที่ไม่อนุมัติ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  placeholder="เช่น ติดภารกิจสอนวิชาปฏิบัติการ, มีการประชุมด่วนในสาขาวิชา, สามารถเลื่อนไปช่วงหลัง 16:00 น. ได้"
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingReq(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-sm"
                >
                  ยืนยันไม่อนุมัติ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
