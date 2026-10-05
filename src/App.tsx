import React, { useState, useEffect } from 'react';
import { User, Branch, ExitRequest, ApprovalLog, SystemSettings, LineSimulatedMessage } from './types';
import { StorageService } from './services/storageService';
import { LineService } from './services/lineService';
import { Navbar } from './components/Navbar';
import { TeacherPortal } from './components/TeacherPortal';
import { DepartmentHeadPortal } from './components/DepartmentHeadPortal';
import { AdminPortal } from './components/AdminPortal';
import { SecurityGatePortal } from './components/SecurityGatePortal';
import { QrPassModal } from './components/QrPassModal';
import { PrintSlipModal } from './components/PrintSlipModal';
import { GoogleSheetsIntegrationModal } from './components/GoogleSheetsIntegrationModal';
import { LoginScreen } from './components/LoginScreen';
import { 
  Building2, 
  MessageSquare, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Sparkles,
  QrCode
} from 'lucide-react';

export default function App() {
  const storage = StorageService.getInstance();
  const lineService = LineService.getInstance();

  // App State
  const [currentUser, setCurrentUser] = useState<User>(storage.getCurrentUser());
  const [users, setUsers] = useState<User[]>(storage.getUsers());
  const [branches, setBranches] = useState<Branch[]>(storage.getBranches());
  const [requests, setRequests] = useState<ExitRequest[]>(storage.getRequests());
  const [logs, setLogs] = useState<ApprovalLog[]>(storage.getLogs());
  const [settings, setSettings] = useState<SystemSettings>(storage.getSettings());
  const [lineMessages, setLineMessages] = useState<LineSimulatedMessage[]>(lineService.getMessages());

  // Active Main Navigation Tab ('teacher' | 'approver' | 'admin' | 'security')
  const [activeTab, setActiveTab] = useState<string>(
    currentUser.role === 'approver' ? 'approver' :
    currentUser.role === 'admin' ? 'admin' :
    currentUser.role === 'security' ? 'security' : 'teacher'
  );

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => storage.isLoggedIn());

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    storage.setCurrentUser(user);
    storage.setLoggedIn(true);
    refreshAllData();

    // Auto-switch to user's portal
    if (user.role === 'teacher') setActiveTab('teacher');
    else if (user.role === 'approver') setActiveTab('approver');
    else if (user.role === 'admin') setActiveTab('admin');
    else if (user.role === 'security') setActiveTab('security');

    showToast(`ยินดีต้อนรับเข้าสู่ระบบ: ${user.name} (${user.position})`, 'success');
  };

  const handleLogout = () => {
    storage.logout();
    setIsLoggedIn(false);
    showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
  };

  // Security & Privacy Guard: Ensure teachers can ONLY access teacher view, approvers cannot access admin, etc.
  useEffect(() => {
    if (currentUser.role === 'teacher' && activeTab !== 'teacher') {
      setActiveTab('teacher');
    } else if (currentUser.role === 'approver' && (activeTab === 'admin' || activeTab === 'security')) {
      setActiveTab('approver');
    } else if (currentUser.role === 'security' && activeTab !== 'security') {
      setActiveTab('security');
    }
  }, [currentUser.role, activeTab]);

  // Modals
  const [qrPassReq, setQrPassReq] = useState<ExitRequest | null>(null);
  const [printSlipReq, setPrintSlipReq] = useState<ExitRequest | null>(null);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Check if opened via scanned QR Code URL (?verify=REQ-...)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const verifyId = urlParams.get('verify');
      if (verifyId && requests.length > 0) {
        const found = requests.find(r => 
          r.id.toLowerCase() === verifyId.toLowerCase() || 
          r.qrToken.toLowerCase() === verifyId.toLowerCase()
        );
        if (found) {
          setPrintSlipReq(found);
          showToast(`สแกนพบบัตรอนุญาต: ${found.id} ของ ${found.userName}`, 'success');
        }
      }
    } catch {
      // ignore
    }
  }, [requests]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Sync state helpers
  const refreshAllData = () => {
    setUsers(storage.getUsers());
    setBranches(storage.getBranches());
    setRequests(storage.getRequests());
    setLogs(storage.getLogs());
    setSettings(storage.getSettings());
    setLineMessages(lineService.getMessages());
  };

  const handleUserChange = (user: User) => {
    setCurrentUser(user);
    storage.setCurrentUser(user);
    // Switch to corresponding tab for convenience
    if (user.role === 'teacher') setActiveTab('teacher');
    else if (user.role === 'approver') setActiveTab('approver');
    else if (user.role === 'admin') setActiveTab('admin');
    else if (user.role === 'security') setActiveTab('security');
    showToast(`สลับไปยังบัญชี: ${user.name} (${user.position})`, 'info');
  };

  // 1. Submit Request (LINE Quota-Saving Policy: max 2 messages per request)
  const handleSubmitRequest = (formData: any) => {
    const newReq = storage.createRequest(formData);

    if (newReq.status === 'approved') {
      // Self-approved by Department Head immediately
      lineService.sendTeacherStatusNotification(newReq, 'approved', `${newReq.userName} (หัวหน้าสาขา - อนุมัติตนเอง)`);
      refreshAllData();
      showToast(`⚡ ยื่นและอนุมัติตัวเองสำเร็จ! หัวหน้าสาขา ${newReq.userName} ได้รับอนุมัติเรียบร้อย พร้อมออกบัตรผ่าน QR Code ทันที`, 'success');
    } else if (newReq.hasClasses && newReq.substituteTeacherName) {
      // If there are classes: Substitute teacher must acknowledge in the web system first.
      // Do NOT send LINE message to substitute teacher (saves LINE quota).
      // Line Message 1 of 2 will be triggered when substitute teacher acknowledges in web app.
      refreshAllData();
      showToast(`ยื่นคำขอ ${newReq.id} สำเร็จ! รอให้ครูผู้สอนแทน (${newReq.substituteTeacherName}) กดรับทราบในระบบก่อน จึงจะส่ง LINE แจ้งเตือนผู้อนุมัติ (โควต้า 2 ข้อความ/คำขอ)`, 'info');
    } else {
      // If NO classes: Send LINE Message 1 of 2 directly to Approver
      lineService.sendApproverNotification(newReq);
      refreshAllData();
      showToast(`ยื่นคำขอ ${newReq.id} สำเร็จ! ส่ง LINE ข้อความที่ 1/2 ไปยังผู้อนุมัติ (${newReq.assignedApproverName}) เรียบร้อยแล้ว`, 'success');
    }
  };

  // 1.1 Acknowledge Substitute Teaching (In-System Web Action)
  // When acknowledged in web: Triggers LINE Message 1 of 2 to Department Head or Deputy Director!
  const handleAcknowledgeSubstitute = (requestId: string) => {
    const updated = storage.acknowledgeSubstitute(requestId, currentUser);
    if (updated) {
      // Trigger LINE Message 1 of 2 to Approver now that substitute teaching is confirmed
      lineService.sendApproverNotification(updated);
      refreshAllData();
      const approverTitle = updated.assignedApproverId === 'usr-admin' ? 'รอง ผอ.ฝ่ายวิชาการ' : 'หัวหน้าสาขา';
      showToast(`ครูผู้สอนแทนกดรับทราบในระบบเว็บแล้ว! ส่ง LINE ข้อความที่ 1/2 ไปยัง${approverTitle} (${updated.assignedApproverName}) เรียบร้อยแล้ว`, 'success');
    }
  };

  // 1.2 Decline Substitute Teaching (In-System Web Action)
  const handleDeclineSubstitute = (requestId: string, reason: string) => {
    const updated = storage.declineSubstitute(requestId, currentUser, reason);
    if (updated) {
      refreshAllData();
      showToast(`ท่านได้แจ้งไม่สะดวกสอนแทน (${reason}) ในระบบแล้ว`, 'info');
    }
  };

  // 2. Approve Request (Triggers LINE Message 2 of 2 back to Teacher)
  const handleApproveRequest = (requestId: string) => {
    const updated = storage.updateRequestStatus(requestId, 'approved', currentUser);
    if (updated) {
      lineService.sendTeacherStatusNotification(updated, 'approved', currentUser.name);
      refreshAllData();
      showToast(`อนุมัติคำขอ ${updated.id} สำเร็จ! ส่ง LINE ข้อความที่ 2/2 แจ้งผลกลับไปยังครู ${updated.userName} เรียบร้อย`, 'success');
    }
  };

  // 3. Reject Request (Triggers LINE Message 2 of 2 back to Teacher)
  const handleRejectRequest = (requestId: string, reason: string) => {
    const updated = storage.updateRequestStatus(requestId, 'rejected', currentUser, reason);
    if (updated) {
      lineService.sendTeacherStatusNotification(updated, 'rejected', currentUser.name, reason);
      refreshAllData();
      showToast(`ไม่อนุมัติคำขอ ${updated.id} ส่ง LINE ข้อความที่ 2/2 แจ้งผลกลับไปยังครู ${updated.userName} เรียบร้อย`, 'error');
    }
  };

  // 4. Security Gate Action (Check out / Check in)
  const handleGateCheck = (requestId: string, action: 'gate_exit' | 'gate_return') => {
    const updated = storage.recordGateAction(requestId, action, currentUser.name);
    if (updated) {
      refreshAllData();
      const actionName = action === 'gate_exit' ? 'เวลาออกจริง' : 'เวลากลับจริง';
      showToast(`บันทึก ${actionName} ของครู ${updated.userName} เรียบร้อยแล้ว`, 'success');
    }
  };

  // Reset demo
  const handleResetData = () => {
    storage.resetToDefaults();
    localStorage.removeItem('exit_app_line_messages_v2');
    refreshAllData();
    setCurrentUser(storage.getCurrentUser());
    setActiveTab('teacher');
    showToast('รีเซ็ตข้อมูลตัวอย่างกลับเป็นค่าเริ่มต้นเรียบร้อยแล้ว', 'info');
  };

  // Count pending for current approver's branch
  const pendingApproverCount = requests.filter(r => 
    r.status === 'pending' && 
    (currentUser.role === 'admin' || r.branchId === currentUser.branchId || r.branchName === currentUser.branchName)
  ).length;

  // If not logged in, render LoginScreen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 font-['Prompt',sans-serif]">
        {/* Toast Notification */}
        {toast && (
          <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5">
            <div className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-semibold ${
              toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' :
              toast.type === 'error' ? 'bg-rose-600 text-white border-rose-500' :
              'bg-slate-900 text-white border-slate-800'
            }`}>
              {toast.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0 text-white" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-white" />}
              {toast.type === 'info' && <Clock className="w-4 h-4 shrink-0 text-white" />}
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        <LoginScreen
          users={users}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 font-['Prompt',sans-serif]">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5">
          <div className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-semibold ${
            toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' :
            toast.type === 'error' ? 'bg-rose-600 text-white border-rose-500' :
            'bg-slate-900 text-white border-slate-800'
          }`}>
            {toast.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0 text-white" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-white" />}
            {toast.type === 'info' && <Clock className="w-4 h-4 shrink-0 text-white" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        currentUser={currentUser}
        onUserChange={handleUserChange}
        users={users}
        branches={branches}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingApproverCount={pendingApproverCount}
        logoUrl={settings.logoUrl}
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
        onResetData={handleResetData}
        onLogout={handleLogout}
      />

      {/* Body Content Container (pb-24 on mobile to accommodate bottom nav bar) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-8">
        
        {/* View 1: Teacher Portal */}
        {activeTab === 'teacher' && (
          <TeacherPortal
            currentUser={currentUser}
            users={users}
            requests={requests}
            branches={branches}
            onSubmitRequest={handleSubmitRequest}
            onViewQrPass={(req) => setQrPassReq(req)}
            onPrintSlip={(req) => setPrintSlipReq(req)}
            onAcknowledgeSubstitute={handleAcknowledgeSubstitute}
            onDeclineSubstitute={handleDeclineSubstitute}
            onApprove={handleApproveRequest}
          />
        )}

        {/* View 2: Department Head Portal (Only for Approvers and Admin - View everyone's history) */}
        {activeTab === 'approver' && (currentUser.role === 'approver' || currentUser.role === 'admin') && (
          <DepartmentHeadPortal
            currentUser={currentUser}
            users={users}
            branches={branches}
            requests={requests}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
            onSubmitRequest={handleSubmitRequest}
            onViewQrPass={(req) => setQrPassReq(req)}
            onPrintSlip={(req) => setPrintSlipReq(req)}
          />
        )}

        {/* View 3: Admin Portal (Only for Admin - View everyone's history & manage system) */}
        {activeTab === 'admin' && currentUser.role === 'admin' && (
          <AdminPortal
            currentUser={currentUser}
            users={users}
            branches={branches}
            requests={requests}
            logs={logs}
            settings={settings}
            onUpdateUsers={(newUsers) => {
              storage.saveUsers(newUsers);
              refreshAllData();
              const updatedCurrentUser = newUsers.find(u => u.id === currentUser.id);
              if (updatedCurrentUser) {
                setCurrentUser(updatedCurrentUser);
                storage.setCurrentUser(updatedCurrentUser);
              } else if (newUsers.length > 0) {
                const fallbackUser = newUsers.find(u => u.role === 'admin') || newUsers[0];
                setCurrentUser(fallbackUser);
                storage.setCurrentUser(fallbackUser);
              }
              showToast(`บันทึกข้อมูลผู้ใช้งานเรียบร้อยแล้ว (รวม ${newUsers.length} ท่าน)`, 'success');
            }}
            onUpdateBranches={(newBranches) => {
              storage.saveBranches(newBranches);
              refreshAllData();
            }}
            onUpdateSettings={(newSettings) => {
              storage.saveSettings(newSettings);
              refreshAllData();
              showToast('บันทึกการตั้งค่าเรียบร้อยแล้ว', 'success');
            }}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
            onPrintSlip={(req) => setPrintSlipReq(req)}
            onViewQrPass={(req) => setQrPassReq(req)}
            onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
          />
        )}

        {/* View 4: Security Gate Portal (Only for Security and Admin) */}
        {activeTab === 'security' && (currentUser.role === 'security' || currentUser.role === 'admin') && (
          <SecurityGatePortal
            currentUser={currentUser}
            requests={requests}
            onGateCheckAction={handleGateCheck}
            onViewQrPass={(req) => setQrPassReq(req)}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">วิทยาลัยเทคโนโลยีดอนบอสโกสุราษฎร์</span>
            <span>•</span>
            <span>ระบบขออนุญาตออกนอกสถานศึกษาสำหรับครู (Google Sheets + Apps Script + LINE Messaging API)</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSheetsModalOpen(true)}
              className="hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>ดาวน์โหลด 5 ชีต / Code.gs</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Floating QR Pass Modal */}
      {qrPassReq && (
        <QrPassModal
          request={qrPassReq}
          logoUrl={settings.logoUrl}
          schoolName={settings.schoolName}
          onClose={() => setQrPassReq(null)}
          onPrint={(req) => {
            setQrPassReq(null);
            setPrintSlipReq(req);
          }}
        />
      )}

      {/* Printable Official Slip Modal */}
      {printSlipReq && (
        <PrintSlipModal
          request={printSlipReq}
          logoUrl={settings.logoUrl}
          schoolName={settings.schoolName}
          onClose={() => setPrintSlipReq(null)}
        />
      )}

      {/* Google Sheets 5 Sheets & Apps Script Modal */}
      {isSheetsModalOpen && (
        <GoogleSheetsIntegrationModal
          onClose={() => setIsSheetsModalOpen(false)}
          appsScriptUrl={settings.googleAppsScriptUrl}
          onSaveAppsScriptUrl={(url) => {
            const updated = { ...settings, googleAppsScriptUrl: url };
            storage.saveSettings(updated);
            setSettings(updated);
            showToast('บันทึก Google Apps Script Web App URL สำเร็จ!', 'success');
          }}
        />
      )}

    </div>
  );
}
