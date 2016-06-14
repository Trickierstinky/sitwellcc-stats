var strava = require('strava-v3'),
    express = require('express');

var app = express();

app.set('view engine', 'ejs');

app.get('/', function (req, res) {
  strava.athlete.listActivities({id:627105},function(err, activities) {
    if(!err) {
      res.render('index', {
        activities: activities
      });
    }
  });
});

app.get('/:id', function(req, res) {
  strava.streams.activity({id: req.params.id, types: ['time', 'altitude', 'heartrate', 'cadence', 'watts'], resolution: 'high'},function(err, activity) {
    if(!err) {
      res.render('activities', {
        activity: activity
      });
    }
  });
});

app.get('/raw/:id', function(req, res) {
  strava.streams.activity({id: req.params.id, types: ['time', 'altitude', 'heartrate', 'cadence', 'watts'], resolution: 'high'},function(err, activity) {
    if(!err) {
      res.send(activity);
    }
  });
});

app.set('port', process.env.PORT || 5000);

app.listen(app.get('port'), function() {
  console.info('Express app started on ' + app.get('port'));
});
