import Link from 'next/link';

export default function PaymentCancelPage() {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center p-6">
      <section className="bg-card border-border w-full max-w-md rounded-2xl border p-6 text-center shadow-sm">
        <h1 className="text-foreground text-2xl font-semibold">
          Thanh toán chưa hoàn tất
        </h1>
        <p className="text-muted-foreground mt-3">
          Giao dịch đã bị hủy hoặc chưa được thanh toán. Tài khoản của bạn
          không được ghi có.
        </p>
        <Link
          href="/top-up"
          className="bg-primary-500 mt-6 inline-flex w-full justify-center rounded-lg px-4 py-3 font-medium text-white"
        >
          Thử lại
        </Link>
      </section>
    </main>
  );
}
