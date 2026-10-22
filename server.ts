import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { INITIAL_USERS, INITIAL_BRANCHES } from './src/data/initialData';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data persistence path
const DATA_FILE = path.join(__dirname, 'server_data.json');

// Public Tunnel Manager (Provides clean public HTTPS URL without 302 Google auth redirects)
let cachedTunnelUrl = '';

const getTunnelUrl = (): string => {
  try {
    if (fs.existsSync('/tmp/tunnel.log')) {
      const content = fs.readFileSync('/tmp/tunnel.log', 'utf8');
      const matches = content.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/g);
      if (matches && matches.length > 0) {
        cachedTunnelUrl = matches[matches.length - 1];
        return cachedTunnelUrl;
      }
    }
  } catch {}
  return cachedTunnelUrl;
};

const ensureTunnelRunning = () => {
  try {
    const existing = getTunnelUrl();
    if (!existing && fs.existsSync('/tmp/cloudflared')) {
      const child = spawn('/tmp/cloudflared', ['tunnel', '--protocol', 'http2', '--url', 'http://localhost:3000'], {
        detached: true,
        stdio: ['ignore', fs.openSync('/tmp/tunnel.log', 'a'), fs.openSync('/tmp/tunnel.log', 'a')]
      });
      child.unref();
    }
  } catch (err) {
    console.error('Error starting tunnel:', err);
  }
};

ensureTunnelRunning();

interface ServerStore {
  requests: any[];
  logs: any[];
  users: any[];
  branches: any[];
  deletedRequestIds?: string[];
  settings: {
    lineChannelAccessToken?: string;
    googleAppsScriptUrl?: string;
    appUrl?: string;
    logoUrl?: string;
    schoolName?: string;
  };
  lastWebhookEvent?: {
    timestamp: string;
    type: string;
    reqId?: string;
    action?: string;
    summary: string;
    success: boolean;
  };
  webhookCount: number;
}

function sanitizeRequest(req: any) {
  if (!req || typeof req !== 'object') return null;
  return {
    ...req,
    id: req.id || `REQ-${Date.now()}`,
    userName: req.userName || 'ครูผู้ขอ',
    destination: req.destination || '-',
    reason: req.reason || '-',
    branchName: req.branchName || 'ช่างกลโรงงาน',
    branchId: req.branchId || 'ME',
    position: req.position || 'ครูผู้สอน',
    assignedApproverName: req.assignedApproverName || 'หัวหน้าสาขา',
    exitDate: req.exitDate || new Date().toISOString().slice(0, 10),
    exitTime: req.exitTime || '10:30',
    returnTime: req.returnTime || '12:00',
    status: req.status || 'pending',
    travelMethod: req.travelMethod || 'ตามภารกิจราชการ',
    qrToken: req.qrToken || `SECURE-EXIT-${req.id || Date.now()}-TOKEN`
  };
}

function mergeRequest(existing: any, incoming: any) {
  if (!existing) return sanitizeRequest(incoming);
  if (!incoming) return existing;

  // Determine winning status:
  // An approved or rejected status always wins over pending!
  let winningStatus = existing.status;
  if (incoming.status === 'approved' || incoming.status === 'rejected') {
    winningStatus = incoming.status;
  } else if (existing.status === 'approved' || existing.status === 'rejected') {
    winningStatus = existing.status;
  } else {
    winningStatus = incoming.status || existing.status || 'pending';
  }

  const isReal = (val: any) => typeof val === 'string' && val.trim().length > 0 && val !== '-';

  return {
    ...existing,
    ...incoming,
    id: existing.id || incoming.id,
    userId: incoming.userId || existing.userId,
    userName: isReal(incoming.userName) && incoming.userName !== 'ครูผู้ขอ' ? incoming.userName : (existing.userName || incoming.userName || 'ครูผู้ขอ'),
    destination: isReal(incoming.destination) ? incoming.destination : (existing.destination || incoming.destination || '-'),
    reason: isReal(incoming.reason) ? incoming.reason : (existing.reason || incoming.reason || '-'),
    branchName: isReal(incoming.branchName) && incoming.branchName !== 'ช่างกลโรงงาน' ? incoming.branchName : (existing.branchName || incoming.branchName || 'ช่างกลโรงงาน'),
    branchId: isReal(incoming.branchId) && incoming.branchId !== 'ME' ? incoming.branchId : (existing.branchId || incoming.branchId || 'ME'),
    position: isReal(incoming.position) && incoming.position !== 'ครูผู้สอน' ? incoming.position : (existing.position || incoming.position || 'ครูผู้สอน'),
    assignedApproverName: isReal(incoming.assignedApproverName) && incoming.assignedApproverName !== 'หัวหน้าสาขา' ? incoming.assignedApproverName : (existing.assignedApproverName || incoming.assignedApproverName || 'หัวหน้าสาขา'),
    assignedApproverId: incoming.assignedApproverId || existing.assignedApproverId,
    assignedApproverLineId: incoming.assignedApproverLineId || existing.assignedApproverLineId,
    exitDate: incoming.exitDate || existing.exitDate,
    exitTime: incoming.exitTime || existing.exitTime,
    returnTime: incoming.returnTime || existing.returnTime,
    notes: incoming.notes !== undefined ? incoming.notes : existing.notes,
    hasClasses: incoming.hasClasses !== undefined ? incoming.hasClasses : existing.hasClasses,
    travelMethod: incoming.travelMethod || existing.travelMethod || 'ตามภารกิจราชการ',
    vehiclePlate: incoming.vehiclePlate || existing.vehiclePlate,
    companions: incoming.companions || existing.companions,
    userPhone: incoming.userPhone || existing.userPhone,
    status: winningStatus,
    approvedAt: (winningStatus === 'approved') 
      ? (existing.status === 'approved' && existing.approvedAt ? existing.approvedAt : (incoming.approvedAt || existing.approvedAt || getThaiTimestamp())) 
      : undefined,
    approvedBy: (winningStatus === 'approved') 
      ? (existing.status === 'approved' && existing.approvedBy ? existing.approvedBy : (incoming.approvedBy || existing.approvedBy || 'หัวหน้าสาขา')) 
      : undefined,
    rejectionReason: (winningStatus === 'rejected') 
      ? (existing.status === 'rejected' && existing.rejectionReason ? existing.rejectionReason : (incoming.rejectionReason || existing.rejectionReason)) 
      : undefined,
    actualExitTime: incoming.actualExitTime || existing.actualExitTime,
    actualReturnTime: incoming.actualReturnTime || existing.actualReturnTime,
    checkedBySecurity: incoming.checkedBySecurity || existing.checkedBySecurity,
    substituteStatus: (incoming.substituteStatus && incoming.substituteStatus !== 'pending') 
      ? incoming.substituteStatus 
      : (existing.substituteStatus || incoming.substituteStatus || 'not_required'),
    substituteTeacherId: incoming.substituteTeacherId || existing.substituteTeacherId,
    substituteTeacherName: incoming.substituteTeacherName || existing.substituteTeacherName,
    substituteSubject: incoming.substituteSubject || existing.substituteSubject,
    substituteTasks: incoming.substituteTasks || existing.substituteTasks,
    substituteAcknowledgedAt: incoming.substituteAcknowledgedAt || existing.substituteAcknowledgedAt,
    substituteDeclineReason: incoming.substituteDeclineReason || existing.substituteDeclineReason,
    qrToken: existing.qrToken || incoming.qrToken
  };
}

// Load or initialize server store
function loadServerStore(): ServerStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      const rawRequests = Array.isArray(parsed.requests) ? parsed.requests : [];
      const deletedIds = Array.isArray(parsed.deletedRequestIds) ? parsed.deletedRequestIds : [];
      const deletedSet = new Set(deletedIds);

      // Load users and ensure seed users exist
      const existingUsers = Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : [...INITIAL_USERS];
      // Check if any INITIAL_USERS are missing in existingUsers (e.g. newly added seed users)
      for (const iu of INITIAL_USERS) {
        if (!existingUsers.some((eu: any) => eu.id === iu.id || (eu.username && eu.username.toLowerCase() === iu.username.toLowerCase()))) {
          existingUsers.push(iu);
        }
      }

      const existingBranches = Array.isArray(parsed.branches) && parsed.branches.length > 0 ? parsed.branches : [...INITIAL_BRANCHES];
      for (const ib of INITIAL_BRANCHES) {
        if (!existingBranches.some((eb: any) => eb.id === ib.id)) {
          existingBranches.push(ib);
        }
      }

      return {
        requests: rawRequests.map(sanitizeRequest).filter((r: any) => r && !deletedSet.has(r.id)),
        logs: Array.isArray(parsed.logs) ? parsed.logs.filter((l: any) => !deletedSet.has(l.requestId)) : [],
        users: existingUsers,
        branches: existingBranches,
        deletedRequestIds: deletedIds,
        settings: parsed.settings || {},
        lastWebhookEvent: parsed.lastWebhookEvent || undefined,
        webhookCount: typeof parsed.webhookCount === 'number' ? parsed.webhookCount : 0
      };
    }
  } catch (err) {
    console.error('Error reading server_data.json, starting with clean store:', err);
  }

  return {
    requests: [],
    logs: [],
    users: [...INITIAL_USERS],
    branches: [...INITIAL_BRANCHES],
    deletedRequestIds: [],
    settings: {
      lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
    },
    webhookCount: 0
  };
}

