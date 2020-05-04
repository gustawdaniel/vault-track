export const formatYMD = date => new Intl.DateTimeFormat('pl-PL', {day: '2-digit', month: '2-digit', year: 'numeric'})
  .formatToParts(new Date(date)).reverse().map(p => p.value.replace('.','-')).reduce((str, part) => str + part)

export const formatHuman = date => {
  try {
    return new Intl.DateTimeFormat('pl-PL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
      .format(new Date(date))
  } catch (e) {
    return new Date(NaN)
  }
}
