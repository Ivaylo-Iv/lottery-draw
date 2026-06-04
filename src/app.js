const express = require("express");
const path = require("path");
const { getAll } = require("./database");
const { publicDir } = require("./config");
const { createSessionMiddleware } = require("./auth");
const { createAdminRouter } = require("./routes/admin");
const { createDrawRouter } = require("./routes/draw");

const sendHtml = (fileName) => (req, res) => {
  res.sendFile(path.join(publicDir, fileName));
};

function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(createSessionMiddleware());
  app.use(express.static(publicDir));

  app.get("/", sendHtml("index.html"));
  app.get("/admin", sendHtml("admin.html"));
  app.use("/api/admin", createAdminRouter());
  app.use("/api/draw", createDrawRouter());

  app.get("/api/numbers", async (req, res, next) => {
    try {
      const rows = await getAll(
        "SELECT id, number, active FROM lottery_numbers WHERE active = 1 ORDER BY number ASC",
      );

      res.json({
        numbers: rows.map((row) => ({
          id: row.id,
          number: row.number,
          active: row.active === 1,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  });

  return app;
}

module.exports = {
  createApp,
};
