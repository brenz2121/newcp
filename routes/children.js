const router = require("express").Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

const tokenOptions = {
  algorithms: ["HS256"],
  issuer: "toiletcare",
  audience: "toiletcare-web",
};

// Middleware autentikasi
async function authenticate(req, res, next) {
  const authorization = req.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Silakan login terlebih dahulu."
    });
  }

  try {
    const payload = jwt.verify(
      authorization.slice(7),
      process.env.JWT_SECRET,
      tokenOptions
    );

    req.userId = payload.user_id;
    next();
  } catch (err) {
    return res.status(401).json({
      message: "Sesi tidak valid. Silakan login kembali."
    });
  }
}

// Menambahkan data anak
router.post("/", authenticate, async (req, res) => {
  try {
    const { full_name, age, gender } = req.body;

    if (
      typeof full_name !== "string" ||
      !full_name.trim() ||
      !Number.isInteger(Number(age)) ||
      Number(age) < 0 ||
      Number(age) > 18 ||
      !["Laki-laki", "Perempuan"].includes(gender)
    ) {
      return res.status(400).json({
        message: "Data anak tidak valid."
      });
    }

    const [result] = await db.execute(
      `INSERT INTO children
       (parent_id, full_name, age, gender)
       VALUES (?, ?, ?, ?)`,
      [req.userId, full_name.trim(), Number(age), gender]
    );

    res.status(201).json({
      message: "Data anak berhasil disimpan.",
      child_id: result.insertId
    });

  } catch (err) {
    console.error("Tambah anak gagal:", err);
    res.status(500).json({
      message: "Gagal menyimpan data anak."
    });
  }
});

// Mengambil data anak milik orang tua yang login
router.get("/", authenticate, async (req, res) => {
  try {
    const [children] = await db.execute(
      `SELECT child_id, full_name, age, gender
       FROM children
       WHERE parent_id = ?
       ORDER BY child_id DESC`,
      [req.userId]
    );

    res.json({ children });

  } catch (err) {
    console.error("Ambil data anak gagal:", err);
    res.status(500).json({
      message: "Gagal mengambil data anak."
    });
  }
});

module.exports = router;