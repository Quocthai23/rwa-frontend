# MTX Web - Nền Tảng Giao Dịch Tài Sản Thực (RWA) Trên Blockchain

MTX Web là ứng dụng Frontend được xây dựng bằng **Next.js 16 (App Router)**, **React 19**, và **TypeScript**, tối ưu hóa cho cả hai giao diện: **Web Desktop** và **Web Mobile** (Mobile Web).

Hệ thống cho phép người dùng giao dịch các Tài Sản Thực (Real World Assets - RWA) được token hóa trên nền tảng blockchain, tích hợp dữ liệu biểu đồ thời gian thực, quản trị phi tập trung (DAO), kiểm tra xác thực danh tính (KYC), mạng xã hội nội bộ và tính năng sao chép giao dịch (Copy Trading).

---

## 🚀 Tính Năng Cốt Lõi

### 1. Giao Diện Tối Ưu Cho 2 Bản (Desktop Web & Mobile Web)

- **Cơ chế Phát Hiện Device Động (`useExperience`)**: Tự động phát hiện kích thước khung nhìn (breakpoint `1024px`) để quyết định hiển thị:
  - **Desktop Web (`web` experience)**: Tự động chuyển hướng `/` sang `/market`. Sử dụng `WebLayout`, `WebHeader`, `WebNavbar`.
  - **Mobile Web (`app` experience)**: Tự động chuyển hướng `/` sang `/home`. Sử dụng `AppLayout`, `AppHeader`, `AppNavbar`.
- Cấu trúc component được tổ chức phân tách rõ ràng tại `src/components/featured/[feature]/{web|app}` để tối ưu hóa trải nghiệm người dùng trên từng kích thước màn hình.

### 2. Giao Dịch RWA (Real World Asset Trading)

- **Bảng Vị Thế & Đơn Hàng (Positions & Orders)**: Quản lý chi tiết vị thế đang mở, lịch sử vị thế, đơn hàng chờ khớp và lịch sử lệnh.
- **Đòn Bẩy & Ký Quỹ**: Hỗ trợ thiết lập đòn bẩy (leverage), tính toán mức ký quỹ (margin) và quản lý rủi ro thanh lý.
- **Lệnh Giao Dịch**: Hỗ trợ lệnh thị trường (Market Order) và lệnh giới hạn (Limit Order) cùng với thiết lập chốt lời/cắt lỗ (TP/SL).

### 3. Xác Thực Danh Tính Quốc Tế (KYC Integration)

- Tích hợp luồng KYC nghiêm ngặt hỗ trợ bởi **FPT AI Checkface** để định danh người dùng trước khi tham gia giao dịch tài sản thực, đảm bảo tính pháp lý.

### 4. Dữ Liệu Thời Gian Thực (Real-Time WebSockets)

- **Kline Socket (Mặc định `/`)**: Nhận dữ liệu nến (OHLCV) trực tiếp từ WebSocket để vẽ biểu đồ nến động.
- **Trading Socket (Namespace `/trading`)**: Nhận cập nhật giá Bid/Ask, Sổ lệnh (Order Book), lịch sử khớp lệnh thị trường và sự kiện lệnh cá nhân (`my_order_matched`).

### 5. Quản Trị DAO (DAO Governance)

- Cho phép người sở hữu token tham gia biểu quyết các đề xuất (proposals) liên quan đến quản trị và vận hành các dự án tài sản thực trên chuỗi.

### 6. Cộng Đồng & Sao Chép Giao Dịch (Social & Copy Trading)

- **Bảng Xếp Hạng**: Theo dõi hiệu suất của các nhà giao dịch hàng đầu.
- **Copy Trading**: Cho phép người dùng chọn lựa chiến lược để tự động sao chép lệnh giao dịch.
- **Social Feed**: Hệ thống bài viết, thảo luận và tương tác trực tiếp giữa các thành viên.

### 7. Quản Lý Tài Sản & Nạp Rút (Wallet, Transfer & Redemption)

- Hỗ trợ Nạp tiền (Deposit), Rút tiền (Withdraw), Chuyển khoản nội bộ (Transfer).
- Thực hiện quy đổi tài sản token hóa sang tài sản vật chất thực tế thông qua luồng **Redemption** & nhận cổ tức qua **Dividend**.

---

## 🛠️ Công Nghệ Sử Dụng

| Thành phần               | Công nghệ / Thư viện                                                 |
| :----------------------- | :------------------------------------------------------------------- |
| **Framework chính**      | Next.js 16 (App Router), React 19, TypeScript                        |
| **Styling**              | Tailwind CSS v4, Radix UI (chất lượng cao, tối ưu khả năng truy cập) |
| **Quản lý State**        | Zustand                                                              |
| **Truy vấn Dữ liệu API** | TanStack Query (React Query v5) kết hợp với Axios & Ky               |
| **Kết nối Real-time**    | Socket.io-client (WebSockets)                                        |
| **Xác thực**             | NextAuth.js                                                          |
| **Đa ngôn ngữ**          | i18next / react-i18next                                              |
| **Hoạt ảnh (Animation)** | Framer Motion, Lottie-react                                          |
| **Quản lý Package**      | Yarn (v1.x)                                                          |

---

## 📂 Cấu Trúc Thư Mục Dự Án (Tóm Tắt)

