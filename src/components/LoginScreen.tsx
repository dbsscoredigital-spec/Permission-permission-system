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
  ShieldCheck
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

  // Load remembered credentials on mount
  useEffect(() => {
    const creds = storage.getRememberedCredentials();
    if (creds && creds.rememberMe) {
      setUsername(creds.username || '');
      setPassword(creds.password || '');
      setRememberMe(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
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

    setTimeout(() => {
      const authenticatedUser = storage.authenticate(trimmedUsername, password);
      setIsLoading(false);

      if (authenticatedUser) {
        storage.saveRememberedCredentials(trimmedUsername, password, rememberMe);
        onLoginSuccess(authenticatedUser);
      } else {
        setErrorMessage('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง');
      }
    }, 250);
  };

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
                <div className="font-semibold text-slate-700 text-[11px] pb-1 border-b border-slate-200">
                  บัญชีผู้ใช้งานมาตรฐาน:
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">ครูผู้สอน:</span>
                  <span className="font-mono font-medium text-slate-800">teacher_64661 / password123</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">หัวหน้าสาขาวิชา:</span>
                  <span className="font-mono font-medium text-slate-800">teacher_64665 / password123</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">ผู้ดูแลระบบ (Admin):</span>
                  <span className="font-mono font-medium text-slate-800">admin / password123</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">รปภ. ประตู:</span>
                  <span className="font-mono font-medium text-slate-800">guard / password123</span>
                </div>
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
