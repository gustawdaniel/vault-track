export default {
  pages: {
    index: 'Konta',
    'account-edit': 'Edycja Konta',
    transactions: 'Transakcje',
    'transactions-add': 'Dodaj transakcję',
    'account-add': 'Dodaj konto',
    'not-known': 'Nie znana',
    'transactions-edit': 'Transakcja',
    categories: 'Kategorie',
    projects: 'Projekty',
    settings: 'Ustawienia',
    cloud: 'Synchronizacja'
  },
  account: {
    edit: 'Edytuj konto',
    remove: 'Usuń konto',
    show: 'Pokaż zamknięte/ukryte',
    name: 'Nazwa konta',
    type: 'Typ konta',
    currency: 'Waluta',
    description: 'Opis',
    'show-box': 'Konto zamknięte/ukryte',
    order: 'Kolejność sortowania',
    add: 'Dodaj konto',
    'really-remove': 'Czy na pewno chcesz usunąć wskazane konto?'
  },
  common: {
    save: 'Zapisz',
    back: 'Wróć',
    database: 'Baza danych',
    settings: 'Ustawienia',
    cancel: 'Anuluj',
    confirm: 'Ok'
  },
  transfer: {
    from: 'Transfer z {name}',
    to: 'Transfer na {name}',
  },
  schedule: {
    create: 'Stwórz harmonogram'
  },
  transaction: {
    'order': 'Porządek sortowania',
    'really-remove': 'Czy na pewno chcesz usunąć wskazaną transakcję?',
    edit: 'Edytuj transakcję',
    remove: 'Usuń transakcję',
    copy: 'Kopiuj transakcję',
    'conversion-rate': 'Kurs wymiany',
    payee: 'Odbiorca/Towar',
    account: 'Konto',
    'from-account': 'Z konta',
    'to-account': 'Na konto',
    'from-status': 'Status (z konta)',
    'to-status': 'Status (na konto)',
    'from-amount': 'Wypłata',
    'to-amount': 'Wpłata',
    split: 'Transakcja dzielona',
    date: 'Data',
    amount: 'Kwota',
    type: 'Rodzaj',
    category: 'Kategoria',
    project: 'Projekt',
    status: 'Status',
    description: 'Opis',
    statuses: {
      n: 'Nieuzgodniona',
      s: 'Rozliczona',
      a: 'Uzgodniona',
      d: 'Unieważniona'
    },
    types: {
      i: 'Przychód',
      c: 'Wydatek',
      t: 'Transfer'
    }
  },
  category: {
    no: '[Brak kategorii]',
    add: '[Dodaj nową...]'
  },
  database: {
    import: "Importuj...",
    export: "Exportuj...",
    truncate: "Wykasuj dane.."
  },
  settings: {
    main: 'Główne',
    'default-lang': 'Domyślny język',
    'default-currency': 'Domyślna waluta',
    'default-currency-sentence': 'Domyślną walutą jest {currency}',
    'cloud-title': 'Usługi w chmurze (cloud storage)',
    'cloud-description': 'Użyj chmury (cloud storage) do przechowywania kopii zapasowych',
    pl: 'Polski',
    en: 'Angielski'
  },
  cloud: {
    auth: 'Autoryzacja',
    'auth-description': 'Musisz zezwolić na dostęp do usługi {provider} aby włączyć tę funkcję',
    cancel: 'Wycofaj autoryzację',
    'cancel-description':'Wyczyść dane autoryzacji',
    'sync-now': 'Synchronizuj teraz',
    'sync-now-not-yet': 'Synchronizacja nie została jeszcze wykonana',
    'sync-now-ago': 'Synchronizacja została wykonana {ago} temu',
    'sync-import': 'Imporuj dane',
    'sync-import-description': 'Wczytaj dane z chmury do aplikacji',
    'sync-export': 'Eksportuj dane',
    'sync-export-description': 'Wyślij dane z aplikacji do chmury'
  }
}
