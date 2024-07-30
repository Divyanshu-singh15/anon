import { WebSocketServer } from 'ws';
import type { Handle } from '@sveltejs/kit';

const port = 8080; // Port to listen on
let wss: WebSocketServer | null = null;

const usersQueue: WebSocket[] = [];
const pairs = new Map<WebSocket, WebSocket>();

// Initialize WebSocket server
async function initWebSocketServer() {
  if (wss === null) {
    wss = new WebSocketServer({ port });

    wss.on('connection', (ws: WebSocket & { on: Function }) => {
      console.log('New user connected');
      pairUser(ws);


      // Handle incoming messages
      ws.on('message', (message: any) => {
        console.log(`Received message: ${message}`);
        sendMessage(ws, message);
      });

      // Handle user disconnection
      ws.on('close', () => {
        console.log('User disconnected');
        handleDisconnection(ws);
      });

      // Handle errors
      ws.on('error', (error: any) => {
        console.error(`WebSocket error: ${error.message}`);
      });
    });

    console.log(`WebSocket server is running on ws://localhost:${port}`);
  }
}

// Pair users
function pairUser(ws: WebSocket) {
  if (usersQueue.length > 0) {
    const pairedUser = usersQueue.shift();
    if (pairedUser) {
      pairs.set(ws, pairedUser);
      pairs.set(pairedUser, ws);
      console.log('Paired two users');
      const message = JSON.stringify({ "type": "status", "text": "Connected" });
      pairedUser.send(message);
      ws.send(message);

    }
  } else {
    usersQueue.push(ws);
  }
}

// Send message to paired user
function sendMessage(ws: WebSocket, message: any) {
  const pairedUser = pairs.get(ws);
  if (pairedUser && pairedUser.readyState) {
    pairedUser.send(message);
  }
}

// Handle user disconnection
function handleDisconnection(ws: WebSocket) {
  const pairedUser = pairs.get(ws);
  if (pairedUser) {
    pairs.delete(pairedUser);
    pairs.delete(ws);
    if (pairedUser.readyState) {
      pairedUser.send(JSON.stringify({ "type": "status", "text": "Disconnected" }));
    }
    usersQueue.push(pairedUser); // Re-add the remaining user to the queue
  } else {
    const index = usersQueue.indexOf(ws);
    if (index !== -1) {
      usersQueue.splice(index, 1);
    }
  }
}



//main function

export const handle: Handle = async ({ event, resolve }) => {
  // Initialize WebSocket server if it hasn't been initialized yet
  initWebSocketServer();

  const response = await resolve(event);
  return response;
};
