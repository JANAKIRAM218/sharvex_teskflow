'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, MessageCircle, Users, ChevronDown, ChevronUp,
  Hash, Loader2
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  roomId: string;
  createdAt: string;
  type?: 'user' | 'system';
  userId?: string;
  userName?: string;
  timestamp?: string;
}

interface TypingUser {
  userId: string;
  userName: string;
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getRoleBadgeColor(role: string) {
  if (role === 'admin') return 'bg-[#00FFB2]/10 text-[#00FFB2] border-[#00FFB2]/20';
  return 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/20';
}

export default function TeamChat() {
  const { user, token } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch('/api/chat?roomId=general', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setMessages(json.messages || []);
        }
      } catch (err) {
        console.error('Failed to fetch chat messages:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [token]);

  // Socket.io connection
  useEffect(() => {
    if (!user) return;

    const socket = getSocket();

    socket.on('connect', () => {
      // Join the general room
      socket.emit('join-room', {
        roomId: 'general',
        userId: user.id,
        userName: user.name || user.username || 'User',
        role: user.role,
      });
    });

    // If already connected, join immediately
    if (socket.connected) {
      socket.emit('join-room', {
        roomId: 'general',
        userId: user.id,
        userName: user.name || user.username || 'User',
        role: user.role,
      });
    }

    // Listen for new messages from socket
    const handleNewMessage = (message: ChatMessage) => {
      setMessages((prev) => {
        // Avoid duplicates — check by content+sender+timestamp proximity
        const isDuplicate = prev.some(
          (m) =>
            m.senderId === (message.userId || message.senderId) &&
            m.content === message.content &&
            Math.abs(new Date(m.createdAt || m.timestamp || 0).getTime() - new Date(message.timestamp || message.createdAt || 0).getTime()) < 5000
        );
        if (isDuplicate) return prev;
        return [...prev, {
          ...message,
          id: message.id || `socket-${Date.now()}`,
          senderId: message.userId || message.senderId,
          senderName: message.userName || message.senderName,
          createdAt: message.timestamp || message.createdAt || new Date().toISOString(),
        }];
      });
      scrollToBottom();
    };

    const handleUserJoined = (data: { user: { userId: string; userName: string; role: string }; message: ChatMessage }) => {
      setMessages((prev) => [...prev, {
        id: `system-joined-${Date.now()}-${data.user.userId}`,
        senderId: 'system',
        senderName: 'System',
        senderRole: 'system',
        content: `${data.user.userName} joined the room`,
        roomId: 'general',
        createdAt: new Date().toISOString(),
        type: 'system',
      }]);
      scrollToBottom();
    };

    const handleUserLeft = (data: { user: { userId: string; userName: string; role: string }; message: ChatMessage }) => {
      setMessages((prev) => [...prev, {
        id: `system-left-${Date.now()}-${data.user.userId}`,
        senderId: 'system',
        senderName: 'System',
        senderRole: 'system',
        content: `${data.user.userName} left the room`,
        roomId: 'general',
        createdAt: new Date().toISOString(),
        type: 'system',
      }]);
      // Remove from typing users
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.user.userId));
      scrollToBottom();
    };

    const handleTyping = (data: { userId: string; userName: string; roomId: string }) => {
      if (data.userId !== user.id) {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.userId === data.userId)) return prev;
          return [...prev, { userId: data.userId, userName: data.userName }];
        });
      }
    };

    const handleStopTyping = (data: { userId: string; userName: string; roomId: string }) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    };

    socket.on('new-message', handleNewMessage);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('typing', handleTyping);
    socket.on('stop-typing', handleStopTyping);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('typing', handleTyping);
      socket.off('stop-typing', handleStopTyping);
      disconnectSocket();
    };
  }, [user, scrollToBottom]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleTypingStart = useCallback(() => {
    if (!user) return;
    const socket = getSocket();
    socket.emit('typing', { roomId: 'general' });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', { roomId: 'general' });
    }, 2000);
  }, [user]);

  const handleInputChange = (value: string) => {
    setNewMessage(value);
    if (value.trim()) {
      handleTypingStart();
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Stop typing indicator
    const socket = getSocket();
    socket.emit('stop-typing', { roomId: 'general' });

    try {
      // Save to database via REST API
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          roomId: 'general',
        }),
      });

      if (res.ok) {
        // Broadcast via socket.io
        socket.emit('send-message', {
          roomId: 'general',
          content,
        });
      } else {
        toast.error('Failed to send message');
      }
    } catch (err) {
      console.error('Send message error:', err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isOwnMessage = (msg: ChatMessage) => {
    return msg.senderId === user?.id;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-[rgba(255,255,255,0.03)] transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E5FF]/20 to-[#00FFB2]/20 flex items-center justify-center border border-[#00E5FF]/20">
            <MessageCircle className="w-5 h-5 text-[#00E5FF]" />
          </div>
          <div>
            <h3 className="text-[#E5E7EB] font-semibold flex items-center gap-2">
              Team Chat
              <span className="flex items-center gap-1 text-xs text-[#94A3B8]">
                <Hash className="w-3 h-3" />
                general
              </span>
            </h3>
            <p className="text-xs text-[#94A3B8] flex items-center gap-1">
              <Users className="w-3 h-3" />
              Real-time collaboration
            </p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.05)] flex items-center justify-center hover:bg-[rgba(255,255,255,0.08)] transition-colors"
        >
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
          ) : (
            <ChevronUp className="w-4 h-4 text-[#94A3B8]" />
          )}
        </motion.button>
      </div>

      {/* Chat Body */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* Messages Area */}
            <div className="px-4 pb-2">
              <div className="max-h-80 overflow-y-auto space-y-2 p-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 text-[#00E5FF] animate-spin" />
                    <span className="text-sm text-[#94A3B8] ml-2">Loading messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-8 h-8 text-[#94A3B8] mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-[#94A3B8]">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const own = isOwnMessage(msg);
                    const isSystem = msg.type === 'system' || msg.senderId === 'system';

                    if (isSystem) {
                      return (
                        <motion.div
                          key={msg.id || i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center py-1"
                        >
                          <span className="text-xs text-[#94A3B8] bg-[rgba(255,255,255,0.03)] px-3 py-1 rounded-full">
                            {msg.content}
                          </span>
                        </motion.div>
                      );
                    }

                    return (
                      <motion.div
                        key={msg.id || i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex ${own ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] ${own ? 'items-end' : 'items-start'} flex flex-col`}>
                          {/* Sender info */}
                          <div className={`flex items-center gap-2 mb-1 ${own ? 'flex-row-reverse' : ''}`}>
                            <span className="text-xs text-[#94A3B8]">{msg.senderName}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getRoleBadgeColor(msg.senderRole)}`}>
                              {msg.senderRole}
                            </span>
                            <span className="text-[10px] text-[#94A3B8]">{formatTime(msg.createdAt)}</span>
                          </div>
                          {/* Message bubble */}
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              own
                                ? 'bg-gradient-to-br from-[#00FFB2]/15 to-[#00E5FF]/10 border border-[#00FFB2]/20 text-[#E5E7EB] rounded-br-md'
                                : 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#E5E7EB] rounded-bl-md'
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Typing Indicator */}
            <AnimatePresence>
              {typingUsers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-6 py-1"
                >
                  <p className="text-xs text-[#94A3B8] flex items-center gap-1">
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-[#00E5FF] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 rounded-full bg-[#00E5FF] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 rounded-full bg-[#00E5FF] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    {typingUsers.map((u) => u.userName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="p-4 pt-2 border-t border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 h-10 px-4 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#E5E7EB] placeholder-[#94A3B8] text-sm focus:outline-none focus:border-[#00FFB2]/50 focus:bg-[rgba(255,255,255,0.08)] transition-all"
                />
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0,255,178,0.3)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="h-10 w-10 rounded-xl bg-gradient-to-r from-[#00FFB2] to-[#00E5FF] flex items-center justify-center text-[#0B0F19] shadow-[0_0_15px_rgba(0,255,178,0.2)] transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