let serverStore = loadServerStore();

function saveServerStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(serverStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write server_data.json:', err);
  }
}

function getThaiTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear() + 543;
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Helper function to call LINE Messaging API Push
  const pushToLine = async (token: string, to: string, messages: any[]) => {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.trim()}`
      },
      body: JSON.stringify({
        to: to.trim(),
        messages
      })
    });

    const responseText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    return {
      status: response.status,
      ok: response.ok,
      data
    };
  };

  // Helper to get effective token
  const getEffectiveToken = (customToken?: string) => {
    return (
      customToken ||
      serverStore.settings.lineChannelAccessToken ||
      process.env.LINE_CHANNEL_ACCESS_TOKEN ||
      ''
    ).trim();
  };

  // Helper to find requesting Teacher LINE ID
  const findTeacherLineId = (targetReq: any): string | null => {
    if (!targetReq) return null;
    if (targetReq.userLineId && String(targetReq.userLineId).trim().startsWith('U') && !String(targetReq.userLineId).includes('U_')) {
      return String(targetReq.userLineId).trim();
    }
    if (targetReq.teacherLineId && String(targetReq.teacherLineId).trim().startsWith('U') && !String(targetReq.teacherLineId).includes('U_')) {
      return String(targetReq.teacherLineId).trim();
    }
    const norm = (s: string) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const reqUserNameNorm = norm(targetReq.userName);
    const matchedUser = serverStore.users.find(u => 
      (targetReq.userId && u.id === targetReq.userId) ||
      (reqUserNameNorm && norm(u.name) === reqUserNameNorm) ||
      (targetReq.userUsername && u.username === targetReq.userUsername) ||
      (reqUserNameNorm.length > 3 && (norm(u.name).includes(reqUserNameNorm) || reqUserNameNorm.includes(norm(u.name))))
    );
    if (matchedUser?.lineId && String(matchedUser.lineId).trim().startsWith('U')) {
      return String(matchedUser.lineId).trim();
    }
    if (targetReq.userId && String(targetReq.userId).trim().startsWith('U') && String(targetReq.userId).trim().length === 33) {
      return String(targetReq.userId).trim();
    }
    return null;
  };

  // Helper to build LINE Flex Message payload for Teacher status
  const buildTeacherStatusFlexPayload = (
    req: any,
    status: 'approved' | 'rejected',
    approverName: string,
    rejectionReason?: string
  ) => {
    const isApproved = status === 'approved';
    const primaryColor = isApproved ? '#059669' : '#dc2626';
    const tunnel = getTunnelUrl();
    const baseUrl = (tunnel && tunnel.startsWith('http')) 
      ? tunnel.replace(/\/$/, '') 
      : (serverStore.settings.appUrl && serverStore.settings.appUrl.startsWith('http')
          ? serverStore.settings.appUrl.replace(/\/$/, '')
          : 'https://ais-dev-b5n74ksxlz6u3o5szrquja-431414357592.asia-east1.run.app');
    
    const viewPassUrl = isApproved
      ? `${baseUrl}?action=view_pass&reqId=${encodeURIComponent(req.id)}`
      : `${baseUrl}?action=view_request&reqId=${encodeURIComponent(req.id)}`;

    return {
      type: 'flex',
      altText: isApproved
        ? `✅ ผลการขออนุญาต: ได้รับอนุมัติแล้ว (${req.userName || 'ครูผู้ขอ'})`
        : `❌ ผลการขออนุญาต: ไม่อนุมัติ (${req.userName || 'ครูผู้ขอ'})`,
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: primaryColor,
          paddingAll: '16px',
          contents: [
            {
              type: 'text',
              text: isApproved ? '✅ ได้รับอนุมัติออกนอกสถานศึกษา' : '❌ ไม่อนุมัติคำขอออกนอกสถานศึกษา',
              weight: 'bold',
              size: 'md',
              color: '#ffffff'
            },
            {
              type: 'text',
              text: `รหัสคำขอ: ${req.id}`,
              size: 'xs',
              color: '#ffffff',
              margin: 'xs'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '👨‍🏫 ครูผู้ขอ:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: req.userName || '-', size: 'sm', weight: 'bold', color: '#0f172a', flex: 5 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '📅 วันที่:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: req.exitDate || '-', size: 'sm', color: '#0f172a', flex: 5 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '🕐 เวลา:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: `${req.exitTime || ''} – ${req.returnTime || ''} น.`, size: 'sm', color: '#0f172a', flex: 5 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '📍 สถานที่:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: req.destination || '-', size: 'sm', color: '#0f172a', flex: 5, wrap: true }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '✍️ ผู้อนุมัติ:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: approverName || 'ผู้อนุมัติ', size: 'sm', weight: 'bold', color: isApproved ? '#059669' : '#dc2626', flex: 5 }
              ]
            },
            !isApproved && rejectionReason ? {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '⚠️ เหตุผล:', size: 'sm', color: '#b91c1c', flex: 2 },
                { type: 'text', text: rejectionReason, size: 'sm', color: '#b91c1c', flex: 5, wrap: true }
              ]
            } : {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#ecfdf5',
              paddingAll: '10px',
              cornerRadius: '8px',
              contents: [
                {
                  type: 'text',
                  text: '🎫 ท่านสามารถเปิดระบบเพื่อแสดงบัตรผ่าน QR Code แก่เจ้าหน้าที่ รปภ. ได้เลยครับ',
                  size: 'xs',
                  color: '#065f46',
                  wrap: true
                }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `แจ้งเตือนเมื่อ: ${getThaiTimestamp()} น.`,
              size: 'xxs',
              color: '#94a3b8',
              align: 'center'
            }
          ]
        }
      }
    };
  };

  // Helper to send real LINE Flex notification to requesting Teacher
  const notifyTeacherApprovalViaLineFlex = async (
    targetReq: any,
    status: 'approved' | 'rejected',
    approverName: string,
    rejectionReason?: string
  ): Promise<{ success: boolean; message: string; teacherLineId?: string }> => {
    try {
      const token = getEffectiveToken();
      if (!token || token.startsWith('MOCK_') || token.includes('ใส่_TOKEN')) {
        console.log('[notifyTeacherApprovalViaLineFlex] LINE Channel Access Token is not set or mock');
        return { success: false, message: 'LINE Channel Access Token not configured' };
      }

      const teacherLineId = findTeacherLineId(targetReq);
      if (!teacherLineId || !teacherLineId.startsWith('U') || teacherLineId.startsWith('U_')) {
        console.log(`[notifyTeacherApprovalViaLineFlex] Valid LINE User ID for teacher not found (req: ${targetReq?.id}, user: ${targetReq?.userName})`);
        return { success: false, message: `LINE User ID not found for teacher ${targetReq?.userName}` };
      }

      const flexPayload = buildTeacherStatusFlexPayload(targetReq, status, approverName, rejectionReason);
      console.log(`[notifyTeacherApprovalViaLineFlex] Pushing Flex message to ${teacherLineId} for request ${targetReq?.id}...`);
      const result = await pushToLine(token, teacherLineId, [flexPayload]);
      if (result.ok) {
        console.log(`[notifyTeacherApprovalViaLineFlex] Successfully delivered Flex message to teacher (${teacherLineId})`);
        return { success: true, message: `ส่ง LINE Flex แจ้งผลให้ครูผู้ขอ (${teacherLineId}) สำเร็จ`, teacherLineId };
      } else {
        console.error(`[notifyTeacherApprovalViaLineFlex] Failed to send Flex message to ${teacherLineId}:`, result.data);
        return { success: false, message: `LINE API error: ${JSON.stringify(result.data)}`, teacherLineId };
      }
    } catch (err: any) {
      console.error('[notifyTeacherApprovalViaLineFlex] Exception:', err);
      return { success: false, message: err.message || String(err) };
    }
  };

  // Forward update to Google Apps Script if configured
  const forwardToAppsScript = async (action: string, payload: any) => {
    const gasUrl = serverStore.settings.googleAppsScriptUrl;
    if (!gasUrl || !gasUrl.startsWith('http')) return;
    try {
      await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
      });
    } catch (err) {
      console.error('Error forwarding to Google Apps Script:', err);
    }
  };

  // Comprehensive Sheet & Time Formatter helpers
  const formatSheetTime = (raw: any): string => {
    if (!raw) return '';
    const s = String(raw).trim();
    if (/^\d{1,2}:\d{2}/.test(s)) return s.slice(0, 5);
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        const h = String((d.getUTCHours() + 7) % 24).padStart(2, '0');
        const m = String(d.getUTCMinutes()).padStart(2, '0');
        return `${h}:${m}`;
      }
    } catch {}
    return s;
  };

  const formatSheetDate = (raw: any): string => {
    if (!raw) return '';
    const s = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        const localMs = d.getTime() + (7 * 3600 * 1000);
        const ld = new Date(localMs);
        return `${ld.getUTCFullYear()}-${String(ld.getUTCMonth() + 1).padStart(2, '0')}-${String(ld.getUTCDate()).padStart(2, '0')}`;
      }
    } catch {}
    return s.slice(0, 10);
  };

  const formatSheetTimestamp = (raw: any): string => {
    if (!raw) return '';
    const s = String(raw).trim();
    if (s.length >= 10 && !s.includes('T')) return s;
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        const localMs = d.getTime() + (7 * 3600 * 1000);
        const ld = new Date(localMs);
        const y = ld.getUTCFullYear() > 2400 ? ld.getUTCFullYear() : ld.getUTCFullYear() + 543;
        const mo = String(ld.getUTCMonth() + 1).padStart(2, '0');
        const day = String(ld.getUTCDate()).padStart(2, '0');
        const h = String(ld.getUTCHours()).padStart(2, '0');
        const mi = String(ld.getUTCMinutes()).padStart(2, '0');
        return `${y}-${mo}-${day} ${h}:${mi}`;
      }
    } catch {}
    return s;
  };

  // Synchronize ALL requests and pending statuses from Google Apps Script (Every device stays 100% updated)
  let isSyncingAllGas = false;
  let lastAllGasSyncTime = 0;

  const syncAllFromGoogleAppsScript = async () => {
    const gasUrl = serverStore.settings.googleAppsScriptUrl;
    if (!gasUrl || !gasUrl.startsWith('http') || isSyncingAllGas) return;

    const now = Date.now();
    if (now - lastAllGasSyncTime < 8000) return;
    lastAllGasSyncTime = now;

    isSyncingAllGas = true;
    try {
      const checkUrl = `${gasUrl}?action=get_all`;
      const response = await fetch(checkUrl, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) {
        console.warn(`[syncAllFromGoogleAppsScript] GAS responded with HTTP ${response.status}`);
        return;
      }
      const gasRes = await response.json();
      if (!gasRes || !Array.isArray(gasRes.requests) || gasRes.requests.length === 0) return;
      console.log(`[syncAllFromGoogleAppsScript] Fetched ${gasRes.requests.length} rows from Google Sheets`);

      // Deduplicate sheet rows by ID
      const sheetMap = new Map<string, any>();
      for (const row of gasRes.requests) {
        if (!row || !row.id) continue;
        const reqId = String(row.id).trim();
        const existing = sheetMap.get(reqId);
        if (!existing) {
          sheetMap.set(reqId, row);
        } else {
          // Winning status: approved/rejected wins over pending
          if (existing.status === 'pending' && (row.status === 'approved' || row.status === 'rejected')) {
            sheetMap.set(reqId, { ...existing, ...row });
          } else if (row.status === 'approved' && !existing.approvedAt && row.approvedAt) {
            sheetMap.set(reqId, { ...existing, ...row });
          }
        }
      }

      let storeChanged = false;
      const deletedSet = new Set(serverStore.deletedRequestIds || []);

      for (const [reqId, row] of sheetMap.entries()) {
        if (deletedSet.has(reqId)) continue;
        const rowStatus = String(row.status || 'pending').toLowerCase().trim();
        const existingIdx = serverStore.requests.findIndex(r => r.id === reqId);

        // Find user by name to attach userId and lineId
        const norm = (s: string) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const rowUserNorm = norm(row.userName);
        const matchedUser = serverStore.users.find(u =>
          (rowUserNorm && norm(u.name) === rowUserNorm) ||
          (rowUserNorm.length > 3 && (norm(u.name).includes(rowUserNorm) || rowUserNorm.includes(norm(u.name))))
        );

        const cleanExitDate = formatSheetDate(row.exitDate);
        const cleanExitTime = formatSheetTime(row.exitTime);
        const cleanReturnTime = formatSheetTime(row.returnTime);
        const cleanApprovedAt = formatSheetTimestamp(row.approvedAt);
        const cleanSubmittedAt = formatSheetTimestamp(row.submittedAt);

        if (existingIdx !== -1) {
          const currentReq = serverStore.requests[existingIdx];
          const previousStatus = currentReq.status;

          // Detect status change to approved/rejected
          if (previousStatus === 'pending' && (rowStatus === 'approved' || rowStatus === 'rejected')) {
            const isApprove = rowStatus === 'approved';
            const approverName = row.approver || currentReq.assignedApproverName || 'หัวหน้าสาขาวิชา';

            currentReq.status = isApprove ? 'approved' : 'rejected';
            currentReq.approvedAt = cleanApprovedAt || getThaiTimestamp();
            currentReq.approvedBy = approverName;
            if (!isApprove && row.notes) {
              currentReq.rejectionReason = row.notes;
            }

            // Make sure teacherLineId is set
            if (!currentReq.userLineId && matchedUser?.lineId) {
              currentReq.userLineId = matchedUser.lineId;
              currentReq.teacherLineId = matchedUser.lineId;
            }

            serverStore.logs.push({
              id: 'LOG-GAS-ALL-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
              requestId: reqId,
              requestSummary: `${currentReq.userName} ขอออกไป ${currentReq.destination}`,
              actorId: 'line-gas-approver',
              actorName: approverName,
              actorRole: 'หัวหน้าสาขา',
              action: isApprove ? 'approve' : 'reject',
              timestamp: currentReq.approvedAt,
              comment: isApprove
                ? `หัวหน้าสาขากดอนุมัติคำขอ ${reqId} ผ่าน LINE เรียบร้อยแล้ว (ตรวจพบและซิงค์ข้อมูลสำเร็จ)`
                : `หัวหน้าสาขากดไม่อนุมัติคำขอ ${reqId} ผ่าน LINE`
            });

            serverStore.lastWebhookEvent = {
              timestamp: new Date().toISOString(),
              type: 'gas_all_sync_approval',
              reqId,
              action: rowStatus,
              summary: `ตรวจพบการ ${isApprove ? 'อนุมัติ' : 'ไม่อนุมัติ'} คำขอ ${reqId} ใน Google Sheets`,
              success: true
            };

            storeChanged = true;

            // Push LINE Flex notification to requesting Teacher
            notifyTeacherApprovalViaLineFlex(
              currentReq,
              isApprove ? 'approved' : 'rejected',
              approverName
            ).catch(e => console.error('Error in notifyTeacherApprovalViaLineFlex:', e));
          } else {
            // Update fields if changed
            if (rowStatus === 'approved' && currentReq.status !== 'approved') {
              currentReq.status = 'approved';
              currentReq.approvedAt = cleanApprovedAt || currentReq.approvedAt;
              currentReq.approvedBy = row.approver || currentReq.approvedBy;
              storeChanged = true;
            }
          }
        } else {
          // Request exists in Google Sheets but not yet in serverStore!
          const newReq: any = {
            id: reqId,
            userId: matchedUser?.id || `usr-imported-${reqId}`,
            userName: row.userName || matchedUser?.name || 'ครูผู้ขอ',
            branchId: matchedUser?.branchId || 'DB',
            branchName: row.branchName || matchedUser?.branchName || 'ธุรกิจดิจิทัล',
            position: matchedUser?.position || 'ครู',
            userPhone: matchedUser?.phone || '',
            userLineId: matchedUser?.lineId || '',
            teacherLineId: matchedUser?.lineId || '',
            userUsername: matchedUser?.username || '',
            submittedAt: cleanSubmittedAt || getThaiTimestamp(),
            exitDate: cleanExitDate,
            exitTime: cleanExitTime,
            returnTime: cleanReturnTime,
            destination: row.destination || '',
            reason: row.reason || '',
            travelMethod: row.travelMethod || 'ตามภารกิจราชการ',
            assignedApproverId: matchedUser?.branchId ? (serverStore.branches.find(b => b.id === matchedUser.branchId)?.approverUserId || '') : '',
            assignedApproverName: row.approver || 'หัวหน้าสาขาวิชา',
            status: rowStatus === 'approved' ? 'approved' : (rowStatus === 'rejected' ? 'rejected' : 'pending'),
            approvedAt: cleanApprovedAt || (rowStatus === 'approved' ? getThaiTimestamp() : undefined),
            approvedBy: rowStatus === 'approved' ? (row.approver || 'หัวหน้าสาขา') : undefined,
            qrToken: row.qrToken || `SECURE-EXIT-${reqId}-${matchedUser?.branchId || 'GEN'}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            hasClasses: false,
            substituteStatus: 'not_required'
          };
          serverStore.requests.unshift(newReq);
          storeChanged = true;
        }
      }

      if (storeChanged) {
        saveServerStore();
      }
    } catch (err: any) {
      if (err?.name === 'TimeoutError' || err?.code === 'ETIMEDOUT' || String(err).includes('timeout')) {
        console.warn('[syncAllFromGoogleAppsScript] Google Apps Script sync timed out (waiting for next cycle)');
        // Back off by 15 seconds to give GAS time to recover
        lastAllGasSyncTime = Date.now() + 15000;
      } else {
        console.warn('[syncAllFromGoogleAppsScript] Notice:', err?.message || String(err));
      }
    } finally {
      isSyncingAllGas = false;
    }
  };

  const syncPendingRequestsWithGas = async () => {
    await syncAllFromGoogleAppsScript();
  };

  // Run full GAS sync in background periodically (20s) so devices stay identical without overloading GAS
  setInterval(syncAllFromGoogleAppsScript, 20000);
  // Initial sync immediately on startup
  syncAllFromGoogleAppsScript().catch(() => {});

  // API 1: Verify LINE Channel Access Token & Get Bot Info
  app.post('/api/line/verify-token', async (req, res) => {
    try {
      const { token } = req.body;
      const effectiveToken = getEffectiveToken(token);

      if (!effectiveToken || effectiveToken.startsWith('MOCK_') || effectiveToken.includes('ใส่_TOKEN')) {
        return res.status(400).json({
          success: false,
          error: 'ยังไม่ได้ระบุ LINE Channel Access Token จริง (ปัจจุบันยังเป็น Mock Token หรือว่างเปล่า)'
        });
      }

      serverStore.settings.lineChannelAccessToken = effectiveToken;
      saveServerStore();

      const response = await fetch('https://api.line.me/v2/bot/info', {
        headers: {
          'Authorization': `Bearer ${effectiveToken}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        return res.json({
          success: true,
          bot: {
            userId: data.userId,
            basicId: data.basicId,
            displayName: data.displayName,
            pictureUrl: data.pictureUrl,
            chatMode: data.chatMode,
            markAsReadMode: data.markAsReadMode
          }
        });
      } else {
        return res.status(response.status).json({
          success: false,
          error: data.message || 'Token ไม่ถูกต้องหรือไม่สามารถเชื่อมต่อกับ LINE API ได้',
          details: data
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการตรวจสอบ Token: ' + (err.message || String(err))
      });
    }
  });

  // API 2: Send Push Notification to LINE User ID
  app.post('/api/line/push', async (req, res) => {
    try {
      const { token, to, messages, text } = req.body;
      const effectiveToken = getEffectiveToken(token);

      if (!effectiveToken || effectiveToken.startsWith('MOCK_') || effectiveToken.includes('ใส่_TOKEN')) {
        return res.status(400).json({
          success: false,
          error: 'ยังไม่ได้ระบุ LINE Channel Access Token จริง กรุณาคัดลอก Channel Access Token (long-lived) จาก LINE Developers Console มาใส่ในการตั้งค่าระบบ',
          code: 'TOKEN_MISSING_OR_MOCK'
        });
      }

      serverStore.settings.lineChannelAccessToken = effectiveToken;
      saveServerStore();

      if (!to || !to.trim().startsWith('U') || to.trim().length < 20) {
        return res.status(400).json({
          success: false,
          error: 'LINE User ID ไม่ถูกต้อง รูปแบบที่ถูกต้องต้องขึ้นต้นด้วย U และตามด้วยตัวเลข/ตัวอักษร 32 ตัว เช่น U81778d734346f14e047e07cb37d1ccd1',
          code: 'INVALID_USER_ID'
        });
      }

      let messagePayload: any[] = [];
      if (messages && Array.isArray(messages) && messages.length > 0) {
        messagePayload = messages;
        const tunnelUrl = getTunnelUrl();
        if (tunnelUrl) {
          try {
            const rawStr = JSON.stringify(messagePayload);
            const replaced = rawStr.replace(/https:\/\/[^"\/]+\/api\/line\/quick-approve/g, `${tunnelUrl}/api/line/quick-approve`);
            messagePayload = JSON.parse(replaced);
          } catch {}
        }
      } else if (text) {
        messagePayload = [{ type: 'text', text: String(text) }];
      } else {
        messagePayload = [{ type: 'text', text: '🔔 ทดสอบการแจ้งเตือนจากระบบขออนุญาตออกนอกสถานศึกษาสำหรับครู' }];
      }

      const result = await pushToLine(effectiveToken, to, messagePayload);

      if (result.ok) {
        return res.json({
          success: true,
          message: 'ส่งข้อความแจ้งเตือนเข้า LINE สำเร็จเรียบร้อยแล้ว'
        });
      }

      const errorMsg = result.data?.message || 'ส่งข้อความไม่สำเร็จ';
      let friendlyError = errorMsg;

      if (result.status === 401) {
        friendlyError = 'Channel Access Token ไม่ถูกต้องหรือหมดอายุ กรุณาคัดลอก Channel Access Token (long-lived) ใหม่จากแท็บ Messaging API ใน LINE Developers Console';
      } else if (result.status === 400) {
        if (result.data?.details?.some((d: any) => d.message?.includes('not a member') || d.property?.includes('to'))) {
          friendlyError = 'บัญชี LINE ปลายทางยังไม่ได้เพิ่ม LINE Official Account เป็นเพื่อน หรือ User ID ไม่ตรงกับ Bot ตัวนี้ (กรุณาให้ผู้ใช้สแกน QR เพิ่มเพื่อนกับบอทก่อน)';
        } else {
          friendlyError = `LINE API ส่งกลับข้อผิดพลาด (400): ${errorMsg} - ตรวจสอบว่าผู้ใช้กดแอดเพื่อนกับ LINE Official Account แล้วหรือยัง`;
        }
      } else if (result.status === 429) {
        friendlyError = 'โควต้าการส่งข้อความฟรีของ LINE Official Account ประจำเดือนนี้เต็มแล้ว (เกิน 300 ข้อความ/เดือน)';
      }

      return res.status(result.status).json({
        success: false,
        error: friendlyError,
        rawStatus: result.status,
        details: result.data
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการส่งข้อความ: ' + (err.message || String(err))
      });
    }
  });

  // API 2.1: Test Sending Teacher Flex Message
  app.post('/api/line/test-teacher-flex', async (req, res) => {
    try {
      const { reqId, status = 'approved', approverName = 'หัวหน้าสาขาวิชา', targetLineId } = req.body;
      let targetReq = reqId ? serverStore.requests.find(r => r.id === reqId) : serverStore.requests[0];
      if (!targetReq) {
        // Sample teacher request for testing
        targetReq = {
          id: reqId || 'REQ-SAMPLE-001',
          userName: 'นายเอกราช อาจณรงค์',
          userId: 'usr-import-85625',
          userLineId: 'U81778d734346f14e047e07cb37d1ccd1',
          teacherLineId: 'U81778d734346f14e047e07cb37d1ccd1',
          branchName: 'ธุรกิจดิจิทัล',
          exitDate: '2026-10-14',
          exitTime: '10:30',
          returnTime: '12:00',
          destination: 'ภารกิจราชการ',
          reason: 'นำส่งเอกสารวิชาการ',
          status: 'approved'
        };
      }
      if (targetLineId && String(targetLineId).trim().startsWith('U')) {
        targetReq = { ...targetReq, userLineId: targetLineId.trim(), teacherLineId: targetLineId.trim() };
      }
      const result = await notifyTeacherApprovalViaLineFlex(targetReq, status, approverName);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // API 3: Get All Requests from server store
  app.get('/api/requests', async (_req, res) => {
    // Opportunistically run gas sync if needed
    if (Date.now() - lastAllGasSyncTime > 15000) {
      syncAllFromGoogleAppsScript().catch(() => {});
    }
    res.json({
      success: true,
      requests: serverStore.requests,
      logs: serverStore.logs,
      users: serverStore.users,
      branches: serverStore.branches,
      settings: serverStore.settings,
      deletedRequestIds: serverStore.deletedRequestIds || [],
      lastWebhookEvent: serverStore.lastWebhookEvent,
      webhookCount: serverStore.webhookCount
    });
  });

  // API 3.1: Users API
  app.get('/api/users', (_req, res) => {
    res.json({
      success: true,
      users: serverStore.users || []
    });
  });

  app.post('/api/users', (req, res) => {
    try {
      const { users } = req.body;
      if (Array.isArray(users) && users.length > 0) {
        serverStore.users = users;
        saveServerStore();
      }
      return res.json({
        success: true,
        users: serverStore.users
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 3.2: Branches API
  app.get('/api/branches', (_req, res) => {
    res.json({
      success: true,
      branches: serverStore.branches || []
    });
  });

  app.post('/api/branches', (req, res) => {
    try {
      const { branches } = req.body;
      if (Array.isArray(branches) && branches.length > 0) {
        serverStore.branches = branches;
        saveServerStore();
      }
      return res.json({
        success: true,
        branches: serverStore.branches
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 3.3: Settings API
  app.get('/api/settings', (_req, res) => {
    res.json({
      success: true,
      settings: serverStore.settings
    });
  });

  app.post('/api/settings', (req, res) => {
    try {
      const { settings } = req.body;
      if (settings && typeof settings === 'object') {
        serverStore.settings = { ...serverStore.settings, ...settings };
        saveServerStore();
      }
      return res.json({
        success: true,
        settings: serverStore.settings
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 4: Sync requests between Client and Server (Bi-directional merge)
  app.post('/api/requests/sync', async (req, res) => {
    try {
      const { 
        requests: clientRequests, 
        logs: clientLogs, 
        users: clientUsers,
        branches: clientBranches,
        settings: clientSettingsRaw, 
        deletedRequestIds: clientDeletedIds 
      } = req.body;
      const clientSettings = clientSettingsRaw as any;



      // Server is the master source of truth for users and branches.
      // Do not allow stale client localStorage from background sync to overwrite updated server users.
      if ((!Array.isArray(serverStore.users) || serverStore.users.length === 0) && Array.isArray(clientUsers) && clientUsers.length > 0) {
        serverStore.users = clientUsers;
      }

      if ((!Array.isArray(serverStore.branches) || serverStore.branches.length === 0) && Array.isArray(clientBranches) && clientBranches.length > 0) {
        serverStore.branches = clientBranches;
      }

      if (clientSettings) {
        if (clientSettings.logoUrl && !serverStore.settings.logoUrl) {
          serverStore.settings.logoUrl = clientSettings.logoUrl;
        }
        if (clientSettings.schoolName && !serverStore.settings.schoolName) {
          serverStore.settings.schoolName = clientSettings.schoolName;
        }
        if (clientSettings.lineChannelAccessToken && !clientSettings.lineChannelAccessToken.startsWith('MOCK_') && (!serverStore.settings.lineChannelAccessToken || serverStore.settings.lineChannelAccessToken.startsWith('MOCK_'))) {
          serverStore.settings.lineChannelAccessToken = clientSettings.lineChannelAccessToken;
        }
        if (clientSettings.googleAppsScriptUrl && !serverStore.settings.googleAppsScriptUrl) {
          serverStore.settings.googleAppsScriptUrl = clientSettings.googleAppsScriptUrl;
        }
        if (clientSettings.appUrl) {
          serverStore.settings.appUrl = clientSettings.appUrl;
        }
      }

      if (Array.isArray(clientRequests)) {
        const deletedSet = new Set(serverStore.deletedRequestIds || []);
        for (const cReq of clientRequests) {
          if (deletedSet.has(cReq.id)) continue;
          const sanitizedClientReq = sanitizeRequest(cReq);
          if (!sanitizedClientReq) continue;

          const sIdx = serverStore.requests.findIndex(r => r.id === sanitizedClientReq.id);
          if (sIdx === -1) {
            // New request from client, add to server
            serverStore.requests.unshift(sanitizedClientReq);
            // Forward to Google Apps Script so it appears in Google Sheets and sends LINE notification
            forwardToAppsScript('create_request', sanitizedClientReq);
          } else {
            // Robust bi-directional merge: winning status (approved/rejected wins over pending) and rich fields preserved
            serverStore.requests[sIdx] = mergeRequest(serverStore.requests[sIdx], sanitizedClientReq);
          }
        }
      }

      if (Array.isArray(clientLogs)) {
        const deletedSet = new Set(serverStore.deletedRequestIds || []);
        for (const cLog of clientLogs) {
          if (deletedSet.has(cLog.requestId)) continue;
          if (!serverStore.logs.some(l => l.id === cLog.id || (l.requestId === cLog.requestId && l.action === cLog.action))) {
            serverStore.logs.push(cLog);
          }
        }
      }

      // Trigger GAS sync in background without blocking response latency for mobile devices
      syncPendingRequestsWithGas().catch(() => {});

      saveServerStore();

      return res.json({
        success: true,
        requests: serverStore.requests,
        logs: serverStore.logs,
        users: serverStore.users,
        branches: serverStore.branches,
        settings: serverStore.settings,
        deletedRequestIds: serverStore.deletedRequestIds || [],
        lastWebhookEvent: serverStore.lastWebhookEvent,
        publicAppUrl: getTunnelUrl() || ''
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: 'Sync error: ' + (err.message || String(err))
      });
    }
  });

  // API 4.0.1: Explicit Force Sync with Google Apps Script / LINE
  app.all('/api/requests/sync-gas', async (_req, res) => {
    try {
      await syncPendingRequestsWithGas();
      return res.json({
        success: true,
        requests: serverStore.requests,
        logs: serverStore.logs,
        lastWebhookEvent: serverStore.lastWebhookEvent
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // API 4.1: Delete Request by ID (Admin Action)
  app.delete('/api/requests/:id', (req, res) => {
    try {
      const { id } = req.params;
      const initialCount = serverStore.requests.length;
      serverStore.requests = serverStore.requests.filter(r => r.id !== id);
      serverStore.logs = serverStore.logs.filter(l => l.requestId !== id);

      if (!serverStore.deletedRequestIds) {
        serverStore.deletedRequestIds = [];
      }
      if (!serverStore.deletedRequestIds.includes(id)) {
        serverStore.deletedRequestIds.push(id);
      }
      saveServerStore();

      return res.json({
        success: true,
        deleted: initialCount > serverStore.requests.length,
        id
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete request: ' + (err.message || String(err))
      });
    }
  });

  // API 4.2: Batch Delete Requests (Admin Action)
  app.post('/api/requests/batch-delete', (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ success: false, error: 'ids must be an array' });
      }
      const idSet = new Set(ids);
      const initialCount = serverStore.requests.length;
      serverStore.requests = serverStore.requests.filter(r => !idSet.has(r.id));
      serverStore.logs = serverStore.logs.filter(l => !idSet.has(l.requestId));

      if (!serverStore.deletedRequestIds) {
        serverStore.deletedRequestIds = [];
      }
      for (const id of ids) {
        if (!serverStore.deletedRequestIds.includes(id)) {
          serverStore.deletedRequestIds.push(id);
        }
      }
      saveServerStore();

      return res.json({
        success: true,
        deletedCount: initialCount - serverStore.requests.length
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to batch delete requests: ' + (err.message || String(err))
      });
    }
  });

  // API 4.3: Clear ALL Requests (Admin Reset for Production Use)
  app.post('/api/requests/clear-all', async (req, res) => {
    try {
      const { actorName, actorId } = req.body || {};
      const currentRequests = [...serverStore.requests];
      const clearedCount = currentRequests.length;

      // Add all current IDs to deletedRequestIds so no device or sheet re-imports them
      if (!serverStore.deletedRequestIds) {
        serverStore.deletedRequestIds = [];
      }
      const deletedSet = new Set(serverStore.deletedRequestIds);
      for (const r of currentRequests) {
        if (r && r.id) {
          deletedSet.add(r.id);
        }
      }
      serverStore.deletedRequestIds = Array.from(deletedSet);
      serverStore.requests = [];
      serverStore.logs = [];

      saveServerStore();

      // Clean up Google Sheets asynchronously
      const gasUrl = serverStore.settings.googleAppsScriptUrl;
      if (gasUrl && gasUrl.startsWith('http')) {
        (async () => {
          try {
            const checkRes = await fetch(`${gasUrl}?action=get_all`, { signal: AbortSignal.timeout(10000) });
            const checkData = await checkRes.json();
            if (checkData && Array.isArray(checkData.requests)) {
              for (const row of checkData.requests) {
                if (row && row.id) {
                  try {
                    await fetch(gasUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'delete_request',
                        payload: { requestId: row.id, userName: row.userName || '', deletedBy: actorName || 'Admin' }
                      }),
                      signal: AbortSignal.timeout(6000)
                    });
                  } catch {}
                }
              }
            }
          } catch (e) {
            console.warn('[clear-all] GAS deletion error:', e);
          }
        })();
      }

      console.log(`[clear-all] Cleared ${clearedCount} requests by ${actorName || 'Admin'}. Total deletedRequestIds: ${serverStore.deletedRequestIds.length}`);

      return res.json({
        success: true,
        clearedCount,
        message: 'ลบข้อมูลคำขอทุกคนออกทั้งหมดเรียบร้อยแล้ว พร้อมเริ่มใช้งานจริง'
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to clear all requests: ' + (err.message || String(err))
      });
    }
  });

  // API 5: Direct Request Status Update
  app.post('/api/requests/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, actorName, rejectionReason } = req.body;

      const idx = serverStore.requests.findIndex(r => r.id === id);
      const timestamp = getThaiTimestamp();
      let updated: any = null;

      if (idx === -1) {
        // If not found in server store yet, create minimal record so status is never lost
        const fallback = sanitizeRequest({
          id,
          userName: 'ครูผู้ขอ',
          branchName: 'ช่างกลโรงงาน',
          status,
          approvedAt: status === 'approved' ? timestamp : undefined,
          approvedBy: actorName || 'ผู้อนุมัติ',
          rejectionReason: status === 'rejected' ? rejectionReason : undefined
        });
        serverStore.requests.unshift(fallback);
        updated = fallback;
      } else {
        serverStore.requests[idx].status = status;
        serverStore.requests[idx].approvedAt = status === 'approved' ? timestamp : undefined;
        serverStore.requests[idx].approvedBy = actorName || 'ผู้อนุมัติ';
        if (status === 'rejected') {
          serverStore.requests[idx].rejectionReason = rejectionReason;
        }
        updated = serverStore.requests[idx];
      }

      // Add log
      serverStore.logs.push({
        id: 'LOG-' + Date.now(),
        requestId: id,
        requestSummary: updated?.destination ? `${updated.userName} (${updated.branchName}) ขอออกไป ${updated.destination}` : `คำขอ ${id}`,
        actorId: 'approver',
        actorName: actorName || 'ผู้อนุมัติ',
        actorRole: 'ผู้อนุมัติ',
        action: status === 'approved' ? 'approve' : 'reject',
        timestamp,
        comment: status === 'approved' ? 'อนุมัติคำขอเรียบร้อยแล้ว' : `ไม่อนุมัติ: ${rejectionReason || ''}`
      });

      saveServerStore();

      // Forward to Google Apps Script
      forwardToAppsScript('update_status', updated);

      // Send LINE Flex Notification to Teacher
      notifyTeacherApprovalViaLineFlex(updated, status, actorName || 'ผู้อนุมัติ', rejectionReason).catch(e =>
        console.error('Error in notifyTeacherApprovalViaLineFlex:', e)
      );

      return res.json({ success: true, request: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // API 5.1: Update Substitute Teaching Status (Acknowledge / Decline)
  app.post('/api/requests/:id/substitute', (req, res) => {
    try {
      const { id } = req.params;
      const { substituteStatus, teacherId, teacherName, declineReason, timestamp } = req.body;
      const thaiTimestamp = timestamp || getThaiTimestamp();

      const idx = serverStore.requests.findIndex(r => r.id === id);
      let updated: any = null;

      if (idx !== -1) {
        serverStore.requests[idx].substituteStatus = substituteStatus;
        if (substituteStatus === 'acknowledged') {
          serverStore.requests[idx].substituteAcknowledgedAt = thaiTimestamp;
          delete serverStore.requests[idx].substituteDeclineReason;
        } else if (substituteStatus === 'declined') {
          serverStore.requests[idx].substituteDeclineReason = declineReason || 'ไม่สะดวกสอนแทน';
        }
        updated = serverStore.requests[idx];
      } else {
        const fallback = sanitizeRequest({
          id,
          userName: 'ครูผู้ขอ',
          branchName: 'ช่างกลโรงงาน',
          status: 'pending',
          hasClasses: true,
          substituteTeacherId: teacherId,
          substituteTeacherName: teacherName,
          substituteStatus,
          substituteAcknowledgedAt: substituteStatus === 'acknowledged' ? thaiTimestamp : undefined,
          substituteDeclineReason: substituteStatus === 'declined' ? declineReason : undefined
        });
        serverStore.requests.unshift(fallback);
        updated = fallback;
      }

      // Add audit log
      serverStore.logs.push({
        id: 'LOG-SUB-' + Date.now(),
        requestId: id,
        requestSummary: updated?.destination ? `${updated.userName} ขอออกไป ${updated.destination}` : `คำขอ ${id}`,
        actorId: teacherId || 'substitute_teacher',
        actorName: teacherName || 'ครูผู้สอนแทน',
        actorRole: 'ครูผู้สอนแทน',
        action: substituteStatus === 'acknowledged' ? 'substitute_ack' : 'substitute_decline',
        timestamp: thaiTimestamp,
        comment: substituteStatus === 'acknowledged'
          ? `ครูผู้สอนแทน (${teacherName || 'ครู'}) กดรับทราบภาระงานสอนแทนเรียบร้อยแล้ว`
          : `ครูผู้สอนแทน (${teacherName || 'ครู'}) แจ้งไม่สะดวกสอนแทน เหตุผล: ${declineReason || '-'}`
      });

      saveServerStore();

      // Forward to Google Apps Script
      forwardToAppsScript('substitute_ack', updated);

      return res.json({ success: true, request: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // API 6: Webhook Status & Diagnostics
  app.get('/api/webhook/status', (_req, res) => {
    const tunnel = getTunnelUrl();
    const publicWebhookUrl = tunnel ? `${tunnel}/api/line/webhook` : '';

    res.json({
      success: true,
      webhookUrl: '/api/line/webhook',
      publicWebhookUrl,
      totalWebhooksReceived: serverStore.webhookCount,
      lastWebhookEvent: serverStore.lastWebhookEvent || null
    });
  });

  // API 6.1: Check if Google Apps Script Web App is running and test LINE Webhook delivery
  app.get('/api/line/test-gas-webhook', async (req, res) => {
    const queryUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    const gasUrl = queryUrl || serverStore.settings.googleAppsScriptUrl || '';
    const token = getEffectiveToken();

    // Check if user accidentally pasted a Library URL
    if (gasUrl.includes('/library/d/')) {
      const match = gasUrl.match(/\/library\/d\/([a-zA-Z0-9_-]+)/);
      const scriptId = match ? match[1] : '1z68aySPejPfl9ZJCUB776oPdmoOt06MF9O1-L5mHeseaeGev--VXVcre';
      return res.json({
        configured: true,
        isLibraryUrl: true,
        scriptId,
        editorUrl: `https://script.google.com/d/${scriptId}/edit`,
        status: 'library_url_error',
        error: 'ลิงก์ที่ระบุคือ «ลิงก์ไลบรารี» (Library URL) ซึ่งไม่สามารถใช้เป็น Webhook ของ LINE ได้ (LINE จะปฏิเสธด้วย Error 401 ติดรหัสผ่าน Google) กรุณากด Deploy เป็น «เว็บแอป (Web app)» เพื่อรับ URL ที่ลงท้ายด้วย /exec'
      });
    }

    if (!gasUrl || !gasUrl.startsWith('http')) {
      return res.json({ configured: false, error: 'ยังไม่ได้ระบุ Google Apps Script URL' });
    }

    let lineEndpointInfo: any = null;
    if (token) {
      try {
        const epRes = await fetch('https://api.line.me/v2/bot/channel/webhook/endpoint', {
          headers: { 'Authorization': 'Bearer ' + token },
          signal: AbortSignal.timeout(4000)
        });
        const epData = await epRes.json();

        let testRes: any = null;
        if (epData?.endpoint) {
          const tRes = await fetch('https://api.line.me/v2/bot/channel/webhook/test', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + token,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ endpoint: epData.endpoint }),
            signal: AbortSignal.timeout(5000)
          });
          testRes = await tRes.json();
        }

        lineEndpointInfo = {
          registeredEndpoint: epData?.endpoint || '',
          active: epData?.active || false,
          testSuccess: testRes?.success || false,
          statusCode: testRes?.statusCode || null,
          reason: testRes?.reason || null
        };
      } catch (err: any) {
        lineEndpointInfo = { error: err.message };
      }
    }

    try {
      const pingRes = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: [{
            type: 'postback',
            replyToken: 'test-ping-token',
            source: { userId: 'Utest' },
            postback: { data: 'action=ping' }
          }]
        }),
        signal: AbortSignal.timeout(6000)
      });
      const text = await pingRes.text();
      const isOutdated = text.includes('ReferenceError: handleLineEvents is not defined');
      return res.json({
        configured: true,
        isOutdated,
        status: isOutdated ? 'outdated_gas' : 'ready',
        lineEndpointInfo
      });
    } catch (err: any) {
      return res.json({ configured: true, error: err.message, lineEndpointInfo });
    }
  });

  // API 6.2: Auto Sync Webhook URL to LINE Developers Console
  app.post('/api/line/sync-webhook-to-line', async (req, res) => {
    try {
      const targetEndpoint = (req.body?.endpoint || serverStore.settings.googleAppsScriptUrl || '').trim();
      const token = getEffectiveToken();

      if (!token) {
        return res.status(400).json({ success: false, error: 'ไม่พบ LINE Channel Access Token' });
      }

      if (!targetEndpoint || !targetEndpoint.startsWith('https://script.google.com/macros/s/') || !targetEndpoint.endsWith('/exec')) {
        return res.status(400).json({
          success: false,
          error: 'URL ต้องขึ้นต้นด้วย https://script.google.com/macros/s/ และลงท้ายด้วย /exec (URL ของเว็บแอปเท่านั้น ไม่ใช่ลิงก์ไลบรารี)'
        });
      }

      // Update LINE Webhook endpoint
      const updateRes = await fetch('https://api.line.me/v2/bot/channel/webhook/endpoint', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ endpoint: targetEndpoint })
      });

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        return res.status(400).json({ success: false, error: 'LINE API ปฏิเสธการบันทึก: ' + errText });
      }

      // Test webhook delivery
      const testRes = await fetch('https://api.line.me/v2/bot/channel/webhook/test', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ endpoint: targetEndpoint })
      });

      const testData = await testRes.json();

      // Update in server store
      serverStore.settings.googleAppsScriptUrl = targetEndpoint;
      saveServerStore();

      return res.json({
        success: true,
        endpoint: targetEndpoint,
        testResult: testData
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // API 7: Simulate Webhook Approval from Admin UI (For Testing)
  app.post('/api/webhook/test-simulate', async (req, res) => {
    try {
      const { reqId, action = 'approve', approverName = 'นายคัมภีร์ ช่วยเพชร (หัวหน้าสาขาช่างกลโรงงาน)' } = req.body;
      if (!reqId) {
        return res.status(400).json({ success: false, error: 'กรุณาระบุ reqId' });
      }

      const isApprove = action === 'approve';
      const idx = serverStore.requests.findIndex(r => r.id === reqId);
      const timestamp = getThaiTimestamp();

      if (idx !== -1) {
        serverStore.requests[idx].status = isApprove ? 'approved' : 'rejected';
        serverStore.requests[idx].approvedAt = timestamp;
        serverStore.requests[idx].approvedBy = `${approverName} (ผ่าน LINE Webhook)`;
      } else {
        // If not found in server store yet, create minimal approved record
        serverStore.requests.push({
          id: reqId,
          submittedAt: timestamp,
          userName: 'ครูผู้ขอ',
          branchName: 'ช่างกลโรงงาน',
          status: isApprove ? 'approved' : 'rejected',
          approvedAt: timestamp,
          approvedBy: `${approverName} (ผ่าน LINE Webhook)`
        });
      }

      serverStore.logs.push({
        id: 'LOG-SIM-' + Date.now(),
        requestId: reqId,
        actorName: approverName,
        actorRole: 'หัวหน้าสาขา',
        action: isApprove ? 'approve' : 'reject',
        timestamp,
        comment: `[ทดสอบจำลอง Webhook] ดำเนินการ${isApprove ? 'อนุมัติ' : 'ไม่อนุมัติ'}คำขอ ${reqId} สำเร็จ`
      });

      serverStore.webhookCount++;
      serverStore.lastWebhookEvent = {
        timestamp: new Date().toISOString(),
        type: 'postback_simulated',
        reqId,
        action,
        summary: `จำลองการกด ${isApprove ? 'อนุมัติ' : 'ไม่อนุมัติ'} คำขอ ${reqId} ผ่าน LINE`,
        success: true
      };

      saveServerStore();

      // Send LINE Flex Notification to Teacher
      notifyTeacherApprovalViaLineFlex(
        idx !== -1 ? serverStore.requests[idx] : null,
        isApprove ? 'approved' : 'rejected',
        approverName
      ).catch(e => console.error('Error in test simulate flex:', e));

      return res.json({
        success: true,
        message: `จำลองการกด${isApprove ? 'อนุมัติ' : 'ไม่อนุมัติ'}คำขอ ${reqId} สำเร็จเรียบร้อยแล้ว`,
        request: idx !== -1 ? serverStore.requests[idx] : null
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // API 7.1: 1-Click Instant Approval Link from LINE (Works directly in browser without relying on webhook)
  app.get('/api/line/quick-approve', async (req, res) => {
    try {
      const { reqId, action = 'approve', reason = '' } = req.query as { reqId: string; action: string; reason: string };
      if (!reqId) {
        return res.status(400).send('<h1>กรุณาระบุรหัสคำขอ (reqId)</h1>');
      }

      const isApprove = action === 'approve';
      const timestamp = getThaiTimestamp();
      const token = getEffectiveToken();

      const idx = serverStore.requests.findIndex(r => r.id === reqId);
      let targetReq: any = null;

      if (idx !== -1) {
        serverStore.requests[idx].status = isApprove ? 'approved' : 'rejected';
        serverStore.requests[idx].approvedAt = timestamp;
        serverStore.requests[idx].approvedBy = 'หัวหน้าสาขา (อนุมัติผ่าน LINE)';
        if (!isApprove && reason) {
          serverStore.requests[idx].rejectionReason = String(reason);
        }
        serverStore.requests[idx] = sanitizeRequest(serverStore.requests[idx]);
        targetReq = serverStore.requests[idx];
      } else {
        targetReq = sanitizeRequest({
          id: reqId,
          userName: 'ครูผู้ขอ',
          branchName: 'ช่างกลโรงงาน',
          status: isApprove ? 'approved' : 'rejected',
          approvedAt: timestamp,
          approvedBy: 'หัวหน้าสาขา (อนุมัติผ่าน LINE)',
          rejectionReason: !isApprove && reason ? String(reason) : undefined
        });
        serverStore.requests.unshift(targetReq);
      }

      serverStore.logs.push({
        id: 'LOG-LINE-QUICK-' + Date.now(),
        requestId: reqId,
        requestSummary: targetReq?.destination ? `${targetReq.userName} (${targetReq.branchName}) ขอออกไป ${targetReq.destination}` : `คำขอ ${reqId}`,
        actorId: 'line-head',
        actorName: 'หัวหน้าสาขา (ผ่าน LINE)',
        actorRole: 'หัวหน้าสาขา',
        action: isApprove ? 'approve' : 'reject',
        timestamp,
        comment: isApprove
          ? `หัวหน้าสาขากดอนุมัติคำขอ ${reqId} ผ่านลิงก์ LINE บนสมาร์ทโฟนสำเร็จ`
          : `หัวหน้าสาขากดไม่อนุมัติคำขอ ${reqId} ผ่านลิงก์ LINE บนสมาร์ทโฟน`
      });

      serverStore.webhookCount++;
      serverStore.lastWebhookEvent = {
        timestamp: new Date().toISOString(),
        type: 'quick_approve_link',
        reqId,
        action,
        summary: `หัวหน้าสาขากด ${isApprove ? 'อนุมัติ' : 'ไม่อนุมัติ'} คำขอ ${reqId} ผ่านลิงก์ด่วน LINE สำเร็จ`,
        success: true
      };

      saveServerStore();

      // Forward to Google Apps Script
      forwardToAppsScript('update_status', targetReq);

      // Send real LINE Flex Message to Teacher
      await notifyTeacherApprovalViaLineFlex(
        targetReq,
        isApprove ? 'approved' : 'rejected',
        'หัวหน้าสาขา (ผ่าน LINE)',
        reason
      );

      // Check format query (e.g. format=redirect)
      const format = (req.query.format as string) || '';
      if (format === 'redirect') {
        return res.redirect(`/?action=direct_approved&reqId=${encodeURIComponent(reqId)}&status=${action}`);
      }

      // Return a clean, mobile-optimized Thai confirmation screen for LINE in-app browser
      const htmlResponse = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isApprove ? 'อนุมัติเรียบร้อย' : 'ไม่อนุมัติคำขอ'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Prompt", sans-serif; background: #f8fafc; padding: 24px 16px; text-align: center; color: #0f172a; margin: 0; }
    .card { max-width: 420px; margin: 20px auto; background: #ffffff; border-radius: 28px; padding: 32px 20px; box-shadow: 0 10px 30px -5px rgba(0,0,0,0.08); border: 2px solid ${isApprove ? '#bbf7d0' : '#fecdd3'}; }
    .icon { width: 68px; height: 68px; border-radius: 22px; background: ${isApprove ? '#dcfce7' : '#ffe4e6'}; color: ${isApprove ? '#16a34a' : '#e11d48'}; font-size: 34px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-weight: bold; }
    .title { font-size: 20px; font-weight: 800; margin: 0 0 6px; color: ${isApprove ? '#14532d' : '#881337'}; }
    .badge { display: inline-block; padding: 4px 14px; background: #f1f5f9; border-radius: 99px; font-size: 12px; font-family: monospace; font-weight: 700; color: #475569; margin-bottom: 16px; }
    .detail { background: #f8fafc; border-radius: 18px; padding: 16px; font-size: 13px; text-align: left; line-height: 1.8; border: 1px solid #e2e8f0; margin-bottom: 20px; }
    .detail-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 4px 0; }
    .detail-row:last-child { border-bottom: none; }
    .label { color: #64748b; }
    .val { font-weight: 600; color: #1e293b; text-align: right; }
    .btn { display: block; width: 100%; padding: 14px; background: ${isApprove ? '#16a34a' : '#475569'}; color: #ffffff; border-radius: 16px; font-weight: 700; text-decoration: none; font-size: 14px; box-sizing: border-box; transition: background 0.2s; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${isApprove ? '✓' : '✕'}</div>
    <div class="title">${isApprove ? 'บันทึกอนุมัติคำขอเรียบร้อยแล้ว' : 'บันทึกไม่อนุมัติคำขอ'}</div>
    <div class="badge">รหัสคำขอ: ${reqId}</div>
    <div class="detail">
      <div class="detail-row"><span class="label">ครูผู้ขอ:</span><span class="val">${targetReq?.userName || '-'}</span></div>
      <div class="detail-row"><span class="label">สาขาวิชา:</span><span class="val">${targetReq?.branchName || '-'}</span></div>
      <div class="detail-row"><span class="label">สถานที่:</span><span class="val">${targetReq?.destination || '-'}</span></div>
      <div class="detail-row"><span class="label">วันที่/เวลา:</span><span class="val">${targetReq?.exitDate || '-'} (${targetReq?.exitTime || ''}–${targetReq?.returnTime || ''} น.)</span></div>
      <div class="detail-row"><span class="label">สถานะล่าสุด:</span><span class="val" style="color: ${isApprove ? '#16a34a' : '#e11d48'}; font-weight: 800;">${isApprove ? 'อนุมัติแล้ว (Approved)' : 'ไม่อนุมัติ (Rejected)'}</span></div>
    </div>
    <p style="font-size: 12px; color: #64748b; margin-bottom: 20px; line-height: 1.5;">
      ${isApprove ? '🎉 ระบบได้ปรับสถานะในระบบเว็บและแจ้งเตือนออกบัตรผ่าน QR Code แก่ครูเรียบร้อยแล้ว ท่านสามารถปิดหน้านี้ได้ทันที' : 'ระบบได้บันทึกสถานะไม่อนุมัติลงในระบบเรียบร้อยแล้ว'}
    </p>
    <a href="/?action=direct_approved&reqId=${encodeURIComponent(reqId)}" class="btn">เข้าสู่ระบบเว็บเพื่อดูรายละเอียด</a>
  </div>
</body>
</html>`;

      return res.send(htmlResponse);
    } catch (err: any) {
      console.error('Quick approve error:', err);
      return res.status(500).send(`เกิดข้อผิดพลาดในการบันทึกผลอนุมัติ: ${err.message || String(err)}`);
    }
  });

  // API 8: LINE Webhook Endpoint (Receives Postback when user taps "อนุมัติ" in LINE on phone)
  app.get('/api/line/webhook', (_req, res) => {
    res.send('LINE Webhook Endpoint is Active and Ready. Please send HTTP POST requests from LINE Messaging API.');
  });

  app.post('/api/line/webhook', async (req, res) => {
    try {
      const { events } = req.body;
      serverStore.webhookCount++;

      // When LINE Developers tests webhook verification, events is [] or undefined
      if (!events || !Array.isArray(events) || events.length === 0) {
        serverStore.lastWebhookEvent = {
          timestamp: new Date().toISOString(),
          type: 'verification',
          summary: 'LINE Developers กด Verify ตรวจสอบการเชื่อมต่อ Webhook สำเร็จ (200 OK)',
          success: true
        };
        saveServerStore();
        return res.status(200).send('OK');
      }

      for (const event of events) {
        let action = '';
        let reqId = '';
        let eventSourceType = event.type;

        // 1. Handle Postback event (When user clicks button in LINE Flex Message)
        if (event.type === 'postback' && event.postback?.data) {
          const params = new URLSearchParams(event.postback.data);
          action = params.get('action') || '';
          reqId = params.get('reqId') || '';
        } 
        // 2. Handle Text Message event (When user types "อนุมัติ", "อนุมัติ REQ-...", or sends text)
        else if (event.type === 'message' && event.message?.type === 'text') {
          const rawText = (event.message.text || '').trim();
          const isReject = rawText.includes('ไม่อนุมัติ') || rawText.toLowerCase().includes('reject');
          const isApprove = !isReject && (
            rawText.includes('อนุมัติ') || 
            rawText.toLowerCase().includes('approve') || 
            rawText.toLowerCase().includes('ok') || 
            rawText.includes('ตกลง') ||
            rawText.includes('อนุญาต')
          );

          if (isReject) {
            action = 'reject';
          } else if (isApprove) {
            action = 'approve';
          }

          if (action) {
            // Find request ID in the message: e.g. REQ-20261006-972 or REQ-...
            const reqMatch = rawText.match(/REQ-[\w-]+/i);
            if (reqMatch) {
              reqId = reqMatch[0].toUpperCase();
            } else {
              // Try finding numeric digits e.g. 972
              const numMatch = rawText.match(/\b\d{3,4}\b/);
              if (numMatch) {
                const target = serverStore.requests.find(r => r.id.endsWith(numMatch[0]));
                if (target) reqId = target.id;
              }
              // If still no reqId, pick the latest pending request
              if (!reqId) {
                const latestPending = serverStore.requests.find(r => r.status === 'pending');
                if (latestPending) {
                  reqId = latestPending.id;
                }
              }
            }
          }
        }

        if (reqId && (action === 'approve' || action === 'reject')) {
          const isApprove = action === 'approve';
            const timestamp = getThaiTimestamp();
            const token = getEffectiveToken();

            // Find request in serverStore
            const idx = serverStore.requests.findIndex(r => r.id === reqId);
            let targetReq: any = null;

            if (idx !== -1) {
              serverStore.requests[idx].status = isApprove ? 'approved' : 'rejected';
              serverStore.requests[idx].approvedAt = timestamp;
              serverStore.requests[idx].approvedBy = 'หัวหน้าสาขา (อนุมัติผ่าน LINE)';
              serverStore.requests[idx] = sanitizeRequest(serverStore.requests[idx]);
              targetReq = serverStore.requests[idx];
            } else {
              // Create approved placeholder if request wasn't synced yet
              targetReq = sanitizeRequest({
                id: reqId,
                userName: 'นายสุมัณฑิต ทิพย์มนตรี',
                branchName: 'ช่างกลโรงงาน',
                branchId: 'ME',
                destination: 'ตามภารกิจ',
                reason: 'ตามภารกิจ',
                assignedApproverName: 'หัวหน้าสาขาช่างกลโรงงาน',
                status: isApprove ? 'approved' : 'rejected',
                approvedAt: timestamp,
                approvedBy: 'หัวหน้าสาขา (อนุมัติผ่าน LINE)'
              });
              serverStore.requests.unshift(targetReq);
            }

            // Append ApprovalLog
            serverStore.logs.push({
              id: 'LOG-LINE-' + Date.now(),
              requestId: reqId,
              requestSummary: targetReq?.destination ? `${targetReq.userName} ขอออกไป ${targetReq.destination}` : `คำขอ ${reqId}`,
              actorId: event.source?.userId || 'line-approver',
              actorName: 'หัวหน้าสาขา (ผ่าน LINE)',
              actorRole: 'หัวหน้าสาขา',
              action: isApprove ? 'approve' : 'reject',
              timestamp,
              comment: isApprove
                ? `หัวหน้าสาขากดปุ่ม "อนุมัติ" ใน LINE บนสมาร์ทโฟนเรียบร้อยแล้ว`
                : `หัวหน้าสาขากดปุ่ม "ไม่อนุมัติ" ใน LINE บนสมาร์ทโฟน`
            });

            serverStore.lastWebhookEvent = {
              timestamp: new Date().toISOString(),
              type: 'postback',
              reqId,
              action,
              summary: `หัวหน้าสาขากด ${isApprove ? 'อนุมัติ' : 'ไม่อนุมัติ'} คำขอ ${reqId} ผ่าน LINE สำเร็จ`,
              success: true
            };

            saveServerStore();

            // 1. Send real LINE Flex Message to Teacher
            await notifyTeacherApprovalViaLineFlex(
              targetReq,
              isApprove ? 'approved' : 'rejected',
              'หัวหน้าสาขา (ผ่าน LINE)'
            );

            // 2. Forward update to Google Apps Script if URL exists
            forwardToAppsScript('update_status', targetReq);

            // ไม่ต้องส่ง flex ข้อความตอบกลับหาหัวหน้าสาขาเพิ่มเติม เพื่อประหยัดโควต้าข้อความ LINE
          }
        }

      return res.status(200).send('OK');
    } catch (err: any) {
      console.error('Webhook error:', err);
      return res.status(200).send('OK');
    }
  });

  // Mount Vite middleware in development
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
