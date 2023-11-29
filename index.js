const sqlite3 = require('sqlite3')
const open = require('sqlite').open
const fs = require('fs')
const process = require('process')

const filename = 'contacts.sqlite3'
const numContacts = parseInt(process.argv[2], 10);

const shouldMigrate = !fs.existsSync(filename)

/**
 * Generate `numContacts` contacts,
 * one at a time
 *
 */
function * generateContacts (numberContact) {
  for (let i = 1; i <= numContacts; i++) {
    yield [`name-${i}`, `email-${i}@domain.tld`];
  }
}

const migrate = async (db) => {
  console.log('Migrating db ...')
  await db.exec(`
        CREATE TABLE contacts(
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL
         )
     `)
  console.log('Done migrating db')
}

const insertContacts = async (db) => {
  console.log('Inserting contacts ...');
  let contactList = []
  let count = 0
  for (const contact of generateContacts()) {
    contactList.push(contact)
    count++;
    if (count%1000 === 0) {

      const placeholders = contactList.map(() => '(?, ?)').join(',');
      const values = contactList.flat();
      // const [name, email] = contact;
      await db.run('INSERT INTO contacts (name, email) VALUES ' + placeholders, values, (err) => {
        if (err) console.error(err);
      });
      contactList = [];
    }
  }
  console.log('Done inserting contacts');
}

const queryContact = async (db) => {
  const start = Date.now()
  const res = await db.get('SELECT name FROM contacts WHERE email = ?', [`email-${numContacts}@domain.tld`])
  if (!res || !res.name) {
    console.error('Contact not found')
    process.exit(1)
  }
  const end = Date.now()
  const elapsed = (end - start) / 1000
  console.log(`Query took ${elapsed} seconds`)
}

(async () => {
  const db = await open({
    filename,
    driver: sqlite3.Database
  })
  if (shouldMigrate) {
    await migrate(db)
  }
  await insertContacts(db)
  await queryContact(db)
  await db.close()
})()
