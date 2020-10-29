export default {
  pages: {
    index: 'Accounts',
    'account-edit': 'Edit Account',
    transactions: 'Transactions',
    'transactions-add': 'Add transaction',
    'account-add': 'Add account',
    'not-known': 'Now known',
    'transactions-edit': 'Transaction',
    categories: 'Categories',
    projects: 'Projects',
    settings: 'Settings',
    cloud: 'Sync'
  },
  account: {
    edit: 'Edit Account',
    remove: 'Remove Account',
    show: 'Show closed/hidden',
    name: 'Name',
    type: 'Type',
    currency: 'Currency',
    description: 'Description',
    'show-box': 'Account hidden/closed',
    order: 'Sorting order',
    add: 'Add Account',
    'really-remove': 'Are you sure you want to remove selected account?'
  },
  common: {
    save: 'Save',
    back: 'Back',
    database: 'Database',
    settings: 'Settings',
    cancel: 'Cancel',
    confirm: 'Ok'
  },
  transfer: {
    from: 'Transfer from {name}',
    to: 'Transfer to {name}',
  },
  schedule: {
    create: 'Create schedule'
  },
  transaction: {
    'order': 'Order',
    'really-remove': 'Are you sure you want to remove selected transaction?',
    edit: 'Edit transaction',
    remove: 'Remove transaction',
    copy: 'Copy transaction',
    'conversion-rate': 'Conversion rate',
    payee: 'Payee/Commodity',
    account: 'Account',
    'from-account': 'From Account',
    'to-account': 'To Account',
    'from-status': 'Status (from account)',
    'to-status': 'Status (to account)',
    'from-amount': 'Withdrawal',
    'to-amount': 'Deposit',
    split: 'Split transaction',
    date: 'Date',
    amount: 'Amount',
    type: 'Type',
    category: 'Category',
    project: 'Project',
    status: 'Status',
    description: 'Description',
    statuses: {
      n: 'Not Agreed',
      s: 'Settled',
      a: 'Agreed',
      d: 'Revoked'
    },
    types: {
      i: 'Income',
      c: 'Outcome',
      t: 'Transfer'
    }
  },
  category: {
    no: 'No category',
    add: 'New category'
  },
  database: {
    import: "Import...",
    export: "Export...",
    truncate: "Truncate Data.."
  },
  settings: {
    main: 'Main',
    'default-lang': 'Default language',
    'default-currency': 'Default currency',
    'default-currency-sentence': 'Default currency is {currency}',
    'cloud-title': 'Services in cloud (cloud storage)',
    'cloud-description': 'Use cloud (cloud storage) to store backup copies',
    pl: 'Polish',
    en: 'English'
  },
  cloud: {
    auth: 'Authorization',
    'auth-description': 'You have to allow for access to service {provider} to enable this function',
    cancel: 'Cancel Authorization',
    'cancel-description': 'Clear authorization data',
    'sync-now': 'Sync now',
    'sync-now-not-yet': 'Sync was not done yet',
    'sync-now-ago': 'Sync was done {ago} ago',
    'sync-import': 'Import data',
    'sync-import-description': 'Download data from cloud to application',
    'sync-export': 'Export data',
    'sync-export-description': 'Upload data from application to cloud'
  }
}
