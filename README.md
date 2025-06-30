# 🔐 Express Auth API — JWT Whitelist + Redis + MySQL

RESTful API otentikasi berbasis Node.js/Express dengan sistem **JWT allowlist (whitelist)** menggunakan **Redis**, disertai dengan dukungan login multi-perangkat yang bisa dikendalikan melalui environment (`CONCURRENT_LOGIN`), bcrypt untuk hashing password, dan MySQL sebagai penyimpanan data pengguna.

---

---

## 🔏 Signature Verification

Setiap request ke endpoint API ini (terutama `POST`, `PUT`, `DELETE`) **wajib disertai dua header keamanan**:

- `X-Signature`: signature hasil HMAC SHA256
- `X-Timestamp`: waktu saat request dibuat (dalam milidetik)

Signature dibuat dari kombinasi:

```
method + path + body + timestamp
```

Contoh yang akan di-hash:

```
POST/api/auth/login{"email":"a@a.com","password":"abc"}1750912634177
```

Hasil signature harus cocok dengan hasil di server menggunakan `SIGNATURE_KEY`.

⏱️ Signature juga memiliki batas waktu (`SIGNATURE_TIMELIMIT`, default 60 detik). Jika timestamp terlalu jauh dari waktu server, maka request akan dianggap **kedaluwarsa**.

📬 Disarankan menggunakan **Pre-request Script di Postman** untuk otomatisasi pembuatan signature. Dokumentasi lengkap di bagian bawah.

---

## 🚀 Fitur

- ✅ Register & Login menggunakan email dan password
- ✅ JWT (Bearer token) dengan `jti` unik
- ✅ Redis sebagai token allowlist (TTL per token)
- ✅ Middleware `auth.middleware` hanya menerima token yang terdaftar di Redis
- ✅ Middleware validasi `X-Signature` untuk setiap request (HMAC SHA256)
- ✅ Logout menghapus token dari Redis (token tidak valid lagi)
- ✅ Ganti password & akses profil user
- ✅ Opsi login multi-device (`CONCURRENT_LOGIN`)
- ✅ MySQL untuk penyimpanan user
- ✅ Modular & scalable

---

## ⚙️ Versi yang Digunakan

- 🟢 Node.js: **v20.18.3**
- 🔴 Redis: **8.0.2**
- 🐬 MySQL: **5.7+** (atau kompatibel)

---

## 🧱 Struktur Proyek

```
project-root/
├── src/
│   ├── config/                     # Konfigurasi koneksi
│   │   ├── db.js                   # MySQL
│   │   └── redis.js                # Redis
│   │
│   ├── controllers/               # Business logic
│   │   └── auth.controller.js     # Login, Register, Logout, dsb
│   │
│   ├── middlewares/              # Middleware untuk token dan signature
│   │   ├── auth.middleware.js          # Validasi JWT & whitelist Redis
│   │   └── signature.middleware.js     # Validasi X-Signature + X-Timestamp
│   │
│   ├── models/
│   │   └── user.model.js          # Akses data user di database
│   │
│   ├── routes/
│   │   ├── auth.routes.js         # Routing untuk auth API
│   │   └── index.js               # Menggabungkan semua router
│   │
│   └── utils/                     # (Opsional) Helper dan fungsi utilitas
│
├── app.js                         # Inisialisasi express app (import router, middleware)
├── server.js                      # Start server dan koneksi global
│
├── .env                           # Variabel lingkungan (jangan di-commit)
├── .env.example                   # Contoh konfigurasi untuk dev/clone
├── .gitignore                     # Ignore .env, node_modules, dll
│
├── API TEST.postman_collection.json       # Koleksi API Postman
├── API TEST.postman_environment.json      # Environment variabel Postman
│
├── package.json
├── package-lock.json
└── README.md
```

---

## ⚙️ Environment Variables

Buat file `.env` dan isi dengan konfigurasi berikut:

```env
PORT=3000
NODE_ENV=development

# Redis
REDIS_URL=redis://localhost:6379

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=api_test
DB_USERNAME=root
DB_PASSWORD=

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=36000 #second

# Password hashing
BCRYPT_ROUNDS=10

# Signature for Request Verification
SIGNATURE_KEY=
SIGNATURE_TIMELIMIT=60000 #miliseconds

# Multi-session policy
CONCURRENT_LOGIN=false   # false = 1 sesi aktif per user
```

---

## 📦 Instalasi

### 1. Clone dan install dependencies

```bash
git clone https://github.com/your-repo/project-auth-api.git
cd project-auth-api
npm install
```

---

### 2. Siapkan MySQL

Buat database dan tabel user:

```sql
CREATE DATABASE api_test;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

### 3. Jalankan Redis

#### a. Native (macOS/Linux)

```bash
redis-server
```

#### b. Docker (opsional)

```bash
docker run -d --name redis -p 6379:6379 redis
```

#### c. Test Redis

```bash
redis-cli ping
# Output: PONG
```

---

### 4. Jalankan server

```bash
npm start
```

Aplikasi akan berjalan di: `http://localhost:3000`

---

## 📮 API Endpoint

| Method | URL                     | Auth | Deskripsi                         |
| ------ | ----------------------- | ---- | --------------------------------- |
| POST   | `/auth/register`        | ❌   | Daftar user baru                  |
| POST   | `/auth/login`           | ❌   | Login dan dapatkan token JWT      |
| POST   | `/auth/logout`          | ✅   | Logout, hapus token dari Redis    |
| POST   | `/auth/change-password` | ✅   | Ganti password user               |
| GET    | `/auth/profile`         | ✅   | Lihat data user yang sedang login |

