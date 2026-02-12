import { db } from './src/db/client';

const query = process.argv[2];

if (!query) {
    console.error('Please provide a SQL query as argument');
    process.exit(1);
}

console.log(`Executing: ${query}`);

db.execute(query).then((result) => {
    console.table(result.rows);
    process.exit(0);
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
