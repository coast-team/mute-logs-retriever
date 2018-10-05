export interface HealthCheckResult {
  error: object[]
  duplicas: object[]
  healthy: number
}

export class HealthCheckManager {
  private logs: object[]

  constructor(logs: object[]) {
    this.logs = logs
  }

  public healthCheck(): HealthCheckResult {
    const logCopy: object[] = JSON.parse(JSON.stringify(this.logs))
    const finalState = logCopy.pop()['state']
    const result = { error: [], duplicas: [], healthy: 0 }
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
            result.duplicas.push({ site, clock })
          }
        }

        // We check if some operations are missing
        const missings = new Set(Array.from(expectedSet).filter((x) => !present.has(x)))
        missings.forEach((clock) => {
          result.error.push({ site, clock })
        })
      } else {
        console.log('[MLR] HealthCheck : Le site ' + site + ' est inconnu')
      }
    })

    const nbMissing = result.error.length
    const nbDuplicas = result.duplicas.length
    console.log('[MLR] HealthCheck : ')
    console.log('\t' + nbMissing + ' opération(s) est(sont) manquante(s)')
    console.log('\t' + nbDuplicas + " opération(s) est(sont) des duplicata d'opérations existantes")
    console.log('\t' + result.healthy + ' opération(s) locale(s) en pleine forme')
    //this.log(JSON.stringify(result))

    return result
  }
}
