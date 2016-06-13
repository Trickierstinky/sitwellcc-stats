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
    } else {
      console.log(err);
    }
  });
});

app.get('/:id', function(req, res) {
  strava.streams.activity({id: req.params.id, types: 'heartrate', resolution: 'medium'},function(err, activity) {
    if(!err) {
      res.send(activity);
      //res.render('activities');
    } else {
      console.log(err);
    }
  });
});

app.set('port', process.env.PORT || 5000);

app.listen(app.get('port'), function() {
  console.info('Express app started on ' + app.get('port'));
});
