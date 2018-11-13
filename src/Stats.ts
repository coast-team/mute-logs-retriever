import { readFile } from 'fs'
import { LogootSRopes, LogootSOperation, LogootSAdd, LogootSDel, RopesNodes } from 'mute-structs'

export class LogStats {
  private file: string
  private logs: object[]
  private finalState: Map<number, number>

  private maxIdLength: number
  private maxIdIntervalLength: number
  private meanIdIntervalLength: number

  private nbRope = 0
  private sumBlockLength = 0
  private minBlockLength = 0
  private maxBlockLength = 0
  private sumIntervalLength = 0
  private minIntervalLength = 0
  private maxIntervalLength = 0

  constructor(options: string[]) {
    this.file = '/home/cedric/Downloads/log3.json'
  }

  public loadFile(): Promise<void> {
    return new Promise((resolve, reject) => {
      readFile(this.file, (err, data) => {
        if (err) {
          console.log(err)
          reject()
        }
        this.logs = JSON.parse(data.toString())
        resolve()
      })
    })
  }

  public computeStats() {
    this.finalState = new Map()

    const tmp = this.logs[this.logs.length - 1]['state']
    for (const key in tmp) {
      if (tmp.hasOwnProperty(key)) {
        this.finalState.set(parseInt(key), tmp[key])
      }
    }

    const siteId = this.logs[this.logs.length - 2]['siteId']
    const remoteSiteId = this.logs[this.logs.length - 2]['remoteSiteId']

    const operations = this.logs.filter((value) => {
      return value['siteId'] === siteId
    })

    const root = new LogootSRopes()
    operations.forEach((val) => {
      if (val['type'] === 'localInsertion' || val['type'] === 'remoteInsertion') {
        const ope = LogootSAdd.fromPlain(val['logootsOperation'])
        ope.execute(root)
      } else if (val['type'] === 'localDeletion' || val['type'] === 'remoteDeletion') {
        const ope = LogootSDel.fromPlain(val['logootsOperation'])
        ope.execute(root)
      }
    })

    console.log('STATS')
    const stats = new Stats(root)
    console.log(stats.toString())
  }
}

export interface BasicStats {
  min: number
  max: number
  mean: number
  median: number
  lengthRepartition: Map<number, number>
}

export class Stats {
  private _documentLength: number
  private totalNodeLength: number
  private nodeNumber: number
  private treeHeigth: number

  private nodeStat: BasicStats
  private identifierStat: BasicStats

  private nodeTab: number[]
  private identifierTab: number[]

  constructor(rope: LogootSRopes) {
    this.compute(rope)
  }

  public toString(): string {
    let str = ''
    str += 'Document stats : \n'
    str += '\t Document length : ' + this._documentLength + '\n'
    str += '\t Number of nodes : ' + this.numberOfNodes + '\n'
    str += '\t Total Nodes length : ' + this.totalNodeLength + '\n'
    str += '\t Height of the tree : ' + this.heightOfTree + '\n'
    str += '\t Nodes : ' + '\n'
    str += '\t\tMax length : ' + this.maxNodeLength + '\n'
    str += '\t\tMin length : ' + this.minNodeLength + '\n'
    str += '\t\tMean length : ' + this.meanNodeLength + '\n'
    str += '\t\tMedian length : ' + this.medianNodeLength + '\n'
    str += '\t\tLength repartition : ' + this.repartitionNodeLengthString + '\n'
    str += '\t Identifier : ' + '\n'
    str += '\t\tMax length : ' + this.maxIdentifierLength + '\n'
    str += '\t\tMin length : ' + this.minIdentifierLength + '\n'
    str += '\t\tMean length : ' + this.meanIdentifierLength + '\n'
    str += '\t\tMedian length : ' + this.medianIdentifierLength + '\n'
    str += '\t\tLength repartition : ' + this.repartitionIdentifierLengthString + '\n'
    return str
  }

