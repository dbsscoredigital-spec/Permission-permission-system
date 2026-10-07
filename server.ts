import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawn } from 'child_process';
import dotenv from 'dotenv';

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
  deletedRequestIds?: string[];
  settings: {
    lineChannelAccessToken?: string;
    googleAppsScriptUrl?: string;
    appUrl?: string;
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

// Load or initialize server store
function loadServerStore(): ServerStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      const rawRequests = Array.isArray(parsed.requests) ? parsed.requests : [];
      const deletedIds = Array.isArray(parsed.deletedRequestIds) ? parsed.deletedRequestIds : [];
      const deletedSet = new Set(deletedIds);
      return {
        requests: rawRequests.map(sanitizeRequest).filter((r: any) => r && !deletedSet.has(r.id)),
        logs: Array.isArray(parsed.logs) ? parsed.logs.filter((l: any) => !deletedSet.has(l.requestId)) : [],
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
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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

  // API 3: Get All Requests from server store
  app.get('/api/requests', (_req, res) => {
    res.json({
      success: true,
      requests: serverStore.requests,
      logs: serverStore.logs,
      lastWebhookEvent: serverStore.lastWebhookEvent,
      webhookCount: serverStore.webhookCount
    });
  });

  // API 4: Sync requests between Client and Server (Bi-directional merge)
  app.post('/api/requests/sync', (req, res) => {
    try {
      const { requests: clientRequests, logs: clientLogs, settings: clientSettings, deletedRequestIds: clientDeletedIds } = req.body;

      if (!serverStore.deletedRequestIds) {
        serverStore.deletedRequestIds = [];
      }
      if (Array.isArray(clientDeletedIds)) {
        for (const dId of clientDeletedIds) {
          if (!serverStore.deletedRequestIds.includes(dId)) {
            serverStore.deletedRequestIds.push(dId);
          }
        }
      }

      // Purge any requests in serverStore that have been deleted
      if (serverStore.deletedRequestIds.length > 0) {
        const deletedSet = new Set(serverStore.deletedRequestIds);
        serverStore.requests = serverStore.requests.filter(r => !deletedSet.has(r.id));
        serverStore.logs = serverStore.logs.filter(l => !deletedSet.has(l.requestId));
      }

      if (clientSettings) {
        if (clientSettings.lineChannelAccessToken && !clientSettings.lineChannelAccessToken.startsWith('MOCK_')) {
          serverStore.settings.lineChannelAccessToken = clientSettings.lineChannelAccessToken;
        }
        if (clientSettings.googleAppsScriptUrl) {
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
          } else {
            const sReq = serverStore.requests[sIdx];
            // If server was updated via LINE webhook to approved/rejected, PRESERVE the approved/rejected status, BUT merge all request details!
            if ((sReq.status === 'approved' || sReq.status === 'rejected') && sanitizedClientReq.status === 'pending') {
              serverStore.requests[sIdx] = {
                ...sanitizedClientReq,
                ...sReq,
                status: sReq.status,
                approvedAt: sReq.approvedAt || sanitizedClientReq.approvedAt,
                approvedBy: sReq.approvedBy || sanitizedClientReq.approvedBy
              };
            } else if (sanitizedClientReq.status !== 'pending' && sReq.status === 'pending') {
              // Client updated status, update server
              serverStore.requests[sIdx] = { ...sReq, ...sanitizedClientReq };
            } else {
              // Merge details
              serverStore.requests[sIdx] = { ...sanitizedClientReq, ...sReq, status: sReq.status };
            }
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

      saveServerStore();

      return res.json({
        success: true,
        requests: serverStore.requests,
        logs: serverStore.logs,
        deletedRequestIds: serverStore.deletedRequestIds || [],
        lastWebhookEvent: serverStore.lastWebhookEvent
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: 'Sync error: ' + (err.message || String(err))
      });
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

      return res.json({
        success: true,
        message: `จำลองการกด${isApprove ? 'อนุมัติ' : 'ไม่อนุมัติ'}คำขอ ${reqId} สำเร็จเรียบร้อยแล้ว`,
        request: idx !== -1 ? serverStore.requests[idx] : null
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || String(err) });
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

            // 1. Send push notification to Teacher if they have a LINE ID
            const teacherLineId = targetReq?.teacherLineId || targetReq?.userId;
            if (token && !token.startsWith('MOCK_') && teacherLineId && teacherLineId.startsWith('U')) {
              const teacherMsg = isApprove
                ? `✅ คำขอออกนอกสถานศึกษา ${reqId} ของท่านได้รับการอนุมัติแล้วผ่าน LINE!\nท่านสามารถเปิดระบบเพื่อแสดงบัตรผ่าน QR Code แก่เจ้าหน้าที่ รปภ. ได้เลยครับ`
                : `❌ คำขอออกนอกสถานศึกษา ${reqId} ไม่ได้รับการอนุมัติ (แจ้งผ่าน LINE)`;

              pushToLine(token, teacherLineId, [{ type: 'text', text: teacherMsg }]).catch(e =>
                console.error('Error notifying teacher via LINE:', e)
              );
            }

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
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
