const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();

// Menggunakan CORS untuk mengizinkan permintaan dari localhost:3000
app.use(cors({ origin: 'http://localhost:3000' }));

const db = new sqlite3.Database('./db.sqlite');

// Membuat tabel untuk menyimpan metadata file
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL
  )`);
});

// Konfigurasi Multer untuk penyimpanan file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const filename = `${Date.now()}-${file.originalname}`;
    cb(null, filename);
  }
});

const upload = multer({ storage: storage });

// Endpoint untuk mengunggah dokumen
app.post('/upload', upload.single('document'), (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: 'Tidak ada dokumen yang diunggah.' });
  }

  const filepath = path.join(__dirname, 'uploads', file.filename);
  const fileId = uuidv4();

  db.run(`INSERT INTO files (id, filename, filepath) VALUES (?, ?, ?)`, [fileId, file.filename, filepath], function (err) {
    if (err) {
      return res.status(500).json({ message: 'Gagal menyimpan metadata file.', error: err.message });
    }

    res.status(200).json({
      message: 'Dokumen berhasil diunggah!',
      fileId: fileId
    });
  });
});

// Endpoint untuk mendapatkan file berdasarkan ID
app.get('/upload/:id', (req, res) => {
  const fileId = req.params.id;

  db.get(`SELECT * FROM files WHERE id = ?`, [fileId], (err, row) => {
    if (err) {
      return res.status(500).json({ message: 'Gagal mengambil file.', error: err.message });
    }

    if (!row) {
      return res.status(404).json({ message: 'File tidak ditemukan.' });
    }

    res.download(row.filepath, row.filename);
  });
});

// Endpoint untuk menghapus file berdasarkan ID
app.delete('/upload/:id', (req, res) => {
  const fileId = req.params.id;

  db.get(`SELECT * FROM files WHERE id = ?`, [fileId], (err, row) => {
    if (err) {
      return res.status(500).json({ message: 'Gagal menghapus file.', error: err.message });
    }

    if (!row) {
      return res.status(404).json({ message: 'File tidak ditemukan.' });
    }

    fs.unlink(row.filepath, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Gagal menghapus file di sistem.', error: err.message });
      }

      db.run(`DELETE FROM files WHERE id = ?`, [fileId], (err) => {
        if (err) {
          return res.status(500).json({ message: 'Gagal menghapus metadata file.', error: err.message });
        }

        res.status(200).json({ message: 'File berhasil dihapus.' });
      });
    });
  });
});

// Endpoint untuk menghapus semua file
app.delete('/upload', (req, res) => {
  db.all(`SELECT * FROM files`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Gagal mengambil file.', error: err.message });
    }

    const promises = rows.map((row) => {
      return new Promise((resolve, reject) => {
        fs.unlink(row.filepath, (err) => {
          if (err) {
            return reject(err);
          }

          db.run(`DELETE FROM files WHERE id = ?`, [row.id], (err) => {
            if (err) {
              return reject(err);
            }
            resolve();
          });
        });
      });
    });

    Promise.all(promises)
      .then(() => {
        res.status(200).json({ message: 'Semua file berhasil dihapus.' });
      })
      .catch((error) => {
        res.status(500).json({ message: 'Gagal menghapus file.', error: error.message });
      });
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
