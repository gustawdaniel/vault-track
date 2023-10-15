# qif-ts

Typescript module to parse QIF files. Tries to provide a one-to-one mapping of the physical model into a typed object. Only primitives are converted, dates are read in the format given and provided as strings for the user to parse as they like.

Uses the specification [here](https://web.archive.org/web/20100222214101/http://web.intuit.com/support/quicken/docs/d_qif.html) as a source of truth.

If you require date parsing, or a CLI tool, please look into [qif2json](https://www.npmjs.com/package/qif2json), which provided a basis for much of this library.

## Installing and using

`$ npm install --save qif-ts`

### Typescript

```typescript
import { deserializeQif, serializeQif, QifData } from 'qif-ts';

const qifData: QifData = deserializeQif(qifText);
const qifText: string = serializeQif(qifData);
```

### Javascript

Although designed for typescript applications, qif-ts will also integrate fine into javascript projects.

```javascript
const qifTs = require('qif-ts');

const qifData = qifTs.deserializeQif(qifText);
const qifText = qifTs.serializeQif(qifData);
```

## Changelog

* `0.0.1` Support for Investment, Bank, Cash, Card, Other Asset and Other Liability QIF file types
* `0.0.2` Handles low quality inputs with more descriptive errors
* `1.0.0` Refactoring and addition of TsDoc documentation. 
    * `qifToJson` to `deserializeQif`
    * `jsonToQif` to `serializeQif`