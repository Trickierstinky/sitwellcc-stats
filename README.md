# Strava stats for the Sitwell Cycling Club

## To use

1. `git clone git@github.com:colouringcode/sitwellcc-stats.git`
2. `cd sitwellcc-stats`
3. `yarn install`
4. `cp .env{.example,}`
5. Edit the *XXX* values in `.env`
6. `node migrate.js` to set up the DB
7. `nodemon app.js`
8. App will be running at `http://localhost:5000` unless you've changed the port in `.env`
