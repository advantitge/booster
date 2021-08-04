import { Db, MongoClient } from 'mongodb'

type Connection = { client: MongoClient; db: Db }
let connection: Connection
let promise: Promise<Connection>

export async function getConnection() {
    if (connection) return connection
    if (!promise) {
        if (!process.env.DB_URI) throw Error('Environment variable DB_URI is required')
        promise = MongoClient.connect(process.env.DB_URI).then((client) => ({ client, db: client.db() }))
    }
    connection = await promise
    return connection
}

export async function getCollection(collectionName: string) {
    return (await getConnection()).db.collection(collectionName)
}
