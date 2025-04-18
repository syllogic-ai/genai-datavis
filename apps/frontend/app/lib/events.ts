// Simple event bus to handle chat-related events

type Listener<T = any> = (data: T) => void;

interface EventBus {
  on(event: string, callback: Listener): void;
  off(event: string, callback: Listener): void;
  emit(event: string, data?: any): void;
}

class ChatEventBus implements EventBus {
  private events: Record<string, Listener[]> = {};

  on(event: string, callback: Listener): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: Listener): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event: string, data?: any): void {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(data));
  }
}

// Create a singleton instance
export const chatEvents = new ChatEventBus();

// Event names
export const CHAT_EVENTS = {
  CHAT_RENAMED: 'chat_renamed',
}; 