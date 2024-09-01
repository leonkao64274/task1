// server.js
// where your node app starts

// init project
const express = require('express');
const morgan = require('morgan');
const app = express();
const bodyParser = require('body-parser');

//--
// const express = require('express');
// const bodyParser = require('body-parser');
const axios = require('axios');
const nodemailer = require('nodemailer');
//--

app.use(bodyParser());
app.use(morgan());

// we've started you off with Express,
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', (request, response) => {
  response.sendFile(__dirname + '/views/index.html');
});
//---
require('dotenv').config();


// const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let pendingRequests = [];

// Fetch user data
const fetchUserData = async () => {
  const userProfiles = await axios.get('https://raw.githubusercontent.com/alj-devops/santa-data/master/userProfiles.json');
  const users = await axios.get('https://raw.githubusercontent.com/alj-devops/santa-data/master/users.json');
  return { userProfiles: userProfiles.data, users: users.data };
};

function calculateAge(birthdate) {
  const birthDate = new Date(birthdate);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  // Adjust age if the birthday hasn't occurred yet this year
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

app.post('/api/submit', async (req, res) => {
  const { userid, wish } = req.body;
  try {
    const { userProfiles, users } = await fetchUserData();
    // console.log(users);
    const user = users.find(u => u.username === userid);
    if (!user) {
      return res.status(400).json({ error: 'User not registered' });
    }

    const profile = userProfiles.find(p => p.userUid === user.uid);
    console.log(user)
    console.log(req.body)
    console.log(userid)

    const age = calculateAge(profile.birthdate);

    // const age = new Date().getFullYear() - new Date(profile.dateOfBirth).getFullYear();
    console.log(age)
    if(!age){
      return res.status(400).json({ error: 'Your birthdate format is incorrect. Please contact customer service.' });

    }
    if (age >= 10) {
      return res.status(400).json({ error: 'User is older than 10 years' });
    }

    pendingRequests.push({ userid, wish, address: profile.address });
    return res.json({ message: 'Your request has been received' });
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Send email with pending requests every 15 seconds
const sendEmails = () => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'do_not_reply@northpole.com',
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  setInterval(async () => {
    if (pendingRequests.length === 0) return;

    const emailBody = pendingRequests.map(req => `
      User: ${req.userid}
      Address: ${req.address}
      Message: ${req.wish}
    `).join('\n\n');

    try {
      await transporter.sendMail({
        from: 'do_not_reply@northpole.com',
        to: 'santa@northpole.com',
        subject: 'Pending Santa Requests',
        text: emailBody,
      });
      // Clear pending requests after sending
      pendingRequests = [];
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }, 15000);
};

sendEmails();

// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });

// listen for requests :)
const listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
