const express = require('express')
    , cookieParser = require('cookie-parser')
    , bodyParser = require('body-parser')
    , methodOverride = require('method-override')
    , session = require('express-session')
    , serveStatic = require('serve-static')
    , expressLayouts = require('express-ejs-layouts')
    , passport = require('passport')
    , util = require('util')
    , StravaStrategy = require('passport-strava-oauth2').Strategy
    , request = require('request')
    , dotenv = require('dotenv').config()
    , sqlite3 = require('sqlite3').verbose()
    , async = require('async');

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(new StravaStrategy({
    clientID: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    callbackURL: process.env.STRAVA_CALLBACK_URL
  },
  (accessToken, refreshToken, profile, done) => {

    process.nextTick(function () {

      const options = {
        url: 'https://www.strava.com/api/v3/clubs/93874/members',
        headers: {
          'Authorization': `Bearer ${profile.token}`
        }
      };

      request(options, (error, response, data) => {
        if (!error && response.statusCode == 200) {
          const members = [];

          JSON.parse(response.body).forEach((member) => {
            members.push(member.id);
          });

          const profileId = (object) => {
            return object = profile.id;
          };

          if (members.find(profileId)) {
            const db = new sqlite3.Database('sitwellccstats.db');

            db.serialize(function() {
              db.run(`INSERT OR IGNORE INTO members(accessToken, userID) VALUES ('${profile.token}', '${profile.id}');`);
            });

            db.close();

            return done(null, profile);
          }
        } else {
          res.render('index');
        }
      });
    });
  }
));

const app = express();

// configure Express
app.set('view engine', 'ejs');
app.set('layout', 'layouts/application');
app.use(expressLayouts);

app.use(cookieParser());
app.use(bodyParser());
app.use(methodOverride());
app.use(session({ secret: 'keyboard cat' }));
app.use(passport.initialize());
app.use(passport.session());
app.use(serveStatic(__dirname + '/public'));

app.get('/', (req, res) => {
  res.render('index', { user: req.user });
});

app.get('/login', (req, res) => {
  res.render('login', { user: req.user });
});

const memberStats = (req, res, next) => {
  const memberStats = []
      , db = new sqlite3.Database('sitwellccstats.db');

  db.all('SELECT accessToken FROM members', (err, rows) => {
    fetchData(rows, (memberStats) =>{
      db.close(() => {
        req.memberStats = memberStats
        next();
      });
    });
  });

};

app.get('/stats', ensureAuthenticated, memberStats);
app.get('/stats', ensureAuthenticated, (req, res) => {
  var totalClubDistance = req.memberStats.sum('distance');

  var filteredStats = req.memberStats.sort(dynamicSort('distance'));

 logPositions(filteredStats, (filteredStats) =>{
  //console.log(filteredStats);
  res.render('stats', {
    user: req.user,
    members: filteredStats,
    totalClubDistance: totalClubDistance
  });
 });
});

app.get('/auth/strava', passport.authenticate('strava', { scope: ['public'] }), (req, res) => {

});

app.get('/auth/strava/callback', passport.authenticate('strava', { failureRedirect: '/login' }), (req, res) => {
  res.redirect('/');
});

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

app.set('port', process.env.PORT || 5000);

app.listen(app.get('port'), () => {
  console.info('Express app started on ' + app.get('port'));
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}

function httpGet(token, callback){
  const athleteOptions = {
    url: 'https://www.strava.com/api/v3/athlete',
    headers: {
      'Authorization': `Bearer ${token.accessToken}`
    }
  };

  request(athleteOptions, (err, response, data) => {
    const member = JSON.parse(response.body);

    const athleteStatOptions = {
      url: `https://www.strava.com/api/v3/athletes/${member.id}/stats`,
      headers: {
        'Authorization': `Bearer ${token.accessToken}`
      }
    };

    request(athleteStatOptions, (err, response, data) => {
      const db = new sqlite3.Database('sitwellccstats.db');

      const memberStats = JSON.parse(response.body);


      db.get(`SELECT * from members where userID = '${member.id}'`, (err, row) => {

        callback(err, {
          'photo': member.profile,
          'id': member.id,
          'name': `${member.firstname}`,
          'rides': memberStats.ytd_ride_totals.count,
          'distance': Math.round((memberStats.ytd_ride_totals.distance * 0.00062137) * 100) / 100, // mi = m * 0.00062137 from http://www.metric-conversions.org/length/meters-to-miles.htm
          'elevation': Math.round((memberStats.ytd_ride_totals.elevation_gain * 3.2808) * 100) / 100, // ft = m * 3.2808 from http://www.metric-conversions.org/length/meters-to-feet.htm
          'hours': Math.round((memberStats.ytd_ride_totals.moving_time * 0.00027778) * 100) / 100, // hr = s * 0.00027778 from http://www.metric-conversions.org/time/seconds-to-hour.htm
          'avSpeed': Math.round(((memberStats.ytd_ride_totals.distance * 0.00062137) / (memberStats.ytd_ride_totals.moving_time * 0.00027778)) * 100) /100,
          'longest': Math.round(memberStats.biggest_ride_distance * 0.00062137),
          'highest': Math.round(memberStats.biggest_climb_elevation_gain  * 3.2808),
          'currentPosition' : row.currentPosition,
          'lastPosition' : row.lastPosition
        });
      })
    });
  });
}


function fetchData(tokens, callback) {
  var count = 0;

  async.map(tokens, httpGet, (err, res) =>{
    if (err) return console.log(err);
    if (callback && typeof(callback) === "function") {
      callback(res);
    }
    else {
      return res;
    }
  });
}

var dynamicSort = (property) => {
  var sortOrder = 1;

  if(property[0] === "-") {
    sortOrder = -1;
    property = property.substr(1);
  }

  return (a,b) => {
    var result = (a[property] > b[property]) ? -1 : (a[property] < b[property]) ? 1 : 0;
      return result * sortOrder;
  };
};


// Matt added 15th

Array.prototype.sum = function (prop) {
    var total = 0
    for ( var i = 0, _len = this.length; i < _len; i++ ) {
        total += this[i][prop]
    }
    return total
}


// Matt added 19th

function logPositions(member, callback) {
  const db = new sqlite3.Database('sitwellccstats.db');
  //console.log(member);
  var stmt = db.prepare("UPDATE members SET currentPosition = $index, lastPosition = (SELECT currentPosition FROM members WHERE userID = $id ) WHERE userID = $id;");
  for ( var i = 0, _len = member.length; i < _len; i++ ) {
    if ( i+1 !=  member[i].currentPosition || (member[i].lastPosition == 0 || member[i].currentPosition == 0 )){
      stmt.run({$index: i,
                $id: member[i].id.toString()});
    }
  }

  stmt.finalize(callback(member));
}

