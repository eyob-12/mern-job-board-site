const { ApolloServer, gql } = require('apollo-server-express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const express = require('express');
const expressJwt = require('express-jwt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const port = 9000;
const jwtSecret = Buffer.from('Zn8Q5tyZ/G1MHltc4F/gTkVJMlrbKiZt', 'base64');

const app = express();
app.use(cors(), bodyParser.json(), expressJwt({
  secret: jwtSecret,
  credentialsRequired: false
}));

// Load Type Definitions
const typeDefs = gql(fs.readFileSync('./schema.graphql', {encoding: 'utf-8'}));
// Load Resolvers
const resolvers = require('./resolvers');
// GraphQL Server
const graphqlServer = new ApolloServer({
  typeDefs,
  resolvers,
  // fetch user by passing jwt token do db.users.get() func
  context: ({ req }) =>  ({ user: req.user && db.users.get(req.user.sub) }) // req.user comes from express-jwt
});
graphqlServer.applyMiddleware({ app });


app.post('/login', (req, res) => {
  const {email, password} = req.body;
  const user = db.users.list().find((user) => user.email === email);
  if (!(user && user.password === password)) {
    res.sendStatus(401);
    return;
  }
  const token = jwt.sign({sub: user.id}, jwtSecret);
  res.send({token});
});

app.listen(port, () => console.info(`Server started on port ${port}`));
