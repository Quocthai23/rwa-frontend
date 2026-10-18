import Link from 'next/link';

export default function PaymentSuccessPage() {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center p-6">
      <section className="bg-card border-border w-full max-w-md rounded-2xl border p-6 text-center shadow-sm">
        <h1 className="text-foreground text-2xl font-semibold">
          Đã nhận kết quả thanh toán
        </h1>
        <p className="text-muted-foreground mt-3">
          Giao dịch đang được xác minh qua webhook PayOS. Số dư chỉ được cập
          nhật sau khi hệ thống xác nhận thanh toán thành công.
        </p>
        <Link
          href="/transaction-history"
          className="bg-primary-500 mt-6 inline-flex w-full justify-center rounded-lg px-4 py-3 font-medium text-white"
        >
          Xem lịch sử giao dịch
        </Link>
      </section>
    </main>
  );
}
