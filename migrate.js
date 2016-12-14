const sqlite3 = require('sqlite3').verbose();

var db = new sqlite3.Database('sitwellccstats.db');

db.serialize(function() {
  db.run("CREATE TABLE members (accessToken TEXT, UNIQUE(accessToken))");
});

db.close();