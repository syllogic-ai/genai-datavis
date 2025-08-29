import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { TodoTracker } from './TodoTracker';
import { Task } from '@/db/schema';

// Sample tasks representing different states and scenarios
const sampleTasks: Task[] = [
  {
    id: "task-1",
    chatId: "sample-chat-1",
    dashboardId: "sample-dashboard-1",
    taskGroupId: "group-1",
    title: "Analyze sales data trends",
    description: "Create visualizations showing sales performance over the last quarter",
    status: "completed",
    order: 1,
    startedAt: new Date("2024-01-15T10:00:00Z"),
    completedAt: new Date("2024-01-15T10:30:00Z"),
    createdAt: new Date("2024-01-15T09:45:00Z"),
    updatedAt: new Date("2024-01-15T10:30:00Z"),
  },
  {
    id: "task-2",
    chatId: "sample-chat-1",
    dashboardId: "sample-dashboard-1",
    taskGroupId: "group-1",
    title: "Generate revenue chart",
    description: "Create a line chart showing monthly revenue growth",
    status: "in-progress",
    order: 2,
    startedAt: new Date("2024-01-15T10:30:00Z"),
    completedAt: null,
    createdAt: new Date("2024-01-15T09:45:00Z"),
    updatedAt: new Date("2024-01-15T10:30:00Z"),
  },
  {
    id: "task-3",
    chatId: "sample-chat-1",
    dashboardId: "sample-dashboard-1",
    taskGroupId: "group-1",
    title: "Create customer segmentation table",
    description: "Build a data table showing customer demographics and purchase patterns",
    status: "pending",
    order: 3,
    startedAt: null,
    completedAt: null,
    createdAt: new Date("2024-01-15T09:45:00Z"),
    updatedAt: new Date("2024-01-15T09:45:00Z"),
  },
  {
    id: "task-4",
    chatId: "sample-chat-1",
    dashboardId: "sample-dashboard-1",
    taskGroupId: "group-1",
    title: "Set up automated alerts",
    description: null,
    status: "pending",
    order: 4,
    startedAt: null,
    completedAt: null,
    createdAt: new Date("2024-01-15T09:45:00Z"),
    updatedAt: new Date("2024-01-15T09:45:00Z"),
  },
];

const failedTasks: Task[] = [
  {
    id: "task-5",
    chatId: "sample-chat-2",
    dashboardId: "sample-dashboard-2",
    taskGroupId: "group-2",
    title: "Export data to CSV",
    description: "Failed due to insufficient permissions",
    status: "failed",
    order: 1,
    startedAt: new Date("2024-01-15T11:00:00Z"),
    completedAt: null,
    createdAt: new Date("2024-01-15T10:45:00Z"),
    updatedAt: new Date("2024-01-15T11:15:00Z"),
  },
  {
    id: "task-6",
    chatId: "sample-chat-2",
    dashboardId: "sample-dashboard-2",
    taskGroupId: "group-2",
    title: "Retry data export",
    description: "Attempting export with elevated permissions",
    status: "pending",
    order: 2,
    startedAt: null,
    completedAt: null,
    createdAt: new Date("2024-01-15T11:15:00Z"),
    updatedAt: new Date("2024-01-15T11:15:00Z"),
  },
];

const completedTasks: Task[] = sampleTasks.map((task, index) => ({
  ...task,
  id: `completed-task-${index}`,
  status: "completed" as const,
  completedAt: new Date("2024-01-15T12:00:00Z"),
}));

const meta = {
  title: 'Dashboard/TodoTracker',
  component: TodoTracker,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A collapsible todo tracker component that displays AI-generated tasks with their status and progress. Used to show task lists from LLM responses.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-4xl">
          <Story />
        </div>
      </div>
    ),
  ],
  argTypes: {
    tasks: { control: false }, // Complex object, not controllable via UI
    onTaskToggle: { action: 'task toggled' },
  },
} satisfies Meta<typeof TodoTracker>;

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive wrapper for better demonstration
function InteractiveTodoTracker(args: any) {
  const [tasks, setTasks] = React.useState<Task[]>(args.tasks || []);
  
  const handleTaskToggle = (taskId: string, newStatus: Task['status']) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === taskId 
          ? { ...task, status: newStatus, completedAt: newStatus === 'completed' ? new Date() : null }
          : task
      )
    );
    args.onTaskToggle?.(taskId, newStatus);
  };
  
  return (
    <TodoTracker
      {...args}
      tasks={tasks}
      onTaskToggle={handleTaskToggle}
    />
  );
}

export const Default: Story = {
  render: InteractiveTodoTracker,
  args: {
    tasks: sampleTasks,
    onTaskToggle: (taskId: string, newStatus: Task['status']) => 
      console.log('Task toggled:', { taskId, newStatus }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Default todo tracker with mixed task states including completed, in-progress, and pending tasks.',
      },
    },
  },
};

export const AllCompleted: Story = {
  render: InteractiveTodoTracker,
  args: {
    tasks: completedTasks,
    onTaskToggle: (taskId: string, newStatus: Task['status']) => 
      console.log('Task toggled:', { taskId, newStatus }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Todo tracker showing all completed tasks with strike-through styling.',
      },
    },
  },
};

export const WithFailedTasks: Story = {
  render: InteractiveTodoTracker,
  args: {
    tasks: failedTasks,
    onTaskToggle: (taskId: string, newStatus: Task['status']) => 
      console.log('Task toggled:', { taskId, newStatus }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Todo tracker showing failed tasks with error styling.',
      },
    },
  },
};

export const EmptyState: Story = {
  render: InteractiveTodoTracker,
  args: {
    tasks: [],
    onTaskToggle: (taskId: string, newStatus: Task['status']) => 
      console.log('Task toggled:', { taskId, newStatus }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Todo tracker with no tasks - shows the collapsed state only.',
      },
    },
  },
};

export const SingleTask: Story = {
  render: InteractiveTodoTracker,
  args: {
    tasks: [sampleTasks[0]],
    onTaskToggle: (taskId: string, newStatus: Task['status']) => 
      console.log('Task toggled:', { taskId, newStatus }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Todo tracker with a single completed task.',
      },
    },
  },
};

export const InProgressTask: Story = {
  render: InteractiveTodoTracker,
  args: {
    tasks: [sampleTasks[1]], // The in-progress task
    onTaskToggle: (taskId: string, newStatus: Task['status']) => 
      console.log('Task toggled:', { taskId, newStatus }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Todo tracker showing a single task in progress with loading spinner.',
      },
    },
  },
};

export const TasksWithoutDescriptions: Story = {
  render: InteractiveTodoTracker,
  args: {
    tasks: sampleTasks.filter(task => !task.description),
    onTaskToggle: (taskId: string, newStatus: Task['status']) => 
      console.log('Task toggled:', { taskId, newStatus }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Todo tracker showing tasks without descriptions.',
      },
    },
  },
};

export const LargeTodoList: Story = {
  render: InteractiveTodoTracker,
  args: {
    tasks: Array.from({ length: 8 }, (_, index) => ({
      ...sampleTasks[index % sampleTasks.length],
      id: `large-task-${index}`,
      title: `Task ${index + 1}: ${sampleTasks[index % sampleTasks.length].title}`,
      order: index + 1,
      status: index < 3 ? "completed" : index < 5 ? "in-progress" : "pending",
    } as Task)),
    onTaskToggle: (taskId: string, newStatus: Task['status']) => 
      console.log('Task toggled:', { taskId, newStatus }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Todo tracker with many tasks to demonstrate scrolling and varied states.',
      },
    },
  },
};