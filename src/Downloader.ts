import { writeFile } from 'fs'
import { Mongo } from './mongo'

export class Downloader {
  private mongoURL: string
  private database: string
  private collection: string
  private output: string

  private debug: boolean

  private mongo: Mongo

  constructor(options: string[], debug: boolean = true) {
    this.mongoURL = 'mongodb://localhost'
    this.database = 'muteLogs'
    this.collection = 'undefined'
    this.output = (process.env.HOME || process.env.USERPROFILE) + '/Downloads/'

    this.debug = debug

    this.options(options)

    this.mongo = new Mongo(this.mongoURL)
  }

  private options(opt: string[]) {
    while (opt.length > 0) {
      const o = opt.shift()
      switch (o) {
        case '-c':
        case '--collection':
          this.collection = opt.shift()
          break
        case '-d':
        case '--database':
          this.database = opt.shift()
          break
        case '-h':
        case '--help':
          this.usage()
          process.exit(0)
          break
        case '-m':
        case '--mongo':
          this.mongoURL = 'mongodb://' + opt.shift()
          break
        case '-o':
        case '--output':
          this.output = opt.shift()
          break
        default:
          console.log('[MLR] Error download : this option, ' + o + ', does not exist')
          this.usage()
          break
      }
    }
  }

  private usage() {
    console.log('Usage : ')
    console.log('npm start -- download [-m mongoUrl] [-d database] [-c collection] [-o output]')
    console.log('options : ')
    console.log('\t-c, --collection : Define the target collection - undefined by default')
    console.log('\t-d, --database   : Define the database - muteLogs by default')
    console.log('\t-h, --help       : Display this')
    console.log('\t-m, --mongo      : Define the mongodb url - localhost by default')
    console.log('\t-o, --output     : Define the paht of the ouput file - ~/Downloads/ by default')
  }

  public displayOptions() {
    console.log('[MLR] download options : ')
    console.log('\tmongo : ' + this.mongoURL)
    console.log('\tdatabase : ' + this.database)
    console.log('\tcollection : ' + this.collection)
    console.log('\toutput : ' + this.output)
  }

  public async downloadCollection(): Promise<void> {
    const logs = await this.mongo.getAll(this.collection)
    logs.push(this.findFinalState(logs))
    this.healthCheck(logs)
    let logString = logs
      .map((e) => {
        delete e._id
        return JSON.stringify(e) + ',\n'
      })
      .reduce((a, b) => {
        return a + b
      }, '')
    logString = '[' + logString.slice(0, logString.length - 2) + ']'
    const now = new Date()
    const fileName =
      'mutelogs_' +
      this.collection +
      '_' +
      now.getDate() +
      '-' +
      (now.getMonth() + 1) +
      '-' +
      now.getFullYear() +
      '-' +
      now.getHours() +
      '-' +
      now.getMinutes() +
      '-' +
      now.getSeconds() +
      '.json'
    writeFile(this.output + fileName, logString, 'utf8', (err) => {
      if (err) {
        throw err
      }
    })
    if (this.debug) {
      console.log('[MLR] Download successful in ' + this.output + ' !')
    }
  }

  public findFinalState(logs: object[]): object {
    const state = {}
    if (this.debug) {
      console.log("[MLR] Calcul de l'etat final")
    }
    logs.forEach((l) => {
      const context = l['context'] as Array<number>
      const local = l['type'] === 'localInsertion' || l['type'] === 'localDeletion'
      if (local) {
        const siteId = l['siteId']
        const vFinalState = state[siteId]
        if (typeof vFinalState === 'undefined' || vFinalState < l['clock']) {
          state[siteId] = l['clock']
        }
      } else if (typeof context !== 'undefined') {
        for (const k in context) {
          const vFinalState = state[k]
          const v = context[k]
          if (typeof vFinalState === 'undefined' || vFinalState < v) {
            state[k] = v
          }
        }
      }
    })
    if (this.debug) {
      console.log('[MLR] Calcul terminé')
    }
    return { type: 'finalState', state }
  }

  public healthCheck(logs: object[]): object[] {
    const logCopy: object[] = JSON.parse(JSON.stringify(logs))
    const finalState = logCopy.pop()['state']
    const result = []
    const map = new Map<string, object[]>()

    logCopy
      .filter((log) => {
        return log['type'] === 'localInsertion' || log['type'] === 'localDeletion'
      })
      .forEach((log) => {
        const site = log['siteId']
        if (map.has(site)) {
          map.get(site).push(log)
        } else {
          map.set(site, [log])
        }
      })
    map.forEach((siteLog, site) => {
      if (typeof finalState[site] !== 'undefined') {
        siteLog.sort((a, b) => {
          return a['clock'] - b['clock']
        })
        let error = 0
        for (let expected = 0; expected <= finalState[site]; expected++) {
          if (typeof siteLog[expected - error] === 'undefined' || siteLog[expected - error]['clock'] !== expected) {
            result.push({ site, clock: expected })
            error++
          }
        }
      } else {
        if (this.debug) {
          console.log('[MLR] HealthCheck : Le site ' + site + ' est inconnu')
        }
      }
    })

    if (this.debug) {
      if (result.length === 0) {
        console.log('[MLR] HealthCheck : Les logs sont en pleine forme !')
      } else {
        console.log('[MLR] HealthCheck : ' + result.length + ' opération(s) est(sont) manquante(s)')
        console.log('\t', result)
      }
    }

    return result
  }

  public async start() {
    await new Promise((resolve, reject) => {
      this.mongo.connection$.subscribe(() => {
        resolve()
      })
      this.mongo.start(this.database)
    })
  }

  public stop() {
    this.mongo.stop()
  }
}
