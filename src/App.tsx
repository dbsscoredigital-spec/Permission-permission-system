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

  // Quick Review Modal triggered by LINE Flex buttons (?action=approve|reject&reqId=...)
  const [lineReviewState, setLineReviewState] = useState<{
    request: ExitRequest;
    action: 'approve' | 'reject';
  } | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  // 1-Click Direct Approval Modal Result (Triggered by LINE in-app webview button)
  const [directActionResult, setDirectActionResult] = useState<{
    request?: ExitRequest;
    reqId: string;
    action: 'approve' | 'reject';
    success: boolean;
    message: string;
  } | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Auto-sync with Server & LINE Webhook Poll (every 3 seconds)
  useEffect(() => {
    let isMounted = true;

    const performSync = async () => {
      try {
        const syncRes = await storage.syncWithServer();
        if (isMounted && syncRes.changed) {
          setRequests(storage.getRequests());
          setLogs(storage.getLogs());

          if (syncRes.newlyApproved && syncRes.newlyApproved.length > 0) {
            syncRes.newlyApproved.forEach(appr => {
              showToast(`🎉 คำขอ ${appr.id} (${appr.userName}) ได้รับการอนุมัติผ่าน LINE เรียบร้อยแล้ว!`, 'success');
            });
          }
        }
      } catch {
        // ignore
      }
    };

    // Immediate sync on load
    performSync();

    // Poll every 3 seconds so approvals in LINE reflect live on screen
    const interval = setInterval(performSync, 3000);

    // Sync on tab focus / visibilitychange
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performSync();
      }
    };
    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', performSync);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', performSync);
    };
  }, []);

  // Check if opened via scanned QR Code URL (?verify=REQ-...) or LINE Flex button (?action=approve|reject&reqId=...)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const action = urlParams.get('action');
      const reqId = urlParams.get('reqId');
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

      if (reqId && (action === 'direct_approve' || action === 'approve')) {
        const found = requests.find(r => r.id.toLowerCase() === reqId.toLowerCase());
        const approverUser = users.find(u => u.role === 'approver' && (found ? u.branchId === found.branchId : true)) || currentUser;
        
        // Notify server status endpoint immediately
        fetch(`/api/requests/${encodeURIComponent(reqId)}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved', actorName: approverUser?.name || 'หัวหน้าสาขา' })
        }).catch(() => {});

        const updated = storage.updateRequestStatus(reqId, 'approved', approverUser);
        if (updated) {
          lineService.sendTeacherStatusNotification(updated, 'approved', approverUser.name);
          refreshAllData();
          setDirectActionResult({
            request: updated,
            reqId,
            action: 'approve',
            success: true,
            message: `🎉 อนุมัติคำขอ ${reqId} ของ ${updated.userName} เรียบร้อยแล้ว!`
          });
          showToast(`🎉 อนุมัติคำขอ ${reqId} สำเร็จแล้ว!`, 'success');
        } else {
          // If request was created on another device, sync with server
          storage.syncWithServer().then(() => {
            refreshAllData();
            const reFound = storage.getRequestById(reqId);
            setDirectActionResult({
              request: reFound,
              reqId,
              action: 'approve',
              success: true,
              message: `🎉 อนุมัติคำขอ ${reqId} เรียบร้อยแล้ว!`
            });
            showToast(`🎉 อนุมัติคำขอ ${reqId} เรียบร้อยแล้ว!`, 'success');
          }).catch(() => {});
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (reqId && (action === 'direct_reject' || action === 'reject')) {
        const found = requests.find(r => r.id.toLowerCase() === reqId.toLowerCase());
        const approverUser = users.find(u => u.role === 'approver' && (found ? u.branchId === found.branchId : true)) || currentUser;
        
        fetch(`/api/requests/${encodeURIComponent(reqId)}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'rejected', actorName: approverUser?.name || 'หัวหน้าสาขา', rejectionReason: 'ไม่อนุมัติผ่าน LINE' })
        }).catch(() => {});

        const updated = storage.updateRequestStatus(reqId, 'rejected', approverUser, 'ไม่อนุมัติผ่าน LINE');
        if (updated) {
          refreshAllData();
          setDirectActionResult({
            request: updated,
            reqId,
            action: 'reject',
            success: true,
            message: `❌ บันทึกไม่อนุมัติคำขอ ${reqId} เรียบร้อยแล้ว`
          });
          showToast(`บันทึกไม่อนุมัติคำขอ ${reqId} เรียบร้อยแล้ว`, 'info');
        } else {
          storage.syncWithServer().then(() => {
            refreshAllData();
            const reFound = storage.getRequestById(reqId);
            setDirectActionResult({
              request: reFound,
              reqId,
              action: 'reject',
              success: true,
              message: `❌ บันทึกไม่อนุมัติคำขอ ${reqId} เรียบร้อยแล้ว`
            });
          }).catch(() => {});
        }
        window.history.replaceState({}, document.title, window.location.pathname);
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

  // 1. Submit Request
  const handleSubmitRequest = async (formData: any) => {
    const newReq = storage.createRequest(formData);

    if (newReq.status === 'approved') {
      // Self-approved by Department Head immediately
      await lineService.sendTeacherStatusNotification(newReq, 'approved', `${newReq.userName} (หัวหน้าสาขา - อนุมัติตนเอง)`);
      refreshAllData();
      showToast(`⚡ ยื่นและอนุมัติตัวเองสำเร็จ! หัวหน้าสาขา ${newReq.userName} ได้รับอนุมัติเรียบร้อย พร้อมออกบัตรผ่าน QR Code ทันที`, 'success');
    } else {
      // Always deliver LINE notification to Approver so department head gets alerted immediately!
      refreshAllData();
      const lineRes = await lineService.sendApproverNotification(newReq);
      refreshAllData();

      if (lineRes.success) {
        showToast(`ยื่นคำขอ ${newReq.id} สำเร็จ! ส่ง LINE แจ้งเตือนไปยังหัวหน้าสาขา (${newReq.assignedApproverName}) เรียบร้อยแล้ว 📲`, 'success');
      } else {
        if (lineRes.code === 'TOKEN_REQUIRED') {
          showToast(`ยื่นคำขอ ${newReq.id} สำเร็จ! (บันทึกในระบบแล้ว แต่ยังไม่ได้กรอก LINE Channel Access Token ในการตั้งค่าระบบ จึงยังไม่ได้ส่งเข้า LINE)`, 'info');
        } else {
          showToast(`ยื่นคำขอ ${newReq.id} สำเร็จ! (LINE แจ้งเตือน: ${lineRes.message})`, 'info');
        }
      }
    }
  };

  // 1.1 Acknowledge Substitute Teaching (In-System Web Action)
  // When acknowledged in web: Triggers LINE Message 1 of 2 to Department Head or Deputy Director!
  const handleAcknowledgeSubstitute = async (requestId: string) => {
    const updated = storage.acknowledgeSubstitute(requestId, currentUser);
    if (updated) {
      // Trigger LINE Message to Approver that substitute teaching is confirmed
      const lineRes = await lineService.sendApproverNotification(updated);
      refreshAllData();
      const approverTitle = updated.assignedApproverId === 'usr-admin' ? 'รอง ผอ.ฝ่ายวิชาการ' : 'หัวหน้าสาขา';
      if (lineRes.success) {
        showToast(`ครูผู้สอนแทนกดรับทราบแล้ว! ส่ง LINE แจ้งเตือนไปยัง${approverTitle} (${updated.assignedApproverName}) เรียบร้อยแล้ว`, 'success');
      } else {
        showToast(`ครูผู้สอนแทนกดรับทราบแล้ว! (ส่งต่อ ${approverTitle})`, 'info');
      }
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

  // 2. Approve Request (Triggers LINE Message back to Teacher)
  const handleApproveRequest = async (requestId: string) => {
    const updated = storage.updateRequestStatus(requestId, 'approved', currentUser);
    if (updated) {
      const lineRes = await lineService.sendTeacherStatusNotification(updated, 'approved', currentUser.name);
      refreshAllData();
      if (lineRes.success) {
        showToast(`อนุมัติคำขอ ${updated.id} สำเร็จ! ส่ง LINE แจ้งผลกลับไปยังครู ${updated.userName} เรียบร้อย 📲`, 'success');
      } else {
        showToast(`อนุมัติคำขอ ${updated.id} สำเร็จ! ออกบัตรผ่าน QR Code เรียบร้อยแล้ว`, 'success');
      }
    }
  };

  // 3. Reject Request (Triggers LINE Message back to Teacher)
  const handleRejectRequest = async (requestId: string, reason: string) => {
    const updated = storage.updateRequestStatus(requestId, 'rejected', currentUser, reason);
    if (updated) {
      await lineService.sendTeacherStatusNotification(updated, 'rejected', currentUser.name, reason);
      refreshAllData();
      showToast(`ไม่อนุมัติคำขอ ${updated.id} บันทึกผลเรียบร้อยแล้ว`, 'error');
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

      {/* LINE Action Review Modal (when opened from LINE Flex Button) */}
      {lineReviewState && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs ${
                  lineReviewState.action === 'approve' ? 'bg-emerald-600' : 'bg-rose-600'
                }`}>
                  {lineReviewState.action === 'approve' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {lineReviewState.action === 'approve'
                      ? 'ยืนยันการอนุมัติคำขอออกนอกสถานศึกษา'
                      : 'พิจารณาไม่อนุมัติคำขอออกนอกสถานศึกษา'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    รหัสคำขอ: {lineReviewState.request.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setLineReviewState(null);
                  window.history.replaceState({}, document.title, window.location.pathname);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Request Details */}
            <div className="space-y-3 text-xs mb-4">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">👨‍🏫 ครูผู้ขอ:</span>
                  <strong className="text-slate-900 text-sm">{lineReviewState.request.userName}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">🏫 สาขาวิชา:</span>
                  <span className="text-slate-800 font-semibold">{lineReviewState.request.branchName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">📅 วันที่ขอออก:</span>
                  <span className="text-slate-800">{lineReviewState.request.exitDate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">🕐 ช่วงเวลา:</span>
                  <span className="text-indigo-700 font-semibold">{lineReviewState.request.exitTime} – {lineReviewState.request.returnTime} น.</span>
                </div>
                <div className="pt-2 border-t border-slate-200/80">
                  <span className="text-slate-500 font-medium block mb-0.5">📍 สถานที่ไป:</span>
                  <p className="text-slate-800">{lineReviewState.request.destination}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block mb-0.5">📝 เหตุผลความจำเป็น:</span>
                  <p className="text-slate-800">{lineReviewState.request.reason}</p>
                </div>
              </div>

              {/* Status Notice if already reviewed */}
              {lineReviewState.request.status === 'approved' && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 font-semibold flex items-center justify-between">
                  <span>✅ คำขอนี้ได้รับการอนุมัติแล้ว</span>
                  <button
                    onClick={() => {
                      setPrintSlipReq(lineReviewState.request);
                      setLineReviewState(null);
                    }}
                    className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                  >
                    ดูบัตรอนุญาต
                  </button>
                </div>
              )}

              {lineReviewState.request.status === 'rejected' && (
                <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 font-semibold">
                  <span>❌ คำขอนี้ไม่อนุมัติ (เหตุผล: {lineReviewState.request.rejectionReason || 'ไม่ระบุ'})</span>
                </div>
              )}

              {/* Rejection reason input if action is reject */}
              {lineReviewState.request.status === 'pending' && lineReviewState.action === 'reject' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    เหตุผลที่ไม่อนุมัติคำขอ:
                  </label>
                  <textarea
                    rows={2}
                    value={rejectReasonInput}
                    onChange={(e) => setRejectReasonInput(e.target.value)}
                    placeholder="ระบุเหตุผล เช่น ติดภาระงานเร่งด่วนในสาขา..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              )}
            </div>

            {/* Footer buttons */}
            {lineReviewState.request.status === 'pending' ? (
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setLineReviewState(null);
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>

                {lineReviewState.action === 'approve' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setLineReviewState({ ...lineReviewState, action: 'reject' })}
                      className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-medium cursor-pointer"
                    >
                      เปลี่ยนเป็นไม่อนุมัติ
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const targetId = lineReviewState.request.id;
                        setLineReviewState(null);
                        window.history.replaceState({}, document.title, window.location.pathname);
                        await handleApproveRequest(targetId);
                      }}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>ยืนยันอนุมัติคำขอทันที</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setLineReviewState({ ...lineReviewState, action: 'approve' })}
                      className="px-3 py-2 text-emerald-600 hover:bg-emerald-50 rounded-xl font-medium cursor-pointer"
                    >
                      เปลี่ยนเป็นอนุมัติ
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const targetId = lineReviewState.request.id;
                        const reason = rejectReasonInput || 'ไม่สะดวกอนุมัติ';
                        setLineReviewState(null);
                        window.history.replaceState({}, document.title, window.location.pathname);
                        await handleRejectRequest(targetId, reason);
                      }}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>ยืนยันไม่อนุมัติ</span>
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setLineReviewState(null);
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }}
                  className="px-5 py-2 bg-slate-800 text-white rounded-xl font-bold cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instant 1-Click LINE Approval Confirmation Modal */}
      {directActionResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border-2 border-emerald-400 animate-in zoom-in-95">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-md ${directActionResult.action === 'approve' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
              {directActionResult.action === 'approve' ? (
                <CheckCircle className="w-10 h-10" />
              ) : (
                <AlertCircle className="w-10 h-10" />
              )}
            </div>

            <div>
              <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${directActionResult.action === 'approve' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>
                ดำเนินการสำเร็จผ่าน LINE
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-2">
                {directActionResult.action === 'approve' ? '✅ บันทึกอนุมัติคำขอเรียบร้อยแล้ว' : '❌ บันทึกไม่อนุมัติคำขอ'}
              </h3>
              <p className="text-xs font-mono font-semibold text-purple-700 mt-1">
                รหัสคำขอ: {directActionResult.reqId}
              </p>
            </div>

            {directActionResult.request && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">ครูผู้ขอ:</span>
                  <strong className="text-slate-800">{directActionResult.request.userName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">สาขาวิชา:</span>
                  <span className="font-semibold text-slate-700">{directActionResult.request.branchName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">สถานที่:</span>
                  <span className="font-semibold text-slate-700 truncate max-w-[200px]">{directActionResult.request.destination}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-200">
                  <span className="text-slate-500">สถานะล่าสุด:</span>
                  <span className={`font-black px-2.5 py-0.5 rounded border text-xs ${directActionResult.action === 'approve' ? 'text-emerald-700 bg-emerald-50 border-emerald-300' : 'text-rose-700 bg-rose-50 border-rose-300'}`}>
                    {directActionResult.action === 'approve' ? 'อนุมัติแล้ว (Approved)' : 'ไม่อนุมัติ (Rejected)'}
                  </span>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
              {directActionResult.action === 'approve'
                ? '💡 ระบบหน้าเว็บและ รปภ. ได้รับสถานะ "อนุมัติแล้ว" อัตโนมัติทันที พร้อมส่งแจ้งเตือนออกบัตรผ่าน QR Code แก่ครูเรียบร้อยแล้วครับ'
                : '💡 ได้บันทึกสถานะไม่อนุมัติลงในระบบเรียบร้อยแล้ว'}
            </p>

            <button
              type="button"
              onClick={() => setDirectActionResult(null)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md cursor-pointer transition-all"
            >
              เสร็จสิ้น / ปิดหน้านี้
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
