import { LogManager } from './LogManager'

export interface HealthCheckResult {
  missing: object[]
  duplica: object[]
  healthy: number
}

export class HealthCheckManager {
  private logs: object[]
  private debug: boolean
  private healthCheckFilePath: string

  constructor(logs: object[], debug: boolean = true, filePath: string = './healthCheck.txt') {
    this.logs = logs
    this.debug = debug
    this.healthCheckFilePath = filePath
  }

  public healthCheck(): HealthCheckResult {
    const logCopy: object[] = JSON.parse(JSON.stringify(this.logs))
    const finalState = logCopy.pop()['state']
    const result = { missing: [], duplica: [], healthy: 0 }
    const map = new Map<number, object[]>()

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
        const target = finalState[site]
        const present = new Set()
        const expectedSet = new Set(Array.from(Array(target + 1).keys()))

        for (let i = 0; i < siteLog.length; i++) {
          const clock = siteLog[i]['clock']
          if (!present.has(clock)) {
            present.add(clock)
            result.healthy++
          } else {
            result.duplica.push({ site, clock })
          }
        }

        // We check if some operations are missing
        const missings = new Set(Array.from(expectedSet).filter((x) => !present.has(x)))
        missings.forEach((clock) => {
          result.missing.push({ site, clock })
        })
      } else {
        if (this.debug) LogManager.log('HealthCheck : The site ' + site + ' is unknown')
      }
    })

    if (this.debug) {
      const nbMissing = result.missing.length
      const nbDuplicas = result.duplica.length
      const msg =
        'HealthCheck : \n' +
        '\t' +
        nbMissing +
        ' local operations are missing.\n' +
        '\t' +
        nbDuplicas +
        ' local operations are duplicate from existing operation\n' +
        '\t' +
        result.healthy +
        ' local operations are in a good health'
      LogManager.log(msg)
      LogManager.write(this.healthCheckFilePath, msg)
      LogManager.write(this.healthCheckFilePath, this.resultToString(result))
    }

    return result
  }

  public resultToString(result: HealthCheckResult): string {
    let res = 'Results :\n'
    res += '\tMissing operation - \n'
    res += result.missing
      .map((v) => {
        return JSON.stringify(v) + '\n'
      })
      .reduce((acc, v) => {
        return acc + v
      }, '')
    res += '\tDuplicate operation - \n'
    res += result.duplica
      .map((v) => {
        return JSON.stringify(v) + '\n'
      })
      .reduce((acc, v) => {
        return acc + v
      }, '')
    return res
  }
}