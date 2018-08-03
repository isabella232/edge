import deepFetch from "./deepFetch"

export default async function fetchData(WrappedApplication, kernel) {
  // Asynchronous magic... loading required application data
  // Supports parallel loading of either Apollo-style (aka fetchData())
  const start = new Date()
  console.log("[EDGE] Fetching data...")
  const result = await deepFetch(WrappedApplication)

  console.log(`[EDGE] Done in ${new Date() - start}ms`)
  return result
}
