import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { ExitRequest } from '../types';
import { DonBoscoLogo } from './DonBoscoLogo';
import { X, Printer, Download, CheckCircle, Loader2 } from 'lucide-react';

interface PrintSlipModalProps {
  request: ExitRequest | null;
  onClose: () => void;
  logoUrl?: string;
  schoolName?: string;
}

export const PrintSlipModal: React.FC<PrintSlipModalProps> = ({ request, onClose, logoUrl, schoolName }) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [barcodeUrl, setBarcodeUrl] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);

  useEffect(() => {
    if (!request) return;

    // 1. Generate real 1D Barcode (Code-128)
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, request.id, {
        format: 'CODE128',
        width: 2,
        height: 44,
        displayValue: true,
        fontSize: 12,
        font: 'monospace',
        textMargin: 2,
        margin: 2
      });
      setBarcodeUrl(canvas.toDataURL('image/png'));
    } catch (e) {
      console.error('Barcode error', e);
    }

    // 2. Generate real 2D QR Code with direct verification link
    const verifyUrl = `${window.location.origin}${window.location.pathname}?verify=${request.id}`;
    QRCode.toDataURL(verifyUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    }).then(setQrUrl).catch(console.error);
  }, [request]);

  if (!request) return null;

  const isApproved = request.status === 'approved';
  const approverName = request.approvedBy || request.assignedApproverName;
  const subName = request.substituteTeacherName || 'ครูผู้สอนแทน';

  const generateDocumentHtml = () => {
    return `
      <div style="font-family: 'Sarabun', 'TH Sarabun New', Tahoma, sans-serif; color: #111827; background: #ffffff; padding: 12px; font-size: 13.5pt; line-height: 1.65; max-width: 800px; margin: 0 auto;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 18px;">
          <div style="width: 72px; height: 72px; margin: 0 auto 8px auto;">
            ${logoUrl ? `
              <img src="${logoUrl}" alt="ตราสถาบัน" style="width: 100%; height: 100%; object-fit: contain; display: block; margin: 0 auto;" />
            ` : `
            <svg viewBox="0 0 400 400" style="width: 100%; height: 100%; display: block;" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="200" cy="200" r="192" fill="#ffffff" />
              <circle cx="200" cy="200" r="190" stroke="#0e2348" stroke-width="9" />
              <circle cx="200" cy="200" r="132" stroke="#0e2348" stroke-width="4" />
              <defs>
                <path id="prntTopArc" d="M 52,200 A 148,148 0 1,1 348,200" fill="none" />
                <path id="prntBottomArc" d="M 54,200 A 146,146 0 0,0 346,200" fill="none" />
                <path id="prntMottoArc" d="M 95,270 A 110,110 0 0,0 305,270" fill="none" />
              </defs>
              <text fill="#0e2348" font-size="21.5" font-weight="900" font-family="'Sarabun', 'TH Sarabun New', sans-serif">
                <textPath href="#prntTopArc" startOffset="50%" text-anchor="middle">วิทยาลัยเทคโนโลยีดอนบอสโกสุราษฎร์</textPath>
              </text>
              <g transform="translate(18, 178) scale(0.9)" stroke="#0e2348" stroke-width="3" fill="none">
                <path d="M 5,20 C 15,10 30,12 40,16 L 40,38 C 30,34 15,32 5,42 Z" fill="#0e2348" fill-opacity="0.1" />
                <path d="M 75,20 C 65,10 50,12 40,16 L 40,38 C 50,34 65,32 75,42 Z" fill="#0e2348" fill-opacity="0.1" />
                <line x1="40" y1="16" x2="40" y2="40" stroke="#0e2348" stroke-width="3.5" />
                <path d="M 5,20 Q 22,12 40,16 Q 58,12 75,20" />
                <path d="M 5,42 Q 22,34 40,38 Q 58,34 75,42" />
                <line x1="5" y1="20" x2="5" y2="42" />
                <line x1="75" y1="20" x2="75" y2="42" />
              </g>
              <g transform="translate(340, 178) scale(0.85)" stroke="#0e2348" stroke-width="3.5" fill="#0e2348">
                <path d="M 10,10 L 35,35 M 32,32 L 40,40" stroke-width="5" stroke-linecap="round" />
                <circle cx="8" cy="8" r="7" fill="none" stroke-width="4" />
                <line x1="2" y1="8" x2="8" y2="8" stroke-width="3" />
                <line x1="10" y1="40" x2="38" y2="12" stroke-width="5" stroke-linecap="round" />
                <rect x="30" y="4" width="16" height="10" rx="2" transform="rotate(-45 38 9)" />
              </g>
              <g fill="#0e2348" stroke="#0e2348" stroke-width="0.5">
                <path d="M 148,155 C 145,130 162,105 195,100 C 235,95 258,118 255,145 C 255,155 264,162 260,178 C 256,192 248,198 248,208 C 248,225 240,248 225,258 C 215,265 185,265 175,258 C 160,248 152,225 152,208 C 152,198 144,192 140,178 C 138,165 146,158 148,155 Z" fill-opacity="0.08" stroke="none" />
                <path d="M 152,150 C 144,138 150,118 165,108 C 178,100 195,98 212,100 C 232,102 248,112 254,128 C 258,138 255,150 252,158 C 262,165 260,180 255,190 C 250,192 248,185 248,178 C 245,160 248,140 238,126 C 228,114 212,112 196,114 C 180,116 168,125 162,138 C 158,148 158,162 152,175 C 146,182 144,170 146,162 Z" />
                <path d="M 172,175 C 178,172 188,172 194,176" stroke-width="3.5" fill="none" stroke-linecap="round" />
                <ellipse cx="184" cy="184" rx="4" ry="2.5" />
                <path d="M 210,176 C 216,172 226,172 232,175" stroke-width="3.5" fill="none" stroke-linecap="round" />
                <ellipse cx="220" cy="184" rx="4" ry="2.5" />
                <path d="M 203,178 L 202,205 C 200,209 194,212 198,216 C 202,218 208,218 212,215" stroke-width="3" fill="none" stroke-linecap="round" />
                <path d="M 182,230 C 192,238 212,238 222,230" stroke-width="3.8" fill="none" stroke-linecap="round" />
                <path d="M 192,242 C 198,245 206,245 212,242" stroke-width="2.5" fill="none" stroke-linecap="round" />
                <path d="M 165,198 C 162,222 172,254 202,260 C 232,254 242,222 239,198" stroke-width="3" fill="none" />
                <path d="M 174,265 L 170,290 C 185,296 219,296 234,290 L 230,265 Z" fill="#0e2348" />
                <rect x="196" y="265" width="12" height="15" fill="#ffffff" />
              </g>
              <path d="M 88,276 C 140,326 260,326 312,276" stroke="#0e2348" stroke-width="1.5" stroke-dasharray="3,3" />
              <text fill="#0e2348" font-size="13.5" font-weight="bold" font-family="'Sarabun', 'TH Sarabun New', sans-serif">
                <textPath href="#prntMottoArc" startOffset="50%" text-anchor="middle">วินัย ใฝ่คุณธรรม นำฝีมือ</textPath>
              </text>
              <text fill="#0e2348" font-size="19" font-weight="900" font-family="'Sarabun', 'TH Sarabun New', sans-serif">
                <textPath href="#prntBottomArc" startOffset="50%" text-anchor="middle">อำเภอเมือง จังหวัดสุราษฎร์ธานี</textPath>
              </text>
            </svg>
            `}
          </div>
          <h2 style="font-size: 15.5pt; font-weight: 700; margin: 0 0 3px 0; color: #000;">แบบขออนุญาตออกนอกบริเวณสถานศึกษาในเวลาราชการ</h2>
          <h3 style="font-size: 13.5pt; font-weight: 700; color: #0f2b5c; margin: 0;">${schoolName || 'วิทยาลัยเทคโนโลยีดอนบอสโกสุราษฎร์'}</h3>
        </div>

        <!-- Meta -->
        <div style="display: flex; justify-content: space-between; font-size: 11pt; color: #4b5563; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; margin-bottom: 15px;">
          <span>เลขที่คำขอ: <strong style="color: #000;">${request.id}</strong></span>
          <span>วันที่ยื่นคำขอ: <strong style="color: #000;">${request.submittedAt}</strong></span>
        </div>

        <!-- Body -->
        <div style="font-size: 13pt; line-height: 1.8;">
          <p style="text-indent: 2.5cm; margin: 7px 0;">
            ข้าพเจ้า <strong style="color: #000;">${request.userName}</strong> ตำแหน่ง <strong style="color: #000;">${request.position}</strong> สังกัดสาขาวิชา/กลุ่มสาระ <strong style="color: #000;">${request.branchName}</strong>${request.userPhone ? ` หมายเลขโทรศัพท์ ${request.userPhone}` : ''}
          </p>
          <p style="text-indent: 2.5cm; margin: 7px 0;">
            มีความประสงค์ขออนุญาตออกนอกบริเวณสถานศึกษาในวันที่ <strong style="color: #000;">${request.exitDate}</strong> ตั้งแต่เวลา <strong style="color: #000;">${request.exitTime} น.</strong> ถึงเวลา <strong style="color: #000;">${request.returnTime} น.</strong>
          </p>
          <p style="text-indent: 2.5cm; margin: 7px 0;">
            เพื่อเดินทางไปที่: <strong style="color: #000;">${request.destination}</strong>
          </p>
          <p style="text-indent: 2.5cm; margin: 7px 0;">
            ด้วยเหตุผลความจำเป็นคือ: <strong style="color: #000;">${request.reason}</strong>
          </p>
          ${request.travelMethod && request.travelMethod !== 'ตามภารกิจราชการ' ? `
          <p style="text-indent: 2.5cm; margin: 7px 0;">
            โดยใช้ยานพาหนะ: <strong style="color: #000;">${request.travelMethod} ${request.vehiclePlate ? `(หมายเลขทะเบียน ${request.vehiclePlate})` : ''}</strong> ${request.companions ? `ผู้ร่วมเดินทาง: ${request.companions}` : ''}
          </p>` : ''}
          <p style="text-indent: 2.5cm; margin: 7px 0;">
            การปฏิบัติหน้าที่และภาระงานสอน: <strong style="color: #000;">${request.hasClasses ? `มีคาบสอนในเวลาดังกล่าว ได้มอบหมายให้ ${request.substituteTeacherName || 'ครูผู้สอนแทน'} ปฏิบัติการสอนแทน วิชา ${request.substituteSubject || ''}` : 'ไม่มีคาบสอนในช่วงเวลาดังกล่าว'}</strong>
          </p>
          ${request.hasClasses && request.substituteTasks ? `
          <p style="text-indent: 2.5cm; margin: 7px 0; color: #4b5563; font-size: 11.5pt;">
            งานที่มอบหมายให้นักศึกษาปฏิบัติ: ${request.substituteTasks}
          </p>` : ''}
          ${request.notes ? `
          <p style="text-indent: 2.5cm; margin: 7px 0; color: #4b5563; font-size: 11.5pt;">
            หมายเหตุเพิ่มเติม: ${request.notes}
          </p>` : ''}
        </div>

        <!-- Signatures Grid -->
        <div style="display: table; width: 100%; margin-top: 32px; padding-top: 16px; border-top: 1px solid #d1d5db; font-size: 12pt;">
          <div style="display: table-cell; width: 33.33%; text-align: center; vertical-align: top; padding: 0 4px;">
            <p style="margin: 0 0 5px 0;">
              ลงชื่อ ${isApproved 
                ? `<span style="font-weight: 700; color: #000; border-bottom: 1px solid #000; padding: 0 6px 1px 6px;">${request.userName}</span>` 
                : '......................................................'}
            </p>
            <p style="margin: 0 0 2px 0; font-weight: bold; color: #000;">(${request.userName})</p>
            <p style="margin: 0; color: #6b7280;">ผู้ขออนุญาต</p>
            <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 11pt;">วันที่ ${request.exitDate}</p>
          </div>

          <div style="display: table-cell; width: 33.33%; text-align: center; vertical-align: top; padding: 0 4px;">
            ${request.hasClasses ? `
              <div style="font-size: 10pt; color: #047857; font-weight: bold; margin-bottom: 4px;">
                ${request.substituteStatus === 'acknowledged' ? '[ ✓ ] รับทราบการสอนแทนแล้ว' : '[ ⏳ ] รอรับทราบในระบบ'}
              </div>
              <p style="margin: 0 0 5px 0;">
                ลงชื่อ ${request.substituteStatus === 'acknowledged'
                  ? `<span style="font-weight: 700; color: #000; border-bottom: 1px solid #000; padding: 0 6px 1px 6px;">${subName}</span>`
                  : '......................................................'}
              </p>
              <p style="margin: 0 0 2px 0; font-weight: bold; color: #000;">(${subName})</p>
              <p style="margin: 0; color: #6b7280;">ครูผู้ปฏิบัติการสอนแทน</p>
              <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 10pt;">${request.substituteAcknowledgedAt || ''}</p>
            ` : `
              <div style="padding-top: 22px; color: #9ca3af; font-size: 11pt;">(ไม่มีภาระคาบสอนแทน)</div>
            `}
          </div>

          <div style="display: table-cell; width: 33.33%; text-align: center; vertical-align: top; padding: 0 4px;">
            <div style="font-size: 10pt; color: #047857; font-weight: bold; margin-bottom: 4px;">
              [ ✓ ] อนุมัติผ่านระบบอิเล็กทรอนิกส์
            </div>
            <p style="margin: 0 0 5px 0;">
              ลงชื่อ ${isApproved 
                ? `<span style="font-weight: 700; color: #000; border-bottom: 1px solid #000; padding: 0 6px 1px 6px;">${approverName}</span>` 
                : '......................................................'}
            </p>
            <p style="margin: 0 0 2px 0; font-weight: bold; color: #000;">(${approverName})</p>
            <p style="margin: 0; color: #6b7280;">หัวหน้าสาขาวิชา${request.branchName}</p>
            <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 10pt;">${request.approvedAt || 'อนุมัติแล้ว'}</p>
          </div>
        </div>

        <!-- Security Footer -->
        <div style="margin-top: 26px; padding-top: 14px; border-top: 2px dashed #9ca3af; display: table; width: 100%; font-size: 11.5pt;">
          <div style="display: table-cell; vertical-align: middle;">
            <span style="font-weight: bold; color: #1f2937; display: block; margin-bottom: 2px;">ส่วนสำหรับเจ้าหน้าที่รักษาความปลอดภัย (ป้อมยามประตู):</span>
            <p style="margin: 2px 0; color: #4b5563;">เวลาออกจริง: <strong style="color: #000;">${request.actualExitTime || '........................... น.'}</strong></p>
            <p style="margin: 2px 0; color: #4b5563;">เวลากลับเข้าจริง: <strong style="color: #000;">${request.actualReturnTime || '........................... น.'}</strong></p>
            <p style="margin: 2px 0; color: #6b7280; font-size: 10.5pt;">เจ้าหน้าที่บันทึก: ${request.checkedBySecurity || '..................................................'}</p>
          </div>
          <div style="display: table-cell; width: 190px; text-align: center; vertical-align: middle; border-left: 1px solid #e5e7eb; padding-left: 10px;">
            ${barcodeUrl ? `<img src="${barcodeUrl}" style="height: 44px; max-width: 175px; display: block; margin: 0 auto 6px auto;" alt="Barcode" />` : ''}
            ${qrUrl ? `<img src="${qrUrl}" style="width: 78px; height: 78px; display: block; margin: 0 auto;" alt="QR Code" />` : ''}
            <span style="font-size: 8pt; color: #6b7280; display: block; margin-top: 2px;">สแกนตรวจสอบความถูกต้อง</span>
          </div>
        </div>
      </div>
    `;
  };

  // Robust printing via isolated iframe (works in Chrome, Edge, Safari, iframes & sandboxes)
  const handlePrint = () => {
    setIsPrinting(true);
    try {
      const contentHtml = generateDocumentHtml();
      
      let iframe = document.getElementById('slip-print-frame') as HTMLIFrameElement | null;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'slip-print-frame';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';
        document.body.appendChild(iframe);
      }

      const frameDoc = iframe.contentWindow?.document;
      if (!frameDoc) {
        setIsPrinting(false);
        window.focus();
        window.print();
        return;
      }

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="UTF-8">
          <title>แบบขออนุญาตออกนอกบริเวณสถานศึกษา_${request.id}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 15mm 15mm 15mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: 'Sarabun', 'TH Sarabun New', Tahoma, sans-serif;
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #111827;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          ${contentHtml}
        </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        setIsPrinting(false);
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
        } catch (err) {
          console.warn('Iframe print failed, falling back to window.print()', err);
          window.focus();
          window.print();
        }
      }, 400);
    } catch (e) {
      console.error('Print trigger failed', e);
      setIsPrinting(false);
      window.focus();
      window.print();
    }
  };

  // Direct download option (produces printable HTML file that opens print preview in any browser)
  const handleDownloadFile = () => {
    try {
      const contentHtml = generateDocumentHtml();
      const fullHtml = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>แบบขออนุญาตออกนอกบริเวณสถานศึกษา_${request.id}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: 'Sarabun', Tahoma, sans-serif; max-width: 820px; margin: 20px auto; padding: 25px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; }
    @media print { body { border: none; padding: 0; margin: 0; max-width: 100%; } }
  </style>
</head>
<body>
  ${contentHtml}
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 400);
    });
  </script>
