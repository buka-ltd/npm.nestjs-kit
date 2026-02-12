import * as R from 'ramda'
import { EntityMetadata, MetadataStorage, EntityProperty } from '@mikro-orm/core'
import { Type } from '@nestjs/common'


export function getMetadata<T>(classRef: Type<T>): EntityProperty<T>[] {
  const metadatas: EntityMetadata<T>[] = []

  let parent: any = classRef
  do {
    const meta = MetadataStorage.getMetadataFromDecorator(parent)
    if (meta instanceof EntityMetadata) metadatas.push(meta)
    parent = Object.getPrototypeOf(parent)
  } while (parent && parent !== Object.prototype)

  return R.unnest(metadatas.map((meta) => R.values(meta.properties)))
}
