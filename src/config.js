const path = require("path");

const rootDir = path.join(__dirname, "..");

process.env.ADMIN_USERNAME ||= "fgc-admin";
process.env.ADMIN_PASSWORD ||= "fgc-admin-1qaz!QAZ";

module.exports = {
  rootDir,
  publicDir: path.join(rootDir, "public"),
  dataDir: path.join(rootDir, "data"),
  dbFile: path.join(rootDir, "data", "lottery.sqlite"),
  bootstrapAdminUsername: process.env.ADMIN_USERNAME,
  bootstrapAdminPassword: process.env.ADMIN_PASSWORD,
  sessionSecret: process.env.SESSION_SECRET || "lottery-draw-admin-session",
};
