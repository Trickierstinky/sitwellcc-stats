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
              'distance': Math.round((memberStats.ytd_ride_totals.distance * 0.00062137) * 100) / 100, // mi = m * 0.00062137 from http://www.metric-conversions.org/length/meters-to-miles.htm
              'elevation': Math.round((memberStats.ytd_ride_totals.elevation_gain * 0.00062137) * 100) / 100,
              'hours': Math.round((memberStats.ytd_ride_totals.moving_time * 0.00027778) * 100) / 100, // hr = s * 0.00027778 from http://www.metric-conversions.org/time/seconds-to-hour.htm
              'avSpeed': Math.round(((memberStats.ytd_ride_totals.distance * 0.00062137) / (memberStats.ytd_ride_totals.moving_time * 0.00027778)) * 100) /100,
              'biggest': Math.round(memberStats.biggest_ride_distance * 0.00062137),
              'highest': Math.round(memberStats.biggest_climb_elevation_gain * 0.00062137)
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
