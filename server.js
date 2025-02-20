// This is the server code. Its job is to serve static web pages,
// and to receive and transmit websocket messages. As it is currently configured:
// when it gets any incoming message from one client, it broadcasts that message
// back to everyone else.

const express = require("express");
const socketIO = require("socket.io");

const PORT = process.env.PORT || 3000;

const server = express()
  .use(express.static("public"))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = socketIO(server);

// until here was given to us

let players = []; // defines an array for the players (this helps keep track of how many players there are in the game)
let gameState = {
  actor: null,
  guesser: null,
  emoji: null,
}; // this object helps manage the game state (it keeps track of who is the actor and guesser and appropriately manages responses)

// Handle new client connections and notify when a client connects
io.on("connection", function (socket) {
  console.log("user connected");

  // Add the new player if space is available
  if (players.length < 2) {
    players.push(socket);
  }

  // If both players are connected, assign roles
  if (players.length === 2) {
    const randomIndex = Math.floor(Math.random() * 2);
    gameState.actor = players[randomIndex]; // randomly assign player 1 or 2 the actor role
    gameState.guesser = players[1 - randomIndex]; //give the other player the role of the guesser
    console.log(`Actor is Player ${randomIndex + 1}`); // log the roles (originally written for debugging)
    console.log(`Guesser is Player ${2 - randomIndex}`); // log the roles (originally written for debugging)

    // Notify both players of their roles
    gameState.actor.emit("role", { role: "actor" });
    gameState.guesser.emit("role", { role: "guesser" });
  }

  // Handle actor selecting an emoji
  socket.on("selectEmoji", (emoji) => {
    if (socket === gameState.actor) {
      gameState.emoji = emoji; // Allow any emoji input
      gameState.guesser.emit("emojiSelected", emoji); // Send emoji to the guesser
    }
  });

  // Handle guesser making a guess
  socket.on("guess", (guess) => {
    if (socket === gameState.guesser) {
      if (gameState.emoji) {
        // Send the guess to the actor for verification
        gameState.actor.emit("guessReceived", guess);
      } else {
        gameState.guesser.emit("result", {
          success: false,
          message: "Actor has not selected an emoji yet!",
        }); // if actor has not inputted an emoji and the guesser clicks guess, this should be the message
      }
    }
  });

  // Handle actor's response (Yes/No) to the guess
  socket.on("actorResponse", (data) => {
    if (socket === gameState.actor) {
      if (data.correct) {
        gameState.guesser.emit("result", {
          success: true,
          message: "Correct!",
        }); // if the guesser guessed right (message accessed in the client side code)
      } else {
        gameState.guesser.emit("result", {
          success: false,
          message: "Wrong, try again!",
        }); // if the guesser guessed wrong (message accessed in the client side code)
      }
    }
  });

  // Handle player disconnection
  socket.on("disconnect", function () {
    console.log("user disconnected"); // logs when a player disconnects
    players = players.filter((player) => player !== socket); // remove disconnected player
    gameState = { actor: null, guesser: null, emoji: null }; // Reset game state
  });
});
