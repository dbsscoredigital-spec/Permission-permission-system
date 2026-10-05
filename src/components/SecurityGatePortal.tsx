import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { User, ExitRequest } from '../types';
import { 
  QrCode, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Calendar, 
  MapPin, 
  Car, 
  User as UserIcon,
  ShieldCheck,
  ArrowRightCircle,
  ArrowLeftCircle,
  Sparkles,
  Camera,
  Upload,
  Volume2,
  Barcode
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SecurityGatePortalProps {
  currentUser: User;
  requests: ExitRequest[];
  onGateCheckAction: (requestId: string, action: 'gate_exit' | 'gate_return') => void;
  onViewQrPass: (req: ExitRequest) => void;
}

export const SecurityGatePortal: React.FC<SecurityGatePortalProps> = ({
  currentUser,
  requests,
  onGateCheckAction,
  onViewQrPass
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [scannedRequest, setScannedRequest] = useState<ExitRequest | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Real Camera Scanner State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const approvedRequests = requests.filter(r => r.status === 'approved');

  // Friendly scanner beep sound effect
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, audioCtx.currentTime); // C6 note
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.16);
    } catch {
      // ignore
    }
  };

  const handleVerify = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setErrorMessage('');

    // Extract ID if input is a URL (e.g. https://...?verify=REQ-...)
    let target = trimmed;
    try {
      if (trimmed.includes('verify=')) {
        const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://dummy.com/${trimmed}`);
        const v = urlObj.searchParams.get('verify');
        if (v) target = v;
      }
    } catch {
      // ignore
    }

    const cleanTarget = target.toLowerCase();

    const found = requests.find(r => 
      r.id.toLowerCase() === cleanTarget ||
      r.qrToken.toLowerCase() === cleanTarget ||
      r.userName.toLowerCase().includes(cleanTarget) ||
      cleanTarget.includes(r.id.toLowerCase()) ||
      cleanTarget.includes(r.qrToken.toLowerCase())
    );

    if (found) {
      setScannedRequest(found);
      setTokenInput(found.id);
      playBeep();
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }
    } else {
      setScannedRequest(null);
      setErrorMessage(`ไม่พบข้อมูลใบอนุญาตที่ตรงกับ "${trimmed}" ในระบบ`);
    }
  };

  // Camera scanner lifecycle
  useEffect(() => {
    const readerElementId = "gate-qr-camera-reader";

    if (isCameraActive) {
      setCameraError('');
      const qrCodeScanner = new Html5Qrcode(readerElementId);
      html5QrCodeRef.current = qrCodeScanner;

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      qrCodeScanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          handleVerify(decodedText);
          // Stop camera after successful detection
          stopCamera();
        },
        () => {
          // Frame scan callback (silent ignore)
        }
      ).catch(err => {
        console.warn("Camera start error", err);
        setCameraError('ไม่สามารถเปิดกล้องได้: ' + (err.message || 'โปรดอนุญาตให้เบราว์เซอร์เข้าถึงกล้อง'));
        setIsCameraActive(false);
      });
    }

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, [isCameraActive]);

  const stopCamera = () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      html5QrCodeRef.current.stop()
        .then(() => {
          setIsCameraActive(false);
        })
        .catch(err => {
          console.error('Failed to stop camera', err);
          setIsCameraActive(false);
        });
    } else {
      setIsCameraActive(false);
    }
  };

  // File upload scanner (scan image containing Barcode or QR code)
  const handleFileUploadScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const scanner = new Html5Qrcode("gate-file-scanner-dummy");
      const decodedText = await scanner.scanFile(file, true);
      handleVerify(decodedText);
    } catch (err) {
      setErrorMessage('ไม่พบบาร์โค้ดหรือ QR Code ในรูปภาพที่เลือก กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleSelectQuick = (req: ExitRequest) => {
    setTokenInput(req.id);
    handleVerify(req.id);
  };

  const handleGateAction = (action: 'gate_exit' | 'gate_return') => {
    if (!scannedRequest) return;
    onGateCheckAction(scannedRequest.id, action);
    // Refresh scanned
    const updated = requests.find(r => r.id === scannedRequest.id);
    if (updated) {
      setScannedRequest({ ...updated });
    }
  };

  // Determine time validity
  const getValidityStatus = (req: ExitRequest) => {
    if (req.status !== 'approved') {
      return {
        badge: 'bg-rose-100 text-rose-800 border-rose-300',
        icon: <XCircle className="w-5 h-5 text-rose-600" />,
        title: 'ไม่อนุญาตให้ออก (คำขอยังไม่ได้รับการอนุมัติ)',
        allowed: false
      };
    }

    return {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
      title: '✅ ผ่านการอนุมัติถูกต้องจากหัวหน้าสาขา',
      allowed: true
    };
  };

  return (
    <div className="space-y-6">
      {/* Hidden container for file scan processing */}
      <div id="gate-file-scanner-dummy" className="hidden" />

      {/* Banner */}
      <div className="bg-linear-to-r from-amber-800 to-slate-900 rounded-2xl p-4 sm:p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="bg-amber-500/30 text-amber-200 border border-amber-400/30 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold inline-flex items-center gap-1.5 mb-2">
            <QrCode className="w-3.5 h-3.5" />
            จุดตรวจป้อมยามประตูสถานศึกษา (Campus Gate Checkpoint)
          </span>
          <h2 className="text-base sm:text-xl font-bold tracking-tight">
            ระบบสแกนตรวจสอบใบอนุญาต (บาร์โค้ด & QR Code)
          </h2>
          <p className="text-[11px] sm:text-xs text-amber-200/90 mt-1 max-w-xl">
            สแกนได้จริงทั้งบาร์โค้ด (Barcode Code-128) และคิวอาร์โค้ด (QR Code) จากโทรศัพท์มือถือ หรือกระดาษพิมพ์ใบอนุญาต โดยใช้กล้องมือถือ/เว็บบอร์ด หรือปืนยิงบาร์โค้ด
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15 text-xs text-amber-100 shrink-0">
          <div className="font-bold text-white mb-0.5">สถานะจุดตรวจ: ประตู 1 (Main Gate)</div>
          <div>เจ้าหน้าที่ประจำการ: <strong>{currentUser.name}</strong></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Camera Scanner & Barcode Input (1 col) */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-600" />
                <span>เครื่องสแกนบาร์โค้ด & QR Code</span>
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                กล้องสดใช้งานได้จริง
              </span>
            </div>

            {/* Live Camera Scanner Box */}
            <div className="bg-slate-900 rounded-2xl p-2 overflow-hidden text-center text-white relative">
              {isCameraActive ? (
                <div className="space-y-2">
                  <div id="gate-qr-camera-reader" className="w-full rounded-xl overflow-hidden bg-black aspect-square" />
                  <div className="flex items-center justify-between px-2 text-xs">
                    <span className="text-emerald-400 flex items-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      กำลังเปิดกล้องสแกน...
                    </span>
                    <button
                      onClick={stopCamera}
                      className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                    >
                      ปิดกล้อง
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-6 px-3 space-y-3">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
                    <Barcode className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-300">
                    สามารถเปิดกล้องโทรศัพท์ หรือใช้เครื่องยิงบาร์โค้ด USB เพื่อสแกนได้ทันที
                  </p>
                  <button
                    onClick={() => setIsCameraActive(true)}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/30 cursor-pointer transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>เปิดกล้องสแกนสด (โทรศัพท์ / เว็บบอร์ด)</span>
                  </button>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Input Box for Barcode Gun or Manual Typing */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-600 block">
                หรือป้อนรหัสคำขอ / ใช้ปืนยิงบาร์โค้ด:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify(tokenInput)}
                  placeholder="สแกนบาร์โค้ด / พิมพ์รหัสคำขอ (เช่น REQ-...)"
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-mono"
                />
                <button
                  onClick={() => handleVerify(tokenInput)}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
                  title="ตรวจสอบ"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Upload image file scanner */}
              <div className="pt-1">
                <label className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer border border-slate-200 transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  <span>เลือกรูปภาพบาร์โค้ด / QR เพื่อสแกน</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUploadScan}
                    className="hidden"
                  />
                </label>
              </div>

              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Quick Demo Selector */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                ⚡ คลิกทดสอบสแกนใบอนุญาตที่อนุมัติแล้ว:
              </span>
              <div className="space-y-1.5">
                {approvedRequests.map((req, idx) => (
                  <button
                    key={`sec-appr-${req.id}-${idx}`}
                    onClick={() => handleSelectQuick(req)}
                    className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-amber-50 hover:border-amber-200 border border-slate-200/80 transition-all text-xs cursor-pointer flex items-center justify-between"
                  >
                    <div className="truncate">
                      <strong className="text-slate-800 block truncate">{req.userName}</strong>
                      <span className="text-[10px] text-slate-500 font-mono">{req.id} • สาขา{req.branchName}</span>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold shrink-0 ml-2">
                      อนุมัติแล้ว
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Verification Results & Gate Timestamp Buttons (2 cols) */}
        <div className="lg:col-span-2">
          {scannedRequest ? (
            <div className="bg-white rounded-2xl border-2 border-emerald-400 shadow-lg p-4 sm:p-6 space-y-5 animate-in fade-in">
              {/* Validity Banner */}
              {(() => {
                const validity = getValidityStatus(scannedRequest);
                return (
                  <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${validity.badge}`}>
                    <div className="flex items-center gap-3">
                      {validity.icon}
                      <div>
                        <h4 className="font-bold text-sm">{validity.title}</h4>
                        <span className="text-xs opacity-90 block font-mono">
                          รหัสเอกสาร: {scannedRequest.id}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onViewQrPass(scannedRequest)}
                      className="px-3 py-1.5 rounded-lg bg-white/80 hover:bg-white text-xs font-semibold text-slate-800 shadow-2xs cursor-pointer shrink-0"
                    >
                      ดูบัตรผ่าน QR
                    </button>
                  </div>
                );
              })()}

              {/* Teacher & Request Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[11px]">ชื่อครูผู้ขอออก:</span>
                  <strong className="text-slate-900 text-base">{scannedRequest.userName}</strong>
                  <span className="text-slate-600 block">{scannedRequest.position} • สาขา{scannedRequest.branchName}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">ผู้อนุมัติประจำสาขา:</span>
                  <strong className="text-slate-900 text-sm">{scannedRequest.assignedApproverName}</strong>
                  <span className="text-emerald-700 block font-semibold">อนุมัติเมื่อ: {scannedRequest.approvedAt || 'อนุมัติแล้ว'}</span>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[11px]">วันที่ขอออก:</span>
                      <strong className="text-slate-800">{scannedRequest.exitDate}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">ช่วงเวลาที่อนุญาต:</span>
                      <strong className="text-slate-800 text-emerald-700">{scannedRequest.exitTime} – {scannedRequest.returnTime} น.</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">วิธีเดินทาง:</span>
                      <strong className="text-slate-800">{scannedRequest.travelMethod || 'ตามภารกิจราชการ'}</strong>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-400 block text-[11px]">สถานที่ไป:</span>
                  <p className="text-slate-900 font-semibold">{scannedRequest.destination}</p>
                  <span className="text-slate-400 block text-[11px] mt-1">เหตุผล:</span>
                  <p className="text-slate-700">{scannedRequest.reason}</p>
                </div>
              </div>

              {/* Gate Actions */}
              <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  การบันทึกเวลาจริงที่ประตูสถานศึกษา (Gate Check Timestamp)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Exit Stamp */}
                  <div className="bg-white p-3.5 rounded-xl border border-amber-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500 block">เวลาออกประตูจริง:</span>
                      <strong className="text-base font-bold text-slate-900">
                        {scannedRequest.actualExitTime ? (
                          <span className="text-emerald-700">{scannedRequest.actualExitTime} น.</span>
                        ) : (
                          <span className="text-slate-400 font-normal">ยังไม่ได้บันทึก</span>
                        )}
                      </strong>
                    </div>
                    <button
                      onClick={() => handleGateAction('gate_exit')}
                      className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-all"
                    >
                      <ArrowRightCircle className="w-4 h-4" />
                      <span>{scannedRequest.actualExitTime ? 'บันทึกเวลาออกใหม่' : 'บันทึกเวลาออกจริง'}</span>
                    </button>
                  </div>

                  {/* Return Stamp */}
                  <div className="bg-white p-3.5 rounded-xl border border-amber-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500 block">เวลากลับเข้าประตูจริง:</span>
                      <strong className="text-base font-bold text-slate-900">
                        {scannedRequest.actualReturnTime ? (
                          <span className="text-blue-700">{scannedRequest.actualReturnTime} น.</span>
                        ) : (
                          <span className="text-slate-400 font-normal">ยังไม่ได้บันทึก</span>
                        )}
                      </strong>
                    </div>
                    <button
                      onClick={() => handleGateAction('gate_return')}
                      className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-all"
                    >
                      <ArrowLeftCircle className="w-4 h-4" />
                      <span>{scannedRequest.actualReturnTime ? 'บันทึกเวลากลับใหม่' : 'บันทึกเวลากลับจริง'}</span>
                    </button>
                  </div>
                </div>

                {scannedRequest.checkedBySecurity && (
                  <p className="text-[11px] text-slate-500 text-right">
                    บันทึกโดย: <strong>{scannedRequest.checkedBySecurity}</strong>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs space-y-3">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <Barcode className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                พร้อมตรวจสอบใบอนุญาตผ่านประตู
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                ใช้กล้องโทรศัพท์สแกนบาร์โค้ด / QR Code จากหน้าจอหรือใบอนุญาตกระดาษ หรือคลิกตัวอย่างรายการด้านซ้ายเพื่อทดสอบ
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
