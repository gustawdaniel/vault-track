import urllib.request
import re
from datetime import datetime

date = datetime.today().strftime('%Y-%m-%d')
url = 'https://e-skupzlota.com.pl/tabela_cen/?v=' + date
file = url.replace('/', '-')
text = ''

try:
    page = open('cache/' + file)
    print("From Cache")
    text = page.read()
except FileNotFoundError:
    print("From Web")
    page = urllib.request.urlopen(url)
    urllib.request.urlretrieve(url, 'cache/' + file)
    text = open('cache/' + file).read()

match = re.search(
    r'<td style="text-align: left;">50 g</td>\n<td style="text-align: center;">\n([\d\.]+)',
    text,
    flags=re.MULTILINE
)

if match:
    print('At ' + date + ' 50g of GOLD price: ' + match.group(1))
else:
    print(match)
