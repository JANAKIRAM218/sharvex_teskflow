import mongoose, { Schema } from 'mongoose';

const generateId = () => new mongoose.Types.ObjectId().toHexString();

// --- Admin Schema ---
const AdminSchema = new Schema(
  {
    _id: { type: String, default: generateId },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'admin' },
  },
  { timestamps: true }
);

// --- Employee Schema ---
const EmployeeSchema = new Schema(
  {
    _id: { type: String, default: generateId },
    fullName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    employeeCode: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    department: { type: String, required: true },
    designation: { type: String, required: true },
    profileImage: { type: String, default: null },
    joiningDate: { type: Date, default: Date.now },
    status: { type: String, default: 'active' },
    performanceScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// --- Task Schema ---
const TaskSchema = new Schema(
  {
    _id: { type: String, default: generateId },
    title: { type: String, required: true },
    description: { type: String, default: null },
    assignedTo: { type: String, ref: 'Employee', required: true },
    assignedBy: { type: String, required: true },
    priority: { type: String, default: 'medium' },
    deadline: { type: Date, default: null },
    progress: { type: Number, default: 0 },
    status: { type: String, default: 'pending' },
  },
  { timestamps: true }
);

// --- Comment Schema ---
const CommentSchema = new Schema(
  {
    _id: { type: String, default: generateId },
    content: { type: String, required: true },
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, required: true },
    taskId: { type: String, ref: 'Task', required: true },
  },
  { timestamps: true }
);

// --- Attachment Schema ---
const AttachmentSchema = new Schema(
  {
    _id: { type: String, default: generateId },
    filename: { type: String, required: true },
    url: { type: String, required: true },
    fileType: { type: String, required: true },
    taskId: { type: String, ref: 'Task', required: true },
    uploadedBy: { type: String, required: true },
  },
  { timestamps: true }
);

// --- Notification Schema ---
const NotificationSchema = new Schema(
  {
    _id: { type: String, default: generateId },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true },
    userId: { type: String, required: true },
    userRole: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    relatedId: { type: String, default: null },
  },
  { timestamps: true }
);

// --- Attendance Schema ---
const AttendanceSchema = new Schema(
  {
    _id: { type: String, default: generateId },
    employeeId: { type: String, ref: 'Employee', required: true },
    clockIn: { type: Date, default: null },
    clockOut: { type: Date, default: null },
    date: { type: Date, default: Date.now },
    status: { type: String, default: 'present' },
  },
  { timestamps: true }
);

// --- ChatMessage Schema ---
const ChatMessageSchema = new Schema(
  {
    _id: { type: String, default: generateId },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true },
    content: { type: String, required: true },
    roomId: { type: String, default: 'general' },
  },
  { timestamps: true }
);

// --- WorkUpload Schema ---
const WorkUploadSchema = new Schema(
  {
    _id: { type: String, default: generateId },
    employeeId: { type: String, ref: 'Employee', required: true },
    taskId: { type: String, ref: 'Task', default: null },
    title: { type: String, required: true },
    description: { type: String, default: null },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    category: { type: String, default: 'general' },
  },
  { timestamps: true }
);

// Compile & export models
export const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
export const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);
export const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);
export const Comment = mongoose.models.Comment || mongoose.model('Comment', CommentSchema);
export const Attachment = mongoose.models.Attachment || mongoose.model('Attachment', AttachmentSchema);
export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
export const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
export const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);
export const WorkUpload = mongoose.models.WorkUpload || mongoose.model('WorkUpload', WorkUploadSchema);
