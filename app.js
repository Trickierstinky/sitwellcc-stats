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
    , sqlite3 = require('sqlite3').verbose();

var db = new sqlite3.Database('sitwellccstats.db');

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new StravaStrategy({
    clientID: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    callbackURL: process.env.STRAVA_CALLBACK_URL
  },
  function(accessToken, refreshToken, profile, done) {

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

          JSON.parse(response.body).forEach(function(member) {
            members.push(member.id);
          });

          const profileId = (object) => {
            return object = profile.id;
          };

          if (members.find(profileId)) {

            db.serialize(function() {
              db.run(`INSERT INTO members VALUES ('${profile.token}')`);
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

app.get('/', function(req, res){
  res.render('index', { user: req.user });
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});

app.get('/stats', ensureAuthenticated, function(req, res) {

  const members = []
      , accessTokens = [];

  db.each('SELECT * FROM members', function(err, row) {
    console.log(row);
  });

  // stravaProfile.forEach(function(profile) {
  //   // console.log(profile);

  //   const options = {
  //     url: 'https://www.strava.com/api/v3/athlete',
  //     headers: {
  //       'Authorization': `Bearer ${profile.token}`
  //     }
  //   };

  //   request(options, (error, response, data) => {    
  //     if (!error && response.statusCode == 200) {
  //       //console.log(response);

  //       const member = JSON.parse(response.body);

  //       console.log(member.id);

  //       members.push({
  //         'id': member.id, 
  //         'name': `${member.firstname} ${member.lastname.charAt(0)}`
  //         // 'rides': memberStats.ytd_ride_totals.count,
  //         // 'distance': Math.round((memberStats.ytd_ride_totals.distance * 0.00062137) * 100) / 100, // mi = m * 0.00062137 from http://www.metric-conversions.org/length/meters-to-miles.htm
  //         // 'elevation': Math.round((memberStats.ytd_ride_totals.elevation_gain * 3.2808) * 100) / 100, // ft = m * 3.2808 from http://www.metric-conversions.org/length/meters-to-feet.htm
  //         // 'hours': Math.round((memberStats.ytd_ride_totals.moving_time * 0.00027778) * 100) / 100, // hr = s * 0.00027778 from http://www.metric-conversions.org/time/seconds-to-hour.htm
  //         // 'avSpeed': Math.round(((memberStats.ytd_ride_totals.distance * 0.00062137) / (memberStats.ytd_ride_totals.moving_time * 0.00027778)) * 100) /100,
  //         // 'biggest': Math.round(memberStats.biggest_ride_distance * 0.00062137),
  //         // 'highest': Math.round(memberStats.biggest_climb_elevation_gain  * 3.2808)
  //       });

  //       // res.render('stats', {
  //       //   user: req.user,
  //       //   members: members
  //       // });
  //     }
  //   });
  // });

  // curl -G https://www.strava.com/api/v3/athlete -H "Authorization: Bearer c3e0665cae3ce31a0544e57b4026981e990314b7"
});

app.get('/auth/strava', passport.authenticate('strava', { scope: ['public'] }), function(req, res) {

});

app.get('/auth/strava/callback', passport.authenticate('strava', { failureRedirect: '/login' }), function(req, res) {
  res.redirect('/');
});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.set('port', process.env.PORT || 5000);

app.listen(app.get('port'), function() {
  console.info('Express app started on ' + app.get('port'));
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}
