import fetch from 'node-fetch'
import { random } from 'faker'
import { setupServer } from 'msw/node'
import { factory, primaryKey, drop } from '../../src'

const db = factory({
  user: {
    id: primaryKey(random.uuid),
    firstName: String,
    age: Number,
  },
})

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  drop(db)
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

async function executeQuery(args: {
  query: string
  variables?: Record<string, any>
}) {
  const res = await fetch('http://localhost', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  })

  return res.json()
}

it('handles the "users" query', async () => {
  server.use(...db.user.toGraphQLHandlers('http://localhost'))
  db.user.create({ firstName: 'John' })
  db.user.create({ firstName: 'Kate' })
  db.user.create({ firstName: 'Joseph' })

  const res = await executeQuery({
    query: `
      query GetUsers {
        users {
          firstName
        }
      }
    `,
  })

  expect(res).toEqual({
    data: {
      users: [
        {
          firstName: 'John',
        },
        {
          firstName: 'Kate',
        },
        {
          firstName: 'Joseph',
        },
      ],
    },
  })
})

it('handles the "user" query', async () => {
  server.use(...db.user.toGraphQLHandlers('http://localhost'))
  db.user.create({ id: 'abc-123', firstName: 'John' })
  db.user.create({ id: 'def-456', firstName: 'Kate' })
  db.user.create({ id: 'ghi-789', firstName: 'Joseph' })

  const res = await executeQuery({
    query: `
      query GetUser($id: ID!) {
        user(id: $id) {
          id
          firstName
        }
      }
    `,
    variables: {
      id: 'def-456',
    },
  })

  expect(res).toEqual({
    data: {
      user: {
        id: 'def-456',
        firstName: 'Kate',
      },
    },
  })
})

it('handles the "createUser" mutation', async () => {
  server.use(...db.user.toGraphQLHandlers('http://localhost'))

  const res = await executeQuery({
    query: `
      mutation CreateUser($input: UserInput!) {
        createUser(input: $input) {
          firstName
          age
        }
      }
    `,
    variables: {
      input: {
        firstName: 'Kate',
        age: 27,
      },
    },
  })

  expect(res).toEqual({
    data: {
      createUser: {
        age: 27,
        firstName: 'Kate',
      },
    },
  })
})
