# Open Cash Manager

Free application for managing cash and synchronise with external sources of data.

## Warning - it is not stable application. Now it is still developed.

## Todo:

- web 
- sync with dropbox
- local storage
- mobile
- move data form csv to this system
- accounts
- transactions
- db schema

## Development

    cd web; npm run dev

## DB Schema

Account
- initial state
- name
- state
- currency

Category
- subcategory

Transaction
- date
- name
- value
- memo

From To Transaction extend Transaction
- from
- to

Account Transaction
- type (exp/income)
- category
- project
- status 

## Notes

Opinions from users of Cash Droid from website:

> http://forum.android.com.pl/topic/26350-cash-droid/?page=69

1) transakcje dzielone. Gdy już się trafi jakaś z taką możliwością to brak jej opcji która pozwoliłaby wygodnie "patrzeć w przyszłość" na podstawie zaplanowanych i cyklicznych transakcji. I nie chodzi mi o patrzenie na wykresie który na ekranie smartfona często jest po prostu zbyt mało czytelny. Chodzi mi o to co ma CashDroid czyli przeglądając listę transakcji konta mogę sobie pojechać "do góry" i widzę jak będzie się zmieniać saldo konta po każdym przyszłym wydatku.
2) Co do transakcji dzielonych to fakt, bardzo rzadko spotykana funkcjonalność. Jak tylko będzie dostępna w Finice (prawdopodobnie w Maju) - dam znać  Mi natomiast bardzo zależy na prostocie wprowadzania danych, intuicyjności, wyglądzie i personalizacji
3) Hejka. Też korzystam z cash droida i nie mogę znaleść nic podobnego w intuicyjnej prostocie obsługi. Szkoda, że nie rozwijana jest ta aplikacja. Finice właśnie zainstalowałem. Ma jeszcze trochę braków, ale jak autor wysłucha sugestii innych i wdroży je, będzie super. Mam nadzieję, że pożucę cash droid na rzecz Finice. Powodzenia
