import React, { useState, useEffect } from 'react';
import { GOOGLE_APPS_SCRIPT_CODE, CSV_TEMPLATES } from '../services/appsScriptTemplate';
import { 
  X, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  Code2, 
  Sparkles,
  HelpCircle,
  Layers,
  Table,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Send,
  Bell
} from 'lucide-react';

interface GoogleSheetsIntegrationModalProps {
  onClose: () => void;
  appsScriptUrl: string;
  onSaveAppsScriptUrl: (url: string) => void;
}

export const GoogleSheetsIntegrationModal: React.FC<GoogleSheetsIntegrationModalProps> = ({
  onClose,
  appsScriptUrl,
  onSaveAppsScriptUrl
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeSheetTab, setActiveSheetTab] = useState<keyof typeof CSV_TEMPLATES>('Users');
  const [inputUrl, setInputUrl] = useState(appsScriptUrl);
  const [savedUrlNotice, setSavedUrlNotice] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [syncingLine, setSyncingLine] = useState(false);
  const [syncLineResult, setSyncLineResult] = useState<any>(null);
  const [testingTeacherFlex, setTestingTeacherFlex] = useState(false);
  const [teacherFlexResult, setTeacherFlexResult] = useState<any>(null);
  const [webhookTestResult, setWebhookTestResult] = useState<{
    isOutdated?: boolean;
    status?: string;
    message?: string;
    isLibraryUrl?: boolean;
    scriptId?: string;
    editorUrl?: string;
    error?: string;
    lineEndpointInfo?: any;
  } | null>(null);

  // Auto-run webhook test on mount to detect outdated version immediately
  useEffect(() => {
    handleTestWebhook();
  }, []);

  const handleTestWebhook = async (overrideUrl?: string | unknown) => {
    setTestingWebhook(true);
    setSyncLineResult(null);
    try {
      const target = typeof overrideUrl === 'string' ? overrideUrl : inputUrl;
      const targetParam = target ? `?url=${encodeURIComponent(target.trim())}` : '';
      const res = await fetch(`/api/line/test-gas-webhook${targetParam}`);
      const data = await res.json();
      setWebhookTestResult(data);
    } catch (err: any) {
      setWebhookTestResult({ message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อทดสอบได้' });
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleSyncToLine = async () => {
    if (!inputUrl || !inputUrl.startsWith('https://script.google.com/macros/s/') || !inputUrl.endsWith('/exec')) {
      alert('กรุณาระบุ URL ของเว็บแอป (ที่ขึ้นต้นด้วย https://script.google.com/macros/s/ และลงท้ายด้วย /exec) ก่อนซิงค์ไปที่ LINE');
      return;
    }
    setSyncingLine(true);
    setSyncLineResult(null);
    try {
      const res = await fetch('/api/line/sync-webhook-to-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: inputUrl.trim() })
      });
      const data = await res.json();
      setSyncLineResult(data);
      if (data.success) {
        onSaveAppsScriptUrl(inputUrl.trim());
        setSavedUrlNotice(true);
        setTimeout(() => setSavedUrlNotice(false), 3000);
      }
    } catch (err: any) {
      setSyncLineResult({ success: false, error: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ LINE API' });
    } finally {
      setSyncingLine(false);
    }
  };

  const handleTestTeacherFlex = async () => {
    setTestingTeacherFlex(true);
    setTeacherFlexResult(null);
    try {
      const res = await fetch('/api/line/test-teacher-flex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });
      const data = await res.json();
      setTeacherFlexResult(data);
    } catch (err: any) {
      setTeacherFlexResult({ success: false, message: 'เกิดข้อผิดพลาด: ' + (err.message || String(err)) });
    } finally {
      setTestingTeacherFlex(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleDownloadCSV = (sheetName: keyof typeof CSV_TEMPLATES) => {
    const content = '\uFEFF' + CSV_TEMPLATES[sheetName];
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sheetName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveAppsScriptUrl(inputUrl);
    setSavedUrlNotice(true);
    setTimeout(() => setSavedUrlNotice(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-4">
        
        {/* Header */}
        <div className="bg-linear-to-r from-emerald-800 to-teal-800 text-white p-3.5 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs shrink-0">
              <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                ศูนย์เชื่อมต่อ Google Sheets 5 ชีต + Google Apps Script
              </h3>
              <p className="text-[11px] sm:text-xs text-emerald-100">
                โค้ดพร้อมใช้ 100% สำหรับบันทึกข้อมูลและส่ง LINE Flex Message
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6 text-xs text-slate-700">
          
          {/* Quick Setup 3-Step Guide */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>ขั้นตอนการเชื่อมต่อ Google Sheets ของสถานศึกษา (3 ขั้นตอนง่ายๆ)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px]">
                  1
                </span>
                <strong className="block text-slate-800">สร้าง 5 ชีตใน Google Sheets</strong>
                <p className="text-[11px] text-slate-500">
                  ดาวน์โหลดไฟล์ CSV ทั้ง 5 ชีตด้านล่าง แล้ว Import เข้า Google Sheet หรือให้สคริปต์สร้างให้อัตโนมัติ
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px]">
                  2
                </span>
                <strong className="block text-slate-800">วางโค้ดใน Apps Script</strong>
                <p className="text-[11px] text-slate-500">
                  ใน Google Sheets ไปที่ <em>ส่วนขยาย (Extensions) &gt; Apps Script</em> แล้ววางโค้ด <code className="text-emerald-700">Code.gs</code> ที่ให้ไว้
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px]">
                  3
                </span>
                <strong className="block text-slate-800">Deploy เป็น Web App</strong>
                <p className="text-[11px] text-slate-500">
                  กด Deploy &gt; New deployment &gt; Web app (Who has access: Anyone) แล้วนำ Web App URL มาใส่ในช่องด้านล่าง
                </p>
              </div>
            </div>

            {/* Crucial Note about New Version Deployment */}
            <div className="bg-amber-50 border border-amber-300/80 rounded-xl p-3.5 flex items-start gap-3">
              <span className="text-xl shrink-0">⚠️</span>
              <div className="space-y-1 text-[11px] text-amber-950">
                <strong className="block text-xs text-amber-900 font-bold">
                  ข้อสำคัญ: หากกดปุ่มอนุมัติใน LINE แล้วเด้งเป็นข้อความโค้ด JSON หรือระบบเว็บไม่ขึ้นอนุมัติ
                </strong>
                <p className="leading-relaxed">
                  เนื่องจากใน Google Apps Script มีการแก้ไขโค้ดใหม่ ท่านจำเป็นต้องอัปเดตเวอร์ชันการเผยแพร่:
                  <br />
                  1. ในหน้า Apps Script กดปุ่มสีน้ำเงิน <strong>"การทำให้ใช้งานได้" (Deploy) &gt; "จัดการการทำให้ใช้งานได้" (Manage deployments)</strong>
                  <br />
                  2. กดไอคอนดินสอ <strong>"แก้ไข" (Edit)</strong> ด้านขวาบน
                  <br />
                  3. ที่ช่อง <strong>"เวอร์ชัน" ให้เลือก "เวอร์ชันใหม่" (New version)</strong> แล้วกด <strong>"ทำให้ใช้งานได้" (Deploy)</strong>
                  <br />
                  เพียงเท่านี้ เมื่อกดอนุมัติใน LINE หน้าจอมือถือจะขึ้นการ์ดสีเขียวแจ้งอนุมัติสำเร็จ และสถานะในระบบเว็บจะอัปเดตเป็น <strong>"อนุมัติแล้ว"</strong> ทันทีทั้งฝั่งครูผู้ขอและหัวหน้าสาขา
                </p>
              </div>
            </div>
          </div>

          {/* Web App URL Configuration */}
          <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-emerald-600" />
              <span>กำหนด Google Apps Script Web App URL สำหรับระบบนี้</span>
            </h4>
            
            <form onSubmit={handleSaveUrl} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
              />
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer shadow-xs transition-all shrink-0"
              >
                บันทึก URL
              </button>
            </form>

            {/* Warning if user pastes Library URL */}
            {inputUrl.includes('/library/d/') && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2.5 text-xs text-amber-950 animate-in fade-in">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold text-amber-900">
                      ⚠️ ตรวจพบว่าลิงก์ที่วางคือ «ลิงก์ไลบรารี» (Library URL) ไม่ใช่ «URL ของเว็บแอป»
                    </strong>
                    <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                      ลิงก์ไลบรารีนี้มีไว้สำหรับแชร์โค้ดระหว่างโปรเจกต์เท่านั้น แต่ระบบ <strong>LINE Messaging API</strong> และ <strong>ระบบเว็บ</strong> จำเป็นต้องใช้ <strong>URL ของเว็บแอป (ลงท้ายด้วย /exec)</strong> เท่านั้นจึงจะยิง Webhook และเปลี่ยนสถานะอัตโนมัติได้ (หากใช้ลิงก์ไลบรารี LINE จะขึ้น Error 401 Unauthorized ติดหน้าล็อกอิน Google)
                    </p>
                  </div>
                </div>

                <div className="bg-white/90 p-3 rounded-lg border border-amber-200 text-[11px] space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>👉 ขั้นตอนรับ URL ของเว็บแอปจากโปรเจกต์นี้ใน 1 นาที:</span>
                    <a
                      href="https://script.google.com/d/1z68aySPejPfl9ZJCUB776oPdmoOt06MF9O1-L5mHeseaeGev--VXVcre/edit"
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 underline font-semibold hover:text-emerald-800 inline-flex items-center gap-1"
                    >
                      <span>เปิดโปรเจกต์ 1z68ay... ใน Apps Script</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <ol className="list-decimal pl-4 space-y-1 text-slate-700">
                    <li>
                      ในหน้า Apps Script กดปุ่มสีน้ำเงินมุมขวาบน <strong>"การทำให้ใช้งานได้" (Deploy) &gt; "การทำให้ใช้งานได้รายการใหม่" (New deployment)</strong>
                    </li>
                    <li>
                      กดรูปเฟือง ⚙️ ด้านซ้าย เลือก <strong>"เว็บแอป" (Web app)</strong>
                    </li>
                    <li>
                      การดำเนินการในฐานะ (Execute as): เลือก <strong>"ฉัน" (Me - dbsscore.digital@gmail.com)</strong>
                    </li>
                    <li>
                      ผู้มีสิทธิ์เข้าถึง (Who has access): เลือก <strong>"ทุกคน" (Anyone)</strong> <em>(สำคัญมาก! ต้องเลือก "ทุกคน" LINE ถึงจะยิงเข้าได้)</em>
                    </li>
                    <li>
                      กดปุ่ม <strong>"ทำให้ใช้งานได้" (Deploy)</strong>
                    </li>
                    <li>
                      คัดลอก <strong>"URL ของเว็บแอป" (Web app URL)</strong> ที่ขึ้นต้นด้วย <code>https://script.google.com/macros/s/.../exec</code> แล้วนำมาวางในช่องนี้
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {savedUrlNotice && (
              <span className="text-[11px] text-emerald-700 font-semibold block">
                ✓ บันทึก Google Apps Script Endpoint เรียบร้อยแล้ว ระบบจะซิงค์ข้อมูลอัตโนมัติ
              </span>
            )}

            {/* Actions: Test Connection & Sync to LINE Developers */}
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] text-slate-500">
                  ตรวจสอบความพร้อมหรือส่ง Webhook URL ไปยัง LINE อัตโนมัติ:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleTestWebhook()}
                    disabled={testingWebhook}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer border border-slate-200 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingWebhook ? 'animate-spin text-emerald-600' : 'text-slate-600'}`} />
                    <span>{testingWebhook ? 'กำลังตรวจสอบ...' : '🔍 ตรวจสอบ Web App'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncToLine}
                    disabled={syncingLine || !inputUrl || inputUrl.includes('/library/d/')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer shadow-xs transition-all disabled:opacity-50"
                    title="บันทึกและส่ง URL นี้ไปตั้งค่าใน LINE Developers Console ทันที"
                  >
                    <Send className={`w-3.5 h-3.5 ${syncingLine ? 'animate-pulse' : ''}`} />
                    <span>{syncingLine ? 'กำลังส่งไป LINE...' : '🚀 อัปเดต Webhook ใน LINE อัตโนมัติ'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestTeacherFlex}
                    disabled={testingTeacherFlex}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold cursor-pointer border border-indigo-200 transition-all disabled:opacity-50"
                    title="ทดสอบส่ง LINE Flex Message แจ้งผลการอนุมัติไปยังครูผู้ขอ"
                  >
                    <Bell className={`w-3.5 h-3.5 ${testingTeacherFlex ? 'animate-bounce text-indigo-600' : 'text-indigo-600'}`} />
                    <span>{testingTeacherFlex ? 'กำลังส่ง...' : '📲 ทดสอบส่ง Flex แจ้งเตือนผู้ขอ'}</span>
                  </button>
                </div>
              </div>

              {/* Teacher Flex Result */}
              {teacherFlexResult && (
                <div className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                  teacherFlexResult.success ? 'bg-indigo-50 border-indigo-300 text-indigo-950' : 'bg-amber-50 border-amber-300 text-amber-950'
                }`}>
                  {teacherFlexResult.success ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold text-indigo-900">
                          ✅ ส่ง LINE Flex แจ้งเตือนครูผู้ขอสำเร็จแล้ว!
                        </strong>
                        <p className="text-[11px] text-indigo-800">
                          {teacherFlexResult.message || 'ส่งข้อความ Flex พร้อมปุ่มเปิดดู QR Code เข้าห้องแชท LINE ของครูผู้ขอเรียบร้อยแล้ว'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold text-amber-900">
                          ⚠️ ไม่สามารถส่ง LINE Flex ได้
                        </strong>
                        <p className="text-[11px] text-amber-800">
                          {teacherFlexResult.message || teacherFlexResult.error}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Sync Line Result */}
              {syncLineResult && (
                <div className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                  syncLineResult.success ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-red-50 border-red-300 text-red-950'
                }`}>
                  {syncLineResult.success ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold text-emerald-900">
                          ✅ ซิงค์ Webhook ไปยัง LINE Developers สำเร็จแล้ว!
                        </strong>
                        <p className="text-[11px] text-emerald-800">
                          ระบบได้อัปเดต Webhook URL ใน LINE Developers ให้เรียบร้อยแล้ว เมื่อกดปุ่ม «อนุมัติ» ใน LINE ระบบจะเปลี่ยนสถานะอัตโนมัติทันที
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold text-red-900">
                          ⚠️ ไม่สามารถอัปเดต LINE Webhook ได้
                        </strong>
                        <p className="text-[11px] text-red-800">
                          {syncLineResult.error}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Webhook Diagnostics */}
              {webhookTestResult && (
                <div className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                  webhookTestResult.isLibraryUrl
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : webhookTestResult.isOutdated 
                    ? 'bg-amber-50 border-amber-300 text-amber-950' 
                    : webhookTestResult.status === 'ready'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  {webhookTestResult.isLibraryUrl ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <strong className="block font-bold text-amber-900">
                          ⚠️ URL ที่ระบุเป็น «ลิงก์ไลบรารี» (Library URL)
                        </strong>
                        <p className="text-[11px]">
                          {webhookTestResult.error}
                        </p>
                      </div>
                    </>
                  ) : webhookTestResult.isOutdated ? (
                    <div className="space-y-3 w-full">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-bold text-amber-900 text-xs sm:text-sm">
                            ⚠️ ตรวจพบ: Google Apps Script ยังเป็นเวอร์ชันเก่า (ยังไม่ได้กด Deploy «เวอร์ชันใหม่»)
                          </strong>
                          <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                            นี่คือสาเหตุที่เมื่อกดปุ่ม «อนุมัติ» ใน LINE แล้ว ในระบบเว็บยังขึ้นเป็น «รออนุมัติ» เพราะตัว Web App ใน Google ยังไม่ได้เปิดใช้งานฟังก์ชันรับข้อมูลจาก LINE ครับ
                          </p>
                        </div>
                      </div>

                      {/* 3 Steps Resolution Box */}
                      <div className="bg-white/95 rounded-xl p-3.5 border border-amber-300 text-slate-800 space-y-2.5 text-xs shadow-xs">
                        <div className="font-bold text-amber-950 flex items-center justify-between">
                          <span>👉 ขั้นตอนแก้ไขให้กดใน LINE แล้วเว็บอนุมัติทันที (ทำเพียง 3 ขั้นตอนใน 1 นาที):</span>
                        </div>

                        <div className="space-y-2 text-[11px] leading-relaxed">
                          <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                            <div>
                              <span>เปิดไฟล์ <strong>Code.gs</strong> ใน Apps Script ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดใหม่ล่าสุด</span>
                              <div className="flex gap-2 mt-1.5 flex-wrap">
                                <a
                                  href="https://script.google.com/d/1z68aySPejPfl9ZJCUB776oPdmoOt06MF9O1-L5mHeseaeGev--VXVcre/edit"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] shadow-xs"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>เปิดหน้า Apps Script ของท่าน ↗</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={handleCopyCode}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-[10px] cursor-pointer"
                                >
                                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  <span>{copiedCode ? 'คัดลอกโค้ดแล้ว!' : 'คัดลอก Code.gs ใหม่ทันที'}</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                            <div>
                              <span>ที่มุมขวาบนของหน้า Apps Script กดปุ่มสีน้ำเงิน <strong>"การทำให้ใช้งานได้" (Deploy) &gt; "จัดการการทำให้ใช้งานได้" (Manage deployments)</strong></span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                            <div>
                              <span>กดไอคอนดินสอ ✏️ <strong>"แก้ไข" (Edit)</strong> &gt; ที่ช่อง <strong>"เวอร์ชัน" ให้เลือก "เวอร์ชันใหม่" (New version)</strong> &gt; แล้วกดปุ่ม <strong>"ทำให้ใช้งานได้" (Deploy)</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-amber-200 flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[10px] text-slate-500">
                            * เมื่อกด Deploy เรียบร้อยแล้ว ให้กดปุ่มทดสอบด้านล่างนี้ได้เลยครับ:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTestWebhook()}
                            disabled={testingWebhook}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${testingWebhook ? 'animate-spin' : ''}`} />
                            <span>{testingWebhook ? 'กำลังตรวจสอบ...' : '🔄 ทดสอบผลหลัง Deploy ใหม่'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : webhookTestResult.status === 'ready' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <strong className="block font-bold text-emerald-900">
                          ✅ ยอดเยี่ยม! Google Apps Script เป็นเวอร์ชันล่าสุด 100%
                        </strong>
                        <p className="text-[11px]">
                          ระบบพร้อมรับการกดปุ่มอนุมัติหรือพิมพ์อนุมัติใน LINE ได้ทันที ข้อมูลจะซิงค์กับหน้าเว็บอัตโนมัติ
                        </p>
                        {webhookTestResult.lineEndpointInfo && (
                          <div className="text-[10px] text-slate-600 bg-white/70 p-1.5 rounded-md mt-1">
                            สถานะ Webhook ใน LINE Developers: {webhookTestResult.lineEndpointInfo.testSuccess ? '🟢 ผ่าน (200 OK)' : '🔴 ยังไม่เชื่อมต่อ'} ({webhookTestResult.lineEndpointInfo.registeredEndpoint || 'ยังไม่กำหนด'})
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div>{webhookTestResult.error || webhookTestResult.message || 'ไม่สามารถทดสอบได้'}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 1: The 5 Sheets Download & Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Table className="w-4 h-4 text-slate-600" />
                <span>แม่แบบตาราง 5 ชีต (ดาวน์โหลดไฟล์ CSV)</span>
              </h4>
              <button
                onClick={() => handleDownloadCSV(activeSheetTab)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer border border-slate-300"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลดชีต {activeSheetTab}.csv</span>
              </button>
            </div>

            {/* Sheet Tabs */}
            <div className="flex border-b border-slate-200 overflow-x-auto gap-1">
              {(Object.keys(CSV_TEMPLATES) as Array<keyof typeof CSV_TEMPLATES>).map(sheetName => (
                <button
                  key={sheetName}
                  onClick={() => setActiveSheetTab(sheetName)}
                  className={`px-3 py-1.5 rounded-t-lg font-semibold text-xs transition-all cursor-pointer ${
                    activeSheetTab === sheetName
                      ? 'bg-slate-800 text-white border-b-2 border-emerald-500'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {sheetName}
                </button>
              ))}
            </div>

            {/* CSV Content preview */}
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800">
              <pre>{CSV_TEMPLATES[activeSheetTab]}</pre>
            </div>
          </div>

          {/* Section 2: Code.gs Viewer with 1-click Copy */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-emerald-600" />
                  <span>โค้ด Google Apps Script เต็มรูปแบบ (Code.gs)</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  รองรับฟังก์ชันสร้าง 5 ชีต, รับ doPost, ค้นหาหัวหน้าตามสาขา, ส่ง LINE Flex Message, และส่งผลแจ้งเตือนครู
                </p>
              </div>

              <button
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-md shadow-emerald-600/20 transition-all shrink-0"
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'คัดลอกโค้ดแล้ว!' : 'คัดลอก Code.gs ทั้งหมด'}</span>
              </button>
            </div>

            <div className="bg-slate-950 text-slate-200 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-72 border border-slate-800 leading-5">
              <pre>{GOOGLE_APPS_SCRIPT_CODE}</pre>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            * ระบบใน AI Studio นี้มี Local Database พร้อมทำงานได้ทันทีแม้ยังไม่ต่อ Google Sheets จริง
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-xs cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
