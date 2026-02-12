import { Class } from 'type-fest'

export interface RefAssociationMetadata {
  kind: '1:1' | 'm:1'
  type: () => Class<object>
}

export interface CollectionAssociationMetadata {
  kind: '1:m' | 'm:n'
  type: () => Class<object>
}

export type AssociationMetadata = RefAssociationMetadata | CollectionAssociationMetadata
