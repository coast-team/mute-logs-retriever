import { readFile } from 'fs'
import { LogootSRopes, LogootSAdd, LogootSDel, Stats } from 'mute-structs'
import { LogManager } from './LogManager'

export class LogStats {
  private file: string
  private logs: object[]
  private finalState: Map<number, number>

  constructor(options: string[]) {
    this.file = './muteLogs.json'

    this.options(options)
  }

  private options(opt: string[]) {
    while (opt.length > 0) {
      const o = opt.shift()
      switch (o) {
        case '-f':
        case '--file':
          this.file = opt.shift()
          console.log(this.file)
          break
        default:
          LogManager.error('stats : this option, ' + o + ', does not exist')
          this.usage()
          break
      }
    }
  }

  private usage() {
    console.log('Usage : ')
    console.log('npm start -- stats -f <filePath>')
    console.log('options : ')
    console.log('\t-f, --file : Define the logs file')
  }

  public loadFile(): Promise<void> {
    return new Promise((resolve, reject) => {
      readFile(this.file, (err, data) => {
        if (err) {
          console.log('ERR !!! : ', err)
          reject(err)
        }
        this.logs = JSON.parse(data.toString())
        resolve()
      })
    })
  }

  public computeStats() {
    // Create the final state map
    this.finalState = new Map()
    const tmp = this.logs[this.logs.length - 1]['state']
    for (const key in tmp) {
      if (tmp.hasOwnProperty(key)) {
        this.finalState.set(parseInt(key), tmp[key])
      }
    }

    // Recreate the document
    const root = new LogootSRopes()

    const remoteOpes = this.logs.filter((log) => {
      return log['type'] === 'remoteInsertion' || log['type'] === 'remoteDeletion'
    })

    const map = new Map<Number, Set<number>>()
    const uniqueOpe = []
    remoteOpes.forEach((ope) => {
      const id = ope['remoteSiteId']
      const clock = ope['remoteClock']
      if (!map.has(id)) {
        map.set(id, new Set())
      }
      if (!map.get(id).has(clock)) {
        map.get(id).add(clock)
        uniqueOpe.push(ope)
      }
    })

    const insertions = uniqueOpe.filter((o) => {
      return o.type === 'remoteInsertion'
    })
    const deletions = uniqueOpe.filter((o) => {
      return o.type === 'remoteDeletion'
    })

    let error = false
    insertions.forEach((o) => {
      const add = LogootSAdd.fromPlain(o.logootsOperation)
      if (add) {
        add.execute(root)
      } else {
        console.log('add error : ', o.logootsOperation)
      }
    })
    deletions.forEach((o) => {
      const del = LogootSDel.fromPlain(o.logootsOperation)
      if (del) {
        del.execute(root)
      } else {
        console.log('del error : ', o.logootsOperation)
      }
    })

    if (error) {
      LogManager.error('some operations cannot be converted to LogootSOperation... process is aborted')
    } else {
      console.log('STATS')
      const stats = new Stats(root)
      console.log(stats.toString())
    }
  }
}
