const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const { placeOrder } = require("./placeOrder");
const path = require("path");
require("dotenv").config();

// If modifying these SCOPES, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const TOKEN_PATH = "token.json";

const credentialsPath = path.join(__dirname, "credentials.json");
let credentials = fs.readFileSync(credentialsPath, "utf8");

credentials = credentials
  .replace(/\${CLIENT_ID}/g, process.env.CLIENT_ID)
  .replace(/\${PROJECT_ID}/g, process.env.PROJECT_ID)
  .replace(/\${AUTH_URI}/g, process.env.AUTH_URI)
  .replace(/\${TOKEN_URI}/g, process.env.TOKEN_URI)
  .replace(/\${AUTH_PROVIDER_CERT_URL}/g, process.env.AUTH_PROVIDER_CERT_URL)
  .replace(/\${CLIENT_SECRET}/g, process.env.CLIENT_SECRET)
  .replace(/\${REDIRECT_URIS}/g, process.env.REDIRECT_URIS);

const credentialsJson = JSON.parse(credentials);

function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function listMessages(auth) {
  const gmail = google.gmail({ version: "v1", auth });
  gmail.users.messages.list(
    {
      userId: "me",
      maxResults: 5,
      q: "category:primary", // Only fetch emails from the primary inbox
    },
    (err, res) => {
      if (err) return console.log("The API returned an error: " + err);
      const messages = res.data.messages;
      if (messages && messages.length) {
        messages.forEach((message) => {
          getMessage(auth, message.id);
        });
      } else {
        console.log("No messages found.");
      }
    }
  );
}

function getMessage(auth, messageId) {
  const gmail = google.gmail({ version: "v1", auth });
  gmail.users.messages.get(
    {
      userId: "me",
      id: messageId,
    },
    (err, res) => {
      if (err) return console.log("The API returned an error: " + err);
      const message = res.data;
      const headers = message.payload.headers;
      const subjectHeader = headers.find((header) => header.name === "Subject");
      const subject = subjectHeader ? subjectHeader.value : "No Subject";
      console.log(`Message ${messageId} Subject: ${subject}`);

      // Delisting email kontrolü
      if (subject.includes("Delisting of")) {
        const symbolMatch = subject.match(/Delisting of (\w+)/);
        if (symbolMatch) {
          const symbol = symbolMatch[1];
          placeOrder({
            symbol: symbol,
            signal: "Sell",
            price: "2",
          });
        }
      }
    }
  );
}

function watchGmail(auth) {
  const gmail = google.gmail({ version: "v1", auth });
  gmail.users.watch(
    {
      userId: "me",
      requestBody: {
        topicName: "projects/trading-email-448821/topics/delist-email",
        labelIds: ["INBOX"],
        labelFilterBehavior: "INCLUDE",
      },
    },
    (err, res) => {
      if (err) return console.error("Error setting up watch:", err);
      console.log("Watch set up successfully:", res.data);
    }
  );
}
authorize(credentialsJson, watchGmail);

module.exports = { credentialsJson, authorize, listMessages };
