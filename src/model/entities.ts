/**
 * All entitites are exported from here for the next reasons:
 * - to make it easier to synchronize them across different repos
 * - to make it easier to generate entities from the database
 *
 * Use this command to pull new entities from the database:
 * npx typeorm-model-generator -h postgres -d eil -u postgres -x example -e postgres -o ./src/model
 */

import { Node } from './entities/Nodes';
import { NodePropertyKey } from './entities/NodePropertyKeys';
import { Relationship } from './entities/Relationships';
import { NodeType } from './entities/NodeTypes';
import { NodePropertyValue } from './entities/NodePropertyValues';
import { RelationshipPropertyKey } from './entities/RelationshipPropertyKeys';
import { RelationshipPropertyValue } from './entities/RelationshipPropertyValues';
import { RelationshipType } from './entities/RelationshipTypes';
import { StrongsDictionary } from './entities/StrongsDictionaryViewEntity';

export const entities = [
  Node,
  NodeType,
  NodePropertyKey,
  Relationship,
  NodePropertyValue,
  RelationshipPropertyKey,
  RelationshipPropertyValue,
  RelationshipType,
  StrongsDictionary,
];

export {
  Node,
  NodeType,
  NodePropertyKey,
  Relationship,
  NodePropertyValue,
  RelationshipPropertyKey,
  RelationshipPropertyValue,
  RelationshipType,
  StrongsDictionary,
};

export default entities;
