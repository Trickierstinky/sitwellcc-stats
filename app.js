var express = require('express')
  , passport = require('passport')
  , util = require('util')
  , StravaStrategy = require('passport-strava-oauth2').Strategy
  , strava = require('strava-v3');

var STRAVA_CLIENT_ID = '11500'; //process.env.STRAVA_CLIENT_ID
var STRAVA_CLIENT_SECRET = '0ca2010a57ae2ec5d77c1486e151b4571d00dd7e'; //process.env.STRAVA_CLIENT_SECRET


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


// Use the StravaStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Strava
//   profile), and invoke a callback with a user object.
passport.use(new StravaStrategy({
    clientID: STRAVA_CLIENT_ID,
    clientSecret: STRAVA_CLIENT_SECRET,
    callbackURL: "http://127.0.0.1:3000/auth/strava/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's Strava profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Strava account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));




var app = express.createServer();

// configure Express
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'keyboard cat' }));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});


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
  strava.clubs.listMembers({id:93874}, function(err, clubMembers) {
    if(!err) {
      const members = [];
      clubMembers.forEach(function(member) {
        strava.athletes.stats({id:member.id}, function(err, memberStats) {
          //console.log(memberStats);
          if(!err && memberStats.message == null) {
            members.push({
              'id': member.id, 
              'name': `${member.firstname} ${member.lastname.charAt(0)}`, 
              'rides': memberStats.ytd_ride_totals.count,
              'distance': Math.round((memberStats.ytd_ride_totals.distance * 0.00062137) * 100) / 100, // mi = m * 0.00062137 from http://www.metric-conversions.org/length/meters-to-miles.htm
              'elevation': Math.round((memberStats.ytd_ride_totals.elevation_gain * 3.2808) * 100) / 100, // ft = m * 3.2808 from http://www.metric-conversions.org/length/meters-to-feet.htm
              'hours': Math.round((memberStats.ytd_ride_totals.moving_time * 0.00027778) * 100) / 100, // hr = s * 0.00027778 from http://www.metric-conversions.org/time/seconds-to-hour.htm
              'avSpeed': Math.round(((memberStats.ytd_ride_totals.distance * 0.00062137) / (memberStats.ytd_ride_totals.moving_time * 0.00027778)) * 100) /100,
              'biggest': Math.round(memberStats.biggest_ride_distance * 0.00062137),
              'highest': Math.round(memberStats.biggest_climb_elevation_gain  * 3.2808)
            });

            res.render('stats', {
              user: req.user,
              members: members
            });
          }
        });
      });
    }
  });
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

app.listen(3000);


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}
