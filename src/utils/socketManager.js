// const { createServer } = require('http');
// const { Server } = require('socket.io');
// const config = require('../config/config');

// const httpServer = createServer();
// httpServer.listen(config.socketPort, () => {
//     console.log(`Socket running on port ${config.socketPort}`);
// });

// const io = new Server(httpServer, {
//     cors: {
//       origin: '*', // Set the specific origin
//       methods: ['GET', 'POST'], // Add the allowed methods if needed
//     },
// });

// const connectedUsers = new Map();
// console.log('connectedUsers: ', connectedUsers);

// io.on('connect', (connectedSocket) => {
//     console.log('Client connected with socket ID:', connectedSocket.id);

//     // Handle userInfo event when a user connects
//     connectedSocket.on('join', (userData) => {
//       const { userId } = userData;

//       let sockets = connectedUsers.get(userId);
//       if (!sockets) {
//         sockets = new Set();
//         connectedUsers.set(userId, sockets);
//       }
//       sockets.add(connectedSocket.id);
//       console.log('connectedUsers: ', connectedUsers);
//     });

//     // Handle disconnect event
//     connectedSocket.on('disconnect', () => {
//       connectedUsers.forEach((sockets, userId) => {
//         if (sockets.has(connectedSocket.id)) {
//           sockets.delete(connectedSocket.id);
//           if (sockets.size === 0) {
//             connectedUsers.delete(userId);
//           }
//         }
//       });
//       console.log('Client disconnected with socket ID:', connectedSocket.id);
//       console.log('connectedUsers: ', connectedUsers);
//     });
// });

// const socketEmit = async (data) => {
//     const notificationsData = data;

//     // Emit the data to all connected clients
//     io.emit('notification', notificationsData);
// };

// const sendNotificationUsingSocket = async (userId, notificationData) => {
//     try {
//       const sockets = connectedUsers.get(userId);
//       console.log('sockets: ', sockets);
//       if (sockets) {
//         // Emit notification to each socket ID in the set
//         sockets.forEach((socketId) => {
//           io.to(socketId).emit('notification', notificationData);
//         });
//       }
//     } catch (error) {
//       console.log('error: ', error);
//     }
// };

// module.exports = {
//   socketEmit,
//   sendNotificationUsingSocket,
// };
