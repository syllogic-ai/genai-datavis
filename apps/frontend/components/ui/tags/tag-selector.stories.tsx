import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { TagSelector, type TagItem } from './tag-selector';
import { 
  FileText, 
  Code, 
  Settings, 
  GitBranch, 
  Database, 
  Package,
  Folder,
  FileCode,
  FileJson,
  Image,
  FileSpreadsheet,
  BookOpen,
  Terminal,
  Globe,
  Lock
} from 'lucide-react';

// Sample data representing different file types and categories
const sampleItems: TagItem[] = [
  // Code files
  {
    id: 'app-tsx',
    label: 'App.tsx',
    icon: Code,
    category: 'React Components',
  },
  {
    id: 'utils-ts',
    label: 'utils.ts',
    icon: FileCode,
    category: 'TypeScript',
  },
  {
    id: 'api-routes',
    label: 'api/routes.py',
    icon: Code,
    category: 'Python',
  },
  {
    id: 'hooks-ts',
    label: 'hooks.ts',
    icon: FileCode,
    category: 'React Components',
  },
  
  // Configuration files
  {
    id: 'package-json',
    label: 'package.json',
    icon: FileJson,
    category: 'Configuration',
  },
  {
    id: 'tsconfig',
    label: 'tsconfig.json',
    icon: Settings,
    category: 'Configuration',
  },
  {
    id: 'eslint-config',
    label: '.eslintrc.js',
    icon: Settings,
    category: 'Configuration',
  },
  
  // Documentation
  {
    id: 'readme',
    label: 'README.md',
    icon: BookOpen,
    category: 'Documentation',
  },
  {
    id: 'api-docs',
    label: 'API.md',
    icon: FileText,
    category: 'Documentation',
  },
  
  // Git & Version Control
  {
    id: 'gitignore',
    label: '.gitignore',
    icon: GitBranch,
    category: 'Git',
  },
  
  // Database & Data
  {
    id: 'schema-sql',
    label: 'schema.sql',
    icon: Database,
    category: 'Database',
  },
  {
    id: 'data-csv',
    label: 'data.csv',
    icon: FileSpreadsheet,
    category: 'Data',
  },
  
  // Assets & Media
  {
    id: 'logo-png',
    label: 'logo.png',
    icon: Image,
    category: 'Assets',
  },
  
  // Build & Deployment
  {
    id: 'dockerfile',
    label: 'Dockerfile',
    icon: Package,
    category: 'Deployment',
  },
  
  // Security & Environment
  {
    id: 'env-example',
    label: '.env.example',
    icon: Lock,
    category: 'Environment',
  },
];

const meta = {
  title: 'UI/Tags/TagSelector',
  component: TagSelector,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A multi-select tag component system that replicates Cursor\'s "Add Context" functionality.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <Story />
        </div>
      </div>
    ),
  ],
  argTypes: {
    onSelectionChange: { action: 'selection changed' },
    availableItems: { control: false }, // Don't allow editing complex objects
    selectedItems: { control: false },
    placeholder: { control: 'text' },
    triggerLabel: { control: 'text' },
    searchPlaceholder: { control: 'text' },
    emptyStateMessage: { control: 'text' },
    maxSelections: { control: 'number' },
    disabled: { control: 'boolean' },
    className: { control: 'text' },
    displayOnlyRemaining: { 
      control: 'boolean',
      description: 'When true, only shows unselected items in the command menu'
    },
  },
} satisfies Meta<typeof TagSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive wrapper for better demonstration
function InteractiveTagSelector(args: any) {
  const [selectedItems, setSelectedItems] = React.useState<TagItem[]>(args.selectedItems || []);
  
  return (
    <TagSelector
      {...args}
      selectedItems={selectedItems}
      onSelectionChange={(items) => {
        setSelectedItems(items);
        args.onSelectionChange?.(items);
      }}
    />
  );
}

