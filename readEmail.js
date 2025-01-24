const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const { placeOrder } = require("./placeOrder");

// If modifying these SCOPES, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const TOKEN_PATH = "token.json";

// Load client secrets from a local file.
fs.readFile("credentials.json", (err, content) => {
  if (err) return console.log("Error loading client secret file:", err);
  authorize(JSON.parse(content), listMessages);
});

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
      maxResults: 10,
      q: "category:primary", // Only fetch emails from the primary inbox
    },
    (err, res) => {
      if (err) return console.log("The API returned an error: " + err);
      const messages = res.data.messages;
      if (messages && messages.length) {
        console.log("Messages:");
        messages.forEach((message) => {
          console.log(`- ${message.id}`);
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

module.exports = { listMessages };
