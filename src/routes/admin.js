const express = require("express");
const bcrypt = require("bcryptjs");
const { db, getAll, getRow, runQuery } = require("../database");
const { requireAdmin, regenerateSession, saveSession } = require("../auth");

function toBoolean(value) {
  return value !== false && value !== "false";
}

function createAdminRouter() {
  const router = express.Router();

  router.get("/me", (req, res) => {
    if (!req.session.adminUser) {
      res.json({ authenticated: false });
      return;
    }

    res.json({ authenticated: true, user: req.session.adminUser });
  });

  router.post("/login", async (req, res, next) => {
    try {
      const username = String(req.body.username || "").trim();
      const password = String(req.body.password || "");

      if (!username || !password) {
        res.status(400).json({ message: "Username and password are required" });
        return;
      }

      const user = await getRow(
        "SELECT id, username, password_hash FROM users WHERE username = ?",
        [username],
      );

      if (!user) {
        res.status(401).json({ message: "Invalid username or password" });
        return;
      }

      const passwordMatches = await bcrypt.compare(
        password,
        user.password_hash,
      );

      if (!passwordMatches) {
        res.status(401).json({ message: "Invalid username or password" });
        return;
      }

      await regenerateSession(req);
      req.session.adminUser = { id: user.id, username: user.username };
      await saveSession(req);

      res.json({ authenticated: true, user: req.session.adminUser });
    } catch (error) {
      next(error);
    }
  });

  router.post("/logout", (req, res, next) => {
    req.session.destroy((err) => {
      if (err) {
        next(err);
        return;
      }

      res.clearCookie("connect.sid");
      res.json({ authenticated: false });
    });
  });

  router.get("/secure-check", requireAdmin, (req, res) => {
    res.json({ ok: true, user: req.session.adminUser });
  });

  router.get("/constraints", requireAdmin, async (req, res, next) => {
    try {
      const rows = await getAll(
        "SELECT id, max_number, active, created_at, updated_at FROM number_constraints ORDER BY active DESC, max_number ASC",
      );

      res.json({
        constraints: rows.map((row) => ({
          ...row,
          active: row.active === 1,
          maxNumber: String(row.max_number).padStart(6, "0"),
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/constraints", requireAdmin, async (req, res, next) => {
    try {
      const rawMaxNumber = String(req.body.maxNumber || "").trim();
      const active = toBoolean(req.body.active);

      if (!/^\d{6}$/.test(rawMaxNumber)) {
        res
          .status(400)
          .json({ message: "Enter a valid 6-digit maximum number." });
        return;
      }

      const maxNumber = Number(rawMaxNumber);

      await runQuery("BEGIN TRANSACTION");

      try {
        if (active) {
          await runQuery(
            "UPDATE number_constraints SET active = 0 WHERE active = 1",
          );
        }

        const result = await runQuery(
          "INSERT INTO number_constraints (max_number, active) VALUES (?, ?)",
          [maxNumber, active ? 1 : 0],
        );

        await runQuery("COMMIT");

        res
          .status(201)
          .json({ id: result.lastID, maxNumber: rawMaxNumber, active });
      } catch (transactionError) {
        await runQuery("ROLLBACK");
        throw transactionError;
      }
    } catch (error) {
      next(error);
    }
  });

  router.patch("/constraints/:id", requireAdmin, async (req, res, next) => {
    try {
      const constraintId = Number(req.params.id);
      const rawMaxNumber = String(req.body.maxNumber || "").trim();
      const active = toBoolean(req.body.active);

      if (!Number.isInteger(constraintId) || constraintId <= 0) {
        res.status(400).json({ message: "Invalid constraint id." });
        return;
      }

      if (!/^\d{6}$/.test(rawMaxNumber)) {
        res
          .status(400)
          .json({ message: "Enter a valid 6-digit maximum number." });
        return;
      }

      const maxNumber = Number(rawMaxNumber);
      const existingConstraint = await getRow(
        "SELECT id FROM number_constraints WHERE id = ?",
        [constraintId],
      );

      if (!existingConstraint) {
        res.status(404).json({ message: "Constraint not found." });
        return;
      }

      await runQuery("BEGIN TRANSACTION");

      try {
        if (active) {
          await runQuery(
            "UPDATE number_constraints SET active = 0 WHERE active = 1 AND id != ?",
            [constraintId],
          );
        }

        await runQuery(
          `UPDATE number_constraints
           SET max_number = ?, active = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [maxNumber, active ? 1 : 0, constraintId],
        );

        await runQuery("COMMIT");

        res.json({ id: constraintId, maxNumber: rawMaxNumber, active });
      } catch (transactionError) {
        await runQuery("ROLLBACK");
        throw transactionError;
      }
    } catch (error) {
      next(error);
    }
  });

  router.get("/numbers", requireAdmin, async (req, res, next) => {
    try {
      const rows = await getAll(
        "SELECT id, number, drawn, active, created_at FROM lottery_numbers ORDER BY active DESC, number ASC",
      );

      res.json({
        numbers: rows.map((row) => ({ ...row, drawn: row.drawn === 1 })),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/numbers", requireAdmin, async (req, res, next) => {
    try {
      const mode = String(req.body.mode || "single");
      const rawNumber = String(req.body.number || "").trim();
      const rawStartNumber = String(req.body.startNumber || "").trim();
      const rawEndNumber = String(req.body.endNumber || "").trim();
      const numbersToInsert = [];

      const isSixDigitNumber = (value) => /^\d{6}$/.test(value);

      if (mode === "single") {
        if (!isSixDigitNumber(rawNumber)) {
          res.status(400).json({ message: "Enter a valid 6-digit number." });
          return;
        }

        numbersToInsert.push(rawNumber);
      } else if (mode === "range") {
        if (
          !isSixDigitNumber(rawStartNumber) ||
          !isSixDigitNumber(rawEndNumber)
        ) {
          res
            .status(400)
            .json({ message: "Enter a valid 6-digit start and end number." });
          return;
        }

        const startNumber = Number(rawStartNumber);
        const endNumber = Number(rawEndNumber);

        if (startNumber > endNumber) {
          res.status(400).json({
            message: "Start number must be less than or equal to end number.",
          });
          return;
        }

        for (let current = startNumber; current <= endNumber; current += 1) {
          numbersToInsert.push(String(current).padStart(6, "0"));
        }
      } else {
        res.status(400).json({ message: "Invalid insert mode." });
        return;
      }

      let insertedCount = 0;
      let skippedCount = 0;

      await runQuery("BEGIN TRANSACTION");

      try {
        for (const number of numbersToInsert) {
          const result = await runQuery(
            "INSERT OR IGNORE INTO lottery_numbers (number, drawn, active) VALUES (?, 0, 1)",
            [number],
          );

          if (result.changes > 0) {
            insertedCount += 1;
          } else {
            skippedCount += 1;
          }
        }

        await runQuery("COMMIT");
      } catch (transactionError) {
        await runQuery("ROLLBACK");
        throw transactionError;
      }

      res.json({
        insertedCount,
        skippedCount,
        totalRequested: numbersToInsert.length,
      });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/numbers/:id", requireAdmin, async (req, res, next) => {
    try {
      const numberId = Number(req.params.id);
      const active = toBoolean(req.body.active);

      if (!Number.isInteger(numberId) || numberId <= 0) {
        res.status(400).json({ message: "Invalid number id." });
        return;
      }

      const existingNumber = await getRow(
        "SELECT id FROM lottery_numbers WHERE id = ?",
        [numberId],
      );

      if (!existingNumber) {
        res.status(404).json({ message: "Number not found." });
        return;
      }

      await runQuery(
        `UPDATE lottery_numbers
         SET active = ?, drawn = drawn
         WHERE id = ?`,
        [active ? 1 : 0, numberId],
      );

      res.json({ id: numberId, active });
    } catch (error) {
      next(error);
    }
  });

  router.post("/numbers/reset-drawn", requireAdmin, async (req, res, next) => {
    try {
      await runQuery("UPDATE lottery_numbers SET drawn = 0");

      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/numbers", requireAdmin, async (req, res, next) => {
    try {
      await runQuery("DELETE FROM lottery_numbers");

      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createAdminRouter,
};
