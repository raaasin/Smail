const express = require('express');
const { MongoClient } = require("mongodb");
const app = express();
const port = 3000; // You can use any available port
import {apikey} from cred;

// Serve static files from the 'public' directory
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Replace the uri string with your connection string.
const uri = apikey;

const client = new MongoClient(uri);

app.post('/submit', async (req, res) => {
  const { email, message } = req.body;

  // Save the data to the MongoDB database
  try {
    const database = client.db('sample_mflix');
    const emailsCollection = database.collection('emails');

    await emailsCollection.insertOne({ email, message });

    res.send('Data saved successfully!');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});