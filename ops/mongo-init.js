// First database startup only. The API gets readWrite on shipyard, never the root account.
// compose.yaml supplies the password; deploy/base/mongo.yaml mounts the same logic in a ConfigMap.
db.getSiblingDB('shipyard').createUser({
  user: 'shipyard',
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: 'readWrite', db: 'shipyard' }],
});
