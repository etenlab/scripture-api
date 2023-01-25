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

  async getWordsInBook(bookId: string, limit: number, offset: number) {
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
      const uniqueWordRef = `${s.props[WORD_TEXT_PROP_NAME]}/${s.props[WORD_STRONGS_REF_PROP_NAME]}`;

      if (strongWordSet.has(uniqueWordRef)) {
        continue;
      }

      strongWordSet.add(uniqueWordRef);

      uniqueSimplifiedWords.push(s);
    }

    const sordedById = uniqueSimplifiedWords.sort((a, b) => {
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });

    const sliced = sordedById.slice(offset, offset + limit);

    const strongsDict = await this.strongsDictRepo.find({
      where: {
        strongsId: In(sliced.map((n) => n.props[WORD_STRONGS_REF_PROP_NAME])),
      },
    });

    const words: Word[] = [];
    const strongsMap = new Map<string, StrongsDictionary>();

    strongsDict.forEach((s) => strongsMap.set(s.strongsId, s));

    for (const w of sliced) {
      const word: Word = {
        id: w.id,
        text: w.props.text,
      };

      const sStrongs = strongsMap.get(w.props[WORD_STRONGS_REF_PROP_NAME]);

      if (!sStrongs) {
        words.push(word);
        continue;
      }

      word.strongsWord = {
        id: sStrongs.nodeId,
        strongsDef: sStrongs.strongsDef,
        strongsId: sStrongs.strongsId,
      };

      words.push(word);
    }

    return words;
  }
}
