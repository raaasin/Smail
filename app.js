const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const session = require('express-session');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-session-secret',
  resave: false,
  saveUninitialized: true,
}));

const requireLogin = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

const requireNoLogin = (req, res, next) => {
  if (req.session.user) {
    res.redirect('/');
  } else {
    next();
  }
};

const requireLoginForSmailIt = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

app.use(['/smailit', '/sent', '/receive'], requireLogin);

app.get('/', (req, res) => {
  res.render('login');
});

app.get('/smailit', requireLoginForSmailIt, (req, res) => {
  res.render('smailit');
});

app.get('/login', requireNoLogin, (req, res) => {
  res.render('login');
});

app.get('/sent', async (req, res) => {
  try {
    const client = await MongoClient.connect(process.env.API_KEY, {
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

app.get('/receive', async (req, res) => {
  try {
    const client = await MongoClient.connect(process.env.API_KEY, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });

    const db = client.db('smail-mail');
    const collection = db.collection('emails');

    const receiverUsername = req.session.user.username;
    const receivedEmails = await collection.find({ receiver: receiverUsername }).toArray();
    
    res.render('receive', { emails: receivedEmails });

    client.close();
  } catch (err) {
    console.error(err);
    res.status(500).send('<script>alert("Error 500, internet problems?"); window.location.href="/smailit";</script>');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.post('/login', requireNoLogin, async (req, res) => {
  const { username, password } = req.body;

  try {
    const client = await MongoClient.connect(process.env.API_KEY, { useNewUrlParser: true });
    const db = client.db('smail-mail');
    const collection = db.collection('users');

    const user = await collection.findOne({ username, password });

    if (user) {
      req.session.user = user; 
      res.redirect('/smailit');
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
    const client = await MongoClient.connect(process.env.API_KEY, { useNewUrlParser: true });
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


const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log('Server listening on port http://localhost:3000/');
});
