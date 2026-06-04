const { createApp } = require("./src/app");
const { initializeDatabase } = require("./src/database");

const port = process.env.PORT || 3000;

initializeDatabase()
  .then(() => {
    const app = createApp();

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
