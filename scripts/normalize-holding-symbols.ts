import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function normalizeHoldingSymbols() {
  try {
    console.log('Starting to normalize holding symbols...\n')

    // Fetch all holdings
    const holdings = await prisma.holding.findMany({
      select: {
        id: true,
        symbol: true,
        name: true,
      },
    })

    console.log(`Found ${holdings.length} holdings to process\n`)

    let updatedCount = 0
    let skippedCount = 0

    for (const holding of holdings) {
      const normalizedSymbol = holding.symbol.trim().toUpperCase()

      if (holding.symbol !== normalizedSymbol) {
        await prisma.holding.update({
          where: { id: holding.id },
          data: { symbol: normalizedSymbol },
        })

        console.log(`✓ Updated: "${holding.symbol}" → "${normalizedSymbol}" (${holding.name})`)
        updatedCount++
      } else {
        console.log(`⊘ Skipped: "${holding.symbol}" (already normalized)`)
        skippedCount++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log(`✓ Normalization complete!`)
    console.log(`  - Updated: ${updatedCount}`)
    console.log(`  - Skipped: ${skippedCount}`)
    console.log(`  - Total: ${holdings.length}`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('Error normalizing symbols:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

normalizeHoldingSymbols()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
