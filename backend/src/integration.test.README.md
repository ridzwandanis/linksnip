# Integration Tests - README

## Overview

Integration tests untuk URL Shortener telah dibuat di `src/integration.test.js`. Tests ini memverifikasi end-to-end functionality dengan menggunakan database MongoDB yang sebenarnya.

## Prerequisites

**PENTING**: MongoDB harus berjalan sebelum menjalankan integration tests.

### Menjalankan MongoDB

Jika menggunakan Docker Desktop:

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

Atau pastikan MongoDB container sudah running di Docker Desktop.

### Verifikasi Koneksi

Pastikan MongoDB dapat diakses di:

```
mongodb://localhost:27017
```

## Menjalankan Tests

```bash
# Jalankan semua integration tests
npm test -- src/integration.test.js

# Atau jalankan semua tests termasuk integration
npm test
```

## Test Coverage

### Task 11.1: End-to-end URL Shortening Flow

- ✅ Create short URL via API
- ✅ Verify database storage
- ✅ Access short URL and verify redirect
- ✅ Check click counter increment
- ✅ Handle multiple URLs with separate counters
- ✅ Retrieve URL info with correct metadata
- ✅ Delete URL and verify inaccessibility

### Task 11.2: Error Scenarios

- ✅ Reject invalid URL formats
- ✅ Reject URLs exceeding maximum length (2048 chars)
- ✅ Return 404 for non-existent short codes
- ✅ Return standardized error responses
- ✅ Handle missing request body
- ✅ Handle malformed JSON

### Task 11.3: Data Persistence (Property-Based Test)

- ✅ Property 11: Data persistence across restarts
  - Validates Requirements 6.2
  - Tests that URL mappings persist in database
  - Runs 100 iterations with random data
  - Verifies data integrity after simulated restarts

## Troubleshooting

### Error: "Client must be connected before running operations"

**Penyebab**: MongoDB tidak berjalan atau tidak dapat diakses.

**Solusi**:

1. Pastikan MongoDB container berjalan di Docker Desktop
2. Cek koneksi dengan: `docker ps | findstr mongo`
3. Start MongoDB jika belum berjalan
4. Verifikasi port 27017 tidak digunakan aplikasi lain

### Tests Timeout

Jika tests timeout, tingkatkan timeout di `jest.config.js`:

```javascript
testTimeout: 30000, // 30 seconds
```

## Database Cleanup

Integration tests secara otomatis:

- Membersihkan database sebelum setiap test (`beforeEach`)
- Membersihkan database setelah semua tests selesai (`afterAll`)
- Menggunakan database terpisah: `url-shortener-test`

## Notes

- Tests menggunakan database `url-shortener-test` untuk menghindari konflik dengan development database
- Property-based tests menggunakan `fast-check` library dengan 100 iterations
- Semua tests menggunakan real MongoDB connection (bukan in-memory)
- Tests dapat dijalankan secara parallel dengan `--runInBand` flag untuk konsistensi
