const { Client } = require('pg');
const client = new Client({
  connectionString:
    'postgresql://postgres:postgres@127.0.0.1:5432/medicalink_provider',
});
client
  .connect()
  .then(() => {
    return client.query('SELECT id FROM "Doctor" LIMIT 1');
  })
  .then((res) => {
    console.log('Sample doctor ID:', res.rows[0]?.id);
    return client.query('SELECT * FROM "OfficeHours" LIMIT 1');
  })
  .then((res) => {
    console.log('Sample office hours:', res.rows[0]);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
