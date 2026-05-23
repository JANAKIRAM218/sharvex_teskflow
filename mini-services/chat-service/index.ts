import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// --- Types ---

interface ConnectedUser {
  userId: string
  userName: string
  role: string
}

interface ChatMessage {
  id: string
  roomId: string
  userId: string
  userName: string
  content: string
  timestamp: string
  type: 'user' | 'system'
}

interface TaskNotification {
  taskId: string
  taskTitle: string
  assignedTo: string
  assignedBy: string
  priority: string
  dueDate?: string
  timestamp: string
}

interface TaskUpdateNotification {
  taskId: string
  taskTitle: string
  updatedBy: string
  updateType: string
  previousValue?: string
  newValue?: string
  timestamp: string
}

interface UserNotification {
  id: string
  targetUserId: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  timestamp: string
  read: boolean
}

// --- In-memory Store ---

const connectedUsers = new Map<string, ConnectedUser>()

// Track which rooms each socket is in
const socketRooms = new Map<string, Set<string>>()

// --- Utility Functions ---

const generateId = (): string => Math.random().toString(36).substring(2, 11)

const createSystemMessage = (roomId: string, content: string): ChatMessage => ({
  id: generateId(),
  roomId,
  userId: 'system',
  userName: 'System',
  content,
  timestamp: new Date().toISOString(),
  type: 'system',
})

const createUserMessage = (
  roomId: string,
  userId: string,
  userName: string,
  content: string
): ChatMessage => ({
  id: generateId(),
  roomId,
  userId,
  userName,
  content,
  timestamp: new Date().toISOString(),
  type: 'user',
})

// Find socket ID by userId
const findSocketByUserId = (userId: string): string | undefined => {
  for (const [socketId, user] of connectedUsers) {
    if (user.userId === userId) {
      return socketId
    }
  }
  return undefined
}

// --- Socket.io Connection Handling ---

