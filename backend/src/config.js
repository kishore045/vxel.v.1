require("dotenv").config();

module.exports = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "dev_only_change_this_secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  clientOrigin: process.env.CLIENT_ORIGIN || "*",
  databasePath: process.env.DATABASE_PATH || "./data/vixelry-crm.sqlite"
};
