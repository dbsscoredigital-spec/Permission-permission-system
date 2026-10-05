import React, { useState } from 'react';
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
  Table
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
          </div>

          {/* Web App URL Configuration */}
          <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-emerald-600" />
              <span>กำหนด Google Apps Script Web App URL สำหรับระบบนี้</span>
            </h4>
            
            <form onSubmit={handleSaveUrl} className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
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

            {savedUrlNotice && (
              <span className="text-[11px] text-emerald-700 font-semibold block">
                ✓ บันทึก Google Apps Script Endpoint เรียบร้อยแล้ว ระบบจะซิงค์ข้อมูลอัตโนมัติ
              </span>
            )}
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
