import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { HttpModule, HttpService } from '@nestjs/axios';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { entities } from './model/entities';
import { StrongsController } from './strongs/strongs.controller';
import { StrongsService } from './strongs/strongs.service';
import { BookResolver } from './book/book.resolver';
import { BookService } from './book/book.service';
import { GraphService } from './graph/graph.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: entities,
        synchronize: false,
        logging: true,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature(entities),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
    }),
    HttpModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController, StrongsController],
  providers: [
    AppService,
    StrongsService,
    BookResolver,
    BookService,
    GraphService,
  ],
  exports: [],
})
export class AppModule {
  constructor(private readonly config: ConfigService) {}
}