</body>
</html>`;

      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `แบบขออนุญาต_${request.id}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 2500);
    } catch (e) {
      console.error('Download failed', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto print:p-0 print:m-0 print:shadow-none print:w-full print:max-w-none print:max-h-none">
        
        {/* Floating Print Controls (hidden on print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-slate-200 print:hidden gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-slate-900">
              ตัวอย่างเอกสารแบบขออนุญาต
            </span>
            <button
              onClick={onClose}
              className="sm:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Print / Save PDF Button */}
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer transition-all disabled:opacity-70"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังเตรียมพิมพ์...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์เอกสาร / บันทึก PDF</span>
                </>
              )}
            </button>

            {/* Direct File Download Button */}
            <button
              onClick={handleDownloadFile}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 transition-all"
              title="ดาวน์โหลดไฟล์เอกสารเพื่อเปิดพิมพ์ภายหลัง"
            >
              {isDownloaded ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">ดาวน์โหลดแล้ว</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">บันทึกไฟล์</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="hidden sm:block p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Slip Content Container */}
        <div id="printable-slip" className="bg-white text-slate-900 font-['Sarabun',serif] text-xs sm:text-sm leading-relaxed p-4 sm:p-6 border border-slate-300 print:border-none rounded-xl">
          {/* Header */}
          <div className="text-center mb-5 sm:mb-6">
            <div className="flex justify-center mb-2">
              <DonBoscoLogo size={70} logoUrl={logoUrl} />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">แบบขออนุญาตออกนอกบริเวณสถานศึกษาในเวลาราชการ</h2>
            <h3 className="text-xs sm:text-sm font-bold text-[#0f2b5c]">{schoolName || 'วิทยาลัยเทคโนโลยีดอนบอสโกสุราษฎร์'}</h3>
          </div>

          <div className="flex justify-between items-start text-[11px] sm:text-xs text-slate-600 mb-3 sm:mb-4 border-b pb-2 border-slate-200">
            <span>เลขที่คำขอ: <strong>{request.id}</strong></span>
            <span>วันที่ยื่นคำขอ: <strong>{request.submittedAt}</strong></span>
          </div>

          {/* Body Paragraphs */}
          <div className="space-y-2.5 sm:space-y-3 text-[11px] sm:text-xs leading-5 sm:leading-6">
            <p className="indent-6 sm:indent-8">
              ข้าพเจ้า <strong>{request.userName}</strong> ตำแหน่ง <strong>{request.position}</strong> สังกัดสาขาวิชา/กลุ่มสาระ <strong>{request.branchName}</strong>{request.userPhone ? ` หมายเลขโทรศัพท์ ${request.userPhone}` : ''}
            </p>
            <p className="indent-8">
              มีความประสงค์ขออนุญาตออกนอกบริเวณสถานศึกษาในวันที่ <strong>{request.exitDate}</strong> ตั้งแต่เวลา <strong>{request.exitTime} น.</strong> ถึงเวลา <strong>{request.returnTime} น.</strong>
            </p>
            <p className="indent-8">
              เพื่อเดินทางไปที่: <strong>{request.destination}</strong>
            </p>
            <p className="indent-8">
              ด้วยเหตุผลความจำเป็นคือ: <strong>{request.reason}</strong>
            </p>
            {request.travelMethod && request.travelMethod !== 'ตามภารกิจราชการ' && (
              <p className="indent-8">
                โดยใช้ยานพาหนะ: <strong>{request.travelMethod} {request.vehiclePlate && `(หมายเลขทะเบียน ${request.vehiclePlate})`}</strong> {request.companions && `ผู้ร่วมเดินทาง: ${request.companions}`}
              </p>
            )}
            <p className="indent-8">
              การปฏิบัติหน้าที่และภาระงานสอน: <strong>{request.hasClasses ? `มีคาบสอนในเวลาดังกล่าว ได้มอบหมายให้ ${request.substituteTeacherName || 'ครูผู้สอนแทน'} ปฏิบัติการสอนแทน วิชา ${request.substituteSubject || ''}` : 'ไม่มีคาบสอนในช่วงเวลาดังกล่าว'}</strong>
            </p>
            {request.hasClasses && request.substituteTasks && (
              <p className="indent-8 text-slate-600 text-[11px]">
                งานที่มอบหมายให้นักศึกษาปฏิบัติ: {request.substituteTasks}
              </p>
            )}
            {request.notes && (
              <p className="indent-8 text-slate-600 text-[11px]">
                หมายเหตุเพิ่มเติม: {request.notes}
              </p>
            )}
          </div>

          {/* Signatures & Approvals Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-4 border-t border-slate-300 text-xs">
            {/* 1. Teacher Sign */}
            <div className="text-center space-y-1">
              <p>
                ลงชื่อ {isApproved ? (
                  <span className="font-bold text-slate-900 border-b border-slate-900 px-2 pb-0.5">
                    {request.userName}
                  </span>
                ) : (
                  '......................................................'
                )}
              </p>
              <p className="font-semibold">({request.userName})</p>
              <p className="text-slate-500">ผู้ขออนุญาต</p>
              <p className="text-slate-500 text-[11px]">วันที่ {request.exitDate}</p>
            </div>

            {/* 2. Substitute Teacher Sign (if applicable) */}
            <div className="text-center space-y-1 bg-slate-50/50 p-2 rounded-xl border border-slate-200">
              {request.hasClasses ? (
                <>
                  <div className="text-[10px] text-emerald-700 font-bold mb-0.5">
                    {request.substituteStatus === 'acknowledged' ? '[ ✓ ] รับทราบการสอนแทนแล้ว' : '[ ⏳ ] รอรับทราบในระบบ'}
                  </div>
                  <p>
                    ลงชื่อ {request.substituteStatus === 'acknowledged' ? (
                      <span className="font-bold text-slate-900 border-b border-slate-900 px-2 pb-0.5">
                        {subName}
                      </span>
                    ) : (
                      '......................................................'
                    )}
                  </p>
                  <p className="font-semibold">({subName})</p>
                  <p className="text-slate-500">ครูผู้ปฏิบัติการสอนแทน</p>
                  <p className="text-slate-500 text-[10px]">{request.substituteAcknowledgedAt || ''}</p>
                </>
              ) : (
                <div className="py-4 text-slate-400 text-[11px]">
                  (ไม่มีภาระคาบสอนแทน)
                </div>
              )}
            </div>

            {/* 3. Approver Sign */}
            <div className="text-center space-y-1 bg-slate-50/70 p-2 rounded-xl border border-slate-200">
              <div className="text-[10px] text-emerald-700 font-bold mb-0.5">
                [ ✓ ] อนุมัติผ่านระบบอิเล็กทรอนิกส์
              </div>
              <p>
                ลงชื่อ {isApproved ? (
                  <span className="font-bold text-slate-900 border-b border-slate-900 px-2 pb-0.5">
                    {approverName}
                  </span>
                ) : (
                  '......................................................'
                )}
              </p>
              <p className="font-semibold">({approverName})</p>
              <p className="text-slate-500">หัวหน้าสาขาวิชา{request.branchName}</p>
              <p className="text-slate-500 text-[10px]">{request.approvedAt || 'อนุมัติแล้ว'}</p>
            </div>
          </div>

          {/* Footer Security QR & Barcode & Gate Check */}
          <div className="mt-8 pt-4 border-t-2 border-dashed border-slate-300 flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
            <div className="space-y-1 w-full sm:w-auto">
              <span className="font-bold text-slate-800 block">ส่วนสำหรับเจ้าหน้าที่รักษาความปลอดภัย (ป้อมยามประตู):</span>
              <p className="text-slate-600">เวลาออกจริง: <strong>{request.actualExitTime || '........................... น.'}</strong></p>
              <p className="text-slate-600">เวลากลับเข้าจริง: <strong>{request.actualReturnTime || '........................... น.'}</strong></p>
              <p className="text-slate-500 text-[11px]">เจ้าหน้าที่บันทึก: {request.checkedBySecurity || '..................................................'}</p>
            </div>

            <div className="text-center sm:pl-4 sm:border-l border-slate-200 shrink-0">
              {barcodeUrl && (
                <img src={barcodeUrl} alt="Barcode" className="h-11 mx-auto mb-1.5 object-contain" />
              )}
              {qrUrl && <img src={qrUrl} alt="QR Code" className="w-20 h-20 mx-auto" />}
              <span className="text-[10px] font-mono text-slate-400 block mt-1">สแกนตรวจสอบความถูกต้อง</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
