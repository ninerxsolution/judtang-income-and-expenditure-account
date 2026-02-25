export const enDictionary = {
  common: {
    appName: "Judtang",
    appDescription:
      "Judtang Income and Expenditure Account is a platform for tracking and managing your personal or organizational financial transactions efficiently.",
    language: {
      english: "English",
      thai: "Thai",
    },
    actions: {
      save: "Save",
      cancel: "Cancel",
      close: "Close",
      back: "Back",
      open: "Open",
      add: "Add",
      edit: "Edit",
      delete: "Delete",
    },
    time: {
      justNow: "Just now",
      minutesAgo: "{count}m ago",
      hoursAgo: "{count}h ago",
      daysAgo: "{count}d ago",
    },
  },
  auth: {
    signIn: {
      title: "Sign in",
      subtitle: "Sign in to access your Judtang dashboard.",
      emailLabel: "Email",
      passwordLabel: "Password",
      submit: "Sign in",
      noAccount: "Don't have an account?",
      registerCta: "Create one",
    },
    register: {
      title: "Create account",
      subtitle: "Register to start tracking income and expenses.",
      nameLabel: "Name",
      emailLabel: "Email",
      passwordLabel: "Password",
      confirmPasswordLabel: "Confirm password",
      submit: "Create account",
      haveAccount: "Already have an account?",
      signInCta: "Sign in",
    },
    logout: {
      button: "Log out",
    },
  },
  dashboard: {
    sidebar: {
      dashboard: "Dashboard",
      calendar: "Calendar",
      transactions: "Transactions",
      newTransaction: "New transaction",
      transactionsList: "Transaction list",
      tools: "Tools",
      settings: "Settings",
      activityLog: "Activity log",
    },
    pageTitle: {
      dashboard: "Dashboard",
      calendar: "Calendar",
      transactionsNew: "New transaction",
      transactionsList: "Transactions",
      tools: "Tools",
      settings: "Settings",
      activityLog: "Activity log",
      sessions: "Sessions",
    },
  },
  settings: {
    title: "Settings",
    description: "Manage your activity log, data tools, and active sessions.",
    language: {
      title: "Language",
      titleWithNative: "Language / ภาษา",
      description: "Choose your preferred language for the interface.",
      optionEnglish: "English",
      optionThai: "ภาษาไทย",
      helper: "Your choice will apply across the whole dashboard.",
    },
    activityLog: {
      title: "Activity Log",
      description: "View a complete audit trail of important actions in your account.",
      open: "Open Activity Log",
    },
    sessions: {
      title: "Sessions",
      description: "Quickly review and revoke active sessions on your account.",
      loading: "Loading sessions…",
      error: "Failed to load sessions",
      empty: "No active sessions.",
      thisDevice: "(this device)",
      lastActivePrefix: "Last active {relative}",
      otherDevicesSummarySingular: "{count} session on other devices.",
      otherDevicesSummaryPlural: "{count} sessions on other devices.",
      manageAll: "Manage all sessions",
      revoke: "Revoke",
    },
  },
};

export type EnDictionary = typeof enDictionary;

