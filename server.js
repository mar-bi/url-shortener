var express = require('express');
var app = express();
var path = require('path');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

var cipher = require('./modules/cipher');
var url = process.env.MONGOLAB_URI;
var home = "https://alert-punishment.glitch.me/";


app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, '/views/index.html'));
});

app.get('/api/shorten/*', function (req, res) {
  var full_url = req.params[0];
  var returned_data;

  //call to url validator
  if (! validateURL(full_url)){
    res.json({error: "Wrong url format. Please enter a valid url",
              exapmle: "http://www.exapmle.com"});
  }
  else {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      console.log("Successfully connected to MongoDB.");

      var collection = db.collection("urls"),
          counters = db.collection("counters");

      var test_query = { "long_url": full_url },
          projection = { "long_url": 1, "short_url": 1, "_id": 0};

      collection.find(test_query, projection).toArray(function (err, docs) {
        assert.equal(null, err);

        if (docs.length == 0){
          // update and return counter value
          counters.findOneAndUpdate({item: "counter"}, {$inc: {cvalue: 1}},
            {
              projection: {cvalue: 1},
              returnOriginal: false,
              upsert: true
            }
          ).then(function (r) {
            var count_id = r.value.cvalue,
                processed_id = cipher.encodeID(count_id);
                        
            var entry = {
              "count_id": count_id,
              "long_url": full_url,
              "short_url": home + processed_id 
            };
            
            collection.insertOne(entry, function (err, response) {
              assert.equal(null, err);
              console.log("Inserted document with _id: " + response.insertedId + "\n");
              returned_data = {"long_url": entry["long_url"],
                               "short_url": entry["short_url"]};
              db.close();
              res.json(returned_data);
            });
          });
        }
        else {
          console.log("URL is alredy in DB.");
          returned_data = docs[0];
          db.close();
          res.json(returned_data);
        }
      });
    });
  }
});

app.get('/:id', function (req, res) {
  var encoded_str = req.params.id;
  
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("Successfully connected to MongoDB.");

    var redirect_url;
    var collection = db.collection("urls");

    var test_query = { "short_url": home + encoded_str },
        projection = { "long_url": 1, "_id": 0};
    
    collection.find(test_query, projection).toArray(function (err, docs) {
      assert.equal(null, err);
      if (docs.length != 0) {
        redirect_url = docs[0]["long_url"];
      }
      else {
        redirect_url = 'back';
      }
      db.close();
      res.redirect(redirect_url);
    });
  });
});


// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});


function validateURL(url){
  var valid = /\bhtt(p|ps):\/\/(www\.){0,1}[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,5}[\/]{0,1}/;
  return valid.test(url);
}