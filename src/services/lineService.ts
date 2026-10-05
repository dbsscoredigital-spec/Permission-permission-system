import { ExitRequest, LineSimulatedMessage, RequestStatus } from '../types';

const LINE_MESSAGES_KEY = 'exit_app_line_messages_v4';

export class LineService {
  private static instance: LineService;

  private constructor() {
    this.initIfEmpty();
  }

  public static getInstance(): LineService {
    if (!LineService.instance) {
      LineService.instance = new LineService();
    }
    return LineService.instance;
  }

  private initIfEmpty() {
    if (!localStorage.getItem(LINE_MESSAGES_KEY)) {
      const initialMsgs: LineSimulatedMessage[] = [
        {
          id: 'LINE-MSG-001',
          timestamp: '08:15',
          recipientType: 'approver',
          recipientName: 'อ.วิชัย ช่างทอง',
          recipientBranch: 'ช่างยนต์',
          requestId: 'REQ-20261005-001',
          teacherName: 'นายสมชาย รักเรียน',
          exitDate: '5 ต.ค. 2569',
          timeRange: '10:30 – 12:00 น.',
          destination: 'ศูนย์บริการรถยนต์ มิตซูบิชิ ปทุมวัน',
          reason: 'นำรถยนต์ราชการส่วนกลางเข้าตรวจเช็กระยะ 20,000 กม.',
          status: 'pending'
        },
        {
          id: 'LINE-MSG-002',
          timestamp: '09:30',
          recipientType: 'teacher',
          recipientName: 'นางสาวสุดา เทคโนสารสนเทศ',
          recipientBranch: 'ธุรกิจดิจิทัล',
          requestId: 'REQ-20261004-002',
          teacherName: 'นางสาวสุดา เทคโนสารสนเทศ',
          exitDate: '4 ต.ค. 2569',
          timeRange: '13:00 – 16:30 น.',
          destination: 'ธนาคารกรุงไทย สาขาศาลายา',
          reason: 'นำส่งเอกสารบัญชีเบิกจ่ายทุนการศึกษานักศึกษาฝึกประสบการณ์',
          status: 'approved',
          approverName: 'อ.วราภรณ์ ดิจิทัลวิศิษฏ์ (หัวหน้าสาขาธุรกิจดิจิทัล)'
        }
      ];
      localStorage.setItem(LINE_MESSAGES_KEY, JSON.stringify(initialMsgs));
    }
  }

  public getMessages(): LineSimulatedMessage[] {
    const data = localStorage.getItem(LINE_MESSAGES_KEY);
    return data ? JSON.parse(data) : [];
  }

  public saveMessages(msgs: LineSimulatedMessage[]) {
    localStorage.setItem(LINE_MESSAGES_KEY, JSON.stringify(msgs));
  }

  /**
   * Quota Info for LINE Official Account Free Tier (300 messages / month)
   * Strictly 2 messages per request:
   * 1. Send to Approver when request is ready (after substitute teacher acknowledged in web app)
   * 2. Send to Requesting Teacher when Approver finishes review
   */
  public getMonthlyQuotaInfo(): { used: number; total: number; remaining: number } {
    const msgs = this.getMessages();
    const used = msgs.length;
    const total = 300;
    return {
      used,
      total,
      remaining: Math.max(0, total - used)
    };
  }

  /**
   * Message 1 of 2: Sent to Department Head (Approver)
   * If there are teaching duties, this is sent AFTER the substitute teacher acknowledges in the web app.
   */
  public sendApproverNotification(req: ExitRequest) {
    const msgs = this.getMessages();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newMsg: LineSimulatedMessage = {
      id: `LINE-MSG-${Date.now()}-APPROVER`,
      timestamp: timeStr,
      recipientType: 'approver',
      recipientName: req.assignedApproverName,
      recipientBranch: req.branchName,
      requestId: req.id,
      teacherName: req.userName,
      exitDate: req.exitDate,
      timeRange: `${req.exitTime} – ${req.returnTime} น.`,
      destination: req.destination,
      reason: req.reason,
      status: 'pending'
    };

    this.saveMessages([newMsg, ...msgs]);
  }

  /**
   * Message 2 of 2: Sent to Requesting Teacher when approved or rejected
   */
  public sendTeacherStatusNotification(
    req: ExitRequest,
    status: RequestStatus,
    approverName: string,
    rejectionReason?: string
  ) {
    const msgs = this.getMessages();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newMsg: LineSimulatedMessage = {
      id: `LINE-MSG-${Date.now()}-TEACHER`,
      timestamp: timeStr,
      recipientType: 'teacher',
      recipientName: req.userName,
      recipientBranch: req.branchName,
      requestId: req.id,
      teacherName: req.userName,
      exitDate: req.exitDate,
      timeRange: `${req.exitTime} – ${req.returnTime} น.`,
      destination: req.destination,
      reason: req.reason,
      status,
      approverName,
      rejectionReason
    };

    // Also update any pending message for this request to show action taken
    const updated = msgs.map(m => {
      if (m.requestId === req.id && m.recipientType === 'approver') {
        return {
          ...m,
          status,
          actionTaken: status === 'approved' ? ('approved' as const) : ('rejected' as const)
        };
      }
      return m;
    });

    this.saveMessages([newMsg, ...updated]);
  }

  /**
   * Build LINE Flex Message JSON payload adhering strictly to LINE Messaging API format.
   * Can be directly plugged into LINE Messaging API or Google Apps Script UrlFetchApp.
   */
  public generateLineFlexMessagePayload(req: ExitRequest) {
    return {
      type: 'flex',
      altText: `🔔 คำขอออกนอกสถานศึกษา: ${req.userName} (${req.branchName})`,
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#059669',
          paddingAll: '16px',
          contents: [
            {
              type: 'text',
              text: '🔔 มีคำขออนุญาตออกนอกสถานศึกษา',
              weight: 'bold',
              size: 'md',
              color: '#ffffff'
            },
            {
              type: 'text',
              text: `รหัสคำขอ: ${req.id}`,
              size: 'xs',
              color: '#d1fae5',
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
                { type: 'text', text: '👨‍🏫 ผู้ขอ:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: req.userName, size: 'sm', weight: 'bold', color: '#0f172a', flex: 5 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '🏫 สาขา:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: req.branchName, size: 'sm', weight: 'bold', color: '#0f172a', flex: 5 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '📅 วันที่:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: req.exitDate, size: 'sm', color: '#0f172a', flex: 5 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '🕐 เวลา:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: `${req.exitTime} – ${req.returnTime} น.`, size: 'sm', color: '#0f172a', flex: 5 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '📍 สถานที่:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: req.destination, size: 'sm', color: '#0f172a', flex: 5, wrap: true }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '📝 เหตุผล:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: req.reason, size: 'sm', color: '#0f172a', flex: 5, wrap: true }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '🚗 เดินทาง:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: req.travelMethod, size: 'sm', color: '#475569', flex: 5 }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#16a34a',
              action: {
                type: 'postback',
                label: '✅ อนุมัติ',
                data: `action=approve&reqId=${req.id}`
              }
            },
            {
              type: 'button',
              style: 'secondary',
              color: '#ef4444',
              action: {
                type: 'postback',
                label: '❌ ไม่อนุมัติ',
                data: `action=reject&reqId=${req.id}`
              }
            }
          ]
        }
      }
    };
  }
}
