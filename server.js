const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser')
const mongoose = require('mongoose');
const { Schema } = mongoose;
const db = mongoose.createConnection(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// schema for exercise data
const userExerciseSchema = new Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String
});
const userSchema = new Schema({
  userName: { type: String, required: true },
  log: [userExerciseSchema]
});

//creating models
const exerciseSessionData = db.model('exerciseSessionData', userExerciseSchema);
const Username = db.model('Username', userSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.post('/api/exercise/new-user', (req, res) => {
  const userName = req.body.username;
  async function checkUser(userName) {
    const result = await Username.findOne({ userName: userName }).exec();
    if (result != null) {
      res.status(200).send('Username already taken');
    } else {
      var myData = new Username({
        userName: userName
      });
      myData.save().then((user) => {
        res.json({ "username": user.userName, "_id": user._id });
      }).catch(() => {
        res.status(400).send("Not saved")
      });
    }
  }
  checkUser(userName);
})


app.get('/api/exercise/users', (req, res) => {
  Username.find({}, function (err, arrayOfAllUsers) {
    if (err) {
      console.log(err);
      return
    }
    return res.json(arrayOfAllUsers);
  })
})

app.post('/api/exercise/add', (req, res) => {
  let bodyData = req.body;
  let validationMessage = [];

  if (bodyData.userId === "") {
    validationMessage.push("userId")
  }
  if (bodyData.description === "") {
    validationMessage.push("description")
  }
  if (bodyData.duration === "") {
    validationMessage.push("duration")
  }
  if (bodyData.date === "") {
    bodyData.date = new Date();
  }
  if (validationMessage.length > 0) {
    return res.send(validationMessage + " " + "required");
  }

  var exerciseData = new exerciseSessionData({
    description: bodyData.description,
    duration: bodyData.duration,
    date: bodyData.date
  });
  
  Username.findByIdAndUpdate(bodyData.userId,
    { $push: { log: exerciseData } },
    {new: true, useFindAndModify: false},
    (err, updatedUser) => {
      if (err) {
        res.status(404).send('unknown _id');
      } else {
        let responseObject = {}
        responseObject['_id'] = updatedUser.id
        responseObject['username'] = updatedUser.userName
        responseObject['date'] = new Date(exerciseData.date).toDateString()
        responseObject['duration'] = exerciseData.duration
        responseObject['description'] = exerciseData.description
        res.json(responseObject)
      }
    }
  )
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
