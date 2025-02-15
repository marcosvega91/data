import pluralize from 'pluralize'
import { RestContext, RestRequest, ResponseResolver, rest } from 'msw'
import { Entity, ModelDictionary, ModelAPI, PrimaryKeyType } from '../glossary'
import { GetQueryFor } from '../query/queryTypes'
import { OperationErrorType, OperationError } from '../errors/OperationError'

interface WeakQuerySelectorWhere<KeyType extends PrimaryKeyType> {
  [key: string]: Partial<GetQueryFor<KeyType>>
}

type RequestParams<Key extends PrimaryKeyType> = {
  [K in PrimaryKeyType]: PrimaryKeyType
}

export function createUrlBuilder(baseUrl?: string) {
  return (path: string) => {
    const url = new URL(path, baseUrl || 'http://localhost')
    return baseUrl ? url.toString() : url.pathname
  }
}

export function getResponseStatusByErrorType(error: OperationError): number {
  switch (error.type) {
    case OperationErrorType.EntityNotFound:
      return 404
    case OperationErrorType.DuplicatePrimaryKey:
      return 409
    default:
      return 500
  }
}

export function withErrors<RequestBodyType = any, RequestParamsType = any>(
  handler: ResponseResolver<
    RestRequest<RequestBodyType, RequestParamsType>,
    RestContext
  >,
): ResponseResolver<
  RestRequest<RequestBodyType, RequestParamsType>,
  RestContext
> {
  return (req, res, ctx) => {
    try {
      return handler(req, res, ctx)
    } catch (error) {
      return res(
        ctx.status(getResponseStatusByErrorType(error)),
        ctx.json({
          message: error.message,
        }),
      )
    }
  }
}

export function generateRestHandlers<
  Dictionary extends ModelDictionary,
  ModelName extends string
>(
  modelName: ModelName,
  primaryKey: PrimaryKeyType,
  model: ModelAPI<Dictionary, ModelName>,
  baseUrl: string = '',
) {
  const modelPath = pluralize(modelName)
  const buildUrl = createUrlBuilder(baseUrl)

  return [
    rest.get(
      buildUrl(modelPath),
      withErrors<Entity<Dictionary, ModelName>>((req, res, ctx) => {
        const cursor = req.url.searchParams.get('cursor')
        const rawSkip = req.url.searchParams.get('skip')
        const rawTake = req.url.searchParams.get('take')

        const skip = parseInt(rawSkip ?? '0', 10)
        const take = rawTake == null ? rawTake : parseInt(rawTake, 10)

        let options = { where: {} }

        if (take && !isNaN(take) && !isNaN(skip)) {
          options = Object.assign(options, { take, skip })
        }
        if (take && !isNaN(take) && cursor) {
          options = Object.assign(options, { take, cursor })
        }

        const records = model.findMany(options)

        return res(ctx.json(records))
      }),
    ),
    rest.get(
      buildUrl(`${modelPath}/:${primaryKey}`),
      withErrors<Entity<Dictionary, ModelName>, RequestParams<PrimaryKeyType>>(
        (req, res, ctx) => {
          const id = req.params[primaryKey]
          const where: WeakQuerySelectorWhere<typeof primaryKey> = {
            [primaryKey]: {
              equals: id,
            },
          }
          const entity = model.findFirst({
            strict: true,
            where: where as any,
          })

          return res(ctx.json(entity))
        },
      ),
    ),
    rest.post(
      buildUrl(modelPath),
      withErrors<Entity<Dictionary, ModelName>>((req, res, ctx) => {
        const createdEntity = model.create(req.body)
        return res(ctx.status(201), ctx.json(createdEntity))
      }),
    ),
    rest.put(
      buildUrl(`${modelPath}/:${primaryKey}`),
      withErrors<Entity<Dictionary, ModelName>, RequestParams<PrimaryKeyType>>(
        (req, res, ctx) => {
          const id = req.params[primaryKey]
          const where: WeakQuerySelectorWhere<typeof primaryKey> = {
            [primaryKey]: {
              equals: id,
            },
          }
          const updatedEntity = model.update({
            strict: true,
            where: where as any,
            data: req.body,
          })!

          return res(ctx.json(updatedEntity))
        },
      ),
    ),
    rest.delete(
      buildUrl(`${modelPath}/:${primaryKey}`),
      withErrors<Entity<Dictionary, ModelName>, RequestParams<PrimaryKeyType>>(
        (req, res, ctx) => {
          const id = req.params[primaryKey]
          const where: WeakQuerySelectorWhere<typeof primaryKey> = {
            [primaryKey]: {
              equals: id,
            },
          }
          const deletedEntity = model.delete({
            strict: true,
            where: where as any,
          })!

          return res(ctx.json(deletedEntity))
        },
      ),
    ),
  ]
}
