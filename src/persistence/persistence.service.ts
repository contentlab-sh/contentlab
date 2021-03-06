import { v4 as uuidv4 } from 'uuid'
import { CommitApiService } from '../git/gitlab/commit-api.service'
import { Injectable, NotFoundException } from '@nestjs/common'
import { QueryApiService } from '../git/gitlab/query-api.service'
import { ContentEntry } from '../git/model/content-entry'

@Injectable()
export class PersistenceService {
  constructor(
    private readonly commitApi: CommitApiService,
    private readonly queryApi: QueryApiService,
  ) {}

  public async getTypeById(ref: string, id: ID): Promise<string> {
    const allEntries = await this.queryApi.getContentEntries(ref)
    const requestedEntry = allEntries.filter(
      (contentEntry: ContentEntry) => contentEntry.id === (id as string),
    )[0]
    if (requestedEntry === undefined) {
      throw new NotFoundException(id)
    }

    return requestedEntry.metadata.type
  }

  public async findById(ref: string, id: ID): Promise<Entry> {
    const allEntries = await this.queryApi.getContentEntries(ref)
    const requestedEntry = allEntries.filter(
      (contentEntry: ContentEntry) => contentEntry.id === (id as string),
    )[0]
    if (requestedEntry === undefined) {
      throw new NotFoundException(id)
    }

    return { ...requestedEntry.data, id: id }
  }

  public async findByType(ref: string, type: string): Promise<Entry[]> {
    const allEntries = await this.queryApi.getContentEntries(ref)
    return allEntries
      .filter(
        (contentEntry: ContentEntry) => contentEntry.metadata.type === type,
      )
      .map((value) => ({ ...value.data, id: value.id }))
  }

  public async findByTypeId(ref: string, type: string, id: ID): Promise<Entry> {
    const allEntries = await this.queryApi.getContentEntries(ref)
    const requestedEntry = allEntries.filter(
      (contentEntry: ContentEntry) => contentEntry.id === (id as string),
    )[0]
    if (requestedEntry === undefined || requestedEntry.metadata.type !== type) {
      throw new NotFoundException({ type, id })
    }

    return { ...requestedEntry.data, id: id }
  }

  public async createType(
    ref: string,
    type: string,
    data: Entry,
    message: string,
  ): Promise<CommitResult> {
    const id = uuidv4()
    const commit = await this.commitApi.createCommit({
      ref: ref,
      contentEntries: [
        {
          id: id,
          data: data,
          metadata: {
            type: type,
          },
          deletion: false,
        },
      ],
      message: message,
    })

    return {
      id,
      ref: commit.ref,
    }
  }

  public async updateByTypeId(
    ref: string,
    type: string,
    id: ID,
    data: Entry,
    message: string,
  ): Promise<CommitResult> {
    const allEntries = await this.queryApi.getContentEntries(ref)
    const requestedEntry = allEntries.filter(
      (contentEntry: ContentEntry) => contentEntry.id === (id as string),
    )[0]
    if (requestedEntry === undefined || requestedEntry.metadata.type !== type) {
      throw new NotFoundException({ type, id })
    }

    const newData: Entry = { ...requestedEntry.data, ...data }

    const commit = await this.commitApi.createCommit({
      ref: ref,
      contentEntries: [
        {
          id: id,
          data: newData,
          metadata: requestedEntry.metadata,
          deletion: false,
        },
      ],
      message: message,
    })

    return {
      id,
      ref: commit.ref,
    }
  }

  public async deleteByTypeId(
    ref: string,
    type: string,
    id: ID,
    data: Entry,
    message: string,
  ): Promise<CommitResult> {
    const allEntries = await this.queryApi.getContentEntries(ref)
    const requestedEntry = allEntries.filter(
      (contentEntry: ContentEntry) => contentEntry.id === (id as string),
    )[0]
    if (requestedEntry === undefined || requestedEntry.metadata.type !== type) {
      throw new NotFoundException({ type, id })
    }

    const commit = await this.commitApi.createCommit({
      ref: ref,
      contentEntries: [
        {
          id: id,
          data: {},
          metadata: requestedEntry.metadata,
          deletion: true,
        },
      ],
      message: message,
    })

    return {
      id,
      ref: commit.ref,
    }
  }
}

export interface CommitResult {
  id: ID
  ref: string // commit sha
}

export type ID = string

export type Entry = Record<string, unknown>