> Gunakan token JWT di header:
>
> ```
> Authorization: Bearer <access_token>
> ```

---

## 🔐 Cara Kerja JWT Allowlist (Redis)

- Setiap login menghasilkan `jti` (UUID)
- Token disimpan di Redis:
  ```
  jwt:<user_id>:<jti> = "allow"
  ```
- Token memiliki TTL sesuai `expiresIn`
- Middleware hanya menerima token yang **masih ada di Redis**
- Saat logout, token dihapus dari Redis (tidak valid lagi)

---

## 🔁 Tentang `CONCURRENT_LOGIN`

| Nilai             | Efek                                       |
| ----------------- | ------------------------------------------ |
| `false` (default) | Login baru akan menghapus semua token lama |
| `true`            | Login baru tidak menghapus token lama      |

---

## 🧪 Debug Redis

```bash
# Lihat semua token aktif
redis-cli keys jwt:*

# Cek TTL token
redis-cli ttl jwt:1:some-jti

# Lihat isi token
redis-cli get jwt:1:some-jti
```

---

## 📌 Catatan

- Token akan otomatis tidak valid jika tidak ditemukan di Redis
- Tidak pakai refresh token, tapi sistem ini cocok untuk session berbasis access_token pendek
- Token hanya valid saat Redis hidup dan menyimpannya

---

## 🧰 Teknologi yang Digunakan

| Library      | Fungsi                      |
| ------------ | --------------------------- |
| express      | Web framework Node.js       |
| jsonwebtoken | Pembuatan & verifikasi JWT  |
| redis        | Penyimpanan token allowlist |
| bcrypt       | Hash password               |
| uuid         | Generate ID token (`jti`)   |
| mysql2       | Query ke MySQL              |
| dotenv       | Konfigurasi environment     |

---

## 🔐 Keamanan Tambahan (opsional)

- Gunakan HTTPS (SSL) untuk semua komunikasi
- Batasi jumlah login/token per user via Redis key counting
- Implementasikan refresh token untuk token rotasi jangka panjang (opsional)

---

## 🧪 Testing dengan Postman

- Tambahkan variable `base_url` = `http://localhost:3000`
- Kirim request ke `{{base_url}}/auth/login`
- Gunakan `access_token` di header untuk endpoint yang butuh autentikasi

---

## 📄 Lisensi

MIT — bebas digunakan & dikembangkan.

---

## 🤝 Kontribusi

Pull Request & feedback sangat disambut.

Hubungi: [your.email@example.com]

---

## 🔏 Signature Verification (X-Signature)

Semua request `POST`, `PUT`, dan `DELETE` **wajib disertai header signature** untuk validasi integritas dan keamanan.

### 🛡 Header yang Wajib:

| Header        | Keterangan                                         |
| ------------- | -------------------------------------------------- |
| `X-Signature` | HMAC SHA256 dari (method + uri + body + timestamp) |
| `X-Timestamp` | Unix timestamp dalam milidetik                     |

### 🔧 Format Signature

```text
HMAC_SHA256(
  method + uri + body + timestamp,
  SIGNATURE_KEY
)
```

Contoh `dataToSign`:

```
POST/api/auth/login{"email":"a@a.com","password":"abc"}1750912634177
```

### 🧪 Generate Signature (Node.js)

```js
const crypto = require("crypto");

const dataToSign = method + uri + body + timestamp;
const signature = crypto.createHmac("sha256", SIGNATURE_KEY).update(dataToSign).digest("hex");
```

### ⚠️ Signature Timeout

- Signature **kedaluwarsa** jika selisih `X-Timestamp` dengan waktu server > SIGNATURE_TIMELIMIT (ms)
- Default limit: 60 detik (60000 ms)

---

## 📋 Tips Testing di Postman

Gunakan Pre-request Script berikut agar header `X-Signature` dan `X-Timestamp` otomatis dibuat:

```js
const SIGNATURE_KEY = pm.environment.get("SIGNATURE_KEY") || "default_secret";

// Timestamp seperti backend
const now = Date.now();
const datepProccess = Math.trunc(now / 1e3);
const timestamp = 1e3 * datepProccess + (datepProccess % 997);

// Resolve URL dari {{base_url}}
const fullUrl = pm.variables.replaceIn(pm.request.url.toString());
const path = new URL(fullUrl).pathname;

// Tentukan apakah method punya body
let bodyString = "";
const methodsWithBody = ["POST", "PUT", "PATCH", "DELETE"];

if (methodsWithBody.includes(pm.request.method)) {
  const raw = pm.request.body?.raw || "";
  try {
    const parsedBody = JSON.parse(raw);
    bodyString = JSON.stringify(parsedBody);
  } catch (e) {
    bodyString = "";
  }
}

// Bangun string signature
const dataToSign = pm.request.method + path + bodyString + timestamp;
console.log("dataToSign:", dataToSign);

// Buat signature dengan Web Crypto API
const encoder = new TextEncoder();
const keyData = encoder.encode(SIGNATURE_KEY);
const data = encoder.encode(dataToSign);

crypto.subtle
  .importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  .then((cryptoKey) => {
    return crypto.subtle.sign("HMAC", cryptoKey, data);
  })
  .then((signatureBuffer) => {
    const signatureHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Masukkan header signature dan timestamp
    pm.request.headers.upsert({ key: "X-Signature", value: signatureHex });
    pm.request.headers.upsert({ key: "X-Timestamp", value: timestamp.toString() });

    console.log("Signature generated:", signatureHex);
  });
```
