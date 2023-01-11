const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());

mongoose.connect('', { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
    username: String,
    key: {
      type: String,
      required: true,
      unique: true,
    },
    value: String,
    place: String
});




const User = mongoose.model('Users', userSchema);

app.get('/users', async (req, res) => {
  const users = await User.find();
  res.send(users);
});

app.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).send('User not found');
  res.send(user);
});

app.post('/users', async (req, res) => {
  const user = new User({username: req.body.username, key: req.body.key, value: req.body.value, place: req.body.place });
  console.log(user)
  await user.save();
  res.send('success');
});

app.put('/users/:id', async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, {username: req.body.username, key: req.body.key, value: req.body.value }, { new: true });
  if (!user) return res.status(404).send('User not found');
  res.send(user);
});

app.delete('/users/:id', async (req, res) => {
  const user = await User.findByIdAndRemove(req.params.id);
  if (!user) return res.status(404).send('User not found');
  res.send(user);
});


app.get('/authenticate', async (req, res) => {
    const username = req.query.name;
    const key = req.query.key;

    // Attempt to find a user with the same name and key
    const user = await User.findOne({username: username, key: key});

    if(user) {
        // If the user and key match, return success
        res.send({ status: "success" });
    } else {
        // Otherwise, return an error
        res.status(401).send({ status: "error", message: "Invalid key or username" });
    }
});




app.listen(3000, () => console.log('Server started on port 3000'));
