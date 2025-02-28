import { datatype } from 'faker'
import { factory, primaryKey } from '@mswjs/data'

test('queries entities based on a boolean value', () => {
  const db = factory({
    book: {
      id: primaryKey(datatype.uuid),
      title: String,
      published: Boolean,
    },
  })

  db.book.create({
    title: 'The Winds of Winter',
    published: false,
  })
  db.book.create({
    title: 'New Spring',
    published: true,
  })
  db.book.create({
    title: 'The Doors of Stone',
    published: false,
  })
  db.book.create({
    title: 'The Fellowship of the Ring',
    published: true,
  })

  const firstPublished = db.book.findFirst({
    where: {
      published: {
        equals: true,
      },
    },
  })
  expect(firstPublished).toHaveProperty('title', 'New Spring')

  const allUnpublished = db.book.findMany({
    where: {
      published: {
        notEquals: true,
      },
    },
  })
  expect(allUnpublished).toHaveLength(2)

  const unpublishedTitles = allUnpublished.map((book) => book.title)
  expect(unpublishedTitles).toEqual([
    'The Winds of Winter',
    'The Doors of Stone',
  ])
})
