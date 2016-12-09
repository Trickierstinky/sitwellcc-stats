var strava = require('strava-v3'),
    express = require('express');

var app = express();

app.set('view engine', 'ejs');

app.get('/', function(req, res) {
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
              'distance': memberStats.ytd_ride_totals.distance,
              'elevation': memberStats.ytd_ride_totals.elevation_gain,
              'hours': memberStats.ytd_ride_totals.moving_time,
              'biggest': memberStats.biggest_ride_distance,
              'highest': memberStats.biggest_climb_elevation_gain
            });

            res.render('members', {
              members: members
            });
          }
        });
      });
    }
  });
});

app.set('port', process.env.PORT || 5000);

app.listen(app.get('port'), function() {
  console.info('Express app started on ' + app.get('port'));
});
