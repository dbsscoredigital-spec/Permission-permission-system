import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { ExitRequest } from '../types';
import { DonBoscoLogo } from './DonBoscoLogo';
import { X, CheckCircle, Clock, Calendar, MapPin, Building2, ShieldCheck, Printer, Barcode, QrCode } from 'lucide-react';

interface QrPassModalProps {
  request: ExitRequest | null;
  onClose: () => void;
  onPrint: (req: ExitRequest) => void;
  logoUrl?: string;
  schoolName?: string;
}

export const QrPassModal: React.FC<QrPassModalProps> = ({ request, onClose, onPrint, logoUrl, schoolName }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string>('');
  const [activeCodeTab, setActiveCodeTab] = useState<'qr' | 'barcode'>('qr');

  useEffect(() => {
    if (!request) return;

    // 1. QR Code with direct verification link
    const verifyUrl = `${window.location.origin}${window.location.pathname}?verify=${request.id}`;
    QRCode.toDataURL(verifyUrl, {
      width: 260,
      margin: 2,
      color: {
        dark: '#064e3b',
        light: '#ffffff'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error(err));

    // 2. 1D Barcode (Code-128)
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, request.id, {
        format: 'CODE128',
        width: 2.2,
        height: 60,
        displayValue: true,
        fontSize: 13,
        font: 'monospace',
        textMargin: 3,
        margin: 4
      });
      setBarcodeDataUrl(canvas.toDataURL('image/png'));
    } catch (e) {
      console.error(e);
    }
  }, [request]);

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-200 relative">
        {/* Top Header Card */}
        <div className="bg-linear-to-b from-emerald-600 to-teal-700 p-5 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex justify-center mb-2">
            <div className="p-1 rounded-full bg-white shadow-md">
              <DonBoscoLogo size={46} logoUrl={logoUrl} />
            </div>
          </div>

          <h3 className="font-bold text-base leading-tight">
            บัตรผ่านออกนอกสถานศึกษา
          </h3>
          <p className="text-[11px] text-emerald-100 mt-0.5 font-medium">
            {schoolName || 'วิทยาลัยเทคโนโลยีดอนบอสโกสุราษฎร์'}
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-emerald-800 text-xs font-bold shadow-xs">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>อนุมัติแล้ว (APPROVED)</span>
          </div>
        </div>

        {/* Code Selector Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => setActiveCodeTab('qr')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeCodeTab === 'qr'
                ? 'bg-white text-emerald-700 border-b-2 border-emerald-600 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>คิวอาร์โค้ด (QR)</span>
          </button>

          <button
            onClick={() => setActiveCodeTab('barcode')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeCodeTab === 'barcode'
                ? 'bg-white text-emerald-700 border-b-2 border-emerald-600 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Barcode className="w-4 h-4" />
            <span>บาร์โค้ด (Barcode)</span>
          </button>
        </div>

        {/* Code Container */}
        <div className="p-5 text-center space-y-3">
          <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100 inline-block shadow-inner w-full">
            {activeCodeTab === 'qr' ? (
              qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Pass" className="w-44 h-44 mx-auto rounded-lg" />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                  กำลังสร้าง QR Code...
                </div>
              )
            ) : (
              barcodeDataUrl ? (
                <div className="py-4">
                  <img src={barcodeDataUrl} alt="Barcode" className="max-w-full h-16 mx-auto object-contain" />
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center text-xs text-slate-400">
                  กำลังสร้าง Barcode...
                </div>
              )
            )}
            <span className="text-[10px] font-mono text-emerald-800 block mt-1 font-bold tracking-wider">
              {request.id}
            </span>
          </div>

          {/* Details Card */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-left text-xs space-y-1.5">
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5">
              <span className="text-slate-400">ผู้ขออนุญาต:</span>
              <strong className="text-slate-800">{request.userName}</strong>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">สาขาวิชา:</span>
              <span className="font-semibold text-slate-800">{request.branchName}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">วันที่อนุญาต:</span>
              <span className="font-semibold text-slate-800">{request.exitDate}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">ช่วงเวลา:</span>
              <span className="font-bold text-emerald-700">{request.exitTime} – {request.returnTime} น.</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">สถานที่:</span>
              <span className="font-medium text-slate-800 truncate max-w-[170px]">{request.destination}</span>
            </div>

            <div className="pt-1 border-t border-slate-200/60 flex justify-between items-center text-[10px] text-slate-500">
              <span>ผู้อนุมัติ:</span>
              <span className="truncate max-w-[170px] font-medium text-slate-700">{request.assignedApproverName.split(' ')[0]} {request.assignedApproverName.split(' ')[1]}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            แสดง QR Code นี้แก่เจ้าหน้าที่รักษาความปลอดภัย ณ ประตูทางเข้า-ออก
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => onPrint(request)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ใบอนุญาต</span>
            </button>

            <button
              onClick={onClose}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