```text
rwa-fe/
├── public/                 # Các tài nguyên tĩnh (Hình ảnh, Icons, Lottie animations)
├── src/
│   ├── app/                # Next.js App Router (Các trang & API routes)
│   │   ├── (auth)/         # Đăng ký, đăng nhập, quên mật khẩu
│   │   ├── market/         # Trang Thị trường (Mặc định cho Desktop Web)
│   │   ├── home/           # Trang Chủ (Mặc định cho Mobile Web)
│   │   ├── trade/          # Trang Giao dịch tài sản
│   │   ├── position/       # Quản lý Vị thế & Portfolio
│   │   ├── dao/            # Quản trị phi tập trung DAO
│   │   └── ...
│   ├── components/         # Các React Components
│   │   ├── featured/       # Components theo tính năng (kyc, trade, position, v.v.)
│   │   ├── layouts/        # AppLayout (Mobile) và WebLayout (Desktop)
│   │   ├── shared/         # Components dùng chung (Header, Navbar, Button, v.v.)
│   │   └── examples/       # Biểu đồ nến mẫu và Dashboard realtime mẫu
│   ├── hook/               # Custom React Hooks (useCandlestickData, useSymbols, v.v.)
│   ├── store/              # Zustand stores quản lý trạng thái kết nối socket & data
│   ├── services/           # API clients kết nối tới hệ thống backend
│   ├── constants/          # Khai báo cấu hình, các biến môi trường
│   ├── types/              # Định nghĩa TypeScript types (sinh tự động từ Swagger spec)
│   └── lib/                # Cấu hình tiện ích dùng chung (utils, kinh nghiệm viewport)
├── Dockerfile              # Cấu hình Docker build multi-stage
├── docker-compose.yml      # Cấu hình chạy Docker container môi trường Production
└── package.json            # Các thư viện phụ thuộc và script vận hành
```

---

## ⚙️ Cài Đặt và Khởi Chạy

### Yêu cầu hệ thống

- **Node.js**: Phiên bản khuyên dùng `20+` (Docker image sử dụng `Node 25-Alpine`).
- **Yarn**: Phiên bản 1.x (sử dụng file khóa `yarn.lock`).

### Khởi Chạy Local

1.  **Cài đặt biến môi trường**:
    Sao chép tệp tin cấu hình mẫu và điền đầy đủ các thông tin:

    ```bash
    cp .env.example .env
    ```

    _Danh sách các biến môi trường cơ bản:_
    - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Dùng cho đăng nhập Google (NextAuth).
    - `NEXTAUTH_SECRET`: Khóa ký phiên đăng nhập NextAuth.
    - `NEXT_PUBLIC_API_BASE_URL`: URL API backend chính của bạn.
    - `NEXT_PUBLIC_SOCKET_CHART_URL`: URL Socket của biểu đồ nến và dữ liệu trading.

2.  **Cài đặt các gói thư viện phụ thuộc**:

    ```bash
    yarn install
    ```

3.  **Khởi động chế độ nhà phát triển (Development)**:

    ```bash
    yarn dev
    ```

    Mở [http://localhost:3000](http://localhost:3000) trên trình duyệt để kiểm nghiệm giao diện.

4.  **Kiểm tra lỗi và định dạng mã nguồn**:

    ```bash
    yarn lint     # Kiểm tra lỗi cú pháp và chuẩn code (ESLint)
    yarn format   # Định dạng lại code đẹp mắt (Prettier)
    ```

5.  **Biên dịch Swagger Types**:
    Nếu có thay đổi từ phía API backend, bạn có thể tạo lại TypeScript types từ file Swagger:
    ```bash
    yarn generate:swagger-types
    ```

---

## 🐳 Vận Hành Với Docker

Dự án hỗ trợ quy trình đóng gói ứng dụng Next.js dưới dạng **standalone** tối ưu hóa dung lượng hình ảnh (image size) và hiệu năng chạy thực tế.

### Xây dựng Docker Image (Build)

Đảm bảo đã khai báo các biến môi trường `NEXT_PUBLIC_*` trong file `.env` trước khi thực hiện build (vì Next.js sẽ nhúng các biến này vào bundle phía Client trong quá trình build).

```bash
# Xây dựng môi trường Production
docker compose -f docker-compose.yml build web

# Xây dựng môi trường Development
docker compose -f docker-compose.dev.yml build web
```

### Chạy Container

```bash
# Chạy container môi trường Production
docker compose -f docker-compose.yml up -d web

# Chạy container môi trường Development (cổng HTTP mặc định 3000 hoặc theo cấu hình WEB_PORT)
docker compose -f docker-compose.dev.yml up -d web
```

---

## 📡 Luồng Dữ Liệu Thời Gian Thực (WebSockets)

Hệ thống kết nối tới hai cổng truyền tải dữ liệu từ phía máy chủ để đảm bảo tính thời gian thực cho biểu đồ và thông báo:

1.  **Dữ Liệu Nến (Candlestick Data)**:
    - Sử dụng Custom Hook `useCandlestickData` đăng ký vào socket mặc định `/`.
    - Tự động tải lịch sử nến từ API `GET /market-data/candles?symbol={symbol}&timeframe={timeframe}` sau đó lắng nghe các sự kiện `kline` để cập nhật biểu đồ nến SVG động mà không cần tải lại trang.
2.  **Dữ Liệu Sổ Lệnh & Khớp Lệnh (Trading Dashboard)**:
    - Sử dụng Custom Hook `useTradingRealtimeSocket` kết nối tới namespace `/trading`.
    - Lắng nghe các luồng sự kiện:
      - `price_update`: Cập nhật liên tục giá Bid/Ask của các tài sản.
      - `order_book_update`: Vẽ sổ lệnh thời gian thực.
      - `trade_matched`: Lịch sử các giao dịch vừa khớp trên thị trường.
      - `my_order_matched`: Báo hiệu lệnh giao dịch cá nhân của người dùng đã khớp thành công.
