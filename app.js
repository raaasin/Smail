const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const session = require('express-session');
const { MongoClient } = require('mongodb');
const { apikey } = require('./cred');
const path = require('path');
app.use('/css', express.static(path.join(__dirname, 'css')));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-session-secret',
  resave: false,
  saveUninitialized: true,
}));

// Middleware to check if the user is logged in
const requireLogin = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

app.get('/', (req, res) => {
  if (req.session.user) {
    res.sendFile(__dirname + '/smailit.html');
  } else {
    res.redirect('/login');
  }
});

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const client = await MongoClient.connect(apikey, { useNewUrlParser: true });
    const db = client.db('smail-mail');
    const collection = db.collection('users');

    const user = await collection.findOne({ username, password });

    if (user) {
      req.session.user = user; // Store user information in the session
      res.redirect('/');
    } else {
      res.send('<script>alert("Invalid username or password"); window.location.href="/login";</script>');
    }

    client.close();
  } catch (err) {
    console.error(err);
    res.status(500).send('<script>alert("Error 500, internet problems?"); window.location.href="/login";</script>');
  }
});

app.listen(3000, () => {
  console.log('Server listening on port http://localhost:3000/');
});
