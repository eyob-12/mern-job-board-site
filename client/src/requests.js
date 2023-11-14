import { getAccessToken, isLoggedIn } from "./auth";
import { ApolloClient, HttpLink, ApolloLink, InMemoryCache, gql } from 'apollo-boost'

const endpointURL = 'http://localhost:9000/graphql/';

const authLink = new ApolloLink((operation, forward) => {
  // set auth header if is loggedIn
  if (isLoggedIn()) {
    operation.setContext({
      headers: {
        'authorization': `Bearer ${getAccessToken()}`
      }
    });
  }
  return forward(operation)
});

const client = new ApolloClient({
  // specify how to connect to the client(Http here)
  link: ApolloLink.from([
    authLink, // before preparing http request look authLink for setting auth header
    new HttpLink({ uri: endpointURL })
  ]),
  // cache requests
  cache: new InMemoryCache()
});

const jobDetailFragment = gql`
    fragment JobDetail on Job {
        id
        title
        company {
            id
            name
        }
        description
    }
`;

const loadJobsQuery = gql`{
    jobs {
        id
        title
        company{
            id
            name
        }
    }
}`;

const loadJobQuery = gql`
    query JobQuery($id: ID!){
        job(id:$id) {
            ...JobDetail
        }
    }
    ${jobDetailFragment}
`;

const createJobMutation = gql`
    mutation CreateJob($input: CreateJobInput){
        job: createJob(input: $input) {
            ...JobDetail
        }
    }
    ${jobDetailFragment}
`;

const loadCompanyQuery = gql`
    query CompanyQuery($id:ID!){
        company(id: $id){
            name
            description
            jobs {
                id
                title
            }
        }
    }`;

export async function loadJob(id) {
  const { data: { job } } = await client.query({ query: loadJobQuery, variables: { id } });
  return job
}

export async function loadCompany(id) {
  const { data: { company } } = await client.query({ query: loadCompanyQuery, variables: { id } });
  return company
}

export async function loadJobs() {
  // fetch policy no cache means it will be send to server every time
  // because we need to query each time loadJobs called because a new job could be created by someone else
  const { data: { jobs } } = await client.query({ query: loadJobsQuery, fetchPolicy: 'no-cache' });
  return jobs
}


export async function createJob(input) {
  const { data: { job } } = await client.mutate({
    mutation: createJobMutation,
    variables: { input },
    /*
     update will be called after mutation has been executed
     tell Apollo Client whenever run the current mutation take the data from returned response
     and save it to the cache as if it was the result of running createJobQuery for that specific job id
     So that we dont need to call loadJob when we are browsed to that jobs page
    */
    update: (cache, { data }) => {
      cache.writeQuery({
        query: loadJobQuery,
        variables: { id: data.job.id },
        data
      })
    }
  });
  return job
}


