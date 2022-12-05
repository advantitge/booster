import { Collection, Document, Filter, MongoClient, OptionalUnlessRequiredId } from 'mongodb'

export class Registry<T extends Document> {
  private client: MongoClient
  private collection: Collection<T>

  public constructor(url: string, collectionName: string) {
    this.client = new MongoClient(url)
    this.collection = this.client.db().collection(collectionName)
    void this.client.connect()
  }

  public async destroy(): Promise<void> {
    await this.client.close()
  }

  public async query(query: Filter<T>): Promise<Array<T>> {
    return this.collection.find<T>(query).sort({ createdAt: 1 }).toArray()
  }

  public async queryLatest(query: Filter<T>): Promise<T | null> {
    const results = await this.collection.find<T>(query).sort({ createdAt: -1 }).limit(1).toArray()
    return results?.[0] || null
  }

  public async upsert(query: Filter<T>, item: T): Promise<void> {
    await this.collection.replaceOne(query, item, { upsert: true })
  }

  public async insert(item: OptionalUnlessRequiredId<T>): Promise<void> {
    await this.collection.insertOne(item)
  }

  public async deleteAll(): Promise<number> {
    const { deletedCount } = await this.collection.deleteMany({})
    return deletedCount
  }
}
