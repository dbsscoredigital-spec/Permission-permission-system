import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { StorageService } from '../services/storageService';
import { DonBoscoLogo } from './DonBoscoLogo';
import { 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Search,
  CheckCircle,
  Sparkles,
  Users
} from 'lucide-react';

interface LoginScreenProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLoginSuccess }) => {
  const storage = StorageService.getInstance();
  const settings = storage.getSettings();
  const logoUrl = settings?.logoUrl;
  const schoolName = settings?.schoolName || 'วิทยาลัยเทคโนโลยีดอนบอสโกสุราษฎร์';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showQuickSelect, setShowQuickSelect] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Live available users from props or fetched from server
  const [availableUsers, setAvailableUsers] = useState<User[]>(users && users.length > 0 ? users : storage.getUsers());

  // Load latest users from server on mount to ensure newly added users always appear
  useEffect(() => {
    storage.fetchServerUsers().then(latest => {
      if (Array.isArray(latest) && latest.length > 0) {
        setAvailableUsers(latest);
      }
    }).catch(() => {});
  }, []);

  // Update when users prop changes
  useEffect(() => {
    if (Array.isArray(users) && users.length > 0) {
      setAvailableUsers(users);
    }
  }, [users]);

  // Load remembered credentials on mount
  useEffect(() => {
    const creds = storage.getRememberedCredentials();
    if (creds && creds.rememberMe) {
      setUsername(creds.username || '');
      setPassword(creds.password || '');
      setRememberMe(true);
    }
  }, []);

  const handleSelectUser = (u: User) => {
    setUsername(u.username);
    setPassword(u.password || '1234');
    setShowQuickSelect(false);
    setErrorMessage('');
  };

  const handleQuickLogin = async (u: User) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const authenticatedUser = await storage.authenticateAsync(u.username, u.password || '1234');
      setIsLoading(false);
      if (authenticatedUser) {
        storage.saveRememberedCredentials(u.username, u.password || '1234', true);
        onLoginSuccess(authenticatedUser);
      } else {
        // Fallback: direct login with user object
        storage.setCurrentUser(u);
        storage.setLoggedIn(true);
        onLoginSuccess(u);
      }
    } catch {
      setIsLoading(false);
      storage.setCurrentUser(u);
      storage.setLoggedIn(true);
      onLoginSuccess(u);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setErrorMessage('กรุณาระบุชื่อผู้ใช้งาน');
      return;
    }

    if (!password) {
      setErrorMessage('กรุณาระบุรหัสผ่าน');
      return;
    }

    setIsLoading(true);

    try {
      const authenticatedUser = await storage.authenticateAsync(trimmedUsername, password);
      setIsLoading(false);

      if (authenticatedUser) {
        storage.saveRememberedCredentials(trimmedUsername, password, rememberMe);
        onLoginSuccess(authenticatedUser);
      } else {
        setErrorMessage('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง');
      }
    } catch {
      setIsLoading(false);
      setErrorMessage('เกิดข้อผิดพลาดในการตรวจสอบข้อมูล กรุณาลองใหม่อีกครั้ง');
    }
  };

  const filteredUsers = availableUsers.filter(u => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.branchName || '').toLowerCase().includes(q) ||
      (u.position || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-100 via-slate-50 to-indigo-50/40 flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-200/90 overflow-hidden">
        
        {/* Header Branding */}
        <div className="bg-linear-to-b from-[#0f2b5c] via-[#163870] to-[#0a1c3d] p-6 sm:p-8 text-white text-center relative">
          <div className="flex justify-center mb-3">
            <div className="p-1.5 rounded-full bg-white shadow-lg ring-4 ring-white/20">
              <DonBoscoLogo size={84} logoUrl={logoUrl} />
            </div>
          </div>

          <h1 className="text-lg sm:text-xl font-bold tracking-tight">
            ระบบขออนุญาตออกนอกสถานศึกษา
          </h1>
          <p className="text-xs sm:text-sm text-blue-200 mt-1 font-semibold">
            {schoolName}
          </p>
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-white/10 text-blue-100 text-[11px] font-semibold border border-white/15">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>เข้าสู่ระบบสำหรับครูและบุคลากร</span>
          </div>
        </div>

        {/* Quick User Selection Bar for Mobile Ease */}
        <div className="p-3 bg-indigo-50/80 border-b border-indigo-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-indigo-900 font-semibold">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>ผู้ใช้งานในระบบ ({availableUsers.length} ท่าน)</span>
          </div>
          <button
            type="button"
            onClick={() => setShowQuickSelect(!showQuickSelect)}
            className="px-2.5 py-1 bg-white hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg font-bold text-[11px] shadow-2xs transition-all cursor-pointer flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span>{showQuickSelect ? 'ปิดรายชื่อ' : 'เลือกผู้ใช้งานทันที'}</span>
          </button>
        </div>

        {/* Quick Select Drawer */}
        {showQuickSelect && (
          <div className="p-4 bg-slate-50 border-b border-slate-200 max-h-72 overflow-y-auto space-y-2 animate-in fade-in">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="ค้นหาชื่อ, สาขา, ชื่อผู้ใช้..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1.5 pt-1">
              {filteredUsers.map((u, i) => (
                <div
                  key={`user-choice-${u.id}-${i}`}
                  className="bg-white hover:bg-indigo-50/60 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between gap-2 text-xs transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 truncate">{u.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'approver' ? 'bg-emerald-100 text-emerald-700' :
                        u.role === 'security' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {u.role === 'admin' ? 'Admin' : u.role === 'approver' ? 'หัวหน้าสาขา' : u.role === 'security' ? 'รปภ.' : 'ครู'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      สาขา: {u.branchName || '-'} • Username: <span className="font-mono text-slate-700 font-medium">{u.username}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSelectUser(u)}
                      className="px-2 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg text-[11px] font-medium cursor-pointer"
                    >
                      เลือก
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin(u)}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold shadow-xs cursor-pointer active:scale-98"
                    >
                      เข้าสู่ระบบ
                    </button>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-3">ไม่พบรายชื่อผู้ใช้งานที่ค้นหา</p>
              )}
            </div>
          </div>
        )}

        {/* Login Form Body */}
        <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-5">
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-3 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Username Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              ชื่อผู้ใช้งาน (Username) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ระบุชื่อผู้ใช้งาน"
                autoComplete="username"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden transition-all"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              รหัสผ่าน (Password) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ระบุรหัสผ่าน"
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span>จดจำการเข้าสู่ระบบในอุปกรณ์นี้</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-indigo-600/25 cursor-pointer transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span>กำลังตรวจสอบข้อมูล...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบ</span>
              </>
            )}
          </button>

          {/* Small Help Accordion for Reference */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showHelp ? 'ซ่อนข้อมูลแนะนำ' : 'ข้อมูลเข้าสู่ระบบสำหรับทดสอบ'}</span>
            </button>

            {showHelp && (
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-1.5 animate-in fade-in">
                <div className="font-semibold text-slate-700 text-[11px] pb-1 border-b border-slate-200 flex items-center justify-between">
                  <span>บัญชีผู้ใช้งานในระบบ ({availableUsers.length} ท่าน):</span>
                  <button
                    type="button"
                    onClick={() => setShowQuickSelect(true)}
                    className="text-indigo-600 hover:underline font-bold"
                  >
                    ดูทั้งหมด
                  </button>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">ผู้ดูแลระบบ (Admin):</span>
                  <span className="font-mono font-medium text-slate-800">admin / 1122 (หรือ 1234)</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">รปภ. ประตู:</span>
                  <span className="font-mono font-medium text-slate-800">guard / password123</span>
                </div>
                {availableUsers.slice(0, 3).map((u, idx) => (
                  <div key={`help-user-${u.id}-${idx}`} className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 truncate max-w-[150px]">{u.name}:</span>
                    <span className="font-mono font-medium text-slate-800">{u.username} / {u.password || '1234'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

      </div>

      {/* Footer */}
      <footer className="mt-6 text-center text-xs text-slate-400">
        วิทยาลัยเทคโนโลยีดอนบอสโกสุราษฎร์ • อ.เมือง จ.สุราษฎร์ธานี
      </footer>
    </div>
  );
};

