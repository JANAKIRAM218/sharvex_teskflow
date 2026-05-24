import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Employee, Task } from '@/lib/models';
import { verifyToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Gather analytics data
    const totalEmployees = await Employee.countDocuments();
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    const pendingTasks = await Task.countDocuments({ status: 'pending' });
    const inProgressTasks = await Task.countDocuments({ status: 'in-progress' });
    const overdueTasks = await Task.countDocuments({
      deadline: { $lt: new Date() },
      status: { $ne: 'completed' },
    });

    const employeesRaw = await Employee.find()
      .select('fullName department performanceScore')
      .lean();

    const employees = await Promise.all(
      employeesRaw.map(async (emp) => {
        const tasks = await Task.find({ assignedTo: emp._id })
          .select('status progress priority deadline')
          .lean();
        return {
          id: emp._id,
          fullName: emp.fullName,
          department: emp.department,
          performanceScore: emp.performanceScore,
          assignedTasks: tasks.map((t) => ({
            status: t.status,
            progress: t.progress,
            priority: t.priority,
            deadline: t.deadline,
          })),
        };
      })
    );

    const highPriorityTasks = await Task.countDocuments({ priority: 'high' });

    // Calculate metrics
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const avgPerformance =
      employees.length > 0
        ? Math.round(employees.reduce((sum, e) => sum + e.performanceScore, 0) / employees.length)
        : 0;

    // Identify at-risk employees
    const atRiskEmployees = employees
      .filter((e) => {
        const overdueCount = e.assignedTasks.filter(
          (t) => t.status !== 'completed' && t.deadline && new Date(t.deadline) < new Date()
        ).length;
        return e.performanceScore < 60 || overdueCount >= 2;
      })
      .map((e) => ({
        name: e.fullName,
        department: e.department,
        performanceScore: e.performanceScore,
        taskCount: e.assignedTasks.length,
      }));

    // Identify top performers
    const topPerformers = employees
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 3)
      .map((e) => ({
        name: e.fullName,
        department: e.department,
        performanceScore: e.performanceScore,
        completedTasks: e.assignedTasks.filter((t) => t.status === 'completed').length,
      }));

    // Department breakdown
    const deptMap = new Map<string, { total: number; completed: number; performance: number[] }>();
    employees.forEach((e) => {
      const dept = e.department;
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { total: 0, completed: 0, performance: [] });
      }
      const deptData = deptMap.get(dept)!;
      deptData.total += e.assignedTasks.length;
      deptData.completed += e.assignedTasks.filter((t) => t.status === 'completed').length;
      deptData.performance.push(e.performanceScore);
    });

    const departmentInsights = Array.from(deptMap.entries()).map(([dept, data]) => ({
      department: dept,
      taskCount: data.total,
      completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      avgPerformance:
        data.performance.length > 0
          ? Math.round(data.performance.reduce((a, b) => a + b, 0) / data.performance.length)
          : 0,
    }));

    // Generate rule-based insights
    const insights: string[] = [];
    const recommendations: string[] = [];

    if (completionRate < 50) {
      insights.push(`Task completion rate is low at ${completionRate}%. Consider reviewing workload distribution.`);
      recommendations.push('Implement daily standups to identify blockers early.');
    } else if (completionRate >= 80) {
      insights.push(`Excellent completion rate of ${completionRate}%! Team is performing well.`);
    } else {
      insights.push(`Completion rate of ${completionRate}% is moderate. There's room for improvement.`);
    }

    if (overdueTasks > 0) {
      insights.push(`${overdueTasks} task${overdueTasks > 1 ? 's are' : ' is'} overdue. Immediate attention needed.`);
      recommendations.push('Review overdue tasks and reassign or adjust deadlines.');
    }

    if (highPriorityTasks > totalTasks * 0.3) {
      insights.push(`${highPriorityTasks} high-priority tasks may be causing team stress.`);
      recommendations.push('Review task priorities and consider promoting fewer tasks to high priority.');
    }

    if (atRiskEmployees.length > 0) {
      insights.push(`${atRiskEmployees.length} employee(s) identified as at-risk based on performance or overdue tasks.`);
      recommendations.push('Schedule 1-on-1 meetings with at-risk employees to provide support.');
    }

    if (avgPerformance >= 80) {
      insights.push(`Average team performance score is ${avgPerformance}/100 — strong overall.`);
    } else if (avgPerformance < 60) {
      insights.push(`Average performance score of ${avgPerformance}/100 is below expectations.`);
      recommendations.push('Consider training programs or workload adjustments.');
    }

    departmentInsights.forEach((dept) => {
      if (dept.completionRate < 40) {
        insights.push(`${dept.department} department has a low completion rate of ${dept.completionRate}%.`);
        recommendations.push(`Investigate blockers in ${dept.department} and provide additional resources.`);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring team performance and maintain current strategies.');
      recommendations.push('Consider setting stretch goals to push team performance higher.');
    }

    // Late task prediction
    const latePrediction = employees
      .flatMap((e) =>
        e.assignedTasks
          .filter((t) => t.status !== 'completed' && t.progress < 50 && t.deadline && new Date(t.deadline) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))
          .map((t) => ({
            employee: e.fullName,
            taskProgress: t.progress,
            deadline: t.deadline,
            priority: t.priority,
          }))
      )
      .slice(0, 5);

    // Try LLM-powered insights
    let aiSummary = '';
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();

      const prompt = `You are an AI productivity analyst. Based on this data, provide 3-4 concise actionable insights in bullet points:

Team: ${totalEmployees} employees, ${totalTasks} tasks (Completed: ${completedTasks}, In Progress: ${inProgressTasks}, Pending: ${pendingTasks}, Overdue: ${overdueTasks})
Completion Rate: ${completionRate}%, Avg Performance: ${avgPerformance}/100
Top Performers: ${topPerformers.map((p) => `${p.name} (${p.performanceScore})`).join(', ')}
At-Risk: ${atRiskEmployees.map((e) => `${e.name} (${e.performanceScore})`).join(', ') || 'None'}
Departments: ${departmentInsights.map((d) => `${d.department}: ${d.completionRate}% completion`).join('; ')}

Keep each point to 1-2 sentences. Be specific and practical.`;

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: 'You are a concise productivity analyst. Respond with actionable insights only.' },
          { role: 'user', content: prompt },
        ],
        thinking: { type: 'disabled' },
      });

      aiSummary = completion.choices[0]?.message?.content || '';
    } catch {
      aiSummary = insights.map((i) => `• ${i}`).join('\n');
    }

    return NextResponse.json({
      summary: {
        totalEmployees,
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        overdueTasks,
        completionRate,
        avgPerformance,
        highPriorityTasks,
      },
      insights,
      recommendations,
      aiSummary,
      topPerformers,
      atRiskEmployees,
      departmentInsights,
      latePrediction,
    });
  } catch (error) {
    console.error('AI insights error:', error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}
