import { Collection, Filter, MongoClient, OptionalId } from 'mongodb'

export class Registry<T> {
  private client: MongoClient
  private collection: Collection<T>

  public constructor(url: string, collectionName: string) {
    this.client = new MongoClient(url)
    this.collection = this.client.db().collection(collectionName)
    void this.client.connect()
  }

  public async query(query: Filter<T>): Promise<Array<T>> {
    return this.collection.find(query).sort({ createdAt: 1 }).toArray<T>()
  }

  public async queryLatest(query: Filter<T>): Promise<T | null> {
    const results = await this.collection.find(query).sort({ createdAt: -1 }).limit(1).toArray<T>()
    return results?.[0] || null
  }

  public async upsert(query: Filter<T>, item: T): Promise<void> {
    await this.collection.replaceOne(query, item, { upsert: true })
  }

  public async insert(item: OptionalId<T>): Promise<void> {
    await this.collection.insertOne(item)
  }

  public async deleteAll(): Promise<number> {
    const { deletedCount } = await this.collection.deleteMany({})
    return deletedCount
  }
}
