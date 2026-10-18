import { NextRequest, NextResponse } from 'next/server';

type ProposalTemplate = { title: string; content: string };

const templates: Record<string, ProposalTemplate> = {
  BUYOUT_PROPOSAL: {
    title: 'Đề xuất thâu tóm tài sản',
    content: `[CENTER]**ĐỀ XUẤT THÂU TÓM TÀI SẢN**[/CENTER]

**Bên đề xuất:** Tài khoản lưu ký [[userAddress]]
**Tài sản:** [[assetName]]

**1. Mục đích**
Bên đề xuất yêu cầu mua toàn bộ phần sở hữu thiểu số còn lại vì: {{reason}}.

**2. Điều khoản tài chính**
Giá cơ sở, premium, tiền ký quỹ và khoản thanh toán hằng tháng do hệ thống tính và đóng băng tại snapshot. Premium tăng theo thời hạn thanh toán. Thời hạn đề xuất: {{durationMonths}} tháng.

**3. Biểu quyết và thực thi**
- Quyền biểu quyết của bên mua bị loại khỏi proposal.
- Chỉ cổ đông thiểu số tại snapshot được biểu quyết theo trọng số sở hữu.
- Proposal phải đạt quorum, supermajority và đa số tuyệt đối của quyền biểu quyết thiểu số theo cấu hình tài sản.
- Việc thực thi chỉ bắt đầu khi escrow V2 đã khóa đủ tiền ký quỹ và các điều kiện pháp lý được duyệt.`,
  },
  MAINTENANCE: {
    title: 'Đề xuất bảo trì tài sản',
    content: `**Tài sản:** [[assetName]]

**Hạng mục:** {{reason}}
**Ngân sách dự kiến:** {{amount}} VNĐ

Ngân sách chỉ được giải ngân theo các mốc nghiệm thu đã được phê duyệt và ghi nhận trong hệ thống.`,
  },
  LEASE: {
    title: 'Đề xuất cho thuê tài sản',
    content: `**Tài sản:** [[assetName]]
**Giá thuê hằng tháng:** {{monthlyRent}} VNĐ
**Tiền ký quỹ:** {{initialPayment}} VNĐ
**Thời hạn:** {{duration}} tháng

Việc thực thi chỉ bắt đầu sau khi hợp đồng thuê, payment escrow và module ký KMS đã được phê duyệt.`,
  },
  WITHDRAW: {
    title: 'Đề xuất rút tiền quỹ',
    content: `**Tài sản:** [[assetName]]
**Người thụ hưởng:** [[userAddress]]
**Số tiền:** {{amount}} VNĐ
**Mục đích:** {{reason}}

Khoản rút chỉ được thực hiện sau biểu quyết, kiểm tra hạn mức và phê duyệt đa chữ ký.`,
  },
  GENERAL: {
    title: 'Đề xuất quản trị',
    content: `**Tài sản:** [[assetName]]
**Bên đề xuất:** [[userAddress]]

**Nội dung:** {{reason}}
**Kế hoạch:** {{plan}}
**Chi phí dự kiến:** {{amount}} VNĐ`,
  },
};

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') ?? 'GENERAL';
  const template = templates[type] ?? templates.GENERAL;

  return NextResponse.json({
    success: true,
    data: { type, ...template },
  });
}
