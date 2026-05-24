import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Admin, Employee, Task, Comment, Attachment, Notification, Attendance, ChatMessage, WorkUpload } from '@/lib/models';
import { hashPassword, generateEmployeeCode, generateUsername, generateDefaultPassword } from '@/lib/auth';

export async function POST() {
  try {
    await connectToDatabase();

    // Clear all existing data to ensure a clean, fresh seed
    await Admin.deleteMany({});
    await Employee.deleteMany({});
    await Task.deleteMany({});
    await Comment.deleteMany({});
    await Attachment.deleteMany({});
    await Notification.deleteMany({});
    await Attendance.deleteMany({});
    await ChatMessage.deleteMany({});
    await WorkUpload.deleteMany({});

    // Create default admin
    const hashedAdminPassword = await hashPassword('keerthan@sharvex');
    const admin = await Admin.create({
      name: 'Keerthan Jakkaraju',
      email: 'keerthanjakkaraju@gmail.com',
      password: hashedAdminPassword,
      role: 'admin',
    });

    // Create sample employees
    const sampleEmployees = [
      {
        fullName: 'Jashwanth Kumar',
        department: 'Engineering',
        designation: 'Senior Developer',
        performanceScore: 85,
      },
      {
        fullName: 'Hemanth Reddy',
        department: 'Design',
        designation: 'UI/UX Designer',
        performanceScore: 78,
      },
      {
        fullName: 'Janakiram Sharma',
        department: 'Marketing',
        designation: 'Marketing Manager',
        performanceScore: 92,
      },
    ];

    // Use predictable passwords for demo
    const demoPasswords = ['jashwanth123', 'hemanth123', 'janakiram123'];
    const createdEmployees = [];
    for (let i = 0; i < sampleEmployees.length; i++) {
      const emp = sampleEmployees[i];
      const username = generateUsername(emp.fullName);
      const employeeCode = generateEmployeeCode(i);
      const defaultPassword = demoPasswords[i] || generateDefaultPassword();
      const hashedPassword = await hashPassword(defaultPassword);

      const employee = await Employee.create({
        fullName: emp.fullName,
        username,
        employeeCode,
        password: hashedPassword,
        department: emp.department,
        designation: emp.designation,
        performanceScore: emp.performanceScore,
        status: 'active',
      });

      createdEmployees.push({
        id: employee._id,
        fullName: employee.fullName,
        username: employee.username,
        employeeCode: employee.employeeCode,
        department: employee.department,
        plainPassword: defaultPassword,
      });
    }

    // Create sample tasks
    const sampleTasks = [
      {
        title: 'Implement User Authentication',
        description: 'Build login and registration flow with JWT tokens',
        assignedTo: createdEmployees[0].id,
        assignedBy: admin._id,
        priority: 'high',
        status: 'in-progress',
        progress: 60,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Design Dashboard Layout',
        description: 'Create responsive dashboard wireframes and mockups',
        assignedTo: createdEmployees[1].id,
        assignedBy: admin._id,
        priority: 'medium',
        status: 'pending',
        progress: 20,
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Prepare Marketing Campaign',
        description: 'Plan Q2 marketing campaign strategy and content calendar',
        assignedTo: createdEmployees[2].id,
        assignedBy: admin._id,
        priority: 'high',
        status: 'completed',
        progress: 100,
        deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Code Review - API Module',
        description: 'Review and provide feedback on the API module pull request',
        assignedTo: createdEmployees[0].id,
        assignedBy: admin._id,
        priority: 'low',
        status: 'pending',
        progress: 0,
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Update Brand Guidelines',
        description: 'Revise brand guidelines document with new color palette and typography',
        assignedTo: createdEmployees[1].id,
        assignedBy: admin._id,
        priority: 'medium',
        status: 'in-progress',
        progress: 45,
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Social Media Analytics Report',
        description: 'Compile monthly social media performance analytics report',
        assignedTo: createdEmployees[2].id,
        assignedBy: admin._id,
        priority: 'low',
        status: 'in-progress',
        progress: 70,
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
    ];

    const createdTasks = [];
    for (const task of sampleTasks) {
      const createdTask = await Task.create(task);
      createdTasks.push(createdTask);
    }

    // Create sample notifications
    for (const emp of createdEmployees) {
      await Notification.insertMany([
        {
          title: 'Welcome to Task Platform',
          message: `Welcome ${emp.fullName}! Your account has been set up successfully.`,
          type: 'info',
          userId: emp.id,
          userRole: 'employee',
          isRead: false,
        },
        {
          title: 'New Task Assigned',
          message: 'You have been assigned a new task. Check your dashboard for details.',
          type: 'task',
          userId: emp.id,
          userRole: 'employee',
          isRead: false,
        },
      ]);
    }

    // Admin notifications
    await Notification.create({
      title: 'System Initialized',
      message: 'The task management platform has been set up with sample data.',
      type: 'system',
      userId: admin._id,
      userRole: 'admin',
      isRead: false,
    });

    // Create sample attendance records
    const today = new Date();
    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      for (const emp of createdEmployees) {
        const clockInTime = new Date(date);
        clockInTime.setHours(9, Math.floor(Math.random() * 30), 0, 0);
        const clockOutTime = new Date(date);
        clockOutTime.setHours(17 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);

        await Attendance.create({
          employeeId: emp.id,
          clockIn: clockInTime,
          clockOut: i === 0 ? null : clockOutTime,
          date: date,
          status: 'present',
        });
      }
    }

    return NextResponse.json({
      message: 'Database seeded successfully',
      admin: { id: admin._id, name: admin.name, email: admin.email },
      employees: createdEmployees,
      tasksCreated: createdTasks.length,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 });
  }
}
