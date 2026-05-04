// Transaction status: 0: PENDING, 1: APPROVED, 2: PROCESSING, 3: COMPLETED, 4: FAILED, 5: REJECTED, 6: CANCELLED
// Transaction type: 0: DEPOSIT, 1: WITHDRAWAL
export const STATUS_HISTORY_NAME = {
  0: 'Pending',
  1: 'Approved',
  2: 'Processing',
  3: 'Completed',
  4: 'Failed',
  5: 'Rejected',
  6: 'Cancelled',
};
export const STATUS_HISTORY_ID = {
  PENDING: 0,
  APPROVED: 1,
  PROCESSING: 2,
  COMPLETED: 3,
  FAILED: 4,
  REJECTED: 5,
  CANCELLED: 6,
};

export const TYPE_HISTORY_NAME = {
  0: 'Deposit',
  1: 'Withdrawal',
  2: 'Transfer',
};
export const TYPE_HISTORY_ID = {
  DEPOSIT: 0,
  WITHDRAWAL: 1,
  TRANSFER: 2,
};
