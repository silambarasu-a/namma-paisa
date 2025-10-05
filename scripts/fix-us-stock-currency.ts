import { PrismaClient } from "../src/generated/prisma"

const prisma = new PrismaClient()

async function main() {
  console.log("Fixing currency for US stock holdings...")

  // Update all US_STOCK holdings to have currency="USD"
  const result = await prisma.holding.updateMany({
    where: {
      bucket: "US_STOCK",
      currency: { not: "USD" }
    },
    data: {
      currency: "USD"
    }
  })

  console.log(`✅ Updated ${result.count} US stock holdings to USD currency`)

  // Update all US_STOCK transactions to have currency info
  const txResult = await prisma.transaction.updateMany({
    where: {
      bucket: "US_STOCK",
    },
    data: {
      // Note: usdInrRate will need to be set manually or via API if historical rate is needed
    }
  })

  console.log(`✅ Found ${txResult.count} US stock transactions`)
  console.log("\nNote: Historical USD/INR rates for transactions need to be set manually if needed")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
