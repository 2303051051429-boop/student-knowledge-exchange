let _io = null;

function initSocket(io) {
  _io = io;
}

function getIO() {
  return _io;
}

function notifyUser(userId, event, data) {
  if (_io) {
    _io.to(`user_${userId}`).emit(event, data);
  }
}

module.exports = { initSocket, getIO, notifyUser };
