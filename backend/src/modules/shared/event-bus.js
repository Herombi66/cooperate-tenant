
const EventEmitter = require('events');

/**
 * Domain Event Bus
 * Manages event publishing and subscription for cross-module communication
 */
class DomainEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // Increase default limit
  }

  /**
   * Publish a domain event
   */
  publish(eventName, eventData) {
    const event = {
      name: eventName,
      data: eventData,
      timestamp: new Date().toISOString(),
      id: this.generateEventId()
    };
    
    console.log(`📢 Publishing event: ${eventName}`, eventData);
    this.emit(eventName, event);
    
    // Also emit a wildcard event for logging/monitoring
    this.emit('*', event);
    
    return event;
  }

  /**
   * Subscribe to a domain event
   */
  subscribe(eventName, handler) {
    this.on(eventName, handler);
    return () =&gt; this.unsubscribe(eventName, handler);
  }

  /**
   * Unsubscribe from a domain event
   */
  unsubscribe(eventName, handler) {
    this.off(eventName, handler);
  }

  /**
   * Subscribe once to a domain event
   */
  once(eventName, handler) {
    super.once(eventName, handler);
  }

  /**
   * Generate a unique event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create singleton instance
const eventBus = new DomainEventBus();

// Predefined domain event names
const DomainEvents = {
  // User events
  USER_CREATED: 'user:created',
  USER_UPDATED: 'user:updated',
  USER_DELETED: 'user:deleted',
  USER_LOGGED_IN: 'user:logged-in',
  USER_LOGGED_OUT: 'user:logged-out',
  
  // Member events
  MEMBER_CREATED: 'member:created',
  MEMBER_UPDATED: 'member:updated',
  MEMBER_DELETED: 'member:deleted',
  
  // Member application events
  MEMBER_APPLICATION_SUBMITTED: 'member-application:submitted',
  MEMBER_APPLICATION_APPROVED: 'member-application:approved',
  MEMBER_APPLICATION_REJECTED: 'member-application:rejected',
  
  // Contribution events
  CONTRIBUTION_CREATED: 'contribution:created',
  CONTRIBUTION_APPROVED: 'contribution:approved',
  CONTRIBUTION_REJECTED: 'contribution:rejected',
  
  // Loan events
  LOAN_APPLICATION_SUBMITTED: 'loan-application:submitted',
  LOAN_APPLICATION_APPROVED: 'loan-application:approved',
  LOAN_APPLICATION_REJECTED: 'loan-application:rejected',
  LOAN_DISBURSED: 'loan:disbursed',
  LOAN_REPAID: 'loan:repaid',
  LOAN_DEFAULTED: 'loan:defaulted',
  
  // Withdrawal events
  WITHDRAWAL_REQUESTED: 'withdrawal:requested',
  WITHDRAWAL_APPROVED: 'withdrawal:approved',
  WITHDRAWAL_REJECTED: 'withdrawal:rejected',
  WITHDRAWAL_COMPLETED: 'withdrawal:completed',
  
  // Expense events
  EXPENSE_CREATED: 'expense:created',
  EXPENSE_APPROVED: 'expense:approved',
  EXPENSE_REJECTED: 'expense:rejected',
  
  // Settings events
  SETTINGS_UPDATED: 'settings:updated',
  
  // Communication events
  NOTIFICATION_SENT: 'notification:sent',
  EMAIL_SENT: 'email:sent',
  SMS_SENT: 'sms:sent'
};

module.exports = {
  eventBus,
  DomainEvents
};
