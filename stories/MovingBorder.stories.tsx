import type { Meta, StoryObj } from '@storybook/react';
import { MovingBorderComponent } from '../components/ui/moving-border';

const meta = {
  title: 'UI/MovingBorder',
  component: MovingBorderComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    borderRadius: { control: 'text' },
    duration: { control: { type: 'number', min: 500, step: 100 } },
    as: { control: 'text' },
    containerClassName: { control: 'text' },
    borderClassName: { control: 'text' },
    className: { control: 'text' },
    animate: { control: 'boolean' },
  },
  args: {
    children: 'Moving Border',
    containerClassName: 'w-40 h-16',
  },
} satisfies Meta<typeof MovingBorderComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Static: Story = {
  args: {
    animate: false,
    children: 'Static Border',
  },
};

export const CustomRadius: Story = {
  args: {
    borderRadius: '2.5rem',
    duration: 2000,
    children: 'Rounded',
  },
};

export const DarkerGlow: Story = {
  args: {
    borderClassName:
      'opacity-100 bg-[radial-gradient(#22d3ee_40%,transparent_60%)]',
    children: 'Cyan Glow',
  },
};
