import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink, Observable } from '@apollo/client'
import { createAuthLink } from 'aws-appsync-auth-link'
import { CognitoIdentityClient, GetIdCommand, GetCredentialsForIdentityCommand } from '@aws-sdk/client-cognito-identity'
import { getDefinition } from './mockLink'

const url = import.meta.env.VITE_APPSYNC_ENDPOINT ?? ''
const region = import.meta.env.VITE_APPSYNC_REGION ?? 'eu-west-2'
const identityPoolId = import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID ?? ''

const useMock = !url

function createMockLink(): ApolloLink {
  return new ApolloLink((operation) => {
    return new Observable((observer) => {
      const result = getDefinition(operation)
      // Simulate network delay
      setTimeout(() => {
        observer.next({ data: result })
        observer.complete()
      }, 300)
    })
  })
}

function createAppSyncLink(): ApolloLink {
  const cognitoClient = new CognitoIdentityClient({ region })

  async function getCredentials() {
    const { IdentityId } = await cognitoClient.send(
      new GetIdCommand({ IdentityPoolId: identityPoolId }),
    )
    const { Credentials } = await cognitoClient.send(
      new GetCredentialsForIdentityCommand({ IdentityId }),
    )
    return {
      accessKeyId: Credentials!.AccessKeyId!,
      secretAccessKey: Credentials!.SecretKey!,
      sessionToken: Credentials!.SessionToken!,
    }
  }

  const authLink = createAuthLink({
    url,
    region,
    auth: {
      type: 'AWS_IAM',
      credentials: getCredentials,
    },
  })

  const httpLink = createHttpLink({ uri: url })
  return authLink.concat(httpLink)
}

export const client = new ApolloClient({
  link: useMock ? createMockLink() : createAppSyncLink(),
  cache: new InMemoryCache(),
})

if (useMock) {
  console.log('[GraphQL] Using mock data — set VITE_APPSYNC_ENDPOINT to use real backend')
}
