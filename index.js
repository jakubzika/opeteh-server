const WebSocket = require('ws');

const host = '0.0.0.0';
const port = 8002;
const wss = new WebSocket.Server({ port: port, host: host });
console.log(host+':'+port);
var connectedClients = [];
var server;

const SERVER = 'SERVER';
const CLIENT = 'CLIENT';

const rooms = {};

function createRoom(serverId, maxClients) {
  var roomId;
  do {
    roomId = Math.round(Math.random()*10e6);
  } while (rooms.hasOwnProperty(roomId));
  rooms[roomId] = {
    server: serverId,
    clients: [],
    maxClients: maxClients
  };
  return roomId;
}

wss.on('connection', function(client) {
  console.log('___');
  var userId;
  do {
    userId = Math.random().toString(36).substr(2, 9);
  } while(Object.hasOwnProperty(userId));

  connectedClients[userId] = {
    connection: client
  };
  client.on('message', onMessageHandler(userId));
  client.send(formatMessage('info', {
    id: userId,
  }));
});

function getRoom(userId) {
  if(connectedClients[userId].room) {
    return rooms[connectedClients[userId].room];
  }
  return false;
}

function getServer(id) {
  return connectedClients[rooms[connectedClients[id].room].server];
}

function isInRoom(id, room) {

}

function onMessageHandler(id) {
  return function(messageString) {
    message = JSON.parse(messageString);

    var room = getRoom(id);
    switch (message.type) {
      case 'info':
        var type = message.data.type;
        if (type === SERVER || type === CLIENT) {
          connectedClients[id].type = type;
        }
        if (type === SERVER) {
          console.log(id + ' is server');
        } else if (type === CLIENT) {

        }
        break;
      case 'session':
        if (connectedClients[id].type === SERVER) {
          var maxConnections = message.data.maxConnections ? message.data.maxConnections : 5;

          var room = createRoom(id, maxConnections);
          connectedClients[id].connection.send(formatMessage('session', {
            room: room,
            id: id,
            error: false,
          }))
        } else {
          var room = message.data.room;
          // TODO: better structure
          if (room) {
            if(rooms.hasOwnProperty(room)) {
              if (rooms[room].clients.length <= rooms[room].maxClients) {
                if (!rooms[room].clients.includes(id)) {
                  rooms[room].clients.push(id);
                  connectedClients[id].room = room;
                  connectedClients[id].connection.send(formatMessage('session', {
                    error: false,
                    id: id,
                  }));
                } else {
                  connectedClients[id].connection.send(formatMessage('session', {
                    error: 'you are already joined'
                  }));
                }
              }
              else {
                connectedClients[id].connection.send(formatMessage('session', {
                  error: 'room is full'
                }));
              }
            } else {
              connectedClients[id].connection.send(formatMessage('session', {
                error: 'no such existing room'
              }));
            }
          } else {
            connectedClients[id].connection.send(formatMessage('session', {
              error: 'missing room variable'
            }));
          }
        }
        break;
      case 'request':
        if (rooms[connectedClients[id].room].server !== id) {
         getServer(id).connection.send(formatMessage('request', message.data, id));
        }
        break;
      case 'response':
        connectedClients[message.to].connection.send(formatMessage('response', message.data));
        break;
      case 'test':
        connectedClients[id].connection.send(formatMessage('test', 'testing data'));
        break;
      case 'ice':
        connectedClients[message.to ? message.to : room.server].connection.send(formatMessage('ice', message.data), id);
        break;
      default:
        console.log('Unknown message type');
    }
  }
}

wss.on('error', function() {
  console.log('errored')
});

function formatMessage(type, data, id) {
  message = {
    type: type,
    data: data
  };
  if (id) {
    message.from = id;
  }
  return JSON.stringify(message);
}
