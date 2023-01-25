import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Raw } from 'typeorm';
import { NodeTypeName } from '../model/entities/NodeTypes';
import { RelationshipTypeName } from '../model/entities/RelationshipTypes';
import {
  Node,
  NodePropertyKey,
  NodePropertyValue,
  Relationship,
} from '../model/entities';

type StrongsWord = {
  strongsKey: string;
  word: string;
  definition: string;
};

@Injectable()
export class StrongsService {
  @InjectRepository(Node)
  private readonly nodeRepo: Repository<Node>;
  @InjectRepository(NodePropertyKey)
  private readonly nodePropertyKeyRepo: Repository<NodePropertyKey>;
  @InjectRepository(NodePropertyValue)
  private readonly nodePropertyValueRepo: Repository<NodePropertyValue>;
  @InjectRepository(Relationship)
  private readonly relationshipRepo: Repository<Relationship>;
  constructor() {}

  async getWordsInBook(bookId: string) {
    const book = await this.nodeRepo.findOne({
      where: {
        typeName: NodeTypeName.BOOK,
        id: bookId,
      },
    });

    if (!book) {
      return null;
    }

    const depth = 10;

    const passedNodes = new Map<string, Node>();

    let fromNodes: Node[] = [book];
    for (let range = 0; range < depth; range++) {
      const relations = await this.relationshipRepo.find({
        where: {
          fromNode: {
            id: In(fromNodes.map((n) => n.id)),
          },
        },
        relations: ['toNode'],
      });

      fromNodes = [];

      for (const rel of relations) {
        const node = rel.toNode;
        if (passedNodes.has(node.id)) continue;

        passedNodes.set(node.id, node);

        fromNodes.push(node);
      }
    }

    const filteredNodes: Node[] = [];

    for (const node of passedNodes.values()) {
      if (node.typeName === NodeTypeName.WORD) {
        filteredNodes.push(node);
      }
    }

    const relationshipsToStrongs = await this.relationshipRepo.find({
      where: {
        fromNode: {
          id: In(filteredNodes.map((n) => n.id)),
        },
        typeName: RelationshipTypeName.WORD_TO_STRONGS_ENTRY,
      },
      relations: [
        'toNode',
        'toNode.propertyKeys',
        'toNode.propertyKeys.values',
        'fromNode',
        'fromNode.propertyKeys',
        'fromNode.propertyKeys.values',
      ],
    });

    const words: StrongsWord[] = [];

    for (const rel of relationshipsToStrongs) {
      const word = rel.fromNode.propertyKeys?.[0]?.values?.[0].value
        ?.value as string;
      const strongsKey = rel.toNode.propertyKeys?.filter(
        (k) => k.key === 'strongs_id',
      )[0]?.values?.[0].value?.value as string;

      const definition = rel.toNode.propertyKeys?.filter(
        (k) => k.key === 'strongs_def',
      )[0]?.values?.[0].value?.value as string;

      if (word && definition && strongsKey) {
        words.push({
          definition,
          strongsKey,
          word,
        });
      }
    }

    return words;
  }
}
