import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GraphService, NodeSimplified } from '../graph/graph.service';
import { Node, StrongsDictionary } from '../model/entities';
import { NodeTypeName } from '../model/entities/NodeTypes';
import { RelationshipTypeName } from '../model/entities/RelationshipTypes';
import { Word } from '../scripture/word.model';
import { Book } from './book.model';
import {
  WORD_TEXT_PROP_NAME,
  WORD_STRONGS_REF_PROP_NAME,
} from '../scripture/contants';

@Injectable()
export class BookService {
  constructor(
    private readonly graphService: GraphService,
    @InjectRepository(StrongsDictionary)
    private readonly strongsDictRepo: Repository<StrongsDictionary>,
  ) {}

  async getAllBooks(): Promise<Omit<Book, 'words'>[]> {
    const books = await this.graphService.findNodesByType(NodeTypeName.BOOK, [
      'propertyKeys',
      'propertyKeys.values',
    ]);

    return books
      .map((b) => {
        const simplified = this.graphService.simplifyNodeGraph(b);

        return {
          id: simplified.id,
          name: simplified.props['id'],
        };
      })
      .filter((b) => b.name != null);
  }

  async getById(id: string) {
    const bookNode = await this.graphService.getNode(NodeTypeName.BOOK, id);

    if (!bookNode) return null;

    const resolved = await this.graphService.resolveGraphFromNodeDownstream(
      bookNode.id,
      0,
    );

    const b = this.graphService.simplifyNodeGraph(resolved);

    const book: Pick<Book, 'id' | 'name'> = {
      id: b.id,
      name: b.props['id'],
    };

    return book;
  }

  async getWordsInBook(bookId: string) {
    const book = await this.graphService.getNode(NodeTypeName.BOOK, bookId);

    if (!book) {
      return null;
    }

    const wordNodes = await this.graphService.findRelatedNodesDownstream(
      book,
      NodeTypeName.WORD,
      10,
      ['propertyKeys', 'propertyKeys.values'],
    );

    const strongWordSet = new Set<string>();
    const uniqueSimplifiedWords: NodeSimplified[] = [];

    for (const wordNode of wordNodes) {
      const s = this.graphService.simplifyNodeGraph(wordNode);
      const uniqueWordRef = `${s.props[
        WORD_TEXT_PROP_NAME
      ].toLocaleLowerCase()}/${s.props[WORD_STRONGS_REF_PROP_NAME]}`;

      if (strongWordSet.has(uniqueWordRef)) {
        continue;
      }

      strongWordSet.add(uniqueWordRef);

      uniqueSimplifiedWords.push(s);
    }

    return uniqueSimplifiedWords;
  }

  async resolveWords(
    simplifiedWords: NodeSimplified[],
    limit: number,
    offset: number,
  ): Promise<Word[]> {
    const sordedById = simplifiedWords.sort((a, b) => {
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });

    const sliced = sordedById.slice(offset, offset + limit);

    const relationsResolved =
      await this.graphService.resolveRelationshipsFromNodes(
        sliced.map((n) => n.id),
        {
          type: RelationshipTypeName.WORD_TO_STRONGS_ENTRY,
          resolveFrom: false,
          resolveTo: true,
        },
      );

    const strongsMap = new Map<string, { node: Node; relId: string }>();

    for (const rel of relationsResolved) {
      strongsMap.set(rel.fromNode.id, { node: rel.toNode, relId: rel.id });
    }

    const words: Word[] = [];

    for (const w of sliced) {
      const word: Word = {
        id: w.id,
        text: w.props.text,
      };

      const strongs = strongsMap.get(w.id);

      if (!strongs) {
        words.push(word);
        continue;
      }

      const sStrongs = this.graphService.simplifyNodeGraph(strongs.node);

      word.strongsWordRelationId = strongs.relId;

      word.strongsWord = {
        id: sStrongs.id,
        strongsDef: sStrongs.props['strongs_def'],
        strongsId: sStrongs.props['strongs_id'],
      };

      words.push(word);
    }

    return words;
  }
}
