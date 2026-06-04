const express = require("express");
const { getAll, getRow, runQuery } = require("../database");
const { requireAdmin } = require("../auth");

function buildConstraintFilter(activeConstraint) {
  if (!activeConstraint) {
    return {
      clause: "",
      params: [],
    };
  }

  return {
    clause: " AND CAST(number AS INTEGER) <= ?",
    params: [activeConstraint.max_number],
  };
}

async function getDrawState() {
  const activeConstraint = await getRow(
    "SELECT id, max_number, active, created_at, updated_at FROM number_constraints WHERE active = 1 ORDER BY updated_at DESC, id DESC LIMIT 1",
  );

  const filter = buildConstraintFilter(activeConstraint);
  const activeNumbers = await getAll(
    `SELECT id, number, drawn, active FROM lottery_numbers WHERE active = 1${filter.clause} ORDER BY number ASC`,
    filter.params,
  );

  const remainingNumbers = activeNumbers.filter((number) => number.drawn === 0);

  return {
    activeConstraint: activeConstraint
      ? {
          id: activeConstraint.id,
          maxNumber: String(activeConstraint.max_number).padStart(6, "0"),
        }
      : null,
    totalPossible: activeNumbers.length,
    remainingPossible: remainingNumbers.length,
    numbers: remainingNumbers.map((number) => ({
      id: number.id,
      number: number.number,
    })),
  };
}

function createDrawRouter() {
  const router = express.Router();

  router.get("/status", async (req, res, next) => {
    try {
      const drawState = await getDrawState();

      res.json({
        authenticated: Boolean(req.session.adminUser),
        ...drawState,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/next", requireAdmin, async (req, res, next) => {
    try {
      await runQuery("BEGIN IMMEDIATE TRANSACTION");

      try {
        const drawState = await getDrawState();

        if (!drawState.remainingPossible) {
          await runQuery("ROLLBACK");
          res.status(409).json({
            message: "No more numbers left to draw.",
            totalPossible: drawState.totalPossible,
            remainingPossible: 0,
            activeConstraint: drawState.activeConstraint,
          });
          return;
        }

        const selectedIndex = Math.floor(
          Math.random() * drawState.remainingPossible,
        );
        const selectedNumber = drawState.numbers[selectedIndex];

        await runQuery("UPDATE lottery_numbers SET drawn = 1 WHERE id = ?", [
          selectedNumber.id,
        ]);

        await runQuery("COMMIT");

        res.json({
          id: selectedNumber.id,
          number: selectedNumber.number,
          totalPossible: drawState.totalPossible,
          remainingPossible: drawState.remainingPossible - 1,
          activeConstraint: drawState.activeConstraint,
        });
      } catch (transactionError) {
        await runQuery("ROLLBACK");
        throw transactionError;
      }
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createDrawRouter,
};
