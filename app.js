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
  , dotenv = require('dotenv').config();


// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Strava profile is
//   serialized and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

var stravaProfile = [];

// Use the StravaStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Strava
//   profile), and invoke a callback with a user object.
passport.use(new StravaStrategy({
    clientID: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    callbackURL: process.env.STRAVA_CALLBACK_URL
  },
  function(accessToken, refreshToken, profile, done) {
    
    // console.log(`Strava profile: ${profile.id}, Strava token ${profile.token}`);
    stravaProfile.push({
      'id': profile.id,
      'token': profile.token
    });

    process.nextTick(function () {
      
      // To keep the example simple, the user's Strava profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Strava account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
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
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
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

// app.get('/stats', ensureAuthenticated, function(req, res) {
//   strava.clubs.listMembers({id:93874}, function(err, clubMembers) {
//     if(!err) {
//       const members = [];
//       clubMembers.forEach(function(member) {
//         strava.athletes.stats({id:member.id}, function(err, memberStats) {
//           //console.log(memberStats);
//           if(!err && memberStats.message == null) {
//             members.push({
//               'id': member.id, 
//               'name': `${member.firstname} ${member.lastname.charAt(0)}`, 
//               'rides': memberStats.ytd_ride_totals.count,
//               'distance': Math.round((memberStats.ytd_ride_totals.distance * 0.00062137) * 100) / 100, // mi = m * 0.00062137 from http://www.metric-conversions.org/length/meters-to-miles.htm
//               'elevation': Math.round((memberStats.ytd_ride_totals.elevation_gain * 3.2808) * 100) / 100, // ft = m * 3.2808 from http://www.metric-conversions.org/length/meters-to-feet.htm
//               'hours': Math.round((memberStats.ytd_ride_totals.moving_time * 0.00027778) * 100) / 100, // hr = s * 0.00027778 from http://www.metric-conversions.org/time/seconds-to-hour.htm
//               'avSpeed': Math.round(((memberStats.ytd_ride_totals.distance * 0.00062137) / (memberStats.ytd_ride_totals.moving_time * 0.00027778)) * 100) /100,
//               'biggest': Math.round(memberStats.biggest_ride_distance * 0.00062137),
//               'highest': Math.round(memberStats.biggest_climb_elevation_gain  * 3.2808)
//             });

//             res.render('stats', {
//               user: req.user,
//               members: members
//             });
//           }
//         });
//       });
//     }
//   });
// });

app.get('/stats', ensureAuthenticated, function(req, res) {

  const members = [];

  stravaProfile.forEach(function(profile) {
    // console.log(profile);

    const options = {
      url: 'https://www.strava.com/api/v3/athlete',
      headers: {
        'Authorization': `Bearer ${profile.token}`
      }
    };

    request(options, (error, response, data) => {    
      if (!error && response.statusCode == 200) {
        //console.log(response);

        const member = JSON.parse(response.body);

        console.log(member.id);

        members.push({
          'id': member.id, 
          'name': `${member.firstname} ${member.lastname.charAt(0)}`
          // 'rides': memberStats.ytd_ride_totals.count,
          // 'distance': Math.round((memberStats.ytd_ride_totals.distance * 0.00062137) * 100) / 100, // mi = m * 0.00062137 from http://www.metric-conversions.org/length/meters-to-miles.htm
          // 'elevation': Math.round((memberStats.ytd_ride_totals.elevation_gain * 3.2808) * 100) / 100, // ft = m * 3.2808 from http://www.metric-conversions.org/length/meters-to-feet.htm
          // 'hours': Math.round((memberStats.ytd_ride_totals.moving_time * 0.00027778) * 100) / 100, // hr = s * 0.00027778 from http://www.metric-conversions.org/time/seconds-to-hour.htm
          // 'avSpeed': Math.round(((memberStats.ytd_ride_totals.distance * 0.00062137) / (memberStats.ytd_ride_totals.moving_time * 0.00027778)) * 100) /100,
          // 'biggest': Math.round(memberStats.biggest_ride_distance * 0.00062137),
          // 'highest': Math.round(memberStats.biggest_climb_elevation_gain  * 3.2808)
        });

        res.render('stats', {
          user: req.user,
          members: members
        });
      }
    });
  });

  // curl -G https://www.strava.com/api/v3/athlete -H "Authorization: Bearer c3e0665cae3ce31a0544e57b4026981e990314b7"
});

// GET /auth/strava
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Strava authentication will involve
//   redirecting the user to strava.com.  After authorization, Strava
//   will redirect the user back to this application at /auth/strava/callback
app.get('/auth/strava',
  passport.authenticate('strava', { scope: ['public'] }),
  function(req, res){
    // The request will be redirected to Strava for authentication, so this
    // function will not be called.
  });

// GET /auth/strava/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/strava/callback', 
  passport.authenticate('strava', { failureRedirect: '/login' }),
  function(req, res) {
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

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}
