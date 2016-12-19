const sqlite3 = require('sqlite3').verbose();

var db = new sqlite3.Database('sitwellccstats.db');

db.serialize(function() {
  db.run("CREATE TABLE IF NOT EXISTS members (accessToken TEXT, UNIQUE(accessToken))");
});

db.serialize(function() {
  db.run("ALTER TABLE members ADD userID TEXT;");
  db.run("ALTER TABLE members ADD lastPosition INTEGER;");
  db.run("ALTER TABLE members ADD currentPosition INTEGER;");
})

db.close();
