# 🔐 Express Auth API — JWT Whitelist + Redis + MySQL

RESTful API otentikasi berbasis Node.js/Express dengan sistem **JWT allowlist (whitelist)** menggunakan **Redis**, disertai dengan dukungan login multi-perangkat yang bisa dikendalikan melalui environment (`CONCURRENT_LOGIN`), bcrypt untuk hashing password, dan MySQL sebagai penyimpanan data pengguna.

---

## 🔏 Signature Verification

Setiap request ke endpoint API ini (terutama `POST`, `PUT`, `DELETE`) **wajib disertai dua header keamanan**:

- `X-Signature`: signature hasil HMAC SHA256
- `X-Timestamp`: waktu saat request dibuat (dalam milidetik)

Signature dibuat dari kombinasi:

```
method + path + SHA256(body) + timestamp
```

Contoh yang akan di-hash:

```
POST/api/auth/login03ac674216f3e15c761ee1a5e255f067953623c8179c2514dba7f66fbaae67c8750912634177
```

> Catatan: `03ac6742...` adalah hasil SHA256 dari string `{"email":"a@a.com","password":"abc"}`

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
│   ├── config/
│   │   ├── db.js
│   │   └── redis.js
│   ├── controllers/
│   │   └── auth.controller.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   └── signature.middleware.js
│   ├── models/
│   │   └── user.model.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   └── index.js
│   └── utils/
├── app.js
├── server.js
├── .env
├── .env.example
├── .gitignore
├── API TEST.postman_collection.json
├── API TEST.postman_environment.json
├── package.json
├── package-lock.json
└── README.md
```

---

## ⚙️ Environment Variables

```env
PORT=3000
NODE_ENV=development
REDIS_URL=redis://localhost:6379
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=api_test
DB_USERNAME=root
DB_PASSWORD=
JWT_SECRET=
JWT_EXPIRES_IN=36000
BCRYPT_ROUNDS=10
SIGNATURE_KEY=
SIGNATURE_TIMELIMIT=60000
CONCURRENT_LOGIN=false
```

---

## 📦 Instalasi

```bash
git clone https://github.com/your-repo/project-auth-api.git
cd project-auth-api
npm install
```

---

### MySQL & Redis

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

```bash
redis-server
# atau via Docker
docker run -d --name redis -p 6379:6379 redis
redis-cli ping  # Output: PONG
```

---

## 🏃 Jalankan server

```bash
npm start
```

or 

```bash
pm2 start server.js -i max
```

---

## 📮 API Endpoint

| Method | URL                     | Auth | Deskripsi              |
| ------ | ----------------------- | ---- | ---------------------- |
| POST   | `/auth/register`        | ❌   | Register user baru     |
| POST   | `/auth/login`           | ❌   | Login & dapatkan token |
| POST   | `/auth/logout`          | ✅   | Logout & hapus token   |
| POST   | `/auth/change-password` | ✅   | Ganti password         |
| GET    | `/auth/profile`         | ✅   | Ambil profil user      |

Header:

```
Authorization: Bearer <access_token>
```

---

## 🔐 JWT + Redis (Allowlist)

- Token disimpan di Redis dengan format `jwt:<user_id>:<jti> = "allow"`
- Saat logout, key akan dihapus
- Hanya token yang masih ada di Redis yang valid

---

## 🔁 Tentang CONCURRENT_LOGIN

| Nilai   | Efek                               |
| ------- | ---------------------------------- |
| `false` | Login baru akan menimpa semua sesi |
| `true`  | Setiap sesi login bisa coexist     |

---

## 🧪 Debug Redis

```bash
redis-cli keys jwt:*
redis-cli get jwt:<user_id>:<jti>
redis-cli ttl jwt:<user_id>:<jti>
```

---

## 🧰 Teknologi

| Library      | Fungsi               |
| ------------ | -------------------- |
| express      | Routing & middleware |
| jsonwebtoken | JWT handling         |
| redis        | Store token          |
| bcrypt       | Password hashing     |
| uuid         | Generate jti         |
| mysql2       | DB Connection        |
| dotenv       | Env config           |

---

## 🧪 Signature Middleware (Node.js)

```js
const crypto = require("crypto");

const SIGNATURE_KEY = process.env.SIGNATURE_KEY || "default_secret";
const SIGNATURE_TIMELIMIT = parseInt(process.env.SIGNATURE_TIMELIMIT || "60000");

const verifySignature = (req, res, next) => {
  const signature = req.headers["x-signature"];
  const timestamp = req.headers["x-timestamp"];

  if (!signature || !timestamp) {
    return res.status(401).json({ error: "Missing signature or timestamp" });
  }

  const now = Date.now();
  const diff = Math.abs(now - Number(timestamp));
  if (diff > SIGNATURE_TIMELIMIT) {
    return res.status(401).json({ error: "Signature timestamp expired" });
  }

  const methodsWithBody = ["POST", "PUT", "PATCH", "DELETE"];
  let bodyString = "";
  let bodyHash = "";

  if (methodsWithBody.includes(req.method) && req.body && Object.keys(req.body).length > 0) {
    bodyString = JSON.stringify(req.body);
    bodyHash = crypto.createHash("sha256").update(bodyString).digest("hex");
  }

  const uri = req.originalUrl.split("?")[0];
  const dataToSign = req.method + uri + bodyHash + timestamp;
  const expectedSignature = crypto.createHmac("sha256", SIGNATURE_KEY).update(dataToSign).digest("hex");

  if (expectedSignature !== signature) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  next();
};
```

---

## 🧪 Postman Pre-request Script

```js
const SIGNATURE_KEY = pm.environment.get("SIGNATURE_KEY") || "default_secret";

const now = Date.now();
const dateProcessed = Math.trunc(now / 1e3);
const timestamp = 1e3 * dateProcessed + (dateProcessed % 997);

const fullUrl = pm.variables.replaceIn(pm.request.url.toString());
const path = new URL(fullUrl).pathname;

const methodsWithBody = ["POST", "PUT", "PATCH", "DELETE"];

let bodyString = "";
let bodyHash = "";

if (methodsWithBody.includes(pm.request.method)) {
  const raw = pm.request.body?.raw || "";
  try {
    const parsed = JSON.parse(raw);
    bodyString = JSON.stringify(parsed);
    const bodyBuffer = new TextEncoder().encode(bodyString);
    const hashBuffer = crypto.subtle.digest("SHA-256", bodyBuffer);
    bodyHash = await hashBuffer.then((buffer) =>
      Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );
  } catch (e) {
    console.warn("⚠️ Body parsing error, fallback to empty string.");
  }
}
console.log("bodyString:", bodyString);

const dataToSign = pm.request.method + path + bodyHash + timestamp;
console.log("🔐 dataToSign:", dataToSign);

const encoder = new TextEncoder();
const keyData = encoder.encode(SIGNATURE_KEY);
const data = encoder.encode(dataToSign);

crypto.subtle
  .importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  .then((key) => crypto.subtle.sign("HMAC", key, data))
  .then((signatureBuffer) => {
    const signatureHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    pm.request.headers.upsert({ key: "X-Signature", value: signatureHex });
    pm.request.headers.upsert({ key: "X-Timestamp", value: timestamp.toString() });

    console.log("✅ Signature generated:", signatureHex);
  });
```

---

## 📄 Lisensi

MIT — bebas digunakan & dikembangkan.

## 🤝 Kontribusi

Pull Request & feedback sangat disambut.