export const Default: Story = {
  render: InteractiveTagSelector,
  args: {
    availableItems: sampleItems,
    selectedItems: [],
    onSelectionChange: (items: TagItem[]) => console.log('Selection changed:', items),
    placeholder: "Add Context",
    triggerLabel: "Add Context",
    searchPlaceholder: "Search files...",
    emptyStateMessage: "No files found",
    displayOnlyRemaining: false,
  },
};

export const WithPreselectedItems: Story = {
  render: InteractiveTagSelector,
  args: {
    availableItems: sampleItems,
    selectedItems: [
      sampleItems[0], // App.tsx
      sampleItems[4], // package.json
      sampleItems[7], // README.md
    ],
    onSelectionChange: (items: TagItem[]) => console.log('Selection changed:', items),
    placeholder: "Add Context",
    triggerLabel: "Add Context",
    searchPlaceholder: "Search files...",
    emptyStateMessage: "No files found",
    displayOnlyRemaining: false,
  },
};

export const WithMaxSelections: Story = {
  render: InteractiveTagSelector,
  args: {
    availableItems: sampleItems,
    selectedItems: [sampleItems[0], sampleItems[1]],
    maxSelections: 3,
    onSelectionChange: (items: TagItem[]) => console.log('Selection changed:', items),
    placeholder: "Add Context",
    triggerLabel: "Add Context",
    searchPlaceholder: "Search files...",
    emptyStateMessage: "No files found",
    displayOnlyRemaining: false,
  },
};

export const DisabledState: Story = {
  render: InteractiveTagSelector,
  args: {
    availableItems: sampleItems,
    selectedItems: [sampleItems[0]],
    disabled: true,
    onSelectionChange: (items: TagItem[]) => console.log('Selection changed:', items),
    placeholder: "Add Context",
    triggerLabel: "Add Context",
    searchPlaceholder: "Search files...",
    emptyStateMessage: "No files found",
    displayOnlyRemaining: false,
  },
};

export const CustomLabels: Story = {
  render: InteractiveTagSelector,
  args: {
    availableItems: sampleItems.slice(0, 5),
    selectedItems: [],
    onSelectionChange: (items: TagItem[]) => console.log('Selection changed:', items),
    placeholder: "Select Files",
    triggerLabel: "Select Files",
    searchPlaceholder: "Type to search files...",
    emptyStateMessage: "No matching files found",
    displayOnlyRemaining: false,
  },
};

export const EmptyState: Story = {
  render: InteractiveTagSelector,
  args: {
    availableItems: [],
    selectedItems: [],
    onSelectionChange: (items: TagItem[]) => console.log('Selection changed:', items),
    placeholder: "Add Context",
    triggerLabel: "Add Context",
    searchPlaceholder: "Search files...",
    emptyStateMessage: "No files available",
    displayOnlyRemaining: false,
  },
};

export const DisplayOnlyRemaining: Story = {
  render: InteractiveTagSelector,
  args: {
    availableItems: sampleItems,
    selectedItems: [sampleItems[0], sampleItems[1]],
    displayOnlyRemaining: true,
    onSelectionChange: (items: TagItem[]) => console.log('Selection changed:', items),
    placeholder: "Add Context",
    triggerLabel: "Add Context",
    searchPlaceholder: "Search files...",
    emptyStateMessage: "No files found",
  },
  parameters: {
    docs: {
      description: {
        story: 'When displayOnlyRemaining is true, selected items are hidden from the command menu.',
      },
    },
  },
};

export const DisplayAllItems: Story = {
  render: InteractiveTagSelector,
  args: {
    availableItems: sampleItems,
    selectedItems: [sampleItems[0], sampleItems[1]],
    displayOnlyRemaining: false,
    onSelectionChange: (items: TagItem[]) => console.log('Selection changed:', items),
    placeholder: "Add Context",
    triggerLabel: "Add Context",
    searchPlaceholder: "Search files...",
    emptyStateMessage: "No files found",
  },
  parameters: {
    docs: {
      description: {
        story: 'When displayOnlyRemaining is false (default), all items including selected ones are shown in the command menu with check marks.',
      },
    },
  },
};