io.on('connection', (socket: Socket) => {
  console.log(`[Connection] Socket connected: ${socket.id}`)

  // --- join-room ---
  // User joins a chat room
  socket.on(
    'join-room',
    (data: { roomId: string; userId: string; userName: string; role: string }) => {
      const { roomId, userId, userName, role } = data

      // Store user info
      connectedUsers.set(socket.id, { userId, userName, role })

      // Track room membership
      if (!socketRooms.has(socket.id)) {
        socketRooms.set(socket.id, new Set())
      }
      socketRooms.get(socket.id)!.add(roomId)

      // Join the socket.io room
      socket.join(roomId)

      // Notify others in the room
      const joinMessage = createSystemMessage(roomId, `${userName} joined the room`)
      socket.to(roomId).emit('user-joined', {
        user: { userId, userName, role },
        message: joinMessage,
        roomId,
      })

      // Send current room members to the joining user
      const roomSockets = io.sockets.adapter.rooms.get(roomId)
      const roomMembers: ConnectedUser[] = []
      if (roomSockets) {
        for (const sid of roomSockets) {
          const user = connectedUsers.get(sid)
          if (user) {
            roomMembers.push(user)
          }
        }
      }
      socket.emit('room-members', { roomId, members: roomMembers })

      console.log(
        `[Room] ${userName} (${role}) joined room: ${roomId}. Total connected: ${connectedUsers.size}`
      )
    }
  )

  // --- send-message ---
  // Broadcast message to a room
  socket.on(
    'send-message',
    (data: { roomId: string; content: string }) => {
      const { roomId, content } = data
      const user = connectedUsers.get(socket.id)

      if (!user) {
        socket.emit('error', { message: 'User not registered. Please join a room first.' })
        return
      }

      if (!content || !content.trim()) {
        socket.emit('error', { message: 'Message content cannot be empty.' })
        return
      }

      const message = createUserMessage(roomId, user.userId, user.userName, content.trim())

      // Broadcast to everyone in the room (including sender for confirmation)
      io.to(roomId).emit('new-message', message)

      console.log(`[Message] ${user.userName} in ${roomId}: ${content.trim()}`)
    }
  )

  // --- task-assigned ---
  // Notify when a task is assigned (broadcast to employee)
  socket.on('task-assigned', (data: TaskNotification) => {
    const notification: TaskNotification = {
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
    }

    // Find the assigned employee's socket
    const targetSocketId = findSocketByUserId(notification.assignedTo)

    if (targetSocketId) {
      // Send directly to the assigned employee
      io.to(targetSocketId).emit('task-assigned', notification)
      console.log(
        `[Task] Task assigned: "${notification.taskTitle}" to user ${notification.assignedTo}`
      )
    } else {
      console.log(
        `[Task] Task assigned but user ${notification.assignedTo} is not online. Notification will be stored.`
      )
    }

    // Also broadcast to any room that might be listening for task assignments
    // (e.g., a manager dashboard room)
    socket.broadcast.emit('task-assigned-broadcast', notification)
  })

  // --- task-updated ---
  // Notify when a task is updated
  socket.on('task-updated', (data: TaskUpdateNotification) => {
    const notification: TaskUpdateNotification = {
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
    }

    // Broadcast to all connected clients so dashboards can update
    io.emit('task-updated', notification)

    console.log(
      `[Task] Task updated: "${notification.taskTitle}" - ${notification.updateType} by ${notification.updatedBy}`
    )
  })

  // --- notification ---
  // Send notification to a specific user
  socket.on('notification', (data: Omit<UserNotification, 'id' | 'timestamp' | 'read'>) => {
    const notification: UserNotification = {
      ...data,
      id: generateId(),
      timestamp: new Date().toISOString(),
      read: false,
    }

    const targetSocketId = findSocketByUserId(notification.targetUserId)

    if (targetSocketId) {
      io.to(targetSocketId).emit('notification', notification)
      console.log(
        `[Notification] Sent to ${notification.targetUserId}: ${notification.title}`
      )
    } else {
      console.log(
        `[Notification] User ${notification.targetUserId} is offline. Notification stored.`
      )
    }
  })

  // --- typing ---
  // User typing indicator
  socket.on('typing', (data: { roomId: string }) => {
    const { roomId } = data
    const user = connectedUsers.get(socket.id)

    if (user) {
      socket.to(roomId).emit('typing', {
        userId: user.userId,
        userName: user.userName,
        roomId,
      })
    }
  })

  // --- stop-typing ---
  // User stopped typing
  socket.on('stop-typing', (data: { roomId: string }) => {
    const { roomId } = data
    const user = connectedUsers.get(socket.id)

    if (user) {
      socket.to(roomId).emit('stop-typing', {
        userId: user.userId,
        userName: user.userName,
        roomId,
      })
    }
  })

  // --- leave-room ---
  // Explicitly leave a room
  socket.on('leave-room', (data: { roomId: string }) => {
    const { roomId } = data
    const user = connectedUsers.get(socket.id)

    if (user) {
      socket.leave(roomId)

      // Remove from room tracking
      const rooms = socketRooms.get(socket.id)
      if (rooms) {
        rooms.delete(roomId)
      }

      const leaveMessage = createSystemMessage(roomId, `${user.userName} left the room`)
      socket.to(roomId).emit('user-left', {
        user: { userId: user.userId, userName: user.userName, role: user.role },
        message: leaveMessage,
        roomId,
      })

      console.log(`[Room] ${user.userName} left room: ${roomId}`)
    }
  })

  // --- disconnect ---
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    const user = connectedUsers.get(socket.id)

    if (user) {
      // Get all rooms this user was in
      const rooms = socketRooms.get(socket.id)

      if (rooms) {
        for (const roomId of rooms) {
          const leaveMessage = createSystemMessage(roomId, `${user.userName} disconnected`)
          socket.to(roomId).emit('user-left', {
            user: { userId: user.userId, userName: user.userName, role: user.role },
            message: leaveMessage,
            roomId,
          })
        }
      }

      // Clean up
      connectedUsers.delete(socket.id)
      socketRooms.delete(socket.id)

      console.log(
        `[Disconnect] ${user.userName} disconnected (${reason}). Total connected: ${connectedUsers.size}`
      )
    } else {
      console.log(`[Disconnect] Unknown socket disconnected: ${socket.id} (${reason})`)
    }
  })

  // --- error ---
  socket.on('error', (error) => {
    console.error(`[Error] Socket error (${socket.id}):`, error)
  })
})

// --- Start Server ---

const PORT = 3003

httpServer.listen(PORT, () => {
  console.log(`╔══════════════════════════════════════════════╗`)
  console.log(`║  Chat/Notification Service                   ║`)
  console.log(`║  Socket.io server running on port ${PORT}       ║`)
  console.log(`║  CORS: Enabled (all origins)                 ║`)
  console.log(`╚══════════════════════════════════════════════╝`)
})

// --- Graceful Shutdown ---

const gracefulShutdown = (signal: string) => {
  console.log(`\n[Shutdown] Received ${signal}. Shutting down gracefully...`)

  // Notify all connected users
  for (const [socketId, user] of connectedUsers) {
    io.to(socketId).emit('server-shutdown', {
      message: 'Server is shutting down for maintenance.',
      timestamp: new Date().toISOString(),
    })
  }

  // Close all connections
  io.disconnectSockets()

  httpServer.close(() => {
    console.log('[Shutdown] Server closed.')
    process.exit(0)
  })

  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('[Shutdown] Forced shutdown after timeout.')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
