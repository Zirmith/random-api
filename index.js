// index.js
const express = require('express')
const uuid = require('uuid').v4; // npm package to generate UUIDs
const { networkInterfaces } = require('os'); // built-in Node.js module to retrieve network interfaces
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');


app.use(cors());
// Serve static files


app.use(express.json());







// Function to generate a custom hardware ID based on the MAC address of the first network interface
function generateCustomHardwareId() {
    const interfaces = networkInterfaces();
    const macAddress = interfaces[Object.keys(interfaces)[0]][0].mac; // get the MAC address of the first network interface
    const prefix = '6six';
    const randomString = Math.random().toString(36).substring(2, 8); // generate a random string of length 6
    const randomString2 = Math.random().toString(36).substring(2, 8); 
    const randomString3 = Math.random().toString(36).substring(2, 8); 
    const modifiedMacAddress = macAddress.replace(/:00/g, ''); // remove colons from MAC address
    const final =  modifiedMacAddress.replace(00000000000, randomString3 + randomString2 )
    return `${prefix}-${final}-${randomString}`; // append a prefix, modified MAC address, and random string
  }
  
// Define an empty object to store session keys
const sessions = {};

// Endpoint to create a new session
app.post('/create-session', async (req, res) => {
  try {
    // Generate a new session key
    const sessionId = uuid();

    // Generate a custom hardware ID based on the MAC address of the network interface
    const hwidValue = generateCustomHardwareId();

    // Store the session key and custom hardware ID in the sessions object
    sessions[sessionId] = {
      createdAt: Date.now(),
      // random id not using sessionID
      id: Math.random().toString(36).substring(2, 8),
      participants: [],
      hwid: hwidValue,
      deleteCountdown: 20
    };
    // Return the session key to the client
    res.status(201).json({ sessionId });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// Endpoint to join an existing session
app.post('/join-session/:sessionId', async (req, res) => {
  const sessionId = req.params.sessionId;

  // Check if the session ID exists in the sessions object
  if (!sessions[sessionId]) {
    res.status(404).send('Session not found');
    return;
  }

  try {
    // Generate a custom hardware ID for the new participant
    const hwidValue = generateCustomHardwareId();

    // Add the new participant to the session
    sessions[sessionId].participants.push({
      hwid: hwidValue,
      joinedAt: Date.now(),
    });

    // Emit a "user-joined" event to the server, passing along the hardware ID of the user who joined
    io.emit('user-joined', { sessionId, hwid: hwidValue });

    // Return the custom hardware ID to the client
    res.status(200).json({ hwid: hwidValue });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


  // Endpoint to leave a session
  app.post('/leave-session', async (req, res) => {
    const sessionId = req.query.sessionId;
    const hwid = req.query.hwid;
    const ended = req.query.ended;
  
    // Check if the session ID exists in the sessions object
    if (!sessions[sessionId]) {
      res.status(404).send('Session not found');
      return;
    }
  
    try {
      // Find the participant with the matching hardware ID in the session's participants array
      const participantIndex = sessions[sessionId].participants.findIndex(participant => participant.hwid === hwid);
  
      // If participant not found in the session, return 404
      if (participantIndex === -1) {
        res.status(404).send('Participant not found in session');
        return;
      }
  
      // Remove the participant from the session's participants array
      sessions[sessionId].participants.splice(participantIndex, 1);
  
      // If the session has no more participants and the "ended" parameter is true, delete the session
      if (sessions[sessionId].participants.length === 0 && ended) {
        delete sessions[sessionId];
      }
  
      res.status(200).send('Participant removed from session');
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  });
  
  

  // Endpoint to show all sessions and their participants
app.get('/sessions', async (req, res) => {
    try {
      const sessionList = [];
      // Iterate through the sessions object and build an array of session objects
      for (const sessionId in sessions) {
        const session = sessions[sessionId];
        const participantList = session.participants.map(participant => ({ hwid: participant.hwid }));
        sessionList.push({ sessionId, participants: participantList });
      }
  
      res.status(200).json(sessionList);
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  });

// Endpoint to start screen sharing in a session

app.post('/start-screensharing', async (req, res) => {
  const sessionId = req.body.sessionId;
  const hwid = req.body.hwid;

  // Check if the session ID exists in the sessions object
  if (!sessions[sessionId]) {
    res.status(404).send('Session not found');
    return;
  }

  try {
    // Find the participant with the matching hardware ID in the session's participants array
    const participant = sessions[sessionId].participants.find(p => p.hwid === hwid);

    // If participant not found in the session, return 404
    if (!participant) {
      res.status(404).send('Participant not found in session');
      return;
    }

    // Update the screensharing status for the participant
    participant.sharing = true;

    // Emit a screensharing-started event to all participants in the session
    io.to(sessionId).emit('screensharing-started', hwid);

    res.status(200).send('Screensharing started successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// Endpoint to stop screen sharing in a session
app.post('/stop-screensharing', async (req, res) => {
  const sessionId = req.body.sessionId;
  const hwid = req.body.hwid;

  // Check if the session ID exists in the sessions object
  if (!sessions[sessionId]) {
    res.status(404).send('Session not found');
    return;
  }

  try {
    // Find the participant with the matching hardware ID in the session's participants array
    const participant = sessions[sessionId].participants.find(p => p.hwid === hwid);

    // If participant not found in the session, return 404
    if (!participant) {
      res.status(404).send('Participant not found in session');
      return;
    }

    // Update the screensharing status for the participant
    participant.sharing = false;

    // Emit a screensharing-stopped event to all participants in the session
    io.to(sessionId).emit('screensharing-stopped', hwid);

    res.status(200).send('Screensharing stopped successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

  
  app.get('/sessions/:sessionId/participants', async (req, res) => {
    const sessionId = req.params.sessionId;
    // Check if the session ID exists in the sessions object
    if (!sessions[sessionId]) {
      res.status(404).send('Session not found');
      return;
    }
    
    try {
      const participants = sessions[sessionId].participants;
      res.status(200).json(participants);
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  });
  

  app.post('/current-stream', async (req, res) => {
    const sessionId = req.body.sessionId;
    const hwid = req.body.hwid;
    const stream = req.body.stream;
  
    // Check if the session ID exists in the sessions object
    if (!sessions[sessionId]) {
      res.status(404).send('Session not found');
      return;
    }
  
    try {
      // Find the participant with the matching hardware ID in the session's participants array
      const participant = sessions[sessionId].participants.find(p => p.hwid === hwid);
  
      // If participant not found in the session, return 404
      if (!participant) {
        res.status(404).send('Participant not found in session');
        return;
      }
  
      // Set the current stream for the participant
      participant.stream = stream;
  
      // Send a response indicating that the stream has been set
      res.status(200).send('Current stream set successfully');
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  });
  

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});



const server = http.createServer(app);
const io = socketIO(server);

server.listen(3001, () => {
  console.log(`Server listening on port ${3001}`);
});


// now you can use io to handle socket events
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Export the Express API
module.exports = app
