import React, { useState } from 'react';
import { User, Branch } from '../types';
import { DonBoscoLogo } from './DonBoscoLogo';
import { 
  Building2, 
  UserCheck, 
  Shield, 
  MessageSquare, 
  FileSpreadsheet, 
  QrCode, 
  Bell, 
  CheckCircle2, 
  ChevronDown,
  Sparkles,
  School,
  FileText,
  Lock,
  Users,
  LogOut
} from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  onUserChange: (user: User) => void;
  users: User[];
  branches: Branch[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingApproverCount: number;
  logoUrl?: string;
  onOpenSheetsModal: () => void;
  onResetData: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onUserChange,
  users,
  branches,
  activeTab,
  setActiveTab,
  pendingApproverCount,
  logoUrl,
  onOpenSheetsModal,
  onResetData,
  onLogout
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'teacher':
        return <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1"><UserCheck className="w-3 h-3" /> ครูผู้ขอ</span>;
      case 'approver':
        return <span className="bg-emerald-100 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1"><Building2 className="w-3 h-3" /> หัวหน้าสาขา (อนุมัติ & ขอออกนอกได้)</span>;
      case 'admin':
        return <span className="bg-purple-100 text-purple-700 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1"><Shield className="w-3 h-3" /> ผู้ดูแลระบบ (Admin)</span>;
      case 'security':
        return <span className="bg-amber-100 text-amber-700 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1"><QrCode className="w-3 h-3" /> รปภ./ประตู</span>;
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & System Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-0.5 rounded-xl bg-white shadow-md border border-slate-200 shrink-0">
              <DonBoscoLogo size={38} logoUrl={logoUrl} />
            </div>
            <div className="truncate">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight flex items-center gap-2 truncate">
                ระบบขออนุญาตออกนอกสถานศึกษา
                <span className="hidden md:inline-block text-xs font-normal text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 font-semibold">
                  สำหรับครูและบุคลากร
                </span>
              </h1>
              <p className="text-xs text-slate-600 font-medium truncate">
                วิทยาลัยเทคโนโลยีดอนบอสโกสุราษฎร์ • เชื่อม Google Sheets & LINE Bot
              </p>
            </div>
          </div>

          {/* Integration Shortcut Buttons */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={onOpenSheetsModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>Google Sheets 5 ชีต</span>
            </button>
          </div>

          {/* User Profile & Role Switcher */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-3 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-indigo-200">
                  {currentUser.role === 'admin' ? <Shield className="w-4 h-4 text-purple-700" /> :
                   currentUser.role === 'approver' ? <Building2 className="w-4 h-4 text-emerald-700" /> :
                   currentUser.role === 'security' ? <QrCode className="w-4 h-4 text-amber-700" /> :
                   <UserCheck className="w-4 h-4 text-blue-700" />}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-900 truncate max-w-[130px]">
                    {currentUser.name}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <span>{currentUser.branchName}</span>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {/* Quick Account Switcher Dropdown */}
              {userDropdownOpen && (
                <>
                  {/* Backdrop overlay to close on outside click */}
                  <div 
                    className="fixed inset-0 z-40 bg-black/10" 
                    onClick={() => setUserDropdownOpen(false)} 
                  />
                  <div 
                    className="absolute right-0 mt-2 w-[calc(100vw-32px)] max-w-xs sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-2 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          สลับบทบาททดสอบ (Quick Switch)
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          คลิกเลือกบัญชีเพื่อสลับไปยังมุมมองของคนนั้นทันที
                        </p>
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto py-1 space-y-1">
                      {users.map((u, idx) => {
                        const isCurrent = currentUser.id === u.id;
                        return (
                          <button
                            key={`nav-user-${u.id}-${idx}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUserChange(u);
                              setUserDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-semibold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                u.role === 'approver' ? 'bg-emerald-100 text-emerald-700' :
                                u.role === 'security' ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {u.role === 'admin' ? <Shield className="w-4 h-4" /> :
                                 u.role === 'approver' ? <Building2 className="w-4 h-4" /> :
                                 u.role === 'security' ? <QrCode className="w-4 h-4" /> :
                                 <UserCheck className="w-4 h-4" />}
                              </div>
                              <div className="truncate">
                                <p className="text-xs font-semibold truncate text-slate-900 flex items-center gap-1">
                                  <span>{u.name}</span>
                                  {isCurrent && (
                                    <span className="text-[10px] text-indigo-600 bg-indigo-100 px-1.5 py-0.2 rounded-full font-bold">
                                      กำลังใช้งาน
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-slate-500 truncate">{u.position} • {u.branchName}</p>
                              </div>
                            </div>
                            <div className="shrink-0 ml-2">
                              {getRoleBadge(u.role)}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {onLogout && (
                      <div className="p-2 border-t border-slate-100 bg-slate-50/50 rounded-xl mt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUserDropdownOpen(false);
                            onLogout();
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 bg-white transition-all cursor-pointer shadow-2xs"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>ออกจากระบบ (ไปยังหน้าล็อกอิน)</span>
                        </button>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 px-2 flex justify-between items-center text-[11px] text-slate-500">
                      <button
                        type="button"
                        onClick={onResetData}
                        className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer text-[10px]"
                      >
                        รีเซ็ตข้อมูลตัวอย่าง
                      </button>
                      <span className="font-medium text-slate-700">{currentUser.name}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile integrations & logout shortcuts */}
            <div className="flex sm:hidden items-center gap-1.5">
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-xl text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all cursor-pointer shadow-2xs"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Direct Logout Button (Desktop) */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 bg-white transition-all cursor-pointer shadow-2xs shrink-0"
                title="ออกจากระบบเพื่อกลับไปยังหน้าล็อกอิน"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden md:inline">ออกจากระบบ</span>
              </button>
            )}
          </div>

        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2 pb-2 overflow-x-auto scrollbar-none gap-2">
          <div className="flex items-center gap-1.5 min-w-max">
            {/* Requester View Tab (Available for teachers, department heads, admin) */}
            <button
              onClick={() => setActiveTab('teacher')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'teacher'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>
                {currentUser.role === 'teacher' 
                  ? '1. ยื่นคำขอออกนอก & ประวัติของฉัน' 
                  : currentUser.role === 'approver' 
                    ? '1. ยื่นคำขอออกนอกของฉัน' 
                    : currentUser.role === 'admin'
                      ? '1. ยื่นคำขอออกนอก (แอดมินอนุมัติตัวเองได้)'
                      : '1. ยื่นคำขอออกนอก'}
              </span>
              {currentUser.role === 'teacher' && (
                <span className="text-[10px] bg-blue-500/20 text-blue-100 px-1.5 py-0.5 rounded-full font-normal hidden sm:inline-block">
                  เฉพาะของตนเอง
                </span>
              )}
            </button>

            {/* Department Head View Tab (Only for approvers and admin) */}
            {(currentUser.role === 'approver' || currentUser.role === 'admin') && (
              <button
                onClick={() => setActiveTab('approver')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer relative ${
                  activeTab === 'approver'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>2. หน้าหัวหน้าสาขา (อนุมัติ & ดูประวัติเข้า-ออกทุกคน)</span>
                {pendingApproverCount > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    activeTab === 'approver' ? 'bg-white text-emerald-700' : 'bg-rose-500 text-white'
                  }`}>
                    {pendingApproverCount}
                  </span>
                )}
              </button>
            )}

            {/* Admin View Tab (Only for admin) */}
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>3. หน้าผู้ดูแลระบบ (Admin - ดูประวัติเข้า-ออกทุกคน & 5 ชีต)</span>
              </button>
            )}

            {/* Security Gate View Tab (For security staff and admin) */}
            {(currentUser.role === 'security' || currentUser.role === 'admin') && (
              <button
                onClick={() => setActiveTab('security')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'security'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>4. ตรวจสอบประตู (สแกน QR Code)</span>
              </button>
            )}

            {/* Role-Specific Privacy & Visibility Indicators */}
            {currentUser.role === 'teacher' && (
              <span className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg font-medium hidden md:inline-flex items-center gap-1.5 ml-2">
                <Lock className="w-3 h-3 text-blue-600" />
                <span>สิทธิ์ครูผู้สอน: ดูประวัติเข้า-ออกได้เฉพาะของตนเองเท่านั้น</span>
              </span>
            )}

            {currentUser.role === 'approver' && (
              <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium hidden md:inline-flex items-center gap-1.5 ml-2">
                <Users className="w-3 h-3 text-emerald-600" />
                <span>สิทธิ์หัวหน้าสาขา: ดูประวัติเข้า-ออกของทุกคนได้</span>
              </span>
            )}

            {currentUser.role === 'admin' && (
              <span className="text-[11px] text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg font-medium hidden md:inline-flex items-center gap-1.5 ml-2">
                <Shield className="w-3 h-3 text-purple-600" />
                <span>สิทธิ์ผู้ดูแลระบบ (Admin): ดูประวัติเข้า-ออกของทุกคนได้ทุกสาขา</span>
              </span>
            )}
          </div>

          {/* Mobile integrations toggle */}
          <div className="flex lg:hidden items-center gap-1 shrink-0">
            <button
              onClick={onOpenSheetsModal}
              className="p-1.5 rounded-lg text-blue-700 bg-blue-50 border border-blue-200"
              title="Google Sheets"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Visible exclusively on mobile screens) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] flex items-center justify-around">
        
        {/* Tab 1: Teacher/Requester */}
        <button
          onClick={() => setActiveTab('teacher')}
          className={`flex-1 py-1 flex flex-col items-center gap-0.5 text-center transition-colors cursor-pointer ${
            activeTab === 'teacher' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1 rounded-xl ${activeTab === 'teacher' ? 'bg-blue-50 text-blue-600' : ''}`}>
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-[10px]">
            {currentUser.role === 'teacher' ? 'ยื่นขอ & ประวัติ' : 'ยื่นขอออกนอก'}
          </span>
        </button>

        {/* Tab 2: Approver (For approvers & admin) */}
        {(currentUser.role === 'approver' || currentUser.role === 'admin') && (
          <button
            onClick={() => setActiveTab('approver')}
            className={`flex-1 py-1 flex flex-col items-center gap-0.5 text-center transition-colors cursor-pointer relative ${
              activeTab === 'approver' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl relative ${activeTab === 'approver' ? 'bg-emerald-50 text-emerald-600' : ''}`}>
              <Building2 className="w-4 h-4" />
              {pendingApproverCount > 0 && (
                <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {pendingApproverCount}
                </span>
              )}
            </div>
            <span className="text-[10px]">หน.สาขา</span>
          </button>
        )}

        {/* Tab 3: Admin (For admin) */}
        {currentUser.role === 'admin' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex-1 py-1 flex flex-col items-center gap-0.5 text-center transition-colors cursor-pointer ${
              activeTab === 'admin' ? 'text-purple-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl ${activeTab === 'admin' ? 'bg-purple-50 text-purple-600' : ''}`}>
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-[10px]">แอดมิน</span>
          </button>
        )}

        {/* Tab 4: Security (For security & admin) */}
        {(currentUser.role === 'security' || currentUser.role === 'admin') && (
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-1 flex flex-col items-center gap-0.5 text-center transition-colors cursor-pointer ${
              activeTab === 'security' ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl ${activeTab === 'security' ? 'bg-amber-50 text-amber-600' : ''}`}>
              <QrCode className="w-4 h-4" />
            </div>
            <span className="text-[10px]">สแกน รปภ.</span>
          </button>
        )}

        {/* Logout */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex-1 py-1 flex flex-col items-center gap-0.5 text-center text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
          >
            <div className="p-1 rounded-xl bg-rose-50">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="text-[10px]">ออกระบบ</span>
          </button>
        )}

      </nav>
    </header>
  );
};