  private compute(rope: LogootSRopes) {
    this.nodeTab = []
    this.identifierTab = []
    this.totalNodeLength = 0
    this.nodeStat = {
      max: 0,
      min: -1,
      mean: 0,
      median: 0,
      lengthRepartition: new Map<number, number>(),
    }
    this.identifierStat = {
      max: 0,
      min: -1,
      mean: 0,
      median: 0,
      lengthRepartition: new Map<number, number>(),
    }

    this._documentLength = rope.str.length
    this.nodeNumber = this.recCompute(rope.root)
    this.treeHeigth = rope.root.height

    this.nodeTab = this.nodeTab.sort((a, b) => {
      return a - b
    })
    this.identifierTab = this.identifierTab.sort((a, b) => {
      return a - b
    })

    this.nodeStat.mean /= this.nodeNumber
    const N = this.nodeTab.length
    this.nodeStat.median = N % 2 === 0 ? (this.nodeTab[N / 2] + this.nodeTab[N / 2 + 1]) / 2 : this.nodeTab[Math.ceil(N / 2)]

    this.identifierStat.mean /= this.nodeNumber
    const M = this.identifierTab.length
    this.identifierStat.median =
      M % 2 === 0 ? (this.identifierTab[M / 2] + this.identifierTab[M / 2 + 1]) / 2 : this.identifierTab[Math.ceil(M / 2)]
  }

  private recCompute(rope: RopesNodes): number {
    if (!rope) {
      return 0
    }

    // node stats

    const nLength = rope.length
    this.nodeTab.push(nLength)
    this.totalNodeLength += nLength
    this.nodeStat.max = this.nodeStat.max < nLength ? nLength : this.nodeStat.max
    this.nodeStat.min = this.nodeStat.min === -1 ? nLength : this.nodeStat.min > nLength ? nLength : this.nodeStat.min
    this.nodeStat.mean += nLength
    if (this.nodeStat.lengthRepartition.has(nLength)) {
      this.nodeStat.lengthRepartition.set(nLength, this.nodeStat.lengthRepartition.get(nLength) + 1)
    } else {
      this.nodeStat.lengthRepartition.set(nLength, 1)
    }

    // identifier stats

    const iLength = rope.getIdBegin().length
    this.identifierTab.push(iLength)
    this.identifierStat.max = this.identifierStat.max < iLength ? iLength : this.identifierStat.max
    this.identifierStat.min =
      this.identifierStat.min === -1 ? iLength : this.identifierStat.min > iLength ? iLength : this.identifierStat.min
    this.identifierStat.mean += iLength
    if (this.identifierStat.lengthRepartition.has(iLength)) {
      this.identifierStat.lengthRepartition.set(iLength, this.identifierStat.lengthRepartition.get(iLength) + 1)
    } else {
      this.identifierStat.lengthRepartition.set(iLength, 1)
    }

    return this.recCompute(rope.left) + 1 + this.recCompute(rope.right)
  }

  get documentLength(): number {
    return this._documentLength
  }

  get numberOfNodes(): number {
    return this.nodeNumber
  }

  get heightOfTree(): number {
    return this.treeHeigth
  }

  get maxNodeLength(): number {
    return this.nodeStat.max
  }

  get minNodeLength(): number {
    return this.nodeStat.min
  }

  get meanNodeLength(): number {
    return this.nodeStat.mean
  }

  get medianNodeLength(): number {
    return this.nodeStat.median
  }

  get repartitionNodeLength(): Map<number, number> {
    return this.nodeStat.lengthRepartition
  }

  get repartitionNodeLengthString(): string {
    const arr = Array.from(this.nodeStat.lengthRepartition)
    arr.sort((a, b) => {
      return a[0] - b[0]
    })
    let str = ''
    arr.forEach((entry) => {
      str += '(' + entry[0] + ', ' + entry[1] + '), '
    })
    return str
  }

  get maxIdentifierLength(): number {
    return this.identifierStat.max
  }

  get minIdentifierLength(): number {
    return this.identifierStat.min
  }

  get meanIdentifierLength(): number {
    return this.identifierStat.mean
  }

  get medianIdentifierLength(): number {
    return this.identifierStat.median
  }

  get repartitionIdentifierLength(): Map<number, number> {
    return this.identifierStat.lengthRepartition
  }

  get repartitionIdentifierLengthString(): string {
    const arr = Array.from(this.identifierStat.lengthRepartition)
    arr.sort((a, b) => {
      return a[0] - b[0]
    })
    let str = ''
    arr.forEach((entry) => {
      str += '(' + entry[0] + ', ' + entry[1] + '), '
    })
    return str
  }
}
