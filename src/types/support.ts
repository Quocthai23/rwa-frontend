export enum SupportTicketStatus {
  Open = 0,
  InProgress = 1,
  Resolved = 2,
  Closed = 3,
}

export enum SupportMessageType {
  Text = 0,
  Image = 1,
}

export enum SupportTicketSubject {
  AccountIssue = 'Account Issue',
  Deposit = 'Deposit',
  Withdrawal = 'Withdrawal',
  TradingIssue = 'Trading Issue',
  TechnicalIssue = 'Technical Issue',
  Verification = 'Verification',
  Billing = 'Billing',
  Other = 'Other',
}
