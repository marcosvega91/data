import { drop, factory, identity, primaryKey } from '@mswjs/data'

test('drops all records in the database', () => {
  const db = factory({
    user: {
      id: primaryKey(identity('abc-123')),
    },
  })

  db.user.create()
  expect(db.user.getAll()).toHaveLength(1)

  drop(db)
  expect(db.user.getAll()).toHaveLength(0)
})

test('does nothing when the database is already empty', () => {
  const db = factory({
    user: {
      id: primaryKey(identity('abc-123')),
    },
  })

  db.user.create()
  db.user.delete({
    where: {
      id: {
        equals: 'abc-123',
      },
    },
  })

  expect(db.user.getAll()).toHaveLength(0)

  drop(db)
  expect(db.user.getAll()).toHaveLength(0)
})
