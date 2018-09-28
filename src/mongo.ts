import { Db, MongoClient } from 'mongodb'
import { Observable, Subject } from 'rxjs'
import { isBuffer } from 'util'

export class Mongo {
  private connected: boolean
  private connectionSubject: Subject<void>
  private url: string
  private db: Db
  private client: MongoClient

  constructor(url: string) {
    this.url = url
    this.connected = false
    this.connectionSubject = new Subject()
  }

  start(): void {
    MongoClient.connect(
      this.url,
      { useNewUrlParser: true },
      (err, client) => {
        if (err) {
          console.log('[MONGO] Error: Cannot connect to mongodb')
          // setTimeout(this.start, 1000)
        }
        this.client = client
        this.db = client.db('muteLogs')
        this.connected = true
        console.log('[MONGO] Connected to "muteLogs" database')
        this.connectionSubject.next()
      }
    )
  }

  stop(): void {
    this.connectionSubject.complete()
    this.client.close()
  }

  getAll(collection: string) {
    if (!this.isConnected) {
      throw new Error('[MONGO] ERROR : the database is not connected yet')
    }
    console.log('[MONGO] Get All ', collection)
    return this.db
      .collection(collection)
      .find()
      .toArray()
  }

  store(collection: string, obj: object): void {
    if (this.isConnected) {
      this.db.collection(collection).insert(obj, null, (err, res) => {
        if (err) {
          throw err
        }

        console.log('[MONGO] Document succesfully stored')
      })
    } else {
      console.log('[MONGO] Error: Not Connected to the database')
    }
  }

  get isConnected(): boolean {
    return this.connected
  }

  get connection$(): Observable<void> {
    return this.connectionSubject.asObservable()
  }
}
