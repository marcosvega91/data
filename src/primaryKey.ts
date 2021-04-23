import { PrimaryKeyDeclaration, PrimaryKeyType } from './glossary'

export function primaryKey<KeyType extends PrimaryKeyType>(
  getValue: () => KeyType,
): PrimaryKeyDeclaration<KeyType> {
  return {
    isPrimaryKey: true,
    getValue,
  }
}
