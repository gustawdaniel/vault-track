# Open Cash Manager

Architecture:

UI (pinia) -> stream of atomic operations

First operation: account creation for unique id. This operation has assigned uuid by server.

Next, if you want to save, then send prev hash,
if it is different then you will get all operations from lash hash that you remember.

then:
a) revert your operations to this hash
b) apply operations from server
c) apply your operations

So any operation should be reversible.

In case of creation, reverse operation is deletion
In case of deletion, reversing operation should contain all deleted object properties to create is again
In case of update we need snapshot before update and after update

All resources have:
a) collection
b) id
c) data (general json)

op: c|u|d (create update delete)
id: uuid|mongoid
c: collection
0: initial state (without id)
1: final state (without id)

---

You should be able to download all by websocket and http to be updated

Backup of data should be available also, so you generally need data and last snapshot id for pure restore.
Last id should be attached to any server response.

Steps:

- create front
- create qif import
- create qif export
- create backend
- create account

QFI spec: http://moneymvps.org/articles/qifspecification.aspx

### Cleared Status

Cleared status. Values are blank (unreconciled/not cleared),
"*" or "c" (cleared) and "X" or "R" (reconciled).

| Sign | Meaning      | Docs                     |
|------|--------------|--------------------------|
|      | Unreconciled | unreconciled/not cleared | 
| *    | Cleared      | "*" or "c" (cleared)     |     
| X    | Reconciled   | "X" or "R" (reconciled)  |
| ?    | Void         | not mentioned            |

---

# Debug mode

Paste in console

```
postMessage({debug: false})
postMessage({debug: true})
```

Next tasks:

- split
    - amount
    - type Expense, Income, Transfer to, Transfer from
    - category
    - project
    - memo

- amountFrom
- amountTo
- exchange rate
- toAccount

Next tasks:

- categories view
    - list
    - add
    - edit
    - remove
- projects view
    - list
    - add
    - edit
    - remove
- currencies support
- exchange rates
- budgets
- schedules
- search
- reports
- database
- preferences
