const session = require("express-session");
const SQLiteStoreFactory = require("connect-sqlite3")(session);
const { dataDir, sessionSecret } = require("./config");

const sessionStore = new SQLiteStoreFactory({
  db: "lottery.sqlite",
  dir: dataDir,
  table: "sessions",
});

function createSessionMiddleware() {
  return session({
    store: sessionStore,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  });
}

const requireAdmin = (req, res, next) => {
  if (req.session.adminUser) {
    next();
    return;
  }

  res.status(401).json({ message: "Unauthorized" });
};

const regenerateSession = (req) =>
  new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });

const saveSession = (req) =>
  new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });

module.exports = {
  createSessionMiddleware,
  requireAdmin,
  regenerateSession,
  saveSession,
};
