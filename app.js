const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const session = require('express-session');
const { MongoClient } = require('mongodb');
const { apikey } = require('./cred');
const path = require('path');

app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.set('view engine', 'ejs');

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
    res.sendFile(path.join(__dirname, 'views', 'smailit.html'));
  } else {
    res.redirect('/login');
  }
});

app.get('/smailit', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'smailit.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views','login.html'));
});

app.get('/sent', async (req, res) => {
  try {
    const client = await MongoClient.connect(apikey, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });
    const db = client.db('smail-mail');
    const collection = db.collection('emails');

    const senderUsername = req.session.user.username;
    const sentEmails = await collection.find({ sender: senderUsername }).toArray();

    res.render('sent', { emails: sentEmails });
  } catch (err) {
    console.error(err);
    res.status(500).send('<script>alert("Error 500, internet problems?"); window.location.href="/login";</script>');
  }
});


app.get('/receive', requireLogin, async (req, res) => {
  try {
    const client = await MongoClient.connect(apikey, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });

    const db = client.db('smail-mail');
    const collection = db.collection('emails');

    const receiverUsername = req.session.user.username;
    const receivedEmails = await collection.find({ receiver: receiverUsername }).toArray();
    console.log(receivedEmails);
    res.render('receive', { emails: receivedEmails });

    client.close();
  } catch (err) {
    console.error(err);
    res.status(500).send('<script>alert("Error 500, internet problems?"); window.location.href="/smailit";</script>');
  }
});

app.get('/smailit', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'smailit.html'));
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
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

app.post('/submit-form', requireLogin, async (req, res) => {
  const { email, message } = req.body;

  try {
    const client = await MongoClient.connect(apikey, { useNewUrlParser: true });
    const db = client.db('smail-mail');
    const collection = db.collection('emails'); // Change collection name to 'emails'

    const senderUsername = req.session.user.username; // Extract sender's username from the session

    const emailData = {
      sender: senderUsername,
      receiver: email,
      message: message
    };

    await collection.insertOne(emailData); // Append data to the 'emails' collection

    res.status(200).send('<script>alert("Mail sent!");window.location.href="/smailit";</script>');
  } catch (err) {
    console.error(err);
    res.status(500).send('<script>alert("Error 500, internet problems?"); window.location.href="/login";</script>');
  }
});

app.listen(3000, () => {
  console.log('Server listening on port http://localhost:3000/');
});
